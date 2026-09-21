CREATE TYPE "provider" AS ENUM ('github');
CREATE TYPE "project_status" AS ENUM ('active', 'archived');
CREATE TYPE "publication_status" AS ENUM ('pending', 'published', 'failed');
CREATE TABLE "projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "slug" text NOT NULL UNIQUE,
  "name" text NOT NULL, "description" text, "primary_category" text,
  "status" "project_status" NOT NULL DEFAULT 'active',
  "first_seen_at" timestamptz NOT NULL, "last_seen_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "projects_category_idx" ON "projects" ("primary_category");
CREATE INDEX "projects_last_seen_idx" ON "projects" ("last_seen_at");
CREATE TABLE "provider_identities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "project_id" uuid NOT NULL REFERENCES "projects"("id"),
  "provider" "provider" NOT NULL, "provider_object_id" text NOT NULL, "provider_owner" text NOT NULL,
  "provider_name" text NOT NULL, "provider_full_name" text NOT NULL, "provider_url" text NOT NULL,
  "first_seen_at" timestamptz NOT NULL, "last_seen_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "provider_identity_unique" UNIQUE ("provider", "provider_object_id")
);
CREATE TABLE "source_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "provider" "provider" NOT NULL,
  "source_kind" text NOT NULL, "source_key" text NOT NULL, "retrieved_at" timestamptz NOT NULL,
  "status" text NOT NULL, "payload_hash" text, "normalized_metadata" jsonb,
  CONSTRAINT "source_event_key_unique" UNIQUE ("provider", "source_key")
);
CREATE TABLE "project_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "project_id" uuid NOT NULL REFERENCES "projects"("id"),
  "source_event_id" uuid NOT NULL REFERENCES "source_events"("id"), "observed_at" timestamptz NOT NULL,
  "stars" bigint NOT NULL, "forks" bigint NOT NULL, "open_issues" integer NOT NULL, "watchers" bigint,
  CONSTRAINT "snapshot_observation_unique" UNIQUE ("project_id", "observed_at")
);
CREATE INDEX "snapshots_project_time_idx" ON "project_snapshots" ("project_id", "observed_at");
CREATE TABLE "publications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "candidate_id" uuid NOT NULL,
  "editorial_decision_id" uuid NOT NULL, "channel" text NOT NULL, "content_version" text NOT NULL,
  "idempotency_key" text NOT NULL UNIQUE, "status" "publication_status" NOT NULL DEFAULT 'pending',
  "provider_message_id" text, "published_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "publications_candidate_idx" ON "publications" ("candidate_id");
