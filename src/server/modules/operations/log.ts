export type OperationalLogFields = {
  level: "info" | "warn" | "error";
  service: string;
  jobName?: string;
  jobRunId?: string;
  status?: string;
  attempt?: number;
  durationMs?: number;
  errorCode?: string;
  detail?: string;
};

/**
 * Minimal structured operational logger: single JSON line to stdout with
 * an allow-listed field shape. Raw exceptions, payloads, URLs, and secrets
 * cannot be represented, so they can never be logged through this path.
 */
export function logOperationalEvent(fields: OperationalLogFields): void {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), ...fields }));
}
