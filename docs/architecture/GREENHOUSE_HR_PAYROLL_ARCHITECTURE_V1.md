# GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md

## Objetivo
Definir el contrato arquitectónico del módulo `Payroll` de Greenhouse: qué ownership tiene, sobre qué anclas canónicas opera, cómo se calcula una nómina mensual, qué estados atraviesa, qué integra con otros módulos y qué superficies son las oficiales.

Este documento es la fuente canónica del módulo. No reemplaza:
- `GREENHOUSE_ARCHITECTURE_V1.md` como arquitectura general del producto
- `GREENHOUSE_360_OBJECT_MODEL_V1.md` como modelo 360 transversal
- `GREENHOUSE_POSTGRES_CANONICAL_360_V1.md` como placement del modelo en PostgreSQL

## 1. Alcance del módulo

`Payroll` es el dominio transaccional de nómina mensual para colaboradores internos de Efeonce.

Su responsabilidad es:
- versionar compensaciones por colaborador
- definir y administrar períodos imputables mensuales
- calcular entries de nómina por colaborador y período
- permitir revisión, ajustes y aprobación antes de exportar
- exponer historial y recibos de nómina
- alimentar reporting de gasto de personal y linkage con Finance

`Payroll` no debe:
- ser owner del roster base de colaboradores
- crear una identidad paralela de persona
- ser owner de los KPI operativos fuente
- reemplazar People 360 como ficha humana del colaborador

## 2. Ownership y fronteras

### Payroll es owner de:
- `compensation_versions`
- `payroll_periods`
- `payroll_entries`
- `payroll_bonus_config`

### Payroll consume, pero no posee:
- identidad canónica del colaborador desde `greenhouse_core.members`
- actor de sesión desde `greenhouse_core.client_users`
- asistencia y licencias desde `HR Core`
- KPI mensuales `On-Time` y `RpA` desde `ICO`
- exports y reporting como consumers aguas abajo

## 3. Superficies oficiales

### Rutas UI
- `/hr/payroll`
- `/hr/payroll/member/[memberId]`

### Surface actual
- `/hr/payroll` es el dashboard operativo del módulo
- `/hr/payroll/member/[memberId]` ya no sostiene una pantalla independiente: redirige a `/people/[memberId]?tab=payroll`

### Tabs del dashboard
- `Período actual`
- `Compensaciones`
- `Historial`
- `Gasto de personal`

### APIs oficiales
- `GET/POST /api/hr/payroll/compensation`
- `GET /api/hr/payroll/compensation/eligible-members`
- `GET/PATCH /api/hr/payroll/compensation/[versionId]`
- `GET/POST /api/hr/payroll/periods`
- `GET/PATCH /api/hr/payroll/periods/[periodId]`
- `POST /api/hr/payroll/periods/[periodId]/calculate`
- `POST /api/hr/payroll/periods/[periodId]/approve`
- `GET /api/hr/payroll/periods/[periodId]/entries`
- `GET /api/hr/payroll/periods/[periodId]/pdf`
- `GET /api/hr/payroll/periods/[periodId]/excel`
- `GET /api/hr/payroll/periods/[periodId]/export`
- `PATCH /api/hr/payroll/entries/[entryId]`
- `GET /api/hr/payroll/entries/[entryId]/receipt`
- `GET /api/hr/payroll/members/[memberId]/history`
- `GET /api/hr/payroll/personnel-expense`

## 4. Anclas canónicas

### Identidad del colaborador
La ancla primaria de `Payroll` es:
- `greenhouse_core.members.member_id`

Regla:
- toda compensación y toda payroll entry deben referenciar `member_id`
- `Payroll` no debe usar como identidad primaria ni email, ni notion_user_id, ni provider IDs

### Actor operativo
Las acciones de cálculo/aprobación/versionado pueden referenciar:
- `greenhouse_core.client_users.user_id`

Esto aplica para:
- `created_by_user_id`
- `calculated_by_user_id`
- `approved_by_user_id`

