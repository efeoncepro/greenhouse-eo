# TASK-1974 — Criterio de figuras en el planificador de Insights

## Delta 2026-10-03

- El operador aprobó el canvas de la tarjeta de cifra (Slice 1 de TASK-1975). Dirección:
  [`TASK-1975-efeonce-insights-stat-card-direction.md`](../../ui/visual-directions/TASK-1975-efeonce-insights-stat-card-direction.md).
  Lo que el contrato de esta task debe traer para que se dibuje como se aprobó:
  - **(a) Dirección declarada.** Declarar «mayor es mejor» en clics, impresiones, CTR, tráfico estimado y visitas
    desde IA. Sin esa declaración, la variación sale en gris (neutra) y no en verde o rojo.
  - **(b) Nombre de tarjeta de 3 palabras como máximo** (24 caracteres). «Keywords en primera página» tiene 4 y se
    rechaza: el plan debe mandar «Primera página».
  - **(c) Excepción en el gate «ningún hecho alimenta dos figuras».** Los totales de una cascada (Berel: 16.390 →
    13.606) son anclas de la explicación y conviven con la tarjeta de la misma métrica sin contar como segunda figura.
  - **(d) Centro de la dona.** Si la métrica de la dona ya tiene tarjeta, el centro muestra la participación de la
    parte principal («97,7 % ChatGPT») y no el total. Sin tarjeta, el total de las partes.
  - **(e) Cifras agrupadas al inicio del capítulo.** Las tarjetas de un capítulo van juntas, en una figura o página,
    antes de los gráficos.
- **Orden del capítulo:** cifras → evolución → explicación → composición → comparación. La familia que no aplica se
  salta; el orden no se invierte.
- **Una métrica con meta va sólo en bullet, sin tarjeta.**
- **Una sola página de cifras por capítulo:** hasta 6 cifras en A4 y en deck (3×2); con más, páginas equilibradas una
  tras otra, nunca separadas por gráficos.
- **Copy de la variación:** «vs {valor} en {período}» («vs 16.390 en agosto 2026»), así que el modelo web y el plan
  deben traer el valor anterior junto al período.
- Criterio canónico actualizado con estas reglas: `EFEONCE_INSIGHTS_CHART_SELECTION_CRITERIA_V1.md` §5.2.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `EPIC-045`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El planificador de Efeonce Insights elige hoy casi siempre barras agrupadas y muestra algunos datos dos veces. Esta
task implementa el criterio canónico aprobado el 2026-10-03: cada figura responde una pregunta del lector y la familia
sale de esa pregunta; un dato no se muestra dos veces; la variedad sólo desempata. Agrega la **tarjeta de cifra** como
tipo de figura del contrato del plan y del modelo web, y lleva evidencia a dona y barras apiladas. Es la base de datos y
contrato; las páginas visibles (PDF, deck, Think) son TASK-1975.

## Why This Task Exists

Medido el 2026-10-03 con el código en producción (septiembre 2026 contra agosto): Berel tiene 10 figuras y 6 son barras
agrupadas; tres de ellas son una sola métrica contra el mes anterior (CTR, tráfico estimado, visitas desde IA), que se
leen mejor como cifra. Sky (edición de ICO) muestra tres métricas en barras contra el mes anterior y otra vez las mismas
tres en bullets contra la meta. La causa es estructural: `chartFor` en el planificador agrupa hechos por unidad y emite
`bar_grouped` cada vez que hay período anterior, sin preguntarse qué quiere saber el lector. No hay figura de cifra en
el contrato (`ChartSpecV1` sólo conoce las 15 familias de gráfico) y la matriz de familias marca dona y barras apiladas
como `no_evidence` aunque los adapters ya entregan partes de un total (visitas por asistente de IA, visitas con
interacción).

## Goal

- El planificador elige la familia de cada figura con la tabla pregunta → familia del criterio canónico, y cada figura
  declara la pregunta que responde.
