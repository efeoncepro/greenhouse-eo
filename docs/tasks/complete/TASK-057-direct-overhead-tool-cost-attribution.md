# TASK-057 — Direct Overhead: Tool & License Cost Attribution per Person

## Delta 2026-03-26 (cierre)

- Se completó la taxonomía de overhead directo por persona en `greenhouse_finance.expenses`:
  - 3 columnas nuevas: `direct_overhead_scope`, `direct_overhead_kind`, `direct_overhead_member_id`
  - Tipos canónicos en `shared.ts`: `DIRECT_OVERHEAD_SCOPES` (`none`, `member_direct`, `shared`) y `DIRECT_OVERHEAD_KINDS` (`tool_license`, `tool_usage`, `equipment`, `reimbursement`, `other`)
  - CRUD completo: `createFinanceExpenseInPostgres` y `updateFinanceExpenseInPostgres` soportan los 3 campos
  - Migration script: `scripts/migrations/add-expense-direct-overhead-columns.sql`
- `tool-cost-reader.ts` ahora lee 3 fuentes independientes con degradación por fuente:
  1. Licencias activas member-linked (AI tooling)
  2. Consumo de créditos member-linked (AI tooling)
  3. Gastos `member_direct` de Finance (equipment, reimbursement, other)
- Guardia de deduplicación: expenses con `direct_overhead_kind IN ('tool_license', 'tool_usage')` se excluyen del reader de Finance para evitar doble conteo con AI tooling
- Cada fuente degrada independientemente — si las tablas AI no existen, Finance sigue fluyendo y viceversa
- La proyección tiene try-catch adicional que degrada a overhead 0 si todo falla
- Tests: 25 tests passing (4 suites), incluyendo escenarios de degradación por fuente
- `tsc --noEmit` limpio, `pnpm build` exitoso

## Estado

Completa. Todos los acceptance criteria cerrados.

## Context

La cadena de costo cargado (loaded cost) por persona tiene 3 componentes:
1. **Labor cost** — compensación mensual (base + bonuses + cargas sociales) ✅ Implementado
2. **Shared overhead** — gastos operacionales prorrateados por horas contratadas ✅ Implementado (TASK-056)
3. **Direct overhead** — costo de herramientas/licencias/equipamiento asignadas a cada persona ✅ Implementado

## Lo que ya existe

### Infraestructura construida

| Componente | Archivo | Estado |
|-----------|---------|--------|
| Overhead layer | `src/lib/team-capacity/overhead.ts` | `getDirectOverheadTarget()` + `allocateSharedOverheadTarget()` ✅ |
| Pricing layer | `src/lib/team-capacity/pricing.ts` | `getLoadedCostPerHour()` consume direct + shared overhead ✅ |
| Capacity economics projection | `src/lib/sync/projections/member-capacity-economics.ts` | Assembla todo per-member con degradación resiliente ✅ |
| AI Tools catalog | `src/lib/ai-tools/postgres-store.ts` | CRUD de tools, providers, licenses ✅ |
| Tool cost model | `src/types/ai-tools.ts` | `subscriptionAmount`, `creditUnitCost`, `costModel` ✅ |
| Member tool licenses | `src/types/ai-tools.ts` | `MemberToolLicense` con memberId, status, accessLevel ✅ |
| Credit ledger | `src/types/ai-tools.ts` | `AiCreditLedgerEntry` con `consumedByMemberId`, `totalCost`, `totalCostClp` ✅ |
| Bridge tool → supplier | `src/types/ai-tools.ts` | `AiTool.finSupplierId` → `greenhouse_finance.suppliers.supplier_id` ✅ |
| Event catalog | `src/lib/sync/event-catalog.ts` | `finance.license_cost.updated` y `finance.tooling_cost.updated` declarados ✅ |
| Taxonomía overhead directo | `src/lib/finance/shared.ts` | `DIRECT_OVERHEAD_SCOPES` + `DIRECT_OVERHEAD_KINDS` ✅ |
| Expense CRUD con overhead | `src/lib/finance/postgres-store-slice2.ts` | create/update/map soportan `directOverheadScope/Kind/MemberId` ✅ |
| DB migration | `scripts/migrations/add-expense-direct-overhead-columns.sql` | ALTER TABLE + index ✅ |

### La cadena de datos completa (3 fuentes → 1 número)

```text
FUENTE 1: Subscription / hybrid tools (AI module)
  greenhouse_ai.tool_catalog → subscriptionAmount / subscriptionSeats
  → greenhouse_ai.member_tool_licenses (memberId, status=active)
  → costo mensual per-person

FUENTE 2: Per-credit tools (AI module)
  greenhouse_ai.credit_ledger
  → WHERE consumedByMemberId = X AND period = current
  → SUM(total_cost_clp) del mes

FUENTE 3: Finance expenses member-direct
  greenhouse_finance.expenses
  → WHERE direct_overhead_scope = 'member_direct'
    AND direct_overhead_kind NOT IN ('tool_license', 'tool_usage')  ← dedup guard
  → SUM(total_amount_clp) del período

RESULTADO: direct_overhead_target = fuente1 + fuente2 + fuente3
```

