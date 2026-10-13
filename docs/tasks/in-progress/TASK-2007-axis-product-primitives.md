# TASK-2007 — Primitivas de producto AXIS y consumo verificable

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-2007-axis-product-primitives.md`
- Flow: `docs/ui/flows/TASK-2007-axis-product-primitives-flow.md`
- Motion: `none`
- Backend impact: `none`
- Epic: `none`
- Status real: `Code complete local y aprobación visual integral 2026-10-05; publicación, AT manual y adopción pendientes`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `AXIS main y Greenhouse develop existentes; sin worktrees`

## Summary

Completar mejoras de auditoría AXIS: consumo verificable, selección enriquecida/remota, feedback/superficies y composiciones operativas. El operador autorizó avanzar con todos el 2026-10-05; aprobó la entrega final de producto, agendador
y Growth CTA y pidió documentación/skills y push. Publicación y adopción siguen separadas.

## Why This Task Exists

Primitives 0.5.0 y tokens 0.5.1 están publicados independientemente. Faltan continuidad de selección y recuperaciones compartidas; las muestras del Lab no prueban exports disponibles.

## Goal

- Extender primitivas actuales sin sustituir productos ni dependencias Vuexy.
- Ofrecer composiciones reales accesibles y documentación de consumo honesta.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md`.
- AXIS `docs/architecture/FORM_PRIMITIVES_DECISION_V1.md` y `AGENT_CAPABILITIES_DECISION_V1.md`, extendidos por decisión de esta iteración.
- Contracts serializables; React sólo en subpath; tokens como valores. Growth conserva targeting, telemetría y servidor.

## Normative Docs

- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`.
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`.

## Dependencies & Impact

### Depends on

AXIS packages/primitives Forms existente. TASK-1589 conserva credencial de distribución; TASK-1591 conserva piloto; no se duplican.

### Blocks / Impacts

Futuras adopciones; no modifica consumidores en esta iteración.

### Files owned

AXIS primitives/forms, nuevos módulos product, contracts/forms, registry/capabilities, Lab demostraciones/pruebas/docs. Greenhouse sólo esta task, wireframe/flow e índices/handoff. Preservar WIP AI Visibility Report y tokens de Claude.

## Current Repo State

### Already exists

Select progresivo, Combobox, campos formateados, tokens 0.5.1 y catálogo de países.

### Gap

Media/grupos, recuperación remota y composiciones no empaquetadas. Evitar nuevos efectos, DataGrid, rich editor y drag-and-drop universal.

## Modular Placement Contract

- Topology impact: `ui-package`
- Current home: `../axis-design-system/packages/primitives`
- Future candidate home: `ui-package`
- Boundary: UI portable; consumidor conecta red y negocio.
- Server/browser split: root sin React/DOM; React explícito con effects para DOM.
- Build impact: exports aditivos; primitives añade dependencia workspace de axis-graphic-line para answerHtml.
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

UI rigor: `ui-platform`. Operador elige, filtra, corrige y continúa sin perder borrador ni selección.

### Surface & system decision

Lab público, Nav placement: `none`; extender Forms y reusar botones/chips. Copy local de demostración, mensajes de primitive suministrados por consumidor. Access impact: `none`. Densidad Forms; popup top-layer existente. No nueva Composition Shell.

### State inventory

Default/loading/empty/error/degraded/disabled/mobile/long content/RTL/reduced motion. Permission denied: consumidor deshabilita acciones, sin autoridad propia.

### Interaction contract

Teclado APG, selección independiente del foco, Escape restaura, reset cancelable, red propiedad del consumidor. Feedback no roba foco. Sin telemetría de negocio.

### Motion & microinteractions

Forms/product conservan transiciones existentes. Scheduler añade transición scoped por mes/paso y
fallback, selección y celebración única desde confirmed; reduced motion conserva estado estático.
Growth CTA reusa motion de AXIS para entrada/acción y expansión dialog/inline. Interrupción, foco y
retención de borrador se verifican en los dossiers del repo AXIS. No animar el documento host.

### Implementation mapping

Ver wireframe: contracts/forms → primitives Select/Combobox/product → Lab y registry. No reader/command de negocio ni nueva API.

### GVC scenario plan

AXIS product-primitives.spec.ts + suites Forms. Quality profile: `premium`, desktop1440/mobile390/320, foco/teclado/FormData/error/scroll-width; dossier AXIS docs/quality/product-primitives.md.

### Design decision log

Extensión compatible del modelo de opciones; fallback textual; composición sobre primitivas. Fecha/archivo nativos por caso de uso de filtros y selección local. Sin migración de Growth.

### Visual verification

Capturas locales y revisión con evidencia en dossier; AT físico y Linux baseline se mantienen separados y pendientes si no probados.

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

### Slice 1 — Consumo y selección

Disponibilidad por export, compatibilidad; media/grupos y búsqueda remota con error/retry/clear, valor retenido explícitamente.

### Slice 2 — Feedback y superficies

