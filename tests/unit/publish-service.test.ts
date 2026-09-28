import { describe, expect, it, vi } from "vitest";
import type { getDatabase } from "@/server/db/client";
import {
  analyses,
  buildabilityAssessments,
  candidates,
  confidenceAssessments,
  editorialDecisions,
  projects,
  providerIdentities,
  publications,
  scores,
} from "@/server/db/schema";
import { publishApprovedCandidate } from "@/server/modules/publishing/service";
import { TelegramPublishError } from "@/server/modules/telegram/publisher";
import { renderTelegramHtml } from "@/server/modules/telegram/renderer";

type FakeDatabase = ReturnType<typeof getDatabase>;

const CANDIDATE_ID = "00000000-0000-4000-8000-000000000020";
const PROJECT_ID = "00000000-0000-4000-8000-000000000021";
const SCORE_ID = "00000000-0000-4000-8000-000000000022";
const DECISION_ID = "00000000-0000-4000-8000-000000000023";
const ANALYSIS_ID = "00000000-0000-4000-8000-000000000024";
const PUBLICATION_ID = "00000000-0000-4000-8000-000000000025";
const CHANNEL = "@test-channel";

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

function approvedTables(): Map<unknown, unknown[]> {
  return new Map<unknown, unknown[]>([
    [candidates, [{ projectId: PROJECT_ID, scoreId: SCORE_ID, status: "APPROVED" }]],
    [editorialDecisions, [{ id: DECISION_ID, decision: "APPROVE" }]],
    [projects, [{ name: "Acme Tool", slug: "acme-tool" }]],
    [providerIdentities, [{ providerUrl: "https://github.com/acme/tool" }]],
    [scores, [{ id: SCORE_ID, finalScore: 72, scoreVersion: 1 }]],
    [confidenceAssessments, [{ value: 80, level: "HIGH", confidenceVersion: 1 }]],
    [analyses, [{ id: ANALYSIS_ID, status: "SUCCEEDED", output: ANALYSIS_OUTPUT }]],
    [buildabilityAssessments, []],
    [publications, []],
  ]);
}

function makeDatabase(options: {
  tables?: Map<unknown, unknown[]>;
  freshClaim?: Record<string, unknown> | null;
  existingPublication?: Record<string, unknown> | null;
  reclaimRow?: Record<string, unknown> | null;
  failTransaction?: boolean;
}): { database: FakeDatabase; updateSets: Record<string, unknown>[]; inserted: unknown[] } {
  const tables = options.tables ?? approvedTables();
  const updateSets: Record<string, unknown>[] = [];
  const inserted: unknown[] = [];
  const chain = (rows: unknown[]): unknown => ({
    where: () => chain(rows),
    orderBy: () => chain(rows),
    limit: (count?: number) =>
      Promise.resolve(typeof count === "number" ? rows.slice(0, count) : rows),
  });
  const updateStub = () => ({
    set: (values: Record<string, unknown>) => {
      updateSets.push(values);
      // The atomic retry re-claim is the only update shaped exactly as
      // { status: "pending", updatedAt }; every other update resolves empty.
      const isReclaim =
        values.status === "pending" &&
        values.lastErrorCode === undefined &&
        !("providerMessageId" in values) &&
        !("attemptCount" in values);
      const rows = isReclaim ? (options.reclaimRow ? [options.reclaimRow] : []) : [];
      const execute = async () => {
        if (values.status === "published" && options.failTransaction) {
          throw new Error("database unavailable after delivery");
        }
        return rows;
      };
      return {
        where: () => ({
          returning: execute,
          then: (resolve: (value: unknown[]) => unknown, reject: (reason: unknown) => unknown) =>
            execute().then(resolve, reject),
        }),
      };
    },
  });
  const database = {
    select: () => ({
      from: (table: unknown) => {
        if (table === publications && options.existingPublication !== undefined) {
          const rows = options.existingPublication ? [options.existingPublication] : [];
          return chain(rows);
        }
        return chain(tables.get(table) ?? []);
      },
    }),
    insert: () => ({
      values: (values: unknown) => {
        inserted.push(values);
        return {
          onConflictDoNothing: () => ({
            returning: async () =>
              options.freshClaim === null || options.freshClaim === undefined
                ? []
                : [{ id: PUBLICATION_ID, ...options.freshClaim }],
          }),
        };
      },
    }),
    update: updateStub,
    transaction: async (work: (tx: unknown) => Promise<void>) => {
      await work({ update: updateStub });
    },
  };
  return { database: database as unknown as FakeDatabase, updateSets, inserted };
}

const publisher = (providerMessageId = "tg-1") => ({
  publish: vi.fn(async () => ({ providerMessageId })),
});

