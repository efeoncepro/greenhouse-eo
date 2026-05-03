# TASK-758 — Payroll Honorarios Receipt Render Contract Hardening

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `task/TASK-758-payroll-honorarios-receipt-render-contract`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Endurece el contrato de proyección/render de recibos Payroll para entradas `honorarios` sin tocar el motor de cálculo. El objetivo es que el preview MUI, el PDF descargable y cualquier surface de recibo muestren explícitamente la retención SII honorarios, cuadren visualmente con el neto persistido y nunca rendericen filas de dependiente Chile (AFP, salud, cesantía, impuesto único) para este régimen.

## Why This Task Exists

Hoy Payroll ya calcula correctamente el caso `honorarios`, pero la capa de recibos quedó con una lógica visual heredada de trabajadores dependientes Chile:

- `PayrollEntryTable` y `ProjectedPayrollView` ya distinguen honorarios usando `siiRetentionAmount`.
- `PayrollReceiptCard` y `generate-payroll-pdf.tsx` siguen ramificando principalmente por `payRegime === 'chile'`.
- Eso provoca recibos incoherentes: para un honorario con retención SII aparece el bloque `Descuentos legales` pensado para dependiente Chile, con filas de AFP/salud/cesantía/impuesto único vacías o incorrectas.
- En casos con adjustments al bruto efectivo, el neto visible puede cuadrar pero el total visual de descuentos queda mal explicado si la surface usa la bolsa genérica equivocada.

El problema a resolver es de **proyección/render**, no del motor de cálculo. Si intentamos “arreglarlo” desde `calculate-payroll.ts`, abrimos un frente innecesario con alto riesgo de romper Payroll.

## Goal

- Unificar el criterio visual de `honorarios` en recibos (`PayrollReceiptCard` + PDF) usando el contrato ya persistido en `PayrollEntry`.
- Mostrar explícitamente para honorarios:
  - `Retención honorarios`
  - `Tasa SII`
  - `Total retención`
