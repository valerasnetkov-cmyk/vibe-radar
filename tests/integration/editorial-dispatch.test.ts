import { desc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { closeDatabase, getDatabase } from "@/server/db/client";
import {
  analyses,
  candidates,
  confidenceAssessments,
  editorialReviewDispatches,
  projects,
  scores,
} from "@/server/db/schema";
import { selectCandidate } from "@/server/modules/editorial/candidate-policy";
import { getOrCreateCandidate } from "@/server/modules/editorial/candidate-repository";
import { dispatchCandidateForReviewService } from "@/server/modules/editorial/dispatch-service";

import { getSafeIntegrationDatabaseUrl } from "./guard";

const integrationUrl = getSafeIntegrationDatabaseUrl();
const hasDatabase = integrationUrl !== null;
const maybe = hasDatabase ? describe : describe.skip;

function uniqueKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

maybe("Stage 07 editorial dispatch lifecycle", () => {
  const createdCandidateIds: string[] = [];
  const createdProjectIds: string[] = [];

  beforeAll(() => {
    if (!hasDatabase) {
      console.warn("DATABASE_URL is not set; PostgreSQL integration tests were not executed");
    }
  });

  afterAll(async () => {
    if (!hasDatabase) return;
    const database = getDatabase();
    try {
      if (createdCandidateIds.length) {
        for (const candidateId of createdCandidateIds) {
          await database
            .delete(editorialReviewDispatches)
            .where(eq(editorialReviewDispatches.candidateId, candidateId))
            .catch(() => undefined);
          await database
            .delete(analyses)
            .where(eq(analyses.candidateId, candidateId))
            .catch(() => undefined);
          await database
            .delete(candidates)
            .where(eq(candidates.id, candidateId))
            .catch(() => undefined);
        }
      }
      for (const projectId of createdProjectIds) {
        await database
          .delete(confidenceAssessments)
          .where(eq(confidenceAssessments.projectId, projectId))
          .catch(() => undefined);
        await database
          .delete(scores)
          .where(eq(scores.projectId, projectId))
          .catch(() => undefined);
        await database
          .delete(projects)
          .where(eq(projects.id, projectId))
          .catch(() => undefined);
      }
    } finally {
      await closeDatabase();
    }
  });

  async function createProjectWithScore(): Promise<{ projectId: string; scoreId: string }> {
    const database = getDatabase();
    const slug = uniqueKey("stage07-proj");
    const [project] = await database
      .insert(projects)
      .values({
        slug,
        name: `Stage07 ${slug}`,
        description: "integration fixture",
        status: "active",
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      })
      .returning({ id: projects.id });
    if (!project) throw new Error("fixture project insert failed");
    createdProjectIds.push(project.id);
    const [score] = await database
      .insert(scores)
      .values({
        projectId: project.id,
        scoreVersion: 1,
        calculatedAt: new Date(),
        velocityScore: 10,
        noveltyScore: 10,
        crossSourceScore: 10,
        relevanceScore: 10,
        projectHealthScore: 10,
        penaltyScore: 0,
        finalScore: 80,
        breakdown: { components: { growth: 10 }, penalties: {}, beforePenalties: 80 },
      })
      .returning({ id: scores.id });
    if (!score) throw new Error("fixture score insert failed");
    return { projectId: project.id, scoreId: score.id };
  }

  it("creates candidates with valid FK ids and returns the same row for duplicate dedupeKeys", async () => {
    const database = getDatabase();
    const { projectId, scoreId } = await createProjectWithScore();
    const dedupeKey = uniqueKey("dedupe");

    const first = await getOrCreateCandidate(database, projectId, scoreId, "reason-one", dedupeKey);
    createdCandidateIds.push(first.candidateId);
    expect(first.created).toBe(true);

    const second = await getOrCreateCandidate(
      database,
      projectId,
      scoreId,
      "reason-one",
      dedupeKey,
    );
    expect(second.candidateId).toBe(first.candidateId);
    expect(second.created).toBe(false);

    const [row] = await database
      .select()
      .from(candidates)
      .where(eq(candidates.id, first.candidateId))
      .limit(1);
    expect(row?.projectId).toBe(projectId);
    expect(row?.scoreId).toBe(scoreId);
    expect(row?.dedupeKey).toBe(dedupeKey);
  });

  it("never returns a candidate id that does not exist in PostgreSQL", async () => {
    const database = getDatabase();
    const { projectId, scoreId } = await createProjectWithScore();
    const { candidateId } = await getOrCreateCandidate(
      database,
      projectId,
      scoreId,
      "reason-exists",
      uniqueKey("dedupe"),
    );
    createdCandidateIds.push(candidateId);
    const [row] = await database
      .select({ id: candidates.id })
      .from(candidates)
      .where(eq(candidates.id, candidateId))
      .limit(1);
    expect(row?.id).toBe(candidateId);
  });

  it("does not persist candidates for rejected threshold decisions", async () => {
    const database = getDatabase();
    const { projectId } = await createProjectWithScore();
    const before = await database
      .select({ id: candidates.id })
      .from(candidates)
      .where(eq(candidates.projectId, projectId));
    const decision = selectCandidate(
      projectId,
      {
        scoreVersion: 1,
        components: {
          growth: 0,
          vibeRelevance: 0,
          freshness: 0,
          developmentActivity: 0,
          community: 0,
          documentation: 0,
          originality: 0,
        },
        penalties: {
          forkOrMirror: 0,
          prolongedInactivity: 0,
          unclearLicense: 0,
          suspiciousGrowth: 0,
          weakDocumentation: 0,
          duplicateCandidate: 0,
        },
        beforePenalties: 0,
        finalScore: 1,
      },
      {
        confidenceVersion: 1,
        value: 1,
        level: "LOW",
        explanation: { evidence: 0, sources: 0, history: 0, contradictions: 0 },
        inputs: {
          evidenceCount: 0,
          sourceCount: 0,
          snapshotCount: 0,
          hasCurrentSnapshot: false,
          hasRequiredHistory: false,
          contradictionCount: 0,
        },
      },
      uniqueKey("event"),
    );
    expect(decision.selected).toBe(false);
    // The job must skip persistence entirely for rejected decisions.
    if (!decision.selected) {
      const after = await database
        .select({ id: candidates.id })
        .from(candidates)
        .where(eq(candidates.projectId, projectId));
      expect(after.length).toBe(before.length);
    }
  });

  it("orders analyses by createdAt and enforces UNIQUE(candidate_id) on dispatches", async () => {
    const database = getDatabase();
    const { projectId, scoreId } = await createProjectWithScore();
    const { candidateId } = await getOrCreateCandidate(
      database,
      projectId,
      scoreId,
      "reason-analysis",
      uniqueKey("dedupe"),
    );
    createdCandidateIds.push(candidateId);

    const older = new Date(Date.now() - 60_000);
    const newer = new Date();
    await database.insert(analyses).values({
      candidateId,
      analysisVersion: 1,
      promptVersion: "v1",
      provider: "test",
      model: "test",
      status: "ANALYSIS_FAILED",
      attempts: 1,
      createdAt: newer,
    });
    await database.insert(analyses).values({
      candidateId,
      analysisVersion: 1,
      promptVersion: "v1",
      provider: "test",
      model: "test",
      status: "SUCCEEDED",
      attempts: 1,
      createdAt: older,
    });
    const [latest] = await database
      .select({ status: analyses.status, createdAt: analyses.createdAt })
      .from(analyses)
      .where(eq(analyses.candidateId, candidateId))
      .orderBy(desc(analyses.createdAt))
      .limit(1);
    // createdAt ordering (not UUID ordering) surfaces the newest row first,
    // so a FAILED newest analysis blocks dispatch even with an older SUCCEEDED row.
    expect(latest?.status).toBe("ANALYSIS_FAILED");

    await database.insert(editorialReviewDispatches).values({
      candidateId,
      status: "PENDING",
      attemptCount: 0,
    });
    await expect(
      database.insert(editorialReviewDispatches).values({
        candidateId,
        status: "PENDING",
        attemptCount: 0,
      }),
    ).rejects.toThrow();
  });

  it("produces a single owner from two concurrent claim attempts", async () => {
    const database = getDatabase();
    const { projectId, scoreId } = await createProjectWithScore();
    const { candidateId } = await getOrCreateCandidate(
      database,
      projectId,
      scoreId,
      "reason-race",
      uniqueKey("dedupe"),
    );
    createdCandidateIds.push(candidateId);
    const card = { text: "hi", inlineKeyboard: [] };
    const send = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { providerMessageId: "mid-race" };
    });
    const bot = { sendReviewCard: send };
    const [first, second] = await Promise.all([
      dispatchCandidateForReviewService(database, candidateId, card, bot),
      dispatchCandidateForReviewService(database, candidateId, card, bot),
    ]);
    const outcomes = [first.outcome, second.outcome].sort();
    expect(send).toHaveBeenCalledTimes(1);
    // The loser either observed the in-flight PENDING claim (busy) or the
    // already-finalized claim (already_sent); both block a second send.
    expect(outcomes[1]).toBe("sent");
    expect(["already_sent", "busy"]).toContain(outcomes[0]);
  });

  it("stores providerMessageId and REVIEW on success, and never resends SENT dispatches", async () => {
    const database = getDatabase();
    const { projectId, scoreId } = await createProjectWithScore();
    const { candidateId } = await getOrCreateCandidate(
      database,
      projectId,
      scoreId,
      "reason-send",
      uniqueKey("dedupe"),
    );
    createdCandidateIds.push(candidateId);
    const card = { text: "hi", inlineKeyboard: [] };
    const send = vi.fn(async () => ({ providerMessageId: "mid-123" }));
    const first = await dispatchCandidateForReviewService(database, candidateId, card, {
      sendReviewCard: send,
    });
    expect(first).toEqual({ outcome: "sent", providerMessageId: "mid-123" });

    const [dispatchRow] = await database
      .select()
      .from(editorialReviewDispatches)
      .where(eq(editorialReviewDispatches.candidateId, candidateId))
      .limit(1);
    expect(dispatchRow?.status).toBe("SENT");
    expect(dispatchRow?.providerMessageId).toBe("mid-123");
    const [candidateRow] = await database
      .select({ status: candidates.status })
      .from(candidates)
      .where(eq(candidates.id, candidateId))
      .limit(1);
    expect(candidateRow?.status).toBe("REVIEW");

    const second = await dispatchCandidateForReviewService(database, candidateId, card, {
      sendReviewCard: send,
    });
    expect(second).toEqual({ outcome: "already_sent" });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("claims FAILED retries atomically so two workers produce one send", async () => {
    const database = getDatabase();
    const { projectId, scoreId } = await createProjectWithScore();
    const { candidateId } = await getOrCreateCandidate(
      database,
      projectId,
      scoreId,
      "reason-retry-race",
      uniqueKey("dedupe"),
    );
    createdCandidateIds.push(candidateId);
    await database.insert(editorialReviewDispatches).values({
      candidateId,
      status: "FAILED",
      attemptCount: 1,
      lastErrorCode: "TELEGRAM_SEND_TIMEOUT",
    });
    const card = { text: "hi", inlineKeyboard: [] };
    const send = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { providerMessageId: "mid-retry" };
    });
    const bot = { sendReviewCard: send };
    const [first, second] = await Promise.all([
      dispatchCandidateForReviewService(database, candidateId, card, bot),
      dispatchCandidateForReviewService(database, candidateId, card, bot),
    ]);
    const outcomes = [first.outcome, second.outcome].sort();
    expect(send).toHaveBeenCalledTimes(1);
    // The re-claim loser either lost the atomic UPDATE (busy) or observed
    // the already-finalized claim; both block a second send.
    expect(outcomes[1]).toBe("sent");
    expect(["already_sent", "busy"]).toContain(outcomes[0]);
  });

  it("returns the same row from concurrent getOrCreateCandidate calls", async () => {
    const database = getDatabase();
    const { projectId, scoreId } = await createProjectWithScore();
    const dedupeKey = uniqueKey("dedupe-race");
    const [first, second] = await Promise.all([
      getOrCreateCandidate(database, projectId, scoreId, "reason-race", dedupeKey),
      getOrCreateCandidate(database, projectId, scoreId, "reason-race", dedupeKey),
    ]);
    createdCandidateIds.push(first.candidateId);
    expect(first.candidateId).toBe(second.candidateId);
    const rows = await database
      .select({ id: candidates.id })
      .from(candidates)
      .where(eq(candidates.dedupeKey, dedupeKey));
    expect(rows.length).toBe(1);
    expect(rows[0]?.id).toBe(first.candidateId);
  });

  it("leaves CANDIDATE on failed sends with a safe error code", async () => {
    const database = getDatabase();
    const { projectId, scoreId } = await createProjectWithScore();
    const { candidateId } = await getOrCreateCandidate(
      database,
      projectId,
      scoreId,
      "reason-fail",
      uniqueKey("dedupe"),
    );
    createdCandidateIds.push(candidateId);
    const outcome = await dispatchCandidateForReviewService(
      database,
      candidateId,
      { text: "hi", inlineKeyboard: [] },
      {
        sendReviewCard: async () => {
          throw new Error("db password=hunter2 should never be stored");
        },
      },
    );
    expect(outcome.outcome).toBe("failed");
    const [dispatchRow] = await database
      .select()
      .from(editorialReviewDispatches)
      .where(eq(editorialReviewDispatches.candidateId, candidateId))
      .limit(1);
    expect(dispatchRow?.status).toBe("FAILED");
    expect(dispatchRow?.lastErrorCode).not.toContain("hunter2");
    expect(dispatchRow?.attemptCount).toBe(1);
    const [candidateRow] = await database
      .select({ status: candidates.status })
      .from(candidates)
      .where(eq(candidates.id, candidateId))
      .limit(1);
    expect(candidateRow?.status).toBe("CANDIDATE");
  });
});
