# TASK-1199 — Economic Category Manual Queue Drain

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `command`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `Finance P1.2`
- Domain: `finance|management-accounting|data-quality`
- Blocked by: `none`
- Branch: `task/TASK-1199-economic-category-manual-queue-drain`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Drena la cola `economic_category_manual_queue` detectada por el audit Finance: 171 pendientes que no rompen caja, pero degradan confianza analitica y management accounting. El resultado esperado es una cola reducida por reglas declarativas, batch dry-run/apply y evidencia de no contaminar P&L/cash.

## Why This Task Exists

`economic_category` ya existe como dimension separada de `expense_type`, pero la cola manual quedo grande. Mientras esos casos sigan pendientes, Finance puede operar pagos y saldos, pero la analitica de costos, cash-out por categoria y P&L gerencial siguen con menor confianza.

## Goal

- Recontar y segmentar las 171 filas pendientes por tipo de fuente, vendor, amount, periodo y razon del resolver.
- Agregar reglas declarativas donde la decision sea repetible.
- Proveer un batch dry-run/apply idempotente para resolver el backlog con evidencia.
- Mantener excepciones ambiguas en cola con owner y motivo, no clasificarlas silenciosamente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/audits/finance/FINANCE_DEEP_OPERABILITY_AUDIT_2026-06-20.md`
- `docs/documentation/finance/categoria-economica-de-pagos.md`
- `docs/architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

Reglas obligatorias:

- `expense_type` fiscal/SII no reemplaza `economic_category`.
- No meter payroll, impuestos, costos financieros o treasury transit en overhead generico sin politica explicita.
- Las reglas nuevas deben ser explicables y testeables; baja confianza queda en cola.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- Existing resolver and queue:
  - `src/lib/finance/economic-category/resolver.ts`
  - `src/lib/finance/economic-category/writer-integration.ts`
  - `src/lib/finance/economic-category/types.ts`
  - `scripts/finance/backfill-economic-category.ts`
  - `greenhouse_finance.economic_category_manual_queue`

### Blocks / Impacts

- Mejora confianza de cash-out por categoria, operational P&L y cost analysis.
- Reduce ruido de data-quality.
- Alimenta `TASK-1198` cuando el backlog de close necesita separar deuda operacional de clasificacion analitica.

### Files owned

- `src/lib/finance/economic-category/**`
- `scripts/finance/backfill-economic-category.ts`
- migrations de reglas/seed si aplican
- tests bajo `src/lib/finance/economic-category/__tests__/**`
- `docs/documentation/finance/categoria-economica-de-pagos.md`

## Current Repo State

### Already exists

- `economic_category` esta separada de `expense_type`.
- Resolver con rules y manual queue existe.
- Hay migrations previas que corrigieron clasificaciones puntuales.

### Gap

- 171 filas siguen `pending`.
- No hay batch de drenaje operacional con reporte dry-run/applied/rejected.
- La cola no esta suficientemente conectada a criterios de close-readiness.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: `greenhouse_finance.economic_category_manual_queue` + resolver rules
- Consumidores afectados: finance data-quality, cash-out analytics, operational P&L, close-readiness
- Runtime target: `local`, `staging`, `production`

### Contract surface