- Evitar que honorarios muestre filas de AFP, salud, cesantía, APV o impuesto único.
- Hacer que preview MUI y PDF consuman el mismo breakdown visual compartido.
- Agregar tests de no regresión para que futuras mejoras de Payroll no vuelvan a romper el recibo de honorarios.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`

Reglas obligatorias:

- **No tocar el motor de cálculo Payroll** en esta task.
- La solución debe anclarse en el contrato ya persistido de `PayrollEntry`, no recalcular montos en el render.
- `PayrollReceiptCard` y `generate-payroll-pdf.tsx` deben converger a un criterio compartido; no se permite duplicar lógica divergente entre preview y PDF.
- Para `honorarios`, la surface visual no puede depender de inferencias de dependiente Chile solo porque `payRegime = 'chile'`.
- Si cambia cualquier output visual del PDF, hay que bump-ear `RECEIPT_TEMPLATE_VERSION`.

## Normative Docs

- `docs/tasks/complete/TASK-077-payroll-receipt-generation-delivery.md`
- `docs/tasks/complete/TASK-744-payroll-chile-compliance-remediation.md`
- `docs/documentation/hr/periodos-de-nomina.md`
- `docs/manual-de-uso/hr/periodos-de-nomina.md`

## Dependencies & Impact

### Depends on

- `src/types/payroll.ts`
- `src/lib/payroll/get-payroll-entries.ts`
- `src/lib/payroll/generate-payroll-pdf.tsx`
- `src/views/greenhouse/payroll/PayrollReceiptCard.tsx`
- `src/views/greenhouse/payroll/PayrollReceiptDialog.tsx`
- `src/views/greenhouse/payroll/PayrollEntryTable.tsx`
- `src/views/greenhouse/payroll/ProjectedPayrollView.tsx`
- `src/lib/payroll/generate-payroll-receipts.ts`

### Blocks / Impacts

- Reduce regresiones visibles en `People > Nómina` y `My Nómina`.
- Sirve como base para que `TASK-730` (smoke lane) incorpore un assert real de receipt honorarios en follow-up.
- `TASK-731` puede reutilizar el invariant visual/documental de honorarios si luego se agrega a preflight.
- Si existe copy funcional/documental que describa el recibo de honorarios, debe quedar alineado.

### Files owned

- `src/lib/payroll/generate-payroll-pdf.tsx`
- `src/views/greenhouse/payroll/PayrollReceiptCard.tsx`
- `src/views/greenhouse/payroll/PayrollReceiptDialog.tsx`
- `src/views/greenhouse/payroll/helpers.ts`
- `src/views/greenhouse/payroll/*test.tsx`
- `src/lib/payroll/*test.ts`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/documentation/hr/periodos-de-nomina.md`
- `docs/manual-de-uso/hr/periodos-de-nomina.md`

## Current Repo State

### Already exists

- `PayrollEntry` ya persiste:
  - `grossTotal`
  - `netTotal`
  - `siiRetentionRate`
  - `siiRetentionAmount`
  - `chileTotalDeductions`
  - `contractTypeSnapshot`
- `PayrollEntryTable` ya trata honorarios distinto al mostrar descuentos:
  - usa `siiRetentionAmount` cuando detecta honorarios.
- `ProjectedPayrollView` ya modela explícitamente `Retención honorarios` y `Total retención`.
- `PayrollReceiptDialog` ya compone preview MUI + descarga PDF como dos consumers del mismo entry.
- `TASK-077` ya dejó la foundation de receipts y template versioning.

### Gap

- `PayrollReceiptCard` sigue ramificando por `payRegime === 'chile'` y arma un bloque de descuentos de dependiente Chile también para honorarios.
- `generate-payroll-pdf.tsx` replica ese mismo problema en el PDF.
- No existe hoy un helper pequeño y compartido de “breakdown visual del recibo”.
- No hay tests focalizados que congelen el contrato visual de honorarios con y sin ajustes al bruto efectivo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Shared receipt deduction presenter

- Extraer un helper compartido y pequeño para el breakdown visual de descuentos/retenciones del recibo.
- Input:
  - `PayrollEntry`
  - opcionalmente datos auxiliares ya disponibles del breakdown de adjustments si la surface ya los consume
- Output mínimo:
  - `sectionTitle`
  - `rows`
  - `totalLabel`
  - `totalAmount`
  - `displayRegime`
- Debe distinguir al menos:
  - Chile dependiente
  - honorarios
  - internacional / Deel

### Slice 2 — ReceiptCard convergence

- Reemplazar la lógica inline de `PayrollReceiptCard` por el helper compartido.
- Para honorarios, renderizar explícitamente:
  - `Retención honorarios`
  - `Tasa SII`
  - `Total retención`
- Mantener sin cambios funcionales el comportamiento de Chile dependiente e internacional salvo donde sea necesario para converger al helper.

### Slice 3 — PDF convergence

- Hacer que `generate-payroll-pdf.tsx` consuma el mismo criterio de breakdown visual.
- Para honorarios:
  - no mostrar AFP / salud / cesantía / impuesto único
  - mostrar la retención honorarios con naming claro
- Bump obligatorio de `RECEIPT_TEMPLATE_VERSION` si cambia el output del PDF.

### Slice 4 — Targeted regression tests

- Agregar tests para el helper compartido.
- Agregar tests de render focalizados para `PayrollReceiptCard`.
- Agregar tests o snapshots contractuales del PDF, al menos sobre el contenido estructural esperado del caso honorarios.
- Casos mínimos:
  - honorarios sin adjustments
  - honorarios con bruto efectivo reducido pero cálculo ya persistido correcto
  - dependiente Chile no regresa

## Out of Scope

- No tocar `calculate-payroll.ts`, `calculate-honorarios.ts`, `recalculate-entry.ts` ni cualquier fórmula del motor.
- No rediseñar el layout completo del recibo.
- No cambiar todavía el contrato de emails transaccionales si su copy no depende del breakdown detallado.
- No abrir un programa amplio de “Payroll safety harness”; esta task solo deja el guardrail mínimo directamente relacionado con recibos honorarios.
- No mezclar ajustes de Payment Orders, Finance ni downstream accounting.

## Detailed Spec

### Contract to preserve

La task asume que el cálculo actual ya es canónico. Por eso el render debe tratar a `PayrollEntry` como source of truth:

- `grossTotal` = bruto efectivo visible
- `netTotal` = líquido visible
- `siiRetentionRate` = tasa visual de honorarios
- `siiRetentionAmount` = retención visual de honorarios

Para `honorarios`, la surface de recibo debe preferir `siiRetentionAmount` como total visual del bloque de retención. No debe inferir el monto desde tablas de dependiente Chile ni recomputarlo.

### Minimal presenter behavior

#### Case A — Chile dependiente

- Título: `Descuentos legales`
- Rows:
  - AFP
  - Salud
  - Seguro cesantía
  - Impuesto único
  - APV cuando aplique
- Total: `Total descuentos`

#### Case B — Honorarios

- Título sugerido:
  - `Retención honorarios`
  - o `Retención boleta honorarios`
- Rows:
  - `Tasa SII`
  - `Retención honorarios`
- Total:
  - `Total retención`
- Nunca renderizar filas de:
  - AFP
  - Salud
  - Cesantía
  - Impuesto único
  - APV

#### Case C — Internacional / Deel

- Sin bloque de descuentos Chile por defecto.
- Si la surface necesita una explicación, debe ser copy informativo, no filas legales Chile.

### Test posture

Los tests deben congelar explícitamente esta invariant:

- si `entry.siiRetentionAmount > 0`, el recibo debe presentar honorarios como régimen visual propio y no como dependiente Chile.

Y este otro:

- para honorarios, el total visual de retención debe estar alineado con el neto persistido del entry, sin recalcular ni reinterpretar el motor.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `PayrollReceiptCard` y el PDF descargable muestran un bloque explícito de retención honorarios para entries `honorarios`.
- [ ] El recibo honorarios no muestra filas de AFP, salud, cesantía, impuesto único ni APV.
- [ ] La surface visual de honorarios usa el contrato persistido del entry y no toca el motor de cálculo.
- [ ] Existe un helper compartido o equivalente que evita duplicar la lógica entre preview y PDF.
- [ ] Hay tests de no regresión para honorarios y al menos un test de que Chile dependiente sigue intacto.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm vitest run src/views/greenhouse/payroll src/lib/payroll`
- Validación manual local o en preview del receipt de un entry honorarios real o fixtureado

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] si se modifico el PDF, `RECEIPT_TEMPLATE_VERSION` fue actualizado

## Follow-ups

- Extender `TASK-730` o task derivada para smoke visual de receipt honorarios.
- Revisar si `generate-payroll-receipts.ts` necesita converger el campo `totalDeductions` outbound para honorarios en un slice posterior.
- Si emergen más regímenes con tratamiento visual diferenciado, promover el presenter a contrato reusable de todas las surfaces Payroll.

## Open Questions

- ¿Conviene usar `contractTypeSnapshot === 'honorarios'` como detector principal y `siiRetentionAmount > 0` como fallback defensivo, o mantener la heurística actual por monto en surfaces legacy?
- ¿La sección visible para honorarios debe titularse `Retención honorarios` o `Retención boleta honorarios` para mayor claridad operativa?
