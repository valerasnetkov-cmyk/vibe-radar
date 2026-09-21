import { describe, expect, it } from "vitest";
import { generateRadarDigest } from "@/server/modules/publishing/digest";

const generatedAt = new Date("2026-09-18T12:00:00Z");
const item = (candidateId: string, score: number, hoursAgo: number) => ({
  candidateId,
  title: candidateId,
  score,
  confidence: 80,
  publishedAt: new Date(generatedAt.getTime() - hoursAgo * 60 * 60 * 1000),
});

describe("radar digest", () => {
  it("builds a daily digest from actual published items only", () => {
    const digest = generateRadarDigest(
      [item("old", 99, 25), item("high", 70, 2), item("low", 50, 3)],
      "DAILY",
      generatedAt,
    );
    expect(digest.items.map((entry) => entry.candidateId)).toEqual(["high", "low"]);
  });

  it("sorts by score and keeps weekly window bounded", () => {
    const digest = generateRadarDigest(
      [item("medium", 60, 200), item("top", 90, 1), item("second", 80, 2)],
      "WEEKLY",
      generatedAt,
    );
    expect(digest.items.map((entry) => entry.candidateId)).toEqual(["top", "second"]);
  });
});
