# TASK-758 — Payroll Receipt Render Contract Hardening (4 regímenes)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `task/TASK-758-payroll-receipt-render-contract`
- Legacy ID: `none`
- GitHub Issue: `none`

> Nota de scope (2026-05-04): la task original cubría solo `honorarios`. La auditoría profunda de recibos confirmó que el bug raíz (detector único `isChile = payRegime === 'chile'`) afecta a **3 de los 4 regímenes** (`chile_dependent`, `honorarios`, `international_deel`/`international_internal`). La task se amplía a un contrato canónico de 4 regímenes en una sola atomic operation para evitar nacer como otro parche local. F6 (PeriodReportDocument + Excel) sale a `TASK-782` porque el surface y el audience son distintos.

## Summary

Endurece la capa de **proyección/render** de recibos Payroll con un único helper canónico de 4 regímenes (`chile_dependent`, `honorarios`, `international_deel`, `international_internal`). El motor de cálculo no se toca: el helper consume el contrato persistido en `PayrollEntry` y lo traduce a la presentación que cada régimen requiere. El preview MUI, el PDF descargable y la proyección sin entries (`ProjectedPayrollView`) deben converger al mismo helper para que sea imposible que dos surfaces muestren el mismo entry de manera incoherente.

## Why This Task Exists

El motor Payroll ya distingue correctamente cada régimen (TASK-744 cerró Chile compliance + honorarios + Deel). Pero la capa de recibos quedó con un detector único `isChile = entry.payRegime === 'chile'`:

- Honorarios cumple `payRegime === 'chile'` → `PayrollReceiptCard` y `generate-payroll-pdf.tsx` arman el bloque `Descuentos legales` con AFP/salud/cesantía/IUSC en `—`. Total mal etiquetado: muestra `siiRetentionAmount` bajo "Total descuentos".
- Chile dependiente renderiza correctamente AFP/salud/cesantía/IUSC, pero **no muestra**: gratificación legal (`chileGratificacionLegalAmount`), split obligatorio/voluntario de salud (`chileHealthObligatoriaAmount` / `chileHealthVoluntariaAmount`).
- Deel/internacional renderiza el bruto y el "Líquido a pagar", pero **no muestra**: contexto de que el pago final lo procesa Deel, `deelContractId` (campo persistido), aclaración de que el recibo es informativo y no un comprobante legal del país del trabajador.
- Honorarios y Deel muestran filas-fantasma (`Asignación teletrabajo $0`, `Bono OTD (— → factor —) $0`) por pushes incondicionales en haberes.
- `ProjectedPayrollView` es la única superficie con detector correcto (`siiRetentionAmount > 0` para honorarios) pero su detector internacional (`payRegime === 'international' || (currency === 'USD' && chileTotalDeductions === 0)`) tiene un edge-case frágil que da false-positive si un dependiente Chile tiene `chileTotalDeductions === 0`.

Si se "arreglara" desde `calculate-payroll.ts` se abre un frente innecesario con alto blast radius en cálculos. La causa raíz es de **render**.

## Goal

Crear `resolveReceiptRegime(entry) → ReceiptRegime` y `buildReceiptPresentation(entry, breakdown?) → ReceiptPresentation` como **única primitive canónica** que rige preview MUI, PDF descargable y proyección sin entries. La presentación es exhaustiva sobre los 4 regímenes con `never`-check defensivo:

- `chile_dependent` (`indefinido`, `plazo_fijo`): bloque "Descuentos legales" completo, incluyendo gratificación legal informativa y split de salud obligatoria/voluntaria.
- `honorarios`: bloque "Retención honorarios" con `Tasa SII`, `Retención honorarios`, `Total retención`, e infoBlock canónico `"Boleta de honorarios Chile · Art. 74 N°2 LIR · Tasa SII <year>"`. Sin filas de dependiente Chile. Sin filas-fantasma de teletrabajo/colación/movilización/KPI.
- `international_deel` (`contractor`, `eor`, o `payrollVia === 'deel'`): sin bloque de descuentos legales. InfoBlock canónico que aclara que el pago lo procesa Deel + `deelContractId` cuando existe.
- `international_internal` (`payRegime === 'international'` no-Deel): sin bloque de descuentos legales. InfoBlock canónico "Régimen internacional sin descuentos Chile".

