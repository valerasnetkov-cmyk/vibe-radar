import { desc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { closeDatabase, getDatabase } from "@/server/db/client";
import {
  analyses,
  candidates,
  confidenceAssessments,
  editorialDecisions,
  projects,
  providerIdentities,
  publications,
  scores,
} from "@/server/db/schema";
import { buildContentModelForApprovedCandidate } from "@/server/modules/content/builder";
import {
  publicationIdempotencyKey,
  publishApprovedCandidate,
} from "@/server/modules/publishing/service";
import { getPublishedProject, getPublishedRadar } from "@/server/modules/publishing/read-model";

import { getSafeIntegrationDatabaseUrl } from "./guard";

const integrationUrl = getSafeIntegrationDatabaseUrl();
const hasDatabase = integrationUrl !== null;
const maybe = hasDatabase ? describe : describe.skip;

const CHANNEL = "@test-public-channel";

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

function uniqueKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

maybe("Stage 08 approved publishing lifecycle", () => {
  const candidateIds: string[] = [];
  const projectIds: string[] = [];

  beforeAll(() => {
    if (!hasDatabase) {
      console.warn("DATABASE_URL is not set; PostgreSQL integration tests were not executed");
    }
  });

  afterAll(async () => {
    if (!hasDatabase) return;
    const database = getDatabase();
    try {
      for (const candidateId of candidateIds) {
        await database
          .delete(publications)
          .where(eq(publications.candidateId, candidateId))
          .catch(() => undefined);
        await database
          .delete(editorialDecisions)
          .where(eq(editorialDecisions.candidateId, candidateId))
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
      for (const projectId of projectIds) {
        await database
          .delete(providerIdentities)
          .where(eq(providerIdentities.projectId, projectId))
          .catch(() => undefined);
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

  async function createApprovedSetup(
    status: "APPROVED" | "REJECTED" | "WATCHING" = "APPROVED",
  ): Promise<{
    projectId: string;
    candidateId: string;
    decisionId: string | null;
    slug: string;
  }> {
    const database = getDatabase();
    const slug = uniqueKey("stage08-proj").toLowerCase().replaceAll("_", "-");
    const [project] = await database
      .insert(projects)
      .values({
        slug,
        name: `Stage08 ${slug}`,
        description: "integration fixture",
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
    await database.insert(confidenceAssessments).values({
      projectId: project.id,
      confidenceVersion: 1,
      calculatedAt: new Date(),
      value: 82,
      level: "HIGH",
      evidenceCount: 4,
      contradictionCount: 0,
      explanation: { evidence: 20, sources: 10, history: 10, contradictions: 0 },
    });
    await database.insert(providerIdentities).values({
      projectId: project.id,
      provider: "github",
      providerObjectId: uniqueKey("repo"),
      providerOwner: "stage08",
      providerName: slug,
      providerFullName: `stage08/${slug}`,
      providerUrl: `https://github.com/stage08/${slug}`,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    });
    const [candidate] = await database
      .insert(candidates)
      .values({
        projectId: project.id,
        scoreId: score.id,
        reason: "fixture approval",
        status,
        dedupeKey: uniqueKey("dedupe"),
      })
      .returning({ id: candidates.id });
    if (!candidate) throw new Error("fixture candidate insert failed");
    candidateIds.push(candidate.id);
    await database.insert(analyses).values({
      candidateId: candidate.id,
      analysisVersion: 1,
      promptVersion: "v1",
      provider: "test",
      model: "test",
      output: ANALYSIS_OUTPUT,
      status: "SUCCEEDED",
      attempts: 1,
    });
    let decisionId: string | null = null;
    if (status === "APPROVED") {
      const [decision] = await database
        .insert(editorialDecisions)
        .values({
          candidateId: candidate.id,
          editorActorId: "editor-1",
          decision: "APPROVE",
        })
        .returning({ id: editorialDecisions.id });
      decisionId = decision?.id ?? null;
    }
    return { projectId: project.id, candidateId: candidate.id, decisionId, slug };
  }

  it("publishes approved candidates and persists providerMessageId with the content snapshot", async () => {
    const database = getDatabase();
    const { candidateId } = await createApprovedSetup();
    const send = vi.fn(async () => ({ providerMessageId: "tg-stage08" }));
    const outcome = await publishApprovedCandidate(candidateId, {
      database,
      channel: CHANNEL,
      publisher: { publish: send },
    });
    expect(outcome).toEqual({ outcome: "published", providerMessageId: "tg-stage08" });

    const [row] = await database
      .select()
      .from(publications)
      .where(eq(publications.candidateId, candidateId))
      .limit(1);
    expect(row?.status).toBe("published");
    expect(row?.providerMessageId).toBe("tg-stage08");
    expect(row?.attemptCount).toBe(1);
    const payload = row?.contentPayload as Record<string, unknown> | undefined;
    expect(payload?.title).toContain("Stage08");
    expect(payload?.projectUrl).toContain("https://github.com/stage08/");
    expect(typeof payload?.contentVersion).toBe("string");
  });

  it("refuses REJECTED and WATCHING candidates without provider calls", async () => {
    const database = getDatabase();
    for (const status of ["REJECTED", "WATCHING"] as const) {
      const { candidateId } = await createApprovedSetup(status);
      const send = vi.fn(async () => ({ providerMessageId: "tg-nope" }));
      const outcome = await publishApprovedCandidate(candidateId, {
        database,
        channel: CHANNEL,
        publisher: { publish: send },
      });
      expect(outcome).toEqual({ outcome: "rejected", reason: "not_approved" });
      expect(send).not.toHaveBeenCalled();
    }
  });

  it("rejects approvals bound to another candidate", async () => {
    const database = getDatabase();
    const first = await createApprovedSetup();
    const second = await createApprovedSetup();
    // Remove the second candidate's own approval so only the foreign
    // decision exists; the service must not borrow it.
    await database
      .delete(editorialDecisions)
      .where(eq(editorialDecisions.candidateId, second.candidateId));
    const send = vi.fn(async () => ({ providerMessageId: "tg-nope" }));
    const outcome = await publishApprovedCandidate(second.candidateId, {
      database,
      channel: CHANNEL,
      publisher: { publish: send },
    });
    expect(outcome).toEqual({ outcome: "rejected", reason: "missing_approval_decision" });
    expect(send).not.toHaveBeenCalled();
    void first;
  });

  it("elects exactly one owner for concurrent first publications", async () => {
    const database = getDatabase();
    const { candidateId } = await createApprovedSetup();
    const send = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { providerMessageId: "tg-race" };
    });
    const call = () =>
      publishApprovedCandidate(candidateId, {
        database,
        channel: CHANNEL,
        publisher: { publish: send },
      });
    const [first, second] = await Promise.all([call(), call()]);
    const outcomes = [first.outcome, second.outcome].sort();
    expect(send).toHaveBeenCalledTimes(1);
    // The loser either observed the in-flight pending row (busy) or the
    // already-finalized row (already_published); both block a second send.
    expect(outcomes[1]).toBe("published");
    expect(["already_published", "busy"]).toContain(outcomes[0]);
  });

  it("never resends already-published rows", async () => {
    const database = getDatabase();
    const { candidateId } = await createApprovedSetup();
    const send = vi.fn(async () => ({ providerMessageId: "tg-once" }));
    const deps = { database, channel: CHANNEL, publisher: { publish: send } };
    expect(await publishApprovedCandidate(candidateId, deps)).toEqual({
      outcome: "published",
      providerMessageId: "tg-once",
    });
    expect(await publishApprovedCandidate(candidateId, deps)).toEqual({
      outcome: "already_published",
    });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("gives concurrent failed retries to exactly one owner", async () => {
    const database = getDatabase();
    const { candidateId } = await createApprovedSetup();
    const failing = { publish: vi.fn(async () => ({ providerMessageId: "tg-x" })) };
    failing.publish.mockRejectedValueOnce(new Error("provider down"));
    const failed = await publishApprovedCandidate(candidateId, {
      database,
      channel: CHANNEL,
      publisher: failing,
    });
    expect(failed.outcome).toBe("failed");

    const send = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { providerMessageId: "tg-retry" };
    });
    const call = () =>
      publishApprovedCandidate(candidateId, {
        database,
        channel: CHANNEL,
        publisher: { publish: send },
      });
    const [first, second] = await Promise.all([call(), call()]);
    expect(send).toHaveBeenCalledTimes(1);
    // The re-claim loser either lost the atomic UPDATE (busy) or observed
    // the already-finalized row; both block a second send.
    const retryOutcomes = [first.outcome, second.outcome].sort();
    expect(retryOutcomes[1]).toBe("published");
    expect(["already_published", "busy"]).toContain(retryOutcomes[0]);
  });

  it("blocks automatic resend for reconciliation-required rows", async () => {
    const database = getDatabase();
    const { candidateId } = await createApprovedSetup();
    const built = await buildContentModelForApprovedCandidate(database, candidateId);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const key = publicationIdempotencyKey(built.model, CHANNEL);
    await database.insert(publications).values({
      candidateId,
      editorialDecisionId: built.approvalDecisionId,
      channel: CHANNEL,
      contentVersion: built.model.contentVersion,
      idempotencyKey: key,
      status: "pending",
      contentPayload: built.model,
      lastErrorCode: "FINALIZATION_FAILED",
      attemptCount: 0,
    });
    const send = vi.fn(async () => ({ providerMessageId: "tg-nope" }));
    const outcome = await publishApprovedCandidate(candidateId, {
      database,
      channel: CHANNEL,
      publisher: { publish: send },
    });
    expect(outcome).toEqual({ outcome: "busy" });
    expect(send).not.toHaveBeenCalled();
  });

  it("exposes only published records through the public read model", async () => {
    const database = getDatabase();
    const published = await createApprovedSetup();
    const unpublished = await createApprovedSetup();
    const send = vi.fn(async () => ({ providerMessageId: "tg-radar" }));
    await publishApprovedCandidate(published.candidateId, {
      database,
      channel: CHANNEL,
      publisher: { publish: send },
    });

    const radar = await getPublishedRadar(database);
    const slugs = radar.map((entry) => entry.slug);
    expect(slugs).toContain(published.slug);
    expect(slugs).not.toContain(unpublished.slug);

    const page = await getPublishedProject(database, published.slug);
    expect(page?.content.title).toContain("Stage08");
    expect(await getPublishedProject(database, unpublished.slug)).toBeNull();

    const [latest] = await database
      .select({ publishedAt: publications.publishedAt })
      .from(publications)
      .where(eq(publications.candidateId, published.candidateId))
      .orderBy(desc(publications.publishedAt))
      .limit(1);
    expect(latest?.publishedAt).toBeInstanceOf(Date);
  });
});
