import { eq } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { jobRuns } from "@/server/db/schema";
import type { JobResult } from "@/server/modules/operations/job-runner";

export async function createJobRun(jobName: string, maxAttempts: number) {
  return getDatabase()
    .insert(jobRuns)
    .values({ jobName, status: "RUNNING", attemptCount: 0, maxAttempts })
    .returning({ id: jobRuns.id });
}

export async function finishJobRun(id: string, result: JobResult) {
  return getDatabase()
    .update(jobRuns)
    .set({
      status: result.status,
      attemptCount: result.attempts,
      errorCode: result.errorCode,
      finishedAt: new Date(),
    })
    .where(eq(jobRuns.id, id));
}
