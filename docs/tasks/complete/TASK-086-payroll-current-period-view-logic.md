# TASK-086 - Payroll: Current Period View Logic Fix

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `complete` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Bajo` |
| Status real | `Cerrada` |
| Domain | HR Payroll |

## Summary

La pestaña "Período actual" de Nómina muestra un período antiguo (Febrero 2026 en estado `approved`) cuando ya existe un período más reciente exportado (Marzo 2026). Debería mostrar el período de cierre operativo más reciente que siga abierto o dentro de la ventana de cierre, o un empty state para crear el siguiente período si todos están cerrados.

## Goal

- Mostrar como "Período actual" el período más reciente que siga accionable para RRHH dentro del ciclo de nómina cerrado.
- Evitar que un período `approved` anterior a uno ya exportado siga pareciendo vigente.
- Cuando no haya período abierto, guiar la siguiente acción con un empty state explícito.
- Mantener la lectura coherente con el lifecycle oficial de nómina, sin mezclarla con el contrato de `Projected Payroll`.

## Why This Task Exists

Un HR manager que abre Nómina espera ver el período del ciclo que todavía está abierto o por cerrarse. En Efeonce la nómina se imputa al mes cerrado y se calcula al cierre o dentro de los primeros 5 días hábiles del mes siguiente. Si Marzo ya fue exportado, el siguiente paso es Abril; pero mientras Febrero siga dentro de su ventana de cierre operativo no debe reemplazarse por un mes nuevo solo porque cambió el calendario. Mostrar un mes viejo o adelantarse al siguiente ciclo genera confusión y da la impresión de que el sistema está atrasado o desalineado con la operación real.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- la selección de período actual debe quedar centralizada en una regla clara y testeable
- la UI no debe inventar un período "actual" si la data solo ofrece rezago
- el empty state debe explicar la siguiente acción operativa, no solo decir que no hay datos
- el selector debe respetar el cierre operativo de nómina: mes cerrado, pago/exportación al cierre o dentro de los primeros 5 días hábiles del mes siguiente

## Current Repo State

### Ya existe

- el lifecycle oficial de nómina está definido como `draft -> calculated -> approved -> exported`
- `calculatePayroll()` deja el período en `calculated`
- la aprobación del período vive en la nómina oficial
- la exportación final vive en `exportPayrollCsv()` y marca el período como `exported`
- `Projected Payroll` ya funciona como superficie separada y solo promueve/recalcula la nómina oficial
- ya existe un helper puro para seleccionar el período actual sin retroceder a rezagos históricos
- ya existe un helper compartido para descargar recibos PDF por blob con nombre legible

### Gap actual

- falta validar en runtime que el helper de período actual y el empty state coinciden con la regla operativa real en staging
- falta validar en runtime que la descarga por blob dispara el PDF en HR y Mi Nómina sin depender de `window.open`
- falta cerrar si el filename legible del PDF debe priorizar `memberName`, `memberId` o ambos, y confirmar que el route server-side usa el mismo contrato
- falta confirmar que el selector no retrocede a rezagos históricos cuando el último período cronológico ya está exportado

## Delta 2026-03-28

- En la misma superficie de Nómina, el modal de recibo abre un PDF desde `/api/hr/payroll/entries/[entryId]/receipt`, pero el nombre descargado sale del `receiptId` técnico (`receipt_<entryId>_r<n>.pdf`).
- El endpoint sí responde como `application/pdf` con `attachment`, por lo que el PDF parece generarse; el problema observado es de naming/provenance del descargable, no necesariamente de render.
- Este hallazgo es adyacente a `TASK-086`: si se absorbe aquí, debe quedar explícito; si no, conviene derivarlo a un follow-up separado de receipts.
- `TASK-074` ya está cerrada y solo sirve como contexto de provenance para entender cómo una nómina oficial puede venir promovida desde proyectada.

## Delta 2026-03-28 - Implementation complete

- Se implementó `getCurrentPayrollPeriod()` para que el dashboard solo auto-seleccione el período cronológicamente más reciente si sigue abierto; si el último período ya está exportado, la vista cae a empty state y no retrocede a rezagos históricos.
- Se implementó `getNextPayrollPeriodSuggestion()` para prellenar el alta del siguiente período operativo sin inventar un mes arbitrario.
- Se implementó `buildPayrollReceiptDownloadFilename()` y `downloadPayrollReceiptPdf()` para que HR y Mi Nómina descarguen el PDF por `fetch -> blob -> anchor`, con filename legible y estable.
- Las superficies `PayrollDashboard`, `PayrollPeriodTab`, `PayrollReceiptDialog`, `MyPayrollView` y `PersonPayrollTab` ya quedaron conectadas al nuevo contrato.
- Validación ejecutada:
  - `pnpm exec vitest run src/lib/payroll/current-payroll-period.test.ts src/lib/payroll/receipt-filename.test.ts src/views/greenhouse/payroll/PayrollPeriodTab.test.tsx`
  - `pnpm exec eslint ...`
  - `pnpm build`

## Current Behavior

1. "Período actual" busca el último período con status no-exportado (`draft`, `calculated`, `approved`)
2. Febrero está en `approved` → lo muestra como "actual" incluso cuando ya pasó la ventana de cierre operativo
3. Marzo está en `exported` → solo aparece en Historial
4. El usuario ve Febrero como período activo aunque Marzo ya se cerró

## Expected Behavior

1. Si hay un período abierto o dentro de la ventana de cierre operativo → mostrarlo como actual (priorizar el más reciente)
2. Si todos los períodos están exportados → mostrar empty state:
   - Mensaje: "No hay período abierto"
   - CTA: "Crear período [siguiente mes] [año]" (ej. "Crear período Abril 2026")
3. Un período `approved` anterior al último exportado no debería mostrarse como "actual" una vez que venció su ventana de cierre; antes de ese corte puede seguir siendo el período operativo actual

## Scope

### Lógica de selección de período actual
- Ordenar períodos por `year DESC, month DESC`
- El "actual" debe ser el período más reciente que siga abierto para trabajo operativo o todavía dentro de la ventana de cierre definida por negocio
- Si el último período cronológico ya está `exported`, no se debe retroceder a un `approved` anterior para mostrarlo como actual
- Si todos los períodos están cerrados/exportados o no hay período accionable, mostrar empty state
- La regla debe quedar encapsulada en un helper puro para evitar que el dashboard duplique lógica

### Empty state
- Texto: "No hay período abierto"
- Botón: "Crear período [Mes] [Año]" — calcula el mes siguiente al último exportado
- Al hacer click, crea el período en `draft`
- El CTA debe sugerir el próximo mes derivado del último período cerrado, no un mes arbitrario

### Edge case: período aprobado anterior
- Si existe Febrero `approved` y Marzo `exported`, Febrero es un rezago solo si ya salió de la ventana de cierre operativo; mientras siga dentro de los primeros 5 días hábiles del mes siguiente puede seguir siendo el período actual
- Opción A: mostrarlo con advertencia "Este período es anterior al último exportado"
- Opción B: no mostrarlo en "actual" y dejarlo solo en Historial

### Interpretación de lifecycle oficial
- `draft`: período creado, todavía sin cálculo
- `calculated`: nómina corrida, todavía editable/recalculable
- `approved`: validada por RRHH, lista para exportar
- `exported`: cierre final del período oficial
- `Projected Payroll` no agrega estados nuevos a ese lifecycle; solo alimenta la nómina oficial por promoción
- Regla de corte operativo Efeonce: el período se paga con mes cerrado y se exporta/cierra al final del mes o dentro de los primeros 5 días hábiles del mes siguiente

### Observación adicional de la superficie
- La descarga de recibo individual no usa un nombre de archivo humano-readable y además el trigger UI/route no está cerrando la experiencia de descarga de forma confiable.
- El contrato de descarga debería definir un nombre legible y estable para HR y asegurar que el click del usuario dispare la descarga o apertura del PDF sin depender de heurísticas de navegador.
- Este gap sí entra en esta lane: no debe quedar como follow-up externo, porque impacta la misma superficie de Nómina y la misma experiencia del botón de recibo.
- La implementación ya empezó en `src/lib/payroll/download-payroll-receipt.ts` y rutas `receipt`, pero requiere smoke real en HR y Mi Nómina antes de cerrar.

## Dependencies & Impact

### Depends on
- Ninguna

### Impacts to
- `src/views/greenhouse/payroll/PayrollPeriodTab.tsx` (o el componente que renderiza "Período actual")
- `src/lib/payroll/get-payroll-periods.ts` (lógica de selección)
- `src/views/greenhouse/payroll/PayrollReceiptDialog.tsx` y endpoints de receipt si se absorbe el naming del PDF en esta misma task

### Files owned
- Vista de período actual en Nómina
- Regla de selección de período actual
- Empty state operativo de Nómina

## Acceptance Criteria

- [ ] "Período actual" muestra el período más reciente abierto o dentro de la ventana de cierre operativo
- [ ] Si todos están exportados, muestra empty state con CTA para crear el siguiente
- [ ] No muestra un período anterior al último exportado como "actual"
- [ ] Historial sigue mostrando todos los períodos sin cambios
- [ ] El botón de recibo dispara una descarga o apertura confiable del PDF en HR y Mi Nómina
- [ ] El PDF descargado usa un nombre legible y estable para HR, no solo un `receiptId` técnico
- [ ] La regla de selección queda extraída en una función testeable y no depende de heurísticas locales del componente
- [ ] El brief deja claro que `TASK-074` solo aporta contexto de provenance, no una dependencia activa

## Verification

- `npx tsc --noEmit --pretty false`
- `pnpm exec eslint [archivos modificados]`
- Validación visual en staging con períodos en distintos estados
- Revisión manual de la descarga de recibo para confirmar si el archivo sale con nombre técnico o legible
