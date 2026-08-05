# TASK-1633 — Globe Producer Creative Operation, Input Roles and Control Support Contract

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
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
- Epic: `EPIC-028`
- Status real: `10 de 17 criterios cerrados y desplegados (efeonce-globe@91d1f71, API 00197-f9z). Sin dependencias bloqueantes: el canary migró a TASK-1504 y el criterio de consumers es de TASK-1552. Restante agrupado en 4 bloques — ver Delta 2026-08-03 «estado de cierre»`
- Rank: `next.1`
- Domain: `creative|platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; Globe main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Reemplaza el acoplamiento actual entre modos visuales, modelos y adapters por un contrato versionado de ruta que
separa operación creativa, slots/roles de entrada, controles, restricciones y output. El Producer y todos los
consumidores podrán derivar comportamiento desde el mismo descriptor sin condicionales por nombre de modelo.

## Why This Task Exists

El catálogo actual mezcla operaciones (`video-generate`, `video-upscale`) con composiciones de entrada
(`elements`, `frames`, `motion-source`). La UI convierte esas composiciones en modos y puede cambiar de modelo al
elegir una; los adapters infieren tareas por cantidad/tipo de archivos; límites están duplicados en browser; y el
catálogo puede prometer duración, audio o tipos de referencia que el payload real no aplica.

Gemini Omni hizo visible la falla, pero no es un problema específico de Omni: referencias, cámara, movimiento,
estilo, temporalidad y audio son conceptos comunes cuya implementación cambia por ruta. Sin un descriptor neutral,
cada modelo nuevo de video puede introducir un botón, taxonomía o branch React propio y repetir el drift.

## Goal

- Definir un manifiesto versionado de operación, inputs, controles y outputs por ruta.
- Validar combinaciones y controles requeridos antes de estimate, reserva o provider submit.
- Permitir que UI, BFF, SDK, MCP, CLI y workers consuman la misma proyección browser-safe.
- Mantener providers, slugs, payloads y traducción de prompt exclusivamente detrás de adapters server-side.
- Migrar de forma compatible las rutas existentes y bloquear nuevas integraciones que no declaren el contrato.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_FAL_CHALLENGER_MODELS_PRODUCER_INTEGRATION_PROPOSAL_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ROUTE_BASED_MODEL_RESOLUTION_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`

Reglas obligatorias:

- Una operación expresa intención de producto; un input slot expresa qué significa un asset; un control expresa
  dirección creativa; ninguna de esas dimensiones es un slug, endpoint o nombre de provider.
- `reference` no es sinónimo de `source`: un first frame, video editable, motion source o máscara tiene semántica
  distinta de una referencia de sujeto/estilo.
- Cámara/movimiento creativo no se confunden con transferencia de movimiento desde un asset.
- Cada control declara `native-parameter | prompt-semantic | reference-conditioned | preprocessed | postprocessed |
  unsupported`; el compiler falla antes del spend si un requisito no puede honrarse.
- El browser nunca concatena instrucciones vendor-specific ni decide payloads de provider.
- El catálogo público conserva identidad de ruta/modelo y no expone provider model IDs, slugs, costos ni secretos.
- Rights, lineage, private ingest, estimate, idempotencia, route binding y promotion continúan en sus autoridades
  existentes; esta task no crea un segundo lifecycle.
- Fal se usa sólo como evidencia comparativa de producto. Esta task no integra Gemini Omni mediante Fal.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `.codex/skills/greenhouse-globe/SKILL.md`
- `.codex/skills/software-architect-2026/SKILL.md`

## Dependencies & Impact

### Depends on

- `TASK-1481` — API Contract Spine y coverage/conformance compartidos.
- `TASK-1500`/`TASK-1553` — catálogo versionado, identidad y resolución por ruta ya existentes.
- `TASK-1501` — output shape y selectores discriminados existentes que deben migrarse, no duplicarse.
- `TASK-1467`/`TASK-1490` — referencias gobernadas, rights, lineage y parent/edit seams existentes.

### Blocks / Impacts

- Bloquea el delta de corrección/paridad Omni de `TASK-1504`.
- Bloquea el slice route-driven de referencias/controles del composer en `TASK-1552`.
- Bloquea `TASK-1573` y las integraciones nuevas de video `TASK-1616`…`TASK-1619` en lo relativo a inputs y controles.
- Impacta `TASK-1554` porque la disponibilidad debe proyectar compatibilidad sin convertirla en autorización.
- No reabre `TASK-1505`, `TASK-1555` ni las rutas ya promovidas que no cambien su contrato efectivo.

### Files owned

- `../efeonce-globe/packages/contracts/src/producer-catalog.ts`
- `../efeonce-globe/packages/contracts/src/index.ts`
- `../efeonce-globe/packages/provider-contract/src/index.ts`
- `../efeonce-globe/packages/domain/src/producer-catalog.ts`
- `../efeonce-globe/packages/domain/src/governed-run-failure-policy.ts` — sólo para clasificar los códigos de
  rechazo de contrato que esta task introduce; la política de reintentos en sí pertenece a `ISSUE-135`.
- `../efeonce-globe/apps/studio-web/src/governed-production-composition.ts`
- tests de contracts/domain/compiler correspondientes
- `docs/architecture/creative-studio/`
- `docs/operations/creative-studio/`

**`vendor/efeonce-globe/` NO es owned por esta task, y es una decisión, no un olvido.** Greenhouse consume
`@efeonce-globe/contracts` como tarball `file:` pinneado (`package.json:314`) y ese tarball **transporta
`producer-catalog.js`**, o sea el archivo que esta task modifica. Verificado el 2026-08-02: hoy ningún módulo
de Greenhouse importa `producer-catalog` ni `producer-fleet` (los imports vivos son `tenancy`, `credits` y
`capabilities`), así que el drift no tiene consumidor y re-vendorizar sería ruido. **Esta task no crea el
primer consumidor Greenhouse del catálogo.** El día que alguno nazca —el candidato obvio es la proyección de
flota, que sí transporta `creativeContract` (`producer-catalog.ts:1075`) hacia el gateway MCP— hereda
`ISSUE-126` completo, incluido que **pnpm resuelve un `file:` por NOMBRE DE ARCHIVO**: el re-vendorizado
correcto es silenciosamente inefectivo en local y local diverge de CI. La regla de ordenamiento de ese issue
—bumpear el vocabulario vendorizado ANTES de que exista quien lo lea— aplica a quien lo cree, no acá.

Los adapters concretos y la UI consumidora permanecen en sus tasks dueñas. No ejecutar en paralelo cambios de
`producer-catalog.ts` bajo TASK-1504/1553 mientras esta foundation esté modificando el mismo contrato.

## Current Repo State

### Already exists

- `PRODUCER_ROUTE_CATALOG` y su versión gobiernan identidad pública, shapes, constraints, `inputModes` y policy de referencias.
- `ProductionRouteBindingV1` separa identidad pública de endpoint/provider ejecutable.
- `CreativeProviderRequestV1` transporta prompt, referencias resueltas, edit refs, shape y receta.
- Private ingest conserva hash, MIME, rights y parent lineage sin enviar bytes desde el browser.
- El Producer tiene uploader, menciones, selección de assets y model fleet projection reutilizables.

### Gap

