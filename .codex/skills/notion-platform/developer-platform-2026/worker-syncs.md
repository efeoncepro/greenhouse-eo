# Notion Database Sync — Workers-powered

> **Status**: Beta (Workers-based, May 13 2026 launch)
> **Source**: https://www.notion.com/releases/2026-05-13 + blog post Developer Platform
> **Last verified**: 2026-05-17

## 1. Qué es Database Sync

Capability built on Workers que permite **sync bidireccional** entre Notion databases y sistemas externos con API:

> "Brings data from any system of record with an API… into Notion databases and keeps them fresh automatically."

### Sistemas mencionados oficialmente
- Zendesk (tickets)
- Salesforce (customer data, deals)
- Postgres databases
- Cualquier API custom (fitness, music, weather, etc. — los ejemplos del blog)

## 2. Diferencia vs notion-bq-sync legacy de Greenhouse

| Aspecto | notion-bq-sync (Cloud Run, legacy) | Database Sync (Workers, Beta) |
|---|---|---|
| Dirección | Notion → BQ (one-way) | Bidirectional possible |
| Hosting | Cloud Run en GCP | Hosted en Notion runtime |
| Trigger | Cloud Scheduler cron | Worker schedule (built-in) |
| Cost model | Cloud Run / GCP billing | Notion credits |
| Observability | Sentry + Cloud Logging + reliability signals Greenhouse | Notion-native (gap — no Sentry domain) |
| Path productivo Greenhouse hoy | **SÍ** | NO (Beta, evaluar TASK-879) |

## 3. Cuándo evaluar Database Sync para Greenhouse

### Candidato razonable
- Sync de Postgres ↔ Notion display tables (TASK-577 futuro?)
- Sync de Stripe / Mercado Pago / etc. para finance display
- Push de Greenhouse KPIs a Notion dashboards operator-facing

### NO candidato V1
- Replace de notion-bq-sync productivo (loss of Sentry domain, reliability signals)
- Sync crítico que alimenta bonus payroll (Beta status liability)

## 4. Trade-off Workers Sync vs Cloud Run custom

| Eje | Workers Sync | Cloud Run custom |
|---|---|---|
| Time to ship | Minutes (template available) | Days (full pipeline) |
| Custom logic | Limited (template patterns) | Unlimited |
| Multi-target writes | Single-target Notion | Multi-target (PG + BQ + Notion atomic) |
| Observability Greenhouse | Gap | Native (Sentry domain, reliability signals) |
| Cost steady-state | ~$1-10/month per sync | ~$5-20/month per service |
| SLA / reliability | Notion Beta | GCP SLA |

## 5. Hard rules canonical

- **NUNCA** uses Database Sync para reemplazar notion-bq-sync productivo en path bonus payroll mientras esté en Beta
- **SIEMPRE** documenta en ADR cuando elijas Workers Sync vs Cloud Run custom — no implícito
- **CONSIDERA** Database Sync para PoC / discovery / non-critical surfaces — ahí ganancia time-to-market vale
- **NUNCA** elimines notion-bq-sync legacy hasta que TASK-577 ship el reemplazo canonical decidido (sea Workers Sync o nuevo Cloud Run)

## 6. Investigation gaps

- ¿Soporta Database Sync escribir a Postgres? (sería interesante reemplazar TASK-258 pipeline)
- ¿Conflict resolution policy si edits simultáneos en ambos lados?
- ¿Versioning / rollback de sync rules?
- ¿Granularidad por property o solo full row?

Ver `investigation-gaps/database-links-capability.md` (stub).

## 7. Cross-refs

- `developer-platform-2026/workers-canonical.md` — runtime base
- `decision-frameworks/workers-vs-cloud-run.md` — matriz general
- `greenhouse-runtime/notion-bq-sync.md` (stub) — legacy service detail
- TASK-577 (Greenhouse) — sync infra evolution roadmap
- TASK-879 (Greenhouse) — readiness eval