## 5. Modelo de datos

El runtime mutante del módulo vive en `greenhouse_payroll`.

### `greenhouse_payroll.compensation_versions`
Historial versionado de compensación por colaborador.

Campos funcionales clave:
- `member_id`
- `version`
- `pay_regime`
- `currency`
- `base_salary`
- `remote_allowance`
- `bonus_otd_min`
- `bonus_otd_max`
- `bonus_rpa_min`
- `bonus_rpa_max`
- `effective_from`
- `effective_to`
- `is_current`
- `change_reason`

Reglas:
- la compensación se define una sola vez y queda vigente hasta que cambie
- un cambio real de salario/bonos crea nueva versión con nueva vigencia
- el modelo es temporal, no mensual
- no se deben reingresar montos máximos de bono todos los meses

### `greenhouse_payroll.payroll_periods`
Períodos mensuales imputables de nómina.

Campos funcionales clave:
- `period_id`
- `year`
- `month`
- `status`
- `uf_value`
- `tax_table_version`
- `notes`
- `calculated_at`
- `approved_at`
- `exported_at`

Reglas:
- `year` + `month` representan el mes imputable, no el mes de pago
- una nómina de febrero pagada en los primeros días de marzo sigue siendo `2026-02`
- el período puede corregirse mientras no esté exportado
- `uf_value` puede persistirse automáticamente desde la capa de indicadores económicos según `year/month`; no debe depender por defecto de captura manual en UI
- si el usuario no define override explícito, Payroll debe preferir la `UF` histórica del período imputable para Isapre y snapshots derivados

### `greenhouse_payroll.payroll_entries`
Snapshot calculado por colaborador para un período.

Incluye:
- snapshot de compensación aplicable
- snapshot de KPI del mes
- snapshot de asistencia y licencias
- bonos calculados
- descuentos Chile
- neto calculado y override manual

Regla:
- cada `payroll_entry` congela el estado del cálculo al momento de la ejecución
- cambios posteriores en ICO, asistencia o compensación no deben reescribir retroactivamente un período ya calculado, salvo recálculo explícito

### `greenhouse_payroll.payroll_bonus_config`
Configuración global de thresholds de elegibilidad y prorrateo.

Campos clave:
- `otd_threshold`
- `rpa_threshold`
- `otd_floor`
- `effective_from`

Regla:
- los montos máximos de bono son por colaborador
- los thresholds de calificación siguen siendo globales por vigencia

### Serving view
- `greenhouse_serving.member_payroll_360`

Uso:
- vista de lectura para composición 360 y consumers
- no debe usarse como tabla mutante

## 6. Runtime de almacenamiento

### Regla actual
`Payroll` es `Postgres-first`.

### Estado runtime
- PostgreSQL es el write path operativo del módulo
- BigQuery queda como fallback de compatibilidad en ambientes donde PostgreSQL no esté configurado

### Implicación
- el source of truth transaccional del módulo ya no debe vivir en BigQuery
- no se deben introducir nuevas mutaciones mensuales de Payroll contra tablas legacy salvo compatibilidad excepcional

## 7. Compensación versionada

La compensación no es mensual. Es una serie versionada por vigencia.

### Qué se fija por colaborador
- salario base
- bono conectividad
- bono máximo de `On-Time`
- bono máximo de `RpA`
- parámetros Chile si aplican:
  - AFP
  - salud
  - APV
  - cesantía

### Qué ocurre al editar
- si se mantiene `effective_from`, el sistema puede corregir la versión vigente
- si se cambia `effective_from`, el sistema crea una nueva versión
- el histórico queda preservado para auditoría y cálculo retroactivo correcto

### Regla de bloqueo
- una compensación usada solo en períodos `draft`, `calculated` o `approved` sigue siendo corregible
- si ya fue usada en un período `exported`, esa versión queda congelada y el cambio debe entrar como nueva vigencia

