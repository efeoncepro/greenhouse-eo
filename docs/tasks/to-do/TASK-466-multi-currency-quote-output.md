# TASK-466 — Multi-Currency Quote Output (Client View + PDF + Email)

## Delta 2026-04-19 — Reanclaje a builder full-page

La spec original asumía que el selector de `output_currency` vivía y seguiría viviendo en `QuoteCreateDrawer`. Esa superficie ya quedó chica para el quote builder y el programa ahora formaliza el pivot en `TASK-473`.

**Ajuste canónico:**

1. `TASK-466` ya no diseña el preview/switching alrededor del drawer legacy.
2. Las superficies objetivo pasan a ser:
   - `/finance/quotes/new`
   - `/finance/quotes/[id]/edit`
   - `/finance/quotes/[id]` como review/governance con toggle interno
3. El PDF/email client-facing sigue siendo ownership de esta task, pero la integración UI en create/edit queda bloqueada por `TASK-473`.
4. El selector interno de moneda y cualquier preview de salida debe montarse en el builder full-page y reutilizar la boundary nueva entre build/edit vs review/lifecycle.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-464d (engine v2 with multi-currency output), TASK-464e (UI with currency selector), TASK-473 (builder full-page surface migration)`
- Branch: `task/TASK-466-multi-currency-quote-output`
- Legacy ID: `parte de revenue pricing program`
- GitHub Issue: `none`

## Summary

Propagar multi-currency output al cliente: la quote se persiste en USD (canonical) + `output_currency` seleccionado (CLP/CLF/COP/MXN/PEN). El cliente la ve, recibe el PDF y el email en SU moneda (ej. Pinturas Berel en MXN, Sky en CLP). Internal users ven ambas (USD + local). Footer del documento muestra exchange rate usado + fecha para transparencia. La integración UI debe vivir en el builder full-page y en la vista de review, no en el drawer legacy.

## Why This Task Exists

TASK-464d genera output multi-currency desde el engine; TASK-464e expuso la selección de `output_currency`, pero el **rendering al cliente** todavía está hardcoded a CLP (default Efeonce Chile). Un cliente México recibe quote en CLP y no sabe convertir. Un cliente Colombia igual. Europa USD recibe USD pero no ve tabla de conversión.

Además, la surface de composición actual quedó anclada al drawer legacy; `TASK-473` corrige eso moviendo el builder a páginas dedicadas. `TASK-466` debe aterrizar directamente sobre esa surface correcta para no invertir esfuerzo en una UI transitoria.

Con 85% retainer recurrente + Pinturas Berel México cerrándose + expansion LATAM, la multi-currency output es UX crítica para experiencia profesional.

## Goal

- `greenhouse_commercial.quotations` tiene `output_currency` + `exchange_rate_snapshot` + `exchange_rate_date`
- API responses incluyen precios en la moneda de output
- PDF renderiza en output_currency con footer explicativo
- Email renderiza igual + breakdown currency summary
- Internal viewers ven toggle "USD / Cliente currency" en `QuoteDetailView`
- Create/edit surfaces (`/finance/quotes/new`, `/finance/quotes/[id]/edit`) exponen preview consistente con la moneda de salida

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` (TASK-349 PDF)

Reglas obligatorias:

- Exchange rate se **snapshotea** al momento de send (immutable) — quote ya enviada NO se regenera con rate nuevo
- Canonical storage sigue en USD + exchange_rate_snapshot
- PDF + email usan output_currency, con `conversion note` en footer: "Tipo de cambio USD→MXN: 20.50 al 2026-04-18 (Fuente: BCR)"

## Normative Docs

- TASK-349 PDF implementation (`src/lib/finance/pdf/`)
- TASK-464d engine v2 output structure
- `greenhouse_finance.exchange_rates` (source of truth para conversion)

## Dependencies & Impact

### Depends on

- TASK-464d — engine v2 con multi-currency
- TASK-464e — UI currency selector
- TASK-473 — builder full-page como surface correcta de create/edit
- `greenhouse_finance.exchange_rates` poblado con rates recientes

### Blocks / Impacts

- TASK-462 — MRR/ARR reporting puede filtrar por output_currency
- Client portal views — UI para ver quotes en su moneda
- Quote builder surfaces — preview y review deben quedar consistentes entre create/edit/detail
- TASK-348 governance — approval policies quizás quieren threshold in USD canonical, no en output currency (clarificar)

### Files owned

