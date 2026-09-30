import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/server/db/client";

export function findMissingMigrations(
  onDisk: readonly string[],
  applied: readonly string[],
): string[] {
  const have = new Set(applied);
  return onDisk.filter((name) => !have.has(name));
}

/**
 * Release migration level: every migration file shipped with this build
 * must be recorded in schema_migrations. Any read failure or gap reports
 * not-ready without leaking SQL, host, or path details (callers only see
 * the boolean).
 */
export function migrationDirectory(): string {
  return join(process.cwd(), "src", "server", "db", "migrations");
}

export async function checkMigrationLevel(
  database: ReturnType<typeof getDatabase> = getDatabase(),
  directory: string | URL = migrationDirectory(),
): Promise<{ ok: boolean; missing: string[] }> {
  try {
    const onDisk = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();
    if (!onDisk.length) return { ok: false, missing: [] };
    const applied = await database.execute<{ name: string }>(
      sql`select name from schema_migrations`,
    );
    const missing = findMissingMigrations(
      onDisk,
      applied.rows.map((row) => row.name),
    );
    return { ok: missing.length === 0, missing };
  } catch {
    return { ok: false, missing: [] };
  }
}
