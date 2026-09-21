import { z } from "zod";

export const analysisOutputSchema = z
  .object({
    summary: z.string().trim().min(1).max(500),
    why_interesting: z.string().trim().min(1).max(800),
    use_cases: z.array(z.string().trim().min(1).max(240)).max(5),
    audience: z.array(z.string().trim().min(1).max(160)).max(5),
    limitations: z.array(z.string().trim().min(1).max(240)).max(5),
    categories: z.array(z.string().trim().min(1).max(80)).max(8),
    content_angles: z.array(z.string().trim().min(1).max(240)).max(5),
    outscan_relevance: z.enum(["NONE", "SOFT_CTA", "DEPLOY_CTA", "OUTSCAN_CHECK"]),
  })
  .strict();

export type AnalysisOutput = z.infer<typeof analysisOutputSchema>;

export function validateAnalysisOutput(value: unknown): AnalysisOutput {
  return analysisOutputSchema.parse(value);
}
