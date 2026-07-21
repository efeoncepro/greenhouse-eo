# Notion API Changelog canonical — Jan-May 2026

> **Source canonical**: https://developers.notion.com/page/changelog
> **Last verified**: 2026-05-17
> **Mantenimiento**: bumpear cuando Notion publish nuevo release (~mensual)

## May 2026

### May 15, 2026 — Markdown page insertion positions
- `PATCH /v1/pages/{id}/markdown` adds `insert_content.position` parameter
- Allows prepending to page start or appending end without full rewrite
- **Greenhouse impact**: none (Greenhouse no escribe markdown bodies)

### May 13, 2026 — Notion 3.5 Developer Platform 🚀
**MAJOR RELEASE**
- **Notion Workers** Beta — hosted runtime, free hasta Aug 11, después credits
- **ntn CLI** GA — install `curl -fsSL https://ntn.dev | bash`
- **Database Sync** Beta (Workers-powered)
- **Custom Agent Tools** Beta (Workers attached to Custom Agents)
- **Webhook Triggers** Beta (bidirectional)
- **External Agents API** Alpha (waitlist) — Claude Code, Cursor, Codex, Decagon pre-integrated
- **Notion Agent SDK** Alpha (waitlist) — embed Notion agents en third-party tools
- Permissions expanded: any member can build connections (not just Workspace Owners)
- Workspace-scoped OAuth added
- New Developer Portal at https://www.notion.so/developers
- Connections Tab unified management

**Greenhouse impact**: HIGH — habilita TASK-879 evaluation framework, Workers vs Cloud Run decision becomes concrete

### May 12, 2026 — Developer portal + PATs GA
- **PATs (Personal Access Tokens)** lanzados — user-scoped, admin-controlled per plan
- Plan-based defaults: Free (owners only), Plus (all members), Business (owners only), Enterprise (owners + selected groups)
- Workspace admins puede view/revoke PATs
- New Developer portal unifica tool management

**Greenhouse impact**: MEDIUM — habilita PAT usage para discovery / `ntn` CLI, pero NUNCA en productivo (sigue Internal Integration Token)

### May 11, 2026 — Meeting notes query + agent_id parent
- `POST /v1/blocks/meeting_notes/query` — AI meeting notes retrieval endpoint
- Pages/blocks con agent parents serialize as `{"type": "agent_id", "agent_id": "..."}`
- SDK: `@notionhq/client` v5.21.0

**Greenhouse impact**: LOW — meeting notes no actualmente usado; agent_id parent type relevant si External Agents emerge V2+

## April 2026

### April 22, 2026 — Data source query pagination reliability
- Cursors embed session identifiers (no overlapping session errors)
- `start_cursor` acepta opaque strings + legacy UUIDs
- **Implications**: complete iteration en single session (no save cursor cross-process)

### April 20, 2026 — 10,000 result limit per query
- Hard cap 10K results paginated total per query
- Response incluye `request_status.type === 'incomplete'` cuando hit
- SDK: v5.20.0

**Greenhouse impact**: HIGH si Sky Tasks DB pasa 10K rows. Monitor signal needed.

### April 17, 2026 — Comment management + multi-value filters
- `PATCH /v1/comments/{id}` GA
- `DELETE /v1/comments/{id}` GA
- Multi-value filters en select/status (arrays para `equals/does_not_equal`)
- Multi-select supports `contains/does_not_contain` con arrays
- People filter `"me"` round-trips
- **Notion MCP improvements**: search incluye Slack DMs, fetch acepta notion.com + .so domains, page resources include `is_archived`
- SDK: v5.18.0 (filters), v5.19.0 (comments)

### April 7, 2026 — Comment markdown body
- `POST /v1/comments` acepta `markdown` parameter (alternative to `rich_text`)
- SDK: v5.17.0

### April 2, 2026 — Developer Terms updated
- Legal clarifications, Feedback provision revisions

## March 2026

### March 30, 2026 — Heading 4 + tab icons + "me" filter + relative dates
- `heading_4` block type
- Paragraph-as-tab supports `icon` field
- People filter `"me"` for `contains/does_not_contain`
- Date filters accept relative values: `"today"`, `"tomorrow"`, `"yesterday"`, `"one_week_ago"`, etc.
- Views API fixes
- SDK: v5.16.0

