# Template canonical — Data Source query with pagination

> **Endpoint canonical**: `POST /v1/data_sources/{data_source_id}/query` (post 2025-09-03)
> **Last verified**: 2026-05-17

## 1. Helper canonical con full pagination

```typescript
// src/lib/notion-client/query-data-source.ts (TBD)
import 'server-only'
import { Client, type QueryDataSourceResponse } from '@notionhq/client'
import { captureWithDomain } from '@/lib/observability/capture'

export type DataSourceQueryOptions = {
  dataSourceId: string
  filter?: Record<string, unknown>
  sorts?: Array<Record<string, unknown>>
  pageSize?: number  // default 100 (max)
}

export type QueryResult<T> = {
  results: T[]
  totalFetched: number
  hitResultLimit: boolean   // true si Notion enforced 10K cap
  pagesIterated: number
}

export const queryDataSourceAll = async <T = QueryDataSourceResponse['results'][number]>(
  client: Client,
  options: DataSourceQueryOptions
): Promise<QueryResult<T>> => {
  const allResults: T[] = []
  let cursor: string | undefined = undefined
  let pagesIterated = 0
  let hitResultLimit = false

  do {
    pagesIterated++

    try {
      const response = await client.dataSources.query({
        data_source_id: options.dataSourceId,
        filter: options.filter,
        sorts: options.sorts,
        page_size: options.pageSize ?? 100,
        start_cursor: cursor
      })

      allResults.push(...(response.results as T[]))

      // Detect 10K result limit (Apr 20, 2026)
      if ('request_status' in response && (response as { request_status?: { type?: string } }).request_status?.type === 'incomplete') {
        hitResultLimit = true
        captureWithDomain(
          new Error('notion_query_result_limit_reached'),
          'integrations.notion',
          {
            tags: { source: 'data_source_query_limit', stage: 'pagination_truncated' },
            extra: { dataSourceId: options.dataSourceId, pagesIterated, totalFetched: allResults.length }
          }
        )
        break
      }

      cursor = response.has_more ? response.next_cursor ?? undefined : undefined
    } catch (err) {
      captureWithDomain(err, 'integrations.notion', {
        tags: { source: 'data_source_query', stage: `page_${pagesIterated}` },
        extra: { dataSourceId: options.dataSourceId, cursor }
      })
      throw err
    }
  } while (cursor !== undefined)

  return {
    results: allResults,
    totalFetched: allResults.length,
    hitResultLimit,
    pagesIterated
  }
}
```

## 2. Uso canonical

### Query simple
```typescript
const result = await queryDataSourceAll(notion, {
  dataSourceId: '5126d7d8-...'  // Efeonce Tasks
})

console.log(`Fetched ${result.totalFetched} pages in ${result.pagesIterated} requests`)
if (result.hitResultLimit) {
  console.warn('Hit 10K result limit — consider filter')
}
```

### Query con filter + sort
```typescript
const result = await queryDataSourceAll(notion, {
  dataSourceId: '5126d7d8-...',
  filter: {
    and: [
      { property: 'Status', status: { equals: 'Aprobado' } },
      { property: 'completed_at', date: { on_or_after: '2026-05-01' } }
    ]
  },
  sorts: [{ property: 'last_edited_time', direction: 'descending' }]
})
```

### Query con relative date (Mar 30, 2026)
```typescript
const result = await queryDataSourceAll(notion, {
  dataSourceId: '...',
  filter: {
    property: 'due_date',
    date: { on_or_after: 'one_month_ago' }
  }
})
```

### Query con multi-value select (Apr 17, 2026)
```typescript
const result = await queryDataSourceAll(notion, {
  dataSourceId: '...',
  filter: {
    property: 'Priority',
    select: { equals: ['High', 'Critical'] }   // ← array, OR semantics
  }
})
```

## 3. Pattern típico Greenhouse

### TASK-901 Discovery (Slice 1)

```typescript
// Investigar shape de Efeonce Tasks DS
const result = await queryDataSourceAll(notion, {
  dataSourceId: '5126d7d8-bf3f-454c-80f4-be31d1ca38d4',
  pageSize: 5  // small sample para inspect
})

console.log('Sample page properties:', Object.keys(result.results[0].properties))
// → ['Status', 'completed_at', 'due_date', 'Correcciones', ...]
```

### TASK-901 Backfill histórico Sky (Slice 8)

```typescript
const result = await queryDataSourceAll(notion, {
  dataSourceId: '23039c2f-efe7-81f8-af2d-000b67594d18',  // Sky Tasks
  filter: {
    and: [
      {
        property: 'Status',
        status: { equals: ['Aprobado', 'Done', 'Finalizado', 'Completado'] }
      },
      {
        property: 'completed_at',
        date: { on_or_after: '2025-08-01' }
      }
    ]
  }
})

// Per page → enqueue Cloud Task → bulk writeback
for (const page of result.results) {
  await enqueueRpaWritebackTask(page.id)
}
```

### Nightly reconciliation (TASK-901 S7)

```typescript
const lastCheckpoint = await getLastReconcileCheckpoint()  // ISO string

const result = await queryDataSourceAll(notion, {
  dataSourceId: SKY_TASKS_DATA_SOURCE_ID,
  filter: {
    and: [
      { timestamp: 'last_edited_time', last_edited_time: { on_or_after: lastCheckpoint } },
      // Implicit filter: last_edited_by != OUR_INTEGRATION (post-query filter)
    ]
  }
})

const recentlyEditedByOthers = result.results.filter(p => p.last_edited_by.id !== OUR_INTEGRATION_USER_ID)

for (const page of recentlyEditedByOthers) {
  const recomputed = await calculateRpa({ taskSourceId: page.id })
  const stored = extractStoredRpa(page)
  if (recomputed.value !== stored) {
    await enqueueRpaWritebackTask(page.id)
  }
}
```

## 4. Anti-patterns

| Anti-pattern | Por qué |
|---|---|
| Query sin `pageSize` explícito | Default 10 → muchos extra requests |
| `pageSize: 1000` | 400 — max 100 |
| Loop sin verificar `has_more` | Pierdes pages silently |
| Sin handle `request_status.incomplete` | Data parcial silenciosa post Apr 20, 2026 |
| Sin `captureWithDomain` en error | Sentry rollup falla |
| `database.query` legacy endpoint | Deprecated desde 2025-09-03 |
| Asume cursor parseable / numérico | Cursor opaco |

## 5. Performance considerations

| Total rows DS | Pages iteradas | Wall time aprox |
|---|---|---|
| < 100 | 1 | < 1s |
| 1,000 | 10 | ~4-8s (rate-limited) |
| 5,000 | 50 | ~20-40s |
| 10,000 | 100 | hits result limit cap |
| > 10,000 | 100+ | needs filter o split DS |

→ Para queries grandes, prefer **filter agresivo** + **incremental sync via webhook** (TASK-901 pattern).

## 6. Cross-refs

- `api-reference/endpoints-canonical.md` — `/v1/data_sources/{id}/query`
- `api-reference/pagination.md` — cursor pattern + 10K limit
- `api-reference/rate-limits.md` — 3 req/sec sustained
- `developer-platform-2026/data-sources-vs-databases.md` — migration legacy
- `sdks-and-clients/notion-client-node.md` — SDK usage
