# TASK-156 — SLI/SLO/SLA Contractual per Service

## Delta 2026-04-15

- Discovery corrigió la source policy inicial de esta lane para no diseñarla sobre métricas inexistentes en runtime.
- Regla nueva:
  - el primer slice de SLA per service solo puede usar **SLIs con source defendible hoy**
  - set inicial soportado:
    - `otd_pct`
    - `rpa_avg`
    - `ftr_pct`
    - `revision_rounds` (derivado desde `client_change_round_final + workflow_change_round` cuando exista trazabilidad del scope)
    - `ttm_days` **solo** cuando el servicio tenga vínculo resoluble a proyecto/campaña con evidencia válida
  - `response_hours` y `first_delivery_days` **no** deben entrar como métricas operativas obligatorias en V1 mientras no exista source canónico materializado por servicio
  - si una definición de SLA apunta a una métrica sin source vigente, el compliance debe quedar `source_unavailable`, no estimarse heurísticamente
- Regla nueva:
  - toda lectura runtime de esta lane debe endurecer tenant isolation por `space_id`
  - el hecho de que exista `service_id` no reemplaza el filtro por `space_id`
- Regla nueva:
  - la integración de breach / at-risk debe apoyarse en el stack reactivo real del repo (outbox + projections + serving/signals)
  - no asumir un “anomaly engine SLA” ya materializado ni colgar esta lane directamente del detector AI de ICO sin una capa propia de señal contractual

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
- El seteo y gobierno de estas definiciones debe tener CRUD explícito en Admin Center; no dejarse solo como endpoint técnico o config escondida.

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `complete` |
| Priority | P1 |
| Impact | Alto |
| Effort | Medio |
| Status real | `Implemented / validated` |
| Rank | — |
| Domain | Agency / Delivery |
| Sequence | Agency Layer V2 — Phase 5 |

## Summary

Definir por servicio los SLI observables, los SLO operativos y los SLA contractuales: response time, first delivery time, revision rounds limit, OTD target %, RPA target y otras métricas verificables. La lane debe incluir CRUD en Admin Center para setear y gobernar esas definiciones, calcular compliance comparando target vs actual sobre indicadores explícitos, detectar trending-toward-breach antes del breach real y mostrar el estado en service detail y Space 360.

## Architecture Reference

`docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md` §3.2 Service (Health: on-time delivery %, within-budget %)

## Dependencies & Impact

- **Depende de:** TASK-146 (Service P&L — service as economic object), ICO metrics per space (OTD, RPA, throughput)
- **Impacta a:** TASK-152 (Anomaly Engine — add SLA breach rules), TASK-155 (Scope Intelligence — SLA context for scope evaluation)
- **Archivos owned:** `src/lib/agency/sla-compliance.ts`, `src/app/api/agency/services/[serviceId]/sla/route.ts`

## Scope

### Slice 1 — Data model + CRUD admin (~4h)

`service_sla_definitions` table: `service_id`, `space_id`, `indicator_code` (initial V1: `otd_pct`, `rpa_avg`, `ftr_pct`, `revision_rounds`, `ttm_days`), `indicator_formula`, `measurement_source`, `slo_target_value`, `sla_target_value`, `breach_threshold`, `unit`, `created_at`. CRUD API: `GET/POST/PUT /api/agency/services/[serviceId]/sla`. Admin Center UI para definir por servicio qué SLI se mide, cuál es su SLO y cuál es el target contractual expuesto como SLA.

**Nota V1:** `response_hours` y `first_delivery_days` quedan fuera del set obligatorio hasta que exista source canónico materializado por servicio.

### Slice 2 — Compliance engine (~5h)

`SlaComplianceEngine`: for each service with SLI/SLO/SLA definidos, comparar target vs actual usando solo métricas y señales con source policy defendible. Calcular compliance status: Met, At-Risk (within 10% of breach), Breached, o `Source unavailable` cuando el SLI aún no tenga evidencia canónica para ese servicio. Detectar trending-toward-breach si el SLI se degrada hacia el breach threshold al ritmo actual. Output: `SlaComplianceReport` per service con desglose entre indicador medido, objetivo y acuerdo contractual.

### Slice 3 — UI in service detail + Space 360 (~4h)

Service detail: tabla de definiciones SLI/SLO/SLA + compliance status por métrica. Traffic light por SLA (green/yellow/red/gray cuando falte source) con visibilidad del indicador real que se está midiendo. Space 360 Services tab: SLA health badge per service. Aggregate: "3/5 services meeting all SLAs". Add SLA breach / at-risk as signal en el stack reactivo vigente del repo.

## Acceptance Criteria

- [x] Cada definición por servicio deja explícito qué SLI se mide y desde qué fuente se calcula
- [x] El modelo distingue con claridad indicador observado (SLI), objetivo operativo (SLO) y compromiso contractual (SLA)
- [x] Existe CRUD en Admin Center para crear, editar y ajustar las definiciones por servicio
- [x] SLA definitions stored per service with configurable targets
- [x] Compliance computed: Met / At-Risk / Breached per metric
- [x] Trending-toward-breach detected before actual breach
- [x] Metrics without a defendible runtime source resolve as `source_unavailable`, not as invented estimates
- [x] Service detail shows SLA definitions and compliance status
- [x] Space 360 Services tab shows SLA health badge
- [x] SLA breach generates anomaly via detection engine
- [x] Handles services without SLA definitions (shows "no SLA defined")

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/lib/agency/sla-compliance.ts` | New — compliance engine |
| `src/app/api/agency/services/[serviceId]/sla/route.ts` | New — SLA CRUD + compliance API |
| `src/views/greenhouse/admin/**` | Add Admin Center CRUD surface for SLI/SLO/SLA governance |
| `src/views/greenhouse/agency/services/ServiceDetailView.tsx` | Add SLA section |
| `src/views/greenhouse/agency/space-360/tabs/ServicesTab.tsx` | Add SLA health badge |
