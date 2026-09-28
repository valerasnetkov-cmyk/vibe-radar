import { describe, expect, it } from "vitest";
import type { getDatabase } from "@/server/db/client";
import {
  BUILDABILITY_RANK,
  resolveOpportunityBuildability,
} from "@/server/modules/opportunities/buildability";

type FakeDatabase = ReturnType<typeof getDatabase>;

const PROJECT_A = "00000000-0000-4000-8000-0000000000b1";

function makeDatabase(rows: unknown[]): FakeDatabase {
  const chain: unknown = {
    where: () => chain,
    orderBy: () => chain,
    limit: () => Promise.resolve(rows),
  };
  return {
    select: () => ({ from: () => chain }),
  } as unknown as FakeDatabase;
}

describe("server-derived buildability", () => {
  it("derives the label from the persisted assessment, never the caller", async () => {
    const database = makeDatabase([{ id: "assessment-1", label: "SMALL_TEAM" }]);
    const result = await resolveOpportunityBuildability(database, [PROJECT_A]);
    expect(result).toEqual({ ok: true, assessmentId: "assessment-1", label: "SMALL_TEAM" });
  });

  it("returns a deterministic reason when no assessment exists", async () => {
    const database = makeDatabase([]);
    expect(await resolveOpportunityBuildability(database, [PROJECT_A])).toEqual({
      ok: false,
      reason: "missing_buildability",
    });
    expect(await resolveOpportunityBuildability(database, [])).toEqual({
      ok: false,
      reason: "missing_buildability",
    });
  });

  it("orders labels conservatively toward the most demanding assessment", () => {
    expect(BUILDABILITY_RANK.SOLO_MVP).toBeLessThan(BUILDABILITY_RANK.SMALL_TEAM);
    expect(BUILDABILITY_RANK.SMALL_TEAM).toBeLessThan(BUILDABILITY_RANK.TEAM_REQUIRED);
  });
});
