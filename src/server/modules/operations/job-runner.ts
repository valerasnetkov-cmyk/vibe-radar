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
      if (attempt === maxAttempts) {
        return { status: "DEAD_LETTER", attempts: attempt, errorCode: normalizeError(error) };
      }
      await sleep((options.retryDelayMs ?? 100) * 2 ** (attempt - 1));
    }
  }
  return { status: "FAILED", attempts: maxAttempts, errorCode: "RUNNER_ERROR" };
}

function normalizeError(error: unknown): string {
  if (error instanceof Error && error.name) return error.name.slice(0, 80);
  return "UNKNOWN_ERROR";
}
