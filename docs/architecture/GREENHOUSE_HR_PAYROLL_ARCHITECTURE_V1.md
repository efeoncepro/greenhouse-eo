# GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md

## Delta 2026-05-01 — TASK-745: Payroll Adjustments Foundation V1

Se introduce el modelo canonico **event-sourced** para ajustar el pago de un entry en una nomina puntual: tabla `greenhouse_payroll.payroll_adjustments` con 5 kinds (`exclude`, `gross_factor`, `gross_factor_per_component`, `fixed_deduction`, `manual_override`), composables ortogonalmente.

- **Inmutabilidad**: una vez `status='active'`, no se mutan columnas. Cambios crean rows nuevos en chain `superseded_by`.
- **Maker-checker**: env `PAYROLL_ADJUSTMENTS_REQUIRE_APPROVAL` controla si los ajustes nacen `pending_approval` o `active`. Capability `hr.payroll_adjustments_approval` aprueba.
- **Compliance Chile dependiente**: trigger DB `assert_chile_dependent_adjustment_compliance` rechaza `exclude` o `factor=0` para entries con `pay_regime='chile'` + contrato `indefinido|plazo_fijo` salvo motivos legales (`leave_unpaid`, `unauthorized_absence`, `termination_pending`).
- **Computacion**: `src/lib/payroll/adjustments/compute-net.ts` aplica adjustments en orden canonico: `exclude` (corto) → `gross_factor` (multiplicativo) → recompute SII honorarios + previsional Chile sobre bruto efectivo → `fixed_deduction` resta del neto → `manual_override` gana sobre todo. Pure, idempotente, 19 tests.
- **Wire en calculate-payroll**: `applyAdjustmentsToEntry` corre post-bruto-natural y pre-persistencia. Override `grossTotal`, `netTotal`, `siiRetentionAmount`, `chileTotalDeductions`. Primera calc no tiene adjustments (entry_id no existe); recalcs subsecuentes los aplican.
- **Reliquidacion (TASK-409)**: en `supersedePayrollEntryOnRecalculate` case A (primera supersession), `cloneActiveAdjustmentsToV2` clona los adjustments del v1 al v2 con `source_kind='reliquidation_clone'` para preservar la intencion del operador.
- **Outbox**: 3 events nuevos `payroll.adjustment.{created,approved,reverted}` con `aggregate_type='payroll_adjustment'`, payload incluye `kind`, `payloadSnapshot`, `sourceKind`, `sourceRef`. Finance projection consume para recompute de gasto de personal.
- **API**: `POST/GET /api/hr/payroll/entries/[entryId]/adjustments`, `POST .../[adjustmentId]/approve|revert`. Permisos: `hr.payroll_adjustments` (crear/revertir), `hr.payroll_adjustments_approval` (aprobar).
- **UI**: `PayrollEntryAdjustDialog` (3 modos radio + descuento adicional + dropdown motivo + nota + preview neto en vivo) y `PayrollAdjustmentHistoryDrawer` (historial activo + revertido + superseded por entry, con acciones approve/revert).

**Reglas duras**:

- **NUNCA** computar neto fuera de `computePayrollEntryNet` cuando hay adjustments — perder la lectura del trigger compliance, del audit chain o del outbox event.
- **NUNCA** mutar `payroll_adjustments` rows con `status='active'`. Reverter via `status='reverted'` + nuevo row.
- **NUNCA** crear adjustments en periodo `exported` salvo via reopen flow + `cloneActiveAdjustmentsToV2`.
- **NUNCA** loggear `payload` raw del adjustment en logs externos: puede contener datos del colaborador + motivos sensibles.
- Cuando emerja TASK-746 (schedules + Finance ledger), los adjustments con `source_kind='recurring_schedule'` se materializan via cron sobre la misma tabla.

Spec funcional: `docs/documentation/hr/ajustes-de-pago-en-nomina.md`. Manual operativo: `docs/manual-de-uso/hr/ajustar-pago-de-nomina.md`. Task: `docs/tasks/in-progress/TASK-745-payroll-adjustments-foundation.md`.

## Delta 2026-05-01 — TASK-744: hard boundary de regímenes Payroll

Payroll ahora materializa `contract_type_snapshot` en `greenhouse_payroll.payroll_entries` para que la entry calculada preserve el régimen usado en el cálculo y la base de datos pueda proteger nuevas escrituras incompatibles.

Reglas canónicas:

- `honorarios` usa retención SII del año de emisión. Para 2026 la tasa oficial es `15,25%`.
- `honorarios` no puede materializar AFP, salud, Seguro de Cesantía, SIS, mutual, APV ni IUSC de trabajador dependiente. Si una ruta intenta recalcularlo como Chile dependiente, el helper falla cerrado.
- `payRegime = international` o `payrollVia = deel` no puede materializar retención SII ni campos estatutarios Chile. Greenhouse registra el snapshot operativo y los bonos KPI, pero Deel/proveedor sigue siendo owner de payroll legal.
- Seguro de Cesantía separa tasa trabajador y empleador: `indefinido` trabajador `0,6%` / empleador `2,4%`; `plazo_fijo` trabajador `0%` / empleador `3%`.
- Las bases previsionales Chile dependiente separan `imponibleBase`, base AFP/salud/SIS/mutual con tope AFP, y base cesantía con tope cesantía cuando los topes PREVIRED existen para el período.
- Readiness bloquea aprobación/export si detecta entries ya calculadas que mezclan regímenes incompatibles. En períodos no exportados, la salida operativa es recalcular limpio; en períodos exportados, usar reapertura/reliquidación formal.

