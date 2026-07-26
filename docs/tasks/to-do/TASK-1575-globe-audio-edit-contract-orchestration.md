# TASK-1575 — Globe Audio Edit Contract and Multi-provider Orchestration

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Muy alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-028`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `creative|audio|ai`
- Blocked by: `TASK-1490`, `TASK-1504`, `TASK-1528`, `TASK-1567`; provider lanes additionally `TASK-1576`
- Branch: `task/TASK-1575-globe-audio-edit-contract-orchestration`
- Legacy ID: `none`

## Summary

Introduce el contrato neutral `audio-edit` para editar audio generado, grabado o gobernado mediante una selección
temporal, una capa sonora y una intención. El contrato coordina voz, diálogo, música, Foley/SFX, restauración y
composición determinista sin acoplar el producto a ElevenLabs, Seed Audio, Stable Audio u otro provider vía Fal.

## Why This Task Exists

Globe ya tiene `audio-generate`, `speech-synthesize`, `audio-change-voice` y `audio-translate`, pero no tiene una
unidad común para pedir una edición sobre un audio existente. Un inpainting de audio no equivale a una máscara visual:
requiere saber qué intervalo y qué capa se modifica, qué debe preservarse y si el origen es una voz, un stem o una
mezcla final.

## Goal

- Crear `audio-edit` como capability gobernada y vendor-neutral.
- Modelar `AudioEditBrief` con intervalo temporal, capa, intención, preservación, referencias y política de sync.
- Crear un child asset/experiment con lineage, estimate, spend fence e idempotencia.
- Separar edición generativa de mezcla, crossfade, ducking, loudness y export deterministas.
- Mantener las capabilities existentes de voz y doblaje sin duplicarlas ni reemplazarlas.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/README.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`
- `docs/operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `../efeonce-globe/packages/contracts/src/index.ts`
- `../efeonce-globe/packages/provider-contract/src/index.ts`
- `../efeonce-globe/packages/domain/src/model-lab.ts`
- `../efeonce-globe/apps/creative-runner/src/fal-adapter.ts`

Reglas obligatorias:

- `audio-edit` es una capability de producto, no un nombre de modelo ni de proveedor.
- El browser envía referencias opacas, brief neutral y prompt; nunca bytes, URLs, IDs vendor o secretos.
- La selección es temporal y semántica; no se presenta como edición muestra-a-muestra si la ruta no lo certifica.
- Un parent, sus derechos y su manifest son inmutables; cada edición genera una versión hija.
- Clonación/cambio de voz exige consentimiento explícito; música y voz comerciales exigen attestation de derechos.
- Si sólo existe una mezcla estéreo, la preservación por capa se degrada de forma visible o falla cerrada.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_MEDIA_DERIVATIVES_V1.md`
- `docs/tasks/complete/TASK-1490-globe-cross-model-edit-refine-capability.md`
- `docs/tasks/to-do/TASK-1567-globe-audio-waveform-derivative-playback-projection.md`

## Dependencies & Impact

### Depends on

- `TASK-1490` — edit/refine, parent output y lineage.
- `TASK-1504` — capabilities y shape contract de audio existentes.
- `TASK-1528` — derivatives y serving gobernado.
- `TASK-1567` — waveform, duración y preview projection.
- `TASK-1576` — rutas de provider evaluadas; el contrato puede desarrollarse antes con policy-blocked.

### Blocks / Impacts

- Bloquea `TASK-1577` — Audio Edit Studio UI.
- Extiende `TASK-1568` sin absorber su playback ownership.
- Impacta contracts, domain, catalog, provider request, manifests, credits y production composition.

### Files owned

- `../efeonce-globe/packages/contracts/src/index.ts`
- `../efeonce-globe/packages/provider-contract/src/index.ts`
- `../efeonce-globe/packages/domain/src/model-lab.ts`
- `../efeonce-globe/packages/domain/src/producer-catalog.ts`
- `../efeonce-globe/apps/creative-runner/src/index.ts`
- `../efeonce-globe/apps/studio-web/src/governed-production-composition.ts`
- `../efeonce-globe/apps/studio-web/src/production-result-drivers.ts`
- `docs/operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md`

