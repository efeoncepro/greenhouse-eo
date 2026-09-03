# Preregistro del shadow legacy/improved ETV — TASK-1806 Slice 0

- Fecha: 2026-09-03 (UTC)
- Task: `TASK-1806` · Epic: `EPIC-022` · ADR: `GREENHOUSE_DATAFORSEO_ETV_METHOD_VERSIONING_DECISION_V1.md`
- Tipo: artefacto de preregistro (cohorte, inputs, métricas, umbrales, caps y forecast) + readback de readiness
- Estado: **congelado a la espera de aprobación**. Este documento NO autoriza gasto, flags, deploy ni cutover.
- Gasto ejecutado por este artefacto: **USD 0** (plan puro, `providerCalls: 0`; ledger intacto)

## 1. Qué es y qué no es

Este preregistro fija, ANTES de observar ningún resultado del proveedor, qué se compara, con qué inputs, con qué
métricas y contra qué umbrales. Es la unidad que el operador aprueba para habilitar el Slice 1 (shadow bounded).
Después de la aprobación, cambiar cohorte, umbrales o caps exige una versión nueva de este documento; los
resultados nunca reescriben el preregistro.

No es un A/B mientras el proveedor no devuelva ambas fórmulas para la misma celda en la misma ventana. El modo
declarado es `exact_ab`: dos requests normales por celda, inputs idénticos salvo `use_improved_etv`, en la misma
ventana horaria. Si una celda no puede obtenerse en ambas fórmulas, se clasifica `temporal_canary` y se excluye del
cálculo de calibración.

## 2. Readback de readiness (Slice 0) — verificado 2026-09-03 ~02:12Z

| Check | Resultado | Evidencia |
|---|---|---|
| `TASK-1805` completa | ✅ | `docs/tasks/complete/TASK-1805-*.md`, release `5ec4cf769977` |
| ops-worker: selector explícito | ✅ | rev `ops-worker-00635-tbt`, env `GROWTH_SEO_ETV_METHODOLOGY_VERSION=legacy_static_v1` + `_READ_` |
| ops-worker `/health.etvMethodology` | ✅ | `configuredWriteMethod=legacy_static_v1`, `configuredWriteSource=env`, `configuredReadMethod=legacy_static_v1`, `policyVersion=etv-policy.v1`, `afterCutoff=false`, `valid=true` |
| Lanes de producción (Berel MX) | ✅ | `domain-overview` y `url-visibility` sirven `etvMethodology.version=legacy_static_v1`, `evidence=contract_default_pre_cutoff`, `comparability=single_methodology`, `breakpointDate=null` |
| Evaluador dry-run | ✅ 8/8 | `_sanity-task-1805-etv-evaluator.ts`: `providerCalls=0`, `wouldExecute=false` con gate OFF, ledger antes=después (USD 1,65276 del día, ajeno) |
| Schema formula-aware | ✅ 15/17 | `_sanity-task-1805-etv-schema.ts` en transacción con rollback: coexistencia sólo DESPUÉS del contract; los 2 ❌ son un conteo duro desactualizado del script (filas `*.invalid` con `explicit_request` escritas por sanities de 1775/1776 el 2026-09-02), corregido en este slice |
| Contract parqueado | ⏳ NO aplicado | UNIQUE legacy `seo_domain_overview_capture_unique` / `seo_url_visibility_capture_unique` y DEFAULT transitorios presentes |
| Condición de 7 días | ⏳ 5 / 8 / 2 | filas `contract_default_pre_cutoff` con `created_at > now()-7d` en domain/url/prospect; última fila contractual: 2026-08-29 11:04Z (domain y url), 2026-08-27 19:33Z (prospect) |
| Señal `seo.etv_methodology.drift` | `awaiting_data` | sin captura explícita del worker todavía (cron `ops-seo-domain-overview` día 16); no es drift |
| GSC first-party | ✅ | `sc-domain:berel.com` (org `org-32333527-…`) y `sc-domain:efeoncepro.com` (org `org-2df565fb-…`) `active` 2026-09-02 |
| Baseline legacy pre-corte | ✅ existe | domain overview: berel.com (2026-08-27), comex.com.mx (2026-08-29), efeoncepro.com (2026-08-27); url visibility: berel.com dominio + `/productos` + `/ubica-tienda` + `www.` (2026-08-27), comex.com.mx, efeoncepro.com |

