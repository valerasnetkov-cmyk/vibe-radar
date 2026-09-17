# Database Schema — VibeRadar

## 1. Principles

PostgreSQL is the authoritative store for domain state.

Schema design must preserve:

- canonical identity;
- immutable/append-only historical observations where possible;
- source provenance;
- score/version reproducibility;
- editorial auditability;
- publication idempotency.

Use UTC timestamps in storage.

Do not store secrets in domain tables.

## 2. MVP tables

### projects

Canonical project identity independent of provider naming.

Core fields:

- `id` UUID/identity primary key
- `slug` unique stable public slug
- `name`
- `description`
- `primary_category`
- `primary_language` nullable
- `license_spdx` nullable
- `homepage_url` nullable
- `status`
- `first_seen_at`
- `last_seen_at`
- `created_at`
- `updated_at`

Indexes:

- unique `slug`
- `primary_category`
- `last_seen_at desc`

### provider_identities

Maps canonical projects to provider objects.

Core fields:

- `id`
- `project_id`
- `provider`
- `provider_object_id`
- `provider_owner`
- `provider_name`
- `provider_full_name`
- `provider_url`
- `default_branch` nullable
- `created_at_provider` nullable
- `pushed_at_provider` nullable
- `first_seen_at`
- `last_seen_at`

Constraint:

- unique `(provider, provider_object_id)`

### source_events

Provenance for discovery and refresh.

Core fields:

- `id`
- `provider`
- `source_kind`
- `source_key`
- `provider_object_id` nullable
- `retrieved_at`
- `observed_at` nullable
- `status`
- `payload_hash` nullable
- bounded normalized metadata JSON
- `error_code` nullable

Do not store auth headers/tokens.

### project_snapshots

Append-only time-series observations.

Core fields:

- `id`
- `project_id`
- `source_event_id`
- `observed_at`
- `stars`
- `forks`
- `open_issues`
- `watchers` nullable
- `contributors_count` nullable when reliably available
- `pushed_at_provider` nullable
- selected activity fields

Constraint:

- unique `(project_id, observed_at)` or a clearly documented bucketed equivalent.

Indexes:

- `(project_id, observed_at desc)`
- `observed_at desc`

### releases

Core fields:

- `id`
- `project_id`
- `provider_release_id`
- `tag_name`
- `name` nullable
- `published_at`
- `is_prerelease`
- `is_draft`
- bounded normalized summary
- `source_event_id`

Constraint:

- unique `(project_id, provider_release_id)`

### scores

Versioned deterministic scoring snapshots.

Core fields:

- `id`
- `project_id`
- `score_version`
- `calculated_at`
- `velocity_score`
- `novelty_score`
- `cross_source_score`
- `relevance_score`
- `project_health_score`
- `penalty_score`
- `final_score`
- structured breakdown JSON

Buildability remains a separate assessment and should not be duplicated as an opaque score input.

Index:

- `(project_id, calculated_at desc)`

### confidence_assessments

Core fields:

- `id`
- `project_id`
- `confidence_version`
- `calculated_at`
- `value`
- `level` (`LOW`, `MEDIUM`, `HIGH`)
- evidence-count inputs
- contradiction flags
- structured explanation

### buildability_assessments

Core fields:

- `id`
- `project_id`
- `assessment_version`
- `calculated_at`
- `label` (`SOLO_MVP`, `SMALL_TEAM`, `TEAM_REQUIRED`)
- dimension breakdown JSON
- constraints JSON
- explanation
- provenance for model-assisted fields when applicable

### candidates

Core fields:

- `id`
- `project_id`
- `score_id`
- `reason`
- `status`
- `dedupe_key`
- `created_at`
- `expires_at` nullable

Constraint:

- unique `dedupe_key`

### analyses

Core fields:

- `id`
- `candidate_id`
- `analysis_version`
- `prompt_version`
- `provider`
- `model`
- validated structured output JSON
- `status`
- `created_at`
- bounded token/cost metadata

Model output is data, not authorization.

### editorial_decisions

Core fields:

- `id`
- `candidate_id`
- `editor_actor_id`
- `decision`
- `note` nullable
- `decided_at`

Do not overwrite earlier decisions; preserve history or use a separate event model if later workflow requires it.

### publications

Core fields:

- `id`
- `candidate_id`
- `editorial_decision_id`
- `channel`
- `content_version`
- `idempotency_key`
- `status`
- `provider_message_id` nullable
- `published_at` nullable
- `created_at`

Constraint:

- unique `idempotency_key`

### publication_attempts

Core fields:

- `id`
- `publication_id`
- `attempt_number`
- `started_at`
- `finished_at` nullable
- `status`
- `provider_message_id` nullable
- `normalized_error_code` nullable

Constraint:

- unique `(publication_id, attempt_number)`

## 3. Deferred tables

Do not create until the owning stage starts:

- `signals` beyond repository/release events if no concrete non-GitHub source exists;
- `product_mechanics`;
- `mechanic_evidence`;
- `trends`;
- `opportunities`;
- `watchlists`;
- `users`;
- `subscriptions`;
- public API keys.

Documented domain concepts do not require empty tables.

## 4. Data retention

MVP policy:

- preserve normalized snapshots needed for longitudinal scoring;
- retain provenance needed to reproduce important claims;
- avoid indefinite raw provider payload storage by default;
- define raw payload retention only when a concrete debugging/audit need exists;
- publication/editorial audit records are durable.

## 5. Migration rules

- use Drizzle schema definitions plus explicit versioned migrations;
- migrations run as a distinct deploy step;
- production app startup must not silently mutate schema;
- destructive migrations require an explicit data/backfill plan;
- all uniqueness/idempotency guarantees are enforced in PostgreSQL, not only application code.
