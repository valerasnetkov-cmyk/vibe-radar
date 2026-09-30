import { eq } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { projects, sourceEvents } from "@/server/db/schema";
import type { MechanicEvidenceProposal } from "@/server/modules/mechanics/contract";

export const UNRESOLVED_GROUP = "unresolved";

export type ResolvedMechanicEvidence = {
  projectId: string | null;
  sourceEventId: string | null;
  signalId: string | null;
  strength: number;
  observedAt: Date;
  /** Server-derived group, or UNRESOLVED when independence is unprovable. */
  group: string;
  basis: "project" | "publisher" | "unresolved";
  resolved: boolean;
};

export type EvidenceResolution = {
  resolved: ResolvedMechanicEvidence[];
  skipped: Array<{ index: number; reason: "unknown-reference" | "no-persisted-anchor" }>;
};

/**
 * Pure server-side independence rule for the GitHub-first implementation:
 * evidence anchored to the same canonical project shares one group, so
 * repeated observations of one origin can never inflate the independent
 * implementation count. References without a verifiable project anchor are
 * marked unresolved and excluded from independence counting. Fork/mirror
 * lineage is NOT invented: without persisted provenance, distinct
 * repositories are documented as not proven independent (see docs), while
 * same-project observations are conservatively merged.
 */
const TRUSTED_PUBLISHER_PROVIDERS = new Set(["chrome"]);

export function deriveIndependenceGroup(
  projectId: string | null,
  provider: string | null,
): { group: string; basis: "project" | "publisher" | "unresolved" } {
  if (projectId) return { group: `project:${projectId}`, basis: "project" };
  if (provider && TRUSTED_PUBLISHER_PROVIDERS.has(provider)) {
    return { group: `publisher:${provider}`, basis: "publisher" };
  }
  return { group: UNRESOLVED_GROUP, basis: "unresolved" };
}

/**
 * Resolve proposal evidence against PostgreSQL truth. Verifies referenced
 * projects and source events exist, derives observation timestamps from
 * persisted retrieval/project times (never proposal timestamps), fetches
 * nothing external, and skips unknown or anchor-less references
 * deterministically.
 */
export async function resolveMechanicEvidence(
  database: ReturnType<typeof getDatabase>,
  items: readonly MechanicEvidenceProposal[],
): Promise<EvidenceResolution> {
  const resolved: ResolvedMechanicEvidence[] = [];
  const skipped: EvidenceResolution["skipped"] = [];
  for (const [index, item] of items.entries()) {
    let projectId: string | null = null;
    let sourceEventId: string | null = null;
    let observedAt: Date | null = null;
    let provider: string | null = null;

    if (item.projectId) {
      const [project] = await database
        .select({
          id: projects.id,
          firstSeenAt: projects.firstSeenAt,
          lastSeenAt: projects.lastSeenAt,
        })
        .from(projects)
        .where(eq(projects.id, item.projectId))
        .limit(1);
      if (!project) {
        skipped.push({ index, reason: "unknown-reference" });
        continue;
      }
      projectId = project.id;
      observedAt = project.lastSeenAt ?? project.firstSeenAt ?? null;
    }

    if (item.sourceEventId) {
      const [event] = await database
        .select({ id: sourceEvents.id, retrievedAt: sourceEvents.retrievedAt, provider: sourceEvents.provider })
        .from(sourceEvents)
        .where(eq(sourceEvents.id, item.sourceEventId))
        .limit(1);
      if (!event) {
        skipped.push({ index, reason: "unknown-reference" });
        continue;
      }
      sourceEventId = event.id;
      provider = event.provider;
      // Source retrieval time outranks project rollups for observation timing.
      observedAt = event.retrievedAt ?? observedAt;
    }

    if (!projectId && !sourceEventId) {
      // A bare signal id has no persisted anchor to verify or timestamp.
      skipped.push({ index, reason: "no-persisted-anchor" });
      continue;
    }

    const independence = deriveIndependenceGroup(projectId, provider);
    resolved.push({
      projectId,
      sourceEventId,
      signalId: item.signalId ?? null,
      strength: typeof item.strength === "number" ? Math.min(100, Math.max(0, item.strength)) : 50,
      observedAt: observedAt ?? new Date(),
      group: independence.group,
      basis: independence.basis,
      resolved: independence.group !== UNRESOLVED_GROUP,
    });
  }
  return { resolved, skipped };
}
