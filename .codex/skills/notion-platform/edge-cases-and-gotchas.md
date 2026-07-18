# Edge cases & gotchas canonical — Notion API en producción

> **30+ casos aprendidos** de pelear con Notion API en producción Greenhouse + community
> **Last verified**: 2026-07-18

## 1. Webhooks

### EC-01: Webhook bootstrap POST sin signature
Cuando creas subscription, Notion envía POST inicial con `verification_token` en body **SIN** `X-Notion-Signature` válido. Handler debe:
- Detectar bootstrap shape (`{ verification_token: "..." }` y sin signature)
- Responder 200 sin HMAC verify
- Persistir token a tabla admin para que operador lo copie

### EC-02: Aggregated events delay variable
`page.properties_updated` típicamente delivered en < 1 min, pero pueden tomar **hasta 5 min** (worst case). Diseña UI con disclaimer "actualizado en ~2 min" en lugar de "instant".

### EC-03: Múltiples authors en aggregated event
Cuando varios edits ocurren rápidamente (human + bot, o multiple humans), `authors[]` puede tener length > 1. Echo-loop filter conservativo: `every(isOurBot)` no `some(isOurBot)`.

### EC-04: Webhook URL change requiere recreate
> "You can only change the webhook URL **before verification**."

Si dominio o path cambia post-verification → delete + recreate subscription + re-confirm token + rotate secret en GCP.

### EC-05: 8 retry attempts → 24h dead-letter
At-most-once con 8 attempts, exponential backoff hasta 24h. Si tu endpoint está caído > 24h, **eventos se pierden permanentemente**. Nightly safety net job es obligatorio para path crítico.

### EC-06: `event.data.updated_properties` shape varies
Per version puede ser:
- Array de property names (`['Status', 'Notes']`)
- Array de property IDs (`['abc123', 'xyz789']`)
- Mix

Discovery durante TASK-901 Slice 1 obligatorio. Allowlist matching debe handle ambos.

## 2. API + Endpoints

### EC-07: `properties` retorna paginated para muchas relations
Page con > 25 related items en una `relation` property no retorna todos los items en `GET /v1/pages/{id}`. Debes hacer per-property pagination via `/v1/pages/{id}/properties/{property_id}`.

### EC-08: Empty string NOT allowed — use `null`
> "The API does not support empty strings — use `null` instead."

Setting `properties: { 'Name': { rich_text: [{ text: { content: '' } }] } }` puede dar 400. Para limpiar, send `null`:
```json
{ "Name": { "rich_text": null } }
```

### EC-09: 10,000 result limit per query (Apr 20, 2026)
Data source query hits cap silently con `request_status.type === 'incomplete'`. Monitor + signal.

### EC-10: Cursor session-aware (post Apr 22, 2026)
Cursors embed session identifiers. Si guardas cursor cross-process boundary o > N minutes, puede expirar. Complete iteration en single session.

### EC-11: Page `parent` no es updateable via PATCH
PATCH no acepta `parent` field. Para mover page, use `POST /v1/pages/{id}/move` (Jan 15, 2026 nuevo endpoint).

