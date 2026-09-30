import { checkDatabaseReadiness } from "@/server/db/client";
import { checkMigrationLevel } from "@/server/db/migrations";

export async function GET() {
  const database = await checkDatabaseReadiness();
  const migrations = database
    ? await checkMigrationLevel()
    : { ok: false, missing: [] as string[] };
  const ready = database && migrations.ok;
  return Response.json(
    { status: ready ? "ok" : "unavailable", checks: { database, migrations: migrations.ok } },
    { status: ready ? 200 : 503 },
  );
}
