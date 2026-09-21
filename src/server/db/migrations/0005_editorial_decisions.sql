CREATE TYPE "editorial_decision" AS ENUM ('APPROVE', 'WATCH', 'REJECT');
CREATE TABLE "editorial_decisions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "candidate_id" uuid NOT NULL REFERENCES "candidates"("id"),
  "editor_actor_id" text NOT NULL, "decision" "editorial_decision" NOT NULL, "note" text,
  "decided_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "editorial_decisions_candidate_time_idx" ON "editorial_decisions" ("candidate_id", "decided_at");
