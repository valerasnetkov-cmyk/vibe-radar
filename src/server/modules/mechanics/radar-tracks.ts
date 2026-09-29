import { z } from "zod";

export const RADAR_TRACK_VERSION = 1;

export const radarTrackSchema = z.enum([
  "AGENT_INTERFACE",
  "AGENT_RUNTIME",
  "AGENT_SECURITY",
  "AGENT_TESTING",
  "AGENT_ECONOMY",
  "AGENT_TRUTH",
  "AGENT_EXPERIENCE",
  "GENERATIVE_UI",
  "SMALL_SOFTWARE",
  "CRYPTO_PQ",
  "WEB_PLATFORM",
]);

export type RadarTrack = z.infer<typeof radarTrackSchema>;

const aliasMap: Record<string, RadarTrack> = {
  ax: "AGENT_EXPERIENCE",
  "agent api": "AGENT_INTERFACE",
  "agent apis": "AGENT_INTERFACE",
  "agent choice": "AGENT_EXPERIENCE",
  "agent commerce": "AGENT_ECONOMY",
  "agent economy": "AGENT_ECONOMY",
  "agent interface": "AGENT_INTERFACE",
  "agent plugins": "AGENT_INTERFACE",
  "agent runtime": "AGENT_RUNTIME",
  "agent security": "AGENT_SECURITY",
  "agent testing": "AGENT_TESTING",
  "agent replay": "AGENT_TESTING",
  "agent truth": "AGENT_TRUTH",
  "fact layer": "AGENT_TRUTH",
  mcp: "AGENT_INTERFACE",
  utcp: "AGENT_INTERFACE",
  "generative ui": "GENERATIVE_UI",
  "small software": "SMALL_SOFTWARE",
  "post quantum": "CRYPTO_PQ",
  "post-quantum": "CRYPTO_PQ",
  pqc: "CRYPTO_PQ",
  "web platform": "WEB_PLATFORM",
};

function canonicalKey(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

export function normalizeRadarTrack(value: string): RadarTrack | null {
  const enumCandidate = value.trim().toUpperCase().replace(/[ -]+/g, "_");
  const parsed = radarTrackSchema.safeParse(enumCandidate);
  if (parsed.success) return parsed.data;

  return aliasMap[canonicalKey(value)] ?? null;
}

export function normalizeRadarTracks(values: string[]): RadarTrack[] {
  return [
    ...new Set(
      values
        .map(normalizeRadarTrack)
        .filter((value): value is RadarTrack => value !== null),
    ),
  ];
}
