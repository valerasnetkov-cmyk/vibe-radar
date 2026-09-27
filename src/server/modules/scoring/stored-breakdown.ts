import { z } from "zod";
import {
  SCORE_VERSION,
  type ScoreComponents,
  type ScorePenalties,
  type VibeScore,
} from "@/server/modules/scoring/vibe-score";

export const DEFAULT_SCORE_COMPONENTS: ScoreComponents = {
  growth: 0,
  vibeRelevance: 0,
  freshness: 0,
  developmentActivity: 0,
  community: 0,
  documentation: 0,
  originality: 0,
};

export const DEFAULT_SCORE_PENALTIES: ScorePenalties = {
  forkOrMirror: 0,
  prolongedInactivity: 0,
  unclearLicense: 0,
  suspiciousGrowth: 0,
  weakDocumentation: 0,
  duplicateCandidate: 0,
};

const componentSchema = z.object({
  growth: z.number().finite().optional(),
  vibeRelevance: z.number().finite().optional(),
  freshness: z.number().finite().optional(),
  developmentActivity: z.number().finite().optional(),
  community: z.number().finite().optional(),
  documentation: z.number().finite().optional(),
  originality: z.number().finite().optional(),
});

const penaltySchema = z.object({
  forkOrMirror: z.number().finite().optional(),
  prolongedInactivity: z.number().finite().optional(),
  unclearLicense: z.number().finite().optional(),
  suspiciousGrowth: z.number().finite().optional(),
  weakDocumentation: z.number().finite().optional(),
  duplicateCandidate: z.number().finite().optional(),
});

/**
 * Canonical persisted shape written by persistScore():
 * { components, penalties, beforePenalties }.
 */
const nestedBreakdownSchema = z.object({
  components: componentSchema.optional(),
  penalties: penaltySchema.optional(),
  beforePenalties: z.number().finite().optional(),
});

/**
 * Reconstruct a VibeScore from the persisted breakdown JSON without `any`.
 * Supports the canonical nested shape; tolerates a legacy flat shape where
 * component keys sit at the top level. Falls back to defaults field-wise so
 * persisted finalScore/scoreVersion are always preserved.
 */
export function parseStoredScoreBreakdown(
  breakdown: unknown,
  storedScoreVersion: number,
  finalScore: number,
): VibeScore {
  const nested = nestedBreakdownSchema.safeParse(breakdown);
  const flat = componentSchema.safeParse(breakdown);

  const componentsSource =
    nested.success && nested.data.components ? nested.data.components : undefined;
  // Legacy rows may store component keys at the top level instead of nested.
  const legacySource =
    !componentsSource && flat.success && breakdown !== null && typeof breakdown === "object"
      ? flat.data
      : undefined;
  const source = componentsSource ?? legacySource;

  const penaltiesSource =
    nested.success && nested.data.penalties ? nested.data.penalties : undefined;

  const components: ScoreComponents = {
    growth: source?.growth ?? DEFAULT_SCORE_COMPONENTS.growth,
    vibeRelevance: source?.vibeRelevance ?? DEFAULT_SCORE_COMPONENTS.vibeRelevance,
    freshness: source?.freshness ?? DEFAULT_SCORE_COMPONENTS.freshness,
    developmentActivity:
      source?.developmentActivity ?? DEFAULT_SCORE_COMPONENTS.developmentActivity,
    community: source?.community ?? DEFAULT_SCORE_COMPONENTS.community,
    documentation: source?.documentation ?? DEFAULT_SCORE_COMPONENTS.documentation,
    originality: source?.originality ?? DEFAULT_SCORE_COMPONENTS.originality,
  };

  const penalties: ScorePenalties = {
    forkOrMirror: penaltiesSource?.forkOrMirror ?? DEFAULT_SCORE_PENALTIES.forkOrMirror,
    prolongedInactivity:
      penaltiesSource?.prolongedInactivity ?? DEFAULT_SCORE_PENALTIES.prolongedInactivity,
    unclearLicense: penaltiesSource?.unclearLicense ?? DEFAULT_SCORE_PENALTIES.unclearLicense,
    suspiciousGrowth: penaltiesSource?.suspiciousGrowth ?? DEFAULT_SCORE_PENALTIES.suspiciousGrowth,
    weakDocumentation:
      penaltiesSource?.weakDocumentation ?? DEFAULT_SCORE_PENALTIES.weakDocumentation,
    duplicateCandidate:
      penaltiesSource?.duplicateCandidate ?? DEFAULT_SCORE_PENALTIES.duplicateCandidate,
  };

  const beforePenalties =
    nested.success && typeof nested.data.beforePenalties === "number"
      ? nested.data.beforePenalties
      : 0;

  return {
    scoreVersion:
      Number.isInteger(storedScoreVersion) && storedScoreVersion > 0
        ? (storedScoreVersion as typeof SCORE_VERSION)
        : SCORE_VERSION,
    components,
    penalties,
    beforePenalties,
    finalScore,
  };
}
