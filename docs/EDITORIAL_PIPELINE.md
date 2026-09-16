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

## 4. Authorization

Editor actions must be accepted only from configured trusted editor identities.

Telegram callback payload alone is not authorization.

## 5. Idempotent publishing

Publication must use a deterministic unique idempotency key, for example derived from:

- candidate/event identity;
- channel;
- content version.

A duplicate callback or retry must return the existing publication outcome rather than post twice.

## 6. Repeat coverage

Avoid republishing the same project as if it were new within a configurable dedupe window, unless a new editorial event exists, such as:

- major release;
- renewed unusual growth;
- meaningful new capability;
- follow-up `WATCH` story.

The content should acknowledge prior coverage where known.

## 7. Failure handling

Provider errors remain retryable within bounded policy. Repeated failure becomes `PUBLICATION_FAILED` and requires explicit follow-up; never silently drop or duplicate content.
