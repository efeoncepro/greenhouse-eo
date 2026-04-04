## Delta 2026-03-30
- `TASK-142` ya cerró el source base para `get_space_360`:
  - store `src/lib/agency/space-360.ts`
  - route `GET /api/agency/spaces/[id]`
- Esta task ya no debe asumir que `Space 360` es un placeholder; puede envolver el contrato existente y extenderlo con tools Nexa.

## Delta 2026-04-04

- `TASK-118` ya cerró la foundation backend/pipeline de `ICO AI Core`.
- Los query tools de Agency pueden consumir `ico_ai_signals` y readers persistidos como contexto upstream cuando corresponda.
- `TASK-232` ya cerró el carril LLM async:
  - `TASK-159` debe tratarlo como dependency ya disponible
  - reutilizar readers tipo `llm-enrichment-reader` para tools Agency/Nexa en vez de crear wiring nuevo
  - esta task sigue siendo consumer/tooling, no runtime owner del pipeline generativo

# TASK-159 — Nexa Agency Tools: Query, Recommend, Act

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | P2 |
| Impact | Muy alto |
| Effort | Muy alto |
| Status real | `Diseño` |
| Rank | — |
| Domain | Agency / AI |
| Sequence | Agency Layer V2 — Phase 7 |

## Summary

7 Nexa tools for Agency operations organized in 3 levels. Query (read-only): `get_space_360`, `get_capacity_overview`, `get_revenue_forecast`, `get_anomalies`. Recommend (suggest actions): `escalate_to_lead`. Act (execute with confirmation): `execute_reassignment`, `generate_retrospective`. Each tool has defined input/output contracts and permission boundaries.

## Architecture Reference

`docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md` §5.4 Consumers (Nexa), §6 Fase 4 (Nexa Integration)

## Dependencies & Impact

- **Depende de:** TASK-152 (Anomaly Engine — `get_anomalies` source), TASK-153 (Capacity Forecast — `get_capacity_overview` source), Space 360 API (TASK-142 — `get_space_360` source), Nexa tool infrastructure (TASK-110/TASK-114 complete)
- **Impacta a:** Future Nexa capabilities, operational automation
- **Archivos owned:** `src/lib/ai/tools/agency/`, `src/app/api/ai-tools/agency/route.ts`

## Scope

### Slice 1 — Query tools (~6h)

`get_space_360`: returns Space summary (identity, health, risk, team, services, KPIs). `get_capacity_overview`: returns team utilization by role, gaps, forecast. `get_revenue_forecast`: returns pipeline scenarios. `get_anomalies`: returns active anomalies with severity and suggestions. All read-only, consume existing API endpoints/stores.

### Slice 2 — Recommend tools (~4h)

`escalate_to_lead`: given anomaly or risk, compose escalation message with context (what, why, suggested action) and notify via notification system. Does not execute changes, only creates structured escalation.

### Slice 3 — Act tools with confirmation (~6h)

`execute_reassignment`: propose FTE reallocation between spaces. Show impact preview (how utilization changes for source and target spaces). Require user confirmation before executing. `generate_retrospective`: compile Space retrospective document from delivery, finance, and anomaly data for a given period. Output markdown.

### Slice 4 — Tool registry + testing (~4h)

Register all 7 tools in Nexa tool registry. Define tool schemas (input parameters, output format). Permission boundaries: query tools available to all Agency viewers, recommend tools to Operations Lead+, act tools to Agency Admin only. Integration tests with mock data.

## Acceptance Criteria

- [ ] 7 tools registered in Nexa tool registry
- [ ] Query tools return structured data from existing stores
- [ ] `escalate_to_lead` creates notification with structured context
- [ ] `execute_reassignment` shows impact preview and requires confirmation
- [ ] `generate_retrospective` produces markdown retrospective
- [ ] Permission boundaries enforced per tool level
- [ ] Tools handle missing data gracefully with informative messages
- [ ] Natural language queries route to appropriate tool

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/lib/ai/tools/agency/get-space-360.ts` | New — Space 360 query tool |
| `src/lib/ai/tools/agency/get-capacity-overview.ts` | New — capacity query tool |
| `src/lib/ai/tools/agency/get-anomalies.ts` | New — anomalies query tool |
| `src/lib/ai/tools/agency/execute-reassignment.ts` | New — reassignment action tool |
| `src/lib/ai/tools/agency/generate-retrospective.ts` | New — retrospective generation tool |
| `src/app/api/ai-tools/agency/route.ts` | New — agency tools API |
