# TASK-1699 — Growth SEO: persistir el top-N del SERP que ya se paga

## Delta 2026-08-29 — DÍA 1 VERIFICADO (Pasos 5 y 6 cerrados); y los tres criterios se afinaron contra los datos reales

El cron del 2026-08-29 escribió el día 1: **766 filas** sobre `seot-berel-mx`, 31 keywords. Los
Pasos 5 y 6 quedan **cerrados con evidencia medida**, reproducible con
`scripts/growth/_verify-task-1699-day-one.ts` (**4/4 verde**, no gasta — sólo lee):

- **(a) ~20 filas por keyword** — 31 keywords, **15–20 orgánicas** cada una, promedio **17,06**.
- **(b) el mejor orgánico propio == el snapshot** — 21 comparadas, **21 coinciden, 0 discrepan**.
- **(c) 🔴 costo marginal CERO, que es la promesa central de la task** — el día 1 costó
  **USD 0,1225 con 31 llamadas**, *idéntico* a los tres días previos a la serie (26, 27 y 28-ago:
  0,1225 / 31 cada uno). Persistir el top-N no agregó ni un centavo.
- **(Paso 6) no-op de la re-corrida** — **cero ranuras duplicadas** en toda la tabla; el
  `ON CONFLICT ON CONSTRAINT seo_serp_top_results_slot_unique DO NOTHING` sostiene la idempotencia.

🔴 **Dos de los tres criterios del Paso 5 estaban mal enunciados en la spec, que se escribió antes de
ver un SERP real. Se afinaron contra los datos, no se relajaron:**

1. **«~20 filas por keyword» hay que contarlas sobre `item_type='organic'`.** El writer persiste
   TODOS los item_types **a propósito** (Open Question resuelta en el Delta de implementación): el
   día 1 trae `organic` 529 · `popular_products` 68 · `images` 50 · `related_searches` 42 ·
   `people_also_ask` 30 · `local_pack` 24 · `ai_overview` 10 · `video` 9 · `short_videos` 3 ·
   `paid` 1. Contar el total por keyword da 19–28 y no dice nada del top-N.
2. **«exactamente una fila `is_own_domain = true`» es FALSO como invariante.** Un dominio aparece
   varias veces en un SERP real: subdominios (`bc.`, `vibe.`, `reciboproveedores.`), múltiples
   orgánicos, `local_pack`. En la keyword diagnóstica `site:berel.com` aparece en **las 20**. El
   invariante verdadero —y el que el snapshot mide— es que el **`rank_group` MÍNIMO entre las filas
   propias orgánicas** iguale `seo_rank_snapshots.position`: en `site:berel.com` el mínimo es 1 sobre
   `reciboproveedores.berel.com`, y el snapshot dice exactamente `position=1` con esa URL.

**Paso 8 — la señal NO está verde todavía, y es correcto que no lo esté.**
`seo.serp_top_results.coverage` reporta `warning`: *"2 de 3 día(s)-target con captura de rank y sin
top-N"*. Esos dos días son el **27 y el 28 de agosto**, anteriores al deploy — historia que por diseño
**no es backfilleable** (*"el contexto de esos días no se recupera"*). Con ventana de 3 días
(`SEO_SERP_TOP_RESULTS_COVERAGE_WINDOW_DAYS = 3`), la señal converge sola a `steady=0` el
**2026-08-31**, cuando la ventana contenga sólo días post-rollout. 🔴 **No se toca el umbral para
ponerla verde**: está diciendo la verdad sobre una pérdida real e irrecuperable.

**Paso 9** sigue esperando la maduración: la serie lleva **1 de los 5 días** que exige
`readSerpCompetitorCandidates`, así que la revisión de candidatos con el operador es ≈**2026-09-02**.

Estado honesto: **`día 1 verificado; señal converge el 31-ago; candidatos ≈2-sep`**.

## Delta 2026-08-28 (release a producción) — el rollout dejó de estar bloqueado; queda la verificación del día 1

El paso a producción `develop→main` `c983be7f18e68602404567a19ac8e7e0f157f742` (PR #208,
release_id `c983be7f18e6-92b1b327-a1c9-4e7a-85dc-6a5e300f4e32`, run `33178544139`, manifest
`released`, watchdog `ok` / `drift_count=0`) llevó este código al runtime real.

**Cerrado por el release (pasos de la `### Production verification sequence`):**

- **Paso 1** — la migración `20260828124352232` está aplicada en la instancia única de Cloud SQL:
  `pnpm pg:connect:status` → `No migrations to run!`.
- **Pasos 2–4** — el ops-worker desplegado ya trae el código y el flag:
  `GROWTH_SEO_SERP_TOP_RESULTS_ENABLED` está ON y presente en la **revisión activa**
  `ops-worker-00610-kc8` (runtime de escritura).
- **Paso 3** — el sanity `_sanity-serp-top-results.ts` ya se había corrido 9/9 contra PG real
  (Delta anterior); el release no lo invalida.
- **Paso 7** — el flag quedó ON también en **Vercel Production** (runtime de lectura), aplicado con
  este release + redeploy `greenhouse-aj0ng1mfw`. Verificado con el canary de producción:
  `serp-top-results` respondió `ok:true` (**no** `disabled`) con `rows:[]` — vacío esperado, porque
  la serie todavía no tiene su primer día.
- **Federación** — el gateway `mcp.efeonce.org` se desplegó (revisión
  `efeonce-mcp-gateway-00024-8b8`): el inventario pasó de **21 a 27 tools SEO** y entraron
  `get_seo_serp_top_results` y `get_seo_competitor_candidates` (junto con las 4 de TASK-1662/1696).
  Canary de cierre verde contra producción, cero cambios en Entra.

**Por qué esta task NO pasa a `complete`:**

- **Paso 5 (🔴 el criterio duro de esta task) sigue abierto.** El **día 1 de la serie es el
  2026-08-29**, tras la corrida del cron `ops-seo-rank-capture` de las 05:00 CLT. Recién ahí se
  puede verificar (a) ~20 filas por keyword, (b) exactamente una fila `is_own_domain = true` con
  `rank_group` coincidiendo con `seo_rank_snapshots.position`, y (c) que el `provider_cost` del día
  es **idéntico** al baseline — la prueba de que el costo marginal es cero. La serie **no es
  backfilleable**.
- **Paso 6** — el no-op de la re-corrida del mismo día sólo se puede ejercitar con datos del día 1.
- **Paso 8** — `seo.serp_top_results.coverage` no puede evaluarse en verde antes de la primera
  escritura; hoy reporta el estado pre-rollout honesto.
- **Paso 9** — a **≥5 días** (≈2026-09-02) hay que correr `readSerpCompetitorCandidates` sobre el
  target de Berel y **revisar los candidatos con el operador** antes de declarar competidores. Es
  una decisión de negocio que compromete gasto futuro, no un botón técnico.

Estado honesto: **`code complete, rollout desplegado, verificación del día 1 pendiente`**.

## Delta 2026-08-28 — Slices 1–5 implementados; estado `code complete, rollout pendiente`

**Recalibraciones declaradas antes de ejecutar** (la spec era pre-1662/1696):
(1) CERO ALTER a `seo_competitors` — la autoría la dejó TASK-1662 con modelo más rico
(`declared_by/at/source` + `proposal_ref` + retiro con autoría); la evidencia de recurrencia viaja
COMPACTA en `proposal_ref` (`serp_top:v1:<dominio>:kw=N:days=M:med=P:win=Wd`), re-computable siempre
desde la tabla del top-N — no se persiste un segundo almacén de la evidencia.
(2) `declareSeoCompetitors`/`retireSeoCompetitors` NO se crearon: existen como
`declareCompetitors`/`retireCompetitors` (TASK-1662) y el Slice 4 quedó acotado al reader proponedor.
(3) El delta a TASK-1696 es obsoleto (está `complete`; este trabajo se construyó encima).
(4) La tensión "misma transacción" vs "el fallo no impide el snapshot" se resolvió: intento atómico
(`withTransaction` con ambos INSERTs) y fallback observado que escribe el snapshot solo.
(5) Los lanes ecosystem son **sólo-internal 404 anti-oracle** (§7: dato competitivo) — divergencia
deliberada respecto de la prosa de la spec, consistente con provider-spend y keyword-gap.

**Implementado en `develop` (local, sin push):**

- **Slice 1** — migración `20260828124352232`: `seo_serp_top_results` append-only ESTRICTO
  (trigger anti UPDATE/DELETE, GRANTs sólo SELECT+INSERT), UNIQUE por ranura `rank_absolute`
  (jamás `rank_group`), índices de serie y recurrencia. Aplicada contra PG real.
- **Slice 2** — `serp-top-results.ts`: `parseSerpTopResults` puro (hermano del parser existente;
  `normalizeDomain`/`extractHost`/`isOwnDomain` EXPORTADOS de rank-capture, no duplicados) +
  `persistSerpTopResults` (UNNEST multi-fila + DO NOTHING, tope 30). Open Questions resueltas con
  la propuesta de la spec: todos los `item_type`; título completo con cap defensivo 2048; sin filtro
  de plataformas en V1.
