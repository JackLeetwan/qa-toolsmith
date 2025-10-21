import Ajv from "ajv";
import type {
  OpenRouterConfig,
  ModelParams,
  JSONSchema,
  ModelInfo,
  UsageInfo,
  ValidationResult,
  Message,
  AITextProcessRequest,
  AITextProcessResponse,
  AILimitsDTO,
  AIContext,
  AIField,
  OpenRouterResponse,
} from "../../types/types";

/**
 * OpenRouter Service Error
 */
export class OpenRouterError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public retryable = false,
    public retryAfter?: number,
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

/**
 * Rate Limiter for OpenRouter API requests
 */
class RateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>();

  constructor(
    private config: { requestsPerMinute: number; burstLimit: number },
  ) {}

  async checkLimit(identifier: string): Promise<boolean> {
    const now = Date.now();
    const key = `openrouter:${identifier}`;
    const entry = this.requests.get(key);

    if (!entry || entry.resetTime < now) {
      this.requests.set(key, { count: 1, resetTime: now + 60000 });
      return true;
    }

    if (entry.count >= this.config.requestsPerMinute) {
      return false;
    }

    entry.count++;
    return true;
  }

  getRetryAfter(identifier: string): number {
    const key = `openrouter:${identifier}`;
    const entry = this.requests.get(key);
    if (!entry) return 0;
    return Math.ceil((entry.resetTime - Date.now()) / 1000);
  }
}

/**
 * Usage Tracker for daily limits with database integration
 */
class UsageTracker {
  private usage = new Map<string, { count: number; resetDate: string }>();
  private supabase: ReturnType<typeof createClient<Database>> | null;

  constructor(
    private config: { dailyLimit: number; resetHour: number },
    supabaseClient?: ReturnType<typeof createClient<Database>> | null,
  ) {
    this.supabase = supabaseClient || null;
  }

  async checkDailyLimit(userId: string): Promise<boolean> {
    try {
      if (this.supabase) {
        return await this.checkDatabaseLimit(userId);
      } else {
        return await this.checkMemoryLimit(userId);
      }
    } catch {
      // Fallback to memory-based limit checking
      return await this.checkMemoryLimit(userId);
    }
  }

  private async checkDatabaseLimit(userId: string): Promise<boolean> {
    if (!this.supabase) {
      throw new Error("Supabase client not available");
    }

    // Use the database function to check and increment usage atomically
    const { data, error } = await this.supabase.rpc("can_invoke_ai", {
      uid: userId,
    });

    if (error) {
      throw new Error(`Database limit check failed: ${error.message}`);
    }

    return data === true;
  }

  private async checkMemoryLimit(userId: string): Promise<boolean> {
    const today = this.getToday();
    const key = `usage:${userId}`;
    const entry = this.usage.get(key);

    if (!entry || entry.resetDate !== today) {
      this.usage.set(key, { count: 0, resetDate: today });
      return true;
    }

    return entry.count < this.config.dailyLimit;
  }

  async recordUsage(
    userId: string,
    tokens: number,
    context?: AIContext,
    field?: AIField,
  ): Promise<void> {
    try {
      if (this.supabase) {
        await this.recordDatabaseUsage(userId, tokens, context, field);
      } else {
        await this.recordMemoryUsage(userId, tokens);
      }
    } catch {
      // Fallback to memory-based usage recording
      await this.recordMemoryUsage(userId, tokens);
    }
  }

  private async recordDatabaseUsage(
    userId: string,
    tokens: number,
    context?: AIContext,
    field?: AIField,
  ): Promise<void> {
    if (!this.supabase) {
      throw new Error("Supabase client not available");
    }

    // Record in ai_invocations table
    const { error: invocationError } = await this.supabase
      .from("ai_invocations")
      .insert({
        user_id: userId,
        action: "improve",
        tokens_prompt: Math.floor(tokens * 0.7), // Estimate prompt vs completion
        tokens_completion: Math.floor(tokens * 0.3),
        success: true,
        meta: {
          context,
          field,
          timestamp: new Date().toISOString(),
        },
      });

    if (invocationError) {
      throw new Error(
        `Failed to record AI invocation: ${invocationError.message}`,
      );
    }

    // Record in usage_events table for analytics
    const { error: eventError } = await this.supabase
      .from("usage_events")
      .insert({
        user_id: userId,
        kind: "ai",
        meta: {
          tokens,
          context,
          field,
          timestamp: new Date().toISOString(),
        },
      });

    if (eventError) {
      // Don't throw here as the main usage recording succeeded
      // Event recording failure is not critical
    }
  }

