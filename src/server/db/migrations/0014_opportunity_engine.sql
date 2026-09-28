ALTER TABLE "opportunities" ADD COLUMN "canonical_key" text;
ALTER TABLE "opportunities" ADD COLUMN "policy_version" integer NOT NULL DEFAULT 1;
ALTER TABLE "opportunities" ADD COLUMN "buildability_label" "buildability_label";
ALTER TABLE "opportunities" ADD COLUMN "required_capabilities" jsonb;
ALTER TABLE "opportunities" ADD COLUMN "published_at" timestamptz;
ALTER TABLE "opportunities" ADD COLUMN "updated_at" timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX "uq_opportunities_canonical_key" ON "opportunities" ("canonical_key");
ALTER TABLE "opportunity_evidence" ADD COLUMN "evidence_key" text;
CREATE UNIQUE INDEX "uq_opportunity_evidence_evidence_key" ON "opportunity_evidence" ("evidence_key");
CREATE TYPE "opportunity_review_decision" AS ENUM ('APPROVE', 'REJECT');
CREATE TABLE "opportunity_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "opportunity_id" uuid NOT NULL REFERENCES "opportunities"("id"),
  "editor_actor_id" text NOT NULL,
  "decision" "opportunity_review_decision" NOT NULL,
  "note" text,
  "reviewed_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "opportunity_reviews_opportunity_time_idx" ON "opportunity_reviews" ("opportunity_id", "reviewed_at");