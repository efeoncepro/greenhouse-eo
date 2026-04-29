# TASK-731 — Payroll Pre-Close Validator + Pre-Flight Endpoint

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo` (reusa `getPayrollPeriodReadiness` + agrega checks complementarios)
- Type: `implementation`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `TASK-729` (necesita el subsystem para exponer el resultado al dashboard)
- Branch: `task/TASK-731-payroll-pre-close-validator`

## Summary

Endpoint canónico `GET /api/hr/payroll/periods/[periodId]/preflight` que ejecuta un
checklist completo de pre-cierre antes de aprobar/cerrar un período: reusa
`getPayrollPeriodReadiness()` (ya existe, blocking issues) y agrega verificaciones
complementarias (PREVIRED freshness, calendar holidays validados, sin compensation overlaps,
inputs frescos, estado de proyección consolidada vs cálculo). UI muestra chip de status
en la página del período antes del botón "Aprobar". Cron T-2 días opcional dispara el
preflight automáticamente y publica al outbox si hay blockers.

## Why This Task Exists

`getPayrollPeriodReadiness()` ([src/lib/payroll/payroll-readiness.ts:39-250](src/lib/payroll/payroll-readiness.ts#L39-L250)) ya valida bloqueantes mínimos:
UF disponible, tabla impuesto presente, compensaciones para todos los miembros, KPI snapshot
disponible. Pero es **on-demand y solo cubre lo crítico**.

La auditoría pre-cierre identificó gaps complementarios:
- ¿Último `sync-previred` < 24h? Sin verificar.
- ¿Calendar holidays para el mes operativo del período están en BD? Sin verificar.
- ¿Hay compensation versions con date ranges overlapping? Sin verificar.
- ¿Hay drift entre `payroll_entries` ya calculadas y la proyección actual?
- ¿`projection_refresh_queue` tiene entries failed que afectan el período?

Hoy un operador hace estos checks manualmente vía SQL o "memoria muscular" — error-prone y
no repetible. Esta task formaliza el checklist como endpoint + UI gate.

**Garantía dura**: el endpoint es **read-only**. NO bloquea aprobación si reutilizas
`getPayrollPeriodReadiness()` (ese ya es el gate canónico server-side). El preflight es
informativo + UX preventivo. Si el operador quiere bypass, el código no lo impide; solo
muestra warnings.

## Goal

- Endpoint `GET /api/hr/payroll/periods/[periodId]/preflight` que retorna:
  ```json
  {
    "periodId": "...",
    "readiness": { ... },          // delegado a getPayrollPeriodReadiness
    "complementaryChecks": [
      { "key": "previred_freshness", "status": "ok|warn|critical", "evidence": "..." },
      { "key": "calendar_holidays", "status": "ok", ... },
      { "key": "compensation_overlaps", "status": "ok", ... },
      { "key": "projection_drift", "status": "warn", "delta": "1234.50 CLP", ... },
      { "key": "queue_failures", "status": "ok", ... }
    ],
    "overallStatus": "ready|warning|blocked",
    "checkedAt": "2026-04-29T..."
  }
  ```
- UI: chip de status en el header del período antes de los botones de approve/close.
- Cron `payroll-preflight-cutoff` (opcional) que dispara T-2 días automático y publica
  alerta a Teams si hay blockers críticos.
- Resultado se exhibe como métrica adicional del subsystem "Payroll Data Quality" (TASK-729).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` — contrato readiness
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — emisión a subsystem
- Calendario operativo: `src/lib/calendar/operational-calendar.ts` — feriados Chile

Reglas obligatorias:

- **NO modificar `getPayrollPeriodReadiness`**: es el gate canónico de aprobación
  server-side. El preflight lo **reusa**, no lo reemplaza.
- **Read-only**: el endpoint no muta estado. No corre `calculate`, no aprueba, no cierra.
- **Idempotente**: llamar el endpoint N veces produce el mismo resultado (con timestamp
  de `checkedAt` actualizado).
