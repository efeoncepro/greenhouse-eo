# TASK-1572 — Globe Producer Regional Image Editing

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1572-globe-producer-regional-image-editing.md`
- Flow: `docs/ui/flows/TASK-1572-globe-producer-regional-image-editing-flow.md`
- Motion: `docs/ui/motion/TASK-1572-globe-producer-regional-image-editing-motion.md`
- Backend impact: `command`
- Epic: `EPIC-028`
- Status real: `Diseño listo; consumer bloqueado por la ruta regional gobernada y el Focus Canvas`
- Rank: `TBD`
- Domain: `creative|ui|product`
- Blocked by: `TASK-1497`, `TASK-1571`
- Branch: `task/TASK-1572-globe-producer-regional-image-editing`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construye la experiencia premium de edición de imágenes dentro del Focus Canvas real de Globe Producer. Permite
editar una imagen completa o seleccionar una zona para reemplazar, eliminar o agregar contenido, con máscara gobernada,
estimate antes del gasto, modos Preciso/Natural, lineage y comparación sin sobrescribir el original.

## Why This Task Exists

Globe ya tiene el seam backend para una edición regional en `TASK-1497`, pero el Producer React no tiene una experiencia
honesta para seleccionar una zona, entender qué se protegerá, elegir el nivel de preservación y recuperarse de estados
gated/async. El diálogo legacy no es source of truth: copiarlo produciría una promesa falsa de control y enviaría la
UI hacia detalles de provider que deben permanecer server-side.

## Goal

- Dar al productor un flujo editorial para editar una región dentro del viewer existente.
- Convertir la selección visual en una referencia gobernada consumible por `globe.lab.experiment.prepare`.
- Hacer visible el costo, la política de preservación, la disponibilidad de la ruta y la inmutabilidad del original.
- Entregar estados desktop/390px, teclado, focus restoration y reduced motion verificables con GVC.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/README.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `../efeonce-globe/apps/studio-client/src/surfaces/producer/`

Reglas obligatorias:

- Extender `TASK-1571` y el viewer real; no crear una segunda galería, editor ni ruta `/producer/edit`.
- La UI envía sólo referencias gobernadas, intención y prompt; nunca bytes, URLs de provider ni campos vendor-specific.
- Command, estimate, capability, rights, lineage y spend fence son server-authoritative.
- Mostrar edición regional sólo cuando la proyección de disponibilidad lo declare disponible.
- No presentar Preciso como garantía si el runtime no entregó evidencia de preservación estricta.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/ui/wireframes/TASK-1572-globe-producer-regional-image-editing.md`
- `docs/ui/flows/TASK-1572-globe-producer-regional-image-editing-flow.md`
- `docs/ui/motion/TASK-1572-globe-producer-regional-image-editing-motion.md`

## Dependencies & Impact

### Depends on

- `TASK-1497` — command, máscara server-internal, rutas regionales, preservación y canary backend.
- `TASK-1571` — Focus Canvas, viewer-preview, compare, dialog y focus restoration.
- `TASK-1559` — continuidad y ownership del Producer Feed + Viewer React.
- `TASK-1532` — estimate/approval/spend flow compartido.
- `TASK-1553` / `TASK-1554` — route catalog y disponibilidad honesta de la flota.

### Blocks / Impacts

- Impacta `ProducerViewer`, `MediaStage`, `ProducerFeed` y el namespace de copy de `apps/studio-client`.
- Habilita el consumer visual de `TASK-1497`; no modifica el provider seam.
- Coordinar archivos compartidos con `TASK-1555` y `TASK-1571` antes de tomar ownership.

### Files owned

- `../efeonce-globe/apps/studio-client/src/surfaces/producer/viewer/`
- `../efeonce-globe/apps/studio-client/src/primitives/` sólo si hace falta extender una primitive existente.
- `../efeonce-globe/apps/studio-client/src/copy/` namespace `producerImageEdit`.
- `../efeonce-globe/apps/studio-client/scripts/` canary/GVC de la superficie.
- Los tres contratos UI declarados en `## Status`.

