import { desc, eq } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { opportunities, opportunityReviews } from "@/server/db/schema";

export const OPPORTUNITY_REVIEW_DECISIONS = ["APPROVE", "REJECT"] as const;
export type OpportunityReviewDecision = (typeof OPPORTUNITY_REVIEW_DECISIONS)[number];

export function parseOpportunityReviewDecision(value: string): OpportunityReviewDecision {
  if (value === "APPROVE" || value === "REJECT") return value;
  throw new Error("Unknown opportunity review decision");
}

/**
 * Append-only opportunity review. Records who decided what and when; it
 * never mutates confidence, buildability, evidence, keys, scope, or prose.
 * Materialized lifecycle status may move PROPOSED/REJECTED to REVIEWED on
 * approval context, but the reviews table stays the canonical history.
 */
export async function reviewOpportunity(
  database: ReturnType<typeof getDatabase>,
  opportunityId: string,
  decision: OpportunityReviewDecision,
  editorActorId: string,
  note?: string,
) {
  const [opportunity] = await database
    .select({ id: opportunities.id, status: opportunities.status })
    .from(opportunities)
    .where(eq(opportunities.id, opportunityId))
    .limit(1);
  if (!opportunity) throw new Error("Unknown opportunity");
  if (!editorActorId.trim()) throw new Error("Editor actor is required");
  const [review] = await database
    .insert(opportunityReviews)
    .values({
      opportunityId,
      editorActorId: editorActorId.trim().slice(0, 200),
      decision,
      note: note?.trim().slice(0, 500),
    })
    .returning({ id: opportunityReviews.id });
  if (!review) throw new Error("Opportunity review could not be recorded");
  if (decision === "APPROVE" && opportunity.status !== "PUBLISHED") {
    await database
      .update(opportunities)
      .set({ status: "REVIEWED", updatedAt: new Date() })
      .where(eq(opportunities.id, opportunityId));
  }
  if (decision === "REJECT") {
    await database
      .update(opportunities)
      .set({ status: "REJECTED", updatedAt: new Date() })
      .where(eq(opportunities.id, opportunityId));
  }
  return { reviewId: review.id, opportunityId, decision };
}

/** Latest review by reviewedAt; a later REJECT always overrides an older APPROVE. */
export async function latestOpportunityReview(
  database: ReturnType<typeof getDatabase>,
  opportunityId: string,
) {
  const [review] = await database
    .select({ decision: opportunityReviews.decision, reviewedAt: opportunityReviews.reviewedAt })
    .from(opportunityReviews)
    .where(eq(opportunityReviews.opportunityId, opportunityId))
    .orderBy(desc(opportunityReviews.reviewedAt))
    .limit(1);
  return review ?? null;
}