Guardrail operativo vigente: Melkin Hernández, Daniela Ferreira y Andrés Carlosama son internacionales/Deel. No se les aplica payroll estatutario Chile, pero siguen requiriendo KPI ICO cuando su compensación tiene bono OTD/RpA.

## Delta 2026-04-18 — TASK-468: Payroll contract_type sigue aislado; commercial resuelve por bridge externo

- `greenhouse_payroll.compensation_versions.contract_type` mantiene su semántica actual como snapshot factual de compensación; no recibe FK ni rewrite desde el programa comercial de pricing.
- Regla explícita para integraciones cross-domain:
  - si commercial necesita mapear `contract_type` a un catálogo canónico (`employment_types`), debe hacerlo fuera de payroll, mediante tabla de aliases y readers read-only
  - payroll expone datos de referencia (`chile_afp_rates`, `chile_previred_indicators`, `chile_tax_brackets`) solo por consumo `SELECT`; no existe sincronización bidireccional automática con commercial en este corte
- Artefactos nuevos del bridge, del lado commercial:
  - `greenhouse_commercial.employment_type_aliases`
  - `src/lib/commercial/payroll-rates-bridge.ts`
  - `scripts/audit-payroll-contract-types.ts`
- Guardrail operativo confirmado:
  - baseline regression gate: `29` files / `194` tests payroll passing
  - `TASK-468` no modifica `src/lib/payroll/**` ni `greenhouse_payroll.*`

## Delta 2026-04-15 — TASK-409: Reliquidación de nómina — spec técnica completa

### Correcciones a §9 (Lifecycle del período)

- **Ventana de reapertura**: ya no depende de `getOperationalPayrollMonth`. La guarda ahora mide **días transcurridos desde `exported_at`** con una ventana configurable vía `PAYROLL_REOPEN_WINDOW_DAYS` (default 45 días). Esto desacopla la reapertura del mes operativo vigente y permite reliquidar períodos antiguos dentro de la ventana.
  - Archivo: `src/lib/payroll/reopen-guards.ts:23` — `DEFAULT_REOPEN_WINDOW_DAYS = 45`
  - Override: `process.env.PAYROLL_REOPEN_WINDOW_DAYS`

- **Constraint `version <= 2`**: confirmado vigente en DB. Limita a una sola reliquidación por entry (v1→v2). Reliquidaciones múltiples (v3+) requieren ampliar el constraint y el supersede flow. Esto es scope de TASK-414 (Policy Engine).

### Spec técnica completa

La especificación técnica detallada de reliquidación vive en **§26. Reliquidación de nómina (TASK-409)** de este documento.

La documentación funcional (lenguaje simple, para operadores y stakeholders) vive en `docs/documentation/hr/reliquidacion-de-nomina.md`.

---

## Delta 2026-04-11 — Deel también usa conectividad como haber canónico de compensación

- `remoteAllowance` deja de leerse como un haber exclusivo de nómina Chile.
- Regla nueva:
  - para `contractor` y `eor` gestionados por Deel, Greenhouse también puede versionar conectividad en `compensation_versions.remote_allowance`
  - ese monto debe entrar al bruto/neto referencial que Greenhouse registra para la entry Deel
  - no debe forzarse a usar `fixedBonusLabel` / `fixedBonusAmount` como sustituto semántico de conectividad
- Límite del contrato:
  - Deel sigue siendo owner de pago final, compliance y contrato legal
  - Greenhouse sigue siendo owner del snapshot operativo de compensación y del cálculo de bonos KPI visibles en Payroll

## Delta 2026-04-11 — Payroll no agota la semántica de compensación ejecutiva

- `Payroll` sigue siendo owner de la nómina formal materializada sobre `member_id`.
- Regla nueva:
  - no toda compensación de una persona frente a la entidad legal debe nacer conceptualmente dentro de `Payroll`
  - Greenhouse debe distinguir entre:
    - `CompensationArrangement` como acuerdo de compensación persona ↔ entidad legal
    - `Payroll` como materialización formal cuando esa compensación corresponde a nómina
- Regla complementaria:
  - esto no cambia el ownership transaccional actual de `compensation_versions`, `payroll_periods` y `payroll_entries`
  - sí evita mezclar sueldo empresarial con cuenta corriente accionista o con la identidad del `member`
- Fuente canónica complementaria:
  - `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`

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
- `greenhouse_hr.leave_balance_adjustments`
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
- `leave_balance.adjusted`
- `leave_balance.adjustment_reversed`

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
  - `contract_type`
  - `pay_regime`
  - `payroll_via`
  - `hire_date` cuando la policy depende de antigüedad
