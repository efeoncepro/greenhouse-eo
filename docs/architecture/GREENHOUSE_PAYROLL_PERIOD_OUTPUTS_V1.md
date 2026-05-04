# Greenhouse Payroll — Period Outputs V1

> **Tipo de documento:** Spec de arquitectura canonica
> **Version:** 1.0
> **Creado:** 2026-05-04 por TASK-782 closing
> **Cobertura:** Receipt individual (TASK-758) + Period report PDF + Excel export (TASK-782)
> **Documento padre:** `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` (este V1 es la spec dedicada de la capa de outputs; el padre referencia este V1)

## 1. Alcance

Este documento define el **contrato canonico de los outputs de un periodo Payroll** — los artefactos visuales que ven el colaborador y el operador despues de calcular/aprobar/exportar un periodo:

1. **Recibo individual** (preview MUI + PDF descargable) — owned por TASK-758.
2. **PDF reporte mensual** del operador (`PeriodReportDocument`) — owned por TASK-782.
3. **Excel export** del operador (`generate-payroll-excel.ts`) — owned por TASK-782.

Los tres surfaces consumen el helper canonico `src/lib/payroll/receipt-presenter.ts` (TASK-758) como **single source of truth** para la clasificacion de regimen y los tokens visuales (badges).

## 2. Decisiones canonicas

### 2.1 Regimenes canonicos (4 valores cerrados)

```ts
type ReceiptRegime =
  | 'chile_dependent'      // indefinido + plazo_fijo
  | 'honorarios'           // honorarios SII Art. 74 N°2 LIR
  | 'international_deel'   // contractor + eor (jurisdiccion del trabajador)
  | 'international_internal' // payRegime='international' sin Deel
```

Detector primario: `entry.contractTypeSnapshot`. Fallbacks defensivos para data legacy: `payrollVia === 'deel'` → deel; `payRegime === 'chile' && siiRetentionAmount > 0` → honorarios; default seguro `chile_dependent`.

Orden canonico estable (no depende de orden alfabetico): `chile_dependent → honorarios → international_deel → international_internal`. Exportado como `RECEIPT_REGIME_DISPLAY_ORDER`.

Compile-time `never`-check defiende cualquier nuevo `ContractType` sin rama declarada en el switch del helper.

### 2.2 Subtotales mutuamente excluyentes

El motor asigna `chileTotalDeductions = siiRetentionAmount` para honorarios (decision deliberada en `calculate-payroll.ts`). Sumar todo bajo un unico subtotal "Total descuentos Chile" mezcla retencion SII con cotizaciones previsionales reales y rompe reconciliacion contra Previred + F29.

| Subtotal canonico | Sumas | Reconciliacion externa |
| --- | --- | --- |
| `Total descuentos previsionales` | SOLO `chile_dependent` (AFP + salud + cesantia + IUSC + APV) | Previred mensual |
| `Total retencion SII honorarios` | SOLO `honorarios` (`siiRetentionAmount`) | F29 retenciones honorarios |
| `Total Internacional Deel` | SOLO `international_deel` (bruto/neto USD) | (Deel emite recibo legal en jurisdiccion del trabajador) |
| `Total Internacional interno` | SOLO `international_internal` (bruto/neto en moneda contrato) | (Pago directo segun terminos contrato) |

**Regla dura**: ningun subtotal puede sumar entries de otro regimen. Cross-contamination = bug de implementacion.

### 2.3 Badges canonicos

| Codigo | Label | Background | Foreground |
| --- | --- | --- | --- |
| `CL-DEP` | Chile dependiente | `#d4edda` | `#155724` |
| `HON` | Honorarios | `#ffe8c2` | `#8a4a00` |
| `DEEL` | Internacional Deel | `#fff3d6` | `#8a6010` |
| `INT` | Internacional interno | `#e0e7ff` | `#2c3e91` |

Exportados desde `RECEIPT_REGIME_BADGES`. Reusados en preview MUI, PDF receipt, PDF period report y Excel.

### 2.4 Celdas N/A vs cero

- `—` en `var(--text-faint)` (`#999999`) = la columna NO aplica al regimen del entry/row.
- `$0` = la columna SI aplica pero el monto es cero en este periodo.

Esta distincion semantica es vinculante. Confundirlas degrada la lectura del archivo para compliance.

### 2.5 Estado terminal `excluded`

Entries con `grossTotal === 0 && netTotal === 0` (excluded por adjustment de TASK-745d) se renderizan **visibles** en todos los outputs:

- Recibo individual (TASK-758): hero degradado gris "Sin pago este periodo · $0", bloques haberes/asistencia/deductions omitidos, infoBlock variant `error` con causa.
- PDF reporte mensual (TASK-782): fila visible con chip `(excluido)` inline en el nombre, Base/OTD/RpA dim `—`, Bruto/Neto = `$0`. NO se omite — el operador necesita contar el universo.
- Excel `Detalle` sheet (preservado): columna `Excluido = Sí` + columna `Motivo descuento`.

