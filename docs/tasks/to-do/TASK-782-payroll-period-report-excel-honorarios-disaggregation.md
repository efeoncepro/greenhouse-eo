# TASK-782 — Payroll Period Report + Excel Honorarios Disaggregation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `TASK-758`
- Branch: `task/TASK-782-payroll-period-report-excel-honorarios`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Corrige las superficies operador-facing (PDF reporte mensual + Excel export) que hoy mezclan retención SII de honorarios con descuentos previsionales de Chile dependiente bajo un mismo subtotal "Total descuentos Chile". Reusa el helper canónico `resolveReceiptRegime` exportado por `TASK-758` para separar honorarios en agrupación propia, evitando que un compliance officer o un operador de SII/PREVIRED interprete el agregado como cotizaciones reales cuando una parte es retención de boleta.

## Why This Task Exists

La auditoría profunda de receipts (2026-05-04) detectó que:

- `PeriodReportDocument` en `src/lib/payroll/generate-payroll-pdf.tsx` (líneas 360-365): `chileEntries = entries.filter(e => e.payRegime === 'chile')` agrupa honorarios + dependientes Chile. `totalDeductionsClp = sum(chileTotalDeductions)` mezcla `siiRetentionAmount` (honorarios, vía la asignación que hace `calculate-payroll.ts:271`) con AFP/salud/cesantía/IUSC reales.
- `generate-payroll-excel.ts` (líneas 99, 269): mismo patrón — la pestaña Chile mezcla los dos casos. Para honorarios, las columnas AFP/Salud/Cesantía aparecen vacías o en cero, mientras la columna IUSC contiene la retención SII confundiendo el reading.

Consecuencia operativa:

- Un agente de SII/PREVIRED que descargue el reporte mensual ve un "Total descuentos Chile" inflado con retenciones de honorarios — riesgo de interpretación incorrecta.
- El operador de Compliance no puede subtotal natural por concepto fiscal sin abrir cada entry uno por uno.
- Cualquier reconciliación contra Previred/F29 falla por agregación impura.

El surface es operador-facing distinto del recibo individual del colaborador, por lo que se separa de TASK-758 para mantener el helper de recibos puro y enfocado.

## Goal

- En `PeriodReportDocument`: separar visualmente Honorarios de Chile dependiente.
  - 3 grupos en lugar de 2: `Chile dependiente`, `Honorarios`, `Internacional`.
  - Subtotales separados: `Total descuentos previsionales Chile` (solo dependientes) + `Total retención SII honorarios` (solo honorarios).
  - Columna "Régimen" muestra `CL-DEP` / `HON` / `DEEL` / `INT` (4 valores) en vez de `CL` / `INT`.
- En Excel export:
  - Para `payRegime === 'chile'` AND `regime === 'honorarios'` (vía helper canónico), columnas previsionales (AFP/Salud/Cesantía) vacías limpiamente con tag visual; columna "Retención SII honorarios" propia.
  - Subtotales por grupo separados.
