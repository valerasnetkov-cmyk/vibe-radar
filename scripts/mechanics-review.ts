import { closeDatabase, getDatabase } from "../src/server/db/client";
import { loadEnvironment } from "../src/server/config/env";
import {
  parseMechanicReviewDecision,
  reviewMechanic,
} from "../src/server/modules/mechanics/review";

/**
 * CLI-only mechanic review. Appends an APPROVE/REJECT record; it never
 * mutates stage, velocity, confidence, or independence groups. The actor id
 * is accepted from the shell because shell access is already a privileged
 * operator boundary.
 *
 * Usage: pnpm mechanics:review -- <mechanic-id> APPROVE --actor <actor-id>
 */
const [mechanicId, decisionArg, actorFlag, actorId] = process.argv.slice(2);
if (!mechanicId || !decisionArg || actorFlag !== "--actor" || !actorId) {
  console.error("Usage: pnpm mechanics:review -- <mechanic-id> APPROVE --actor <actor-id>");
  process.exit(1);
}

try {
  loadEnvironment();
  const decision = parseMechanicReviewDecision(decisionArg);
  const database = getDatabase();
  const result = await reviewMechanic(database, mechanicId, decision, actorId);
  console.log(JSON.stringify(result));
  await closeDatabase();
} catch (error) {
  console.error(`Review rejected: ${error instanceof Error ? error.name : "INVALID_REVIEW"}`);
  process.exit(1);
}
