# GREENHOUSE HR + Finance Runtime Gaps v1

## Objetivo

Documentar las brechas reales de runtime en `HR`, `Payroll` y `Finance` contra el codebase y el modelo de datos actual, separando con claridad:

- qué sinergias ya están materializadas y funcionan sobre el grafo canónico
- qué integraciones siguen apoyadas en paths híbridos o legacy
- qué gaps requieren nuevas tasks y cuáles ya tienen owner en el backlog vigente

Este documento no reemplaza la arquitectura canónica. Su función es fijar una lectura operativa común sobre las superficies de HR y Finanzas tal como existen hoy en el repo.

## Contexto validado en runtime

El review sobre código y modelo actual confirma que HR y Finanzas ya no operan como silos aislados.

Sinergias reales ya materializadas:

- `Payroll -> ICO` vive en `src/lib/payroll/fetch-kpis-for-period.ts` con estrategia `materialized_first_with_live_fallback`
- `Payroll -> HR Core` vive en `src/lib/payroll/fetch-attendance-for-period.ts`, que combina asistencia y permisos aprobados para el cálculo mensual
- `Person 360 -> HR` vive en `src/lib/person-360/get-person-hr.ts` sobre `greenhouse_serving.person_hr_360`
- `Person 360 -> Finance` vive en `src/lib/person-360/get-person-finance.ts` sobre `greenhouse_serving.person_finance_360`, `greenhouse_payroll.payroll_entries`, `greenhouse_finance.expenses` y `greenhouse_serving.client_labor_cost_allocation`
- `Organization -> Finance + Payroll + ICO` vive en `src/lib/account-360/organization-economics.ts`
- `Finance -> Payroll` ya tiene un bridge operativo para expenses ligados a nómina en `src/app/api/finance/expenses/payroll-candidates/route.ts`

Conclusión: la brecha actual no es crear sinergia desde cero, sino terminar de cortar los paths híbridos que todavía contradicen el modelo canónico del portal.

## Metodología

Brechas derivadas de revisar:

