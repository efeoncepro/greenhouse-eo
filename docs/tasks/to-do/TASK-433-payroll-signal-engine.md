# TASK-433 — Payroll Signal Engine

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `task/TASK-433-payroll-signal-engine`
- Legacy ID: —
- GitHub Issue: —
- Parent arch doc: `docs/architecture/GREENHOUSE_NEXA_EXPANSION_V1.md` (Eje 1)

## Summary

Agrega un Signal Engine dedicado a Payroll replicando el patrón canónico del Finance Signal Engine (TASK-245). Detecta anomalías mensuales en cierre de período: spikes de overtime, diferencias de liquidación vs baseline, reliquidaciones que requieren revisión, variaciones por tipo de contrato. Surface el output en la ceremonia de cierre mensual como reemplazo del review manual a ojo.

## Why This Task Exists

El cierre de período de Payroll es hoy una ceremonia manual: alguien revisa planilla por planilla buscando spikes, inconsistencias, reliquidaciones. Esto:

- No escala con el crecimiento del headcount.
- Depende de la experiencia del revisor — lo que un ojo nuevo no detecta, se va al banco.
- No deja trail estructurado de qué fue anormal vs qué fue esperado.

Un Signal Engine aplica el mismo stack que ya funciona en ICO y Finance: Z-score rolling + LLM enrichment + UI consumible. Valor inmediato en la ceremonia mensual y en la auditoría retroactiva.

## Goal

- Detector de anomalías mensual sobre métricas payroll (overtime, total líquido, diferencias vs baseline, reliquidaciones).
- Materialización de signals + enrichments LLM siguiendo el pattern canónico.
- Reader tipado `readPayrollAiLlmSummary(period)` para uso en la surface de cierre.
- UI integrada en la vista de cierre de período / admin payroll.
- Engine corre automático en el flujo post-cierre o on-demand desde admin.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_NEXA_EXPANSION_V1.md` — Eje 1 (nuevos dominios).
- `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` — patrón de engines.
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` — contrato payroll.

Reglas obligatorias:

- Replicar fielmente el patrón Finance Signal Engine (`src/lib/finance/ai/*`). No inventar patterns nuevos.
- Dimensiones primarias de payroll: `period_year`, `period_month`, `member_id`. Scope secundario: `space_id`, `business_line_id` si aplica.
- Solo emitir signals sobre deterioros o anomalías estadísticas — mejoras se consolidan en otras surfaces.
- Respetar privacy: enrichment texts no deben incluir sueldos brutos/netos específicos como texto libre — solo diferencias porcentuales o categóricas.
- Advisory-only, como el resto de Nexa.

## Normative Docs

- `src/lib/finance/ai/anomaly-detector.ts` — patrón de detector
- `src/lib/finance/ai/materialize-finance-signals.ts` — patrón de materializer
- `src/lib/finance/ai/llm-enrichment-worker.ts` — patrón de worker
- `src/lib/finance/ai/llm-enrichment-reader.ts` — patrón de reader
- `src/views/greenhouse/finance/FinanceDashboardView.tsx` — patrón de UI

## Dependencies & Impact

### Depends on

- Finance Signal Engine operativo (TASK-245, cerrado) como referencia.
- `greenhouse_payroll.*` maduro y estable (confirmar en planning).

### Blocks / Impacts

- Habilita signals payroll en el Weekly Digest (requiere update del `build-weekly-digest.ts` o una lane adicional).
- Impacta admin payroll view — agrega surface de insights.
- Cualquier trabajo futuro de Nexa cross-domain (Eje follow-on) consumirá estos signals.

### Files owned

- Migraciones PG:
  - `greenhouse_serving.payroll_ai_signals`
  - `greenhouse_serving.payroll_ai_signal_enrichments`
  - `greenhouse_serving.payroll_ai_enrichment_runs`
- `src/lib/payroll/ai/anomaly-detector.ts`
- `src/lib/payroll/ai/materialize-payroll-signals.ts`
- `src/lib/payroll/ai/llm-enrichment-worker.ts`
- `src/lib/payroll/ai/llm-enrichment-reader.ts`
- Prompt template: `payroll_signal_enrichment_v1.ts`
- API: `GET /api/hr/payroll/nexa-insights`, `GET /api/cron/payroll-ai-signals`
- Cloud Run endpoint: `POST /payroll/materialize-signals` + `POST /payroll/llm-enrich` en `ops-worker` o `ico-batch`
- UI: integración en vista de cierre payroll y/o admin payroll tab nuevo

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Métricas target y schema

- Seleccionar métricas monitoreadas (recomendación base a validar con ops HR):
  - `overtime_hours_pct` — % overtime sobre horas base por colaborador
  - `liquid_delta_pct` — variación del líquido vs media rolling 6 meses
  - `reliquidation_flag` — si período tuvo reliquidación
  - `contract_variance_pct` — variación por tipo contrato
