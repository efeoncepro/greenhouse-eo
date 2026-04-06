# TASK-271 — Soporte de permisos de medio dia (periodos parciales)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Complete`
- Rank: `TBD`
- Domain: `hr`, `leave`, `ui`
- Blocked by: `none`
- Branch: `task/TASK-271-hr-leave-half-day-periods`
- Legacy ID: —
- GitHub Issue: —

## Summary

El formulario de solicitud de permisos solo permite pedir dias completos. Los colaboradores que necesitan medio dia deben pedir el dia completo o gestionar fuera del portal. Esta task agrega `start_period` y `end_period` (`full_day`, `morning`, `afternoon`) a `leave_requests` para soportar solicitudes de medio dia, con calculo automatico de dias habiles fraccionarios (0.5) y visualizacion en calendario.

## Why This Task Exists

El portal no soporta granularidad inferior a un dia en permisos. Esto genera friction operativo: un colaborador que necesita la manana libre debe solicitar el dia completo, desperdiciando medio dia de su saldo. Ademas, las politicas de anticipacion minima ya soportan fracciones (`min_advance_days` es NUMERIC(10,2) desde la migracion `20260406203606070`), pero el request no las aprovecha.

## Goal

- Un colaborador puede solicitar medio dia (manana o tarde) desde el formulario de permisos
- Un colaborador puede solicitar un rango donde el primer y/o ultimo dia son medio dia
- Los dias habiles se calculan correctamente incluyendo fracciones (ej: 2.5 dias)
- Los saldos se descuentan correctamente con precision 0.5
- El calendario muestra visualmente los bloques de medio dia
- Backward compatible: solicitudes existentes no se rompen (default `full_day`)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` — contrato HR
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` — arquitectura general

Reglas obligatorias:

- Migracion DDL via `pnpm migrate:create`, nunca editar timestamps
- Columnas nuevas deben ser nullable o tener DEFAULT para backward compatibility
- `computeLeaveDayBreakdown()` es la funcion canonica de calculo de dias — no crear alternativa
- Payroll ya usa `requested_days` como NUMERIC — no cambiar contrato

## Normative Docs

- `scripts/setup-postgres-hr-leave.sql` — DDL canonica de `leave_requests` y `leave_policies`
- `src/lib/hr-core/leave-domain.ts` — dominio de permisos: tipos, interfaces, calculo de dias
- `src/lib/hr-core/postgres-leave-store.ts` — store PostgreSQL completo del modulo leave

## Dependencies & Impact

### Depends on

- `greenhouse_hr.leave_requests` — tabla existente, agregar columnas
- `src/lib/hr-core/leave-domain.ts` — `computeLeaveDayBreakdown()` existente
- `src/components/greenhouse/LeaveRequestDialog.tsx` — formulario existente
- `src/app/api/hr/core/leave/requests/route.ts` — endpoint POST existente
- `src/app/api/hr/core/leave/calendar/route.ts` — endpoint calendario existente

### Blocks / Impacts

- Payroll: consume `requested_days` de `leave_requests` — ya es NUMERIC(10,2), sin cambio
- `leave_balances`: `reserved_days` y `used_days` ya son NUMERIC(10,2) — soportan 0.5 sin cambio
- Email templates de leave: reportan dias como numero — 0.5 se muestra bien sin cambio
- Vista "Mis Permisos" (`/my/leave`) y vista admin de permisos

### Files owned

- `migrations/YYYYMMDD_add-leave-request-periods.sql` — migracion (NUEVO)
- `src/lib/hr-core/leave-domain.ts` — modificar `computeLeaveDayBreakdown()` + tipos
- `src/lib/hr-core/postgres-leave-store.ts` — modificar create/read para nuevos campos
- `src/app/api/hr/core/leave/requests/route.ts` — recibir `startPeriod`, `endPeriod`
- `src/app/api/hr/core/leave/calendar/route.ts` — exponer periodos en eventos
- `src/components/greenhouse/LeaveRequestDialog.tsx` — agregar selector de periodo
- `src/components/greenhouse/GreenhouseCalendar.tsx` — renderizar medio dia (visual)
- `src/types/hr-core.ts` — extender `CreateLeaveRequestInput` y tipos relacionados
- `scripts/setup-postgres-hr-leave.sql` — actualizar DDL base

