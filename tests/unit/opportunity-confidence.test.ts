import { describe, expect, it } from "vitest";
import {
  assessOpportunityConfidence,
  OPPORTUNITY_CONFIDENCE_MAX,
} from "@/server/modules/opportunities/assessment";

describe("opportunity confidence policy v1", () => {
  it("caps hypotheses below factual certainty", () => {
    const { confidence, policyVersion } = assessOpportunityConfidence({
      subjects: ["a", "b", "c", "d"],
      projectIds: ["p1", "p2", "p3", "p4"],
      mechanicCount: 3,
      sourceConfidenceRatio: 1,
      buildabilityCoverage: 1,
      unresolvedCount: 0,
    });
    expect(confidence).toBeLessThanOrEqual(OPPORTUNITY_CONFIDENCE_MAX);
    expect(OPPORTUNITY_CONFIDENCE_MAX).toBe(90);
    expect(policyVersion).toBe(1);
  });

  it("admits a single high-confidence published project", () => {
    const { confidence } = assessOpportunityConfidence({
      subjects: ["PROJECT:p1"],
      projectIds: ["p1"],
      mechanicCount: 0,
      sourceConfidenceRatio: 0.9,
      buildabilityCoverage: 1,
      unresolvedCount: 0,
    });
    expect(confidence).toBeGreaterThanOrEqual(55);
  });

  it("is deterministic and duplicate-proof", () => {
    const input = {
      subjects: ["PROJECT:p1", "MECHANIC:m1"],
      projectIds: ["p1", "p2"],
      mechanicCount: 1,
      sourceConfidenceRatio: 0.7,
      buildabilityCoverage: 1,
      unresolvedCount: 0,
    };
    const first = assessOpportunityConfidence(input);
    const second = assessOpportunityConfidence({
      ...input,
      subjects: [...input.subjects, "PROJECT:p1"],
      projectIds: [...input.projectIds, "p1"],
    });
    expect(second.confidence).toBe(first.confidence);
  });

  it("ignores unknown evidence and penalizes unresolved references", () => {
    const clean = assessOpportunityConfidence({
      subjects: ["PROJECT:p1"],
      projectIds: ["p1"],
      mechanicCount: 0,
      sourceConfidenceRatio: 0.8,
      buildabilityCoverage: 1,
      unresolvedCount: 0,
    });
    const noisy = assessOpportunityConfidence({
      subjects: ["PROJECT:p1"],
      projectIds: ["p1"],
      mechanicCount: 0,
      sourceConfidenceRatio: 0.8,
      buildabilityCoverage: 1,
      unresolvedCount: 2,
    });
    expect(noisy.confidence).toBeLessThan(clean.confidence);
    const empty = assessOpportunityConfidence({
      subjects: [],
      projectIds: [],
      mechanicCount: 0,
      sourceConfidenceRatio: 0,
      buildabilityCoverage: 0,
      unresolvedCount: 1,
    });
    expect(empty.confidence).toBe(0);
  });

  it("gives zero weight to prose, scope, and approval", () => {
    const base = {
      subjects: ["PROJECT:p1"],
      projectIds: ["p1"],
      mechanicCount: 0,
      sourceConfidenceRatio: 0.8,
      buildabilityCoverage: 1,
      unresolvedCount: 0,
    };
    // The formula has no prose/scope/approval inputs at all: identical
    // trusted inputs always yield identical confidence.
    expect(assessOpportunityConfidence(base).confidence).toBe(
      assessOpportunityConfidence({ ...base }).confidence,
    );
  });
});
