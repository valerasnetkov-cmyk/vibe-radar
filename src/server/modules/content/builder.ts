import { desc, eq } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import {
  analyses,
  buildabilityAssessments,
  candidates,
  confidenceAssessments,
  editorialDecisions,
  projects,
  providerIdentities,
  scores,
} from "@/server/db/schema";
import { analysisOutputSchema } from "@/server/modules/analysis/output";
import {
  computeContentVersion,
  contentModelSchema,
  type ContentModel,
} from "@/server/modules/content/model";

export type ContentBuildFailureReason =
  | "missing_project"
  | "missing_provider_url"
  | "missing_analysis"
  | "invalid_analysis"
  | "missing_score"
  | "missing_confidence"
  | "not_approved"
  | "missing_approval_decision"
  | "invalid_content";

export type ContentBuildResult =
  | { ok: true; model: ContentModel; approvalDecisionId: string; analysisId: string }
  | { ok: false; reason: ContentBuildFailureReason };

/**
 * Server-side ContentModel builder for approved candidates.
 *
 * Loads only persisted, validated records; never calls an LLM and never
 * fabricates missing values. Missing mandatory content yields a
 * deterministic non-publishable reason.
 *
 * Stage 08 format rule: first-time approved publications render as FRESH.
 * Other formats arrive with future curation; the version hash covers the
 * format so a future change re-versions the content.
 */
export async function buildContentModelForApprovedCandidate(
  database: ReturnType<typeof getDatabase>,
  candidateId: string,
): Promise<ContentBuildResult> {
  const [candidate] = await database
    .select({
      projectId: candidates.projectId,
      scoreId: candidates.scoreId,
      status: candidates.status,
    })
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1);
  if (!candidate || candidate.status !== "APPROVED") return { ok: false, reason: "not_approved" };

  const recentDecisions = await database
    .select({ id: editorialDecisions.id, decision: editorialDecisions.decision })
    .from(editorialDecisions)
    .where(eq(editorialDecisions.candidateId, candidateId))
    .orderBy(desc(editorialDecisions.decidedAt))
    .limit(5);
  const approval = recentDecisions.find((row) => row.decision === "APPROVE");
  if (!approval) return { ok: false, reason: "missing_approval_decision" };

  const [project] = await database
    .select({ name: projects.name, slug: projects.slug })
    .from(projects)
    .where(eq(projects.id, candidate.projectId))
    .limit(1);
  if (!project) return { ok: false, reason: "missing_project" };

  const [identity] = await database
    .select({ providerUrl: providerIdentities.providerUrl })
    .from(providerIdentities)
    .where(eq(providerIdentities.projectId, candidate.projectId))
    .orderBy(desc(providerIdentities.lastSeenAt))
    .limit(1);
  const providerUrl = identity?.providerUrl?.trim();
  if (!providerUrl) return { ok: false, reason: "missing_provider_url" };

  const [score] = await database
    .select({ id: scores.id, finalScore: scores.finalScore, scoreVersion: scores.scoreVersion })
    .from(scores)
    .where(eq(scores.id, candidate.scoreId))
    .limit(1);
  if (!score) return { ok: false, reason: "missing_score" };

  const [confidence] = await database
    .select({
      value: confidenceAssessments.value,
      level: confidenceAssessments.level,
      confidenceVersion: confidenceAssessments.confidenceVersion,
    })
    .from(confidenceAssessments)
    .where(eq(confidenceAssessments.projectId, candidate.projectId))
    .orderBy(desc(confidenceAssessments.calculatedAt))
    .limit(1);
  if (!confidence) return { ok: false, reason: "missing_confidence" };

  const analysisRows = await database
    .select({ id: analyses.id, status: analyses.status, output: analyses.output })
    .from(analyses)
    .where(eq(analyses.candidateId, candidateId))
    .orderBy(desc(analyses.createdAt))
    .limit(5);
  const succeeded = analysisRows.find((row) => row.status === "SUCCEEDED");
  if (!succeeded) return { ok: false, reason: "missing_analysis" };
  if (succeeded.output === null || succeeded.output === undefined) {
    return { ok: false, reason: "missing_analysis" };
  }
  const parsedOutput = analysisOutputSchema.safeParse(succeeded.output);
  if (!parsedOutput.success) return { ok: false, reason: "invalid_analysis" };
  const analysis = parsedOutput.data;

  const [buildability] = await database
    .select({
      label: buildabilityAssessments.label,
      explanation: buildabilityAssessments.explanation,
    })
    .from(buildabilityAssessments)
    .where(eq(buildabilityAssessments.projectId, candidate.projectId))
    .orderBy(desc(buildabilityAssessments.calculatedAt))
    .limit(1);

  const title = project.name.trim().slice(0, 200);
  const parsed = contentModelSchema.safeParse({
    candidateId,
    contentVersion: computeContentVersion({
      candidateId,
      analysisId: succeeded.id,
      scoreId: score.id,
      scoreVersion: score.scoreVersion,
      confidenceVersion: confidence.confidenceVersion,
    }),
    title,
    format: "FRESH",
    shortSummary: analysis.summary,
    whyNow: analysis.why_interesting,
    keyPoints: analysis.use_cases,
    audience: analysis.audience,
    limitations: analysis.limitations,
    projectSlug: project.slug,
    projectUrl: providerUrl,
    score: score.finalScore,
    scoreVersion: score.scoreVersion,
    confidence: confidence.value,
    confidenceLevel: confidence.level,
    sources: [{ label: title.slice(0, 200), url: providerUrl }],
    buildability: buildability
      ? { label: buildability.label, explanation: buildability.explanation.slice(0, 500) }
      : undefined,
    outscanRelevance: analysis.outscan_relevance,
  });
  if (!parsed.success) return { ok: false, reason: "invalid_content" };
  return {
    ok: true,
    model: parsed.data,
    approvalDecisionId: approval.id,
    analysisId: succeeded.id,
  };
}
