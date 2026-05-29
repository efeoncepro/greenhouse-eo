# TASK-940 — Payroll May Close Readiness Gate & Participation Cutover

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `payroll|hr|finance|data|reliability`
- Blocked by: `none`
- Branch: `task/TASK-940-payroll-may-close-readiness-gate`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Convertir la auditoria de nomina de mayo 2026 en un gate canonico de cierre: ninguna liquidacion oficial, aprobacion ni export compliance puede avanzar si faltan periodo/config, KPI fresco, participacion/egreso validado, perfil legal accesible o higiene minima de roster.

El caso urgente es la nomina de mayo 2026, pero la solucion debe quedar reusable para cierres futuros: fail-closed, observable, con shadow compare y rollout controlado.

## Why This Task Exists

La auditoria read-only del 2026-05-27 encontro riesgos materiales antes del cierre de mayo:

- No existe row `greenhouse_payroll.payroll_periods` para `year=2026 AND month=5`.
- Hay entradas/salidas de mitad de mes que hoy pueden pagarse como mes completo si los flags de participacion siguen OFF:
  - Felipe Zurita: honorarios CLP 650.000, compensation effective `2026-05-13`, esperado 13/21 dias habiles.
  - Maria Camila Hoyos: contractor Deel USD 530, compensation effective `2026-05-13` a `2026-05-14`, offboarding external payroll ejecutado `2026-05-14`, esperado 2/21 dias habiles.
- `PAYROLL_PARTICIPATION_WINDOW_ENABLED`, `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED` y `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED` estan unset/default false; el comportamiento legacy preserva compatibilidad pero no protege el cierre real de mayo.
- Los KPI de mayo para bonus variables fueron materializados el `2026-05-18 19:11:53`; el reader materialized-first no trata snapshots viejos como stale.
- El runtime admin encontro `permission denied` contra `greenhouse_core.person_identity_documents`; `readPersonLegalSnapshot` puede bloquear Previred/LRE si hay entradas Chile dependientes.
- Hay ruido de roster/data quality que no debe contaminar calculo oficial: miembros demo, activos sin compensation version, offboarded legacy y drift semantico de contrato/payrollVia.

Resolver esto con un parche local para mayo seria fragil. El cierre necesita una primitive compartida que bloquee la ruta oficial cuando el estado operacional no es confiable.

## Goal