**Fecha de aplicabilidad del contract.** La consulta literal del `.pending` (`created_at > now() - interval
'7 days'`) queda en 0/0/0 el **2026-09-05 11:05Z**. La condición documentada («7 días sin filas nuevas con evidencia
contractual desde el release del 2026-09-03») se cumple el **2026-09-10**. Se adopta la más estricta: aplicar el
contract **no antes del 2026-09-10** y sólo tras repetir el readback en 0/0/0. El cron del día 16 es la primera
prueba del camino del worker con evidencia explícita; si escribe `contract_default_pre_cutoff`, el contract se
revierte al estado «no aplicar» y se investiga el runtime.

## 3. Matriz endpoint (congelada)

Fuente: `src/lib/growth/seo/etv-methodology/families.ts` (14 familias) y respuesta contractual 2026-09-02.

| Familia | Clasificación | Camino consumidor | En el shadow | Comparable `exact_ab` |
|---|---|---|---|---|
| `domain_rank_overview` | `etv_consumed` | `domain-overview/capture.ts` | sí | sí |
| `ranked_keywords` (visibilidad) | `etv_consumed` | `url-visibility/capture.ts` | sí | sí (`limit` idéntico) |
| `ranked_keywords` (prospecto) | `etv_consumed` | `prospect/collect.ts` | sí | sí (`limit` 1000, orden idéntico) |
| `relevant_pages` | `etv_consumed` | `url-visibility/relevant-pages.ts` | sí | sí (membresía top-N es resultado de primera clase) |
| `subdomains` | `etv_consumed` | `url-visibility/relevant-pages.ts` | sí | sí |
| `historical_rank_overview` | `etv_consumed` | `domain-overview/history-backfill.ts` | sí | sí, en dos celdas por base histórica |
| `bulk_traffic_estimation` | `etv_consumed` | `domain-overview/traffic-estimation.ts` | sí | sí (mismos `targets`) |
| `competitors_domain`, `domain_intersection`, `historical_serps` | `etv_ignored` | guard conductual | no | n/a (la policy lanza si reciben el flag) |
| `serp_competitors`, `categories_for_domain`, `page_intersection`, `historical_bulk_traffic_estimation`, `domain_metrics_by_categories` | `provider_supported_not_enabled` | sin caller (TASK-1808…1811) | no | n/a |

`include_clickstream_data` permanece `false` en todas las celdas: el experimento improved no toca `clickstream_etv`.
AI Overview ETV, cuando aparezca en `ranked_keywords`, se interpreta como atribución modelada
(`modeled_uniform_share_among_cited_domains`) y no se suma al orgánico.

## 4. Cohorte (congelada)

| # | Sujeto | Mercado | Rol | GSC comparable |
|---|---|---|---|---|
| A | `berel.com` | MX / es (`2484`) | cliente propio, dominio grande (773 kw, ETV legacy ~135k) | `sc-domain:berel.com` |
| B | `comex.com.mx` | MX / es (`2484`) | competidor declarado de Berel, dominio muy grande (ETV legacy ~880k) | no (competidor) |
| C | `efeoncepro.com` | CL / es (`2152`) | dominio propio pequeño (5 kw, ETV legacy ~5) | `sc-domain:efeoncepro.com` |

No se agregan clientes, marcas ni mercados. Efeonce CL no admite calibración estadística (ETV de un dígito): su
celda mide el borde inferior (nulls, ceros, estabilidad), no exactitud.

### Celdas y forecast (`exact_ab`, dos requests por celda, precios Labs vigentes)