- Usar `withSourceTimeout` por check para que un check lento no rompa el endpoint.
- Auth guard: `requireHrTenantContext` o `requireAdminTenantContext` (decidir cuál — debe
  ser visible a todos los HR + admin).
- Cron opcional usa `requireCronAuth` y publica al outbox event
  `payroll.preflight.failed` si encuentra blockers críticos.

## Normative Docs

- [src/lib/payroll/payroll-readiness.ts](src/lib/payroll/payroll-readiness.ts) — gate canónico
- [src/lib/calendar/operational-calendar.ts](src/lib/calendar/operational-calendar.ts) — feriados Chile
- [src/lib/calendar/nager-date-holidays.ts](src/lib/calendar/nager-date-holidays.ts) — fuente externa
- [src/lib/sync/event-catalog.ts](src/lib/sync/event-catalog.ts) — agregar `payroll.preflight.failed`

## Dependencies & Impact

### Depends on

- **TASK-729**: subsystem "Payroll Data Quality" para exhibir el resultado al dashboard.
- `getPayrollPeriodReadiness()` activo (ya está).
- Tabla `source_sync_runs` con entries de `previred` (ya está vía cron `sync-previred`).
- `compensation_versions.effective_from/effective_to` con index activo.

### Blocks / Impacts

- TASK-730 (Smoke Lane): el preflight puede ser ejercitado dentro del smoke como step
  intermedio antes de approve.
- Futura TASK de "auto-approve si preflight green" — derivada futura.
- Reduce el tiempo de incident response: si algo se rompe, el preflight lo detecta T-2 días
  antes del cierre.

### Files owned

- `src/app/api/hr/payroll/periods/[periodId]/preflight/route.ts` (nuevo endpoint)
- `src/lib/payroll/preflight/` (carpeta nueva con helpers)
  - `complementary-checks.ts` — orquestador
  - `previred-freshness.ts` — check 1
  - `calendar-holidays.ts` — check 2
  - `compensation-overlaps.ts` — check 3
  - `projection-drift.ts` — check 4
  - `queue-failures.ts` — check 5
- `src/views/greenhouse/hr/payroll/PeriodHeader.tsx` (extender con chip de status)
- `src/app/api/cron/payroll-preflight-cutoff/route.ts` (nuevo cron, opcional)
- Tests en `src/lib/payroll/preflight/*.test.ts`

## Current Repo State

### Already exists

- `getPayrollPeriodReadiness()` con validación de bloqueantes core.
- `source_sync_runs` con tracking de `previred` sync.
- `operational-calendar.ts` con `getLastBusinessDayOfMonth` y feriados Chile.
- `compensation_versions` con `effective_from`/`effective_to`.
- `projection_refresh_queue` activa.
- Subsystem "Payroll Data Quality" (TASK-729, prerequisito).

### Gap

- Sin endpoint pre-flight unificado.
- Sin UI chip de pre-flight status antes del cierre.
- Sin cron T-2 días que alerte automáticamente.
- Sin signal de pre-flight result en el dashboard.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (vacío al crear)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Complementary check helpers (read-only)

`src/lib/payroll/preflight/`:

1. **previred-freshness.ts**:
   ```ts
   export async function checkPreviredFreshness(): Promise<PreflightCheck> {
     const last = await query<{ completed_at: string }>(`
       SELECT completed_at FROM greenhouse_sync.source_sync_runs
       WHERE source_system='previred' AND status='success'
       ORDER BY completed_at DESC LIMIT 1
     `)
     const hoursSince = last[0] ? hoursBetween(last[0].completed_at, NOW) : Infinity
     return {
       key: 'previred_freshness',
       status: hoursSince < 24 ? 'ok' : hoursSince < 72 ? 'warn' : 'critical',
       evidence: last[0] ? `Last sync ${hoursSince}h ago` : 'No previred sync recorded',
       lastChecked: NOW
     }
   }
   ```

2. **calendar-holidays.ts**:
   ```ts
   export async function checkCalendarHolidays(year, month): Promise<PreflightCheck> {
     const holidays = await getHolidaysForMonth(year, month, 'CL')
     // Verifica que la API responde y que las fechas están consistentes
     // OK si tiene al menos 1 entry o si es un mes sin feriados conocidos
   }
   ```