Bump `RECEIPT_TEMPLATE_VERSION` de `'3'` a `'4'`. Tests congelan el contrato visual para los 4 regímenes con y sin adjustments.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` (especialmente §25 Receipt PDF branding y template versioning)
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- **Mockup canónico vinculante (2026-05-04)**: `docs/mockups/task-758-receipt-render-4-regimes.html` es el contrato visual aprobado. Ver "Approved Visual Spec — Mockup canónico" más abajo. La implementación replica el mockup 1:1 estructural; cualquier desviación voluntaria requiere update + re-aprobación del mockup ANTES de mergear código. PR sin capturas side-by-side por régimen = block.
- **No tocar el motor de cálculo Payroll.** `calculate-payroll.ts`, `calculate-honorarios.ts`, `calculate-chile-deductions.ts`, `compute-chile-tax.ts`, `chile-previsional-helpers.ts` y `recalculate-entry.ts` quedan intactos.
- **Detector primario obligatorio**: `entry.contractTypeSnapshot`. Fallback defensivo: `siiRetentionAmount > 0` para honorarios legacy sin snapshot, y `payrollVia === 'deel'` para Deel legacy.
- **Helper puro y server-safe**: `src/lib/payroll/receipt-presenter.ts` no importa MUI, `@react-pdf/renderer`, ni helpers `'use client'`/`'server-only'`. Importable desde preview cliente, PDF server, projection view, tests, y futuras superficies (Excel, emails, MCP).
- **Exhaustiveness check**: el switch de regímenes cierra con `default: const _exhaustive: never = regime; throw new PayrollValidationError(...)`. Compile-time fail si emerge un nuevo `ContractType` y nadie actualizó el helper.
- Preview MUI y PDF deben converger al mismo helper. Cero lógica de negocio en componentes de render — sólo declarativa.
- Si cambia cualquier output visual del PDF, bumpar `RECEIPT_TEMPLATE_VERSION`.
- `ProjectedPayrollView` debe consumir el mismo helper para detección de régimen (reemplazo de `isHonorariosProjectedEntry` y `isInternationalRegime`).

## Normative Docs

- `docs/tasks/complete/TASK-077-payroll-receipt-generation-delivery.md`
- `docs/tasks/complete/TASK-744-payroll-chile-compliance-remediation.md`
- `docs/tasks/in-progress/TASK-759-payslip-delivery-on-payment-paid.md` (consumer downstream del PDF)
- `docs/documentation/hr/periodos-de-nomina.md`
- `docs/manual-de-uso/hr/periodos-de-nomina.md`

## Dependencies & Impact

### Depends on

- `src/types/payroll.ts` (PayrollEntry: `contractTypeSnapshot`, `payrollVia`, `siiRetentionAmount`, `siiRetentionRate`, `chileGratificacionLegalAmount`, `chileHealthObligatoriaAmount`, `chileHealthVoluntariaAmount`, `deelContractId` — todos persistidos)
- `src/types/hr-contracts.ts` (`ContractType`, `CONTRACT_LABELS`, `CONTRACT_DERIVATIONS`, `getSiiRetentionRate`)
- `src/lib/payroll/get-payroll-entries.ts` (lectura ya hidrata todos los fields necesarios)
- `src/lib/payroll/generate-payroll-pdf.tsx` (consumer 1)
- `src/views/greenhouse/payroll/PayrollReceiptCard.tsx` (consumer 2)
- `src/views/greenhouse/payroll/PayrollReceiptDialog.tsx` (compone preview + descarga)
- `src/views/greenhouse/payroll/ProjectedPayrollView.tsx` (consumer 3 — convergencia de detector)
- `src/views/greenhouse/payroll/PayrollEntryTable.tsx` (referencia de detección correcta — opcional refactor para reusar helper)
- `src/lib/payroll/adjustments/breakdown.ts` (`EntryAdjustmentBreakdown` consumido por el helper)
- `src/lib/payroll/generate-payroll-receipts.ts` (pipeline batch de envío — no muta, sólo verifica)

### Blocks / Impacts

- **Habilita `TASK-782`** (Payroll Period Report + Excel honorarios disaggregation). TASK-782 reusa `resolveReceiptRegime` exportado por esta task.
- **Reduce regresiones** visibles en `People > Nómina`, `My Nómina` y proyección.
- **TASK-730** (smoke lane) podrá agregar assert real de receipt-by-regime en follow-up.
- **TASK-731** podrá reutilizar el invariant visual/documental si se agrega a preflight.
- Si emergen nuevos `ContractType` (ej. `practica`, `prestacion_servicios_extranjero`), el `never`-check del helper rompe build hasta que el nuevo régimen tenga su rama declarada.

### Files owned

- `src/lib/payroll/receipt-presenter.ts` 🆕 (helper canónico puro)
- `src/lib/payroll/receipt-presenter.test.ts` 🆕
- `src/lib/payroll/generate-payroll-pdf.tsx` (refactor consumer)
- `src/views/greenhouse/payroll/PayrollReceiptCard.tsx` (refactor consumer)
- `src/views/greenhouse/payroll/PayrollReceiptCard.test.tsx` 🆕 (o ampliación)
- `src/views/greenhouse/payroll/PayrollReceiptDialog.tsx` (sólo si propaga el helper)
- `src/views/greenhouse/payroll/ProjectedPayrollView.tsx` (reemplazar `isHonorariosProjectedEntry` y `isInternationalRegime` por el helper)
- `src/views/greenhouse/payroll/helpers.ts` (utilidades de formato — sin lógica de negocio)
- `docs/mockups/task-758-receipt-render-4-regimes.html` 🆕 (contrato visual aprobado — vinculante)
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` (sección §25 + nueva sección "Receipt presentation contract" o equivalente)
- `docs/documentation/hr/periodos-de-nomina.md`
- `docs/manual-de-uso/hr/periodos-de-nomina.md`

## Current Repo State

### Already exists

