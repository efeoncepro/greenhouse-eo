# TASK-530 — Quote Tax Explicitness (Chile IVA)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Implementado — 2026-04-21`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-529`
- Branch: `task/TASK-530-quote-tax-explicitness-chile-iva`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Hacer explicito el IVA de Chile en cotizaciones, quote builder, detail, PDF y email. La quote debe distinguir neto, impuesto y total sin contaminar el motor de margen ni depender de calculos sueltos en la salida.

## Why This Task Exists

La cotizacion hoy ya persiste campos tributarios, e incluso el `QuoteSummaryDock` contempla `ivaAmount`, pero el write path canonico de pricing prioriza subtotal/total y no trata impuestos como contrato de primer nivel. Eso deja al cliente viendo montos finales sin una tax layer robusta y complica `TASK-466`.

## Goal

- Persistir snapshots tributarios canonicos en quotation header y line items.
- Exponer IVA Chile de forma explicita en builder, detail, PDF y email.
- Mantener pricing y margin como logica neta, agregando impuestos solo en la salida documental/comercial.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`

Reglas obligatorias:

- El pricing engine sigue calculando precio, costo y margen sobre neto.
- El IVA de quote se obtiene desde `TASK-529`; no se hardcodea `0.19` dentro del builder.
- Multi-currency debe aplicar el snapshot tributario sobre la moneda de la quote y luego convertir cuando corresponda a outputs secundarios.
- Toda query o write path tenant-aware debe mantener el filtro/anchor por `space_id` o contexto organizacional efectivo del repo.

## Normative Docs

- `docs/tasks/to-do/TASK-466-multi-currency-quote-output.md`
- `project_context.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/to-do/TASK-529-chile-tax-code-foundation.md`
- `src/lib/finance/pricing/quotation-pricing-orchestrator.ts`
- `src/lib/finance/quotation-canonical-store.ts`
- `src/app/api/finance/quotes/[id]/lines/route.ts`
- `src/components/greenhouse/pricing/QuoteSummaryDock.tsx`

### Blocks / Impacts

- `TASK-466`
- quote PDFs y emails
- quote-to-cash tax inheritance

### Files owned

- `src/lib/finance/pricing/*`
- `src/lib/finance/quotation-canonical-store.ts`
- `src/app/api/finance/quotes/*`
- `src/views/greenhouse/finance/workspace/*`
- `src/components/greenhouse/pricing/*`

## Current Repo State

### Already exists

- `src/lib/finance/pricing/quotation-pricing-orchestrator.ts` persiste `subtotal`, `total_amount`, `total_amount_clp` y `exchange_rate_to_clp`.
- `src/lib/finance/quotation-canonical-store.ts` ya maneja `tax_rate`, `tax_amount` y `legacy_tax_amount`.
- `src/components/greenhouse/pricing/QuoteSummaryDock.tsx` ya tiene soporte superficial para `ivaAmount`.

### Gap

- El orquestador de pricing no trata el tax snapshot como parte del contrato central de persistencia.
- La UI no tiene una source of truth unica para neto/IVA/total.
- PDF/email todavia no tienen una base tributaria robusta y congelada por version.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Quote schema and persistence

- Extender quotation header y/o line items para persistir `tax_code`, `tax_rate_snapshot`, `tax_amount` y semantica de exencion.
- Hacer que `persistQuotationPricing` y el canonical store congelen el snapshot tributario por version.

### Slice 2 — Builder and detail surfaces

- Rehidratar y editar el snapshot tributario desde el builder/detail.
- Mostrar `Neto`, `IVA`, `Total` y cualquier caso `Exento` o `No facturable` sin copy ambiguo.

### Slice 3 — Output surfaces

- Llevar el snapshot a PDF, email y client-facing outputs de `TASK-466`.
- Mantener consistencia entre pantalla, payload y documento emitido.

### Slice 4 — Validation and regression coverage

- Tests unitarios e integracion del write path de quotation.
- Cobertura para quotes multi-moneda y exentas.

## Out of Scope

- Posicion mensual de IVA.
- IVA compra/creditos fiscales.
- Sync de facturas a HubSpot.

## Detailed Spec

Principios:

1. Quote comercial muestra impuestos explicitos, pero margen y gobernanza siguen basados en neto.
2. El snapshot tributario se congela al emitir/enviar la quote y no debe recalcularse retroactivamente sin version nueva.
3. El modelo debe soportar lineas exentas junto a lineas gravadas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Las quotes persisten y rehidratan `tax_code` y snapshots tributarios de forma canonica.
- [ ] Builder, detail, PDF y email muestran neto + IVA + total de forma consistente.
- [ ] Las metricas comerciales siguen netas de impuestos y no degradan `TASK-466`.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- smoke manual de quote builder, detail y PDF

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios o decisiones
- [ ] `changelog.md` quedo actualizado si cambio comportamiento visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] se validaron quotes en CLP y quote multi-moneda

## Follow-ups

- `TASK-531` (downstream consumer: income/invoice tax inheritance)
- `TASK-533` (downstream consumer: VAT ledger mensual)
- `TASK-562` (follow-ups consolidados: UI selector de `tax_code` en header, per-line override, email template con tax snapshot, multi-jurisdiction seeding MX/CO/PE)

