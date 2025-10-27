// DTO & Command Models derived from DB entities (see: ./database.types.ts)
// - We reuse Supabase-generated helpers to stay type-safe and in sync with the DB.
// - When API returns/accepts shapes slightly different from DB rows, we refine with Omit/Pick/Partial.

import type { Json, Tables } from "../db/database.types";

/* -------------------------------------------------------
 * Common primitives & envelopes
 * ----------------------------------------------------- */

export type UUID = string;
export type ISODateString = string;

/** Standard error codes used across the application */
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_CREDENTIALS"
  | "UNAUTHENTICATED"
  | "NO_CHANGES"
  | "FORBIDDEN_FIELD"
  | "EMAIL_TAKEN"
  | "INTERNAL"
  | "RATE_LIMITED";

export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, Json>;
  };
}

export interface KeysetPage<T> {
  items: T[];
  /** Encodes `(updated_at,id)`; pass back as `?after=` for next page */
  next_cursor?: string;
}

/* -------------------------------------------------------
 * Enums & domain literals (constrained where API defines)
 * ----------------------------------------------------- */

export type Role = "admin" | "user";

export type TemplateScope = "user" | "global";
export type TemplatePreset = "ui_bug" | "api_bug";

/** Charter status exposed by API (DB stores string; API uses constrained states). */
export type CharterStatus = "active" | "closed" | "idle";

/** Charter note tags per API */
export type CharterNoteTag = "bug" | "idea" | "question" | "risk";

/** Generators */
export type IbanCountry = "DE" | "AT" | "PL";
export type LocalDataCountry = "PL" | "DE" | "AT";
export type GeneratorKind =
  | "address"
  | "phone"
  | "plates"
  | "email"
  | "company"
  | "card"
  | "guid"
  | "string";

/** UI-specific types for Generators view */
export type OutputFormat = "text" | "json";

export interface GeneratorMeta {
  kind: GeneratorKind | "iban";
  name: string;
  description: string;
  href: string;
  icon: string; // lucide icon name
  example?: string;
}

export interface HistoryItem<T> {
  ts: number; // epoch ms
  data: T;
  note?: string;
}

export interface UIError {
  code: string;
  message: string;
}

export interface IbanViewState {
  mode: "generate" | "validate";
  country: IbanCountry;
  seed?: string | number;
  format: OutputFormat;
  result?: IbanGeneratorResponse;
  validation?: IbanValidationResponse;
  inputIban?: string;
  history: HistoryItem<IbanGeneratorResponse>[];
  isLoading: boolean;
  error?: UIError;
}

/** AI assistant */
export type AIContext = "template" | "charter" | "kb";
export type AIField = "description" | "steps" | "hypotheses" | "notes";

/* -------------------------------------------------------
 * Profiles
 * ----------------------------------------------------- */

/** DB row for profiles */
type ProfileRow = Tables<"profiles">;

/** Response for GET /profiles/me and list items in /admin/profiles */
export type ProfileDTO = Pick<
  ProfileRow,
  "id" | "email" | "created_at" | "updated_at"
> & {
  role: Role; // constrain to API enum
};

/**
 * PATCH /profiles/me — non-privileged fields only (server rejects role/org changes)
 * @field email - Must be valid RFC5322 format, max length 254 chars
 */
export type UpdateMyProfileCommand = Partial<Pick<ProfileRow, "email">>;

/** Admin list */
export type AdminProfilesListResponse = KeysetPage<ProfileDTO>;

/* -------------------------------------------------------
 * Templates
 * ----------------------------------------------------- */

/** Structured field schema stored in templates.fields (DB has Json) */
export type TemplateFieldType =
  | "text"
  | "markdown"
  | "number"
  | "date"
  | "select"
  | "multiselect";

/** Minimal, practical schema matching the API plan */
export interface TemplateField {
  key: string;
  type: TemplateFieldType | (string & {}); // allow future-safe literals
  label: string;
  help?: string;
  default?: Json;
  options?: Json; // e.g., string[] or {label,value}[]
}

type TemplateRow = Tables<"templates">;
type TemplateEffectiveRow = Tables<"templates_effective">;

