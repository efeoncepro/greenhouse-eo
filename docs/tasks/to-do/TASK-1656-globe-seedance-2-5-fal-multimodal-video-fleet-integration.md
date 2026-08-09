# TASK-1656 — Globe Seedance 2.5 Fal Multimodal Video Fleet Integration

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
- Status real: `Diseño documental; Fal provider-supported / Globe gated`
- Rank: `TBD`
- Domain: `platform|producer|video`
- Blocked by: `none` — existen gates y dependencias de ejecución, pero no bloqueo administrativo para el discovery
- Branch: `Greenhouse develop; Globe main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Integrar en la flota y el Producer de Globe las tres superficies activas de Seedance 2.5 que Fal expone:
text-to-video, image-to-video y reference-to-video. La task cubre el contrato provider-neutral, slots y roles
multimodales, adapter Fal, queue/completion, ingest, pricing, rights, evaluación, canary, settlement, promotion
y fleet projection; la disponibilidad empieza y permanece `gated` hasta que cada ruta cierre sus propios gates.

## Why This Task Exists

Fal Model Search y los OpenAPI vivos exponen tres endpoints ejecutables de Seedance 2.5, pero Globe no tiene
identidad de ruta, binding, payload compiler, política de inputs, rate snapshot, rights evidence, evaluación,
canary ni promoción para ellos. El runtime existente sí posee un adapter Fal, queue, ingest, completion,
catálogo, fleet reader, credits, rights y promotion que pueden extenderse.

La superficie de producto anuncia más capacidades que el contrato API verificable. La task debe implementar sólo
lo que Fal expone de forma estructurada: prompt, imagen inicial/final, referencias de imagen/video/audio, audio
generado, resolución, duración, ratio y `end_user_id`. No puede convertir claims de 1080p/4K, tres minutos,
multi-shot, cámara, edición localizada, storyboard o continuidad en campos API inventados.

## Architecture Alignment

Revisar y respetar:

- [`EFEONCE_GLOBE_MODEL_ROUTE_CARDS_DECISION_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_MODEL_ROUTE_CARDS_DECISION_V1.md)
- [`EFEONCE_GLOBE_ROUTE_BASED_MODEL_RESOLUTION_DECISION_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_ROUTE_BASED_MODEL_RESOLUTION_DECISION_V1.md)
- [`EFEONCE_GLOBE_ROUTE_CREATIVE_CONTRACT_DECISION_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_ROUTE_CREATIVE_CONTRACT_DECISION_V1.md) — ADR-022
- [`EFEONCE_GLOBE_PROVIDER_COMPLETION_CAPTURE_DECISION_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_PROVIDER_COMPLETION_CAPTURE_DECISION_V1.md) — ADR-021
- [`EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md)
- [`EFEONCE_GLOBE_MODEL_LAB_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_MODEL_LAB_V1.md)
- [`EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md)
- [`SEEDANCE_2_5_VIDEO_ROUTE_CARD_V1.json`](../../architecture/creative-studio/model-fleet/routes/SEEDANCE_2_5_VIDEO_ROUTE_CARD_V1.json)
- [`SEEDANCE_2_5_FAL_API_INVENTORY_V1.md`](../../architecture/creative-studio/model-fleet/SEEDANCE_2_5_FAL_API_INVENTORY_V1.md)
- [`GLOBE_RUNTIME_HANDOFF.md`](../../operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md)

Reglas obligatorias:

- Fal es el boundary de ejecución de esta task. No crear un SDK ni adapter paralelo para BytePlus/ModelArk.
- La identidad durable es `{routeId, capability, provider, model, version, endpointId, region, completionDriver}`.
- El browser, MCP externo y logs públicos nunca reciben endpoint IDs privados, URLs Fal, payloads raw, pricing vendor
  ni secretos.
- Registrar y resolver por `routeId`; nunca por nombre de modelo, alias `fal-ai/...`, título de schema o metadata
  `x-fal-metadata.endpointId`.
- Seguir las `status_url`, `response_url` y `cancel_url` retornadas por Fal; no reconstruir URLs por analogía.
- Descargar, verificar MIME/bytes/metadatos, hashear e ingerir el resultado en Globe; una URL temporal Fal nunca es
  autoridad durable.
- La UI consume commands/readers/projections server-side. No construye cuerpos Fal, calcula costos ni decide
  capabilities.
- Una ruta sólo puede quedar `available` cuando readiness, binding, rate, rights, evaluación, canary, settlement,
  promotion y readback terminal convergen.

## Normative Docs

