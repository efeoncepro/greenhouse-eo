# Greenhouse Growth CTA & Popup Engine Architecture V1

> Tipo de documento: arquitectura de producto/plataforma  
> Status: Accepted direction — foundation runtime SHIPPED (TASK-1339, §23); renderer pendiente (TASK-1340)  
> Version: V1  
> Fecha: 2026-07-04  
> Owner: Product / Platform Architecture / Growth / Marketing Operations / CRO  
> ADR: `GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_DECISION_V1.md`  
> Domain: `growth` (`GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md`)  
> Runtime contract: `greenhouse-growth-cta-popup.v1` (planned)

## 1. Purpose

This document defines the target architecture for a Greenhouse-owned CTA and popup engine that can render high-quality conversion prompts across Greenhouse, Efeonce public site, Think and future surfaces.

Canonical flow:

```text
Greenhouse CTA definition
  -> published targeting + render contract
  -> portable renderer
  -> eligibility / priority / suppression
  -> GTM dataLayer event + Greenhouse event ledger
  -> governed action
  -> Growth Form / asset / Think tool / meeting / HubSpot handoff
```

The core decision:

```text
Greenhouse owns CTA policy, rendering contract, actions and evidence;
public surfaces host the prompt;
HubSpot/GTM/GA are destinations or measurement surfaces, not the source of truth.
```

## 2. Product thesis

CTAs and popups are not decorative marketing widgets. In Growth they are CRO primitives:

- lead magnet discovery and download;
- context-aware next step after public reports;
- route to Think tools;
- launch or embed Growth Forms;
- book meetings;
- capture campaign intent;
- test value proposition, social proof and friction reduction;
- preserve first-party conversion evidence before Commercial handoff.

The engine must support enterprise CRO without dark patterns. A good CTA reduces uncertainty, improves relevance, clarifies value and invites a useful next step. A bad CTA interrupts the user, inflates vanity metrics or burns trust.

## 3. Archetype

Primary archetype: **B2B SaaS multi-tenant + public acquisition surface**.

Dominant risk: internet-facing conversion prompts can degrade trust, privacy, accessibility and measurement quality if targeting, suppression and telemetry are page-local.

Secondary archetypes:

- **Headless content/public site**: renderers live in WordPress, Astro, Think and future runtimes.
- **Internal tool/admin**: operators author, review, publish, pause and inspect CTAs.
- **Event-driven/retry workflow**: actions and destination handoffs need audit, retries and reconciliation.
- **Experimentation platform**: variants require stable assignment and honest statistical interpretation.

## 4. System context

```mermaid
flowchart LR
  Operator["Efeonce operator"]
  GH["Greenhouse Growth<br/>CTA control plane"]
  Renderer["Portable CTA renderer<br/>Web Component / wrappers"]
  Visitor["Public visitor"]
  Surfaces["Host surfaces<br/>WordPress / Astro / Think / Greenhouse"]
  GTM["Google Tag Manager<br/>host dataLayer"]
  Forms["Growth Forms Engine"]
  Assets["Content assets<br/>ebooks / guides"]
  Think["Think tools"]
  HubSpot["HubSpot CRM / Meetings"]
  Commercial["Commercial<br/>qualified handoff"]
  Nexa["Nexa / future MCP<br/>same commands/readers"]

  Operator --> GH
  GH --> Renderer
  Visitor --> Surfaces
  Surfaces --> Renderer
  Renderer --> GTM
  Renderer --> GH
  GH --> Forms
  GH --> Assets
  GH --> Think
  GH --> HubSpot
  GH -. qualified .-> Commercial
  Nexa -. consumes .-> GH
```

## 5. Container view

```mermaid
flowchart TB
  subgraph Public["Host runtimes"]
    WP["WordPress wrapper"]
    Astro["Astro wrapper"]
    ThinkSurface["Think wrapper"]
    GHPreview["Greenhouse preview"]
    WC["CTA Web Component"]
  end

  subgraph Greenhouse["Greenhouse"]
    AdminUI["Admin Growth CTA UI"]
    PublicAPI["Public CTA API"]
    AdminAPI["Admin CTA API"]
    Readers["Readers<br/>published contract / reports / eligibility"]
    Commands["Commands<br/>author / publish / record / route / pause"]
    Compiler["Policy compiler<br/>render + targeting + telemetry"]
    Arbiter["Eligibility + priority arbiter"]
    Suppression["Suppression + frequency cap"]
    Ledger["Exposure / interaction / conversion ledger"]
    Router["Action router"]
    Experiment["Variant assignment"]
    Store["Postgres greenhouse_growth<br/>definitions / versions / events"]
    Signals["Reliability signals"]
    Audit["Audit / outbox"]
  end

  subgraph Destinations["Destinations"]
    Forms["Growth Forms"]
    Assets["Asset delivery"]
    ThinkTool["Think tool route"]
    Meeting["HubSpot Meetings"]
    CRM["HubSpot CRM adapters"]
    Future["Future destinations"]
  end

  WP --> WC
  Astro --> WC
  ThinkSurface --> WC
  GHPreview --> WC
  WC --> PublicAPI
  WC -->|"CustomEvent + dataLayer.push"| WP
  WC -->|"CustomEvent + dataLayer.push"| Astro
  WC -->|"CustomEvent + dataLayer.push"| ThinkSurface
  AdminUI --> AdminAPI
  PublicAPI --> Readers
  PublicAPI --> Commands
  AdminAPI --> Readers
  AdminAPI --> Commands
  Commands --> Compiler
  Readers --> Compiler
  Compiler --> Arbiter
  Arbiter --> Suppression
  Commands --> Ledger
  Commands --> Router
  Commands --> Experiment
  Router --> Forms
  Router --> Assets
  Router --> ThinkTool
  Router --> Meeting
  Router --> CRM
  Router -. future .-> Future
  Commands --> Audit
  Ledger --> Signals
```

## 6. Source-of-truth boundaries

| Concern | Source of truth | Notes |
| --- | --- | --- |
| Public page route/content | Host surface | WordPress/Astro/Think owns placement in the page, not CTA logic. |
| CTA definition/version | Greenhouse Growth | Copy refs, visual kind, placement, action, lifecycle. |
| Targeting/suppression policy | Greenhouse Growth | Compiled server-side; public renderer receives only safe rules. |
| Published render contract | Greenhouse Growth | Immutable browser-safe contract. |
| Portable renderer package | Greenhouse Growth | Framework-light; wrappers adapt host loading. |
| Form schema/submissions | Growth Forms | CTA can open/embed a form but never owns form fields/validation. |
| Internal conversion evidence | Greenhouse Growth | Exposure/interaction/action ledger. |
| GTM/GA4 events | Host GTM container | Measurement surface, not canonical policy. |
| CRM identity/lifecycle | HubSpot | Receives routed outcomes; does not own CTA engine. |
| Qualified revenue motion | `commercial` | Starts after explicit handoff/acceptance. |

## 7. Canonical placement

| Concern | Value |
| --- | --- |
| Module key | `growth` |
| Subdomain | `growth.cta` |
| PostgreSQL schema | `greenhouse_growth` |
| TypeScript root | `src/lib/growth/ctas/` |
| Public API family | `/api/public/growth/ctas/**` |
| Admin API family | `/api/admin/growth/ctas/**` |
| Admin UI family | `/growth/ctas` |
| Capability prefix | `growth.cta.*` |
| Event prefix | `growth.cta.*` |
| Signal prefix | `growth.cta.*` |
| Contract prefix | `greenhouse-growth-cta-popup-*` |