describe("publication approval gate", () => {
  it("publishes only APPROVED candidates with their own APPROVE decision", async () => {
    const { database } = makeDatabase({
      freshClaim: { candidateId: CANDIDATE_ID, status: "pending", attemptCount: 0 },
    });
    const pub = publisher();
    const outcome = await publishApprovedCandidate(CANDIDATE_ID, {
      database,
      channel: CHANNEL,
      publisher: pub,
    });
    expect(outcome).toEqual({ outcome: "published", providerMessageId: "tg-1" });
    expect(pub.publish).toHaveBeenCalledTimes(1);
  });

  it("rejects non-approved candidates without calling the provider", async () => {
    const tables = approvedTables();
    tables.set(candidates, [{ projectId: PROJECT_ID, scoreId: SCORE_ID, status: "REVIEW" }]);
    const { database } = makeDatabase({ tables });
    const pub = publisher();
    const outcome = await publishApprovedCandidate(CANDIDATE_ID, {
      database,
      channel: CHANNEL,
      publisher: pub,
    });
    expect(outcome).toEqual({ outcome: "rejected", reason: "not_approved" });
    expect(pub.publish).not.toHaveBeenCalled();
  });

  it("rejects WATCHING candidates and foreign approval decisions", async () => {
    const watchingTables = approvedTables();
    watchingTables.set(candidates, [
      { projectId: PROJECT_ID, scoreId: SCORE_ID, status: "WATCHING" },
    ]);
    const watching = makeDatabase({ tables: watchingTables });
    const pub = publisher();
    expect(
      await publishApprovedCandidate(CANDIDATE_ID, {
        database: watching.database,
        channel: CHANNEL,
        publisher: pub,
      }),
    ).toEqual({ outcome: "rejected", reason: "not_approved" });

    // A decision row for another candidate never authorizes this one: the
    // service only reads decisions bound to the requested candidate id.
    const undecided = makeDatabase({
      tables: (() => {
        const tables = approvedTables();
        tables.set(editorialDecisions, []);
        return tables;
      })(),
    });
    expect(
      await publishApprovedCandidate(CANDIDATE_ID, {
        database: undecided.database,
        channel: CHANNEL,
        publisher: pub,
      }),
    ).toEqual({ outcome: "rejected", reason: "missing_approval_decision" });
    expect(pub.publish).not.toHaveBeenCalled();
  });

  it("derives public content server-side; callers cannot inject HTML or channel state", async () => {
    const { database, inserted } = makeDatabase({
      freshClaim: { candidateId: CANDIDATE_ID, status: "pending", attemptCount: 0 },
    });
    const pub = publisher();
    await publishApprovedCandidate(CANDIDATE_ID, {
      database,
      channel: CHANNEL,
      publisher: pub,
    });
    const [, html] = pub.publish.mock.calls[0]! as unknown as [string, string];
    expect((pub.publish.mock.calls[0]! as unknown as [string, string])[0]).toBe(CHANNEL);
    expect(html).toContain("Acme Tool");
    expect(html).toContain("https://github.com/acme/tool");
    expect(html).not.toContain("<script>");
    const snapshot = inserted[0] as Record<string, unknown>;
    expect(snapshot.editorialDecisionId).toBe(DECISION_ID);
    expect((snapshot.contentPayload as Record<string, unknown>).title).toBe("Acme Tool");
  });
});

