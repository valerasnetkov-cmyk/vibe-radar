# External Source Discovery

**Status:** Chrome adapter implemented; other providers gated
**Date:** 2026-09-30

## Goal

Extend VibeRadar beyond GitHub without creating a second scoring or evidence system.

All external discovery adapters must normalize into the existing `source_events` provenance layer. They do not publish, change VIBE SCORE, or create trusted facts by themselves.

## Chrome Developers

The first production-oriented adapter uses the official Chrome Developers RSS feed.

Security and reliability constraints:

- fixed feed URL only;
- HTTPS only;
- redirects disabled;
- response timeout;
- bounded response size;
- XML/RSS content-type check;
- article links must resolve to `developer.chrome.com`;
- HTML is reduced to bounded plain-text metadata;
- raw feed content is not executed or rendered as trusted HTML;
- source events are idempotent on provider + article URL.

Configuration:

```env
CHROME_DISCOVERY_ENABLED=false
CHROME_DISCOVERY_INTERVAL_MS=3600000
CHROME_FEED_TIMEOUT_MS=10000
```

The feature is opt-in.

## Evidence independence

Official publisher content is useful evidence, but repeated posts by the same publisher must not inflate independence.

Rules:

- canonical project evidence groups as `project:<id>`;
- approved official publisher evidence groups as `publisher:<provider>`;
- repeated Chrome posts therefore share `publisher:chrome`;
- unknown source-only providers remain unresolved;
- project anchoring outranks publisher anchoring when both are present.

This allows, for example, one Chrome source plus one independent implementation/project to count as two origins, while five Chrome posts still count as one publisher origin.

## Product Hunt

Do not enable a production adapter merely because an API is technically accessible.

Before implementation, confirm:

- API access and token requirements;
- commercial-use permission for the intended VibeRadar use;
- rate limits and retention requirements;
- whether derived/public content may be stored and republished.

Until then, Product Hunt remains a research/manual source rather than an automated production provider.

## Y Combinator

No automated adapter is enabled yet.

Before implementation, choose a stable permitted source/API rather than depending on undocumented scraping behavior. The adapter must use the same `source_events` boundary and conservative independence grouping.

## web.dev

A separate official-source adapter may be added after confirming a stable feed or API contract. It must not be silently merged with Chrome evidence if the editorial/publisher origin differs materially.

## Non-goals

This layer does not:

- execute discovered code;
- browse arbitrary URLs supplied by feed content;
- auto-approve mechanics;
- auto-publish content;
- boost VIBE SCORE because a source is prestigious;
- let an LLM decide evidence independence.
