# Distribución de costos para P&L operativo

TASK-777 agrega una capa canónica entre los gastos registrados y el P&L operativo: `expense_distribution_resolution`.

Esta capa responde una pregunta distinta a `economic_category`:

- `economic_category` dice qué es el gasto: nómina, SaaS, regulatorio, financiero, banco, etc.
- `distribution_lane` dice dónde puede impactar en gestión: labor directa, herramienta directa, cliente directo, overhead operacional compartido, costo financiero compartido, regulatorio, provider payroll, treasury transit o sin asignar.

## Regla de negocio

Solo `shared_operational_overhead` entra al pool de overhead operacional compartido que se reparte hacia clientes.

No entran a ese pool:

- pagos Deel/provider payroll
- Previred, AFP, Isapre, SII, TGR u otros regulatorios
- comisiones bancarias
- factoring, intereses, FX fees u otros costos financieros
- movimientos treasury/transit

Si una fila no tiene evidencia suficiente, queda como `unallocated` o `manual_required` y debe bloquear cierre canónico hasta revisión.

## Abril 2026

Abril fue rematerializado con la nueva distribución:

- SKY overhead: `$2.278.629,39`
- ANAM overhead: `$759.543,13`
- SKY gross margin: `$1.902.318,83` (`27,56%`)

La causa principal del overhead inflado era doble:

- el pool shared legacy mezclaba regulatorio/financiero/provider payroll
- `direct_overhead_member_id` estaba absorbiendo pagos laborales externos como direct overhead de cliente

## Protección de caja

Esta capa no cambia caja, bancos, conciliación, payment orders ni settlement legs. Los payments normalizados y account balances siguen siendo source of truth para saldos y drift CLP.

## Operación

Para materializar un período:

```bash
pnpm run finance:materialize-expense-distribution -- --period 202604
```

Después de materializar distribución, se deben refrescar las proyecciones de member capacity, commercial cost attribution y operational P&L antes de leer `/finance/intelligence`.

## Gate de cierre

El cierre operativo consulta `checkPeriodReadiness`. El período no queda listo si:

- falta una resolución activa para algún expense del período
- hay resoluciones `manual_required`, `blocked` o `unallocated`
- el pool `shared_operational_overhead` contiene categorías laborales, regulatorias, tributarias o financieras

Abril 2026 queda listo con 50 resoluciones activas, 0 unresolved y 0 contaminación. Mayo 2026 aún no queda listo por falta de ingresos/egresos/FX del período, pero no por distribución de costos.

## Sugerencias asistidas

La IA de distribución es opcional y está apagada por defecto con `FINANCE_DISTRIBUTION_AI_ENABLED=false`.

La cola admin vive en:

- `GET /api/admin/finance/expense-distribution/suggestions?year=2026&month=4`
- `POST /api/admin/finance/expense-distribution/suggestions`
- `POST /api/admin/finance/expense-distribution/suggestions/[suggestionId]`

Una sugerencia no modifica P&L ni cierra períodos. Solo una aprobación humana puede crear una resolución `ai_approved`; esa resolución queda auditada y sigue sin tocar caja, bancos ni conciliación.

## Cobertura laboral y margen canónico (TASK-1200)

El margen del Operational P&L de un período es **canónico** solo si tiene cobertura
laboral materializada. Un período puede tener ingresos pero costo 0; en ese caso el
margen **no es real** y la plataforma no lo trata como tal. El estado de cobertura se
resuelve por período:

| Estado | Qué significa | Margen |
|---|---|---|
| Canónico (`canonical`) | El payroll del período corrió y la asignación laboral está materializada. | Confiable. |
| Pendiente (`pending`) | El payroll del período aún no corrió/cerró (p. ej. el mes en curso). | No canónico — se vuelve canónico solo cuando corra el payroll. |
| No disponible (`unavailable`) | Período anterior al inicio del sistema de payroll (no hay fuente de costo laboral). | No canónico de forma permanente. |
| Degradado (`degraded`) | El payroll existe pero la asignación no se materializó: bug. | No usar; revisar el pipeline. |

A junio 2026 el sistema de payroll arranca en febrero 2026, así que los meses previos
(nov/dic 2025, ene 2026) son "No disponible", y junio 2026 está "Pendiente" hasta que
corra su payroll. No se inventa costo para tapar la ausencia de payroll.

> Detalle técnico: `resolveLaborAllocationReadiness` y `isLaborAllocationCoverageCanonical`
> en `src/lib/commercial-cost-attribution/labor-allocation-readiness.ts`; expuesto en
> `GET /api/finance/intelligence/operational-pl` (campo `readiness`). Señal de salud:
> `finance.operational_pl.cost_coverage_degraded` (solo alarma ante el bug `degraded`).
