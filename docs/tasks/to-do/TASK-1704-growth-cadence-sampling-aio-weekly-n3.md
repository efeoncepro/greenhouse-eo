# TASK-1704 — Cadencia y muestreo declarados: AIO no diario, N≥3 donde la calibración lo exige

## Delta 2026-09-01 — desbloqueada

`TASK-1699` quedó `complete`: la serie del top-N del SERP corre en producción desde el 2026-08-29
(766 · 775 · 762 · 778 filas en sus primeros 4 días). Su bloqueo sobre esta task queda levantado.


## Delta 2026-08-28 (release a producción) — el bloqueante TASK-1699 ya corre en el runtime real

El release `develop→main` `c983be7f18e68602404567a19ac8e7e0f157f742` (PR #208, run `33178544139`,
manifest `released`, watchdog `ok` / `drift_count=0`) desplegó `parseSerpTopResults` y su cableado
en el rank capture: `GROWTH_SEO_SERP_TOP_RESULTS_ENABLED` está ON en la revisión activa del
ops-worker `ops-worker-00610-kc8` (escritura) y en Vercel Production (lectura). La forma del writer
que esta task debe respetar ya no es sólo código en `develop`: es lo que corre en el cron
`ops-seo-rank-capture` todos los días.

Lo único que queda madurando es la **serie**, no el código: el día 1 es el **2026-08-29** (cron
05:00 CLT). `TASK-1699` quedó **`complete` el 2026-09-01**: desplegada en el release `c983be7f18e6`, con su serie corriendo (766·775·762·778 filas los días 29-ago a 1-sep) y su señal en `ok`.

## Delta 2026-08-28

- El bloqueante `TASK-1699` quedó **`complete` el 2026-09-01**: desplegada en el release `c983be7f18e6`, con su serie corriendo (766·775·762·778 filas los días 29-ago a 1-sep) y su señal en `ok` (este delta decía `code complete, rollout pendiente`; el release ocurrió el 2026-08-28): el parseo del top-N ya no vive en `parseSerpRankObservation` sino en el parser
  hermano `parseSerpTopResults`, cableado en el rank capture tras `GROWTH_SEO_SERP_TOP_RESULTS_ENABLED`
  con tx atómica + fallback. La colisión de writer anticipada en §Risk map queda resuelta: 1699
  llegó primero, así que esta task adapta su slice de writer a esa forma ya declarada — cerrado por
  TASK-1699.
- Las rutas `docs/tasks/to-do/TASK-1699-...` citadas en este archivo quedaron stale: la spec vive
  en `docs/tasks/complete/`.

## Delta 2026-08-27

- El bloqueante `TASK-1696` está **code complete**: el ledger distingue `seo` de `aeo` y
  `resolveAeoBudget` mide el gasto per-org del grader, así que el ahorro del lado (a) y el gasto
  extra del lado (b) ya son comparables en la misma moneda — cerrado por TASK-1696.
- Precisión al leer ese gasto: `resolveAeoBudget` reporta **facturado** (ledger, `consumer='aeo'`,
  `cost_basis='invoiced'`) y **estimado** (LLM propios) por separado, y le resta al estimado la
  porción DataForSEO para no contar dos veces el mismo dólar — cambiado por TASK-1696.
- La ruta declarada en §Depends on quedó stale: TASK-1696 ya no vive en `docs/tasks/to-do/`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `TASK-1703`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Delta 2026-08-15 (2) — cifras corregidas por verificación adversarial

Una verificación adversarial contra PG real encontró que el bloque económico de la auditoría fuente
(`docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md`) tiene errores
sistemáticos que se propagaron a esta task. **Causa raíz única:** se consultó
`greenhouse_growth.provider_observations` sin filtrar el tráfico de prueba — hay 102 observaciones
de adapters `fake-*` con costo CERO y 28 de los 45 runs son `run_kind='smoke'`, y todo eso quedó en
los denominadores.

| Afirmación original | Estado | Valor verificado (PG, 2026-08-15) |
|---|---|---|
| "N≥3 (USD 0,88 × 3 = USD 2,64) rompe el techo de USD 2 del modo `full`" | ❌ **error de categoría** | `costCeilingUsdPerRun` es **por run** (`policy.ts:63`) y el acumulador `let estimatedCostUsd = 0` nace **dentro** de cada ejecución (`run-engine.ts:253`, comparado en `:285`). Tres runs de 0,88 **nunca** se suman contra ese techo. Tampoco hay presupuesto mensual en USD para el AEO contra el que 2,64 pudiera chocar. |
| "El engine aborta antes de correr" | ❌ falso | El guard corre **después** de cada observación persistida; al excederse hace `break outer` y finaliza el run con la evidencia ya escrita. No aborta, no lanza, no impide arrancar. |
| "un run `full` cuesta USD 0,88 medido" | ⚠️ frágil | Promedio de **sólo 3 runs** `internal_audit`/`full` (0,9099 · 0,8862 · 0,8476 → 0,8812). El máximo observado en modo `full` con providers reales es **USD 1,4565** (2026-06-24, `claude-sonnet-4-6` + `gpt-4.1` + `gemini-3-flash-preview` + `sonar`) = **73% de su propio techo por run**. Ése es el argumento fuerte y verdadero. |
| "el rank capture es el ~98% de la factura variable" | ❌ mal dividido | **90,0%** con el modelo del propio documento (4,06 / 4,51) y **76,7%** contra dólares medidos en el ledger (`serp` USD 1,3440 de USD 1,7525 totales). |

Correcciones aplicadas en el cuerpo: la justificación del lado (b) se reescribió (ahora la task
**debe declarar primero** si N=3 son tres runs separados o tres pasadas dentro de un run, porque el
análisis es completamente distinto), el freno real intra-run pasó a ser `maxPromptsPerRun: 12`
(`policy.ts:60`), toda mención de "abort por techo" se corrigió a corte con degradación, y el 98%
se corrigió en los dos lugares donde aparecía. **El lado (a) — cadencia del AIO — no depende de
ninguna de estas cifras erradas y queda intacto: sigue siendo la mayor palanca única del módulo.**

## Summary

Hoy la cadencia y el muestreo del módulo son **implícitos**: el rank capture mide AI Overview en
**todas** las keywords **todos** los días, y el grader mide **una sola vez** dimensiones que su
propia calibración declaró intermitentes. Los dos son errores de diseño de muestreo en direcciones
opuestas — se sobre-muestrea lo que no cambia a diario y se sub-muestrea lo que fluctúa. Esta task
declara las dos cadencias explícitamente, detrás de flag y con shadow: **(a)** el AIO deja de ser
diario en todas las keywords, y **(b)** las dimensiones intermitentes que la calibración nombró
pasan a N≥3. 🔴 **Un día sin medición de AIO NUNCA se materializa como "sin AI Overview": se
materializa como "no medido", con su razón.**

