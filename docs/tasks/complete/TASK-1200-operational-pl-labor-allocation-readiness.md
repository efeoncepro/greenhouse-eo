# TASK-1200 — Operational P&L Labor Allocation Readiness

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Closure summary (2026-06-23)

**Estado: complete (code + docs); verificado local. Junio se auto-sana cuando corra su payroll (próxima semana).**

- **Slice 1 (root cause):** confirmado contra PG real — el costo 0 NO es bug del pipeline. `payroll_periods` solo tiene Feb–May 2026; junio no existe aún (payroll corre la próxima semana, confirmado por el operador). Costo 0 = ausencia de payroll upstream (pre-sistema Nov2025–Ene2026; open Jun2026).
- **Slice 2:** `resolveLaborAllocationReadiness(year, month)` + `classifyLaborAllocationCoverage` (single source of truth) + `isLaborAllocationCoverageCanonical` (fail-closed). Estados `canonical | degraded | unavailable | pending`. SQL ejercitada contra PG real (gate TASK-893).
- **Slice 2b:** signal `finance.operational_pl.cost_coverage_degraded` ahora honesto: `error` solo ante `degraded` (bug, hoy 0); pending/unavailable → `ok`. Deja de ser error permanente por calendario.
- **Slice 2c:** readiness expuesto en `GET /api/finance/intelligence/operational-pl` (Full API parity).
- **Slice 3:** SIN rematerialización (no hay payroll que materializar; no se inventa costo). Estado por período documentado.
- **Slice 4:** arch Delta + audit FD-4 resolution + doc funcional.
- **Slice 5 (Full API parity):** capability gobernada `finance.operational_pl.read_readiness` — seed en `capabilities_registry` (migración + guard) + catálogo TS + grant en `runtime.ts` (route_group=finance + FINANCE_ADMIN/FINANCE_ANALYST/EFEONCE_ADMIN, superset sin regresión) + enforcement `can()` en el route. El reader queda detrás de una capability registrada, reutilizable por UI/Nexa/API con autorización fina.

**Evidencia:** `pnpm test` 7757/0 · build OK · lint/tsc limpios · pg:doctor sano · task/ops:lint 0/0 · docs:closure-check 0 flags. Datos PG: Nov2025–Ene2026 unavailable, Feb/May2026 canonical, Jun2026 pending; 0 degraded.

**Acceptance criteria:** root cause documentado con conteos ✓ · readiness previene margen canónico sin cobertura ✓ · junio explícitamente blocked-on-payroll (self-heal) con evidencia ✓ · signal posture matchea realidad (0 degraded → ok) ✓ · ningún consumer obtiene 0-cost margin silencioso (fail-closed reader) ✓.

**Pendiente operador:** push → deploy. Cuando corra el payroll de junio, el readiness flipea a `canonical` sin intervención (verificar `/api/finance/intelligence/operational-pl?year=2026&month=6`). Históricos pre-sistema quedan `unavailable` permanente (sin backfill de payroll histórico, por decisión del operador).

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `sync`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `Finance P1.3`
- Domain: `finance|cost-intelligence|payroll|management-accounting`
- Blocked by: `none`
- Branch: `task/TASK-1200-operational-pl-labor-allocation-readiness`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cierra la brecha que deja junio 2026 con revenue y costo 0 en `operational_pl_snapshots`. Cost Intelligence ya esta recuperado tecnicamente, pero el margen no es canonico hasta que el upstream de labor allocation alimente los costos laborales/clientes del periodo.

## Why This Task Exists

El audit Finance confirma que `TASK-1190` recupero el pipeline y agrega el signal `finance.operational_pl.cost_coverage_degraded`, pero junio 2026 sigue con 6.902.000 CLP de revenue y 0 costo. Ese numero no debe usarse para liderazgo, pricing, Nexa ni rentabilidad cliente. La causa ya no es handler/DDL; es upstream payroll/labor allocation faltante.

## Goal

