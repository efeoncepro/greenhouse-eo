# TASK-454 — HubSpot lifecyclestage sync on canonical Company + Contact

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Complete`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `none`
- Branch: `task/TASK-454-lifecyclestage-sync-company-contact`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Sincronizar el atributo `lifecyclestage` de HubSpot sobre la company canónica del runtime Greenhouse, preservando el source projection en `greenhouse_crm.companies` y denormalizando el stage actual en `greenhouse_core.clients` como bridge de compatibilidad para consumers legacy client-scoped. Este corte no canonicaliza el objeto Lead ni reabre el contrato de Contact; habilita clasificar oportunidades pre-sales vs contract vs expansion sin depender de live reads a HubSpot.

## Why This Task Exists

El modelo híbrido de revenue pipeline (TASK-457) necesita distinguir quotes a lead-stage vs customer-stage. Hoy Greenhouse solo conoce si un cliente "existe" pero no su etapa de ciclo comercial. Sin `lifecyclestage`, la clasificación pre-sales/contract no es derivable y el pipeline mezcla oportunidades cualitativamente distintas.

HubSpot mantiene `lifecyclestage` en Contact y Company con valores canónicos: `subscriber`, `lead`, `marketingqualifiedlead`, `salesqualifiedlead`, `opportunity`, `customer`, `evangelist`, `other`. El Lead object nuevo (2024) es workflow de SDR y queda fuera de Greenhouse — solo importa el `lifecyclestage` ya presente en Company/Contact.

## Goal

- `greenhouse_core.clients` tiene `lifecyclestage` denormalizado y actualizado vía sync periódico como compatibility bridge
- el source projection runtime en `greenhouse_crm.companies.lifecycle_stage` sigue siendo la lectura CRM detallada; no se duplica como segundo sistema de verdad
- reader helper devuelve el stage actual del cliente a partir del runtime PostgreSQL, sin live call a HubSpot
- evento `crm.company.lifecyclestage_changed` disponible en outbox para consumers downstream
- Client runtime, Finance y futuras vistas pueden filtrar/segmentar por stage sin recalcularlo inline

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`

Reglas obligatorias:

- HubSpot es source of truth; Greenhouse no edita `lifecyclestage`
- No canonicalizar el objeto Lead como entidad separada — Lead stays in HubSpot
- respetar que el runtime company actual ya se reparte entre:
  - `greenhouse_core.organizations` como root operativo organization-first
  - `greenhouse_core.spaces` como contexto operativo
  - `greenhouse_finance.client_profiles` como bridge financiero
  - `greenhouse_core.clients` como bridge legacy client-scoped
  - `greenhouse_crm.companies` como source projection CRM
- `lifecyclestage` en `greenhouse_core.clients` se trata como denormalized compatibility field, no como nuevo root canónico de company

## Normative Docs

- `src/lib/integrations/hubspot-greenhouse-service.ts` — HubSpot company/contact live reads ya existentes
- `src/lib/finance/canonical.ts` — resolución canónica `organizationId / clientId / clientProfileId / hubspotCompanyId`
- `src/lib/account-360/facets/crm.ts` — lectura runtime actual desde `greenhouse_crm.companies`
- `scripts/sync-source-runtime-projections.ts` — projection runtime actual de companies/contacts desde BigQuery a PostgreSQL
- `src/lib/hubspot/` — no existe hoy `sync-hubspot-companies.ts`; si se crea nuevo sync, debe seguir los patrones de quotes/services y no duplicar contratos existentes

## Dependencies & Impact

### Depends on

- `greenhouse_core.clients.hubspot_company_id` ya existe
- `greenhouse_core.organizations.hubspot_company_id` ya existe y es el join operativo más estable para resolver Space / Organization
- `greenhouse_crm.companies.lifecycle_stage` ya existe como projection runtime
- HubSpot integration service activo

### Blocks / Impacts

- TASK-455 — quote_sales_context (captura snapshot de lifecyclestage)
- TASK-457 — UI pipeline híbrido (classifier depende de lifecyclestage)
- Mejoras futuras en Client-360, Agency pulse, person-intelligence segmentation

### Files owned

