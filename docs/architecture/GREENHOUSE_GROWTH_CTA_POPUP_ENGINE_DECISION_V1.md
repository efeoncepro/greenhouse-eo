# Greenhouse Growth CTA & Popup Engine Decision V1

## Status

Accepted direction -- no runtime changes yet.

This ADR authorizes architecture and planning for a Greenhouse-owned CTA and popup engine in the `growth` domain. It does not authorize implementation tasks, schema migrations, public endpoints, renderer release, WordPress/Astro/Think deployment, HubSpot workflow changes, GTM container changes, or live experiments. Those require explicit follow-up tasks and operator approval.

## Date

2026-07-04

## Owner

Product / Platform Architecture / Growth / Marketing Operations / CRO

## Scope

- CTA, banner, slide-in, popup, floating CTA and embedded conversion surfaces across Greenhouse, Efeonce public site, Think and future surfaces.
- Growth domain ownership for CTA definitions, versions, render contracts, targeting policy, suppression/frequency policy, telemetry contract, action routing and conversion evidence.
- Portable renderer strategy for Astro, WordPress, Think and Greenhouse preview/admin.
- GTM/dataLayer event emission plus Greenhouse internal measurement ledger.
- Integration with Growth Forms, content assets, Think tools, HubSpot Meetings/CRM and future destinations.

Out of scope:

- Implementing the admin UI or renderer package.
- Editing Google Tag Manager containers or live tags.
- Replacing Growth Forms.
- Creating HubSpot CTAs directly.
- Claiming experiment winners without traffic/power analysis.
- Autonomous creation of deals, quotes or commercial workflows.

## Reversibility

Two-way but slow.

Before runtime implementation, reversal only requires archiving this ADR/spec. After launch, reversal requires disabling embeds, preserving interaction/conversion history, removing GTM triggers, migrating public surfaces and explaining historical attribution.

## Confidence

Medium-high.

The design reuses existing Greenhouse patterns: Growth domain, Full API Parity, portable renderer precedent from Growth Forms, public-site boundary discipline, event/audit posture, UI primitive governance and CRO measurement rules. Confidence is not high until the first cross-surface renderer, GTM smoke, consent review, frequency capping and one Growth Forms handoff are verified.

## Validated as of

2026-07-04.

External sources validated:

- HubSpot CTA knowledge base: `https://knowledge.hubspot.com/ctas/create-calls-to-action`
- HubSpot add CTAs to pages: `https://knowledge.hubspot.com/ctas/add-ctas-to-your-pages`
- HubSpot CTA performance analytics: `https://knowledge.hubspot.com/ctas/analyze-cta-performance`
- HubSpot CTA A/B testing: `https://knowledge.hubspot.com/ctas/ab-test-your-calls-to-actions`
- Google Tag Manager data layer docs: `https://developers.google.com/tag-platform/tag-manager/datalayer`

Repo context validated:

- `AGENTS.md`
- `project_context.md`
- `Handoff.md`
- `docs/context/00_INDEX.md`
- `docs/context/08_estrategia-comercial.md`
- `docs/context/11_hubspot-bowtie.md`
- `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_TRACKING_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/ui-platform/MOTION.md`
- `docs/architecture/GREENHOUSE_FLOATING_SURFACE_DECISION_V1.md`

## Context

Greenhouse already owns Growth Forms as the governed form engine for public lead capture. The next CRO layer is not another form; it is the decision and presentation engine that decides which conversion prompt appears, where it appears, why it appears, how often it appears, what action it triggers and how the outcome is measured.

HubSpot CTAs offer useful product precedent: buttons, banners, pop-ups, external page embeds, performance reporting and CTA tests. Greenhouse should match the enterprise capability class without making HubSpot the runtime owner. Efeonce needs this capability across public WordPress, future Astro, Think, Greenhouse and future surfaces, with brand quality, GTM traceability, internal conversion ledger, privacy discipline and reusable routing to Growth Forms, ebooks, Think tools, meetings and HubSpot/Commercial handoff.

This is a Growth capability because it optimizes acquisition, lead magnet conversion, campaign message match, first-party/zero-party data capture and pre-pipeline attribution. Public surfaces host it; HubSpot receives routed outcomes; Commercial consumes qualified handoffs later.

