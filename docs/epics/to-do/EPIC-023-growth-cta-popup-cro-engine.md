# EPIC-023 — Growth CTA & Popup CRO Engine

## Delta 2026-07-18

- **Primera rebanada activa en Think; cierre productivo aún incompleto**: TASK-1339 y TASK-1340
  están `complete/`, pero WordPress, la prueba GA4 consent-aware, la ventana de señales de siete
  días y la reconciliación documental/lifecycle quedan agrupadas en `TASK-1427`.
- El resto de V1 se compacta en cuatro trabajos cohesivos: `TASK-1428` gobierna Tier B,
  suppression/frequency capping y kill switches; `TASK-1429` agrega exactamente un placement
  interruptivo; `TASK-1431` crea el Action Registry extensible con navegación gobernada; y
  `TASK-1430` reúne authoring, lifecycle, surfaces y reporting en un solo cockpit.
- La experiencia visible se gobierna como un sistema, no como skins/campañas sueltas: `TASK-1429` formaliza
  primitive + placement + experience kind + appearance + density + estados/motion; `TASK-1431` agrega el
  contrato perceptible por acción sin elegir estilos; `TASK-1430` autora y previsualiza esos ejes con el renderer
  canónico; `TASK-1428` hace que dismiss/caps/kill switches se sientan coherentes y no invasivos.
- No se crean tasks independientes para documentación, CI ni cada adapter futuro. V1 implementa
  `open_growth_form` y navegación gobernada (`link_url`, `open_think_tool`, `book_meeting`);
  `download_asset`, `embed_growth_form` y `hubspot_handoff` quedan demand-driven.

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
- Un Action Registry gobierna schemas, resolución server-side y proyecciones browser-safe; V1 prueba `open_growth_form`, `link_url`, `open_think_tool` y `book_meeting`, y deja adapters con semántica propia para consumidores reales futuros.
- El cockpit `/growth/ctas` permite autorar/revisar/publicar/pausar/reportar CTAs con Composition Shell, Sidecar, contracts UI y GVC.
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

Sequencing is **vertical-slice-first**, not horizontal-platform-first (Arch §18). The slice is thin on placement/action but **not** on portability — the first surfaces are **co-equal: the live public WordPress site AND Think** (mirrors Growth Forms TASK-1231: WordPress first host + Astro/Think parity). A slice on a single surface would not prove the engine.

- `TASK-1339` — [backend-data] **Foundation scoped to the slice** (not the full platform): minimal `cta_definition`/`cta_version` + immutable published contract, lifecycle `draft→published→paused`, **server-side arbiter**, surface bindings + embed-key + `cta_version↔surface_id` cross-check for **both** `wordpress` and `astro/think`, Tier A conversion ledger with `trust_level`, action router with **only** `open_growth_form`, public + admin API with Full API Parity, one reliability signal. Flag `GROWTH_CTA_ENGINE_ENABLED` default OFF. Out of scope: Tier B exposure, experimentation, other actions/placements. Blocks TASK-1340.
- `TASK-1340` — [ui-ux/platform] **Portable renderer proving the first host contract** (complete): framework-light Web Component `<greenhouse-cta>`, embedded/banner placement, `open_growth_form`, anti-CLS/a11y, `greenhouse_cta_*` events and preview/runtime evidence. Think is live; remaining production closure moved to TASK-1427.
- `TASK-1427` — [ui-ux/integration] **First-slice production closure**: WordPress parity, Think+WordPress smoke, consent-aware GA4 proof, seven-day signal window and lifecycle/operator-doc reconciliation as one closure unit.
- `TASK-1428` — [backend-data] **Exposure, suppression and kill-switch hardening**: Tier B ingest, visitor state, frequency capping, forgeable-ingest defenses and global/per-surface controls. Blocks interruptive rollout and cockpit controls.
- `TASK-1429` — [ui-ux/platform] **CTA Experience System + one interruptive placement** (`slide_in`): formaliza placement/kind/appearance/density/variant, anatomía contextual, profundidad tokenizada, estados y motion; consume TASK-1428 y cubre a11y, focus, mobile y ambos hosts.
- `TASK-1431` — [backend-data/interaction] **Action Registry + governed navigation adapters**: one typed registry and browser-safe executor for `open_growth_form`, `link_url`, `open_think_tool` and navigation-only `book_meeting`, including expectation/state/recovery metadata but no action-driven skins. Blocks action authoring in TASK-1430.
- `TASK-1430` — [ui-ux] **Governed authoring, canonical preview and reporting cockpit** at `/growth/ctas`, reusing existing readers/commands plus TASK-1428 controls and TASK-1431 registry metadata in one Composition Shell workbench; no freeform page builder or parallel preview renderer.
- Deferred demand-driven — `download_asset`, `embed_growth_form` and bounded `hubspot_handoff` only when a real consumer supplies the asset/form/CRM contract and runtime evidence.
- `TASK-TBD` (deferred, post-V1) — [backend-data] Experimentation layer: stable assignment, mutual exclusion, sample ratio mismatch detection, powered-test metadata and guardrail reporting. **Deferred out of V1** (Arch §18 / ADR §Deferred): built only when public traffic supports a powered test; candidate `growth.experiment` split.

## Existing Related Work

