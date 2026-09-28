import { normalizeOperationalError } from "@/server/modules/operations/errors";

export type JobStatus = "SUCCEEDED" | "FAILED" | "DEAD_LETTER";

export type JobResult = {
  status: JobStatus;
  attempts: number;
  errorCode?: string;
};

export type JobHandler = () => Promise<void>;

export type JobRunnerOptions = {
  maxAttempts: number;
  retryDelayMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
};

/**
 * Bounded execution envelope with classified retries.
 *
 * - Retryable failures (transient network, provider 5xx-classified codes,
 *   timeouts) sleep with backoff and retry within maxAttempts.
 * - Non-retryable failures (config, validation, state conflicts, exhausted
 *   budgets) finish immediately as FAILED without further attempts.
 * - Exhausted attempts finish as DEAD_LETTER with a safe normalized code.
 * Raw messages and provider payloads never become error codes.
 */
export async function runBoundedJob(
  handler: JobHandler,
  options: JobRunnerOptions,
): Promise<JobResult> {
  const maxAttempts = Math.max(1, Math.min(5, Math.floor(options.maxAttempts)));
  const sleep =
    options.sleep ??
    ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await handler();
      return { status: "SUCCEEDED", attempts: attempt };
    } catch (error) {
      const normalized = normalizeOperationalError(error);
      if (!normalized.retryable && attempt < maxAttempts) {
        return { status: "FAILED", attempts: attempt, errorCode: normalized.code };
      }
      if (attempt === maxAttempts) {
        return { status: "DEAD_LETTER", attempts: attempt, errorCode: normalized.code };
      }
      await sleep((options.retryDelayMs ?? 100) * 2 ** (attempt - 1));
    }
  }
  return { status: "FAILED", attempts: maxAttempts, errorCode: "JOB_HANDLER_ERROR" };
}