describe("publication claim and retry ownership", () => {
  it("does not resend already-published rows", async () => {
    const { database } = makeDatabase({
      freshClaim: null,
      existingPublication: {
        id: PUBLICATION_ID,
        candidateId: CANDIDATE_ID,
        status: "published",
        attemptCount: 1,
        providerMessageId: "tg-1",
      },
    });
    const pub = publisher();
    const outcome = await publishApprovedCandidate(CANDIDATE_ID, {
      database,
      channel: CHANNEL,
      publisher: pub,
    });
    expect(outcome).toEqual({ outcome: "already_published" });
    expect(pub.publish).not.toHaveBeenCalled();
  });

  it("treats foreign pending rows as busy without resending", async () => {
    const { database } = makeDatabase({
      freshClaim: null,
      existingPublication: {
        id: PUBLICATION_ID,
        candidateId: CANDIDATE_ID,
        status: "pending",
        attemptCount: 0,
      },
    });
    const pub = publisher();
    const outcome = await publishApprovedCandidate(CANDIDATE_ID, {
      database,
      channel: CHANNEL,
      publisher: pub,
    });
    expect(outcome).toEqual({ outcome: "busy" });
    expect(pub.publish).not.toHaveBeenCalled();
  });

  it("requires atomic ownership for failed retries", async () => {
    const failedRow = {
      id: PUBLICATION_ID,
      candidateId: CANDIDATE_ID,
      status: "failed",
      attemptCount: 1,
      contentPayload: {
        candidateId: CANDIDATE_ID,
        contentVersion: "v".repeat(64),
        title: "Acme Tool",
        format: "FRESH",
        shortSummary: "Fast bundler with real benchmarks",
        whyNow: "Adoption is accelerating",
        keyPoints: ["build pipelines"],
        audience: ["frontend teams"],
        limitations: ["young ecosystem"],
        projectSlug: "acme-tool",
        projectUrl: "https://github.com/acme/tool",
        score: 72,
        scoreVersion: 1,
        confidence: 80,
        confidenceLevel: "HIGH",
        sources: [{ label: "Acme Tool", url: "https://github.com/acme/tool" }],
        outscanRelevance: "NONE",
      },
    };
    const loser = makeDatabase({
      freshClaim: null,
      existingPublication: failedRow,
      reclaimRow: null,
    });
    const losingPublisher = publisher();
    const lost = await publishApprovedCandidate(CANDIDATE_ID, {
      database: loser.database,
      channel: CHANNEL,
      publisher: losingPublisher,
    });
    expect(lost).toEqual({ outcome: "busy" });
    expect(losingPublisher.publish).not.toHaveBeenCalled();

    const winner = makeDatabase({
      freshClaim: null,
      existingPublication: failedRow,
      reclaimRow: { ...failedRow, status: "pending" },
    });
    const winningPublisher = publisher("tg-retry");
    const won = await publishApprovedCandidate(CANDIDATE_ID, {
      database: winner.database,
      channel: CHANNEL,
      publisher: winningPublisher,
    });
    expect(won).toEqual({ outcome: "published", providerMessageId: "tg-retry" });
    // The retry republishes the persisted immutable snapshot.
    const [, html] = winningPublisher.publish.mock.calls[0]! as unknown as [string, string];
    expect(html).toBe(renderTelegramHtml(failedRow.contentPayload as never));
  });

  it("records safe provider failures with bounded attempts", async () => {
    const { database, updateSets } = makeDatabase({
      freshClaim: { candidateId: CANDIDATE_ID, status: "pending", attemptCount: 0 },
    });
    const failing = {
      publish: vi.fn(async () => {
        throw new TelegramPublishError("TELEGRAM_PUBLISH_TIMEOUT");
      }),
    };
    const outcome = await publishApprovedCandidate(CANDIDATE_ID, {
      database,
      channel: CHANNEL,
      publisher: failing,
    });
    expect(outcome).toEqual({ outcome: "failed", errorCode: "TELEGRAM_PUBLISH_TIMEOUT" });
    expect(updateSets.some((values) => values.status === "failed")).toBe(true);
    expect(updateSets.some((values) => values.lastErrorCode === "TELEGRAM_PUBLISH_TIMEOUT")).toBe(
      true,
    );
  });

  it("persists providerMessageId on success and blocks resend after finalization failure", async () => {
    const success = makeDatabase({
      freshClaim: { candidateId: CANDIDATE_ID, status: "pending", attemptCount: 0 },
    });
    const pub = publisher("tg-7");
    const first = await publishApprovedCandidate(CANDIDATE_ID, {
      database: success.database,
      channel: CHANNEL,
      publisher: pub,
    });
    expect(first).toEqual({ outcome: "published", providerMessageId: "tg-7" });
    expect(
      success.updateSets.some(
        (values) => values.status === "published" && values.providerMessageId === "tg-7",
      ),
    ).toBe(true);

    const broken = makeDatabase({
      freshClaim: { candidateId: CANDIDATE_ID, status: "pending", attemptCount: 0 },
      failTransaction: true,
    });
    const second = await publishApprovedCandidate(CANDIDATE_ID, {
      database: broken.database,
      channel: CHANNEL,
      publisher: pub,
    });
    expect(second).toEqual({ outcome: "finalization_failed", providerMessageId: "tg-7" });
    expect(broken.updateSets.some((values) => values.status === "failed")).toBe(false);

    const retry = makeDatabase({
      freshClaim: null,
      existingPublication: {
        id: PUBLICATION_ID,
        candidateId: CANDIDATE_ID,
        status: "pending",
        attemptCount: 0,
        lastErrorCode: "FINALIZATION_FAILED",
      },
    });
    const third = await publishApprovedCandidate(CANDIDATE_ID, {
      database: retry.database,
      channel: CHANNEL,
      publisher: pub,
    });
    expect(third).toEqual({ outcome: "busy" });
    expect(pub.publish).toHaveBeenCalledTimes(2);
  });
});
