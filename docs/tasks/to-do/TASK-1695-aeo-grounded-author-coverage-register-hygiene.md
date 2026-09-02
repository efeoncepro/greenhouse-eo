# TASK-1695 — Grounded author: cobertura de candidatos y registro del cerebro AEO

## Delta 2026-09-01 — `Blocked by` limpio

Se retiró `TASK-1697` del campo (cerró el 2026-08-27). El orden se invirtió: `TASK-1713`, el barrel
AEO, entra después de ésta. La razón vive acá y no en el campo.


<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-08-15 (2) — decisión de secuencia verificada: esta task **se DESBLOQUEA**

Se retira `Blocked by: TASK-1697`. El Delta inmediatamente inferior queda **superado en su primer
punto** (el bloqueo por conflicto de archivo); su segundo punto —la pasada de eval consolidada— sigue
vigente sin cambios.

**Por qué.** `TASK-1697` se recortó a la **mitad A**: `git mv` del sustrato de sitio
(`probes/safe-fetch.ts` + `probes/html.ts` + los 3 tipos del fetcher) a
`src/lib/growth/site-substrate/` con re-export shim, test de frontera, y una lint rule angosta. **Ese
alcance NO toca `grounded-query-bridge.ts` ni `grounded-query-reader.ts`** — verificado contra el
alcance recortado: los dos archivos salieron de sus `Files owned`. El conflicto de merge que
justificaba el bloqueo **ya no existe**.

🔴 **El bloqueo se invierte.** La reescritura de esos dos archivos al barrel de dominio AEO viaja
ahora con **`TASK-1713`** (lint rule universal + barrel de dominio AEO), que declara
`Blocked by: TASK-1695` — porque su reescritura debe caer sobre el archivo **ya modificado** por esta
task, no al revés. Rebasar la reescritura del barrel sobre un `grounded-query-bridge.ts` que después
cambia de techo de candidatos y de versión del cerebro es hacer el mismo merge dos veces, la segunda
a ciegas.

⚠️ **La mitad B es `TASK-1713`, NO `TASK-1710`.** El brief la nombró `TASK-1710`, pero ese ID ya
está tomado por el umbrella P0 de remediación de confiabilidad
(`docs/tasks/to-do/TASK-1710-reliability-remediation-control-plane-delivery-data.md`), `TASK-1711` y `TASK-1712` quedaron tomados en la misma sesión por otro agente en paralelo. La mitad B se registró como
`docs/tasks/to-do/TASK-1713-growth-cross-domain-import-lint-and-aeo-barrel.md`. **Nunca citar
`TASK-1710` para este trabajo.**

**Esta task puede tomarse ya.** No espera a nadie: sus tres slices (techo de candidatos, registro
neutro + bump, eval) sólo dependen de código que ya está en `develop`.

## Delta 2026-08-15 — `Blocked by` += `TASK-1697`, y el bump entra en UNA sola pasada de eval

Fuente: `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md` (§1.3 deep
imports cross-dominio; §5.1 `site-substrate`).

> ⚠️ **SUPERADO por el `## Delta 2026-08-15 (2)`.** El bloqueo se retiró: con `TASK-1697` recortada a
> su mitad A, esa task ya no toca `grounded-query-bridge.ts` ni `grounded-query-reader.ts`, y el
> orden se invierte (`TASK-1713` del barrel entra **después** de ésta). El párrafo se conserva
> como registro de por qué se creyó lo contrario.

~~**`Blocked by: TASK-1697` — conflicto de archivo, no de contrato.**~~ `TASK-1697` extraía el
sustrato de sitio (`site-substrate`) y **le reescribía los imports a `grounded-query-bridge.ts`**, uno
de los archivos `owned` de esta task. La auditoría midió que `growth/seo` importa **10 símbolos
internos** de `growth/ai-visibility` desde `grounded-query-bridge.ts:23-37` y
`grounded-query-reader.ts:15-19` —los dos archivos que esta task también toca—, así que el conflicto
no sería una línea sino la cabecera completa. Con el recorte, esa reescritura salió de 1697 y el
conflicto desapareció.

**Coordinación de evals: hay TRES bumps del cerebro en vuelo y cada uno invalida el golden set.**

| Task | Qué bumpea |
|---|---|
| `TASK-1695` (esta) | registro es-CL neutro + rango de preguntas compatible con el techo de candidatos |
| `TASK-1698` | posicionamiento declarado como input (cierra `message_alignment` medido contra nada) |
| `TASK-1703` | router del eje herramienta (extractor de prosa) |

Cada bump cambia el texto que produjo el golden set, así que **cada uno lo invalida y obliga a
re-correr la eval completa**. Correrlas por separado es pagar tres veces la misma pasada y —peor—
comparar cada versión contra un baseline distinto, con lo cual **ningún delta es atribuible**: si la
naturalidad baja después del tercer bump, nadie puede decir cuál de los tres la movió.

