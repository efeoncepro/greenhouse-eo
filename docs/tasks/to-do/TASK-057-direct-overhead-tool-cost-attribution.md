# TASK-057 — Direct Overhead: Tool & License Cost Attribution per Person

## Estado

Pendiente. Bloqueador: `direct_overhead_target` en `member_capacity_economics` es 0 para todos los miembros porque no existe un compute que sume el costo de herramientas por persona.

## Context

La cadena de costo cargado (loaded cost) por persona tiene 3 componentes:
1. **Labor cost** — compensación mensual (base + bonuses + cargas sociales) ✅ Implementado
2. **Shared overhead** — gastos operacionales prorrateados por horas contratadas ✅ Implementado (TASK-056)
3. **Direct overhead** — costo de herramientas/licencias asignadas a cada persona ❌ **Placeholder = 0**

Sin direct overhead, el `loaded_cost_target` y `suggested_bill_rate_target` subestiman el costo real de cada persona. Esto afecta la rentabilidad visible en Agency Team, Organization Economics, y Person Intelligence.

## Lo que ya existe

### Infraestructura construida (lista para consumir)

| Componente | Archivo | Estado |
|-----------|---------|--------|
| Overhead layer | `src/lib/team-capacity/overhead.ts` | `getDirectOverheadTarget()` + `allocateSharedOverheadTarget()` ✅ |
| Pricing layer | `src/lib/team-capacity/pricing.ts` | `getLoadedCostPerHour()` consume direct + shared overhead ✅ |
| Capacity economics projection | `src/lib/sync/projections/member-capacity-economics.ts` | Assembla todo per-member, `direct_overhead_target = 0` ❌ |
| AI Tools catalog | `src/lib/ai-tools/postgres-store.ts` | CRUD de tools, providers, licenses ✅ |
| Tool cost model | `src/types/ai-tools.ts` | `subscriptionAmount`, `creditUnitCost`, `costModel` ✅ |
| Member tool licenses | `src/types/ai-tools.ts` | `MemberToolLicense` con memberId, status, accessLevel ✅ |
| Credit ledger | `src/types/ai-tools.ts` | `AiCreditLedgerEntry` con costUsd, consumedByMemberId ✅ |
| Finance suppliers | `src/lib/finance/shared.ts` | `fin_suppliers` con category (software, infrastructure) ✅ |
| Finance expenses | `src/lib/finance/shared.ts` | `fin_expenses` con supplier_id, member_id ✅ |
| Bridge tool → supplier | `src/types/ai-tools.ts` | `AiTool.finSupplierId` → `fin_suppliers.supplier_id` ✅ |
| Event catalog | `src/lib/sync/event-catalog.ts` | `finance.license_cost.updated` declarado ✅ |

### La cadena de datos completa (3 fuentes → 1 número)

```
FUENTE 1: Subscription tools
  ai_tools (costModel=subscription) → subscriptionAmount / subscriptionSeats
  → member_tool_licenses (memberId, status=active)
  → costo mensual per-person = subscriptionAmount / seats

FUENTE 2: Per-credit tools
  ai_credit_ledger → WHERE consumedByMemberId = X AND period = current
  → SUM(costUsd) del mes

FUENTE 3: Finance expenses directos
  fin_expenses → WHERE member_id = X AND supplier_category IN ('software','infrastructure')
  → SUM(total_amount_clp) del mes

RESULTADO: direct_overhead_target = fuente1 + fuente2 + fuente3
```

## Plan de implementación

### Slice 1 — Compute function (pura, sin I/O)

**Archivo nuevo:** `src/lib/team-capacity/tool-cost-attribution.ts`

```typescript
export function computeDirectOverheadForMember(
  licenses: Array<{ toolSubscriptionAmount: number; toolSubscriptionSeats: number; costModel: string }>,
  creditConsumption: { totalCostUsd: number } | null,
  directExpenses: { totalAmountClp: number } | null,
  fxRateUsdToClp: number | null
): { directOverheadClp: number; directOverheadUsd: number; breakdown: DirectOverheadBreakdown }
```

Con tests unitarios para cada fuente + combinaciones.

### Slice 2 — Data reader

**Archivo nuevo:** `src/lib/team-capacity/tool-cost-reader.ts`

```typescript
export async function readMemberToolCosts(memberId: string, year: number, month: number): Promise<{
  subscriptionCosts: number  // from active licenses
  creditCosts: number        // from credit ledger
  directExpenses: number     // from fin_expenses
}>
```

Reads from:
- `greenhouse_ai.tool_licenses` WHERE member_id AND status=active → JOIN tools for subscription cost
- `greenhouse_ai.ai_credit_ledger` WHERE consumed_by_member_id AND period
- `greenhouse_finance.expenses` WHERE member_id AND supplier category IN software/infrastructure

### Slice 3 — Wire to projection

**Archivo:** `src/lib/sync/projections/member-capacity-economics.ts`

En el refresh function, después de leer compensation y antes de calcular loaded cost:
1. Call `readMemberToolCosts(memberId, year, month)`
2. Call `computeDirectOverheadForMember(...)`
3. Pass result to `getDirectOverheadTarget()` (ya existe en overhead.ts)
4. El `loaded_cost_target` ya suma `direct_overhead_target` automáticamente

### Slice 4 — Event publishing

**Archivo:** `src/lib/ai-tools/postgres-store.ts`

Cuando se crea/modifica un `MemberToolLicense`:
- `publishOutboxEvent({ eventType: 'finance.license_cost.updated', payload: { memberId } })`

Ya está declarado en el event catalog. Solo falta el publish call.

### Slice 5 — Verificación

- Re-ejecutar projection para todos los miembros
- Verificar que `direct_overhead_target > 0` para miembros con licenses
- Verificar que `loaded_cost_target` y `suggested_bill_rate_target` reflejan el overhead

## Acceptance Criteria

- [ ] `direct_overhead_target` > 0 para miembros con tool licenses activas
- [ ] `loaded_cost_target` = labor_cost + direct_overhead + shared_overhead
- [ ] `suggested_bill_rate_target` refleja el costo real total
- [ ] Projection se refresca cuando cambia una license (`finance.license_cost.updated`)
- [ ] Unit tests para compute function (subscription, credit, expense, mixed)
- [ ] `npx tsc --noEmit` limpio

## Dependencies & Impact

- **Depende de:** TASK-056 (member_capacity_economics — ya implementado por Codex)
- **Depende de:** AI Tools module (tools, licenses, credit ledger — ya implementado)
- **Depende de:** Finance module (suppliers, expenses — ya implementado)
- **Impacta a:**
  - Agency Team view: loaded cost y bill rate dejan de ser subestimados
  - Organization Economics: team intelligence con costo real
  - Person Intelligence tab: cost metrics con overhead incluido
  - Finance Intelligence: client economics con overhead prorrateado
- **Archivos owned:**
  - `src/lib/team-capacity/tool-cost-attribution.ts` (nuevo)
  - `src/lib/team-capacity/tool-cost-reader.ts` (nuevo)
  - `src/lib/sync/projections/member-capacity-economics.ts` (modificar — agregar direct overhead)
  - `src/lib/ai-tools/postgres-store.ts` (modificar — agregar event publishing)

## Estimación

3-4 horas. La infraestructura está lista — es conectar 3 fuentes de datos existentes a un compute que alimenta un campo que ya existe pero está en 0.
