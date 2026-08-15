# TASK-1702 — Señales deterministas de citabilidad + recomendación anclada a URL

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
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
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|seo|aeo`
- Blocked by: `TASK-1701` · ⚠️ **coordinar con `TASK-1269` (in-progress, `Status real: Avanzada`)**: reclama los mismos `fix-it/{generators,contracts}.ts`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Sobre los hechos de contenido de `TASK-1701` se construyen las **señales deterministas de
citabilidad** —todas extraídas del HTML, cero tokens— y con ellas la recomendación **deja de nacer
sin destino**: el content brief pasa de decir *"URL destino: pendiente de definir"* a nombrar la URL
concreta que hay que tocar y por qué. Cierra las brechas A1 (no existe capa de citabilidad) y A2 (la
recomendación nunca aterriza en una URL) del eje AEO.

El invariante que define la task: **las señales que PUNTÚAN son deterministas; el LLM sólo produce
el juicio cualitativo que acompaña y NUNCA mueve el número.**

## Why This Task Exists

Dos huecos que se cierran juntos porque son el mismo hueco visto desde dos puntas.

**A1 — el módulo mide el envase, nunca el texto.** No existe una sola señal sobre si un H2 es una
pregunta del fan-out, si la respuesta bajo ese H2 es autocontenida, si hay densidad de datos con
unidad, si hay enlaces salientes a fuentes, si hay citas textuales con atribución, si hay tabla o
lista dentro del main, si hay `dateModified`, si hay byline de autor. La auditoría del 2026-08-15 la
declara la palanca con **mejor evidencia primaria** del oficio, y hoy está entera sin construir.

**A2 — la recomendación nunca aterriza.** Verificado en el repo: `src/lib/growth/ai-visibility/
fix-it/generators.ts:207` escribe literalmente `- URL destino: pendiente de definir.` dentro del
content brief, y el JSON-LD generado nace con `pendingFields` que incluyen `website_url` y
`high_value_content_urls` (`generators.ts:66-102`, `:182`). El artefacto que le entregamos al cliente
le dice qué escribir pero no dónde. Un plan sin destino no es un plan: es una opinión.

**Por qué las señales que puntúan tienen que ser deterministas.** El motor garantiza hoy que mismo
`score_version` + mismos findings = mismo score. Esa reproducibilidad es lo que permite defender el
reporte ante un cliente que pregunta por qué bajó. Un score de citabilidad producido por un LLM
rompe la reproducibilidad, y con ella la defensa. Y no hace falta romperla: **las tácticas con mejor
evidencia se miden extrayendo estructura del HTML, con cero tokens.**

## Goal

- Un conjunto cerrado y versionado de señales deterministas de citabilidad, cada una derivada de
  `analyzeUrlContent` y con su regla de extracción declarada.
- El número —el que puntúa, el que se le muestra al cliente— sale **sólo** de las señales
  deterministas, bajo un `citability_signal_version` explícito.
- El juicio cualitativo del LLM acompaña la señal como texto y **queda estructuralmente impedido de
  mover el número** (no entra en la fórmula, y hay un test que lo prueba).
- La recomendación nace con `targetUrl` real: el content brief y el resto de artefactos fix-it dejan
  de emitir "URL destino: pendiente de definir" salvo cuando honestamente no hay candidata, y en ese
  caso lo dicen con motivo.

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
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_AI_VISIBILITY_GRADER_CALIBRATION_V1.md`
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (§1.1 boundary SEO↔AEO)
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md`

Reglas obligatorias:

- **Determinismo del número.** Mismo `citability_signal_version` + mismo HTML = mismo resultado,
  siempre. Ninguna señal que puntúe puede depender de la salida de un modelo.
- **El LLM acompaña, no decide.** Su salida vive en un campo aparte, tipado como texto/juicio, y no
  es input de ninguna fórmula. El test que lo prueba es criterio de aceptación bloqueante.
- **Sin fusión de scores.** Estas señales no se promedian con el score del grader ni con el eje SEO.
  Un `score_version` compartido haría que recalibrar un motor invalidara reportes ya entregados del
  otro: puerta de una sola dirección.
- **Boundary §1.1 SEO↔AEO.** Ningún JOIN, VIEW ni FK entre `seo_*` y `grader_*`. El cruce, si hace
  falta, es en memoria por `organization_id`.
- **Sólo el sitio del sujeto.** La guarda cross-host de `safe-fetch.ts:72` se hereda intacta.
- **Honestidad de la evidencia en el copy.** Ver `## Detailed Spec` → "Nota de oficio": lo que
  tiene evidencia primaria y lo que es craft nuestro no se presentan igual.

