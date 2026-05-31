# TASK-980 — Contractor Payment Run Report ("Nómina de Contractors" PDF + Excel)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance|hr|ui`
- Blocked by: `none` (mejor con TASK-979 para anclar el batch, pero puede listar por período sin la corrida)
- Branch: `task/TASK-980-contractor-payment-run-report`
- Legacy ID: `none`

## Summary

Genera el reporte de período de **pagos a contractors** ("nómina de contractors") en **PDF + Excel**, espejo del reporte mensual de nómina (TASK-782): lista todos los contractor payables del período con desglose **bruto − retención SII = neto**, agrupados por régimen (honorarios CL con retención vs internacional sin retención), con totales y subtotales reconciliables. Hoy existe el **comprobante individual** por payable (TASK-960) pero **NO** existe un reporte de período/batch equivalente al de payroll.

## Why This Task Exists

El operador pidió (2026-05-31) "un PDF con la nómina de contractors similar al que descargamos hoy de Payroll en Excel y PDF". Verificado: payroll tiene `generate-payroll-pdf.tsx` (`PeriodReportDocument`) + `generate-payroll-excel.ts` (TASK-782) con desglose por régimen + endpoint `/api/hr/payroll/periods/[periodId]/excel`. Contractors NO tiene equivalente — solo el comprobante per-payable (TASK-960). Sin esto, Finanzas no puede descargar un consolidado del período para revisión/archivo/auditoría.

## Mandatory Skills (OBLIGATORIO)

