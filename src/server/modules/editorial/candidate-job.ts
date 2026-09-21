import { desc, eq } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { candidates, analyses, scores } from "@/server/db/schema";
import { confidenceAssessments, projects } from "@/server/db/schema";
import type { ConfidenceAssessment } from "@/server/modules/confidence/assess";
import { persistCandidate } from "@/server/modules/editorial/candidate-repository";
import { selectCandidate } from "@/server/modules/editorial/candidate-policy";
import { calculateVibeScore, type VibeScore } from "@/server/modules/scoring/vibe-score";
import { dispatchCandidateForReview } from "@/server/modules/editorial/candidate-repository";
import { createEditorBot } from "@/server/modules/telegram/editor-bot";
import { loadEnvironment, parseEditorIds } from "@/server/config/env";

export async function runConfiguredCandidateSelection(): Promise<void> {
  const database = getDatabase();
  const config = loadEnvironment();
  const projectRows = await database
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.status, "active"));
  for (const project of projectRows) {
    const [scoreRow] = await database
      .select({ id: scores.id, finalScore: scores.finalScore, analysisId: analyses.id })
      .from(scores)
      .leftJoin(analyses, eq(scores.id, analyses.candidateId))
      .where(eq(scores.projectId, project.id))
      .orderBy(desc(scores.calculatedAt))
      .limit(1);
    const [confidenceRow] = await database
      .select({
        value: confidenceAssessments.value,
        level: confidenceAssessments.level,
        confidenceVersion: confidenceAssessments.confidenceVersion,
      })
      .from(confidenceAssessments)
      .where(eq(confidenceAssessments.projectId, project.id))
      .orderBy(desc(confidenceAssessments.calculatedAt))
      .limit(1);
    if (!scoreRow || !confidenceRow) continue;
    // Only dispatch if valid analysis exists
    if (!scoreRow.analysisId) continue;
    const score = scoreFromStored(scoreRow);
    const confidence = confidenceFromStored(confidenceRow);
    const decision = selectCandidate(project.id, score, confidence, `score:${scoreRow.id}`);
    await persistCandidate(project.id, scoreRow.id, decision);

    // Dispatch candidate for review if selected and in CANDIDATE state
    // Dispatch is idempotent: DB constraint ensures at most one transition CANDIDATE→REVIEW
    if (decision.selected) {
      await dispatchCandidateForReview(scoreRow.id, database);
    }
  }
}

function scoreFromStored(row: { finalScore: number; analysisId: string | null }): VibeScore {
  return {
    scoreVersion: 1 as const,
    components: {
      growth: 0,
      vibeRelevance: 0,
      freshness: 0,
      developmentActivity: 0,
      community: 0,
      documentation: 0,
      originality: 0,
    },
    penalties: {
      forkOrMirror: 0,
      prolongedInactivity: 0,
      unclearLicense: 0,
      suspiciousGrowth: 0,
      weakDocumentation: 0,
      duplicateCandidate: 0,
    },
    beforePenalties: 0,
    finalScore: row.finalScore,
  };
}

function confidenceFromStored(row: {
  value: number;
  level: "LOW" | "MEDIUM" | "HIGH";
  confidenceVersion: number;
}): ConfidenceAssessment {
  return {
    confidenceVersion: 1,
    value: row.value,
    level: row.level,
    explanation: { evidence: 0, sources: 0, history: 0, contradictions: 0 },
    inputs: {
      evidenceCount: 0,
      sourceCount: 0,
      snapshotCount: 0,
      hasCurrentSnapshot: true,
      hasRequiredHistory: row.value >= 75,
      contradictionCount: 0,
    },
  };
}