## Decision

Greenhouse will own a portable **Growth CTA & Popup Engine** under `growth.cta`. The engine will compile CTA definitions and targeting policies into browser-safe render contracts consumed by public and internal surfaces. Public renderers will emit GTM/dataLayer-compatible events and submit internal exposure/interaction/conversion evidence to Greenhouse, while actions route through governed destinations such as Growth Forms, content asset delivery, Think tools, HubSpot Meetings, HubSpot CRM adapters or future commands.

The engine is not a HubSpot CTA wrapper, not a WordPress plugin, and not a collection of page-local snippets. HubSpot is a destination and measurement comparator, not the CTA source of truth.

## Alternatives considered

### Alternative A: Use HubSpot CTAs directly

Rejected as the Greenhouse architecture. It is fast and feature-rich, but makes HubSpot the owner of targeting, rendering, variants and analytics, while Greenhouse loses a durable CRO ledger and cross-surface governance.

### Alternative B: Build page-local snippets per surface

Rejected. WordPress, Think and future Astro snippets would drift in styling, targeting, accessibility, suppression and analytics. This repeats the problem Growth Forms solved.

### Alternative C: Extend Growth Forms to be the CTA engine

Rejected. Growth Forms owns form definitions, validation, consent and submissions. CTAs/popups own prompt orchestration, placement, targeting, frequency capping, action routing and exposure metrics. The CTA engine can open or embed a Growth Form, but must not overload the forms domain model.

### Alternative D: Build only a GTM/browser-side popup layer

Rejected. GTM is a measurement and activation surface, not the system of record for conversion policy. A browser-only system cannot reliably preserve audit, lifecycle, suppression, internal attribution, action governance or Full API Parity.

### Alternative E: Default to iframe embeds

Rejected for V1. Iframes reduce host coupling but degrade GTM/dataLayer measurement, responsive fit, accessibility, design token integration and first-party attribution. Iframe is allowed only as a degraded fallback for hostile/restricted hosts.

### Alternative F: Use the Greenhouse portal Floating Surface primitive directly on public sites

Rejected. The portal primitive and Floating UI governance inform the admin/preview and interaction contract, but public renderers cannot depend on MUI/Vuexy/Next.js. The portable renderer must be framework-light and host-DOM native.

## Consequences

### Positive

- Greenhouse gets a first-class CRO engine that can operate across every Efeonce surface.
- CTAs, popups, banners and embedded prompts become governed, versioned and measurable.
- Growth Forms stays focused and becomes an action target instead of absorbing prompt orchestration.
- GTM remains useful without becoming the source of truth.
- Campaign and experiment data can reconcile across Greenhouse, HubSpot, GA4/BigQuery and future Tracking Engine work.
- Public-site migrations can preserve CTA logic because render contracts are portable.

### Negative

- Greenhouse becomes responsible for public renderer reliability, abuse controls, frequency capping, consent discipline and measurement reconciliation.
- The engine adds another public-facing write/read path that must be hardened before production.
- Operators need lifecycle tooling; otherwise CTA governance will drift back into snippets.
- Experimentation support adds statistical and operational complexity; the engine must avoid false confidence.

### Neutral / contextual

- HubSpot CTA product behavior is a benchmark, not an implementation dependency.
- The Tracking Engine is still proposed; V1 must emit compatible events and keep its own ledger without assuming the tracking engine is accepted/runtime.
- Some live public surfaces may keep manual CTAs temporarily; migration should be progressive.

## Runtime contract

Future implementation must follow:

- Domain placement: `growth`.
- TypeScript root: `src/lib/growth/ctas/`.
- PostgreSQL schema: `greenhouse_growth`.
- Public API family: `/api/public/growth/ctas/**`.
- Admin API family: `/api/admin/growth/ctas/**`.
- Admin UI family: `/admin/growth/ctas`.
- Capability prefix: `growth.cta.*`.
- Event prefix: `growth.cta.*`.
- Signal prefix: `growth.cta.*`.
- Contract prefix: `greenhouse-growth-cta-popup-*`.

Required server-side primitives:

