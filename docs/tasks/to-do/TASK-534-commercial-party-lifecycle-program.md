# TASK-534 — Commercial Party Lifecycle & Quote-to-Cash Program

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `umbrella`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `none`
- Branch: `task/TASK-534-commercial-party-lifecycle-program`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Programa oficial para formalizar el lifecycle canonico de la parte comercial (prospect → opportunity → active_client → inactive → churned, mas provider_only y disqualified) sobre `greenhouse_core.organizations` + `greenhouse_core.clients`, habilitar sync bi-direccional con HubSpot companies desde pre-venta (no solo closed-won), permitir creacion de deal inline desde el Quote Builder y cerrar la coreografia quote-to-cash atomica. Cierra el gap que hoy obliga al operador a saltar a HubSpot para cada cotizacion nueva.

## Why This Task Exists

Greenhouse trata al `Cliente` como un estado terminal: una empresa es cliente solo despues de closed-won o cuando es proveedor. Eso rompe la pre-venta porque el selector del Quote Builder solo muestra organizations que ya existen, y las organizations se crean unicamente cuando llega un deal ganado desde HubSpot o al registrar un proveedor. Consecuencia: para cotizar a una empresa nueva el operador (1) abre HubSpot, (2) crea Company, (3) crea Deal, (4) espera al sync de Greenhouse, (5) vuelve al builder. Minutos por cotizacion, dual-write invisible, typos que generan duplicados, revenue pipeline ciego a prospects, y bloqueo estructural para Kortex. El gap arquitectonico es de vocabulario: no existe un estado canonico para "empresa que esta en el funnel pero todavia no es cliente".

## Goal

- Formalizar el contrato canonico de `lifecycle_stage` sobre `organizations` + `clients` sin crear identidades paralelas.
- Habilitar que el Quote Builder cotice contra prospects sin context-switch a HubSpot.
- Abrir el carril outbound de Greenhouse → HubSpot para deals y lifecycle transitions con conflict resolution explicita.
- Cerrar la coreografia `convertQuoteToCash` como comando atomico.
- Entregar un backlog ejecutable, ordenado y detras de feature flags para rollout seguro en 9 fases (A-I).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` — spec canonico creado como norte de este programa
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Extender `organizations` + `clients`, NO crear tabla paralela `commercial_parties`.
- `organization_id` sigue siendo el anchor canonico del Quote Builder (TASK-486 cerrada); `client_id` sigue siendo el anchor contable de Finance.
- Nadie escribe a `organizations.lifecycle_stage` sin pasar por el comando canonico `promoteParty` (audit + outbox + validacion de invariantes).
- El sync HubSpot respeta ownership de campos y anti-ping-pong guard; no se redefinen propiedades owned por HubSpot (name, domain, industry, address).
- Toda operacion tenant-scoped; ningun cross-tenant leak aun para `efeonce_internal`.
- Feature flags obligatorios por fase: rollout incremental sin big-bang.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`
- `docs/operations/MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` (spec normativo del programa)
- `greenhouse_core.organizations`, `greenhouse_core.clients` (existen, ancla canonica)
- `greenhouse_commercial.deals` (existe, TASK-453 cerrada)
- `hubspot-greenhouse-integration` Cloud Run service (existe, gana endpoints nuevos)
- Reactive projections infrastructure (`greenhouse_sync.outbox_events`, worker ops)
- Event catalog canonico

### Blocks / Impacts

- Quote Builder UX (TASK-486, TASK-463, TASK-504): cambia selector y suma drawer de deal inline
- Revenue Pipeline dashboard (TASK-457, TASK-456): gana visibilidad de prospects/opportunities
- MRR/ARR snapshots (TASK-462): extiende la lista fuente de clients sin cambiar contrato
- Admin Center: nueva surface "Commercial Parties" de gestion manual
- Kortex platform: desbloquea el CRM externo que dependia del modelo estable
- TASK-466 (multi-currency quote output): ortogonal, sin cambios
- Finance reports: sin cambios — `client_id` sigue siendo el anchor contable

### Files owned

- `docs/tasks/to-do/TASK-535-party-lifecycle-schema-commands-foundation.md`
- `docs/tasks/to-do/TASK-536-hubspot-companies-inbound-prospect-sync.md`
- `docs/tasks/to-do/TASK-537-party-search-adoption-endpoints.md`
- `docs/tasks/to-do/TASK-538-quote-builder-unified-party-selector.md`
- `docs/tasks/to-do/TASK-539-inline-deal-creation-quote-builder.md`
- `docs/tasks/to-do/TASK-540-hubspot-lifecycle-outbound-sync.md`
- `docs/tasks/to-do/TASK-541-quote-to-cash-atomic-choreography.md`
- `docs/tasks/to-do/TASK-542-party-lifecycle-admin-dashboards.md`
- `docs/tasks/to-do/TASK-543-party-lifecycle-deprecation-flag-cleanup.md`

