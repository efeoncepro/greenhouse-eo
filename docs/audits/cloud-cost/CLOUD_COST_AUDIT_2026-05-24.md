# Cloud Cost Audit — GitHub Actions + GCP + Vercel (2026-05-24)

> **Tipo:** Auditoría técnica/operativa reutilizable
> **Fecha:** 2026-05-24 · **Autor:** Claude Opus 4.7 (sesión release + diagnóstico de costos)
> **Alcance:** GitHub Actions, GCP (`efeonce-group`), Vercel (`efeonce-7670142f`)
> **Método:** datos reales de billing — GCP billing export en BigQuery, Vercel `/v1/billing/charges`, GitHub Billing (vía TASK-637). **NO estimaciones de intuición.**

---

## ⚠️ Gotcha crítico de lectura: el billing GCP está en CLP, no USD

El billing export de GCP (`efeonce-group.billing_export.gcp_billing_export_v1_013340_4C7071_668441`) tiene la columna `cost` en **CLP** (`currency='CLP'`, `currency_conversion_rate≈897.86`). Para USD: `cost / 897.86`. Sin esto, Cloud SQL "58.537" parece $58k cuando son **~USD 65**. Toda cifra USD de este doc ya viene convertida.

```sql
SELECT service.description, ROUND(SUM(cost)/897.86,2) AS usd_30d
FROM `efeonce-group.billing_export.gcp_billing_export_v1_013340_4C7071_668441`
WHERE usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY 1 ORDER BY 2 DESC;
```

---

## 1. Foto total (USD/mes, últimos 30 días)

| Plataforma | USD/mes | ¿Driver? |
|---|---|---|
| **GCP** | **~$132** | Sí — el más caro |
| **GitHub Actions** | **~$93** | Sí — frecuencia de runs |
| **Vercel** | **~$24 billed** | **No — el más barato** |
| **Total** | **~$249/mes** | |

**Vercel NO es el problema** (~$24 billed; $39 effective). Su único costo variable son los **build minutes** (17.489 min CPU) → mismo driver que Actions: frecuencia de pushes. El grueso está en **GCP** y **GitHub Actions**.

---

## 2. GCP (~$132/mes) — desglose por SKU

| Servicio | USD/mes | Detalle |
|---|---|---|
| Cloud SQL | ~$57 | `db-custom-1-3840` (1 vCPU, 3.84GB) 24/7 + 2da instancia "Micro" $7.5 + storage. **Floor, no sobredimensionada.** |
| Gemini Code Assist (Duet AI) | ~$22 | **Suscripción de seat IDE** — NO alimenta nexa (ver §4). |
| Artifact Registry | ~$13 | `gcr.io` = **185GB** de imágenes worker viejas (ver §3). |
| Secret Manager | ~$12.5 | Storage de versiones — 70% son tokens Frame.io muertos (ver §5). |
| Vertex AI | ~$8.8 | Gemini predictions (reliability AI observer, finops-ai, nexa, hero-ai). |
| Cloud Scheduler | ~$3.9 | ~38 jobs cron. |
| BigQuery / Storage / otros | ~$5 | Menores. |

---

## 3. Artifact Registry — `gcr.io` 185GB de imágenes worker

**Hallazgo:** `gcr.io/efeonce-group/*` acumuló **635 versiones** (273 ops-worker + 207 commercial-cost-worker + 105 ico-batch-worker + 49 hubspot-integration + 1 ci-fix) en **~49 días** (≈13 builds/día por velocidad de deploys). gcr.io está **activo** (los 4 workers Cloud Run pullean de ahí).

**Oportunidad (~$9-13/mo):** cleanup policy recurrente `keep-15 + >14d`. Borra ~440 versiones (~128GB), deja ~57GB. Preserva estructuralmente: imagen live de cada worker (keep-15 → la sirviendo es la más nueva) + 14 días completos de rollback.

**Estado:** policy seteada en **dry-run** (no borra) 2026-05-24. Script de verificación read-only `scripts/cloud/verify-artifact-cleanup-dryrun.sh` (hard gate: imagen live no cae en el borrado — verificado 0 colisiones). Flip a enforced gateado por 2da señal (GCP dry-run log). **Tracking: TASK-932.**

Procedimiento canónico GCP: dry-run → revisar logs → enforce.

---

