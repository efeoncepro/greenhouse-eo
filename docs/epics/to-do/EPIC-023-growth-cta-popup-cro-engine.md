# EPIC-023 — Growth CTA & Popup CRO Engine

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `unassigned`
- Branch: `epic/EPIC-023-growth-cta-popup-cro-engine`
- GitHub Issue: `none`

## Summary

Construye el motor enterprise de **CTA & Popup CRO** de Greenhouse bajo `growth.cta`: una capability transversal para publicar, gobernar, medir y optimizar CTAs, banners, slide-ins, popups, floating CTAs y prompts embebidos en Greenhouse, sitio público, Think y superficies futuras.

El motor no es un wrapper de HubSpot ni una colección de snippets por página. Greenhouse será el source of truth de definitions, versions, targeting, suppression/frequency capping, priority arbitration, render contracts, action routing, event ledger y experiment metadata. GTM/dataLayer queda como measurement surface del host; Growth Forms, ebooks, Think tools, HubSpot Meetings/CRM y futuros destinos son actions/destinations.

## Why This Epic Exists

Growth Forms ya resuelve la captura gobernada de formularios. Falta la capa anterior y transversal de CRO: decidir **qué prompt de conversión aparece, dónde, cuándo, con qué mensaje, con qué frecuencia, qué acción dispara y cómo se mide**.

Esto no cabe en una sola task porque cruza backend/data, renderer portable, public-site/Think/Greenhouse wrappers, Growth Forms handoff, GTM/dataLayer, HubSpot/CRM destinations, admin cockpit, UI/motion/accessibility, privacy/consent, reliability signals y experimentación estadísticamente honesta. Un cambio vertical único mezclaría schema/API/reader/commands con UI visible y medición pública. La coordinación vive en el epic; la implementación se divide en tasks hijas.

## Outcome

- `growth.cta` existe como capability Greenhouse con source of truth propio, Full API Parity y boundary claro contra `growth.forms`, `public_site`, `commercial`, HubSpot y GTM.
- Un renderer portable host-DOM/no-iframe por defecto puede desplegar CTAs/popups en WordPress, Astro/Think y Greenhouse preview sin duplicar lógica por surface.
- Los eventos `greenhouse_cta_*` son GTM/dataLayer-compatible y además se registran en un ledger server-side sin PII, reconciliable con Growth Forms y futuro Tracking Engine.
- Las acciones `open_growth_form`, `embed_growth_form`, `download_asset`, `open_think_tool`, `book_meeting` y `hubspot_handoff` quedan gobernadas por un action router, no por snippets.
- El cockpit `/admin/growth/ctas` permite autorar/revisar/publicar/pausar/reportar CTAs con Composition Shell, Sidecar, contracts UI y GVC.
- La capa de experimentación impide declarar winners sin hipótesis, MDE, sample size, guardrails y evidencia suficiente.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_TRACKING_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FLOATING_SURFACE_DECISION_V1.md`
- `docs/architecture/ui-platform/MOTION.md`
- `docs/context/08_estrategia-comercial.md`
- `docs/context/11_hubspot-bowtie.md`

## Child Tasks

- `TASK-TBD` — [backend-data] Foundation `growth.cta`: schema, lifecycle, readers/commands, surface bindings, render contract compiler, event ledger and action router skeleton.
- `TASK-TBD` — [ui-ux/platform] Portable CTA renderer MVP: Web Component/custom element, token layer, accessibility/motion contract, wrappers for WordPress/Think/Astro/Greenhouse preview and GTM/dataLayer events.
- `TASK-TBD` — [backend-data] Growth Forms action integration: `open_growth_form` / `embed_growth_form`, CTA→form relationship, submission reconciliation and no-PII telemetry.
- `TASK-TBD` — [backend-data] Asset, Think and HubSpot actions: ebook/guide delivery, Think tool route context, HubSpot Meetings link resolution and bounded HubSpot handoff.
- `TASK-TBD` — [ui-ux] Admin cockpit `/admin/growth/ctas`: author/review/publish/pause/report workbench with Composition Shell, Adaptive Sidecar, canonical copy and GVC.
- `TASK-TBD` — [backend-data] Experimentation layer: stable assignment, mutual exclusion, sample ratio mismatch detection, powered-test metadata and guardrail reporting.
- `TASK-TBD` — [standard/docs] Operator manual, GTM implementation guide, public-site/Think rollout playbook and QA gates.

## Existing Related Work

- `GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_DECISION_V1.md` and `GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md` — accepted direction for the capability.
- Growth Forms engine (`growth.forms`) — sibling capability and first action target; owns form schema, validation, consent and submission ledger.
- `GREENHOUSE_TRACKING_ENGINE_ARCHITECTURE_V1.md` — proposed tracking architecture; CTA V1 must emit compatible events and avoid a conflicting taxonomy.
- `GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md` and Think public report work — likely first high-value consumer for report follow-up CTAs.
- Public site AEO `/aeo-2/` Growth Forms rollout — proof that portable Growth renderer + WordPress host layer is viable, but CTA prompts must graduate beyond page-local anchors.
- HubSpot CTAs product behavior — benchmark only; HubSpot is not the source of truth for Greenhouse CTA policy.

## Exit Criteria

- [ ] `growth.cta` foundation has canonical readers/commands, lifecycle, immutable published versions, surface binding checks and event/action primitives under `src/lib/growth/ctas/`.
- [ ] Public render/record APIs and admin APIs exist or are explicitly planned with Full API Parity; no visible workflow is UI-only.
- [ ] Portable renderer ships at least one embedded/banner placement and one interruptive placement (`popup_modal` or `slide_in`) with keyboard, focus return, close/escape, reduced-motion, mobile and horizontal-scroll evidence.
- [ ] GTM/dataLayer event taxonomy `greenhouse_cta_*` is documented, no raw PII reaches browser telemetry, and server-side ledger reconciles with host events.
- [ ] Growth Forms integration proves CTA→form open/submit relationship without duplicating form schema, validation or consent.
- [ ] At least one public surface and one Think or Greenhouse surface consume the same published render contract.
- [ ] Admin cockpit can author/review/publish/pause/report CTAs through commands/readers, not direct table writes.
- [ ] Experimentation layer blocks or clearly labels underpowered tests; no CTA winner can be declared without primary metric, MDE/sample-size plan, guardrails and SRM check.
- [ ] Reliability signals for render, ingest, action, GTM, form handoff, unauthorized surface, SRM and priority collisions are registered and visible in the reliability plane.
- [ ] Functional/operator docs cover authoring, rollout, GTM setup, QA/GVC gates, privacy guardrails and rollback.

## Non-goals

- Replacing Growth Forms or moving form schema/validation/consent into CTAs.
- Making HubSpot CTAs the runtime/source of truth.
- Editing live GTM containers without a dedicated rollout task and operator approval.
- Shipping dark patterns: false scarcity, countdown resets, hidden close controls, confirmshaming, pre-checked opt-ins or noisy stacked popups.
- Creating deals/quotes/commercial workflows silently from CTA clicks.
- Building a full CDP/personalization engine in V1.
- Default iframe embeds; iframe is only a degraded fallback for hostile/restricted hosts.

## Delta 2026-07-04

Epic created after accepting the architecture/ADR for `growth.cta`. Recommended sequencing is backend-data foundation first, then renderer/wrappers, then action integrations, admin cockpit and experimentation. No runtime changes, migrations, GTM changes, tasks or deployments are authorized by this epic alone.
