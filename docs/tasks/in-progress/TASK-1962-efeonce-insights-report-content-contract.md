# TASK-1962 — Efeonce Insights: contrato de contenido del informe (8 preguntas) y su mantenimiento

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
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
- Backend impact: `reader`
- Epic: `EPIC-045`
- Status real: `Desplegado en producción desde release fe261ca2745f (2026-10-03), conservado en 36a73e7b7e19; Think main 0c5701a consume el modelo vigente 1.4. Criterios funcionales implementados; 116 pruebas focales PASS (2026-10-04). Candidata a cierre tras probar el contenido de una edición nueva en el runtime desplegado y registrar la revisión prevista; no existe plan congelado post-release en el readback acotado. No falta otro release de este contrato.`
- Rank: `TBD`
- Domain: `insights|growth`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El informe de Efeonce Insights responde bien «¿cómo nos fue?» y casi nada más: se lee como un tablero en prosa. Esta
task fija **qué debe decir el informe** como un contrato de ocho preguntas del cliente, declara para cada pregunta y
módulo qué evidencia la sostiene hoy (o por qué no: sin evidencia, bloqueada por política, necesita a una persona o al
agente redactor), y lo convierte en un **contrato de mantenimiento con gate**: agregar un dato nuevo es agregar un
productor y cambiar un veredicto, con test. Además lleva al API las decisiones de contenido que hoy deduce Think
(modelo web 1.3) y construye los productores deterministas que ya tienen evidencia capturada: qué explica el cambio
en SEO (consultas y páginas que más movieron los clics), qué se entregó (piezas completadas y throughput de ICO),
oportunidades medidas de la cola SEO como plan de acción y peticiones al cliente cuando falta una fuente.

## Why This Task Exists

Revisión del operador 2026-10-02 sobre los previews reales de Berel y Sky:

- **El informe no explica nada.** Dice «los clics bajaron 12,1 %» y nunca qué consultas o páginas lo explican, aunque
  `greenhouse_growth.seo_gsc_daily` tiene 412.955 filas de Berel por consulta × página × día (medido 2026-10-02).
- **El plan de acción, la petición, la decisión y la medición salen vacíos siempre**: `deterministic-planner.ts`
  fija `actions: []` y nadie produce `decision`/`measurement`/`ask` (los proyecta `sharing/web-model.ts` y los dibujan
  Think y el PDF, pero sin productor).
- **Think toma decisiones de contenido**: infiere el módulo de un hallazgo por la primera cifra que cita, busca el
  gráfico que lo respalda recorriendo capítulos, cuenta hallazgos para ocultar el tablero, y tiene sus propios nombres
  de módulo y frases que describen los datos (`efeonce-think/src/lib/insights-view.ts`, `src/lib/insights-copy.ts`).
  PDF, deck, Nexa y MCP tendrían que repetirlas: viola Full API Parity.
- **No hay contrato de mantenimiento por pregunta.** Existe uno por familia de gráfico
  (`editorial/family-evidence-matrix.ts`, 15 familias × evidencia, versionado), pero nada dice qué pregunta del
  cliente queda sin responder ni qué hace falta para responderla.
- **Sky Blog casi no tiene datos SEO** (medido 2026-10-02 sobre `seot-sky-blog-cl`): 0 filas de Search Console, 0
  snapshots de ranking, 0 competidores SEO, 1 auditoría técnica y 1 captura de backlinks. El contrato debe hacerlo
  visible como petición al cliente, no como silencio.

## Goal

- Un registro versionado `presentation/content-contract.ts` con las 8 preguntas, qué secciones del plan las
  responden y un veredicto por módulo (`producer_now | no_evidence | policy_blocked | needs_input | agent_task`) con su
  evidencia o su causa; un test que rompe si un productor emite algo que el registro no declara o si una pregunta
  `producer_now` no tiene productor.
- El modelo web 1.3 entrega resueltas las decisiones de contenido (módulo y evidencia de cada hallazgo, hallazgos
  esenciales por módulo, nombre del capítulo, notas de escala y de período anterior); Think deja de deducirlas.
