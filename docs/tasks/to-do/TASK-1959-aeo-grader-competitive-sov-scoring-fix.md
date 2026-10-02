# TASK-1959 — AEO Grader: participación frente a competencia medida bien (sin 100 contra nadie, menciones contra menciones)

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
- Epic: `EPIC-020`
- Status real: `Diseno; diagnóstico verificado 2026-10-02 por tres revisiones adversariales (código + base, sólo lectura)`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

La dimensión `competitive_sov` del AI Visibility Grader no mide participación frente a la competencia. Divide las
menciones de la marca por (menciones de la marca + cantidad de competidores DISTINTOS): sin competidores vale 100, y con
competidores sigue inflada porque compara unidades distintas. Pesa 15 % del puntaje global, que también queda inflado. Esta
task corrige la fórmula, declara la dimensión «no medible» cuando no hay competidores, versiona el score y define qué se
hace con los informes ya publicados.

## Why This Task Exists

Hallazgo del operador al revisar el informe de Insights de Berel (2026-10-02): «Claridad de entidad y participación
frente a competencia lideran con 100». Verificado con tres revisiones adversariales:

1. **Fórmula** (`src/lib/growth/ai-visibility/scoring/engine.ts:172-189`):
   `brandMentions = findings con brandMentioned='yes'` (cuenta de respuestas) y
   `competitorMentions = new Set(findings.flatMap(f => f.competitorsMentioned)).size` (cuenta de NOMBRES distintos).
   Con ≥1 mención de marca y 0 competidores ⇒ 100 exacto. Sin marca ni competidores ⇒ `null` (bien). No hay test del caso.
2. **Inflación aun con competidores:** 10 menciones de marca contra 1 competidor que aparece en las 10 respuestas ⇒ 90,9
   (lo correcto, menciones contra menciones, es 50). Medido: 15 de 33 puntajes con competidores salen ≥ 80 (LATAM 95,1
   con «58 contra 3»); Sky 2026-09-28 muestra 66,7 cuando por menciones sería ~30,8.
3. **Puntaje global** (`engine.ts:276-281`): promedio ponderado sobre dimensiones no nulas, pesos renormalizados. El
   exceso frente a excluir la dimensión es `(15/W)·(100−S)`; medido entre +9,8 y +13,3 puntos en los 10 casos.
4. **Alcance medido** (`greenhouse_growth`, 2026-10-02): 10 de 50 filas de `grader_scores` (10 runs) con competidores
   vacíos y la dimensión en 100. 9 tienen informe público (`grader_reports`); sólo 1 consta como enviado (Berel
   EO-GRUN-00049, 2026-09-04). Los demás publicados son Berel EO-GRUN-00047, Efeonce CO/MX/PE (EO-GRUN-00062/63/64) y
   cuatro runs de smoke.
5. **Por qué estaban vacíos:** el normalizer sólo reconoce competidores DECLARADOS (`normalization/normalizer.ts:172-190`);
   no los descubre en la respuesta. 7 de 10 no tenían lista (Berel ×2, Vercel, Banco de Chile) o corrían contra el set de
   un mercado nuevo creado sin miembros (Efeonce CO/MX/PE, aunque el perfil declara 4). «Sin competidores» casi siempre
   significa «nadie los declaró», no «la marca no tiene competencia».

Mitigación ya aplicada fuera del Grader: Insights (TASK-1957, `aeo_report_adapter_v2`) no emite la dimensión ni el
puntaje global cuando no hay competidores. Los competidores de Berel en México quedaron declarados el 2026-10-02
(set `gcset-da6edfa2…`, versión 2: Comex, Sherwin-Williams, Behr, Pinturas Osel, Pinturas Doal, Pinturas Prisa) y se
re-corrió EO-GRUN-00072. El Grader mismo sigue publicando la cifra inflada a cualquier organización sin lista.

## Goal

