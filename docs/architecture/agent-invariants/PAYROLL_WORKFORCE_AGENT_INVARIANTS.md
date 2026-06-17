# Invariantes operativos para agentes — Payroll/Workforce participation + exit (TASK-890…895)

---

## Invariantes operativos para agentes — Payroll/Workforce participation + exit (TASK-890…895)

> **Relocados de `CLAUDE.md` por TASK-1160 (2026-06-16), verbatim — cero cambio semántico.** Espejo operativo (NUNCA/SIEMPRE) de payroll participation/exit + person reconciliation + offboarding closure. Contrato por sub-área: `GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md`, `GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md`, `GREENHOUSE_PERSON_LEGAL_RELATIONSHIP_RECONCILIATION_V1.md`, `GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`. Skill: `greenhouse-payroll-auditor`. Dedup = TASK-1160 Slice 4.

### Workforce Exit Payroll Eligibility invariants (TASK-890, desde 2026-05-15)

Toda decision "este miembro esta en scope payroll en este periodo" pasa por el **resolver canonico server-only** `src/lib/payroll/exit-eligibility/`. Reemplaza el patron actual donde el reader payroll embebia el gate inline (`NOT EXISTS offboarding_cases WHERE status='executed' AND last_working_day < periodStart`), ignorando casos `external_payroll` (Deel/EOR) que cierran via proveedor externo sin transicionar a `executed`.

Bug class disparador: caso `EO-OFF-2026-0609A520` Maria Camila Hoyos, lane `external_payroll`/Deel `last_working_day=2026-05-14` status `draft`. Nomina proyectada mostraba full-month USD 530 para mayo 2026 porque external_payroll cierra fuera del state machine interno.

**Read API canonico** (`src/lib/payroll/exit-eligibility/index.ts`):

- `resolveExitEligibilityForMembers(memberIds, periodStart, periodEnd) → Map<memberId, WorkforceExitPayrollEligibilityWindow>` — bulk-first. Devuelve `projectionPolicy` (`full_period | partial_until_cutoff | exclude_from_cutoff | exclude_entire_period`) + `eligibleFrom/eligibleTo` + `cutoffDate` + `warnings[]`.
- `isMemberInPayrollScope(memberId, asOf) → boolean` — thin predicate wrapper para capability gates, drawer state, checks single-member.

**Matriz canonica per lane** (§2 ADR):

| `rule_lane` (DB) | Threshold de exclusion | Policy con cutoff en periodo |
|---|---|---|
| `internal_payroll` / `relationship_transition` | `status = 'executed'` | `partial_until_cutoff` (prorratear hasta LWD) |
| `external_payroll` / `non_payroll` | `status IN ('approved','scheduled','executed')` | `exclude_from_cutoff` (Greenhouse no paga internal) |
| `identity_only` | N/A — siempre `full_period` | Identity ortogonal a payroll |
| `unknown` | conservador — `full_period` + warning `unclassified_lane` | — |

**Rationale asymmetric threshold**: internal_payroll requiere `executed` porque Greenhouse paga finiquito Chile que debe estar emitido + ratificado (TASK-862/863). External_payroll/Deel nunca paga Greenhouse; `approved` es momento canonico de decision firmada. Esperar `executed` para evento que vive afuera del runtime Greenhouse es deuda operativa permanente.

**Cutoff canonico**: `COALESCE(last_working_day, effective_date)`. Schema CHECK constraints (TASK-760) garantizan `effective_date NOT NULL` en `approved+` y `last_working_day NOT NULL` en `scheduled+`. NUNCA usar `last_working_day` solo — entre `approved` y `scheduled` puede ser NULL.

**Feature flag canonico** `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED` (default `false` V1.0):

- `false` (default): `pgGetApplicableCompensationVersionsForPeriod` mantiene gate legacy bit-for-bit (solo excluye `executed` AND `last_working_day < periodStart`). Zero-risk parity.
- `true` (post staging shadow compare ≥7d con Maria-fixture verde): post-filter via resolver + attach `exitEligibilityWindow?: WorkforceExitPayrollEligibilityWindow` opcional al row para que consumers downstream (`project-payroll.ts`) puedan prorratear.

Pattern fuente: `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED` (TASK-872).

**Degraded mode honesto**: si `resolveExitEligibilityForMembers` falla (DB transient, schema drift), `captureWithDomain('payroll', err, { source: 'exit_eligibility.integration_degraded' })` + fallback a legacy SQL path. Payroll nunca rompe full. Reliability signal `payroll.exit_eligibility.bq_fallback_invoked` cubre detection en V1.1.