/** Read shape for single template endpoints */
export type TemplateDTO = Omit<TemplateRow, "fields" | "scope" | "preset"> & {
  /** API narrows Json → array; validated by backend */
  fields: TemplateField[];
  scope: TemplateScope;
  preset: TemplatePreset | null;
};

/** List shape: GET /templates (alias of templates_effective view) */
export type TemplateListItemDTO = Omit<
  TemplateEffectiveRow,
  | "fields"
  | "scope"
  | "preset"
  | "required_fields"
  | "is_readonly"
  | "origin_template_id"
> & {
  fields: TemplateField[] | null;
  scope: TemplateScope | null;
  preset: TemplatePreset | null;
  required_fields: string[];
  is_readonly: boolean;
  origin_template_id: UUID | null;
};

export type TemplatesListResponse = KeysetPage<TemplateListItemDTO>;

/** POST /templates — create user/global template */
export interface CreateTemplateCommand {
  name: string;
  scope: TemplateScope;
  fields: TemplateField[];
  required_fields: string[];
  attachments: string[]; // validated as HTTP/HTTPS
  preset?: TemplatePreset | null;
}

/** PATCH /templates/{id} — mutable fields, readonly semantics enforced by server */
export type UpdateTemplateCommand = Partial<
  Pick<
    TemplateDTO,
    "name" | "fields" | "required_fields" | "attachments" | "preset" | "scope"
  >
>;

/** POST /templates/{id}/fork — create a user-owned fork */
export interface ForkTemplateCommand {
  /** Optional new name; if omitted, backend may derive it; 409 on same-name */
  name?: string;
}

/** POST /templates/{id}/render — produce Markdown report */
export interface RenderTemplateCommand {
  /** key→value map; required_fields must be present */
  values: Record<string, string>;
  attachments?: string[]; // validated as URLs
}
export interface RenderTemplateResult {
  markdown: string;
}

/* -------------------------------------------------------
 * Drafts (optional MVP)
 * ----------------------------------------------------- */

type DraftRow = Tables<"drafts">;

export type DraftDTO = DraftRow;

export type DraftsListResponse = KeysetPage<DraftDTO>;

export type CreateDraftCommand = Pick<DraftRow, "title" | "content"> & {
  template_id?: UUID | null;
};

export type UpdateDraftCommand = Partial<
  Pick<DraftRow, "title" | "content" | "template_id">
>;

/* -------------------------------------------------------
 * Charters & Notes
 * ----------------------------------------------------- */

type CharterRow = Tables<"charters">;
type CharterNoteRow = Tables<"charter_notes">;

/** Single charter read shape */
export type CharterDTO = Omit<CharterRow, "status"> & {
  status: CharterStatus;
};

export type ChartersListResponse = KeysetPage<CharterDTO>;

/** POST /charters — create a new charter */
export interface CreateCharterCommand {
  goal: string;
  hypotheses?: string | null;
}

/** PATCH /charters/{id} — update mutable fields */
export type UpdateCharterCommand = Partial<
  Pick<CharterRow, "goal" | "hypotheses" | "summary_notes">
>;

/** POST /charters/{id}/start and /stop — no payload, status transitions are server-side */
export type StartCharterCommand = Record<never, never>;
export type StopCharterCommand = Record<never, never>;

/** GET /charters/{id}/export */
export interface CharterExportDTO {
  markdown: string;
}

/** Notes */
export type CharterNoteDTO = Omit<CharterNoteRow, "tag"> & {
  tag: CharterNoteTag;
};

export interface CreateCharterNoteCommand {
  body: string;
  tag: CharterNoteTag;
}

export type CharterNotesListResponse = KeysetPage<CharterNoteDTO>;

/* -------------------------------------------------------
 * Knowledge Base (KB) & Notes
 * ----------------------------------------------------- */

type KbEntryRow = Tables<"kb_entries">;
type KbNoteRow = Tables<"kb_notes">;

/** Expose KB entry without internal FTS column */
export type KBEntryDTO = Omit<KbEntryRow, "search_vector">;

