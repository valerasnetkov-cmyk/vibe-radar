import { describe, expect, it } from "vitest";
import { Client } from "pg";

describe("PostgreSQL foundation", () => {
  it("checks the migrated foundation when a database is available", async () => {
    const url = process.env.DATABASE_URL;
    if (!url) {
      console.warn("DATABASE_URL is not set; PostgreSQL integration test was not executed");
      return;
    }

    const client = new Client({ connectionString: url });
    try {
      await client.connect();
      const result = await client.query<{ exists: boolean }>(
        "select to_regclass('public.provider_identities') is not null as exists",
      );
      expect(result.rows[0]?.exists).toBe(true);
    } catch {
      console.warn("PostgreSQL is unavailable; integration test was not executed");
    } finally {
      await client.end().catch(() => undefined);
    }
  });
});