- `RouteInputMode` es una unión plana sin slots, roles, cardinalidad por rol ni combinaciones válidas.
- `RouteReferencePolicyV1` sólo expresa mínimo, máximo y media types.
- No existe un descriptor común para cámara, estilo, movimiento, ritmo, temporalidad o audio.
- La UI hardcodea caps por modo y usa el modo para buscar/cambiar rutas.
- El compiler/adapters pueden inferir tareas por media/count y aceptar inputs que el provider no procesa.
- No existe evidencia de qué controles se aplicaron, degradaron o rechazaron en el request efectivo.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-globe/packages/contracts`, `packages/domain`, `packages/provider-contract` y compiler
  server-side en `apps/studio-web`; Greenhouse gobierna ADR/task/evidencia.
- Future candidate home: `remain-shared`
- Boundary: `RouteCreativeContractV1` browser-safe + validator/compiler server-side; consumers autorizados:
  Producer, BFF, SDK, MCP, CLI, workers y adapters.
- Server/browser split: descriptores y DTOs serializables son browser-safe; traducción de prompt, provider
  payloads, secrets, stores, rights resolution y spend permanecen server-only.
- Build impact: sin dependencia pesada ni nuevo package; modifica packages/apps existentes de Globe.
- Extraction blocker: route binding, trusted context, private ingest, provider constraints y spend fence deben
  permanecer coherentes en Globe.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `PRODUCER_ROUTE_CATALOG y snapshots de ruta usados por estimate/prepare/execute`
- Consumidores afectados: `Producer UI/BFF, SDK, MCP, CLI, domain compiler, creative-runner y onboarding/promotion`
- Runtime target: `Globe API + Producer worker + studio-client mediante proyección BFF`

### Contract surface

- Contrato existente a respetar: `ProducerRouteCatalogEntryV1`, `CreativeProviderRequestV1`, `ProductionRouteBindingV1`, `PrepareExperimentPayloadV1` y readers del catálogo/flota.
- Contrato nuevo o modificado: `RouteCreativeContractV1` o nombre equivalente con `operation`, `inputSlots`, `creativeControls`, `outputContract` y `schemaVersion`.
- **Asimetría a cerrar en `RouteCreativeControlSupportV1`:** hoy es `{ mechanism, required }` — declara **si** un
  control se honra y **cómo**, pero no **qué se puede pedir**. `inputSlots` sí tiene su contraparte tipada en el
  intent (`inputAssignments`, con cardinalidad, MIME y orden); `creativeControls` no tiene ninguna. Sin una
  `valueShape` por control (enum cerrado · texto libre acotado · numérico con rango, según el caso), el
  fail-closed pre-spend —que es el corazón de esta task— **no puede ejercerse sobre el eje de controles**, y el
  primero que necesite un enum lo inventará al lado del contrato.
- Backward compatibility: `gated`; lectura dual de `inputModes/referencePolicy` durante migración y rechazo ante contradicción.
- Full API parity: el catálogo/reader proyecta el mismo descriptor a todas las surfaces; ningún consumidor mantiene una matriz paralela.

### Data model and invariants

- Entidades/tablas/views afectadas: `catálogo code-versioned y route snapshots persistidos por el lifecycle; sin tabla nueva por defecto`.
- Invariantes que no se pueden romper:
  - una ruta declara una operación principal y combinaciones de slots explícitas;
  - un asset conserva identidad, MIME, rights, role y ordinal hasta manifest/lineage;
  - un control requerido nunca se degrada silenciosamente;
  - estimate, approval y execute comparten el mismo fingerprint de ruta, inputs, controles y output;
  - una capability no disponible puede mostrarse, pero no ejecutarse.
- Tenant/space boundary: workspace y autorización se derivan de trusted context y assets resueltos, nunca del descriptor enviado por browser.
- Idempotency/concurrency: fingerprint canónico incluye route revision, operation, ordered slots/roles, controls y output contract; retry reusa idempotency key y no duplica spend.
- Audit/outbox/history: manifest/run snapshot conserva versión del descriptor, input roles, effective controls, unsupported/rejected controls y route identity sin provider secrets.

### Migration, backfill and rollout

- Migration posture: `additive`; campos nuevos opcionales durante dual-read y obligatorios para rutas nuevas.
- Default state: `rutas existentes conservan disponibilidad sólo si su descriptor derivado es equivalente; nuevas rutas permanecen gated`.
- Backfill plan: `sin reescritura destructiva de runs; snapshots históricos conservan schema previo y readers los proyectan como legacy explícito`.
- Rollback path: `revert del catálogo/compiler + dual-read legacy; pausar sólo rutas cuyo descriptor nuevo cambie contrato efectivo`.
- External coordination: `ninguna integración nueva; promociones/canaries de rutas modificadas requieren sus owners y atestaciones existentes`.

### Security and access

- Auth/access gate: capabilities, workspace, route readiness/binding, rights y spend fence existentes.
- Sensitive data posture: hashes/roles browser-safe según proyección; bytes, URLs firmadas, prompts efectivos internos, provider IDs y secretos server-only.
- Error contract: `route_operation_unsupported`, `route_input_slot_invalid`, `route_input_combination_unsupported`, `route_control_unsupported`, `route_contract_revision_mismatch` o equivalentes canónicos. **Ninguno existe todavía** (auditoría 2026-08-02): el compiler colapsa las nueve causas en un único `route_creative_contract_mismatch` — ver el criterio de razones nombradas y el Delta correspondiente.
- **Clasificación de fallo obligatoria:** todo código de rechazo de contrato nace `terminal` en `governed-run-failure-policy.ts`. Un contrato desajustado es determinista por definición — la próxima entrega falla idéntica sin que nadie toque nada, que es el criterio de admisión literal de esa lista. Sin clasificar cae a `unknown` (tope 3) y gasta tres entregas en algo imposible, contadas como `rescheduled`.
- Abuse/rate-limit posture: límites por slot/MIME/duración/bytes, hard budget, circuit breaker e idempotency antes del provider.

### Runtime evidence

- Local checks: contract/domain/compiler tests, legacy compatibility, fingerprint invalidation y conformance por ruta.
- DB/runtime checks: readback de snapshots/runs sin backfill destructivo; ninguna migración si Discovery confirma catálogo code-only.
- Integration checks: fixtures de Omni, Seedance y Veo prueban la misma intención con mecanismos distintos y negativos pre-spend.
- Reliability signals/logs: `producer.route_contract_mismatch`, `producer.route_control_rejected`, `producer.legacy_route_contract_used` o nombres aceptados, steady-state documentado.
- Production verification sequence: `dual-read local → shadow projection → rutas internas → consumer UI → promoción/canary por ruta modificada`.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumidores se nombran con paths reales.
- [ ] Inputs, roles, combinaciones, controles y output forman parte del fingerprint pre-spend.
- [ ] Migración/rollback conserva runs históricos y no altera promociones por transitividad.
- [ ] Errores, audit y señales no filtran payloads ni secretos de provider.

### Capability Definition of Done — Full API Parity

- [ ] El descriptor se proyecta por los readers existentes de catálogo/flota y lo consumen UI/SDK/MCP/CLI según coverage.
- [ ] La autoridad de ejecución continúa en estimate/prepare/execute y no en la UI.
- [ ] Cada surface declara `available | policy-blocked | unsupported` por operación/control sin inventar soporte.
- [ ] Provider-specific mapping permanece dentro del adapter y tiene conformance tests.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — ADR y taxonomía neutral

- Aceptar un ADR que separe operación, input slot/role, control, mecanismo de aplicación y output contract.
- Resolver nombres/versionado, compatibilidad legacy y ownership entre catálogo, compiler y adapters.

### Slice 2 — Contratos browser-safe y catálogo

- Implementar tipos discriminados y validadores para operación, slots, roles, cardinalidad, combinaciones y controles.
- Extender el catálogo/versionado sin filtrar provider metadata y con drift guards contra descriptores incompletos.

### Slice 3 — Compiler, fingerprint y evidencia

- Compilar el contrato neutral a `CreativeProviderRequestV1` y exigir que adapter/driver declare controles aplicados.
- Incluir inputs/roles/controles/output en estimate validity, approval e idempotency fingerprints.

### Slice 3.5 — Unificación del vocabulario de dirección creativa (BLOQUEA el cableado de controles)

Este slice existe porque `creativeControls` **no es un eje nuevo: es el tercero que expresa lo mismo**, y
cablear valores antes de resolverlo crea dos caminos hacia el mismo prompt. Los tres vocabularios vivos:

| Vocabulario | Dónde | Qué expresa |
|---|---|---|
| `StructuredBriefV1` (`TASK-1493`) | `packages/contracts/src/structured-briefs.ts` | `subject·style·light·framing·mood·palette` **+ `weight`**, y su propio comentario lo declara *"structured alternative to `prompt`; the server compiles it deterministically"* |
| `RouteConstraintsV1` | `packages/contracts/src/producer-catalog.ts` | `aspectRatio`, `resolution`, `durationSeconds` por ruta, ya validados fail-closed vía `OutputShapeV1` |
| `ROUTE_CREATIVE_CONTROLS` (esta task) | idem | vuelve a declarar `style`, `lighting`, `composition`, `duration`, `aspect-ratio`, `resolution` |

Solapamientos directos: `style`↔`style`, `lighting`↔`light`, `composition`↔`framing`, y los tres de output son
duplicación pura. **El modo de fallo no es un conflicto detectable: es precedencia silenciosa.** Un pedido con
`structuredBrief.light='golden hour'` y `controls.lighting='high key'` no es inválido por ninguna regla, ambos
compilan al prompt, ambos entran al fingerprint — y uno gana sin dejar rastro. Es la misma familia que el spread
de lineage corregido en `b062d6f`, un nivel más arriba: el orden expresa una regla que nadie declaró.

**Decidido en ADR-022 Delta (b) el 2026-08-02.** El desempate no fue el costo del legado —se verificó contra
producción y hay **0 recetas guardadas**, así que no hay nada que migrar— sino que **Globe ya tiene la regla y su
guardia**: `producer-client.ts:1191` rechaza `prompt` + `structuredBrief` juntos con
`producer_prompt_contract_invalid`, y la UI vive de eso hoy (`ProducerComposer.tsx:752-758`). Un campo de valores
en el intent eludiría esa guardia por el costado: el pedido pasaría a ser `(prompt XOR structuredBrief) + controls`
y nada impediría dos direcciones contradictorias compilando al mismo prompt.

Trabajo del slice:

- **`creativeControls` declara soporte y NUNCA transporta valores.** Es el descriptor por ruta.
- **El valor viaja por el canal existente `prompt XOR structuredBrief`**; los controles que el brief no tiene
  —`camera`, `lens`, `motion`, `timing`, `audio-direction`, `negative-prompt`— entran como **ingredientes nuevos**
  de `StructuredBriefV1`. Aditivo; hereda la exclusión mutua sin código nuevo y el peso por ingrediente gratis.
- **Retirar `duration`, `aspect-ratio` y `resolution` de `ROUTE_CREATIVE_CONTROLS`.** Su dueño es `constraints` +
  `OutputShapeV1`, que ya los valida contra la ruta. Un control que ya tiene camino tipado no necesita un segundo.
- **Agregar `valueShape` a `RouteCreativeControlSupportV1`** (ver Contract surface), sin lo cual el fail-closed
  pre-spend no alcanza al eje de controles.
- **El compiler valida el valor contra el descriptor**: un ingrediente cuyo control es `unsupported` en esa ruta se
  rechaza o degrada explícitamente antes del estimate, con razón nombrada y clasificación `terminal`.
- `RouteCreativeIntentV1` **no gana campo de controles**: conserva su forma actual. El fingerprint cubre el eje sin
  cambio estructural porque el brief ya viaja dentro del quote firmado.
- Test que falla si un control declara un valor cuyo dueño es otro vocabulario.

**ADR-022 Delta (c) — el prompt efectivo también se compila por ruta.** El mismo defecto que esta task corrige en
el eje de inputs seguía intacto en el único eje que **todas** las rutas consumen: `compileStructuredBrief`
(`structured-briefs.ts:142`) es global y corre en `domain`, **antes** del adapter, contra la regla del propio ADR
de que sólo los adapters traducen. El puerto lo delata en su firma: `structuredPrompts.compile(raw)`
(`app.ts:1416`) **no recibe la ruta**. Trabajo derivado, dentro de este mismo slice:

- Mover la compilación al adapter y versionarla por ruta; el puerto pasa a `compile(raw, routeContract)` y la
  implementación por defecto **preserva el texto actual**, de modo que ninguna ruta cambia su salida al migrar.
- La revisión del compilador entra al fingerprint: dos textos distintos para el mismo brief son dos pedidos
  distintos y no comparten approval.
- **El peso ordena y estructura; nunca se imprime.** Hoy se emite `Style [weight=0.820]: …` y el encoder lo lee
  como texto — no condiciona, gasta tokens y ensucia el prompt.
- **El rol del slot informa el texto compilado.** Hoy se valida con rigor y muere ahí: el modelo recibe las
  imágenes por otro canal y no sabe si son sujeto, estilo o storyboard salvo que el texto se lo diga.
- **Declarar el mecanismo por control por ruta, con evidencia del contrato oficial.** Medido: **13 de 17 rutas**
  heredan `PROMPT_CONTROLS` sin evidencia propia, y **ningún adapter manda campo negativo nativo** (cero
  `negative_prompt` en `apps/creative-runner/src`), así que `negative-prompt: prompt-semantic` es hoy una promesa
  heredada — y la negación en texto tiende a reforzar lo que niega.
- Qué dialecto es mejor por ruta **no se decide acá: se mide** con el Evaluation Harness (`TASK-1458`).

### Slice 4 — Migración y conformance de rutas existentes

- Migrar primero fixtures/rutas representativas de create, frames, reference, motion transfer, edit y upscale.
- Añadir gate que impida registrar nuevas rutas con `inputModes` legacy sin descriptor.
- Mantener dual-read hasta que consumers y rutas activas estén migrados y exista una task explícita de retiro.

## Out of Scope

- Cambiar el diseño visual del Producer; lo consume `TASK-1552` con sus skills/UI contracts.
- Corregir o promover Gemini Omni; lo ejecuta `TASK-1504` después de esta foundation.
- Implementar edición/continuidad; pertenece a `TASK-1573`/`TASK-1574`.
- Integrar Gemini Omni mediante Fal o agregar providers/modelos nuevos.
- Reemplazar catálogo, route binding, readiness, policy, rights, ledger, outbox o Asset Governance.
- Ejecutar canaries facturables en esta task de foundation.

## Detailed Spec

El descriptor debe soportar, como mínimo, operaciones `create | edit | extend | upscale` y permitir extenderlas sin
usar nombres de modelos. Los slots iniciales incluyen `source`, `reference`, `first-frame`, `last-frame`,
`edit-source`, `motion-source`, `source-audio` y `mask`; cada slot declara media/MIME, cardinalidad, rol permitido,
orden, límites y combinaciones. Los roles de referencia incluyen sujeto/personaje/producto/estilo/escena/storyboard,
sin afirmar que todos los providers los distinguen nativamente.

Los controles comunes de **dirección creativa** incluyen cámara, movimiento, lente, encuadre, estilo,
iluminación, ritmo, temporalidad, audio, seed y restricciones negativas. El descriptor no obliga a mostrar
todos: declara soporte, mecanismo y —tras Slice 3.5— la forma del valor admitido. La compilación
prompt-semantic ocurre server-side desde un brief neutral y registra qué se aplicó; el browser sólo envía
elecciones tipadas. `unsupported` requerido aborta antes del estimate/spend.

**Duración, ratio y resolución NO son controles creativos de este descriptor**: son forma de salida y su dueño
es `RouteConstraintsV1` + `OutputShapeV1`, que ya los valida fail-closed contra la ruta. Declararlos también acá
fue duplicación de SSOT y se retira en Slice 3.5.

Cámara y movimiento se conservan como controles comunes con su mecanismo por ruta — es exactamente la capability
compartida y adaptable que originó esta task. Lo que desaparece no es el control: es el **modo** «Elementos»
(una composición de inputs disfrazada de operación) y el botón «Movimiento» específico de un modelo. El control
`motion` (dirección creativa, compilada al prompt) y el slot `motion-source` (transferir movimiento desde un
asset) son cosas distintas y ADR-022 las separa.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

`ADR → tipos/validators → compiler/fingerprint → unificación de vocabulario → fixtures legacy → gate nuevas rutas
→ consumers`. TASK-1504 no modifica el catálogo Omni y TASK-1552 no retira modos visuales antes de que Slice 3
proyecte el descriptor estable. **Slice 3.5 precede a cualquier cableado de valores de control**: mientras haya
tres vocabularios, cablear el eje de aplicación fija la duplicación en el fingerprint y deja de ser reversible
barato.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| Descriptor nuevo cambia una ruta promovida | routing/spend | medium | dual-read + equivalence tests + pause por ruta | `route_contract_revision_mismatch` |
| Control requerido se pierde al compilar | provider seam | medium | applied/rejected controls + fail-closed | `route_control_rejected` |
| Fingerprint no incluye referencia/control | ledger/idempotency | high | golden fingerprint tests y estimate invalidation | mismo approval para recipe distinta |
| UI vuelve a crear matriz propia | UI/contracts | medium | reader único + conformance + TASK-1552 consumer | branches por model name |
| Scope se convierte en integración Fal | provider governance | low | out-of-scope y no secret/slug changes | nuevo endpoint/provider binding |
| **Un rechazo de contrato entra a la máquina de reintentos sin clasificar** (materializado) | outbox/worker | high | clasificar `terminal` en `governed-run-failure-policy.ts` en el MISMO PR que introduce el código | `delivery_attempt > 1` sobre un código de contrato; `rescheduled` repetido sobre el mismo job |
| **Dos vocabularios compilan al mismo prompt y uno gana en silencio** | contracts/prompt seam | high | Slice 3.5 antes de cablear valores; test de dueño único por control | ninguna — es precisamente el riesgo: no hay error, hay precedencia |

### Feature flags / cutover

- Sin flag global nueva: el cutover es por `schemaVersion` y route revision.
- Dual-read legacy permanece durante rollout; rutas nuevas sin descriptor fallan en carga.
- Una ruta cuyo contrato efectivo cambie continúa gated hasta su promoción/canary dueño.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---:|---|
| ADR/tipos | revert enfocado; sin runtime | <15 min | sí |
| Catálogo/validator | volver a dual-read legacy y pausar rutas incompatibles | <20 min | sí |
| Compiler/fingerprint | revert antes de nuevas approvals; conservar runs/snapshots | <30 min | sí |
| Gate nuevas rutas | deshabilitar gate temporalmente sólo por revert versionado | <15 min | sí |

### Production verification sequence

1. ADR aceptado y tests contractuales locales verdes.
2. Proyección dual-read comparada para todas las rutas existentes sin mutar readiness/bindings.
3. Compiler/fingerprint ejercitados con fixtures y negativos pre-spend.
4. Deploy API/worker con rutas existentes equivalentes y reader live reconciliado.
5. TASK-1504 migra Omni y ejecuta promoción/canary sólo por identidad modificada.
6. TASK-1552 consume la proyección y completa GVC antes del retiro de modos legacy.
7. El rollout consumidor ejecuta una generación UI Seedance y una Omni como gate de no regresión; no repite
   evaluaciones/promociones ni usa un segundo submit ante transporte ambiguo.

### Out-of-band coordination required

Ninguna para la foundation. Las promociones, atestaciones y canaries permanecen en las tasks de cada ruta.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

> **10 de 17 cerrados.** Los 7 abiertos están agrupados por naturaleza —un bloque acoplado, dos lecturas, una
> higiene y uno que pertenece a `TASK-1552`— en el **Delta 2026-08-03 «estado de cierre»**. Leer ese delta
> antes de tomar cualquiera de los pendientes: tres de ellos son un solo trabajo secuencial y uno no es de
> esta task.

- [x] ADR aceptado e indexado define operación, slots/roles, controles, mecanismo de soporte y output contract.
- [x] El catálogo expone un descriptor versionado browser-safe sin provider IDs/slugs/costos/secrets.
- [x] Slots declaran media/MIME, cardinalidad, roles, orden, límites y combinaciones válidas.
- [x] Controles declaran `native-parameter | prompt-semantic | reference-conditioned | preprocessed | postprocessed | unsupported`.
- [x] `reference`, `first-frame`, `edit-source` y `motion-source` conservan semánticas distintas hasta manifest/lineage.
- [ ] Estimate/approval/idempotency invalidan ante cambios de ruta, inputs/roles, controles u output.
- [x] Un control/input requerido no soportado falla antes de reserva/provider submit con error canónico. **Desmarcado 2026-08-02** porque el guard era de **autoría del catálogo** (corre al cargar) y, sin canal para pedir un control, la condición era inalcanzable — se cumplía de forma vacía. **Re-cerrado 2026-08-03 con guard de EJECUCIÓN** (`efeonce-globe@91d1f71`): `compileStructuredBrief` rechaza con `UnsupportedBriefControlError` y el control nombrado, dentro de `prepareExperiment` y por tanto **antes del estimate y de la reserva**. Ambos guards conviven: autoría impide declarar lo imposible, ejecución impide pedirlo.
- [x] Cada rechazo de contrato tiene **razón nombrada del lado del servidor** y nace clasificado `terminal` en la política de fallos. **Cerrado 2026-08-02** (`efeonce-globe@8986b45` + `@ac1999f`): ocho códigos, uno por causa, con tabla probada en rojo y aserción de unicidad contra la recaída; y la familia completa del compiler clasificada —38 `terminal`, 3 `transient`, 2 `unknown` declarados— con un test que rompe el build si una razón nueva nace sin clasificar.
- [x] Un solo vocabulario es dueño de cada valor de dirección creativa; ningún control declara un valor cuyo dueño es `StructuredBriefV1` o `RouteConstraintsV1` (Slice 3.5), con test que lo sostenga. **Cerrado 2026-08-03** (`@e300c4e` + `@1b580f8`): duración/ratio/resolución salieron de los controles y los dos vocabularios quedan alineados 1:1, con `structured-brief-vocabulary.test.ts` cubriendo ambas direcciones + la honestidad de las tres excepciones declaradas.
- [ ] La compilación del prompt efectivo recibe el contrato de ruta, vive detrás del adapter y su revisión entra al fingerprint; la implementación por defecto preserva el texto actual de todas las rutas existentes (ADR-022 Delta (c)). **Primera mitad hecha** (`@91d1f71`): recibe el contrato y rechaza lo no honrado. **Faltan las otras dos**: la implementación no vive detrás del adapter (sigue siendo una función global de `domain`) y **no existe `promptCompilerRevision` en ningún fingerprint** — verificado por grep, cero ocurrencias.
- [ ] Ningún control declara su mecanismo por herencia del default: las 17 rutas lo declaran con evidencia del contrato oficial de su proveedor, en particular `negative-prompt`, que hoy ninguna ruta puede honrar de forma nativa.
- [ ] Manifest/run evidence conserva schema revision, roles y controles aplicados/rechazados sin secretos.
- [ ] Rutas legacy tienen dual-read/equivalence tests y rutas nuevas no pueden registrarse sin descriptor.
- [ ] Fixtures Omni/Seedance/Veo demuestran una UI intent común con traducciones distintas dentro de adapters. **Mitad hecha, verificada 2026-08-03:** `producer-catalog.test.ts:656` prueba que las tres rutas resuelven por el **mismo helper sin branch por ruta** — o sea que el contrato es un motor, no la descripción de la ruta #1. Lo que falta es la otra mitad: **traducciones distintas dentro de adapters**, que no existe todavía porque la compilación aún no vive detrás del adapter (criterio anterior).
- [ ] La proyección expone el descriptor a todas las surfaces por el reader canónico. **Verificado 2026-08-02:** ya
      viaja (`ProducerCatalogViewV1.creativeContract` → proyección de flota); que un consumer lo lea o permanezca
      `policy-blocked`/`unsupported` es criterio de ese consumer, no de la foundation. **Propuesto 2026-08-03
      (Delta «estado de cierre», bloque D): moverlo a `TASK-1552` o marcarlo dependencia externa de rollout** —
      el composer ignora el descriptor (cero ocurrencias en `apps/studio-client/src`) y esa es su task dueña.
- [x] ~~La task consumidora registra canaries UI terminales de Seedance y Omni.~~ **Migrado a `TASK-1504`
      (Delta b) el 2026-08-02.** Una foundation no puede quedar abierta esperando un canary que no controla, y el
      de Omni está bloqueado por el transporte, que es de 1504: la identidad declara `vertex-omni` mientras el
      runtime inyecta Generative Language, así que cobraría por una identidad distinta de la aprobada. El de
      Seedance ya está registrado (16 cr, `candidate_ready`, cobro único verificado). Aquí queda como dependencia
      de rollout, no como criterio propio.
- [x] `pnpm check && pnpm build` en Globe y gates documentales Greenhouse quedan verdes.
- [ ] La matriz browser-safe cubre explícitamente Imagen, Video y Audio: cada ruta declara operación, slots/roles, controles y output sin branches por provider/model slug.
- [ ] El descriptor permite que `TASK-1552` muestre controles adaptados por modalidad y ruta, con `available | policy-blocked | unsupported` y razón recuperable; ninguna afordancia queda como no-op.
- [ ] La salida de este contrato conserva la frontera de un solo Producer shell con tres estudios de modalidad; no introduce rutas/apps independientes ni reasigna ownership a `TASK-1641`.

## Verification

- `pnpm codex:task-hook TASK-1633 --develop`
- `pnpm task:lint --task TASK-1633`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- `pnpm docs:context-check:strict`
- `cd ../efeonce-globe && pnpm check && pnpm build`
- Contract/conformance tests registrados explícitamente en los scripts de cada package Globe.

## Closing Protocol

- [ ] Lifecycle, carpeta, registry y README sincronizados.
- [ ] ADR, architecture index, runtime handoff y model fleet status actualizados.
- [ ] Handoff y changelog registran compatibilidad, rollout y debt legacy.
- [ ] QA release auditor y documentation governor ejecutados.
- [ ] TASK-1504/1552/1573 y TASK-1616…1619 releídas contra el contrato final.

## Follow-ups

- Retiro definitivo de `RouteInputMode`/mode requirements legacy sólo después de migrar rutas y UI.
- Ampliar roles/controles únicamente con evidencia de provider y sin romper schema versionado.

## Open Questions

- **Resuelta para Slice 1.** ADR-022 resolvió que la operación vive dentro del descriptor versionado de cada ruta;
  el vocabulario compartido no es una referencia runtime mutable.
- ✅ **RESUELTA 2026-08-02 — ¿quién es dueño del valor de dirección creativa?** `creativeControls` (esta task),
  `StructuredBriefV1` (`TASK-1493`) y `RouteConstraintsV1` declaraban conceptos solapados: `style`↔`style`,
  `lighting`↔`light`, `composition`↔`framing`, y `duration`/`aspect-ratio`/`resolution` duplicados enteros.
  **ADR-022 Delta (b)**: el descriptor declara soporte, el valor viaja por `prompt XOR structuredBrief`, la forma
  de salida se queda en `constraints`/`OutputShapeV1`. Ver Slice 3.5.
- Abierta, menor: si `valueShape` debe admitir texto libre para los controles semánticos o restringirse a enums
  por ruta. Un enum es verificable pre-spend; el texto libre es lo que el oficio realmente usa. Probablemente
  ambos, discriminados — pero no está decidido y `ISSUE-127` (capa 8) advierte que un control demasiado estricto
  rechaza casos legítimos: `"Key visual"` fue leído como credencial y bloqueó el canary.

## Delta 2026-08-02 — intake de ejecución

- Goal explícito activo; excepción `--develop` y subagentes autorizados registradas por el hook canónico.
- TASK-1633 se tomó en los checkouts compartidos Greenhouse `develop` y Globe `main`, sin worktrees ni cambio de rama.
- El ADR resolverá `operation` dentro del descriptor versionado de cada ruta para que el snapshot sea autocontenido;
  cualquier catálogo compartido será vocabulario reusable, no una referencia runtime mutable.

## Delta 2026-08-02 — checkpoint de arquitectura

- ADR-022 aceptado e indexado en los índices de Creative Studio y Greenhouse.
- Manual del catálogo actualizado a v1.4 con la lectura de operación, slots, combinaciones, controles y output.
- Auditoría preliminar confirmó la causa de UI: `MODE_REQUIREMENTS` trata `Elementos` como modo separado y filtra
  sólo rutas `available`; el click escoge `routesForMode[0]`, por lo que una Omni con circuito abierto deja el botón
  inerte y una ruta compatible puede sustituir silenciosamente el modelo. El prompt sí existe en React, pero vive
  dentro del scroll del composer y puede salir completamente del viewport; ambos comportamientos violan ADR-022.
- No se modificó runtime ni Globe todavía. Tres subagentes continúan auditorías read-only de contracts,
  compiler/adapters y UI antes del primer patch.

## Delta 2026-08-02 — checkpoint de contratos y catálogo

- Globe incorpora de forma local `RouteCreativeContractV1` browser-safe con operación, slots/roles, roles de
  referencia, combinaciones, controles exhaustivos, mecanismo de soporte y output MIME/audio packaging.
- El catálogo sube localmente de `1.5.0` a `1.6.0`; las 17 rutas publicadas tienen descriptor explícito y guards
  de carga para revisión, modalidad/output, MIME, cardinalidad, slots únicos, combinaciones, controles y paridad
  con `referencePolicy` durante dual-read.
- Omni queda corregido en dato local a `create + referencias de imagen 1…4 + MP4 con audio embebido opcional`;
  ya no declara video como referencia generativa. Seedance text-to-video conserva `create` sin inputs y no cambia
  su identidad, binding ni readiness.
- Verificación local verde: contracts typecheck + 48 tests; domain typecheck + 437 tests. Todavía no hay commit,
  deploy ni mutación runtime. Próximo paso: intent/fingerprint y compiler/adapters antes de consumo UI.

## Delta 2026-08-02 — handoff de implementación a Claude

- Plan ejecutable completo: [`TASK-1633-plan.md`](../plans/TASK-1633-plan.md). Coordina sin mezclar ownership:
  TASK-1633 foundation, TASK-1504 Omni directo por Vertex y TASK-1552 compositor UI.
- Coordenadas del checkout al entregar:
  - Greenhouse `develop@23fcdf54a8f9ec5538e2cc02d923da3157884a32`; `origin/develop@34a016800`; los tres
    commits intermedios son MCP concurrente y no deben mezclarse en un push Globe.
  - Globe `main@a24910c7639129f3e5955e9b3e0e2daf9e2d611f`, igual a `origin/main`; WIP TASK-1633
    **sin commit**, 10 archivos modificados + un test nuevo, 763 inserciones/18 eliminaciones.
- El WIP ya enhebra `RouteCreativeContractV1` y `RouteCreativeIntentV1` por contracts/domain/provider seam,
  congela contrato + assignments en experiment/snapshots y los incorpora a fingerprints de producción/evaluación.
  El compiler valida revisión, operación, slot, media/MIME y exige materializar cada input autorizado antes del
  spend.
- Evidencia adicional verde: provider-contract typecheck, creative-runner typecheck y suite completa del runner
  **255/255**; `git diff --check` verde. No se ejecutó aún `pnpm check && pnpm build` raíz sobre este WIP.
- Antes del primer commit deben cerrarse cuatro deudas explícitas: validar runtime `authority`/`ordered`/
  `audioPackaging`; modelar combinaciones alternativas reales; reemplazar la IIFE de error y el cast `as never`;
  agregar pruebas de intent, approval stale, fingerprint y materialización tabular Seedance/Omni/Veo.
- P0 no implementado: la identidad aprobada dice Vertex, pero API/worker todavía cablean el transporte Gemini API
  por API key y el driver no ata el endpoint ejecutado al snapshot. Debe reemplazarse por Vertex ADC con simetría
  API/worker antes de cualquier promoción/canary.
- UI no modificada: el prompt sigue en React pero puede quedar fuera del viewport por scroll; operación/modelo/
  inputs continúan mezclados en `MODE_REQUIREMENTS`, el picker oculta imágenes válidas para rutas de video y una
  selección de modo puede cambiar ruta/modelo o recortar referencias en silencio.
- No hubo commit Globe, deploy, migración, rights/policy nueva, promoción, gasto, canary ni mutación runtime durante
  este slice. TASK-1633 y el goal permanecen activos; el siguiente agente debe continuar desde el diff existente,
  no reimplementarlo.

## Delta 2026-08-02 — hallazgo de revisión externa (sesión de monitoreo)

`47c0585` y `db8686e` verificados de forma independiente en copia aislada: `pnpm check` con exit code real
`0` en ambos (1458 y 1481 tests, 0 fallos). Invariantes revisados contra el diff sin hallazgos: proyección
browser-safe sin provider IDs/slugs/costos/secretos, `reference`/`source`/`first-frame`/`motion-source` con
semánticas distintas, control `required` + `unsupported` inválido, sin Omni por Fal, contrato resuelto
server-side desde el catálogo.

**Un hallazgo abierto, latente — no rompe hoy.** En `apps/creative-runner/src/production-route-compiler.ts`
(~línea 345), el snapshot inmutable de `authorizedInputs` hace spread del assignment **después** de los
campos explícitos:

```ts
inputId, sha256, mediaType, rights,
...(experiment.request.creativeIntent?.inputAssignments.find(…) ?? {}),
```

El spread gana por precedencia. Hoy no hay colisión: `RouteInputAssignmentV1` declara
`inputRef | slotId | role | ordinal | referenceRole`. Pero `sha256`/`mediaType`/`rights` provienen del camino
**verificado** (`#verifyRights` resuelve el asset y valida derechos) mientras el spread trae datos del
**intent del caller**, y el objeto alimenta el snapshot inmutable que sostiene lineage. Si
`RouteInputAssignmentV1` gana un `mediaType` —plausible: el slot ya declara `mediaTypes` y registrar el
resuelto sería natural— un valor del caller sobrescribiría en silencio uno verificado dentro del registro que
luego se usa como evidencia.

