CREATE TYPE "confidence_level" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TABLE "scores" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id"),
  "score_version" integer NOT NULL,
  "calculated_at" timestamptz NOT NULL,
  "velocity_score" integer NOT NULL,
  "novelty_score" integer NOT NULL,
  "cross_source_score" integer NOT NULL,
  "relevance_score" integer NOT NULL,
  "project_health_score" integer NOT NULL,
  "penalty_score" integer NOT NULL,
  "final_score" integer NOT NULL,
  "breakdown" jsonb NOT NULL
);
CREATE INDEX "scores_project_time_idx" ON "scores" ("project_id", "calculated_at");
CREATE TABLE "confidence_assessments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id"),
  "confidence_version" integer NOT NULL,
  "calculated_at" timestamptz NOT NULL,
  "value" integer NOT NULL,
  "level" "confidence_level" NOT NULL,
  "evidence_count" integer NOT NULL,
  "contradiction_count" integer NOT NULL,
  "explanation" jsonb NOT NULL
);
CREATE INDEX "confidence_project_time_idx" ON "confidence_assessments" ("project_id", "calculated_at");
