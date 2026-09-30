import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { getDatabase } from "@/server/db/client";
import { checkMigrationLevel, findMissingMigrations } from "@/server/db/migrations";

type FakeDatabase = ReturnType<typeof getDatabase>;

function fakeDatabase(rows: Array<{ name: string }> | Error): FakeDatabase {
  return {
    execute: async () => {
      if (rows instanceof Error) throw rows;
      return { rows };
    },
  } as unknown as FakeDatabase;
}

function migrationDir(names: string[]): URL {
  const directory = mkdtempSync(join(tmpdir(), "migrations-"));
  for (const name of names) writeFileSync(join(directory, name), "-- fixture");
  return new URL(`file://${directory}/`);
}

describe("release migration level", () => {
  it("diffs on-disk migrations against applied rows", () => {
    expect(findMissingMigrations(["a.sql", "b.sql"], ["a.sql"])).toEqual(["b.sql"]);
    expect(findMissingMigrations(["a.sql"], ["a.sql", "b.sql"])).toEqual([]);
    expect(findMissingMigrations([], [])).toEqual([]);
  });

  it("reports ready only when the full chain is applied", async () => {
    const directory = migrationDir(["0000_a.sql", "0001_b.sql"]);
    const ready = await checkMigrationLevel(
      fakeDatabase([{ name: "0000_a.sql" }, { name: "0001_b.sql" }]),
      directory,
    );
    expect(ready).toEqual({ ok: true, missing: [] });
    const gap = await checkMigrationLevel(fakeDatabase([{ name: "0000_a.sql" }]), directory);
    expect(gap.ok).toBe(false);
    expect(gap.missing).toEqual(["0001_b.sql"]);
  });

  it("fails closed on unreadable state without leaking details", async () => {
    const directory = migrationDir(["0000_a.sql"]);
    const failed = await checkMigrationLevel(fakeDatabase(new Error("connect")), directory);
    expect(failed).toEqual({ ok: false, missing: [] });
    expect(JSON.stringify(failed)).not.toContain("connect");
  });
});
