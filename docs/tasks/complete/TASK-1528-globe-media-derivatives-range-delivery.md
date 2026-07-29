# TASK-1528 — Globe Media Derivatives and Range Delivery

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `complete`
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
- Epic: `EPIC-028`
- Status real: `Desplegado y verificado internal-only: 4 slices completos, canary 3 modalidades verde, flags ON, IaC No changes`
- Rank: `TBD`
- Domain: `creative|media|delivery`
- Blocked by: `none`
- Branch: `task/TASK-1528-globe-media-derivatives-range-delivery`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Implementar los build units de derivados versionados y serving multimedia de ADR-008: thumbnails, posters,
transcodes y waveforms producidos por workers separados, más un gateway autorizado con HTTP Range real,
backpressure y memoria acotada. Los originales privados permanecen inmutables y nunca son un cache de UI.

## Why This Task Exists

Cards y viewer consumen hoy originales y el gateway no demuestra `206/416` extremo-a-extremo. Esto degrada
rendimiento, hace frágil el video/audio y mezcla transformación con serving. Escalar requiere intents/records
versionados, workers idempotentes y serving que reautorice cada solicitud.

## Goal

- Persistir intents/records de derivados con recipe/version, source generation y digest.
- Producir derivados por workers acotados, reintentables e independientes.
- Servir bytes autorizados desde GCS con Range nativo `206/416`, MIME/length correctos y backpressure.
- Medir lag, fallos, throughput y cache hit sin exponer originales pending.

## Architecture Alignment

- `docs/architecture/creative-studio/EFEONCE_GLOBE_MEDIA_DELIVERY_LIFECYCLE_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`

Reglas obligatorias:

- Original privado inmutable; derivado versionado first-class y reproducible.
- Transform worker, serving gateway y governance worker conservan ownership separado.
- Same-key `412` exige readback hash/metadata; jamás overwrite.
- Cada request Range reautoriza workspace/asset/visibility; signed URLs durables no llegan al browser.
- La identidad exacta del derivado incluye `workspace + source asset + source object generation + source sha256 +
  media profile + recipe id/version + output mime`; cambiar cualquiera crea otro record/key.
- El browser obtiene un media ticket corto, session-bound, audience-bound y no reutilizable entre workspace/asset;
  el ticket no sustituye la reautorización server-side ni contiene un URL durable de GCS.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/tasks/in-progress/TASK-1521-globe-commercial-runtime-enablement.md`

## Dependencies & Impact

### Depends on

- `TASK-1467`, `TASK-1490`, `TASK-1503` y ADR-008.

### Blocks / Impacts

- Desbloquea previews robustos de `TASK-1526` y evidencia media de `TASK-1521`.

### Files owned

- contracts/domain/database de derivative intents/records en `../efeonce-globe/packages/`
- worker de transforms dedicado en `../efeonce-globe/apps/`
- gateway/serving en `../efeonce-globe/apps/studio-web/`
- IaC, observability y tests media/Range asociados

## Current Repo State

### Already exists

- Originales content-addressed privados, output retrieval autorizado y workers Cloud Run Jobs.

### Gap

- No existen derivados persistidos, transform queue/workers ni Range real extremo-a-extremo.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-globe packages + transform worker + studio/API gateway + GCS`
- Future candidate home: `worker`
- Boundary: `derivative intent/record + authorized media range gateway`
- Server/browser split: transforms/storage/auth server-side; browser recibe bytes/ranges autorizados
- Build impact: `runtime multimedia pesado aislado del web/API bundle`
- Extraction blocker: storage authority, GCS generation preconditions y asset governance

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `derivative intents/records; original authority no cambia`
- Consumidores afectados: `feed|viewer|download|SDK|ops`
- Runtime target: `worker + API gateway`

### Contract surface

- Contrato existente a respetar: ADR-008, asset provenance y output retrieval
- Contrato nuevo o modificado: derivative request/read + byte serving Range
- Backward compatibility: `compatible y gateada`
- Full API parity: metadata por reader; creation/retry por command/job; bytes por gateway autorizado

### Data model and invariants

- Entidades/tablas/views afectadas: intents/records/attempts aditivos
- Invariantes que no se pueden romper:
  - source generation, source digest, profile y recipe version fijan identidad exacta;
  - un derivado nunca reemplaza el original;
  - `412` sólo acepta readback equivalente en generation, hash, size, MIME y metadata canónica;
  - pending/rejected no sirve bytes.
