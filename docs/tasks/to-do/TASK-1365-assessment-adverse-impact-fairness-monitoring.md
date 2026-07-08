# TASK-1365 — Adverse-Impact & Fairness Monitoring

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `EPIC-011`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency`
- Blocked by: `TASK-1360`
- Branch: `task/TASK-1365-assessment-adverse-impact-fairness-monitoring`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Monitorear el **adverse impact** del proceso de selección: tasas de avance/selección por grupo (heurística 4/5) + drift, de forma **agregada y privacy-safe** (self-ID voluntario, nunca decisión per-candidato). Es un requisito duro del EU AI Act (bias testing + monitoring de hiring-AI desde ago-2026) y la defensa contra discriminación indirecta.

## Why This Task Exists

TASK-1360 tiene los invariantes de fairness ("no auto-reject, job-related") pero no hay mecanismo para **vigilar** si el proceso, en agregado, filtra desproporcionadamente a algún grupo. Un paso puede ser aparentemente neutral y tener adverse impact. El AI Act exige bias testing + monitoring continuo; sin un monitor, la organización no puede detectar ni corregir el sesgo, ni documentar que lo controla.

## Goal

- Capturar señales demográficas **voluntarias, self-declaradas, separadas de la decisión** (nunca vistas por el evaluador).
- Computar tasas de avance/selección por grupo + ratio de impacto (heurística 4/5) + drift temporal, **solo agregado** (con umbral mínimo de grupo).
- Exponer un reader/monitor de fairness para people-ops + evidencia AI-Act; alertar sobre adverse impact.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (§Assessment + invariantes fairness)
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` (PII sensible)
- `docs/tasks/to-do/TASK-1360-assessment-engine-foundation.md`

Reglas obligatorias:

- La data demográfica es **voluntaria + self-declarada + separada del pipeline de decisión**: el evaluador NUNCA la ve; NUNCA entra al score ni al scorecard.
- El monitor es **solo agregado** con umbral mínimo de grupo (k-anonymity básico); NUNCA reporta ni decide per-candidato.
- El monitor **observa, no decide**: detecta adverse impact y alerta; la corrección es humana (revisar el paso, no ajustar cuotas automáticamente).
- Cumplir el AI Act (bias testing + monitoring + documentación) sin crear un riesgo de privacidad nuevo: minimización de datos, retención acotada, consentimiento explícito.

## Normative Docs

- `docs/epics/to-do/EPIC-011-hiring-ats-end-to-end-program.md`
- `docs/tasks/to-do/TASK-1364-assessment-validity-feedback-loop.md` (reusa el join application↔outcome)

## Dependencies & Impact

### Depends on

- `TASK-1360` (pipeline de assessment + `hiring_application` stages)
- `TASK-1364` (join application↔outcome, reusable) `[opcional, no bloqueante]`

### Blocks / Impacts

- Defensibilidad legal del proceso de selección; documentación técnica AI-Act.

### Files owned

- `src/lib/hiring/assessment/fairness/**`
- `src/app/api/hiring/assessments/fairness/**` (reader interno)
- `migrations/<ts>_task-1365-voluntary-demographics-and-fairness-view.sql`
- `src/types/db.d.ts`

## Current Repo State

### Already exists

- Pipeline de assessment + `hiring_application` con stages (TASK-1360).
- Person legal profile con patrón PII sensible (masked/reveal/audit) como referencia de rigor.

### Gap

- No hay captura de demografía voluntaria separada de la decisión.
- No hay cómputo de adverse impact (4/5) ni drift.
- No hay evidencia de bias testing para el AI Act.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (PII sensible + adverse-impact + AI-Act)
- Impacto principal: `reader`
- Source of truth afectado: nueva tabla `hiring_demographic_selfid` (voluntaria, separada) + read model `assessment_fairness` (agregado)
- Consumidores afectados: people-ops (reader), evidencia AI-Act
- Runtime target: `local` → `staging` → `production`

### Contract surface

- Contrato existente a respetar: `hiring_application` stages (TASK-1360)
- Contrato nuevo: captura self-ID (candidate-facing, opcional) + reader `getSelectionFairness(stage|template, window)`
- Backward compatibility: `compatible` (additive)
- Full API parity: fairness como reader canónico; el self-ID como command consentido

