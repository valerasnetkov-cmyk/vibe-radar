import { describe, expect, it } from "vitest";
import type { getDatabase } from "@/server/db/client";
import { opportunities, opportunityReviews } from "@/server/db/schema";
import {
  latestOpportunityReview,
  parseOpportunityReviewDecision,
  reviewOpportunity,
} from "@/server/modules/opportunities/review";

type FakeDatabase = ReturnType<typeof getDatabase>;

const OPPORTUNITY_ID = "00000000-0000-4000-8000-0000000000c1";

function makeDatabase(options: {
  opportunity?: Record<string, unknown> | null;
  reviews?: Record<string, unknown>[];
}): { database: FakeDatabase; inserted: unknown[]; updated: unknown[] } {
  const inserted: unknown[] = [];
  const updated: unknown[] = [];
  const chain = (rows: unknown[]): unknown => ({
    where: () => chain(rows),
    orderBy: () => chain(rows),
    limit: (count?: number) =>
      Promise.resolve(typeof count === "number" ? rows.slice(0, count) : rows),
  });
  const database = {
    select: () => ({
      from: (table: unknown) => {
        if (table === opportunities) return chain(options.opportunity ? [options.opportunity] : []);
        if (table === opportunityReviews) return chain(options.reviews ?? []);
        return chain([]);
      },
    }),
    insert: () => ({
      values: (values: unknown) => {
        inserted.push(values);
        return { returning: async () => [{ id: "review-1" }] };
      },
    }),
    update: () => ({
      set: (values: unknown) => {
        updated.push(values);
        return { where: async () => [] };
      },
    }),
  };
  return { database: database as unknown as FakeDatabase, inserted, updated };
}

describe("opportunity review boundary", () => {
  it("appends APPROVE records and moves lifecycle to REVIEWED", async () => {
    const { database, inserted, updated } = makeDatabase({
      opportunity: { id: OPPORTUNITY_ID, status: "PROPOSED" },
    });
    const result = await reviewOpportunity(database, OPPORTUNITY_ID, "APPROVE", "editor-3");
    expect(result).toEqual({
      reviewId: "review-1",
      opportunityId: OPPORTUNITY_ID,
      decision: "APPROVE",
    });
    expect(inserted).toHaveLength(1);
    expect(updated).toEqual([{ status: "REVIEWED", updatedAt: expect.any(Date) }]);
  });

  it("moves REJECT to lifecycle REJECTED without touching metrics", async () => {
    const { database, inserted, updated } = makeDatabase({
      opportunity: { id: OPPORTUNITY_ID, status: "REVIEWED" },
    });
    await reviewOpportunity(database, OPPORTUNITY_ID, "REJECT", "editor-3", "Too speculative");
    expect(inserted).toHaveLength(1);
    expect(updated).toEqual([{ status: "REJECTED", updatedAt: expect.any(Date) }]);
    for (const values of updated) {
      const record = values as Record<string, unknown>;
      expect(record).not.toHaveProperty("opportunityConfidence");
      expect(record).not.toHaveProperty("buildabilityLabel");
    }
  });

  it("rejects unknown opportunities, actors, and decisions", async () => {
    const missing = makeDatabase({ opportunity: null });
    await expect(
      reviewOpportunity(missing.database, OPPORTUNITY_ID, "APPROVE", "editor-3"),
    ).rejects.toThrow("Unknown opportunity");
    const present = makeDatabase({ opportunity: { id: OPPORTUNITY_ID, status: "PROPOSED" } });
    await expect(
      reviewOpportunity(present.database, OPPORTUNITY_ID, "APPROVE", " "),
    ).rejects.toThrow("Editor actor is required");
    expect(() => parseOpportunityReviewDecision("MAYBE")).toThrow(
      "Unknown opportunity review decision",
    );
  });

  it("selects the latest review so REJECT overrides older APPROVE", async () => {
    const { database } = makeDatabase({
      reviews: [
        { decision: "REJECT", reviewedAt: new Date("2026-09-18T00:00:00Z") },
        { decision: "APPROVE", reviewedAt: new Date("2026-09-10T00:00:00Z") },
      ],
    });
    expect(await latestOpportunityReview(database, OPPORTUNITY_ID)).toEqual({
      decision: "REJECT",
      reviewedAt: new Date("2026-09-18T00:00:00Z"),
    });
    const empty = makeDatabase({ reviews: [] });
    expect(await latestOpportunityReview(empty.database, OPPORTUNITY_ID)).toBeNull();
  });
});
