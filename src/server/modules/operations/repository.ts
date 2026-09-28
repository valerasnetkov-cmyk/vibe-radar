import { eq } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { jobRuns } from "@/server/db/schema";
import type { JobResult } from "@/server/modules/operations/job-runner";

export async function createJobRun(
  jobName: string,
  maxAttempts: number,
  options: { replayOfJobRunId?: string } = {},
  database: ReturnType<typeof getDatabase> = getDatabase(),
) {
  return database
    .insert(jobRuns)
    .values({
      jobName,
      status: "RUNNING",
      attemptCount: 0,
      maxAttempts,
      replayOfJobRunId: options.replayOfJobRunId,
    })
    .returning({ id: jobRuns.id });
}

export async function finishJobRun(
  id: string,
  result: JobResult,
  database: ReturnType<typeof getDatabase> = getDatabase(),
) {
  return database
    .update(jobRuns)
    .set({
      status: result.status,
      attemptCount: result.attempts,
      errorCode: result.errorCode,
      finishedAt: new Date(),
    })
    .where(eq(jobRuns.id, id));
}

export async function loadJobRun(
  id: string,
  database: ReturnType<typeof getDatabase> = getDatabase(),
) {
  const [row] = await database.select().from(jobRuns).where(eq(jobRuns.id, id)).limit(1);
  return row ?? null;
}
