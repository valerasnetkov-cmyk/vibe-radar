import { describe, expect, it } from "vitest";
import { isOpportunityPubliclyEligible } from "@/server/modules/opportunities/public-eligibility";

const eligible = {
  status: "PUBLISHED",
  latestReview: "APPROVE" as const,
  confidence: 60,
  resolvedSources: 1,
  buildabilityPresent: true,
  titleValid: true,
  problemValid: true,
  proposedValid: true,
  differentiationValid: true,
  traceableProjects: 1,
};

describe("opportunity public eligibility gate", () => {
  it("accepts a fully eligible reviewed publication", () => {
    expect(isOpportunityPubliclyEligible(eligible)).toBe(true);
  });

  it("rejects PUBLISHED flags without approval and every missing condition", () => {
    expect(isOpportunityPubliclyEligible({ ...eligible, latestReview: null })).toBe(false);
    expect(isOpportunityPubliclyEligible({ ...eligible, latestReview: "REJECT" })).toBe(false);
    expect(isOpportunityPubliclyEligible({ ...eligible, status: "REJECTED" })).toBe(false);
    expect(isOpportunityPubliclyEligible({ ...eligible, confidence: 54 })).toBe(false);
    expect(isOpportunityPubliclyEligible({ ...eligible, resolvedSources: 0 })).toBe(false);
    expect(isOpportunityPubliclyEligible({ ...eligible, buildabilityPresent: false })).toBe(false);
    expect(isOpportunityPubliclyEligible({ ...eligible, traceableProjects: 0 })).toBe(false);
    expect(isOpportunityPubliclyEligible({ ...eligible, titleValid: false })).toBe(false);
    expect(isOpportunityPubliclyEligible({ ...eligible, differentiationValid: false })).toBe(false);
  });

  it("holds the documented 55 confidence boundary", () => {
    expect(isOpportunityPubliclyEligible({ ...eligible, confidence: 55 })).toBe(true);
    expect(isOpportunityPubliclyEligible({ ...eligible, confidence: 54 })).toBe(false);
  });

  it("hides opportunities after a later REJECT", () => {
    expect(isOpportunityPubliclyEligible({ ...eligible, latestReview: "APPROVE" })).toBe(true);
    expect(isOpportunityPubliclyEligible({ ...eligible, latestReview: "REJECT" })).toBe(false);
  });
});