### Data model and invariants

- Entidades afectadas: `hiring_demographic_selfid` (`identity_profile_id` FK, categorías self-declaradas, `consent`, `captured_at`) **separada del scorecard**; read model `assessment_fairness` (agregado por grupo × stage)
- Invariantes:
  - la demografía NUNCA se une al score/decisión a nivel individual; el evaluador NUNCA la ve
  - el reader solo devuelve agregados con grupo ≥ umbral mínimo (sin reidentificación)
  - el monitor observa/alerta; NUNCA aplica cuotas ni ajusta decisiones automáticamente
  - consentimiento explícito + minimización + retención acotada
- Tenant/space boundary: interno; capability dedicada `hiring.assessment.fairness_read` (least-privilege, más restringida que `read`)
- Idempotency/concurrency: self-ID upsert por profile; reader read-only
- Audit/outbox/history: acceso al monitor auditado; evidencia AI-Act append-only

### Migration, backfill and rollout

- Migration posture: `additive` (tabla self-ID + view fairness)
- Default state: `flag OFF` (`HIRING_FAIRNESS_MONITOR_ENABLED`) hasta revisión legal/privacidad
- Backfill plan: `none` (self-ID es prospectivo + voluntario)
- Rollback path: `flag off` + revert PR + drop tabla
- External coordination: **revisión legal/privacidad** (qué categorías, consentimiento, retención por jurisdicción — Chile + global) antes de habilitar

### Security and access

- Auth/access gate: `hiring.assessment.fairness_read` (más restringida que `read`); self-ID capture = consentimiento del candidato
- Sensitive data posture: **categoría especial de PII**; separada, agregada, k-anon básico; NUNCA per-candidato al evaluador
- Error contract: `toHiringErrorResponse` + `captureWithDomain(err, 'hiring')`
- Abuse/rate-limit posture: N/A (reader interno); self-ID opcional

### Runtime evidence

- Local checks: test de que la demografía NUNCA se une a la decisión individual + test de umbral mínimo de grupo (no reidentificación)
- DB/runtime checks: smoke del cómputo 4/5 sobre datos sintéticos
- Integration checks: N/A
- Reliability signals/logs: signal `assessment.fairness.adverse_impact_detected` (ratio < 0.8)
- Production verification sequence: revisión legal → flag ON staging → smoke → flag ON prod

### Acceptance criteria additions

- [ ] Source of truth (self-ID separado + read model fairness) + contract surface + consumers nombrados.
- [ ] Invariante "demografía separada de la decisión + solo agregado + observa-no-decide" explícito y con test.
- [ ] Flag OFF default + revisión legal/privacidad como coordinación externa.
- [ ] Evidencia DB del cómputo 4/5 sobre datos sintéticos.
- [ ] PII de categoría especial con consentimiento + minimización + k-anon; sin reidentificación.

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica en `src/lib/hiring/assessment/fairness/**`, no en UI.
- [ ] Modelado como reader (fairness) + command consentido (self-ID), no click-handler.
- [ ] Read = reader agregado; write (self-ID) = command con consentimiento + capability.
- [ ] Capability `hiring.assessment.fairness_read` + grant a rol real (least-privilege) + coverage test mismo PR.
- [ ] Camino programático: `/api/hiring/assessments/fairness/**`; Nexa por construcción (solo agregado).
- [ ] N/A auto-decision (prohibido por diseño).
- [ ] Un reader, muchos consumers.
- [ ] Parity check = SÍ.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Voluntary self-ID capture (separated)

- Migración `hiring_demographic_selfid` (voluntaria, consentida, anclada a `identity_profile_id`, **separada** del scorecard/decisión).
- Command de captura consentida (candidate-facing opcional); el evaluador NUNCA lo ve.

### Slice 2 — Fairness read model + 4/5 monitor

- Read model `assessment_fairness` (agregado por grupo × stage/template) con umbral mínimo de grupo.
- `getSelectionFairness(stage|template, window)`: tasas por grupo + impact ratio (4/5) + drift; verdict + degradación honesta si muestra baja.

