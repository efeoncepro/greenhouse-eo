# GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md

## Delta 2026-04-06 — TASK-271: Half-day leave periods + min_advance_days precision

### Half-day leave periods

`leave_requests` ahora soporta permisos de medio dia. Columnas nuevas:

- `start_period TEXT NOT NULL DEFAULT 'full_day'` — periodo del primer dia de la solicitud
- `end_period TEXT NOT NULL DEFAULT 'full_day'` — periodo del ultimo dia de la solicitud
- CHECK constraint: valores validos `('full_day', 'morning', 'afternoon')`

Backward compatible: solicitudes existentes quedan con valor default `full_day`.

Funcion `computeLeaveDayBreakdown()` acepta parametros opcionales `startPeriod` y `endPeriod` y ajusta el calculo de dias habiles:

- Dia unico con `morning` o `afternoon` = 0.5 dias
- Rango con `afternoon` en start = primer dia cuenta 0.5
- Rango con `morning` en end = ultimo dia cuenta 0.5
- Combinacion posible: rango con `afternoon` start + `morning` end = ambos extremos cuentan 0.5

Reglas de producto:

- dia unico: el usuario elige entre `full_day`, `morning` o `afternoon`
- rango de fechas: selectores independientes para primer dia y ultimo dia
- los dias fraccionarios (0.5) participan en todas las validaciones de saldo, carry-over y policy
- el calendario de permisos muestra indicadores AM/PM para solicitudes de medio dia

### min_advance_days ahora es NUMERIC(10,2)

`leave_policies.min_advance_days` cambio de `INTEGER` a `NUMERIC(10,2)` para soportar anticipaciones fraccionarias en horas de negocio.

Valores actualizados en seed:

- `study`: `min_advance_days = 1.5` (equivale a 36 horas habiles de anticipacion)
- `unpaid`: `min_advance_days = 2` (equivale a 48 horas habiles de anticipacion)

Regla: la validacion de anticipacion sigue comparando contra dias calendario desde la fecha operativa de hoy.

## Delta 2026-03-31 — Exported también alimenta el ledger de Finance

El cierre `payroll_period.exported` ya no solo dispara recibos/notificaciones downstream.

Estado vigente:
- `payroll_period.exported` sigue siendo el evento canónico de cierre/exportación
- ese mismo hito ahora también alimenta el intake reactivo de `Finance > Expenses`
- la materialización downstream genera expenses system-generated para:
  - `payroll`
  - `social_security`

Regla:
- Payroll sigue siendo owner del cálculo y lifecycle del período
- Finance sigue siendo owner del ledger `expenses`
- el bridge entre ambos dominios debe salir de `payroll_period.exported`, no de `approved` ni de acciones manuales en el drawer

## Delta 2026-03-31 — Leave draft uploads resuelven ownerMemberId de forma robusta

`leave` ya no debe depender exclusivamente de `tenant.memberId` en sesión para ownership documental de borradores.

Estado vigente:
- `/api/hr/core/meta` devuelve `currentMemberId` resuelto server-side para surfaces HR/My
- `LeaveRequestDialog` propaga ese `ownerMemberId` al uploader y al payload final de creación
- `/api/assets/private` hace fallback server-side para `leave_request_draft` antes de rechazar un upload por falta de ownership

Regla:
- los adjuntos draft de `leave` deben quedar amarrados al colaborador efectivo de la solicitud
- el ownership documental no debe quedar implícito en la sesión si el backend ya puede resolver al colaborador actual por identidad/email
- la UI debe enviar el `memberId` efectivo cuando ya lo conoce para mantener alineados draft upload y create request
## Delta 2026-03-31 — Payroll artifacts convergen a shared assets

`TASK-173` deja explícito que los artefactos documentales de Payroll no deben seguir como carriles aislados.

Estado vigente en repo:
- `payroll_receipts` ya puede persistir `asset_id`
- `payroll_export_packages` ya puede persistir `pdf_asset_id` y `csv_asset_id`
- la generación de recibos y export packages ya puede registrar metadata shared sobre el bucket privado canónico

Regla:
- Payroll sigue siendo owner del agregado `receipt` / `export package`
- pero el archivo físico y su delivery privado convergen sobre la foundation shared de assets

## Objetivo
Definir el contrato arquitectónico del módulo `Payroll` de Greenhouse: qué ownership tiene, sobre qué anclas canónicas opera, cómo se calcula una nómina mensual, qué estados atraviesa, qué integra con otros módulos y qué superficies son las oficiales.

Este documento es la fuente canónica del módulo. No reemplaza:
- `GREENHOUSE_ARCHITECTURE_V1.md` como arquitectura general del producto
- `GREENHOUSE_360_OBJECT_MODEL_V1.md` como modelo 360 transversal
- `GREENHOUSE_POSTGRES_CANONICAL_360_V1.md` como placement del modelo en PostgreSQL

## Delta 2026-03-29 — TASK-117 cerrada: cálculo el último día hábil

- Payroll ya formaliza que el período oficial del mes debe quedar en `calculated` el último día hábil del mes operativo.
- La semántica temporal vive en `src/lib/calendar/operational-calendar.ts` con:
  - `getLastBusinessDayOfMonth()`
  - `isLastBusinessDayOfMonth()`
- El runtime ya separa `calculation readiness` de `approval readiness`.
- El job idempotente `runPayrollAutoCalculation()` y la route `GET /api/cron/payroll-auto-calculate` reutilizan el path oficial de cálculo y auto-crean el período si falta.
- El hito `payroll_period.calculated` ya notifica a stakeholders operativos por el dominio reactivo `notifications` con categoría `payroll_ops`.

