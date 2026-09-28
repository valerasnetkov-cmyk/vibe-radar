# Technology Radar — VibeRadar

## Purpose

Convert external GitHub discovery into an actionable product/architecture research backlog without turning trending projects into dependencies by default.

This document complements `REFERENCE_REPOSITORIES.md`.

Rule:

> VibeRadar may learn from fast-growing projects immediately, but adopts a runtime dependency only after a measured bottleneck and an explicit adoption gate.

## Priority tracks

### 1. Research memory and intelligence

#### Hindsight

Repository: https://github.com/vectorize-io/hindsight

Status: `RESEARCH_NOW`

Why it matters:
- memory is organized as facts, experiences, observations and derived models;
- retrieval can combine semantic, lexical, graph and temporal context;
- the pattern fits longitudinal technology intelligence better than plain RAG.

Potential VibeRadar use:
```text
Repository / source events
  -> EvidenceItems
  -> ResearchRuns
  -> Observations
  -> trend hypotheses
  -> confirmation / contradiction
  -> living project knowledge
```

Pilot goal:
- compare Hindsight-style memory with native PostgreSQL ResearchRun/Claim/Evidence history;
- measure whether it improves weekly synthesis and follow-up research;
- keep canonical score, evidence and publication state in VibeRadar.

#### OpenResearch

Repository: https://github.com/alphaXiv/OpenResearch

Status: `ADOPT_PATTERN_NOW`

Keep the existing VibeRadar-native implementation of:
- reproducible research lineage;
- run history;
- evidence attached to claims;
- separation between observations and conclusions.

#### Company Brain

Repository: https://github.com/supermemoryai/company-brain

Status: `REFERENCE_ONLY`

Relevant pattern:
- multiple operational sources become one searchable team memory.

Possible later application:
- editor decisions;
- GitHub research;
- publication history;
- product notes;
- opportunity follow-ups.

Do not introduce a second system of record.

### 2. Agent / research orchestration

#### Hermes Agent

Repository: https://github.com/NousResearch/hermes-agent

Status: `PILOT_LATER`

Potential role:
- scheduled research operator;
- Telegram-first operational assistant;
- research/editorial coordination;
- isolated VibeRadar profile with its own skills, memory, MCP and credentials.

Native VibeRadar database and editorial gates remain authoritative.

#### DeepSeek Harness

Repository: https://github.com/deepseek-ai/deepseek-harness

Status: `PILOT_LATER`

Potential role:
- isolated Agent Lab;
- researcher / skeptic / reviewer workflows;
- structured experiments.

Keep VibeRadar separate from OUTSCAN and other projects at the runtime/profile level. Do not share unrestricted MCP/tool visibility across projects.

#### Paperclip / OpenRig

Repositories:
- https://github.com/paperclipai/paperclip
- https://github.com/mvschwarz/openrig

Status: `REFERENCE_ONLY`

Patterns:
- agent roles;
- task allocation;
- budgets;
- audit;
- human approvals;
- lightweight multi-agent coordination.

Do not add a second production task/state database unless the native worker architecture becomes a measured bottleneck.

### 3. Browser and source acquisition

#### BrowserSkill / browser-use patterns

Status: `PILOT_LATER`

Use case:
- research sources that lack a stable API;
- evidence capture from dynamic sites;
- browser-assisted validation.

Security boundary:
- browser content is untrusted data;
- no discovered instruction can change score or publication policy;
- credentials are scoped per source;
- browsing is separate from editorial authority.

### 4. Media generation

Goal:
`approved ContentPiece -> deterministic visual/video artifact -> machine QA -> human review -> publication`

#### video-use

Repository: https://github.com/browser-use/video-use

Status: `PILOT_LATER`

Patterns:
- transcript + selected visual context instead of raw frame overload;
- code-assisted editing;
- subtitle/overlay automation.

#### onetake

Repository: https://github.com/feitangyuan/onetake

Status: `REFERENCE_ONLY`

Patterns:
- continuous motion storytelling;
- machine visual oracle before human review;
- regenerate from deterministic scene definitions.

Check current license before any code reuse or commercial integration.

#### ShipVideo / LaunchVideo

Repository: https://github.com/diggerhq/shipvideo

Status: `PILOT_LATER`

Pattern:
`product/story -> HTML motion scene -> deterministic Chromium render -> ffmpeg -> MP4`

This is a strong fit for technical explainers because output is versionable and brand-controlled.

#### pdoom-video

Repository: https://github.com/mexicat/pdoom-video