  private async recordMemoryUsage(
    userId: string,
    tokens: number,
  ): Promise<void> {
    const today = this.getToday();
    const key = `usage:${userId}`;
    const entry = this.usage.get(key);

    if (!entry || entry.resetDate !== today) {
      this.usage.set(key, { count: tokens, resetDate: today });
    } else {
      entry.count += tokens;
    }
  }

  async getRemainingUsage(userId: string): Promise<number> {
    try {
      if (this.supabase) {
        return await this.getDatabaseRemainingUsage(userId);
      } else {
        return await this.getMemoryRemainingUsage(userId);
      }
    } catch {
      // Fallback to memory-based remaining usage check
      return await this.getMemoryRemainingUsage(userId);
    }
  }

  private async getDatabaseRemainingUsage(userId: string): Promise<number> {
    if (!this.supabase) {
      throw new Error("Supabase client not available");
    }

    const today = this.getToday();

    const { data, error } = await this.supabase
      .from("ai_daily_usage")
      .select("used")
      .eq("user_id", userId)
      .eq("day", today)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      throw new Error(`Failed to get database usage: ${error.message}`);
    }

    const used = data?.used || 0;
    return Math.max(0, this.config.dailyLimit - used);
  }

  private async getMemoryRemainingUsage(userId: string): Promise<number> {
    const today = this.getToday();
    const key = `usage:${userId}`;
    const entry = this.usage.get(key);

    if (!entry || entry.resetDate !== today) {
      return this.config.dailyLimit;
    }

    return Math.max(0, this.config.dailyLimit - entry.count);
  }

  async getUsageStats(userId: string): Promise<{
    used: number;
    remaining: number;
    limit: number;
    resetDate: string;
  }> {
    const remaining = await this.getRemainingUsage(userId);
    const used = this.config.dailyLimit - remaining;
    const resetDate = this.getNextResetDate();

    return {
      used,
      remaining,
      limit: this.config.dailyLimit,
      resetDate,
    };
  }

  private getToday(): string {
    const now = new Date();
    return now.toISOString().split("T")[0];
  }

  private getNextResetDate(): string {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(this.config.resetHour, 0, 0, 0);
    return tomorrow.toISOString();
  }

  // Admin methods for usage management
  async resetUserUsage(userId: string): Promise<void> {
    if (this.supabase) {
      const today = this.getToday();
      const { error } = await this.supabase
        .from("ai_daily_usage")
        .delete()
        .eq("user_id", userId)
        .eq("day", today);

      if (error) {
        throw new Error(`Failed to reset user usage: ${error.message}`);
      }
    } else {
      const key = `usage:${userId}`;
      this.usage.delete(key);
    }
  }

  async setUserLimit(userId: string, newLimit: number): Promise<void> {
    // This would require a separate user_limits table in production
    // For now, we'll just update the config
    this.config.dailyLimit = newLimit;
  }
}

/**
 * Message Builder for constructing AI prompts
 */
class MessageBuilder {
  private systemPrompts = new Map<AIContext, string>([
    [
      "template",
      "You are a QA expert helping to improve defect report templates. Focus on clarity, completeness, and actionable information. The current field is: {field}. Improve the provided text while maintaining professional QA standards.",
    ],
    [
      "charter",
      "You are a QA expert helping to improve exploration charters. Focus on testability, coverage, and risk identification. The current field is: {field}. Enhance the provided text to be more specific and actionable for exploratory testing.",
    ],
    [
      "kb",
      "You are a QA expert helping to improve knowledge base entries. Focus on accuracy, relevance, and searchability. The current field is: {field}. Improve the provided text to be more informative and useful for the QA team.",
    ],
  ]);

  constructor(
    private config: { maxTokens: number; systemPromptTemplate: string },
  ) {}

