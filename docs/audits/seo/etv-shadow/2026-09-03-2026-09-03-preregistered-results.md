# Shadow legacy/improved ETV — resultados y decisión (2026-09-03 · cohorte 2026-09-03-preregistered)

- Task: `TASK-1806` Slice 2 · preregistro: `docs/audits/seo/2026-09-03-dataforseo-improved-etv-shadow-preregistration.md`
- Fecha de captura: 2026-09-03 · fecha de evaluación: 2026-09-03 · run: etvshadow-f3fef9b3c2a8
- Modo declarado: `exact_ab` (dos requests por celda, inputs idénticos salvo la fórmula)
- Celdas: 15 (13 válidas para calibración) · inputs equivalentes en todas: sí
- Costo: forecast USD 1.1438 · real USD 1.0954

## Decisión: **hold** · tratamiento histórico: ninguno (sin cutover voluntario)

- Umbrales: docs/audits/seo/2026-09-03-dataforseo-improved-etv-shadow-preregistration.md (§5). Sujeto de calibración berel.com; borde efeoncepro.com sin voto.
- GSC se compara, nunca se promedia con ETV; legacy e improved se comparan, nunca se promedian entre sí.
- La calibración cumple, pero un cambio de ETV orgánico > ±40 % sin cambio equivalente de organic.count bloquea el go hasta explicación (§5.2).

> Esta decisión NO autoriza cutover: la aprobación del tratamiento histórico y del cutover son actos separados del operador (preregistro §7).

## Declaraciones de método

- GSC es benchmark first-party: se compara error, dirección y cercanía por celda; NUNCA se promedia GSC con ETV.
- Legacy e improved se comparan celda a celda; NUNCA se promedian ni se mezclan en una serie.
- Ventana GSC: 28 días terminando 2 días antes de la fecha de evaluación (GSC no publica D-1 y consolida ~48h): 2026-08-05..2026-09-01 (país mex); 2026-08-05..2026-09-01 (país chl); país = mercado de la celda; todos los dispositivos.
- Normalización mensual de GSC: clics de la ventana × 1.071429 (30/28); es un factor declarado, no un promedio.
- Comparabilidad: modo `exact_ab`; una celda sin ambas fórmulas, con status ≠ 20000 o con inputs no equivalentes es inválida para calibración y queda como evidencia.
- Cambio equivalente de organic.count (§5.2): mismo signo y ≥ 50 % del cambio relativo de ETV — lectura operativa del preregistro, declarada acá.
- Histórico: la foto comparable de cada celda histórica es el último mes del período; la serie completa por método alimenta la regla de discontinuidad (§5.3). Filas legacy anteriores al shadow (`contract_default_pre_cutoff`) cuentan como legacy y se declaran.
- Membresía top-N: orden reconstruido por `organic_etv DESC NULLS LAST` + orden de inserción; `relevant_pages`/`subdomains` no tienen ETV agregado en esta lectura (miden membresía, no magnitud).

## Hallazgos

- [aviso] `cell_invalid` · celda 11 — Celda 11 (bulk_traffic_estimation · berel.com) inválida para calibración: snapshot_missing:legacy, snapshot_missing:improved. Queda como evidencia.
- [aviso] `cell_invalid` · celda 11 — Celda 11 (bulk_traffic_estimation · comex.com.mx) inválida para calibración: snapshot_missing:legacy, snapshot_missing:improved. Queda como evidencia.
- [info] `calibration_improved_or_tie` · celda 0 — Celda 0 (domain_rank_overview): GSC 30.897,87 clics/mes · legacy err.rel 321.3 % · improved err.rel 49.4 % · más cerca: improved_layout_clickstream_v2
- [info] `calibration_improved_or_tie` · celda 1 — Celda 1 (ranked_keywords): GSC 30.897,87 clics/mes · legacy err.rel 321.3 % · improved err.rel 49.4 % · más cerca: improved_layout_clickstream_v2
- [info] `membership_stable` · celda 2 — Celda 2 (relevant_pages): Jaccard 1.000 · entradas 0 · salidas 0 · cambios de rango 63 ≥ 0.8.
- [info] `membership_stable` · celda 3 — Celda 3 (subdomains): Jaccard 1.000 · entradas 0 · salidas 0 · cambios de rango 0 ≥ 0.8.
- [BLOQUEANTE] `etv_regression_without_count_change` · celda 0 — Celda 0 (domain_rank_overview): ETV orgánico 130.165,6 → 46.150,65 (-64.5 %) supera ±40.0 % sin cambio equivalente de organic.count (0.0 %; equivalente = mismo signo y ≥ 50.0 % del cambio de ETV). Bloquea el go hasta explicación (§5.2).
- [BLOQUEANTE] `etv_regression_without_count_change` · celda 1 — Celda 1 (ranked_keywords): ETV orgánico 130.165,6 → 46.150,65 (-64.5 %) supera ±40.0 % sin cambio equivalente de organic.count (0.0 %; equivalente = mismo signo y ≥ 50.0 % del cambio de ETV). Bloquea el go hasta explicación (§5.2).
- [info] `historical_continuous` — Historia: salto del ratio improved/legacy 2026-06→2026-07 = 0.1 % vs variación mensual mediana legacy 8.1 %.
- [aviso] `prospect_magnitude_shift` · celda 12 — Prospecto (comex.com.mx): suma orgánica 384.207 → 215.526 (-43.9 %) > ±30.0 %; truncado legacy=true improved=true. Se lleva al copy del diagnóstico, no a esta decisión (§5.4).
- [info] `edge_subject_observation` · celda 9 — Borde efeoncepro.com celda 9 (domain_rank_overview): ETV 5,09 → 0,59 · GSC 9,64 clics/mes · más cerca: legacy_static_v1. No veta ni certifica.
- [info] `edge_subject_observation` · celda 10 — Borde efeoncepro.com celda 10 (ranked_keywords): ETV 5,09 → 0,59 · GSC 9,64 clics/mes · más cerca: legacy_static_v1. No veta ni certifica.
- [info] `edge_subject_observation` · celda 11 — Borde efeoncepro.com celda 11 (bulk_traffic_estimation): ETV 6,12 → 2,63 · GSC 2,14 clics/mes · más cerca: improved_layout_clickstream_v2. No veta ni certifica.