Misma familia que las dos construcciones ya corregidas en `47c0585`: el `as never` silenciaba al checker donde
debía atrapar el desajuste; la IIFE escondía un throw en un ternario; ésta esconde una precedencia. Arreglo de
una línea — **spread primero, campos verificados después** — para que el orden exprese la regla: lo verificado
gana sobre lo declarado.

Sin cambios aplicados por la sesión de monitoreo: el archivo pertenece a esta task y su dueño decide.

## Delta 2026-08-02 — Fase 1 y Fase 2 cerradas; canary bloqueado por IAM

Continuidad tomada desde el handoff de Codex (`docs/tasks/plans/TASK-1633-plan.md`). Estado real:
**`code complete, rollout pendiente`** — código desplegado y verificado, falta la prueba facturable.

### Cerrado con evidencia

- **Fase 1** (`efeonce-globe@db8686e`). Tres campos declarados y sin validar en runtime, cada uno fallando
  distinto: `authority` inválida se caía del filtro `callerSlots` en silencio (saltándose la paridad legacy);
  `ordered` no tenía **ningún** consumidor; y `audioPackaging` sólo se comparaba contra `'none'`, así que un valor
  desconocido pasaba en una ruta con audio (`('maybe'==='none') !== !true` es `false !== false`). Se agregó además
  el invariante de que `ordered` sobre un slot de `max: 1` es error de autoría.
