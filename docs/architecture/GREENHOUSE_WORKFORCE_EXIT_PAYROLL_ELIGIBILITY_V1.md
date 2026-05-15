# Greenhouse Workforce Exit Payroll Eligibility V1

## Purpose

Definir el contrato canonico de **ventana de elegibilidad payroll para salidas laborales/contractuales** consumido por:

1. Nomina proyectada (`/api/hr/payroll/projected`)
2. Nomina oficial (`/api/hr/payroll/periods/*`)
3. Payroll readiness gate
4. Capacity / staffing / cost attribution readers (futuro)

Reemplaza el patron actual donde el reader payroll embeda inline `NOT EXISTS offboarding_cases WHERE status='executed' AND last_working_day < periodStart` como unica regla, ignorando los casos `external_payroll` (Deel/EOR) que cierran via proveedor externo sin transicionar a `executed`.

Usar junto con:

- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

## Status

Decision arquitectonica aceptada 2026-05-15.

Implementacion via TASK-890 (in-progress).

Predecesor: TASK-760 (offboarding case foundation), TASK-872 (workforce_intake_status gate flag-controlled).

Disparador del bug class: caso `EO-OFF-2026-0609A520` Maria Camila Hoyos, lane `external_payroll`/Deel `last_working_day=2026-05-14`, status `draft`. Nomina proyectada mostraba full-month USD 530 para mayo 2026 porque el gate legacy solo excluye `status='executed' AND last_working_day < periodStart`. Investigacion live 2026-05-15 (Handoff sesion).

## Source-of-Truth Boundaries

- **Offboarding** (`greenhouse_hr.work_relationship_offboarding_cases`) **writes exit facts**: status, lane, last_working_day, effective_date, snapshots contractuales.
- **Payroll consumes** una ventana de elegibilidad derivada — **NUNCA deduce estados desde UI labels ni cadenas magicas**.
- **Person 360** (`person_legal_entity_relationships`) **owns relationship semantics**. Payroll detecta drift via signal, NO auto-mutates.
- **Finance/Tesoreria** sigue siendo owner de pagos, payment orders y conciliacion. Este contrato NO ejecuta pagos.

## Problem Statement

El reader payroll actual codifica una sola regla inline (`pgGetApplicableCompensationVersionsForPeriod`, src/lib/payroll/postgres-store.ts:887-896):

```sql
NOT EXISTS (
  SELECT 1 FROM greenhouse_hr.work_relationship_offboarding_cases AS oc
  WHERE oc.member_id = m.member_id
    AND oc.status = 'executed'
    AND oc.last_working_day IS NOT NULL
    AND oc.last_working_day < $1::date
)
```

Esto presenta 5 deficiencias:

1. **Asimetria de lane invisible**: `external_payroll` (Deel/EOR) cierra via proveedor externo y nunca transita a `executed` por design — `executed` requiere finiquito Chile emitido. Casos external quedan en `approved`/`scheduled` indefinidamente y siguen apareciendo full-month.
2. **No prorrateo dentro del periodo**: incluso `executed` con `last_working_day` en mid-period es excluido el mes ENTERO si el operador marca `last_working_day < periodStart`, pero el mes que contiene `last_working_day` no tiene policy de partial.
3. **Drift PG↔BQ**: el reader BQ fallback (`get-compensation.ts:589`) solo filtra `m.active=TRUE` sin gate offboarding. Cualquier consumer que tome el BQ path ve roster ampliado.
4. **No reusable cross-domain**: capacity / staffing / cost attribution recomponen filtros propios. Drift garantizado.
5. **No signal de drift**: ningun reliability signal detecta el bug class. Solo surgio porque operador humano vio nomina inflada y reporto.

## Canonical Decisions

### §1. Resolver canonico unico server-only

Toda decision de "este miembro esta en scope payroll en este periodo" pasa por un **unico** resolver canonico:

