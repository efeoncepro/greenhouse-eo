# TASK-1364 — Assessment Validity Feedback Loop

## Delta 2026-07-10 (ejecución) — Open Questions resueltas + recalibración del join

- **Fuente de outcome (resuelta, dual con prioridad):** primaria = `greenhouse_serving.ico_member_metrics` (VIVA hoy: RpA/OTD/FTR mensual por member — desempeño operativo objetivo materializado por el ICO engine); secundaria = `greenhouse_hr.eval_summaries.overall_rating` (TASK-029, hoy sin filas — el adapter la soporta y siempre etiqueta la fuente). Pearson es invariante a escala → los outcomes se consumen en su escala nativa, sin normalización inventada.
- **Umbrales de muestra (resueltos):** n<10 → `insufficient_sample` (NO se reporta r); 10-29 → `preliminary`; ≥30 → `established`.
- **Join recalibrado:** el enlace application↔member NO va por `identity_profile_id` (ambiguo ante multi-application): usa el mapping durable de TASK-770 `greenhouse_hr.hiring_activation_request` (application_id ↔ member_id, UNIQUE por handoff). El score correlacionado es el **del momento de decidir** (snapshot de 1383 en `decisionHistory[]`), con fallback al rollup vigente; per-competencia vía `hiring_competency_result`.
- Estado de datos al implementar: 0 hires con assessment → el reader nace reportando `insufficient_sample` (degradación honesta verificada live).

## Delta 2026-07-10 — TASK-1383 dejó los contratos de datos que este loop necesita

- **Versionado de templates decidido e implementado**: un `template_id` con instancias es INMUTABLE (trigger DB sobre contenido y módulos; solo `status` muta) + columnas `version`/`supersedes_template_id`. Correlacionar por `template_id` es seguro: un id = un contenido congelado. Editar = crear versión nueva con supersede.
- **Score al momento de decidir, reconstruible**: `decideHiringApplication` ahora snapshotea server-side `prerequisitesSnapshot.assessment = {score, matchScore, scoredInstances, capturedAt}` en cada entrada de `decisionHistory[]` — aunque un finalize posterior sobreescriba `hiring_application.score`, el valor visto al decidir queda en el historial.
- **Integridad del AVG garantizada**: respuestas con UNIQUE a nivel DB (duplicados ya no pueden sesgar el rollup).


<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
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
- Status real: `COMPLETE 2026-07-10 — reader + evidencia AI-Act live; nace reportando insufficient_sample (0 hires con assessment — honesto por diseño); acumula evidencia con cada contratación de 770`
- Rank: `TBD`
- Domain: `agency`
- Blocked by: `none` (1360 complete)
- Branch: `task/TASK-1364-assessment-validity-feedback-loop`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cerrar el loop "¿el assessment realmente predice?": enlazar el score por competencia de una postulación con el **outcome real del hire** (quality-of-hire a 90 días / 6 meses) para medir la validez predictiva del test. Sin este loop no sabemos si el motor de assessment funciona — y con el EU AI Act, esa evidencia de validez es parte de la documentación técnica exigida para hiring-AI.

## Why This Task Exists

TASK-1360 calcula scores pero no verifica si predicen desempeño. Un test puede parecer riguroso y no predecir nada (o peor, discriminar sin señal válida). La disciplina de selección exige un **loop de validez**: comparar el score de assessment de los contratados contra su desempeño posterior. Es también el sustento de defensibilidad (job-relatedness) y un input del bias testing del AI Act.

## Goal

