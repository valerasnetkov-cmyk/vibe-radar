import { desc, eq } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { candidates, scores, analyses } from "@/server/db/schema";
import { confidenceAssessments, projects } from "@/server/db/schema";
import { SCORE_VERSION } from "@/server/modules/scoring/vibe-score";
import type { ConfidenceAssessment } from "@/server/modules/confidence/assess";
import { persistCandidate } from "@/server/modules/editorial/candidate-repository";
import { selectCandidate } from "@/server/modules/editorial/candidate-policy";
import { dispatchCandidateForReview } from "@/server/modules/editorial/candidate-repository";
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
    // 1. Load latest score for this project
    const [scoreRow] = await database
      .select({ id: scores.id, finalScore: scores.finalScore })
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
      })
      .from(confidenceAssessments)
      .where(eq(confidenceAssessments.projectId, project.id))
      .orderBy(desc(confidenceAssessments.calculatedAt))
      .limit(1);
    if (!confidenceRow) continue;

    // 3. Persist candidate (creates or reuses via dedupeKey)
    const dedupeKey = `project:${project.id}:score:${scoreRow.id}`;
    const decision = selectCandidate(
      project.id,
      {
        scoreVersion: SCORE_VERSION,
        components: DEFAULT_SCORE_COMPONENTS,
        penalties: DEFAULT_SCORE_PENALTIES,
        beforePenalties: 0,
        finalScore: scoreRow.finalScore,
      },
      {
        confidenceVersion: 1,
        value: confidenceRow.value,
        level: confidenceRow.level,
        explanation: { evidence: 0, sources: 0, history: 0, contradictions: 0 },
        inputs: {
          evidenceCount: 0,
          sourceCount: 0,
          snapshotCount: 0,
          hasCurrentSnapshot: true,
          hasRequiredHistory: confidenceRow.value >= 75,
          contradictionCount: 0,
        },
      } as ConfidenceAssessment,
      dedupeKey,
    );
    await persistCandidate(project.id, scoreRow.id, decision);

    // 4. Get the real candidate ID (may be new or existing)
    const [candidateRow] = await database
      .select({ id: candidates.id, status: candidates.status })
      .from(candidates)
      .where(eq(candidates.dedupeKey, dedupeKey))
      .limit(1);
    if (!candidateRow) continue;
    const candidateId = candidateRow.id;

    // Only process candidates in CANDIDATE state
    if (candidateRow.status !== "CANDIDATE") continue;

    // 5. Look up the latest analysis for this candidate
    const [analysisRow] = await database
      .select({ status: analyses.status })
      .from(analyses)
      .where(eq(analyses.candidateId, candidateId))
      .orderBy(desc(analyses.id))
      .limit(1);
    // Only dispatch if analysis exists and is SUCCEEDED
    if (!analysisRow || analysisRow.status !== "SUCCEEDED") continue;

    // 6. Dispatch candidate for review (idempotent CANDIDATE→REVIEW transition)
    await dispatchCandidateForReview(candidateId, database);
  }
}