## Delta 2026-03-28 — Próximo backlog operativo: cálculo el último día hábil

- El siguiente backlog recomendado de Payroll queda documentado en `TASK-117`.
- La dirección propuesta no cambia el lifecycle transaccional base (`draft -> calculated -> approved -> exported`).
- La intención es formalizar que el período oficial del mes quede en `calculated` el último día hábil del mes operativo usando la utility canónica de calendario.
- `approved` y `exported` siguen siendo pasos posteriores de revisión y cierre; no se propone auto-cierre.
- La línea de trabajo también contempla notificación a stakeholders operativos cuando el período quede `calculated`, reutilizando `NotificationService` y la capa centralizada de email.

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

## 2.1. Chile non-imponible allowances

`Payroll Chile` también versiona en la compensación y snapshottea en `payroll_entries` los haberes no imponibles recurrentes de:
- `colación`
- `movilización`

Estos montos:
- viven como parte de la compensación vigente del colaborador
- se prorratean si existe ajuste por asistencia o inasistencia no remunerada
- se incluyen en el devengado y en el neto calculado
- no requieren un evento reactivo nuevo para propagarse; siguen el contrato canónico de `compensation_version.created/updated` y `payroll_entry.upserted`

## 2.2. Chile AFP split traceability

`Payroll Chile` también mantiene la trazabilidad de `AFP` con dos componentes separados:
- `cotización`
- `comisión`

Regla arquitectónica:
- la compensación versionada y los payroll entries conservan ambos montos además del total agregado
- el cálculo legal puede seguir consumiendo el total AFP para imponibles y neto, pero las salidas oficiales deben mostrar el split cuando exista
- el contrato canónico no depende de un evento nuevo; se propaga con `compensation_version.created/updated` y `payroll_entry.upserted`

## 2.3. Chile Isapre split and employer cost traceability

`Payroll Chile` también mantiene el total de salud como ancla canónica y, cuando el sistema de salud es `Isapre`, desglosa el monto en:
- `cotización obligatoria`
- `voluntaria` o excedente del plan

Regla arquitectónica:
- `chile_health_amount` sigue siendo el total del plan
- `chile_health_obligatoria_amount` y `chile_health_voluntaria_amount` existen para trazabilidad legal y exportes
- la misma entry de nómina ahora también puede alimentar costos empleador derivados
- `member_capacity_economics.total_labor_cost_target` puede absorber esos costos empleador reales para que Cost Intelligence vea el costo laboral cargado canónico
- la propagación sigue ocurriendo por `compensation_version.created/updated` y `payroll_entry.upserted`; no se introduce un evento nuevo solo para el desglose

## 2.4. Employer legal identity for Chile payroll

La identidad legal del empleador usada por `Payroll Chile` para encabezados, liquidaciones y documentos legales es:

- Razón social: `Efeonce Group SpA`
- RUT: `77.357.182-1`
- Dirección: `Dr. Manuel Barros Borgoño 71 of 05, Providencia, Chile`

Regla arquitectónica:

- esta identidad pertenece al empleador/tenant, no al colaborador
- se debe reutilizar de forma consistente en liquidaciones, recibos, exportes y superficies legales de Payroll Chile
- si cambia la razón social o la dirección, el cambio debe venir desde la capa canónica de empresa/tenant y no desde una compensación individual

## 2.5. Projected payroll promotion contract

`Projected Payroll` comparte motor con `Payroll official`, pero su promoción explícita a borrador oficial tiene contrato propio:

- la promoción debe materializar primero los snapshots proyectados en `greenhouse_serving.projected_payroll_snapshots`
- la ejecución oficial debe correr contra `greenhouse_payroll.payroll_entries` usando `Postgres-first`
- si el runtime ya opera sobre PostgreSQL, la inicialización de infraestructura no debe reintentar materializaciones BigQuery que no forman parte del camino crítico de promoción
- el flujo promotion/projection no debe depender de una tabla de recibos para poder crear el borrador oficial

Regla arquitectónica:

- `Projected Payroll` sigue siendo simulación y cache auditable
- la promoción a oficial es una acción explícita, separada y reversible en términos de tracking, pero no en lifecycle transaccional
- la capa de promoción debe fallar por schema o datos reales de nómina, no por infraestructura analítica no relacionada con el período
- la surface `/api/hr/payroll/projected` sigue resolviendo cálculo vivo + `latestPromotion`; `projected_payroll_snapshots` es una materialización serving interna para acelerar el read, no la source of truth transaccional
- **Runtime DDL eliminado (TASK-109):** `projected-payroll-store.ts` ya no ejecuta `CREATE TABLE IF NOT EXISTS` en runtime. La tabla `greenhouse_serving.projected_payroll_snapshots` se provisiona exclusivamente vía migración (`scripts/migrations/add-projected-payroll-snapshots.sql`). Si la tabla no existe, el store falla con error accionable inmediato (fail-fast), sin intentar DDL defensivo

## 2.6. Operational cut-off and close window

Payroll se imputa al mes cerrado.

Regla operativa canónica para Efeonce:

- la nómina de un mes se calcula al cierre de ese mes o dentro de los primeros 5 días hábiles del mes siguiente
- `approved` sigue siendo un estado operativo válido solo mientras el período aún está dentro de su ventana de cierre
- cuando el período ya fue exportado o la ventana de cierre terminó, la selección de "período actual" no debe retroceder a un período aprobado antiguo
- la selección de "período actual" debe resolver el mes operativo vigente con la utilidad compartida y no basarse únicamente en el último período no exportado

Esta regla define la semántica de negocio del dashboard, no solo su copy.

