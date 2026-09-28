/**
 * Single source of truth for runnable job names, shared by worker
 * scheduling, job-run persistence, and manual replay.
 *
 * Database rows may only ever resolve through this allow-list: unknown
 * job names can never execute a handler, import a module, or run a command.
 */
export const KNOWN_JOB_NAMES = [
  "github-discovery",
  "score-calculation",
  "candidate-selection",
  "publication",
  "daily-radar",
  "weekly-radar",
] as const;

export type KnownJobName = (typeof KNOWN_JOB_NAMES)[number];

export function isKnownJobName(value: string): value is KnownJobName {
  return (KNOWN_JOB_NAMES as readonly string[]).includes(value);
}

export function assertKnownJobName(value: string): KnownJobName {
  if (!isKnownJobName(value)) throw new Error(`Unknown job: ${value}`);
  return value;
}
