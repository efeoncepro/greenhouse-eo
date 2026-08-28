# TASK-1700 — Growth SEO: la cola priorizada de trabajo es un aggregate persistido con score versionado

## Delta 2026-08-28 (3) — dependencia DURA nueva: `TASK-1792` bloquea el cutover del Slice 7

Al implementar el Slice 2 se midió la curva de CTR real de las dos organizaciones con serie y
apareció un defecto vivo del reader legacy que **convierte el plan de rollback de esta task en una
suposición**:

`expectedCtrAt` (`keyword-opportunities-reader.ts`) hace `if (typeof measured === 'number') return
measured`, así que **un `0` medido pasa el guard** y anula el fallback. Con la curva de
`efeoncepro.com` (bucket 5 = **75 impresiones, 0 clics**) eso da `targetCtr = 0`, y entonces
`max(0, 0 − ctr)` es idénticamente 0 para toda fila: el score queda CONSTANTE y el `.sort()` por ese
campo es un **no-op**. La lente no ordena mal — no ordena. Es la doctrina ●/◑ violada en su centro:
ausencia de evidencia tratada como evidencia de cero.

**Por qué es dependencia y no nota:** los Slices 5 y 7 declaran el rollback como *"flag a `false` en
Vercel + redeploy → la lente vuelve al reader legacy"*. Ese destino hoy no ordena, y falla **sin
aviso**. Un rollback cuyo destino no está verificado no es un rollback.

🔴 **Los Slices 1 y 2 de `TASK-1792` deben estar en `main` ANTES del cutover del consumer (Slice 7).**
Los Slices 3 y 4 de esa task (unificar las dos curvas, recalibrar el `FALLBACK_CTR_CURVE`) no
bloquean nada de acá.

Un matiz acota el bloqueo, y **uno que parecía acotarlo no resiste la medición**:

- ✅ El rollback **restaura el statu quo ante**: el peor caso es "vuelve a estar como antes de
  TASK-1700", no "queda peor por culpa de TASK-1700".
- ❌ **NO vale decir "hoy muerde en 1 de 2 orgs".** Esa cuenta es una muestra de dos, no una tasa,
  y el disparador —bucket objetivo con ≥10 impresiones y **0 clics**— está **garantizado en todo
  target recién onboardeado** y en todo sitio de bajo tráfico durante sus primeras semanas de serie.
  Hay dos organizaciones porque el módulo es nuevo, no porque el defecto sea raro: **cada cliente
  que entre nace en el estado de `efeoncepro.com`** y sale de él sólo cuando acumula clics
  suficientes. El alcance honesto es *"todas las orgs nuevas, más las de bajo tráfico, hasta que
  acumulen muestra"*.
- ❌ **Tampoco vale decir que la lente de `berel.com` "está intacta".** Su curva es sana, pero de
  sus 1.798 filas striking en 28 días **1.445 quedan en `gain = 0` (el 80 %)** con techo máximo 31:
  discrimina sobre una quinta parte de lo que muestra. Curva sana ≠ lente intacta.

  *(Las dos correcciones son medición de `greenhouse-eo-63`, 2026-08-28; la primera versión de este
  Delta afirmaba ambas cosas y se pasaba de la evidencia.)*

**Esta cola NO hereda el defecto** (`isCurveUsableAtPosition` exige impresiones **y** clics, así que
un bucket sin clics nunca llega a ser un CTR esperado: cae a banda 2 con score `NULL`), y su umbral
—≥1000 impresiones y ≥5 clics— es la referencia canónica que `TASK-1792` adopta.


## Delta 2026-08-28 (2) — DESBLOQUEADA: el último bloqueador cerró

`TASK-1692` cerró (`code complete, rollout pendiente`), así que `Blocked by` pasa a `none`:
`TASK-1699` ya estaba satisfecho en código desde el 2026-08-28 y era el único otro.

Lo que la cola hereda y **no** debe reinventar:

- 🔴 **El principio que su `recordSeoWorkQueueDecision` obedece ya está vigente:** el hecho lo
  escribe el PRIMITIVE que lo produce, jamás el consumer. La frontera es nítida y la cola **no
  inventa una tercera categoría**: `record_action` para lo que una persona decide sin que ningún
  command lo produzca; el primitive para lo que un command produce. Si la cola escribiera su propio
  log de las mismas decisiones, abriría el segundo libro sin transacción que los reconcilie — que
  es exactamente lo que esta dependencia existía para evitar.
- **Hay una variante transaccional lista:** `appendDiscoveryActionTx(client, input)` participa de la
  transacción del caller. Un log de decisiones de la cola que deba ser atómico con su outcome usa
  ese shape, no uno nuevo.
- **La idempotencia se deriva del outcome DURABLE**, nunca de `actor`: la clave automática colapsa
  dos decisiones distintas de la misma persona en una sola fila.
- **Los grados de atomicidad se DECLARAN.** Cuando un outcome vive en otra conexión y no se puede
  ser atómico, se dice en el contrato (`decisionLogged: false` + aviso), no se calla ni se resuelve
  tumbando el outcome caro.

⚠️ **Salvedad de rollout, vigente para las DOS dependencias:** ni `TASK-1694` ni `TASK-1692` se han
promovido a producción. No tomes el primer snapshot contra un runtime que todavía sirva el contrato
viejo — verifica la promoción antes de arrancar el Slice 1.


## Delta 2026-08-28 — el bloqueo duro de `TASK-1694` quedó levantado (con una salvedad)

`TASK-1694` cerró como **`code complete, rollout pendiente`**. Lo que la cola necesitaba que
existiera antes de su primer snapshot ya existe en el contrato de lectura:

- **La unidad puntuable es la keyword normalizada, no la fila de procedencia** — es contrato del
  reader (`candidateIds[]` + `provenance[]`, `totalCandidates` cuenta keywords distintas), no
  convención de la UI. Un `priority_score` por procedencia habría persistido la misma decisión hasta
  cuatro veces, con cuatro compromisos de gasto sobre una sola intención, en una tabla append-only.
- **La barrera de enlaces es filtrable y canónica** (`maxLinkBarrier` + `includeUnknownBarrier`);
  `maxDifficulty` se acepta pero ya no decide y viaja declarado en `ignoredFilters`. Medido sobre el
  store real: 764 de 923 filas marcan `keyword_difficulty = 0`, así que ordenar o filtrar la cola
  por esa cifra en es-LATAM no discriminaba nada.
- **`clusterConflict`** está disponible como factor/advertencia por candidato, derivado al leer y
  sin gasto de proveedor.

⚠️ **Salvedad antes del primer snapshot:** el contrato está corregido en código y verificado contra
PG real, pero `TASK-1694` todavía no se promovió a producción. No tomes el primer snapshot contra un
runtime que aún sirva el contrato viejo — verifica la promoción antes de arrancar el Slice 1.

## Delta 2026-08-28 (release a producción) — la cadena de productores del origen `competitor_gap` ya corre en runtime

El release `develop→main` `c983be7f18e68602404567a19ac8e7e0f157f742` (PR #208, release_id
`c983be7f18e6-92b1b327-a1c9-4e7a-85dc-6a5e300f4e32`, run `33178544139`, manifest `released`,
watchdog `ok` / `drift_count=0`) invalida el supuesto de los dos Deltas anteriores de que la cadena
está «en código pero no desplegada»:

- Migraciones de `TASK-1662` y `TASK-1699` aplicadas en la instancia única de Cloud SQL
  (`pnpm pg:connect:status` → `No migrations to run!`).
- `GROWTH_SEO_COMPETITOR_GAP_ENABLED` y `GROWTH_SEO_SERP_TOP_RESULTS_ENABLED` ON en la revisión
  activa del ops-worker `ops-worker-00610-kc8`; el segundo también en Vercel Production (lectura),
  verificado con canary (`serp-top-results` → `ok:true`).
- Scheduler `ops-seo-competitor-coverage` `ENABLED`.
- `get_seo_keyword_gap`, `get_seo_serp_top_results` y `get_seo_competitor_candidates` federadas en
  `mcp.efeonce.org` (revisión `efeonce-mcp-gateway-00024-8b8`, inventario 21 → 27 tools SEO).

**Consecuencia para esta task:** el origen `competitor_gap` ya no nace desactivado «porque no hay
productor desplegado» — el productor existe y corre. Sigue en pie, en cambio, la **maduración de la
serie**: el día 1 del top-N es el **2026-08-29** (cron 05:00 CLT) y `readSerpCompetitorCandidates`
necesita **≥5 días** de captura antes de proponer candidatos. El `Blocked by` no cambia:
`TASK-1694` sigue siendo el bloqueo DURO.

## Delta 2026-08-28 — el origen `competitor_gap` ya tiene contrato de productor (TASK-1662)

`readKeywordGap` (`src/lib/growth/seo/keyword-gap-reader.ts`) existe y entrega exactamente lo
que este aggregate necesita para el origen `competitor_gap`: hechos + factores con
procedencia y fecha (`searchVolume` ◑, `cpcUsd`, `linkBarrier`, `serpFeatures` como lista,
`attainablePositionBand` `link_barrier_v1`), en orden NEUTRAL y **sin score propio** — la
combinación y los pesos siguen siendo de esta cola (`priority_score_version`). Detalles que
esta task debe respetar al consumirlo:

- `evidence_ref` opaca: `seo:competitor_gap:<coverage_run_id>` (el reader expone
  `coverage.coverageRunId`); nunca FK/JOIN a las tablas de cobertura.
- El reader YA excluye keywords con impresiones GSC (28d) — el invariante "sin demanda
  medida no hay score" recibe del gap sólo candidatos banda 3 (o banda 2 si la cola decide
  re-medir), jamás duplicados de `gsc_striking_distance`.