- `migrations/[verificar]-task-454-lifecyclestage-column.sql`
- `src/lib/hubspot/sync-hubspot-company-lifecycle.ts` (nuevo)
- `src/app/api/cron/hubspot-company-lifecycle-sync/route.ts` (nuevo)
- `src/lib/sync/event-catalog.ts` (agregar events)
- `src/lib/hubspot/company-lifecycle-events.ts` (nuevo)
- `src/lib/hubspot/company-lifecycle-store.ts` o helper equivalente (nuevo, si hace falta para reader)
- `src/types/db.d.ts` (auto-regen)

## Current Repo State

### Already exists

- `greenhouse_core.clients` con `hubspot_company_id`
- `greenhouse_core.organizations` con `hubspot_company_id`
- `greenhouse_crm.companies.lifecycle_stage` y `greenhouse_crm.contacts.lifecycle_stage`
- pattern de sync inbound en `src/lib/hubspot/` y `src/lib/services/service-sync.ts`
- Cron pattern `/api/cron/hubspot-*-sync`

### Gap

- `lifecyclestage` no se denormaliza todavía en `greenhouse_core.clients`
- no existe un sync canónico de company lifecycle en `src/lib/hubspot/`
- No hay evento outbox que notifique cambio de stage
- no existe helper de lectura tipo `getClientLifecycleStage(clientId)`
- varios consumers siguen pudiendo leer stage por live call o por CRM facet, pero no existe bridge simple client-scoped para clasificación cross-module

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Column + source metadata en `greenhouse_core.clients`

- Agregar `lifecyclestage text` + `lifecyclestage_updated_at timestamptz` + `lifecyclestage_source text` a `greenhouse_core.clients`
- `lifecyclestage_source` indica el origen del valor: `'hubspot_sync'`, `'nubox_fallback'`, `'manual_override'`, `'unknown'`
- CHECK constraint con valores canónicos HubSpot (`subscriber`, `lead`, `marketingqualifiedlead`, `salesqualifiedlead`, `opportunity`, `customer`, `evangelist`, `other`, `unknown`)
- fallback Nubox se limita a rows legacy de `greenhouse_core.clients` sin `hubspot_company_id` pero con evidencia económica runtime (`greenhouse_finance.income`) y sin stage previo; no debe reescribir rows ya sincronizadas ni inventar una taxonomía Nubox más amplia que la que hoy existe
- Default `'unknown'` para el resto sin información
- Grants runtime (SELECT — el cambio es read-only para runtime) + migrator (DDL)

### Slice 2 — Sync inbound

- Handler que lee `lifecyclestage` desde HubSpot integration service y actualiza `greenhouse_core.clients`
- Crear `sync-hubspot-company-lifecycle.ts` siguiendo el patrón de `sync-hubspot-quotes.ts` / `service-sync.ts`
- Resolver el universo de sync por `greenhouse_core.organizations.hubspot_company_id`, derivando `space_id` y `client_id` cuando existan
- Sync solo escribe si `lifecyclestage_source != 'manual_override'` (respeta overrides manuales de Admin)
- Sync puede usar como referencia el source projection ya materializado en `greenhouse_crm.companies.lifecycle_stage`, pero el writer de este corte debe dejar explícito cuál es la fuente efectiva (`hubspot live` vs `crm projection`) y no duplicar lógica de mapping innecesaria
- Publicar evento `crm.company.lifecyclestage_changed` solo cuando el valor cambia (no noise)
- Cron cadence: cada 6h (lifecyclestage no cambia tan rápido)

### Slice 3 — Event catalog + publisher

- Agregar en event-catalog: `companyLifecycleStageChanged: 'crm.company.lifecyclestage_changed'`
- Publisher `publishCompanyLifecycleStageChanged({ clientId, organizationId, spaceId, hubspotCompanyId, fromStage, toStage, source })`
- No reactive consumer en este corte — solo registro

### Slice 4 — Reader helper

- Exponer `getClientLifecycleStage(clientId)` leyendo PostgreSQL runtime
- Resolver como primera fuente `greenhouse_core.clients.lifecyclestage`
- devolver metadata mínima útil para downstream (`stage`, `source`, `updatedAt`, `hubspotCompanyId`)

## Out of Scope

- Canonicalizar el objeto Lead de HubSpot como entidad separada en Greenhouse
- Reabrir o rediseñar `greenhouse_crm.contacts.lifecycle_stage`; Contact sync queda para follow-up
- UI para editar o ver lifecyclestage
- Outbound: Greenhouse no escribe a HubSpot
- Reanclar Finance/Account runtime para que deje de depender de `clients`; este corte solo agrega un bridge de compatibilidad

