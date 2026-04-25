# TASK-627.1 — Quote Cloning + Templating from Prior Quote

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Bajo` (~1 dia)
- Type: `implementation`
- Epic: `none` (RESEARCH-005 P2 Bloque E)
- Status real: `Diseno cerrado v1.9`
- Rank: `TBD`
- Domain: `data` / `ui`
- Blocked by: `TASK-620.3`
- Branch: `task/TASK-627.1-quote-cloning-templating`

## Summary

Endpoint `POST /api/finance/quotes/[id]/clone` que duplica composition + permite override de cliente/version/pricing. Boton "Duplicar quote" en QuoteDetailView. Caso operativo comun: "Crear nueva quote basada en QT-014 con cliente diferente y pricing actualizado". Reusa el ID liberado tras cancelacion de TASK-627.

## Why This Task Exists

Sales rep frecuentemente quiere reusar una quote ganada como template para otra. Hoy debe recrear todo manual. Sin clone, time-to-quote es 30+ min vs ~2 min con clone + ajuste.

## Goal

- Endpoint clone genera quote nueva con composition copiada (snapshot del source)
- Override opcional: cliente, currency, business_line, signature policy, expiry
- Lineage tracking: nueva quote registra `source_quotation_id` (si futuro queremos hacer "find similar")
- UI button + modal de overrides en QuoteDetailView

## Architecture Alignment

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/research/RESEARCH-005...` Delta v1.9

## Dependencies & Impact

### Depends on

- TASK-620.3 (composition snapshot existe)

### Files owned

- `migrations/YYYYMMDD_task-627.1-source-quote-lineage.sql` (nuevo)
- `src/lib/finance/quote-clone-store.ts` (nuevo)
- `src/app/api/finance/quotes/[id]/clone/route.ts` (nuevo)
- `src/views/greenhouse/finance/QuoteCloneModal.tsx` (nuevo)
- `src/views/greenhouse/finance/QuoteDetailView.tsx` (modificado: boton clone)

## Scope

### Slice 1 — Migracion (0.1 dia)

```sql
ALTER TABLE greenhouse_commercial.quotations
  ADD COLUMN source_quotation_id text REFERENCES greenhouse_commercial.quotations(quotation_id) ON DELETE SET NULL,
  ADD COLUMN source_clone_relationship text
    CHECK (source_clone_relationship IS NULL OR source_clone_relationship IN ('clone', 'renewal', 'amendment'));

CREATE INDEX idx_quotations_source ON greenhouse_commercial.quotations (source_quotation_id);
```

### Slice 2 — Store + endpoint (0.5 dia)

```typescript
export const cloneQuote = async (input: {
  sourceQuoteId: string
  overrides?: {
    organizationId?: string
    currency?: string
    businessLineCode?: string
    signaturePolicy?: SignaturePolicy
    validUntil?: Date
    description?: string
  }
  actorUserId: string
}) => {
  const source = await getQuoteWithComposition(input.sourceQuoteId)

  const newQuote = await createQuotation({
    ...source.header,
    ...input.overrides,
    quotationNumber: await generateNextQuotationNumber(),
    currentVersion: 1,
    status: 'draft',
    sourceQuotationId: input.sourceQuoteId,
    sourceCloneRelationship: 'clone',
    createdBy: input.actorUserId
  })

  // Copy composition (recipes, line items)
  await persistComposition(newQuote.id, source.composition)

  await recordAudit({
    actorUserId: input.actorUserId,
    action: 'quote_cloned',
    entityType: 'quotation',
    entityId: newQuote.id,
    details: { sourceQuoteId: input.sourceQuoteId, overrides: input.overrides }
  })

  return newQuote
}
```

`POST /api/finance/quotes/[id]/clone` con body de overrides. Permission: sales rep que es owner del source O Account Lead del cliente.

### Slice 3 — UI button + modal (0.4 dia)

`<QuoteDetailView>`: boton "Duplicar" en header (visible si user tiene permission).

`<QuoteCloneModal>`:

```
┌─ Duplicar quote QT-2026-0014 ──────────┐
│ Crear nueva quote basada en esta:      │
│                                         │
│ Cliente: [Acme Corp ▼] (override)      │
│ Currency: [USD ▼]                       │
│ Business line: [globe ▼]                │
│ Validity: [+ 30 dias ▼]                 │
│ ☐ Copiar signature policy de original   │
│ ☐ Copiar terms de original              │
│                                         │
│ Notes: [_______________________]        │
│                                         │
│   [Cancelar]   [Crear duplicado]        │
└────────────────────────────────────────┘
```

Tests:
- Clone preserva composition
- Overrides aplicados correctamente
- Lineage tracked
- Permission enforced

## Out of Scope

- Bulk clone (clonar la misma quote para 10 prospects) — Fase 2
- AI-suggested overrides ("este cliente parece similar a Y, sugiero estos cambios") — futuro
- Template gallery (curated quotes para reuso facil) — Fase 2

## Acceptance Criteria

- [ ] migracion aplicada
- [ ] endpoint clone funcional con overrides
- [ ] UI button + modal funcionales
- [ ] lineage visible en QuoteDetailView ("Esta quote es clone de QT-2026-0014")
- [ ] tests passing

## Verification

- Clone QT-2026-0014 con override cliente -> nueva quote con composition correcta + lineage tracked

## Closing Protocol

- [ ] Lifecycle sincronizado
- [ ] Handoff con flow screenshots
- [ ] `docs/documentation/finance/cotizaciones-gobernanza.md` updated