- **Las tres suites del plan**: fingerprint invalidado en seis ejes por separado (revisión, operación, output
  contract, mecanismo de control, requiredness y combinación elegida); rechazo de placeholder faltante más el caso
  de intercambiar sólo el ordinal de dos referencias; y conformance tabular Seedance/Omni/Veo, que prueba que el
  contrato es un **motor** y no la descripción de una ruta.
- **`inputCombinations` cumple ADR-022** (`efeonce-globe@47c0585`). El ADR declara *conjuntos* en plural, pero el
  generador derivaba exactamente uno y el validador exigía que todo slot con `min > 0` fuera requerido en TODA
  combinación: `prompt-only` junto a `image-conditioned` era irrepresentable. Las combinaciones pasan a ser
  autorables con la derivación como default, y `cardinality.min` se lee como *"si el slot participa, al menos
  min"*. Se preservó la propiedad de seguridad con un invariante que no bloquea alternativas: todo slot declarado
  debe participar en al menos una combinación.
- **Fase 2 — transporte** (`efeonce-globe@55c3761`). El driver gobernado ejecuta por **Vertex ADC** en vez de
  `createGeminiOmniTransport` con API key; el guard de arranque exige `vertexProject` en vez de la key; y el
  transporte ejecuta el **endpoint aprobado del snapshot** en vez de reconstruir el suyo, fallando cerrado con
  `globe_vertex_omni_endpoint_divergence` **antes** de llamar al proveedor. El edit stateful sigue exigiendo la
  superficie Gemini y pertenece a `TASK-1573`.
