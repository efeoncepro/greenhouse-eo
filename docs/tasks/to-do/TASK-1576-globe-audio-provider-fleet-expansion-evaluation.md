# TASK-1576 — Globe Audio Provider Fleet Expansion and Evaluation

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
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `creative|audio|providers`
- Blocked by: `TASK-1575`, `TASK-1553`, `TASK-1554`, `TASK-1535`
- Branch: `Greenhouse develop; Globe main; sin worktrees`
- Legacy ID: `none`

## Summary

Amplía y evalúa la flota de audio de Globe a través del seam de Fal y los adapters existentes. Agrega sólo rutas que
demuestren edición o generación útil para un caso concreto: SFX/Foley, voice edit, dubbing, music edit, audio-to-audio,
restore y stem separation. Cada ruta queda separada por capability, contrato, costo, licencia, calidad y readiness.

## Why This Task Exists

Fal permite sumar providers sin exponer SDKs ni secretos al browser. Globe ya tiene Seed Audio y varias rutas de
ElevenLabs vía Fal, pero el catálogo actual no debe asumir que ElevenLabs es todo el audio ni que una ruta de generación
es automáticamente una ruta de edición. Se necesita una matriz de challenger providers y evidencia reproducible.

## Goal

- Auditar el catálogo actual y evitar re-integraciones duplicadas.
- Evaluar rutas Fal para Seed Audio, ElevenLabs y challengers de música/audio-to-audio/restoration.
- Promover sólo rutas con contrato, eval, costo, derechos y canario verificables.
- Mantener coexistencia de modelos; no elegir un “mejor global” ni ocultar provider identity del ledger interno.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/README.md`
- `docs/operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `../efeonce-globe/apps/creative-runner/src/fal-adapter.ts`
- `../efeonce-globe/packages/domain/src/producer-catalog.ts`
- `../efeonce-globe/packages/domain/src/evaluation.ts`

Reglas obligatorias:

- Fal es un gateway/provider seam; la capability permanece vendor-neutral.
- Un modelo sólo entra a Producer por route binding, eval y promotion; documentación o disponibilidad en Fal no bastan.
- Slugs e IDs vendor viven en adapter/binding, nunca en contracts o copy cliente.
- Licencia comercial, uso cliente, sublicencia y consentimiento se acreditan con evidence digest.
- Las operaciones deterministas de mix/master/restore no consumen credits generativos.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md`
- `docs/tasks/in-progress/TASK-1553-globe-extensible-multi-model-provider-catalog.md`
- `docs/tasks/in-progress/TASK-1535-globe-commercial-promotion-attestation-lane.md`

## Dependencies & Impact

### Depends on

- `TASK-1575` — contract and orchestration.
- `TASK-1553`/`TASK-1554` — route-based model resolution and availability projection.
- `TASK-1535` — commercial model-rights attestation and promotion lane.
- `TASK-1504` — current audio route/shape seams.

### Blocks / Impacts

- Desbloquea las rutas de `TASK-1575` y la UI de `TASK-1577`.
- Actualiza fleet ledger, evaluation harness, route catalog, adapters y runtime handoff.
- No cambia el playback/UI ownership de `TASK-1568`.

### Files owned

- `../efeonce-globe/apps/creative-runner/src/fal-adapter.ts`
- `../efeonce-globe/apps/creative-runner/src/index.ts`
- `../efeonce-globe/packages/domain/src/producer-catalog.ts`
- `../efeonce-globe/packages/domain/src/evaluation.ts`
- `../efeonce-globe/apps/studio-web/src/governed-production-composition.ts`
- `docs/operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`

## Current Repo State

### Already exists

- Fal adapter con Seed Audio (`audio-generate`) y ElevenLabs TTS, Voice Changer y Dubbing.
- Composite/provider routing, catalog constraints, estimate y readiness/binding.
- Evaluation fixtures para foley, voice change y translation.

### Gap

- No existe matriz de evaluación específica para audio editivo multi-provider.
- No hay route contract para music edit/audio-to-audio/stem separation/restore en Producer.
- No se ha demostrado qué rutas preservan duración, timbre, capas, loudness y continuidad.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-globe/apps/creative-runner`, `packages/domain`, `apps/studio-web`; governance in Greenhouse.
- Future candidate home: `remain-shared`
- Boundary: provider adapter, route catalog, evaluation evidence, rights attestation and promotion binding.
- Server/browser split: provider calls, uploads, polling, rights and raw audio remain server/worker-side.
- Build impact: existing adapters and evaluation packages; no browser provider SDK.
- Extraction blocker: Fal credentials, creative-runner, evaluation store, rights lane and runtime promotion.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: route catalog, evaluation evidence, model rights attestation y availability projection.
- Consumidores afectados: producer catalog, API, worker, SDK/MCP/CLI y UI.
- Runtime target: creative-runner, studio-web y provider/Fal.

### Contract surface

- Contrato existente: `CreativeProviderAdapter`, producer route catalog, eval harness, commercial promotion lane.
- Contrato nuevo/modificado: audio route entries, supported edit kinds, input modes, quality evidence y rights terms digest.
- Backward compatibility: `gated`; rutas existentes no cambian sin nueva versión/ruta.
- Full API parity: availability y route selection salen de readers/commands gobernados, nunca de una lista UI.

### Data model and invariants

