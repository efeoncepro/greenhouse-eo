# TASK-410 — Payroll Period Reopen Foundation & Entry Versioning

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `task/TASK-410-payroll-period-reopen-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Introduce el estado `reopened` en el state machine de Payroll, el versionado inmutable de `payroll_entries` (`version`, `is_active`, `superseded_by`), la tabla `payroll_period_reopen_audit`, y el endpoint admin `POST /api/hr/payroll/periods/[periodId]/reopen` con lock, TX atómica y emisión del evento outbox canónico `payroll_entry.reliquidated`. Es la foundation de [TASK-409](./TASK-409-payroll-reliquidation-program.md) — desbloquea al consumer de Finance (TASK-411) y a la UI (TASK-412).

## Why This Task Exists

Hoy `exported` es terminal ([src/lib/payroll/period-lifecycle.ts:3-5](../../../src/lib/payroll/period-lifecycle.ts#L3-L5)) y `payroll_entries` tiene una sola fila por `(period_id, member_id)`. Sin foundation, no existe forma de representar una versión reliquidada ni de emitir un evento que el consumer de Finance pueda deduplicar. Esta task materializa el contrato de datos y la transición de estado que todas las piezas posteriores asumen.

## Goal

- Nuevo estado `reopened` con transiciones seguras (`exported → reopened → calculated → approved → exported`)
- `payroll_entries` versionado: la entry original queda inmutable, la reliquidación crea `version=2`
- Tabla `payroll_period_reopen_audit` con trazabilidad completa: quién, cuándo, motivo, delta esperado
- Endpoint admin con validaciones: rol, motivo, ventana temporal (mes operativo vigente), lock contra export en curso, bloqueo por Previred declarado
- Evento outbox `payroll_entry.reliquidated` publicado con el contrato definido en TASK-409 (sección Detailed Spec)
- Todo dentro de una transacción atómica — si falla cualquier paso, rollback completo

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- [docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md) — sección state machine y payroll entries
- [docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md](../../architecture/GREENHOUSE_EVENT_CATALOG_V1.md)
- [docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md](../../architecture/GREENHOUSE_DATABASE_TOOLING_V1.md) — migraciones con `node-pg-migrate`
- [docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md](../../architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md) — ownership `greenhouse_ops`
- [docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md](../../architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md)

Reglas obligatorias:

- Migración SQL-first via `pnpm migrate:create` (nunca renombrar timestamps manualmente)
- Columnas nuevas nullable primero, constraints después
- Ownership `greenhouse_ops` en todos los objetos nuevos
- Regenerar tipos con `pnpm db:generate-types` después de la migración
- El endpoint de reopen debe usar `withTransaction` de [src/lib/db.ts](../../../src/lib/db.ts) — jamás crear Pool aislado
- Autorización: rol `efeonce_admin` (verificar contra `getServerSession` + tenant access)
- El emit del evento outbox ocurre DENTRO de la misma TX que el insert de la nueva versión y el insert en audit

## Normative Docs

- [CLAUDE.md](../../../CLAUDE.md) — sección "Database Migrations" y "Database Connection"
- [TASK-409](./TASK-409-payroll-reliquidation-program.md) — contrato del evento outbox

## Dependencies & Impact

### Depends on

- [src/lib/payroll/period-lifecycle.ts](../../../src/lib/payroll/period-lifecycle.ts) — state machine actual
- [src/types/payroll.ts](../../../src/types/payroll.ts) — tipo `PeriodStatus`
- [src/lib/sync/event-catalog.ts](../../../src/lib/sync/event-catalog.ts) — catálogo de eventos
- [src/lib/calendar/operational-calendar.ts](../../../src/lib/calendar/operational-calendar.ts) — ventana temporal
- Tabla `greenhouse_payroll.payroll_entries` [verificar schema real durante Discovery]
- Tabla `greenhouse_payroll.payroll_periods` [verificar]
- [src/lib/postgres/client.ts](../../../src/lib/postgres/client.ts) — conexión centralizada

### Blocks / Impacts

- **Blocks:** TASK-411 (Finance Delta Consumer) — necesita el evento publicado
- **Blocks:** TASK-412 (Admin UI) — necesita el endpoint
- **Impacts:** `greenhouse_payroll.payroll_entries` — schema change crítico; todas las queries que hacen `SELECT ... WHERE period_id = ? AND member_id = ?` deben filtrar por `is_active = true` o el agente DEBE actualizar esas queries en este PR para evitar double-count

### Files owned

- `migrations/<timestamp>_payroll-reliquidation-foundation.sql` (nuevo)
- [src/types/payroll.ts](../../../src/types/payroll.ts) (modificar — agregar `reopened` al tipo)
- [src/lib/payroll/period-lifecycle.ts](../../../src/lib/payroll/period-lifecycle.ts) (modificar — transiciones del nuevo estado)
- `src/lib/payroll/reopen-period.ts` (nuevo — lógica transaccional)
- `src/lib/payroll/reopen-guards.ts` (nuevo — ventana, Previred, lock)
- `src/app/api/hr/payroll/periods/[periodId]/reopen/route.ts` (nuevo)
- [src/lib/sync/event-catalog.ts](../../../src/lib/sync/event-catalog.ts) (modificar — registrar `payroll_entry.reliquidated`)
- [src/types/db.d.ts](../../../src/types/db.d.ts) (regenerado)
- `src/lib/payroll/reopen-period.test.ts` (nuevo)
- `src/lib/payroll/reopen-guards.test.ts` (nuevo)

## Current Repo State

### Already exists

- State machine con 4 estados, `exported` terminal: [src/lib/payroll/period-lifecycle.ts](../../../src/lib/payroll/period-lifecycle.ts)
- Helpers `canSetPayrollPeriodCalculated`, `canSetPayrollPeriodApproved`, `canSetPayrollPeriodExported`, `canEditPayrollEntries`
- Eventos outbox payroll: [src/lib/sync/event-catalog.ts:219-224](../../../src/lib/sync/event-catalog.ts#L219-L224)
- Endpoint base de períodos: [src/app/api/hr/payroll/periods/\[periodId\]/route.ts](../../../src/app/api/hr/payroll/periods/[periodId]/route.ts)
- Conexión centralizada `withTransaction` en [src/lib/db.ts](../../../src/lib/db.ts)
- Calendario operativo: [src/lib/calendar/operational-calendar.ts](../../../src/lib/calendar/operational-calendar.ts)

### Gap

- `PeriodStatus` no incluye `reopened`
- `payroll_entries` sin `version`, `is_active`, `superseded_by`, `reopen_audit_id`
- No existe tabla `payroll_period_reopen_audit`
- No existe endpoint `/reopen`
- No existe helper `canReopenPayrollPeriod` ni lógica de guardas (ventana/Previred/lock)
- Evento `payroll_entry.reliquidated` no existe en el catálogo
- No hay query util que resuelva "la versión activa" de una entry

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Migración SQL & tipos

- Generar migración con `pnpm migrate:create payroll-reliquidation-foundation`
- Agregar `'reopened'` al enum o check de `payroll_periods.status` (verificar implementación real del estado: enum PG vs check constraint)
- `ALTER TABLE greenhouse_payroll.payroll_entries` agregar:
  - `version smallint NOT NULL DEFAULT 1`
  - `is_active boolean NOT NULL DEFAULT true`
  - `superseded_by uuid NULL REFERENCES greenhouse_payroll.payroll_entries(entry_id)`
  - `reopen_audit_id uuid NULL` (FK definida al final)
- Unique constraint: una sola versión activa por `(period_id, member_id)` — `CREATE UNIQUE INDEX ... WHERE is_active`
- Crear tabla `greenhouse_payroll.payroll_period_reopen_audit`:
  - `audit_id uuid PK`
  - `period_id uuid FK`
  - `reopened_by_user_id text NOT NULL`
  - `reopened_at timestamptz NOT NULL DEFAULT now()`
  - `reason text NOT NULL CHECK (reason IN ('error_calculo', 'bono_retroactivo', 'correccion_contractual', 'otro'))`
  - `reason_detail text NULL`
  - `previred_declared_check boolean NOT NULL` (snapshot del estado al momento del reopen)
  - `operational_month date NOT NULL`
  - `locked_at timestamptz NULL` (para lock pesimista)
- FK `payroll_entries.reopen_audit_id → payroll_period_reopen_audit.audit_id`
- Ownership: `ALTER TABLE ... OWNER TO greenhouse_ops`
- Ejecutar `pnpm migrate:up` + `pnpm db:generate-types` → commit de `src/types/db.d.ts`

### Slice 2 — State machine & helpers

- Agregar `'reopened'` a `PeriodStatus` en [src/types/payroll.ts](../../../src/types/payroll.ts)
- En [src/lib/payroll/period-lifecycle.ts](../../../src/lib/payroll/period-lifecycle.ts):
  - Nuevo helper `canReopenPayrollPeriod(status: PeriodStatus): boolean` → retorna `true` solo si `status === 'exported'`
  - Actualizar `canSetPayrollPeriodCalculated` para aceptar `reopened` como transición válida
  - Actualizar `canEditPayrollEntries` para permitir edición cuando status es `reopened` o `calculated`
  - Actualizar `isPayrollPeriodFinalized` para que `reopened` NO cuente como finalizado
  - Nuevo helper `getActiveEntryVersion(entries): PayrollEntry` — util para queries
- Tests unitarios para cada helper nuevo y modificado

### Slice 3 — Guardas de reopen

- Crear `src/lib/payroll/reopen-guards.ts` con:
  - `assertReopenWindow(periodYear, periodMonth): void` — compara contra `operational-calendar.ts`; throw si el período no es el mes operativo vigente
  - `assertNoExportInProgress(periodId, tx): Promise<void>` — `SELECT ... FOR UPDATE` sobre el período; throw si hay lock concurrente
  - `assertPreviredNotDeclared(periodId, tx): Promise<void>` — verifica si existe snapshot en `payroll_previsional_snapshot` con status declarado [verificar nombre real del campo durante Discovery]; throw si sí
  - `assertAdminRole(session): void` — valida que el usuario tenga rol `efeonce_admin`
- Cada guard con test unitario y mensaje de error accionable para el usuario final

### Slice 4 — Lógica transaccional de reopen

- Crear `src/lib/payroll/reopen-period.ts` con función `reopenPayrollPeriod(params)`:
  ```typescript
  interface ReopenPayrollPeriodParams {
    periodId: string
    reason: 'error_calculo' | 'bono_retroactivo' | 'correccion_contractual' | 'otro'
    reasonDetail: string | null
    actorUserId: string
  }
  ```
- Todo el cuerpo envuelto en `withTransaction` de [src/lib/db.ts](../../../src/lib/db.ts):
  1. Ejecutar las 4 guardas (window, no export, no previred, admin — admin ya validado en route, pero doble-check)
  2. Lock pesimista `SELECT ... FOR UPDATE` sobre `payroll_periods`
  3. Actualizar `payroll_periods.status = 'reopened'`
  4. Insert en `payroll_period_reopen_audit` → capturar `audit_id`
  5. Commit de la TX (las nuevas versiones de entries se crearán cuando el usuario edite y vuelva a calcular — NO en este paso)
- Nota: el flujo de reopen NO crea inmediatamente la versión 2. La versión 2 se materializa cuando el operador edita la entry y el cálculo produce un resultado distinto. Esto mantiene el principio de "versiones solo cuando hay cambios reales".
- Nueva función `supersedeEntryOnRecalculate(entryId, newValues, auditId, tx)`:
  - Se llama desde el flujo existente de recalculate cuando `period.status === 'reopened'`
  - Marca la versión actual `is_active = false`, `superseded_by = <nueva entry_id>`
  - Inserta la nueva versión con `version = prev.version + 1`, `is_active = true`, `reopen_audit_id = auditId`
  - Emite el evento outbox `payroll_entry.reliquidated` con el payload completo definido en TASK-409
- Tests: delta positivo, delta negativo, delta cero (debe emitir evento igualmente para trazabilidad o skip — decidir en Discovery)

### Slice 5 — Endpoint API

- Crear `src/app/api/hr/payroll/periods/[periodId]/reopen/route.ts`:
  - `POST` handler
  - Body schema (zod):
    ```typescript
    { reason: 'error_calculo' | 'bono_retroactivo' | 'correccion_contractual' | 'otro', reasonDetail?: string }
    ```
  - Auth: `getServerSession` + check rol `efeonce_admin`
  - Llama `reopenPayrollPeriod(params)`
  - Errores 400 con mensaje específico por cada guard que falla
  - Response: `{ auditId, periodStatus: 'reopened', operationalMonth }`
- Integration test con DB real (misma estrategia que otros endpoints del módulo)

### Slice 6 — Registro del evento outbox

- Agregar `payrollEntryReliquidated: 'payroll_entry.reliquidated'` a `EVENT_TYPES` en [src/lib/sync/event-catalog.ts](../../../src/lib/sync/event-catalog.ts)
- Incluirlo en el array de eventos publicables del payroll (línea ~388 del catálogo)
- Publicar el contrato del payload en [docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md](../../architecture/GREENHOUSE_EVENT_CATALOG_V1.md) — sección payroll
- Test en `event-catalog.test.ts` validando que el evento existe y tiene el shape correcto

## Out of Scope

- **Consumer de Finance** → TASK-411
- **UI de reopen, preview, audit view** → TASK-412
- **Rectificatoria Previred** — esta task solo bloquea; no automatiza
- **Nota de crédito Nubox** — esta task solo bloquea; no automatiza
- **Recompute de cost attribution / client_economics** → TASK-411 (consumer)
- **Reenvío de email liquidación v2** → TASK-412
- **Reliquidaciones múltiples (v3+)** — el modelo soporta versiones arbitrarias pero la guarda V1 exige que `version <= 2` al crear la superseding entry

## Detailed Spec

### Contrato del evento outbox

Definido en [TASK-409](./TASK-409-payroll-reliquidation-program.md) sección Detailed Spec. Copiar tal cual sin modificar.

### Flujo end-to-end (referencia)

```
1. Operador hace POST /api/hr/payroll/periods/P1/reopen
   { reason: 'error_calculo', reasonDetail: 'falto bono retencion' }

