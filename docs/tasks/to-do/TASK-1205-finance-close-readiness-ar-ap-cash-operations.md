# TASK-1205 — Finance Close Readiness AR/AP Cash Operations

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `command`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `Finance P1.1`
- Domain: `finance|treasury|close|operations`
- Blocked by: `none`
- Branch: `task/TASK-1205-finance-close-readiness-ar-ap-cash-operations`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convierte el backlog operativo detectado por la auditoria Finance 2026-06-20 en un cierre gestionable: receivables vencidas, payables vencidas, external cash signals sin resolver y beneficiary payment profiles pendientes. La meta no es "arreglar saldos" sino dejar una politica y un runbook ejecutable para que Finance pueda cerrar periodo con colas conocidas, dueños y evidencia.

## Why This Task Exists

El audit confirma que caja/ledger estan sanos, pero Finance no esta listo para llamarse "operativamente limpio": hay 32 receivables vencidas, 129 payables vencidas, 70 external cash signals unresolved y perfiles de pago en draft/pending approval. Eso no es corrupcion contable; es backlog de operacion y control. Sin resolverlo, los dashboards pueden responder 200 y aun asi el cierre mensual queda incompleto bajo expectativas COSO/tesoreria.

## Goal

- Definir y materializar un close-readiness reader para AR/AP, external cash signals y payment profiles.
- Clasificar backlog por accion: cobrar, pagar, adoptar/dismiss external signal, aprobar/cancelar perfil, write-off/cancelar con evidencia.
- Agregar comandos/runbooks gobernados para drenaje controlado o declarar deuda historica no operativa.
- Dejar señales de confiabilidad para que `ledger-health` no mezcle corrupcion con backlog operacional sin dueno.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/audits/finance/FINANCE_DEEP_OPERABILITY_AUDIT_2026-06-20.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/documentation/finance/operacion-finance-end-to-end.md`
- `docs/documentation/finance/conciliacion-bancaria.md`
- `docs/documentation/finance/perfiles-de-pago-beneficiarios.md`
- `docs/documentation/finance/payment-orders-bank-settlement-resilience.md`

Reglas obligatorias:

- No corregir backlog mutando saldos o pagos canonicos sin evidencia fuente.
- Separar `data corruption`, `operational backlog` y `historical debt`.
- Reusar `src/lib/finance/external-cash-signals/**`, `src/lib/finance/beneficiary-payment-profiles/**` y payment orders antes de crear comandos nuevos.
- Toda accion sensible requiere capability fina, audit trail y razon del operador.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1192` para capability gates de Payment Orders/Treasury si la task agrega o toca writes sensibles.
- `ISSUE-058` no bloquea el cierre, pero las alertas Teams deben recibir el estado cuando el webhook exista.
- Existing runtime:
  - `src/lib/finance/external-cash-signals/list-signals.ts`
  - `src/lib/finance/external-cash-signals/adopt-signal.ts`
  - `src/lib/finance/external-cash-signals/dismiss-signal.ts`
  - `src/lib/finance/beneficiary-payment-profiles/queue-summary.ts`
  - `src/app/api/admin/finance/ledger-health/route.ts`
  - `src/app/api/admin/finance/external-signals/**`
  - `src/app/api/admin/finance/payment-profiles/**`

### Blocks / Impacts

- Desbloquea una postura honesta de cierre mensual Finance.
- Reduce ruido en `/api/admin/finance/ledger-health`.
- Alimenta dashboards de cashflow, AR/AP y payment operations.
- Precede cualquier decision de automatizar cobros/pagos con Nexa.

### Files owned

- `src/lib/finance/external-cash-signals/**`
- `src/lib/finance/beneficiary-payment-profiles/**`
- `src/lib/finance/payment-orders/**`
- `src/app/api/admin/finance/ledger-health/route.ts`
- `src/app/api/admin/finance/external-signals/**`
- `src/app/api/admin/finance/payment-profiles/**`
- `docs/documentation/finance/operacion-finance-end-to-end.md`

## Current Repo State

### Already exists

- External cash signals ya tienen list/adopt/dismiss.
- Beneficiary payment profiles ya tienen queue, approve, cancel y sensitive reveal governance.
- Payment Orders tienen estado y side effect de expense payment verificado.
- Ledger/cash integrity muestra drift canonico 0; el problema no es balance roto.

### Gap

- No hay un close-readiness packet unico que separe backlog operacional de corrupcion.
- No hay politica versionada para decidir old pending income/expense, write-off/cancelacion o next action.
- `ledger-health` puede quedar 503 por backlog real sin dar una ruta clara de drenaje y owner.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: Finance close readiness reader + existing external cash/payment profile/payment order commands
- Consumidores afectados: Finance ops, ledger-health, dashboards, future Teams alerts, future Nexa actions
- Runtime target: `app`, `staging`, `production`

### Contract surface

- Contrato existente a respetar: normalized payment readers, external cash signal commands, payment profile commands, payment order commands.
- Contrato nuevo o modificado: close-readiness reader/packet and optional governed remediation commands.
- Backward compatibility: `compatible` for reads; writes must be `gated`.
- Full API parity: any remediation action must be server-side command/API, not UI-only checklist.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_finance.income`, `greenhouse_finance.expenses`, `greenhouse_finance.external_cash_signals`, `greenhouse_finance.beneficiary_payment_profiles`, payment order tables.
- Invariantes que no se pueden romper:
  - Paid amounts continue to reconcile through canonical normalized readers.
  - External cash adoption/dismissal preserves audit history.
  - Payment profiles cannot bypass approval/reveal-sensitive controls.
  - Historical debt classification must not mark real obligations as paid.
- Tenant/space boundary: internal Finance tenant; organization/client identifiers only through existing finance readers.
- Idempotency/concurrency: remediation commands must be idempotent per object/action/reason; batch operations require dry-run.
- Audit/outbox/history: every mutating remediation records actor, reason, before/after, source evidence.

### Migration, backfill and rollout

- Migration posture: `none|additive` depending on whether a close-readiness snapshot table is needed after Plan Mode.
- Default state: read-only assessment first; write commands disabled or allowlisted until staging evidence.
- Backfill plan: dry-run report for all backlog categories before any apply.
- Rollback path: revert PR for code; reverse/remediate individual commands through audit if mutable apply occurs.
- External coordination: Finance owner sign-off for write-off/cancel/legacy-debt policy.

### Security and access

- Auth/access gate: finance admin/treasury capability gates from `TASK-1192` when mutating.
- Sensitive data posture: finance, bank movement evidence, payment profile PII/masked bank data.
- Error contract: canonical sanitized errors; no raw bank/profile data in error payloads.
- Abuse/rate-limit posture: batch apply must be bounded and dry-run first.

### Runtime evidence

- Local checks: unit tests for readiness classification and no raw-ledger recomputation.
- DB/runtime checks: read-only SQL counts before/after by category.
- Integration checks: staging smoke for external signal adopt/dismiss and payment profile queue reads; destructive commands only with allowlist.
- Reliability signals/logs: close-readiness signal names defined in Plan Mode.
- Production verification sequence: deploy read-only -> compare counts -> finance sign-off -> limited apply -> monitor signal.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Any remediation action lives in `src/lib/finance/**` command/reader, not in UI.
- [ ] Writes use capability gates and audit/outbox/history where applicable.
- [ ] Programmatic path exists for Finance ops, future Teams/Nexa and CLI/runbook.
- [ ] Denied actions fail before mutation and without leaking sensitive details.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Close-readiness discovery packet

- Build/read a packet that reports AR, AP, external cash signals and payment profile queues with aging, amount, owner candidates and next-action class.
- Prove the packet does not recompute paid/settled math outside canonical readers.

### Slice 2 — Policy and action taxonomy

- Define allowed states/actions: collect, pay, adopt external signal, dismiss external signal, approve/cancel profile, mark legacy debt, escalate.
- Document decision criteria and required evidence per action.

### Slice 3 — Governed remediation commands

- Reuse existing commands where possible.
- Add only missing commands with idempotency, reason, audit and capability gates.
- Require dry-run for batch operations.

### Slice 4 — Reliability and ledger-health separation

- Add/adjust reliability signals so operational backlog is visible but not mislabeled as ledger corruption.
- Update `ledger-health` response to separate corruption blockers from operational readiness blockers.

## Out of Scope

- No new UI route; UI can be a follow-up after the backend/data contract stabilizes.
- No automatic write-off of receivables/payables.
- No bypass of payment profile approval or bank sensitive reveal controls.
- No changes to PnL recognition rules.

## Detailed Spec

Use the audit counts as initial targets, but Plan Mode must re-query live data before implementing. The first deliverable should be read-only and reproducible; write paths come only after the classification taxonomy is validated.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3 -> Slice 4.
- No apply/batch mutation before Slice 1 read-only counts and Slice 2 policy are reviewed.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Real obligation incorrectly dismissed | finance close | medium | dry-run, allowlist, finance sign-off, audit reason | close-readiness dismissed amount spike |
| External cash adopted to wrong object | reconciliation | medium | reuse existing rule evaluator and manual evidence | external cash unresolved/adopted drift |
| Payment profile bypass | treasury controls | low | keep existing approve/reveal gates | payment profile pending profile count |

### Feature flags / cutover

- Read-only packet: sin flag, additive.
- Mutating batch commands: default disabled or allowlisted until staging sign-off; exact flag decided in Plan Mode.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert PR | <10 min | si |
| Slice 2 | Revert docs/policy | <10 min | si |
| Slice 3 | Disable flag/allowlist, revert PR; data repair guided by audit log | variable | parcial |
| Slice 4 | Revert signal/ledger-health change | <10 min | si |

### Production verification sequence

1. Deploy read-only packet to staging and compare counts with audit baseline.
2. Run dry-run remediation on staging for a narrow allowlist.
3. Review finance sign-off for policy.
4. Deploy to production with mutations disabled or allowlisted.
5. Apply limited production action set and monitor signals.

### Out-of-band coordination required

Finance owner must approve any write-off, cancellation, dismissal policy or historical-debt classification.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] A close-readiness packet reports AR/AP, external cash signals and payment profile queue status from canonical sources.
- [ ] Backlog is classified as operational readiness, corruption, or historical debt with binary criteria.
- [ ] Any mutation has capability, actor, reason, idempotency and audit trail.
- [ ] `ledger-health` or equivalent reliability output separates ledger corruption from operational backlog.
- [ ] Staging evidence proves counts before/after and no payment/cash drift regression.

## Verification

- `pnpm exec vitest run src/lib/finance`
- `pnpm task:lint --task TASK-1205`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed --finance --runtime --data --docs`
- Staging read-only SQL/API smoke documented in the task closure.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] Finance audit fue actualizado con el nuevo close-readiness estado.

## Follow-ups

- UI cockpit only if the read/command contract proves stable and useful for operators.

## Open Questions

- Which Finance owner approves historical-debt classification?
- Should old pending receivables/payables be remediated in Greenhouse first or reconciled against Nubox/accounting records first?
