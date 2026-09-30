import { describe, expect, it } from "vitest";
import {
  decideWatchAlert,
  mechanicMatchesWatch,
  renderTrackWatchAlert,
} from "../../src/server/modules/mechanics/watch-alerts";
import { parseRadarWatchTracks } from "../../src/server/modules/mechanics/radar-tracks";

describe("track watch alerts", () => {
  it("alerts on first observation", () => {
    expect(decideWatchAlert(null, { stage: "SPARK", velocity: 20, confidence: 60 })).toEqual({
      shouldAlert: true,
      reason: "NEW",
    });
  });

  it("alerts only on material metric changes", () => {
    const previous = { stage: "RISING", velocity: 40, confidence: 60 };
    expect(decideWatchAlert(previous, { stage: "RISING", velocity: 59, confidence: 74 }).shouldAlert).toBe(false);
    expect(decideWatchAlert(previous, { stage: "RISING", velocity: 60, confidence: 60 }).reason).toBe("VELOCITY_CHANGE");
    expect(decideWatchAlert(previous, { stage: "RISING", velocity: 40, confidence: 75 }).reason).toBe("CONFIDENCE_CHANGE");
    expect(decideWatchAlert(previous, { stage: "BREAKOUT", velocity: 40, confidence: 60 }).reason).toBe("STAGE_CHANGE");
  });

  it("normalizes operator watch configuration and rejects unknown tracks", () => {
    expect(parseRadarWatchTracks("MCP, agent runtime, PQC")).toEqual([
      "AGENT_INTERFACE",
      "AGENT_RUNTIME",
      "CRYPTO_PQ",
    ]);
    expect(() => parseRadarWatchTracks("MCP, mystery-track")).toThrow("Unknown radar watch track");
  });

  it("matches only selected canonical tracks", () => {
    expect(mechanicMatchesWatch({ radarTracks: ["AGENT_SECURITY"] }, ["AGENT_SECURITY"])).toBe(true);
    expect(mechanicMatchesWatch({ radarTracks: ["WEB_PLATFORM"] }, ["AGENT_SECURITY"])).toBe(false);
  });

  it("escapes untrusted mechanic text in Telegram output", () => {
    const html = renderTrackWatchAlert(
      {
        id: "1",
        name: "<script>x</script>",
        description: "A & B",
        stage: "SPARK",
        velocity: 30,
        confidence: 70,
        independentSourceCount: 2,
        evidenceCount: 2,
        categories: [],
        radarTracks: ["AGENT_SECURITY"],
        practicalImplications: [],
        risks: [],
        lastObservedAt: new Date().toISOString(),
        sources: [],
      },
      "NEW",
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("A &amp; B");
  });
});
