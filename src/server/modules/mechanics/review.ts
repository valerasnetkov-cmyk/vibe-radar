import { desc, eq } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { mechanicReviews, productMechanics } from "@/server/db/schema";

export const MECHANIC_REVIEW_DECISIONS = ["APPROVE", "REJECT"] as const;
export type MechanicReviewDecision = (typeof MECHANIC_REVIEW_DECISIONS)[number];

export function parseMechanicReviewDecision(value: string): MechanicReviewDecision {
  if (value === "APPROVE" || value === "REJECT") return value;
  throw new Error("Unknown mechanic review decision");
}

/**
 * Append-only editor review. Records who decided what and when; it never
 * mutates stage, velocity, confidence, or independence groups, which stay
 * deterministic policy outputs.
 */
export async function reviewMechanic(
  database: ReturnType<typeof getDatabase>,
  mechanicId: string,
  decision: MechanicReviewDecision,
  editorActorId: string,
  note?: string,
) {
  const [mechanic] = await database
    .select({ id: productMechanics.id })
    .from(productMechanics)
    .where(eq(productMechanics.id, mechanicId))
    .limit(1);
  if (!mechanic) throw new Error("Unknown mechanic");
  if (!editorActorId.trim()) throw new Error("Editor actor is required");
  const [review] = await database
    .insert(mechanicReviews)
    .values({
      mechanicId,
      editorActorId: editorActorId.trim().slice(0, 200),
      decision,
      note: note?.trim().slice(0, 500),
    })
    .returning({ id: mechanicReviews.id });
  if (!review) throw new Error("Mechanic review could not be recorded");
  return { reviewId: review.id, mechanicId, decision };
}

/** Latest review by reviewedAt; a later REJECT always overrides an older APPROVE. */
export async function latestMechanicReview(
  database: ReturnType<typeof getDatabase>,
  mechanicId: string,
) {
  const [review] = await database
    .select({ decision: mechanicReviews.decision, reviewedAt: mechanicReviews.reviewedAt })
    .from(mechanicReviews)
    .where(eq(mechanicReviews.mechanicId, mechanicId))
    .orderBy(desc(mechanicReviews.reviewedAt))
    .limit(1);
  return review ?? null;
}