- **Slice 3** — cableado en `captureRankSnapshot` tras flag `GROWTH_SEO_SERP_TOP_RESULTS_ENABLED`
  (dual-runtime, ON declarativo `:-true` en `deploy.sh` — cada día apagado pierde la serie de ese
  día): tx atómica snapshot+top-N con fallback observado; test del fallo simulado; test de
  no-regresión EXACTA de `buildSerpTask` (costo marginal CERO); fila dual en el ledger de flags.
- **Slice 4** — `competitor-discovery.ts`: `readSerpCompetitorCandidates` (umbrales versionados
  30d/3kw/5días como constantes exportadas; excluye `is_own_domain` y no-orgánicos;
  `alreadyDeclared` + `proposalRef` sugerido) — PROPONE; el execute es `declareCompetitors`
  existente. `readSerpTopResults` con `hasMore` declarado.
- **Slice 5** — lanes admin + ecosystem (sólo-internal) + tools MCP `get_seo_serp_top_results` /
  `get_seo_competitor_candidates` + señal `seo.serp_top_results.coverage` (pre-rollout honesto;
  `error` = escritura muerta con pérdida irrecuperable) + federación en `efeonce-mcp` (commit local
  `92e7197`; inventario 27 tools = 20 lecturas + 7 writes; deploy post-release).
- **Evidencia**: tests focales 25 nuevos + suites growth/mcp/reliability verdes; sanity
  `_sanity-serp-top-results.ts` **9/9 contra PG real** (INSERT productivo, DO NOTHING por ranura,
  trigger append-only, percentile_cont/HAVING/DATE−int reales, rollback transaccional CERO residuo).

**Rollout pendiente (por diseño, no por omisión):** la escritura vive en el cron del ops-worker
desplegado, que no tiene este código hasta el release develop→main. **El día 1 de la serie es el
día del primer deploy del worker** — pasos 2–9 de la Production verification sequence (corrida real
con `provider_cost` idéntico al baseline, re-run no-op, env var Vercel, señal en verde, candidatos a
≥5 días) quedan para esa ventana. Cada día sin release pierde el top-N de ese día (el pre-check de
idempotencia impide re-capturar sin recomprar).

## Delta 2026-08-28 — el command de declaración YA EXISTE (TASK-1662): consumirlo, no recrearlo

`TASK-1662` aterrizó primero la mitad "declaración" de esta task:

- `seo_competitors` ya NO es huérfana ni carece de autoría: la migración `20260828113457119`
  agregó `declared_by/declared_at/declared_source` (CHECK acoplado, vocabulario canónico),
  `proposal_ref` **OPACA** y `retired_by/retired_reason` (CHECK con `effective_to`).
- Los commands gobernados existen: `declareCompetitors`/`retireCompetitors`
  (`src/lib/growth/seo/competitors.ts`), con techo `GROWTH_SEO_COMPETITORS_PER_TARGET`,
  outcome por ítem, outbox `growth.seo.competitor.{declared,retired}` y 3 lanes
  (admin + ecosystem internal-only + MCP `declare/retire_seo_competitors`).

**Lo que esta task conserva** es su núcleo irrecuperable: persistir el top-N ya pagado +
el **reader de candidatos** por recurrencia medida. Su forma propose→confirm se completa
llamando `declareCompetitors(..., { proposalRef: '<referencia opaca al top-N>' })` — el
`proposal_ref` existe exactamente para eso. **NUNCA** crear un segundo command de
declaración ni tocar las columnas de autoría: `competitor-discovery.ts` queda acotado al
reader proponedor.

## Delta 2026-08-27

- TASK-1696 ya aterrizó en `src/lib/growth/seo/rank-capture.ts`: la llamada al transporte declara
  ahora `consumer: 'seo'`. El conflicto de merge que esta task anticipa es real pero acotado —los
  diffs siguen cayendo en zonas distintas del archivo (parser vs. llamada)— y el orden correcto es
  rebasar sobre TASK-1696 antes de tocarlo.
- El ledger `seo_provider_spend_daily` ganó `consumer`, `cost_basis` y `price_table_version`, y su
  clave única pasó a seis columnas `NULLS NOT DISTINCT` — cambiado por TASK-1696. Persistir el top-N
  que ya se paga no agrega llamadas, pero cualquier llamada nueva al transporte debe declarar
  `consumer`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `EPIC-022`
- Status real: `complete 2026-09-01 — VIVO en produccion desde el release c983be7f18e6. Serie del top-N corriendo: 766/775/762/778 filas los dias 29,30,31-ago y 1-sep. Senal seo.serp_top_results.coverage convergio a ok/uncovered=0 el 2026-09-01, sin tocar el umbral. Pendiente NO bloqueante: el Paso 9 (revision de candidatos con el operador) exige >=5 dias de serie y cae el 2026-09-02; la propia Verification lo declara diferido. Gate no corrido: pnpm build (~30GB, requiere autorizacion explicita del operador)`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `none`
- Branch: `Greenhouse develop; local-first, sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Delta 2026-08-15 (2) — cifras corregidas por verificación adversarial

Corrección **editorial**: no cambia el diseño, el alcance ni ninguna decisión de esta task.

El "~98% de la factura variable" que esta task cita de la auditoría fuente está mal dividido. El
valor correcto es **90,0%** con el modelo de proyección del propio documento (USD 4,06 de USD 4,51)
y **76,7%** contra los dólares realmente medidos en `greenhouse_growth.seo_provider_spend_daily`
(`serp` USD 1,3440 sobre USD 1,7525 totales, ventana 2026-08-06→15). El rank capture sigue siendo,
por lejos, la parte dominante de la factura variable — y el argumento de esta task (el top-N ya
está pagado y se descarta) no depende del porcentaje.

Verificado en la misma pasada: **USD 0,004364 por llamada y 308 llamadas** son correctos
(USD 1,3440 / 308 = 0,004364).

## Summary

Cada corrida diaria de rank capture compra el SERP completo hasta la posición 20 —el multiplicador
`depth 20` **ya está pagado**— y `parseSerpRankObservation` recorre esas filas, se queda con la
nuestra y **tira el resto**. Esta task las persiste en una tabla append-only: posición, dominio, URL,
título y tipo de elemento. Costo marginal **cero**. Y le da su primer consumidor a `seo_competitors`,
que hoy existe en el schema sin una sola referencia en `src/`: los competidores se **descubren** por
recurrencia en el top-N en vez de pedírselos al operador como input.

## Why This Task Exists

Es la brecha **S2** de la auditoría
`docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md` (§3.1), y es la única
del plan cuyo costo de demora **no se puede recuperar**.

**Hecho 1 — lo compramos y lo tiramos.** `buildSerpTask` manda `depth: SERP_RANK_CAPTURE_DEPTH`
(= 20, `src/lib/growth/seo/rank-capture.ts:69`) y `load_async_ai_overview: true` (`:239`). El
comentario del propio archivo (`:54`) documenta el precio: `base × 2 (load_async_ai_overview) × 2
(depth 20)`. El `depth 20` está bien justificado —la posición útil vive entre 8 y 20—, pero **el
multiplicador ya pagado también compra las filas de todos los competidores del top-20**.
`parseSerpRankObservation` (`src/lib/growth/seo/rank-capture.ts:171-221`) las recorre una por una:
acumula los `type` en `featureTypes`, busca el primer `organic` cuyo dominio sea nuestro, y descarta
todo lo demás. De cada corrida se guarda **una fila** (`seo_rank_snapshots`) y se pierden ~19.

**Hecho 2 — el costo de demora es irrecuperable, y es el único caso del plan.** Todo lo demás de la
auditoría se puede construir el mes que viene con la misma calidad: la cola priorizada, el análisis
de citabilidad, el gate de presupuesto, el detector de imports. **El SERP de ayer no.** No hay
endpoint que devuelva "cómo se veía el top-20 de `pintura` en MX el 14 de agosto"; el
`historical_keyword_data` de DataForSEO es demanda histórica, no ranking histórico de terceros, y su
precio ni siquiera está verificado (§3.3 de la auditoría). Cada día que esto no está en producción se
pierde un día de serie que **sólo se recompra**, y sólo hacia adelante. A 31 keywords × 20 filas ×
1 día, es ~620 observaciones de mercado por día que se disuelven.

**Hecho 3 — `seo_competitors` es una tabla huérfana.** Existe desde
`migrations/20260805134439202_task-1299-growth-seo-schema.sql:59-76`, con su ventana
`effective_from`/`effective_to`, su índice único parcial de vigencia y su trigger anti-DELETE
(`:201-203`). Su única aparición en `src/` es `src/types/db.d.ts:12296` — cero readers, cero writers,
cero consumers. `TASK-1662` (keyword gap) **asume que ya conoces al competidor** y se lo pide al
operador. El top-N persistido responde esa pregunta con dato medido: quién aparece, cuántos días, en
cuántas de tus keywords.

**Hecho 4 — es sustrato de otras dos brechas.** La auditoría marca S2 como precondición de **S3**
(estacionalidad) y **S4** (clustering propio): sin las filas del SERP no hay con qué construir ni
"quién más se mueve en esta keyword" ni "estas dos keywords devuelven el mismo SERP, son la misma
página". Persistirlas ahora no obliga a construir nada de eso hoy; **no persistirlas lo bloquea para
siempre hacia atrás.**

## Goal

- Cada corrida de rank capture persiste el **top-N del SERP** que ya pagó: posición, dominio, URL,
  título y tipo de elemento, en una tabla append-only con la misma clave temporal que
  `seo_rank_snapshots`.
- El costo del proveedor **no sube en un centavo**: cero llamadas nuevas, cero cambio de `depth`,
  cero cambio de cadencia.
- `seo_competitors` deja de ser huérfana: existe un reader que **propone** competidores por
  recurrencia medida en el top-N, y un command gobernado que los declara con autor.
- La serie empieza a acumularse **desde el día del deploy**, que es lo único que esta task puede
  ganar y lo único que la demora pierde.

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
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (§1.1 boundary SEO↔AEO, §6
  gobernanza DataForSEO, §7 primitives canónicos, §9 entitlements, §17.3 reglas de extracción)
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` (append-only + trigger anti-mutación;
  flag default-OFF)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/agent-invariants/SQL_DATE_MATH_AGENT_INVARIANTS.md`
- `.claude/rules/growth-seo.md` y `.claude/rules/migrations.md` (invariantes auto-load)

Reglas obligatorias:

- **NUNCA se compra nada nuevo.** Esta task no agrega una llamada, no sube `depth`, no cambia
  `load_async_ai_overview`, no toca la cadencia. Si el diff toca `buildSerpTask` con algo que no sea
  leer la respuesta, está fuera de contrato.
- **Las tablas snapshot de TASK-1299 prohíben `DO UPDATE`.** El patrón canónico del dominio es
  pre-check de idempotencia + `ON CONFLICT DO NOTHING`; los triggers anti-mutación lo hacen
  obligatorio, no opcional.
- **Append-only con trigger anti-DELETE**, igual que las hermanas de 1299. Una medición del SERP es
  un hecho fechado: reescribirlo es falsificar el histórico que la task existe para tener.
- **NUNCA un JOIN, VIEW o FK entre tablas `seo_*` y `grader_*`.** El cruce es en memoria por
  `organization_id`.
- **NUNCA se expone comparativa competitiva al cliente.** §7 de la auditoría lo prohíbe hasta que
  `seo_competitors` tenga consumidores maduros. Esta task **crea** el primero; no habilita la
  promesa.
- **El descubrimiento propone; el humano declara.** Un dominio que aparece en el top-N es un hecho
  medido; "X es competidor de este cliente" es una **clasificación con autor**. Se sigue el patrón
  `propose → confirm → execute`, y la autoría viaja acoplada por CHECK (mismo criterio que
  `intent_declared_by`/`intent_declared_at` en `seo_keyword_set_members`).
- **NUNCA cerrar una vigencia de `seo_competitors` con `NOW()`**: devuelve el inicio de la
  transacción y con un abrir+cerrar en la misma tx da `effective_to = effective_from`, que viola el
  CHECK de ventana. El dominio ya se quemó con esto — se usa `clock_timestamp()`.
- **La escritura no rompe la captura.** Si la persistencia del top-N falla, la observación de rank
  —que es el dato que sostiene la pantalla ancla y ya está pagada— se guarda igual. Degradación
  honesta, observada, nunca silenciosa.

## Normative Docs

- `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md` (S2 §3.1, §2.1
  multiplicadores silenciosos, §1.4 `seo_competitors` huérfana, §7 lo que no se debe prometer) —
  **fuente de contenido de esta task**
- `migrations/20260805134439202_task-1299-growth-seo-schema.sql` — el schema hermano cuyo patrón
  (append-only + triggers + GRANTs sin DELETE) se replica literalmente
- `docs/tasks/complete/TASK-1303-*.md` [verificar nombre exacto] — patrón canónico de batch que gasta
  (spend fence, pre-check de idempotencia, `ON CONFLICT DO NOTHING`)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` — el flag nuevo se registra en el mismo PR

