# Evaluar la transición a DataForSEO Improved ETV

## Estado y alcance

Este runbook describe la evaluación y el cutover que ejecutó `TASK-1806`. **Leerlo no autoriza llamadas a
DataForSEO, flags, deploys ni un nuevo cutover.** La foundation (`TASK-1805`) está **en producción** desde el
2026-09-03 (release `5ec4cf769977`) —policy, schema formula-aware con el contract aplicado, writers/readers/API/MCP
formula-aware, señal de drift y evaluador dry-run—. **Estado al 2026-09-03:** el shadow `exact_ab` se ejecutó y
evaluó, el operador aprobó **rebaseline** y **cutover**, y la selección productiva pasó a
`improved_layout_clickstream_v2` en los dos selectores: ops-worker vivo (revisión `ops-worker-00636-h6w`), Vercel
`production`+`staging` con los valores en improved (staging verificado con drill de rollback), producción Vercel
efectiva al `READY` del release `bda12be7e33a-4bb99ca1-8077-451a-9611-5929f933a990` (run `33758619690`, manifest `released` 13:14Z, canary 13:15:26Z). Ver «Resultado y decisión ejecutada», «Cutover
ejecutado» y «Rollback vigente» más abajo. Todo debe respetar
`GREENHOUSE_DATAFORSEO_ETV_METHOD_VERSIONING_DECISION_V1.md`.

Comandos de la foundation que este runbook usa:

```bash
# Dry-run del evaluador: plan + forecast + replay de fixtures + ledger intacto (cero llamadas)
npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-task-1805-etv-evaluator.ts
# Sanity del schema formula-aware (transacción con rollback; el contract que ejercita ya está aplicado desde 2026-09-03)
npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-task-1805-etv-schema.ts
```

Readback del método por runtime: `GET /health` del ops-worker (`etvMethodology.configuredWriteMethod`,
`configuredWriteSource`, `policyVersion`) y la señal `seo.etv_methodology.drift` en `/admin/operations`, que
compara lo configurado con la última request explícita persistida por el worker y por Vercel.

### Comandos del shadow (`TASK-1806`, Slices 1 y 2)

Los dos CLIs corren **desde un proceso local del operador** con el proxy Cloud SQL arriba, ADC vigente y las
credenciales DataForSEO en el proceso. Los cuatro knobs del evaluador se exportan **sólo en ese proceso**; en
Vercel y en el ops-worker `GROWTH_SEO_ETV_EVALUATOR_ENABLED` sigue OFF y no se toca (ledger de flags).

```bash
# Knobs del evaluador — SÓLO en el proceso del script (caps aprobados en el preregistro 2026-09-03 §7)
export GROWTH_SEO_ETV_EVALUATOR_ENABLED=true
export GROWTH_SEO_ETV_EVALUATOR_SUBJECT_ALLOWLIST=berel.com,comex.com.mx,efeoncepro.com
export GROWTH_SEO_ETV_EVALUATOR_MAX_REQUESTS=30
export GROWTH_SEO_ETV_EVALUATOR_BUDGET_USD=2.00

# 1) Ejecutor bounded — DRY-RUN (default): plan, forecast, caps, contract de schema, idempotencia del día
#    y entitlement por organización. providerCalls=0, ledger intacto.
npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/dataforseo-etv-shadow.ts --dry-run

# 2) Ejecutor bounded — CORRIDA REAL (GASTA). Exige --execute explícito + gate ON + allowlist + caps.
#    --execute y --dry-run son excluyentes.
npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/dataforseo-etv-shadow.ts --execute \
  [--cohort=scripts/growth/etv-shadow-cohorts/2026-09-03-preregistered.json] \
  [--artifact-dir=.captures/etv-shadow/<YYYY-MM-DD>-<cohortId>]

# 3) Evaluador/decisor — CERO llamadas al proveedor. Requiere GROWTH_SEARCH_CONSOLE_ENABLED=true en el env del CLI.
GROWTH_SEARCH_CONSOLE_ENABLED=true npx tsx --require ./scripts/lib/server-only-shim.cjs \
  scripts/growth/dataforseo-etv-shadow-evaluate.ts \
  --cohort=scripts/growth/etv-shadow-cohorts/2026-09-03-preregistered.json \
  --capture-date=<YYYY-MM-DD de la corrida> \
  --summary=<artifact-dir>/summary.json \
  [--evaluation-date=YYYY-MM-DD] [--out=<md>] [--json=<json>]
```

