# Design Handoff Control Plane

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.1
> **Creado:** 2026-06-20 por Codex
> **Modulo:** UI Platform / Design System / Full API Parity
> **Rutas:** `/design-system/handoff`, `/api/design-system/handoff/**`
> **Arquitectura relacionada:** `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`, `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`, `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
> **Manual:** `docs/manual-de-uso/plataforma/operar-ui-platform-design-system.md`

## Para que sirve

Design Handoff Control Plane gobierna el paso de nodos Figma de producto a implementacion DEV sin contaminar el master AXIS ni depender de convenciones fuera del portal.

El cockpit `/design-system/handoff` es solo un consumer visual. La capacidad real vive en commands/readers server-side bajo `src/lib/design-system/handoff/**` y APIs `/api/design-system/handoff/**`.

## Flujo funcional

1. Un admin aprueba un `file_key` de producto en el allowlist.
2. Diseno pega una URL de seleccion Figma en `Nuevo nodo`.
3. `POST /api/design-system/handoff` valida URL, bloquea AXIS, valida allowlist y crea el handoff.
4. En el mismo comando, Greenhouse consulta Figma server-side y persiste el primer `design_handoff_node_snapshot`.
5. DEV opera owners, planning, links, evidencia y lifecycle desde el cockpit o desde APIs equivalentes.
6. Si el nodo cambia, el command `verify-node` re-verifica y agrega un snapshot nuevo.
7. Antes de cerrar, DEV registra la decision **Primitive governance**: `route_only`, `reuse_primitive`, `extend_primitive`, `new_primitive`, `variant_kind` o `research_required`.
8. El cierre `implemented` exige ruta runtime, evidencia gobernada (`gvc_capture`, `runtime_route` o excepcion manual auditada) y una decision Primitive governance resuelta.

## Snapshot inicial Figma

La capacidad clave es que **crear un handoff tambien verifica el nodo por primera vez**.

Contrato:

- `create` requiere capability `design_system.handoff.create`.
- `create` extrae `fileKey` y `nodeId` con `parseFigmaUrl`.
- `create` rechaza el archivo AXIS y cualquier archivo no allowlisted.
- `create` llama `getFigmaNodeRender` server-side; el token Figma nunca llega al cliente.
- `create` persiste `greenhouse_core.design_handoff_node_snapshots` con metadata `{source:'figma_render', trigger:'create'}`.
- Si Figma no responde o falta render, el snapshot queda `unavailable`; el handoff nace con evidencia honesta de drift, no con silencio.
- El boton `Verificar nodo Figma` usa capability `design_system.handoff.verify` y agrega snapshots posteriores para drift, renombres o eliminaciones.

## Capacidades

| Capability | Uso funcional |
|---|---|
| `design_system.handoff.read` | Leer ledger, allowlist y entradas enriquecidas |
| `design_system.handoff.create` | Registrar handoff + snapshot Figma inicial |
| `design_system.handoff.transition` | Cambiar lifecycle basico |
| `design_system.handoff.allowlist.manage` | Aprobar/deprecar archivos Figma producto |
| `design_system.handoff.owner.assign` | Asignar owner diseno/dev |
| `design_system.handoff.planning.update` | Actualizar prioridad, target surface, fecha y bloqueo |
| `design_system.handoff.link` | Vincular TASK, PR, commit, deploy, ruta o comentario Figma |
| `design_system.handoff.evidence.attach` | Adjuntar GVC, ruta runtime, review o excepcion |
| `design_system.handoff.verify` | Re-verificar nodo Figma existente |
| `design_system.handoff.drift.read` | Leer signals de drift/orphans/missing evidence |
| `design_system.handoff.primitive_decision.manage` | Registrar o actualizar la decision Primitive governance de una entry |

## APIs internas

| Endpoint | Uso |
|---|---|
| `GET /api/design-system/handoff` | Lista entradas y allowlist |
| `POST /api/design-system/handoff` | Crea handoff + snapshot inicial |
| `GET /api/design-system/handoff/preview` | Preview transitorio de nodo allowlisted |
| `POST /api/design-system/handoff/allowlist` | Upsert allowlist |
| `POST /api/design-system/handoff/allowlist/[fileKey]/deprecate` | Depreca archivo |
| `PATCH /api/design-system/handoff/[entryId]/owners` | Actualiza owners |
| `PATCH /api/design-system/handoff/[entryId]/planning` | Actualiza planning |
| `POST /api/design-system/handoff/[entryId]/links` | Vincula work item/ref |
| `POST /api/design-system/handoff/[entryId]/evidence` | Adjunta evidencia |
| `POST /api/design-system/handoff/[entryId]/verify-node` | Re-verifica nodo |
| `PATCH /api/design-system/handoff/[entryId]/primitive-decision` | Actualiza estrategia primitive/lab/runtime/GVC |
| `PATCH /api/design-system/handoff/[entryId]/transition` | Transiciona lifecycle |
| `GET /api/design-system/handoff/drift` | Lee signals operativos |

## Primitive governance

TASK-1180 conecta el handoff con el Design System: cada entry puede declarar su estrategia de implementacion y sus anclas a primitive, Lab, runtime y GVC.

Estrategias:

- `route_only`: pantalla o composicion puntual. Requiere rationale.
- `reuse_primitive`: usa una primitive existente. Requiere `primitive_key`.
- `extend_primitive`: expande una primitive existente. Requiere `primitive_key` y Lab antes de cerrar.
- `new_primitive`: nace una primitive nueva. Requiere Lab, docs y GVC antes de cerrar.
- `variant_kind`: mapea una variant/kind semantica. Requiere `primitive_key`, `variant` y `kind`.
- `research_required`: decision abierta con owner y fecha; no puede cerrar como `implemented`.

El reader enriquece cada entry con `primitiveGovernance.decisionStatus` y warnings typed como `primitive_decision_missing`, `primitive_key_missing`, `lab_route_missing`, `runtime_route_missing`, `gvc_evidence_missing`, `route_only_reuse_suspect` y `research_overdue`. La UI solo muestra esos resultados y llama el command; no calcula el contrato por su cuenta.

## Estados y evidencia

Lifecycle V2:

`proposed -> in_implementation -> in_review -> implemented -> archived`

Reglas:

- `archived` es terminal.
- `implemented` requiere `implemented_surface_key` con forma de ruta interna.
- `implemented` requiere evidencia `gvc_capture` o `runtime_route`, salvo `manual_exception` auditada.
- `implemented` requiere decision Primitive governance resuelta; `research_required` y decision vacia bloquean cierre.
- `extend_primitive` y `new_primitive` requieren Lab antes de cierre; `new_primitive` tambien requiere docs y GVC.
- Node health se lee desde el snapshot mas reciente.
- Snapshots no reemplazan evidencia runtime; solo prueban que el nodo Figma de origen sigue resoluble.

## Operacion y riesgos

- Sin `file_key` aprobado, el sistema queda fail-closed.
- AXIS es solo para primitives/tokens; producto usa allowlist separado.
- El render Figma es enriquecimiento gobernado, no source of truth de implementacion.
- Primitive governance no reemplaza el registry de primitives; es el gate que decide como una intencion Figma debe aterrizar en ese registry o reutilizarlo.
- Si Figma esta caido, crear handoff puede dejar snapshot `unavailable`; eso es drift observable.
- El smoke end-to-end productivo requiere un archivo Figma real aprobado y accesible por `greenhouse-figma-api-token`.

## Reliability

Signals activos del control plane:

- `design_system.handoff.missing_evidence`
- `design_system.handoff.node_drift`
- `design_system.handoff.orphan_surfaces`
- `design_system.handoff.primitive_decision_missing`
- `design_system.handoff.primitive_lab_missing`
- `design_system.handoff.runtime_without_gvc`
- `design_system.handoff.route_only_reuse_suspect`

## Evidencia vigente

- GVC cockpit desktop/mobile: `.captures/2026-06-20T02-00-35_design-system-handoff-cockpit`.
- Test focal: `pnpm exec vitest run src/lib/design-system/handoff/state-machine.test.ts src/lib/design-system/handoff/store.test.ts src/lib/reliability/queries/design-handoff-control-plane-signals.test.ts`.
- Type/lint focal: `pnpm exec tsc --noEmit --pretty false` y ESLint focal del módulo handoff.
