CREATE TABLE "releases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id"),
  "provider_release_id" text NOT NULL,
  "tag_name" text NOT NULL,
  "name" text,
  "published_at" timestamptz,
  "is_prerelease" boolean NOT NULL,
  "is_draft" boolean NOT NULL,
  "summary" text,
  "source_event_id" uuid NOT NULL REFERENCES "source_events"("id"),
  CONSTRAINT "release_identity_unique" UNIQUE ("project_id", "provider_release_id")
);
