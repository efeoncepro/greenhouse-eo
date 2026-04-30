# ICO_ENGINE_AUDIT_2026-04-30

## Status

- Date: 2026-04-30
- Scope: auditoria end-to-end del `ICO Engine`
- Auditor: Codex + 3 explorers paralelos
- Criticality: critica
- Business sensitivity: alta
- Payroll impact: directa, porque KPIs de `ICO` alimentan bonos y pueden afectar nómina

## Executive Summary

El `ICO Engine` ya es una capability central del runtime Greenhouse, pero hoy **no está lo suficientemente blindado como foundation auditable para payroll y bonificaciones**.

La auditoria muestra tres grupos de riesgo:

1. **Integridad de snapshot y materialización**
   - el snapshot `locked` no es realmente inmutable
   - hay `DELETE + INSERT` sin exclusión mutua ni atomicidad cross-table
   - la lane AI puede romper o vaciar una corrida base ya parcialmente comprometida

2. **Riesgo de consumo y blast radius**
   - hay consumers y endpoints con scope frágil o duplicado
   - existen fallbacks incorrectos o costosos a nivel organization/project/person
   - varios contratos leen directo desde readers o BQ ad hoc en vez de usar un read-model único

3. **Riesgo de payroll / compensación**
   - un faltante de `ICO` hoy no bloquea la nómina oficial
   - eso puede terminar en bonos `0` sin frenar `calculate -> approve -> export`
   - además no queda rastro durable suficiente de cuándo payroll usó snapshot materializado vs fallback live

Conclusión práctica:

- **no pondría la migración al SDK de Notion antes de estabilizar ICO + payroll bridge**
- primero hay que cerrar los riesgos de reproducibilidad, freeze, gating y fallback del carril que impacta bonificaciones
- después sí conviene retomar `notion-bq-sync` y, más adelante, la migración del portal al SDK oficial de Notion

## Audit Scope

Aristas auditadas:

- materialización `ICO`
- schema y semántica de snapshots
- readers canónicos y routes `ICO`
- projections/serving downstream
- consumers de person/org/project/agency/home/Nexa
- bridge `ICO -> Payroll`
- lifecycle `calculate / approve / export / reopen`

Fuentes principales contrastadas:

- `src/lib/ico-engine/materialize.ts`
- `src/lib/ico-engine/read-metrics.ts`
- `src/lib/ico-engine/schema.ts`
- `src/lib/ico-engine/historical-reconciliation.ts`
- `src/app/api/cron/ico-materialize/route.ts`
- `src/lib/payroll/fetch-kpis-for-period.ts`
- `src/lib/payroll/calculate-payroll.ts`
- `src/lib/payroll/payroll-readiness.ts`
- `src/lib/payroll/postgres-store.ts`
- `src/lib/payroll/project-payroll.ts`
- `src/lib/person-360/get-person-ico-profile.ts`
- `src/app/api/people/[memberId]/ico/route.ts`
- `src/app/api/ico-engine/context/route.ts`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`

## System Reading

El flujo relevante hoy es:

1. `notion-bq-sync` escribe `notion_ops.*`
2. `sync-conformed` escribe `greenhouse_conformed.delivery_*`
3. `ico-materialize` escribe snapshots y tablas derivadas en `ico_engine.*`
4. readers/projections consumen eso para portal, serving y Nexa
5. payroll consulta métricas por miembro para calcular bonos OTD/RpA

La lectura importante para esta auditoría es:

- `ICO` no es solo analytics
- tampoco es solo UX de Delivery
- ya participa en decisiones operativas que pueden terminar impactando remuneraciones

## Findings

### ICO-001 — El snapshot `locked` no es realmente inmutable

Severity: Critical

`freezeDeliveryTaskMonthlySnapshot()` llama al materializer con `force: true`, y ese path borra el período antes de reinsertar desde `v_tasks_enriched`. Además, la reconciliación histórica lo vuelve a invocar.

Impacto:

- un mes cerrado puede reescribirse
- la historia auditable deja de ser estable
- payroll y cualquier reliquidación pierden una base verdaderamente congelada

Evidencia:

- `src/lib/ico-engine/materialize.ts`
- `src/lib/ico-engine/historical-reconciliation.ts`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`

### ICO-002 — La materialización usa `DELETE + INSERT` sin exclusión mutua ni atomicidad cross-table

Severity: High

No hay lease, run lock ni mutex real alrededor de la corrida. Si se solapan cron, manual runs o reconciliaciones, se pueden borrar/recrear datasets del mismo período en paralelo. Además, la corrida reemplaza primero unas tablas y luego otras, de modo que un failure intermedio deja generaciones mezcladas.

Impacto:

- snapshots duplicados o inconsistentes
- tablas por dimensión en distinto “momento lógico”
- consumers leyendo una foto parcial como si fuera canonical