Baseline operativo vigente del módulo:

- Payroll formaliza una policy explícita para dejar el período oficial del mes en `calculated` el último día hábil del mes operativo.
- La utility temporal compartida resuelve `getLastBusinessDayOfMonth()` / `isLastBusinessDayOfMonth()` y la deadline semántica de cálculo.
- `calculation readiness` y `approval readiness` quedan separadas sin alterar el lifecycle transaccional base.
- El job idempotente mensual reutiliza el path oficial de cálculo, puede auto-crear el período y publica el evento canónico `payroll_period.calculated`.
- El hito `calculated` notifica a stakeholders operativos vía el dominio reactivo `notifications`, sin convertir `approved` ni `exported` en eventos automáticos.
- Esta línea de trabajo quedó cerrada operativamente en `TASK-117-payroll-last-business-day-auto-calculation.md`.

## 2.7. Timezone-aware operational calendar

La casa matriz operativa de Payroll está anclada en Santiago de Chile y el ciclo mensual debe calcularse sobre su zona horaria canónica, no sobre la hora del servidor ni sobre la zona horaria individual de cada colaborador.

Regla arquitectónica:

- la base temporal canónica del módulo es `America/Santiago`
- el cambio horario de invierno/verano afecta el offset de la zona, pero no la semántica del cierre mensual
- la utilidad de calendario operativo debe trabajar sobre la fecha local efectiva del tenant o jurisdicción de nómina
- el colaborador puede tener `location_country` distinto, pero eso no redefine el cierre del período oficial
- la jurisdicción de la nómina debe poder parametrizarse por tenant o por contrato de payroll cuando existan operaciones multi-país

Contexto de contrato:

- `timezone` define cómo se interpreta el borde de fecha/hora
- `country` o `jurisdiction` define qué calendario de feriados y reglas laborales aplica
- `holiday calendar` define qué días cuentan como hábiles para la ventana de cierre

Fuente de verdad de la policy:

- la configuración operativa debe persistirse por tenant o por ámbito de nómina antes de ser consumida por la utilidad
- la policy puede vivir en una tabla de configuración o en un read model administrativo, pero no debe inferirse de la UI
- la utilidad recibe un objeto de contexto ya resuelto; no necesita una API pública de cálculo
- si existe una API, debe ser de administración de policy, no de cálculo temporal ad hoc
- la implementación canónica vive en `src/lib/calendar/operational-calendar.ts` y `src/lib/calendar/nager-date-holidays.ts`; los consumers de Payroll y otros dominios deben depender de esa capa, no de helpers locales

Fuente externa recomendada para feriados:

- la timezone base sigue saliendo de la librería IANA del runtime, no de una API de mercado
- para feriados nacionales, la fuente pública de mercado recomendada es `Nager.Date`
- `Nager.Date` cubre Chile (`CL`) y expone holidays por año/país vía REST
- endpoint canónico de consulta: `GET https://date.nager.at/api/v3/PublicHolidays/{Year}/{CountryCode}`
- si la política requiere excepciones locales o feriados corporativos, esos overrides deben persistirse en Greenhouse encima de la fuente externa, no en el consumer
- si en algún país la cobertura externa resulta insuficiente, la policy local de Greenhouse debe poder sobreescribirla sin romper la utilidad pura

Regla operativa:

- la lógica temporal canónica debe vivir en una utilidad pura compartida
- los cambios de configuración de calendario solo justifican persistencia reactiva si existe una entidad editable real; el cálculo de fecha no debe publicar outbox events por sí mismo
- Payroll debe consumir esta política como lectura de dominio, no como lógica local embebida en la vista

Consumer map:

- consumidores directos actuales: `current-payroll-period`, `payroll-readiness`, `approve/readiness routes`, `PayrollDashboard`, `PayrollPeriodTab`, `PayrollHistoryTab`, `MyPayrollView`, `PersonPayrollTab`, `PayrollPersonnelExpenseTab` y `ProjectedPayrollView`
- no hay consumidores directos fuera de Payroll en el runtime actual; otros módulos leen derivados de nómina, no la policy temporal
- si otro dominio necesita la misma regla, debe importar la utilidad compartida y no copiar la lógica de negocio

Potential cross-domain candidates:

- `ICO`, si alguna métrica o bono necesita cierre mensual o ventana de corte por jurisdicción
- `Finance`, si algún snapshot, cierre o reporting mensual debe respetar días hábiles y timezone operativo
- `Campaigns`, solo si su operación introduce ciclos de cierre mensuales reales
- `Cost Intelligence`, si materializa snapshots o cierres por período que deban alinearse con la ventana operativa

Non-fit modules:

- módulos sin concepto de cierre mensual ni ventana de aprobación no deberían depender de esta policy por defecto
- si un módulo solo necesita una fecha de calendario civil simple, no debe cargar la complejidad de la policy operativa

## 2.8. Leave, vacations and payroll impact contract

`Leave` y `Payroll` comparten el mismo calendario operativo canónico, pero no el mismo ownership transaccional.

Regla arquitectónica:

- `leave` vive en `greenhouse_hr`
- `payroll` vive en `greenhouse_payroll`
- el puente entre ambos no es una tabla compartida mutable, sino:
  - calendario operativo común
  - lectura de licencias aprobadas por período
  - eventos de outbox semánticos cuando una licencia cambia

Source of truth de permisos:

- `greenhouse_hr.leave_types`
- `greenhouse_hr.leave_policies`
- `greenhouse_hr.leave_balances`
- `greenhouse_hr.leave_requests`
- `greenhouse_hr.leave_request_actions`
- serving views:
  - `greenhouse_serving.member_leave_360`
  - `greenhouse_serving.person_hr_360`

