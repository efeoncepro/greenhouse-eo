# TASK-1957 — Efeonce Insights: contrato de presentación apto para cliente (proyección, selección editorial y gate)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
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
- Status real: `Code complete local (commit c56f62d09, sin push): vocabulario, modelo web 1.2, límites de lector, elegibilidad de figuras, roles y gate client-fit; 280 pruebas + typecheck + lint + canvas-fidelity verdes; Berel y Sky regenerados pasan el gate. Pendiente: release, canary 1.2 en producción y revise de ediciones internas`
- Rank: `TBD`
- Domain: `platform|growth|delivery`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin branch dedicada ni worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El informe live de Insights que producción sirve desde el release `6ea157e6e641` (modelo web 1.1) muestra a cliente
nombres internos de tablas como fuente, códigos de unidad, límites redactados con diagnóstico interno y duplicados,
una frase por cada cifra sin selección y gráficos sin información (barras iguales, conteos sin denominador, magnitudes
incomparables en un mismo eje, posición media en barras desde cero). Esta task corrige el ORIGEN en Greenhouse
(proyección del modelo web, planner editorial y título por defecto) y agrega el gate que impide que vuelva a pasar.
La jerarquía visual en Think y en los PDF es la task hermana `TASK-1958`, bloqueada por ésta.

## Why This Task Exists

Revisión del operador del 2026-10-02 sobre dos ediciones internas reales (Berel `EO-INS-000027`, Sky `EO-INS-000029`)
renderizadas en local con el mismo código de producción. Diagnóstico de causa (arch-architect + guía web moderna):

1. **Dos humanizaciones divergentes.** El PDF traduce la fuente con `GH_INSIGHTS.sources[fact.method.name]`
   (`src/lib/efeonce-insights/render/figure-slots.ts:219`), pero la proyección web copia `fact.source` crudo
   (`src/lib/efeonce-insights/sharing/web-model.ts:31`), que contiene la tabla lectora
   (`greenhouse_growth.seo_gsc_daily`, `greenhouse_growth.grader_runs`, `ico_engine.metric_snapshots_monthly (materialized)`).
   Think lo pinta tal cual en cinco lugares (`ModuleScene.astro:44,145`, `InsightReport.astro:208,232,374`). La unidad
   llega como código (`count`, `score`) y el corte como fecha ISO. La traducción vive en el render del PDF, no en el
   contrato, así que cada consumer nuevo la tiene que reinventar y el web no la reinventó.
2. **El planner recita, no selecciona.** `buildDeterministicPlan` (`src/lib/efeonce-insights/editorial/deterministic-planner.ts:155`)
   emite un claim por cada hecho del capítulo («Las keywords con medición se mantuvieron en 31», «Visibilidad en IA: 0»)
   y el render los lista sin jerarquía.
3. **Límites con lenguaje interno.** `limitFor` (`deterministic-planner.ts`, ~línea 30) compone «la fuente no sirve
   esta ventana con exactitud» desde `GH_INSIGHTS.rejections` y repite la línea para el período actual y el de
   comparación. Es diagnóstico de adapter, no información útil para el cliente, y nos deja mal.
4. **Gráficos sin elegibilidad.** `chartFor` agrupa por unidad y siempre devuelve barras: mezcla 10.662 clics con
   566.297 impresiones y 31 keywords en el mismo eje; dibuja cuatro barras de valor 2 (presencia por motor) usando el
   numerador cuando el hecho trae `numerator`/`denominator` (`aeo-adapter.ts:86`); grafica posición media (menor es
   mejor) en barras desde cero; y produce un titular contradictorio («Todos los motores mencionan la marca en 2 de 6»).
5. **Título técnico por defecto.** `create-edition.ts:84` arma `Insights ${modules} ${start}–${end}` cuando no viene
   título; así llegó «Insights ICO 2026-08-01–2026-09-01» a la portada de Sky.

Nada de esto es cosmético: es la frontera entre evidencia interna y documento de cliente, y hoy no tiene dueño ni gate.
Ninguna edición de cliente se emitió todavía, así que el arreglo llega antes del primer cliente si se cierra ahora.

## Goal

- Ningún identificador interno (tabla, esquema, código de unidad, `metricId`, fecha ISO cruda) llega a un texto visible
  del modelo web ni del plan de una edición de audiencia cliente; lo garantiza un gate derivado del payload, no una lista
  de literales.
