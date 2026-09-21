CREATE TYPE "opportunity_market_scope" AS ENUM ('RU', 'GLOBAL', 'RU_GLOBAL');
CREATE TYPE "opportunity_status" AS ENUM ('PROPOSED', 'REVIEWED', 'PUBLISHED', 'REJECTED');
CREATE TABLE "opportunities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "title" text NOT NULL, "problem_statement" text NOT NULL,
  "proposed_product" text NOT NULL, "target_user" text NOT NULL, "market_scope" "opportunity_market_scope" NOT NULL,
  "buildability_assessment_id" uuid NOT NULL REFERENCES "buildability_assessments"("id"),
  "differentiation_hypothesis" text NOT NULL, "risk_summary" jsonb NOT NULL,
  "opportunity_confidence" integer NOT NULL, "status" "opportunity_status" NOT NULL DEFAULT 'PROPOSED',
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "opportunities_status_created_idx" ON "opportunities" ("status", "created_at");
CREATE TABLE "opportunity_evidence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "opportunity_id" uuid NOT NULL REFERENCES "opportunities"("id"),
  "subject_type" text NOT NULL, "subject_id" text NOT NULL, "rationale" text NOT NULL, "evidence_weight" integer NOT NULL
);
CREATE INDEX "opportunity_evidence_opportunity_idx" ON "opportunity_evidence" ("opportunity_id");
