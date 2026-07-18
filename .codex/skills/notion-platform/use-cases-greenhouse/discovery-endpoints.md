# Use case — Discovery endpoints (operativo) — STUB

> **Status**: STUB
> **Next review trigger**: TASK-901 Slice 1 Discovery o cualquier task que necesite enumerar Notion teamspace/databases/properties
> **Last verified**: 2026-05-17

## Context

Pattern operativo para discovery de schema Notion antes de comprometer code. Cubre:
- Enumerar teamspaces accessible
- Enumerar databases dentro de un teamspace
- Enumerar data sources dentro de una database
- Enumerar properties + types de un data source
- Validar permissions (integration tiene acceso?)
- Comparar schema cross-tenant (Efeonce vs Sky aliases)

Tools canonical disponibles:
- **Notion MCP** `mcp__claude_ai_Notion__notion-fetch` + `notion-search` (preferred para agentes)
- **`ntn` CLI** `ntn pages list` / `ntn data-sources list` (operator manual)
- **API directa** via `@notionhq/client` (runtime scripts)

Cuando TASK-901 S1 inicie Discovery, poblar este archivo con:
- Script canonical `scripts/notion-metrics/discovery.ts` skeleton
- Mapping property name → ID per tenant
- Output format esperado (qué se persiste en `config.ts`)
- Validation checklist (todos los inputs allowlist exist en ambos tenants)

## Cross-refs hoy

- `sdks-and-clients/notion-mcp-server.md` — MCP tools
- `developer-platform-2026/ntn-cli.md` — CLI alternative
- `greenhouse-runtime/property-allowlist.md` — destino del discovery output
- TASK-901 S1 (Greenhouse) — Discovery slice