Regla para vacaciones:

- la persona solicita vacaciones por rango de fechas, no por “cantidad manual” de días
- el sistema deriva los días hábiles desde `src/lib/calendar/operational-calendar.ts`
- la capa de feriados usa `src/lib/calendar/nager-date-holidays.ts` con `Nager.Date` + overrides locales persistidos
- no se cuentan fines de semana ni feriados
- la timezone canónica sigue siendo `America/Santiago`
- el saldo se valida contra `leave_policies` y `leave_balances`, incluyendo carry-over, progressive extra days y ajustes

Regla de producto para self-service y HR:

- `/my/leave` es la superficie personal de saldo, historial y calendario
- `/hr/leave` es la superficie operativa de revisión, saldos y calendario del equipo
- ambas surfaces deben consumir el mismo runtime canónico de leave, no helpers paralelos ni cálculos locales en la UI

Regla de captura de `hire_date`:

- `hire_date` sí afecta el dominio de vacaciones por antigüedad/progresivos
- mientras `HR profile` no tenga cutover formal a PostgreSQL, la edición operativa de `hire_date` permanece en el carril HR legacy:
  - write path: `PATCH /api/hr/core/members/[memberId]/profile`
  - persistencia actual: `greenhouse.team_members.hire_date` en BigQuery
- `greenhouse_core.members.hire_date` puede existir como proyección o snapshot canónico de consumo, pero no debe reemplazar el write path operativo antes del cutover explícito del módulo
- no mover esta edición a `Postgres-first` por simetría con `leave` o `payroll`; aquí prevalece el ownership operativo actual de `HR profile`

Contrato de eventos:

- `leave_request.created`
- `leave_request.escalated_to_hr`
- `leave_request.approved`
- `leave_request.rejected`
- `leave_request.cancelled`
- `leave_request.payroll_impact_detected`

Regla de impacto en nómina:

- cuando una licencia aprobada, rechazada o cancelada toca un período existente de nómina, el sistema debe detectarlo
- si el período aún no está exportado, la proyección reactiva `leave_payroll_recalculation` puede recalcular la nómina oficial
- si el período ya está exportado, no se debe mutar automáticamente; el sistema solo alerta a Payroll/Finance para ajuste controlado
- costos, finanzas, providers y tooling no consumen `leave_request.*` directo como source of truth económico
- el carril canónico es `leave -> payroll -> projections downstream`

### 2.8.1. Leave runtime rules currently enforced

Estas son las reglas observables del runtime real al `2026-03-31`.

Resolución de policy:

- el sistema primero resuelve `leave_type`
- luego selecciona la `leave_policy` aplicable según:
  - `employment_type`
  - `pay_regime`
- si no existe match exacto, usa una policy default derivada del `leave_type`

Cálculo de días:

- el usuario selecciona `startDate` y `endDate`
- si `endDate < startDate`, la solicitud falla
- los días no se toman del cliente como source of truth; se recalculan server-side
- solo cuentan días hábiles:
  - excluye fines de semana
  - excluye feriados nacionales
  - timezone canónica: `America/Santiago`
- si el rango no contiene días hábiles pagables, la solicitud falla

Validaciones al crear una solicitud:

- no puede existir overlap con otra solicitud activa del mismo colaborador
- si el tipo requiere attachment, debe venir `attachmentUrl`
- si la policy define `minAdvanceDays`, se exige esa anticipación en días calendario contra la fecha operativa de hoy
- si la policy define `minContinuousDays`, la solicitud debe cubrir al menos esa cantidad de días hábiles
- si la policy define `maxConsecutiveDays`, la solicitud no puede exceder ese tope
- si la licencia trackea balance y la policy no permite saldo negativo, cada año afectado debe tener saldo suficiente

Semántica de balance:

- el seed anual se arma por `member_id + leave_type_code + year`
- `availableDays` se calcula como:
  - `allowance_days`
  - `+ progressive_extra_days`
  - `+ carried_over_days`
  - `+ adjustment_days`
  - `- used_days`
  - `- reserved_days`
- al crear una solicitud pendiente, el sistema reserva días
- al aprobarla en HR, libera reserva y mueve esos días a usados
- al rechazar o cancelar, revierte la reserva

Carry-over y progresivos:

- `carry-over` se limita por `maxCarryOverDays`
- `progressive_extra_days` solo se calcula cuando la policy lo habilita
- hoy el cálculo progresivo usa:
  - `hire_date`
  - `prior_work_years`
  - `progressive_base_years`
  - `progressive_interval_years`
  - `progressive_max_extra_days`
- para vacaciones Chile, esa lógica se aplica sobre `pay_regime = 'chile'`

Flujo de aprobación:

- si existe supervisor, una solicitud nueva entra como `pending_supervisor`
- si no existe supervisor, entra directo como `pending_hr`
- supervisor no-HR:
  - puede aprobar hacia `pending_hr`
  - puede rechazar
- HR:
  - puede aprobar
  - puede rechazar
- el solicitante puede cancelar solo solicitudes todavía pendientes
- solicitudes ya cerradas no pueden volver a revisarse como si siguieran pendientes

Reglas base seed observables por tipo:

- `vacation`
  - policy Chile dependientes:
    - `annual_days = 15`
    - `max_carry_over_days = 5`
    - `min_advance_days = 7`
    - `max_consecutive_days = 15`
    - `min_continuous_days = 5`
    - `max_accumulation_periods = 2`
    - `progressive_enabled = true`
    - `applicable_employment_types = ['full_time']`
    - `applicable_pay_regimes = ['chile']`
    - `allow_negative_balance = false`
  - policy default portal:
    - `annual_days = 15`
    - `min_advance_days = 7`
    - `max_consecutive_days = 15`
    - `min_continuous_days = 5`
    - `allow_negative_balance = false`
