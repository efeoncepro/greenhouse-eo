# TASK-1781 — Globe Gemini Omni 1.1 Migration and Capability Expansion

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Muy alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Backend rigor: `backend-critical`
- Epic: `EPIC-028`
- Status real: `Diseño informado por investigación; cero runtime mutado`
- Rank: `TBD — completar antes de 2026-09-30 por sunset del modelo anterior`
- Domain: `creative|video|ai|platform`
- Blocked by: `acceso/cuota del modelo exacto`, `TASK-1539` para video inputs externos; coordina con `TASK-1573`, `TASK-1633`
- Branch: `Greenhouse develop; Globe main; checkout compartido; sin worktrees`
- Legacy ID: `none`

## Summary

Migra las rutas Gemini Omni de Globe desde `gemini-omni-flash-preview`, cuyo shutdown está anunciado para el
2026-09-30, a Gemini Omni 1.1 Flash. Resuelve sin colapsar las identidades oficiales
`gemini-omni-1.1-flash` (Gemini Developer API) y `gemini-omni-1.1-flash-preview` (Google Cloud), y entrega rutas
gobernadas independientes para las operaciones que Globe decida adoptar: generation, references, first/last frame,
edit, extend y output shapes 360p/720p/1080p/4K.

No es un reemplazo de string ni una ampliación automática de la ruta `ref/motion/reference-v1`. Cada identidad de
ruta debe cerrar provider support, contrato, adapter, transporte, output, billing, rights, evaluación, canary,
promotion y readback por separado.

## Why This Task Exists

La ruta vigente fue evaluada y sellada para una identidad de modelo distinta. El proveedor lanzó 1.1 el 2026-08-27,
anunció retiro del modelo anterior para el 2026-09-30 y añadió capacidades que cruzan contratos de inputs, outputs,
economía, completitud, C2PA y retención. Heredar la evidencia vieja produciría una ruta aparentemente disponible sin
haber probado el endpoint, costo, términos ni bytes nuevos.

Fuente de investigación:
[`GEMINI_OMNI_1_1_PROVIDER_RESEARCH_2026-08-27.md`](../../audits/creative-studio/GEMINI_OMNI_1_1_PROVIDER_RESEARCH_2026-08-27.md).

## Goal

- Retirar la dependencia operativa del modelo anterior antes de su shutdown, sin reescribir historia.
- Resolver y probar la identidad exacta por superficie, región, endpoint, auth y completion.
- Conservar la ruta vigente hasta que exista reemplazo promovido y rollback verificable.
- Modelar cada operación adoptada como ruta/capability semántica propia.
- Sellar rates por `routeId × outputShape`, billing real, rights y policy exactos.
- Verificar C2PA, audio, codec/MIME, latencia, settlement y playback sobre bytes retenidos.
- Promover sólo mediante el carril gobernado y confirmar disponibilidad con `globe.producer.fleet.list`.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Canon obligatorio:

- `docs/architecture/creative-studio/README.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_MODEL_ROUTE_CARDS_DECISION_V1.md` (ADR-023)
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ROUTE_CREATIVE_CONTRACT_DECISION_V1.md` (ADR-022)
- ADR-021 para completion capture
- `docs/operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`
- `docs/architecture/creative-studio/model-fleet/routes/GEMINI_OMNI_VIDEO_ROUTE_CARD_V1.json`
- `../efeonce-globe/AGENTS.md` y runtime real del adapter/driver/catálogo

### ADR gate

Los ADR existentes gobiernan route cards, contratos creativos y completion. Antes de código, decidir y registrar:

- `no new ADR` si es sustitución/adición dentro de esos contratos;
- `amend existing ADR` o `new ADR` si cambia identidad cross-surface, `OutputShapeV1`, settlement, completion,
  promotion, C2PA/rights snapshot o el contrato compartido de `video-extend`.

No comenzar el slice que cambia source of truth o contrato compartido hasta resolver este gate.

## Dependencies & Impact

### Depends on

- Acceso verificable a cada ID oficial y fixed quota/capacity de Cloud.
- `TASK-1539` para video/reference inputs externos gobernados.
- `TASK-1573` para ownership de `video-edit`, continuidad, lineage y chainability.
- `TASK-1633` para roles de input, controles y output shape por ruta.
- ADR-009/021/022/023 y lifecycle de evaluación/promoción existente.

### Blocks / Impacts

- Continuidad de `ref/motion/reference-v1` después de 2026-09-30.
- `TASK-1504`, `TASK-1573` y `TASK-1574` en sus superficies Omni.
- Catálogo/rates/credits, adapter Vertex Omni, result driver, Asset Governance, Producer selector y fleet reader.
- Skills `greenhouse-globe-model-fleet` y `motion-design-studio` después del canary final.

### Files owned

- `../efeonce-globe/packages/contracts` y `packages/provider-contract` sólo si cambia contrato compartido.
- `../efeonce-globe/packages/domain/src/producer-catalog.ts`
- `../efeonce-globe/apps/creative-runner/src/vertex-omni-adapter.ts`
- `../efeonce-globe/apps/studio-web/src/governed-production-composition.ts`
- result/completion drivers, rate snapshots, evaluation/promotion scripts y tests de Globe aplicables.
- Route card, fleet ledger, runtime handoff y skills espejadas en Greenhouse.

## Current Repo State

### Already exists

- Ruta `ref/motion/reference-v1` sellada para `gemini-omni-flash-preview`.
- Vertex Interactions adapter, route binding, evaluation/promotion lifecycle y `poll` completion.
- Asset Governance, C2PA inspection, rights snapshots, private ingest y credit lifecycle.
- Tasks separadas para video edit y contratos de inputs/controles.

### Gap

- Cero evidencia runtime de los IDs 1.1 en Globe.
- El ID oficial difiere por Developer API vs Cloud; no existe decisión de surface.
- La ruta vigente conserva model/version/rate/terms del modelo retirado.
- No existen rutas públicas y canaries separados para extend, first/last frame, video reference o 4K.
- No se ha verificado fixed quota, factura, codecs, audio, C2PA, filtros ni retención 1.1.
- El rollback no puede depender indefinidamente de un endpoint con shutdown anunciado.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: Globe contract spine, provider adapter/runner, catalog, credits, governance and Producer; governance docs in Greenhouse.
- Future candidate home: `remain-shared`
- Boundary: semantic route contract outside provider; IDs/endpoints/headers/raw payloads inside adapter.
- Server/browser split: server resolves model, inputs, auth, quota, spend, storage, completion, rights and output; browser sends opaque refs and neutral intent.
- Build impact: API + producer worker + Studio only when its consumer changes; verify image/config symmetry.
- Extraction blocker: trusted context, WIF/ADC or API-key surface, fixed quota, private assets and governed promotion.

## Backend/Data Contract

### Backend/data brief

- Source of truth afectado: route catalog/binding/readiness, rate snapshot, rights attestation, run/attempt/output and fleet projection.
- Consumidores: Producer UI/BFF, API, worker, MCP/CLI/SDK where exposed, Asset Governance and settlement.
- Runtime target: `efeonce-globe`, Google Cloud/Gemini API exact surface and private GCS.

### Identity contract

Persistir y verificar siempre:

```text
routeId + capability + operation + provider + model + version/endpoint + region + completionDriver
```

- `gemini-omni-1.1-flash` y `gemini-omni-1.1-flash-preview` son identidades distintas.
- Ningún alias/fallback cruza superficies en silencio.
- El modelo anterior y su evidencia permanecen inmutables.
- Un model response debe confirmar la identidad efectiva o fallar cerrado.

### Candidate route decomposition

La discovery puede descartar o dividir estas candidatas; no puede colapsarlas:

| Candidate | Capability/operation | Input contract | Output contract |
|---|---|---|---|
| replacement reference route | `video-generate/create` | refs de imagen + prompt | video 720p baseline |
| text/image generation | `video-generate/create` | texto o imagen | 360p/720p/1080p/4K |
| video references | `video-generate/create` | video refs + optional images | video con lineage de todos los inputs |
| first/last frame | `video-frames/create` | start + optional/end según contrato | transición continua |
| edit | `video-edit/edit` | governed parent + prompt | child output + preservation evidence |
| extend | `video-extend/extend` | governed parent + prompt | child; cumulative duration <= 40 s |

### Input/output invariants

- Validar antes del spend: count, MIME, bytes, duration, fps, aspect ratio, resolution, audio policy y rights.
- Input videos e imágenes entran por private ingest/hash, nunca URL pública o bytes del browser al proveedor.
- 360p/720p/1080p/4K son output shapes; no variantes implícitas del mismo rate.
- `4K` se verifica en bytes/metadata; no se promete “nativo” si el proveedor sólo hace upscale.
- Cada output declara MIME, codec, audio streams, duration, dimensions, hash, C2PA y governance.
- First/last, reference, edit y extend no son sinónimos y no comparten fallback silencioso.

### Completion/idempotency

- Sync y async se prueban por superficie; la ruta declara un completion driver exacto.
- Async persiste interaction ID opaco antes de poll.
- Timeout/ambigüedad: readback con la misma correlación e idempotencia antes de otro submit.
- Nunca validar la forma inventada del interaction ID; validar ownership/surface cuando sea posible.
- La retención provider de hasta 14 días no sustituye la persistencia privada ni la política de eliminación.

### Economics and settlement

- Capturar price snapshot con fuente/digest/as-of y construir rate por route/output shape.
- Dry-run de estimate antes del primer gasto.
- Canary con spend fence específico; registrar input/output/thought tokens y receipt real.
- Verificar costo nominal vs factura/settlement y rounding.
- No convertir costo vendor directamente en Studio Credits.
- Retries técnicos no se cobran al cliente; reintentos creativos sí son nuevas operaciones explícitas.

### Rights, privacy and security

- Nueva atestación inmutable por ID/superficie/digest; nunca editar la anterior.
- Revalidar uso comercial, client delivery, sublicencia, DPA, no-training/no-improvement, retención, human access,
  subprocesadores y región.
- `global` queda bloqueado para material con requisito de residencia geográfica.
- C2PA se inspecciona en bytes y se guarda como provenance; no confiere clearance de inputs/likeness/IP.
- No secretos, payloads, prompts cliente, signed URLs, raw errors ni interaction bodies en surfaces cliente/logs.
- Validación legal final con abogado habilitado antes de entrega comercial.

### Migration, rollout and rollback

- Migration posture: additive + parallel binding; nunca overwrite del modelo anterior.
- Default: nuevas rutas `gated`/flag OFF.
- Primero replacement parity 720p; después capacidades nuevas por route.
- Old/new shadow compare sólo con inputs autorizados y spend aprobado.
- Promote exact route after rights/eval/canary; readback fleet.
- Cutover del selector sólo cuando la nueva route esté `available` y el rollback haya sido ejercitado.
- Sunset de la antigua: deshabilitar nuevos runs antes del shutdown, conservar retrieval/history y señal de uso residual.
- Rollback después del shutdown: disable route + comunicación operativa; no prometer fallback imposible.

### Reliability signals

- `globe.model_route.sunset_exposure` — uso/binding del modelo anterior cerca del shutdown.
- `globe.provider.model_identity_mismatch` — respuesta o route efectiva no coincide con identidad solicitada.
- `globe.provider.interaction_stuck` — async fuera de deadline sin submit duplicado.
- `globe.provider.fixed_quota_unavailable` — quota/access bloquea prepare antes de reserve.
- `globe.provider.output_shape_mismatch` — bytes no cumplen resolution/duration/audio/MIME.
- `globe.provider.c2pa_missing_or_invalid` — separado de rights eligibility.
- `globe.provider.billing_rate_drift` — receipt se desvía del rate snapshot.

<!-- ZONE 2 — PLAN MODE (se completa al tomar la task) -->

## Required preflight

1. Confirmar goal con el operador y ejecutar `pnpm codex:task-hook TASK-1781`.
2. Leer canones, task, research y estado live de Globe.
3. Revisar ambos checkouts compartidos y detenerse si WIP ajeno solapa archivos dueños.
4. Ejecutar `globe.producer.fleet.list` y capturar sólo DTO redactado.
5. Reabrir todas las fuentes primarias y sellar source log actualizado.
6. Resolver ADR gate y surface decision antes de código.

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 0 — Discovery adversarial and access

- Probar catálogo/model access sin generación billable cuando sea posible.
- Resolver Developer API vs Cloud, auth, model ID, endpoint, request shape, fixed quota y region.
- Capturar respuestas de error sanitizadas para ID cruzado/inexistente.
- Confirmar shutdown y plan de continuidad.

### Slice 1 — 720p replacement parity

- Declarar nueva identidad/binding sin tocar el anterior.
- Adaptar provider contract/adapter/result/completion según evidencia real.
- Mantener exacta la semántica de la ruta vigente de referencias de imagen.
- Verificar output, audio, C2PA, billing, rights, evaluation, canary y promotion.

### Slice 2 — Output-shape expansion

- Añadir 360p, 1080p y 4K sólo como shapes soportados/verificados.
- Rate, constraints, derivatives, playback y QA por shape.
- Negative tests para shape no soportado, bytes mal rotulados y costo fuera de fence.

### Slice 3 — New operations

- Particionar reference video, first/last, edit y extend según ownership de TASK-1573/1633.
- Una route card, binding, evaluation y canary por identidad adoptada.
- Ninguna capacidad nueva bloquea el reemplazo 720p si puede entregarse por separado.

### Slice 4 — Cutover and sunset

- Canary autenticado desde Producer para cada ruta client-consumable.
- Readback fleet + binding/readiness/circuit/rate/rights/settlement.
- Cutover gradual y rollback ejercitado mientras el modelo antiguo responda.
- Deshabilitar nuevos runs antiguos; conservar historia y retrieval.
- Cerrar docs/skills/handoff con runtime real, no con esta task.

## Out of Scope

- Publicar rutas o habilitar clientes externos por editar documentación.
- Reutilizar el canary, rights attestation, rate o promotion del modelo anterior.
- Crear UI de edición/timeline (`TASK-1574`).
- Resolver uploader/asset intake general (`TASK-1539`).
- Cambiar Studio Credits o pricing cliente sin decisión dueña.
- Reescribir assets, runs, policies o evidencia históricos.

## Verification Matrix

| Gate | Evidence required |
|---|---|
| identity | model ID efectivo por surface; wrong-surface negative test |
| contract | schema/constraints; conformance y unsupported fail-closed |
| transport | auth keyless/key según surface; API/worker symmetry |
| completion | sync + async; timeout readback; no duplicate spend |
| output | MIME/codec/dimensions/duration/fps/audio/hash por shape |
| C2PA | manifest extraído/validado y ausencia tratada separadamente |
| billing | estimate/reserve/receipt/settlement/rate drift |
| rights | terms digest, attestation, policy snapshot, legal review owner |
| evaluation | report/review sobre exact route/model/output shape |
| canary | retained output, governance eligible, playback y one charge |
| promotion | binding/readiness/circuit/saga/readback convergentes |
| UI | Producer autenticado; inputs obligatorios resolubles; 390px si hay cambio visible |
| sunset | cero nuevos runs old model + residual-use signal + retrieval intacto |

## Acceptance Criteria

- [ ] la decisión de surface/ID está respaldada por probes y no por alias;
- [ ] `gemini-omni-flash-preview` y sus snapshots históricos permanecen inmutables;
- [ ] existe reemplazo 720p promovido y `available` por reader antes del cutover;
- [ ] el shutdown 2026-09-30 tiene señal, deadline, owner y runbook;
- [ ] cada operación nueva tiene routeId/contract/card/canary propios o queda explícitamente deferred;
- [ ] 360p/720p/1080p/4K tienen constraints, rate y bytes verificados por separado;
- [ ] async timeout se recupera por readback sin gasto duplicado;
- [ ] billing real reconcilia con el rate snapshot y settlement;
- [ ] C2PA, rights y release state permanecen ejes separados;
- [ ] API y worker usan la misma revisión/config/model support;
- [ ] Producer canary real prueba inputs, playback, governance y cobro único;
- [ ] `globe.producer.fleet.list` confirma el estado final;
- [ ] external rollout continúa gated hasta entitlements B2B y evidencia propia;
- [ ] skills y docs se actualizan de nuevo con el runtime observado, no sólo con claims del proveedor.

## Validation Commands

```bash
pnpm codex:task-hook TASK-1781
pnpm task:lint --task TASK-1781
node .codex/skills/greenhouse-globe-model-fleet/scripts/validate-route-cards.mjs
node .codex/skills/greenhouse-globe-model-fleet/scripts/validate-route-cards.mjs --strict-freshness
pnpm skills:mirrors
pnpm qa:gates --changed
pnpm docs:closure-check
pnpm docs:context-check:strict
```

Globe agrega `pnpm check`, `pnpm build`, tests de packages registrados, dry-run y canaries gobernados aplicables.

## Documentation Closure Checklist

- [ ] task y registry sincronizados;
- [ ] route card refleja sólo evidencia actual;
- [ ] fleet ledger y runtime handoff distinguen docs, code, rollout y live availability;
- [ ] skills Codex/Claude permanecen byte-parity;
- [ ] changelog actualizado si cambia comportamiento/operating protocol;
- [ ] manual/documentación cliente actualizados sólo después de disponibilidad real;
- [ ] strict context gate ejecutado como último gate después de toda edición documental.

## Follow-ups

- UI `video-edit`/timeline permanece en `TASK-1574`.
- Intake de videos externos permanece en `TASK-1539`.
- Si 4K exige derivatives/streaming nuevos, crear task propia después de medir bytes y playback.
- Si fixed quota requiere procurement/capacity, crear owner operativo separado; no hardcodear fallback.

## Open Questions

1. ¿Qué surface ofrece el contrato enterprise requerido: Cloud `-preview`, Gemini API sin sufijo o ambas?
2. ¿La variante Cloud `-preview` y la Developer sin sufijo son el mismo snapshot o releases independientes?
3. ¿4K es output generado, upscale o ambas cosas en cada operation?
4. ¿Qué codecs/audio streams produce cada resolution y aspect ratio?
5. ¿Cómo se elimina antes de 14 días una interaction async y qué evidencia contractual aplica a `store`?
6. ¿Fixed quota ya está otorgada a `efeonce-globe` y cuál es el throughput real?
7. ¿La edición/continuation en Cloud conserva el mismo contrato stateful que la surface anterior?
8. ¿Qué operaciones deben llegar a Producer V1 y cuáles quedan en Model Lab hasta tener workflow real?