## Normative Docs

- `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md` (§3.2 A1/A2, §4
  "Las tácticas con mejor evidencia son deterministas", §7 nota de honestidad técnica)
- `docs/tasks/to-do/TASK-1701-growth-analyze-url-content-facts-no-score.md` (shape de entrada)
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `.claude/rules/growth-seo.md`

## Dependencies & Impact

### Depends on

- `TASK-1701` — `analyzeUrlContent` y el shape `{ fetch, structure, readable, prose? }`. **Bloqueante
  duro**: sin los hechos no hay señal que derivar.
- 🔴 **`TASK-1269` (in-progress, `Status real: Avanzada`) — colisión de propiedad, detectada el
  2026-08-15 por la verificación adversarial.** Declara como suyos y **nuevos** los mismos
  `src/lib/growth/ai-visibility/fix-it/generators.ts` y `fix-it/contracts.ts` que esta task lista en
  `Files owned`. Dos dueños del mismo archivo, uno **en vuelo**. Antes del Slice 1 hay que acordar
  con su dueña quién los toca primero y en qué orden mergean — o esta task espera a que 1269 cierre.
  Es exactamente el chequeo de impacto cruzado que CLAUDE.md exige y que el barrido inicial no hizo.
- `src/lib/growth/ai-visibility/fix-it/generators.ts` — generadores de artefactos fix-it, donde vive
  la línea `URL destino: pendiente de definir` (verificado, `:207`) y el mecanismo de
  `pendingFields` (verificado, `contracts.ts:45`).
- `src/lib/growth/ai-visibility/scoring/` — motor de scoring versionado del grader. Se respeta su
  contrato de reproducibilidad; no se modifica su fórmula desde acá.
- `src/lib/growth/site-substrate/` — creado por `TASK-1701`.

### Blocks / Impacts

- El content brief y el JSON-LD de fix-it cambian de contenido: cualquier artefacto ya entregado a
  un cliente con la línea vieja queda desalineado con lo nuevo. Se declara en el rollout.
- `TASK-1672` / `TASK-1673` (artefacto de auditoría y su envío) heredan la recomendación anclada:
  el documento deja de recomendar al aire.
- `TASK-1669` (plan diario agéntico) consume estas señales como insumo de recomendación; **no debe
  construir su propio ordenamiento** sobre ellas.
- `EPIC-022` — cierra A1 y A2.

### Files owned

- `src/lib/growth/ai-visibility/citability/`
- `src/lib/growth/ai-visibility/citability/signals.ts`
- `src/lib/growth/ai-visibility/citability/contracts.ts`
- `src/lib/growth/ai-visibility/citability/__tests__/`
- `src/lib/growth/ai-visibility/fix-it/generators.ts`
- `src/lib/growth/ai-visibility/fix-it/contracts.ts`
- `src/mcp/greenhouse/tools.ts` (tool read-only de las señales)
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/documentation/` y `docs/manual-de-uso/` — delta proporcional

## Current Repo State

### Already exists

- `src/lib/growth/ai-visibility/fix-it/generators.ts` — genera content brief, JSON-LD y demás
  artefactos. En `:207` escribe `- URL destino: pendiente de definir.`; en `:66-102` arma el JSON-LD
  con `pendingFields` (`website_url`, `logo_url`, `same_as_profiles`, `service_type`); en `:182`
  declara `high_value_content_urls` como pendiente.
- `src/lib/growth/ai-visibility/fix-it/contracts.ts:45` — `pendingFields: string[]`, el mecanismo
  honesto que hoy sostiene el hueco.
- `src/lib/growth/ai-visibility/scoring/` — motor con `score_version` y reproducibilidad garantizada.
- `src/lib/growth/ai-visibility/probes/html.ts` — `extractJsonLdBlocks` y parseo tolerante, base de
  varias señales.
- Cápsula de respuesta: el fix-it ya la escribe ("40-60 palabras"), como craft, no como señal medida.

### Gap

- No existe `src/lib/growth/ai-visibility/citability/` ni ninguna señal de citabilidad de contenido.
- No existe `citability_signal_version` ni ninguna forma de versionar estas señales.
- No existe ningún resolver que proponga una `targetUrl` para una recomendación.
- No existe test que impida que la salida de un LLM entre a una fórmula de scoring.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/growth/ai-visibility/citability/` en el portal Next.js, server-side, con el
  cómputo disponible también desde el ops-worker