- No tocar el motor de cálculo. No tocar el recibo individual del colaborador (TASK-758 owns).
- Reusar `resolveReceiptRegime` exportado por TASK-758 — single source of truth para clasificación de régimen en surfaces de output.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` (sección Receipt PDF + Period Report)
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- **Mockup canónico vinculante (2026-05-04)**: `docs/mockups/task-782-period-report-excel-honorarios-disaggregation.html` es el contrato visual aprobado. Ver "Approved Visual Spec — Mockup canónico" más abajo. La implementación replica el mockup 1:1 estructural; cualquier desviación voluntaria requiere update + re-aprobación del mockup ANTES de mergear código. PR sin capturas side-by-side (mockup HTML | PDF real | Excel real) = block.
- **Bloqueada por `TASK-758`**: depende del helper `resolveReceiptRegime` exportado por `src/lib/payroll/receipt-presenter.ts`. No avanzar hasta que TASK-758 esté `complete`.
- **No duplicar la lógica de detección**. Toda detección de régimen pasa por `resolveReceiptRegime`. Si el shape input de Excel/PDF no es asignable directo a `PayrollEntry`, agregar adaptador mínimo, no inventar otro detector.
- **No tocar motor**.
- **No tocar recibo individual** (TASK-758).
- Bumpar `RECEIPT_TEMPLATE_VERSION` solo si cambia el rendering del recibo individual — el reporte de período NO usa esa constante. Si hay artefactos cacheados de PeriodReportDocument, regen ventana es trivial (no se cachea binario por entry).

## Normative Docs

- `docs/tasks/to-do/TASK-758-payroll-honorarios-receipt-render-contract-hardening.md` (provee el helper canónico)
- `docs/tasks/complete/TASK-744-payroll-chile-compliance-remediation.md`
- `docs/documentation/hr/periodos-de-nomina.md`

## Dependencies & Impact

### Depends on

- `src/lib/payroll/receipt-presenter.ts` (creado por TASK-758)
- `src/types/payroll.ts`
- `src/lib/payroll/generate-payroll-pdf.tsx` (PeriodReportDocument)
- `src/lib/payroll/generate-payroll-excel.ts`

### Blocks / Impacts

- Reduce riesgo de mis-interpretación de reportes mensuales por compliance/SII/PREVIRED.
- Habilita reconciliación natural por concepto fiscal (descuentos previsionales reales vs retención SII honorarios).
- No bloquea otras tasks downstream.

### Files owned

- `src/lib/payroll/generate-payroll-pdf.tsx` (PeriodReportDocument refactor — NO ReceiptDocument, ése es de TASK-758)
- `src/lib/payroll/generate-payroll-excel.ts`
- `src/lib/payroll/generate-payroll-pdf.test.ts` (o nuevo)
- `src/lib/payroll/generate-payroll-excel.test.ts` (o nuevo)
- `docs/mockups/task-782-period-report-excel-honorarios-disaggregation.html` 🆕 (contrato visual aprobado — vinculante)
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` (subsección reporte mensual)
- `docs/documentation/hr/periodos-de-nomina.md`

## Current Repo State

### Already exists

- `PeriodReportDocument` (PDF) y `generate-payroll-excel.ts` ya existen y agrupan por `payRegime`.
- `chileTotalDeductions` para honorarios contiene `siiRetentionAmount` (asignación deliberada en `calculate-payroll.ts:271`).
- `siiRetentionAmount` y `siiRetentionRate` persistidos en `PayrollEntry`.

### Gap

- Ambos surfaces agregan honorarios al pool "Chile" sin distinción.
- Excel mezcla columnas previsionales con retención SII en la misma fila Chile.
- No hay subtotal específico de "Retención SII honorarios" en ninguno de los dos surfaces.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma la task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — PeriodReportDocument (PDF) refactor

- Reemplazar `chileEntries = entries.filter(e => e.payRegime === 'chile')` por una clasificación en 3-4 grupos usando `resolveReceiptRegime`:
  - `dependentEntries` = `regime === 'chile_dependent'`
  - `honorariosEntries` = `regime === 'honorarios'`
  - `internationalEntries` = `regime === 'international_deel' || === 'international_internal'`
- Subtotales separados:
  - `Total bruto Chile dependiente` + `Total descuentos previsionales` + `Total neto Chile dependiente`
  - `Total bruto honorarios` + `Total retención SII` + `Total neto honorarios`
  - `Total bruto internacional` + `Total neto internacional` (sin descuentos)
- Columna "Régimen" con valores `CL-DEP` / `HON` / `DEEL` / `INT` (4 valores) en vez de `CL` / `INT`.
- Summary strip top: agregar contadores por grupo (`# Dependientes`, `# Honorarios`, `# Internacional`) cuando la cardinalidad sea > 0.

### Slice 2 — Excel export refactor

