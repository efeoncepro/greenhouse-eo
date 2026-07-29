# TASK-1537 — Globe Video Evidence, Provider Adapter and Expert Evaluation

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
- Domain: `platform`
- Blocked by: `TASK-1536`
- Branch: `task/TASK-1537-globe-video-evidence-provider-expert-eval`
- Legacy ID: `none`

## Summary

Implementa el execution plane del análisis: preflight determinístico, evidencia temporal densa, adapter
video-native Gemini/Vertex, challengers sobre evidence bundles y bake-off experto. Extiende la capability Full API
Parity de TASK-1536; ningún provider ni prompt aparece como backend alterno.

## Why This Task Exists

Un modelo puede producir comentarios plausibles con timestamps incorrectos. Globe necesita separar hechos
determinísticos, media derivatives, interpretación del modelo y validación experta antes de vender el resultado
como dirección creativa.

## Goal

- Generar scene map, clips densos, frames exactos, transcript/audio y preflight con identidades reproducibles.
- Implementar `VideoAnalysisPort` vendor-neutral con Gemini/Vertex como candidato inicial.
- Evaluar rutas con golden videos, labels ciegos y rúbricas creativas versionadas.
- Mantener toda ejecución dentro de los commands/readers/coverage/conformance de TASK-1536.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_VIDEO_EFFECTIVENESS_AGENT_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_MEDIA_DERIVATIVES_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`

Reglas obligatorias:

- Gemini/Vertex es adapter promovible, no identidad del domain.
- Todo finding sustantivo cita time range; frame precision exige frame exacto.
- Media se transforma sólo por `apps/media-derivatives`.
- Evals prueban calidad comparativa; no auto-promueven rutas ni aprueban creativos.

## Normative Docs

- `.codex/skills/greenhouse-globe/SKILL.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- TASK-1536 — contracts, aggregate, queue and report lifecycle.
- TASK-1528 / SPEC-010 — media derivatives and Range delivery.
- TASK-1458 / SPEC-003 — Evaluation Harness.
- TASK-1463/TASK-1470 — readiness and governed provider routing.

### Blocks / Impacts

- Bloquea TASK-1539, TASK-1540 y TASK-1541.
- Produce evidence profiles consumidos por TASK-1538 sin mezclarlos con outcome calibration.

### Files owned

- `../efeonce-globe/packages/domain/src/` — evidence planner/validator and `VideoAnalysisPort`.
- `../efeonce-globe/packages/provider-contract/src/` — semantic video-analysis request/outcome.
- `../efeonce-globe/apps/media-derivatives/src/` — additive analysis profiles.
- `../efeonce-globe/apps/creative-runner/src/` — provider execution adapter.
- `../efeonce-globe/packages/domain/src/evaluation.ts` and versioned fixtures/rubrics.

## Current Repo State

### Already exists

- Media derivative worker, governed provider adapters, Model Lab/Evaluation Harness and route readiness.
- Video assets and Range playback operational internal-only.

### Gap