### March 25, 2026 — Tab blocks + writable verification + native icons
- New `type: "tab"` block type
- Wiki database `verification` property writable
- Native icons distinguished from external (`type: "icon"`)
- New `GET /v1/custom_emojis` endpoint
- SDK: v5.15.0

### March 19, 2026 — Views API + status property write 🚀
**Eight new endpoints** para programmatic view management:
- CRUD views on databases
- List views (by database or workspace by data source)
- Query view con saved filters/sorts + pagination
- Types: table, board, calendar, timeline, gallery, list, form, chart, map, dashboard
- New webhook events: `view.created`, `view.updated`, `view.deleted`
- **Status property writable** (create + update via data source endpoints)
- Notion MCP: `notion-create-view`, `notion-update-view`, status type support
- SDK: v5.14.0

### March 11, 2026 — Notion-Version 2026-03-11 (BREAKING) 🚨
**MAJOR BREAKING CHANGES**
- `after` → `position` (Append block children)
- `archived` → `in_trash` (todas endpoints, request + response)
- `transcription` block type → `meeting_notes`
- Most integrations need find-and-replace only
- New `notion-create-view` and `notion-update-view` MCP tools
- Markdown content API improvements: `update_content`, `replace_content`
- Template timezone parameter
- SDK: v5.12.0

**Greenhouse impact**: CRITICAL — audit obligatorio cuando bumpear cualquier consumer

### March 2, 2026 — Markdown retrieval para internal integrations
- `GET /v1/pages/{id}/markdown` GA para internal integrations
- SDK: v5.11.1

## February 2026

### February 26, 2026 — Markdown content API 🚀
**NEW API**
- `POST /v1/pages` acepta `markdown` parameter
- `GET /v1/pages/{id}/markdown` retrieve full page as enhanced markdown
- `PATCH /v1/pages/{id}/markdown` insert/replace con ellipsis-based selections
- AI meeting notes support
- `include_transcript` query parameter
- New `transcription` block type read
- SDK auto-retry exponential backoff (v5.10.0)
- Notion MCP: 91% token reduction en schema tools, block-level comments, Notion Sites viewing, meeting transcripts
- SDK: v5.10.0, v5.11.0

## January 2026

### January 15, 2026 — Move page + template features 🚀
- **New `Move page` API** — changes page `parent`
- New `List data source templates` endpoint
- `Create Page` acepta `template` parameter
- `Update Page` acepta `template` + `erase_content` parameters
- Page position customization (new `position` parameter cuando create)
- Notion MCP: `notion-query-data-sources` para Enterprise, `notion-get-user` removed
- SDK: v5.7.0

## Pre-Jan 2026 (relevant context)

### September 3, 2025 — Data source / database split (BREAKING) 🚨
**MAJOR ARCHITECTURE CHANGE**
- Concept split: Database (container) vs Data Source (queryable)
- `/v1/databases/{id}/query` deprecated → `/v1/data_sources/{id}/query` canonical
- New webhook events: `data_source.*`
- Parent type `data_source_id` vs legacy `database_id`

**Greenhouse impact**: notion-bq-sync legacy probablemente needs audit/migration

## Trajectory analysis

### Pattern observable
- ~Mensual ship pace post Jan 2026
- Major releases (3.5 Developer Platform) son trimestrales aprox
- Breaking changes ~ trimestrales (2025-09-03, 2026-03-11)
- Cada release viene con SDK companion version

### Expected Q3-Q4 2026
- Workers → potential GA
- External Agents API → Beta
- Bulk PATCH endpoint (likely si TASK-901 design pressure escalates community)
- Custom Agent improvements

## Cross-refs

- `developer-platform-2026/notion-version-history.md` — version breaking changes detail
- `developer-platform-2026/workers-canonical.md` — May 13 launch detail
- `developer-platform-2026/data-sources-vs-databases.md` — Sep 3 2025 split
- `sdks-and-clients/notion-client-node.md` — SDK versions per release
- `future-roadmap.md` — expected trajectory
- https://developers.notion.com/page/changelog (source canonical, verify monthly)
