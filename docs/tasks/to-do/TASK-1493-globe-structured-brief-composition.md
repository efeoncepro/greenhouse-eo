# TASK-1493 — Structured Brief Composition + Recipe Registry

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `creative|ai|platform`
- Blocked by: `TASK-1481`
- Branch: `task/TASK-1493-globe-structured-brief-composition`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El brief creativo del Model Lab hoy es un `prompt?: string` plano (`packages/contracts/src/index.ts`,
`PrepareExperimentPayloadV1`): el caller manda texto opaco y el backend no gobierna nada de su
estructura. Esta task convierte el brief en una **estructura tipada de ingredientes con pesos**
(sujeto, estilo, luz, encuadre, mood, paleta) que se **compila server-side** a la instrucción del
provider por el seam, y agrega un **registry de recetas/plantillas reusables por workspace** (hoy
`GoldenBriefFixtureV1` es fixture de test, no autorable). Habilita el Prompt Studio, las Recetas y la
plantilla curada del Globe Studio Workbench (`TASK-1474`), sin tocar el provider seam ni la UI.

## Why This Task Exists

El diseño del Globe Studio Workbench modela el paso 1 (Brief) como una agencia creativa: un compositor
de ingredientes tipados con pesos, recetas reusables y plantillas curadas. El backend real recibe un
string opaco (`prompt?: string`, único campo creativo del contrato del run) y no tiene ningún concepto
de ingrediente, peso, receta ni plantilla autorable. El gap analysis lo marca como el más grande del
paso 1: 🔴 casi nulo (`docs/architecture/creative-studio/GLOBE_STUDIO_WORKBENCH_BACKEND_GAP_ANALYSIS_V1.md`,
categoría ②).

Compilar un brief estructurado a una instrucción de provider **es business logic** — decidir cómo
ordenar/pesar ingredientes, cómo mapear paleta y mood, cómo resolver conflictos. Esa lógica no puede
vivir en la UI (violaría la tesis de TASK-1474 "thin client, cero business logic en la UI") ni
duplicarse por consumer. Tiene que nacer como un **command gobernado transport-neutral** con Full API
Parity, para que UI, Nexa, MCP, CLI y worker la operen por construcción. Y las recetas necesitan un
recurso durable por workspace: hoy `GoldenBriefFixtureV1` es una constante de test (`FIXTURES` en
`packages/domain/src/evaluation.ts:34`), no algo que un workspace pueda autorar, versionar ni reusar.

## Goal

- Un tipo de brief estructurado transport-neutral (`StructuredBriefV1`) con ingredientes tipados
  (sujeto/estilo/luz/encuadre/mood/paleta) y pesos, aceptado por `PrepareExperimentPayloadV1` de forma
  aditiva y retrocompatible con el `prompt?: string` plano vigente.
- Un compilador server-side (`compileStructuredBrief`) que convierte el brief estructurado a la
  instrucción del provider **antes** de llegar al adapter, determinista y con evidencia en el manifest
  (nunca en la UI, nunca inline en un adapter).
- Un registry de recetas/plantillas reusables por workspace: command para autorar/versionar una receta
  y reader para listarla/materializarla en un brief, con gobernanza tenant-safe (el fixture de test deja
  de ser el único camino).
