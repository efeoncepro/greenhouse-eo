# Greenhouse Growth Promotions Architecture V1

> Type: domain and solution architecture
> Status: `Accepted direction — no runtime created by this document`
> Version: `V1`
> Date: `2026-07-21`
> Owner: `Growth / Product / Platform Architecture / GTM`
> ADR: `GREENHOUSE_GROWTH_PROMOTIONS_DECISION_V1.md`
> Program: `EPIC-034`

## 1. Purpose

Promotions is Greenhouse's owned-surface offer orchestration capability. It coordinates contextual promotion of Efeonce services, diagnostics, tools, assets, events and consultations across the blog, public site, Think, Greenhouse previews and future ecosystem surfaces.

It does not buy paid media and it is not the future Campaign module. It turns a commercial intent into governed, portable deliveries while reusing CTA, Forms, Meetings, tools, asset systems and measurement contracts.

## 2. Product boundary

| Capability | Owns | Explicitly does not own |
| --- | --- | --- |
| `growth.promotions` | Objective, offer, audience/context, flight, creative portfolio, cross-surface delivery plan, cross-CTA pressure and outcome attribution. | CTA rendering/action code, form fields, booking, tool execution, deals or media binaries. |
| `growth.cta` | Placement, experience recipe, trigger, suppression primitives, Action Registry, portable rendering and interaction evidence. | The promoted offer and multi-delivery business objective. |
| `growth.forms` | Form definition, consent, validation, accepted submission and destination attempts. | Promotion creative or CTA display policy. |
| `growth.meetings` | Availability, booking command, idempotency, receipt and confirmed booking. | Promotion or CTA lifecycle. |
| Growth tools | Their run/report/outcome truth. | Promotion attribution policy. |
| Commercial / HubSpot | Qualified contact/company/deal motion after governed handoff. | Browser click or public prompt truth. |
| Asset/Creative systems | Binary, rendition, provenance, license, consent and generation lineage. | Where and why an asset is promoted. |
| Campaign (future) | Multi-promotion orchestration, channel/budget semantics when designed. | V1 Promotion identity or lifecycle. |

## 3. Context and containers

```mermaid
flowchart LR
  OP[Growth operator] --> UI[/growth/promotions]
  NX[Nexa / MCP / agents] --> API[Product + API Platform adapters]
  UI --> API
  API --> PR[Promotion commands/readers]
  PR --> PG[(PostgreSQL greenhouse_growth)]
  PR --> DEC[Server decision service]
  DEC --> CTA[CTA render contract + Action Registry]
  CTA --> HOST[WordPress / Astro / Think / Greenhouse]
  CTA --> FORM[Growth Forms]
  CTA --> MEET[Growth Meetings]
  CTA --> TOOL[Growth tools]
  FORM --> OUT[Server-confirmed outcomes]
  MEET --> OUT
  TOOL --> OUT
  OUT --> PROJ[Promotion outcome projection]
  CTA --> ANA[Aggregated exposure / analytics]
```

The first implementation remains in the current Greenhouse runtime, extraction-ready:

```text
src/lib/growth/promotions/       canonical contracts, commands, readers, decisioning
src/app/api/admin/growth/promotions/**   authenticated transport adapters
src/app/api/public/growth/promotions/**  allowlisted public decision/event adapters
src/views/greenhouse/growth/promotions/** future operator consumer
src/growth-cta-renderer/**       existing portable delivery renderer, extended not forked
```

Browser-safe DTOs cannot import stores, secrets, provider SDKs or server-only modules.

## 4. Aggregate and relational schema

Names are proposed contracts for implementation tasks; migrations must validate exact PostgreSQL conventions and use expand-and-contract.

### 4.1 Canonical surface

`growth_surface` generalizes the existing form-specific host registry and becomes the stable identity shared by Promotions, CTA, Forms and Meetings.

