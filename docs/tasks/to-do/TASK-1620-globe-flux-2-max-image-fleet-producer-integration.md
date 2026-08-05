# TASK-1620 — Integración FLUX.2 Max y Edit en la flota y Producer de Globe

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
- Status real: `Diseño documental; FLUX.2 activo en Fal, Globe no integrado`
- Domain: `platform|producer|image`
- Blocked by: `TASK-1553`, `TASK-1578`, `TASK-1535`; coordinar `TASK-1616` solo para referencias compartidas
- Branch: `Greenhouse develop; Globe main; sin worktrees`

## Summary

Integrar `fal-ai/flux-2-max` y `fal-ai/flux-2-max/edit` como rutas de imagen gobernadas. No requiere una capability nueva: reutiliza `image-generate` e `image-edit`, extendiendo referencias, controls de edición y schemas solo donde el OpenAPI live lo confirme. No registrar Flux 3 porque no existe endpoint exacto en el snapshot autenticado.

## Goal

- Registrar generate y edit con route IDs, bindings, rates, rights, evaluación y canary separados.
- Reutilizar el Producer de imagen, image references, lineage, preview/compare y retrieval.
- Extender controles multi-reference, máscara/región, typography o consistencia únicamente si son parte del schema validado.

## Architecture Alignment

- `docs/architecture/creative-studio/EFEONCE_GLOBE_FAL_CHALLENGER_MODELS_PRODUCER_INTEGRATION_PROPOSAL_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ROUTE_BASED_MODEL_RESOLUTION_DECISION_V1.md`
- `docs/operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md`
- `docs/tasks/in-progress/TASK-1553-globe-extensible-multi-model-provider-catalog.md`
- `docs/tasks/to-do/TASK-1578-globe-model-onboarding-credit-rate-promotion.md`

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: contracts/domain, Fal runner y Producer de `efeonce-globe`
- Future candidate home: `remain-shared` dentro de Globe
- Boundary: image catalog, edit inputs, Fal route bindings y governed output
- Server/browser split: uploads, signed URLs, provider identity y ingest server-side
- Build impact: `none` por diseño; verificar al ejecutar
- Extraction blocker: provider/security boundary

## Backend/Data Contract

- Revalidar OpenAPI y pricing de generate/edit antes de fijar campos, ratios, resolución y referencias. Snapshot observado: USD 0,07/MP; la página indica USD 0,07 por el primer MP y USD 0,03 por cada MP adicional, incluyendo inputs en Edit.
- Generate acepta `image_size` preset o custom, dimensiones múltiplos de 16, 256–2.560 px y área máxima 4.194.304 px; `output_format` es JPEG/PNG y la respuesta es un `images[]` de una imagen por ejecución aunque no exista `count`.
- Edit recibe `image_urls[]` y referencias citables como `@ImageN`; el schema no fija todavía el máximo de imágenes, por lo que Globe debe definir un límite gobernado antes de promocionar.
- Reutilizar `image-generate`/`image-edit`; cada endpoint conserva route ID e identidad exacta.
- Extender `image-edit` para references, seed, safety tolerance/checker y custom dimensions solo si el contrato actual no alcanza; no crear capability `flux-2` ni `flux-3`.
- No mapear FLUX.2 Max Edit a edición regional/inpaint: no declara máscara, regiones ni erase/fill; conservar esas rutas en FLUX Fill/Erase.
- Validar output image MIME, hashes, lineage, governance, rights, rate y retrieval.
- Tests de payload, result schema, host allowlist, idempotencia, timeout/reconcile y ausencia de slug en cliente.

## UI/UX Contract

Crear wireframe/flow al tomar la task. Reutilizar Image Producer y extender el editor para referencias, regiones o typography solo con schema confirmado; mantener compare, preview, keyboard, 390 px, reduced motion y no overflow.

## Hybrid Execution Justification

- Why not split: la ruta de edición y sus controls deben consumir el mismo catálogo y estimate que generate.
- Primary execution profile: `backend-data`.
- Contract boundary: commands/readers; UI sin conocimiento de Fal.
- Risk controls: no controls especulativos, route-level gating y rollback independiente.

## Scope

### Slice 0 — Live contract y naming

- Verificar ausencia de Flux 3 y revalidar FLUX.2 Max/Edit con OpenAPI/pricing.
- Definir route IDs, input modes, references y result schemas.

### Slice 1 — Fleet integration

- Añadir routing, catalog, rates, rights, readiness, binding, evaluation y canary.

### Slice 2 — Producer

- Extender image references/edit controls data-driven y verificar preview, compare, retrieval y settlement.

## Out of Scope

- Crear capability nueva por modelo, integrar Flux 3 inexistente, implementar máscaras/typography sin schema live o crear adapter paralelo.

## Acceptance Criteria

- [ ] Generate y edit están separados por route ID y evidencia.
- [ ] Producer reutiliza la capability image existente y solo muestra controls soportados.
- [ ] No existe referencia a `Flux 3` como modelo disponible.
- [ ] Estimate calcula megapíxeles de output y de inputs de Edit con rate versionado.
- [ ] Generate se trata inicialmente como una salida por ejecución y Edit tiene límite explícito de referencias antes del spend fence.
- [ ] La edición regional continúa usando Fill/Erase; FLUX.2 Edit se reserva para referencias + prompt.
- [ ] Output, hash, lineage, rights, rate, retrieval y rollback están verificados por ruta.
- [ ] No hay slugs, URLs Fal ni costos vendor en el payload cliente.

## Rollout Plan & Risk Matrix

`gated` → schema/rate/rights → evaluation → binding → canary → `available`; rollback por ruta. Riesgos: schema drift, controles de edición no soportados y naming Flux 3 incorrecto. Mitigación: OpenAPI autenticado y catálogo allowlisted.