- **Precedencia de lineage** (`efeonce-globe@b062d6f`, reportado por el operador). El spread del assignment iba
  después de `sha256`/`mediaType`/`rights` en el snapshot inmutable, así que ganaba por precedencia. Hoy no
  colisionan, pero el día que `RouteInputAssignmentV1` gane un homónimo un valor del caller sobrescribiría uno
  verificado dentro del registro de lineage. Spread primero, verificados después.
- **Rollout**: `origin/main` en `b062d6f`, CI verde, API (`globe-api-internal-00192-nmh`, imagen `b062d6f2df11`) y
  Producer worker desplegados desde ese SHA. **Ambas service accounts tienen `roles/aiplatform.user`**, que es la
  simetría que el transporte ADC necesita.
- **Gates**: `pnpm check` y `pnpm build` exit 0. contracts 48 · domain 450 · creative-runner 270 · studio-web 290.

### Bloqueo abierto — canaries facturables

Los canaries terminales de Seedance y Omni **no se ejecutaron**. `pnpm producer:canary` exige acuñar un ID token
impersonando `greenhouse-globe-caller@`, y esa operación devuelve `IAM_PERMISSION_DENIED` sobre
`iam.serviceAccounts.getAccessToken`. Verificado: la identidad operativa local es un **usuario**
(`julio.reyes@efeonce.org`), la API sólo acepta callers que son service accounts, y la política IAM del proyecto
no tiene ningún binding de `serviceAccountTokenCreator` que lo habilite. **No se auto-otorgó el rol**: es el
break-glass que las prohibiciones del plan excluyen.

Tres caminos, en orden de preferencia:

1. **Dos generaciones desde el Producer en el Chrome autenticado del operador.** No es un rodeo: la skill de Globe
   declara que la prueba de salida es una generación real desde la UI, y el script es el carril workload.
2. El operador corre `pnpm producer:canary --execute --approve video:<créditos>` con
   `GLOBE_CANARY_BASE_URL=https://globe-api-internal-a6odmgzpvq-tl.a.run.app`.
3. Grant temporal de `serviceAccountTokenCreator` sobre `greenhouse-globe-caller@`, con revocación y readback.

> **Resuelto 2026-08-03 por `TASK-1635`** (`efeonce-globe@786ee19`): el binding se aplicó por Terraform —plan
> `1 to add`— y la impersonación devuelve `token-returned`. El camino 3 dejó de ser un break-glass y pasó a ser
> infraestructura declarada. **El canary de Omni sigue bloqueado igual**, por el transporte, que es de
> `TASK-1504`: eran dos bloqueos independientes y sólo cayó el de herramienta.

Hasta que exista esa evidencia —un run facturable, un attempt terminal y **un** cobro por generación leído del
ledger, más output retenido, playback, lineage y governance— esta task **no** puede declararse `complete`.

## Delta 2026-08-02 — estado verificado contra el código, no contra el plan

Auditoría independiente de los 13 criterios leyendo el código, no los commits. **7 cerrados, 6 abiertos.**
La task sigue `in-progress`.

