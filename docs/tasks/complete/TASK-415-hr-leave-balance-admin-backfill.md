# TASK-415 — HR Leave Balance Visibility, Admin Backfill & Manual Adjustments

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Implementado y validado`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `task/TASK-415-hr-leave-balance-admin-backfill`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Implementar una capa robusta para que HR y admins puedan ver los saldos de vacaciones del equipo, entender bajo que politica se calculan y registrar vacaciones ya tomadas fuera de Greenhouse sin romper trazabilidad. La task tambien separa claramente dos operaciones distintas: backfill retroactivo con fechas reales y ajustes manuales de saldo cuando las fechas no existen o no se conocen.

## Why This Task Exists

Hoy el colaborador puede ver sus vacaciones disponibles, pero la superficie administrativa no resuelve bien el caso operativo mas importante: ver el saldo del equipo y corregir historial cuando Greenhouse no fue usado a tiempo. Eso deja a HR ciego frente a vacaciones ya tomadas, especialmente en escenarios con contratos heterogeneos, regimenes de pago distintos y reglas legales chilenas que dependen de la fecha de ingreso y del tipo de relacion laboral.

Ademas, el sistema ya tiene bases de leave en PostgreSQL, proyecciones 360 y APIs HR, pero no existe una task canonica que baje a implementacion enterprise la combinacion de visibilidad admin, politica de elegibilidad por contrato y operaciones auditables de backfill y ajuste.

## Goal

- Permitir a HR/admin ver por colaborador los dias disponibles, usados, reservados y ajustados de vacaciones.
- Soportar registro retroactivo de vacaciones ya tomadas con fechas reales y efecto consistente en saldo e historial.
- Soportar ajustes manuales auditables cuando no existan fechas exactas o se necesite corregir el ledger.
- Diferenciar correctamente politicas de vacaciones segun contrato, regimen y contexto laboral, con foco explicito en Chile interno.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/schema-snapshot-baseline.sql`

Reglas obligatorias:

- No mutar saldos visibles como source of truth primario; el sistema debe registrar hechos auditables y derivar la proyeccion.
- Si existen fechas reales del periodo tomado, usar backfill retroactivo de vacaciones aprobadas; no mezclarlo con ajuste manual.
- Si no existen fechas o se corrige arrastre/ledger, usar ajuste manual con razon obligatoria, actor y trazabilidad.
- La elegibilidad no puede depender solo de moneda; debe considerar `contract_type`, `pay_regime`, `payroll_via` y `hire_date`.
- Los colaboradores de Chile interno con contrato indefinido y pago en CLP deben seguir politica laboral chilena basada en fecha de ingreso.
- Cada query debe filtrar por `space_id`.
- Reutilizar `@/lib/db` (`query`, `getDb`, `withTransaction`) y evitar pools manuales.
- Nuevos modulos de datos deben usar Kysely via `const db = await getDb()`.
- Las rutas deben respetar route groups y contratos de Identity Access V2.
- La explicacion de saldo y politicas no puede duplicar metricas inline fuera del runtime/persistencia canonica.
- `docs/architecture/schema-snapshot-baseline.sql` es referencia baseline, pero no alcanza por si sola para describir el DDL actual de leave y contracts; validar siempre contra migraciones y scripts vivos cuando exista drift.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/documentation/hr/sistema-permisos-leave.md`
- `docs/documentation/hr/jerarquia-reporte-supervisoria.md`
- `docs/tasks/to-do/TASK-404-entitlements-governance-admin-center.md`
- `docs/tasks/complete/TASK-403-entitlements-runtime-foundation-home-bridge.md`

## Dependencies & Impact

### Depends on

- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`
- `src/lib/tenant/authorization.ts`
- `src/app/api/hr/core/leave/balances/route.ts`
- `src/lib/hr-core/service.ts`
- `src/lib/hr-core/postgres-leave-store.ts`
- `src/views/greenhouse/hr-core/HrLeaveView.tsx`
- `src/app/api/my/leave/route.ts`
- `src/lib/person-360/get-person-hr.ts`
- `src/app/api/people/[memberId]/hr/route.ts`
- `src/types/hr-contracts.ts`
- `src/lib/calendar/operational-calendar.ts`
- `src/lib/calendar/nager-date-holidays.ts`

### Blocks / Impacts

- `docs/tasks/to-do/TASK-404-entitlements-governance-admin-center.md`
- `src/views/greenhouse/hr-core/**`
- `src/app/api/hr/core/leave/**`
- `src/app/api/people/**`
- `src/lib/person-360/**`
- `docs/documentation/hr/**`

### Files owned

