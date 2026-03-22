# CODEX TASK — HR Payroll Operational Hardening (v1)

## Resumen

`Payroll` ya funciona como módulo operativo y su runtime principal ya está cortado a PostgreSQL.
Esta task no busca reabrir el módulo desde cero.

Su objetivo es endurecerlo para uso real sostenido:
- hacer el cálculo explicable por entry
- agregar prechecks antes de calcular
- reducir fragilidad entre fuentes (`ICO`, asistencia, licencias, compensación)
- endurecer reglas de descuento y validación Chile

Esta task complementa:
- `docs/tasks/complete/CODEX_TASK_HR_Payroll_Module_v3.md`
- `docs/tasks/complete/CODEX_TASK_HR_Payroll_Postgres_Runtime_Migration_v1.md`

No las reemplaza.

## Por qué esta lane existe ahora

El módulo ya resolvió sus gaps fundacionales:
- compensación versionada
- período imputable mensual
- cálculo por entry
- edición de períodos
- `approved` editable hasta `exported`
- corte de KPI a `ICO`
- runtime `Postgres-first`

Pero todavía tiene debilidades de madurez operativa:

1. Falta explicabilidad del cálculo
- RRHH puede ver el neto final, pero no siempre el detalle exacto de qué inputs se usaron:
  - compensación vigente aplicada
  - KPI `ICO`
  - asistencia y licencias
  - prorrateos
  - descuentos

2. Falta un readiness check explícito antes de calcular
- hoy el sistema puede detectar faltantes durante el cálculo, pero no expone una capa clara de:
  - colaboradores sin compensación vigente
  - KPI faltantes
  - asistencia/licencias faltantes
  - `UF` o tabla tributaria faltante/inconsistente

3. Asistencia y licencias siguen viniendo de una combinación runtime frágil
- `attendance_daily` vía BigQuery
- `leave_requests` vía PostgreSQL
- esto funciona, pero deja el request path dependiente de fuentes heterogéneas y con menos trazabilidad mensual congelada

4. El cálculo Chile aún no es suficientemente fuerte para operación madura
- AFP, salud, cesantía y APV existen
- pero el impuesto sigue entrando como `taxAmount` manual y no como cálculo tributario robusto derivado de `tax_table_version`
- eso limita confiabilidad y auditabilidad del neto

5. Falta visibilidad operativa para explicar por qué alguien sí o no entró al período
- colaborador sin compensación vigente
- compensación futura fuera del mes
- KPI `ICO` inexistente
- entry recalculada con override manual

## Estado real de partida

### Ya existe

- `greenhouse_payroll.compensation_versions`
- `greenhouse_payroll.payroll_periods`
- `greenhouse_payroll.payroll_entries`
- `greenhouse_payroll.payroll_bonus_config`
- cálculo mensual en `src/lib/payroll/calculate-payroll.ts`
- KPI mensuales desde `ICO` en `src/lib/payroll/fetch-kpis-for-period.ts`
- asistencia/licencias del período en `src/lib/payroll/fetch-attendance-for-period.ts`
- edición de entries y override manual en `src/lib/payroll/recalculate-entry.ts`
- export CSV y cierre final `exported`
- `People > Payroll` como ficha individual del colaborador

### Gap operativo actual

El módulo todavía no está endurecido para operación continua por estas razones:

1. No existe una vista canon de auditoría por `payroll_entry`
- hoy el snapshot existe
- pero no hay una superficie clara que muestre:
  - source mode (`materialized` / `live` / `manual`)
  - thresholds de bono usados
  - base ajustada por ausencias
  - causa del prorrateo
  - fórmula de neto aplicada

2. No existe un preflight explícito de período
- hoy el usuario puede calcular y descubrir faltantes tarde
- el módulo necesita un “estado de readiness” antes de `calculate`

3. No existe una proyección mensual canónica de asistencia para Payroll
- el request path sigue armando el resumen en tiempo real desde fuentes mixtas
- falta un read model estable y reutilizable

4. No existe motor tributario suficientemente fuerte para Chile
- `tax_table_version` existe como metadata del período
- pero todavía no gobierna un cálculo automático y explicable del impuesto

## Alineación obligatoria con arquitectura

