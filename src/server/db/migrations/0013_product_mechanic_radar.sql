ALTER TABLE "product_mechanics" ADD COLUMN "canonical_key" text;
ALTER TABLE "product_mechanics" ADD COLUMN "policy_version" integer NOT NULL DEFAULT 1;
ALTER TABLE "mechanic_evidence" ADD COLUMN "evidence_key" text;
ALTER TABLE "mechanic_evidence" ADD COLUMN "observed_at" timestamptz;
ALTER TABLE "mechanic_evidence" ADD COLUMN "independence_basis" text;
UPDATE "product_mechanics"
SET "canonical_key" = lower(regexp_replace(trim("canonical_name"), '\s+', ' ', 'g'))
WHERE "canonical_key" IS NULL;
CREATE UNIQUE INDEX "uq_product_mechanics_canonical_key" ON "product_mechanics" ("canonical_key");
CREATE UNIQUE INDEX "uq_mechanic_evidence_evidence_key" ON "mechanic_evidence" ("evidence_key");
CREATE TYPE "mechanic_review_decision" AS ENUM ('APPROVE', 'REJECT');
CREATE TABLE "mechanic_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "mechanic_id" uuid NOT NULL REFERENCES "product_mechanics"("id"),
  "editor_actor_id" text NOT NULL,
  "decision" "mechanic_review_decision" NOT NULL,
  "note" text,
  "reviewed_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "mechanic_reviews_mechanic_time_idx" ON "mechanic_reviews" ("mechanic_id", "reviewed_at");