## 8. Semántica del período imputable

El período de Payroll representa el mes calendario al que pertenece la nómina.

### Regla operativa
- febrero trabajado y pagado en marzo = período `2026-02`
- marzo trabajado y pagado en abril = período `2026-03`

### Consecuencia
`Payroll` no modela el mes de pago como identidad del período.

### Corrección de período
Mientras el período no esté `exported`, se permite corregir:
- `year`
- `month`
- `uf_value`
- `tax_table_version`
- `notes`

Si cambia alguno de estos insumos estructurales:
- `year`
- `month`
- `uf_value`
- `tax_table_version`

entonces:
- el período vuelve a `draft`
- se eliminan las `payroll_entries` existentes
- debe recalcularse limpio con el mes correcto

## 9. Lifecycle del período

Estados válidos:
- `draft`
- `calculated`
- `approved`
- `exported`

### Semántica vigente
- `draft`: período creado o reabierto, sin cálculo vigente
- `calculated`: período calculado y revisable
- `approved`: listo para pago/revisión, todavía editable antes de exportar
- `exported`: cierre final operativo

### Regla importante
`approved` no es cierre final.

Si un período `approved`:
- se recalcula, o
- se edita una entry

entonces:
- vuelve a `calculated`
- debe aprobarse de nuevo antes de exportarse

### Candado final
Solo `exported` bloquea:
- recálculo
- edición de entries
- corrección retroactiva de la compensación ya utilizada
- corrección del mes imputable

## 10. Flujo de cálculo mensual

El cálculo mensual ocurre así:

1. Se obtiene el período por `period_id`.
2. Se valida que el período sea recalculable.
3. Se determina el rango `periodStart -> periodEnd`.
4. Se buscan las `compensation_versions` aplicables para cada `member_id` activo.
5. Se carga la `bonus_config` vigente para la fecha del período.
6. Se consultan KPI mensuales desde `ICO`.
7. Se consultan asistencia y licencias del período desde `HR Core`.
8. Se ajustan salario base y conectividad por ausencias/licencias no pagadas si corresponde.
9. Se calcula bono `On-Time` prorrateado.
10. Se calcula bono `RpA` prorrateado.
11. Se calculan descuentos Chile si aplica el régimen.
12. Se persiste una `payroll_entry` por colaborador.
13. El período queda en `calculated`.

## 11. Fuente de KPI

### Regla actual
Los KPI mensuales de `Payroll` deben venir desde `ICO`, no directo desde Notion.

### Estrategia
- `materialized-first`
- fallback live por `member_id` si el mes no está materializado

### Métricas utilizadas
- `otd_pct`
- `rpa`
- `completedTasks`

### Razón
Esto alinea `Payroll` con:
- identidad canónica de colaborador
- serving de desempeño mensual
- capa analítica oficial del producto

### Compatibilidad
Entries históricas con `kpi_data_source = notion_ops` siguen leyéndose, pero los cálculos nuevos deben registrar `kpi_data_source = ico`.

## 12. Regla de bonos

Los bonos no son binarios puros. Se prorratean.

### `On-Time`
- si supera `otd_threshold`, paga 100% del bono máximo
- si queda entre `otd_floor` y `otd_threshold`, paga proporcional
- si queda bajo el piso, paga 0

### `RpA`
- si queda dentro del threshold, paga proporcional hasta el máximo
- si excede el umbral permitido, puede pagar 0 según la fórmula vigente

### Ownership
- el monto máximo pertenece a la compensación del colaborador
- la regla de elegibilidad pertenece a `payroll_bonus_config`

## 13. Asistencia, licencias y prorrateo

`Payroll` consume asistencia mensual y licencias para ajustar el pago base del período.

Snapshot guardado por entry:
- `working_days_in_period`
- `days_present`
- `days_absent`
- `days_on_leave`
- `days_on_unpaid_leave`
- `adjusted_base_salary`
- `adjusted_remote_allowance`

