import { describe, expect, it } from "vitest";
import {
  canonicalOpportunityKey,
  normalizeOpportunityText,
  opportunityEvidenceKey,
} from "@/server/modules/opportunities/identity";

describe("opportunity canonical identity", () => {
  it("normalizes NFKC, whitespace, and case deterministically", () => {
    expect(normalizeOpportunityText("  Approval   Gateway ")).toBe("approval gateway");
    expect(normalizeOpportunityText("APPROVAL GATEWAY")).toBe("approval gateway");
    expect(normalizeOpportunityText("Approval\tGateway\n")).toBe("approval gateway");
  });

  it("is stable across retries", () => {
    const input = {
      title: "Approval Gateway",
      proposedProduct: "A focused approval product",
      targetUser: "Small teams",
      marketScope: "GLOBAL",
      subjectKeys: ["PROJECT:aaa", "MECHANIC:bbb"],
    };
    expect(canonicalOpportunityKey(input)).toBe(canonicalOpportunityKey({ ...input }));
    expect(canonicalOpportunityKey(input)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes for genuinely different trusted subjects", () => {
    const base = {
      title: "Approval Gateway",
      proposedProduct: "A focused approval product",
      targetUser: "Small teams",
      marketScope: "GLOBAL",
      subjectKeys: ["PROJECT:aaa"],
    };
    expect(canonicalOpportunityKey(base)).not.toBe(
      canonicalOpportunityKey({ ...base, subjectKeys: ["PROJECT:bbb"] }),
    );
    expect(canonicalOpportunityKey(base)).not.toBe(
      canonicalOpportunityKey({ ...base, subjectKeys: ["PROJECT:aaa", "PROJECT:bbb"] }),
    );
    // Subject order never changes identity.
    expect(canonicalOpportunityKey(base)).toBe(
      canonicalOpportunityKey({ ...base, subjectKeys: ["PROJECT:aaa"] }),
    );
  });

  it("keys evidence without rationale prose", () => {
    const base = { opportunityId: "opp-1", subjectType: "PROJECT", subjectId: "proj-1" };
    expect(opportunityEvidenceKey(base)).toBe(opportunityEvidenceKey({ ...base }));
    expect(opportunityEvidenceKey(base)).not.toBe(
      opportunityEvidenceKey({ ...base, subjectId: "proj-2" }),
    );
  });
});
