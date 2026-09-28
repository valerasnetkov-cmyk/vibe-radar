import { eq } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { projects } from "@/server/db/schema";
import { listPublicMechanics } from "@/server/modules/mechanics/public-read-model";
import { getPublishedProject } from "@/server/modules/publishing/read-model";
import type {
  OpportunityEvidenceProposal,
  OpportunitySourceType,
} from "@/server/modules/opportunities/contract";

export type ResolvedProjectSource = {
  kind: "PROJECT";
  subjectType: "PROJECT";
  subjectId: string;
  projectId: string;
  name: string;
  slug: string;
  url: string;
  confidence: number;
  publishedAt: string;
  rationale: string;
};

export type ResolvedMechanicSource = {
  kind: "MECHANIC";
  subjectType: "MECHANIC";
  subjectId: string;
  name: string;
  stage: string;
  confidence: number;
  lastObservedAt: string;
  projects: Array<{ projectId: string; name: string; slug: string; url: string }>;
  rationale: string;
};

export type ResolvedOpportunitySource = ResolvedProjectSource | ResolvedMechanicSource;

export type UnresolvedOpportunitySource = {
  kind: "UNSUPPORTED" | "UNKNOWN";
  subjectType: OpportunitySourceType;
  subjectId: string;
};

export type OpportunityEvidenceResolution = {
  resolved: ResolvedOpportunitySource[];
  unsupported: UnresolvedOpportunitySource[];
  unknown: UnresolvedOpportunitySource[];
};

/**
 * Resolve proposal evidence against PostgreSQL truth. PROJECT sources
 * require a real published Stage 08 record (snapshot confidence and URL);
 * MECHANIC sources must pass the full Stage 10 public eligibility gate
 * (never a bare ACTIVE check). SIGNAL/TREND have no canonical persisted
 * trust boundary and fail closed; unknown ids never count. No network,
 * GitHub, or model calls. Duplicate subjects dedupe with first rationale.
 */
export async function resolveOpportunityEvidence(
  database: ReturnType<typeof getDatabase>,
  items: readonly OpportunityEvidenceProposal[],
): Promise<OpportunityEvidenceResolution> {
  const resolved: ResolvedOpportunitySource[] = [];
  const unsupported: UnresolvedOpportunitySource[] = [];
  const unknown: UnresolvedOpportunitySource[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const dedupeKey = `${item.sourceType}:${item.sourceId}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    if (item.sourceType === "SIGNAL" || item.sourceType === "TREND") {
      unsupported.push({
        kind: "UNSUPPORTED",
        subjectType: item.sourceType,
        subjectId: item.sourceId,
      });
      continue;
    }

    if (item.sourceType === "PROJECT") {
      const [project] = await database
        .select({ id: projects.id, slug: projects.slug })
        .from(projects)
        .where(eq(projects.id, item.sourceId))
        .limit(1);
      if (!project) {
        unknown.push({ kind: "UNKNOWN", subjectType: item.sourceType, subjectId: item.sourceId });
        continue;
      }
      const published = await getPublishedProject(database, project.slug);
      if (!published) {
        unknown.push({ kind: "UNKNOWN", subjectType: item.sourceType, subjectId: item.sourceId });
        continue;
      }
      resolved.push({
        kind: "PROJECT",
        subjectType: "PROJECT",
        subjectId: item.sourceId,
        projectId: published.projectId,
        name: published.name,
        slug: published.slug,
        url: published.content.projectUrl,
        confidence: published.content.confidence,
        publishedAt: published.publishedAt.toISOString(),
        rationale: item.rationale,
      });
      continue;
    }

    const eligible = await listPublicMechanics(database);
    const mechanic = eligible.find((entry) => entry.id === item.sourceId);
    if (!mechanic) {
      unknown.push({ kind: "UNKNOWN", subjectType: item.sourceType, subjectId: item.sourceId });
      continue;
    }
    const supporting: ResolvedMechanicSource["projects"] = [];
    for (const source of mechanic.sources) {
      const [project] = await database
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.slug, source.projectSlug))
        .limit(1);
      if (!project) continue;
      supporting.push({
        projectId: project.id,
        name: source.projectName,
        slug: source.projectSlug,
        url: source.projectUrl,
      });
    }
    resolved.push({
      kind: "MECHANIC",
      subjectType: "MECHANIC",
      subjectId: item.sourceId,
      name: mechanic.name,
      stage: mechanic.stage,
      confidence: mechanic.confidence,
      lastObservedAt: mechanic.lastObservedAt,
      projects: supporting,
      rationale: item.rationale,
    });
  }

  return { resolved, unsupported, unknown };
}
