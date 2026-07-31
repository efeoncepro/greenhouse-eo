# TASK-1619 — Integración Wan 2.7 en la flota y Producer de Globe

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
- Domain: `platform|producer|video|image`
- Blocked by: `TASK-1553`, `TASK-1573`, `TASK-1578`, `TASK-1535`; coordinar `TASK-1616`
- Branch: `task/TASK-1619-globe-wan-2-7-fleet`

## Summary

Integrar Wan 2.7 Pro/standard para texto/imagen/referencias, edición de video y rutas de imagen. Reutilizar el catálogo, adapter Fal y Producer multimodal; extender video-edit, continuidad y constraints propios sin confundir `edit-video` con image-to-video.

## Goal

- Registrar `text-to-video`, `image-to-video`, `reference-to-video`, `edit-video` y variantes Pro como rutas independientes.
- Reutilizar `video-generate`, `video-frames`, `video-edit`, `image-generate` e image references donde encaje.
- Promover cada ruta solo con evaluación, rights, rate, binding y canary propios.

## Architecture Alignment

- `docs/architecture/creative-studio/EFEONCE_GLOBE_FAL_CHALLENGER_MODELS_PRODUCER_INTEGRATION_PROPOSAL_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ROUTE_BASED_MODEL_RESOLUTION_DECISION_V1.md`
- `docs/tasks/to-do/TASK-1573-globe-video-edit-capability-and-governed-continuation.md`
- `docs/tasks/to-do/TASK-1578-globe-model-onboarding-credit-rate-promotion.md`

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: contracts/domain, Fal runner y Producer de `efeonce-globe`
- Future candidate home: `remain-shared` dentro de Globe
- Boundary: route catalog, media constraints, video-edit y governed production
- Server/browser split: Fal credentials, input URLs y output ingest server-side
- Build impact: `none` por diseño; verificar al ejecutar
- Extraction blocker: provider/security boundary

## Backend/Data Contract

- Revalidar los ocho endpoints Wan 2.7 observados y fijar solo los que tengan OpenAPI/terms compatibles. Model Search no entrega pricing confiable; resolver la discrepancia entre páginas generales y precios 720p/1080p antes de crear rates.
- `text-to-video` acepta prompt/negative prompt, `audio_url`, 720p/1080p, 2–15 segundos y ratios 16:9, 9:16, 1:1, 4:3 y 3:4.
- `image-to-video` debe distinguir `image_url`, `end_image_url`, `video_url` de continuación y `audio_url`; validar límites de imagen/video y no mezclar first/end frame con video source.
- `reference-to-video` transporta arrays separados de imágenes y videos y `multi_shots`; el manifest debe conservar roles y orden por modalidad.
- `edit-video` exige `video_url`, permite referencia de imagen y `audio_setting` (`auto`/`origin`); consume `video-edit` de `TASK-1573`, no `video-generate`.
- Wan image generate/edit reutiliza `image-generate`/`image-edit`; Pro y standard tienen rutas y límites separados, incluyendo cantidades de salida distintas.
- Separar Pro de standard; no usar un rate ni evidencia común.
- Extender video-edit para preservar audio, duración, rango y lineage solo donde el schema lo soporte.
- El rate engine debe considerar resolución, duración y, en reference-to-video, duración del video de entrada.
- Validar referencias, MIME, codec, resolución, duración, output schema, retries, queue y settlement.
- Mantener imagen y video como capacidades distintas; no crear una capability `wan`.

## UI/UX Contract

Crear wireframe/flow al tomar la task. El Producer debe mostrar únicamente los modos declarados por ruta, diferenciar generar de editar, conservar references tipadas, mostrar constraints, estimate y recovery, y validar desktop/390 px, teclado y reduced motion.

## Hybrid Execution Justification

- Why not split: el mismo route catalog gobierna el cambio de modo visible y el payload ejecutable.
- Primary execution profile: `backend-data`.
- Contract boundary: server-side route/readers/commands; UI data-driven.
- Risk controls: rutas gated, no fallback y canary por Pro/standard/modalidad.

## Scope

### Slice 0 — Discovery contractual

- Revalidar Model Search/OpenAPI/pricing y seleccionar rutas soportables.
- Resolver ADR si el edit contract necesita nuevos campos.

### Slice 1 — Fleet integration

- Añadir routing, catalog, result schemas, rates, rights, readiness, binding y evaluation fixtures.

### Slice 2 — Producer and rollout

- Extender edit/reference controls, ejecutar canaries, settlement/retrieval/playback y promover por ruta.

## Out of Scope

- Implementar Wan localmente, crear adapter alterno, mapear edición a image-to-video o promover por disponibilidad del slug.

## Acceptance Criteria

- [ ] Rutas Pro/standard y modalidades tienen identidades separadas.
- [ ] `edit-video` no se materializa como `image-to-video`.
- [ ] `image-to-video` distingue first frame, end frame, video continuation y audio source.
- [ ] `reference-to-video` conserva arrays separados de imágenes/videos y `multi_shots` sin truncamiento.
- [ ] `edit-video` conserva la policy de audio y lineage de video fuente.
- [ ] Constraints y output MIME provienen del schema validado.
- [ ] Producer no contiene lógica específica de Wan ni muestra plumbing vendor.
- [ ] Evaluación, rights, rate, binding, canary y rollback quedan evidenciados por ruta.

## Rollout Plan & Risk Matrix

`gated` → schema → rate/rights → evaluation → binding → canary → `available`; rollback por route ID. Riesgos: endpoints divergentes, edit semantics incompletas y Pro/standard mezclados. Mitigación: allowlist explícita y promoción separada.
