# TASK-156 — SLI/SLO/SLA Contractual per Service

## Delta 2026-04-03

- Esta lane debe alinearse a `docs/architecture/Contrato_Metricas_ICO_v1.md`, pero sin confundir benchmark operativo con SLA contractual.
- Regla nueva:
  - targets contractuales por servicio (`OTD target`, `RPA target`, etc.) son compromisos negociados con cliente, no sinónimos del benchmark canónico del engine
  - el compliance report debe distinguir entre:
    - `benchmark/reference health`
    - `service SLA target`
    - `metric confidence`
- Ningún target de SLA debe sobrescribir la semántica canónica de `OTD`, `FTR`, `RpA`, `TTM` o métricas relacionadas.

## Delta 2026-04-13

- Esta lane debe modelar explícitamente la cadena `SLI -> SLO -> SLA` por servicio.
- Regla nueva:
  - **SLI (Service Level Indicator)** = la métrica observable que se mide (`actual response time`, `actual first delivery days`, `actual revision rounds`, `actual OTD`, `actual RpA`)
  - **SLO (Service Level Objective)** = el objetivo operativo/umbral interno que ese SLI debe cumplir
  - **SLA (Service Level Agreement)** = el compromiso contractual expuesto al cliente, apoyado en uno o más SLI/SLO
- No diseñar la lane solo como tabla de targets; debe quedar explícito qué se mide, con qué fórmula y contra qué umbral se evalúa.

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | P1 |
| Impact | Alto |
| Effort | Medio |
| Status real | `Diseño` |
| Rank | — |
| Domain | Agency / Delivery |
| Sequence | Agency Layer V2 — Phase 5 |

## Summary

Definir por servicio los SLI observables, los SLO operativos y los SLA contractuales: response time, first delivery time, revision rounds limit, OTD target %, RPA target y otras métricas verificables. Calcular compliance comparando target vs actual sobre indicadores explícitos, detectar trending-toward-breach antes del breach real y mostrar el estado en service detail y Space 360.

## Architecture Reference

`docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md` §3.2 Service (Health: on-time delivery %, within-budget %)

## Dependencies & Impact

- **Depende de:** TASK-146 (Service P&L — service as economic object), ICO metrics per space (OTD, RPA, throughput)
- **Impacta a:** TASK-152 (Anomaly Engine — add SLA breach rules), TASK-155 (Scope Intelligence — SLA context for scope evaluation)
- **Archivos owned:** `src/lib/agency/sla-compliance.ts`, `src/app/api/agency/services/[serviceId]/sla/route.ts`

## Scope

### Slice 1 — Data model + CRUD (~4h)

`service_sla_definitions` table: `service_id`, `metric` (otd_pct, rpa_target, response_hours, first_delivery_days, max_revision_rounds), `indicator_formula` / `measurement_source`, `target_value`, `breach_threshold`, `created_at`. CRUD API: `GET/POST/PUT /api/agency/services/[serviceId]/sla`. UI form para definir por servicio qué SLI se mide, cuál es su SLO y cuál es el target contractual expuesto como SLA.

### Slice 2 — Compliance engine (~5h)

`SlaComplianceEngine`: for each service with SLI/SLO/SLA definidos, comparar target vs actual desde métricas ICO y otras señales operativas verificables. Calcular compliance status: Met, At-Risk (within 10% of breach), Breached. Detectar trending-toward-breach si el SLI se degrada hacia el breach threshold al ritmo actual. Output: `SlaComplianceReport` per service con desglose entre indicador medido, objetivo y acuerdo contractual.

### Slice 3 — UI in service detail + Space 360 (~4h)

Service detail: tabla de definiciones SLI/SLO/SLA + compliance status por métrica. Traffic light por SLA (green/yellow/red) con visibilidad del indicador real que se está midiendo. Space 360 Services tab: SLA health badge per service. Aggregate: "3/5 services meeting all SLAs". Add SLA breach as anomaly rule in detection engine.

## Acceptance Criteria

- [ ] Cada definición por servicio deja explícito qué SLI se mide y desde qué fuente se calcula
- [ ] El modelo distingue con claridad indicador observado (SLI), objetivo operativo (SLO) y compromiso contractual (SLA)
- [ ] SLA definitions stored per service with configurable targets
- [ ] Compliance computed: Met / At-Risk / Breached per metric
- [ ] Trending-toward-breach detected before actual breach
- [ ] Service detail shows SLA definitions and compliance status
- [ ] Space 360 Services tab shows SLA health badge
- [ ] SLA breach generates anomaly via detection engine
- [ ] Handles services without SLA definitions (shows "no SLA defined")

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/lib/agency/sla-compliance.ts` | New — compliance engine |
| `src/app/api/agency/services/[serviceId]/sla/route.ts` | New — SLA CRUD + compliance API |
| `src/views/greenhouse/agency/services/ServiceDetailView.tsx` | Add SLA section |
| `src/views/greenhouse/agency/space-360/tabs/ServicesTab.tsx` | Add SLA health badge |
