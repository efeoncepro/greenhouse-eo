# TASK-890 — Workforce Exit Payroll Eligibility Window

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `V1.0 SHIPPED 2026-05-15 — 7 slices completos directo en develop`
- Rank: `TBD`
- Domain: `hr|payroll|identity|platform`
- Blocked by: `none`
- Branch: `develop` (operador autorizo trabajar directo en develop sin branch task/TASK-890-*)
- Followup V1.1: TASK-891 (drift reconciliation write path) + staging shadow compare ≥7d antes de flip flag `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED` a `true` en production.
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Crear el contrato canonico de ventana de elegibilidad payroll para salidas laborales/contractuales, consumido por Offboarding, Nomina proyectada/oficial y Person 360. La task nace del caso Maria Camila Hoyos, donde el cierre externo aparece como "Cerrar con proveedor", redirige a Nomina sin transicionar estado y la persona sigue proyectada por mes completo.

## Why This Task Exists

La investigacion live del 2026-05-15 mostro una falla de contrato, no solo de UI:

- el caso `EO-OFF-2026-0609A520` de Maria Camila Hoyos esta en lane `external_provider` con `contractTypeSnapshot='contractor'`, `payRegimeSnapshot='international'`, `payrollViaSnapshot='deel'` y ultimo dia `2026-05-14`;
- la accion primaria `Cerrar con proveedor` en `/hr/offboarding` solo navega a `/hr/payroll`; no registra cierre con proveedor ni actualiza el aggregate;
- Nomina proyectada sigue incluyendo USD 530 full-month para mayo 2026 porque el pipeline de proyeccion no consume una ventana de salida ni prorratea por `last_working_day`;
- `greenhouse_core.members` y `greenhouse_payroll.compensation_versions` siguen activos/current con `effective_to null`;
- `greenhouse_core.person_legal_entity_relationships` muestra drift semantico: relacion activa `employee` mientras el member runtime declara contractor/international/Deel.

Sin un contrato compartido, cada modulo infiere la salida desde su propia tabla o UI, lo que permite proyecciones completas, cierres externos ambiguos y relaciones Person 360 contradictorias.

## Goal

