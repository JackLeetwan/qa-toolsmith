# OpenRouter Service Implementation Plan

## 1. Opis usługi

Usługa OpenRouter jest kluczowym komponentem QA Toolsmith MVP, odpowiedzialnym za integrację z API OpenRouter.ai w celu dostarczania funkcjonalności AI Assistant. Usługa umożliwia:

- Komunikację z różnymi modelami LLM (OpenAI, Anthropic, Google, etc.)
- Polerowanie treści w kontekście QA (templates, charters, knowledge base)
- Enforcowanie limitów dziennych per użytkownik
- Obsługę structured responses z JSON Schema validation
- Bezpieczne zarządzanie kluczami API i rate limiting

## 2. Opis konstruktora

```typescript
class OpenRouterService {
  constructor(config: OpenRouterConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || "https://openrouter.ai/api/v1";
    this.defaultModel = config.defaultModel || "anthropic/claude-3.5-sonnet";
    this.maxRetries = config.maxRetries || 3;
    this.timeout = config.timeout || 30000;
    this.rateLimiter = new RateLimiter(config.rateLimitConfig);
    this.usageTracker = new UsageTracker(config.usageConfig);
    this.messageBuilder = new MessageBuilder(config.messageConfig);
    this.responseFormatter = new ResponseFormatter(config.responseConfig);
  }
}
```

### Parametry konstruktora:

