# TASK-628 — Quote Amendment Engine (amendment vs re-quote, signed quotes mantienen continuidad legal)

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Alto`
- Effort: `Medio` (~3 dias)
- Type: `implementation`
- Epic: `none` (RESEARCH-005 P2 Bloque E)
- Status real: `Diseno cerrado v1.9`
- Rank: `TBD`
- Domain: `data` / `ui`
- Blocked by: `TASK-619, TASK-620.3`
- Branch: `task/TASK-628-quote-amendment-engine`

## Summary

Engine de amendment para quotes firmadas. Cliente con retainer firmado pide cambios (sube horas, agrega tools, cambia scope) — amendment crea anexo legal vinculado al contrato original (vs re-quote que cancela y crea nuevo). Soporta ambos modos (amendment para LATAM corporate standard + re-quote para casos donde scope change amerita renegociar todo).

## Why This Task Exists

RESEARCH-005 Decision 9 v1.2 ya cerro: "soportar ambos". TASK-619 establece que quotes firmadas son inmutables — sin amendment, cualquier cambio requiere cancelar la firma + re-firmar todo. Eso pierde continuidad legal y rompe UX para LATAM corporate (esperan amendment como estandar).

## Goal

- Endpoint `POST /api/finance/quotes/[id]/amendments` que crea amendment doc vinculado
- Tabla `quotation_amendments` con (amendment_id, source_quote_id, source_version, amendment_number, delta_composition, effective_date, requires_resign, status)
- UI flow: en QuoteDetailView de signed quote, boton "Crear amendment" -> modal con composition diff editor
- Amendment puede o no requerir re-firma (configurable per amendment)
- Si requires_resign=true: dispara TASK-619 signature flow para amendment doc
- Si requires_resign=false: quote original sigue siendo legalmente vigente, amendment es operacional
- Audit trail: amendment lineage visible en timeline (TASK-628.1)

## Architecture Alignment

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/research/RESEARCH-005...` Decision 9 v1.2 + Delta v1.9

## Dependencies & Impact

### Depends on

- TASK-619 (signed quote es trigger del amendment flow)
- TASK-620.3 (composition snapshot + diff calc)
- TASK-628.1 (audit timeline visibility)

### Files owned

- `migrations/YYYYMMDD_task-628-amendments.sql` (nuevo)
- `src/lib/finance/amendment-store.ts` (nuevo)
- `src/lib/finance/composition-diff.ts` (nuevo, computa delta entre 2 compositions)
- `src/app/api/finance/quotes/[id]/amendments/route.ts` (nuevo)
- `src/app/api/finance/quotes/[id]/amendments/[amendmentId]/route.ts` (nuevo)
- `src/views/greenhouse/finance/AmendmentComposerModal.tsx` (nuevo)
- `src/views/greenhouse/finance/QuoteDetailView.tsx` (modificado: boton + tab amendments)

## Scope

### Slice 1 — Schema (0.5 dia)

```sql
CREATE TABLE greenhouse_commercial.quotation_amendments (
  amendment_id text PRIMARY KEY DEFAULT ('amend-' || gen_random_uuid()::text),
  source_quotation_id text NOT NULL REFERENCES greenhouse_commercial.quotations(quotation_id),
  source_version_number int NOT NULL,
  amendment_number int NOT NULL,                    -- 1, 2, 3 (multiple amendments per source quote)
  amendment_title text NOT NULL,
  amendment_description text,
  delta_composition jsonb NOT NULL,                 -- diff entre composition source y nueva
  monetary_impact_clp numeric(14,2),                -- delta en CLP equivalent
  monetary_impact_currency text,
  monetary_impact_amount numeric(14,2),
  effective_date date NOT NULL,
  requires_resign boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_resign', 'signed', 'declined', 'effective', 'cancelled')),
  signature_request_id uuid REFERENCES greenhouse_signatures.signature_requests(signature_request_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  effective_at timestamptz,
  effective_by text,
  UNIQUE (source_quotation_id, amendment_number)
);

CREATE INDEX idx_quotation_amendments_source ON greenhouse_commercial.quotation_amendments (source_quotation_id);
```

### Slice 2 — Composition diff helper (0.5 dia)

```typescript
// src/lib/finance/composition-diff.ts
export const computeCompositionDelta = (source: ServiceComposition, target: ServiceComposition): CompositionDelta => {
  return {
    rolesAdded: target.roles.filter(r => !source.roles.find(s => s.roleId === r.roleId)),
    rolesRemoved: source.roles.filter(r => !target.roles.find(t => t.roleId === r.roleId)),
    rolesModified: target.roles.filter(r => {
      const src = source.roles.find(s => s.roleId === r.roleId)
      return src && (src.hoursPerPeriod !== r.hoursPerPeriod || src.quantity !== r.quantity)
    }).map(r => ({ ...r, previous: source.roles.find(s => s.roleId === r.roleId) })),
    // Same para tools, artifacts, children
    monetaryImpact: calculateMonetaryDelta(source, target)
  }
}
```

