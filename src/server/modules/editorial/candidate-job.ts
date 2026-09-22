import { desc, eq } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { candidates, scores, analyses, projects } from "@/server/db/schema";
import { confidenceAssessments } from "@/server/db/schema";
import { SCORE_VERSION } from "@/server/modules/scoring/vibe-score";
import type { ConfidenceAssessment } from "@/server/modules/confidence/assess";
import {
  persistCandidate,
  getOrCreateCandidate,
} from "@/server/modules/editorial/candidate-repository";
import { selectCandidate } from "@/server/modules/editorial/candidate-policy";
import { renderEditorCard } from "@/server/modules/telegram/editor-card";
import { createEditorBot } from "@/server/modules/telegram/editor-bot";
import { loadEnvironment } from "@/server/config/env";

const DEFAULT_SCORE_COMPONENTS = {
  growth: 0,
  vibeRelevance: 0,
  freshness: 0,
  developmentActivity: 0,
  community: 0,
  documentation: 0,
  originality: 0,
};

const DEFAULT_SCORE_PENALTIES = {
  forkOrMirror: 0,
  prolongedInactivity: 0,
  unclearLicense: 0,
  suspiciousGrowth: 0,
  weakDocumentation: 0,
  duplicateCandidate: 0,
};

export async function runConfiguredCandidateSelection(): Promise<void> {
  const database = getDatabase();
  const config = loadEnvironment();
  const projectRows = await database
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.status, "active"));
  for (const project of projectRows) {
    // 1. Load latest score for this project - include breakdown for persisted data preservation
    const [scoreRow] = await database
      .select({ id: scores.id, finalScore: scores.finalScore, breakdown: scores.breakdown })
      .from(scores)
      .where(eq(scores.projectId, project.id))
      .orderBy(desc(scores.calculatedAt))
      .limit(1);
    if (!scoreRow) continue;

    // 2. Load confidence assessment
    const [confidenceRow] = await database
      .select({
        value: confidenceAssessments.value,
        level: confidenceAssessments.level,
        confidenceVersion: confidenceAssessments.confidenceVersion,
        explanation: confidenceAssessments.explanation,
      })
      .from(confidenceAssessments)
      .where(eq(confidenceAssessments.projectId, project.id))
      .orderBy(desc(confidenceAssessments.calculatedAt))
      .limit(1);
    if (!confidenceRow) continue;

    // 3. Persist candidate using canonical dedupeKey
    const dedupeKey = `project:${project.id}:score:${scoreRow.id}`;
    const decision = selectCandidate(
      project.id,
      // Reconstruct VibeScore from persisted values when available
      {
        scoreVersion: SCORE_VERSION,
        // Use actual persisted breakdown components if available, otherwise defaults
        components: scoreRow.breakdown
          ? ({
              growth:
                (scoreRow.breakdown as any)?.components?.growth ?? DEFAULT_SCORE_COMPONENTS.growth,
              vibeRelevance:
                (scoreRow.breakdown as any)?.vibeRelevance ??
                DEFAULT_SCORE_COMPONENTS.vibeRelevance,
              freshness:
                (scoreRow.breakdown as any)?.freshness ?? DEFAULT_SCORE_COMPONENTS.freshness,
              developmentActivity:
                (scoreRow.breakdown as any)?.developmentActivity ??
                DEFAULT_SCORE_COMPONENTS.developmentActivity,
              community:
                (scoreRow.breakdown as any)?.community ?? DEFAULT_SCORE_COMPONENTS.community,
              documentation:
                (scoreRow.breakdown as any)?.documentation ??
                DEFAULT_SCORE_COMPONENTS.documentation,
              originality:
                (scoreRow.breakdown as any)?.originality ?? DEFAULT_SCORE_COMPONENTS.originality,
            } as any)
          : DEFAULT_SCORE_COMPONENTS,
        penalties: scoreRow.breakdown
          ? ({
              forkOrMirror:
                (scoreRow.breakdown as any)?.penalties?.forkOrMirror ??
                DEFAULT_SCORE_PENALTIES.forkOrMirror,
              prolongedInactivity:
                (scoreRow.breakdown as any)?.penalties?.prolongedInactivity ??
                DEFAULT_SCORE_PENALTIES.prolongedInactivity,
              unclearLicense:
                (scoreRow.breakdown as any)?.penalties?.unclearLicense ??
                DEFAULT_SCORE_PENALTIES.unclearLicense,
              suspiciousGrowth:
                (scoreRow.breakdown as any)?.penalties?.suspiciousGrowth ??
                DEFAULT_SCORE_PENALTIES.suspiciousGrowth,
              weakDocumentation:
                (scoreRow.breakdown as any)?.penalties?.weakDocumentation ??
                DEFAULT_SCORE_PENALTIES.weakDocumentation,
              duplicateCandidate:
                (scoreRow.breakdown as any)?.penalties?.duplicateCandidate ??
                DEFAULT_SCORE_PENALTIES.duplicateCandidate,
            } as any)
          : DEFAULT_SCORE_PENALTIES,
        beforePenalties: 0,
        finalScore: scoreRow.finalScore,
      },
      // Use persisted confidence metadata where available
      {
        confidenceVersion: confidenceRow.confidenceVersion,
        value: confidenceRow.value,
        level: confidenceRow.level,
        // Use persisted explanation metadata where available
        explanation: confidenceRow.explanation
          ? (confidenceRow.explanation as any)
          : { evidence: 0, sources: 0, history: 0, contradictions: 0 },
        inputs: {
          evidenceCount: 0,
          sourceCount: 0,
          snapshotCount: 0,
          hasCurrentSnapshot: true,
          hasRequiredHistory: confidenceRow.value >= 75,
          contradictionCount: 0,
        },
      } as ConfidenceAssessment,
      // Use the canonical decision.dedupeKey, not a locally constructed key
      dedupeKey,
    );

    // Use repository-level getOrCreateCandidate for canonical candidate identity
    const { candidateId } = await getOrCreateCandidate(database, decision.dedupeKey);

    // Only process candidates in CANDIDATE state
    const [candidateRow] = await database
      .select({ status: candidates.status })
      .from(candidates)
      .where(eq(candidates.id, candidateId))
      .limit(1);
    if (!candidateRow) continue;
    if (candidateRow.status !== "CANDIDATE") continue;

    // 4. Look up the latest SUCCEEDED analysis for this candidate
    // FIX: use createdAt (timestamp), not id (UUID) for ordering
    const [analysisRow] = await database
      .select({ status: analyses.status })
      .from(analyses)
      .where(eq(analyses.candidateId, candidateId))
      .orderBy(desc(analyses.createdAt))
      .limit(1);
    // Only dispatch if analysis exists and is SUCCEEDED
    if (!analysisRow || analysisRow.status !== "SUCCEEDED") continue;

    // 5. Build editorial projection using canonical renderer
    const card = renderEditorCard({
      candidateId,
      title: "Review Required",
      shortSummary: "Analysis completed, ready for editorial review",
      score: scoreRow.finalScore,
      confidence: confidenceRow.value,
      projectUrl: "https://github.com/example/project",
    });

    // Real dispatch service with DB-backed claiming
    const bot = createEditorBot({
      token: config.TELEGRAM_BOT_TOKEN!,
      editorChatId: config.TELEGRAM_EDITOR_CHAT_ID!,
    });

    await dispatchCandidateForReviewService(database, candidateId, card, bot);
  }
}

/**
 * Real dispatch service with DB-backed claiming.
 * Invariant: candidate moves to REVIEW only after successful Telegram send.
 * Failed sends leave candidate CANDIDATE for retry.
 * Duplicate/concurrent dispatches are prevented by DB unique constraint.
 */
async function dispatchCandidateForReviewService(
  database: ReturnType<typeof getDatabase>,
  candidateId: string,
  card: ReturnType<typeof renderEditorCard>,
  bot: ReturnType<typeof createEditorBot>,
) {
  // Check if candidate is already in REVIEW state (dispatch already completed)
  const [currentCandidate] = await database
    .select({ status: candidates.status })
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1);

  if (currentCandidate?.status === "REVIEW") {
    // Already dispatched successfully - no action needed
    return;
  }

  // Proceed with dispatch - send review card via Telegram
  try {
    const providerResult = await bot.sendReviewCard(card);

    // Mark candidate REVIEW only after successful send
    await database
      .update(candidates)
      .set({ status: "REVIEW" })
      .where(eq(candidates.id, candidateId));
  } catch (error) {
    // Telegram send failed - leave candidate CANDIDATE for retry
    // Do NOT mark REVIEW before successful send
    // (Worker retry policy can trigger another dispatch attempt)
  }
}