- `competitive_sov` = participación de menciones: menciones de marca ÷ (menciones de marca + menciones de competidores).
- Sin competidores declarados en el set del run ⇒ dimensión `null` («no medible»), fuera del global con pesos renormalizados.
- El cambio es una versión de score nueva: la tendencia nunca compara la versión nueva con la anterior.
- El informe y el preflight dicen cuándo falta declarar competidores, en vez de mostrar liderazgo.
- Decisión explícita y registrada sobre los informes ya publicados.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- Grader: arquitectura del AI Visibility Grader (EPIC-020/021) y la skill `seo-aeo` §07 (Share of Voice = menciones de
  la marca sobre menciones totales de marca + competidores).
- Multi-mercado: `TASK-1863` — los competidores viven en `grader_competitor_sets` por mercado y el run congela
  `matching_snapshot` + `competitor_set_id`. Esta task lee ese snapshot; no cambia el modelo de sets.
- Una sola definición de Share of Voice: `buildCompetitiveBenchmark` (`report/view-facts.ts`) ya cuenta menciones contra
  menciones; la dimensión del score debe coincidir con esa definición, no tener otra.

## Normative Docs

- `docs/architecture/EFEONCE_AEO_BRAND_NAMING_DECISION_V1.md`
- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` §14.11 (consumer: mitigación en el adapter)
- `docs/audits/seo/BEREL_AUDITORIA_SEO_AEO_AGOSTO_2026.md` (fila «Participación competitiva 100/100»)

## Dependencies & Impact

### Depends on

- `grader_scores.dimensions` (JSONB), `normalized_findings.competitors_mentioned`, `grader_runs.matching_snapshot`.
- `TASK-1863` en staging (sets de competidores por mercado). Si llega a producción antes, esta task lo asume; si no, el
  snapshot del perfil legado sigue siendo la fuente.

### Blocks / Impacts

- `TASK-1867` también propone versión nueva de score (`ai_visibility_score_v3`): coordinar el número; si se integran en
  el mismo release, una sola versión cubre ambos cambios.
- `TASK-1424`/`TASK-1425` (SoV por motor): deben usar la misma definición de mención.
- Insights (`aeo-adapter.ts`): cuando el score nuevo esté vivo, la exclusión del global en el adapter se puede retirar
  para runs de la versión nueva (condición de retiro de la mitigación de TASK-1957).
- Informe público del Grader, PDF del AI Visibility Report (`TASK-1938`) y tendencia (`report/trend.ts`).

### Files owned

- `src/lib/growth/ai-visibility/scoring/engine.ts`
- `src/lib/growth/ai-visibility/scoring/config.ts`
- `src/lib/growth/ai-visibility/scoring/__tests__/scoring.test.ts`
- `src/lib/growth/ai-visibility/report/trend.ts` (comparabilidad por versión)

## Current Repo State

### Already exists

- Fórmula vigente en `engine.ts:172-189`; `emptyDimension` en `engine.ts:90-94`; global en `engine.ts:274-283`.
- Pesos en `config.ts:42` (competitive_sov = 15, suma 100); `AI_VISIBILITY_SCORE_VERSION = 'ai_visibility_score_v2'`.
- Matching por palabra completa con alias (`markets/contracts.ts:48-59`) y command `setGraderMarketCompetitors`
  (`markets/commands.ts:165-201`, `PUT /api/admin/growth/ai-visibility/markets/[marketId]/competitors`).
- `report/trend.ts:80-95` ya suprime el delta de competitive_sov cuando el set de competidores no es comparable.

### Gap

- Ningún test cubre «marca sin competidores». La fórmula mezcla unidades.
- Ni el preflight del run ni el informe avisan que el set de competidores está vacío.
- La descripción de la dimensión en `config.ts:42` dice «declarados/detectados»; sólo se detectan los declarados.
- No existe un camino de operador (script/MCP/UI) para declarar competidores; hoy sólo el endpoint.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/growth/ai-visibility/scoring/**` (la puntuación corre en el `ops-worker` al drenar el run)
- Future candidate home: `domain-package`
- Boundary: `scoreGraderRun` (engine) es la única fuente del score; report, Insights y PDF lo leen persistido
- Server/browser split: `server-only`
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: `greenhouse_growth.grader_scores` (filas nuevas con la versión nueva; las previas no se tocan)
- Consumidores afectados: `informe público del Grader, portal /growth/aeo, PDF AI Visibility Report, Insights (aeo-adapter), tools MCP del Grader`
- Runtime target: `ops-worker (puntuación) + Vercel (lectura) en staging y producción`

