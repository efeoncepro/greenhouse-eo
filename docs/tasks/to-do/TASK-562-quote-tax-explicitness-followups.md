# TASK-562 — Quote Tax Explicitness Follow-ups (UI Selector + Per-Line Override + Email Integration + Multi-Jurisdiction)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-optional (Chile Tax / IVA Program TASK-528 paraguas)`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance + ui`
- Blocked by: `none` (TASK-530 foundation ya shipped; Slice 3 converge con TASK-552 Slice 1 cuando aterrice el email template base)
- Branch: `task/TASK-562-quote-tax-explicitness-followups`
- Legacy ID: `follow-up de TASK-530`
- GitHub Issue: `none`

## Summary

Cerrar los 4 items que TASK-530 dejó fuera del V1 — tres como "follow-up UI" explícito (dropdown de `tax_code` en header, per-line override para mezclar afectos/exentos, integración del snapshot tributario en el email template cuando aterrice) y uno como extensión de scope (multi-jurisdicción seeding más allá de Chile). Consume la foundation ya shipped (`buildQuotationTaxSnapshot`, `previewChileTaxAmounts`, columnas `tax_code` + snapshot en `quotations` y `quotation_line_items`, catalog `greenhouse_finance.tax_codes`) sin tocar el contrato inmutable del snapshot ni la separación pricing-neto vs tax-documental.

## Why This Task Exists

TASK-530 convergió el contrato canónico de snapshot tributario y lo cableó en write path + builder live preview + PDF, pero dejó 4 items que la arquitectura necesita para cerrar el loop operativo y habilitar el roadmap multi-moneda/multi-jurisdicción:

1. **El builder siempre graba `cl_vat_19` como default hardcoded**. El schema ya soporta los tres códigos canónicos (`cl_vat_19`, `cl_vat_exempt`, `cl_vat_non_billable`) y el helper `buildQuotationTaxSnapshot` los procesa correctamente, pero el `QuoteContextStrip` / detail no tienen selector. Un AE que cotiza un servicio exento (educación, exportación) tiene que pedir a finance que haga UPDATE manual del `tax_code` post-hoc, o emitir con IVA 19% incorrecto y ajustar después en la factura. Es un workaround constante.
2. **El schema soporta `tax_code` por línea pero el UI no lo expone**. Una cotización mezclada (ej. consultoría afecta + curso exento en la misma quote) hoy es imposible de representar con fidelidad — todas las líneas heredan el `tax_code` del header. El campo existe en `quotation_line_items`, el orchestrator lo persiste si se lo pasás, pero el form no tiene el control.
3. **No existe email template que respete el snapshot**. TASK-530 cumplió "PDF" de la spec original pero explícitamente no llegó al "email" porque no hay template de quote email todavía. Cuando se cree (overlap con TASK-552 Slice 1 del multi-currency follow-up), el contract del template debe leer `quotation.taxSnapshot` y renderizar Neto/IVA/Total igual que el PDF. Si TASK-552 entra primero, debe dejar el hook; si este task entra primero, debe estar pensado para que TASK-552 lo consuma.
4. **El catálogo `greenhouse_finance.tax_codes` es Chile-only**. TASK-529 sembró `cl_vat_19`, `cl_vat_exempt`, `cl_vat_non_billable`. La tabla tiene columna `jurisdiction`, `effective_from`, `effective_to` para soportar multi-jurisdicción, pero no hay códigos de MX (IVA 16%), CO (IVA 19%), PE (IGV 18%), US (sales tax por estado), etc. sembrados. El `resolveChileTaxCode` es específico — necesitamos un resolver genérico `resolveTaxCode(taxCodeId, {spaceId, at})` que despache por `jurisdiction`. Esto desbloquea que cotizaciones de clientes LatAm (que ya existen vía TASK-485 currency expansion) tengan el snapshot correcto en lugar de forzar IVA Chile sobre operaciones de otra jurisdicción.

## Goal

- `QuoteContextStrip` (o surface equivalente en el header del builder) incluye un selector de `tax_code` con los 3 valores canónicos + preview live del IVA recalculado al cambiar
- `QuotationLinesTable` permite override `tax_code` por línea con fallback al header; UI muestra badge "Exento" / "No Afecto" inline; totales del dock desglosan por código si hay mezcla
- Email template de quote (`QuotationIssuedEmail.tsx` o converger con el que cree TASK-552 Slice 1) renderiza Neto/IVA/Total leyendo `quotation.taxSnapshot` — mismo contrato que el PDF, sin recomputar
- `greenhouse_finance.tax_codes` seedea al menos MX (`mx_vat_16`, `mx_vat_exempt`), CO (`co_vat_19`, `co_vat_exempt`), PE (`pe_igv_18`, `pe_igv_exempt`); resolver genérico `resolveTaxCode` despacha por jurisdiction derivada del código
- La semantica del snapshot inmutable se preserva: cambiar `tax_code` de una quote emitida sigue requiriendo nueva versión

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` (sección Delta TASK-530)
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md` (v2.32+)
- `docs/architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md` (para decisiones multi-jurisdiction que interactúan con currency)