3. **compensation-overlaps.ts**:
   ```sql
   -- Para todos los miembros activos del período
   SELECT a.member_id, a.version_id, b.version_id
   FROM compensation_versions a INNER JOIN compensation_versions b
     ON a.member_id = b.member_id AND a.version_id < b.version_id
     AND a.active AND b.active
     AND tstzrange(a.effective_from, a.effective_to) && tstzrange(b.effective_from, b.effective_to)
   ```
   Retorna critical si hay overlaps (afecta cálculo).

4. **projection-drift.ts**:
   ```ts
   // Compara payroll_entries del período con proyección actual
   // Si delta > 5% del total, warning (operador debe revisar antes de cerrar)
   ```

5. **queue-failures.ts**:
   ```sql
   SELECT projection_name, COUNT(*) FROM projection_refresh_queue
   WHERE projection_name IN ('projected_payroll', 'leave_payroll_recalculation', 'payroll_reliquidation_delta')
     AND status='failed' AND COALESCE(archived, FALSE) = FALSE
   GROUP BY projection_name
   ```

### Slice 2 — Endpoint orchestrator

`/api/hr/payroll/periods/[periodId]/preflight/route.ts`:

```ts
export async function GET(_req, { params }) {
  const { periodId } = await params
  const { tenant, errorResponse } = await requireHrOrAdminTenantContext()
  if (!tenant) return errorResponse

  const period = await getPayrollPeriod(periodId)
  if (!period) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Reusar el gate canónico
  const readiness = await getPayrollPeriodReadiness(periodId)

  // Checks complementarios en paralelo, cada uno con timeout
  const [previred, calendar, overlaps, drift, queue] = await Promise.all([
    withSourceTimeout(checkPreviredFreshness, { source: 'previred', timeoutMs: 5000 }),
    withSourceTimeout(() => checkCalendarHolidays(period.year, period.month), { source: 'calendar', timeoutMs: 5000 }),
    withSourceTimeout(() => checkCompensationOverlaps(periodId), { source: 'overlaps', timeoutMs: 5000 }),
    withSourceTimeout(() => checkProjectionDrift(periodId), { source: 'drift', timeoutMs: 5000 }),
    withSourceTimeout(checkQueueFailures, { source: 'queue', timeoutMs: 5000 })
  ])

  const complementaryChecks = [previred, calendar, overlaps, drift, queue].filter(Boolean)

  const overallStatus = readiness.blocked || complementaryChecks.some(c => c.status === 'critical')
    ? 'blocked'
    : complementaryChecks.some(c => c.status === 'warn')
      ? 'warning'
      : 'ready'

  return NextResponse.json({
    periodId,
    period: { year: period.year, month: period.month, status: period.status },
    readiness,
    complementaryChecks,
    overallStatus,
    checkedAt: new Date().toISOString()
  })
}
```

### Slice 3 — UI chip in PeriodHeader

- En `src/views/greenhouse/hr/payroll/PeriodHeader.tsx` (o componente equivalente):
  agregar chip de pre-flight con click → drawer expandible con detalle.
- Chip color: `success` si `ready`, `warning` si `warn`, `error` si `blocked`.
- Tooltip explica qué falta + CTA "Ver detalle".
- Respeta capabilities: solo HR + admin lo ven.

### Slice 4 — Cron T-2 días (opcional)

- `/api/cron/payroll-preflight-cutoff/route.ts`:
  - Calcula T-2 del cutoff del período activo (vía `getLastBusinessDayOfMonth`).
  - Si dentro de la ventana, ejecuta preflight para todos los períodos `draft` o `calculated`.
  - Si `overallStatus === 'blocked' || === 'warning'`, publica al outbox
    `payroll.preflight.failed` con detalle.
  - Outbox handler envía a Teams (`administracion.notifications` → channel HR ops).

### Slice 5 — Subsystem signal

- En "Payroll Data Quality" (TASK-729), agregar métrica
  `payroll_active_period_preflight_status`:
  - Lee el último resultado del preflight para el período activo.
  - Severity: replicado del `overallStatus`.