## Why This Task Exists

**(a) Lado proveedor — el multiplicador que nadie declaró.**

El rank capture paga `base × 2 (load_async_ai_overview) × 2 (depth 20)`
(`src/lib/growth/seo/rank-capture.ts:52-56`). Los dos multiplicadores no son iguales:

- **`depth 20` está justificado y documentado**: *"la posición útil vive en 8–20 — el default del
  proveedor (10) la dejaría ciega"* (`rank-capture.ts:64-67`). Esta task no lo toca.
- **`load_async_ai_overview` diario en todas las keywords no está justificado.** La presencia de un
  AI Overview en una SERP **no es una señal diaria**: cambia con el formato del resultado, no con
  el desempeño del cliente. Se paga la observación 30 veces al mes para leer un booleano que se
  mueve pocas veces.

Y el rank capture es la parte dominante de la factura variable del proveedor: **90,0%** con el
modelo de proyección del propio documento (USD 4,06 de los USD 4,51/mes del cliente real, 31
keywords; todo lo demás junto —backlinks, site audit, keyword market data— suma USD 0,45) y
**76,7%** contra los dólares ya medidos en `seo_provider_spend_daily` (`serp` USD 1,3440 sobre
USD 1,7525 totales, ventana 2026-08-06→15). **Sigue siendo la mayor palanca única sobre el gasto
del módulo** por un margen amplio, y a 200 keywords (el techo por target) la misma corrida diaria
cuesta USD 26,18/mes contra un budget `contracted` de USD 50.

**(b) Lado motor propio — el muestreo que su propia calibración exige y hoy no existe.**

`GREENHOUSE_AI_VISIBILITY_GRADER_CALIBRATION_V1.md` §5.bis midió que las señales intermitentes
—colisión de entidad `f11.es`— aparecen **1/3 (OpenAI) y 2/3 (Anthropic) de las veces**, y
recomienda **N≥3 sólo para esas señales**. Para presencia/ausencia y narrativa core el mismo
documento dice explícitamente que **N=1 es razonablemente confiable** (fueron estables 3/3 en los
dos motores). Replicar toda la matriz ×3 sería triplicar el costo para estabilizar señales que ya
son estables — y el documento no lo pide.

Hoy ese muestreo simplemente **no existe**: `run-engine` ejecuta cada prompt × provider una vez y
no hay noción de dimensión intermitente que merezca repetición. Construirlo es el trabajo.

🔴 **Antes de dimensionar nada, esta task DEBE declarar qué es "N=3".** Hay dos lecturas y el
análisis de costo, idempotencia y agregación es **completamente distinto** en cada una:

| Lectura | Qué significa | Qué la restringe de verdad |
|---|---|---|
| **A — tres runs separados** | 3 filas en `grader_runs`, cada una con su propio `estimatedCostUsd` | **Nada del guard de costo.** `costCeilingUsdPerRun` es por run (`policy.ts:63`) y el acumulador nace dentro de cada ejecución (`run-engine.ts:253`), así que 3 × 0,88 nunca se suman contra el techo. Lo que restringe es el **allowance de runs/mes** (`contractedRunsPerMonth = 20`, `flags.ts:294`): 3 runs por medición consumen 3 de 20. La agregación tiene que cruzar runs. |
| **B — tres pasadas dentro de un run** | 1 fila en `grader_runs`, N observaciones por prompt/provider | El freno que aparece **PRIMERO no es el costo, es `maxPromptsPerRun: 12`** (`policy.ts:60`). Y el techo de USD 2 sí aplica, pero se compara contra el acumulado de **ese** run. |

La calibración §5.bis midió la varianza como *"misma pregunta repetida 3 veces por motor"*, lo que
apunta a la lectura B para las dimensiones nombradas — pero **la task no puede asumirlo**: es la
primera decisión de Discovery y hay que dejarla escrita antes de tocar `policy.ts`.

**Y el techo de USD 2 por run sí está más apretado de lo que parece, por una razón verdadera.** El
promedio de USD 0,88 sale de **sólo 3 runs** (0,9099 · 0,8862 · 0,8476). El máximo real observado
en modo `full` con providers reales es **USD 1,4565** — **73% del techo de su propio run**, y ese
run terminó `partial` (ni siquiera completó la matriz). O sea: bajo la lectura B, el headroom real
para muestrear no es "2,00 − 0,88 = 1,12"; contra el peor run observado es **USD 0,54**. Ese es el
número contra el que hay que dimensionar el muestreo, y por eso `TASK-1703` (bajar el costo del eje
herramienta) sigue siendo dependencia dura de esta mitad.

**Qué hace el guard cuando se excede, exactamente.** No aborta y no lanza: corre *después* de
persistir cada observación, y al excederse hace `break outer` y finaliza el run con la evidencia ya
escrita (`run-engine.ts:283-292`). El estado final lo resuelve `resolveRunStatusFromObservations`
desde los statuses de las observaciones — ⚠️ lo que significa que **un run truncado por costo cuyas
observaciones fueron todas `succeeded` se finaliza como `succeeded`**, sin que el truncamiento
quede en el estado. `costGuardTripped` se devuelve al caller pero no se persiste. Si el muestreo se
implementa bajo la lectura B, esto deja de ser un detalle: un run que muestreó 1 de 3 pasadas y se
cortó por costo se vería idéntico a uno que muestreó las 3. **El corte por costo tiene que quedar
registrado en la fila del run** — es la misma regla de honestidad del lado (a), aplicada al AEO.

**El hilo común, y el riesgo que ordena el diseño.** Los dos cambios tocan **series vivas**: el
rank capture lleva meses corriendo para un cliente real y el eje AEO alimenta reportes ya
entregados. Cambiar la cadencia de una serie sin declarar el cambio en el dato produce el peor
resultado posible: una serie que **parece** continua y no lo es.

🔴 Y el modo de falla concreto está en el código, verificado: el flag de AI Overview de la serie se
deriva como `(serp_features ? 'ai_overview') AS ai_overview` en PG
(`rank-evolution-reader.ts:101`) y con `'ai_overview' IN UNNEST(...)` en BigQuery (`:130`). **Un
día sin medir el AIO produce `serp_features` sin `'ai_overview'`, que es indistinguible de un día
medido sin AI Overview.** El reader devolvería `aiOverview: false` con total convicción. Por eso la
regla dura no es una preferencia de UX: sin un tercer estado explícito de "no medido", este cambio
**fabrica datos falsos en una serie que un cliente mira**. Degradación honesta o no se hace.