- Future candidate home: `domain-package`
- Boundary: reader canónico de señales (`computeCitabilitySignals`) + resolver de destino
  (`resolveRecommendationTargetUrl`), expuestos por el barrel del dominio AEO
  (`src/lib/growth/ai-visibility/index.ts`). Consumers autorizados: el motor de fix-it, el reporte,
  la tool MCP read-only y el ops-worker
- Server/browser split: `server-only`. El cómputo, el fetch heredado del sustrato y el cliente LLM
  jamás cruzan al bundle de browser
- Build impact: none. Sin dependencias nuevas; el juicio cualitativo entra por el cliente canónico
  de `src/lib/ai/`
- Extraction blocker: none. El cómputo de señales es puro sobre los hechos del sustrato; la única
  atadura es el contrato de versionado del scoring del grader, que se respeta sin acoplarse a él

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: los hechos de `analyzeUrlContent` (que a su vez no persisten). La señal
  derivada es una función pura de esos hechos más la config versionada; la config versionada **sí**
  es fuente de verdad y vive en código
- Consumidores afectados: motor de fix-it (`generators.ts`), reporte AEO, MCP read-only, ops-worker,
  y a futuro el `priority_score` del eje SEO
- Runtime target: `local`, `staging`, `production`, `worker`

### Contract surface

- Contrato existente a respetar: `src/lib/growth/ai-visibility/fix-it/contracts.ts` (incluido
  `pendingFields`), el contrato de reproducibilidad de `scoring/`, y el shape de `TASK-1701`
- Contrato nuevo o modificado: `computeCitabilitySignals(facts, config)` →
  `{ signals[], citabilitySignalVersion, qualitativeNote? }`;
  `resolveRecommendationTargetUrl(...)` → `{ targetUrl, confidence, reason }`;
  campo `targetUrl` en el artefacto de content brief
- Backward compatibility: `gated`. El cambio de contenido del content brief es visible para el
  cliente, así que entra detrás de flag y se declara en el rollout. El shape del artefacto se
  extiende de forma aditiva; `pendingFields` sigue existiendo para el caso honesto de "no hay
  candidata"
- Full API parity: el cómputo vive en `src/lib/growth/ai-visibility/citability/**`; ningún
  componente calcula señales. Read expuesto como reader canónico + tool MCP read-only en el MISMO PR

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna nueva en V1. Si un slice necesitara persistir la señal
  para trayectoria, se declara como task aparte con su propia migración
- Invariantes que no se pueden romper:
  - `Determinismo`: mismo `citability_signal_version` + mismo HTML = mismo resultado
  - `El LLM no puntúa`: su salida no es input de ninguna fórmula, verificado por test
  - `Versionado obligatorio`: cambiar un peso, un umbral o el conjunto de señales **exige** bumpear
    `citability_signal_version`; nunca se muta en silencio
  - `Sin fusión`: estas señales no se promedian con el score del grader ni con el eje SEO
  - `Honestidad de la ausencia`: una señal que no se pudo evaluar es `unavailable` con motivo,
    jamás 0
  - `targetUrl honesta`: si no hay candidata defendible, se dice con motivo; no se inventa una URL
- Tenant/space boundary: se hereda del caller (`organizationId` del perfil del grader o del target
  SEO). El módulo no deriva tenant por su cuenta