  buildSystemMessage(context: AIContext, field: AIField): string {
    const template =
      this.systemPrompts.get(context) || this.config.systemPromptTemplate;
    return template.replace("{field}", field);
  }

  buildUserMessage(text: string, context: AIContext): string {
    return `Please improve the following ${context} text:\n\n${text}`;
  }

  estimateTokens(messages: Message[]): number {
    // Rough estimation: 1 token ≈ 4 characters
    const totalChars = messages.reduce(
      (sum, msg) => sum + msg.content.length,
      0,
    );
    return Math.ceil(totalChars / 4);
  }

  truncateContext(messages: Message[], maxTokens: number): Message[] {
    const estimated = this.estimateTokens(messages);
    if (estimated <= maxTokens) return messages;

    // Keep system message and truncate user message
    const systemMsg = messages.find((m) => m.role === "system");
    const userMsg = messages.find((m) => m.role === "user");

    if (!systemMsg || !userMsg) return messages;

    const systemTokens = Math.ceil(systemMsg.content.length / 4);
    const availableTokens = maxTokens - systemTokens - 100; // Buffer for response

    if (availableTokens <= 0) return [systemMsg];

    const maxUserChars = availableTokens * 4;
    const truncatedUserContent = userMsg.content.substring(0, maxUserChars);

    return [systemMsg, { ...userMsg, content: truncatedUserContent + "..." }];
  }
}

/**
 * Response Formatter for structured outputs
 */
class ResponseFormatter {
  private ajv = new Ajv();
  private schemas = new Map<string, JSONSchema>();

  constructor(
    private config: {
      enableStructuredOutput: boolean;
      defaultSchema?: JSONSchema;
    },
  ) {
    this.initializeSchemas();
  }

  private initializeSchemas(): void {
    // Text processing schema
    const textProcessSchema: JSONSchema = {
      type: "object",
      properties: {
        proposal: {
          type: "string",
          description: "The improved text proposal",
        },
        diff: {
          type: "string",
          description: "Markdown diff showing changes made",
        },
        reasoning: {
          type: "string",
          description: "Brief explanation of improvements made",
        },
      },
      required: ["proposal", "diff"],
      additionalProperties: false,
    };

    // Template improvement schema
    const templateSchema: JSONSchema = {
      type: "object",
      properties: {
        proposal: { type: "string" },
        diff: { type: "string" },
        reasoning: { type: "string" },
        severity: {
          type: "string",
          enum: ["low", "medium", "high", "critical"],
        },
        category: { type: "string" },
      },
      required: ["proposal", "diff"],
      additionalProperties: false,
    };

    // Charter improvement schema
    const charterSchema: JSONSchema = {
      type: "object",
      properties: {
        proposal: { type: "string" },
        diff: { type: "string" },
        reasoning: { type: "string" },
        testability: { type: "string" },
        risk_level: { type: "string", enum: ["low", "medium", "high"] },
      },
      required: ["proposal", "diff"],
      additionalProperties: false,
    };

    // Knowledge base schema
    const kbSchema: JSONSchema = {
      type: "object",
      properties: {
        proposal: { type: "string" },
        diff: { type: "string" },
        reasoning: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        searchability: { type: "string" },
      },
      required: ["proposal", "diff"],
      additionalProperties: false,
    };

    this.schemas.set("text_process", textProcessSchema);
    this.schemas.set("template", templateSchema);
    this.schemas.set("charter", charterSchema);
    this.schemas.set("kb", kbSchema);
  }

  parseResponse(
    response: OpenRouterResponse,
    context?: AIContext,
  ): AITextProcessResponse {
    if (
      this.config.enableStructuredOutput &&
      response.choices?.[0]?.message?.content
    ) {
      try {
        const content = JSON.parse(response.choices[0].message.content);

        // Validate against context-specific schema
        if (context && this.schemas.has(context)) {
          const schema = this.schemas.get(context);
          if (schema && !this.validateJsonSchema(content, schema)) {
            return this.createFallbackResponse(response, content);
          }
        }

        return {
          proposal: content.proposal || "",
          diff: content.diff || "",
          model: response.model || "unknown",
          usage: this.extractUsage(response),
        };
      } catch {
        // Fallback to plain text response
        return this.createFallbackResponse(
          response,
          response.choices[0].message.content,
        );
      }
    }

    return {
      proposal: response.choices?.[0]?.message?.content || "",
      diff: "",
      model: response.model || "unknown",
      usage: this.extractUsage(response),
    };
  }

