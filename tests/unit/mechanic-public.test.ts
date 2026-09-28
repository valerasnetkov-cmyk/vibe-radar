import { describe, expect, it } from "vitest";
import type { getDatabase } from "@/server/db/client";
import {
  mechanicEvidence,
  mechanicReviews,
  productMechanics,
  projects,
  providerIdentities,
} from "@/server/db/schema";
import { listPublicMechanics } from "@/server/modules/mechanics/public-read-model";

type FakeDatabase = ReturnType<typeof getDatabase>;

const MECHANIC_ID = "00000000-0000-4000-8000-0000000000f1";
const PROJECT_ID = "00000000-0000-4000-8000-0000000000f2";
const AT = new Date("2026-09-18T00:00:00Z");

function eligibleMechanic(overrides: Record<string, unknown> = {}) {
  return {
    id: MECHANIC_ID,
    canonicalName: "Approval checkpoints",
    description: "A repeated approval interaction pattern.",
    stage: "RISING",
    velocity: 55,
    confidence: 60,
    status: "ACTIVE",
    affectedCategories: ["agents"],
    practicalImplications: ["Add explicit human control"],
    risks: ["May slow automation"],
    lastObservedAt: AT,
    ...overrides,
  };
}

function makeDatabase(options: {
  mechanics?: Record<string, unknown>[];
  evidence?: Record<string, unknown>[];
  reviews?: Record<string, unknown>[];
  projectRows?: Record<string, unknown>[];
  identities?: Record<string, unknown>[];
}): FakeDatabase {
  const chain = (rows: unknown[]): unknown => ({
    where: () => chain(rows),
    orderBy: () => chain(rows),
    limit: (count?: number) =>
      Promise.resolve(typeof count === "number" ? rows.slice(0, count) : rows),
    then: (resolve: (value: unknown[]) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve, reject),
  });
  const tables = new Map<unknown, unknown[]>([
    [productMechanics, options.mechanics ?? [eligibleMechanic()]],
    [
      mechanicEvidence,
      options.evidence ?? [
        {
          mechanicId: MECHANIC_ID,
          projectId: PROJECT_ID,
          independenceGroup: `project:${PROJECT_ID}`,
          independenceBasis: "project",
          observedAt: AT,
        },
        {
          mechanicId: MECHANIC_ID,
          projectId: "00000000-0000-4000-8000-0000000000f3",
          independenceGroup: "project:00000000-0000-4000-8000-0000000000f3",
          independenceBasis: "project",
          observedAt: AT,
        },
      ],
    ],
    [mechanicReviews, options.reviews ?? [{ mechanicId: MECHANIC_ID, decision: "APPROVE" }]],
    [
      projects,
      options.projectRows ?? [
        { id: PROJECT_ID, name: "Tool One", slug: "tool-one" },
        { id: "00000000-0000-4000-8000-0000000000f3", name: "Tool Two", slug: "tool-two" },
      ],
    ],
    [
      providerIdentities,
      options.identities ?? [
        { projectId: PROJECT_ID, providerUrl: "https://github.com/acme/one" },
        {
          projectId: "00000000-0000-4000-8000-0000000000f3",
          providerUrl: "javascript:alert(1)",
        },
      ],
    ],
  ]);
  return {
    select: () => ({ from: (table: unknown) => chain(tables.get(table) ?? []) }),
  } as unknown as FakeDatabase;
}

describe("public mechanic projection", () => {
  it("publishes eligible mechanics with traceable sources", async () => {
    const mechanics = await listPublicMechanics(makeDatabase({}));
    expect(mechanics).toHaveLength(1);
    expect(mechanics[0]?.independentSourceCount).toBe(2);
    expect(mechanics[0]?.sources).toHaveLength(1);
    expect(mechanics[0]?.sources[0]?.projectUrl).toBe("https://github.com/acme/one");
  });

  it("hides single-source, unreviewed, and archived mechanics", async () => {
    const singleSource = makeDatabase({
      evidence: [
        {
          mechanicId: MECHANIC_ID,
          projectId: PROJECT_ID,
          independenceGroup: `project:${PROJECT_ID}`,
          independenceBasis: "project",
          observedAt: AT,
        },
      ],
    });
    expect(await listPublicMechanics(singleSource)).toEqual([]);

    const unreviewed = makeDatabase({ reviews: [] });
    expect(await listPublicMechanics(unreviewed)).toEqual([]);

    const archived = makeDatabase({ mechanics: [eligibleMechanic({ status: "ARCHIVED" })] });
    expect(await listPublicMechanics(archived)).toEqual([]);
  });

  it("exposes no internal metadata and only HTTP(S) links", async () => {
    const mechanics = await listPublicMechanics(makeDatabase({}));
    const serialized = JSON.stringify(mechanics);
    expect(serialized).not.toContain("editorActorId");
    expect(serialized).not.toContain("review note");
    expect(serialized).not.toContain("evidenceKey");
    expect(serialized).not.toContain("independenceGroup");
    expect(serialized).not.toContain("javascript:");
    expect(serialized).not.toContain("bot");
    const keys = Object.keys(mechanics[0] ?? {}).sort();
    expect(keys).toEqual(
      [
        "id",
        "name",
        "description",
        "stage",
        "velocity",
        "confidence",
        "independentSourceCount",
        "evidenceCount",
        "categories",
        "practicalImplications",
        "risks",
        "lastObservedAt",
        "sources",
      ].sort(),
    );
  });

  it("renders one project once even with repeated observations", async () => {
    const repeated = makeDatabase({
      evidence: [
        {
          mechanicId: MECHANIC_ID,
          projectId: PROJECT_ID,
          independenceGroup: `project:${PROJECT_ID}`,
          independenceBasis: "project",
          observedAt: AT,
        },
        {
          mechanicId: MECHANIC_ID,
          projectId: PROJECT_ID,
          independenceGroup: `project:${PROJECT_ID}`,
          independenceBasis: "project",
          observedAt: AT,
        },
        {
          mechanicId: MECHANIC_ID,
          projectId: "00000000-0000-4000-8000-0000000000f3",
          independenceGroup: "project:00000000-0000-4000-8000-0000000000f3",
          independenceBasis: "project",
          observedAt: AT,
        },
      ],
      identities: [
        { projectId: PROJECT_ID, providerUrl: "https://github.com/acme/one" },
        {
          projectId: "00000000-0000-4000-8000-0000000000f3",
          providerUrl: "https://github.com/acme/two",
        },
      ],
    });
    const mechanics = await listPublicMechanics(repeated);
    expect(mechanics[0]?.sources).toHaveLength(2);
    expect(mechanics[0]?.independentSourceCount).toBe(2);
  });
});
