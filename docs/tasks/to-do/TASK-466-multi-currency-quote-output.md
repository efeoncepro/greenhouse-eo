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

## Delta 2026-04-19 — Dependencia explícita de foundation FX Greenhouse

La spec asumía que la cobertura multi-moneda para `CLF/COP/MXN/PEN` podía resolverse dentro del lane de quotes. Ese supuesto ya no es suficiente: el repo tiene una capa pricing más amplia, pero finance core, sync operativo y varios consumers siguen contratos distintos.

**Ajuste canónico:**

1. `TASK-466` deja de cargar con la deuda de plataforma FX/currency.
2. La robustez y escalabilidad de monedas y tipos de cambio se mueve a `TASK-475`.
3. Esta task consume esa foundation para output client-facing, snapshot y render, en vez de inventar reglas locales en quotes.

## Delta 2026-04-19 — Foundation FX landed (TASK-475 cerrada)

TASK-475 ya mergeada. Esta task debe consumir explícitamente:

1. **Readiness gate antes de snapshot**: llamar `GET /api/finance/exchange-rates/readiness?from=USD&to=<outputCurrency>&domain=pricing_output` antes de permitir el "Enviar cotización" client-facing. Si `state === 'unsupported'`, bloquear. Si `supported_but_stale` o `temporarily_unavailable`, permitir con warning visible en el dialog de envío.
2. **Threshold client-facing stricter**: usar `CLIENT_FACING_STALENESS_THRESHOLD_DAYS = 3` (exportado de `src/lib/finance/currency-domain.ts`) para decidir si avisar al AE antes de enviar, aunque el engine consider`supported` al threshold default 7d.
3. **Snapshot en `quotations.exchange_rates`**: congelar el payload de `FxReadiness.rate` + `rateDateResolved` + `source` en el momento del send. PDF/email consumen ese snapshot, no vuelven a resolver FX.
4. **Composición vía USD visible**: cuando `readiness.composedViaUsd === true`, surfacear chip "Tasa derivada vía USD" en el preview para que el AE sepa que no hay tasa directa.
5. **`fx_fallback` warnings del engine**: el preview de cotización ya los muestra en `QuotePricingWarningsPanel` (TASK-473). El flujo de envío debe re-chequearlos y bloquear si algún warning tiene `severity === 'critical'`.
6. **Monedas `manual_only`** (hoy `CLF/COP/MXN/PEN`): TASK-466 no implementa providers automáticos. Si el AE necesita enviar en esas monedas, un admin de finance debe upsertar la tasa manualmente — la UI debe hacer visible ese paso.

## Delta 2026-04-20 — Revisión contra codebase real

La revisión contra el repo confirma que parte relevante de la foundation ya aterrizó y la task debe recortarse al gap real:

1. El builder full-page ya expone `outputCurrency` en `QuoteBuilderActions`, `QuoteBuilderShell` y `QuoteContextStrip`; esa parte no hay que rediseñarla.
2. La quote canónica ya persiste `currency`, `exchange_rates` y `exchange_snapshot_date`; esta task **no debe abrir una segunda capa paralela** `output_currency` mientras el contrato activo siga siendo ese.
3. El gap vigente es client-facing: snapshot al emitir/enviar, PDF, email, detail/review toggle y document chain alineados a la moneda de salida.
4. `TASK-473`, `TASK-475`, `TASK-464d` y `TASK-464e` ya no bloquean el trabajo documental. El único condicionante operativo vigente para CLF/COP/MXN/PEN en producción sigue siendo `TASK-485`.

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
- Blocked by: `TASK-485 (solo para rollout auto_synced CLF/COP/MXN/PEN en producción)`
- Branch: `task/TASK-466-multi-currency-quote-output`
- Legacy ID: `parte de revenue pricing program`
- GitHub Issue: `none`

## Summary

Cerrar el rendering client-facing multi-moneda de la quote canónica actual. La quote ya persiste `currency` + `exchange_rates`; esta task debe congelar y consumir ese snapshot al emitir/enviar para que PDF, email, detail/review y document chain hablen el mismo contrato y el cliente vea la cotización en su moneda.

## Why This Task Exists

El engine y el builder ya soportan la selección de moneda de salida, pero el **rendering client-facing** todavía no quedó convergido al contrato canónico. Hoy el repo sigue resolviendo PDF, detail y document chain principalmente desde `currency`, y el snapshot FX todavía no se endurece de forma consistente al emitir/enviar.

El riesgo real ya no es el drawer legacy; ese corte quedó atrás con `TASK-473`. El riesgo ahora es dejar dos verdades:

- builder interno mostrando una moneda,
- documento/email/detalle usando otra resolución o reconsultando FX tarde.

Con 85% retainer recurrente + Pinturas Berel México cerrándose + expansion LATAM, la multi-currency output es UX crítica para experiencia profesional.

## Goal

