# TASK-1528 — Globe Media Derivatives and Range Delivery

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
- Epic: `EPIC-028`
- Status real: `Diseno`
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
- Servir bytes autorizados con Range `206/416`, MIME/length correctos y backpressure.
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
  - source generation y recipe version fijan identidad;
  - un derivado nunca reemplaza el original;
  - `412` sólo acepta readback equivalente;
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

- Auth/access gate: session/service capability + visibility vigente
- Sensitive data posture: bytes privados, sin signed URL durable
- Error contract: `range_invalid|not_ready|access_denied|temporarily_unavailable`
- Abuse/rate-limit posture: bounds, concurrency, byte/time caps y backpressure

### Runtime evidence

- Local checks: deterministic recipes, `412`, replay y parser Range
- DB/runtime checks: migrations/readback y leases
- Integration checks: Image thumbnail, Video poster/transcode y Audio waveform
- Reliability signals/logs: derivative lag/failure/backlog y range throughput/errors
- Production verification sequence: shadow metadata → allowlist → canaries → load/soak

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Readers/commands/coverage existen para metadata y lifecycle.
- [ ] Byte gateway no permite bypass de eligibility/visibility.
- [ ] SDK/CLI/E2E consumen contracts canónicos.

<!-- ZONE 2 — PLAN MODE -->

## Scope

### Slice 1 — Derivative contract and schema

- Intents, records, recipes, source generation y history.

### Slice 2 — Transform workers

- Thumbnail/poster/transcode/waveform con leases, caps y result verification.

### Slice 3 — Range gateway

- `200/206/416`, conditional headers, backpressure y authorization por request.

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

- [ ] Las tres modalidades producen derivados versionados verificables.
- [ ] Range entrega `206` válido y `416` correcto, sin bufferizar archivos completos.
- [ ] Pending/rejected/cross-workspace nunca sirve bytes.
- [ ] Replay y `412` no sobrescriben ni duplican.
- [ ] Load test demuestra memoria acotada y backpressure.

## Verification

- `pnpm check`
- `pnpm build`
- tests DB/worker/gateway
- canary y load internal

## Closing Protocol

- [ ] Lifecycle/registry/README/handoff sincronizados.
- [ ] ADR-008 recibe evidencia, no reglas duplicadas.
- [ ] QA/docs gates verdes.
