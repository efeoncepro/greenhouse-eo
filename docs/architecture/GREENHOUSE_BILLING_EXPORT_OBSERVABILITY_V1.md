# Greenhouse Billing Export Observability V1

> Spec canónica del reader de GCP Billing Export y de la composición operativa del flujo Notion para `Admin Center`. Define el contrato, la lectura graceful, los thresholds iniciales y el split de ownership con TASK-103 / TASK-208 / TASK-585.
>
> Versión: `1.0`
> Estado: `vigente`
> Creada: `2026-04-25` por TASK-586
> Última actualización: `2026-04-25`

---

## 1. Por qué existe

Antes de TASK-586 había observabilidad parcial:

- `TASK-103` cerró cost guard runtime (`maximumBytesBilled`, `getBlockedQueries`).
- `TASK-208` cerró DQ recurrente del flujo Notion.
- `TASK-585` cerró hardening de `notion-bq-sync` (minScale=0).
- Billing Export estaba habilitado en `efeonce-group.billing_export` pero **sin consumer en el portal**.

Quien quería responder "¿cuánto cuesta Greenhouse cloud hoy?" o "¿está fresco el carril Notion?" tenía que abrir GCP Console o correr queries ad hoc. TASK-586 cierra ese gap.

## 2. Principios

1. **Reader read-only.** Ninguna mutación al dataset; solo SELECT con cost guard.
2. **Graceful degradation.** Si tablas no materializaron todavía, `availability='awaiting_data'` y la UI lo dice explícitamente — nunca fingimos cero costo.
3. **Compose, no duplique.** El flujo Notion reusa los 3 readers existentes (`getNotionRawFreshnessGate`, `getNotionSyncOrchestrationOverview`, `getNotionDeliveryDataQualityOverview`). El composer es puro.
4. **Inferir upstream cuando no hay reader directo.** `notion-bq-sync` Cloud Run no expone status API; usamos `_synced_at` en `notion_ops.{tareas,proyectos,sprints}` como verdad funcional.
5. **Cost guard se respeta.** Toda query usa `getBigQueryQueryOptions()` que inyecta `maximumBytesBilled` (TASK-103).
6. **Cache 30 min.** Billing Export tiene latencia natural ~24h; reconsultar más seguido es desperdicio.

## 3. Contracts canónicos

Tipos en [`src/types/billing-export.ts`](../../src/types/billing-export.ts).

### 3.1 `GcpBillingOverview`

| Campo | Descripción |
|---|---|
| `availability` | `configured` \| `awaiting_data` \| `not_configured` \| `error` |
| `period` | `{ startDate, endDate, days }` (default 7 días) |
| `totalCost` | Suma cost del período |
| `currency` | Moneda detectada (típicamente `USD`) |
| `costByDay[]` | Serie diaria |
| `costByService[]` | Top 25 servicios ordenados por cost desc |
| `spotlights` | `{ cloudRun, bigQuery, cloudSql, notionBqSync }` (cada uno opcional) |
| `source` | `{ dataset, table, latestUsageDate }` |
| `notes[]` | Mensajes humanos sobre cobertura/latencia |
| `error` | Mensaje si hubo fallo, sino `null` |

### 3.2 Spotlight `notionBqSync`

Detección por estrategia, declarada explícitamente:

| Estrategia | Cuándo aplica |
|---|---|
| `label_cloud_run_service` | Hay rows con label `cloud-run-resource-name = notion-bq-sync` (preciso). |
| `service_description` | Aproximación vía `service.description IN ('Cloud Run', 'Cloud Logging', 'Cloud Monitoring')` (impreciso, requiere label setup). |
| `unavailable` | Cero rows en ambas estrategias. |

La UI muestra el chip de estrategia para que operadores sepan si la cifra es exacta o aproximada.

### 3.3 `NotionSyncOperationalOverview`

Tipos en [`src/lib/integrations/notion-sync-operational-overview.ts`](../../src/lib/integrations/notion-sync-operational-overview.ts).

```typescript
{
  flowStatus: 'healthy' | 'degraded' | 'broken' | 'awaiting_data' | 'unknown'
  summary: string
  upstream: { freshestRawSyncedAt, ageHours, isStale, staleSpaceCount, activeSpaceCount, ready, reason }
  orchestration: { totals, pendingSpaces, failedSpaces }
  dataQuality: { totals, latestRunCheckedAt }
}
```

`flowStatus` se deriva por agregación:

- `awaiting_data` si no hay spaces activos y no hay timestamp raw.
- `broken` si `orchestration.failedSpaces > 0` o `dataQuality.totals.brokenSpaces > 0`.
- `degraded` si `upstream.isStale` (>24h) o `dataQuality.degradedSpaces > 0` o `!upstream.ready`.
- `healthy` en otro caso.

## 4. Reader (`src/lib/cloud/gcp-billing.ts`)

`getGcpBillingOverview({ days = 7, forceRefresh = false })` con cache TTL 30 min:

1. `getBigQueryProjectId()` — sin project ID → `not_configured`.
2. `INFORMATION_SCHEMA.TABLES` para detectar `gcp_billing_export_v1*` (no resource).
3. Sin tabla → `awaiting_data` con notes explicativas.
4. Query agregada por servicio (top 25) + serie diaria. Ambas con `maximumBytesBilled` cap.
5. Spotlights por servicios canónicos: Cloud Run / BigQuery / Cloud SQL.
6. Spotlight notion-bq-sync con dual probe (label → service description).
7. Sin filas → `awaiting_data`.
8. Cualquier `Not found: Dataset` → `awaiting_data`. Otros errores → `error` con mensaje.

## 5. Adapters de Reliability

[`src/lib/reliability/signals.ts`](../../src/lib/reliability/signals.ts) extiende dos nuevos:

- `buildGcpBillingSignals(overview)` → señales `kind=billing`:
  - `cloud.billing.gcp_export` (módulo `cloud`) — siempre emitida con severidad derivada de `availability`.
  - `integrations.notion.billing.notion_bq_sync` (módulo `integrations.notion`) — emitida solo si la spotlight detecta cost.
- `buildNotionFreshnessSignal(overview)` → señal `kind=freshness`:
  - `integrations.notion.freshness.upstream` — severidad mapeada desde `flowStatus`.

`buildReliabilityOverview()` ahora acepta `sources?: { billing, notionOperational }` para evitar doble fetch cuando la página ya tiene los overviews.

Boundaries en `RELIABILITY_INTEGRATION_BOUNDARIES`:

- TASK-586 / `cloud.billing` → status `ready`.
- TASK-586 / `integrations.notion.freshness` → status `ready`.
- TASK-103 / `cloud.billing` (budget thresholds) → status `partial` (cost guard ya cubierto, budget alerts requieren GCP Console).

## 6. Surfaces consumidoras

| Surface | Componente | Rol |
|---|---|---|
| `Admin Center` (`/admin`) | sección "Confiabilidad por módulo" | Resumen agregado por módulo (consume señales billing+freshness vía Reliability). |
| `Cloud & Integrations` (`/admin/integrations`) | `NotionSyncOperationalCard` + `GcpBillingCard` | Lectura completa: KPIs, breakdown por servicio, spotlight notion-bq-sync, timeline raw → orchestration → DQ. |
| `Ops Health` (`/admin/ops-health`) | sección "Spotlight observabilidad" | Lectura compacta incidente-style. La lectura completa vive en Cloud & Integrations. |
| API `GET /api/admin/cloud/gcp-billing` | endpoint REST | Reusable por agentes, MCP, synthetic monitors. Acepta `?days=N`. |
| API `GET /api/admin/integrations/notion/operational-overview` | endpoint REST | Reusable. |

## 7. Thresholds iniciales (auditables)

| Threshold | Valor | Donde se aplica |
|---|---|---|
| `STALE_THRESHOLD_HOURS` | 24 | Notion upstream → `isStale`. |
| `notionBqSync.share` warning | 50% del total cloud | Visual progress bar pasa a warning. |
| `costByService` limit | 25 servicios | Para no traer rows ilimitados. |
| `period.days` default | 7 | Acotar query barata. |
| Cache TTL | 30 minutos | Billing Export tiene latencia ~24h; sub-hour fresh es desperdicio. |

Estos valores son conservadores — se ajustan con datos reales una vez Billing Export materialice tablas.

## 8. Split de ownership

| Lane | Owner | Qué hace | Qué NO hace |
|---|---|---|---|
| TASK-103 | Cost guard runtime | `maximumBytesBilled`, blocked queries, Slack alert | NO lee Billing Export. NO crea budget alerts en GCP Console. |
| TASK-208 | DQ Notion | `integration_data_quality_runs`, drift checks, alertas Slack | NO compone overview operativo. NO mira upstream raw. |
| TASK-585 | Hardening notion-bq-sync | `minScale=0`, identity hardening | NO mide costo del servicio. |
| **TASK-586** | **Observability composer** | **Reader Billing Export, composer Notion sync, surfaces Admin Center / Ops Health, adapters Reliability** | **NO modifica datasets. NO reabre lanes upstream.** |