Evidencia:

- `src/app/api/cron/ico-materialize/route.ts`
- `src/lib/ico-engine/materialize.ts`
- `src/lib/ico-engine/schema.ts`

### ICO-003 — La lane AI no degrada con seguridad; puede romper una corrida base ya comprometida

Severity: High

La arquitectura habla de `graceful degradation`, pero la implementación espera `materializeAiSignals()` inline. Ese helper borra filas del período y luego reinserta. Si falla, puede dejar la lane vacía y además hacer fallar toda la corrida después de haber tocado las métricas base.

Impacto:

- fallo parcial difícil de detectar
- enrichments huérfanos o vacíos
- riesgo innecesario en una lane que no debería comprometer payroll ni la métrica base

Evidencia:

- `src/lib/ico-engine/materialize.ts`
- `src/lib/ico-engine/ai/materialize-ai-signals.ts`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`

### ICO-004 — Un faltante de `ICO` no bloquea nómina oficial y hoy puede pagar bonos `0`

Severity: High

`buildPayrollPeriodReadiness()` trata `missing_kpi` como warning, no blocker. Luego `calculatePayroll()` sigue creando entries y `buildPayrollEntry()` calcula bonos con `null`, lo que cae a payout `0`.

Impacto:

- riesgo de subpago silencioso
- dependencia crítica de `ICO` sin gate proporcional a su impacto
- desalineación entre “métrica crítica” y “workflow crítico”

Evidencia:

- `src/lib/payroll/payroll-readiness.ts`
- `src/lib/payroll/calculate-payroll.ts`

### ICO-005 — Payroll no conserva evidencia suficiente del modo de lectura KPI usado en el cálculo

Severity: High

`fetchKpisForPeriod()` distingue `materialized` vs `live`, además de `confidence`, `suppressionReason` y evidencia RpA. Pero al persistir la entry queda solo `kpiDataSource='ico'` y los valores numéricos, sin un rastro durable del source mode ni de la calidad del KPI.

Impacto:

- difícil reproducir o auditar un bono después
- no queda claro si un cálculo oficial se apoyó en snapshot cerrado o en fallback live
- dificulta reliquidación, soporte y defensa de cálculo

Evidencia:

- `src/lib/payroll/fetch-kpis-for-period.ts`
- `src/lib/payroll/calculate-payroll.ts`
- `src/types/payroll.ts`
- `src/lib/payroll/postgres-store.ts`

### ICO-006 — Un endpoint genérico expone `ICO` por dimensión sin scope suficientemente fuerte

Severity: High

`/api/ico-engine/context` permite consultar `computeMetricsByContext()` por `dimension/value` con guard de agency, pero sin el mismo scope fino de `people` visibility u organization scoping. Encima la UI de People lo consume hoy.

Impacto:

- fuga cross-scope potencial
- contrato demasiado poderoso para un endpoint genérico
- mezcla de use cases internos con superficies visibles

Evidencia:

- `src/app/api/ico-engine/context/route.ts`
- `src/views/greenhouse/people/tabs/PersonActivityTab.tsx`
- `src/app/api/people/[memberId]/ico/route.ts`

### ICO-007 — Hay contratos duplicados y divergentes para project/org/person consumers

Severity: High

Existen readers canónicos de `ICO`, pero varias routes y surfaces vuelven a leer BigQuery directo con filtros ad hoc, fan-out por space o fallbacks inconsistentes.

Impacto:

- distintos números para una misma pregunta
- mayor costo/latencia
- más difícil estabilizar una frontera canónica de consumo

Evidencia representativa:

- `src/app/api/projects/[id]/ico/route.ts`
- `src/app/api/projects/[id]/full/route.ts`
- `src/app/api/organizations/[id]/ico/route.ts`
- `src/lib/account-360/organization-economics.ts`

### ICO-008 — Hay fallbacks organization-level erróneos o sesgados

Severity: Medium-High

Se encontraron dos problemas distintos:

- fallback con join inválido `member_id = space_id`
- cálculo ejecutivo con `average of averages` sobre spaces, no ponderado por task volume

Impacto:

- dashboards organization-level potencialmente incorrectos
- decisiones ejecutivas basadas en agregados sesgados
- costos BQ crecientes a medida que crece una organización

Evidencia:

- `src/lib/account-360/get-organization-operational-serving.ts`
- `src/lib/account-360/organization-economics.ts`
- `src/lib/sync/projections/ico-organization-metrics.ts`

### ICO-009 — La política de salud personal de ICO usa thresholds incompatibles con el shape real de RpA

Severity: Medium

`get-person-ico-profile()` considera `green` cuando `rpa >= 70`, pero el resto del portal trata `RpA` como ratio pequeño (~`1-3`). El health resultante puede quedar rojo por defecto aunque el KPI real esté sano.

Impacto:

- semáforos engañosos
- trust erosion en People / My Performance
- inconsistencia con registry y trust policy del engine

Evidencia:

- `src/lib/person-360/get-person-ico-profile.ts`
- `src/views/greenhouse/agency/space-360/Space360View.tsx`

### ICO-010 — El runtime y la documentación no cuentan la misma historia de despliegue

Severity: Medium

Hay documentos que hablan de migración a Cloud Run con runtime dedicado, pero el código operativo vigente todavía expone `ico-materialize` como Vercel cron con `maxDuration = 120`.

Impacto:

- decisiones de optimización apoyadas en garantías que hoy no están claras
- riesgo de doble scheduling o supuestos falsos de timeout/concurrency

Evidencia:

- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`
- `src/app/api/cron/ico-materialize/route.ts`

