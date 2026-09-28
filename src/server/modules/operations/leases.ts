import { and, eq, lt } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { jobLeases } from "@/server/db/schema";
import { assertKnownJobName } from "@/server/modules/operations/registry";

/**
 * PostgreSQL-backed singleton lease. Exactly one worker holds an unexpired
 * lease per job: the INSERT elects the first owner, and concurrent losers
 * can only win a conditional UPDATE after expiry. Expiry recovers crashed
 * workers without permanent locks. Owner ids are random runtime identities,
 * never secret credentials.
 */
export async function claimJobLease(
  database: ReturnType<typeof getDatabase>,
  jobName: string,
  ownerId: string,
  leaseMs: number,
  now = new Date(),
): Promise<boolean> {
  assertKnownJobName(jobName);
  if (!ownerId || leaseMs <= 0) return false;
  const lockedUntil = new Date(now.getTime() + leaseMs);
  const [inserted] = await database
    .insert(jobLeases)
    .values({ jobName, ownerId, lockedUntil, updatedAt: now })
    .onConflictDoNothing({ target: jobLeases.jobName })
    .returning({ jobName: jobLeases.jobName });
  if (inserted) return true;
  const [claimed] = await database
    .update(jobLeases)
    .set({ ownerId, lockedUntil, updatedAt: now })
    .where(and(eq(jobLeases.jobName, jobName), lt(jobLeases.lockedUntil, now)))
    .returning({ jobName: jobLeases.jobName });
  return Boolean(claimed);
}

export async function releaseJobLease(
  database: ReturnType<typeof getDatabase>,
  jobName: string,
  ownerId: string,
): Promise<void> {
  assertKnownJobName(jobName);
  await database
    .delete(jobLeases)
    .where(and(eq(jobLeases.jobName, jobName), eq(jobLeases.ownerId, ownerId)));
}