- `migrations/[verificar]-task-466-quote-output-currency.sql`
- `src/lib/finance/pdf/render-quotation-pdf.tsx` (refactor para output_currency)
- `src/lib/finance/pdf/quotation-pdf-document.tsx` (idem)
- `src/lib/email/templates/quote-sent.tsx` (refactor)
- `src/lib/finance/quote-to-cash/document-chain-reader.ts` (retornar en output_currency + USD)
- `src/views/greenhouse/finance/QuoteBuilderPageView.tsx` (preview/switching interno en full-page)
- `src/views/greenhouse/finance/QuoteDetailView.tsx` (toggle USD / local)
- `src/types/db.d.ts` (auto-regen)

## Current Repo State

### Already exists

- TASK-349 PDF rendering client-safe
- Engine v2 (TASK-464d) retorna multi-currency output
- `greenhouse_finance.exchange_rates` con rates CLP/CLF/USD

### Gap

- Quote no persiste `output_currency` ni `exchange_rate_snapshot`
- PDF/email siempre en CLP hardcoded
- No hay toggle internal USD/local
- Exchange rates para COP/MXN/PEN pueden no estar en la tabla (verificar)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## UI Plan

Esta task implementa UI descrita en **[TASK-469](TASK-469-commercial-pricing-ui-interface-plan.md)** y debe montarse sobre la surface full-page formalizada por `TASK-473`. Consumir en lugar de re-especificar:

- **Surface E — Quote Preview + Multi-currency**: reusa `full-version/src/views/apps/invoice/preview/PreviewCard.tsx` + `PreviewActions.tsx` + `print.css`. CurrencySwitcher en sidebar del builder full-page o en la vista de review, no dentro de `QuoteCreateDrawer`.
- **CurrencySwitcher**: nuevo en `src/components/greenhouse/pricing/CurrencySwitcher.tsx`. Props en TASK-469 §3.5. Muestra disclaimer de tasa cuando difiere de la canónica.
- **Regla diseño** (TASK-469 Open Questions): cliente ve solo moneda canónica; vista interna muestra selector con disclaimer `"Vista interna — la cotización enviada usa {canónica} (tasa {rate} al {asOf})"`.
- **QuotePdfDocument**: usar `@react-pdf/renderer` (ya instalado). PDF siempre en la moneda canónica snapshot, nunca recalculado.
- **Copy**: `GH_PRICING.currencyLabel`, `builderPreview`, copy de disclaimer arriba.
- **A11y**: `<select>` nativo (no custom) para currency switcher; announce change via `aria-live="polite"`.

## Scope

### Slice 1 — Schema + snapshot

```sql
ALTER TABLE greenhouse_commercial.quotations
  ADD COLUMN IF NOT EXISTS output_currency text DEFAULT 'CLP'
    CHECK (output_currency IN ('USD', 'CLP', 'CLF', 'COP', 'MXN', 'PEN')),
  ADD COLUMN IF NOT EXISTS exchange_rate_snapshot numeric(14,6),
  ADD COLUMN IF NOT EXISTS exchange_rate_date date,
  ADD COLUMN IF NOT EXISTS exchange_rate_source text;        -- 'bcr' | 'pre_calculated' | 'manual_override'

-- Totales en output currency (pre-calculados para performance)
ALTER TABLE greenhouse_commercial.quotations
  ADD COLUMN IF NOT EXISTS total_output_currency numeric(18,2),
  ADD COLUMN IF NOT EXISTS subtotal_output_currency numeric(18,2),
  ADD COLUMN IF NOT EXISTS tax_output_currency numeric(18,2);

-- Nota: total_amount_clp sigue siendo canonical porque muchos callers lo consumen;
-- total_output_currency es derived para display, refresheable
```

### Slice 2 — Exchange rate backfill

- Verificar cobertura de `greenhouse_finance.exchange_rates` para USD/CLP/CLF/COP/MXN/PEN
- Si falta alguna moneda:
  - Extender cron `economic-indicators-sync` para traer rates de BCR Chile + Banxico + BCRP Perú + Banrep Colombia
  - Fallback: usar precios pre-calculados del `sellable_role_pricing_currency` (TASK-464a) como "expected rate snapshot" cuando la tabla exchange_rates no tenga el par

### Slice 3 — Engine integration

- Cuando se crea quote (`POST /api/finance/quotes`), captura `exchange_rate_snapshot` del día actual:
  ```typescript
  const rate = await getExchangeRate({ from: 'USD', to: outputCurrency, date: today })
  // persist quote with exchange_rate_snapshot = rate, exchange_rate_date = today
  ```
- Al enviar quote (`/send`): **refresca** el exchange_rate si passaron >3 días desde creación (opcional, configurable)