- Ningún hecho alimenta dos figuras: una métrica con meta va en bullet y no repite una barra contra el período anterior.
- La tarjeta de cifra existe como tipo de figura en el plan editorial y en el modelo web, con su anatomía completa.
- Dona y barras apiladas tienen productor con evidencia real (Berel: visitas desde IA por asistente; visitas orgánicas
  con y sin interacción) y la matriz de familias lo refleja.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_INSIGHTS_CHART_SELECTION_CRITERIA_V1.md` — **el criterio que esta task implementa** (canon).
- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` §15 (contrato de contenido, familias de gráfico por
  superficie, modelo web 1.3).
- `docs/architecture/EFEONCE_INSIGHTS_PLATFORM_DECISION_V1.md`.

Reglas obligatorias:

- La familia se decide por la pregunta del dato; la variedad sólo desempata entre familias igual de válidas y nunca
  elige una peor (criterio §4).
- Un hecho no alimenta dos figuras (criterio §4, regla 2).
- Reglas duras heredadas (criterio §6): barras desde 0, nunca torta con más de 3 partes, nunca doble eje, nunca color
  como única codificación, embudo sólo con etapas estrictamente ordenadas que pierden gente (Search Console → GA4 no lo
  es).
- Contrato de mantenimiento del contenido (`presentation/content-contract.ts`) y de la matriz
  (`editorial/family-evidence-matrix.ts`): agregar una familia o un tipo de figura exige subir su versión y su test.
- Las cifras de toda frase y figura salen de hechos del snapshot; el validador del plan (`editorial/plan-validation.ts`)
  sigue siendo la puerta.

## Normative Docs

- `.claude/skills/efeonce-insights/references/contracts.md` § «Criterio de selección de gráficos».
- `.claude/skills/efeonce-insights/references/lessons.md` (lección 2026-10-03: el planificador elegía casi siempre
  barras agrupadas y repetía datos).
- Skill `dataviz-design` (tabla pregunta → gráfico, anatomía de KPI card).

## Dependencies & Impact

### Depends on

- TASK-1962 (contrato de contenido, hechos de GA4 `site.*`, `ai_sessions`, `ai_source.*`) — en producción desde el
  release `fe261ca2745f` (2026-10-03).
- `src/lib/efeonce-insights/contracts/chart-spec.ts` (`ChartSpecV1`, `CHART_FAMILIES`).

### Blocks / Impacts

- **Bloquea TASK-1975** (páginas visibles de tarjeta de cifra, cascada, waffle, dona y barras apiladas en PDF, deck y
  Think).
- Cambia el contrato del modelo web consumido por Think (`efeonce-think`): la versión sube y Think debe tolerar la
  tarjeta de cifra antes de que TASK-1975 la dibuje (degradación declarada, nunca figura en blanco).
- TASK-1958 (jerarquía visual): las secciones de hallazgos consumen el plan; coordinar si se toma en paralelo.

### Files owned

- `src/lib/efeonce-insights/editorial/deterministic-planner.ts`
- `src/lib/efeonce-insights/editorial/editorial-v2.ts`
- `src/lib/efeonce-insights/editorial/family-evidence-matrix.ts`
- `src/lib/efeonce-insights/editorial/figure-selection.ts` (nuevo: la regla pregunta → familia como función pura)
- `src/lib/efeonce-insights/contracts/plan.ts`
- `src/lib/efeonce-insights/contracts/chart-spec.ts`
- `src/lib/efeonce-insights/contracts/web-model.ts`
- `src/lib/efeonce-insights/sharing/web-model.ts`
- `src/lib/efeonce-insights/editorial/plan-validation.ts`
- `src/lib/efeonce-insights/editorial/*.test.ts` y `src/lib/efeonce-insights/editorial/figure-selection.test.ts` (nuevo)
- `docs/architecture/EFEONCE_INSIGHTS_CHART_SELECTION_CRITERIA_V1.md` (estado de implementación)

## Current Repo State