## 4. Gemini Code Assist vs nexa — son DOS productos distintos

**Verificado en código** (`src/lib/ai/google-genai.ts`): el runtime AI (nexa insights, reliability observer, finops-ai, hero-ai) usa `@google/genai` con **`vertexai: true`** → factura como **Vertex AI predictions (~$8.8/mo)**, autenticado por el proyecto GCP (WIF/ADC).

El **"Gemini Code Assist monthly subscription" (~$22/mo)** es el **asistente de código en el IDE** (autocomplete/chat al programar). **NO lo usa nexa ni ningún flujo de runtime.**

**Oportunidad (~$22/mo):** cancelar el seat si nadie del equipo programa con Gemini en el IDE (el equipo codea con Claude Code).

**Resolución (2026-05-24):**
- El seat es de `julio.reyes@efeonce.org` (auto-asignado vía `EntitlementService.SelfAssignLicense` el 2026-03-24). **0 actividad del API en 30 días** → ocioso. Owner confirmó que no lo usa.
- ✅ **Removido el rol IAM `roles/cloudaicompanion.user`** de julio.reyes (reversible). En el modelo self-serve ese rol es el grant de licencia → probablemente corta el seat. `geminidataanalytics` (Gemini BigQuery) intacto.
- ❌ **API disable DESCARTADO**: `gcloud services disable cloudaicompanion.googleapis.com` aborta (sin `--force`) porque `geminicloudassist.googleapis.com` (asistente Gemini de la consola GCP) depende de él. Forzarlo arrastraría Cloud Assist — blast radius demasiado grande. NO forzar.
- ⏳ **Verificación pendiente (1-2 días):** el SKU se cobra diario-prorrateado (~$0.735/día); confirmar que cae a ~$0. Si NO cae → fallback: soltar la licencia en consola (`console.cloud.google.com/gemini/code-assist` → Subscription → cancel) o desde el plugin Gemini del IDE.
- **Crítico verificado:** Nexa Insights + reliability AI + finops-ai + hero-ai usan `aiplatform.googleapis.com` (Vertex AI), NO cloudaicompanion. 0 referencias a `cloudaicompanion` en el código del runtime. El cambio no toca producción.

---

## 5. Secret Manager — 152 versiones de tokens Frame.io muertos

**Hallazgo:** 216 versiones totales en 46 secrets, **todas enabled, ninguna destruida**. El **70% son dos secrets**:

| Secret | Versiones | Ventana | Estado |
|---|---|---|---|
| `frameio-access-token` | 76 | 2026-03-07 → 03-24 | **dormido hace ~2 meses** |
| `frameio-refresh-token` | 76 | 2026-03-07 → 03-24 | **dormido hace ~2 meses** |
| (44 secrets restantes) | 64 | — | sanos (1-5 versiones c/u) |

**Causa raíz:** el flujo OAuth de Frame.io (V4, rotating refresh tokens) agregaba una versión nueva en **cada refresh** sin destruir la vieja. El flujo **NO vive en greenhouse-eo** (el `grep` en `src/lib`/`services` es vacío; las refs Frame.io son el pipeline analytics TASK-020/035 aún en `to-do`). El refresh corre externo (sibling repo / Cloud Function) y **dejó de correr el 2026-03-24** → 152 versiones de tokens OAuth ya expirados, peso muerto puro.

**Oportunidad (~$8/mo):** destruir las versiones viejas dejando las últimas 2 → de 216 a ~66 versiones (−70%) → bill de ~$12.5 a ~$4. **Solución robusta sin perder Frame.io: ver §8.**

**Importante (irreversibilidad):** a diferencia de imágenes Docker (reproducibles desde git), una versión de secret destruida es **irrecuperable**. Por eso el procedimiento es disable-first (reversible) → grace → destroy.

---

## 6. GitHub Actions (~$93/mes) — frecuencia

Drivers (mayo): `CI` (5.157 min / 339 runs) + `Playwright` (933 min / 287 runs) ≈ ~11 pushes a develop/día × ~25 min Actions c/u. Desperdicio: runs obsoletos, re-push por rojo, docs mezclados con código.

**Estado:** **TASK-931 (shipped 2026-05-24)** — reporte por workflow/job, contrato de lanes fast/full/smoke/release/scheduled, split CI, path-aware Playwright, thresholds. Lever de comportamiento complementario: **batch local + verify antes de pushear** (ver §7).