Reglas obligatorias:

- El snapshot tributario sigue siendo **inmutable post-emisión**. Cambiar `tax_code` requiere nueva versión de quote — no retrocomputar.
- El pricing engine sigue calculando margen sobre **neto**. Per-line tax override no contamina `line.subtotal_price` ni `line.margin_pct`.
- El default del header sigue siendo `cl_vat_19` cuando la jurisdicción de la cotización es CL. Para otras jurisdicciones, el default se resuelve por `organization.jurisdiction` si existe, o por tenant config.
- El catálogo `tax_codes` no se modifica directamente desde el builder — solo via migration/seed. El builder solo **selecciona** de los códigos vigentes (`effective_from <= now AND (effective_to IS NULL OR effective_to > now)`).
- Seguir el patrón `server-only` helper + `client-safe` constants de TASK-530. Cualquier preview client-side debe usar `previewChileTaxAmounts` equivalente genérico, no importar el helper server-side.

## Normative Docs

- `docs/tasks/complete/TASK-530-quote-tax-explicitness-chile-iva.md` (contrato shipped, follow-ups originales)
- `docs/tasks/complete/TASK-529-chile-tax-code-foundation.md` (catalog + resolver + types)
- `docs/tasks/to-do/TASK-552-multi-currency-quote-output-followups.md` (Slice 1 es el email template que Slice 3 consume)
- `docs/documentation/finance/iva-explicito-cotizaciones.md` (doc funcional — actualizar con deltas de cada slice)

## Dependencies & Impact

### Depends on

- `greenhouse_finance.tax_codes` (TASK-529, ya shipped)
- `quotations.tax_code`, `tax_snapshot_json`, `quotation_line_items.tax_code` + columnas snapshot (TASK-530, ya shipped)
- `src/lib/finance/pricing/quotation-tax-snapshot.ts` + `quotation-tax-constants.ts` (TASK-530, ya shipped)
- `src/lib/finance/pricing/quotation-pricing-orchestrator.ts` (ya acepta `taxCode` + `spaceId`; Slice 2 requiere extensión para acepter per-line override)
- `src/lib/tax/chile/resolver.ts` — Slice 4 lo generaliza a `resolveTaxCode` despachando por jurisdiction

### Blocks / Impacts

- `TASK-531` (Income/Invoice Tax Convergence) — puede consumir el per-line override si llega antes
- `TASK-533` (Chile VAT Ledger) — no se afecta; sigue consumiendo el snapshot inmutable congelado
- `TASK-552` Slice 1 — debe converger: si TASK-552 aterriza primero, define el template base que este task extiende con tax snapshot; si este task aterriza primero, deja el hook y TASK-552 lo consume
- Cotizaciones de clientes LatAm (post TASK-485 multi-currency) — Slice 4 elimina el bug de forzar IVA Chile sobre operación MX/CO/PE

### Files owned

- `src/views/greenhouse/finance/workspace/QuoteContextStrip.tsx` (o surface equivalente en el builder header)
- `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx` (Slice 2 requiere wiring del per-line override)
- `src/components/greenhouse/pricing/QuoteSummaryDock.tsx` (desglose por código cuando hay mezcla)
- `src/lib/finance/pricing/quotation-pricing-orchestrator.ts` (Slice 2 extiende line input con `taxCode?`)
- `src/lib/finance/pricing/quotation-tax-snapshot.ts` (Slice 4 generaliza a resolver genérico)
- `src/lib/finance/pricing/quotation-tax-constants.ts` (Slice 4 extiende constantes con códigos MX/CO/PE)
- `src/lib/tax/*` (Slice 4 — posiblemente `src/lib/tax/index.ts` con dispatcher y subcarpetas por jurisdiction)
- `migrations/YYYYMMDDHHMMSSmmm_task-562-multi-jurisdiction-tax-seed.sql` (Slice 4)
- `src/emails/QuotationIssuedEmail.tsx` (Slice 3, converger con TASK-552)
- `docs/documentation/finance/iva-explicito-cotizaciones.md` (actualizar al cerrar cada slice)