- `PayrollEntry` persiste todo lo necesario:
  - `contractTypeSnapshot` (ContractType)
  - `payRegime`, `payrollVia`, `currency`
  - `grossTotal`, `netTotal`, `chileTotalDeductions`
  - `siiRetentionRate`, `siiRetentionAmount` (honorarios)
  - `chileAfpAmount`, `chileAfpCotizacionAmount`, `chileAfpComisionAmount`, `chileAfpName`, `chileAfpRate`
  - `chileHealthAmount`, `chileHealthObligatoriaAmount`, `chileHealthVoluntariaAmount`, `chileHealthSystem`
  - `chileUnemploymentAmount`, `chileUnemploymentRate`
  - `chileTaxAmount`, `chileTaxableBase`, `chileApvAmount`
  - `chileGratificacionLegalAmount`, `chileColacionAmount`, `chileMovilizacionAmount`, `chileUfValue`
  - `deelContractId`
- `PayrollEntryTable` ya implementa correctamente la detección regime-by-regime que el helper formaliza.
- `ProjectedPayrollView` ya distingue honorarios pero con detector frágil propio.
- `TASK-077` dejó la foundation receipts + template versioning.
- `TASK-744` dejó el motor canónico para los 5 ContractTypes.

### Gap

- No existe helper canónico compartido. Cada surface implementa su propia detección.
- `PayrollReceiptCard` y `generate-payroll-pdf.tsx` ramifican por `payRegime === 'chile'` único — bug raíz para honorarios.
- Chile dependiente no muestra gratificación legal ni salud split.
- Deel/internacional no muestra contexto explicativo (Deel-as-payer, `deelContractId`).
- Honorarios y Deel muestran filas-fantasma con $0 / `—`.
- Header del recibo dice solo "Régimen: Chile / Internacional", sin distinguir contractType.
- `ProjectedPayrollView` tiene su propio detector frágil para "internacional".
- No hay tests focalizados que congelen el contrato visual de los 4 regímenes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma la task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Canonical receipt presenter helper

- Crear `src/lib/payroll/receipt-presenter.ts` con:
  - `type ReceiptRegime = 'chile_dependent' | 'honorarios' | 'international_deel' | 'international_internal'`
  - `resolveReceiptRegime(entry: PayrollEntry): ReceiptRegime` — detector canónico:
    - **Primario**: `contractTypeSnapshot` (`indefinido`/`plazo_fijo` → `chile_dependent`; `honorarios` → `honorarios`; `contractor`/`eor` → `international_deel`).
    - **Fallback honorarios legacy**: `payRegime === 'chile' && (siiRetentionAmount ?? 0) > 0` → `honorarios`.
    - **Fallback Deel legacy**: `payrollVia === 'deel'` → `international_deel`.
    - **Fallback internacional**: `payRegime === 'international'` → `international_internal`.
    - **Default seguro**: `chile_dependent` (más descuentos, conservador para data corrupta).
  - `type ReceiptPresentation = { regime, contractLabel, header, haberesRows, attendanceRows, deductionSection, infoBlock, netLabel, netAmount, footnote }` — shape declarativa exhaustiva.
  - `buildReceiptPresentation(entry, breakdown?): ReceiptPresentation` — switch exhaustivo con `never`-check.
  - Helpers privados de formato `formatCurrency(value, currency)`, `formatPercent`, `formatRate` que el helper inyecta como strings ya formateados (consumers reciben strings, no números).
- Tests `receipt-presenter.test.ts`:
  - Matriz **régimen × adjustments**: 4 regímenes × 3 estados (sin adjustment, con factor reducido, con override manual) = 12 casos mínimos.
  - Caso edge: `contractTypeSnapshot=null` con `siiRetentionAmount > 0` → `honorarios` (fallback).
  - Caso edge: `contractTypeSnapshot=null` con `payrollVia=null` y `payRegime='international'` → `international_internal`.
  - Compile-time exhaustiveness: agregar test que un nuevo `ContractType` rompe build.

### Slice 2 — Preview MUI + ProjectedPayrollView convergence

- Reescribir `PayrollReceiptCard.tsx` para consumir `buildReceiptPresentation`. El componente queda puramente declarativo: itera `presentation.haberesRows`, `presentation.attendanceRows`, renderiza `presentation.deductionSection` si existe, renderiza `presentation.infoBlock` si existe.
- Reemplazar en `ProjectedPayrollView.tsx`:
  - `isHonorariosProjectedEntry(e)` → `resolveReceiptRegime(adaptedEntry) === 'honorarios'`
  - `isInternationalRegime(e)` → `resolveReceiptRegime(adaptedEntry) === 'international_deel' || === 'international_internal'`
  - Adaptador mínimo entry-shape si `ProjectedEntry` no es asignable directo a `PayrollEntry` (mantener tipado estricto).
- Header del recibo: agregar fila "Tipo de contrato: <CONTRACT_LABELS[contractTypeSnapshot].label>" y, para Deel, badge `Pago via Deel`.
- Filtrar haberes-fantasma:
  - Honorarios: NO renderizar `Asignación teletrabajo`, `Colación`, `Movilización`, `Bono OTD`, `Bono RpA` cuando son 0 o aplican factor `—`.
  - Deel: NO renderizar `Colación`, `Movilización` (incondicionalmente).
  - Chile dependiente: lógica actual (renderizar `> 0`) + agregar `Gratificación legal` cuando `chileGratificacionLegalAmount > 0`.
