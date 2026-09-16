# VIBE SCORE v1

## 1. Purpose

VIBE SCORE ranks editorial discovery potential, not software security, code quality, investment value, or objective project superiority.

It must be explainable and versioned.

## 2. Version

Initial algorithm identifier:

`score_version = 1`

Historical scores are immutable. A future v2 does not rewrite v1 records.

## 3. Components

Target weighting for v1:

| Component | Weight |
|---|---:|
| Growth | 35 |
| Vibe relevance | 25 |
| Freshness | 15 |
| Development activity | 10 |
| Community | 5 |
| Documentation | 5 |
| Originality | 5 |
| **Total before penalties** | **100** |

All components must be normalized to deterministic bounded ranges.

## 4. Growth

Growth is based on snapshots, not the current star count alone.

Candidate inputs:

- absolute delta over 2h/24h/7d;
- percentage delta over 2h/24h/7d;
- acceleration relative to prior windows;
- repository age normalization.

A young repository rapidly moving from 300 to 900 stars may score above a mature 80k-star repository with little current growth.

## 5. Vibe relevance

Relevance measures fit to Vibe Radar editorial themes such as AI coding, developer tools, agents, MCP, automation, self-hosting, and related builder workflows.

Prefer deterministic metadata/topic/text features first. AI may later assist classification, but it must not be the sole opaque source of the final score.

## 6. Freshness

Use repository age, first-seen timestamp, and release recency.

Freshness must not permanently suppress mature projects when a major relevant release creates a new editorial event.

## 7. Development activity

Possible inputs:

- recent push activity;
- release activity;
- contributor/commit activity where available and affordable.

Avoid rewarding noisy commit volume without context.

## 8. Community

Possible inputs:

- stars/forks normalized by age;
- issue/discussion activity when meaningful;
- contributor breadth when available.

Do not treat popularity as quality.

## 9. Documentation

Simple deterministic signals first:

- README present;
- meaningful description;
- license clarity;
- setup/use documentation presence where observable.

Do not execute repository examples to verify documentation.

## 10. Originality

v1 may start conservatively using signals such as fork/mirror status and similarity/deduplication metadata. Avoid strong claims about conceptual originality without evidence.

## 11. Penalties

Initial policy candidates:

- fork/mirror: up to `-30`
- prolonged inactivity: up to `-20`
- unclear/missing license: up to `-10`
- suspicious star anomaly: up to `-30`
- nearly empty documentation: up to `-10`
- duplicate/repackaged candidate event: up to `-15`

Penalties must be explainable and capped.

## 12. Star anomaly detector

Treat suspicious growth as a review signal, not an accusation of manipulation.

Use neutral internal states such as:

- `NORMAL`
- `ANOMALOUS`
- `INSUFFICIENT_DATA`

Do not publicly state that a project bought/faked stars without strong independent evidence.

## 13. Editorial independence

The following are forbidden score inputs:

- sponsorship/payment;
- OUTSCAN CTA eligibility;
- affiliate potential;
- advertising campaign state.
