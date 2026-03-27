# TASK-057 — Direct Overhead: Tool & License Cost Attribution per Person

## Delta 2026-03-26

- Se implementó el baseline canónico de `direct_overhead_target` para `member_capacity_economics` usando solo fuentes defendibles del dominio AI Tooling:
  - licencias activas member-linked desde `greenhouse_ai.member_tool_licenses`
  - consumo de créditos member-linked desde `greenhouse_ai.credit_ledger`
- Se agregaron:
  - `src/lib/team-capacity/tool-cost-attribution.ts`
  - `src/lib/team-capacity/tool-cost-reader.ts`
  - tests unitarios para compute, reader y proyección
- `member_capacity_economics` ya deja de persistir `direct_overhead_target = 0` por defecto cuando el miembro tiene licencias activas o consumo de créditos en el período.
- `src/lib/ai-tools/postgres-store.ts` ahora publica además:
  - `finance.license_cost.updated` en altas/reactivaciones/ediciones de licencias
  - `finance.license_cost.updated` fanout por licencia activa cuando cambia el costo de un tool
  - `finance.tooling_cost.updated` cuando un débito del credit ledger consume costo atribuible a un miembro
- Se decidió explícitamente dejar fuera `greenhouse_finance.expenses` genéricos de este slice:
  - hoy no existe taxonomía suficientemente madura para distinguir overhead directo por persona sin riesgo de doble conteo o falsos positivos
  - ese follow-up queda como extensión futura del task una vez exista clasificación canónica por gasto/persona
- Validación ejecutada:
  - `pnpm test src/lib/team-capacity/tool-cost-attribution.test.ts src/lib/team-capacity/tool-cost-reader.test.ts src/lib/team-capacity/overhead.test.ts src/lib/sync/projections/member-capacity-economics.test.ts src/lib/sync/projections/person-intelligence.test.ts 'src/app/api/people/[memberId]/intelligence/route.test.ts' src/app/api/team/capacity-breakdown/route.test.ts src/views/agency/AgencyTeamView.test.tsx src/views/greenhouse/people/tabs/PersonIntelligenceTab.test.tsx src/views/greenhouse/my/MyAssignmentsView.test.tsx`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm build`

## Estado

En progreso. `direct_overhead_target` ya tiene baseline canónica desde AI tooling; queda abierto solo el follow-up de gastos member-linked cuando exista clasificación madura de overhead directo.

## Context

La cadena de costo cargado (loaded cost) por persona tiene 3 componentes:
1. **Labor cost** — compensación mensual (base + bonuses + cargas sociales) ✅ Implementado
2. **Shared overhead** — gastos operacionales prorrateados por horas contratadas ✅ Implementado (TASK-056)
3. **Direct overhead** — costo de herramientas/licencias asignadas a cada persona ⚠️ Parcial

El slice actual corrige la parte defendible de AI tooling y deja documentado el gap remanente de expenses member-linked.

## Lo que ya existe

### Infraestructura construida (lista para consumir)

| Componente | Archivo | Estado |
|-----------|---------|--------|
| Overhead layer | `src/lib/team-capacity/overhead.ts` | `getDirectOverheadTarget()` + `allocateSharedOverheadTarget()` ✅ |
| Pricing layer | `src/lib/team-capacity/pricing.ts` | `getLoadedCostPerHour()` consume direct + shared overhead ✅ |
| Capacity economics projection | `src/lib/sync/projections/member-capacity-economics.ts` | Assembla todo per-member y ya consume direct overhead de AI tooling ✅ |
| AI Tools catalog | `src/lib/ai-tools/postgres-store.ts` | CRUD de tools, providers, licenses ✅ |
| Tool cost model | `src/types/ai-tools.ts` | `subscriptionAmount`, `creditUnitCost`, `costModel` ✅ |
| Member tool licenses | `src/types/ai-tools.ts` | `MemberToolLicense` con memberId, status, accessLevel ✅ |
| Credit ledger | `src/types/ai-tools.ts` | `AiCreditLedgerEntry` con `consumedByMemberId`, `totalCost`, `totalCostClp` ✅ |
| Bridge tool → supplier | `src/types/ai-tools.ts` | `AiTool.finSupplierId` → `greenhouse_finance.suppliers.supplier_id` ✅ |
| Event catalog | `src/lib/sync/event-catalog.ts` | `finance.license_cost.updated` y `finance.tooling_cost.updated` declarados ✅ |

### La cadena de datos completa (2 fuentes defendibles → 1 número)

```text
FUENTE 1: Subscription / hybrid tools
  greenhouse_ai.tool_catalog
  → subscriptionAmount / subscriptionSeats
  → greenhouse_ai.member_tool_licenses (memberId, status=active)
  → costo mensual per-person

