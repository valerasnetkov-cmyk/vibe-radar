import { describe, expect, it } from "vitest";
import {
  isMechanicPubliclyEligible,
  type EligibilityInput,
} from "@/server/modules/mechanics/public-read-model";

const eligible: EligibilityInput = {
  status: "ACTIVE",
  latestReview: "APPROVE",
  independentSourceCount: 2,
  confidence: 55,
  hasTraceableEvidence: true,
  nameValid: true,
  descriptionValid: true,
};

describe("mechanic public eligibility gate", () => {
  it("requires every condition at once", () => {
    expect(isMechanicPubliclyEligible(eligible)).toBe(true);
  });

  it("rejects ACTIVE alone and every single missing condition", () => {
    const cases: Array<[Partial<EligibilityInput>, string]> = [
      [{ latestReview: null }, "review alone"],
      [{ latestReview: "REJECT" }, "rejected review"],
      [{ independentSourceCount: 1 }, "single source"],
      [{ confidence: 49 }, "low confidence"],
      [{ hasTraceableEvidence: false }, "untraceable"],
      [{ nameValid: false }, "invalid name"],
      [{ descriptionValid: false }, "invalid description"],
      [{ status: "ARCHIVED" }, "archived"],
    ];
    for (const [override, label] of cases) {
      expect(isMechanicPubliclyEligible({ ...eligible, ...override }), label).toBe(false);
    }
  });

  it("hides mechanics after a later REJECT overrides an older APPROVE", () => {
    expect(isMechanicPubliclyEligible({ ...eligible, latestReview: "APPROVE" })).toBe(true);
    expect(isMechanicPubliclyEligible({ ...eligible, latestReview: "REJECT" })).toBe(false);
  });

  it("holds the documented v1 thresholds", () => {
    expect(isMechanicPubliclyEligible({ ...eligible, confidence: 50 })).toBe(true);
    expect(isMechanicPubliclyEligible({ ...eligible, confidence: 49 })).toBe(false);
    expect(
      isMechanicPubliclyEligible({ ...eligible, independentSourceCount: 2, confidence: 50 }),
    ).toBe(true);
  });
});
