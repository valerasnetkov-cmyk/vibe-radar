import {
  runBoundedJob,
  type JobHandler,
  type JobResult,
} from "@/server/modules/operations/job-runner";
import type { SchedulerStore } from "@/server/modules/operations/durable-store";

export type SchedulerOptions = {
  pollIntervalMs: number;
  maxAttempts: number;
  defaultLeaseMs?: number;
  onResult?: (jobName: string, result: JobResult) => void;
};

export type ScheduledJob = {
  handler: JobHandler;
  intervalMs: number;
  nextRunAt?: Date;
  leaseMs?: number;
  maxAttempts?: number;
};
type RegisteredJob = JobHandler | ScheduledJob;

const DEFAULT_LEASE_MS = 300000;

/**
 * Deterministic scheduler: due calculation depends only on the injected
 * `now`, missed intervals never catch up in a storm, and a slow job cannot
 * duplicate itself. Without a store the scheduler keeps its historical
 * in-process behavior (unit tests); production workers pass a durable
 * PostgreSQL store so singleton ownership and job-run history survive
 * restarts and work across processes.
 */
export class JobScheduler {
  private timer: ReturnType<typeof setInterval> | undefined;
  private running = false;

  constructor(
    private readonly jobs: ReadonlyMap<string, RegisteredJob>,
    private readonly options: SchedulerOptions,
    private readonly store?: SchedulerStore,
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.runOnce(), this.options.pollIntervalMs);
  }

  async runOnce(now = new Date()): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      for (const [name, registered] of this.jobs) {
        const job =
          typeof registered === "function" ? { handler: registered, intervalMs: 0 } : registered;
        if (job.intervalMs > 0 && job.nextRunAt && job.nextRunAt > now) continue;
        try {
          await this.executeOnce(name, job, now);
        } catch {
          // A store failure must never break sibling jobs; the lease
          // expiry and the next tick recover the skipped execution.
          continue;
        }
        if (typeof registered !== "function" && registered.intervalMs > 0)
          registered.nextRunAt = new Date(now.getTime() + registered.intervalMs);
      }
    } finally {
      this.running = false;
    }
  }

  private async executeOnce(
    name: string,
    job: { handler: JobHandler; intervalMs: number; leaseMs?: number; maxAttempts?: number },
    now: Date,
  ): Promise<void> {
    const maxAttempts = job.maxAttempts ?? this.options.maxAttempts;
    if (!this.store) {
      const result = await runBoundedJob(job.handler, { maxAttempts });
      this.options.onResult?.(name, result);
      return;
    }
    const leaseMs = job.leaseMs ?? this.options.defaultLeaseMs ?? DEFAULT_LEASE_MS;
    if (!(await this.store.claimLease(name, leaseMs, now))) return;
    const runId = await this.store.createRun(name, maxAttempts);
    try {
      const result = await runBoundedJob(job.handler, { maxAttempts });
      await this.store.finishRun(runId, result);
      this.options.onResult?.(name, result);
    } finally {
      await this.store.releaseLease(name).catch(() => undefined);
    }
  }

  async waitForIdle(timeoutMs: number): Promise<void> {
    const started = Date.now();
    while (this.running && Date.now() - started < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }
}