## Current Repo State

### Already exists

- `greenhouse_core.organizations` como anchor canonico (TASK-486 cerrada) con `hubspot_company_id`
- `greenhouse_core.clients` con FK a organization y `hubspot_company_id`
- `greenhouse_commercial.deals` como mirror canonico de HubSpot deals (TASK-453 cerrada)
- Sync HubSpot → Greenhouse parcial via `src/lib/hubspot/sync-hubspot-company-lifecycle.ts`, `sync-hubspot-deals.ts`, `sync-hubspot-quotes.ts`
- Reactive projection `quotationHubSpotOutbound` (TASK-463) como primer carril outbound
- Contracts canonicos (TASK-460) + MSA (TASK-461) + MRR/ARR snapshots (TASK-462)
- Cloud Run service `hubspot-greenhouse-integration` con POST/PATCH de quotes
- `greenhouse_sync.outbox_events` + worker reactivo operando domain `cost_intelligence`

### Gap

- `organizations` no tiene columna `lifecycle_stage` formal; estado inferido via `spaces` + `fin_client_profiles`
- Sync de companies desde HubSpot solo crea organization en closed-won o provider, nunca para prospects
- No existe comando canonico `promoteParty` ni historial de transiciones (`organization_lifecycle_history`)
- Quote Builder selector solo ve organizations existentes; no lee HubSpot companies como candidates
- No existe endpoint para crear deal outbound desde Greenhouse
- Outbound sync de HubSpot company properties no existe (solo quotes)
- No existe coreografia atomica `convertQuoteToCash`; el flujo es manual multi-step

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Foundation schema + commands

- Crear `TASK-535` (Fase A): DDL + backfill idempotente + comandos CQRS + types + tests unitarios. Flag off, nada visible al usuario.

### Slice 2 — HubSpot inbound extension

- Crear `TASK-536` (Fase B): extender inbound sync para crear `organization` como `prospect` desde companies con `lifecyclestage ∈ {lead, mql, sql, opportunity, customer}`. Flag `GREENHOUSE_PARTY_LIFECYCLE_SYNC`.

### Slice 3 — Party search + adoption endpoints

- Crear `TASK-537` (Fase C): endpoints `GET /api/commercial/parties/search` (unifica PG + HubSpot cache) y `POST /api/commercial/parties/adopt`. Todavia no expuestos en UI.

### Slice 4 — Quote Builder unified selector

- Crear `TASK-538` (Fase D): Quote Builder consume el selector unificado. Flag UI `GREENHOUSE_PARTY_SELECTOR_UNIFIED`. Banner "Prospecto" para candidates HubSpot.

### Slice 5 — Inline deal creation

- Crear `TASK-539` (Fase E): comando `createDealFromQuoteContext` + endpoint `POST /api/commercial/organizations/:id/deals` + drawer "Crear deal nuevo" en Quote Builder + Cloud Run integration service gana `POST /deals`.

### Slice 6 — HubSpot lifecycle outbound

- Crear `TASK-540` (Fase F): proyeccion reactiva `partyHubSpotOutbound` + Cloud Run `PATCH /companies/:id/lifecycle` + conflict resolution + anti-ping-pong.

### Slice 7 — Quote-to-cash choreography

- Crear `TASK-541` (Fase G): comando `convertQuoteToCash` + wiring desde `contract.created` y `deal.won` + audit transaccional.

### Slice 8 — Admin dashboards

- Crear `TASK-542` (Fase H): surfaces en Admin Center para party lifecycle funnel metrics, velocity de conversion, sync conflicts sin resolver, time-in-stage.

### Slice 9 — Deprecation + flag cleanup

- Crear `TASK-543` (Fase I): deprecar endpoint viejo de organizations, remover feature flags tras validacion en staging, cleanup de codigo legacy.

## Out of Scope