**Lint rule canonica** `greenhouse/no-inline-payroll-scope-gate` (modo `warn` V1.0, promueve a `error` post 30d steady): detecta SQL embebido con `NOT EXISTS ... work_relationship_offboarding_cases ... status='executed' AND last_working_day` o variantes EXISTS positive. Override block exime: `src/lib/payroll/exit-eligibility/**`, `src/lib/payroll/postgres-store.ts` (gate legacy behind flag — grandfathered), tests del rule.

**⚠️ Reglas duras**:

- **NUNCA** filtrar inclusion payroll inline en un SQL embebido en TS. Toda decision pasa por `resolveExitEligibilityForMembers` o `isMemberInPayrollScope`. Lint rule bloquea regresion.
- **NUNCA** distinguir entre `rule_lane` valores con strings literales en consumers. Usar enum `ExitLane` del resolver (DB-aligned 1:1) o consumer reads `projectionPolicy` directly.
- **NUNCA** mezclar el gate de intake (`workforce_intake_status` TASK-872) con el gate de exit (`exitLane × status`). Son ortogonales by design — features distintos.
- **NUNCA** modificar el threshold por lane sin actualizar AMBOS: matriz §2 ADR + tests anti-regresion + lint rule + reliability signal evidence.
- **NUNCA** ejecutar payroll real (no proyectada) sin que el mismo resolver filtre las compensation versions aplicables. Single source of truth across projected + actual.
- **NUNCA** auto-mutar Person 360 desde read path. Solo signal en V1 (Slice 6). Write reconciliation = command auditado V1.1+.
- **NUNCA** usar `last_working_day` solo como cutoff. Toda decision usa `COALESCE(last_working_day, effective_date)`. Schema CHECK invariants TASK-760 garantizan que `effective_date` esta poblado en `approved+`.
- **NUNCA** invocar `Sentry.captureException()` directo en este path. Usar `captureWithDomain(err, 'payroll' | 'hr' | 'identity', { tags: { source: 'exit_eligibility_*' } })`.
- **NUNCA** modificar el shape de `WorkforceExitPayrollEligibilityWindow` sin actualizar consumers en el mismo PR. Tipo es contractual cross-module.
- **NUNCA** activar `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED=true` en production sin: (a) staging shadow compare verde >=7d; (b) Maria-like fixture green; (c) signal `payroll.exit_window.full_month_projection_drift` count=0 sustained.
- **NUNCA** un consumer payroll que necesite saber "este miembro esta en scope" recomputa el gate inline. Opciones canonicas en orden de preferencia:
  1. Lee `exitEligibilityWindow` del row mapped que devuelve `pgGetApplicableCompensationVersionsForPeriod` (auto-attached cuando flag activo).
  2. Llama `resolveExitEligibilityForMembers(memberIds, periodStart, periodEnd)` directamente (bulk).
  3. Llama `isMemberInPayrollScope(memberId, asOf)` para single-member checks (capability gates, drawer state).
- **SIEMPRE** que emerja un `rule_lane` nuevo en schema (e.g. `eor_provider`, `intercompany_loan`), extender §2 tabla ADR + `ExitLane` type + matriz `derivePolicy` + tests + lint rule en el mismo PR.
- **SIEMPRE** que un consumer nuevo necesite "members en scope laboral interno" (capacity, staffing, cost attribution), llamar al resolver. Cero composicion ad-hoc.
- **SIEMPRE** que BQ fallback path se invoque (cuando emerja replicacion en BQ V1.1+), emitir `captureWithDomain('payroll', warn, { source: 'bq_fallback_no_exit_gate' })`.

**Spec canonica**: `docs/architecture/GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md`. Task: `docs/tasks/in-progress/TASK-890-workforce-exit-payroll-eligibility-window.md`. Patrones fuente: TASK-571/766/774 (VIEW canonica + helper + signal + lint), TASK-742 (defense-in-depth), TASK-872 (feature flag gate), TASK-720 (TS-only declarative reader), TASK-672 (rich struct + thin predicate).

### Payroll Participation Window invariants (TASK-893, desde 2026-05-16)

Toda decision "esta persona participa en este periodo y por cuanto" pasa por el **resolver canonico server-only** `src/lib/payroll/participation-window/`. Compone TASK-890 (exit eligibility) + compensation effective dating + observe-only onboarding source. Reemplaza el patron legacy donde `prorateEntry` rescala monetary fields post-hoc (rompe `chileGratificacionLegalAmount` cap, `chileTotalDeductions` aggregate, `siiRetentionAmount` traceability).

