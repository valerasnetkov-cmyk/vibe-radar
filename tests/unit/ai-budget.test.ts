import { describe, expect, it, vi } from "vitest";
import type { getDatabase } from "@/server/db/client";
import { utcDayString } from "@/server/modules/analysis/budget-store";
import { generateDurableBudgetedAnalysis } from "@/server/modules/analysis/service";
import { AnalysisFailedError } from "@/server/modules/analysis/provider";

type FakeDatabase = ReturnType<typeof getDatabase>;

function untouchableDatabase(): FakeDatabase {
  const fail = () => {
    throw new Error("database must not be touched on this path");
  };
  return { insert: fail, update: fail, select: fail } as unknown as FakeDatabase;
}

describe("durable AI budget enforcement", () => {
  it("uses UTC calendar days", () => {
    expect(utcDayString(new Date("2026-09-18T23:59:59Z"))).toBe("2026-09-18");
    expect(utcDayString(new Date("2026-09-19T00:00:00Z"))).toBe("2026-09-19");
  });

  it("blocks provider work on a zero limit without touching the provider or database", async () => {
    const provider = { provider: "test", model: "test", generate: vi.fn(async () => ({})) };
    try {
      await generateDurableBudgetedAnalysis(provider, {} as never, {
        limit: 0,
        database: untouchableDatabase(),
      });
      expect.unreachable("exhausted budget must throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AnalysisFailedError);
      expect((error as AnalysisFailedError).reason).toBe("BUDGET_EXHAUSTED");
    }
    expect(provider.generate).not.toHaveBeenCalled();
  });
});
