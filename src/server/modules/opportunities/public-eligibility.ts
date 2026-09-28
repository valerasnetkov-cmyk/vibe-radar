import { OPPORTUNITY_PUBLIC_MIN_CONFIDENCE } from "@/server/modules/opportunities/assessment";

export type OpportunityEligibilityInput = {
  status: string;
  latestReview: "APPROVE" | "REJECT" | null;
  confidence: number;
  resolvedSources: number;
  buildabilityPresent: boolean;
  titleValid: boolean;
  problemValid: boolean;
  proposedValid: boolean;
  differentiationValid: boolean;
  traceableProjects: number;
};

/**
 * Deterministic public eligibility gate. A PUBLISHED flag alone is never
 * sufficient: the latest review must be APPROVE on top of evidence,
 * buildability, confidence, and content validity. A later REJECT hides the
 * opportunity even when the row still reads PUBLISHED.
 */
export function isOpportunityPubliclyEligible(input: OpportunityEligibilityInput): boolean {
  return (
    input.status !== "REJECTED" &&
    input.latestReview === "APPROVE" &&
    input.confidence >= OPPORTUNITY_PUBLIC_MIN_CONFIDENCE &&
    input.resolvedSources >= 1 &&
    input.buildabilityPresent &&
    input.titleValid &&
    input.problemValid &&
    input.proposedValid &&
    input.differentiationValid &&
    input.traceableProjects >= 1
  );
}