```ts
// src/lib/payroll/exit-eligibility/index.ts (server-only — import 'server-only')

export type WorkforceExitPayrollEligibilityWindow = {
  memberId: string
  periodStart: string  // ISO date YYYY-MM-DD (inclusive)
  periodEnd: string    // ISO date YYYY-MM-DD (inclusive)

  // Ventana efectiva intersectada con [periodStart, periodEnd].
  // null en eligibleFrom = no elegible al inicio del periodo (cutoff < periodStart o sin relacion activa)
  // null en eligibleTo   = elegible hasta el fin del periodo
  eligibleFrom: string | null
  eligibleTo: string | null

  relationshipStatus: 'active' | 'scheduled_exit' | 'ended' | 'unknown'

  exitCaseId: string | null
  exitCasePublicId: string | null
  exitLane:
    | 'internal_payroll'
    | 'external_payroll'
    | 'non_payroll'
    | 'identity_only'
    | 'relationship_transition'
    | 'unknown'
    | null
  exitStatus:
    | 'draft' | 'needs_review' | 'approved' | 'scheduled' | 'blocked' | 'executed' | 'cancelled'
    | null

  projectionPolicy:
    | 'full_period'             // sin exit case relevante → proyectar mes completo
    | 'partial_until_cutoff'    // internal_payroll executed con cutoff en periodo → prorratear hasta cutoff
    | 'exclude_from_cutoff'     // external_payroll approved+ con cutoff en periodo → excluir desde cutoff
    | 'exclude_entire_period'   // cutoff < periodStart en cualquier lane → fuera completo

  // Fecha cutoff canonica = COALESCE(last_working_day, effective_date)
  cutoffDate: string | null

  warnings: ReadonlyArray<{
    code:
      | 'draft_case_with_cutoff_in_period'
      | 'comp_version_disagree_with_cutoff'
      | 'unclassified_lane'
      | 'missing_relationship'
      | 'effective_date_only_no_lwd'
    severity: 'info' | 'warning' | 'blocking'
    messageKey: string  // i18n key en src/lib/copy/payroll.ts
    evidence?: Record<string, unknown>
  }>
}

export async function resolveExitEligibilityForMembers(
  memberIds: ReadonlyArray<string>,
  periodStart: string,
  periodEnd: string,
  opts?: { client?: PoolClient }
): Promise<Map<string, WorkforceExitPayrollEligibilityWindow>>

// Thin wrapper — derivado del rich struct, NO duplica logica
export async function isMemberInPayrollScope(
  memberId: string,
  asOf: string,
  opts?: { client?: PoolClient }
): Promise<boolean>
```

**Decision: TS-only** (NO SQL function PG-side). Pattern fuente: `aggregateBankKpis` (TASK-720), `resolveExpenseEconomicCategory` (TASK-768). Razon: predicate sin requirement de atomicity cross-transaction; testabilidad + auditabilidad mayor en TS; BQ fallback queda como degraded mode honesto (ver §8).

**Decision: shape rico + thin predicate**. `isMemberInPayrollScope` es wrapper de 3 lineas que llama el resolver y retorna `policy !== 'exclude_*'`. Single source of truth. Pattern fuente: TASK-672 Platform Health (`safeModes` derived).

**Decision: bulk-first API**. Costo SQL identico (`= ANY($1)` vs `= $1`). Callsites single-member usan `bulk([id]).get(id)`. NO duplicar firma.

### §2. Asymmetric threshold por lane

| Lane (`rule_lane`) | Threshold de exclusion | Policy resultante |
|---|---|---|
| `internal_payroll` | `status = 'executed'` AND cutoff in periodo | `partial_until_cutoff` (prorratear) |
| `internal_payroll` | `status = 'executed'` AND cutoff < periodStart | `exclude_entire_period` |
| `external_payroll` | `status IN ('approved','scheduled','executed')` AND cutoff in periodo | `exclude_from_cutoff` |
| `external_payroll` | `status IN ('approved','scheduled','executed')` AND cutoff < periodStart | `exclude_entire_period` |
| `non_payroll` | `status IN ('approved','scheduled','executed')` AND cutoff < periodStart | `exclude_entire_period` |
| `non_payroll` | `status IN ('approved','scheduled','executed')` AND cutoff in periodo | `exclude_from_cutoff` |
| `identity_only` | N/A — siempre `full_period` salvo `members.active=FALSE` | `full_period` |
| `relationship_transition` | `status='executed'` AND cutoff in periodo | `partial_until_cutoff` |
| `unknown` | conservador: NO excluye | `full_period` + warning `unclassified_lane` |
| Cualquier lane | `status IN ('draft','needs_review','blocked','cancelled')` | `full_period` + warning si aplica |

