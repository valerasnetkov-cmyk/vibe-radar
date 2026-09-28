import { describe, expect, it } from "vitest";
import type { getDatabase } from "@/server/db/client";
import {
  analyses,
  buildabilityAssessments,
  candidates,
  confidenceAssessments,
  editorialDecisions,
  projects,
  providerIdentities,
  scores,
} from "@/server/db/schema";
import { buildContentModelForApprovedCandidate } from "@/server/modules/content/builder";
import { computeContentVersion } from "@/server/modules/content/model";

type FakeDatabase = ReturnType<typeof getDatabase>;

const CANDIDATE_ID = "00000000-0000-4000-8000-000000000010";
const PROJECT_ID = "00000000-0000-4000-8000-000000000011";
const SCORE_ID = "00000000-0000-4000-8000-000000000012";
const DECISION_ID = "00000000-0000-4000-8000-000000000013";
const ANALYSIS_ID = "00000000-0000-4000-8000-000000000014";

const ANALYSIS_OUTPUT = {
  summary: "Fast bundler with real benchmarks",
  why_interesting: "Adoption is accelerating",
  use_cases: ["build pipelines"],
  audience: ["frontend teams"],
  limitations: ["young ecosystem"],
  categories: ["devtools"],
  content_angles: ["speed"],
  outscan_relevance: "NONE" as const,
};

function baseTables(overrides: Map<unknown, unknown[]> = new Map()): Map<unknown, unknown[]> {
  const tables = new Map<unknown, unknown[]>([
    [candidates, [{ projectId: PROJECT_ID, scoreId: SCORE_ID, status: "APPROVED" }]],
    [editorialDecisions, [{ id: DECISION_ID, decision: "APPROVE" }]],
    [projects, [{ name: "Acme Tool", slug: "acme-tool" }]],
    [providerIdentities, [{ providerUrl: "https://github.com/acme/tool" }]],
    [scores, [{ id: SCORE_ID, finalScore: 72, scoreVersion: 1 }]],
    [confidenceAssessments, [{ value: 80, level: "HIGH", confidenceVersion: 1 }]],
    [analyses, [{ id: ANALYSIS_ID, status: "SUCCEEDED", output: ANALYSIS_OUTPUT }]],
    [buildabilityAssessments, []],
  ]);
  for (const [table, rows] of overrides) tables.set(table, rows);
  return tables;
}

function makeDatabase(tables: Map<unknown, unknown[]>): FakeDatabase {
  const chain = (rows: unknown[]): unknown => ({
    where: () => chain(rows),
    orderBy: () => chain(rows),
    limit: (count?: number) =>
      Promise.resolve(typeof count === "number" ? rows.slice(0, count) : rows),
  });
  return {
    select: () => ({ from: (table: unknown) => chain(tables.get(table) ?? []) }),
  } as unknown as FakeDatabase;
}

describe("ContentModel builder from persisted records", () => {
  it("builds a valid model from persisted title, url, score, and confidence", async () => {
    const database = makeDatabase(baseTables());
    const result = await buildContentModelForApprovedCandidate(database, CANDIDATE_ID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.model.title).toBe("Acme Tool");
    expect(result.model.projectSlug).toBe("acme-tool");
    expect(result.model.projectUrl).toBe("https://github.com/acme/tool");
    expect(result.model.shortSummary).toBe("Fast bundler with real benchmarks");
    expect(result.model.score).toBe(72);
    expect(result.model.confidence).toBe(80);
    expect(result.model.sources).toEqual([
      { label: "Acme Tool", url: "https://github.com/acme/tool" },
    ]);
    expect(result.approvalDecisionId).toBe(DECISION_ID);
  });

  it("produces a stable contentVersion across identical rebuilds", async () => {
    const database = makeDatabase(baseTables());
    const first = await buildContentModelForApprovedCandidate(database, CANDIDATE_ID);
    const second = await buildContentModelForApprovedCandidate(database, CANDIDATE_ID);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.model.contentVersion).toBe(second.model.contentVersion);
    expect(first.model.contentVersion).toBe(
      computeContentVersion({
        candidateId: CANDIDATE_ID,
        analysisId: ANALYSIS_ID,
        scoreId: SCORE_ID,
        scoreVersion: 1,
        confidenceVersion: 1,
      }),
    );
  });

  it("rejects non-approved candidates and missing approval decisions", async () => {
    const reviewing = makeDatabase(
      baseTables(
        new Map([[candidates, [{ projectId: PROJECT_ID, scoreId: SCORE_ID, status: "REVIEW" }]]]),
      ),
    );
    expect(await buildContentModelForApprovedCandidate(reviewing, CANDIDATE_ID)).toEqual({
      ok: false,
      reason: "not_approved",
    });
    const unknown = makeDatabase(baseTables(new Map([[candidates, []]])));
    expect(await buildContentModelForApprovedCandidate(unknown, CANDIDATE_ID)).toEqual({
      ok: false,
      reason: "not_approved",
    });
    const rejected = makeDatabase(
      baseTables(new Map([[editorialDecisions, [{ id: "other", decision: "REJECT" }]]])),
    );
    expect(await buildContentModelForApprovedCandidate(rejected, CANDIDATE_ID)).toEqual({
      ok: false,
      reason: "missing_approval_decision",
    });
    const undecided = makeDatabase(baseTables(new Map([[editorialDecisions, []]])));
    expect(await buildContentModelForApprovedCandidate(undecided, CANDIDATE_ID)).toEqual({
      ok: false,
      reason: "missing_approval_decision",
    });
  });

  it("never fabricates missing values and reports deterministic reasons", async () => {
    const cases: Array<[Map<unknown, unknown[]>, string]> = [
      [new Map([[projects, []]]), "missing_project"],
      [new Map([[providerIdentities, []]]), "missing_provider_url"],
      [new Map([[scores, []]]), "missing_score"],
      [new Map([[confidenceAssessments, []]]), "missing_confidence"],
      [new Map([[analyses, []]]), "missing_analysis"],
      [
        new Map([[analyses, [{ id: ANALYSIS_ID, status: "ANALYSIS_FAILED", output: null }]]]),
        "missing_analysis",
      ],
      [
        new Map([[analyses, [{ id: ANALYSIS_ID, status: "SUCCEEDED", output: { summary: "" } }]]]),
        "invalid_analysis",
      ],
    ];
    for (const [override, reason] of cases) {
      const database = makeDatabase(baseTables(override));
      expect(await buildContentModelForApprovedCandidate(database, CANDIDATE_ID)).toEqual({
        ok: false,
        reason,
      });
    }
  });
});
