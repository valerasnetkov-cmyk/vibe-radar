import { describe, expect, it } from "vitest";
import {
  capOpportunities,
  opportunityConfidence,
  validateOpportunity,
} from "@/server/modules/opportunities/contract";

const base = {
  title: "Approval workflow for autonomous tools",
  problemStatement: "Builders need a safe way to approve privileged agent actions.",
  proposedProduct: "A focused approval gateway with audit-ready decisions.",
  targetUser: "Small AI-assisted development teams",
  marketScope: "RU_GLOBAL" as const,
  buildabilityAssessmentId: "00000000-0000-4000-8000-000000000001",
  buildabilityLabel: "SMALL_TEAM" as const,
  requiredCapabilities: ["Backend API", "Telegram integration"],
  differentiationHypothesis:
    "Focus on narrow developer workflows and source-backed policy templates rather than a generic enterprise gateway.",
  riskSummary: ["Requires careful authorization design"],
  evidence: [
    {
      sourceType: "MECHANIC" as const,
      sourceId: "mechanic-1",
      rationale: "The mechanic appears in independent tools.",
      weight: 80,
    },
  ],
  sourceConfidence: 80,
};

describe("Opportunity Engine", () => {
  it("validates evidence-linked opportunities and keeps confidence separate", () => {
    const opportunity = validateOpportunity(base);
    expect(opportunityConfidence(opportunity)).toBe(64);
  });

  it("caps speculative output to the three strongest opportunities", () => {
    const opportunities = [
      base,
      { ...base, title: "Second opportunity", sourceConfidence: 40 },
      { ...base, title: "Third opportunity", sourceConfidence: 60 },
      { ...base, title: "Fourth opportunity", sourceConfidence: 20 },
    ].map(validateOpportunity);
    expect(capOpportunities(opportunities)).toHaveLength(3);
    expect(capOpportunities(opportunities)[0]?.title).toBe(base.title);
  });

  it("rejects unsupported fields and empty evidence", () => {
    expect(() => validateOpportunity({ ...base, unsupported: true })).toThrow();
    expect(() => validateOpportunity({ ...base, evidence: [] })).toThrow();
  });
});
