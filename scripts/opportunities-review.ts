import { closeDatabase, getDatabase } from "../src/server/db/client";
import { loadEnvironment } from "../src/server/config/env";
import {
  parseOpportunityReviewDecision,
  reviewOpportunity,
} from "../src/server/modules/opportunities/review";

/**
 * CLI-only opportunity review. Appends APPROVE/REJECT without touching
 * confidence, buildability, evidence, or prose.
 *
 * Usage: pnpm opportunities:review -- <opportunity-id> APPROVE --actor <actor-id>
 */
async function main(): Promise<void> {
  const [opportunityId, decisionArg, actorFlag, actorId] = process.argv.slice(2);
  if (!opportunityId || !decisionArg || actorFlag !== "--actor" || !actorId) {
    console.error(
      "Usage: pnpm opportunities:review -- <opportunity-id> APPROVE --actor <actor-id>",
    );
    process.exit(1);
  }

  try {
    loadEnvironment();
    const decision = parseOpportunityReviewDecision(decisionArg);
    const database = getDatabase();
    const result = await reviewOpportunity(database, opportunityId, decision, actorId);
    console.log(JSON.stringify(result));
    await closeDatabase();
  } catch (error) {
    console.error(`Review rejected: ${error instanceof Error ? error.name : "INVALID_REVIEW"}`);
    process.exit(1);
  }
}

void main();
