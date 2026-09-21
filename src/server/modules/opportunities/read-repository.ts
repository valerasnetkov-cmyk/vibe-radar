import { desc, eq } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { opportunities } from "@/server/db/schema";

export async function listPublicOpportunities() {
  return getDatabase()
    .select({
      id: opportunities.id,
      title: opportunities.title,
      problemStatement: opportunities.problemStatement,
      targetUser: opportunities.targetUser,
      marketScope: opportunities.marketScope,
      buildabilityAssessmentId: opportunities.buildabilityAssessmentId,
      confidence: opportunities.opportunityConfidence,
      differentiation: opportunities.differentiationHypothesis,
    })
    .from(opportunities)
    .where(eq(opportunities.status, "PUBLISHED"))
    .orderBy(desc(opportunities.createdAt))
    .limit(50);
}
