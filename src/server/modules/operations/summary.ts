import { desc, eq, sql } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { readAiDailyUsage, utcDayString } from "@/server/modules/analysis/budget-store";
import { candidates, jobRuns, publicationEvents, publications } from "@/server/db/schema";
import { listReconciliationItems } from "@/server/modules/operations/reconciliation";

export type JobSummary = {
  jobName: string;
  succeeded: number;
  failed: number;
  deadLetter: number;
  running: number;
  totalAttempts: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
};

export type OperationalSummary = {
  generatedAt: string;
  jobs: JobSummary[];
  aiBudget: { day: string; limit: number; used: number; remaining: number };
  publications: { published: number; failed: number; pending: number };
  editorial: { candidates: number; review: number; approvedBacklog: number };
  analytics: { deliveredEvents: number };
  reconciliation: { items: number };
};

/**
 * Durable operational summary sourced from observed PostgreSQL rows only:
 * job_runs history, AI usage, publication states, editorial queue depth,
 * and real provider-accepted events. Nothing is invented.
 */
export async function getOperationalSummary(
  database: ReturnType<typeof getDatabase> = getDatabase(),
  options: { aiLimit: number; day?: string } = { aiLimit: 0 },
): Promise<OperationalSummary> {
  const day = options.day ?? utcDayString();
  const statusCounts = await database
    .select({
      jobName: jobRuns.jobName,
      status: jobRuns.status,
      runs: sql<number>`count(*)`,
      attempts: sql<number>`coalesce(sum(${jobRuns.attemptCount}), 0)`,
    })
    .from(jobRuns)
    .groupBy(jobRuns.jobName, jobRuns.status);
  const lastSuccess = await database
    .select({
      jobName: jobRuns.jobName,
      at: sql<Date | null>`max(${jobRuns.finishedAt})`,
    })
    .from(jobRuns)
    .where(eq(jobRuns.status, "SUCCEEDED"))
    .groupBy(jobRuns.jobName);
  const lastFailure = await database
    .select({
      jobName: jobRuns.jobName,
      at: sql<Date | null>`max(${jobRuns.finishedAt})`,
    })
    .from(jobRuns)
    .where(eq(jobRuns.status, "DEAD_LETTER"))
    .groupBy(jobRuns.jobName);
  const byJob = new Map<string, JobSummary>();
  const ensure = (jobName: string): JobSummary => {
    const existing = byJob.get(jobName);
    if (existing) return existing;
    const summary: JobSummary = {
      jobName,
      succeeded: 0,
      failed: 0,
      deadLetter: 0,
      running: 0,
      totalAttempts: 0,
      lastSuccessAt: null,
      lastFailureAt: null,
    };
    byJob.set(jobName, summary);
    return summary;
  };
  for (const row of statusCounts) {
    const summary = ensure(row.jobName);
    const count = Number(row.runs);
    summary.totalAttempts += Number(row.attempts);
    if (row.status === "SUCCEEDED") summary.succeeded = count;
    else if (row.status === "FAILED") summary.failed = count;
    else if (row.status === "DEAD_LETTER") summary.deadLetter = count;
    else summary.running = count;
  }
  for (const row of lastSuccess) {
    if (row.at) ensure(row.jobName).lastSuccessAt = row.at.toISOString();
  }
  for (const row of lastFailure) {
    if (row.at) ensure(row.jobName).lastFailureAt = row.at.toISOString();
  }

  const { used } = await readAiDailyUsage(database, day);
  const publicationCounts = await database
    .select({ status: publications.status, count: sql<number>`count(*)` })
    .from(publications)
    .groupBy(publications.status);
  const publicationTotals = { published: 0, failed: 0, pending: 0 };
  for (const row of publicationCounts) {
    const count = Number(row.count);
    if (row.status === "published") publicationTotals.published = count;
    else if (row.status === "failed") publicationTotals.failed = count;
    else publicationTotals.pending += count;
  }

  const candidateCounts = await database
    .select({ status: candidates.status, count: sql<number>`count(*)` })
    .from(candidates)
    .groupBy(candidates.status);
  let candidateTotal = 0;
  let reviewTotal = 0;
  for (const row of candidateCounts) {
    const count = Number(row.count);
    candidateTotal += count;
    if (row.status === "REVIEW") reviewTotal = count;
  }
  const publishedCandidates = await database
    .select({ candidateId: publications.candidateId })
    .from(publications)
    .where(eq(publications.status, "published"))
    .orderBy(desc(publications.publishedAt))
    .limit(1000);
  const publishedSet = new Set(publishedCandidates.map((row) => row.candidateId));
  const approvedCandidates = await database
    .select({ id: candidates.id })
    .from(candidates)
    .where(eq(candidates.status, "APPROVED"))
    .limit(1000);
  const approvedBacklog = approvedCandidates.filter((row) => !publishedSet.has(row.id)).length;

  const [delivered] = await database
    .select({ count: sql<number>`count(*)` })
    .from(publicationEvents)
    .where(eq(publicationEvents.eventType, "DELIVERED"));
  const reconciliation = await listReconciliationItems(database);

  return {
    generatedAt: new Date().toISOString(),
    jobs: [...byJob.values()].sort((left, right) => left.jobName.localeCompare(right.jobName)),
    aiBudget: {
      day,
      limit: options.aiLimit,
      used,
      remaining: Math.max(0, options.aiLimit - used),
    },
    publications: publicationTotals,
    editorial: { candidates: candidateTotal, review: reviewTotal, approvedBacklog },
    analytics: { deliveredEvents: Number(delivered?.count ?? 0) },
    reconciliation: { items: reconciliation.length },
  };
}