  private createFallbackResponse(
    response: OpenRouterResponse,
    content: unknown,
  ): AITextProcessResponse {
    const proposal =
      typeof content === "string"
        ? content
        : (content as Record<string, unknown>)?.proposal || "";
    return {
      proposal: typeof proposal === "string" ? proposal : "",
      diff: "",
      model: (response.model as string) || "unknown",
      usage: this.extractUsage(response),
    };
  }

  validateJsonSchema(data: unknown, schema: JSONSchema): boolean {
    try {
      const validate = this.ajv.compile(schema);
      return validate(data);
    } catch {
      // Schema validation failed
      return false;
    }
  }

  extractUsage(response: OpenRouterResponse): UsageInfo {
    const usage = response.usage || {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    };
    return {
      prompt: usage.prompt_tokens || 0,
      completion: usage.completion_tokens || 0,
      total:
        usage.total_tokens ||
        usage.prompt_tokens + usage.completion_tokens ||
        0,
    };
  }

  getSchemaForContext(context: AIContext): JSONSchema | undefined {
    return this.schemas.get(context);
  }

  addCustomSchema(name: string, schema: JSONSchema): void {
    this.schemas.set(name, schema);
  }

  validateResponseFormat(response: OpenRouterResponse): {
    valid: boolean;
    errors?: string[];
  } {
    const errors: string[] = [];

    if (!response.choices || !Array.isArray(response.choices)) {
      errors.push("Missing or invalid choices array");
    }

    if (response.choices?.[0]?.message?.content === undefined) {
      errors.push("Missing message content");
    }

    // Note: We don't validate JSON structure here since parseResponse has fallback logic
    // for handling both structured and plain text responses

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}

/**
 * OpenRouter Service
 *
 * Handles communication with OpenRouter API for AI text processing.
 * Provides rate limiting, usage tracking, and structured response formatting.
 */
export class OpenRouterService {
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;
  private maxRetries: number;
  private timeout: number;
  private rateLimiter: RateLimiter;
  private usageTracker: UsageTracker;
  private messageBuilder: MessageBuilder;
  private responseFormatter: ResponseFormatter;
  private systemPrompts: Map<AIContext, string>;
  private responseSchemas: Map<string, JSONSchema>;
  private modelConfigs!: Map<AIContext, ModelParams>;
  private isHealthy = true;
  private lastError?: Error;

  constructor(config: OpenRouterConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || "https://openrouter.ai/api/v1";
    this.defaultModel =
      config.defaultModel || "microsoft/phi-3-mini-128k-instruct";
    this.maxRetries = config.maxRetries ?? 3;
    this.timeout = config.timeout ?? 30000;

    this.rateLimiter = new RateLimiter(
      config.rateLimitConfig || { requestsPerMinute: 10, burstLimit: 20 },
    );

    this.usageTracker = new UsageTracker(
      config.usageConfig || { dailyLimit: 100, resetHour: 0 },
      config.supabaseClient as ReturnType<typeof createClient<Database>> | null,
    );

    this.messageBuilder = new MessageBuilder(
      config.messageConfig || {
        maxTokens: 4000,
        systemPromptTemplate: "You are a helpful AI assistant.",
      },
    );

    this.responseFormatter = new ResponseFormatter(
      config.responseConfig || { enableStructuredOutput: true },
    );

    this.systemPrompts = new Map();
    this.responseSchemas = new Map();
    this.initializeModelConfigs();
  }

  private initializeModelConfigs(): void {
    this.modelConfigs = new Map<AIContext, ModelParams>([
      [
        "template",
        {
          temperature: 0.6,
          max_tokens: 800,
          top_p: 0.9,
          frequency_penalty: 0.1,
          presence_penalty: 0.1,
        },
      ],
      [
        "charter",
        {
          temperature: 0.8,
          max_tokens: 1200,
          top_p: 0.95,
          frequency_penalty: 0.05,
          presence_penalty: 0.05,
        },
      ],
      [
        "kb",
        {
          temperature: 0.5,
          max_tokens: 600,
          top_p: 0.85,
          frequency_penalty: 0.15,
          presence_penalty: 0.15,
        },
      ],
    ]);
  }

