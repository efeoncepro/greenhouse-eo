# CODEX TASK — HR Payroll: Runtime Gap Closure (v3)

## Resumen

Esta task no parte desde cero. `HR Payroll` ya existe como módulo operativo en Greenhouse y este brief solo cubre los gaps que todavía impiden considerarlo realmente cerrado.

Ruta activa:
- `/hr/payroll`
- `/hr/payroll/member/[memberId]`

Backend activo:
- `/api/hr/payroll/compensation`
- `/api/hr/payroll/periods`
- `/api/hr/payroll/periods/[periodId]`
- `/api/hr/payroll/periods/[periodId]/calculate`
- `/api/hr/payroll/periods/[periodId]/approve`
- `/api/hr/payroll/periods/[periodId]/entries`
- `/api/hr/payroll/periods/[periodId]/export`
- `/api/hr/payroll/entries/[entryId]`
- `/api/hr/payroll/members/[memberId]/history`

Objetivo de esta v3:
- cerrar UX y flujo operativo encima del módulo ya implementado
- mantener el backend actual como source of truth
- evitar reescribir arquitectura, tablas o rutas ya vivas

## Estado real del módulo

### Ya implementado

- route group `hr` con guard dedicado
- rol `hr_payroll` y `route_group_scope` para `hr`
- bootstrap runtime de:
  - `greenhouse.compensation_versions`
  - `greenhouse.payroll_periods`
  - `greenhouse.payroll_entries`
  - `greenhouse.payroll_bonus_config`
- cálculo por período usando versión de compensación aplicable por vigencia
- lectura de KPIs desde `notion_ops.tareas` con introspección de columnas
- aprobación y export CSV
- historial por colaborador de entries cerradas y compensaciones

### Gap operativo actual

El módulo todavía no está “cerrado” por estas razones:

1. No existe alta real de primera compensación desde la UI
- la tab de compensaciones solo permite abrir drawer desde una fila existente
- si un colaborador activo no tiene compensación vigente, HR no puede crearla desde pantalla

2. No existe edición visible de metadata del período
- el backend permite `PATCH /api/hr/payroll/periods/[periodId]`
- la UI no expone edición de `ufValue`, `taxTableVersion` o `notes` después de crear el período

3. Falta exponer fallback manual de KPI y override de entry en la UI
- el backend ya acepta `kpi_*`, `kpiDataSource`, `manualOverride`, `manualOverrideNote`, `netTotal`, `chileTaxAmount`
- la tabla actual solo deja editar bonos OTD/RpA

4. La ficha `/hr/payroll/member/[memberId]` corta demasiado pronto
- si no hay entries aprobadas/exportadas, la pantalla muestra empty state y oculta igualmente el historial de compensación
- debe seguir siendo útil aunque todavía no exista payroll cerrado

## Alineación obligatoria con arquitectura

Esta task debe revisarse contra:
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V1.md`

Reglas obligatorias:
- no crear una identidad paralela de colaborador; todo debe seguir anclado a `greenhouse.team_members.member_id`
- no reemplazar el backend actual con lógica cliente; la UI debe orquestar el contrato existente
- si aparece un gap de datos, extender el contrato real del backend antes de inventar estado local o mocks

## Alcance v3

### A. Alta inicial de compensación

La tab `Compensaciones` debe permitir crear la primera versión para colaboradores activos sin compensación vigente.

Resultado esperado:
- CTA visible `Nueva compensación`
- selector de colaborador activo sin compensación vigente
- reuso del drawer actual, no pantalla nueva paralela
- después de guardar, refrescar lista e historial normalmente

No hacer:
- CRUD completo de roster dentro de payroll
- duplicar lógica que pertenece a `Admin Team`

### B. Edición de período en draft

Agregar una acción UI para editar `ufValue`, `taxTableVersion` y `notes` cuando el período esté en `draft`.

Resultado esperado:
- si el período requiere UF y no la tiene, HR puede corregirlo desde la misma pantalla
- la edición usa `PATCH /api/hr/payroll/periods/[periodId]`
- no permitir edición una vez `status` sea `calculated`, `approved` o `exported`

### C. Fallback manual de KPI y override operativo

La tabla del período debe exponer controles para casos donde el backend dejó `kpi_data_source = 'manual'` o HR necesita cerrar un caso excepcional.

Resultado esperado:
- mostrar campos editables de `kpiOtdPercent`, `kpiRpaAvg`, `kpiTasksCompleted` cuando la entry esté en modo manual
- permitir editar `chileTaxAmount`
- permitir `manualOverride`, `manualOverrideNote` y `netTotal` override
- seguir usando el recálculo server-side existente

Reglas:
- la UI no recalcula netos localmente
- la validación de bonos y umbrales sigue viviendo server-side

### D. Ficha de colaborador útil sin payroll cerrado

`/hr/payroll/member/[memberId]` debe seguir mostrando valor aunque no existan entries aprobadas/exportadas.

Resultado esperado:
- si no hay entries cerradas pero sí `compensationHistory`, mostrar la sección de historial de compensación
- el empty state no debe ocultar toda la página
- si existen ambos, mostrar ambos

## Criterios de aceptación

- HR puede crear la primera compensación de un colaborador sin depender de que ya exista una fila vigente
- HR puede editar metadata del período mientras está en `draft`
- una entry manual puede cerrarse completamente desde UI:
  - KPI manual
  - impuesto manual
  - override de neto
  - nota de override
- la vista de colaborador sigue siendo útil aun sin nóminas cerradas
- `pnpm exec eslint` pasa sobre archivos tocados

## Archivos objetivo probables

- `src/views/greenhouse/payroll/PayrollDashboard.tsx`
- `src/views/greenhouse/payroll/PayrollCompensationTab.tsx`
- `src/views/greenhouse/payroll/CompensationDrawer.tsx`
- `src/views/greenhouse/payroll/PayrollPeriodTab.tsx`
- `src/views/greenhouse/payroll/PayrollEntryTable.tsx`
- `src/views/greenhouse/payroll/MemberPayrollHistory.tsx`

Backend ya disponible para reutilizar:
- `src/app/api/hr/payroll/periods/[periodId]/route.ts`
- `src/app/api/hr/payroll/entries/[entryId]/route.ts`
- `src/lib/payroll/recalculate-entry.ts`

## Fuera de alcance

- recalcular el modelo normativo chileno completo con tabla SII automática
- rehacer la arquitectura de payroll
- mover payroll bajo `/admin`
- crear identidades nuevas de empleado
- integrar writebacks directos a Finance en esta fase
