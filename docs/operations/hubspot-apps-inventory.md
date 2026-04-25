# HubSpot Apps Inventory — qué app usa cada service

> **Tipo de documento:** Inventario operativo (seguridad + rotación de tokens)
> **Owner:** Ops + platform engineering
> **Última revisión:** 2026-04-24 (creado post-rotación del token del app `efeonce-data-platform`)
> **Por qué existe:** durante la rotación del token via HubSpot UI el 2026-04-24 descubrimos que el portal tiene 3 Private Apps activas, cada una con su propio access token. La rotación de un app NO afecta a los otros — cada uno se rota independientemente. Este doc mapea cada app a los servicios que consume su token para que cualquier rotación futura sea quirúrgica y sin sorpresas.

## Portales HubSpot utilizados

| Portal ID | Nombre | Uso |
|---|---|---|
| `48713323` | Efeonce Group (producción) | CRM operativo + integraciones con Greenhouse, BigQuery, Notion |
| `51183921` | Staging / sandbox | Scopes & tests; scheduler PAUSED la mayoría del tiempo |

## Private Apps del portal 48713323 (producción)

HubSpot permite múltiples Private Apps por portal. Cada una es un **unit de gobierno independiente** — tiene su propio access token, sus propios scopes, y su propio audit trail.

### App 1 — `efeonce-data-platform` (ID 33235280)

- **Estado**: Activa, **rotada 2026-04-24** (token anterior invalidado)
- **Token (prefix)**: `pat-na1-4efc8c47-...`
- **Secret Manager**: `hubspot-access-token` (project `efeonce-group`, versión actual v3)
- **Developer Platform project**: `hubspot-bigquery` en el portal (HubSpot Developer Platform 2025.2)
- **Manifest snapshot**: [`docs/operations/hubspot-app-manifest/app-hsmeta.json`](hubspot-app-manifest/app-hsmeta.json)
- **URL admin app**: https://app.hubspot.com/developer-apps/33235280/auth

#### Consumidores

| Service | Tipo | Uso |
|---|---|---|
| `hubspot-greenhouse-integration` (Cloud Run, us-central1) | Middleware HTTP | Bridge operativo GH↔HS: POST/PATCH /products, /contacts, /companies, /deals, /quotes, /line_items + webhooks inbound |

#### Propósito funcional

Todo el loop de Greenhouse Portal ↔ HubSpot corre a través de este app. Cualquier write desde Greenhouse (productos, quotes, deals) + reads del catálogo + drift detection pasan por aquí.

#### Pattern de consumo

```
Greenhouse Portal (Vercel)
    ↓ [GREENHOUSE_INTEGRATION_API_TOKEN — shared secret]
Cloud Run hubspot-greenhouse-integration
    ↓ [HUBSPOT_ACCESS_TOKEN ← Secret Manager: hubspot-access-token:latest]
HubSpot API (portal 48713323)
```

---

### App 2 — HubSpot → BigQuery sync (sin nombre descubierto)

- **Estado**: Activa, no afectada por rotación del 2026-04-24
- **Token (prefix)**: `pat-na1-06b57bfb-...`
- **Storage**: ⚠️ **Hardcoded en `HUBSPOT_ACCESS_TOKEN` env var** del Cloud Function. NO está en Secret Manager.
- **Developer Platform project**: no identificado (posiblemente creado vía Private Apps UI legacy, no via projects)

#### Consumidores

| Service | Tipo | Uso |
|---|---|---|
| `hubspot-bq-sync` (Cloud Function gen2, us-central1) | Scheduled ETL | Ingesta diaria HubSpot → BigQuery (scheduler `hubspot-bq-daily-sync`, `30 3 * * *` = 03:30 UTC ≈ 00:30 Santiago) |

#### Propósito funcional

Dump diario de tablas HubSpot (contacts, companies, deals, products, quotes, etc.) al dataset `greenhouse` de BigQuery (`efeonce-group`). Es el pipeline que alimenta los dashboards de BI y los agregados de ICO, drift detection histórico, reportes ejecutivos.

#### Scheduler

```
hubspot-bq-daily-sync (Cloud Scheduler, us-central1)
  schedule: 30 3 * * * (UTC)
  target: hubspot-bq-sync Cloud Function HTTP trigger
```

---

### App 3 — HubSpot ↔ Notion bridge

- **Estado**: Activa, no afectada por rotación del 2026-04-24
- **Token (prefix)**: `pat-na1-8edb312a-...`
- **Storage**: ⚠️ Hardcoded en `HUBSPOT_ACCESS_TOKEN` env var de los functions. NO está en Secret Manager.

#### Consumidores

| Service | Tipo | Uso |
|---|---|---|
| `hubspot-notion-deal-sync` (Cloud Function gen2, us-central1) | Scheduled poller | Sync deals HS → Notion cada 15 min (scheduler `hubspot-notion-deal-poll`) |
| `notion-hubspot-reverse-sync` (Cloud Function gen2, us-central1) | Scheduled poller | Sync reverso Notion → HS cada 15 min (scheduler `notion-hubspot-reverse-poll`) |

#### Propósito funcional

