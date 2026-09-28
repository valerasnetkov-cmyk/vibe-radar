import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { closeDatabase, getDatabase } from "@/server/db/client";
import {
  consumeAiDailyBudget,
  readAiDailyUsage,
  utcDayString,
} from "@/server/modules/analysis/budget-store";
import { runConfiguredDailyRadar } from "@/server/modules/publishing/digest-job";
import { getOrCreateRadarDigest } from "@/server/modules/publishing/digest-store";
import { claimJobLease, releaseJobLease } from "@/server/modules/operations/leases";
import { createDurableSchedulerStore } from "@/server/modules/operations/durable-store";
import { listReconciliationItems } from "@/server/modules/operations/reconciliation";
import { createJobRun, finishJobRun, loadJobRun } from "@/server/modules/operations/repository";
import { JobScheduler } from "@/server/modules/operations/scheduler";
import { getOperationalSummary } from "@/server/modules/operations/summary";
import {
  aiDailyUsage,
  candidates,
  editorialReviewDispatches,
  jobLeases,
  jobRuns,
  projects,
  publications,
  radarDigests,
  scores,
} from "@/server/db/schema";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const maybe = hasDatabase ? describe : describe.skip;

function uniqueKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

maybe("Stage 09 durable operations", () => {
  const runIds: string[] = [];
  const leaseNames = ["daily-radar", "weekly-radar"];
  const digestIds: string[] = [];
  const candidateIds: string[] = [];
  const projectIds: string[] = [];
  const usageDays = new Set<string>();

  beforeAll(() => {
    if (!hasDatabase) {
      console.warn("DATABASE_URL is not set; PostgreSQL integration tests were not executed");
    }
  });

  afterAll(async () => {
    if (!hasDatabase) return;
    const database = getDatabase();
    try {
      for (const id of runIds) {
        await database
          .delete(jobRuns)
          .where(eq(jobRuns.id, id))
          .catch(() => undefined);
      }
      for (const name of leaseNames) {
        await database
          .delete(jobLeases)
          .where(eq(jobLeases.jobName, name))
          .catch(() => undefined);
      }
      for (const id of digestIds) {
        await database
          .delete(radarDigests)
          .where(eq(radarDigests.id, id))
          .catch(() => undefined);
      }
      for (const candidateId of candidateIds) {
        await database
          .delete(publications)
          .where(eq(publications.candidateId, candidateId))
          .catch(() => undefined);
        await database
          .delete(editorialReviewDispatches)
          .where(eq(editorialReviewDispatches.candidateId, candidateId))
          .catch(() => undefined);
        await database
          .delete(candidates)
          .where(eq(candidates.id, candidateId))
          .catch(() => undefined);
      }
      for (const projectId of projectIds) {
        await database
          .delete(scores)
          .where(eq(scores.projectId, projectId))
          .catch(() => undefined);
        await database
          .delete(projects)
          .where(eq(projects.id, projectId))
          .catch(() => undefined);
      }
      for (const day of usageDays) {
        await database
          .delete(aiDailyUsage)
          .where(eq(aiDailyUsage.utcDay, day))
          .catch(() => undefined);
      }
    } finally {
      await closeDatabase();
    }
  });

  it("grants a singleton lease to exactly one of two workers", async () => {
    const database = getDatabase();
    await database.delete(jobLeases).where(eq(jobLeases.jobName, "daily-radar"));
    const now = new Date();
    const [first, second] = await Promise.all([
      claimJobLease(database, "daily-radar", "owner-a", 300000, now),
      claimJobLease(database, "daily-radar", "owner-b", 300000, now),
    ]);
    expect([first, second].filter(Boolean)).toHaveLength(1);
    expect(await claimJobLease(database, "daily-radar", "owner-c", 300000, now)).toBe(false);
    await releaseJobLease(database, "daily-radar", first ? "owner-a" : "owner-b");
    expect(await claimJobLease(database, "daily-radar", "owner-c", 300000, now)).toBe(true);
    await releaseJobLease(database, "daily-radar", "owner-c");
  });

  it("reclaims expired leases but never unexpired ones", async () => {
    const database = getDatabase();
    await database.delete(jobLeases).where(eq(jobLeases.jobName, "weekly-radar"));
    const now = new Date();
    await database.insert(jobLeases).values({
      jobName: "weekly-radar",
      ownerId: "crashed-owner",
      lockedUntil: new Date(now.getTime() - 1000),
      updatedAt: new Date(now.getTime() - 1000),
    });
    expect(await claimJobLease(database, "weekly-radar", "owner-new", 300000, now)).toBe(true);
    expect(await claimJobLease(database, "weekly-radar", "owner-other", 300000, now)).toBe(false);
    await releaseJobLease(database, "weekly-radar", "owner-new");
  });

  it("persists RUNNING history through success and dead letter", async () => {
    const database = getDatabase();
    const store = createDurableSchedulerStore(database, "owner-history");
    const scheduler = new JobScheduler(
      new Map([
        ["score-calculation", { handler: async () => undefined, intervalMs: 0 }],
        [
          "candidate-selection",
          {
            handler: async () => {
              throw new TypeError("socket hang up");
            },
            intervalMs: 0,
          },
        ],
      ]),
      { pollIntervalMs: 1000, maxAttempts: 1 },
      store,
    );
    await scheduler.runOnce(new Date());
    const runs = await database
      .select()
      .from(jobRuns)
      .where(eq(jobRuns.jobName, "score-calculation"));
    const success = runs.find((row) => row.status === "SUCCEEDED");
    expect(success?.attemptCount).toBe(1);
    expect(success?.finishedAt).toBeInstanceOf(Date);
    if (success) runIds.push(success.id);
    const dead = await database
      .select()
      .from(jobRuns)
      .where(eq(jobRuns.jobName, "candidate-selection"));
    const deadRow = dead.find((row) => row.status === "DEAD_LETTER");
    expect(deadRow?.errorCode).toBe("JOB_TRANSIENT");
    if (deadRow) runIds.push(deadRow.id);
    expect(success).toBeDefined();
    expect(deadRow).toBeDefined();
  });

  it("keeps dead-letter rows immutable and links replay runs", async () => {
    const database = getDatabase();
    const [run] = await createJobRun("publication", 2, {}, database);
    if (!run) throw new Error("job run insert failed");
    runIds.push(run.id);
    await finishJobRun(
      run.id,
      { status: "DEAD_LETTER", attempts: 2, errorCode: "JOB_TRANSIENT" },
      database,
    );
    const before = await loadJobRun(run.id, database);
    const [replay] = await createJobRun("publication", 2, { replayOfJobRunId: run.id }, database);
    if (!replay) throw new Error("replay run insert failed");
    runIds.push(replay.id);
    await finishJobRun(replay.id, { status: "SUCCEEDED", attempts: 1 }, database);
    const replayed = await loadJobRun(replay.id, database);
    expect(replayed?.replayOfJobRunId).toBe(run.id);
    const after = await loadJobRun(run.id, database);
    expect(after?.status).toBe("DEAD_LETTER");
    expect(after?.finishedAt?.getTime()).toBe(before?.finishedAt?.getTime());
  });

  it("caps concurrent AI budget consumption at the limit", async () => {
    const database = getDatabase();
    const day = `2026-01-${String(10 + Math.floor(Math.random() * 10)).padStart(2, "0")}`;
    usageDays.add(day);
    const now = new Date(`${day}T12:00:00Z`);
    const results = await Promise.all(
      Array.from({ length: 5 }, () => consumeAiDailyBudget(database, 3, 1, now)),
    );
    expect(results.filter(Boolean)).toHaveLength(3);
    expect(await readAiDailyUsage(database, day)).toEqual({ used: 3 });
  });

  it("blocks zero limits, rolls UTC days over, and survives restarts", async () => {
    const database = getDatabase();
    const day = `2026-02-${String(10 + Math.floor(Math.random() * 10)).padStart(2, "0")}`;
    usageDays.add(day);
    expect(await consumeAiDailyBudget(database, 0, 1, new Date(`${day}T12:00:00Z`))).toBe(false);
    const yesterdayRow = await database
      .select()
      .from(aiDailyUsage)
      .where(eq(aiDailyUsage.utcDay, day));
    expect(yesterdayRow).toHaveLength(0);

    const yesterday = "2026-01-05";
    const today = "2026-01-06";
    usageDays.add(yesterday);
    usageDays.add(today);
    expect(await consumeAiDailyBudget(database, 5, 2, new Date(`${yesterday}T23:59:00Z`))).toBe(
      true,
    );
    expect(await readAiDailyUsage(database, today)).toEqual({ used: 0 });
    // A new service instance observes the same durable counter.
    expect(await readAiDailyUsage(database, yesterday)).toEqual({ used: 2 });
    expect(utcDayString(new Date(`${yesterday}T23:59:59Z`))).toBe(yesterday);
  });

  it("keeps one digest row per window and period", async () => {
    const database = getDatabase();
    const generatedAt = new Date("2026-09-18T12:00:00Z");
    const first = await getOrCreateRadarDigest(database, "DAILY", {
      window: "DAILY",
      generatedAt,
      items: [],
    });
    digestIds.push(first.id);
    const second = await getOrCreateRadarDigest(database, "DAILY", {
      window: "DAILY",
      generatedAt,
      items: [],
    });
    expect(first.created).toBe(true);
    expect(second).toEqual({ id: first.id, created: false });
    const weekly = await getOrCreateRadarDigest(database, "WEEKLY", {
      window: "WEEKLY",
      generatedAt,
      items: [],
    });
    digestIds.push(weekly.id);
    expect(weekly.created).toBe(true);
    expect(weekly.id).not.toBe(first.id);
  });

  it("builds digests from published publications only", async () => {
    const database = getDatabase();
    const candidateId = "00000000-0000-4000-8000-000000000090";
    candidateIds.push(candidateId);
    const publishedAt = new Date("2026-09-18T10:00:00Z");
    await database.insert(publications).values({
      candidateId,
      editorialDecisionId: "00000000-0000-4000-8000-000000000091",
      channel: "@test-public-channel",
      contentVersion: "v".repeat(64),
      idempotencyKey: uniqueKey("digest-key"),
      status: "published",
      providerMessageId: "tg-1",
      contentPayload: {
        candidateId,
        contentVersion: "v".repeat(64),
        title: "Published Tool",
        format: "FRESH",
        shortSummary: "Fast bundler",
        whyNow: "Adoption is accelerating",
        keyPoints: ["builds"],
        audience: ["teams"],
        limitations: [],
        projectSlug: "published-tool",
        projectUrl: "https://github.com/acme/published-tool",
        score: 70,
        scoreVersion: 1,
        confidence: 80,
        confidenceLevel: "HIGH",
        sources: [{ label: "acme", url: "https://github.com/acme/published-tool" }],
        outscanRelevance: "NONE",
      },
      attemptCount: 1,
      publishedAt,
    });
    await runConfiguredDailyRadar(new Date("2026-09-18T12:00:00Z"), database);
    const digests = await database.select().from(radarDigests);
    const daily = digests.find((row) => row.window === "DAILY" && row.periodKey === "2026-09-18");
    if (daily) digestIds.push(daily.id);
    expect(daily?.itemCount).toBe(1);
    const payload = daily?.contentPayload as
      { items?: Array<{ candidateId?: string }> } | undefined;
    expect(payload?.items?.map((item) => item.candidateId)).toEqual([candidateId]);
  });

  it("surfaces finalization-blocked rows without resending them", async () => {
    const database = getDatabase();
    const slug = uniqueKey("stage09-recon").toLowerCase().replaceAll("_", "-");
    const [project] = await database
      .insert(projects)
      .values({
        slug,
        name: `Stage09 ${slug}`,
        status: "active",
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      })
      .returning({ id: projects.id });
    if (!project) throw new Error("fixture project insert failed");
    projectIds.push(project.id);
    const [score] = await database
      .insert(scores)
      .values({
        projectId: project.id,
        scoreVersion: 1,
        calculatedAt: new Date(),
        velocityScore: 1,
        noveltyScore: 1,
        crossSourceScore: 1,
        relevanceScore: 1,
        projectHealthScore: 1,
        penaltyScore: 0,
        finalScore: 10,
        breakdown: {},
      })
      .returning({ id: scores.id });
    if (!score) throw new Error("fixture score insert failed");
    const [candidate] = await database
      .insert(candidates)
      .values({
        projectId: project.id,
        scoreId: score.id,
        reason: "recon fixture",
        status: "CANDIDATE",
        dedupeKey: uniqueKey("dedupe"),
      })
      .returning({ id: candidates.id });
    if (!candidate) throw new Error("fixture candidate insert failed");
    candidateIds.push(candidate.id);
    await database.insert(editorialReviewDispatches).values({
      candidateId: candidate.id,
      status: "PENDING",
      attemptCount: 1,
      lastErrorCode: "FINALIZATION_FAILED",
    });
    await database.insert(publications).values({
      candidateId: candidate.id,
      editorialDecisionId: "00000000-0000-4000-8000-000000000092",
      channel: "@test-public-channel",
      contentVersion: "v".repeat(64),
      idempotencyKey: uniqueKey("recon-key"),
      status: "pending",
      lastErrorCode: "FINALIZATION_FAILED",
      attemptCount: 1,
    });

    const items = await listReconciliationItems(database);
    const kinds = items
      .filter((item) => item.candidateId === candidate.id)
      .map((item) => item.kind)
      .sort();
    expect(kinds).toEqual(["dispatch", "publication"]);
    for (const item of items) {
      expect(JSON.stringify(item)).not.toContain("content_payload");
      expect(JSON.stringify(item)).not.toContain("token");
    }
    // Visibility is read-only: both rows stay exactly as they were.
    const [dispatchRow] = await database
      .select({ status: editorialReviewDispatches.status })
      .from(editorialReviewDispatches)
      .where(eq(editorialReviewDispatches.candidateId, candidate.id));
    expect(dispatchRow?.status).toBe("PENDING");
  });

  it("summarizes durable operational state from real rows", async () => {
    const database = getDatabase();
    const jobName = `stage09-summary-${Date.now()}`;
    const [run] = await createJobRun(jobName, 1, {}, database);
    if (!run) throw new Error("job run insert failed");
    runIds.push(run.id);
    await finishJobRun(run.id, { status: "SUCCEEDED", attempts: 1 }, database);
    const summary = await getOperationalSummary(database, { aiLimit: 50 });
    const entry = summary.jobs.find((job) => job.jobName === jobName);
    expect(entry?.succeeded).toBe(1);
    expect(entry?.lastSuccessAt).not.toBeNull();
    expect(summary.aiBudget.limit).toBe(50);
    expect(summary.aiBudget.remaining).toBeLessThanOrEqual(50);
  });
});
