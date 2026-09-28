import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { closeDatabase, getDatabase } from "@/server/db/client";
import {
  analyses,
  buildabilityAssessments,
  candidates,
  confidenceAssessments,
  editorialDecisions,
  mechanicEvidence,
  mechanicReviews,
  opportunities,
  opportunityEvidence,
  opportunityReviews,
  productMechanics,
  projects,
  providerIdentities,
  publications,
  scores,
  sourceEvents,
} from "@/server/db/schema";
import { canonicalOpportunityKey } from "@/server/modules/opportunities/identity";
import { listPublicOpportunities } from "@/server/modules/opportunities/public-read-model";
import {
  publishOpportunity,
  submitOpportunityBatch,
  submitOpportunityProposal,
} from "@/server/modules/opportunities/repository";
import { reviewOpportunity } from "@/server/modules/opportunities/review";
import { submitMechanicProposal } from "@/server/modules/mechanics/repository";
import { reviewMechanic } from "@/server/modules/mechanics/review";
import { publishApprovedCandidate } from "@/server/modules/publishing/service";
import type { BuildabilityLabel } from "@/server/modules/buildability/assess";

const hasDatabase = Boolean(process.env.DATABASE_URL);
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
const DIMENSIONS = {
  frontend: 10,
  backend: 10,
  infrastructure: 10,
  externalApis: 10,
  aiDependency: 10,
  authBilling: 10,
  dataRequirements: 10,
  securityCompliance: 10,
  realtimeMobile: 10,
  operations: 10,
};

function uniqueKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

function proposalFor(
  title: string,
  refs: Array<{ sourceType: "PROJECT" | "MECHANIC"; sourceId: string }>,
) {
  return {
    title,
    problemStatement: "Builders need safe privileged approvals.",
    proposedProduct: "A focused approval gateway.",
    targetUser: "Small teams",
    marketScope: "GLOBAL" as const,
    requiredCapabilities: ["Backend API"],
    differentiationHypothesis: "Narrow developer workflows.",
    riskSummary: ["Auth design"],
    evidence: refs.map((ref) => ({ ...ref, rationale: "Sustained independent adoption." })),
  };
}

