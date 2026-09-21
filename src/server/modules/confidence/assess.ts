export const CONFIDENCE_VERSION = 1;

export type ConfidenceInput = {
  evidenceCount: number;
  sourceCount: number;
  snapshotCount: number;
  hasCurrentSnapshot: boolean;
  hasRequiredHistory: boolean;
  contradictionCount: number;
};

export type ConfidenceAssessment = {
  confidenceVersion: typeof CONFIDENCE_VERSION;
  value: number;
  level: "LOW" | "MEDIUM" | "HIGH";
  explanation: { evidence: number; sources: number; history: number; contradictions: number };
  inputs: ConfidenceInput;
};

function count(value: number): number {
  return Math.max(0, Number.isFinite(value) ? value : 0);
}

export function assessConfidence(input: ConfidenceInput): ConfidenceAssessment {
  const evidence = Math.min(35, count(input.evidenceCount) * 7);
  const sources = Math.min(25, count(input.sourceCount) * 12.5);
  const history = (input.hasCurrentSnapshot ? 15 : 0) + (input.hasRequiredHistory ? 15 : 0);
  const contradictions = Math.min(30, count(input.contradictionCount) * 15);
  const value = Math.min(100, Math.max(0, evidence + sources + history - contradictions));
  const level = value >= 75 ? "HIGH" : value >= 45 ? "MEDIUM" : "LOW";
  return {
    confidenceVersion: CONFIDENCE_VERSION,
    value,
    level,
    explanation: { evidence, sources, history, contradictions },
    inputs: {
      ...input,
      evidenceCount: count(input.evidenceCount),
      sourceCount: count(input.sourceCount),
      snapshotCount: count(input.snapshotCount),
      contradictionCount: count(input.contradictionCount),
    },
  };
}