Do not place this under `public_site`, `commercial`, `platform` or `growth.forms`. Those are consumers/participants.

The versioned runtime contract id is `greenhouse-growth-cta-popup.v1`; `greenhouse-growth-cta-popup-*` is the contract family prefix. Both refer to the same contract lineage.

### 7.1 Full API Parity

The engine is designed as a governed capability, not a UI feature (`GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`, overlay #16). The canonical primitive lives in `src/lib/growth/ctas/` (readers + commands); the admin cockpit is one client of that primitive, never the source of truth.

**Two planes, both contract-first — do not conflate them:**

| Plane | Surface | Consumers | Parity meaning |
| --- | --- | --- | --- |
| **Governance / capability plane** | `/api/admin/growth/ctas/**` | Authenticated operators + Nexa + MCP/ecosystem + CLI | Every author/review/publish/pause/deprecate/route-config/report action is a governed command/reader — the target of Full API Parity. |
| **Runtime / data plane** | `/api/public/growth/ctas/**` | Anonymous public visitors (renderer) | Render-contract read + event ingest. A public execution contract, not a Nexa-operable capability. |

**Governed-action loop for lifecycle writes.** Reads (list CTAs, performance report, eligibility/suppression inspection) are direct reader calls. Writes (author, publish, pause, deprecate, edit targeting/action/priority policy) go through the governed-action loop `propose → confirm → execute`: the LLM/agent **never mutates directly**; it proposes, a human confirms, and mutation happens only at the confirmation endpoint (with command semantics, tenant-safe authz, idempotency, audit/outbox, sanitized errors).

**One primitive, many consumers (never parallel impls).** The same readers/commands serve: (1) the admin cockpit UI, (2) Nexa Agent, (3) MCP/downstream agents via `api/platform/ecosystem/*`, (4) first-party apps via `api/platform/app/*`, (5) CLI/runbooks, (6) the E2E/verification harness. A new consumer class inherits the contract automatically. **Because the governed contract exists at the capability level, Nexa can operate the entire CTA lifecycle by construction — nothing CTA-specific is built for Nexa.**

## 8. Terminology

| Term | Meaning | Examples |
| --- | --- | --- |
| `cta_definition` | Durable identity of a CTA/campaign prompt. | `ai_visibility_report_followup`, `ebook_demand_gen_banner`. |
| `cta_version` | Immutable shape/policy of a published CTA. | Copy, placement, style, action, targeting, analytics. |
| `placement` | How the prompt appears. | `embedded`, `sticky_banner`, `slide_in`, `popup_modal`, `floating_button`, `inline_banner`. |
| `trigger` | Condition that makes the CTA eligible. | route, scroll, time, click, exit-intent desktop, form success, UTM, report state. |
| `surface` | Runtime where the CTA appears. | WordPress public site, Think, Greenhouse preview. |
| `action` | What happens when the visitor acts. | open form, download ebook, open Think tool, book meeting. |
| `suppression` | Why it should not appear. | dismissed, frequency cap, converted, no consent, lower priority. |
| `appearance` | Tono visual tokenizado que no cambia semántica, geometría ni ejecución. Persiste hoy en `style_variant`. | `default`, `spotlight`, `minimal`. |
| `experience kind` | Intención semántica del prompt; orienta authoring y preview, pero no autoriza layout o lógica host-specific. | report follow-up, lead magnet, tool continuation, meeting. |
| `density` | Respuesta honesta al ancho del contenedor; es calculada por el renderer, no autorada por el host. | `full`, `condensed`, `peek`. |
| `variant` | Alternativa experimental de mensaje/diseño bajo `variant_id`; no es sinónimo de placement ni appearance. | value proposition A vs B. |

## 9. Core domain model

### 9.1 Aggregate: `cta_definition`

Fields:

- `cta_id`
- `slug`
- `name`
- `purpose`
- `owner_team`
- `campaign_slug`
- `status`
- `default_locale`
- `created_by`, `created_at`

Rules:

- `slug` is stable and used by embeds/admin references.
- Deleting is archival once events exist.
- One definition can have many versions.

### 9.2 Aggregate: `cta_version`

Fields:

- `cta_version_id`
- `cta_id`
- `version`
- `status`: `draft | review | published | paused | deprecated | archived`
- `locale`
- `placement`
- `style_variant`
- `copy_refs_json`
- `content_json`
- `visual_asset_ref`
- `action_policy_json`
- `targeting_policy_json`
- `suppression_policy_json`
- `priority_policy_json`
- `analytics_policy_json`
- `experiment_policy_json`
- `published_at`

Rules:

- Published versions are immutable.
- Copy should reference canonical copy when reusable.
- Public content must not expose internal campaign notes, scoring logic, destination mapping or PII.

### 9.3 Aggregate: `cta_surface_binding`

Fields:

- `surface_id`
- `surface_kind`: `wordpress | astro | think | nextjs | generic_html`
- `origin_allowlist`
- `allowed_cta_slugs`
- `embed_key_id`
- `renderer_channel`: `stable | beta | preview`
- `status`: `active | paused | archived`

Rules:

- Public calls validate surface binding and origin.
- The same CTA can render on multiple surfaces with separate rollout and telemetry.
- Surface controls where a CTA can render; action policy controls what it can do.

### 9.4 Event evidence — two tiers, not one table

CTA events span two very different volume/trust profiles and **must not** live in a single Postgres table. `eligible`, `suppressed` and `viewed` fire on nearly every public pageview (high cardinality, low individual value, browser-reported → untrusted). `clicked`, `action_started`, `action_completed`, `form_submitted` are conversion evidence (low volume, audit-grade). Collapsing both into one synchronous append-only Postgres table breaks the dual-store posture (PG = OLTP, BQ = analytical) and inflates `greenhouse_growth` without bound. This mirrors the Growth Forms decision: the server conversion ledger is authoritative and small; behavioral exposure is analytical.

**Tier A — conversion evidence ledger (`cta_conversion_event`, Postgres, audit-grade).**

Low-volume, server-attributable outcomes only. Append-only in `greenhouse_growth`.

Event kinds: `clicked`, `action_started`, `action_completed`, `form_opened`, `form_submitted`, `dismissed`, `error`.

Fields:

- `event_id`
- `cta_id`, `cta_version_id`
- `surface_id`, `page_uri`, `placement`, `trigger`, `variant_id`, `action_kind`
- `visitor_key_hash`, `session_key_hash`
- `consent_state`, `consent_source`
- `utm_json`, `referrer_domain`
- `trust_level`: `browser_reported | server_confirmed`
- `event_payload_json` (allowlisted, no raw PII)
- `created_at`

**Tier B — exposure telemetry (`cta_exposure`, high-volume analytical).**

`eligible`, `suppressed`, `viewed` and other exposure signals. These do **not** land synchronously in OLTP Postgres. V1 options, decided at foundation time (do not defer silently):

1. Route through the outbox → BQ analytical sink (preferred if the exposure rate is bounded), OR
2. Emit into the future Tracking Engine envelope (`greenhouse-tracking-events.v1`) once it is accepted/runtime, OR
3. Sample and aggregate at the edge/renderer before ingest when raw exposure volume would overwhelm the sink.

Until the Tracking Engine is runtime, V1 owns a thin, rate-limited, **sampled** exposure ingest and writes aggregates, never one PG row per pageview.

Rules (both tiers):

- Both ledgers are append-only; no `UPDATE`/`DELETE` (supersede/aggregate only).
- PII is never allowed in browser telemetry or any event payload.
- **Browser-reported events are untrusted for experiment interpretation.** Only `trust_level='server_confirmed'` outcomes (server-confirmed via §9.5 `cta_action_attempt`, or joined to a Growth Forms server-accepted submission) count toward experiment primary metrics and conversion truth. Browser `clicked`/`viewed` are directional telemetry, not conversion authority.
- If a Growth Form submission happens, the **form submission ledger remains conversion authority**; the CTA stores only the relationship (submission id join).
- Retention is explicit and different per tier: conversion evidence is long-lived/audit-grade; raw exposure is short-lived and superseded by aggregates.

### 9.5 Aggregate: `cta_action_attempt`

Tracks action delivery/routing when action requires server confirmation.

Examples:

- gated ebook access;
- Growth Form launch/submit relationship;
- HubSpot handoff;
- meeting link resolution;
- Think tool route generation.

Fields:

- `attempt_id`
- `event_id`
- `action_kind`
- `destination_ref`
- `status`: `pending | succeeded | failed | skipped | dead_lettered`
- `idempotency_key`
- `error_code`
- `created_at`, `completed_at`

## 10. Placement and interaction contract

V1 placement families:

| Placement | Use when | Contract |
| --- | --- | --- |
| `embedded` | CTA lives in content flow. | No overlay; keyboard path follows DOM order. |
| `inline_banner` | Section-level prompt. | Non-modal; no focus trap. |
| `sticky_banner` | Persistent offer at top/bottom. | Dismissible; safe-area aware; no content overlap. |
| `slide_in` | Contextual secondary prompt. | Non-blocking; collision-safe; mobile cautious. |
| `popup_modal` | High-intent or gated offer. | Modal semantics, focus trap, close/escape, frequency cap. |
| `floating_button` | Persistent helper/CTA launcher. | Small affordance; never blocks content; target size accessible. |

Hard rules:

- No stacked CTAs. The priority arbiter chooses one active interruptive prompt per page/session.
- No false scarcity, countdown resets, confirmshaming, hidden close controls or pre-checked opt-ins.
- Exit-intent is desktop-only and must be frequency-capped.
- Mobile popups must be rare, dismissible and must not cover essential form fields or navigation.
- Reduced motion must preserve final state and meaning.

## 11. Targeting, suppression and priority

Targeting inputs allowed in V1:

- route/page pattern;
- surface id;
- UTM/campaign/source/medium/content;
- referrer domain;
- device class and viewport family;
- scroll depth;
- time on page;
- click trigger;
- Growth Form outcome;
- public report state or Think tool state;
- prior CTA dismissal/conversion state;
- consent state;
- coarse segment flags explicitly passed by host surface.

Targeting inputs forbidden in V1:

- raw email, name, phone, RUT or direct personal identifiers;
- inferred sensitive attributes;
- opaque third-party audience segments without documented consent;
- DOM scraping of arbitrary page text for personalization.

Suppression policy:

- dismissed by visitor;
- converted via this CTA/action;
- frequency cap exceeded;
- priority loser against a higher-priority CTA;
- missing consent for a targeting/measurement rule;
- surface not authorized;
- unsupported viewport/placement combination;
- experiment mutual exclusion.

Priority policy:

```text
eligibility -> suppression -> mutual exclusion -> priority score -> placement constraints -> render
```

**Arbitration is a server-side decision, not a client one.** Following the same reasoning that rejects Alternative D (browser-only policy), the priority arbiter runs in Greenhouse. The renderer asks *"what should show on this surface + route + visitor context?"* and receives the resolved answer: at most **one** interruptive prompt plus N non-interruptive placements. The browser never receives the full candidate set or the priority policy — that would leak targeting logic and drift toward per-surface snippets. The public read endpoint returns the already-arbitrated render contract(s).

**Visitor state store.** Suppression ("already dismissed", "already converted", frequency cap) requires per-visitor state keyed on `visitor_key_hash`/`session_key_hash`. This is a hot public read on every eligibility check, so it must be served fast (edge/cache friendly, short-TTL) and be pseudonymous (hashes only, no PII, consent-gated). It is a first-party, cookie/consent-based state — never a third-party audience segment. Cache TTL is bounded so a paused/killed CTA stops appearing within the kill-switch window (§16).

## 12. Action routing

Supported action kinds:

| Action | Owner | Notes |
| --- | --- | --- |
| `link_url` | CTA engine | External/internal URL with UTM governance. |
| `download_asset` | CTA engine + asset registry | Gated or ungated ebooks/guides; no raw file URLs if gated. |
| `open_growth_form` | Growth Forms | CTA opens an existing form contract. |
| `embed_growth_form` | Growth Forms | CTA displays a form in-place/modal; form owns submit. |
| `open_think_tool` | Think + CTA engine | Routes to tools with campaign context. |
| `book_meeting` | HubSpot Meetings | Link destination; no CRM mutation by click alone. |
| `hubspot_handoff` | HubSpot adapter | Server-side, audited, bounded. |
| `dismiss` | CTA engine | Records suppression. |

Rules:

- The CTA engine never duplicates Growth Form field schema, validation or consent.
- Ebook/download access can be conditioned on a Growth Form submission, but the form remains the conversion authority.
- Think routes receive campaign context, not raw PII.
- HubSpot handoff is explicit and bounded; no silent deal creation.

**V1 action-registry boundary (amendment 2026-07-18).** V1 must ship the extensibility seam, not every speculative integration: one typed registry owns policy schema, server resolver, browser-safe projection, execution family and failure taxonomy. V1 proves `open_growth_form` plus governed navigation for `link_url`, `open_think_tool` and `book_meeting`; `dismiss` remains a renderer/suppression control. `download_asset`, `embed_growth_form` and `hubspot_handoff` remain supported architecture kinds but graduate as demand-driven adapters only when a real consumer supplies their asset/form/CRM, consent, retry and runtime-evidence contracts. Unknown or unregistered actions fail closed at publish/render.

## 13. Telemetry contract

The renderer emits both browser events and server-side evidence.

Browser event shape:

```js
window.dataLayer = window.dataLayer || []
window.dataLayer.push({
  event: 'greenhouse_cta_viewed',
  cta_id: '...',
  cta_version_id: '...',
  cta_slug: '...',
  campaign_slug: '...',
  surface_id: '...',
  placement: 'popup_modal',
  trigger: 'scroll_depth',
  variant_id: 'control',
  action_kind: 'open_growth_form'
})
```

Canonical browser events:

- `greenhouse_cta_eligible`
- `greenhouse_cta_suppressed`
- `greenhouse_cta_viewed`
- `greenhouse_cta_dismissed`
- `greenhouse_cta_clicked`
- `greenhouse_cta_action_started`
- `greenhouse_cta_action_completed`
- `greenhouse_cta_form_opened`
- `greenhouse_cta_form_submitted`
- `greenhouse_cta_error`

Telemetry rules:

- No raw PII in `dataLayer`, `CustomEvent.detail`, logs or query strings.
- Event/property names are stable and snake_case.
- **The two event namespaces are deliberate, not to be "harmonized":** browser/host-facing events use `greenhouse_cta_*` (dataLayer/GTM); internal event, signal and capability keys use `growth.cta.*`. They serve different consumers (host measurement vs internal outbox/policy) and must not be collapsed.
- **Browser events are directional, not authoritative.** Experiment primary metrics and conversion truth read only server-confirmed outcomes (§9.4). GTM is a measurement/activation surface; Greenhouse remains the policy/evidence source.
- If `GREENHOUSE_TRACKING_ENGINE_ARCHITECTURE_V1.md` becomes accepted/runtime, CTA events should route into its envelope instead of inventing a parallel behavioral warehouse.
- CTA events must reconcile with Growth Forms submission IDs where a CTA opens or embeds a form.

## 14. Experimentation contract

> **V1 scope:** this contract governs experimentation **when it is built**, which is **deferred out of V1** (§18). V1 records variant metadata and emits events only; the powered assignment/SRM/guardrail engine graduates later (candidate `growth.experiment`). No CTA winner may be declared until then.

The engine may assign variants; it must not overclaim experiment results.

Required experiment fields:

- `experiment_id`
- `hypothesis`
- `primary_metric`
- `guardrail_metrics`
- `unit_of_randomization`
- `allocation`
- `mde`
- `sample_size_plan`
- `start_at`, `stop_at`
- `decision_rule`

Rules:

- If traffic is insufficient for a powered A/B test within a reasonable window, ship as a high-confidence CRO change or run qualitative research instead.
- Variant assignment must be stable per chosen unit.
- Sample ratio mismatch is a blocking finding for result interpretation.
- Winning a click metric is not enough if lead quality, form completion, meeting quality or downstream revenue guardrails degrade.

## 15. UI, motion and accessibility

### 15.1 CTA Experience System — primitive, placement, kind and appearance

`<greenhouse-cta>` is one portable experience primitive. Richness is produced by coherent hierarchy, truthful
state transitions and contextual continuity, not by creating a component per campaign or adding decorative
effects per host. The public renderer contract separates four concerns:

1. **Placement** owns geometry, interruption level and focus model: `embedded`, `inline_banner`, `slide_in`, etc.
2. **Experience kind** describes the visitor job and authoring intent: report follow-up, lead magnet, tool
   continuation or meeting. It may constrain compatible content/action combinations but never injects copy or
   destination logic in the browser.
3. **Appearance** is the tokenized visual tone represented by `style_variant`: `default`, `spotlight` or
   `minimal`. Appearance may change surface, contrast and emphasis; it must not change semantics, action,
   suppression or focus behavior.
4. **Density** is renderer-derived from the component's own inline size: `full`, `condensed` or `peek`. Hosts do
   not choose density and must not hide or clip content to simulate it.

`variant_id` remains reserved for experiment/message alternatives. It must not be overloaded as a visual skin,
placement switch or density control. This separation prevents analytics ambiguity and keeps WordPress, Think and
preview behaviorally equivalent.

Official V1 presentation families:

| Placement family | Visitor moment | Required anatomy | Density posture | Signature transition |
| --- | --- | --- | --- | --- |
| `embedded` editorial | Natural continuation after content/report evidence. | Optional contextual eyebrow, headline, supporting body/evidence, one primary action, optional honest footnote. | `full → condensed`; `peek` is not valid in content flow. | Reveal inside reserved space; no layout shift. |
| `inline_banner` spotlight | Section-level opportunity with higher visual emphasis. | Same semantic anatomy; optional visual/evidence rail; one primary action. | `full → condensed`; action stacks when necessary. | Short opacity/translation reveal inside reserved space. |
| `slide_in` contextual | Eligible high-intent secondary prompt after a governed trigger. | Compact context, headline, one action and always-visible dismiss. | `condensed → peek`; full only when container permits. | Edge entry on wide viewports, bottom/safe-area entry on compact. |
| `form_expanded` state | Visitor has explicitly activated `open_growth_form`. This is a state of the originating placement, not a new placement. | Preserved CTA context + governed form or bounded handoff + recovery/close. | Container-aware; key context never disappears. | In-place continuity/crossfade without an abrupt unrelated modal. |

The V1 `slide_in` is the only new interruptive presentation. `popup_modal` and `floating_button` remain contract
families but do not become parallel visual products until a real consumer proves their need.

### 15.2 Content anatomy and contextual continuity

Every CTA must feel like the next relevant step in the host journey, not a generic promotional interruption.
The content contract is interpreted as follows:

- `eyebrow` identifies context or next-step category; it is not a decorative badge farm.
- `headline` states the concrete value or continuation; it must stand alone without the image.
- `body` explains the outcome, evidence or expectation in concise language.
- `visualAssetRef`, when present, must provide explanatory value: report preview, real artifact, recognizable tool
  or evidence. Generic stock decoration and image-only text are rejected.
- `ctaLabel` names the actual action; it cannot promise an immediate result when the action only navigates.
- `footnote` is reserved for honest expectation-setting such as duration, delivery or privacy—not legal dumping.
- `dismissLabel` must be neutral and accessible; confirmshaming is prohibited.

One primary action is allowed per CTA. A visible dismiss is a control, not a competing conversion action. Secondary
navigation belongs in the destination experience unless a future contract explicitly governs it.

### 15.3 Visual depth and token contract

The renderer may create premium depth through a restrained layered surface: tonal background, subtle border,
controlled elevation, clear typographic hierarchy, contextual visual/evidence and a single accent. The following
are hard boundaries:

- every visual value comes from the public `--gh-cta-*` token layer; host overrides theme the primitive, never
  patch internal selectors or fork markup;
- appearance must pass contrast in light, dark and forced-colors environments;
- gradients, glow and elevated shadow are limited to the `spotlight` appearance and cannot animate continuously;
- `minimal` removes chrome but preserves target size, focus, semantic hierarchy and state feedback;
- no campaign-specific CSS, arbitrary per-page colors, glassmorphism stack, fake urgency, decorative counters or
  asset that carries essential text;
- visual asset failure degrades to a complete text CTA without broken layout or empty media chrome.

### 15.4 Adaptive density contract

The portable equivalent of Greenhouse Adaptive Card density is container-query driven and independent from the
portal Composition Shell. The component adapts to its own width, not the viewport or a host-provided breakpoint:

- `full`: visual/evidence, full supporting copy and inline-or-adjacent action when space permits;
- `condensed`: headline, essential supporting sentence and action; optional visual becomes smaller or is removed
  only when it is non-essential;
- `peek`: interruptive teaser with context/headline, action and dismiss. It is not clipping of the full card.

Across density changes, the headline, primary action and dismiss (when applicable) never disappear. Long copy
wraps or is authoring-blocked; it is never truncated in a way that changes the promise. Density transitions may
use interruptible compositor motion, but the semantic DOM order and focus order remain stable.

### 15.5 Action-aware state continuity

Action kind changes the execution/recovery contract, not the CTA's arbitrary visual skin:

| Action | Perceptible contract | Required feedback |
| --- | --- | --- |
| `open_growth_form` | CTA evolves in place into the governed form state while preserving enough context to explain why the form is present. | Press/pending, focus transfer, form ready, validation/submission, success/error, close and focus return. |
| `link_url` | Lightweight navigation matching the label and destination expectation. | Single-dispatch guard, safe same/new-context semantics and failure recovery. |
| `open_think_tool` | Contextual continuation to a governed Think experience. | Optional real preview/evidence in CTA content, safe navigation and allowlisted campaign context only. |
| `book_meeting` | Navigation to the governed booking experience; no silent CRM mutation. | Honest duration/expectation only when supplied by trusted authoring data; safe navigation and recovery. |

The complete public state vocabulary is: `loading`, `ready`, `focused`, `pending`, `form_open`, `success`, `error`,
`dismissed`, `suppressed`, `capped`, `killed` and `reduced_motion`. Each state must have deterministic telemetry,
keyboard behavior and recovery. Richness is judged primarily by the quality of these transitions, not by the
number of decorative variants.

### 15.6 Motion language

Motion expresses causality and spatial continuity:

- embedded/banner reveal uses reserved space and a short opacity/translation transition;
- slide-in enters from the nearest logical edge on wide screens and from the bottom within safe areas on compact;
- action press/pending confirms that one activation was received;
- CTA → form → result is a continuous state transition inside the same experience shell where practical;
- exit/dismiss finishes state persistence and focus recovery deterministically; suppression never depends on an
  animation-end event;
- transitions are interruptible by Escape, navigation, kill switch, action completion and reduced-motion changes.

Only `transform` and `opacity` are used for ordinary entrance/exit feedback. No bounce, autoplay loop, pulsing,
scroll-jacking, repeated reveal, fake countdown or motion-created urgency is permitted. `prefers-reduced-motion`
removes travel and stagger, preserves immediate state feedback and never delays focus or action completion.

### 15.7 Experience verification matrix

Every new placement, appearance change or action-state change must be reviewed through the same contract in
preview, Think and WordPress where wired:

- viewports/container widths covering wide `full`, narrow `condensed` and interruptive `peek` behavior;
- light/dark/forced-colors where supported and `prefers-reduced-motion`;
- keyboard activation, visible focus, Escape, dismiss, focus transfer and focus return;
- loading, ready, pending, form open, error recovery, success, dismissed, suppressed/capped and killed;
- visual asset present, missing/failing and long localized content;
- `scrollWidth === clientWidth`, safe-area behavior, no page-level scroll jump and measured CLS;
- parity of headline/body/action/destination/appearance/placement between admin preview and public renderer;
- captured frames are manually reviewed; a passing automation report without looking at the frames is insufficient.

Admin UI:

- Use `CompositionShell` as the default surface substrate.
- Use `AdaptiveSidecarLayout` for inspect/review/publish context.
- Use `GreenhouseFloatingSurface` for anchored previews, validation bubbles and action menus.
- Use canonical breadcrumbs/buttons/chips/copy.
- Create wireframe/flow/motion contracts before JSX for material UI.

Portable public renderer:

- Framework-light Web Component/custom element as default.
- Thin wrappers for WordPress, Astro, Think and Greenhouse preview.
- No MUI/Vuexy dependency in public renderer.
- Design tokens are compiled into a public renderer token layer; do not hardcode visual values per page.

Motion:

- Hover/focus/press use CSS Tier 1/token motion.
- Popup/slide-in enter/exit use short, placement-aware motion; no theatrical choreography.
- Reduced motion removes transform/animation and preserves visible state.
- GSAP is not used for ordinary CTA microinteractions.

Layout stability and Core Web Vitals:

- Injected banners/slide-ins **must not cause layout shift**. Reserve space or animate via `transform`/overlay so the host page CLS is not degraded — the CTA engine shares public surfaces with the SEO/AEO work, which is CLS-sensitive. Reuse the Growth Forms renderer's skeleton anti-CLS precedent (`src/growth-forms-renderer/styles.ts`).
- **Mobile intrusive-interstitial guideline is a targeting constraint, not just a taste rule.** Interruptive `popup_modal` on mobile is penalized by search engines and hostile to users; exit-intent is desktop-only (§10) and mobile interruptive placements are restricted by policy, dismissible, and never cover essential content, forms or navigation.

Preview parity:

- The admin/preview renderer (MUI `GreenhouseFloatingSurface`) and the public renderer (framework-light Web Component) are two implementations of the same contract. A **render-contract parity test** must assert preview and public render the same governed contract (replicate `src/lib/growth/forms/__tests__/renderer-contract-parity.test.ts`). Preview fidelity must not silently diverge from production.

Accessibility:

- Popup modal uses correct dialog semantics, focus trap, close button, escape dismissal and focus return.
- Non-modal banners/slide-ins do not claim `aria-modal`.
- Every interactive control has an accessible name and visible focus.
- Dismissal must be keyboard accessible.
- CTA content must not depend on color, animation or image-only text.

## 16. Security, privacy and compliance

- Public endpoints validate surface, origin/embed key and allowed CTA slug.
- Renderer contracts expose only browser-safe fields.
- No secrets, provider mappings or HubSpot internals are sent to the browser.
- Event ingestion is rate-limited and idempotent where practical.
- Visitor/session identifiers are pseudonymous hashes; raw identifiers do not enter telemetry.
- Retention policy is explicit for event and suppression records (per-tier, §9.4).
- Chile Ley 21.719/GDPR-style posture applies to PII and consent.

### 16.1 The public ingest is a forgeable write — treat it as untrusted

The embed key lives in the browser, so it authenticates the **surface**, not the **visitor**. Anyone can read it and forge `viewed`/`clicked`/`action_completed` events. Left undefended, forged events inflate the ledger and — worse — poison experiment interpretation (fake conversions, broken SRM). Defense in depth:

- The public ingest endpoint validates surface binding, origin allowlist and embed key, and **cross-checks** that the reported `cta_version` actually targets the reported `surface_id` (reject mismatches).
- Rate-limit and idempotency-key per visitor/session hash; drop implausible bursts.
- Basic bot/abuse filtering on the ingest path; suspicious traffic is flagged, not counted.
- **Conversion truth never trusts the browser.** Only `trust_level='server_confirmed'` outcomes (§9.4/§9.5) or Growth Forms server-accepted submissions count as conversions or feed experiment primary metrics. `clicked`/`viewed` remain directional.
- Signal `growth.cta.surface_unauthorized_attempt` (§17) surfaces forged/unauthorized ingest attempts.

### 16.2 Consent state — source of truth is declared, not implied

`consent_state` gates tracking/personalization rules, but V1 must declare **where consent comes from** (field `consent_source` on events). CTA exposure telemetry has its own consent basis — it does **not** inherit a Growth Forms submission consent (that consent covers form submission, not popup tracking). V1 reads consent from the host consent surface (e.g. GTM consent mode / host CMP) passed explicitly by the wrapper, and records `consent_source`. When consent is absent for a tracking/personalization rule, the rule is suppressed (§11), not silently applied.

### 16.3 Global kill switch (blast-radius control)

A public interruptive-popup engine needs an emergency stop faster than a redeploy. Beyond per-version `paused` and per-surface `paused`, V1 must provide a **global/per-surface emergency disable** that the renderer honors within a bounded window (tied to the render-contract cache TTL, §11). If a CTA breaks accessibility, covers content, or triggers a consent incident on the public site, an operator can take it down sub-minute without shipping code. This is a hard requirement, not an enhancement.

## 17. Reliability and observability

Initial signals:

- `growth.cta.render_error_rate`
- `growth.cta.event_ingest_error_rate`
- `growth.cta.event_ingest_backpressure` (exposure ingest volume vs sink capacity; detects the §9.4 Tier B overflow risk)
- `growth.cta.action_failed`
- `growth.cta.surface_unauthorized_attempt` (forged/unauthorized ingest, §16.1)
- `growth.cta.gtm_event_missing`
- `growth.cta.form_handoff_failed`
- `growth.cta.experiment_srm_detected`
- `growth.cta.priority_collision`
- `growth.cta.kill_switch_active` (steady = 0; non-zero means an emergency disable is live and should be visible, §16.3)

Operational dashboards should answer:

- Which CTAs are live by surface/campaign?
- Which prompts are suppressed and why?
- Which actions are failing?
- Which CTAs drive form submissions, downloads, meetings or Think tool starts?
- Which experiments have enough evidence to interpret?

## 18. MVP sequencing

**Vertical slice first, not a horizontal platform.** The self-critique (§19) warns against building the platform before the first user. A pure backend-foundation phase with no visible renderer builds a large speculative surface before a single real CTA renders. Instead, V1 proves **one real CTA end-to-end**, then widens. The slice is thin on the *placement* and *action* axes — but it is **not** thin on **portability**, which is the engine's thesis (rejecting Alternative B / page-local snippets). A slice that renders on a single surface would not prove the engine.

**First surfaces are co-equal: the live public WordPress site AND Think.** Both are first-class V1 surfaces, not a surface followed by a deferred one. The renderer proves the *same published contract* rendering on both hosts (mirrors the Growth Forms precedent TASK-1231: WordPress first host + Astro/Think parity wrapper).

1. **Vertical slice (thin on placement/action, honest on portability):** one real CTA rendered from a single published immutable contract on **both** the public WordPress host **and** Think, with **one** action (`open_growth_form`) and **one** embedded/banner placement, end-to-end — minimal `cta_definition`/`cta_version`, surface bindings for both surfaces, server-side arbitration, Tier A conversion ledger, GTM/dataLayer events, one reliability signal, preview↔public parity + GVC/Playwright evidence. This forces the whole spine (compile → arbitrate → render → event → action) through real user paths on two different host runtimes.
2. **Widen the placement axis:** add one interruptive placement (`popup_modal` or `slide_in`) with full a11y/motion/CLS contract, on the surfaces already wired.
3. **Exposure tier + suppression at scale:** Tier B exposure ingest (sampled/BQ per §9.4), visitor-state store, frequency capping, kill switch.
4. **Action extensibility seam:** typed registry + browser-safe executor; prove `open_growth_form` and governed navigation (`link_url`, `open_think_tool`, navigation-only `book_meeting`). Demand-driven adapters for asset delivery, embedded forms and CRM handoff stay outside V1 until a real consumer exists.
5. **Admin cockpit:** `/growth/ctas` author/review/publish/pause/report, Composition Shell + sidecar, preview-parity test.

**Experimentation is explicitly deferred out of V1.** As §14 concedes, if public traffic is underpowered a powered A/B test is not viable; building the full assignment/SRM/guardrail layer before there is traffic to test is premature. V1 ships high-confidence CRO changes and records variant metadata only; the powered-experiment engine graduates to a later phase (candidate `growth.experiment` split, §19). Until then, no CTA "winner" may be declared.

## 19. Self-critique

### What breaks in 12 months?

If many CTAs launch without priority/suppression discipline, public pages become noisy and conversion quality drops. Mitigation: one interruptive CTA per page/session, strict suppression reports and CRO governance.

### What breaks in 36 months?

If personalization grows beyond coarse context, `growth.cta` may become a segmentation/experimentation platform. Mitigation: split `growth.experiment` or `growth.personalization` when rules become shared across more capabilities.

### Cognitive debt risk

The system spans Growth Forms, public site, Think, GTM, HubSpot and future Tracking Engine. The docs must keep diagrams, event taxonomy and source-of-truth boundaries current or agents will recreate snippets per surface.

### Lock-in

GTM is a measurement surface, not a runtime dependency. HubSpot is a destination, not source of truth. The portable renderer avoids lock-in to WordPress or Astro.

### Observability gaps

Browser dataLayer pushes can be blocked or misconfigured. Greenhouse needs server-side event evidence and a `gtm_event_missing`/smoke workflow to detect broken tags.

### Privacy/compliance gap

Targeting and personalization can drift into sensitive profiling. V1 only allows coarse, consent-aware inputs and forbids raw PII/sensitive attributes in targeting.

## 20. Hard rules (NUNCA / SIEMPRE)

- **NUNCA** almacenar exposición de alto volumen (`eligible`/`suppressed`/`viewed`) como filas OLTP síncronas en Postgres — va a la Tier B analítica/sampleada (§9.4). El ledger PG es solo evidencia de conversión audit-grade.
- **NUNCA** tratar un evento browser (`clicked`/`viewed`/`action_completed` reportado por el cliente) como verdad de conversión ni como métrica primaria de experimento. Solo `server_confirmed` o submission server-aceptada de Growth Forms cuentan (§9.4/§16.1).
- **NUNCA** arbitrar prioridad o resolver suppression en el cliente. La arbitración es server-side; el renderer recibe 0–1 interruptivo + N no-interruptivos ya resueltos (§11).
- **NUNCA** duplicar schema/validación/consent de Growth Forms dentro del motor de CTA — el CTA abre/embebe un form; el form es la autoridad de submit (§12).
- **NUNCA** enviar secretos, mapeos de provider o internals de HubSpot al browser; el render contract expone solo campos browser-safe.
- **NUNCA** aplicar una regla de tracking/personalización sin `consent_state` válido y `consent_source` declarado (§16.2).
- **NUNCA** declarar un "winner" de CTA sin métrica primaria, MDE/sample-size, guardrails y chequeo SRM (§14); experimentación powered está diferida fuera de V1 (§18).
- **NUNCA** shippear un placement interruptivo sin semántica/foco correctos para su familia, Escape, dismissal por teclado, focus return tras interacción, reduced-motion y anti-CLS; `aria-modal`/focus trap son exclusivos de un modal real y están prohibidos en `slide_in` (§15).
- **SIEMPRE** proveer kill switch global/por-surface que el renderer honra dentro del TTL del contrato (§16.3).
- **SIEMPRE** cross-check `cta_version ↔ surface_id` en el ingest público y emitir `growth.cta.surface_unauthorized_attempt` ante mismatch (§16.1).
- **SIEMPRE** mantener paridad preview↔público con un test de contrato (§15), replicando `renderer-contract-parity.test.ts` de Growth Forms.
- **SIEMPRE** exponer cada capability vía contrato gobernado (Full API Parity, §7.1): un primitive en `src/lib/growth/ctas/`, muchos consumers (UI, Nexa, MCP, CLI).
- **NUNCA** poner un write de lifecycle (author/publish/pause/deprecate/route-config) solo dentro de un componente UI; va como command gobernado. El agente/LLM nunca muta directo — loop `propose → confirm → execute`, mutación solo en el endpoint de confirmación humana.
- **NUNCA** conflar el plano de gobernanza (capabilities Nexa-operables) con el data plane público (render/ingest anónimo); ambos son contratos, pero la parity aplica al primero (§7.1).

## 21. Delta 2026-07-04 — hardening review

Revisión de arquitectura + product design sobre el ADR/spec aceptados. Cambios incorporados:

- **Event ledger partido en dos tiers** (§9.4): conversión audit-grade en PG vs exposición alto-volumen analítica/sampleada — alinea con el dual-store (PG OLTP / BQ analítico) y cierra el gap de scalability.
- **Ingest público tratado como write forjable** (§16.1): cross-check version↔surface, bot filtering, y `trust_level` server-confirmed como única autoridad de conversión/experimento — cierra el gap de integridad de experimentos (SRM envenenado).
- **Arbitración server-side + visitor-state store** explícitos (§11).
- **Consent SoT declarado** (`consent_source`, §16.2) y **kill switch global** como requisito duro (§16.3).
- **CLS/anti-shift, constraint de interstitial móvil y test de paridad preview↔público** (§15); señales de backpressure y kill switch (§17).
- **Secuenciación reescrita a vertical-slice-first** contra el reporte AI Visibility en Think; **experimentación powered diferida fuera de V1** (§18).
- Namespaces `greenhouse_cta_*` (browser) vs `growth.cta.*` (interno) declarados deliberados (§13); naming de contrato aclarado (§7).

Sin cambios de runtime, migraciones, GTM ni deploy autorizados por esta revisión.

## 22. Related documents

- `GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_DECISION_V1.md`
- `GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md`
- `GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `GREENHOUSE_TRACKING_ENGINE_ARCHITECTURE_V1.md`
- `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `GREENHOUSE_FLOATING_SURFACE_DECISION_V1.md`
- `docs/context/08_estrategia-comercial.md`
- `docs/context/11_hubspot-bowtie.md`

## 23. Delta 2026-07-17 — TASK-1339: foundation `growth.cta` shipped (primera rebanada vertical, server-side)

La espina server-side de la rebanada vertical (§18.1) existe como runtime:

- **Schema** `greenhouse_growth.cta_definition` / `cta_version` (CHECK state machine + UNIQUE parcial published + trigger de inmutabilidad post-publish) / `cta_surface_binding` / `cta_conversion_event` (Tier A append-only por trigger; persiste también rechazos de ingest sin PII con `ingest_status='rejected'` como fuente del signal de forja — espejo del precedente forms). Migraciones `20260718001431135` + `20260718002549989` (capabilities), aplicadas a dev.
- **Primitive** `src/lib/growth/ctas/` (contracts zod `greenhouse-growth-cta-popup.v1`, store con outbox in-tx, render-contract compiler browser-safe, action router SOLO `open_growth_form` vía `getPublishedRenderContractByRef` de forms, arbiter server-side 0–1 interruptivo con targeting fail-closed, ingest forjable-hardened con cross-check `cta_version↔surface`+`trust_level`+dedupe+abuse port compartido, lifecycle commands con publish atómico + pause/resume).
- **API**: pública `GET /api/public/growth/ctas/render` + `POST /api/public/growth/ctas/events` (CORS data-driven desde bindings, cache 90s) y admin `/api/admin/growth/ctas/**` (list/author/detalle/lifecycle/surfaces) con `can()` por capability fina.
- **Capabilities** `growth.cta.{read,author,publish,pause}` (registry + catalog + grants espejo growth.forms; `pause` separada de `publish` a propósito — §16.3). **Signals** `growth.cta.{render_error_rate,event_ingest_error_rate,surface_unauthorized_attempt,form_handoff_failed}` cableadas al overview. **Outbox**: `growth.cta.version_lifecycle_changed` + `growth.cta.surface_registered` v1 (EVENT_CATALOG Delta 2026-07-17).
- **Primer CTA real**: `ai-visibility-report-followup` autorado+publicado por commands, con bindings `wordpress` + `think` (embed keys minteadas). Smoke e2e verde contra PG dev (render arbitrado browser-safe sin leak de policy, ingest accepted+idempotente, forja/mismatch rechazados y persistidos).
- **Flag** `GROWTH_CTA_ENGINE_ENABLED` default OFF en todos los environments (ledger); flip coordinado con TASK-1340.

Fuera de esta entrega (per §18): renderer visible (TASK-1340), Tier B exposición/visitor-state/frequency capping/kill switch global a escala, otras acciones/placements, admin cockpit UI, experimentación powered.

## 24. Delta 2026-07-18 — TASK-1428: visitor state + suppression server-side (shadow) + Tier B + kill switches (fase 3 de §18)

El data plane de suppression/exposición/kill-switch de §11/§9.4/§16.3 existe como runtime (code-complete; enforcement en shadow):

- **Schema aditivo** (migración `20260718131956294`, aplicada a la instancia): `cta_visitor_state` (sujeto `visitor|session`, hash-only con el salt del dominio, `UNIQUE NULLS NOT DISTINCT (subject_kind, subject_hash, cta_id)`; la fila `cta_id IS NULL` es la ventana GLOBAL interruptiva del sujeto; retención explícita visitor 180d / session 48h con purga oportunista best-effort), `cta_exposure_rollup` (Tier B AGREGADO horario por dims `bucket×cta×surface×placement×kind×reason×source×enforced` — la opción 3 de §9.4: sampled/aggregates, jamás 1 fila OLTP por pageview; `observed_count` + `estimated_count = observed/rate`; retención 400d) y `cta_kill_switch_event` (append-only por trigger; estado vigente = último evento por scope; `reason` obligatorio + `actor_ref`).
- **Decisión de suppression** (`suppression.ts`, pura): taxonomía estable `dismissed | frequency_capped | already_converted | higher_priority_selected | surface_killed | global_killed | consent_or_identity_limited | placement_not_supported | policy_invalid | runtime_degraded` (espejada en el CHECK del rollup). `suppression_policy_json` por versión con schema zod y defaults conservadores (`{}` foundation = válida: cooldown dismiss 14d, suppress-after-conversion ON, cap per-CTA 2/24h); malformada ⇒ fail-closed `policy_invalid`. Frequency caps SOLO a placements interruptivos + cap engine-level cross-CTA por sujeto/día (`GROWTH_CTA_INTERRUPTIVE_PER_SUBJECT_PER_DAY`, default 3). **Fallback conservador**: sin sujeto (sin keys o sin consent), un interruptivo NO se expone (`consent_or_identity_limited`); no-interruptivos siguen el flujo del contenido.
- **Consent-awareness (§16.2)**: la key `visitor` solo habilita estado DURABLE con `consentState='granted'`; sin consent el estado es session-scoped (retención 48h, sin fingerprint persistente). El contexto viaja por headers (`x-greenhouse-cta-visitor/-session/-consent/-consent-source`) — nunca por query (keys fuera de logs de proxies); se hashea server-side y JAMÁS se persiste crudo.
- **Semántica dismiss/conversión**: el dismiss persiste al aceptar el evento Tier A (`recordCtaDismissal` upsert idempotente — refresh/remount/multi-tab no reinician la ventana; la UX nunca depende de `animationend`). `already_converted` SOLO con evidencia verificada server-side: el `formSubmissionId` se valida contra Growth Forms (`isSubmissionServerAccepted` en `forms/readers.ts` — boundary §12 intacto, boolean-only); un click/claim browser jamás suprime permanente.
- **Concurrencia determinista**: en enforcement, la exposición interruptiva se CLAIMEA atómicamente (`claimInterruptiveImpression`, `SELECT … FOR UPDATE`): de N tabs/renders concurrentes exactamente uno gana; un claim perdido no consume presupuesto de ventana. Validado contra PG real (`scripts/growth/_sanity-cta-suppression-sql.ts`: `[true,true,false]` con cap 2).
- **Tier B runtime** (`exposure.ts`, adapter aislado FAIL-OPEN): `eligible/suppressed` los observa el server en el render path; `viewed` browser entra por el MISMO ingest defendido (surface+key+origin+cross-check) y va al rollup, nunca al ledger (los rechazos Tier B tampoco — el CHECK del ledger es Tier A-only). Sampling `GROWTH_CTA_EXPOSURE_SAMPLE_RATE` (0 = apagado). Fallo del sink ⇒ breadcrumb `exposure_backpressure` dedupe 1/día (fuente del signal) y el render sigue — analytics jamás bloquea ni produce tormenta de reaparición (suppression state es independiente y fail-closed por sus reglas).
- **Kill switches (§16.3)**: estado OPERATIVO en DB (nunca env var), `engage/release` por command idempotente-observable + outbox `growth.cta.kill_switch_changed` in-tx + API `GET/POST /api/admin/growth/ctas/kill-switch` (`growth.cta.read` / `growth.cta.pause` — la autoridad del stop; cero capabilities nuevas). El render path lo consulta EN VIVO (sin cache propio) ANTES de candidatos: killed ⇒ `{ interruptive: null, nonInterruptive: [], engineState: 'killed' }` — nunca un falso vacío/`dismissed`. **Ventana compuesta efectiva**: el efecto server-side es inmediato (próximo request); el cache CORS 90s NO la alarga (un origin ya permitido sigue permitido y la respuesta ya dice killed); las rutas públicas no emiten `Cache-Control`. El límite real es la cadencia de fetch del renderer (1 por pageview hoy).
- **Shadow → enforcement**: `GROWTH_CTA_SUPPRESSION_ENFORCEMENT_ENABLED` default OFF = shadow (la decisión se computa y registra `enforced=false` sin alterar renders — base del shadow-compare); ON = exclusión + claim. El kill switch NO depende de este flag (siempre enforced). **Signals** nuevos cableados: `growth.cta.kill_switch_active` (steady 0), `growth.cta.priority_collision` (rollup `higher_priority_selected`), `growth.cta.event_ingest_backpressure`.
- **Contrato para consumers** (TASK-1429/1430): render público aditivo `engineState: 'ok' | 'killed'` (browser recibe el mínimo; nunca ventanas/razones internas/candidate set); operador: `getKillSwitchState` + `listKillSwitchAudit` (actor/reason) + `summarizeCtaExposure` (rollup diario por reason class).

Fuera de esta entrega: renderer enviando visitor/session keys + estados visibles `dismissed|suppressed|capped|killed` (TASK-1429), cockpit de kill switches/reporting (TASK-1430), sink BQ del rollup (el adapter aísla el swap), job de retención dedicado (la purga oportunista cubre el volumen actual).

## 25. Delta 2026-07-18 — TASK-1429: slide_in interruptivo + CTA Experience System (renderer)

El primer placement interruptivo del §10 y el sistema de experiencia del §15 existen como runtime del bundle (`1.1.0`):

- **`SlideInController`** (`src/growth-cta-renderer/slide-in.ts`): único interruptivo V1, **no modal por contrato** (`role='complementary'`, sin `aria-modal` ni focus trap — Tab sigue el documento). Ciclo waiting (cero DOM focusable) → **trigger gobernado del bundle** (dwell 8s O scroll ≥35%, lo primero; el host JAMÁS define triggers) → apertura pasiva sin focus steal → action/dismiss. Escape cierra con focus dentro; focus return determinista al elemento pre-apertura. Shell hijo del custom element con clase `ghc-scope` propia (scope CSS independiente del embedded; ambos placements conviven en un element).
- **Motion (motion doc TASK-1429)**: enter/exit con `@starting-style` + `transition-behavior: allow-discrete` — el display none↔block anima SIN JS ni `animationend`; la persistencia del dismiss se compromete ANTES del estado visual (ingest + guard local síncronos). Wide entra desde el borde lógico; compact desde abajo con `env(safe-area-inset-bottom)`. Morph card→form con View Transition API como enhancement (fallback directo; bypass total reduced-motion). Reduced motion: cero travel, semántica idéntica.
- **Density `full|condensed|peek`** por container query del PROPIO shell (nunca viewport del host), keyed por `[data-ghc-placement='slide_in']` (el renderer lo setea en overlay Y preview inline — paridad por construcción): peek = eyebrow+headline+acción+dismiss (composición real, no clipping); condensed suma body; full suma footnote/visual. Headline/acción/dismiss invariantes; dismiss 44px en el interruptivo.
- **Identidad pseudónima browser** (`visitor.ts`): `sessionKey` (sessionStorage) siempre; `visitorKey` (localStorage) SOLO con `consent-state="granted"` declarado por el host (attrs nuevos `consent-state`/`consent-source` — hook CMP §16.2). Keys UUID opacas (cero fingerprinting), enviadas por headers al render GET y en el body del ingest — cierra el loop con el visitor state de TASK-1428. Guard local de dismiss por sesión como defensa-en-profundidad (la autoridad es server-side). `engineState='killed'` ⇒ el element no monta nada.
- **`viewed` visibility-gated**: IO ≥50% + dwell 300ms, una vez (`notifyViewed`), embedded y slide_in → dataLayer + ingest Tier B (rollup §9.4). Corte de semántica registrado en TRACKING-PLAN §CTAs (mount=viewed era el baseline TASK-1427).
- **Tokens 2026** sin renombrar `--gh-cta-*`: pares dark vía `light-dark()` (`@supports`, media query legacy como fallback), hover ramp `color-mix(in oklch)` solo variante default filled, press `linear()` solo transform, `text-wrap: balance/pretty`. Acento P3 deliberadamente omitido: `--gh-cta-accent` es token del HOST y un override nuestro pisaría su re-tematización.
- **Preview `/growth/ctas`**: matriz de density (mismo fixture a 3 anchos) + demo VIVO del overlay (`SlideInController` immediate) + fixtures pairwise (`slideIn`/`Spotlight`/`Minimal`/`LongCopy`/`UnknownAppearance`). GVC `task-1429-growth-cta-interruptive-placement` (1440+390) mirado: density matrix, overlay open/escaped, appearances, long copy. El loop cazó 2 bugs reales pre-merge (destroy cross-instance bajo StrictMode; density rules ancladas a la clase del overlay).

Fuera de esta entrega: primer CTA slide_in REAL publicado (surface/copy/trigger = decisión del operador; ningún CTA interruptivo existe aún — el placement amplio sigue gateado por enforcement ON, §24), popup_modal/floating_button, action kinds nuevos (TASK-1431), cockpit (TASK-1430).