## Current Repo State

### Already exists

- `greenhouse_hr.leave_requests` con `start_date`, `end_date`, `requested_days` NUMERIC(10,2) — `scripts/setup-postgres-hr-leave.sql:59-77`
- `computeLeaveDayBreakdown()` que calcula dias habiles excluyendo fines de semana y feriados — `src/lib/hr-core/leave-domain.ts`
- `LeaveRequestDialog.tsx` con campos: tipo, desde, hasta, motivo, adjunto, notas — `src/components/greenhouse/LeaveRequestDialog.tsx`
- POST `/api/hr/core/leave/requests` que valida, calcula dias, y deduce saldos — `src/app/api/hr/core/leave/requests/route.ts`
- `GreenhouseCalendar.tsx` con FullCalendar (dayGrid, list, timeGrid) — `src/components/greenhouse/GreenhouseCalendar.tsx`
- `leave_balances` con columnas NUMERIC(10,2) — soporta 0.5 nativamente
- `leave_policies.min_advance_days` ya migrado a NUMERIC(10,2) — `migrations/20260406203606070_alter-min-advance-days-to-numeric.sql`

### Gap

- No existen columnas `start_period` ni `end_period` en `leave_requests`
- `computeLeaveDayBreakdown()` no recibe ni procesa periodos parciales
- `LeaveRequestDialog.tsx` no tiene selector de periodo (manana/tarde/dia completo)
- `CreateLeaveRequestInput` no incluye campos de periodo
- El calendario no distingue visualmente entre dia completo y medio dia

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Migracion DDL + tipos

- Crear migracion via `pnpm migrate:create add-leave-request-periods`
- Agregar `start_period TEXT NOT NULL DEFAULT 'full_day'` y `end_period TEXT NOT NULL DEFAULT 'full_day'` a `leave_requests`
- CHECK constraint: `start_period IN ('full_day', 'morning', 'afternoon')`, idem `end_period`
- Actualizar DDL base en `scripts/setup-postgres-hr-leave.sql`
- Agregar tipo `LeaveDayPeriod = 'full_day' | 'morning' | 'afternoon'` en `leave-domain.ts`
- Extender `CreateLeaveRequestInput` con `startPeriod?` y `endPeriod?` opcionales (default `full_day`)
- `pnpm migrate:up` + regenerar tipos

### Slice 2 — Calculo de dias con periodos parciales

- Extender firma de `computeLeaveDayBreakdown()` con `startPeriod?` y `endPeriod?` opcionales
- Logica: si `startPeriod === 'afternoon'` → primer dia habil cuenta 0.5; si `endPeriod === 'morning'` → ultimo dia habil cuenta 0.5
- Dia unico (`startDate === endDate`): `morning` = 0.5, `afternoon` = 0.5, `full_day` = 1.0
- Validar combinaciones invalidas: dia unico con `startPeriod = afternoon` + `endPeriod = morning` (= 0 dias) → rechazar
- `daysByYear` debe reflejar las fracciones correctamente para deduccion de saldos cross-year

### Slice 3 — API endpoint actualizado

- POST `/api/hr/core/leave/requests`: recibir `startPeriod` y `endPeriod`, defaultear a `full_day`
- Pasar periodos a `computeLeaveDayBreakdown()`
- Insertar periodos en `leave_requests`
- GET de requests: incluir `startPeriod` y `endPeriod` en la respuesta
- Validar: `startPeriod = 'morning'` solo valido si no hay rango (dia unico) o es el primer dia de un rango; `endPeriod = 'afternoon'` solo valido si dia unico

### Slice 4 — UI del formulario

- Si `startDate === endDate` (dia unico): mostrar selector con 3 opciones: "Dia completo", "Solo manana", "Solo tarde"
- Si `startDate !== endDate` (rango): mostrar selector en primer dia ("Dia completo" o "Desde la tarde") y selector en ultimo dia ("Dia completo" o "Solo la manana")
- El selector se oculta si no hay fechas seleccionadas
- Preview de dias habiles debe reflejar el periodo seleccionado

### Slice 5 — Calendario con medio dia

