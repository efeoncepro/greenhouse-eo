# TASK-1616 — Integración completa de MiniMax H3 en la flota y el Producer de Globe

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
- Status real: `Diseño documental; Fal live disponible, Globe no integrado ni promovido`
- Rank: `TBD`
- Domain: `platform|producer|video`
- Blocked by: `TASK-1553`, `TASK-1554`, `TASK-1578`, `TASK-1579`, `TASK-1535`; coordinar `TASK-1504`, `TASK-1569`, `TASK-1570`
- Branch: `task/TASK-1616-globe-minimax-h3-fleet-producer-integration`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Integrar MiniMax H3 en Globe como tres rutas de video: text-to-video, image-to-video con first-to-last
opcional y reference-to-video multimodal con imágenes, videos y audios. La task cubre contratos,
adapter Fal, catálogo/bindings/rates, ingest/retrieval, rights/evaluación, availability, promoción y
el Producer necesario para usar todas las capacidades sin exponer plomería del proveedor.

## Why This Task Exists

Fal ya expone H3 activo y comercial, pero Globe no lo tiene en su flota gobernada. Agregar un slug no
basta: el contrato debe distinguir modos, roles y orden de referencias; el Producer debe operar start/end
frames y referencias multimodales; y ninguna ruta puede aparecer como `available` sin rate, rights,
canary, settlement y evidencia por modalidad.

## Goal

- Integrar tres rutas H3 sin sustituir Seedance, Omni u otra ruta existente.
- Permitir prompt-only, start frame, first-to-last y referencias image/video/audio.
- Validar límites antes de reservar créditos y conservar referencias reproducibles en lineage.
- Completar onboarding, rights, rates, evaluación, canary, promoción y disponibilidad por ruta.
- Mantener API parity y fallback cerrado.

## Architecture Alignment

- `docs/architecture/creative-studio/EFEONCE_GLOBE_MINIMAX_H3_INTEGRATION_PROPOSAL_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ROUTE_BASED_MODEL_RESOLUTION_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_MODEL_LAB_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md`
- `docs/operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`
- `docs/tasks/in-progress/TASK-1553-globe-extensible-multi-model-provider-catalog.md`
- `docs/tasks/complete/TASK-1554-globe-producer-fleet-availability-projection.md`
- `docs/tasks/to-do/TASK-1578-globe-model-onboarding-credit-rate-promotion.md`
- `docs/tasks/in-progress/TASK-1579-globe-credit-rating-settlement-fallback-policy.md`

Reglas: reutilizar el seam y los readers; no compartir secretos; no exponer slugs; usar rutas nuevas;
mantener output content-addressed; no hacer fallback silencioso; promover por modelo/ruta.

## Dependencies & Impact

### Depends on

- `TASK-1553` resolución multi-modelo por ruta.
- `TASK-1554` availability projection.
- `TASK-1578` onboarding/rates/binding/promotion.
- `TASK-1579` settlement/fallback policy.
- `TASK-1535` rights attestation y promoción comercial.
- `TASK-1487` y `TASK-1488` Fal adapter, queue y expansión de modelos.
- `TASK-1504` contrato discriminado de capacidades Video/Audio.

### Coordinates with

- `TASK-1504` contrato Producer video.
- `TASK-1569` derivados y playback de video.
- `TASK-1570` Cinematic Canvas.
- `TASK-1523`, `TASK-1552`, `TASK-1555` composer/selector.
- `TASK-1614` evaluación durable si el runtime aún no la absorbió.

### Files owned — `efeonce-globe`

- `packages/contracts/src/{index.ts,producer-catalog.ts}` y contratos de referencias/video.
- `packages/domain/src/{producer-catalog.ts,producer-fleet.ts,model-lab.ts}` y tests.
- `apps/creative-runner/src/{fal-adapter.ts,composite-adapter.ts,production-route-compiler.ts}` y tests.
- `apps/studio-web/src/{governed-production-composition.ts,producer-controller.ts,producer-ui.ts}`.
- `apps/studio-client/src/surfaces/producer/composer/**` si el contrato lo requiere.
- `scripts/evidence/**`, fixtures, canaries y evidencias de runtime.

