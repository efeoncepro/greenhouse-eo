# TASK-455 — Quote Sales Context Snapshot

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-454 (lifecyclestage sync)`
- Branch: `task/TASK-455-quote-sales-context-snapshot`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Capturar un snapshot del contexto comercial HubSpot (lifecyclestage, lead_id si aplica, dealstage al momento de envío) en cada cotización cuando se manda al cliente. Provee trazabilidad histórica: "esta quote se mandó cuando la cuenta era lead, no cuando era customer".

## Why This Task Exists

Hoy la quote tiene `hubspot_deal_id` pero no sabemos en qué momento del lifecycle de la cuenta se envió. Si una quote se envió a un lead y 6 meses después la cuenta se convierte en customer, perdemos la información "esto era una oportunidad pre-sales". Sin snapshot, el análisis de conversion rate lead→quote→deal→customer queda incompleto y el pipeline híbrido (TASK-457) no puede clasificar correctamente la quote por su context original.

## Goal

- Cada quote tiene un `sales_context_at_sent` JSONB con snapshot del estado HubSpot
- El snapshot se captura en el evento `commercial.quotation.sent` y se persiste en la quote
- Reader expone `getQuoteSalesContext(quotationId)` para UI y analytics
- Pipeline classifier (TASK-457) puede usar este snapshot para resolver category histórica

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
- **Crítico — snapshot es para analytics, NO para classification de UI**: el classifier del pipeline híbrido (TASK-457) lee estado **vivo** de `clients.lifecyclestage` + `deals.dealstage`, no el snapshot. Esto permite que una quote a lead transicione automáticamente a Deal cuando el lead califica. El snapshot queda solo como trazabilidad histórica para reporting (conversion funnel lead→quote→deal→won).

## Normative Docs

- `src/app/api/finance/quotes/[id]/send/route.ts` — handler de send
- `src/lib/commercial/governance/audit-log.ts` — event de sent

## Dependencies & Impact

### Depends on

- TASK-454 — lifecyclestage en clients
- TASK-453 — deals canónicos (opcional para dealstage snapshot)

### Blocks / Impacts

- TASK-457 — UI híbrido (classifier puede usar snapshot histórico)
- Analytics de conversion funnel (lead→quote→deal→won)

### Files owned

- `migrations/[verificar]-task-455-quote-sales-context.sql`
- `src/app/api/finance/quotes/[id]/send/route.ts` (extender)
- `src/lib/finance/quotation-canonical-store.ts` (extender writer)
- `src/lib/commercial/sales-context.ts` (nuevo — builder de snapshot)
- `src/types/db.d.ts` (auto-regen)

## Current Repo State

### Already exists

- `greenhouse_commercial.quotations` con `hubspot_deal_id`, `hubspot_quote_id`
- Endpoint `/api/finance/quotes/[id]/send` que transiciona draft→sent y registra audit
- Publisher `publishQuoteSent` en outbox

### Gap

- No se persiste lifecyclestage ni dealstage al momento del send
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
  "hubspot_lead_id": "HS-Lead-789" | null,
  "is_standalone": false,
  "category_at_sent": "deal" | "contract" | "pre-sales"
}
```

### Slice 2 — Builder + writer

- `buildSalesContextSnapshot({ clientId, quotationId }) → SalesContextSnapshot`
- Lee `clients.lifecyclestage`, `deals.dealstage` via helpers locales
- Deriva `category_at_sent` con la misma lógica que usará el classifier del pipeline híbrido
- Se invoca dentro del handler de `/send` antes de transicionar status

### Slice 3 — Reader + consumer hook

- `getQuoteSalesContext(quotationId) → SalesContextSnapshot | null`
- Expuesto en response de `/api/finance/quotes/[id]` (opcional si es admin/finance viewer)
- TASK-457 lo consume para clasificación histórica

## Out of Scope

- Snapshot re-capture (no recompute on lifecyclestage change downstream)
- Snapshots para eventos que no sean `send` (create, approve, reject, etc.)
- Capturar full payload HubSpot — solo los campos críticos

## Detailed Spec

### Migration

```sql
ALTER TABLE greenhouse_commercial.quotations
  ADD COLUMN IF NOT EXISTS sales_context_at_sent jsonb;

CREATE INDEX IF NOT EXISTS idx_quotations_sales_context_category
  ON greenhouse_commercial.quotations
  USING gin ((sales_context_at_sent -> 'category_at_sent'));
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
  clientId: string | null
  hubspotDealId: string | null
}): Promise<SalesContextSnapshot>
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Migration idempotente
- [ ] Al enviar una quote (`/send`), `sales_context_at_sent` queda poblado
- [ ] Quotes ya existentes mantienen NULL (backfill opcional, fuera de scope)
- [ ] Shape de JSONB pasa JSON schema validation en los 3 escenarios (deal, contract, pre-sales)
- [ ] Reader expuesto y devuelve null si la quote no ha sido enviada

## Verification

- `pnpm migrate:up`
- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test`
- Staging: enviar una quote, verificar snapshot poblado en DB

## Closing Protocol

- [ ] `Lifecycle` sincronizado con carpeta
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] Chequeo de impacto cruzado con TASK-457

## Follow-ups

- Backfill histórico para quotes ya enviadas (opcional, costo: joins contra snapshots de lifecyclestage que probablemente no existan)
- Event `commercial.quotation.sales_context_captured` si downstream consumers lo ameritan

## Open Questions

- ¿Capturar snapshot también en `approve` por consistencia, o solo en `send`? Send es el momento canónico de envío al cliente; approve es interno. Propuesta: solo send.
