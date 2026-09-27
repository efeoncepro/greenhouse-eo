# TASK-1929 — Plan de deck contra el catálogo de recetas: catálogo en runtime, validador y propuesta del agente

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
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
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content|platform`
- Blocked by: `TASK-1927`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Un deck de «La órbita» no es una lista libre de láminas: el catálogo de 69 recetas aprobado el 2026-09-27 fija qué
portada va con qué contraportada, dónde va el eslogan, qué familias entran en cada documento, qué variantes no se ponen
seguidas, qué plates no se repiten y cuánto texto cabe en cada slot. Esta task convierte esas reglas en un contrato
ejecutable: el catálogo pasa a módulo de runtime generado desde el JSON, `validateDeckPlan` las verifica con códigos
tipados encima de la validación de documento de AXIS, y `proposeDeckPlan` deja que un agente proponga el plan eligiendo
recetas por id —nunca plantillas— con salida estructurada validada fail-closed. La confirmación humana y el camino por
API, Nexa y MCP los cablea TASK-1932.

## Why This Task Exists

- **Las reglas del deck viven en prosa.** El README del catálogo, la norma §4.6 y el manual describen la alternancia
  foto ↔ sin foto, el eslogan sólo en el cierre, los pares `cover↔close`/`variant`/`sequence`, las familias que «no
  van» por documento, el plate P1 que no se repite y los `maxChars` medidos. Hoy las revisa una persona sobre el PDF
  final; un agente que arma un deck no tiene nada que le diga «esto no se puede».
- **AXIS valida el documento, no el catálogo.** `resolveSurfaceDocument` (que TASK-1927 trae a Greenhouse) sabe que la
  portada va primero, el cierre al final y que un brochure necesita una página de servicio. No conoce las 69 recetas,
  sus pares, sus plates ni sus slots. Reimplementar lo que AXIS ya valida sería una segunda fuente; no validar lo demás
  deja pasar decks que la norma prohíbe.
- **El agente debe proponer, no decidir.** El operador pidió que el agente elija recetas por id y una persona confirme.
  Sin un validador determinista, la propuesta del agente sería texto que alguien revisa a ojo.
- **El JSON no se puede leer en runtime.** Vive en `docs/operations/` y leerlo con `fs` desde un módulo de ruta infla
  la función de Vercel (lección de Turbopack registrada). Hace falta un artefacto generado y un check de drift.

## Goal

- El catálogo de recetas existe como módulo tipado de runtime, generado desde el JSON aprobado y con check de drift.
- `validateDeckPlan(plan)` devuelve issues tipados y deterministas para cada regla del catálogo, sin repetir ninguna
  regla que AXIS ya valida.
- `proposeDeckPlan(context)` produce un plan validado o falla cerrado con los issues; nunca entrega un plan inválido
  como si fuera bueno.
- Operadores y agentes pueden validar y proponer un plan desde la CLI local; TASK-1932 lo expone por API, Nexa y MCP
  sin reimplementar nada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md` (un autor nunca elige `template`;
  selector determinista; molde `propose → confirm` del intake agent)
- `docs/architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md` (§5-ter: por qué el selector no es agéntico
  y por qué el outline sí propone)
- `docs/architecture/agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md` (el LLM nunca escribe; propose → confirm →
  execute)
- `docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md` (§4.6 deck, portadas y contraportadas,
  recetas por lámina; §6 reglas verificables)
- `docs/operations/brand-graphic-line/deck-recipes/README.md` y `EFEONCE_DECK_SLIDE_RECIPES_V1.json`
- `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` (§invariantes de providers LLM: cliente canónico de
  `src/lib/ai/`)
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- **Una sola fuente por regla.** Lo que `resolveSurfaceDocument` de AXIS valida (orden de portada y cierre, página de
  servicio, línea del marco, alternancia de modo cuando AXIS la emite) se lee de su resultado; el validador de esta task
  sólo agrega reglas del catálogo que AXIS no conoce. Un test verifica que ningún código propio duplica uno de AXIS.