- CTA definition/version reader.
- Targeting and suppression policy compiler.
- Render contract compiler.
- Surface registry/embed key verifier (with `cta_version ↔ surface_id` cross-check on public ingest).
- Eligibility and priority arbiter (**server-side**; renderer receives the resolved 0–1 interruptive + N non-interruptive, never the candidate set).
- Visitor-state store (pseudonymous, consent-gated, edge/cache friendly) for dismissal/conversion/frequency-cap state.
- Two-tier event writers: Tier A conversion evidence ledger (Postgres, audit-grade) + Tier B exposure telemetry (high-volume, analytical/sampled — **not** synchronous OLTP rows).
- Action router.
- Global/per-surface emergency kill switch honored by the renderer within the contract cache TTL.
- Performance report reader (conversion metrics computed from server-confirmed outcomes only).
- Experiment assignment reader/writer — **metadata only in V1**; powered A/B assignment/SRM/guardrail engine deferred (see §Deferred out of V1).
- Lifecycle command set.

Full API Parity contract:

- Two planes, both contract-first: the **governance/capability plane** (`/api/admin/growth/ctas/**` — author/publish/pause/deprecate/route-config/report) is the target of Full API Parity; the **runtime/data plane** (`/api/public/growth/ctas/**` — render contract + event ingest, anonymous visitors) is a public execution contract, not a Nexa-operable capability.
- The canonical primitive lives in `src/lib/growth/ctas/` (readers + commands); the admin cockpit is one client. One primitive, many consumers: UI, Nexa, MCP/ecosystem (`api/platform/ecosystem/*`), first-party apps (`api/platform/app/*`), CLI/runbooks, E2E harness — never parallel implementations.
- Lifecycle writes use the governed-action loop `propose → confirm → execute`; the LLM/agent never mutates directly — mutation happens only at the human confirmation endpoint. Because the governed contract exists at the capability level, Nexa operates the full CTA lifecycle by construction (nothing CTA-specific is built for Nexa).

Trust and consent contract:

- Browser-reported events (`clicked`/`viewed`/`action_completed` from the client) are **directional telemetry, not conversion authority**. Only `server_confirmed` outcomes or Growth Forms server-accepted submissions count toward conversion truth and experiment primary metrics.
- The public ingest is a forgeable write (embed key is not a visitor secret): rate-limit, idempotency, bot filtering and surface cross-check are required.
- `consent_state` gates tracking/personalization; the event records `consent_source`. CTA exposure telemetry does not inherit a Growth Forms submission consent.

Required actions:

> Amended by `Architecture Decision 2026-07-18 — Action Registry extensible y adapters demand-driven` below. This original target list remains historical; the amendment defines the current V1 graduation contract.

- `link_url`
- `download_asset`
- `open_growth_form`
- `embed_growth_form`
- `open_think_tool`
- `book_meeting`
- `hubspot_handoff`
- `dismiss`

Required lifecycle:

```text
draft -> review -> published -> paused -> deprecated -> archived
```

Published versions are immutable. Editing a live CTA creates a new version.

## Deferred out of V1

- **Powered experimentation engine.** V1 records variant metadata and emits events, but the stable-assignment / SRM / guardrail / powered-test layer is deferred. Rationale: Efeonce public traffic is likely underpowered for a valid A/B test, and building the experiment platform before there is traffic to test is premature. Until it graduates (candidate `growth.experiment` split), no CTA "winner" may be declared; V1 ships high-confidence CRO changes only.
- **Full personalization / CDP.** V1 targeting is coarse and consent-aware only (no segmentation platform).

## Reversal / kill switch

Independent of the two-way-door reversibility above, a runtime **global/per-surface kill switch** is a hard requirement: a misbehaving public popup (a11y break, content occlusion, consent incident) must be takeable-down sub-minute via the switch (bounded by the render-contract cache TTL), not via redeploy.

## Revisit when

- The Tracking Engine becomes accepted/runtime and should absorb part of the event ledger.
- HubSpot exposes a CTA API that materially changes the build-vs-wrap trade-off.
- Public surfaces consolidate onto a single runtime and no longer require a portable renderer.
- The engine accumulates deep personalization/experimentation logic that deserves a separate `growth.experiment` capability.
- Repeated accessibility/privacy findings show that popup formats are hurting user trust.