- Agregar o endurecer un `Payroll Close Readiness Gate` canonico que bloquee `calculate`, `approve`, `close` y exports cuando existan blockers materiales.
- Activar la participacion/egreso con shadow compare, allowlist y signoff antes de cualquier flip productivo.
- Hacer freshness/provenance de KPI una condicion explicita para miembros con bonus variable.
- Validar acceso legal/compliance con least privilege, sin abrir PII mas de lo necesario.
- Excluir datos demo/no productivos y detectar drift de contrato antes de generar outputs oficiales.

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
- `docs/architecture/GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYROLL_BONUS_CALCULATION_V1.md`
- `docs/architecture/GREENHOUSE_PAYROLL_PERIOD_OUTPUTS_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Fail closed antes de liquidacion oficial: si el readiness tiene blockers, `calculate`, `approve`, `close` y export deben rechazar con razon auditable.
- No modelar altas de mitad de mes como asistencia; la fuente canonica es `compensation_versions.effective_from/effective_to` + offboarding/relationship lifecycle.
- `PAYROLL_PARTICIPATION_WINDOW_ENABLED=true` requiere `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED=true` en el mismo ambiente; no permitir combinaciones parcialmente seguras.
- Los KPI para bonus deben ser frescos respecto al corte de payroll; un snapshot viejo no puede pasar solo por existir.
- Previred/LRE consumen la liquidacion cerrada y perfiles legales canonicos; no deben recalcular ni tener access paths paralelos.
- Acceso a documentos/person legal profile debe ser least-privilege, auditado y probado desde el rol runtime real.
- Esta task no debe tocar SCIM ni SSO; cualquier cambio de grants/capabilities debe ser acotado a payroll/compliance/person legal profile.

## Normative Docs

- `docs/documentation/hr/periodos-de-nomina.md`
- `docs/documentation/hr/pagos-de-nomina.md`
- `docs/documentation/hr/payroll-compliance-exports-chile.md`
- `docs/documentation/hr/offboarding.md`
- `docs/manual-de-uso/hr/periodos-de-nomina.md`
- `docs/manual-de-uso/hr/descargar-y-reconciliar-nomina.md`
- `docs/manual-de-uso/hr/payroll-compliance-exports-chile.md`
- `docs/manual-de-uso/hr/offboarding.md`
- `docs/audits/payroll/PAYROLL_COMPLIANCE_AUDIT_2026-05-01.md`
- `docs/audits/payroll/PREVIRED_VALIDATOR_CASCADE_AUDIT_2026-05-10.md`

## Dependencies & Impact

### Depends on

- `TASK-893` / `docs/tasks/complete/TASK-893-payroll-participation-window.md`
- `TASK-890` / `docs/tasks/complete/TASK-890-workforce-exit-payroll-eligibility-window.md`
- `TASK-856` / `docs/tasks/to-do/TASK-856-previred-preflight-fixtures-mapping-hardening.md`
- `TASK-731` / `docs/tasks/to-do/TASK-731-payroll-pre-close-validator-and-preflight-endpoint.md`
- `TASK-732` / `docs/tasks/to-do/TASK-732-payroll-ico-safety-gate-kpi-provenance.md`
- `src/lib/payroll/payroll-readiness.ts`
- `src/lib/payroll/calculate-payroll.ts`
- `src/lib/payroll/period-lifecycle.ts`
- `src/lib/payroll/participation-window/*`
- `src/lib/payroll/exit-eligibility/*`
- `src/lib/payroll/fetch-kpis-for-period.ts`
- `src/lib/ico-engine/read-metrics.ts`
- `src/lib/payroll/compliance-exports/store.ts`
- `src/lib/person-legal-profile/snapshots.ts`
- `src/lib/finance/economic-indicators.ts`
- `src/lib/finance/payment-obligations/materialize-payroll.ts`
- `src/app/api/hr/payroll/periods/[periodId]/readiness/route.ts`
- `src/app/api/hr/payroll/periods/[periodId]/calculate/route.ts`
- `src/app/api/hr/payroll/periods/[periodId]/approve/route.ts`
- `src/app/api/hr/payroll/periods/[periodId]/close/route.ts`
- `src/app/api/hr/payroll/periods/[periodId]/export/route.ts`
- `src/app/api/hr/payroll/periods/[periodId]/export/previred/route.ts`
- `src/app/api/hr/payroll/periods/[periodId]/export/lre/route.ts`

### Blocks / Impacts

- Cierre oficial de nomina mayo 2026.
- Liquidacion/reliquidacion de payroll.
- Exports Previred/LRE y paquetes compliance Chile.
- Materializacion de obligaciones de pago desde payroll.
- Reportes de costo de personal y recibos oficiales.
- Posibles follow-ups de TASK-731/TASK-732/TASK-856, que pueden quedar absorbidos o reducidos si esta task entrega el gate canonico.

### Files owned

- `src/lib/payroll/**`
- `src/lib/ico-engine/read-metrics.ts`
- `src/lib/person-legal-profile/**`
- `src/lib/finance/economic-indicators.ts`
- `src/lib/finance/payment-obligations/materialize-payroll.ts`
- `src/app/api/hr/payroll/**`
- `src/lib/reliability/queries/payroll-*`
- `src/lib/reliability/queries/identity-legal-profile-payroll-blocking.ts`
- `docs/documentation/hr/*nomina*`
- `docs/manual-de-uso/hr/*nomina*`
- `docs/audits/payroll/*`

## Current Repo State

### Already exists

- Participation window payroll primitive shipped en `src/lib/payroll/participation-window/`, flag default OFF.
- Exit eligibility payroll primitive shipped en `src/lib/payroll/exit-eligibility/`, flag default OFF.
- Readiness endpoint existe en `src/app/api/hr/payroll/periods/[periodId]/readiness/route.ts`.
- Readiness core existe en `src/lib/payroll/payroll-readiness.ts`.
- Compliance exports existen en `src/lib/payroll/compliance-exports/*`.
- KPI reader para payroll existe en `src/lib/payroll/fetch-kpis-for-period.ts`.
- Reliability queries existentes cubren varias clases de drift payroll.
- Tests focales de payroll estan verdes al momento de auditoria: `pnpm exec vitest run src/lib/payroll src/types/hr-contracts.test.ts` paso 526 tests, 1 skipped.

### Gap

- No hay un unico gate fail-closed reutilizable que proteja todas las rutas oficiales de cierre.
- La ausencia de periodo mayo 2026 no se convierte automaticamente en blocker de cierre operacional.
- Participation/exit flags preservan legacy pero no tienen cutover orchestration segura para mayo.
- KPI materialized-first puede aceptar snapshots viejos de mitad de mes.
- Legal profile access falla para tablas sensibles desde el rol usado en auditoria; falta preflight least-privilege real.
- Demo/test data y drift semantico pueden entrar como ruido de readiness o calculo oficial.
- Existing tasks TASK-731/TASK-732/TASK-856 tratan piezas vecinas, pero no cierran end-to-end el camino `readiness -> calculate -> approve -> compliance export`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Canonical Payroll Close Readiness Gate

- Extender o refactorizar `src/lib/payroll/payroll-readiness.ts` para producir un contrato tipado de blockers/warnings/actions reutilizable por UI, API y jobs.
- Incluir blockers minimos:
  - periodo inexistente o no configurado para el mes objetivo;
  - indicadores economicos Chile requeridos faltantes/stale para entradas dependientes Chile;
  - KPI variable missing/stale para miembros con bonus variable;
  - miembros no-demo en scope sin compensation version efectiva;
  - datos demo dentro de calculo oficial;
  - drift de contrato/payRegime/payrollVia que puede cambiar calculo;
  - perfil legal/compliance no resoluble cuando una entrada Chile dependiente lo requiere;
  - decisiones de participacion faltantes para altas/bajas de mitad de periodo.
- Usar severity explicita (`blocker`, `warning`, `info`) y codes estables para pruebas, UI y runbooks.
- No duplicar logica de calculo; el gate debe llamar primitives canonicas existentes.

### Slice 2 — Gate Enforcement in Official Payroll Paths

- Cablear el gate a `calculate`, `approve`, `close` y exports, no solo al endpoint de readiness.
- Rechazar con error estructurado y auditable cuando existan blockers.
- Mantener respuestas seguras: sin PII cruda ni stack traces en payloads.
- Asegurar que jobs automaticos (`payroll-auto-calculate`) respeten el mismo gate.
- Agregar tests de regresion para que ninguna ruta oficial pueda bypass-ear readiness.

### Slice 3 — Participation/Exit Shadow Compare & Cutover Guard

- Implementar shadow compare staging/prod-read-only para comparar legacy vs participation-aware en mayo 2026 antes del flip.
- Enforcear dependencia de flags: participation ON requiere exit eligibility ON.
- Modelar decisiones explicitas para casos de mitad de mes:
  - Felipe Zurita: desde `2026-05-13`, 13/21 dias habiles de mayo 2026.
  - Maria Camila Hoyos: desde `2026-05-13` hasta `2026-05-14`, 2/21 dias habiles de mayo 2026.
- Exigir allowlist/signoff para cualquier override manual; el override debe tener actor, razon, timestamp y scope de periodo.
- No usar asistencia como sustituto de participation window.

### Slice 4 — KPI Freshness & Provenance Gate

- Extender el contrato de KPI usado por payroll con `materializedAt`, fuente, periodo cubierto y cutoff esperado.
- Bloquear miembros con bonus variable cuando el KPI fue materializado antes del corte de payroll o no cubre el mes completo.
- Proveer accion de remediation clara: recomputar/materializar KPI o marcar decision manual con signoff.
- Cubrir los miembros variables detectados para mayo: Andres, Daniela y Melkin.
- Coordinar con TASK-732 para evitar dos gates KPI divergentes.

### Slice 5 — Legal Profile & Compliance Preflight

- Resolver el acceso runtime a `greenhouse_core.person_identity_documents` y `greenhouse_core.person_addresses` con least privilege.
- Preferir grants/views/functions acotadas al reader canonico de person legal profile, no grants amplios ad hoc.
- Agregar smoke/preflight que ejecute `readPersonLegalSnapshot` desde el rol runtime real.
- Bloquear Previred/LRE cuando una entrada Chile dependiente requiere RUT/direccion/perfil legal y el reader no puede resolverlo.
- Coordinar con TASK-856 para fixtures y mapping Previred sin duplicar implementacion.

### Slice 6 — Roster/Data Hygiene Guards

- Excluir `is_demo` de cualquier calculo/export oficial; si un demo aparece en el readiness oficial, debe ser blocker o warning alto segun ruta.
- Detectar miembros activos offboarded antes del periodo y asegurar que exit eligibility decide el scope.
- Detectar compensation missing para miembros reales que entrarian en payroll.
- Detectar drift semantico como contractor/Deel con compensation `contract_type='indefinido'` y `pay_regime='international'`; no necesariamente bloquear si payrollVia evita calculo interno, pero debe quedar visible y accionable.
- Mantener noise de demo y data-fixtures fuera de la decision financiera real.

### Slice 7 — Runbook, UI Copy & Documentation

- Actualizar documentacion funcional y manuales de nomina con la secuencia real:
  1. crear/verificar periodo;
  2. correr readiness;
  3. resolver blockers;
  4. correr shadow compare;
  5. refrescar KPI;
  6. validar compliance preflight;
  7. calcular;
  8. aprobar/cerrar/exportar.
- Si se expone copy visible nuevo, mover microcopy reusable a `src/lib/copy/payroll.ts`.
- Registrar decisiones/riesgos en `Handoff.md` al ejecutar la task.
- Crear auditoria reusable `docs/audits/payroll/PAYROLL_MAY_CLOSE_READINESS_AUDIT_2026-05-27.md` si durante discovery se necesita preservar evidencia detallada de runtime.

## Out of Scope

- Cambiar manualmente montos de sueldo, bonus o deducciones para "arreglar mayo".
- Encender flags en produccion sin shadow compare, signoff HR/Finance y rollback documentado.
- Rehacer el motor completo de payroll.
- Resolver withholding internacional de TASK-905/TASK-906/TASK-907.
- Ejecutar pagos o crear ordenes bancarias.
- Limpieza historica masiva de datos legacy fuera del periodo/casos necesarios para cerrar mayo.
- Cambios a SCIM, Microsoft SSO, Google SSO o rutas de autenticacion.

## Detailed Spec

### Readiness result shape

El contrato debe ser estable y testeable. Shape orientativo:

```ts
type PayrollReadinessSeverity = 'blocker' | 'warning' | 'info'

type PayrollReadinessFinding = {
  code: string
  severity: PayrollReadinessSeverity
  periodId: string
  memberId?: string
  entryId?: string
  source:
    | 'period'
    | 'participation_window'
    | 'exit_eligibility'
    | 'kpi'
    | 'legal_profile'
    | 'economic_indicators'
    | 'roster'
    | 'contract_taxonomy'
    | 'compliance_export'
  messageKey: string
  remediationKey: string
  evidence: Record<string, unknown>
}
```

No exponer PII sensible en `evidence`; usar IDs internos, estados, timestamps y booleans suficientes.

### Mayo 2026 fixtures expected by tests

- Mayo 2026 tiene 21 dias habiles.
- Felipe Zurita:
  - `effective_from = 2026-05-13`
  - sueldo mensual honorarios CLP 650.000
  - participation expected: 13/21 dias habiles
- Maria Camila Hoyos:
  - `effective_from = 2026-05-13`
  - `effective_to = 2026-05-14`
  - offboarding external payroll executed `2026-05-14`
  - compensation Deel USD 530
  - participation expected: 2/21 dias habiles
- KPI materializedAt de mayo anterior al cierre debe bloquear bonus variable hasta refresh/signoff.

### Guard semantics

- `readiness` endpoint puede devolver blockers y remediation sin mutar.
- `calculate`, `approve`, `close`, `export`, `export/previred`, `export/lre` deben llamar el mismo gate en modo enforcement.
- Si existe override manual, debe estar scopeado por `periodId`, `finding.code`, `memberId` opcional, actor y expiration/retirement condition.
- Overrides no pueden saltarse falta de permisos legales/PII ni ausencia de periodo.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (readiness contract) debe cerrar antes de Slice 2 (enforcement).
- Slice 2 puede shippear en warning/shadow mode antes del enforcement productivo, pero los tests deben demostrar que enforcement funciona cuando el flag esta ON.
- Slice 3 (participation/exit cutover) depende de Slice 1 y de TASK-893/TASK-890 existentes.
- Slice 4 (KPI freshness) depende de Slice 1 y debe cerrar antes del calculo oficial de bonus variable de mayo.
- Slice 5 (legal profile preflight) debe cerrar antes de habilitar Previred/LRE oficiales.
- Slice 6 puede avanzar en paralelo despues de Slice 1, pero no debe mutar roster sin plan separado.
- Slice 7 acompana cada slice; docs no se dejan para despues del close.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Sobrepago de altas/bajas de mitad de mes por legacy full-month | payroll | high | participation/exit shadow compare, allowlist, enforcement antes de calculate | `payroll.participation_window.full_month_entry_drift` |
| Bonus variable calculado con KPI parcial/viejo | payroll/data | medium | KPI freshness cutoff + provenance + recompute action | `payroll.kpi_snapshot_stale` |
| Previred/LRE fallan por falta de permisos a perfil legal | payroll/compliance/security | medium | least-privilege grant/view/function + smoke con rol runtime | `identity.legal_profile.payroll_blocking` |
| Gate bloquea cierre por falso positivo operacional | payroll/release | medium | shadow mode, warning-first, override auditado por finding no critico | `payroll.close_readiness.blockers` |
| Apertura excesiva de PII al arreglar grants | security/data | medium | grants acotados, tests de privilege boundary, no payload PII | `security.person_legal_profile.access_drift` |
| Exports compliance divergen de calculo oficial | payroll/finance/compliance | low | exports consumen closed entries, no recalculo paralelo | `payroll.compliance_export_drift` |
| Cambios accidentales a SCIM/SSO por tocar identity/person grants | SCIM/SSO/identity | low | scope DB grant a person legal profile, no tocar auth providers ni SCIM routes; smoke auth si hay cambio de capability/grants shared | `identity.auth.smoke.internal_critical_failure` |
| Indicador economico UF/UTM/AFP stale en dependientes Chile | payroll/finance | medium | economic indicator readiness exact/at-period-end policy + remediation sync | `payroll.economic_indicator_stale` |

### Feature flags / cutover

- Reusar flags existentes:
  - `PAYROLL_PARTICIPATION_WINDOW_ENABLED`
  - `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED`
  - `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED`
- Introducir flags si no existen:
  - `PAYROLL_CLOSE_READINESS_GATE_ENFORCED` default `false` inicialmente; permite warning/shadow en staging y prod-read-only.
  - `PAYROLL_KPI_FRESHNESS_GATE_ENABLED` default `false` hasta recompute/signoff.
  - `PAYROLL_COMPLIANCE_PREFLIGHT_GATE_ENABLED` default `false` hasta grants/preflight verde.
- Cutover mayo:
  1. staging flags ON;
  2. shadow diff revisado por HR/Finance;
  3. KPI refresh;
  4. legal/compliance smoke verde;
  5. production shadow;
  6. production enforcement ON para el periodo;
  7. calculate/approve/export.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert PR o dejar endpoint consumiendo contrato legacy si se mantiene adapter | <30 min | si |
| Slice 2 | Set `PAYROLL_CLOSE_READINESS_GATE_ENFORCED=false` y redeploy; mantener readiness en modo diagnostico | <5 min | si |
| Slice 3 | Set participation/exit flags false; conservar shadow report como diagnostico | <5 min | si |
| Slice 4 | Set `PAYROLL_KPI_FRESHNESS_GATE_ENABLED=false`; requerir signoff manual documentado si se calcula | <5 min | si, con riesgo operativo |
| Slice 5 | Deshabilitar `PAYROLL_COMPLIANCE_PREFLIGHT_GATE_ENABLED`; revertir grants acotados con migration/down o SQL documentado | <30 min | parcial |
| Slice 6 | Revert PR o cambiar severity demo/drift a warning si bloqueo falso positivo impide cierre | <30 min | si |
| Slice 7 | Revert docs/copy; no afecta runtime | <10 min | si |

### Production verification sequence

1. Crear/verificar periodo mayo 2026 en staging.
2. Deploy staging con flags nuevos OFF; verificar que payroll legacy sigue funcionando en entorno controlado.
3. Activar readiness shadow en staging; `GET /api/hr/payroll/periods/:periodId/readiness` debe listar blockers esperados.
4. Activar participation/exit en staging; shadow compare debe mostrar Felipe 13/21 y Maria 2/21, no mes completo.
5. Refrescar/materializar KPI de mayo despues del corte; readiness deja de bloquear bonus por stale KPI.
6. Ejecutar legal profile smoke con rol runtime; Previred/LRE preflight verde o blocker claro sin PII.
7. Ejecutar calculo staging; aprobar/exportar solo si readiness no tiene blockers.
8. Repetir en produccion primero en shadow/read-only.
9. Activar enforcement productivo para mayo, calcular, aprobar/cerrar/exportar.
10. Monitorear signals payroll/compliance/identity durante 72h.

### Out-of-band coordination required

- HR/Finance deben aprobar shadow diff de Felipe/Maria y cualquier override manual.
- Si se requieren grants DB en Cloud SQL, coordinar ventana corta y registrar SQL/migration con rollback.
- Si KPI se materializa desde BigQuery/ICO, coordinar refresh posterior al corte real del mes.
- No requiere cambios en Azure AD, Google OAuth, SCIM ni App Registrations.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `readiness` devuelve blockers estructurados para periodo faltante/config incompleta, KPI stale, legal profile inaccesible cuando aplica, participation decision faltante y roster/demo/drift relevante.
- [ ] `calculate`, `approve`, `close` y exports rechazan cuando hay blockers y el enforcement flag esta ON.
- [ ] Staging shadow compare demuestra que Felipe Zurita no se paga mes completo y que Maria Camila Hoyos queda prorrateada/excluida segun participation/exit policy.
- [ ] `PAYROLL_PARTICIPATION_WINDOW_ENABLED=true` no puede correr sin `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED=true`.
- [ ] Miembros con bonus variable quedan bloqueados si KPI de mayo fue materializado antes del cutoff definido.
- [ ] Previred/LRE tienen preflight de perfil legal con least privilege y sin exponer PII en errores.
- [ ] Miembros demo quedan fuera de calculo/export oficial.
- [ ] Drift de contrato/payRegime/payrollVia se reporta con code estable y remediation.
- [ ] Docs/manual/runbook explican el cierre de mayo y el patron reusable para futuros cierres.
- [ ] No se modifican SCIM, Microsoft SSO ni Google SSO; si se toca capability/shared identity, se ejecuta smoke auth proporcional.

## Verification

- `pnpm task:lint --task TASK-940`
- `pnpm exec vitest run src/lib/payroll src/lib/ico-engine/read-metrics.test.ts src/lib/person-legal-profile`
- `pnpm exec vitest run src/app/api/hr/payroll/periods/[periodId]/calculate src/app/api/hr/payroll/periods/[periodId]/approve src/app/api/hr/payroll/periods/[periodId]/export`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint`
- `pnpm build`
- Read-only SQL check contra staging/prod para periodo mayo, flags, KPI materializedAt, legal-profile grants y readiness output.
- Manual/API smoke de `GET /api/hr/payroll/periods/:periodId/readiness` y `POST /calculate` con blocker esperado.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] `docs/documentation/hr/periodos-de-nomina.md` quedo actualizado
- [ ] `docs/manual-de-uso/hr/periodos-de-nomina.md` quedo actualizado
- [ ] chequeo de impacto cruzado con TASK-731, TASK-732 y TASK-856 documentado
- [ ] HR/Finance signoff de mayo 2026 registrado antes de cualquier flip productivo

## Follow-ups

- Revisar si TASK-731/TASK-732/TASK-856 deben cerrarse, reducirse o quedar como sub-slices despues de esta task.
- Crear task separada si se decide limpiar historico de demo/fixtures o drift legacy fuera de mayo.
- Crear task separada si el KPI materializer necesita freshness SLA general para todo ICO, no solo payroll.

## Delta 2026-05-27

Task creada desde la auditoria profunda de Payroll para cierre de mayo 2026 y la propuesta de solucion robusta solicitada por el operador. No incluye implementacion ni mutaciones de runtime.

## Open Questions

- Definir el cutoff exacto de KPI para mayo: fin de mes calendario, cierre operacional HR/Finance o timestamp de aprobacion.
- Definir si overrides de readiness viven en tabla nueva, metadata del periodo o audit log existente.
- Definir si el gate de indicadores economicos exige UF exacta del ultimo dia del periodo o permite politica at-or-before hasta que SII/CMF publique el valor final.
