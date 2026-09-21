CREATE TYPE "analysis_status" AS ENUM ('SUCCEEDED', 'ANALYSIS_FAILED');
CREATE TABLE "analyses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "candidate_id" uuid NOT NULL REFERENCES "candidates"("id"),
  "analysis_version" integer NOT NULL, "prompt_version" text NOT NULL, "provider" text NOT NULL, "model" text NOT NULL,
  "output" jsonb, "status" "analysis_status" NOT NULL, "attempts" integer NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "analyses_candidate_time_idx" ON "analyses" ("candidate_id", "created_at");
