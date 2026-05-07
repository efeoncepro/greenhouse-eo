# TASK-834 — Bow-tie Dashboards Greenhouse-side (Revenue Health, Expansion Engine, At Risk Accounts)

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `Bow-tie V1.0`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `commercial / ui`
- Blocked by: `TASK-833, TASK-832, TASK-820 Delta`
- Branch: `task/TASK-834-bowtie-dashboards`

## Summary

Cierra V1.0 del programa Bow-tie con los 3 dashboards operativos del spec §10 implementados Greenhouse-side: **Revenue Health** (Julio/GTM, NRR + GRR + MRR breakdown por `client_kind` + Top 10 cuentas + flag at_risk), **Expansion Engine** (Luis Reyes + Julio, Expansion Rate + pipeline expansion + Time-to-Expansion + active accounts sin expansion 180d), **At Risk Accounts** (Julio + CSM, MSAs expirando + deals Renewal + cuentas at_risk con razón). Charts ECharts (política canónica para dashboards de alto impacto), mockup builder iterado paso previo, microcopy es-CL via skill `greenhouse-ux-writing`, visual regression test al cierre. Coexisten con dashboards HubSpot (no los reemplazan V1.0).

## Why This Task Exists

Los 3 dashboards son la entrega final del Bow-tie §10 — el momento donde el sistema de medición se vuelve accionable. Sin esta task:

- NRR computado pero invisible
- Expansion pipeline no priorizable
- At Risk accounts sin cola de atención

El usuario de cada dashboard tiene un job-to-be-done explícito Bow-tie §10:

- Julio (GTM Director) revisa Revenue Health semanalmente para validar salud del portfolio
- Luis Reyes + Julio operan Expansion Engine para detectar oportunidades no trabajadas
- Julio + CSM (futuro) trabajan At Risk Accounts para prevenir churn

Sin UI, los datos quedan en VIEW y endpoints sin consumer humano.

## Goal

- Mockup builder iterado y aprobado por usuario ANTES de implementar real (skill `greenhouse-mockup-builder`)
- 3 páginas dashboard Greenhouse-side bajo `/admin/commercial/`:
  - `/admin/commercial/revenue-health`
  - `/admin/commercial/expansion-engine`
  - `/admin/commercial/at-risk`
- Charts ECharts vía `echarts-for-react` (lazy-load) para gauges, line, stacked bar, sankey opcional
- 100% Vuexy primitives + tokens canónicos (CERO hex literal, CERO border-radius off-scale)
- Microcopy 100% via `bowtie-dashboards.ts` dictionary (es-CL tuteo, skill `greenhouse-ux-writing` valida)
- Densidad operacional aplicada al listing Top 10 (TASK-743 contract)
- Auth `requireServerSession` + capability `commercial.bowtie_dashboards.read` (extender TASK-833 capability si necesario)
- Visual regression al cierre

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_BOWTIE_OPERATIONAL_BRIDGE_V1.md` §1, §3, §8 — contrato puente
- `spec/Arquitectura_BowTie_Efeonce_v1_1.md` §10 — fuente verbatim de los 3 dashboards
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`
- `DESIGN.md` — contrato visual + CI gate
- `CLAUDE.md` sección "Charts — política canónica (decisión 2026-04-26)" — ECharts para dashboards de alto impacto
- `CLAUDE.md` sección "Microcopy / UI copy — regla canónica (TASK-265)"

Reglas obligatorias:

- Skill `greenhouse-mockup-builder` paso previo obligatorio
- Skill `greenhouse-ux` para layout + componentes
- Skill `greenhouse-ui-review` ANTES de commit final
- Skill `greenhouse-ux-writing` para todo string visible
- Skill `greenhouse-microinteractions-auditor` para feedback/loading/empty/error states
- Charts: ECharts vía `echarts-for-react` con lazy-load por route
- Tokens-only: NUNCA hex literal; NUNCA `borderRadius: 12`
- Densidad: TASK-743 `<DataTableShell>` para listing Top 10
- Estados visibles distinguibles: `loading | empty | error | degraded | success` — NUNCA ambiguo
- Auth pages: `requireServerSession` + `dynamic = 'force-dynamic'`
- Lectura de datos via TASK-833 helper `getBowtieMetrics` + TASK-832 reader `clients.is_at_risk`
- NUNCA computar NRR/GRR en cliente — solo render desde helper canónico (lint rule TASK-833)

