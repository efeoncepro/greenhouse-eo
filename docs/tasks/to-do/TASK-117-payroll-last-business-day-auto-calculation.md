# TASK-117 - Payroll Last Business Day Auto-Calculation

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `hr`

## Summary

Formalizar la regla operativa para que Greenhouse deje la nómina oficial del mes en `calculated` el último día hábil del mes operativo, usando la utilidad canónica de calendario y sin alterar el lifecycle transaccional base de Payroll.

## Why This Task Exists

Hoy Payroll ya tiene:

- lifecycle oficial `draft -> calculated -> approved -> exported`
- utilidad de calendario operativo con timezone `America/Santiago`, días hábiles y feriados
- readiness canónico para aprobar
- separación clara entre `Projected Payroll` y `Payroll official`

Lo que falta es una capa operativa explícita para el hito mensual:

- la utility actual no expone un helper directo de `último día hábil del mes`
- no existe una policy implementada de auto-cálculo del período al cierre operativo
- no está separado el concepto de `calculation readiness` del readiness de aprobación
- `/hr/payroll` no muestra todavía deadline, cumplimiento o bloqueo del auto-cálculo

La necesidad no es cerrar la nómina automáticamente ese día, sino asegurar que el período oficial quede al menos en `calculated`, dejando `approved` y `exported` como pasos posteriores de revisión y cierre.

## Goal

- Formalizar la policy de cálculo automático de Payroll para el último día hábil del mes operativo.
- Reutilizar el lifecycle oficial actual sin introducir estados transaccionales nuevos en una primera iteración.
- Separar `calculation readiness` de `approval readiness`.
- Dejar preparado un job idempotente que cree/calcule el período oficial del mes y exponga cumplimiento operativo en Payroll.
- Notificar a Julio Reyes y Humberly Henríquez, vía sistema de notificaciones existente, cuando el período quede `calculated`.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`

Reglas obligatorias:

- no cambiar el cierre canónico: `exported` sigue siendo el lock final y el evento downstream oficial
- `approved` sigue siendo la aprobación humana previa al cierre, no un auto-cierre temporal
- la semántica temporal debe vivir en la utilidad canónica de calendario, no embebida en UI o en helpers ad hoc
- la automatización debe reutilizar el path oficial de cálculo de Payroll, no duplicar el motor
- `Projected Payroll` no reemplaza el período oficial; solo anticipa y acompaña la operación
- la notificación de `period calculated` debe salir por `NotificationService` y `sendEmail()`, idealmente como consumer reactivo de `payroll_period.calculated`, no como envío ad hoc desde el route

## Dependencies & Impact

### Depends on

- `TASK-087` - Payroll Lifecycle Invariants and Readiness Hardening
- `TASK-091` - Greenhouse Operational Calendar Utility
- `TASK-092` - Payroll Operational Current Period Semantics
- `TASK-109` - Projected Payroll Runtime Hardening and Observability

### Impacts to

- `HR > Nómina`
- `Projected Payroll` como surface auxiliar del mismo ciclo operativo
- cron/job mensual de Payroll
- `payroll_period.calculated` como checkpoint operativo mensual
- visibilidad operativa del cumplimiento del cálculo del período
- notificaciones internas de Payroll para stakeholders operativos

### Files owned

- `src/lib/calendar/operational-calendar.ts`
- `src/lib/calendar/operational-calendar.test.ts`
- `src/lib/payroll/current-payroll-period.ts`
- `src/lib/payroll/payroll-readiness.ts`
- `src/lib/payroll/calculate-payroll.ts`
- `src/lib/payroll/postgres-store.ts`
- `src/app/api/hr/payroll/periods/[periodId]/calculate/route.ts`
- `src/app/api/hr/payroll/periods/route.ts`
- `src/lib/sync/projections/notifications.ts`
- `src/lib/notifications/notification-service.ts`
- `src/config/notification-categories.ts`
- `src/views/greenhouse/payroll/PayrollDashboard.tsx`
- `src/views/greenhouse/payroll/PayrollPeriodTab.tsx`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EMAIL_CATALOG_V1.md`

## Current Repo State

### Ya existe

