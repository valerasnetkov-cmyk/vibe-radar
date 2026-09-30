import { closeDatabase, getDatabase } from "../src/server/db/client";
import { loadEnvironment } from "../src/server/config/env";
import { publishOpportunity } from "../src/server/modules/opportunities/repository";

/**
 * CLI-only explicit publish transition. Re-checks eligibility from
 * PostgreSQL (approval, evidence, buildability, confidence) and flips
 * eligible reviewed rows to PUBLISHED. No Telegram side effect.
 *
 * Usage: pnpm opportunities:publish -- <opportunity-id>
 */
async function main(): Promise<void> {
  const [opportunityId] = process.argv.slice(2);
  if (!opportunityId) {
    console.error("Usage: pnpm opportunities:publish -- <opportunity-id>");
    process.exit(1);
  }

  try {
    loadEnvironment();
    const database = getDatabase();
    const result = await publishOpportunity(database, opportunityId);
    console.log(JSON.stringify(result));
    await closeDatabase();
    if (!result.ok) process.exitCode = 1;
  } catch (error) {
    console.error(`Publish rejected: ${error instanceof Error ? error.name : "INVALID_PUBLISH"}`);
    process.exit(1);
  }
}

void main();
