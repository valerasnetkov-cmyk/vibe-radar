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
  // Try to find existing candidate first
  const [existing] = await database
    .select({ id: candidates.id })
    .from(candidates)
    .where(eq(candidates.dedupeKey, dedupeKey))
    .limit(1);

  if (existing && existing.id) {
    return { candidateId: existing.id, created: false };
  }

  // Create new candidate with real UUID foreign keys
  const [newlyCreated] = await database
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

  if (newlyCreated) {
    // Second lookup to get the actual candidate after potential conflict.
    // newlyCreated is only defined when this worker performed the insert.
    const [lookup] = await database
      .select({ id: candidates.id })
      .from(candidates)
      .where(eq(candidates.dedupeKey, dedupeKey))
      .limit(1);

    if (lookup?.id) {
      return { candidateId: lookup.id, created: true };
    }
  }

  // If we get here, neither insert nor lookup returned a valid row
  throw new Error(`Cannot create or find candidate with dedupeKey=${dedupeKey}`);
}