## Por celda (intra-DataForSEO; comparación, nunca promedio)

| # | Sujeto | Familia | Rol | Válida | ETV org. legacy → improved | Δ rel. | organic.count legacy → improved | Δ rel. | Traffic cost Δ rel. | Jaccard top-N | GSC |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | berel.com | domain_rank_overview | calibration | sí | 130.165,6 → 46.150,65 | -64.5 % | 630 → 630 | 0.0 % | -64.5 % | n/d | 30.897,87 clics/mes · más cerca: improved_layout_clickstream_v2 |
| 1 | berel.com | ranked_keywords | calibration | sí | 130.165,6 → 46.150,65 | -64.5 % | 630 → 630 | 0.0 % | -64.5 % | 1.000 | 30.897,87 clics/mes · más cerca: improved_layout_clickstream_v2 |
| 2 | berel.com | relevant_pages | calibration | sí | n/d → n/d | n/d | 66 → 66 | 0.0 % | n/d | 1.000 | n/a (endpoint_not_calibrated) |
| 3 | berel.com | subdomains | calibration | sí | n/d → n/d | n/d | 3 → 3 | 0.0 % | n/d | 1.000 | n/a (endpoint_not_calibrated) |
| 4 | berel.com | historical_rank_overview 2026-04..2026-06 | calibration | sí | 158.460,26 → 61.033,18 | -61.5 % | 2.954 → 2.954 | 0.0 % | -62.9 % | n/d | n/a (endpoint_not_calibrated) |
| 5 | berel.com | historical_rank_overview 2026-07..2026-09 | calibration | sí | n/d → n/d | n/d | n/d → n/d | n/d | n/d | n/d | n/a (endpoint_not_calibrated) |
| 6 | comex.com.mx | domain_rank_overview | competitor | sí | 880.414,76 → 422.500,21 | -52.0 % | 5.127 → 5.127 | 0.0 % | -51.6 % | n/d | n/a (competitor) |
| 7 | comex.com.mx | ranked_keywords | competitor | sí | 880.414,76 → 422.500,21 | -52.0 % | 5.127 → 5.127 | 0.0 % | -51.6 % | 1.000 | n/a (competitor) |
| 8 | comex.com.mx | relevant_pages | competitor | sí | n/d → n/d | n/d | 100 → 100 | 0.0 % | n/d | 1.000 | n/a (competitor) |
| 9 | efeoncepro.com | domain_rank_overview | edge | sí | 5,09 → 0,59 | -88.4 % | 5 → 5 | 0.0 % | -78.7 % | n/d | 9,64 clics/mes · más cerca: legacy_static_v1 |
| 10 | efeoncepro.com | ranked_keywords | edge | sí | 5,09 → 0,59 | -88.4 % | 5 → 5 | 0.0 % | -78.7 % | 1.000 | 9,64 clics/mes · más cerca: legacy_static_v1 |
| 11 | berel.com | bulk_traffic_estimation | calibration | no (snapshot_missing:legacy, snapshot_missing:improved) | n/d → n/d | n/d | n/d → n/d | n/d | n/d | n/d | no comparable (no_etv_to_calibrate) |
| 11 | comex.com.mx | bulk_traffic_estimation | competitor | no (snapshot_missing:legacy, snapshot_missing:improved) | n/d → n/d | n/d | n/d → n/d | n/d | n/d | n/d | n/a (competitor) |
| 11 | efeoncepro.com | bulk_traffic_estimation | edge | sí | 6,12 → 2,63 | -57.0 % | 7 → 7 | 0.0 % | n/d | n/d | 2,14 clics/mes · más cerca: improved_layout_clickstream_v2 |
| 12 | comex.com.mx | ranked_keywords (prospecto) | competitor | sí | n/d → n/d | n/d | 891 → 891 | 0.0 % | n/d | n/d | n/a (competitor) |