- El plan selecciona: hallazgos con lectura arriba, el resto como respaldo tabular; los límites se dicen en lenguaje del
  cliente, una vez por tema; los gráficos sólo se emiten cuando informan (reglas de elegibilidad explícitas).
- Una sola fuente de verdad de vocabulario de presentación (fuente, unidad, corte, título) que comparten web y PDF.

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
- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` (contrato editorial v2, modelo web, render)
- `docs/architecture/EFEONCE_INSIGHTS_PLATFORM_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md` (Think es render tonto; Greenhouse calcula)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- **Greenhouse calcula y redacta; Think renderiza.** La humanización de fuente, unidad, corte y título vive en la
  proyección canónica de Greenhouse, nunca en Think ni duplicada por consumer.
- **Un vocabulario, dos formas.** El modelo web y el mapper del PDF consumen las MISMAS funciones de presentación;
  `figure-slots.ts` deja de tener su traductor propio.
- **Plan sellado = inmutable.** Las reglas nuevas aplican a ediciones nuevas o revisadas; nunca se reescribe un plan
  congelado ni el `issued_hash` de una edición emitida.
- **La evidencia interna no se pierde.** `fact.source`, el `detail` del rechazo y el `method.name` siguen en el
  snapshot sellado; sólo dejan de viajar en los textos de cliente.
- **El gate se deriva del payload** (lección del segundo consumidor de arch-architect): patrones de identificador,
  coherencia número/titular y elegibilidad de figura se verifican sobre lo que el modelo contiene, no contra literales
  de Berel o Sky.

## Normative Docs

- `.claude/skills/efeonce-insights/SKILL.md` y `references/{program-ledger,contracts,lessons}.md` (contrato de la skill:
  cada hija la actualiza al cerrar).
- `docs/epics/to-do/EPIC-045-efeonce-insights-multiformat-intelligence.md`
- `src/lib/copy/insights.ts` (`GH_INSIGHTS`: `sources`, `units`, `rejections`, `document`) — fuente única de copy.

## Dependencies & Impact

### Depends on

- `TASK-1888` (complete): contrato editorial v2 — `readings`, `essentials`, `scopeLines`, `cover`.
- `TASK-1875` (complete): `InsightWebModelV1` 1.1 servido a Think.
- `TASK-1889` (complete): catálogos premium A4/deck que consumen el plan.

### Blocks / Impacts

- `TASK-1958` (UI de jerarquía en Think y PDF) — bloqueada por ésta: consume `unitLabel`, `asOfLabel`, la selección de
  hallazgos y las figuras elegibles.
- Primera emisión de una edición de cliente (Berel/Sky): no debe ocurrir antes de cerrar esta task y `TASK-1958`.
- `TASK-1901` (evidencia más rica para familias de gráfico): sus familias nuevas pasan por las reglas de elegibilidad de
  esta task; coordinar `chartFor` para no editarlo en paralelo.
- `TASK-1903` (agente redactor): la autoría IA reescribe sobre el plan que esta task selecciona; el gate de esta task
  aplica también a su salida.
- `efeonce-think`: `InsightWebModelV1` sube a 1.2 aditivo (campos nuevos); Think 1.x sigue renderizando.

### Files owned

- `src/lib/efeonce-insights/presentation/` (nuevo: vocabulario de presentación + gate client-fit)
- `src/lib/efeonce-insights/sharing/web-model.ts`
- `src/lib/efeonce-insights/contracts/web-model.ts`
- `src/lib/efeonce-insights/editorial/deterministic-planner.ts` (`chartFor`, `limitFor`, selección de claims)
- `src/lib/efeonce-insights/editorial/plan-validation.ts`
- `src/lib/efeonce-insights/render/figure-slots.ts` (`sourcesOf` pasa a consumir el vocabulario común)
- `src/lib/efeonce-insights/commands/create-edition.ts` (título por defecto)
- `src/lib/copy/insights.ts`
- `src/lib/efeonce-insights/**/__tests__/` y fixtures nuevos de presentación

## Current Repo State

### Already exists

- Vocabulario parcial: `GH_INSIGHTS.sources` (por `method.name`), `GH_INSIGHTS.units`, `GH_INSIGHTS.rejections` en
  `src/lib/copy/insights.ts`.
- PDF humaniza fuente y unidad (`render/figure-slots.ts:219`, `render/report-mapper.ts:303`).
- `buildInsightWebModel` (`sharing/web-model.ts:90`) y `resolveSharedInsightEdition` (`sharing/public.ts`) arman la
  respuesta `InsightSharedEditionResponseV1` (`INSIGHT_WEB_MODEL_VERSION = '1.1'`).
- Hechos con `numerator`/`denominator` para presencia AEO (`adapters/aeo-adapter.ts:86`).
- Validación de plan (`editorial/plan-validation.ts`) con validador de cifras de TASK-1888.
- Herramienta local `scripts/insights/preview-edition.ts` para revisar ediciones con datos reales sin escribir.

### Gap

- El modelo web proyecta `fact.source` crudo, `unit` en código y `asOf` ISO; no existe `unitLabel` ni `asOfLabel`.
- El planner emite un claim por hecho; no hay noción de hallazgo vs respaldo en los claims de capítulo.
- `limitFor` usa diagnóstico interno y duplica actual/comparación.
- `chartFor` no tiene reglas de elegibilidad (varianza, banda de magnitud, proporción con denominador, métricas de
  menor-es-mejor).
- `create-edition.ts:84` produce un título técnico.
- No existe un gate que falle cuando un identificador interno llega a un texto de cliente.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/efeonce-insights/` (Greenhouse, runtime Vercel + Job `artifact-worker` para el PDF)
- Future candidate home: `domain-package`
- Boundary: `buildInsightWebModel` y el mapper del PDF consumen `src/lib/efeonce-insights/presentation/` (vocabulario +
  gate); el planner aplica reglas de elegibilidad; Think y los catálogos sólo leen el modelo/plan ya redactado.