**Rationale (defensa de la asimetria)**:

- **Internal payroll** (`internal_payroll`) requiere `status='executed'` porque Greenhouse PAGA hasta el ultimo dia; el threshold `executed` es momento canonico donde finiquito Chile esta emitido + ratificado (TASK-862/863) y compensation_versions se cierra automatico (HR_PAYROLL_V1:1896-1898). Mantener `executed` preserva el contract legal.
- **External payroll** (`external_payroll`) NO requiere `executed` porque Greenhouse NUNCA paga la nomina — la paga el proveedor externo (Deel/EOR). `approved` es el momento canonico donde el operador firmo la decision de cerrar via proveedor. Esperar `executed` para un evento que vive afuera del Greenhouse runtime es deuda operativa permanente.
- **Non_payroll** (contractor/honorarios) sigue la regla external: cierra sin finiquito interno; threshold `approved`.

### §3. Cutoff canonico = `COALESCE(last_working_day, effective_date)`

Schema invariants (TASK-760):

- CHECK `offboarding_case_effective_date_required_check`: status ∈ {approved, scheduled, executed} → `effective_date NOT NULL`.
- CHECK `offboarding_case_last_working_day_required_check`: status ∈ {scheduled, executed} → `last_working_day NOT NULL`.

Entre `approved` y `scheduled`, `effective_date` esta poblado pero `last_working_day` puede ser NULL. Usar `last_working_day` solo rompe `exclude_from_cutoff` para external_payroll en `approved`.

**Decision**: el resolver computa `cutoffDate = COALESCE(last_working_day, effective_date)`. Single source of truth para la fecha de corte. Si emerge warning `effective_date_only_no_lwd`, signala al operador que debe transicionar a `scheduled` para precisar la fecha real de ultimo dia laboral.

### §4. Enum `exitLane` DB-aligned

`exitLane` del resolver es **1:1 con `rule_lane` persistido** — NO inventar un tercer enum.

| `rule_lane` (DB) | `exitLane` (resolver) |
|---|---|
| `internal_payroll` | `internal_payroll` |
| `external_payroll` | `external_payroll` |
| `non_payroll` | `non_payroll` |
| `identity_only` | `identity_only` |
| `relationship_transition` | `relationship_transition` |
| `unknown` | `unknown` |

`closureLane` en `src/lib/workforce/offboarding/work-queue/derivation.ts` (`final_settlement | contractual_close | external_provider | needs_classification`) sigue siendo **UI display layer** — agrega dimensiones country/payrollVia ya cubiertas por `rule_lane` y los snapshots. NO se promueve a contract payroll.

**Rationale**: drift impossible by design. Si schema evoluciona (`employee_wallet`, futuras lanes), extender ambos en el mismo PR (lint rule + compile-time exhaustiveness check `never` defienden).

### §5. Feature flag canonico para cutover staged

`PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED` (env var, default `false` en production hasta staging shadow-compare valide).

Pattern fuente: `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED` (TASK-872 src/lib/payroll/postgres-store.ts:832).

Comportamiento:

- `false` (default V1.0): `pgGetApplicableCompensationVersionsForPeriod` mantiene gate legacy bit-for-bit (`status='executed' AND last_working_day < periodStart`). El resolver puede correr en shadow para comparacion observability sin afectar payload de production.
- `true` (post staging validation): el reader llama `resolveExitEligibilityForMembers` y aplica `projectionPolicy` per-member.

Shadow compare ship en Slice 3 como log-only diff via `captureWithDomain('payroll', ..., { source: 'shadow_compare', delta: {...} })` (no Sentry alert, solo evidence persistida).

### §6. Provider closure command (Slice 4 — V1.1)

Reemplaza la accion UI `Cerrar con proveedor` que hoy SOLO navega a `/hr/payroll`.

Contract:

- Endpoint: `POST /api/hr/offboarding/cases/[caseId]/transition` extendido con causal `external_provider_close` (NO route nueva — reusa state machine).
- Body: `{ targetStatus: 'approved' | 'scheduled' | 'executed', effectiveDate, lastWorkingDay?, reason, externalProviderRef? }`.
- Validacion: `reason` >= 10 chars. Pattern fuente: TASK-859 (PR drift), bar canonico mid-blast.
- Evidence: opcional V1.0 via canonical asset uploader (TASK-721 pattern, contextType `workforce_offboarding_external_provider_evidence_draft`).
- Side effects en la misma tx PG:
  - UPDATE `work_relationship_offboarding_cases` (state machine transition)
  - INSERT `work_relationship_offboarding_case_events` (audit append-only)
  - INSERT outbox `work_relationship_offboarding_case.{transitioned|approved|scheduled|executed}` v1
