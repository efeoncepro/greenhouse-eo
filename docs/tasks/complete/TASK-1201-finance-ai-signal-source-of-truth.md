# TASK-1201 — Finance AI Signal Source Of Truth

## Delta 2026-06-24 — Full API parity: capability gobernada

- Se cerró el matiz de parity: el reader de Finance AI insights queda detrás de la
  capability gobernada **`finance.ai.read_insights`** — seed en `capabilities_registry`
  (migración `20260624000621427_…`) + catálogo TS + grant en `runtime.ts`
  (route_group=finance + FINANCE_ADMIN/FINANCE_ANALYST/EFEONCE_ADMIN, superset sin
  regresión) + enforcement `can()` en `GET /api/finance/intelligence/nexa-insights`.
  Reutilizable por UI/Nexa/API con autorización fina. Guard grant-coverage verde.

## Delta 2026-06-23

- TASK-1200 (complete) entregó el readiness gate de cobertura laboral
  (`resolveLaborAllocationReadiness` + `finance.operational_pl.cost_coverage_degraded`
  honesto) que el Slice 4 de esta task referencia como condición (b) del gate de
  Nexa-finance. **El desbloqueo de Nexa-finance sigue diferido**: junio 2026 queda
  `pending` hasta que corra su payroll (próxima semana); cuando flipee a `canonical`
  + el `dataStatus` de Finance AI sea `ready`, recién ahí se puede habilitar el
  consumer Nexa-finance (follow-up).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Closure summary (2026-06-23)

**Estado: code complete + verificado local; deploy pendiente (local-first, sin push); enablement Nexa-finance diferido por diseño (gated) hasta TASK-1200.**

- **Slice 1** — ADR `GREENHOUSE_FINANCE_AI_SIGNAL_SOURCE_OF_TRUTH_DECISION_V1.md` + `DECISIONS_INDEX`. SoT = snapshot por-período + ledger provenance append-only; event-log intra-período diferido.
- **Slice 3a** — migración additive `greenhouse_serving.finance_ai_materialization_runs` (append-only) aplicada a dev Cloud SQL; `db.d.ts` regenerado.
- **Slice 3b** — run-truth honesto: materializer escribe provenance (`succeeded`/`empty_positive`/`skipped_no_eligible_data`/`failed`); worker `signalsSeen===0` → noop (run=null); callers actualizados; reliability signal `finance.ai.signals.stale_materialization`.
- **Slice 2** — reader/status lee provenance del anomaly step + `snapshots_evaluated` (distingue empty-positive de empty-pending); SQL ejercitada contra PG real (gate TASK-893).
- **Slice 4 (gated)** — guard `isFinanceAiInsightConsumable`; arch Delta + doc funcional + manual. Nexa-finance NO construido (esta task es el gate).

**Evidencia:** `pnpm test` 7746/0 · `pnpm build` OK · `pnpm lint`/`tsc` limpios · `pg:doctor` sano · `docs:closure-check` 0 warnings · `migrate:status` sin pendientes · `finance:e2e-gate` skip (sin write handlers). Realidad PG: 3 tablas existen, materialization_runs creada (0 rows).

**Rollout pendiente (operador):** push a develop → deploy staging → correr cron `finance-ai-signals` → verificar provenance + `dataStatus`. Migración a producción vía release control plane. **Desbloqueo Nexa-finance = TASK-1200 + follow-up.**

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `reader`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `Finance P2.1`
- Domain: `finance|nexa|ai|reliability`
- Blocked by: `TASK-1200`
- Branch: `task/TASK-1201-finance-ai-signal-source-of-truth`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Define y materializa la fuente de verdad para señales AI de Finance antes de permitir drill/actions de Nexa sobre finanzas. El audit encontro enrichment runs pero 0 señales persistidas utilizables; sin SoT, Nexa podria hablar con confianza sobre una capa que no existe.

## Why This Task Exists

