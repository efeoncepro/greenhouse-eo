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
- Status real: `Foundation local sin commit en Globe; handoff ejecutable documentado, rollout/UI/canaries pendientes`
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

- [x] ADR aceptado e indexado define operación, slots/roles, controles, mecanismo de soporte y output contract.
- [x] El catálogo expone un descriptor versionado browser-safe sin provider IDs/slugs/costos/secrets.
- [x] Slots declaran media/MIME, cardinalidad, roles, orden, límites y combinaciones válidas.
- [x] Controles declaran `native-parameter | prompt-semantic | reference-conditioned | preprocessed | postprocessed | unsupported`.
- [x] `reference`, `first-frame`, `edit-source` y `motion-source` conservan semánticas distintas hasta manifest/lineage.
- [ ] Estimate/approval/idempotency invalidan ante cambios de ruta, inputs/roles, controles u output.
- [ ] Un control/input requerido no soportado falla antes de reserva/provider submit con error canónico. **Desmarcado 2026-08-02:** el guard existe pero es de **autoría del catálogo** (`producer-catalog.ts:914`, corre al cargar), no de ejecución; como no hay canal para que un caller pida un control, la condición es hoy inalcanzable y el criterio se cumplía de forma vacía. El guard de autoría se conserva.
- [ ] Cada rechazo de contrato tiene **razón nombrada del lado del servidor** y nace clasificado `terminal` en la política de fallos. Hoy `production-route-compiler.ts:504-524,551` colapsa nueve causas accionables distintas —contrato ausente · intent ausente · revisión · operación · slot inexistente · rol · media type · MIME · input no materializado— en un único `route_creative_contract_mismatch`, y ninguna está en `TERMINAL_CODES`.
- [ ] Un solo vocabulario es dueño de cada valor de dirección creativa; ningún control declara un valor cuyo dueño es `StructuredBriefV1` o `RouteConstraintsV1` (Slice 3.5), con test que lo sostenga.
- [ ] La compilación del prompt efectivo recibe el contrato de ruta, vive detrás del adapter y su revisión entra al fingerprint; la implementación por defecto preserva el texto actual de todas las rutas existentes (ADR-022 Delta (c)).
- [ ] Ningún control declara su mecanismo por herencia del default: las 17 rutas lo declaran con evidencia del contrato oficial de su proveedor, en particular `negative-prompt`, que hoy ninguna ruta puede honrar de forma nativa.
- [ ] Manifest/run evidence conserva schema revision, roles y controles aplicados/rechazados sin secretos.
- [ ] Rutas legacy tienen dual-read/equivalence tests y rutas nuevas no pueden registrarse sin descriptor.
- [ ] Fixtures Omni/Seedance/Veo demuestran una UI intent común con traducciones distintas dentro de adapters.
- [ ] La proyección expone el descriptor a todas las surfaces por el reader canónico. **Verificado 2026-08-02:** ya
      viaja (`ProducerCatalogViewV1.creativeContract` → proyección de flota); que un consumer lo lea o permanezca
      `policy-blocked`/`unsupported` es criterio de ese consumer, no de la foundation.
- [x] ~~La task consumidora registra canaries UI terminales de Seedance y Omni.~~ **Migrado a `TASK-1504`
      (Delta b) el 2026-08-02.** Una foundation no puede quedar abierta esperando un canary que no controla, y el
      de Omni está bloqueado por el transporte, que es de 1504: la identidad declara `vertex-omni` mientras el
      runtime inyecta Generative Language, así que cobraría por una identidad distinta de la aprobada. El de
      Seedance ya está registrado (16 cr, `candidate_ready`, cobro único verificado). Aquí queda como dependencia
      de rollout, no como criterio propio.
- [x] `pnpm check && pnpm build` en Globe y gates documentales Greenhouse quedan verdes.

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
