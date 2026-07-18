# Notion API — Data Model canonical

> **Source**: https://developers.notion.com/reference/intro + 2025-09-03 + 2026-03-11 breaking changes
> **Last verified**: 2026-05-17

## 1. Jerarquía de objetos canonical (post 2025-09-03)

```
Workspace
  └── Teamspace (optional grouping)
        ├── Page (free-form content)
        │     └── Block[] (rich text, content blocks)
        └── Database (container, was "database" in legacy API)
              └── Data Source[] (NEW since 2025-09-03 — query target)
                    └── Page[] (each row is a Page with properties)
                          └── Block[] (page content body)
```

**Cambio crítico 2025-09-03**: lo que antes era "database" se desdobló en:
- **Database** = container conceptual (sigue existiendo como wrapper)
- **Data Source** = la entidad que se queryea (canonical para reads)

→ **endpoint legacy** `POST /v1/databases/{id}/query` **deprecated**
→ **endpoint canonical** `POST /v1/data_sources/{id}/query`

Ver `developer-platform-2026/data-sources-vs-databases.md` para migration detail.

## 2. Object types canonical (per API response)

Cada response tiene `object: "<type>"`. Tipos canonical:

| `object` value | Descripción |
|---|---|
| `page` | Página individual (puede ser standalone o row de data source) |
| `block` | Bloque de contenido (paragraph, heading, list_item, etc.) |
| `database` | Container database (legacy) |
| `data_source` | Source dentro de database (canonical desde 2025-09-03) |
| `user` | Person, bot, o agent (`type` discriminator) |
| `comment` | Comentario sobre página o bloque |
| `list` | Wrapper para responses paginadas (con `results[]` array) |
| `property_item` | Single property value (para responses paginadas de properties) |
| `view` | View configurada sobre un data source (Views API, Mar 19 2026) |

## 3. Page object — shape canonical

```jsonc
{
  "object": "page",
  "id": "ddc0e9a7-...",
  "created_time": "2026-05-17T...",
  "created_by": { "object": "user", "id": "..." },
  "last_edited_time": "2026-05-17T...",
  "last_edited_by": { "object": "user", "id": "..." },
  "cover": { "type": "external", "external": { "url": "..." } } | null,
  "icon": { "type": "emoji", "emoji": "📄" } | { "type": "icon", "icon": { ... } } | null,
  "parent": {
    "type": "data_source_id",        // o "page_id", "workspace", "block_id"
    "data_source_id": "5126d7d8-..."
  },
  "archived": false,                  // DEPRECATED — usa in_trash desde 2026-03-11
  "in_trash": false,                  // CANONICAL
  "is_locked": false,                 // desde Mar 30, 2026
  "properties": { /* ver §4 */ },
  "url": "https://www.notion.so/...",
  "public_url": "..." | null
}
```

## 4. Property types canonical

Propiedades en una page que pertenece a un data source. Cada property tiene `type` discriminator.

### Read + Write (set via API)

| Type | Value shape (read) | Set via PATCH (write) |
|---|---|---|
| `title` | `{ title: [{ plain_text, ... }] }` | `{ title: [{ text: { content: "..." } }] }` |
| `rich_text` | `{ rich_text: [{ plain_text, ... }] }` | `{ rich_text: [{ text: { content: "..." } }] }` |
| `number` | `{ number: 42 }` | `{ number: 42 }` o `null` |
| `select` | `{ select: { id, name, color } }` | `{ select: { name: "..." } }` o `null` |
| `multi_select` | `{ multi_select: [{ id, name, color }] }` | `{ multi_select: [{ name: "..." }] }` |
| `date` | `{ date: { start, end, time_zone } }` | `{ date: { start: "ISO" } }` |
| `checkbox` | `{ checkbox: true }` | `{ checkbox: true }` |
| `url` | `{ url: "..." }` | `{ url: "..." }` |
| `email` | `{ email: "..." }` | `{ email: "..." }` |
| `phone_number` | `{ phone_number: "..." }` | `{ phone_number: "..." }` |
| `people` | `{ people: [{ object: "user", id }] }` | `{ people: [{ id }] }` |
| `relation` | `{ relation: [{ id }] }` | `{ relation: [{ id }] }` |
| `files` | `{ files: [{ name, type, external: { url } }] }` | `{ files: [{ name, type: "external", external: { url } }] }` |
| `status` | `{ status: { id, name, color } }` | `{ status: { name: "..." } }` (writable desde Mar 19, 2026) |
| `verification` | `{ verification: { state, date } }` | `{ verification: { state: "verified" } }` (writable desde Mar 25, 2026) |
| `place` | `{ place: { lat, lon, name, address } }` | `{ place: { lat, lon } }` |