---

## 7. Recomendación de workflow (lever de comportamiento, gratis)

- **Develop local + verify + batch push a develop** → colapsa N pushes en 1.
- **Nunca push directo a main** (salvo merge de release) — es el path más caro (Vercel prod + orchestrator + 4 Cloud Run + Azure).
- Verify proporcional al riesgo: docs → commit separado (skipea CI); refactor chico → pre-push hook (lint+tsc, gratis); recurso compartido/server-only → `pnpm test && build` antes de pushear.
- Nunca `--no-verify`.

---

## 8. Inventario de oportunidades + estado

| # | Oportunidad | USD/mes | Tipo | Estado |
|---|---|---|---|---|
| 1 | Cancelar Gemini Code Assist seat (ocioso, de julio.reyes) | ~$22 | Instant | ✅ IAM removido 2026-05-24; API disable descartado (cascada a geminicloudassist); ⏳ verificar billing cae 1-2d |
| 2 | Artifact Registry cleanup recurrente | ~$9-13 | Instant + recurrente | 🔄 dry-run activo, TASK-932 |
| 3 | Secret Manager — limpiar tokens Frame.io muertos | ~$8 | Instant + fix root-cause | 🆕 ver §5 + §9 |
| 4 | Cloud SQL — committed use discount 1 año | ~$15 | Estructural | decisión (compromiso) |
| 5 | Vertex AI — trim de prompts | ~$2-4 | Estructural | TASK-928 empezó |
| 6 | GitHub Actions — batch + lanes | variable | Comportamiento | TASK-931 shipped |

**Trío instant (1+2+3) ≈ $42/mo casi gratis (−32% de GCP).** + Cloud SQL CUD ~$15 si se compromete.

---

## 9. Solución robusta Secret Manager (sin perder Frame.io)

Ver sección dedicada al final del audit (§ Solución Secret Manager) y/o la TASK derivada.

**Principio de seguridad:** los consumers de Secret Manager leen `latest` (o versión pineada); destruir versiones VIEJAS nunca afecta `latest`. En OAuth solo el token más reciente es válido (los viejos expiran/rotan). Por lo tanto keep-last-2 + destruir el resto **no puede perder Frame.io**.

**Secuencia robusta (irreversibilidad):**
1. **Disable** versiones 1-74 de cada secret frameio (reversible) — mantener 75-76 enabled.
2. Grace period — confirmar que nada se rompe (Frame.io dormido → nada que romper).
3. **Destroy** las disabled (irreversible — recién acá se libera el storage; disabled todavía factura).

**Prevención escalable (root cause):** cuando el pipeline Frame.io se productivice (TASK-020), el flujo de refresh **debe destruir versiones viejas on-rotate** (keep-N). Y el helper canónico de rotación de Greenhouse (`secrets:rotate`) debe hacer destroy-on-rotate de superseded — generaliza a cualquier secret, no solo frameio. **NO** construir un cron destructor recurrente para un flujo dormido (over-engineering + riesgo de destrucción irreversible automática); el fix vive en el productor cuando exista.

---

## Apéndice — comandos de verificación reproducibles

```bash
# GCP por servicio (USD)
bq query --use_legacy_sql=false 'SELECT service.description, ROUND(SUM(cost)/897.86,2) usd_30d FROM `efeonce-group.billing_export.gcp_billing_export_v1_013340_4C7071_668441` WHERE usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY) GROUP BY 1 ORDER BY 2 DESC'

# Artifact Registry cleanup (read-only)
bash scripts/cloud/verify-artifact-cleanup-dryrun.sh

# Secret Manager versiones por secret
for s in $(gcloud secrets list --project=efeonce-group --format='value(name)'); do
  echo "$s: $(gcloud secrets versions list "$s" --project=efeonce-group --filter='state:ENABLED' --format='value(name)' | wc -l)"
done

# Vercel billing (NDJSON, USD)
TOK=$(gcloud secrets versions access latest --secret=greenhouse-vercel-api-token --project=efeonce-group)
curl -s "https://api.vercel.com/v1/billing/charges?teamId=team_gmNiF4YCHmc1wqsHUTCvqjmN&from=$(date -v-30d +%F)&to=$(date +%F)" -H "Authorization: Bearer $TOK"
```