- Tenant/space boundary: trusted context + asset authority
- Idempotency/concurrency: content key + source generation + recipe version + lease
- Audit/outbox/history: intent/attempt/result append-only

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `disabled`
- Backfill plan: dry-run/allowlist por assets piloto
- Rollback path: flag OFF + detener worker; originales intactos
- External coordination: images/codecs, GCS IAM, Cloud Run Job y límites

### Security and access

- Auth/access gate: session/service capability + visibility y governance eligibility vigentes en cada request
- Sensitive data posture: bytes privados, sin signed URL durable
- Error contract: `range_invalid|not_ready|access_denied|temporarily_unavailable`
- Abuse/rate-limit posture: bounds, concurrency, byte/time caps y backpressure

### Runtime evidence

- Local checks: deterministic recipes, `412`, replay y parser Range
- DB/runtime checks: migrations/readback y leases
- Integration checks: Image thumbnail, Video poster/transcode y Audio waveform
- Reliability signals/logs: derivative lag/failure/backlog, bytes/latencia por perfil, Range `200/206/416`,
  authorization denials, upstream read amplification, memoria/stream aborts y cache hit/miss
- Production verification sequence: shadow metadata → allowlist → canaries → load/soak

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects.
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [x] Migration/backfill/rollback posture is explicit and proportional to risk.
- [x] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [x] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [x] Readers/commands/coverage existen para metadata y lifecycle.
- [x] Byte gateway no permite bypass de eligibility/visibility.
- [x] SDK/CLI/E2E consumen contracts canónicos.

## Active Execution Log

### 2026-07-24 — Implementación completa + canary internal-only (autorizado end-to-end)

**Slices (todos en `../efeonce-globe`, `pnpm check` + `pnpm build` verdes por slice):**
- **Slice 1** (`4ab777c`↑): catálogo gobernado de 6 perfiles como DATA versionada (thumb/preview WebP,
  poster, transcode MP4/H.264/AAC 720p, waveform peaks JSON, preview AAC), identidad exacta
  `(sourceSha256, sourceObjectGeneration, profileId, profileVersion, transformerVersion, outputMime)`,
  migración `0029` (intents con leases/fencing, records/attempts append-only por trigger, RLS por workspace +
  carril de scan del worker), store durable con `SKIP LOCKED` + fence, command `request` gateado por
  `GLOBE_MEDIA_DERIVATIVES_ENABLED` (default OFF) con ownership vía el primitive canónico `authorizeOwnedOutput`,
  capabilities `globe.media.derivative.read|operate` con coverage de 8 superficies.
- **Slice 2**: app `apps/media-derivatives` (Cloud Run Job, debian + ffmpeg pinneado por versión —
  cambiarlo exige bump de `MEDIA_TRANSFORMER_VERSION`), batch acotado por workspace, descargas
  PINNED a la object generation de la identidad (drift = fallo permanente), planes ffmpeg deterministas por
  perfil + post-proceso de waveform peaks, upload content-addressed al bucket separado de derivados con
  `ifGenerationMatch=0` y reconciliación de `412` por readback. IaC: bucket + SAs + IAM Cloud SQL + rol
  storage get/create (sin delete — GC es TASK-1529) + Job + Scheduler + alertas ERROR/WARNING; workflows
  prepare/deploy/rollback; api proyecta el flag.
- **Slice 3**: gateway `GET /v1/media/:sha256` como authority gateway — autentica, verifica media ticket
  principal-bound (HMAC `globe-media-ticket-secret`, TTL 120s), re-corre ownership NOW, resuelve la
  representación READY y hace passthrough de UN Range válido a GCS con backpressure (`GcsOutputRetrieval.openByteStream`);
  200/206/416 nativo, sin arrayBuffer/Blob/base64; multipart rechazado. Ticket mint como reader gobernado;
  BFF reenvía `x-globe-media-ticket`. SDK tipado. Flag `GLOBE_MEDIA_RANGE_GATEWAY_ENABLED` default OFF.
- **Slice 4** — canary: fix de IAM (api_runtime necesitaba read en el bucket de derivados) + mapeo honesto de
  errores (storage → `dependency_unavailable`, not_ready → `dependency_unavailable`, no `internal_error`).

**Rollout aplicado**: CI verde; `tofu apply` de la infra; secret `globe-media-ticket-secret` publicado; migración
`0029` aplicada (`pending=[]`); grants DB del worker `ready:true`; imagen worker `sha256:920bfc2f…`; Job habilitado;
deploys api/studio/worker success; flags encendidos y persistidos en git; `tofu plan` final **No changes**.