## Goal

- La cadencia de medición del AI Overview es **declarada y configurable**, no un booleano hardcoded
  en el request, y su default deja de ser diario-en-todas.
- La serie de rank distingue tres estados: **AIO presente**, **AIO ausente (medido)** y **no
  medido**, con razón — en PG, en el espejo BigQuery y en el contrato del reader.
- **La semántica de "N=3" queda declarada por escrito** (tres runs separados vs tres pasadas dentro
  de un run) **antes** de tocar `policy.ts`, con su consecuencia sobre allowance, techo por run,
  idempotencia y agregación.
- El muestreo N≥3 existe para las dimensiones intermitentes nombradas por la calibración, y **sólo**
  para ellas, dentro del techo de costo **por run** del modo y del `maxPromptsPerRun` vigente.
- Un run truncado por el guard de costo **queda marcado como truncado** en su fila; no se puede
  confundir con un run completo.
- Los dos cambios entran detrás de flag con corrida en shadow contra la serie viva antes de
  cualquier flip.
- El ahorro y el gasto quedan **medidos** en el ledger, no estimados.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_AI_VISIBILITY_GRADER_CALIBRATION_V1.md` (§5.bis — origen del N≥3)
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` (patrón flag default-OFF + shadow + flip)
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`

Reglas obligatorias:

- 🔴 **Ausencia de medición ≠ ausencia del fenómeno.** Un día sin medir AIO se materializa como
  `no medido` con razón, jamás como `false`. Vale en PG, en el mirror BigQuery, en el reader y en
  cualquier agregación.
- **La separación `◑` estimado / `●` medido se sostiene.** Un valor arrastrado de la última
  medición es `◑` y debe llevar su fecha de captura; nunca se pinta como medición del día.
- **NUNCA rellenar huecos por interpolación, forward-fill silencioso ni "último valor conocido"**
  sin marcarlo. La honestidad del dato es el producto.
- **Serie viva ⇒ flag + shadow obligatorios.** El rank capture corre en producción para un cliente
  real; no hay "cutover inmediato aditivo" posible acá.
- **El `depth 20` no se toca.** Está justificado por oficio y documentado en el código.
- **El techo de costo por modo (`policy.ts`) es un circuit breaker, no una meta.** Si N≥3 no cabe,
  no se sube el techo: se reduce el alcance del muestreo o se espera a que el costo baje.
- **Sin migración destructiva.** Las columnas nuevas son aditivas y nullable; la serie histórica no
  se reescribe ni se reinterpreta retroactivamente.

## Normative Docs

- `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md` (§2.1
  multiplicadores silenciosos. ⚠️ **§2.4 "el N=3 no cabe en su propio techo" es FALSO** — ver
  `## Delta 2026-08-15 (2)`: el techo es por run. No usar §2.4 como insumo; su bloque económico
  tiene denominadores contaminados con tráfico `fake-*` y `run_kind='smoke'`.)
- `docs/tasks/complete/TASK-1307-growth-seo-rank-url-performance-over-time-ui.md` (origen del flag
  `aiOverview` en la serie — el consumer que esta task debe no romper)
- `docs/tasks/complete/TASK-1300-growth-seo-dataforseo-family-registry.md` (registry de familias +
  spend fence)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

## Dependencies & Impact

### Depends on

- **`TASK-1696` — dimensión de consumidor en `seo_provider_spend_daily` + gate USD per-org del
  grader** (`docs/tasks/to-do/TASK-1696-growth-provider-spend-consumer-dimension-grader-usd-gate.md`).
  Bloqueante: sin la dimensión `seo`/`aeo` en el ledger y sin el gate de dinero, el ahorro del lado
  (a) y el gasto extra del lado (b) no son comparables en una misma moneda, y el cambio de cadencia
  mueve el gasto sin dejarlo ver.
- **`TASK-1699` — persistir el top-N del SERP que ya se paga**
  (`docs/tasks/complete/TASK-1699-growth-seo-persist-serp-top-n-already-paid.md`). Ya NO bloquea —cerrada
  el 2026-09-01—, pero su forma sigue mandando para la mitad (a): 1699 toca exactamente el mismo parseo (`parseSerpRankObservation`) y el mismo writer de
  snapshot donde esta task inserta el registro de las señales **pedidas**. Si esta task llega
  primero, 1699 reescribe el writer sobre un contrato a medio hacer; si llega 1699 primero, el
  tri-estado se apoya en un payload de SERP ya persistido y el trabajo se reduce.
- **`TASK-1703` — router cheap-first del eje herramienta.** Bloqueante para la mitad (b) **bajo la
  lectura B** (pasadas intra-run): contra el peor run `full` observado (USD 1,4565) el headroom bajo
  el techo por run es de USD 0,54, y sin el costo del extractor abajo el muestreo se corta por
  techo. Bajo la lectura A (runs separados) el techo por run no es el binding constraint y la
  dependencia se vuelve de economía, no de factibilidad.
- `greenhouse_growth.seo_rank_snapshots` + `src/lib/growth/seo/rank-capture.ts` +
  `rank-capture-batch.ts` + `rank-evolution-reader.ts` + `rank-history-bq-mirror.ts`.
- `src/lib/growth/ai-visibility/{policy,run-engine,scoring}.ts` + `accuracy/detector.ts`
  (las dimensiones intermitentes que la calibración nombró se detectan ahí).

### Blocks / Impacts

- `TASK-1707` (rollout del re-grade recurrente): el re-grade `full` recurrente hereda el muestreo y
  el techo de esta task. 1707 declara esta task como dependencia.
- Cualquier consumer de `RankEvolutionPoint.aiOverview` (`src/lib/growth/seo/contracts.ts:478`):
  el campo pasa de `boolean | undefined` a un tri-estado explícito. Es un cambio de contrato de
  lectura y hay que barrer los consumers.
- El espejo BigQuery de la historia de rank (`rank-history-bq-mirror.ts`) y cualquier query
  analítica sobre `serp_features`.
- `EPIC-022` — el margen por cliente cambia con la cadencia; el número de USD 4,51/mes deja de ser
  válido y hay que recomputarlo.

### Files owned

- `src/lib/growth/seo/rank-capture.ts`
- `src/lib/growth/seo/rank-capture-batch.ts`
- `src/lib/growth/seo/rank-evolution-reader.ts`
- `src/lib/growth/seo/rank-history-bq-mirror.ts`
- `src/lib/growth/seo/contracts.ts`
- `src/lib/growth/seo/flags.ts`
- `src/lib/growth/ai-visibility/policy.ts`
- `src/lib/growth/ai-visibility/run-engine.ts`
- `src/lib/growth/ai-visibility/flags.ts`
- `migrations/<timestamp>_task-1704-rank-snapshot-aio-measurement-state.sql`
- `services/ops-worker/deploy.sh`
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

