CREATE TYPE "job_run_status" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED', 'DEAD_LETTER');
CREATE TABLE "job_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "job_name" text NOT NULL,
  "status" "job_run_status" NOT NULL, "attempt_count" integer NOT NULL, "max_attempts" integer NOT NULL,
  "error_code" text, "started_at" timestamptz NOT NULL DEFAULT now(), "finished_at" timestamptz
);
CREATE INDEX "job_runs_name_started_idx" ON "job_runs" ("job_name", "started_at");
