import { describe, expect, it } from "vitest";
import { runBoundedJob } from "@/server/modules/operations/job-runner";
import { OperationalMetrics } from "@/server/modules/operations/metrics";
import { JobScheduler } from "@/server/modules/operations/scheduler";

describe("operations runner", () => {
  it("retries transient job failures and succeeds within the cap", async () => {
    let calls = 0;
    const result = await runBoundedJob(
      async () => {
        calls += 1;
        if (calls < 3) throw new Error("temporary");
      },
      { maxAttempts: 3, retryDelayMs: 1 },
    );
    expect(result).toEqual({ status: "SUCCEEDED", attempts: 3 });
  });

  it("moves exhausted jobs to dead letter state", async () => {
    const result = await runBoundedJob(
      async () => {
        throw new TypeError("bad input");
      },
      { maxAttempts: 2, retryDelayMs: 1 },
    );
    expect(result).toEqual({ status: "DEAD_LETTER", attempts: 2, errorCode: "TypeError" });
  });

  it("does not overlap scheduler cycles and records operational metrics", async () => {
    let active = 0;
    let maximum = 0;
    const metrics = new OperationalMetrics();
    const scheduler = new JobScheduler(
      new Map([
        [
          "test",
          async () => {
            active += 1;
            maximum = Math.max(maximum, active);
            await new Promise((resolve) => setTimeout(resolve, 5));
            active -= 1;
          },
        ],
      ]),
      {
        pollIntervalMs: 1000,
        maxAttempts: 1,
        onResult: (name, result) => metrics.record(name, result.status, result.attempts),
      },
    );
    await Promise.all([scheduler.runOnce(), scheduler.runOnce()]);
    scheduler.stop();
    expect(maximum).toBe(1);
    expect(metrics.snapshot()).toHaveLength(1);
  });

  it("runs scheduled jobs only when their interval is due", async () => {
    let calls = 0;
    const scheduled = {
      handler: async () => {
        calls += 1;
      },
      intervalMs: 1000,
    };
    const scheduler = new JobScheduler(new Map([["scheduled", scheduled]]), {
      pollIntervalMs: 1000,
      maxAttempts: 1,
    });
    const start = new Date("2026-09-18T00:00:00Z");
    await scheduler.runOnce(start);
    await scheduler.runOnce(new Date("2026-09-18T00:00:00.500Z"));
    await scheduler.runOnce(new Date("2026-09-18T00:00:01Z"));
    expect(calls).toBe(2);
  });
});
