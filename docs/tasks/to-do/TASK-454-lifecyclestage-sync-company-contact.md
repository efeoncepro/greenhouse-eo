# TASK-454 — HubSpot lifecyclestage sync on canonical Company + Contact

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `none`
- Branch: `task/TASK-454-lifecyclestage-sync-company-contact`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Sincronizar el atributo `lifecyclestage` de HubSpot sobre companies (y contacts si aplica) en Greenhouse, surfaceándolo como columna denormalizada en `greenhouse_core.clients`. Habilita clasificar oportunidades pre-sales vs contract vs expansion sin canonicalizar el objeto Lead completo.

## Why This Task Exists

El modelo híbrido de revenue pipeline (TASK-457) necesita distinguir quotes a lead-stage vs customer-stage. Hoy Greenhouse solo conoce si un cliente "existe" pero no su etapa de ciclo comercial. Sin `lifecyclestage`, la clasificación pre-sales/contract no es derivable y el pipeline mezcla oportunidades cualitativamente distintas.

HubSpot mantiene `lifecyclestage` en Contact y Company con valores canónicos: `subscriber`, `lead`, `marketingqualifiedlead`, `salesqualifiedlead`, `opportunity`, `customer`, `evangelist`, `other`. El Lead object nuevo (2024) es workflow de SDR y queda fuera de Greenhouse — solo importa el `lifecyclestage` ya presente en Company/Contact.

## Goal

- `greenhouse_core.clients` tiene columna `lifecyclestage` actualizada vía sync periódico
- Reader helper devuelve el stage actual del cliente para consumo en UI y projections
- Evento `crm.company.lifecyclestage_changed` disponible en outbox para reactive projections downstream
- Persona-360, Client-360 y futuras vistas pueden filtrar/segmentar por stage

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`

Reglas obligatorias:

- HubSpot es source of truth; Greenhouse no edita `lifecyclestage`
- No canonicalizar el objeto Lead como entidad separada — Lead stays in HubSpot
- Respetar la convención de `greenhouse_core` como schema de canonical identity

## Normative Docs

- `src/lib/hubspot/` — HubSpot client existente
- `src/lib/hubspot/sync-hubspot-companies.ts` `[verificar]` — si ya hay sync de companies, extender en vez de duplicar

## Dependencies & Impact

### Depends on

- `greenhouse_core.clients.hubspot_company_id` ya existe
- HubSpot integration service activo

### Blocks / Impacts

- TASK-455 — quote_sales_context (captura snapshot de lifecyclestage)
- TASK-457 — UI pipeline híbrido (classifier depende de lifecyclestage)
- Mejoras futuras en Client-360, Agency pulse, person-intelligence segmentation

### Files owned

- `migrations/[verificar]-task-454-lifecyclestage-column.sql`
- `src/lib/hubspot/sync-hubspot-company-lifecycle.ts` (nuevo o extensión a sync-hubspot-companies.ts existente `[verificar]`)
- `src/lib/sync/event-catalog.ts` (agregar events)
- `src/lib/crm/company-lifecycle-events.ts` (nuevo)
- `src/types/db.d.ts` (auto-regen)

## Current Repo State

### Already exists

- `greenhouse_core.clients` con `hubspot_company_id`
- Pattern de sync inbound en `src/lib/hubspot/`
- Cron pattern `/api/cron/hubspot-*-sync`

### Gap

- `lifecyclestage` no se persiste en `clients`
- No hay evento outbox que notifique cambio de stage
- UI y projections no tienen modo de distinguir lead-stage de customer-stage

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Column + enum

- Agregar `lifecyclestage text` + `lifecyclestage_updated_at timestamptz` a `greenhouse_core.clients`
- Opcional: CHECK constraint con valores canónicos HubSpot (`subscriber`, `lead`, `marketingqualifiedlead`, `salesqualifiedlead`, `opportunity`, `customer`, `evangelist`, `other`, `unknown`)
- Default `'unknown'` para backfill
- Grants runtime (SELECT — el cambio es read-only para runtime) + migrator (DDL)

### Slice 2 — Sync inbound

- Handler que lee `lifecyclestage` desde HubSpot API (bulk endpoint) y upsertea en `clients`
- Si ya existe `sync-hubspot-companies.ts`, extender ese; sino crear `sync-hubspot-company-lifecycle.ts`
- Publicar evento `crm.company.lifecyclestage_changed` solo cuando el valor cambia (no noise)
- Cron cadence: cada 6h (lifecyclestage no cambia tan rápido)

### Slice 3 — Event catalog + publisher

- Agregar en event-catalog: `companyLifecycleStageChanged: 'crm.company.lifecyclestage_changed'`
- Publisher `publishCompanyLifecycleStageChanged({ clientId, hubspotCompanyId, fromStage, toStage })`
- No reactive consumer en este corte — solo registro

## Out of Scope

- Canonicalizar el objeto Lead de HubSpot como entidad separada en Greenhouse
- Sync de Contact lifecyclestage (stretch goal; this task only covers Company — Contact sync queda para follow-up)
- UI para editar o ver lifecyclestage
- Outbound: Greenhouse no escribe a HubSpot

## Detailed Spec

### Migration

```sql
ALTER TABLE greenhouse_core.clients
  ADD COLUMN IF NOT EXISTS lifecyclestage text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS lifecyclestage_updated_at timestamptz;

ALTER TABLE greenhouse_core.clients
  ADD CONSTRAINT clients_lifecyclestage_valid
  CHECK (lifecyclestage IN (
    'subscriber', 'lead', 'marketingqualifiedlead', 'salesqualifiedlead',
    'opportunity', 'customer', 'evangelist', 'other', 'unknown'
  )) NOT VALID;
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
- [ ] `greenhouse_core.clients.lifecyclestage` poblado para al menos 80% de clientes con `hubspot_company_id`
- [ ] Cron corre sin error en staging
- [ ] Evento `crm.company.lifecyclestage_changed` aparece en outbox cuando cambia un stage
- [ ] Reader `getClientLifecycleStage(clientId)` devuelve valor actual

## Verification

- `pnpm migrate:up`
- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test`
- Validación manual: trigger sync en staging, `SELECT lifecyclestage, COUNT(*) FROM greenhouse_core.clients GROUP BY 1`

## Closing Protocol

- [ ] `Lifecycle` sincronizado con carpeta
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] Chequeo de impacto cruzado con TASK-455, TASK-457
- [ ] Registrar evento nuevo en `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

## Follow-ups

- Sync equivalente para Contact-level lifecyclestage si se requiere downstream
- TASK-455 consume este sync para capturar snapshot en quote

## Open Questions

- ¿Hay ya un sync de companies activo que solo le falta esta columna? Si sí, extenderlo en lugar de crear uno nuevo (verificar en Discovery).
