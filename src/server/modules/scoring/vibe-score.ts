import type { GrowthResult } from "@/server/modules/growth/calculate";

export const SCORE_VERSION = 1;

export type ScoreComponents = {
  growth: number;
  vibeRelevance: number;
  freshness: number;
  developmentActivity: number;
  community: number;
  documentation: number;
  originality: number;
};

export type ScorePenalties = {
  forkOrMirror: number;
  prolongedInactivity: number;
  unclearLicense: number;
  suspiciousGrowth: number;
  weakDocumentation: number;
  duplicateCandidate: number;
};

export type VibeScoreInput = {
  components: ScoreComponents;
  penalties?: Partial<ScorePenalties>;
};

export type VibeScore = {
  scoreVersion: typeof SCORE_VERSION;
  components: ScoreComponents;
  penalties: ScorePenalties;
  beforePenalties: number;
  finalScore: number;
};

const WEIGHTS: Record<keyof ScoreComponents, number> = {
  growth: 35,
  vibeRelevance: 25,
  freshness: 15,
  developmentActivity: 10,
  community: 5,
  documentation: 5,
  originality: 5,
};

const PENALTY_CAPS: ScorePenalties = {
  forkOrMirror: 30,
  prolongedInactivity: 20,
  unclearLicense: 10,
  suspiciousGrowth: 30,
  weakDocumentation: 10,
  duplicateCandidate: 15,
};

function bounded(value: number): number {
  return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
}

function boundedPenalties(input: Partial<ScorePenalties> = {}): ScorePenalties {
  return Object.fromEntries(
    Object.entries(PENALTY_CAPS).map(([key, cap]) => [
      key,
      Math.min(cap, Math.max(0, input[key as keyof ScorePenalties] ?? 0)),
    ]),
  ) as ScorePenalties;
}

export function calculateVibeScore(input: VibeScoreInput): VibeScore {
  const components = Object.fromEntries(
    Object.keys(WEIGHTS).map((key) => [
      key,
      bounded(input.components[key as keyof ScoreComponents]),
    ]),
  ) as ScoreComponents;
  const beforePenalties = Object.entries(WEIGHTS).reduce(
    (total, [key, weight]) => total + (components[key as keyof ScoreComponents] * weight) / 100,
    0,
  );
  const penalties = boundedPenalties(input.penalties);
  const finalScore = Math.min(
    100,
    Math.max(
      0,
      beforePenalties - Object.values(penalties).reduce((total, penalty) => total + penalty, 0),
    ),
  );
  return { scoreVersion: SCORE_VERSION, components, penalties, beforePenalties, finalScore };
}

export function growthComponent(growth: GrowthResult): number {
  const available = [
    growth.twoHours.percent,
    growth.oneDay.percent,
    growth.sevenDays.percent,
  ].filter((value): value is number => value !== null && Number.isFinite(value));
  if (!available.length) return 0;
  return bounded(Math.max(...available) / 10);
}
