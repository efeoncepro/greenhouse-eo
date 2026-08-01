# TASK-1618 — Integración Grok Imagine Video en la flota y Producer de Globe

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `interaction`
- UI ready: `no`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-028`
- Status real: `Diseño documental; Fal activo, Globe no integrado`
- Domain: `platform|producer|video`
- Blocked by: `TASK-1553`, `TASK-1573`, `TASK-1578`, `TASK-1535`, `TASK-1614`; coordinar `TASK-1616`
- Branch: `task/TASK-1618-globe-grok-imagine-video-fleet`

## Summary

Integrar Grok Imagine Video mediante las rutas Fal de texto, imagen, referencias, edición y extensión. Reutilizar las capacidades base del Producer y extender audio nativo, diálogo/lip-sync, edición/continuación, resolución y la política de cargos por contenido rechazado.

## Goal

- Registrar rutas separadas para `text-to-video`, `image-to-video`, `reference-to-video`, `edit-video` y `extend-video`.
- Modelar 1–10 segundos, 480/720 y audio solo con evidencia de output.
- Hacer visible el costo/riesgo al estimate sin exponer el precio vendor ni permitir reintentos ciegos.

## Architecture Alignment

- `docs/architecture/creative-studio/EFEONCE_GLOBE_FAL_CHALLENGER_MODELS_PRODUCER_INTEGRATION_PROPOSAL_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ROUTE_BASED_MODEL_RESOLUTION_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_AI_CREATIVE_DATA_GOVERNANCE_DECISION_V1.md`
- `docs/tasks/to-do/TASK-1573-globe-video-edit-capability-and-governed-continuation.md`
- `docs/tasks/in-progress/TASK-1579-globe-credit-rating-settlement-fallback-policy.md`

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: adapter Fal, contracts/domain y Producer en `efeonce-globe`
- Future candidate home: `remain-shared` dentro de Globe
- Boundary: video routes, edit/extend command, audio/reference constraints, fleet readers
- Server/browser split: provider policy, upload, signed URLs y billing server-side
- Build impact: `none` por diseño; verificar al ejecutar
- Extraction blocker: provider policy, rights y spend fence

## Backend/Data Contract

- Revalidar autenticadamente los cinco schemas y pricing; registrar que Fal puede cobrar solicitudes rechazadas por violación de contenido. El precio efectivo debe resolver la discrepancia entre pricing API y página comercial por resolución/input.
- `text-to-video`: prompt hasta 4.096 caracteres, 1–15 segundos, 480/720 y siete ratios; `image-to-video`: una imagen, mismos límites y MP4 con audio embebido.
- `reference-to-video`: 1–7 imágenes, citación estable `@ImageN`, 1–10 segundos y default 480p; extender el manifest tipado, no enviar URLs al cliente.
- `edit-video` consume `video-edit` de `TASK-1573` y **no** `video-extend`: es edición reference-based de `video_url`, con preflight de máximo 854×480 y truncamiento de entrada a 8 segundos.
- `extend-video` consume `video-extend`, recibe `video_url` H.264/H.265/AV1 de 2–15 segundos y produce `source + extension`; debe persistir duración final y parent lineage.
- Extender `audioMode` solo si el MP4 real contiene pista; distinguir audio nativo, diálogo, SFX, ambiente y lip-sync sin modelarlo como `audio-generate`.
- Validar duración, resolución, ratio, cantidad de referencias, codec, MIME, governance, rights y settlement antes de execute.
- Tests de rechazo sin segundo cobro, idempotencia, recuperación de extensión y no exposición de mensajes upstream.

## UI/UX Contract

Crear wireframe/flow al tomar la task. El Composer debe distinguir generar, editar y extender; mostrar rango temporal, referencia, audio, resolución y duración permitidos; advertir que un request rechazado puede consumir créditos según terms; conservar recovery y playback sin URLs Fal.

## Hybrid Execution Justification

- Why not split: edit/extend y sus estados deben llegar al Producer con el mismo contrato y spend fence.
- Primary execution profile: `backend-data`.
- Contract boundary: commands/readers server-side; UI sin decisiones de proveedor.
- Risk controls: warning curado, estimate fail-closed, canary por modalidad y rollback por ruta.

## Scope

### Slice 0 — Live contract

- Consultar Model Search, OpenAPI y Pricing API; resolver aliases y versión exacta.
- Proponer ADR si audio/lip-sync requiere ampliar contrato.

### Slice 1 — Routes y lifecycle

- Añadir rutas, payload/result schemas, rate, rights, readiness, binding y reconciliación edit/extend.

### Slice 2 — Producer y promotion

- Extender controles data-driven y estados de continuación.
- Ejecutar evaluación durable, canary real, settlement, retrieval, playback y fleet readback.

## Out of Scope

- Prometer lip-sync o audio universal; crear capability xAI; reintentar automáticamente una violación.

## Acceptance Criteria

- [ ] Cinco modalidades tienen identidad y evidencia independiente.
- [ ] `edit-video` y `extend-video` usan capabilities y payloads distintos; no se confunde `video_url` con `image_url`.
- [ ] Edit/extend preservan lineage, calculan duración final y no ejecutan doblemente tras timeout.
- [ ] Producer expresa límites reales y el warning de billing con copy curado.
- [ ] Audio declarado coincide con bytes reales y governance.
- [ ] No hay fallback silencioso ni URLs Fal en el cliente.
- [ ] `v1.5/image-to-video` queda como ruta independiente y `gated` hasta contar con evaluación/pricing; no se asume que cubre las otras cuatro modalidades.

## Rollout Plan & Risk Matrix

`gated` → schema/rate/rights → evaluación → binding → canary → `available`; rollback por ruta. Riesgos: cobro en rechazo, policy drift, audio/lip-sync no determinista y continuación no idempotente. Mitigación: términos versionados, fail-closed, receipts durables y canary por modalidad.