- si no existe match exacto, usa una policy default derivada del `leave_type`
- para vacaciones, el explain administrativo debe distinguir al menos:
  - Chile interno laboral
  - honorarios
  - contractor
  - EOR / provider externo

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
- los ajustes administrativos no deben perderse como mutación opaca:
  - el ledger canónico vive en `greenhouse_hr.leave_balance_adjustments`
  - `leave_balances.adjustment_days` sigue siendo la proyección agregada visible

Operaciones administrativas:

- **backfill retroactivo con fechas reales**
  - reutiliza `greenhouse_hr.leave_requests`
  - debe persistirse con `source_kind = 'admin_backfill'`
  - se comporta como un permiso ya aprobado cargado por HR/admin
- **ajuste manual de saldo**
  - usa `greenhouse_hr.leave_balance_adjustments`
  - exige `reason`, `effective_date`, actor y timestamp
  - puede revertirse mediante un ajuste compensatorio con `source_kind = 'manual_adjustment_reversal'`

Contrato de actividad administrativa:

- el detalle operativo de `/hr/leave` compone una sola lectura administrativa a partir de dos fuentes distintas:
  - `leave_requests` con `source_kind = 'admin_backfill'`
  - `leave_balance_adjustments`
- ambos carriles deben verse juntos para auditoria operativa, pero no mezclarse semantica ni contablemente
- `admin_backfill` significa "periodo real ya tomado" y por eso incrementa `used_days`
- `leave_balance_adjustments` significa "correccion de saldo" y por eso proyecta sobre `adjustment_days`
- regla de producto: el estado vacio de ajustes no puede ocultar que existieron backfills; la UI debe distinguir ambos dentro de una misma seccion administrativa

Contrato de identidad visible:

- las lecturas de solicitudes y saldos deben exponer la misma identidad visible del colaborador
- contratos minimos:
  - `HrLeaveRequest.memberAvatarUrl`
  - `HrLeaveBalance.memberAvatarUrl`
- PostgreSQL debe priorizar `greenhouse_serving.person_360` para `resolved_display_name`, `resolved_email`, `resolved_avatar_url` y `user_id`
- si Person 360 no resuelve avatar, el fallback canónico es `greenhouse_core.members.avatar_url`
- cuando el avatar origen viene en formato `gs://`, la traduccion a URL consumible por UI debe centralizarse en `src/lib/person-360/resolve-avatar.ts`
- el `user_id` necesario para resolver `/api/media/users/<userId>/avatar` puede venir desde `person_360.user_id` o desde el ultimo `greenhouse_core.client_users` activo para ese `member_id`
- cualquier fallback legacy (incluido BigQuery) debe emitir el mismo contrato final para evitar divergencia visual entre requests y balances

Regla de surface operativa:

- `/my/leave` mantiene la vista personal de saldos e historial
- `/hr/leave` agrega una vista separada de saldos del equipo; no reemplaza la vista personal
- el detalle administrativo del equipo debe priorizar layout responsive por tarjetas o bloques metricos por tipo de permiso
- una tabla ancha con scroll horizontal no es el patron primario permitido para esta inspeccion operativa

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
- para la policy Chile interna (`policy-vacation-chile`), el seed del balance ya no debe tratar el primer año de servicio como `annual_fixed`:
  - mientras la persona no cumple su primer aniversario laboral, `allowance_days` se accrualiza desde `hire_date`
  - el runtime debe self-heal balances ya sembrados cuando la policy o el cálculo cambian, actualizando `allowance_days`, `progressive_extra_days`, `carried_over_days` y `accumulated_periods` por `ON CONFLICT DO UPDATE`

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
- `reopened` (TASK-409 / TASK-410 — reliquidación post-cierre)

### Semántica vigente
- `draft`: período creado o reabierto, sin cálculo vigente
- `calculated`: período calculado y revisable
- `approved`: listo para pago/revisión, todavía editable antes de exportar
- `exported`: cierre final operativo (pero ya no terminal — ver `reopened`)
- `reopened`: período re-abierto para reliquidación. Entries existentes quedan inmutables (v1, `is_active=false`), las nuevas ediciones crean v2 con `is_active=true` vinculada a una fila en `payroll_period_reopen_audit`. Desde `reopened` el flujo continúa como `reopened → calculated → approved → exported` (segunda vuelta).

### Regla importante
`approved` no es cierre final.

La aprobación solo puede avanzar cuando el período está `calculated` y cumple el readiness canónico; los warnings informativos no bloquean, pero los issues bloqueantes sí.

Si un período `approved`:
- se recalcula, o
- se edita una entry

entonces:
- vuelve a `calculated`
- debe aprobarse de nuevo antes de exportarse

### Candado final (actualizado por TASK-410)
Solo `exported` bloquea edición directa. La **única** ruta permitida para mutar un período exportado es invocar explícitamente el endpoint `POST /api/hr/payroll/periods/[periodId]/reopen` (gated por rol `efeonce_admin`), que:

- valida que el período es el **mes operativo vigente** (ventana temporal); meses anteriores requieren ajustes en el período actual, no reapertura histórica
- escribe una fila inmutable en `payroll_period_reopen_audit` con `reason`, `reason_detail`, `previred_declared_check`, `operational_month` y `previous_status`
- transiciona el período a `reopened` en una transacción atómica con `SELECT … FOR UPDATE NOWAIT` para bloquear exports concurrentes

Durante `reopened`:
- edición de entries está permitida pero **no muta v1 in-place** — `supersedePayrollEntryOnRecalculate` crea una fila v2 con `is_active=true` y marca v1 como `is_active=false`/`superseded_by=v2`, todo en la misma transacción
- el outbox emite `payroll_entry.reliquidated` con `deltaGross`/`deltaNet` pre-calculados
- el consumer reactivo `payroll_reliquidation_delta` (TASK-411) aplica **solo el delta** a `greenhouse_finance.expenses` como nuevo expense con `source_type='payroll_reliquidation'` + `reopen_audit_id`, preservando la expense primaria de v1 intacta
- la suma contable queda: `expense_primario_v1 + sum(deltas_v2..vN) = monto_final`

### Guardas de reopen (V1, actualizado 2026-04-15)
- Solo `status === 'exported'` puede reabrirse
- Ventana temporal = **45 días desde `exported_at`** (configurable vía `PAYROLL_REOPEN_WINDOW_DAYS`). Ya no depende del mes operativo vigente. La función `evaluateReopenWindow()` en `src/lib/payroll/reopen-guards.ts` mide días transcurridos y retorna `{ canReopen, daysRemaining, reason }`.
- `FOR UPDATE NOWAIT` bloquea reopens concurrentes con exports en curso
- Motivo obligatorio de taxonomía controlada: `error_calculo | bono_retroactivo | correccion_contractual | otro` (este último exige detalle)
- Constraint SQL `version <= 2` cierra V1 a una única reliquidación por entry. Reliquidaciones múltiples (v3+) quedan fuera de scope y requieren ampliar el constraint (TASK-414).

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
- Contrato actual de `greenhouse_payroll.chile_afp_rates`:
  - guarda `total_rate` por `period_year + period_month + afp_name`
  - no persiste `worker_rate` ni `employer_rate` en la tabla canónica desplegada
  - cuando existe un snapshot legacy `greenhouse_payroll.previred_afp_rates`, Payroll puede reutilizarlo como fallback técnico para recuperar el split histórico `worker_rate/total_rate`
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

## 25.b Receipt presentation contract (TASK-758, v4 desde 2026-05-04)

A partir de `RECEIPT_TEMPLATE_VERSION = '4'`, ambas surfaces de recibo individual (preview MUI `PayrollReceiptCard` y PDF `ReceiptDocument`) consumen el helper canónico **`buildReceiptPresentation`** desde `src/lib/payroll/receipt-presenter.ts`. Cero lógica de detección de régimen vive en los componentes — sólo render declarativo del struct.

### Detector canónico

```ts
resolveReceiptRegime(entry) →
  | 'chile_dependent'      // contractTypeSnapshot ∈ {indefinido, plazo_fijo}
  | 'honorarios'           // contractTypeSnapshot === 'honorarios'
  | 'international_deel'   // contractTypeSnapshot ∈ {contractor, eor} OR payrollVia === 'deel'
  | 'international_internal' // payRegime === 'international' sin Deel
```

Cascade:
1. **Primario**: `contractTypeSnapshot` (canónico, persistido por el motor).
2. **Fallback honorarios legacy**: `payRegime === 'chile' && siiRetentionAmount > 0`.
3. **Fallback Deel legacy**: `payrollVia === 'deel'`.
4. **Fallback international**: `payRegime === 'international'`.
5. **Default seguro**: `chile_dependent` (conservador para data corrupta).

### Exhaustiveness check

El switch de `buildReceiptPresentation` cierra con `const _exhaustive: never = regime`. Si emerge un nuevo `ContractType` y nadie agrega su rama, **TS rompe build**.

### Comportamiento canónico por régimen

| Régimen | Bloque deducción | InfoBlock canónico | Hero | Tipo de contrato |
| --- | --- | --- | --- | --- |
| `chile_dependent` | `Descuentos legales` (AFP split + salud obl/vol + cesantía + IUSC + APV + gratificación legal informativa) | — | `Líquido a pagar` | `CONTRACT_LABELS[indefinido / plazo_fijo].label` |
| `honorarios` | `Retención honorarios` (Tasa SII + Retención honorarios) | `Boleta de honorarios Chile · Art. 74 N°2 LIR · Tasa SII <year>` | `Líquido a pagar` | `Honorarios` |
| `international_deel` | (ninguno) | `Pago administrado por Deel` + `meta: deelContractId` cuando existe | `Monto bruto registrado` + footnote canónico | `Contractor (Deel)` / `EOR (Deel)` |
| `international_internal` | (ninguno) | `Régimen internacional · Sin descuentos previsionales Chile` | `Líquido a pagar` | `Internacional` |
| **`excluded` (terminal)** | (omitido) | `Excluido de esta nómina — <reasonLabel>` (variant `error`) | `Sin pago este período · $0` (degraded gris) | (mantiene contractTypeLabel) |

