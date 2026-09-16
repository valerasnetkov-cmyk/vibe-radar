# AI Analysis — Vibe Radar

## 1. Role of AI

AI assists editorial understanding and copy preparation after deterministic discovery/scoring. It does not decide authorization or publication.

## 2. Inputs

Use a bounded projection such as:

- repository name/description;
- selected topics/language/license metadata;
- VIBE SCORE breakdown;
- bounded README excerpt or sanitized text representation;
- bounded release notes excerpt;
- known project history from Vibe Radar.

Do not provide secrets, infrastructure credentials, or open-ended tools.

## 3. External content is untrusted

README/release text may contain prompt injection. The model must be instructed and architecturally constrained to treat it as quoted source material only.

Prompting is not the security boundary. The security boundary is that the model has no privileged actions and its output is validated as data.

## 4. Structured output

Initial schema concept:

```json
{
  "summary": "string",
  "why_interesting": "string",
  "use_cases": ["string"],
  "audience": ["string"],
  "limitations": ["string"],
  "categories": ["string"],
  "content_angles": ["string"],
  "outscan_relevance": "NONE | SOFT_CTA | DEPLOY_CTA | OUTSCAN_CHECK"
}
```

Set strict length/count limits for every field.

## 5. Validation

On malformed output:

- reject the output;
- optionally retry within a bounded retry budget;
- otherwise mark `ANALYSIS_FAILED`;
- never publish automatically as a fallback.

## 6. Provenance

Persist:

- analysis version;
- prompt version;
- model/provider identifier;
- timestamp;
- bounded token/cost metrics;
- validation status.

## 7. Cost controls

- analyze only a small top candidate subset;
- set input/output token limits;
- set daily/global budget/circuit breaker;
- cap retries;
- avoid agent loops.

## 8. Fact discipline

Generated editorial copy must distinguish:

- GitHub/provider facts;
- project-author claims from README/docs;
- Vibe Radar-derived metrics;
- editorial interpretation.

Do not invent compatibility, performance, security, licensing, or local/offline behavior.
