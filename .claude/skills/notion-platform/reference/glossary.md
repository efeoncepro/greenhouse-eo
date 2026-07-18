# Glossary canonical — Notion + Developer Platform terminology

> **40+ términos canonical** para terminology disambiguation
> **Last verified**: 2026-05-17

## Notion concepts

**Workspace** — Top-level container; org-level. Tu integration está scoped a un workspace específico.

**Teamspace** — Sub-container dentro de workspace, grouping para teams. Operativo, no necesario para API access.

**Page** — Entidad fundamental Notion. Puede ser standalone, sub-page de otra, o row de una data source.

**Database** — Container conceptual + UI wrapper. Pre 2025-09-03 era la entidad queryable; post, es wrapper de data sources.

**Data Source** — Canonical entity queryable desde API (post 2025-09-03). Contiene rows (pages) con shared schema. Una database puede tener 1+ data sources.

**Block** — Unidad de contenido dentro de una page (paragraph, heading, list_item, code, table, etc.). Cada block tiene `type` discriminator.

**Property** — Field en una page que pertenece a data source. Tiene `type` + value shape específico (title, number, select, formula, rollup, etc.).

**Formula property** — Property type computed by Notion engine. **Read-only via API** — no se puede SET via PATCH.

**Rollup property** — Aggregated de related pages. Read-only via API.

**Linked database** — UI view de un data source compartido. Cambios en data source propagan.

**Comment** — Annotation sobre page o block. API soporta CRUD desde Apr 17, 2026.

**View** — Saved query/display configuration on data source (table, board, calendar, etc.). API soporta CRUD desde Mar 19, 2026.

## Auth + Integrations

**Integration** — Aplicación que usa Notion API. Tipos: Internal (single-workspace bot), Public (multi-workspace OAuth), PAT (user-scoped personal token).

**Internal Integration** — Bot identity, single-workspace, owned by workspace owner. Token stable, audit-friendly. Default canonical Greenhouse para path productivo.

**Public Integration** — OAuth-based, multi-workspace. Users instalan en sus workspaces. Default canonical para SaaS apps.

**PAT (Personal Access Token)** — User-scoped token, lanzado May 12 2026. Cargas tu identidad personal en cada API call. Ideal para CLI / scripts. NO para path productivo automatizado.

**Connection** — Synonym de Integration en marketing terminology Notion post Developer Platform launch.

**Integration capabilities** — Granular permissions: Read content, Update content, Insert content, Comments R/W, Read user emails, etc.

**Bot user** — User type representando una integration. Aparece en `event.authors[*].type === 'bot'` para echo-loop detection.

**Agent user** — User type representando Custom Agent o External Agent. `event.authors[*].type === 'agent'`. NEW desde May 2026.

## Webhooks

**Webhook subscription** — Configuration en integration que dispara HTTP POST a tu endpoint cuando events ocurren.

**Verification token** — Secret single-use entregado durante subscription creation. Usado para HMAC sign + validate.

**X-Notion-Signature** — Header HMAC-SHA256(body, verification_token), formato `sha256=<hex>`.

**Aggregated event** — Webhook event tipo (`page.properties_updated`, `page.content_updated`, etc.) que Notion batches durante short window para reducir noise. Delay típico < 1 min, max 5 min.

**Non-aggregated event** — Webhook tipo (`page.locked`, `comment.created`) delivered instant.

**At-most-once delivery** — Guarantee model Notion webhooks: cada event puede llegar 0 ó 1 veces. Combinar con safety net polling para path crítico.

**Authors** — Array en payload identificando user(s) que triggered el event. Usado para echo-loop detection.

**Echo loop** — Anti-pattern donde tu integration escribe a Notion → webhook dispara notificándote de tu propio write → recomputas → re-escribes → infinite loop.

**Echo-loop filter** — Defense canonical: drop events donde `authors.every(a => a.id === OUR_INTEGRATION_ID)`.

**Inbox dedup** — Defense canonical: UNIQUE constraint sobre `event_id` evita procesar event duplicado.

## Developer Platform 2026

**Notion Workers** — Hosted runtime para custom code dentro Notion infra. Beta desde May 13 2026. Free hasta Aug 11 2026, después credits.

**Worker** — Una unit de código deployada via `ntn workers deploy`. Triggered por: webhook, schedule, o agent tool invocation.

