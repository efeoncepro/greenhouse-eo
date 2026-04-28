# TASK-706 — Previred Processor UX & Bank Semantics

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-706-previred-processor-ux-and-bank-semantics`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Redefinir la UX de `Previred` en `Finance > Banco` para que deje de comportarse como una cuenta bancaria vacía y pase a mostrarse como un `payroll_processor` con semántica honesta. El cash debe seguir visible en `Santander CLP`, mientras `Previred` muestra pagos procesados, estado de desglose previsional y vínculo con la cuenta pagadora real, sin inventar saldo ni movimientos que no existen en el ledger.

## Why This Task Exists

Hoy la UI de Banco mezcla dos conceptos distintos:

1. `Santander CLP` es la cuenta real desde la que sale el dinero.
2. `Previred` existe en catálogo como `payroll_processor`, pero se renderiza como si fuera una cuenta con saldo y ledger propios.

El resultado es engañoso:

- el drawer de `Previred` muestra `Saldo actual = $0`, `Movimientos recientes = vacío` y parece bug aunque sí hubo pagos de Previred en el período;
- el pago real aparece en `Santander CLP`, pero sin suficiente contexto de que corresponde a previsión social procesada por `Previred`;
- el usuario no puede distinguir entre:
  - "no hubo pago Previred"
  - "sí hubo pago, pero salió desde otra cuenta"
  - "sí hubo pago, pero el desglose previsional aún está pendiente".

Esta task corrige la historia que cuenta la UI sin mover artificialmente el cash fuera de la cuenta pagadora real ni falsificar movimientos sobre `previred-clp`.

## Goal

- `Previred` se presenta como `processor` operacional, no como cuenta bancaria con saldo propio.
- Los movimientos reales siguen apareciendo en `Santander CLP`, enriquecidos con contexto visible de `Previred` y previsión social.
- El drawer de `Previred` deja de mostrar estados vacíos engañosos y pasa a mostrar pagos procesados, cuenta pagadora y estado de desglose.
- La UI puede expresar de forma explícita estados `componentizado`, `pendiente de desglose` y `sin pago del período`.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/documentation/finance/conciliacion-bancaria.md`

Reglas obligatorias:

- El cash de un pago Previred debe seguir viviendo en la cuenta pagadora real (`payment_account_id` / `instrument_id`), no en `previred-clp`.
- `previred-clp` debe tratarse como `payroll_processor` y surface operativa, no como ledger de caja si no existen legs/payments anclados a esa cuenta.
- Esta task vive en `views` + read adapters de Finance; no introduce cambios de `views`, `routeGroups`, `authorizedViews`, `entitlements` ni `startup policy`.
- La UI no debe inventar saldos, movimientos ni KPIs bancarios que contradigan el ledger canónico.

## Normative Docs

- `docs/documentation/finance/modulos-caja-cobros-pagos.md`
- `docs/tasks/to-do/TASK-705-banco-read-model-snapshot-cutover.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-697-payment-instrument-admin-workspace-enterprise.md`
- `docs/tasks/complete/TASK-702-bank-reconciliation-canonical-anchors-rematerialize.md`
- `src/lib/finance/account-balances.ts`
- `src/app/api/finance/bank/route.ts`
- `src/app/api/finance/bank/[accountId]/route.ts`
- `src/views/greenhouse/finance/BankView.tsx`
- `src/views/greenhouse/finance/components/AccountDetailDrawer.tsx`
- `src/views/greenhouse/finance/ExpensesListView.tsx`
- `src/views/greenhouse/finance/ExpenseDetailView.tsx`

### Blocks / Impacts

- `/finance/bank`
- drawer `AccountDetailDrawer`
- semántica visible de instrumentos `payroll_processor`
- lectura operativa de gastos Previred en `Expenses`
- follow-up de canonicalización automática de pagos Previred en write path

### Files owned

- `src/views/greenhouse/finance/BankView.tsx`
- `src/views/greenhouse/finance/components/AccountDetailDrawer.tsx`
- `src/views/greenhouse/finance/ExpensesListView.tsx`
- `src/views/greenhouse/finance/ExpenseDetailView.tsx`
- `src/lib/finance/account-balances.ts`
- `src/app/api/finance/bank/[accountId]/route.ts`
- `src/app/api/finance/bank/route.ts`
- `docs/documentation/finance/modulos-caja-cobros-pagos.md`

## Current Repo State

### Already exists

- `Previred` está modelado en catálogo como `payroll_processor`.
- el drawer de Banco lee detalle por `instrument_id` y `payment_account_id` desde `src/lib/finance/account-balances.ts`.
- los pagos Previred reales ya aparecen en cuentas pagadoras como `santander-clp`.
- la UI de Banco usa `BankView` + `AccountDetailDrawer` como surface principal para instrumentos.
- la UI de gastos ya distingue `expense_type = 'social_security'` de otros tipos.

### Gap

