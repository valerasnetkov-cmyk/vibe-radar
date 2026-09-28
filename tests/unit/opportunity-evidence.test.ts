import { describe, expect, it } from "vitest";
import type { getDatabase } from "@/server/db/client";
import {
  candidates,
  confidenceAssessments,
  mechanicEvidence,
  mechanicReviews,
  productMechanics,
  projects,
  providerIdentities,
  publications,
  scores,
} from "@/server/db/schema";
import { resolveOpportunityEvidence } from "@/server/modules/opportunities/evidence";

type FakeDatabase = ReturnType<typeof getDatabase>;

const PROJECT_ID = "00000000-0000-4000-8000-0000000000a1";
const MECHANIC_ID = "00000000-0000-4000-8000-0000000000a2";

const PUBLISHED_PAYLOAD = {
  candidateId: "00000000-0000-4000-8000-0000000000a3",
  contentVersion: "v".repeat(64),
  title: "Acme Tool",
  format: "FRESH",
  shortSummary: "Fast bundler",
  whyNow: "Adoption is accelerating",
  keyPoints: ["builds"],
  audience: ["teams"],
  limitations: [],
  projectSlug: "acme-tool",
  projectUrl: "https://github.com/acme/tool",
  score: 72,
  scoreVersion: 1,
  confidence: 80,
  confidenceLevel: "HIGH",
  sources: [{ label: "acme/tool", url: "https://github.com/acme/tool" }],
  outscanRelevance: "NONE",
};

function makeDatabase(tables: Map<unknown, unknown[]>): FakeDatabase {
  const chain = (rows: unknown[]): unknown => ({
    where: () => chain(rows),
    orderBy: () => chain(rows),
    limit: (count?: number) =>
      Promise.resolve(typeof count === "number" ? rows.slice(0, count) : rows),
    then: (resolve: (value: unknown[]) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve, reject),
  });
  return {
    select: () => ({ from: (table: unknown) => chain(tables.get(table) ?? []) }),
  } as unknown as FakeDatabase;
}

function baseTables(): Map<unknown, unknown[]> {
  return new Map<unknown, unknown[]>([
    [projects, [{ id: PROJECT_ID, name: "Acme Tool", slug: "acme-tool" }]],
    [candidates, [{ id: "cand-1" }]],
    [
      publications,
      [
        {
          candidateId: "cand-1",
          contentPayload: PUBLISHED_PAYLOAD,
          publishedAt: new Date("2026-09-18T00:00:00Z"),
        },
      ],
    ],
    [
      productMechanics,
      [
        {
          id: MECHANIC_ID,
          canonicalName: "Approval checkpoints",
          description: "A repeated approval interaction pattern.",
          stage: "RISING",
          velocity: 55,
          confidence: 60,
          status: "ACTIVE",
          affectedCategories: ["agents"],
          practicalImplications: [],
          risks: [],
          lastObservedAt: new Date("2026-09-18T00:00:00Z"),
        },
      ],
    ],
    [
      mechanicEvidence,
      [
        {
          mechanicId: MECHANIC_ID,
          projectId: PROJECT_ID,
          independenceGroup: `project:${PROJECT_ID}`,
          independenceBasis: "project",
          observedAt: new Date("2026-09-18T00:00:00Z"),
        },
        {
          mechanicId: MECHANIC_ID,
          projectId: "00000000-0000-4000-8000-0000000000a4",
          independenceGroup: "project:00000000-0000-4000-8000-0000000000a4",
          independenceBasis: "project",
          observedAt: new Date("2026-09-18T00:00:00Z"),
        },
      ],
    ],
    [mechanicReviews, [{ mechanicId: MECHANIC_ID, decision: "APPROVE" }]],
    [
      providerIdentities,
      [
        { projectId: PROJECT_ID, providerUrl: "https://github.com/acme/tool" },
        {
          projectId: "00000000-0000-4000-8000-0000000000a4",
          providerUrl: "https://github.com/acme/tool-two",
        },
      ],
    ],
    [scores, []],
    [confidenceAssessments, []],
  ]);
}

const rationale = "The project shows sustained independent adoption.";

describe("opportunity source resolution", () => {
  it("resolves published PROJECT sources with snapshot confidence", async () => {
    const database = makeDatabase(baseTables());
    const resolution = await resolveOpportunityEvidence(database, [
      { sourceType: "PROJECT", sourceId: PROJECT_ID, rationale },
    ]);
    expect(resolution.unsupported).toEqual([]);
    expect(resolution.unknown).toEqual([]);
    expect(resolution.resolved).toHaveLength(1);
    const source = resolution.resolved[0];
    expect(source?.kind).toBe("PROJECT");
    if (source?.kind !== "PROJECT") return;
    expect(source.confidence).toBe(80);
    expect(source.url).toBe("https://github.com/acme/tool");
  });

  it("rejects unpublished projects as public evidence", async () => {
    const tables = baseTables();
    tables.set(publications, []);
    const database = makeDatabase(tables);
    const resolution = await resolveOpportunityEvidence(database, [
      { sourceType: "PROJECT", sourceId: PROJECT_ID, rationale },
    ]);
    expect(resolution.resolved).toEqual([]);
    expect(resolution.unknown).toHaveLength(1);
  });

  it("resolves eligible MECHANIC sources with deterministic confidence", async () => {
    const database = makeDatabase(baseTables());
    const resolution = await resolveOpportunityEvidence(database, [
      { sourceType: "MECHANIC", sourceId: MECHANIC_ID, rationale },
    ]);
    expect(resolution.unknown).toEqual([]);
    expect(resolution.resolved).toHaveLength(1);
    const source = resolution.resolved[0];
    expect(source?.kind).toBe("MECHANIC");
    if (source?.kind !== "MECHANIC") return;
    expect(source.confidence).toBe(60);
    expect(source.projects).toHaveLength(1);
  });

  it("excludes rejected mechanics from public evidence", async () => {
    const tables = baseTables();
    tables.set(mechanicReviews, [{ mechanicId: MECHANIC_ID, decision: "REJECT" }]);
    const database = makeDatabase(tables);
    const resolution = await resolveOpportunityEvidence(database, [
      { sourceType: "MECHANIC", sourceId: MECHANIC_ID, rationale },
    ]);
    expect(resolution.resolved).toEqual([]);
    expect(resolution.unknown).toHaveLength(1);
  });

  it("fails SIGNAL/TREND closed and dedupes repeated subjects", async () => {
    const database = makeDatabase(baseTables());
    const resolution = await resolveOpportunityEvidence(database, [
      { sourceType: "SIGNAL", sourceId: PROJECT_ID, rationale },
      { sourceType: "TREND", sourceId: PROJECT_ID, rationale },
      { sourceType: "PROJECT", sourceId: PROJECT_ID, rationale },
      { sourceType: "PROJECT", sourceId: PROJECT_ID, rationale: "Second prose" },
    ]);
    expect(resolution.unsupported).toHaveLength(2);
    // The table-keyed fake resolves every PROJECT id; unknown-id rejection
    // is covered by the unpublished/unknown reference tests above.
    expect(resolution.unknown).toHaveLength(0);
    expect(resolution.resolved).toHaveLength(1);
  });
});