### Already exists

- Criterio canónico: `docs/architecture/EFEONCE_INSIGHTS_CHART_SELECTION_CRITERIA_V1.md` (aprobado 2026-10-03).
- Planificador: `src/lib/efeonce-insights/editorial/deterministic-planner.ts` — `chartFor` (barras/barras agrupadas por
  unidad), `chartableGroupsFor` (bandas de magnitud, escala propia), `weeklyLineChart` (línea), `driverSectionFor`
  (cascada de consultas), `aeoWaffleCharts` (waffle de tono y tipo de fuente), `aiSourceGroups` (figura por asistente
  completa o ninguna); `bulletCharts` y `lineCharts` en `editorial-v2.ts`.
- Matriz `src/lib/efeonce-insights/editorial/family-evidence-matrix.ts` (`family_evidence_matrix_v2`): `producer_now`
  para bar, bar_grouped, line, bullet, waterfall, waffle; `no_evidence` para las otras 9, incluidas donut y bar_stacked.
- Contrato `src/lib/efeonce-insights/contracts/chart-spec.ts`: 15 familias (`SERIES_CHART_FAMILIES` +
  `DATA_CHART_FAMILIES`); no hay tipo de figura de cifra.
- Hechos que ya permiten las familias nuevas: `site.organic_sessions` / `site.organic_engaged_sessions` (SEO, GA4) y
  `ai_sessions` / `ai_source.<asistente>` (AEO, GA4) en `src/lib/efeonce-insights/adapters/ga4-site-facts.ts`.
- Modelo web 1.3 (`INSIGHT_WEB_MODEL_VERSION` en `contracts/web-model.ts`) proyectado en `sharing/web-model.ts`.

### Gap

- No hay una regla explícita pregunta → familia: la familia sale de la unidad y de si hay período anterior.
- No existe la tarjeta de cifra en el plan ni en el modelo web.
- No hay deduplicación entre figuras: Sky repite OTD, FTR y RpA en barras y en bullets.
- No hay desempate por variedad.
- Dona y barras apiladas no tienen productor; tipo de fuente del Grader va en waffle con 6 categorías (el criterio pide
  barras horizontales ordenadas a partir de 5).
