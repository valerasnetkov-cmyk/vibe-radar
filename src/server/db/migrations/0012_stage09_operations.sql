CREATE TABLE "job_leases" (
  "job_name" text PRIMARY KEY,
  "owner_id" text NOT NULL,
  "locked_until" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE "ai_daily_usage" (
  "utc_day" date PRIMARY KEY,
  "used_count" integer NOT NULL DEFAULT 0,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE TYPE "digest_window" AS ENUM ('DAILY', 'WEEKLY');
CREATE TABLE "radar_digests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "window" "digest_window" NOT NULL,
  "period_key" text NOT NULL,
  "generated_at" timestamptz NOT NULL DEFAULT now(),
  "content_payload" jsonb,
  "item_count" integer NOT NULL DEFAULT 0,
  CONSTRAINT "uq_radar_digests_window_period" UNIQUE ("window", "period_key")
);
ALTER TABLE "job_runs" ADD COLUMN "replay_of_job_run_id" uuid REFERENCES "job_runs"("id");