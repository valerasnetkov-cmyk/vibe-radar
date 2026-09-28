import { createHash } from "node:crypto";

/**
 * Deterministic canonical key for mechanic identity and dedupe.
 * Unicode-normalized, trimmed, whitespace-collapsed, lowercased.
 * The display canonicalName keeps human-readable casing; this key is
 * identity only. No time or randomness is involved.
 */
export function normalizeMechanicKey(canonicalName: string): string {
  return canonicalName.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Deterministic evidence key from trusted resolved identity: stable across
 * retries, distinct for genuinely different evidence. Never time-based.
 */
export function evidenceKeyFor(input: {
  mechanicId: string;
  projectId?: string | null;
  sourceEventId?: string | null;
  signalId?: string | null;
  group: string;
}): string {
  return createHash("sha256")
    .update(
      [
        `mechanic:${input.mechanicId}`,
        `project:${input.projectId ?? "-"}`,
        `event:${input.sourceEventId ?? "-"}`,
        `signal:${input.signalId ?? "-"}`,
        `group:${input.group}`,
      ].join("|"),
    )
    .digest("hex");
}
