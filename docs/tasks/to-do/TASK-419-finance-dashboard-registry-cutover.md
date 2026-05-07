# TASK-419 — Finance Dashboard Cutover to Registry

## Delta 2026-05-05 — pre-execution hardening (resilience pillar)

Auditoría arch detectó colisión latente entre **TASK-419 (cutover)**, **TASK-422 (stale data UX)** y **TASK-425 (DAG runtime cascade)**: las tres extienden el componente `<MetricKpiCard>` con UI states distintos (semáforo, banner stale, "recomputando…") sin contrato unificado. Si se mergea sin orquestar, drift visual garantizado — un KPI en cascada Y stale Y con threshold critical al mismo tiempo (caso real cuando el cron upstream falla mid-cascade) renderiza ambiguo.

**Lección aprendida TASK-776** (`temporalMode` contract de account drawers): la confusión entre snapshot/period/audit emergió por no declarar contract canónico antes de que múltiples surfaces lo extendieran. Aplicar mismo patrón acá ANTES de implementar 422 + 425.

### Decisión canónica — `<MetricKpiCard>` state machine

Declarar en este task (Slice 3) la state machine completa con 5 estados terminales y tokens visuales canónicos. TASK-422 implementa `stale → fresh` lifecycle; TASK-425 implementa `recomputing → fresh`; ambas consumen el contrato sin redefinirlo.

**Estados** (mutuamente excluyentes per render):

| State | Trigger | Visual canónico | Behavior |
|---|---|---|---|
| `loading` | Initial fetch / refresh in progress | Skeleton shimmer (Vuexy `<Skeleton variant="rectangular">`) | No tooltip, no value |
| `fresh` | Data dentro de `freshnessSlaHours` AND quality gates OK | Color de semáforo per `thresholds`, value renderizado, tooltip de description | Default healthy |
| `stale` | `lastUpdated > freshnessSlaHours` (TASK-422) | Value visible, ícono warning amarillo + tooltip "Datos de hace X — actualización pendiente", color semáforo gris (no se confía en threshold) | NO ocultar value; user debe decidir |
| `recomputing` | DAG cascade in progress (TASK-425) | Value previo visible (dim 60% opacity), banner sutil "Recomputando…", spinner pequeño esquina superior derecha | Non-blocking; user puede interactuar |
| `failed` | Dead-letter / freshness SLA excedido > 2× con quality gate roto | Value renderizado con ícono `error` rojo + tooltip "Falla en pipeline — ver Ops Health", semáforo gris | Link a runbook (TASK-422 Ops Health surface) |

**Reglas duras**:

- **NUNCA** mostrar `$0` o `—` cuando `state !== 'fresh'`. El value previo (último conocido) se mantiene visible para todos los estados ≠ `loading`. Cero ocultamiento silencioso (anti-pattern Pilar 3 Resilience).
- **NUNCA** mezclar dos estados en un render. Si `stale + recomputing` ambos true, prevalece `recomputing` (es transición; stale resolverá al cierre de cascade).
- **NUNCA** usar color como única señal. Cada estado lleva ícono + tooltip explícito (a11y WCAG 2.2 AA).
- **NUNCA** cambiar el shape del componente sin extender la state machine. Si emerge `forecasting` (proyección futura) en TASK-425b o similar, agregar al enum + token, NO branchear inline.

**Tokens visuales** (declarar en Slice 3 al implementar):

```ts
// src/components/greenhouse/MetricKpiCard.tokens.ts
export const METRIC_KPI_CARD_STATES = {
  loading:     { color: 'neutral', icon: null, opacity: 1 },
  fresh:       { color: 'derived_from_thresholds', icon: null, opacity: 1 },
  stale:       { color: 'grey.500', icon: 'tabler-alert-triangle', opacity: 1, badgeColor: 'warning' },
  recomputing: { color: 'derived_from_thresholds', icon: 'tabler-loader-2', opacity: 0.6, animation: 'pulse' },
  failed:      { color: 'grey.500', icon: 'tabler-alert-circle', opacity: 1, badgeColor: 'error' },
} as const
```

### Scope adjustment

- **Slice 3** se renombra de "Tooltips desde description" → "**Tooltips + state machine canónica**". Implementa los 5 estados con renderer placeholder para `stale` / `recomputing` / `failed` (TASK-422 + 425 los activan via prop).
- **Slice 4** (Indicators UF/USD/UTM) ya alineado.
- Acceptance criterion adicional: "Componente `<MetricKpiCard>` declara las 5 states + tokens; TASK-422 y TASK-425 consumen sin redefinir."

### Sinergia obligatoria con TASK-422 + TASK-425