### Slice 3 — Store + endpoints (1 dia)

```typescript
export const createAmendment = async (input: {
  sourceQuoteId: string
  amendmentTitle: string
  newComposition: ServiceComposition
  effectiveDate: Date
  requiresResign: boolean
  actorUserId: string
}) => {
  const source = await getQuoteWithComposition(input.sourceQuoteId)
  if (source.signatureStatus !== 'signed') {
    throw new ValidationError('Amendment requires source quote in signed state')
  }

  const delta = computeCompositionDelta(source.composition, input.newComposition)

  const amendment = await insertAmendment({
    sourceQuoteId: input.sourceQuoteId,
    sourceVersion: source.currentVersion,
    amendmentNumber: await nextAmendmentNumber(input.sourceQuoteId),
    delta,
    monetaryImpact: delta.monetaryImpact,
    effectiveDate: input.effectiveDate,
    requiresResign: input.requiresResign,
    status: input.requiresResign ? 'draft' : 'effective',
    createdBy: input.actorUserId
  })

  if (input.requiresResign) {
    // Trigger TASK-619 signature flow para el amendment doc
    await createSignatureRequestForAmendment(amendment.amendmentId)
  } else {
    // Audit only, ya effective
    await emitOutbox('commercial.quote.amendment_effective', { amendmentId: amendment.amendmentId })
  }

  return amendment
}
```

Endpoints:
- `POST /api/finance/quotes/[id]/amendments` - create
- `GET /api/finance/quotes/[id]/amendments` - list amendments del source
- `POST /api/finance/quotes/[id]/amendments/[amendmentId]/cancel` - cancel pending
- `GET /api/finance/quotes/[id]/amendments/[amendmentId]/pdf` - render amendment doc PDF (analogo a quote PDF pero con delta visible)

### Slice 4 — UI amendment composer + tests (1 dia)

`<AmendmentComposerModal>`:

```
┌─ Crear amendment de QT-2026-0014 v3 (signed) ──┐
│                                                  │
│ Title: [Aumento de horas Senior Designer]        │
│                                                  │
│ ┌─ Composition actual (signed) ─┐                │
│ │ Senior Designer × 80h          │  -> Editar    │
│ │ Strategy Lead × 40h            │               │
│ │ Figma seat × 1                 │               │
│ └────────────────────────────────┘                │
│                                                  │
│ [Edita composition usando ServiceModuleComposer] │
│                                                  │
│ Delta detectado:                                 │
│   ➕ Senior Designer +20h ($+1,200 USD)           │
│   ➕ UX Researcher × 30h ($+1,800 USD)            │
│   = Impacto: +$3,000 USD/mes                     │
│                                                  │
│ Effective date: [📅 2026-05-01]                  │
│ ☑ Requiere re-firma del cliente                  │
│                                                  │
│   [Cancelar]   [Crear amendment]                 │
└──────────────────────────────────────────────────┘
```

PDF amendment renderea:
- Header: "Anexo Modificatorio N° 1 al Contrato QT-2026-0014 v3"
- Section "Cambios introducidos" con delta
- Impacto economico
- Bloque firma cliente + Efeonce countersigner

Tests:
- Composition diff calc preciso
- Amendment con requires_resign=true triggera signature
- Amendment con requires_resign=false va directo a effective
- Amendment cancelable mientras pending_resign

## Out of Scope

- Re-quote workflow explicito (decision queda al sales rep manual: "no uso amendment, creo quote nueva con clone TASK-627.1")
- Multi-amendment cascade (amendment del amendment) — Fase 2
- Auto-detect cuando amendment es preferible vs re-quote — futuro AI

## Acceptance Criteria

- [ ] migracion aplicada
- [ ] composition diff calc tested
- [ ] endpoint create + list + cancel funcional
- [ ] UI modal con composer reutilizable + delta preview
- [ ] PDF amendment rendering
- [ ] integracion con TASK-619 signature flow si requires_resign
- [ ] tests passing

## Verification

- Crear amendment con +20h Designer + nuevo Researcher -> delta correcto
- requires_resign=true -> signature flow triggered
- Original quote permanece `signed`, amendment status `effective` o `signed` segun flow

## Closing Protocol

- [ ] Lifecycle sincronizado
- [ ] Handoff con E2E amendment + signed
- [ ] `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` updated seccion "Amendments"
- [ ] `docs/documentation/finance/contratos-comerciales.md` updated
