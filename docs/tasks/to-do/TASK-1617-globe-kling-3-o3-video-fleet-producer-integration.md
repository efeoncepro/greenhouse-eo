# TASK-1617 — Integración Kling 3/O3 en la flota y Producer de Globe

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
- Branch: `task/TASK-1617-globe-kling-3-o3-video-fleet`

## Summary

Registrar Kling 3 y O3 como rutas gobernadas de video, cubriendo texto/imagen, referencias, edición, motion control y audio nativo únicamente donde el OpenAPI live lo confirme. Reutilizar el seam Fal y extender el Producer para roles, multi-shot, audio y edición sin hardcodear el proveedor.

## Goal

- Crear route IDs separados por familia, tier y modalidad.
- Reutilizar `video-generate`, `video-frames` y `video-edit`; extender referencias, audio y controles de multi-shot/custom elements.
- Completar rate, rights, evaluación, binding, canary y disponibilidad por ruta.

## Architecture Alignment

- `docs/architecture/creative-studio/EFEONCE_GLOBE_FAL_CHALLENGER_MODELS_PRODUCER_INTEGRATION_PROPOSAL_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ROUTE_BASED_MODEL_RESOLUTION_DECISION_V1.md`
- `docs/operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md`
- `docs/tasks/in-progress/TASK-1553-globe-extensible-multi-model-provider-catalog.md`
- `docs/tasks/to-do/TASK-1573-globe-video-edit-capability-and-governed-continuation.md`

Reglas: no exponer slugs, no fallback silencioso, no declarar audio sin evidencia, una identidad ejecutable por route ID y promoción `gated`.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-globe/packages/{contracts,domain}` y `apps/{creative-runner,studio-web,studio-client}`
- Future candidate home: `remain-shared` dentro de Globe
- Boundary: catálogo por ruta, contrato de referencias/video, adapter Fal y commands/readers del Producer
- Server/browser split: secrets, URLs efímeras, bindings y materialización server-side; browser solo payload público y grants
- Build impact: `none` por diseño; verificar al ejecutar
- Extraction blocker: boundary de provider y seguridad

## Backend/Data Contract

- Revalidar schemas/pricing de `fal-ai/kling-video/v3/...` y `.../o3/...` antes de congelar rutas.
- Mapear text/image/reference/edit/motion a capabilities existentes; extender union solo si falta una semántica discriminada.
- Modelar audio nativo, `multi_prompt` con duración por shot, `shot_type`, custom elements y voice-control como constraints de ruta, no flags arbitrarios.
- El manifest debe agrupar elementos semánticos —imagen frontal, referencias 1–3, video y `@ElementN`—; una lista plana de imágenes no es equivalente.
- Diferenciar explícitamente `start_image_url`, `end_image_url`, `image_urls` y `video_url`; O3 edit/reference requiere video base más referencias y el límite combinado de cuatro imágenes/elementos.
- Motion control debe conservar sus límites por `character_orientation`; V3 puede conservar audio original y O3 edit puede usar `keep_audio`.
- Tests de payload, output MP4/audio presence, host allowlist, idempotencia, retry y route/binding/model equality.
- Evidencia independiente para Pro, Standard, 4K y O3; no promover un tier por evidencia de otro.

## UI/UX Contract

Wireframe y flow son obligatorios al tomar la task. El Producer debe operar start frame, reference elements, motion-control, multi-shot y audio; mostrar límites de la ruta, estimate, preflight, recovery y playback; validar teclado, 390 px, reduced motion y ausencia de overflow.

## Hybrid Execution Justification

- Why not split: catálogo, contrato y controles visibles deben versionarse juntos para evitar rutas seleccionables que no puedan materializarse.
- Primary execution profile: `backend-data`; UI consumer después del contrato.
- Contract boundary: backend posee semántica y validación; UI consume readers/commands.
- Risk controls: route-level gating, canary por modalidad/tier, rollback sin afectar la flota existente.

## Scope

### Slice 0 — Schema y decisión

- Consultar catálogo, OpenAPI y pricing autenticados; fijar capabilities y límites reales.
- Proponer ADR si se amplía el contrato de audio, referencias o video-edit.

### Slice 1 — Routing y catálogo

- Añadir rutas gobernadas, builders Fal, result schemas, rate versions, rights y bindings.
- Mantener slugs solo server-side y availability `gated`.

### Slice 2 — Producer y evidencia

- Extender references/multi-shot/audio/edit controls data-driven.
- Ejecutar evaluación durable, canary por ruta, settlement, retrieval, playback y readback de fleet.

## Out of Scope

- Crear adapter Fal paralelo, capability por marca, fallback a Seedance o promoción comercial sin rights.
- Soportar controles no presentes en el OpenAPI live.

## Acceptance Criteria

- [ ] Cada modalidad/tier promovido tiene route ID, binding, rate, rights, readiness y canary propios.
- [ ] Producer no expone slugs, costos vendor ni lógica específica de Kling.
- [ ] Audio solo se declara cuando el output real contiene audio y pasa governance.
- [ ] Multi-shot, elementos agrupados y referencias O3 se materializan sin aplanamiento semántico.
- [ ] Video-to-video edit/reference nunca resuelve al endpoint genérico text-to-video.
- [ ] `voice_id` permanece privado dentro del binding/adapter y no aparece en el payload cliente.
- [ ] Edición, referencias y motion control validan antes de reservar créditos.
- [ ] Existe evidencia durable de evaluación, MIME/hash, lineage, settlement y recovery sin doble cobro.
- [ ] La flota previa no presenta regresiones.

## Rollout Plan & Risk Matrix

`gated` → evaluación → rights/rate → binding → canary → `available`; rollback por route ID. Riesgos principales: schema drift, audio ausente, límites de referencia y fallback accidental. Mitigación: revalidación live, fail-closed y endpoint allowlist.