**Pattern canonico (BL-1)**: escalar la compensation **antes** de `buildPayrollEntry`, NUNCA rescale post-hoc del output. La canonical calculator recomputa deducciones, gratificacion legal cap, y retencion SII desde las bases prorrateadas.

**Read API canonico** (`src/lib/payroll/participation-window/`):

- `resolvePayrollParticipationWindowsForMembers(memberIds, periodStart, periodEnd) → Map<memberId, PayrollParticipationWindow>` — canonical bulk resolver.
- `isMemberParticipatingInPayroll(memberId, asOf) → boolean` — thin predicate para capability checks.
- `prorateCompensationForParticipationWindow<T>(compensation, factor) → T` — pure helper que escala los inputs canonicos pre-buildPayrollEntry. Generic over T. Idempotente.
- `derivePayrollParticipationPolicy(facts) → PayrollParticipationWindow` — pure function que computa policy + reason codes + prorationFactor weekday-basis.
- `isPayrollParticipationWindowEnabled() → boolean` — flag check (`PAYROLL_PARTICIPATION_WINDOW_ENABLED`, default `false`).

**Flag dependency canonical**: `PAYROLL_PARTICIPATION_WINDOW_ENABLED=true` REQUIERE `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED=true` en el mismo ambiente. Sin esa pre-condicion, el resolver emite warning `exit_resolver_disabled` por miembro afectado (partial correctness es el peor failure mode). Enforce code-side en `resolver.ts` invocando `isPayrollExitEligibilityWindowEnabled()` explicito.

**4 reliability signals canonicos** bajo subsystem `Finance Data Quality` (moduleKey='finance', mirror TASK-765/766/768/774):

- `payroll.participation_window.full_month_entry_drift` — kind=drift, severity=warning >0, steady=0 post flag-ON. Detecta mid-period entries no prorrateados.
- `payroll.participation_window.source_date_disagreement` — kind=drift, severity=warning >0, steady=0 post-cleanup. Detecta drift compensation.effective_from vs onboarding.start_date > 7 dias.
- `payroll.participation_window.projection_delta_anomaly` — kind=drift, severity=unknown V1.0 (honest degradation; shadow compare wiring es V1.1 follow-up).
- Bonus: lint rule `greenhouse/no-inline-payroll-scope-gate` (TASK-890 herencia) sigue cubriendo el path roster.

**⚠️ Reglas duras**:

- **NUNCA** rescale monetary fields post-`buildPayrollEntry` para members con participation factor < 1. Pattern canonical: escalar compensation primero, dejar al calculator recomputar deducciones + gratificacion legal cap + retencion SII desde gross prorrateado. El helper `prorateCompensationForParticipationWindow` es la unica fuente de truth para ese scale.
- **NUNCA** prorratear `colacionAmount` ni `movilizacionAmount` automaticamente en el path de participation. Son asignaciones no imponibles fijas; la decision es contractual del operador HR (jurisprudencia chilena Art 50 CT no las auto-prorratea).
- **NUNCA** consumir el modulo `participation-window` desde codigo client-side. Server-only enforce con `import 'server-only'`.
- **NUNCA** activar `PAYROLL_PARTICIPATION_WINDOW_ENABLED=true` sin (a) `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED=true` en mismo env, (b) staging shadow compare >=7d verde, (c) HR/Finance written approval en `Handoff.md`, (d) allowlist explicita de members afectados.
- **NUNCA** activar el flag productivo sin haber shippeado la capability `payroll.period.force_recompute` (V1.1 reclassified to pre-flag-ON gate por finance auditor 2026-05-16). Sin esa capability, BL-5 deja al operador stuck cuando necesite recompute en periodo exportado pre-flag-flip.
- **NUNCA** recomputar single-member entry bajo flag ON via `recalculatePayrollEntry`. El path esta blocked con canonical error `recalc_blocked_by_participation_window` para evitar bypass del participation factor. Usar period-level `calculatePayroll` que respeta participation correctamente.
- **NUNCA** recomputar periodo `reopened` bajo flag ON sin capability `payroll.period.force_recompute`. Guard canonico `isReopenedRecomputeBlockedByParticipationWindow(status, flagEnabled)` enforce.
- **NUNCA** consumir `payroll_entries.gross_total` ni cualquier campo devengado para base imponible legal del finiquito (Art 159, 161, 50, 67 CT). Source canonical es `compensation_versions.base_salary` nominal full-month (cross-spec invariant lift en `GREENHOUSE_FINAL_SETTLEMENT_V1_SPEC.md` Delta 2026-05-16).
- **NUNCA** modificar la cap mensual de gratificacion legal (4.75 × IMM ÷ 12 ≈ $213,354 en 2026) para mes parcial. El cap es MENSUAL, NO se prorratea (jurisprudencia chilena Opcion A canonical, Dictamen DT 2937/050 2002). Si HR decide entry month = $0 gratificacion, debe usar `gratificacionLegalMode='ninguna'` (override manual).
- **NUNCA** modelar los dias previos al ingreso contractual como ausencia. Participation NO es attendance. `days_absent`, `daysOnUnpaidLeave`, readiness de asistencia: ninguno debe inflarse para representar no-participacion.
- **SIEMPRE** que un consumer payroll necesite "el monto del mes para member X", leer `payroll_entries.gross_total` (que viene prorrateado correctamente cuando flag ON). NUNCA recomputar inline desde compensation × dias trabajados.
- **SIEMPRE** que emerja un nuevo path que muta o calcula payroll_entries, verificar que invoque `prorateCompensationForParticipationWindow` ANTES de `buildPayrollEntry` (mirror del pattern en `project-payroll.ts` + `calculate-payroll.ts`). Single-member paths bypass son anti-pattern bajo flag ON — blockear con canonical error.

