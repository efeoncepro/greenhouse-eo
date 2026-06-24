# TASK-1236 — Growth AI Visibility: Report Temporal Trend

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `reader`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ai|reliability`
- Blocked by: `TASK-1235`
- Branch: `task/TASK-1236-growth-ai-visibility-report-temporal-trend`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Agregar **tendencia temporal** al `grader_report` (TASK-1235): comparar el run vigente de un perfil contra su run previo (mismo `score_version`) para mostrar el delta por dimensión + overall (subió/bajó/sin cambio), con primer-run honesto ("sin histórico"). AEO se mide por tendencia, no por una foto; hoy el reporte es punto-en-el-tiempo.

## Why This Task Exists

El framework de reporting AEO (skill `seo-aeo` §07: "siempre con tendencia vs período anterior") es claro: un diagnóstico de visibilidad IA sin serie temporal no demuestra que algo funcione. El grader ya corre runs repetidos por perfil (`grader_runs` → `grader_scores` versionados), pero el reporte de TASK-1235 deriva de un solo run y no computa deltas. Sin esto, no se puede decir "subiste de 26 a 34 este mes" — el valor comercial recurrente (monitoreo) queda sin sustento.

## Goal

- Reader canónico que liste los scores históricos de un perfil (por `score_version`) ordenados temporalmente.
- Bloque `trend` en el `GraderReport` (delta overall + por dimensión vs run previo comparable), determinista.
- Estado honesto de primer-run ("sin histórico") y de incomparabilidad (cambio de `score_version`/`prompt_pack_version`): no fabricar tendencia falsa.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §7.6/§7.7 (score + report), §Delta 2026-06-24 TASK-1235 (contrato del reporte), §10/§11 (admin/parity readers).
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — un primitive, muchos consumers.

Reglas obligatorias:

- La tendencia se deriva SOLO de `grader_scores` versionados ya persistidos; ningún LLM computa el delta (determinista).
- Solo comparar runs con el MISMO `score_version` y `prompt_pack_version` (comparabilidad). Si difieren → marcar incomparable, no inventar delta.
- Primer run sin histórico → estado explícito "sin histórico", nunca un delta `0` falso ni un `+100%` artificial.
- Mantener la honestidad `null≠0` de TASK-1235: una dimensión `null` en cualquiera de los dos runs → delta `null` (sin dato), no `0`.

## Normative Docs

- `docs/tasks/complete/TASK-1235-growth-ai-visibility-report-builder.md` — contrato `GraderReport` + builder on-read (dependencia directa).
- `docs/tasks/complete/TASK-1227-growth-ai-visibility-normalization-scoring-engine.md` — `grader_scores` versionados.
- Skill `seo-aeo` `modules/07_MEASUREMENT.md` — framework de reporting AEO (tendencia + cadencia).

## Dependencies & Impact

### Depends on

- `TASK-1235` (complete) — `GraderReport`/`buildGraderReport`/`readGraderReport`.
- `TASK-1227` (complete) — `grader_scores` (run_id, score_version, dimensions, overall_score) + store `getGraderScore`.
- `greenhouse_growth.grader_runs` (profile_id ↔ run_id) + `grader_scores` — ya en PG.

### Blocks / Impacts

- Habilita la superficie de monitoreo recurrente del cliente (Greenhouse AI Visibility Monitor) y el "vs período anterior" del reporte público/sales.

### Files owned

- `src/lib/growth/ai-visibility/report/trend.ts` — reader histórico + cómputo de delta (puro donde aplique).
- `src/lib/growth/ai-visibility/report/contracts.ts` — bloque `trend` additivo al `GraderReport` (+ público si se decide en Discovery).
- `src/lib/growth/ai-visibility/report/builder.ts` / `command.ts` — wire del trend al reporte.
- `src/lib/growth/ai-visibility/scoring/store.ts` — reader `listGraderScoresByProfile` [verificar si conviene acá vs report/].
- `src/lib/growth/ai-visibility/__tests__/**` — tests.

## Current Repo State

### Already exists

- `grader_scores` versionados por `(run_id, score_version)` con `dimensions` + `overall_score` + `created_at`; reader `getGraderScore(runId, scoreVersion?)` (store).
- `grader_runs` con `profile_id` (FK al perfil) — permite agrupar runs de un mismo perfil.
- `GraderReport` (TASK-1235) con `dimensions[]` viz-ready + `provenance` (asOfDate, scoreVersion, promptPackVersion).

### Gap

- No existe un reader que liste los scores de un perfil a lo largo del tiempo.
- No existe cómputo de delta run-over-run ni bloque `trend` en el reporte.
- El reporte no expone "vs período anterior" — es punto-en-el-tiempo.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: derivado de `greenhouse_growth.grader_scores` (sin tabla nueva).
- Consumidores afectados: superficie pública/monitor, admin review, HubSpot snapshot (delta), Nexa/MCP futuros.
- Runtime target: `local` + `staging`.

### Contract surface

- Contrato existente a respetar: `GraderReport`/`PersistedGraderScore`, `readGraderReport`, store de scores.
- Contrato nuevo o modificado: reader `listGraderScoresByProfile(profileId, scoreVersion?)` + bloque `trend` additivo en `GraderReport`.
- Backward compatibility: `additive` (campo nuevo opcional; nada existente cambia de shape).
- Full API parity: el trend es un reader canónico server-side reusable por todos los consumers, no cómputo ad-hoc por pantalla.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.grader_scores`, `greenhouse_growth.grader_runs` (solo lectura).
- Invariantes que no se pueden romper:
  - Comparar solo runs con `score_version` + `prompt_pack_version` idénticos; si difieren → `comparable=false`.
  - `null≠0`: dimensión `null` en cualquier extremo → delta `null` (sin dato), nunca `0`.
  - Determinismo: mismos dos scores → mismo delta (sin LLM).
- Tenant/space boundary: V1 interno/pre-tenant (mismo posture que TASK-1226/1227); el perfil acota el conjunto de runs.
- Idempotency/concurrency: read-only puro; sin writes, sin locks.
- Audit/outbox/history: none (read-only derivado; el histórico ya es append-only en `grader_scores`).

### Migration, backfill and rollout

- Migration posture: `none` (deriva on-read del histórico ya persistido).
- Default state: `read-only` (sin flag; additive).
- Backfill plan: N/A (no persiste).
- Rollback path: revert PR.
- External coordination: N/A — repo/interno.

### Security and access

- Auth/access gate: capability `growth.ai_visibility.report.read` (existente, TASK-1235) en el endpoint que lo exponga; el reader hereda el gate del caller.
- Sensitive data posture: el trend usa solo scores agregados (sin raw provider text); el bloque público hereda la defensa public-safe de TASK-1235.
- Error contract: canónico; sin raw provider/LLM errors; `captureWithDomain('growth', ...)`.
- Abuse/rate-limit posture: none (read interno acotado).

### Runtime evidence

- Local checks: tests de delta (subió/bajó/sin cambio), primer-run sin histórico, incomparabilidad por cambio de versión, `null≠0` en delta, determinismo.
- DB/runtime checks: dry-run sobre un perfil con ≥2 runs reales (ej. EO-GRUN-00007/00008 si comparten perfil [verificar]).
- Integration checks: N/A.
- Reliability signals/logs: reusa los de scoring; sin signal nuevo.
- Production verification sequence: N/A en V1 (interno; prod junto con superficie pública posterior).

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths reales.
- [ ] Invariantes de comparabilidad (version match), tenant boundary y `null≠0` explícitos.
- [ ] Migration/backfill/rollback posture explícita (none/on-read/revert PR).
- [ ] Evidencia runtime listada (tests + dry-run sobre perfil con ≥2 runs).
- [ ] Sin raw data leak; errores canónicos; trend público hereda public-safe.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Reader histórico + cómputo de delta

- `listGraderScoresByProfile(profileId, scoreVersion?)`: scores del perfil ordenados por `created_at` (último primero).
- Cómputo puro de delta overall + por dimensión vs el run previo comparable (mismo `score_version`/`prompt_pack_version`).
- Tests: delta direccional, comparabilidad, `null≠0`, determinismo.

### Slice 2 — Bloque `trend` en el report + wire

- Tipo `ReportTrend` additivo en `GraderReport` (estado: `sin_historico`/`incomparable`/`con_tendencia`, delta overall + por dimensión, fecha del run previo).
- `buildGraderReport`/`readGraderReport` cargan el histórico y adjuntan el `trend`.
- Decidir en Discovery si el bloque trend va también al DTO público (probable sí, acotado).
- Dry-run sobre un perfil con ≥2 runs reales + leak test si va al público.

## Out of Scope

- UI / gráfico de tendencia / sparkline (lo consume la superficie posterior).
- Persistencia de snapshots inmutables (es de la task de superficie pública).
- Tendencia cross-perfil / benchmark por categoría (task aparte).
- Cadencia/scheduling automático de runs (el grader ya tiene su ejecución; acá solo se lee el histórico existente).

## Detailed Spec

El trend es **derivación pura** del histórico de `grader_scores` ya persistido. Para un perfil, se toma el run vigente y el run previo **comparable** (mismo `score_version` + `prompt_pack_version`); el delta es `vigente - previo` por overall y por dimensión, con `null` propagado (sin dato) cuando cualquiera de los dos extremos es `null`. Estados: `sin_historico` (no hay run previo), `incomparable` (el previo difiere en versión de score/prompt-pack), `con_tendencia` (delta computado). El copy de los estados se tokeniza en `src/lib/copy/growth.ts` (validar con `greenhouse-ux-writing`). Sin migración: el histórico ya es append-only.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (reader + delta puro) → Slice 2 (bloque trend en el report). El cómputo de delta DEBE existir y estar testeado antes de adjuntarlo al contrato del reporte.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Comparar runs de versiones distintas → delta engañoso | data quality / trust | medium | gate de comparabilidad (`score_version` + `prompt_pack_version` match) → `incomparable` | test comparabilidad |
| Primer run muestra `+100%`/`0` falso | trust | low | estado `sin_historico` explícito, sin delta numérico | test primer-run |
| `null` pintado como `0` en el delta | data quality | low | propagar `null` (sin dato) en cualquier extremo null | test null≠0 |
| Trend filtra raw al público | privacy | low | trend usa solo scores agregados + hereda public-safe de 1235 | leak test |

### Feature flags / cutover

- Sin flag — additive, read interno gateado por la capability existente `growth.ai_visibility.report.read`. Cutover inmediato; revert = revert PR.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (reader + delta) | <5 min | si |
| Slice 2 | revert PR (campo trend additivo, nada lo consume aún en prod) | <5 min | si |

### Production verification sequence

1. Slice 1-2: tests + dry-run sobre un perfil con ≥2 runs reales (delta coherente con los scores).
2. Prod: fuera de scope en V1 (junto con la superficie pública/monitor posterior).

### Out-of-band coordination required

- N/A — repo/interno.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Reader del histórico de scores de un perfil. **Recalibrado:** se implementó el reader TARGETED `getPreviousComparableScore` (scoring/store.ts) en vez de un `listGraderScoresByProfile` completo — el trend solo necesita el run previo comparable inmediato, no toda la lista (más eficiente, menos superficie). La marca temporal se resuelve en la DB (subquery).
- [x] Bloque `trend` additivo en `GraderReport`: delta overall + por dimensión vs run previo comparable, determinista. — `report/trend.ts` + wire builder; test determinismo.
- [x] Estados honestos `sin_historico` / `incomparable` / `con_tendencia` (sin delta falso en primer run ni entre versiones distintas). — tests por estado.
- [x] `null≠0` propagado en el delta (dimensión sin dato en cualquier extremo → delta `null`). — test null≠0 + dry-run (`message_alignment` null→null = `sin_dato`).
- [x] Copy de los estados tokenizado en `src/lib/copy/growth.ts` (validado con `greenhouse-ux-writing`).
- [x] Dry-run sobre un perfil con ≥2 runs reales produce un trend coherente. — EO-GRUN-00008 vs 00007 → `con_tendencia`, deltas 0 (scores idénticos).
- [x] Sin UI, sin migración, sin write; trend público hereda public-safe (agregado puro, deltas numéricos) — incluido en `PublicGraderReport`, leak test existente verde.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- Dry-run del trend sobre un perfil con ≥2 runs reales
- `pnpm docs:closure-check` al cerrar

## Closing Protocol

- [x] `Lifecycle` sincronizado (`complete`)
- [x] archivo en la carpeta correcta (`complete/`)
- [x] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [x] `Handoff.md` + `changelog.md` actualizados
- [x] arch `## Delta 2026-06-24 — TASK-1236` (bloque trend + invariantes)
- [x] chequeo de impacto cruzado: TASK-1237 (mismos owned files report/) — `## Delta` agregado notando que `trend` ya existe en el contrato; sin colisión (campos distintos)

## Follow-ups

- Benchmark por categoría (tendencia vs promedio de la categoría) cuando haya suficientes runs.
- Sparkline / gráfico de tendencia en la superficie pública/monitor.

## Open Questions

1. ~~¿El bloque `trend` va también al DTO público en V1?~~ **Resuelta → SÍ** (público + interno). El trend es agregado puro (deltas numéricos, sin raw text) → público-safe por construcción; alto valor de conversión ("subiste 8 puntos"). Incluido en `PublicGraderReport`; leak test existente verde.
2. ~~¿"Run previo" = inmediatamente anterior o último de un período?~~ **Resuelta → run previo comparable inmediato** (mismo perfil + `score_version`, `created_at` <, resuelto en la DB por subquery). El agrupamiento por período (ej. "vs mes anterior") es follow-up.