- arquitectura vigente en `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`, `FINANCE_CANONICAL_360_V1.md` y `GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- stores y helpers en `src/lib/payroll/**`, `src/lib/finance/**`, `src/lib/hr-core/**`, `src/lib/person-360/**`, `src/lib/account-360/**`
- rutas API en `src/app/api/hr/**`, `src/app/api/finance/**`, `src/app/api/people/**`, `src/app/api/organizations/**`
- reglas de permisos en `src/lib/tenant/authorization.ts` y `src/lib/people/permissions.ts`

## Matriz de brechas

| Gap                                                                    | Evidencia en repo                                                                                                                                                                                            | Riesgo operativo                                                                                                             | Cierre propuesto                                              |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Finance client runtime sigue anclado a BigQuery legacy                 | `src/app/api/finance/clients/route.ts`, `src/app/api/finance/clients/[id]/route.ts` y `src/lib/finance/canonical.ts` siguen leyendo `projectId.greenhouse.clients`, `fin_client_profiles` y conformed tables | identidad de cliente duplicada o inconsistente frente a `greenhouse_core.clients`, `organization_id` y snapshots ejecutivos  | `TASK-050 - Finance Client Canonical Runtime Cutover`         |
| Finance <-> Payroll bridge sigue híbrido y parcialmente roto           | `src/app/api/finance/analytics/trends/route.ts` consulta `greenhouse_hr.payroll_entries`; `expenses/payroll-candidates` y `resolveFinanceMemberContext()` siguen leyendo payroll/team legacy en BigQuery     | trends de payroll pueden fallar o quedar vacíos; linking de expenses a payroll no converge sobre el source of truth canónico | `TASK-051 - Finance Payroll Bridge Postgres Alignment`        |
| Person 360 finance no está alineado con permisos reales de Finance     | `canAccessPeopleModule()` no permite roles `finance`; `getPersonAccess()` solo habilita tab financiera a `admin`, `ops` y `hr_payroll`                                                                       | Finance no puede consumir la ficha financiera por persona aunque la proyección `person_finance_360` ya existe                | `TASK-052 - Person 360 Finance Access Alignment`              |
| Attendance/leave payroll summary sigue sobrecontando permisos cruzados | `src/lib/payroll/fetch-attendance-for-period.ts` suma `requested_days` completos con solo condición de traslape de fechas                                                                                    | descuentos de nómina pueden inflarse cuando un permiso cruza más de un período                                               | ya owned por `TASK-005` y `TASK-001`; no crear lane duplicada |

## Gap 1 - Finance client runtime todavía no está cortado al grafo canónico actual

### Delta 2026-03-30

- El write path ya no es el principal problema de este gap:
  - `POST /api/finance/clients`
  - `PUT /api/finance/clients/[id]`
  - `POST /api/finance/clients/sync`
  ya operan Postgres-first sobre `greenhouse_finance.client_profiles`.
- El residual vigente del gap es read-path:
  - list/detail siguen consultando BigQuery legacy e hydrations híbridas
  - `resolveFinanceClientContext()` mantiene fallback BigQuery explícito
- La tabla de brechas se mantiene abierta porque el request path completo todavía no está cortado al grafo canónico.

### Evidencia

- `src/app/api/finance/clients/route.ts` usa `projectId.greenhouse.clients`, `projectId.greenhouse.fin_client_profiles`, `projectId.greenhouse_conformed.crm_companies` y `projectId.greenhouse.client_service_modules`
- `src/app/api/finance/clients/[id]/route.ts` repite ese mismo contrato BigQuery-first
- `src/lib/finance/canonical.ts` resuelve `clientId`, `clientProfileId` y `hubspotCompanyId` contra tablas legacy de BigQuery antes de derivar `organizationId`

### Diagnóstico

La capa de `Finance Clients` sigue funcionando, pero no ya sobre la topología que el modelo maestro declara como runtime actual:

- `greenhouse_core.clients`
- `greenhouse_finance.client_profiles`
- `greenhouse_crm.companies`
- `organization_id` derivado desde `spaces`

Eso deja a Finance con una visión propia del cliente más cercana al runtime legacy que al grafo canónico del portal.

### Task derivada

- `TASK-050 - Finance Client Canonical Runtime Cutover`

## Gap 2 - El puente Finance <-> Payroll no converge todavía sobre PostgreSQL canónico

### Evidencia

- `src/app/api/finance/analytics/trends/route.ts` consulta `greenhouse_hr.payroll_entries` y `greenhouse_hr.payroll_periods`, aunque el runtime vigente del módulo es `greenhouse_payroll.*`
- `src/app/api/finance/expenses/payroll-candidates/route.ts` sigue leyendo `projectId.greenhouse.payroll_entries`, `payroll_periods`, `team_members` y `fin_expenses`
- `src/lib/finance/canonical.ts` resuelve `payrollEntryId` y `memberId` desde BigQuery legacy

### Diagnóstico

La sinergia existe, pero el puente sigue partido en dos:

- parte de la lectura ya usa `greenhouse_payroll` en PostgreSQL
- parte de Finance sigue apoyándose en tablas legacy de BigQuery
- una ruta viva incluso consulta el schema equivocado `greenhouse_hr.payroll_*`

Eso ya no es solo deuda de migración; es un riesgo de corrección funcional.

### Task derivada

- `TASK-051 - Finance Payroll Bridge Postgres Alignment`

## Gap 3 - Person 360 financiera no es alcanzable para Finance como módulo

### Evidencia

- `src/app/api/people/[memberId]/finance/route.ts` existe y consume `getPersonFinanceOverview()`
- `src/lib/people/get-person-detail.ts` ya compone `financeSummary`
- `src/lib/tenant/authorization.ts` limita `canAccessPeopleModule()` a `people`, `internal+admin/ops/hr_payroll`
- `src/lib/people/permissions.ts` define `canViewFinance = isAdmin || isOps || isHrPayroll`

### Diagnóstico

La proyección financiera por persona ya está materializada y bien integrada con Payroll y cost attribution. El problema es que los roles naturales de Finance no la pueden consumir desde `People`.

Eso rompe la promesa de `Person 360` como ficha unificada y obliga a mantener investigación financiera de persona fuera de la surface canónica.

### Task derivada

- `TASK-052 - Person 360 Finance Access Alignment`

## Gap 4 - Payroll attendance/leave todavía tiene un bug de imputación por período

### Evidencia

- `src/lib/payroll/fetch-attendance-for-period.ts` suma `SUM(r.requested_days)` para requests aprobados
- la query solo filtra por traslape con:
  - `r.start_date <= periodEnd`
  - `r.end_date >= periodStart`

### Diagnóstico

Si un permiso cruza dos meses, el cálculo actual puede imputar `requested_days` completos a ambos períodos en vez de prorratear por los días realmente traslapados.

### Ownership actual

No abrir una task nueva para esto.

El gap ya cae dentro del scope vivo de:

- `TASK-001 - HR Payroll Operational Hardening`
- `TASK-005 - HR Payroll Attendance/Leave Work Entries`

## Orden recomendado de cierre

1. `TASK-051` para cerrar primero el puente roto Finance <-> Payroll porque ya tiene riesgo de corrección
2. `TASK-050` para cortar luego Finance Clients al grafo canónico actual
3. `TASK-052` para alinear después Person 360 financiera con permisos y consumo real
4. ejecutar `TASK-001` y `TASK-005` para cerrar la imputación correcta de permisos y asistencia

## Relación con backlog existente

Estas brechas interactúan especialmente con:

- `TASK-001 - HR Payroll Operational Hardening`
- `TASK-005 - HR Payroll Attendance/Leave Work Entries`
- `TASK-015 - Financial Intelligence Layer`
- `TASK-043 - Person 360 Runtime Consolidation`
- `TASK-044 - Organization Executive Snapshot`
- `TASK-045 - Reactive Projection Refresh`

## Regla operativa derivada

Para HR y Finance en Greenhouse debe respetarse esta frontera:

- writes transaccionales: PostgreSQL canónico (`greenhouse_hr`, `greenhouse_payroll`, `greenhouse_finance`, `greenhouse_core`)
- read models 360: `greenhouse_serving`
- BigQuery: raw, conformed, marts y compatibilidad transitoria, no fuente primaria silenciosa del request path cuando ya existe un owner canónico en PostgreSQL

Si una nueva surface HR/Finance sigue leyendo tablas legacy de BigQuery como source of truth sin declararlo explícitamente, vuelve a abrir una brecha de sinergia con el resto del portal.