- Capability granular: `workforce.offboarding.close_external_provider` (organization, update, tenant) — FINANCE_ADMIN + HR + EFEONCE_ADMIN.

### §7. Drift Person 360 signal (Slice 6 — read-only V1)

Detecta drift entre `members.{contract_type, payroll_via, pay_regime}` y `person_legal_entity_relationships.relationship_type` activa.

V1 = read-only signal. NO auto-create relationship. Pattern fuente: TASK-877 (workforce.member.complete_intake — signal-then-command).

Signal: `identity.relationship.member_contract_drift` bajo subsystem `Identity & Access`.

Write reconciliation = follow-up task TASK-891+ post 30d de observability del signal.

### §8. BQ fallback degraded mode honesto

El reader BQ fallback (`getApplicableCompensationVersionsForPeriod`, get-compensation.ts:530-604) **NO replica** la logica del resolver TS. En V1.0:

- Mantiene el gate legacy actual (`m.active=TRUE`).
- Al activarse (PG down → fallback), emite `captureWithDomain('payroll', warn, { source: 'bq_fallback_no_exit_gate', members_count })`.
- Reliability signal nuevo: `payroll.exit_eligibility.bq_fallback_invoked` (kind=drift, severity=warning si count>0, steady=0).

Convergencia full V1.1: cuando BQ tenga `workforce_intake_status` y persistencia espejo de offboarding cases, BQ replica el predicate. Hasta entonces, degraded mode documentado.

**Rationale**: BQ fallback es path de degradacion (PG caido); replicar logica compleja en BQ SQL introduce drift entre dos source-of-truth. Honest degradation + signal alerta es la opcion canonica.

### §9. Reliability signals canonicos

Bajo subsystem `Identity & Access` (modulo `payroll` para algunos):

| Signal | Module | Kind | Severity | Steady |
|---|---|---|---|---|
| `payroll.exit_window.projection_delta_anomaly` | payroll | drift | warning | 0 |
| `payroll.exit_window.full_month_projection_drift` | payroll | drift | error si >0 | 0 |
| `payroll.exit_eligibility.bq_fallback_invoked` | payroll | drift | warning si >0 | 0 |
| `hr.offboarding.external_provider_close_failed` | hr | dead_letter | error si >0 | 0 |
| `identity.relationship.member_contract_drift` | identity | drift | warning si >0 | <count threshold per V1.1 tuning |
| `payroll.projected_snapshot.exit_window_stale` | payroll | lag | warning | 0 |

Wire-up en `src/lib/reliability/get-reliability-overview.ts` per Slice 6+7.

### §10. Lint rule mecanica `greenhouse/no-inline-payroll-scope-gate`

Pattern fuente: `greenhouse/no-untokenized-fx-math` (TASK-766), `greenhouse/no-untokenized-business-line-branching` (TASK-825).

Detecta:

- `NOT EXISTS ... offboarding_cases` en SQL embebido fuera del helper canonico
- `EXISTS ... offboarding_cases WHERE status = 'executed'` en consumers
- `m.active = TRUE AND NOT EXISTS` con shape de duplicacion

Modo `warn` en Slice 3, promueve a `error` post 30d steady.

Override block exime: `src/lib/payroll/exit-eligibility/**`, tests del helper, migrations historicas.

## 4-Pillar Score

### Safety

- **Riesgos**: (a) resolver retorna `full_period` para alguien que ya no esta en scope → cargo doble (Greenhouse interno + proveedor externo); (b) resolver retorna `exclude_*` para alguien aun activo → understate de payroll.
- **Gates**: feature flag `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED=false` default; shadow compare obligatorio pre-activation; capability granular `workforce.offboarding.close_external_provider` (Slice 4); audit append-only en `work_relationship_offboarding_case_events`.
- **Blast radius**: 1 miembro × 1 periodo si operador no detecta. Reliability signal `payroll.exit_window.full_month_projection_drift` lo escala en <24h.
- **Verified by**: tests matrix lane × status × cutoff edge cases (Slice 2); shadow compare en staging (Slice 3); fixture Maria-like anti-regresion (Slice 3).
- **Residual risk**: external_provider close sin evidence puede confundir post-mortem si Deel emite billing inesperado. **Mitigation V1.1**: evidence requirement opt-in para EOR cross-border (TASK-891 follow-up).