- Identificar por que `client_labor_cost_allocation_consolidated` / inputs equivalentes tienen 0 filas para junio 2026.
- Materializar o desbloquear la asignacion laboral del periodo con trazabilidad al modelo de costo cargado.
- Rematerializar Cost Intelligence y `operational_pl_snapshots` para junio 2026.
- Mantener el signal degraded activo hasta que revenue con costo 0 deje de ser falso margen.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/audits/finance/FINANCE_DEEP_OPERABILITY_AUDIT_2026-06-20.md`
- `docs/architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md`
- `docs/documentation/hr/pagos-de-nomina.md`
- `docs/documentation/hr/periodos-de-nomina.md`

Reglas obligatorias:

- No ocultar falta de labor allocation usando costo 0 como margen real.
- El miembro es unidad atomica de costo cargado; no inventar overhead plano para tapar payroll faltante.
- No mutar payroll legal/cierre de nomina sin seguir sus gates.
- Reusar materializers/readers de Cost Intelligence; no crear un P&L paralelo.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1190` complete: cost attribution recovery and cost coverage signal.
- Existing stores/views:
  - `greenhouse_serving.client_labor_cost_allocation_consolidated`
  - `greenhouse_serving.commercial_cost_attribution`
  - `greenhouse_serving.operational_pl_snapshots`
  - `scripts/smoke-cost-intelligence-operational-pl.ts`
  - `src/app/api/finance/intelligence/operational-pl/route.ts`

### Blocks / Impacts

- Blocks use of June 2026 management margin for leadership and Nexa.
- Impacts client/space/organization P&L, pricing decisions and close-readiness.
- May expose payroll/HR upstream gaps that need separate payroll tasks if legal payroll is incomplete.

### Files owned

- `src/lib/commercial-cost-attribution/**`
- `scripts/smoke-cost-intelligence-operational-pl.ts`
- `src/app/api/finance/intelligence/operational-pl/route.ts`
- related payroll/labor allocation readers discovered in Plan Mode
- `docs/architecture/GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md`

## Current Repo State

### Already exists

- Cost attribution DDL/runtime issue is resolved by `TASK-1190`.
- `finance.operational_pl.cost_coverage_degraded` protects consumers from treating revenue/cost 0 as canonical.
- Serving layers for operational P&L exist.

### Gap

- June 2026 has revenue and zero cost across client/space/organization scopes.
- The upstream labor allocation source has 0 rows for June.
- There is no closure checklist that proves labor allocation coverage before margin consumption.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `sync`
- Source of truth afectado: payroll/labor allocation inputs -> commercial cost attribution -> operational P&L snapshots
- Consumidores afectados: Finance dashboard, operational P&L API, Nexa finance answers, pricing/quote margin decisions
- Runtime target: `worker`, `app`, `staging`, `production`

### Contract surface