### Reglas duras de implementación (vinculantes)

- **NUNCA** ramificar render por `entry.payRegime === 'chile'` solo. Toda detección pasa por `resolveReceiptRegime`.
- **NUNCA** `font-family: monospace` en surfaces user-facing del recibo. Para `deelContractId` o IDs técnicos: `font-variant-numeric: tabular-nums` + `letter-spacing: 0.02em` sobre Geist Sans.
- **NUNCA** `font-feature-settings: 'tnum'`. Usar `font-variant-numeric: tabular-nums` (canónica V1).
- **NUNCA** `borderRadius` off-scale (3, 5, 7, 12). Usar tokens `customBorderRadius.{xs:2, sm:4, md:6, lg:8, xl:10}`.
- **NUNCA** color como única señal de estado. InfoBlock siempre lleva título + body explicativo.
- **NUNCA** lime `#6ec207` para texto sobre blanco (falla 4.5:1). Variante contrast-safe `#2E7D32` cuando emerja necesidad.
- Cada nuevo `ContractType` agregado en `src/types/hr-contracts.ts` requiere extender el switch de `buildReceiptPresentation` antes de mergear (defendido por exhaustiveness check).
- Mockup canónico vinculante: `docs/mockups/task-758-receipt-render-4-regimes.html`. Cualquier desviación visual requiere update + re-aprobación del mockup ANTES de mergear.

### Reusabilidad cross-task

- `resolveReceiptRegime` y `groupEntriesByRegime` son **exports públicos** consumidos por TASK-782 (`PeriodReportDocument` + `generate-payroll-excel.ts`) — single source of truth de clasificación de régimen across surfaces operador-facing.
- `RECEIPT_REGIME_BADGES` y `RECEIPT_REGIME_DISPLAY_ORDER` también exportados — mismo design system de badges en preview, PDF, period report y Excel.

### Archivos owned

| Archivo | Propósito |
|---|---|
| `src/lib/payroll/receipt-presenter.ts` | Helper canónico (puro, server-safe) |
| `src/lib/payroll/receipt-presenter.test.ts` | Tests matriz régimen × adjustments (46 tests) |
| `src/lib/payroll/generate-payroll-pdf.tsx` | `ReceiptDocument` consumer + `RECEIPT_TEMPLATE_VERSION = '4'` |
| `src/views/greenhouse/payroll/PayrollReceiptCard.tsx` | Preview MUI consumer |
| `src/views/greenhouse/payroll/PayrollReceiptCard.test.tsx` | Tests render (13 tests) |
| `src/views/greenhouse/payroll/ProjectedPayrollView.tsx` | Detector convergence (reusa `resolveReceiptRegime`) |
| `docs/mockups/task-758-receipt-render-4-regimes.html` | Mockup canónico vinculante |

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

## 26. Reliquidación de nómina (TASK-409)

Spec técnica completa del flujo de reliquidación implementado en TASK-409 (umbrella), TASK-410 (foundation), TASK-411 (finance delta consumer), TASK-412 (admin UI). Para la documentación funcional en lenguaje simple, ver `docs/documentation/hr/reliquidacion-de-nomina.md`.

### 26.1 Schema — entry versioning

Columnas agregadas a `greenhouse_payroll.payroll_entries`:

```sql
version          INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
is_active        BOOLEAN NOT NULL DEFAULT TRUE,
superseded_by    TEXT    REFERENCES greenhouse_payroll.payroll_entries(entry_id)
                         DEFERRABLE INITIALLY DEFERRED,
reopen_audit_id  TEXT    REFERENCES greenhouse_payroll.payroll_period_reopen_audit(audit_id)
```

Constraint de versión:

```sql
CHECK (version <= 2)  -- V1: una sola reliquidación por entry. TASK-414 amplía.
```

Partial unique index (garantiza una sola entry activa por (período, colaborador)):

```sql
CREATE UNIQUE INDEX payroll_entries_period_member_active_unique
  ON greenhouse_payroll.payroll_entries (period_id, member_id)
  WHERE is_active = TRUE;
```

Migración: `migrations/20260415182419195_payroll-reliquidation-foundation.sql`

### 26.2 Schema — reopen audit

Tabla inmutable `greenhouse_payroll.payroll_period_reopen_audit`:

```sql
CREATE TABLE greenhouse_payroll.payroll_period_reopen_audit (
  audit_id              TEXT PRIMARY KEY,
  period_id             TEXT NOT NULL REFERENCES greenhouse_payroll.payroll_periods(period_id),
  reopened_by           TEXT NOT NULL,
  reopened_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason                TEXT NOT NULL,  -- error_calculo | bono_retroactivo | correccion_contractual | otro
  reason_detail         TEXT,           -- obligatorio si reason = 'otro'
  previous_status       TEXT NOT NULL,
  operational_month     TEXT NOT NULL,
  previred_declared_check BOOLEAN NOT NULL DEFAULT FALSE,
  metadata              JSONB
);
```

