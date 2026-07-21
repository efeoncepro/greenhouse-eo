# Greenhouse Growth Promotions Decision V1

## Status

- Status: `Accepted`
- Date: `2026-07-21`
- Owner: `Growth / Product / Platform Architecture / GTM`
- Scope: `greenhouse_growth promotions, CTA, Forms, Meetings, public surfaces, Think, Greenhouse, media assets, measurement and API Platform`
- Reversibility: `two-way-but-slow`
- Confidence: `high` for the domain boundary and API-parity contract; `medium` for the first authoring experience and traffic-dependent optimization features
- Validated as of: `2026-07-21`
- Epic: `EPIC-034`

## Context

Greenhouse already has specialist Growth capabilities: CTAs decide and render conversion experiences, Forms own governed capture and consent, Meetings own booking truth, and diagnostic tools own their outcomes. What is missing is the layer that answers a broader commercial question: **which offer should be promoted, to whom, in which context, during what flight, across which surfaces, with which creative content and with what business outcome?**

Calling this capability `ads` would collide conceptually with paid-media buying and eventually with a broader Campaign domain. Calling it `campaigns` now would prematurely absorb orchestration, channels and budget semantics that do not yet exist. The product name and technical aggregate are therefore **Promotions** / `growth.promotions`.

Promotions must support rich creative expression: images, video, audio, evidence, testimonials, employee- or user-generated content, and dynamic content such as action groups or live tool context. That richness cannot turn the browser contract into arbitrary HTML, JavaScript, iframes or ungoverned remote fetches. It also cannot duplicate CTA action routing, form schemas, booking commands, asset rights, or conversion truth.

Full API Parity is a birth requirement. Promotions is incomplete if its business capabilities exist only in the portal UI.

## Decision

Greenhouse will create **Promotions as a first-class aggregate in the Growth domain**, above and alongside specialist delivery capabilities.

1. A Promotion owns objective, offer, audience/context policy, flight, pressure budget, creative portfolio, delivery plan and outcome attribution.
2. A CTA owns placement, experience recipe, action execution and interaction behavior. Promotion-backed delivery composes an immutable Promotion creative version with an immutable CTA version; it does not fork the renderer.
3. Growth Forms owns form definition, validation, consent and submission truth. Meetings owns booking availability, execution and confirmed-booking truth. Diagnostic tools own their completed outcomes. Commercial/HubSpot begins at a qualified, governed handoff.
4. Rich content uses a **versioned, typed creative manifest**. It may contain semantic blocks such as text, image, video, audio, statistic, quote, testimonial, creator content (`ugc`, `egc`, `expert`), evidence and action groups. It may never contain executable code or arbitrary markup.
5. Media is referenced, not copied into Promotion rows. Every binding declares role, responsive rendition policy, accessibility metadata, provenance, usage rights and expiry where applicable. Generated or licensed assets remain owned by their canonical asset/creative system.
6. Dynamic content resolves only through an allowlisted provider registry. Each binding declares schema version, freshness/cache policy, privacy class and deterministic fallback. Resolution is server-side and returns an allowlisted browser-safe projection.
7. Action blocks reference the CTA Action Registry. A creative manifest cannot embed an arbitrary URL or mutate Forms, Meetings, CRM or Commercial directly.
8. Public host identity converges on a canonical `growth_surface` registry. Existing `form_host_surface` and CTA bindings migrate through expand-and-contract; no flag-day rename is authorized.
9. Exposure evidence remains two-tier: high-volume eligibility/view evidence is aggregated or analytical; auditable actions and server-confirmed outcomes remain in canonical OLTP ledgers. Browser clicks are directional evidence, never conversion truth.
10. Campaign remains a future parent/orchestration concept. A future Campaign may coordinate many Promotions, but Promotions does not create or redefine Campaign now. `campaign_slug` remains attribution metadata, not Promotion identity.
11. Full API Parity is mandatory from the first vertical slice. Canonical commands/readers/projections under `src/lib/growth/promotions/**` serve UI, Product/API Platform, Nexa, MCP/agents, CLI/runbooks, workers and verification harnesses. Writes for Nexa follow `propose -> confirm -> execute`.