**Spec canonica**: `docs/architecture/GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md` Delta 2026-05-16. Task: `docs/tasks/complete/TASK-893-payroll-participation-window.md`. Pre-flag-ON gates documentados en ADR seccion "Pre-flag-ON-producción gates". Patrones fuente: TASK-890 (exit eligibility composition), TASK-758 (4 regimenes canonicos), TASK-742 (defense-in-depth 7-layer), TASK-872 (flag gate), TASK-765/766/768/774 (reliability signals canonical pattern + builder).

### Leave Accrual Participation-Aware invariants (TASK-895, desde 2026-05-16)

Toda decision de **accrual de feriado legal CL Art 67 CT** para un colaborador en un year pasa por el **resolver canonico server-only** `src/lib/leave/participation-window/`. El resolver es un **year-scope aggregator** que compone TASK-893 (Payroll Participation Window, month-scope) mes a mes + filtra `rule_lane='internal_payroll'` para excluir periodos contractor/honorarios/external. Cierra bug class regulatorio CL: cuando un colaborador transita `contractor → dependent` mid-year, el helper legacy `calculateAccruedLeaveAllowanceDays` ancla accrual desde `members.hire_date` ignorando el periodo non-dependent — generando sobreacumulación + sobrepago al finiquito + precedente contractual riesgoso.

**Read API canonico** (`src/lib/leave/participation-window/`):

- `resolveLeaveAccrualWindowsForMembers(memberIds, year, options?: { asOfDate?: string }) → Map<memberId, LeaveAccrualEligibilityWindow>` — canonical bulk resolver.
- `resolveLeaveAccrualWindowForMember(memberId, year, options?)` — single-member helper.
- `deriveLeaveAccrualPolicy(facts) → LeaveAccrualEligibilityWindow` — pure function (33 tests verde).
- `fetchCompensationFactsForLeaveAccrual(memberIds, yearStart, yearEnd)` — bulk PG query.
- `isLeaveAccrualParticipationAwareEnabled() → boolean` — flag check con triple flag dependency enforcement.
- `buildDegradedLeaveAccrualWindow(...)` — helper canonical para construir degraded windows desde el resolver wrapper.

**Boundary semantic**:

| Domain | Scope | Owns |
|---|---|---|
| Leave (TASK-895) | Year | `LeaveAccrualEligibilityWindow.eligibleDays` + `firstServiceCycleDays` |
| Payroll Participation (TASK-893) | Month | `PayrollParticipationWindow.prorationFactor` + `exitEligibility` |
| Workforce Exit (TASK-890) | Period (case-driven) | `WorkforceExitPayrollEligibilityWindow.projectionPolicy` + `eligibleTo` |

**Flag dependency canonical (triple enforcement)**: `LEAVE_PARTICIPATION_AWARE_ENABLED=true` REQUIERE `PAYROLL_PARTICIPATION_WINDOW_ENABLED=true` AND `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED=true` en el mismo ambiente. El helper `isLeaveAccrualParticipationAwareEnabled()` enforce la dependencia al boundary: retorna `true` solo cuando las 3 flags están ON. Sin esa pre-condición, retorna `false` (legacy bit-for-bit fallback) — degraded honesto.