## Related documents

- `GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md`
- `GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md`
- `GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_DECISION_V1.md`
- `GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `GREENHOUSE_TRACKING_ENGINE_ARCHITECTURE_V1.md`
- `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

## Delta 2026-07-04 — hardening review

Architecture + product-design review after acceptance. The direction stands; the following were made explicit before any implementation task starts (detail in `..._ARCHITECTURE_V1.md` §21):

1. **Two-tier event evidence** — audit-grade conversion in Postgres vs high-volume exposure in an analytical/sampled sink (dual-store alignment).
2. **Forgeable public ingest** — surface cross-check, bot filtering and `trust_level`; only server-confirmed outcomes are conversion/experiment authority (protects SRM/experiment integrity).
3. **Server-side arbitration** + pseudonymous **visitor-state store**.
4. **Consent source-of-truth** (`consent_source`) and a hard-requirement **global kill switch**.
5. **Anti-CLS / mobile-interstitial constraint / preview↔public parity** in the renderer contract.
6. **Vertical-slice-first sequencing** and **experimentation deferred out of V1**.

Still no runtime changes, migrations, GTM changes, tasks or deployments authorized.

## Architecture Decision 2026-07-18 — Action Registry extensible y adapters demand-driven

- Status: `Accepted`
- Owner: Product / Platform Architecture / Growth
- Scope: `growth.cta` action policy, server resolver, browser-safe render contract, portable executor and cockpit authoring metadata
- Reversibility: `two-way`
- Confidence: `high`
- Validated as of: `2026-07-18`

### Context

TASK-1339/1340 proved `open_growth_form` end-to-end and exposed the correct server/browser seam, but the current implementation hardcodes one action literal. Implementing every target adapter now would mix unrelated asset delivery, embedded-form and CRM concerns without real consumers; leaving the literal untouched would make every future action a cross-runtime fork.

### Decision

V1 ships one typed Action Registry that owns each kind's policy schema, server resolver, browser-safe projection, execution family, failure taxonomy and authoring metadata. V1 keeps `open_growth_form` and adds governed navigation for `link_url`, `open_think_tool` and `book_meeting`; the latter is navigation-only and never creates CRM records. `dismiss` remains a renderer/suppression control rather than a primary destination.

`download_asset`, `embed_growth_form` and `hubspot_handoff` remain valid architecture kinds but are not V1 exit requirements. They graduate as adapters only when a real consumer provides the canonical asset/form/CRM contract, consent posture, retry/idempotency semantics and runtime evidence.

The canonical operator route is `/growth/ctas`, matching the runtime shipped by TASK-1340; the earlier planned `/admin/growth/ctas` family is superseded.

### Alternatives Considered

- Implement all adapters in V1: rejected as speculative breadth with materially different risk and ownership.
- Keep only `open_growth_form` and add conditionals per campaign: rejected because it creates cross-runtime drift.
- Create one task per action immediately: rejected because no real consumer or independent rollout exists for most adapters.

### Consequences

- Adding an action becomes an adapter registration, not edits scattered across router, renderer and cockpit.
- Contract parity and rollout negotiation become explicit gates when a new browser action branch appears.
- V1 remains small enough to verify while preserving a stable extension path.
- Asset, embedded-form and CRM adapters require later demand-driven work and cannot be claimed supported merely because their names exist in architecture.

### Runtime Contract

- Canonical registry/resolver: `src/lib/growth/ctas/`.
- Browser-safe executor: `src/growth-cta-renderer/`.
- V1 action kinds: `open_growth_form`, `link_url`, `open_think_tool`, `book_meeting`; `dismiss` is renderer control.
- Unknown/unregistered actions fail closed at author/publish/render.
- Operator UI family: `/growth/ctas`.
- Implementation task: `TASK-1431`.

### Revisit When

- A campaign requires governed asset delivery or an embedded form.
- A CRM handoff has explicit consent, bounded write semantics, retry/audit ownership and a real consumer.
- Multiple navigation kinds need a separate destination registry or provider-backed configuration.