Status: `REFERENCE_ONLY`

Patterns:
- audio analysis -> deterministic timeline;
- Three.js/browser render;
- reproducible video-as-code.

#### Lemo Opuscar

Repository: https://github.com/lemomo-ai/lemo-opuscar

Status: `REFERENCE_ONLY`

Adopt the pattern, not necessarily the implementation:
- reusable `STYLE.md` / director package;
- code-rendered style examples;
- explicit motion/composition rules.

Potential native VibeRadar asset:
`VIBERADAR_STYLE.md` describing typography, motion, transitions, chart treatment and source attribution.

#### Anidoodle / procedural-film

Repositories:
- https://github.com/alexgreensh/anidoodle
- https://github.com/kuhnhomeuk-cell/procedural-film

Status: `REFERENCE_ONLY`

Relevant for deterministic low-cost technical visuals where full generative video is unnecessary.

### 5. Agent-native UI and authoring

#### BuilderIO/agent-native

Repository: https://github.com/BuilderIO/agent-native

Status: `REFERENCE_ONLY`

Pattern:
- one typed action can serve both the agent and the product UI;
- user sees a purpose-built surface rather than a generic chat transcript.

Potential VibeRadar use:
- research review;
- watchlists;
- opportunity review;
- source comparison;
- approval forms.

#### Shapeshift

Repository: https://github.com/anishfn/shapeshift

Status: `REFERENCE_ONLY`

Pattern:
- intent changes the shape of the interface.

Use only if a concrete VibeRadar workflow benefits from task-specific UI generation.

### 6. Developer workflow

#### Gortex / jevgrep

Repositories:
- https://github.com/zzet/gortex
- https://github.com/dzhng/jevgrep

Status: `PILOT_NOW_INTERNAL`

Goal:
- reduce context waste in Codex;
- improve code-location discovery;
- measure impact on task quality and token usage.

No product dependency implied.

#### Whiteboard / Reladraw

Repositories:
- https://github.com/devdotfast/whiteboard
- https://github.com/reladraw/reladraw

Status: `PILOT_NOW_INTERNAL`

Use:
- architecture discussions;
- semantic diffs;
- version-controlled diagrams.

### 7. Deployment automation

#### GoLive

Repository: https://github.com/mikehasa/golive-skill

Status: `PILOT_LATER`

Potential use:
- low-risk VibeRadar/studio deployment experiments using:
  `detect -> plan -> approve -> apply -> verify`.

Do not give an agent unrestricted production infrastructure credentials. Production VibeRadar deployment remains governed by the project's own operations contract.

## Product opportunities discovered from the radar

### Personal Technology Intelligence

Future VibeRadar Intelligence:
- persistent watchlists;
- evidence-backed evolving project summaries;
- follow-up questions;
- change alerts;
- saved opportunities.

### Research Memory

A project page should eventually explain not only the current state, but:
- what changed;
- what VibeRadar believed before;
- what new evidence changed that belief;
- which claims remain uncertain.

### Media Factory

Future Phase C candidate:
```text
Approved ContentPiece
  -> VibeRadar style package
  -> storyboard
  -> deterministic renderer
  -> automated visual QA
  -> human review
  -> Telegram / Instagram / Shorts
```

### Agent-facing Intelligence

Future API/MCP should expose bounded, source-backed intelligence:
- project status;
- growth signals;
- claims/evidence;
- opportunity hypotheses;
- watchlist changes.

Never expose editorial authority or raw secrets through MCP.

## Evaluation metrics

Any pilot must be compared with the native path.

Research:
- useful evidence per research run;
- false/unsupported claim rate;
- time to verified conclusion;
- follow-up recall quality.

Agent operations:
- task completion rate;
- human interventions;
- cost;
- latency;
- failure/retry rate.

Media:
- production time;
- manual correction count;
- brand consistency;
- factual/source attribution correctness.

Developer tools:
- task success rate;
- context/token usage;
- incorrect-file edits;
- review time.

## Licensing rule

Before reusing code or bundling a third-party project:
- verify the exact current upstream license;
- check commercial restrictions and copyleft obligations;
- record the decision;
- prefer independent implementation of patterns when licensing is restrictive or unclear.

## Review cadence

Update from the weekly GitHub Radar, not every daily spike.

Promote a project only when:
- growth remains meaningful;
- the project stays active;
- a VibeRadar bottleneck or product opportunity exists;
- the adoption gate is clear.

Remove stale references that no longer affect decisions.