- `Previred` se renderiza como si fuera una cuenta con saldo y movimientos propios, aunque el ledger real está vacío en `previred-clp`.
- la cuenta pagadora real no expone suficiente contexto visible para entender que el egreso corresponde a Previred / previsión social.
- la UI no expresa estados intermedios como `pago detectado pero desglose pendiente`.
- Banco y Expenses no comparten una semántica visible consistente para pagos previsionales procesados por `Previred`.

## Scope

### Slice 1 — Read contract for processor semantics

- extender el read adapter de Banco para diferenciar `bank account` versus `payroll_processor` en el detalle.
- exponer metadata suficiente para surfaces UI:
  - cuenta pagadora real
  - monto procesado en el período
  - cantidad de pagos detectados
  - estado de desglose (`componentized`, `pending_componentization`, `none`)
- mantener compatibilidad con cuentas bancarias reales sin reabrir la latencia estructural de `TASK-705`.

### Slice 2 — Previred drawer semantic redesign

- adaptar `AccountDetailDrawer` para que `payroll_processor` no muestre el mismo set de KPIs bancarios que una cuenta asset/liability.
- para `Previred`, mostrar una surface orientada a proceso:
  - pagos del período
  - monto procesado
  - cuenta pagadora
  - estado de desglose
  - tabla/timeline de pagos procesados
- reemplazar el empty state engañoso por mensajes explícitos según estado real.

### Slice 3 — Santander movement contextualization

- enriquecer los movimientos y/o filas relevantes de `Santander CLP` para que pagos Previred muestren contexto visible:
  - `Previred`
  - `Previsión social`
  - período payroll cuando exista
  - estado de desglose
- evitar duplicar el movimiento en `Previred`; se debe explicar, no duplicar.

### Slice 4 — Expenses semantic alignment

- alinear `ExpensesListView` y `ExpenseDetailView` para que pagos Previred canónicos o pendientes se entiendan como previsión social / pago procesado, no como overhead opaco.
- preparar la UI para coexistir con estados transicionales mientras el write path termina de canonicalizar el flujo automáticamente.

### Slice 5 — Functional docs and acceptance polish

- actualizar documentación funcional de Finance para dejar explícita la diferencia entre:
  - cuenta pagadora real
  - processor operacional
  - estado de componentización
- dejar criterios de smoke manual para `Previred` y `Santander CLP`.

## Out of Scope

- recablear el write path de conciliación o canonicalización automática de Previred
- mover el cash desde `Santander CLP` a `previred-clp`
- materializar un ledger sintético para `Previred`
- rediseño completo de `/finance/bank`
- cambios de permisos, navegación o acceso

## Detailed Spec

La UX objetivo debe separar dos historias:

1. **Historia de caja**
   - vive en `Santander CLP`
   - muestra el egreso real del banco
   - puede incluir labels/badges/metadata de `Previred`

2. **Historia operativa**
   - vive en la surface de `Previred`
   - muestra pagos procesados, origen del cash y estado del desglose previsional
   - no muestra KPIs bancarios falsos si no hay ledger real

Semántica visible mínima esperada:

- `componentized`
  - el pago ya tiene desglose previsional suficiente
- `pending_componentization`
  - el pago fue detectado y anclado operativamente, pero aún no se descompone por componente
- `none`
  - no hubo pago Previred en el período consultado

Casos UX a cubrir:

- `Previred` con pago detectado en `Santander CLP` y desglose pendiente
- `Previred` con pago componentizado
- `Previred` sin pagos del período
- `Santander CLP` mostrando pago Previred con contexto suficiente

## Acceptance Criteria

- [ ] abrir `Previred` en Banco ya no muestra un drawer bancario engañoso con KPIs de saldo/movimientos cuando no existe ledger real para esa cuenta.
- [ ] la surface de `Previred` expresa explícitamente si hubo pago del período, desde qué cuenta salió y en qué estado de desglose está.
- [ ] `Santander CLP` muestra el pago real de Previred con contexto visible de `Previred` / previsión social, sin duplicar movimientos en dos cuentas.
- [ ] Banco y Expenses comparten semántica visible coherente para pagos Previred.
- [ ] la implementación no introduce cambios de permisos ni rompe el comportamiento normal de cuentas bancarias no-processor.
- [ ] la documentación funcional deja explícita la diferencia entre cuenta pagadora y processor operacional.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- validación manual en `/finance/bank` con `previred-clp` y `santander-clp`
- validación manual en `/finance/expenses` sobre al menos un gasto Previred / previsional

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `docs/documentation/finance/modulos-caja-cobros-pagos.md` quedó actualizado con la semántica UI de processors operacionales

## Follow-ups

- task de canonicalización automática de pagos Previred en write path, con componentización reactiva y degraded states canónicos
- posible split futuro de `AccountDetailDrawer` entre `bank account detail` y `processor detail` si la surface compartida queda demasiado acoplada

## Open Questions

- si la surface de `Previred` debe seguir viviendo dentro de `AccountDetailDrawer` o si conviene extraer un drawer especializado por `instrument_category`
- si el overview de Banco debe mostrar un KPI resumido para processors (`monto procesado`) o limitarse a una etiqueta de tipo/estado
