# TASK-063 - Payroll Projected Payroll Runtime

## Delta 2026-03-27 — Auditoría de dependencias, eventos reactivos y gaps

### Estado de dependencias

| Dependencia | Estado | Notas |
|-------------|--------|-------|
| TASK-061 (Payroll Go-Live Readiness) | in-progress (avanzada) | Mixed currency, UF/UTM blocking, outbox events, 77 tests — todo funcional |
| TASK-058 (Economic Indicators) | in-progress (avanzada) | UF (86 rows), UTM (3), USD_CLP (61) backfilleados; `getHistoricalEconomicIndicatorForPeriod()` disponible |
| ICO KPI engine | completo | OTD y RpA materializados por mes en `greenhouse_ico.member_metrics_monthly` |
| Payroll outbox events | completo | 8 eventos publicados: period.created/updated/calculated/approved/exported, entry.upserted, compensation_version.created/updated |

### Eventos reactivos existentes (entrantes a esta lane)

Estos eventos **ya existen y se publican**. TASK-063 puede suscribirse a ellos:

| Evento | Aggregate | Cuándo se publica | Relevancia para proyección |
|--------|-----------|-------------------|---------------------------|
| `compensation_version.created` | compensation | Al crear nueva versión de comp | Recalcular proyección con nuevo salario base |
| `compensation_version.updated` | compensation | Al editar versión existente | Recalcular proyección |
| `payroll_entry.upserted` | payroll | Al calcular/recalcular entry | Comparar oficial vs proyectado |
| `payroll_period.calculated` | payroll | Al calcular período completo | Snapshot oficial disponible para delta |
| `finance.exchange_rate.upserted` | finance | Al sincronizar FX | Recalcular proyección USD |
| `ico.materialization.completed` | ico | Al materializar métricas ICO | Actualizar KPIs para bonus variable |

### Eventos reactivos que TASK-063 debería emitir (salientes)

Nuevos eventos propuestos que esta task debe publicar al materializar proyecciones:

| Evento propuesto | Cuándo | Consumers downstream |
|------------------|--------|---------------------|
| `payroll.projected_snapshot.refreshed` | Al recalcular snapshot proyectado de un miembro | `member_capacity_economics` (para actualizar labor cost esperado), `person_intelligence` (para mostrar costo proyectado), `client_economics` (para forecast de gasto por cliente) |
| `payroll.projected_period.refreshed` | Al recalcular todos los snapshots de un período | Mismo que arriba pero en fanout para el grupo |

### Projections existentes que ya reaccionan a payroll

| Projection | Eventos que escucha | Tabla que escribe | Impacto |
|-----------|---------------------|-------------------|---------|
| `member_capacity_economics` | payroll_period.*, payroll_entry.upserted, compensation_version.* | `greenhouse_serving.member_capacity_economics` | Labor cost → loaded cost → bill rate |
| `person_intelligence` | payroll_period.*, payroll_entry.upserted, compensation_version.* | `greenhouse_serving.person_intelligence` | Cost metrics per person |
| `client_economics` | payroll_period.*, payroll_entry.upserted | `greenhouse_serving.client_economics` | P&L per client |

### Gaps críticos del motor de cálculo

**1. Sin soporte `as_of_date`:**
- `calculatePayroll()` opera sobre períodos completos
- `fetchAttendanceForPayrollPeriod()` solo tras cierre de período
- `fetchKpisForPeriod()` devuelve snapshots mensuales, no diarios
- **Requiere**: factorizar lógica pura de cálculo, agregar `asOfDate` param, prorateo de días trabajados al corte

**2. Sin KPIs diarios:**
- ICO materializa metrics mensuales (`greenhouse_ico.member_metrics_monthly`)
- Proyección parcial de OTD/RpA requiere extrapolación lineal o heurística conservadora
- **Decisión pendiente**: linear extrapolation vs conservative assumption vs current-as-final

**3. Sin asistencia diaria pre-cierre:**
- Attendance se importa por período; no hay snapshot diario antes del cierre
- **Decisión pendiente**: asumir ratio actual de asistencia o 100% attendance como base

**4. FX para proyección:**
- Períodos oficiales usan tasa del último día hábil del período
- Proyecciones necesitan policy: ¿tasa del día actual o tasa proyectada del período?
- **Decisión pendiente**: `current_rate` vs `period_last_business_day`

### Tabla de persistencia propuesta

