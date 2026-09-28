const SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,64}$/;

const RETRYABLE_EXACT = new Set([
  "JOB_TRANSIENT",
  "JOB_TIMEOUT",
  "GITHUB_RATE_LIMIT",
  "GITHUB_NETWORK",
  "DATABASE_UNAVAILABLE",
  "TELEGRAM_TIMEOUT",
  "AI_TIMEOUT",
  "AI_PROVIDER_ERROR",
]);

const NON_RETRYABLE_EXACT = new Set([
  "CONFIG_INVALID",
  "AI_BUDGET_EXHAUSTED",
  "AI_INVALID_OUTPUT",
  "JOB_VALIDATION_ERROR",
  "JOB_STATE_CONFLICT",
  "PUBLICATION_RECONCILIATION_REQUIRED",
]);

const RETRYABLE_PATTERN =
  /TIMEOUT|TIME_OUT|NETWORK|RATE_LIMIT|UNAVAILABLE|CONNECTION|ECONN|ETIMEDOUT|HTTP_5|50[0-9]|GATEWAY|TRY_AGAIN|BUSY|LOCKED/;
const NON_RETRYABLE_PATTERN =
  /BUDGET_EXHAUSTED|INVALID|UNAUTHORIZED|FORBIDDEN|NOT_FOUND|CONFLICT|VALIDATION|EXHAUSTED|REJECTED/;

export type OperationalError = { code: string; retryable: boolean };

function classifyPreservedCode(code: string): boolean {
  if (RETRYABLE_EXACT.has(code)) return true;
  if (NON_RETRYABLE_EXACT.has(code)) return false;
  if (NON_RETRYABLE_PATTERN.test(code)) return false;
  if (RETRYABLE_PATTERN.test(code)) return true;
  // Unknown provider codes retry within the bounded attempt budget rather
  // than silently dropping possibly-transient work.
  return true;
}

function classifyMessage(message: string): OperationalError | null {
  if (/invalid server configuration|invalid.+config|missing.+config/i.test(message)) {
    return { code: "CONFIG_INVALID", retryable: false };
  }
  if (/budget.?exhausted/i.test(message)) {
    return { code: "AI_BUDGET_EXHAUSTED", retryable: false };
  }
  if (/unauthorized|forbidden|not approved|editorial approval|stale/i.test(message)) {
    return { code: "JOB_STATE_CONFLICT", retryable: false };
  }
  return null;
}

/**
 * Normalize any thrown value to a bounded safe operational code.
 * Only allow-listed code shapes and module constants are ever produced;
 * raw messages, tokens, URLs, and provider payloads never persist.
 */
export function normalizeOperationalError(error: unknown): OperationalError {
  if (error !== null && typeof error === "object") {
    const record = error as { code?: unknown; reason?: unknown; name?: unknown };
    if (typeof record.code === "string" && SAFE_CODE_PATTERN.test(record.code)) {
      return { code: record.code, retryable: classifyPreservedCode(record.code) };
    }
    // AnalysisFailedError and similar typed reasons (duck-typed to avoid
    // coupling the operations layer to provider modules).
    if (record.name === "AnalysisFailedError" && typeof record.reason === "string") {
      switch (record.reason) {
        case "BUDGET_EXHAUSTED":
          return { code: "AI_BUDGET_EXHAUSTED", retryable: false };
        case "INVALID_OUTPUT":
          return { code: "AI_INVALID_OUTPUT", retryable: false };
        case "TIMEOUT":
          return { code: "AI_TIMEOUT", retryable: true };
        default:
          return { code: "AI_PROVIDER_ERROR", retryable: true };
      }
    }
    if (record.name === "ZodError") {
      return { code: "JOB_VALIDATION_ERROR", retryable: false };
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      return { code: "JOB_TIMEOUT", retryable: true };
    }
    if (error instanceof Error) {
      if (error.name === "AbortError") return { code: "JOB_TIMEOUT", retryable: true };
      const byMessage = classifyMessage(error.message);
      if (byMessage) return byMessage;
      if (error instanceof TypeError) return { code: "JOB_TRANSIENT", retryable: true };
      return { code: "JOB_HANDLER_ERROR", retryable: true };
    }
  }
  if (typeof error === "string") {
    const byMessage = classifyMessage(error);
    if (byMessage) return byMessage;
  }
  return { code: "JOB_HANDLER_ERROR", retryable: true };
}
