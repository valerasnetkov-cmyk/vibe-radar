import { describe, expect, it } from "vitest";
import { assessConfidence } from "@/server/modules/confidence/assess";
import { selectCandidate } from "@/server/modules/editorial/candidate-policy";
import { calculateVibeScore } from "@/server/modules/scoring/vibe-score";

const score = calculateVibeScore({
  components: {
    growth: 100,
    vibeRelevance: 100,
    freshness: 100,
    developmentActivity: 100,
    community: 100,
    documentation: 100,
    originality: 100,
  },
});
const confidence = assessConfidence({
  evidenceCount: 3,
  sourceCount: 2,
  snapshotCount: 3,
  hasCurrentSnapshot: true,
  hasRequiredHistory: true,
  contradictionCount: 0,
});

describe("candidate policy", () => {
  it("selects only records meeting score and confidence thresholds", () => {
    const selected = selectCandidate("project-1", score, confidence, "growth:2026-01-01");
    expect(selected.selected).toBe(true);
    expect(selected.dedupeKey).toHaveLength(64);
    expect(selectCandidate("project-1", score, confidence, "growth:2026-01-01").dedupeKey).toBe(
      selected.dedupeKey,
    );
  });

  it("does not select low-confidence records", () => {
    const lowConfidence = assessConfidence({
      evidenceCount: 1,
      sourceCount: 0,
      snapshotCount: 0,
      hasCurrentSnapshot: false,
      hasRequiredHistory: false,
      contradictionCount: 0,
    });
    expect(selectCandidate("project-1", score, lowConfidence, "growth:2026-01-01").selected).toBe(
      false,
    );
  });
});