**ntn** — CLI oficial Notion ("Notion in your terminal"). Install: `curl -fsSL https://ntn.dev | bash`. GA en todos los planes.

**workers.json** — Local state file generado por `ntn workers init`. NO committear (contiene IDs / secrets).

**Database Sync** — Capability Workers-powered para sync bidirectional Notion ↔ external systems. Beta.

**Custom Agent Tool** — Worker que actúa como callable tool dentro de Custom Agent. Beta.

**Custom Agent** — AI agent buildable por user/team en Notion UI. Lanzado Feb 2026. >1M agents created según Notion.

**External Agent** — Agent externo (Claude Code, Cursor, Codex, Decagon, custom) que se conecta a Notion como first-class participant. API en Alpha waitlist.

**Notion Agent SDK** — SDK Alpha (waitlist) para embed Notion agents en third-party tools (CRM, Teams, Discord).

**MCP (Model Context Protocol)** — Standard para tool calling cross-system. Notion provee MCP server `mcp__claude_ai_Notion__*` consumible por agentes.

## API versioning

**Notion-Version** — Required header per request. Date-based versioning. Current canonical recommended: `2026-03-11`.

**2026-03-11** — Latest version (May 2026). BREAKING vs 2025-09-03: `after`→`position`, `archived`→`in_trash`, `transcription`→`meeting_notes`.

**2025-09-03** — Version que introdujo data source / database split + canonical `/v1/data_sources/.../query` endpoint.

**2022-06-28** — Baseline antiguo. Cualquier code corriendo esto necesita audit + bump.

## Greenhouse-specific

**`[GH] <metric>` property** — Convention canonical: properties Notion managed by Greenhouse (read-only para operador). Ej: `[GH] RpA`, `[GH] OTD%`.

**INPUT_PROPS_ALLOWLIST** — Constant canonical en `src/lib/notion-metrics/config.ts` listando properties que disparan recompute (Status, Estado, completed_at, etc.).

**`calculateRpa(taskId)`** — Canonical helper TASK-901 V1.0. Delega a `countCorrectionTransitions` (TASK-908) — NO lee Notion `Correcciones` rollup.

**`countCorrectionTransitions(taskId)`** — Canonical helper TASK-908 Slice 3.5. Cuenta transitions `Listo para revisión → En Feedback` desde `task_status_transitions` table.

**Tenant** — Greenhouse multi-tenant: Efeonce (productivo), Sky (productivo), Demo (TASK-910 sandbox).

**Demo teamspace** — `Greenhouse Migration Demo` (`36339c2f-...0042863dbb5a`). Gate canonical pre-Fase 1 RpA pilot.

**Writeback** — Process Greenhouse → Notion: compute métrica + PATCH `[GH] <metric>` property. Canonical flow TASK-901.

**Shadow mode** — Phase pre-flip writeback: compute en Greenhouse + persist log + compare vs Notion formula legacy, **WITHOUT** PATCH a Notion. Validation period mínimo 7 días.

**Cutover flip** — Moment de activar feature flag `NOTION_RPA_WRITEBACK_ENABLED=true`. Post-cutover writeback to Notion comienza.

**Backfill histórico** — Operation one-shot que computa + writeback métrica para tareas pre-deployment (TASK-901 S8 para 3,200 tareas Sky desde Aug 2025).

**Nightly safety net** — Cloud Run Job @ 4 AM Santiago que reconcilia drift webhook-missed events.

## Reliability + Observability

**Reliability signal** — Telemetría Greenhouse canonical: `<domain>.<subsystem>.<metric>` con severity (ok/warning/error/unknown). Wire-up en `getReliabilityOverview`.

**Subsystem rollup** — Aggregation de signals → status compuesto subsystem. Subsystem nuevo TASK-901: `Integrations · Notion · Metrics`.

**captureWithDomain** — Helper canonical `captureWithDomain(err, 'integrations.notion', { tags, extra })`. NUNCA `Sentry.captureException` directo en code paths Notion.

**Dead letter** — Cloud Tasks dispatch que agotó retries → manda a queue separada para humano review.

**Writeback log** — Tabla append-only `greenhouse_sync.notion_metrics_writeback_log` con audit + hash dedupe.

**Webhook inbox** — Tabla append-only `greenhouse_sync.notion_webhook_inbox` con dedup + outcome trace.
