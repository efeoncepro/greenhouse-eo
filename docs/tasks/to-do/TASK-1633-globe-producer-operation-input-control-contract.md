# TASK-1633 — Globe Producer Creative Operation, Input Roles and Control Support Contract

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
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
- Status real: `Diseño aprobado por el operador; contrato compartido y ADR pendientes`
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
- `../efeonce-globe/apps/studio-web/src/governed-production-composition.ts`
- tests de contracts/domain/compiler correspondientes
- `docs/architecture/creative-studio/`
- `docs/operations/creative-studio/`

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
- Error contract: `route_operation_unsupported`, `route_input_slot_invalid`, `route_input_combination_unsupported`, `route_control_unsupported`, `route_contract_revision_mismatch` o equivalentes canónicos.
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

Los controles comunes incluyen cámara, movimiento, lente, estilo, iluminación, ritmo, temporalidad, audio,
duración, ratio, resolución, seed y restricciones negativas. El descriptor no obliga a mostrar todos: declara
soporte y mecanismo. La compilación prompt-semantic ocurre server-side desde un brief neutral y registra qué se
aplicó; el browser sólo envía elecciones tipadas. `unsupported` requerido aborta antes del estimate/spend.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

`ADR → tipos/validators → compiler/fingerprint → fixtures legacy → gate nuevas rutas → consumers`. TASK-1504 no
modifica el catálogo Omni y TASK-1552 no retira modos visuales antes de que Slice 3 proyecte el descriptor estable.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| Descriptor nuevo cambia una ruta promovida | routing/spend | medium | dual-read + equivalence tests + pause por ruta | `route_contract_revision_mismatch` |
| Control requerido se pierde al compilar | provider seam | medium | applied/rejected controls + fail-closed | `route_control_rejected` |
| Fingerprint no incluye referencia/control | ledger/idempotency | high | golden fingerprint tests y estimate invalidation | mismo approval para recipe distinta |
| UI vuelve a crear matriz propia | UI/contracts | medium | reader único + conformance + TASK-1552 consumer | branches por model name |
| Scope se convierte en integración Fal | provider governance | low | out-of-scope y no secret/slug changes | nuevo endpoint/provider binding |

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

- [ ] ADR aceptado e indexado define operación, slots/roles, controles, mecanismo de soporte y output contract.
- [ ] El catálogo expone un descriptor versionado browser-safe sin provider IDs/slugs/costos/secrets.
- [ ] Slots declaran media/MIME, cardinalidad, roles, orden, límites y combinaciones válidas.
- [ ] Controles declaran `native-parameter | prompt-semantic | reference-conditioned | preprocessed | postprocessed | unsupported`.
- [ ] `reference`, `first-frame`, `edit-source` y `motion-source` conservan semánticas distintas hasta manifest/lineage.
- [ ] Estimate/approval/idempotency invalidan ante cambios de ruta, inputs/roles, controles u output.
- [ ] Un control/input requerido no soportado falla antes de reserva/provider submit con error canónico.
- [ ] Manifest/run evidence conserva schema revision, roles y controles aplicados/rechazados sin secretos.
- [ ] Rutas legacy tienen dual-read/equivalence tests y rutas nuevas no pueden registrarse sin descriptor.
- [ ] Fixtures Omni/Seedance/Veo demuestran una UI intent común con traducciones distintas dentro de adapters.
- [ ] UI/SDK/MCP/CLI consumen la misma proyección o permanecen explícitamente policy-blocked/unsupported.
- [ ] La task consumidora registra canaries UI terminales de Seedance y Omni con un cobro/output por generación.
- [ ] `pnpm check && pnpm build` en Globe y gates documentales Greenhouse quedan verdes.

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

- Resolver en ADR si `operation` se versiona dentro de cada ruta o como catálogo compartido referenciado; no cambia
  la separación obligatoria entre operación, inputs y controles.
