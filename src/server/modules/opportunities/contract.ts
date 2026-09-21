import { z } from "zod";

const evidenceSchema = z
  .object({
    sourceType: z.enum(["PROJECT", "MECHANIC", "TREND", "SIGNAL"]),
    sourceId: z.string().trim().min(1).max(160),
    rationale: z.string().trim().min(10).max(500),
    weight: z.number().min(0).max(100),
  })
  .strict();

export const opportunitySchema = z
  .object({
    title: z.string().trim().min(5).max(180),
    problemStatement: z.string().trim().min(10).max(800),
    proposedProduct: z.string().trim().min(10).max(800),
    targetUser: z.string().trim().min(3).max(240),
    marketScope: z.enum(["RU", "GLOBAL", "RU_GLOBAL"]),
    buildabilityAssessmentId: z.string().uuid(),
    buildabilityLabel: z.enum(["SOLO_MVP", "SMALL_TEAM", "TEAM_REQUIRED"]),
    requiredCapabilities: z.array(z.string().trim().min(1).max(160)).max(10),
    differentiationHypothesis: z.string().trim().min(10).max(700),
    riskSummary: z.array(z.string().trim().min(1).max(240)).max(8),
    evidence: z.array(evidenceSchema).min(1).max(10),
    sourceConfidence: z.number().min(0).max(100),
  })
  .strict();

export type Opportunity = z.infer<typeof opportunitySchema>;

export function validateOpportunity(value: unknown): Opportunity {
  return opportunitySchema.parse(value);
}

export function opportunityConfidence(opportunity: Opportunity): number {
  const evidence = Math.min(40, opportunity.evidence.length * 10);
  const source = opportunity.sourceConfidence * 0.3;
  const differentiation = opportunity.differentiationHypothesis.length >= 80 ? 20 : 10;
  const buildability = opportunity.buildabilityLabel === "TEAM_REQUIRED" ? 5 : 10;
  return Math.round(Math.min(100, evidence + source + differentiation + buildability));
}

export function capOpportunities(opportunities: readonly Opportunity[]): Opportunity[] {
  return [...opportunities]
    .sort((left, right) => opportunityConfidence(right) - opportunityConfidence(left))
    .slice(0, 3);
}