- Una edición mensual de Berel responde «¿por qué?» (consultas y páginas que más movieron los clics), trae plan de
  acción desde la cola SEO, y una de Sky Diseño responde «¿qué entregamos?»; las fuentes no conectadas se convierten en
  petición al cliente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` — adapters sólo sobre readers dueños, snapshot sellado,
  ventana `[start,end)`, contrato editorial v2 (§6), matriz familia × evidencia.
- `docs/architecture/EFEONCE_INSIGHTS_PLATFORM_DECISION_V1.md` decisión 5 — la IA organiza y redacta desde evidencia
  permitida; nunca calcula KPIs, inventa causalidad, promete ni decide publicación.
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — GSC es verdad de primera parte; **la comparativa
  competitiva SEO NUNCA es client-facing (auditoría §7)**; la cola de trabajo (TASK-1700) es la autoridad de orden.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — la UI es cliente del contrato, no lo decide.

## Normative Docs

- `docs/tasks/to-do/TASK-1901-efeonce-insights-richer-evidence-for-chart-families.md` (evidencia rica: serie diaria,
  posiciones por keyword, historial del grader — no se duplica)
- `docs/tasks/to-do/TASK-1903-efeonce-insights-editorial-agent.md` (agente redactor de decisión, medición, petición y
  plan — esta task le deja una base determinista)
- `docs/tasks/in-progress/TASK-1957-efeonce-insights-client-fit-presentation-contract.md` (modelo 1.2,
  gate client-fit)

## Dependencies & Impact

### Depends on

- Modelo web 1.2 y gate client-fit de TASK-1957 (en código, sin release).
- Readers dueños existentes: `readSeoOverviewKpisForWindow` (`src/lib/growth/seo/overview/read-overview-kpis.ts`),
  `readSeoWorkQueue` (`src/lib/growth/seo/work-queue/reader.ts`), `readSpaceMetrics` (`src/lib/ico-engine/read-metrics.ts`).

### Blocks / Impacts

- `TASK-1903`: el agente parte de las secciones que esta task ya llena y del registro (qué preguntas son `agent_task`).
- `TASK-1901`: sus familias nuevas cambian veredictos del registro; su test de cobertura lo exige.
- `TASK-1958`: Think consume el modelo 1.3; la jerarquía visual sigue siendo suya.
- `TASK-1960`: el informe por servicio usa el registro para saber qué preguntas aplican a cada servicio.
- `TASK-1902`: la cascada «qué explica el cambio» necesita página PDF (follow-up).

### Files owned

- `src/lib/efeonce-insights/presentation/content-contract.ts` (nuevo)
- `src/lib/growth/seo/overview/read-window-movers.ts` (nuevo, reader dueño SEO)
- `src/lib/efeonce-insights/adapters/seo-adapter.ts`, `adapters/ico-adapter.ts`
- `src/lib/efeonce-insights/editorial/deterministic-planner.ts`, `editorial/editorial-v2.ts`
- `src/lib/efeonce-insights/contracts/web-model.ts`, `sharing/web-model.ts`
- `efeonce-think/src/lib/insights-view.ts`, `efeonce-think/src/lib/insights.ts` (consumer)

## Current Repo State

### Already exists

- Matriz familia × evidencia versionada (`editorial/family-evidence-matrix.ts`) y validación del plan
  (`editorial/plan-validation.ts`) que ya acepta `actions`, `decision`, `measurement`, `ask`.
- Think y los mappers PDF/deck ya dibujan plan de acción, decisión, medición y petición si llegan.
- Cola SEO priorizada con verbo, keyword, URL y clics incrementales estimados (banda 1).
- Snapshot ICO con `context.completedTasks` y métrica `throughput` en el registro.

### Gap

- Sin registro por pregunta ni gate de cobertura.
- Sin evidencia de causas, de trabajo entregado ni de oportunidades en el snapshot de Insights.
- Decisiones de contenido deducidas en Think.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/efeonce-insights/` y `src/lib/growth/seo/` (Vercel + ops-worker para recurrencias)
- Future candidate home: `domain-package`
- Boundary: Insights consume readers dueños (SEO, ICO); el registro y el modelo web son la única autoridad de contenido; Think sólo dibuja
- Server/browser split: `server-only` (registro browser-safe, sin I/O)
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: `snapshot de evidencia sellado de Insights (hechos nuevos de causas, entrega y oportunidades) y modelo web compartido`
- Consumidores afectados: `plan editorial, modelo web (Think), mappers PDF/deck, lanes y MCP de Insights`
- Runtime target: `production y staging (Vercel + ops-worker + Job artifact-worker)`

