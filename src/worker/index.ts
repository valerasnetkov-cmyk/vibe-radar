import { loadEnvironment } from "@/server/config/env";
import { JobScheduler } from "@/server/modules/operations/scheduler";
import { runConfiguredGitHubDiscovery } from "@/worker/jobs/github-discovery";
import { runConfiguredScoreCalculation } from "@/server/modules/scoring/job";
import { runConfiguredCandidateSelection } from "@/server/modules/editorial/candidate-job";

let stopping = false;
let scheduler: JobScheduler | undefined;

async function run(): Promise<void> {
  const config = loadEnvironment();
  const jobs = new Map<string, { handler: () => Promise<void>; intervalMs: number }>();
  if (config.GITHUB_DISCOVERY_QUERIES.trim())
    jobs.set("github-discovery", {
      handler: runConfiguredGitHubDiscovery,
      intervalMs: config.GITHUB_DISCOVERY_INTERVAL_MS,
    });
  jobs.set("score-calculation", {
    handler: runConfiguredScoreCalculation,
    intervalMs: config.SCORE_CALCULATION_INTERVAL_MS,
  });
  jobs.set("candidate-selection", {
    handler: runConfiguredCandidateSelection,
    intervalMs: config.CANDIDATE_SELECTION_INTERVAL_MS,
  });
  scheduler = new JobScheduler(jobs, {
    pollIntervalMs: config.WORKER_POLL_INTERVAL_MS,
    maxAttempts: config.WORKER_MAX_JOB_ATTEMPTS,
  });
  scheduler.start();
  console.log("VibeRadar worker started");
  while (!stopping) await new Promise((resolve) => setTimeout(resolve, 1000));
  scheduler.stop();
}

function stop(signal: string): void {
  stopping = true;
  scheduler?.stop();
  console.log(`VibeRadar worker stopping (${signal})`);
}

process.once("SIGINT", () => stop("SIGINT"));
process.once("SIGTERM", () => stop("SIGTERM"));
run().catch(() => {
  process.exitCode = 1;
});