### Robustness

- **Idempotencia**: resolver es funcion pura sobre estado PG actual. Determinista.
- **Atomicidad**: resolver no muta — solo lee. Provider closure command (Slice 4) muta dentro de `withTransaction`.
- **Race protection**: state machine offboarding ya tiene CHECK + transitions append-only (TASK-760). Resolver hereda.
- **Constraint coverage**: schema CHECKs cubren `effective_date`/`last_working_day` invariants. COALESCE(LWD, ED) defense in depth.
- **Verified by**: tests unit del resolver (40+ casos: matrix lane × status × cutoff × edge dates incluyendo last_working_day = periodStart, = periodEnd, NULL).

### Resilience

- **Retry policy**: N/A (read-only).
- **Dead letter**: provider closure command (Slice 4) heredara state machine de offboarding cases.
- **Reliability signals**: 6 signals enumerados §9. Steady state = 0 para todos.
- **Audit trail**: existente en `work_relationship_offboarding_case_events`.
- **Recovery**: si resolver detecto incorrectamente, operador revierte transition (state machine permite approved→draft); siguiente render lo re-incluye.
- **Degraded mode**: BQ fallback documented (§8) con captureWithDomain warn + signal `bq_fallback_invoked`.

### Scalability

- **Hot path Big-O**: O(N members) en el periodo via `WHERE member_id = ANY($1)`. Bulk-first.
- **Index coverage**: existentes `(rule_lane, status)`, `(member_id, created_at DESC)`, `(status, effective_date)` en `work_relationship_offboarding_cases` cubren el query. Sin migration nueva en V1.0.
- **Cost at 10x**: lineal en N. Sin contencion (read-only).
- **Pagination**: N/A (resolver consume roster pre-paginado).

## Hard Rules (anti-regression)

1. **NUNCA** filtrar inclusion payroll inline en un SQL embebido en TS. Toda decision pasa por `resolveExitEligibilityForMembers` o `isMemberInPayrollScope`. Lint rule `greenhouse/no-inline-payroll-scope-gate` modo `error` post 30d steady.
2. **NUNCA** distinguir entre `rule_lane` valores con strings literales en consumers. Usar enum `exitLane` del resolver + constants `INTERNAL_LANES = ['internal_payroll']`, `EXTERNAL_LANES = ['external_payroll']`, etc.
3. **NUNCA** mezclar el gate de intake (`workforce_intake_status`, TASK-872) con el gate de exit (`exitLane × status`). Son ortogonales by design — son features distintos.
4. **NUNCA** modificar el threshold por lane sin actualizar AMBOS: tabla §2 + tests anti-regresion + signal evidence + ADR.
5. **NUNCA** ejecutar payroll real (no proyectada) sin que el mismo resolver filtre las compensation versions aplicables. Single source of truth across projected + actual.
6. **NUNCA** auto-mutar Person 360 desde un read path. Solo signal en V1 (§7). Write reconciliation = command auditado.
7. **NUNCA** usar `last_working_day` solo como cutoff. Toda decision usa `COALESCE(last_working_day, effective_date)`.
8. **NUNCA** invocar `Sentry.captureException()` directo. Usar `captureWithDomain(err, 'payroll' | 'hr' | 'identity', { tags: { source: 'exit_eligibility_*' } })`.
9. **NUNCA** modificar el shape de `WorkforceExitPayrollEligibilityWindow` sin bump de contractVersion + update de consumers en el mismo PR.
10. **NUNCA** activar `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED=true` en production sin: (a) staging shadow compare verde >=7d; (b) Maria-like fixture green; (c) signal `payroll.exit_window.full_month_projection_drift` count=0 sustained.
11. **SIEMPRE** que emerja un `rule_lane` nuevo en schema (e.g. `eor_provider`, `intercompany_loan`), extender §2 tabla + resolver + tests + lint rule en el mismo PR. CHECK constraint del enum existente bloquea valores nuevos defensivamente.
12. **SIEMPRE** que un consumer nuevo necesite "members en scope laboral interno" (capacity, staffing, cost attribution), llamar el resolver. Cero composicion ad-hoc.
13. **SIEMPRE** que BQ fallback se invoque, emitir `captureWithDomain('payroll', warn, { source: 'bq_fallback_no_exit_gate' })` y el signal `bq_fallback_invoked` lo escala.

