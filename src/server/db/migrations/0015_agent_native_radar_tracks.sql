ALTER TABLE "product_mechanics"
ADD COLUMN "radar_tracks" text[] NOT NULL DEFAULT ARRAY[]::text[];

ALTER TABLE "product_mechanics"
ADD CONSTRAINT "product_mechanics_radar_tracks_allowed"
CHECK (
  "radar_tracks" <@ ARRAY[
    'AGENT_INTERFACE',
    'AGENT_RUNTIME',
    'AGENT_SECURITY',
    'AGENT_TESTING',
    'AGENT_ECONOMY',
    'AGENT_TRUTH',
    'AGENT_EXPERIENCE',
    'GENERATIVE_UI',
    'SMALL_SOFTWARE',
    'CRYPTO_PQ',
    'WEB_PLATFORM'
  ]::text[]
);