Finance tiene helpers AI (`src/lib/finance/ai/**`) y runs de enrichment, pero el audit reporta 66 runs con 0 `finance_ai_signals`/enrichments persistidos. Eso es una brecha de confiabilidad, no un problema cosmetico: las respuestas o acciones Nexa deben anclarse a signals durables, actuales y degradables honestamente.

## Goal

- Decidir si el SoT de Finance AI signals sera snapshot current, event log append-only, enrichment history o una vista derivada.
- Hacer que readers y status helpers reporten `ready`, `empty-positive`, `empty-pending` o `degraded` con evidencia real.
- Persistir o exponer señales Finance de forma durable y anti-oracle.
- Bloquear finance actions/drills de Nexa hasta que la fuente sea confiable.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/audits/finance/FINANCE_DEEP_OPERABILITY_AUDIT_2026-06-20.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- No inventar finance AI insights en UI/Nexa si no hay signal durable.
- No borrar/reemplazar historico si el dato representa observaciones en el tiempo; preferir append-only cuando aplique.
- Nexa consume readers/packets canonicos, no tablas directas ni heuristicas inline.
- Si hay ambiguedad entre snapshot y event log, proponer ADR antes de implementar cutover.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1200` for P&L/labor allocation readiness, because Finance AI should not explain false margin.
- Existing AI files:
  - `src/lib/finance/ai/materialize-finance-signals.ts`
  - `src/lib/finance/ai/nexa-data-status.ts`
  - `src/lib/finance/ai/llm-enrichment-reader.ts`
  - `src/lib/finance/ai/finance-signal-types.ts`
  - `src/lib/finance/ai/resolve-finance-signal-context.ts`

### Blocks / Impacts

- Blocks trustworthy Nexa finance drill/actions.
- Impacts Finance Dashboard AI surfaces and any future Teams/weekly digest finance intelligence.
- May require ADR if it changes source-of-truth semantics.

### Files owned

- `src/lib/finance/ai/**`
- `src/app/api/finance/intelligence/**`
- reliability signal queries for finance AI if present/discovered
- docs/architecture Nexa/Finance deltas if SoT changes

## Current Repo State

### Already exists

- Finance AI helper modules and tests exist.
- Nexa data status helper exists for Finance AI status.
- Audit found enrichment run evidence.

### Gap

- Durable persisted finance signals are effectively empty.
- The intended SoT is not explicit enough for Nexa action/read parity.
- Degraded/empty states are not backed by a reliable source contract.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `reader`
- Source of truth afectado: Finance AI signal/enrichment storage and readers
- Consumidores afectados: Nexa, Finance Dashboard, future Teams alerts, API Platform readers
- Runtime target: `app`, `worker`, `staging`, `production`

### Contract surface

- Contrato existente a respetar: finance AI helpers and Nexa data status patterns.
- Contrato nuevo o modificado: `finance-ai-signals.v1` reader/packet or ADR-defined equivalent.
- Backward compatibility: `gated`; consumers must degrade honestly if no signals.
- Full API parity: Nexa and UI consume the same reader/packet.

### Data model and invariants

- Entidades/tablas/views afectadas: finance AI tables discovered in Plan Mode; possibly new additive table/view if SoT missing.
- Invariantes que no se pueden romper:
  - No finance insight claims canonical P&L when `cost_coverage_degraded` is active.
  - Signals have stable IDs, period, generated_at/observed_at and source evidence.
  - Empty-positive is distinguishable from degraded/missing pipeline.
- Tenant/space boundary: internal finance subject; client/org scope filtered by caller.
- Idempotency/concurrency: materialization must avoid duplicate current signals or use append-only IDs deliberately.
- Audit/outbox/history: materialization run status and signal provenance are recorded.

### Migration, backfill and rollout

- Migration posture: `none|additive|view refresh` depending on chosen SoT.
- Default state: read-only/degraded until first reliable materialization.
- Backfill plan: dry-run for recent periods; no historical invention without source evidence.
- Rollback path: flag off reader/materializer or revert additive storage.
- External coordination: AI provider flags/secrets only if materializer calls LLM; no provider change expected in planning.

### Security and access

- Auth/access gate: Finance read/Nexa internal subject gates; no client leakage.
- Sensitive data posture: finance metrics, possibly client/org financial performance.
- Error contract: no prompt/provider raw errors to UI.
- Abuse/rate-limit posture: LLM/materializer calls bounded and kill-switchable.

### Runtime evidence

- Local checks: tests for status states and reader packet.
- DB/runtime checks: count signals, runs, current vs history, freshness.
- Integration checks: staging materialization or read smoke.
- Reliability signals/logs: no-signals-with-eligible-source, stale runs, degraded materializer.
- Production verification sequence: deploy read-only -> materialize allowlist -> verify status -> expose consumers.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Finance AI read contract is server-side and shared by UI/Nexa/API consumers.
- [ ] No UI-only finance insight generation.
- [ ] Any future action stays `propose -> confirm -> execute` and is blocked until reader evidence is trustworthy.

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

### Slice 1 — Source-of-truth decision

- Inventory existing finance AI tables/readers/runs.
- Decide snapshot vs append-only vs derived view; propose ADR if changing semantics.

### Slice 2 — Reader/status contract

- Define finance AI signal packet and status states.
- Ensure empty/degraded states are honest and testable.

### Slice 3 — Materialization/provenance

- Fix or add materialization path so eligible periods produce durable signals or explicit empty-positive.
- Record provenance and run status.

### Slice 4 — Consumer guardrails

- Make Nexa/Finance consumers degrade until signal status is ready.
- Document blocked finance AI actions/drills until SoT is healthy.

## Out of Scope

- No new visible UI.
- No autonomous finance write actions.
- No provider/model switch unless required by existing materializer.

## Detailed Spec

Plan Mode must start by verifying actual DB tables and counts rather than assuming table names from code. If the task changes signal lifecycle semantics, create/update an ADR before code.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3 -> Slice 4.
- No consumer enablement before Slice 2 contract and Slice 3 evidence.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Nexa presents invented finance signal | nexa/finance | medium | ready/degraded gate, no UI generation | finance AI no-signal with eligible data |
| False margin explained as insight | management accounting | high until TASK-1200 | block on cost coverage signal | `finance.operational_pl.cost_coverage_degraded` |
| Provider errors leak | AI/security | low | sanitized error contract | Sentry finance_ai domain |

### Feature flags / cutover

- Keep any finance AI consumer flag OFF/degraded until staging evidence.
- Materializer must have kill-switch if it calls external providers.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert docs/ADR | <10 min | si |
| Slice 2 | Revert reader/status code | <10 min | si |
| Slice 3 | Disable materializer/flag, revert additive migration | variable | parcial |
| Slice 4 | Disable consumer flag/revert guard | <10 min | si |

### Production verification sequence

1. Deploy read-only status contract.
2. Run materializer/read smoke in staging.
3. Confirm signals or honest empty-positive.
4. Promote to production with consumers guarded.

### Out-of-band coordination required

Finance owner approval for any AI signal category used in management decisions.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Finance AI source-of-truth is documented and implemented or explicitly ADR-blocked.
- [ ] Reader/status contract distinguishes ready, empty-positive, empty-pending and degraded.
- [ ] Durable signals or honest no-signal state exist in staging.
- [ ] Nexa/Finance consumers do not claim finance insights without ready status.
- [ ] Runtime evidence includes counts for runs, signals and freshness.

## Verification

- `pnpm exec vitest run src/lib/finance/ai`
- `pnpm task:lint --task TASK-1201`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed --finance --runtime --data --docs`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] Finance/Nexa architecture docs or ADR index updated if SoT changed.

## Follow-ups

- UI or Nexa action tasks after the signal source is healthy.

## Open Questions

- Should Finance AI history be append-only like Nexa AI signals, or current snapshot plus run history?
