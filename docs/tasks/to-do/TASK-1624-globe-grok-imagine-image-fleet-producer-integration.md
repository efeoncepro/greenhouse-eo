# TASK-1624 — Integración Grok Imagine Image en Globe

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
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
- Domain: `platform|producer|image|rights`
- Blocked by: `TASK-1553`, `TASK-1578`, `TASK-1535`; coordinar `TASK-1618`
- Branch: `Greenhouse develop; Globe main; sin worktrees`

## Summary

Agregar Grok Imagine Image como rutas `text-to-image` y `image-to-image`, aprovechando la familia Grok ya investigada para video. Reutilizar image capabilities y referencias, pero incorporar un safety/rights gate porque Fal informa que las solicitudes bloqueadas por términos de xAI pueden continuar cobrando.

## Architecture Alignment

- `docs/architecture/creative-studio/EFEONCE_GLOBE_IMAGE_FLEET_EXPANSION_PROPOSAL_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ROUTE_BASED_MODEL_RESOLUTION_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_AI_CREATIVE_DATA_GOVERNANCE_DECISION_V1.md`
- `docs/tasks/to-do/TASK-1618-globe-grok-imagine-video-fleet-producer-integration.md`
- `docs/tasks/in-progress/TASK-1553-globe-extensible-multi-model-provider-catalog.md`

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: Fal adapter, catalog, governed driver y Producer de `efeonce-globe`
- Future candidate home: `remain-shared` dentro de Globe
- Boundary: Grok image routes, image references, policy preflight y output governance
- Server/browser split: xAI/Fal identity, URL resolution, policy y ingest server-side
- Build impact: `none` por diseño; verificar al ejecutar
- Extraction blocker: provider policy y spend fence

## Backend/Data Contract

- Revalidar `xai/grok-imagine-image` y `xai/grok-imagine-image/edit` con OpenAPI/pricing.
- Generate: 1–4 imágenes, 1K/2K, ratios amplios y output `images[]` + revised prompt según schema.
- Edit: 1–3 `image_urls`, 1–4 outputs, 1K/2K y formatos JPEG/PNG/WebP según schema.
- Reutilizar `image-generate`/`image-edit`, private ingest, lineage, queue, result driver y retrieval.
- Extender `revised_prompt` como metadata gobernada y policy receipt; no exponer mensajes upstream.
- Ejecutar safety/rights preflight antes del spend fence, registrar policy aplicada y no prometer refund automático.

## UI/UX Contract

Crear wireframe/flow al tomar la task. Reutilizar Image Producer; mostrar resolución, ratios, cantidad de outputs y referencias permitidas. El warning de policy debe ser curado, accionable y visible antes de ejecutar.

## Hybrid Execution Justification

- Why not split: policy, estimate y controls de imagen deben formar una operación indivisible.
- Primary execution profile: `backend-data`.
- Contract boundary: policy/commands/readers server-side; UI no decide términos de xAI.
- Risk controls: fail-closed, warning previo, rate por resolución y route-level rollback.

## Scope

### Slice 0 — Policy y live contract

- Confirmar schemas, pricing, output, terms y límites.
- Definir benchmark de estética, edición y policy rejection handling.

### Slice 1 — Routes y governance

- Añadir generate/edit, payload/result schemas, rates, rights, policy receipt, bindings, readiness y evaluación.

### Slice 2 — Producer and promotion

- Extender controls, ejecutar canary, verificar output/lineage/retrieval y promover solo tras rights/safety review.

## Out of Scope

- Modelar Grok Image como audio/video, crear capability `grok`, ocultar cobros de policy o hacer retry automático de una violación.

## Acceptance Criteria

- [ ] Generate/edit tienen rutas, rates y evidencia independientes.
- [ ] Outputs múltiples, referencias, formatos y resolución se validan antes del gasto.
- [ ] Existe policy receipt y warning previo sin exponer errores upstream.
- [ ] Producer reutiliza image capabilities sin lógica específica de Grok.
- [ ] Promoción queda bloqueada si rights/safety o pricing efectivo no están resueltos.

## Rollout Plan & Risk Matrix

`gated` → policy/schema → rate/rights → evaluación → binding → canary → `available`; rollback por route ID. Riesgos: cobro por violación, policy drift y outputs múltiples. Mitigación: fail-closed, receipt durable y test de rechazo.