Migración: misma que §26.1

### 26.3 Schema — finance link

FK desde `greenhouse_finance.expenses` al audit:

```sql
ALTER TABLE greenhouse_finance.expenses
  ADD COLUMN reopen_audit_id TEXT
  REFERENCES greenhouse_payroll.payroll_period_reopen_audit(audit_id);
```

Invariante de deduplicación para expenses generados por payroll:

```sql
CREATE UNIQUE INDEX finance_expenses_payroll_generated_unique
  ON greenhouse_finance.expenses (payroll_period_id, member_id, expense_type)
  WHERE source_type = 'payroll_generated'
    AND is_annulled = FALSE
    AND payroll_period_id IS NOT NULL
    AND member_id IS NOT NULL;
```

Migraciones:
- `migrations/20260415192102665_finance-expenses-reopen-audit-link.sql`
- `migrations/20260415215940253_finance-expenses-payroll-dedupe-invariant.sql`

### 26.4 Supersede transaction protocol

El versionamiento v1→v2 ocurre en una transacción con FK DEFERRABLE INITIALLY DEFERRED y 3 pasos ordenados:

```
Paso 1: UPDATE v1 SET is_active = FALSE
        (no se asigna superseded_by todavía — v2 no existe aún)

Paso 2: INSERT v2 con is_active = TRUE, version = 2, reopen_audit_id = audit.audit_id
        (v2 ahora existe con su entry_id generado)

Paso 3: UPDATE v1 SET superseded_by = v2.entry_id
        (FK apunta a un row que ya existe)
```

La FK `superseded_by` es `DEFERRABLE INITIALLY DEFERRED` para que el constraint se valide al COMMIT, no statement-by-statement. Esto permite que los 3 pasos corran dentro del mismo bloque sin violaciones intermedias.

Migración: `migrations/20260415210956965_payroll-supersede-fk-deferrable.sql`

Archivo: `src/lib/payroll/supersede-entry.ts`

### 26.5 Finance delta consumer (TASK-411)

Cuando una entry se reliquida, el outbox emite `payroll_entry.reliquidated` con:

```typescript
interface ReliquidationPayload {
  periodId: string
  memberId: string
  entryId: string          // v2 entry
  previousEntryId: string  // v1 entry
  deltaNet: number         // newNet - previousNet (dimensión operativa)
  deltaGross: number       // newGross - previousGross (solo para auditoría)
  previousNet: number
  newNet: number
  previousGross: number
  newGross: number
  currency: string
  reopenAuditId: string
  operationalMonth: string
}
```

El consumer reactivo `payroll_reliquidation_delta` (registrado con handler key `payroll_reliquidation_delta:payroll_entry.reliquidated`) invoca `applyPayrollReliquidationDelta()` que:

1. Crea un expense en `greenhouse_finance.expenses` con:
   - `source_type = 'payroll_reliquidation'`
   - `amount = deltaNet` (no deltaGross — en Chile el costo empresa es el líquido + cotizaciones patronales, no el bruto)
   - `reopen_audit_id = reopenAuditId` (link al audit trail)
   - `is_annulled = FALSE`
2. No toca el expense primario de v1 (`source_type = 'payroll_generated'`)
3. La suma contable final = `expense_primario_v1 + Σ(deltas) = monto_final`

Idempotencia: `outbox_reactive_log` con `ON CONFLICT DO NOTHING` sobre la idempotency key.

Archivos:
- `src/lib/finance/apply-payroll-reliquidation-delta.ts`
- `src/lib/sync/projections/payroll-reliquidation-delta.ts`

### 26.6 Content-freshness cache invariant

Los export packages (PDFs y CSVs de nómina) se cachean en `payroll_export_packages`. Después de una reliquidación, el cache debe invalidarse para que la re-exportación genere archivos nuevos con entries v2.

Invariante: `canReuseStoredPackage()` compara `package.generatedAt` contra `MAX(updated_at)` de entries activas del período:

```typescript
// Si la entry más reciente fue actualizada DESPUÉS de que se generó el
// package, el cache es stale y debe regenerarse.
const latestEntryMs = Date.parse(latestEntryTimestamp)
const generatedAtMs = Date.parse(record.generatedAt)
return latestEntryMs <= generatedAtMs
```

Fail-safe: si no hay entries activas o el timestamp no se puede parsear, retorna `false` (regenerar siempre).

Archivo: `src/lib/payroll/payroll-export-packages.ts`

### 26.7 Period prioritization (multi-period awareness)

Un período reabierto tiene **prioridad máxima** en la UI:

```typescript
type ActivePayrollReason =
  | 'reopened_for_reliquidation'  // priority 10 (más alta)
  | 'current_operational_month'    // priority 20
  | 'approved_pending_export'      // priority 30
  | 'future_draft'                 // priority 40
```

