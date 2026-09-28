import { eq } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { opportunities, opportunityEvidence } from "@/server/db/schema";
import {
  assessOpportunityConfidence,
  OPPORTUNITY_CONFIDENCE_VERSION,
} from "@/server/modules/opportunities/assessment";
import { resolveOpportunityBuildability } from "@/server/modules/opportunities/buildability";
import {
  validateOpportunityBatch,
  validateOpportunityProposal,
  type OpportunityProposal,
} from "@/server/modules/opportunities/contract";
import {
  resolveOpportunityEvidence,
  type ResolvedOpportunitySource,
} from "@/server/modules/opportunities/evidence";
import {
  canonicalOpportunityKey,
  opportunityEvidenceKey,
} from "@/server/modules/opportunities/identity";
import { latestOpportunityReview } from "@/server/modules/opportunities/review";
import { isOpportunityPubliclyEligible } from "@/server/modules/opportunities/public-eligibility";

export type SubmitOpportunityResult =
  | {
      ok: true;
      opportunityId: string;
      created: boolean;
      resolvedSources: number;
      insertedEvidence: number;
      confidence: number;
    }
  | { ok: false; reason: "missing_buildability" | "unresolvable_evidence" };

export type PublishOpportunityResult =
  | { ok: true; opportunityId: string }
  | { ok: false; reason: "not_found" | "not_eligible" | "not_approved" };

function subjectKeys(sources: readonly ResolvedOpportunitySource[]): string[] {
  return sources.map((source) => `${source.subjectType}:${source.subjectId}`);
}

function traceableProjects(sources: readonly ResolvedOpportunitySource[]): string[] {
  const ids: string[] = [];
  for (const source of sources) {
    if (source.kind === "PROJECT") ids.push(source.projectId);
    else ids.push(...source.projects.map((project) => project.projectId));
  }
  return [...new Set(ids)];
}

/**
 * Concurrent-safe get-or-create on the canonical key. The winner returns
 * created=true with its id; losers re-read the same row. Never synthetic
 * ids, never raw unique violations for normal races.
 */
export async function getOrCreateOpportunity(
  database: ReturnType<typeof getDatabase>,
  input: {
    canonicalKey: string;
    title: string;
    problemStatement: string;
    proposedProduct: string;
    targetUser: string;
    marketScope: "RU" | "GLOBAL" | "RU_GLOBAL";
    buildabilityAssessmentId: string;
    buildabilityLabel: "SOLO_MVP" | "SMALL_TEAM" | "TEAM_REQUIRED";
    requiredCapabilities: string[];
    differentiationHypothesis: string;
    riskSummary: string[];
    opportunityConfidence: number;
  },
): Promise<{ opportunityId: string; created: boolean }> {
  const [existing] = await database
    .select({ id: opportunities.id })
    .from(opportunities)
    .where(eq(opportunities.canonicalKey, input.canonicalKey))
    .limit(1);
  if (existing?.id) return { opportunityId: existing.id, created: false };

  const [inserted] = await database
    .insert(opportunities)
    .values({
      title: input.title,
      problemStatement: input.problemStatement,
      proposedProduct: input.proposedProduct,
      targetUser: input.targetUser,
      marketScope: input.marketScope,
      buildabilityAssessmentId: input.buildabilityAssessmentId,
      buildabilityLabel: input.buildabilityLabel,
      requiredCapabilities: input.requiredCapabilities,
      differentiationHypothesis: input.differentiationHypothesis,
      riskSummary: input.riskSummary,
      opportunityConfidence: input.opportunityConfidence,
      canonicalKey: input.canonicalKey,
      policyVersion: OPPORTUNITY_CONFIDENCE_VERSION,
      status: "PROPOSED",
    })
    .onConflictDoNothing()
    .returning({ id: opportunities.id });
  if (inserted?.id) return { opportunityId: inserted.id, created: true };

  const [reread] = await database
    .select({ id: opportunities.id })
    .from(opportunities)
    .where(eq(opportunities.canonicalKey, input.canonicalKey))
    .limit(1);
  if (reread?.id) return { opportunityId: reread.id, created: false };
  throw new Error("Opportunity could not be created or found");
}

/**
 * Idempotent evidence append keyed without rationale prose, so edited
 * prose never duplicates a source and duplicates never boost confidence.
 */
export async function appendOpportunityEvidence(
  database: ReturnType<typeof getDatabase>,
  opportunityId: string,
  sources: readonly ResolvedOpportunitySource[],
): Promise<number> {
  let inserted = 0;
  for (const source of sources) {
    const [row] = await database
      .insert(opportunityEvidence)
      .values({
        opportunityId,
        subjectType: source.subjectType,
        subjectId: source.subjectId,
        rationale: source.rationale,
        evidenceWeight: Math.round(source.confidence),
        evidenceKey: opportunityEvidenceKey({
          opportunityId,
          subjectType: source.subjectType,
          subjectId: source.subjectId,
        }),
      })
      .onConflictDoNothing()
      .returning({ id: opportunityEvidence.id });
    if (row) inserted += 1;
  }
  return inserted;
}

function confidenceInputs(
  sources: readonly ResolvedOpportunitySource[],
  unresolvedCount: number,
  buildabilityCovered: boolean,
) {
  const confidences = sources.map((source) => source.confidence);
  return {
    subjects: subjectKeys(sources),
    projectIds: traceableProjects(sources),
    mechanicCount: sources.filter((source) => source.kind === "MECHANIC").length,
    sourceConfidenceRatio:
      confidences.length > 0
        ? confidences.reduce((total, value) => total + value, 0) / confidences.length / 100
        : 0,
    buildabilityCoverage: buildabilityCovered ? 1 : 0,
    unresolvedCount,
  };
}