- En `generate-payroll-excel.ts`, clasificar entries por `resolveReceiptRegime` antes de poblar la pestaña Chile.
- Separar Chile dependiente y Honorarios en **dos secciones** dentro de la misma pestaña Chile (con header de grupo y subtotal por grupo) o en **dos pestañas distintas** (`Chile - Dependientes` y `Chile - Honorarios`). Decisión a definir en Discovery según UX preferida del operador (recomendación: dos secciones en la misma pestaña para preservar lectura unificada por mes).
- Agregar columna específica `Retención SII (honorarios)` con `siiRetentionAmount` solo para filas honorarios.
- Para filas honorarios, columnas previsionales (`AFP`, `Salud`, `Cesantía`, `IUSC`) quedan vacías con valor `—` consistente.
- Subtotal "Total retención SII honorarios" separado del subtotal "Total descuentos previsionales".

### Slice 3 — Tests + docs

- Tests unitarios:
  - `generate-payroll-pdf.test.ts`: assertir estructura del PeriodReportDocument con fixture mixto (dependientes + honorarios + Deel) — verificar 3 grupos y subtotales correctos.
  - `generate-payroll-excel.test.ts`: assertir layout Excel con el mismo fixture.
- Verificación manual: descargar reporte mensual + Excel de un período real con al menos 1 honorario y 1 Deel; confirmar lectura natural por compliance officer.
- Actualizar `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` (subsección reporte mensual + Excel) con la nueva agrupación canónica.
- Actualizar `docs/documentation/hr/periodos-de-nomina.md` con nota funcional de qué subtotales ve el operador.

## Out of Scope

- No tocar motor (`calculate-payroll.ts`, `calculate-honorarios.ts`, etc.).
- No tocar recibo individual del colaborador (TASK-758 owns `ReceiptDocument` y `PayrollReceiptCard`).
- No agregar columnas de costo empleador (SIS, cesantía empleador, mutual) — feature operador-facing distinto.
- No cambiar el contrato de `payroll_export_packages` ni el pipeline de envío de receipts.
- No mezclar Payment Orders ni accounting downstream.

## Approved Visual Spec — Mockup canónico (2026-05-04)

> **Estado: APROBADO por el usuario.** El mockup `docs/mockups/task-782-period-report-excel-honorarios-disaggregation.html` es el contrato visual canónico de esta task. Toda implementación (PDF reporte mensual + Excel multi-sheet) **debe replicarlo 1:1 estructural**. Cualquier desviación voluntaria requiere actualizar primero el mockup y re-aprobar.

### Artefactos canónicos

