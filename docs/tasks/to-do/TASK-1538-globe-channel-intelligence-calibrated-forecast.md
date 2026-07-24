# TASK-1538 — Globe Channel Intelligence, Outcome Calibration and Forecasting

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
- Backend impact: `migration`
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `TASK-1536`
- Branch: `task/TASK-1538-globe-channel-intelligence-calibrated-forecast`
- Legacy ID: `none`

## Summary

Entrega políticas versionadas de channel fit, ingest gobernado de outcomes y forecasting calibrado por niveles.
Nace Full API Parity con `channel-policy`/`calibration` readers y `observe-outcome` command; sin evidencia
first-party suficiente retorna `forecast_not_eligible`, nunca un número inventado.

## Why This Task Exists

La evaluación creativa puede sugerir fit de canal, pero CTR/CPA/ROAS dependen también de audiencia, delivery,
oferta, landing, frecuencia y medición. Mezclar juicio del video con predicción causal produciría falsa precisión
y un riesgo comercial material.

## Goal

- Versionar reglas por canal/placement/formato y separar channel fit de forecast.
- Persistir outcomes consentidos y comparables con denominador, ventana, provenance y calidad.
- Implementar Level 0/1/2 y `ForecastPort` con eligibility, baseline, intervalos, drift y OOD.
- Exponer toda lectura/escritura por el API Contract Spine con aislamiento y redacción.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_VIDEO_EFFECTIVENESS_AGENT_V1.md` (§Channel Intelligence)
- `docs/architecture/creative-studio/EFEONCE_GLOBE_VIDEO_EFFECTIVENESS_AGENT_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`
- `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md`

Reglas obligatorias:

- Creative assessment, channel fit y performance forecast son productos distintos.
- Level 2 requiere política versionada, cohorte comparable, baseline, error de calibración y OOD check.
- Forecast es intervalo/probabilidad relativa, nunca garantía ni causalidad.
- Outcomes nuevos se anexan; jamás mutan el reporte original.

## Normative Docs

- `.codex/skills/greenhouse-globe/SKILL.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- TASK-1536 — report/run identities and core capability.
- SPEC-008 — responsibilities for outcome ingestion/review.
- Existing Globe Postgres/audit and Studio Credits foundations.

### Blocks / Impacts

- TASK-1540 consumes Level 0/1/2 eligibility and display-safe forecast DTOs.
- TASK-1541 may enable Level 0 before Level 2; rollout cannot bypass eligibility.
- Complements TASK-1478 unit-economics calibration; does not reuse cost data as campaign outcome evidence.

### Files owned

- `../efeonce-globe/packages/contracts/src/` — channel/outcome/calibration DTOs.
- `../efeonce-globe/packages/domain/src/` — policy, outcome command, eligibility and `ForecastPort`.
- `../efeonce-globe/packages/database/src/` and migrations — policies/observations/calibration versions.
- `../efeonce-globe/apps/studio-web/src/app.ts` and `../efeonce-globe/packages/sdk/src/index.ts` — spine wiring.
- Evaluation/calibration jobs under the existing Globe worker ownership confirmed in Discovery.

## Current Repo State

### Already exists

- Analysis/report architecture, tenant-aware database and API Contract Spine.
- Credit/unit-economics work and general evaluation infrastructure.

### Gap