**Integration canonical en `postgres-leave-store.ts`**: el helper local `tryComputeParticipationAwareAllowanceDays` valida 4 pre-condiciones antes de aplicar la fórmula canonical `roundLeaveDays((annualDays * eligibleDays) / firstServiceCycleDays)`:

1. `isLeaveAccrualParticipationAwareEnabled()` returns true.
2. `policy.accrualType === 'monthly_accrual'`.
3. `member.pay_regime === 'chile'`.
4. Resolver returns `degradedMode === false`.

Si cualquier pre-condición falla → fallback a `calculateAccruedLeaveAllowanceDays` legacy bit-for-bit. Preserva CL legal floor en cada degraded path.

**Reliability signal canonical**: `hr.leave.accrual_overshoot_drift` (kind=`drift`, severity=`warning` si count>0, steady=0 post-flag-ON + re-seed). Subsystem rollup: `'Payroll Data Quality'` (moduleKey `'payroll'`) — unificado con TASK-893 signals. Reader pattern SHAPE detector (NO recompute exacto): identifica miembros con `hire_date` >30 días antes del `MIN(effective_from)` qualifying dependent CL.

**Auditoría canonical**: `pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/leave/audit-accrual-drift.ts --target-year=<year> [--output=<path>]`. Read-only dry-run que reporta drift exacto por miembro (legacy vs participation-aware). Documentado en `docs/operations/runbooks/leave-accrual-drift-audit.md`.

**⚠️ Reglas duras**:

- **NUNCA** reescribir el helper puro `calculateAccruedLeaveAllowanceDays` en `src/lib/hr-core/leave-domain.ts`. Integration ocurre en el call site (`postgres-leave-store.ts:1078,1102`) behind flag. Preserva 7 tests pure verdes legacy + SRP.
- **NUNCA** extender `PayrollParticipationWindow` con `contractType`/`payRegime` para servir a Leave. Leave hace su propia query independiente a `compensation_versions` + compose TASK-893/890 solo para exit cutoff. DAG-leaf rule.
- **NUNCA** importar `@/lib/leave/participation-window` desde un módulo de Payroll. DAG direction: Leave → Payroll, NUNCA reverse. Anti-corruption layer enforced en barrel.
- **NUNCA** computar accrual inline desde `hire_date` solo cuando `LEAVE_PARTICIPATION_AWARE_ENABLED=true` y `memberId` disponible. El call site debe consumir el resolver canónico via `tryComputeParticipationAwareAllowanceDays`.
- **NUNCA** mutar `leave_balances` automáticamente cuando se activa el flag. Backfill audit script V1.1a es read-only dry-run; mutation auditada queda V1.2 con capability `leave.balances.reconcile`.
- **NUNCA** activar `LEAVE_PARTICIPATION_AWARE_ENABLED=true` sin: (a) las dos flags parent ON en mismo env, (b) staging shadow audit ≥30d con signal count=0, (c) HR + Legal written approval en `Handoff.md` con specific members allowlist, (d) audit script S4 dry-run con review HR documentado.
- **NUNCA** consumir el modulo `participation-window` desde codigo client-side. Server-only enforce con `import 'server-only'` en cada archivo del modulo.
- **NUNCA** validar SQL queries de signal readers contra `db.d.ts` shapes inferred como ground truth. **Lección canonical** del hotfix Sentry 2026-05-16: schema real PG es source of truth, no TS types. Future readers DEBEN validar contra PG real via proxy (`pnpm pg:connect:shell` + smoke script) ANTES de mergear. Bug class concreto detectado: `compensation_versions.payroll_via` NO existe en PG real (Kysely codegen drift); `payroll_via` vive en `members`. Y `compensation_versions.effective_from` es `date` no `timestamp` (`date - date = integer`, no `interval`).
- **SIEMPRE** que un consumer downstream necesite "días efectivos de dependent CL en este year", llamar al resolver canonico. Cero composicion ad-hoc.
- **SIEMPRE** que emerja un nuevo path que compute accrual de feriado legal, verificar que pase por `tryComputeParticipationAwareAllowanceDays` (mirror del pattern aplicado a `computeBalanceSeedForYear`). Single source of truth canonical.

**Open questions (deliberadamente NO en V1.1a)**:

- Honorarios + feriado proporcional opcional: hoy NO. Solo `dependent` (`indefinido`/`plazo_fijo`).
- Saldos negativos por vacaciones tomadas pre-transición contractor→dependent: V1.2 write-path reconciliation con capability `leave.balances.reconcile`.
- Tracking historical de `members.payroll_via` (cambios mid-year): V1.2 si emerge necesidad concreta.