Qué hace cada uno y cómo leer su salida:

- **Ejecutor (`scripts/growth/dataforseo-etv-shadow.ts` → `src/lib/growth/seo/etv-methodology/shadow-runner.ts`).**
  Lee la cohorte committeada (`scripts/growth/etv-shadow-cohorts/2026-09-03-preregistered.json`, 13 celdas) y,
  por celda, compra las **dos** fórmulas en la misma ventana con inputs byte-idénticos salvo `use_improved_etv`
  (hash de inputs sin el flag por request; `exact_ab`). El orden dentro de cada celda es **improved primero,
  legacy después**: la señal `seo.etv_methodology.drift` compara el selector del runtime (legacy) con la última
  request explícita persistida del día, y dejar legacy al final evita reportar un drift que no existe. Se detiene
  **antes** de la primera llamada si el gate está OFF, un sujeto no está en el allowlist, los caps no alcanzan, la
  policy falla o la UNIQUE legacy sigue en la base (contract no aplicado); durante la corrida aborta la corrida
  **completa** (no sólo la celda) ante cap de requests/USD, `EtvMethodologyPolicyError`, drift
  `requested ≠ providerEffective`, `status_code != 20000` en ambas fórmulas de una celda, breaker abierto, error
  de transporte o conflicto al persistir. Una re-corrida el mismo día marca la celda `already_captured` y no
  re-compra. Persiste con los writers canónicos de `TASK-1805` (la celda prospecto `ranked_keywords` limit 1000
  **no** persiste: vive sólo en el summary). Artefactos en `.captures/etv-shadow/<run>/raw/*.json` (respuestas
  crudas) + `summary.json`. Con `--execute` reconcilia el ledger `seo_provider_spend_daily` (`labs`, hoy)
  antes/después contra el costo real del summary (tolerancia 0,000001) y sale con código ≠ 0 si no ejecutó, abortó
  o el ledger no cuadra. Dry-run del 2026-09-03 sobre la cohorte preregistrada: 13 celdas, 26 requests, forecast
  USD 1,14384, `wouldExecute=true` con los cuatro knobs exportados, `providerCalls=0`.
- **Lectura de `summary.json`.** `runId`, `cohortId`, `mode`, `startedAt`/`finishedAt`, `executed`, `reasons[]`,
  `policyVersion`, `caps`, `totals` (`requests`, `costUsd`, `forecastUsd`, `aborted`, `abortReason`) y
  `requests[]` con, por request: celda, familia, sujeto, metodología, `requested`/`providerEffective`/`requestedAt`,
  `taskHashWithoutFlag`, `status` (`executed` | `already_captured` | `skipped_after_abort`), `statusCode`, `ok`,
  `costUsd`, `latencyMs`, `persisted` (tabla, filas, conflicto), `historicalBasis`, `prospectTraffic` y
  `errorCode`. Un `aborted=true` con `abortReason` es evidencia, no un fallo silencioso: la corrida y su costo se
  conservan.
