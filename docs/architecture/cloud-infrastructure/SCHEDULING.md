# Cloud Infrastructure — Scheduling (Cloud Scheduler + Vercel crons)

> **Estado vigente** · Updated: 2026-08-05 (TASK-1646) · Cronología: [HISTORIAL.md](HISTORIAL.md)
> **SoT Cloud Scheduler:** `services/<worker>/deploy.sh` — `upsert_scheduler_job` es
> **declarativo y se re-aplica en cada deploy** (incluido el estado `paused`: un
> `gcloud scheduler jobs resume|pause` manual se revierte solo en el siguiente deploy).
> Verdad live: `gcloud scheduler jobs list --location us-east4`.
> **SoT Vercel crons:** `vercel.json`.

## Regla estructural (TASK-773 / TASK-775)

- Los crons del **path async crítico** (outbox/event-bus/projections/reactive) van a **Cloud
  Scheduler + workers Cloud Run**, NUNCA a `vercel.json`. Vercel sólo ejecuta crons en deploys
  de Production — staging custom environment no los corre, lo que deja el flow async invisible
  en staging (root cause del incidente Figma 2026-05-03).
- Todos los jobs usan **OIDC** con `greenhouse-portal@efeonce-group.iam.gserviceaccount.com`
  para invocar Cloud Run (patrón Scheduler → OIDC → Cloud Run).
- Clasificación de crons Vercel (async_critical/prod_only/tooling): gate
  `vercel-cron-async-critical-gate.mjs` + `GREENHOUSE_VERCEL_CRON_CLASSIFICATION_V1.md`.

## Cloud Scheduler — jobs del `ops-worker` (46, verificados contra `deploy.sh` 2026-08-05)

### Event bus + reactivo

| Job | Schedule | Endpoint |
| --- | --- | --- |
| `ops-outbox-publish` | `*/2 * * * *` | `/outbox/publish-batch` |
| `ops-reactive-organization` | `*/5 * * * *` | `/reactive/process-domain` |
| `ops-reactive-finance` | `*/5 * * * *` | `/reactive/process-domain` |
| `ops-reactive-people` | `2-59/5 * * * *` | `/reactive/process-domain` |
| `ops-reactive-notifications` | `*/2 * * * *` | `/reactive/process-domain` |
| `ops-reactive-delivery` | `*/5 * * * *` | `/reactive/process-domain` |
| `ops-reactive-cost-intelligence` | `*/10 * * * *` | `/reactive/process-domain` |
| `ops-reactive-growth` | `*/5 * * * *` | `/reactive/process-domain` |
| `ops-reactive-recover` | `*/15 * * * *` | `/reactive/recover` |

### Webhooks + email

| Job | Schedule | Endpoint |
| --- | --- | --- |
| `ops-webhook-dispatch` | `*/2 * * * *` | `/webhook-dispatch` |
| `ops-email-delivery-retry` | `*/5 * * * *` | `/email-delivery-retry` |
| `ops-email-deliverability-monitor` | `0 */6 * * *` | `/email-deliverability-monitor` |

### Growth / SEO

| Job | Schedule | Endpoint |
| --- | --- | --- |
| `ops-growth-grader-drain` | `*/5 * * * *` | `/growth/grader/drain` |
| `ops-growth-grader-regrade` | `0 8 * * *` | `/growth/grader/regrade` |
| `ops-growth-forms-dispatch` | `*/2 * * * *` | `/growth/forms/dispatch` |
| `ops-seo-gsc-snapshot` | `0 9 * * *` | `/seo/gsc/snapshot-batch` |

### Nubox

| Job | Schedule | Endpoint |
| --- | --- | --- |
| `ops-nubox-sync` | `30 7 * * *` | `/nubox/sync` |
| `ops-nubox-quotes-hot-sync` | `*/15 * * * *` | `/nubox/quotes-hot-sync` |
| `ops-nubox-balance-sync` | `0 */4 * * *` | `/nubox/balance-sync` |

### HubSpot

| Job | Schedule | Endpoint |
| --- | --- | --- |
| `ops-hubspot-companies-sync` | `*/10 * * * *` | `/hubspot/companies-sync` |
| `ops-hubspot-companies-sync-full` | `0 3 * * *` | `/hubspot/companies-sync` |
| `ops-hubspot-deals-sync` | `0 */4 * * *` | `/hubspot/deals-sync` |
| `ops-hubspot-quotes-sync` | `0 */6 * * *` | `/hubspot/quotes-sync` |
| `ops-hubspot-company-lifecycle-sync` | `0 */6 * * *` | `/hubspot/company-lifecycle-sync` |
| `ops-hubspot-products-sync` | `0 8 * * *` | `/hubspot/products-sync` |
| `ops-hubspot-services-sync` | `0 6 * * *` | `/hubspot/services-sync` |

### Identity / Entra

| Job | Schedule | Endpoint |
| --- | --- | --- |
| `ops-entra-profile-sync` | `0 8 * * *` | `/entra/profile-sync` |
| `ops-entra-webhook-renew` | `0 6 */2 * *` | `/entra/webhook-renew` |
| `ops-identity-auth-smoke` | `*/5 * * * *` | `/smoke/identity-auth-providers` |

### Finance

| Job | Schedule | Endpoint |
| --- | --- | --- |
| `ops-finance-rematerialize-balances` | `0 5 * * *` | `/finance/rematerialize-balances` |
| `ops-finance-fx-drift-remediate` | `15 5 * * *` | `/finance/account-balances/fx-drift/remediate` |
| `ops-finance-ledger-health` | `30 5 * * *` | `/finance/ledger-health-check` |
| `ops-finance-dte-emission-retry` | `*/15 * * * *` | `/finance/dte-emission-retry` |
| `ops-reconciliation-auto-match` | `45 7 * * *` | `/reconciliation/auto-match` |

