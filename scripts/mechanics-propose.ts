import { readFile } from "node:fs/promises";
import { closeDatabase, getDatabase } from "../src/server/db/client";
import { loadEnvironment } from "../src/server/config/env";
import { validateMechanicProposal } from "../src/server/modules/mechanics/contract";
import { submitMechanicProposal } from "../src/server/modules/mechanics/repository";

/**
 * CLI-only editor-assisted proposal intake. The JSON file is schema-
 * validated; no field is executed, fetched, or imported. New mechanics stay
 * unpublished until an explicit APPROVE review arrives.
 *
 * Usage: pnpm mechanics:propose -- <proposal-json-file>
 */
async function main(): Promise<void> {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: pnpm mechanics:propose -- <proposal-json-file>");
    process.exit(1);
  }

  try {
    loadEnvironment();
    const raw = await readFile(file, "utf8");
    const proposal = validateMechanicProposal(JSON.parse(raw) as unknown);
    const database = getDatabase();
    const result = await submitMechanicProposal(database, proposal);
    console.log(
      JSON.stringify({
        mechanicId: result.mechanicId,
        created: result.created,
        resolvedCount: result.resolvedCount,
        skippedCount: result.skippedCount,
        insertedEvidence: result.insertedEvidence,
        assessment: result.assessment,
      }),
    );
    await closeDatabase();
  } catch (error) {
    console.error(`Proposal rejected: ${error instanceof Error ? error.name : "INVALID_PROPOSAL"}`);
    process.exit(1);
  }
}

void main();
