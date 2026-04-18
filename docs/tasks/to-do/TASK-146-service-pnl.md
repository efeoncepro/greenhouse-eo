## Delta 2026-03-30
- `TASK-142` ya cerró el shell real de `Space 360` y el tab `Services` existe con contrato operativo sobre `getAgencySpace360()`.
- Esta task ya no debe asumir que necesita crear primero la vista `Services`; el trabajo pendiente es agregar revenue/cost/margin por servicio encima del tab ya materializado.

## Delta 2026-04-17 — spec corregida contra runtime real

- `Agency > Economía` y `Space 360 > Services` ya existen en runtime:
  - `GET /api/agency/economics`
  - `src/lib/agency/agency-economics.ts`
  - `src/lib/agency/space-360.ts`
  - `src/views/greenhouse/agency/economics/EconomicsView.tsx`
  - `src/views/greenhouse/agency/space-360/tabs/ServicesTab.tsx`
- La expansión actual por Space muestra solo contexto contractual de `services` y un estado explícito `pending_task_146`; no se debe inventar P&L por servicio antes de cerrar un contrato canónico de atribución.
- El serving real disponible hoy para esta lane es:
  - `greenhouse_serving.operational_pl_snapshots` para P&L por `client` / `space` / `organization`
  - `greenhouse_serving.commercial_cost_attribution` para explain comercial por `member + client + period`
  - `greenhouse_serving.member_capacity_economics` para loaded cost por persona
- **Bloqueo de diseño detectado:**
  - `greenhouse_finance.income` no tiene `service_id` canónico; hoy solo expone `service_line` y referencias comerciales auxiliares (`hubspot_deal_id`, `quotation_id`, `hes_id`) no resueltas todavía a `greenhouse_core.services.service_id`
  - `greenhouse_finance.expenses` y `greenhouse_finance.cost_allocations` no tienen `service_id` canónico
  - `commercial_cost_attribution` está keyed por `member_id + client_id + period`, no por `service_id`
  - `computeOperationalPl()` proyecta `space` vía un bridge `DISTINCT ON (client_id)`, suficiente para `space`-level P&L pero insuficiente para atribución fiel por servicio en escenarios multi-space / multi-service
- Consecuencia: esta task **no es implementable de forma segura tal como está redactada**. Antes de construir `service_economics` se necesita formalizar el contrato upstream de atribución a `service_id` para revenue, direct cost y labor allocation.
- Ese prerequisito queda registrado formalmente como `TASK-452 - Service Attribution Foundation`.
- Hasta que exista ese contrato, `Agency Economics` y `Space 360` deben seguir mostrando contexto por servicio sin revenue/margin fabricado.

# TASK-146 — Service-Level P&L (Economics per Service)

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | P1 |
| Impact | Alto |
| Effort | Medio |
| Status real | `Diseño` |
| Blocked by | `TASK-452` |
| Rank | — |
| Domain | Agency / Economics |
| Sequence | Agency Layer V2 — Phase 2 |

## Summary

Formalizar el contrato canónico para calcular revenue, cost y margin por servicio antes de materializar `greenhouse_serving.service_economics`. El objetivo funcional final sigue siendo alimentar el drill-down de Economics (TASK-143) y el tab `Services` de Space 360 (TASK-142), pero el prerequisito real es resolver la atribución a `service_id` desde Finance / Commercial / staffing runtime.

## Architecture Reference

`docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md` §3.2 Service, §7.1 Serving views (`service_economics`)

## Dependencies & Impact

- **Depende de:** TASK-142 (Space 360 Services tab consumes this), TASK-143 (Economics drill-down consumes this), contrato canónico de Finance/Commercial para atribución `income|expense|labor -> service_id`, `greenhouse_serving` schema
- **Impacta a:** TASK-147 (Campaign ↔ Service Bridge uses service economics), TASK-155 (Scope Intelligence uses service cost data), TASK-156 (SLA/SLO per service extends this), TASK-160 (Enterprise Hardening — ServiceEconomics store)
- **Archivos owned:** `src/lib/agency/service-economics.ts`, `src/app/api/agency/services/[serviceId]/economics/route.ts`

## Scope

### Slice 1 — Computation engine (~5h)

`ServiceEconomics` module: solo después de cerrar el contrato upstream. La atribución no puede apoyarse en `service_line` o prorrateos implícitos como source of truth. La implementación correcta debe partir desde relaciones canónicas hacia `service_id` para revenue, direct cost y labor allocation.

### Slice 2 — Serving view + projection (~4h)

Create `greenhouse_serving.service_economics` table solo cuando el contrato de atribución exista. La projection reactiva debe escuchar eventos con resolución fiable de `period + space_id + service_id`; no basta con `finance.income.*` y `service.*` mientras el payload no resuelva `service_id`.

### Slice 3 — API + UI integration (~4h)

`GET /api/agency/services/[serviceId]/economics` y el surfacing UI dependen del slice anterior. Mientras el contrato no exista, la UI debe mantener el estado honesto actual: contexto contractual/SLA sin revenue-cost-margin fabricado.

## Acceptance Criteria

- [ ] Existe un contrato canónico documentado para atribución `revenue -> service_id`
- [ ] Existe un contrato canónico documentado para atribución `direct cost -> service_id`
- [ ] Existe un contrato canónico documentado para atribución `labor/overhead -> service_id`
- [ ] Recién después de lo anterior: `service_economics` serving view materialized and refreshed reactively
- [ ] API endpoint returns service-level P&L data
- [ ] Space 360 Services tab shows revenue/cost/margin per service
- [ ] Economics view drill-down shows service breakdown per Space

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/lib/agency/service-economics.ts` | New — computation engine |
| `src/app/api/agency/services/[serviceId]/economics/route.ts` | New — service economics API |
| `src/views/greenhouse/agency/space-360/tabs/ServicesTab.tsx` | Add economics columns |
| `src/views/greenhouse/agency/economics/EconomicsView.tsx` | Add service drill-down |