- **Evaluador (`scripts/growth/dataforseo-etv-shadow-evaluate.ts` → `shadow-report.ts` + `shadow-decision.ts` +
  `shadow-report-markdown.ts`).** Lee de la base ambas metodologías del `capture_date` **por separado** (nunca una
  serie mixta), el `summary.json` (latencia, costo, equivalencia de inputs, celda prospecto) y el benchmark GSC
  first-party sólo para dominios propios con propiedad activa: ventana de 28 días terminando dos días antes de la
  fecha de evaluación (GSC no publica D-1), país = mercado, todos los dispositivos, normalizada a mensual ×30/28;
  se compara, nunca se promedia. Aplica los umbrales congelados del preregistro §5
  (`PREREGISTERED_ETV_SHADOW_THRESHOLDS_2026_09_03` en `shadow-decision.ts`, una función por regla; cambiarlos
  exige una versión nueva del preregistro) y escribe el artefacto de decisión: Markdown en
  `docs/audits/seo/etv-shadow/<capture-date>-<cohortId>-results.md` (default `--out`) y `evaluation.json` junto al
  summary (default `--json`).
- **Lectura de `evaluation.json` / del Markdown.** `decision.decision` ∈ `go_rebaseline | go_breakpoint | hold |
  no_go` con `historicalTreatment` (`rebaseline` | `breakpoint` | `null`), `findings[]` (severidad, código,
  celda, detalle) y `rationale[]`; `inputsEquivalent` (todas las celdas con summary comparten hash de inputs y
  `requested = providerEffective`); `cells[]` con validez y métricas **por celda**, no sólo promedio; `cost`
  (`forecastUsd` vs `realUsd`), `latency` y `declarations[]`. Efeonce CL (celda de borde) sólo produce hallazgos
  `info`: no veta ni certifica. `no_go` y `hold` son **resultados**, no fallos: el script sale con 0 y sale con 1
  sólo si no pudo evaluar. Ningún resultado autoriza por sí mismo el cutover: rebaseline/breakpoint y cutover son
  sign-offs separados (preregistro §7).

## Objetivo

Determinar si `improved_layout_clickstream_v2` mejora la utilidad y calibración de ETV para Greenhouse sin romper
series históricas, cambiar silenciosamente el conjunto top-N ni exceder el gasto aprobado.

## Preconditions obligatorias

No iniciar una prueba con proveedor hasta que todas estén satisfechas:

1. La respuesta DataForSEO del 2026-09-02 está incorporada; Sandbox/OpenAPI pendientes son no bloqueantes.
2. `TASK-1805` está completa y verificada; `TASK-1806` fue tomada mediante el operating loop y su plan fue aprobado.
3. Policy y allowlist fallan cerrado (`buildEtvMethodologyRequest`, `resolveEtvEvaluatorConfig`); el
   transporte genérico sigue neutral.
4. ✅ **Cumplida el 2026-09-03.** El expand de schema está aplicado y el **contract** se ejecutó tras el release
   (migración `migrations/20260903103858964_task-1806-etv-methodology-contract.sql`; readback: UNIQUE legacy
   `seo_domain_overview_capture_unique` / `seo_url_visibility_capture_unique` retiradas, 0 de 6 DEFAULT
   transitorios, CHECK `seo_prospect_facts_etv_methodology_check` presente, 0/0/0 filas contractuales escritas
   después del release). Sin él la coexistencia legacy/improved por sujeto/día seguía cerrada y el shadow
   persistido chocaba con la UNIQUE legacy; el preflight del ejecutor lo sigue verificando antes de la primera
   llamada.
5. Readers productivos siguen fijados a legacy (`GROWTH_SEO_ETV_READ_METHODOLOGY_VERSION` ausente o
   `legacy_static_v1`) y rechazan series mixtas. *(Precondición del shadow, vigente hasta el cutover del
   2026-09-03; desde entonces ambos selectores están en `improved_layout_clickstream_v2`.)*
6. `/health` del ops-worker y la señal `seo.etv_methodology.drift` reportan la misma configuración
   (`source: env`, no `default`); el dry-run muestra método, requests previstas y `providerCalls=0`.