- Server/browser split: `cálculo íntegro en server-only; Think recibe el modelo serializado por el lector público`
- Build impact: `none — funciones puras sin dependencias nuevas; el Job artifact-worker bundlea los mismos módulos`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: `snapshot de evidencia sellado (greenhouse_insights.insight_evidence_snapshots) y plan congelado (greenhouse_insights.insight_editorial_plans); proyección InsightWebModelV1`
- Consumidores afectados: `Think (/insights/r/<token>), PDF A4 y deck (artifact-worker), lane app/ecosystem/MCP de Insights, TASK-1903`
- Runtime target: `production (Vercel + Job artifact-worker), staging`

### Contract surface

- Contrato existente a respetar: `src/lib/efeonce-insights/contracts/web-model.ts` (`InsightWebModelV1` 1.1), `contracts/plan.ts` (`editorial_plan_v1` + v2)
- Contrato nuevo o modificado: `InsightWebModelV1` 1.2 aditivo — `InsightWebFactV1.source` pasa a ser la etiqueta humana (misma semántica que la muestra de Think), nuevos `unitLabel` y `asOfLabel`; claims de capítulo con rol `finding|backing`; `limits` en lenguaje de cliente y deduplicados por tema; figuras sólo elegibles
- Backward compatibility: `compatible` — campos aditivos; `source` conserva tipo string; Think 1.x ignora campos nuevos
- Full API parity: `la presentación se calcula en la proyección canónica; UI, Think, PDF, MCP y TASK-1903 la consumen sin lógica propia`

### Data model and invariants

- Entidades/tablas/views afectadas: `ninguna tabla nueva; lectura de insight_evidence_snapshots, insight_editorial_plans, insight_editions, insight_reports`
- Invariantes que no se pueden romper:
  - `Un plan congelado o una edición emitida nunca se reescriben; las reglas aplican sólo a ediciones nuevas o revisadas.`
  - `Ningún string visible de una edición de audiencia cliente contiene un identificador interno (tabla con punto, snake_case de métrica, código de unidad, fecha ISO).`
  - `Toda cifra de un titular coincide con la figura y el hecho que cita (validador de TASK-1888 intacto).`
  - `Un gráfico emitido tiene al menos dos valores distintos o una comparación con cambio; un hecho con denominador se grafica como proporción y se rotula «n de m».`
  - `La evidencia interna (fact.source, detail, method.name) permanece completa en el snapshot sellado.`