Si hay un período reabierto y un período del mes actual, el reabierto aparece primero en la lista de períodos activos. Esto fuerza al operador a resolverlo antes de avanzar.

Archivo: `src/lib/payroll/current-payroll-period.ts`

### 26.8 API endpoints

| Method | Path | Descripción |
|---|---|---|
| `POST` | `/api/hr/payroll/periods/[periodId]/reopen` | Reabrir período. Requiere `efeonce_admin`. Retorna `{ audit_id, period_status, operationalMonth, reason, reopenedAt }` |
| `GET` | `/api/hr/payroll/periods/[periodId]/reopen-preview` | Dry-run: evalúa ventana, retorna `{ canReopen, daysRemaining, blockingReasons[], infoReasons[] }` |
| `GET` | `/api/hr/payroll/entries/[entryId]/versions` | Historial de versiones de una entry. Retorna array ordenado `[{ entry_id, version, is_active, superseded_by, gross_total, net_total, timestamps }]` |

### 26.9 UI components

| Componente | Ubicación | Descripción |
|---|---|---|
| `ReopenPeriodDialog` | `src/views/greenhouse/payroll/ReopenPeriodDialog.tsx` | Modal de reapertura: razón, detalle, preview de ventana, confirmación |
| `ReliquidationBadge` | `src/views/greenhouse/payroll/ReliquidationBadge.tsx` | Chip "v{N} reliquidada" en entries con `version > 1` |
| `EntryVersionHistoryDrawer` | `src/views/greenhouse/payroll/EntryVersionHistoryDrawer.tsx` | Panel lateral con historial de todas las versiones, deltas, estados, links a PDFs |

### 26.10 Reactive event flow (end-to-end)

```
1. Operador reabre período → POST /reopen
   → INSERT payroll_period_reopen_audit
   → UPDATE payroll_periods SET status = 'reopened'

2. Operador edita entry → recalculate
   → supersedePayrollEntryOnRecalculate()
   → v1.is_active = false, v2 inserted, v1.superseded_by = v2
   → INSERT outbox_events(payroll_entry.reliquidated, { deltas })

3. ops-worker reactivo despierta (Cloud Scheduler, */5 domain=finance)
   → SELECT FROM refresh_queue FOR UPDATE SKIP LOCKED
   → handler payroll_reliquidation_delta:payroll_entry.reliquidated
   → applyPayrollReliquidationDelta({ deltaNet, reopenAuditId })
   → INSERT greenhouse_finance.expenses(source_type='payroll_reliquidation')
   → INSERT outbox_reactive_log (idempotency)

4. Operador re-exporta → canReuseStoredPackage() = false (cache stale)
   → regenera PDFs/CSVs solo con entries is_active=TRUE
   → email con archivos actualizados
```

### 26.11 Invariantes de datos

| Invariante | Mecanismo | Archivo |
|---|---|---|
| Una sola entry activa por (período, colaborador) | Partial unique index `WHERE is_active = TRUE` | Migration foundation |
| Máximo una reliquidación por entry (V1) | `CHECK (version <= 2)` | Migration foundation |
| Un solo expense `payroll_generated` activo por (período, colaborador, tipo) | Partial unique index `WHERE source_type = 'payroll_generated' AND is_annulled = FALSE` | Migration dedupe invariant |
| Delta usa net (no gross) | Assertion en `applyPayrollReliquidationDelta` | `apply-payroll-reliquidation-delta.ts` |
| Audit row inmutable | No UPDATE/DELETE triggers; tabla sin ownership de módulo externo | Migration foundation |
| FK supersede deferrable | `DEFERRABLE INITIALLY DEFERRED` | Migration deferrable |
| Cache stale después de supersede | `MAX(updated_at)` > `generatedAt` | `payroll-export-packages.ts` |

### 26.12 Tests

| Suite | Archivo | Cobertura |
|---|---|---|
| Supersede flow | `src/lib/payroll/supersede-entry.test.ts` | v1→v2 creation, v2 edit in-place, delta calc, transaction ordering |
| Reopen guards | `src/lib/payroll/reopen-guards.test.ts` | Ventana 45d, reason validation, Previred check |
| Period lifecycle | `src/lib/payroll/period-lifecycle.test.ts` | Status transitions including `reopened` |
| Period prioritization | `src/lib/payroll/current-payroll-period.test.ts` | Multi-period ranking with reopened priority |

### 26.13 Limitaciones conocidas (V1)

1. **Una sola reliquidación por entry** — `CHECK (version <= 2)`. Para v3+ se necesita ampliar el constraint y adaptar el supersede chain. Scope de TASK-414.
2. **Ventana fija de 45 días** — no hay policy engine para excepciones, extensiones o aprobación especial de reapertura fuera de ventana. Scope de TASK-414.
3. **Solo `efeonce_admin` puede reabrir** — no hay delegation a roles intermedios.
4. **Ordering soft en reactive consumer** — si dos instancias de ops-worker toman `entry.superseded` y `entry.created` del mismo aggregate, pueden procesarse out-of-order. La idempotencia lo atrapa, pero no es FIFO estricto. Documentado en `docs/architecture/GREENHOUSE_REACTIVE_PIPELINE_SCALABILITY_V1.md`.
5. **Latencia del delta a finanzas** — depende de la cadencia del scheduler (2-5 min). Documentado en el mismo doc de scalability.