  /**
   * Process text using AI
   */
  async processText(
    request: AITextProcessRequest,
  ): Promise<AITextProcessResponse> {
    try {
      // Check rate limit
      const rateLimitOk = await this.rateLimiter.checkLimit("global");
      if (!rateLimitOk) {
        const retryAfter = this.rateLimiter.getRetryAfter("global");
        throw new OpenRouterError(
          "Rate limit exceeded",
          "RATE_LIMITED",
          429,
          true,
          retryAfter,
        );
      }

      // Build messages
      const systemMessage = this.messageBuilder.buildSystemMessage(
        request.context,
        request.field,
      );
      const userMessage = this.messageBuilder.buildUserMessage(
        request.text,
        request.context,
      );

      const messages: Message[] = [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ];

      // Truncate if needed
      const truncatedMessages = this.messageBuilder.truncateContext(
        messages,
        4000,
      );

      // Get context-specific model parameters
      const contextParams = this.modelConfigs.get(request.context) || {
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
      };

      // Make API request
      const response = await this.makeRequest("/chat/completions", {
        model: this.defaultModel,
        messages: truncatedMessages,
        ...contextParams,
        response_format: this.responseFormatter["config"].enableStructuredOutput
          ? {
              type: "json_schema",
              json_schema: {
                name: "text_process_response",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    proposal: {
                      type: "string",
                      description: "The improved text proposal",
                    },
                    diff: {
                      type: "string",
                      description: "Markdown diff showing changes made",
                    },
                    reasoning: {
                      type: "string",
                      description: "Brief explanation of improvements made",
                    },
                  },
                  required: ["proposal", "diff"],
                  additionalProperties: false,
                },
              },
            }
          : undefined,
      });

      const result = this.responseFormatter.parseResponse(
        response,
        request.context,
      );

      // Record usage with context information
      await this.usageTracker.recordUsage(
        "system", // This should be actual userId in real implementation
        result.usage.prompt + result.usage.completion,
        request.context,
        request.field,
      );

      this.isHealthy = true;
      this.lastError = undefined;