2. Endpoint valida auth, parsea body, llama reopenPayrollPeriod()

3. Dentro de TX:
   a. assertReopenWindow(2026, 4) — OK (es mes operativo vigente)
   b. SELECT ... FOR UPDATE sobre payroll_periods — lock adquirido
   c. assertNoExportInProgress — verifica que no hay export_id activo
   d. assertPreviredNotDeclared — verifica snapshot previred
   e. UPDATE payroll_periods SET status = 'reopened'
   f. INSERT INTO payroll_period_reopen_audit RETURNING audit_id
   g. COMMIT

4. Response 200 { auditId, periodStatus: 'reopened', operationalMonth: '2026-04' }

5. El operador navega a la entry, edita un valor

6. Flujo de recalculate-entry existente detecta period.status = 'reopened'
   → llama supersedeEntryOnRecalculate() en vez del update destructivo normal
   → crea version=2, marca version=1 como is_active=false
   → emite payroll_entry.reliquidated al outbox

7. Operador aprueba y re-exporta:
   reopened → calculated → approved → exported

8. Consumer de Finance (TASK-411) procesa el evento asincrónicamente
```

### Consideraciones de concurrencia

- Lock pesimista `SELECT ... FOR UPDATE` en `payroll_periods` durante toda la TX de reopen
- Si otro proceso intenta hacer export al mismo período, esperará el lock
- Si el lock no se obtiene en <5s, retornar 409 Conflict

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Migración aplica limpia en dev y staging (`pnpm migrate:up`)
- [ ] Tipos regenerados en `src/types/db.d.ts` incluyen las columnas nuevas
- [ ] `PeriodStatus` incluye `'reopened'` y compila en todo el proyecto
- [ ] `canReopenPayrollPeriod('exported') === true`; `canReopenPayrollPeriod('draft') === false` (y tests pasan)
- [ ] Las 4 guardas tienen tests unitarios cubriendo path feliz y cada error
- [ ] `reopenPayrollPeriod` es atómico: si falla guard #3 después del UPDATE de status, el status queda en `exported` (verificar con test de rollback)
- [ ] Endpoint `POST /reopen` retorna 403 si el usuario no es `efeonce_admin`
- [ ] Endpoint retorna 400 con mensaje específico si el período está fuera de ventana, si Previred declarado, o si hay export en curso
- [ ] Evento `payroll_entry.reliquidated` aparece en `event-catalog.ts` y en los tests de catálogo
- [ ] `supersedeEntryOnRecalculate` crea la nueva versión, marca la anterior como `is_active=false` y emite el evento dentro de la misma TX
- [ ] Ninguna query existente de `payroll_entries` rompe (todas filtran por `is_active=true` o fueron actualizadas)
- [ ] `pnpm build`, `pnpm lint`, `pnpm test`, `npx tsc --noEmit` verdes

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- `pnpm build`
- `pnpm pg:connect:migrate` en dev local
- Smoke test en staging con `pnpm staging:request POST /api/hr/payroll/periods/<id>/reopen '{"reason":"error_calculo","reasonDetail":"test"}'`
- Verificar en `payroll_period_reopen_audit` que el registro quedó con todos los campos
- Verificar en `outbox_events` (o tabla equivalente) que el evento se emitió con el payload correcto

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` quedó actualizado
- [ ] `changelog.md` quedó actualizado
- [ ] se ejecutó chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] [TASK-409](./TASK-409-payroll-reliquidation-program.md) actualizado reflejando que Slice 1 está complete
- [ ] [TASK-411](./TASK-411-payroll-reliquidation-finance-delta-consumer.md) desbloqueado — notificar que el evento está publicado
- [ ] [TASK-412](./TASK-412-payroll-reliquidation-admin-ui-preview-audit.md) desbloqueado — endpoint disponible
- [ ] `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` actualizado con el nuevo estado y modelo de versionado
- [ ] `GREENHOUSE_EVENT_CATALOG_V1.md` actualizado con `payroll_entry.reliquidated`

