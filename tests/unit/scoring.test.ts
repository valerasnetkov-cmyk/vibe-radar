import { describe, expect, it } from "vitest";
import { assessConfidence } from "@/server/modules/confidence/assess";
import { calculateVibeScore, growthComponent } from "@/server/modules/scoring/vibe-score";

describe("VIBE SCORE v1", () => {
  it("calculates a bounded weighted score with explainable penalties", () => {
    const score = calculateVibeScore({
      components: {
        growth: 100,
        vibeRelevance: 80,
        freshness: 70,
        developmentActivity: 60,
        community: 50,
        documentation: 40,
        originality: 30,
      },
      penalties: { forkOrMirror: 10 },
    });
    expect(score.scoreVersion).toBe(1);
    expect(score.beforePenalties).toBe(77.5);
    expect(score.finalScore).toBe(67.5);
    expect(
      calculateVibeScore({
        components: {
          growth: 1000,
          vibeRelevance: -1,
          freshness: 0,
          developmentActivity: 0,
          community: 0,
          documentation: 0,
          originality: 0,
        },
      }).finalScore,
    ).toBeLessThanOrEqual(100);
  });

  it("derives growth component only from available growth windows", () => {
    const growth = {
      twoHours: { percent: 500 },
      oneDay: { percent: null },
      sevenDays: { percent: null },
    } as never;
    expect(growthComponent(growth)).toBe(50);
    expect(
      growthComponent({
        twoHours: { percent: null },
        oneDay: { percent: null },
        sevenDays: { percent: null },
      } as never),
    ).toBe(0);
  });
});

describe("confidence", () => {
  it("separates evidence strength from score and applies contradiction penalty", () => {
    const assessment = assessConfidence({
      evidenceCount: 3,
      sourceCount: 2,
      snapshotCount: 3,
      hasCurrentSnapshot: true,
      hasRequiredHistory: true,
      contradictionCount: 0,
    });
    expect(assessment.value).toBe(76);
    expect(assessment.level).toBe("HIGH");
    expect(
      assessConfidence({
        evidenceCount: 0,
        sourceCount: 0,
        snapshotCount: 0,
        hasCurrentSnapshot: false,
        hasRequiredHistory: false,
        contradictionCount: 2,
      }).level,
    ).toBe("LOW");
  });
});
