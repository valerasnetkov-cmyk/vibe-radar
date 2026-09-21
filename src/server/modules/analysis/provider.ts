import type { BoundedAnalysisInput } from "@/server/modules/analysis/projection";

export type AnalysisProvider = {
  provider: string;
  model: string;
  generate(input: BoundedAnalysisInput): Promise<unknown>;
};

export class AnalysisFailedError extends Error {
  constructor(
    readonly reason: "TIMEOUT" | "PROVIDER_ERROR" | "INVALID_OUTPUT" | "BUDGET_EXHAUSTED",
  ) {
    super("Analysis failed");
    this.name = "AnalysisFailedError";
  }
}

export async function runBoundedAnalysis(
  provider: AnalysisProvider,
  input: BoundedAnalysisInput,
  timeoutMs = 15000,
  maxAttempts = 1,
) {
  for (let attempt = 0; attempt <= maxAttempts; attempt += 1) {
    try {
      const output = await Promise.race([
        provider.generate(input),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new AnalysisFailedError("TIMEOUT")), timeoutMs),
        ),
      ]);
      return { output, attempts: attempt + 1 };
    } catch (error) {
      if (attempt === maxAttempts) {
        if (error instanceof AnalysisFailedError) throw error;
        throw new AnalysisFailedError("PROVIDER_ERROR");
      }
    }
  }
  throw new AnalysisFailedError("PROVIDER_ERROR");
}