- El agente propone **ids de receta**; la plantilla la deriva el mapper. Un plan que nombra una plantilla o un
  `contentType` en vez de una receta es inválido.
- El LLM se llama sólo por el cliente canónico de `src/lib/ai/` (helper de salida estructurada vigente); nunca un SDK
  instanciado en el dominio ni una clave en código.
- La propuesta **no escribe nada**: devuelve un plan y sus issues. La confirmación y la ejecución son de los consumers
  (TASK-1932 y TASK-1921).
- Sin `fs` en runtime: el catálogo se importa como módulo generado.

## Normative Docs

- `docs/manual-de-uso/creative/componer-deck-con-recetas.md`
- `docs/tasks/in-progress/TASK-1927-surface-composition-0-1-2-greenhouse-integration.md` (entrada de documento y
  `resolveSurfaceDocument`)
- `docs/tasks/to-do/TASK-1419-deck-orchestrator-outline.md` (orquestador del outline de las decks de licitación; mismo
  molde, catálogo distinto)
- `src/lib/commercial/tenders/proposals/intake-agent.ts` (molde de propuesta estructurada validada fail-closed)

## Dependencies & Impact

### Depends on

- `TASK-1927`: entrada de documento pura (`src/lib/brand-surfaces/document.ts`) y `resolveSurfaceDocument` en el árbol
  de consumo; sin ellos no hay piso AXIS sobre el que validar el catálogo.
- `docs/operations/brand-graphic-line/deck-recipes/EFEONCE_DECK_SLIDE_RECIPES_V1.json` (esquema
  `efeonce.deck-slide-recipes.v1`) y su validador `scripts/creative/deck-recipes/render-index.mjs`.
- Cliente LLM canónico en `src/lib/ai/` (`anthropic.ts`, `google-genai.ts`, `openai.ts`) y su helper de salida
  estructurada `[verificar]` nombre vigente.

### Blocks / Impacts

- `TASK-1930`: los binders llenan un plan válido y usan el contrato de slots del catálogo generado.
- `TASK-1932`: expone `proposeDeckPlan` y `validateDeckPlan` por API, Nexa y MCP, y persiste el plan confirmado.
- `TASK-1921`: su command de documento acepta un plan ya validado por esta task.
- `TASK-1928`: el validador informa «receta sin plantilla» leyendo el registro del composer que 1928 amplía.
- `TASK-1419`: mismo molde de outline para otro catálogo; no nace un segundo fan-out (ver Out of Scope).

### Files owned

- `src/lib/brand-surfaces/deck-recipes/catalog.generated.ts` `[nuevo, generado]`
- `src/lib/brand-surfaces/deck-recipes/types.ts`, `validate.ts`, `issues.ts`, `propose.ts`, `index.ts` `[nuevos]`
- `src/lib/brand-surfaces/deck-recipes/__tests__/**` y fixtures de eval `[nuevos]`
- `scripts/creative/deck-recipes/render-index.mjs` (genera también el módulo y lo verifica con `--check`)
- `scripts/brand-surfaces/deck-plan.ts` `[nuevo]` y el script `brand:deck-plan` en `package.json`
- `docs/operations/brand-graphic-line/deck-recipes/README.md` (sección del validador y sus códigos)
- `docs/manual-de-uso/creative/componer-deck-con-recetas.md` (paso de validación)
- `docs/documentation/creative/linea-grafica-efeonce.md` (delta funcional)

## Current Repo State

### Already exists

- Catálogo JSON de 69 recetas con `documents`, `pairsWith` (`cover↔close`, `variant`, `sequence`), `slots` con
  `maxChars` medido y `required`, `photo.plate`, `selection` y `preferInstead`; validación estructural por
  `pnpm brand:deck-recipes`.
