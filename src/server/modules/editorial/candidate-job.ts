import { desc, eq } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { confidenceAssessments, projects, scores } from "@/server/db/schema";
import type { ConfidenceAssessment } from "@/server/modules/confidence/assess";
import { persistCandidate } from "@/server/modules/editorial/candidate-repository";
import { selectCandidate } from "@/server/modules/editorial/candidate-policy";
import { calculateVibeScore, type VibeScore } from "@/server/modules/scoring/vibe-score";

export async function runConfiguredCandidateSelection(): Promise<void> {
  const database = getDatabase();
  const projectRows = await database
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.status, "active"));
  for (const project of projectRows) {
    const [scoreRow] = await database
      .select({
        id: scores.id,
        finalScore: scores.finalScore,
        scoreVersion: scores.scoreVersion,
        breakdown: scores.breakdown,
      })
      .from(scores)
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
    const score = scoreFromStored(scoreRow);
    const confidence = confidenceFromStored(confidenceRow);
    const decision = selectCandidate(project.id, score, confidence, `score:${scoreRow.id}`);
    await persistCandidate(project.id, scoreRow.id, decision);
  }
}

function scoreFromStored(row: {
  finalScore: number;
  scoreVersion: number;
  breakdown: Record<string, unknown>;
}): VibeScore {
  const breakdown = row.breakdown as {
    components?: Record<string, number>;
    penalties?: Record<string, number>;
    beforePenalties?: number;
  };
  const components = breakdown.components ?? {
    growth: 0,
    vibeRelevance: 0,
    freshness: 0,
    developmentActivity: 0,
    community: 0,
    documentation: 0,
    originality: 0,
  };
  const penalties = breakdown.penalties ?? {
    forkOrMirror: 0,
    prolongedInactivity: 0,
    unclearLicense: 0,
    suspiciousGrowth: 0,
    weakDocumentation: 0,
    duplicateCandidate: 0,
  };
  return {
    scoreVersion: row.scoreVersion as 1,
    components: components as VibeScore["components"],
    penalties: penalties as VibeScore["penalties"],
    beforePenalties: breakdown.beforePenalties ?? row.finalScore,
    finalScore: row.finalScore,
  };
}

function confidenceFromStored(row: {
  value: number;
  level: "LOW" | "MEDIUM" | "HIGH";
  confidenceVersion: number;
}): ConfidenceAssessment {
  return {
    confidenceVersion: row.confidenceVersion as 1,
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
