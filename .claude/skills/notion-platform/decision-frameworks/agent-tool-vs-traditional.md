# Decision framework — Agent Tool (Workers) vs Traditional integration — STUB

> **Status**: STUB
> **Next review trigger**: Cualquier task que evalúe Custom Agent o External Agent integration
> **Last verified**: 2026-05-17

## Context

Workers Agent Tools (Beta) permiten que Custom Agents invoquen logic determinística. Alternativa tradicional: REST API endpoint Greenhouse-side + integration via MCP o Federation.

Decision tree:

```
¿La logic es invocada SOLO por un Notion Custom Agent?
    └── SÍ → Workers Agent Tool (única forma direct)

¿La logic es compleja + multi-step + cross-Greenhouse-systems?
    └── SÍ → REST API endpoint Greenhouse (Cloud Run)
              + MCP server exposure
              + Federation auth para que agent puede invocar

¿La logic es deterministic + read-only Notion data?
    └── SÍ + Notion data only → Workers Agent Tool candidate (cost-efficient)
    └── SÍ + needs Greenhouse data → Cloud Run + federation

¿Es discovery / non-critical exploration?
    └── SÍ → Workers OK (time-to-ship gana)

¿Es path productivo bonus / HR / Finance?
    └── SÍ → Cloud Run (Workers Beta = liability)
```

Cuando emerge un task concreto que evalúe Custom Agent integration, poblar con:
- Score matrix detallado
- Auth flow comparison (Workers internal vs Federation)
- Observability gap analysis
- Cost comparison post Aug 11 2026
- ADR template para per-case decision

## Cross-refs hoy

- `developer-platform-2026/workers-canonical.md`
- `developer-platform-2026/agent-tools.md`
- `developer-platform-2026/external-agents-api.md`
- `decision-frameworks/workers-vs-cloud-run.md`
- `investigation-gaps/custom-agents-metric-compute.md` (también stub)
