CREATE TABLE "track_watch_states" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "profile_key" text NOT NULL,
  "mechanic_id" uuid NOT NULL REFERENCES "product_mechanics"("id"),
  "last_stage" text NOT NULL,
  "last_velocity" integer NOT NULL,
  "last_confidence" integer NOT NULL,
  "provider_message_id" text,
  "sent_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "uq_track_watch_state_profile_mechanic"
ON "track_watch_states" ("profile_key", "mechanic_id");

CREATE INDEX "track_watch_state_sent_idx"
ON "track_watch_states" ("sent_at");
