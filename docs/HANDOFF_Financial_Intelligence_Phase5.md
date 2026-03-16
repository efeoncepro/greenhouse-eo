# Handoff — Financial Intelligence Layer Phase 5

**Fecha**: 2026-03-16
**Branch**: `develop`
**Autor**: Claude Code (asistido)

---

## Contexto

Phase 5 cierra el ciclo de visualización de la capa de inteligencia financiera. Las phases 1-4 construyeron el schema, CRUD, endpoints y vistas base. Phase 5 agrega:
1. Visualización de tendencias multi-período
2. Integración completa con Person 360
3. Export de datos
4. Fix crítico en el cálculo del P&L

---

## Qué se entregó

### 1. Trend chart — Evolución de márgenes (ClientEconomicsView)

**Qué hace**: Gráfico de área que muestra el promedio ponderado por revenue del margen bruto y neto de los últimos 6 meses.

**Cómo funciona**:
- Fetch automático a `GET /api/finance/intelligence/client-economics/trend?months=6` cuando hay snapshots cargados
- Agrupa respuesta por período y calcula `avg = Σ(marginPercent × revenue) / Σ(revenue)` por mes
- 2 series: margen bruto (success/solid) y margen neto (primary/dashed)
- Se renderiza entre los charts existentes y la tabla, solo cuando hay >= 2 períodos

**Decisiones de diseño**:
- Promedio ponderado por revenue (no naive) — un Space de $100M a 10% pesa más que uno de $1M a 50%
- ApexCharts area (no Recharts) para mantener consistencia con los otros charts de la misma vista

### 2. CSV Export

**Qué hace**: Descarga los datos de la tabla de economía por Space como CSV.

**Cómo funciona**:
- Click en "Exportar CSV" del OptionMenu → genera CSV client-side desde los snapshots ordenados
- Blob download con nombre `economia_spaces_{Mes}_{Año}.csv`
- Toast de confirmación

### 3. PersonFinanceTab — Tab de Finanzas en Person 360

**Qué hace**: Muestra la huella financiera de un colaborador: en qué Spaces se distribuye su costo y su historial de nómina.

**Cómo funciona**:
- Lazy-load desde `GET /api/people/{memberId}/finance`
- 4 KPIs: Spaces asignados, costo laboral total (período más reciente), nóminas procesadas, gastos asociados
- Tabla de cost attribution con LinearProgress por dedicación y CustomChip de período
- Tabla compacta de nómina reciente (últimos 6)

**Archivos**:
- `src/views/greenhouse/people/tabs/PersonFinanceTab.tsx` (nuevo)
- `src/views/greenhouse/people/helpers.ts` (finance en TAB_CONFIG)
- `src/views/greenhouse/people/PersonTabs.tsx` (import + TabPanel)

**Permisos**: Visible para roles `efeonce_admin` y `finance_manager` (ya definido en TAB_PERMISSIONS).

### 4. Fix Dashboard completo — Payroll no se reflejaba en KPIs ni charts

**Problema**: Además del P&L endpoint (fix 4a abajo), la vista `FinanceDashboardView` usaba `expenseSummary` (que solo consulta gastos registrados) para el KPI "Egresos del mes", el bar chart "Ingresos vs Egresos" y el chart "Flujo de caja". Payroll nunca aparecía en ninguno de estos elementos.

**Fix aplicado**:
- `adjustedExpenseData`: para el mes cubierto por el P&L, reemplaza el valor de egresos con `pnl.costs.totalExpenses` (que ya incluye `unlinkedPayrollCost`)
- KPI "Egresos del mes": usa `pnl.costs.totalExpenses` como fuente primaria, con subtitle "Incluye nómina de N personas"
- Bar chart: la serie "Egresos" usa `adjustedExpenseData`
- Cash flow: `cashFlowData` se recalcula desde la serie ajustada
- Meses históricos sin P&L mantienen el valor de `expenseSummary` (limitación conocida)

**Archivo**: `src/views/greenhouse/finance/FinanceDashboardView.tsx`

### 4a. Fix P&L — Payroll no fluía al Estado de Resultados

**Problema**: El endpoint `GET /api/finance/dashboard/pnl` consultaba payroll por separado y lo devolvía como `pnl.payroll`, pero nunca sumaba el gross de payroll a `directLabor` ni a `totalExpenses`. Resultado: margen bruto 100% y costo laboral $0 en la card de Estado de Resultados.

**Fix aplicado**:
- Nueva query: suma de expenses con `payroll_entry_id IS NOT NULL` (ya contados en expenses)
- `unlinkedPayrollCost = max(0, payrollGross - linkedPayrollExpenses)`
- Se suma a `directLabor` y `totalExpenses`
- Todas las queries ahora corren en paralelo (`Promise.all`)

**Casos cubiertos**:
- Sin expenses vinculados a payroll → full payroll gross va a directLabor
- Todos los payroll entries vinculados como expenses → 0 adicional (ya contados)
- Parcial → solo la porción no vinculada

---

## Qué queda pendiente

### Inmediato (deuda técnica)
- **Backfill de cost_category**: script `scripts/backfill-cost-category.ts` existe pero no se ha ejecutado
- **Ejecutar verificación P2 view**: `scripts/verify-p2-view.ts` falló por env vars

### Funcionalidad futura
- **Cost allocations CRUD UI**: el store existe pero no hay vista para crear/editar manualmente
- **Dashboard summary enriquecido para meses históricos**: el endpoint `GET /api/finance/dashboard/summary` no incluye labor costs — los meses históricos en los charts solo muestran gastos registrados sin payroll
- **Partnership income UI**: columnas de partner en schema/mappers pero sin UI
- **Trend chart drill-down**: click en punto del trend → filtrar tabla por ese período

### Según CODEX_TASK (fases restantes)
- Fase 3: Partnership income endpoints + tab
- Fase 4: Cost allocation CRUD + module margin
- Fase 5: Unit economics calculate + LTV/CAC

---

## Cómo probar

1. **Trend chart**: Navegar a `/finance/intelligence`, calcular rentabilidad para >= 2 meses distintos, el chart aparece automáticamente
2. **CSV export**: En la misma vista, click en menú de 3 puntos de la tabla → "Exportar CSV"
3. **PersonFinanceTab**: Navegar a `/people/{memberId}?tab=finance` (requiere rol admin o finance_manager)
4. **Fix P&L**: Navegar a `/finance`, verificar que "Costo laboral directo" muestre el gross de payroll y que los márgenes reflejen este costo
5. **Fix Dashboard payroll**: En `/finance`, verificar que el KPI "Egresos del mes" incluya nómina (debe mostrar "Incluye nómina de N personas"), que la barra de egresos en el chart sea mayor que solo los gastos registrados, y que el flujo de caja descuente el costo laboral

---

## Riesgos conocidos

- **$2,450 bruto para 3 personas** parece bajo — posiblemente son contractors internacionales en USD. Verificar datos de payroll.
- El trend chart depende de que haya snapshots calculados en múltiples períodos — si solo se ha calculado un mes, mostrará empty state.
- La vista `greenhouse_serving.client_labor_cost_allocation` requiere payroll aprobado/exportado Y asignaciones activas. Si no hay match, `costAttribution` será vacío.
