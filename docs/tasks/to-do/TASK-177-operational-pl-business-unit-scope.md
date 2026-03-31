# TASK-177 — Operational P&L: Business Unit Scope Materialization

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Bajo` |
| Status real | `Diseno` |
| Domain | Cost Intelligence / Business Lines / Finance |
| Sequence | Despues de TASK-167 (org scope) — mismo patron, diferente dimension |

## Summary

`operational_pl_snapshots` materializa P&L por `client`, `space` y proximamente `organization` (TASK-167). Falta la dimension `business_unit` que permita ver P&L por linea de negocio (Globe, Efeonce Digital, Reach, Wave, CRM Solutions). La arquitectura de Business Lines ya existe (`GREENHOUSE_BUSINESS_LINES_ARCHITECTURE_V1.md`) y el campo `service_line` ya se almacena en `fin_income` y `fin_expenses`, pero no hay aggregation a nivel BU en los snapshots de P&L. Esta task agrega `scope_type = 'business_unit'` al snapshot.

## Why This Task Exists

### Arquitectura BU ya existente

```
greenhouse_core.business_lines (canonico)
  ├── globe          → BU comercial: produccion audiovisual
  ├── efeonce_digital → BU comercial: marketing digital  
  ├── reach          → BU comercial: social media
  ├── wave           → BU comercial: contenido
  ├── crm_solutions  → BU comercial: CRM/tech
  └── (internal)     → BU operativa: overhead Efeonce

fin_income.service_line = 'globe' | 'efeonce_digital' | 'reach' | 'wave' | 'crm_solutions'
fin_expenses.service_line = 'globe' | 'efeonce_digital' | ... (parcial, muchos NULL)
```

### Problema actual

```
CFO pregunta: "Cual es el margen de Globe vs Reach este mes?"
  → No hay snapshot por BU
  → Workaround: query raw income/expenses agrupando por service_line manualmente
  → No incluye labor cost allocation por BU
  → Resultado: incompleto e inconsistente con P&L por client
```

### Modelo de datos destino

```
greenhouse_serving.operational_pl_snapshots
  ├── scope_type = 'client'          ✓ existe
  ├── scope_type = 'space'           ✓ existe
  ├── scope_type = 'organization'    ✗ TASK-167
  ├── scope_type = 'business_unit'   ✗ ESTA TASK
  └── scope_id = business_line_code (e.g., 'globe')
