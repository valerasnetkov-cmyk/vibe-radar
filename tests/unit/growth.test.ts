import { describe, expect, it } from "vitest";
import { calculateGrowth } from "@/server/modules/growth/calculate";

const at = (hours: number) => new Date(Date.UTC(2026, 0, 8, hours));

describe("growth engine", () => {
  it("calculates absolute and percentage growth for available windows", () => {
    const result = calculateGrowth([
      { observedAt: at(0), stars: 100 },
      { observedAt: at(2), stars: 150 },
      { observedAt: at(24), stars: 300 },
      { observedAt: at(168), stars: 500 },
    ]);
    expect(result.twoHours.delta).toBe(200);
    expect(result.twoHours.percent).toBeCloseTo(66.6667);
    expect(result.oneDay.delta).toBe(200);
    expect(result.sevenDays.delta).toBe(400);
  });

  it("returns insufficient data instead of inventing zero growth", () => {
    const result = calculateGrowth([{ observedAt: at(2), stars: 150 }]);
    expect(result.twoHours.status).toBe("INSUFFICIENT_DATA");
    expect(result.twoHours.delta).toBeNull();
    expect(result.acceleration).toBeNull();
  });

  it("calculates acceleration as short-window rate minus daily rate", () => {
    const result = calculateGrowth([
      { observedAt: at(0), stars: 100 },
      { observedAt: at(2), stars: 150 },
      { observedAt: at(24), stars: 300 },
    ]);
    expect(result.acceleration).toBeCloseTo(75 - 200 / 24);
  });

  it("keeps zero baselines explicit", () => {
    const result = calculateGrowth([
      { observedAt: at(0), stars: 0 },
      { observedAt: at(2), stars: 5 },
    ]);
    expect(result.twoHours.status).toBe("ZERO_BASELINE");
    expect(result.twoHours.percent).toBeNull();
  });
});
