# TASK-1573 — Globe Video Edit Capability and Governed Continuation

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `creative|video|ai`
- Blocked by: `TASK-1490`, `TASK-1553`; external-video slice additionally `TASK-1539`
- Branch: `Greenhouse develop; Globe main; sin worktrees`
- Legacy ID: `none`

## Summary

Introduce la capability neutral `video-edit` para que Globe pueda editar un video generado o gobernado mediante
prompt, referencias y continuidad stateful cuando el proveedor la soporte. Define el brief temporal, preservation
policy, route matrix, chainability de interacciones Omni, fallback reference-based, spend fence, lineage y evidencia,
sin crear una abstracción específica de Seedance, Gemini o Veo.

## Why This Task Exists

Globe ya tiene `videoInputMode: edit`, `editReference`, `previousInteractionId` y adapters de video, pero el runtime
no diferencia formalmente entre editar un parent, generar condicionado por un video, extender una toma o continuar una
interacción. Gemini Omni ya soporta edición conversacional, mientras Seedance y Veo exponen otras formas de referencia,
frames o edición. Sin un contrato común, la UI puede prometer preservación o routing que el provider no puede cumplir.

## Goal

- Crear una capability `video-edit` con Full API Parity y fail-closed por combinación de inputs/capabilities.
- Permitir V1 sobre un video parent gobernado, una toma o intervalo semántico, prompt y referencias con roles.
- Certificar que un parent stateful es chainable antes de reservar gasto y registrar la interacción hija.
- Distinguir continuidad stateful de nueva interpretación reference-based en contrato, manifest y UI projection.
- Dejar preparada la extensión posterior a keyframes/tracking sin mezclar máscaras temporales en V1.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/README.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`
- `docs/operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `../efeonce-globe/packages/contracts/src/index.ts`
- `../efeonce-globe/packages/provider-contract/src/index.ts`
- `../efeonce-globe/apps/creative-runner/src/vertex-omni-adapter.ts`
- `../efeonce-globe/apps/creative-runner/src/fal-adapter.ts`

Reglas obligatorias:

- `video-edit` es capability de producto, no slug de provider.
- El browser envía referencias opacas, brief neutral y prompt; no bytes, provider IDs, URLs ni secretos.
- `previousInteractionId` sólo se usa cuando el runtime certifica `providerRunChainable` y conserva la surface que
  creó la interacción.
- Seedance reference-to-video, Veo frames y Omni stateful no se presentan como equivalentes.
- Cada edición crea un experimento hijo; el video padre, sus derechos y su manifest permanecen inmutables.
- Temporal masks/tracking no entran en V1; su contrato futuro debe poder extender el brief sin romperlo.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_MEDIA_DERIVATIVES_V1.md`
- `docs/tasks/complete/TASK-1490-globe-cross-model-edit-refine-capability.md`
- `docs/tasks/to-do/TASK-1539-globe-video-intake-bidirectional-orchestration.md`

## Dependencies & Impact

### Depends on

- `TASK-1490` — edit/refine seam, parent output, provider refs y lineage base.
- `TASK-1504` — video input/output modes y provider threading.
- `TASK-1553` / `TASK-1554` — catálogo y disponibilidad por ruta.
- `TASK-1539` — assetRef e ingest gobernado para video externo y referencias.
- Existing `vertex-omni-adapter` — stateful continuation and mixed image/video inputs.

### Blocks / Impacts

- Bloquea `TASK-1574` — Producer UI consumer.
- Impacta `TASK-1570` sólo como consumer handoff; no cambia su playback surface.
- Afecta model catalog, production route binding, coverage, manifests y provider adapters.

### Files owned

- `../efeonce-globe/packages/contracts/src/index.ts`
- `../efeonce-globe/packages/provider-contract/src/index.ts`
- `../efeonce-globe/packages/domain/src/model-lab.ts`
- `../efeonce-globe/packages/domain/src/producer-catalog.ts`
- `../efeonce-globe/apps/creative-runner/src/index.ts`
- `../efeonce-globe/apps/creative-runner/src/vertex-omni-adapter.ts`
- `../efeonce-globe/apps/creative-runner/src/fal-adapter.ts`
- `../efeonce-globe/apps/studio-web/src/governed-production-composition.ts`
- `../efeonce-globe/apps/studio-web/src/production-result-drivers.ts`
- `docs/operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md`

## Current Repo State

### Already exists

- Generic edit seam with `editFrom`, `editReference`, provider run refs and chainability evidence.
- `videoInputMode: 'edit'` and output shape for video.
- Omni adapter with stateful `previous_interaction_id`, mixed image/video references and editable surface selection.
- Fal Seedance generation/reference/motion routes and private input resolution.
- Video derivatives, playback projections in progress and governed asset/rights pipeline.

### Gap

- `video-edit` no existe en `CREATIVE_CAPABILITIES` ni en el catálogo productivo.
- El manifest no diferencia de forma suficiente semantic edit, stateful continuation y reference-based rewrite.
- No existe un `VideoEditBrief` con temporal scope, reference roles, preservation policy y audio policy.
- Omni chainability no es todavía una operación de producto consumible por Producer.
- No existe route binding promovible para video edit; Seedance reference-to-video no debe degradarse a edición estricta.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-globe/packages/contracts`, `packages/domain`, `packages/provider-contract`, `apps/creative-runner`, `apps/studio-web`; governance in Greenhouse.
- Future candidate home: `remain-shared`
- Boundary: `video-edit` command/reader/manifest and route adapters; consumers are Producer, SDK, MCP, CLI and workers.
- Server/browser split: server resolves parent, refs, rights, chainability, route, bytes, spend, provider surface and lineage; browser only sends opaque refs and neutral brief.
- Build impact: existing Globe packages/apps; provider SDKs remain inside adapters.
- Extraction blocker: trusted context, spend fence, provider credentials, interaction surfaces and durable experiment store.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `Lab experiment/manifest`, route catalog/readiness, provider run evidence and governed assetRef.
- Consumidores afectados: `Producer UI`, API, SDK, MCP, CLI, creative-runner and provider drivers.
- Runtime target: `Globe API/BFF` + `creative-runner` + external providers.

