import { and, eq } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { candidates } from "@/server/db/schema";
import type { CandidateDecision } from "@/server/modules/editorial/candidate-policy";

export const CANDIDATE_STATUS_REVIEW = "REVIEW";

export type GetOrCreateCandidateResult = {
  candidateId: string;
  created: boolean;
};

/**
 * Get existing candidate by dedupeKey, or create a new one.
 * Uses onConflictDoNothing + second lookup for reliability.
 * Receives all required data - no empty strings for UUID columns.
 */
export async function getOrCreateCandidate(
  database: ReturnType<typeof getDatabase>,
  projectId: string,
  scoreId: string,
  reason: string,
  dedupeKey: string,
  expiresAt?: Date,
): Promise<GetOrCreateCandidateResult> {
  // a. Fast path: reuse the existing row when another worker won earlier.
  const [existing] = await database
    .select({ id: candidates.id })
    .from(candidates)
    .where(eq(candidates.dedupeKey, dedupeKey))
    .limit(1);

  if (existing && existing.id) {
    return { candidateId: existing.id, created: false };
  }

  // b. Insert with real UUID foreign keys; concurrent workers race here and
  // only one INSERT returns a row thanks to ON CONFLICT DO NOTHING.
  const [inserted] = await database
    .insert(candidates)
    .values({
      projectId,
      scoreId,
      reason,
      status: "CANDIDATE",
      dedupeKey,
      expiresAt,
    })
    .onConflictDoNothing({ target: candidates.dedupeKey })
    .returning({ id: candidates.id });

  // c. This worker won the race: return the inserted id directly.
  if (inserted && inserted.id) {
    return { candidateId: inserted.id, created: true };
  }

  // d. Lost the race: re-read the row the winning worker inserted.
  const [reread] = await database
    .select({ id: candidates.id })
    .from(candidates)
    .where(eq(candidates.dedupeKey, dedupeKey))
    .limit(1);

  // e. Return the winner's row.
  if (reread && reread.id) {
    return { candidateId: reread.id, created: false };
  }

  // f. Neither insert nor lookup produced a row: fail loudly.
  // Never generate an artificial candidate ID.
  throw new Error(`Cannot create or find candidate with dedupeKey=${dedupeKey}`);
}
