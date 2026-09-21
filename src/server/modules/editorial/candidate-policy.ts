import { createHash } from "node:crypto";
import type { ConfidenceAssessment } from "@/server/modules/confidence/assess";
import type { VibeScore } from "@/server/modules/scoring/vibe-score";

export const DEFAULT_CANDIDATE_SCORE_THRESHOLD = 60;
export const DEFAULT_CANDIDATE_CONFIDENCE_THRESHOLD = 45;

export type CandidateDecision = {
  selected: boolean;
  dedupeKey: string;
  reason: string;
};

export function selectCandidate(
  projectId: string,
  score: VibeScore,
  confidence: ConfidenceAssessment,
  eventKey: string,
  scoreThreshold = DEFAULT_CANDIDATE_SCORE_THRESHOLD,
  confidenceThreshold = DEFAULT_CANDIDATE_CONFIDENCE_THRESHOLD,
): CandidateDecision {
  const dedupeKey = createHash("sha256").update(`${projectId}:${eventKey}`).digest("hex");
  const selected = score.finalScore >= scoreThreshold && confidence.value >= confidenceThreshold;
  const reason = selected
    ? `VIBE SCORE ${score.finalScore.toFixed(1)} and confidence ${confidence.value} meet candidate thresholds.`
    : `Candidate thresholds not met: score ${score.finalScore.toFixed(1)}/${scoreThreshold}, confidence ${confidence.value}/${confidenceThreshold}.`;
  return { selected, dedupeKey, reason };
}
