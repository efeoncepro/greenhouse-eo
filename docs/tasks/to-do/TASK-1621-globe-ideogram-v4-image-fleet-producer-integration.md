# TASK-1621 — Integración Ideogram v4 Generate/Edit en Globe

## Status

- Lifecycle: `to-do`
- Priority: `P1`
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
- Domain: `platform|producer|image|content`
- Blocked by: `TASK-1553`, `TASK-1578`, `TASK-1535`; coordinar `TASK-1620`
- Branch: `Greenhouse develop; Globe main; sin worktrees`

## Summary

Agregar Ideogram v4 como rutas de generación y edición de imagen para posters, logos, titulares y piezas editoriales donde el renderizado de texto es una ventaja diferenciadora. Reutilizar `image-generate`, `image-edit`, Fal adapter y Producer; extender controls específicos sin hardcodear Ideogram.

## Architecture Alignment

- `docs/architecture/creative-studio/EFEONCE_GLOBE_IMAGE_FLEET_EXPANSION_PROPOSAL_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ROUTE_BASED_MODEL_RESOLUTION_DECISION_V1.md`
- `docs/operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md`
- `docs/tasks/in-progress/TASK-1553-globe-extensible-multi-model-provider-catalog.md`

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: catálogo/domain, Fal runner y Producer de `efeonce-globe`
- Future candidate home: `remain-shared` dentro de Globe
- Boundary: image routes, prompt expansion, image-to-image controls, output governance
- Server/browser split: Fal credentials, input resolution y output ingest server-side
- Build impact: `none` por diseño; verificar al ejecutar
- Extraction blocker: provider/security boundary

## Backend/Data Contract

- Revalidar `ideogram/v4`, `ideogram/v4/image-to-image` y variantes activas con OpenAPI/pricing.
- Reutilizar `image-generate`/`image-edit` y result `images[]`; registrar output MIME real.
- Extender `image_size` preset/custom, `expansion_model`, `rendering_speed` y `strength` de image-to-image solo si el schema live los confirma.
- Modelar typography/poster como guidance y evaluación, no como garantía automática.
- Cada ruta necesita rate, rights, readiness, binding, evaluación, canary, retrieval y rollback propios.

## UI/UX Contract

Crear wireframe/flow al tomar la task. Reutilizar Image Producer y mostrar solo controles soportados: tamaño, expansión, velocidad, strength, references y compare. Validar teclado, 390 px, reduced motion y overflow.

## Hybrid Execution Justification

- Why not split: generate/edit y sus controles comparten catálogo, estimate y lineage.
- Primary execution profile: `backend-data`.
- Contract boundary: commands/readers gobernados; UI data-driven.
- Risk controls: no control especulativo, routes gated y canary por modalidad.

## Scope

### Slice 0 — Contrato live

- Fijar endpoints, schemas, límites, output y pricing autenticados.
- Definir criterios de evaluación para texto legible, logos, posters y fidelidad de edición.

### Slice 1 — Fleet integration

- Añadir routes, payload/result schemas, rates, rights, bindings, readiness y evaluación.

### Slice 2 — Producer and rollout

- Extender controls, ejecutar canary real, verificar output/retrieval/compare y promover por ruta.

## Out of Scope

- Crear capability `typography`, reemplazar Recraft vector o prometer texto perfecto sin evaluación.

## Acceptance Criteria

- [ ] Generate y image-to-image tienen route IDs e identidades independientes.
- [ ] El Producer reutiliza image capabilities y no contiene lógica específica de Ideogram.
- [ ] Typography/poster tiene evaluación objetiva y evidencia real.
- [ ] Output MIME/hash, rights, rate, retrieval, canary y rollback quedan verificados.

## Rollout Plan & Risk Matrix

`gated` → schema/rate/rights → evaluación → binding → canary → `available`; rollback por route ID. Riesgos: texto ilegible, schema drift y controles de edición inconsistentes. Mitigación: benchmark tipográfico, OpenAPI live y fail-closed.
