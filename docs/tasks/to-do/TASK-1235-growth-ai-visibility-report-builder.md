# TASK-1235 — Growth AI Visibility: Report Builder

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
- Backend impact: `command`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ai|reliability`
- Blocked by: `TASK-1227`
- Branch: `task/TASK-1235-growth-ai-visibility-report-builder`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir el artefacto `grader_report` (aggregate §7.7 del arch): a partir del `grader_score` + `normalized_findings`, generar un reporte versionado con narrativa de gaps + recomendaciones accionables (§8.4), separando output **public-safe** del **internal**. NO crea UI, no es público, no escribe HubSpot — es el primitive de reporte que las superficies posteriores consumen.

## Why This Task Exists

TASK-1227 dejó el `grader_score` (7 dimensiones, determinista) pero un score crudo no es un entregable: el valor comercial del grader (ADR) es el **reporte** que muestra al prospecto sus gaps + qué hacer (pre-pitch artifact). Sin este primitive, la superficie pública, el admin review y el HubSpot handoff no tienen qué mostrar/enviar. El arch ya define `grader_report` (§7.7) + el recommendation engine (§8.4, gap→recomendación); falta materializarlo como primitive server-side gobernado, public-safe.

## Goal

- Materializar `grader_report` versionado derivado de score + findings (recomputable, sin LLM en el score).
- Mapear gaps por dimensión a recomendaciones accionables (§8.4) de forma determinista/explicable.
- Separar el DTO public-safe (sin raw provider text/prompts) del internal completo; respetar `insufficient_data`/`review_required` (no emitir reporte definitivo sin gate).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §7.7 (`grader_report`), §8.4 (recommendation engine), §Delta 2026-06-24 (invariantes scoring), runtime contract (público bounded + safe, sin guarantees).
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — un primitive, muchos consumers.
- `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md`.

Reglas obligatorias:

- El reporte se deriva SOLO de `grader_score` + `normalized_findings` versionados; ningún LLM asigna score ni inventa gaps/recomendaciones (mapeo determinista; el copy puede ser plantilla).
- Public-safe NUNCA incluye raw provider text, prompts completos ni excerpts sensibles.
- Si el score es `insufficient_data`/`review_required`, el reporte refleja ese estado (no precisión falsa, no auto-release).
- Competencia permitida pero sin lenguaje difamatorio; preservar citas/evidencia.

## Normative Docs

- `docs/tasks/complete/TASK-1227-growth-ai-visibility-normalization-scoring-engine.md` — score + findings + DTO + gates (dependencia directa).
- `docs/tasks/complete/TASK-1226-growth-ai-visibility-provider-adapter-foundation.md` — schema `greenhouse_growth`.

## Dependencies & Impact

### Depends on

- `TASK-1227` (complete) — `grader_score`, `normalized_findings`, `toPublicSafeScore`, review gates.
- `TASK-1226` (complete) — schema `greenhouse_growth`.

### Blocks / Impacts

- Bloquea la superficie pública/report del grader (qué se muestra/envía).
- Bloquea el HubSpot handoff (`primary_gap`, `recommended_motion` salen del reporte).
- Habilita el admin evidence review (revisar/aprobar reportes `review_required`).

### Files owned

- `src/lib/growth/ai-visibility/report/**` — builder + recommendation mapping + DTO public/internal.
- `src/lib/growth/ai-visibility/__tests__/**` — tests.
- migrations/ — `greenhouse_growth.grader_reports` si se persiste (additive); o derivar on-read en V1 (decidir en Discovery).
- `src/app/api/admin/growth/ai-visibility/runs/[runId]/report/**` — endpoint admin interno (read), opcional.

## Current Repo State

### Already exists

- `grader_score` (7 dims con reasons/evidenceCount/confidence) + `normalized_findings` + `toPublicSafeScore` + review gates (`scoreStatus`/`reviewReasons`).
- Recommendation table conceptual en el arch §8.4 (gap→acción), aún no materializada.

### Gap

- No existe `grader_report` ni el mapeo gap→recomendación en código.
- No hay separación report-level public/internal (existe a nivel score, falta a nivel reporte narrativo).
- No hay tabla `grader_reports` (si se decide persistir).

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command` (derivación de reporte).
- Source of truth afectado: derivado de score+findings; opcional `greenhouse_growth.grader_reports`.
- Consumidores afectados: superficie pública/report, admin review, HubSpot handoff, Nexa/MCP futuros.
- Runtime target: `local` + `staging`; público fuera de scope.

### Contract surface

- Contrato existente: `grader_score`/`PersistedGraderScore`, `normalized_findings`, gates.
- Contrato nuevo: `GraderReport` (audience public/internal_sales/client/executive del §7.7) + recommendation mapping + DTO public/internal.
- Backward compatibility: `additive`; nada público consume hasta tasks posteriores.
- Full API parity: builder server-side reusable por todos los consumers.

### Data model and invariants

- `grader_report` deriva de `(run_id, score_version)`; recomputable → mismo reporte para mismo score+report_version.
- Recomendaciones deterministas (mapeo gap→acción §8.4); el copy es plantilla, no generación libre.
- `insufficient_data`/`review_required` se propagan al reporte; público bounded.
- Public-safe sin raw text; internal con detalle + evidencia.

### Migration, backfill and rollout

- Migration posture: `additive` si se persiste `grader_reports`; `none` si V1 deriva on-read (preferir on-read si el score ya está persistido y el reporte es puro derivado — decidir en Discovery).
- Default state: gated; sin auto-release público.
- Rollback path: revert PR; tabla additive sin uso o reverse migration.
- External coordination: N/A (repo/interno).

### Security and access

- Auth/access gate: read interno con capability `growth.ai_visibility.observation.read` (existente) o nueva `growth.ai_visibility.report.read` si se requiere granularidad (decidir + grant en runtime.ts mismo slice).
- Sensitive data posture: public DTO sin raw; copy sin afirmaciones difamatorias.
- Error contract: canónico; sin raw provider/LLM errors.

### Runtime evidence

- Local checks: tests de mapeo gap→recomendación, determinismo del reporte, propagación de gates, leak test public DTO.
- DB/runtime checks: si persiste, migration verify; dry-run sobre runs de fixtures/1227.
- Reliability signals: reusar los de scoring; opcional `growth.ai_visibility.report_build_failed`.

### Acceptance criteria additions

- [ ] `GraderReport` derivado de score+findings, recomputable y versionado.
- [ ] Recomendaciones deterministas mapeadas desde gaps (§8.4).
- [ ] Public DTO sin raw provider text/prompts; gates propagados.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — GraderReport contract + recommendation mapping

- Definir `GraderReport` V1 (report_version) + el mapeo determinista gap→recomendación (§8.4: low entity clarity, low category ownership, weak citation quality, competitors dominate, message drift, weak revenue intent).
- Tests de mapeo + determinismo (mismo score → mismo reporte).

### Slice 2 — Report builder + DTO public/internal

- Builder server-side desde `(run_id, score_version)` → `GraderReport` (narrativa de gaps + recomendaciones + headline).
- DTO public-safe (sin raw) vs internal (con evidencia/reasons); propagar `insufficient_data`/`review_required`.
- Persistencia `grader_reports` SOLO si Discovery decide (preferir on-read si es puro derivado).

### Slice 3 — Endpoint interno + signals + dry-run

- Endpoint admin read `GET /runs/[runId]/report` (capability) que delega en el builder, o incluir el reporte en el GET detail existente.
- Dry-run sobre runs de 1226/1227 (ej. EO-GRUN-00007 → reporte con AI Visibility gap dominante).
- Leak test public DTO + signals.

## Out of Scope

- UI / report visual / página pública / tokenización del reporte.
- HubSpot handoff (task aparte).
- Ejecución async de runs (TASK-1234).
- Generación de copy por LLM (el copy es plantilla determinista en V1).
- Nexa/MCP exposure.

## Detailed Spec

El reporte es **derivación pura** del score+findings ya persistidos (TASK-1227). Decisión de Discovery: **persistir `grader_reports` o derivar on-read**. Preferir on-read en V1 (el score ya es persistido y versionado; el reporte es función pura de él) salvo que se necesite snapshot inmutable para el público. El recommendation engine es un mapeo determinista dimensión-con-gap → acción (tabla §8.4); el copy es plantilla es-CL (validar con `greenhouse-ux-writing` si hay texto visible reusable). El headline usa el hallazgo dominante (ej. "Invisible en descubrimiento: AI Visibility 0/100").

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (contract + mapping) → Slice 2 (builder + DTO) → Slice 3 (endpoint + signals). El public DTO (Slice 2) DEBE existir antes de cualquier endpoint que lo exponga (Slice 3).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Raw provider text se filtra al public DTO | privacy/security | low | DTO público derivado de campos seguros + leak test | leak test |
| Reporte sobre-confiado sin cobertura | data quality / trust | medium | propagar insufficient_data/review_required al reporte; no headline definitivo | reusa scoring signals |
| Lenguaje difamatorio sobre competidores | legal/brand | low | copy plantilla + review_required hereda del score | `report_review_required_rate` |
| Recompute produce reporte distinto | reliability | low | reporte = función pura de score+report_version + tests | test determinismo |

### Feature flags / cutover

- Sin flag nuevo si es read interno derivado (additive). Si se persiste o expone, gatear por capability + (opcional) flag `GROWTH_AI_VISIBILITY_REPORT_ENABLED` default OFF. Revert: revert PR.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (contract/mapping) | <5 min | si |
| Slice 2 | revert PR; tabla additive sin uso si se persistió | <10 min | si |
| Slice 3 | revert endpoint / flag OFF | <5 min | si |

### Production verification sequence

1. Slice 1-2: tests + dry-run sobre runs reales de 1226/1227 (reporte coherente con el score).
2. Slice 3: endpoint interno en staging + leak test public DTO.
3. Prod: fuera de scope (junto con superficie pública posterior).

### Out-of-band coordination required

- N/A — repo/interno. (Legal/privacy del copy público se valida en la task de superficie pública.)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `GraderReport` V1 versionado, derivado de score+findings, recomputable.
- [ ] Recomendaciones deterministas mapeadas desde gaps por dimensión (§8.4).
- [ ] DTO public-safe sin raw provider text/prompts; internal con evidencia.
- [ ] `insufficient_data`/`review_required` propagados al reporte (sin precisión falsa ni auto-release).
- [ ] Dry-run sobre un run real produce un reporte coherente con el score.
- [ ] Sin UI pública, HubSpot write ni Nexa/MCP en esta task.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- Dry-run del builder sobre un run real de 1226/1227
- `pnpm docs:closure-check` al cerrar

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress`/`complete`)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] arch `## Delta` si el contrato de reporte difiere del §7.7
- [ ] chequeo de impacto cruzado (TASK-1227/1234 + futuras superficie pública/HubSpot)

## Follow-ups

- Superficie pública + tokenización del reporte (lead magnet).
- HubSpot handoff (primary_gap/recommended_motion desde el reporte).
- Admin evidence review surface.
- Generación de copy asistida por LLM (si se quiere narrativa más rica que plantilla).

## Open Questions

1. ¿Persistir `grader_reports` (snapshot inmutable para el público) o derivar on-read en V1 (reporte = función pura del score)?
2. ¿Capability propia `growth.ai_visibility.report.read` o reusar `observation.read`?