### Slice 4 — PDF refactor

- `render-quotation-pdf.tsx`:
  - Acepta `outputCurrency` + `exchangeRateSnapshot` + `exchangeRateDate` en contracts
  - Renderiza línea items en output_currency (format localization)
  - Footer fiscal agrega: "Precios en {outputCurrency} al tipo de cambio USD 1 = {exchangeRateSnapshot} {outputCurrency}, {exchangeRateDate}"
  - Si outputCurrency=CLP: mantiene formato actual (no cambia UX existente)
  - Si outputCurrency=USD: oculta footer de conversion
- PDF preview rendering al crear quote: usa la misma lógica → AE ve cómo lo recibe el cliente

### Slice 5 — Email refactor

- `quote-sent.tsx` template:
  - Subject line incluye currency si ≠ CLP: "Cotización #XXX — MXN $XX.XXX"
  - Body renderiza totales en output_currency
  - Footer similar al PDF con conversion rate

### Slice 6 — UI internal toggle

- `QuoteBuilderPageView.tsx` y `QuoteDetailView.tsx`:
  - Para internal users (finance/admin): toggle "Ver en USD" / "Ver en {outputCurrency}"
  - En create/edit el preview usa la misma regla que el documento emitido
  - En detail/review el default es `output_currency` (lo que ve el cliente)
  - Switch muestra mismo data en USD para reconciliación/comparación

### Slice 7 — Document chain + downstream

- TASK-350 document chain reader: retornar montos en output_currency + USD
- TASK-462 MRR/ARR: agrupable por output_currency como dimensión

## Out of Scope

- Bidirectional currency conversion (cliente paga en moneda distinta a la de la quote) — follow-up
- Lock exchange rate por cliente (ej. Pinturas Berel siempre MXN a rate negociado) — feature V2
- Historia de exchange rates auditable a nivel línea — quedamos a nivel quote por simplicidad

## Detailed Spec

### Currency output ejemplo Pinturas Berel

Quote creada:
- BL: globe
- Client: Pinturas Berel (país México → auto-suggest output_currency='MXN', factor='international_usd' multiplicador 1.1)
- Commercial model: retainer (on_going)
- Total USD calculated: $7,600
- Exchange rate snapshot: USD 1 = MXN 18.50 (rate del 2026-04-18)
- Total MXN: 7,600 × 18.50 = MXN 140,600

PDF al cliente:
```
Cotización EFE-2026-042
Cliente: Pinturas Berel
Total: MXN 140,600
─────────────────────────────
Tipo de cambio aplicado:
USD 1 = MXN 18.50 (fecha: 18/Abr/2026)
```

Vista internal de finance:
```
Quote EFE-2026-042 — Pinturas Berel
Total (cliente ve): MXN 140,600
Total canonical:     USD 7,600
Exchange rate:       18.50 (2026-04-18, Banxico)
Margin efectivo:     45%
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Migration idempotente
- [ ] Exchange rates disponibles para USD/CLP/CLF/COP/MXN/PEN
- [ ] Quote creada con output_currency='MXN' persiste `exchange_rate_snapshot` + `exchange_rate_date`
- [ ] PDF genera en MXN con footer de conversion para quote MXN
- [ ] PDF genera en CLP normal para quote CLP (no cambia UX actual)
- [ ] Email renderiza subject + body en output currency
- [ ] Toggle "Ver en USD / Ver en {cliente}" funciona en QuoteDetailView
- [ ] Re-abrir quote 1 semana después: exchange_rate_snapshot NO cambia (immutable)

## Verification

- `pnpm migrate:up`
- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test`
- `pnpm build`
- Manual staging: crear quote MXN → descargar PDF → verificar rendering
- Manual: enviar email de prueba → verificar rendering

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] Chequeo impacto cruzado con TASK-462, TASK-463, TASK-460

## Follow-ups

- Exchange rate alerts si cambia >5% entre quote creation y send
- Lock exchange rate por cliente específico (negotiated rate)
- Client portal: ver quotes recibidas en su moneda

## Open Questions

- ¿Exchange rate date es `today` al crear o `quote_date` del quote? Propuesta: `today` (práctico — rate del día de envío al cliente es el justo).
- ¿Para USD clients internacionales: mostramos solo USD sin conversion? Propuesta: sí — footer omite conversion.
- ¿El total_output_currency persistido se refresca si AE cambia el currency mid-edit? Propuesta: sí, re-snapshot cada vez que se guarda el quote (hasta que se envía — luego es immutable).
