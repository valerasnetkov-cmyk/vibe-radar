import { asc, eq } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { candidates } from "@/server/db/schema";
import { publishApprovedCandidate } from "@/server/modules/publishing/service";

const PUBLICATION_BATCH_LIMIT = 20;

/**
 * Minimum callable Stage 08 publication job: processes approved
 * candidates through the canonical identity-based publish boundary.
 * No scheduling policy lives here; Stage 09 owns cadence, retries,
 * dead-letter handling, and reconciliation automation.
 */
export async function runConfiguredPublication(): Promise<void> {
  const database = getDatabase();
  const approved = await database
    .select({ id: candidates.id })
    .from(candidates)
    .where(eq(candidates.status, "APPROVED"))
    .orderBy(asc(candidates.createdAt))
    .limit(PUBLICATION_BATCH_LIMIT);
  for (const row of approved) {
    try {
      await publishApprovedCandidate(row.id, { database });
    } catch (error) {
      console.warn(
        `publication job skipped candidate ${row.id}: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    }
  }
}