- `floating_holiday`
  - `annual_days = 1`
  - `min_advance_days = 2`
  - `max_consecutive_days = 1`
  - `min_continuous_days = 1`
- `bereavement`
  - `annual_days = 3`
  - `min_advance_days = 0`
  - `max_consecutive_days = 3`
  - `min_continuous_days = 1`
- `civic_duty`
  - `annual_days = 2`
  - `min_advance_days = 0`
  - `max_consecutive_days = 2`
  - `min_continuous_days = 1`
- `study`
  - `min_advance_days = 1.5` (36h habiles de anticipacion)
  - `allow_negative_balance = true`
- `personal`
  - `min_advance_days = 1`
  - `allow_negative_balance = true`
- `unpaid`
  - `min_advance_days = 2` (48h habiles de anticipacion)
  - `allow_negative_balance = true`
- `medical`
  - `min_advance_days = 0`
  - `allow_negative_balance = true`
  - hoy el seed no exige attachment por defecto; si negocio quiere licencia médica con respaldo obligatorio, eso debe expresarse en `leave_types`/`leave_policies`

Implicación funcional importante:

- tener saldo disponible no implica aprobación automática
- una solicitud puede fallar por policy aunque el saldo exista
- ejemplo vigente: vacaciones con saldo disponible igual fallan si se intentan pedir con menos de `7` días de anticipación

## 3. Superficies oficiales

### Rutas UI
- `/hr/payroll`
- `/hr/payroll/projected`
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
- `POST /api/hr/payroll/periods/[periodId]/close`
- `GET /api/hr/payroll/periods/[periodId]/csv`
- `GET /api/hr/payroll/periods/[periodId]/export`
- `GET /api/hr/payroll/projected`
- `POST /api/hr/payroll/projected/promote`
- `GET /api/cron/payroll-auto-calculate`
- `PATCH /api/hr/payroll/entries/[entryId]`
- `GET /api/hr/payroll/entries/[entryId]/receipt`
- `GET /api/hr/payroll/members/[memberId]/history`
- `GET /api/hr/payroll/personnel-expense`

### Downstream receipts

La entrega de recibos es parte del contrato downstream de Payroll:

- los recibos individuales se registran en `greenhouse_payroll.payroll_receipts`
- la proyección `payroll_receipts_delivery` reacciona a `payroll_period.exported`
- `My Nómina` y `People > Nómina` consumen el mismo contrato de descarga/visualización de recibos
- `period.pdf` y `period.excel` siguen siendo exports de período, distintos al recibo individual por entry

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
- `rpa_full_payout_threshold`
- `rpa_soft_band_end`
- `rpa_soft_band_floor_factor`
- `effective_from`

Regla:
- los montos máximos de bono son por colaborador
- los thresholds de calificación siguen siendo globales por vigencia
- la policy de payout de `RpA` puede usar bandas suaves versionadas; no debe quedar hardcodeada solo en `bonus-proration.ts`
- los campos mínimos históricos (`bonusOtdMin`, `bonusRpaMin`) no deben bloquear el cierre del período cuando el payout calculado ya cumple la policy vigente; la aprobación debe validar contra el máximo permitido y la elegibilidad, no contra pisos legacy que quedaron como metadata

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

La aprobación solo puede avanzar cuando el período está `calculated` y cumple el readiness canónico; los warnings informativos no bloquean, pero los issues bloqueantes sí.

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
- baseline vigente:
  - `otd_floor = 70`
  - `otd_threshold = 89`

### `RpA`
- si queda en o bajo `rpa_full_payout_threshold`, paga 100% del bono máximo
- si cae entre `rpa_full_payout_threshold` y `rpa_soft_band_end`, baja suavemente desde 100% hasta el factor piso configurado
- si cae entre `rpa_soft_band_end` y `rpa_threshold`, baja desde el factor piso configurado hasta 0
- si llega o supera `rpa_threshold`, paga 0

### Ownership
- el monto máximo pertenece a la compensación del colaborador
- la regla de elegibilidad pertenece a `payroll_bonus_config`
- la selección de config debe resolverse por fecha del período imputable para preservar recálculo histórico correcto

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

Semántica adicional de licencias:

- `days_on_leave` representa días de licencia aprobada dentro del período
- `days_on_unpaid_leave` representa la porción sin goce de sueldo o equivalente no pagado
- `vacaciones` y otras licencias pagadas pueden reducir presencia efectiva sin necesariamente reducir base imponible del mismo modo que una ausencia no pagada
- la clasificación de impacto debe salir del dominio `leave` y de la policy asociada al tipo de permiso, no de heurísticas en el cálculo de nómina

Regla de recalculo:

- si cambia una licencia que ya intersecta un período creado/calculado/aprobado, la señal nace en `leave_request.payroll_impact_detected`
- Payroll decide si recalcula automáticamente o deja solo alerta operativa según el estado del período
- `exported` sigue siendo lock final y no debe recibir recálculo automático desde `leave`

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
- el cambio a `exported` debe publicarse como evento outbox canónico `payroll_period.exported`
- el path transaccional canonico de exportación es PostgreSQL; los consumers reactivos deben escuchar ese evento y no depender de side effects del archivo exportado
- el cierre canónico debe poder completarse sin que el usuario descargue el CSV
- cualquier correo downstream a Finance/HR debe dispararse desde `payroll_period.exported`, no desde el click de descarga
- la descarga del CSV es un artefacto opcional; puede convivir con el cierre, pero no define el cierre
- el período exportado puede persistir un paquete documental canónico en GCS (`payroll-export-packages/`) con PDF y CSV reutilizables
- `Reenviar correo` reutiliza ese paquete persistido y no vuelve a cerrar ni reexportar el período
- PDF/CSV deben seguir siendo descargables desde artefactos persistidos; si faltan, pueden regenerarse como fallback operativo

