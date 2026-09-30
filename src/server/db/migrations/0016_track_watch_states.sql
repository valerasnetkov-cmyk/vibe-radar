CREATE TABLE "track_watch_profiles" (
  "profile_key" text PRIMARY KEY,
  "initialized_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "track_watch_states" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "profile_key" text NOT NULL,
  "mechanic_id" uuid NOT NULL REFERENCES "product_mechanics"("id"),
  "last_stage" text NOT NULL,
  "last_velocity" integer NOT NULL,
  "last_confidence" integer NOT NULL,
  "provider_message_id" text,
  "checkpoint_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "uq_track_watch_state_profile_mechanic"
ON "track_watch_states" ("profile_key", "mechanic_id");

CREATE INDEX "track_watch_state_checkpoint_idx"
ON "track_watch_states" ("checkpoint_at");
