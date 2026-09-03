# Memo de decisión — shadow legacy/improved ETV (corrida 2026-09-03, cohorte `2026-09-03-preregistered`)

- Task: `TASK-1806` Slice 2 · run `etvshadow-f3fef9b3c2a8` · ejecutado 2026-09-03 ~11:05Z por instrucción explícita
  del operador (chat: «te autorizo plenamente para que puedas hacer la corrida pagada»).
- Artefactos: resultados generados por el evaluador en
  [`2026-09-03-2026-09-03-preregistered-results.md`](./2026-09-03-2026-09-03-preregistered-results.md); crudos y
  `summary.json`/`evaluation.json` en `.captures/etv-shadow/2026-09-03-2026-09-03-preregistered/` (gitignored,
  conservados localmente). Preregistro: `docs/audits/seo/2026-09-03-dataforseo-improved-etv-shadow-preregistration.md`.
- Gasto real: **USD 1,09536** por 26 requests (forecast 1,14384; ledger `labs` del día cuadra al centavo). Cero
  requests bloqueadas; `status_code 20000` en las 26; inputs byte-idénticos salvo `use_improved_etv` en todas las
  celdas (hash verificado por el ejecutor).

## 1. Qué dijo el evaluador (umbrales preregistrados, aplicados sin cambios)

| Regla (§ preregistro) | Resultado | Evidencia |
|---|---|---|
| 5.1 Calibración contra GSC (Berel MX, 28 días → mensual ×30/28) | **improved más cerca** | GSC 30.898 clics/mes · legacy 130.166 (err. rel. 321,3 %) · improved 46.151 (err. rel. 49,4 %) |
| 5.2 Estabilidad de membresía top-N (Berel) | **Jaccard 1,000** en `relevant_pages` (66) y `subdomains` (3); 63 cambios de rango entre páginas, 0 entradas/salidas | compatible con rebaseline (≥ 0,8) |
| 5.2 Regresión ±40 % sin cambio equivalente de `organic.count` | **se dispara** (−64,5 % con count 630 → 630) | bloquea el go «hasta explicación» — ver §2 |
| 5.3 Historia (2026-04..09, dos bases) | **continua**: salto del ratio improved/legacy 2026-06→07 = 0,1 % vs variación mensual mediana legacy 8,1 % | sin breakpoint por discontinuidad |
| 5.4 Prospecto (Comex, `ranked_keywords` 1.000 filas, truncado en ambas) | −43,9 % (384.207 → 215.526) | hallazgo para el copy del diagnóstico, no bloquea |
| 5.5 Operabilidad | latencia media 822 ms; costo real ≤ forecast (−4,2 %) | ok |
| Borde Efeonce CL | 5,09 → 0,59 (dominio de cinco keywords) | sin voto, como preregistrado |
| Competidor Comex MX | −52,0 % (880.415 → 422.500), count 5.127 → 5.127; traffic cost −51,6 % | dirección y magnitud coherentes con Berel |

Decisión mecánica del evaluador: **`hold`**, únicamente por la regla 5.2 de regresión.

## 2. Explicación de la regla 5.2 (la que el preregistro exigía antes de un go)

La regla se escribió para distinguir «la fórmula cambió el número» de «el sitio perdió posiciones». En un A/B
exacto la segunda causa es imposible por construcción: las dos requests se hacen en la misma ventana sobre el mismo
índice del proveedor, así que `organic.count` y las posiciones son idénticos y la totalidad del delta es efecto de
la fórmula. Por eso la regla se dispara siempre que el efecto metodológico supere ±40 %, sin que eso sea una
anomalía. Tres evidencias sostienen que el −64,5 % es la fórmula y no un artefacto:

1. **Calibración**: improved pasa de sobreestimar 4,2× los clics observados de Berel a sobreestimarlos 1,5×.
   Es la dirección que DataForSEO declaró (CTR sensible a layout/intención y normalización clickstream, para
   acercarse a GSC en SERPs con AIO, snippets, local packs y zero-click).
2. **Consistencia transversal**: Comex (−52 %), Berel (−64,5 %) y Efeonce (−88 %) bajan con `count` y membresía
   intactos; el ratio por mes de la historia de Berel es estable (variación 0,1 % entre bases).
3. **Membresía**: Jaccard 1,0 en páginas y subdominios — el orden relativo entre páginas se reacomoda (63 cambios
   de rango) pero nadie entra ni sale del top-N.

Con esta explicación documentada la regla 5.2 no describe un riesgo abierto sino el tamaño del cambio de escala
que cualquier consumer verá: **toda serie ETV cambia de nivel en ~−60 %** (Berel) al pasar a improved.

## 3. Limitaciones de esta corrida (declaradas)

- **Celda bulk (11) sin fila para Berel/Comex**: `bulk_traffic_estimation` persiste en la misma tabla y clave
  (`normalized_domain, location, language, capture_date, método`) que `domain_rank_overview`, y las celdas 0/6 ya
  habían escrito la fila del día → `ON CONFLICT DO NOTHING`. Los valores existen en el crudo y coinciden con la foto
  de dominio: berel.com 130.165,6 → 46.150,65; comex.com.mx 880.414,76 → 422.500,21; efeoncepro.com 6,12 → 2,63
  (esta última sí persistió porque su foto de dominio es CL/2152). Defecto de diseño de la cohorte, no del
  proveedor; corregido de paso el contador `rowsWritten` de los writers, que contaba intentos y no filas insertadas.
- **Ventana GSC** de 28 días terminando D-2 normalizada a mensual ×30/28; un solo país (MX) y todos los
  dispositivos. Es una calibración de nivel, no keyword a keyword.
- **Una sola cohorte y un solo día**: no mide estabilidad temporal de improved entre corridas.
- **Señal `seo.etv_methodology.drift`** en `warning` durante la ventana de 7 días posterior al release: cuenta las
  filas contractuales del 27-29 de agosto junto a la evidencia explícita nueva. No es drift de runtime; el orden
  improved→legacy del ejecutor dejó la última request explícita en `legacy_static_v1` y `divergences=1` corresponde a
  esa advertencia, no a un método distinto entre runtimes.

## 4. Recomendación (pendiente de aprobación separada del operador)

**`go_rebaseline`**: adoptar `improved_layout_clickstream_v2` con **rebaseline versionado** (historia desde julio de
2026 recomputada por el proveedor; anterior como `calibrated_approximation`, que el ratio estable de Berel respalda)
en vez de breakpoint, porque la membresía y el orden no cambian y la discontinuidad histórica es nula. Toda
superficie que muestre ETV debe declarar el cambio de escala (~−60 %) y la metodología, como ya hacen readers, API y
MCP vía `etvMethodology`.

Actos separados que este memo NO ejecuta ni autoriza:

| Acto | Estado |
|---|---|
| Aprobar tratamiento histórico `rebaseline` | pendiente del operador |
| Cutover staging (Vercel staging: writer y reader a improved; readback + rollback pre-corte) | pendiente del operador |
| Cutover productivo (Vercel Production + `services/ops-worker/deploy.sh`; un solo worker compartido = producción) | pendiente del operador; exige release por el control plane |
| Reanudar schedulers tras readback y observar cooldown | pendiente |

Hasta entonces los selectores productivos siguen en `legacy_static_v1`; ningún reader, API ni MCP sirve las filas
improved del shadow (filtran por método de lectura).
