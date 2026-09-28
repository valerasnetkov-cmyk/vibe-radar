import { createHash } from "node:crypto";

/** NFKC/trim/collapse/lowercase normalization for identity text. Display text keeps casing. */
export function normalizeOpportunityText(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Deterministic canonical key over hypothesis text plus sorted resolved
 * subject keys. Stable across retries; distinct for genuinely different
 * trusted evidence. No time or randomness.
 */
export function canonicalOpportunityKey(input: {
  title: string;
  proposedProduct: string;
  targetUser: string;
  marketScope: string;
  subjectKeys: readonly string[];
}): string {
  return createHash("sha256")
    .update(
      [
        "opportunity-v1",
        normalizeOpportunityText(input.title),
        normalizeOpportunityText(input.proposedProduct),
        normalizeOpportunityText(input.targetUser),
        input.marketScope,
        [...input.subjectKeys].sort().join(","),
      ].join("|"),
    )
    .digest("hex");
}

/**
 * Deterministic evidence key over trusted subject identity only.
 * Rationale prose is excluded so edited prose never duplicates a source.
 */
export function opportunityEvidenceKey(input: {
  opportunityId: string;
  subjectType: string;
  subjectId: string;
}): string {
  return createHash("sha256")
    .update(`opportunity:${input.opportunityId}|${input.subjectType}:${input.subjectId}`)
    .digest("hex");
}