7. Existe un presupuesto máximo en USD aprobado por el operador. Sin monto aprobado, sólo fixtures/replay.
   (Caps 30 requests / USD 2,00 aprobados el 2026-09-03 en el preregistro §7; el permiso para ejecutar la corrida
   pagada es un acto aparte del operador; se ejerció el 2026-09-03 ~11:05Z por instrucción explícita en chat.)
8. Se definieron ventana, propiedades GSC, países, dispositivos y tratamiento de datos faltantes antes de mirar
   resultados.
9. El calendario interno preserva margen: foundation objetivo 2026-10-15, shadow/decisión 2026-10-23 y cutover
   objetivo 2026-10-28T00:00:00Z. El corte externo final es 2026-11-01T00:00:00Z.

## Nivel 0 — validación sin gasto

Usar fixtures oficiales o respuestas sintéticas versionadas para probar:

- inventario de 14 familias y payload exacto para los nueve callers actuales;
- guard de clasificación: seis familias/siete caminos `etv_consumed`, tres callers `etv_ignored` y cinco
  `provider_supported_not_enabled`;
- rechazo de endpoint/método inválido;
- convivencia legacy/improved para mismo sujeto/mercado/fecha;
- freshness e idempotencia por método;
- lectura de una sola metodología y error ante mezcla;
- propagación hacia API, MCP, provenance, traffic cost y diagnóstico de prospecto;
- cambio de membresía en relevant pages/subdomains;
- dry-run con `providerCalls=0`.

Resultado permitido: **compatibilidad técnica**, nunca “improved es más exacto”.

## Nivel 1 — diseño de cohorte

La cohorte mínima propuesta combina datos propios observables y presión competitiva:

| Celda | Mercado | Sujeto | Propósito |
|---|---|---|---|
| Efeonce propio | CL / es | dominio y URLs clave | comparar con GSC first-party |
| Efeonce competidor | CL / es | un dominio comparable aprobado | sensibilidad competitiva |
| Berel propio | MX / es | dominio y URLs clave | comparar con GSC a otra escala |
| Berel competidor | MX / es | un dominio comparable aprobado | top-N y concentración |

La muestra debe contener dominios grandes y pequeños, intención informational/commercial/local y SERPs con/sin
AIO cuando el proveedor permita clasificar esas features. No agregar clientes, marcas ni mercados sin aprobación
del owner y revisión del presupuesto.

Para cada celda se congela antes de ejecutar:

- endpoint, sujeto normalizado, location/language, dispositivo y fecha;
- límites, orden y filtros exactos;
- método solicitado;
- costo cotizado y tope acumulado;
- propiedad/ventana GSC comparable, cuando existe;
- hipótesis y criterio de decisión.

## Nivel 2 — modos de ejecución

### Canary sin gasto incremental

Sustituye una captura ordinaria interna por improved; no agrega una llamada. Producción sigue leyendo legacy.

Ventaja: controla costo. Limitación: no produce legacy e improved simultáneos y confunde fórmula con cambio
temporal. Debe registrarse como `temporal_canary`, no como A/B.

### A/B exacto con gasto autorizado

Ejecuta dos requests normales con el mismo input lógico, uno por método, dentro de la misma ventana. Improved no
tiene premium, pero el A/B duplica llamadas. `include_clickstream_data` no se activa para esta evaluación salvo
objetivo y presupuesto separados: es independiente y conserva precio ×2.

Detener antes de la primera llamada si el costo no puede estimarse, el método no puede fijarse explícitamente o el
request legacy ocurriría desde el corte. El provider no devuelve formula version: guardar request UTC y policy.

## Comparación

### Contra GSC

GSC se compara sólo para dominios propios y ventanas equivalentes. Registrar por celda:

- ETV legacy, ETV improved y clicks GSC;
- diferencia absoluta y relativa;
- dirección de cambio y estabilidad entre períodos;
- cobertura de queries/URLs y cualquier truncamiento;
- país, dispositivo y propiedad.

