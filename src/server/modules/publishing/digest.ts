export type DigestItem = {
  candidateId: string;
  title: string;
  score: number;
  confidence: number;
  publishedAt: Date;
};

export type RadarDigest = {
  window: "DAILY" | "WEEKLY";
  generatedAt: Date;
  items: DigestItem[];
};

const WINDOWS = { DAILY: 24 * 60 * 60 * 1000, WEEKLY: 7 * 24 * 60 * 60 * 1000 } as const;
const LIMITS = { DAILY: 20, WEEKLY: 50 } as const;

export function generateRadarDigest(
  items: readonly DigestItem[],
  window: RadarDigest["window"],
  generatedAt: Date,
): RadarDigest {
  const since = generatedAt.getTime() - WINDOWS[window];
  const selected = items
    .filter(
      (item) =>
        item.publishedAt.getTime() >= since && item.publishedAt.getTime() <= generatedAt.getTime(),
    )
    .sort(
      (left, right) =>
        right.score - left.score || right.publishedAt.getTime() - left.publishedAt.getTime(),
    )
    .slice(0, LIMITS[window]);
  return { window, generatedAt, items: selected };
}
