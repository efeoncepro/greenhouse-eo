# TASK-1347 — Payroll attendance requirement: el régimen es autoritativo sobre `daily_required`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
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
- Backend impact: `reader`
- Epic: `none`
- Status real: `En ejecucion`
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

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: predicado `requiresPayrollAttendanceSignal` + derivación `scheduleRequired` (régimen de contrato como fuente de verdad; `SCHEDULE_DEFAULTS` en `hr-contracts.ts`)
- Consumidores afectados: `payroll readiness reader, calculate-payroll, project-payroll, UI Nómina mensual`
- Runtime target: `staging` → `production` (code-only)

### Contract surface

- Contrato existente a respetar: `getPayrollPeriodReadiness` (shape `PayrollPeriodReadiness`), `calculatePayroll`, `resolveScheduleRequired` + `SCHEDULE_DEFAULTS` (hr-contracts.ts).
- Contrato nuevo o modificado: predicado `requiresPayrollAttendanceSignal` (allowlist régimen-scoped) + helper `isChileDependentContract`; read mapper `postgres-store.ts:488` ruteado por `resolveScheduleRequired`.
- Backward compatibility: `compatible` (el cambio solo *reduce* falsos requerimientos de asistencia; los dependientes Chile mantienen su comportamiento).
- Full API parity: la regla vive en el primitive `src/lib/payroll/**` + `src/types/hr-contracts.ts`, consumida por readers y UI; un único predicado, muchos consumers.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna mutación; solo lectura de `greenhouse_payroll.compensation_versions` + `greenhouse_core.members.daily_required`.
- Invariantes que no se pueden romper:
  - Asistencia diaria se exige solo a régimen dependiente Chile (`indefinido`/`plazo_fijo`).
  - `SCHEDULE_DEFAULTS.overridable` es autoritativo sobre `daily_required` en la derivación de `scheduleRequired`.
  - No aplicar deducciones/estatutos/mecánicas de asistencia Chile a `international_internal` (invariante de dominio existente).
- Tenant/space boundary: payroll opera sobre members activos; sin cambio de boundary.
- Idempotency/concurrency: `N/A` — sin writes, sin migración, cambio de lógica puro.
- Audit/outbox/history: `N/A` — no hay mutación de estado.

### Migration, backfill and rollout

- Migration posture: `none` (cambio code-only; sin DDL ni data mutation).
- Default state: `enabled with rationale` (aditivo/seguro; solo reduce falsos blockers de asistencia; sin flag).
- Backfill plan: `N/A` — la data `daily_required=true` en régimen internacional es válida (`overridable`), no se normaliza.
- Rollback path: revert PR + redeploy (<10 min).
- External coordination: `N/A — repo-only change`. Sign-off HR recomendado por ser dominio payroll.

### Security and access

- Auth/access gate: sin cambio — no se agregan endpoints ni commands.
- Sensitive data posture: `payroll` — no loggear PII; el fix es lógica pura.
- Error contract: sin nuevos errores client-facing (no hay write guard nuevo).
- Abuse/rate-limit posture: `N/A`.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding`, `pnpm exec eslint src/lib/payroll`, `pnpm typecheck`.
- DB/runtime checks: `getPayrollPeriodReadiness('2026-06')` contra PG (script tsx) ⇒ `blockingIssues = []`.
- Integration checks: `N/A`.
- Reliability signals/logs: `N/A` (sin signal nuevo).
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

> **Recalibrado en Discovery (ver `## Delta 2026-07-06`).** El diseño original de 4 capas (guard + backfill + detector) asumía que `daily_required=true` en régimen internacional era data *incoherente*. Discovery encontró la política canónica `SCHEDULE_DEFAULTS` (hr-contracts.ts:57) donde ese flag es `overridable: true` para régimenes internacionales → es data **válida**, no incoherente. Por eso el fix robusto se reduce a corregir el **primitive** (predicado régimen-scoped + read mapper que honra la política), sin mutar data válida ni agregar detectores sobre data válida.

### Slice 1 — Predicado de asistencia régimen-scoped (core fix + unblock)

