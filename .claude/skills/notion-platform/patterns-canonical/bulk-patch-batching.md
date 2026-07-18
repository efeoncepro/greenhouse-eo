# Pattern canonical — Bulk PATCH batching (sin endpoint bulk oficial)

> **⚠️ HALLAZGO CRÍTICO**: `/v1/pages/bulk` mencionado en TASK-901 spec **NO EXISTE** en docs canonical Notion al 2026-05-17. Solo PATCH single-page documentado.
> **Source**: https://developers.notion.com/reference/patch-page (verified)
> **Last verified**: 2026-05-17
> **Impacto**: TASK-901 design Slice 5 necesita revisión

## 1. El problema

TASK-901 spec asume:
```
PATCH /v1/pages/bulk
Notion-Version: 2026-02-01
Body: { databaseId, pageUpdates: [{ pageId, properties }] x 100 }
```

→ Este endpoint **no existe** según docs canonical. Posibilidades:
1. Endpoint en private beta no documentado público
2. Confusión en el repo con un feature anunciado pero no shipped
3. Endpoint deprecated o renombrado

**Acción canonical**: verificar con Notion support / changelog antes de comprometer TASK-901 S5.

## 2. Alternativas canonical

Hasta confirmar/desmentir bulk endpoint, design canonical V1 usa **una de estas 3 alternativas**:

### Alternativa A — Sequential throttled (recomendada V1)

```
Cloud Tasks queue "notion-writeback"
  ↓ max_dispatches_per_second: 2.5
  ↓ max_concurrent_dispatches: 5
Per task: PATCH /v1/pages/{id}  (single page)
```

#### Pros
- Sin asumir endpoints no documentados
- Cloud Tasks maneja retry + dead-letter nativo
- Granularidad per-page (per-error isolation)
- Throughput suficiente para Greenhouse scale (10-30 writes/day Sky, backfill 3,200 = ~20 min)

#### Cons
- Más overhead vs bulk (N requests vs 1 con N items)
- Costo Cloud Tasks por invocation (trivial a esta scale)

### Alternativa B — Notion Worker para batched write

Deploy un Worker que reciba batch de updates + hace los PATCHes internamente:

```
Cloud Run ops-worker:
  ↓ Enqueue 1 sola Cloud Task con batch de 100 page updates
  ↓ HTTP target: Notion Worker URL
Worker recibe batch + hace 100 PATCHes internamente
  ↓ Honra rate limit local de Notion runtime
```

#### Pros
- 1 invocation desde Greenhouse (en lugar de 100)
- Worker corre cerca del API Notion (lower latency)
- Cost-efficient post Aug 11 2026 si Worker credits son bajos

#### Cons
- **Workers en Beta** — liability para path bonus crítico
- Sentry domain gap (Worker no se integra naturalmente con `captureWithDomain`)
- Debugging cross-runtime (Greenhouse Cloud Run + Notion Worker)
- Si Worker se cae, no retry policy clara
- Pricing post Aug 11 incierto

### Alternativa C — Parallel limited con SDK retry

```typescript
import pLimit from 'p-limit'

const limit = pLimit(3)  // max 3 concurrent — fits in 3 req/sec
const updates = [...]    // array de page updates

const results = await Promise.allSettled(
  updates.map(update => limit(() => notion.pages.update(update)))
)
```

#### Pros
- Más simple que Cloud Tasks
- SDK auto-retry built-in (v5.10.0+)

#### Cons
- Sin queue persistente — si proceso se cae mid-batch, pierdes progress
- Sin dead-letter automática
- Sin throttling cross-process (si 2 instances corren simultáneo, exceden combined)
- NO recomendado para batch grande (3,200 backfill) ni path productivo crítico

## 3. Recomendación canonical para Greenhouse