Evaluar error de calibración, orden/correlación y consistencia direccional. No promediar GSC con ETV ni usar GSC
para certificar competidores.

### Dentro de DataForSEO

Comparar además:

- ETV orgánico/paid y `estimated_paid_traffic_cost`;
- top keywords;
- relevant pages/subdomains: intersección, entradas, salidas y cambios de posición;
- histórico del mismo período, si el provider permite ambas fórmulas;
- `calculation_basis`: `fully_recomputed` desde julio de 2026 o `calibrated_approximation` antes;
- suma del prospecto, número de filas y señal de truncamiento.

Un cambio de membresía es un resultado de primera clase; no se reduce a porcentaje de variación del ETV.

## Pre-registro de decisión

Antes de gastar, completar una tabla con umbrales acordados. No inventar precisión sin baseline. Versión
congelada vigente: [preregistro 2026-09-03](../../audits/seo/2026-09-03-dataforseo-improved-etv-shadow-preregistration.md)
§5 (umbrales en código: `PREREGISTERED_ETV_SHADOW_THRESHOLDS_2026_09_03`); la tabla de abajo es la plantilla
genérica.

| Criterio | Umbral aprobado | Evidencia | Resultado |
|---|---|---|---|
| Calibración contra GSC | preregistro §5.1 | berel.com · GSC 30.898 clics/mes (28 d ×30/28) | ✅ improved err. rel. 49,4 % vs legacy 321,3 % |
| Regresión máxima por cliente ancla | ±40 % sin cambio equivalente de `organic.count` (§5.2) | Berel −64,5 % con count 630 → 630 | ⚠️ se dispara por construcción en un A/B exacto (el count no puede cambiar); explicado en el memo como efecto de fórmula |
| Estabilidad de ranking/membresía | Jaccard ≥ 0,8 (§5.2) | `relevant_pages` (66) y `subdomains` (3) de Berel | ✅ Jaccard 1,0; 0 entradas/salidas |
| Costo total | 30 requests / USD 2,00 (§7) | dry-run USD 1,14384 + ledger `labs` | ✅ 26 requests / USD 1,09536; ledger cuadra |
| Contrato histórico | rebaseline o breakpoint | historia 2026-04..09 de Berel en las dos bases | ✅ continua (salto 0,1 % vs mediana mensual 8,1 %) → rebaseline |

Go requiere que improved cumpla todos los criterios registrados. Un promedio favorable no compensa una regresión
material no aceptada en un cliente ancla. Si la evidencia es inconclusa, el resultado es `hold`, no cutover.
Resultado de la corrida del 2026-09-03: decisión mecánica `hold` **sólo** por la regla §5.2; el memo de decisión
la explica y recomienda `go_rebaseline`; el operador aprobó rebaseline y cutover ese mismo día (ver «Resultado y
decisión ejecutada»).

## Decisión histórica

- Elegir **rebaseline** sólo con costo aprobado, almacenamiento separado y disclosure de que pre-julio es una
  aproximación calibrada, no recomputación keyword-level.
- En otro caso, declarar **breakpoint** con fecha/hora, mantener segmentos separados y deshabilitar deltas que
  crucen el quiebre.
- Nunca reetiquetar filas por fecha ni sobrescribir evidencia append-only.

## Rollout (secuencia prescrita; ejecutada el 2026-09-03 — ver «Cutover ejecutado»)

1. Fixtures/replay verdes.
2. Expand de schema verificado en staging; readers aún legacy.
3. Deploy con selector legacy explícito y señales de drift.
4. Canary/A-B bajo presupuesto y write path separado.
5. Decisión documentada y aprobación humana.
6. Cutover de writer, luego reader, en staging; verificar método efectivo derivado y serie persistida.
7. Repetir en producción con observación y stop conditions.

Stop conditions:

- `configured_method != requested_method != provider_effective_method`;
- request legacy en o después de 2026-11-01T00:00:00Z;
- filas nuevas sin metodología o una serie mixta;
- costo proyectado/real supera el tope;
- default del proveedor no verificable;
- regression no aceptada o cambio top-N inexplicable;
- Vercel y ops-worker divergen.

## Resultado y decisión ejecutada (2026-09-03)

- **Corrida:** run `etvshadow-f3fef9b3c2a8`, modo `exact_ab`, 26/26 requests con `status_code 20000`, USD
  **1,09536** real (forecast 1,14384), ledger `labs` del día cuadra. Autorización explícita del operador en chat.
- **Evaluación con GSC (berel.com, 30.898 clics/mes):** improved err. rel. **49,4 %** vs legacy **321,3 %**;
  Jaccard **1,0** en `relevant_pages` y `subdomains` (0 entradas/salidas); historia 2026-04..09 **continua**
  (salto del ratio 0,1 % vs variación mediana 8,1 %); efecto de escala ≈ **−60 %** (Berel −64,5 %, Comex −52 %);
  prospecto Comex −43,9 %.
- **Decisión:** el evaluador emitió `hold` **sólo** por la regla §5.2 (dispara por construcción en un A/B exacto:
  el `organic.count` es idéntico en las dos requests); el memo la explica y recomienda `go_rebaseline`; el
  operador **aprobó rebaseline y cutover** el 2026-09-03.
- **Tratamiento histórico aplicado: rebaseline versionado.** La serie servida es improved; cada fila declara
  `etv_historical_basis` (`fully_recomputed` desde 2026-07, `calibrated_approximation` antes); `breakpointDate`
  sigue `null` (un reader sirve una sola metodología). Berel ya tiene historia improved 2026-04..2026-09 gracias al
  shadow; un sujeto sin fila improved responde `not_available_for_method` hasta su próxima captura (cron del día
  16/17). Nada se borró: las filas legacy siguen como evidencia append-only.
- **Corrección de cohorte:** `efeoncepro.com` se mide **aparte** (su organización, mercado CL, su propio GSC),
  nunca dentro de una consulta de un cliente; la celda bulk v1 que lo metió en MX bajo la org de Berel quedó
  anulada como evidencia (append-only, no llega a ninguna superficie). Cohorte vigente
  `scripts/growth/etv-shadow-cohorts/2026-09-03-preregistered-v2.json`; `assertEtvShadowCohort` rechaza un bulk
  que mezcle organizaciones.
- **Artefactos:** [resultados](../../audits/seo/etv-shadow/2026-09-03-2026-09-03-preregistered-results.md) ·
  [memo de decisión](../../audits/seo/etv-shadow/2026-09-03-2026-09-03-preregistered-decision-memo.md) ·
  [preregistro](../../audits/seo/2026-09-03-dataforseo-improved-etv-shadow-preregistration.md). Crudos y
  `summary.json`/`evaluation.json` en `.captures/etv-shadow/…` (gitignored, conservados localmente).

## Cutover ejecutado (2026-09-03)

Pasos hechos, en orden; cada uno con su readback:

1. **ops-worker (writer + reader, por contrato único).** `services/ops-worker/deploy.sh` declara
   `GROWTH_SEO_ETV_METHODOLOGY_VERSION` y `GROWTH_SEO_ETV_READ_METHODOLOGY_VERSION` con default
   `improved_layout_clickstream_v2` (commit `d2ebdb8f3`; `deploy-contract.test` 16/16). Ops Worker Deploy del push a
   `develop` (run `33753088068`) → revisión activa `ops-worker-00636-h6w`, `GIT_SHA=d2ebdb8f3…`. Readback: `GET
   /health` → `etvMethodology.configuredWriteMethod=configuredReadMethod=improved_layout_clickstream_v2`,
   `source=env`, `valid=true`. Dry-run de `/seo/url-visibility/capture-batch` y `/seo/domain-overview/capture-batch`
   con la identidad del scheduler: 2 targets `skipped` (sujetos frescos bajo improved gracias al shadow), costo 0.
