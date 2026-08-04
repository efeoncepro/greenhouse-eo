# TASK-1642 — Integración de FLUX 3 Video en la flota y el Producer de Globe

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

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
- Status real: `Diseño documental; Fal expone FLUX 3, Globe no integrado ni promovido`
- Rank: `TBD`
- Domain: `platform|producer|video`
- Blocked by: `none`
- Branch: `Greenhouse develop; Globe main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Integrar FLUX 3 Video sobre el seam Fal existente de Globe, con rutas explícitas para texto, imagen,
first/last frame, keyframes y continuación. La task cubre el contrato provider-neutral, adapter, catálogo,
allowlist, ingest, rates, rights, evaluación, canary, promoción y disponibilidad por ruta; los drafts
requieren una decisión adicional porque `draft_cache` es un artefacto intermedio cifrado y no un video común.

## Why This Task Exists

Black Forest Labs acaba de anunciar FLUX 3 Video y Fal ya expone once endpoints activos: cinco rutas
estándar, cinco variantes draft y `draft-enhance`. Globe no tiene ninguna ruta FLUX 3, y el contrato actual
no representa de forma suficiente keyframes posicionados, duración `auto` ni la continuidad preview → render
de `draft_cache`. Además, Fal publica una discrepancia entre el namespace del catálogo
(`blackforestlabs/...`) y el OpenAPI/queue (`fal-ai/...`); fijar un slug por analogía podría producir una
resolución incorrecta, un cobro no trazable o una ruta que no pueda recuperar su completion.

La disponibilidad del proveedor no equivale a disponibilidad de Globe: BFL mantiene FLUX 3 Video en Early
Access y sus términos específicos pueden limitar producción o escala de usuarios finales. Toda ruta debe
permanecer `gated` hasta resolver contrato, derechos, rate, evaluación, canary, settlement y promoción.

## Goal

- Integrar las cinco rutas estándar FLUX 3 sobre Fal sin crear un adapter ni SDK paralelo para BFL.
- Modelar de forma explícita imagen inicial, first/last, keyframes con `frameIndex`, video de continuación,
  audio nativo, límites de input y outputs content-addressed.
- Decidir y, si el contrato lo permite, integrar drafts como operación de dos fases con `draft_cache`; si no,
  dejar un follow-up explícito sin bloquear la integración estándar ni fingir paridad.
- Completar onboarding de endpoint, pricing, rights, evaluación, canary, settlement, promotion y projection
  de fleet sin marcar una ruta `available` prematuramente.
- Mantener API parity, fallback cerrado, secretos server-only y recuperación durable ante ack perdido o URL
  temporal expirada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- [`EFEONCE_GLOBE_FLUX3_VIDEO_INTEGRATION_PROPOSAL_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_FLUX3_VIDEO_INTEGRATION_PROPOSAL_V1.md)