## Current Repo State

### Already exists

- Producer React en `/producer`, viewer nativo, `MediaStage`, inspector y lifecycle de governed media.
- Contracts `editFrom.region`, máscara server-internal y `editScope` de `TASK-1497`.
- Estimate server-side y CTA contract de `TASK-1532`.
- Focus Canvas y compare diseñados en `TASK-1571`.

### Gap

- No existe herramienta React para pintar/editar una zona con máscara gobernada.
- No existe la distinción UX entre edición completa, edición regional, Preciso y Natural.
- No existen estados para máscara vacía, ruta no soportada, estimate stale, preservación degradada o retry con la misma máscara.

## Modular Placement Contract

- Topology impact: `ui-package`
- Current home: `../efeonce-globe/apps/studio-client/src/surfaces/producer/`
- Future candidate home: `ui-package`
- Boundary: viewer compone; browser mantiene máscara efímera y overlay; commands/readers autorizan, cotizan y ejecutan.
- Server/browser split: browser registra referencia; server normaliza máscara, valida rights, route, spend, lineage y preservación.
- Build impact: bundle `studio-client`; sin SDK de provider ni dependencia pesada nueva.
- Extraction blocker: sesión, dialog, media resolver y routing siguen acoplados al runtime actual de Globe.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: productor/editor creativo.
- Momento: revisar una imagen y solicitar una modificación controlada.
- Resultado: entiende zona, intención, preservación, costo y estado del resultado.
- No-goals: creación desde cero, video, segmentación automática, crop o editor pixel-level.

### Surface & system decision

- Surface: Focus Canvas dentro de `/producer`.
- Composition Shell: `aplica`; conserva Producer y dialog de `TASK-1571`.
- Primitive decision: `extend`; extender `MediaStage`/inspector; crear `ImageEditRail` sólo si es necesario.
- Adaptive density: rail lateral desktop, stack/bottom sheet mobile sin overflow.
- Dialog decision: no modal dentro del dialog; rail contextual en la superficie existente.
- Copy source: `apps/studio-client/src/copy/` namespace `producerImageEdit`.
- Access impact: projection de capabilities/views; no scope OAuth nuevo.

### State inventory

- Full edit, regional edit, drawing, empty/invalid/ready mask.
- Estimate loading/stale/available/insufficient.
- Capability available/gated/unsupported, denied, provider failure, unknown outcome.
- Precise/natural, running, success, partial/degraded, retryable.
- Desktop, 390px, touch, keyboard/focus and reduced motion.

### Interaction contract

- Primary: abrir Editar zona, pintar, elegir intención, escribir prompt, revisar estimate y ejecutar.
- Controls siempre visibles o accesibles por teclado; no hover-only.
- Pending bloquea duplicate spend y conserva máscara/prompt.
- Escape sale primero del modo selección; segundo Escape cierra y restaura foco.
- Latency feedback explícito para validación, estimate, preparación, ejecución y reconciliación.

### Motion & microinteractions

- Motion primitive: CSS/Greenhouse motion tokens existentes.
- Enter/exit y layout morph sólo dentro del rail/overlay; no mover el shell.
- Reduced motion: cambios instantáneos, mismos labels, focus y announcements.
- No usar motion para ocultar latencia o unknown outcome.

### Implementation mapping

- Route/surface: `/producer` → `ProducerViewer`, `MediaStage`, inspector.
- Primitive/variant/kind: reuse/extend dialog, toolbar, button, field, alert y media primitives.
- Component candidates: `ImageEditRail`, `MaskCanvasLayer`, `EditIntentControl`, sólo después de lookup.
- Data reader/command: availability, governed media/lineage, `globe.lab.experiment.prepare` y estimate/execute existentes.
- Access/capability: capability de Lab y disponibilidad por ruta; estados gated honestos.