## 3. Layout canonico — recibo individual (TASK-758)

Detalle completo en spec padre `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` §25.b. Resumen aqui:

| Regimen | Bloque deduccion | InfoBlock canonico | Hero |
| --- | --- | --- | --- |
| `chile_dependent` | `Descuentos legales` (AFP split + salud obl/vol + cesantia + IUSC + APV + gratificacion legal) | — | `Liquido a pagar` |
| `honorarios` | `Retencion honorarios` (Tasa SII + Retencion) | `Boleta de honorarios Chile · Art. 74 N°2 LIR · Tasa SII <year>` | `Liquido a pagar` |
| `international_deel` | (ninguno) | `Pago administrado por Deel` + `meta: deelContractId` cuando existe | `Monto bruto registrado` + footnote |
| `international_internal` | (ninguno) | `Regimen internacional` | `Liquido a pagar` |
| `excluded` (terminal) | (omitido) | `Excluido de esta nomina — <reason>` (variant `error`) | `Sin pago este periodo · $0` (degraded) |

`RECEIPT_TEMPLATE_VERSION = '4'` desde 2026-05-04 (TASK-758). Cualquier cambio visual requiere bump + lazy regen automatico.

## 4. Layout canonico — PDF reporte mensual (TASK-782)

### 4.1 Document structure (orientation landscape LETTER)

```
┌──────────────────────────────────────────────────────────────┐
│ Logo + Razon social + RUT + dir   │   Mes Año + Reporte ID  │
├──────────────────────────────────────────────────────────────┤
│ Title: REPORTE DE NOMINA                                      │
├──────────────────────────────────────────────────────────────┤
│ Summary strip — 8 KPIs (slots con N=0 se omiten):            │
│ COLABORADORES | ESTADO | # CL-DEP | # HON | # DEEL | # INT   │
│ | BRUTO CLP | NETO CLP | BRUTO USD                            │
├──────────────────────────────────────────────────────────────┤
│ Meta row: UF · UTM · Aprobado · Tabla tributaria              │
├──────────────────────────────────────────────────────────────┤
│ Section header: "Detalle — N colaboradores agrupados por reg."│
├──────────────────────────────────────────────────────────────┤
│ Table header (10 cols):                                       │
│ Nombre | Régimen | Mon. | Base | OTD | RpA | Bruto | Desc.   │
│ previs. | Retención SII | Neto                                │
├──────────────────────────────────────────────────────────────┤
│ Group divider: CHILE DEPENDIENTE · N COLABORADORES (bg blue)  │
│ rows chile_dep                                                │
│ subtotal: Total Chile dependiente | Bruto | Desc.previs | — |Neto│
├──────────────────────────────────────────────────────────────┤
│ Group divider: HONORARIOS · N COLABORADORES                   │
│ rows honorarios                                               │
│ subtotal: Total Honorarios | Bruto | — | Retencion SII | Neto │
├──────────────────────────────────────────────────────────────┤
│ Group divider: INTERNACIONAL DEEL · N COLABORADORES           │
│ rows deel                                                     │
│ subtotal: Total Internacional Deel | Bruto | — | — | Neto     │
├──────────────────────────────────────────────────────────────┤
│ Group divider: INTERNACIONAL INTERNO · N COLABORADORES        │
│ rows intl-internal                                            │
│ subtotal: Total Internacional interno | Bruto | — | — | Neto  │
├──────────────────────────────────────────────────────────────┤
│ Footer: Razon social — Mes Año | efeoncepro.com | Generado:..│
└──────────────────────────────────────────────────────────────┘
```

### 4.2 Column widths exactas

| Col | % | Justify |
| --- | --- | --- |
| Nombre | 17% | left |
| Regimen | 7% | center |
| Mon. (CLP/USD) | 5% | center |
| Base | 9% | right |
| OTD | 8% | right |
| RpA | 8% | right |
| Bruto | 9% | right |
| Desc. previs. | 10% | right |
| Retencion SII | 10% | right |
| Neto | 9% | right |

### 4.3 Reglas de visibilidad

- Grupos vacios (`N === 0`) se omiten **completos** (divider + rows + subtotal).
- Slots del summary strip se omiten cuando su contador es `0` (mantiene strip visualmente limpio).
- Meta row items se omiten individualmente cuando el field es `null`/`undefined` (UF, Aprobado, TaxTableVersion).

## 5. Layout canonico — Excel export (TASK-782)

### 5.1 Matriz de sheets