## Detailed Spec

### Migration

```sql
ALTER TABLE greenhouse_core.clients
  ADD COLUMN IF NOT EXISTS lifecyclestage text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS lifecyclestage_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS lifecyclestage_source text DEFAULT 'unknown';

ALTER TABLE greenhouse_core.clients
  ADD CONSTRAINT clients_lifecyclestage_valid
  CHECK (lifecyclestage IN (
    'subscriber', 'lead', 'marketingqualifiedlead', 'salesqualifiedlead',
    'opportunity', 'customer', 'evangelist', 'other', 'unknown'
  )) NOT VALID;

ALTER TABLE greenhouse_core.clients
  ADD CONSTRAINT clients_lifecyclestage_source_valid
  CHECK (lifecyclestage_source IN (
    'hubspot_sync', 'nubox_fallback', 'manual_override', 'unknown'
  )) NOT VALID;

-- Backfill only legacy client-bridge rows that already show economic evidence
UPDATE greenhouse_core.clients c
SET lifecyclestage = 'customer',
    lifecyclestage_source = 'nubox_fallback',
    lifecyclestage_updated_at = NOW()
WHERE hubspot_company_id IS NULL
  AND COALESCE(c.lifecyclestage, 'unknown') = 'unknown'
  AND EXISTS (
    SELECT 1 FROM greenhouse_finance.income i
    WHERE i.client_id = c.client_id
  );
```

### Sync helper signature

```typescript
export const syncHubspotCompanyLifecycles = async (): Promise<{
  processed: number
  updated: number
  changed: number  // lifecyclestage actually differed
}>
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Migration aplica idempotente en develop + prod
- [x] `greenhouse_core.clients.lifecyclestage` poblado para el universo activo con `hubspot_company_id` validado en dev local (`processed: 9`, `updated: 9`)
- [x] `greenhouse_core.clients.lifecyclestage_source` distingue `hubspot_sync` vs `nubox_fallback` vs `unknown`
- [ ] Cron corre sin error en staging
- [x] Evento `crm.company.lifecyclestage_changed` se publica en el mismo flujo transaccional que el cambio de stage
- [x] Reader `getClientLifecycleStage(clientId)` devuelve valor actual

## Verification

- `pnpm migrate:up`
- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test`
- Validación manual: trigger sync en staging, `SELECT lifecyclestage, COUNT(*) FROM greenhouse_core.clients GROUP BY 1`

### Verification Notes

- `pnpm pg:doctor` -> runtime PostgreSQL sano
- `pnpm pg:connect:migrate` -> migración aplicada y `src/types/db.d.ts` regenerado
- `pnpm exec vitest run src/lib/sync/event-catalog.test.ts src/lib/hubspot/company-lifecycle-store.test.ts` -> passing
- `pnpm exec tsc --noEmit --incremental false` -> passing
- `pnpm lint` -> passing
- `pnpm test` -> `302` files, `1375` tests passing, `2` skipped
- `pnpm build` -> passing
- `GET http://127.0.0.1:3002/api/cron/hubspot-company-lifecycle-sync` con `CRON_SECRET` local -> `processed: 9`, `updated: 9`, `changed: 9`, `errors: []`
- lectura runtime post-sync en dev:
  - `customer / hubspot_sync` -> `9`
  - `customer / nubox_fallback` -> `1`
  - `unknown / unknown` -> `3`
- pendiente post-merge: validación explícita de la cron route en `staging`

## Closing Protocol

- [x] `Lifecycle` sincronizado con carpeta
- [x] Archivo en carpeta correcta
- [x] `docs/tasks/README.md` sincronizado
- [x] `Handoff.md` actualizado
- [x] Chequeo de impacto cruzado con TASK-455, TASK-457
- [x] Registrar evento nuevo en `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

## Follow-ups

- Sync equivalente para Contact-level lifecyclestage si se requiere downstream
- TASK-455 consume este sync para capturar snapshot en quote

## Open Questions

- ¿El writer de este corte debe leer HubSpot live en cada corrida o puede apoyarse sobre `greenhouse_crm.companies.lifecycle_stage` cuando ese projection ya esté fresco?
