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
 */
export async function getOrCreateCandidate(
  database: ReturnType<typeof getDatabase>,
  dedupeKey: string,
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

  // Create new candidate - onConflictDoNothing handles concurrent creation
  const insertResult = await database
    .insert(candidates)
    .values({
      projectId: "",
      scoreId: "",
      reason: "",
      status: "CANDIDATE",
      dedupeKey,
      expiresAt: undefined,
    })
    .onConflictDoNothing({ target: candidates.dedupeKey });

  // After onConflictDoNothing, do a second lookup to get the actual candidate
  const [lookup] = await database
    .select({ id: candidates.id })
    .from(candidates)
    .where(eq(candidates.dedupeKey, dedupeKey))
    .limit(1);

  if (lookup?.id) {
    return { candidateId: lookup.id, created: false };
  }

  // Fallback - generate a UUID if lookup fails
  return { candidateId: crypto.randomUUID(), created: true };
}

/**
 * Persist a new candidate or reuse existing.
 * Returns the candidateId that should be used.
 */
export async function persistCandidate(
  projectId: string,
  scoreId: string,
  decision: CandidateDecision,
  expiresAt?: Date,
) {
  if (!decision.selected) return;
  return getDatabase()
    .insert(candidates)
    .values({
      projectId,
      scoreId,
      reason: decision.reason,
      status: "CANDIDATE",
      dedupeKey: decision.dedupeKey,
      expiresAt,
    })
    .onConflictDoNothing({ target: candidates.dedupeKey })
    .returning({ id: candidates.id });
}

/**
 * Dispatch candidate for review - atomic CANDIDATE→REVIEW transition.
 * Returns whether the transition was successful.
 */
export async function dispatchCandidateForReview(
  candidateId: string,
  database: ReturnType<typeof getDatabase>,
): Promise<{ success: boolean; candidateId: string }> {
  const [updated] = await database
    .update(candidates)
    .set({ status: CANDIDATE_STATUS_REVIEW })
    .where(and(eq(candidates.id, candidateId), eq(candidates.status, "CANDIDATE")))
    .returning();

  if (!updated) {
    const [current] = await database
      .select({ status: candidates.status })
      .from(candidates)
      .where(eq(candidates.id, candidateId));

    if (current?.status === CANDIDATE_STATUS_REVIEW) {
      return { success: false, candidateId };
    }
    return { success: false, candidateId };
  }

  return { success: true, candidateId: updated.id };
}