| # | Sheet | Owner | Contenido | Comportamiento |
| --- | --- | --- | --- | --- |
| 1 | `Resumen` | TASK-782 | Period metadata + 4-regime counters + 4 subtotales mutuamente excluyentes + per-currency totals | Siempre presente |
| 2 | `Chile` | TASK-782 🆕 | 13 columnas; 2 secciones internas (Chile dependiente + Honorarios) | Omitida si ambas secciones vacias |
| 3 | `Internacional` | TASK-782 🆕 | 7 columnas; 2 secciones internas (Deel + interno) | Omitida si ambas secciones vacias |
| 4 | `Detalle` | preservado | Audit raw — todas las columnas, todos los entries unificados, autoFilter | Siempre presente |
| 5 | `Asistencia & Bonos` | preservado | Dias + factores KPI + bonos | Siempre presente |

### 5.2 Sheet `Chile` — 13 columnas canonicas

```
# | Nombre | Régimen | Bruto | Gratif. | AFP | Salud | Cesantía
| IUSC | APV | Tasa SII | Retención SII | Neto
```

- Section row 1: `▼ Sección 1 · Chile dependiente (N colaboradores)` — bg `#D6E0EB`, brand-blue uppercase letter-spacing 1px. Cells de cols 5-10 (previsionales) llenas con valor; cells de cols 11-12 (SII) llenas con `—` y font color faint.
- Subtotal 1: `Total descuentos previsionales` con `cell.note` explicando "Suma SOLO descuentos previsionales (AFP/Salud/Cesantia/IUSC/APV) de colaboradores chile_dependent. Reconciliable contra Previred."
- Section row 2: `▼ Sección 2 · Honorarios (N colaboradores)`. Cells de cols 5-10 con `—` faint; cells de cols 11-12 con valor (Tasa SII como `0.0%` percentage, Retencion SII como CLP).
- Subtotal 2: `Total retencion SII honorarios` con `cell.note` "Suma SOLO retencion SII de boletas honorarios (Art. 74 N°2 LIR). Reconciliable contra F29 retenciones honorarios. NO mezclar con descuentos previsionales."

### 5.3 Sheet `Internacional` — 7 columnas

```
# | Nombre | Régimen | Moneda | Bruto | Neto | Contrato Deel / Jurisdicción
```

- Section 1 (Deel): `Contrato Deel` poblado cuando `deelContractId` existe; vacio cuando es null. Sin columnas de descuentos.
- Section 2 (Internacional interno): columna `Jurisdicción` vacia hasta que TASK derivada persista la jurisdiccion en `PayrollEntry`.

### 5.4 Reglas de visibilidad

- Si `chile_dependent.length === 0 && honorarios.length === 0` → sheet `Chile` se omite por completo del workbook.
- Si `international_deel.length === 0 && international_internal.length === 0` → sheet `Internacional` se omite.
- Si una unica seccion interna esta vacia (ej. solo `chile_dependent`, no `honorarios`), la sheet existe pero solo renderiza Section 1.

## 6. API canonica — helper compartido

Owner: `src/lib/payroll/receipt-presenter.ts` (TASK-758).

```ts
// Detector
resolveReceiptRegime(entry) → ReceiptRegime

// Grouping (consumido por PDF reporte mensual + Excel sheets)
groupEntriesByRegime(entries) → Record<ReceiptRegime, T[]>

// Display order (consumido por loops cross-task)
RECEIPT_REGIME_DISPLAY_ORDER: readonly ReceiptRegime[]

// Tokens visuales
RECEIPT_REGIME_BADGES: Record<ReceiptRegime, ReceiptRegimeBadge>

// Builder declarativo (recibo individual only)
buildReceiptPresentation(entry, breakdown?) → ReceiptPresentation
```

Toda surface operador-facing nueva que muestre agregaciones por regimen DEBE consumir `groupEntriesByRegime` + `RECEIPT_REGIME_DISPLAY_ORDER` + `RECEIPT_REGIME_BADGES`. Cualquier `entries.filter(e => e.payRegime === ...)` inline es bug.

## 7. Reglas duras anti-regresion

### Receipts (TASK-758)

- NUNCA `entry.payRegime === 'chile'` solo como detector. Toda deteccion pasa por `resolveReceiptRegime`.
- NUNCA `font-family: monospace` en surfaces user-facing. IDs tecnicos (deelContractId): `font-variant-numeric: tabular-nums` + `letter-spacing: 0.02em` sobre Geist Sans.
- NUNCA `font-feature-settings: 'tnum'`. Usar `font-variant-numeric: tabular-nums` (canonica V1).
- NUNCA `borderRadius` off-scale. Usar `customBorderRadius.{xs:2, sm:4, md:6, lg:8, xl:10}`.
- NUNCA color como unica senal de estado. InfoBlock siempre lleva titulo + body.
- NUNCA lime `#6ec207` para texto sobre blanco (falla 4.5:1). Variante contrast-safe `#2E7D32`.
- Cualquier nuevo `ContractType` requiere extender el switch del helper antes de mergear (compile-time `never`-check defiende esto).
- Cualquier cambio visual del PDF receipt requiere bump `RECEIPT_TEMPLATE_VERSION`.

