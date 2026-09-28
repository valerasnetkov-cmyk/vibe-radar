import { desc, eq } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { opportunities, opportunityEvidence } from "@/server/db/schema";
import { latestOpportunityReview } from "@/server/modules/opportunities/review";
import {
  resolveOpportunityEvidence,
  type ResolvedMechanicSource,
  type ResolvedProjectSource,
} from "@/server/modules/opportunities/evidence";
import { isOpportunityPubliclyEligible } from "@/server/modules/opportunities/public-eligibility";

export type PublicOpportunityEvidence =
  | {
      kind: "PROJECT";
      name: string;
      slug: string;
      url: string;
      confidence: number;
    }
  | {
      kind: "MECHANIC";
      name: string;
      stage: string;
      confidence: number;
      projects: Array<{ name: string; slug: string; url: string }>;
    };

export type PublicOpportunity = {
  id: string;
  title: string;
  problemStatement: string;
  proposedProduct: string;
  targetUser: string;
  marketScope: string;
  buildabilityLabel: string;
  requiredCapabilities: string[];
  confidence: number;
  differentiation: string;
  risks: string[];
  evidence: PublicOpportunityEvidence[];
  publishedAt: string | null;
};

function toPublicEvidence(
  source: ResolvedProjectSource | ResolvedMechanicSource,
): PublicOpportunityEvidence {
  if (source.kind === "PROJECT") {
    return {
      kind: "PROJECT",
      name: source.name,
      slug: source.slug,
      url: source.url,
      confidence: source.confidence,
    };
  }
  return {
    kind: "MECHANIC",
    name: source.name,
    stage: source.stage,
    confidence: source.confidence,
    projects: source.projects,
  };
}

const PUBLIC_LIST_LIMIT = 50;

/**
 * Trusted public read model: rows must be PUBLISHED with a latest APPROVE
 * review and full deterministic eligibility. Projections carry hypothesis
 * prose plus traceable evidence only: no editor ids, review notes, evidence
 * keys, raw payloads, assessment ids, or unsafe URLs.
 */
export async function listPublicOpportunities(
  database: ReturnType<typeof getDatabase> = getDatabase(),
): Promise<PublicOpportunity[]> {
  const rows = await database
    .select()
    .from(opportunities)
    .where(eq(opportunities.status, "PUBLISHED"))
    .orderBy(desc(opportunities.publishedAt))
    .limit(PUBLIC_LIST_LIMIT);
  const visible: PublicOpportunity[] = [];
  for (const row of rows) {
    const review = await latestOpportunityReview(database, row.id);
    if (review?.decision !== "APPROVE") continue;
    if (!row.buildabilityLabel) continue;
    const stored = await database
      .select()
      .from(opportunityEvidence)
      .where(eq(opportunityEvidence.opportunityId, row.id));
    const resolution = await resolveOpportunityEvidence(
      database,
      stored.map((item) => ({
        sourceType: item.subjectType as "PROJECT" | "MECHANIC" | "SIGNAL" | "TREND",
        sourceId: item.subjectId,
        rationale: item.rationale,
      })),
    );
    if (resolution.resolved.length === 0) continue;
    const projectCount = new Set(
      resolution.resolved.flatMap((source) =>
        source.kind === "PROJECT" ? [source.projectId] : source.projects.map((p) => p.projectId),
      ),
    ).size;
    if (
      !isOpportunityPubliclyEligible({
        status: row.status,
        latestReview: "APPROVE",
        confidence: row.opportunityConfidence,
        resolvedSources: resolution.resolved.length,
        buildabilityPresent: row.buildabilityLabel !== null,
        titleValid: row.title.trim().length >= 5,
        problemValid: row.problemStatement.trim().length >= 10,
        proposedValid: row.proposedProduct.trim().length >= 10,
        differentiationValid: row.differentiationHypothesis.trim().length >= 10,
        traceableProjects: projectCount,
      })
    ) {
      continue;
    }
    visible.push({
      id: row.id,
      title: row.title,
      problemStatement: row.problemStatement,
      proposedProduct: row.proposedProduct,
      targetUser: row.targetUser,
      marketScope: row.marketScope,
      buildabilityLabel: row.buildabilityLabel,
      requiredCapabilities: row.requiredCapabilities ?? [],
      confidence: row.opportunityConfidence,
      differentiation: row.differentiationHypothesis,
      risks: row.riskSummary,
      evidence: resolution.resolved.map(toPublicEvidence),
      publishedAt: row.publishedAt?.toISOString() ?? null,
    });
  }
  return visible;
}