- Bloque deductionSection para Chile dependiente: split de salud obligatoria (`chileHealthObligatoriaAmount`) y voluntaria (`chileHealthVoluntariaAmount`) cuando ambos están poblados; fallback al total `chileHealthAmount` si los splits son null.
- Tests `PayrollReceiptCard.test.tsx`: render de los 4 regímenes con fixture mínimo; assert presence/absence de filas críticas.

### Slice 3 — PDF convergence + RECEIPT_TEMPLATE_VERSION bump

- Reescribir `ReceiptDocument` en `generate-payroll-pdf.tsx` para consumir `buildReceiptPresentation` (mismo input, mismo output structural que preview).
- Bump `RECEIPT_TEMPLATE_VERSION` de `'3'` a `'4'`.
- Header PDF: agregar campo "Tipo de contrato" (4to slot del `employeeBox`).
- Para `international_deel`: render del `infoBlock` con título, body y `meta: deelContractId` cuando existe.
- Tests estructurales del PDF (snapshot del JSX-tree o dump del PDF parseado): al menos un caso por régimen verificando ausencia de filas indebidas y presencia de filas obligatorias.
- Verificación manual: descargar PDF de 4 entries fixture (uno por régimen) y comparar visualmente con el preview MUI — deben ser estructuralmente idénticos.

### Slice 4 — Targeted regression tests + docs

- Tests adicionales no cubiertos en Slices 1-3:
  - Caso: chile dependiente CON gratificación legal + salud split poblado → recibo muestra ambos correctamente.
  - Caso: honorarios CON adjustment factor 0.5 → bruto efectivo reducido, retención SII recalculada por `compute-net.ts` (sin tocar motor), recibo muestra el `siiRetentionAmount` ajustado.
  - Caso: contractor Deel sin `deelContractId` → infoBlock se renderiza sin la línea `meta`.
  - Caso: Chile dependiente con `chileTotalDeductions === 0` (corner case auditado) → NO se confunde con internacional.
- Actualizar docs:
  - `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` §25: agregar subsección "Receipt presentation contract" con la spec del helper canónico, los 4 regímenes y la regla `never`-check.
  - `docs/documentation/hr/periodos-de-nomina.md`: nota funcional de qué bloques ve cada régimen.
  - `docs/manual-de-uso/hr/periodos-de-nomina.md`: nota operativa para que el operador entienda por qué el recibo de un honorario no muestra AFP.

## Out of Scope

- No tocar motor: `calculate-payroll.ts`, `calculate-honorarios.ts`, `calculate-chile-deductions.ts`, `compute-chile-tax.ts`, `chile-previsional-helpers.ts`, `recalculate-entry.ts`.
- No rediseñar layout completo del recibo (branding, colores, fuentes).
- No cambiar contrato de emails transaccionales si su copy no depende del breakdown detallado.
- No tocar `PeriodReportDocument` (PDF reporte mensual del operador) ni `generate-payroll-excel.ts` — se hace en `TASK-782` reusando este helper.
- No agregar surface de "costo empleador" (SIS, cesantía empleador, mutual) — feature operador-facing distinto, registrado en Open Questions como follow-up.
- No abrir programa amplio "Payroll safety harness" — sólo el guardrail mínimo de receipts.
- No mezclar Payment Orders, Finance ni downstream accounting.

## Approved Visual Spec — Mockup canónico (2026-05-04)

> **Estado: APROBADO por el usuario.** El mockup `docs/mockups/task-758-receipt-render-4-regimes.html` es el contrato visual canónico de esta task. Toda implementación (preview MUI + PDF) **debe replicarlo 1:1 estructural**. Cualquier desviación voluntaria requiere actualizar primero el mockup y re-aprobar.

### Artefactos canónicos