### Read-only (computed by Notion)

| Type | Por qué no escribible |
|---|---|
| `formula` | Computed por Notion engine — **NUNCA writable via API**. Base del bug class TASK-877 follow-up. |
| `rollup` | Aggregated de related pages — **NUNCA writable** |
| `created_time` / `created_by` | Auto-set al INSERT |
| `last_edited_time` / `last_edited_by` | Auto-updated al UPDATE |

**Implicación crítica para Greenhouse**: la migración TASK-901 nace porque RpA era `formula` (read-only, frágil, sin tests). El writeback canónico usa `number` property `[GH] RpA` que Greenhouse SÍ puede escribir.

## 5. User object — bot, person, agent

Desde May 11, 2026 hay 3 tipos canonical de "user":

```jsonc
{
  "object": "user",
  "id": "...",
  "type": "person" | "bot" | "agent",
  // Si person:
  "person": { "email": "user@example.com" },
  // Si bot (incluye integrations):
  "bot": { "workspace_name": "...", "owner": { ... } },
  // Si agent (Custom Agent o External Agent):
  "agent": { "name": "...", "description": "..." }
}
```

**Para echo-loop detection** en webhook handlers:
- Tu integration aparece en `webhook.authors[]` como `{ type: "bot", id: <tu integration id> }`
- Compare `webhook.integration_id` con cada `author.id` para detectar escrituras propias

## 6. Block object — content body

Cada page tiene un body de blocks (rich text, headings, lists, etc.). Blocks tienen:

```jsonc
{
  "object": "block",
  "id": "...",
  "type": "paragraph" | "heading_1" | "heading_2" | "heading_3" | "heading_4" | "bulleted_list_item" | "numbered_list_item" | "to_do" | "toggle" | "code" | "quote" | "callout" | "divider" | "table" | "tab" | "meeting_notes" | "...",
  "has_children": boolean,
  "in_trash": boolean,
  "parent": { ... },
  "<type>": { /* shape per type */ }
}
```

**Cambios recientes**:
- `heading_4` agregado Mar 30, 2026
- `tab` block agregado Mar 25, 2026
- `transcription` renombrado a `meeting_notes` en 2026-03-11 (BREAKING)

## 7. Filters canonical para data source queries

```jsonc
{
  "filter": {
    "and": [
      { "property": "status", "status": { "equals": "Aprobado" } },
      { "property": "due_date", "date": { "on_or_before": "2026-05-31" } }
    ]
  },
  "sorts": [{ "property": "last_edited_time", "direction": "descending" }],
  "page_size": 100,
  "start_cursor": "..."
}
```

### Mejoras recientes (Apr 17, 2026)
- `equals`/`does_not_equal` aceptan arrays en select/status (multi-value match)
- `multi_select` soporta `contains`/`does_not_contain` con array values
- People filter soporta `"me"` (resuelve al user OAuth) — internal integrations retorna empty/all

### Relative date filter (Mar 30, 2026)
Date filters aceptan: `"today"`, `"tomorrow"`, `"yesterday"`, `"one_week_ago"`, `"one_week_from_now"`, `"one_month_ago"`, `"one_month_from_now"`. Resueltos at query time.

## 8. Parent types canonical

Una page/block puede tener parent de:

| Parent type | Shape |
|---|---|
| `data_source_id` | `{ type: "data_source_id", data_source_id: "..." }` (canonical) |
| `database_id` | `{ type: "database_id", database_id: "..." }` (legacy) |
| `page_id` | `{ type: "page_id", page_id: "..." }` |
| `workspace` | `{ type: "workspace", workspace: true }` (top-level) |
| `block_id` | `{ type: "block_id", block_id: "..." }` (para sub-blocks) |
| `agent_id` | `{ type: "agent_id", agent_id: "..." }` (NEW May 11, 2026) |

## 9. ID conventions

- IDs son UUID v4
- Dashes opcionales (mismo ID con o sin dashes es equivalente)
- IDs son **opacos** — NUNCA parsear o componer manualmente
- Para Notion URLs: el ID es el último segmento `?p=<id>` o path final

## 10. Cross-refs canonical

- `developer-platform-2026/data-sources-vs-databases.md` — migration legacy → canonical
- `api-reference/endpoints-canonical.md` — todos los endpoints v2026-03-11
- `patterns-canonical/property-writeback.md` (stub) — writeback `[GH] <metric>` pattern
- `greenhouse-runtime/property-allowlist.md` — INPUT_PROPS canonical
- CLAUDE.md § "Delivery Metrics Ownership Boundary invariants" — boundary canonical