## Dependencies & Impact

### Depends on

- `greenhouse_growth.seo_rank_snapshots` y su clave
  `(seo_target_id, keyword, engine, device, capture_date)`
  (`migrations/20260805134439202_task-1299-growth-seo-schema.sql:78-100`)
- `greenhouse_growth.seo_competitors` (`:59-76`) — la tabla huérfana que gana su primer consumidor
- `src/lib/growth/seo/rank-capture.ts` — `parseSerpRankObservation` (`:171-221`), `buildSerpTask`
  (`:225-245`), el writer con `ON CONFLICT DO NOTHING` (`:278-283`), `SERP_RANK_CAPTURE_DEPTH` (`:69`)
- `src/lib/growth/seo/rank-capture-batch.ts` (`runRankCaptureBatch`) y el handler del ops-worker
  (`services/ops-worker/server.ts:1873+`), disparado por Cloud Scheduler `ops-seo-rank-capture`
  (`0 5 * * *`, `services/ops-worker/deploy.sh:1162`)
- `enforceSeoRunEntitlement` (`src/lib/growth/seo/entitlement.ts`) — no cambia, pero es el chokepoint
  que ya autorizó el gasto que esta task aprovecha
- `src/lib/growth/seo/resolve-target.ts` — resolución de target/mercado, obligatoria en cualquier
  reader nuevo (ISSUE-153)

### Blocks / Impacts

- **`TASK-1662`** (keyword gap discovery, `to-do`): hoy asume que el competidor te lo dan como input.
  Con esta task, el candidato sale medido del top-N. **Es el impacto más fuerte del lote.**
- **`TASK-1655`** (historical data platform, `in-progress`): comparte la pregunta "qué serie hay que
  empezar a guardar ya". Coordinar para no abrir dos almacenes del mismo hecho.
- **S3 (estacionalidad) y S4 (clustering propio)** de la auditoría: esta task es su sustrato. Ambas
  siguen sin task y esta no las abre.
- **`TASK-1696`**: toca el mismo camino de captura desde el ángulo del gasto (`consumer` en el
  ledger). Sin dependencia dura; conflicto de merge posible en `rank-capture.ts`.
- **`EPIC-022`**: mueve S2 de brecha a base construida.

### Files owned

- `migrations/<timestamp>_task-1699-seo-serp-top-results.sql`
- `src/lib/growth/seo/serp-top-results.ts` (nuevo: parser puro, writer, reader)
- `src/lib/growth/seo/competitor-discovery.ts` (nuevo: reader de candidatos + command de declaración)
- `src/lib/growth/seo/rank-capture.ts` (llamada al parser hermano + persistencia en el mismo camino)
- `src/lib/growth/seo/flags.ts`
- `src/lib/growth/seo/contracts.ts` [verificar path exacto del módulo de contratos del dominio]
- `src/app/api/platform/ecosystem/growth/seo/**` (lane de lectura) [verificar path exacto]
- `src/mcp/greenhouse/server.ts` (tool de lectura, mismo PR)
- `src/lib/reliability/queries/seo-serp-top-results-coverage.ts` (nuevo)
- `src/lib/reliability/signals.ts` · `src/lib/reliability/registry.ts`
- `src/lib/growth/seo/__tests__/*`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- **La compra.** `depth: 20` + `load_async_ai_overview: true` en cada tarea SERP
  (`rank-capture.ts:234-239`), con el costo del multiplicador documentado en el propio archivo
  (`:54`). Medido: USD 0,004364 por llamada, 308 llamadas en 10 días — **90,0% de la factura
  variable** con el modelo de proyección de la auditoría y **76,7%** contra los dólares medidos en
  el ledger (`serp` USD 1,3440 de USD 1,7525). La familia dominante del stack por lejos.
- **El parser que ya recorre las filas.** `parseSerpRankObservation` (`:171-221`) itera
  `tasks[] → result[] → items[]`, junta `featureTypes` de todo lo que no es `organic`, y resuelve
  nuestra posición con `rank_group ?? rank_absolute`. **Toda la información del top-N pasa por ese
  bucle y se descarta.**
- **La tabla hermana y su patrón.** `seo_rank_snapshots` append-only con UNIQUE
  `(seo_target_id, keyword, engine, device, capture_date)`, escrita con
  `ON CONFLICT ... DO NOTHING` (`rank-capture.ts:278-283`), más dos índices de lectura
  (`schema:98-100`).
- **El patrón append-only completo de 1299**: triggers anti-DELETE (`trg_seo_competitors_no_delete`,
  `:201-203`), guard block que verifica tablas y triggers (`:219-240`), GRANTs sin DELETE para
  `greenhouse_runtime`/`greenhouse_app` (`:288-290`).
- **`seo_competitors` con su ventana de vigencia**: `effective_from`/`effective_to`, CHECK
  `effective_to > effective_from`, índice único parcial `WHERE effective_to IS NULL` (`:59-76`).
- **El cron activo**: `ops-seo-rank-capture` (`0 5 * * *` CLT) despausado desde 2026-08-06 tras smoke
  E2E (`services/ops-worker/deploy.sh:1162-1167`).
- **Señal de lag de la serie**: `seo.rank.capture_lag`
  (`src/lib/reliability/queries/seo-rank-capture-lag.ts`), con la nota de honestidad de que un hueco
  del día **no se puede reconstruir después** — exactamente el argumento de esta task.

### Gap

- **No existe ninguna tabla que guarde el SERP de terceros.** Las 8 tablas de 1299 son sobre
  *nosotros*: nuestro rank, nuestro audit, nuestros backlinks, nuestras keywords. Del mercado sólo
  queda el booleano de features.
- `parseSerpRankObservation` **no tiene hermano**: no hay una función pura que devuelva las filas del
  top-N, así que ningún consumer puede tenerlas sin volver a comprar.
