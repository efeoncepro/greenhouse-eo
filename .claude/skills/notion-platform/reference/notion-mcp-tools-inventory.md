# Notion MCP tools — portable inventory

> **Status**: interactive agent surface; exact names and availability vary by host.
> **Last verified**: 2026-07-18
>
> Claude may expose `mcp__claude_ai_Notion__notion-*`; Codex and other hosts may expose `notion-*`, `fetch` or `search`. Inspect current tool access instead of hardcoding a namespace.

## 1. Capability inventory

### Read operations
| Tool name | Purpose |
|---|---|
| `mcp__claude_ai_Notion__notion-fetch` | Fetch page o database content por URL o ID (accepts notion.com + notion.so) |
| `mcp__claude_ai_Notion__notion-search` | Global search across workspace (incluye Slack DMs si connected) |
| `mcp__claude_ai_Notion__notion-query-database-view` | Query view con filters/sorts guardados |
| `notion-query-data-sources` | Query one or more data sources when exposed by the host |
| `mcp__claude_ai_Notion__notion-get-users` | List workspace users |
| `mcp__claude_ai_Notion__notion-get-teams` | List teamspaces |
| `mcp__claude_ai_Notion__notion-get-comments` | List comments en block/page |
| `mcp__claude_ai_Notion__notion-query-meeting-notes` | Query AI meeting notes (NEW May 11 2026) |
| `notion-fetch self` / capability inspection | Inspect identity and `current_tool_access` when supported |

### Write operations — Pages
| Tool name | Purpose |
|---|---|
| `mcp__claude_ai_Notion__notion-create-pages` | Create page(s). Acepta markdown content. |
| `mcp__claude_ai_Notion__notion-update-page` | Update properties / content |
| `mcp__claude_ai_Notion__notion-duplicate-page` | Duplicate page |
| `mcp__claude_ai_Notion__notion-move-pages` | Move parent (post Jan 15 2026) |

### Write operations — Databases / Data Sources
| Tool name | Purpose |
|---|---|
| `mcp__claude_ai_Notion__notion-create-database` | Create database (con status property write desde Mar 19) |
| `mcp__claude_ai_Notion__notion-update-data-source` | Update data source schema (incluyendo status type) |

### Write operations — Views
| Tool name | Purpose |
|---|---|
| `mcp__claude_ai_Notion__notion-create-view` | Create view (table, board, calendar, timeline, etc.) — Mar 11 2026 |
| `mcp__claude_ai_Notion__notion-update-view` | Update view config |

### Write operations — Comments
| Tool name | Purpose |
|---|---|
| `mcp__claude_ai_Notion__notion-create-comment` | Comment (block-level support desde May 2026) |

### Async operations

`notion-create-pages` and update operations may accept `allow_async`. A `202` response is not completion: poll the returned task with `notion-get-async-task` after `poll_after_seconds` until terminal state.

The full Notion-flavored Markdown grammar is intentionally not repeated in every write-tool schema. Load the host's dedicated Enhanced Markdown MCP Resource when available, or use `api-reference/enhanced-markdown-canonical.md`.

⚠️ El set exacto puede evolucionar. Verificar `<system-reminder>` MCP capabilities list al inicio de sesión.

## 2. Decision matrix — cuándo usar qué tool

### Discovery / Exploration
| Necesito... | Tool canonical |
|---|---|
| Investigar shape de page específica | `notion-fetch` |
| Buscar pages relacionadas a un topic | `notion-search` |
| Listar todos los users del workspace | `notion-get-users` |
| Investigar schema de data source antes de PATCH | `notion-fetch` (data source URL) |
| Consultar items por filtros | `notion-query-data-sources` when available |
| Ver comments en una page | `notion-get-comments` |

### Operations from agent
| Necesito... | Tool canonical |
|---|---|
| Crear page demo / sandbox | `notion-create-pages` |
| Actualizar property de page (one-shot manual) | `notion-update-page` |
| Clonar template para nuevo tenant | `notion-duplicate-page` |
| Mover page bajo nuevo parent | `notion-move-pages` |
| Modificar schema de data source (add property) | `notion-update-data-source` |
| Crear nueva view custom | `notion-create-view` |