### Delivery / ICO / Notion

| Job | Schedule | Endpoint |
| --- | --- | --- |
| `ops-ico-member-sync` | `30 10 * * *` | `/ico/member-sync` |
| `ops-otd-writeback` | `0 11 * * *` | `/otd/writeback` |
| `ops-notion-conformed-sync` | `20 7 * * *` | `/notion-conformed/sync` |
| `ops-notion-conformed-recovery` | `*/30 * * * *` | `/notion-conformed/recovery` |

### Comercial / catálogo / Nexa / plataforma

| Job | Schedule | Endpoint |
| --- | --- | --- |
| `ops-quotation-lifecycle` | `0 7 * * *` | `/quotation-lifecycle/sweep` |
| `ops-product-catalog-drift-detect` | `0 3 * * *` | `/product-catalog/drift-detect` |
| `ops-product-catalog-reconcile-v2` | `0 6 * * 1` | `/product-catalog/reconcile-v2` |
| `ops-nexa-weekly-digest` | `0 7 * * 1` | `/nexa/weekly-digest` |
| `ops-artifact-render-dispatch` | `*/2 * * * *` | `/artifact-render/dispatch` |
| `ops-globe-tenancy-reconcile` | `*/5 * * * *` | `/globe/tenancy/reconcile` |
| `ops-reliability-ai-watch` | `0 */1 * * *` | `/reliability-ai-watch` |
| `ops-cloud-cost-ai-watch` | `15 */6 * * *` | `/cloud-cost-ai-watch` |

**Complemento operativo 2026-09-03 — pausa reversible de Globe (TASK-1807).** La cadencia de
`ops-globe-tenancy-reconcile` se conserva, pero no implica que el job esté habilitado: en
`efeonce-group/us-east4` quedó `PAUSED` según readback de `2026-09-03T22:26:05Z`. El quinto argumento
`paused` de su llamada en `services/ops-worker/deploy.sh` debe permanecer `true` durante la hibernación;
una corrección local no prueba su promoción a la fuente remota que usará el siguiente deploy. Globe Terraform
no controla este caller externo. No pauses el worker compartido ni borres el job, su identidad o su target.
Para reactivarlo, sigue la fase C del
[runbook de hibernación](../../operations/creative-studio/GLOBE_DEEP_HIBERNATION_RUNBOOK_V1.md): SQL/API
listas, refresco controlado de tenancy en `draining` y proyecciones frescas antes de abrir operación normal.
Verifica source y estado live por separado; no reanudes contra SQL detenido.

## Cloud Scheduler — otros workers

| Job | Schedule | Target | SoT |
| --- | --- | --- | --- |
| `commercial-cost-materialize-daily` | `0 5 * * *` | `commercial-cost-worker` `/cost-basis/materialize` | `services/commercial-cost-worker/deploy.sh` |
| `margin-feedback-materialize-daily` | `10 5 * * *` | `commercial-cost-worker` `/margin-feedback/materialize` | `services/commercial-cost-worker/deploy.sh` |
| `ico-materialize-daily` | `15 3 * * *` | `ico-batch-worker` `/ico/materialize` | `services/ico-batch/deploy.sh` |
| `ico-llm-enrich-daily` | `45 3 * * *` | `ico-batch-worker` `/ico/llm-enrich` | `services/ico-batch/deploy.sh` |
| `finance-materialize-signals-daily` | `0 4 * * *` | `ico-batch-worker` `/finance/materialize-signals` | `services/ico-batch/deploy.sh` |
| `finance-llm-enrich-daily` | `30 4 * * *` | `ico-batch-worker` `/finance/llm-enrich` | `services/ico-batch/deploy.sh` |

## Vercel crons (8 entries, verificados contra `vercel.json` 2026-08-05)

| Path | Schedule | Nota |
| --- | --- | --- |
| `/api/finance/economic-indicators/sync` | `5 23 * * *` | indicadores económicos (UF, UTM, IPC, FX) |
| `/api/cron/sync-previred` | `15 8 * * *` | previred |
| `/api/cron/reliability-synthetic` | `*/30 * * * *` | synthetic monitoring (TASK-632) |
| `/api/cron/notion-delivery-data-quality` | `0 10 * * *` | paridad de datos Notion delivery |
| `/api/cron/email-data-retention` | `0 3 * * 0` | retención de datos email |
| `/api/cron/fx-sync-latam?window=morning` | `0 9 * * *` | FX LATAM |
| `/api/cron/fx-sync-latam?window=midday` | `0 14 * * *` | FX LATAM |
| `/api/cron/fx-sync-latam?window=evening` | `0 22 * * *` | FX LATAM |

> Los 13 crons Vercel que listaba el monolito (outbox-publish, webhook-dispatch,
> email-delivery-retry, sync-conformed, ico-materialize, nubox-*, entra-*, etc.) **ya no están
> en `vercel.json`**: migraron al `ops-worker` vía Cloud Scheduler (TASK-254/258/259/260/
> 261/262/773/775). Las rutas API originales persisten como fallback manual. Cronología
> completa en [HISTORIAL.md](HISTORIAL.md).

## Criterios de placement

Ver [TOPOLOGY.md](TOPOLOGY.md) §2 (regla de decisión rápida + criterios de migración).