## Current Repo State

### Already exists

- `buildSerpTask` (`rank-capture.ts:225-248`) fija `depth: SERP_RANK_CAPTURE_DEPTH` (20) y
  `load_async_ai_overview: true` **sin condición**, con el comentario que reconoce que *"duplica el
  costo del request — ya incluido en la estimación del gate"*.
- `SERP_RANK_CAPTURE_ESTIMATED_COST_USD = 0.01` (redondeo conservador sobre ~USD 0,008 reales) y
  `SPEND_FENCE_RECHECK_EVERY = 10` (el gate se re-consulta cada 10 llamadas cobradas, deuda
  declarada por TASK-1300).
- `parseSerpRankObservation` recorre los items y arma `serpFeatures: string[]` con los `type` de la
  SERP; **también recorre y descarta las filas de todos los competidores del top-20** ya pagadas.
- `greenhouse_growth.seo_rank_snapshots` con `capture_date`, `position`, `url`, `serp_features`
  (JSON), `provider_cost`, `source_run_id`, `estimated_traffic`.
- `RankEvolutionPoint.aiOverview?: boolean` (`contracts.ts:470-483`), derivado en el reader como
  `(serp_features ? 'ai_overview') AS ai_overview` en PG (`rank-evolution-reader.ts:101`) y
  `'ai_overview' IN UNNEST(IFNULL(JSON_VALUE_ARRAY(serp_features), []))` en BigQuery (`:130`) —
  **presencia booleana, sin concepto de "no medido"**.
- `policy.ts` con los tres modos y sus techos: `light` 0.5 / `full` 2 / `internal_audit` 5, y
  `maxPromptsPerRun` 6 / 12 / 16.
- `run-engine.ts:283-292` **corta** el run (`break outer`) si `estimatedCostUsd >
  policy.costCeilingUsdPerRun`, después de persistir la observación que cruzó el techo. No aborta ni
  lanza: finaliza con la evidencia ya escrita. El acumulador `estimatedCostUsd` nace en `:253`
  **dentro** de cada ejecución ⇒ el techo es **por run**, nunca acumulado entre runs.
- El truncamiento **no se persiste**: `costGuardTripped` se devuelve al caller y el estado final lo
  resuelve `resolveRunStatusFromObservations` desde los statuses de las observaciones, así que un
  run cortado con todas sus observaciones `succeeded` se guarda como `succeeded`.
- `accuracy/detector.ts`: determinista, produce `AccuracyFinding`; *"sólo `entity_collision` claro
  escala el gate"* — es la dimensión intermitente que la calibración nombró.
- Ledger de gasto del proveedor: `seo_provider_spend_daily` +
  `src/lib/growth/seo/{provider-spend,register-provider-spend,provider-pricing}.ts`.
- Flags del módulo SEO con el patrón multi-runtime ya documentado en `seo/flags.ts`
  (`GROWTH_SEO_ENABLED`, `GROWTH_SEO_KEYWORD_MARKET_DATA_ENABLED`,
  `GROWTH_SEO_KEYWORD_DISCOVERY_ENABLED`), incluido el aviso de que *"lo leen DOS runtimes"*.

### Gap

- No hay concepto de **cadencia** en el rank capture: la única unidad es "la corrida diaria
  completa". No se puede pedir "AIO los lunes" ni "AIO en las keywords de la cola priorizada".
- No hay estado de medición por señal en el snapshot: `serp_features` es una lista de lo
  encontrado, sin lista de lo **pedido**. Esa asimetría es la que vuelve indistinguible "no había
  AIO" de "no se preguntó por AIO".
- El reader no tiene tri-estado ni razón; el contrato expone `aiOverview?: boolean`.
- No existe muestreo N>1 en ninguna parte del grader: `run-engine` ejecuta cada prompt × provider
  una vez, y no hay noción de dimensión intermitente que merezca repetición.
- El techo de `full` (USD 2) es **por run** y fue calibrado contra un run de un solo pase; no
  contempla muestreo, y su base empírica es una muestra de 3 runs cuyo máximo real (USD 1,4565) ya
  consume el 73%.