Mantiene en sincro deals de HubSpot ↔ páginas de Notion (licitaciones, propuestas operativas). El par de functions comparte el mismo token por simplicidad — ambos tocan el mismo app HubSpot.

---

## Portal staging 51183921

Token (prefix) `pat-na1-61977957-...` — usado por:
- `hubspot-notion-deal-sync-staging` (scheduler PAUSED)
- `notion-hubspot-reverse-sync-staging` (scheduler PAUSED)

Hardcoded env var. Actualmente PAUSED en Cloud Scheduler.

---

## Resumen matricial

| Service | Cloud Run/Func | Region | Portal | App | Token via |
|---|---|---|---|---|---|
| `hubspot-greenhouse-integration` | Cloud Run | us-central1 | 48713323 | `efeonce-data-platform` (33235280) | **Secret Manager** `hubspot-access-token:latest` ✅ |
| `hubspot-bq-sync` | Cloud Function | us-central1 | 48713323 | App #2 (BQ sync) | ⚠️ Hardcoded env var |
| `hubspot-notion-deal-sync` | Cloud Function | us-central1 | 48713323 | App #3 (Notion bridge) | ⚠️ Hardcoded env var |
| `notion-hubspot-reverse-sync` | Cloud Function | us-central1 | 48713323 | App #3 (Notion bridge) | ⚠️ Hardcoded env var |
| `hubspot-notion-deal-sync-staging` | Cloud Function | us-central1 | 51183921 (stg) | App staging #1 | ⚠️ Hardcoded env var |
| `notion-hubspot-reverse-sync-staging` | Cloud Function | us-central1 | 51183921 (stg) | App staging #2 | ⚠️ Hardcoded env var |

## Procedimiento de rotación segura (por app)

Cuando rotes el token de una app HubSpot:

### Paso 1 — Identificar qué app rotaste

HubSpot UI → Settings → Integrations → Private Apps → seleccionar app → **Auth** → botón "Rotate access token".

Anotar:
- Nombre del app + ID
- Prefix del token nuevo (primeros 15-20 caracteres, no el token completo en docs)

### Paso 2 — Ubicar consumidores en esta tabla

Buscar en la tabla del resumen matricial todas las filas que usan ese app. Son los services que hay que actualizar.

### Paso 3 — Actualizar el secret / env var

**Si está en Secret Manager** (caso ideal):
```bash
printf '%s' "<nuevo-token>" | gcloud secrets versions add hubspot-access-token \
  --data-file=- --project=efeonce-group
```

**Si está hardcoded en env var** (caso de apps 2, 3, staging — deuda técnica):
```bash
gcloud functions deploy <function-name> --gen2 \
  --update-env-vars=HUBSPOT_ACCESS_TOKEN=<nuevo-token> \
  --project=efeonce-group --region=us-central1
```

### Paso 4 — Forzar nueva revisión del runtime

**Para Cloud Run** (misma image, refresh de secrets):
```bash
gcloud run services update <service> --region=<region> \
  --project=efeonce-group \
  --update-labels=hs-token-rotated=YYYYMMDD
```

**Para Cloud Functions gen2**: el `--update-env-vars` del Paso 3 ya crea nueva revisión automáticamente.

### Paso 5 — Smoke test post-rotación

```bash
# Cloud Run
curl -sS -o /dev/null -w "health %{http_code}\n" "https://<service-url>/health"

# Cloud Function
gcloud functions call <function-name> --gen2 --project=efeonce-group --region=<region>
```

### Paso 6 — Actualizar este doc

Actualizar la columna "Token (prefix)" en la tabla del resumen con los primeros 15 chars del nuevo token + fecha de rotación en "Última revisión" al inicio del documento.

## Follow-ups pendientes (deuda técnica)

1. **Migrar los 5 Cloud Functions a Secret Manager**. Hardcodear tokens en env vars expone credenciales en logs de `gcloud functions describe`, Cloud Build logs, y versioning de Cloud Functions. Private Apps debería tener su propio secret en Secret Manager y usarse via `--set-secrets=HUBSPOT_ACCESS_TOKEN=hubspot-bq-sync-token:latest` (y similar para apps 3, staging).

2. **Renombrar apps para claridad**. Los tokens `06b57bfb` y `8edb312a` no tienen nombre descriptivo en este doc porque no pude identificarlos desde el config. Ir al portal HubSpot → Settings → Private Apps y listarlos; actualizar este doc con los nombres reales.

3. **Unificar convención**: considerar si tiene sentido colapsar apps 2 y 3 en una sola app del portal para reducir surface de tokens. Depende de si los scopes se pueden combinar.

## Referencias

- [Cloud Run service `hubspot-greenhouse-integration`](https://console.cloud.google.com/run/detail/us-central1/hubspot-greenhouse-integration/revisions?project=efeonce-group)
- [Secret Manager `hubspot-access-token`](https://console.cloud.google.com/security/secret-manager/secret/hubspot-access-token/versions?project=efeonce-group)
- [HubSpot Developer App 33235280 auth panel](https://app.hubspot.com/developer-apps/33235280/auth)
- [HubSpot app manifest snapshot](hubspot-app-manifest/app-hsmeta.json)
- [HubSpot product catalog sync runbook](product-catalog-sync-runbook.md)
