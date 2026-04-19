# TASK-455 — Quote Sales Context Snapshot

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Implementado`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-454 (lifecyclestage sync)`
- Branch: `task/TASK-455-quote-sales-context-snapshot`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Capturar un snapshot del contexto comercial local al momento en que una cotización pasa a `sent` (lifecycle client-scoped, dealstage si existe deal asociado y categoría histórica derivada). Provee trazabilidad histórica: "esta quote se mandó cuando la cuenta era lead, no cuando era customer", sin depender de lookups live a HubSpot.

## Why This Task Exists

Hoy la quote tiene `hubspot_deal_id` pero no sabemos en qué momento del lifecycle de la cuenta se envió. Si una quote se envió a un lead y 6 meses después la cuenta se convierte en customer, perdemos la información "esto era una oportunidad pre-sales". Sin snapshot, el análisis de conversion rate lead→quote→deal→customer queda incompleto y falta trazabilidad histórica para reporting y auditoría comercial.

## Goal

- Cada quote tiene un `sales_context_at_sent` JSONB con snapshot del contexto comercial local al momento de quedar `sent`
- El snapshot se captura en el mismo flujo transaccional que marca `status='sent'`
- Reader expone `getQuoteSalesContext(...)` para detalle, auditoría y analytics
- El snapshot queda disponible para reporting histórico, sin reemplazar el classifier vivo de TASK-457

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`

Reglas obligatorias:

- Snapshot es immutable una vez capturado — no se re-escribe si lifecyclestage cambia después
- No se hace lookup a HubSpot en hot path del send — usar valores ya sincronizados localmente (TASK-454 + TASK-453)
- Respetar JSONB schema estable para consumers downstream
- Cubrir los dos caminos reales hacia `sent`: `/api/finance/quotes/[id]/send` y la resolución final del flujo de aprobación
- **Crítico — snapshot es para analytics, NO para classification de UI**: el classifier del pipeline híbrido (TASK-457) lee estado **vivo** de `clients.lifecyclestage` + `deals.dealstage`, no el snapshot. Esto permite que una quote a lead transicione automáticamente a Deal cuando el lead califica. El snapshot queda solo como trazabilidad histórica para reporting (conversion funnel lead→quote→deal→won).

## Normative Docs

- `src/app/api/finance/quotes/[id]/send/route.ts` — handler de send
- `src/app/api/finance/quotes/[id]/approve/route.ts` — entrypoint de decisiones de aprobación
- `src/lib/commercial/governance/approval-steps-store.ts` — flujo que también puede marcar `sent`
- `src/lib/commercial/governance/audit-log.ts` — audit trail de quotation

## Dependencies & Impact

### Depends on

- TASK-454 — lifecyclestage en clients
- TASK-453 — deals canónicos (opcional para dealstage snapshot)

### Blocks / Impacts

- TASK-457 — UI híbrido (puede leer snapshot solo como contexto histórico, no para classifier vivo)
- Analytics de conversion funnel (lead→quote→deal→won)

### Files owned

- `migrations/[verificar]-task-455-quote-sales-context.sql`
- `src/app/api/finance/quotes/[id]/send/route.ts` (extender)
- `src/app/api/finance/quotes/[id]/approve/route.ts` o `src/lib/commercial/governance/approval-steps-store.ts` (cubrir segundo camino a sent)
- `src/lib/finance/quotation-canonical-store.ts` (extender reader)
- `src/lib/commercial/sales-context.ts` (nuevo — builder de snapshot)
- `src/types/db.d.ts` (auto-regen)

## Current Repo State

### Already exists

- `greenhouse_commercial.quotations` con `hubspot_deal_id`, `hubspot_quote_id`
- Endpoint `/api/finance/quotes/[id]/send` que puede transicionar draft→sent y registra audit
- Flujo de aprobación que puede terminar en `sent`
- Publisher `publishQuoteSent` en outbox

### Gap

- No se persiste lifecyclestage ni dealstage al momento del send
- No existe helper compartido que capture snapshot cuando la quote entra a `sent`
- Consumers downstream pierden context histórico

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema + type

- Agregar `sales_context_at_sent JSONB` a `greenhouse_commercial.quotations`
- Shape:

```json
{
  "captured_at": "2026-04-18T02:00:00Z",
  "lifecyclestage": "salesqualifiedlead",
  "dealstage": "qualifiedtobuy",
  "deal_id": "dl-abc-123" | null,
  "hubspot_deal_id": "HS-456" | null,
  "hubspot_lead_id": null,
  "is_standalone": false,
  "category_at_sent": "deal" | "contract" | "pre-sales"
}
```

### Slice 2 — Builder + writer

- `buildSalesContextSnapshot(...) → SalesContextSnapshot`
- Lee `clients.lifecyclestage` y `deals.dealstage` desde runtime local tenant-scoped
- Deriva `category_at_sent` con una regla histórica explícita y reusable, sin depender del classifier vivo de TASK-457
- Se invoca en ambos caminos que pueden dejar `status='sent'`

### Slice 3 — Reader + consumer hook

- `getQuoteSalesContext(quotationId) → SalesContextSnapshot | null`
- Expuesto en response de `/api/finance/quotes/[id]`
- Consumers analíticos y de detalle lo pueden leer como contexto histórico

## Out of Scope

- Snapshot re-capture (no recompute on lifecyclestage change downstream)
- Snapshots para eventos que no sean `send` (create, approve, reject, etc.)
- Historial per-version en `quotation_versions` para re-envíos futuros
- Capturar full payload HubSpot — solo los campos críticos

## Detailed Spec

### Migration

```sql
ALTER TABLE greenhouse_commercial.quotations
  ADD COLUMN IF NOT EXISTS sales_context_at_sent jsonb;

