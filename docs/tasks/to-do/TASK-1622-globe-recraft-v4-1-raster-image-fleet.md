# TASK-1622 — Extensión Recraft v4.1 Raster en Globe

## Status

- Lifecycle: `to-do`
- Priority: `P1`
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
- Status real: `Diseño documental; Recraft vector ya promovido, raster no integrado`
- Domain: `platform|producer|image|content`
- Blocked by: `TASK-1553`, `TASK-1578`, `TASK-1535`
- Branch: `task/TASK-1622-globe-recraft-v4-1-raster-image-fleet`

## Summary

Extender la integración Recraft v4.1 que ya existe para vectorización hacia generación raster, incluyendo la variante Pro cuando el schema y rate lo justifiquen. Reutilizar el adapter, governance y Producer; mantener vector y raster como rutas y outputs distintos.

## Architecture Alignment

- `docs/architecture/creative-studio/EFEONCE_GLOBE_IMAGE_FLEET_EXPANSION_PROPOSAL_V1.md`
- `docs/operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md`
- `docs/tasks/complete/TASK-1488-globe-fal-model-expansion-seedream5-topaz-3d.md`
- `docs/tasks/in-progress/TASK-1553-globe-extensible-multi-model-provider-catalog.md`

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: Fal adapter, catalog, governed driver y Producer de `efeonce-globe`
- Future candidate home: `remain-shared` dentro de Globe
- Boundary: Recraft raster routes y su output raster; vector permanece en `image-vectorize`
- Server/browser split: provider identity, URLs y ingest server-side
- Build impact: `none` por diseño; verificar al ejecutar
- Extraction blocker: provider/security boundary

## Backend/Data Contract

- Revalidar `fal-ai/recraft/v4.1/text-to-image`, `.../pro/text-to-image` y utility antes de elegir rutas.
- Reutilizar `image-generate`, result `images[]`, Fal queue, upload/retrieval, rights y hash.
- Añadir MIME/formatos raster reales (WebP/JPEG/PNG), tamaños, rates por resolución y endpoint allowlist.
- No mezclar raster con SVG ni reutilizar la excepción MIME de Recraft vector para imágenes raster.
- Mantener route IDs, bindings, rights, evaluación, canary y promoción separados de `ref/still/vector-v1`.

## UI/UX Contract

Crear wireframe/flow al tomar la task. El selector debe mostrar Recraft Raster como modelo distinto de Recraft Vector; el Producer reutiliza controles de imagen y preview/compare sin crear una nueva modalidad.

## Hybrid Execution Justification

- Why not split: raster y vector comparten provider seam, pero requieren outputs y governance distintos.
- Primary execution profile: `backend-data`.
- Contract boundary: ruta raster y reader/commands; UI sin slug.
- Risk controls: MIME fail-closed, rate por formato/resolución y rollback solo de raster.

## Scope

### Slice 0 — Endpoint/rate selection

- Confirmar rutas, output, límites, pricing y terms live.
- Definir benchmark de brand/editorial y comparación raster-vector.

### Slice 1 — Raster routes

- Añadir catalog, adapter, result driver, rates, rights, bindings, readiness y canary.

### Slice 2 — Producer rollout

- Extender selector/preview data-driven, verificar retrieval/compare/descarga y promover por ruta.

## Out of Scope

- Cambiar la ruta vectorial existente, crear capability `recraft`, convertir SVG a raster como workaround o crear editor nuevo.

## Acceptance Criteria

- [ ] Existe al menos una ruta raster promovible y separada de vector.
- [ ] Raster no hereda la excepción MIME de SVG.
- [ ] Recraft Raster aparece mediante fleet reader sin lógica especial en el consumer.
- [ ] Output, rights, rate, evaluación, canary, retrieval y rollback quedan evidenciados.

## Rollout Plan & Risk Matrix

`gated` → endpoint/rate → rights/evaluación → binding → canary → `available`; rollback independiente de vector. Riesgos: MIME incorrecto, Pro/standard mezclados y confusión raster/SVG. Mitigación: schemas y drivers separados.
