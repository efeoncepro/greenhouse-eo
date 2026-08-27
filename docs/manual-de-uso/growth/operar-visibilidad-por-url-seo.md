# Operar la visibilidad por URL, subdominio y subcarpeta (TASK-1776)

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-08-27 por Claude (TASK-1776)
> **Ultima actualizacion:** 2026-08-27 por Claude
> **Documentacion tecnica:** [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) §4.2 y §15

## Para qué sirve

Responde lo que se decide a nivel de página: **"¿por qué keywords entra tráfico a esta URL?"**,
**"¿qué páginas del competidor concentran su tráfico?"** y **"¿cuál de sus subdominios pesa?"** —
sobre cualquier dominio, propio o ajeno. Es la tríada que Semrush vende como `url_research` /
`subdomain_research` / `subfolder_research`, resuelta acá como **una** capacidad: la clase de
sujeto se declara (`domain` / `subdomain` / `subfolder` / `url`) y el resolver decide cómo
preguntarle al proveedor.

Toda cifra es **◑ estimada** (DataForSEO Labs, ciclo mensual). La posición de acá es la posición
exacta en una SERP concreta; la de Search Console es un promedio ponderado por impresiones —
**jamás se promedian ni se mezclan**.

## Antes de empezar

- Módulo SEO activo + org con `seo_v2` vigente. Sujetos del cron: dominio del target + competidores.
- **Rollout al crearse esta capacidad:** flag `GROWTH_SEO_URL_VISIBILITY_ENABLED` en `false` y
  scheduler `ops-seo-url-visibility` **pausado** (dos frenos).
- **La clase del sujeto se DECLARA, nunca se infiere**: `ejemplo.cl/blog` puede ser subcarpeta o
  URL exacta y sólo quien pide la corrida sabe cuál quiso.

## Costo y la palanca `limit`

Cada corrida por sujeto cuesta USD 0.012 (setup) + USD 0.00012 **por fila devuelta**. El knob
`GROWTH_SEO_URL_VISIBILITY_ROW_LIMIT` (default 100 → ~USD 0.024/sujeto) acota el **detalle**
comprado; la **foto** (keywords totales, distribución, ETV) viene del agregado del proveedor y
cubre el set completo igual. Subir el limit es una decisión de gasto explícita, no una preferencia.

Bono estructural: cada fila trae el `keyword_info` completo **ya pagado**, y el colector lo escribe
en `seo_keyword_market_data` (writer compartido, costo 0) — una corrida sobre las URLs de un
cliente deja fresco mercado que otro cliente habría tenido que comprar.

## Paso a paso

### 1. Dry-run del batch mensual (no gasta)

```bash
curl -s -X POST "$OPS_WORKER_URL/seo/url-visibility/capture-batch" \
  -H "Authorization: Bearer $CRON_SECRET" -H 'Content-Type: application/json' \
  -d '{"dryRun": true}'
```

### 2. Corrida real acotada (gasta; exige flag ON)

```bash
curl -s -X POST "$OPS_WORKER_URL/seo/url-visibility/capture-batch" \
  -H "Authorization: Bearer $CRON_SECRET" -H 'Content-Type: application/json' \
  -d '{"maxTargets": 1}'
```

Verificar: (a) `costUsd` vs estimado; (b) filas en `seo_url_visibility_snapshots`; (c) el
`keyword_info` inline en `seo_keyword_market_data` **sin duplicados y sin subir el cost**;
(d) re-disparo del mismo target = USD 0 con outcome `fresh`; (e) para un sujeto `subfolder`,
que las URLs del detalle queden bajo esa ruta.

### 3. Leer el resultado

- Reader canónico: `readUrlVisibility` / `readVisibilityConcentration` (`src/lib/growth/seo/url-visibility/reader.ts`).
- Lane ecosystem: `GET /api/platform/ecosystem/growth/seo/url-visibility` con
  `?subject=&kind=domain|subdomain|subfolder|url[&months=][&keepQuery=true]` (default: dominio del
  target) o `?concentration=url|subdomain[&domain=]` para el drill-down por ETV.
- Tool MCP: `get_seo_url_visibility` (lectura, scope `efeonce.mcp.read`).