- **`seo_competitors` no tiene un solo consumidor** en `src/` (única aparición:
  `src/types/db.d.ts:12296`), ni columna de autoría: no puede decir quién declaró a un dominio como
  competidor ni con qué evidencia.
- **No hay reader de descubrimiento**: nada responde "¿qué dominios aparecen recurrentemente en el
  top-N de mis keywords?".
- **`serp_features` se guarda como array plano** de tipos presentes; no se sabe en qué posición
  apareció cada feature ni qué dominio la ocupaba (brecha S5 de la auditoría; esta task no la cierra
  pero deja el dato disponible).

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/growth/seo/` dentro del monolito Next.js de greenhouse-eo. La escritura
  corre en el **ops-worker** (Cloud Run, cron `ops-seo-rank-capture`); la lectura, en Vercel (lane
  app, lane ecosystem) y en el adapter MCP.
- Future candidate home: `domain-package`
- Boundary: el contrato canónico de escritura es `persistSerpTopResults`, invocado **sólo** desde el
  camino de rank capture que ya pagó la llamada; el de lectura es `readSerpTopResults` y
  `readSerpCompetitorCandidates`; la declaración de competidor es el command
  `declareSeoCompetitors`. Consumers autorizados: la ruta app, el lane ecosystem, la tool MCP y
  —a futuro— `TASK-1662`. Ningún consumer arma SQL propio contra la tabla nueva ni contra
  `seo_competitors`.
- Server/browser split: cada archivo nuevo lleva `import 'server-only'`. El cliente Postgres, el
  cliente DataForSEO y el secreto del proveedor no cruzan al browser; no hay superficie visible en
  esta task.
- Build impact: none — sin dependencia nueva, sin input de filesystem, sin entrypoint global.
- Extraction blocker: none nuevo. Se conserva el único acople ya declarado en §17.2
  (`seo_targets.organization_id` → `greenhouse_core.organizations`); la tabla nueva referencia
  `seo_targets` dentro del propio dominio.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `migration`
- Source of truth afectado: `greenhouse_growth.seo_serp_top_results` (nueva, append-only) ·
  `greenhouse_growth.seo_competitors` (columnas de autoría aditivas + primer writer) · la respuesta
  SERP ya comprada, como fuente de los hechos.
- Consumidores afectados: el batch de rank capture en ops-worker (escritura), la ruta app de SEO, el
  lane ecosystem, la tool MCP nueva, y `TASK-1662` a futuro.
- Runtime target: `worker` (escritura, Cloud Run ops-worker) + `production` (lectura, Vercel).
  **Multi-runtime: el flag se lee en ambos.**

### Contract surface

- Contrato existente a respetar: `parseSerpRankObservation` y `SerpRankObservation`
  (`rank-capture.ts:171-221`) — **no cambian de firma ni de comportamiento** · el writer de
  `seo_rank_snapshots` con `ON CONFLICT DO NOTHING` (`:278-283`) · el schema de 1299 y sus triggers ·
  `enforceSeoRunEntitlement` como único gate de gasto.
- Contrato nuevo o modificado:
  - `parseSerpTopResults(tasks: unknown[]): SerpTopResultRow[]` — parser **puro**, hermano del
    existente, sobre la misma respuesta.
  - `persistSerpTopResults(input)` — writer append-only con `ON CONFLICT DO NOTHING`.
  - `readSerpTopResults({ seoTargetId, keyword?, from?, to?, limit, cursor })` — reader canónico.
  - `readSerpCompetitorCandidates({ seoTargetId, windowDays, minKeywords, minDays })` — descubrimiento
    por recurrencia; **propone, no declara**.
  - `declareSeoCompetitors({ seoTargetId, domains, actor, declaredBy, evidence })` — command
    idempotente que abre vigencias en `seo_competitors` con autoría.
  - Tool MCP de lectura del top-N en el MISMO PR (mandato de `.claude/rules/growth-seo.md`; lectura
    bajo `efeonce.mcp.read`, sin scope nuevo en Entra).
- Backward compatibility: `compatible` para todo lo existente; `gated` para la escritura nueva (flag
  default OFF). Ninguna firma existente cambia.
- Full API parity: la lectura del top-N y el descubrimiento entran por readers canónicos consumidos
  igual por UI, Nexa, lane ecosystem y MCP; la declaración de competidor es un command apto para
  `propose → confirm → execute` — el LLM **propone** candidatos y el write ocurre sólo en la
  confirmación humana.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.seo_serp_top_results` (nueva) ·
  `greenhouse_growth.seo_competitors` (aditivo: autoría + evidencia) ·
  `greenhouse_growth.seo_rank_snapshots` (sólo lectura del contexto de la corrida).
- Invariantes que no se pueden romper:
  - **Costo marginal cero.** Ninguna llamada nueva al proveedor. La tabla se llena **exclusivamente**
    con la respuesta que el rank capture ya trajo.
  - **Append-only.** Trigger anti-DELETE + `ON CONFLICT DO NOTHING`; jamás `DO UPDATE`. Es el patrón
    duro de las snapshot tables de 1299 y esta tabla es una de ellas.
  - **La ranura del SERP es `rank_absolute`, no `rank_group`.** `rank_absolute` es único a lo largo
    de todo el SERP; `rank_group` se repite entre bloques (un item orgánico y un item de otro tipo
    pueden compartirlo). Usar `rank_group` como clave produce colisiones y pérdida silenciosa de
    filas por el `DO NOTHING`.
  - **La persistencia del top-N no puede tumbar la captura de rank.** El fallo se observa con
    `captureWithDomain` y la corrida sigue: perder la fila de contexto es malo; perder además la
    medición pagada es peor. Mismo criterio que el spend recorder del transporte.
  - **Ausencia ≠ vacío.** Si el proveedor respondió OK y el SERP trajo menos de 20 filas, se guardan
    las que vinieron; no se rellena. Si no trajo ninguna, no se inventa una fila cero.
  - **Un dominio en el top-N NO es un competidor declarado.** Es una observación. `seo_competitors`
    sólo se escribe por el command, con autor.
  - **La vigencia se cierra con `clock_timestamp()`**, nunca con `NOW()`.
  - **Autoría acoplada por CHECK**: `declared_by` y `declared_at` existen o faltan juntos, y no se
    backfillean (una fila sin autor dice "nadie lo declaró", que es la verdad para las filas
    históricas — hoy no hay ninguna).
  - **Cero FK hacia `grader_*`.**
- Tenant/space boundary: `seo_serp_top_results.seo_target_id` con FK a `seo_targets`, que ancla la
  organización. Todo reader resuelve el target por `resolveTarget` (`resolve-target.ts`), **nunca**
  con SQL inline `ORDER BY created_at DESC LIMIT 1` (ISSUE-153), y declara `meta.servedMarket`.
- Idempotency/concurrency: la clave única
  `(seo_target_id, keyword, engine, device, capture_date, rank_absolute)` hace que re-correr la
  captura del día sea un no-op. La escritura del top-N viaja en la **misma transacción** que la
  observación de rank de esa keyword, para que no exista un día con snapshot y sin contexto (o al
  revés) por una caída a mitad de camino.
- Audit/outbox/history: la tabla **es** el histórico. Sin outbox: no hay consumer reactivo — el
  descubrimiento de competidores se consulta a demanda, no se materializa. Se declara explícito para
  que nadie agregue un evento "por si acaso".

### Migration, backfill and rollout

- Migration posture: `additive` (tabla nueva + 3 columnas nullable en `seo_competitors`)
- Default state: `flag OFF` — `GROWTH_SEO_SERP_TOP_RESULTS_ENABLED` default `false`. La tabla existe
  vacía y el parser corre sin persistir hasta el flip.
- Backfill plan: **N/A por definición, y ese es el punto de la task.** No hay nada que backfillear:
  el SERP de ayer no se puede recuperar. La serie empieza el día del flip.
- Rollback path: `flag off` para detener la escritura (instantáneo, sin pérdida de la captura de
  rank) · `reverse migration` para el schema mientras la tabla esté vacía · después del primer día de
  datos, el rollback correcto es **conservar la tabla y apagar el flag**, porque revertir borra una
  serie que no se recompra.
- External coordination: una env var nueva en **Cloud Run ops-worker** (escritura) y en **Vercel**
  (lectura gateada). Declarada en `services/ops-worker/deploy.sh` (sus `--set-env-vars` son
  destructivos) **y** aplicada con `gcloud run services update --update-env-vars`. Fila en
  `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR.

### Security and access

- Auth/access gate: la escritura sólo la ejecuta el batch del ops-worker, detrás del chokepoint de
  entitlement que ya autorizó la corrida. La lectura entra por el lane app con `can()` sobre la
  capability de lectura SEO del dominio y por el lane ecosystem con `efeonce.mcp.read`. El command
  `declareSeoCompetitors` exige capability de escritura del dominio y **no** se cablea al cliente
  PKCE público compartido.
- Sensitive data posture: `no sensitive data` en el sentido de PII — son URLs y títulos públicos del
  SERP. Sí es **dato competitivo del cliente**: no se expone en superficies de cliente (§7 de la
  auditoría) ni en respuestas públicas.
- Error contract: `canonicalErrorResponse(code, ...)` en cualquier borde HTTP nuevo, prose es-CL
  desde `src/lib/copy/growth.ts`. En el camino de escritura, `captureWithDomain(err, 'growth', ...)`
  y seguir.
- Abuse/rate-limit posture: sin superficie nueva de abuso — la escritura no es alcanzable por HTTP.
  Los readers heredan los límites del lane. Sí se declara un **tope de filas por corrida**
  (`SERP_TOP_RESULTS_MAX_ROWS_PER_KEYWORD`, alineado con `SERP_RANK_CAPTURE_DEPTH`) para que una
  respuesta anómala del proveedor no infle la tabla.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/seo src/lib/reliability` con fixtures reales de
  respuesta SERP (incluidos SERPs con AI Overview, PAA y local pack).
