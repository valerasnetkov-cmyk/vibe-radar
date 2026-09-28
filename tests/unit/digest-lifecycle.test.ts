import { describe, expect, it } from "vitest";
import type { getDatabase } from "@/server/db/client";
import { radarDigests } from "@/server/db/schema";
import { runConfiguredDailyRadar } from "@/server/modules/publishing/digest-job";
import { digestPeriodKey, getOrCreateRadarDigest } from "@/server/modules/publishing/digest-store";
import type { RadarDigest } from "@/server/modules/publishing/digest";

type FakeDatabase = ReturnType<typeof getDatabase>;

const DIGEST: RadarDigest = {
  window: "DAILY",
  generatedAt: new Date("2026-09-18T12:00:00Z"),
  items: [],
};

function makeDatabase(options: {
  freshRow: Record<string, unknown> | null;
  existingRow: Record<string, unknown> | null;
  publicationRows?: Record<string, unknown>[];
}): { database: FakeDatabase; inserted: unknown[] } {
  const inserted: unknown[] = [];
  const chain = (rows: unknown[]): unknown => ({
    where: () => chain(rows),
    orderBy: () => chain(rows),
    groupBy: () => chain(rows),
    limit: (count?: number) =>
      Promise.resolve(typeof count === "number" ? rows.slice(0, count) : rows),
  });
  const database = {
    select: () => ({
      from: (table: unknown) => {
        if (table === radarDigests) {
          return chain(options.existingRow ? [options.existingRow] : []);
        }
        return chain(options.publicationRows ?? []);
      },
    }),
    insert: () => ({
      values: (values: unknown) => {
        inserted.push(values);
        return {
          onConflictDoNothing: () => ({
            returning: async () => (options.freshRow ? [options.freshRow] : []),
          }),
        };
      },
    }),
  };
  return { database: database as unknown as FakeDatabase, inserted };
}

describe("digest period identity", () => {
  it("uses UTC calendar days and ISO weeks", () => {
    expect(digestPeriodKey("DAILY", new Date("2026-09-18T23:59:59Z"))).toBe("2026-09-18");
    expect(digestPeriodKey("DAILY", new Date("2026-09-19T00:00:00Z"))).toBe("2026-09-19");
    expect(digestPeriodKey("WEEKLY", new Date("2026-01-01T12:00:00Z"))).toBe("2026-W01");
    expect(digestPeriodKey("WEEKLY", new Date("2026-09-18T12:00:00Z"))).toBe("2026-W38");
    expect(digestPeriodKey("WEEKLY", new Date("2026-09-19T12:00:00Z"))).toBe("2026-W38");
    expect(digestPeriodKey("WEEKLY", new Date("2026-09-20T12:00:00Z"))).toBe("2026-W38");
    expect(digestPeriodKey("WEEKLY", new Date("2026-09-21T12:00:00Z"))).toBe("2026-W39");
  });
});

describe("digest persistence idempotency", () => {
  it("creates once and reuses the same row on retry", async () => {
    const first = makeDatabase({ freshRow: { id: "digest-1" }, existingRow: null });
    const created = await getOrCreateRadarDigest(first.database, "DAILY", DIGEST);
    expect(created).toEqual({ id: "digest-1", created: true });
    expect(first.inserted).toHaveLength(1);

    const second = makeDatabase({ freshRow: null, existingRow: { id: "digest-1" } });
    const reused = await getOrCreateRadarDigest(second.database, "DAILY", DIGEST);
    expect(reused).toEqual({ id: "digest-1", created: false });
  });
});

describe("digest jobs over published content", () => {
  it("persists a daily digest without inventing items", async () => {
    const { database, inserted } = makeDatabase({
      freshRow: { id: "digest-2" },
      existingRow: null,
      publicationRows: [],
    });
    await runConfiguredDailyRadar(new Date("2026-09-18T12:00:00Z"), database);
    expect(inserted).toHaveLength(1);
    const values = inserted[0] as Record<string, unknown>;
    expect(values.window).toBe("DAILY");
    expect(values.periodKey).toBe("2026-09-18");
    expect(values.itemCount).toBe(0);
  });
});
