import {
  runBoundedJob,
  type JobHandler,
  type JobResult,
} from "@/server/modules/operations/job-runner";

export type SchedulerOptions = {
  pollIntervalMs: number;
  maxAttempts: number;
  onResult?: (jobName: string, result: JobResult) => void;
};

export type ScheduledJob = {
  handler: JobHandler;
  intervalMs: number;
  nextRunAt?: Date;
};
type RegisteredJob = JobHandler | ScheduledJob;

export class JobScheduler {
  private timer: ReturnType<typeof setInterval> | undefined;
  private running = false;

  constructor(
    private readonly jobs: ReadonlyMap<string, RegisteredJob>,
    private readonly options: SchedulerOptions,
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
        const result = await runBoundedJob(job.handler, { maxAttempts: this.options.maxAttempts });
        this.options.onResult?.(name, result);
        if (typeof registered !== "function" && registered.intervalMs > 0)
          registered.nextRunAt = new Date(now.getTime() + registered.intervalMs);
      }
    } finally {
      this.running = false;
    }
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }
}