## Information and action model

```text
Promotion
  ├─ immutable PromotionVersion (objective, offer, targeting, flight, pressure)
  ├─ Creative
  │    └─ immutable CreativeVersion (typed content manifest)
  │         ├─ media bindings -> canonical asset references
  │         └─ dynamic bindings -> registered providers + fallback
  └─ Delivery
       ├─ GrowthSurface
       ├─ CreativeVersion
       └─ CTAVersion -> Action Registry -> Form | Meeting | Tool | governed link
```

The authoring action hierarchy is `draft -> review -> publish -> pause/resume -> deprecate/archive`. Publishing freezes all referenced versions and fails closed when a surface, action, asset right, accessibility requirement or dynamic fallback is invalid.

## Alternatives considered

| Alternative | Decision |
| --- | --- |
| Extend CTA with offer, flight, cross-surface pressure and business outcomes | Rejected. It would turn an experience/action capability into a campaign-like commercial aggregate. |
| Name and model the capability `Ads` | Rejected. It implies paid inventory/media buying and excludes owned surfaces, contextual prompts and ecosystem distribution. |
| Create Campaign now and make Promotion a subtype | Deferred. Campaign orchestration, budgets and channel mix lack a concrete runtime contract. |
| Store arbitrary HTML/JS as promotion creative | Rejected for security, accessibility, portability, CSP and preview/runtime parity. |
| Duplicate media binaries and rights in Promotions | Rejected. Promotions binds assets; canonical asset systems retain provenance and rights ownership. |
| Let dynamic blocks call arbitrary endpoints from the browser | Rejected. It leaks policy/data, creates SSRF/privacy/CSP risk and destroys deterministic fallback. |
| Use CTA clicks as conversion truth | Rejected. Forms, Meetings, tools and Commercial each own server-confirmed outcomes. |
| Build a parallel promotion renderer | Rejected. The CTA Experience System is extended as the canonical delivery renderer. |

## Consequences

### Positive

- One offer can be governed across the blog, public pages, Think, Greenhouse and future ecosystem surfaces without duplicating CTAs.
- Rich media and creator content become portable, accessible and rights-aware.
- Pressure and suppression can be coordinated across multiple CTAs belonging to one Promotion.
- Business outcomes can be reconciled across Forms, Meetings, tools and qualified handoffs.
- Full API Parity makes Promotions operable by Nexa, agents, integrations and runbooks by construction.

### Negative

- Authoring and publication require more validation than a simple CTA editor.
- The canonical surface migration temporarily carries old and new identifiers.
- Rich media adds performance, rights, moderation and accessibility gates.
- Cross-capability outcome projection is eventually consistent and must expose freshness.

## Runtime contract

- Canonical behavior: `src/lib/growth/promotions/**`.
- Canonical OLTP namespace: `greenhouse_growth.promotion_*` plus canonical `growth_surface`.
- Authenticated Product APIs: `/api/admin/growth/promotions/**`; public decision endpoint: `/api/public/growth/promotions/render` or an equivalent versioned contract selected by the implementation task.
- Shared app/ecosystem/MCP exposure goes through API Platform adapters over the same commands/readers.
- Canonical operator surface: `/growth/promotions`; it is a client, never the business implementation.
- Public delivery reuses the CTA renderer and Action Registry.
- No runtime, migration, route, flag or deployment is authorized by this ADR alone; EPIC-034 child tasks own implementation and rollout.

## Revisit when

- A concrete Campaign capability needs budgets, channel orchestration or Promotion grouping.
- A canonical cross-ecosystem asset registry supersedes typed asset references.
- Traffic supports statistically powered experimentation with declared MDE and sample size.
- Authenticated client-surface cross-sell is approved with tenant-safe targeting and privacy review.
- CTA Experience System cannot represent a required promotion experience without violating its primitive contract.

## Related documents

- `GREENHOUSE_GROWTH_PROMOTIONS_ARCHITECTURE_V1.md`
- `GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md`
- `GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_DECISION_V1.md`
- `GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_DECISION_V1.md`
- `GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md`
- `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/epics/to-do/EPIC-034-growth-promotions-orchestration.md`
