import {
  MECHANIC_POLICY_VERSION,
  type MechanicAssessment,
  type MechanicStage,
} from "@/server/modules/mechanics/contract";
import { UNRESOLVED_GROUP } from "@/server/modules/mechanics/evidence";

export const MECHANIC_RECENT_WINDOW_DAYS = 30;
export const MECHANIC_ESTABLISHED_MIN_GROUPS = 5;
export const MECHANIC_ESTABLISHED_MIN_DAYS = 90;
export const MECHANIC_BREAKOUT_MIN_GROUPS = 5;
export const MECHANIC_BREAKOUT_MIN_VELOCITY = 70;
export const MECHANIC_RISING_MIN_GROUPS = 3;
export const MECHANIC_PUBLIC_MIN_GROUPS = 2;
export const MECHANIC_PUBLIC_MIN_CONFIDENCE = 50;

const STAGE_RANK: Record<MechanicStage, number> = {
  SPARK: 0,
  RISING: 1,
  BREAKOUT: 2,
  ESTABLISHED: 3,
};

export type AssessableEvidence = {
  group: string;
  observedAt: Date;
  resolved: boolean;
};

/**
 * Deterministic v1 mechanic assessment over trusted resolved evidence.
 * Pure: identical evidence plus identical evaluation time yields identical
 * output. No LLM, no VIBE SCORE, no stars, no OUTSCAN, no approval input.
 *
 * Velocity v1: 40 points for the share of independent groups active in the
 * recent window plus up to 60 points for newly formed groups (capped at 3),
 * so duplicate observations of one group add nothing and stale-only
 * evidence scores zero.
 *
 * Confidence v1: breadth of independent groups, evidence depth, recency
 * proof, minus an unresolved-evidence penalty. Duplicates never inflate it.
 *
 * Lifecycle v1: SPARK by default; RISING needs multiple independent groups
 * with recent expansion; BREAKOUT needs broad adoption plus high velocity;
 * ESTABLISHED needs broad adoption over a maturity span and therefore can
 * never be assigned to a young mechanic merely for low velocity.
 */
export function assessMechanic(input: {
  evidence: readonly AssessableEvidence[];
  now?: Date;
  policyVersion?: typeof MECHANIC_POLICY_VERSION;
}): MechanicAssessment {
  const now = input.now ?? new Date();
  const counted = input.evidence.filter((item) => item.resolved && item.group !== UNRESOLVED_GROUP);
  const unresolvedCount = input.evidence.length - counted.length;
  const groups = new Map<string, Date[]>();
  for (const item of counted) {
    const list = groups.get(item.group) ?? [];
    list.push(item.observedAt);
    groups.set(item.group, list);
  }
  const groupCount = groups.size;
  const windowStart = now.getTime() - MECHANIC_RECENT_WINDOW_DAYS * 86400000;
  let recentGroups = 0;
  let newGroups = 0;
  let firstSeenAt: Date | null = null;
  for (const timestamps of groups.values()) {
    const first = new Date(Math.min(...timestamps.map((date) => date.getTime())));
    const last = new Date(Math.max(...timestamps.map((date) => date.getTime())));
    if (!firstSeenAt || first < firstSeenAt) firstSeenAt = first;
    if (last.getTime() >= windowStart) recentGroups += 1;
    if (first.getTime() >= windowStart) newGroups += 1;
  }
  const maturityDays = firstSeenAt
    ? Math.max(0, (now.getTime() - firstSeenAt.getTime()) / 86400000)
    : 0;

  const velocity =
    groupCount === 0
      ? 0
      : Math.round(
          Math.min(
            100,
            Math.max(0, 40 * (recentGroups / groupCount) + 60 * Math.min(1, newGroups / 3)),
          ),
        );

  const confidence = Math.round(
    Math.min(
      100,
      Math.max(
        0,
        30 * Math.min(1, groupCount / 2) +
          25 * Math.min(1, groupCount / 5) +
          15 * Math.min(1, counted.length / 6) +
          (recentGroups >= 1 ? 10 : 0) -
          Math.min(20, unresolvedCount * 10),
      ),
    ),
  );

  let stage: MechanicStage = "SPARK";
  if (
    groupCount >= MECHANIC_ESTABLISHED_MIN_GROUPS &&
    maturityDays >= MECHANIC_ESTABLISHED_MIN_DAYS
  ) {
    stage = "ESTABLISHED";
  } else if (
    groupCount >= MECHANIC_BREAKOUT_MIN_GROUPS &&
    velocity >= MECHANIC_BREAKOUT_MIN_VELOCITY
  ) {
    stage = "BREAKOUT";
  } else if (groupCount >= MECHANIC_RISING_MIN_GROUPS && recentGroups >= 2) {
    stage = "RISING";
  }

  return {
    stage,
    independentSourceCount: groupCount,
    evidenceCount: counted.length,
    confidence,
    velocity,
    policyVersion: MECHANIC_POLICY_VERSION,
  };
}

/** Monotonic lifecycle guard: reassessment never silently regresses a stage. */
export function maxStage(current: MechanicStage, next: MechanicStage): MechanicStage {
  return STAGE_RANK[next] >= STAGE_RANK[current] ? next : current;
}