- Utility canónica de calendario operativo en `src/lib/calendar/operational-calendar.ts`
- feriados desde `Nager.Date` en `src/lib/calendar/nager-date-holidays.ts`
- helper `getOperationalPayrollMonth()` para semántica de período actual
- lifecycle oficial `draft -> calculated -> approved -> exported`
- mutaciones canónicas Postgres-first para `calculated`, `approved` y `exported`
- readiness canónico para aprobación en `src/lib/payroll/payroll-readiness.ts`

### Gap actual

- no existe helper explícito de `último día hábil del mes`
- no existe `calculation readiness` separado del readiness de aprobación
- no existe job idempotente para cálculo automático mensual
- no existe surface operativa clara para deadline, cumplimiento o bloqueo del cálculo
- no está decidido si el período mensual debe crearse automáticamente cuando falta
- no existe consumer de notificaciones para `payroll_period.calculated` hacia stakeholders internos de Payroll

## Scope

### Slice 1 - Calendar deadline semantics

- agregar helper canónico para `último día hábil del mes`
- definir si la policy usa `isLastBusinessDayOfMonth()` y/o `getLastBusinessDayOfMonth()`
- cubrir timezone `America/Santiago`, feriados `CL` y overrides locales existentes

### Slice 2 - Calculation readiness

- separar `calculation readiness` de `approval readiness`
- definir blockers mínimos de auto-cálculo:
  - período inexistente
  - compensaciones faltantes para todos
  - `UF`/`UTM`/tax table faltantes cuando apliquen
- dejar KPI/attendance faltante como warning inicial salvo decisión contraria documentada

### Slice 3 - Auto-calculation job

- diseñar job/crón idempotente para el último día hábil
- permitir auto-crear el período si aún no existe
- reutilizar el path oficial de cálculo y publicar el evento canónico `payroll_period.calculated`
- registrar si el período quedó `calculated`, `blocked` o ya estaba resuelto

### Slice 4 - Payroll operational visibility

- exponer en `/hr/payroll` semántica operativa derivada:
  - `calculation deadline`
  - `is due`
  - `calculated on time`
  - `calculation blocked`
  - warnings y blockers relevantes
- decidir si esto vive como helper derivado o read model persistido

### Slice 5 - Notification dispatch for calculated periods

- agregar consumer reactivo para `payroll_period.calculated` en el dominio `notifications`
- despachar por `NotificationService.dispatch()` con categoría dedicada de Payroll Ops
- recipients iniciales: Julio Reyes y Humberly Henríquez
- usar `in_app` + `email` vía la capa centralizada existente, con link a `/hr/payroll`
- dejar desde día 1 un resolver explícito de recipients de Payroll Ops, aunque la implementación inicial apunte a Julio Reyes y Humberly Henríquez
- el bootstrap puede usar personas concretas, pero el contrato del consumer debe permitir migrar luego a resolución por rol o suscripción sin tocar el evento ni el dispatch

## Out of Scope

- cambiar `PeriodStatus` en esta primera iteración
- auto-aprobar o auto-exportar períodos
- redefinir `Projected Payroll` como source of truth
- rediseño visual grande de `PayrollDashboard`
- cambios de fórmula legal de cálculo Chile o internacional
- refactor transversal del cron framework del repo
- rediseñar completo el catálogo de categorías de notificación del portal

## Acceptance Criteria

- [ ] existe una policy documentada que define que el período del mes debe quedar en `calculated` el último día hábil del mes operativo
- [ ] la utilidad de calendario expone helper explícito de `último día hábil del mes`
- [ ] `calculation readiness` queda separado conceptualmente del readiness de aprobación
- [ ] existe diseño implementable de job/crón idempotente para auto-cálculo mensual
- [ ] está definido si el período mensual se crea automáticamente cuando falta
- [ ] `/hr/payroll` tiene contrato claro para mostrar deadline/cumplimiento/bloqueo del cálculo
- [ ] existe diseño implementable para notificar a Julio Reyes y Humberly Henríquez cuando el período quede `calculated`, reutilizando `NotificationService` y la capa centralizada de email
- [ ] el diseño deja explícito que la resolución de recipients de Payroll Ops nace preparada para migrar a rol/suscripción sin rehacer el flujo
- [ ] la arquitectura de Payroll queda alineada a esta semántica sin romper `approved` ni `exported`