## Normative Docs

- `spec/Arquitectura_BowTie_Efeonce_v1_1.md` §10
- `docs/architecture/GREENHOUSE_BOWTIE_OPERATIONAL_BRIDGE_V1.md` §17 (Open Q #5: dashboards coexisten con HubSpot)

## Dependencies & Impact

### Depends on

- TASK-833 (metrics engine) — VIEW + helper + signals
- TASK-832 (`is_at_risk` snapshot) — para At Risk dashboard
- TASK-820 Delta (HubSpot stage drift signal) — para "drift warning" widget opcional
- ECharts + `echarts-for-react` ✅ disponible
- Vuexy primitives, `<DataTableShell>` (TASK-743), tokens canónicos ✅
- Microcopy infrastructure (TASK-265) ✅

### Blocks / Impacts

- Cierre V1.0 del programa Bow-tie completo
- HubSpot dashboards equivalentes (Bow-tie §10) quedan como referencia sales-side; coexisten

### Files owned

- `src/app/(dashboard)/admin/commercial/revenue-health/page.tsx`
- `src/app/(dashboard)/admin/commercial/expansion-engine/page.tsx`
- `src/app/(dashboard)/admin/commercial/at-risk/page.tsx`
- `src/app/(dashboard)/admin/commercial/bowtie-dashboards/mockup/page.tsx` (mockup builder)
- `src/views/greenhouse/admin/commercial/bowtie/RevenueHealthView.tsx`
- `src/views/greenhouse/admin/commercial/bowtie/ExpansionEngineView.tsx`
- `src/views/greenhouse/admin/commercial/bowtie/AtRiskAccountsView.tsx`
- `src/views/greenhouse/admin/commercial/bowtie/components/NrrGauge.tsx`
- `src/views/greenhouse/admin/commercial/bowtie/components/GrrGauge.tsx`
- `src/views/greenhouse/admin/commercial/bowtie/components/MrrTrendChart.tsx`
- `src/views/greenhouse/admin/commercial/bowtie/components/MrrBreakdownByKindChart.tsx`
- `src/views/greenhouse/admin/commercial/bowtie/components/Top10AccountsTable.tsx`
- `src/views/greenhouse/admin/commercial/bowtie/components/ExpansionPipelineChart.tsx`
- `src/views/greenhouse/admin/commercial/bowtie/components/TimeToExpansionByCohortChart.tsx`
- `src/views/greenhouse/admin/commercial/bowtie/components/AtRiskKanban.tsx`
- `src/views/greenhouse/admin/commercial/bowtie/components/MsaExpiringList.tsx`
- `src/lib/copy/dictionaries/es-CL/bowtie-dashboards.ts` — microcopy
- `tests/visual/bowtie-dashboards.spec.ts` — visual regression
- `tests/e2e/smoke/bowtie-dashboards.spec.ts` — E2E smoke con agent auth

## Current Repo State

### Already exists

- TASK-833 metrics engine (paralelo)
- TASK-832 `is_at_risk` snapshot (paralelo)
- ECharts + echarts-for-react
- Vuexy + DataTableShell
- Microcopy infrastructure
- Skills: greenhouse-mockup-builder, greenhouse-ux, greenhouse-ui-review, etc.

### Gap

- No existen surfaces dashboard Bow-tie
- No hay microcopy específico de Bow-tie dashboards
- No hay mockup canónico aprobado

## Scope

### Slice 1 — Mockup builder + UX validation

- Invocar skill `greenhouse-mockup-builder` para construir `/admin/commercial/bowtie-dashboards/mockup` con mock data tipada cubriendo:
  - Revenue Health: 3 estados (NRR > target, NRR < target, NRR < critical)
  - Expansion Engine: 2 estados (pipeline activo, pipeline vacío con CTA)
  - At Risk: 3 estados (sin at-risk, 5 at-risk, drift detected)
- Iterar con usuario antes de implementar real
- Aprobado documentado en commit message: `[mockup-approved-by-user]`

### Slice 2 — Microcopy

`src/lib/copy/dictionaries/es-CL/bowtie-dashboards.ts`:

- Métricas labels: "Retención neta de ingresos", "Retención bruta de ingresos", "Tasa de expansión", "Retención de logos", "Tiempo a expansión", "Tasa de renovación"
- Targets: "Meta: ≥ 110%", "Meta: ≥ 90%", etc.
- Severity labels: "En target", "Bajo target", "Crítico"
- Empty states: "Sin clientes en riesgo este período", "Sin pipeline de expansión activo"
- Loading: "Calculando métricas...", "Cargando dashboard..."
- Tooltips: explicaciones de NRR, GRR, fórmulas

### Slice 3 — Revenue Health dashboard

Componentes per Bow-tie §10.1:

- **NrrGauge**: gauge ECharts rolling 12m con target line en 110%
- **GrrGauge**: gauge ECharts rolling 12m con target line en 90%
- **MrrTrendChart**: line chart MRR total monthly últimos 24 meses
- **MrrBreakdownByKindChart**: stacked bar Active / Self-Serve / Project por mes
- **LogoRetentionTrend**: gauge trimestral
- **Top10AccountsTable**: tabla con flag `is_at_risk` (chip warning), columnas: organization, client_kind, total_mrr, msa_end_date, is_at_risk, days_open

Layout: 2-column responsive, gauges arriba, charts middle, table bottom.

### Slice 4 — Expansion Engine dashboard

Componentes per Bow-tie §10.2:

- **ExpansionRateGauge**: actual vs target trimestral
- **ExpansionPipelineChart**: stacked bar deals abiertos pipeline Expansion por `deal_sub_type` (Cross-sell / Upsell / New SOW)
- **TimeToExpansionByCohortChart**: line chart cohort mensual de Closed-Won → primera expansion (días promedio)
- **ActiveAccountsWithoutExpansionList**: lista de Active Accounts con `last_expansion_date IS NULL OR last_expansion_date < now() - 180 days`. CTA "Marcar para QBR"
- **PipelineMrrDeltaWeighted**: KPI ponderado por probabilidad de cierre

Layout: 2-column, KPIs arriba, charts middle, action list bottom.

### Slice 5 — At Risk Accounts dashboard

Componentes per Bow-tie §10.3:

- **MsaExpiringKanban**: kanban por fecha de `msa_end_date` (próximos 90 días en columnas semanales). Cada card: organization, MRR, deal Renewal status (open/none)
- **OpenRenewalDealsList**: tabla deals abiertos pipeline Renewal con probabilidad y owner
- **AtRiskAccountsList**: cuentas con `is_at_risk=TRUE` con badge mostrando triggers (`msa_expiring | mrr_decline | ico_red`)
- **MrrDeclineSparkline**: 3 últimos meses MRR por at-risk account
- **FormerCustomersList**: últimos 90 días con CTA "Win-back outreach"

Layout: 3-column con kanban dominante.

### Slice 6 — Auth + endpoint integration

- Pages auth via `requireServerSession`
- Capability check `commercial.bowtie_dashboards.read`
- Datos via `getBowtieMetrics` (TASK-833) + `listAtRiskClients` reader nuevo
- Cache server-side TTL 5 min (alineado con TASK-833 endpoint cache)

### Slice 7 — Tests + UI review

- Visual regression cubriendo 3 estados x 3 dashboards = 9 baselines
- E2E Playwright con agent auth: navegar 3 dashboards, assertear KPI tiles + charts render
- Skill `greenhouse-ui-review` audit
- Skill `greenhouse-microinteractions-auditor` audit
- DESIGN.md CI gate verde

## Out of Scope

- HubSpot dashboards equivalentes — operator crea manualmente vía HubSpot UI (Bow-tie §10) si quiere; out-of-scope V1.0
- Export PDF / Excel — V1.1 si emerge necesidad
- Filtering avanzado (por business line, geography) — V1.1
- Forecasting / projections — V1.2
- Realtime updates websocket — V1.0 polling 5min
- Drill-down deep linking entre dashboards — V1.1
- Cliente portal surfaces — N/A (estos son admin-tenant exclusivamente)

## Detailed Spec

Ver Bow-tie §10 verbatim para componentes de cada dashboard:

```text
Dashboard Revenue Health (§10.1):
  - NRR rolling 12m (gauge)
  - GRR rolling 12m (gauge)
  - MRR total + tendencia mensual
  - Breakdown MRR por tipo cliente (Active/Self-Serve/Project)
  - Logo Retention trimestral
  - Top 10 cuentas por MRR con flag is_at_risk

Dashboard Expansion Engine (§10.2):
  - Expansion Rate mensual + trimestral
  - Deals abiertos pipeline Expansion por deal_sub_type
  - Time-to-Expansion por cohort
  - Active Accounts sin expansion últimos 180 días (target list QBR)
  - MRR Delta ponderado del pipeline Expansion

Dashboard At Risk Accounts (§10.3):
  - MSAs vencendo en próximos 90 días (kanban por fecha)
  - Deals en pipeline Renewal con probabilidad y owner
  - Cuentas con is_at_risk=true con razón de activación
  - Señales de riesgo: MRR en caída, engagement bajo, retraso en pagos
  - Former Customers recientes como candidatos win-back
```

## Acceptance Criteria

- [ ] Mockup aprobado por usuario antes de implementar real
- [ ] 3 dashboards renderizan con datos reales en staging
- [ ] Estados loading / empty / degraded / error explícitos por surface
- [ ] CERO hex literal en archivos owned (eslint pasa)
- [ ] CERO `borderRadius` off-scale (lint pasa)
- [ ] Microcopy 100% via dictionary; skill `greenhouse-ux-writing` validó
- [ ] ECharts charts lazy-loaded por route (verificable en Network)
- [ ] Visual regression 9 estados pasa
- [ ] E2E Playwright happy path passes
- [ ] Skill `greenhouse-ui-review` checklist passes
- [ ] Skill `greenhouse-microinteractions-auditor` review passes
- [ ] Auth gate funciona: user sin capability → 403
- [ ] DESIGN.md CI gate `pnpm design:lint` strict verde
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` verde

## Verification

- `pnpm dev` + open `/admin/commercial/bowtie-dashboards/mockup` para iterate
- `pnpm playwright test tests/visual/bowtie-dashboards.spec.ts`
- `pnpm playwright test tests/e2e/smoke/bowtie-dashboards.spec.ts --project=chromium` (con `AGENT_AUTH_SECRET`)
- `pnpm design:lint`
- `pnpm staging:request /admin/commercial/revenue-health` → smoke render
- Skills: `greenhouse-ux`, `greenhouse-ui-review`, `greenhouse-microinteractions-auditor`, `greenhouse-ux-writing`

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con learnings UX + Bow-tie V1.0 cierre
- [ ] `changelog.md` actualizado
- [ ] Mockup aprobado documentado
- [ ] Visual regression baseline subido al repo
- [ ] V1.0 del programa Bow-tie cerrado
- [ ] Operativos: notificar Julio + Luis Reyes que dashboards live

## Follow-ups

- V1.1: Export PDF / Excel
- V1.1: Filtering avanzado por business line / geography
- V1.1: Drill-down navigation entre dashboards
- V1.1: HubSpot dashboard equivalentes via runbook (si stakeholder solicita)
- V1.2: Forecasting / projections con modelo simple
- Métricas de adopción: cuántos opens/week por dashboard

## Open Questions

- ¿Top 10 cuentas ordenamiento default es `total_mrr DESC` o `at_risk DESC, total_mrr DESC`? Recomendación: at_risk DESC luego MRR (foco en riesgo).
- ¿At Risk Kanban swim lanes por owner o por trigger type? Recomendación V1.0: por fecha (msa_end_date), filtros por owner como dropdown.
- ¿Former Customers en At Risk dashboard últimos 30 días o 90 días? Recomendación: 90 (Bow-tie §10.3 implica recientes; 90 da window de win-back razonable).
- ¿Time-to-Expansion chart en cohort mensual o trimestral? Recomendación V1.0: trimestral (más estable, menor varianza con bajos volúmenes actuales).
