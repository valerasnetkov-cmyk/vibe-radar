import { getDatabase } from "@/server/db/client";
import { mechanicEvidence, productMechanics } from "@/server/db/schema";
import type { MechanicProposal } from "@/server/modules/mechanics/contract";
import { assessMechanic } from "@/server/modules/mechanics/contract";

export async function persistMechanicProposal(
  proposal: MechanicProposal,
  velocity: number,
  observedAt = new Date(),
) {
  const assessment = assessMechanic(proposal, velocity);
  return getDatabase().transaction(async (transaction) => {
    const [mechanic] = await transaction
      .insert(productMechanics)
      .values({
        canonicalName: proposal.canonicalName,
        description: proposal.description,
        firstObservedAt: observedAt,
        lastObservedAt: observedAt,
        stage: assessment.stage,
        velocity: assessment.velocity,
        confidence: assessment.confidence,
        status: "ACTIVE",
        affectedCategories: proposal.affectedCategories,
        practicalImplications: proposal.practicalImplications,
        risks: proposal.risks,
      })
      .returning({ id: productMechanics.id });
    for (const evidence of proposal.evidence) {
      await transaction.insert(mechanicEvidence).values({
        mechanicId: mechanic.id,
        signalId: evidence.signalId,
        projectId: evidence.projectId,
        sourceEventId: evidence.sourceEventId,
        independenceGroup: evidence.independenceGroup,
        strength: evidence.strength,
      });
    }
    return { mechanicId: mechanic.id, assessment };
  });
}