- `apiKey`: Klucz API OpenRouter (z environment variables)
- `baseUrl`: URL endpoint OpenRouter (default: https://openrouter.ai/api/v1)
- `defaultModel`: Domyślny model do użycia
- `maxRetries`: Maksymalna liczba prób retry (default: 3)
- `timeout`: Timeout dla requestów w ms (default: 30000)
- `rateLimitConfig`: Konfiguracja rate limiting
- `usageConfig`: Konfiguracja śledzenia użycia
- `messageConfig`: Konfiguracja budowania wiadomości
- `responseConfig`: Konfiguracja formatowania odpowiedzi

## 3. Publiczne metody i pola

### 3.1 Główne metody API

```typescript
// Główna metoda do przetwarzania tekstu
async processText(request: AITextProcessRequest): Promise<AITextProcessResponse>

// Sprawdzenie dostępnych limitów
async getUsageLimits(userId: string): Promise<AILimitsDTO>

// Lista dostępnych modeli
async getAvailableModels(): Promise<ModelInfo[]>

// Walidacja konfiguracji
validateConfig(): ValidationResult
```

### 3.2 Metody konfiguracyjne

```typescript
// Aktualizacja konfiguracji modelu
updateModelConfig(model: string, params: ModelParams): void

// Aktualizacja system prompt
updateSystemPrompt(context: AIContext, prompt: string): void

// Aktualizacja JSON Schema
updateResponseSchema(schemaName: string, schema: JSONSchema): void
```

### 3.3 Publiczne pola

```typescript
readonly config: OpenRouterConfig
readonly isHealthy: boolean
readonly lastError?: Error
```

## 4. Prywatne metody i pola

### 4.1 Metody HTTP

```typescript
private async makeRequest<T>(endpoint: string, data: any): Promise<T>
private async retryRequest<T>(requestFn: () => Promise<T>): Promise<T>
private handleHttpError(error: any): never
```

### 4.2 Metody wiadomości

```typescript
private buildSystemMessage(context: AIContext, field: AIField): string
private buildUserMessage(text: string, context: AIContext): string
private estimateTokens(messages: Message[]): number
private truncateContext(messages: Message[], maxTokens: number): Message[]
```

### 4.3 Metody odpowiedzi

```typescript
private parseResponse(response: any): AITextProcessResponse
private validateJsonSchema(data: any, schema: JSONSchema): boolean
private extractUsage(response: any): UsageInfo
```

### 4.4 Prywatne pola

```typescript
private apiKey: string
private baseUrl: string
private defaultModel: string
private maxRetries: number
private timeout: number
private rateLimiter: RateLimiter
private usageTracker: UsageTracker
private messageBuilder: MessageBuilder
private responseFormatter: ResponseFormatter
private systemPrompts: Map<AIContext, string>
private responseSchemas: Map<string, JSONSchema>
```

## 5. Obsługa błędów

### 5.1 Scenariusze błędów i obsługa

1. **Network timeouts**
   - Retry z exponential backoff
   - Circuit breaker pattern
   - Graceful degradation

2. **API rate limiting (429)**
   - Automatic retry after retry-after header
   - Queue requests
   - User notification

3. **Invalid API key (401)**
   - Log security event
   - Return generic error to user
   - Alert administrators

4. **Model unavailable (503)**
   - Fallback to alternative model
   - Queue request for later
   - User notification

5. **Response parsing errors**
   - Log raw response
   - Return safe fallback
   - Retry with different parameters

6. **Daily limit exceeded**
   - Check before request
   - Return limit information
   - Suggest manual fallback

7. **Invalid JSON Schema**
   - Validate schema on update
   - Use fallback schema
   - Log validation errors

8. **Context window exceeded**
   - Truncate context intelligently
   - Prioritize recent messages
   - Warn user about truncation

### 5.2 Error handling implementation

```typescript
class OpenRouterError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public retryable: boolean = false,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'OpenRouterError';
  }
}

private handleError(error: any): never {
  if (error instanceof OpenRouterError) {
    throw error;
  }

  // Map HTTP errors to application errors
  if (error.status === 429) {
    throw new OpenRouterError(
      'Rate limit exceeded',
      'RATE_LIMITED',
      429,
      true,
      error.headers?.['retry-after']
    );
  }

  if (error.status === 401) {
    throw new OpenRouterError(
      'Invalid API key',
      'INVALID_API_KEY',
      401,
      false
    );
  }

  // Default to internal error
  throw new OpenRouterError(
    'Internal service error',
    'INTERNAL_ERROR',
    500,
    true
  );
}
```

## 6. Kwestie bezpieczeństwa

### 6.1 Zarządzanie kluczami API

- Klucze API przechowywane w environment variables
- Rotacja kluczy bez restartu aplikacji
- Monitoring użycia kluczy
- Alerting przy podejrzanej aktywności

### 6.2 Sanityzacja danych

- Walidacja wszystkich inputów użytkownika
- Escaping specjalnych znaków
- Limity długości wiadomości
- Filtrowanie wrażliwych danych

### 6.3 Rate limiting

- Per-user daily limits
- Per-IP rate limiting
- Burst protection
- Graceful degradation

### 6.4 Logging i monitoring

- Strukturalne logowanie wszystkich requestów
- Monitoring response times
- Alerting przy błędach
- Audit trail dla compliance

## 7. Plan wdrożenia krok po kroku

### Krok 1: Przygotowanie środowiska

1. **Konfiguracja environment variables**

   ```bash
   OPENROUTER_API_KEY=your_api_key_here
   OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
   OPENROUTER_DEFAULT_MODEL=anthropic/claude-3.5-sonnet
   OPENROUTER_MAX_RETRIES=3
   OPENROUTER_TIMEOUT=30000
   ```

2. **Instalacja zależności**
   ```bash
   npm install @openrouter/api-sdk zod ajv
   ```

### Krok 2: Implementacja podstawowej struktury

1. **Utworzenie pliku `src/lib/services/openrouter.service.ts`**

   ```typescript
   import { OpenRouterService } from "./openrouter.service";

   export const openRouterService = new OpenRouterService({
     apiKey: import.meta.env.OPENROUTER_API_KEY,
     baseUrl: import.meta.env.OPENROUTER_BASE_URL,
     defaultModel: import.meta.env.OPENROUTER_DEFAULT_MODEL,
     maxRetries: parseInt(import.meta.env.OPENROUTER_MAX_RETRIES || "3"),
     timeout: parseInt(import.meta.env.OPENROUTER_TIMEOUT || "30000"),
   });
   ```

2. **Dodanie typów do `src/types/types.ts`**

   ```typescript
   export interface OpenRouterConfig {
     apiKey: string;
     baseUrl?: string;
     defaultModel?: string;
     maxRetries?: number;
     timeout?: number;
     rateLimitConfig?: RateLimitConfig;
     usageConfig?: UsageConfig;
     messageConfig?: MessageConfig;
     responseConfig?: ResponseConfig;
   }

   export interface ModelParams {
     temperature?: number;
     max_tokens?: number;
     top_p?: number;
     frequency_penalty?: number;
     presence_penalty?: number;
   }

   export interface JSONSchema {
     type: "object";
     properties: Record<string, any>;
     required?: string[];
     additionalProperties?: boolean;
   }
   ```

### Krok 3: Implementacja MessageBuilder

1. **System prompts dla różnych kontekstów**

   ```typescript
   private systemPrompts = new Map<AIContext, string>([
     ['template', 'You are a QA expert helping to improve defect report templates. Focus on clarity, completeness, and actionable information.'],
     ['charter', 'You are a QA expert helping to improve exploration charters. Focus on testability, coverage, and risk identification.'],
     ['kb', 'You are a QA expert helping to improve knowledge base entries. Focus on accuracy, relevance, and searchability.']
   ]);
   ```

2. **Przykłady komunikatów systemowych**

   ```typescript
   // Template context
   "You are a QA expert helping to improve defect report templates. Focus on clarity, completeness, and actionable information. The current field is: {field}. Improve the provided text while maintaining professional QA standards.";

   // Charter context
   "You are a QA expert helping to improve exploration charters. Focus on testability, coverage, and risk identification. The current field is: {field}. Enhance the provided text to be more specific and actionable for exploratory testing.";

   // KB context
   "You are a QA expert helping to improve knowledge base entries. Focus on accuracy, relevance, and searchability. The current field is: {field}. Improve the provided text to be more informative and useful for the QA team.";
   ```

### Krok 4: Implementacja ResponseFormatter

1. **JSON Schema dla structured responses**

   ```typescript
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
   ```

2. **Response format configuration**
   ```typescript
   const responseFormat = {
     type: "json_schema",
     json_schema: {
       name: "text_process_response",
       strict: true,
       schema: textProcessSchema,
     },
   };
   ```

### Krok 5: Konfiguracja modeli i parametrów

1. **Domyślne parametry modelu**

   ```typescript
   const defaultModelParams: ModelParams = {
     temperature: 0.7,
     max_tokens: 1000,
     top_p: 0.9,
     frequency_penalty: 0.1,
     presence_penalty: 0.1,
   };
   ```

2. **Konfiguracja per kontekst**
   ```typescript
   const contextModelConfig = {
     template: { temperature: 0.6, max_tokens: 800 },
     charter: { temperature: 0.8, max_tokens: 1200 },
     kb: { temperature: 0.5, max_tokens: 600 },
   };
   ```

### Krok 6: Implementacja UsageTracker

1. **Śledzenie limitów dziennych**

   ```typescript
   class UsageTracker {
     async checkDailyLimit(userId: string): Promise<boolean> {
       const today = new Date().toISOString().split("T")[0];
       const usage = await this.getDailyUsage(userId, today);
       return usage < this.dailyLimit;
     }

     async recordUsage(userId: string, tokens: number): Promise<void> {
       // Record usage in database
       await this.db.usage_events.insert({
         user_id: userId,
         kind: "ai",
         meta: { tokens, timestamp: new Date() },
       });
     }
   }
   ```

### Krok 7: Implementacja API endpoint

1. **Utworzenie `src/pages/api/ai/process.ts`**

   ```typescript
   import type { APIRoute } from "astro";
   import { openRouterService } from "../../../lib/services/openrouter.service";
   import { validateRequest } from "../../../lib/helpers/request.helper";
   import { auditEvent } from "../../../lib/helpers/audit.helper";

   export const POST: APIRoute = async ({ request }) => {
     try {
       const { userId } = await validateRequest(request);
       const body = (await request.json()) as AITextProcessRequest;

       // Check daily limit
       const hasLimit = await openRouterService.getUsageLimits(userId);
       if (hasLimit.remaining <= 0) {
         return new Response(
           JSON.stringify({
             error: { code: "DAILY_LIMIT_EXCEEDED", message: "Daily AI usage limit exceeded" },
           }),
           { status: 429 }
         );
       }

       // Process text
       const result = await openRouterService.processText(body);

       // Audit usage
       await auditEvent(userId, "ai", {
         context: body.context,
         field: body.field,
         tokens: result.usage.prompt + result.usage.completion,
       });

       return new Response(JSON.stringify(result));
     } catch (error) {
       return handleError(error);
     }
   };
   ```

### Krok 8: Implementacja RateLimiter

1. **Rate limiting per IP**
   ```typescript
   class RateLimiter {
     async checkLimit(ip: string): Promise<boolean> {
       const key = `ai:${ip}`;
       const current = await this.redis.incr(key);

       if (current === 1) {
         await this.redis.expire(key, 60); // 1 minute window
       }

       return current <= 10; // 10 requests per minute
     }
   }
   ```

### Krok 9: Testowanie i walidacja

1. **Unit tests**

   ```typescript
   describe("OpenRouterService", () => {
     it("should process text successfully", async () => {
       const result = await service.processText({
         context: "template",
         field: "description",
         text: "Bug in login form",
       });

       expect(result.proposal).toBeDefined();
       expect(result.diff).toBeDefined();
       expect(result.model).toBeDefined();
     });
   });
   ```

2. **Integration tests**
   ```typescript
   describe("AI API endpoint", () => {
     it("should return 429 when daily limit exceeded", async () => {
       // Mock usage tracker to return limit exceeded
       const response = await fetch("/api/ai/process", {
         method: "POST",
         body: JSON.stringify({ context: "template", field: "description", text: "test" }),
       });

       expect(response.status).toBe(429);
     });
   });
   ```

### Krok 10: Monitoring i alerting

1. **Strukturalne logowanie**

   ```typescript
   logger.info("AI request processed", {
     userId,
     context: request.context,
     field: request.field,
     model: result.model,
     tokens: result.usage.prompt + result.usage.completion,
     duration: Date.now() - startTime,
   });
   ```

2. **Health checks**
   ```typescript
   export async function checkOpenRouterHealth(): Promise<boolean> {
     try {
       await openRouterService.getAvailableModels();
       return true;
     } catch (error) {
       logger.error("OpenRouter health check failed", { error });
       return false;
     }
   }
   ```

### Krok 11: Deployment i konfiguracja

1. **Environment variables w production**

   ```bash
   OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
   OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
   OPENROUTER_DEFAULT_MODEL=anthropic/claude-3.5-sonnet
   OPENROUTER_DAILY_LIMIT=100
   OPENROUTER_RATE_LIMIT=10
   ```

2. **Database migrations**

   ```sql
   -- Add AI usage tracking
   ALTER TABLE usage_events ADD COLUMN IF NOT EXISTS ai_tokens INTEGER;

   -- Add AI limits table
   CREATE TABLE IF NOT EXISTS ai_limits (
     user_id UUID REFERENCES profiles(id),
     daily_limit INTEGER DEFAULT 100,
     current_usage INTEGER DEFAULT 0,
     reset_date DATE DEFAULT CURRENT_DATE,
     PRIMARY KEY (user_id, reset_date)
   );
   ```

### Krok 12: Dokumentacja i training

1. **API documentation**
   - OpenAPI spec dla AI endpoints
   - Przykłady użycia
   - Error codes i handling

2. **User documentation**
   - Jak używać AI Assistant
   - Limity i restrictions
   - Best practices

3. **Developer documentation**
   - Architecture overview
   - Extension points
   - Troubleshooting guide

## Podsumowanie

Ten plan implementacji zapewnia:

- **Bezpieczną integrację** z OpenRouter API
- **Skalowalną architekturę** z proper error handling
- **Compliance z wymaganiami** QA Toolsmith MVP
- **Monitoring i observability** dla production use
- **Graceful degradation** przy błędach
- **Proper rate limiting** i usage tracking
- **Type safety** z TypeScript
- **Test coverage** dla reliability

Implementacja powinna być wykonywana krok po kroku, z testowaniem każdego komponentu przed przejściem do następnego. Szczególną uwagę należy zwrócić na security, error handling i monitoring w production environment.
