# TASK-1347 — Payroll attendance requirement: el régimen es autoritativo sobre `daily_required`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `task/TASK-1347-payroll-attendance-requirement-regime-authoritative`
- Legacy ID: `none`
- GitHub Issue: `ISSUE-115`

## Summary

Corrige la clase de bug donde la nómina queda bloqueada permanentemente porque un colaborador de régimen no-dependiente-Chile (`international_internal`) tiene `greenhouse_core.members.daily_required = true`, lo que fuerza al readiness a exigir una señal de asistencia diaria que su régimen no tiene y que nunca aparecerá (`attendance_daily` vacía). El fix hace que el **régimen de contrato sea autoritativo** sobre si la asistencia afecta el pago, blinda el write-path, normaliza la data existente y agrega un detector de drift. Cierra ISSUE-115.

## Why This Task Exists

El requisito de señal de asistencia en payroll está definido por **denylist** (`requiresPayrollAttendanceSignal = contractType !== 'honorarios' && payrollVia !== 'deel' && scheduleRequired !== false`), y `scheduleRequired` se deriva con `members.daily_required ?? resolveScheduleRequired({ contractType })` — donde el flag por-member **sobreescribe** la verdad del régimen. Esto deja que un flag crudo habilite asistencia diaria en un régimen (`international_internal`, `international`) que categóricamente no la usa, y como `attendance_daily` está vacía, la señal jamás se satisface y la nómina se bloquea sin recuperación posible. La data incoherente además se pudo persistir porque ningún guard valida `daily_required` contra el tipo de contrato. Es un síntoma de causa compartida (la derivación), no un caso individual: cualquier régimen internacional futuro cae en la misma trampa. Ver ISSUE-115 para la cadena completa con evidencia runtime.

## Goal

- La asistencia diaria se exige **solo** para régimen dependiente Chile (`indefinido`/`plazo_fijo`), modulada por `scheduleRequired`; ningún flag por-member puede habilitarla fuera de ese régimen.
- El write-path rechaza `daily_required = true` cuando el contractType no es dependiente Chile (error canónico), impidiendo que la data incoherente vuelva a nacer.
- La data existente incoherente queda normalizada (incluida Maria Fernanda `7da60123`), y un reliability signal detecta cualquier drift futuro en toda la población.
- El período `2026-06` calcula: `getPayrollPeriodReadiness` devuelve `blockingIssues = []` y **Calcular** se habilita, sin regresión en payroll/finiquito.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md` (§`International Internal contract type`)
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` (state-machine + CHECK/guard + audit; flag/detector de drift)
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` (reliability signal nuevo)
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` (migrations, marker `-- Up Migration`)

Reglas obligatorias:

- Invocar la skill MANDATORIA `greenhouse-payroll-auditor` antes de tocar `src/lib/payroll/**`.
- El régimen de contrato es la fuente de verdad de si la asistencia afecta el pago; `daily_required` solo puede *modular dentro* de un régimen que la soporta, nunca habilitarla en uno que no.
- NO debilitar el blocker de asistencia para trabajadores dependientes Chile reales (el fix es de scope, no de laxitud).
- Migration con marker `-- Up Migration` exacto + bloque `DO` de verificación post-apply (anti pre-up-marker bug).
- Correr como gate de cierre `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` verde.

## Normative Docs

- `docs/issues/open/ISSUE-115-payroll-blocked-daily-required-incoherent-with-regime.md` — incidente fuente con evidencia runtime.

## Dependencies & Impact

### Depends on

- `greenhouse_core.members.daily_required` (columna existente).
- `greenhouse_payroll.compensation_versions.contract_type` (source de régimen).
- Reader `getPayrollPeriodReadiness` + `calculatePayroll` (consumidores del predicado de asistencia).

### Blocks / Impacts

- Desbloquea el cálculo de nómina del período `2026-06` (y cualquier período con colaboradores `international_internal`).
- Impacta el mismo predicado usado por `calculate-payroll.ts` (líneas ~586-597) — verificar que el fix se aplique en ambos consumers o en el helper compartido.

### Files owned

