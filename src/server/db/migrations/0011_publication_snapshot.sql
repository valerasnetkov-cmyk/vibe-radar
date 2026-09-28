ALTER TABLE "publications" ADD COLUMN "content_payload" jsonb;
ALTER TABLE "publications" ADD COLUMN "attempt_count" integer NOT NULL DEFAULT 0;
ALTER TABLE "publications" ADD COLUMN "last_error_code" text;