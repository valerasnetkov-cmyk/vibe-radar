export type ContentModel = {
  candidateId: string;
  contentVersion: string;
  title: string;
  format: "TRENDING" | "FRESH" | "RELEASE" | "HIDDEN_GEM" | "WATCH";
  shortSummary: string;
  whyNow: string;
  keyPoints: string[];
  audience: string[];
  limitations: string[];
  projectUrl: string;
  score: number;
  confidence: number;
  outscanRelevance: "NONE" | "SOFT_CTA" | "DEPLOY_CTA" | "OUTSCAN_CHECK";
};