- `docs/mockups/task-758-receipt-render-4-regimes.html` — mockup HTML estático aprobado (4 regímenes + 3 edge cases)
- Servidor local: `cd docs/mockups && python3 -m http.server 4758` → [`http://127.0.0.1:4758/task-758-receipt-render-4-regimes.html`](http://127.0.0.1:4758/task-758-receipt-render-4-regimes.html)

### Auditoría aplicada al mockup (skills consumidas para canonizarlo)

El mockup pasó las 5 skills de UI/UX/microinteracciones (globales + repo): `modern-ui`, `greenhouse-ux`, `greenhouse-ui-review`, `greenhouse-microinteractions-auditor`, `microinteractions-auditor`. Resultado: 0 blockers, 0 modern-bar issues, polish menor.

### Decisiones visuales canonizadas

| Tópico | Decisión | Justificación |
| --- | --- | --- |
| Familias tipográficas | `Geist Sans` body + `Poppins` display (max 2) | DESIGN.md V1 (delta 2026-05-01). NUNCA `monospace` en surfaces user-facing. |
| Números | `font-variant-numeric: tabular-nums` sobre Geist Sans | Alineación numérica sin comprometer legibilidad. Sintaxis canónica V1 (NO `font-feature-settings: 'tnum'`). |
| BorderRadius card | `theme.shape.customBorderRadius.md` = 6px | Cards canónico V1. |
| BorderRadius infoBlock | `theme.shape.customBorderRadius.sm` = 4px (`0 4px 4px 0`) | Variants secundarias V1. |
| Spacing card | padding `spacing(8, 8, 6)` = 32/32/24 | Todos en escala canónica. |
| InfoBlock variants | `info` (azul `#0375DB`), `warning` (amarillo `#d99c1f`), `error` (rojo `#c0392b`) | Reservados para STATES, NUNCA decoración. Cada variant lleva título + body — NO color como única señal. |
| Brand blue receipt | `#023c70` (canónico Efeonce, role `account`) | Hex existente en `generate-payroll-pdf.tsx`. Mantener. |
| Hero "Líquido" | Bg `var(--brand-blue)`, texto `#fff` | Patrón existente preservado. |
| Hero "Excluido" | Bg `var(--text-faint)` (gris) + opacity 0.85 + label "Sin pago este período" | NUNCA "Líquido a pagar $0" — confunde. Pattern terminal degradado. |
| Hero Deel | Label "Monto bruto registrado" + footnote explicativo | Más honesto: el líquido lo emite Deel en otra jurisdicción. |
| Diff annotations | Solo en mockup. NO van al PDF/preview producción. | Son anotación de auditoría, no contenido del recibo. |

### Reglas duras de implementación (1:1 contra mockup)

1. **Estructura de bloques por régimen** — orden EXACTO del mockup:
   - `chile_dependent`: Header → Employee box (4 fields) → Haberes → Asistencia → Descuentos legales → Hero líquido
   - `honorarios`: Header → Employee box → Haberes (sin teletrabajo/colación/movilización/KPI cuando son 0) → Retención honorarios → InfoBlock canónico → Hero líquido
   - `international_deel`: Header → Employee box (incluye "Empleador legal: Deel Inc." + jurisdicción) → Haberes (sin colación/movilización) → InfoBlock Deel con `deelContractId` → Hero "Monto bruto registrado" + footnote
   - `international_internal`: Header → Employee box (incluye "Jurisdicción") → Haberes (sin colación/movilización) → InfoBlock régimen internacional → Hero líquido
   - **estado terminal `excluded`**: Header → Employee box (mínimo: nombre + tipo de contrato) → InfoBlock `error` con causa+alcance+recovery → Hero degradado "Sin pago este período" $0. **OMITIR** Haberes, Asistencia, Descuentos.

2. **Employee box exhaustivo (4 fields obligatorios)**:
   - field 1 = `Nombre`
   - field 2 = `Email`
   - field 3 = `Tipo de contrato` (label `CONTRACT_LABELS[contractTypeSnapshot].label`) + badge régimen + meta secundaria (régimen + moneda)
   - field 4 = contextual por régimen:
     - `chile_dependent` → `AFP / Salud` con `chileAfpName · chileHealthSystem`
     - `honorarios` → `Tasa SII <year>` con valor `(siiRetentionRate * 100).toFixed(2) + '%'`
     - `international_deel` → `Empleador legal` con `Deel Inc.` + meta jurisdicción
     - `international_internal` → `Jurisdicción` (informativo)

3. **Badges de régimen** — colores y labels EXACTOS del mockup:
   - `chile_dependent` → `CL-DEP` bg `#d4edda` text `#155724`
   - `honorarios` → `HON` bg `#ffe8c2` text `#8a4a00`
   - `international_deel` → `DEEL` bg `#fff3d6` text `#8a6010`
   - `international_internal` → `INT` bg `#e0e7ff` text `#2c3e91`

4. **InfoBlock canónico para `honorarios`** — copy EXACTO:
   - title: `Boleta de honorarios Chile`
   - body: `Art. 74 N°2 LIR · Tasa SII <year>: <rate>%. Esta retención se entera al SII por la empresa pagadora.`
   - variant: `info`

5. **InfoBlock canónico para `international_deel`** — copy EXACTO:
   - title: `Pago administrado por Deel`
   - body: `Greenhouse registra el monto bruto y los bonos KPI calculados (OTD/RpA). Deel emite el recibo legal del país del trabajador y aplica las retenciones, cotizaciones e impuestos correspondientes a esa jurisdicción.`
   - meta: `Contrato Deel: <deelContractId>` (omitir línea si `deelContractId` es null)
   - variant: `info`

6. **InfoBlock canónico para `international_internal`**:
   - title: `Régimen internacional`
   - body: `Sin descuentos previsionales Chile. El pago se procesa según los términos del contrato internacional acordado con el trabajador.`
   - variant: `info`

7. **InfoBlock para `excluded`** — copy variable según `breakdown.excluded.reasonLabel`:
   - title: `Excluido de esta nómina — <reasonLabel>`
   - body: `<reasonNote>` + nota canónica de cobertura previsional cuando aplique
   - meta: `Solicitado por <requestedBy> · <requestedAt>`
   - variant: `error`

8. **InfoBlock para bruto reducido** (factor < 1.0):
   - title: `Bruto efectivo aplicado`
   - body: `Se aplicó factor <pct>% al bruto natural por <reasonLabel>. La retención SII se recalcula sobre el bruto efectivo, no sobre el bruto natural.` (texto adaptado para Chile dep / honorarios)
   - variant: `warning`

9. **InfoBlock para manual override**:
   - title: `Override manual de neto — <reasonLabel>`
   - body: `<reasonNote>`
   - meta: `Aplicado por <requestedBy>`
   - variant: `warning`
   - footnote en hero (adicional): `* Monto neto ajustado manualmente: <reasonNote>`

10. **Tokens prohibidos** (heredados del audit):
    - **NUNCA** `font-family: monospace` en contenido user-facing del recibo. Para `deelContractId` o IDs técnicos: `font-variant-numeric: tabular-nums` + `letter-spacing: 0.02em` sobre Geist Sans.
    - **NUNCA** `font-feature-settings: 'tnum'`. Usar `font-variant-numeric: tabular-nums` (canónica V1).
    - **NUNCA** `borderRadius` off-scale (3, 5, 7, 12). Usar tokens `customBorderRadius.{xs:2, sm:4, md:6, lg:8, xl:10}`.
    - **NUNCA** spacing off-scale (36, 28, 11). Usar `spacing(n)` con n ∈ {0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12}.
    - **NUNCA** color como única señal de estado. InfoBlock siempre lleva título + body explicativo.
    - **NUNCA** lime `#6ec207` para texto sobre blanco (falla 4.5:1). Para texto verde de éxito usar `#2E7D32` (variante contrast-safe). Lime queda reservado para chips/borders/backgrounds donde el contraste se cumple por el contenedor.

11. **A11y obligatorio (WCAG 2.2 AA)**:
    - Cada `<Card>` (preview MUI) y cada `<Page>` (PDF) — para preview MUI, agregar `aria-label` con régimen + nombre + monto líquido para anuncio único de screen reader.
    - InfoBlocks `error` deben usar `role="alert"` solo cuando son terminales (excluded). InfoBlocks `info`/`warning` no llevan role (son contenido estructural).
    - Heading hierarchy: el doc-title `RECIBO DE REMUNERACIONES` es h1 implícito del documento; section-titles (`Haberes`, `Descuentos legales`, etc.) son h2.
    - Decorative icons (`section-accent` bar, badges) llevan `aria-hidden="true"`.

12. **Microinteracciones del `PayrollReceiptDialog`** (envuelve el preview):
    - Loading lazy (regen post-bump v3→v4): mostrar `<Skeleton variant="rectangular" height={500} />` + texto `"Regenerando recibo con plantilla actualizada…"` envuelto en `role="status" aria-live="polite"`.
    - Dialog open/close: 200ms decelerado (`cubic-bezier(0.2, 0, 0, 1)`), respetar `useReducedMotion` (sin transform de gran amplitud cuando reduced).
    - **NO** animar entrada de filas del recibo. El recibo es estático por contrato.
    - Acciones (Descargar PDF / Reenviar email) viven en el toolbar del dialog, no en el recibo.

13. **Validación visual (cierre de Slice 3)**:
    - Side-by-side: abrir el mockup HTML en navegador + abrir el preview MUI renderizado del mismo entry fixture + descargar el PDF generado del mismo entry. Los 3 deben mostrar la misma estructura, el mismo orden de bloques, los mismos labels, los mismos números.
    - Diff visual permitido únicamente en: rendering de fuente (browser vs PDFKit), antialiasing, y espaciado sub-píxel. Cualquier diff estructural = bug.

## Detailed Spec

### Contract canónico: `ReceiptPresentation`

```ts
type ReceiptRegime =
  | 'chile_dependent'
  | 'honorarios'
  | 'international_deel'
  | 'international_internal'

type ReceiptDeductionRow = readonly [label: string, amount: string]

type ReceiptInfoBlock = {
  variant: 'info' | 'warning'  // info = Deel/internacional; warning = manual override / excluded
  title: string
  body: string
  meta?: string                // ej. "Contrato Deel: <id>"
}

type ReceiptPresentation = {
  regime: ReceiptRegime
  contractLabel: string        // de CONTRACT_LABELS[contractTypeSnapshot]
  haberesRows: ReadonlyArray<ReceiptDeductionRow>
  attendanceRows: ReadonlyArray<ReceiptDeductionRow>
  deductionSection: null | {
    title: string              // "Descuentos legales" / "Retención honorarios"
    rows: ReadonlyArray<ReceiptDeductionRow>
    totalLabel: string         // "Total descuentos" / "Total retención"
    totalAmount: string        // ya formateado
  }
  infoBlock: null | ReceiptInfoBlock
  grossTotal: string
  netLabel: string             // "Líquido a pagar" / "Monto bruto registrado" para Deel
  netAmount: string
  footnote: string | null      // override manual, excluded, etc.
}
```

### Behavior por régimen

#### `chile_dependent` (`indefinido`, `plazo_fijo`)

- haberesRows: `Sueldo base` (+ `Sueldo base ajustado` si aplica), `Gratificación legal` si `chileGratificacionLegalAmount > 0`, `Asignación teletrabajo` si `> 0`, `Colación` si `> 0`, `Movilización` si `> 0`, `Bono fijo` si `> 0`, `Bono OTD`, `Bono RpA`, `Bono adicional` si aplica.
- deductionSection.title: `Descuentos legales`
- deductionSection.rows:
  - `AFP <name> (<rate>%)` con `chileAfpAmount`
  - `↳ Cotización` con `chileAfpCotizacionAmount` (si poblado)
  - `↳ Comisión` con `chileAfpComisionAmount` (si poblado)
  - `Salud (<system>)` con `chileHealthObligatoriaAmount` (cuando split poblado, label `Salud obligatoria 7%`) + `Salud voluntaria` con `chileHealthVoluntariaAmount` (si > 0). Fallback: `chileHealthAmount` con label `Salud (<system>)`.
  - `Seguro cesantía (<rate>%)` con `chileUnemploymentAmount`
  - `Impuesto único` con `chileTaxAmount`
  - `APV` si `chileApvAmount > 0`
- deductionSection.totalLabel: `Total descuentos`
- deductionSection.totalAmount: `chileTotalDeductions`
- infoBlock: `null` (caso normal)

#### `honorarios`

- haberesRows: `Sueldo base` (+ `Sueldo base ajustado` si aplica), `Bono fijo` si `> 0`, `Bono OTD` solo si `bonusOtdAmount > 0` o `kpiOtdQualifies === true`, `Bono RpA` solo si `bonusRpaAmount > 0` o `kpiRpaQualifies === true`. **Nunca**: teletrabajo, colación, movilización (no aplican por política).
- deductionSection.title: `Retención honorarios`
- deductionSection.rows:
  - `Tasa SII` con valor `(siiRetentionRate * 100).toFixed(2) + '%'`
  - `Retención honorarios` con `siiRetentionAmount`
- deductionSection.totalLabel: `Total retención`
- deductionSection.totalAmount: `siiRetentionAmount`
- infoBlock: `{ variant: 'info', title: 'Boleta de honorarios Chile', body: 'Art. 74 N°2 LIR · Tasa SII <year>: <rate>%' }`

#### `international_deel` (`contractor`, `eor`, o `payrollVia === 'deel'`)

- haberesRows: `Sueldo base`, `Asignación teletrabajo` si `> 0`, `Bono fijo` si `> 0`, `Bono OTD` y `Bono RpA` si KPI aplica. **Nunca**: colación, movilización (no aplican).
- deductionSection: `null`
- infoBlock: `{ variant: 'info', title: 'Pago administrado por Deel', body: 'Greenhouse registra el monto bruto y los bonos KPI. Deel emite el recibo legal y aplica las retenciones del país del trabajador.', meta: deelContractId ? \`Contrato Deel: ${deelContractId}\` : undefined }`
- netLabel: `Monto bruto registrado` (en lugar de "Líquido a pagar" — el líquido lo emite Deel).

#### `international_internal` (`payRegime === 'international'` no-Deel)

- haberesRows: igual que `international_deel`.
- deductionSection: `null`
- infoBlock: `{ variant: 'info', title: 'Régimen internacional', body: 'Sin descuentos previsionales Chile. El pago se procesa con los términos del contrato internacional.' }`
- netLabel: `Líquido a pagar`

### Defensa anti-regresión

- **Compile-time**: el switch del `buildReceiptPresentation` cierra con un branch `default` que asigna `regime` a un `const _exhaustive: never` y luego lanza `PayrollValidationError('Unhandled receipt regime', 500)`. Si emerge un nuevo `ContractType`, `resolveReceiptRegime` devuelve un valor que ya no calza con el union y TS rompe build.
- **Runtime**: tests de matriz régimen × adjustment cubren los 12 casos mínimos.
- **Visual regression**: snapshot estructural del JSX del PDF (no del binario rasterizado) por régimen.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] **Paridad 1:1 con mockup aprobado** `docs/mockups/task-758-receipt-render-4-regimes.html` — preview MUI + PDF replican estructura, orden de bloques, copy de InfoBlocks, badges de régimen, hero variants y estado terminal `excluded`. Validación side-by-side documentada en el PR (3 capturas: mockup HTML, preview MUI, PDF) por régimen.
- [ ] Existe `src/lib/payroll/receipt-presenter.ts` con `resolveReceiptRegime`, `buildReceiptPresentation` y type `ReceiptPresentation` exportados.
- [ ] `PayrollReceiptCard` no contiene lógica de detección de régimen — sólo consume `buildReceiptPresentation` y renderiza declarativamente.
- [ ] `ReceiptDocument` (PDF) consume el mismo helper y produce el mismo output estructural que el preview MUI.
- [ ] `ProjectedPayrollView` reemplaza `isHonorariosProjectedEntry` y `isInternationalRegime` por `resolveReceiptRegime`.
- [ ] **Honorarios** no muestra filas de AFP, salud, cesantía, IUSC ni APV. Muestra `Tasa SII`, `Retención honorarios`, `Total retención` con label correcto y infoBlock canónico.
- [ ] **Chile dependiente** muestra gratificación legal cuando `chileGratificacionLegalAmount > 0` y split de salud obligatoria/voluntaria cuando los fields están poblados.
- [ ] **Deel/internacional** muestra infoBlock canónico con título, body y `deelContractId` cuando existe.
- [ ] Header del recibo incluye fila "Tipo de contrato" usando `CONTRACT_LABELS[contractTypeSnapshot].label`.
- [ ] Filas-fantasma (`Asignación teletrabajo $0`, `Bono OTD (— → factor —) $0`) no aparecen en honorarios ni en Deel cuando el monto es 0 o no aplica.
- [ ] `RECEIPT_TEMPLATE_VERSION` bumpa de `'3'` a `'4'`.
- [ ] Existen tests de no regresión cubriendo la matriz régimen × adjustment (12 casos mínimos).
- [ ] El helper tiene `never`-check exhaustivo que rompe build si emerge un nuevo `ContractType` sin rama declarada.
- [ ] InfoBlocks `info`/`warning`/`error` consumen los textos canónicos del mockup verbatim (Boleta de honorarios Chile, Pago administrado por Deel, Régimen internacional, Excluido de esta nómina, Bruto efectivo aplicado, Override manual de neto). Cualquier copy alternativo requiere aprobación previa.
- [ ] Estado terminal `excluded` renderiza con hero degradado "Sin pago este período $0" y omite bloques Haberes/Asistencia/Descuentos.
- [ ] Hero variant para Deel usa label "Monto bruto registrado" + footnote canónico, NO "Líquido a pagar".
- [ ] Tokens prohibidos auditados (Slice 4 verification): grep contra `font-family: monospace`, `font-feature-settings: 'tnum'`, `borderRadius: 3|5|7|12` retorna 0 hits en `src/lib/payroll/` y `src/views/greenhouse/payroll/`.
- [ ] Documentación funcional + manual de uso + spec de arquitectura sincronizados.