- [`EFEONCE_GLOBE_FAL_CHALLENGER_MODELS_PRODUCER_INTEGRATION_PROPOSAL_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_FAL_CHALLENGER_MODELS_PRODUCER_INTEGRATION_PROPOSAL_V1.md)
- [`EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md)
- [`EFEONCE_GLOBE_ROUTE_BASED_MODEL_RESOLUTION_DECISION_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_ROUTE_BASED_MODEL_RESOLUTION_DECISION_V1.md)
- [`EFEONCE_GLOBE_ROUTE_CREATIVE_CONTRACT_DECISION_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_ROUTE_CREATIVE_CONTRACT_DECISION_V1.md) (ADR-022)
- [`EFEONCE_GLOBE_PROVIDER_COMPLETION_CAPTURE_DECISION_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_PROVIDER_COMPLETION_CAPTURE_DECISION_V1.md) (ADR-021)
- [`EFEONCE_GLOBE_MODEL_LAB_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_MODEL_LAB_V1.md)
- [`EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md)
- [`GLOBE_MODEL_FLEET_STATUS.md`](../../operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md)
- [`GLOBE_RUNTIME_HANDOFF.md`](../../operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md)

Reglas obligatorias:

- Fal es el proveedor de ejecución de esta task; BFL es fuente primaria de producto, API directa y términos.
  No crear un adapter directo BFL ni interpretar los logos de partners como un contrato técnico.
- La identidad durable es `{routeId, capability, provider, model, version, endpointId, region,
  completionDriver}`. El cliente, MCP externo y logs públicos no reciben slugs privados ni URLs Fal.
- Registrar rutas por `routeId`; no resolver por alias de modelo, no crear una capability `flux-3` por nombre
  de proveedor y no agregar `if model === ...` al Composer.
- Reutilizar el adapter Fal, queue/status/result, upload privado, result drivers, ingest, fleet reader,
  rates y promotion existentes. Extender los contratos solo cuando una semántica real lo exija.
- No usar una URL temporal de Fal como authority durable: descargar, verificar MIME/bytes, hashear, ingerir,
  conservar lineage y hacer retrieval gobernado.
- No marcar una ruta `available` sin readiness `promoted`, binding de producción habilitado, rate vigente,
  rights attestation, evaluación, canary, settlement y readback terminal convergentes.

## Normative Docs

- [`TASK_PROCESS.md`](../TASK_PROCESS.md)
- [`TASK_BACKEND_DATA_ADDENDUM.md`](../TASK_BACKEND_DATA_ADDENDUM.md)
- [`GREENHOUSE_AI_CREATIVE_DATA_GOVERNANCE_DECISION_V1.md`](../../architecture/GREENHOUSE_AI_CREATIVE_DATA_GOVERNANCE_DECISION_V1.md)
- [`TASK-1633-globe-producer-operation-input-control-contract.md`](../in-progress/TASK-1633-globe-producer-operation-input-control-contract.md)
- [`TASK-1553-globe-extensible-multi-model-provider-catalog.md`](../in-progress/TASK-1553-globe-extensible-multi-model-provider-catalog.md)
- [`TASK-1578-globe-model-onboarding-credit-rate-promotion.md`](TASK-1578-globe-model-onboarding-credit-rate-promotion.md)
- [`TASK-1579-globe-credit-rating-settlement-fallback-policy.md`](../in-progress/TASK-1579-globe-credit-rating-settlement-fallback-policy.md)
- [`TASK-1535-globe-commercial-promotion-attestation-lane.md`](../complete/TASK-1535-globe-commercial-promotion-attestation-lane.md)

Fuentes primarias externas que se deben revalidar al ejecutar:

- [Fal FLUX 3](https://fal.ai/flux-3), [Model Search](https://fal.ai/docs/platform-apis/v1/models),
  [Pricing API](https://fal.ai/docs/platform-apis/v1/models/pricing), [Queue](https://fal.ai/docs/documentation/model-apis/inference/queue)
  y [Webhooks](https://fal.ai/docs/documentation/model-apis/inference/webhooks).
- [BFL FLUX 3](https://bfl.ai/models/flux-3), [anuncio](https://bfl.ai/blog/flux-3),
  [API](https://docs.bfl.ai/api-reference/utility/generate-a-video-with-flux-3),
  [OpenAPI](https://docs.bfl.ai/openapi-flux3.json) y [EAP Terms](https://bfl.ai/legal/eap-terms-of-service).

## Dependencies & Impact

### Depends on

No hay bloqueo administrativo para crear la task ni para ejecutar el Slice 1 de discovery. Las siguientes
capacidades son gates de ejecución/promotion y deben coordinarse antes de activar cada ruta:

- `TASK-1553` — resolución multi-modelo por ruta y catálogo.
- `TASK-1554` — proyección de availability de fleet.
- `TASK-1578` — onboarding, rates, binding, estimate, canary y promotion.
- `TASK-1579` — rate/settlement/fallback policy.
- `TASK-1535` — rights attestation y promoción comercial.
- `TASK-1633` — operación, roles de input, controles, compilación por ruta y output contract.
- `TASK-1641` — canary post-promoción operable y convergencia terminal.

### Blocks / Impacts

- `TASK-1504` — expansión de capabilities del Producer y canary por modalidad.
- `TASK-1552` — consumer del Composer; esta task no agrega JSX ni un flujo visible nuevo.
- `TASK-1569` y `TASK-1570` — derivatives y playback de video si la salida FLUX 3 requiere proyección nueva.
- `TASK-1573` — video edit/continuation gobernado; FLUX 3 `extend` no debe confundirse con un editor general.
- `TASK-1616`…`TASK-1619` — challengers Fal paralelos que comparten seam, no contratos ni evidence.
- `TASK-1620` — FLUX.2 Max/Edit, separado por modalidad de imagen.
- `TASK-1635` — loop local de generación real; útil para canary controlado cuando su entorno exista.

### Files owned — `efeonce-globe`

- `packages/contracts/src/{index.ts,producer-catalog.ts}` y contratos de referencia/video/output.
- `packages/domain/src/{producer-catalog.ts,producer-fleet.ts,model-lab.ts}` y tests.
- `apps/creative-runner/src/{fal-adapter.ts,production-route-compiler.ts,production-result-drivers.ts}` y tests.
- `apps/studio-web/src/{governed-production-composition.ts,producer-controller.ts}` y tests de allowlist.
- `scripts/evidence/**`, fixtures, route bindings, rates, canaries y evidencia de runtime.

### Files owned — `greenhouse-eo`

- Esta task y [`EFEONCE_GLOBE_FLUX3_VIDEO_INTEGRATION_PROPOSAL_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_FLUX3_VIDEO_INTEGRATION_PROPOSAL_V1.md).
- Índices de tasks, `Handoff.md`, `changelog.md` y documentación funcional/manual solo si el flujo realmente cambia.
- `GLOBE_MODEL_FLEET_STATUS.md` solo cuando exista una transición real de estado; crear la task no autoriza editar `available`.

## Current Repo State

### Already exists

- Fal adapter con routing por capability/ruta, uploads privados, queue/status/result, hash e ingest.
- Allowlist de producción y result schemas por endpoint en `apps/studio-web` y `apps/creative-runner`.
- Catálogo de Producer versionado, route contract, input slots, fleet reader, readiness/binding y `globe.producer.fleet.list`.
- Captura de completion Fal por webhook/poll, recuperación de ack perdido y descarga durable.
- Onboarding de modelos, rates, credits, rights, evaluation durable y promoción por ruta como foundations separadas.

### Gap

- No existe route binding, payload, allowlist, result schema, pricing snapshot, rights evidence, evaluation ni canary de FLUX 3.
- El catálogo no representa todavía keyframes con `frameIndex`, ni distingue un `draft_cache` cifrado de un output video.
- La ruta Fal expone un namespace de catálogo distinto del namespace de OpenAPI/queue; no existe evidencia autenticada en Globe que resuelva el alias.
- `duration: auto`, `generate_audio`, `safety_tolerance`, ratios amplios y restricciones de MP4/50 MB/15 s no están mapeados por ruta.
- BFL Early Access y Fal `commercial` no resuelven por sí solos la autorización de uso de Globe ni la disclosure de datos.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-globe/packages/contracts`, `packages/domain`, `apps/creative-runner` y `apps/studio-web`; canon documental en `greenhouse-eo/docs`
- Future candidate home: `remain-shared`
- Boundary: contrato de route catalog/creative input/output, adapter Fal, compiler/allowlist server-side, result driver, fleet reader y consumers programáticos; Producer UI solo consume la proyección autorizada
- Server/browser split: API keys, endpoint IDs, request bodies, uploads, queue URLs, draft cache, pricing, rights, settlement y provider errors permanecen server-side; browser recibe solo descriptor/estado/estimate browser-safe
- Build impact: no añadir SDK paralelo; conservar dependencias y entradas de build actuales; cualquier dependencia nueva requiere justificación y gate de runtime
- Extraction blocker: transacciones de credits/rights/lineage, auth de Globe, route resolution, Fal secret y completion/retrieval compartidos impiden extraer el adapter como paquete autónomo

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: route catalog, Fal route binding/allowlist, model readiness, rate snapshot, rights policy, completion/asset governance y `globe.producer.fleet.list`
- Consumidores afectados: Producer/API/SDK/MCP/CLI, worker, evaluation/canary y operators
- Runtime target: Globe API/worker/studio; Fal queue/webhook; staging y producción solo después de los gates

### Contract surface

- Contratos existentes a respetar: `RouteCreativeContractV1`, `CreativeProviderRequestV1`, Fal adapter/transport,
  `ProductionEndpointAllowlistEntryV1`, `FalResultSchemaV1`, readiness/binding/rate readers, ADR-013, ADR-021 y ADR-022.
- Contratos nuevos o modificados: route descriptors para cinco operaciones; slots de first/last/keyframes/extend;
  provider payloads discriminados; optional draft continuation/cache contract; result schema y evidence de audio.
- Backward compatibility: `gated` y aditiva para rutas existentes; cambios a contratos compartidos deben ser versionados,
  dual-read cuando aplique y cubiertos por una delta aceptada de ADR-022.
- Full API parity: estimate/prepare/execute/reconcile, fleet reader y route contract son la autoridad; ninguna UI construye
  cuerpos Fal, calcula costos, decide capabilities o guarda URLs provider.

### Data model and invariants

- Entidades/lectores afectados: route catalog/bindings, model readiness, credit rates/receipts, rights policy,
  provider attempts, completion events, asset lineage/retrieval y fleet availability.
- Invariantes que no se pueden romper:
  - route identity exacta y `endpointId` server-only; no resolver por slug alternativo.
  - validación completa antes de reservar/submit: MIME, tamaño, duración, frame indices, ratio, resolución, audio y rights.
  - output URL no es autoridad hasta descarga, MIME check, hash e ingest; `draft_cache` es privado y no es un video.
  - webhook/poll es at-least-once e idempotente por request; lost ack debe poder recuperarse por las URLs devueltas.
  - readiness `promoted` y binding `enabled` deben converger; si divergen, fleet permanece `gated`.
  - settlement usa rate snapshot y no crea un segundo ledger ni un fallback silencioso.
- Tenant/space boundary: derivar `organization/space/member/session` desde el contexto confiable de Globe; Fal nunca decide tenancy.
- Idempotency/concurrency: conservar idempotency key del governed run y `request_id` de Fal; webhook, poll y recovery deben converger sin doble ingest ni doble settlement.
- Audit/outbox/history: registrar provider request, route/version, pricing, rights digest, completion evidence,
  input/output hashes, draft lineage y señales de promotion/rollback en los stores existentes.

### Migration, backfill and rollout

- Migration posture: `none` si el contrato existente alcanza; `additive/versioned` si keyframes o draft cache requieren persistencia nueva. No hacer backfill ciego.
- Default state: `flag OFF`/`gated`; ninguna ruta se muestra como `available` antes de la promoción independiente.
- Backfill plan: `none`; cualquier migración de draft cache o lineage debe tener dry-run, retención y rollback aprobado antes de aplicar.
- Rollback path: apagar binding/route readiness, conservar evidencia y devolver `gated`; no borrar attempts, receipts, lineage ni cache necesario para recovery.
- External coordination: Fal API key/limits, pricing account, namespace validation, webhook/JWKS, BFL/Fal terms, Legal rights,
  operator approval de canary y redeploy de API/worker/studio simétrico.

### Security and access

- Auth/access gate: Globe trusted context + entitlements de Producer; `GLOBE_FAL_API_KEY` server-only; webhook signature/identity/timestamp/replay guard.
- Sensitive data posture: inputs creativos, likeness/voz, provider URLs, draft cache y secretos; no imprimir raw provider payloads ni keys.
- Error contract: errores canónicos sanitizados y `captureWithDomain`; distinguir invalid input, moderated, provider unavailable,
  lost ack, retrieval failure y settlement uncertainty.
- Abuse/rate-limit posture: spend fence, preflight validation, provider concurrency/circuit breaker, cancel/recovery gobernados y no fallback implícito.

### Runtime evidence

- Local checks: tests focales de contracts, adapter, payload compiler, allowlist/result schemas, catalog/fleet and route resolution; `pnpm check` y build de Globe.
- DB/runtime checks: readers de readiness/binding/rate/rights, receipts y lineage; verify de convergencia de promotion y settlement.
- Integration checks: discovery autenticado con OpenAPI, pricing por endpoint, submit controlado con response URLs reales,
  webhook firmado/poll recovery, descarga/MIME/audio/hash; generación de canary solo con spend fence y autorización.
- Reliability signals/logs: completion convergence, lost-ack recovery, provider latency/status, download/MIME failures,
  rate mismatch, duplicate settlement, rights ambiguity, `gated/not_promoted` y route binding drift.
- Production verification sequence: no producción durante la fase documental; después, staging/internal smoke → canary por ruta
  → readback de attempts/receipts/assets/fleet → promoción humana una ruta a la vez.

### Acceptance criteria additions

- [ ] Source of truth, contract surface, consumers, tenant boundary e idempotency están nombrados con paths/objetos reales.
- [ ] El namespace `blackforestlabs/...` vs `fal-ai/...` queda resuelto por evidencia autenticada y no por inferencia.
- [ ] No se exponen secretos, slugs privados, provider URLs ni raw errors al browser o a consumers externos.
- [ ] Pricing, rights, rate version, canary, settlement y rollback son evidencias por routeId.
- [ ] Keyframes y draft cache tienen contrato explícito; si requieren ADR-022 delta, esta queda aceptada antes de registrar disponibilidad.

## Scope

### Slice 0 — Discovery autenticado y decisión de contrato

- Consultar catálogo Fal, OpenAPI expandido y pricing de los once endpoints; capturar timestamp, endpoint ID,
  namespace, schema, defaults, límites, unidad/moneda, status y aliases.
- Resolver la discrepancia de namespace con una validación autenticada y un submit controlado que conserve
  `request_id`, `status_url`, `response_url`, `cancel_url` y cualquier follow-up real. No ejecutar generación de usuario ni canary productivo.
- Contrastar BFL API/EAP/Usage Policy con Fal Terms/AUP; documentar si el acceso de Globe permite internal-only,
  evaluación y eventual escala. Registrar digest/fecha de términos.
- Decidir cinco rutas estándar, drafts diferidos o drafts de dos fases. Si `keyframes`/`draft_cache` no caben
  en ADR-022 y contratos vigentes, aceptar la delta antes de tocar catálogo/adapter.

### Slice 1 — Contrato provider-neutral y validación de inputs

- Extender `RouteCreativeContractV1`/`CreativeProviderRequestV1` solo con semánticas verificadas: first/last,
  keyframes ordenados y posicionados a 24 fps, extend video y audio embedded opcional.
- Definir la representación de `duration: auto` o restringir inicialmente a 5–20 s explícitos; no convertir
  silenciosamente `auto` a un número inventado.
- Definir draft preview/cache/enhance como operación separada si se incluye; el cache debe ser server-only,
  content-addressed/retained, con lineage y expiración/recovery.
- Validar antes de estimate/prepare/reserve: PNG/JPEG/WebP para imágenes, MP4 <50 MB y <15 s para extend,
  1–10 keyframes, indices únicos y `frameIndex <= duration*24`, ratios/resolution/audio/safety declarados.

### Slice 2 — Fal adapter, queue y completion

- Extender `FalModelRoute`/routing por routeId y payload compiler discriminado para las cinco rutas; no usar
  un endpoint global ni enviar campos no presentes en el OpenAPI capturado.
- Añadir allowlist de producción, result schemas, output video MP4/seed y verificación de MIME/content type,
  descarga, hash, ingest, audio presence y retrieval.
- Integrar webhook/poll/recovery con firma/identity/replay guard existente; conservar request/response URLs reales.
- Añadir follow-up base solo con evidencia de submit; `FAL_FOLLOW_UP_BASES` no se puede completar por analogía.
- Mantener `x-app-fal-disable-fallbacks=true` y errores canónicos; no filtrar `draft_cache` ni URLs provider.

### Slice 3 — Catálogo, onboarding, rates y Producer projection

- Registrar cinco route IDs, constraints, slots, output contract, route bindings y endpoint IDs exactos server-side.
- Crear rate snapshots por ruta/resolution/duration y estimates/actuals/settlement idempotentes; incluir drafts
  solo si pricing y unidad están confirmados.
- Conectar readiness, rights, evaluation, canary y `globe.producer.fleet.list`; todas las rutas permanecen `gated`
  hasta convergencia de readiness + binding + promotion.
- Exponer al Producer solo descriptors browser-safe. Si keyframes temporizados o draft enhance requieren un
  editor/flujo nuevo que `TASK-1552` no puede consumir, registrar task UI dependiente y no ocultar el gap en la foundation.

### Slice 4 — Rights, evaluación, canary y promoción por ruta

- Crear golden briefs por modalidad y revisar visual, audio, keyframes, first/last, extend, draft continuity,
  MIME/codec/duration, asset governance, lineage, credits y recovery.
- Asegurar rights attestation para inputs, likeness, voice, BFL EAP/Fal terms y disclosure de procesamiento.
- Ejecutar canary con spend fence y un routeId cada vez; verificar completion terminal, output retained,
  playback/derivatives, receipt único, settlement exacto, route binding y fleet readback.
- Promover o rollback por ruta; un fallo de una modalidad no promueve las demás.

## Out of Scope

- Adapter directo, self-hosting o private weights de Black Forest Labs.
- Registrar una capability llamada `flux-3` solo por el nombre del modelo.
- Exponer FLUX 3 a clientes externos o convertir Early Access en disponibilidad comercial.
- Crear un flujo visual nuevo de keyframes/draft en React; el consumer UI pertenece a `TASK-1552` o a una task dependiente.
- Prometer video-to-video general, lip-sync, voz consistente, codec/FPS fijo o múltiples imágenes en image-to-video
  cuando el schema de la ruta solo declara un input.
- Integrar FLUX.2 Max/Edit, otros challengers Fal, nuevos proveedores o un segundo ledger.
- Cambiar `GLOBE_MODEL_FLEET_STATUS.md` a `available` durante el diseño o antes de la promoción real.

## Detailed Spec

### Route contract candidate

| Route ID | Capability candidate | Input contract | Output/gate |
|---|---|---|---|
| `ref/flux3/text-v1` | `video-generate` | prompt + duration/ratio/resolution/audio según route controls | video + seed; audio solo con MP4 evidence |
| `ref/flux3/image-v1` | `video-generate` | prompt + un image slot inicial | video + seed; PNG/JPEG/WebP validation |
| `ref/flux3/first-last-v1` | `video-frames` o extensión discriminada | prompt + ordered start/end image slots + explicit duration | first/last evidence; no mapear a un único reference |
| `ref/flux3/keyframes-v1` | `video-frames` extendido o nueva semántica | prompt + 1–10 keyed image slots + unique frame indices at 24 fps | keyframe placement evidence; ADR-022 gate |
| `ref/flux3/extend-v1` | `video-extend`/`video-edit` según contract owner | prompt + one materialized MP4 source | continuation evidence; <50 MB/<15 s input |

La elección definitiva de capability debe seguir el contrato semántico, no el nombre del endpoint. Si la
distinción entre first/last, keyed frames, extend y draft no es expresable sin ambigüedad, se debe detener el
registro de ruta y abrir la delta contractual correspondiente.

### Draft contract candidate

Un draft es una operación de preview que devuelve dos artefactos: video preview y opaque encrypted cache. El
cache debe recibir un ID interno, hash/retención y relación al governed run; el usuario no puede editarlo,
reconstruirlo ni enviarlo desde browser. `draft-enhance` debe aceptar únicamente el cache autorizado y producir
un nuevo output child con lineage al preview. Si no se puede garantizar esta cadena bajo los stores existentes,
los drafts se dejan fuera del primer release y se registra el follow-up antes de promocionar standard routes.

### Identity and provider boundary

El endpoint Fal solo se resuelve en el servidor desde route binding. El catálogo browser-safe puede mostrar
`FLUX 3 Video` y la semántica de la ruta, pero no `blackforestlabs/...`, `fal-ai/...`, request URLs, pricing
vendor raw ni headers. La fuente de verdad de disponibilidad es la intersección de route readiness, production
binding y fleet reader; el catálogo por sí solo no habilita ejecución.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 (discovery/namespace/terms) MUST cerrar antes de Slice 1.
- Slice 1 (contract/preflight) MUST cerrar antes de Slice 2.
- Slice 2 (adapter/completion) MUST cerrar antes de Slice 3.
- Slice 3 (catalog/rates/projection) MUST cerrar antes de Slice 4.
- Slice 4 promueve una ruta por vez; drafts no pueden habilitarse por herencia de una ruta standard.
- Rights/evaluation evidence puede prepararse en paralelo después de Slice 1, pero no puede aprobar promotion
  antes del readback de Slice 2 y onboarding de Slice 3.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| Namespace de catálogo y queue divergen | Fal adapter/completion | high | discovery autenticado + submit controlado + no hardcode hasta evidence | route binding mismatch, follow-up 404, lost ack |
| BFL Early Access no autoriza producción/escala | rights/promotion | high | internal-only, Legal attestation, flag OFF y no external rollout | rights policy missing/expired, promotion denied |
| Keyframes/draft cache no caben en contrato actual | contracts/Producer | high | ADR-022 delta, versionado, follow-up explícito, fail closed | unsupported input/control, draft lineage missing |
| URL Fal expira antes de ingest | retrieval/asset governance | medium | download inmediato, poll recovery, hash/retained output | output URL expired, retrieval failure |
| Audio declarado pero ausente o variable | playback/output | medium | ffprobe/MIME evidence por ruta/resolution, no proyectar `with-audio` sin pista | audio presence mismatch |
| Pricing o unidad cambia | credits/settlement | medium | pricing API snapshot, estimate/actual/rate version, spend fence | rate mismatch, settlement discrepancy |
| Provider error/moderation genera cobro incierto | credits/provider | medium | preflight, canonical error, no retry ciego, reconcile por request_id | duplicate charge, unresolved hold |
| Una ruta se promueve con binding/readiness divergentes | fleet/promotion | medium | route-level saga, readback terminal, TASK-1641 gate | `promoted` + binding off, fleet drift |

### Feature flags / cutover

- No se habilita una ruta por default al merge. El default permanece `gated`/binding disabled.
- El cutover se hace por route binding y readiness de la plataforma existente, con internal-only entitlement.
- Rollback: apagar el binding y devolver la ruta a `gated/not_promoted`; no borrar evidencia ni outputs.
- Drafts, si se integran, requieren flag/operación independiente y no heredan el flag de standard route.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---:|---|
| 0 | No hay runtime change; retirar decision/proposal o conservar evidence de discovery sin activar rutas | inmediato | sí |
| 1 | Desactivar la nueva versión de contrato/route descriptors; mantener rutas existentes en dual-read o sin registro | <15 min | sí, salvo migration additive |
| 2 | Deshabilitar endpoint bindings/allowlist entries y detener submit; completar attempts ya iniciados por recovery | <10 min | sí |
| 3 | Revertir readiness/binding/rate de FLUX 3 a `gated`; no tocar ledger, lineage ni receipts | <10 min | sí |
| 4 | Ejecutar rollback de promoción por routeId y preservar canary/evidence/asset para auditoría | según saga | parcial; outputs ya generados se conservan |

### Production verification sequence

1. Revalidar catálogo/OpenAPI/pricing Fal y términos BFL/Fal; detenerse ante cambios de schema, namespace o rights.
2. Ejecutar checks locales de contracts/adapter/allowlist/result schemas y build simétrico de API, worker y studio.
3. Deploy de staging/internal-only con bindings apagados; verificar que las rutas no aparecen `available`.
4. Ejecutar submit controlado autorizado por una ruta, capturar URLs reales, webhook firmado/poll recovery y descarga/ingest.
5. Ejecutar golden brief/canary con spend fence; verificar output, audio, lineage, asset governance, receipt y settlement.
6. Promover una ruta a la vez y volver a leer readiness, binding, fleet y completion antes de continuar.
7. Mantener monitor de señales durante la ventana acordada; revertir a `gated` ante cualquier divergencia.

### Out-of-band coordination required

- Acceso Fal autorizado para model discovery y pricing, con límite de gasto y cuenta de canary.
- Confirmación Legal/rights sobre Fal commercial, BFL Early Access, input/output processing, likeness/voice y disclosure.
- Operador aprueba cualquier generación real; no hay generación durante la creación documental de esta task.
- Configuración de `GLOBE_FAL_API_KEY`, JWKS/webhook y despliegue simétrico de API/worker/studio, sin secretos en Greenhouse.

## Acceptance Criteria

- [ ] Existe evidencia autenticada y fechada para los once endpoints Fal, con OpenAPI expandido, pricing/unidad y namespace operativo resuelto.
- [ ] Las cinco rutas estándar tienen route IDs estables, bindings exactos, payloads discriminados, preflight, allowlist, result schema, ingest y recovery.
- [ ] First/last, keyframes, extend y audio no se reducen a prompt-only: slots, orden, índices, límites y output evidence están en el contrato.
- [ ] `draft_cache` tiene decisión y contrato de dos fases; si queda fuera, existe follow-up explícito y no hay falsa paridad.
- [ ] No se expone Fal key, endpoint ID, slug, URL temporal, raw error o pricing vendor al browser/consumer externo.
- [ ] Rates, estimate, actual, receipt y settlement son idempotentes y trazables por routeId/endpoint/version.
- [ ] Rights attestation incluye Fal/BFL terms, Early Access, AUP, consentimiento y provenance; expiración o cambio de terms bloquea promotion.
- [ ] Golden briefs y evaluación cubren las cinco rutas; el audio se afirma solo con evidencia de media real.
- [ ] Cada ruta pasa canary con spend fence, readback terminal y rollback probado; `globe.producer.fleet.list` permanece `gated` hasta entonces.
- [ ] Producer/API/SDK/MCP/CLI consumen el mismo route contract y no existe lógica específica de FLUX 3 en React.
- [ ] No se altera la disponibilidad de modelos existentes ni se crea un segundo ledger, adapter paralelo o fallback silencioso.

## Verification

- Discovery autenticado de Fal: model catalog, OpenAPI, pricing y controlled submit con evidencia redacted.
- Tests de contracts/catalog/provider payload/compiler/result driver/allowlist/fleet/promotion.
- `pnpm check`, build y checks focales en `../efeonce-globe`, con API/worker/studio en el mismo estado.
- Smoke de webhook firmado, poll recovery, lost ack, expired URL handling, MIME/audio validation, hash/ingest y lineage.
- Read-only verification de readiness, binding, rate version, rights, receipts, settlement, asset governance y fleet reader.
- Canary por routeId con spend fence, golden briefs y revisión humana; no usar mocks como evidencia final de proveedor.
- `pnpm task:lint --active`, `pnpm docs:closure-check` y `pnpm docs:context-check:strict` en Greenhouse al cerrar la implementación documental correspondiente.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real y el archivo vive en la carpeta correcta.
- [ ] `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md` quedaron sincronizados.
- [ ] `Handoff.md` quedó actualizado con estado runtime honesto, evidence y siguiente paso.
- [ ] `changelog.md` quedó actualizado si cambió comportamiento, estructura o protocolo visible.
- [ ] Se ejecutó chequeo de impacto cruzado sobre `TASK-1552`, `TASK-1573`, `TASK-1578`, `TASK-1579`, `TASK-1633` y `TASK-1641`.
- [ ] `GLOBE_MODEL_FLEET_STATUS.md` no declara `available` sin promotion real.
- [ ] El commit incluye solo la documentación/implementación de esta task y su registro, sin push ni deploy automático.

## Follow-ups

- Task UI/UX para keyframes editor y draft preview → enhance si `TASK-1552` no puede consumir el descriptor existente.
- Delta de ADR-022 y/o contrato versionado para keyed frames, `duration: auto` y `draft_cache` si Slice 0 lo requiere.
- Legal/rights follow-up para exposición externa cuando BFL abandone Early Access o exista autorización escrita aplicable.
- Evaluación de adapter BFL directo solo si se solicita acceso contractual; no es parte de esta integración Fal.

## Open Questions

- ¿Qué namespace devuelve el submit autenticado que debe persistirse como `endpointId` de Globe?
- ¿El primer corte incluye drafts y `draft-enhance`, o se conserva como operación posterior con retención propia?
- ¿El contrato de salida de Fal observado en runtime confirma MP4, 24 fps, codec y presencia de audio por resolución?
- ¿Se permite `duration: auto` en el estimate/Producer o se limita inicialmente a duraciones explícitas?
- ¿Qué atestación de BFL EAP y Fal terms autoriza el uso de inputs sensibles o material de clientes?