### Semántica operativa
`exported` representa el cierre final del ciclo mensual.

### Entrega de notificaciones
- al cerrar un período desde la UI o la API, el backend intenta publicar el outbox pendiente y procesar de forma inmediata el dominio `notifications`
- ese flush inmediato es best-effort y no reemplaza al cron de outbox/reactive, que sigue siendo safety net operativo
- la notificación downstream a Finance/HR y la entrega de recibos siguen saliendo de `payroll_period.exported`; lo inmediato solo reduce la dependencia del scheduler en staging/operación interactiva
- el paquete documental del cierre se persiste de forma reutilizable para que reenvíos y descargas no dependan de regenerar desde cero en cada click

### Email de cierre — contrato de contenido

El email `PayrollExportReadyEmail` que se envía a Finance y HR al cerrar un período sigue este contrato:

- **Subject**: `Nómina cerrada — {Mes Año} · {N} colaboradores` (100% español, headcount en inbox)
- **Desglose por régimen/moneda**: cada régimen (Chile CLP, Internacional USD) muestra su bruto y neto por separado — no se consolida cross-currency
- **Neto total display**: concatenación de netos por moneda con `+` (ej. `$595.657 + US$2,696.27`)
- **Adjuntos descritos**: el email incluye sección explícita "Adjuntos incluidos" con el propósito de cada archivo (PDF = reporte imprimible, CSV = desglose para contabilidad)
- **Metadata operativa**: quién exportó + timestamp
- **Plain text profesional**: el fallback plain text tiene la misma calidad informativa que el HTML — secciones, desglose por régimen, adjuntos, metadata y link al portal
- **Interfaz `CurrencyBreakdown`**: tipo exportado desde el template, reutilizable por otros consumers

Archivos runtime del email:
- `src/emails/PayrollExportReadyEmail.tsx` — template React Email
- `src/lib/payroll/payroll-export-packages.ts` — lógica de envío, `buildBreakdowns()`, `buildNetTotalDisplay()`
- `src/emails/constants.ts` — colores, fuentes, URLs compartidas

## 16. Moneda y períodos mixtos

`Payroll` soporta colaboradores `Chile` en `CLP` e internacionales en `USD` dentro del mismo período imputable.

### Regla canónica
- la moneda vive por `payroll_entry`, no por período
- un período puede contener entries `CLP`, `USD` o ambas
- no se debe consolidar un período mixto en una sola moneda por conveniencia visual o de reporting

### Implicaciones UI y reporting
- dashboards y KPIs del período deben mostrar subtotales por moneda cuando exista mezcla `CLP/USD`
- `Personnel Expense` debe agregar por moneda y no sumar cross-currency en una sola serie monetaria
- `CSV` puede seguir siendo plano por entry siempre que no prometa total consolidado cross-currency
- `PDF` y `Excel` deben preservar separación operativa `CLP/USD` en sus resúmenes

### Regla de compatibilidad
- si un consumer aguas abajo necesita consolidación cross-currency, esa conversión debe ocurrir explícitamente en otra capa con tipo de cambio y fecha, no dentro de `Payroll`

## 17. Cálculo Chile y prerequisitos bloqueantes

Para entries con `pay_regime = chile`, el cálculo mensual debe usar snapshots históricos reproducibles del período imputable.

### Insumos obligatorios
- `UF` histórica del período cuando exista plan `Isapre` en `UF`
- `tax_table_version` del período para impuesto mensual Chile
- `UTM` histórica del período cuando se calcule impuesto con tabla tributaria

### Regla de bloqueo
- si falta `UF` y la entry la requiere para `Isapre`, el período no está listo para calcular
- si el período incluye colaboradores `Chile` y falta `tax_table_version`, el cálculo debe bloquearse
- si el período incluye colaboradores `Chile`, existe `tax_table_version` y no se puede resolver `UTM`, el cálculo debe bloquearse
- el sistema no debe degradar silenciosamente `chileTaxAmount` a `0` en esos casos

### Fricción operativa esperada
- la UI de creación de período puede capturar `tax_table_version` desde el alta
- `UF` debe seguir autohidratándose desde indicadores económicos según `year/month`

## 18. Consumers aguas abajo

### People 360
- la ficha oficial del colaborador se ve en `/people/[memberId]?tab=payroll`
- Payroll expone historial y contexto, pero People es la superficie humana unificada

### Finance
- `Finance` puede descubrir candidates de gasto de nómina desde entries aprobadas/exportadas
- el linkage `payroll_entry_id -> member_id` permite anclar gasto de personal al colaborador
- el gasto final del período debe consolidarse al entrar en `exported`; `approved` sigue siendo una etapa operativa previa al cierre

### Reporting
- `Gasto de personal` agrega períodos `approved/exported`
- `member_payroll_360` y reports agregados consumen snapshots ya calculados

## 19. Permisos y acceso

Roles con acceso típico al módulo:
- `hr_payroll`
- `hr_manager`
- `efeonce_admin`

Regla:
- el módulo es una superficie `hr`
- el colaborador no usa `/hr/payroll` para self-service; su vista personal debe entrar por `People` o por surfaces personales futuras

