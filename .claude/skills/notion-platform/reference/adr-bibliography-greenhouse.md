# Greenhouse ADR bibliography — Notion-relevant — STUB

> **Status**: STUB
> **Next review trigger**: Cuando emerge nuevo ADR Greenhouse que toca Notion runtime
> **Last verified**: 2026-05-17

## ADRs relevantes Notion

### Boundary + métricas
- `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` (2026-05-17) — Notion = task OS / Greenhouse = motor exclusivo de métricas. Establece writeback canonical pattern.
- `GREENHOUSE_METRIC_SPEC_PATTERN_V1.md` (2026-05-17) — 1 métrica crítica = 1 spec canonical en `docs/architecture/metrics/<METRIC>_V1.md`
- `GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1.md` (2026-05-17) — 8 stop-gates obligatorios per flip + demo teamspace pre-prod gate

### Metric specs canonical
- `docs/architecture/metrics/RPA_V1.md` — TASK-901 V1.0 source
- `docs/architecture/metrics/FTR_V1.md` — TASK-909 V1.0 source
- `docs/architecture/metrics/CUMPLIMIENTO_V1.md`
- `docs/architecture/metrics/CYCLE_TIME_V1.md`
- (12 más en docs/architecture/metrics/)

### Pipeline canonical
- CLAUDE.md § "Notion sync canónico — Cloud Run + Cloud Scheduler" — pipeline current
- ADR potential: `GREENHOUSE_NOTION_METRIC_COMPUTE_V1.md` (TASK-901 S9 ship — pending)

### Identity bridge
- CLAUDE.md § "Identity Bridge Cutover Protocol" — bridge resolution canonical
- TASK-877 follow-up commit `4fc8c0c4` (2026-05-16) — bridge fix canonical

### Demo + sandbox
- TASK-910 spec — Demo teamspace IDs canonical + governance

### Webhooks
- CLAUDE.md § "HubSpot inbound webhook" (TASK-706) — pattern reference para Notion-side
- TASK-901 Slice 2 design — Notion webhook handler skeleton

### Workers + Developer Platform readiness
- TASK-879 spec — Developer Platform readiness eval framework
- TASK-880 spec — Notion API modernization + PAT primitives

## Mantenimiento

Cuando emerge nuevo ADR Greenhouse que toque Notion runtime:
1. Agregar entry aquí con título + fecha + 1-line description
2. Cross-ref desde archivos relevantes (api-reference/, patterns-canonical/, etc.)
3. Si el ADR canoniza un nuevo pattern, considerar agregar archivo POPULATED nuevo a esta skill

## Cross-refs

- Cualquier task TASK-901, TASK-908, TASK-910, TASK-877 referencia estos ADRs
- SKILL.md §0 estado canónico debe reflejar decisions ADR vigentes