## Verification

- `pnpm vitest run src/lib/payroll src/views/greenhouse/payroll`
- `pnpm exec eslint src/lib/payroll/receipt-presenter.ts src/views/greenhouse/payroll`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`
- **Validación visual side-by-side contra mockup canónico** (obligatoria, evidencia en PR):
  - levantar mockup: `cd docs/mockups && python3 -m http.server 4758` → [`http://127.0.0.1:4758/task-758-receipt-render-4-regimes.html`](http://127.0.0.1:4758/task-758-receipt-render-4-regimes.html)
  - render preview MUI de 5 entries fixture (uno por contractType: indefinido, plazo_fijo, honorarios, contractor, eor) + 1 entry excluded
  - descargar PDF de los mismos 6 entries
  - capturas side-by-side (mockup HTML | preview MUI | PDF) por régimen, adjuntas al PR
- Anti-regresión tokens prohibidos (Slice 4):
  - `git grep -nE "fontFamily.*monospace|font-feature-settings.*tnum|borderRadius:\s*[357]|borderRadius:\s*12" src/lib/payroll src/views/greenhouse/payroll` → 0 hits
- Smoke staging con período approved real: verificar al menos un honorario y un Deel.
  - `pnpm test:e2e:setup`
  - `pnpm exec playwright test tests/e2e/smoke/hr-payroll.spec.ts --project=chromium`

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado (`in-progress` → `complete`)
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` sincronizado
- [ ] `Handoff.md` actualizado con aprendizajes / verificación
- [ ] `changelog.md` actualizado (cambio de comportamiento visible)
- [ ] chequeo de impacto cruzado sobre otras tasks (`TASK-782` debe quedar habilitada para tomar el helper exportado)
- [ ] `RECEIPT_TEMPLATE_VERSION` actualizado en código y mencionado en `Handoff.md` (cache regen ventana documentada)

## Follow-ups

- `TASK-782` (Payroll Period Report + Excel honorarios disaggregation) — reusa `resolveReceiptRegime` para corregir agregaciones de surface operador-facing.
- Smoke visual de receipt-by-regime en lane de TASK-730.
- Eventual surface operador-facing de costo empleador (SIS, cesantía empleador, mutual, total cost) — registrado como Open Question.
- Si emergen más regímenes con tratamiento visual diferenciado, promover el presenter a contrato reusable de todas las surfaces Payroll (emails, MCP, exports).

## Open Questions

- ¿Conviene agregar una surface operador-facing de "Costo empleador" (`chileEmployerSisAmount`, `chileEmployerCesantiaAmount`, `chileEmployerMutualAmount`, `chileEmployerTotalCost`) ahora o se mantiene fuera del recibo y se trata en una task aparte de "HR cost dashboard"? **Resolución recomendada**: fuera del recibo del colaborador (audience distinto). Crear task aparte si surge necesidad explícita del operador.
- ¿`netLabel` para Deel debe decir `Monto bruto registrado` (más honesto: no es realmente líquido en el país del trabajador) o mantener `Líquido a pagar` (consistencia visual con otros recibos)? **Resolución recomendada**: `Monto bruto registrado` con footnote explicativo en el infoBlock — más seguro y honesto operativamente.
- ¿`infoBlock` para `international_internal` debe distinguirse visualmente de `international_deel`? **Resolución recomendada**: mismo `variant: 'info'`, distinto `title`/`body`. No introducir variant nuevo.
