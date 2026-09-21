import { getDatabase } from "@/server/db/client";
import { confidenceAssessments, scores } from "@/server/db/schema";
import type { ConfidenceAssessment } from "@/server/modules/confidence/assess";
import type { VibeScore } from "@/server/modules/scoring/vibe-score";

export async function persistScore(projectId: string, score: VibeScore, calculatedAt = new Date()) {
  const database = getDatabase();
  return database
    .insert(scores)
    .values({
      projectId,
      scoreVersion: score.scoreVersion,
      calculatedAt,
      velocityScore: Math.round(score.components.growth),
      noveltyScore: Math.round(score.components.originality),
      crossSourceScore: Math.round(score.components.community),
      relevanceScore: Math.round(score.components.vibeRelevance),
      projectHealthScore: Math.round(score.components.developmentActivity),
      penaltyScore: Math.round(
        Object.values(score.penalties).reduce((total, value) => total + value, 0),
      ),
      finalScore: Math.round(score.finalScore),
      breakdown: {
        components: score.components,
        penalties: score.penalties,
        beforePenalties: score.beforePenalties,
      },
    })
    .returning({ id: scores.id });
}

export async function persistConfidence(
  projectId: string,
  assessment: ConfidenceAssessment,
  calculatedAt = new Date(),
) {
  const database = getDatabase();
  return database
    .insert(confidenceAssessments)
    .values({
      projectId,
      confidenceVersion: assessment.confidenceVersion,
      calculatedAt,
      value: Math.round(assessment.value),
      level: assessment.level,
      evidenceCount: assessment.inputs.evidenceCount,
      contradictionCount: assessment.inputs.contradictionCount,
      explanation: {
        ...assessment.explanation,
        sourceCount: assessment.inputs.sourceCount,
        snapshotCount: assessment.inputs.snapshotCount,
      },
    })
    .returning({ id: confidenceAssessments.id });
}
