# Notion API — Endpoints canonical (v2026-03-11)

> **Source**: https://developers.notion.com/reference + changelog Jan-May 2026
> **Last verified**: 2026-05-17
> **Base URL**: `https://api.notion.com` (HTTPS mandatory)

## 1. Headers obligatorios

Todo request:

```http
Authorization: Bearer <token>
Notion-Version: 2026-03-11
Content-Type: application/json
```

## 2. Inventario completo de endpoints

### Users
| Method | Path | Notas |
|---|---|---|
| GET | `/v1/users/me` | Self introspection (bot identity, workspace) |
| GET | `/v1/users` | List users (pagination) |
| GET | `/v1/users/{user_id}` | Get user by ID |

### Search
| Method | Path | Notas |
|---|---|---|
| POST | `/v1/search` | Global search pages + databases (limited scope per integration permissions) |

### Pages
| Method | Path | Notas |
|---|---|---|
| POST | `/v1/pages` | Create page (parent: data_source, page, o block). Acepta `markdown` desde Feb 26, 2026 |
| GET | `/v1/pages/{page_id}` | Get page metadata + properties (NO body blocks) |
| PATCH | `/v1/pages/{page_id}` | Update properties, icon, cover, in_trash, is_locked, template |
| POST | `/v1/pages/{page_id}/move` | **NEW** Jan 15, 2026 — change parent |
| GET | `/v1/pages/{page_id}/markdown` | **NEW** Feb 26, 2026 — retrieve as enhanced markdown |
| PATCH | `/v1/pages/{page_id}/markdown` | **NEW** Feb 26, 2026 — insert/replace content. Supports `insert_content.position` desde May 15, 2026 |

### Page properties (paginated per-property)
| Method | Path | Notas |
|---|---|---|
| GET | `/v1/pages/{page_id}/properties/{property_id}` | Single property, for rollups/relations with many items |

### Databases (legacy wrapper)
| Method | Path | Notas |
|---|---|---|
| POST | `/v1/databases` | Create database |
| GET | `/v1/databases/{database_id}` | Get database |
| PATCH | `/v1/databases/{database_id}` | Update database |
| POST | `/v1/databases/{database_id}/query` | **DEPRECATED** — use `/v1/data_sources/.../query` |

### Data Sources (canonical desde 2025-09-03)
| Method | Path | Notas |
|---|---|---|
| POST | `/v1/data_sources` | Create data source (con `parent: { type: "database_id" }`) |
| GET | `/v1/data_sources/{data_source_id}` | Get data source schema |
| PATCH | `/v1/data_sources/{data_source_id}` | Update schema (add/remove/rename properties) |
| POST | `/v1/data_sources/{data_source_id}/query` | **CANONICAL** query endpoint |

### Blocks
| Method | Path | Notas |
|---|---|---|
| GET | `/v1/blocks/{block_id}` | Get single block |
| GET | `/v1/blocks/{block_id}/children` | Get children (paginated, max 100) |
| PATCH | `/v1/blocks/{block_id}` | Update block content |
| DELETE | `/v1/blocks/{block_id}` | Soft-delete (sets `in_trash: true`) |
| PATCH | `/v1/blocks/{block_id}/children` | Append children (con `position` desde 2026-03-11, antes `after`) |
| POST | `/v1/blocks/meeting_notes/query` | **NEW** May 11, 2026 — AI meeting notes retrieval |

### Comments
| Method | Path | Notas |
|---|---|---|
| GET | `/v1/comments` | List comments on a block/page |
| POST | `/v1/comments` | Create comment (acepta `rich_text` o `markdown` desde Apr 7, 2026) |
| PATCH | `/v1/comments/{comment_id}` | **GA** Apr 17, 2026 — update own comments |
| DELETE | `/v1/comments/{comment_id}` | **GA** Apr 17, 2026 — delete own comments |

