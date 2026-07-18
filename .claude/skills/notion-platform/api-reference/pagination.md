# Notion API — Pagination canonical

> **Source**: https://developers.notion.com/reference/intro + April 2026 updates
> **Last verified**: 2026-05-17

## 1. Shape canonical

Endpoints que retornan listas (search, query, blocks/children, users, etc.) usan **cursor-based pagination**.

### Request
```jsonc
{
  "page_size": 100,        // max 100, default 10
  "start_cursor": "..."    // opaque string, devuelto por response anterior
}
```

### Response
```jsonc
{
  "object": "list",
  "results": [ /* array de objects */ ],
  "next_cursor": "..." | null,    // si null → no más páginas
  "has_more": true | false,
  "type": "page_or_database",     // discriminator del tipo de results
  "page": { /* metadata adicional */ }
}
```

## 2. Reglas duras canonical

- **NUNCA** parsear `next_cursor` o asumir su shape — es **opaco** (puede ser UUID legacy o string base64 encoded session)
- **SIEMPRE** loopear hasta `has_more === false`
- **CAP page_size a 100** (max documented)
- **Default 10** si no especificas — usa 100 explícito para minimizar requests

## 3. Pattern canonical de iteración

```typescript
const fetchAllResults = async <T>(
  fetchPage: (cursor: string | null) => Promise<{ results: T[]; next_cursor: string | null; has_more: boolean }>
): Promise<T[]> => {
  const all: T[] = []
  let cursor: string | null = null

  do {
    const page = await fetchPage(cursor)
    all.push(...page.results)
    cursor = page.next_cursor
  } while (cursor !== null)

  return all
}
```

## 4. Hard limit — 10,000 results per query (Apr 20, 2026)

Desde **April 20, 2026**, data source queries enforce máximo **10,000 results paginated total** (no por request — total a través de todos los cursors).

### Cuando se hits el límite

Response incluye:
```jsonc
{
  "object": "list",
  "results": [...],
  "next_cursor": null,
  "has_more": false,
  "request_status": {
    "type": "incomplete",
    "incomplete_reason": "query_result_limit_reached"
  }
}
```

### Mitigations canonical (Notion-recommended)

1. **Filtrar más agresivo** — narrow the query (status, date range, etc.)
2. **Usar webhooks** para sync incremental en vez de re-query completo
3. **Split data source** — si un data source tiene >10k rows, considerar normalización
4. **Multi-query estratégica** — query con filtros progresivos para chunking lógico

### Implicación crítica para Greenhouse

- **Notion-BQ sync legacy** (`services/notion-bq-sync/`) podría hits este límite en Sky si Tasks DB pasa 10k rows
- **TASK-901 writeback** no afecta — escribe per page individual
- **TASK-910 demo** trivial — pocas pages

**Acción canonical**: monitor `request_status.type === 'incomplete'` en consumers de query y emit signal `notion.query.result_limit_reached` cuando aparezca.

## 5. Cursor stability (Apr 22, 2026 update)

> "Pagination cursors now embed session identifiers (eliminates overlapping session errors)"

→ **Implicación**: cursors son ahora **session-aware**. Si guardas un cursor + retomas más tarde, puede expirar. Best practice: completa la iteración en una sola "session" (un single batch de calls).

## 6. Per-property pagination — un caso especial

Para properties con muchos items (relations, people con many users), el response de page incluye solo los primeros N items + un placeholder. Para obtener todos:

```http
GET /v1/pages/{page_id}/properties/{property_id}?page_size=100&start_cursor=...
```

Esto retorna un response paginado dedicado a esa property.

**Cuándo importa**: relation properties con > 25 items (default truncate point). Para Greenhouse runtime rara vez aplica.

## 7. Anti-patterns canonical

| Anti-pattern | Por qué |
|---|---|
| `page_size: 1000` | Notion devuelve 400 — max 100 |
| Sin loop, asumir 1 sola page | Pierdes data silenciosamente |
| Parsear `next_cursor` para "saltar" pages | Cursor opaco — no es índice numérico |
| Guardar cursor cross-sessions | Puede expirar (post Apr 22, 2026) |
| Ignorar `request_status.incomplete` | Data parcial silenciosa |

## 8. Performance tip

`page_size: 100` con 1 request paginated retorna 100 results. Si necesitas todos los items de un data source de ~5,000 rows:
- 50 requests / 2.5 req/sec = 20 seconds wall time
- Considerar query con filter más narrow si solo necesitas subset

## 9. Cross-refs

- `api-reference/endpoints-canonical.md` — endpoints que paginan
- `api-reference/rate-limits.md` — throttling durante iteración
- `patterns-canonical/re-fetch-pattern.md` (stub) — cuándo re-query vs cache
- `developer-platform-2026/data-sources-vs-databases.md` — query canonical