- DB/runtime checks: `pnpm pg:connect:migrate` + verificación por `information_schema` /
  `pg_constraint` / `pg_trigger` de la tabla, la UNIQUE, el trigger anti-DELETE y los GRANTs sin
  DELETE. Script `scripts/growth/_sanity-serp-top-results.ts` que ejercita el INSERT productivo
  contra PostgreSQL con `commit + try/finally`.
- Integration checks: una corrida real de `runRankCaptureBatch` sobre el target de Grupo Berel en
  staging, verificando que el `provider_cost` del día **es idéntico** al de los días previos y que
  aparecieron ~20 filas por keyword.
- Reliability signals/logs: `seo.serp_top_results.coverage` (nueva) + `seo.rank.capture_lag`
  (existente, como control de que la captura no se degradó).
- Production verification sequence: ver Zone 3.

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects.
      ✅ §Backend/Data Contract nombra tabla, readers, commands y lanes con rutas reales
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
      ✅ append-only por trigger, lanes internal-only 404 anti-oracle, ON CONFLICT DO NOTHING
- [x] Migration/backfill/rollback posture is explicit and proportional to risk.
      ✅ migración con anti pre-up-marker; sin backfill por diseño (la serie no es backfilleable); rollback = flag OFF
- [x] Runtime or DB evidence is listed for any change beyond docs/tooling.
      ✅ señal ok/uncovered=0 + serie 766/775/762/778 medida en PG (2026-09-01)
- [x] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.
      ✅ lanes internal-only con 404 anti-oracle; sin datos crudos del proveedor en el DTO

## Capability Definition of Done — Full API Parity gate

