# TASK-729 — Payroll Reliability Module + Domain Tag + Data Quality Subsystem

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none` (pero NO ejecutar antes del cierre de nómina abril 2026; arrancar T+0 del cierre)
- Branch: `task/TASK-729-payroll-reliability-module`

## Summary

Cierra el hueco de observability/reliability del módulo Payroll detectado en la auditoría
pre-cierre nómina abril 2026: payroll está absorbido bajo `delivery` en el Reliability
Control Plane, sin `incidentDomainTag` propio, con cero `captureWithDomain` calls, sin
subsystem en `/admin/ops-health`, y con `console.error` directos que hacen invisibles los
fallos de cálculo/aprobación/cierre. Esta task agrega telemetría pasiva (sin tocar el motor),
registra payroll como módulo first-class en el registry, y construye el subsystem "Payroll
Data Quality" con 4 detectors continuos.

## Why This Task Exists

Payroll **existe pero es operacionalmente invisible**:

- `STATIC_RELIABILITY_REGISTRY` no incluye payroll ([src/lib/reliability/registry.ts:28-240](src/lib/reliability/registry.ts#L28-L240)).
- `CaptureDomain` enum no tiene `'payroll'` ([src/lib/observability/capture.ts:33](src/lib/observability/capture.ts#L33)) — solo `'people'`.
- 0 `captureWithDomain` calls en `src/lib/payroll/` o `src/app/api/hr/payroll/`. 5+ `console.error` directos.
- Operations Overview no tiene "Payroll Data Quality" ([src/lib/admin/get-operations-overview.ts](src/lib/admin/get-operations-overview.ts)).
- No hay detector de períodos stuck en draft, compensation overlaps, PREVIRED freshness ni projection failures.

Cuando algo se rompe en payroll, ops ve un incident anónimo en `delivery`, sin filtro por
módulo, sin métrica continua, sin alertador. Para un módulo que mueve plata, es deuda
operacional crítica.

**Garantía dura**: esta task NO toca el motor de cálculo (`buildPayrollEntry`, state machine,
state guards, outbox events emitidos/consumidos, `getPayrollPeriodReadiness`, reliquidation
TASK-410, crons existentes). Solo agrega instrumentación.

## Goal

- Payroll registrado como módulo first-class en `STATIC_RELIABILITY_REGISTRY` con
  `incidentDomainTag='payroll'`.
- `'payroll'` agregado al enum `CaptureDomain`.
- Handlers críticos (`calculate/route.ts`, `approve/route.ts`, `close/route.ts`) instrumentados
  con `captureWithDomain(err, 'payroll', ...)` — `console.error` queda como fallback de stack.
- Subsystem "Payroll Data Quality" en `/admin/ops-health` con 4 detectors read-only:
  `stuck_draft_periods`, `compensation_version_overlaps`, `previred_sync_freshness`,
  `projection_queue_failures`.
- Steady-state esperado de invocaciones de `console.error` no envueltos: 0.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — registry + signals + severity rollup
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` — contrato del módulo
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` — Platform Health V1 (cómo expone subsystems)

Reglas obligatorias:

- **No tocar motor de cálculo**: `buildPayrollEntry`, `calculatePayroll`, state machine guards,
  ni los outbox events emitidos. Esta task es 100% aditiva.
- **No agregar CHECK constraints, NOT NULL ni FK nuevas** a tablas existentes de payroll.
- Patrón canónico de `captureWithDomain` ([src/lib/observability/capture.ts](src/lib/observability/capture.ts))
  — usar siempre con `domain='payroll'`. Para warnings (no-throw), usar `captureMessageWithDomain`.
- Patrón canónico de subsystem reader: replica de Finance Data Quality
  ([src/lib/admin/get-operations-overview.ts](src/lib/admin/get-operations-overview.ts)
  busca `Finance Data Quality`).
- `withSourceTimeout` ([src/lib/platform-health/with-source-timeout.ts](src/lib/platform-health/with-source-timeout.ts))
  para que un detector que falla no rompa el dashboard — degradación honesta a `awaiting_data`.
- Feature flag de kill switch: `GREENHOUSE_DISABLE_PAYROLL_DETECTORS=true` revierte el
  subsystem sin redeploy si genera ruido.

## Normative Docs

- [migrations/20260415182419195_payroll-reliquidation-foundation.sql](migrations/20260415182419195_payroll-reliquidation-foundation.sql) — TASK-410 reliquidation foundation
- [src/lib/reliability/registry.ts](src/lib/reliability/registry.ts) — registry estático
- [src/lib/observability/capture.ts](src/lib/observability/capture.ts) — `captureWithDomain`/`captureMessageWithDomain`
- [src/lib/admin/get-operations-overview.ts](src/lib/admin/get-operations-overview.ts) — patrón Finance Data Quality
- [src/lib/payroll/payroll-readiness.ts](src/lib/payroll/payroll-readiness.ts) — `getPayrollPeriodReadiness` (no se modifica, solo se reusa)

## Dependencies & Impact

### Depends on

- Cierre exitoso de nómina abril 2026 (T+0). NO ejecutar antes del cierre.
- `STATIC_RELIABILITY_REGISTRY` activo — confirmado vía registry.ts:28-240.
- Tabla `greenhouse_sync.projection_refresh_queue` activa — confirmado vía TASK-585+.

### Blocks / Impacts

- TASK-730 (Payroll E2E Smoke Lane): consume el subsystem como freshness signal.
- TASK-731 (Payroll Pre-Close Validator): expone resultado del pre-flight via Ops Health.
- Futuras tasks de HR (Goals, Performance Reviews, Attendance) replican el patrón
  cuando emerjan.
- NO impacta el motor de cálculo de nómina ni el ciclo de períodos.

### Files owned

- `src/lib/observability/capture.ts` (extender enum)
- `src/lib/reliability/registry.ts` (agregar payroll)
- `src/app/api/hr/payroll/periods/[periodId]/calculate/route.ts` (wrap con captureWithDomain)
- `src/app/api/hr/payroll/periods/[periodId]/approve/route.ts` (wrap)
- `src/app/api/hr/payroll/periods/[periodId]/close/route.ts` (wrap)
- `src/lib/admin/get-operations-overview.ts` (agregar buildPayrollDataQualitySubsystem)
- `src/lib/payroll/data-quality/` (nueva carpeta para detectors)
- Tests en `src/lib/payroll/data-quality/*.test.ts`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` (sección observability)
- `docs/documentation/hr/` (doc funcional, si existe; si no, crear)

## Current Repo State

### Already exists

- Reliability Control Plane registry con 6 módulos vivos (finance, delivery, cloud, integrations.notion, integrations.teams, home).
- `captureWithDomain` patrón usado en finance/delivery/integrations con 30+ call sites.
- Operations Overview con subsystem "Finance Data Quality" (8+ métricas) — patrón a replicar.
- `withSourceTimeout` helper para degradación honesta.
- `getPayrollPeriodReadiness()` para validación on-demand de un período (se reusa, no se modifica).
- Audit table `payroll_period_reopen_audit` para reliquidaciones.
- Crons `payroll-auto-calculate` y `sync-previred` activos.

### Gap

- Payroll no es módulo de primer nivel en el registry.
- Cero domain tag en errores de payroll.
- Sin subsystem continuo en Ops Health.
- Sin detectores de stuck periods, overlaps, freshness, queue failures.
- Sin telemetría de duración de cálculo / aprobación / cierre.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (vacío al crear)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Domain tag + handler instrumentation (zero-risk)

- Agregar `'payroll'` al enum `CaptureDomain` en [src/lib/observability/capture.ts:33](src/lib/observability/capture.ts#L33).
- Wrap los 3 handlers críticos con `captureWithDomain`:
  - `/api/hr/payroll/periods/[periodId]/calculate/route.ts`
  - `/api/hr/payroll/periods/[periodId]/approve/route.ts`
  - `/api/hr/payroll/periods/[periodId]/close/route.ts`
- Patrón:
  ```ts
  try {
    // existing logic
  } catch (err) {
    captureWithDomain(err, 'payroll', {
      extra: { periodId, periodYear, periodMonth, action: 'calculate' },
      tags: { stage: 'calculate' }
    })
    throw err
  }
  ```
- Tests vitest: stub captureWithDomain, verificar que se llama con domain correcto.

### Slice 2 — Registry entry (sin signals)

- Agregar entry de `payroll` en `STATIC_RELIABILITY_REGISTRY` con:
  - `key: 'payroll'`
  - `displayName: 'Payroll'`
  - `incidentDomainTag: 'payroll'`
  - `expectedSignalKinds: ['incident']` inicialmente (se expanden en Slice 4)
- UI card aparece en `/admin/ops-health` con count de incidents Sentry tag-filtered.

### Slice 3 — Detectors read-only

Crear 4 detectors en `src/lib/payroll/data-quality/`:

1. `stuck-draft-periods.ts`:
   ```sql
   SELECT period_id, year, month, calculated_at, updated_at
   FROM greenhouse_payroll.payroll_periods
   WHERE status = 'draft'
     AND updated_at < NOW() - INTERVAL '48 hours'
     AND year * 100 + month <= EXTRACT(YEAR FROM NOW()) * 100 + EXTRACT(MONTH FROM NOW())
   ```
   Severity: warning si count > 0, critical si > 1.

2. `compensation-version-overlaps.ts`:
   ```sql
   SELECT a.member_id, COUNT(*) as overlap_count
   FROM greenhouse_payroll.compensation_versions a
   INNER JOIN greenhouse_payroll.compensation_versions b
     ON a.member_id = b.member_id
    AND a.version_id < b.version_id
    AND a.active = true AND b.active = true
    AND tstzrange(a.effective_from, a.effective_to) && tstzrange(b.effective_from, b.effective_to)
   GROUP BY a.member_id
   ```
   Severity: critical si count > 0 (afecta cálculo).

3. `previred-sync-freshness.ts`:
   ```sql
   SELECT MAX(completed_at) as last_run
   FROM greenhouse_sync.source_sync_runs
   WHERE source_system = 'previred'
     AND status = 'success'
   ```
   Severity: warning si > 24h, critical si > 72h.

4. `projection-queue-failures.ts`:
   ```sql
   SELECT projection_name, COUNT(*) as failed_count
   FROM greenhouse_sync.projection_refresh_queue
   WHERE projection_name IN ('projected_payroll', 'leave_payroll_recalculation', 'payroll_reliquidation_delta')
     AND status = 'failed'
     AND COALESCE(archived, FALSE) = FALSE
   GROUP BY projection_name
   ```
   Severity: warning si total > 0, critical si > 5.

Cada detector retorna `SubsystemMetric` shape (igual que Finance Data Quality):
```ts
{ key, label, value, severity, evidence, lastChecked }
```

### Slice 4 — Subsystem reader + Ops Health card

- `buildPayrollDataQualitySubsystem()` en `src/lib/admin/payroll-data-quality.ts` que llama
  los 4 detectors via `Promise.all` con `withSourceTimeout` (timeout 5s por detector).
- Registrar en `getOperationsOverview` ([src/lib/admin/get-operations-overview.ts](src/lib/admin/get-operations-overview.ts)) — patrón idéntico a Finance Data Quality.
- Severity rollup: `critical` > `warning` > `healthy`. Si todos OK → green. Si 1 warning → amber. Si 1 critical → red.
- UI: card con título "Payroll Data Quality", 4 métricas con drill-down.

### Slice 5 — Tests + docs

- Tests vitest:
  - Cada detector: rows simulados → severity esperada.
  - Subsystem reader: timeout en 1 detector → otros emiten correcto, total `degraded`.
  - Handler instrumentation: error en calculate → `captureWithDomain` invocado con `domain='payroll'`.
- Actualizar `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` con sección
  "Observability & Reliability" documentando el contrato.
- Actualizar `docs/documentation/hr/` (crear si no existe) con explicación funcional del
  subsystem para operaciones.

## Out of Scope

- Modificar `buildPayrollEntry`, state machine guards, lifecycle, outbox events,
  reliquidation logic, crons.
- E2E smoke lane → TASK-730.
- Pre-close validator endpoint → TASK-731.
- Migración a entitlements capability-based (TASK-404 no aplicada).
- Cambios al schema de tablas de payroll.

## Detailed Spec

### Patrón de instrumentation (Slice 1)

```ts
// /api/hr/payroll/periods/[periodId]/calculate/route.ts
import { captureWithDomain } from '@/lib/observability/capture'

export async function POST(request, { params }) {
  const { periodId } = await params
  const startedAt = Date.now()
  let outcome: 'success' | 'failure' | 'pending' = 'pending'

  try {
    // ... existing logic ...
    outcome = 'success'
    return NextResponse.json(result)
  } catch (err) {
    outcome = 'failure'
    captureWithDomain(err, 'payroll', {
      level: 'error',
      tags: { stage: 'calculate', periodId },
      extra: {
        periodId,
        durationMs: Date.now() - startedAt,
        actorUserId: tenant?.userId
      }
    })
    throw err
  }
}
```

### Patrón de detector (Slice 3)

```ts
// src/lib/payroll/data-quality/stuck-draft-periods.ts
import { query } from '@/lib/db'
import type { SubsystemMetric } from '@/lib/admin/types'

export async function detectStuckDraftPeriods(): Promise<SubsystemMetric> {
  const rows = await query<{ period_id: string; year: number; month: number; updated_at: string }>(
    `SELECT period_id, year, month, updated_at
     FROM greenhouse_payroll.payroll_periods
     WHERE status = 'draft' AND updated_at < NOW() - INTERVAL '48 hours'`
  )

  return {
    key: 'stuck_draft_periods',
    label: 'Períodos stuck en draft (>48h)',
    value: rows.length,
    severity: rows.length > 1 ? 'critical' : rows.length > 0 ? 'warning' : 'healthy',
    evidence: rows.slice(0, 5).map(r => `${r.year}-${String(r.month).padStart(2, '0')}: ${r.updated_at}`),
    lastChecked: new Date().toISOString()
  }
}
```

### Patrón de subsystem (Slice 4)

```ts
// src/lib/admin/payroll-data-quality.ts
import { withSourceTimeout } from '@/lib/platform-health/with-source-timeout'
import { detectStuckDraftPeriods, detectCompensationOverlaps,
         detectPreviredFreshness, detectProjectionFailures } from '@/lib/payroll/data-quality'

export async function buildPayrollDataQualitySubsystem() {
  const [stuck, overlaps, previred, queue] = await Promise.all([
    withSourceTimeout(detectStuckDraftPeriods, { source: 'payroll.stuck', timeoutMs: 5000 }),
    withSourceTimeout(detectCompensationOverlaps, { source: 'payroll.overlaps', timeoutMs: 5000 }),
    withSourceTimeout(detectPreviredFreshness, { source: 'payroll.previred', timeoutMs: 5000 }),
    withSourceTimeout(detectProjectionFailures, { source: 'payroll.queue', timeoutMs: 5000 })
  ])

  return {
    key: 'payroll_data_quality',
    label: 'Payroll Data Quality',
    metrics: [stuck, overlaps, previred, queue].filter(Boolean),
    overallSeverity: rollupSeverity([stuck, overlaps, previred, queue])
  }
}
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `'payroll'` está en `CaptureDomain` enum.
- [ ] Los 3 handlers críticos (`calculate`, `approve`, `close`) emiten `captureWithDomain(err, 'payroll', ...)` en error path.
- [ ] `STATIC_RELIABILITY_REGISTRY` tiene entry `payroll` con `incidentDomainTag='payroll'`.
- [ ] `/admin/ops-health` muestra card "Payroll Data Quality" con 4 métricas.
- [ ] Cada detector retorna severity correcto en happy path y edge cases (verificado en tests).
- [ ] Si un detector timeout, el subsystem emite `degraded`, no rompe el dashboard.
- [ ] Feature flag `GREENHOUSE_DISABLE_PAYROLL_DETECTORS=true` desactiva el subsystem sin deploy.
- [ ] Cero `console.error` directos en `/api/hr/payroll/periods/[periodId]/{calculate,approve,close}/route.ts` (audit con grep).
- [ ] `pnpm lint` + `pnpm test src/lib/payroll/data-quality src/lib/admin/payroll-data-quality` pasan.
- [ ] Doc `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` con sección Observability actualizada.

## Verification

- `pnpm migrate:up` (si hay migración — no hay schema changes esperadas, pero verificar)
- `pnpm db:generate-types`
- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test src/lib/payroll src/lib/admin src/lib/observability`
- Verificación manual: `/admin/ops-health` muestra el nuevo card; provocar error en calculate (con período inválido) y confirmar Sentry recibe con tag `domain=payroll`.
- Smoke en preview con agent session de admin.

## Closing Protocol

- [ ] `Lifecycle` sincronizado en markdown + carpeta correcta
- [ ] `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md` actualizados
- [ ] `Handoff.md` con resumen + matriz de detectors
- [ ] `changelog.md` actualizado
- [ ] Chequeo de impacto cruzado sobre TASK-730 y TASK-731 (que dependen de este registry/subsystem)
- [ ] CLAUDE.md actualizado con regla "errores de payroll usan `captureWithDomain(err, 'payroll', ...)`"

## Follow-ups

- Métricas de duración: agregar histogram de tiempo de cálculo a un panel admin (separable, no bloqueante).
- Correlation IDs en logs estructurados de payroll (futuro slice).
- Detector adicional: drift entre `payroll_entries` y `projected_payroll_snapshots` (delta > umbral).
- Health del cron `payroll-auto-calculate` (último run, success rate) — consume el subsystem.

## Open Questions

- ¿Severity threshold de `stuck_draft_periods` debe variar según día del mes (más estricto cerca del cutoff)?
- ¿Detector de PREVIRED freshness debe tener kill-switch independiente para cuando se detecte downtime planeado del API?
- ¿Subsystem debe emitir alerta a Teams (`administracion.notifications`) si severity → critical?