## 20. No-goals

`Payroll` no debe:
- administrar roster base de team members
- reconstruir KPI delivery en request time cuando ICO ya puede resolverlos
- usar email como FK primaria
- depender de exports para representar el estado real de un cálculo
- duplicar ficha individual de persona fuera de People 360

## 21. Archivos runtime clave

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
- `src/lib/payroll/close-payroll-period.ts`
- `src/lib/payroll/send-payroll-export-ready.ts`
- `src/lib/payroll/personnel-expense.ts`
- `src/lib/payroll/period-lifecycle.ts`
- `src/lib/payroll/compensation-versioning.ts`
- `src/lib/payroll/payroll-readiness.ts`

### Schema
- `scripts/setup-postgres-payroll.sql`

## 22. Reglas canónicas resumidas

- `member_id` es la ancla de colaborador para Payroll.
- La compensación es versionada por vigencia, no mensual.
- El período representa mes imputable, no mes de pago.
- `approved` sigue siendo editable; `exported` es el cierre final.
- `payroll_period.exported` es el evento canónico de cierre/exportación.
- el email downstream de cierre a Finance/HR nace de `payroll_period.exported` y puede adjuntar CSV/PDF o enlazar artefactos seguros
- `GET /api/hr/payroll/periods/[periodId]/export` permanece como descarga de CSV por compatibilidad; el cierre canónico vive en `POST /api/hr/payroll/periods/[periodId]/close`
- `GET /api/hr/payroll/periods/[periodId]/csv` es la ruta explícita de descarga del CSV
- Los KPI mensuales de `Payroll` vienen desde `ICO`.
- La moneda vive por entry; los períodos mixtos `CLP/USD` no se consolidan implícitamente.
- `UF`, `tax_table_version` y `UTM` son prerequisitos bloqueantes cuando el cálculo Chile los requiere.
- `payroll_entries` son snapshots congelados del cálculo mensual.
- People 360 es la ficha individual oficial del colaborador.

## 23. Payroll Chile previsional foundation

- La fuente canónica mensual para indicadores previsionales y tabla de impuesto único es la API pública de Gael Cloud:
  - `GET /general/public/previred/{periodo}`
  - `GET /general/public/impunico/{periodo}`
- `src/lib/payroll/previred-sync.ts` materializa esos datos en:
  - `greenhouse_payroll.chile_previred_indicators`
  - `greenhouse_payroll.chile_afp_rates`
  - `greenhouse_payroll.chile_tax_brackets`
- El cron `GET /api/cron/sync-previred` y el backfill `pnpm backfill:chile-previsional` son los mecanismos operativos para mantener la base previsional viva.
- `ImpUnico` se convierte a UTM usando la UTM del mismo período para preservar el contrato de `greenhouse_payroll.chile_tax_brackets`.

## 24. Reverse payroll engine (gross from net)

### Concepto

El motor reverse resuelve el sueldo base dado un **líquido deseado** — el monto contractual neto que el empleador acuerda con el colaborador, antes de deducciones voluntarias (Isapre, APV).

### Regla de negocio Chile

- **Líquido deseado** = neto después de descuentos legales obligatorios: AFP (cotización + comisión), salud 7% (Fonasa), cesantía, impuesto único.
- **Líquido a pagar** = líquido deseado − excedente Isapre − APV. Varía mensualmente por ausencias, bonos variables, cambio de tasas.
- El excedente Isapre (plan pactado − 7% obligatorio) es una **deducción voluntaria** del trabajador. No afecta el cálculo del sueldo base.
- El **piso IMM** (Ingreso Mínimo Mensual) es el límite inferior del binary search. El motor nunca calcula un base inferior al mínimo legal.
- La **tasa AFP** se resuelve desde Previred para el período, no desde la tasa almacenada en la compensación.

### Algoritmo

- `computeGrossFromNet()` en `src/lib/payroll/reverse-payroll.ts`
- Binary search sobre `baseSalary` envolviendo el forward engine real (`calculatePayrollTotals` + `computeChileTax`)
- Convergencia garantizada en ~24 iteraciones con tolerancia de ±$1 CLP
- `minBaseSalary` = IMM (piso legal)
- `clampedAtFloor` = true cuando el líquido deseado requiere base ≤ IMM

### Persistencia

- `desired_net_clp` se persiste en `compensation_versions` como el acuerdo contractual
- Compensaciones legacy sin `desired_net_clp` se manejan con el campo vacío
- El `changeReason` incluye automáticamente `[Líquido deseado: $X]` cuando se guarda desde reverse

### Superficie

- `POST /api/hr/payroll/compensation/reverse-quote` — API que resuelve indicadores (UF, UTM, IMM, AFP Previred, tax brackets) y ejecuta el reverse
- `CompensationDrawer` — para régimen Chile, el líquido deseado es siempre el campo principal (no hay modo manual). Para internacional, salary base directo.

### Preview

El drawer muestra un desglose en tiempo real con tres secciones semánticas:
- **Haberes** (fondo neutro): sueldo base calculado, gratificación legal, colación, movilización, total haberes
- **Descuentos legales** (fondo error.lighterOpacity): AFP, salud 7%, cesantía, impuesto, total descuentos
- **Resultado** (fondo primary.lighterOpacity): líquido deseado, excedente Isapre, líquido a pagar, costo empleador

## 25. Receipt PDF branding and template versioning

### Branding

Los recibos individuales y reportes de período se generan con `@react-pdf/renderer` y llevan la identidad visual de Efeonce:

