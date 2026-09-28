import { describe, expect, it } from "vitest";
import type { getDatabase } from "@/server/db/client";
import {
  buildabilityAssessments,
  candidates,
  opportunities,
  opportunityEvidence,
  opportunityReviews,
  projects,
  publications,
} from "@/server/db/schema";
import {
  publishOpportunity,
  submitOpportunityProposal,
} from "@/server/modules/opportunities/repository";
import { reviewOpportunity } from "@/server/modules/opportunities/review";

type FakeDatabase = ReturnType<typeof getDatabase>;

const PROJECT_ID = "00000000-0000-4000-8000-0000000000e1";
const ASSESSMENT_ID = "00000000-0000-4000-8000-0000000000e2";

const PUBLISHED_PAYLOAD = {
  candidateId: "00000000-0000-4000-8000-0000000000e3",
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
  confidence: 90,
  confidenceLevel: "HIGH",
  sources: [{ label: "acme/tool", url: "https://github.com/acme/tool" }],
  outscanRelevance: "NONE",
};

const PROPOSAL = {
  title: "Approval gateway",
  problemStatement: "Builders need safe privileged approvals.",
  proposedProduct: "A focused approval gateway.",
  targetUser: "Small teams",
  marketScope: "GLOBAL" as const,
  requiredCapabilities: ["Backend API"],
  differentiationHypothesis: "Narrow developer workflows.",
  riskSummary: ["Auth design"],
  evidence: [
    {
      sourceType: "PROJECT" as const,
      sourceId: PROJECT_ID,
      rationale: "Sustained independent adoption.",
    },
  ],
};

function makeDatabase(options: { assessments?: unknown[] } = {}): {
  database: FakeDatabase;
  opportunityInserts: unknown[];
  updateSets: unknown[];
} {
  const opportunityInserts: unknown[] = [];
  const updateSets: unknown[] = [];
  const oppRows: Record<string, unknown>[] = [];
  const evRows: Record<string, unknown>[] = [];
  const revRows: Record<string, unknown>[] = [];
  const staticTables = new Map<unknown, unknown[]>([
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
    [buildabilityAssessments, options.assessments ?? [{ id: ASSESSMENT_ID, label: "SMALL_TEAM" }]],
    [opportunityReviews, []],
  ]);
  const chain = (rows: unknown[]): unknown => ({
    where: () => chain(rows),
    orderBy: () => chain(rows),
    limit: (count?: number) =>
      Promise.resolve(typeof count === "number" ? rows.slice(0, count) : rows),
    then: (resolve: (value: unknown[]) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve, reject),
  });
  const database = {
    select: () => ({
      from: (table: unknown) => {
        if (table === opportunities) return chain(oppRows);
        if (table === opportunityEvidence) return chain(evRows);
        if (table === opportunityReviews) return chain(revRows);
        return chain(staticTables.get(table) ?? []);
      },
    }),
    insert: (table: unknown) => ({
      values: (values: unknown) => {
        if (table === opportunities) {
          opportunityInserts.push(values);
          const row = { id: "opp-1", ...(values as Record<string, unknown>) };
          oppRows.push(row);
          return {
            onConflictDoNothing: () => ({ returning: async () => [{ id: "opp-1" }] }),
          };
        }
        if (table === opportunityEvidence) {
          const record = values as Record<string, unknown>;
          if (evRows.some((row) => row.evidenceKey === record.evidenceKey)) {
            return { onConflictDoNothing: () => ({ returning: async () => [] }) };
          }
          evRows.push(record);
          return { onConflictDoNothing: () => ({ returning: async () => [{ id: "ev-1" }] }) };
        }
        if (table === opportunityReviews) {
          const record = values as Record<string, unknown>;
          revRows.push({ ...record, reviewedAt: new Date("2026-09-18T00:00:00Z") });
          return { returning: async () => [{ id: "rev-1" }] };
        }
        return {
          onConflictDoNothing: () => ({ returning: async () => [] }),
          returning: async () => [{ id: "x-1" }],
        };
      },
    }),
    update: () => ({
      set: (values: unknown) => {
        updateSets.push(values);
        return { where: async () => [] };
      },
    }),
  };
  return {
    database: database as unknown as FakeDatabase,
    opportunityInserts,
    updateSets,
  };
}

describe("opportunity submission flow", () => {
  it("derives buildability and confidence server-side on submit", async () => {
    const { database, opportunityInserts } = makeDatabase();
    const result = await submitOpportunityProposal(database, PROPOSAL);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.created).toBe(true);
    expect(result.resolvedSources).toBe(1);
    expect(result.insertedEvidence).toBe(1);
    // Deterministic formula output for one Q=0.9 project with buildability.
    expect(result.confidence).toBe(56);
    const stored = opportunityInserts[0] as Record<string, unknown>;
    expect(stored.buildabilityAssessmentId).toBe(ASSESSMENT_ID);
    expect(stored.buildabilityLabel).toBe("SMALL_TEAM");
    expect(stored.status).toBe("PROPOSED");
  });

  it("refuses submission without trusted buildability or resolvable evidence", async () => {
    const noBuild = makeDatabase({ assessments: [] });
    expect(await submitOpportunityProposal(noBuild.database, PROPOSAL)).toEqual({
      ok: false,
      reason: "missing_buildability",
    });
    expect(noBuild.opportunityInserts).toHaveLength(0);

    // Unknown ids are covered by the resolver tests; here the unsupported
    // SIGNAL class fails closed at the submission boundary instead.
    const noProject = makeDatabase();
    const unsupportedProposal = {
      ...PROPOSAL,
      evidence: [
        {
          sourceType: "SIGNAL" as const,
          sourceId: "00000000-0000-4000-8000-00000000ffff",
          rationale: "Unsupported source class.",
        },
      ],
    };
    expect(await submitOpportunityProposal(noProject.database, unsupportedProposal)).toEqual({
      ok: false,
      reason: "unresolvable_evidence",
    });
  });

  it("returns the same row on retry without duplicating evidence", async () => {
    const { database } = makeDatabase();
    const first = await submitOpportunityProposal(database, PROPOSAL);
    const second = await submitOpportunityProposal(database, PROPOSAL);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.opportunityId).toBe(second.opportunityId);
    expect(second.created).toBe(false);
    expect(second.insertedEvidence).toBe(0);
  });

  it("publishes only eligible reviewed opportunities", async () => {
    const { database, updateSets } = makeDatabase();
    const submitted = await submitOpportunityProposal(database, PROPOSAL);
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;

    const beforeReview = await publishOpportunity(database, submitted.opportunityId);
    expect(beforeReview).toEqual({ ok: false, reason: "not_approved" });

    await reviewOpportunity(database, submitted.opportunityId, "APPROVE", "editor-9");
    const published = await publishOpportunity(database, submitted.opportunityId);
    expect(published).toEqual({ ok: true, opportunityId: submitted.opportunityId });
    expect(
      updateSets.some(
        (values) =>
          (values as Record<string, unknown>).status === "PUBLISHED" &&
          (values as Record<string, unknown>).publishedAt instanceof Date,
      ),
    ).toBe(true);
  });
});