### Guardia de deduplicación

Para evitar doble conteo entre AI tooling y Finance:
- `tool_license` y `tool_usage` → SIEMPRE se leen desde AI tooling (fuentes 1 y 2)
- `equipment`, `reimbursement`, `other` → se leen desde Finance expenses (fuente 3)
- Si un gasto de Finance tiene `direct_overhead_kind = 'tool_license'` o `'tool_usage'`, es excluido del reader para no duplicar lo que ya viene de AI tooling

### Degradación resiliente

Cada fuente de datos falla independientemente:
- Si las tablas `greenhouse_ai.*` no existen → licenseRows y toolingRows = []
- Si la columna `direct_overhead_scope` no existe en expenses → directExpenseRows = []
- Si TODAS las fuentes fallan → try-catch en la proyección degrada a overhead 0
- La proyección nunca se rompe por fuentes opcionales

## Implementación

### Slice 1 — Compute function (pura, sin I/O)

**Archivo:** `src/lib/team-capacity/tool-cost-attribution.ts`

- Normalización mensual por billing cycle (`monthly`, `quarterly`, `annual/yearly`)
- Cálculo per-seat
- Conversión a moneda objetivo usando FX explícito
- Breakdown: `licenseCostTarget`, `toolingCostTarget`, `equipmentCostTarget`

### Slice 2 — Data reader

**Archivo:** `src/lib/team-capacity/tool-cost-reader.ts`

Lee 3 fuentes con degradación independiente:
1. `greenhouse_ai.member_tool_licenses` + `greenhouse_ai.tool_catalog`
2. `greenhouse_ai.credit_ledger`
3. `greenhouse_finance.expenses` con `direct_overhead_scope = 'member_direct'` (excluyendo tool_license/tool_usage)

### Slice 3 — Wire to projection

**Archivo:** `src/lib/sync/projections/member-capacity-economics.ts`

La proyección ahora:
1. Lee costos directos de tooling por miembro/período (con try-catch resiliente)
2. Calcula `direct_overhead_target` = licenses + tooling + equipment/expenses
3. Incorpora ese valor a `loaded_cost_target`
4. Mantiene `shared_overhead_target` separado

### Slice 4 — Event publishing

**Archivo:** `src/lib/ai-tools/postgres-store.ts`

Publica:
- `finance.license_cost.updated` en create/reactivate/update de licencias + fanout
- `finance.tooling_cost.updated` al consumir créditos con member attribution

### Slice 5 — Taxonomía y CRUD de overhead directo

**Archivos:**
- `src/lib/finance/shared.ts` — tipos `DIRECT_OVERHEAD_SCOPES` + `DIRECT_OVERHEAD_KINDS`
- `src/lib/finance/postgres-store-slice2.ts` — create/update/map de expenses con las 3 columnas
- `src/app/api/finance/expenses/route.ts` — validación y pasaje de los 3 campos
- `scripts/setup-postgres-finance.sql` + `scripts/setup-postgres-finance-slice2.sql` — DDL
- `scripts/migrations/add-expense-direct-overhead-columns.sql` — ALTER TABLE para BD existentes

## Acceptance Criteria

- [x] `direct_overhead_target` > 0 para miembros con tool licenses activas
- [x] `loaded_cost_target` = labor_cost + direct_overhead + shared_overhead
- [x] `suggested_bill_rate_target` refleja el costo real total
- [x] Projection se refresca cuando cambia una license (`finance.license_cost.updated`)
- [x] Projection se refresca cuando cambia tooling cost member-linked (`finance.tooling_cost.updated`)
- [x] Unit tests para compute function (subscription, credit, mixed, equipment)
- [x] `pnpm exec tsc --noEmit --pretty false` limpio
- [x] `pnpm build` limpio
- [x] Extender a gastos member-linked con taxonomía canónica de overhead directo

## Dependencies & Impact

- **Depende de:** TASK-056 (member_capacity_economics — ya implementado)
- **Depende de:** AI Tools module (tools, licenses, credit ledger — ya implementado)
- **Impacta a:**
  - Agency Team view: loaded cost y bill rate con overhead directo real
  - Person Intelligence tab: cost metrics con overhead directo incluido
  - My Assignments / My Performance: costos sobre el mismo snapshot canónico
- **Archivos owned:**
  - `src/lib/team-capacity/tool-cost-attribution.ts`
  - `src/lib/team-capacity/tool-cost-reader.ts`
  - `src/lib/sync/projections/member-capacity-economics.ts`
  - `src/lib/ai-tools/postgres-store.ts`

## Post-deploy

1. Ejecutar migration: `scripts/migrations/add-expense-direct-overhead-columns.sql`
2. Forzar re-materialización del snapshot llamando a `POST /api/sync/projections/refresh` con `{ name: "member_capacity_economics" }`