- Agregar helper canónico `isChileDependentContract(contractType)` (= `indefinido | plazo_fijo`) en `src/types/hr-contracts.ts`, junto a `CONTRACT_DERIVATIONS`/`SCHEDULE_DEFAULTS`.
- Reescribir `requiresPayrollAttendanceSignal` como allowlist positivo anclado al régimen: `isChileDependentContract(contractType)`. La asistencia diaria solo afecta el pago en régimen dependiente Chile; ningún `daily_required`/`scheduleRequired` la habilita fuera de Chile. Régimenes internacionales nuevos default a "no requiere" (fail-safe, escalable).
- El helper es consumido por los 3 callsites existentes sin cambios (payroll-readiness.ts:293, calculate-payroll.ts:528, project-payroll.ts:266) — todos se benefician del mismo predicado.
- Tests exhaustivos en `compensation-requirements.test.ts`: los 6 contract types × `scheduleRequired` true/false/undefined ⇒ solo `indefinido`/`plazo_fijo` requieren asistencia. Regresión en `payroll-readiness.test.ts`: `international_internal` + `daily_required=true` + `attendance_daily` vacía ⇒ `calculation.ready = true`.

### Slice 2 — Read mapper honra la política `overridable` (coherencia / no parche)

- Corregir el read mapper `mapCompensation` en `postgres-store.ts:488`: reemplazar el bypass `row.daily_required ?? resolveScheduleRequired({ contractType })` por `resolveScheduleRequired({ contractType, scheduleRequired: row.daily_required })`, de modo que la política `SCHEDULE_DEFAULTS.overridable` sea autoritativa (igual que el write path `resolveMemberContractForCompensation:733` y el BQ mapper `get-compensation.ts:238` ya lo hacen). Cierra el smell de precedencia invertida donde un flag crudo le ganaba al resolver canónico.
- Nota: sin efecto de runtime hoy (ningún calculador consume `scheduleRequired`; su único consumer funcional era el predicado, ahora régimen-scoped), pero elimina el trap latente para el día que aparezca un dependiente Chile con `daily_required` inconsistente.

## Out of Scope

- **Write-path guard / migration-backfill / reliability signal** (diseño original): eliminados en Discovery — la data `daily_required=true` en régimen internacional es válida (`overridable: true`), no incoherente; no se justifica rechazarla, mutarla ni detectarla. Maria Fernanda (`7da60123`) NO necesita data-fix.
- Poblar `greenhouse.attendance_daily` / integración de asistencia Teams (riesgo latente separado — ver Follow-ups).
- Cambiar el cálculo de deducciones, gratificación o retención SII.
- Cambiar el requisito de KPI ICO (`requiresPayrollKpi`) — ortogonal y correcto.
- Remover el campo `scheduleRequired` de `CompensationVersion` (quedó sin consumer funcional tras Slice 1, pero removerlo es refactor aparte con riesgo).
- UI: no se cambia el banner de readiness ni se agrega naming del colaborador bloqueante (posible follow-up UX).

## Detailed Spec

Ver ISSUE-115 para la cadena causal completa con evidencia runtime (reader real, `attendance_daily` vacía, comparación Maggie vs Maria Fernanda). El principio rector: **el régimen de contrato es la fuente de verdad de si la asistencia afecta el pago; `daily_required` solo modula dentro de un régimen que la política declara `overridable`.** El predicado pasa de denylist (`!= honorarios && != deel && scheduleRequired !== false`) a allowlist régimen-scoped (`isChileDependentContract`), de modo que régimenes internacionales (presentes y futuros) default a "no requiere asistencia".

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (predicado) es el unblock y es seguro/aditivo — ship primero.
- Slice 2 (read mapper coherencia) es independiente e inerte hoy; puede ir en el mismo PR después de Slice 1.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El allowlist excluye por error a un dependiente Chile real y su nómina no exige asistencia | payroll | low | tests cubren `indefinido`/`plazo_fijo` siguen exigiendo; gate `vitest run src/lib/payroll` | falla de test / readiness no bloquea a Chile dependiente |
| Régimen internacional con pago dependiente de asistencia queda sin exigirla | payroll | low | por diseño de dominio no aplican mecánicas de asistencia Chile a régimen internacional (invariante `international_internal`) | N/A — comportamiento correcto del régimen |
| Regresión en finiquito/offboarding por tocar predicado compartido | payroll | low | gate `vitest run src/lib/payroll src/lib/workforce/offboarding` verde | rojo en suite offboarding |

