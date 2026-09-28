import { describe, expect, it } from "vitest";
import type { getDatabase } from "@/server/db/client";
import { mechanicReviews, productMechanics } from "@/server/db/schema";
import {
  latestMechanicReview,
  parseMechanicReviewDecision,
  reviewMechanic,
} from "@/server/modules/mechanics/review";

type FakeDatabase = ReturnType<typeof getDatabase>;

const MECHANIC_ID = "00000000-0000-4000-8000-0000000000e1";

function makeDatabase(options: {
  mechanic?: Record<string, unknown> | null;
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
        if (table === productMechanics) return chain(options.mechanic ? [options.mechanic] : []);
        if (table === mechanicReviews) return chain(options.reviews ?? []);
        return chain([]);
      },
    }),
    insert: () => ({
      values: (values: unknown) => {
        inserted.push(values);
        return {
          onConflictDoNothing: () => ({ returning: async () => [{ id: "review-1" }] }),
          returning: async () => [{ id: "review-1" }],
        };
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

describe("mechanic review boundary", () => {
  it("appends APPROVE records without touching metrics", async () => {
    const { database, inserted, updated } = makeDatabase({
      mechanic: { id: MECHANIC_ID },
    });
    const result = await reviewMechanic(database, MECHANIC_ID, "APPROVE", "editor-7", "Looks real");
    expect(result).toEqual({ reviewId: "review-1", mechanicId: MECHANIC_ID, decision: "APPROVE" });
    expect(inserted).toHaveLength(1);
    expect(updated).toHaveLength(0);
    const record = inserted[0] as Record<string, unknown>;
    expect(record.mechanicId).toBe(MECHANIC_ID);
    expect(record.editorActorId).toBe("editor-7");
    expect(record.decision).toBe("APPROVE");
  });

  it("rejects unknown mechanics, empty actors, and unknown decisions", async () => {
    const missing = makeDatabase({ mechanic: null });
    await expect(
      reviewMechanic(missing.database, MECHANIC_ID, "APPROVE", "editor-7"),
    ).rejects.toThrow("Unknown mechanic");
    const present = makeDatabase({ mechanic: { id: MECHANIC_ID } });
    await expect(reviewMechanic(present.database, MECHANIC_ID, "REJECT", "  ")).rejects.toThrow(
      "Editor actor is required",
    );
    expect(() => parseMechanicReviewDecision("MAYBE")).toThrow("Unknown mechanic review decision");
    expect(parseMechanicReviewDecision("REJECT")).toBe("REJECT");
  });

  it("selects the latest review so REJECT overrides older APPROVE", async () => {
    const newer = { decision: "REJECT", reviewedAt: new Date("2026-09-18T00:00:00Z") };
    const older = { decision: "APPROVE", reviewedAt: new Date("2026-09-10T00:00:00Z") };
    const { database } = makeDatabase({ reviews: [newer, older] });
    // Canned in latest-first order, mirroring ORDER BY reviewedAt DESC.
    expect(await latestMechanicReview(database, MECHANIC_ID)).toEqual(newer);
    const empty = makeDatabase({ reviews: [] });
    expect(await latestMechanicReview(empty.database, MECHANIC_ID)).toBeNull();
  });
});