- `src/app/api/hr/core/leave/**`
- `src/lib/hr-core/**`
- `src/views/greenhouse/hr-core/**`
- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`
- `src/lib/person-360/**`
- `docs/documentation/hr/**`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- Existe runtime self-service de vacaciones para el colaborador en `src/app/api/my/leave/route.ts`.
- Existe API HR de balances de leave en `src/app/api/hr/core/leave/balances/route.ts`.
- Existe servicio/store de leave con fallback PostgreSQL en `src/lib/hr-core/service.ts` y `src/lib/hr-core/postgres-leave-store.ts`.
- Existen tablas y vistas base en PostgreSQL, incluyendo `greenhouse_hr.leave_balances`, `greenhouse_hr.leave_requests`, `greenhouse_hr.leave_request_actions`, `greenhouse_serving.member_leave_360` y `greenhouse_serving.person_hr_360`.
- Existe vista HR Leave en `src/views/greenhouse/hr-core/HrLeaveView.tsx`.
- Existe foundation de entitlements runtime en `TASK-403`.
- El runtime actual ya permite que HR/admin cree solicitudes para otro colaborador y ya publica eventos `leave_request.*`.
- El DDL vivo ya incluye `start_period` / `end_period` en `leave_requests` y `contract_type` / `pay_regime` / `payroll_via` en `greenhouse_core.members`, aunque el baseline snapshot no refleje todo ese delta.

### Gap

- No existe una task canonica que aterrice la visibilidad administrativa de saldo de vacaciones con alcance enterprise.
- No existe un flujo robusto y distinguible para registrar vacaciones ya tomadas fuera de Greenhouse.
- No existe una separacion operativa clara entre backfill con fechas reales y ajuste manual de saldo.
- Las capacidades de entitlements necesarias para ver, ajustar y registrar backfill de vacaciones no estan consolidadas como contrato de modulo.
- La UI actual no resuelve de forma suficiente el caso de HR/admin que necesita operar por colaborador con explicacion de politica y auditoria.
- La resolucion de policy observable hoy sigue apoyandose en `employment_type + pay_regime`; todavia no existe un resolver canonico basado completamente en `contract_type + pay_regime + payroll_via + hire_date`.
- `adjustment_days` existe como agregado de saldo, pero no hay una estructura auditable y reversible dedicada para ajustes manuales.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     Debe quedar suficientemente especificado para que el agente
     pueda derivar plan y ejecutar sin adivinar producto.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### In scope

1. Exponer saldos de vacaciones del equipo para HR/admin en la superficie HR Leave.
2. Definir capacidades de acceso para lectura de saldo, backfill retroactivo y ajuste manual.
3. Introducir modelo operativo robusto para:
   - vacaciones retroactivas con fechas reales
   - ajustes manuales de saldo sin fechas exactas
4. Explicar por colaborador la politica de calculo usada o, al minimo, una clave de politica legible y consistente.
5. Cubrir el caso chileno interno con contrato indefinido basado en fecha de ingreso.
6. Dejar audit trail util para soporte, HR y futuras automatizaciones.

### Out of scope

1. Reemplazar por completo `TASK-404` o construir el admin center general de entitlements.
2. Resolver integracion completa con proveedores externos de vacaciones/EOR.
3. Recalculo de payroll o reliquidaciones completas derivadas de vacaciones, salvo hooks/auditoria minima si el modelo existente ya lo soporta.
4. Redisenar Person 360 completo.

## Detailed Spec

### 1. Contrato funcional de operaciones

El modulo debe distinguir de forma explicita dos flujos:

#### A. Backfill retroactivo con fechas

Caso canonico: "Valentina tomo 5 dias la semana pasada y no los solicito en Greenhouse".

Este flujo debe:

- registrar un periodo real tomado
- impactar dias usados y dias disponibles
- reflejarse en historial como hecho retroactivo cargado por admin
- persistir razon, actor y timestamp
- permitir trazabilidad o reversal segun el patron existente del modulo

#### B. Ajuste manual de saldo

Caso canonico: arrastre heredado, correccion de onboarding, deuda historica o correccion de calculo sin fechas exactas.

Este flujo debe:

- aplicar un delta positivo o negativo al saldo
- no inventar fechas de vacaciones si no existen
- exigir razon obligatoria
- persistir actor, timestamp, evidencia o notas
- dejar trail auditable y reversible si el modelo del modulo lo permite

### 2. Politica de elegibilidad y calculo

El sistema debe dejar preparado un resolver de politica que diferencie, como minimo:

- colaborador Chile interno indefinido
- colaborador Chile interno plazo fijo
- honorarios
- contractor
- EOR / proveedor externo

La decision no debe depender solo de `currency`. Debe basarse en atributos laborales canonicos como `contract_type`, `pay_regime`, `payroll_via` y `hire_date`.

Para el caso Chile interno indefinido:

- el saldo de vacaciones debe derivarse segun legislacion chilena y fecha de ingreso
- el sistema debe dejar visible el contexto de politica aplicada o un explain legible

Nota de discovery:

- el runtime vigente todavia no resuelve esto con el contrato laboral completo; la implementacion debe cerrar ese gap de forma explicita y no asumir que ya existe un resolver reusable suficiente

### 3. Superficie administrativa

La vista HR Leave debe permitir, al menos:

- listar saldo por colaborador
- ver disponibles, usados, reservados y ajustes
- identificar politica o regimen aplicado
- ejecutar accion de backfill retroactivo
- ejecutar accion de ajuste manual
- consultar historial o evidencia minima de cambios

Si existe scope supervisorial reutilizable, el acceso debe respetarlo. Si no, el minimo aceptable es no filtrar mal ni exponer datos fuera del tenant o del scope permitido.

### 4. Persistencia y proyecciones

Durante discovery/plan se debe decidir el cambio minimo necesario de schema, pero la implementacion final debe cumplir este principio:

- no editar balances visibles como unico mecanismo
- registrar hechos o eventos suficientemente auditables para recomponer la proyeccion

Si el schema existente alcanza con extensiones minimas sobre `leave_requests`, `leave_request_actions`, `leave_balances` u otra tabla canonica, reutilizarlo. Si no alcanza, crear la estructura minima nueva y documentar por que no era reutilizable.

Lectura inicial corregida tras discovery:

- el backfill con fechas reales probablemente puede reutilizar `leave_requests` + `leave_request_actions`, agregando metadata/fuente si hace falta
- el ajuste manual auditable probablemente requerira una estructura nueva o una extension fuerte del modelo actual, porque `adjustment_days` por si solo no deja ledger ni reversal claros

### 5. Entitlements y autorizacion

La task debe introducir o formalizar capacidades para:

- leer saldos de vacaciones del equipo
- crear backfill retroactivo
- crear ajustes manuales
- revertir/corregir si corresponde

Estas capacidades deben convivir con la foundation de `TASK-403` y dejar una conexion clara hacia `TASK-404`.

### 6. Auditoria y explainability

Toda mutacion debe dejar:

- actor
- motivo
- timestamp
- tipo de operacion
- colaborador afectado
- fuente (`admin_backfill`, `manual_adjustment`, u otra canonica)

La UI y/o la API deben poder explicar por que un saldo vale lo que vale, al menos con un desglose legible de allowance, uso, reservas y ajustes.

## Acceptance Criteria

- HR/admin puede ver saldo de vacaciones del equipo por colaborador desde la superficie HR Leave.
- El sistema diferencia y aplica politica laboral segun contexto contractual, incluyendo Chile interno indefinido desde fecha de ingreso.
- Admin puede registrar vacaciones ya tomadas con fechas reales y el saldo disponible disminuye de forma consistente.
- Admin puede crear ajustes manuales cuando no hay fechas exactas y el sistema deja razon y auditoria.
- Las operaciones de backfill y ajuste manual quedan separadas semantica y tecnicamente.
- Ninguna query nueva rompe tenant isolation por `space_id`.
- El control de acceso usa entitlements/capabilities y no chequeos ad hoc dispersos.
- La documentacion funcional y de arquitectura relevante queda actualizada.

## Verification

- `pnpm lint`
- `pnpm build`
- `pnpm vitest run [tests relevantes del dominio HR/leave]`
- Verificacion manual local o staging:
  - login como HR/admin
  - abrir superficie HR Leave
  - revisar saldo de un colaborador Chile interno indefinido
  - registrar backfill retroactivo de 5 dias ya tomados
  - confirmar reduccion de disponible y registro en historial
  - crear ajuste manual con razon
  - confirmar que My Leave / Person 360 no quedan inconsistentes

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — CLOSING PROTOCOL
     "Como se considera cerrada?"
     ═══════════════════════════════════════════════════════════ -->

## Documentation Updates

Al cerrar esta task, actualizar:

- `docs/documentation/hr/sistema-permisos-leave.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/changelog/CLIENT_CHANGELOG.md` si cambia una capacidad visible para clientes/admins

## Handoff Notes

Si la ejecucion se corta, dejar en `Handoff.md`:

- decisiones sobre modelo de backfill vs ajuste manual
- tablas reutilizadas o creadas
- capacidades de entitlements agregadas
- riesgos de politica laboral pendientes por validar

## Exit Criteria

La task solo se considera cerrada cuando:

- el archivo se mueve a `docs/tasks/complete/`
- `docs/tasks/README.md` refleja el nuevo estado
- la documentacion requerida fue actualizada
- la validacion ejecutada queda explicitada
