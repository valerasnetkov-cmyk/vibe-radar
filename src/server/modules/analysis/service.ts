import { getDatabase } from "@/server/db/client";
import type { AnalysisOutput } from "@/server/modules/analysis/output";
import { validateAnalysisOutput } from "@/server/modules/analysis/output";
import type { AnalysisProvider } from "@/server/modules/analysis/provider";
import { AnalysisFailedError, runBoundedAnalysis } from "@/server/modules/analysis/provider";
import type { BoundedAnalysisInput } from "@/server/modules/analysis/projection";
import { consumeAiDailyBudget } from "@/server/modules/analysis/budget-store";
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

/**
 * Production AI budget enforcement: consumes one durable daily unit from
 * PostgreSQL before any provider work. The provider is never called after
 * exhaustion, across restarts and across concurrent workers.
 */
export async function generateDurableBudgetedAnalysis(
  provider: AnalysisProvider,
  input: BoundedAnalysisInput,
  options: {
    limit: number;
    database?: ReturnType<typeof getDatabase>;
    timeoutMs?: number;
    maxAttempts?: number;
    maxOutputChars?: number;
  },
) {
  const database = options.database ?? getDatabase();
  if (!(await consumeAiDailyBudget(database, options.limit))) {
    throw new AnalysisFailedError("BUDGET_EXHAUSTED");
  }
  return generateValidatedAnalysis(
    provider,
    input,
    options.timeoutMs ?? 15000,
    options.maxAttempts ?? 1,
    options.maxOutputChars ?? 12000,
  );
}
