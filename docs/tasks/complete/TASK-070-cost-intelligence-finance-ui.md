# TASK-070 — Cost Intelligence Finance UI: Period Closure Dashboard

## Delta 2026-03-30 — Módulo ya documentado end-to-end

- La arquitectura ya refleja al módulo de Cost Intelligence como sistema operativo completo:
  - foundation (`TASK-067`)
  - period closure (`TASK-068`)
  - operational P&L (`TASK-069`)
  - consumers distribuidos iniciados (`TASK-071`)
- Esta task ya no debe leerse como una UI aislada “bloqueada por el backend”.
- Su remanente real es:
  - validación visual
  - confirmación de qué hacer con `ClientEconomicsView` como fallback o surface legacy
  - build limpio del workspace, sin el lock inestable de `.next`

## Delta 2026-03-30 — Ejecución iniciada

- La task entra en `in-progress` después de contrastar el brief con:
  - `GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
  - las APIs reales de `period closure` y `operational_pl`
- Orden operativo confirmado:
  - `TASK-070` va antes de `TASK-071` como surface primaria de validación sobre Cost Intelligence
  - `TASK-071` queda como consumers downstream sobre el serving ya probado en Finance
- La implementación deja de apoyarse en `ClientEconomicsView` como surface principal de `/finance/intelligence` y pasa a una vista dedicada de cierre de período y P&L operativo.

## Delta 2026-03-30 — Slice principal implementado

- `/finance/intelligence` ya dejó de renderizar `ClientEconomicsView` como surface principal.
- Nueva vista implementada:
  - `src/views/greenhouse/finance/FinancePeriodClosureDashboardView.tsx`
- La surface nueva ya cubre:
  - hero y KPIs de salud del cierre
  - tabla de últimos 12 períodos
  - semáforos por nómina, ingresos, gastos y FX
  - P&L inline expandible por cliente
  - diálogo de cierre con summary agregado
  - diálogo de reapertura con razón obligatoria
  - gating de acciones por rol:
    - cierre: `finance_manager` y `efeonce_admin`
    - reapertura: `efeonce_admin`
  - alineación de APIs de Cost Intelligence con arquitectura:
    - lecturas: `finance`, `hr_payroll`, `efeonce_admin`
    - cierre: `finance_manager`, `efeonce_admin`
    - reapertura: `efeonce_admin`
- Validación técnica ya pasada:
  - `pnpm exec vitest run src/views/greenhouse/finance/FinancePeriodClosureDashboardView.test.tsx`
  - `pnpm exec eslint 'src/lib/tenant/authorization.ts' 'src/app/(dashboard)/finance/intelligence/page.tsx' 'src/app/api/cost-intelligence/periods/route.ts' 'src/app/api/cost-intelligence/periods/[year]/[month]/route.ts' 'src/app/api/cost-intelligence/periods/[year]/[month]/close/route.ts' 'src/app/api/cost-intelligence/periods/[year]/[month]/reopen/route.ts' 'src/app/api/cost-intelligence/pl/route.ts' 'src/app/api/cost-intelligence/pl/[scopeType]/[scopeId]/route.ts' 'src/config/greenhouse-nomenclature.ts' 'src/views/greenhouse/finance/FinancePeriodClosureDashboardView.tsx' 'src/views/greenhouse/finance/FinancePeriodClosureDashboardView.test.tsx'`
  - `pnpm exec tsc --noEmit --pretty false`
- Limitación de validación:
  - `pnpm build` compila pero el proceso `next build` está dejando lock/colgándose en `.next` dentro de este workspace; no se toma todavía como validación limpia del slice.
- La task se mantiene `in-progress` hasta tener:
  - validación visual real del flujo
  - confirmación de qué hacer con `ClientEconomicsView` como surface legacy
  - build limpio sin el lock/hang del workspace

## Delta 2026-03-30 — TASK-068 cerrada

- `TASK-068` ya quedó cerrada y deja listo el carril de cierre de período:
  - status por período
  - semántica de readiness
  - close/reopen
  - smoke reactivo validado
- Esta task deja de estar bloqueada por `TASK-068`.
- El blocker real restante pasó a ser `TASK-069` durante el arranque del slice, pero ese bloqueo ya quedó resuelto.

## Delta 2026-03-30 — Foundation lista para continuidad

- `TASK-067` ya quedó cerrada y deja listo el carril base:
  - schema `greenhouse_cost_intelligence`
  - serving tables base
  - domain `cost_intelligence`
  - eventos `accounting.*`
  - cron route dedicada con smoke `200`
- Esta task ya no está bloqueada por infraestructura base; ese punto quedó resuelto al cerrar `TASK-069`.

## Delta 2026-03-30 — Auditoría Finance + dependencias clarificadas

- **Ya no bloqueada por TASK-069**; el carril base de P&L quedó cerrado para este slice.
- Puede ejecutarse **en paralelo con TASK-071** (ambas consumen las mismas APIs).
- Los patterns de UI ya están establecidos: `ExecutiveCardShell`, `Chip` semáforo, `Table` expandible — esta task los reutiliza.
- `FinanceDashboardView.tsx` (48KB) y `ClientEconomicsView.tsx` (31KB) ya existen como referencia de patterns.
- TASK-138 Slice 2 (dashboard KPIs con contexto) complementa esta UI pero es independiente.

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `in-progress` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Medio` |
| Status real | `Implementación avanzada` |
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
  - TASK-068 (period closure APIs) — **cerrada**
  - TASK-069 (P&L APIs) — **cerrada para este slice base**
  - Finance module existente (tab structure, layout)
- **Impacta a:**
  - Economía section — agrega surface de cierre de período
  - TASK-071 — establece patrones visuales reutilizables para otros consumers
- **Archivos owned:**
  - `src/views/greenhouse/finance/FinancePeriodClosureDashboardView.tsx`
  - `src/app/(dashboard)/finance/intelligence/page.tsx`

## Current Repo State

- Sidebar ya tiene sección "Economía — P&L y rentabilidad" como item de navegación
- `/finance/intelligence` ya consume Cost Intelligence como dashboard principal de cierre de período
- `ClientEconomicsView.tsx` sigue existiendo como surface legacy, pero ya no es la portada de `Inteligencia financiera`
- El portal usa patrones Greenhouse + Vuexy: `ExecutiveCardShell`, chips de status, tablas expandibles y estados vacíos compartidos

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

- [x] Surface de cierre de período visible en Economía para `finance_manager` y `efeonce_admin`
- [x] Tabla muestra últimos 12 meses con semáforos correctos por pata
- [x] P&L inline expandible muestra breakdown por client
- [x] Botón "Cerrar" funciona cuando readiness = 100%
- [x] Botón "Reabrir" solo visible para `efeonce_admin`, requiere razón
- [x] Badge `provisional` visible en períodos no cerrados
- [x] Chips de color en margin % con thresholds correctos
- [ ] `pnpm build` pasa limpio sin lock/hang
- [ ] Validación visual en preview

## Verification

- `pnpm exec eslint 'src/app/(dashboard)/finance/intelligence/page.tsx' 'src/views/greenhouse/finance/FinancePeriodClosureDashboardView.tsx'`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec vitest run src/views/greenhouse/finance/FinancePeriodClosureDashboardView.test.tsx`
- `pnpm build` compila pero queda pendiente como validación limpia por lock/hang residual de `.next`
- Validación visual local/preview:
  - Tabla de períodos con semáforos
  - Expandir un mes → P&L inline
  - Click cerrar → confirmación → refresh
  - Click reabrir (como admin) → razón → refresh
