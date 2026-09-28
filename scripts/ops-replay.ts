import { closeDatabase, getDatabase } from "../src/server/db/client";
import { loadEnvironment } from "../src/server/config/env";
import { normalizeOperationalError } from "../src/server/modules/operations/errors";
import { logOperationalEvent } from "../src/server/modules/operations/log";
import { assertKnownJobName, type KnownJobName } from "../src/server/modules/operations/registry";
import {
  createJobRun,
  finishJobRun,
  loadJobRun,
} from "../src/server/modules/operations/repository";
import { runBoundedJob } from "../src/server/modules/operations/job-runner";
import { runConfiguredGitHubDiscovery } from "../src/worker/jobs/github-discovery";
import { runConfiguredScoreCalculation } from "../src/server/modules/scoring/job";
import { runConfiguredCandidateSelection } from "../src/server/modules/editorial/candidate-job";
import { runConfiguredPublication } from "../src/server/modules/publishing/job";
import {
  runConfiguredDailyRadar,
  runConfiguredWeeklyRadar,
} from "../src/server/modules/publishing/digest-job";

/**
 * CLI-only safe manual replay. No HTTP endpoint exists for replay.
 * Resolves the old run's job name through the allow-list registry (never
 * dynamic imports or commands) and executes the canonical handler, so all
 * domain idempotency and approval gates stay enforced. A NEW job run linked
 * to the old one is created; history is never overwritten.
 */
const HANDLERS: Record<KnownJobName, () => Promise<void>> = {
  "github-discovery": runConfiguredGitHubDiscovery,
  "score-calculation": runConfiguredScoreCalculation,
  "candidate-selection": runConfiguredCandidateSelection,
  publication: runConfiguredPublication,
  "daily-radar": () => runConfiguredDailyRadar(),
  "weekly-radar": () => runConfiguredWeeklyRadar(),
};

const jobRunId = process.argv[2];
if (!jobRunId) {
  console.error("Usage: pnpm ops:replay -- <job-run-id>");
  process.exit(1);
}

try {
  loadEnvironment();
  const database = getDatabase();
  const old = await loadJobRun(jobRunId, database);
  if (!old) {
    console.error("Job run not found");
    process.exit(1);
  }
  const name = assertKnownJobName(old.jobName);
  const [run] = await createJobRun(name, old.maxAttempts, { replayOfJobRunId: old.id }, database);
  if (!run) throw new Error("Failed to persist replay job run");
  const result = await runBoundedJob(HANDLERS[name], { maxAttempts: old.maxAttempts });
  await finishJobRun(run.id, result, database);
  logOperationalEvent({
    level: result.status === "SUCCEEDED" ? "info" : "error",
    service: "ops-replay",
    jobName: name,
    jobRunId: run.id,
    status: result.status,
    attempt: result.attempts,
    errorCode: result.errorCode,
  });
  await closeDatabase();
  if (result.status !== "SUCCEEDED") process.exitCode = 1;
} catch (error) {
  const normalized = normalizeOperationalError(error);
  console.error(`Replay failed: ${normalized.code}`);
  process.exit(1);
}