### EC-12: Formula property "set" silently ignored
Si envías `properties: { 'My Formula': { number: 5 } }` en PATCH:
- Notion NO da 400
- Notion NO actualiza la formula (it's read-only)
- Resultado: think it worked, didn't

Verifica que tu writeback target es property `number` / `rich_text` / etc., NUNCA `formula`.

### EC-13: Rich text content limit 2,000 chars per item
Cada `rich_text` item tiene 2,000 char limit. Para text largo, split en múltiples items:
```json
"rich_text": [
  { "text": { "content": "first 2000 chars..." } },
  { "text": { "content": "next 2000 chars..." } }
]
```

### EC-14: URL property limit 2,000 chars
Same limit, single string.

### EC-15: `relation` property max 100 items per PATCH
Si necesitas relate page a > 100 targets, multiple PATCHes secuenciales.

## 3. Schema / Properties

### EC-16: Status property write requires API v2025-09-03+
Status property writable solo desde Mar 19, 2026 (con SDK v5.14.0+). Pre-version retorna 400.

### EC-17: Native icons vs external (post Mar 25, 2026)
Notion ahora distingue `type: "icon"` (native) vs `type: "external"` (URL). Si parseas icons, handle ambos.

### EC-18: Multi-select `contains` filter array (Apr 17, 2026)
Antes: `{ multi_select: { contains: "tag" } }` → single value
Post: `{ multi_select: { contains: ["tag1", "tag2"] } }` → array (OR semantics)
Mismo applies para `does_not_contain`, `equals`, `does_not_equal` en select/status.

### EC-19: Person filter `"me"` works diferente per integration type
- Public integrations: `"me"` resuelve al user OAuth autorizando
- Internal integrations: `"me"` retorna empty (contains) or all (does_not_contain)

Sin warning explícito — silent semantic gap.

### EC-20: Custom emoji icons require list endpoint (Mar 25)
Para conocer emojis disponibles en workspace, `GET /v1/custom_emojis` paginado. Antes no había forma de enumerarlos.

## 4. Auth + Permissions

### EC-21: 404 vs 403 — Notion no revela existence
Si tu integration no tiene acceso a page X:
- Notion responde **404** (no 403)
- No puedes distinguir "page doesn't exist" vs "no access"

Implica: para Discovery, asume worst case + verify share status manual.

### EC-22: Archived page → 404
Page con `in_trash: true` retorna 404 en lookup. Para retrieve, query con `filter: { in_trash: { equals: true } }` o use `GET` directo (puede o no work depending on version).

### EC-23: Integration share inheritance
Sharing una page con integration NO comparte sub-pages automáticamente. Cada page debe ser shared explícitamente (o usar "Share to all" en database level).

## 5. SDK + Client

### EC-24: SDK `notionVersion` config separado
SDK `Client({ notionVersion: '...' })` controla el header. SDK puede default a una version más vieja que tu canonical — siempre especifica explícito.

### EC-25: SDK auto-retry shadow rate-limit awareness
Desde v5.10.0+, SDK retry built-in. Si tu queue throttling también retry, doble-retry sumando latency. Configurar uno o el otro, no ambos.

### EC-26: `APIResponseError.code` enum tipo-safe
SDK exports `APIErrorCode` enum. Usar para comparison type-safe:
```typescript
import { APIErrorCode } from '@notionhq/client'
if (err.code === APIErrorCode.RateLimited) { ... }
```

## 6. Workers + Developer Platform

### EC-27: ntn workers.json contains state local
NO committear `workers.json` si contiene IDs/secrets. Suele estar gitignored por default.

### EC-28: Workers Beta pricing change Aug 11, 2026
Free durante Beta. Después credits system. Estimate cost pre-commit + decide si Cloud Run sigue siendo mejor económicamente.

### EC-29: External Agents alpha = waitlist
Si task evalúa External Agents, primer step es signup waitlist. Sin access → no design comprometible.

### EC-30: ntn CLI install via `curl | bash`
Sin pin de versión + checksum. Para productivo, considerar pin específico o GitHub releases con checksums.

## 7. Operational

### EC-31: Notion workspace `Settings` Connections list integraciones
Para auditar qué integrations tienen acceso a workspace, Settings → Connections → Connected. Cada integration tiene capabilities list visible.

### EC-32: Audit log Enterprise-only
Audit log granular (quién hizo qué cuándo) solo en Plan Enterprise. Para non-Enterprise, fallback es webhook events log + reliability signals Greenhouse-side.

### EC-33: Workspace member edits propagate slow
Cuando user nuevo se agrega a workspace, su permission a integrations puede tardar minutos en propagarse. Si nuevo bot lookup retorna empty inicialmente, retry después de 5 min.

## 8. Enhanced Markdown + work management

### EC-34: Children require tabs, not spaces
Spaces can look correct in source while producing flat blocks. Render one real tab per nesting level and lint the output.

### EC-35: Markdown reads can be incomplete
`truncated=true` or non-empty `unknown_block_ids` means the returned body is not a complete source for overwrite. Fetch missing subtrees or use the Block API.

### EC-36: Markdown create modes are mutually exclusive
Do not send `markdown` together with `children` or `content`. Pick one representation for each request.

### EC-37: Async acceptance is not completion
Create/update with `allow_async` may return `202`. Poll the async task after `poll_after_seconds` until terminal state and surface failures.

### EC-38: Ordinary headings cannot own children
Only headings marked `{toggle="true"}` can contain indented blocks. Use `<details>` for a generic toggle.

### EC-39: Relation values can hide branches
A self-relation with more than 25 children may be truncated in `GET page`. Use the paginated page-property endpoint before computing recursive progress.

### EC-40: Notion has no create-subtask endpoint
A subtask is a page in the same Tasks data source whose self-relation points to a parent. The UI view configuration is not the domain model.

### EC-41: Unlimited domain depth still needs operational bounds
The domain does not impose a depth cap, but traversals must remain iterative, detect cycles and enforce node/request/time budgets.

### EC-42: `last_edited_time` is not progress history
It can change for body edits or unrelated properties. Re-fetch governed fields and compare against an append-only observation ledger.

## 9. Cross-refs

- `anti-patterns-catalog.md` — patterns prohibidos
- `api-reference/*` — endpoints affected by these edges
- `developer-platform-2026/*` — capabilities relevantes
- `patterns-canonical/*` — workarounds canonical

Cualquier edge case nuevo encontrado en producción debe ser agregado aquí con número EC-XX consecutivo + descripción + workaround.