| Field | Contract |
| --- | --- |
| `surface_id uuid PK` | Durable identity. |
| `surface_key text UNIQUE` | Stable semantic key, not a hostname. |
| `surface_kind text` | `wordpress`, `astro`, `think`, `greenhouse`, future allowlisted kind. |
| `display_name text` | Operator label. |
| `origin_policy_json jsonb` | Allowlisted origins and environment rules. |
| `public_embed_policy_json jsonb` | Credential, cache and abuse contract. |
| `status text` | `active`, `paused`, `retired`. |
| audit columns | `created_at/by`, `updated_at/by`. |

Migration: add canonical registry and foreign keys; dual-read/dual-write adapters; backfill mappings from `form_host_surface` and CTA bindings; cut consumers over; contract legacy naming only after production evidence. Meetings keeps working throughout.

### 4.2 Promotion core

`promotion_definition`

| Field | Contract |
| --- | --- |
| `promotion_id uuid PK` | Stable aggregate identity. |
| `promotion_key text UNIQUE` | Stable machine key. |
| `name`, `description` | Operator semantics. |
| `lifecycle_status` | `draft`, `in_review`, `published`, `paused`, `deprecated`, `archived`. |
| `current_published_version_id` | Pointer to immutable published version; nullable. |
| audit columns | Actor and timestamps. |

`promotion_version` is immutable after publication.

| Field | Contract |
| --- | --- |
| `promotion_version_id uuid PK`, `promotion_id FK`, `version_number` | Immutable version identity. |
| `objective_kind` | `lead_capture`, `meeting`, `tool_activation`, `asset_engagement`, `qualified_handoff`, future allowlisted values. |
| `offer_namespace`, `offer_ref` | Typed reference validated at publish; avoids a false FK to Commercial. |
| `audience_policy_json` | Coarse, consent-aware, allowlisted context. No sensitive inference. |
| `context_policy_json` | Page taxonomy, referrer class, tool/report state and other bounded signals. |
| `flight_starts_at`, `flight_ends_at`, `timezone` | Explicit schedule. |
| `pressure_policy_json` | Cross-delivery caps, cooldown and post-conversion suppression. |
| `measurement_plan_json` | Primary outcome, guardrails and attribution window. |
| `campaign_slug` | Optional attribution context only; never identity or FK. |
| `status`, `published_at/by` | Version lifecycle evidence. |

`promotion_goal` allows one primary and bounded secondary outcomes without redefining their source of truth.

| Field | Contract |
| --- | --- |
| `promotion_goal_id`, `promotion_version_id` | Identity and parent. |
| `goal_key`, `goal_kind` | Stable semantic goal. |
| `source_namespace` | `forms`, `meetings`, `tool`, `commercial_handoff`. |
| `source_ref` | Typed source reference. |
| `is_primary`, `attribution_window_seconds` | Measurement contract. |

### 4.3 Creative portfolio

`promotion_creative` is a durable variant identity; `promotion_creative_version` is immutable after publication. This separation lets one Promotion test or distribute multiple creative treatments without cloning its business policy.

| Table | Key fields |
| --- | --- |
| `promotion_creative` | `creative_id`, `promotion_id`, `creative_key`, `name`, `status`. |
| `promotion_creative_version` | `creative_version_id`, `creative_id`, `version_number`, `locale`, `manifest_schema_version`, `content_manifest_json`, `accessibility_manifest_json`, `status`, publication audit. |
| `promotion_asset_binding` | `creative_version_id`, `slot_key`, `asset_namespace`, `asset_ref`, `role`, `rendition_policy_json`, `rights_snapshot_json`, `accessibility_json`. |
| `promotion_dynamic_binding` | `creative_version_id`, `slot_key`, `provider_kind`, `provider_ref`, `provider_schema_version`, `freshness_policy_json`, `privacy_class`, `fallback_block_json`, `status`. |

`asset_namespace + asset_ref` is an anti-corruption reference until one canonical ecosystem asset registry exists. It may point to Greenhouse assets, Public Site assets or an approved Creative Studio projection. The binding snapshots the rights relevant to publication but does not become the rights source of truth.

### 4.4 Delivery and state

`promotion_delivery` binds immutable components:

| Field | Contract |
| --- | --- |
| `delivery_id uuid PK` | Durable delivery identity. |
| `promotion_version_id`, `creative_version_id`, `cta_version_id`, `surface_id` | All validated and immutable while published. |
| `placement_key` | CTA placement slot/recipe reference. |
| `context_override_json` | Narrower than the Promotion policy; cannot broaden it. |
| `priority`, `status` | Server arbitration and lifecycle. |
| `published_contract_hash` | Preview/runtime parity and cache identity. |

`promotion_visitor_state` stores only pseudonymous suppression state needed across deliveries: visitor hash, promotion id, last exposure/dismissal/conversion timestamps, counters and expiry. Without valid consent, identity is session-scoped and interruptive personalization fails closed.

`promotion_decision_rollup` aggregates eligible/suppressed/rendered/viewed counts by promotion/delivery/surface/hour and coarse reason. It is not a raw visitor event ledger.

`v_promotion_outcomes` is a governed projection that joins Promotion context to canonical server-confirmed outcomes. It exposes source, trust, observed time and freshness; it does not copy Forms submissions, Meeting bookings or tool results into a universal ledger.

## 5. Typed creative manifest

The manifest is a content graph, not a page builder. A minimal shape is:

```json
{
  "schemaVersion": "promotion-creative.v1",
  "locale": "es-CL",
  "blocks": [
    { "id": "lead", "kind": "headline", "data": { "text": "Haz visible tu próxima oportunidad" } },
    { "id": "proof", "kind": "image", "assetSlot": "hero", "data": { "alt": "Panel de diagnóstico de visibilidad" } },
    { "id": "action", "kind": "action_group", "data": { "primaryActionKey": "diagnostic" } }
  ]
}
```

Allowed V1 block families:

- semantic text: `eyebrow`, `headline`, `body`, `list`, `badge`;
- evidence: `stat`, `quote`, `testimonial`, `social_proof`;
- media: `image`, `video`, `audio`;
- creator content: `creator_content` with subtype `ugc`, `egc` (employee-generated content) or `expert`;
- dynamic: `dynamic_slot` resolved by a registered provider;
- actions: `action_group` referencing Action Registry keys;
- composition hints: bounded emphasis/order metadata interpreted by CTA recipes, never CSS.

Every block has `id`, `kind`, schema-versioned `data`, optional visibility rule and a fallback. Unknown block kinds or schema versions fail publication and degrade to no render at runtime.

### Media requirements

| Media | Required contract |
| --- | --- |
| Image | Responsive renditions, dimensions/aspect/focal point, useful alt or explicit decorative state, provenance and rights. |
| Video | Poster, captions, transcript, duration, controls, muted-only autoplay policy, reduced-motion/data fallback. |
| Audio | Transcript, duration, visible controls; autoplay is forbidden. |
| UGC/EGC/expert | Creator identity class, consent/release, claim review, provenance, allowed uses and expiry. |

The renderer uses CDN/host allowlists, reserves dimensions to avoid CLS, defaults video to `preload=metadata|none`, pauses offscreen media and never makes audio necessary to understand the offer.

## 6. Dynamic content providers

A dynamic provider is registered code with a stable server-side resolver, not a URL stored in data. Initial candidate kinds are `growth_tool_summary`, `public_report_context`, `content_taxonomy`, `meeting_availability_summary` and `form_state_summary`; each graduates only with a real consumer.

Every provider declares:

- input/output schema and version;
- allowed surfaces and data classification;
- authorization and consent requirements;
- timeout, cache TTL and maximum staleness;
- browser-safe allowlist;
- deterministic fallback;
- reliability signal and kill switch behavior.

Dynamic resolution cannot include raw PII, secrets, internal candidate lists or targeting policy. Timeout/failure returns the declared static fallback; it never leaves an empty broken shell.

## 7. Decision and delivery flow

