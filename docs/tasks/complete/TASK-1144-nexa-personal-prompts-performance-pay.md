# TASK-1144 — Nexa "Mi espacio": prompts de performance (ICO) + pago

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `nexa|platform|ai|hr|delivery|ui`
- Blocked by: `none` (TASK-1141 registry + resolver `personal` en `develop`)
- Branch: `task/TASK-1144-nexa-personal-prompts-performance-pay`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Enriquece el resolver `personal` de Nexa (Mi espacio, TASK-1141) con dos señales propias más allá de vacaciones/aprobaciones: (1) **performance / métricas ICO** del colaborador ("Tienes N entregables atrasados", "¿Revisamos tu desempeño del mes?") y (2) **su pago** ("Tu liquidación del mes ya está lista, ¿la abrimos?"). Reusa readers existentes (`readMemberMetrics`, `pgGetMemberPayrollEntries`), cero infra nueva.

## Why This Task Exists

TASK-1141 dejó el resolver `personal` con vacaciones + aprobaciones. El colaborador también quiere arrancar la conversación desde **su desempeño** (sus métricas ICO) y **su pago** (su liquidación). Ambos readers ya existen — solo falta wirearlos como señales data-aware.

## Goal

- El resolver `personal` suma señales: `overdue_tasks` (ICO), `performance_review` (ICO neutral cuando hay actividad), `payslip_ready` (pago). Reusa `readMemberMetrics(memberId, year, month)` + `pgGetMemberPayrollEntries(memberId)`.
- Cada reader degrada independiente (Promise.allSettled): si ICO (BigQuery) falla, las señales de pago/vacaciones siguen.
- Anti-oracle: SIEMPRE `subject.memberId` de sesión (igual que TASK-1141). Allowlist: counts/estados, NUNCA el monto de la liquidación.
- Copy es-CL vía `greenhouse-ux-writing`. Reusa hint UI + flag.

## Dependencies & Impact

- **Depende de:** TASK-1141 (resolver `personal`). Readers: `readMemberMetrics` (`src/lib/ico-engine/read-metrics.ts`), `pgGetMemberPayrollEntries` (`src/lib/payroll/postgres-store.ts`).
- **Archivos owned:** `src/lib/nexa/data-aware-personal-resolver.ts`, `src/lib/copy/nexa.ts`.

## Scope (slices)

- **Slice 1 — Señales ICO + pago + copy.** Extiende `buildPersonalPrompts` (facts += `overdueTasks`, `hasActivity`, `payslipReady`) + `resolvePersonalPrompts` (Promise.allSettled de leave + ICO + payroll, cada uno degradación independiente). Copy: `personal_overdue_tasks`, `personal_performance_review` (+ `personal_payslip_ready` ya existe). Tests.

## Out of Scope

- Nómina del operador (TASK-1142) · Finance global (TASK-1143).
- Recomputar ICO o nómina (solo se LEEN). Echar el monto de la liquidación (solo "está lista").
- Nueva UI (reusa cards + hint).

## Detailed Spec

- **ICO:** `readMemberMetrics(memberId, currentYear, currentMonth)` → `context.overdueTasks > 0` ⇒ `overdue_tasks` (anomaly, count); `context.totalTasks > 0` sin overdue ⇒ `performance_review` (kpi).
- **Pago:** `pgGetMemberPayrollEntries(memberId)` (ya filtra períodos approved/exported, DESC) → `rows[0].status === 'exported'` ⇒ `payslip_ready` (kpi). NUNCA el `netTotal`.
- **Degradación independiente:** `Promise.allSettled` — una fuente caída no tumba las otras (BigQuery del ICO es la más probable de degradar).
- Orden por valor: overdue (atención) > payslip (útil) > performance_review > approvals > own leave. Cap 4.

## Rollout Plan & Risk Matrix

N/A — additive, mismo flag `NEXA_SUGGESTED_PROMPTS_DATA_AWARE_ENABLED`, read-only, sin migraciones/env/schema. Rollback = revert commit (<2 min). Risk: monto de liquidación al prompt → mitigado por allowlist (solo "está lista", nunca `netTotal`) + test. Verificación: local flag ON → Nexa en `/my` con liquidación exportada / tareas atrasadas refleja la señal.

## Acceptance Criteria

- [ ] Con tareas atrasadas (ICO), el prompt lo refleja con el count; sin overdue pero con actividad → "¿Revisamos tu desempeño?".
- [ ] Con liquidación exportada del mes, el prompt la ofrece; NUNCA muestra el monto (test allowlist).
- [ ] Si el reader ICO (BigQuery) falla, las señales de pago/vacaciones siguen (test degradación independiente).
- [ ] Anti-oracle: usa SIEMPRE `subject.memberId` (test).
- [ ] `pnpm nexa:doc-gate` verde.

## Verification

- `pnpm local:check` + tests focales + suite Nexa.
- **UI por skills**: `greenhouse-ux-writing` (copy) + GVC en `/my` con señal real.
- `pnpm test` + `pnpm build`.

## Closing Protocol

- `Lifecycle: complete` + mover + sync README/REGISTRY + Delta `experience/suggested-prompts.md` + changelog/Handoff.

## Follow-ups

- Ficha incompleta (`workforce_intake_status`) — copy ya existe (`personal_intake_incomplete`), falta su reader.

## Closure 2026-06-15 — code-complete (performance ICO; pago = follow-up)

El resolver `personal` suma **performance ICO** (`readMemberMetrics`): atrasos → anomalía, actividad sin atrasos → starter de desempeño. `Promise.allSettled` (vacaciones + ICO) = degradación independiente. Anti-oracle por `subject.memberId`. Copy es-CL (greenhouse-ux-writing, 0 voseo).
Gates: tsc 0 · lint 0 · 10/10 tests focales · doc gate verde.
**Pago = follow-up (aparte):** el reader de histórico no distingue recencia ni estado del período → la señal "liquidación del mes lista" honesta necesita una query nueva validada contra PG. Copy `personal_payslip_ready` stubbeado. Se decidió NO shippear una señal always-on/imprecisa.
