# ISSUE-059 — Finance Data Quality mezcla integridad de plataforma con KPIs operativos

## Ambiente

staging + production (Reliability Control Plane / Admin Center)

## Detectado

2026-04-26 — Admin Center mostraba el subsystem `Finance Data Quality` en `degraded` con summary "2 buckets con issue activo: 1 drift de ledger, 28 cuentas por cobrar vencidas. Además, 137 overheads compartidos siguen sin asignación explícita; estado permitido."

## Síntoma

- `overdue_receivables=28` (cartera vencida) escalaba a `status='error'` (regla `> 5`) y disparaba el módulo Finance a `degraded`.
- Las 28 facturas vencidas son trabajo de cobranzas, no un incidente de plataforma — el equipo financiero las ve en sus reportes operativos, no requieren on-call.
- Lo mismo con los 137 overheads sin asignar — workflow de hygiene operativa.
- Resultado: el dashboard generaba alertas crónicas sin acción técnica posible, contaminando la señal real (drift de ledger).

## Causa raíz

`buildFinanceDataQualitySubsystem()` en `src/lib/operations/get-operations-overview.ts` aplicaba la misma severidad a TODAS las métricas:

- `payment_ledger_integrity` (drift de ledger) — integridad de datos real ✓
- `direct_cost_without_client` — integridad de datos real ✓
- `overdue_receivables` — KPI de negocio (no incidente) ✗ tratado como error
- `shared_overhead_unallocated` — KPI operativo ✗ marcado como info pero participaba del summary

No había distinción entre "platform integrity" (data layer roto, requiere intervención técnica) y "operational hygiene" (trabajo humano normal).

## Impacto

- Dashboard del Admin Center en estado de alerta perpetuo por cartera vencida.
- Señales reales (1 drift de ledger) quedaban diluidas entre el ruido operativo.
- Equipo de plataforma desensibilizado al warning de Finance.

## Solución

Refactor del modelo de severidad:

- Nuevo set canónico `PLATFORM_INTEGRITY_METRIC_KEYS = { 'payment_ledger_integrity', 'direct_cost_without_client' }` + helper `isPlatformIntegrityMetric(key)`.
- `overdue_receivables` baja a `status='info'` permanente — visible en metrics array para visibilidad pero NO escala el subsystem.
- `buildFinanceDataQualitySummary()` reescribe el formato para distinguir plataforma vs operativo: "Plataforma sana · pendientes operativos: 28 cartera vencida, 137 overhead..." cuando solo hay KPIs operativos.
- `processed`/`failed` del subsystem cuentan SOLO platform integrity metrics (antes contaba todas).

## Verificación

- ✅ Live staging: subsystem `Finance Data Quality` en `healthy` (drift=0).
- ✅ Summary muestra "Plataforma sana · pendientes operativos: 28 cartera vencida, 137 overhead compartido no asignado".
- ✅ AR vencidas + overhead siguen visibles como info en `metrics[]` pero no causan escalada.
- ✅ Tests en `get-operations-overview.test.ts`: caso "platform integrity green when only operational hygiene metrics have value" cubre el path nuevo.

## Estado

resolved

## Relacionado

- Commit `bd278687` — fix(reliability): DLQ + recovery classifier
- Archivo: `src/lib/operations/get-operations-overview.ts` (`buildFinanceDataQualitySubsystem`, `PLATFORM_INTEGRITY_METRIC_KEYS`)
- Test: `src/lib/operations/get-operations-overview.test.ts`