Regla de coordinación: **los tres bumps se consolidan en UNA sola pasada de eval**, con el golden set
re-corrido una vez contra el estado final y un delta por eje declarado. La task que llegue última
—cualquiera de las tres— es la que ejecuta la pasada; las dos anteriores dejan su cambio de texto
listo y declaran el bump pendiente de eval en su cierre. Ninguna de las tres se declara `complete` con
su propia eval aislada: eso viola la doctrina `TASK-1290`/`TASK-1292` ("cambiar el prompt cambia la
versión → la eval lo re-valida") aplicada a un solo eje mientras los otros dos ya movieron el suelo.

Esto **no cambia el alcance** de esta task: cambia el orden y el punto de cierre de su evidencia.

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|seo|aeo|data`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cierra dos defectos de higiene del **autor de grounded queries** (`TASK-1666`) que hoy conviven con el
build verde y con los tests en verde. Uno es aritmético: el techo de candidatos del bridge (`20`) es
incompatible con la regla de cobertura que el propio cerebro exige, así que en el lote grande el sistema
le pide al modelo algo incumplible y produce `coverageNotice` **por diseño**. El otro es de exactitud
AEO: el system prompt base está redactado en **voseo rioplatense** mientras pide output es-CL, y ese
registro puede sangrar a las preguntas que se le mandan al motor. Ambos se corrigen con **bump de
versión** del cerebro y cierran con **eval de naturalidad** sobre queries realmente autoradas.

## Why This Task Exists

Salió de la auditoría SEO/AEO de `TASK-1665` (2026-08-15) mirando el dominio como **autor de las
grounded queries** de `TASK-1666`, no como lente de discovery. Ninguno de los dos hallazgos rompe un
test ni el build: son incoherencias internas del contrato entre el techo del bridge y el texto del
cerebro.

**Hallazgo 1 — el techo de candidatos es aritméticamente incompatible con la regla de cobertura.**
`MAX_GROUNDED_QUERY_CANDIDATES = 20` (`src/lib/growth/seo/grounded-query-bridge.ts:63`) contra un system
prompt que en el mismo aliento pide `12 a 16 preguntas`
(`src/lib/growth/ai-visibility/prompt-packs/authoring/author-system-prompt.ts:120`) y
`CADA candidate … al menos 1-2 preguntas` (mismo archivo, líneas 144-148). Con más de 16 candidatos la
cobertura total es imposible por aritmética; y el sanitizer trunca duro en `MAX_AUTHORED_PROMPTS = 18`
(`author-prompt-set.ts:39-40`), así que por encima de 18 el hueco es estructural aunque el modelo
obedezca. El detector determinista `computeSeoSeedCoverage` lo declararía — eso está **bien**, es la
honestidad que `TASK-1666 v2` construyó a propósito — pero estaría declarando una brecha causada por el
contrato, no por el modelo: `coverageNotice` emitido por diseño degrada la señal hasta volverla ruido
("siempre avisa, entonces nadie lo mira").

Hoy es **latente**: el consumer UI (`TASK-1665`) manda 1 candidato por acción
(`keyword-discovery-action.ts`). Pero el lote ya es capacidad disponible del backend sin consumer — la
ruta app (`src/app/api/admin/growth/seo/grounded-queries/route.ts`) y el lane ecosystem/MCP
(`src/lib/api-platform/resources/ecosystem-growth-seo.ts`) aceptan `candidateIds` hasta 20 hoy. El
primer consumer que use el lote se encuentra el defecto en producción, no en review.

**Hallazgo 2 — el system prompt base está en voseo rioplatense mientras pide output es-CL.**
`proponé` (l. 100), `Cubrí` (105), `Balanceá` (117), `Usá` (122), `Escribí` (124), `Devolvé` (131) y
`Proponé` en el prompt de usuario (`buildAuthorPromptSetPrompt`, l. 308) — junto a la instrucción
`Escribí en el idioma indicado (es-CL por defecto), tono natural de usuario real`. El bloque grounded
agregado en v2 sí está en tuteo; la inconsistencia es del **prompt base**, que el grounded compone
íntegro (`AUTHOR_SEO_GROUNDED_SYSTEM_PROMPT = ${AUTHOR_SYSTEM_PROMPT} + bloque`, l. 138).

El riesgo **no es cosmético, es de exactitud AEO**. Las grounded queries son el instrumento de medición:
deben leerse como las preguntas que un usuario del mercado realmente le haría al motor. El registro del
system prompt puede sangrar al output (`¿qué pintura me recomendás?`), y una query con voseo **no es la
que un motor recibe de un usuario chileno o mexicano** — mide otra cosa, y la mide peor. Además choca
con la regla de estilo del repo (español neutro latinoamericano, sin voseo, CLAUDE.md §Operator
Communication Style) y con el precedente que ya existe en el propio repo: `LOCALE_VOICE` en
`src/lib/public-site/content-factory/article-ideation.ts:120` declara explícito
`Español neutro latinoamericano, tuteo (tú) … Evita voseo y modismos`.

**Por qué exige bump de versión y no una edición en sitio.** El cerebro es un artefacto versionado: el
mecanismo de versionado + eval ya existe y tiene precedente vivo — la `seo-grounded.v2` nació de un smoke
real fallido (la seed "pintura para piso" quedó sin representación). Editar en sitio un prompt ya usado
en producción rompe la trazabilidad de todo set histórico: `system_prompt_version` dejaría de identificar
el texto que produjo esas preguntas.

## Goal

- El techo de candidatos del bridge y el rango de preguntas del cerebro quedan **aritméticamente
  compatibles**, de modo que `coverageNotice` vuelva a significar "el modelo falló", nunca "el contrato
  es imposible".
- El registro del system prompt base y del prompt de usuario queda en **español neutro latinoamericano
  (tuteo)**, con el registro del output declarado explícito en vez de heredado del prompt.
- El cambio del cerebro viaja con **bump de versión** de los dos artefactos afectados, y los drafts
  históricos **no se reclasifican** como `baseline_fallback` por efecto colateral del bump.
- El cierre incluye **eval de naturalidad** sobre queries realmente autoradas por LLM: un cambio de
  prompt sin eval no se puede declarar complete.

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
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` (§Delta 2026-06-24)
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (§1.1 boundary SEO↔AEO)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- **NUNCA** editar en sitio un system prompt cuya versión ya se usó en producción. Cambio de texto ⇒
  bump de `AUTHOR_SYSTEM_PROMPT_VERSION` y/o `AUTHOR_SEO_GROUNDED_SYSTEM_PROMPT_VERSION`, porque
  `system_prompt_version` es lo único que identifica el texto que produjo un set persistido.
- **NUNCA** un cambio del cerebro sin eval: la doctrina de `TASK-1290`/`TASK-1292` es "cambiar el system
  prompt cambia la versión → la eval lo re-valida".
- **NUNCA** un JOIN/VIEW/FK entre tablas `seo_*` y `grader_*` (boundary §1.1). Esta task no toca SQL
  cross-motor: el bridge sigue leyendo candidatos sólo por `readKeywordDiscovery`.
- **NUNCA** relajar el no-leading: las preguntas de descubrimiento siguen `namesBrand=false` y sin
  `{{brand}}`. Ningún ajuste de registro ni de cobertura justifica nombrar la marca.
- **NUNCA** aumentar el techo de candidatos como forma de "resolver" el hallazgo 1: el problema es que el
  techo actual ya excede lo que la cobertura puede honrar.
- El texto de keyword sigue siendo **dato no confiable**: entra sólo dentro del bloque delimitado,
  neutralizado, y jamás a logs/refs.

## Normative Docs

- `docs/tasks/complete/TASK-1666-growth-seo-grounded-query-bridge.md` — contrato del bridge, del cerebro
  grounded y precedente de eval humana de naturalidad (§Evidencia de cierre 2026-08-14).
- `docs/tasks/complete/TASK-1665-growth-seo-keyword-discovery-workbench.md` — consumer UI vigente
  (1 candidato por acción).
- `docs/tasks/complete/TASK-1292-aeo-multi-archetype-eval-golden-set.md` — harness de eval del dominio
  AEO (`src/lib/growth/ai-visibility/evals/`).
- `.claude/rules/growth-seo.md` — invariantes auto-load del dominio Growth/SEO.
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1666` (complete) — `createGroundedQueryDraft`, `AUTHOR_SEO_GROUNDED_SYSTEM_PROMPT`,
  `computeSeoSeedCoverage`, `GROUNDED_QUERY_COVERAGE_NOTICE`.
- `TASK-1665` (complete) — consumer UI del bridge (`KeywordDiscoveryCandidateDrawer`,
  `keyword-discovery-action.ts`).
- `TASK-1290` / `TASK-1292` (complete) — cerebro autor versionado y harness de eval AEO.
- ~~`TASK-1697` (bloqueante)~~ — **retirado el 2026-08-15 (2)**. Con 1697 recortada a su mitad A
  (`git mv` del sustrato + test de frontera + lint rule angosta), esa task **no toca**
  `grounded-query-bridge.ts` ni `grounded-query-reader.ts`. Esta task no espera a nadie.
- **Coordinación de eval con `TASK-1698` y `TASK-1703`** — tres bumps del cerebro en vuelo, una sola
  pasada de eval consolidada. No es dependencia de código: es de evidencia de cierre. Ver el Delta.
- Flags vigentes: `GROWTH_SEO_ENABLED`, `GROWTH_AI_VISIBILITY_GRADER_ENABLED`,
  `GROWTH_AI_VISIBILITY_PROMPT_AUTHORING_ENABLED`.

### Blocks / Impacts

- **Lane MCP/ecosystem del bridge** (`src/lib/api-platform/resources/ecosystem-growth-seo.ts`,
  `prepare`/`read` de grounded queries): el bump de versión cambia el valor que el reader compara para
  decidir `groundingMode`.
- **Consumers de drafts AEO** (review/aprobación de prompt sets, `readGraderPromptSets`,
  `readGroundedQueryDraft`): drafts persistidos con la versión anterior deben seguir leyéndose como
  grounded.
- **Dedupe del bridge**: la lock key incluye `AUTHOR_SEO_GROUNDED_SYSTEM_PROMPT_VERSION`, así que el bump
  reabre legítimamente la autoría del mismo intent con el cerebro nuevo (comportamiento deseado, hay que
  declararlo, no descubrirlo).
- 🔴 **`TASK-1713`** — lint rule universal + barrel de dominio AEO: declara `Blocked by: TASK-1695`. Reescribe `grounded-query-bridge.ts` y
  `grounded-query-reader.ts` para que consuman el barrel de dominio AEO en vez de deep imports, y esa
  reescritura debe caer sobre los archivos **ya modificados** por esta task — techo de candidatos y
  versiones del cerebro incluidos. Al cerrar, dejar el estado final de esos dos archivos declarado en
  el Handoff para que quien tome la hermana no rebase a ciegas.
- `TASK-1667`, `TASK-1668`, `TASK-1669` (to-do, carril editorial/agéntico SEO): consumen drafts del mismo
  motor aguas abajo.

### Files owned

- `src/lib/growth/ai-visibility/prompt-packs/authoring/author-system-prompt.ts`
- `src/lib/growth/seo/grounded-query-bridge.ts`
- `src/lib/growth/seo/grounded-query-reader.ts`
- `src/lib/growth/ai-visibility/__tests__/author-prompt-set.test.ts`
- `src/lib/growth/seo/__tests__/grounded-query-bridge.test.ts`
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- `MAX_GROUNDED_QUERY_CANDIDATES = 20` en `src/lib/growth/seo/grounded-query-bridge.ts:63`, aplicado dos
  veces: como validación (`candidate_limit_exceeded`, l. 193) y como `limit` del reader (l. 214).
- `AUTHOR_SYSTEM_PROMPT` con el rango `12 a 16 preguntas`
  (`author-system-prompt.ts:120`) y los imperativos en voseo (l. 100, 105, 117, 122, 124, 131).
- `AUTHOR_SEO_GROUNDED_SYSTEM_PROMPT` compone el base íntegro y agrega el bloque grounded en tuteo,
  con la regla `CADA candidate … al menos 1-2 preguntas` (l. 144-148).
- `buildAuthorPromptSetPrompt` cierra el prompt de usuario con `Proponé el Query Fan-Out…` (l. 308).
- `MIN_AUTHORED_PROMPTS = 8` / `MAX_AUTHORED_PROMPTS = 18` en
  `src/lib/growth/ai-visibility/prompt-packs/authoring/author-prompt-set.ts:39-40` (el sanitizer trunca).
- `computeSeoSeedCoverage` (puro, exportado, `author-system-prompt.ts:263`) + `GROUNDED_QUERY_COVERAGE_NOTICE`
  (`grounded-query-bridge.ts:109`) — el detector determinista de brecha, ya funcionando.
- Tests que ANCLAN las versiones actuales:
  `src/lib/growth/ai-visibility/__tests__/author-prompt-set.test.ts:223-225`
  (`aeo-author.v1`, `aeo-author.seo-grounded.v2`, y que el grounded empiece con el base).
- Precedente de registro explícito: `LOCALE_VOICE` en
  `src/lib/public-site/content-factory/article-ideation.ts:119-123`.

### Gap

- Nada reconcilia el techo `20` con el rango `12 a 16` ni con el tope `18` del sanitizer: son tres
  números decididos en momentos distintos que nadie cruzó.
- No hay test que afirme la propiedad "el techo de candidatos es honrable por el rango de preguntas
  declarado", así que la incompatibilidad puede reintroducirse en silencio.
- El registro del output no está declarado como dato del prompt (locale → registro): se hereda del
  registro con que está escrita la instrucción, que es justamente el bug.
- `grounded-query-reader.ts:89-90` decide `groundingMode` con **igualdad exacta** contra la constante
  vigente. Al bumpear, todo draft `seo-grounded.v2` histórico pasaría a leerse `baseline_fallback` — una
  regresión silenciosa de provenance que hay que cerrar en el mismo PR.
- No existe eval de naturalidad ejecutable/repetible del output grounded: el precedente de `TASK-1666`
  fue eval humana registrada en la task, no un artefacto reutilizable.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/growth/ai-visibility/prompt-packs/authoring/` (cerebro autor, módulo puro sin IO)
  y `src/lib/growth/seo/` (bridge + reader), ambos server-only dentro del portal Next.js.
- Future candidate home: `domain-package`
- Boundary: el cerebro autor sigue siendo el único dueño del system prompt y de su versión; el bridge
  (`createGroundedQueryDraft`) sigue siendo el único command de creación de drafts grounded y el reader
  (`readGroundedQueryDraft`) el único lector de provenance. Consumers autorizados: ruta app
  `/api/admin/growth/seo/grounded-queries`, lane ecosystem/MCP `ecosystem-growth-seo.ts`, UI de
  `TASK-1665` y Nexa. Ninguno replica el texto del prompt ni la comparación de versión.
- Server/browser split: `author-system-prompt.ts` es puro (sin IO) pero se consume sólo server-side; el
  bridge y el reader llevan `import 'server-only'`. Ninguna constante de versión ni texto de prompt cruza
  al browser.
- Build impact: `none` — sin dependencias nuevas, sin filesystem input, sin entrypoint global.
- Extraction blocker: el bridge depende de la transacción PG con `pg_advisory_xact_lock` y del store AEO
  (`grader_prompt_sets`); mientras el aggregate de prompt sets viva en el portal, el cerebro no se extrae
  solo.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: `AUTHOR_SYSTEM_PROMPT` / `AUTHOR_SEO_GROUNDED_SYSTEM_PROMPT` + sus constantes
  de versión (`author-system-prompt.ts`), `MAX_GROUNDED_QUERY_CANDIDATES` (`grounded-query-bridge.ts`),
  y la columna `greenhouse_growth.grader_prompt_sets.system_prompt_version` como registro persistido.
- Consumidores afectados: `UI` (`TASK-1665`), `API` (ruta app de grounded queries), `MCP`/`ecosystem`
  (`prepare_seo_grounded_queries` / lectura del draft), `Nexa`, y el review/eval AEO.
- Runtime target: `local` + `staging` + `production` (portal Vercel). Sin worker ni cron nuevos.

### Contract surface

- Contrato existente a respetar:
  `src/lib/growth/seo/grounded-query-bridge.ts` (`CreateGroundedQueryDraftInput`,
  `GroundedQueryDraftResult`, `GroundedQueryErrorCode`), `src/lib/growth/seo/grounded-query-reader.ts`
  (`groundingMode`), `src/lib/growth/ai-visibility/prompt-packs/authoring/author-prompt-set.ts`
  (sanitizer 8–18), `src/lib/api-platform/resources/ecosystem-growth-seo.ts`.
- Contrato nuevo o modificado: valor de `MAX_GROUNDED_QUERY_CANDIDATES` y/o el rango de preguntas del
  system prompt; nuevas constantes de versión del cerebro; conjunto de versiones reconocidas como
  grounded en el reader y en el dedupe del bridge.
- Backward compatibility: `gated` — el shape público (tipos, error codes, campos de respuesta) NO cambia.
  Cambia el valor de una constante numérica y el string de versión. **La compatibilidad crítica es de
  lectura**: los drafts persistidos con `aeo-author.seo-grounded.v2` deben seguir reportando
  `groundingMode: 'grounded_llm'`.
- Full API parity: la regla vive donde ya vivía (el cerebro y el command en `src/lib/**`). Los cuatro
  consumers (UI, ruta app, lane ecosystem/MCP, Nexa) siguen consumiendo el mismo primitive; esta task no
  agrega capability nueva ni superficie nueva. `N/A — no capability nueva` para el gate de capability+grant.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.grader_prompt_sets` (lectura y escritura de
  `system_prompt_version`; **sin cambio de schema**). Tablas `seo_*`: sólo lectura vía
  `readKeywordDiscovery`, sin cambio.
- Invariantes que no se pueden romper:
  - `MAX_GROUNDED_QUERY_CANDIDATES` ≤ el número de candidatos que el rango de preguntas declarado puede
    cubrir con ≥1 pregunta cada uno, considerando el tope duro del sanitizer (`MAX_AUTHORED_PROMPTS`).
  - Un set persistido conserva para siempre el significado de su `system_prompt_version`: ninguna
    versión se reescribe, y ninguna versión histórica deja de reconocerse como grounded.
  - El grounded sigue componiendo el base (`AUTHOR_SEO_GROUNDED_SYSTEM_PROMPT.startsWith(AUTHOR_SYSTEM_PROMPT)`);
    tocar el base bumpea AMBAS versiones, nunca sólo una.
  - No-leading intacto: `namesBrand=false` ⇒ sin `{{brand}}`.
  - El bridge sigue creando sólo `draft`; no aprueba, no supersede active, no dispara runs.
- Tenant/space boundary: sin cambio — `organizationId` + `profileId` validados en el bridge/reader
  (anti-oracle: profile ajeno e inexistente responden igual).
- Idempotency/concurrency: sin cambio de mecanismo — `pg_advisory_xact_lock(hashtextextended(lockKey))`
  sobre conexión fijada. **Efecto declarado del bump**: `lockKey` incluye la versión del cerebro, así que
  post-bump el mismo intent produce un draft nuevo con el cerebro nuevo en vez de deduplicar contra el
  viejo. Es el comportamiento correcto y debe quedar escrito, no descubierto.
- Audit/outbox/history: sin evento nuevo. La historia vive en el append de versiones de
  `grader_prompt_sets` y en `grounding_sources_json`, que no cambian de forma.

### Migration, backfill and rollout

- Migration posture: `none` — sin DDL. El cambio es de constantes y de texto de prompt.
- Default state: `enabled with rationale` — no se introduce flag nuevo. El authoring ya está gobernado por
  `GROWTH_AI_VISIBILITY_PROMPT_AUTHORING_ENABLED` (default OFF en producción); con el flag apagado el
  camino es `baseline_fallback` y el cambio de prompt es inerte.
- Backfill plan: `none` — **no se reescribe `system_prompt_version` de ninguna fila histórica**. La
  compatibilidad se resuelve en lectura (conjunto de versiones grounded reconocidas), no mutando datos.
- Rollback path: revert del PR + redeploy. Los drafts creados con la versión nueva quedan en la tabla y
  siguen siendo legibles; el reader debe reconocer también la versión nueva tras un revert, o el revert
  reintroduce el mismo bug de reclasificación al revés — declararlo en el plan de rollback.
- External coordination: aprobación del owner AEO para el smoke con autoría LLM real (costo de proveedor)
  y para revisar el draft resultante. Sin secreto nuevo, sin scope Entra nuevo, sin cambio de flag en
  producción.

### Security and access

- Auth/access gate: sin cambio — doble capability obligatoria en el bridge
  (`growth.seo.observation.read` + `growth.ai_visibility.prompt_set.manage`); el lane ecosystem exige
  además `efeonce.mcp.seo.write` y sigue fail-closed (`aeo_forbidden`) para el actor máquina hasta
  `TASK-1631`.
- Sensitive data posture: `no sensitive data` en el cambio. El texto de keyword sigue siendo dato no
  confiable, delimitado y neutralizado (`asSafeContextText`), y jamás va a logs/refs.
- Error contract: sin códigos nuevos. `candidate_limit_exceeded` mantiene su semántica; si el techo baja,
  el mismo código cubre el nuevo límite.
- Abuse/rate-limit posture: sin cambio. El techo de candidatos ES el control de blast-radius del prompt;
  bajarlo lo endurece, nunca lo relaja.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/ai-visibility/__tests__/author-prompt-set.test.ts
  src/lib/growth/seo/__tests__/grounded-query-bridge.test.ts
  src/lib/growth/seo/__tests__/grounded-query-bridge-parity.test.ts` + `pnpm local:check`.
- DB/runtime checks: lectura read-only de `greenhouse_growth.grader_prompt_sets` vía proxy para confirmar
  que los sets con `aeo-author.seo-grounded.v2` siguen leyéndose `grounded_llm` después del cambio.
- Integration checks: smoke autorizado de autoría LLM real (1 llamada, proveedor canónico) sobre
  candidatos reales de discovery, replicando el patrón del sanity 16/16 de `TASK-1666`.
- Reliability signals/logs: `captureWithDomain(error, 'growth', { tags: { source: 'seo_grounded_query_bridge' } })`
  ya existente; sin signal nuevo. La señal funcional del hallazgo 1 es la frecuencia de `coverageNotice`,
  que debe caer a ~0 en lotes que respeten el techo nuevo.
- Production verification sequence: ver §`Production verification sequence` de Zone 3.

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

### Slice 1 — Reconciliar el techo de candidatos con la regla de cobertura

- Decidir y **dejar escrita la decisión** entre las dos opciones vivas (ver §Detailed Spec → Opción A vs
  Opción B). El deliverable NO es "investigar": es la constante/rango corregidos, con el trade-off
  argumentado en el comentario del código y en el `## Delta` de esta task.
- Aplicar el cambio en `grounded-query-bridge.ts` (techo) y/o en `author-system-prompt.ts` (rango),
  manteniendo el techo consistente en sus **dos** usos: la validación `candidate_limit_exceeded` (l. 193)
  y el `limit` que se le pasa a `readKeywordDiscovery` (l. 214).
- Agregar el test de propiedad que hoy no existe: el techo de candidatos debe ser honrable por el rango de
  preguntas declarado y por `MAX_AUTHORED_PROMPTS`. Es el guardrail que impide reintroducir la
  incompatibilidad en silencio.
- Verificar que la Opción elegida no rompa el consumer vigente de `TASK-1665` (1 candidato por acción).

### Slice 2 — Registro neutro del cerebro, con bump de versión y sin reclasificar historia

- Reescribir los imperativos en voseo del `AUTHOR_SYSTEM_PROMPT` a español neutro latinoamericano
  (tuteo): `proponé→propón`, `Cubrí→Cubre`, `Balanceá→Balancea`, `Usá→Usa`, `Escribí→Escribe`,
  `Devolvé→Devuelve`; y `Proponé→Propón` en `buildAuthorPromptSetPrompt`.
- Declarar el **registro del output como instrucción explícita**, no como herencia del registro de la
  instrucción, siguiendo el precedente de `LOCALE_VOICE` en `article-ideation.ts`: el prompt dice qué
  registro debe tener la pregunta producida (neutro latinoamericano, tuteo, sin voseo ni modismos
  locales) además de en qué idioma.
- **Bump de las dos versiones**: `AUTHOR_SYSTEM_PROMPT_VERSION` (`aeo-author.v1` → siguiente) y
  `AUTHOR_SEO_GROUNDED_SYSTEM_PROMPT_VERSION` (`aeo-author.seo-grounded.v2` → siguiente). El grounded
  compone el base, así que tocar el base cambia ambos cerebros: bumpear sólo uno mentiría sobre el otro.
- **Back-compat de lectura en el mismo PR**: `grounded-query-reader.ts` y el dedupe de
  `grounded-query-bridge.ts` dejan de comparar por igualdad exacta contra una única constante y pasan a
  reconocer el **conjunto de versiones grounded conocidas** (histórica + vigente). Sin esto, el bump
  reclasifica en silencio todo draft `v2` como `baseline_fallback`.
- Actualizar los tests que anclan las versiones
  (`author-prompt-set.test.ts:223-225`) y agregar: (a) test de que ninguna versión histórica pierde su
  `groundingMode: 'grounded_llm'`; (b) test de que el prompt base no contiene formas de voseo.

### Slice 3 — Eval de naturalidad y evidencia de cierre

- Ejecutar autoría LLM real (proveedor canónico, flags/costo/owner aprobados) sobre candidatos reales de
  discovery y evaluar la **naturalidad y el registro** de las queries producidas: leen como pregunta de
  usuario real del mercado, sin voseo, sin copiar la keyword 1:1, no-leading limpio, y cobertura completa
  de los seeds (`computeSeoSeedCoverage` sin `uncoveredCandidateIds`).
- Registrar la evidencia en la task (queries evaluadas, divergencias, versión del cerebro, modelo) con el
  mismo nivel de detalle que el §Evidencia de cierre de `TASK-1666`.
- Sanity read-only sobre `grader_prompt_sets`: confirmar que un draft histórico `seo-grounded.v2` sigue
  leyéndose `grounded_llm` por el reader después del cambio.
- Delta documental en `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`:
  registro del output, versiones vigentes del cerebro y la regla "el techo de candidatos es una función
  del rango de preguntas".

## Out of Scope

- **NO** rediseñar el modelo de cobertura ni reemplazar `computeSeoSeedCoverage` por scoring de calidad.
  El detector determinista se conserva tal cual: esta task quita la causa espuria de sus avisos, no el
  detector.
- **NO** subir el techo de candidatos ni ampliar el rango del sanitizer (`MIN/MAX_AUTHORED_PROMPTS`) para
  "hacer caber" más candidatos: eso es una decisión de producto con costo de tokens y de calidad, y sería
  otra task.
- **NO** construir el consumer de lote (selección múltiple de candidatos en la UI de `TASK-1665`). Esta
  task deja el backend coherente para cuando ese consumer exista.
- **NO** tocar el pack baseline por arquetipo (`archetype-baseline-packs`), la eval de cobertura por
  arquetipo (`TASK-1292`) ni el scorer del grader.
- **NO** tocar el boundary SEO↔AEO, el modelo de intención de keywords (`TASK-1659`) ni el gasto de
  proveedor SEO.
- **NO** prender flags en producción como parte de esta task.
- **NO** barrer voseo en otros prompts LLM del repo. El scan quedó hecho y el dominio está limpio salvo
  este archivo; si aparece otro, va como follow-up.

## Detailed Spec

### Hallazgo 1 — el trade-off, argumentado

Los tres números en juego hoy:

| Número | Valor | Dónde | Qué gobierna |
|---|---|---|---|
| `MAX_GROUNDED_QUERY_CANDIDATES` | `20` | `grounded-query-bridge.ts:63` | Cuántos seeds acepta un draft |
| Rango declarado al modelo | `12 a 16` | `author-system-prompt.ts:120` | Cuántas preguntas debe producir |
| `MAX_AUTHORED_PROMPTS` | `18` | `author-prompt-set.ts:40` | Tope duro del sanitizer (trunca) |

Con la regla `CADA candidate … al menos 1-2 preguntas`, la cobertura total exige
`preguntas ≥ candidatos`. Con 17-20 candidatos eso es imposible contra el rango `12 a 16`, y con 19-20 es
imposible incluso contra el tope `18` del sanitizer aunque el modelo desobedeciera el rango.

**Opción A — bajar el techo (≈8).**
A favor: es el cambio de una constante, sin tocar el cerebro (no arrastra bump por sí solo), y deja
holgura real — con 8 candidatos y 12-16 preguntas caben las "1-2 preguntas por candidate" que el prompt
pide, no apenas una. Un lote chico también produce mejores preguntas: la atención del modelo no se
diluye, y el volumen (`vol`) puede efectivamente priorizar en vez de repartir migajas. Y endurece el
blast-radius del prompt (menos texto no confiable por llamada).
En contra: reduce capacidad hoy disponible del backend. Un operador que quisiera preparar un draft desde
15 candidatos tendría que partirlo en dos.

**Opción B — escalar el rango de preguntas con `candidateCount`.**
A favor: conserva el techo y hace el contrato honesto en todo el rango (p. ej. rango =
`clamp(2×candidatos, 12, MAX_AUTHORED_PROMPTS)`).
En contra: es un cambio del **texto del cerebro** ⇒ obliga a bump y a eval por sí solo; el techo del
sanitizer (`18`) sigue siendo pared dura, así que por encima de 18 candidatos la Opción B **no resuelve
nada** y habría que además mover `MAX_AUTHORED_PROMPTS`, lo cual sí es decisión de producto (costo de
tokens, `AUTHOR_MAX_OUTPUT_TOKENS = 2200`, y calidad decreciente por pregunta). Además hace el prompt
dinámico, que es más difícil de versionar y de evaluar: la eval deja de correr contra un texto fijo.

**Recomendación de la auditoría (no vinculante, el agente decide y lo argumenta):** Opción A, con el
techo alineado a "el rango declarado puede dar ≥1 pregunta por candidate con holgura", y el número
derivado de la constante del prompt en vez de escrito a mano dos veces. Si se elige B, el cambio DEBE
viajar dentro del mismo bump de versión de Slice 2 — nunca dos bumps para un solo release del cerebro.

### Hallazgo 2 — por qué el registro es exactitud, no estilo

La grounded query es el **instrumento de medición** de visibilidad AEO: la pregunta que se le manda al
motor debe ser la que un usuario del mercado haría. `¿qué pintura me recomendás?` y
`¿qué pintura me recomiendas?` no son la misma consulta para un motor: distinto fraseo, distinto
retrieval, distinto conjunto de marcas citadas. Medir con la primera en un mercado chileno o mexicano es
medir otra cosa. El prompt hoy pide `tono natural de usuario real` **escrito en voseo**, que es
exactamente la instrucción contradictoria que hace que el registro sangre.

Por eso el fix no es sólo "corregir las tildes de los imperativos": es **declarar el registro del output
como dato explícito del prompt**, igual que ya se hace en `LOCALE_VOICE`
(`article-ideation.ts:119-123`), para que el registro deje de depender de cómo esté escrita la
instrucción.

### El efecto colateral del bump que hay que cerrar

`grounded-query-reader.ts:89-90`:

```ts
const grounded =
  row.generationStrategy === 'llm' && row.systemPromptVersion === AUTHOR_SEO_GROUNDED_SYSTEM_PROMPT_VERSION
```

Igualdad exacta contra la constante **vigente**. Bumpear la constante hace que todo draft histórico
autorado con `aeo-author.seo-grounded.v2` empiece a reportar `groundingMode: 'baseline_fallback'` — es
decir, el sistema le diría al operador que un draft realmente grounded no lo es. Mismo patrón en
`grounded-query-bridge.ts:311` y `:317` (dedupe y clasificación del draft existente).

El fix es un **conjunto de versiones grounded conocidas** (append-only, la vigente primero), no un
`if` por versión. Regla para el futuro: cada bump agrega la versión nueva al conjunto y **nunca** quita
una histórica.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (techo/rango) → Slice 2 (registro + bump + back-compat) → Slice 3 (eval + evidencia).
- **Si Slice 1 elige la Opción B** (cambiar el texto del rango en el prompt), Slice 1 y Slice 2 se
  fusionan en un **único bump de versión**: dos bumps para un mismo release del cerebro romperían la
  trazabilidad y obligarían a dos evals.
- La back-compat del reader/dedupe **debe shippear en el MISMO commit que el bump**, nunca después: entre
  el bump y el fix, todo draft grounded histórico se lee como fallback.
- Slice 3 no puede ejecutarse antes de que Slice 2 esté mergeado: la eval evalúa el cerebro nuevo, no el
  viejo.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El bump reclasifica drafts históricos como `baseline_fallback` | AEO / provenance | high si no se mitiga | conjunto de versiones grounded conocidas en reader + dedupe, en el mismo commit; test de no-regresión con versión histórica | `groundingMode` de un draft `v2` conocido; sanity read-only sobre `grader_prompt_sets` |
| El cambio de registro degrada la calidad de las preguntas (no sólo el voseo) | AEO quality | medium | eval de naturalidad obligatoria sobre autoría real antes de cerrar; comparar contra las 15 preguntas evaluadas en `TASK-1666` | eval humana registrada; `computeSeoSeedCoverage` sin uncovered |
| Bajar el techo rompe un consumer que ya mandaba lotes grandes | UI / MCP / Nexa | low | el consumer vigente manda 1 candidato; grep de callers antes del cambio; `candidate_limit_exceeded` es error existente y explícito | `candidate_limit_exceeded` en logs/Sentry post-deploy |
| El bump reabre autoría del mismo intent y gasta una llamada LLM extra | Provider cost | low | efecto esperado y declarado; el authoring está detrás de flag OFF en producción; el dedupe sigue operando dentro de la versión nueva | `usage` del proveedor en el smoke; sin drafts duplicados dentro de la misma versión |
| Se bumpea sólo una de las dos versiones | AEO / eval | medium | test que ancla ambas constantes y la composición `startsWith`; regla escrita en el invariante | `author-prompt-set.test.ts` en rojo |
| Se edita el prompt sin bump (regresión del proceso) | AEO / trazabilidad | medium | test que ancla el par (texto, versión); regla en el doc de arquitectura | test de anclaje en rojo |

### Feature flags / cutover

Sin flag nuevo. El cambio queda gobernado por los flags existentes:
`GROWTH_SEO_ENABLED`, `GROWTH_AI_VISIBILITY_GRADER_ENABLED` y sobre todo
`GROWTH_AI_VISIBILITY_PROMPT_AUTHORING_ENABLED` (default OFF en producción). Con el authoring apagado el
camino es `baseline_fallback` y el texto del prompt nunca se envía a un proveedor, así que el cutover
efectivo del cerebro nuevo ocurre recién cuando el owner AEO habilita el authoring para un smoke
autorizado. **No registrar flag nuevo en `FEATURE_FLAG_STATE_LEDGER.md`** — esta task no declara ninguno.

### Rollback plan per slice

El cambio es **repo-only**: sin migración, sin DDL, sin backfill, sin infra y sin flag nuevo. Todo
rollback es `git revert` + redeploy del portal; ninguna fila de `grader_prompt_sets` se reescribe en
ningún sentido, así que no hay estado que reparar a mano.

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `git revert` del PR + redeploy. Sólo cambia una constante numérica (y el rango del prompt si se eligió Opción B, en cuyo caso arrastra el rollback de Slice 2). | <10 min | sí |
| Slice 2 | `git revert` + redeploy. **Cuidado**: al revertir, la constante vuelve a `seo-grounded.v2`, pero quedarán drafts persistidos con la versión nueva; el conjunto de versiones grounded reconocidas debe conservar AMBAS también en el estado revertido, o el revert reintroduce la reclasificación en espejo. Verificar antes de revertir. | <15 min | parcial |
| Slice 3 | N/A — evidencia y documentación, sin runtime. Un resultado de eval malo NO se revierte: bloquea el cierre y devuelve a Slice 2. | — | n/a |

### Production verification sequence

1. Merge a `develop` con los tests focales verdes y `pnpm local:check` limpio.
2. Sanity read-only contra PG (proxy): tomar un `set_id` histórico con
   `system_prompt_version = 'aeo-author.seo-grounded.v2'` y confirmar vía `readGroundedQueryDraft` que
   sigue devolviendo `groundingMode: 'grounded_llm'`. **Stop & escalate si devuelve fallback.**
3. Con `GROWTH_AI_VISIBILITY_PROMPT_AUTHORING_ENABLED` habilitado sólo para el smoke autorizado (owner
   AEO + costo aprobado): crear un draft grounded sobre candidatos reales de discovery.
4. Verificar sobre ese draft: versión = la nueva; `computeSeoSeedCoverage` sin `uncoveredCandidateIds`;
   0 preguntas de descubrimiento con `{{brand}}`; 0 formas de voseo en el texto de las preguntas;
   0 keywords copiadas 1:1.
5. Eval humana de naturalidad registrada en la task (queries, divergencias, modelo, versión).
6. Devolver el flag de authoring a su estado previo. Ningún set se aprueba ni se activa como parte de
   esta task.
7. Monitorear `captureWithDomain` (`source: seo_grounded_query_bridge`) y la frecuencia de
   `coverageNotice` durante los siguientes drafts.

### Out-of-band coordination required

Aprobación del owner AEO para (a) habilitar temporalmente el prompt authoring y gastar la llamada LLM del
smoke, y (b) revisar el draft resultante en la eval de naturalidad. Sin secreto nuevo, sin scope Entra
nuevo, sin cambio en Vercel/Cloud Run, sin coordinación con proveedores SEO.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El techo de candidatos del bridge y el rango de preguntas del cerebro son aritméticamente
      compatibles: con el techo vigente, cada candidate puede recibir ≥1 pregunta sin exceder
      `MAX_AUTHORED_PROMPTS`.
- [ ] Existe un test que falla si alguien reintroduce la incompatibilidad (techo > preguntas honrables).
- [ ] El techo quedó consistente en sus dos usos del bridge: validación `candidate_limit_exceeded` y
      `limit` de `readKeywordDiscovery`.
- [ ] La decisión Opción A vs Opción B quedó escrita con su trade-off en el código y en el `## Delta` de
      la task; no se despachó eligiendo sin argumentar.
- [ ] `AUTHOR_SYSTEM_PROMPT` y `buildAuthorPromptSetPrompt` no contienen formas de voseo, y existe un test
      que lo verifica.
- [ ] El prompt declara explícitamente el registro esperado del output (neutro latinoamericano, tuteo, sin
      voseo ni modismos locales), no sólo el idioma.
- [ ] `AUTHOR_SYSTEM_PROMPT_VERSION` y `AUTHOR_SEO_GROUNDED_SYSTEM_PROMPT_VERSION` fueron bumpeadas ambas,
      y ninguna versión previa fue editada en sitio.
- [ ] `grounded-query-reader.ts` y el dedupe de `grounded-query-bridge.ts` reconocen el conjunto de
      versiones grounded conocidas; un draft persistido con `aeo-author.seo-grounded.v2` sigue leyéndose
      `groundingMode: 'grounded_llm'`, verificado con test y con sanity contra PG real.
- [ ] Se ejecutó eval de naturalidad sobre queries producidas por **autoría LLM real** con el cerebro
      nuevo, y su resultado está registrado en la task (queries, divergencias, modelo, versión). Sin esta
      evidencia la task NO se puede declarar complete.
- [ ] La eval confirma: 0 voseo en las queries, 0 copias 1:1 de keyword, 0 preguntas de descubrimiento con
      `{{brand}}`, y `computeSeoSeedCoverage` sin `uncoveredCandidateIds`.
- [ ] No se agregó flag nuevo, ni migración, ni capability, ni scope OAuth, ni evento outbox.
- [ ] El shape público del bridge y del reader (tipos, error codes, campos) no cambió.
- [ ] `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` registra el delta:
      registro del output, versiones vigentes y la regla "el techo de candidatos es función del rango de
      preguntas".
- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Verification

- `pnpm task:lint --task TASK-1695`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm vitest run src/lib/growth/ai-visibility/__tests__/author-prompt-set.test.ts src/lib/growth/seo/__tests__/grounded-query-bridge.test.ts src/lib/growth/seo/__tests__/grounded-query-bridge-parity.test.ts`
- `pnpm test` (suite completa, gate de cierre)
- sanity read-only de `greenhouse_growth.grader_prompt_sets` vía proxy: draft histórico `v2` sigue
  `grounded_llm`
- smoke de autoría LLM real + eval de naturalidad (flags/costo/owner aprobados)
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] El estado final distingue `complete` de `code complete, rollout pendiente`: sin la eval de
      naturalidad ejecutada y registrada, el estado correcto NO es `complete`.
- [ ] Chequeo de impacto cruzado ejecutado sobre `TASK-1667`, `TASK-1668` y `TASK-1669` (consumers
      editoriales aguas abajo del mismo motor).
- [ ] El estado final de `grounded-query-bridge.ts` y `grounded-query-reader.ts` quedó declarado en
      `Handoff.md` para **`TASK-1713`** (barrel AEO), que los reescribe después y no debe
      rebasar a ciegas sobre el techo de candidatos ni las versiones nuevas del cerebro.

## Follow-ups

- Consumer de lote en la UI de `TASK-1665` (selección múltiple de candidatos → un draft), que es lo que
  ejercitaría el techo en producción. Hoy no existe y por eso el hallazgo 1 es latente.
- Convertir la eval de naturalidad en artefacto repetible dentro de `src/lib/growth/ai-visibility/evals/`
  (hoy el precedente de `TASK-1666` fue eval humana registrada en la task, no un harness reutilizable).
- Evaluar si `MAX_AUTHORED_PROMPTS = 18` y `AUTHOR_MAX_OUTPUT_TOKENS = 2200` siguen siendo los valores
  correctos para lotes grandes — decisión de producto con costo de tokens, deliberadamente fuera de esta
  task.
- Guardrail genérico "prompt LLM sin voseo" (lint o test transversal) si aparece un segundo caso: el scan
  de este ciclo dejó el dominio limpio salvo `author-system-prompt.ts`.

## Open Questions

- ¿Opción A (bajar el techo) u Opción B (escalar el rango)? La auditoría recomienda A y deja el
  trade-off argumentado en §Detailed Spec, pero la decisión final es del agente que toma la task, y debe
  quedar escrita con su razón.
- Si se elige A: ¿el número exacto es 8, o se deriva de la constante del rango del prompt para que los
  dos números no puedan volver a divergir?
- ¿La eval de naturalidad de esta task se ejecuta como eval humana registrada (precedente `TASK-1666`) o
  se aprovecha para sembrar el harness repetible? Lo segundo es más caro y podría ser el follow-up.