## Open Questions

- **Idempotencia de la notificación:** si el período se recalcula varias veces el mismo día, ¿la notificación a Payroll Ops sale solo la primera vez que entra a `calculated` o también en recálculos posteriores?
- **Origen del cálculo:** el diseño debería distinguir en metadata si el `calculated` vino de auto-cálculo mensual o de una acción manual desde UI/API.
- **Severidad del mensaje:** si el período queda `calculated` con warnings no bloqueantes, ¿el copy debe decir "calculada con observaciones" en vez de "lista para revisión"?
- **Payload de la notificación:** además del período, conviene incluir headcount, link a `/hr/payroll`, warnings/blockers resumidos y estado `onTime`.
- **Resolver de recipients:** definir helper explícito tipo `resolvePayrollOpsRecipients()` con bootstrap Julio/Humberly, fallback seguro y contrato preparado para migrar a rol/suscripción.
- **Categoría dedicada:** validar que la notificación salga bajo una categoría nueva tipo `payroll_ops`, en vez de reutilizar categorías genéricas.
- **Retry y deduplicación:** si el consumer reactivo falla y reintenta, debe evitar reenviar duplicados cuando ya se haya despachado la notificación del mismo período/hito.
- **Relación con `payroll_period.approved`:** esta task cubre el aviso de `calculated`, pero conviene decidir desde ahora si `approved` tendrá una notificación distinta para revisión final/exportación.

## UI Considerations

La UI no debería mostrar solo el `status` técnico del período. Esta task debería dejar una capa operativa legible para que el equipo entienda el hito mensual sin leer logs ni depender del correo.

### Principios

- separar visualmente `cálculo del período` de `aprobación/cierre`
- hacer visible el `deadline` del cálculo del mes
- distinguir `calculated` de `calculated on time`
- comunicar con claridad si el cálculo quedó `bloqueado`, `pendiente` o `calculado con observaciones`
- no depender solo de notificaciones externas; `/hr/payroll` debe explicar por sí mismo el estado operativo

### Surface recomendada en `PayrollPeriodTab`

- agregar un resumen operativo arriba del bloque actual del período con:
  - `deadline de cálculo`
  - `estado operativo`
  - `origen del cálculo` (`automático` o `manual`)
  - `cumplimiento` (`en fecha` o `fuera de fecha`)
- si existen blockers de cálculo, mostrarlos por encima de warnings y del resto de la tabla
- si el período fue calculado con warnings no bloqueantes, comunicarlo explícitamente como `Calculada con observaciones`

### Surface recomendada en `PayrollDashboard`

- agregar una card/KPI específica para `Cálculo del período`
- estados visuales sugeridos:
  - verde: `Calculada`
  - ámbar: `Pendiente hoy`
  - rojo: `Bloqueada` o `Fuera de fecha`
- la card debería enlazar o anclar al período activo

### Historial y trazabilidad

- distinguir en historial:
  - `Calculada`
  - `Aprobada en cierre`
  - `Exportada`
- evaluar badge secundario para `Automática` en el primer cálculo del período
- mostrar `calculatedAt` y, si aplica, metadata mínima para entender si el cálculo vino del job mensual o de una acción manual posterior

### CTA y UX operativa

- si el período no está calculado y ya está en fecha, CTA principal: `Calcular`
- si el sistema lo dejó bloqueado, CTA principal o secundario: `Ver blockers`
- evitar microcopy técnico tipo `job`, `cron` o `consumer`; usar copy operativo del tipo:
  - `Calculada automáticamente el último día hábil`
  - `Bloqueada por datos faltantes`
  - `Pendiente de aprobación`

## Verification

- `pnpm exec vitest run src/lib/calendar/operational-calendar.test.ts src/lib/payroll/payroll-readiness.test.ts`
- `pnpm exec eslint src/lib/calendar/operational-calendar.ts src/lib/payroll/current-payroll-period.ts src/lib/payroll/payroll-readiness.ts`
- validación manual de la policy contra al menos un mes con feriados y un mes sin feriados
- revisión de arquitectura en `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