Regla:
- la asistencia afecta salario base y conectividad cuando corresponde
- el entry guarda el resultado ajustado, no solo el valor fuente

## 14. Edición manual y recálculo de entries

Las entries pueden recibir ajustes manuales mientras el período no esté exportado.

### Casos soportados
- override de neto
- edición de bonos permitidos
- edición de KPI manual solo si la entry ya está en modo manual
- nota de override

### Efecto en lifecycle
Si la entry pertenecía a un período `approved`, el período se reabre a `calculated`.

## 15. Export y cierre

`Payroll` soporta:
- CSV export
- PDF
- Excel
- receipt por colaborador

### Regla de export
- solo un período `approved` o ya `exported` puede exportarse
- al exportar CSV, el período pasa a `exported`

### Semántica operativa
`exported` representa el cierre final del ciclo mensual.

## 16. Consumers aguas abajo

### People 360
- la ficha oficial del colaborador se ve en `/people/[memberId]?tab=payroll`
- Payroll expone historial y contexto, pero People es la superficie humana unificada

### Finance
- `Finance` puede descubrir candidates de gasto de nómina desde entries aprobadas/exportadas
- el linkage `payroll_entry_id -> member_id` permite anclar gasto de personal al colaborador

### Reporting
- `Gasto de personal` agrega períodos `approved/exported`
- `member_payroll_360` y reports agregados consumen snapshots ya calculados

## 17. Permisos y acceso

Roles con acceso típico al módulo:
- `hr_payroll`
- `hr_manager`
- `efeonce_admin`

Regla:
- el módulo es una superficie `hr`
- el colaborador no usa `/hr/payroll` para self-service; su vista personal debe entrar por `People` o por surfaces personales futuras

## 18. No-goals

`Payroll` no debe:
- administrar roster base de team members
- reconstruir KPI delivery en request time cuando ICO ya puede resolverlos
- usar email como FK primaria
- depender de exports para representar el estado real de un cálculo
- duplicar ficha individual de persona fuera de People 360

## 19. Archivos runtime clave

### UI
- `src/views/greenhouse/payroll/PayrollDashboard.tsx`
- `src/views/greenhouse/payroll/PayrollPeriodTab.tsx`
- `src/views/greenhouse/payroll/PayrollCompensationTab.tsx`
- `src/views/greenhouse/payroll/PayrollEntryTable.tsx`
- `src/views/greenhouse/payroll/PayrollPersonnelExpenseTab.tsx`
- `src/views/greenhouse/payroll/CompensationDrawer.tsx`
- `src/views/greenhouse/payroll/MemberPayrollHistory.tsx`

### API
- `src/app/api/hr/payroll/**`

### Dominio
- `src/lib/payroll/calculate-payroll.ts`
- `src/lib/payroll/recalculate-entry.ts`
- `src/lib/payroll/fetch-kpis-for-period.ts`
- `src/lib/payroll/fetch-attendance-for-period.ts`
- `src/lib/payroll/get-compensation.ts`
- `src/lib/payroll/get-payroll-periods.ts`
- `src/lib/payroll/get-payroll-entries.ts`
- `src/lib/payroll/postgres-store.ts`
- `src/lib/payroll/export-payroll.ts`
- `src/lib/payroll/personnel-expense.ts`
- `src/lib/payroll/period-lifecycle.ts`
- `src/lib/payroll/compensation-versioning.ts`

### Schema
- `scripts/setup-postgres-payroll.sql`

## 20. Reglas canónicas resumidas

- `member_id` es la ancla de colaborador para Payroll.
- La compensación es versionada por vigencia, no mensual.
- El período representa mes imputable, no mes de pago.
- `approved` sigue siendo editable; `exported` es el cierre final.
- Los KPI mensuales de `Payroll` vienen desde `ICO`.
- `payroll_entries` son snapshots congelados del cálculo mensual.
- People 360 es la ficha individual oficial del colaborador.
