# Editorial Pipeline — Vibe Radar

## 1. State flow

```text
DISCOVERED
→ SCORED
→ CANDIDATE
→ ANALYSIS_PENDING
→ REVIEW
→ APPROVED
→ PUBLICATION_PENDING
→ PUBLISHED
```

Alternative terminal/side states:

- `WATCHING`
- `REJECTED`
- `ANALYSIS_FAILED`
- `PUBLICATION_FAILED`
- `EXPIRED`

## 2. Candidate creation

Candidate policy is deterministic and configurable. It may consider:

- VIBE SCORE threshold;
- score acceleration/change;
- repository dedupe window;
- recent publication history;
- important release event;
- category quotas to avoid a one-topic feed.

## 3. Editorial review

Private Telegram editor card should show enough evidence to make a quick decision:

- repository/project;
- VIBE SCORE and breakdown summary;
- stars and recent growth;
- repository age;
- relevant metadata;
- AI summary;
- limitations/uncertainty;
- source link.

Actions:

- `Publish/Approve`
- `Watch`
- `Reject`

The current implementation validates callbacks in the server boundary, checks the configured editor allow-list independently, and applies the decision only from `CANDIDATE` or `REVIEW`. Each accepted transition creates an append-only editorial decision record.

## 3a. Review dispatch lifecycle (Stage 07)

Candidate selection loads the latest score/confidence per project, reconstructs the persisted breakdown/evidence without manufacturing values, and skips rejected threshold decisions before any persistence. Candidates are created with `getOrCreateCandidate` on the canonical `dedupe_key` (`INSERT ... ON CONFLICT DO NOTHING` + lookup; never a synthetic ID).

Dispatch is claimed atomically in `editorial_review_dispatches` (`UNIQUE(candidate_id)`): only the claim owner calls Telegram. `SENT` dispatches never resend; a `PENDING` row owned by another worker is not sent concurrently. `FAILED` rows retry only through an atomic conditional re-claim (`UPDATE ... WHERE status='FAILED' AND attempt_count=? RETURNING`) within a bounded attempt budget, so two workers racing a retry still produce a single send. On provider success the `providerMessageId` is persisted and the candidate moves to `REVIEW` afterwards in one transaction; on send failure the dispatch records a safe error code and the candidate stays `CANDIDATE`.

Provider send errors and post-delivery DB finalization errors are strictly separated. If finalization fails after confirmed Telegram delivery, the dispatch is NOT marked `FAILED`, is NOT classified as a provider error, and does NOT resend automatically; it keeps a `FINALIZATION_FAILED` reconciliation marker and stays non-retriable until reconciled, because the provider side effect may already exist. Stage 09 exposes such dispatch and publication rows through read-only reconciliation visibility; reconciliation automation that mutates provider state remains deferred.

Editor cards are projected only from persisted data (project name, provider URL, validated analysis summary, persisted score/confidence) via `renderEditorCard`, so HTML escaping is preserved and nothing is fabricated. Missing content produces a deterministic skip reason instead of a dispatch.

External-delivery timeout ambiguity: a Telegram timeout after the provider accepted the message can leave delivery state unknown. The lifecycle therefore claims at-most-once send attempts per claim owner with bounded retries, and never claims exactly-once delivery across the external Telegram boundary. Candidate creation follows the same discipline: concurrent `getOrCreateCandidate` calls on one `dedupe_key` return the same row (exactly one insert wins; losers re-read), and no artificial IDs are ever generated.

## 4. Authorization

Editor actions must be accepted only from configured trusted editor identities.

Telegram callback payload alone is not authorization.

## 5. Idempotent publishing

Publication must use a deterministic unique idempotency key, for example derived from:

- candidate/event identity;
- channel;
- content version.

A duplicate callback or retry must return the existing publication outcome rather than post twice.

## 5a. Approved publication lifecycle (Stage 08)

Publication accepts identity only: `publishApprovedCandidate(candidateId)`.
The service derives approval from PostgreSQL (`candidate.status ===
APPROVED` plus the latest APPROVE decision for that candidate); caller input
can never authorize publication or supply content, HTML, channels, or a
foreign decision. The destination is always the configured public channel,
never the private editor chat.

Idempotency is `candidate + channel + contentVersion`. The first claim
(`INSERT ... ON CONFLICT DO NOTHING`) elects one owner; `published` rows
never resend; foreign `pending` rows are busy; `failed` rows retry only
through an atomic conditional re-claim republishing the persisted snapshot.
Provider send and DB finalization are strictly separated with a
`finalization_failed` reconciliation outcome that never resends
automatically. Timeout ambiguity follows the Stage 07 policy: duplicate
prevention wins over blind retry, and exactly-once delivery is not claimed.

## 6. Repeat coverage

Avoid republishing the same project as if it were new within a configurable dedupe window, unless a new editorial event exists, such as:

- major release;
- renewed unusual growth;
- meaningful new capability;
- follow-up `WATCH` story.

The content should acknowledge prior coverage where known.

## 7. Failure handling

Provider errors remain retryable within bounded policy. Repeated failure becomes `PUBLICATION_FAILED` and requires explicit follow-up; never silently drop or duplicate content.