## Current Repo State

### Already exists

- `greenhouse_finance.tax_codes` con 3 filas CL + columns `jurisdiction`, `effective_from`, `effective_to`, `space_id` override (TASK-529)
- `quotations.tax_code` + `tax_rate_snapshot` + `tax_amount_snapshot` + `tax_snapshot_json` + `is_tax_exempt` + `tax_snapshot_frozen_at` (TASK-530)
- `quotation_line_items.tax_code` + 4 columnas snapshot adicionales (TASK-530 — schema soporta per-line pero UI no lo expone)
- Helper server-only `buildQuotationTaxSnapshot` + `parsePersistedTaxSnapshot` + constants client-safe `previewChileTaxAmounts` (TASK-530)
- `QUOTE_TAX_CODES = ['cl_vat_19', 'cl_vat_exempt', 'cl_vat_non_billable']` whitelist en CHECK constraint + TypeScript guard
- PDF contract (`QuotationPdfTotals.tax`) ya renderiza tax dinámicamente con label desde snapshot

### Gap

- `QuoteContextStrip` no tiene selector de `tax_code` — AE no puede cambiar el default
- `QuotationLinesTable` no permite override per-line — quote mixta (afecta + exenta) no representable
- `QuoteSummaryDock` asume un solo `tax_code` para toda la quote — no desglosa cuando hay mezcla
- No existe `QuotationIssuedEmail.tsx` — email de quote no se emite, solo cambia estado (wrapper legacy)
- `resolveChileTaxCode` hardcoded a Chile — no hay dispatcher genérico `resolveTaxCode` por jurisdiction
- Catálogo solo tiene filas CL — cotizaciones MX/CO/PE fuerzan Chile IVA incorrectamente

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Tax Code Selector en Quote Builder Header

- Agregar dropdown/select de `tax_code` en `QuoteContextStrip` (o surface equivalente del header del builder) con los 3 valores canónicos: "IVA 19%", "IVA Exento", "No Afecto a IVA".
- Al cambiar el valor, recomputar preview live usando `previewChileTaxAmounts` y actualizar `QuoteSummaryDock` headline (Neto + IVA + Total).
- Propagar el nuevo `taxCode` al write path via `persistQuotationPricing` (ya acepta el parámetro desde TASK-530).
- Persistir `taxCode` seleccionado en el draft state del builder para rehidratar al reabrir.
- Badge visual en el header del builder cuando `taxCode != 'cl_vat_19'` para que el AE vea que no está en el default.

### Slice 2 — Per-Line Tax Override

- Extender `QuotationLinesTable` con un control per-línea (probablemente icon-button que abre popover con los 3 códigos) para override del `tax_code` a nivel línea.
- Fallback: si la línea no tiene `tax_code` override, hereda del header (comportamiento actual).
- Extender `QuotationPricingInput.items[]` en el orchestrator para aceptar `taxCode?: string | null` por línea.
- En `persistQuotationPricing`, cada línea con override computa su propio `computeChileTaxSnapshot` con el código específico; líneas sin override usan el resolution del header.
- `QuoteSummaryDock` desglosa: cuando hay mezcla, muestra "IVA 19%: $X" + "Exento: $Y" + "Total IVA: $X" en lugar de una sola línea.
- PDF: renderizar por línea un badge "Exento" cuando la línea tiene override; el bloque de totales del PDF también desglosa por código.
- Validación: si todas las líneas tienen el mismo override, el header se alinea automáticamente al cerrar el builder (UX nicety, opcional).

### Slice 3 — Email Template con Tax Snapshot

- **Convergencia obligatoria con TASK-552 Slice 1**: antes de implementar, leer el estado actual de TASK-552 y coordinar. Si TASK-552 ya shippeó `QuotationIssuedEmail.tsx`, este slice solo agrega el bloque de tax. Si no, este slice crea el template base con el contrato completo (header + logo + quote details + tax block + total + CTA + footer), dejando hooks para que TASK-552 agregue FX snapshot footer después.
- Leer `quotation.taxSnapshot` del canonical store (no recomputar).
- Renderizar sección "Totales" con Neto + IVA (con label dinámico desde snapshot: "IVA 19%" o "IVA Exento" o "No Afecto a IVA") + Total — mismo contrato visual que el PDF.
- Adjuntar PDF generado (o link firmado al PDF — decisión a tomar en Plan Mode).
- Tracked en `greenhouse_notifications.email_deliveries` como el resto del portal.
- Capability `commercial.quotation.email.send` o reutilizar la existente si TASK-552 ya la definió.

### Slice 4 — Multi-Jurisdiction Tax Foundation