### Period outputs (TASK-782)

- NUNCA sumar `chileTotalDeductions` cross-regimen como subtotal unico.
- NUNCA Regimen column con 2 valores (`CL`/`INT`). Siempre 4 (`CL-DEP`/`HON`/`DEEL`/`INT`).
- NUNCA celdas N/A con `$0`. Siempre `—` faint.
- NUNCA grupos vacios renderizados con `0` colaboradores. Omitir completos.
- NUNCA crear sheet operador-facing nueva que muestre agregaciones por regimen sin consumir `groupEntriesByRegime`.

## 8. Tests anti-regresion

| Path | Tests | Owner |
| --- | --- | --- |
| `src/lib/payroll/receipt-presenter.test.ts` | 46 (matriz regimen × adjustments + edge cases legacy + anti-regression invariants) | TASK-758 |
| `src/views/greenhouse/payroll/PayrollReceiptCard.test.tsx` | 13 (render por regimen + filas-fantasma + headers contextuales) | TASK-758 |
| `src/lib/payroll/generate-payroll-pdf.test.ts` | 5 (subtotales mutually exclusive + headers nuevos + badges 4-value + omision grupos vacios + summary strip CLP/USD) | TASK-782 |
| `src/lib/payroll/generate-payroll-excel.test.ts` | 7 (Resumen 4-regime + Chile 2 secciones + omision sheets + Internacional Deel contractId) | TASK-782 |
| `src/lib/payroll/payroll-export-packages.test.ts` | 11 (delivery batch pipeline) | preservado |

Total Payroll suite post-TASK-758/782: **372 tests verde**.

## 9. Archivos owned

### TASK-758

- `src/lib/payroll/receipt-presenter.ts`
- `src/lib/payroll/receipt-presenter.test.ts`
- `src/lib/payroll/generate-payroll-pdf.tsx` (`ReceiptDocument` only) + `RECEIPT_TEMPLATE_VERSION`
- `src/views/greenhouse/payroll/PayrollReceiptCard.tsx`
- `src/views/greenhouse/payroll/PayrollReceiptCard.test.tsx`
- `src/views/greenhouse/payroll/ProjectedPayrollView.tsx` (detector convergence)
- `docs/mockups/task-758-receipt-render-4-regimes.html` (mockup vinculante)

### TASK-782

- `src/lib/payroll/generate-payroll-pdf.tsx` (`PeriodReportDocument` only)
- `src/lib/payroll/generate-payroll-excel.ts` (Resumen + Chile + Internacional builders)
- `src/lib/payroll/generate-payroll-pdf.test.ts`
- `src/lib/payroll/generate-payroll-excel.test.ts`
- `docs/mockups/task-782-period-report-excel-honorarios-disaggregation.html` (mockup vinculante)

## 10. Reusabilidad cross-task

Cualquier surface operador-facing nueva (ej. dashboards de compliance, reportes anuales, exports a otro formato como CSV/JSON) que muestre agregaciones de payroll por regimen debe:

1. Importar `groupEntriesByRegime`, `RECEIPT_REGIME_DISPLAY_ORDER`, `RECEIPT_REGIME_BADGES` desde `@/lib/payroll/receipt-presenter`.
2. Iterar en orden canonico (`RECEIPT_REGIME_DISPLAY_ORDER`).
3. Producir subtotales mutuamente excluyentes.
4. Usar tokens canonicos para badges (`RECEIPT_REGIME_BADGES[regime].code/label/background/foreground`).
5. Omitir grupos vacios.
6. Distinguir `—` (no aplica) vs `$0` (aplica pero cero) en celdas.
7. Documentar como `## Delta` en este V1 si el surface introduce un nuevo formato/canal de output.

## 11. Referencias

- Spec padre Payroll: `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` (§25, §25.b, §25.c)
- Doc funcional: `docs/documentation/hr/recibos-y-reporte-mensual.md`
- Manual de uso: `docs/manual-de-uso/hr/descargar-y-reconciliar-nomina.md`
- TASK-758: `docs/tasks/complete/TASK-758-payroll-honorarios-receipt-render-contract-hardening.md`
- TASK-782: `docs/tasks/complete/TASK-782-payroll-period-report-excel-honorarios-disaggregation.md`
- Mockup TASK-758: `docs/mockups/task-758-receipt-render-4-regimes.html`
- Mockup TASK-782: `docs/mockups/task-782-period-report-excel-honorarios-disaggregation.html`
- CLAUDE.md sections: "Payroll — Receipt presentation contract" + "Payroll — Period report + Excel disaggregation"
