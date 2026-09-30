/**
 * Integration database safety guard. Destructive fixture cleanup in
 * integration tests must never run against production infrastructure.
 * Returns the URL when the target is identifiably local/test, null when no
 * database is configured (callers skip explicitly), and throws otherwise.
 * The URL itself is never logged.
 */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "postgres"]);

export function getSafeIntegrationDatabaseUrl(): string | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing integration run under NODE_ENV=production");
  }
  let hostname = "";
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    throw new Error("Refusing integration run: DATABASE_URL is not a valid URL");
  }
  if (!LOCAL_HOSTS.has(hostname)) {
    throw new Error(`Refusing integration run against non-local database host: ${hostname}`);
  }
  return url;
}
