CREATE TYPE "publication_event_type" AS ENUM ('DELIVERED', 'VIEWED', 'CLICKED', 'FAILED');
CREATE TABLE "publication_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "publication_id" uuid NOT NULL,
  "event_type" "publication_event_type" NOT NULL, "source" text NOT NULL,
  "occurred_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "publication_events_publication_time_idx" ON "publication_events" ("publication_id", "occurred_at");
