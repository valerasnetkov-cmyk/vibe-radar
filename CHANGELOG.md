# Changelog

All notable durable changes to VibeRadar are documented here.

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
