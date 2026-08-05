# TASK-1623 — Integración Qwen Image 2/Pro en Globe

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio-Alto`
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
- Domain: `platform|producer|image`
- Blocked by: `TASK-1553`, `TASK-1578`, `TASK-1535`; benchmarkear junto a `TASK-1620` y `TASK-1621`
- Branch: `Greenhouse develop; Globe main; sin worktrees`

## Summary

Incorporar Qwen Image 2 Standard/Pro y sus rutas de edición como challenger de calidad/precio, reutilizando image generation/edit y el tray de referencias. La task debe permitir cancelar la promoción si no supera a la flota existente en calidad, coste o tipografía.

## Architecture Alignment

- `docs/architecture/creative-studio/EFEONCE_GLOBE_IMAGE_FLEET_EXPANSION_PROPOSAL_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ROUTE_BASED_MODEL_RESOLUTION_DECISION_V1.md`
- `docs/tasks/in-progress/TASK-1553-globe-extensible-multi-model-provider-catalog.md`
- `docs/tasks/to-do/TASK-1578-globe-model-onboarding-credit-rate-promotion.md`

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: Fal adapter, contracts/domain y Producer de `efeonce-globe`
- Future candidate home: `remain-shared` dentro de Globe
- Boundary: Qwen routes, image/edit inputs, result and benchmark evidence
- Server/browser split: provider secrets, input materialization y output ingest server-side
- Build impact: `none` por diseño; verificar al ejecutar
- Extraction blocker: provider/security boundary

## Backend/Data Contract

- Revalidar `fal-ai/qwen-image-2/text-to-image`, `.../pro/text-to-image`, `.../edit` y Pro edit.
- Reutilizar `image-generate`/`image-edit`, `images[]`, queue/status/result, references, lineage y retrieval.
- Extender `negative_prompt`, seed, `num_images` 1–4, `output_format` PNG/JPEG/WebP, image size y límites de referencias según OpenAPI.
- Separar Standard/Pro en route ID, rate, binding, evaluación y canary; no compartir evidence.
- Publicar rate efectivo solo después de resolver el precio por cuenta/endpoint; los valores publicados son snapshots.

## UI/UX Contract

Crear wireframe/flow al tomar la task. Reutilizar Image Producer; controles de seed, negative prompt, outputs múltiples y formato deben aparecer solo donde la ruta los declare. Compare debe conservar cada output y su lineage.

## Hybrid Execution Justification

- Why not split: generate/edit, múltiples outputs y referencias deben compartir estimate y lineage.
- Primary execution profile: `backend-data`.
- Contract boundary: catalog/readers/commands; UI sin conocimiento del proveedor.
- Risk controls: challenger gate, cancelación antes de promoción y rate/version por ruta.

## Scope

### Slice 0 — Benchmark y contrato

- Confirmar endpoints, schemas, pricing y terms live.
- Definir benchmark de tipografía, composición, edición, coste y latencia frente a rutas existentes.

### Slice 1 — Fleet integration

- Añadir routes, payload/result schemas, rates, rights, evaluación, bindings y readiness.

### Slice 2 — Producer and decision

- Extender controls y ejecutar canaries; promover solo si el benchmark supera el umbral acordado.

## Out of Scope

- Promover automáticamente por disponibilidad Fal, crear capability `qwen`, alterar el default Seedream o conservar outputs no retenidos.

## Acceptance Criteria

- [ ] Standard/Pro y generate/edit tienen rutas independientes.
- [ ] `num_images`, references, seed, negative prompt y formatos pasan validación antes del gasto.
- [ ] Existe benchmark reproducible contra la flota actual y decisión explícita de promoción/no promoción.
- [ ] Producer no contiene lógica específica de Qwen y los outputs mantienen lineage/retrieval.

## Rollout Plan & Risk Matrix

`gated` → benchmark/schema → rate/rights → evaluación → binding → canary → decisión de promoción. Riesgos: duplicación, coste real distinto y outputs múltiples mal retenidos. Mitigación: challenger gate, rate versionado y test por output.
