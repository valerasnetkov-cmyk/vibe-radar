import { createHash } from "node:crypto";
import { z } from "zod";

export const CONTENT_SCHEMA_VERSION = 1;

const httpUrl = z
  .string()
  .url()
  .refine(
    (value) => {
      try {
        const protocol = new URL(value).protocol;
        return protocol === "http:" || protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Only HTTP(S) URLs are allowed" },
  );

export const contentSourceSchema = z.object({
  label: z.string().trim().min(1).max(200),
  url: httpUrl,
});

export const contentModelSchema = z.object({
  candidateId: z.string().uuid(),
  contentVersion: z.string().min(1).max(128),
  title: z.string().trim().min(1).max(200),
  format: z.enum(["TRENDING", "FRESH", "RELEASE", "HIDDEN_GEM", "WATCH"]),
  shortSummary: z.string().trim().min(1).max(500),
  whyNow: z.string().trim().min(1).max(800),
  keyPoints: z.array(z.string().trim().min(1).max(240)).max(5),
  audience: z.array(z.string().trim().min(1).max(160)).max(5),
  limitations: z.array(z.string().trim().min(1).max(240)).max(5),
  projectSlug: z.string().trim().min(1).max(200),
  projectUrl: httpUrl,
  score: z.number().finite().min(0).max(100),
  scoreVersion: z.number().int().positive(),
  confidence: z.number().finite().min(0).max(100),
  confidenceLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
  sources: z.array(contentSourceSchema).max(8),
  buildability: z
    .object({
      label: z.enum(["SOLO_MVP", "SMALL_TEAM", "TEAM_REQUIRED"]),
      explanation: z.string().trim().min(1).max(500),
    })
    .optional(),
  outscanRelevance: z.enum(["NONE", "SOFT_CTA", "DEPLOY_CTA", "OUTSCAN_CHECK"]),
});

export type ContentModel = z.infer<typeof contentModelSchema>;
export type ContentSource = z.infer<typeof contentSourceSchema>;

/**
 * Deterministic contentVersion rule: sha256 over the canonical JSON of the
 * immutable publication inputs (schema version, candidate, analysis, score,
 * confidence). Stable across retries of identical content; changes whenever
 * any canonical input changes. No time or randomness is involved.
 */
export function computeContentVersion(input: {
  candidateId: string;
  analysisId: string;
  scoreId: string;
  scoreVersion: number;
  confidenceVersion: number;
}): string {
  return createHash("sha256")
    .update(
      [
        `content-schema:${CONTENT_SCHEMA_VERSION}`,
        `candidate:${input.candidateId}`,
        `analysis:${input.analysisId}`,
        `score:${input.scoreId}`,
        `score-version:${input.scoreVersion}`,
        `confidence-version:${input.confidenceVersion}`,
      ].join("|"),
    )
    .digest("hex");
}

export function parseContentModel(value: unknown): ContentModel {
  return contentModelSchema.parse(value);
}
