# Agent-native Radar Tracks

**Status:** Active taxonomy v1
**Date:** 2026-09-30

VibeRadar uses a small canonical taxonomy for emerging technology signals. The taxonomy is classification only: it does not change VIBE SCORE, editorial approval or publication priority.

## Tracks

- `AGENT_INTERFACE` — MCP, UTCP, agent-facing APIs, plugins and machine-first control surfaces.
- `AGENT_RUNTIME` — persistent sessions, sandboxes, agent computers and execution infrastructure.
- `AGENT_SECURITY` — runtime policy, credential brokers, agent attack surface and tool authorization.
- `AGENT_TESTING` — replay, verification, fuzzing and independent agent QA.
- `AGENT_ECONOMY` — agent payments, budgets and B2A commerce.
- `AGENT_TRUTH` — approved fact layers and shared source-of-truth infrastructure for agents.
- `AGENT_EXPERIENCE` — AX/readiness, agent choice, discoverability and task-success optimization.
- `GENERATIVE_UI` — task-specific interfaces generated or reshaped by agents.
- `SMALL_SOFTWARE` — micro-app/cloud patterns optimized for small bespoke applications.
- `CRYPTO_PQ` — crypto agility, post-quantum migration and cryptographic inventory.
- `WEB_PLATFORM` — browser/platform primitives that materially enable new web product mechanics.

## Rules

1. A signal may have multiple tracks.
2. Unknown labels stay unknown; the system must not force a category.
3. Track classification is independent of VIBE SCORE.
4. New tracks require a versioned taxonomy change.
5. Aliases are normalized only to canonical values.
6. Editorial copy may use friendlier labels, but persisted machine-facing values remain canonical.

## Initial use

The taxonomy is used by Product Mechanic Radar and the public `/mechanics?track=...` filter.

Operator watch alerts use the same canonical tracks. The first enabled run creates a baseline of already-public mechanics without sending historical notifications. Later runs notify only when a watched public mechanic is new to the baseline, changes lifecycle stage, or crosses the configured material velocity/confidence threshold. Delivery is bounded per run and goes only to the configured private editor chat.

Watch configuration does not change VIBE SCORE, confidence, lifecycle, editorial review or publication priority. Unknown configured tracks fail closed instead of silently broadening the watch scope.
