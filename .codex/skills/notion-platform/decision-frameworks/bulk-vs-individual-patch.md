# Decision framework — Bulk PATCH vs Individual PATCH — STUB

> **Status**: STUB
> **Next review trigger**: Notion publica `/v1/pages/bulk` oficial, O TASK-901 S5 confirma sequential como canonical V1
> **Last verified**: 2026-05-17

## Context

Hoy `/v1/pages/bulk` mencionado en TASK-901 spec **NO EXISTE** en docs canonical (ver `patterns-canonical/bulk-patch-batching.md` §1). Las alternativas canonical son sequential throttled + Workers Database Sync (Beta) + parallel limited (discovery only).

Cuando emerge bulk endpoint oficial o ship TASK-901 S5 con decisión canonical V1, poblar este archivo con:
- Score matrix bulk vs individual
- Latency comparison (1 request × N items vs N requests)
- Error isolation comparison (1 fail vs N independents)
- Cost comparison
- Observability granularity
- Cuándo prefer cada uno

## Cross-refs hoy

- `patterns-canonical/bulk-patch-batching.md` — alternativas canonical actuales
- `api-reference/endpoints-canonical.md` — endpoints disponibles
- TASK-901 S5 (Greenhouse) — implementación canonical
