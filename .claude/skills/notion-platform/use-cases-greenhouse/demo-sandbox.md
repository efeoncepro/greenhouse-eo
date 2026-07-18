# Use case — Demo sandbox operational detail — STUB

> **Status**: STUB
> **Next review trigger**: TASK-910 Slice 1 implementation start
> **Last verified**: 2026-05-17

## Context

Operational detail de cómo Greenhouse runtime trabaja con el demo teamspace `Greenhouse Migration Demo` (TASK-910). Cubre:
- Inserción de demo events en `task_status_transitions_demo`
- Computación de RpA / OTD / etc. en sandbox (NUNCA contamina prod)
- Bonus calculation guardrail (3 layers defense in depth — demo NUNCA toca payroll)
- Reliability signals duales con sufijo `_demo`
- Operator workflow para validar feature post-Sandbox-verde

Skeleton de archivo poblará cuando TASK-910 S1 inicie con:
- API endpoints `POST /api/admin/notion-platform/demo/*`
- Helper canonical `registerDemoMember` + `isDemoMember`
- Pattern de exclusión `WHERE tenant_type != 'demo'` per reader que toca payroll
- Smoke test canonical
- Operational runbook

## Cross-refs hoy

- `greenhouse-runtime/demo-teamspace.md` — IDs + config canonical
- TASK-910 (Greenhouse) — implementation spec
- ADR `GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1` — gate canonical