- No video-analysis port, evidence planner, exact finding validator or expert-labeled analyzer bake-off exists.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-globe packages plus media-derivatives and creative-runner apps`
- Future candidate home: `remain-shared`
- Boundary: `VideoAnalysisPort and versioned evidence bundle consumed only by TASK-1536 domain workflow`
- Server/browser split: `media bytes, provider SDK, prompts and eval labels server-only; browser receives validated evidence DTOs`
- Build impact: `media worker/provider dependencies and fixtures; exact build inputs must enter every consumer image`
- Extraction blocker: `provider identity, governed media storage, queue checkpoints and route readiness`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `TASK-1536 reports plus immutable derivative/evidence records`
- Consumidores afectados: `worker, domain validator, Evaluation Harness, report readers`
- Runtime target: `Globe media-derivatives and creative-runner jobs`

### Contract surface

- Contrato existente a respetar: `TASK-1536 analysis lifecycle and SPEC-010 derivative identity`
- Contrato nuevo o modificado: `VideoAnalysisPort, evidence profiles, validated finding/evidence DTOs`
- Backward compatibility: `compatible and gated`
- Full API parity: `execution is reachable only through TASK-1536 governed command; eval uses the same primitive`

### Data model and invariants

- Entidades/tablas/views afectadas: `analysis attempts/evidence refs; no parallel report store`
- Invariantes que no se pueden romper:
  - derivative and frame identities bind source hash/generation/profile/transformer;
  - model interpretation cannot manufacture deterministic fact;
  - every model/prompt/rubric/media sampling version is recorded.
- Tenant/space boundary: `workspace authority follows the parent run; provider egress rechecked server-side`
- Idempotency/concurrency: `evidence profile intents content-addressed; provider attempts fenced/reconcilable`
- Audit/outbox/history: `adapter route, settings, attempt, cost/latency and sanitized verdict append to parent evidence`

### Migration, backfill and rollout

- Migration posture: `none or additive evidence fields only; confirm against TASK-1536 schema`
- Default state: `deterministic fake default; real adapters flags OFF`
- Backfill plan: `none`
- Rollback path: `disable route/adapter and retain evidence; revert derivative profile without deleting artifacts`
- External coordination: `Vertex region/model, IAM, retention and terms evidence; owned operationally by TASK-1541`

### Security and access

- Auth/access gate: `parent run capability plus promoted exact provider route`
- Sensitive data posture: `client video/audio/transcript; bounded retention and redacted logs`
- Error contract: `canonical unavailable/timeout/invalid-evidence errors; raw provider errors stay server-side`
- Abuse/rate-limit posture: `duration/size/FPS caps, budget, timeout, concurrency cap and circuit breaker`

### Runtime evidence

- Local checks: `fake adapter, fixtures, malformed timestamps, rapid cuts, no-audio and multilingual tests`
- DB/runtime checks: `evidence identities/readback and retry reconciliation`
- Integration checks: `bounded non-production Gemini/Vertex canary plus challenger bake-off`
- Reliability signals/logs: `adapter route, model/version, sampling, latency, cost, invalid citation rate`
- Production verification sequence: `fake → offline golden set → allowlisted real canary → blinded expert review`

### Acceptance criteria additions

- [ ] Evidence, contract, tenant, idempotency, rollback and runtime evidence are explicit and tested.
- [ ] Provider/data errors remain sanitized and private media never reaches unauthorized surfaces.

## Capability Definition of Done — Full API Parity gate

- [ ] TASK-1536 schemas/descriptors are extended version-compatibly, not forked.
- [ ] Provider execution remains behind `VideoAnalysisPort` and the governed runner.
- [ ] HTTP/SDK/MCP/UI cannot invoke provider or evidence workers directly.
- [ ] Coverage/conformance proves fake positive, provider blocked, timeout and invalid-evidence paths.
- [ ] Evaluation Harness calls the same request/read primitive used by product surfaces.
- [ ] Exact adapter/model/version appears in operator evidence, never as domain routing vocabulary.

## Scope

### Slice 1 — Deterministic evidence plane

- Add analysis derivative profiles, preflight, scene/time mapping, frames, transcript/audio and validators.
- Prove exact mapping against representative fixtures, including rapid cuts and variable frame rate.

### Slice 2 — Provider adapters

- Add `VideoAnalysisPort`, Gemini/Vertex adapter and deterministic fake.
- Add optional Claude/OpenAI evidence-bundle challengers only behind the same port and eval policy.

### Slice 3 — Expert evaluation and promotion evidence

- Build rights-cleared golden set, rubric versions, blinded labels and critical slices.
- Produce route recommendation/evidence through existing readiness governance; no auto-promotion.

## Out of Scope

- Domain lifecycle/store (TASK-1536), channel forecasting (TASK-1538), UI (TASK-1540) or commercial rollout (TASK-1541).
- Editing/generating media or treating a challenger evidence bundle as native video input.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Deterministic evidence → adapter → expert bake-off. No route promotion before citation validation and expert labels.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| plausible wrong timestamp | report trust | medium | exact validator + quarantine | invalid-citation rate |
| private-media egress mismatch | security/rights | low | current rights/region gate | egress-denied audit |
| rapid cuts missed | creative quality | medium | dense second pass | critical-slice recall |

### Feature flags / cutover

Per-adapter flags default OFF; deterministic fake remains available for conformance.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
| --- | --- | --- | --- |
| 1 | stop new profile intents; retain content-addressed evidence | <30 min | si |
| 2 | route flag/circuit OFF | <10 min | si |
| 3 | suspend eval/promotion evidence version | inmediato | si |

### Production verification sequence

1. Run deterministic fixture suite.
2. Execute bounded provider canary in non-commercial workspace.
3. Complete blinded expert review and critical-slice thresholds.
4. Publish readiness evidence; keep commercial flag OFF.

### Out-of-band coordination required

Provider model/region/retention approval and a creative-expert review panel.

## Acceptance Criteria

- [ ] Evidence bundle and every cited finding resolve to valid time/frame identities.
- [ ] Gemini/Vertex and fake adapters implement one vendor-neutral port.
- [ ] Golden set/bake-off records exact model, prompt, rubric and sampling versions.
- [ ] Full API Parity paths use the TASK-1536 command/readers without bypass.
- [ ] Provider route remains gated until expert and operational thresholds pass.

## Verification

- `cd ../efeonce-globe && pnpm check && pnpm build`
- `pnpm task:lint --task TASK-1537`
- `pnpm worker:build-contract-gate`
- `pnpm worker:runtime-deps-gate`

## Closing Protocol

- [ ] Lifecycle/file/README/Handoff/changelog reflect code vs rollout truth.
- [ ] Model/evidence versions and invalid-citation metrics are documented for TASK-1541.

## Follow-ups

- TASK-1538, TASK-1539, TASK-1540 and TASK-1541.