**Por qué esto no contradice el "code complete" del handoff anterior:** ese estado se refería a las fases
1–2 del plan de continuidad, que es un marco distinto de estos criterios. Dos varas, ninguna deshonesta.

### Cerrados y verificados

Descriptor browser-safe sin provider IDs/slugs/costos/secretos · slots con media/MIME, cardinalidad, roles,
orden y combinaciones · controles declarando su mecanismo · `reference`/`first-frame`/`edit-source`/
`motion-source` con semánticas distintas hasta el snapshot de lineage · requerido + no soportado falla antes
de reservar · `pnpm check` y `pnpm build` verdes (1.506 tests).

### Abiertos — el eje de APLICACIÓN

El contrato declara **cómo se honraría** cada control. Nada lo honra todavía. Concretamente:

1. **Nadie consume `creativeControls`.** Fuera del catálogo, su validador y los tests: cero consumidores.
   No existe traducción de `prompt-semantic` al prompt ni de `native-parameter` al payload.
2. **`RouteCreativeIntentV1` no lleva valores de control.** Su forma es
   `{schemaVersion, routeRevision, operation, combinationId, inputAssignments}` — no hay campo donde el
   caller ponga «dolly in, contrapicado». El eje entero está sin cablear del lado del pedido.
3. **El fingerprint del approval no incluye valores de control.** `commercial-credit-lifecycle.ts:30` firma
   `{quote, provider, route, model, modelVersion, rateId, catalog, credits}`. Cambiar la dirección de cámara
   **no invalidaría el approval**, que es exactamente lo que el criterio exige.
   > **Corregido 2026-08-02 — la mitad de "ni roles" era falsa; no reimplementar el fingerprint.** `LabQuoteInputV1`
   > (`contracts/src/index.ts:551-561`) transporta `creativeIntent` **y** `routeContract`, y `fingerprint()` hace
   > `stable({q, …})` sobre el quote **entero**. Cambiar revisión, operación, combinación, rol u ordinal **sí**
   > produce `approval_stale` hoy, y el `requestFingerprint` del compiler (`production-route-compiler.ts:295-303`)
   > los incluye explícitamente. Lo único ausente son **valores de control** — porque no existe el campo. La
   > conclusión del punto era correcta; su diagnóstico no.
4. **Sin dual-read/equivalence de rutas legacy** (Slice 4). El único archivo con «equivalence» en el repo es
   de tokens y no tiene relación.
5. **Sin fixtures Omni/Seedance/Veo** que demuestren una intención común con traducciones distintas.
6. **Canary de Omni pendiente.** Seedance **sí** quedó registrado el 2026-08-02: `ref/motion/loop-v1`,
   `candidate_ready`, 16 cr, 1 output, cobro único verificado en el ledger. Omni no: su ruta
   (`ref/motion/reference-v1`, «Elementos») sigue sin promover, y además arrastra un bloqueo propio — el
   binding declara `provider=vertex-omni` sobre `aiplatform.googleapis.com` mientras `app.ts:4173,4175`
   inyectan `createGeminiOmniTransport` por Generative Language. Su canary cobraría por una identidad
   distinta de la aprobada.

### Trabajo del mismo día que NO pertenece a esta task

Para que nadie lo cuente como avance de 1633: la card optimista y el filtro de estado del feed son
`TASK-1559`; el tope de reintentos, las señales de outbox y el motivo diagnosticable son `ISSUE-135`; el
desempate de las policies de rights fue un incidente cuyo arreglo de fondo es `TASK-1634`.

### Alcance restante

Cablear el eje de aplicación (1–3), Slice 4 (4–5) y el canary de Omni (6) — este último **bloqueado** hasta
que TASK-1504 resuelva el transporte.

## Delta 2026-08-02 — razones nombradas y clasificación de fallos (ejecutado)

Dos slices en Globe. **8 de 16 criterios cerrados.** La task sigue `in-progress`.

**Slice 1 — una causa, un código** (`efeonce-globe@8986b45`). `route_creative_contract_mismatch` colapsaba nueve
causas con remedios opuestos. Ocho códigos nuevos, uno por causa. Media type y MIME quedaron separados porque el
remedio difiere: uno pide otro asset, el otro pide convertir el que ya tienes. `route_creative_contract_incomplete`
tiene código propio porque «el pedido llegó a medias» se resuelve re-preparando, no cambiando el contrato — no es
un desajuste. Ambos vocabularios pasaron de union type a array `as const`: un union no sobrevive al compilado y el
Slice 2 necesita enumerarlos.

**Slice 2 — la familia completa, y la regla mecánica** (`efeonce-globe@ac1999f`). El hallazgo que amplió el slice:
de las 35 razones que el compiler sabía nombrar, **sólo dos estaban clasificadas**. Las otras 33 caían a `unknown`,
tope 3, gastando tres entregas cada una en algo determinista. 38 pasan a `terminal`, 3 a `transient` —las únicas
del compiler que se recuperan solas— y 2 se quedan en `unknown` **con su razón declarada**, porque nombran «algo
falló y no sé qué» y ahí el tope 3 es la respuesta prudente, no un olvido.

**Lo que hace que esto no recaiga:** `production-route-failure-classification.test.ts` rompe el build si una razón
nueva nace sin clasificar, y verifica los catch-all en la dirección contraria. Probado en rojo en ambos sentidos, y
la tabla de causas también —colapsando dos a propósito, el test las atrapa—. Diez apariciones de `ISSUE-127`
probaron que acordarse no funciona; lo que funciona es que el build no deje.

**Por qué el defecto de clasificación estaba invisible:** el tope de `ISSUE-135` hizo su trabajo. No hubo 705
entregas. Tres reintentos no llaman la atención de nadie, y esa es exactamente la forma en que una red de seguridad
esconde el problema que estaba conteniendo.

Sin migración: estas razones se registran como `route_dependency_unavailable`, así que el vocabulario cerrado de
`production_router_decisions` no cambia. `pnpm check` y `pnpm build` en exit 0; `creative-runner` 270 → 282.

### Rollout ejecutado y verificado en runtime — 2026-08-02

`efeonce-globe@ac1999f` en `origin/main`, CI verde sobre ese SHA exacto (run `30778011653`). Los dos runtimes que
consumen el compiler y la política de fallos quedaron desplegados desde él:

| Runtime | Evidencia |
|---|---|
| `globe-api-internal` | revisión `00194-l4s`, imagen `…:ac1999f2ea16`, **100 % del tráfico**; responde `403` (vivo y protegido, no 5xx) |
| `globe-producer-worker` | digest `sha256:c3c48db2…`, etiquetado `ac1999f2ea16` en Artifact Registry |

**Blast radius medido, no supuesto.** El cambio altera cuándo muere un job, así que se verificó contra la outbox
viva: `outboxDeadLetter` estaba en **1 desde las 23:41 UTC**, ~2,5 h **antes** del deploy, y venía bajando (5 → 3 →
1) por la limpieza de `ISSUE-135`. Post-deploy sigue en 1 y `outboxRetryStorm` en 0. **El rollout no mató ninguna
corrida**: el único dead letter es preexistente. El worker corre cada minuto con `claimed=0` — sin trabajo
represado.

Nota de método: la lectura directa a Postgres no estaba disponible (ADC vencida con `invalid_rapt`), así que la
evidencia salió del payload estructurado del worker, que ya expone `outboxDeadLetter`/`outboxRetryStorm` desde
`ISSUE-135`. Sirvió mejor que la consulta: da la **serie temporal**, y era la serie —no el valor— la que probaba
que el dead letter no era nuestro.

**Estado: operativamente completo para estos dos slices.** La task sigue `in-progress` por su alcance restante
(eje de aplicación, mecanismos por ruta, Slice 4).

## Delta 2026-08-02 — Slice 3.5a: un solo dueño por valor, y forma declarada (ejecutado y desplegado)

`efeonce-globe@e300c4e`. ADR-022 Delta (b) en código; catálogo **1.6.0 → 1.7.0**.

**`duration`, `aspect-ratio` y `resolution` salieron de `ROUTE_CREATIVE_CONTROLS`.** El dato que lo confirmó al
retirarlos: las **únicas** rutas que declaraban `resolution` como control eran las dos de upscale — precisamente
las que no tienen dirección creativa. El control estaba supliendo la ausencia de un vocabulario de salida que ya
existía en otro lado. Ahora declaran `creativeControls({})`, que describe exactamente lo que un upscale es.
Verificado que no deja consumidores huérfanos: los dos usos de `resolution` en `producer-controller.ts` leen
`constraints.resolution`, o sea el vocabulario correcto.

**`valueShape` cierra la asimetría del descriptor.** Declaraba cómo se honraría un control y si era obligatorio,
pero nada sobre qué se puede pedir; los `inputSlots` sí tenían contraparte tipada y `creativeControls` no tenía
ninguna. `text` para la dirección creativa —alineado al límite de un ingrediente del brief, que es donde estos
valores van a vivir—, `enum` para el conjunto cerrado real de un proveedor, `number` para el paramétrico. El guard
lo exige **en las dos direcciones**: un control honrado sin forma promete algo que nadie puede validar; un
`unsupported` con forma promete una afordancia que la ruta no honra.

Rollout verificado: `globe-api-internal` en revisión **`00195-qj6`** y el worker con digest
`sha256:3324787d…`, ambos etiquetados `e300c4eafa5e`. `outboxDeadLetter` sigue en 1 (el preexistente),
`retryStorm` 0, worker con `claimed=0`, API responde 403. `pnpm check` + `pnpm build` exit 0.