### Files owned — `greenhouse-eo`

- Esta task y la propuesta de arquitectura.
- `docs/operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md` solo con estado real.
- Documentación funcional/manual si cambia el flujo operable.
- `Handoff.md`, `changelog.md`, índices y cierre documental.

## Current Repo State

### Already exists

- Fal adapter de Globe con routing por ruta, uploads privados, queue/status/result, descarga y hash.
- Catálogo multi-modelo, bindings, availability reader, selector y contracts discriminados.
- Governance de ingest/retrieval, spend fence, rates y lane de rights/promotion.
- Tres endpoints H3 activos en Fal a `USD 0,26/s` como snapshot live del 2026-07-31.

### Gap

- H3 no aparece en el ledger ni en `globe.producer.fleet.list`.
- No hay route binding, rate version, readiness ni promoción de H3.
- El Producer no expresa plenamente referencias por tipo, orden, start/end frame ni audio-no-only.
- No existe evaluación, rights attestation, canary real ni evidencia de settlement por ruta.
- El snapshot de Fal puede divergir de páginas/aliases posteriores; todavía falta fijar el OpenAPI y
  pricing live que gobernarán la implementación.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-globe/packages/{contracts,domain}` + `apps/{creative-runner,studio-web,studio-client}`; docs gobernantes en Greenhouse.
- Future candidate home: `remain-shared` dentro de Globe; no crear package nuevo por anticipado.
- Boundary: route catalog + video input union + Fal adapter + governed bindings; consumers Model Lab, Producer, SDK, MCP y CLI.
- Server/browser split: provider IDs, keys, signed input resolution y ingest son server-only; browser consume BFF/readers/grants.
- Build impact: `none` como diseño; confirmar dependencias reales al tomar la task.
- Extraction blocker: provider/security boundary.

## Backend/Data Contract

- Reutilizar `video-generate` y `video-frames`; extender el union solo si no soporta references multimodales.
- Input modes: `text-only`, `frames{start,end?}`, `references{images[],videos[],audio[]}`.
- Cada referencia conserva `assetRef`, hash/lineage, modality, role y ordinal.
- Validar antes de reserve: duración 5–15, 2K, ratios, 9 imágenes, 3 videos, 3 audios, total 12 y audio-no-only.
- Binding privado conserva provider/model/version/endpoint/region; catálogo público no contiene slug.
- Estimate/actual/settlement usan rate version gobernada; `USD 0,26/s` es solo snapshot de onboarding.
- Submit idempotente; timeout recupera por reader; output MP4 content-addressed y gobernado.

## UI/UX Contract

La task tiene impacto de interacción. Al tomarla, crear wireframe/flow según plantilla y reutilizar selector
y composer. La superficie debe cubrir ruta/mode, start/end frame, pickers image/video/audio, orden y citación,
contadores 9/3/3/12, audio-only bloqueado, 2K, duración/ratio derivados, estimate, preflight, recovery y
playback/retrieval. Validar teclado, 390 px, reduced motion y `scrollWidth === clientWidth`.

## Hybrid Execution Justification

- Why not split: el contrato de referencias, el catálogo por ruta y el Producer deben evolucionar como una
  unidad coordinada para que no exista una ruta visible que el runtime no pueda materializar. La task funciona
  como umbrella de integración, aunque sus slices deben mantener ownership separado.
- Primary execution profile: `backend-data`; la UI es consumer obligatorio y debe ejecutarse después de que el
  contrato/readers estén estabilizados.
- Contract boundary: backend posee union, validación, adapter, bindings, governance y readers; Producer consume
  esos readers/commands y no crea lógica de proveedor.
- Risk controls: slices ordenados, availability `gated` hasta promoción, wireframe/flow antes de UI, canary por
  ruta, rollback por ruta y sin fallback silencioso.

## Execution Spec

### Slice 0 — ADR y contrato

Revalidar autenticadamente catálogo, OpenAPI y pricing por endpoint sin generar contenido; guardar timestamp,
aliases, campos requeridos, límites, output schema y unidad de cobro. Si difieren del snapshot documental,
actualizar la propuesta y esta task. Después, proponer/aceptar ADR; confirmar si `video-generate`, `video-frames`
y `PrepareExperimentPayloadV1` alcanzan; definir rutas, constraints, roles, audio semantics y compatibilidad.

### Slice 1 — Adapter y provider seam

Añadir las tres rutas H3 al routing por `routeId`, payload builders, fixtures y errores. Usar URLs de queue
devueltas por Fal; no cambiar defaults ni crear adapter paralelo.

### Slice 2 — Catalog, bindings, rates y availability

Registrar rutas públicas, bindings privados, rate version, estimate/actual/settlement, readiness y availability.
Mantener `gated` hasta promoción.

### Slice 3 — References y lifecycle

Conectar picker/uploader gobernado, validar límites/ownership/MIME/duración/rights, persistir manifest/lineage,
resolver URLs efímeras server-side, verificar output/hash/derivatives/retrieval/recovery.

### Slice 4 — Producer consumer

Implementar estados y controles definidos en UI/UX; consumir fleet reader y commands/readers comunes; verificar
estimate, generate, feed, viewer, playback/download y errores accionables.

### Slice 5 — Evaluation, rights, canary y promotion

Evaluar las tres rutas, límites, audio-only y recovery; completar attestation; ejecutar canaries reales; promover
solo con binding, rate, rights, evidence, settlement y readbacks completos; actualizar ledger/handoff.

## Out of Scope

- Ejecutar esta task durante la fase documental actual.
- Provider adapter, catálogo o ledger paralelo.
- Reemplazar rutas existentes.
- Prometer audio generado separado sin evidencia.
- Exponer slugs, endpoint IDs, costos vendor, margen, signed URLs o secretos.

## Acceptance Criteria

- [ ] ADR/decisión aceptada o bloqueo explícito.
- [ ] OpenAPI y pricing live revalidados por endpoint; ningún límite o alias del snapshot se usa sin confirmación.
- [ ] Tres rutas con constraints correctos y sin slug leak.
- [ ] Adapter/Composite resuelven por ruta con queue/poll/cancel/recovery correctos.
- [ ] Text-only, first frame, first-to-last y multimodal references se validan antes de spend.
- [ ] Producer opera image/video/audio references con roles, orden, límites y estados completos.
- [ ] Ingest, ownership, rights, malware/provenance, output hash, derivatives y retrieval están gobernados.
- [ ] Rate/estimate/reserve/actual/settlement reconciliados por ruta.
- [ ] Rights attestation y evaluación cubren las tres rutas, límites, audio-only y recovery.
- [ ] `globe.producer.fleet.list` solo muestra `available` tras readiness/binding/rights/canary.
- [ ] API/SDK/MCP/UI comparten commands/readers/contracts; no hay bypass de UI.
- [ ] Check, build, tests, canaries browser/runtime y documentación de evidencia quedan completos.
- [ ] Ledger, task index, Handoff y changelog reflejan estado honesto.

## Verification Plan

No ejecutar durante esta fase documental. Al tomar la task: gates de contracts/domain/runner/client; tests de
schema/routing/limits/identity/errors/idempotency; canary Fal por ruta y modo; evaluación durable; rights;
Producer desktop/390/keyboard/reduced-motion; `pnpm qa:gates --changed` y `pnpm docs:closure-check`.

## Rollback

Antes de promoción, dejar la ruta `gated` o pausarla. Después, despromover por ruta y conservar evidence/lineage.
Nunca hacer fallback automático de una request H3 a otro modelo.
