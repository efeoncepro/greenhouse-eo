# @notionhq/client (Node/TS) — canonical SDK

> **Minimum for async Markdown operations**: `v5.23.0`
> **Repo**: https://github.com/makenotion/notion-sdk-js
> **Source**: changelog + reference
> **Last verified**: 2026-07-18 for Markdown/async support; re-check the package registry before dependency changes

## 1. Install

```bash
pnpm add @notionhq/client
# o
npm install @notionhq/client
```

## 2. Initialize client

```typescript
import { Client } from '@notionhq/client'

const notion = new Client({
  auth: process.env.NOTION_TOKEN,        // resolved from Secret Manager en Greenhouse
  notionVersion: '2026-03-11'            // canonical recommended
})
```

⚠️ El SDK soporta `notionVersion` config — usar SIEMPRE explícito, NO confiar en SDK default (puede estar detrás de canonical).

## 3. Versions canonical en changelog reciente

| SDK version | Date | Feature key |
|---|---|---|
| v5.23.0 | 2026 | Async Markdown create/update support |
| v5.21.0 | May 11, 2026 | Meeting notes query + agent_id parent |
| v5.20.0 | Apr 20, 2026 | Pagination result limit handling |
| v5.19.0 | Apr 17, 2026 | Comment update/delete GA |
| v5.18.0 | Apr 17, 2026 | Multi-value select filters |
| v5.17.0 | Apr 7, 2026 | Markdown body in comments |
| v5.16.0 | Mar 30, 2026 | Heading 4, tab icons, "me" filter, relative dates, Views API fixes |
| v5.15.0 | Mar 25, 2026 | Tab blocks, verification property, native icons, custom emojis |
| v5.14.0 | Mar 19, 2026 | Views API, status property write |
| v5.12.0 | Mar 11, 2026 | API version 2026-03-11 support |
| v5.11.x | Feb 26, 2026 | Markdown content API + meeting notes block read |
| v5.10.0 | Feb 2026 | Auto-retry with exponential backoff |
| v5.7.0 | Jan 15, 2026 | Move page + template features |

→ **Recommendation**: use v5.23+ when the flow needs `allow_async`; pin the exact version according to the repository dependency policy.

## 4. Patterns canonical de uso

### Query data source (canonical post 2025-09-03)
```typescript
const response = await notion.dataSources.query({
  data_source_id: 'xxx',
  filter: { property: 'status', status: { equals: 'Aprobado' } },
  sorts: [{ property: 'last_edited_time', direction: 'descending' }],
  page_size: 100
})

const allResults = response.results
while (response.has_more) {
  response = await notion.dataSources.query({
    data_source_id: 'xxx',
    start_cursor: response.next_cursor
  })
  allResults.push(...response.results)
}
```

### Get single page
```typescript
const page = await notion.pages.retrieve({ page_id: 'xxx' })
```

### Async Markdown writes

When a Markdown create/update sets `allow_async`, treat HTTP 202 as acceptance only. Poll the returned async task after `poll_after_seconds` until `succeeded` or `failed`, and persist the terminal error/result because task metadata is not durable forever.

### Update page properties
```typescript
const updated = await notion.pages.update({
  page_id: 'xxx',
  properties: {
    '[GH] RpA': { number: 2 }
  }
})
```

⚠️ **NO existe `notion.pages.bulkUpdate`** — SDK refleja API. Para batched writes usar Cloud Tasks throttling pattern.

### Webhook signature verify (SDK no provee helper)
SDK NO incluye helper para HMAC verify. Hazlo manual (ver `patterns-canonical/hmac-validation.md`).

## 5. Auto-retry feature (v5.10.0+)

Desde v5.10.0, el SDK incluye **automatic retry con exponential backoff** para 429 y 5xx errors built-in. Implicación:
- Reduce código boilerplate de retry custom
- Pero NO sustituye Cloud Tasks throttling (SDK retry es per-process, no cross-instance)

Para path productivo Greenhouse con bulk operations, **mantener Cloud Tasks throttling** + dejar que SDK retry maneje transient errors per-call.

## 6. Error handling

SDK throws `APIResponseError` con shape:
```typescript
{
  code: string,      // ej. 'object_not_found', 'rate_limited'
  message: string,
  status: number,
  request_id: string
}
```

Captura canonical:
```typescript
import { APIResponseError, APIErrorCode } from '@notionhq/client'

try {
  await notion.pages.update({ ... })
} catch (err) {
  if (err instanceof APIResponseError) {
    if (err.code === APIErrorCode.RateLimited) {
      // retry con backoff (o SDK already did)
    }
    captureWithDomain(err, 'integrations.notion', {
      tags: { notion_code: err.code, notion_status: String(err.status) },
      extra: { request_id: err.request_id }
    })
  }
  throw err
}
```

## 7. TypeScript types

El SDK exporta types canonical:
- `PageObjectResponse`, `PartialPageObjectResponse`
- `DatabaseObjectResponse`, `DataSourceObjectResponse`
- `BlockObjectResponse` (con discriminated union per type)
- `UserObjectResponse`
- `RichTextItemResponse`
- Etc.

Usar para type-safe consumers:
```typescript
import type { PageObjectResponse } from '@notionhq/client'

const isFullPage = (page: PageObjectResponse | PartialPageObjectResponse): page is PageObjectResponse => {
  return 'properties' in page
}
```

## 8. Hard rules canonical

- **SIEMPRE** pin a versión específica en `package.json` (sin `^`) para SDK que toca API contracts críticos
- **SIEMPRE** especifica `notionVersion` explícito en client init
- **NUNCA** mutes errores del SDK — captura + re-throw para que outbox state machine maneje
- **NUNCA** uses el SDK desde código client-side (browser) — bundling expone token
- **PREFER** SDK over raw `fetch` cuando endpoint está cubierto (mejor typing + retry built-in)
- **PERO** raw fetch OK para endpoints recién shipped que SDK aún no soporta

## 9. Cross-refs

- `api-reference/endpoints-canonical.md` — qué endpoints están en SDK
- `api-reference/error-handling.md` — error response shapes
- `sdks-and-clients/notion-mcp-server.md` — MCP tools alternativos
- CLAUDE.md § "Cross-runtime observability" — captureWithDomain pattern