## Calibración contra GSC (§5.1) — benchmark first-party, se compara, NO se promedia

| # | Sujeto | Familia | Propiedad | Ventana | Clics ventana | Clics/mes (×30/28) | Legacy err. abs / rel / dir | Improved err. abs / rel / dir | Más cerca |
|---|---|---|---|---|---|---|---|---|---|
| 0 | berel.com | domain_rank_overview | sc-domain:berel.com | 2026-08-05..2026-09-01 (28 d, país mex) | 28.838 | 30.897,87 | 99.267,73 / 321.3 % / over | 15.252,78 / 49.4 % / over | improved_layout_clickstream_v2 |
| 1 | berel.com | ranked_keywords | sc-domain:berel.com | 2026-08-05..2026-09-01 (28 d, país mex) | 28.838 | 30.897,87 | 99.267,73 / 321.3 % / over | 15.252,78 / 49.4 % / over | improved_layout_clickstream_v2 |
| 9 | efeoncepro.com | domain_rank_overview | sc-domain:efeoncepro.com | 2026-08-05..2026-09-01 (28 d, país chl) | 9 | 9,64 | -4,55 / 47.2 % / under | -9,05 / 93.9 % / under | legacy_static_v1 |
| 10 | efeoncepro.com | ranked_keywords | sc-domain:efeoncepro.com | 2026-08-05..2026-09-01 (28 d, país chl) | 9 | 9,64 | -4,55 / 47.2 % / under | -9,05 / 93.9 % / under | legacy_static_v1 |
| 11 | efeoncepro.com | bulk_traffic_estimation | sc-domain:efeoncepro.com | 2026-08-05..2026-09-01 (28 d, país mex) | 2 | 2,14 | 3,98 / 186.0 % / over | 0,49 / 22.9 % / over | improved_layout_clickstream_v2 |

## Estabilidad de membresía top-N (§5.2)

| # | Sujeto | Familia | Jaccard | Compartidos | Entradas (improved) | Salidas (legacy) | Cambios de rango |
|---|---|---|---|---|---|---|---|
| 2 | berel.com | relevant_pages | 1.000 | 66 | 0 | 0 | 63 |
| 3 | berel.com | subdomains | 1.000 | 3 | 0 | 0 | 0 |
| 8 | comex.com.mx | relevant_pages | 1.000 | 100 | 0 | 0 | 96 |

## Historia (§5.3) — ratio improved/legacy por mes y base de cálculo

| Mes | Legacy ETV | Improved ETV | Ratio improved/legacy | Base improved |
|---|---|---|---|---|
| 2026-04 | 187.544,01 | 72.103,55 | 0.3845 | calibrated_approximation |
| 2026-05 | 172.439,6 | 66.341,61 | 0.3847 | calibrated_approximation |
| 2026-06 | 158.460,26 | 61.033,18 | 0.3852 | calibrated_approximation |
| 2026-07 | 143.439,56 | 55.286,58 | 0.3854 | fully_recomputed |
| 2026-08 | 131.749,53 | 52.792,15 | 0.4007 | fully_recomputed |
| 2026-09 | n/d | n/d | n/d | fully_recomputed |

- Discontinuidad 2026-06→2026-07 (salto relativo del ratio): 0.1 % · variación mensual mediana legacy: 8.1 %.
- Los meses anteriores a 2026-07 bajo improved son `calibrated_approximation` (ratio de julio por dominio), nunca recomputación keyword por keyword; no sirven para YoY sin disclosure.

## Prospecto (§5.4)

| # | Sujeto | Suma orgánica legacy → improved | Δ rel. | Filas muestra / límite | Truncado legacy / improved |
|---|---|---|---|---|---|
| 12 | comex.com.mx | 384.207 → 215.526 | -43.9 % | ver summary | true / true |

## Operabilidad (§5.5)

- Requests con latencia: 26 · media 821,9 ms · máx 2.221 ms
  - legacy_static_v1: 13 requests · media 769,2 ms · máx 1.777 ms
  - improved_layout_clickstream_v2: 13 requests · media 874,5 ms · máx 2.221 ms
