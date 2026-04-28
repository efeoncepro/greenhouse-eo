# TASK-714 — Banco Instrument Detail Semantic Drawer

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-714-banco-instrument-detail-semantic-drawer`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Convertir el drawer de detalle de `Finance > Banco` desde una UI generica de cuenta bancaria hacia una surface semantica por tipo de instrumento. El primer caso critico es `credit_card`: debe mostrar disponible, consumido/deuda, cupo, ultimos 4 digitos, cargos y pagos/abonos, sin narrarlo como "saldo/ingresos/salidas" de cuenta corriente.

La solucion objetivo no es un `if credit_card` disperso en JSX, sino un contrato reusable de presentacion por categoria/kind de instrumento que tambien pueda cubrir `shareholder_account`, `payroll_processor`, futuros `loan_account` y wallets.

## Why This Task Exists

El drawer actual `AccountDetailDrawer` usa la misma gramatica para todos los instrumentos: "Detalle de cuenta", "Saldo actual", "Ingresos periodo", "Salidas periodo", historial de ingresos/salidas y movimientos tipo `payout`/`receipt`. Esa historia es correcta para una cuenta corriente o fintech, pero no para una tarjeta de credito corporativa.

El backend ya reconoce que `credit_card` es una liability: `getBankOverview()` calcula `consumed` como deuda activa/cupo utilizado, y `TASK-703` introdujo `account_kind` para invertir la semantica de saldos en tarjetas y cuentas accionistas. La UI de detalle quedo atrasada respecto de ese contrato: muestra valores tecnicamente correctos con etiquetas financieramente equivocadas.

## Goal

- Crear un resolver semantico de detalle de instrumento que traduzca `instrument_category` / `account_kind` a labels, KPIs, iconos, colores, vocabulario de movimientos y empty states.
- Adaptar `AccountDetailDrawer` para renderizar desde ese perfil semantico, empezando por `transactional_account` y `credit_card`.
- Exponer en el drawer de TC datos esperados por un usuario financiero: cupo, disponible, consumido/deuda, ultimos 4 digitos cuando existan, cargos del periodo y pagos/abonos.
- Mantener compatibilidad con `TASK-705`: el drawer debe poder consumir un payload dedicado/read-model-ready sin acoplarse mas al overview completo.

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
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`
- `docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md`
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`

Reglas obligatorias:

- La surface visible sigue siendo `Finance > Banco`; no crear nueva ruta, menu, `view_code`, routeGroup ni entitlement para este slice.
- Si el plan propone cambios de acceso, debe explicitar ambos planos: `views` / `authorizedViews` y `entitlements` / capabilities. La expectativa inicial es **sin cambios de acceso**.
- No duplicar logica de saldos en frontend. La UI solo traduce semantica y presenta valores entregados por el contrato de detalle.
- No resolver la TC como excepcion visual aislada. El contrato debe soportar perfiles semanticos reutilizables.
- No romper el camino de `TASK-705`: cualquier cambio al endpoint debe acercarlo a reader dedicado, no reforzar la dependencia de `getBankOverview()`.

## Normative Docs

- `docs/documentation/finance/modulos-caja-cobros-pagos.md`
- `docs/tasks/to-do/TASK-705-banco-read-model-snapshot-cutover.md`
- `docs/tasks/complete/TASK-703-canonical-opening-trial-balance-and-liability-accounting.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-703-canonical-opening-trial-balance-and-liability-accounting.md`
- `docs/tasks/to-do/TASK-705-banco-read-model-snapshot-cutover.md` (coordinacion de contrato/read path; no bloquea el slice UI inicial)
- `src/lib/finance/account-balances.ts`
- `src/app/api/finance/bank/[accountId]/route.ts`
- `src/views/greenhouse/finance/components/AccountDetailDrawer.tsx`
- `src/views/greenhouse/finance/BankView.tsx`
- `src/config/payment-instruments.ts`

### Blocks / Impacts

- `/finance/bank` drawer de detalle por instrumento.
- UX de tarjetas de credito corporativas dentro de Banco.
- Futuras mejoras de `shareholder_account`, `payroll_processor`, `loan_account` y wallets dentro del mismo runtime de instrumentos.
- La documentacion funcional de Caja/Banco.

### Files owned

- `src/views/greenhouse/finance/components/AccountDetailDrawer.tsx`
- `src/views/greenhouse/finance/BankView.tsx`
- `src/lib/finance/account-balances.ts`
- `src/app/api/finance/bank/[accountId]/route.ts`
- `src/config/payment-instruments.ts`
- `src/components/greenhouse/*` si se extrae un primitive compartido
- `src/views/greenhouse/finance/components/*` para resolver/presenters route-locales
- `docs/documentation/finance/modulos-caja-cobros-pagos.md`
- `docs/tasks/to-do/TASK-705-banco-read-model-snapshot-cutover.md` solo si se documenta coordinacion explicita con el contrato de detalle

## Current Repo State

### Already exists

- `AccountDetailDrawer` renderiza header, tres KPI cards, chart de 12 meses, movimientos recientes y cierre de periodo.
- `PaymentInstrumentChip` ya muestra proveedor/nombre/categoria de instrumento.
- `getBankOverview()` ya calcula `creditCards[]` con `creditLimit`, `consumed` y `available`.
- `greenhouse_finance.accounts` ya tiene `card_last_four`, `card_network`, `credit_limit`, `instrument_category` y `account_kind`.
- `TASK-703` ya establecio que `credit_card` y `shareholder_account` son liabilities.
- `TASK-705` ya identifica que el drawer debe tener reader dedicado y no heredar el overview completo.

### Gap

- El drawer no distingue semanticamente cuenta transaccional vs tarjeta de credito vs liability.
- `DetailResponse.account` no expone claramente `accountKind`, `cardLastFour`, `cardNetwork`, `creditLimit`, `available`, `consumed` ni campos equivalentes para el header TC.
- El chart de TC habla de "Ingresos/Salidas" en vez de "Pagos/Cargos" o consumo/deuda historica.
- La tabla muestra `payout` / `receipt` y `Entrada` / `Salida`, vocabulario demasiado contable para usuario de TC.
- La solucion actual no escala naturalmente a CCA, Previred, loans o wallets; cualquier mejora tenderia a sumar condicionales dispersos.

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

### Slice 1 — Semantic presentation contract

- Crear un resolver tipado, por ejemplo `getInstrumentDetailPresentation(account)` en una ubicacion que el Discovery justifique.
- Definir perfiles iniciales:
  - `transactional_account`: bank account, fintech, cash, payment platform.
  - `credit_card`: tarjeta corporativa liability.
- El resolver debe devolver al menos:
  - titulo/subtitulo del drawer
  - KPI principal y secundarios
  - labels para inflows/outflows
  - iconos/colores
  - labels de chart
  - vocabulario de movimientos
  - empty states
  - campos de identidad visibles del instrumento
- Agregar tests unitarios del resolver para evitar regresiones de copy semantico.

### Slice 2 — Detail payload readiness

- Extender el contrato de `TreasuryBankAccountDetail` con campos necesarios para presentacion semantica sin recalculo frontend.
- Para `credit_card`, asegurar disponibilidad de:
  - `cardLastFour`
  - `cardNetwork`
  - `creditLimit`
  - `consumed`
  - `available`
  - `accountKind`
- Mantener backward compatibility con los campos actuales (`currentBalance`, `history`, `movements`) mientras `TASK-705` completa el cutover del reader.
- No introducir queries pesadas adicionales si el dato ya viene de `accounts` o `account_balances`.

### Slice 3 — Drawer UI by semantic profile

- Refactorizar `AccountDetailDrawer` para consumir el resolver semantico.
- Para `credit_card`, renderizar:
  - titulo `Detalle de tarjeta`
  - identidad `Nombre · red/ultimos 4 · moneda` cuando existan datos
  - KPI `Disponible`, `Consumido` / `Deuda actual`, `Cupo total`
  - labels `Pagos / abonos` y `Cargos del periodo`
  - movimientos con labels `Cargo`, `Pago`, `Abono`, `Ajuste` cuando sea posible derivarlo
- Para cuentas transaccionales, preservar la UX actual con copy ajustado solo si el resolver lo centraliza.
- Mantener layout responsive y no crear cards dentro de cards.

### Slice 4 — Chart and movement semantics

- Ajustar `chartData` y `Bar` labels segun perfil.
- Para TC, decidir en Discovery si el chart V1 muestra:
  - cargos vs pagos, o
  - deuda/consumo historico como serie principal.
- La decision debe respetar los datos disponibles hoy y el contrato futuro de `TASK-705`.
- No inventar "autorizaciones pendientes" si el backend no entrega `holds` confiable.

### Slice 5 — Documentation and coordination with TASK-705

- Actualizar `docs/documentation/finance/modulos-caja-cobros-pagos.md` con la semantica del drawer por instrumento.
- Si el contrato de detalle cambia, dejar nota en `TASK-705` o cross-reference desde esta task para que el read-model cutover preserve los campos semanticos.
- Actualizar `Handoff.md` si se modifica el contrato API, UI compartida o se deja deuda abierta.

## Out of Scope

- Redisenar todo `/finance/bank`.
- Crear una nueva ruta de tarjetas o separar tarjetas fuera de Banco.
- Implementar `TASK-705` completo.
- Backfill de datos de tarjeta, cartolas o conciliacion.
- Crear permisos nuevos, routeGroups, views o capabilities.
- Modelar autorizaciones/holds si no existe dato confiable en el contrato.
- Cambiar la contabilidad de `account_balances`, OTB o liability sign inversion.

## Detailed Spec

El target conceptual es:

```ts
type InstrumentDetailProfile = {
  key: 'transactional_account' | 'credit_card' | 'shareholder_account' | 'processor_transit' | 'loan_account'
  drawerTitle: string
  drawerSubtitle: string
  identityFields: Array<'provider' | 'cardLastFour' | 'accountNumber' | 'currency' | 'counterparty'>
  kpis: Array<{
    key: string
    title: string
    valueField: string
    subtitle: string
    icon: string
    color: 'primary' | 'success' | 'error' | 'warning' | 'info' | 'secondary'
  }>
  chart: {
    title: string
    subheader: string
    series: Array<{ key: 'periodInflows' | 'periodOutflows' | 'closingBalance' | 'consumed'; label: string }>
  }
  movements: {
    sectionTitle: string
    sectionSubtitle: string
    directionLabels: Record<'incoming' | 'outgoing', string>
    typeLabels: Record<string, string>
    emptyLabel: string
  }
}
```

El shape exacto puede cambiar durante Discovery, pero debe preservar estos principios:

1. La semantica sale de una sola capa resolver/presenter.
2. El drawer no conoce reglas contables profundas; renderiza un perfil.
3. El backend entrega numeros canonicos; el frontend no recalcula saldos.
4. `credit_card` no se describe como cuenta corriente.
5. Los perfiles futuros no requieren reescribir la estructura del drawer.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un resolver semantico tipado para detalle de instrumento con perfiles `transactional_account` y `credit_card`.
- [ ] `AccountDetailDrawer` consume ese resolver y deja de hardcodear una sola gramatica de "cuenta" para todos los instrumentos.
- [ ] Para `credit_card`, el drawer muestra disponible, consumido/deuda, cupo total y referencia de ultimos 4 digitos cuando el dato existe.
- [ ] Para `credit_card`, el copy visible usa cargos / pagos-abonos / deuda-consumo, no ingresos / salidas como semantica principal.
- [ ] Para cuentas transaccionales, la UX actual se preserva y no pierde datos.
- [ ] El payload de detalle queda compatible con `TASK-705` y documenta cualquier campo nuevo que el read model debe preservar.
- [ ] No se agregan nuevos permisos, routeGroups, views ni capabilities.
- [ ] La documentacion funcional de Finance queda actualizada.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Test unitario focalizado para el resolver semantico.
- Validacion manual en `/finance/bank` abriendo:
  - una cuenta bancaria/fintech
  - `Santander Corp.` u otra tarjeta `credit_card`
- Si hay preview/staging disponible: smoke visual con usuario `finance_admin` o `efeonce_admin`.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `docs/documentation/finance/modulos-caja-cobros-pagos.md` documenta la semantica final por instrumento
- [ ] Si se modifico el contrato de `/api/finance/bank/[accountId]`, `TASK-705` queda referenciada o ajustada para no perder campos en el read-model cutover

## Follow-ups

- Perfil `shareholder_account` para CCA con "empresa debe / accionista debe / reembolsos".
- Perfil `payroll_processor` para Previred coordinado con `TASK-706`.
- Perfil `loan_account` cuando el scaffold de prestamos deje de ser solo referencia.
- Exponer `bank_holds_amount` / autorizaciones pendientes si el snapshot bancario lo entrega de forma confiable.

## Open Questions

- Para TC, el chart V1 debe priorizar `cargos vs pagos` o `deuda/consumo historico`?
- El resolver debe vivir como config compartida de instrumentos o como presenter route-local hasta que haya mas consumers?
- Conviene mover `creditCards[]` del overview a un subcontrato reusable del detail o solo extender `TreasuryBankAccountDetail` en este slice?
