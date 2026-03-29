# TASK-103 — GCP Budget Alerts & BigQuery Cost Guards

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P2` |
| Impact | `Medio` |
| Effort | `Muy bajo` |
| Status real | `Diseño` |
| Rank | — |
| Domain | Infrastructure / Cost Management |
| Sequence | Cloud Posture Hardening **6 of 6** — independent, can run in parallel with any task |

## Summary

Configurar budget alerts en GCP Billing para detectar anomalías de costo, y agregar `maximumBytesBilled` a las queries de BigQuery desde el código para prevenir full-table scans accidentales. Hoy hay zero visibilidad del gasto en infraestructura.

## Why This Task Exists

Greenhouse tiene 13 datasets BigQuery con 200+ tablas, 10 Cloud Run services, Cloud SQL, Cloud Storage, y Vertex AI — todo corriendo sin alertas de costo. Riesgos concretos:

| Escenario | Impacto potencial |
|---|---|
| Query BigQuery sin filtro de partición → full scan de tabla grande | $5-50 por query (BigQuery cobra $6.25/TB) |
| Cloud Run service en loop infinito | Facturación por segundo sin límite |
| Vertex AI Gemini llamadas sin throttle | $0.075/1K input tokens × volumen |
| Cloud SQL storage crece sin control | Auto-resize sin cap |
| Alguien olvida eliminar un Cloud SQL clone de test | ~$30/día por instancia idle |

## Goal

Detectar anomalías de gasto en <24h y prevenir queries BigQuery abusivas desde el código.

## Dependencies & Impact

- **Depende de:**
  - Acceso admin a GCP Billing
  - Email o Slack para recibir alertas
- **Impacta a:**
  - TASK-098 (Observability) — budget alerts complementan error alerting
  - Todas las queries BigQuery en `src/lib/bigquery.ts` y stores
  - Scripts de backfill que hacen queries masivas
- **Archivos owned:**
  - Configuración de GCP Budget (GCP Console)
  - `src/lib/bigquery.ts` (agregar `maximumBytesBilled`)

## Current Repo State

### BigQuery client (`src/lib/bigquery.ts`)
- Cliente inicializado con credentials y projectId
- **Sin `maximumBytesBilled`** en ninguna query
- Queries distribuidas en ~40+ stores y API routes

### Datasets con mayor riesgo de costo
| Dataset | Tablas | Riesgo |
|---------|--------|--------|
| `hubspot_crm` | 35 | Tablas legacy, queries sin partición |
| `greenhouse` | 41 | Core tables, alto volumen de reads |
| `analytics_486264460` | 50+/día | GA4 exports, tablas diarias enormes |
| `greenhouse_raw` | 11 | Append-only, crece indefinidamente |

## Scope

### Slice 1 — GCP Budget Alert (~30 min)

1. Crear budget en GCP Console → Billing → Budgets & Alerts:
   - **Budget name:** `Greenhouse Monthly`
   - **Scope:** Project `efeonce-group`
   - **Amount:** $200 USD/mes (ajustar según gasto actual)
   - **Thresholds:**
     - 50% → email notification
     - 80% → email notification
     - 100% → email notification
   - **Recipients:** billing admin email + optional Slack via Cloud Monitoring notification channel

2. Alternativamente via gcloud:
   ```bash
   gcloud billing budgets create \
     --billing-account=BILLING_ACCOUNT_ID \
     --display-name="Greenhouse Monthly" \
     --budget-amount=200.00USD \
     --threshold-rule=percent=0.5,basis=CURRENT_SPEND \
     --threshold-rule=percent=0.8,basis=CURRENT_SPEND \
     --threshold-rule=percent=1.0,basis=CURRENT_SPEND \
     --all-updates-rule-monitoring-notification-channels=CHANNEL_ID
   ```

3. Crear alert específico para BigQuery:
   - **Budget name:** `BigQuery Monthly`
   - **Scope:** Service = BigQuery
   - **Amount:** $50 USD/mes
   - **Thresholds:** 50%, 80%, 100%

### Slice 2 — BigQuery Query Cost Guard (~1h)

1. Agregar configuración default en `src/lib/bigquery.ts`:
   ```typescript
   // Default: limitar queries a 1 GB scanned (≈ $0.006)
   // Previene full-table scans accidentales
   const DEFAULT_MAX_BYTES_BILLED = 1_000_000_000 // 1 GB

   export function getMaxBytesBilled(): number {
     const envValue = process.env.BIGQUERY_MAX_BYTES_BILLED
     return envValue ? parseInt(envValue, 10) : DEFAULT_MAX_BYTES_BILLED
   }
   ```

2. Aplicar en el helper de query (si existe un wrapper centralizado):
   ```typescript
   const [rows] = await bigquery.query({
     query,
     params,
     maximumBytesBilled: String(getMaxBytesBilled()),
   })
   ```

3. Para queries que legítimamente necesitan más (backfills, materialización):
   ```typescript
   // Override explícito para queries grandes
   const [rows] = await bigquery.query({
     query,
     params,
     maximumBytesBilled: String(10_000_000_000), // 10 GB — explícito
   })
   ```

4. Si no hay wrapper centralizado, agregar `maximumBytesBilled` a los queries más costosos:
   - Stores que leen de `hubspot_crm` (35 tablas, sin partición)
   - Stores que leen de `greenhouse_raw` (append-only, crece)
   - Materialización en cron routes (`sync-conformed`, `ico-materialize`)

### Slice 3 — Verificar gasto actual (~15 min)

1. Revisar gasto del último mes en GCP Billing:
   ```bash
   # Ver breakdown por servicio
   gcloud billing accounts list
   # Acceder a Billing → Reports en Console
   ```
2. Identificar el top 3 servicios por costo
3. Ajustar budget amounts según el baseline real

## Out of Scope

- Optimización de queries BigQuery (mejora futura post-slow query analysis)
- Reserved capacity para BigQuery (flex slots) — el volumen no lo justifica
- Cloud SQL Reserved Instances — no existe en Cloud SQL (solo committed use discounts)
- Cost allocation tags por módulo — sobreingeniería para 1 proyecto
- FinOps dashboards — GCP Billing reports es suficiente
- Vertex AI cost caps — el uso es bajo y controlado

## Acceptance Criteria

- [ ] Budget alert `Greenhouse Monthly` creado con thresholds 50/80/100%
- [ ] Budget alert `BigQuery Monthly` creado con threshold específico
- [ ] Email de billing admin recibe notificaciones
- [ ] `maximumBytesBilled` configurado en `src/lib/bigquery.ts`
- [ ] Queries que excedan el límite fallan con error claro (no silenciosamente)
- [ ] Scripts de backfill tienen override explícito documentado
- [ ] Gasto actual del último mes documentado como baseline
- [ ] `pnpm build` pasa
- [ ] `pnpm test` pasa

## Verification

```bash
# Verificar budget existe
gcloud billing budgets list --billing-account=BILLING_ACCOUNT_ID

# Verificar BigQuery guard (query que excede el límite debe fallar)
# En BigQuery console:
SELECT * FROM `efeonce-group.hubspot_crm.companies`
# Con maximumBytesBilled=1000 → debería fallar con "Query exceeded limit"

# Build validation
pnpm build
pnpm test
```
