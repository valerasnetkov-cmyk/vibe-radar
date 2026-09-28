import { readFile } from "node:fs/promises";
import { closeDatabase, getDatabase } from "../src/server/db/client";
import { loadEnvironment } from "../src/server/config/env";
import { submitOpportunityBatch } from "../src/server/modules/opportunities/repository";

/**
 * CLI-only opportunity intake. The file must contain a batch of 1-3
 * proposals; anything else rejects. Nothing is executed, fetched, or
 * imported from proposal content. Accepted rows stay PROPOSED until review
 * and explicit publication.
 *
 * Usage: pnpm opportunities:propose -- <batch-json-file>
 */
const file = process.argv[2];
if (!file) {
  console.error("Usage: pnpm opportunities:propose -- <batch-json-file>");
  process.exit(1);
}

try {
  loadEnvironment();
  const raw = await readFile(file, "utf8");
  const database = getDatabase();
  const results = await submitOpportunityBatch(database, JSON.parse(raw) as unknown);
  console.log(JSON.stringify(results));
  await closeDatabase();
} catch (error) {
  console.error(`Batch rejected: ${error instanceof Error ? error.name : "INVALID_BATCH"}`);
  process.exit(1);
}
