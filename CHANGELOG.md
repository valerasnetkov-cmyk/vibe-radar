# Changelog

All notable durable changes to VibeRadar are documented here.

## Unreleased — Stage 08 approved publishing and public read model

### Added

- Server-side ContentModel builder for approved candidates with deterministic non-publishable reasons and a hash-based stable contentVersion.
- Immutable publication content snapshots (`publications.content_payload`, migration `0011`) with attempt and error tracking.
- Identity-based `publishApprovedCandidate` with PostgreSQL-derived approval binding, atomic first claim, atomic failed-retry re-claim, and provider/finalization failure separation.
- Hardened `TelegramPublisher` provider boundary and public-channel config resolver.
- Entity/tag-safe Telegram HTML bounding.
- Publication worker job with channel-guarded scheduling and a published-only read model.
- Real `/radar`, `/projects/[slug]`, and home pages rendering published snapshots with honest empty and not-found states.

## Unreleased — Stage 07 Telegram editorial dispatch

### Added

- Canonical candidate get-or-create on `dedupe_key` with real project/score foreign keys; rejected threshold decisions never persist candidates.
- `editorial_review_dispatches` table (`0010` migration) with `UNIQUE(candidate_id)` and `PENDING`/`SENT`/`FAILED` lifecycle.
- Atomic DB-backed dispatch claim: one owner sends, `SENT` never resends, `FAILED` retries within a bounded budget.
- `providerMessageId` persisted before candidates move to `REVIEW`; failures keep `CANDIDATE` with safe error codes.
- Editor cards projected only from persisted project, provider URL, validated analysis, score, and confidence data.
- `requireTelegramEditorConfig` fail-closed validation and `TELEGRAM_API_TIMEOUT_MS` propagation.
- Stage 07 unit coverage (EditorBot provider matrix, card projection, breakdown/confidence reconstruction, config, error normalization) and PostgreSQL integration coverage for the dispatch lifecycle.
- Documented external-delivery timeout ambiguity (at-most-once attempts, no exactly-once claim across Telegram).
- Separated provider send failures from post-delivery DB finalization failures: finalization failures return `finalization_failed` with a reconciliation marker instead of `FAILED`, and never resend automatically.
- Atomic `FAILED` retry re-claim (`UPDATE ... WHERE status='FAILED' AND attempt_count=? RETURNING`) so concurrent retries still produce a single send.
- Race-safe `getOrCreateCandidate` (insert winner returns its id directly; losers re-read; concurrent callers receive the same row).

## 2026-09-17

### Added

- Fixed canonical product name **VibeRadar** and domain `viberadar.ru`.
- Expanded positioning from a GitHub/media discovery system to a technology-intelligence and opportunity-discovery platform for AI-assisted builders.
- Defined three product layers: Radar Engine, VibeRadar Media, and VibeRadar Intelligence.
- Added source trust/fact-check policy.
- Added Product Mechanic Radar contract and lifecycle (`SPARK`, `RISING`, `BREAKOUT`, `ESTABLISHED`).
- Added Opportunity Engine contract.
- Added explicit MVP scope and acceptance criteria.
- Expanded the conceptual data model with source-neutral projects, signals, confidence, buildability, mechanics, trends, opportunities, and evidence links.
- Added minimal `viberadar.ru` canonical web records to the MVP while preserving Telegram-first operational priority.
- Updated the implementation path to a modular TypeScript/Next.js application with PostgreSQL/Drizzle and a separate worker process.

### Changed

- Clarified that popularity/reach, velocity, VIBE SCORE, confidence, buildability, and trend stage are separate product concepts.
- Clarified that AI-generated interpretation is never source evidence.
- Clarified that sponsored, partner, and first-party integrations cannot affect scoring or editorial ranking.
- Moved automated Product Mechanic Radar and Opportunity Engine work after the core discovery/scoring/editorial MVP.

### Security

- Repository/source content and LLM output remain untrusted inputs.
- Trusted human approval remains mandatory for initial publication.
- Publication idempotency remains a mandatory invariant.
- OUTSCAN remains isolated from VIBE SCORE, Trend Velocity, confidence, candidate selection, and editorial ranking.


## 2026-09-18

### Added

- Added executable implementation specification covering runtime shape, module boundaries, public routes, write boundaries, stage order, and stage definition-of-done.
- Added PostgreSQL schema contract with canonical identity, snapshot history, versioned scoring/confidence/buildability, editorial audit, and publication idempotency.
- Added background jobs and processing-pipeline contract covering bounded retries, concurrency, scheduling, cost controls, observability, and manual replay.
- Added deployment/operations contract for local/test/production environments, reverse proxy/TLS, health/readiness, structured logging, metrics, backups, restore, rollback, and incident basics.
- Added test strategy spanning unit, PostgreSQL integration, provider-contract, security-negative, web/component, and high-value end-to-end coverage.
- Added strict light-minimal web visual system: flat surfaces, no decorative gradients/glows/glassmorphism, no routine card shadows, data-first layouts, restrained blue accent, and real-data-only UI.

### Changed

- Aligned `CODEX_STAGE_01.md` with the canonical Next.js App Router + separate worker + PostgreSQL/Drizzle architecture.
- Replaced the obsolete Fastify-first roadmap with the current staged implementation path.
- Clarified that the MVP web surface begins with a restrained light shell and later adds real radar/project/methodology pages only when supporting data exists.


## 2026-09-21

### Added

- Added a claim-level evidence model with `ResearchRun`, `Claim`, `EvidenceItem`, verification states, independence groups, and reproducibility requirements.
- Added a reference-repository register covering OpenResearch, Hermes Agent, DeepSeek Harness, Ruflo, OmniRoute, YouTube Automation Agent, and Paperclip with explicit adoption/defer gates.
- Added an initial Alpha operating target of 50-100 tracked repositories with a small editor-reviewed candidate set rather than maximum collection volume.

### Changed

- Made evidence packaging a first-class step between deterministic intelligence and AI-generated interpretation.
- Expanded the conceptual data model and architecture with an explicit evidence module and claim-level provenance.
- Tightened AI analysis so factual statements resolve to stored claims/evidence while model interpretation remains visibly separate.
- Clarified delivery priorities as P0 core intelligence, P1 editorial/publishing/operations, and P2 mechanic/opportunity intelligence.
- Clarified that optional agent runtimes, multi-agent frameworks, and model routers are evaluated only after the native VibeRadar pipeline demonstrates a measured need.

### Security

- External agent/control-plane tools never become the VibeRadar system of record and cannot mutate scoring policy, approve publication, bypass editorial gates, or receive unrestricted infrastructure credentials.
- Stage 01 explicitly excludes Hermes Agent, DeepSeek Harness, Ruflo, OmniRoute, and equivalent orchestration/routing dependencies.

### Notes

- Documentation-only change. No runtime code, dependencies, migrations, or deployment behavior were modified.