### Feature flags / cutover

Sin flag — el cambio es aditivo/seguro (solo reduce falsos requerimientos de asistencia; los dependientes Chile mantienen su gate). Revert = revert PR + redeploy (<10 min). No hay migración ni data mutation, por lo que el cutover es inmediato y sin backfill.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR + redeploy | <10 min | si |
| Slice 2 | revert PR + redeploy | <10 min | si |

### Production verification sequence

1. Local: `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` + `pnpm typecheck` verdes.
2. Local: `getPayrollPeriodReadiness('2026-06')` contra PG (script tsx) ⇒ `blockingIssues = []`.
3. `pnpm test` full + `pnpm build` (gate de cierre).
4. Deploy code (sin migración ni backfill). Post-deploy: readiness `2026-06` + **Calcular** habilitado (agent auth + curl/GVC).

### Out-of-band coordination required

`N/A — repo-only change` (sin migración, sin backfill, sin flags/env). Sign-off HR recomendado por ser payroll (comunicar que `international_internal` deja de requerir asistencia diaria — es el comportamiento correcto de su régimen).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `requiresPayrollAttendanceSignal` exige asistencia solo para régimen dependiente Chile (`indefinido`/`plazo_fijo`); ningún `daily_required`/`scheduleRequired` la habilita fuera de Chile.
- [ ] Existe el helper canónico `isChileDependentContract` en `src/types/hr-contracts.ts` y es la única definición del predicado de régimen dependiente Chile usada por el módulo.
- [ ] El read mapper `postgres-store.ts:488` usa `resolveScheduleRequired({ contractType, scheduleRequired: row.daily_required })` (sin el bypass `??`), honrando `SCHEDULE_DEFAULTS.overridable`.
- [ ] Tests: los 6 contract types × `scheduleRequired` true/false/undefined ⇒ solo `indefinido`/`plazo_fijo` requieren asistencia; regresión `international_internal` + `daily_required=true` ⇒ readiness ready.
- [ ] `getPayrollPeriodReadiness('2026-06')` ⇒ `blockingIssues = []` y **Calcular** habilitado.
- [ ] `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` verde (sin regresión finiquito/offboarding).

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (foco: `src/lib/payroll`, `src/lib/workforce/offboarding`) + full suite como gate de cierre
- `pnpm build`
- Script tsx: `getPayrollPeriodReadiness('2026-06')` contra PG (connector) ⇒ readiness ready.

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

- Resueltas en Discovery — ver `## Delta 2026-07-06`.

## Delta 2026-07-06

Discovery recalibró el diseño (FASE 2, supuesto invalidado):

- **Supuesto original:** `daily_required=true` en régimen internacional es data incoherente → guard + backfill + reliability signal.
- **Realidad (verificada):** existe política canónica `SCHEDULE_DEFAULTS` (`src/types/hr-contracts.ts:57`) con `overridable: true` para `honorarios`/`contractor`/`eor`/`international_internal` → `daily_required=true` ahí es **válido**. Además el write path (`resolveMemberContractForCompensation:733`) y el BQ mapper (`get-compensation.ts:238`) ya honran la política; solo el read mapper PG (`postgres-store.ts:488`) tenía el bypass `??`. Data real: 0 trabajadores dependientes Chile hoy; `daily_required=true` presente también en 2 contractor + 1 honorarios (validado, no bloquean porque el denylist los excluía). Solo `international_internal` se colaba.
- **Efecto en scope:** eliminados el write-path guard, la migration/backfill y el reliability signal (habrían rechazado/mutado/detectado data válida — over-engineering). Maria Fernanda (`7da60123`) NO necesita data-fix. El fix robusto queda en el primitive: predicado régimen-scoped (Slice 1) + read mapper coherente con la política (Slice 2). `Backend impact` recalibrado `migration → reader`; sin flag, sin migración.
