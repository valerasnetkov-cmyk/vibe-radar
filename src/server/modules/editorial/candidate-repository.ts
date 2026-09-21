import { and, eq } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { candidates } from "@/server/db/schema";
import type { CandidateDecision } from "@/server/modules/editorial/candidate-policy";

export const CANDIDATE_STATUS_REVIEW = "REVIEW";

export async function persistCandidate(
  projectId: string,
  scoreId: string,
  decision: CandidateDecision,
  expiresAt?: Date,
) {
  if (!decision.selected) return null;
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

export type DispatchResult =
  | { success: true; candidateId: string }
  | { success: false; reason: "already_reviewed" | "not_candidate_status" | "error" };

export async function dispatchCandidateForReview(
  candidateId: string,
  database: ReturnType<typeof getDatabase>,
): Promise<DispatchResult> {
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
      return { success: false, reason: "already_reviewed" };
    }
    return { success: false, reason: "not_candidate_status" };
  }

  return { success: true, candidateId: updated.id };
}