- Mapper puro `planSurfacePiece` y, tras TASK-1927, la entrada de documento pura con `resolveSurfaceDocument`.
- Molde de propuesta estructurada validada fail-closed en `src/lib/commercial/tenders/proposals/intake-agent.ts` y
  motor de chapter-authors con `evidenceRef` en `src/lib/commercial/tenders/proposals/authoring/`.

### Gap

- No hay catálogo de recetas en runtime ni tipos del plan del deck.
- Ninguna regla del catálogo (pares, familias por documento, eslogan, plates, slots) se verifica por código.
- No existe propuesta de plan por agente ni eval que la mida.
- La CLI sólo compone una pieza o un documento; no valida ni propone un plan de deck.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/brand-surfaces/deck-recipes/` (catálogo generado, validador puro y propuesta), `scripts/brand-surfaces/deck-plan.ts` (CLI local)
- Future candidate home: `domain-package`
- Boundary: `validateDeckPlan(plan)` y `proposeDeckPlan(context)` son el único contrato; los consumen la CLI, el command de TASK-1921 y el command y la acción de TASK-1932; nadie lee el JSON de `docs/` en runtime
- Server/browser split: el validador es puro e isomórfico (sin `server-only`); `proposeDeckPlan` es `server-only` porque llama al cliente LLM canónico; ninguno llega a un Client Component en esta task
- Build impact: sin dependencias nuevas; agrega un módulo generado de tamaño acotado (69 recetas) que reemplaza cualquier lectura de filesystem
- Extraction blocker: `none` (sin DB ni transacción; la propuesta depende sólo del cliente LLM canónico)

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: `EFEONCE_DECK_SLIDE_RECIPES_V1.json` (aprobado por el operador) → módulo generado
  `catalog.generated.ts`; contrato AXIS `efeonce.surface-composition` para las reglas de documento
- Consumidores afectados: CLI local, command de TASK-1921, command y acción Nexa/MCP de TASK-1932, binders de TASK-1930
- Runtime target: `local` en esta task; `staging`/`production` cuando lo consuma TASK-1932

### Contract surface

- Contrato existente a respetar: `resolveSurfaceDocument` (AXIS, vía TASK-1927), `planSurfacePiece`, esquema
  `efeonce.deck-slide-recipes.v1`
- Contrato nuevo o modificado: tipos `DeckPlan`/`DeckPlanSlide`/`DeckPlanIssue`, funciones `validateDeckPlan` y
  `proposeDeckPlan`, CLI `pnpm brand:deck-plan`
- Backward compatibility: `compatible` — no cambia `planSurfacePiece` ni la entrada de documento
- Full API parity: el primitive vive en `src/lib`; CLI hoy, y API + Nexa + MCP por TASK-1932, todos sobre las mismas
  dos funciones

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna tabla; artefacto generado versionado en git
- Invariantes que no se pueden romper:
  - Un plan inválido nunca sale de `proposeDeckPlan` como válido: o pasa `validateDeckPlan` sin errores o devuelve los
    issues.
  - El plan referencia recetas por id; nombrar plantilla o `contentType` es error.
  - Ninguna regla se valida dos veces (AXIS o catálogo, nunca ambos).
  - El módulo generado coincide byte a byte con lo que produce el generador desde el JSON (`--check`).
- Write-target allowlist: `N/A — no escribe en ninguna tabla`
- Tenant/space boundary: el contexto de `proposeDeckPlan` es allowlisted (tipo de documento, audiencia, línea de
  servicio, hechos opcionales ya autorizados por el consumer); no acepta ids de organización ni lee datos por su cuenta
- Idempotency/concurrency: `validateDeckPlan` es pura y determinista; `proposeDeckPlan` no escribe, así que no necesita
  clave de idempotencia; reintentos acotados
- Audit/outbox/history: sin evento propio; el consumer que confirma registra auditoría y outbox

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: disponible sólo por CLI local; ningún runtime productivo lo invoca hasta TASK-1932 (flag de esa task)
- Backfill plan: sin backfill
- Rollback path: `revert PR`
- External coordination: sin coordinación externa

### Security and access

- Auth/access gate: sin endpoint en esta task; los consumers aplican sus capabilities
- Sensitive data posture: sin PII; el contexto de propuesta excluye loaded cost, margen y datos personales
- Error contract: issues tipados con código estable (`slot-over-max-chars`, `pair-cover-close-mismatch`, …); errores
  del LLM saneados; `captureWithDomain` con el dominio de marca cuando el consumer lo invoque en runtime
- Abuse/rate-limit posture: reintentos de propuesta acotados (máximo declarado en el plan); sin llamadas en bucle

### Runtime evidence

- Local checks: tests del validador por regla (válido e inválido), paridad del módulo generado, eval de la propuesta
  con planes golden y adversariales
- DB/runtime checks: `N/A — sin base de datos`
- Integration checks: una corrida real de `pnpm brand:deck-plan -- --propose` con el cliente LLM canónico, registrada
  con costo
- Reliability signals/logs: sin señal nueva; la observabilidad llega con el consumer runtime (TASK-1932)
- Production verification sequence: sin impacto productivo en esta task; la verificación en staging es de TASK-1932

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

### Capability Definition of Done — Full API Parity gate

- [ ] **Lógica en el primitive, no en la UI.** Las reglas viven en `src/lib/brand-surfaces/deck-recipes/`.
- [ ] **Modelada como recurso/contrato, no como click-handler.**
- [ ] **Read** como función pura reutilizable; la propuesta no escribe.
- [ ] **Capability + grant en el MISMO PR:** `N/A — esta task no gatea ni expone endpoint; la capability la aplica TASK-1932`.
- [ ] **Camino programático declarado:** CLI `pnpm brand:deck-plan` + follow-up explícito TASK-1932 (API, Nexa, MCP).
- [ ] **Write apto para `propose → confirm → execute`:** la propuesta es el paso `propose`; confirm y execute son de TASK-1932/TASK-1921.
- [ ] **Un primitive, muchos consumers:** CLI, TASK-1921 y TASK-1932 llaman a las mismas dos funciones.
- [ ] **Parity check = SÍ** una vez cerrada TASK-1932.

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

### Slice 1 — Catálogo en runtime

- `render-index.mjs` (o un generador hermano) emite `catalog.generated.ts` con los tipos de receta, slot, par y foto;
  `pnpm brand:deck-recipes -- --check` falla si el módulo no coincide con el JSON.
- `types.ts`: `DeckDocumentKind` (`proposal` | `brochure` | `pitch` | `qbr`), `DeckPlan`, `DeckPlanSlide`
  (`recipeId`, `slots`, `plateRef?`), `DeckPlanIssue` (`code`, `severity`, `slideIndex?`, `recipeId?`, `detail`).
- Las recetas de AXIS declaradas en `axisRecipeFamilies` (`cover-classic`, `close-classic`) son válidas en pitch y QBR.

### Slice 2 — Validador puro

- `validateDeckPlan(plan)`: primero delega el piso de documento en `resolveSurfaceDocument` (vía la entrada de
  documento de TASK-1927) y adjunta sus issues tal cual; después aplica las reglas del catálogo (ver Detailed Spec).
- Test por regla con un plan válido mínimo y el inválido que la dispara; test de no duplicación contra los códigos de
  AXIS.

### Slice 3 — Propuesta del agente

- `proposeDeckPlan(context)`: contexto allowlisted → salida estructurada por el cliente canónico de `src/lib/ai/` →
  `validateDeckPlan` → si hay errores, un reintento acotado con los issues como retroalimentación → si persisten,
  devuelve `{ ok: false, issues }`.
- Eval: planes golden (brochure general, propuesta con portada sin foto, pitch, QBR) y adversariales (eslogan en
  portada, dos portadas con foto, cotización en brochure, variante seguida, plate repetido, texto sobre `maxChars`).

### Slice 4 — CLI y documentación

- `pnpm brand:deck-plan -- --plan <plan.json>` (valida y lista issues con código) y
  `-- --propose --context <context.json>` (propone y valida; imprime costo del LLM).
- README del catálogo (códigos y cómo leerlos), manual (paso de validación antes de componer) y doc funcional.

## Out of Scope

- Confirmación humana, persistencia del plan, endpoint, acción de Nexa y tool MCP: TASK-1932.
- Llenar slots con datos reales: TASK-1930.
- Plantillas: TASK-1927 y TASK-1928.
- Elegir o registrar plates: TASK-1931 (el validador sólo detecta el plate repetido dentro del plan).
- Un orquestador con fan-out de chapter-authors: es TASK-1419 para las decks de licitación; esta task no crea otro. Si
  una propuesta necesita capítulos autorados, TASK-1932 decide cómo converger con ese orquestador.
- Reglas de valor visual (contraste, 3×, acento): las verifican las plantillas y el gate (TASK-1928).

## Detailed Spec

**Reglas del catálogo (códigos de ejemplo; el plan fija los definitivos):**

| Código | Severidad | Regla |
|---|---|---|
| `recipe-unknown` | error | el id no existe en el catálogo ni en `axisRecipeFamilies` |
| `recipe-not-for-document` | error | la receta no declara el documento del plan en `documents` |
| `template-named-instead-of-recipe` | error | el plan nombra una plantilla o un `contentType` |
| `cover-close-photo-mode-repeats` | error | portada y contraportada del mismo documento ambas con foto o ambas sin foto (sólo si AXIS no lo emite) |
| `pair-cover-close-mismatch` | error | la contraportada no es pareja `cover↔close` de la portada según `pairsWith` |
| `slogan-on-cover` | error | el eslogan aparece en la portada |
| `slogan-count` | error | el eslogan aparece más de una vez en el documento |
| `close-message-mismatch` | error | «¿Conversamos?» en una propuesta o «Empower your Growth» fuera del cierre de propuesta |
| `family-not-allowed` | error | familia que el documento excluye (cotización en brochure, pitch o QBR; páginas de venta en QBR) |
| `next-steps-after-diagnosis` | error | `decision-next-steps` en una propuesta cuyo contexto declara el diagnóstico hecho |
| `variant-adjacent` | error | dos recetas del mismo par `variant` en el mismo deck |
| `sequence-order` | error | un par `sequence` fuera de orden |
| `plate-repeated` | error | el mismo plate en dos láminas del plan |
| `slot-required-missing` | error | slot `required` vacío |
| `slot-over-max-chars` | error | texto que supera el `maxChars` medido |
| `recipe-without-template` | warning | receta aprobada sin plantilla todavía (se compone como maqueta declarada) |
| `section-split-corner-adjacent` | warning | dos secciones partidas con la misma esquina seguidas |
| `rhythm-paper-dark` | warning | tres láminas seguidas del mismo fondo |

**Contexto de propuesta (allowlist):** `document`, `audience` (`room` | `reading`), `line?`, `diagnosisDone?`,
`sections` (esqueleto deseado), `availableFacts?` (nombres de hechos que el consumer ya autorizó, sin valores
sensibles). Nada de ids de organización, montos, loaded cost ni datos personales.

**Salida:** `{ ok: true, plan, issues: DeckPlanIssue[] /* sólo warnings */ }` o `{ ok: false, issues }`.

## Rollout Plan & Risk Matrix

Cambio aditivo en `src/lib` con CLI local: no hay endpoint, tabla ni runtime productivo que lo llame en esta task. El
primer consumo productivo llega con TASK-1932 detrás de su flag.

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4.
- Slice 2 no se cierra sin el test de no duplicación contra AXIS.
- Slice 3 no se cierra sin el eval golden + adversarial en verde.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Una regla se valida en AXIS y en el catálogo con resultados distintos | contrato AXIS | medium | el validador delega el piso en `resolveSurfaceDocument`; test de no duplicación | dos códigos para la misma lámina |
| El módulo generado queda desalineado del JSON aprobado | catálogo | medium | `--check` en `pnpm brand:deck-recipes` y en `local:check` `[verificar]` | check rojo |
| La propuesta del agente inventa recetas o nombra plantillas | LLM | medium | salida estructurada + validación fail-closed + eval adversarial | eval rojo |
| Una nota vieja del JSON contradice una decisión del operador | catálogo | low | el README ya lista las notas superadas; el validador sólo lee campos estructurados, no `notes` | revisión del plan |
| Costo LLM descontrolado en la CLI | provider | low | reintento único acotado y costo impreso por corrida | costo por corrida |

### Feature flags / cutover

Sin flag: aditivo y repo-only. Nada productivo lo invoca hasta que TASK-1932 lo cablee detrás de su propio flag.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `git revert` del generador y el módulo | < 5 min | sí |
| Slice 2 | `git revert` del validador | < 5 min | sí |
| Slice 3 | `git revert` de la propuesta y su eval | < 5 min | sí |
| Slice 4 | `git revert` de la CLI y los docs | < 5 min | sí |

### Production verification sequence

1. Local: tests focales de `src/lib/brand-surfaces/deck-recipes`, `pnpm brand:deck-recipes -- --check`.
2. Local: `pnpm brand:deck-plan -- --plan` sobre los fixtures golden (sin issues) y adversariales (issues esperados).
3. Local: una corrida real de `--propose` por tipo de documento, con costo registrado en el cierre.
4. Cierre: `pnpm local:check` y `pnpm test` completo; `pnpm build` sólo con autorización del operador.

### Out-of-band coordination required

- Sin coordinación externa. Si el operador cambia una regla del deck, se corrige primero la norma y el JSON y después
  el validador, nunca al revés.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `catalog.generated.ts` existe, se genera desde el JSON y `pnpm brand:deck-recipes -- --check` falla si difieren.
- [ ] Ningún módulo de `src/` lee `EFEONCE_DECK_SLIDE_RECIPES_V1.json` con `fs` en runtime.
- [ ] `validateDeckPlan` implementa cada código de la tabla de Detailed Spec con un test que lo dispara y otro que no.
- [ ] Un test verifica que ningún código propio duplica un issue de `resolveSurfaceDocument`.
- [ ] Un plan que nombra una plantilla o un `contentType` en vez de una receta es inválido (test).
- [ ] `proposeDeckPlan` llama al LLM sólo por el cliente canónico de `src/lib/ai/` y devuelve `ok: false` con issues cuando no logra un plan válido (test con mock).
- [ ] El eval golden (brochure, propuesta, pitch, QBR) y el adversarial pasan en verde.
- [ ] `pnpm brand:deck-plan` valida y propone desde la CLI, e imprime el costo del LLM en `--propose`.
- [ ] El README del catálogo, el manual y la doc funcional explican el validador y sus códigos.

## Verification

- `pnpm local:check`
- `pnpm typecheck`
- `pnpm test` (completo al cierre; focal `src/lib/brand-surfaces/deck-recipes`)
- `pnpm brand:deck-recipes -- --check`
- `pnpm brand:deck-plan -- --plan <fixture>` y `-- --propose --context <fixture>`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `## Delta` en TASK-1930, TASK-1932 y TASK-1921 con la firma final de `validateDeckPlan` y `proposeDeckPlan`

## Follow-ups

- Convergencia del outline de las decks de licitación (TASK-1419) y del plan de recetas en un solo nodo con catálogo
  inyectado, cuando ambos existan.

## Open Questions

- ¿El JSON sigue siendo la fuente aprobada en `docs/operations/` con un módulo generado, o se mueve a `src/lib/` y el
  README pasa a generarse desde allí? Recomendación: mantener el JSON donde el operador lo aprueba y generar el módulo,
  para no duplicar la fuente.
- ¿`rhythm-paper-dark` es warning o se retira si el operador prefiere revisarlo a ojo?