| Caso de uso | Alternativa canonical |
|---|---|
| TASK-901 webhook-driven writeback (10-30/day Sky) | **A — Sequential throttled** |
| TASK-901 S8 backfill 3,200 Sky | **A — Sequential throttled** |
| Future: hourly batch sync (~500 updates) | **A** o reconsider B post Workers GA |
| Discovery / one-shot ops (<10 writes) | **C — Parallel limited** OK |

## 4. Implementación canonical Alternativa A

### Setup Cloud Tasks queue

```bash
# services/ops-worker/deploy.sh
gcloud tasks queues create notion-writeback \
  --location=us-east4 \
  --project=efeonce-group \
  --max-dispatches-per-second=2.5 \
  --max-concurrent-dispatches=5 \
  --max-attempts=5 \
  --max-retry-duration=24h \
  --min-backoff=2s \
  --max-backoff=300s
```

### Enqueue desde Reactive Consumer

```typescript
import { CloudTasksClient } from '@google-cloud/tasks'

const tasksClient = new CloudTasksClient()

const enqueueNotionPatchTask = async (pageId: string, properties: Record<string, unknown>) => {
  const queuePath = tasksClient.queuePath('efeonce-group', 'us-east4', 'notion-writeback')

  await tasksClient.createTask({
    parent: queuePath,
    task: {
      httpRequest: {
        url: `${process.env.OPS_WORKER_URL}/notion-metrics/single-writeback`,
        httpMethod: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: Buffer.from(JSON.stringify({ pageId, properties })).toString('base64'),
        oidcToken: {
          serviceAccountEmail: 'greenhouse-ops-worker@efeonce-group.iam.gserviceaccount.com',
          audience: process.env.OPS_WORKER_URL
        }
      }
    }
  })
}
```

### Endpoint en ops-worker

```typescript
// services/ops-worker/server.ts
app.post('/notion-metrics/single-writeback', wrapCronHandler({
  name: 'notion_single_writeback',
  domain: 'integrations.notion',
  run: async ({ body }) => {
    const { pageId, properties } = body
    const token = await resolveSecret(process.env.NOTION_METRICS_TOKEN_SECRET_REF!)

    const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2026-03-11',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ properties })
    })

    if (!response.ok) {
      const errBody = await response.text()
      // Throw triggers Cloud Tasks retry (up to 5)
      throw new Error(`notion_patch_failed_${response.status}: ${errBody.slice(0, 200)}`)
    }

    // Persist success in audit log
    await persistWritebackLog({
      pageId,
      writebackStatus: 'ok',
      computedValues: properties,
      writtenAt: new Date()
    })

    return { ok: true }
  }
}))
```

## 5. Hard rules canonical

- **NUNCA** asumas `/v1/pages/bulk` existe — usa alternativas hasta confirmación
- **NUNCA** uses Alternativa C (Promise.allSettled) en path productivo bonus
- **SIEMPRE** Cloud Tasks queue con throttling explícito para batch operations
- **NUNCA** exceedas 2.5 req/sec sustained (3 req/sec hard cap = 0.5 req/sec safety margin)
- **SIEMPRE** dead-letter queue separada
- **SIEMPRE** audit log per writeback attempt (success o failure)
- **NUNCA** invocar PATCH dentro de webhook handler síncrono — siempre via outbox + Cloud Tasks defer

## 6. Cuándo revisitar bulk endpoint

Si emerge oficialmente `/v1/pages/bulk` o equivalente:
1. Update este archivo con Delta + new section
2. Update `api-reference/endpoints-canonical.md`
3. Update TASK-901 S5 design con migration plan
4. Update este "Recomendación canonical" §3 si bulk es superior

## 7. Cross-refs

- `api-reference/endpoints-canonical.md` — endpoints disponibles
- `api-reference/rate-limits.md` — 3 req/sec hard cap
- `decision-frameworks/bulk-vs-individual-patch.md` (stub) — matriz explícita
- `decision-frameworks/workers-vs-cloud-run.md` — Alternativa B trade-offs
- TASK-901 S5 — Cloud Tasks setup canonical
- CLAUDE.md § "Cloud Run ops-worker (crons reactivos + materialización)"