- Contrato existente a respetar: economic category resolver and writer integration.
- Contrato nuevo o modificado: declarative rules + drain command/report.
- Backward compatibility: `compatible`; ambiguous cases remain pending.
- Full API parity: resolution is command/script-backed and can be exposed later, not a manual SQL-only fix.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_finance.economic_category_manual_queue`, `greenhouse_finance.income`, `greenhouse_finance.expenses`.
- Invariantes que no se pueden romper:
  - Fiscal `expense_type` remains untouched unless explicitly in scope.
  - Cash/payment amounts remain unchanged.
  - Existing manually resolved rows are not overwritten without explicit migration rule.
- Tenant/space boundary: internal finance tenant; records keep existing org/client/space linkage.
- Idempotency/concurrency: drain command must be re-run safe and skip already resolved/archived rows.
- Audit/outbox/history: resolution records source, rule id, confidence and operator/reason when manual.

### Migration, backfill and rollout

- Migration posture: `backfill` / rule seed.
- Default state: dry-run first.
- Backfill plan: segment -> dry-run -> allowlist apply -> full apply only after review.
- Rollback path: reverse by audit metadata/rule id where possible; otherwise targeted SQL repair with finance sign-off.
- External coordination: finance/accounting sign-off for ambiguous classes.

### Security and access

- Auth/access gate: command/script internal; UI/API follow-up would need finance category capability.
- Sensitive data posture: finance vendor/payment metadata, no secrets.
- Error contract: no raw SQL dumps in API/logs; reports can live in docs/artifacts if redacted.
- Abuse/rate-limit posture: batch bounded and dry-run first.

### Runtime evidence

- Local checks: resolver tests and drain dry-run tests.
- DB/runtime checks: before/after counts by `status`, `category`, `rule_id`.
- Integration checks: staging dry-run and allowlist apply.
- Reliability signals/logs: queue pending count and unresolved high-risk categories.
- Production verification sequence: dry-run prod -> finance review -> apply allowlist -> monitor queue.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Rules and drain logic live in server-side resolver/command code.
- [ ] Any future UI only consumes the same command/read contract.
- [ ] Mutating resolution path records audit/reason and is re-run safe.

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

### Slice 1 — Queue segmentation

- Query and summarize pending queue by source object, vendor/person identity, amount bands, period and resolver reason.
- Identify rows safe for declarative rules vs rows requiring human/accounting decision.

### Slice 2 — Declarative rule expansion

- Add rules for high-confidence repeated classes.
- Cover rules with tests and examples.

### Slice 3 — Drain command

- Implement dry-run/apply command or script with allowlist, idempotency and audit metadata.
- Keep ambiguous rows pending with explicit reason.

### Slice 4 — Signals and docs

- Add/update signal for pending queue.
- Update finance documentation with rule policy and manual review expectations.

## Out of Scope

- No UI for queue review.
- No changes to tax filing semantics.
- No direct P&L allocation policy beyond category classification.

## Detailed Spec

Plan Mode must first inspect the queue and propose rule candidates. Do not create broad regex classifications without reviewed examples.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3 -> Slice 4.
- No apply before dry-run report is reviewed.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Misclassification contaminates management accounting | finance analytics | medium | confidence thresholds, tests, finance review | economic category reclassification spike |
| Manual decisions overwritten | finance data | low | skip resolved/archived rows, audit rule id | resolved rows changed count |
| Fiscal category conflated with economic category | fiscal/accounting | medium | docs/tests enforce separation | lint/tests around economic category |

### Feature flags / cutover

- Sin flag for rules if additive and dry-run verified.
- Batch apply must support dry-run and allowlist.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert report code | <10 min | si |
| Slice 2 | Revert rule PR | <10 min | si |
| Slice 3 | Reverse by audit metadata/rule id | variable | parcial |
| Slice 4 | Revert signal/docs | <10 min | si |

### Production verification sequence

1. Run dry-run against production.
2. Review rule candidates with finance.
3. Apply allowlist batch.
4. Verify pending count decreased and no cash/ledger drift changed.

### Out-of-band coordination required

Finance/accounting review for ambiguous categories and high-impact vendor classes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Pending queue is segmented with live counts and root causes.
- [ ] At least the high-confidence repeated classes are resolved by tested declarative rules.
- [ ] Drain command/script supports dry-run, allowlist apply and idempotent rerun.
- [ ] Ambiguous rows stay pending with explicit reason/owner.
- [ ] Finance audit shows reduced pending queue without payment/cash drift regression.

## Verification

- `pnpm exec vitest run src/lib/finance/economic-category`
- `pnpm task:lint --task TASK-1199`
- `pnpm ops:lint --changed`
- Production/staging dry-run report attached to closure.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `docs/documentation/finance/categoria-economica-de-pagos.md` quedo actualizado.

## Follow-ups

- UI/manual review queue if the remaining ambiguous backlog is material.

## Open Questions

- Which categories require accountant approval versus finance operator approval?