### Contract surface

- Contrato existente a respetar: `EvidenceFactV1`, `InsightWebModelV1` 1.2, `ChartSpecV1`, matriz familia × evidencia
- Contrato nuevo o modificado: `InsightContentContractV1` (registro), modelo web 1.3 (aditivo), reader `readSeoWindowMovers`, adapter SEO/ICO con hechos nuevos
- Backward compatibility: `compatible` — campos nuevos opcionales; snapshots sellados no cambian; Think tolera 1.2
- Full API parity: `toda decisión de contenido sale del modelo; Think, PDF, deck, Nexa y MCP la consumen igual`

### Data model and invariants

- Entidades/tablas/views afectadas: `ninguna tabla nueva; lectura de greenhouse_growth.seo_gsc_daily vía reader dueño`
- Invariantes que no se pueden romper:
  - `Toda cifra es un hecho citable del snapshot; ningún consumer calcula ni infiere.`
  - `Las causas son descomposición medida (qué consultas cambiaron), nunca causalidad afirmada.`
  - `Nada competitivo SEO llega al cliente (auditoría §7): ni competidores, ni gap, ni ítems de origen competidor.`
  - `Una pregunta sin evidencia se declara; nunca se rellena con texto genérico.`
  - `El registro y el productor cambian juntos; el test lo exige.`
- Write-target allowlist: `sin cambios`
- Tenant/space boundary: `organización autorizada; target SEO resuelto server-side`
- Idempotency/concurrency: `determinista sobre la ventana sellada`
- Audit/outbox/history: `sin eventos nuevos`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `enabled with rationale — contenido aditivo detrás del contrato editorial v2 ya ON`
- Backfill plan: `ninguno; ediciones nuevas o revisadas`
- Rollback path: `revert + redeploy`
- External coordination: `release por el control plane junto con TASK-1957; push de Think (deploy automático) después del release de Greenhouse`

### Security and access

- Auth/access gate: `sin cambio (módulo insights_v1 + capability + audiencia)`
- Sensitive data posture: `consultas de Search Console del propio cliente (dato suyo); nada competitivo SEO`
- Error contract: `sin cambio`
- Abuse/rate-limit posture: `sin cambio`

### Runtime evidence

- Local checks: `tests del registro, reader, adapters, planner y modelo web; pnpm vitest run src/lib/efeonce-insights`
- DB/runtime checks: `reader de causas contra PG real (Berel, ventana septiembre); preview Berel y Sky contra la base compartida`
- Integration checks: `modelo 1.3 en Think local con Berel y Sky; gate client-fit sin violaciones`
- Reliability signals/logs: `captureWithDomain('insights')`
- Production verification sequence: `release → borrador Berel y Sky → revisión del operador`

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects.
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [x] Allowlist de tablas nuevas: no aplica; este contrato no introduce tablas de escritura del dominio. La migración de categoría del Grader es de su dominio dueño, no un store de Insights.
- [x] Migration/backfill/rollback posture is explicit and proportional to risk.
- [x] Runtime or DB evidence is listed for any change beyond docs/tooling. — reader de causas ejercitado contra PG real (Berel, 0,5 s, suma = total de clics del informe).
- [x] Errores, aislamiento y proyección pública conservan el contrato canónico; revisión de `commands/lifecycle.ts`, `sharing/web-model.ts` y readers dueños, con 116 pruebas focales PASS el 2026-10-04. El smoke productivo sigue pendiente y no se infiere de estas pruebas.

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