FUENTE 2: Per-credit tools
  greenhouse_ai.credit_ledger
  → WHERE consumedByMemberId = X AND period = current
  → SUM(total_cost_clp) del mes

RESULTADO: direct_overhead_target = fuente1 + fuente2
```

## Implementación ejecutada

### Slice 1 — Compute function (pura, sin I/O)

**Archivo nuevo:** `src/lib/team-capacity/tool-cost-attribution.ts`

Implementado con:
- normalización mensual por billing cycle (`monthly`, `quarterly`, `annual/yearly`)
- cálculo per-seat
- conversión a moneda objetivo usando FX explícito
- breakdown:
  - `licenseCostTarget`
  - `toolingCostTarget`
  - `equipmentCostTarget`

### Slice 2 — Data reader

**Archivo nuevo:** `src/lib/team-capacity/tool-cost-reader.ts`

Lee solo fuentes defendibles:
- `greenhouse_ai.member_tool_licenses` + `greenhouse_ai.tool_catalog`
- `greenhouse_ai.credit_ledger`
- `greenhouse_finance.exchange_rates` para licencias no-CLP

No incluye todavía:
- `greenhouse_finance.expenses` genéricos por miembro

### Slice 3 — Wire to projection

**Archivo:** `src/lib/sync/projections/member-capacity-economics.ts`

La proyección ahora:
1. lee costos directos de tooling por miembro/período
2. calcula `direct_overhead_target`
3. incorpora ese valor a `loaded_cost_target`
4. mantiene `shared_overhead_target` separado

### Slice 4 — Event publishing

**Archivo:** `src/lib/ai-tools/postgres-store.ts`

Ahora publica:
- `finance.license_cost.updated`
  - en create/reactivate/update de licencias
  - en fanout por licencias activas cuando cambia un costo de tool
- `finance.tooling_cost.updated`
  - al consumir créditos (`debit`) con member attribution

## Acceptance Criteria

- [x] `direct_overhead_target` > 0 para miembros con tool licenses activas
- [x] `loaded_cost_target` = labor_cost + direct_overhead + shared_overhead
- [x] `suggested_bill_rate_target` refleja el costo real total del slice defendible
- [x] Projection se refresca cuando cambia una license (`finance.license_cost.updated`)
- [x] Projection se refresca cuando cambia tooling cost member-linked (`finance.tooling_cost.updated`)
- [x] Unit tests para compute function (subscription, credit, mixed)
- [x] `pnpm exec tsc --noEmit --pretty false` limpio
- [x] `pnpm build` limpio
- [ ] Extender a gastos member-linked solo cuando exista taxonomía canónica de overhead directo

## Dependencies & Impact

- **Depende de:** TASK-056 (member_capacity_economics — ya implementado)
- **Depende de:** AI Tools module (tools, licenses, credit ledger — ya implementado)
- **Impacta a:**
  - Agency Team view: loaded cost y bill rate dejan de ser subestimados
  - Person Intelligence tab: cost metrics con overhead directo incluido
  - My Assignments / My Performance: costos y referencias comerciales sobre el mismo snapshot canónico
- **Archivos owned:**
  - `src/lib/team-capacity/tool-cost-attribution.ts`
  - `src/lib/team-capacity/tool-cost-reader.ts`
  - `src/lib/sync/projections/member-capacity-economics.ts`
  - `src/lib/ai-tools/postgres-store.ts`

## Riesgo abierto

`greenhouse_finance.expenses` y `greenhouse_finance.suppliers` todavía no entregan una fuente suficientemente confiable para overhead directo por persona. Hasta que exista clasificación canónica adicional, no deben sumarse a `direct_overhead_target`.

## Estimación residual

El baseline principal ya quedó implementado. El remanente de esta task es un follow-up corto/medio cuando exista taxonomía madura para gastos member-linked.