- Migraciones PG para `payroll_ai_signals`, `payroll_ai_signal_enrichments`, `payroll_ai_enrichment_runs`.
- IDs estables: `EO-PSIG-*`, `EO-PAIE-*`, `EO-PAIR-*`.

### Slice 2 — Detector

- Clonar `src/lib/finance/ai/anomaly-detector.ts` → `src/lib/payroll/ai/anomaly-detector.ts`.
- Z-score rolling 6 períodos por `member_id` × `metric_id`.
- Criterios de severity (a validar en planning): |z| >= 3 → critical, |z| >= 2 → warning, |z| >= 1.5 → info.

### Slice 3 — Materializer y LLM worker

- Materializer escribe a `payroll_ai_signals`.
- Worker LLM usa prompt `payroll_signal_enrichment_v1` con glosario payroll (chileno: DT, feriados, AFP, isapre, Mutual, gratificación).
- Prompt debe saber distinguir legal vs operativo (p.ej. sobretiempo legal vs irregularidad).
- Privacy: la narrativa no incluye montos brutos, solo porcentajes y tendencias.

### Slice 4 — Reader

- `src/lib/payroll/ai/llm-enrichment-reader.ts`:
  - `readPayrollAiLlmSummary(year, month, limit)` — portfolio
  - `readMemberPayrollAiLlmSummary(memberId, year, month)` — per-member
- Mismo contrato de ranking que los otros engines.

### Slice 5 — API + Cloud Run

- `GET /api/hr/payroll/nexa-insights` — reader
- `GET /api/cron/payroll-ai-signals` — trigger manual desde admin
- Cloud Run: agregar `POST /payroll/materialize-signals` y `POST /payroll/llm-enrich` al servicio existente (`ops-worker` o `ico-batch` — validar en planning según ownership actual).
- Scheduler: considerar si se trigger automático tras cierre del período o on-demand desde admin.

### Slice 6 — UI integration

- Vista de cierre de período payroll renderiza `NexaInsightsBlock`.
- Admin Payroll view tab "Revisión" con insights del período actual + histórico.
- Mentions `@[name](member:ID)` funcionan contra People; `@[name](period:YYYY-MM)` como forma de referenciar período.

### Slice 7 — Outbox events

- `payroll.ai_signals.materialized`
- `payroll.ai_llm_enrichments.materialized`
- Respetar contrato de `AGGREGATE_TYPES` existente.

## Out of Scope

- Integración al Weekly Digest — se hace en lane separada tras estabilizar.
- Push crítico al admin HR por Slack — cubierto por TASK-436 cuando esté lista.
- Cross-domain causality payroll ↔ finance ↔ capacity — follow-on.
- Signals por tipo de régimen contractual avanzados (honorarios, APV, etc.) — scope inicial es contratos dependientes.

## Acceptance Criteria

- [ ] Migraciones PG aplicadas, tipos regenerados, `pg:doctor` healthy.
- [ ] Detector genera signals sobre al menos 6 períodos históricos en dry-run sin falsos positivos evidentes.
- [ ] LLM worker genera narrativas en español con glosario payroll válido.
- [ ] Reader scoped por member/portfolio expone el contrato canónico.
- [ ] API endpoints responden con guard `efeonce_admin` + `hr_admin` entitlements.
- [ ] UI integrada en cierre payroll renderiza insights sin romper layout actual.
- [ ] Outbox events emitidos correctamente; verificable en Ops Health.
- [ ] `pnpm build && pnpm lint && npx tsc --noEmit && pnpm test` pasan.
- [ ] No hay narrativa con montos brutos/netos literales (validación manual sobre muestra).

## Verification

- Dry-run detector sobre periodos cerrados históricos y validación manual con un líder de HR/Payroll sobre N=10 signals aleatorios (son razonables? son ruidos?).
- Tests de integración del worker.
- Verificación manual en staging con un período cerrado real.

## Closing Protocol

- [ ] Actualizar `GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` con delta del engine payroll.
- [ ] Actualizar `GREENHOUSE_NEXA_EXPANSION_V1.md` con estado.
- [ ] Documentar en `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` el nuevo subsistema.
- [ ] Registrar en `Handoff.md` y `changelog.md`.

## Open Questions

- ¿El engine corre automático tras cierre o requiere trigger explícito del admin? Decisión: trigger explícito para evitar generar signals sobre períodos abiertos; evaluar auto-trigger post-cierre en v2.
- ¿Cómo se manejan reliquidaciones retroactivas? Recomendación: re-generar signals del período afectado.
- ¿Cuál es el rolling window óptimo? 6 meses (igual Finance) vs 12 meses. Validar con ops HR.