### Contract surface

- Contrato existente a respetar: forma de `grader_scores.dimensions` y `overall_score`; `score_version`
- Contrato nuevo o modificado: misma forma; cambia el cálculo de `competitive_sov` y su nulidad; versión de score nueva
- Backward compatibility: `compatible` — las filas viejas conservan su versión; la tendencia trata el cambio de versión como no comparable
- Full API parity: `el score se calcula en el engine canónico; ningún consumer lo recalcula`

### Data model and invariants

- Entidades/tablas/views afectadas: `grader_scores` (append por versión), lectura de `normalized_findings` y `grader_runs.matching_snapshot`
- Invariantes que no se pueden romper:
  - `competitive_sov` = menciones de marca ÷ (menciones de marca + menciones de competidores), misma definición que `buildCompetitiveBenchmark`.
  - `Sin competidores en el set congelado del run ⇒ competitive_sov = null y fuera del global (pesos renormalizados).`
  - `Un score persistido nunca se reescribe; recomputar es una fila de la versión nueva.`
  - `La tendencia nunca compara versiones de score distintas.`
- Write-target allowlist: `sin tablas nuevas`
- Tenant/space boundary: `sin cambio: score por run de la organización dueña`
- Idempotency/concurrency: `recomputar el mismo run + versión reemplaza su fila (idempotencia existente de scoring/command.ts)`
- Audit/outbox/history: `sin eventos nuevos`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `enabled with rationale — la fórmula vieja publica liderazgo inexistente`
- Backfill plan: `recomputar con la versión nueva los runs con informe vigente (lista medida en Why) y regenerar sus informes públicos sólo si el operador lo decide (Open Questions)`
- Rollback path: `revert + redeploy del ops-worker; las filas de la versión nueva quedan como histórico`
- External coordination: `release por el control plane (ops-worker); coordinar número de versión con TASK-1867`

### Security and access

- Auth/access gate: `sin cambio`
- Sensitive data posture: `sin datos sensibles nuevos; nombres de competidores ya son públicos en el agregado`
- Error contract: `sin errores nuevos al cliente`
- Abuse/rate-limit posture: `sin cambio`

### Runtime evidence

- Local checks: `tests del engine: marca sin competidores ⇒ null; menciones contra menciones; global renormalizado; versión nueva`
- DB/runtime checks: `recomputar en staging EO-GRUN-00049 y EO-GRUN-00072 (Berel) y comparar dimensión y global contra el cálculo manual`
- Integration checks: `informe público regenerado de un run de prueba sin competidores muestra la dimensión como no medible`
- Reliability signals/logs: `captureWithDomain('growth') si un run puntúa sin set congelado`
- Production verification sequence: `release del ops-worker → recomputar un run conocido → leer grader_scores y el informe`

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se completa al final. Esta task no crea tablas.
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

### Slice 1 — Fórmula y nulidad en el engine

- `competitive_sov` = menciones de marca ÷ (menciones de marca + menciones de competidores), contadas por respuesta como
  en `buildCompetitiveBenchmark`; si el set congelado del run no tiene competidores ⇒ `null` con motivo
  «Sin competidores declarados para este mercado».
- Versión de score nueva (coordinada con TASK-1867); `config.ts:42` corrige la descripción («declarados»).
- Tests: marca sin competidores, competidor presente en todas las respuestas, ambos vacíos, renormalización del global.

### Slice 2 — Comparabilidad y lectura

- `report/trend.ts`: cambio de versión ⇒ no comparable (global y dimensión).
- Informe público y portal: la dimensión `null` se muestra como «No medible: declara competidores» en vez de un número.

### Slice 3 — Aviso en preflight y camino de operador