- Migration que seedea al menos: MX (`mx_vat_16` 16%, `mx_vat_exempt`), CO (`co_vat_19` 19%, `co_vat_exempt`), PE (`pe_igv_18` 18%, `pe_igv_exempt`). Decisión en Plan Mode si se agregan US sales tax (complejo, por estado) y AR (IVA 21%).
- Generalizar resolver: crear `src/lib/tax/resolver.ts` con `resolveTaxCode(taxCodeId, {spaceId, at})` que despacha por prefijo de código (`cl_*` → Chile, `mx_*` → México, etc.).
- Mantener `resolveChileTaxCode` como alias legacy que llama al genérico.
- Extender `QUOTE_TAX_CODES` whitelist en TypeScript + CHECK constraint DB para incluir los nuevos códigos (migration con `ALTER TABLE ... DROP CONSTRAINT + ADD CONSTRAINT`).
- Extender `QUOTE_TAX_CODE_RATES` + `QUOTE_TAX_CODE_LABELS` en `quotation-tax-constants.ts` con los nuevos códigos para preview client-side.
- Resolver del default por jurisdiction: `resolveDefaultTaxCodeForOrganization(org)` que lee `organizations.jurisdiction` (o equivalente) y devuelve `mx_vat_16` / `co_vat_19` / `pe_igv_18` / `cl_vat_19` según corresponda. Fallback a `cl_vat_19` si la jurisdicción es desconocida.
- Slice 1 (selector UI) se extiende para mostrar los códigos vigentes para la jurisdicción detectada, no los 3 chilenos hardcoded.
- Tests: resolver genérico despacha correctamente, catalog query filtra por jurisdicción, snapshots de cotizaciones MX/CO/PE usan el rate correcto.

## Out of Scope

- Input VAT / purchase recoverability (cubierto por TASK-532).
- VAT ledger consolidation (cubierto por TASK-533).
- US sales tax por estado (complejidad alta; dejar como follow-up si no se aborda en Slice 4).
- Retención de IVA / IVA diferido (escenarios avanzados; V2+).
- Edición manual del catalog `tax_codes` desde Admin Center (V2+; hoy solo via migration).
- Cambio retroactivo de snapshot en quotes emitidas — sigue requiriendo nueva versión.

## Detailed Spec

[Este detalle se expande en Plan Mode. Para cada slice, el agente que toma la task debe producir plan.md con:

- Schema SQL exacto del seed multi-jurisdiction (Slice 4).
- Wireframe del selector en `QuoteContextStrip` + popover per-line en `QuotationLinesTable` (Slices 1-2).
- Coordinación con estado actual de TASK-552 (Slice 3).
- Decisión sobre qué jurisdicciones incluir en el seed inicial de Slice 4.
- Decisión sobre adjuntar PDF binario vs link firmado en email (Slice 3).]

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] AE puede cambiar `tax_code` del header de una quote en draft y el dock/PDF reflejan el cambio en tiempo real
- [ ] Una quote con mezcla de líneas afectas + exentas persiste, rehidrata y renderiza correctamente (dock + PDF)
- [ ] El email de quote emitida llega al cliente con Neto/IVA/Total renderizados desde el snapshot
- [ ] Cotización de una org con `jurisdiction='MX'` usa `mx_vat_16` por default y congela snapshot con rate 0.16
- [ ] El snapshot de quotes ya emitidas pre-cambio de catalog no se modifica (inmutabilidad preservada)
- [ ] `QUOTE_TAX_CODES` whitelist + CHECK constraint + TypeScript guard siguen consistentes post-Slice 4
- [ ] `pnpm test` agrega cobertura para cada slice

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- smoke manual: cotización CL default, cotización CL exenta header, cotización mixta (línea afecta + línea exenta), cotización MX con IVA 16%, envío de email con PDF

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios o decisiones
- [ ] `changelog.md` quedo actualizado si cambio comportamiento visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas (TASK-531, TASK-533, TASK-552)
- [ ] `docs/documentation/finance/iva-explicito-cotizaciones.md` actualizado con deltas de cada slice
- [ ] se validaron quotes en CLP, MXN, COP, PEN y quote con mezcla afecta/exenta
- [ ] TASK-530 `Follow-ups` section updated para apuntar a TASK-562 como resolvedor

## Follow-ups

- US sales tax por estado (si Slice 4 no lo cubre)
- Admin Center UI para gestionar catálogo `tax_codes` (V2+)
- Retención de IVA / IVA diferido
- Client portal `/my/quotes` integración con tax snapshot display (overlap con TASK-552 Slice 6)