### Slice 6 — Tests + docs

- Tests vitest:
  - Cada check helper con happy path + edge cases.
  - Endpoint con periods stub.
  - UI chip con cada estado.
  - Cron con scenarios mocked.
- Doc `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`: sección "Pre-Close Validator".
- Doc funcional `docs/documentation/hr/`.

## Out of Scope

- Modificar `getPayrollPeriodReadiness` (es el gate canónico, no se toca).
- Auto-approve / auto-close basado en preflight (futura task).
- Reemplazar el flujo manual de aprobación (sigue siendo manual).
- Notificaciones a otros canales que no sean Teams (futuras).
- Migración a entitlements capability (TASK-404 no aplicada).

## Detailed Spec

### Tipo de PreflightCheck

```ts
export interface PreflightCheck {
  key: string
  label: string
  status: 'ok' | 'warn' | 'critical'
  evidence: string
  lastChecked: string  // ISO timestamp
  details?: Record<string, unknown>
}
```

### Severity rollup logic

- `blocked` si `readiness.blocked === true` OR cualquier check `critical`.
- `warning` si cualquier check `warn`.
- `ready` si todo OK.

Operador puede ignorar `warning` (chip avisa pero no bloquea aprobación). `blocked`
significa que `getPayrollPeriodReadiness` ya bloquea server-side, así que UI debe
sincronizarse con eso.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `GET /api/hr/payroll/periods/[periodId]/preflight` retorna shape canónico con todos los
      campos (readiness, complementaryChecks, overallStatus, checkedAt).
- [ ] Endpoint responde en < 3s (via `withSourceTimeout` por check).
- [ ] Cada complementary check tiene happy path + critical path testeados.
- [ ] UI: chip de status visible en header del período. Click expande drawer con detalle.
- [ ] `getPayrollPeriodReadiness` NO modificado (audit con git diff).
- [ ] Cron opcional `payroll-preflight-cutoff` activable vía env var
      `GREENHOUSE_PAYROLL_PREFLIGHT_CUTOFF_ENABLED=true`.
- [ ] Resultado del preflight aparece como métrica en subsystem "Payroll Data Quality".
- [ ] Cero side effects: llamar el endpoint N veces no muta estado.
- [ ] `pnpm lint` + `pnpm tsc --noEmit` + `pnpm test src/lib/payroll/preflight` pasan.

## Verification

- `pnpm migrate:up` (sin migraciones esperadas, verificar)
- `pnpm db:generate-types`
- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test src/lib/payroll/preflight src/app/api/hr/payroll/periods`
- Validación manual:
  - GET endpoint con periodId activo → status 200 + JSON canónico
  - GET con periodId inválido → 404
  - GET con período sin `previred` reciente → check `previred_freshness` `warn`
  - UI chip aparece en header del período
- Smoke en preview con agent session.

## Closing Protocol

- [ ] `Lifecycle` sincronizado + carpeta correcta
- [ ] `docs/tasks/README.md` y `TASK_ID_REGISTRY.md` actualizados
- [ ] `Handoff.md` con resumen
- [ ] `changelog.md` actualizado
- [ ] Chequeo de impacto cruzado sobre TASK-729 (consume el endpoint)

## Follow-ups

- Auto-approve si `overallStatus === 'ready'` durante N períodos consecutivos
  (gradual relajación de aprobación manual) — task derivada futura.
- Detector adicional: KPI snapshot drift (delta entre snapshot serving y cálculo en vivo).
- Detector: leave_requests pending approval en el período activo.
- Reporte histórico de preflight pass/fail rate por período para análisis de tendencias.

## Open Questions

- ¿Cuál es el threshold canónico de `projection_drift` (% del total)? Default 5%, ajustable.
- ¿Cron `payroll-preflight-cutoff` debe correr cada cuánto? Default daily, T-2 días filtrado
  por período activo.
- ¿Endpoint debe ser cacheable a nivel HTTP (ETag, max-age)? Por ahora no — preflight
  cambia con cada update de inputs.