- `src/lib/payroll/compensation-requirements.ts`
- `src/lib/payroll/compensation-requirements.test.ts` `[verificar]`
- `src/lib/payroll/postgres-store.ts` (derivación `scheduleRequired` + write-path guard)
- `src/lib/payroll/payroll-readiness.test.ts`
- `migrations/<timestamp>_task-1347-normalize-daily-required-non-chile.sql` (nuevo)
- `src/lib/reliability/queries/payroll-schedule-regime-mismatch.ts` (nuevo) `[verificar path]`
- `docs/issues/open/ISSUE-115-...md` → mover a `resolved/` al cierre.

## Current Repo State

### Already exists

- `requiresPayrollAttendanceSignal` / `requiresPayrollKpi` en [src/lib/payroll/compensation-requirements.ts:14](../../../src/lib/payroll/compensation-requirements.ts#L14).
- Derivación `scheduleRequired: row.daily_required ?? resolveScheduleRequired({ contractType })` en [src/lib/payroll/postgres-store.ts:488](../../../src/lib/payroll/postgres-store.ts#L488).
- Write-path que muta `daily_required` (`UPDATE greenhouse_core.members ... daily_required = $4`) en `postgres-store.ts` ~L812 `[verificar nombre del command]`.
- Reader `getPayrollPeriodReadiness` en `src/lib/payroll/payroll-readiness.ts:248`; blocker `missing_attendance_signal` en L139-147.
- Patrón de reliability signals en `src/lib/reliability/queries/**` `[verificar]`.

### Gap

- La derivación deja que `daily_required` habilite asistencia en régimen internacional.
- No hay guard que impida persistir `daily_required=true` en régimen no-Chile.
- No hay detector de drift para filas ya incoherentes.
- Falta test de regresión del escenario `international_internal` + `daily_required=true`.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `migration`
- Source of truth afectado: `greenhouse_core.members.daily_required` + predicado `requiresPayrollAttendanceSignal` (payroll readiness/calculate)
- Consumidores afectados: `payroll readiness reader, calculate-payroll, UI Nómina mensual, reliability dashboard`
- Runtime target: `staging` → `production`

### Contract surface

- Contrato existente a respetar: `getPayrollPeriodReadiness` (shape `PayrollPeriodReadiness`), `calculatePayroll`, error canónico `canonicalErrorResponse`.
- Contrato nuevo o modificado: predicado `requiresPayrollAttendanceSignal` (allowlist positivo); guard de write en el command de contrato; reliability signal `payroll.contract.schedule_regime_mismatch`.
- Backward compatibility: `compatible` (el cambio solo *reduce* falsos requerimientos de asistencia; los dependientes Chile mantienen su comportamiento).
- Full API parity: la regla vive en el primitive `src/lib/payroll/**`, consumida por UI y readers; el guard es command-level, no UI-level.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_core.members`, `greenhouse_payroll.compensation_versions` (lectura).
- Invariantes que no se pueden romper:
  - Asistencia diaria se exige solo a `indefinido`/`plazo_fijo` (dependiente Chile) con `scheduleRequired !== false`.
  - `daily_required = true` solo es válido en régimen dependiente Chile.
  - No aplicar deducciones/estatutos Chile a `international_internal` (invariante de dominio existente).
- Tenant/space boundary: payroll opera sobre members activos; sin cambio de boundary.
- Idempotency/concurrency: backfill idempotente (`WHERE daily_required = true AND contract no-Chile`); guard sincrónico en el command.
- Audit/outbox/history: el backfill queda registrado en el commit + migration; el guard emite error canónico; el drift se observa vía reliability signal (append-only en su tabla de runs).

### Migration, backfill and rollout

- Migration posture: `backfill` (normaliza `daily_required` incoherente) — additive, no destructiva.
- Default state: `enabled with rationale` (el fix de derivación es seguro/aditivo; sin flag — reduce falsos blockers).
- Backfill plan: dry-run (SELECT de filas afectadas) → apply (UPDATE acotado a régimen no-Chile) → verify count 0 restante. Batch chico (población pequeña).
- Rollback path: revert PR del código; el backfill es reversible por naturaleza (los valores previos se pueden restaurar si se requiere, pero `true` en régimen no-Chile era el estado inválido).
- External coordination: `N/A — repo-only change` (sin secrets/env/provider). Sign-off HR recomendado por ser dominio payroll.

### Security and access

- Auth/access gate: el command de contrato ya está detrás de capability/rol HR; sin cambio de gate.
- Sensitive data posture: `payroll` — no loggear PII; el detector reporta `member_id` + régimen, no datos sensibles.
- Error contract: guard de write usa `canonicalErrorResponse` (código nuevo, ej. `daily_required_incompatible_with_regime`).
- Abuse/rate-limit posture: `N/A` — mutación gobernada interna.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding`, `pnpm exec eslint src/lib/payroll`, `pnpm typecheck`.
- DB/runtime checks: `getPayrollPeriodReadiness('2026-06')` contra PG (script tsx) ⇒ `blockingIssues = []`; verificar migration con SELECT post-apply.
- Integration checks: `N/A`.
- Reliability signals/logs: `payroll.contract.schedule_regime_mismatch` en `0` post-backfill.
- Production verification sequence: ver §Rollout Plan.

### Acceptance criteria additions

- [ ] Source of truth (`members.daily_required` + predicado régimen-autoritativo), contract surface y consumers nombrados con paths reales.
- [ ] Invariantes, boundary y idempotencia del backfill explícitos.
- [ ] Migration/backfill/rollback posture explícita y proporcional (backend-critical, payroll).
- [ ] Evidencia runtime/DB listada (readiness `2026-06` + migration verify + signal 0).
- [ ] Dominio sensible con error canónico + signal + sin leaks de PII.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Derivación régimen-autoritativa (unblock)

- Reescribir `requiresPayrollAttendanceSignal` como allowlist positivo: `isChileDependentContract(contractType) && scheduleRequired !== false`, con `isChileDependentContract = contractType === 'indefinido' || contractType === 'plazo_fijo'`.
- Aplicar el mismo predicado en `calculate-payroll.ts` (o extraer al helper compartido para que ambos consumers lo usen).
- Test de regresión en `payroll-readiness.test.ts`: `international_internal` + `daily_required=true` + `attendance_daily` vacía ⇒ `calculation.ready = true`; y un `indefinido` con `scheduleRequired` sin señal sigue bloqueando.

### Slice 2 — Write-path guard (prevención)

- En el command que setea `daily_required` (`postgres-store.ts`), rechazar `daily_required = true` cuando el contractType no es dependiente Chile, con `canonicalErrorResponse` (código nuevo).
- Coverage del guard (rechaza incoherente, permite Chile dependiente).

### Slice 3 — Normalización de data existente (backfill)

- Migration `-- Up Migration` con marker + bloque `DO` de verificación: `UPDATE greenhouse_core.members SET daily_required = false` para members cuyo contractType vigente no es dependiente Chile y tienen `daily_required = true`.
- Verify post-apply: count de filas incoherentes = 0 (incluye Maria Fernanda `7da60123`).

### Slice 4 — Detector de drift (resiliencia)

- Reliability signal `payroll.contract.schedule_regime_mismatch` (steady=0) que lista members con `daily_required=true` en régimen no-Chile. Registrar en `/admin/operations`.

## Out of Scope

- Poblar `greenhouse.attendance_daily` / integración de asistencia Teams (riesgo latente separado — candidato a issue propio).
- Cambiar el cálculo de deducciones, gratificación o retención SII.
- Cambiar el requisito de KPI ICO (`requiresPayrollKpi`) — es ortogonal y correcto.
- UI: no se cambia el banner de readiness ni se agrega naming del colaborador bloqueante (posible follow-up UX).

## Detailed Spec

Ver ISSUE-115 para la cadena causal completa con evidencia runtime (reader real, `attendance_daily` vacía, comparación Maggie vs Maria Fernanda). El principio rector: **el régimen de contrato es la fuente de verdad de si la asistencia afecta el pago; `daily_required` solo modula dentro de un régimen que la soporta.** El predicado pasa de denylist (`!= honorarios && != deel`) a allowlist (`isChileDependentContract && scheduleRequired !== false`), de modo que régimenes internacionales nuevos default a "no requiere asistencia" (fail-safe, escalable).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (derivación) ship primero — es el unblock y es seguro/aditivo.
- Slice 2 (guard) → Slice 3 (backfill): el guard debe existir antes o junto con el backfill para que la re-entrada no reintroduzca data incoherente.
- Slice 4 (detector) corre después de Slice 3 para que arranque en steady=0. Puede ir en el mismo PR o siguiente.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El allowlist excluye por error a un dependiente Chile real y su nómina no exige asistencia | payroll | low | test cubre `indefinido` sigue exigiendo; gate `vitest run src/lib/payroll` | falla de test / readiness no bloquea a Chile dependiente |
| El backfill toca filas que no debía (régimen mal resuelto) | migration / payroll | low | dry-run SELECT + WHERE acotado por contractType vigente + verify post-apply | count post-apply ≠ 0 |
| El guard rompe un write legítimo de `daily_required` en Chile | command | low | guard solo rechaza `true` en no-Chile; coverage explícito | error canónico inesperado en logs |
| Regresión en finiquito/offboarding por tocar predicado compartido | payroll | low | gate `vitest run src/lib/payroll src/lib/workforce/offboarding` verde | rojo en suite offboarding |

### Feature flags / cutover

Sin flag — el cambio de derivación es aditivo/seguro (solo reduce falsos requerimientos de asistencia; los dependientes Chile mantienen su gate). Revert = revert PR + redeploy. Si se prefiere gradualidad, el guard (Slice 2) puede quedar en modo warn antes de 422; declararlo en el plan del agente.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR + redeploy | <10 min | si |
| Slice 2 | revert PR (guard) + redeploy | <10 min | si |
| Slice 3 | migration inversa restaura valores previos si se snapshotea antes del apply; el estado `true` en no-Chile era inválido | <15 min | parcial |
| Slice 4 | signal read-only; revert PR | <10 min | si |

### Production verification sequence

1. Local: `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` + `pnpm typecheck` verdes.
2. Local/staging: `getPayrollPeriodReadiness('2026-06')` contra PG ⇒ `blockingIssues = []`.
3. Staging: `pnpm migrate:up` + verify count filas incoherentes = 0.
4. Staging: readiness `2026-06` + **Calcular** habilitado (agent auth + GVC/curl).
5. Producción: repetir migrate + verify + readiness. Monitor signal `schedule_regime_mismatch` = 0 durante 7d.

### Out-of-band coordination required

`N/A — repo-only change`. Sign-off HR recomendado por ser payroll (comunicar que `international_internal` deja de requerir asistencia diaria — es el comportamiento correcto de su régimen).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `requiresPayrollAttendanceSignal` exige asistencia solo para `indefinido`/`plazo_fijo` con `scheduleRequired !== false`; ningún `daily_required` la habilita fuera de Chile.
- [ ] El mismo predicado se aplica en `calculate-payroll.ts` (o vía helper compartido) — sin divergencia entre readiness y calculate.
- [ ] El write-path rechaza `daily_required = true` en régimen no-Chile con error canónico.
- [ ] Migration normaliza las filas incoherentes; verify post-apply = 0 (incluida `7da60123`).
- [ ] Reliability signal `payroll.contract.schedule_regime_mismatch` existe y reporta 0 post-backfill.
- [ ] `getPayrollPeriodReadiness('2026-06')` ⇒ `blockingIssues = []` y **Calcular** habilitado.
- [ ] `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` verde (sin regresión finiquito/offboarding).

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (foco: `src/lib/payroll`, `src/lib/workforce/offboarding`)
- Script tsx: `getPayrollPeriodReadiness('2026-06')` contra PG (proxy/connector) ⇒ readiness ready.
- `pnpm migrate:up` + SELECT verify de filas incoherentes = 0.

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla).
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`).
- [ ] `docs/tasks/README.md` sincronizado con el cierre.
- [ ] `Handoff.md` actualizado con lo implementado y verificado.
- [ ] `changelog.md` actualizado (cambio de comportamiento: régimen autoritativo sobre asistencia).
- [ ] chequeo de impacto cruzado sobre tasks payroll/workforce afectadas.
- [ ] ISSUE-115 movido a `docs/issues/resolved/` + tracker actualizado.

## Follow-ups

- Issue de verificación: `greenhouse.attendance_daily` vacía (integración Teams no poblando) — trabajadores dependientes Chile con jornada bloquearían la nómina cuando entren a un período.
- Follow-up UX: el banner de readiness debería nombrar al colaborador bloqueante y la causa, no solo el conteo.

## Open Questions

- Confirmar durante Discovery el nombre exacto del command que muta `daily_required` y su ruta de autorización.
- Confirmar el path/patrón canónico del reliability signal (`src/lib/reliability/queries/**`) para nombrar el archivo del detector.