export type KBListResponse = KeysetPage<KBEntryDTO>;

export interface CreateKBEntryCommand {
  title: string;
  url: string;
  tags?: string[];
}

export type UpdateKBEntryCommand = Partial<
  Pick<KBEntryDTO, "title" | "tags" | "url_original">
>;

/** KB notes */
export type KBNoteDTO = KbNoteRow;

export type CreateKBNoteCommand = Pick<KbNoteRow, "body">;

export type KBNotesListResponse = KeysetPage<KBNoteDTO>;

/** GET /kb/export — JSON export of user's KB */
export interface KBExportDTO {
  entries: KBEntryDTO[];
  notes: KBNoteDTO[];
}

/* -------------------------------------------------------
 * Generators & Validators
 * ----------------------------------------------------- */

export interface IbanGenerateParams {
  country: IbanCountry;
  seed?: string | number;
}

export interface IbanGeneratorResponse {
  iban: string;
  country: IbanCountry;
  seed?: string | number;
}

export interface IbanValidateParams {
  iban: string;
}
export interface IbanValidationResponse {
  valid: boolean;
  reason?: string;
}

/** Generic data generator (other kinds) */
export interface GenericGeneratorParams {
  kind: GeneratorKind;
  country: LocalDataCountry;
  seed?: string | number;
}

/** Shape is intentionally loose to accommodate multiple generator outputs */
export interface GenericGeneratorResponse {
  kind: GeneratorKind;
  country: LocalDataCountry;
  data: Json;
}

/* -------------------------------------------------------
 * AI Assistant
 * ----------------------------------------------------- */

export interface AITextProcessRequest {
  context: AIContext;
  field: AIField;
  text: string;
}

export interface AITextProcessResponse {
  proposal: string;
  diff: string;
  model: string;
  usage: { prompt: number; completion: number };
}

/** GET /ai/limits */
export interface AILimitsDTO {
  remaining: number;
}

/* -------------------------------------------------------
 * OpenRouter Service Types
 * ----------------------------------------------------- */

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
  supabaseClient?: unknown; // Supabase client for database integration
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
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  burstLimit: number;
}

export interface UsageConfig {
  dailyLimit: number;
  resetHour: number;
}

export interface MessageConfig {
  maxTokens: number;
  systemPromptTemplate: string;
}

export interface ResponseConfig {
  enableStructuredOutput: boolean;
  defaultSchema?: JSONSchema;
}

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  pricing: {
    prompt: number;
    completion: number;
  };
}

export interface UsageInfo {
  prompt: number;
  completion: number;
  total: number;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

/* -------------------------------------------------------
 * OpenRouter API Types
 * ----------------------------------------------------- */

export interface OpenRouterChoice {
  message: {
    content: string;
    role?: string;
  };
  finish_reason?: string;
  index?: number;
}

export interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OpenRouterResponse {
  choices: OpenRouterChoice[];
  model: string;
  usage: OpenRouterUsage;
  created?: number;
  id?: string;
  object?: string;
}

/* -------------------------------------------------------
 * Events & Stats
 * ----------------------------------------------------- */

export type UsageEventKind = "charter" | "generator" | "kb";

export interface PostEventCommand {
  kind: UsageEventKind;
  meta?: Record<string, Json>;
}

/** Minimal per-user summary; admins may see global aggregates */
export interface StatsSummaryDTO {
  charters: number;
  generators: number;
  kb: number;
}

/* -------------------------------------------------------
 * Health & Auth
 * ----------------------------------------------------- */

export interface HealthDTO {
  status: "ok";
}

/** Response for pending verification states (e.g. email change) */
export interface PendingVerificationResponse {
  status: "pending_verification";
  message: string;
}

/** Auth shapes are implementation-specific; keep minimal & explicit */
export interface LoginRequest {
  email: string;
  password: string;
}
export interface LoginResponse {
  access_token: string; // Supabase JWT
  profile: ProfileDTO;
}
export interface SignupRequest {
  email: string;
  password: string;
}
export interface SignupResponse {
  user: {
    id: string;
    email: string;
  };
}
export interface LogoutResponse {
  success: true;
}