- [`TASK_PROCESS.md`](../TASK_PROCESS.md)
- [`TASK_BACKEND_DATA_ADDENDUM.md`](../TASK_BACKEND_DATA_ADDENDUM.md)
- [`MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`](../../operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md)
- [`GREENHOUSE_AI_CREATIVE_DATA_GOVERNANCE_DECISION_V1.md`](../../architecture/GREENHOUSE_AI_CREATIVE_DATA_GOVERNANCE_DECISION_V1.md)
- [`TASK-1553-globe-extensible-multi-model-provider-catalog.md`](../in-progress/TASK-1553-globe-extensible-multi-model-provider-catalog.md)
- [`TASK-1633-globe-producer-operation-input-control-contract.md`](../in-progress/TASK-1633-globe-producer-operation-input-control-contract.md)
- [`TASK-1554-globe-producer-fleet-availability-projection.md`](../complete/TASK-1554-globe-producer-fleet-availability-projection.md)
- [`TASK-1578-globe-model-onboarding-credit-rate-promotion.md`](../to-do/TASK-1578-globe-model-onboarding-credit-rate-promotion.md)
- [`TASK-1579-globe-credit-rating-settlement-fallback-policy.md`](../in-progress/TASK-1579-globe-credit-rating-settlement-fallback-policy.md)
- [`TASK-1535-globe-commercial-promotion-attestation-lane.md`](../complete/TASK-1535-globe-commercial-promotion-attestation-lane.md)
- [`TASK-1469-globe-governed-run-lifecycle-submission-fence.md`](../in-progress/TASK-1469-globe-governed-run-lifecycle-submission-fence.md)
- [`TASK-1641-globe-promotion-canary-operability-and-terminal-convergence.md`](../complete/TASK-1641-globe-promotion-canary-operability-and-terminal-convergence.md)

Fuentes externas que deben revalidarse al ejecutar:

- [Fal Model Search](https://fal.ai/docs/platform-apis/v1/models), [T2V](https://fal.ai/models/bytedance/seedance-2.5/text-to-video),
  [I2V](https://fal.ai/models/bytedance/seedance-2.5/image-to-video) y [R2V](https://fal.ai/models/bytedance/seedance-2.5/reference-to-video).
- [Fal Pricing API](https://fal.ai/docs/platform-apis/v1/models/pricing), [Queue](https://fal.ai/docs/documentation/model-apis/inference/queue),
  [Webhooks](https://fal.ai/docs/documentation/model-apis/inference/webhooks), [media expiration](https://fal.ai/docs/documentation/model-apis/media-expiration),
  [ACL](https://fal.ai/docs/documentation/model-apis/file-access-controls) y [storage](https://fal.ai/docs/api-reference/platform-apis/for-storage).
- [Seedance 2.5 product surface](https://ark.volcengine.com/promotion?modelName=seedance-2-5) y [ModelArk video API](https://docs.byteplus.com/en/docs/modelark/1520757).

## Dependencies & Impact

### Depends on

- `TASK-1553` — catálogo multi-modelo y resolución por ruta; no duplicar route resolution.
- `TASK-1633` — operación, slots/roles, controles, mecanismo de soporte y output contract; R2V requiere decisión
  explícita de capability y no puede heredarse por alias de motion-control.
- `TASK-1554` — projection gobernada de availability; la task no puede declarar disponibilidad por edición manual.
- `TASK-1578` — onboarding, rate, binding, estimate, canary y promotion.
- `TASK-1579` — credits, rating, settlement y fallback policy.
- `TASK-1535` — rights attestation y promoción comercial.
- `TASK-1469` y `TASK-1641` — lifecycle/completion y canary post-promoción operable.
- `TASK-1635` y `TASK-1636` — loop local de generación real y simetría del bundle desplegable; son gates operativos,
  no autorización para saltar el diseño.
- `TASK-1552` — consumer del Composer; no se modifica su UI en esta task.

### Blocks / Impacts

- `TASK-1552` — recibirá los descriptors y capabilities sin slugs ni caps hardcodeados.
- `TASK-1504` — expansión de capabilities del Producer y regresiones Seedance/Omni.
- `TASK-1573` — sólo para mantener separadas las semánticas de edit/continuation; Seedance 2.5 no se presenta como
  una operación edit/extend hasta que Fal exponga ese contrato.
- `TASK-1576` — la salida con audio generado no sustituye la flota de audio ni crea stems.
- `TASK-1553`, `TASK-1578` y `TASK-1579` — se extienden, no se reemplazan, sus seams compartidos.

### Files owned

Greenhouse:

- Esta task.
- [`SEEDANCE_2_5_FAL_API_INVENTORY_V1.md`](../../architecture/creative-studio/model-fleet/SEEDANCE_2_5_FAL_API_INVENTORY_V1.md).
- [`SEEDANCE_2_5_VIDEO_ROUTE_CARD_V1.json`](../../architecture/creative-studio/model-fleet/routes/SEEDANCE_2_5_VIDEO_ROUTE_CARD_V1.json).
- Registry, ledger, skills y documentación de Globe que deban reflejar una transición real de estado.

Globe (`/Users/jreye/Documents/efeonce-globe`):

- `packages/contracts/src/{producer-catalog.ts,index.ts}` — slots, policies, intent y output metadata browser-safe.
- `packages/provider-contract/src/index.ts` — input plan, media metadata y provider request/output si aplica.
- `packages/domain/src/{producer-catalog.ts,producer-fleet.ts,model-lab.ts}` — rutas, readiness y evidence.
- `apps/creative-runner/src/{fal-adapter.ts,governed-provider-runtime.ts,provider-webhooks.ts,production-route-compiler.ts,production-result-drivers.ts}`.
- `apps/studio-web/src/{governed-production-composition.ts,producer-controller.ts}` — allowlist y consumer server-side.
- `apps/studio-client/src/data/reference-cap.ts` sólo si el contrato de catálogo demuestra que el consumer actual
  no puede representar los límites; la UI visual continúa siendo de `TASK-1552`.
- Fixtures, rate bindings, rights, evaluation, canary, promotion y runtime evidence de las tres rutas.

## Current Repo State

### Already exists

- Fal expone tres modelos activos con OpenAPI específico: T2V, I2V y R2V.
- Greenhouse contiene el inventario exhaustivo y route card gated de Seedance 2.5.
- Globe ya tiene adapter Fal, upload privado, queue/status/result/cancel, webhook/poll, ingest content-addressed,
  route catalog, fleet reader, rates, rights, evaluation, canary y promotion reutilizables.
- Globe tiene Seedance 2.0 con rutas distintas; su existencia no habilita 2.5 ni puede actuar como fallback implícito.

### Gap

- No existen route bindings, payload compiler, allowlist, result schema, usage driver ni evaluación 2.5 en Globe.
- El contrato actual no representa de forma suficiente cardinalidad por media, límites combinados, duración/FPS/
  dimensiones de inputs, reglas condicionales de audio ni roles/ordinales preservados.
- La UI tiene caps hardcodeados y no puede ser la autoridad para 30 imágenes/10 videos/10 audios/50 total.
- El runtime contiene una aserción legacy del header plural `x-app-fal-disable-fallbacks`; Fal documenta el singular
  `x-app-fal-disable-fallback`.
- No existe rate policy 2.5 que considere resolución, duración de salida y duración de videos de referencia.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-globe/packages/contracts`, `packages/domain`, `packages/provider-contract`, `apps/creative-runner`, `apps/studio-web` y `apps/studio-client`; control documental en `greenhouse-eo/docs`
- Future candidate home: `remain-shared`
- Boundary: route catalog/creative contract, input policy/plan, Fal adapter y compiler server-side, result/completion driver, rate/rights/evaluation readers y fleet projection; Producer UI sólo consume DTOs browser-safe
- Server/browser split: Fal key, endpoint IDs, provider payloads, uploads, queue URLs, raw errors, pricing vendor, rights digests, settlement y media inspection permanecen server-side; browser recibe descriptor, availability, estimate y estados sanitizados
- Build impact: reutilizar el transporte y dependencias existentes; no añadir SDK paralelo ni filesystem input nuevo; cualquier paquete nuevo requiere justificación de runtime y lockfile
- Extraction blocker: tenancy/auth, transactions de credits/rights/settlement, route resolution, Fal secret, webhook/completion y asset lineage compartidos impiden separar el adapter como deployment independiente

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: route catalog/bindings, Fal allowlist, model readiness, rates/receipts, rights policy,
  provider attempts/completion, asset lineage y `globe.producer.fleet.list`
- Consumidores afectados: Producer/API/SDK/MCP/CLI, worker, evaluation/canary, settlement y operators
- Runtime target: Globe API/worker/studio, Fal queue/webhook, staging y producción sólo después de gates

### Contract surface

- Contratos existentes a respetar: `RouteCreativeContractV1`, `RouteInputSlotV1`, `RouteInputAssignmentV1`,
  `RouteCreativeIntentV1`, `RouteReferencePolicyV1`, `ResolvedInputV1`, `FalModelRoute`, transport Fal,
  result driver, `ProductionEndpointAllowlistEntryV1`, readiness/binding/rate readers y ADR-021/022.
- Contratos nuevos o modificados: política de inputs por media/slot, plan de roles→ordinales→payload, metadata
  multimedia pre-spend, usage/rate drivers y evidence de output seed/audio.
- Backward compatibility: `gated` y aditiva para rutas existentes; toda modificación compartida debe ser versionada
  y usar dual-read cuando el ADR-022 lo exija.
- Full API parity: `estimate → prepare → execute → reconcile`, fleet reader y route contract son la autoridad; no
  crear endpoint, click-handler, MCP tool o cliente browser específico de Fal.

### Data model and invariants

- Entidades/readers afectados: route catalog/bindings, readiness, rate snapshots/receipts, rights policy, provider
  attempts, completion events, asset lineage/retrieval y fleet availability.
- Invariantes:
  - Los endpoint IDs ejecutables son exactamente `bytedance/seedance-2.5/text-to-video`,
    `bytedance/seedance-2.5/image-to-video` y `bytedance/seedance-2.5/reference-to-video`.
  - La validación completa ocurre antes de estimate/reserve/submit; no se truncan referencias para satisfacer caps.
  - T2V requiere prompt; I2V requiere prompt + `image_url` y puede llevar `end_image_url`; R2V usa arrays separados
    de imágenes, videos y audios, con máximo total 50 y audio condicionado a imagen o video.
  - `duration` se conserva como enum string `auto|"4"..."30"`; `resolution` sólo `480p|720p`.
  - El output `seed` se conserva como metadata de respuesta; no se ofrece seed de entrada ni reproducibilidad garantizada.
  - La salida Fal se descarga, verifica, hashea e ingiere; la URL externa no es autoridad durable.
  - Webhook, polling y recovery convergen de manera idempotente por governed-run key y `request_id` Fal.
  - Fallback está desactivado con el header singular oficial; una respuesta de Seedance 2.0 es un error de identidad.
  - Readiness, binding, rate, rights, canary, promotion y settlement deben converger por `routeId`.
- Tenant/space boundary: derivar `organization`, `space`, `member` y session desde el contexto confiable de Globe;
  `end_user_id` nunca se acepta arbitrariamente desde el navegador.
- Idempotency/concurrency: conservar idempotency key del run y request IDs de Fal; webhook, poll, cancel, recovery,
  ingest y settlement deben ser at-least-once seguros y no duplicar cobro/asset.
- Audit/outbox/history: registrar route/version/endpoint, input/output hashes y metadatos, pricing snapshot, rights
  digest, completion evidence, provider errors sanitizados y señales de promotion/rollback en los stores existentes.

### Migration, backfill and rollout

- Migration posture: `none` si los contratos actuales alcanzan; `additive/versioned` si se necesita persistir media
  metadata, usage drivers o evidence nueva. No hay backfill ciego ni migración destructiva.
- Default state: `gated`; no activar una ruta por aparecer en Model Search.
- Backfill plan: `none`; cualquier backfill de metadata existente requiere dry-run, allowlist, owner y rollback propio.
- Rollback path: apagar binding/readiness, devolver `gated`, conservar attempts/receipts/lineage y no borrar evidencia
  necesaria para reconciliar un webhook perdido.
- External coordination: Fal API key y límites, pricing account, webhook/JWKS, terms/rights, operator approval de
  canary y despliegue simétrico API/worker/studio en Globe.

### Security and access

- Auth/access gate: trusted Globe context + entitlements Producer; `GLOBE_FAL_API_KEY` server-only; firma ED25519,
  JWKS, timestamp, `expectedUserId` y replay guard en webhooks.
- Sensitive data posture: referencias creativas, likeness/voz, URLs provider, payloads, hashes, lifecycle y secretos;
  nunca imprimir raw body, URL temporal ni key.
- Error contract: códigos canónicos sanitizados para invalid input, content policy, unavailable, timeout, cancel,
  lost ack, download/validation, retrieval y settlement uncertainty.
- Abuse/rate-limit posture: spend fence, preflight multimedia, límites por workspace, concurrency/circuit breaker,
  `X-Fal-No-Retry`/disable-fallback cuando corresponda, cancelación y recovery gobernados.

### Runtime evidence

- Local checks: tests focales de contract, input policy, role plan, payload compiler, adapter, allowlist, result
  driver, catalog/fleet y route resolution; build/test del repo Globe.
- DB/runtime checks: readers de readiness/binding/rate/rights, receipts, lineage, completion y promotion convergence.
- Integration checks: Model Search/OpenAPI/pricing revalidation, submit controlado, seguimiento de URLs retornadas,
  webhook firmado, poll recovery, cancel, descarga/MIME/dimensiones/duración/FPS/audio/hash.
- Reliability signals: completion convergence, lost-ack recovery, provider status/latency, input validation,
  download failure, fallback identity mismatch, duplicate settlement, rights ambiguity, binding drift y gated reason.
- Production verification: staging/internal smoke → canary por ruta → readback de attempt/receipt/asset/fleet →
  promotion humana individual; stop inmediato ante cualquier divergencia.

### Acceptance criteria additions

- [ ] Source of truth, consumers, tenant boundary, idempotency y rollback están nombrados con paths/objetos reales.
- [ ] Full API parity queda cubierta por primitive/readers/commands, con browser/MCP sin lógica Fal.
- [ ] Los tres endpoint IDs `bytedance/...` se resuelven por route binding; los alias `fal-ai/...` y metadata interna
  no se ejecutan.
- [ ] T2V, I2V y R2V validan sus campos exactos, defaults, enums, cardinalidades, tamaños, tipos MIME, condiciones
  de audio y citas de referencias sin truncar inputs.
- [ ] `end_image_url`, `image_urls`, `video_urls`, `audio_urls`, `generate_audio` y `end_user_id` tienen mapping y
  tests route-specific; `seed` sólo aparece como output metadata.
- [ ] Output video, MIME, bytes, dimensiones, duración, audio, seed, hash y lineage quedan verificados e ingeridos.
- [ ] Rate/estimate/reserve/settle usa snapshot inmutable y drivers de duración/resolución/input-video; no copia
  créditos de Seedance 2.0 ni crea segundo ledger.
- [ ] Rights attestation cubre provider/model/version, términos, retención, inputs, audio, voz, likeness y delivery.
- [ ] Queue, status, result, cancel, webhook y poll recovery siguen URLs devueltas, verifican firma/identidad y son
  idempotentes; no se filtran raw errors ni URLs Fal.
- [ ] `x-app-fal-disable-fallback` singular está probado; una ruta 2.0 nunca satisface un request 2.5.
- [ ] R2V tiene capability explícita o delta ADR-022 aceptada; no se aliasa a `video-motion-control` por comodidad.
- [ ] Todas las rutas permanecen `gated` hasta readiness, binding, rate, rights, evaluation, canary, settlement,
  promotion y fleet readback completos.
- [ ] Seedance 2.5 no se anuncia con 4K/1080p/3 minutos/masks/storyboard/shots/camera structured/stems/stream/realtime
  ni BytePlus 2.5 directo sin evidencia nueva.
- [ ] `TASK-1552` puede consumir descriptors browser-safe sin caps, slugs, provider URLs, pricing vendor o lógica Fal en UI.

## Scope

### Slice 0 — Revalidación upstream, identidad y decisión de capability

- Revalidar Model Search, OpenAPI por endpoint, `llms.txt`, pricing, queue/webhook/storage y términos; guardar
  timestamp, digest y evidencia en el route card/inventario cuando cambie.
- Confirmar las tres identidades `bytedance/...`, descartar alias stub `fal-ai/...` y no derivar ejecución de la
  expansión OpenAPI que pueda mostrar namespace interno distinto.
- Resolver con ADR-022/TASK-1633 la capability de I2V y R2V, especialmente si R2V requiere `video-reference-to-video`.
- Confirmar que la sintaxis de citas (`@Image1` vs vistas visuales `[Image1]`) funciona en submit controlado antes de
  habilitar la ruta; si no se puede demostrar, dejar el gate cerrado.

### Slice 1 — Contrato provider-neutral, roles e input policy

- Extender contrato/policy de ruta para cardinalidad, bytes, MIME, duración, FPS, dimensiones, ratio, total combinado
  y `requiresAny`/condiciones de audio, preservando role y ordinal.
- Definir plan `creativeIntent → input roles/ordinals → provider fields → prompt citations` sin perder orden ni
  mezclar modalidades.
- Añadir inspector multimedia pre-spend o metadata equivalente a `ResolvedInputV1`; no inferir duración/FPS/dimensiones
  desde hash o nombre de archivo.
- Representar controles exactos: resolución 480/720, duración string auto/4–30, ratio por ruta, audio generated y
  end user server-side. No modelar campos no presentes en OpenAPI.

### Slice 2 — Fal adapter, queue, webhook, cancel y result ingest

- Añadir bindings route-first y payload compiler para T2V, I2V y R2V sobre el transporte Fal existente.
- Implementar upload privado de inputs, follow-up por URLs retornadas, status/result/cancel, webhook firmado y polling
  de recuperación; corregir el header singular de fallback.
- Validar y persistir output video/MP4, MIME, bytes, duración, dimensiones, audio, seed, hash, lineage y retrieval.
- Normalizar errores sin raw payload y probar respuestas de validación, content policy, timeout, cancel, download,
  runner failure y fallback identity mismatch.

### Slice 3 — Catálogo, rates, credits, rights y fleet projection

- Registrar route IDs, endpoint IDs, slots, constraints, output contract, route binding y result schema por ruta.
- Crear rate snapshot y usage driver con resolución/duración de output y duración de videos de referencia; comparar
  estimate/provider usage sin publicar precio vendor ni crear segundo ledger.
- Integrar rights attestation para términos Fal, retención, inputs, audio/voz/likeness, delivery y uso comercial.
- Conectar readiness, evaluation, canary, settlement, promotion y `globe.producer.fleet.list`; todas las rutas parten gated.

### Slice 4 — Evaluación, canary, promoción y handoff al consumer

- Crear fixtures/golden briefs para T2V, I2V first/end y R2V con combinaciones de imagen/video/audio, límites y citas.
- Verificar calidad visual, audio embebido, duración, dimensiones, MIME, lineage, recovery, credits, receipt único y
  no-fallback por ruta.
- Ejecutar canary con spend fence y una ruta a la vez; promover o revertir individualmente y comprobar fleet readback.
- Entregar descriptors browser-safe a `TASK-1552`; si el Composer necesita un flujo nuevo para roles multimodales,
  abrir task UI dependiente con su propio contrato, wireframe/flow/GVC y no esconderlo en esta foundation.

## Out of Scope

- Adapter directo, SDK, self-hosting o private weights de BytePlus/ModelArk.
- Prometer o habilitar 4K, 1080p, tres minutos, seed de entrada, reproducibilidad garantizada, máscaras, edición
  localizada, storyboard JSON, shot list, cámara estructurada, keyframes intermedios, stems, audio separado,
  idiomas como enum, streaming, realtime, `style_urls` o `/health` como contrato.
- Crear una cuarta ruta o tratar el alias `fal-ai/seedance-2.5/*` como endpoint ejecutable.
- Crear UI específica, caps de referencias, composer nuevo, wireframe, flow, motion o GVC; pertenece a `TASK-1552`
  o a una task dependiente.
- Cambiar las rutas Seedance 2.0 existentes, su fallback global o su pricing salvo regresión demostrada por esta task.
- Exponer la flota a clientes externos o convertir `provider-supported` en `commercially available` sin derechos,
  entitlements y promotion completos.
- Crear un segundo ledger de credits, bypass de rights, migration destructiva o backfill sin una task/ADR explícita.

## Detailed Spec

### Route contract candidates

| Route ID | Capability candidate | Endpoint Fal | Input principal |
|---|---|---|---|
| `ref/motion/seedance-25-t2v-v1` | `video-generate` | `bytedance/seedance-2.5/text-to-video` | `prompt` + controls |
| `ref/video/seedance-25-i2v-v1` | `video-frames` o capability versionada | `bytedance/seedance-2.5/image-to-video` | `prompt` + `image_url` + `end_image_url` opcional |
| `ref/video/seedance-25-r2v-v1` | `video-reference-to-video` propuesta | `bytedance/seedance-2.5/reference-to-video` | `prompt` + arrays image/video/audio |

La decisión final de capability se toma por semántica del contrato y evidencia de `TASK-1633`, no por conveniencia
del nombre. R2V no puede heredar `video-motion-control` si esa capability implica un video de motion source o un
límite de cuatro referencias.

### Provider input contracts

T2V:

```json
{
  "prompt": "string",
  "resolution": "480p|720p",
  "duration": "auto|4..30",
  "aspect_ratio": "auto|21:9|16:9|4:3|1:1|3:4|9:16",
  "generate_audio": true,
  "end_user_id": "server-derived-or-null"
}
```

I2V añade `image_url` requerido y `end_image_url` opcional; acepta JPEG/PNG/WebP hasta 30 MB y fuerza
`aspect_ratio: "auto"`. No acepta arrays ni keyframes intermedios.

R2V usa `image_urls[]` hasta 30, `video_urls[]` hasta 10 y `audio_urls[]` hasta 10; total combinado máximo 50.
Las imágenes admiten JPG/PNG/WebP/BMP/TIFF/GIF/HEIC/HEIF y 30 MB cada una. Los videos son MP4/MOV, 1.8–30.2 s,
hasta 200 MB, combinados hasta 30.2 s, 300–6000 px por lado, ratio 0.4–2.5 y 24–60 FPS. Los audios son MP3/WAV,
1.8–30.2 s, combinados hasta 30.2 s y 15 MB cada uno; exigen al menos una imagen o video.

Los tres outputs contienen `video.url` y `seed`; `content_type`, `file_name` y `file_size` pueden ser nulos.
Globe debe conservar bytes, MIME real, dimensiones, duración, pista de audio, seed, hash, lineage y asset privado.

### Pricing and usage

La fórmula publicada por Fal es volátil y no equivale a créditos Globe. El rate adapter debe conservar un snapshot
inmutable y declarar sus drivers. Como evidencia de provider, T2V/I2V usan aproximadamente:

```text
tokens = output_height * output_width * output_duration_seconds * 24 / 1024
```

R2V incorpora duración de video de referencia y un factor documentado por Fal. `generate_audio` no cambia el precio
publicado. La implementación debe comprobar `pricing`, `estimate`, `usage` y `billing-events` cuando la cuenta lo
permita, reconciliar con el receipt Globe y nunca mostrar pricing vendor raw al cliente.

### Transport and completion

La ejecución de producción usa queue y server-side Fal key. El submit debe conservar `request_id`,
`gateway_request_id`, `response_url`, `status_url`, `cancel_url` y queue position cuando estén presentes. El runtime
sigue las URLs retornadas. Webhooks validan request ID, user ID, timestamp ±300 s, firma ED25519/JWKS, dedupe y
replay; polling/recovery cubre ack perdido. Streaming SSE genérico, `/stream` y realtime/WebSocket no se habilitan
porque no existe evidencia específica de Seedance 2.5.

### Provider/platform surfaces

El discovery puede consultar Model Search/OpenAPI, pricing, estimate, usage, billing events, analytics,
requests-by-endpoint y delete payloads. Estas APIs son evidencia operativa y no reemplazan el catálogo, rights,
settlement ni fleet reader de Globe. Storage Fal puede servir para URLs efímeras de inputs, pero Globe debe mantener
ingest privado, ACL y lifecycle propios; no depender de defaults de retención del provider.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 (identidad, schema, terms y capability) MUST cerrar antes de Slice 1.
- Slice 1 (contract, roles, policy y preflight) MUST cerrar antes de cualquier submit de usuario.
- Slice 2 (adapter/completion/ingest) MUST cerrar antes de onboarding, pricing o canary.
- Slice 3 (catalog, rates, rights y fleet projection) MUST cerrar antes de promoción.
- Slice 4 (evaluation/canary/promotion) promueve una ruta por vez; una ruta verde no promueve las otras.
- UI `TASK-1552` puede consumir descriptors después de Slice 3, pero nunca puede habilitar ejecución por sí sola.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| Namespace Fal incorrecto ejecuta alias o modelo distinto | integration/provider | high | route binding exacto + submit controlado + no fallback | endpoint/model identity mismatch |
| Inputs exceden límites y se reservan créditos antes de fallar | integration/finance | high | media inspector y validation before reserve | preflight rejection after reserve |
| R2V se mapea a motion-control con semántica incorrecta | contract/catalog | high | ADR-022/TASK-1633 capability gate | capability mismatch |
| Webhook perdido o duplicado causa doble ingest/settlement | webhook/outbox | medium | signed dedupe + poll recovery + idempotency | completion divergence / duplicate receipt |
| URL Fal expira antes del ingest | worker/storage | medium | descarga inmediata, retry gobernado, hash/lineage | result retrieval failure |
| Pricing input-dependent queda desalineado del provider | finance/settlement | medium | rate snapshot + estimate/usage reconciliation | rate mismatch |
| Rights de audio/voz/likeness incompletos | rights/legal | medium | attestation específica y promotion fail-closed | rights ambiguity |
| Consumer UI mantiene caps hardcodeados | UI/contract | medium | catálogo como SoT + TASK-1552 dependency gate | consumer contract drift |
| Fallback silencioso a Seedance 2.0 | provider/runtime | high | header singular + route-first identity test | provider identity mismatch |

### Feature flags / cutover

No crear una flag global nueva por defecto. La disponibilidad se controla por readiness, binding, rights,
promotion y `globe.producer.fleet.list`; las tres rutas permanecen `gated` durante discovery e implementación. Si
el runtime requiere una flag adicional, debe ser server-side, default `false`, documentada en el ledger y reversible
sin cambiar catálogo ni borrar evidence.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---:|---|
| 0 | Revertir route card/evidence nueva o marcar snapshot stale; no tocar runtime | <15 min | Sí |
| 1 | Mantener nuevos route descriptors gated y revertir dual-read/policy si rompe rutas existentes | <30 min | Sí, si no hubo migration |
| 2 | Deshabilitar bindings 2.5, conservar attempts/URLs/evidence y revertir adapter/compiler; no borrar receipts | <15 min | Sí, con recovery pendiente |
| 3 | Retirar rate/binding/readiness de las rutas nuevas y devolver fleet a `gated`; conservar snapshots append-only | <30 min | Parcial |
| 4 | Ejecutar rollback por routeId mediante promotion control plane; detener canary y dejar las otras rutas intactas | <30 min | Sí para disponibilidad; receipts/lineage son históricos |

### Production verification sequence

1. Ejecutar lint focal de task, validación de route card, contracts y mirrors sin generar gasto.
2. Revalidar Fal Model Search/OpenAPI/pricing y comprobar que el endpoint ID corresponde al route binding.
3. Deploy coordinado API/worker/studio a staging con rutas gated; verificar que Seedance 2.0 no responde a requests 2.5.
4. Ejecutar preflight con fixtures de límites, MIME, duración, FPS, dimensiones, cardinalidad y citas; verificar cero reserve en inválidos.
5. Ejecutar submit controlado T2V/I2V/R2V con spend fence; guardar URLs retornadas, completar por webhook y por poll recovery.
6. Verificar download, MIME, bytes, duración, dimensiones, audio, seed, hash, lineage, receipt y settlement único.
7. Ejecutar evaluación y canary de una ruta; comprobar rights, binding/readiness, promotion y fleet readback.
8. Repetir individualmente para las otras rutas; detenerse si aparece identity mismatch, rights ambiguity, duplicate settlement o divergence.
9. Promover sólo las rutas con evidencia completa; declarar las demás `gated` con razón observable.

### Out-of-band coordination required

- Acceso Fal server-side, pricing/usage/billing permissions y límites de cuenta.
- Configuración de webhook/JWKS y URL de recepción del worker.
- Revisión Legal/rights de términos Fal, retención, procesamiento de inputs, audio, voz y likeness.
- Autorización de operador para canary con gasto real y promoción comercial.
- Deploy simétrico de Globe API, worker y studio; nunca promover sólo un consumidor.

## Acceptance Criteria

- [ ] `TASK-1656` está registrada en el registry y README con estado `to-do`, sin pisar cambios ajenos.
- [ ] Existen exactamente tres route identities 2.5 con endpoint IDs `bytedance/...`; no existe alias ejecutable ni cuarta variante no confirmada.
- [ ] T2V, I2V y R2V compilan los payloads exactos y rechazan campos no soportados, inputs truncados y combinaciones inválidas.
- [ ] R2V conserva roles/orden/citas y aplica límites de imágenes, videos, audio y total combinado; la capability queda explícita o bloqueada por ADR-022.
- [ ] `end_image_url` funciona como frame final opcional de I2V; no se infiere por conteo ni se confunde con edit general.
- [ ] `generate_audio` se distingue de audio de referencia y se verifica audio embebido en output; no se promete stems/separate audio.
- [ ] Preflight ocurre antes de estimate/reserve/submit y cubre MIME, tamaño, duración, FPS, dimensiones, ratio y cardinalidad.
- [ ] Queue, status, result, cancel, webhook y recovery siguen URLs devueltas, con firma/identity/replay/idempotency verificadas.
- [ ] El header singular `x-app-fal-disable-fallback` está implementado y probado; la ruta nunca cae a Seedance 2.0.
- [ ] Output se descarga e ingiere de forma privada con MIME, bytes, dimensiones, duración, audio, seed, hash y lineage.
- [ ] Rates y settlement usan snapshots/drivers correctos, incluyen input-video duration para R2V y no duplican ledger.
- [ ] Rights, retention, audio/voice/likeness y delivery están atestados por provider/model/version antes de promotion.
- [ ] `globe.producer.fleet.list` devuelve `gated` hasta que readiness, binding, rate, rights, evaluation, canary, settlement y promotion converjan.
- [ ] `TASK-1552` recibe descriptors browser-safe sin caps, slugs, provider URLs, pricing vendor o lógica Fal en UI.
- [ ] No se habilitan 4K/1080p/3 minutos/seed input/masks/storyboard/shots/camera structured/stems/stream/realtime/direct BytePlus 2.5.
- [ ] Se ejecutan los gates de task, docs, route cards, skills mirrors, QA y context antes de cerrar.

## Verification

- `pnpm task:lint --task TASK-1656`
- `pnpm model-fleet:validate`
- `pnpm skills:mirrors`
- `pnpm docs:closure-check`
- `pnpm docs:context-check:strict`
- `pnpm qa:gates --changed`
- Globe: tests focales de contracts/adapter/compiler/allowlist/result/webhook/fleet, build de API/worker/studio y smoke de staging/canary según el runbook vigente.

## Closing Protocol

- [ ] `Lifecycle` queda sincronizado con el estado real (`to-do` → `in-progress` → `complete`).
- [ ] El archivo vive en la carpeta correcta y el registry/README están sincronizados.
- [ ] `Handoff.md` registra decisiones, evidencia, estado de Globe y cualquier rollout pendiente.
- [ ] `changelog.md` registra cambios de comportamiento/protocolo cuando exista implementación material.
- [ ] Se ejecuta impacto cruzado sobre `TASK-1553`, `TASK-1554`, `TASK-1552`, `TASK-1578`, `TASK-1579`, `TASK-1535`, `TASK-1469`, `TASK-1633` y `TASK-1641`.
- [ ] La documentación de capabilities, route card, ledger, skills y runbook refleja el estado real y no confunde provider-supported con Globe available.

## Follow-ups

- Crear una task UI dependiente si el Composer necesita una experiencia específica para roles multimodales o citas temporales.
- Crear una task/ADR separada si BytePlus/ModelArk publica un contrato 2.5 directo verificable.
- Abrir una capability de edición/continuation sólo cuando Fal publique un endpoint y schema explícitos; R2V no basta.
- Revisar una futura política de streaming/realtime únicamente con evidencia específica de Seedance 2.5.

## Open Questions

- ¿El nombre definitivo de la capability R2V debe ser `video-reference-to-video` o una extensión versionada de `video-reference` según la decisión final de ADR-022?
- ¿Fal mantiene de forma estable la sintaxis `@Image1`/`@Video1`/`@Audio1` en runtime, o requiere la forma visual entre corchetes?
- ¿La cuenta Fal de Globe expone pricing estimate/usage/billing-events con permisos suficientes para reconciliación automatizada?
- ¿Qué terms digest y política de retención exactos deben sellarse en la rights attestation antes del canary?
