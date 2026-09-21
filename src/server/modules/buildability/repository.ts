import { getDatabase } from "@/server/db/client";
import { buildabilityAssessments } from "@/server/db/schema";
import type { BuildabilityAssessment } from "@/server/modules/buildability/assess";

export async function persistBuildability(
  projectId: string,
  assessment: BuildabilityAssessment,
  calculatedAt = new Date(),
) {
  return getDatabase()
    .insert(buildabilityAssessments)
    .values({
      projectId,
      assessmentVersion: assessment.assessmentVersion,
      calculatedAt,
      label: assessment.label,
      dimensions: assessment.dimensions,
      constraints: assessment.constraints,
      explanation: assessment.explanation,
    })
    .returning({ id: buildabilityAssessments.id });
}
