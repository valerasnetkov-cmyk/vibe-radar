import { z } from "zod";
import { CONFIDENCE_VERSION, type ConfidenceAssessment } from "@/server/modules/confidence/assess";

const explanationSchema = z.object({
  evidence: z.number().finite().optional(),
  sources: z.number().finite().optional(),
  history: z.number().finite().optional(),
  contradictions: z.number().finite().optional(),
  sourceCount: z.number().finite().optional(),
  snapshotCount: z.number().finite().optional(),
});

export type StoredConfidenceRow = {
  value: number;
  level: ConfidenceAssessment["level"];
  confidenceVersion: number;
  explanation: unknown;
  evidenceCount: number;
  contradictionCount: number;
};

/**
 * Reconstruct a ConfidenceAssessment from persisted columns without `any`.
 * Uses stored confidenceVersion/value/level and the stored explanation and
 * evidence/contradiction counts; never manufactures zeros when the DB
 * already stores them.
 */
export function parseStoredConfidenceAssessment(row: StoredConfidenceRow): ConfidenceAssessment {
  const parsed = explanationSchema.safeParse(row.explanation);
  const stored = parsed.success ? parsed.data : {};
  const evidenceCount = Number.isFinite(row.evidenceCount) ? row.evidenceCount : 0;
  const contradictionCount = Number.isFinite(row.contradictionCount) ? row.contradictionCount : 0;
  const sourceCount =
    typeof stored.sourceCount === "number" ? stored.sourceCount : evidenceCount > 0 ? 1 : 0;
  const snapshotCount =
    typeof stored.snapshotCount === "number" ? stored.snapshotCount : evidenceCount > 0 ? 1 : 0;
  return {
    confidenceVersion:
      Number.isInteger(row.confidenceVersion) && row.confidenceVersion > 0
        ? (row.confidenceVersion as typeof CONFIDENCE_VERSION)
        : CONFIDENCE_VERSION,
    value: row.value,
    level: row.level,
    explanation: {
      evidence: stored.evidence ?? 0,
      sources: stored.sources ?? 0,
      history: stored.history ?? 0,
      contradictions: stored.contradictions ?? 0,
    },
    inputs: {
      evidenceCount,
      sourceCount,
      snapshotCount,
      hasCurrentSnapshot: snapshotCount > 0,
      hasRequiredHistory: row.value >= 75,
      contradictionCount,
    },
  };
}
