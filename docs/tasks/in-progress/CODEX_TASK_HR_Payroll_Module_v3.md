# CODEX TASK — HR Payroll: Runtime Gap Closure (v3)

## Resumen

Esta task no parte desde cero. `HR Payroll` ya existe como módulo operativo en Greenhouse y este brief solo cubre los gaps que todavía impiden considerarlo realmente cerrado.

Ruta activa:
- `/hr/payroll`
- `/hr/payroll/member/[memberId]`

Backend activo:
- `/api/hr/payroll/compensation`
- `/api/hr/payroll/compensation/eligible-members`
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

Resultado del contraste 2026-03-14:
- `v3` sí queda alineada con arquitectura
- mantiene `Payroll` como owner de `compensation_versions`, `payroll_periods` y `payroll_entries`
- mantiene `greenhouse.team_members.member_id` como ancla canónica del colaborador
- no mueve writes a `People` ni a `Admin`

## Complementos backend ya cerrados para v3

Estos ajustes ya quedaron listos para que Claude implemente frontend sobre contratos reales:

- `GET /api/hr/payroll/compensation` ahora devuelve:
  - `compensations`
  - `eligibleMembers`
  - `members`
  - `summary`
- `GET /api/hr/payroll/compensation/eligible-members` expone solo candidatos activos sin compensación vigente
- `GET /api/hr/payroll/periods` ahora devuelve `periods` + `summary`
- `GET /api/hr/payroll/periods/[periodId]/entries` ahora devuelve `entries` + `summary`
- `GET /api/hr/payroll/members/[memberId]/history` ahora incluye:
  - `member`
  - `entries`
  - `compensationHistory`
- `GET /api/hr/payroll/members/[memberId]/history` responde `404` si `memberId` no existe en `greenhouse.team_members`

Handoff backend para frontend:
- usar `eligibleMembers` para el CTA `Nueva compensación`
- no recalcular candidatos desde la tabla actual de compensaciones
- usar `history.member` para header y empty states del detalle de colaborador
- usar `periods.summary` y `entries.summary` si se quieren KPIs rápidos de pantalla, sin recalcularlos localmente por defecto

## Backend hardening 2026-03-15

### Hallazgo backend detectado

- la vigencia “actual” de compensaciones dependía de `compensation_versions.is_current` materializado al momento de creación
- si se programaba una compensación futura:
  - la versión vigente seguía marcada como `is_current = TRUE`
  - la futura quedaba `FALSE`
  - no existía ningún proceso posterior que rotara esa bandera al llegar la fecha efectiva
- impacto:
  - `GET /api/hr/payroll/compensation` podía seguir mostrando una compensación vencida como actual
  - `eligibleMembers` y `members` podían derivar mal `hasCurrentCompensation`
  - la UI de compensaciones podía quedar desalineada con la vigencia real

### Corregido en backend

- `src/lib/payroll/get-compensation.ts`
  - `isCurrent` ahora se deriva por ventana efectiva:
    - `effective_from <= today`
    - `effective_to IS NULL OR effective_to >= today`
  - `getCurrentCompensation()` ya no depende de `is_current = TRUE`
- `src/lib/payroll/get-payroll-members.ts`
  - la CTE `current_compensation` ahora resuelve la compensación vigente por fechas efectivas, no por la bandera materializada

### Validación

- `pnpm exec eslint src/lib/payroll src/app/api/hr/payroll`
  - correcto
- `git diff --check -- src/lib/payroll src/app/api/hr/payroll docs/tasks/in-progress/CODEX_TASK_HR_Payroll_Module_v3.md Handoff.md changelog.md`
  - correcto
- `pnpm exec tsc --noEmit --pretty false`
  - el proyecto sigue con ruido previo fuera de payroll, pero no aparecieron errores del scope `src/lib/payroll|src/app/api/hr/payroll` al filtrarlo

### Estado del backend después de esta tanda

- `HR-Payroll` backend vuelve a ser consistente con compensaciones futuras programadas
- el próximo foco backend, si se abre otra tanda, conviene ir por:
  - auditoría explícita de cambios de compensación/período
  - revisión de nulabilidad de params BigQuery en writes con campos opcionales
  - smoke runtime autenticado sobre período con compensaciones futuras reales

## QA runtime 2026-03-15 — frontend + flujos activos

### Flujos mapeados

- dashboard payroll:
  - overview de período actual
  - tabs de período, compensaciones e historial
- compensaciones:
  - alta inicial
  - nueva versión desde fila existente
- períodos:
  - creación
  - edición de metadata
  - cálculo
  - aprobación
  - export CSV
- entries:
  - bonos
  - KPI manual
  - impuesto manual
  - override neto
- historial por colaborador:
  - entries cerradas
  - historial de compensación

### Fix aplicado en esta pasada QA

- `src/views/greenhouse/payroll/CompensationDrawer.tsx`
  - el drawer reutilizaba estado previo entre colaborador/versiones porque sus `useState` no se resincronizaban con props al reabrirse
  - impacto:
    - alta inicial podía heredar valores del colaborador anterior
    - crear nueva versión desde otra fila podía abrir con datos stale
  - ahora el formulario se rehidrata al abrirse según `existingVersion` o colaborador nuevo

### Estado después del QA

- el flujo de compensaciones vuelve a ser confiable para crear primera versión o nueva versión sin arrastrar estado viejo
- la vista `MemberPayrollHistory` ya no tiene issues de lint en esta pasada
- falta smoke autenticado con datos reales de cálculo/aprobación/export

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
- `src/app/api/hr/payroll/compensation/route.ts`
- `src/app/api/hr/payroll/compensation/eligible-members/route.ts`
- `src/lib/payroll/recalculate-entry.ts`

## Fuera de alcance

- recalcular el modelo normativo chileno completo con tabla SII automática
- rehacer la arquitectura de payroll
- mover payroll bajo `/admin`
- crear identidades nuevas de empleado
- integrar writebacks directos a Finance en esta fase