### Slice 1 — Registro de contenido y gate de mantenimiento

- `presentation/content-contract.ts`: las 8 preguntas (resultado, causas, competencia, trabajo entregado,
  recomendaciones, peticiones, medición, límites), sus secciones del plan, veredicto por módulo con evidencia o causa,
  versión. Test de cobertura contra los productores y la matriz familia × evidencia.
- Arquitectura §15 «Contrato de contenido» + skill `efeonce-insights` (cómo agregar un dato).

### Slice 2 — Decisiones de contenido en el API (modelo web 1.3)

- Cada hallazgo y esencial lleva `module` y `evidence {chapterId, chartId}`; el modelo declara `essentialsByModule`
  (cuenta por módulo, incluido 0); el capítulo trae `label`; la figura trae `note` (escala propia) y el hecho
  `priorLabel` cuando tiene período anterior. Think consume y borra sus deducciones y textos de contenido.

### Slice 3 — Causas SEO medidas (pregunta 2)

- Reader dueño `readSeoWindowMovers(organizationId, {window, previous, dimension: 'query'|'page', limit})` sobre
  `seo_gsc_daily`, sin texto anónimo, con las mismas reglas de ventana que `readSeoOverviewKpisForWindow`.
- Adapter SEO: hechos de clics actual/anterior por consulta y por página que más cambiaron; planner: figura
  `bar_grouped` y hallazgo «la consulta/página que más cambió», con lenguaje de descomposición, no de causa.

### Slice 4 — Trabajo entregado ICO (pregunta 4)

- Adapter ICO: hechos de piezas completadas y throughput por space y mes desde el snapshot existente.

### Slice 5 — Plan de acción y peticiones deterministas (preguntas 5 y 6)

- Acciones desde la cola SEO (sólo orígenes propios: Search Console, consolidación, objetivos declarados; nunca
  origen competidor), con verbo, keyword, URL y evidencia citada; máximo 5.
- Petición al cliente cuando una fuente esperada está `not_connected` (p. ej. Search Console del blog de Sky).

### Slice 6 — Consumer Think y verificación

- Think lee el modelo 1.3; preview Berel y Sky revisado; delta a TASK-1903/1901/1958/1960/1902.

## Out of Scope

- Competencia SEO hacia el cliente (bloqueada por auditoría §7; decisión del operador).
- Metas pactadas por cliente para SEO/AEO (pregunta 7): necesita modelo de datos propio → follow-up.
- Registro de trabajo entregado de SEO/contenido (posts, optimizaciones, insumos entregados) → follow-up.
- Redacción de decisión/medición y plan narrativo por agente (TASK-1903).
- Serie diaria, mapa de calor y medidor (TASK-1901/1902). Cascada en PDF (follow-up de catálogo).
- Cambiar fórmulas del Grader (TASK-1959) o su multimercado en Insights (TASK-1961).

## Detailed Spec

Las 8 preguntas y su respuesta esperada:

| # | Pregunta del cliente | Secciones del plan | Productor determinista de esta task |
|---|---|---|---|
| 1 | ¿Cómo nos fue? | resumen, esenciales, capítulos | existente |
| 2 | ¿Por qué cambió? | capítulo (figura de causas + hallazgo) | SEO: consultas y páginas (Slice 3) |
| 3 | ¿Cómo estamos frente a la competencia? | capítulo | AEO existente; SEO `policy_blocked` |
| 4 | ¿Qué hicimos este mes? | capítulo | ICO: piezas completadas, throughput (Slice 4) |
| 5 | ¿Qué recomendamos? | `actions` | SEO: cola propia (Slice 5); narrativa → TASK-1903 |
| 6 | ¿Qué necesitamos de ustedes? | `ask` | fuentes no conectadas (Slice 5); resto → persona en el gate |
| 7 | ¿Cómo lo mediremos? | `measurement` | ICO metas oficiales; SEO/AEO `needs_input` (metas pactadas) |
| 8 | ¿Qué no podemos afirmar? | `limits` | existente |