- `declaredTargets` NO entra como hallazgo del gap: es el origen `declared_target`.
- `coverage.state = 'no_coverage'` o `stale: true` ⇒ `origin_health_json.competitor_gap`
  `degraded/down` con razón; el rollout de cobertura sigue gated (flag OFF, TASK-1662
  `code complete, rollout pendiente`), así que el origen nace declarado y desactivado tal
  como esta spec ya manda.

## Delta 2026-08-28 — TASK-1699 quedó code complete: el origen `competitor_gap` tiene TODA su cadena de productores en código

`TASK-1699` quedó **code complete, rollout pendiente** (`in-progress/`, en develop `fdfdedbe5`):
tabla `seo_serp_top_results` append-only, parser hermano `parseSerpTopResults` con costo marginal
cero, cableado en el rank capture tras `GROWTH_SEO_SERP_TOP_RESULTS_ENABLED` (ON declarativo), y
`readSerpCompetitorCandidates` — el **PROPOSE** del loop de competidores (recurrencia medida,
umbrales versionados 30d/3kw/5días, `proposalRef` `serp_top:v1:*`; el execute es
`declareCompetitors` de `TASK-1662` tras confirmación humana). Con eso el origen `competitor_gap`
tiene toda su cadena de productores en código: descubrimiento (1699) → declaración (1662) →
cobertura (1662) → `readKeywordGap`. La **activación** del origen sigue gated por el rollout: la
serie del top-N arranca con el primer deploy del worker post-release y los candidatos necesitan
≥5 días de serie; la cobertura del gap sigue tras su propio flag. El bloqueo de `Blocked by` por
`TASK-1699` puede considerarse **satisfecho en código** — lo que falta es rollout, no task.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration|command|reader`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|seo`
- Blocked by: `TASK-1792` (Slices 1–2, **sólo para el Slice 7**; ver Delta 2026-08-28 (3)). Los Slices 1–6 no la necesitan. (sólo para el origen `competitor_gap`; los otros cuatro orígenes no la necesitan — satisfecho en código desde 2026-08-28, ver Delta)
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El módulo SEO tiene tres listas con tres criterios de orden y ninguna es la autoridad. Esta task
crea la única: `greenhouse_growth.seo_work_queue_{snapshots,items}`, un aggregate **append-only**
materializado por job en el ops-worker (Cloud Scheduler, nunca Vercel cron), con el `priority_score`
**versionado en columna** y su `score_breakdown_json` al lado. El score deja de ser un índice
compuesto de volumen estimado y pasa a ser **clics incrementales estimados sobre demanda medida**:
`impresiones_GSC × max(0, CTR_esperado_en_posición_objetivo − CTR_actual)`, con la curva de CTR
derivada del propio sitio. Un solo contrato —`readSeoWorkQueue` / `materializeSeoWorkQueue` /
`recordSeoWorkQueueDecision`— sirve a UI, Nexa, MCP y portal cliente. Y cierra con un consumer real:
la lente de oportunidades vigente pasa a leer la cola en la misma entrega.

## Why This Task Exists

**No existe una cola priorizada única** (auditoría 2026-08-15, §3.1 brecha S1, tamaño `L`). Hay tres
listas con **tres criterios de orden distintos y no comparables entre sí**: el mapa de oportunidades
ordena por un score no versionado, el gap SEO↔AEO ordena por cuadrante, y discovery aplica su propio
sort compuesto de 8 llaves. El operador abre tres pantallas y ninguna le dice qué hacer primero,
porque los tres números no están en la misma escala.

> ⚠️ **Corrección 2026-08-15 (verificación adversarial).** La primera versión de esta task decía que
> *"discovery ordena por `captured_at DESC` — orden de llegada"*. **Es falso.** El `ORDER BY` de
> `keyword-discovery/reader.ts:258` es sólo el fetch; el orden servido lo fija un sort compuesto en
> memoria (`:395-434`) con 8 llaves —acción pendiente, `matchesSeed`, **● medido y no seguido**,
> presencia de `coreKeyword`, volumen, barrera— donde `capturedAt` es el **séptimo desempate**. Ese
> orden llegó en `522460b17` (2026-08-14, *"auditoría SEO — orden accionable"*), **un día antes** de
> la auditoría que lo describió mal.
>
> **La brecha sigue siendo real y el argumento correcto es más fuerte:** discovery ya tiene un orden
> gobernado y bien pensado, pero es un **cuarto criterio** que no se puede comparar con los otros
> tres. El problema nunca fue que discovery ordenara mal; es que **cada superficie ordena bien según
> su propia lógica y nadie puede decir cuál de los cuatro #1 va primero**.
>
> **Consecuencia dura para esta task:** el Slice que reapunta la lente de oportunidades debe incluir
> un **test de paridad discovery↔cola** que hoy no estaba pedido — si la cola reordena candidatos que
> discovery ya ordenó con criterio, hay que poder explicar por qué, y no descubrirlo en producción.

Tres razones concretas por las que esto es un **aggregate persistido y no un reader en vivo**, en
orden de peso (auditoría §5.2):

1. **Un origen no se puede unir por SQL.** `readSeoAeoGap`
   ([src/lib/growth/seo/gap/read-seo-aeo-gap.ts](../../../src/lib/growth/seo/gap/read-seo-aeo-gap.ts))
   son dos queries unidas **en memoria por diseño**, y el propio archivo declara que unirlas por SQL
   *"es la violación más cara posible acá"* — son motores aislados con providers, cadencias y
   breakers distintos. Una VIEW queda descartada de entrada. El gap entra a la cola como filas con
   `origin='aeo_gap'` y una `evidence_ref` **opaca**: nunca FK, nunca JOIN cross-motor.
2. **`TASK-1669` exige reproducibilidad** — `inputSnapshotHash`, `expiresAt` y detección de `stale`.
   Un reader que reordena en cada llamada hace que *"la recomendación #1 de la mañana"* sea
   inauditable a las 3 pm: el operador no puede demostrar qué vio cuando decidió, y el cliente
   tampoco.
3. **El score ya existe y NO está versionado.**
   [src/lib/growth/seo/keyword-opportunities-reader.ts](../../../src/lib/growth/seo/keyword-opportunities-reader.ts)
   tiene `DEFAULT_TARGET_POSITION = 5`, `DEFAULT_IMPRESSIONS_PERCENTILE = 0.75` y
   `MIN_IMPRESSIONS_FLOOR = 10` como **constantes de módulo**. Cambiar cualquiera mueve el ranking
   histórico completo sin dejar rastro: un cliente que pregunta "¿por qué esto ya no es prioridad?"
   no tiene respuesta auditable.

Y el modo de falla más probable **no es técnico** (auditoría §5.5): es que la cola se construya y
`TASK-1669` la ignore. Esa task tiene su propio `context-reader` y su propio "Priority ordering V1"
entre sus archivos owned. Si avanzan en paralelo sin contrato firmado quedan **dos ordenamientos que
discrepan** —uno por score versionado, otro por `reason_code`— y el operador ve un #1 en la pantalla
y otro en el plan del día. Por eso la cola llega **antes** y por eso esta task no cierra sin un
consumer real obedeciéndola.

## Goal

- Un aggregate append-only por target —`seo_work_queue_snapshots` + `seo_work_queue_items`— donde
  recomputar es **una fila nueva**, jamás un `UPDATE`, y donde el `priority_score_version` y el
  `score_breakdown_json` existen **desde el primer slice**.
- Un score de prioridad que se expresa en **clics incrementales estimados sobre demanda medida**, no
  en volumen estimado, con la curva de CTR derivada del propio sitio del cliente.
- Un vocabulario cerrado de `origin` con CHECK, y una regla explícita de que **los orígenes nunca se
  promedian**: cada uno aporta filas con su propia base de puntuación y su propia banda.
- Un contrato único —`readSeoWorkQueue`, `materializeSeoWorkQueue`, `recordSeoWorkQueueDecision`—
  consumido por los cuatro consumers (UI operador, Nexa, lane ecosystem/MCP, portal cliente) sin
  lógica duplicada, con DTO redactado para el lado cliente.
- Un consumer real en producción en la misma entrega: la lente de oportunidades vigente deja de
  ordenar por su cuenta y pasa a leer `readSeoWorkQueue`, con test de paridad de orden.