### GVC scenario plan

- Scenario file: `../efeonce-globe/scripts/frontend/scenarios/producer-regional-image-editing.mjs` [a crear].
- Route: `/producer`; viewports: desktop 1440px y 390px; quality `premium`.
- Steps: abrir imagen → editar zona → máscara → intención → preciso/natural → estimate → gated → execute → compare → retry → keyboard → reduced motion.
- Markers: `producer-image-edit`, `producer-image-edit-mask`, `producer-image-edit-intent`, `producer-image-edit-estimate`, `producer-image-edit-result`.
- Assertions: no overflow, accessible names, focus restoration, unsupported disabled, stale estimate gate, original disponible.
- Review dossier: `docs/ui/reviews/TASK-1572-globe-producer-regional-image-editing.scorecard.json`.
- `UI ready` permanece `no` hasta evidencia y review.

### Design decision log

- Concepto visible: “Editar zona”, no “Inpaint”.
- Alternativas descartadas: modal genérico, ruta de editor separada, controles directos de provider.
- Razón: conserva contexto, lineage y diferencias de proveedores detrás de capabilities gobernadas.
- Reuse/extend/new: extender Focus Canvas/inspector; `ImageEditRail` sólo como patrón acotado.
- Riesgo: cambios fuera de la selección; Preciso requiere evidencia backend de `TASK-1497`.

### Visual verification

