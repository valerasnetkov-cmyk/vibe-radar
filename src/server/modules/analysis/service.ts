import type { AnalysisOutput } from "@/server/modules/analysis/output";
import { validateAnalysisOutput } from "@/server/modules/analysis/output";
import type { AnalysisProvider } from "@/server/modules/analysis/provider";
import { AnalysisFailedError, runBoundedAnalysis } from "@/server/modules/analysis/provider";
import type { BoundedAnalysisInput } from "@/server/modules/analysis/projection";
import { DailyAnalysisBudget } from "@/server/modules/analysis/daily-budget";

export async function generateValidatedAnalysis(
  provider: AnalysisProvider,
  input: BoundedAnalysisInput,
  timeoutMs = 15000,
  maxAttempts = 1,
  maxOutputChars = 12000,
): Promise<{ output: AnalysisOutput; attempts: number }> {
  const result = await runBoundedAnalysis(provider, input, timeoutMs, maxAttempts);
  if (JSON.stringify(result.output).length > maxOutputChars)
    throw new AnalysisFailedError("INVALID_OUTPUT");
  try {
    return { output: validateAnalysisOutput(result.output), attempts: result.attempts };
  } catch {
    throw new AnalysisFailedError("INVALID_OUTPUT");
  }
}

export async function generateBudgetedAnalysis(
  provider: AnalysisProvider,
  input: BoundedAnalysisInput,
  budget: DailyAnalysisBudget,
  timeoutMs = 15000,
  maxAttempts = 1,
  maxOutputChars = 12000,
) {
  if (!budget.tryConsume()) throw new AnalysisFailedError("BUDGET_EXHAUSTED");
  return generateValidatedAnalysis(provider, input, timeoutMs, maxAttempts, maxOutputChars);
}