| Celda | Sujeto | Familia | Inputs congelados | USD por fórmula |
|---|---|---|---|---|
| 1 | berel.com | `domain_rank_overview` | location 2484, language es | 0,01212 |
| 2 | berel.com | `ranked_keywords` (visibilidad) | `limit` 100, `order_by` del writer productivo | 0,024 |
| 3 | berel.com | `relevant_pages` | `limit` 100, `order_by metrics.organic.etv DESC` | 0,024 |
| 4 | berel.com | `subdomains` | `limit` 100, mismo orden | 0,024 |
| 5a | berel.com | `historical_rank_overview` | 2026-04..2026-06 (`calibrated_approximation` para improved) | 0,1236 |
| 5b | berel.com | `historical_rank_overview` | 2026-07..2026-09 (`fully_recomputed`) | 0,1236 |
| 6 | comex.com.mx | `domain_rank_overview` | 2484 / es | 0,01212 |
| 7 | comex.com.mx | `ranked_keywords` (visibilidad) | `limit` 100 | 0,024 |
| 8 | comex.com.mx | `relevant_pages` | `limit` 100 | 0,024 |
| 9 | efeoncepro.com | `domain_rank_overview` | 2152 / es | 0,01212 |
| 10 | efeoncepro.com | `ranked_keywords` (visibilidad) | `limit` 100 | 0,024 |
| 11 | berel.com + comex.com.mx + efeoncepro.com | `bulk_traffic_estimation` | 3 `targets`, 2484 / es | 0,01236 |
| 12 | comex.com.mx | `ranked_keywords` (prospecto) | `limit` 1000, prospecto sintético sin PII | 0,132 |

Forecast del plan puro (`planEtvEvaluation`, 2026-09-03): **13 celdas → 26 requests → USD 1,14384** (cifra del
ejecutor `scripts/growth/dataforseo-etv-shadow.ts --dry-run` sobre la cohorte committeada
`scripts/growth/etv-shadow-cohorts/2026-09-03-preregistered.json`; una estimación previa a mano daba ≈1,02 sin la
segunda ventana histórica completa). Ningún request queda bloqueado antes del corte; con
`now ≥ 2026-11-01T00:00:00Z` la mitad legacy se bloquea `legacy_requested_after_cutoff` (verificado).

### Caps propuestos (fail-closed hasta que se configuren)

| Knob | Valor propuesto | Motivo |
|---|---|---|
| `GROWTH_SEO_ETV_EVALUATOR_ENABLED` | `true` sólo durante la ventana aprobada | gate único del evaluador |
| `GROWTH_SEO_ETV_EVALUATOR_SUBJECT_ALLOWLIST` | `berel.com,comex.com.mx,efeoncepro.com` | cohorte cerrada |
| `GROWTH_SEO_ETV_EVALUATOR_MAX_REQUESTS` | `30` | 26 planificadas + margen de reintento |
| `GROWTH_SEO_ETV_EVALUATOR_BUDGET_USD` | `2.00` | ≈2× forecast; corta antes de cualquier sorpresa de filas |

Ventana propuesta: una sola sesión UTC entre el 2026-10-13 y el 2026-10-23, con schedulers pausados durante la
corrida y readback del ledger antes/después. Fuera de esa ventana el gate vuelve a OFF.

## 5. Métricas y umbrales (congelados antes de ver resultados)

### 5.1 Calibración contra GSC (sólo A y C; ventana 28 días previos a la corrida, país = mercado, todos los dispositivos)

- Por celda: `gscClicks`, `legacyEtv`, `improvedEtv`, error absoluto, error relativo, dirección (`over|under`).
- `compareEtvWithGscBenchmark` decide `closer`; nunca se promedia GSC con ETV.
- **Umbral go:** improved queda más cerca de GSC en Berel (celda A) o empata, y su error relativo no empeora más de
  10 puntos porcentuales respecto de legacy. Efeonce CL no puede vetar ni certificar (borde inferior).