Cuando TASK-422 cierre, debe pasar `state: 'stale' | 'fresh'` al card según `isMetricFresh()`. Cuando TASK-425 cierre, debe pasar `state: 'recomputing' | 'fresh'` según el state table `metric_materialization_state`. La precedencia ya está definida acá (recomputing > stale > failed > fresh > loading).

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `refactor`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-416, TASK-417`
- Branch: `task/TASK-419-finance-dashboard-registry-cutover`

## Summary

Migrar `FinanceDashboardView` y endpoints relacionados para consumir labels, formatos, thresholds y tooltips del `FinanceMetricRegistry`. Elimina hardcoded Spanish strings en el dashboard y establece el patrón de consumo que Cost Intelligence (TASK-420) va a seguir. Incluye tooltips auto-generados desde `description` y semáforo basado en `thresholds` del registry.

## Why This Task Exists

Hoy `FinanceDashboardView.tsx` tiene ~30 strings hardcoded de labels de KPI, tooltips implícitos (o ausentes), formateo inline de CLP/percent, y colores de semáforo sin contrato central. Cada agregado nuevo agrega más strings sin revisión. El registry canónico permite un cutover donde labels, formatos y thresholds se declaran una sola vez y el componente los consume.

## Goal

- KPI cards del dashboard leen labels/shortNames/tooltips/thresholds del registry via `getMetric`
- Valores formateados con `formatMetricValue` (reemplaza `formatCLP`, `formatRate`, etc. inline)
- Semáforo de color de cada KPI sigue el contrato `thresholds` de la métrica
- Tooltips de cada KPI se generan de `description` (localizado, no inline)
- Zero strings hardcoded para nombres de métricas canónicas

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_METRIC_REGISTRY_V1.md` — contrato
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — patrones de UI
- Convenciones Greenhouse-dev (HorizontalWithSubtitle, StatsWithAreaChart, AnimatedCounter)

Reglas obligatorias:

- No importar `FINANCE_METRIC_REGISTRY` directo; usar `getMetric`
- Respetar `visibility.clientPortal` si el dashboard pudiera verse desde portal cliente (hoy solo internal)
- `AnimatedCounter` + `formatMetricValue` combinados correctamente (string final via registry, counter anima solo el número)

## Dependencies & Impact

### Depends on

- TASK-416 (Registry foundation)
- TASK-417 (Reader primitives)

### Blocks / Impacts

- Patrón de consumo que TASK-420 replica
- Reduce costo de añadir métricas nuevas a superficies

### Files owned

- `src/views/greenhouse/finance/FinanceDashboardView.tsx`
- `src/views/greenhouse/finance/ClientEconomicsView.tsx` (labels canónicos)
- Posible extracción de helper `<MetricKpiCard metricId>` si emerge patrón repetido

## Current Repo State

### Already exists

- `FinanceDashboardView.tsx` con KPIs de Saldo, Facturación, Costos, DSO, DPO, Payroll Ratio
- `formatCLP`, `formatRate`, `formatIndicatorValue` inline
- Tooltips manuales o ausentes

### Gap

- Zero consumo del registry canónico
- Drift entre labels del dashboard y labels del signal engine

## Scope

### Slice 1 — KPI cards migradas

- Reemplazar labels hardcoded por `getMetric(metricId).resolvedLabel`
- Aplicar `formatMetricValue` en el `stats` prop
- Test visual comparando antes/después (snapshot)

### Slice 2 — Semáforo por thresholds

- Función `getMetricSeverityColor(metricId, value, target?)` que retorna `'success' | 'warning' | 'error'` según thresholds canónicos
- Aplica a avatarColor de HorizontalWithSubtitle (ej: DSO > 60 → error)

### Slice 3 — Tooltips desde description

- Cada KPI muestra tooltip auto-generado de `description`
- Componente wrapper `<MetricKpiCard>` si el patrón se repite

### Slice 4 — Indicators (UF, USD_CLP, UTM)

- Migrar los 3 KPI cards de indicators al `FINANCE_INDICATOR_REGISTRY`
- Formato de fecha + source siguen pattern actual

## Out of Scope

- Cost Intelligence views → TASK-420
- Client Portal enforcement → v2 (TASK-422 o separado)

## Acceptance Criteria

- [ ] `FinanceDashboardView.tsx` no contiene strings hardcoded para labels de métricas canónicas
- [ ] `formatCLP`, `formatRate` locales eliminados en favor de `formatMetricValue`
- [ ] Semáforo de color en KPIs viene de thresholds canónicos, no de condicionales inline
- [ ] Tooltips presentes en todos los KPI cards con texto del registry
- [ ] Visual snapshot antes/después sin regresiones
- [ ] `pnpm build`, `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` limpios

## Verification

- `pnpm dev` → navegar a `/finance` → validar labels + tooltips + colores
- Snapshot tests de FinanceDashboardView

## Closing Protocol

- [ ] Lifecycle + carpeta sincronizados
- [ ] `docs/tasks/README.md` actualizado
- [ ] Si emerge `<MetricKpiCard>` reutilizable, documentarlo en `GREENHOUSE_UI_PLATFORM_V1.md`

## Follow-ups

- TASK-420 (Cost Intelligence cutover) replica el patrón