```sql
CREATE TABLE IF NOT EXISTS greenhouse_serving.projected_payroll_snapshots (
  member_id TEXT NOT NULL,
  period_year INT NOT NULL,
  period_month INT NOT NULL,
  projection_mode TEXT NOT NULL CHECK (projection_mode IN ('actual_to_date', 'projected_month_end')),
  as_of_date DATE NOT NULL,
  -- Amounts (preserve source currency)
  currency TEXT NOT NULL,
  base_salary_source NUMERIC(14,2),
  fixed_bonus_source NUMERIC(14,2),
  variable_otd_source NUMERIC(14,2),
  variable_rpa_source NUMERIC(14,2),
  gross_projected_source NUMERIC(14,2),
  deductions_projected_source NUMERIC(14,2),
  net_projected_source NUMERIC(14,2),
  -- KPI inputs used
  otd_percent NUMERIC(5,2),
  rpa_avg NUMERIC(5,2),
  days_worked INT,
  days_absent INT,
  days_on_leave INT,
  -- Traceability
  uf_value NUMERIC(10,2),
  utm_value NUMERIC(10,2),
  fx_rate NUMERIC(18,6),
  snapshot_status TEXT NOT NULL DEFAULT 'projected',
  materialized_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (member_id, period_year, period_month, projection_mode)
);
```

### Archivos clave del motor de cálculo

| Archivo | Función | Requiere refactor para `as_of_date` |
|---------|---------|--------------------------------------|
| `src/lib/payroll/calculate-payroll.ts` | `calculatePayroll()`, `buildPayrollEntry()` | Sí — factorizar pure calc |
| `src/lib/payroll/bonus-proration.ts` | OTD/RpA proration logic | No — ya es puro |
| `src/lib/payroll/calculate-chile-deductions.ts` | AFP, salud, impuestos | No — ya es puro |
| `src/lib/payroll/fetch-kpis-for-period.ts` | Fetch OTD/RpA de ICO | Sí — agregar soporte parcial |
| `src/lib/payroll/fetch-attendance-for-period.ts` | Fetch asistencia | Sí — agregar soporte parcial |
| `src/lib/finance/economic-indicators.ts` | Resolve UF/UTM/FX | No — ya soporta `periodDate` |

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `3`
- Domain: `hr`
- GitHub Project: `Greenhouse Delivery`

## Summary

Crear un complemento de `Payroll` para `Nómina proyectada` que responda cuánto cobraría una persona o un grupo al día de hoy y cuánto se proyecta que cobrará al cierre del mes, reutilizando el mismo motor canónico de cálculo y sin generar entries oficiales del período.

La lane debe evitar una segunda lógica paralela de nómina: la proyección debe apoyarse en compensación vigente, asistencia/permisos acumulados, KPIs `ICO`, indicadores económicos históricos del período y snapshots reactivos donde corresponda para consultas rápidas.

## Why This Task Exists

El módulo actual de `Payroll` sirve bien para cierre mensual por período, pero operacionalmente falta una capa de simulación y previsión.

Hoy aparecen preguntas que el sistema todavía no responde bien sin reconstrucción manual:

- cuánto cobraría una persona si cerráramos hoy
- cuánto cobraría a fin de mes si nada cambia
- cuánto del variable ya está devengado vs cuánto sigue proyectado
- cómo se mueve la nómina esperada del equipo a medida que cambian asistencia, permisos, KPI y compensación

Resolver esto dentro del mismo flujo de período oficial sería riesgoso: mezclaría simulación con contabilidad cerrable. La solución correcta es una superficie hermana de `Payroll` que use el cálculo canónico, pero con `as_of_date` y proyección explícita.

## Goal