### Contract surface

- Contratos existentes: `PrepareExperimentPayloadV1.editFrom`, `CreativeProviderRequestV1`, `VideoOutputShapeV1`,
  `providerRunRef/providerRunChainable`, `assetRef` and `globe.producer.fleet.list`.
- Contracto nuevo/modificado: capability `video-edit`, `LabVideoEditBriefV1` or additive equivalent, temporal scope,
  reference roles, preservation/audio policy, continuity mode and manifest evidence.
- Backward compatibility: `compatible|gated`; existing video generation/extend/frames behavior remains unchanged.
- Full API parity: one governed prepare/estimate/execute primitive; no UI-only video edit path.

### Data model and invariants

- Parent video and all references resolve to exact immutable identities and same workspace authority.
- `temporalScope` uses source time/frame metadata; it never implies strict frame preservation unless the route certifies it.
- `continuityMode` is evidence (`stateful|reference-based`), not a caller assertion.
- Stateful edit requires chainable parent interaction and same provider surface namespace.
- Reference-based fallback is explicit and cannot silently replace stateful continuation.
- Audio policy is recorded as `preserve|regenerate|unsupported|not-requested`; unsupported preservation fails closed or
  downgrades only with explicit user-visible capability state.
- Every output is a child experiment with parent lineage, route snapshot, input hashes, effective prompt and provider evidence.
- Retry uses idempotency over parent, brief, references, prompt, route and output shape; no blind duplicate spend.

### Migration, backfill and rollout

- Migration posture: `additive only` or no migration if existing manifest extension is sufficient.
- Default state: `policy-blocked`/flags OFF until route driver, readiness, canary and promotion are green.
- Backfill plan: none; old video runs remain generation/extend/frames by absence of `video-edit` evidence.
- Rollback path: disable capability/route bindings; retain parent and child evidence; no destructive deletion.
- External coordination: Gemini editable surface/API key or Vertex configuration, Fal route binding and ADR-009 promotion.

### Security and access

- Auth/access gate: existing `globe.lab.experiment.run`, workspace binding, asset rights and spend fence.
- Sensitive data: raw video/reference bytes remain private; no provider URL, interaction secret or raw body in logs.
- Error contract: `video_edit_unsupported`, `video_edit_parent_not_chainable`, `video_edit_surface_mismatch`,
  `video_edit_audio_unsupported`, `video_edit_scope_invalid`, `video_edit_route_gated`.
- Abuse posture: duration/resolution caps, reference count/size limits, idempotency and provider circuit breaker.

### Runtime evidence

- Unit tests for capability coverage, brief validation, parent chainability, surface mismatch, fallback semantics,
  audio policy and tenant isolation.
- Integration canary: governed video generate → stateful Omni edit → child lineage → second continuation.
- Fallback canary: retained video → Seedance/reference route → manifest says `reference-based`, never `stateful`.
- Negative canary: non-chainable parent or unsupported route fails before spend.
- Verify output duration, MIME, derivatives, input hashes, credits and provider run surface.
- Update model fleet ledger with Lab/prod lane and evidence; no model becomes Producer-available only because Lab passes.

### Capability Definition of Done — Full API Parity