Feedback de comando, disclosure, dialog y complementary con semánticas separadas; composición CTA.

### Slice 3 — Composiciones operativas

MultiSelect, tabs y colección con filtros/paginación; date/range y archivo nativos; ejemplos con exports reales.

### Extensión autorizada — Scheduler y Growth CTA en AXIS

Scheduler DOM nativo con calendario/disponibilidad, datos y confirmación; consumidor gobierna booking.
Growth CTA portable para embedded/inline_banner/slide_in, default/minimal/spotlight y cinco acciones;
agenda dialog/inline con estado conservado. Recetas de banner editorial compacto y de marca aprobadas.
Anillo sólo en eyebrow, esfera al final del titular; énfasis exacto opt-in Bricolage 400/700 sin cambiar copy.
Sticky banner, popup modal y floating button permanecen pendientes; no se afirma implementación total del engine.


## Out of Scope

Publicar, deployar, migrar consumidores, autoridad/telemetría Growth, DataGrid/editor/drag universal, certificar AT sin prueba.

## Detailed Spec

Contrato versionado en AXIS `docs/architecture/PRODUCT_PRIMITIVES_DECISION_V1.md`; guía y dossier en el mismo repo dueño.
Extensión: `SCHEDULER_COMPOSITION_DECISION_V1.md` y `GROWTH_CTA_COMPOSITION_DECISION_V1.md`,
con dossiers `docs/quality/scheduler.md` y `docs/quality/growth-cta.md`.

## Rollout Plan & Risk Matrix

Riesgo UI compartida: alto; mitigación por cambios aditivos, pruebas de regresión y sin activar consumidores. Rollback: no adoptar exports nuevos.

Validación local → revisión → release explícito → instalación/adopción por consumidor. Sin cambios de runtime en esta task.

### Out-of-band coordination required

N/A para implementación local. Publicación requiere carril de release separado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Catálogo distingue workspace, registro y exports nuevos no publicados.
- [x] Select/Combobox soportan media/grupos, fallback y recuperación remota.
- [x] Feedback, disclosure y composiciones operativas usan exports portables.
- [x] MultiSelect/tabs/fecha/rango/archivo conservan accesibilidad y semántica nativa.
- [x] Tests/build/typecheck/design/agent checks y revisión visual local documentados: dossier AXIS; 28/28 nuevos, 36 unit, 191 contracts, 14 registry y 4 agent; build/typecheck/design PASS. Global tokens falla por WIP ajeno; run browser amplio 194/196 + rerun focal 4/4.
- [x] Scheduler y Growth CTA construidos en packages y Lab, con las dos recetas de banner y agenda dialog/inline; aprobación visual explícita del operador 2026-10-05 («Aprobado todo»).
- [x] Growth CTA final verificado: 40/40 journeys y 4/4 recorridos afectados tras ajuste final; build/typecheck, 198 contracts y design/agent PASS, evidencia en dossier AXIS. No se presenta el fallo global ajeno de tokens como pase.
- [x] Estado de publicación, AT manual y adopción explícito sin falsos cierres: nuevas exports unreleased, sin pins ni rollout.
- [ ] Publicación e instalación privada del set nuevo: pendiente de release independiente.
- [ ] Adopción y smoke en renderer Growth y hosts: pendiente, WordPress/Think sin cambios.
- [ ] AT manual y touch físico: pendientes; automatización no los certifica.

## Verification

AXIS pnpm build, typecheck, test, design:check, agent:check; suites e2e de Forms, producto y Growth CTA. Greenhouse task:lint y qa:gates focales.

## Closing Protocol

- [x] Lifecycle y carpeta reflejan estado real: in-progress por cierre operativo y AT pendientes.
- [x] Índice, Handoff y changelog sincronizados el 2026-10-05.
- [x] Evidencia local y pendientes registrados en dossier y copia local con hashes.

## Evidence

AXIS `docs/quality/product-primitives.md` registra comandos, capturas, riesgo y límites. La suite global conserva el fallo de hash del WIP AI Visibility Report ajeno. Nuevas exports marcadas unreleased; sin cambio de versiones ni pins consumidores.

## Follow-ups

Publicación e instalación privada del set compatible, luego adapter y pruebas de Growth/hosts;
AT manual y touch físico según disponibilidad. Autorización de push recibida; SHA/CI se registran
tras el readback real, sin anticiparlos.



### Corte de commit/push autorizado — 2026-10-05

- Fuente aprobada AXIS: `447ea0c` (Growth CTA, producto/Forms, docs y suites CI).
- Validación amplia producto/Forms: 200 PASS; 4 fallos del harness no-JavaScript por puerto fijo
  corregidos con baseURL, 4/4 PASS. Build/typecheck/design/agent y unidades primitives/registry PASS.
- Documentación y skills Claude/Codex sincronizados; aprobación visual recibida.
- Push autorizado por operador. Readback remoto/CI se informa al cierre; no certifica publicación
  de packages ni adopción en sitio público/Think. WIP AI Visibility Report/tokens preservado.
