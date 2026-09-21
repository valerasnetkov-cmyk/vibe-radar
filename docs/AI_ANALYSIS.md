# AI Analysis — Vibe Radar

## 1. Role of AI

AI assists research, editorial understanding, and copy preparation after deterministic discovery/scoring. It consumes a bounded evidence package and does not decide authorization or publication.

## 2. Inputs

Use a bounded projection such as:

- repository name/description;
- selected topics/language/license metadata;
- VIBE SCORE breakdown;
- verified or pending `Claim` records;
- linked `EvidenceItem` records with trust tier and timestamps;
- bounded README/release excerpts only when needed to verify author claims;
- known project history from VibeRadar;
- explicit contradiction/missing-evidence flags.

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
  "evidence_refs": ["claim-or-evidence-id"],
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

- `research_run_id`;
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
- avoid open-ended agent loops in the MVP;
- keep optional external agent runtimes outside scoring/editorial authority.

## 8. Fact discipline

Generated editorial copy must distinguish:

- GitHub/provider facts;
- project-author claims from README/docs;
- Vibe Radar-derived metrics;
- editorial interpretation.

Do not invent compatibility, performance, security, licensing, or local/offline behavior.


## 9. Research workflow

```text
Scout -> Researcher -> Analyst -> Fact checker -> Editor
```

These are responsibilities, not a requirement for five autonomous agents. The MVP may implement them as deterministic application steps plus one bounded model call.

- **Scout** identifies what needs verification.
- **Researcher** assembles the bounded evidence package.
- **Analyst** explains significance and use cases.
- **Fact checker** resolves factual statements to stored claims/evidence and flags contradictions.
- **Editor** is a trusted human who approves/rejects the candidate.

A future Agent Lab may experiment with Hermes Agent, DeepSeek Harness, Ruflo, or other runtimes. Such experiments must return validated structured results through the normal application boundary and cannot write scores, approve candidates, or publish directly.

See `docs/EVIDENCE_MODEL.md` and `docs/REFERENCE_REPOSITORIES.md`.