- Enlazar `hiring_application` (con su score/competency results) al `member` resultante y a una señal de desempeño temprana (90d/6m).
- Exponer un reader de validez: correlación score↔outcome por competencia/plantilla, con muestra suficiente.
- Dejar la evidencia de validez auditable (documentación técnica AI-Act).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (§Assessment)
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` (person-first: candidate → member sobre el mismo `identity_profile_id`)
- `docs/tasks/to-do/TASK-1360-assessment-engine-foundation.md`

Reglas obligatorias:

- El loop es **read/analítico**: NUNCA reescribe scores ni decide nada; produce evidencia de validez.
- El outcome de desempeño se consume de la fuente canónica (performance/HRIS/ICO), NUNCA se inventa (misma disciplina que payroll: métricas no inline).
- Muestra insuficiente = degradar honesto ("evidencia insuficiente"), nunca reportar una correlación con n pequeño como si fuera concluyente.
- El score de assessment sigue siendo advisory; este loop NO lo convierte en gate.

## Normative Docs

- `docs/tasks/to-do/TASK-770-hiring-to-hris-collaborator-activation.md` (candidate→member)
- `docs/epics/to-do/EPIC-011-hiring-ats-end-to-end-program.md`

## Dependencies & Impact

### Depends on

- `TASK-1360` (scores + `hiring_competency_result`)
- `TASK-770` (member activation — cierra `hiring_application` → `member`) `[verificar]`
- Señal de desempeño temprana (performance evals `greenhouse_hr.eval_*` / ICO / onboarding readiness) `[verificar cuál es la fuente canónica en Discovery]`

### Blocks / Impacts

- `TASK-1365` (fairness monitoring puede reusar el mismo join score↔outcome)
- Mejora iterativa del banco de preguntas (retirar preguntas sin poder predictivo)

### Files owned

- `src/lib/hiring/assessment/validity/**`
- `src/app/api/hiring/assessments/validity/**` (reader interno)
- `migrations/<ts>_task-1364-assessment-outcome-link.sql` (si hace falta materializar el join)
- `src/types/db.d.ts`

## Current Repo State

### Already exists

- Motor de assessment (TASK-1360): scores + competency results + rollup al application.
- Cadena candidate→member sobre `identity_profile_id` (TASK-770).
- Performance evals HR + ICO como posibles fuentes de outcome.

### Gap

- No hay enlace score↔outcome ni medición de validez predictiva.
- No hay evidencia de validez para la documentación técnica AI-Act.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: nuevo read model `assessment_validity` (join `hiring_competency_result` × outcome de desempeño); no muta scores
- Consumidores afectados: people-ops (reader interno), TASK-1365, gobernanza del banco
- Runtime target: `local` → `staging` → `production`

### Contract surface

- Contrato existente a respetar: `hiring_application`/`hiring_competency_result` (TASK-1360), fuente de performance canónica
- Contrato nuevo: reader `getAssessmentValidity(templateId|competencyId, window)` + ruta interna
- Backward compatibility: `compatible` (read-only, additive)
- Full API parity: la validez vive como reader canónico; UI/Nexa lo consumen

### Data model and invariants

- Entidades afectadas: read model / VIEW `assessment_validity` (score por competencia × outcome × muestra)
- Invariantes:
  - read-only; NUNCA reescribe scores ni convierte el score en gate
  - outcome de la fuente canónica, nunca inline
  - muestra < umbral → "evidencia insuficiente" (honest degradation), no correlación espuria
- Tenant/space boundary: interno; capability `hiring.assessment.read`
- Idempotency/concurrency: read-only
- Audit/outbox/history: la evidencia de validez es append-only/auditable (documentación AI-Act)

### Migration, backfill and rollout

- Migration posture: `additive|view refresh` (materializar el join si hace falta; sino solo reader)
- Default state: `read-only`
- Backfill plan: `none` (histórico se lee de los datos existentes)
- Rollback path: `revert PR` / drop view
- External coordination: `none`

### Security and access

- Auth/access gate: capability `hiring.assessment.read` (interno); NUNCA `client_*`
- Sensitive data posture: agregados; sin exponer PII per-candidato en el reporte de validez
- Error contract: `toHiringErrorResponse` + `captureWithDomain(err, 'hiring')`
- Abuse/rate-limit posture: N/A (reader interno)

### Runtime evidence

- Local checks: test del reader con muestra suficiente vs insuficiente (degradación honesta)
- DB/runtime checks: smoke del join score↔outcome contra PG dev
- Integration checks: N/A
- Reliability signals/logs: opcional signal "assessment.validity.insufficient_sample"
- Production verification sequence: migrate/view staging → reader smoke → prod

### Acceptance criteria additions

- [x] Source of truth (join score↔outcome) + contract surface + consumers nombrados.
- [x] Invariante read-only / no-gate / outcome-canónico explícito y con test.
- [x] Degradación honesta con muestra insuficiente.
- [x] Evidencia DB del join contra PG real.
- [x] Sin PII per-candidato en el reporte agregado.

## Capability Definition of Done — Full API Parity gate

- [x] Lógica en `src/lib/hiring/assessment/validity/**`, no en UI.
- [x] Modelado como reader canónico; sin write.
- [x] Read expuesto como recurso; sin command (read-only).
- [x] Reusa capability `hiring.assessment.read`; sin capability nueva (o grant + coverage si se agrega).
- [x] Camino programático: `/api/hiring/assessments/validity/**`; Nexa por construcción.
- [x] N/A write (no muta).
- [x] Un reader, muchos consumers.
- [x] Parity check = SÍ.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — EXECUTION LOG
     ═══════════════════════════════════════════════════════════ -->

### Execution Log (2026-07-10, Claude — local-first develop)

- **S1**: migración `20260710213822022` — `greenhouse_hr.assessment_validity_evidence` append-only (triggers anti-UPDATE/DELETE) para la documentación técnica AI-Act. Aplicada + verificada.
- **S2-S3**: `src/lib/hiring/assessment/validity/` — `stats.ts` (Pearson puro con null honesto, verdicts n<10/10-29/≥30), `get-validity.ts` (un query: activation_request 770 → member → outcome ICO rpa_avg primario / eval_summaries secundario etiquetado × score al decidir snapshot 1383 + per-competencia; agregados SIN PII), `evidence.ts` (snapshot inmutable). API GET (hiring.assessment.read) + POST evidencia (hiring.assessment.score) — cero capabilities nuevas.
- **S4**: 8/8 tests — Pearson/verdicts, read-only estático, no-PII en shapes, y **live contra PG real**: el join CTE+LATERAL+jsonb+date-math corre, degrada honesto (`insufficient_sample`, `outcomeSource:none` con 0 hires) y la evidencia rechaza UPDATE por trigger.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Score↔outcome link

- Resolver el join: `hiring_application` (score + competency results) → `member` (vía `identity_profile_id`, TASK-770) → señal de desempeño temprana (fuente canónica).
- Materializar como VIEW/read model si el join es caro.

### Slice 2 — Validity reader

- `getAssessmentValidity(templateId|competencyId, window)`: correlación score↔outcome por competencia/plantilla + tamaño de muestra + verdict (`válido` / `evidencia insuficiente`).
- Ruta interna `/api/hiring/assessments/validity/**` (capability-gated).

### Slice 3 — Audit / AI-Act evidence

- Persistir/exponer la evidencia de validez de forma auditable (documentación técnica AI-Act). Opcional signal de muestra insuficiente.

## Out of Scope

- El motor de assessment (TASK-1360).
- Fairness/adverse-impact (TASK-1365).
- Convertir el score en gate de decisión (prohibido — sigue advisory).

## Detailed Spec

Reusar el patrón de readers analíticos del repo (person-360 facets / ICO). El outcome de desempeño debe salir de la fuente canónica identificada en Discovery (performance evals HR, ICO, o onboarding readiness) — NUNCA inline. La correlación es evidencia, no un umbral automático.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (join) → Slice 2 (reader) → Slice 3 (audit/evidence). El reader no existe sin el join.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Correlación espuria con n pequeño reportada como concluyente | data | medium | umbral de muestra + verdict "insuficiente" + test | reporte muestra n |
| El loop se usa para convertir score en gate | hiring / legal | low | invariante read-only/advisory documentado + sin write | review |
| Outcome inventado/inline en vez de canónico | data | low | consumir fuente canónica; test | drift vs fuente |

### Feature flags / cutover

- Sin flag — read-only additive. Razón: no muta estado ni decide; solo lee.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1-3 | revert PR / drop view | <10 min | si |

### Production verification sequence

1. Migrate/view staging + verify join.
2. Reader smoke (muestra suficiente vs insuficiente).
3. Prod vía release pipeline.

### Out-of-band coordination required

- N/A — repo-only.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Existe el join score↔outcome (application→member→desempeño) sobre el mismo `identity_profile_id`.
- [x] `getAssessmentValidity` reporta correlación por competencia/plantilla + muestra + verdict, con degradación honesta si n es bajo.
- [x] El reader es read-only; NUNCA reescribe scores ni convierte el score en gate.
- [x] El outcome sale de la fuente canónica, no inline.
- [x] La evidencia de validez queda auditable (documentación AI-Act); sin PII per-candidato en agregados.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- Smoke DB del join contra PG dev

## Closing Protocol

- [x] `Lifecycle` sincronizado
- [x] archivo en la carpeta correcta
- [x] `docs/tasks/README.md` sincronizado
- [x] `Handoff.md` actualizado
- [x] `changelog.md` actualizado
- [x] chequeo de impacto cruzado (TASK-1360/1365)

## Follow-ups

- Retiro automático de preguntas sin poder predictivo (mejora del banco).
- Dashboard de validez para people-ops.

## Open Questions

- ¿Cuál es la señal de desempeño temprana canónica (performance evals HR vs ICO vs onboarding readiness)? Resolver en Discovery.
- ¿Umbral mínimo de muestra para reportar validez? Definir con criterio estadístico simple (n mínimo).
