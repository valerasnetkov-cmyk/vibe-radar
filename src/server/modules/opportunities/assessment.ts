export const OPPORTUNITY_CONFIDENCE_VERSION = 1;
export const OPPORTUNITY_CONFIDENCE_MAX = 90;
export const OPPORTUNITY_PUBLIC_MIN_CONFIDENCE = 55;

export type OpportunityConfidenceInput = {
  /** Unique resolved subject keys (type:id). */
  subjects: readonly string[];
  /** Unique traceable supporting project ids. */
  projectIds: readonly string[];
  /** Eligible mechanic sources backing the opportunity. */
  mechanicCount: number;
  /** Average trusted source confidence, 0..1. */
  sourceConfidenceRatio: number;
  /** Share of represented projects with a trusted buildability assessment, 0..1. */
  buildabilityCoverage: number;
  /** Unresolved/unsupported references encountered. */
  unresolvedCount: number;
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

/**
 * Deterministic opportunity confidence policy v1 over trusted inputs only.
 * Capped at 90 by design: an opportunity is a product hypothesis, never an
 * observed fact. Differentiation length, market scope, editor approval,
 * VIBE SCORE, and OUTSCAN carry zero weight. Duplicate evidence cannot
 * boost the score because subjects and projects are unique sets.
 */
export function assessOpportunityConfidence(input: OpportunityConfidenceInput): {
  confidence: number;
  policyVersion: typeof OPPORTUNITY_CONFIDENCE_VERSION;
} {
  const S = new Set(input.subjects).size;
  const P = new Set(input.projectIds).size;
  const Q = clamp01(input.sourceConfidenceRatio);
  const B = clamp01(input.buildabilityCoverage);
  const confidence = Math.round(
    Math.min(
      OPPORTUNITY_CONFIDENCE_MAX,
      Math.max(
        0,
        35 * Q +
          25 * Math.min(1, S / 3) +
          20 * Math.min(1, P / 3) +
          10 * B +
          10 * Math.min(1, input.mechanicCount) -
          Math.min(20, input.unresolvedCount * 10),
      ),
    ),
  );
  return { confidence, policyVersion: OPPORTUNITY_CONFIDENCE_VERSION };
}
