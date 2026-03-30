# TASK-070 — Cost Intelligence Finance UI: Period Closure Dashboard

## Delta 2026-03-30 — Foundation lista para continuidad

- `TASK-067` ya quedó cerrada y deja listo el carril base:
  - schema `greenhouse_cost_intelligence`
  - serving tables base
  - domain `cost_intelligence`
  - eventos `accounting.*`
  - cron route dedicada con smoke `200`
- Esta task sigue correctamente bloqueada por `TASK-068 + TASK-069`, no por infraestructura base.

## Delta 2026-03-30 — Auditoría Finance + dependencias clarificadas

- **Bloqueada por TASK-068 + TASK-069** (necesita ambas APIs).
- Puede ejecutarse **en paralelo con TASK-071** (ambas consumen las mismas APIs).
- Los patterns de UI ya están establecidos: `ExecutiveCardShell`, `Chip` semáforo, `Table` expandible — esta task los reutiliza.
- `FinanceDashboardView.tsx` (48KB) y `ClientEconomicsView.tsx` (31KB) ya existen como referencia de patterns.
- TASK-138 Slice 2 (dashboard KPIs con contexto) complementa esta UI pero es independiente.

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Medio` |
| Status real | `Diseño` |
| Rank | — |
| Domain | Cost Intelligence |

## Summary

Implementar la surface de Cost Intelligence dentro de la sección **"Economía"** del sidebar (ya existe como `Economía — P&L y rentabilidad`), con tabla de períodos con semáforos de readiness por pata (Payroll, Ingresos, Gastos, FX), P&L inline expandible por mes, y botones de cierre/reapertura.

## Why This Task Exists

Los datos de Cost Intelligence (TASK-067, TASK-068) no tienen valor sin una surface donde el usuario pueda:
- Ver qué meses están listos para cerrar
- Inspeccionar el P&L del período antes de cerrar
- Ejecutar el cierre manual
- Reabrir un período si se detecta un error

## Goal

Surface operativa dentro de "Economía" para gestión de cierre de período y visualización de P&L operativo.

## Architecture Alignment

- Fuente canónica: `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md` § 8
- Surface: dentro de la sección "Economía" del sidebar (ya existe con label `Economía — P&L y rentabilidad`), no como tab de Finance
- Patrón UI: Vuexy tables + accordions + status chips
- Roles: `finance_manager`, `efeonce_admin`

## Dependencies & Impact

- **Depende de:**
  - TASK-068 (period closure APIs) — **blocker**
  - TASK-069 (P&L APIs) — **blocker**
  - Finance module existente (tab structure, layout)
- **Impacta a:**
  - Economía section — agrega surface de cierre de período
  - TASK-071 — establece patrones visuales reutilizables para otros consumers
- **Archivos owned:**
  - `src/views/greenhouse/economia/PeriodClosureDashboard.tsx`
  - `src/views/greenhouse/economia/PeriodClosureRow.tsx`
  - `src/views/greenhouse/economia/PeriodPlSummary.tsx`
  - `src/app/(dashboard)/economia/cierre/page.tsx`

## Current Repo State

- Sidebar ya tiene sección "Economía — P&L y rentabilidad" como item de navegación
- No existe surface de cierre de período
- El portal usa patrones Vuexy: `Card`, `CardHeader`, `CardContent`, tablas con `@tanstack/react-table`, chips de status

## Scope

### Slice 1 — Period closure table
1. Tabla de períodos (últimos 12 meses):
   - Columnas: Período, Payroll, Ingresos, Gastos, FX, Readiness, Estado, Acciones
   - Cada pata muestra chip de color:
     - Verde: completo/exported
     - Amarillo: parcial/calculated
     - Rojo: pendiente
     - Gris: no aplica
   - Readiness: progress bar 0-100%
   - Estado: `Abierto`, `Listo`, `Cerrado`, `Reabierto`
   - Acciones: "Cerrar" (cuando ready), "Reabrir" (cuando closed, solo admin)

### Slice 2 — P&L inline expandible
1. Al expandir un row de la tabla:
   - Tabla de P&L por client del período
   - Columnas: Cliente, Ingresos, Costo Laboral, Gastos Directos, Overhead, Costo Total, Margen Bruto, Margen %
   - Row de totals al final
   - Chips de color en Margen %: verde (>20%), amarillo (5-20%), rojo (<5%)
   - Badge `provisional` si período no cerrado

### Slice 3 — Close/reopen actions
1. Botón "Cerrar Período":
   - Confirmation dialog con summary del P&L
   - POST a `/api/cost-intelligence/periods/[year]/[month]/close`
   - Toast de éxito/error
   - Refresh de tabla
2. Botón "Reabrir" (solo visible para admin):
   - Dialog con campo obligatorio de razón
   - POST a `.../reopen`
   - Toast + refresh

### Slice 4 — Empty states y edge cases
1. Período sin datos de payroll: mostrar chip "Sin nómina" en gris
2. Período sin income: mostrar chip "Sin ingresos"
3. Período futuro: no mostrar
4. Período muy antiguo (>12 meses): paginación o "Ver más"

## Out of Scope

- Distributed consumers (TASK-071)
- Budget vs actual visualization (fase 3)
- Exportación de P&L a PDF/Excel (follow-up)
- Configuración de thresholds de margin alert (usar defaults de `period_closure_config`)

## Acceptance Criteria

- [ ] Surface de cierre de período visible en Economía para `finance_manager` y `efeonce_admin`
- [ ] Tabla muestra últimos 12 meses con semáforos correctos por pata
- [ ] P&L inline expandible muestra breakdown por client
- [ ] Botón "Cerrar" funciona cuando readiness = 100%
- [ ] Botón "Reabrir" solo visible para `efeonce_admin`, requiere razón
- [ ] Badge `provisional` visible en períodos no cerrados
- [ ] Chips de color en margin % con thresholds correctos
- [ ] `pnpm build` pasa
- [ ] Validación visual en preview

## Verification

- `pnpm build`
- `pnpm lint`
- Validación visual local/preview:
  - Tabla de períodos con semáforos
  - Expandir un mes → P&L inline
  - Click cerrar → confirmación → refresh
  - Click reabrir (como admin) → razón → refresh