1. Host sends surface identity, placement and bounded contextual signals.
2. Server authenticates/validates the surface and applies global/per-surface switches.
3. Promotions selects active versions by flight, context, consent, visitor state and pressure policy.
4. CTA arbitration enforces placement priority and interruptive limits.
5. Dynamic slots resolve server-side within budgets or use fallbacks.
6. Server returns zero or more immutable render contracts with Promotion context already allowlisted.
7. Existing CTA renderer presents the selected recipe and executes registered actions.
8. Browser evidence remains `browser_reported`; Forms/Meetings/tools/handoff emit canonical server outcomes.
9. Outcome projection reconciles by promotion/delivery/CTA attribution context.

No candidate set, audience rule, secret, sensitive identifier or arbitrary provider response reaches the browser.

## 8. Full API Parity contract

Parity is defined at business-capability level.

### Canonical readers

- `listPromotions`, `getPromotion`, `getPromotionVersion`;
- `listPromotionCreatives`, `getCreativeVersion`;
- `previewPromotionDelivery` using the canonical decision/renderer contract;
- `listPromotionSurfaces`, `getPromotionPerformance`, `getPromotionHealth`;
- public `resolvePromotionDeliveries` with an allowlisted projection.

### Canonical commands

- `createPromotion`, `createPromotionDraftVersion`, `updatePromotionDraft`;
- `createCreative`, `createCreativeDraftVersion`, `updateCreativeDraft`;
- `bindPromotionAsset`, `bindPromotionDynamicSlot`, `configurePromotionDelivery`;
- `submitPromotionForReview`, `publishPromotion`, `pausePromotion`, `resumePromotion`, `deprecatePromotion`, `archivePromotion`;
- `engagePromotionKillSwitch`, `releasePromotionKillSwitch`;
- `recordPromotionEvidence` only for allowlisted browser evidence; server outcomes come from their owner.

All writes validate capability, lifecycle, optimistic concurrency and idempotency where retryable; record audit/outbox evidence; and return sanitized typed errors. Nexa/MCP cannot bypass approval or execute raw writes. The portal must not write tables directly or hide logic in React.

Initial capabilities:

| Capability | Purpose |
| --- | --- |
| `growth.promotions.read` | Inventory, versions, preview, performance and health. |
| `growth.promotions.author` | Draft Promotion, creative and delivery configuration. |
| `growth.promotions.review` | Review content, rights, actions, targeting and measurement. |
| `growth.promotions.publish` | Publish, deprecate and archive immutable contracts. |
| `growth.promotions.pause` | Pause/resume and kill switches without publication authority. |
| `growth.promotions.assets.manage` | Bind approved media references and rights snapshots. |
| `growth.promotions.providers.manage` | Manage allowlisted dynamic bindings, never arbitrary code. |
| `growth.promotions.results.read` | Read trust-labelled cross-capability outcomes. |

## 9. Measurement and CRO contract

Each Promotion must declare one primary outcome, attribution window, funnel steps and guardrails before publication. Directional metrics include render rate, view rate and CTR. Business conversion rates use only server-confirmed outcomes from Forms, Meetings, tools or qualified handoff.

Promotion context is added additively to existing evidence (`promotion_id`, `promotion_version_id`, `delivery_id`, `creative_version_id`) without replacing CTA/form/meeting identifiers. GTM/dataLayer receives only allowlisted pseudonymous dimensions.

Experimentation is not part of V1. It may graduate only with a hypothesis, MDE, sample-size plan, mutual exclusion, SRM checks and enough traffic. Until then, creative comparisons are descriptive, not declared winners.

## 10. Security, privacy and abuse controls

- No arbitrary HTML, script, inline event handlers, CSS, iframe or remote endpoint in authored data.
- Text is escaped/sanitized; assets and navigation origins are allowlisted; CSP remains enforceable.
- Public render/event endpoints are forgeable writes: rate limit, surface/version cross-check, idempotency, bot filtering and trust labels apply.
- Dynamic providers execute server-side with timeout, output allowlist and data minimization; no SSRF-shaped user URL.
- Sensitive targeting and inferred protected traits are forbidden. Personalization is consent-aware and explainable.
- Media and creator content fail publication when rights, consent, claim review or expiry is missing.
- Publication, pause, kill-switch and rights-sensitive changes are audited.