- Eventos de medio dia se renderizan visualmente mas cortos o con indicador visual (badge "AM" / "PM")
- GET `/api/hr/core/leave/calendar` expone `startPeriod` y `endPeriod` en `extendedProps`
- Si un evento es medio dia, el titulo incluye indicador: "Juan Perez · Vacaciones (AM)" o "(PM)"

## Out of Scope

- Permisos por hora (solo medio dia, no fracciones arbitrarias)
- Cambiar la UI de aprobacion — el supervisor ve los mismos campos, sin cambio en flujo
- Modificar politicas de leave para diferenciar reglas por medio dia vs dia completo
- Ajustar payroll — ya consume `requested_days` como NUMERIC, sin cambio necesario
- Migrar solicitudes historicas — quedan como `full_day` (default)
- Bulk requests de medio dia

## Detailed Spec

### Reglas de negocio de periodos

| Escenario | `start_period` | `end_period` | Dias resultantes |
|-----------|---------------|-------------|-----------------|
| Dia unico, completo | `full_day` | `full_day` | 1.0 |
| Dia unico, manana | `morning` | `morning` | 0.5 |
| Dia unico, tarde | `afternoon` | `afternoon` | 0.5 |
| Rango, ambos completos | `full_day` | `full_day` | N dias habiles |
| Rango, primer dia tarde | `afternoon` | `full_day` | N - 0.5 dias habiles |
| Rango, ultimo dia manana | `full_day` | `morning` | N - 0.5 dias habiles |
| Rango, ambos parciales | `afternoon` | `morning` | N - 1.0 dias habiles |

**Dia unico**: cuando `startDate === endDate`, el periodo aplica al unico dia. `start_period` y `end_period` deben coincidir (enforcement en API).

**Combinacion invalida**: dia unico con `start_period = afternoon` + `end_period = morning` → 0 dias → rechazar con 400.

### Schema DDL

```sql
ALTER TABLE greenhouse_hr.leave_requests
  ADD COLUMN start_period TEXT NOT NULL DEFAULT 'full_day',
  ADD COLUMN end_period TEXT NOT NULL DEFAULT 'full_day';

ALTER TABLE greenhouse_hr.leave_requests
  ADD CONSTRAINT leave_requests_start_period_check
    CHECK (start_period IN ('full_day', 'morning', 'afternoon'));

ALTER TABLE greenhouse_hr.leave_requests
  ADD CONSTRAINT leave_requests_end_period_check
    CHECK (end_period IN ('full_day', 'morning', 'afternoon'));
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un colaborador puede solicitar medio dia (manana o tarde) para un dia especifico
- [ ] Un colaborador puede solicitar un rango donde el primer dia empieza en la tarde
- [ ] Un colaborador puede solicitar un rango donde el ultimo dia termina en la manana
- [ ] `computeLeaveDayBreakdown()` retorna 0.5 para un dia parcial
- [ ] El saldo se descuenta correctamente con 0.5 dias
- [ ] Solicitudes existentes (sin periodo) siguen funcionando como dia completo
- [ ] El calendario muestra indicador visual AM/PM para permisos de medio dia
- [ ] El formulario muestra selector de periodo solo cuando hay fechas seleccionadas
- [ ] Combinacion invalida (dia unico afternoon + morning = 0 dias) es rechazada con error
- [ ] `pnpm build`, `pnpm lint` pasan sin errores

## Verification

- `pnpm build`
- `pnpm lint`
- `npx tsc --noEmit`
- Verificacion manual: crear solicitud de medio dia, verificar calculo y saldo
- Verificacion manual: crear solicitud de rango con primer dia parcial, verificar calculo
- Verificacion visual: calendario muestra AM/PM en eventos de medio dia

## Closing Protocol

- [ ] Actualizar `docs/documentation/` si existe documentacion funcional del modulo de permisos
- [ ] Verificar que payroll no se ve afectado (consume `requested_days` sin cambio)

## Follow-ups

- Permisos por hora (granularidad sub-dia mas fina)
- Reportes de utilizacion que distingan medio dia vs dia completo
- Vista admin con filtro por tipo de periodo

## Open Questions

- El selector de periodo en dia unico: usar radio buttons inline ("Dia completo / Manana / Tarde") o un dropdown? Decidir durante implementacion segun espacio disponible en el form.