## Current Repo State

### Already exists

- `audio-generate` con Seed Audio vía Fal.
- `speech-synthesize`, `audio-change-voice` y `audio-translate` con rutas ElevenLabs vía Fal.
- Asset governance, content addressing, estimates, spend fence, lineage y media derivatives.
- `audioInputMode` para foley, voiceover, change-voice y translate.

### Gap

- No existe `audio-edit` ni `AudioEditBrief`.
- No existe distinción gobernada entre voice edit, SFX insertion, music edit, audio-to-audio y restore.
- No existe contrato de stems/layers ni policy de preservación por capa.
- No existe composición determinista post-generación con QC de loudness, clipping y duración.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-globe/packages/{contracts,domain,provider-contract}`, `apps/{studio-web,creative-runner}`; governance in Greenhouse.
- Future candidate home: `remain-shared`
- Boundary: `audio-edit` command/reader, edit brief, route planner, manifest evidence and provider adapters.
- Server/browser split: server resolves source, layers, rights, route, credits, provider input and lineage; browser keeps only selection and ephemeral playback state.
- Build impact: existing Globe packages/apps; provider SDKs remain inside adapters.
- Extraction blocker: trusted context, spend fence, durable experiments, media retrieval and provider credentials.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: experiment/asset manifest, route catalog/readiness, derivatives y provider evidence.
- Consumidores afectados: Producer UI, API, SDK, MCP, CLI, worker y provider adapters.
- Runtime target: Globe API/BFF + creative-runner + media-derivatives.

### Contract surface

- Contratos existentes: `PrepareExperimentPayloadV1`, `editFrom`, `CreativeProviderRequestV1`, assetRef, estimate y output lineage.
- Contrato nuevo: `audio-edit`, `AudioEditBriefV1`, `AudioLayerV1`, `AudioPreservationPolicyV1`, `AudioEditResultV1`.
- Backward compatibility: `gated`; audio generation, TTS, change-voice y translate conservan su semántica.
- Full API parity: un command/reader gobernado para prepare, estimate, execute, reconcile y result projection.

### Data model and invariants

- `editKind`: `voice-replace|speech-correct|dub|sfx-add|music-edit|audio-to-audio|restore|stem-separate`.
- `sourceScope`: `whole|range|transcript-segment`; range usa milisegundos y metadata exacta del source.
- `targetLayer`: `dialogue|music|ambience|sfx|mix|unknown`; `unknown` no promete preservación de capas.
- `preserve`: identidad, emoción, timing, pitch, tempo, tonalidad, ambiente, música, SFX y loudness según soporte real.
- Idempotencia sobre parent hash/generation + scope + layer + brief + references + route + output shape.
- El output conserva parent, source derivative, transcript/stem versions, provider evidence, recipe y mix manifest.
- Generación consume credits; selección, edición determinista, mezcla, master y export consumen `0 credits`.

### Migration, backfill and rollout

- Migration posture: additive; ningún audio histórico se reescribe.
- Default state: `policy-blocked` y flags OFF hasta route driver, eval, rights attestation y canary.
- Backfill plan: none; derivatives nuevos se solicitan por identidad versionada.
- Rollback path: deshabilitar capability/routes y conservar parent/child evidence; nunca borrar outputs.
- External coordination: Fal route bindings, provider terms, secrets propios de Globe y promoción ADR-010.

### Security and access

- Auth/access gate: trusted context, workspace binding, asset rights, consent/rights attestation y spend fence.
- Sensitive data: voz, audio fuente y transcript no aparecen en logs; retrieval privado y grants cortos.
- Error contract: `audio_edit_unsupported`, `audio_edit_layer_unavailable`, `audio_edit_scope_invalid`, `audio_edit_rights_required`, `audio_edit_route_gated`.
- Abuse posture: duración, channels, sample rate, tamaño, concurrencia, rate limit, circuit breaker e idempotencia.

### Runtime evidence

- Unit tests para brief, layers, preservation, source scope, tenant isolation, idempotency y canonical errors.
- Integration canaries para voice edit, SFX insertion y restore determinista.
- Music/audio-to-audio sólo pasa a Producer después de eval de continuidad, derechos y costo.
- QC obligatorio: duración, sample rate, channels, LUFS, true peak, clipping, silencio, fase, intelligibility y sync cuando exista video.
- Actualizar fleet ledger y runtime handoff con ruta, modelo, lane, evidence y terms digest.

### Capability Definition of Done — Full API Parity

- [ ] `audio-edit` existe en contracts, domain registry, catalog, coverage y conformance.
- [ ] HTTP/SDK/MCP/CLI/worker comparten el mismo primitive o quedan declarados `policy-blocked`.
- [ ] Provider-specific fields permanecen dentro del adapter.
- [ ] Credits, rights, consent, idempotency, reconciliation y audit evidence están gobernados server-side.

## Scope

### Slice 1 — Audio edit brief and capability

- Agregar capability, brief, edit kinds, temporal scope, layer y preservation policy.
- Validar shape, source authority y route eligibility antes de estimate/spend.

### Slice 2 — Orchestration and lineage

- Crear command/reader de prepare, estimate, execute, reconcile y result.
- Crear child lineage y mix manifest; separar generative output de composición determinista.

### Slice 3 — QC, credits and rights

- Integrar QC de audio, credits, consentimiento de voz y model commercial rights.
- Añadir errores canónicos, señales, retries y rollback por flag.

## Out of Scope

- UI y Sonic Canvas: `TASK-1568` y `TASK-1577`.
- Integrar un provider concreto: `TASK-1576`.
- Mezcla DAW completa, edición destructiva, grabación humana o entrega final sin aprobación humana.
- Sincronización audiovisual completa: coordinar con `motion-design` cuando el audio se aplique a video.

## Rollout Plan & Risk Matrix

| Riesgo | Mitigación | Rollback |
|---|---|---|
| Ruta sólo genera y no edita | route contract y eval antes de availability | policy-block route |
| Mezcla estéreo mal interpretada como stems | targetLayer/layer availability explícitos | fail closed |
| Cambio de voz sin consentimiento | rights/consent gate antes de spend | disable voice edit |
| Audio editado pierde timing o loudness | fixed-duration policy + deterministic QC | conservar parent |
| Retry duplica gasto | idempotency + reconcile reader | no retry ciego |

## Acceptance Criteria

- [ ] `audio-edit` es una capability gobernada y no altera semántica de las capabilities existentes.
- [ ] Brief valida parent, intervalo, capa, intención, preservación, refs y política de sync antes de gastar.
- [ ] Ninguna ruta se presenta como edición parcial si sólo soporta generación o reinterpretación.
- [ ] Cada output es child lineage inmutable con route, provider evidence, prompt, source identity y mix manifest.
- [ ] La composición determinista y el gasto generativo se distinguen en estimate y ledger.
- [ ] Consentimiento, rights attestation y privacidad de audio bloquean operaciones no autorizadas.
- [ ] QC verifica duración, formato, loudness, clipping, fase y sync cuando aplica.
- [ ] Full API Parity y canarios negativos pasan; las rutas no promovidas permanecen policy-blocked.

## Verification

- `cd ../efeonce-globe && pnpm check && pnpm build`
- Tests focales registrados en los scripts de package.
- `pnpm task:lint --task TASK-1575`
- Canarios gobernados de voice edit, SFX add y deterministic restore; sin retry ciego.

## Closing Protocol

- [ ] Lifecycle, README, registry, Handoff, fleet ledger y runtime handoff sincronizados.
- [ ] `TASK-1576` y `TASK-1577` releen el contrato final antes de habilitar rutas o UI.

## Follow-ups

- Edición musical avanzada por stems, audio-to-audio e inpainting.
- Tracking semántico de eventos sonoros y edición guiada por beat.
- Mezcla espacial, multicanal y composición sincronizada a video.
