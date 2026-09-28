import { desc, eq } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { buildabilityAssessments } from "@/server/db/schema";
import type { BuildabilityLabel } from "@/server/modules/buildability/assess";

export const BUILDABILITY_RANK: Record<BuildabilityLabel, number> = {
  SOLO_MVP: 0,
  SMALL_TEAM: 1,
  TEAM_REQUIRED: 2,
};

export type OpportunityBuildability =
  | { ok: true; assessmentId: string; label: BuildabilityLabel }
  | { ok: false; reason: "missing_buildability" };

/**
 * Server-derived buildability: loads the latest persisted assessment per
 * trusted source project and keeps the most demanding label, anchored to
 * the assessment it came from. The id and label can never disagree and no
 * caller input participates. With zero trusted assessments the opportunity
 * is deterministically not publicly eligible.
 *
 * This is a source-derived feasibility prior, not a guarantee that the
 * proposed product itself has been fully engineered.
 */
export async function resolveOpportunityBuildability(
  database: ReturnType<typeof getDatabase>,
  projectIds: readonly string[],
): Promise<OpportunityBuildability> {
  const uniqueIds = [...new Set(projectIds)];
  let anchor: { assessmentId: string; label: BuildabilityLabel } | null = null;
  for (const projectId of uniqueIds) {
    const [assessment] = await database
      .select({ id: buildabilityAssessments.id, label: buildabilityAssessments.label })
      .from(buildabilityAssessments)
      .where(eq(buildabilityAssessments.projectId, projectId))
      .orderBy(desc(buildabilityAssessments.calculatedAt))
      .limit(1);
    if (!assessment) continue;
    if (!anchor || BUILDABILITY_RANK[assessment.label] > BUILDABILITY_RANK[anchor.label]) {
      anchor = { assessmentId: assessment.id, label: assessment.label };
    }
  }
  if (!anchor) return { ok: false, reason: "missing_buildability" };
  return { ok: true, ...anchor };
}
