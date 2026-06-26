# TASK-1260 — Greenhouse Tracking Engine Discovery + Architecture Spike

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `integration`
- Epic: `none`
- Status real: `Discovery`
- Rank: `TBD`
- Domain: `growth|public-site|analytics|hubspot`
- Blocked by: `none`
- Branch: `task/TASK-1260-greenhouse-tracking-engine-discovery`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Discovery/architecture spike para definir un motor propio de tracking Greenhouse: eventos, identidad anonima, consentimiento, attribution, ingestion server-side, reconciliacion con submissions y convivencia con HubSpot/GTM. No implementa runtime ni modifica el plugin HubSpot.

## Why This Task Exists

El renderer Growth Forms ya emite eventos browser-safe `gh_form_*` via `CustomEvent` y `dataLayer`, y HubSpot hoy cubre parte del tracking del sitio publico mediante el plugin `leadin`. Pero eso no equivale a un motor propio: falta decidir source of truth, event schema, identity stitching, consent enforcement, server collection, UTM/referrer attribution, dedupe, retention, export a HubSpot/GA/BigQuery y operabilidad dentro de Greenhouse.

## Goal

- Inventariar el estado actual de tracking en Efeonce: HubSpot scripts, GTM/dataLayer, Growth Forms renderer events y submissions ledger.
- Definir el target architecture de `Greenhouse Tracking Engine V1` con frontera clara entre behavioral analytics, conversion ledger y CRM handoff.
- Proponer event taxonomy, identity model, consent/privacy posture, ingestion pipeline, storage/retention y reconciliation rules.
- Comparar opciones: client-only/dataLayer, server-side collection, hybrid edge/server, HubSpot as destination, BigQuery/warehouse export.
- Entregar ADR/draft architecture + task breakdown implementable posterior.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md`
- `docs/documentation/growth/motor-formularios-publicos.md`

Reglas obligatorias:

- **No modificar el plugin HubSpot `leadin`**: no patch, no fork, no override, no monkey patch. Solo lectura/inventario/comparacion.
- No recolectar PII cruda en analytics. Email, telefono, texto libre, tokens, HubSpot GUIDs internos y valores de campo quedan prohibidos en eventos behavioral.
- El ledger autoritativo de conversiones sigue siendo Greenhouse server-side (`form_submission`, consent snapshot, destination attempts), no el browser.
- El motor propio debe respetar consentimiento/Do Not Track para analytics opcional, manteniendo logs de seguridad/auditoria requeridos.
- WordPress/Astro son host surfaces; HubSpot/GA/GTM/BigQuery son destinos/consumers posibles, no source of truth del motor.

## Normative Docs

- `.codex/skills/hubspot-greenhouse-bridge/SKILL.md`
- `.codex/skills/efeonce-public-site-wordpress/SKILL.md`
- `.codex/skills/greenhouse-secret-hygiene/SKILL.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- `TASK-1229` Growth Forms Backend/API Parity Foundation.
- `TASK-1231` Growth Forms Portable Renderer + Host Surfaces.
- `TASK-1232` Growth Forms Admin Cockpit + First Migration.
- `TASK-1258` and `TASK-1259` for HubSpot embed migration context, but this discovery can start independently.

### Blocks / Impacts

- Future implementation tasks for Greenhouse tracking ingestion, attribution, dashboards and HubSpot/warehouse destinations.
- Public site migration away from HubSpot direct embeds without losing measurement.
- Growth Forms reporting and funnel analysis.
- Future Account 360 / GTM attribution and commercial handoff analytics.

### Files owned

- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_DECISION_V1.md`
- `src/lib/growth/forms/contracts.ts`
- `src/growth-forms-renderer/telemetry.ts`
- `src/growth-forms-renderer/contract.ts`
- `docs/documentation/growth/motor-formularios-publicos.md`
- `docs/manual-de-uso/growth/operar-motor-formularios.md`
- New architecture/ADR doc path to decide during discovery: `docs/architecture/GREENHOUSE_TRACKING_ENGINE_*` [verificar naming]

## Current Repo State

### Already exists

- Growth Forms analytics contract in architecture §15/§15.1.
- `src/lib/growth/forms/contracts.ts` defines browser-safe telemetry events and allowed/forbidden payload keys.
- `src/growth-forms-renderer/telemetry.ts` emits `gh_form_*` `CustomEvent` + optional `window.dataLayer.push()` with a hard allowlist.
- Server-side submissions/destination attempts exist in `greenhouse_growth` via the Growth Forms engine.
- HubSpot currently runs on the public WordPress site as third-party tracking/form infrastructure.

### Gap

- No Greenhouse-owned tracking ingestion endpoint or event ledger exists for public behavioral events.
- No durable visitor/session identity model is defined.
- No consent/retention/Do Not Track policy is formalized for analytics events beyond form submissions.
- No reconciliation model exists between browser events, server submissions, HubSpot contact/activity and future warehouse exports.
- No ADR decides whether Greenhouse tracking is client-only, server-side, hybrid, edge-collected or warehouse-first.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: proposed Greenhouse tracking event ledger and attribution model (discovery only)
- Consumidores afectados: Growth Forms renderer, public site, HubSpot handoff, future analytics/reporting, Commercial/GTM
- Runtime target: `design-only` in this task; future targets likely `public-api|worker|warehouse`

### Contract surface

- Contrato existente a respetar: `greenhouse-growth-public-forms.v1` telemetry policy and server-side conversion ledger.
- Contrato nuevo o modificado: proposed `greenhouse-tracking-events.v1` event envelope, identity envelope and consent envelope.
- Backward compatibility: `compatible` — discovery must not require changing existing renderer events immediately.
- Full API parity: any future tracking write/read must be programmatic and governed, not only GTM snippets or WordPress UI.

### Data model and invariants

- Entidades/tablas/views afectadas: none in this discovery; candidate tables may include `tracking_events`, `visitor_sessions`, `attribution_touches` [verificar].
- Invariantes que no se pueden romper:
  - Browser behavioral event != authoritative conversion.
  - No PII/raw field values in behavioral analytics.
  - Consent state must travel with or be derivable for every optional analytics event.
  - Visitor/session identifiers must be pseudonymous, rotatable and not treated as identity proof.
  - HubSpot cookies (`hutk`) can be attribution context, not authentication or identity truth.
- Tenant/space boundary: initial scope Efeonce public surfaces; future multi-client tracking must be explicitly designed.
- Idempotency/concurrency: event ingestion proposal must include event id/correlation id and dedupe windows.
- Audit/outbox/history: discovery must decide which events are audit-grade vs analytics-grade and how retention differs.

### Migration, backfill and rollout

- Migration posture: `none` in this task.
- Default state: docs/discovery only; no runtime collection added.
- Backfill plan: evaluate whether historical HubSpot/GTM exports matter, but no backfill here.
- Rollback path: N/A — no runtime mutation.
- External coordination: HubSpot/GTM access may be needed for inventory; privacy/legal sign-off required before implementation task.

### Security and access

- Auth/access gate: discovery read-only; no secret changes.
- Sensitive data posture: privacy-critical; no PII extraction during discovery unless already available in Greenhouse governed tables and explicitly needed.
- Error contract: future proposal must use canonical public API errors and avoid raw provider errors.
- Abuse/rate-limit posture: future ingestion endpoint must include public abuse/rate-limit posture; discovery must specify options.

### Runtime evidence

- Local checks: docs/task lint only.
- DB/runtime checks: optional read-only inventory of existing `gh_form_*` event emission and form submission data shape; no mutation.
- Integration checks: optional read-only inspection of HubSpot/GTM presence; plugin stays read-only.
- Reliability signals/logs: propose candidate signals such as `growth.tracking.ingest_error_rate`, `growth.tracking.consent_drop_rate`, `growth.tracking.event_dedupe_rate`.
- Production verification sequence: N/A for discovery; future tasks must define staging/prod rollout.

### Acceptance criteria additions

- [ ] Proposed source of truth for tracking events is explicit.
- [ ] Event, identity, consent and attribution envelopes are specified or explicitly deferred.
- [ ] Privacy/PII invariants and forbidden payloads are documented.
- [ ] HubSpot plugin read-only boundary is repeated in the final ADR/task breakdown.
- [ ] Future implementation tasks are split by backend foundation, host emitters, destinations/exports and reporting.

## Capability Definition of Done — Full API Parity gate

- [ ] Tracking write path is proposed as a governed API/command or ingestion primitive, not a GTM-only side effect.
- [ ] Tracking read path/reporting is proposed as readers/contracts, not direct table scraping.
- [ ] HubSpot/GA/GTM/BigQuery are downstream consumers or destinations, not the only interface.
- [ ] Nexa/MCP/CLI future access path is considered for operational questions like "que campana genero este lead".
- [ ] Parity check = decision recorded.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Current tracking inventory

- Documentar que carga hoy el sitio: HubSpot `js.hs-scripts.com`, forms embed scripts, GTM/dataLayer if present, Growth Forms renderer events and Greenhouse server submissions.
- Capturar un event map read-only: event name, source, payload keys, consent posture, destination, owner and risk.
- Confirmar explicitamente que `leadin`/HubSpot plugin remains read-only.

### Slice 2 — Target event and identity model

- Proponer event taxonomy V1: page/session/form/campaign/conversion/asset/report events.
- Proponer identity model: anonymous visitor id, session id, correlation id, submission id, HubSpot `hutk` handling, email hash boundary, consent snapshot.
- Definir forbidden payloads, retention and dedupe rules.

### Slice 3 — Architecture options and ADR draft

- Comparar client-only/dataLayer, server ingestion, hybrid client+server, edge collection and warehouse export.
- Recomendar V1 with tradeoffs, rollback posture and migration strategy.
- Escribir ADR/draft architecture in `docs/architecture/` with open questions.

### Slice 4 — Implementation task breakdown

- Crear follow-up tasks if approved: ingestion endpoint/event ledger, host emitter adapters, HubSpot/GA/warehouse destinations, reporting/readers.
- Mapear dependencies with `TASK-1258`, `TASK-1259`, Growth Forms and public-site control plane.

## Out of Scope

- Implementar ingestion endpoint, DB migrations, cookies, scripts, dashboards or exports.
- Modificar el plugin HubSpot `leadin` o cualquier archivo del plugin.
- Desinstalar HubSpot, GTM or existing analytics.
- Capturar PII/raw field values for analytics.
- Cambiar el renderer telemetry runtime except for documentation proposals.

## Detailed Spec

La discovery debe partir de una distincion fuerte: **behavioral tracking** mide navegacion e interaccion; **conversion ledger** prueba aceptacion/delivery/handoff; **CRM attribution** conecta contacto/company/deal en HubSpot. El motor propio Greenhouse debe reconciliar estas capas sin mezclar sus fuentes de verdad. HubSpot puede seguir siendo destino/CRM y fuente comparativa, pero no debe definir el modelo interno ni forzar cambios sobre su plugin.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (inventory) -> Slice 2 (model) -> Slice 3 (ADR/options) -> Slice 4 (task breakdown).
- Slice 3 no puede recomendar implementacion sin Slice 1/2 completos.
- Slice 4 no debe crear tasks de implementation si el ADR conserva open questions bloqueantes de privacidad/legal.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Confundir analytics browser con conversion autoritativa | growth / analytics | high | separar behavioral events vs conversion ledger en ADR | review de arquitectura |
| Diseñar tracking que recolecta PII innecesaria | privacy / legal | high | forbidden payloads + consent/retention model | privacy review |
| Acoplar el motor a HubSpot/plugin | hubspot / public-site | medium | plugin read-only; HubSpot como destination/context | task review |
| Over-engineering antes de first migration | growth / ops | medium | V1 incremental, event envelope minimo, rollout por surface | scope review |
| Perder attribution al retirar embeds directos | crm / gtm | medium | reconciliation plan with `hutk`, UTM, page URI and submission ids | future smoke mismatch |

### Feature flags / cutover

- N/A — discovery only.
- Future implementation must propose default-OFF flags per host surface and per destination/export.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert docs/artifacts | <5 min | si |
| Slice 2 | revert docs/artifacts | <5 min | si |
| Slice 3 | supersede ADR draft or mark rejected | <10 min | si |
| Slice 4 | close/update follow-up tasks | <10 min | si |

### Production verification sequence

N/A — discovery/documentation only. Any future runtime implementation must define staging smoke, public-site capture, consent tests, payload leak tests and destination reconciliation before production.

### Out-of-band coordination required

- Optional read-only HubSpot/GTM access for inventory.
- Privacy/legal review before implementation tasks that set cookies, collect server events or export analytics.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Current tracking inventory names each source, destination, payload class and owner.
- [ ] ADR/draft architecture defines event envelope, identity model, consent posture, attribution model and retention stance.
- [ ] HubSpot plugin `leadin` is explicitly read-only in every proposed option.
- [ ] V1 recommendation explains what Greenhouse owns vs what HubSpot/GTM/GA/warehouse consume.
- [ ] Future task breakdown is sequenced and split by backend foundation, host adapters, destinations and reporting.
- [ ] No runtime code, plugin edits, DB migrations or analytics collection changes are made in this task.

## Verification

- `pnpm task:lint --task TASK-1260`
- `pnpm ops:lint --changed`
- Manual doc review against Growth Forms architecture §15/§15.1
- Optional read-only browser/network evidence for current public-site tracking inventory

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con decision/open questions
- [ ] `changelog.md` actualizado only if architecture/process changes
- [ ] chequeo de impacto cruzado sobre `TASK-1258`, `TASK-1259`, `TASK-1231`, `TASK-1232`
- [ ] follow-up tasks/ADR linked from this task

## Follow-ups

- Backend implementation task for tracking ingestion/event ledger.
- Host adapter task for WordPress/Astro event emitters if the renderer needs expansion.
- Destination/export task for HubSpot/GA/GTM/BigQuery reconciliation.
- Reporting/readers task for Growth funnel and attribution surfaces.

## Open Questions

- ¿V1 debe partir por server ingestion propio o por reconciliar `dataLayer` + server submissions?
- ¿Necesitamos cookie first-party Greenhouse o basta session/correlation id por surface en V1?
- ¿Cual sera el destino analitico principal: Greenhouse Postgres, BigQuery, HubSpot activity timeline, GA4 o una combinacion?