## 27. Observability & Reliability (TASK-729)

Payroll es un módulo first-class del Reliability Control Plane (`STATIC_RELIABILITY_REGISTRY`) con `incidentDomainTag = 'payroll'`. Todos los errores no-validation que pasen por `toPayrollErrorResponse` (helper canónico de los API routes) emiten a Sentry con `tags.domain = 'payroll'`, lo que permite filtrar incidents por módulo en Cloud & Integrations y producir el `incident` signal del módulo Payroll.

### 27.1 Domain tag canónico

- `CaptureDomain` enum incluye `'payroll'` ([src/lib/observability/capture.ts](../../src/lib/observability/capture.ts)).
- Todos los `console.error` directos en `src/lib/payroll/**` y `src/app/api/hr/payroll/**` fueron reemplazados por `captureWithDomain(err, 'payroll', { extra: { stage, periodId, actorUserId } })`.
- `toPayrollErrorResponse(error, fallbackMessage, extra?)` en [src/lib/payroll/api-response.ts](../../src/lib/payroll/api-response.ts) es el helper canónico — instrumentar nuevos endpoints solo requiere usarlo y pasar `extra` con context.
- **Steady state**: cero `console.error` directos en payroll. Si emerge uno nuevo, falla el grep de regresión y debe migrarse al helper.

### 27.2 Subsystem "Payroll Data Quality"

[`buildPayrollDataQualitySubsystem`](../../src/lib/operations/get-operations-overview.ts) entrega 4 detectores read-only que viven en [src/lib/payroll/data-quality/](../../src/lib/payroll/data-quality/):

| Métrica | Tipo | Severidad | Acción |
|---|---|---|---|
| `stuck_draft_periods` | platform integrity | warning si 1, error si > 1 | período `draft` con `updated_at > 48h` y mes operativo ya transcurrido |
| `compensation_version_overlaps` | platform integrity | error si > 0 | versions activas con date ranges solapados — bloquea cálculo correcto |
| `previred_sync_freshness` | operacional (info) | nunca escala | horas desde último `source_sync_runs` exitoso de `previred` |
| `projection_queue_failures` | platform integrity | warning si 1-5, error si > 5 | entries `failed`/`dead` (no archived) en `projection_refresh_queue` para projections de payroll |

- Las 3 métricas `platform integrity` escalan el subsystem a `degraded` cuando emiten warning/error. La operacional (PREVIRED freshness) es informativa.
- Cada detector es **fail-soft**: si la query falla (schema legacy, connection issue), retorna `info` con valor neutro. Nunca throw.
- El subsystem se enchufa al Reliability Control Plane vía `SUBSYSTEM_MODULE_MAP` en [src/lib/reliability/signals.ts](../../src/lib/reliability/signals.ts) — `'Payroll Data Quality' → 'payroll'`.

### 27.3 Kill switch

`GREENHOUSE_DISABLE_PAYROLL_DETECTORS=true` desactiva el subsystem retornando `not_configured` sin ejecutar queries. Útil para diagnóstico, mantenimiento, o si el subsystem genera ruido y se necesita silenciar sin redeploy. **Esta variable no afecta el motor de cálculo** — solo la observabilidad.

### 27.4 Boundaries explícitos (qué NO hace este módulo)

- **No reemplaza `getPayrollPeriodReadiness`**. Ese helper es el gate canónico de aprobación server-side y sigue siendo source of truth para bloqueantes pre-approval. Los detectores son visibilidad continua, no enforcement.
- **No mide duración de cálculo ni emite histograms**. Fuera de scope V1 — follow-up TASK derivada si se necesita.
- **No emite alertas a Teams automáticamente**. La conexión con notifications queda para TASK-731 (pre-close validator).
- **No persiste resultados de detectores**. Cada llamada a Operations Overview re-corre las queries. Si la cardinalidad lo justifica, agregar caching (TTL 30s in-process, patrón ya usado en Platform Health).

### 27.5 Cómo detectar un gap nuevo de payroll

Cuando emerja un gap operativo no cubierto:

1. Crear nuevo helper en `src/lib/payroll/data-quality/<gap-name>.ts` con shape `() => Promise<PayrollDataQualityMetric>`.
2. Decidir si es platform integrity (escala) u operacional (info). Agregar la key a `PAYROLL_PLATFORM_METRIC_KEYS` o `PAYROLL_OPERATIONAL_METRIC_KEYS` en `data-quality/types.ts`.
3. Agregar al `Promise.all` en `buildPayrollDataQualitySubsystem` y al `metrics` array.
4. Test vitest con happy path + edge case + fail-soft.

No requiere migration. No requiere cambio de UI (Ops Health renderiza automáticamente cualquier métrica nueva del subsystem).
