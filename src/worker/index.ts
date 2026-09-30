import { randomUUID } from "node:crypto";
import { closeDatabase, getDatabase } from "@/server/db/client";
import { loadEnvironment } from "@/server/config/env";
import { logOperationalEvent } from "@/server/modules/operations/log";
import { createDurableSchedulerStore } from "@/server/modules/operations/durable-store";
import { JobScheduler, type ScheduledJob } from "@/server/modules/operations/scheduler";
import { runConfiguredGitHubDiscovery } from "@/worker/jobs/github-discovery";
import { runConfiguredChromeDiscovery } from "@/worker/jobs/chrome-discovery";
import { runConfiguredScoreCalculation } from "@/server/modules/scoring/job";
import { runConfiguredCandidateSelection } from "@/server/modules/editorial/candidate-job";
import { runConfiguredPublication } from "@/server/modules/publishing/job";
import {
  runConfiguredDailyRadar,
  runConfiguredWeeklyRadar,
} from "@/server/modules/publishing/digest-job";
import { runConfiguredTrackWatchAlerts } from "@/server/modules/mechanics/watch-job";

const SHUTDOWN_GRACE_MS = 15000;

let stopping = false;
let scheduler: JobScheduler | undefined;

async function run(): Promise<void> {
  const config = loadEnvironment();
  const ownerId = randomUUID();
  const store = createDurableSchedulerStore(getDatabase(), ownerId);
  const jobs = new Map<string, ScheduledJob>();
  if (config.GITHUB_DISCOVERY_QUERIES.trim())
    jobs.set("github-discovery", {
      handler: runConfiguredGitHubDiscovery,
      intervalMs: config.GITHUB_DISCOVERY_INTERVAL_MS,
      leaseMs: config.WORKER_JOB_LEASE_MS,
      maxAttempts: config.WORKER_MAX_JOB_ATTEMPTS,
    });
  if (config.CHROME_DISCOVERY_ENABLED) {
    jobs.set("chrome-discovery", {
      handler: runConfiguredChromeDiscovery,
      intervalMs: config.CHROME_DISCOVERY_INTERVAL_MS,
      leaseMs: config.WORKER_JOB_LEASE_MS,
      maxAttempts: config.WORKER_MAX_JOB_ATTEMPTS,
    });
  }
  jobs.set("score-calculation", {
    handler: runConfiguredScoreCalculation,
    intervalMs: config.SCORE_CALCULATION_INTERVAL_MS,
    leaseMs: config.WORKER_JOB_LEASE_MS,
    maxAttempts: config.WORKER_MAX_JOB_ATTEMPTS,
  });
  jobs.set("candidate-selection", {
    handler: runConfiguredCandidateSelection,
    intervalMs: config.CANDIDATE_SELECTION_INTERVAL_MS,
    leaseMs: config.WORKER_JOB_LEASE_MS,
    maxAttempts: config.WORKER_MAX_JOB_ATTEMPTS,
  });
  if (config.TELEGRAM_CHANNEL_ID?.trim()) {
    jobs.set("publication", {
      handler: runConfiguredPublication,
      intervalMs: config.PUBLICATION_INTERVAL_MS,
      leaseMs: config.WORKER_JOB_LEASE_MS,
      maxAttempts: config.WORKER_MAX_JOB_ATTEMPTS,
    });
  }
  jobs.set("daily-radar", {
    handler: () => runConfiguredDailyRadar(),
    intervalMs: config.DAILY_RADAR_INTERVAL_MS,
    leaseMs: config.WORKER_JOB_LEASE_MS,
    maxAttempts: config.WORKER_MAX_JOB_ATTEMPTS,
  });
  jobs.set("weekly-radar", {
    handler: () => runConfiguredWeeklyRadar(),
    intervalMs: config.WEEKLY_RADAR_INTERVAL_MS,
    leaseMs: config.WORKER_JOB_LEASE_MS,
    maxAttempts: config.WORKER_MAX_JOB_ATTEMPTS,
  });
  if (config.RADAR_WATCH_TRACKS.trim()) {
    jobs.set("track-watch-alerts", {
      handler: runConfiguredTrackWatchAlerts,
      intervalMs: config.RADAR_WATCH_INTERVAL_MS,
      leaseMs: config.WORKER_JOB_LEASE_MS,
      maxAttempts: config.WORKER_MAX_JOB_ATTEMPTS,
    });
  }
  scheduler = new JobScheduler(
    jobs,
    {
      pollIntervalMs: config.WORKER_POLL_INTERVAL_MS,
      maxAttempts: config.WORKER_MAX_JOB_ATTEMPTS,
      defaultLeaseMs: config.WORKER_JOB_LEASE_MS,
      onResult: (jobName, result) =>
        logOperationalEvent({
          level: result.status === "SUCCEEDED" ? "info" : "error",
          service: "worker",
          jobName,
          status: result.status,
          attempt: result.attempts,
          errorCode: result.errorCode,
        }),
    },
    store,
  );
  scheduler.start();
  logOperationalEvent({ level: "info", service: "worker", status: "started" });
  while (!stopping) await new Promise((resolve) => setTimeout(resolve, 1000));
  scheduler.stop();
}

async function stop(signal: string): Promise<void> {
  if (stopping) return;
  stopping = true;
  logOperationalEvent({ level: "info", service: "worker", status: `stopping-${signal}` });
  scheduler?.stop();
  // Bounded grace: let the in-flight bounded operation finish, then close.
  await scheduler?.waitForIdle(SHUTDOWN_GRACE_MS);
  await closeDatabase();
  logOperationalEvent({ level: "info", service: "worker", status: "stopped" });
}

process.once("SIGINT", () => void stop("SIGINT"));
process.once("SIGTERM", () => void stop("SIGTERM"));
run().catch(() => {
  process.exitCode = 1;
});