- Idempotency/concurrency: cómputo puro y sin estado. El juicio cualitativo del LLM es no
  determinista **por diseño** y por eso vive fuera del número
- Audit/outbox/history: `none` en V1 con razón — no se persiste. El gasto del juicio cualitativo lo
  registra el gate de tokens del sustrato

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `flag OFF` para el cambio visible del content brief (la línea "URL destino"). El
  cómputo de señales puede correr en shadow antes del flip
- Backfill plan: none. Los artefactos ya entregados a clientes **no se reescriben**; un artefacto
  entregado es un hecho histórico
- Rollback path: `flag off` (vuelve el content brief anterior) + `revert PR`
- External coordination: aviso al operador comercial antes del flip, porque el contenido del
  artefacto que se le manda al cliente cambia

### Security and access

- Auth/access gate: `server-only` + sesión/capability del dominio en la frontera HTTP. La tool MCP
  va por el lane ecosystem read-only bajo el scope de lectura ya existente
- Sensitive data posture: `no sensitive data`. HTML público del sitio del sujeto
- Error contract: `canonicalErrorResponse` en la frontera + `captureWithDomain`. Una señal que falla
  degrada a `unavailable` con motivo; no tumba el cómputo de las demás
- Abuse/rate-limit posture: hereda el techo de tokens per-org y el circuit breaker del cliente LLM
  para el juicio cualitativo. Las señales deterministas no tienen costo variable

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/ai-visibility/citability src/lib/growth/ai-visibility/fix-it`
- DB/runtime checks: no aplica por diseño (sin persistencia). Se sustituye por un golden set de
  fixtures HTML con resultado esperado, y un test de reproducibilidad que corre la misma entrada dos
  veces y exige igualdad byte a byte del número
- Integration checks: generación real de un content brief contra un perfil de staging, verificando
  que `targetUrl` aparece resuelta y que el JSON-LD ya no la lista como pendiente sin motivo
- Reliability signals/logs: reusa la observabilidad del dominio AEO. No se crea signal nueva
- Production verification sequence: shadow del cómputo → verificación del golden set → flip del
  cambio visible del brief con aviso al operador comercial

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] **Lógica en el primitive, no en la UI.** Señales y resolver viven en
      `src/lib/growth/ai-visibility/citability/**`.
- [ ] **Modelada como recurso/reader**: "las señales de citabilidad de una URL" y "el destino de una
      recomendación".
- [ ] **Read expuesto como reader canónico** + tool MCP read-only en el mismo PR.
- [ ] **Capability + grant en el MISMO PR** si la ruta HTTP gatea por capability nueva; si reusa una
      del dominio AEO, declararlo explícito.
- [ ] **Camino programático declarado:** reader canónico + `api/platform/ecosystem` read-only.
- [ ] **Sin write nuevo**; el artefacto fix-it sigue su camino actual. Declararlo, no omitirlo.
- [ ] **Un primitive, muchos consumers:** fix-it, reporte, MCP y ops-worker consumen el MISMO
      cómputo.
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

### Slice 1 — Señales deterministas versionadas

- `citability/signals.ts` con el conjunto cerrado de señales, cada una con su regla de extracción
  declarada en el propio código.
- `citability_signal_version` en columna del resultado, no como constante suelta.
- Golden set de fixtures HTML con resultado esperado por señal, incluyendo HTML malformado, página
  sin `main`, página sin headings y página con JSON-LD roto.
- Test de reproducibilidad: dos corridas sobre la misma entrada dan el mismo número, byte a byte.

### Slice 2 — El juicio cualitativo, estructuralmente separado

- Campo `qualitativeNote` producido por LLM sobre `readable.text`, gated por el presupuesto de
  tokens per-org heredado del sustrato.
- **Test bloqueante:** con `qualitativeNote` presente y con `qualitativeNote` ausente, el número es
  idéntico. Si alguien la conecta a la fórmula, el test rompe.
- Sin autorización de gasto: `qualitativeNote: undefined` con motivo, cero tokens.

### Slice 3 — La recomendación aterriza

- `resolveRecommendationTargetUrl(...)` devuelve `{ targetUrl, confidence, reason }` a partir de las
  señales y del inventario de URLs disponible.
- `generators.ts` deja de emitir `- URL destino: pendiente de definir.` cuando hay candidata; cuando
  no la hay, emite el motivo concreto y mantiene el ítem en `pendingFields`.
- El JSON-LD deja de listar `website_url`/`high_value_content_urls` como pendientes cuando el
  resolver los resolvió.
- Cambio visible detrás de flag.

### Slice 4 — Superficie programática + documentación

- Tool MCP read-only de las señales, registrada en el mismo PR.
- Delta en `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` con el invariante
  "determinista puntúa, LLM acompaña" y el contrato de versionado.
- Documentación funcional + manual proporcionales.

## Out of Scope

- **Que el LLM produzca el número.** Ni como tiebreaker, ni como "ajuste fino", ni como peso. Es el
  invariante de la task.
- **Fusionar estas señales con el score del grader o con el eje SEO** en un puntaje único. La
  ortogonalidad es lo que se vende.
- **Persistir la trayectoria de las señales por URL.** Es valioso y es otra task, con su migración y
  su append-only.
- **Fetchear o analizar el contenido de competidores.** Guarda cross-host intacta.
- **Reescribir artefactos ya entregados a clientes.** Un artefacto entregado es un hecho histórico.
- **Query Fan-Out modelado como estructura raíz → sub-consultas** (brecha A3). Acá se usa el fan-out
  existente como insumo de una señal, no se lo remodela.
- **Reemplazar el contenido del fix-it por generación LLM.** El fix-it sigue siendo plantilla; lo que
  cambia es que ahora sabe a qué URL apunta.

## Detailed Spec

### Las señales (todas del HTML, cero tokens)

| Señal | Qué mide | De dónde sale |
|---|---|---|
| `questionHeadingMatch` | H2 que es literalmente una pregunta del fan-out | `structure.questionHeadings` × preguntas del prompt set |
| `selfContainedAnswer` | la respuesta bajo cada H2 se sostiene sola | `readable.text` segmentado por heading |
| `dataDensityWithUnits` | densidad de datos con unidad (%, USD, kg, fechas) | `readable.text` |
| `outboundSourceLinks` | enlaces salientes a fuentes | DOM del `main` |
| `attributedQuotes` | citas textuales con atribución | DOM del `main` |
| `tableOrListInMain` | tabla o lista dentro del contenido principal | DOM del `main` |
| `dateModifiedPresent` | `dateModified` declarado | `structure.jsonLdTypes` + meta |
| `authorBylinePresent` | byline de autor | JSON-LD `author` + DOM |

Cada una emite `{ value, evidence[], unavailableReason? }`. `unavailable` nunca es 0.

### Nota de oficio — qué tiene evidencia y qué es craft nuestro

Esto va en el código y en la documentación, no sólo acá, porque es lo que impide que el módulo
prometa de más:

- **La palanca con mejor evidencia primaria NO es la answer capsule.** Es la **relevancia semántica
  del H2/título frente a la sub-pregunta**: Ahrefs, sobre 1,4 millones de prompts, midió 0,656 en
  páginas citadas contra 0,484 en no citadas. Por eso `questionHeadingMatch` es la señal cabeza de
  serie del conjunto, y no un adorno.
- **La cápsula de 40–60 palabras que el fix-it ya escribe cita un base rate SIN grupo de control**, y
  la fuente original define la cápsula en **~20–25 palabras**. Es **craft nuestro, no evidencia**.
  Se puede seguir recomendando; no se puede presentar como probado, y el copy del artefacto tiene que
  reflejar esa diferencia.
- Los lifts del paper GEO (citas textuales +41%, estadísticas +32%, fuentes enlazadas +30%) se
  midieron sobre GPT-3.5 con top-5 de Google y métrica de proporción de palabras atribuibles: sirven
  para **ordenar tácticas**, no para prometer resultados.

### Cómo se garantiza que el LLM no mueve el número

El cómputo tiene dos funciones separadas por tipo:

```
computeCitabilityScore(signals, config) → number          // puro, sin acceso al LLM
buildQualitativeNote(facts, budget)     → string | undefined
```

`computeCitabilityScore` no recibe la nota como parámetro. No es disciplina: es imposible por firma.
El test bloqueante corre el pipeline completo dos veces —una con juicio, otra sin— y exige igualdad
del número.

### A2 — de dónde sale la `targetUrl`

El resolver ordena candidatas por: (1) URL que ya rankea para la sub-pregunta del gap, (2) URL con
mayor `questionHeadingMatch` parcial (ya casi responde), (3) URL de la categoría con más señales
disponibles. Devuelve `confidence` explícita. Cuando ninguna califica, devuelve `null` con `reason`
—"no hay URL en el inventario que trate el tema"— y el brief lo dice así, en vez de la frase muda
que hoy escribe `generators.ts:207`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (señales deterministas + versionado) → Slice 2 (juicio cualitativo separado) → Slice 3
  (recomendación anclada) → Slice 4 (superficie + docs).
- **Slice 1 DEBE incluir el `citability_signal_version` y el test de reproducibilidad.** Sin
  versionado desde el primer commit, cambiar un peso después mueve resultados históricos sin dejar
  rastro — el mismo defecto que la auditoría documenta en `keyword-opportunities-reader.ts` con sus
  constantes de módulo.
- **Slice 2 no puede shippear sin el test que prueba que el juicio no mueve el número.** Ese test es
  la garantía, no la intención.
- Slice 3 sale detrás de flag porque cambia contenido visible para el cliente.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Alguien conecta la nota del LLM a la fórmula y el score deja de ser reproducible | AEO scoring / reporte al cliente | medium | Separación por firma (`computeCitabilityScore` no recibe la nota) + test bloqueante de igualdad | test de reproducibilidad en rojo |
| Se cambia un peso sin bumpear la versión y los resultados históricos se mueven | AEO / defensa del reporte | medium | `citability_signal_version` obligatorio en el resultado + test que ata config a versión | comparación de golden set contra versión anterior |
| El content brief cambia y un cliente compara con uno anterior | comercial | medium | Flag + aviso al operador comercial antes del flip; artefactos entregados NO se reescriben | reporte del operador |
| El resolver inventa una `targetUrl` poco defendible | comercial / confianza | medium | `confidence` explícita + `null` honesto con motivo; umbral mínimo declarado | revisión del artefacto en staging |
| El juicio cualitativo gasta tokens sin gate | growth spend | low | Hereda el gate per-org del sustrato; sin autorización devuelve `undefined` con motivo y cero tokens | gasto LLM sin atribución |
| Se presenta la cápsula de 40–60 palabras como evidencia probada | comercial / reputacional | medium | Nota de oficio en código, docs y copy del artefacto; el copy distingue "evidencia" de "craft" | revisión de copy en PR |

### Feature flags / cutover

- **Cómputo de señales:** sin flag. Additive, no cambia nada visible mientras nadie lo consuma;
  puede correr en shadow.
- **Cambio visible del content brief (Slice 3):** flag default OFF. Al prender, aplicar la
  disciplina multi-runtime de CLAUDE.md — mapear con `grep -rn` dónde se lee el flag en `src/` y
  `services/`, declararlo en `services/ops-worker/deploy.sh` si el artefacto se genera allá, y
  además aplicarlo en vivo. Fila obligatoria en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.
- **Juicio cualitativo:** hereda el gate de tokens per-org; default OFF.
- Revert: flag a OFF devuelve el brief anterior en el siguiente artefacto generado.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 — señales | `git revert`; nadie las consume todavía, nada persistió | <10 min | si |
| Slice 2 — juicio cualitativo | Gate de tokens a OFF; luego `git revert` | <15 min | si |
| Slice 3 — recomendación anclada | Flag a OFF en los runtimes donde se lee y verificar en la revisión activa; los artefactos ya generados no se tocan | <15 min | parcial (lo entregado queda entregado) |
| Slice 4 — MCP + docs | `git revert` del registro de la tool | <10 min | si |

### Production verification sequence

1. Golden set verde en local con el `citability_signal_version` inicial.
2. Test de reproducibilidad verde: misma entrada, dos corridas, mismo número.
3. Test de aislamiento verde: con y sin juicio cualitativo, mismo número.
4. `pnpm local:check` verde.
5. Staging con el flag del brief en OFF: verificar que el cómputo corre en shadow y no cambia
   ningún artefacto.
6. Staging con el flag en ON: generar un content brief real y verificar `targetUrl` resuelta con
   `confidence`, o `null` con motivo legible.
7. Aviso al operador comercial y flip en producción tras 24 h de cooldown.
8. Monitorear durante 7 días: gasto LLM del dominio y reportes del operador sobre el contenido del
   artefacto.

### Out-of-band coordination required

- **Aviso al operador comercial antes del flip de Slice 3**: el contenido del artefacto que se le
  entrega al cliente cambia, y alguien puede tener uno anterior en la mano.
- Fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` con el runtime declarado para cada flag
  nuevo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un conjunto cerrado de señales deterministas de citabilidad, todas derivadas de
      `analyzeUrlContent`, cada una con su regla de extracción declarada en el código.
- [ ] El resultado incluye `citability_signal_version` y cambiar cualquier peso o umbral **exige**
      bumpearla; hay un test que lo ata.
- [ ] `computeCitabilityScore` **no recibe** la salida del LLM como parámetro (verificable por
      firma), y existe un test bloqueante que corre el pipeline con y sin juicio cualitativo y exige
      el mismo número.
- [ ] Misma entrada, dos corridas, mismo número byte a byte (test de reproducibilidad verde).
- [ ] Una señal que no se pudo evaluar se expresa `unavailable` con motivo; **no existe ningún 0 como
      default** en el conjunto de señales.
- [ ] `src/lib/growth/ai-visibility/fix-it/generators.ts` ya no emite `- URL destino: pendiente de
      definir.` cuando el resolver devolvió candidata; cuando no la hay, emite el motivo concreto y
      mantiene el ítem en `pendingFields`.
- [ ] El resolver devuelve `confidence` explícita y `null` honesto con motivo; nunca inventa una URL.
- [ ] La nota de oficio (Ahrefs 0,656 vs 0,484 como palanca cabeza de serie; cápsula de 40–60
      palabras declarada como craft y no como evidencia) está en el código y en la documentación, y
      el copy del artefacto refleja esa diferencia.
- [ ] Las señales **no se promedian** con el score del grader ni con el eje SEO en ningún punto.
- [ ] Tool MCP read-only registrada en `src/mcp/greenhouse/tools.ts` en el MISMO PR.
- [ ] Fila del flag del cambio visible en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` con runtime
      declarado.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/growth/ai-visibility/citability src/lib/growth/ai-visibility/fix-it`
- `pnpm vitest run src/lib/growth/ai-visibility` (suite completa del motor, sin regresión de scoring)
- `pnpm test` (suite completa, gate de cierre)
- `pnpm build` (producción, gate de cierre — pedir autorización al operador antes de correrlo)
- Generación real de un content brief en staging con el flag ON y con el flag OFF
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `TASK-1669` actualizada: consume estas señales y **no** construye ordenamiento propio sobre
      ellas.
- [ ] `TASK-1672`/`TASK-1673` notificadas: el artefacto de auditoría hereda la recomendación anclada.

## Follow-ups

- Persistir la trayectoria de las señales por URL (append-only) para poder responder "¿mejoró esta
  página desde que la tocamos?".
- Modelar Query Fan-Out como estructura raíz → sub-consultas con cobertura por raíz (brecha A3), que
  haría más fina la señal `questionHeadingMatch`.
- Conectar la señal al `priority_score` del eje SEO con **su propia** config versionada, sin
  compartir `score_version` con AEO.

## Open Questions

- ¿`selfContainedAnswer` se mide sólo con reglas de estructura (longitud del bloque, ausencia de
  referencias anafóricas al bloque anterior) o admite una heurística más rica? V1 propuesta: reglas
  de estructura, porque cualquier cosa más rica empuja hacia el LLM y el LLM no puede puntuar.
- ¿El umbral mínimo de `confidence` para que el resolver proponga una `targetUrl` es config
  versionada junto con las señales, o parámetro del caller? Propuesta: config versionada, para que
  el artefacto sea auditable.
