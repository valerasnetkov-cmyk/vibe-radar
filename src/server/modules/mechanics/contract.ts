import { z } from "zod";

export const mechanicProposalSchema = z
  .object({
    canonicalName: z.string().trim().min(3).max(160),
    description: z.string().trim().min(10).max(600),
    evidence: z
      .array(
        z
          .object({
            signalId: z.string().max(120).optional(),
            projectId: z.string().uuid().optional(),
            sourceEventId: z.string().uuid().optional(),
            independenceGroup: z.string().trim().min(1).max(120),
            strength: z.number().min(0).max(100),
          })
          .strict(),
      )
      .min(1)
      .max(30),
    affectedCategories: z.array(z.string().trim().min(1).max(80)).max(10),
    practicalImplications: z.array(z.string().trim().min(1).max(240)).max(5),
    risks: z.array(z.string().trim().min(1).max(240)).max(5),
  })
  .strict();

export type MechanicProposal = z.infer<typeof mechanicProposalSchema>;
export type MechanicStage = "SPARK" | "RISING" | "BREAKOUT" | "ESTABLISHED";

export type MechanicAssessment = {
  stage: MechanicStage;
  independentSourceCount: number;
  evidenceCount: number;
  confidence: number;
  velocity: number;
};

export function validateMechanicProposal(value: unknown): MechanicProposal {
  return mechanicProposalSchema.parse(value);
}

export function assessMechanic(proposal: MechanicProposal, velocity: number): MechanicAssessment {
  const independentGroups = new Set(proposal.evidence.map((item) => item.independenceGroup));
  const independentSourceCount = independentGroups.size;
  const boundedVelocity = Math.min(100, Math.max(0, Number.isFinite(velocity) ? velocity : 0));
  const stage: MechanicStage =
    independentSourceCount >= 5 && boundedVelocity < 30
      ? "ESTABLISHED"
      : independentSourceCount >= 5 && boundedVelocity >= 70
        ? "BREAKOUT"
        : independentSourceCount >= 3 && boundedVelocity >= 40
          ? "RISING"
          : "SPARK";
  const confidence = Math.min(
    100,
    independentSourceCount * 20 + Math.min(20, proposal.evidence.length * 2),
  );
  return {
    stage,
    independentSourceCount,
    evidenceCount: proposal.evidence.length,
    confidence,
    velocity: boundedVelocity,
  };
}