CREATE INDEX IF NOT EXISTS idx_quotations_sales_context_category
  ON greenhouse_commercial.quotations
  ((sales_context_at_sent ->> 'category_at_sent'))
  WHERE sales_context_at_sent IS NOT NULL;
```

### Builder function

```typescript
export interface SalesContextSnapshot {
  capturedAt: string
  lifecyclestage: string
  dealstage: string | null
  dealId: string | null
  hubspotDealId: string | null
  hubspotLeadId: string | null
  isStandalone: boolean
  categoryAtSent: 'deal' | 'contract' | 'pre-sales'
}

export const buildSalesContextSnapshot = async (params: {
  quotationId: string
  spaceId: string
}): Promise<SalesContextSnapshot>
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Migration idempotente
- [x] Al pasar una quote a `sent`, `sales_context_at_sent` queda poblado en ambos caminos soportados
- [x] Quotes ya existentes mantienen NULL (backfill opcional, fuera de scope)
- [x] Shape de JSONB pasa JSON schema validation en los 3 escenarios (deal, contract, pre-sales)
- [x] Reader expuesto y devuelve null si la quote no ha sido enviada

## Verification

- `pnpm pg:connect:migrate`
- `pnpm exec vitest run src/lib/commercial/sales-context.test.ts`
- `pnpm lint`
- `pnpm build`
- `rg -n "new Pool\\(" src -g '!src/lib/postgres/client.ts'`

## Closing Protocol

- [x] `Lifecycle` sincronizado con carpeta
- [x] Archivo en carpeta correcta
- [x] `docs/tasks/README.md` sincronizado
- [x] `Handoff.md` actualizado
- [x] Chequeo de impacto cruzado con TASK-457

## Follow-ups

- Backfill histórico para quotes ya enviadas (opcional, costo: joins contra snapshots de lifecyclestage que probablemente no existan)
- Event `commercial.quotation.sales_context_captured` si downstream consumers lo ameritan
- Variante future-proof per-version si el negocio necesita historial de re-envíos

## Open Questions

- ¿Conviene promover más adelante este snapshot a grain per-version en `quotation_versions` para cubrir re-envíos sin ambigüedad?
