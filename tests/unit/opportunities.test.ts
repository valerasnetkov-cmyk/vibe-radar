import { describe, expect, it } from "vitest";
import {
  validateOpportunityBatch,
  validateOpportunityProposal,
} from "@/server/modules/opportunities/contract";

const evidence = (sourceId: string) => ({
  sourceType: "PROJECT" as const,
  sourceId,
  rationale: "The project shows sustained independent adoption.",
});

const base = {
  title: "Approval workflow for autonomous tools",
  problemStatement: "Builders need a safe way to approve privileged agent actions.",
  proposedProduct: "A focused approval gateway with audit-ready decisions.",
  targetUser: "Small AI-assisted development teams",
  marketScope: "RU_GLOBAL" as const,
  requiredCapabilities: ["Backend API", "Telegram integration"],
  differentiationHypothesis:
    "Focus on narrow developer workflows and source-backed policy templates rather than a generic enterprise gateway.",
  riskSummary: ["Requires careful authorization design"],
  evidence: [evidence("00000000-0000-4000-8000-000000000001")],
};

describe("Opportunity Engine", () => {
  it("validates bounded hypothesis proposals without trusted fields", () => {
    const proposal = validateOpportunityProposal(base);
    expect(proposal.title).toBe(base.title);
    expect(proposal.evidence).toHaveLength(1);
  });

  it("rejects caller-controlled confidence, buildability, weight, and status", () => {
    for (const extra of [
      { sourceConfidence: 100 },
      { buildabilityAssessmentId: "00000000-0000-4000-8000-000000000001" },
      { buildabilityLabel: "SOLO_MVP" },
      { confidence: 100 },
      { status: "PUBLISHED" },
      { editorId: "editor-1" },
    ]) {
      expect(() => validateOpportunityProposal({ ...base, ...extra })).toThrow();
    }
    expect(() =>
      validateOpportunityProposal({
        ...base,
        evidence: [{ ...base.evidence[0], weight: 100 }],
      }),
    ).toThrow();
  });

  it("enforces a strict 1-3 batch instead of silently truncating", () => {
    expect(() => validateOpportunityBatch([])).toThrow();
    expect(() =>
      validateOpportunityBatch([
        base,
        { ...base, title: "Second opportunity" },
        { ...base, title: "Third opportunity" },
        { ...base, title: "Fourth opportunity" },
      ]),
    ).toThrow();
    expect(
      validateOpportunityBatch([
        base,
        { ...base, title: "Second opportunity" },
        { ...base, title: "Third opportunity" },
      ]),
    ).toHaveLength(3);
  });

  it("rejects unsupported fields and empty evidence", () => {
    expect(() => validateOpportunityProposal({ ...base, unsupported: true })).toThrow();
    expect(() => validateOpportunityProposal({ ...base, evidence: [] })).toThrow();
  });
});
