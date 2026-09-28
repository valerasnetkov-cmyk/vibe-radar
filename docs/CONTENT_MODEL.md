# Content Model — Vibe Radar

## 1. Purpose

Generate one normalized editorial object and render it into multiple channels rather than asking the LLM to independently invent Telegram, Instagram, and web content.

## 2. ContentModel concept

Suggested fields:

- `content_version`
- `candidate_id`
- `title`
- `format` (`TRENDING`, `FRESH`, `RELEASE`, `HIDDEN_GEM`, `WATCH`, etc.)
- `short_summary`
- `why_now`
- `key_points[]`
- `audience[]`
- `limitations[]`
- repository metrics projection
- VIBE SCORE projection
- source/provenance references
- `outscan_relevance`
- optional approved CTA metadata

## 3. Channel renderers

Renderers are deterministic adapters:

```text
ContentModel
  ├─ Telegram renderer
  ├─ Instagram caption renderer (later)
  ├─ Instagram carousel data renderer (later)
  └─ Web article/project renderer (later)
```

## 4. Telegram MVP

Telegram output should remain compact and factual:

- project/title;
- concise value statement;
- star/growth metrics;
- VIBE SCORE;
- why it matters;
- key use cases;
- important limitation when relevant;
- repository/source link.

## 5. OUTSCAN content

OUTSCAN enrichment may only be added after editorial approval and feature-flag checks.

`outscan_relevance` is contextual metadata, not a score component.

The initial implementation renders the normalized model to escaped Telegram HTML and validates project links as HTTP(S) URLs. Publication remains behind deterministic approval and idempotency checks; channel renderers do not authorize publication.

## 6. Stage 08 server-side builder

`buildContentModelForApprovedCandidate(candidateId)` constructs the model
exclusively from persisted, validated records (candidate, project, provider
identity, score, confidence, latest valid SUCCEEDED analysis, latest
buildability when present, latest APPROVE decision). No LLM is involved and
no missing value is fabricated; gaps yield deterministic reasons
(`not_approved`, `missing_approval_decision`, `missing_project`,
`missing_provider_url`, `missing_score`, `missing_confidence`,
`missing_analysis`, `invalid_analysis`).

The model extends the concept above with `projectSlug`, `scoreVersion`,
`confidenceLevel`, HTTP(S)-only `sources`, and optional `buildability`.
Stage 08 format rule: first-time approved publications render as `FRESH`.

## 7. contentVersion and immutable snapshot

`contentVersion` is `sha256("content-schema:1|candidate:|analysis:|score:|score-version:|confidence-version:")`:
stable across retries, changed by any canonical input change, with no time
or randomness. The canonical model is persisted as `publications.content_payload`
before the provider call; retries and the public web render from that
immutable snapshot rather than rebuilding from mutable current state.
