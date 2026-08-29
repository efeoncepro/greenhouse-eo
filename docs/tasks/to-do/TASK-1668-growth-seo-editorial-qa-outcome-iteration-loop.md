# TASK-1668 — Growth SEO: QA editorial, publicación verificada, outcome e iteración

## Delta 2026-08-28 — el loop de QA/outcome cuelga de un ítem de la cola, y cerrar el trabajo ahora tiene que ESCRIBIRSE

`TASK-1700` está en `develop` (siete slices, `962d22118` … `9020d6421`). Esta task hereda la cola por vía
de `TASK-1667` —no hace falta agregarla como dependencia directa— pero el loop cambia de forma en tres
puntos concretos.

**1. La lista propia desaparece: el sujeto vuelve a la cola solo, y el `done` hay que escribirlo.** La
cola se recompone entera en cada snapshot desde sus seis colectores, así que un trabajo terminado
**vuelve a proponerse mañana** salvo que alguien registre la decisión. `recordSeoWorkQueueDecision`
(`src/lib/growth/seo/work-queue/record-decision.ts`) trata `dismissed` y `done` como **terminales**
—retiran el sujeto de los snapshots siguientes (`isRetiredSubject`)— y deja `deferred`/`accepted`
apareciendo a propósito ("después sin fecha no es nunca"). 🔴 Consecuencia dura: cuando esta task cierra
un outcome, **el hecho debe llegar a la cola como `done`**; si no, el operador ve mañana, en la cabeza de
su plan del día, el trabajo que acaba de terminar. El retiro se ancla a
`(seo_target_id, origin, normalized_keyword)`, no al `item_id` —los items se regeneran en cada snapshot—
y el `item_id`/`snapshot_id` viajan como evidencia de qué se estaba mirando.

**2. `consolidate_requires_separate_task` deja de ser un callejón.** La consolidación ya tiene verbo
propio (`consolidate` en el CHECK de `recommended_verb`) y origen propio (`consolidation`), que además
encabeza `ORIGIN_ACTION_PRECEDENCE` como bloqueante. Un `next_action` de consolidación puede volver a la
cola como sujeto con su acción correcta en vez de quedar esperando una task que nadie abre.

**3. `insufficient_data` tiene hermano en la cola, y comparten el invariante.** Las bandas 2
(`measured_without_curve`: hay demanda medida pero la curva propia no alcanza para afirmar un CTR
esperado) y 3 (`no_measured_demand`) llegan con `priority_score = NULL` **a propósito** — decir "0 clics
de ganancia" ahí sería fabricar una medición. Es el mismo invariante que esta task ya aplica al prohibir
`AVG(position)` y al exigir `baseline_missing`. **Ningún `NULL` de la cola se rinde como `0`** al componer
un outcome ni al comparar contra baseline.

**Lo que NO se reconcilia.** La ventana de outcome cerrada en D-3 (Delta 2026-08-15) y el
`expires_at`/`staleness` (`fresh` | `stale` | `absent`) del snapshot son ejes distintos: uno mide el borde
móvil de Search Console, el otro la vejez del plan. Se declaran los dos, no se promedian ni se sustituyen.

**Realidad de rollout:** `GROWTH_SEO_WORK_QUEUE_ENABLED` OFF en Vercel y en el ops-worker, scheduler
`ops-seo-work-queue-materialize` pausado (`docs/operations/FEATURE_FLAG_STATE_LEDGER.md`). Hay contrato y
todavía no hay snapshots.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-08-15 — tres invariantes de medición (sin cambio de alcance)

Fuente: `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md` (§3.2 brecha A5;
§3.4 brecha C6).

**No hay cambio de alcance.** La task sigue siendo el control plane de QA → publicación → outcome →
iteración. Lo que se agrega son tres reglas de medición que, si no están escritas, se rompen en
silencio: ninguna de las tres falla un test, todas producen un número creíble y equivocado.

### (a) La ventana de outcome respeta el borde móvil de Search Console

Search Console **no falla** cuando le pides el día anterior: responde `ok` y **devuelve CERO filas**.
Ese es el modo de falla peligroso — un reader que confunde "cero filas" con "cero clics" registra un
outcome de fracaso para una pieza que Google todavía no terminó de contar. Google consolida con **~48h
de retraso**, y el dato de los últimos días sigue subiendo después de leído.

Reglas duras:

- La ventana de outcome **cierra en D-3**, no en D-1. Una ventana que toca D-1 o D-2 no se evalúa: se
  declara `pending_data_consolidation`, que **no** es lo mismo que `insufficient_data` (una es "todavía
  no", la otra es "no hay base").
- La recaptura es **idempotente y convergente**: recapturar la misma ventana con datos ya consolidados
  produce el mismo resultado; recapturarla mientras aún se consolida **puede** producir un valor mayor,
  y eso es correcto, no un bug de idempotencia. El `inputHash` debe incluir el as-of de la fuente para
  que las dos lecturas sean dos hechos, no una sobrescritura.
- Cero filas con `ok: true` **NUNCA** se materializa como `0`. Es ausencia de dato consolidado.

### (b) La posición se agrega PONDERADA POR IMPRESIONES, nunca `AVG(position)`

`AVG(position)` sobre filas diarias es un **error silencioso**: cada día pesa igual sin importar cuánta
demanda tuvo, así que los días de cola larga —pocas impresiones, posiciones malas— arrastran el
promedio hacia abajo. **El resultado muestra peor de lo que estás**, y lo muestra de forma consistente,
que es lo que impide detectarlo: nadie sospecha de un número que siempre va en la dirección pesimista.

Regla dura: la posición agregada de una ventana es `SUM(position × impressions) / SUM(impressions)`.
Cualquier `AVG(position)` en un reader/evaluator de outcome es un defecto, no una aproximación
aceptable. Si no hay impresiones en la ventana, **no hay posición agregada** — no se cae de vuelta al
promedio simple.

### (c) El lado AEO del outcome se ancla a la trayectoria por `(prompt, motor)`, no al score

Es la brecha **A5**: *"el loop no cierra porque la verificación se ancla al score"*. El score agregado
del grader **se mueve por varianza de muestreo** — la propia calibración midió señales intermitentes
que aparecen 1/3 y 2/3 de las veces y recomienda N≥3 para esas dimensiones. Atribuirle a una pieza
publicada un movimiento de score es atribuirle ruido.

Regla dura: el eje AEO del outcome se lee como **trayectoria por `(prompt, motor)`** —¿esta pregunta
concreta, en este motor concreto, empezó a citarnos?— consumida vía `TASK-1311`. El score agregado
puede **acompañar** como contexto, pero **NUNCA** es la señal que sostiene un `observed`.

### Nota de dependencia: la tercera parte de esta task depende de `TASK-1284`

El outcome declara GA4 y HubSpot como fuentes de su eje de conversión. `TASK-1284` (conexión GA4
multi-tenant) es la única vía a ese dato y hasta hoy estaba huérfana (`Epic: none`, adoptada a
`EPIC-022` el 2026-08-15). Sin ella, **ese eje mide `insufficient_data` de forma permanente**. Las dos
salidas honestas: secuenciar `TASK-1284` antes de la medición de outcome, o **declarar explícitamente
que el loop de negocio es parcial** y que este outcome llega hasta GSC/rank/AEO. Lo inaceptable es
dejarlo implícito.

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
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
- Domain: `growth|seo|content|data|measurement`
- Blocked by: `TASK-1667`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Completa el tramo que hoy se pierde después del draft: QA editorial, revisión/publicación humana,
verificación live, lectura de resultados y apertura de la siguiente iteración. El sistema registra
evidencia por work item y mantiene separados los hechos de Content Factory, WordPress, GSC, rank,
AEO, GA4 y HubSpot. Nunca publica automáticamente, nunca atribuye causalidad sin evidencia y nunca
declara éxito porque una métrica aislada cambió.

## Why This Task Exists

Un flujo que termina en `draft_private` sólo produce una posibilidad de contenido. Para el trabajo SEO
diario se necesita poder contestar, de forma reproducible:

1. ¿El brief y el draft cumplieron los guards editoriales y técnicos?
2. ¿Qué persona aprobó qué objeto exacto y qué ocurrió al publicar?
3. ¿Cuál es la URL canónica final y qué evidencia live demuestra que quedó bien?
4. ¿Qué cambió después en rank, GSC, citabilidad y conversiones?
5. ¿La siguiente acción es refrescar, reforzar, corregir, consolidar, esperar más datos o cerrar?

Hoy esas señales existen en sistemas y runbooks separados. Content Factory tiene validadores y
readback; WordPress tiene el bridge y operaciones; EPIC-022 tiene readers de GSC/rank/AEO; GA4/GTM y
HubSpot tienen sus propios contratos. Falta una entidad que los relacione sin fusionar sus fuentes de
verdad. Sin ella, Greenhouse puede descubrir y producir, pero no aprende del trabajo ni puede
demostrar impacto a un operador o cliente.

Esta task crea el control plane de evidencia y outcome. El sistema debe distinguir **QA técnico**,
**aprobación humana**, **publicación observada**, **resultado medido** y **recomendación de iteración**;
son estados diferentes y no se pueden saltar por una respuesta optimista de un agente.

## Goal

- Un `SEO Editorial Work Item` de `TASK-1667` puede avanzar por estados de QA, aprobación, publicación
  observada y medición con una máquina de estados explícita.
- Cada transición exige el tipo de evidencia correspondiente y conserva refs/hash/as-of, sin copiar
  payloads crudos ni convertir un reader fallido en éxito.
- Un publish humano queda inicialmente como `published_unverified`; sólo después de un readback y QA
  live válidos puede ser `published_verified`.
- Un worker/reader puede construir outcomes por ventana temporal usando GSC, rank, AEO, GA4 y HubSpot
  cuando estén disponibles, pero declara `insufficient_data` cuando no hay base suficiente.
- La siguiente acción se registra como recomendación o nueva iteración gobernada; no se parchea
  contenido, no se cambia tracking y no se publica automáticamente.
- `TASK-1669` puede leer el lifecycle y outcome para recomendar, sin poder marcar QA, aprobar ni
  declarar causalidad.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (§1.1, §4, §7, §8, §9, §10, §13, §17)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md`

Reglas obligatorias:

- **El work item es la relación; cada sistema conserva su SoT.** Content Factory gobierna brief/draft
  y validaciones; WordPress gobierna post/status/readback; GSC gobierna Search Analytics; rank capture
  gobierna snapshots SERP; AEO gobierna prompts/runs/citations; GA4/HubSpot gobiernan eventos y leads.
- **No hay JOIN SQL SEO↔AEO.** El outcome usa refs opacas y readers autorizados por org. Una cita AEO
  no se convierte en ranking ni una impresión GSC en conversión.
- **No inferir éxito.** Un aumento de posición, clicks, citation share o leads es una observación; la
  relación causal requiere un criterio explícito, ventana, baseline, as-of y confianza.
- **No esperar indexación fantasma.** Si URL Inspection/post-publish discovery de `TASK-1426` no está
  disponible, se registra `indexation_evidence_unavailable`, no `indexed=true`.
- **Publicación siempre humana en V1.** Esta task puede registrar una publicación ocurrida y preparar
  un approval packet, pero no ejecuta el write publish ni habilita auto-publish.
- **QA bloqueante separado de recomendación.** Un validator puede emitir `block`; un agente puede
  resumirlo o recomendar una corrección, pero no sustituye al validator ni al reviewer.
- **Append-only para hechos y outcomes.** Un dato nuevo agrega una captura/observación; no reescribe la
  evidencia anterior. Las conclusiones pueden versionarse, nunca borrar la base.
- **Medido vs estimado siempre visible.** GSC/rank/AEO/GA4/HubSpot se etiquetan por fuente y as-of;
  Labs queda como `estimated`. No se construye un KPI único mezclando escalas incompatibles.
- **La ventana cierra en D-3 (Delta 2026-08-15).** Search Console responde `ok` con CERO filas para
  D-1 y consolida con ~48h de retraso. Una ventana que toca D-1/D-2 se declara
  `pending_data_consolidation`, jamás se evalúa; cero filas NUNCA se materializa como `0`. La
  recaptura es idempotente y convergente, con el as-of de la fuente dentro del `inputHash`.
- **Posición agregada = ponderada por impresiones (Delta 2026-08-15).** `SUM(position × impressions) /
  SUM(impressions)`. **NUNCA `AVG(position)`**: sesga hacia los días de cola larga y muestra peor de lo
  real, de forma consistente y por eso indetectable. Sin impresiones en la ventana no hay posición
  agregada — no se cae de vuelta al promedio simple.
- **El eje AEO del outcome se ancla a la trayectoria por `(prompt, motor)` (Delta 2026-08-15)**, vía
  `TASK-1311`. **NUNCA** al score agregado del grader, que se mueve por varianza de muestreo (la
  calibración recomienda N≥3 para las dimensiones intermitentes). El score puede acompañar como
  contexto; nunca sostiene un `observed`.

## Normative Docs

- `docs/tasks/to-do/TASK-1667-growth-seo-editorial-work-item-content-factory-handoff.md`
- `docs/tasks/to-do/TASK-1664-growth-seo-keyword-discovery-seed-expansion.md`
- `docs/tasks/to-do/TASK-1666-growth-seo-grounded-query-bridge.md`
- `docs/tasks/to-do/TASK-1311-growth-seo-aeo-citation-attribution-url-grounded-queries.md`
- `docs/tasks/to-do/TASK-1426-search-console-multi-property-discovery.md`
- `docs/tasks/to-do/TASK-1323-content-factory-auto-publish-guardrails.md`
- `src/lib/public-site/content-factory/contracts.ts`
- `src/lib/public-site/content-factory/gutenberg-validator.ts`
- `src/lib/public-site/content-factory/post-deep-inspection.ts`
- `src/lib/public-site/content-factory/draft-write-eval.ts`
- `src/lib/growth/seo/keyword-opportunities-reader.ts`
- `src/lib/growth/seo/rank-evolution-reader.ts`
- `src/lib/growth/seo/gap/read-seo-aeo-gap.ts`
- `docs/operations/public-site-content-factory/AGENTIC_BLOGPOST_END_TO_END_RUNBOOK_V1.md`
- `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- `TASK-1667` — work item, draft/private handoff, source refs y lifecycle base.
- `TASK-1303` — snapshots y reader de evolución rank; si no hay cobertura suficiente, el outcome debe
  quedar en `insufficient_data`.
- `TASK-1302`/GSC materialization — datos medidos de Search Console y freshness.
- `TASK-1311` — attribution/citation reader AEO cuando la rama de citabilidad esté disponible; no se
  bloquea el QA SEO por ausencia de AEO, sólo se marca la señal como no disponible.
- `TASK-1426` — post-publish URL inspection cuando esté disponible; no se inventa indexación.
- `src/lib/public-site/content-factory/` y el runbook vigente — validators, readback, approval packet,
  rollback y QA live.
- Contratos de GA4/GTM/HubSpot — sólo como readers/evidence refs; no se crea un ledger paralelo de
  conversiones.
- **`TASK-1284`** (conexión GA4 multi-tenant, adoptada a `EPIC-022` el 2026-08-15) — **dependencia de
  hecho del eje de conversión**. Sin ella ese eje reporta `insufficient_data` de forma permanente. O se
  secuencia antes de la medición de outcome, o esta task declara explícitamente que su loop de negocio
  es parcial (llega hasta GSC/rank/AEO). Ver Delta 2026-08-15.

### Blocks / Impacts

- `TASK-1669` — QA/measurement agent y plan diario.
- `TASK-1665` — estados de work item, panel de evidencia y siguiente acción.
- `TASK-1310` — report cliente puede consumir un outcome curado, con disclosure de cobertura.
- Manual operativo SEO/editorial — define la rutina de revisión y la ventana de medición.
- Content Factory/WordPress operators — reciben una lista de checks y un approval/readback packet,
  pero conservan el write y el rollback.

### Files owned

- `migrations/[timestamp]_task-1668-seo-editorial-outcomes.sql`
- `src/lib/growth/seo/editorial-qa/contracts.ts`
- `src/lib/growth/seo/editorial-qa/state-machine.ts`
- `src/lib/growth/seo/editorial-qa/commands.ts`
- `src/lib/growth/seo/editorial-qa/evidence-reader.ts`
- `src/lib/growth/seo/editorial-qa/outcome-reader.ts`
- `src/lib/growth/seo/editorial-qa/iteration.ts`
- `src/lib/growth/seo/editorial-qa/__tests__/state-machine.test.ts`
- `src/lib/growth/seo/editorial-qa/__tests__/evidence-reader.test.ts`
- `src/lib/growth/seo/editorial-qa/__tests__/outcome-reader.test.ts`
- `src/lib/growth/seo/editorial-qa/__tests__/iteration.test.ts`
- `src/app/api/admin/growth/seo/editorial/[workItemId]/qa/route.ts`
- `src/app/api/admin/growth/seo/editorial/[workItemId]/outcome/route.ts`
- `src/app/api/platform/ecosystem/growth/seo/editorial-outcomes/route.ts`
- `src/mcp/greenhouse/seo/editorial-outcomes.ts`
- `services/ops-worker/server.ts` y handler/scheduler bounded de outcomes si se justifica
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/manual-de-uso/growth/seo-editorial-qa-outcomes.md`

## Current Repo State

### Already exists

- `TASK-1667` definirá el work item y el handoff hasta `draft_private`.
- Content Factory tiene `ContentFactoryValidation`, validadores Gutenberg, deep inspection,
  `draft-write-eval`, refresh/patch plans y reglas de draft clone/private.
- El runbook de Content Factory define checks de HTTP, canonical, robots, OG, schema, autor,
  duplicados, links, mobile/desktop, readback y rollback/containment.
- Greenhouse ya materializa GSC diario, snapshots de rank y readers de evolución; el AEO grader ya
  captura observaciones/citations aunque la atribución URL-level sea otra task.
- GA4/GTM/Forms/HubSpot ya tienen eventos y contratos de tracking; no existe un join editorial que los
  relacione con una intervención SEO.
- `propose → confirm → execute` y los eventos gobernados de Nexa existen como patrón transversal.

### Gap

- No existe una state machine que conecte draft privado, QA, aprobación, publicación observada,
  verificación live, ventana de medición y siguiente iteración.
- Los checks de Content Factory y los resultados SEO quedan en artefactos separados sin un `workItemId`
  y evidence ledger común.
- No existe una forma de distinguir `published_unverified` de `published_verified` ni de registrar
  una contención `private + noindex` como rollback.
- No existe un outcome reader que reporte cobertura, baseline, ventana, fuente, as-of, confianza y
  datos faltantes sin crear un score causal ficticio.
- No existe un comando para abrir una iteración con motivo y evidencia; el operador debe recordar qué
  hizo y volver a otra herramienta.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/growth/seo/editorial-qa/` para state machine/readers/commands; readers de
  Content Factory, SEO, AEO y measurement se consumen mediante adapters existentes; el materializador
  bounded puede vivir en `services/ops-worker/`.
- Future candidate home: `domain-package`
- Boundary: `readSeoEditorialLifecycle`, `recordSeoEditorialEvidence`, `recordSeoEditorialPublication`,
  `readSeoEditorialOutcome` y `openSeoEditorialIteration` son la API canónica. Ningún consumer lee
  `seo_editorial_*`, WordPress, GSC o GA4 directamente.
- Server/browser split: refs, hashes, outcome calculation, org binding y raw provider data son
  server-only. El browser recibe findings/evidence DTOs saneados y disclosures.
- Build impact: `none`; se reutilizan readers/materializers y validadores existentes; no se agrega un
  SDK de analítica, WordPress ni AEO.
- Extraction blocker: cross-runtime transactions/outbox, canonical evidence adapters y tenant-boundary;
  cualquier worker debe ser idempotente y no convertirse en una segunda fuente de verdad.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `greenhouse_growth.seo_editorial_evidence` y
  `seo_editorial_outcomes` como ledger/proyección del work item; las fuentes externas conservan su SoT.
- Consumidores afectados: `UI`, `Nexa`, `MCP`, `ecosystem`, `ops-worker`, `Content Factory`, reportes.
- Runtime target: `Vercel` para commands/readers, `ops-worker` sólo para evaluación bounded de ventanas,
  `staging` y luego `production` con flag OFF.

## ADR Gate

Antes de implementar persistencia o workers, registrar o vincular en
`docs/architecture/DECISIONS_INDEX.md` una decisión que resuelva:

- SoT y ownership del evidence ledger/outcome frente a Content Factory, WordPress, SEO, AEO y
  measurement;
- semántica de `published_unverified`, `publish_unknown`, rollback y prueba de indexación;
- mutabilidad y corrección tardía por fuente (`GSC` frente a snapshots Labs/rank y readback externo);
- ventanas mínimas, coverage y reglas para `insufficient_data` sin causalidad inventada;
- capabilities, actor humano, worker claim/idempotency y señales de reliability;
- qué parte de `TASK-1426` es requisito antes de afirmar indexación.

La task no inventa un número ADR. Si no existe una decisión vigente, el implementador debe detener el
slice de schema/worker y proponerla antes de cambiar el runtime.

### Contract surface

- Contrato existente a respetar:
  - work item/lifecycle de `TASK-1667`;
  - `ContentFactoryValidation`, deep inspection y readback;
  - `readKeywordOpportunities`, `readRankEvolution`, `readSeoAeoGap` y los readers de measurement;
  - `propose_action`/confirmation de Nexa.
- Contrato nuevo:
  - `recordSeoEditorialEvidence(input)` → evento/receipt append-only con tipo, ref, hash, as-of y
    outcome del validator.
  - `recordSeoEditorialPublication(input)` → registra un publish humano y emite
    `published_unverified`; no llama el write de WordPress.
  - `readSeoEditorialLifecycle(workItemId)` → timeline, gates, blockers y siguiente owner.
  - `readSeoEditorialOutcome(input)` → baseline, ventana, señales por fuente, cobertura, cambios,
    confianza y `outcomeStatus`.
  - `openSeoEditorialIteration(input)` → nueva acción/brief propuesta con parent work item y razón;
    no muta contenido ni crea draft por sí sola.
  - `evaluateSeoEditorialOutcome(workItemId, asOf)` → worker/internal command idempotente que sólo
    lee snapshots y escribe una evaluación append-only.
- Backward compatibility: `gated`; los work items anteriores pueden leerse aunque no tengan outcome.
- Full API parity: el mismo lifecycle/outcome reader sirve app, Nexa, ecosystem y MCP. Los writes
  requieren actor/capability y confirmation; un agente sólo puede sugerir `openSeoEditorialIteration`.

### Data model and invariants

#### `greenhouse_growth.seo_editorial_evidence`

Una fila es una observación verificable asociada a un work item:

| Campo | Tipo | Regla |
|---|---|---|
| `evidence_id` | `uuid` | PK append-only |
| `work_item_id` | `uuid` | pertenece a la org; referencia al aggregate de 1667 |
| `organization_id` | `uuid` | se valida contra work item y session |
| `kind` | `text` | enum cerrado: `brief_validation`, `private_readback`, `human_approval`, `publish_readback`, `live_http`, `live_canonical`, `live_robots`, `live_schema`, `live_mobile`, `gsc`, `rank`, `aeo_citation`, `ga4`, `hubspot`, `url_inspection`, `rollback` |
| `status` | `text` | `pass|warning|block|observed|unavailable|not_applicable` |
| `source_ref` | `text` | referencia opaca a artefacto/reader; nunca raw URL firmada |
| `source_snapshot_hash` | `text` | hash/fingerprint que permite verificar estabilidad |
| `as_of` | `timestamptz` | fecha de la fuente, no fecha inventada por el actor |
| `captured_at` | `timestamptz` | fecha en que Greenhouse registró la evidencia |
| `payload_json` | `jsonb` | campos estructurados y redactados; no HTML/prompt/raw provider |
| `recorded_by` | `text` | actor/worker/validator, con human approver cuando aplique |
| `idempotency_key` | `text` | evita duplicar el mismo receipt |

La evidencia nunca cambia de `pass` a `block` por UPDATE: se agrega una nueva observación con nuevo
as-of y relación `supersedesEvidenceId` opcional.

#### `greenhouse_growth.seo_editorial_outcomes`

Una evaluación append-only por work item y ventana:

| Campo | Tipo | Regla |
|---|---|---|
| `outcome_id` | `uuid` | PK estable de evaluación |
| `work_item_id` | `uuid` | no se reasigna |
| `organization_id`/`seo_target_id` | `uuid` | boundary validado |
| `canonical_url_ref` | `text` | ref/hash; la URL live se obtiene por reader autorizado |
| `window_kind` | `text` | `pre_publish_baseline|day_7|day_14|day_28|custom` |
| `baseline_as_of`/`window_end` | `timestamptz` | no se permite una ventana sin baseline o as-of |
| `status` | `text` | `pending|insufficient_data|observed|mixed|blocked|iteration_open` |
| `signals_json` | `jsonb` | métricas por fuente, coverage y freshness; nunca score causal único |
| `attribution_json` | `jsonb` | `not_claimed|operator_assessed|evidence_supported`, razón y actor |
| `next_action` | `text` | enum cerrado, opcional y no ejecutable automáticamente |
| `confidence` | `text` | `high|medium|low|not_calculable`, con razón |
| `source_refs_json` | `jsonb` | refs de GSC/rank/AEO/GA4/HubSpot/QA |
| `created_at` | `timestamptz` | server-side |

`signals_json` debe distinguir, como mínimo, impresiones/clicks/CTR GSC, posición/rank coverage,
citation share/observations AEO, eventos/conversiones GA4/HubSpot y estado de QA. Una señal ausente es
`unavailable` o `not_connected`, nunca cero.

#### State machine V1

| Estado | Requisito | Salida |
|---|---|---|
| `draft_private` | handoff exitoso 1667 | `qa_pending`, `cancelled` |
| `qa_pending` | validator/readback solicitado | `qa_passed`, `qa_blocked`, `qa_unavailable` |
| `qa_passed` | todos los blocks resueltos | `human_review` |
| `qa_blocked` | finding bloqueante | `iteration_open` o retry de QA; nunca publish |
| `human_review` | approval packet y reviewer | `approved_for_publish`, `cancelled` |
| `approved_for_publish` | persona ejecuta publicación fuera/dependiente de Content Factory | `published_unverified` |
| `published_unverified` | readback live y controles iniciales | `published_verified`, `rollback_required`, `publish_unknown` |
| `published_verified` | ventana de medición abierta | `measuring`, `iteration_open` |
| `measuring` | outcome evaluado | `observed`, `mixed`, `insufficient_data`, `iteration_open` |
| `rollback_required` | private/noindex/restore verificado | `rolled_back`, `iteration_open` |

Un estado `publish_unknown` detiene cualquier retry automático hasta que un operador inspeccione el
objeto externo. `approved_for_publish` no implica que se haya publicado.

### Evidence rules

#### QA antes de aprobación

Debe existir, según lane:

- `ContentFactoryValidation` con `pass` o warnings explícitos sin blocks;
- deep inspection/readback del draft/private y fingerprint esperado;
- headings, links, CTA, schema, autor, sources/claims, media/alt y index policy revisados;
- destino/canonical owner resuelto; una sola URL dueña o razón de `blocked`;
- copy/citability/grounded refs divulgados sin afirmar que la keyword sea una pregunta exacta;
- approval packet con actor humano, objeto exacto, timestamp y hash.

#### Después de publicación

Registrar como eventos separados:

1. `publish_readback`: status, post/page ID, permalink y fingerprint devueltos por el sistema externo.
2. `live_http`: status/redirect chain/freshness.
3. `live_canonical`, `live_robots`, `live_schema`, `live_og`, `live_author`, `live_mobile` y links
   cuando el runbook los exija.
4. `url_inspection` sólo si el contrato `TASK-1426` está operativo; no deducir indexación por HTTP 200.
5. `rollback` si algún gate bloquea: snapshot/restore, `private + noindex`, purge y verify.

El work item queda `published_unverified` si falta cualquier evidencia crítica; no se marca verified
por tener sólo un HTTP 200.

#### Outcome y atribución

La evaluación debe:

- tomar baseline anterior o declarar `baseline_missing`;
- usar ventanas configurables, por defecto 7/14/28 días según señal, **siempre cerradas en D-3**: una
  ventana que toque D-1/D-2 se declara `pending_data_consolidation` y no se evalúa (Delta 2026-08-15);
- agregar la posición **ponderada por impresiones** (`SUM(position × impressions) / SUM(impressions)`);
  **nunca `AVG(position)`**; sin impresiones en la ventana, sin posición agregada (Delta 2026-08-15);
- leer el eje AEO como **trayectoria por `(prompt, motor)`** vía `TASK-1311`, nunca como movimiento del
  score agregado del grader (Delta 2026-08-15);
- comparar con la misma URL, keyword/cluster y mercado cuando exista cobertura;
- mostrar coverage, freshness, source y as-of junto a cada variación;
- no sumar posiciones, clicks, citation share y leads en un número sin contrato;
- no reclamar causalidad automática entre publicación y conversión;
- permitir que un reviewer marque `operator_assessed` con explicación, separado de `evidence_supported`;
- producir `next_action` cerrado: `wait_for_more_data`, `refresh_title_or_ctr`, `expand_answer`,
  `fix_technical_issue`, `strengthen_internal_links`, `review_citations`, `update_cta`,
  `consolidate_requires_separate_task`, `close_no_action`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — state machine y evidence ledger

- Añadir tablas/constraints append-only para evidencia y outcome; no duplicar el schema de 1667.
- Implementar transiciones, guards, reason codes y events con idempotencia.
- Definir evidence refs para Content Factory, WordPress, SEO, AEO y measurement.
- Tests de salto de estados, publish unknown, rollback, tenant isolation y no falsos ceros.

### Slice 2 — QA packet y publicación observada

- Reader/adapter que consume validación/readback de Content Factory y arma un QA packet machine-readable.
- Command `recordSeoEditorialPublication` para registrar una acción humana y el objeto exacto;
  nunca ejecuta el publish externo.
- Evidencias live y estado `published_unverified`/`published_verified` con stop gates y señales.
- Procedimiento de rollback/containment referenciado y probado en staging con el owner externo.

### Slice 3 — outcomes y evaluación bounded

- Implementar readers normalizados para GSC/rank/AEO/GA4/HubSpot y un evaluator que sólo materializa
  observaciones, coverage, baseline, ventanas y disponibilidad.
- Crear `readSeoEditorialOutcome` y `evaluateSeoEditorialOutcome` idempotentes.
- Separar `measured`, `estimated`, `declared`, `derived` y `not_available`; no ocultar lag ni error.
- Emitir `insufficient_data` si no hay baseline, URL confiable, fuente conectada o cobertura mínima.

### Slice 4 — iteración y parity

- Implementar `openSeoEditorialIteration` como nueva propuesta/child work item con parent ref y razón.
- Exponer lifecycle/outcome en app, ecosystem, Nexa y MCP con el mismo DTO.
- Añadir `GROWTH_SEO_EDITORIAL_OUTCOMES_ENABLED` al ledger, manual, runbook y fixtures para 1665/1669.

## Out of Scope

- Generar/editar copy, blocks, media o schema; Content Factory es dueño.
- Ejecutar publish, purge, rollback externo o cambiar `post_status` desde este aggregate.
- Capturar nuevos datos de DataForSEO, GSC, rank, AEO, GA4 o HubSpot; se reutilizan providers/readers
  existentes y sus propias tasks.
- Crear un attribution model, incrementar conversiones por inferencia o prometer causalidad.
- Activar prompt sets, correr grader o hacer SQL join SEO↔AEO.
- Auto-abrir una nueva tarea, auto-refresh, auto-track, auto-publish o auto-fix desde una recomendación.
- Construir UI; `TASK-1665` es consumer.
- Convertir `published_unverified` en verified sólo porque pasó un timeout o un HTTP 200.

## Detailed Spec

### Commands and ownership

```ts
type RecordSeoEditorialEvidenceInput = {
  workItemId: string
  kind: EvidenceKind
  status: 'pass' | 'warning' | 'block' | 'observed' | 'unavailable' | 'not_applicable'
  sourceRef: string
  sourceSnapshotHash?: string
  asOf: string
  payload: Record<string, unknown>
  idempotencyKey: string
}

type RecordSeoEditorialPublicationInput = {
  workItemId: string
  actor: { kind: 'human'; id: string }
  externalRef: string
  publishedAt: string
  returnedStatus: 'publish' | 'private' | 'draft' | 'unknown'
  objectFingerprint: string
  idempotencyKey: string
}

type OpenSeoEditorialIterationInput = {
  parentWorkItemId: string
  nextAction: NextAction
  reasonCode: string
  evidenceRefs: string[]
  actor: { kind: 'human' | 'agent_confirmed'; id: string }
  idempotencyKey: string
}
```

Reglas:

- El actor del publish siempre es humano. Un agente puede preparar un packet, pero no suministrar una
  identidad humana falsa.
- `returnedStatus=unknown` crea `publish_unknown`; no se reintenta ni se marca verified.
- `openSeoEditorialIteration` no llama `createSeoEditorialWorkItem` implícitamente si faltan los
  campos de brief. Devuelve una propuesta o un child work item `needs_brief`, según la decisión del
  producto, pero nunca escribe copy.
- Una nueva evaluación con el mismo `(workItemId, windowKind, windowEnd, inputHash)` devuelve la
  existente. Una evaluación con nueva as-of agrega una fila nueva.

### Reader de outcome V1

`readSeoEditorialOutcome` debe devolver:

- lifecycle actual y lista de gates;
- URL/canonical con status de ownership, no una URL de otra org;
- baseline y window (`start`, `end`, `daysAvailable`);
- señal por fuente:
  - GSC: impressions, clicks, CTR, queries/pages, freshness;
  - rank: position, rank coverage, keyword/page, capture as-of;
  - Labs: volume/difficulty como estimados y nunca como resultado;
  - AEO: citations/share/queries sólo si 1311/reader está disponible;
  - GA4/HubSpot: eventos/leads/attribution sólo si conexión y contract están disponibles;
- QA: pass/warning/block, evidence refs, reviewer y unresolved findings;
- status `observed|mixed|insufficient_data|blocked|iteration_open`;
- `confidence` y razón;
- `nextAction` no ejecutable automáticamente.

La UI/Nexa debe poder decir “no hay datos suficientes” con precisión: falta baseline, no hay GSC,
URL no verificada, ventana incompleta, AEO desconectado o measurement no atribuido.

### Worker/evaluator contract

Si la evaluación periódica requiere worker:

- consume una cola/outbox idempotente por `workItemId + windowEnd`;
- sólo llama readers/materialized sources ya autorizados; no ejecuta provider live desde la vista;
- reclama con lock y abandona en `busy` sin duplicar outcomes;
- aplica un mínimo de cobertura configurable y registra `insufficient_data` cuando no se cumple;
- no crea una conclusión de éxito después de un error parcial;
- emite `seo.editorial.outcome.evaluated`, `seo.editorial.outcome.insufficient_data`,
  `seo.editorial.qa.blocked` y `seo.editorial.publish_unverified`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (states/evidence) → Slice 2 (QA/readback/publication receipt) → Slice 3
  (outcome/evaluator) → Slice 4 (iteration/parity).
- Nunca se puede habilitar `published_verified` antes de un `publish_readback` y los gates live
  mínimos.
- Nunca se puede habilitar `observed` antes de baseline/window/cobertura; en caso contrario sólo
  `insufficient_data`.
- `TASK-1669` puede leer estados en cuanto Slice 1 esté disponible, pero no puede tomar decisiones
  finales ni escribir evidence/outcome.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| Se marca publish sin confirmar objeto externo | Content Factory/WordPress | medium | actor humano + fingerprint + publish_readback obligatorio | `seo.editorial.publish_unknown` |
| URL incorrecta/canonical duplicado | public site/SEO | high | owner resolver, canonical/route QA, block antes de verified | `seo.editorial.qa.blocked` |
| HTTP 200 se interpreta como indexación | GSC/SEO | high | `TASK-1426` ref obligatoria o estado unavailable | `seo.editorial.indexation_evidence_unavailable` |
| Outcome mezcla señales incompatibles | data/measurement | medium | DTO por fuente, unidades y disclosures; no score único | `seo.editorial.outcome.mixed_sources` |
| Ventana leída sobre el borde móvil de GSC: cero filas se toma como cero clics | data/measurement | high | cierre en D-3 + `pending_data_consolidation` + as-of en el `inputHash` | outcome negativo que se corrige solo al recapturar |
| `AVG(position)` en el evaluator: sesgo pesimista consistente e indetectable | data/measurement | high | agregación ponderada por impresiones + test + grep del anti-patrón | posición agregada peor que la del cockpit operador |
| Eje AEO anclado al score agregado: se atribuye varianza de muestreo a la pieza | measurement/AEO | high | trayectoria por `(prompt, motor)` vía `TASK-1311`; el score sólo acompaña | `observed` que se revierte sin cambio de contenido |
| Atribución causal sin base | analytics | high | baseline/window/confidence y reviewer separado | `seo.editorial.attribution_unclaimed` |
| Reader externo falla parcialmente | integration | medium | degrade honesto, source unavailable, retry bounded | `seo.editorial.outcome.partial_read` |
| Evaluator duplica outcome o pisa historia | worker/db | medium | unique input hash, append-only y lock de claim | `seo.editorial.outcome.idempotency_replay` |
| Rollback deja página pública inconsistente | WordPress/cache | medium | snapshot, private+noindex, purge y readback bajo runbook | `seo.editorial.rollback_incomplete` |

### Feature flags / cutover

- `GROWTH_SEO_EDITORIAL_OUTCOMES_ENABLED=false` por defecto.
- Con flag OFF, se pueden leer estados de `TASK-1667`; no se crean evidence/outcome nuevos salvo
  fixtures/test mode explícito.
- QA y publish receipt se habilitan primero en una organización de prueba; outcomes empiezan sólo en
  modo `shadow`/read-only sobre snapshots existentes; la promoción a `observed` requiere evidencia.
- Revert: flag OFF, detener evaluator y conservar evidence/outcomes para auditoría. No se borran
  observaciones ni se resetean estados históricos.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---:|---|
| Slice 1 | detener commands y dejar work items en último estado válido; migration sólo aditiva | <5 min | sí, con history conservada |
| Slice 2 | flag OFF, bloquear verified/publish receipt nuevo y revisar estados unknown manualmente | <5 min | parcial |
| Slice 3 | detener evaluator, conservar outcomes y marcar nuevos intentos disabled; no borrar baseline | <5 min | sí |
| Slice 4 | deshabilitar apertura automática/propuesta de iteración; las recomendaciones existentes quedan no ejecutables | <5 min | sí |

### Production verification sequence

1. Tests de state machine: cada transición válida, cada salto inválido y publish unknown.
2. Migration staging + queries de constraints, indexes, append-only y tenant boundary.
3. Fixture de un draft private con validation pass, warning y block; verificar gates y packet.
4. Registrar publicación humana ficticia con status `publish` y readback; comprobar
   `published_unverified` hasta que live evidence cierre.
5. Simular canonical/robots/schema/mobile block y verificar que no se marca verified.
6. Evaluar una ventana con baseline completo y otra sin datos; comprobar `observed` vs
   `insufficient_data`, sin ceros ficticios.
7. Repetir evaluator con mismo input hash; no duplicar outcome.
8. Probar reader parity app/Nexa/MCP/ecosystem y anti-oracle cross-tenant.
9. Enable gradual por organización y monitorizar señales durante la ventana acordada.

### Out-of-band coordination required

- Owner de Content Factory y WordPress/Kinsta debe aprobar la lista de QA live y rollback.
- Owner de GSC/measurement debe confirmar freshness, ventanas y disponibilidad por organización.
- Owner AEO debe confirmar la forma de leer citation attribution sin cruzar tablas.
- Owner de HubSpot/GA4 debe confirmar qué campos son evidencia de atribución y cuáles son sólo eventos.
- Cualquier auto-publish futuro requiere aprobación/ADR/task separada; no se coordina como parte de esta.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La state machine no permite saltar de draft a publish/verified sin QA y approval packet.
- [ ] `recordSeoEditorialEvidence` es append-only, tenant-scoped e idempotente.
- [ ] Existe diferencia visible y persistida entre `qa_blocked`, `publish_unknown`,
  `published_unverified` y `published_verified`.
- [ ] El publish receipt exige actor humano, external ref, fingerprint y status; no ejecuta un write externo.
- [ ] HTTP 200 no se trata como indexación; `TASK-1426` o una evidencia equivalente debe existir o el
  resultado queda unavailable.
- [ ] QA incluye validator, deep inspection/readback, canonical/robots/schema/author/CTA/links/media y
  mobile según lane, con findings `info|warning|block`.
- [ ] Un block no puede avanzar a approval/publish; se conserva razón y evidencia.
- [ ] Outcome exige baseline, window, coverage, freshness y source refs; la ausencia produce
  `insufficient_data`, no cero ni éxito.
- [ ] **La ventana cierra en D-3.** Una ventana que toca D-1/D-2 produce `pending_data_consolidation`
  (distinto de `insufficient_data`) y no se evalúa. Una respuesta `ok` de Search Console con cero filas
  NUNCA se materializa como `0`. La recaptura de una ventana ya consolidada converge al mismo valor y
  el `inputHash` incluye el as-of de la fuente.
- [ ] **La posición agregada es ponderada por impresiones** (`SUM(position × impressions) /
  SUM(impressions)`). No existe un solo `AVG(position)` en readers/evaluator de outcome (verificado por
  test y por grep). Sin impresiones en la ventana no se emite posición agregada.
- [ ] **El eje AEO del outcome se ancla a la trayectoria por `(prompt, motor)`** vía `TASK-1311`; el
  score agregado del grader NUNCA sostiene por sí solo un `observed`.
- [ ] El eje de conversión declara su estado real: o `TASK-1284` está disponible y GA4/HubSpot
  producen señal, o la task declara explícitamente que el loop de negocio es **parcial**. No queda un
  `insufficient_data` permanente sin explicación.
- [ ] GSC, rank, Labs, AEO, GA4 y HubSpot aparecen como señales separadas con disclosure de fuente y
  no se agregan en un score causal sin contrato explícito.
- [ ] La evaluación no reclama causalidad automática; distingue `not_claimed`, `operator_assessed` y
  `evidence_supported` con actor y razón.
- [ ] AEO citation refs y outcomes SEO se relacionan sólo mediante refs opacas, nunca por FK/JOIN.
- [ ] `openSeoEditorialIteration` conserva parent work item, reason code y evidence refs, pero no
  escribe copy, publica, trackea ni ejecuta un comando externo.
- [ ] El evaluator es idempotente, bounded y no llama provider live desde el render.
- [ ] Fallos parciales de readers se degradan con estado `unavailable`/`mixed` y signal, no con éxito falso.
- [ ] Rollback/containment de publish incorrecto está documentado y probado en staging.
- [ ] App, Nexa, ecosystem y MCP consumen el mismo lifecycle/outcome DTO y respetan capabilities.
- [ ] `GROWTH_SEO_EDITORIAL_OUTCOMES_ENABLED` está en el ledger con OFF, cutover y rollback.
- [ ] `TASK-1669` sólo puede leer y proponer; no puede registrar QA, approval, outcome ni attribution.
- [ ] El manual permite ejecutar el ciclo diario: revisar → aprobar → publicar → verificar → medir → iterar.

## Verification

- `pnpm task:lint --task TASK-1668`
- Tests focales de state machine, append-only evidence, outcome windows, coverage, idempotency y
  tenant isolation.
- Migration/read-only verification en staging.
- Smoke de Content Factory validation/readback y publish receipt sin publicar automáticamente.
- Smoke live QA proporcional en staging con canonical/robots/schema/mobile y rollback controlado.
- Fixture de GSC/rank/AEO/GA4/HubSpot con y sin conexión; comprobar disclosures y `insufficient_data`.
- `pnpm docs:closure-check`
- `git diff --check -- docs/tasks/to-do/TASK-1668-growth-seo-editorial-qa-outcome-iteration-loop.md`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real.
- [ ] El archivo vive en la carpeta correcta.
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre.
- [ ] `Handoff.md` quedó actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes.
- [ ] `changelog.md` quedó actualizado si cambió comportamiento, estructura o protocolo visible.
- [ ] Se ejecutó chequeo cruzado con 1667, 1669, Content Factory, GSC, AEO y measurement.
- [ ] La evidencia demuestra que no existe auto-publish ni atribución causal automática.

## Follow-ups

- `TASK-1669` — agentes researcher/planner/QA-measurement que consumen lifecycle/outcome.
- Task futura de publicación programática opt-in, sólo si existe approval/rollback/QA suficiente y ADR.
- `TASK-1313`/`TASK-1314` pueden consumir outcomes granulares por página/cluster cuando sus readers estén completos.

## Open Questions

- Definir la ventana mínima por tipo de intervención (`create`, `refresh`, `fix`) con el owner de SEO;
  la task debe mantenerla configurable y no asumir que 7 días sirven para todo.
- Confirmar qué eventos HubSpot se consideran conversiones atribuibles y cuáles sólo observaciones de
  actividad.
- Confirmar el validator mínimo obligatorio para Elementor frente a Gutenberg; si son distintos, el
  lane debe expresar su propio QA profile.