- GVC premium a 1440px y 390px; captures de default, selection, estimate, unsupported, running y result/compare.
- Keyboard selection fallback, dialog focus restore, reduced motion y announcements.
- `scrollWidth === clientWidth` en desktop y mobile.
- Scorecard: `docs/ui/reviews/TASK-1572-globe-producer-regional-image-editing.scorecard.json`.
- Threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`.

## Backend/Data Contract

- Esta task consume, pero no redefine, el command de `TASK-1497` ni el estimate/approval de `TASK-1532`.
- El browser envía sólo referencia gobernada de máscara, intención y prompt; server gobierna normalización, rights,
  route, costo, lineage, preservación y provider mapping.
- No se crea API, schema, migration, adapter ni capability nueva.
- No hay bytes de máscara, URL firmada ni campo vendor-specific en payload/browser logs.
- No se ejecuta sin estimate/approval vigente; el original permanece inmutable y el resultado es un hijo.

## Hybrid Execution Justification

- Why not split: el backend reusable ya pertenece a `TASK-1497`; esta task sólo consume el command existente y no
  cambia schema, API, adapter ni source of truth.
- Primary execution profile: `ui-ux`.
- Contract boundary: React autoriza una intención y una referencia de máscara; Globe server-side resuelve, cotiza,
  ejecuta y registra la edición.
- Risk controls: blocked by `TASK-1497`, capability-gated, estimate/approval vigente, no bytes en browser y rollback
  ocultando la acción sin alterar datos.

## Scope

### Slice 1 — Focus Canvas handoff y modos de edición

- Agregar entrada Editar imagen/Editar zona al viewer y Edit Rail contextual.
- Implementar full/regional edit y estados de capability.

### Slice 2 — Mask authoring e intención

- Implementar overlay alineado a source dimensions, brush/eraser, undo/redo, zoom/pan y fallback rectangular accesible.
- Implementar Replace/Remove/Add, Precise/Natural, prompt, cobertura y aviso de borde.

### Slice 3 — Estimate, execute y recovery

- Consumir estimate/prepare/execute gobernados con stale invalidation y duplicate-spend prevention.
- Renderizar child result, compare, retry con la misma máscara y unknown-outcome recovery.

### Slice 4 — Verificación visual y accesibilidad

- Agregar escenario GVC, captures desktop/390px, keyboard/reduced motion, scorecard y no-overflow checks.

## Detailed Spec

La máscara se dibuja sobre la representación gobernada del Focus Canvas, pero el cliente conserva únicamente estado
efímero y la referencia registrada. El adapter de `TASK-1497` determina dimensiones, dilatación, feather, provider
route y recomposición; esta task sólo proyecta estado y envía la intención mediante el command existente. Cada cambio
de máscara, intención, fuente o política de preservación invalida el estimate visible. La ejecución siempre crea un
experimento hijo y deja disponible la comparación con el padre.

<!-- ZONE 2 — PLAN MODE (se completa al tomar la task) -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Out of Scope

- Backend mask normalization, provider routing, adapter, recomposición strict o provider canaries: `TASK-1497`.
- Nuevo feed/viewer, zoom/pan primitive o lineage reader: `TASK-1571`.
- Video, temporal masks, automatic segmentation, crop, editor pixel-level o nuevo OAuth scope.

## Rollout Plan & Risk Matrix

1. `TASK-1497` prueba una ruta regional y su contrato de preservación.
2. `TASK-1571` entrega el handoff estable del Focus Canvas.
3. `TASK-1572` se habilita detrás de los flags/capability projections existentes.
4. GVC y revisión humana pasan antes de aumentar disponibilidad.

| Risk | Mitigation | Rollback |
|---|---|---|
| UI promete ruta no lista | availability projection y estado gated | ocultar Editar zona |
| drift de coordenadas | source-dimension transform tests y overlay evidence | bloquear ejecución |
| stale estimate/duplicate spend | approval token y single-flight existentes | deshabilitar CTA y reconciliar |
| cambio fuera de máscara | Preciso/Natural honestos y evidencia backend | marcar degraded/recomponer |
| overflow/focus mobile | GVC 390px + keyboard/focus assertions | conservar viewer actual |

## Acceptance Criteria

- [ ] Usa el Focus Canvas real de `/producer` y no crea ruta o dialog paralelo.
- [ ] Permite full edit y regional edit con estados available/gated/unsupported honestos.
- [ ] Mask authoring tiene brush, eraser, undo/redo, zoom/pan y fallback rectangular accesible; coordina source dimensions.
- [ ] Replace/Remove/Add, Precise/Natural, prompt, coverage y copy viven en el namespace de copy.
- [ ] Browser payload contiene sólo referencias gobernadas e intención; no bytes ni provider fields.
- [ ] Estimate/approval es server-authoritative, stale después de cambios relevantes y previene duplicate spend.
- [ ] Crea child result sin sobrescribir original y permite compare, retry con misma máscara y unknown-outcome recovery.
- [ ] Loading, empty, invalid, gated, denied, failure, degraded, mobile, keyboard y reduced-motion quedan cubiertos.
- [ ] GVC premium desktop/390px pasa con `scrollWidth === clientWidth`.
- [ ] `UI ready` sigue `no` hasta implementation mapping, GVC plan, decision log y review completos.
- [ ] `pnpm ui:wireframe-check --task TASK-1572` y `pnpm ui:flow-check --task TASK-1572` pasan.

## Verification

- `pnpm task:lint --task TASK-1572`
- `pnpm ui:wireframe-check --task TASK-1572`
- `pnpm ui:flow-check --task TASK-1572`
- `pnpm ui:readiness-check --task TASK-1572`
- GVC premium desktop + 390px, keyboard y reduced motion.
- `pnpm qa:gates --changed` y `pnpm docs:closure-check` al cierre.

## Closing Protocol

- [ ] `Lifecycle` queda sincronizado con la carpeta y el estado real.
- [ ] Wireframe, flow, motion, GVC scenario y scorecard quedan actualizados.
- [ ] `docs/tasks/README.md` y `TASK_ID_REGISTRY.md` permanecen sincronizados.
- [ ] `Handoff.md` y changelog se actualizan si cambia comportamiento o rollout.
- [ ] Se ejecutan `pnpm task:lint --task TASK-1572`, gates UI y QA proporcionales.

<!-- ZONE 4 — VERIFICATION & CLOSING -->