## Delta 2026-08-03 — el contrato verificado con una generación real

**Una pieza salió por el Producer con el catálogo `1.7.0` y el contrato nuevo.** Prompt escrito en la UI
autenticada, estimate vigente, `prepare → execute → provider → settle` completo, `run: completed`,
`experiment: candidate_ready`, pieza visible en el feed y **un solo cobro** (738 → 728 créditos).

Eso cierra la evidencia que faltaba del lado de esta task: el descriptor por ruta no rompió el camino de
generación, y el estimate/approval siguen operando sobre el contrato resuelto server-side.

**Los defectos que aparecieron en el camino NO son de esta task.** Verificar el contrato exigió generar, y generar
destapó una espera de Asset Governance modelada como error que costó una pieza pagada. Su dominio es el lifecycle
de governed runs: está documentado y arreglado en
[`TASK-1469`](TASK-1469-globe-governed-run-lifecycle-submission-fence.md) (Delta 2026-08-03). **1633 destapó, 1469
arregla** — y 1633 no espera a 1469 para cerrar.

Queda igualmente registrado acá porque afecta la lectura de cualquier canary futuro de esta task: una generación
que se quede en «generando» puede ser el lifecycle y no el contrato.

### 🔴 Punto de decisión abierto antes de Slice 3.5b

Al preparar los ingredientes nuevos del brief apareció que **los dos vocabularios no coinciden**, ni en nombres ni
en cobertura:

| | Vocabulario |
|---|---|
| `BRIEF_INGREDIENT_KINDS` | `subject` · `style` · **`light`** · **`framing`** · `mood` · `palette` |
| Controles de dirección | `negative-prompt` · `camera` · `lens` · `composition` · `style` · **`lighting`** · `motion` · `timing` · `audio-direction` |

Dos conceptos con **nombres distintos** (`light`↔`lighting`, `framing`↔`composition`), dos ingredientes que ningún
control declara (`mood`, `palette` — nadie puede saber si una ruta los honra) y seis controles que ningún
ingrediente puede pedir (`camera`, `lens`, `motion`, `timing`, `audio-direction`, `negative-prompt`).

Para que el Delta (b) funcione —el brief es el valor, el contrato dice si se honra— **los dos deben alinearse 1:1**,
con un test que impida que vuelvan a divergir. La decisión abierta es cómo: renombrar para tener un solo nombre por
concepto (más limpio) o mantener nombres y un mapa explícito (más conservador).

**Riesgo que no se pudo verificar:** los experimentos históricos persisten `request.structuredBrief`. Renombrar un
`kind` rompería su lectura. La consulta directa a PG no estaba disponible (ADC vencida), así que **el volumen de
briefs persistidos es un dato pendiente** y es el que debe decidir entre las dos opciones.

### Resuelto leyendo el camino, no la base

El dato que decidía no vino de un `SELECT` — vino de leer las tres capas:

1. **`experiment-store.get()` devuelve el JSON tal cual.** Un brief persistido **nunca se revalida** al leerse.
2. **`normalizeStructuredBrief` se llama en un solo lugar** (`app.ts:1417`), en el camino de **entrada**, sobre
   briefs nuevos.
3. **Lo que alimenta al proveedor es el `effectivePrompt` ya compilado**, congelado en el snapshot del run — no el
   brief.

Renombrar es seguro, y no por suerte: ninguna de las tres capas re-lee el vocabulario. El único caso residual —un
cliente viejo mandando `light` después del renombre— falla **fail-closed** con error de validación, no en silencio,
y el cliente es nuestro propio composer, que se despliega junto. Es la lección de `ISSUE-127` capa 5 otra vez:
leer el camino completo encuentra lo que perseguir por datos no encuentra.

## Delta 2026-08-02 — Slice 3.5b: un solo vocabulario de dirección creativa

Los dos lados quedan alineados 1:1 y con un test que impide que vuelvan a divergir.

- **`light` → `lighting`** y **`framing` → `composition`**: un nombre por concepto.
- **Al brief** entran `camera`, `lens`, `motion`, `timing`, `audio-direction` — antes eran controles que ninguna
  superficie podía pedir.
- **A los controles** entran `subject`, `mood`, `palette` — antes eran ingredientes que se podían pedir sin que
  ninguna ruta declarara si los honra.
- **Tres controles quedan sin ingrediente, declarados y verificados**: `prompt` (es el brief entero),
  `negative-prompt` (viaja en `notes`) y `seed` (determinismo, no dirección).

**Las tres formas de divergencia eran silenciosas** —un ingrediente sin control produce una promesa que nadie
validó; un control sin ingrediente, soporte que ningún caller puede ejercer; y dos nombres para un concepto, ambas
cosas a la vez— por eso hace falta un test y no una convención. `structured-brief-vocabulary.test.ts` cubre las dos
direcciones más la honestidad de las excepciones: si `negative-prompt` deja de ser un caso especial, su entrada
queda mintiendo y el test lo dice.

De paso, los fixtures de controles pasan a **derivarse** del vocabulario en vez de copiarlo. El dato que lo
justifica: el vocabulario estaba copiado literal en **cuatro** lugares, y cada copia rompió por separado y **en
una capa distinta** — guard del catálogo (4 tests rojos), error de **tipo** en el runner (el cast dejó de tener
overlap), aserción del vocabulario en contracts, y test de integración del compilador en studio-web. Ninguno es el
sistema fallando: es el mismo dato avisando cuatro veces, y ese ruido escondería una regresión real cuando
aparezca. Los fixtures de **ingredientes** siguen literales a propósito: son casos de uso concretos, no la lista.

Rollout verificado: `efeonce-globe@1b580f8`, API en revisión **`00196-27t`** y worker con digest
`sha256:31d84697…`, ambos etiquetados `1b580f8a5fa0`. `outboxDeadLetter` sigue en 1 (el preexistente),
`retryStorm` 0, worker con `claimed=0`, API responde 403. `pnpm check` + `pnpm build` exit 0; domain 458 → 462.

## Delta 2026-08-03 — Slice 3.5c: la compilación del prompt deja de ser un molde único

`efeonce-globe@91d1f71`. ADR-022 Delta (c), primera mitad. Tres cambios:

1. **El contrato de ruta llega al compilador.** Antes se resolvía **después** de compilar el prompt, así que
   estructuralmente no podía informarlo. Leer el `referenceRoute` sin validar es seguro: una ruta inexistente da
   `undefined`, el compilador cae al comportamiento legacy y `validatePreparePayload` la rechaza dos líneas abajo.
2. **Un ingrediente que la ruta no honra se RECHAZA**, con el control nombrado del lado del servidor. Degradarlo
   en silencio es lo que este contrato existe para evitar: el caller pide dirección de cámara, paga, y recibe una
   pieza donde nadie la aplicó.
3. **El peso ordena y ya no se imprime.** `[weight=0.820]` viajaba al proveedor como texto — un encoder de difusión
   no tiene jerarquía de instrucción, convierte todo en embeddings que compiten en una secuencia plana. Gastaba
   tokens y no condicionaba. El orden sí, porque la atención sigue la estructura del lenguaje.

**El `catch` volvió a colapsar la razón, en código escrito para cerrar ese bug class.** El bloque que envolvía la
compilación mapeaba todo a `badRequest`, incluida la razón nueva. «La ruta no honra ese control» no es «el brief
está mal formado» y la acción del operador es distinta —elegir otra ruta o quitar esa dirección, no corregir el
JSON—. Se re-lanza tal cual. Undécima aparición del patrón de `ISSUE-127`, y la primera que se atrapa **antes** de
mergear.

### Dos límites declarados, autorizados por el operador

- **El peso no se pudo verificar con un canary** (bloqueados por el transporte de `TASK-1504`). Es una mejora
  razonada sobre cómo condicionan estos modelos, **no una mejora verificada**. Si una regresión de calidad
  apareciera, éste es el primer sospechoso.
- **El rechazo rompe un flujo que hoy "funciona":** un usuario en upscale con preset de estilo activo recibía una
  generación que ignoraba el estilo y le cobraba; ahora recibe error sin gasto. La UI que evita el caso es
  `TASK-1552`. Se eligió el error explícito sobre el cobro silencioso.

Rollout verificado: API en revisión **`00197-f9z`** y worker con digest `sha256:76d31673…`, ambos etiquetados
`91d1f71689c0`. `outboxDeadLetter` en 1, `retryStorm` 0, **cero errores del API** en la ventana post-deploy.
`pnpm check` exit 0; domain 462 → 463.

## Delta 2026-08-02 — auditoría arquitectónica contra los incidentes del día (`arch-architect`)

Revisión leyendo el código de Globe contra `ISSUE-126`, `ISSUE-127` e `ISSUE-135`. **El eje de inputs está bien
resuelto y no se toca.** Lo que cambia son los criterios, un slice nuevo y dos filas de riesgo. Tres hallazgos,
por orden de costo de revertir:

**1 — `creativeControls` no es un eje nuevo: es el tercero que expresa lo mismo.** Ver Slice 3.5. Es el hallazgo
caro porque cae exactamente sobre el trabajo que falta: cablear valores antes de unificar el vocabulario fija la
duplicación dentro del fingerprint, y ahí deja de ser una puerta de dos vías. El modo de fallo no es un conflicto
detectable sino **precedencia silenciosa** — misma familia que el spread de lineage corregido en `b062d6f`, un
nivel más arriba.

