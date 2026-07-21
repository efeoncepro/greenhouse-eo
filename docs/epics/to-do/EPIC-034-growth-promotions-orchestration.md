# EPIC-034 — Growth Promotions Orchestration

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño aceptado; tasks hijas por reservar`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `unassigned`
- Branch: `epic/EPIC-034-growth-promotions-orchestration`
- GitHub Issue: `none`

## Summary

Construye `growth.promotions`, la capability que coordina ofertas contextuales propias a través del blog, sitio público, Think, Greenhouse y futuras superficies. Promotions gobierna objetivo, oferta, audiencia/contexto, flight, piezas creativas ricas, distribución, presión cross-CTA y atribución de outcomes; reutiliza CTA, Forms, Meetings, tools y assets sin duplicarlos.

Nace con Full API Parity: UI, Nexa, MCP/agentes, API Platform, scripts y verification harness consumen los mismos commands/readers/projections.

## Why This Epic Exists

CTA ya resuelve cómo se presenta y ejecuta una invitación a la acción, pero no representa una oferta comercial con múltiples piezas, superficies, períodos y outcomes. Extender CTA hasta ese nivel mezclaría experiencia, acción y estrategia de promoción. Construir Campaign ahora introduciría presupuesto/canales/orquestación sin un contrato real.

El trabajo no cabe en una task: requiere schema y migración de surfaces, contratos API-parity, creative manifest multimedia, derechos/provenance, provider dinámico, composición con CTA/Forms/Meetings, renderer portable, medición y conciliación, cockpit de autoría, reliability, seguridad, privacidad, accesibilidad y rollout público.

## Outcome

- Promotions existe como agregado Growth diferenciado de CTA y del futuro Campaign.
- Una oferta real se distribuye en al menos dos contextos usando el mismo contrato publicado y el renderer CTA canónico.
- Imágenes, video, audio y creator content se publican mediante manifests tipados con derechos, accesibilidad y performance gates.
- Al menos un contenido dinámico se resuelve por provider registrado con fallback determinista.
- Forms/Meetings/tools conservan la verdad de conversión y Promotions expone una proyección conciliada con trust/freshness.
- Full API Parity está probada entre UI y al menos un consumidor programático sin lógica duplicada.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_GROWTH_PROMOTIONS_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_PROMOTIONS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/context/08_estrategia-comercial.md`
- `docs/context/11_hubspot-bowtie.md`

## Child Tasks

Los IDs se reservan al planificar cada unidad ejecutable; este epic no crea tasks placeholder inválidas.

- `TASK-TBD` — [backend-data] Foundation: aggregate/versioning, `growth_surface` expand-and-contract, browser-safe contracts, commands/readers, capabilities, audit/outbox and parity contract tests.
- `TASK-TBD` — [backend-data/integration] First vertical slice: one real service Promotion, static creative, one public/blog surface, existing CTA action and server-confirmed outcome.
- `TASK-TBD` — [backend-data/media] Typed creative manifests plus image/video/audio/creator-content bindings, provenance/rights/accessibility validation and media budgets.
- `TASK-TBD` — [backend-data/integration] Registered dynamic-content provider framework and one real provider with timeout/cache/privacy/fallback/reliability contract.
- `TASK-TBD` — [ui-ux] `/growth/promotions` governed workbench, canonical preview, lifecycle and results; visual direction/flow/wireframe/motion/GVC required before closure.
- `TASK-TBD` — [data/reliability] Cross-capability outcome projection, exposure rollups, GTM/GA4 contract, reconciliation, signals and kill switches.
- `TASK-TBD` — [integration/rollout] Second surface parity, public production evidence, privacy/security review, operator runbook and rollback.

## Existing Related Work

- `EPIC-023` and the active CTA Experience System/Action Registry provide the renderer, placement, interaction, suppression and action substrate.
- Growth Forms owns public form capture, consent and accepted-submission truth.
- Growth Meetings owns native booking execution and confirmed-booking truth.
- AI Visibility and other Growth tools provide candidate offers/outcomes without becoming Promotion itself.
- Public Site and Think provide host surfaces; they do not become Promotion sources of truth.
- Full API Parity and Nexa total-operability decisions govern all capability design.

## Delivery Strategy

Sequence is vertical-slice-first. The first slice proves one service Promotion end-to-end with a static creative and existing action before building broad multimedia/provider catalogs. Each later slice graduates one capability against a real consumer. The cockpit follows canonical commands/readers and production preview; it cannot become the place where missing backend logic hides.

Current home is the existing Greenhouse runtime under `src/lib/growth/promotions/**` and thin route/UI adapters. Future candidate homes are public renderer consumers and API Platform lanes; no new app/package/deployable is authorized. Server/browser split and extraction constraints follow the modular migration operating model.

## Exit Criteria

- [ ] ADR and architecture contracts are implemented without collapsing Promotion into CTA or Campaign.
- [ ] `growth_surface` migration preserves Forms, CTA and Meetings through expand-and-contract with rollback evidence.
- [ ] Canonical Promotion commands/readers/projections serve UI, API Platform and at least one Nexa/MCP/CLI consumer; writes prove governed `propose -> confirm -> execute` where applicable.
- [ ] No portal workflow writes Promotion tables directly or contains business policy only in UI code.
- [ ] Immutable Promotion and creative versions compose immutable CTA versions into hashable delivery contracts.
- [ ] Typed manifests reject arbitrary HTML/JS/CSS/iframes/endpoints and unknown block schemas.
- [ ] Image, video, audio and UGC/EGC/expert content pass provenance, rights, consent, accessibility and performance gates.
- [ ] One dynamic provider proves server resolution, privacy allowlist, timeout/cache, deterministic fallback and reliability signal.
- [ ] Forms, Meetings and tools remain conversion sources of truth; `v_promotion_outcomes` exposes trust and freshness without duplicating their ledgers.
- [ ] Public evidence is two-tier and browser-reported clicks never become conversion truth.
- [ ] Global/per-surface/per-Promotion kill switches stop delivery within the cache TTL without breaking the host page.
- [ ] One real service Promotion is live in at least two governed contexts/surfaces with preview-runtime parity, desktop/mobile/a11y/performance evidence and rollback.
- [ ] Functional docs and operator runbook describe authoring, review, rights, GTM, health, kill switches and recovery.

## Non-goals

- Paid-media buying, ad-network inventory, bidding or spend optimization.
- Building the future Campaign aggregate or using `campaign_slug` as Promotion identity.
- Freeform page builder, arbitrary embeds or a parallel Promotion renderer.
- Duplicating CTA actions, Forms, Meetings, tool execution, media generation or Commercial/HubSpot workflows.
- Behavioral targeting of authenticated clients in V1.
- AI auto-publish or unreviewed claims/creator rights.
- Statistical experimentation before traffic supports declared MDE/sample size and SRM checks.

## Delta 2026-07-21

Epic created after operator acceptance of the Promotions name, rich multimedia/dynamic-content direction and birth-level Full API Parity. This program and its architecture do not create runtime, migrations, tasks, deployments or external changes by themselves.