maybe("Stage 11 evidence-linked opportunity engine", () => {
  const opportunityIds: string[] = [];
  const mechanicIds: string[] = [];
  const candidateIds: string[] = [];
  const projectIds: string[] = [];
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
      for (const id of opportunityIds) {
        await database
          .delete(opportunityReviews)
          .where(eq(opportunityReviews.opportunityId, id))
          .catch(() => undefined);
        await database
          .delete(opportunityEvidence)
          .where(eq(opportunityEvidence.opportunityId, id))
          .catch(() => undefined);
        await database
          .delete(opportunities)
          .where(eq(opportunities.id, id))
          .catch(() => undefined);
      }
      for (const id of mechanicIds) {
        await database
          .delete(mechanicReviews)
          .where(eq(mechanicReviews.mechanicId, id))
          .catch(() => undefined);
        await database
          .delete(mechanicEvidence)
          .where(eq(mechanicEvidence.mechanicId, id))
          .catch(() => undefined);
        await database
          .delete(productMechanics)
          .where(eq(productMechanics.id, id))
          .catch(() => undefined);
      }
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
          .delete(providerIdentities)
          .where(eq(providerIdentities.projectId, id))
          .catch(() => undefined);
        await database
          .delete(buildabilityAssessments)
          .where(eq(buildabilityAssessments.projectId, id))
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

  async function createProject(
    options: {
      confidence?: number;
      buildability?: BuildabilityLabel | null;
    } = {},
  ): Promise<{ projectId: string; eventId: string }> {
    const database = getDatabase();
    const slug = uniqueKey("stage11-proj").toLowerCase().replaceAll("_", "-");
    const [project] = await database
      .insert(projects)
      .values({
        slug,
        name: `Stage11 ${slug}`,
        status: "active",
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      })
      .returning({ id: projects.id });
    if (!project) throw new Error("fixture project insert failed");
    projectIds.push(project.id);
    await database.insert(scores).values({
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
      breakdown: {},
    });
    await database.insert(confidenceAssessments).values({
      projectId: project.id,
      confidenceVersion: 1,
      calculatedAt: new Date(),
      value: options.confidence ?? 85,
      level: "HIGH",
      evidenceCount: 4,
      contradictionCount: 0,
      explanation: {},
    });
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
      providerOwner: "stage11",
      providerName: slug,
      providerFullName: `stage11/${slug}`,
      providerUrl: `https://github.com/stage11/${slug}`,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    });
    if (options.buildability !== null) {
      await database.insert(buildabilityAssessments).values({
        projectId: project.id,
        assessmentVersion: 1,
        calculatedAt: new Date(),
        label: options.buildability ?? "SMALL_TEAM",
        dimensions: DIMENSIONS,
        constraints: [],
        explanation: "Fixture assessment.",
      });
    }
    return { projectId: project.id, eventId: event.id };
  }

  async function publishProject(projectId: string): Promise<string> {
    const database = getDatabase();
    const [score] = await database
      .select({ id: scores.id })
      .from(scores)
      .where(eq(scores.projectId, projectId))
      .limit(1);
    if (!score) throw new Error("fixture score missing");
    const [candidate] = await database
      .insert(candidates)
      .values({
        projectId,
        scoreId: score.id,
        reason: "fixture",
        status: "APPROVED",
        dedupeKey: uniqueKey("dedupe"),
      })
      .returning({ id: candidates.id });
    if (!candidate) throw new Error("fixture candidate insert failed");
    candidateIds.push(candidate.id);
    await database.insert(editorialDecisions).values({
      candidateId: candidate.id,
      editorActorId: "editor-1",
      decision: "APPROVE",
    });
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
    const outcome = await publishApprovedCandidate(candidate.id, {
      database,
      channel: CHANNEL,
      publisher: { publish: async () => ({ providerMessageId: `tg-${candidate.id}` }) },
    });
    if (outcome.outcome !== "published") throw new Error("fixture publication failed");
    return candidate.id;
  }

  async function createMechanic(
    refs: Array<{ projectId: string; eventId: string }>,
    review: boolean,
  ): Promise<string> {
    const database = getDatabase();
    const result = await submitMechanicProposal(database, {
      canonicalName: `Stage11 Mechanic ${uniqueKey("mech")}`,
      description: "A repeated confirmation interaction before risky actions.",
      evidence: refs.map((ref, index) => ({
        projectId: ref.projectId,
        sourceEventId: ref.eventId,
        signalId: `sig-${index}`,
        strength: 70,
      })),
      affectedCategories: ["agents"],
      practicalImplications: ["Add explicit human control"],
      risks: ["May slow automation"],
    });
    mechanicIds.push(result.mechanicId);
    if (review) await reviewMechanic(database, result.mechanicId, "APPROVE", "editor-1");
    return result.mechanicId;
  }

  it("creates one opportunity for concurrent identical proposals", async () => {
    const database = getDatabase();
    const first = await createProject({});
    await publishProject(first.projectId);
    const proposal = proposalFor(`Concurrent Opp ${Date.now()}`, [
      { sourceType: "PROJECT", sourceId: first.projectId },
    ]);
    const [one, two] = await Promise.all([
      submitOpportunityProposal(database, proposal),
      submitOpportunityProposal(database, proposal),
    ]);
    expect(one.ok && two.ok).toBe(true);
    if (!one.ok || !two.ok) return;
    opportunityIds.push(one.opportunityId);
    expect(one.opportunityId).toBe(two.opportunityId);
    const rows = await database
      .select({ id: opportunities.id })
      .from(opportunities)
      .where(
        eq(
          opportunities.canonicalKey,
          canonicalOpportunityKey({
            title: proposal.title,
            proposedProduct: proposal.proposedProduct,
            targetUser: proposal.targetUser,
            marketScope: proposal.marketScope,
            subjectKeys: [`PROJECT:${first.projectId}`],
          }),
        ),
      );
    expect(rows).toHaveLength(1);
  });

  it("keeps evidence idempotent across duplicate retries", async () => {
    const database = getDatabase();
    const first = await createProject({});
    await publishProject(first.projectId);
    const proposal = proposalFor(`Dedupe Opp ${Date.now()}`, [
      { sourceType: "PROJECT", sourceId: first.projectId },
    ]);
    const initial = await submitOpportunityProposal(database, proposal);
    expect(initial.ok).toBe(true);
    if (!initial.ok) return;
    opportunityIds.push(initial.opportunityId);
    const retry = await submitOpportunityProposal(database, proposal);
    expect(retry.ok).toBe(true);
    if (!retry.ok) return;
    expect(retry.insertedEvidence).toBe(0);
    const rows = await database
      .select({ id: opportunityEvidence.id })
      .from(opportunityEvidence)
      .where(eq(opportunityEvidence.opportunityId, initial.opportunityId));
    expect(rows).toHaveLength(1);
  });

  it("ignores unknown project sources without boosting confidence", async () => {
    const database = getDatabase();
    const real = await createProject({});
    await publishProject(real.projectId);
    const result = await submitOpportunityProposal(
      database,
      proposalFor(`Unknown Src ${Date.now()}`, [
        { sourceType: "PROJECT", sourceId: real.projectId },
        { sourceType: "PROJECT", sourceId: "00000000-0000-4000-8000-00000000ffff" },
      ]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    opportunityIds.push(result.opportunityId);
    expect(result.resolvedSources).toBe(1);
  });

  it("rejects unpublished projects as public evidence", async () => {
    const database = getDatabase();
    const draft = await createProject({});
    const result = await submitOpportunityProposal(
      database,
      proposalFor(`Unpublished Src ${Date.now()}`, [
        { sourceType: "PROJECT", sourceId: draft.projectId },
      ]),
    );
    expect(result).toEqual({ ok: false, reason: "unresolvable_evidence" });
  });

  it("resolves eligible mechanic sources", async () => {
    const database = getDatabase();
    const first = await createProject({});
    const second = await createProject({});
    const mechanicId = await createMechanic([first, second], true);
    const result = await submitOpportunityProposal(
      database,
      proposalFor(`Mechanic Src ${Date.now()}`, [{ sourceType: "MECHANIC", sourceId: mechanicId }]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    opportunityIds.push(result.opportunityId);
    expect(result.resolvedSources).toBe(1);
    expect(result.confidence).toBeGreaterThanOrEqual(55);
  });

  it("excludes rejected mechanics from public evidence", async () => {
    const database = getDatabase();
    const first = await createProject({});
    const second = await createProject({});
    const mechanicId = await createMechanic([first, second], true);
    await reviewMechanic(database, mechanicId, "REJECT", "editor-2");
    const result = await submitOpportunityProposal(
      database,
      proposalFor(`Rejected Mech ${Date.now()}`, [
        { sourceType: "MECHANIC", sourceId: mechanicId },
      ]),
    );
    expect(result).toEqual({ ok: false, reason: "unresolvable_evidence" });
  });

  it("derives buildability from persisted assessments, never the caller", async () => {
    const database = getDatabase();
    const first = await createProject({ buildability: "TEAM_REQUIRED" });
    await publishProject(first.projectId);
    const proposal = proposalFor(`Derived Build ${Date.now()}`, [
      { sourceType: "PROJECT", sourceId: first.projectId },
    ]);
    const result = await submitOpportunityProposal(database, proposal);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    opportunityIds.push(result.opportunityId);
    const [row] = await database
      .select({
        assessmentId: opportunities.buildabilityAssessmentId,
        label: opportunities.buildabilityLabel,
      })
      .from(opportunities)
      .where(eq(opportunities.id, result.opportunityId))
      .limit(1);
    const [assessment] = await database
      .select({
        projectId: buildabilityAssessments.projectId,
        label: buildabilityAssessments.label,
      })
      .from(buildabilityAssessments)
      .where(eq(buildabilityAssessments.id, row?.assessmentId ?? ""))
      .limit(1);
    expect(assessment?.projectId).toBe(first.projectId);
    expect(row?.label).toBe("TEAM_REQUIRED");
  });

  it("uses the conservative label across multiple projects", async () => {
    const database = getDatabase();
    const solo = await createProject({ buildability: "SOLO_MVP" });
    const heavy = await createProject({ buildability: "TEAM_REQUIRED" });
    await publishProject(solo.projectId);
    await publishProject(heavy.projectId);
    const result = await submitOpportunityProposal(
      database,
      proposalFor(`Conservative Build ${Date.now()}`, [
        { sourceType: "PROJECT", sourceId: solo.projectId },
        { sourceType: "PROJECT", sourceId: heavy.projectId },
      ]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    opportunityIds.push(result.opportunityId);
    const [row] = await database
      .select({
        assessmentId: opportunities.buildabilityAssessmentId,
        label: opportunities.buildabilityLabel,
      })
      .from(opportunities)
      .where(eq(opportunities.id, result.opportunityId))
      .limit(1);
    expect(row?.label).toBe("TEAM_REQUIRED");
    const [anchor] = await database
      .select({ projectId: buildabilityAssessments.projectId })
      .from(buildabilityAssessments)
      .where(eq(buildabilityAssessments.id, row?.assessmentId ?? ""))
      .limit(1);
    expect(anchor?.projectId).toBe(heavy.projectId);
  });

  it("scores trusted source confidence into opportunity confidence", async () => {
    const database = getDatabase();
    const strong = await createProject({ confidence: 95 });
    const weak = await createProject({ confidence: 40 });
    await publishProject(strong.projectId);
    await publishProject(weak.projectId);
    const stamp = Date.now();
    const high = await submitOpportunityProposal(
      database,
      proposalFor(`Strong Signal ${stamp}`, [
        { sourceType: "PROJECT", sourceId: strong.projectId },
      ]),
    );
    const low = await submitOpportunityProposal(
      database,
      proposalFor(`Weak Signal ${stamp}`, [{ sourceType: "PROJECT", sourceId: weak.projectId }]),
    );
    expect(high.ok && low.ok).toBe(true);
    if (!high.ok || !low.ok) return;
    opportunityIds.push(high.opportunityId, low.opportunityId);
    expect(high.confidence).toBeGreaterThan(low.confidence);
  });

  it("gives duplicate evidence no confidence boost", async () => {
    const database = getDatabase();
    const first = await createProject({});
    await publishProject(first.projectId);
    const stamp = Date.now();
    const single = await submitOpportunityProposal(
      database,
      proposalFor(`Single Ref ${stamp}`, [{ sourceType: "PROJECT", sourceId: first.projectId }]),
    );
    const doubled = await submitOpportunityProposal(
      database,
      proposalFor(`Doubled Ref ${stamp}`, [
        { sourceType: "PROJECT", sourceId: first.projectId },
        { sourceType: "PROJECT", sourceId: first.projectId },
      ]),
    );
    expect(single.ok && doubled.ok).toBe(true);
    if (!single.ok || !doubled.ok) return;
    opportunityIds.push(single.opportunityId, doubled.opportunityId);
    expect(doubled.confidence).toBe(single.confidence);
  });

  it("rejects batches of four proposals", async () => {
    const database = getDatabase();
    const first = await createProject({});
    await expect(
      submitOpportunityBatch(
        database,
        [1, 2, 3, 4].map((index) =>
          proposalFor(`Batch ${Date.now()} ${index}`, [
            { sourceType: "PROJECT", sourceId: first.projectId },
          ]),
        ),
      ),
    ).rejects.toThrow();
  });

  it("enables eligibility on latest APPROVE", async () => {
    const database = getDatabase();
    const first = await createProject({});
    await publishProject(first.projectId);
    const result = await submitOpportunityProposal(
      database,
      proposalFor(`Approvable ${Date.now()}`, [
        { sourceType: "PROJECT", sourceId: first.projectId },
      ]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    opportunityIds.push(result.opportunityId);
    await reviewOpportunity(database, result.opportunityId, "APPROVE", "editor-1");
    const published = await publishOpportunity(database, result.opportunityId);
    expect(published).toEqual({ ok: true, opportunityId: result.opportunityId });
    const visible = await listPublicOpportunities(database);
    expect(visible.some((entry) => entry.id === result.opportunityId)).toBe(true);
  });

  it("hides opportunities after APPROVE then REJECT", async () => {
    const database = getDatabase();
    const first = await createProject({});
    await publishProject(first.projectId);
    const result = await submitOpportunityProposal(
      database,
      proposalFor(`Flipped Opp ${Date.now()}`, [
        { sourceType: "PROJECT", sourceId: first.projectId },
      ]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    opportunityIds.push(result.opportunityId);
    await reviewOpportunity(database, result.opportunityId, "APPROVE", "editor-1");
    expect(await publishOpportunity(database, result.opportunityId)).toEqual({
      ok: true,
      opportunityId: result.opportunityId,
    });
    await reviewOpportunity(database, result.opportunityId, "REJECT", "editor-2");
    const visible = await listPublicOpportunities(database);
    expect(visible.some((entry) => entry.id === result.opportunityId)).toBe(false);
  });

  it("keeps PUBLISHED rows without approval out of public projection", async () => {
    const database = getDatabase();
    const first = await createProject({});
    await publishProject(first.projectId);
    const result = await submitOpportunityProposal(
      database,
      proposalFor(`Unapproved Pub ${Date.now()}`, [
        { sourceType: "PROJECT", sourceId: first.projectId },
      ]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    opportunityIds.push(result.opportunityId);
    await database
      .update(opportunities)
      .set({ status: "PUBLISHED" })
      .where(eq(opportunities.id, result.opportunityId));
    const visible = await listPublicOpportunities(database);
    expect(visible.some((entry) => entry.id === result.opportunityId)).toBe(false);
  });

  it("blocks publication below the confidence threshold", async () => {
    const database = getDatabase();
    const weak = await createProject({ confidence: 40 });
    await publishProject(weak.projectId);
    const result = await submitOpportunityProposal(
      database,
      proposalFor(`Weak Opp ${Date.now()}`, [{ sourceType: "PROJECT", sourceId: weak.projectId }]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    opportunityIds.push(result.opportunityId);
    expect(result.confidence).toBeLessThan(55);
    await reviewOpportunity(database, result.opportunityId, "APPROVE", "editor-1");
    expect(await publishOpportunity(database, result.opportunityId)).toEqual({
      ok: false,
      reason: "not_approved",
    });
    const visible = await listPublicOpportunities(database);
    expect(visible.some((entry) => entry.id === result.opportunityId)).toBe(false);
  });

  it("transitions eligible reviewed opportunities to PUBLISHED", async () => {
    const database = getDatabase();
    const first = await createProject({});
    await publishProject(first.projectId);
    const result = await submitOpportunityProposal(
      database,
      proposalFor(`Shippable Opp ${Date.now()}`, [
        { sourceType: "PROJECT", sourceId: first.projectId },
      ]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    opportunityIds.push(result.opportunityId);
    await reviewOpportunity(database, result.opportunityId, "APPROVE", "editor-1");
    expect(await publishOpportunity(database, result.opportunityId)).toEqual({
      ok: true,
      opportunityId: result.opportunityId,
    });
    const [row] = await database
      .select({ status: opportunities.status, publishedAt: opportunities.publishedAt })
      .from(opportunities)
      .where(eq(opportunities.id, result.opportunityId))
      .limit(1);
    expect(row?.status).toBe("PUBLISHED");
    expect(row?.publishedAt).toBeInstanceOf(Date);
  });

  it("retries the same proposal without duplicating rows", async () => {
    const database = getDatabase();
    const first = await createProject({});
    await publishProject(first.projectId);
    const proposal = proposalFor(`Idempotent Opp ${Date.now()}`, [
      { sourceType: "PROJECT", sourceId: first.projectId },
    ]);
    const one = await submitOpportunityProposal(database, proposal);
    const two = await submitOpportunityProposal(database, proposal);
    expect(one.ok && two.ok).toBe(true);
    if (!one.ok || !two.ok) return;
    opportunityIds.push(one.opportunityId);
    expect(one.opportunityId).toBe(two.opportunityId);
    const key = canonicalOpportunityKey({
      title: proposal.title,
      proposedProduct: proposal.proposedProduct,
      targetUser: proposal.targetUser,
      marketScope: proposal.marketScope,
      subjectKeys: [`PROJECT:${first.projectId}`],
    });
    const rows = await database
      .select({ id: opportunities.id })
      .from(opportunities)
      .where(eq(opportunities.canonicalKey, key));
    expect(rows).toHaveLength(1);
  });

  it("projects only safe traceable data on public cards", async () => {
    const database = getDatabase();
    const first = await createProject({});
    await publishProject(first.projectId);
    const result = await submitOpportunityProposal(
      database,
      proposalFor(`Traceable Opp ${Date.now()}`, [
        { sourceType: "PROJECT", sourceId: first.projectId },
      ]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    opportunityIds.push(result.opportunityId);
    await reviewOpportunity(database, result.opportunityId, "APPROVE", "editor-1");
    await publishOpportunity(database, result.opportunityId);
    const visible = await listPublicOpportunities(database);
    const card = visible.find((entry) => entry.id === result.opportunityId);
    expect(card?.evidence).toHaveLength(1);
    const serialized = JSON.stringify(card);
    expect(serialized).not.toContain("editorActorId");
    expect(serialized).not.toContain("evidenceKey");
    expect(serialized).not.toContain("buildabilityAssessmentId");
    expect(serialized).not.toContain("javascript:");
  });
});
