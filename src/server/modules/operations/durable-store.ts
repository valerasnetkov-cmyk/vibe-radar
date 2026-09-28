import { randomUUID } from "node:crypto";
import { getDatabase } from "@/server/db/client";
import { claimJobLease, releaseJobLease } from "@/server/modules/operations/leases";
import { createJobRun, finishJobRun } from "@/server/modules/operations/repository";
import type { JobResult } from "@/server/modules/operations/job-runner";

export type SchedulerStore = {
  ownerId: string;
  claimLease(jobName: string, leaseMs: number, now: Date): Promise<boolean>;
  releaseLease(jobName: string): Promise<void>;
  createRun(jobName: string, maxAttempts: number): Promise<string>;
  finishRun(runId: string, result: JobResult): Promise<void>;
};

/**
 * PostgreSQL-backed scheduler store: lease ownership and job-run history
 * are decided by the database, never by process memory. A random owner id
 * identifies this worker process; it is an internal runtime identity, not
 * a credential.
 */
export function createDurableSchedulerStore(
  database: ReturnType<typeof getDatabase> = getDatabase(),
  ownerId: string = randomUUID(),
): SchedulerStore {
  return {
    ownerId,
    claimLease: (jobName, leaseMs, now) => claimJobLease(database, jobName, ownerId, leaseMs, now),
    releaseLease: (jobName) => releaseJobLease(database, jobName, ownerId),
    createRun: async (jobName, maxAttempts) => {
      const [run] = await createJobRun(jobName, maxAttempts, {}, database);
      if (!run) throw new Error("Failed to persist job run");
      return run.id;
    },
    finishRun: async (runId, result) => {
      await finishJobRun(runId, result, database);
    },
  };
}
