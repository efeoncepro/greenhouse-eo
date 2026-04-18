# TASK-466 — Multi-Currency Quote Output (Client View + PDF + Email)

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
- Blocked by: `TASK-464d (engine v2 with multi-currency output), TASK-464e (UI with currency selector)`
- Branch: `task/TASK-466-multi-currency-quote-output`
- Legacy ID: `parte de revenue pricing program`
- GitHub Issue: `none`

## Summary

Propagar multi-currency output al cliente: la quote se persiste en USD (canonical) + output_currency seleccionado (CLP/CLF/COP/MXN/PEN). El cliente la ve, recibe el PDF y el email en SU moneda (ej. Pinturas Berel en MXN, Sky en CLP). Internal users ven ambas (USD + local). Footer del documento muestra exchange rate usado + fecha para transparencia.

## Why This Task Exists

TASK-464d genera output multi-currency desde el engine; TASK-464e permite seleccionar `output_currency` en el drawer. Pero el **rendering al cliente** todavía está hardcoded a CLP (default Efeonce Chile). Un cliente México recibe quote en CLP y no sabe convertir. Un cliente Colombia igual. Europa USD recibe USD pero no ve tabla de conversión.

Con 85% retainer recurrente + Pinturas Berel México cerrándose + expansion LATAM, la multi-currency output es UX crítica para experiencia profesional.

## Goal

- `greenhouse_commercial.quotations` tiene `output_currency` + `exchange_rate_snapshot` + `exchange_rate_date`
- API responses incluyen precios en la moneda de output
- PDF renderiza en output_currency con footer explicativo
- Email renderiza igual + breakdown currency summary
- Internal viewers ven toggle "USD / Cliente currency" en QuoteDetailView

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
- `greenhouse_finance.exchange_rates` poblado con rates recientes

### Blocks / Impacts

- TASK-462 — MRR/ARR reporting puede filtrar por output_currency
- Client portal views — UI para ver quotes en su moneda
- TASK-348 governance — approval policies quizás quieren threshold in USD canonical, no en output currency (clarificar)

### Files owned

- `migrations/[verificar]-task-466-quote-output-currency.sql`
- `src/lib/finance/pdf/render-quotation-pdf.tsx` (refactor para output_currency)
- `src/lib/finance/pdf/quotation-pdf-document.tsx` (idem)
- `src/lib/email/templates/quote-sent.tsx` (refactor)
- `src/lib/finance/quote-to-cash/document-chain-reader.ts` (retornar en output_currency + USD)
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

- `QuoteDetailView.tsx`:
  - Para internal users (finance/admin): toggle "Ver en USD" / "Ver en {outputCurrency}"
  - Default: output_currency (lo que ve el cliente)
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
