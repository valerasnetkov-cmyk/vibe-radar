import { describe, expect, it } from "vitest";
import type { getDatabase } from "@/server/db/client";
import {
  aiDailyUsage,
  candidates,
  editorialReviewDispatches,
  jobRuns,
  publicationEvents,
  publications,
} from "@/server/db/schema";
import { listReconciliationItems } from "@/server/modules/operations/reconciliation";
import { getOperationalSummary } from "@/server/modules/operations/summary";

type FakeDatabase = ReturnType<typeof getDatabase>;

function makeDatabase(queues: Map<unknown, unknown[][]>): FakeDatabase {
  const chain = (rows: unknown[]): unknown => ({
    where: () => chain(rows),
    orderBy: () => chain(rows),
    groupBy: () => chain(rows),
    limit: (count?: number) =>
      Promise.resolve(typeof count === "number" ? rows.slice(0, count) : rows),
    then: (resolve: (value: unknown[]) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve, reject),
  });
  return {
    select: () => ({
      from: (table: unknown) => {
        const queue = queues.get(table);
        return chain(queue && queue.length ? (queue.shift() ?? []) : []);
      },
    }),
  } as unknown as FakeDatabase;
}

describe("reconciliation visibility", () => {
  it("lists blocked rows with internal ids only", async () => {
    const at = new Date("2026-09-18T10:00:00Z");
    const database = makeDatabase(
      new Map<unknown, unknown[][]>([
        [editorialReviewDispatches, [[{ candidateId: "cand-1", updatedAt: at, attemptCount: 2 }]]],
        [publications, [[{ id: "pub-1", candidateId: "cand-2", updatedAt: at, attemptCount: 1 }]]],
      ]),
    );
    const items = await listReconciliationItems(database);
    expect(items).toEqual([
      {
        kind: "dispatch",
        id: "cand-1",
        candidateId: "cand-1",
        updatedAt: at.toISOString(),
        attemptCount: 2,
      },
      {
        kind: "publication",
        id: "pub-1",
        candidateId: "cand-2",
        updatedAt: at.toISOString(),
        attemptCount: 1,
      },
    ]);
    const serialized = JSON.stringify(items);
    expect(serialized).not.toContain("content_payload");
    expect(serialized).not.toContain("bot");
    expect(serialized).not.toContain("editor");
    expect(serialized).not.toContain("token");
  });
});

describe("durable operational summary", () => {
  it("aggregates observed rows without inventing metrics", async () => {
    const at = new Date("2026-09-18T10:00:00Z");
    const database = makeDatabase(
      new Map<unknown, unknown[][]>([
        [
          jobRuns,
          [
            [
              { jobName: "publication", status: "SUCCEEDED", runs: 2, attempts: 2 },
              { jobName: "publication", status: "DEAD_LETTER", runs: 1, attempts: 3 },
              { jobName: "score-calculation", status: "RUNNING", runs: 1, attempts: 0 },
            ],
            [{ jobName: "publication", at }],
            [{ jobName: "publication", at }],
          ],
        ],
        [aiDailyUsage, [[{ usedCount: 7 }]]],
        [
          publications,
          [
            [
              { status: "published", count: 4 },
              { status: "failed", count: 1 },
              { status: "pending", count: 2 },
            ],
            [{ candidateId: "cand-p1" }, { candidateId: "cand-p2" }],
            [],
          ],
        ],
        [
          candidates,
          [
            [
              { status: "CANDIDATE", count: 5 },
              { status: "REVIEW", count: 3 },
              { status: "APPROVED", count: 2 },
            ],
            [{ id: "cand-p1" }, { id: "cand-unpublished" }],
          ],
        ],
        [publicationEvents, [[{ count: 4 }]]],
        [editorialReviewDispatches, [[{ candidateId: "cand-9", updatedAt: at, attemptCount: 1 }]]],
      ]),
    );
    const summary = await getOperationalSummary(database, { aiLimit: 50, day: "2026-09-18" });
    const publication = summary.jobs.find((job) => job.jobName === "publication");
    expect(publication).toMatchObject({
      succeeded: 2,
      deadLetter: 1,
      totalAttempts: 5,
      lastSuccessAt: at.toISOString(),
      lastFailureAt: at.toISOString(),
    });
    expect(summary.jobs.find((job) => job.jobName === "score-calculation")).toMatchObject({
      running: 1,
    });
    expect(summary.aiBudget).toEqual({ day: "2026-09-18", limit: 50, used: 7, remaining: 43 });
    expect(summary.publications).toEqual({ published: 4, failed: 1, pending: 2 });
    expect(summary.editorial).toEqual({ candidates: 10, review: 3, approvedBacklog: 1 });
    expect(summary.analytics).toEqual({ deliveredEvents: 4 });
    expect(summary.reconciliation).toEqual({ items: 1 });
  });
});