## Open Questions (deliberadamente NO decididas en V1)

1. **Operational accrual external_provider en cost intelligence**: ¿Member Loaded Cost Model (TASK-710-713) debe pre-cargar el partial USD hasta `cutoffDate` para external_provider, aunque payroll proyectada lo excluya? **Hipotesis canonica**: SI, porque Member Loaded Cost es ABC costing y Greenhouse paga Deel fees + provider invoice — sigue siendo costo Greenhouse. Decidir en TASK-710 V2 cuando emerja el caso real.
2. **Evidence requirement para EOR cross-border**: V1.0 no obligatorio. ¿V1.1 ship obligatoriedad para `country_code != legal_entity_country_code`? Requiere review legal.
3. **Drift reconciliation write path**: V1 solo signal. Cuando emerja TASK-891+, decidir command shape (manual operator-driven vs semi-auto con approval).
4. **`identity_only` lane interaction con projection**: V1 default `full_period` salvo `members.active=FALSE`. ¿Existe caso real donde `identity_only` deba excluir? Pendiente confirmar con operador HR.

## Roadmap by Slices

| Slice | Scope | Deliverables | Estado |
|---|---|---|---|
| 1 | ADR + index | Este doc + `DECISIONS_INDEX.md` entry | this session |
| 2 | Resolver foundation | `src/lib/payroll/exit-eligibility/{index,query,types}.ts` + tests | this session |
| 3 | Integration + lint rule | Refactor `pgGetApplicableCompensationVersionsForPeriod` behind flag; `greenhouse/no-inline-payroll-scope-gate` modo warn | this session |
| 4 | Provider closure command | Endpoint extension + capability + audit + outbox | next session |
| 5 | UI contract | `Cerrar con proveedor` action invokes command; chips + warnings en inspector + nomina proyectada | next session |
| 6 | Drift signal | Reader `identity.relationship.member_contract_drift` + wire-up | next session |
| 7 | Docs + manuals | Update `docs/documentation/hr/offboarding.md`, `docs/documentation/hr/periodos-de-nomina.md`, manuales | next session |

## Related Canonical Patterns

- **TASK-571 / TASK-699 / TASK-766 / TASK-774** — VIEW canonica + helper + reliability signal + lint rule. Aplicado aqui como "resolver canonico TS + signal + lint" (sin VIEW porque el predicate es per-member, no aggregation).
- **TASK-700 / TASK-765** — state machine + CHECK + audit. Aplicado al provider closure command (Slice 4).
- **TASK-742** — defense-in-depth 7-layer. Slice 4 sigue el template (capability + DB CHECK + UI + signal + audit + outbox + workflow).
- **TASK-721** — canonical asset uploader. Evidence opcional via `workforce_offboarding_external_provider_evidence_draft` contextType.
- **TASK-720** — `aggregateBankKpis` TS-only declarative reader. Pattern fuente para el resolver.
- **TASK-672** — Platform Health rich struct + thin predicate (`safeModes`). Pattern fuente para `isMemberInPayrollScope`.
- **TASK-872** — `workforce_intake_status` gate feature flag pattern. Pattern fuente para `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED`.
- **TASK-877** — workforce.member.complete_intake (signal-then-command). Pattern fuente para drift reconciliation V1.1+.

## References

- Spec task: `docs/tasks/in-progress/TASK-890-workforce-exit-payroll-eligibility-window.md`
- Schema offboarding: `migrations/20260504203143513_task-760-offboarding-case-foundation.sql`
- Reader payroll actual: `src/lib/payroll/postgres-store.ts:835-906`
- BQ fallback: `src/lib/payroll/get-compensation.ts:530-604`
- Derivation UI: `src/lib/workforce/offboarding/work-queue/derivation.ts:24-62`
- Operating model: `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