## 11. Accessibility, performance and product UI

The runtime direction is `extend` the CTA Experience System, not create a parallel renderer or Greenhouse primitive. Promotion creative supplies semantic content; CTA recipes own responsive presentation, action hierarchy, focus, dismissal and motion.

Future `/growth/promotions` is a `ui-standard` Composition Shell workbench, likely master-detail with governed authoring and canonical preview. It requires its own visual-direction, flow, wireframe, motion and desktop/390px GVC artifacts before JSX. It is not a freeform canvas.

Publication gates include WCAG-oriented alternative text/captions/transcripts, keyboard controls, focus behavior, reduced motion, reduced data, contrast and no horizontal overflow. Preview must use the production renderer and prove contract-hash parity.

Suggested initial performance budgets, to validate in implementation: core contract <= 35 KB compressed excluding media; reserved media dimensions; first promotion image <= 200 KB at target viewport; video/audio lazy-loaded outside the primary viewport; dynamic provider p95 bounded by the public decision budget with static fallback.

## 12. Reliability and operations

Minimum signals:

- `growth.promotions.render_error_rate`;
- `growth.promotions.dynamic_provider_error_rate` and `.stale_fallback_rate`;
- `growth.promotions.asset_unavailable` and `.rights_expiring`;
- `growth.promotions.outcome_reconciliation_lag`;
- `growth.promotions.surface_unauthorized_attempt`;
- `growth.promotions.priority_collision`;
- `growth.promotions.kill_switch_active`;
- `growth.promotions.api_parity_gap`.

Kill switches exist globally, per surface and per Promotion. Public delivery must fail closed to no Promotion while the host page continues working. Backups/DR follow the PostgreSQL domain tier; media recovery remains with its owning asset system.

## 13. Delivery sequence

EPIC-034 implements vertical slices, not a horizontal platform dump:

1. canonical schema/contracts + `growth_surface` expansion + parity commands/readers;
2. one real service Promotion on one blog/public context, one static creative and one existing CTA action;
3. rich image/video/audio and creator-content bindings with rights/accessibility gates;
4. one registered dynamic provider with deterministic fallback;
5. operator workbench using canonical preview and the same APIs as agents;
6. cross-capability outcome projection, reliability and rollout evidence;
7. additional surfaces only after the first slice proves conversion and operational safety.

## 14. Non-goals

- Paid-media buying, bidding, spend or ad-network inventory.
- A general Campaign aggregate or marketing automation suite.
- A visual page builder, arbitrary embeds or custom CSS/JS.
- Duplicating Forms, Meetings, CTA actions, media generation or Commercial workflows.
- Client-portal behavioral targeting in V1.
- Automated AI-generated publishing without human review of claims, brand and rights.
- Declaring experiment winners without statistical power.

## 15. Assumptions, risks and revisit gates

Assumptions requiring validation in child tasks: initial volume is thousands rather than millions of decisions/day; public LATAM traffic can tolerate the existing regional runtime; media storage/CDN remains external to Promotion tables; the first business owner and monthly cost envelope will be assigned before rollout.

Largest risks are CTA/Promotion ownership confusion, media performance, expired creator rights, audience creep, event double-counting and an authoring UI that becomes a page builder. The contracts above make each risk mechanically visible.

Revisit when Campaign has a concrete aggregate, a canonical asset registry exists, traffic supports powered experiments, or authenticated cross-sell requires tenant-aware promotion policy.

## 16. Self-critique

- The model is deliberately richer than the first slice; implementation must resist creating every table/provider before a real consumer exists.
- Typed JSON manifests preserve portability but move schema discipline into validators and migrations; unversioned `jsonb` would recreate arbitrary-content debt.
- `asset_namespace + asset_ref` is an interim anti-corruption seam, not an ideal universal asset identity.
- Cross-capability outcome attribution is honest but eventually consistent; operator UI must show freshness and unmatched outcomes rather than fabricate completeness.
- Full API Parity increases initial work, but omitting it would force a second implementation for Nexa/MCP and violate Greenhouse's accepted platform direction.