- Full API Parity: brief-compose + recipe-registry como command/reader del spine con coverage
  (`ui`/`mcp` pueden nacer `policy-blocked` como el resto del Lab), no como campo de UI ad hoc.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/creative-studio/GLOBE_STUDIO_WORKBENCH_BACKEND_GAP_ANALYSIS_V1.md` (categoría ②)
- (repo hermano) `efeonce-globe/docs/architecture/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`
- Skill `greenhouse-globe` (obligatoria al tocar el boundary Globe↔Greenhouse) + `arch-architect`
  (forma/decisiones del contrato).

Reglas obligatorias:

- **Boundary duro:** el CÓDIGO vive en `efeonce-globe` (`packages/contracts`, `packages/domain`,
  `apps/creative-runner`); Greenhouse **gobierna** lifecycle/docs, no aloja el runtime.
- **El provider seam es sagrado:** la compilación produce la instrucción textual/estructural que
  consume el `CreativeProviderAdapter`; **NUNCA** llamar un SDK de provider directo desde el compilador
  ni desde el command. El compilador es transport-neutral y agnóstico del provider.
- **La capacidad nace con Full API Parity:** command/reader gobernados + coverage manifest; `ui`/`mcp`
  pueden nacer `policy-blocked` (igual que `LAB_COVERAGE` en `packages/domain/src/model-lab.ts:120-129`).
- **Retrocompatibilidad:** un caller que sigue mandando `prompt?: string` no se rompe. `prompt` plano y
  brief estructurado son mutuamente excluyentes o el estructurado prevalece de forma explícita (nunca
  resolver por precedencia silenciosa — mismo criterio que `editFrom` vs `previousInteractionId` en
  `validatePreparePayload`, `packages/domain/src/model-lab.ts:552-554`).
- **La compilación es business logic server-side:** vive en `packages/domain`, no en la UI ni inline en
  un adapter. Deja evidencia en el manifest para que la instrucción efectiva sea auditable.

## Normative Docs

- `docs/tasks/to-do/TASK-1474-globe-professional-studio-workbench.md` (superficie consumidora; el diseño
  Claude Design ya superó a la task — ver nota de método del gap analysis).
- `docs/tasks/complete/TASK-1481-globe-api-contract-spine-cross-surface-harness.md` (spine sobre el que
  se registran command/reader + coverage).
- `docs/tasks/complete/TASK-1490-globe-cross-model-edit-refine-capability.md` (patrón de campo aditivo
  transport-neutral sobre `PrepareExperimentPayloadV1`; `editFrom` como precedente de vocabulario nuevo
  no ambiguo).

## Dependencies & Impact

### Depends on

- `TASK-1481` — API Contract Spine (`GLOBE_LAB_COMMANDS`/`GLOBE_LAB_READERS`, `TrustedCommandContextV1`,
  coverage manifest, cross-surface harness). `complete`.
- `packages/contracts/src/index.ts` — `PrepareExperimentPayloadV1` (`prompt?: string`, ~línea 321),
  `GoldenBriefFixtureV1` (línea 466), `CreativeCapability` (línea 36).
- `packages/domain/src/model-lab.ts` — `prepareExperiment` (línea 222), `validatePreparePayload`
  (línea 535), `LAB_COVERAGE` (línea 120), registro de commands/readers.
- `packages/domain/src/evaluation.ts` — `FIXTURES` / `listGoldenBriefFixtures` (línea 34/308), hoy la
  única fuente de "briefs" y de test.

### Blocks / Impacts

- `TASK-1474` — Globe Professional Studio Workbench (consume Prompt Studio + Recetas + plantilla curada).

### Files owned

- `efeonce-globe/packages/contracts/src/**` (tipos `StructuredBriefV1`, `BriefIngredient*`,
  `CreativeRecipeV1`, nombres de command/reader nuevos) `[verificar rutas exactas al implementar]`
- `efeonce-globe/packages/domain/src/**` (`compileStructuredBrief`, recipe registry command/reader,
  wiring de coverage) `[verificar]`
- `docs/tasks/to-do/TASK-1493-globe-structured-brief-composition.md`

## Current Repo State

### Already exists

- `PrepareExperimentPayloadV1` con `capability`, `referenceRoute`, `authorizedInputs`, `hardCapCredits`,
  `prompt?: string`, `editFrom?`, `previousInteractionId?` (`packages/contracts/src/index.ts`).
- `validatePreparePayload` valida capability/hardCap/route/inputs/prompt/edit y rechaza vocabularios de
  edit ambiguos (`packages/domain/src/model-lab.ts:535-565`) — patrón a replicar para brief plano vs
  estructurado.
- `prepareExperiment` sólo valida + almacena + acuña `experimentId` (`packages/domain/src/model-lab.ts:222`);
  no interpreta ni compila el brief.
- `GoldenBriefFixtureV1` (schema versionado, rights-declared) y las `FIXTURES` en
  `packages/domain/src/evaluation.ts` — briefs de test, no autorables por workspace.
- Spine + coverage manifest (`LAB_COVERAGE`, `ui`/`mcp` = `policy-blocked`) ya operativos (TASK-1481).

### Gap

- Cero estructura de brief: el único campo creativo es un string opaco. Sin ingredientes, sin pesos,
  sin paleta/mood/luz/encuadre tipados.
- Cero compilación gobernada: nada convierte un brief estructurado a instrucción de provider; si se
  compilara en la UI, sería business logic fuera del primitive.
- Cero recetas/plantillas autorables: `GoldenBriefFixtureV1` es fixture de test; no hay recurso durable
  por workspace ni command/reader para autorar, versionar, listar y materializar recetas.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: repo hermano `efeonce-globe` (`packages/contracts`, `packages/domain`); gobernanza
  documental/lifecycle en `greenhouse-eo` (EPIC-028). No toca `apps/creative-runner` salvo el punto donde
  el brief compilado alimenta al adapter por el seam ya existente.
- Future candidate home: `remain-shared`
  <!-- Dentro del monorepo de Globe; es parte del Model Lab / contrato del run, no un servicio nuevo. -->
- Boundary: `StructuredBriefV1` + `compileStructuredBrief` + recipe-registry command/reader son
  transport-neutral en `packages/contracts` + `packages/domain`; consumers = commands/readers del spine,
  nunca UI directa ni SDK de provider. El compilador produce la instrucción que consume el
  `CreativeProviderAdapter`; el adapter no cambia.
- Server/browser split: server-only (compilación, recipe store, gobernanza tenant); la API pública sólo
  lleva el brief estructurado + referencias por hash/id, nunca bytes ni secretos.
- Build impact: `none` (Node 24 nativo; sin dependencia pesada nueva).
- Extraction blocker: `none` (respeta el seam existente; no crea `apps/*`/`packages/*` nuevos).

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: `PrepareExperimentPayloadV1` (`packages/contracts/src/index.ts`) + recipe
  store nuevo (recurso durable por workspace en `efeonce-globe`, motor de persistencia `[verificar]`).
- Consumidores afectados: `UI` (Prompt Studio / Recetas de TASK-1474), `MCP`, `CLI`, `worker`, `E2E`
  (superficies del coverage manifest del Lab).
- Runtime target: `worker` (creative-runner / dominio Globe) + `external` (repo hermano).

### Contract surface

- Contrato existente a respetar: `PrepareExperimentPayloadV1`, `GLOBE_LAB_COMMANDS`/`GLOBE_LAB_READERS`,
  `LAB_COVERAGE`, `TrustedCommandContextV1` (spine TASK-1481);
  `efeonce-globe/docs/architecture/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`.
- Contrato nuevo o modificado: (1) tipo `StructuredBriefV1` + `structuredBrief?` aditivo en
  `PrepareExperimentPayloadV1`; (2) `compileStructuredBrief` (dominio); (3) recipe-registry
  command (`globe.lab.recipe.save` `[nombre a confirmar]`) + reader (`globe.lab.recipe.list` /
  `globe.lab.recipe.get`) con sus entradas en `GLOBE_LAB_COMMANDS`/`GLOBE_LAB_READERS` + coverage.
- Backward compatibility: `gated` — `structuredBrief` es aditivo; `prompt` plano sigue válido;
  estructurado y plano son mutuamente excluyentes (rechazo explícito si vienen ambos, sin precedencia
  silenciosa).
- Full API parity: la compilación y las recetas viven en `packages/domain` como command/reader
  transport-neutral; la UI de Prompt Studio es un cliente del command, nunca dueña de la lógica de
  compilación ni del store de recetas.

### Data model and invariants

- Entidades/tablas/views afectadas: `StructuredBriefV1` (tipo, no tabla) embebido en el request del
  experimento; `CreativeRecipeV1` persistido por workspace (recurso durable nuevo, motor `[verificar]`
  contra `packages/database`).
- Invariantes que no se pueden romper:
  - La instrucción efectiva del provider se deriva SIEMPRE de `compileStructuredBrief` server-side; la
    UI nunca envía la instrucción compilada.
  - `prompt` plano y `structuredBrief` son mutuamente excluyentes; recibir ambos = `bad_request`
    (sin resolver por precedencia).
  - Una receta pertenece a un `workspaceId`; un caller nunca lee/materializa recetas de otro workspace.
  - Las recetas son versionadas (schema + `version`), nunca se muta una versión publicada in-place.
  - La compilación es determinista: mismo `StructuredBriefV1` → misma instrucción (reproducibilidad,
    insumo de TASK-1496).
- Tenant/space boundary: `workspaceId` se deriva de `TrustedCommandContextV1` (igual que
  `prepareExperiment`), nunca del payload del caller.
- Idempotency/concurrency: compilación pura/determinista (sin side effects). Recipe-save con command
  semantics idempotente por `(workspaceId, recipeId, version)`; publicar una versión ya existente
  retorna la vista actual, no duplica.
- Audit/outbox/history: la instrucción compilada + el `StructuredBriefV1` origen quedan como evidencia
  en el attempt manifest (mismo track que el resto del run); recetas versionadas = append-only por
  versión. Sin outbox nuevo salvo que el store lo requiera `[verificar]`.

### Migration, backfill and rollout

- Migration posture: `additive` — nuevo tipo aditivo en el contrato + store de recetas nuevo. Sin
  migración destructiva. `[verificar motor de persistencia del recipe store en efeonce-globe]`.
- Default state: `flag OFF` / `policy-blocked` — la superficie UI/MCP nace bloqueada por coverage; los
  carriles internos (http/sdk/cli/worker/e2e) disponibles como el resto del Lab hasta promoción de ruta.
- Backfill plan: sin backfill; el `prompt?: string` vigente sigue funcionando. Recetas nacen vacías por
  workspace; opcionalmente sembrar las golden fixtures como recetas de referencia read-only `[verificar]`.
- Rollback path: revert del PR + `structuredBrief` fuera del contrato + coverage `policy-blocked`; el
  `prompt` plano queda intacto. Sin migración reversa destructiva.
- External coordination: `N/A — repo-only change` (cross-repo Globe, pero sin secrets/env nuevos ni
  provider config). Si el recipe store introduce env/secret, declararlo aquí antes de shippear `[verificar]`.

### Security and access

- Auth/access gate: `capability` — `GLOBE_LAB_EXPERIMENT_CAPABILITY` para el brief compuesto en prepare;
  capability propia para recipe-save/list si se separa `[verificar]`. Coverage manifest gobierna qué
  superficie puede despachar.
- Sensitive data posture: `no sensitive data` — el brief son descriptores creativos; sin PII, payroll ni
  secretos. Las referencias siguen cruzando por hash (nunca bytes).
- Error contract: errores del spine/dominio Globe (`GlobeApiErrorCode` / `bad_request`), sanitizados;
  nunca prosa cruda ni detalle interno al caller.
- Abuse/rate-limit posture: hereda el kill switch del Lab (`LabKillSwitchPort`) + spend fence del run
  (la compilación no gasta créditos; el gasto ocurre en `execute`, aguas abajo). Sin rate-limit nuevo.

### Runtime evidence

- Local checks: `cd ../efeonce-globe && pnpm check && pnpm build`; tests de dominio para
  `compileStructuredBrief` (determinismo + mutua exclusión plano/estructurado) y para recipe
  save/list/materialize (tenant-safe).
- DB/runtime checks: verificar el store de recetas contra su motor real en `efeonce-globe`
  (`packages/database`) — save/list por workspace `[verificar]`.
- Integration checks: harness cross-surface del spine (TASK-1481) ejercita brief estructurado por los
  carriles disponibles; ejecutar un `prepare`+`execute` con brief estructurado contra el adapter fake
  (sin gasto) y confirmar que la instrucción compilada llega al seam.
- Reliability signals/logs: reusar la observabilidad del Model Lab; sin signal nueva salvo que el store
  de recetas lo amerite.
- Production verification sequence: `N/A — coverage policy-blocked` en UI/MCP; promoción de ruta y
  canary quedan como paso humano posterior (mismo patrón que el resto del Lab), no en esta task.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths reales (`packages/contracts`,
      `packages/domain`, coverage manifest).
- [ ] Invariantes de compilación (determinismo, mutua exclusión), tenant boundary por `workspaceId` e
      idempotencia de recipe-save explícitos.
- [ ] Migración/rollback additive y proporcional (contrato aditivo + coverage `policy-blocked`).
- [ ] Evidencia runtime listada (`pnpm check && pnpm build` en Globe + tests de dominio + harness).
- [ ] Sin fuga de datos: errores canónicos del spine; referencias por hash; sin bytes/secretos en la API.

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

### Slice 1 — Tipos de brief estructurado (contrato transport-neutral)

- `BriefIngredientKind` (enum: `subject`|`style`|`light`|`framing`|`mood`|`palette`) y
  `BriefIngredientV1` (`kind`, `value`, `weight` normalizado) en `packages/contracts`.
- `StructuredBriefV1` (`schemaVersion`, lista de ingredientes, `notes?`) versionado.
- `structuredBrief?: StructuredBriefV1` aditivo en `PrepareExperimentPayloadV1`, documentado como
  mutuamente excluyente con `prompt`.

### Slice 2 — Compilador server-side + validación

- `compileStructuredBrief(brief): string` (o forma estructurada que consuma el adapter) determinista, en
  `packages/domain`; ordena/pesa ingredientes y produce la instrucción del provider.
- Extender `validatePreparePayload` para aceptar `structuredBrief`, rechazar (`bad_request`) si vienen
  `prompt` + `structuredBrief` juntos, y validar ingredientes (kinds conocidos, pesos válidos).
- `prepareExperiment` compila el brief estructurado a la instrucción efectiva y deja el
  `StructuredBriefV1` origen + la instrucción compilada como evidencia en el request/manifest.

### Slice 3 — Recipe registry (command + reader gobernados)

- Tipo `CreativeRecipeV1` (workspace-scoped, versionado; envuelve un `StructuredBriefV1` + metadata:
  título, capability, referenceRoute sugerida).
- Command `globe.lab.recipe.save` `[nombre a confirmar]` (autorar/versionar receta por workspace,
  idempotente por `(workspaceId, recipeId, version)`) + reader `globe.lab.recipe.list`/`get`
  (materializar receta → `StructuredBriefV1` para pre-cargar un brief).
- Store durable por workspace (motor `[verificar]` contra `packages/database`); tenant-safe vía
  `TrustedCommandContextV1`.
- Registrar los nuevos command/reader en `GLOBE_LAB_COMMANDS`/`GLOBE_LAB_READERS` + coverage manifest
  (`ui`/`mcp` = `policy-blocked`, carriles internos `available`).

## Out of Scope

- El Prompt Studio / la UI de Recetas de TASK-1474 (esta task es sólo el backend; la UI las consume).
- Style DNA / análisis de referencias (TASK-1494), formatos objetivo (TASK-1495), receta reproducible
  seed/sampler (TASK-1496), inpaint (TASK-1497), readers de exploración (TASK-1498), Dirección (TASK-1499).
- Cambiar el provider seam o cualquier `CreativeProviderAdapter`: el compilador produce la instrucción,
  el adapter no cambia.
- Gate humano de aprobación / run lifecycle (TASK-1469) y Studio Credits comercial (TASK-1468).

## Detailed Spec

Referencia de evidencia (`efeonce-globe`, verificar líneas al implementar):

- `packages/contracts/src/index.ts`: `PrepareExperimentPayloadV1` (`prompt?: string`),
  `GoldenBriefFixtureV1:466`, `CreativeCapability:36`, `GLOBE_LAB_COMMANDS`/`GLOBE_LAB_READERS:217-229`.
- `packages/domain/src/model-lab.ts`: `LAB_COVERAGE:120-129`, `prepareExperiment:222`,
  `validatePreparePayload:535` (patrón de mutua exclusión `editFrom` vs `previousInteractionId:552`).
- `packages/domain/src/evaluation.ts`: `FIXTURES:34`, `listGoldenBriefFixtures:308` (el brief-como-fixture
  actual, que las recetas autorables complementan sin reemplazar).

Forma de la compilación: determinista y auditable. Mismo `StructuredBriefV1` → misma instrucción. El
peso de cada ingrediente influye el orden/énfasis; la resolución de conflictos (dos ingredientes del
mismo `kind`) se declara en el spec del compilador. La instrucción compilada NO viaja desde la UI:
viaja el `StructuredBriefV1`, el dominio compila.

## Rollout Plan & Risk Matrix

Additive y de bajo blast radius: contrato aditivo + coverage `policy-blocked` en las superficies
públicas. No toca payroll/finance/identity/SCIM/release. El gasto de créditos no cambia (la compilación
es previa a `execute`).

### Slice ordering hard rule

- Slice 1 (tipos de contrato) → Slice 2 (compilador + validación en prepare) → Slice 3 (recipe registry).
- Slice 3 depende de Slice 1 (`CreativeRecipeV1` envuelve `StructuredBriefV1`) y de Slice 2 (la receta
  materializa un brief que el mismo compilador procesa). No ejecutar Slice 3 antes de Slice 1+2.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| `prompt` plano y `structuredBrief` resueltos por precedencia silenciosa → corre un brief que el caller no pidió | worker (creative-runner) | medium | Rechazo explícito `bad_request` si vienen ambos (patrón `editFrom`); test de dominio | test rojo en `model-lab` / harness spine |
| Lógica de compilación filtrada a la UI (business logic fuera del primitive) | UI (TASK-1474) | medium | Compilador en `packages/domain`; la UI sólo envía `StructuredBriefV1`; parity check | review de PR TASK-1474 / lint boundary |
| Receta de un workspace legible por otro (tenant leak) | worker | low | `workspaceId` derivado de `TrustedCommandContextV1`, nunca del payload; test tenant-safe | test rojo de aislamiento del recipe store |
| Compilación no determinista rompe reproducibilidad (insumo de TASK-1496) | worker | low | Compilador puro sin fuentes de no-determinismo; test de determinismo | test de reproducibilidad rojo |

### Feature flags / cutover

- Sin flag env nuevo por defecto: la superficie pública nace `policy-blocked` en el coverage manifest
  (mismo mecanismo que `LAB_COVERAGE`), los carriles internos quedan `available`. Cutover a UI/MCP =
  promoción de ruta humana posterior, fuera de esta task. Revert = coverage `policy-blocked` + revert PR.
- El kill switch del Lab (`LabKillSwitchPort`) sigue aplicando: con Lab OFF, todo prepare fail-closes.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert PR (quitar `structuredBrief` + tipos); `prompt` plano intacto | < 10 min | si |
| Slice 2 | Revert PR (quitar rama estructurada de `validatePreparePayload`/`prepareExperiment`) | < 10 min | si |
| Slice 3 | Coverage `policy-blocked` + revert PR; recipe store additive, sin migración destructiva | < 15 min | si |

### Production verification sequence

`N/A — coverage policy-blocked en UI/MCP`. Verificación acotada a: `cd ../efeonce-globe && pnpm check &&
pnpm build` verdes + tests de dominio + harness cross-surface del spine por los carriles internos
(http/sdk/cli/worker/e2e). La promoción de ruta y el canary son paso humano posterior (patrón del Lab).

### Out-of-band coordination required

`N/A — repo-only change`. Si el recipe store introduce un secret/env nuevo en `efeonce-globe`,
declararlo y coordinarlo antes de shippear `[verificar durante Plan Mode]`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `StructuredBriefV1` + `BriefIngredientV1` (kinds sujeto/estilo/luz/encuadre/mood/paleta + pesos)
      existen en `packages/contracts` y `PrepareExperimentPayloadV1` acepta `structuredBrief?` de forma
      aditiva sin romper el `prompt?: string` vigente.
- [ ] `compileStructuredBrief` compila server-side de forma determinista y la instrucción efectiva +
      el brief origen quedan como evidencia en el manifest; la UI nunca envía la instrucción compilada.
- [ ] `prompt` plano y `structuredBrief` mutuamente excluyentes: recibir ambos retorna `bad_request`
      (sin precedencia silenciosa), con test que lo prueba.
- [ ] Recipe registry: command para autorar/versionar receta por workspace + reader para listar/
      materializar, tenant-safe (`workspaceId` del contexto), idempotente por versión.
- [ ] Nuevos command/reader registrados en `GLOBE_LAB_COMMANDS`/`GLOBE_LAB_READERS` + coverage
      (`ui`/`mcp` = `policy-blocked`, carriles internos `available`).
- [ ] `cd ../efeonce-globe && pnpm check && pnpm build` verdes.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `cd ../efeonce-globe && pnpm check && pnpm build`
- Tests de dominio Globe: determinismo de `compileStructuredBrief`, mutua exclusión plano/estructurado,
  recipe save/list/materialize tenant-safe; harness cross-surface del spine con brief estructurado.

## Closing Protocol

[Cerrar una task es obligatorio y forma parte de Definition of Done.
Si la implementacion termino pero estos items no se ejecutaron, la task
sigue abierta.]

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `TASK-1474` actualizada: el Prompt Studio + Recetas + plantilla curada ya tienen backend; marcar
      el gap cerrado con fecha en su sección de dependencias.

## Follow-ups

- `TASK-1494` (Style DNA), `TASK-1495` (formatos), `TASK-1496` (receta reproducible seed/sampler),
  `TASK-1499` (Dirección) reusan el `StructuredBriefV1` como insumo. Confirmar que el compilador es
  reproducible antes de que TASK-1496 dependa de él.
- Evaluar sembrar las `GoldenBriefFixtureV1` como recetas de referencia read-only (paridad entre el
  brief-como-fixture de test y las recetas autorables por workspace).

## Delta YYYY-MM-DD

[Opcional. Registra cambios materiales a la task despues de su creacion.]

## Open Questions

- Motor de persistencia del recipe store en `efeonce-globe` (`packages/database` vs almacenamiento del
  Lab): `[verificar durante Plan Mode]`.
- ¿Recipe-save reusa `GLOBE_LAB_EXPERIMENT_CAPABILITY` o necesita capability propia
  (`globe.lab.recipe.author`)? `[verificar]`.
- Forma exacta de la salida de `compileStructuredBrief` (string único vs estructura que el adapter
  interpreta) y resolución de conflictos entre ingredientes del mismo `kind`.
