import { z } from "zod";

export const OPPORTUNITY_POLICY_VERSION = 1;
export const OPPORTUNITY_BATCH_MIN = 1;
export const OPPORTUNITY_BATCH_MAX = 3;

const evidenceProposalSchema = z
  .object({
    sourceType: z.enum(["PROJECT", "MECHANIC", "SIGNAL", "TREND"]),
    sourceId: z.string().uuid(),
    rationale: z.string().trim().min(10).max(500),
  })
  .strict();

/**
 * Untrusted hypothesis boundary. Accepts only bounded prose, market-scope
 * metadata, capability lists, and evidence references. Confidence, source
 * confidence, buildability identity/label, evidence weight, status,
 * publication state, review, and editor identity are server-derived and
 * therefore absent here. Strict: unknown fields reject.
 */
export const opportunityProposalSchema = z
  .object({
    title: z.string().trim().min(5).max(180),
    problemStatement: z.string().trim().min(10).max(800),
    proposedProduct: z.string().trim().min(10).max(800),
    targetUser: z.string().trim().min(3).max(240),
    marketScope: z.enum(["RU", "GLOBAL", "RU_GLOBAL"]),
    requiredCapabilities: z.array(z.string().trim().min(1).max(160)).max(10),
    differentiationHypothesis: z.string().trim().min(10).max(700),
    riskSummary: z.array(z.string().trim().min(1).max(240)).max(8),
    evidence: z.array(evidenceProposalSchema).min(1).max(10),
  })
  .strict();

export type OpportunityProposal = z.infer<typeof opportunityProposalSchema>;
export type OpportunityEvidenceProposal = OpportunityProposal["evidence"][number];
export type OpportunitySourceType = OpportunityEvidenceProposal["sourceType"];

/**
 * Strict 1-3 generation batch contract: batches of zero or four-plus
 * proposals reject instead of being silently truncated or ranked down.
 */
export const opportunityBatchSchema = z
  .array(opportunityProposalSchema)
  .min(OPPORTUNITY_BATCH_MIN)
  .max(OPPORTUNITY_BATCH_MAX);

export type OpportunityBatch = z.infer<typeof opportunityBatchSchema>;

export function validateOpportunityProposal(value: unknown): OpportunityProposal {
  return opportunityProposalSchema.parse(value);
}

export function validateOpportunityBatch(value: unknown): OpportunityBatch {
  return opportunityBatchSchema.parse(value);
}