**Spec canonica**: `docs/architecture/GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md` Delta 2026-05-16 §"TASK-895 V1.1a S0". Task: `docs/tasks/complete/TASK-895-leave-accrual-participation-aware.md`. Runbook: `docs/operations/runbooks/leave-accrual-drift-audit.md`. Patrones fuente: TASK-893 (month-scope primitive composer), TASK-890 (exit lanes), TASK-742 (defense-in-depth flag dependency).

### Person 360 Relationship Reconciliation invariants (TASK-891, desde 2026-05-15)

Toda mutación de relaciones legales (`greenhouse_core.person_legal_entity_relationships`) que cierre una relación activa y abra una nueva en su lugar — el caso disparador es drift `member.contract_type='contractor' / payroll_via='deel'` con relación activa `'employee'` — **debe** pasar por el helper canónico `reconcileMemberContractDrift` (`src/lib/person-legal-entity-relationships/reconcile-drift.ts`). NUNCA SQL inline en consumers; NUNCA auto-mutar desde cron / read path.

**Read API canónico**:

- Helper canónico: `reconcileMemberContractDrift(input)` en `src/lib/person-legal-entity-relationships/reconcile-drift.ts`. Composes `endPersonLegalEntityRelationship` (TASK-337) + `createContractorLegalEntityRelationship` (TASK-337) envueltos en `withGreenhousePostgresTransaction` atomic. REUSE > CREATE.
- Error class: `PersonRelationshipReconciliationError` con 8 codes canónicos (`reason_too_short`, `member_not_found`, `member_inactive`, `member_missing_identity_profile`, `no_active_employee_relationship`, `multiple_active_employee_relationships`, `invalid_contractor_subtype`, `invalid_external_close_date`). Es-CL safe para exponer en API boundary.
- Route handler: `POST /api/admin/person/relationships/[memberId]/reconcile-drift`.
- UI form: `/admin/identity/drift-reconciliation?memberId=<id>`. Reachable vía deep link desde signal alert.

**Defense in depth dual-gate**:

- DB: capability seed en `greenhouse_core.capabilities_registry` (migration `20260515150631235_task-891-...`).
- App: `requireAdminTenantContext` (route_group=admin + role=EFEONCE_ADMIN) + `can(subject, 'person.legal_entity_relationships.reconcile_drift', 'update', 'tenant')`.
- TS catalog: `src/config/entitlements-catalog.ts` con `module='people'` (alineado con TASK-784 `person.legal_profile.*`).
- Runtime grant: `src/lib/entitlements/runtime.ts`. V1.0 grant **SOLO EFEONCE_ADMIN** (drift Person 360 cross-domain). Delegación a HR queda V1.1+.

**Auto-escalation severity** del signal `identity.relationship.member_contract_drift`:

- `count = 0` → `ok`
- `count > 0 AND oldestDriftAgeDays < 30` → `warning` (reciente)
- `count > 0 AND oldestDriftAgeDays >= 30` → `error` (sostenido, write path disponible)
- `query falla` → `unknown`

Threshold `SUSTAINED_DRIFT_THRESHOLD_DAYS = 30` (mismo bar TASK-848/849 production release stale_approval).

**Outbox events**: NO crear `.reconciled` v1 nuevo. Reusar `.deactivated` + `.created` existentes con `metadata_json.reconciliationContext = { commandId: 'reconcile-member-contract-drift', supersededRelationshipId, supersededRelationshipType, reason, actorUserId, reconciledAt, externalCloseDate, contractorSubtype }` en la new row. Correlation forensic via `actor_user_id` idéntico + `created_at` mismo segundo + metadata.

**Notes marker append-only** (forensic readable):

- Legacy row (status='ended'): `[TASK-891 reconciled by actor=USER_ID on YYYY-MM-DD — superseded by new contractor relationship] <reason>`
- New row (status='active'): `Reconciled from employee via TASK-891 (actor=USER_ID, YYYY-MM-DD) — reason: <reason>`

**Reason length**: `>= 20 chars` (bar más alto que TASK-890 close_external_provider `>= 10` porque blast Person 360 es cross-domain — payroll readiness, payslips, reportes legales, ICO). Pattern fuente TASK-848 production release bypass.

**⚠️ Reglas duras**:

- **NUNCA** ejecutar `DELETE FROM person_legal_entity_relationships`. Solo supersede via `effective_to + status='ended'`. Append-only audit.
- **NUNCA** escribir SQL inline en consumers que muten `person_legal_entity_relationships`. Toda mutación pasa por helpers canónicos del módulo (`endPersonLegalEntityRelationship`, `createContractorLegalEntityRelationship`, `reconcileMemberContractDrift`).
- **NUNCA** auto-mutar Person 360 desde un read path / cron / cleanup automático. V1.0 es operator-initiated single-member. V2 (cron) requiere ADR nuevo + HR approval explícito.
- **NUNCA** fabricar `relationship_type` fuera del enum del schema (`shareholder`, `founder`, `legal_representative`, `board_member`, `executive`, `employee`, `contractor`, `shareholder_current_account_holder`, `lender_to_entity`, `borrower_from_entity`). TASK-891 V1.0 solo soporta target `contractor` con subtype en `metadata_json.relationshipSubtype`.
- **NUNCA** mutar a María Camila Hoyos como parte de TASK-891. Recovery espera staging synthetic fixture verde + HR approval explícito + ejecución vía dialog UI con reason ≥20 chars.
- **NUNCA** emitir el evento `.reconciled` (no existe en V1.0). Reusar `.deactivated` + `.created` + metadata correlation.
- **NUNCA** grant `person.legal_entity_relationships.reconcile_drift` a HR ni FINANCE_ADMIN en V1.0. Solo EFEONCE_ADMIN. Delegación = decisión V1.1.
- **NUNCA** exponer `error.message` raw desde el route handler. Sanitiza via canonical error response con `code + actionable + evidence` + `captureWithDomain('identity', err, ...)`.
- **NUNCA** invocar `Sentry.captureException()` directo en este path. Usar `captureWithDomain(err, 'identity', { tags: { source: 'person_relationship_reconcile_drift' } })`.
- **SIEMPRE** envolver UPDATE legacy + INSERT new + outbox publish en `withGreenhousePostgresTransaction`. Si cualquier paso falla, rollback completo.
- **SIEMPRE** validar `reason.trim().length >= 20` en client UI (button disabled) + server (canonical error). Defense in depth.
- **SIEMPRE** persistir `metadata_json.reconciliationContext` en la new row para correlation forensic.
- **SIEMPRE** append marker forensic a `notes` de ambas rows (legacy + new) con shape `[TASK-891 reconciled by actor=X on Y]`.
- **SIEMPRE** que un consumer downstream necesite reaccionar a reconciliación, correlar via `actor_user_id + created_at` o leer `metadata_json.reconciliationContext` de la new row. Si emerge necesidad real de meta-evento, V1.1 considera `.reconciled v1`.
- **SIEMPRE** auto-escalation severity respecta `SUSTAINED_DRIFT_THRESHOLD_DAYS = 30`. Si emerge necesidad de ajustar el threshold, hacerlo en `identity-relationship-member-contract-drift.ts` con tests anti-regresion + delta en doc canonical.

**Spec canónica**: `docs/architecture/GREENHOUSE_PERSON_LEGAL_RELATIONSHIP_RECONCILIATION_V1.md`. Task: `docs/tasks/in-progress/TASK-891-person-relationship-drift-reconciliation-write-path.md`. Patrones fuente: TASK-337 (helpers reusados), TASK-877 (signal-then-command), TASK-890 (predecesor del signal), TASK-742 (defense-in-depth), TASK-839/TASK-873 (capability triple-layer canonical), TASK-848 (reason >=20 bar), TASK-672 (rich struct + thin predicate).

### Offboarding Closure Completeness Aggregate invariants (TASK-892, desde 2026-05-15)

Toda surface que renderice el detalle operativo de un offboarding case (work-queue inspector, drawer, future Pulse cards, future organization-workspace "Salida" facet) **debe** consumir el aggregate canonical `closureCompleteness` de `OffboardingWorkQueueItem`. El `primaryAction` se deriva de `pendingSteps[0]` actionable, NUNCA hardcoded por `closureLane` solo.

El bug class observado live 2026-05-15 con María Camila Hoyos: case `executed` con drift Person 360 sin reconciliar mostraba `primaryAction = 'Cerrar con proveedor'` (boton de Layer 1 ya terminal). Tres de las 4 capas alineadas, la cuarta (Person 360) reportaba drift detectado por signal `identity.relationship.member_contract_drift` desde TASK-890, pero la UI ignoraba esa capa y mostraba un CTA obsoleto que el state machine rechazaría con 4xx.

**Aggregate canonical** (`src/lib/workforce/offboarding/work-queue/closure-completeness.ts`):