/**
 * Trusted single-proposal flow: validate, resolve, derive buildability and
 * confidence, get-or-create, append evidence idempotently, materialize
 * deterministic fields. Status starts at PROPOSED; publication is explicit.
 */
export async function submitOpportunityProposal(
  database: ReturnType<typeof getDatabase>,
  proposal: OpportunityProposal,
): Promise<SubmitOpportunityResult> {
  const resolution = await resolveOpportunityEvidence(database, proposal.evidence);
  if (resolution.resolved.length === 0) return { ok: false, reason: "unresolvable_evidence" };
  const projectIds = traceableProjects(resolution.resolved);
  const buildability = await resolveOpportunityBuildability(database, projectIds);
  if (!buildability.ok) return { ok: false, reason: "missing_buildability" };

  const canonicalKey = canonicalOpportunityKey({
    title: proposal.title,
    proposedProduct: proposal.proposedProduct,
    targetUser: proposal.targetUser,
    marketScope: proposal.marketScope,
    subjectKeys: subjectKeys(resolution.resolved),
  });
  const unresolvedCount = resolution.unsupported.length + resolution.unknown.length;
  const { confidence } = assessOpportunityConfidence(
    confidenceInputs(resolution.resolved, unresolvedCount, true),
  );

  const { opportunityId, created } = await getOrCreateOpportunity(database, {
    canonicalKey,
    title: proposal.title,
    problemStatement: proposal.problemStatement,
    proposedProduct: proposal.proposedProduct,
    targetUser: proposal.targetUser,
    marketScope: proposal.marketScope,
    buildabilityAssessmentId: buildability.assessmentId,
    buildabilityLabel: buildability.label,
    requiredCapabilities: proposal.requiredCapabilities,
    differentiationHypothesis: proposal.differentiationHypothesis,
    riskSummary: proposal.riskSummary,
    opportunityConfidence: confidence,
  });
  const insertedEvidence = await appendOpportunityEvidence(
    database,
    opportunityId,
    resolution.resolved,
  );
  await database
    .update(opportunities)
    .set({
      opportunityConfidence: confidence,
      buildabilityAssessmentId: buildability.assessmentId,
      buildabilityLabel: buildability.label,
      updatedAt: new Date(),
    })
    .where(eq(opportunities.id, opportunityId));
  return {
    ok: true,
    opportunityId,
    created,
    resolvedSources: resolution.resolved.length,
    insertedEvidence,
    confidence,
  };
}

/**
 * Strict 1-3 batch intake. Batches outside the range reject wholesale;
 * accepted proposals submit independently through the trusted flow.
 */
export async function submitOpportunityBatch(
  database: ReturnType<typeof getDatabase>,
  batch: unknown,
): Promise<Array<SubmitOpportunityResult>> {
  const proposals = validateOpportunityBatch(batch);
  const results: SubmitOpportunityResult[] = [];
  for (const proposal of proposals) {
    results.push(await submitOpportunityProposal(database, proposal));
  }
  return results;
}

export async function validateAndSubmitOpportunity(
  database: ReturnType<typeof getDatabase>,
  value: unknown,
): Promise<SubmitOpportunityResult> {
  return submitOpportunityProposal(database, validateOpportunityProposal(value));
}

/**
 * Explicit trusted publish transition. Re-resolves current eligibility from
 * PostgreSQL (approval, evidence, buildability, confidence) and only then
 * flips PROPOSED/REVIEWED to PUBLISHED with a server timestamp. No
 * Telegram side effect; opportunity cards are web-only.
 */
export async function publishOpportunity(
  database: ReturnType<typeof getDatabase>,
  opportunityId: string,
): Promise<PublishOpportunityResult> {
  const [row] = await database
    .select()
    .from(opportunities)
    .where(eq(opportunities.id, opportunityId))
    .limit(1);
  if (!row) return { ok: false, reason: "not_found" };
  if (row.status === "REJECTED") return { ok: false, reason: "not_eligible" };

  const storedEvidence = await database
    .select()
    .from(opportunityEvidence)
    .where(eq(opportunityEvidence.opportunityId, opportunityId));
  const resolution = await resolveOpportunityEvidence(
    database,
    storedEvidence.map((item) => ({
      sourceType: item.subjectType as "PROJECT" | "MECHANIC" | "SIGNAL" | "TREND",
      sourceId: item.subjectId,
      rationale: item.rationale,
    })),
  );
  const projectIds = traceableProjects(resolution.resolved);
  const buildability = await resolveOpportunityBuildability(database, projectIds);
  const review = await latestOpportunityReview(database, opportunityId);
  const { confidence } = assessOpportunityConfidence(
    confidenceInputs(
      resolution.resolved,
      resolution.unsupported.length + resolution.unknown.length,
      buildability.ok,
    ),
  );
  const eligible = isOpportunityPubliclyEligible({
    status: row.status,
    latestReview: review?.decision ?? null,
    confidence,
    resolvedSources: resolution.resolved.length,
    buildabilityPresent: buildability.ok,
    titleValid: row.title.trim().length >= 5,
    problemValid: row.problemStatement.trim().length >= 10,
    proposedValid: row.proposedProduct.trim().length >= 10,
    differentiationValid: row.differentiationHypothesis.trim().length >= 10,
    traceableProjects: projectIds.length,
  });
  if (!eligible || review?.decision !== "APPROVE") return { ok: false, reason: "not_approved" };

  await database
    .update(opportunities)
    .set({
      status: "PUBLISHED",
      opportunityConfidence: confidence,
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(opportunities.id, opportunityId));
  return { ok: true, opportunityId };
}