| # | Sujeto | Familia | Legacy status / ms / USD | Improved status / ms / USD | Inputs equivalentes | Evidencia legacy | Evidencia improved |
|---|---|---|---|---|---|---|---|
| 0 | berel.com | domain_rank_overview | 20000 / 418 / 0.01212 | 20000 / 1.023 / 0.01212 | sí | explicit_request (2026-09-03T11:05:41.015Z) | explicit_request (2026-09-03T11:05:40.340Z) |
| 1 | berel.com | ranked_keywords | 20000 / 1.250 / 0.02400 | 20000 / 1.183 / 0.02400 | sí | explicit_request (2026-09-03T11:05:45.238Z) | explicit_request (2026-09-03T11:05:43.250Z) |
| 2 | berel.com | relevant_pages | 20000 / 962 / 0.02400 | 20000 / 751 / 0.02400 | sí | explicit_request (2026-09-03T11:05:59.870Z) | explicit_request (2026-09-03T11:05:46.250Z) |
| 3 | berel.com | subdomains | 20000 / 472 / 0.01236 | 20000 / 919 / 0.01236 | sí | explicit_request (2026-09-03T11:06:14.423Z) | explicit_request (2026-09-03T11:06:13.446Z) |
| 4 | berel.com | historical_rank_overview | 20000 / 420 / 0.12360 | 20000 / 560 / 0.12360 | sí | explicit_request (2026-09-03T11:06:16.682Z) | explicit_request (2026-09-03T11:06:15.765Z) |
| 5 | berel.com | historical_rank_overview | 20000 / 378 / 0.12240 | 20000 / 407 / 0.12240 | sí | explicit_request (2026-09-03T11:06:18.484Z) | explicit_request (2026-09-03T11:06:17.594Z) |
| 6 | comex.com.mx | domain_rank_overview | 20000 / 392 / 0.01212 | 20000 / 331 / 0.01212 | sí | explicit_request (2026-09-03T11:06:19.709Z) | explicit_request (2026-09-03T11:06:19.067Z) |
| 7 | comex.com.mx | ranked_keywords | 20000 / 1.223 / 0.02400 | 20000 / 1.313 / 0.02400 | sí | explicit_request (2026-09-03T11:06:23.006Z) | explicit_request (2026-09-03T11:06:21.513Z) |
| 8 | comex.com.mx | relevant_pages | 20000 / 1.141 / 0.02400 | 20000 / 498 / 0.02400 | sí | explicit_request (2026-09-03T11:06:37.524Z) | explicit_request (2026-09-03T11:06:23.759Z) |
| 9 | efeoncepro.com | domain_rank_overview | 20000 / 475 / 0.01212 | 20000 / 828 / 0.01212 | sí | explicit_request (2026-09-03T11:06:52.123Z) | explicit_request (2026-09-03T11:06:51.400Z) |
| 10 | efeoncepro.com | ranked_keywords | 20000 / 695 / 0.01260 | 20000 / 852 / 0.01260 | sí | explicit_request (2026-09-03T11:06:54.176Z) | explicit_request (2026-09-03T11:06:53.227Z) |
| 11 | berel.com | bulk_traffic_estimation | 20000 / 397 / 0.01236 | 20000 / 483 / 0.01236 | sí | n/d (n/d) | n/d (n/d) |
| 11 | comex.com.mx | bulk_traffic_estimation | 20000 / 397 / 0.01236 | 20000 / 483 / 0.01236 | sí | n/d (n/d) | n/d (n/d) |
| 11 | efeoncepro.com | bulk_traffic_estimation | 20000 / 397 / 0.01236 | 20000 / 483 / 0.01236 | sí | explicit_request (2026-09-03T11:06:56.055Z) | explicit_request (2026-09-03T11:06:55.160Z) |
| 12 | comex.com.mx | ranked_keywords | 20000 / 1.777 / 0.13200 | 20000 / 2.221 / 0.13200 | sí | summary_json (2026-09-03T11:06:59.441Z) | summary_json (2026-09-03T11:06:56.044Z) |

## Límites

- GSC es benchmark del dominio propio con propiedad activa; los competidores (comex.com.mx) sólo se comparan intra-DataForSEO.
- Efeonce CL es celda de borde (ETV de un dígito): mide nulls/ceros/estabilidad; no veta ni certifica.
- Un `go` no convierte el proxy del proveedor en clics medidos; la "alineación" prometida por el proveedor no es dato observado.
- Los umbrales son los del preregistro; cambiarlos exige una versión nueva del preregistro, nunca un ajuste después de ver resultados.
- Este artefacto no contiene payloads del proveedor, tokens ni datos personales; la evidencia cruda vive en las tablas formula-aware append-only y en `summary.json`.