- Diseñar e implementar una capa de `Nómina proyectada` separada del cierre oficial de `Payroll`
- Reutilizar el motor canónico de cálculo para responder escenarios `actual-to-date` y `projected-month-end`
- Permitir consulta por persona y por grupo sin crear ni mutar `payroll_entries` oficiales
- Materializar snapshots reactivos donde aporten valor para lectura rápida, trazabilidad y refresh por evento

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`

Reglas obligatorias:

- no crear un segundo motor de cálculo de nómina
- `projected payroll` debe reutilizar la misma semántica de `Payroll` para base, bonos, prorrateos y descuentos
- la simulación no debe escribir `payroll_entries` oficiales ni alterar el lifecycle del período
- mixed currency debe preservarse por persona/entry; no consolidar monedas distintas por conveniencia
- los snapshots proyectados deben nacer de eventos/outbox y projections solo cuando mejoren lectura, no como reemplazo del cálculo server-side puntual

## Dependencies & Impact

### Depends on

- `docs/tasks/in-progress/TASK-061-payroll-go-live-readiness-audit.md`
- `docs/tasks/in-progress/TASK-058-economic-indicators-runtime-layer.md`
- `src/lib/payroll/*`
- `src/lib/ico-engine/*`
- `src/lib/hr-core/*`
- `src/lib/sync/*`

### Impacts to

- `HR > Payroll`
- `People > Payroll`
- `Finance > personnel expense` y lecturas de costo laboral
- projections reactivas que dependan de costo laboral esperado
- consumers futuros de forecast operativo/financiero

### Files owned

- `src/lib/payroll/*`
- `src/lib/sync/projections/*`
- `src/app/api/hr/payroll/*`
- `src/views/greenhouse/payroll/*`
- `src/types/payroll.ts`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Ya existe

- cálculo canónico de nómina por período con `baseSalary`, `remoteAllowance`, bonos variables y descuentos Chile
- soporte mixed currency por entry (`CLP` / `USD`)
- integración de `UF` y `UTM` históricas por período
- extracción de KPI `ICO` para `OTD` y `RpA`
- wiring outbox/reactive projections para cambios de compensación y eventos principales de `Payroll`

### Gap actual

- no existe una superficie para responder `cuánto cobraría X hoy`
- no existe una proyección formal `fin de mes`
- no hay snapshots reactivos de nómina esperada por persona/período
- la simulación hoy requiere reconstrucción manual o correr el cálculo oficial del período

## Scope

### Slice 1 - Domain model de projected payroll

- definir contrato de consulta `as_of_date`
- definir modos `actual_to_date` y `projected_month_end`
- definir output por persona y por grupo
- separar claramente `snapshot oficial` vs `snapshot proyectado`

### Slice 2 - Reuse del motor canónico

- factorizar/reusar cálculo actual de `Payroll`
- soportar cortes parciales del mes
- soportar prorrateo de asistencia/permisos al día
- soportar variable `OTD` / `RpA` real acumulado y proyectado

### Slice 3 - Data inputs y policy

- compensación vigente al corte
- asistencia y permisos aprobados al corte
- KPI `ICO` real acumulado al corte
- indicadores económicos del período (`UF`, `UTM`, `USD_CLP` si aplica consumer financiero)
- política explícita para qué se considera `proyectado` vs `real`

### Slice 4 - Runtime, API y UI MVP

- endpoint server-side de simulación por persona
- endpoint server-side de simulación por grupo/período
- vista MVP en `Payroll` o superficie hermana con:
  - `Hoy`
  - `Fin de mes`
  - desglose por persona

### Slice 5 - Outbox y projections

- definir evento canónico cuando cambie un snapshot proyectado materializado
- decidir qué snapshots vale la pena materializar en Postgres serving
- refrescar reactivamente cuando cambien:
  - compensación
  - asistencia/permisos
  - KPI `ICO`
  - indicadores económicos

## UI/UX Spec — Nómina Proyectada

### Decisión de superficie

Vista hermana de Nómina en el sidebar: **EQUIPO > Nómina Proyectada** (`/payroll/projected`).

Razones:
- Separación semántica: oficial (cerrable) vs simulación (informativa)
- Escala hacia forecast multi-mes sin quedar atrapada en contexto de período
- Puede ser consumida por Finance y Agency sin depender del módulo oficial

### Eventos reactivos

**Entrantes** — la proyección se refresca cuando ocurren:

| Evento | Efecto en la proyección |
|--------|------------------------|
| `compensation_version.created` | Recalcular con nuevo salario base |
| `compensation_version.updated` | Recalcular con comp editada |
| `payroll_entry.upserted` | Actualizar delta oficial vs proyectado |
| `payroll_period.calculated` | Snapshot oficial disponible para comparación |
| `finance.exchange_rate.upserted` | Recalcular conversión USD→CLP |
| `ico.materialization.completed` | Actualizar bonus variable con KPIs frescos |

**Salientes** — la proyección emite:

| Evento | Consumers downstream |
|--------|---------------------|
| `payroll.projected_snapshot.refreshed` | `member_capacity_economics` (labor cost esperado), `person_intelligence` (costo proyectado), `client_economics` (forecast gasto por cliente) |
| `payroll.projected_period.refreshed` | Fanout: recalcular todos los snapshots del período |

### Arquitectura de archivos

```
src/views/greenhouse/payroll/
  ProjectedPayrollView.tsx          ← Vista principal (page-level)
  ProjectedPayrollTable.tsx         ← Tabla por persona con expandable rows
  ProjectedPayrollDesglose.tsx      ← Componente de desglose expandido

src/app/api/hr/payroll/projected/
  route.ts                          ← GET: cálculo on-demand por período + modo
  [memberId]/route.ts               ← GET: detalle por persona

src/lib/payroll/
  project-payroll.ts                ← Pure compute: reutiliza buildPayrollEntry con asOfDate
  projected-payroll-store.ts        ← Read/write de snapshots materializados

src/lib/sync/projections/
  projected-payroll.ts              ← Projection definition (eventos + refresh)
```

### Layout principal — ProjectedPayrollView

```
┌──────────────────────────────────────────────────────────┐
│ Nómina Proyectada · Marzo 2026                    [◀ ▶]  │  ← CardHeader + month nav
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─ Hoy ─┐  ┌─ Fin de mes ─┐                            │  ← CustomTabList (2 tabs)
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │Bruto     │  │Neto      │  │Δ Oficial │               │  ← 3 × HorizontalWithSubtitle
│  │$4.850.000│  │$3.920.000│  │+$120.000 │               │
│  │+2.1% ↑  │  │Proyectado│  │vs cerrado│               │
│  └──────────┘  └──────────┘  └──────────┘               │
│                                                          │
│  ┌── Subtotales por moneda ──────────────────────┐       │
│  │  CLP: $3.200.000 bruto · $2.580.000 neto      │       │  ← CustomChip badges
│  │  USD: $1.650 bruto · $1.340 neto               │       │
│  └────────────────────────────────────────────────┘       │
│                                                          │
├──────────────────────────────────────────────────────────┤
│ Detalle por persona                    [Buscar...]       │  ← CardHeader + search
│ ┌────────────────────────────────────────────────────┐   │
│ │ ▶ │Nombre     │Moneda│Bruto    │Variable│Neto     │   │  ← TanStack table
│ │ ▼ │Andres C.  │CLP   │$850.000 │$45.000 │$680.000 │   │
│ │   ├── Desglose ─────────────────────────────────┤   │  ← Collapse row
│ │   │ Base: $650.000                              │   │
│ │   │ Remote: $100.000                            │   │
│ │   │ Bono fijo: $50.000 (Bono productividad)     │   │
│ │   │ Variable OTD: $30.000 (94% → 100% elegible) │   │
│ │   │ Variable RpA: $15.000 (2.1 → 100% elegible) │   │
│ │   │ ─── Descuentos Chile ───                     │   │
│ │   │ AFP: -$85.000 (10%)                          │   │
│ │   │ Salud: -$58.000 (7%)                         │   │
│ │   │ Seguro cesantía: -$5.100 (0.6%)              │   │
│ │   │ Impuesto: -$32.000 (UTM: $67.294)            │   │
│ │   │ ─── Indicadores ───                          │   │
│ │   │ UF: $38.150 · UTM: $67.294                   │   │
│ │   │ Asistencia: 18/22 días · 2 ausencias         │   │
│ │   └─────────────────────────────────────────────┘   │
│ │   │Daniela F. │USD   │$2.100   │$0      │$2.100   │   │
│ │   │Melkin H.  │CLP   │$850.000 │$45.000 │$680.000 │   │
│ └────────────────────────────────────────────────────┘   │
│ [Showing 1 to 6 of 6 entries]            [< 1 >]        │
└──────────────────────────────────────────────────────────┘
```

### Componentes Vuexy reutilizables

| Componente | Import | Uso en esta vista |
|-----------|--------|-------------------|
| `HorizontalWithSubtitle` | `@components/card-statistics/HorizontalWithSubtitle` | 3 KPI cards (Bruto, Neto, Δ Oficial) con trend |
| `CustomTabList` | `@core/components/mui/TabList` | Toggle "Hoy" / "Fin de mes" |
| `CustomChip` | `@core/components/mui/Chip` | Currency badges, status, semáforos OTD/RpA |
| `CustomTextField` | `@core/components/mui/TextField` | Search en tabla |
| `Card/CardHeader/CardContent` | `@mui/material` | Estructura de paneles |
| `Collapse` | `@mui/material/Collapse` | Row expansion para desglose |
| `IconButton` | `@mui/material/IconButton` | Expand/collapse toggle |
| `Divider` | `@mui/material/Divider` | Separadores visuales |
| `TablePaginationComponent` | `@components/TablePaginationComponent` | Paginación de tabla |
| TanStack React Table | `@tanstack/react-table` | Sorting, filtering, expansion |
| `fuzzyFilter` | `@/components/tableUtils` | Búsqueda fuzzy |

### Helpers reutilizables desde Payroll existente

Desde `src/views/greenhouse/payroll/helpers.ts`:
- `formatCurrency(amount, currency)` — formato CLP/USD con Intl
- `buildPayrollCurrencySummary(entries)` — subtotales por moneda
- `otdSemaphore(percent)` / `rpaSemaphore(avg)` — colores de semáforo para KPIs
- `periodStatusConfig` — labels y colores de estado

### Interacción y estados

**Tab "Hoy":**
- Muestra `actual_to_date`: cuánto cobraría cada persona si cerráramos el período hoy
- Prorateo de días trabajados al corte actual
- KPIs ICO acumulados hasta hoy
- Indicadores económicos del día actual

**Tab "Fin de mes":**
- Muestra `projected_month_end`: cuánto cobraría asumiendo que nada cambia
- Proyección lineal de asistencia restante (asume ratio actual)
- KPIs ICO proyectados (conservador: mantener actual)
- Indicadores económicos del último día hábil del mes

**Δ Oficial:**
- Solo visible si existe un `payroll_period` calculado o aprobado para el mismo mes
- Muestra la diferencia entre proyectado y oficial
- Color: verde si proyectado < oficial, rojo si proyectado > oficial, gris si no hay oficial

**Desglose expandido:**
- Click en chevron ▶ expande fila
- Muestra: base, remote, bonos fijos, variables (OTD con %, RpA con avg), descuentos Chile
- Muestra indicadores usados: UF, UTM, asistencia
- Reutiliza el patrón de `PayrollEntryTable.tsx` (Collapse + sub-grid)

### Responsive

- Desktop: 3 KPI cards en fila + tabla completa
- Tablet: 3 KPI cards apilados 2+1 + tabla con scroll horizontal
- Mobile: KPI cards stacked + tabla colapsada (solo Nombre + Neto)

## Out of Scope

- reemplazar el flujo oficial de cierre mensual
- crear un ledger contable de forecast completo en esta misma lane
- consolidación forzada cross-currency en una sola moneda
- extrapolaciones avanzadas de performance con ML o heurística compleja

## Acceptance Criteria

- [ ] Existe una task y diseño claros para `Nómina proyectada` sin duplicar el motor de `Payroll`
- [ ] El contrato diferencia explícitamente `actual_to_date` vs `projected_month_end`
- [ ] La solución propuesta preserva mixed currency y no muta `payroll_entries` oficiales
- [ ] Se define dónde usar cálculo on-demand y dónde usar projections reactivas
- [ ] Quedan identificados los eventos y triggers que deben refrescar snapshots proyectados
- [ ] La lane deja claro el MVP inicial por persona y por grupo

## Verification

- revisión de arquitectura contra `Payroll`, `Sync` y `Finance`
- validación manual del contrato de producto con preguntas operativas reales:
  - cuánto cobraría una persona hoy
  - cuánto cobraría a fin de mes
  - cuánto cobraría un equipo hoy vs fin de mes
- `pnpm exec eslint`
- `pnpm exec tsc --noEmit --pretty false`

## Open Questions (resueltas 2026-03-27)

- ~~si `projected_month_end` debe proyectar `OTD` / `RpA` solo con extrapolación lineal simple o con una política más conservadora~~ → **Conservador**: mantener el valor actual como proyección (no extrapolar). Razón: evitar falsos positivos en bonus variable.
- ~~si la primera UI debe vivir dentro de `Payroll` o como sub-superficie separada~~ → **Vista hermana** en sidebar: EQUIPO > Nómina Proyectada. Razón: separación semántica oficial vs simulación, escala hacia forecast multi-mes.
- ~~si el consumer financiero necesita además conversión opcional a moneda de reporte o solo desglose nativo por moneda~~ → **Desglose nativo por moneda** con subtotales por currency. La conversión a moneda de reporte es follow-up de Finance, no de esta lane.

## Follow-ups

- contrastar esta lane con `TASK-061` cuando cierre el `go/no-go` de la nómina oficial
- decidir si `projected payroll` alimenta luego una proyección de gasto de personal en `Finance`
