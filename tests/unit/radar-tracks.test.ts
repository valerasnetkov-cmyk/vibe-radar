import { describe, expect, it } from "vitest";

import {
  normalizeRadarTrack,
  normalizeRadarTracks,
  RADAR_TRACK_VERSION,
} from "../../src/server/modules/mechanics/radar-tracks";

describe("radar track taxonomy", () => {
  it("keeps canonical values stable", () => {
    expect(normalizeRadarTrack("AGENT_RUNTIME")).toBe("AGENT_RUNTIME");
    expect(normalizeRadarTrack("CRYPTO_PQ")).toBe("CRYPTO_PQ");
    expect(RADAR_TRACK_VERSION).toBe(1);
  });

  it("normalizes known aliases", () => {
    expect(normalizeRadarTrack("MCP")).toBe("AGENT_INTERFACE");
    expect(normalizeRadarTrack("agent choice")).toBe("AGENT_EXPERIENCE");
    expect(normalizeRadarTrack("fact layer")).toBe("AGENT_TRUTH");
    expect(normalizeRadarTrack("post-quantum")).toBe("CRYPTO_PQ");
  });

  it("does not invent a category for unknown input", () => {
    expect(normalizeRadarTrack("random marketing phrase")).toBeNull();
  });

  it("deduplicates normalized tracks", () => {
    expect(normalizeRadarTracks(["MCP", "agent api", "AGENT_INTERFACE", "PQC"])).toEqual([
      "AGENT_INTERFACE",
      "CRYPTO_PQ",
    ]);
  });
});