- Cada route declara capability, input mode, max duration, channels/sample rate, output formats, edit kinds y cost unit.
- Eval separa fidelity, edit locality, temporal continuity, speech intelligibility, music coherence, artifact rate y latency.
- No route `audio-generate` se etiqueta como `audio-edit` sin evidencia de source conditioning.
- Provider model/version/slug se conserva en evidence interna; el cliente recibe fidelity label y availability.
- Rights attestation es por provider/model/version/termsDigest; cambios de términos crean nueva attestation.

### Migration, backfill and rollout

- Migration posture: additive route/catalog/evidence; no backfill destructivo.
- Default state: Lab/eval-only; Producer `policy-blocked` hasta promoción.
- Rollback path: disable route binding/availability; preservar evidencia y outputs.
- External coordination: Fal schema/limits, provider terms, secrets y canarios facturables aprobados.

### Security and access

- Auth/access gate: trusted context, workspace binding, rights attestation, consent y production promotion.
- Sensitive data: audio fuente y voice samples privados; no raw payloads ni provider URLs en logs.
- Error contract: `audio_route_unavailable`, `audio_route_contract_mismatch`, `audio_route_rights_missing`, `audio_route_eval_failed`.
- Abuse posture: quotas, duration caps, concurrency, circuit breaker, retry budget e idempotency.

### Runtime evidence

- Contract/adapter tests para cada route y modo de input.
- Eval set con voice phrase replacement, voice conversion, dubbing, SFX placement, music section edit y restore.
- Canary separado para each route; estimate debe coincidir con ejecución.
- Rights terms y attestation verificados antes de habilitar client delivery.
- Fleet ledger/runtime handoff actualizado con as-of, lane, evidence y rollback flag.

### Capability Definition of Done — Full API Parity

- [ ] Cada route declarada tiene catalog, availability, coverage, eval y promotion posture.
- [ ] Provider-specific request/response permanece en adapter.
- [ ] La UI nunca decide provider por nombre hardcodeado ni llama Fal directamente.
- [ ] Las rutas no certificadas permanecen Lab/eval-only o policy-blocked.

## Library Discovery — 2026-07-26

- **Adopt:** Fal’s official server-side TypeScript client only inside `creative-runner`/provider adapters; no provider SDK in React ([Fal client setup](https://fal.ai/docs/documentation/model-apis/inference/client-setup)).
- **Evaluate:** WaveSurfer, Remotion and Mediabunny are consumer/preview tools, not provider capabilities; provider evaluation must remain route/eval/rights based.
- **Do not adopt:** a marketplace/editor SDK that hides model identity, cost, terms or raw upload behavior behind a UI component.
- **Decision gate:** new audio routes require contract/schema, eval evidence, terms digest, promotion and rollback before availability.

## Scope

### Slice 1 — Fleet audit and route matrix

- Auditar rutas existentes y mapearlas a edit kinds reales.
- Definir challengers Fal para SFX, música, audio-to-audio, restore y stems sin prometer integración automática.

### Slice 2 — Adapter and evaluation lanes

- Implementar sólo adapters/rutas con schema verificado y tests de contrato.
- Ejecutar evals comparables y registrar calidad, costo, latencia, limits y fallos.

### Slice 3 — Rights and governed promotion

- Adjuntar terms digest, consent policy, commercial attestation y availability projection.
- Promover por ruta; rollback por binding/flag sin mutar outputs existentes.

## Out of Scope

- Nueva UI de edición: `TASK-1577`.
- Contrato común de edición: `TASK-1575`.
- Uso de Suno/Udio u otros productos sin API/provider contract verificable.
- Declarar licencia comercial sólo por marketing o por disponibilidad en una interfaz web.

## Rollout Plan & Risk Matrix

| Riesgo | Mitigación | Rollback |
|---|---|---|
| Fal route cambia schema | adapter contract test + probe | mantener route gated |
| Audio-to-audio no preserva fuente | eval locality/continuity | no promover |
| Música sin derechos cliente | attestation por terms digest | retirar binding |
| Provider único domina el catálogo | coexistencia route-based | conservar challengers |
| Cost estimate diverge | shared shape/estimate helper | block pre-spend |

## Acceptance Criteria

- [ ] Fleet audit no duplica las rutas existentes de Seed Audio/ElevenLabs.
- [ ] Existe matriz de routes por edit kind, provider, input mode, limits, cost, license y readiness.
- [ ] Al menos una ruta nueva challenger pasa contract, eval, rights y canary sin exponer secretos.
- [ ] Music/audio-to-audio sólo se habilita si demuestra source conditioning y edición localizada.
- [ ] Estimate y ejecución comparten resolución de ruta y shape.
- [ ] Todas las rutas no promovidas aparecen como gated/eval-only, nunca como disponibles.
- [ ] Ledger, handoff, availability reader y Full API Parity quedan consistentes.

## Verification

- `cd ../efeonce-globe && pnpm check && pnpm build`
- Contract tests + evaluation harness registrados en scripts.
- `pnpm task:lint --task TASK-1576`
- Canarios provider por route y verificación de terms/rights antes de promotion.

## Closing Protocol

- [ ] Fleet ledger y runtime handoff actualizados con evidencia fechada.
- [ ] `TASK-1575` y `TASK-1577` releen la matriz final antes de consumir rutas.
