import { eq } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";
import { mechanicEvidence, productMechanics } from "@/server/db/schema";
import { assessMechanic, maxStage } from "@/server/modules/mechanics/assessment";
import type { MechanicProposal } from "@/server/modules/mechanics/contract";
import { evidenceKeyFor, normalizeMechanicKey } from "@/server/modules/mechanics/identity";
import {
  resolveMechanicEvidence,
  type ResolvedMechanicEvidence,
} from "@/server/modules/mechanics/evidence";

export type SubmitProposalResult = {
  mechanicId: string;
  created: boolean;
  resolvedCount: number;
  skippedCount: number;
  insertedEvidence: number;
  assessment: ReturnType<typeof assessMechanic>;
};

/**
 * Canonical mechanic get-or-create on the normalized key. Concurrent
 * submitters race a conflict-proof INSERT; the winner returns created=true
 * with its id, losers re-read the same row. Never a synthetic id, never a
 * raw unique violation for concurrent duplicates.
 */
export async function getOrCreateMechanic(
  database: ReturnType<typeof getDatabase>,
  input: {
    canonicalKey: string;
    canonicalName: string;
    description: string;
    affectedCategories: string[];
    practicalImplications: string[];
    risks: string[];
    observedAt: Date;
  },
): Promise<{ mechanicId: string; created: boolean }> {
  const [existing] = await database
    .select({ id: productMechanics.id })
    .from(productMechanics)
    .where(eq(productMechanics.canonicalKey, input.canonicalKey))
    .limit(1);
  if (existing?.id) return { mechanicId: existing.id, created: false };

  const [inserted] = await database
    .insert(productMechanics)
    .values({
      canonicalName: input.canonicalName,
      canonicalKey: input.canonicalKey,
      description: input.description,
      firstObservedAt: input.observedAt,
      lastObservedAt: input.observedAt,
      stage: "SPARK",
      velocity: 0,
      confidence: 0,
      status: "ACTIVE",
      affectedCategories: input.affectedCategories,
      practicalImplications: input.practicalImplications,
      risks: input.risks,
    })
    .onConflictDoNothing()
    .returning({ id: productMechanics.id });
  if (inserted?.id) return { mechanicId: inserted.id, created: true };

  const [reread] = await database
    .select({ id: productMechanics.id })
    .from(productMechanics)
    .where(eq(productMechanics.canonicalKey, input.canonicalKey))
    .limit(1);
  if (reread?.id) return { mechanicId: reread.id, created: false };
  throw new Error("Mechanic could not be created or found");
}

/**
 * Idempotent evidence append: deterministic evidence keys with
 * ON CONFLICT DO NOTHING, so retries never inflate counts, confidence,
 * or velocity. Returns the number of newly stored rows.
 */
export async function appendMechanicEvidence(
  database: ReturnType<typeof getDatabase>,
  mechanicId: string,
  resolved: readonly ResolvedMechanicEvidence[],
): Promise<number> {
  let inserted = 0;
  for (const item of resolved) {
    const [row] = await database
      .insert(mechanicEvidence)
      .values({
        mechanicId,
        signalId: item.signalId,
        projectId: item.projectId,
        sourceEventId: item.sourceEventId,
        independenceGroup: item.group,
        independenceBasis: item.resolved ? "project" : "unresolved",
        evidenceKey: evidenceKeyFor({
          mechanicId,
          projectId: item.projectId,
          sourceEventId: item.sourceEventId,
          signalId: item.signalId,
          group: item.group,
        }),
        observedAt: item.observedAt,
        strength: Math.round(item.strength),
      })
      .onConflictDoNothing()
      .returning({ id: mechanicEvidence.id });
    if (row) inserted += 1;
  }
  return inserted;
}

/**
 * Atomic reassessment over the canonical stored evidence set: same stored
 * evidence always yields the same assessment. Updates first/last observed
 * bounds, metrics, and policy version; the lifecycle stage never regresses
 * silently.
 */
export async function reassessMechanic(
  database: ReturnType<typeof getDatabase>,
  mechanicId: string,
  now = new Date(),
) {
  return database.transaction(async (transaction) => {
    const stored = await transaction
      .select({
        group: mechanicEvidence.independenceGroup,
        basis: mechanicEvidence.independenceBasis,
        observedAt: mechanicEvidence.observedAt,
      })
      .from(mechanicEvidence)
      .where(eq(mechanicEvidence.mechanicId, mechanicId));
    const [current] = await transaction
      .select({ stage: productMechanics.stage })
      .from(productMechanics)
      .where(eq(productMechanics.id, mechanicId))
      .limit(1);
    const assessment = assessMechanic({
      evidence: stored.map((row) => ({
        group: row.group,
        observedAt: row.observedAt ?? now,
        resolved: row.basis !== "unresolved" && row.group !== "unresolved",
      })),
      now,
    });
    const timestamps = stored
      .map((row) => row.observedAt?.getTime())
      .filter((value): value is number => typeof value === "number");
    const bounds =
      timestamps.length > 0
        ? {
            firstObservedAt: new Date(Math.min(...timestamps)),
            lastObservedAt: new Date(Math.max(...timestamps)),
          }
        : { firstObservedAt: now, lastObservedAt: now };
    const [updated] = await transaction
      .update(productMechanics)
      .set({
        ...bounds,
        stage: current ? maxStage(current.stage, assessment.stage) : assessment.stage,
        velocity: assessment.velocity,
        confidence: assessment.confidence,
        policyVersion: assessment.policyVersion,
      })
      .where(eq(productMechanics.id, mechanicId))
      .returning({ id: productMechanics.id });
    return { mechanicId: updated?.id ?? mechanicId, assessment };
  });
}

/**
 * Editor-assisted proposal intake: validate untrusted input, resolve
 * trusted evidence, get-or-create the cluster, append new evidence
 * idempotently, and reassess atomically. New mechanics stay ACTIVE but
 * unpublished until an explicit APPROVE review arrives.
 */
export async function submitMechanicProposal(
  database: ReturnType<typeof getDatabase>,
  proposal: MechanicProposal,
  now = new Date(),
): Promise<SubmitProposalResult> {
  const canonicalKey = normalizeMechanicKey(proposal.canonicalName);
  const resolution = await resolveMechanicEvidence(database, proposal.evidence);
  const firstObserved =
    resolution.resolved.length > 0
      ? new Date(Math.min(...resolution.resolved.map((item) => item.observedAt.getTime())))
      : now;
  const { mechanicId, created } = await getOrCreateMechanic(database, {
    canonicalKey,
    canonicalName: proposal.canonicalName.trim().slice(0, 160),
    description: proposal.description,
    affectedCategories: proposal.affectedCategories,
    practicalImplications: proposal.practicalImplications,
    risks: proposal.risks,
    observedAt: firstObserved,
  });
  const insertedEvidence = await appendMechanicEvidence(database, mechanicId, resolution.resolved);
  const { assessment } = await reassessMechanic(database, mechanicId, now);
  return {
    mechanicId,
    created,
    resolvedCount: resolution.resolved.length,
    skippedCount: resolution.skipped.length,
    insertedEvidence,
    assessment,
  };
}