### NO usar MCP para
- Path runtime productivo automatizado (es agent-facing, no service-facing)
- Resolver destinos de una CLI headless (usar registry + REST/shared command)
- Bulk operations >10-20 items (rate limit pressure + MCP latency overhead)
- Backfill grande (usar API directa con Cloud Tasks)
- Webhook handlers (usa @notionhq/client directo en route handlers)

## 3. Mejoras recientes (~91% token reduction)

Per changelog Feb 26 - Apr 17 2026, los tools de schema-returning (`notion-create-database`, `notion-update-data-source`) ahora retornan **~91% menos tokens** que la versión legacy.

Beneficios:
- Agentes que llaman estos tools consumen menos context window
- Fits mejor en multi-step workflows
- Reduces hallucination risk por context exhaustion

## 4. Pattern canonical de uso en design phase

### TASK-901 Slice 1 Discovery

```
Agent: voy a usar Notion MCP para verificar nombres exactos de properties Notion
       en Efeonce Tasks DS antes de comprometer INPUT_PROPS_ALLOWLIST.

→ mcp__claude_ai_Notion__notion-fetch(url='<Efeonce Tasks DS URL>')
→ inspect properties array
→ identificar: Status, completed_at, due_date, Assignee, Correcciones (legacy formula)
→ verificar aliases tenant Sky con segunda fetch

→ Update src/lib/notion-metrics/config.ts con INPUT_PROPS_ALLOWLIST verified
```

### TASK-910 Demo IDs verification

```
Operator hizo clone manual en Notion app.
Agent: voy a usar MCP para extraer IDs canonical del demo teamspace.

→ mcp__claude_ai_Notion__notion-fetch(url='<Demo teamspace URL>')
→ extract teamspace_id
→ list databases inside (Tareas, Proyectos, Sprints)
→ per database: fetch data_source_id (post 2025-09-03 canonical)

→ Persistir en src/lib/notion-metrics/demo-config.ts (TASK-910 S0)
```

## 5. Hard rules canonical MCP usage

- **PREFER MCP** para exploración y one-shots interactivos cuando el tool existe
- **NUNCA** uses MCP para path runtime productivo — es agent-facing, not service-facing
- **NUNCA** uses MCP OAuth context as the credential model for a headless CLI
- **SIEMPRE** verify MCP tool exists antes de invocar (set evolves)
- **SIEMPRE** poll async writes to a terminal state
- **NUNCA** asumes MCP tiene paridad 1:1 con API REST — MCP puede omitir endpoints rare
- **NUNCA** loggees responses MCP en logs persistentes sin redact
- **NO MCP available para**: webhook subscription management (= API limitation), Workers management (= ntn CLI only), External Agents API (alpha waitlist)

## 6. Teamspaces and runtime boundary

`notion-get-teams` can enumerate teamspaces in an interactive MCP OAuth session. The public REST API does not provide an equivalent runtime teamspace enumeration endpoint. Bootstrap with MCP only when helpful; persist the verified mapping in the Greenhouse registry and use scoped integration credentials thereafter.

## 7. Versionado MCP

MCP server Notion versions independently from API. La feature parity es cercana pero no exacta. Cuando hay mismatch (ej. nuevo endpoint API pero MCP aún no lo soporta), workaround es fetch via API directa.

## 8. Cross-refs

- `developer-platform-2026/ntn-cli.md` — alternative
- `sdks-and-clients/notion-mcp-server.md` — overview
- `sdks-and-clients/notion-client-node.md` — runtime client
- `use-cases-greenhouse/discovery-endpoints.md` (stub) — operativo
- `api-reference/enhanced-markdown-canonical.md` — grammar and content operations
- `greenhouse-runtime/work-space-registry.md` — runtime destination resolution