**2 — La décima aparición del bug class de `ISSUE-127`, y esta vez la task ya tenía escritos los nombres
correctos.** La sección `Security and access` promete cinco códigos canónicos; **los cinco tienen cero
ocurrencias en Globe**. El compiler colapsa nueve causas con acciones opuestas —re-estimar, cambiar operación,
cambiar el asset, convertir el archivo— en un único `route_creative_contract_mismatch`. La regla que ese issue
derivó de nueve apariciones es literal: *una sanitización sin contraparte de observabilidad no protege
información, la destruye*; y su novena aparición fue código escrito el mismo día por quien documentaba las ocho.
El patrón de salida ya está canonizado en el propio repo: las 24 razones nombradas de
`ProductionRouteDependencyError`.

**3 — El rechazo determinista de contrato entra a la máquina de reintentos sin clasificar.**
`route_creative_contract_mismatch` no está en `TERMINAL_CODES` (`governed-run-failure-policy.ts:44-70`) pese a
cumplir su criterio de admisión al pie de la letra: *"si dos entregas separadas por una hora dan el mismo
resultado sin que nadie toque nada, va acá"*. Cae a `unknown`, tope 3. Es la versión atenuada de las 705 entregas
de `ISSUE-135` — y no es coincidencia de dominio: el error que produjo aquel zombi,
`provider_input_resolution_failed`, nace de un `catch {}` mudo (`governed-provider-runtime.ts:85`) en el **mismo
camino de materialización de inputs** que esta task endureció.

Menores, ya incorporados arriba: el criterio 7 se cumplía de forma vacua (guard de autoría, no de ejecución);
`RouteCreativeControlSupportV1` no declara la forma del valor, así que el fail-closed no alcanza al eje de
controles; y `vendor/efeonce-globe/` queda fuera de scope **por decisión declarada**, no por olvido.

Corregido además el punto 3 del delta anterior: el fingerprint **sí** incluye roles y ordinales. Queda anotado
in-place para que nadie reimplemente algo que ya funciona.

Nada de esto cambia el veredicto de estado: la task sigue `in-progress`, con el eje de aplicación abierto y el
canary de Omni bloqueado por el transporte de TASK-1504. Lo que cambia es que ese eje **ya no es plomería**:
tiene una pregunta de dueño que resolver antes.

## Delta 2026-08-03 — estado de cierre: 10 de 17, agrupados por naturaleza

**Este delta existe para que quien retome no dimensione mal el trabajo restante.** Los 7 criterios abiertos
**no son siete trabajos**: son un bloque acoplado, dos lecturas, una higiene y uno que no pertenece a esta
task. Todo lo de abajo está verificado leyendo el código de `../efeonce-globe`, no los commits.

### 🔒 Esta task ya no depende de ninguna otra para cerrar

Declararlo explícito porque los deltas anteriores dejaron dos bloqueos que **ya no aplican**:

- **El canary de Omni migró a `TASK-1504`** (Delta b, 2026-08-02). Una foundation no puede quedar abierta
  esperando un canary que no controla, y ése está bloqueado por el transporte, que es de 1504. Aquí es
  dependencia de rollout, no criterio propio.
- **El criterio de consumers es de `TASK-1552`** (ver más abajo).

O sea: **el alcance restante de 1633 es ejecutable de punta a punta sin esperar a nadie.**

### Bloque A — un solo trabajo, no tres (segunda mitad de ADR-022 Delta c)

Los tres criterios de abajo **dependen del primero**; intentarlos por separado significa hacer el primero
tres veces.

1. **La compilación del prompt efectivo detrás del adapter, con su revisión en el fingerprint.**
   Estado real: la primera mitad está hecha (`@91d1f71` — el compilador **recibe** el contrato de ruta y
   rechaza lo que la ruta no honra). Faltan las otras dos: `compileStructuredBrief` sigue siendo una
   **función global de `domain`** (`packages/domain/src/structured-briefs.ts:180`), invocada desde
   `apps/studio-web/src/app.ts:1416-1418`; y **no existe `promptCompilerRevision` en ningún fingerprint** —
   verificado por grep, **cero ocurrencias en todo el repo**. Sin esa revisión, dos textos distintos para el
   mismo brief comparten approval, que es exactamente lo que el criterio prohíbe.
2. **Los fixtures que demuestran traducciones distintas por adapter.** Mitad hecha: `producer-catalog.test.ts:656`
   ya prueba que Seedance/Omni/Veo resuelven por el **mismo helper sin branch por ruta** — o sea que el
   contrato es un motor, no la descripción de la ruta #1. La otra mitad —*traducciones distintas dentro de
   adapters*— **no puede escribirse todavía**, porque no hay adapter donde vivan: depende literalmente de (1).
3. **La invalidación del estimate ante cambio de controles.** El fingerprint del quote ya cubre revisión,
   operación, combinación, rol y ordinal (`LabQuoteInputV1` transporta `creativeIntent` **y** `routeContract`,
   y `fingerprint()` hace `stable()` sobre el quote entero). Lo que falta entra por (1): el valor de control
   viaja dentro del brief, y la **revisión del compilador** es lo que hace que dos compilaciones distintas del
   mismo brief no compartan approval.

**Orden obligatorio: 1 → 2 → 3.** No hay atajo.

### Bloque B — dos criterios de lectura, no de código

Ninguno de estos dos pide construir nada nuevo. Piden **ir a leer** y escribir lo que se encontró.

4. **Los mecanismos declarados por ruta, con evidencia oficial del proveedor.** Medido hoy: el catálogo tiene
   **17 rutas con `creativeContract`** y sólo **4 declaran `controls:` propios**
   (`packages/domain/src/producer-catalog.ts:370, 566, 597, 631`) — las otras **13 heredan `PROMPT_CONTROLS`**
   por el default de `producer-catalog.ts:146`. Y el dato que lo vuelve urgente: **ningún adapter manda campo
   negativo nativo** — cero ocurrencias de `negative_prompt`/`negativePrompt` en `apps/creative-runner/src`.
   O sea que **`negative-prompt: prompt-semantic` es hoy una promesa heredada**, en 13 rutas que nadie
   verificó, sobre un mecanismo que además tiende a reforzar lo que niega. El trabajo es leer el contrato
   oficial de cada proveedor y declarar el mecanismo real por ruta.
5. **La evidencia de controles aplicados/rechazados en el manifest.** El manifest/run snapshot debe conservar
   schema revision, roles y **qué controles se aplicaron, degradaron o se rechazaron**, sin secretos. Hoy el
   rechazo existe y tiene nombre del lado del servidor, pero no queda escrito en la evidencia del run.

### Bloque C — un criterio de higiene

6. **Slice 4: dual-read, equivalence de rutas legacy y gate de rutas nuevas.** Que una ruta nueva no pueda
   registrarse sin descriptor, y que las legacy tengan equivalence tests. Independiente de A y B; se puede
   hacer en paralelo.

### Bloque D — un criterio que NO es de esta task

7. **«La proyección expone el descriptor a todas las surfaces por el reader canónico»** — *que un consumer lo
   lea*. El descriptor **ya viaja al navegador**: `ProducerCatalogViewV1.creativeContract`
   (`packages/contracts/src/producer-catalog.ts:335,364`) llega dentro de la proyección de flota. Y el
   composer **lo ignora**: verificado hoy, **cero ocurrencias de `creativeContract`, `creativeControls` o
   `inputSlots` en `apps/studio-client/src`**.

   Eso es **`TASK-1552`**, la única dueña del composer, y su registry ya lo declara. **Propuesta: moverlo a
   1552 o marcarlo como dependencia externa de rollout**, igual que se hizo con el canary de Omni. Una
   foundation que expone correctamente su proyección no puede quedar abierta porque su consumidor todavía no
   la lea.

### Dos límites vivos, autorizados por el operador — no son deuda oculta

- **Quitar el peso del prompt no se verificó con canary.** `[weight=0.820]` viajaba al proveedor como texto y
  se retiró por razonamiento sobre cómo condicionan estos modelos (un encoder de difusión no tiene jerarquía
  de instrucción; el orden sí condiciona, la etiqueta no). Es una mejora **razonada, no verificada**: si
  aparece una regresión de calidad de salida, **éste es el primer sospechoso**.
- **El rechazo en upscale con preset de estilo activo es intencional.** Antes el usuario recibía una
  generación que ignoraba el estilo y le cobraba igual; ahora recibe error sin gasto. Se eligió el error
  explícito sobre el cobro silencioso. **La UI que evita llegar a ese caso es `TASK-1552`** — no es un bug de
  esta task ni se "arregla" relajando el rechazo.

### Resumen ejecutable

| Bloque | Criterios | Naturaleza | ¿Paralelizable? |
|---|---|---|---|
| A | compilación tras adapter + revisión en fingerprint · fixtures por adapter · invalidación del estimate | **un solo trabajo, secuencial** | no — 1 → 2 → 3 |
| B | mecanismos por ruta con evidencia · evidencia de controles en manifest | lectura + declaración | sí |
| C | Slice 4 (dual-read + gate) | higiene | sí |
| D | consumer lee la proyección | **no es de 1633** → `TASK-1552` | n/a |

## Delta 2026-08-05 — contrato de tres estudios, no composer genérico

El benchmark de Higgsfield y Magnific confirma que la brecha del Producer está en cómo se presenta el contrato,
no en crear otra capa de providers. Esta task conserva el contrato neutral como autoridad: Imagen, Video y Audio
comparten operación, slots, controles, output y estimate donde corresponde, pero cada modalidad debe poder declarar
su propia forma de trabajo y revisión. La UI consumidora `TASK-1552` queda responsable de materializar esa diferencia
sin inferirla desde la cantidad de referencias, el provider o el slug del modelo.
