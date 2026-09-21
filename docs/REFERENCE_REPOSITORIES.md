# Reference Repositories and Adoption Gates — VibeRadar

## Purpose

VibeRadar regularly discovers strong open-source patterns that could improve the product.

The rule is:

> learn from external projects early, depend on them only after a measured need.

External projects are references or optional adapters. PostgreSQL and VibeRadar application logic remain the system of record.

## Status vocabulary

- `ADOPT_PATTERN_NOW` — adopt the architectural principle now; no runtime dependency implied.
- `PILOT_LATER` — candidate for an isolated experiment after readiness gates.
- `REFERENCE_ONLY` — useful design/operations pattern; no planned integration.
- `DEFER` — do not spend implementation time until a measurable trigger appears.

## Current register

### alphaXiv/OpenResearch

Repository: https://github.com/alphaXiv/OpenResearch

Status: `ADOPT_PATTERN_NOW`

Adopt now:

- reproducible ResearchRun lineage;
- evidence kept with the work that produced it;
- immutable historical run/experiment thinking;
- separation between run history and conclusions.

VibeRadar implements its own `ResearchRun -> Claim -> EvidenceItem -> Verification` model. OpenResearch is not a production dependency.

### NousResearch/hermes-agent

Repository: https://github.com/NousResearch/hermes-agent

Status: `PILOT_LATER`

Relevant patterns:

- messaging gateway including Telegram;
- scheduled automations;
- subagent delegation;
- provider/tool flexibility;
- persistent operator workflow.

Potential role: operator/control-plane experiment around research/editorial operations after the native pipeline works.

Hard boundaries:

- not the database/source of truth;
- no direct score mutation;
- no publication bypass;
- no unrestricted production credentials.

Pilot trigger: Stage 06 is stable and operational/editorial effort can be compared against the native worker/bot.

### deepseek-ai/deepseek-harness

Repository: https://github.com/deepseek-ai/deepseek-harness

Status: `PILOT_LATER`

Upstream currently describes the project as developer preview and explicitly warns about compatibility-breaking changes.

Potential role: isolated Agent Lab for repository research, skeptic/reviewer roles, opportunity analysis, and structured synthesis.

Hard boundaries:

- not a production dependency for VIBE SCORE, database state, editorial approval, or publishing;
- output returns through a validated VibeRadar schema.

Pilot trigger: Stage 06 exists and native analysis can be benchmarked against harness-assisted analysis.

### ruvnet/ruflo

Repository: https://github.com/ruvnet/ruflo

Status: `REFERENCE_ONLY`

Potential value:

- multi-agent orchestration/swarm patterns;
- parallelized agent work.

Decision: do not introduce until simpler approaches show an actual orchestration bottleneck. Benchmark only in an isolated sandbox/branch.

### diegosouzapw/OmniRoute

Repository: https://github.com/diegosouzapw/OmniRoute

Status: `DEFER`

Potential value:

- multi-provider gateway/routing;
- fallback and quota-aware selection;
- unified model access.

Decision: start with a small native `AIProvider` abstraction. Add routing only after at least two active providers create measurable availability, quality, quota, or cost-routing needs.

### strangedeev/youtube-automation-agent

Repository: https://github.com/strangedeev/youtube-automation-agent

Status: `REFERENCE_ONLY`

Patterns worth reusing later:

- explicit content stages;
- scheduled production;
- analytics feedback;
- review gate before publishing long-form content.

VibeRadar application: Phase C Reels/Shorts automation consumes only editor-approved `ContentPiece` records. Generated visual/video artifacts keep a review gate until quality is proven.

### paperclipai/paperclip

Repository: https://github.com/paperclipai/paperclip

Status: `REFERENCE_ONLY`

Patterns worth tracking:

- roles/responsibilities;
- budgets/cost controls;
- governance;
- auditability;
- human override.

Decision: useful for future Agent Lab/operations design, but not as a second production task/state database for VibeRadar core.

## Candidates not yet pinned

Working notes also mention:

- BrowserSkill/browser-worker patterns;
- Hypit/automated visual rendering;
- Cybermes-style deterministic security/analyst gates.

Do not add a runtime dependency or canonical link until the exact upstream project/component is identified and reviewed.

## Global adoption gates

### Product need

- solves a measured bottleneck;
- improves useful-signal rate, editorial time, reliability, or cost;
- is not added merely because it is fashionable.

### Architecture

- VibeRadar remains the system of record;
- adapter can be removed without data loss;
- deterministic scoring stays in native code;
- publication remains behind the trusted editorial gate.

### Security

- least-privilege credentials;
- bounded network/tool access;
- no execution of discovered repositories;
- no unrestricted database mutation;
- external content remains untrusted;
- clear secret/logging policy.

### Operations

- observable failures;
- bounded retries/timeouts;
- cost limits;
- version pinning where practical;
- documented upgrade/rollback path.

### Quality

- benchmark against the simpler native path;
- measure false claims/verification failures;
- measure editorial time saved;
- preserve reproducibility/provenance.

## Evaluation order

1. build native VibeRadar P0 pipeline;
2. adopt OpenResearch-inspired evidence/reproducibility concepts natively;
3. after Stage 06, consider a Hermes operational pilot;
4. benchmark DeepSeek Harness as an isolated Agent Lab;
5. use Ruflo only if orchestration complexity is actually demonstrated;
6. use OmniRoute only after multi-provider routing becomes operationally necessary;
7. automate visual/video channels only from approved content.