```

## Dependencies & Impact

- **Depende de:**
  - TASK-162 (commercial cost attribution — ya complete, asigna labor por client)
  - `fin_income.service_line` — ya existe y tiene datos
  - `fin_expenses.service_line` — existe pero con gaps (muchos NULL)
  - `greenhouse_core.business_lines` — tabla canonica de BU
  - Mapping client→BU: un client puede tener income en multiples BU
- **Impacta a:**
  - TASK-146 (service P&L — puede consumir BU snapshot como input)
  - Finance dashboard (`/api/finance/dashboard/by-service-line`) — puede usar snapshot materializado
  - Agency Economics — puede agregar por BU
  - Nexa — puede responder "Como le va a Globe?"
- **Archivos owned:**
  - `src/lib/cost-intelligence/compute-operational-pl.ts` (parcial — agregar BU aggregation)
  - `src/app/api/finance/intelligence/operational-pl/route.ts` (parcial — soportar scope=business_unit)

## Scope

### Slice 1 — Revenue attribution por BU (~2h)

1. **Revenue por BU** es directo: `SUM(total_amount_clp) FROM greenhouse_finance.income WHERE service_line = $1 AND period = $2`

2. **Income sin service_line:** Crear regla de fallback:
   ```
   Si income.service_line IS NULL:
     → buscar client_id en client_team_assignments
     → si el space del client tiene BU dominante (>80% del FTE asignado a un BU): atribuir a ese BU
     → si no: atribuir a 'unclassified'
   ```

3. **Materializar** en tabla auxiliar o CTE dentro de `materializeOperationalPl()`:
   ```sql
   WITH bu_revenue AS (
     SELECT 
       COALESCE(i.service_line, 'unclassified') AS business_unit,
       SUM(i.total_amount_clp) AS revenue_clp
     FROM greenhouse_finance.income i
     WHERE i.period_year = $1 AND i.period_month = $2
       AND i.status != 'cancelled' AND i.is_annulled = FALSE
     GROUP BY 1
   )
   ```

### Slice 2 — Cost attribution por BU (~3h)

El reto principal: los costos laborales estan asignados a clients, no a BUs directamente.

1. **Opcion elegida: derivar BU del client**
   ```
   Para cada client_economics snapshot (scope_type='client'):
     → determinar BU del client via service_line dominante en su income
     → si el client tiene income en multiples BUs: pro-rata por revenue
     → agregar labor_cost, direct_expense, overhead al BU correspondiente
   ```

2. **Expenses directos por BU:** `SUM(total_amount_clp) FROM greenhouse_finance.expenses WHERE service_line = $1`

3. **Expenses sin service_line y sin client:** van a overhead general (no se asignan a BU)

### Slice 3 — Materialization en snapshots (~2h)

1. **Agregar paso** en `materializeOperationalPl()`:
   ```typescript
   // Despues de materializar por client (y org si TASK-167 ya existe):
   const buSnapshots = computeBusinessUnitPl(year, month, clientSnapshots, buRevenue)
   
   for (const bu of buSnapshots) {
     await upsertOperationalPlSnapshot({
       scopeType: 'business_unit',
       scopeId: bu.businessLineCode,
       scopeName: bu.businessLineName,
       ...bu.metrics,
     }, { client })
   }
   ```

2. **Emitir evento:** `accounting.pl_snapshot.materialized` con `scope_type = 'business_unit'`

### Slice 4 — API y UI integration (~2h)

1. **API:** `GET /api/finance/intelligence/operational-pl?scope=business_unit` — ya soporta parametro `scope`, solo necesita que los datos existan

2. **Finance dashboard:** Enriquecer `/api/finance/dashboard/by-service-line` para leer de snapshot materializado en vez de query ad-hoc

3. **UI:** Agregar selector de scope en Finance Intelligence view: `Client | Space | Organization | Business Unit`

## Acceptance Criteria

- [ ] `materializeOperationalPl()` produce snapshots con `scope_type = 'business_unit'`
- [ ] Revenue correctamente atribuido por `service_line` de income
- [ ] Labor cost derivado de client snapshots → BU via service_line dominante
- [ ] Income sin `service_line` tiene fallback razonable (BU dominante del client o 'unclassified')
- [ ] API endpoint retorna P&L por BU
- [ ] Finance Intelligence view permite filtrar por Business Unit
- [ ] `pnpm build` pasa
- [ ] `pnpm test` pasa

## Decision: BU operativa vs BU comercial

Segun `GREENHOUSE_BUSINESS_LINES_ARCHITECTURE_V1.md`, existe distincion entre BU comercial (cliente-facing) y BU operativa (internal). Para P&L:

- **BU comercial** (globe, efeonce_digital, reach, wave, crm_solutions): reciben revenue + costs
- **BU operativa** (efeonce_internal): solo costs (overhead). NO aparece en P&L por BU — se distribuye como overhead.

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/lib/cost-intelligence/compute-operational-pl.ts` | Agregar BU aggregation |
| `src/app/api/finance/intelligence/operational-pl/route.ts` | Ya soporta scope param |
| `src/app/api/finance/dashboard/by-service-line/route.ts` | Leer de snapshot materializado |
| `src/views/greenhouse/finance/intelligence/FinanceIntelligenceView.tsx` | Agregar scope BU |
| `src/types/business-line.ts` | Reference (no cambio) |
