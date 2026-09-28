import { desc, eq, inArray } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import {
  mechanicEvidence,
  mechanicReviews,
  productMechanics,
  projects,
  providerIdentities,
} from "@/server/db/schema";
import {
  MECHANIC_PUBLIC_MIN_CONFIDENCE,
  MECHANIC_PUBLIC_MIN_GROUPS,
} from "@/server/modules/mechanics/assessment";

export type PublicMechanicSource = {
  projectName: string;
  projectSlug: string;
  projectUrl: string;
  observedAt: string;
};

export type PublicMechanic = {
  id: string;
  name: string;
  description: string;
  stage: string;
  velocity: number;
  confidence: number;
  independentSourceCount: number;
  evidenceCount: number;
  categories: string[];
  practicalImplications: string[];
  risks: string[];
  lastObservedAt: string;
  sources: PublicMechanicSource[];
};

export type EligibilityInput = {
  status: string;
  latestReview: "APPROVE" | "REJECT" | null;
  independentSourceCount: number;
  confidence: number;
  hasTraceableEvidence: boolean;
  nameValid: boolean;
  descriptionValid: boolean;
};

/**
 * Public eligibility gate. ACTIVE alone is never sufficient: a mechanic
 * goes public only with a latest APPROVE review, enough independent
 * evidence, non-low confidence, traceable sources, and valid content.
 */
export function isMechanicPubliclyEligible(input: EligibilityInput): boolean {
  return (
    input.status === "ACTIVE" &&
    input.latestReview === "APPROVE" &&
    input.independentSourceCount >= MECHANIC_PUBLIC_MIN_GROUPS &&
    input.confidence >= MECHANIC_PUBLIC_MIN_CONFIDENCE &&
    input.hasTraceableEvidence &&
    input.nameValid &&
    input.descriptionValid
  );
}

function isHttpUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

const PUBLIC_LIST_LIMIT = 50;
const PUBLIC_SOURCES_LIMIT = 8;

/**
 * Trusted public read model: only eligible reviewed mechanics, projected
 * without editor identities, review notes, internal keys, grouping
 * internals, or raw source metadata. Supporting projects render once per
 * project as implementations, never as inflated independent counts.
 */
export async function listPublicMechanics(
  database: ReturnType<typeof getDatabase> = getDatabase(),
): Promise<PublicMechanic[]> {
  const mechanics = await database
    .select()
    .from(productMechanics)
    .where(eq(productMechanics.status, "ACTIVE"))
    .orderBy(desc(productMechanics.lastObservedAt))
    .limit(PUBLIC_LIST_LIMIT);
  if (!mechanics.length) return [];
  const ids = mechanics.map((row) => row.id);

  const evidenceRows = await database
    .select()
    .from(mechanicEvidence)
    .where(inArray(mechanicEvidence.mechanicId, ids));
  const reviews = await database
    .select()
    .from(mechanicReviews)
    .where(inArray(mechanicReviews.mechanicId, ids))
    .orderBy(desc(mechanicReviews.reviewedAt));
  const latestByMechanic = new Map<string, "APPROVE" | "REJECT">();
  for (const review of reviews) {
    if (!latestByMechanic.has(review.mechanicId)) {
      latestByMechanic.set(review.mechanicId, review.decision);
    }
  }

  const projectIds = [
    ...new Set(evidenceRows.map((row) => row.projectId).filter((id): id is string => Boolean(id))),
  ];
  const projectRows =
    projectIds.length > 0
      ? await database.select().from(projects).where(inArray(projects.id, projectIds))
      : [];
  const projectsById = new Map(projectRows.map((row) => [row.id, row]));
  const identityRows =
    projectIds.length > 0
      ? await database
          .select()
          .from(providerIdentities)
          .where(inArray(providerIdentities.projectId, projectIds))
      : [];
  const urlByProject = new Map<string, string>();
  for (const identity of identityRows) {
    if (!urlByProject.has(identity.projectId) && isHttpUrl(identity.providerUrl)) {
      urlByProject.set(identity.projectId, identity.providerUrl);
    }
  }

  const eligible: PublicMechanic[] = [];
  for (const mechanic of mechanics) {
    const rows = evidenceRows.filter((row) => row.mechanicId === mechanic.id);
    const groups = new Set(
      rows
        .filter((row) => row.independenceBasis !== "unresolved")
        .map((row) => row.independenceGroup),
    );
    const observedByProject = new Map<string, Date | null>();
    for (const row of rows) {
      if (!row.projectId) continue;
      const current = observedByProject.get(row.projectId);
      if (current === undefined || (row.observedAt && (!current || row.observedAt > current))) {
        observedByProject.set(row.projectId, row.observedAt);
      }
    }
    const sources: PublicMechanicSource[] = [];
    for (const [projectId, observedAt] of observedByProject) {
      const project = projectsById.get(projectId);
      const url = urlByProject.get(projectId);
      if (!project || !url) continue;
      sources.push({
        projectName: project.name,
        projectSlug: project.slug,
        projectUrl: url,
        observedAt: (observedAt ?? mechanic.lastObservedAt).toISOString(),
      });
      if (sources.length >= PUBLIC_SOURCES_LIMIT) break;
    }
    if (
      !isMechanicPubliclyEligible({
        status: mechanic.status,
        latestReview: latestByMechanic.get(mechanic.id) ?? null,
        independentSourceCount: groups.size,
        confidence: mechanic.confidence,
        hasTraceableEvidence: sources.length > 0,
        nameValid: mechanic.canonicalName.trim().length >= 3,
        descriptionValid: mechanic.description.trim().length >= 10,
      })
    ) {
      continue;
    }
    eligible.push({
      id: mechanic.id,
      name: mechanic.canonicalName,
      description: mechanic.description,
      stage: mechanic.stage,
      velocity: mechanic.velocity,
      confidence: mechanic.confidence,
      independentSourceCount: groups.size,
      evidenceCount: rows.length,
      categories: mechanic.affectedCategories,
      practicalImplications: mechanic.practicalImplications,
      risks: mechanic.risks,
      lastObservedAt: mechanic.lastObservedAt.toISOString(),
      sources,
    });
  }
  return eligible;
}

/** Publicly eligible mechanics linked to one project through stored evidence. */
export async function getPublicMechanicsForProject(
  database: ReturnType<typeof getDatabase> = getDatabase(),
  projectId: string,
): Promise<PublicMechanic[]> {
  const linked = await database
    .select({ mechanicId: mechanicEvidence.mechanicId })
    .from(mechanicEvidence)
    .where(eq(mechanicEvidence.projectId, projectId));
  if (!linked.length) return [];
  const linkedIds = new Set(linked.map((row) => row.mechanicId));
  const all = await listPublicMechanics(database);
  return all.filter((mechanic) => linkedIds.has(mechanic.id));
}
