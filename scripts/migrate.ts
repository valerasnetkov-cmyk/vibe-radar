import { readdir, readFile } from "node:fs/promises";
import { Client } from "pg";
import { loadEnvironment } from "../src/server/config/env";

const config = loadEnvironment();
const client = new Client({ connectionString: config.DATABASE_URL });
await client.connect();
try {
  await client.query("BEGIN");
  await client.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  const migrationDirectory = new URL("../src/server/db/migrations/", import.meta.url);
  const migrationFiles = (await readdir(migrationDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of migrationFiles) {
    const applied = await client.query<{ name: string }>(
      "SELECT name FROM schema_migrations WHERE name = $1",
      [file],
    );
    if (applied.rowCount) continue;
    await client.query(await readFile(new URL(file, migrationDirectory), "utf8"));
    await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
  }
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
