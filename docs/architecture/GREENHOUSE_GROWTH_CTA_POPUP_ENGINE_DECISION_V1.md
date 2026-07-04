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
- Surface registry/embed key verifier.
- Eligibility and priority arbiter.
- Exposure/interaction ledger writer.
- Action router.
- Experiment assignment reader/writer.
- Performance report reader.
- Lifecycle command set.

Required actions:

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