### ICO-011 — Reopen / reliquidation todavía no valida un cierre externo real

Severity: Medium

`checkPreviredDeclaredSnapshot()` es un stub que siempre retorna `false`, por lo que una nómina ya exportada puede reabrirse dentro de la ventana configurada sin una señal fuerte de compliance externa.

Impacto:

- reliquidaciones potencialmente demasiado permisivas
- control incompleto para un flujo sensible

Evidencia:

- `src/lib/payroll/reopen-guards.ts`
- `src/lib/payroll/reopen-period.ts`

## What Looks Solid

Hay partes que sí se ven bien encaminadas:

- el flujo `exported -> reopened -> v2 active + delta finance` tiene modelado razonable
- el cache invalidation de artefactos post-reliquidación está bien defendido
- `fetchKpisForPeriod()` ya distingue modo materialized/live y trae metadata útil
- existen readers canónicos y trust-aware que conviene reforzar, no reemplazar

## Recommended Order

### Lane 1 — Payroll safety gate

Objetivo: que `ICO` no pueda afectar remuneraciones de forma silenciosa.

1. Convertir `missing_kpi` en blocker para cálculo oficial cuando el colaborador depende de bonos KPI.
2. Persistir en payroll el `sourceMode`, `confidence`, `suppressionReason` y evidencia mínima del KPI usado.
3. Definir política explícita para:
   - `snapshot materialized`
   - `fallback live`
   - `manual override`
4. No permitir `export` sin trazabilidad suficiente del origen KPI.

### Lane 2 — True freeze / historical reproducibility

Objetivo: que “locked” signifique realmente congelado.

1. Romper la capacidad de reescribir snapshots `locked` por reconcile normal.
2. Separar `backfill corrective` de `freeze canonical`.
3. Crear un contrato explícito para reruns de historia con audit trail fuerte.
4. Alinear payroll closed periods con ese snapshot inmutable.

### Lane 3 — Materialization hardening

Objetivo: reducir partial writes y carreras.

1. Agregar lock/lease de corrida.
2. Separar lane base de lane AI.
3. Mejorar idempotencia de eventos emitidos.
4. Si la corrida sigue multi-step, dejar generación/versionado visible por tabla o por run.

### Lane 4 — Consumer boundary cleanup

Objetivo: bajar blast radius y cortar duplicaciones.

1. Cerrar o endurecer `/api/ico-engine/context`.
2. Mover People a `/api/people/[memberId]/ico`.
3. Consolidar project/org readers detrás de contratos únicos.
4. Eliminar fallbacks inválidos o no ponderados.

## Decision on Notion SDK

Con el estado actual del sistema, la prioridad **no** debería ser todavía la migración al SDK de Notion en el portal.

Mi recomendación es:

1. **Primero** cerrar `Lane 1` y `Lane 2` de esta auditoría.
2. **Después** endurecer `notion-bq-sync` y el consumo Greenhouse del pipeline Notion.
3. **Luego** evaluar si el SDK oficial de Notion ayuda como parte del cleanup del plano admin/direct API del portal.

La razón es simple:

- el SDK mejora ergonomía, retries y mantenimiento del cliente Notion
- pero hoy el riesgo mayor no está en ese cliente
- está en la cadena que termina afectando métricas `ICO` y, por extensión, payroll

## Conclusion

`ICO` ya es demasiado crítico para tratarlo como una capa analítica “best effort”.

Si sus métricas alimentan bonos y pueden incidir en nómina, entonces Greenhouse necesita que `ICO` tenga:

- snapshots realmente inmutables
- gating proporcional a su impacto
- trazabilidad durable del origen del KPI usado
- consumers con contratos claros y scope correcto

Hasta que eso no esté cerrado, mover antes al SDK de Notion sería optimizar una capa secundaria mientras la foundation de cálculo sensible sigue expuesta.
