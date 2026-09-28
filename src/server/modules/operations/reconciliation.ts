import { and, eq } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { editorialReviewDispatches, publications } from "@/server/db/schema";

export type ReconciliationItem = {
  kind: "dispatch" | "publication";
  id: string;
  candidateId: string;
  updatedAt: string;
  attemptCount: number;
};

/**
 * Operational visibility for rows blocked from automatic resend after
 * ambiguous or failed finalization. Internal IDs, statuses, and timestamps
 * only: never tokens, content payloads, editor identities, or raw errors.
 * Listing never mutates provider state and never re-arms delivery.
 */
export async function listReconciliationItems(
  database: ReturnType<typeof getDatabase> = getDatabase(),
): Promise<ReconciliationItem[]> {
  const stuckDispatches = await database
    .select({
      candidateId: editorialReviewDispatches.candidateId,
      updatedAt: editorialReviewDispatches.updatedAt,
      attemptCount: editorialReviewDispatches.attemptCount,
    })
    .from(editorialReviewDispatches)
    .where(
      and(
        eq(editorialReviewDispatches.status, "PENDING"),
        eq(editorialReviewDispatches.lastErrorCode, "FINALIZATION_FAILED"),
      ),
    );
  const stuckPublications = await database
    .select({
      id: publications.id,
      candidateId: publications.candidateId,
      updatedAt: publications.updatedAt,
      attemptCount: publications.attemptCount,
    })
    .from(publications)
    .where(
      and(
        eq(publications.status, "pending"),
        eq(publications.lastErrorCode, "FINALIZATION_FAILED"),
      ),
    );
  return [
    ...stuckDispatches.map((row) => ({
      kind: "dispatch" as const,
      id: row.candidateId,
      candidateId: row.candidateId,
      updatedAt: row.updatedAt.toISOString(),
      attemptCount: row.attemptCount ?? 0,
    })),
    ...stuckPublications.map((row) => ({
      kind: "publication" as const,
      id: row.id,
      candidateId: row.candidateId,
      updatedAt: row.updatedAt.toISOString(),
      attemptCount: row.attemptCount ?? 0,
    })),
  ];
}