- No channel policy registry, outcome observation authority, forecast eligibility or calibrated model exists.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-globe packages/domain/contracts/database plus existing worker runtime`
- Future candidate home: `remain-shared`
- Boundary: `channel-policy/calibration readers, observe-outcome command and ForecastPort`
- Server/browser split: `raw outcomes, calibration cohorts/models and joins server-only; browser receives bounded projections`
- Build impact: `calibration job inputs and model artifacts must be versioned; no ad-hoc notebook runtime dependency`
- Extraction blocker: `tenant data isolation, consent/purpose, report joins and Globe Postgres transaction/audit`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `migration`
- Source of truth afectado: `versioned channel policies, outcome observations and calibration revisions`
- Consumidores afectados: `analysis domain, UI, HTTP/SDK/MCP, calibration worker and operators`
- Runtime target: `Globe API, Postgres and bounded calibration worker`

### Contract surface

- Contrato existente a respetar: `TASK-1536 report identity and immutable evidence`
- Contrato nuevo o modificado: `channel-policy/calibration readers, observe-outcome command, ForecastPort`
- Backward compatibility: `compatible and gated`
- Full API parity: `every read/write has schemas, descriptor, HTTP/SDK path, eight-surface coverage and conformance`

### Data model and invariants

- Entidades/tablas/views afectadas: `new policy, observation, calibration and forecast-evidence records`
- Invariantes que no se pueden romper:
  - outcomes include metric/window/unit/denominator/exclusions and provenance;
  - observations never rewrite the originating report;
  - forecast output cites calibration version, population, baseline and limitations;
  - cross-client raw outcomes never enter another tenant's report.
- Tenant/space boundary: `workspace-derived writes; only explicitly approved aggregate learning crosses cohorts`
- Idempotency/concurrency: `observation source fingerprint; immutable calibration revision; fenced training/eval job`
- Audit/outbox/history: `actor/purpose/consent/source, policy revision, inclusion/exclusion and drift decisions append-only`

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `Level 0 enabled only after policy validation; Level 1/2 flags OFF`
- Backfill plan: `dry-run inventory; ingest only allowlisted, consented, schema-valid first-party outcomes`
- Rollback path: `disable forecast level/version; preserve observations and prior immutable reports`
- External coordination: `Data/Privacy/Creative/Growth owners approve purpose, metrics and calibration thresholds`

### Security and access

- Auth/access gate: `separate observe-outcome and calibration-operator capabilities`
- Sensitive data posture: `campaign/client performance data; minimize, aggregate and redact direct identifiers`
- Error contract: `forecast_not_eligible, out_of_distribution and canonical sanitized spine errors`
- Abuse/rate-limit posture: `observation quotas, replay fingerprint, minimum cohort/privacy thresholds and drift circuit`

### Runtime evidence

- Local checks: `policy fixtures, leakage tests, eligibility thresholds, calibration and OOD tests`
- DB/runtime checks: `migration/RLS/readback, duplicate observation and immutable calibration revision`
- Integration checks: `shadow replay against allowlisted first-party cohort; no UI number for ineligible slice`
- Reliability signals/logs: `eligibility rate, calibration error, drift, OOD, excluded observations and stale policy`
- Production verification sequence: `Level 0 → shadow Level 1 → one approved Level 2 slice → staged expansion`

### Acceptance criteria additions

- [ ] Data definitions, consent/purpose, tenant isolation, replay and immutable calibration are implemented.
- [ ] Numeric output is impossible when eligibility fails.
- [ ] Runtime evidence includes leakage, drift and OOD negatives.

## Capability Definition of Done — Full API Parity gate

- [ ] Channel/outcome/calibration schemas and capabilities are versioned in contracts.
- [ ] `observe-outcome` is a governed idempotent command with fine capability and audit.
- [ ] Channel-policy/calibration are canonical readers over one source of truth.
- [ ] HTTP/SDK methods and all eight surface coverage states ship in the same change.
- [ ] Conformance proves eligible/ineligible/OOD/access-denied paths.
- [ ] UI/MCP/agents consume redacted DTOs and cannot query raw cohorts or calibration stores.

## Scope

### Slice 1 — Channel policy and Level 0

- Implement versioned policies for declared channel/placement/format and qualitative fit outcomes.
- Expose reader and report integration without numeric performance claims.

### Slice 2 — Outcome observation and Level 1

- Add schemas, command, additive migration, consent/purpose/provenance and baseline comparisons.
- Implement safe cross-version joins and shadow relative signals.

### Slice 3 — Calibrated Level 2

- Implement eligibility/OOD/drift, immutable calibration revisions and `ForecastPort`.
- Prove at least one approved slice or remain honestly `forecast_not_eligible`; no global forecast claim.

## Out of Scope

- Ads-platform attribution engine, autonomous campaign optimization or cross-client raw-data sharing.
- UI visualization (TASK-1540) and general commercial enablement (TASK-1541).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Level 0 → outcome authority/Level 1 shadow → calibrated Level 2. Level 2 cannot activate without real threshold
evidence and owner sign-off.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| false precision | forecast | high | eligibility + intervals + limitations | calibration error |
| tenant leakage | data | low | RLS + aggregate-only policy | leakage test/signal |
| drifted model | forecast | medium | versioned drift circuit | drift/OOD rate |

### Feature flags / cutover

Separate Level 0/1/2 flags; Level 2 default OFF and scoped by calibration version/slice.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
| --- | --- | --- | --- |
| 1 | policy version/flag rollback | inmediato | si |
| 2 | stop new observations; retain append-only records | <1 deploy | si |
| 3 | suspend calibration version and return ineligible | inmediato | si |

### Production verification sequence

1. Validate Level 0 policies and redacted readers.
2. Run outcome ingestion in allowlisted shadow mode.
3. Review calibration/leakage/OOD evidence.
4. Enable one Level 2 slice; monitor before expansion.

### Out-of-band coordination required

Data/Privacy/Growth sign-off and access to consented first-party outcome data.

## Acceptance Criteria

- [ ] Channel fit works independently of forecast eligibility.
- [ ] Outcomes are append-only, typed, consented and tenant-isolated.
- [ ] Eligible forecast returns interval/baseline/population/error/limitations and `causalityClaim=false`.
- [ ] Ineligible/OOD/drifted slices return no numeric forecast.
- [ ] Full API Parity checklist and conformance pass.

## Verification

- `cd ../efeonce-globe && pnpm check && pnpm build`
- `pnpm task:lint --task TASK-1538`
- Approved shadow calibration report and tenant-leakage negative.

## Closing Protocol

- [ ] Lifecycle/file/README/Handoff/changelog reflect the highest actually enabled forecast level.
- [ ] Calibration version, eligible slices and disabled slices are documented for TASK-1541.

## Follow-ups

- TASK-1540 and TASK-1541.