### Views (Views API — Mar 19, 2026)
| Method | Path | Notas |
|---|---|---|
| POST | `/v1/views` | Create view (table, board, calendar, timeline, gallery, list, form, chart, map, dashboard) |
| GET | `/v1/views/{view_id}` | Retrieve view config |
| PATCH | `/v1/views/{view_id}` | Update view |
| DELETE | `/v1/views/{view_id}` | Delete view |
| GET | `/v1/views` | List views (con filter por database o workspace) |
| POST | `/v1/views/{view_id}/query` | **Query view** con filtros/sorts guardados + pagination |

### Templates (Jan 15, 2026)
| Method | Path | Notas |
|---|---|---|
| GET | `/v1/data_sources/{data_source_id}/templates` | List templates de un data source |

### Custom Emojis (Mar 25, 2026)
| Method | Path | Notas |
|---|---|---|
| GET | `/v1/custom_emojis` | List workspace custom emojis (paginated) |

### File Uploads
| Method | Path | Notas |
|---|---|---|
| POST | `/v1/file_uploads` | Upload file for use as property value or cover |

## 3. CRÍTICO — Bulk PATCH `/v1/pages/bulk` NO EXISTE

**TASK-901 spec menciona `PATCH /v1/pages/bulk` con `Notion-Version: 2026-02-01` y `100 pages/request`. NO está en docs canonical al 2026-05-17.**

Investigado:
- Cambio Mar 11, 2026 a `Notion-Version: 2026-03-11` (no 2026-02-01)
- `/v1/pages/{page_id}` solo soporta PATCH single-page
- Sin endpoint bulk documentado

**Alternativas canonical para batched writeback** (ver `patterns-canonical/bulk-patch-batching.md`):
1. **Sequential throttled** — Cloud Tasks queue @ 2.5 req/sec
2. **Notion Worker** — deploy Worker que hace N PATCHes internamente (puede ser más cost-efficient post Aug 11 2026)
3. **Parallel limited** — Promise.all con concurrency limit + 429 retry

**Acción canonical para TASK-901**: re-verificar con Notion docs/support si bulk endpoint emerge. Si no, design canonical V1.0 usa sequential throttled.

## 4. Status codes canonical

| Code | Significado | Retryable? |
|---|---|---|
| 200 | OK | — |
| 400 | Bad request (validation, missing Notion-Version) | NO |
| 401 | Unauthorized (token inválido o revoked) | NO |
| 403 | Forbidden (integration sin capability o no shared a page) | NO |
| 404 | Not found (page archived/in_trash o sin acceso) | NO |
| 409 | Conflict (concurrent modification) | SÍ con backoff |
| 429 | Rate limited | SÍ con `Retry-After` |
| 500, 502, 503, 504 | Notion server error | SÍ con backoff |

## 5. Bumped Notion-Version contract

Cuando bumpeas `Notion-Version`:
1. **Lee** `developer-platform-2026/notion-version-history.md` para breaking changes
2. **Run tests** anti-regresión específicos para el bump
3. **Bumpea** en wrapper canonical único — NO en cada call site
4. **Smoke test** contra Notion antes de deploy productivo

## 6. Endpoints más usados en Greenhouse runtime

| Caso de uso | Endpoint canonical |
|---|---|
| Sync conformed (read tasks Sky/Efeonce) | `POST /v1/data_sources/{id}/query` |
| Read single task post-webhook | `GET /v1/pages/{id}` |
| Read user identity (bot self-check) | `GET /v1/users/me` |
| Writeback `[GH] RpA` (TASK-901) | `PATCH /v1/pages/{id}` (no bulk disponible) |
| Discovery teamspace clones (TASK-910) | `POST /v1/search` + `GET /v1/data_sources/{id}` |
| Create row (futuro) | `POST /v1/pages` con `parent: { data_source_id }` |

## 7. Cross-refs

- `api-reference/data-model.md` — object shapes
- `api-reference/webhooks-canonical.md` — event types correspondientes a estos endpoints
- `api-reference/rate-limits.md` — políticas de rate limit
- `api-reference/pagination.md` — handling paginated responses
- `developer-platform-2026/data-sources-vs-databases.md` — migration detail
- `patterns-canonical/bulk-patch-batching.md` — alternativas a bulk endpoint
