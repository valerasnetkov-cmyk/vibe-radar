import { desc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { closeDatabase, getDatabase } from "@/server/db/client";
import { getSafeIntegrationDatabaseUrl } from "./guard";
import {
  analyses,
  candidates,
  confidenceAssessments,
  editorialDecisions,
  projects,
  providerIdentities,
  projectSnapshots,
  publications,
  scores,
  sourceEvents,
} from "@/server/db/schema";
import { applyEditorCallback } from "@/server/modules/editorial/decision";
import { getOrCreateCandidate } from "@/server/modules/editorial/candidate-repository";
import { selectCandidate } from "@/server/modules/editorial/candidate-policy";
import { getPublishedProject, getPublishedRadar } from "@/server/modules/publishing/read-model";
import { publishApprovedCandidate } from "@/server/modules/publishing/service";
import { runConfiguredScoreCalculation } from "@/server/modules/scoring/job";

const integrationUrl = getSafeIntegrationDatabaseUrl();
const hasDatabase = integrationUrl !== null;
const maybe = hasDatabase ? describe : describe.skip;

const CHANNEL = "@test-public-channel";
const EDITOR = "editor-1";
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

/**
 * High-value database-backed pipeline scenario with mocked external
 * providers: GitHub fixture rows -> snapshots -> real score calculation ->
 * candidate policy -> valid analysis -> real editorial approval -> claimed
 * publication with mocked Telegram success -> persisted publication ->
 * public radar/project read model, then duplicate-invocation protection.
 */
maybe("MVP database-backed pipeline", () => {
  const projectIds: string[] = [];
  const candidateIds: string[] = [];
  const eventIds: string[] = [];

  beforeAll(() => {
    if (!hasDatabase) {
      console.warn("DATABASE_URL is not set; PostgreSQL integration tests were not executed");
    }
  });

  afterAll(async () => {
    if (!hasDatabase) return;
    const database = getDatabase();
    try {
      for (const id of candidateIds) {
        await database
          .delete(publications)
          .where(eq(publications.candidateId, id))
          .catch(() => undefined);
        await database
          .delete(editorialDecisions)
          .where(eq(editorialDecisions.candidateId, id))
          .catch(() => undefined);
        await database
          .delete(analyses)
          .where(eq(analyses.candidateId, id))
          .catch(() => undefined);
        await database
          .delete(candidates)
          .where(eq(candidates.id, id))
          .catch(() => undefined);
      }
      for (const id of eventIds) {
        await database
          .delete(sourceEvents)
          .where(eq(sourceEvents.id, id))
          .catch(() => undefined);
      }
      for (const id of projectIds) {
        await database
          .delete(projectSnapshots)
          .where(eq(projectSnapshots.projectId, id))
          .catch(() => undefined);
        await database
          .delete(providerIdentities)
          .where(eq(providerIdentities.projectId, id))
          .catch(() => undefined);
        await database
          .delete(confidenceAssessments)
          .where(eq(confidenceAssessments.projectId, id))
          .catch(() => undefined);
        await database
          .delete(scores)
          .where(eq(scores.projectId, id))
          .catch(() => undefined);
        await database
          .delete(projects)
          .where(eq(projects.id, id))
          .catch(() => undefined);
      }
    } finally {
      await closeDatabase();
    }
  });

  it("runs fixture to public card without a second provider send", async () => {
    const database = getDatabase();
    const slug = uniqueKey("mvp-pipe").toLowerCase().replaceAll("_", "-");
    const firstSeen = new Date(Date.now() - 30 * 86400000);
    const [project] = await database
      .insert(projects)
      .values({
        slug,
        name: `Pipeline ${slug}`,
        status: "active",
        firstSeenAt: firstSeen,
        lastSeenAt: new Date(),
      })
      .returning({ id: projects.id });
    if (!project) throw new Error("fixture project insert failed");
    projectIds.push(project.id);

    const [event] = await database
      .insert(sourceEvents)
      .values({
        provider: "github",
        sourceKind: "repository",
        sourceKey: uniqueKey("source"),
        retrievedAt: new Date(),
        status: "ok",
      })
      .returning({ id: sourceEvents.id });
    if (!event) throw new Error("fixture event insert failed");
    eventIds.push(event.id);

    await database.insert(providerIdentities).values({
      projectId: project.id,
      provider: "github",
      providerObjectId: uniqueKey("repo"),
      providerOwner: "pipeline",
      providerName: slug,
      providerFullName: `pipeline/${slug}`,
      providerUrl: `https://github.com/pipeline/${slug}`,
      firstSeenAt: firstSeen,
      lastSeenAt: new Date(),
    });

    const stars = [10, 40, 160];
    for (let index = 0; index < stars.length; index += 1) {
      await database.insert(projectSnapshots).values({
        projectId: project.id,
        sourceEventId: event.id,
        observedAt: new Date(Date.now() - (10 - index * 4) * 86400000),
        stars: stars[index] ?? 0,
        forks: 2,
        openIssues: 1,
      });
    }

    // Real scoring + confidence persistence over persisted snapshots.
    await runConfiguredScoreCalculation();
    const [score] = await database
      .select()
      .from(scores)
      .where(eq(scores.projectId, project.id))
      .orderBy(desc(scores.calculatedAt))
      .limit(1);
    expect(score).toBeDefined();
    const [confidence] = await database
      .select()
      .from(confidenceAssessments)
      .where(eq(confidenceAssessments.projectId, project.id))
      .limit(1);
    expect(confidence).toBeDefined();

    // Candidate selection is intentionally permissive here to exercise the
    // downstream editorial path; policy thresholds stay unit-tested.
    const decision = selectCandidate(
      project.id,
      {
        scoreVersion: 1,
        components: {
          growth: 80,
          vibeRelevance: 80,
          freshness: 80,
          developmentActivity: 80,
          community: 80,
          documentation: 80,
          originality: 80,
        },
        penalties: {
          forkOrMirror: 0,
          prolongedInactivity: 0,
          unclearLicense: 0,
          suspiciousGrowth: 0,
          weakDocumentation: 0,
          duplicateCandidate: 0,
        },
        beforePenalties: 80,
        finalScore: 80,
      },
      {
        confidenceVersion: 1,
        value: 90,
        level: "HIGH",
        explanation: { evidence: 20, sources: 10, history: 10, contradictions: 0 },
        inputs: {
          evidenceCount: 4,
          sourceCount: 2,
          snapshotCount: 3,
          hasCurrentSnapshot: true,
          hasRequiredHistory: true,
          contradictionCount: 0,
        },
      },
      uniqueKey("event"),
      10,
      10,
    );
    expect(decision.selected).toBe(true);
    const { candidateId } = await getOrCreateCandidate(
      database,
      project.id,
      score?.id ?? "",
      decision.reason,
      decision.dedupeKey,
    );
    candidateIds.push(candidateId);

    await database.insert(analyses).values({
      candidateId,
      analysisVersion: 1,
      promptVersion: "v1",
      provider: "test",
      model: "test",
      output: ANALYSIS_OUTPUT,
      status: "SUCCEEDED",
      attempts: 1,
    });

    // Real trusted editorial approval through the callback boundary.
    const approval = await applyEditorCallback(
      `vr:approve:${candidateId}`,
      EDITOR,
      new Set([EDITOR]),
    );
    expect(approval.status).toBe("APPROVED");

    const send = vi.fn(async () => ({ providerMessageId: "tg-pipeline" }));
    const first = await publishApprovedCandidate(candidateId, {
      database,
      channel: CHANNEL,
      publisher: { publish: send },
    });
    expect(first).toEqual({ outcome: "published", providerMessageId: "tg-pipeline" });

    const [publication] = await database
      .select()
      .from(publications)
      .where(eq(publications.candidateId, candidateId))
      .limit(1);
    expect(publication?.status).toBe("published");
    expect(publication?.providerMessageId).toBe("tg-pipeline");
    expect(publication?.contentPayload).toBeDefined();

    const radar = await getPublishedRadar(database);
    expect(radar.map((entry) => entry.slug)).toContain(slug);
    const page = await getPublishedProject(database, slug);
    expect(page?.content.title).toContain("Pipeline");

    // Duplicate invocation must not produce a second provider send.
    const second = await publishApprovedCandidate(candidateId, {
      database,
      channel: CHANNEL,
      publisher: { publish: send },
    });
    expect(second).toEqual({ outcome: "already_published" });
    expect(send).toHaveBeenCalledTimes(1);
  });
});