- El encolado de un run (`operator-run` y batch) devuelve una advertencia cuando el set del mercado está vacío.
- Camino de operador para declarar competidores sin `curl`: script `pnpm` sobre `setGraderMarketCompetitors` o tool MCP
  (Full API Parity), con alias y `reason` obligatorios.

### Slice 4 — Recomputo de informes vigentes (según la decisión del operador)

- Recomputar con la versión nueva los runs listados en «Why» y, si el operador lo decide, regenerar sus informes
  públicos y comunicar el cambio a Berel.

## Out of Scope

- Descubrir competidores automáticamente en las respuestas (extracción libre por LLM).
- Cambiar los pesos de las demás dimensiones.
- El modelo de sets por mercado (TASK-1863) y la evidencia íntegra de cada respuesta (TASK-1867).
- Retirar la mitigación de Insights: se retira cuando la versión nueva esté en producción, en su propia task o Delta.

## Detailed Spec

Inflación frente a excluir la dimensión, con S = promedio ponderado del resto y W = suma de pesos puntuados:
`(15/W)·(100−S)`. Poner la dimensión en 0 tampoco es correcto: deflacta `15·S/W`. La única forma honesta sin competidores
es `null` + renormalización, que es lo que el engine ya hace para cualquier dimensión sin dato.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 → Slice 2 en el mismo release (un score nuevo sin la comparabilidad compararía versiones). Slice 3 puede ir
después. Slice 4 sólo después de la decisión del operador.

### Risk matrix

| Riesgo | Sistema | Prob | Mitigación | Señal |
|---|---|---|---|---|
| Caída visible del puntaje en clientes | informe público, portal | Alta | versión nueva no comparable + nota de metodología | lectura del informe regenerado |
| Choque de versión con TASK-1867 | scoring | Media | coordinar número antes de mergear | review de `config.ts` |
| Consumer que asume competitive_sov numérico | PDF, Insights, MCP | Media | grep de consumers + tests con `null` | tests focales |

### Feature flags / cutover

Sin flag: la fórmula vieja publica un dato incorrecto. El cutover es la versión de score.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible |
|---|---|---|---|
| 1–2 | revert + redeploy ops-worker y Vercel | < 30 min | sí; las filas nuevas quedan como histórico |
| 3 | revert | < 15 min | sí |
| 4 | regenerar informes con la versión previa | < 1 h | sí |

### Production verification sequence

Release por el control plane → recomputar EO-GRUN-00072 (Berel, con competidores) y un run sin competidores → leer
`grader_scores` y el informe público → confirmar dimensión `null` y global renormalizado.

### Out-of-band coordination required

Decisión del operador sobre los informes publicados y la comunicación a Berel (Open Questions).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un run con marca mencionada y set de competidores vacío puntúa `competitive_sov = null` y el global no lo incluye.
- [ ] Con competidores, la dimensión coincide con el Share of Voice de `buildCompetitiveBenchmark` para el mismo run.
- [ ] La versión de score es nueva y la tendencia no compara versiones distintas.
- [ ] El informe público muestra la dimensión no medible con su causa, sin número.
- [ ] Encolar un run con set vacío devuelve una advertencia visible al operador.
- [ ] Existe un camino de operador gobernado (script o MCP) para declarar competidores.
- [ ] La decisión sobre los informes publicados está registrada y ejecutada.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test src/lib/growth/ai-visibility`
- Recomputo en staging de EO-GRUN-00049 y EO-GRUN-00072 contra cálculo manual

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] La mitigación de Insights (`aeo-adapter.ts`) recibe su condición de retiro con la versión nueva.

## Follow-ups

- Que un mercado nuevo proponga los competidores del perfil u otro mercado al crearse (hoy nace vacío, TASK-1863).

## Open Questions

- ¿Se regeneran los informes públicos ya publicados con la versión nueva, o sólo se marca la metodología vieja?
- ¿Se le comunica a Berel la corrección del informe enviado el 2026-09-04 (puntaje 39,4 → ~28,7 sin la dimensión)?