### Slice 3 — Signal + AI-Act evidence + governance

- Signal `assessment.fairness.adverse_impact_detected` (ratio < 0.8).
- Evidencia auditable para bias testing AI-Act; flag `HIRING_FAIRNESS_MONITOR_ENABLED` (registrar en ledger); revisión legal antes de prod.

## Out of Scope

- El motor de assessment (TASK-1360) y el validity loop (TASK-1364).
- Cualquier ajuste automático de decisiones/cuotas (prohibido — observa, no decide).
- Decisión per-candidato basada en demografía (prohibido).

## Detailed Spec

La demografía self-declarada es **categoría especial de PII**: consentimiento explícito, minimización, retención acotada, separación física del pipeline de decisión, agregación con k-anon básico. El monitor computa la heurística 4/5 (impact ratio = tasa del grupo con menor selección / tasa del grupo con mayor selección; < 0.8 = señal de adverse impact) — que es una **alerta para revisión humana del paso**, no un umbral que ajuste decisiones. Cumple el bias-testing del AI Act sin crear un riesgo de privacidad.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (self-ID separado) → Slice 2 (read model + monitor) → Slice 3 (signal + governance). El monitor no existe sin la captura.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Demografía se une a la decisión individual | identity / legal | medium | separación física + test de no-join + evaluador nunca la ve | test rojo |
| Reidentificación por grupos chicos | privacy | medium | umbral mínimo de grupo (k-anon) + solo agregado | reader devuelve "insuficiente" |
| Monitor ajusta cuotas/decisiones auto | hiring / legal | low | invariante observa-no-decide + sin write a decisión | review |
| PII especial sin base legal | legal | medium | consentimiento + minimización + revisión legal + flag OFF | flag/ledger |

### Feature flags / cutover

- `HIRING_FAIRNESS_MONITOR_ENABLED` (default `false`). Flip a `true` solo tras revisión legal/privacidad. Revert: flag off + redeploy. Registrar en `FEATURE_FLAG_STATE_LEDGER.md`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | flag off + drop tabla self-ID | <10 min | si |
| Slice 2-3 | flag off + revert PR | <10 min | si |

### Production verification sequence

1. Revisión legal/privacidad (categorías, consentimiento, retención).
2. Migrate staging + verify separación (self-ID no une a decisión).
3. Flag ON staging + smoke 4/5 sobre datos sintéticos + verify umbral mínimo.
4. Prod tras sign-off legal.

### Out-of-band coordination required

- **Revisión legal/privacidad** (Chile + jurisdicciones de hire global) sobre qué categorías capturar, consentimiento y retención. Bloqueante para habilitar el flag en prod.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La demografía es voluntaria, consentida, self-declarada y **separada** del scorecard/decisión; el evaluador NUNCA la ve.
- [ ] El reader devuelve solo agregados con grupo ≥ umbral mínimo (sin reidentificación).
- [ ] Se computa la heurística 4/5 (impact ratio) + drift; el monitor **alerta**, NUNCA ajusta decisiones/cuotas.
- [ ] Signal `assessment.fairness.adverse_impact_detected` cuando ratio < 0.8.
- [ ] Flag `HIRING_FAIRNESS_MONITOR_ENABLED` default OFF + registrado en el ledger; revisión legal antes de prod.
- [ ] PII de categoría especial con consentimiento + minimización + retención; test de no-join a la decisión individual.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm flags:audit --strict --no-vercel` (flag registrado)
- Smoke DB del cómputo 4/5 sobre datos sintéticos

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1360/1364)
- [ ] flag registrado en `FEATURE_FLAG_STATE_LEDGER.md`

## Follow-ups

- Dashboard de fairness para people-ops.
- Extender el monitor a etapas previas (apply→screen) además de assessment.

## Open Questions

- ¿Qué categorías demográficas capturar por jurisdicción (Chile + global) y con qué base legal? Requiere revisión legal antes de implementar.
- ¿Umbral mínimo de grupo (k) para agregación segura? Definir con criterio de privacidad.
