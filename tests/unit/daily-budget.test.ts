import { describe, expect, it } from "vitest";
import { DailyAnalysisBudget } from "@/server/modules/analysis/daily-budget";

describe("daily analysis budget", () => {
  it("caps usage and resets at the next UTC day", () => {
    const budget = new DailyAnalysisBudget(2, new Date("2026-09-18T23:59:00Z"));
    expect(budget.tryConsume()).toBe(true);
    expect(budget.tryConsume()).toBe(true);
    expect(budget.tryConsume()).toBe(false);
    expect(budget.remaining(new Date("2026-09-19T00:00:00Z"))).toBe(2);
  });

  it("rejects invalid consumption amounts", () => {
    const budget = new DailyAnalysisBudget(2);
    expect(budget.tryConsume(0)).toBe(false);
    expect(budget.tryConsume(1.5)).toBe(false);
  });
});
