import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { loadEnvironment } from "@/server/config/env";
import * as schema from "@/server/db/schema";

let pool: Pool | undefined;

export function getDatabase() {
  if (!pool) {
    const config = loadEnvironment();
    pool = new Pool({
      connectionString: config.DATABASE_URL,
      ssl: config.DATABASE_SSL === "require" ? { rejectUnauthorized: true } : false,
      max: 5,
    });
  }
  return drizzle(pool, { schema });
}

export async function checkDatabaseReadiness(): Promise<boolean> {
  try {
    const database = getDatabase();
    await database.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

export async function closeDatabase(): Promise<void> {
  await pool?.end();
  pool = undefined;
}
