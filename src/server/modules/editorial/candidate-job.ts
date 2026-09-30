import { desc, eq } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import {
  analyses,
  candidates,
  confidenceAssessments,
  projects,
  providerIdentities,
  scores,
} from "@/server/db/schema";
import { analysisOutputSchema } from "@/server/modules/analysis/output";
import { parseStoredConfidenceAssessment } from "@/server/modules/confidence/stored-confidence";
import { dispatchCandidateForReviewService } from "@/server/modules/editorial/dispatch-service";
import { getOrCreateCandidate } from "@/server/modules/editorial/candidate-repository";
import { selectCandidate } from "@/server/modules/editorial/candidate-policy";
import { parseStoredScoreBreakdown } from "@/server/modules/scoring/stored-breakdown";
import { renderEditorCard, type EditorCard } from "@/server/modules/telegram/editor-card";
import { createEditorBot } from "@/server/modules/telegram/editor-bot";
import { loadEnvironment, requireTelegramEditorConfig } from "@/server/config/env";

export type CardProjectionFailureReason =
  | "missing-project-name"
  | "missing-provider-url"
  | "missing-analysis-output"
  | "invalid-analysis-output";

export type CardProjectionResult =
  { ok: true; card: EditorCard } | { ok: false; reason: CardProjectionFailureReason };

/**
 * Build the editor-card projection only from persisted validated data.
 * Never fabricates missing values; returns a deterministic skip reason
 * when required content is unavailable.
 */
export function buildEditorCardProjection(input: {
  candidateId: string;
  projectName: string | null | undefined;
  providerUrl: string | null | undefined;
  analysisOutput: unknown;
  score: number;
  confidence: number;
}): CardProjectionResult {
  const projectName = input.projectName?.trim();
  if (!projectName) return { ok: false, reason: "missing-project-name" };
  const providerUrl = input.providerUrl?.trim();
  if (!providerUrl) return { ok: false, reason: "missing-provider-url" };
  if (input.analysisOutput === null || input.analysisOutput === undefined) {
    return { ok: false, reason: "missing-analysis-output" };
  }
  const parsed = analysisOutputSchema.safeParse(input.analysisOutput);
  if (!parsed.success) return { ok: false, reason: "invalid-analysis-output" };
  return {
    ok: true,
    card: renderEditorCard({
      candidateId: input.candidateId,
      title: projectName,
      shortSummary: parsed.data.summary,
      score: input.score,
      confidence: input.confidence,
      projectUrl: providerUrl,
    }),
  };
}

export async function runConfiguredCandidateSelection(): Promise<void> {
  const database = getDatabase();
  const projectRows = await database
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(eq(projects.status, "active"));
  for (const project of projectRows) {
    const [scoreRow] = await database
      .select({
        id: scores.id,
        finalScore: scores.finalScore,
        breakdown: scores.breakdown,
        scoreVersion: scores.scoreVersion,
      })
      .from(scores)
      .where(eq(scores.projectId, project.id))
      .orderBy(desc(scores.calculatedAt))
      .limit(1);
    if (!scoreRow) continue;

    const [confidenceRow] = await database
      .select({
        value: confidenceAssessments.value,
        level: confidenceAssessments.level,
        confidenceVersion: confidenceAssessments.confidenceVersion,
        explanation: confidenceAssessments.explanation,
        evidenceCount: confidenceAssessments.evidenceCount,
        contradictionCount: confidenceAssessments.contradictionCount,
      })
      .from(confidenceAssessments)
      .where(eq(confidenceAssessments.projectId, project.id))
      .orderBy(desc(confidenceAssessments.calculatedAt))
      .limit(1);
    if (!confidenceRow) continue;

    const eventKey = `project:${project.id}:score:${scoreRow.id}`;
    const decision = selectCandidate(
      project.id,
      parseStoredScoreBreakdown(scoreRow.breakdown, scoreRow.scoreVersion, scoreRow.finalScore),
      parseStoredConfidenceAssessment(confidenceRow),
      eventKey,
    );

    // Rejected threshold decisions must not create candidates.
    if (!decision.selected) continue;

    const { candidateId } = await getOrCreateCandidate(
      database,
      project.id,
      scoreRow.id,
      decision.reason,
      decision.dedupeKey,
    );

    const [candidateRow] = await database
      .select({ status: candidates.status })
      .from(candidates)
      .where(eq(candidates.id, candidateId))
      .limit(1);
    if (!candidateRow) continue;
    if (candidateRow.status !== "CANDIDATE") continue;

    const [analysisRow] = await database
      .select({ status: analyses.status, output: analyses.output })
      .from(analyses)
      .where(eq(analyses.candidateId, candidateId))
      .orderBy(desc(analyses.createdAt))
      .limit(1);
    if (!analysisRow || analysisRow.status !== "SUCCEEDED") continue;

    const [identityRow] = await database
      .select({ providerUrl: providerIdentities.providerUrl })
      .from(providerIdentities)
      .where(eq(providerIdentities.projectId, project.id))
      .orderBy(desc(providerIdentities.lastSeenAt))
      .limit(1);

    const projection = buildEditorCardProjection({
      candidateId,
      projectName: project.name,
      providerUrl: identityRow?.providerUrl,
      analysisOutput: analysisRow.output,
      score: scoreRow.finalScore,
      confidence: confidenceRow.value,
    });
    if (!projection.ok) continue;

    // Telegram settings resolve only when a dispatch is actually imminent,
    // so selection without dispatchable candidates never requires them.
    const telegram = requireTelegramEditorConfig(loadEnvironment());
    const bot = createEditorBot({
      token: telegram.botToken,
      editorChatId: telegram.editorChatId,
      timeoutMs: telegram.timeoutMs,
    });

    await dispatchCandidateForReviewService(database, candidateId, projection.card, bot);
  }
}