Regla de mantenimiento: un dato nuevo = hecho del adapter dueño + productor del planner + fila del registro (y de la
matriz de familias si dibuja) + test, en el mismo cambio, subiendo la versión del registro.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

1 → 2 → 3 → 4 → 5 → 6. Think (Slice 6) sólo después de que el modelo 1.3 esté en el API; Think tolera modelos 1.2.

### Risk matrix

| Riesgo | Sistema | Prob | Mitigación | Señal |
|---|---|---|---|---|
| Afirmar causalidad («bajó por X») | plan/IA | Media | lenguaje de descomposición + validación de cifras de la autoría IA | tests de redacción |
| Fuga competitiva SEO al cliente | adapter | Baja | allowlist de orígenes de la cola + test | test de orígenes |
| Consultas sensibles en el informe | adapter | Baja | dato del propio cliente; revisión humana antes de emitir | gate de emisión |
| Think 1.2 contra modelo 1.3 | Think | Baja | campos opcionales; fallback | preview |

### Feature flags / cutover

Sin flag propio: aditivo bajo `INSIGHTS_EDITORIAL_V2_ENABLED` (ON). La cola SEO respeta su propio flag.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible |
|---|---|---|---|
| 1–5 | revert + redeploy | < 30 min | sí |
| 6 | revert en Think + deploy | < 10 min | sí |

### Production verification sequence

Release de Greenhouse → push de Think → borrador Berel y Sky → revisión del operador antes de compartir.

### Out-of-band coordination required

