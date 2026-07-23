# TASK-1533 — Globe Voice Ideation Intake Foundation

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
- Backend impact: `command`
- Epic: `EPIC-028`
- Status real: `Diseño listo; Globe no tiene capability speech-to-text y bloquea microphone globalmente`
- Rank: `TBD`
- Domain: `creative|ai|audio|privacy`
- Blocked by: `none`
- Branch: `task/TASK-1533-globe-voice-ideation-intake-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear una capability gobernada de **Voice Ideation Intake** para recibir una nota de voz corta, transcribirla y
entregar un resultado revisable al Creative Prompt Engineer. V1 es batch, máximo 90 segundos, sin escucha
permanente, sin memoria y con eliminación del audio temporal después del outcome terminal. Captura pensamiento
en su forma inicial; no lo convierte en instrucción autoritativa por el solo hecho de haber sido hablado.

## Why This Task Exists

Globe genera, sintetiza, traduce y transforma audio, pero no tiene speech-to-text. La UI además publica
`Permissions-Policy: microphone=()`. Agregar sólo un ícono produciría una affordance falsa y un camino de datos
sin contrato de privacidad, retención, autorización, idempotencia ni provider boundary.

La voz de ideación es input creativo, no modalidad Audio de salida. Debe convertirse en transcript con provenance
y después alimentar TASK-1530; nunca debe mezclarse con TTS, voice changer o dubbing.

## Goal

- Contrato vendor-neutral `VoiceIdeationTranscriptionPort`.
- Captura autorizada, transcripción batch y outcome revisable.
- Audio temporal con TTL/borrado verificable y cero raw telemetry.
- Español, inglés y Spanglish con evals de ruido/vocabulario creativo.
- Full API Parity para UI/HTTP/SDK/E2E y gates explícitos para otras surfaces.
- Handoff estable a TASK-1530 sin autoaceptar ni generar.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- Globe sigue browser→BFF→IAM-private API; browser nunca llama al proveedor STT.
- Proponer ADR antes de código porque nace capability AI, policy de micrófono y lifecycle de audio sensible.
- No guardar chain-of-thought ni inferir emoción/tono como instrucción autoritativa.
- La voz preserva la autoría del operador: transcript, resumen e inferencias conservan provenance separado.
- El transcript es un draft; sólo una acción humana posterior lo inserta o envía a TASK-1530.
- `microphone` se habilita sólo para `/producer`, nunca como header global permisivo.

## Normative Docs

- `docs/architecture/GREENHOUSE_GLOBE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_AGENTIC_AI_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md`
- `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md`
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`

## Dependencies & Impact

- `TASK-1519` — bridge humano BFF.
- `TASK-1530` — consumer creativo del transcript aceptado.
- Bloquea `TASK-1534`.

### Files owned

- `../efeonce-globe/packages/contracts/src/voice-ideation.ts` (nuevo)
- `../efeonce-globe/packages/domain/src/voice-ideation.ts` (nuevo)
- `../efeonce-globe/apps/studio-web/src/app.ts`
- adapter/port server-side detrás del runner o runtime aprobado por ADR
- tests, conformance, config e infraestructura mínima que el ADR confirme

## Current Repo State

### Already exists

- Audio generate, speech synthesize, change voice y translate.
- API Contract Spine, trusted context, idempotency, provider ports y private storage patterns.
- `Permissions-Policy` global con `microphone=()`.

### Gap