- Write-target allowlist: `sin tablas nuevas; no cambia ALLOWED_WRITE_TARGETS del dominio`
- Tenant/space boundary: `sin cambio: la proyección sigue derivando organización y edición desde el grant/edición ya autorizados`
- Idempotency/concurrency: `funciones puras deterministas sobre snapshot+plan; misma entrada ⇒ misma salida`
- Audit/outbox/history: `sin eventos nuevos; la bitácora de acceso del lector público no cambia`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `enabled with rationale — la proyección y el planner corregidos aplican al desplegarse; no hay flag porque el comportamiento viejo expone datos internos`
- Backfill plan: `sin backfill de datos; las ediciones internas en ready_for_review de Berel y Sky se regeneran con el comando revise existente antes de cualquier emisión`
- Rollback path: `revert PR + redeploy (Vercel + Job artifact-worker por el orquestador)`
- External coordination: `release por el control plane; Think no necesita deploy para el arreglo de fuente (1.2 es aditivo)`

### Security and access

- Auth/access gate: `sin cambio — lector público por token (TASK-1848) y lanes app/ecosystem existentes`
- Sensitive data posture: `reduce exposición: deja de publicar nombres de tablas y diagnósticos internos en una superficie pública por token`
- Error contract: `el gate falla en tests/CI; en runtime, una violación en una edición de cliente bloquea la emisión con error canónico y captureWithDomain('insights')`
- Abuse/rate-limit posture: `sin cambio`

### Runtime evidence

- Local checks: `tests focales del vocabulario, del planner (elegibilidad, selección, límites) y del gate sobre fixtures derivados de snapshots reales anonimizados`
- DB/runtime checks: `preview-edition.ts y build del modelo web local sobre EO-INS-000027 (Berel) y EO-INS-000029 (Sky) regenerados`
- Integration checks: `canary productivo por el lane ecosystem: crear enlace sobre la edición sintética emitida → leer modelo 1.2 → afirmar que ningún string contiene patrones de identificador → revocar`
- Reliability signals/logs: `captureWithDomain('insights') con tag insights_client_fit_violation`
- Production verification sequence: `release por el orquestador → canary 1.2 → regenerar ediciones internas → revisión del operador con TASK-1958`

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects.
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se completa al final. Esta task no crea tablas.
- [x] Migration/backfill/rollback posture is explicit and proportional to risk.
- [x] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [x] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

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

### Slice 1 — Vocabulario de presentación único

- `src/lib/efeonce-insights/presentation/vocabulary.ts`: `sourceLabelOf(fact)`, `unitLabelOf(unit)`, `asOfLabelOf(asOf, locale)`
  y `defaultReportTitle(modules, period, locale)`, todas desde `GH_INSIGHTS` (sin literales nuevos fuera del copy).
- `figure-slots.ts` (`sourcesOf`) y `report-mapper.ts` pasan a consumirlas; el PDF no cambia de resultado.
- `create-edition.ts` usa `defaultReportTitle` («Entrega creativa · agosto de 2026»).

### Slice 2 — Proyección web 1.2

- `buildInsightWebModel`: `source` = etiqueta humana, `unitLabel`, `asOfLabel` en hechos y figuras; `modelVersion` 1.2.
- Contrato `contracts/web-model.ts` documentado; el lector público no cambia de ruta ni de acceso.

### Slice 3 — Selección editorial y límites

- Claims de capítulo con rol: `finding` (cambios materiales, metas incumplidas o cumplidas con margen, lecturas de
  figura) y `backing` (resto, que el render muestra como tabla de respaldo). Umbral de materialidad declarado en el
  planner y documentado.
- `limitFor` por audiencia: cliente ⇒ una línea por tema en lenguaje del lector (qué no incluye el informe y desde
  cuándo estará), sin «la fuente no sirve»; interno ⇒ diagnóstico actual. Actual y comparación del mismo tema se
  funden en una línea.
- Dimensiones de puntaje en cero sin lectura pasan a `backing`, nunca a titular.

### Slice 4 — Elegibilidad de figuras

- Sin varianza (todos los valores iguales y sin comparación con cambio) ⇒ no hay gráfico; se emite una lectura con cifra
  clave («La marca aparece en 2 de 6 respuestas en cada uno de los cuatro motores»).