- **Logo**: `public/branding/logo-full.png` (PNG 420×98, convertido desde SVG porque `@react-pdf/renderer` Image no soporta SVG)
- **Paleta**: azul corporativo `#023c70`, fondo light `#F7F9FC`, accent `#E8EFF7`
- **Identidad legal**: razón social, RUT y dirección desde `getOperatingEntityIdentity()` (server) o `useOperatingEntity()` (client)

### Layout del recibo individual

```
┌──────────────────────────────────────────────────┐
│ [Logo PNG]                          Marzo 2026   │
│ ▌ Efeonce Group SpA           Recibo de remun.   │
│ ▌ RUT 77.357.182-1                   2026-03     │
│ ▌ Dr. Manuel Barros Borgoño...                   │
├──────────────── accent line ─────────────────────┤
│        RECIBO DE REMUNERACIONES                  │
│ ┌───────────── employee box (#F7F9FC) ─────────┐ │
│ │ NOMBRE         EMAIL                         │ │
│ │ RÉGIMEN        MONEDA                        │ │
│ └──────────────────────────────────────────────┘ │
│ ▌ HABERES           (zebra rows, right-aligned)  │
│ ─── Total bruto ─────────────────── accent bg ── │
│ ▌ ASISTENCIA                                     │
│ ▌ DESCUENTOS LEGALES                             │
│ ─── Total descuentos ───────────── accent bg ──  │
│ ▓▓▓▓▓ Líquido a pagar    $XXX ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
├──────────────────────────────────────────────────┤
│ Efeonce Group SpA  ·  efeoncepro.com  ·  Gen:.. │
└──────────────────────────────────────────────────┘
```

Componentes compartidos:
- `PdfHeader` — logo + bloque legal con accent bar izquierdo + período derecho
- `PdfFooter` — tres columnas: razón social | efeoncepro.com | fecha generación
- `SectionHeader` — accent bar vertical 3pt + título uppercase letter-spaced

### Template versioning y lazy cache invalidation

Los PDFs de recibos se almacenan en GCS (`gs://efeonce-group-greenhouse-media/payroll-receipts/`). Cuando el template cambia, los PDFs cacheados quedan stale.

**Mecanismo:**
1. `RECEIPT_TEMPLATE_VERSION` (constante en `generate-payroll-pdf.tsx`) se bumpa con cada cambio de template
2. `template_version` (columna en `payroll_receipts`) registra la versión que generó cada PDF
3. Al servir un recibo, la route compara `storedReceipt.templateVersion` vs `RECEIPT_TEMPLATE_VERSION`:
   - **Match** → serve desde GCS (fast path, ~100ms)
   - **Mismatch o NULL** → regenera PDF → sube a GCS → actualiza record → serve fresh
4. El update es non-fatal: si falla el upload/update, el PDF se sirve igualmente (regenerado on-demand)

**Flujo:**
```
GET /api/hr/payroll/entries/:id/receipt
  → fetch storedReceipt
  → storedReceipt.templateVersion === RECEIPT_TEMPLATE_VERSION?
     ✅ → downloadGreenhouseMediaAsset() → serve
     ❌ → generatePayrollReceiptPdf()
          → uploadGreenhouseStorageObject() (replace in GCS)
          → updateReceiptAfterRegeneration() (stamp new version)
          → serve buffer
```

Ambas rutas (`/api/hr/payroll/entries/[entryId]/receipt` y `/api/my/payroll/entries/[entryId]/receipt`) implementan el mismo patrón.

**Regla operativa:**
- Todo cambio visual al PDF (colores, layout, campos, logo) requiere bump de `RECEIPT_TEMPLATE_VERSION`
- La regeneración es lazy — no necesita batch job ni migration de datos
- Nuevos recibos generados por el pipeline batch (`generate-payroll-receipts.ts`) ya stamplan la versión actual

### Archivos runtime

| Archivo | Rol |
|---|---|
| `src/lib/payroll/generate-payroll-pdf.tsx` | Templates de PDF (recibo + reporte), `RECEIPT_TEMPLATE_VERSION` |
| `src/lib/payroll/payroll-receipts-store.ts` | CRUD de registros de recibos, `updateReceiptAfterRegeneration()` |
| `src/lib/payroll/generate-payroll-receipts.ts` | Pipeline batch de generación + envío de recibos |
| `src/app/api/hr/payroll/entries/[entryId]/receipt/route.ts` | Ruta HR con lazy regeneration |
| `src/app/api/my/payroll/entries/[entryId]/receipt/route.ts` | Ruta My Payroll con lazy regeneration |
| `public/branding/logo-full.png` | Logo Efeonce (PNG, @react-pdf/renderer compatible) |
| `scripts/migrations/add-receipt-template-version.sql` | DDL para columna `template_version` |

### Archivos runtime

- `src/lib/payroll/reverse-payroll.ts` — motor `computeGrossFromNet()`
- `src/lib/payroll/reverse-payroll.test.ts` — 10 golden tests
- `src/app/api/hr/payroll/compensation/reverse-quote/route.ts` — API endpoint
- `src/views/greenhouse/payroll/CompensationDrawer.tsx` — UI drawer
- `scripts/migrations/add-compensation-desired-net-clp.sql` — migration

### Reglas canónicas

- Para Chile, el líquido deseado es siempre el punto de partida de la compensación.
- El sueldo base es un resultado del reverse, no un input manual.
- El reverse calcula con descuentos legales solamente (7% salud, no Isapre).
- El IMM es un piso absoluto del cálculo, no una advertencia.
- El excedente Isapre se muestra pero no altera el sueldo base.
- Para internacional, el salary base es input directo (sin reverse).
