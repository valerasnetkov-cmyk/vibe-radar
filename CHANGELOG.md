# Changelog

All notable durable changes to Vibe Radar are documented here.

## 2026-09-17

### Added

- Fixed product name **Vibe Radar** and canonical domain `viberadar.ru`.
- Defined Telegram-first MVP and staged delivery roadmap.
- Added modular architecture, initial data model, GitHub discovery contract, VIBE SCORE v1 contract, AI trust boundary, editorial workflow, security invariants, and OUTSCAN integration boundary.
- Added the initial Codex Stage 01 implementation brief.

### Security

- Established that repository content and LLM output are untrusted inputs.
- Established deterministic editor approval as a prerequisite for publication.
- Established idempotent publication as a mandatory invariant.
- Established that OUTSCAN integration is disabled by default and cannot affect VIBE SCORE or editorial ranking.