- Formalizar una ADR/spec para `WorkforceExitPayrollEligibilityWindow` como boundary entre Offboarding, Payroll y Person 360.
- Implementar un resolver canonico que determine elegibilidad, prorrateo, exclusion y warnings por periodo para payroll proyectado/oficial.
- Convertir `Cerrar con proveedor` en una accion auditada de cierre externo, no un link silencioso a Nomina.
- Agregar tests y signals que impidan que un offboarding ejecutado/programado dentro del periodo siga apareciendo como mes completo.
- Detectar y reconciliar drift entre `members` y `person_legal_entity_relationships` sin SQL manual ni mutaciones invisibles.

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
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Offboarding es owner de intencion/ejecucion de salida; Payroll consume una ventana de elegibilidad, no deduce estados desde UI ni labels.
- Payroll oficial, payroll proyectado y snapshots deben compartir el mismo resolver de elegibilidad para evitar drift de calculo.
- Finiquito Chile dependiente sigue limitado a `contract_type in ('indefinido','plazo_fijo')`, `pay_regime='chile'`, `payroll_via='internal'`; Deel/proveedor externo no debe abrir `final_settlements`.
- Finance/Tesoreria sigue siendo owner de pagos, payment orders y conciliacion; esta task no debe marcar pagos como ejecutados.
- Person 360 debe preservar relaciones historicas; no convertir una relacion legal cambiando campos vivos del `member` como sustituto.
- No hacer updates manuales sobre Maria Camila Hoyos ni otros casos reales como parte de la implementacion. Cualquier correccion real debe pasar por command auditado despues de staging validation.
- Si se agregan surfaces, menu, page guards o acciones nuevas, declarar explicitamente el plano `views` y el plano `entitlements`; no tratar `views` como autorizacion fina.
- Copy visible nuevo debe vivir en `src/lib/copy/` o capa canonica aplicable, no hardcodeado en JSX reusable.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/documentation/hr/offboarding.md`
- `docs/manual-de-uso/hr/offboarding.md`
- `docs/documentation/hr/periodos-de-nomina.md`
- `docs/manual-de-uso/hr/periodos-de-nomina.md`
- `docs/documentation/hr/finiquitos.md`
- `docs/manual-de-uso/hr/finiquitos.md`
- `project_context.md`
- `Handoff.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-867-offboarding-work-queue-projection-ux-modernization.md`
- `docs/tasks/complete/TASK-862-final-settlement-resignation-v1-closing.md`
- `docs/tasks/complete/TASK-863-finiquito-prerequisites-ui.md`
- `docs/tasks/complete/TASK-872-scim-internal-collaborator-provisioning.md`
- `docs/tasks/complete/TASK-874-workforce-activation-readiness-workspace.md`
- `docs/tasks/complete/TASK-875-work-relationship-onboarding-case-foundation.md`
- `docs/tasks/complete/TASK-876-workforce-activation-remediation-flow.md`
- `src/lib/workforce/offboarding/store.ts`
- `src/lib/workforce/offboarding/state-machine.ts`
- `src/lib/workforce/offboarding/lane.ts`
- `src/lib/workforce/offboarding/work-queue/query.ts`
- `src/lib/workforce/offboarding/work-queue/derivation.ts`
- `src/app/api/hr/offboarding/cases/[caseId]/transition/route.ts`
- `src/app/api/hr/offboarding/work-queue/route.ts`
- `src/lib/payroll/project-payroll.ts`
- `src/lib/payroll/postgres-store.ts`
- `src/lib/payroll/get-compensation.ts`
- `src/lib/payroll/calculate-payroll.ts`
- `src/lib/payroll/projected-payroll-store.ts`
- `src/app/api/hr/payroll/projected/route.ts`
- `src/lib/person-legal-entity-relationships/store.ts`
- `src/lib/workforce/relationship-transition/employee-to-contractor.ts`

### Blocks / Impacts

- `/hr/offboarding` operational queue and inspector.
- `/hr/payroll/projected` and `GET /api/hr/payroll/projected`.
- Official payroll period calculation/readiness under `/api/hr/payroll/periods/*`.
- Projected payroll snapshots under `greenhouse_payroll.projected_payroll_snapshots`.
- Person 360 legal relationship timeline and relationship drift handling.
- Reliability signals for HR/Payroll data quality.
- Operator documentation for offboarding and payroll periods.

### Files owned

- `docs/architecture/GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `src/lib/workforce/offboarding/**`
- `src/lib/workforce/offboarding/work-queue/**`
- `src/lib/payroll/**`
- `src/lib/person-legal-entity-relationships/**`
- `src/views/greenhouse/hr-core/offboarding/**`
- `src/views/greenhouse/payroll/**`
- `src/app/api/hr/offboarding/**`
- `src/app/api/hr/payroll/**`
- `src/lib/reliability/queries/**`
- `src/lib/copy/workforce.ts`
- `src/lib/copy/payroll.ts`
- `eslint-plugins/greenhouse/rules/no-inline-payroll-scope-gate.mjs`
- `eslint-plugins/greenhouse/rules/no-inline-payroll-scope-gate.test.mjs`
- `eslint.config.mjs`
- `docs/documentation/hr/offboarding.md`
- `docs/manual-de-uso/hr/offboarding.md`
- `docs/documentation/hr/periodos-de-nomina.md`
- `docs/manual-de-uso/hr/periodos-de-nomina.md`

## Current Repo State

### Already exists

- Offboarding cases live under `greenhouse_hr.work_relationship_offboarding_cases` with events append-only and runtime in `src/lib/workforce/offboarding/**`.
- Offboarding work queue is read-only and derives lanes/actions in `src/lib/workforce/offboarding/work-queue/derivation.ts`.
- `HrOffboardingView` currently maps `external_provider_close` and `review_payment` actions to `/hr/payroll`.
- Payroll projection uses `src/lib/payroll/project-payroll.ts` and stores snapshots through `src/lib/payroll/projected-payroll-store.ts`.
- Payroll member eligibility in `src/lib/payroll/postgres-store.ts` excludes executed offboarding only when `last_working_day < periodStart`.
- Person legal relationships have runtime primitives in `src/lib/person-legal-entity-relationships/**` and transition helpers in `src/lib/workforce/relationship-transition/**`.

### Gap

- There is no shared `exit eligibility window` primitive consumed by projected payroll, official payroll, payroll readiness and snapshots.
- External-provider offboarding has no dedicated audited command/action to record provider closure, evidence and effective date.
- Projection logic can include a person for full month even when the offboarding case has `last_working_day` inside the payroll period.
- Offboarding work queue status/action labels can imply closure readiness while the case remains draft or unclassified.
- Relationship drift between `members.contract_type/payroll_via` and `person_legal_entity_relationships.relationship_type/status` is not surfaced as a first-class signal.
- No regression fixture prevents another Maria-like case from remaining in projected payroll as full-month after scheduled/executed exit.

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

### Slice 1 — ADR and canonical contract

- Crear `docs/architecture/GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md`.
- Indexar la decision en `docs/architecture/DECISIONS_INDEX.md`.
- Definir ownership: Offboarding writes exit facts; Payroll consumes eligibility windows; Person 360 owns relationship semantics.
- Documentar event/outbox expectations, access planes, reliability signals, rollback and no-manual-SQL rule.

### Slice 2 — Exit eligibility resolver foundation

- Crear un helper server-only canonico para resolver ventana de elegibilidad por `memberId`, `periodStart`, `periodEnd`.
- El helper debe consumir compensation versions, offboarding case state, last working day, lane, payroll regime and relationship status.
- Agregar tests unitarios para: active/no case, draft case, scheduled exit inside period, executed exit before period, external provider inside period, internal payroll final-settlement lane, missing relationship drift.
- Exponer warnings estructurados para downstream UI/readiness sin romper payloads existentes.

### Slice 3 — Payroll projection and official calculation integration

- Integrar el resolver en `src/lib/payroll/project-payroll.ts`, `src/lib/payroll/postgres-store.ts`, payroll readiness and official calculation surfaces that select eligible people.
- Reusar el mismo helper in-memory/read path for projected payroll and official payroll instead of duplicating SQL filters.
- Ensure `projected_month_end` no longer returns a full-month amount for scheduled/executed exits inside the period; apply partial/exclude policy according to the ADR.
- Add regression tests for Maria-like fixtures and current active collaborators.
- Agregar lint rule mecanica `greenhouse/no-inline-payroll-scope-gate` en `eslint-plugins/greenhouse/rules/no-inline-payroll-scope-gate.mjs`, modo `warn` durante esta task (promueve a `error` post 30 dias steady). Detecta patrones SQL embebidos en TS que recompongan el gate inline: `EXISTS ... offboarding_cases ... status = 'executed'`, `NOT EXISTS ... offboarding_cases`, filtros `m.active = TRUE AND NOT EXISTS` que dupliquen la logica del resolver canonico. Override block en `eslint.config.mjs` exime el helper canonico (`src/lib/payroll/exit-eligibility/**`), tests del helper, y migrations historicas. Patron fuente: TASK-766 (`greenhouse/no-untokenized-fx-math`) + TASK-721 (canonical helper enforcement).

### Slice 4 — External provider closure command

- Add an audited command to record provider closure for external payroll/provider lanes.
- Reuse or extend `src/app/api/hr/offboarding/cases/[caseId]/transition/route.ts`; only create a new route if the transition endpoint cannot express provider evidence safely.
- Required input must include effective provider close date and actor reason; evidence/reference should be supported when the ADR requires it.
- Emit an offboarding case event and outbox event with redacted payload.
- Make duplicate submissions idempotent or loudly rejected with a canonical error.

### Slice 5 — Offboarding and payroll UI contract

- Update `/hr/offboarding` so `Cerrar con proveedor` invokes the audited command or opens the required closure dialog; it must not silently navigate to `/hr/payroll`.
- Show operational impact in the inspector/row, for example "Salida programada", "Proveedor externo" and "Proyecta parcial hasta 14/05" when the resolver returns such state.
- Update payroll projected UI to explain partial/excluded entries through the shared warnings.
- Move reusable copy to `src/lib/copy/workforce.ts` or `src/lib/copy/payroll.ts`.

### Slice 6 — Relationship drift detection and reconciliation path

- Add a read-only signal/query for active member vs active legal relationship mismatch, including `employee` active while member is contractor/international/Deel.
- If a write path is required, implement it through existing relationship primitives and audit events; do not update relationship rows directly from payroll code.
- Ensure the drift signal gives the operator a safe next action instead of silently changing Maria or any other real person.

### Slice 7 — Docs, manuals and operational verification

- Update functional docs and manuals for offboarding external-provider close and projected payroll behavior.
- Add operator troubleshooting for "appears in projected payroll after offboarding".
- Add staging verification notes and data-safe runbook for resolving Maria after the feature is validated.

## Out of Scope

- Manually mutating Maria Camila Hoyos or any real collaborator during implementation.
- Creating or executing payment orders, settlement legs, treasury payments or bank reconciliation.
- Expanding final-settlement/finiquito to Deel, EOR, contractor international or provider lanes.
- Rebuilding the entire offboarding state machine or replacing TASK-867 work queue.
- Migrating all historic compensation versions unless required by an additive backfill with dry-run and operator approval.
- Changing SCIM provisioning or session identity self-heal behavior.

## Detailed Spec

The canonical resolver should expose a shape equivalent to:

```ts
type WorkforceExitPayrollEligibilityWindow = {
  memberId: string
  periodStart: string
  periodEnd: string
  eligibleFrom: string | null
  eligibleTo: string | null
  relationshipStatus: 'active' | 'scheduled_exit' | 'ended' | 'unknown'
  exitCaseId: string | null
  exitCasePublicId: string | null
  exitLane: 'internal_payroll' | 'external_provider' | 'contract_expiry' | 'contractor_close' | 'unknown' | null
  exitStatus: 'draft' | 'scheduled' | 'ready' | 'executed' | 'cancelled' | 'unknown' | null
  projectionPolicy:
    | 'full_period'
    | 'partial_until_last_working_day'
    | 'exclude_after_last_working_day'
    | 'external_provider_observed'
  warnings: Array<{
    code: string
    severity: 'info' | 'warning' | 'blocking'
    messageKey: string
    evidence?: Record<string, unknown>
  }>
}
```

Rules to encode in the ADR and tests:

- No offboarding case: use current compensation eligibility and relationship status.
- Draft offboarding case: do not exclude automatically; surface warning if dates/lane imply likely exit.
- Scheduled/ready/executed case with `last_working_day` inside payroll period: project partial through `eligibleTo=last_working_day` unless ADR chooses stricter exclusion for a lane.
- Executed case with `last_working_day < periodStart`: exclude from payroll period.
- External provider/Deel: Greenhouse may show operational accrual through last working day, but must not imply internal payroll/finiquito execution.
- Internal payroll Chile dependent: final-settlement readiness remains a separate gate; eligibility window must not bypass document/legal prerequisites.
- If compensation `effective_to` and offboarding `last_working_day` disagree, the resolver must emit a drift warning and use the safer contracted policy documented by the ADR.
- If active Person 360 relationship type conflicts with active member payroll regime, emit drift rather than mutating from a read path.

## Rollout Plan & Risk Matrix

This task touches payroll, HR offboarding, identity/legal relationships and user-visible actions. It must ship behind flags or equivalent staged cutover until staging proves that projected and official payroll agree.

### Slice ordering hard rule

- Slice 1 MUST ship before any runtime changes.
- Slice 2 MUST ship before Slice 3, Slice 4, Slice 5 and Slice 6.
- Slice 3 may only consume Slice 2 through the canonical helper; no duplicate payroll-only SQL policy.
- Slice 4 write path MUST be validated in staging before Slice 5 exposes the action as primary UI.
- Slice 6 read-only signal may ship before a write reconciliation path, but write reconciliation must not ship without ADR coverage.
- Slice 7 closes only after docs and verification evidence are synchronized.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Payroll projected understates an active collaborator after false-positive exit window | payroll | medium | Feature flag, shadow compare, fixture tests, staged rollout | `payroll.exit_window.projection_delta_anomaly` |
| Payroll projected overstates exited external-provider collaborator as full month | payroll | high | Canonical resolver + Maria-like regression fixture | `payroll.exit_window.full_month_projection_drift` |
| External provider close writes wrong state without evidence | HR offboarding | medium | Dedicated command validation, idempotency, audit/outbox, staging-only first | `hr.offboarding.external_provider_close_failed` |
| Person relationship drift is auto-mutated from payroll read path | identity | medium | Read path emits signal only; writes only through relationship primitive | `identity.relationship.member_contract_drift` |
| UI labels imply finiquito for Deel/provider lanes | UI / HR | medium | Copy review, lane-specific copy, tests against external provider case | no signal — covered by UI tests/manual QA |
| Materialized snapshots remain stale after resolver cutover | payroll / sync | medium | Snapshot recompute plan with dry-run and post-compare | `payroll.projected_snapshot.exit_window_stale` |

### Feature flags / cutover

- Add `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED` default `false` for production until staging verifies projected and official payroll parity.
- Add `OFFBOARDING_EXTERNAL_PROVIDER_CLOSE_ENABLED` default `false` until the command path is validated in staging.
- Shadow mode must compare old vs new projected payroll for at least current and next payroll period before production cutover.
- Revert: set flags to `false` and redeploy; no destructive schema rollback should be needed for additive tables/columns/events.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert docs/ADR PR if not yet used by runtime | <15 min | si |
| Slice 2 | Disable helper consumers; revert PR if no consumers shipped | <30 min | si |
| Slice 3 | Set `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED=false`; redeploy | <10 min | si |
| Slice 4 | Set `OFFBOARDING_EXTERNAL_PROVIDER_CLOSE_ENABLED=false`; keep audit history, stop new writes | <10 min | parcial |
| Slice 5 | Hide UI action via flag/capability; keep read-only indicators if safe | <15 min | si |
| Slice 6 | Disable signal query or mark signal informational; no data rollback for read-only signal | <15 min | si |
| Slice 7 | Revert docs update or add correction delta | <15 min | si |

### Production verification sequence

1. `pnpm pg:doctor` in staging.
2. Deploy with both flags `false`; verify no change in `/api/hr/payroll/projected` payload totals.
3. Enable shadow compare in staging; run current and next payroll month projection for Maria-like fixture and active collaborators.
4. Enable `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED=true` in staging; verify external-provider scheduled/executed exits are partial/excluded according to ADR.
5. Enable `OFFBOARDING_EXTERNAL_PROVIDER_CLOSE_ENABLED=true` in staging; execute one synthetic/expendable case, not Maria, and verify audit/outbox/events.
6. Run focused Vitest, API smoke and `pnpm fe:capture` for `/hr/offboarding` and `/hr/payroll/projected`.
7. Repeat production cutover with flags false -> shadow -> true, monitoring signals for 7 days.
8. Only after production validation, use the audited command path to resolve real Maria if the operator approves.

### Out-of-band coordination required

- HR/Payroll operator must confirm the business policy for external-provider closures: partial accrual through last working day vs exclusion from Greenhouse payroll projection.
- Finance/Tesoreria should confirm that no payment-order semantics are expected from provider closure.
- Legal/HR should confirm wording for external-provider close to avoid implying Chile finiquito.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] ADR/spec `GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md` exists and is indexed in `DECISIONS_INDEX.md`.
- [ ] A single canonical resolver is used by projected payroll and official payroll eligibility paths.
- [ ] Maria-like external-provider fixture no longer appears as full-month projected payroll after scheduled/executed exit inside the period.
- [ ] `Cerrar con proveedor` no longer silently navigates to Nomina; it records an audited provider-close action or is disabled with an explicit reason.
- [ ] Draft offboarding cases do not automatically exclude payroll, but surface clear warnings.
- [ ] Person/member relationship drift is detected via signal/query and not auto-mutated from payroll read paths.
- [ ] UI copy differentiates provider close, payroll projection and Chile finiquito.
- [ ] Docs/manuals explain how an operator resolves "sigue saliendo en nomina proyectada".
- [ ] Lint rule `greenhouse/no-inline-payroll-scope-gate` shipped en modo `warn`; cero violaciones nuevas introducidas durante el sweep de Slice 3; override block documentado para callsites legitimos (helper canonico + tests).

## Verification

- `pnpm pg:doctor`
- `pnpm lint` (debe pasar con la nueva rule `greenhouse/no-inline-payroll-scope-gate` activa en modo `warn`)
- `pnpm tsc --noEmit`
- `pnpm vitest run eslint-plugins/greenhouse/rules/no-inline-payroll-scope-gate.test.mjs` (anti-regresion del rule)
- `pnpm vitest run src/lib/payroll/project-payroll.test.ts src/lib/payroll/projected-payroll-store.test.ts src/lib/workforce/offboarding/work-queue/derivation.test.ts src/lib/workforce/offboarding/state-machine.test.ts`
- `pnpm vitest run src/lib/person-legal-entity-relationships/** src/lib/workforce/relationship-transition/employee-to-contractor.test.ts`
- `pnpm build`
- `pnpm fe:capture --route=/hr/offboarding --env=staging --hold=3000`
- `pnpm fe:capture --route=/hr/payroll/projected --env=staging --hold=3000`
- Manual API check in staging for `GET /api/hr/payroll/projected?year=2026&month=5&mode=projected_month_end`.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] flags/cutover quedan documentados con estado final y rollback probado
- [ ] si se toca Maria real, queda evidencia del command auditado y aprobacion operacional; nunca SQL manual

## Follow-ups

- Possible follow-up for relationship reconciliation UI if Slice 6 only ships read-only signal.
- Possible follow-up for provider integration evidence from Deel if manual provider closure is insufficient.
- Possible follow-up for recomputing historic projected payroll snapshots after the current and next periods are safe.

## Open Questions

- Para proveedor externo/Deel, Nomina proyectada debe mostrar costo parcial operacional hasta `last_working_day` o excluir completamente del modulo de Nomina interna?
- El cierre con proveedor requiere evidencia documental obligatoria en V1, o basta fecha efectiva + motivo + actor auditado?
- La reconciliacion del drift `employee` activo vs contractor/Deel debe abrir una nueva relacion contractor automaticamente via command o quedarse como accion manual asistida?
