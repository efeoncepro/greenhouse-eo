# Notion MCP Server — canonical para agentes

> **Status**: interactive agent surface; capability names vary by client
> **Last verified**: 2026-07-18

## 1. Qué es Notion MCP

Notion provee un **MCP (Model Context Protocol) server** que expone Notion capabilities como tools invocables por agentes (Claude, Cursor, Codex, custom).

Claude commonly exposes `mcp__claude_ai_Notion__<tool>`. Codex and other hosts may use shorter names. Inspect `current_tool_access` or the active tool list; never couple reusable instructions to one namespace.

## 2. Tools disponibles canonical

| Tool | Propósito |
|---|---|
| `mcp__claude_ai_Notion__notion-search` | Global search across workspace |
| `mcp__claude_ai_Notion__notion-fetch` | Fetch page/database content by URL or ID |
| `mcp__claude_ai_Notion__notion-create-pages` | Create new pages |
| `mcp__claude_ai_Notion__notion-update-page` | Update existing page properties/content |
| `mcp__claude_ai_Notion__notion-duplicate-page` | Duplicate a page |
| `mcp__claude_ai_Notion__notion-move-pages` | Move pages (parent change) |
| `mcp__claude_ai_Notion__notion-create-database` | Create new database (incluyendo status property write, Mar 19) |
| `mcp__claude_ai_Notion__notion-update-data-source` | Update data source schema (incluyendo status, Mar 19) |
| `mcp__claude_ai_Notion__notion-query-database-view` | Query view con filters/sorts guardados |
| `notion-query-data-sources` | Query data source rows when exposed |
| `mcp__claude_ai_Notion__notion-create-view` | Create view (table, board, calendar, etc.) — Mar 11 2026 |
| `mcp__claude_ai_Notion__notion-update-view` | Update view config |
| `mcp__claude_ai_Notion__notion-create-comment` | Comment block-level (May 2026 improvement) |
| `mcp__claude_ai_Notion__notion-get-comments` | List comments |
| `mcp__claude_ai_Notion__notion-get-users` | List workspace users |
| `mcp__claude_ai_Notion__notion-get-teams` | List teamspaces |
| `mcp__claude_ai_Notion__notion-query-meeting-notes` | Query AI meeting notes (May 11, 2026) |
| `notion-get-async-task` | Poll an async create/update to terminal state |

⚠️ El set exacto evoluciona. Verify the current host's tool list. Create/update may expose `allow_async`; honor `poll_after_seconds` and poll the task rather than treating `202` as success.

The complete Enhanced Markdown grammar lives in a dedicated MCP Resource rather than the create-tool schema on some hosts. Load it when available or use `api-reference/enhanced-markdown-canonical.md`.

## 3. Mejoras recientes (May 2026)

Per changelog Feb 26 → Apr 17, 2026:
- **~91% token reduction** en schema-returning tools (database/data source operations)
- Block-level comments support
- Notion Sites viewing (no solo workspace pages)
- Meeting transcripts retrieval
- Individual data source fetch (vs only via database)
- `update_verification` command
- Search incluye Slack DMs (cuando connectado)
- Fetch accepts `notion.com` AND `notion.so` domains
- Enterprise audit logging (visible en log)
- Flattened parameters (menos nesting en tool calls)

## 4. Cuándo usar MCP vs API directa vs ntn CLI

| Caso | Path canonical |
|---|---|
| Agente Claude Code en repo Greenhouse leyendo data Notion | **MCP** (mcp__claude_ai_Notion__notion-fetch) |
| Agente Claude Code creando page demo en Notion | **MCP** (mcp__claude_ai_Notion__notion-create-pages) |
| Discovery interactivo de schema durante design | **MCP** o **ntn CLI** |
| Runtime productivo (Cloud Run worker, webhook handler) | **API directa** (@notionhq/client) |
| Deploy de Notion Worker | **ntn CLI** (único path) |
| Backfill batched 3,200 pages | **API directa** con Cloud Tasks (MCP no escala) |
| Operador manual one-shot ad-hoc | **ntn CLI** o **MCP** |
| Greenhouse CLI delegation/status | **Shared command + registry + API directa** |

## 5. Uso típico durante design phase Greenhouse

### Discovery schema antes de comprometer code

```
Agent: voy a usar mcp__claude_ai_Notion__notion-fetch para inspeccionar
el shape canonical de Tasks data source Sky antes de escribir el
helper countCorrectionTransitions.

→ notion-fetch(url='https://notion.so/...23039c2f...')
→ inspect properties, status options, formulas existentes
→ Update spec V1 si emerge gap
```

### Crear demo teamspace (TASK-910 operador-side)

```
Operator + Agent collaboration:
1. Operator hace clone manual de Efeonce template (Notion app UI)
2. Agent usa mcp__claude_ai_Notion__notion-fetch para identificar IDs
   canonical del clone resultado
3. Agent persiste IDs en src/lib/notion-metrics/demo-config.ts
```

### Verify writeback functioning

```
Post-deploy TASK-901 S6:
→ mcp__claude_ai_Notion__notion-fetch(<task-id>)
→ Verify property '[GH] RpA' tiene value esperado
→ Compare con valor Greenhouse-side
```

## 6. Hard rules canonical

- **PREFER** MCP for interactive discovery and one-shots when available
- **NUNCA** uses MCP para path runtime productivo — MCP es agent-facing, no service-facing
- **NUNCA** use MCP OAuth context as a headless CLI credential
- **SIEMPRE** verify MCP tool exists antes de invocar (set evolves)
- **SIEMPRE** poll async operations to terminal state
- **NUNCA** asumes MCP tiene paridad 1:1 con API — MCP puede omitir endpoints rare
- **NUNCA** loggees responses MCP en logs persistentes sin redact (puede contener PII)

## 7. Limitaciones conocidas MCP vs API

- MCP no expone webhook subscription management (no hay tools para ello — match API limitation)
- MCP no expone Workers management (que es exclusivo `ntn`)
- MCP no expone External Agents API (alpha)
- MCP rate limits son los mismos del backend Notion API (~3 req/sec per integration)
- `notion-get-teams` may enumerate teamspaces interactively; REST cannot. Persist verified destinations in the registry instead of rediscovering them per command.

## 8. Cross-refs

- `developer-platform-2026/ntn-cli.md` — CLI alternative
- `sdks-and-clients/notion-client-node.md` — SDK runtime
- `reference/notion-mcp-tools-inventory.md` — inventory detallado
- `use-cases-greenhouse/discovery-endpoints.md` (stub) — discovery flow
- `api-reference/enhanced-markdown-canonical.md` — Enhanced Markdown grammar
- `greenhouse-runtime/work-space-registry.md` — multi-space runtime resolver