- [ ] `video-edit` is represented in contracts, domain registry, route catalog, coverage and conformance.
- [ ] HTTP/SDK/MCP/CLI/worker use the same semantic command/reader primitive or explicitly remain policy-blocked.
- [ ] Capability/grant/readiness/promotion posture is explicit; no UI-only action exists.
- [ ] Provider-specific fields remain inside adapters and production drivers.

<!-- ZONE 2 — PLAN MODE (se completa al tomar la task) -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Library Discovery — 2026-07-26

- **Adopt:** no editor library in the backend; semantic temporal scope, chainability and route contracts remain Globe domain primitives.
- **Evaluate:** Remotion only for a future composition/rendering lane, not for provider editing or stateful Omni continuation ([Player](https://www.remotion.dev/docs/player/integration)).
- **Evaluate:** Mediabunny for non-authoritative browser metadata/preview only; FFmpeg remains server-side for deterministic derivatives.
- **Do not adopt:** a generic React editor whose timeline or autosave becomes a second source of truth.

## Scope

### Slice 1 — Capability and edit brief

- Add `video-edit` and validate parent, temporal scope, intent, references, roles, preservation and audio policy.
- Extend manifest/evidence without changing existing video generation semantics.

### Slice 2 — Stateful continuation

- Make Omni editable-surface/chainability a governed pre-spend decision.
- Persist parent/child interaction refs and route surface; support idempotent continuation.

### Slice 3 — Reference-based edit lane

- Bind a verified Seedance or equivalent video-edit/reference route; explicitly classify it as reference-based.
- Fail closed when the route only supports new generation, not edit semantics requested by the brief.

### Slice 4 — Production readiness and evidence

- Add route binding/readiness/ledger evidence, canaries, negative tests, signals and rollback.

## Out of Scope

- Producer UI, timeline styling or playback: `TASK-1570`/`TASK-1574`.
- New uploader or external asset authority: `TASK-1539`.
- Per-frame masks, tracking, propagation, temporal compositing, flicker/drift QC: future follow-up task.
- Silent audio replacement, provider SDKs in browser or direct provider URLs.

## Detailed Spec

V1 supports semantic editing of one governed video parent, preferably scoped to one shot or a selected interval. The
brief records the scope, but the route advertises whether it can honor the interval strictly. A stateful route is
eligible only when the parent interaction was created with `store=true` on the same editable surface and the adapter
reported `providerRunChainable=true`. Otherwise, the router may select a reference-based route only if the UI receives
the explicit continuity downgrade. The domain never infers semantics from the number or media type of references.

## Rollout Plan & Risk Matrix

| Risk | Mitigation | Rollback |
|---|---|---|
| Stateful ref created on wrong surface | persist surface + chainability; fail pre-spend | disable stateful lane |
| Reference route misrepresented as edit | explicit continuity mode and route capability | hide route |
| Audio silently lost | audio policy in brief/manifest and preflight | fail closed or require acknowledgement |
| External video bypasses rights | consume `TASK-1539` assetRef only | disable external lane |
| Duplicate expensive continuation | idempotency over parent+brief+refs | reconcile reader, no blind retry |

## Acceptance Criteria

- [ ] `video-edit` exists as a governed capability and is not conflated with `video-generate` or `video-extend`.
- [ ] A parent video, temporal scope, prompt, references/roles, preservation and audio policy are validated before spend.
- [ ] Omni stateful continuation fails closed for non-chainable or surface-mismatched parents.
- [ ] Reference-based fallback is explicit in manifest, route evidence and client-safe projection.
- [ ] Every output has immutable parent lineage, effective route, continuity mode, input hashes and idempotent retry.
- [ ] Unsupported audio/timing/preservation claims are visible and never silently downgraded.
- [ ] At least one governed canary and one negative canary pass; Lab-only models remain unavailable to Producer.
- [ ] Full API Parity coverage/conformance passes for every declared surface.

## Verification

- `cd ../efeonce-globe && pnpm check && pnpm build`
- Focused contract/adapter/domain tests registered in package test scripts.
- `pnpm task:lint --task TASK-1573`
- Governed canary and negative pre-spend verification.

## Closing Protocol

- [ ] Lifecycle/file/README/Handoff/changelog synchronized.
- [ ] Model fleet ledger and runtime handoff updated with evidence.
- [ ] `TASK-1574` re-read against final contract before UI enablement.

## Follow-ups

- Temporal keyframe edit and assisted tracking.
- Explicit temporal masks, interpolation, compositing and flicker/drift quality gates.
- Audio-preserving/regenerating video edit lane when a provider certifies it.

<!-- ZONE 4 — VERIFICATION & CLOSING -->