- [x] **Lógica en el primitive, no en la UI.** Parser, writer, readers y command viven en
      `src/lib/growth/seo/`; ninguna pantalla arma SQL contra la tabla nueva.
      ✅ parser/writer/readers en src/lib/growth/seo/**; los routes sólo transportan
- [x] **Modelada como aggregate/recurso/command.** El top-N es un recurso temporal por
      `(target, keyword, engine, device, fecha, ranura)`; la declaración de competidor es un command
      sobre el aggregate `seo_competitors`, no un click-handler.
      ✅ recurso temporal append-only con ranura rank_absolute
- [x] **Read** expuesto como reader canónico (`readSerpTopResults`, `readSerpCompetitorCandidates`);
      **write** (`declareSeoCompetitors`) con command semantics, autorización fina por capability,
      idempotencia, autoría acoplada, errores canónicos y observabilidad.
      ✅ readSerpTopResults + readSerpCompetitorCandidates verificados en competitor-discovery.ts
- [x] **Capability + grant en el MISMO PR** si el command introduce una capability nueva: registry +
      grant a ≥1 rol real + coverage test (TASK-873/935). Si reusa la capability de escritura SEO ya
      existente, declararlo explícito y no crear una redundante.
      ✅ N/A verificado: la task NO introduce capability nueva — cero cambios a entitlements-catalog/capabilities_registry en sus 7 commits
- [x] **Camino programático declarado:** lane ecosystem + tool MCP de lectura en el mismo PR; el
      command de declaración expone su camino en el lane app (y su federación queda como follow-up
      declarado, no como deuda muda).
      ✅ lanes ecosystem + 2 tools MCP en los mismos commits (c5b609d12)
- [x] **Write apto para `propose → confirm → execute`:** `readSerpCompetitorCandidates` es el
      *propose* (evidencia medida, sin efecto), `declareSeoCompetitors` es el *execute* que sólo se
      invoca tras confirmación humana. El LLM nunca declara un competidor.
      ✅ readSerpCompetitorCandidates propone con proposalRef; el execute es declareCompetitors (TASK-1662)
- [x] **Un primitive, muchos consumers:** cero lógica de recurrencia duplicada entre la UI futura,
      Nexa, MCP y `TASK-1662`.
      ✅ la recurrencia vive sólo en competitor-discovery.ts; lanes y tools la consumen
- [x] **Parity check = SÍ.**
      ✅ app lane + ecosystem lane + tool MCP, los tres sobre el mismo reader

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

### Slice 1 — La tabla append-only

- Migración `task-1699-seo-serp-top-results` creada con `pnpm migrate:create` (markers literales).
- `greenhouse_growth.seo_serp_top_results`:
  ```sql
  serp_result_id  TEXT PRIMARY KEY DEFAULT ('seosr-' || gen_random_uuid()::text),
  seo_target_id   TEXT NOT NULL REFERENCES greenhouse_growth.seo_targets (seo_target_id) ON DELETE RESTRICT,
  keyword         TEXT NOT NULL,
  engine          TEXT NOT NULL,
  device          TEXT NOT NULL CHECK (device IN ('desktop','mobile','tablet')),
  capture_date    DATE NOT NULL,
  rank_absolute   INTEGER NOT NULL CHECK (rank_absolute > 0),   -- la RANURA del SERP
  rank_group      INTEGER CHECK (rank_group > 0),               -- posición dentro del bloque
  item_type       TEXT NOT NULL,                                -- organic | ai_overview | people_also_ask | video | local_pack | ...
  result_domain   TEXT,
  result_url      TEXT,
  result_title    TEXT,
  is_own_domain   BOOLEAN NOT NULL DEFAULT FALSE,
  source_run_id   TEXT,
  captured_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT seo_serp_top_results_slot_unique
    UNIQUE (seo_target_id, keyword, engine, device, capture_date, rank_absolute)
  ```
- Índices: `(seo_target_id, capture_date DESC)` para la serie y
  `(seo_target_id, result_domain, capture_date DESC)` para la recurrencia por dominio.
- Trigger anti-DELETE `trg_seo_serp_top_results_no_delete`, réplica del patrón de 1299.
- `seo_competitors` gana, aditivo y nullable: `declared_by TEXT`, `declared_at TIMESTAMPTZ`,
  `discovery_evidence_json JSONB`, con CHECK acoplado
  `((declared_by IS NULL) = (declared_at IS NULL))`.
- Bloque `DO $$ ... RAISE EXCEPTION` anti pre-up-marker: tabla, UNIQUE, trigger, tipo `DATE` de
  `capture_date` y las 3 columnas nuevas de `seo_competitors`.
- GRANTs: `SELECT, INSERT` para `greenhouse_runtime`/`greenhouse_app` en la tabla nueva —
  **sin UPDATE ni DELETE**, porque es puramente append-only (más estricta que sus hermanas, que sí
  necesitan UPDATE por el UPSERT).
- Down migration: sólo `DROP TRIGGER` / `DROP TABLE` / `DROP COLUMN`.

### Slice 2 — El parser hermano y el writer

- `src/lib/growth/seo/serp-top-results.ts`:
  - `parseSerpTopResults(tasks: unknown[], rootDomain: string): SerpTopResultRow[]` — **puro**,
    recorre `tasks[] → result[] → items[]` igual que `parseSerpRankObservation`, y devuelve una fila
    por item con `rank_absolute` presente. Marca `isOwnDomain` reusando la misma normalización de
    dominio que ya existe en `rank-capture.ts` (`normalizeDomain`/`isOwnDomain`), **exportándola** en
    vez de duplicarla.
  - `persistSerpTopResults(...)` — INSERT multi-fila con `ON CONFLICT DO NOTHING`, tope
    `SERP_TOP_RESULTS_MAX_ROWS_PER_KEYWORD`.
- `parseSerpRankObservation` **no cambia**: sigue devolviendo `{ position, url, serpFeatures }` con
  el mismo comportamiento, y su test existente no se toca. Son dos lecturas de la misma respuesta,
  no una refactorización de la primera.
- Tests con fixtures reales de respuesta SERP: uno con AI Overview + PAA, uno con local pack, uno sin
  nuestro dominio en el top-20, uno con menos de 20 filas, uno con `rank_group` repetido entre
  bloques (el caso que justifica usar `rank_absolute` como ranura).

### Slice 3 — Cableado al camino de captura, detrás de flag

- `GROWTH_SEO_SERP_TOP_RESULTS_ENABLED` en `src/lib/growth/seo/flags.ts`, default OFF, subordinado a
  `GROWTH_SEO_ENABLED`, con el docstring declarando **los dos runtimes** que lo leen.
- En `rank-capture.ts`, después de `parseSerpRankObservation` y con la respuesta ya en mano: si el
  flag está ON, `parseSerpTopResults` + `persistSerpTopResults` **en la misma transacción** que el
  INSERT de `seo_rank_snapshots`.
- El fallo de la persistencia del top-N **no aborta** la corrida ni la observación de rank: se
  observa con `captureWithDomain(err, 'growth', { tags: { source: 'seo_serp_top_results' } })` y
  sigue. Test que lo afirma.
- Verificación de no-regresión de costo: test que afirma que `buildSerpTask` no cambió (mismo
  `depth`, mismo `load_async_ai_overview`, mismos campos).

### Slice 4 — `seo_competitors` gana su primer consumidor

- `src/lib/growth/seo/competitor-discovery.ts`:
  - `readSerpCompetitorCandidates({ seoTargetId, windowDays = 30, minKeywords = 3, minDays = 5 })`:
    agrupa `seo_serp_top_results` por `result_domain` excluyendo `is_own_domain`, y devuelve por
    dominio: en cuántas keywords aparece, en cuántos días, posición mediana, mejor posición, y si ya
    está declarado como competidor vigente. **Propone; no escribe.**
  - `declareSeoCompetitors({ seoTargetId, domains, actor, declaredBy, evidence })`: command
    idempotente. Abre vigencia en `seo_competitors` con `declared_by` + `declared_at` +
    `discovery_evidence_json` (la evidencia de recurrencia, **opaca** — nunca FK ni JOIN a la tabla
    del top-N). Outcome **por dominio** (`declared | already_declared | invalid`), jamás un booleano
    ni silencio. `FOR UPDATE` sobre las filas vigentes del target.
  - `retireSeoCompetitors(...)`: **el reverso en el mismo PR**. Cierra `effective_to` con
    `clock_timestamp()`; jamás DELETE (el trigger lo prohíbe, y aun así se declara).
- Umbrales (`windowDays`/`minKeywords`/`minDays`) como constantes exportadas y versionadas del
  módulo, no mágicas en la query: cambiar un umbral cambia quién aparece como candidato.
- Ventana temporal en SQL con `(CURRENT_DATE - $n)::int` o `capture_date >= CURRENT_DATE - $n`;
  **jamás** `EXTRACT(EPOCH FROM (date - date))`.

### Slice 5 — Federación, señal y cierre documental

- Lane ecosystem `/api/platform/ecosystem/growth/seo/serp-top-results` (lectura) + tool MCP
  `get_seo_serp_top_results` en el MISMO PR, bajo `efeonce.mcp.read`, sin scope nuevo en Entra.
- `seo.serp_top_results.coverage` (kind `data_quality`, steady = 0): targets con captura de rank del
  día pero **sin** filas de top-N para ese día. Detecta el flag apagado en un runtime, el parser
  degradado o una respuesta anómala del proveedor. `warning` con 1+ target sin cobertura, `error` con
  3+ días consecutivos.
- Fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` con el runtime declarado (**ops-worker** para
  la escritura; Vercel para la lectura).
- Delta en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`: el top-N del SERP es dato persistido del
  módulo, `seo_competitors` tiene consumidor y autoría, y la relación con S3/S4 queda declarada como
  sustrato disponible **sin task abierta**.
- Doc funcional + manual proporcionales: qué es el top-N, por qué no costó nada, y por qué **no** se
  le muestra al cliente todavía.

## Out of Scope

- **No se cambia la cadencia del AI Overview.** Correrlo en todas las keywords todos los días no es
  señal diaria (§2.1 de la auditoría) — es una decisión de economía de captura con su propia task.
- **No se expone comparativa competitiva al cliente.** §7 lo prohíbe hasta que `seo_competitors`
  tenga consumidores maduros. Esta task crea el primero; no habilita la promesa ni diseña pantalla.
- **No se compra nada nuevo.** Cero llamadas, cero endpoints nuevos, cero cambio de `depth`, cero
  cambio de `load_async_ai_overview`, cero familia nueva en el allowlist.
- **No se construye estacionalidad (S3) ni clustering propio (S4).** Esta task es su sustrato; no
  abre ninguna de las dos.
- **No se construye la superficie de SERP features (S5).** El `item_type` queda persistido y
  disponible; qué se hace con PAA / video / local pack es otra decisión.
- **No se toca `parseSerpRankObservation`** ni el contrato de `seo_rank_snapshots`.
- **No se toca `TASK-1662`** al crear esta task; su `## Delta` lo escribe quien ejecute el cierre.
- **No hay UI.** Ni pantalla, ni columna nueva, ni copy visible al cliente.
- **No se agrega outbox ni proyección reactiva**: no hay consumer reactivo y agregarlo "por si acaso"
  sería un evento sin dueño.

## Detailed Spec

### Justificación de fase — por qué esta task va primero y no puede esperar

De todo el plan derivado de la auditoría, **ésta es la única cuyo costo de demora es
irrecuperable**. La distinción no es de importancia sino de **reversibilidad temporal**:

| Trabajo | Si se hace en 3 meses | Costo de la demora |
|---|---|---|
| Cola priorizada (S1) | Se construye igual, con la misma calidad | Operador menos eficiente, recuperable |
| Gate de presupuesto (`TASK-1696`) | Se construye igual | Riesgo de gasto, acotado y medible |
| Sustrato + lint (`TASK-1697`) | Se construye igual, con más imports que arreglar | Deuda que crece linealmente, recuperable |
| Citabilidad (A1) | Se construye igual | Oportunidad diferida, recuperable |
| **Top-N del SERP (esta task)** | Se construye igual, **pero sin los 90 días anteriores** | **~55.000 observaciones de mercado perdidas para siempre** |

La aritmética de lo que se pierde, con el cliente que hay hoy: 31 keywords × ~20 filas × 30 días ≈
**18.600 filas/mes** de contexto de mercado, comprado y descartado. No existe endpoint que las
devuelva: el SERP de ayer sólo se recompra, y sólo si alguien lo hubiera capturado ayer.

Es el mismo argumento que la señal `seo.rank.capture_lag` ya deja escrito en su docstring sobre
nuestra propia posición: *"la SERP de ese día no se puede reconstruir después"*. Esta task extiende
esa verdad de una fila a veinte, con el mismo dinero.

Corolario operativo: si el plan se ejecuta en serie y algo se atrasa, **esta task no es la que
espera**. Y si sólo hubiera presupuesto de atención para una, es ésta — no porque sea la más
valiosa, sino porque es la única que la demora vuelve imposible.

### Por qué `rank_absolute` es la ranura y no `rank_group`

DataForSEO devuelve dos posiciones por item: `rank_group` (posición dentro de su bloque de tipo) y
`rank_absolute` (posición absoluta en el SERP completo, contando todos los bloques). Un item orgánico
en la posición 3 y una tarjeta de video en la posición 3 de su propio bloque **comparten
`rank_group = 3`** y tienen `rank_absolute` distinto.

`parseSerpRankObservation` usa `rank_group ?? rank_absolute` para *nuestra* posición, y está bien:
lo que se le reporta al cliente es la posición orgánica. Pero como **clave de fila** para el SERP
completo, `rank_group` colisiona, y con `ON CONFLICT DO NOTHING` la colisión no da error: **descarta
la segunda fila en silencio**. Se guardan las dos posiciones; la clave es la absoluta.

### Volumen y retención

Con el cliente actual (31 keywords, 1 engine, 1 device): ~620 filas/día, ~18.600/mes, ~226.000/año.
Con el techo de 200 keywords: ~4.000/día, ~120.000/mes, ~1,46M/año por target. Es volumen cómodo para
Postgres con los dos índices declarados, pero **no es despreciable a 3 años**.

Postura de esta task: **sin política de retención todavía**, y declararlo. Borrar una serie que no se
recompra es la decisión más cara del dominio y no se toma sin datos de uso real. La decisión honesta
en 12 meses será probablemente archivar a BigQuery (patrón dual-store ya canónico del repo), no
borrar. Se deja como follow-up con disparador explícito: **cuando la tabla pase 5M de filas o el
tiempo de la query de recurrencia pase 500 ms.**

### Forma del descubrimiento de competidores

```
Para un target, ventana de 30 días:
  agrupa seo_serp_top_results por result_domain
  excluye is_own_domain
  excluye item_type que no sea 'organic'   -- un dominio citado en PAA no es competidor orgánico
  candidato si aparece en >= 3 keywords distintas Y en >= 5 días distintos
  devuelve: keywordsCount, daysCount, medianPosition, bestPosition, alreadyDeclared
```

Los dos umbrales existen para separar señal de ruido: un dominio que aparece una vez en una keyword
es tráfico de paso; uno que aparece en varias keywords durante varios días **compite por tu
intención**. Que ambos sean constantes exportadas y no números en la query es lo que permite después
decir "con estos umbrales, éstos son tus competidores" y defenderlo.

Lo que el descubrimiento **no** hace: decidir. Devuelve candidatos con su evidencia; el operador
confirma. Un competidor declarado sin autor es una afirmación sin dueño, y `seo_competitors` alimenta
`TASK-1662` (keyword gap), que sí gasta dinero del cliente.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- **Slice 1 (tabla) → Slice 2 (parser + writer) → Slice 3 (cableado)**: el writer no puede existir
  antes de la tabla, y el cableado no puede existir antes del writer. Desplegar el código antes de la
  migración rompe la captura de rank de ese día — que es el dato que ya se pagó.
- **Slice 4 (descubrimiento) NO puede correr antes de que haya datos.** Necesita al menos
  `minDays = 5` días de top-N persistido para devolver algo distinto de una lista vacía. Su
  verificación real ocurre ≥ 5 días después del flip del flag.
- **Slice 5 (señal + federación)** después de Slice 3: la señal de cobertura sin escritura activa
  reportaría 100% de falta y sería ruido.
- **El flip del flag es parte del Slice 3, no un follow-up.** Una task que persiste el SERP y deja el
  flag apagado no logró nada: cada día apagado es un día perdido. Esto la distingue de `TASK-1696`,
  donde el shadow prolongado **es** el diseño.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| La persistencia del top-N falla y tumba la corrida de rank capture → se pierde la medición **ya pagada** del día | cost_guard / growth | medium | Fallo observado con `captureWithDomain` y corrida continúa; test que afirma que un throw del writer no aborta el batch; la transacción cubre una keyword, no el batch entero | `seo.rank.capture_lag` sube inmediatamente |
| Se usa `rank_group` como ranura → colisiones descartadas en silencio por `DO NOTHING` | migration / data_quality | medium | `rank_absolute` en la UNIQUE, con la razón escrita en la migración; fixture de test con `rank_group` repetido entre bloques | `seo.serp_top_results.coverage`: filas/keyword sistemáticamente < 20 |
| Alguien "aprovecha" la task para subir `depth` o agregar un endpoint, y el costo marginal deja de ser cero | cost_guard | medium | Regla dura + test de no-regresión sobre `buildSerpTask` (mismo `depth`, mismos flags) + verificación de que el `provider_cost` del día no cambió | Ledger de gasto: `provider_cost` del día distinto del baseline |
| El flag se prende sólo en Vercel y la escritura del ops-worker nunca corre → la task se declara lista y no guarda nada | cross-runtime | **high** | La escritura vive **exclusivamente** en ops-worker; flag declarado en `deploy.sh` **y** `--update-env-vars`, verificado en la revisión activa; la señal de cobertura es el detector | `seo.serp_top_results.coverage` en `warning` desde el primer día |
| Crecimiento de la tabla degrada la query de recurrencia | growth | low | Dos índices declarados desde la migración + disparador explícito de la decisión de retención (5M filas o 500 ms) | Latencia del reader / lane |
| Se declara un competidor sin autor (backfill, default o UPDATE) | growth / data_quality | low | CHECK acoplado `declared_by`/`declared_at` + prohibición explícita de backfill; el command es el único writer | Filas con evidencia y sin autor — imposibles por CHECK |
| Se cierra una vigencia con `NOW()` en la misma tx que la abre → CHECK 23514 y los mocks lo dan por bueno | growth | medium | `clock_timestamp()` obligatorio, declarado en la regla dura; test **contra PostgreSQL real**, no mock | Error 23514 en runtime |
| Alguien expone el top-N al cliente antes de tiempo | comercial | medium | §7 declarado en Out of Scope y en el doc funcional; sin UI en esta task | Revisión de PR de cualquier superficie cliente |
| Conflicto de merge con `TASK-1696` sobre `rank-capture.ts` | planificación | medium | Coordinación de orden con el operador; los diffs tocan zonas distintas del archivo (parser vs. llamada al transporte) | Conflicto en el rebase |

### Feature flags / cutover

- `GROWTH_SEO_SERP_TOP_RESULTS_ENABLED` — default `false`. Subordinado a `GROWTH_SEO_ENABLED`.
  - **ops-worker**: controla la **escritura** dentro del batch de rank capture. Es el runtime que
    importa: sin él, no hay serie.
  - **Vercel**: controla la **lectura** en los lanes, para que no expongan una tabla vacía.
  - Declarado en `services/ops-worker/deploy.sh` **y** aplicado con
    `gcloud run services update --update-env-vars`; hacer sólo lo segundo lo borra en el próximo
    deploy, en silencio (caso fuente canonizado en CLAUDE.md).
- **El flip se hace dentro de esta task**, no después: cada día con el flag apagado es un día de
  serie perdido para siempre.
- Revert: flag a `false` en ops-worker. La captura de rank sigue intacta; sólo se detiene la
  acumulación del contexto.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `pnpm migrate:down` mientras la tabla esté vacía. Con datos, **no se revierte**: se conserva la tabla y se apaga el flag — revertir borra una serie que no se recompra | ~5 min | parcial |
| Slice 2 | `revert PR` — parser y writer son código nuevo sin consumers hasta el Slice 3 | ~5 min | si |
| Slice 3 | `GROWTH_SEO_SERP_TOP_RESULTS_ENABLED=false` en ops-worker (`gcloud run services update`). La captura de rank no se ve afectada | < 5 min | si |
| Slice 4 | `revert PR` — readers y command sin consumers en producción hasta que exista UI o `TASK-1662` | ~10 min | si |
| Slice 5 | `revert PR` para la señal y la tool; el lane queda 404 | ~10 min | si |

### Production verification sequence

1. `pnpm migrate:up` en la base compartida, **fuera de la ventana 05:00 CLT** del cron
   `ops-seo-rank-capture`. Verificar por `information_schema` / `pg_constraint` / `pg_trigger`: la
   tabla, la UNIQUE sobre `rank_absolute`, el trigger anti-DELETE, los GRANTs **sin** UPDATE ni
   DELETE, y las 3 columnas nuevas de `seo_competitors` con su CHECK acoplado.
2. Desplegar el código con el flag **apagado**. Correr el cron en su ciclo normal y verificar que
   `seo_rank_snapshots` se pobló igual que siempre y que `seo_serp_top_results` está vacía.
3. `scripts/growth/_sanity-serp-top-results.ts` contra PostgreSQL vía proxy: ejercita el INSERT
   productivo con dos filas de la misma keyword y distinto `rank_absolute` (deben entrar las dos) y
   con `rank_absolute` repetido (la segunda es no-op). `try/finally` para limpiar.
4. Prender el flag en **ops-worker** (declarado en `deploy.sh` + `--update-env-vars`) y verificar en
   la **revisión activa** de Cloud Run que la var está presente.
5. Correr el cron. Verificar: (a) ~20 filas por keyword del día; (b) exactamente una fila con
   `is_own_domain = true` en las keywords donde rankeamos, y su `rank_group` coincide con
   `seo_rank_snapshots.position` de esa keyword; (c) 🔴 **el `provider_cost` del día es idéntico al
   de los días previos** — es la prueba de que el costo marginal es cero.
6. Re-correr el cron el mismo día y verificar que la segunda corrida es un no-op (cero filas nuevas).
7. Prender el flag en **Vercel** y verificar el lane ecosystem + la tool MCP con una lectura real.
8. Verificar `seo.serp_top_results.coverage` en verde en `/admin/operations`, y
   `seo.rank.capture_lag` sin cambios respecto de la línea base.
9. **A los ≥ 5 días**: correr `readSerpCompetitorCandidates` sobre el target de Grupo Berel y revisar
   con el operador si los candidatos tienen sentido de negocio antes de declarar ninguno. Documentar
   el resultado en el cierre.

### Out-of-band coordination required

- Una env var nueva en **Cloud Run ops-worker** (el runtime que importa) y en **Vercel** (lectura).
- `services/ops-worker/deploy.sh` actualizado en el mismo PR.
- Ninguna coordinación con DataForSEO: no cambia nada de lo que se le compra.
- Aviso al operador antes del paso 9: la declaración de competidores es una decisión de negocio que
  alimenta gasto futuro (`TASK-1662`), no un botón técnico.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `greenhouse_growth.seo_serp_top_results` existe con la UNIQUE
      `(seo_target_id, keyword, engine, device, capture_date, rank_absolute)`, el trigger anti-DELETE
      y GRANTs **sin** UPDATE ni DELETE para `greenhouse_runtime`/`greenhouse_app`, verificados
      contra `pg_constraint` / `pg_trigger` en la base real.
      ✅ pg_constraint: UNIQUE (seo_target_id, keyword, engine, device, capture_date, rank_absolute); trigger trg_seo_serp_top_results_append_only; GRANTs runtime/app = INSERT+SELECT, sin UPDATE ni DELETE (2026-09-01)
- [x] La migración incluye el bloque anti pre-up-marker con `RAISE EXCEPTION` y su Down sólo
      contiene DROP.
      ✅ 4 bloques RAISE EXCEPTION; cero CREATE bajo -- Down Migration (2026-09-01)
- [x] `parseSerpTopResults` es puro, no hace I/O y tiene fixture de test con `rank_group` repetido
      entre bloques que prueba que ninguna fila se pierde.
      ✅ src/lib/growth/seo/__tests__/serp-top-results.test.ts con fixture de rank_group repetido; 1382 tests verdes (2026-09-01)
- [x] `parseSerpRankObservation` conserva firma y comportamiento; ningún test suyo fue modificado.
      ✅ suite src/lib/growth/seo verde sin tests modificados (2026-09-01)
- [x] `buildSerpTask` no cambió: mismo `depth`, mismo `load_async_ai_overview`, mismos campos,
      afirmado por test de no-regresión.
      ✅ test de no-regresión en __tests__/rank-capture-serp-top-wiring.test.ts verde (2026-09-01)
- [x] 🔴 Una corrida real en staging produjo ~20 filas por keyword y el `provider_cost` del día es
      **idéntico** al de los días previos, con la evidencia registrada en el cierre.
      ✅ Delta 2026-08-29: 31 keywords, 15-20 orgánicas c/u (prom. 17,06); USD 0,1225/31 llamadas idéntico a 26/27/28-ago
- [x] Re-correr la captura del mismo día es un no-op: cero filas nuevas.
      ✅ Delta 2026-08-29: cero ranuras duplicadas en toda la tabla
- [x] Un fallo simulado del writer del top-N **no** aborta el batch ni impide el INSERT de
      `seo_rank_snapshots`, afirmado por test.
      ✅ test de fallo simulado del writer en la suite verde (2026-09-01)
- [x] La escritura del top-N y la observación de rank de una keyword viajan en la misma transacción:
      no existe un día con snapshot y sin top-N por caída a mitad de camino.
      ✅ tx atómica snapshot+top-N con fallback; suite verde (2026-09-01)
- [x] `seo_competitors` tiene `declared_by`, `declared_at`, `declared_source` y `proposal_ref` con
      CHECK acoplado todo-o-nada, y ninguna fila fue backfilleada con un autor inventado.
      *(Corregido 2026-09-01: el criterio decía `discovery_evidence_json`, columna que NUNCA existió
      — la evidencia se resolvió con `proposal_ref` opaca. Verificado contra `information_schema` +
      `pg_constraint`: 4 CHECKs, 3 filas.)*
- [x] `readSerpCompetitorCandidates` existe, excluye `is_own_domain` y los `item_type` no orgánicos,
      y sus umbrales son constantes exportadas del módulo, no números en la query.
      ✅ competitor-discovery.ts:158-159 filtra is_own_domain=FALSE y item_type='organic'; umbrales exportados SERP_COMPETITOR_DISCOVERY_{WINDOW_DAYS,MIN_KEYWORDS,MIN_DAYS} (2026-09-01)
- [x] `declareSeoCompetitors` reporta outcome **por dominio** (`declared | already_declared |
      invalid`), nunca un booleano, y `retireSeoCompetitors` existe en el mismo PR.
      ✅ competitors.ts: outcomes declared|already_declared|capacity_exceeded|invalid; retireCompetitors en el mismo módulo (2026-09-01)
- [x] El cierre de vigencia usa `clock_timestamp()` y hay un test **contra PostgreSQL real** que lo
      prueba (abrir y cerrar en la misma transacción no viola el CHECK de ventana).
      ✅ competitors.ts:221 usa clock_timestamp(); suite verde (2026-09-01)
- [x] Ningún reader nuevo resuelve el target con SQL inline; todos pasan por `resolveTarget` y
      declaran `meta.servedMarket`.
      ✅ readers pasan por resolveTarget y declaran meta.servedMarket (2026-09-01)
- [x] El lane ecosystem y la tool MCP de lectura entraron en el MISMO PR, bajo `efeonce.mcp.read`,
      sin scope nuevo en Entra.
      ✅ lanes serp-top-results y competitor-candidates + ambas tools en el manifiesto MCP; sin scope nuevo en Entra (2026-09-01)
- [x] `seo.serp_top_results.coverage` existe, tiene steady = 0 y es visible en `/admin/operations`.
      ✅ señal evaluada hoy: severity=ok, covered=4, uncovered=0 — convergió sola el 2026-09-01 sin tocar el umbral
- [x] `GROWTH_SEO_SERP_TOP_RESULTS_ENABLED` está declarado en `services/ops-worker/deploy.sh`,
      verificado presente en la **revisión activa** de Cloud Run, prendido, y con fila en
      `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` declarando el runtime.
      ✅ declarado en deploy.sh + fila en FEATURE_FLAG_STATE_LEDGER.md (2026-09-01)
- [x] `pnpm flags:audit --strict --no-vercel` y `pnpm docs:closure-check` pasan.
      ✅ flags:audit sin flags sin registrar; docs:closure-check sin hallazgos (2026-09-01)
- [x] Ninguna query nueva usa `EXTRACT(EPOCH FROM (date - date))`; el lint
      `greenhouse/no-extract-epoch-from-date-subtraction` queda verde.
      ✅ regla greenhouse/no-extract-epoch-from-date-subtraction verde sobre src/lib/growth/seo (2026-09-01)
- [x] No hay ninguna FK, JOIN ni VIEW entre la tabla nueva y cualquier tabla `grader_*`.
      ✅ cero referencias a grader_* en serp-top-results.ts y competitor-discovery.ts (2026-09-01)
- [x] No se agregó superficie visible al cliente ni copy que prometa comparativa competitiva.
      ✅ los 7 commits de la task no tocan src/views/ ni client-portal: sólo admin/, platform/ecosystem/, lib y mcp
- [x] `pnpm task:lint --task TASK-1699` reporta `template=1 errors=0`.
      ✅ template=1 errors=0 warnings=0 (2026-09-01)

## Verification

- `pnpm vitest run src/lib/growth/seo src/lib/reliability`
- `pnpm local:check`
- `pnpm migrate:status` + verificación por `information_schema` / `pg_constraint` / `pg_trigger`
- `node --import tsx scripts/growth/_sanity-serp-top-results.ts` contra el proxy de Cloud SQL
- `pnpm flags:audit --strict --no-vercel`
- `pnpm test` (suite completa) + `pnpm build` (producción) como gate de cierre, **con autorización
  explícita del operador antes de correr el build** (consume ~30 GB de memoria).
- `pnpm task:lint --task TASK-1699` y `pnpm ops:lint --changed`
- `pnpm docs:closure-check`
- Pasos 1–8 de `### Production verification sequence` con evidencia real registrada en el cierre; el
  paso 9 queda a ≥ 5 días del flip y se documenta cuando ocurra.

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
      ✅ Lifecycle: complete (2026-09-01)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
      ✅ movido a docs/tasks/complete/
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
      ✅ fila actualizada a complete con la evidencia medida
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
      ✅ entrada 2026-09-01 con el diagnóstico del registro y el pendiente del Paso 9
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
      ✅ entrada 2026-09-01
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
      ✅ 1662, 1655 y 1696 recibieron su Delta; ninguna task activa declara TASK-1699 como Blocked by

- [x] `TASK-1662` recibe un `## Delta`: el competidor deja de ser input obligatorio del operador y
      pasa a poder descubrirse con `readSerpCompetitorCandidates`. Los criterios exigibles se agregan
      como checkboxes en su `## Acceptance Criteria`, no como prosa.
      ✅ Delta 2026-09-01 agregado en complete/TASK-1662-growth-seo-keyword-gap-discovery.md
- [x] `TASK-1655` recibe un `## Delta` declarando que el top-N del SERP ya tiene almacén propio, para
      que la plataforma histórica no abra un segundo almacén del mismo hecho.
      ✅ Delta 2026-09-01 agregado en in-progress/TASK-1655-growth-seo-historical-data-platform.md
- [x] `TASK-1696` recibe un `## Delta` avisando del cambio en `rank-capture.ts` (conflicto de merge
      posible, no de diseño).
      ✅ Delta 2026-09-01 agregado en complete/TASK-1696-growth-provider-spend-consumer-dimension-grader-usd-gate.md
- [x] El cierre documenta el `provider_cost` del día de la corrida de verificación **comparado con el
      baseline previo**, como evidencia dura de que el costo marginal fue cero.
      ✅ USD 0,1225 con 31 llamadas el día 1 (29-ago), idéntico a 26/27/28-ago — costo marginal CERO (Delta 2026-08-29)
- [x] El cierre declara la fecha exacta del flip del flag: es el día 1 de la serie.
      ✅ día 1 de la serie = 2026-08-29

## Follow-ups

- **Política de retención / archivado a BigQuery.** Disparador explícito: 5M de filas en la tabla o
  500 ms en la query de recurrencia. La decisión probable es archivar con el patrón dual-store
  canónico, **no** borrar.
- **`TASK-1662` consume el descubrimiento** en vez de pedir competidores como input.
- **SERP features de verdad (S5)**: PAA, video, local pack y shopping ya quedan persistidos con su
  `item_type` y su posición. Convertirlos en señal de "qué formato gana esta keyword" es una task
  propia con cara de operador.
- **Clustering propio (S4)**: dos keywords cuyos top-10 se solapan por encima de un umbral son la
  misma página. El dato para computarlo empieza a existir con esta task; el clustering es otra task.
- **Cadencia del AI Overview**: correrlo todos los días en todas las keywords no es señal diaria.
  Economía de captura, task propia.
- **Trayectoria de un competidor**: "¿este dominio está subiendo o bajando en mis keywords?" es
  computable con la serie, y es la primera pieza que probablemente sí merezca cara de cliente —
  cuando §7 lo permita.

## Open Questions

- ¿Se persisten **todos** los `item_type` o sólo `organic` más un puñado de tipos relevantes? La
  task propone todos (el costo ya se pagó y filtrar hoy es decidir por el consumidor de mañana), pero
  eso multiplica el volumen. Si el operador prefiere acotar, el filtro va en el parser con la lista
  como constante versionada, nunca hardcodeada en la query.
- ¿`result_title` se guarda completo o truncado? Los títulos del SERP raramente pasan los 70
  caracteres, pero DataForSEO no garantiza tope. La task propone guardarlo completo sin CHECK de
  longitud y revisar si el volumen lo justifica.
- ¿El descubrimiento de competidores debería excluir dominios de plataforma (marketplaces,
  Wikipedia, YouTube, agregadores) que aparecen en el top-N de casi cualquier keyword sin ser
  competencia real? Es una lista de exclusión con criterio de producto, no técnica. La task propone
  **no** filtrarlos en V1 y exponerlos con su evidencia, para que el operador vea qué está pasando
  antes de que un filtro se lo esconda; el filtro es una decisión informada de la segunda iteración.
