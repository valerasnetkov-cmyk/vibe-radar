import { getDatabase } from "@/server/db/client";
import { analyses } from "@/server/db/schema";
import type { AnalysisOutput } from "@/server/modules/analysis/output";
import { ANALYSIS_VERSION, PROMPT_VERSION } from "@/server/modules/analysis/projection";

export async function persistAnalysis(
  candidateId: string,
  provider: string,
  model: string,
  output: AnalysisOutput | null,
  attempts: number,
  status: "SUCCEEDED" | "ANALYSIS_FAILED",
) {
  return getDatabase()
    .insert(analyses)
    .values({
      candidateId,
      analysisVersion: ANALYSIS_VERSION,
      promptVersion: PROMPT_VERSION,
      provider,
      model,
      output,
      status,
      attempts,
    })
    .returning({ id: analyses.id });
}