Revisar y respetar:
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`

Reglas obligatorias:
- `Payroll` sigue anclado en `greenhouse_core.members.member_id`
- `Payroll` no debe duplicar ownership de `HR Core` ni de `ICO`
- `People` sigue siendo surface de lectura; no mover writes de nómina allí
- no reintroducir BigQuery como write path operativo
- no ejecutar DDL mutante desde handlers web

## Objetivo de esta task

Cerrar la siguiente capa de robustez de `Payroll`:
- cálculo explicable
- período calculable solo cuando está realmente listo
- fuentes mensuales más consistentes y auditables
- descuentos Chile más confiables

## Scope

### Slice 1 — Payroll Readiness / Preflight

Crear un precheck explícito por período antes de calcular.

Debe responder preguntas como:
- qué colaboradores activos quedarían incluidos en el período
- quiénes quedan fuera por falta de compensación vigente
- quiénes no tienen KPI `ICO` del mes
- quiénes no tienen datos de asistencia o licencias esperados
- si `UF` o `tax_table_version` faltan cuando el período lo requiere

Entregables sugeridos:
- `GET /api/hr/payroll/periods/[periodId]/readiness`
- resumen por período en dashboard y/o tab `Período actual`
- callouts accionables antes de `Calcular`

Contratos mínimos:
- `ready: boolean`
- `includedMemberIds`
- `missingCompensationMemberIds`
- `missingKpiMemberIds`
- `missingAttendanceMemberIds`
- `warnings`
- `blockingIssues`

### Slice 2 — Auditabilidad y explicabilidad por entry

Agregar una superficie de auditoría por `payroll_entry`.

Debe mostrar:
- compensación aplicada
- período imputable
- `kpiDataSource` y `sourceMode`
- `OTD`, `RpA`, tareas completadas
- thresholds usados
- factor de prorrateo OTD/RpA
- `workingDaysInPeriod`, ausencias, licencias, licencias no pagadas
- salario base ajustado y bono conectividad ajustado
- bruto, descuentos, neto calculado y override

No hace falta duplicar tablas mutantes si el snapshot actual ya contiene esos datos.
Primero debe exponerse correctamente el snapshot existente.

Entregables sugeridos:
- `GET /api/hr/payroll/entries/[entryId]/explain`
- panel `Detalle de cálculo` en `PayrollEntryTable` o drawer dedicado
- microcopy claro para `manualOverride`, `manual KPI`, `live/materialized`

### Slice 3 — Hardening de fuentes de asistencia y licencias

Reducir la fragilidad del request path de Payroll.

Objetivo:
- dejar de reconstruir el resumen mensual combinando ad-hoc BigQuery + PostgreSQL en cada cálculo
- introducir una proyección/read model reutilizable para asistencia mensual por miembro

Opciones válidas:
- proyección mensual canónica en `greenhouse_serving`
- o tabla mensual en `greenhouse_hr`/`greenhouse_payroll` poblada por sync

Reglas:
- licencias siguen siendo owner de `HR Core`
- asistencia diaria puede seguir naciendo fuera de Payroll
- Payroll solo consume un monthly summary estable y versionable

Resultado esperado:
- el cálculo del período depende de un summary mensual consistente
- el snapshot de `payroll_entry` sigue congelando lo usado en el momento del cálculo

### Slice 4 — Endurecimiento Chile: impuesto y validaciones

Endurecer el cálculo chileno para que `tax_table_version` deje de ser solo metadata.

Objetivos mínimos:
- cálculo automático de impuesto mensual a partir de la tabla impositiva vigente/versionada
- validación explícita de inputs requeridos por régimen Chile
- separación clara entre:
  - cálculo automático
  - override manual justificado

Debe cubrir:
- imponible
- AFP
- salud (`Fonasa` / `Isapre`)
- cesantía
- APV
- impuesto

No scope de este slice:
- construir un motor tributario multipaís
- modelar legislación completa más allá del alcance real del equipo

### Slice 5 — Observabilidad operativa del cálculo

Agregar trazabilidad útil para operación y soporte.

Ejemplos:
- `diagnostics` del cálculo guardados junto a la ejecución
- source mode KPI del período
- cantidad de miembros incluidos/excluidos
- razones de exclusión
- warnings de fallback live

Esto puede vivir como:
- campos adicionales en período
- outbox events más ricos
- o logs estructurados accesibles desde soporte

## No scope

- rediseño visual completo del dashboard de Payroll
- multipaís full payroll engine
- contabilidad completa de pagos y asientos automáticos
- reemplazar `People` o `HR Core`
- reabrir el debate `Postgres vs BigQuery`
- cambiar la lógica de bonos máximos por colaborador ya cerrada

## Boundary segura para trabajo en paralelo

Zonas esperadas:
- `src/lib/payroll/**`
- `src/app/api/hr/payroll/**`
- `src/views/greenhouse/payroll/**`
- `src/views/greenhouse/people/tabs/PersonPayrollTab.tsx`
- `scripts/setup-postgres-payroll*.{sql,ts}`
- `scripts/setup-postgres-hr-leave*.{sql,ts}`
- documentación de payroll/handoff/changelog

No debería tocar salvo necesidad explícita:
- `src/lib/finance/**`
- `src/app/api/finance/**`
- `src/views/greenhouse/people/**` fuera del scope payroll tab
- layout global
- navegación global

## Dependencias cruzadas

Depende de:
- `CODEX_TASK_People_360_Enrichments_v1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `greenhouse_core.members`
- `greenhouse_hr.leave_requests`
- `ICO` member metrics

Se beneficia de:
- cualquier lane futura que consolide attendance/HR serving mensual

## Entregables esperados

- API de readiness por período
- explicación auditable por `payroll_entry`
- UI mínima de prechecks y detalle de cálculo
- source contract más estable para asistencia/licencias
- cálculo Chile endurecido y explicado
- tests unitarios y de integración liviana para:
  - readiness
  - prorrateo
  - cálculo Chile
  - view-model de explicación

## Criterios de aceptación

### Runtime

- antes de calcular un período, el usuario puede ver si está listo y por qué no
- el cálculo no incluye silenciosamente colaboradores sin compensación vigente
- el período devuelve `diagnostics` útiles después del cálculo

### Auditoría

- cada `payroll_entry` puede explicar:
  - qué compensación se aplicó
  - qué KPI se usó
  - qué asistencia/licencias afectaron la base
  - cómo se llegó al bruto y al neto

### Datos

- `Payroll` sigue anclado a `member_id`
- el snapshot del período sigue siendo reproducible y estable
- la fuente mensual de asistencia/licencias queda más consistente que el request-time actual

### Chile

- el impuesto ya no depende por defecto de `0` o solo de input manual
- el uso de `tax_table_version` queda operacional, no decorativo

### Calidad

- tests unitarios nuevos con `Vitest`
- no se introducen regresiones en el lifecycle `draft -> calculated -> approved -> exported`

## Primeros archivos sugeridos

- `src/lib/payroll/calculate-payroll.ts`
- `src/lib/payroll/fetch-kpis-for-period.ts`
- `src/lib/payroll/fetch-attendance-for-period.ts`
- `src/lib/payroll/calculate-chile-deductions.ts`
- `src/lib/payroll/recalculate-entry.ts`
- `src/lib/payroll/postgres-store.ts`
- `src/app/api/hr/payroll/periods/[periodId]/calculate/route.ts`
- `src/app/api/hr/payroll/periods/[periodId]/entries/route.ts`
- `src/views/greenhouse/payroll/PayrollPeriodTab.tsx`
- `src/views/greenhouse/payroll/PayrollEntryTable.tsx`
- `src/views/greenhouse/people/tabs/PersonPayrollTab.tsx`

## Handoff recomendado para quien tome esta lane

- no reabrir foundations ya cerradas de `Payroll`
- asumir como contrato vigente:
  - compensación versionada
  - período imputable mensual
  - KPI mensuales desde `ICO`
  - `approved` editable hasta `exported`
- priorizar robustez operativa sobre rediseño visual
- agregar tests en cada slice; no dejar la robustez como “solo UX”

## Prioridad sugerida

- Prioridad: `P1`
- Impacto: `Alto`
- Esfuerzo: `Alto`
- Estado real: `Diseño`