- Degradación honesta cuando un origen se cae: se declara en `origin_health_json` y **no baja el
  score de los demás**.

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
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — §1.1 boundary SEO↔AEO, §17.2/§17.3
  acoples declarados y regla de imports cross-dominio
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` — patrón outbox/reactive/async-critical y
  patrón flag default-OFF + shadow + flip
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/SQL_DATE_MATH_AGENT_INVARIANTS.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `CLAUDE.md` §"Outbox publisher canónico — Cloud Scheduler, no Vercel", §"Database — Migration
  markers", §"Runtime Rollout Completion Gate", §"Feature Flag State Ledger"

Reglas obligatorias:

- **NUNCA unir orígenes por SQL.** Cada colector produce sus filas por separado y el materializador
  las compone en memoria. Cero JOIN, cero VIEW, cero FK entre `seo_*` y `grader_*`.
- **NUNCA promediar orígenes.** Un objetivo declarado en posición 60 es **distancia por recorrer**,
  no urgencia; mezclarlo con un striking-distance de posición 9 en un promedio produce un número que
  no significa nada.
- **NUNCA `UPDATE` sobre `seo_work_queue_items` ni sobre `seo_work_queue_snapshots`.** Recomputar es
  insertar un snapshot nuevo. Se agrega trigger anti-`UPDATE`/anti-`DELETE`, mismo patrón que
  `seo_keyword_set_members` (TASK-1299).
- **NUNCA cambiar un peso, un umbral o la posición objetivo sin bumpear `priority_score_version`.**
  El conjunto de versiones conocidas viaja append-only en el mismo commit que el bump.
- 🔴 **PROHIBIDO ordenar por volumen estimado en cualquier parte del módulo cuando existe demanda
  medida.** Es el invariante `●` medido / `◑` estimado aplicado al **ORDENAMIENTO**, no sólo a la
  visualización. Un item sin demanda medida **no recibe un score fabricado desde el volumen del
  proveedor**: recibe `priority_score = NULL`, `score_basis = 'no_measured_demand'` y cae a su propia
  banda, cuyo verbo honesto es `measure`.
- **NUNCA `evidence_ref` como FK ni como target de JOIN.** Es una cadena opaca
  (`aeo:grader_run:<id>`, `discovery:candidate:<id>`) que el consumer resuelve —si tiene permiso—
  con el reader del motor dueño.
- **NUNCA ejecutar nada desde la cola.** La cola **propone**; el humano confirma; el command canónico
  del dominio dueño ejecuta. `recordSeoWorkQueueDecision` escribe el hecho y **no llama** a
  `trackKeywords`, `createGroundedQueryDraft` ni ningún otro write.
- **NUNCA el materializador en Vercel cron.** Es path async crítico: Cloud Scheduler + ops-worker.
  Los crons de Vercel sólo corren en deploys de Production y dejarían la cola invisible en staging.
- **NUNCA importar desde `growth/ai-visibility/**` fuera de la superficie pública** que declara
  `TASK-1670`. El lado AEO entra por su contrato, no por deep import.

## Normative Docs

- `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md` — **fuente de esta
  task**: §3.1 brecha S1, §5.2 (la decisión de aggregate persistido), §5.5 (red-team: el modo de
  falla más probable), §6 (lo que no se debe construir todavía), §7 (lo que no se debe prometer)
- `docs/epics/to-do/EPIC-022-growth-seo-search-visibility-360-module.md`
- `docs/issues/open/ISSUE-152-seo-target-berel-mercado-chile-marca-mexicana.md` — por qué la KD cruda
  no es criterio de orden en SERPs es-LATAM
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/tasks/to-do/TASK-1694-growth-seo-discovery-candidate-contract-barrier-dedup.md` — su §Delta
  2026-08-15 ya declara este bloqueo duro desde el otro lado

## Dependencies & Impact

### Depends on

- **`TASK-1694` — BLOQUEO DURO.** Colapsa el duplicado cross-método del candidato de discovery y
  corrige la barrera de decisión. Sin eso, la cola **persiste** hasta cuatro filas de la misma
  keyword, cada una con su propio score y su propio CTA de gasto, filtradas por una barrera que en
  es-LATAM no filtra nada. Un reader equivocado se arregla con un deploy; un snapshot equivocado ya
  viajó a un plan del día y es irreversible por diseño.
- **`TASK-1692`** — writers del ledger de decisiones de discovery. La cola lee la última acción por
  candidato para no volver a proponer lo que ya se descartó; hoy sólo `dismissed` tiene writer.
- **`TASK-1669`** — el contrato de reproducibilidad (`inputSnapshotHash`, `expiresAt`, `stale`) del
  que esta task es la implementación persistida.
- `greenhouse_growth.seo_gsc_daily` (TASK-1302) — demanda medida, insumo del score.
- `greenhouse_growth.seo_keyword_set_members` (TASK-1299/1308) — objetivos declarados vigentes.
- `greenhouse_growth.seo_keyword_discovery_candidates` + `..._actions` (TASK-1664) — candidatos y
  decisiones previas.
- `greenhouse_growth.grader_runs` / `grader_scores` — leídos **sólo** a través del reader del gap,
  nunca por SQL directo desde este dominio.
- `greenhouse_growth.seo_targets`, `greenhouse_core.organizations` — binding de tenant.

### Blocks / Impacts

- **`TASK-1669` — impacto contractual duro.** Su `context-reader` se reduce a envoltorio de
  `readSeoWorkQueue` y su "Priority ordering V1" deja de ser código: pasa a ser la config versionada
  de la cola. Al cerrar esta task hay que dejarle un `## Delta` con esa reducción de alcance y
  agregar `TASK-1700` a su `Depends on`.
- `TASK-1667` / `TASK-1668` — la costura candidate → brief → draft y el loop de QA/outcome pasan a
  colgar de un item de la cola en vez de una lista propia.
- `TASK-1690` — la superficie cliente consume el DTO redactado de la cola.
- `TASK-1691` — la lente de mercado deja de ser un ordenamiento alternativo y pasa a ser
  enriquecimiento del item.
- Superficie operador `/admin/growth/seo/keywords` — cambia de fuente de datos, no de forma.

### Files owned

- `migrations/<timestamp>_task-1700-seo-work-queue.sql`
- `src/lib/growth/seo/work-queue/contracts.ts`
- `src/lib/growth/seo/work-queue/priority-score.ts`
- `src/lib/growth/seo/work-queue/score-versions.ts`
- `src/lib/growth/seo/work-queue/collectors/*.ts`
- `src/lib/growth/seo/work-queue/materialize.ts`
- `src/lib/growth/seo/work-queue/reader.ts`
- `src/lib/growth/seo/work-queue/record-decision.ts`
- `src/lib/growth/seo/work-queue/materialize-batch.ts`
- `src/lib/growth/seo/work-queue/__tests__/*.test.ts`
- `src/app/api/admin/growth/seo/work-queue/route.ts`
- `src/app/api/admin/growth/seo/work-queue/decisions/route.ts`
- `src/app/api/platform/ecosystem/growth/seo/work-queue/route.ts`
- `src/lib/reliability/queries/growth-seo-work-queue-signals.ts`
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (sección nueva)
- `docs/documentation/growth/cola-priorizada-trabajo-seo.md`
- `docs/manual-de-uso/growth/operar-cola-priorizada-seo.md`

Archivos que esta task **modifica sin poseer** (hay que coordinar con su dueña antes de tocar):
`src/lib/growth/seo/flags.ts`, `src/lib/growth/seo/contracts.ts`,
`src/lib/api-platform/resources/ecosystem-growth-seo.ts`, `src/lib/entitlements/runtime.ts`,
`services/ops-worker/server.ts`, `services/ops-worker/deploy.sh`,
`src/app/(dashboard)/admin/growth/seo/keywords/page.tsx`,
`src/views/greenhouse/admin/growth/seo/keywords/KeywordOpportunityMap.tsx`.

## Current Repo State

### Already exists

- **La demanda medida y su lectura.** `greenhouse_growth.seo_gsc_daily` (append-only, trigger
  no-delete) y `readKeywordOpportunities`
  ([src/lib/growth/seo/keyword-opportunities-reader.ts](../../../src/lib/growth/seo/keyword-opportunities-reader.ts)),
  que ya calcula la posición ponderada por impresiones y ya expresa el score como clics
  incrementales — el método correcto ya está escrito, sólo que **como constantes de módulo y sin
  persistir**.
- **El cruce SEO↔AEO** `readSeoAeoGap` con su boundary de dos queries en memoria y su degradación
  honesta (`no_seo_data` / `no_aeo_data`).
- **Discovery completo**: runs, candidatos y ledger de acciones (`seo_keyword_discovery_*`,
  TASK-1664) más el workbench `Descubrir` (TASK-1665).
- **Objetivos declarados**: `seo_keyword_set_members` append-only con `intent` (`target` /
  `opportunity`), `intent_declared_by` e `intent_declared_at` (TASK-1659).
- **El carril async**: ops-worker con seis handlers SEO ya productivos
  (`/seo/gsc/snapshot-batch`, `/seo/rank/capture-batch`, `/seo/audit/*`, `/seo/backlinks/*`,
  `/seo/keyword-discovery/drain`) y sus jobs de Cloud Scheduler declarados en
  `services/ops-worker/deploy.sh`.
- **El chokepoint de entitlement/budget** `resolveSeoEntitlement` + `seo_provider_spend_daily`.
- **Los lanes**: ruta app `/api/admin/growth/seo/**`, lane ecosystem
  `/api/platform/ecosystem/growth/seo/**` y sus payloads en
  `src/lib/api-platform/resources/ecosystem-growth-seo.ts`.
- **Las capabilities** `growth.seo.observation.read`, `growth.seo.target.configure`,
  `growth.seo.report.read_client` con grants reales en `src/lib/entitlements/runtime.ts`.

### Gap

- **No existe ninguna tabla de cola de trabajo.** `greenhouse_growth` no tiene `seo_work_queue_*`.
- **El score de prioridad no está versionado ni persistido.** Vive como constantes en el reader; su
  breakdown no se guarda; cambiar un umbral reescribe la historia en silencio.
- **No existe vocabulario de `origin`.** Los seis orígenes reales viven cada uno en su pantalla, sin
  un tipo común, sin `evidence_ref` y sin forma de decir "este origen está caído".
- **No existe `recordSeoWorkQueueDecision`.** El ledger de decisiones de discovery (TASK-1692) cubre
  candidatos de discovery, no los seis orígenes.
- **La canibalización se detecta y muere ahí.** `competing_pages > 1` se marca en el reader y no
  produce una entrada de trabajo con verbo propio (auditoría §3.1 brecha S8).
- **No hay señal de reliability sobre frescura de plan.** Las señales SEO existentes vigilan el
  pipeline de captura, no si el operador está mirando un plan vencido.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/growth/seo/work-queue/**` dentro del monolito Next.js de greenhouse-eo, con
  el materializador ejecutado desde `services/ops-worker` (Cloud Run) y los readers servidos desde
  Vercel.
- Future candidate home: `domain-package`
- Boundary: el contrato canónico son tres primitives —`readSeoWorkQueue` (reader),
  `materializeSeoWorkQueue` (command idempotente) y `recordSeoWorkQueueDecision` (log append-only)—.
  Consumers autorizados: la ruta app `/api/admin/growth/seo/work-queue`, el lane ecosystem
  `/api/platform/ecosystem/growth/seo/work-queue`, la tool MCP interna `get_seo_work_queue`, el
  server component de `/admin/growth/seo/keywords`, la superficie cliente y el orquestador de
  `TASK-1669`. Ninguno reimplementa orden, score ni composición de orígenes.
- Server/browser split: el módulo completo nace bajo `import 'server-only'`. El store Postgres, la
  resolución de tenant y la lectura del lado AEO nunca cruzan al browser; la UI recibe el DTO ya
  compuesto por el server component, y el DTO cliente sale por un redactor explícito.
- Build impact: none — sin dependencia nueva, sin input de filesystem, sin entrypoint global. El
  materializador se importa desde el bundle del worker, así que su árbol de imports no puede tocar
  `@core/**`, `@menu` ni `@layouts`.
- Extraction blocker: la transacción única del materializador (snapshot + items en un solo
  `withTransaction`) y el binding de tenant vía `seo_targets.organization_id` →
  `greenhouse_core.organizations`, acople ya declarado en §17.2 de la arquitectura SEO. No se agrega
  FK nueva cross-dominio ni import cross-motor.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `migration` + `command` + `reader` (más `cron` en el carril del worker)
- Source of truth afectado: **nuevo** —
  `greenhouse_growth.seo_work_queue_snapshots` / `..._items` / `..._decisions` pasan a ser el SSOT
  del **orden de trabajo** del módulo SEO. Los motores de origen siguen siendo SSOT de su propia
  evidencia; la cola no duplica métrica, referencia procedencia.
- Consumidores afectados: UI operador (`/admin/growth/seo/keywords`), Nexa, lane ecosystem/MCP
  interno, portal cliente (DTO redactado), orquestador de `TASK-1669`.
- Runtime target: `local` + `staging` + `production` + `worker` + `cron`

### Contract surface

- Contrato existente a respetar: `readKeywordOpportunities`
  (`src/lib/growth/seo/keyword-opportunities-reader.ts`), `readSeoAeoGap`
  (`src/lib/growth/seo/gap/read-seo-aeo-gap.ts`), `readKeywordDiscovery`
  (`src/lib/growth/seo/keyword-discovery/reader.ts`), `resolveSeoEntitlement`
  (`src/lib/growth/seo/entitlement.ts`), el boundary §1.1 y §17.3 de
  `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`.
- Contrato nuevo:

  ```ts
  readSeoWorkQueue({ seoTargetId, origins?, limit, cursor })
    → { snapshot, items, originHealth, priorityScoreVersion, asOf, staleness }

  materializeSeoWorkQueue({ seoTargetId, actor })    // idempotente por inputSnapshotHash
    → { ok, snapshotId, itemCount, originHealth, reused }

  recordSeoWorkQueueDecision({ itemId, decision, actor, note? })  // append-only, NO ejecuta nada
    → { ok, decisionId }
  ```

- Backward compatibility: `compatible`. `readKeywordOpportunities` no cambia de firma ni se borra en
  esta task: queda como colector interno del origen `gsc_striking_distance` y como referencia del
  test de paridad de orden. Su retiro como reader público es follow-up declarado.
- Full API parity: la capability nace con **contrato gobernado a nivel capability**, no con un
  endpoint por pantalla. Read: reader canónico expuesto en lane app + lane ecosystem + tool MCP
  interna, mismo payload. Write: `recordSeoWorkQueueDecision` es apto para
  `propose → confirm → execute` — Nexa propone la decisión, el humano la confirma en el endpoint, y
  el endpoint es el único que muta. El LLM no escribe.

### Data model and invariants

- Entidades/tablas afectadas: `greenhouse_growth.seo_work_queue_snapshots` (nueva),
  `greenhouse_growth.seo_work_queue_items` (nueva), `greenhouse_growth.seo_work_queue_decisions`
  (nueva). Lectura sobre `seo_gsc_daily`, `seo_keyword_set_members`,
  `seo_keyword_discovery_candidates`, `seo_keyword_discovery_actions`, `seo_targets`, y sobre el
  lado AEO **únicamente** a través de `readSeoAeoGap`.
- Invariantes que no se pueden romper:
  - **Append-only estricto.** Trigger anti-`UPDATE` y anti-`DELETE` en las tres tablas. Recomputar es
    un snapshot nuevo; el anterior queda como evidencia de qué se recomendó y cuándo.
  - **`origin` es vocabulario cerrado con CHECK**: `gsc_striking_distance` · `discovery_candidate` ·
    `declared_target` · `aeo_gap` · `competitor_gap` · `consolidation`. Agregar un origen es una
    migración, no un string nuevo en TS.
  - **`evidence_ref` es OPACA**: `TEXT`, sin FK, sin JOIN. Formato `<motor>:<entidad>:<id>`.
  - **Un origen caído no baja el score de los demás.** Se declara en
    `snapshots.origin_health_json` con `{ origin, state: 'ok'|'degraded'|'down', reason, asOf }` y
    sus filas simplemente no existen en ese snapshot. Cero cero-fantasma, cero relleno.
  - **Los orígenes nunca se promedian.** Cada item lleva su `score_basis` y su `score_band`; el orden
    es por banda primero y por score dentro de la banda.
  - 🔴 **Sin demanda medida no hay score.** `score_basis` cerrado:
    `measured_incremental_clicks` (banda 1, `priority_score` en clics) ·
    `measured_without_curve` (banda 2, hay impresiones pero la curva de CTR del sitio no es
    utilizable; `priority_score` NULL, orden por impresiones) ·
    `no_measured_demand` (banda 3, `priority_score` NULL, orden determinista y verbo `measure`).
    **Está prohibido puntuar la banda 3 con volumen estimado del proveedor.** CHECK que ata
    `score_basis` ↔ `score_band` ↔ nulidad de `priority_score`.
  - **`recommended_verb` es vocabulario cerrado**: `optimize` · `create` · `consolidate` · `measure`.
    La canibalización entra como `origin='consolidation'` con `recommended_verb='consolidate'`: **no
    es una keyword que empujar**, es dos URLs que fusionar, y ordenarla junto a un "optimizar" haría
    que el operador tome la acción equivocada.
  - **`priority_score_version` obligatorio en el snapshot y en cada item.** Cambiar un peso, un
    umbral, la posición objetivo o la forma de derivar la curva **obliga a versión nueva**; el set
    append-only de versiones conocidas viaja en el mismo commit.
  - **Cada item con `origin='aeo_gap'` registra el `source_score_version` del lado AEO que leyó.**
    CHECK: `origin <> 'aeo_gap' OR source_score_version IS NOT NULL`. Sin eso, una recalibración del
    grader movería filas de la cola sin que nadie pueda decir por qué.
  - **La decisión se ancla al SUJETO, no a la fila.** Los items se regeneran en cada snapshot; una
    decisión atada al `item_id` moriría mañana. `seo_work_queue_decisions` se ancla a
    `(seo_target_id, origin, normalized_keyword)` y guarda `item_id` + `snapshot_id` como evidencia
    de **qué estaba mirando el operador cuando decidió**.
- Tenant/space boundary: todo entra por `seoTargetId`; el `organization_id` se resuelve **server-side
  desde el target** (`resolveTarget` / `resolveUnambiguousSeoTarget`), nunca desde el request. El
  lado AEO se lee con **el mismo** `organization_id` del target. Entitlement per-org
  (`module_assignments` `seo_v2` vigente) como anti-oracle: sin él el target "no existe" para estos
  primitives.
- Idempotency/concurrency: `materializeSeoWorkQueue` es idempotente por
  `UNIQUE (organization_id, seo_target_id, priority_score_version, input_snapshot_hash)`. Mismos
  insumos → devuelve el snapshot existente con `reused: true` y **cero writes**. El snapshot y sus
  items se insertan en **un solo `withTransaction`**: no existe un snapshot a medio poblar. Dos
  instancias del worker compitiendo por el mismo target resuelven por el índice único, no por lock
  aplicativo.
- Audit/outbox/history: las tres tablas **son** el historial (append-only). Se publica el evento
  outbox `growth.seo.work_queue.materialized` para que los consumers reactivos (y una futura
  notificación) cuelguen de ahí sin pollear. `recordSeoWorkQueueDecision` no publica evento en V1:
  no dispara nada downstream por diseño.

### Migration, backfill and rollout

- Migration posture: `additive` — tres tablas nuevas, tres triggers append-only, índices, GRANTs. Sin
  ALTER sobre tablas existentes. Marker `-- Up Migration` al inicio y bloque `DO $$ ... RAISE
  EXCEPTION` que aborta si las tres tablas, el índice único de idempotencia y los CHECK de
  `origin` / `score_basis` no quedaron creados (anti pre-up-marker bug, CLAUDE.md).
- Default state: `flag OFF`. `GROWTH_SEO_WORK_QUEUE_ENABLED` default `false` en los **dos** runtimes
  (Vercel y ops-worker) y Cloud Scheduler `ops-seo-work-queue-materialize` **nace PAUSADO** — dos
  frenos independientes, mismo patrón que TASK-1661/1664. Subordinado a `GROWTH_SEO_ENABLED`.
- Backfill plan: **sin backfill.** Un snapshot histórico fabricado afirmaría que alguien recomendó
  algo que nadie recomendó — el mismo error que fabricar autoría en un ledger de decisiones. La cola
  empieza vacía y su primer snapshot es el de su primera corrida real. La corrida inicial se hace en
  modo shadow (flag ON en worker, consumer todavía leyendo el reader legacy) sobre un solo target.
- Rollback path: `flag off` en ambos runtimes + pausar el scheduler → el consumer cae al reader
  legacy por la rama que el propio cutover conserva. Los datos quedan (append-only, sin efecto
  externo). Reverse migration disponible (`DROP TABLE` de las tres) pero **no necesaria**: la cola no
  gasta ni escribe fuera de sí misma.
- External coordination: declarar el flag en `services/ops-worker/deploy.sh` (SoT declarativo, sus
  `--set-env-vars` son destructivos) **y además** aplicarlo en vivo con `--update-env-vars`; declarar
  el job de Cloud Scheduler con su estado de pausa en el 5.º argumento de `upsert_scheduler_job`;
  registrar el flag en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`; avisar al operador SEO antes
  del flip del consumer, porque el orden que ve en pantalla cambia de dueño.

### Security and access

- Auth/access gate: read con `growth.seo.observation.read` (operador) y
  `growth.seo.report.read_client` scope `own` (cliente). `materializeSeoWorkQueue` manual con
  `growth.seo.target.configure`; el carril programado corre con el binding del worker.
  `recordSeoWorkQueueDecision` con **capability nueva** `growth.seo.work_queue.decide`, registrada en
  `capabilities_registry` + catálogo TS + grant a ≥1 rol real en `src/lib/entitlements/runtime.ts`
  **en el mismo PR**, con el coverage test verde (TASK-873/935).
- Sensitive data posture: sin PII. El DTO cliente **redacta**: nada de `keyword_difficulty`, nada de
  volumen estimado del proveedor, nada de costo de proveedor, nada de `evidence_ref` cruda, nada de
  `score_breakdown_json` completo. El cliente ve keyword, verbo, banda, la estimación de clics
  incrementales marcada `◑ estimado` sobre impresiones marcadas `● medido`, y el `asOf`.
- Error contract: `canonicalErrorResponse` con códigos del enum cerrado; prose es-CL desde
  `src/lib/copy/growth.ts`; `captureWithDomain(err, 'growth', …)` para el detalle. Cero prose en
  inglés, cero detalle técnico al cliente. Un origen caído **no** es un error de la ruta: es un `200`
  con `originHealth` degradado.
- Abuse/rate-limit posture: `materializeSeoWorkQueue` manual acotado por la idempotencia (mismos
  insumos = cero trabajo) más un `minRecomputeIntervalMinutes` que devuelve el snapshot vigente en
  vez de recomputar. La cola **no llama al proveedor**: lee tablas ya pagadas, así que un abuso de
  materialización cuesta CPU, no dólares — pero igual se acota para no ahogar al worker.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/seo/work-queue` · `pnpm local:check` ·
  `pnpm vitest run src/lib/entitlements` (coverage de capability) ·
  `pnpm vitest run src/lib/growth/seo` (no-regresión del módulo completo).
- DB/runtime checks: `pnpm pg:connect:migrate` + verificación por `information_schema` de las tres
  tablas, sus CHECK y el índice único; sanity live que ejercita **el mismo SQL exportado** del reader
  contra PostgreSQL (patrón `SEO_PROVIDER_SPEND_UPSERT_SQL` / `SEO_KEYWORD_OPPORTUNITIES_SQL`);
  prueba negativa de que `UPDATE` y `DELETE` sobre las tres tablas fallan por trigger.
- Integration checks: corrida real del handler `/seo/work-queue/materialize-batch` en el ops-worker
  de staging sobre el target real (`berel.com`), con snapshot inspeccionado fila por fila; segunda
  corrida inmediata que debe devolver `reused: true` y **cero filas nuevas**; corrida con el lado AEO
  forzado a fallar que debe producir snapshot con `origin_health_json.aeo_gap.state = 'down'` y el
  resto de las bandas intactas.
- Reliability signals/logs: `growth.seo.work_queue.stale_snapshot` (targets elegibles cuyo snapshot
  vigente pasó `expires_at`; steady 0) · `growth.seo.work_queue.origin_degraded` (orígenes en
  `degraded`/`down` en el último snapshot; steady 0) · `growth.seo.work_queue.score_version_drift`
  (snapshots vigentes con `priority_score_version` distinta de la config vigente; steady 0 — detecta
  el cambio de peso sin bump). Visibles en `/admin/operations`.
- Production verification sequence: ver §Rollout Plan & Risk Matrix.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers están nombrados con paths y objetos reales.
- [ ] Invariantes de datos, boundary de tenant/acceso e idempotencia/concurrencia son explícitos.
- [ ] Postura de migración/backfill/rollback es explícita y proporcional al riesgo.
- [ ] Hay evidencia runtime o de DB listada para todo cambio más allá de docs/tooling.
- [ ] El dominio sensible tiene errores canónicos, postura de audit/señal y cero fuga de datos.

## Capability Definition of Done — Full API Parity gate

- [ ] **Lógica en el primitive, no en la UI.** Orden, score y composición de orígenes viven en
      `src/lib/growth/seo/work-queue/**`; ningún componente reordena ni recalcula.
- [ ] **Modelada como aggregate + commands**, no como click-handler: snapshot/item/decision con sus
      tres primitives.
- [ ] **Read** como reader canónico; **write** (`recordSeoWorkQueueDecision`) como command con
      semántica explícita, authorization fina por capability, idempotencia, append-only, errores
      canónicos y observabilidad.
- [ ] **Capability + grant en el MISMO PR**: `growth.seo.work_queue.decide` en registry + catálogo +
      grant a ≥1 rol real + coverage test verde.
- [ ] **Camino programático declarado**: ruta app, lane ecosystem y tool MCP **interna**. La
      federación al gateway MCP externo queda explícitamente fuera (auditoría §6).
- [ ] **Write apto para `propose → confirm → execute`**: Nexa propone, el humano confirma en el
      endpoint, el endpoint muta. Cero integración Nexa-específica.
- [ ] **Un primitive, muchos consumers**: UI, Nexa, MCP y portal cliente comparten reader; la única
      diferencia del lado cliente es el redactor de DTO.
- [ ] **Parity check = SÍ.**

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

### Slice 1 — Esquema append-only con el versionado adentro desde el minuto cero

- Migración `task-1700-seo-work-queue.sql` con las tres tablas, sus CHECK de vocabulario cerrado
  (`origin`, `score_basis`, `score_band`, `recommended_verb`), el CHECK que ata
  `origin='aeo_gap' → source_score_version NOT NULL`, el CHECK que ata `score_basis ↔ score_band ↔`
  nulidad de `priority_score`, el índice único de idempotencia y los índices de lectura.
- Triggers anti-`UPDATE` y anti-`DELETE` en las tres tablas.
- 🔴 `priority_score_version` (snapshot + item) y `score_breakdown_json` (item) **en esta migración**,
  no en una posterior. Es lo único irreversible del plan desde que un cliente ve una recomendación
  basada en él: si el primer snapshot productivo se escribe sin versión ni breakdown, esa evidencia
  no se puede reconstruir después.
- Bloque `DO $$ ... RAISE EXCEPTION` post-DDL que aborta si algo no quedó creado.
- GRANTs a `greenhouse_runtime`; ownership `greenhouse_ops`. Regenerar `src/types/db.d.ts`.
- `work-queue/contracts.ts` con los tipos TS espejo del vocabulario cerrado y
  `work-queue/score-versions.ts` con el registro append-only de versiones conocidas.

### Slice 2 — El score: clics incrementales sobre demanda medida, versionado

- `work-queue/priority-score.ts`: `computePriorityScore(input) → { score, basis, band, breakdown }`.
- Fórmula de la banda 1: `impresiones_GSC × max(0, CTR_esperado_en_posición_objetivo − CTR_actual)`.
- Curva de CTR por posición **derivada del propio sitio** con el método que ya usa
  `keyword-opportunities-reader.ts` (percentil sobre la distribución de la org, piso de impresiones
  para validez estadística). Cuando la curva no es utilizable → `basis: 'measured_without_curve'`,
  banda 2, `priority_score` NULL. Cuando no hay impresiones en ventana →
  `basis: 'no_measured_demand'`, banda 3, `priority_score` NULL, verbo `measure`.
- `PRIORITY_SCORE_VERSION = 'incremental-clicks-v1'` con **toda** la config —posición objetivo,
  ventana, percentil, piso de impresiones, forma de la curva— dentro del objeto versionado. Cero
  constantes sueltas de módulo.
- `score_breakdown_json` con: `impressions`, `clicks`, `currentCtr`, `weightedPosition`,
  `targetPosition`, `expectedCtrAtTarget`, `ctrCurveSource`, `curveSampleSize`, `windowDays`,
  `incrementalClicks`.
- Tests: la fórmula, los tres `basis`, el clamp a cero cuando el CTR actual ya supera al esperado, y
  un test que **falla si alguien cambia un valor de la config sin bumpear la versión**.

### Slice 3 — Colectores por origen y `materializeSeoWorkQueue`

- Un colector por origen bajo `work-queue/collectors/`, cada uno con su propia query o su propio
  reader, cada uno devolviendo `{ items, health }`:
  - `gsc-striking-distance.ts` — reusa el SQL exportado del reader de oportunidades.
  - `consolidation.ts` — `competing_pages > 1` sobre la misma ventana; verbo `consolidate`.
  - `declared-target.ts` — `seo_keyword_set_members` vigentes con `intent='target'`.
  - `discovery-candidate.ts` — candidatos ya colapsados por `TASK-1694`, con su última acción de
    `TASK-1692` para no reproponer lo descartado.
  - `aeo-gap.ts` — **vía `readSeoAeoGap` únicamente**, con `source_score_version` del lado AEO y
    `evidence_ref` opaca.
  - `competitor-gap.ts` — nace declarado y **desactivado** (`seo_competitors` no tiene productor;
    auditoría §7 prohíbe prometer comparativa competitiva). Su `origin_health` reporta
    `state: 'down', reason: 'no_producer'`.
- `materialize.ts`: corre los colectores en paralelo con aislamiento de fallas (un colector caído
  degrada su origen y **no** aborta el snapshot), compone en memoria, puntúa, ordena, calcula
  `input_snapshot_hash` y persiste snapshot + items en **un solo `withTransaction`**.
- Idempotencia por `input_snapshot_hash`: mismos insumos → `reused: true`, cero writes.
- Si **todos** los orígenes caen: no se escribe snapshot, se devuelve error tipado y se emite señal.
- Evento outbox `growth.seo.work_queue.materialized`.

### Slice 4 — Carril async: ops-worker + Cloud Scheduler + flag

- `work-queue/materialize-batch.ts`: itera targets elegibles (assignment `seo_v2` vigente) y llama al
  command; resiliencia por fila (un target que falla no cae al batch).
- Handler `/seo/work-queue/materialize-batch` en `services/ops-worker/server.ts`, con no-op
  prod-safe cuando el flag está OFF.
- Job `ops-seo-work-queue-materialize` en `services/ops-worker/deploy.sh`, **PAUSADO**, con cadencia
  diaria posterior a `ops-seo-gsc-snapshot` (el plan del día se calcula después de que llegó la
  demanda medida del día).
- Flag `GROWTH_SEO_WORK_QUEUE_ENABLED` en `src/lib/growth/seo/flags.ts` con el docstring
  multi-runtime obligatorio, declarado en `deploy.sh` **y** en Vercel, y su fila en
  `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.

### Slice 5 — `readSeoWorkQueue` y los cuatro consumers

- `work-queue/reader.ts`: resuelve el snapshot vigente del target, calcula `staleness`
  (`fresh` | `stale` | `absent`) contra `expires_at`, pagina por **keyset sobre el snapshot
  inmutable** —`(score_band, priority_score, normalized_keyword)`—, y devuelve `originHealth`,
  `priorityScoreVersion` y `asOf`. La paginación es estable por construcción: el universo no crece
  bajo el cursor, a diferencia del problema declarado en `TASK-1693`.
- Ruta app `GET /api/admin/growth/seo/work-queue` con `growth.seo.observation.read`.
- Payload + ruta del lane ecosystem `GET /api/platform/ecosystem/growth/seo/work-queue` en
  `src/lib/api-platform/resources/ecosystem-growth-seo.ts`, con anti-oracle por `seo_v2`.
- Tool MCP **interna** `get_seo_work_queue` sobre el mismo payload. **Sin** federación al gateway
  externo.
- Redactor de DTO cliente (`toClientWorkQueueDto`) con test de no-fuga: falla si aparece dificultad,
  volumen estimado, costo de proveedor, `evidence_ref` cruda o breakdown completo.

### Slice 6 — `recordSeoWorkQueueDecision`

- Command append-only anclado al **sujeto** (`seo_target_id`, `origin`, `normalized_keyword`) con
  `item_id` + `snapshot_id` como evidencia de contexto.
- Vocabulario cerrado de `decision`: `accepted` · `deferred` · `dismissed` · `done`.
- 🔴 **No ejecuta nada.** Test explícito que falla si el módulo importa `trackKeywords`,
  `createGroundedQueryDraft` o cualquier otro command de escritura.
- Capability `growth.seo.work_queue.decide` + grant + coverage test en el mismo commit.
- Ruta app `POST /api/admin/growth/seo/work-queue/decisions` como punto de confirmación humana del
  loop `propose → confirm → execute`.
- El colector de discovery y el de striking-distance consultan la última decisión por sujeto para no
  volver a proponer lo descartado en el siguiente snapshot.

### Slice 7 — El consumer real, la paridad de orden y las señales

- 🔴 **La lente de oportunidades vigente pasa a leer `readSeoWorkQueue`.**
  `src/app/(dashboard)/admin/growth/seo/keywords/page.tsx` cambia de fuente y
  `KeywordOpportunityMap.tsx` renderiza desde el DTO de la cola. **La forma renderizada no cambia**
  en esta task: mismas columnas, mismo copy, misma interacción — sólo cambia quién manda el orden. La
  superficie completa de la cola (bandas visibles, verbos, orígenes nuevos) es una task `ui-ux`
  posterior. Por eso `UI impact: none`: la lente cambia de fuente, no de forma.
- **Test de paridad de orden**: para la ventana y el target de referencia, el orden de los items
  `origin='gsc_striking_distance'` de la cola debe ser **idéntico** al de `readKeywordOpportunities`
  con la misma config. Si difiere, el cutover no es un cambio de fuente: es un cambio de
  comportamiento no declarado.
- Rama de fallback detrás del flag: con `GROWTH_SEO_WORK_QUEUE_ENABLED=false` la página sigue usando
  el reader legacy, sin código muerto duplicado en la vista.
- Las tres señales de reliability + su registro en el módulo `growth`.
- Documentación triple: sección nueva en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (contrato,
  invariantes, vocabularios, política de versionado), funcional en
  `docs/documentation/growth/cola-priorizada-trabajo-seo.md` y manual en
  `docs/manual-de-uso/growth/operar-cola-priorizada-seo.md` (cómo se lee una banda, qué significa
  `stale`, qué hacer cuando un origen está caído, cómo se bumpea una versión de score).
- `## Delta` en `TASK-1669` con la reducción de su `context-reader` a envoltorio y el retiro de su
  ordenamiento propio.

## Out of Scope

- **Unir orígenes por SQL o por VIEW.** Explícitamente prohibido, no diferido.
- **Promediar orígenes o fusionar scores SEO y AEO.** Ni un "Search Visibility Score" único ni
  promediar cuadrantes: la ortogonalidad es lo que se vende (auditoría §6).
- **Ejecutar recomendaciones.** La cola propone; el humano confirma; el command dueño ejecuta.
- **Cualquier `UPDATE` sobre el aggregate**, incluido "marcar el item como hecho".
- **Federar la cola al gateway MCP externo.** Primero el read tool interno (auditoría §6).
- **Superficie UI nueva** (bandas, verbos, filtros por origen, cola completa en pantalla): task
  `ui-ux` posterior. Acá la lente existente sólo cambia de fuente.
- **Retirar `readKeywordOpportunities`** como reader público: queda como colector y como referencia
  del test de paridad.
- **Producir `competitor_gap` de verdad.** El origen nace declarado y desactivado hasta que
  `seo_competitors` tenga productor.
- **Capa de citabilidad de contenido, estacionalidad, clustering propio, alertas push, GA4/HubSpot.**
  Son brechas reales de la auditoría (S3, S4, S7, C6, A1) y cada una es su propia task; la cola las
  recibirá como orígenes nuevos vía migración.
- **Backfill de snapshots históricos.**

## Detailed Spec

### Esquema

```sql
CREATE TABLE greenhouse_growth.seo_work_queue_snapshots (
  snapshot_id            TEXT PRIMARY KEY DEFAULT ('seowqs-' || gen_random_uuid()::text),
  organization_id        TEXT NOT NULL REFERENCES greenhouse_core.organizations (organization_id),
  seo_target_id          TEXT NOT NULL REFERENCES greenhouse_growth.seo_targets (seo_target_id),

  priority_score_version TEXT      NOT NULL,
  input_snapshot_hash    TEXT      NOT NULL,
  window_days            INTEGER   NOT NULL CHECK (window_days > 0),

  origin_health_json     JSONB     NOT NULL,   -- [{ origin, state, reason, asOf }]
  item_count             INTEGER   NOT NULL CHECK (item_count >= 0),

  materialized_by        TEXT      NOT NULL,
  computed_at            TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  expires_at             TIMESTAMPTZ NOT NULL,

  CONSTRAINT seo_work_queue_snapshots_idempotency_unique
    UNIQUE (organization_id, seo_target_id, priority_score_version, input_snapshot_hash),
  CONSTRAINT seo_work_queue_snapshots_expiry_after_computed
    CHECK (expires_at > computed_at)
);

CREATE TABLE greenhouse_growth.seo_work_queue_items (
  item_id                TEXT PRIMARY KEY DEFAULT ('seowqi-' || gen_random_uuid()::text),
  snapshot_id            TEXT NOT NULL
    REFERENCES greenhouse_growth.seo_work_queue_snapshots (snapshot_id) ON DELETE RESTRICT,

  origin                 TEXT NOT NULL CHECK (origin IN (
                           'gsc_striking_distance', 'discovery_candidate', 'declared_target',
                           'aeo_gap', 'competitor_gap', 'consolidation')),
  normalized_keyword     TEXT NOT NULL,
  target_url             TEXT,

  recommended_verb       TEXT NOT NULL CHECK (recommended_verb IN
                           ('optimize', 'create', 'consolidate', 'measure')),

  score_basis            TEXT NOT NULL CHECK (score_basis IN
                           ('measured_incremental_clicks', 'measured_without_curve',
                            'no_measured_demand')),
  score_band             SMALLINT NOT NULL CHECK (score_band IN (1, 2, 3)),
  priority_score         NUMERIC(14, 4),
  priority_score_version TEXT NOT NULL,
  score_breakdown_json   JSONB NOT NULL,

  -- Procedencia OPACA: nunca FK, nunca JOIN cross-motor.
  evidence_ref           TEXT NOT NULL,
  -- Versión del score del motor de origen (obligatoria para el lado AEO).
  source_score_version   TEXT,

  rank_in_snapshot       INTEGER NOT NULL CHECK (rank_in_snapshot > 0),

  CONSTRAINT seo_work_queue_items_basis_band_score CHECK (
    (score_basis = 'measured_incremental_clicks' AND score_band = 1 AND priority_score IS NOT NULL)
    OR (score_basis = 'measured_without_curve'   AND score_band = 2 AND priority_score IS NULL)
    OR (score_basis = 'no_measured_demand'       AND score_band = 3 AND priority_score IS NULL)
  ),
  CONSTRAINT seo_work_queue_items_aeo_requires_source_version CHECK (
    origin <> 'aeo_gap' OR source_score_version IS NOT NULL
  ),
  CONSTRAINT seo_work_queue_items_unique_subject
    UNIQUE (snapshot_id, origin, normalized_keyword)
);

CREATE TABLE greenhouse_growth.seo_work_queue_decisions (
  decision_id        TEXT PRIMARY KEY DEFAULT ('seowqd-' || gen_random_uuid()::text),
  organization_id    TEXT NOT NULL REFERENCES greenhouse_core.organizations (organization_id),
  seo_target_id      TEXT NOT NULL REFERENCES greenhouse_growth.seo_targets (seo_target_id),

  -- Anclada al SUJETO, no a la fila: los items se regeneran en cada snapshot.
  origin             TEXT NOT NULL,
  normalized_keyword TEXT NOT NULL,

  decision           TEXT NOT NULL CHECK (decision IN
                       ('accepted', 'deferred', 'dismissed', 'done')),
  note               TEXT,

  -- Evidencia de QUÉ estaba mirando el operador cuando decidió.
  item_id            TEXT REFERENCES greenhouse_growth.seo_work_queue_items (item_id),
  snapshot_id        TEXT REFERENCES greenhouse_growth.seo_work_queue_snapshots (snapshot_id),

  decided_by         TEXT NOT NULL,
  decided_at         TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
```

Índices de lectura: `(seo_target_id, computed_at DESC)` sobre snapshots;
`(snapshot_id, score_band, priority_score DESC NULLS LAST, normalized_keyword)` sobre items;
`(seo_target_id, origin, normalized_keyword, decided_at DESC)` sobre decisions.

### Orden canónico

```
ORDER BY score_band ASC,
         priority_score DESC NULLS LAST,
         normalized_keyword ASC
```

`normalized_keyword` como desempate final es lo que hace la paginación por keyset determinista. El
`rank_in_snapshot` se persiste con ese mismo orden para que "la recomendación #1 de la mañana" sea
un hecho consultable, no un recálculo.

### Por qué el score se expresa en clics y no en un índice

Tres razones, y las tres son de oficio, no de implementación:

1. **Sale en la unidad que el cliente verifica.** "Estimamos 340 clics adicionales al mes" se
   comprueba en su propio Search Console en 60 días. Un índice de 0 a 100 no se comprueba con nada.
   ⚠️ *No confundir esto con una ventaja competitiva: las suites del mercado también conectan Search
   Console y varias muestran ganancia proyectada de clics. La métrica es table stakes. Lo propio es
   la **curva de CTR derivada del sitio** en vez de una tabla de industria —absorbe la depresión por
   AI Overviews de ese vertical sin estimarla— y que el mismo score ordene cuatro orígenes,
   incluido el gap AEO. No usar «ninguna herramienta puede» en material comercial.*

   ⚠️ **Delta 2026-08-15 (2.ª pasada del benchmark) — la curva propia tampoco diferencia sola.**
   **seoClarity** documenta y vende la curva de CTR derivada del **GSC del propio cliente**,
   segmentada mobile/desktop/brand/non-brand; **Sistrix `CTR Potenziale`** también lee «Deine CTR»
   del GSC del cliente. Lo que en ~30 herramientas relevadas **no apareció** es la **combinación
   exacta que esta task construye**: proyectar el alza de clics de un **cambio de posición** con la
   curva del propio GSC. Las dos mitades existen por separado y nunca se juntan — Sistrix, que tiene
   la curva real del cliente, modela **optimización de snippet a posición constante** (no dice «de
   posición 12 a 5 ganas N clics»); Ahrefs, Semrush y la `Trafficschätzung` de Sistrix sí modelan
   CTR-por-posición, pero sobre **clickstream/SERP propios del proveedor**, no sobre tu GSC.
   **Consecuencia para esta task: la fórmula del §Contrato no cambia** — el hallazgo la valida. Lo
   que cambia es cómo se enuncia: la frase citable es la combinación, nunca «curva propia» a secas.
   Y es un **negativo** (nadie lo hace), que es la clase de afirmación más fácil de equivocar: exige
   re-verificación a la fecha antes de cualquier uso comercial. Fuente:
   `.claude/skills/seo-aeo-practice/references/BENCHMARK_SUITES_AEO_2026-08.md`.
2. **La curva propia absorbe el efecto de los AI Overviews en ESE sitio.** No hay que estimar cuánto
   deprime el CTR la respuesta generativa en esa categoría: si lo deprime, ya está adentro de la
   curva medida del cliente. Una curva de industria publicada no tiene esa propiedad.
3. **Es defendible.** Son los datos del cliente, de su propio dominio, en su propia ventana. Un
   volumen estimado por un tercero para un país entero no es defendible frente a un cliente que
   pregunta de dónde salió el número — y en es-LATAM, además, es donde el proveedor mide peor
   (`ISSUE-152`).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- 🔴 **`TASK-1792` Slices 1–2 en `main` ANTES del Slice 7.** El plan de rollback del cutover
  aterriza en el reader legacy, y ese reader hoy no ordena cuando la curva de CTR de la org es
  degenerada (ver Delta 2026-08-28 (3)). Si el cutover tiene que ocurrir antes, el rollback **no
  puede** seguir siendo "vuelve al reader legacy": hay que declarar otra ruta verificada.
- **`TASK-1694` cierra ANTES de Slice 3.** Es bloqueo duro y la razón es de irreversibilidad: el
  colector de discovery persiste lo que el contrato de candidatos le entregue, y un snapshot con la
  misma keyword cuatro veces ya no se corrige hacia adelante.
- Slice 1 (esquema + versionado) → Slice 2 (score) → Slice 3 (colectores + command) → Slice 4
  (worker + scheduler + flag) → Slice 5 (reader + lanes) → Slice 6 (decisión) → Slice 7 (cutover del
  consumer + paridad + señales + docs).
- 🔴 **Slice 1 NO puede shippear sin `priority_score_version` ni `score_breakdown_json`.** Es la
  única pieza irreversible del plan: desde que existe un snapshot productivo sin versión, la
  evidencia de qué se recomendó y con qué reglas está perdida para siempre.
- Slice 6 puede correr en paralelo con Slice 5 una vez cerrado Slice 3, pero **no antes**: la
  decisión se ancla a un sujeto que sólo existe cuando hay colectores.
- 🔴 **Slice 7 es condición de cierre, no un opcional.** La cola no cierra sin un consumer real
  obedeciéndola. Construir la autoridad y que nadie la obedezca es el mismo fracaso que dos
  ordenamientos, con más código.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| `TASK-1669` conserva su propio ordenamiento y quedan dos #1 distintos | UI / agentes | **high** | Contrato firmado antes de que ambas avancen: `TASK-1700` en su `Depends on`, su `context-reader` reducido a envoltorio, su "Priority ordering V1" convertido en config versionada, más test de paridad de orden | no signal — emerge como contradicción visible al operador; se detecta en review de la task |
| Un snapshot se escribe con duplicados o con la barrera engañosa y ya viajó a un plan | migration / cliente | medium | `TASK-1694` como bloqueo duro previo a Slice 3; corrida inicial en shadow sobre un solo target con inspección fila por fila | `growth.seo.work_queue.origin_degraded` + revisión manual del primer snapshot |
| Alguien cambia un umbral del score sin bumpear la versión y el ranking histórico se mueve en silencio | reader / cliente | medium | Config completa dentro del objeto versionado + test que falla ante cambio sin bump + señal de drift | `growth.seo.work_queue.score_version_drift` |
| El materializador se define como Vercel cron y la cola queda invisible en staging | cron | low | Prohibición explícita en Architecture Alignment + gate `vercel-cron-async-critical-gate` + el job vive en `deploy.sh` | falla del gate en CI |
| Un colector caído produce un plan sesgado que parece completo | reader / cliente | medium | Aislamiento por colector + `origin_health_json` obligatorio + el reader **siempre** devuelve `originHealth` y la UI lo muestra; cero relleno con ceros | `growth.seo.work_queue.origin_degraded` |
| El operador trabaja sobre un plan vencido sin saberlo | UI / cliente | medium | `expires_at` obligatorio + `staleness` en el contrato del reader + señal | `growth.seo.work_queue.stale_snapshot` |
| El flag se prende sólo en Vercel y el materializador nunca corre | cron / worker | **high** (bug class documentada) | Docstring multi-runtime en `flags.ts`, declaración en `deploy.sh` **y** `--update-env-vars`, fila en el ledger, verificación en la revisión activa del worker | ausencia de snapshots nuevos + `growth.seo.work_queue.stale_snapshot` |
| El DTO cliente filtra dificultad, volumen estimado o costo de proveedor | cliente | medium | Redactor explícito + test de no-fuga que falla por campo prohibido | fallo del test en CI |
| Un consumer intenta "marcar hecho" con un `UPDATE` sobre el item | migration | medium | Trigger anti-`UPDATE` en las tres tablas + prueba negativa en el sanity live | error de DB visible en Sentry vía `captureWithDomain` |
| La decisión se ancla al `item_id` y desaparece con el siguiente snapshot | command | medium | Anclaje al sujeto por diseño + test que materializa dos snapshots y verifica que la decisión sigue resolviendo | fallo del test en CI |

### Feature flags / cutover

- **`GROWTH_SEO_WORK_QUEUE_ENABLED`** (default `false`), **subordinado** a `GROWTH_SEO_ENABLED`.
  Lo leen **dos runtimes**:
  1. **ops-worker** (`services/ops-worker/deploy.sh`, SoT declarativo con `--set-env-vars`
     destructivo) — gatea el materializador. Aplicar también en vivo con `--update-env-vars` para
     efecto inmediato.
  2. **Vercel** — gatea el reader, los lanes app/ecosystem, la tool MCP y el cutover del consumer.
- **Tercer freno independiente:** Cloud Scheduler `ops-seo-work-queue-materialize` nace **PAUSADO**;
  su estado se declara en el 5.º argumento de `upsert_scheduler_job` y se re-aplica en cada deploy.
- Fila obligatoria en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` declarando runtime y estado por
  ambiente (gate `pnpm docs:closure-check`).
- Revert del cutover: flag a `false` en Vercel + redeploy → la lente vuelve al reader legacy en
  menos de 5 minutos, sin migración inversa.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 — esquema | `pnpm migrate:down` (tres `DROP TABLE`, sin dependientes) o simplemente dejarlas: son aditivas y nadie las lee con el flag OFF | <10 min | sí |
| Slice 2 — score | revert PR; módulo puro sin persistencia | <5 min | sí |
| Slice 3 — colectores + command | revert PR; los snapshots ya escritos quedan como evidencia histórica y no afectan a nadie con el flag OFF | <10 min | sí |
| Slice 4 — worker + scheduler | `gcloud scheduler jobs pause ops-seo-work-queue-materialize` + flag a `false` en la revisión activa del worker | <5 min | sí |
| Slice 5 — reader + lanes | flag a `false` en Vercel + redeploy; las rutas devuelven el no-op prod-safe | <5 min | sí |
| Slice 6 — decisión | revert PR + revocar el grant de `growth.seo.work_queue.decide`; el log escrito queda (append-only, sin efecto downstream) | <10 min | parcial (las decisiones escritas no se borran, por diseño) |
| Slice 7 — cutover del consumer | flag a `false` en Vercel + redeploy → la lente vuelve al reader legacy. 🔴 **Válido SÓLO con `TASK-1792` Slices 1–2 en `main`**: sin eso el destino del rollback no ordena para organizaciones con curva de CTR degenerada, y falla sin aviso | <5 min | sí, **condicionado** |

### Production verification sequence

1. `pnpm pg:connect:migrate` en staging + verificar por `information_schema` las tres tablas, sus
   CHECK, el índice único y los triggers; ejercitar la prueba negativa de `UPDATE`/`DELETE`.
2. Deploy a staging con flag `false` en ambos runtimes + verificar que **nada** cambió: la lente
   sigue leyendo el reader legacy y el worker no crea snapshots.
3. Flag `true` **sólo en el ops-worker** de staging + despausar el scheduler + una corrida manual
   sobre el target real (`berel.com`). Inspeccionar el snapshot fila por fila: bandas correctas,
   `score_breakdown_json` completo, `origin_health_json` con los seis orígenes declarados,
   `competitor_gap` en `down` con razón.
4. Segunda corrida inmediata → debe devolver `reused: true` y **cero filas nuevas**.
5. Corrida con el lado AEO forzado a fallar → snapshot con `aeo_gap.state = 'down'` y el resto de las
   bandas intactas, sin ceros fantasma.
6. Flag `true` en Vercel staging → verificar reader, lanes app/ecosystem y tool MCP con las tres
   personas agente (superadmin, collaborator, client) y el DTO cliente redactado.
7. Cutover del consumer en staging + **test de paridad de orden verde** + revisión visual de que la
   lente no cambió de forma.
8. Repetir 1–7 en producción con cooldown de 24 h entre ambientes, verificando el flag en la
   **revisión activa** del worker (no en el `deploy.sh`) antes de despausar el scheduler.
9. Monitorear las tres señales durante 7 días post-prod. Cualquier `stale_snapshot` o
   `score_version_drift` distinto de 0 es investigación, no ruido.

### Out-of-band coordination required

- **Cloud Scheduler / Cloud Run**: creación del job pausado y aplicación del flag en la revisión
  activa del ops-worker (`gcloud run services update … --update-env-vars`), además de su declaración
  en `deploy.sh`.
- **Vercel**: env var en `Production`, `staging` y `Preview (develop)` + redeploy — no se toma en
  caliente.
- **Operador SEO**: aviso antes del flip del consumer. El orden que ve en pantalla cambia de dueño y
  aparecen filas de orígenes que antes no estaban en esa lista; conviene que sepa por qué antes de
  abrirla un lunes.
- **Dueña de `TASK-1669`**: acuerdo explícito sobre la reducción de su `context-reader` a envoltorio
  **antes** de que ambas avancen en paralelo. Es la mitigación del modo de falla más probable del
  plan completo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existen `greenhouse_growth.seo_work_queue_snapshots`, `..._items` y `..._decisions` con sus
      CHECK de vocabulario cerrado, sus triggers anti-`UPDATE`/anti-`DELETE` y el bloque `DO` de
      verificación post-DDL en la misma migración.
- [ ] `priority_score_version` y `score_breakdown_json` existen desde la **primera** migración, no
      desde una posterior.
- [ ] `computePriorityScore` devuelve clics incrementales estimados
      (`impresiones × max(0, CTR_objetivo − CTR_actual)`) con la curva derivada del propio sitio, y
      un test falla si alguien cambia un valor de la config sin bumpear `priority_score_version`.
- [ ] Ningún item con `score_basis='no_measured_demand'` tiene `priority_score` distinto de NULL, y
      ningún colector ordena por volumen estimado cuando existe demanda medida.
- [ ] `materializeSeoWorkQueue` es idempotente: dos corridas con los mismos insumos devuelven
      `reused: true` y **cero filas nuevas**, verificado contra PostgreSQL real.
- [ ] Un colector caído produce `origin_health_json` con `state` distinto de `ok` y **no** altera el
      score ni el orden de los demás orígenes, verificado con una corrida degradada real.
- [ ] Todo item con `origin='aeo_gap'` tiene `source_score_version` no nulo, y el lado AEO se lee
      **sólo** vía `readSeoAeoGap` (test que falla ante SQL directo sobre `grader_*` desde este
      módulo).
- [ ] `evidence_ref` no participa de ninguna FK ni de ningún JOIN en el módulo.
- [ ] Los items de canibalización entran con `origin='consolidation'` y
      `recommended_verb='consolidate'`, nunca mezclados con los de `optimize`.
- [ ] `UPDATE` y `DELETE` sobre las tres tablas fallan por trigger, verificado contra PostgreSQL
      real.
- [ ] `readSeoWorkQueue` devuelve `{ snapshot, items, originHealth, priorityScoreVersion, asOf,
      staleness }` y sirve idéntico a UI, Nexa, lane ecosystem y tool MCP interna, sin lógica
      duplicada por consumer.
- [ ] El DTO cliente pasa el test de no-fuga: cero dificultad, cero volumen estimado, cero costo de
      proveedor, cero `evidence_ref` cruda, cero breakdown completo.
- [ ] `recordSeoWorkQueueDecision` escribe append-only, se ancla al sujeto (sobrevive al siguiente
      snapshot, verificado con dos materializaciones) y **no ejecuta ningún command** — test que
      falla si el módulo importa un write de otro dominio.
- [ ] `growth.seo.work_queue.decide` está en `capabilities_registry`, en el catálogo TS y con grant a
      ≥1 rol real, con el coverage test verde en el mismo PR.
- [ ] El materializador corre en el ops-worker por Cloud Scheduler; **no** existe entrada nueva en
      `vercel.json` para este job.
- [ ] `GROWTH_SEO_WORK_QUEUE_ENABLED` está declarado en `services/ops-worker/deploy.sh`, aplicado en
      la revisión activa del worker, presente en Vercel y con fila en
      `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.
- [ ] 🔴 **La lente de oportunidades vigente lee `readSeoWorkQueue` en producción** y el test de
      paridad de orden sobre `gsc_striking_distance` está verde.
- [ ] Las tres señales de reliability existen, están registradas en el módulo `growth` y se ven en
      `/admin/operations` con steady 0.
- [ ] Las tres capas documentales están cerradas: arquitectura, funcional y manual de uso.
- [ ] `TASK-1669` tiene su `## Delta` con la reducción de su `context-reader` a envoltorio y
      `TASK-1700` en su `Depends on`.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/growth/seo/work-queue`
- `pnpm vitest run src/lib/growth/seo` (no-regresión del módulo completo)
- `pnpm vitest run src/lib/entitlements` (capability grant coverage)
- `pnpm test` (suite completa, gate de cierre)
- `pnpm build` (producción; pedir autorización al operador antes de correrlo)
- `pnpm migrate:status` + verificación por `information_schema` contra PostgreSQL real
- Sanity live del SQL del reader y prueba negativa de `UPDATE`/`DELETE` vía `pnpm pg:connect:shell`
- Corrida real del handler en el ops-worker de staging + inspección del snapshot
- `pnpm docs:closure-check` (incluye `feature-flags-audit --strict`)
- `pnpm task:lint --task TASK-1700` y `pnpm ops:lint --changed`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `TASK-1669`, `TASK-1667`, `TASK-1668`, `TASK-1690` y `TASK-1691` recibieron su `## Delta` con
      el cambio de fuente de orden.
- [ ] `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md` §3.1 brecha S1
      queda marcada como cerrada con fecha.

## Follow-ups

- Task `ui-ux` para la superficie completa de la cola: bandas visibles, verbos, filtros por origen,
  estado `stale` y `originHealth` en pantalla, con wireframe/flow/motion propios.
- Retirar `readKeywordOpportunities` como reader público una vez que ningún consumer lo llame directo
  (queda como colector interno).
- Orígenes nuevos como migración aditiva a medida que aterricen sus brechas: estacionalidad (S3),
  clustering propio (S4), features de SERP (S5), citabilidad de contenido (A1), linking interno (S9).
- Activar `competitor_gap` cuando `seo_competitors` tenga productor real.
- Notificación push sobre el evento `growth.seo.work_queue.materialized` (brecha S7: hoy el módulo es
  100% pull).
- Federar `get_seo_work_queue` al gateway MCP externo, después de que el read tool interno esté
  rodado.

## Open Questions

- **Tercera tabla `seo_work_queue_decisions`.** La auditoría nombra dos tablas
  (`{snapshots,items}`), pero el log de decisiones necesita su propio destino: escribir la decisión
  sobre el item sería exactamente el `UPDATE` que el invariante prohíbe, y anclarla al `item_id`
  la mataría en el siguiente snapshot. Se propone la tercera tabla anclada al sujeto. Confirmar con
  el operador antes de Slice 6.
- **Cadencia del materializador.** Diaria después de `ops-seo-gsc-snapshot` es lo natural, con
  `expires_at = computed_at + 26h` para que una corrida perdida se note. Confirmar si algún target
  necesita cadencia distinta.
- **Umbral de `minRecomputeIntervalMinutes`** para la materialización manual del operador.
- **Qué hace la banda 3 con los candidatos de discovery sin demanda medida a mediano plazo.** El
  verbo honesto hoy es `measure`, pero medir demanda cuesta (Labs). El puente entre "no priorizable"
  y "vale la pena pagar por saber" es una decisión comercial que esta task no toma.
