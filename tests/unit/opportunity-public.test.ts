import { describe, expect, it } from "vitest";
import type { getDatabase } from "@/server/db/client";
import {
  candidates,
  opportunities,
  opportunityEvidence,
  opportunityReviews,
  projects,
  providerIdentities,
  publications,
} from "@/server/db/schema";
import { listPublicOpportunities } from "@/server/modules/opportunities/public-read-model";

type FakeDatabase = ReturnType<typeof getDatabase>;

const OPPORTUNITY_ID = "00000000-0000-4000-8000-0000000000d1";
const PROJECT_ID = "00000000-0000-4000-8000-0000000000d2";

const PUBLISHED_PAYLOAD = {
  candidateId: "00000000-0000-4000-8000-0000000000d3",
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

function publishedRow(overrides: Record<string, unknown> = {}) {
  return {
    id: OPPORTUNITY_ID,
    title: "Approval gateway",
    problemStatement: "Builders need safe privileged approvals.",
    proposedProduct: "A focused approval gateway.",
    targetUser: "Small teams",
    marketScope: "GLOBAL",
    buildabilityLabel: "SMALL_TEAM",
    requiredCapabilities: ["Backend API"],
    opportunityConfidence: 60,
    differentiationHypothesis: "Narrow developer workflows.",
    riskSummary: ["Auth design"],
    status: "PUBLISHED",
    publishedAt: new Date("2026-09-18T00:00:00Z"),
    ...overrides,
  };
}

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
    [opportunities, [publishedRow()]],
    [opportunityReviews, [{ opportunityId: OPPORTUNITY_ID, decision: "APPROVE" }]],
    [
      opportunityEvidence,
      [
        {
          opportunityId: OPPORTUNITY_ID,
          subjectType: "PROJECT",
          subjectId: PROJECT_ID,
          rationale: "Sustained adoption.",
        },
      ],
    ],
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
  ]);
}

describe("public opportunity projection", () => {
  it("publishes eligible reviewed opportunities with safe evidence", async () => {
    const visible = await listPublicOpportunities(makeDatabase(baseTables()));
    expect(visible).toHaveLength(1);
    expect(visible[0]?.title).toBe("Approval gateway");
    expect(visible[0]?.buildabilityLabel).toBe("SMALL_TEAM");
    expect(visible[0]?.evidence).toEqual([
      {
        kind: "PROJECT",
        name: "Acme Tool",
        slug: "acme-tool",
        url: "https://github.com/acme/tool",
        confidence: 80,
      },
    ]);
  });

  it("hides rows without latest APPROVE and below-threshold confidence", async () => {
    const rejectedTables = baseTables();
    rejectedTables.set(opportunityReviews, [{ opportunityId: OPPORTUNITY_ID, decision: "REJECT" }]);
    expect(await listPublicOpportunities(makeDatabase(rejectedTables))).toEqual([]);

    const unreviewedTables = baseTables();
    unreviewedTables.set(opportunityReviews, []);
    expect(await listPublicOpportunities(makeDatabase(unreviewedTables))).toEqual([]);

    const weakTables = baseTables();
    weakTables.set(opportunities, [publishedRow({ opportunityConfidence: 40 })]);
    expect(await listPublicOpportunities(makeDatabase(weakTables))).toEqual([]);
  });

  it("exposes no internal metadata and keeps prose as inert data", async () => {
    const hostileTables = baseTables();
    hostileTables.set(opportunities, [
      publishedRow({
        title: '<script>alert("x")</script>',
        differentiationHypothesis: "A <b>bold</b> claim.",
      }),
    ]);
    const visible = await listPublicOpportunities(makeDatabase(hostileTables));
    expect(visible).toHaveLength(1);
    // The projection carries hostile prose as plain data fields only: no
    // html/href/script carriers exist, so React escaping renders it inert.
    expect(visible[0]?.title).toBe('<script>alert("x")</script>');
    const serialized = JSON.stringify(visible);
    expect(serialized).not.toContain("editorActorId");
    expect(serialized).not.toContain("review note");
    expect(serialized).not.toContain("evidenceKey");
    expect(serialized).not.toContain("buildabilityAssessmentId");
    expect(serialized).not.toContain("javascript:");
    const keys = Object.keys(visible[0] ?? {}).sort();
    expect(keys).toEqual(
      [
        "id",
        "title",
        "problemStatement",
        "proposedProduct",
        "targetUser",
        "marketScope",
        "buildabilityLabel",
        "requiredCapabilities",
        "confidence",
        "differentiation",
        "risks",
        "evidence",
        "publishedAt",
      ].sort(),
    );
  });
});
