import { getDatabase } from "@/server/db/client";
import { candidates } from "@/server/db/schema";
import type { CandidateDecision } from "@/server/modules/editorial/candidate-policy";

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