- `greenhouse_commercial.quotations` usa de forma consistente `currency` + `exchange_rates` + `exchange_snapshot_date` como snapshot client-facing
- `POST /api/finance/quotes/[id]/issue` y/o `/send` congelan y validan el FX snapshot antes de exponer la quote al cliente
- PDF renderiza en la moneda snapshot con footer explicativo cuando corresponde
- Email/send flow reutiliza el mismo snapshot y el mismo gating de readiness
- Internal viewers ven toggle `"USD / moneda cliente"` en `QuoteDetailView` sin mutar el documento histórico

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` (TASK-349 PDF)

Reglas obligatorias:

- Exchange rate se **snapshotea** al momento de send (immutable) — quote ya enviada NO se regenera con rate nuevo
- Mientras el contrato canónico siga siendo `currency + exchange_rates + exchange_snapshot_date`, esta task no crea una columna paralela `output_currency`
- PDF + email usan output_currency, con `conversion note` en footer: "Tipo de cambio USD→MXN: 20.50 al 2026-04-18 (Fuente: BCR)"

## Normative Docs

- TASK-349 PDF implementation (`src/lib/finance/pdf/`)
- TASK-464d engine v2 output structure
- `greenhouse_finance.exchange_rates` (source of truth para conversion)

## Dependencies & Impact

### Depends on

- `src/app/api/finance/quotes/[id]/issue/route.ts`
- `src/app/api/finance/quotes/[id]/send/route.ts`
- `src/app/api/finance/quotes/[id]/pdf/route.ts`
- `src/lib/finance/quotation-canonical-store.ts`
- `src/lib/finance/quote-to-cash/document-chain-reader.ts`
- `src/lib/finance/currency-domain.ts`
- `src/lib/finance/fx-readiness.ts`
- `TASK-485` solo como rollout operacional para `auto_synced` en CLF/COP/MXN/PEN

### Blocks / Impacts

- TASK-462 — MRR/ARR reporting puede filtrar por output_currency
- Client portal views — UI para ver quotes en su moneda
- Quote builder surfaces — preview y review deben quedar consistentes entre create/edit/detail
- TASK-348 governance — approval policies quizás quieren threshold in USD canonical, no en output currency (clarificar)

### Files owned

- `src/app/api/finance/quotes/[id]/issue/route.ts`
- `src/app/api/finance/quotes/[id]/send/route.ts`
- `src/app/api/finance/quotes/[id]/pdf/route.ts`
- `src/lib/finance/pdf/render-quotation-pdf.ts`
- `src/lib/finance/pdf/quotation-pdf-document.tsx`
- `src/lib/finance/quote-to-cash/document-chain-reader.ts`
- `src/lib/finance/quotation-canonical-store.ts`
- `src/views/greenhouse/finance/QuoteBuilderPageView.tsx`
- `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx`
- `src/views/greenhouse/finance/workspace/QuoteBuilderActions.tsx`
- `src/views/greenhouse/finance/workspace/QuoteSendDialog.tsx`
- `src/views/greenhouse/finance/QuoteDetailView.tsx`
- `src/types/db.d.ts`

## Current Repo State

### Already exists

- selector de moneda de salida en builder full-page
- endpoint `GET /api/finance/exchange-rates/readiness`
- `pricing-engine-v2` emite warnings `fx_fallback`
- quote canónica persiste `currency`, `exchange_rates` y `exchange_snapshot_date`
- PDF runtime existente sobre `src/lib/finance/pdf/*`

### Gap

- Falta endurecer el snapshot FX client-facing al emitir/enviar
- PDF y document chain siguen leyendo un contrato single-currency sin explicación de snapshot
- No existe todavía una surface consistente `"USD / moneda cliente"` en review/detail
- No existe template outbound de quote claramente anclado al mismo snapshot histórico

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

### Slice 1 — Snapshot y gating en send/issue

- Reusar `quotations.currency`, `exchange_rates` y `exchange_snapshot_date` como snapshot histórico client-facing.
- Antes de `issue/send`, llamar readiness endpoint y endurecer el gate:
  - `unsupported` => bloquea
  - `supported_but_stale` / `temporarily_unavailable` => warning explícito
  - `fx_fallback.severity === 'critical'` => bloquea
- Si el snapshot actual no alcanza para explicar fuente/fecha/composed-via-USD, extender el objeto `exchange_rates` y no crear columnas paralelas innecesarias.

### Slice 2 — PDF y review/detail alineados

- `render-quotation-pdf.ts` y `quotation-pdf-document.tsx` deben consumir el snapshot persistido y no recalcular FX on demand.
- Footer explicativo:
  - visible cuando la moneda snapshot no es USD o cuando la tasa fue compuesta vía USD
  - omisible cuando no agrega información
- `QuoteDetailView` agrega toggle interno `"USD / moneda cliente"` sin mutar el documento histórico.

### Slice 3 — Send dialog y outbound client-facing

- `QuoteSendDialog.tsx` hace visible freshness, composición vía USD y warnings críticos antes de issue/send.
- Si todavía no existe template outbound de quote, esta task debe crear el contrato mínimo reutilizando el mismo snapshot del PDF.
- El payload que sale al cliente y el PDF deben leer exactamente el mismo snapshot.

### Slice 4 — Document chain y downstream

- `document-chain-reader` debe exponer montos y metadata suficientes para mostrar la moneda client-facing sin perder el ancla USD interna.
- `QuoteBuilderPageView` / `QuoteBuilderShell` deben mostrar preview consistente con la moneda de salida ya seleccionada, sin rediseñar el selector existente.

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

- [ ] La quote emitida/enviada persiste un snapshot FX reutilizable usando el contrato canónico vigente (`currency`, `exchange_rates`, `exchange_snapshot_date` o su extensión explícita)
- [ ] Exchange rates disponibles para USD/CLP/CLF/COP/MXN/PEN o bien la UI deja explícito el bloqueo/warning correspondiente
- [ ] PDF genera en MXN con footer de conversion para quote MXN
- [ ] PDF genera en CLP normal para quote CLP (no cambia UX actual)
- [ ] Send/email client-facing reutiliza el mismo snapshot del PDF
- [ ] Toggle "Ver en USD / Ver en {cliente}" funciona en QuoteDetailView
- [ ] Re-abrir quote 1 semana después: exchange_rate_snapshot NO cambia (immutable)

## Verification

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
- ¿Hace falta una columna explícita `output_currency` o alcanza con endurecer `currency + exchange_rates`? Propuesta actual: **alcanza con el contrato vigente** mientras no exista decisión arquitectónica que separe moneda interna de moneda client-facing.