- Ninguna figura declara la pregunta que responde.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/efeonce-insights/editorial/**` y `src/lib/efeonce-insights/contracts/**` (dominio Insights en el
  portal Greenhouse; el planificador corre en Vercel y en el `ops-worker` para ediciones programadas).
- Future candidate home: `domain-package`
- Boundary: el planificador y el contrato del plan son el primitive; consumers autorizados: mappers de render
  (`render/**`), proyección web (`sharing/web-model.ts` → Think), validador del plan y autoría IA acotada.
- Server/browser split: el contrato (`contracts/*`, `figure-selection.ts`) es browser-safe y sin I/O; el planificador no
  lee bases ni providers (recibe el snapshot).
- Build impact: none
- Extraction blocker: none

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: plan editorial congelado (`EditorialPlanV1`, `contracts/plan.ts`) y su proyección web
  (`InsightWebModel`, `contracts/web-model.ts`); los hechos siguen saliendo del snapshot sellado.
- Consumidores afectados: mappers PDF/deck (`render/report-mapper.ts`, `render/insights-deck-mapper.ts`), Think
  (`efeonce-think`, consumidor del modelo web), autoría IA acotada (`editorial/ai-authoring.ts`), MCP/API de lectura de
  ediciones.
- Runtime target: Vercel (crear/revisar ediciones) y `ops-worker` (ediciones programadas).

### Contract surface

- Contrato existente a respetar: `ChartSpecV1` (`chart_spec_v1`), `EditorialPlanV1` (`editorial_plan_v1`), modelo web
  1.3, `family_evidence_matrix_v2`, `content_contract_v4`.
- Contrato nuevo o modificado: figura de cifra en el plan (tipo nuevo, p. ej. `StatFigureV1` con `factId`,
  `comparisonFactId`, `unit`, `direction`, `estimated`, `question`) y su proyección en el modelo web (versión 1.4);
  campo `question` por figura; matriz v3 con dona y barras apiladas `producer_now`.
- Backward compatibility: `gated` — ediciones ya selladas conservan su plan (inmutables); sólo ediciones nuevas o
  revisadas usan el criterio. Think debe aceptar 1.3 y 1.4.
- Full API parity: el plan y el modelo web son el contrato que leen API, MCP, Think y los mappers; ninguna superficie
  decide la familia por su cuenta.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna tabla nueva; el plan se persiste como hoy en `greenhouse_insights`
  (planes congelados, inmutables).
- Invariantes que no se pueden romper:
  - Un hecho del período actual alimenta como máximo una figura del capítulo (los de comparación y referencia acompañan a
    su hecho principal).
  - Toda figura declara su pregunta y su familia sale de la tabla del criterio.
  - Toda cifra impresa sale de un hecho citado; la tarjeta de cifra cita valor y comparable.
  - Un plan ya sellado no se recalcula.
- Write-target allowlist: N/A (no hay escrituras nuevas).
- Tenant/space boundary: sin cambio (el planificador recibe el snapshot de una sola organización).
- Idempotency/concurrency: el planificador es determinista; misma entrada → mismo plan (test).
- Audit/outbox/history: sin cambio; la versión del contrato queda en el plan sellado.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: el criterio rige para ediciones nuevas o revisadas con contrato editorial v2.
- Backfill plan: ninguno (las ediciones selladas no se tocan).
- Rollback path: revert del PR; las ediciones generadas con el criterio quedan como están y siguen siendo legibles.
- External coordination: Think debe aceptar el modelo web 1.4 antes de que producción emita figuras de cifra (orden del
  rollout abajo).

### Security and access

- Auth/access gate: sin cambio (los tres planos de `authz.ts`).
- Sensitive data posture: sin datos sensibles nuevos.
- Error contract: sin cambio.
- Abuse/rate-limit posture: N/A (función pura).

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/efeonce-insights` (incluye el test nuevo de selección y el gate de duplicados).
- DB/runtime checks: plan real de Berel y Sky de septiembre 2026 con `scripts/insights/preview-edition.ts --plan-only
  --editorial-v2 --start=2026-09-01 --end-exclusive=2026-10-01`.
- Integration checks: el modelo web proyectado valida contra el contrato de Think (fixture compartido).
- Reliability signals/logs: sin señal nueva.
- Production verification sequence: ver Rollout.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo.
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

### Slice 1 — Regla pregunta → familia como función pura

- `editorial/figure-selection.ts`: clasifica cada grupo de hechos por la pregunta que responde (valor y cambio,
  evolución, meta, qué explica el cambio, composición con 2–3 partes / unidades contables ≤ 4 categorías / más de 4
  categorías, subconjunto dentro de un total, comparar elementos ordenados) y devuelve la familia del criterio.
- Desempate por variedad: entre familias igual de válidas, la que no usó la figura anterior del capítulo.
- Tests de la tabla completa, con un caso por fila del criterio y los casos de Berel y Sky.

### Slice 2 — Tarjeta de cifra en el contrato

- Tipo de figura de cifra en `contracts/plan.ts` (no es una de las 15 familias de `ChartSpecV1`), con valor, comparable,
  unidad, dirección (`lower_is_better` cuando corresponda), marca «estimado» y pregunta.
- Proyección en el modelo web (`INSIGHT_WEB_MODEL_VERSION` → 1.4) y validación en `plan-validation.ts` (cifras citadas).
- Degradación para consumidores que aún no la dibujan: el hallazgo y la tabla siguen presentes (nunca figura vacía).

### Slice 3 — Planificador con el criterio y deduplicación

- `deterministic-planner.ts` usa la regla: una métrica sola o métricas cada una en su escala → tarjetas; métrica con meta
  → bullet (y no barra contra el período anterior); varias metas de un capítulo → una figura de bullets.
- Gate: ningún hecho del período actual alimenta dos figuras; cada figura declara su pregunta.
- Tipo de fuente del Grader (más de 4 categorías) pasa de waffle a barras horizontales ordenadas.

### Slice 4 — Evidencia para dona y barras apiladas

- Dona: visitas desde asistentes de IA por asistente (≤ 3 partes; el resto como «otros»), desde `ai_source.*`.
- Barras apiladas: visitas orgánicas con y sin interacción, este período y el anterior, desde `site.*`.
- Matriz `family_evidence_matrix_v3`: donut y bar_stacked `producer_now` con su evidencia; subir la versión y su test.
- Contrato de contenido: regla de las métricas derivadas si aplica; subir `CONTENT_CONTRACT_VERSION` si cambia.

### Slice 5 — Verificación con datos reales y documentación

- Planes de Berel y Sky (septiembre 2026) con `--plan-only`: Berel con tarjetas, apiladas, línea, cascada, barras, dona
  y waffle; Sky con una figura de bullets de 3 metas + tarjeta de piezas entregadas; 0 errores de validación.
- Actualizar el estado de implementación del criterio canónico, §15 de la arquitectura y la skill `efeonce-insights`
  (contracts, lessons, program-ledger) con espejo `.codex`.

## Out of Scope

- Las páginas y láminas visibles (PDF A4, deck) y el render en Think: TASK-1975.
- Familias sin evidencia todavía (embudo, venn/upset de la brecha SEO × AEO, dispersión, mapa de calor, medidor): tasks
  propias cuando su evidencia exista (TASK-1901/1902 para medidor y mapa de calor).
- Recalcular ediciones ya selladas.
- Cambios en adapters fuera de lo que exija la dona y las apiladas (los hechos de GA4 ya existen).

## Detailed Spec

La tabla pregunta → familia, la anatomía de la tarjeta de cifra y los casos de Berel y Sky están en
`docs/architecture/EFEONCE_INSIGHTS_CHART_SELECTION_CRITERIA_V1.md` §5, §5.1 y §7; no se duplican acá.

Mapeo esperado con los datos de septiembre 2026 (criterio §7):

| Hoy | Con el criterio |
|---|---|
| Clics, impresiones y keywords (barras agrupadas) | 3 tarjetas de cifra |
| CTR (barras) | tarjeta |
| Tráfico orgánico estimado (barras) | tarjeta con marca «estimado» |
| Visitas orgánicas al sitio y con interacción (barras) | barras apiladas |
| Clics por semana (línea) | línea |
| Qué consultas explican el cambio (cascada) | cascada |
| Páginas que más movieron los clics (barras) | barras horizontales |
| Visitas desde asistentes de IA (barras) | tarjeta + dona |
| Tono de las respuestas (waffle) | waffle |
| Tipo de fuente citada (waffle) | barras horizontales ordenadas |
| Sky: 3 barras contra el mes anterior + 3 bullets | 1 figura de bullets + tarjeta de piezas entregadas |

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5.
- Slice 2 (tarjeta en el contrato) MUST ship antes de Slice 3: el planificador no puede emitir un tipo que el contrato no
  valida.
- El release que lleve Slice 2–3 a producción exige que Think acepte el modelo web 1.4 **antes** o en el mismo
  despliegue (si no, la vista compartida recibe una figura que no sabe dibujar).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Think recibe una tarjeta de cifra que no dibuja | UI (Think) | medium | degradación declarada (hallazgo + tabla), Think acepta 1.4 antes del release | revisión de la vista previa compartida; error de validación del modelo en Think |
| El PDF omite tarjetas, apiladas o donas hasta TASK-1975 | render | high | el mapper ya omite familias sin página (no rechaza); el hallazgo y la tabla quedan | vista previa `preview-edition.ts` antes de emitir |
| Una figura queda sin hecho propio por la deduplicación | editorial | low | test del gate + validador del plan | `validateEditorialPlan` con errores |
| La autoría IA acotada redacta sobre una figura que cambió de familia | editorial | low | la autoría reescribe texto validado, nunca cifras; fallback determinista | provenance de la autoría con fallback |

### Feature flags / cutover

- Sin flag nuevo: el criterio rige con `INSIGHTS_EDITORIAL_V2_ENABLED` (ya ON) para ediciones nuevas o revisadas; las
  selladas no cambian. Revert = revert del PR.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del PR (función pura sin consumidores hasta Slice 3) | < 10 min | sí |
| Slice 2 | revert del PR; Think sigue aceptando 1.3 | < 10 min | sí |
| Slice 3 | revert del PR; ediciones nuevas vuelven a la selección por unidad | < 10 min + release | sí |
| Slice 4 | revert del PR; dona y apiladas vuelven a `no_evidence` | < 10 min + release | sí |
| Slice 5 | docs | — | sí |

### Production verification sequence

1. Local: suite de Insights verde y planes `--plan-only` de Berel y Sky con 0 errores y el mapeo esperado.
2. Think acepta el modelo web 1.4 (fixture) antes de promover.
3. Staging: crear una edición de Berel con el criterio y leer su modelo web compartido.
4. Producción (con el release): crear o revisar una edición y comprobar familias y ausencia de datos repetidos.

### Out-of-band coordination required

- Despliegue de `efeonce-think` con soporte del modelo web 1.4 (repo hermano) coordinado con el release de Greenhouse.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `figure-selection.ts` implementa la tabla pregunta → familia del criterio, con un test por fila.
- [ ] El desempate por variedad sólo actúa entre familias igual de válidas (test con un caso donde la variedad NO cambia
  la familia).
- [ ] El plan tiene un tipo de figura de cifra con valor, comparable, unidad, dirección, marca «estimado» y pregunta, y
  el validador del plan exige que sus cifras salgan de hechos.
- [ ] El modelo web sube a 1.4 y proyecta la tarjeta de cifra y la pregunta de cada figura.
- [ ] En el plan de Sky de septiembre 2026 OTD, FTR y RpA aparecen una sola vez (en una figura de bullets).
- [ ] En el plan de Berel de septiembre 2026 aparecen tarjetas, barras apiladas, línea, cascada, barras, dona y waffle, y
  tipo de fuente va en barras horizontales ordenadas.
- [ ] Ningún hecho del período actual alimenta dos figuras en los planes de Berel y Sky (gate en test).
- [ ] La matriz de familias sube a v3 con dona y barras apiladas `producer_now` y su evidencia.
- [ ] El criterio canónico, §15 de la arquitectura y la skill `efeonce-insights` (espejo `.codex`) quedan actualizados.

## Verification

- `pnpm vitest run src/lib/efeonce-insights`
- `pnpm local:check`
- `pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/insights/preview-edition.ts --edition=<Berel> --org=org-32333527-02a8-487b-819e-6f76a761777d --editorial-v2 --plan-only --start=2026-09-01 --end-exclusive=2026-10-01` (y lo mismo para Sky).
- `pnpm test` y `pnpm build` al cierre (Task Closing Quality Gate).

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] TASK-1975 recibe un `## Delta` con el contrato final de la tarjeta de cifra y el modelo web 1.4.
- [ ] Skill `efeonce-insights` actualizada y espejada a `.codex/`.

## Follow-ups

- Familias con evidencia futura: embudo, venn/upset de la brecha SEO × AEO, dispersión de oportunidades SEO.
- Pasajes de la skill y de lecciones previas que describen la barra agrupada con escala propia como solución
  (contracts.md § Client-fit, lessons 2026-09-22 y 2026-09-25): actualizarlos al implementar.

## Open Questions

- Nombre del tipo en el contrato (`StatFigureV1` u otro): lo decide quien tome la task, alineado con TASK-1975.