2. **Vercel env.** Los dos selectores = `improved_layout_clickstream_v2` en `production` y `staging`; valores
   verificados con `vercel env pull` (no sólo presencia).
3. **Staging.** `vercel redeploy` → los lanes ecosystem `domain-overview` y `url-visibility` de Berel sirven
   `etvMethodology.version=improved_layout_clickstream_v2`, `evidence=explicit_request`,
   `availableMethodologies=[improved, legacy]`, `comparability=single_methodology`.
4. **Drill de rollback pre-corte (staging).** Selectores a `legacy_static_v1` + redeploy → los lanes sirven
   `legacy_static_v1`; improved restaurado + redeploy → improved otra vez. Ninguna fila se borró ni se reescribió.
5. **Producción.** PR #218 `develop→main` squash-mergeado (`main=bda12be7e33af93906805054146c5e17a8b9c328`); build
   de Vercel Production con los selectores improved horneados; orquestador `production-release.yml`
   `release `bda12be7e33a-4bb99ca1-8077-451a-9611-5929f933a990` (run `33758619690`, manifest `released` 13:14Z)` (release_id / run id se completan al dispatch). Producción Vercel sirve improved
   desde el `READY` de ese release; hasta entonces los lanes de producción siguen en `legacy_static_v1`.
6. **Señal `seo.etv_methodology.drift`:** `warning` mientras las filas contractuales del 27–29/08 sigan dentro de la
   ventana de 7 días; esperado `ok` cuando el worker escriba su primera fila explícita improved (cron 16/17). Un
   `error` sí bloquea.

Readback pendiente al cierre de este runbook: lanes de **producción** de Berel sirviendo improved tras el `READY`
del release `bda12be7e33a-4bb99ca1-8077-451a-9611-5929f933a990` (run `33758619690`, manifest `released` 13:14Z, canary 13:15:26Z).

## Rollback vigente

- **Antes del corte del proveedor (2026-11-01T00:00:00Z):** poner los dos selectores en `legacy_static_v1` en
  Vercel `production` **y** `staging` (`vercel env`) y en `services/ops-worker/deploy.sh` (nunca sólo con
  `--update-env-vars`: el próximo deploy lo borra), luego `vercel redeploy` y deploy del worker; verificar `GET
  /health` del worker y los lanes ecosystem sirviendo `legacy_static_v1`. Conservar ambas series y comprobar el
  request explícito. Este drill se ejercitó en staging el 2026-09-03.
- **Desde el corte:** no existe rollback legacy (`false` se ignora): activar **safe mode** —la policy falla cerrado
  ante legacy configurado desde el corte, se detienen las capturas ETV nuevas y se sirve la última serie comparable
  con estado degradado—. No borrar improved ni recomputar legacy localmente.

## Registro de evidencia

El cierre debe enlazar:

- preregistro congelado (cohorte, inputs, umbrales, caps, forecast, sign-offs):
  [2026-09-03-dataforseo-improved-etv-shadow-preregistration.md](../../audits/seo/2026-09-03-dataforseo-improved-etv-shadow-preregistration.md);
- respuesta/ticket oficial del proveedor;
- plan aprobado y monto máximo;
- matriz congelada de requests;
- dry-run con llamadas/costo;
- `summary.json` de la corrida y artefacto de decisión (`docs/audits/seo/etv-shadow/<capture-date>-<cohortId>-results.md`
  + `evaluation.json`); corrida 2026-09-03: `…/2026-09-03-2026-09-03-preregistered-results.md` + `…-decision-memo.md`;
- resultados por celda, no sólo promedio;
- decisión rebaseline/breakpoint;
- readback de staging y producción;
- rollback pre-corte ejercitado y safe mode post-corte verificado.