- `GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_DECISION_V1.md` and `GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md` — accepted direction for the capability.
- Growth Forms engine (`growth.forms`) — sibling capability and first action target; owns form schema, validation, consent and submission ledger.
- `GREENHOUSE_TRACKING_ENGINE_ARCHITECTURE_V1.md` — proposed tracking architecture; CTA V1 must emit compatible events and avoid a conflicting taxonomy.
- `GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md` and Think public report work — likely first high-value consumer for report follow-up CTAs.
- Public site AEO `/aeo-2/` Growth Forms rollout — proof that portable Growth renderer + WordPress host layer is viable, but CTA prompts must graduate beyond page-local anchors.
- HubSpot CTAs product behavior — benchmark only; HubSpot is not the source of truth for Greenhouse CTA policy.

## Exit Criteria

### V1

- [ ] `growth.cta` foundation has canonical readers/commands, lifecycle, immutable published versions, surface binding checks and event/action primitives under `src/lib/growth/ctas/`.
- [ ] Public render/record APIs and admin APIs exist or are explicitly planned with Full API Parity; no visible workflow is UI-only.
- [ ] Priority arbitration is **server-side**: the renderer receives the resolved 0–1 interruptive + N non-interruptive placements, never the candidate set or the priority policy.
- [ ] Portable renderer ships at least one embedded/banner placement and one interruptive placement (`popup_modal` or `slide_in`) with keyboard, focus return, close/escape, reduced-motion, mobile, horizontal-scroll and **anti-CLS/layout-stability** evidence; preview↔public render the same contract (parity test).
- [ ] Event evidence is **two-tier**: conversion evidence in an audit-grade Postgres ledger; high-volume exposure (`eligible`/`suppressed`/`viewed`) in an analytical/sampled sink, never synchronous OLTP rows.
- [ ] The public ingest treats browser events as **untrusted**: surface `cta_version↔surface_id` cross-check, rate-limit/idempotency, bot filtering; only `server_confirmed` outcomes feed conversion truth. `consent_source` is recorded and gates tracking/personalization.
- [ ] A global/per-surface **kill switch** takes a live CTA down within the render-contract cache TTL, without redeploy.
- [ ] GTM/dataLayer event taxonomy `greenhouse_cta_*` is documented (deliberately distinct from internal `growth.cta.*`), no raw PII reaches browser telemetry, and server-side ledger reconciles with host events.
- [ ] Growth Forms integration proves CTA→form open/submit relationship without duplicating form schema, validation or consent.
- [ ] A typed Action Registry governs policy validation, server resolution and browser-safe execution; V1 proves `open_growth_form` plus safe navigation for link, Think and Meetings without CRM mutation.
- [ ] At least one public surface and one Think or Greenhouse surface consume the same published render contract.
- [ ] Admin cockpit can author/review/publish/pause/report CTAs through commands/readers, not direct table writes.
- [ ] Reliability signals for render, ingest error, ingest backpressure, action, GTM, form handoff, unauthorized surface, kill-switch-active and priority collisions are registered and visible in the reliability plane.
- [ ] Functional/operator docs cover authoring, rollout, GTM setup, QA/GVC gates, privacy/consent guardrails, kill switch and rollback.

### Deferred, post-V1

- [ ] Experimentation layer blocks or clearly labels underpowered tests; no CTA winner can be declared without primary metric, MDE/sample-size plan, guardrails and SRM check. **Not required for V1** — built only when public traffic supports a powered test (candidate `growth.experiment` split).
- [ ] Asset delivery, embedded-form and HubSpot handoff adapters graduate only with a real consumer and their own security/retry/evidence contracts.

## Non-goals

- Replacing Growth Forms or moving form schema/validation/consent into CTAs.
- Making HubSpot CTAs the runtime/source of truth.
- Editing live GTM containers without a dedicated rollout task and operator approval.
- Shipping dark patterns: false scarcity, countdown resets, hidden close controls, confirmshaming, pre-checked opt-ins or noisy stacked popups.
- Creating deals/quotes/commercial workflows silently from CTA clicks.
- Building a full CDP/personalization engine in V1.
- Default iframe embeds; iframe is only a degraded fallback for hostile/restricted hosts.

## Delta 2026-07-04

Epic created after accepting the architecture/ADR for `growth.cta`. No runtime changes, migrations, GTM changes, tasks or deployments are authorized by this epic alone.

## Delta 2026-07-04 — hardening review

Post-creation architecture + product-design review folded into the ADR/spec and this epic:

- Sequencing changed from horizontal-foundation-first to **vertical-slice-first** (real AI Visibility follow-up CTA on Think, end-to-end, before generalizing).
- **Experimentation deferred out of V1** (underpowered public traffic; premature to build the platform before there is traffic to test).
- Event evidence split into **two tiers** (audit-grade conversion in PG vs high-volume exposure in analytical/sampled sink) to respect the dual-store.
- Public ingest hardened as a **forgeable write** (surface cross-check, bot filtering, `trust_level`, server-confirmed-only conversion truth) to protect experiment integrity.
- **Server-side arbitration**, **visitor-state store**, **consent source-of-truth** and a **global kill switch** made explicit hard requirements.
- Renderer contract adds **anti-CLS**, mobile-interstitial constraint and **preview↔public parity test**.

Source: `GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md` §21 + `..._DECISION_V1.md`.