      return result;
    } catch (error) {
      this.isHealthy = false;
      this.lastError = error as Error;
      throw this.handleError(error);
    }
  }

  /**
   * Get usage limits for user
   */
  async getUsageLimits(userId: string): Promise<AILimitsDTO> {
    const remaining = await this.usageTracker.getRemainingUsage(userId);
    return { remaining };
  }

  /**
   * Get available models
   */
  async getAvailableModels(): Promise<ModelInfo[]> {
    try {
      const response = await this.makeRequest<{ data: ModelInfo[] }>(
        "/models",
        {},
      );
      return response.data || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Validate configuration
   */
  validateConfig(): ValidationResult {
    const errors: string[] = [];

    if (!this.apiKey) {
      errors.push("API key is required");
    }

    if (!this.baseUrl) {
      errors.push("Base URL is required");
    }

    if (this.maxRetries < 0) {
      errors.push("Max retries must be non-negative");
    }

    if (this.timeout <= 0) {
      errors.push("Timeout must be positive");
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Update model configuration
   */
  updateModelConfig(model: string): void {
    this.defaultModel = model;
    // Store model-specific parameters if needed
  }

  /**
   * Update model parameters for specific context
   */
  updateContextModelConfig(
    context: AIContext,
    params: Partial<ModelParams>,
  ): void {
    const currentConfig = this.modelConfigs.get(context) || {};
    this.modelConfigs.set(context, { ...currentConfig, ...params });
  }

  /**
   * Get model parameters for specific context
   */
  getContextModelConfig(context: AIContext): ModelParams {
    return (
      this.modelConfigs.get(context) || {
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
      }
    );
  }

  /**
   * Update system prompt for context
   */
  updateSystemPrompt(context: AIContext, prompt: string): void {
    this.systemPrompts.set(context, prompt);
  }

  /**
   * Update response schema
   */
  updateResponseSchema(schemaName: string, schema: JSONSchema): void {
    this.responseSchemas.set(schemaName, schema);
  }

  // Public readonly properties
  get config(): OpenRouterConfig {
    return {
      apiKey: this.apiKey,
      baseUrl: this.baseUrl,
      defaultModel: this.defaultModel,
      maxRetries: this.maxRetries,
      timeout: this.timeout,
    };
  }

  get healthStatus(): boolean {
    return this.isHealthy;
  }

  get error(): Error | undefined {
    return this.lastError;
  }

  // Private methods
  private async makeRequest<T = OpenRouterResponse>(
    endpoint: string,
    data: Record<string, unknown>,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://qa-toolsmith.com",
          "X-Title": "QA Toolsmith",
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new OpenRouterError(
          errorData.error?.message || `HTTP ${response.status}`,
          errorData.error?.code || "HTTP_ERROR",
          response.status,
          response.status >= 500 || response.status === 429,
          response.headers.get("retry-after")
            ? parseInt(response.headers.get("retry-after") || "0")
            : undefined,
        );
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof OpenRouterError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new OpenRouterError("Request timeout", "TIMEOUT", 408, true);
      }

      throw new OpenRouterError("Network error", "NETWORK_ERROR", 500, true);
    }
  }

  private async retryRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error as Error;

        if (error instanceof OpenRouterError && !error.retryable) {
          throw error;
        }

        if (attempt === this.maxRetries) {
          break;
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  private handleError(error: unknown): never {
    if (error instanceof OpenRouterError) {
      throw error;
    }

    // Map HTTP errors to application errors
    const httpError = error as { status?: number; retryAfter?: number };
    if (httpError.status === 429) {
      throw new OpenRouterError(
        "Rate limit exceeded",
        "RATE_LIMITED",
        429,
        true,
        httpError.retryAfter,
      );
    }

    if (httpError.status === 401) {
      throw new OpenRouterError(
        "Invalid API key",
        "INVALID_API_KEY",
        401,
        false,
      );
    }

    if (httpError.status === 503) {
      throw new OpenRouterError(
        "Service unavailable",
        "SERVICE_UNAVAILABLE",
        503,
        true,
      );
    }

    // Default to internal error
    throw new OpenRouterError(
      "Internal service error",
      "INTERNAL_ERROR",
      500,
      true,
    );
  }
}

// Import Supabase client
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";

// Create Supabase client for database integration
const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_KEY;

let supabaseClient: unknown = null;
if (supabaseUrl && supabaseServiceKey) {
  supabaseClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// Export singleton instance
export const openRouterService = new OpenRouterService({
  apiKey: import.meta.env.OPENROUTER_API_KEY || "",
  baseUrl:
    import.meta.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
  defaultModel:
    import.meta.env.OPENROUTER_DEFAULT_MODEL ||
    "microsoft/phi-3-mini-128k-instruct",
  maxRetries: parseInt(import.meta.env.OPENROUTER_MAX_RETRIES || "3"),
  timeout: parseInt(import.meta.env.OPENROUTER_TIMEOUT || "30000"),
  rateLimitConfig: {
    requestsPerMinute: parseInt(import.meta.env.OPENROUTER_RATE_LIMIT || "10"),
    burstLimit: parseInt(import.meta.env.OPENROUTER_BURST_LIMIT || "20"),
  },
  usageConfig: {
    dailyLimit: parseInt(import.meta.env.OPENROUTER_DAILY_LIMIT || "50"),
    resetHour: parseInt(import.meta.env.OPENROUTER_RESET_HOUR || "0"),
  },
  messageConfig: {
    maxTokens: parseInt(import.meta.env.OPENROUTER_MAX_TOKENS || "4000"),
    systemPromptTemplate:
      import.meta.env.OPENROUTER_SYSTEM_PROMPT ||
      "You are a helpful AI assistant.",
  },
  responseConfig: {
    enableStructuredOutput:
      import.meta.env.OPENROUTER_STRUCTURED_OUTPUT !== "false",
    defaultSchema: {
      type: "object",
      properties: {
        proposal: { type: "string" },
        diff: { type: "string" },
        reasoning: { type: "string" },
      },
      required: ["proposal", "diff"],
      additionalProperties: false,
    },
  },
  supabaseClient,
});
