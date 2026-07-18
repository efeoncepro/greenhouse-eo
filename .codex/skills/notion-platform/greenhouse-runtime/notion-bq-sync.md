# greenhouse-runtime — notion-bq-sync (legacy service) — STUB

> **Status**: STUB
> **Next review trigger**: TASK-577 emerge to formally redesign sync infra, or TASK-879 audit completes
> **Last verified**: 2026-05-17

## Context

`notion-bq-sync` es el Cloud Run service legacy que sync de Notion → BigQuery raw. Existe desde pre-knowledge-cutoff de esta skill, mantenido pero no canonizado completamente en esta skill al 2026-05-17.

Capability know:
- Cloud Run Python service (verificar)
- Triggered por Cloud Scheduler daily
- Lee Notion data sources via API legacy (probablemente `Notion-Version: 2022-06-28` — needs audit)
- Escribe a BQ `greenhouse_raw.notion_ops_*` tables
- Downstream: `runNotionSyncOrchestration` → conformed → PG

Gaps que poblar:
- Repo / path canonical exacto del service
- Notion-Version + endpoint usage (legacy vs canonical)
- Auth strategy (token, WIF setup)
- Schedule canonical
- Last upgrade timestamp + maintainer
- Cost steady-state
- Failure modes observed
- Migration path (Workers Database Sync? Cloud Run rewrite?)

Cuando TASK-577 inicie o TASK-879 entregue audit completo, poblar con detalle.

## Cross-refs

- `use-cases-greenhouse/read-pipeline-conformed.md` — pipeline canonical actual
- `developer-platform-2026/worker-syncs.md` — alternative future
- `decision-frameworks/workers-vs-cloud-run.md` — migration framework
- TASK-577 (Greenhouse, futuro) — sync evolution
- TASK-879 (Greenhouse) — Developer Platform readiness