## Follow-ups

- Si durante Discovery se detecta que `payroll_entries.entry_id` no es UUID sino otro tipo, ajustar la migración
- Si `payroll_previsional_snapshot` no tiene un campo claro de "declarado", crear un helper intermedio o abrir issue

## Delta 2026-04-15 — Audit Findings (pre-implementación)

Durante Discovery se detectaron varios supuestos desactualizados que ajustan la implementación:

1. **`payroll_entries.entry_id` es TEXT, no uuid.** La migración usa `text` para `superseded_by` y `period_id` en la tabla audit.
2. **`payroll_periods.status` es TEXT con CHECK constraint, no enum PG.** La migración hace `DROP CONSTRAINT payroll_periods_status_check` y lo recrea con `'reopened'` incluido.
3. **`payroll_entries` tiene `UNIQUE(period_id, member_id)` activa.** La migración la DROP y reemplaza con `CREATE UNIQUE INDEX ... ON (period_id, member_id) WHERE is_active = true`.
4. **No existe campo "Previred declarado" en ninguna tabla.** Solo `previred_period_indicators` y `previred_afp_rates` (snapshots económicos). La ventana operativa actúa como proxy: Previred se declara entre el 1 y el 10 del mes siguiente, y el mes operativo vigente es por definición el no-declarado. V1 no implementa `assertPreviredNotDeclared` — la guarda de ventana la subsume. El audit table mantiene la columna `previred_declared_check boolean` con default `false`. Follow-up V2: tracking explícito de declaración Previred.
5. **Recalculate flow actual hace UPSERT in-place** (`upsertPayrollEntry` en `persist-entry.ts`). La foundation agrega `supersedePayrollEntryOnRecalculate` y un branch en `recalculate-entry.ts` que la invoca cuando `period.status === 'reopened'`.
6. **No existe zod en payroll routes.** Validación manual + `PayrollValidationError` + `toPayrollErrorResponse` es el patrón.
7. **Se emite `payroll_entry.reliquidated` incluso con delta cero** (trazabilidad); el consumer de Finance hace no-op.

## Open Questions — Resueltas

- **Previred check**: delegado a ventana operativa (no se implementa guarda separada en V1).
- **`is_active` flag**: columna real + unique index parcial.
- **Delta cero**: emitir siempre.
