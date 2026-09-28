import { z } from "zod";

const booleanFlag = z.enum(["true", "false"]).transform((value) => value === "true");
const optionalString = (schema: z.ZodType<string>) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1),
  DATABASE_SSL: z.enum(["disable", "require"]).default("disable"),
  GITHUB_TOKEN: optionalString(z.string().min(1)),
  GITHUB_API_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(10000),
  GITHUB_MAX_RETRIES: z.coerce.number().int().min(0).max(3).default(2),
  GITHUB_DISCOVERY_QUERIES: z.string().default(""),
  GITHUB_DISCOVERY_INTERVAL_MS: z.coerce.number().int().min(60000).max(86400000).default(3600000),
  GITHUB_DISCOVERY_MAX_QUERIES: z.coerce.number().int().min(1).max(50).default(10),
  SCORE_CALCULATION_INTERVAL_MS: z.coerce.number().int().min(60000).max(86400000).default(3600000),
  CANDIDATE_SELECTION_INTERVAL_MS: z.coerce
    .number()
    .int()
    .min(60000)
    .max(86400000)
    .default(3600000),
  PUBLICATION_INTERVAL_MS: z.coerce.number().int().min(60000).max(86400000).default(3600000),
  DAILY_RADAR_INTERVAL_MS: z.coerce.number().int().min(60000).max(86400000).default(86400000),
  WEEKLY_RADAR_INTERVAL_MS: z.coerce.number().int().min(60000).max(604800000).default(604800000),
  WORKER_JOB_LEASE_MS: z.coerce.number().int().min(60000).max(3600000).default(300000),
  TELEGRAM_EDITOR_IDS: z.string().default(""),
  TELEGRAM_WEBHOOK_SECRET: optionalString(z.string().min(16)),
  TELEGRAM_BOT_TOKEN: optionalString(z.string().min(1)),
  TELEGRAM_CHANNEL_ID: optionalString(z.string().min(1)),
  TELEGRAM_EDITOR_CHAT_ID: optionalString(z.string().min(1)),
  TELEGRAM_API_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(10000),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().min(1000).max(300000).default(30000),
  WORKER_MAX_JOB_ATTEMPTS: z.coerce.number().int().min(1).max(5).default(3),
  AI_DAILY_MAX_CANDIDATES: z.coerce.number().int().min(0).max(10000).default(50),
  AI_MAX_OUTPUT_CHARS: z.coerce.number().int().min(1000).max(100000).default(12000),
  AI_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(3).default(2),
  OUTSCAN_INTEGRATION_ENABLED: booleanFlag.default(false),
  OUTSCAN_NATIVE_CTA_ENABLED: booleanFlag.default(false),
  OUTSCAN_CHECK_ENABLED: booleanFlag.default(false),
  OUTSCAN_BASE_URL: z.string().url().default("https://outscan.ru"),
});

export type RuntimeConfig = z.infer<typeof environmentSchema>;
export type EnvironmentInput = Record<string, string | undefined>;

export function parseEnvironment(input: EnvironmentInput): RuntimeConfig {
  const result = environmentSchema.safeParse(input);
  if (!result.success) {
    throw new Error("Invalid server configuration");
  }
  return result.data;
}

export function loadEnvironment(): RuntimeConfig {
  return parseEnvironment(process.env);
}

export function parseEditorIds(value: string): Set<string> {
  return new Set(
    value
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

export type TelegramEditorConfig = {
  botToken: string;
  editorChatId: string;
  editorIds: Set<string>;
  timeoutMs: number;
};

/**
 * Narrow runtime validator for the Telegram editorial dispatch path only.
 * Fails closed when the feature is used; unrelated test/dev commands must
 * not call this helper so they never require Telegram settings.
 */
export function requireTelegramEditorConfig(config: RuntimeConfig): TelegramEditorConfig {
  const botToken = config.TELEGRAM_BOT_TOKEN;
  const editorChatId = config.TELEGRAM_EDITOR_CHAT_ID;
  const editorIds = parseEditorIds(config.TELEGRAM_EDITOR_IDS);
  const timeoutMs = config.TELEGRAM_API_TIMEOUT_MS;
  if (!botToken || !editorChatId || editorIds.size === 0) {
    throw new Error("Telegram editorial configuration is incomplete");
  }
  return { botToken, editorChatId, editorIds, timeoutMs };
}

export type TelegramPublishingConfig = {
  botToken: string;
  channelId: string;
  timeoutMs: number;
};

/**
 * Narrow runtime validator for the public Telegram publishing path only.
 * The public channel is never the private editor chat. Fails closed when
 * the publishing path is used; unrelated commands must not call this
 * helper so they never require Telegram settings.
 */
export function requireTelegramPublishingConfig(config: RuntimeConfig): TelegramPublishingConfig {
  const botToken = config.TELEGRAM_BOT_TOKEN;
  const channelId = config.TELEGRAM_CHANNEL_ID;
  const timeoutMs = config.TELEGRAM_API_TIMEOUT_MS;
  if (!botToken || !channelId) {
    throw new Error("Telegram publishing configuration is incomplete");
  }
  return { botToken, channelId, timeoutMs };
}

export function parseDiscoveryQueries(value: string, maximum = 10): string[] {
  return [
    ...new Set(
      value
        .split(",")
        .map((query) => query.trim())
        .filter(Boolean),
    ),
  ].slice(0, maximum);
}