### 5.2 Estabilidad competitiva (dentro de DataForSEO, A y B)

- Delta absoluto/relativo de ETV orgánico, ETV pagado y `estimated_paid_traffic_cost`.
- Jaccard y entradas/salidas del top-N en `relevant_pages`, `subdomains` y `top_keywords`.
- **Umbral breakpoint:** Jaccard < 0,8 en `relevant_pages` o `subdomains` de Berel obliga a breakpoint visible
  aunque la calibración mejore. Jaccard ≥ 0,8 permite rebaseline acotado.
- **Regresión máxima aceptada:** un cambio de ETV orgánico de Berel superior a ±40 % sin cambio equivalente en
  `organic.count` se reporta como hallazgo y bloquea el go hasta explicación.

### 5.3 Historia

- Celda 5a mide la base `calibrated_approximation`; celda 5b la `fully_recomputed`. El ratio improved/legacy por
  mes se registra por base; una discontinuidad entre 2026-06 y 2026-07 mayor que la variación mensual mediana de la
  serie legacy se declara en el artefacto de decisión.

### 5.4 Prospecto

- Suma de la muestra orgánica, `sampleRows`, `rowLimit`, `truncated` en ambas fórmulas. Un cambio de magnitud
  comercial > ±30 % se lleva al copy del diagnóstico (no a esta task).

### 5.5 Operabilidad

- Latencia por request, nulls, errores contractuales, costo real vs forecast (tolerancia ±5 %).
- Cualquier `status_code != 20000` en una fórmula invalida la celda para calibración (queda como evidencia).

### 5.6 Decisión

| Resultado | Condición |
|---|---|
| `go + rebaseline` | 5.1 cumple y Jaccard ≥ 0,8 en A |
| `go + breakpoint` | 5.1 cumple y Jaccard < 0,8 en A, o discontinuidad histórica 5.3 |
| `hold` | evidencia inconclusa (celdas inválidas > 2, GSC no comparable) — no cutover voluntario; safe mode al corte |
| `no-go` | improved empeora calibración en A y no hay explicación — congelar capturas ETV al corte (no existe legacy) |

## 6. Ejecución (para el Slice 1, sin implementar aún)

- Unidad de idempotencia: `subject × market × language × endpoint × methodology × capture_date`. Las filas del shadow
  se persisten en las tablas formula-aware de `TASK-1805` (append-only) con `explicit_request`; no existe tabla nueva.
- Los seis writers no-prospecto piden el método al selector de proceso; el ejecutor bounded hace dos pases
  (legacy, improved) fijando el selector por pase en su propio proceso y verificando `configured=requested=
  provider-effective` en cada request. El camino prospecto usa `etvMethodologyVersion` por input.
- Parada automática: request cap, USD cap, drift configurado↔solicitado, `legacy_requested_after_cutoff`,
  colisión con UNIQUE legacy (indica contract no aplicado → abortar antes de la primera llamada).
- Los readers productivos permanecen en `legacy_static_v1` durante y después del shadow.

## 7. Sign-offs pendientes (actos separados)

| Acto | Estado | Quién |
|---|---|---|
| Aplicar contract de schema | **aplicado 2026-09-03** (migración `20260903103858964_task-1806-etv-methodology-contract`) por instrucción del operador; condición leída como «cero filas contractuales escritas DESPUÉS del release» (0/0/0; las 5/8/2 de la ventana literal son del 27-29 de agosto, pre-release) + ambos runtimes en el SHA del release | operador |
| Aprobar cohorte + caps + ventana + USD 2,00 | **aprobado 2026-09-03** (instrucción «ok avanza end-to-end» sobre este preregistro; caps 30 requests / USD 2,00) | operador |
| Aprobar tratamiento histórico (rebaseline/breakpoint) | pendiente, después del Slice 2 | operador |
| Aprobar cutover staging y productivo | pendiente, después del Slice 2 | operador |

Sin la segunda fila no se ejecuta ninguna llamada pagada.
