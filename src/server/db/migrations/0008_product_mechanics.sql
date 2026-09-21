CREATE TYPE "mechanic_stage" AS ENUM ('SPARK', 'RISING', 'BREAKOUT', 'ESTABLISHED');
CREATE TYPE "mechanic_status" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TABLE "product_mechanics" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "canonical_name" text NOT NULL UNIQUE, "description" text NOT NULL,
  "first_observed_at" timestamptz NOT NULL, "last_observed_at" timestamptz NOT NULL,
  "stage" "mechanic_stage" NOT NULL, "velocity" integer NOT NULL, "confidence" integer NOT NULL,
  "status" "mechanic_status" NOT NULL DEFAULT 'ACTIVE', "affected_categories" jsonb NOT NULL,
  "practical_implications" jsonb NOT NULL, "risks" jsonb NOT NULL
);
CREATE TABLE "mechanic_evidence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "mechanic_id" uuid NOT NULL REFERENCES "product_mechanics"("id"),
  "signal_id" text, "project_id" uuid REFERENCES "projects"("id"), "source_event_id" uuid REFERENCES "source_events"("id"),
  "independence_group" text NOT NULL, "strength" integer NOT NULL
);
CREATE INDEX "mechanic_evidence_mechanic_idx" ON "mechanic_evidence" ("mechanic_id");