**Evidencia de canary (internal-only, assets reales del workspace `greenhouse-org:efeonce`):**
- Request 3 modalidades → 6 intents; worker (2 ticks) → **6 ready / 0 failed**, dims correctas:
  card-thumb 512×288, viewer-preview 1600×900, video.poster 1280×720, video.preview-transcode 1280×720/4033ms,
  audio.preview-stream 6269ms, audio.waveform-peaks JSON.
- Range gateway (video transcode): full **200** (920832 bytes streamed), partial **206** `bytes 0-1023/920832`,
  suffix **206** `bytes 920332-920831/920832`, unsatisfiable **416** `bytes */920832`, multipart **400**.
  image thumb y audio preview: serve **200**.
- Negativos de seguridad: representación manipulada **403**, experiment manipulado **403**, ticket forjado **403**,
  representación no-lista **503 dependency_unavailable** (honesto, retryable).
- Idempotencia/no-duplicación: re-run del worker `claimed=0`; **6 intents / 6 ready records / 6 attempts**
  (un record terminal por identidad).
- tokenCreator temporal del canary: otorgado → usado → **revocado con corte verificado**.

**Commits Globe**: `4ab777c` (slices 1-3) · `4f88050` (ffmpeg pin real) · `212d087` (job image) ·
`de2f0d4` (grant script) · `f0d2f31` (canary fixes) · `038fafd` (flags ON post-canary).

<!-- ZONE 2 — PLAN MODE -->

## Scope

### Slice 1 — Derivative contract and schema

- Intents, records, recipes, source generation/digest, identidad exacta por perfil y history.

### Slice 2 — Transform workers

- Perfiles mínimos explícitos y versionados:
  - imagen: thumbnail card y preview viewer con dimensiones, fit, calidad y MIME;
  - video: poster y transcode preview con dimensiones, codec/container, bitrate/fps/audio policy;
  - audio: waveform bins y preview stream con sample rate/channels/codec/container.
- Workers con leases, caps y result verification; ningún perfil queda implícito en defaults de librería.

### Slice 3 — Range gateway

- Media ticket efímero session-bound y `200/206/416` nativo contra GCS, conditional headers, cancelación,
  backpressure y authorization/eligibility por request. No `arrayBuffer()` ni Blob completo en gateway/cards.

### Slice 4 — Canary and load

- Tres modalidades, `412`, negativos de acceso y memoria/throughput medidos.

## Out of Scope

- Feed state merge (`TASK-1525`) y UI (`TASK-1526`).
- Orphan GC (`TASK-1529`).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

`schema → workers → gateway → canary/load`.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| CPU/memoria no acotada | worker | medium | hard caps/backpressure | transform resource saturation |
| bytes sin autoridad | gateway | low | auth por request | access audit |
| overwrite silencioso | storage | low | generation preconditions | derivative conflict |

### Feature flags / cutover

Flags separados por derivative worker y Range gateway, default OFF.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---:|---|
| 1–2 | detener worker/flag OFF | <10 min | sí |
| 3–4 | gateway antiguo para originales elegibles | <10 min | sí |

### Production verification sequence

1. Tests/migration.
2. Dry-run e allowlist.
3. Canaries Image/Video/Audio.
4. Range/load y soak.

### Out-of-band coordination required

Revisión de codecs/images, límites Cloud Run y costo de storage/egress.

## Acceptance Criteria

- [x] Las tres modalidades producen derivados versionados verificables.
- [x] Cada perfil tiene identidad, dimensiones/codec/calidad y output MIME versionados; no depende de defaults.
- [x] Range entrega `206` válido y `416` correcto extremo-a-extremo desde GCS, sin descargar o bufferizar el
      archivo completo en servidor ni en cards.
- [x] Pending/rejected/cross-workspace nunca sirve bytes.
- [x] Media tickets expiran, están ligados a sesión/audience/workspace/asset y fallan ante revocación o drift.
- [x] Replay y `412` no sobrescriben ni duplican; readback compara generation/hash/size/MIME/metadata.
- [x] Load test demuestra memoria acotada, cancelación, backpressure y read amplification acotado.

## Verification

- `pnpm check`
- `pnpm build`
- tests DB/worker/gateway
- canary y load internal

## Closing Protocol

- [x] Lifecycle/registry/README/handoff sincronizados.
- [x] ADR-008 recibe evidencia, no reglas duplicadas.
- [x] QA/docs gates verdes.
