# TASK-1329 — AI Visibility Report Visual Editorial Polish

## Meta

- Status: `draft`
- Owner task: `TASK-1329`
- Product Design asset: `none`
- Intended consumers: public lead-magnet report at `think.efeoncepro.com/brand-visibility/r/[token]`, future reusable evidence blocks for AI Visibility / SEO reports
- Copy source: local `efeonce-think` report copy first, with follow-up to centralize reusable copy when the hub folds into the broader public-site rail
- Primitive decision: extend/reuse existing hub primitives; do not rewrite `MaturityLadder`
- UI ready target: `no`

## Brief

- Primary user: commercial prospect or executive opening a tokenized AI Visibility diagnostic.
- User moment: after the report now contains real evidence from TASK-1328, but before deeper sales follow-up.
- Job to be done: scan the report, trust the evidence, understand what was measured, and see a polished public experience worthy of sharing internally.
- Primary decision signal: "This diagnostic is credible, clear, and actionable enough to book the next conversation."
- Non-goals:
  - No backend/model changes.
  - No scoring, readiness, provider, category or source derivation in Astro.
  - No full landing page work; TASK-1327 owns `/brand-visibility`.
  - No rewrite of `MaturityLadder`.

## Layout Skeleton

| Region | Purpose | Direction | Data source |
|---|---|---|---|
| Hero / verdict | Preserve the approved score headline while improving scan path into evidence | Reduce competing density; strengthen method/context proximity | `model.score`, `model.levels`, `header` |
| Evidence intro | Help readers understand why the report has multiple evidence blocks | Short editorial bridge, not a card wrapper | Existing `model` fields |
| Engine coverage | Make provider denominators easier to compare | Refine table/bars, labels and compact/mobile state | `model.engineSnapshot` |
| Source evidence | Make cited-domain proof feel trustworthy and bounded | Stronger hierarchy, domain-only rows, no full URLs | `model.citationSourceBreakdown` |
| Category association | Keep conditional behavior but make the measured state clearer | Show only if data exists; otherwise omit cleanly | `model.categoryTaxonomySummary` |
| Readiness / operability | Connect `Be Actionable` to what the site enables | Better explanatory hierarchy and status language | `model.readiness` |
| Existing analysis + CTA | Make recommendations and next step feel like a natural continuation | Reduce visual jumps, preserve CTA | `model.recommendations`, existing CTA |

## Copy Ledger

| Copy id | Region | Intent | Notes |
|---|---|---|---|
| `report.method.bridge` | Evidence intro | Explain measured evidence in one short paragraph | Avoid "la IA" as generic subject. |
| `report.engineCoverage.helper` | Engine coverage | Explain present/resolved denominators | Must handle zero denominator honestly. |
| `report.sources.helper` | Source evidence | Explain domain-level citation proof | Domain-only, no full URLs. |
| `report.readiness.helper` | Readiness | Explain operability/citability without confusing it with visibility score | Keep distinct from general score. |
| `report.category.helper` | Category | Explain category only when measured | No copy when `unknown`/empty. |

## State Copy

| State | Behavior |
|---|---|
| measured | Show section with confident but bounded copy. |
| partial | Keep section visible with measured/partial status if model provides partial data. |
| empty | Omit optional section or show compact neutral copy only when omission would be confusing. |
| error/degraded | Do not expose raw errors; preserve report. |
| mobile | Keep evidence scan-friendly without horizontal page scroll. |

## Accessibility Contract

- Preserve one `h1` in hero; evidence groups use ordered headings.
- Evidence tables/rows must remain readable without color.
- Any icon-only affordance needs accessible label.
- Mobile 390px must not require page horizontal scroll.
- Focus states must remain visible for links, CTA and any info control.

## Implementation Mapping

- Route / surface: `/Users/jreye/Documents/efeonce-think/src/pages/brand-visibility/r/[token].astro`
- Existing primitives:
  - `/Users/jreye/Documents/efeonce-think/src/components/primitives/MaturityLadder.astro`
  - `/Users/jreye/Documents/efeonce-think/src/components/EngineMark.astro`
  - `/Users/jreye/Documents/efeonce-think/src/components/CompetitiveBenchmark.astro`
- Candidate extraction:
  - evidence summary strip
  - engine coverage block
  - cited-domain evidence block
  - readiness block
  - optional category block
- Copy source:
  - local hub copy for this task
  - no hardcoded reusable Greenhouse portal copy unless the block is moved into `greenhouse-eo`
- Data contract:
  - `GET /api/public/growth/ai-visibility/report/[token]`
  - consume `model` only for report semantics
- API parity:
  - no business action introduced
  - CTA remains existing link/action behavior
- Access:
  - public tokenized report, no session
- States to implement:
  - measured, partial, omitted/empty, degraded, long domain list, mobile compact

## GVC Scenario Plan

- Scenario file: use external Playwright/capture script in `/Users/jreye/Documents/efeonce-think` or add a durable scenario there if the repo has a scenario runner.
- Routes:
  - local preview report token fixture
  - production/staging token only after release or preview deploy is available
- Viewports:
  - desktop `1440x1000`
  - laptop `1280x900`
  - mobile `390x844`
- Required captures:
  - full page
  - hero + method bridge
  - engine coverage
  - source evidence
  - readiness
  - CTA / lower report
- Required `data-capture` markers:
  - `report-hero`
  - `report-engine-coverage`
  - `report-source-evidence`
  - `report-readiness`
  - `report-ladder`
  - `report-category-association` only when the fixture has measured category data
- Assertions:
  - no forbidden raw strings/prompts/URLs
  - no page horizontal overflow at desktop or mobile 390
  - category block absent when category is `unknown` with empty categories
  - ladder still visible and not visually degraded

## Design Decision Log

- Decision: polish the existing evidence-rich report before adding new data or changing scoring.
- Alternatives considered:
  - Create a new backend/report model task: rejected because TASK-1328 already shipped the public-safe data contract.
  - Redesign the full report from scratch: rejected because the ladder and enterprise shell were already approved in TASK-1325/TASK-1328.
  - Build a generic primitive library immediately: deferred; extract only if the polish creates repeated blocks worth reusing.
- Why this pattern:
  - The user asked whether visual verification was enough and then requested a follow-up task; the gap is presentation quality and scan clarity, not data correctness.
- Reuse / extend / new primitive:
  - Reuse `MaturityLadder`.
  - Extend the report sections.
  - Create a reusable evidence component only if it removes duplication inside `efeonce-think`.
- Open risks:
  - External hub has a different stack from Greenhouse portal; do not force Vuexy/MUI primitives into Astro.
  - Visual polish must not hide honest missing-data states.

## Acceptance Checklist

- [ ] Implementation mapping names route, primitives, data contract and states.
- [ ] GVC scenario plan covers desktop, laptop and mobile 390.
- [ ] Design decision log explains why this is polish/extraction, not backend/model work.
- [ ] Copy ledger covers every new visible explanatory label.
- [ ] Category unknown/empty remains omitted or neutral.
- [ ] No full citation URLs, raw prompts, provider answers or internal findings become visible.