Sky Blog: conectar Search Console del blog, set de keywords y competidores (operación de la cuenta, no código).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] El registro declara las 8 preguntas con veredicto por módulo y el test de cobertura falla si un productor no está declarado. — `presentation/content-contract.test.ts` (6 pruebas) + `expectContentContract` en `adapters/adapters.test.ts`; atrapó evidencias «ídem» al escribirlo.
- [x] El modelo web 1.3 trae módulo y evidencia por hallazgo, esenciales por módulo, nombre de capítulo y notas; Think no deduce ninguno. — `sharing.test.ts` «1.3 …»; Think `insights-view.ts` sin `findEvidence` ni inferencia de módulo, filtro por `essentialsByModule` (verificado en navegador: Berel `{seo:3, aeo:0}`, tablero oculto con «Respuestas de IA»). Queda en Think el pie del titular (tipografía, delta a TASK-1958).
- [x] Una edición de Berel trae la figura de consultas y páginas que más movieron los clics con su hallazgo. — preview contra la base: «La consulta que más cambió fue «berel»: bajó de 1.933 a 1.579 clics (-18,3 %)»; PDF A4 local 16 páginas sin rechazos (figura y tabla de causas).
- [x] Una edición de Sky Diseño trae piezas completadas por space. — preview: «Las piezas entregadas subieron de 256 a 328 (+28,1 %)».
- [x] El plan de acción de Berel sale de la cola SEO sin ningún ítem de origen competidor. — reader pedido con `origins: [gsc_striking_distance, consolidation, declared_target]` (test); preview Berel con 5 acciones `gsc_striking_distance`.
- [x] Una fuente `not_connected` produce una petición al cliente. — Search Console sin conectar (Sky Blog, `seot-sky-blog-cl`) ⇒ `ask` visible en Think; lo interno (Grader, spaces) no se pide (test).
- [x] Gate client-fit sin violaciones en Berel y Sky. — preview: `gate berel {}`, `gate sky {}`, `gate sky-blog {}`; validación del plan sin violaciones.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm vitest run src/lib/efeonce-insights src/lib/growth/seo`
- Preview Berel y Sky en Think local revisado por el operador

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] Skill `efeonce-insights` actualizada y espejada a `.codex/`.

## Delta 2026-10-02 — ejecución

- Hallazgos durante la ejecución: los catálogos PDF no dibujan el plan de acción ni la petición (sólo Think); la
  lectura genérica de barras elegía el mayor cambio relativo y contradecía el hallazgo de causas (se corrigió con una
  lectura propia del productor); Sky Blog no tiene Search Console conectado.
- Verificación local: `pnpm vitest run src/lib/efeonce-insights` 298 verdes; `pnpm typecheck` y eslint limpios;
  Think `astro check` 0 errores y `test:insights` 18 verdes; previews Berel, Sky Diseño y Sky Blog contra la base
  compartida; PDF A4 y deck de Berel y Sky renderizados localmente sin rechazos.
- Sin probar en runtime desplegado (no hubo release).
- Pedido del operador («todos son gráficos de barra y tenemos 15 familias»): línea semanal de clics, cascada de
  consultas y waffles de tono y tipo de fuente (commit `d6d4b7d19`, matriz v2); los mappers PDF omiten a propósito
  las familias sin página. Berel pasó de 2 familias a 5 en el informe web.
- Grader de Berel corregido de una vez (pedido del operador): set de preguntas v3 del rubro activo
  (`gps-c168f7a0-5b15-461d-8491-69f20dbe12cf`), alias «Berel» y «Pinturas Berel», categoría «Pinturas y
  recubrimientos» (`sector:paints_coatings`, override auditado), command + rutas API + CLI y migración
  `20261002204831850` aplicada (commits `e36ea7e5c`, `d2e8fa701`). El análisis mensual del 03/10 08:00 ya usa las
  preguntas nuevas.
- Ampliación pedida por el operador («Sky puede tener al menos ya lo que arroja el Grader»): sitios citados, tipo de
  fuente, tono y Share of Voice en una frase, del mismo informe del Grader (commit `bccbe504f`,
  `content_contract_v2`). Preview Sky Blog con septiembre completo (corridas del 28/09): 7 hallazgos de IA, gate y
  validación sin violaciones; PDF de Berel 20 páginas y deck 16 láminas sin rechazos. Multimercado de Sky sigue en
  TASK-1961 (hoy sólo Chile, mercado principal).

## Follow-ups

- Metas pactadas por cliente para SEO/AEO (pregunta 7).
- Registro de trabajo entregado por servicio (pregunta 4 en SEO/contenido).
- Página PDF/deck del plan de acción y la petición (hoy sólo Think) y de cascada para «qué explica el cambio» (TASK-1958/TASK-1902).
- Exponer `contentCoverageOf` en la revisión interna y al agente redactor (TASK-1903).
- Decisión del operador sobre competencia SEO en el informe al cliente (auditoría §7).

## Open Questions

- ¿Se expone competencia SEO al cliente en el informe (hoy prohibido por auditoría §7)? Default: no.

## Delta 2026-10-02 — GA4 en el informe (`content_contract_v4`)

- GA4 entra al Search Visibility 360 del informe: visitas orgánicas al sitio y con interacción (SEO) y visitas desde
  asistentes de IA, en total y por asistente (AEO), desde `readGa4Analytics` (`adapters/ga4-site-facts.ts`). GA4 sin
  conectar es límite «falta conectar la fuente» y petición al cliente. La lectura semanal ya no compara una semana con
  el bloque corto de fin de mes.
- Verificado con datos reales de Grupo Berel (septiembre contra agosto, sin crear edición): 43.949 visitas orgánicas
  (−13,5 %), 1.686 visitas desde IA (+23,4 %), ChatGPT 1.648 de 1.686; plan válido (`validateEditorialPlan` sin errores).
- Rollout: Vercel staging/Production ya tienen flag y OAuth (TASK-1284); `ops-worker` lo declara en `deploy.sh` y
  necesita su deploy para las ediciones programadas. Release a producción pendiente junto con el resto de TASK-1962.


## Delta 2026-10-04 — auditoría de cierre

- Estado y blockers contrastados con releases y código publicado; evidencia y límites en [2026-10-04-epic-045-closure-review.md](../../audits/insights/2026-10-04-epic-045-closure-review.md).
- Se conserva `in-progress`: el despliegue y la activación de flags no sustituyen los criterios pendientes de esta task.
- Los siete criterios funcionales siguen cumplidos. El siguiente paso es una edición nueva interna en producción, lectura del modelo 1.4 y revisión prevista antes de emitir/compartir. No se creó ni emitió una edición en esta auditoría.
