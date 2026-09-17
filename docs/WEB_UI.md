# Web UI and Visual System — VibeRadar

## 1. Art direction

VibeRadar uses **strict light minimalism**.

The interface must feel like a precise technology-intelligence product, not an AI landing-page template.

Keywords:

```text
light
editorial
data-first
precise
flat
quiet
technical
high-information
minimal
```

## 2. Non-negotiable visual rules

Do not use as default UI language:

- dark theme in MVP;
- decorative gradients;
- glassmorphism;
- glow/neon effects;
- large blurred color blobs;
- decorative 3D/AI illustrations;
- excessive rounded cards;
- shadows on normal panels/cards;
- floating badge clutter;
- emoji as final interface icons;
- fake live numbers or placeholder statistics.

Use hierarchy through typography, spacing, alignment, rules, and real data.

## 3. Color tokens

Recommended initial tokens:

```css
--bg: #F8F9FB;
--surface: #FFFFFF;
--text: #101522;
--text-muted: #667085;
--text-soft: #8B94A5;
--border: #E3E7EE;
--border-strong: #CDD3DE;
--accent: #4F67FF;
--accent-soft: #EEF1FF;
--positive: #168A5B;
--warning: #A96B16;
--danger: #BC3F3F;
```

Rules:

- white/off-white carries most of the composition;
- `--accent` is reserved for selection, links, active data and primary actions;
- status colors communicate state only;
- do not introduce extra purple/blue gradients for decoration.

## 4. Typography

Primary typeface: Inter or a metrically stable system-sans fallback.

Suggested scale:

- Display: 52/56, 600
- H1: 40/46, 600
- H2: 28/34, 600
- H3: 20/26, 600
- Body: 16/24, 400
- Small: 14/20, 400
- Meta: 12/16, 500

Avoid extreme font weights and marketing-style oversized hero type.

Numbers/metrics should use tabular numerals where available.

## 5. Layout

Desktop:

- content max width: 1280px;
- outer horizontal padding: 32px;
- 12-column grid;
- base spacing unit: 4px;
- common section rhythm: 24 / 32 / 48px.

Tablet:

- outer padding: 24px;
- 8-column grid.

Mobile:

- outer padding: 16px;
- one-column flow;
- no horizontal page scroll;
- minimum touch target about 44px.

## 6. Surfaces

Normal content grouping:

- background or whitespace first;
- 1px border when a boundary is needed;
- no box-shadow;
- radius 8px for controls;
- radius 10-12px for data panels where grouping is necessary.

Do not put every metric or paragraph into its own card.

Status chips may use pill geometry because state is semantic.

## 7. Signature visual language

VibeRadar's distinctiveness comes from **radar/data notation**, not decoration:

- thin concentric/radial motif may appear sparingly in the logo or empty/data states;
- thin growth lines/sparklines;
- precise baseline/grid rules;
- small status markers;
- clear score/version/source notation.

No glow around radar marks.

## 8. Home page composition

The home page is a product surface, not a conventional marketing landing page.

Above the fold:

1. compact header/navigation;
2. title and one-sentence product promise;
3. inline current summary metrics separated by rules;
4. real `Растёт сейчас` radar list/table.

Canonical headline:

**Что растёт. Почему это важно. Что можно построить.**

Do not place a decorative product mockup beside the headline.

### Main radar presentation

Prefer a structured row/list on desktop:

```text
PROJECT       STATUS      VIBE   24H/7D     BUILD        CONFIDENCE
OpenCode      RISING      87     +320%      SMALL_TEAM   HIGH
...
```

Each row can contain one restrained sparkline.

On mobile, each row becomes a stacked record, not a floating shadow card.

## 9. Home sections

MVP:

- current radar
- fresh signals
- recently published analyses
- methodology entry point

Post-MVP:

- product mechanics
- opportunities
- security context
- weekly radar

Do not show empty future sections.

## 10. Project page

Top summary should expose facts before prose:

- project name
- category
- source link
- VIBE SCORE
- score version
- reach
- momentum
- confidence
- buildability
- last updated

Then:

1. What it is
2. Why now
3. Growth history
4. Evidence
5. Buildability
6. Risks/limitations
7. What could be built
8. related signals/mechanics when available

Avoid a giant donut chart as the primary score representation. Prefer a large number plus a simple linear/component breakdown.

## 11. Navigation

MVP navigation should only expose working destinations:

- Радар
- Методология
- Telegram external link

Add `Тренды`, `Механики`, `Возможности`, `Безопасность` only when those surfaces contain real data.

No disabled fake navigation.

## 12. Components

Initial reusable components:

- `SiteHeader`
- `SiteFooter`
- `MetricStrip`
- `RadarTable`
- `RadarRow`
- `StatusLabel`
- `ScoreValue`
- `ConfidenceValue`
- `BuildabilityLabel`
- `Sparkline`
- `EvidenceList`
- `SourceLink`
- `EmptyState`
- `ErrorState`

Keep data fetching out of presentational components.

## 13. Interaction

Use motion only when it explains state.

- no ambient floating animation;
- no looping glow;
- no parallax;
- hover may clarify a row but cannot reveal essential data;
- keyboard focus must be visible;
- reduced-motion preferences must be respected.

## 14. Accessibility

Minimum:

- semantic headings and landmarks;
- visible keyboard focus;
- AA contrast for text/controls;
- status is never communicated by color alone;
- charts include textual values/summary;
- links describe destination;
- touch targets remain usable on mobile.

## 15. Content integrity

Every visible metric must be real or explicitly labeled as example/demo.

Do not ship:

- fake star growth;
- invented user counts;
- placeholder VIBE scores presented as live;
- AI-generated logos/screenshots representing external projects without disclosure.

## 16. Visual acceptance gate

Before UI work is accepted, verify representative desktop and mobile views for:

- no dark-theme leakage;
- no decorative gradients/glows;
- no default card wall;
- no unnecessary shadows;
- balanced type wrapping;
- consistent borders/radii;
- no clipped labels/numbers;
- readable data density;
- correct loading/empty/error states.