## 9. Cosas que NO hace V1

- No persiste señales históricas (cada lectura es snapshot).
- No alerta thresholds de budget (eso vive en TASK-103 vía GCP Console + TASK-103 GCP setup pendiente).
- No expone drill-down arbitrario por label/recurso (eso es FinOps avanzado, follow-up).
- No reemplaza GCP Billing Console como fuente oficial.
- No traduce monedas (asume `USD`/`CLP` según export configurado).
- No correlaciona spike de costo con incidentes Sentry (eso es trabajo de TASK-634).

## 10. Archivos canónicos

- Tipos: [`src/types/billing-export.ts`](../../src/types/billing-export.ts)
- Reader Billing: [`src/lib/cloud/gcp-billing.ts`](../../src/lib/cloud/gcp-billing.ts)
- Composer Notion: [`src/lib/integrations/notion-sync-operational-overview.ts`](../../src/lib/integrations/notion-sync-operational-overview.ts)
- Adapters Reliability: [`src/lib/reliability/signals.ts`](../../src/lib/reliability/signals.ts)
- API: [`src/app/api/admin/cloud/gcp-billing/route.ts`](../../src/app/api/admin/cloud/gcp-billing/route.ts)
- API: [`src/app/api/admin/integrations/notion/operational-overview/route.ts`](../../src/app/api/admin/integrations/notion/operational-overview/route.ts)
- UI: [`src/components/greenhouse/admin/GcpBillingCard.tsx`](../../src/components/greenhouse/admin/GcpBillingCard.tsx)
- UI: [`src/components/greenhouse/admin/NotionSyncOperationalCard.tsx`](../../src/components/greenhouse/admin/NotionSyncOperationalCard.tsx)
- View entrypoint: [`src/views/greenhouse/admin/AdminIntegrationGovernanceView.tsx`](../../src/views/greenhouse/admin/AdminIntegrationGovernanceView.tsx)
- View incident: [`src/views/greenhouse/admin/AdminOpsHealthView.tsx`](../../src/views/greenhouse/admin/AdminOpsHealthView.tsx)

## Delta 2026-05-03 — TASK-769 Cloud Cost Intelligence V2

TASK-769 convierte la lectura V1 de Billing Export en inteligencia FinOps operable:

- El reader `getGcpBillingOverview()` detecta también `gcp_billing_export_resource_v1*` y expone `costByResource`, `topDrivers` y `forecast` sin romper consumidores V1.
- El forecast mensual es determinístico: usa promedio del mes cuando hay al menos 7 días completos; si no, usa ventana rolling reciente para evitar subestimar al inicio de mes.
- Los drivers tempranos se calculan antes de la IA: `forecast_risk`, `share_of_total`, `service_spike` y `resource_driver`.
- `GcpBillingCard` en Cloud & Integrations muestra proyección, alertas tempranas, recursos/SKUs principales y última observación del Copiloto FinOps AI cuando existe.
- `GET /api/admin/cloud/gcp-billing?ai=true` incluye la última observación AI de forma opcional; el default mantiene la respuesta determinística y cacheable.
- `src/lib/cloud/gcp-billing-alerts.ts` ejecuta un sweep explícito con fingerprint + cooldown y canales Teams primero, Slack fallback. Nunca se despacha desde render UI ni desde GET.
- `src/lib/cloud/finops-ai/runner.ts` ejecuta el Copiloto FinOps AI solo con `CLOUD_COST_AI_COPILOT_ENABLED=true`, JSON estricto, fingerprint dedupe y persistencia en `greenhouse_ai.cloud_cost_ai_observations`.
- `POST /cloud-cost-ai-watch` en ops-worker corre primero alertas determinísticas y luego AI opt-in. Soporta `dryRun=true` para validar sin notificaciones ni persistencia de fingerprints.

Validación real del 2026-05-03 contra `efeonce-group.billing_export`:

- Tabla estándar: `gcp_billing_export_v1_013340_4C7071_668441`.
- Tabla resource-level: `gcp_billing_export_resource_v1_013340_4C7071_668441`.
- 30 días observados: CLP 114.379,91.
- Forecast mensual rolling: CLP 121.840,58 con confianza high.
- Driver principal: Cloud SQL `greenhouse-pg-dev` vCPU/RAM; `resource_driver.cloud_sql.greenhouse_pg_dev` severity `error`.