- `docs/mockups/task-782-period-report-excel-honorarios-disaggregation.html` — mockup HTML aprobado (PDF landscape + Excel multi-sheet con secciones)
- Servidor local: `cd docs/mockups && python3 -m http.server 4758` → [`http://127.0.0.1:4758/task-782-period-report-excel-honorarios-disaggregation.html`](http://127.0.0.1:4758/task-782-period-report-excel-honorarios-disaggregation.html)

### Auditoría aplicada al mockup (skills consumidas)

El mockup pasó las 6 skills aplicables: `modern-ui` (global), `greenhouse-ux` (repo/global), `greenhouse-ui-review` (repo), `greenhouse-microinteractions-auditor` (repo), `microinteractions-auditor` (global), `greenhouse-payroll-auditor` (repo). Resultado: 0 blockers, 0 modern-bar issues. Reusa tokens y badges del mockup TASK-758.

### Decisiones visuales canonizadas

| Tópico | Decisión | Justificación |
| --- | --- | --- |
| Familias tipográficas | `Geist Sans` body + `Poppins` display (max 2) | Paridad TASK-758 + DESIGN.md V1. |
| Números | `font-variant-numeric: tabular-nums` sobre Geist Sans | Alineación columnar sin monospace user-facing. |
| BorderRadius card / window | `theme.shape.customBorderRadius.md` = 6px | Cards canónico V1. |
| BorderRadius infoBlock | `theme.shape.customBorderRadius.sm` = 4px | Variants secundarias V1. |
| Spacing PDF | padding `spacing(8, 10, 6)` = 32/40/24 | Todos en escala canónica. |
| Brand blue PDF | `#023c70` (role `account`) | Hex existente preservado. |
| Excel toolbar green | `#1F7244` + tab bg `#E5F2EA` | Convención visual de spreadsheet, NO de Greenhouse — convención reconocible por operador. |
| Group divider rows | bg `#d6e0eb` + texto `--brand-blue` + uppercase + letter-spacing 1px | Ejecutivo identifica grupo sin leer columna régimen. |
| Subtotal rows | bg `--brand-accent-bg` (`#E8EFF7`) + border-top 1.5px `--brand-blue` + bold | Patrón existente reforzado. |
| Celdas N/A | texto `—` en `var(--text-faint)` (`#999`) — clase `dim` | NUNCA `$0` (lectura ambigua: cero vs no-aplica). |
| Régimen badges | reusan tokens del mockup TASK-758: `CL-DEP`/`HON`/`DEEL`/`INT` | Single source of truth visual cross-task. |
| Estado `excluded` | fila visible con `$0` en Bruto/Neto + `—` resto + chip "⚠ excluido" rojo | Operador necesita contar el universo, NO se omite. |

### Reglas duras de implementación (1:1 contra mockup)

1. **Single source of truth de clasificación** — ambos surfaces consumen `resolveReceiptRegime` exportado por TASK-758. Helper auxiliar nuevo `groupEntriesByRegime(entries) → Record<ReceiptRegime, PayrollEntry[]>` también exportado por `receipt-presenter.ts` (TASK-758) o por nuevo `receipt-grouping.ts` cuando emerja el segundo callsite. NUNCA reimplementar el detector inline.

2. **Orden canónico de regímenes** — fijo en ambos surfaces:
   `chile_dependent → honorarios → international_deel → international_internal`. Stable, NO depende de orden alfabético del nombre. Definido como `const REGIME_DISPLAY_ORDER` exportado.

3. **PDF — Summary strip ampliado a 8 KPIs**:
   `Colaboradores | Estado | #CL-DEP | #HON | #DEEL | Bruto CLP | Neto CLP | Bruto USD`. Si una cardinalidad es 0, el slot se OMITE (no se renderiza con valor 0). Si CLP totals son 0 (universo 100% internacional), se omiten los slots Bruto CLP / Neto CLP. Si USD totals son 0, se omite el slot Bruto USD.

4. **PDF — Tabla con 10 columnas** (antes 9), porcentajes EXACTOS:
   `Nombre 17% | Régimen 7% | Mon. 5% | Base 9% | OTD 8% | RpA 8% | Bruto 9% | Desc. previs. 10% | Retención SII 10% | Neto 9%`. La columna "Retención SII" es nueva.

5. **PDF — Group divider rows** entre regímenes (bg `#d6e0eb`, texto brand-blue uppercase letter-spacing 1px, colspan completo). Texto canónico: `Chile dependiente · N colaboradores`, `Honorarios · N colaboradores`, `Internacional Deel · N colaboradores`, `Internacional interno · N colaboradores`. Si N = 0 para un régimen, el grupo COMPLETO se omite (divider + filas + subtotal).

6. **PDF — 4 subtotales independientes** (uno por régimen presente):
   - `Total Chile dependiente` — fila con Bruto, Desc. previs., `—` en Retención SII, Neto.
   - `Total Honorarios` — Bruto, `—` en Desc. previs., Retención SII, Neto.
   - `Total Internacional Deel` — Bruto USD, `—` en Desc. previs., `—` en Retención SII, Neto USD.
   - `Total Internacional interno` — idem Deel.
   Subtotales mutuamente excluyentes: ningún subtotal suma valores de otro régimen. Cualquier cross-contamination = bug de implementación.

7. **PDF — Estado `excluded`** se renderiza como fila normal (no se omite) con: `Base/OTD/RpA = —`, `Bruto = $0`, `Desc. previs. = $0`, `Retención SII = —`, `Neto = $0`, y chip warning `⚠ excluido` (rojo error-border) inline en el nombre. Cuenta en el N del divider del régimen al que pertenece.

8. **PDF — Meta row** debajo del summary: `UF: <ufValue> · UTM: <utmValue> · Aprobado: <approvedAt> · Tabla tributaria: <taxTableVersion>`. Ítems sólo se renderizan si están poblados.

9. **Excel — pestaña Chile con 2 secciones internas** (decisión canónica frente a alternativa "2 pestañas separadas"):
   - Section row `▼ Sección 1 · Chile dependiente (N colaboradores)` — colspan completo, bg `#d6e0eb`.
   - Filas dependientes con columnas previsionales pobladas, columnas SII = `—`.
   - Subtotal `Total descuentos previsionales` — texto alineado a derecha, bg `--brand-accent-bg`, bold.
   - Section row `▼ Sección 2 · Honorarios (N colaboradores)`.
   - Filas honorarios con columnas SII pobladas, columnas previsionales = `—`.
   - Subtotal `Total retención SII honorarios`.

10. **Excel — pestaña Chile · 13 columnas exactas**:
    `# | Nombre | Régimen | Bruto | Gratif. | AFP | Salud | Cesantía | IUSC | APV | Tasa SII | Retención SII | Neto`. Las columnas 5-10 son previsionales (sólo CL-DEP), las 11-12 son SII (sólo HON). Para celdas no aplicables: `—` clase `dim`.

11. **Excel — pestaña Internacional con 2 secciones internas** análogas (no graficada en mockup por simplicidad pero estructuralmente paralela):
    - Section row `▼ Sección 1 · Internacional Deel (N colaboradores)` con columna informativa adicional `Contrato Deel` que muestra `deelContractId` cuando existe (vacío en lugar de `—` cuando es null — siguiendo convención Excel para campos opcionales).
    - Subtotal `Total Internacional Deel`.
    - Section row `▼ Sección 2 · Internacional interno (N colaboradores)` con columna `Jurisdicción`.
    - Subtotal `Total Internacional interno`.
    Sin columnas de descuentos previsionales ni retención SII (no aplican).

12. **Excel — pestañas (orden + iconos)**:
    `📋 Resumen` → `🇨🇱 Chile` → `🌍 Internacional`. Una pestaña Chile con 2 secciones internas (NO 2 pestañas separadas). Una pestaña Internacional con 2 secciones internas (NO 2 pestañas separadas).

13. **Régimen badges** — reusan exactamente los tokens del mockup TASK-758. Si TASK-758 cambia los hex de los badges, el cambio se propaga acá automáticamente porque consumimos los mismos exports de `receipt-presenter.ts`.

14. **Tokens prohibidos** (heredados auditoría TASK-758):
    - **NUNCA** `font-family: monospace` en celdas user-facing del PDF/Excel.
    - **NUNCA** `font-feature-settings: 'tnum'`. Usar `font-variant-numeric: tabular-nums` (canónica V1).
    - **NUNCA** `borderRadius` off-scale (3, 5, 7, 12). Usar tokens `customBorderRadius.{xs:2, sm:4, md:6, lg:8, xl:10}`.
    - **NUNCA** spacing off-scale.
    - **NUNCA** color como única señal — subtotales/dividers llevan label semántico explícito.
    - **NUNCA** lime `#6ec207` para texto sobre blanco. Usar `#2E7D32` (variante contrast-safe) si emerge necesidad de texto verde.

15. **A11y obligatorio (WCAG 2.2 AA)**:
    - PDF: `aria-label` en el `<Document>` raíz describiendo período + cardinalidad por régimen. Tabla con `<caption>` describiendo agrupación. `<th scope="col">` en headers.
    - Excel: el binario .xlsx no transporta a11y semantics ricas, pero el código que lo genera DEBE incluir título de hoja descriptivo (`Chile · 4 dependientes · 2 honorarios`) y comentario en celda subtotal explicando la separación canónica para operadores no-técnicos.
    - Group divider rows: texto descriptivo con cardinalidad explícita. NUNCA solo color.
    - Decorative chevrons (▼) en section rows llevan `aria-hidden="true"` cuando el surface es DOM (no aplica a binarios).

16. **Microinteracciones de la UI surrounding** (PayrollPeriodView que dispara descarga — fuera de Files owned pero sí afectada):
    - Botón "Descargar PDF" / "Descargar Excel" en estado loading: `<CircularProgress size={14} />` dentro del Button + texto `"Generando PDF…"` / `"Generando Excel…"`, `disabled` durante la generación.
    - Toast success post-download: `react-toastify` con `type='success'`, `autoClose: 4000`, mensaje `"Reporte generado · <archivo>.{pdf,xlsx}"`.
    - `role="status" aria-live="polite"` en el contenedor que muestra estado de descarga.
    - Respetar `useReducedMotion` — sin animaciones decorativas en el flujo de export.
    - **NO** animar entrada de filas del PDF (es export estático por contrato).

17. **Validación visual side-by-side al cierre** (Slice 3):
    - Capturas adjuntas al PR: mockup HTML actual + PDF generado real + Excel real abierto en LibreOffice/Excel/Numbers.
    - Mismo período fixture para los 3 (período de prueba con al menos 1 dependiente, 1 honorario, 1 Deel, 1 excluded).
    - Diff visual permitido sólo en rendering de fuente (browser vs PDFKit vs Excel font engine) y antialiasing. Cualquier diff estructural = bug.

18. **Out of scope explícito** (heredado de la task):
    - **NO** incluir costo empleador (SIS, cesantía empleador, mutual) — feature operador-facing distinto, follow-up.
    - **NO** modificar el recibo individual — TASK-758 owns `ReceiptDocument` y `PayrollReceiptCard`.
    - **NO** mezclar Payment Orders, Finance ni accounting downstream.
    - **NO** bumpar `RECEIPT_TEMPLATE_VERSION` — esa constante rige el recibo individual, no el reporte mensual.

## Detailed Spec

### Helper consumption pattern

```ts
import { resolveReceiptRegime, type ReceiptRegime } from '@/lib/payroll/receipt-presenter'

const groupEntriesByRegime = (entries: PayrollEntry[]) => {
  const groups: Record<ReceiptRegime, PayrollEntry[]> = {
    chile_dependent: [],
    honorarios: [],
    international_deel: [],
    international_internal: []
  }

  for (const entry of entries) {
    const regime = resolveReceiptRegime(entry)

    groups[regime].push(entry)
  }

  return groups
}
```

### PeriodReportDocument summary strip

```
COLABORADORES   ESTADO    DEPENDIENTES   HONORARIOS   INTERNACIONAL
       12       Aprobado            8            2               2
```

### PeriodReportDocument totals

| Grupo | Bruto | Descuentos previsionales | Retención SII | Neto |
|---|---|---|---|---|
| Total Chile dependiente | $... CLP | $... CLP | — | $... CLP |
| Total Honorarios | $... CLP | — | $... CLP | $... CLP |
| Total Internacional | $... USD | — | — | $... USD |

### Excel layout (recomendado: dos secciones en pestaña Chile)

```
[Pestaña: Resumen]
[Pestaña: Chile]
  Sección "Chile dependiente"
    columnas: Nombre, Bruto, Gratificación, AFP, Salud, Cesantía, IUSC, APV, Neto
    filas dependientes
    subtotal: Total descuentos previsionales
  Sección "Honorarios"
    columnas: Nombre, Bruto, Tasa SII, Retención SII, Neto
    filas honorarios
    subtotal: Total retención SII
[Pestaña: Internacional]
  filas Deel/internacional sin descuentos
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] **Paridad 1:1 con mockup aprobado** `docs/mockups/task-782-period-report-excel-honorarios-disaggregation.html` — PDF + Excel replican estructura, summary strip ampliado, group dividers, columnas, subtotales, badges de régimen y estado terminal `excluded`. Validación side-by-side documentada en el PR (3 capturas: mockup HTML, PDF real, Excel real abierto en LibreOffice/Excel) por surface.
- [ ] `PeriodReportDocument` separa entries en hasta 4 grupos (`Chile dependiente`, `Honorarios`, `Internacional Deel`, `Internacional interno`) usando `resolveReceiptRegime` de TASK-758. Grupos vacíos se omiten completos.
- [ ] PDF — summary strip ampliado a 8 KPIs con contadores per-régimen (slots se omiten si N=0).
- [ ] PDF — tabla con 10 columnas exactas (porcentajes per spec) incluyendo nueva columna `Retención SII` separada de `Desc. previs.`.
- [ ] PDF — 4 subtotales independientes mutuamente excluyentes; ningún subtotal mezcla retención SII con descuentos previsionales.
- [ ] PDF — columna "Régimen" muestra 4 valores distinguibles con badges color-coded reutilizando tokens del mockup TASK-758.
- [ ] Excel — pestaña Chile con 2 secciones internas (`▼ Sección 1 · Chile dependiente` / `▼ Sección 2 · Honorarios`) + subtotales independientes. Pestaña Internacional con 2 secciones internas paralelas (Deel / interno).
- [ ] Excel — para filas honorarios, columnas previsionales (AFP/Salud/Cesantía/IUSC/APV) llenas con `—` (NO `$0`); para dependientes, columnas SII (Tasa/Retención) llenas con `—`.
- [ ] Estado terminal `excluded` se renderiza visible (NO se omite) con `Bruto/Neto = $0` + chip warning `⚠ excluido` en el nombre.
- [ ] Helper canónico `groupEntriesByRegime` exportado desde `receipt-presenter.ts` (TASK-758) o `receipt-grouping.ts`. NO se reimplementa la detección de régimen inline.
- [ ] Orden canónico de regímenes (`chile_dependent → honorarios → international_deel → international_internal`) declarado como const exportado, NO hardcodeado en cada surface.
- [ ] Tokens prohibidos auditados (Slice 3 verification): grep contra `font-family: monospace`, `font-feature-settings: 'tnum'`, `borderRadius: 3|5|7|12`, hardcoded sentinel `$0` en celdas N/A retorna 0 hits en `src/lib/payroll/generate-payroll-pdf.tsx` y `src/lib/payroll/generate-payroll-excel.ts`.
- [ ] Tests unitarios verifican layout PDF + Excel con fixture mixto (4 dep + 2 hon + 2 deel + 1 excluded).
- [ ] Documentación de arquitectura + funcional sincronizada.
- [ ] No se duplica lógica de detección de régimen — todos los consumers usan `resolveReceiptRegime`.

## Verification

- `pnpm vitest run src/lib/payroll`
- `pnpm exec eslint src/lib/payroll`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`
- **Validación visual side-by-side contra mockup canónico** (obligatoria, evidencia en PR):
  - levantar mockup: `cd docs/mockups && python3 -m http.server 4758` → [`http://127.0.0.1:4758/task-782-period-report-excel-honorarios-disaggregation.html`](http://127.0.0.1:4758/task-782-period-report-excel-honorarios-disaggregation.html)
  - generar PDF reporte mensual de un período fixture (4 dep + 2 hon + 2 deel + 1 excluded)
  - generar Excel del mismo período
  - capturas side-by-side (mockup HTML | PDF real | Excel real abierto) — adjuntas al PR
- Anti-regresión tokens prohibidos (Slice 3):
  - `git grep -nE "fontFamily.*monospace|font-feature-settings.*tnum|borderRadius:\s*[357]|borderRadius:\s*12" src/lib/payroll/generate-payroll-pdf.tsx src/lib/payroll/generate-payroll-excel.ts` → 0 hits
- Verificación operativa con compliance officer / contabilidad: validar que los subtotales separados permiten reconciliación natural contra Previred (descuentos previsionales) y F29 (retención SII honorarios) sin manipulación manual del archivo.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado

## Follow-ups

- Si emerge necesidad de surface "Costo empleador" para el operador (SIS, cesantía empleador, mutual), abrir task aparte que reuse `resolveReceiptRegime` para clasificación.
- Si compliance pide reconciliación automática contra Previred/F29, abrir task aparte de "Payroll-to-fiscal reconciliation".

## Open Questions

- ¿Excel: dos secciones en una pestaña o dos pestañas separadas? **Resolución recomendada en Discovery**: dos secciones en la misma pestaña Chile, preservando lectura mensual unificada del operador. Si compliance pide pestañas separadas, refactorear es trivial.
- ¿`PeriodReportDocument` columna "Régimen" con `INT` único o `DEEL`/`INT-INT` separados? **Resolución recomendada**: 4 valores distinguibles (`CL-DEP`, `HON`, `DEEL`, `INT`) — máxima honestidad, escalabilidad para futuros regímenes.
