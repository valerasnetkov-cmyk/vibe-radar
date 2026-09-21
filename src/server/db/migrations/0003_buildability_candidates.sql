CREATE TYPE "buildability_label" AS ENUM ('SOLO_MVP', 'SMALL_TEAM', 'TEAM_REQUIRED');
CREATE TYPE "candidate_status" AS ENUM ('CANDIDATE', 'ANALYSIS_PENDING', 'REVIEW', 'WATCHING', 'REJECTED', 'APPROVED', 'EXPIRED');
CREATE TABLE "buildability_assessments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "project_id" uuid NOT NULL REFERENCES "projects"("id"),
  "assessment_version" integer NOT NULL, "calculated_at" timestamptz NOT NULL, "label" "buildability_label" NOT NULL,
  "dimensions" jsonb NOT NULL, "constraints" jsonb NOT NULL, "explanation" text NOT NULL
);
CREATE INDEX "buildability_project_time_idx" ON "buildability_assessments" ("project_id", "calculated_at");
CREATE TABLE "candidates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "project_id" uuid NOT NULL REFERENCES "projects"("id"),
  "score_id" uuid NOT NULL REFERENCES "scores"("id"), "reason" text NOT NULL,
  "status" "candidate_status" NOT NULL DEFAULT 'CANDIDATE', "dedupe_key" text NOT NULL UNIQUE,
  "created_at" timestamptz NOT NULL DEFAULT now(), "expires_at" timestamptz
);
CREATE INDEX "candidates_project_status_idx" ON "candidates" ("project_id", "status");