- 4 layer alignment fields ortogonales: `caseLifecycle` / `memberRuntime` / `personRelationship` / `payrollScope`.
- `closureState`: enum cerrado `'pending' | 'partial' | 'complete' | 'blocked'`.
- `pendingSteps[]`: array ordenado por constant canonical `STEP_PRIORITY = ['case_lifecycle', 'reconcile_drift', 'verify_payroll_exclusion']`.
- Helper canonical `computeClosureCompleteness(facts)` pure function — 100% testable, NO IO.
- `derivePrimaryActionFromCompleteness(completeness, legacyAction)` decide el primaryAction desde primer step actionable.

**⚠️ Reglas duras**:

- **NUNCA** computar `primaryAction` inline en componentes de UI desde `closureLane` solo. Toda derivación pasa por `derivePrimaryActionFromCompleteness` server-side dentro de `buildOffboardingWorkQueueItem`.
- **NUNCA** modificar `STEP_PRIORITY` sin extender paralelamente: (a) `OffboardingClosureStepCode` type union, (b) un `build*Step` builder pure function en `closure-completeness.ts`, (c) test anti-regresión cubriendo el nuevo step en al menos 2 paths (actionable + skip). El orden es contractual — moverlo invalida el bug-class fix y rompe consumers que asumen "primer step actionable = CTA principal".
- **NUNCA** componer la decisión `closureState` en cliente. Server-only por construcción — `closure-completeness.ts` lleva `import 'server-only'` al inicio.
- **NUNCA** filtrar pendingSteps en UI por capability inline. Cada step declara `capability: string | null`; UI esconde steps sin capability via gate runtime (`can(subject, capability, action)`). NO duplicar la matriz `relationship × capability → access` en componentes.
- **NUNCA** crear paths paralelos para "ver el cierre real" (e.g. badge custom en algún card que no consume `closureCompleteness`). Single source of truth.
- **NUNCA** asumir que `personRelationshipDrift === null` significa "no drift". Es `unknown` (member sin profile o lookup downstream falló). `degradedReasons[]` en `OffboardingWorkQueue` reporta cuándo lookups fallan honestamente.
- **NUNCA** mostrar `Cierre parcial` sin explicar las capas pendientes. La seccion UI "Capas pendientes" es obligatoria — sino el operador no sabe qué hacer y reincide en el bug class previo.
- **NUNCA** mutar Maria Camila Hoyos operativamente como parte de TASK-892. Recovery espera ejecución manual via TASK-891 dialog post staging validation. El aggregate solo *visibiliza* el cierre parcial — no auto-resuelve drift Person 360.
- **NUNCA** invocar `Sentry.captureException()` directo en code paths del aggregate. Usar `captureWithDomain(err, 'identity', { tags: { source: 'offboarding_closure_completeness', stage: '<...>' } })`.
- **SIEMPRE** que emerja un step nuevo (e.g. `verify_assignment_closure`, `unblock_blocker`, `download_certificate`), agregar al enum + builder pure + STEP_PRIORITY posicion explícita + tests anti-regresión. El builder retorna `null` cuando el step no aplica al case (e.g. case non-terminal para verify_payroll_exclusion).
- **SIEMPRE** que un consumer downstream (Pulse, organization workspace facet "Salida", report PDFs) muestre el estado del cierre, leer `closureCompleteness.closureState` directo — NUNCA recomputar.
- **SIEMPRE** preservar el patrón "informational vs actionable" en pendingSteps. Steps `actionable: false` se renderean como hints/alerts sin CTA. Steps `actionable: true` se renderean como CTAs con href si lo declaran.

**Reusable cross-flow**: el patrón "`pendingSteps[]` decide el primaryAction" se replica para Onboarding work queue (TASK-875), hiring pipeline, workforce activation (TASK-874), contractor closure (TASK-797 futuro), final settlement document lifecycle (TASK-863). Cuando emerja una surface con `primaryAction` derivado de una sola dimensión pero realidad operativa multi-capa, replicar: pure function + STEP_PRIORITY + state machine cerrado + signal de cierre parcial.

**Spec canónica**: `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md` (Delta 2026-05-15). Task: `docs/tasks/in-progress/TASK-892-offboarding-closure-completeness-aggregate.md`. Reliability signal: `hr.offboarding.completeness_partial` (kind=drift, severity warning >0, steady=0, subsystem Identity & Access). Patrones fuente: TASK-742 (4-pillar checklist), TASK-672 (composer + degraded honest), TASK-880 (decision tree por capability + audience), TASK-873 (capability triple-layer canonical).
