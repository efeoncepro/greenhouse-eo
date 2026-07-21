# Notion Workers — canonical

> **Lanzamiento**: May 13, 2026 (Notion 3.5 Developer Platform)
> **Status**: **Public Beta** — Business + Enterprise plans
> **Pricing**: Free hasta Aug 11, 2026 → después credits system (mismo que Custom Agents)
> **Source**: https://www.notion.com/releases/2026-05-13 + https://www.notion.com/product/dev + community guide https://matthiasfrank.de/en/notion-workers-dev-day-2026/
> **Last verified**: 2026-05-17

## 1. Qué son Workers

Workers son **código custom que ejecuta en runtime hosted de Notion**. Permiten:
- Sync de data sources externos (Zendesk, Salesforce, Postgres, APIs custom)
- Build de **agent tools** (callable por Custom Agents)
- Trigger por **webhook**, ejecutar lógica determinística, escribir a Notion
- **Sync schedules** (every 15 min, every hour, daily)

> "Write your logic, deploy to a secure sandbox, and it's live — no servers to provision, no containers to configure."

## 2. Status canonical de capabilities

| Capability | Status | Disponible |
|---|---|---|
| Workers runtime | Beta | Business + Enterprise |
| ntn CLI | GA | Todos los planes |
| Database Sync (Workers-powered) | Beta | Business + Enterprise |
| Custom Agent Tools (via Workers) | Beta | Business + Enterprise |
| Webhook Triggers (bidirectional) | Beta | Business + Enterprise |

## 3. Runtime characteristics (limitaciones conocidas)

⚠️ **Investigation gap**: Notion no documenta públicamente al 2026-05-17:
- Memory limits exactos
- Timeout máximo per execution
- Lenguajes soportados (referencia TS via template github.com/makenotion/workers-template; Python no confirmado)
- Outbound network policies (allowlist? unrestricted? rate-limited?)
- Local filesystem access
- Concurrent execution model

Ver `investigation-gaps/workers-production-readiness.md` para questions abiertas.

### Lo que SÍ sabemos
- **TypeScript** soportado (template official es TS)
- Sandboxed (security isolation declarado en marketing)
- Deploy vía `ntn` CLI exclusivamente — **no UI deploy path**
- Run en infra Notion (no necesitas Cloud Run / Vercel)

## 4. Trigger types canonical

Un Worker puede ser invocado por 3 tipos de trigger:

### 4.1 Agent Tool
- Worker actúa como tool callable por Custom Agent o External Agent
- Pattern: agent decide invocar tool → Notion ejecuta Worker → response → agent continúa
- Use case: deterministic logic donde LLM no es suficiente o token-cost alto

### 4.2 Webhook Trigger
- Worker recibe webhook (incluso desde sistemas externos a Notion)
- Ejecuta lógica → opcionalmente escribe a Notion o llama APIs externas
- **Bidirectional**: este es el cambio nuevo — webhooks ya no son solo Notion → Worker, sino también triggerable from external

> "Something happens in your workspace → the worker fires → the job gets done. Pure automation, no tokens burned."

### 4.3 Sync Schedule
- Cron-like recurring execution
- Ejemplos: "every 15 minutes", "every hour", "once a day"
- Use case: pull de external system → sync a Notion database

## 5. Pricing — credits system

| Fecha | Modelo |
|---|---|
| **Hasta Aug 11, 2026** | **GRATIS** (Beta period) |
| **Desde Aug 11, 2026** | Credits system (mismo budget que Custom Agents) |

### Sample costs (community-reported)

| Use case | Cost estimate |
|---|---|
| Daily Jira pull (1x/day) | ~1 cent/month |
| Salesforce polling (every 15 min) | ~86 cents/month |
| Heavy usage (~9,800 runs) | ~$13/month |

→ Workers son **mucho más baratos que LLM reasoning** (que es el caso de uso primario que justifica su existencia).

## 6. Deploy flow canonical (ntn CLI)

```bash
# 1. Install
curl -fsSL https://ntn.dev | bash

# 2. Auth (PAT-based)
ntn login

# 3. Bootstrap from template
git clone https://github.com/makenotion/workers-template
cd workers-template
npm install

# 4. Edit src/index.ts con tu logic

# 5. Deploy
ntn workers deploy

# 6. List
ntn workers list

# 7. Logs
ntn workers logs <worker-name>
```

⚠️ **No hay deploy UI** — todo es CLI. Si necesitas team deploys, integra `ntn workers deploy` en CI (GitHub Actions, etc.).

## 7. Decision framework — Workers vs Cloud Run

Decisión canonical para Greenhouse (TASK-901, TASK-879):

### Workers ganan cuando
- Logic acoplada a Notion runtime (acceso interno a workspace state)
- Cost-sensitive y workload pequeño/medio (Salesforce 15-min poll = $0.86/mes)
- Quieres deploy sin manejar infra
- Trigger es Custom Agent tool (no hay alternativa)
- Webhook trigger external → Notion sin pasar por Greenhouse

### Cloud Run gana cuando
- Logic acoplada a Greenhouse stack (PG + BQ + outbox + Sentry + reliability signals)
- Necesitas Sentry domain integration (`captureWithDomain('integrations.notion', ...)`)
- Necesitas Cloud SQL Connector / BigQuery client / Vercel coordination
- Workload pesado o sustained (Workers credits costaría más)
- Path productivo crítico (Beta status de Workers es liability)
- Multi-target writes (PG + BQ + Notion en misma tx)

### Para TASK-901 (RpA writeback) — **Cloud Run gana**
- Logic acoplada a `notion_metrics_writeback_log` PG table
- Necesitas outbox + reactive consumer + reliability signals
- Necesitas Sentry domain tagging
- Path bonus payroll = path crítico = no se cabe Beta

### Para TASK-879 follow-ups exploratorios — **Workers OK**
- Sync legacy Notion → BQ podría re-implementarse como Worker
- Discovery/exploration workloads donde fail-soft es aceptable

Detalle completo en `decision-frameworks/workers-vs-cloud-run.md`.

## 8. Hard rules canonical Workers

- **NUNCA** uses Workers en path productivo bonus payroll mientras esté en Beta
- **NUNCA** asumes que el comportamiento Beta sea idéntico al GA (pricing, limits pueden cambiar)
- **SIEMPRE** consulta `investigation-gaps/workers-production-readiness.md` antes de comprometer Workers en path crítico
- **NUNCA** confíes en docs incompletos — Notion sigue iterando rápidamente (release pace ~mensual)
- **SIEMPRE** que evalúes Workers vs Cloud Run, documenta la decisión en ADR (no implícito)
- **NUNCA** uses PAT del operador para deploy productivo de Worker — usa machine PAT dedicado

## 9. Cuándo re-evaluar Workers para Greenhouse

Triggers para re-abrir decisión:
- Notion declara Workers **GA** (sin Beta disclaimer)
- Notion publica SLA/uptime guarantees
- Pricing post Aug 11 2026 estabilizado y predecible
- Sentry/observability integration nativa (no requiere shim)
- Documentación completa de limits (memory, timeout, network, languages)
- Multi-region availability

## 10. Cross-refs

- `developer-platform-2026/ntn-cli.md` — CLI canonical
- `developer-platform-2026/agent-tools.md` — Workers como tools
- `developer-platform-2026/worker-syncs.md` — Database Sync pattern
- `decision-frameworks/workers-vs-cloud-run.md` — matriz completa
- `investigation-gaps/workers-production-readiness.md` — questions abiertas
- TASK-879 (Greenhouse) — readiness evaluation original
