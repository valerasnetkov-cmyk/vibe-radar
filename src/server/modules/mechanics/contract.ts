import { z } from "zod";

export const MECHANIC_POLICY_VERSION = 1;

/**
 * Untrusted proposal boundary. Accepts only references and prose needed to
 * resolve persisted evidence. Lifecycle stage, velocity, confidence, public
 * status, approval, independence grouping, and every derived count are
 * server-computed and therefore absent here. Strict: unknown fields reject.
 */
export const mechanicProposalSchema = z
  .object({
    canonicalName: z.string().trim().min(3).max(160),
    description: z.string().trim().min(10).max(600),
    evidence: z
      .array(
        z
          .object({
            signalId: z.string().trim().min(1).max(120).optional(),
            projectId: z.string().uuid().optional(),
            sourceEventId: z.string().uuid().optional(),
            strength: z.number().finite().min(0).max(100).optional(),
            rationale: z.string().trim().min(1).max(500).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(30),
    affectedCategories: z.array(z.string().trim().min(1).max(80)).max(10),\n    radarTracks: z.array(z.string().trim().min(1).max(80)).max(8).optional(),
    practicalImplications: z.array(z.string().trim().min(1).max(240)).max(5),
    risks: z.array(z.string().trim().min(1).max(240)).max(5),
  })
  .strict();

export type MechanicProposal = z.infer<typeof mechanicProposalSchema>;
export type MechanicEvidenceProposal = MechanicProposal["evidence"][number];
export type MechanicStage = "SPARK" | "RISING" | "BREAKOUT" | "ESTABLISHED";

export type MechanicAssessment = {
  stage: MechanicStage;
  independentSourceCount: number;
  evidenceCount: number;
  confidence: number;
  velocity: number;
  policyVersion: typeof MECHANIC_POLICY_VERSION;
};

export function validateMechanicProposal(value: unknown): MechanicProposal {
  return mechanicProposalSchema.parse(value);
}