- No capability, schema, command, provider port ni eval STT.
- No lifecycle/TTL de audio temporal ni comprobante de borrado.
- No límites MIME/duración/tamaño ni normalización segura.
- No política de idiomas/confidence/partial outcome.
- No permisos route-scoped ni señales operativas.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-globe packages/contracts + packages/domain + apps/studio-web + approved provider adapter`
- Future candidate home: `remain-shared`
- Boundary: `VoiceIdeationTranscriptionPort + globe.voice.ideation.*; Creative Prompt Engineer is a consumer`
- Server/browser split: `browser records a bounded blob; BFF/domain own authorization, validation, provider, retention, deletion and evidence`
- Build impact: `browser MediaRecorder uses platform API; provider SDK isolated server-side; no new UI framework`
- Extraction blocker: `trusted context, upload authorization, transient object lifecycle, STT provider and audit must remain coherent`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: `voice ideation command state + transient audio lifecycle`
- Consumidores afectados: `UI|HTTP|SDK|E2E`; MCP/CLI/worker declarados por coverage
- Runtime target: `internal Cloud Run web/API/provider adapter`

### Contract surface

- Existing: API Contract Spine, trusted envelopes y error vocabulary.
- New: `VoiceIdeationRequestV1`, `VoiceIdeationTranscriptV1`, `VoiceIdeationEvidenceV1`,
  `VoiceIdeationTranscriptionPort`, start/complete/status contract según ADR.
- Compatibility: additive/gated.
- Full API parity: UI uploads/commands through BFF; provider details remain behind port.

### Data model and invariants

- Persistencia: metadata/outcome mínimo; bytes transitorios fuera del DB. Schema exacto requiere ADR/Discovery.
- Invariantes:
  - Captura sólo después de gesto y permiso explícitos.
  - Máximo 90 s y límites MIME/bytes server-side.
  - Audio y transcript pertenecen al workspace/actor trusted.
  - Audio temporal se elimina al outcome terminal o TTL; failure de borrado genera señal/reconciliación.
  - Transcript no es prompt aceptado ni se envía automáticamente a TASK-1530.
  - Confidence/idioma son evidence, no hechos infalibles.
- Idempotency/concurrency: fingerprint de bytes + actor/workspace + key; una transcripción por intent; retry reconcilia.
- Audit/history: metadata, outcome, provider revision, duración, idioma y deletion receipt; nunca audio/transcript raw.

### Migration, backfill and rollout

- Migration posture: additive sólo si metadata durable es necesaria.
- Default state: capability/route permission OFF.
- Backfill: none.
- Rollback: flag OFF + `microphone=()` + drain/delete transient objects.
- External coordination: provider/config/secrets keyless preferidos; DPA/retention y operator sign-off.

### Security and access

- Auth: session→BFF→IAM API→capability/trusted context.
- Sensitive data: voz y transcript pueden contener PII/confidencialidad cliente.
- Errors: permission_denied, unsupported_media, limit_exceeded, invalid_request, dependency_unavailable, timeout,
  conflict y deletion_pending sanitizados.
- Abuse: rate/size/duration quotas, content-type sniffing, malware/format validation, replay guard, circuit breaker.

### Runtime evidence

- Local: contract/domain/provider tests + conformance + registered scripts.
- Runtime: upload/transcribe/status/delete readback.
- Integration: provider canary con fixtures sintéticos es/en/Spanglish y ruido.
- Signals: latency, outcome, language, confidence band, bytes/duration, deletion lag/failure; no raw content.
- Production: permission→upload→transcribe→read outcome→delete receipt→TASK-1530 fixture.

### Capability Definition of Done — Full API Parity

- [ ] Schema/command/reader, trusted context, coverage y conformance nacen juntos.
- [ ] Provider detrás de port; UI/BFF no importan SDK.
- [ ] Capability/grant y actor real se verifican sin ampliar autoridad de generación.
- [ ] Transcript draft es compatible con propose→confirm; no autoexecute.

<!-- ZONE 2 — se completa al tomar la task -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 0 — ADR and threat/privacy model

- Elegir request-response vs async status según p95 medido; storage temporal, TTL, deletion receipt y provider.
- Modelar trust boundaries, permission policy route-scoped, consent, retention y incident/rollback.

### Slice 1 — Contracts and lifecycle

- Browser-safe request/outcome/evidence y state machine `accepted→processing→ready|partial|failed→deleted`.
- Full surface coverage, canonical errors, idempotency y audit allowlist.

### Slice 2 — Transcription port and adapter

- Batch STT con idioma hint opcional, auto-detection evidence y punctuation.
- Timeouts/retry owner/circuit/fallback presupuestados; no cascada ilimitada.
- Validation de 90 s, MIME/bytes y contenido antes de provider.

### Slice 3 — Privacy, deletion and evals

- Delete-on-terminal + TTL sweeper/reconciliation; receipt durable sin bytes.
- Golden set sintético español/inglés/Spanglish, ruido, pausas, nombres creativos y prompt injection hablado.
- Métricas de word accuracy son señal; revisión humana evalúa preservación de intención.

### Slice 4 — Contract handoff and rollout

- Fixtures stable ready/partial/error/denied para TASK-1534.
- Handoff transcript→TASK-1530 conserva source/provenance y exige acción humana.
- Canary interno, flags OFF→allowlist y rollback probado.

## Out of Scope

- Micrófono/UI (TASK-1534), streaming/live captions, diarización o reuniones.
- Voice cloning, emotion detection, speaker identity o memoria.
- Guardar audio como asset; requeriría acción/rights task separada.
- Autoenviar al Creative Prompt Engineer o generar media.

## Detailed Spec

V1 prioriza privacidad y robustez sobre inmediatez: el browser captura una nota corta y la entrega al BFF por un
contrato bounded. El servidor valida, transcribe y devuelve transcript/evidence. El audio se elimina después del
outcome terminal; un borrado fallido no se oculta y entra a reconciliación. El transcript permanece draft hasta
`insert literal` o `convert creative` en TASK-1534.

## Rollout Plan & Risk Matrix

| Riesgo | Mitigation | Evidencia |
|---|---|---|
| Captura involuntaria | user gesture + persistent indicator + stop | permission/UI contract |
| PII retenida | ephemeral bytes + TTL + deletion receipt | readback/reconciler |
| Transcript incorrecto | editable draft + confidence/partial | golden/human review |
| Provider outage | timeout/circuit/canonical error | failure canary |
| Cross-tenant leak | trusted ownership + opaque IDs | isolation tests |
| Injection hablada | transcript treated as data | adversarial eval |

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] ADR acepta lifecycle, provider boundary, route permission y privacy model.
- [ ] Capability vendor-neutral y Full API Parity pasan conformance.
- [ ] Audio >90 s, MIME/bytes inválidos y cross-workspace fallan cerrados.
- [ ] Audio terminal se elimina y failure produce reconciliación/señal.
- [ ] Raw audio/transcript no aparece en logs, metrics, audit ni errors.
- [ ] Retry/idempotency no duplica provider call ni outcome.
- [ ] Evals es/en/Spanglish/ruido/injection alcanzan thresholds definidos por ADR.
- [ ] TASK-1534 recibe fixtures completos y TASK-1530 sólo recibe transcript tras acción humana.
- [ ] Transcript/evidence distingue contenido hablado, normalización y cualquier inferencia; ninguna inferencia
  queda atribuida al operador.
- [ ] Permissions-Policy continúa negando micrófono fuera de `/producer`.
- [ ] `pnpm check && pnpm build` pasan con tests registrados.

## Verification

- `pnpm task:lint --task TASK-1533`
- Globe `pnpm check && pnpm build`
- conformance, isolation, limits, redaction, deletion/reconciliation y provider canary
- readback de audit/TTL sin contenido raw

## Closing Protocol

- [ ] Lifecycle/ruta/README/registry sincronizados.
- [ ] ADR/architecture, Handoff/runtime handoff y changelog reflejan estado real.
- [ ] Impact check TASK-1519, TASK-1530 y TASK-1534.
- [ ] QA/security/privacy/docs closure ejecutados.

## Follow-ups

- Streaming parcial sólo con evidencia de necesidad y task nueva.
- Retener como asset sólo con rights/consent y lifecycle separado.