1. **`greenhouse-finance-accounting-operator`** — desglose bruto/retención/neto, subtotales mutuamente excluyentes por régimen (no sumar retención SII con cero-retención), reconciliación, evidencia.
2. **`greenhouse-payroll-auditor`** — espejar el patrón del reporte de payroll (TASK-782); la retención SII 15,25% (2026) es pasivo a remesar, no resta de costo; el reporte muestra el neto pagado + la retención por separado.
3. **`greenhouse-ux` + `greenhouse-ux-writing`** — el botón de descarga + copy es-CL. Si emerge layout visual del PDF, **skills de product design** (es documento operador-facing con montos → regla TASK-863 Semantic Column Invariants para columnas por entidad/parte).
4. **`arch-architect`** — reuso del presenter canónico (no recomputar montos), endpoint de descarga.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` §25.c (reporte de período + Excel disaggregation, TASK-782 — el patrón a espejar)
- `CLAUDE.md` → "Contractor Remittance Advice invariants (TASK-960)" (presenter struct, montos verbatim) + "Contractor Payable Bank Settlement (TASK-977)" (gasto=bruto, retención=pasivo)

Reglas obligatorias:

- **NUNCA** recomputar bruto/retención/neto en el reporte. Leer verbatim del payable (contrato TASK-793/794/960). La tasa de retención viene del snapshot del engagement (TASK-758/794).
- **NUNCA** sumar la retención SII (honorarios) con los contractors sin retención (internacional) en un único subtotal. Subtotales mutuamente excluyentes por régimen (espejo TASK-782: "Total retención SII honorarios" reconcilia F29; el neto pagado reconcilia el banco).
- **NUNCA** mostrar `$0` ambiguo; celdas N/A con `—` (distinguir "no aplica" de "cero").
- **NUNCA** mezclar monedas en un total sin convertir/segmentar (CLP vs USD por separado).
- **NUNCA** invocar `Sentry.captureException` directo; usar `captureWithDomain(err, 'finance', ...)`.

## Dependencies & Impact

### Depends on

- `ContractorPayable` + el presenter de TASK-960 (`remittance-presenter.ts`) / TASK-758 (lectura verbatim de montos).
- Patrón de reporte payroll: `src/lib/payroll/generate-payroll-pdf.tsx` + `generate-payroll-excel.ts` + endpoint `/api/hr/payroll/periods/[periodId]/excel`.
- (Mejor con TASK-979 — el batch del período define el set; pero puede listar payables por período sin la corrida.)

### Blocks / Impacts

- Da a Finanzas el consolidado descargable del período (revisión/archivo/auditoría).
- Complementa el comprobante individual (TASK-960) con la vista agregada.

### Files owned

- `src/lib/contractor-engagements/payables/generate-contractor-run-pdf.tsx` (PDF de período)
- `src/lib/contractor-engagements/payables/generate-contractor-run-excel.ts` (Excel)
- `src/lib/contractor-engagements/payables/run-report-reader.ts` (lista + agrupa por régimen/moneda, montos verbatim)
- `src/app/api/finance/contractor-payables/run-report/route.ts` (descarga PDF/Excel, capability finance)
- Botón de descarga en `/finance/contractor-payments` (TASK-974)
- `src/lib/copy/finance-payments.ts` (extender)

## Scope

### Slice 0 — Mockup del reporte (si emerge layout no trivial)

- Mockup del PDF (secciones, subtotales por régimen, totales por moneda) + el botón de descarga. Loop GVC + aprobación si el layout lo amerita (espejar el reporte de payroll reduce el riesgo de diseño).

### Slice 1 — Reader + Excel

- `run-report-reader`: lista los contractor payables del período (por estado relevante: `ready_for_finance`+ / `paid`), agrupados por régimen (honorarios_cl vs internacional) + moneda, montos **verbatim** del payable.
- `generate-contractor-run-excel`: sheets `Resumen` (subtotales separados) + `Honorarios CL` + `Internacional` + `Detalle`, espejando TASK-782.

### Slice 2 — PDF + endpoint + botón

- `generate-contractor-run-pdf`: documento de período con summary strip + tabla por régimen + meta (período, tasa SII, totales por moneda).
- Endpoint de descarga + botón en el workbench Finanzas.

### Slice 3 — Cierre

- Docs (funcional + manual) + arch Delta. CLAUDE.md invariant si aplica.

## Out of Scope

- El comprobante individual → TASK-960 (ya existe).
- El email al contractor → TASK-981.
- La corrida mensual (el batch) → TASK-979.

## Detailed Spec

**Desglose por régimen** (espejo TASK-782): honorarios CL muestran bruto + retención SII (tasa snapshot) + neto; internacional muestra bruto = neto (sin retención CL). Subtotales: "Total retención SII honorarios" (reconcilia F29) separado del "Total neto pagado" (reconcilia banco). Régimen column. Grupos vacíos se omiten. Celdas N/A con `—`.

**Montos verbatim**: leer del payable (TASK-960 presenter pattern); cero recompute. Multi-moneda: CLP y USD segmentados.

## Plan de diseño — "Nómina de Contractors" (product design skills, 2026-05-31)

Diseñado con `modern-ui` + `greenhouse-ux` + `greenhouse-finance-accounting-operator` + `greenhouse-payroll-auditor`. Espejo del reporte de payroll (TASK-782) + rigor contable. **Piensa en todo lo que debe tener:**

### A. Masthead / header (brand-zone)

- **Logo Efeonce** + **eslogan "Empower your Growth"** (componente canónico `EfeonceSloganPdf`, Poppins — ya construido). El eslogan vive acá, NO en el footer.
- **Título**: "Nómina de Contractors" + período (mes operativo, anclado al cierre — consistente con TASK-978; el payable no tiene `service_period`).
- **Emisor**: operating entity (`getOperatingEntityIdentity()`: legalName + RUT).
- **Meta**: generado (timestamp) + correlativo de la corrida (si viene de TASK-979) + tasa SII vigente (snapshot).

### B. Summary strip (KPIs, máx una fila)

- N contractors / N payables del período.
- **Por moneda (CLP / USD segmentado)**: total bruto · total retención SII · **total neto** (acento verde, consistente con el comprobante TASK-960).
- Counters por régimen (Honorarios CL / Internacional) + por estado (pagados / pendientes / bloqueados).

### C. Body — tabla por régimen (subtotales mutuamente excluyentes)

- **Grupo Honorarios CL**: Contractor · Engagement (EO-CENG) · Modelo · Bruto · **Retención SII (tasa)** · **Neto** · Estado · Fecha de pago · **Comprobante (EO-RA-NNNNNN)** si pagado.
- **Grupo Internacional** (Deel/EOR/sin retención CL): Contractor · Engagement · payrollVia · Bruto = Neto · Moneda · Estado.
- **Subtotales separados** (regla dura): "Total retención SII honorarios" (reconcilia **F29**) ≠ "Total neto pagado" (reconcilia **banco**). NUNCA un total que los mezcle.
- **Régimen column** (CL-HON / INT). Celdas N/A con `—` (no `$0`). Estado por **color + icono + texto** (no color solo).
- **Multi-moneda segmentada** (CLP vs USD en secciones/subtotales separados; nunca sumar monedas).
- **Incluidos vs excluidos**: payables `paid`/`ready_for_finance` incluidos; bloqueados/no-listos en sección/flag visible (como el reporte de payroll muestra excluidos por falta de algo).
- Estado **`partial`** (honorarios con retención SII pendiente de remesa, TASK-977) mostrado con claridad — el neto se pagó, la remesa al SII es aparte.

### D. Nota contable (disclaimer)

"El **neto** es lo pagado al contractor. La **retención SII** es un pasivo a remesar al SII (F29, día 12/20 mes siguiente), no se le paga al contractor." — evita que se confunda el reporte con un comprobante de remesa.

### E. Footer

**`EfeoncePdfFooter`** institucional (ya construido): entidad · RUT + dirección (Dr. Manuel Barros Borgoño 71 Of 1105, Providencia, RM — Chile) + `efeoncepro.com` + generado · **página X de Y** (`fixed`). Reusa el footer canónico, no rollear uno propio.

### F. Tipografía / tokens — ⚠️ DECISIÓN PENDIENTE (no asumir Geist)

Verificado 2026-05-31: el **web** usa Geist como body canónico (`layout.tsx` + `mergedTheme.ts` + DESIGN.md), PERO el **PDF hermano** — el **comprobante de contractor (TASK-960)** y los PDFs de payroll — usan **`Helvetica`** (builtin react-pdf), NO Geist. Solo el PDF de cotización (TASK-629) usa Geist vía `register-fonts`.

→ El body del PDF de la nómina de contractors debe **decidirse, no asumirse**:

- **Opción A (consistencia)**: **Helvetica**, igual que el comprobante hermano (TASK-960). Coherente hoy sin tocar otros PDFs.
- **Opción B (canónico DESIGN.md)**: **Geist** — pero entonces **subir también el comprobante (TASK-960) a Geist** en el mismo PR para que el reporte y el comprobante no se vean distintos (no shippear el reporte en Geist mientras el comprobante queda en Helvetica).

Recomendación: **Opción B** si se quiere alinear al canónico (mejor a largo plazo, una sola familia de documentos), tratando la migración del comprobante a Geist como parte del scope. **Opción A** si se prioriza no tocar TASK-960. En ambas: **títulos/eslogan en Poppins**, acento verde solo en el neto, montos con tabular nums, tokens `customBorderRadius`/`GH_COLORS` sin hex crudo. Decidir en Plan Mode con greenhouse-ux.

### G. Excel (espejo TASK-782)

- Sheets: **Resumen** (subtotales separados por régimen + moneda) · **Honorarios CL** · **Internacional** · **Detalle** (audit raw). Régimen column. Formato de celdas (moneda CLP sin decimales, USD con; fechas). Agregaciones reconciliables (retención SII / neto separados).

### H. Estados / edge cases

- Período sin contractors → empty state honesto.
- Multi-moneda → segmentado (no un total mezclado).
- Reuse: `EfeoncePdfFooter` + `EfeonceSloganPdf` + register-fonts (Geist+Poppins) + presenter TASK-960/758 + patrón TASK-782.

### I. Acceso + verificación

- Endpoint de descarga gated por capability finance + botón en `/finance/contractor-payments`.
- **Documento operador-facing con montos por entidad/parte → aplica TASK-863 Semantic Column Invariants** (cada columna = una entidad; no mezclar bruto/retención/neto de contractors distintos en la misma celda). Si va a clientes/auditoría externa, **loop de verificación real** (emitir 1 caso real + audit 3-skill, TASK-863).

## Acceptance Criteria

- [ ] Reporte de período de contractors descargable en PDF + Excel desde `/finance/contractor-payments`.
- [ ] Desglose bruto/retención/neto verbatim; subtotales mutuamente excluyentes por régimen.
- [ ] Multi-moneda segmentada; celdas N/A con `—`.
- [ ] Copy es-CL tokenizado.

## Verification

- `pnpm lint` · `pnpm tsc --noEmit` · `pnpm test`
- `pnpm vitest run src/lib/contractor-engagements src/lib/payroll` (no-regresión EPIC-013)
- `pnpm design:lint` · descarga manual del PDF/Excel.

## Closing Protocol

- [ ] `Lifecycle` sincronizado + mover a `complete/`
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md`
- [ ] chequeo de impacto cruzado (TASK-960, TASK-974, TASK-979)
- [ ] arch Delta + doc funcional + manual

## Follow-ups

- Unificar el reporte de contractors con el de nómina si emerge necesidad de un único "reporte de pagos del período".

## Open Questions

- ¿El reporte se ancla a un período (mes operativo) o a una corrida específica de TASK-979? (Plan Mode: período es más simple y no depende de TASK-979; la corrida puede linkear su reporte después.)
- ¿Incluye solo `paid` o también `ready_for_finance` pendientes del período? (Plan Mode + finance skill — probablemente ambos con estado visible, como el reporte de payroll muestra incluidos/excluidos.)