- **El corte por costo no deja rastro persistido.** `costGuardTripped` se devuelve al caller pero no
  se escribe en `grader_runs`; el status lo resuelve `resolveRunStatusFromObservations` desde las
  observaciones, así que un run truncado con observaciones sanas queda `succeeded`. Con muestreo
  esto pasa de ser un detalle a ser un falseo de evidencia.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/growth/seo/**` y `src/lib/growth/ai-visibility/**` en el portal; la
  ejecución real corre en el ops-worker Cloud Run (batch de rank capture y drain del grader) vía
  Cloud Scheduler.
- Future candidate home: `domain-package`
- Boundary: la decisión de cadencia vive en un resolver único por dominio
  (`resolveAioCaptureDecision` para SEO, `resolveDimensionSampling` para AEO). El batch y el
  run-engine son consumers; ningún callsite decide cadencia inline.
- Server/browser split: ambos resolvers son `import 'server-only'` (leen config, DB y ledger). Al
  browser sólo llega el DTO de la serie con su tri-estado.
- Build impact: none — no agrega dependencias ni inputs de filesystem.
- Extraction blocker: el batch de rank capture depende del spend fence, del entitlement per-org y
  del ledger de gasto en la misma conexión Postgres; el grader depende del outbox y del drain del
  worker. Extraer cualquiera de los dos exige mover ese conjunto.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `greenhouse_growth.seo_rank_snapshots` (serie viva de rank + SERP
  features) y `greenhouse_growth.seo_provider_spend_daily` (ledger de gasto); del lado AEO, el
  contrato de muestreo del `run-engine` y `policy.ts`
- Consumidores afectados: `rank-evolution-reader` (PG + BigQuery), pantalla ancla de rank, espejo
  BQ de historia, reportes AEO, Nexa y MCP vía los readers canónicos
- Runtime target: `staging`, `production`, `worker`, `cron`

### Contract surface

- Contrato existente a respetar: `RankEvolutionPoint` / `RankEvolutionSeries` /
  `RankEvolutionResult` (`seo/contracts.ts`); `SeoRankCaptureResult` y `SerpRankObservation`
  (`rank-capture.ts`); `GrowthAiVisibilityProviderPolicy` (`policy.ts`).
- Contrato nuevo o modificado:
  - `RankEvolutionPoint.aiOverview` pasa de `boolean | undefined` a
    `{ state: 'present' | 'absent' | 'not_measured'; reason?: string; measuredAt?: string }`.
  - `SerpRankObservation` gana la lista de señales **pedidas** en esa llamada, no sólo las
    encontradas.
  - `resolveAioCaptureDecision({ seoTargetId, keyword, captureDate })` → `{ measure: boolean;
    reason: string }` (resolver único de cadencia).
  - `GrowthAiVisibilityProviderPolicy` gana `samplingByDimension` con el subconjunto de dimensiones
    intermitentes y su N.
- Backward compatibility: **breaking** para los consumers de `aiOverview` (cambio de tipo
  deliberado — un booleano no puede expresar tres estados). Gated por flag y con barrido de
  consumers en el mismo PR.
- Full API parity: `N/A — no capability` en el sentido de acción de negocio nueva. La cadencia es
  configuración de un pipeline ya gobernado. **Si Discovery concluye que la cadencia debe ser
  editable por operador/cliente**, entonces sí nace una capability + command y esta declaración
  cambia; en V1 la cadencia es política del sistema, declarada en config versionada.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.seo_rank_snapshots` (columnas aditivas),
  su espejo en BigQuery, `greenhouse_growth.seo_provider_spend_daily` (sólo escritura ya existente),
  y las tablas de runs/observaciones del grader `[verificar nombres exactos en Discovery]`.
- Invariantes que no se pueden romper:
  - 🔴 **`not_measured` ≠ `absent`.** Una fila sin medición de AIO nunca puede leerse como ausencia
    del AI Overview, en ninguna capa, en ningún motor de consulta.
  - La razón del `not_measured` es explícita y cerrada (`cadence_skip`, `provider_error`,
    `budget_gate`, `flag_off`), no texto libre.
  - Las señales **pedidas** se persisten junto con las **encontradas**: sin eso, el tri-estado no
    es reconstruible hacia atrás.
  - La serie histórica anterior al cambio se lee como `present`/`absent` (se midió siempre); el
    corte de cadencia queda anotado con fecha en la config versionada.
  - N≥3 aplica **sólo** a las dimensiones nombradas por la calibración. Aplicarlo a la matriz
    completa está prohibido por esta task.
  - Las observaciones repetidas se persisten **todas** (append-only); la agregación decide, no el
    writer. Sobrescribir la observación anterior con "la buena" destruye la evidencia del muestreo.
  - El techo de costo **por run** sigue siendo un corte efectivo, no un warning — y el corte queda
    registrado en la fila del run, no sólo devuelto al caller.
  - `depth 20` intacto.
- Tenant/space boundary: `seo_targets.organization_id` para el lado SEO;
  `grader_profiles.organization_id` para el AEO. La cadencia se resuelve por target/perfil, nunca
  global-para-todos-los-clientes sin declararlo.
- Idempotency/concurrency: el batch de rank capture ya es idempotente por
  `(seo_target_id, keyword, engine, device, capture_date)`; una fila `not_measured` debe poder
  **promoverse** a `present`/`absent` si más tarde el mismo día se mide de verdad — sin duplicar la
  fila. El muestreo N≥3 usa una clave de idempotencia que incluye el índice de muestra.
- Audit/outbox/history: el evento `SEO_RANK_SNAPSHOT_CAPTURED_EVENT` ya existe; extenderlo con el
  estado de medición. El gasto se registra en el ledger por llamada cobrada, como hoy.

### Migration, backfill and rollout

- Migration posture: `additive` — columnas nullable en `seo_rank_snapshots`
  (`requested_signals` JSON, `aio_measurement_state`, `aio_not_measured_reason`) + bloque `DO` de
  verificación + GRANTs. Espejo BQ actualizado con columnas nuevas nullable.
- Default state: `flag OFF` en las dos mitades.
  - `GROWTH_SEO_AIO_CADENCE_ENABLED=false` → `load_async_ai_overview: true` diario, como hoy.
  - `GROWTH_AI_VISIBILITY_DIMENSION_SAMPLING_ENABLED=false` → N=1, como hoy.
- Backfill plan: **backfill acotado y honesto** de la serie existente: todas las filas anteriores al
  corte se marcan `aio_measurement_state = 'measured'` porque de hecho se midieron (el flag estaba
  siempre en `true`). Es el único backfill legítimo acá y hay que hacerlo, porque sin él la serie
  histórica quedaría `NULL` y un reader estricto la leería como `not_measured` — invirtiendo el
  error. Dry-run + conteo esperado antes del apply.
- Rollback path: flags a `false` en los dos runtimes + redeploy. Las columnas aditivas quedan. El
  backfill es idempotente y no destructivo.
- External coordination: los dos flags se leen en el ops-worker (donde corre el batch y el drain) y
  potencialmente en Vercel; declarar en `services/ops-worker/deploy.sh` + `--update-env-vars` +
  Vercel + fila del ledger. Aviso a quien mira la pantalla de rank antes del flip.

### Security and access

- Auth/access gate: sin capability nueva en V1. El batch corre como sistema desde Cloud Scheduler y
  ya respeta `enforceSeoRunEntitlement` + spend fence per-org.
- Sensitive data posture: sin PII. El dato sensible es **comercial**: es lo que el cliente ve como
  su serie histórica.
- Error contract: `captureWithDomain(err, 'growth', ...)`; los errores de proveedor se materializan
  como `not_measured` con `reason: 'provider_error'`, no como ausencia.
- Abuse/rate-limit posture: el spend fence existente (`SPEND_FENCE_RECHECK_EVERY = 10`) sigue
  vigente. El muestreo N≥3 **debe** contar contra el mismo techo de costo del run, no bypassearlo.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/seo src/lib/growth/ai-visibility` + tests nuevos
  (tri-estado, promoción de `not_measured`, cadencia determinista, N≥3 acotado a las dimensiones
  nombradas, corte por techo **con el truncamiento persistido**).
- DB/runtime checks: migración aplicada en staging + verificación de columnas; conteo del backfill
  antes y después; `SELECT` comparando una semana en shadow vs la serie real.
- Integration checks: corrida real del batch en staging con el flag ON contra un target de prueba,
  verificando el gasto registrado en `seo_provider_spend_daily`; corrida `full` del grader con
  muestreo verificando que el costo estimado sigue bajo el techo.
- Reliability signals/logs: señal nueva de **cobertura de medición** — porcentaje de puntos de la
  serie con `not_measured` en los últimos 30 días, por target. Steady = el valor esperado según la
  cadencia declarada; una desviación significa que la cadencia no está haciendo lo que dice.
- Production verification sequence: ver §Rollout Plan.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — El tri-estado antes que la cadencia

- Migración aditiva: `requested_signals` (JSON), `aio_measurement_state`
  (`measured` | `not_measured`), `aio_not_measured_reason` (enum cerrado) en
  `greenhouse_growth.seo_rank_snapshots`, con bloque `DO $$ ... RAISE EXCEPTION`.
- El writer persiste las señales **pedidas** además de las encontradas.
- Backfill: filas históricas → `measured` (dry-run + conteo + apply).
- Espejo BigQuery actualizado con las columnas nuevas.
- `RankEvolutionPoint.aiOverview` pasa a tri-estado; barrido y actualización de **todos** los
  consumers en el mismo PR.
- Test que falla si un punto sin medición se serializa como `absent`.

### Slice 2 — Cadencia del AIO, declarada y en shadow

- `resolveAioCaptureDecision({ seoTargetId, keyword, captureDate })` con política versionada
  (`aio_cadence_version`): la cadencia por defecto propuesta es **semanal por keyword**, escalonada
  para no concentrar el costo en un día, con re-medición forzada cuando la posición del dominio
  cambia de tramo. La política exacta se fija en Discovery con el dato de cuántas veces cambió de
  hecho el flag `ai_overview` en la serie viva de los últimos 90 días — **medirlo primero, decidir
  después**.
- `buildSerpTask` pasa `load_async_ai_overview` desde la decisión, no hardcoded.
- Flag `GROWTH_SEO_AIO_CADENCE_ENABLED` (default OFF).
- **Shadow:** correr el resolver sin cambiar el request y registrar qué días *habría* saltado, para
  medir el ahorro y el hueco de cobertura contra la serie real antes de tocar nada.

### Slice 3 — Muestreo N≥3 acotado, del lado AEO

- 🔴 **Primero, en la task: declarar la semántica de N=3** (lectura A = tres runs separados vs
  lectura B = tres pasadas dentro de un run) con su consecuencia sobre allowance de runs/mes, techo
  por run, `maxPromptsPerRun`, clave de idempotencia y dónde ocurre la agregación. Nada de
  `policy.ts` se toca antes de eso.
- Marcar el truncamiento por costo en la fila del run (hoy `costGuardTripped` sólo se devuelve al
  caller): sin eso, un run muestreado a medias se lee como completo.
- `samplingByDimension` en `policy.ts`: mapa cerrado dimensión → N, poblado **sólo** con las
  dimensiones que la calibración §5.bis nombró (colisión de entidad y las que ese documento liste;
  leerlo, no asumir).
- `run-engine` ejecuta N muestras para los prompts/providers que alimentan esas dimensiones,
  persiste **todas** las observaciones (append-only) y agrega por mayoría/frecuencia en el scoring.
- El costo estimado del run incluye el muestreo y sigue sujeto al corte por techo **por run**; el
  run cortado queda marcado como truncado (hoy no lo está — ver Gap).
- Flag `GROWTH_AI_VISIBILITY_DIMENSION_SAMPLING_ENABLED` (default OFF).

### Slice 4 — Señal de cobertura de medición + cierre económico

- Señal de reliability: cobertura de medición de la serie por target (30 d), con el valor esperado
  derivado de la cadencia declarada.
- Recomputar el costo mensual por cliente con la cadencia nueva y registrarlo (el USD 4,51/mes de
  la auditoría deja de ser válido).
- Actualizar los dos arch docs con la cadencia y el muestreo declarados.

## Out of Scope

- 🔴 **NO** materializar un día sin medición como "sin AI Overview". No es una decisión de
  implementación: es la condición para que esta task exista.
- **NO** tocar `depth 20` ni el conjunto de keywords seguidas ni el techo de 200 por target.
- **NO** persistir las filas de competidores del top-20 que hoy se descartan: es la brecha S2 de la
  auditoría y es de `TASK-1699`. Esta task sólo agrega el registro de las señales **pedidas**; el
  payload del SERP es de la otra.
- **NO** aplicar N≥3 a toda la matriz de prompts × providers.
- **NO** subir el techo de `costCeilingUsdPerRun` de ningún modo.
- **NO** cambiar qué motores observa el grader (eso está protegido por `TASK-1703`).
- **NO** construir el gate de tokens ni el presupuesto en dólares del grader (`TASK-1696` /
  `TASK-1699`).
- **NO** construir UI. El tri-estado llega al contrato del reader; la representación visual del
  "no medido" en la pantalla ancla es una task `ui-ux` derivada.
- **NO** re-medir hacia atrás para rellenar huecos.

## Detailed Spec

**El estado de medición, explícito:**

```ts
export type AioMeasurementState =
  | { state: 'present' }                                        // medido, había AI Overview
  | { state: 'absent' }                                         // medido, no había AI Overview
  | { state: 'not_measured'; reason: AioNotMeasuredReason }     // NO se preguntó / falló

export type AioNotMeasuredReason = 'cadence_skip' | 'provider_error' | 'budget_gate' | 'flag_off'
```

**Por qué no alcanza con inferirlo del `capture_date`.** Se podría intentar deducir "no medido"
desde una tabla de cadencia. No sirve: la cadencia puede cambiar, el proveedor puede fallar y el
gate de presupuesto puede intervenir. El estado tiene que estar **en la fila**, escrito por quien
sabe qué pidió. De ahí la columna `requested_signals`: es el registro de la pregunta, no de la
respuesta.

**Aritmética del lado (a):**

```
hoy:      31 kw × 30 días × USD 0,004364 (base×2 AIO×2 depth)  =  USD 4,06 / mes
sin AIO:  31 kw × 30 días × USD 0,002182 (base×2 depth)        =  USD 2,03 / mes
semanal:  USD 2,03 + (31 kw × ~4,3 días × USD 0,002182)        ≈  USD 2,32 / mes
                                                                  ─────────────
                                                      ahorro    ≈  USD 1,74 / mes / cliente (~43%)
```

A 200 keywords el mismo ratio lleva la corrida de **USD 26,18 a ~USD 14,9/mes**, que es lo que
vuelve viable el techo de keywords sin recalibrar el budget. Las cifras son derivadas de los
multiplicadores documentados en `rank-capture.ts:52-56` y del costo medido USD 0,004364/llamada del
ledger; **verificar contra el ledger real en Discovery antes de comprometer el número**.

**Aritmética del lado (b):**

🔴 **La aritmética depende de qué es "N=3" (lectura A vs B, ver Why This Task Exists). No hay una
sola cuenta.**

```
Base medida (3 runs internal_audit/full):  0,9099 · 0,8862 · 0,8476  → promedio 0,8812
Peor run full observado (providers reales):                            USD 1,4565  (partial)
Techo POR RUN del modo full (policy.ts:63):                            USD 2,00

Lectura A — tres runs separados
  costo:      3 × ~0,88 = ~2,64 USD  → NO choca con ningún techo:
              costCeilingUsdPerRun es por run y el acumulador nace dentro de
              cada ejecución (run-engine.ts:253). Tampoco hay presupuesto
              mensual en USD para el AEO.
  restricción real: allowance de runs/mes (contractedRunsPerMonth = 20,
              flags.ts:294) → cada medición N=3 consume 3 de 20.
  costo real: entra al gate USD per-org que construye TASK-1696.

Lectura B — tres pasadas dentro de un run
  freno #1:   maxPromptsPerRun = 12 (policy.ts:60) — aparece ANTES que el costo.
  freno #2:   techo por run USD 2,00. Headroom contra el promedio: 1,12.
              Headroom contra el PEOR run observado (1,4565):        USD 0,54.
  al excederse: corte (break outer) con la evidencia ya persistida, NO abort.
```

Dimensionar contra USD 0,54 (peor caso observado), no contra USD 1,12 (promedio de 3 runs) — un
techo calibrado contra el promedio de una muestra de 3 se cruza en producción. El cálculo exacto de
"muestras extra" depende de cuántos prompts alimentan las dimensiones nombradas y de si
`TASK-1703` bajó el costo del extractor. Es lo primero que Discovery tiene que medir; si no cabe,
el alcance del muestreo se reduce hasta que quepa — **nunca al revés**.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- 🔴 **Slice 1 (tri-estado + backfill) DEBE cerrar antes que Slice 2.** Prender la cadencia sin el
  tri-estado escribe días falsos de "sin AI Overview" en una serie que un cliente mira, y esos
  puntos no se pueden distinguir después. Es la puerta de una sola dirección de esta task.
- Slice 2 corre en **shadow** por al menos un ciclo semanal completo antes de cualquier flip.
- Slice 3 (AEO) es independiente de 1 y 2 y puede correr en paralelo, pero **no puede shippear
  antes que `TASK-1703`**: contra el peor run `full` observado (USD 1,4565) el headroom bajo el
  techo por run es de USD 0,54, y sin el costo del extractor abajo el muestreo se corta por techo.
- `TASK-1699` y esta task tocan el mismo writer de snapshot: acordar orden de merge **antes** de
  empezar Slice 1, no durante el conflicto.
- Slice 4 (señal + cierre económico) va al final, cuando hay cadencia real que medir.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un día sin medir se lee como "sin AI Overview" y el cliente ve una caída que no ocurrió | serie viva de rank / confianza cliente | **high** | Slice 1 antes que Slice 2, sin excepción; test que falla si `not_measured` se serializa como `absent`; barrido de todos los consumers | Señal de cobertura de medición por target |
| Backfill deja la serie histórica en `NULL` y un reader estricto la lee como `not_measured` | data quality | medium | Backfill explícito a `measured` con dry-run + conteo esperado; la serie previa al corte SÍ se midió siempre | Conteo de filas por estado antes/después |
| Cambio de tipo de `aiOverview` rompe un consumer no barrido (PG y BQ tienen derivaciones separadas) | reader / pantalla ancla / mirror BQ | medium | Cambio de tipo deliberado para que el compilador encuentre los callsites; barrer PG **y** BQ (`rank-evolution-reader.ts:101` y `:130`) | `pnpm typecheck` + test del mirror |
| N≥3 se aplica a toda la matriz y triplica el costo del run | costo AEO | medium | Mapa cerrado dimensión→N poblado desde la calibración; test que asserta que el mapa no contiene dimensiones fuera de la lista | Costo estimado por run vs techo |
| El muestreo bypassea el techo de costo por run | costo AEO | low | El costo del muestreo entra en `estimatedCostUsd` **antes** del check de `run-engine.ts:285` | Corte del run en staging con muestreo excesivo |
| Un run truncado por costo se lee como completo (el corte no se persiste hoy) | evidencia AEO / score | **high** | Persistir el truncamiento en la fila del run + test que falla si un run cortado queda `succeeded` sin marca | Conteo de runs con corte por costo vs runs completos |
| Flags prendidos en un runtime y no en el otro | cross-runtime | **high** | `deploy.sh` como SoT + `--update-env-vars` + verificación en la revisión activa + fila del ledger con los runtimes nombrados | Divergencia de estado de medición entre días |
| Migración registrada sin ejecutar (pre-up-marker) | migration | low | `-- Up Migration` + bloque `DO` con `RAISE EXCEPTION` | La propia migración aborta |
| Ahorro celebrado sin medir porque el ledger no distingue quién consumió | economía del módulo | medium | `TASK-1696` es bloqueante (dimensión `seo`/`aeo` + gate USD); el cierre económico de Slice 4 usa el ledger, no la estimación | Comparación ledger vs estimación |
| Colisión de writer con `TASK-1699` sobre `parseSerpRankObservation` y el insert de snapshot | serie viva de rank | **high** | Orden de merge acordado antes de empezar; la que llegue segunda deja `## Delta` y adapta su slice de writer | Conflicto de merge o test del writer rojo |

### Feature flags / cutover

- `GROWTH_SEO_AIO_CADENCE_ENABLED` (default `false`). OFF ⇒ `load_async_ai_overview: true` diario,
  comportamiento idéntico al actual. Se lee en el **ops-worker** (donde corre el batch) y en el
  portal si hay disparo manual. Modo shadow controlado por
  `GROWTH_SEO_AIO_CADENCE_SHADOW_ENABLED` (default `false`, eval-only, no cambia el request).
- `GROWTH_AI_VISIBILITY_DIMENSION_SAMPLING_ENABLED` (default `false`). OFF ⇒ N=1. Se lee en el
  **ops-worker** (drain async + re-grade) y en el portal (run inline).
- ⚠️ **Multi-runtime, los tres.** SoT en `services/ops-worker/deploy.sh` (los `--set-env-vars` son
  destructivos) + aplicación en vivo con `gcloud run services update --update-env-vars` + Vercel +
  fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR, nombrando los runtimes.
- Revert: flags a `false` en todos los runtimes + redeploy. <10 min.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Columnas aditivas: revert PR del código. El backfill es idempotente y no destructivo (marca `measured` lo que se midió); revertirlo no es necesario. Reverse migration disponible. | <20 min | sí |
| Slice 2 | `GROWTH_SEO_AIO_CADENCE_ENABLED=false` en ops-worker + Vercel + redeploy. Los días ya saltados quedan como `not_measured` con razón — **evidencia correcta, no daño**. | <10 min | sí (los huecos no se rellenan: eso es lo honesto) |
| Slice 3 | `GROWTH_AI_VISIBILITY_DIMENSION_SAMPLING_ENABLED=false` + redeploy. Las observaciones extra quedan (append-only). | <10 min | sí |
| Slice 4 | Revert PR — señal + docs. | <10 min | sí |

### Production verification sequence

1. `pnpm migrate:up` en staging + verificar columnas vía `information_schema.columns`.
2. Backfill en staging: dry-run, comparar el conteo con el total de filas, apply, verificar cero
   filas en `NULL`.
3. Deploy con los tres flags en `false`: verificar que la serie y el costo son **idénticos** al día
   anterior (cambio aditivo puro).
4. Prender **sólo** el shadow de cadencia en staging; correr un ciclo semanal completo; medir el
   ahorro proyectado y el hueco de cobertura contra la serie real.
5. Revisar con el operador el hueco de cobertura antes de decidir la cadencia definitiva.
6. Flip de `GROWTH_SEO_AIO_CADENCE_ENABLED` en staging; verificar que los días saltados aparecen
   como `not_measured` con `reason: 'cadence_skip'` en PG **y** en el mirror BQ.
7. Verificar el gasto real en `seo_provider_spend_daily` contra la proyección.
8. Slice 3 en staging: run `full` con muestreo, verificar costo bajo el techo **por run**, las
   observaciones repetidas persistidas y que un run forzado a cruzar el techo queda **marcado como
   truncado** (no `succeeded` limpio).
9. Producción con cooldown de **7 días** entre ambientes (es una serie viva de cliente, no una
   feature nueva). Monitorear 30 días la señal de cobertura de medición.

### Out-of-band coordination required

- **Aviso al cliente / al AM antes del flip de cadencia.** La pantalla ancla va a mostrar días sin
  medición de AI Overview donde antes había un booleano. Es más honesto y se ve peor: hay que
  contarlo antes, no explicarlo después.
- Sign-off del operador sobre la cadencia elegida, con el dato de shadow a la vista (cuántas veces
  cambió de hecho el flag en 90 días).
- Los tres flags requieren acceso a Vercel y a Cloud Run.
- Recomputar el margen del cliente en `EPIC-022` con la cadencia nueva.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `seo_rank_snapshots` persiste las señales **pedidas** además de las encontradas, y el estado
      de medición del AIO con razón de enum cerrado.
- [ ] Existe un test que falla si un punto `not_measured` se serializa, agrega o renderiza como
      ausencia de AI Overview — en PG y en el mirror BigQuery.
- [ ] El backfill marcó `measured` toda la serie previa al corte, con conteo dry-run vs apply
      registrado.
- [ ] `RankEvolutionPoint.aiOverview` expone tri-estado y **todos** los consumers fueron barridos
      (`pnpm typecheck` verde sin `as any`).
- [ ] `load_async_ai_overview` se pasa desde `resolveAioCaptureDecision`, no hardcoded, y la
      política tiene versión.
- [ ] `depth` sigue siendo `SERP_RANK_CAPTURE_DEPTH = 20` y el conjunto de keywords no cambió.
- [ ] El shadow de cadencia corrió un ciclo semanal completo y su ahorro + hueco de cobertura están
      registrados en la task con números del ledger, no estimados.
- [ ] `samplingByDimension` contiene **sólo** las dimensiones nombradas por la calibración §5.bis, y
      hay un test que lo asserta.
- [ ] La semántica de N=3 (tres runs separados vs tres pasadas intra-run) quedó **declarada por
      escrito en la task** antes del primer cambio a `policy.ts`, con su consecuencia sobre
      allowance, techo por run, `maxPromptsPerRun`, idempotencia y agregación.
- [ ] Un run `full` con muestreo tiene `estimatedCostUsd` bajo `costCeilingUsdPerRun = 2` (techo
      **por run**), dimensionado contra el **peor run observado** (USD 1,4565), no contra el
      promedio de 3; si no cabe, el alcance del muestreo se redujo (y el techo NO se subió).
- [ ] Un run cortado por el guard de costo queda **marcado como truncado** en su fila y hay un test
      que falla si se guarda como `succeeded` sin marca.
- [ ] Las observaciones repetidas se persisten todas (append-only); la agregación ocurre en el
      scoring, no en el writer.
- [ ] Los tres flags están en `flags.ts`, en `services/ops-worker/deploy.sh`, verificados en la
      revisión activa del worker, y con fila en el ledger nombrando los runtimes.
- [ ] Existe la señal de reliability de cobertura de medición por target.
- [ ] El costo mensual por cliente fue recomputado con la cadencia nueva y registrado.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm vitest run src/lib/growth/seo src/lib/growth/ai-visibility`
- `pnpm test` (suite completa antes de cerrar)
- `pnpm build` (gate de cierre, con autorización del operador)
- `pnpm migrate:status` + verificación de columnas y del backfill en staging
- Ciclo semanal de shadow con evidencia registrada
- Corrida real del batch en staging + verificación del gasto en `seo_provider_spend_daily`
- `pnpm flags:audit --strict --no-vercel`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `TASK-1707` recibe un `## Delta` con el costo real de un run `full` con muestreo — su
      presupuesto de re-grade recurrente depende de ese número.
- [ ] `EPIC-022` recibe el costo variable por cliente recomputado.

## Follow-ups

- Representación visual del `not_measured` en la pantalla ancla de rank (task `ui-ux` derivada) —
  hasta que exista, el tri-estado vive sólo en el contrato.
- Cadencia adaptativa: medir AIO con más frecuencia en las keywords donde el flag cambió
  recientemente, y con menos donde lleva meses estable.
- Persistir el top-N de competidores del SERP que hoy se paga y se descarta (brecha S2 de la
  auditoría) — el multiplicador de `depth 20` ya está pagado.
- Extender el muestreo N≥3 a otras dimensiones sólo con evidencia de intermitencia medida, nunca
  por simetría.

## Open Questions

- ¿La cadencia por defecto del AIO es semanal por keyword, semanal escalonada, o dirigida por la
  cola priorizada de trabajo? La task propone semanal escalonada y exige medir primero cuántas
  veces cambió de hecho el flag en 90 días.
- ¿La cadencia debe ser configurable por el operador (⇒ nace capability + command) o es política del
  sistema en config versionada (⇒ V1 como está escrita)?
- ¿La calibración §5.bis nombra dimensiones además de la colisión de entidad? Hay que leerla
  literalmente al tomar la task; el mapa `samplingByDimension` se puebla desde ahí, no desde
  criterio propio.
