# Decision framework — Workers vs Cloud Run para compute Notion-resident

> **Trade-off central**: ¿Dónde ejecutar lógica que toca Notion API? Workers (Notion runtime, Beta) o Cloud Run (Greenhouse stack, GA)
> **Last verified**: 2026-05-17

## 1. Score matrix canonical (al 2026-05-17)

| Eje | Workers (Beta) | Cloud Run | Ganador |
|---|---|---|---|
| **Production readiness** | Beta (free hasta Aug 11 2026) | GA con SLA | Cloud Run |
| **Time to ship** | Minutes (template + ntn deploy) | Days (setup + Cloud Run + Dockerfile + WIF) | Workers |
| **Cost per request** | ~$0.0001-0.001 (post Aug 11) | ~$0.0005 + base $0/mes (always-on minimal) | Workers tie / Cloud Run wins steady-state |
| **Cost steady-state** | $1-10/mes per sync típico | $5-30/mes per Cloud Run service típico | Workers |
| **Cost peak load** | Credits-based (linear) | CPU/RAM scaling cost | Cloud Run wins predictable |
| **Observability Greenhouse** | Notion-native (Sentry gap) | Sentry domain + reliability signals + Cloud Logging | Cloud Run |
| **Multi-target writes (PG + BQ + Notion atomic)** | NO (Worker no acceso PG/BQ Greenhouse) | SÍ (via @google-cloud/sql + @google-cloud/bigquery) | Cloud Run |
| **Custom logic complexity** | Limited (template patterns) | Unlimited | Cloud Run |
| **Workspace-internal access** | Native | Via Notion API (rate limited) | Workers |
| **Trigger types** | webhook, schedule, agent tool | webhook, schedule (Cloud Scheduler) | Tie |
| **Latency edit → response** | Lower (intra-Notion) | Higher (Vercel/Cloud Run round-trip) | Workers |
| **Rollback** | `ntn workers delete` + redeploy | Cloud Run revision rollback | Cloud Run (instant via traffic split) |
| **Concurrent execution model** | Notion-managed (opaque) | Cloud Run concurrency settings | Cloud Run wins predictable |
| **Long-running processes** | Sandbox limits (unknown timeout) | Up to 60 min Cloud Run timeout | Cloud Run |
| **Auth boundary Greenhouse data** | Requires federation (gap) | Native (IAM + WIF + secrets) | Cloud Run |

## 2. Decision tree canonical

```
¿La lógica TOCA datos canonical Greenhouse (PG, BQ, outbox, members, etc.)?
    └── SÍ → Cloud Run (Workers no tienen acceso nativo)

¿La lógica es path productivo de bonus payroll o KPI consumido por nómina?
    └── SÍ → Cloud Run (Workers en Beta = liability)

¿La lógica vive completamente dentro de Notion (workspace-internal)?
    └── SÍ → Considerar Workers (cost-efficient para casos pequeños)

¿La lógica es agent tool callable por Custom Agent?
    └── SÍ → Workers (única forma)

¿Es discovery / exploración / PoC sin SLA requirements?
    └── SÍ → Workers OK (time to ship gana)

¿Es webhook trigger external simple (no toca Greenhouse stack)?
    └── SÍ → Workers OK

Default → Cloud Run (incumbent canonical Greenhouse)
```

## 3. Por TASK específico

### TASK-901 (RpA writeback canonical) — **Cloud Run gana**

- Logic acoplada a `notion_metrics_writeback_log` PG table
- Necesita outbox + reactive consumer + reliability signals
- Necesita Sentry domain integration (`captureWithDomain('integrations.notion', ...)`)
- Path productivo bonus = path crítico = Beta de Workers es liability
- Necesita PostgreSQL access (writeback log, lookup `task_status_transitions`)

→ V1.0 implementación Cloud Run canonical via ops-worker.

### TASK-879 follow-up (notion-bq-sync evaluation) — **Mixed**

- **Reemplazar legacy notion-bq-sync con Workers Database Sync**: posible candidato V2+
  - PROS: time-to-ship, cost reduction
  - CONS: Workers Beta + Sentry gap + multi-target write limits (sync solo escribe Notion, no PG/BQ Greenhouse)
- **Reemplazar legacy con Cloud Run custom canonical**: candidate V1
  - PROS: control completo, observability nativa, predictable
  - CONS: re-implementation cost vs comprar Workers Sync feature

### TASK-908 (Status Transition Foundation) — **Cloud Run gana**

- Webhook handler en Vercel route → outbox → reactive consumer
- Persist en PG `task_status_transitions` (PG-resident, no Notion-resident)
- Sin candidato razonable Workers

### Hipotético TASK V2+ — Custom Agent "ICO Performance" — **Workers wins**

- Tool callable por agent (única forma)
- Logic determinista (count/sum/forecast)
- Read-only access a Greenhouse data (via REST API federation futura)
- Workers único path para agent tools

## 4. Cuándo re-evaluar (triggers para re-abrir decisión)

Workers gana en casos más amplios cuando:
1. **Workers → GA** (sin Beta disclaimer)
2. **SLA/uptime guarantees** publicadas
3. **Pricing post Aug 11 2026** estabilizado y predecible vs Cloud Run
4. **Sentry/observability integration nativa** (no requiere shim)
5. **Documentación completa** de limits (memory, timeout, network, languages)
6. **Multi-region availability**
7. **Federation auth Notion ↔ external APIs** estandarizada

Hasta entonces, **Cloud Run es default canonical Greenhouse** para path productivo.

## 5. Anti-patterns canonical

| Anti-pattern | Por qué prohibido |
|---|---|
| "Workers porque time-to-ship" en path bonus payroll | Beta = liability, Sentry gap = ceguera operacional |
| Cloud Run para Custom Agent tool | Workers es el único path soportado |
| Mixed: Worker que llama Cloud Run que escribe Notion | Sobreingeniería + dual blast radius |
| Workers para sync con multi-target (PG + Notion) | Workers no tiene acceso PG Greenhouse |
| "Reescribir todo a Workers cuando salga GA" | Migration cost vs benefit — solo migrar lo que claramente gana |

## 6. ADR canonical recomendado

Cuando hagas la decisión Workers vs Cloud Run para un task específico:

1. Document en spec del task el resultado del decision tree
2. Si es non-default (Workers en path productivo, o Cloud Run para agent tool), document con ADR section explícito
3. Update este archivo §3 con la decisión canonical del task

## 7. Cross-refs

- `developer-platform-2026/workers-canonical.md` — capacidades Workers
- `developer-platform-2026/agent-tools.md` — único path para tools
- `decision-frameworks/agent-tool-vs-traditional.md` (stub)
- `investigation-gaps/workers-production-readiness.md` — questions abiertas
- TASK-879 (Greenhouse) — readiness eval framework