### 4. Colectores on-demand (no van en el cron)

`captureRelevantPages` / `captureSubdomains` (primitives server-side) responden "qué concentra el
tráfico de este host" y persisten cada página/subdominio como fila propia. Corren bajo demanda
porque correrlos siempre añadiría costo fijo a cada ciclo.

## Encendido (rollout) y apagado

Igual que la foto de dominio (TASK-1775), multi-runtime con el flag **sólo en el ops-worker**:

1. `GROWTH_SEO_URL_VISIBILITY_ENABLED=true` en `services/ops-worker/deploy.sh` (SoT).
2. `gcloud run services update ops-worker --region us-east4 --update-env-vars GROWTH_SEO_URL_VISIBILITY_ENABLED=true` y verificar en la **revisión activa**.
3. Smoke del paso 2 (incluidos los cuatro `subject_kind` y el check de subcarpeta).
4. `gcloud scheduler jobs resume ops-seo-url-visibility --location us-east4` (cron día 17 09:00 CLT).
5. Actualizar la fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.

**Rollback (<5 min):** flag a `false` + pausar el scheduler; las filas append-only quedan.

## Qué significan los estados

| Outcome | Significado |
|---|---|
| `captured` | Se compró la foto del sujeto en este ciclo (y su detalle top-N) |
| `fresh` | Snapshot `ranked_keywords` vigente (< 30 días): costo cero |
| `no_market_data` | El proveedor no conoce el sujeto; fila con NULLs (no se re-compra el ciclo) |
| `invalid_subject` | La forma del sujeto no calza con la clase declarada (p. ej. `domain` con path) |
| `budget_blocked` | Gate de entitlement/presupuesto |
| `provider_error` | El proveedor falló; NO se escribió fila |

## Señal de confiabilidad

`seo.url_visibility.stale_subjects` (módulo Growth; steady = 0): **ok "sin rollout"** pre-encendido ·
**warning** con sujetos sin captura en 2 ciclos · **error** cuando TODOS quedaron stale habiendo
historia (típico: un deploy con `--set-env-vars` borró el flag — revisar la revisión activa).

## Qué no hacer

- **NO** inferir la clase del sujeto ni "corregirla" en silencio: se declara.
- **NO** pasar una URL sin esquema como target directo al proveedor (devuelve el dominio entero y
  lo cobra) — el resolver ya lo maneja; no lo puentees.
- **NO** subir el `limit` "por si acaso": cada fila devuelta se paga.
- **NO** escribir el `keyword_info` inline con un INSERT propio: SIEMPRE `persistKeywordMarketData`.
- **NO** promediar posiciones ◑ con posiciones ● de GSC, ni derivar barrera de enlaces desde
  `keyword_difficulty` (usar `deriveLinkBarrier`).
- **NO** exponer `captured_by_organization_id` en ninguna superficie.

## Problemas comunes

- **`invalid_subject` en un dominio** → viene con path o query: o era `subfolder`/`url`, o hay que
  limpiar el input. El error es deliberado.
- **Un `subfolder` devuelve URLs fuera de la ruta** → el filtro `relative_url` no viajó; revisar
  que el sujeto pasó por el resolver (jamás armar el task a mano).
- **El batch devuelve `disabled`** → falta el flag propio o `GROWTH_SEO_ENABLED` en la revisión
  activa del ops-worker.
- **Mercado sin filas nuevas tras una corrida** → las keywords ya estaban frescas (< 30 días):
  comportamiento correcto del top-up.

## Referencias técnicas

- Primitives: `src/lib/growth/seo/url-visibility/{resolve-subject,persist,capture,relevant-pages,reader}.ts`
- Worker: `services/ops-worker/server.ts` (`/seo/url-visibility/capture-batch`) + `deploy.sh` (`ops-seo-url-visibility`)
- Migración: `migrations/20260827194219636_task-1776-seo-url-visibility.sql`
- Spec: `docs/tasks/TASK_ID_REGISTRY.md → TASK-1776 (spec en la carpeta de su lifecycle vigente)`
- Proveedor: `.claude/skills/dataforseo-operator/references/02-labs.md` §2/§4/§5/§7
