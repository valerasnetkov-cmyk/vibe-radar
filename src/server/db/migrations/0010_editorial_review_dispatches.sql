CREATE TYPE "dispatch_status" AS ENUM ('PENDING', 'SENT', 'FAILED');

CREATE TABLE "editorial_review_dispatches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "candidate_id" uuid NOT NULL REFERENCES "candidates"("id"),
  "status" "dispatch_status" NOT NULL DEFAULT 'PENDING',
  "provider_message_id" text NULL,
  "attempt_count" integer NOT NULL DEFAULT 0,
  "last_error_code" text NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "sent_at" timestamptz NULL,
  CONSTRAINT "uq_editorial_review_dispatches_candidate_id" UNIQUE ("candidate_id")
);