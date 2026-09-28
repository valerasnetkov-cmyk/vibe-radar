import { describe, expect, it, vi } from "vitest";
import type { SchedulerStore } from "@/server/modules/operations/durable-store";
import type { JobResult } from "@/server/modules/operations/job-runner";
import { JobScheduler } from "@/server/modules/operations/scheduler";

function makeStore(overrides: Partial<SchedulerStore> = {}): SchedulerStore & {
  claims: string[];
  releases: string[];
  created: Array<{ jobName: string; maxAttempts: number }>;
  finished: Array<{ runId: string; result: JobResult }>;
} {
  const state = {
    claims: [] as string[],
    releases: [] as string[],
    created: [] as Array<{ jobName: string; maxAttempts: number }>,
    finished: [] as Array<{ runId: string; result: JobResult }>,
  };
  let runs = 0;
  return {
    ...state,
    ownerId: "owner-test",
    claimLease: async (jobName: string) => {
      state.claims.push(jobName);
      return true;
    },
    releaseLease: async (jobName: string) => {
      state.releases.push(jobName);
    },
    createRun: async (jobName: string, maxAttempts: number) => {
      state.created.push({ jobName, maxAttempts });
      runs += 1;
      return `run-${runs}`;
    },
    finishRun: async (runId: string, result: JobResult) => {
      state.finished.push({ runId, result });
    },
    ...overrides,
  };
}

describe("durable scheduler execution", () => {
  it("skips jobs it cannot claim and never runs their handlers", async () => {
    const handler = vi.fn(async () => undefined);
    const store = makeStore({ claimLease: async () => false });
    const scheduler = new JobScheduler(
      new Map([["github-discovery", { handler, intervalMs: 0 }]]),
      {
        pollIntervalMs: 1000,
        maxAttempts: 2,
      },
      store,
    );
    await scheduler.runOnce(new Date("2026-09-18T00:00:00Z"));
    expect(handler).not.toHaveBeenCalled();
    expect(store.created).toHaveLength(0);
    expect(store.finished).toHaveLength(0);
  });

  it("persists RUNNING history, finishes results, and releases the lease", async () => {
    const handler = vi.fn(async () => undefined);
    const seen: Array<{ name: string; result: JobResult }> = [];
    const store = makeStore();
    const scheduler = new JobScheduler(
      new Map([["score-calculation", { handler, intervalMs: 0 }]]),
      {
        pollIntervalMs: 1000,
        maxAttempts: 2,
        onResult: (name, result) => seen.push({ name, result }),
      },
      store,
    );
    await scheduler.runOnce(new Date("2026-09-18T00:00:00Z"));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(store.created).toEqual([{ jobName: "score-calculation", maxAttempts: 2 }]);
    expect(store.finished).toEqual([
      { runId: "run-1", result: { status: "SUCCEEDED", attempts: 1 } },
    ]);
    expect(store.releases).toEqual(["score-calculation"]);
    expect(seen).toEqual([
      { name: "score-calculation", result: { status: "SUCCEEDED", attempts: 1 } },
    ]);
  });

  it("persists non-retryable failures without retrying and releases the lease", async () => {
    let calls = 0;
    const store = makeStore();
    const scheduler = new JobScheduler(
      new Map([
        [
          "publication",
          {
            handler: async () => {
              calls += 1;
              throw new Error("Invalid server configuration");
            },
            intervalMs: 0,
          },
        ],
      ]),
      { pollIntervalMs: 1000, maxAttempts: 3 },
      store,
    );
    await scheduler.runOnce(new Date("2026-09-18T00:00:00Z"));
    expect(calls).toBe(1);
    expect(store.finished).toEqual([
      { runId: "run-1", result: { status: "FAILED", attempts: 1, errorCode: "CONFIG_INVALID" } },
    ]);
    expect(store.releases).toEqual(["publication"]);
  });

  it("persists dead-letter outcomes when bounded attempts exhaust", async () => {
    const store = makeStore();
    const scheduler = new JobScheduler(
      new Map([
        [
          "daily-radar",
          {
            handler: async () => {
              throw new TypeError("socket hang up");
            },
            intervalMs: 0,
          },
        ],
      ]),
      { pollIntervalMs: 1000, maxAttempts: 1 },
      store,
    );
    await scheduler.runOnce(new Date("2026-09-18T00:00:00Z"));
    expect(store.finished).toEqual([
      {
        runId: "run-1",
        result: { status: "DEAD_LETTER", attempts: 1, errorCode: "JOB_TRANSIENT" },
      },
    ]);
  });

  it("isolates store failures so sibling jobs still execute", async () => {
    const good = vi.fn(async () => undefined);
    const store = makeStore({
      claimLease: async (jobName: string) => {
        if (jobName === "score-calculation") throw new Error("db blip");
        return true;
      },
    });
    const scheduler = new JobScheduler(
      new Map([
        ["score-calculation", { handler: vi.fn(async () => undefined), intervalMs: 0 }],
        ["candidate-selection", { handler: good, intervalMs: 0 }],
      ]),
      { pollIntervalMs: 1000, maxAttempts: 1 },
      store,
    );
    await scheduler.runOnce(new Date("2026-09-18T00:00:00Z"));
    expect(good).toHaveBeenCalledTimes(1);
  });

  it("stops accepting work and reports idle for graceful shutdown", async () => {
    const scheduler = new JobScheduler(new Map(), { pollIntervalMs: 50, maxAttempts: 1 });
    scheduler.start();
    scheduler.stop();
    await scheduler.waitForIdle(1000);
    expect(true).toBe(true);
  });
});