- Contrato existente a respetar: Cost Intelligence materializers and operational P&L API.
- Contrato nuevo o modificado: readiness/preflight for labor allocation coverage by period.
- Backward compatibility: `compatible`; no change to P&L shape unless coverage becomes valid.
- Full API parity: readiness and rematerialization must be command/reader-backed, not manual SQL only.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_serving.client_labor_cost_allocation_consolidated`, `greenhouse_serving.commercial_cost_attribution`, `greenhouse_serving.operational_pl_snapshots`, payroll cost sources found in Plan Mode.
- Invariantes que no se pueden romper:
  - Payroll legal amounts are not changed by management allocation unless explicitly governed.
  - Client labor allocation is traceable to member/period/source.
  - Revenue with cost 0 remains degraded until coverage is proven.
- Tenant/space boundary: internal Efeonce operational P&L; client/space/org IDs via serving tables.
- Idempotency/concurrency: rematerialization must be re-run safe per period/scope.
- Audit/outbox/history: rematerialization emits/logs period, source count, allocation count and degraded/pass status.

### Migration, backfill and rollout

- Migration posture: `none|backfill|view refresh` depending on upstream root cause.
- Default state: signal remains degraded until verified.
- Backfill plan: dry-run June 2026, apply only after source counts reconcile.
- Rollback path: revert materializer change; restore previous snapshots if mutated incorrectly.
- External coordination: payroll/finance sign-off if payroll period data is incomplete or provisional.

### Security and access

- Auth/access gate: internal finance/payroll service/admin for manual rematerialization.
- Sensitive data posture: payroll/compensation and finance margin data.
- Error contract: no payroll PII/raw compensation in user-facing errors.
- Abuse/rate-limit posture: bounded rematerialization by period.

### Runtime evidence

- Local checks: tests for coverage/degraded logic.
- DB/runtime checks: source row counts, allocation counts, operational P&L before/after.
- Integration checks: staging rematerialization smoke for June 2026.
- Reliability signals/logs: `finance.operational_pl.cost_coverage_degraded` clears only when valid.
- Production verification sequence: dry-run -> staging apply -> prod apply -> API smoke.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Labor allocation readiness is a server-side reader/command.
- [ ] Rematerialization path is governed and re-run safe.
- [ ] No consumer gets a UI-only override to hide degraded margin.

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

### Slice 1 — Labor allocation root cause

- Trace June 2026 from payroll/member cost source to `client_labor_cost_allocation_consolidated`.
- Identify whether the gap is payroll period missing, allocation rule missing, materializer stale, or source filter issue.

### Slice 2 — Readiness/preflight gate

- Add a period-level readiness check that blocks canonical margin when labor allocation coverage is missing.
- Make the check reusable by Finance close and P&L consumers.

### Slice 3 — Backfill/rematerialization

- Fix the root cause or open a payroll blocker if legal payroll data is not available.
- Rematerialize June 2026 through canonical Cost Intelligence materializers.

### Slice 4 — Evidence and docs

- Update architecture/docs/audit with before/after counts and signal posture.
- Document whether June 2026 is canonical, provisional, or blocked.

## Out of Scope

- No new P&L UI.
- No payroll policy changes without payroll task/sign-off.
- No replacement of Cost Intelligence architecture.

## Detailed Spec

The task should treat June 2026 as the primary acceptance period and also check other periods listed by the audit with revenue/cost 0 (2025-11, 2025-12, 2026-01) to avoid a one-month patch.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3 -> Slice 4.
- Do not clear the degraded signal before Slice 3 evidence proves coverage.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| False margin published | finance/P&L | high pre-task | degraded signal fail-closed | `finance.operational_pl.cost_coverage_degraded` |
| Payroll cost leaked in logs/errors | payroll/privacy | medium | sanitized errors, aggregate evidence | Sentry domain finance/payroll |
| Incorrect allocation policy | management accounting | medium | use member-loaded model and finance sign-off | allocation coverage drift |

### Feature flags / cutover

- Signal remains active until coverage verified.
- Any new manual rematerialization command should be capability/flag gated if mutating production snapshots.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Read-only discovery; rollback not required beyond deleting generated local artifacts | inmediato | si |
| Slice 2 | Revert readiness code | <10 min | si |
| Slice 3 | Restore prior snapshots/re-run previous materializer | variable | parcial |
| Slice 4 | Revert docs/signal copy | <10 min | si |

### Production verification sequence

1. Read-only source count report for June 2026.
2. Staging rematerialization for June 2026.
3. API smoke `/api/finance/intelligence/operational-pl?year=2026&month=6&scope=client`.
4. Production dry-run and apply.
5. Verify degraded signal clears only if coverage is valid.

### Out-of-band coordination required

Payroll/finance sign-off if missing source data means June remains provisional.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Root cause for June 2026 zero-cost P&L is documented with source counts.
- [ ] Readiness check prevents canonical margin when labor allocation coverage is missing.
- [ ] June 2026 is rematerialized or explicitly blocked with owner and evidence.
- [ ] `finance.operational_pl.cost_coverage_degraded` posture matches reality.
- [ ] No consumer gets a silent 0-cost margin.

## Verification

- `pnpm exec vitest run src/lib/commercial-cost-attribution src/lib/finance`
- `pnpm task:lint --task TASK-1200`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed --finance --runtime --data --docs`
- Staging/prod operational P&L smoke documented in closure.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] Finance audit updated with canonical/provisional status.

## Follow-ups

- If source payroll is incomplete, create a payroll-domain task rather than burying the gap in Finance.

## Open Questions

- Is June 2026 payroll source complete enough for management allocation, or still provisional?
