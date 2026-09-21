import { getDatabase } from "@/server/db/client";
import { opportunityEvidence, opportunities } from "@/server/db/schema";
import type { Opportunity } from "@/server/modules/opportunities/contract";
import { opportunityConfidence } from "@/server/modules/opportunities/contract";

export async function persistOpportunity(opportunity: Opportunity, createdAt = new Date()) {
  const confidence = opportunityConfidence(opportunity);
  return getDatabase().transaction(async (transaction) => {
    const [record] = await transaction
      .insert(opportunities)
      .values({
        title: opportunity.title,
        problemStatement: opportunity.problemStatement,
        proposedProduct: opportunity.proposedProduct,
        targetUser: opportunity.targetUser,
        marketScope: opportunity.marketScope,
        buildabilityAssessmentId: opportunity.buildabilityAssessmentId,
        differentiationHypothesis: opportunity.differentiationHypothesis,
        riskSummary: opportunity.riskSummary,
        opportunityConfidence: confidence,
        status: "PROPOSED",
        createdAt,
      })
      .returning({ id: opportunities.id });
    for (const evidence of opportunity.evidence) {
      await transaction.insert(opportunityEvidence).values({
        opportunityId: record.id,
        subjectType: evidence.sourceType,
        subjectId: evidence.sourceId,
        rationale: evidence.rationale,
        evidenceWeight: evidence.weight,
      });
    }
    return { opportunityId: record.id, confidence };
  });
}
