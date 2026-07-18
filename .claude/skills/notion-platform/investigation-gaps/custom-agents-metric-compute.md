# Investigation gap — Custom Agents para metric compute V2+ — STUB

> **Status**: ABIERTO al 2026-05-17 — V2+ scope
> **Next review trigger**: TASK-901 V1.0 estable + 30 días post-flip + Workers GA + Sentry integration
> **Last verified**: 2026-05-17

## Context

Especulativo V2+: Greenhouse podría ship un Custom Agent "ICO Performance Insights" en Notion workspaces clientes que:
- Operador chat con agent dentro Notion
- Agent invoca Workers Agent Tools (Greenhouse-built)
- Tools llaman backend Greenhouse autenticado
- Backend computes via canonical helpers (calculateRpa, calculateOtd, etc.)
- Response rendered in-Notion con tables/charts

Use cases posibles:
- "Cuál es el RpA promedio de Daniela últimos 3 meses?"
- "Proyección bonus equipo Sky para mes corriente"
- "Top 5 tareas con cycle time atípico esta semana"
- "Forecast capacity team Q3"

## Pre-requisitos antes de comprometer

1. TASK-901 V1.0 estable + writeback operando 30+ días post-flip
2. Workers → GA (sin Beta liability)
3. Sentry domain integration nativa o shim canonical
4. ADR de auth federation Notion ↔ Greenhouse data API
5. Capability granular `notion.agent.consume_kpi_data` definida
6. UX research sobre operator workflow real (¿este chat es valuable vs current dashboards Greenhouse?)
7. Cost analysis credits Workers vs incremental value

## Decision blockers actuales

- Workers Beta sin SLA
- Sentry gap
- Federation auth no estandarizado
- No demo internal validation
- Risk de fragmentación (operators ya tienen Greenhouse portal — agent en Notion duplica vs reemplaza?)

## Acción canonical

V1: NO scope. Re-evaluate post Q4 2026 cuando varios pre-requisitos cumplan.

## Cross-refs

- `developer-platform-2026/agent-tools.md`
- `developer-platform-2026/external-agents-api.md`
- `developer-platform-2026/workers-canonical.md`
- `decision-frameworks/agent-tool-vs-traditional.md`
- `decision-frameworks/workers-vs-cloud-run.md`
- `investigation-gaps/workers-production-readiness.md`
