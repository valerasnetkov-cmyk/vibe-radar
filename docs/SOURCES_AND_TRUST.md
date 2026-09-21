# Sources and Trust — VibeRadar

## Purpose

VibeRadar separates discovery from verification. A source may be useful for detecting a signal without being sufficient to establish a fact.

## Source tiers

### Tier A — primary evidence

Use for factual claims wherever available:

- GitHub repository metadata/API
- releases and changelogs
- official project documentation
- official vendor/platform documentation
- first-party engineering announcements

### Tier B — strong secondary confirmation

Use for trend confirmation and context:

- Product Hunt launch pages
- Y Combinator company material
- major platform engineering publications
- reputable technical media with attributable reporting

### Tier C — community evidence

Use for discovery, usage evidence, and sentiment, but not as sole confirmation of hard facts:

- Hacker News
- Reddit
- Habr
- specialist communities/forums

### Tier D — weak/early signal

Use only for early discovery unless independently confirmed:

- X/social posts
- Telegram posts
- marketing claims
- unattributed reposts

## Evidence rules

1. A social/community post may create a `Signal`, but cannot by itself establish a high-confidence factual claim.
2. Project metadata should be derived from primary sources when possible.
3. AI summaries must preserve links/identifiers to supporting evidence.
4. Conflicting sources reduce confidence and must not be silently reconciled by the model.
5. Missing evidence reduces confidence rather than being filled with assumptions.
6. Generated product opportunities are explicitly analytical outputs, not source facts.
7. Every factual statement intended for publication should resolve to one or more stored `Claim`/`EvidenceItem` relations.
8. Reposts, forks, mirrors, and syndicated copies must not be counted as independent confirmation merely because they have different URLs.
9. Contradicting evidence is preserved and surfaced; it is never silently deleted to make a claim look cleaner.

## Claim-level evidence

Use the following separation:

```text
SourceEvent -> EvidenceItem -> Claim -> Verification
                    \-> ResearchRun lineage
```

An `EvidenceItem` records what was observed. A `Claim` records the statement being evaluated. The relation states whether the evidence supports, contradicts, or only contextualizes the claim.

Use `independence_group` to prevent the same origin from being counted repeatedly through mirrors/forks/reposts.

## Provenance

Every normalized observation/evidence item should preserve:

- source type
- source URL or stable source identifier
- retrieval timestamp
- observed timestamp when different
- raw/normalized payload reference
- parser/provider version where relevant
- content hash/reference where useful
- research-run linkage when the evidence was collected for verification

## Confidence inputs

Confidence may increase with:

- multiple independent sources
- primary-source confirmation
- sufficient longitudinal history
- consistent metadata across observations
- reproducible growth metrics

Confidence decreases with:

- only one weak source
- very young project with little history
- contradictory evidence
- inaccessible/closed metrics
- suspicious or discontinuous growth
- model-only inference

## Editorial trust boundary

The editor must be able to distinguish:

- observed facts
- calculated metrics
- model classification
- model interpretation
- speculative opportunity

The UI/content model must not collapse these into a single undifferentiated narrative.


## ResearchRun reproducibility

For candidate research, preserve enough context to explain later:

- which project/signal was researched;
- which snapshots/source events were available;
- which claims were created or rechecked;
- which model/prompt/provider version was used, if any;
- which evidence supported or contradicted the final copy;
- whether the run completed, failed, or was superseded.

ResearchRun lineage improves auditability but does not increase confidence by itself.

See `docs/EVIDENCE_MODEL.md`.
