# Operar la visibilidad por URL, subdominio y subcarpeta (TASK-1776)

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.2
> **Creado:** 2026-08-27 por Claude (TASK-1776)
> **Ultima actualizacion:** 2026-09-03 por Claude (TASK-1805: `etvMethodology`, readback del selector de fórmula y qué no tocar)
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

> **Metodología ETV (actualizado 2026-09-03, TASK-1805):** DataForSEO confirmó Improved ETV y el corte global
> `2026-11-01T00:00:00Z`; desde ese instante `false` se ignora y no existe fallback legacy. Desde el
> 2026-09-03 cada snapshot persiste y sirve la fórmula con que se compró (`etvMethodology`) —la clave de
> unicidad ya distingue fórmula— y el reader sirve una sola fórmula por lectura; hoy todo va en
> `legacy_static_v1`. No agregues `use_improved_etv` a mano a una primitive ni al cron: la fórmula la fija la
> policy (`buildEtvMethodologyRequest`) desde `GROWTH_SEO_ETV_METHODOLOGY_VERSION`, y el cambio a improved lo
> decide `TASK-1806`. `relevant_pages`/`subdomains` ordenan provider-side por ETV, así que entre fórmulas
> puede cambiar incluso la membresía del top-N: un salto entre versiones distintas no es performance.
> Antecedente: [auditoría Improved ETV](../../audits/seo/2026-09-01-dataforseo-improved-etv-impact.md) ·
> runbook: [Evaluar la transición a DataForSEO Improved ETV](evaluar-transicion-dataforseo-improved-etv.md).

## Antes de empezar

- Módulo SEO activo + org con `seo_v2` vigente. Sujetos del cron: dominio del target + competidores.
- **Rollout vigente (2026-08-27, smoke live autorizado):** flag
  `GROWTH_SEO_URL_VISIBILITY_ENABLED=true` en el ops-worker (deploy.sh + revisión activa
  verificada) y scheduler `ops-seo-url-visibility` **ACTIVO** (`ENABLED`, día 17 de cada mes
  09:00). El ciclo mensual corre solo.
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
que las URLs del detalle queden bajo esa ruta; (f) que la fila trae `etv_methodology_version =
legacy_static_v1` y `etv_methodology_evidence = explicit_request` (la frescura también se evalúa por
fórmula).

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

### Qué significa `etvMethodology`

Cada snapshot (fila, `readUrlVisibility`, `readVisibilityConcentration`, lane y tool MCP) trae
`etvMethodology`, con el mismo contrato que la foto de dominio:

| Campo | Significado |
|---|---|
| `version` | Fórmula del proveedor con que se compró el ETV: `legacy_static_v1` (hoy, todas) o `improved_layout_clickstream_v2` (sólo cuando `TASK-1806` lo decida) |
| `evidence` | `explicit_request` = la corrida pidió la fórmula de forma explícita (toda captura desde el 2026-09-03); `contract_default_pre_cutoff` = fila previa, atribuida a legacy porque era lo único que el proveedor aplicaba antes del corte |
| `availableMethodologies` | Qué fórmulas existen para ese sujeto en la ventana pedida |
| `comparability` | `single_methodology` = la lectura es de una sola fórmula; `not_available_for_method` = no hay filas en la fórmula pedida. El reader responde `{ ok: false, reason: 'not_available_for_method', requestedMethodology, availableMethodologies }` y el lane lo transporta como `errorCode` — un estado, nunca ceros ni una serie a medias |
| `policyVersion` / `providerCutoffAt` | `etv-policy.v1` y `2026-11-01T00:00:00.000Z` |

La concentración por URL/subdominio también se sirve en **una sola fórmula**: un ranking que mezclara
páginas compradas en legacy con páginas compradas en improved ordenaría por dos escalas distintas.

### Readback del selector de fórmula

1. `GET $OPS_WORKER_URL/health` → `etvMethodology.configuredWriteSource` debe ser `env` (`default` = la env
   var no está en la revisión activa y el worker cayó al legacy implícito) y `valid: true`; el bloque expone
   además `configuredWriteMethod`, `configuredReadMethod`, `policyVersion`, `providerCutoffAt` y `afterCutoff`.
2. Señal `seo.etv_methodology.drift` en `/admin/operations` (módulo Growth; steady = 0): `awaiting_data` =
   sin ninguna captura con evidencia explícita todavía (esperado hasta el primer cron posterior al
   2026-09-03, día 17 para esta captura) · `ok` = lo configurado coincide con lo solicitado · `warning` =
   evidencia contractual reciente junto a explícita · `error` = drift configurado↔solicitado, legacy
   configurado después del corte o configuración inválida (revisar la revisión activa del worker, no el
   `deploy.sh`).

Cómo evaluar el paso a improved: runbook
[Evaluar la transición a DataForSEO Improved ETV](evaluar-transicion-dataforseo-improved-etv.md).

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
- **NO** cambiar `GROWTH_SEO_ETV_METHODOLOGY_VERSION` ni `GROWTH_SEO_ETV_READ_METHODOLOGY_VERSION` a mano
  fuera de `TASK-1806`: la fórmula es identidad del hecho; un runtime distinto del otro produce drift, y
  legacy después del corte se rechaza en la captura y en la base.
- **NO** comparar, restar ni graficar juntas cifras (ni rankings de concentración) con
  `etvMethodology.version` distinta.
- **NO** pasar `use_improved_etv` a mano en una primitive: sólo `buildEtvMethodologyRequest` lo construye.

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
- Migración: `migrations/20260827194219636_task-1776-seo-url-visibility.sql` (+ `20260902221432772_task-1805-etv-methodology-expand.sql`)
- Metodología ETV: `src/lib/growth/seo/etv-methodology/` + ADR `docs/architecture/GREENHOUSE_DATAFORSEO_ETV_METHOD_VERSIONING_DECISION_V1.md` + señal `src/lib/reliability/queries/seo-etv-methodology-drift.ts`
- Spec: `docs/tasks/TASK_ID_REGISTRY.md → TASK-1776 (spec en la carpeta de su lifecycle vigente)`
- Proveedor: `.claude/skills/dataforseo-operator/references/02-labs.md` §2/§4/§5/§7