- Hecho con `numerator`/`denominator` ⇒ familia `waffle` (ya en el contrato de gráficos) o serie en proporción (`percent`), siempre con la etiqueta «n de m».
- Banda de magnitud: hechos cuyo máximo/mínimo supera el factor declarado no comparten eje lineal; se separan por métrica.
- Métricas de menor-es-mejor (posición media) ⇒ nunca barras desde cero; comparación como cifra con dirección
  («subió de #5,8 a #6,6: empeora») o familia permitida por `family-evidence-matrix.ts`.
- Titulares coherentes: «todos» sólo cuando la proporción es total.

### Slice 5 — Gate client-fit

- `presentation/client-fit-gate.ts`: recorre TODO string visible del modelo web y del plan de una edición cliente y falla
  ante patrones de identificador (punto entre identificadores snake_case, snake_case de `metricId`, códigos de `units`,
  fechas `YYYY-MM-DD`, nombres de función lectora), figuras no elegibles y límites con vocabulario interno.
- Se ejecuta en tests (fixtures derivados de snapshots reales) y en `plan-validation.ts` antes de permitir emitir una
  edición de cliente (error canónico, no warning).

## Out of Scope

- Jerarquía tipográfica, layout y componentes de Think y de los catálogos PDF → `TASK-1958`.
- Familias de gráfico nuevas y evidencia más rica → `TASK-1901`/`TASK-1902`.
- Interpretación, próximos pasos y redacción con IA → `TASK-1903`.
- Reescribir planes congelados o ediciones emitidas (prohibido por contrato).
- Biblioteca/portal del cliente → `TASK-1849`.

## Detailed Spec

**Patrones del gate (derivados, no literales de cliente):**

- `/\b[a-z][a-z0-9]*_[a-z0-9_]+\.[a-z][a-z0-9_]+\b/` (esquema.tabla), `/\(materialized\)/i`
- cualquier token igual a una clave de `GH_INSIGHTS.units` o a un `metricId` presente en el snapshot
- `/\b\d{4}-\d{2}-\d{2}\b/` fuera de campos de datos estructurados (`asOf`, `periodStart`)
- texto de límite que contenga una clave de `GH_INSIGHTS.rejections` en su forma interna

**Fixtures:** construidos desde los snapshots de `EO-INS-000027` y `EO-INS-000029` con nombres de organización
reemplazados; sirven para afirmar las cinco clases de defecto observadas el 2026-10-02 y quedan como regresión.

**Umbrales:** materialidad de cambio y factor de banda se declaran como constantes con comentario de por qué; su
valor inicial lo fija el agente en Discovery con los datos reales de Berel y Sky y queda registrado en la task.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 (la proyección consume el vocabulario).
- Slice 3 y Slice 4 pueden ir en paralelo tras Slice 1.
- Slice 5 (gate) se cierra al final y DEBE estar verde sobre los fixtures antes del release.
- Ninguna edición de cliente se emite hasta que esta task y `TASK-1958` estén en producción y el operador revise las
  ediciones regeneradas de Berel y Sky.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El cambio de reglas altera la composición de los PDF ya aprobados (fidelidad al canvas) | artifact-worker / catálogos | medium | correr `pnpm insights:canvas-fidelity` y `pnpm composer:visual-gate` antes del release; las reglas no tocan geometría de plantillas | gate visual rojo en CI |
| Think 1.x no reconoce 1.2 y rechaza el modelo por versión | Think (público) | low | 1.2 es minor aditivo; verificar que Think acepta minors del major 1 antes del release | canary productivo `read` ≠ 200 |
| El gate bloquea una emisión legítima por falso positivo | Insights emisión | medium | patrones derivados + fixtures; el error nombra el campo y el patrón; ajuste por PR, nunca bypass | `insights_client_fit_violation` en Sentry |
| Una edición interna regenerada pierde contenido que el operador ya había revisado | Insights datos | low | regenerar con `revise` crea versión nueva; la anterior queda intacta | revisión del operador |

### Feature flags / cutover

- Sin flag — el comportamiento actual publica identificadores internos en una superficie por token; mantenerlo detrás
  de un flag no tiene caso de uso. Cutover inmediato con el release; las ediciones congeladas no cambian.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR + release | ~30 min por el orquestador | si |
| Slice 2 | revert PR + release (Think 1.x sigue leyendo 1.1) | ~30 min | si |
| Slice 3 | revert PR + release; las ediciones nuevas vuelven al planner anterior | ~30 min | si |
| Slice 4 | revert PR + release | ~30 min | si |
| Slice 5 | revert PR + release | ~30 min | si |

### Production verification sequence

1. Tests focales + `pnpm local:check` + `pnpm insights:canvas-fidelity` verdes.
2. Staging: regenerar una edición interna de Berel y una de Sky; modelo 1.2 sin patrones prohibidos; PDF regenerado
   revisado.
3. Release por el control plane (Vercel + Job `artifact-worker`).
4. Canary productivo por el lane ecosystem sobre la edición sintética emitida: crear enlace → leer 1.2 → gate limpio →
   revocar.
5. Revisión del operador junto con `TASK-1958` antes de la primera emisión a cliente.

### Out-of-band coordination required

- Revisión del operador de las ediciones regeneradas de Berel y Sky (web y PDF) antes de emitir a cliente.
- Ningún sistema externo requiere cambios.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `web-model.ts` y `figure-slots.ts` consumen el mismo vocabulario de `src/lib/efeonce-insights/presentation/`; no queda traductor de fuente duplicado.
- [x] El modelo web 1.2 de las ediciones regeneradas de Berel y Sky no contiene ningún string que case con los patrones del gate.
- [x] `create-edition.ts` ya no produce títulos con módulos en código ni fechas ISO.
- [x] Los límites de una edición cliente no contienen texto de `GH_INSIGHTS.rejections` en forma interna y no repiten tema.
- [ ] Ningún gráfico emitido tiene todos sus valores iguales sin comparación con cambio; la presencia AEO se grafica como proporción con «n de m». *(La primera mitad está cumplida y probada. La segunda se resolvió distinto: «n de m» sólo comparte figura con el mismo total y el empate se dice en una frase — ver Delta 2026-10-02; queda sin tildar hasta que el operador acepte el cambio.)*
- [x] Posición media nunca se emite como barras desde cero.
- [x] El gate corre en CI sobre fixtures derivados y antes de emitir una edición cliente. *(Vive en `commands/lifecycle.ts::issueInsightEdition`, no en `plan-validation.ts`: necesita el título del informe y el modelo proyectado, que la validación del plan no conoce.)*
- [ ] Canary productivo 1.2 verde y registrado en el ledger de tiempos o en la task.
- [x] Skill `efeonce-insights` actualizada (ledger, contracts, lessons) y espejada a `.codex/`.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test src/lib/efeonce-insights`
- `pnpm insights:canvas-fidelity`
- `pnpm composer:visual-gate`
- Revisión local con `scripts/insights/preview-edition.ts` y el modelo web sobre Berel y Sky

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` registra el vocabulario de presentación, el modelo 1.2 y el gate client-fit.
- [ ] `TASK-1958` recibe un Delta con los campos nuevos disponibles.

## Delta 2026-10-02

- Implementado local en la misma sesión que la creó (commit `c56f62d09`). Decisión durante la implementación: los
  límites usan lenguaje del lector para TODA audiencia (no sólo cliente); el diagnóstico exacto sigue en
  `snapshot.rejections`, así que no se pierde información interna y se evita una bifurcación por audiencia en el texto
  sellado que comparten web y PDF.
- Waffle descartado para «n de m» por motor: exige partes que suman un total (composición) y la presencia por motor no lo
  es. La regla quedó: «n de m» sólo junto a otros del mismo total; el empate se dice en una frase.
- Los informes ya creados conservan su título técnico (no hay comando de renombre); la primera edición de cliente debe
  nacer en un informe nuevo o con `title` explícito.

## Follow-ups

- Llevar el gate client-fit a otros documentos públicos por token (Grader, X-Ray) si comparten la misma frontera.

## Open Questions

- Copy exacto de límites para cliente por tipo de rechazo: lo propone el agente con `greenhouse-ux-writing` y lo aprueba
  el operador antes del release.
- ¿Las dimensiones de puntaje en cero del Grader se explican en el informe (lectura) o sólo van al respaldo? Inicial:
  respaldo; `TASK-1903` puede promoverlas con interpretación.
