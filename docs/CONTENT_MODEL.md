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