- Caso B2C (personas naturales como clientes finales) — fuera de V1.
- Reemplazar HubSpot como CRM; Greenhouse consume y coordina, no compite.
- Tabla nueva `commercial_parties` paralela — explicitamente rechazada en spec §3.2.
- Migrar Finance del `client_id` como anchor — sigue siendo la verdad contable.
- Flujos de renovacion automatica o expansion intra-contrato — gobernados por TASK-462.
- Multi-portal HubSpot (ver open question #2 del spec) — diferido a programa futuro.
- Merge de companies HubSpot — open question #4, diferido.

## Detailed Spec

Programa oficial en 9 fases (A-I) con dependencias causales. Las fases A-G son obligatorias para cerrar el loop quote-to-cash; H-I son hardening y cleanup.

### Orden de ejecucion

1. `TASK-535` (Fase A) — Foundation: schema, comandos, backfill. **Bloqueante para todo lo demas.**
2. `TASK-536` (Fase B) — HubSpot inbound extension. Depende de A.
3. `TASK-537` (Fase C) — Party search + adopt endpoints. Depende de A. Puede ir paralelo a B.
4. `TASK-538` (Fase D) — Quote Builder selector unificado. Depende de C.
5. `TASK-539` (Fase E) — Inline deal creation. Depende de A; se puede implementar paralelo a D.
6. `TASK-540` (Fase F) — HubSpot lifecycle outbound. Depende de A, idealmente despues de F/G para dogfooding interno.
7. `TASK-541` (Fase G) — Quote-to-cash choreography. Depende de A + `TASK-460` (Contracts).
8. `TASK-542` (Fase H) — Admin dashboards. Depende de A, B, F.
9. `TASK-543` (Fase I) — Deprecation + cleanup. Depende de todas las anteriores.

### Decisiones de arquitectura cerradas por esta umbrella

- **Extension, no reemplazo**: se agrega `lifecycle_stage` + `commercial_party_id` + `organization_lifecycle_history` sobre el modelo existente.
- **Anchor sigue siendo `organization_id`** en el Quote Builder; `commercial_party_id` es UUID estable para eventos y proyecciones.
- **Finance no cambia**: `client_id` sigue siendo el anchor contable. Se instancia al cruzar a `active_client`.
- **Conflict resolution HubSpot ↔ Greenhouse**: Greenhouse owns `lifecyclestage` si existe quote/contract activo; HubSpot owns en cualquier otro caso. Timestamp tiebreak en 60s.
- **Feature flags**: rollout por fases detras de flags explicitos, permitiendo rollback quirurgico.
- **Backfill idempotente**: script determinista que puede re-correr sin side effects.

### Preguntas abiertas declaradas

Las 7 open questions del spec §12 quedan heredadas por este programa:

1. Dual-role companies (dos organization_id vs un registro con is_dual_role)
2. HubSpot multi-portal disambiguation
3. Scope outbound de `gh_mrr_clp` (crudo vs tier)
4. Merge de companies HubSpot
5. Frecuencia de sweep `active_client → inactive`
6. Compliance data residency al exponer mas data a HubSpot
7. Pricing HubSpot API calls/mes

Estas preguntas se resuelven durante Discovery de las tasks hijas correspondientes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existen las 9 tasks hijas TASK-535 a TASK-543 registradas en `TASK_ID_REGISTRY.md` y `README.md`.
- [ ] Cada task hija referencia `GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` como spec normativo.
- [ ] El ordenamiento de dependencias (A → B/C → D/E → F/G → H → I) queda explicito en cada task.
- [ ] Cada fase declara su feature flag, si aplica, y su condicion de rollback.
- [ ] El programa deja explicitas las 7 open questions del spec para que Discovery de cada hija las resuelva donde aplique.
- [ ] Al cerrar el programa, todas las hijas estan en `complete` y las 7 open questions tienen respuesta documentada.

## Verification

- revision manual del programa y sus dependencias
- confirmacion de IDs en `docs/tasks/TASK_ID_REGISTRY.md`
- confirmacion de index en `docs/tasks/README.md`
- spec `GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` sigue vivo y coherente con lo implementado al cierre de cada fase

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado con decisiones y learnings del programa
- [ ] `changelog.md` registra el cambio de contrato de lifecycle
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas (TASK-454, TASK-457, TASK-462, Kortex)

## Follow-ups

- `TASK-535` Fase A — Schema + commands foundation
- `TASK-536` Fase B — HubSpot inbound prospect scope
- `TASK-537` Fase C — Party search + adoption endpoints
- `TASK-538` Fase D — Quote Builder unified selector
- `TASK-539` Fase E — Inline deal creation from quote builder
- `TASK-540` Fase F — HubSpot lifecycle outbound sync
- `TASK-541` Fase G — Quote-to-cash atomic choreography
- `TASK-542` Fase H — Admin Center party lifecycle dashboards
- `TASK-543` Fase I — Deprecation + feature flag cleanup

## Open Questions

Heredadas del spec §12 (resolverse en Discovery de la hija correspondiente):

1. Dual-role companies: `is_dual_role=true` vs dos organizations separadas → decidir en TASK-535.
2. Multi-portal HubSpot: composite key `hubspot_portal_id + hubspot_company_id` → decidir en TASK-536.
3. Outbound `gh_mrr_clp`: crudo vs tier (1..5) → decidir en TASK-540.
4. Merge de companies HubSpot: evento `party.merged` + migracion FK → decidir en TASK-540 o diferir.
5. Frecuencia sweep inactive: nocturno vs semanal → decidir en TASK-535 cron spec.
6. Compliance (GDPR / Ley 21.719 Chile) al exponer data a HubSpot → revisar con legal antes de TASK-540.
7. Pricing HubSpot API calls: estimar volumen y confirmar tier suficiente → TASK-539 + TASK-540.
