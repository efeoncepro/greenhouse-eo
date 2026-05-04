# TASK-761 — Payroll Final Settlement / Finiquito Engine Chile

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-010`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `TASK-760`
- Branch: `task/TASK-761-payroll-final-settlement-finiquito-engine-chile`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construye el motor canónico de cálculo de cierre laboral/finiquito para Chile, empezando por el caso de `resignation` en trabajadores dependientes. El motor debe consumir un `OffboardingCase` ya aprobado, resolver haberes y descuentos finales del trabajador saliente, y producir un settlement auditable separado de la nómina mensual normal.

## Delta 2026-05-03 — Dependencia fuerte de fechas canónicas de offboarding

La revisión del runtime People/HR confirmó que hoy solo existen `hireDate` y `contractEndDate`. Para este motor, `contractEndDate` no es suficiente ni seguro como fecha de término laboral. El cálculo debe depender de un `OffboardingCase` aprobado con `effective_date` y `last_working_day`; `member.active = false` tampoco es señal válida de término laboral.

## Delta 2026-05-04 — Payroll audit hardening

Auditoría con `greenhouse-payroll-auditor` confirmó que la task estaba bien secuenciada, pero demasiado abierta para implementación segura. Esta spec queda endurecida para que el primer corte no derive en una "liquidación mensual con otro nombre".

Decisiones:

- V1 cubre solo `resignation` para trabajador Chile dependiente (`contract_type in ('indefinido', 'plazo_fijo')`, `pay_regime='chile'`, `payroll_via='internal'`).
- `honorarios`, `contractor`, `eor`, `payroll_via='deel'` e internacional quedan fuera del engine V1; deben resolverse como lane externa/no payroll o task futura con reglas propias.
- El cálculo debe persistir componentes separados; no basta con un `gross`, `deductions`, `net`.
- El engine debe exponer readiness legal/previsional antes de permitir `approved`.
- Esta task no reemplaza revisión legal; implementa un motor auditable y fallado-cerrado sobre reglas conocidas.

## Why This Task Exists

Greenhouse ya calcula nómina mensual, pero un finiquito no es simplemente “otra liquidación del mes”. Requiere una capa específica para:

- causal de salida
- fecha efectiva / último día trabajado
- vacaciones pendientes o proporcionales
- haberes finales
- descuentos finales
- reglas legales que no son iguales al payroll mensual normal

Si intentamos modelarlo como un ajuste sobre `payroll_entries` mensuales, mezclamos dos contratos distintos y abrimos riesgo alto de compliance.

## Goal

- Crear un aggregate o runtime explícito de `final_settlement` / `finiquito`.
- Soportar V1 para Chile dependiente con causal `resignation`.
- Calcular haberes y descuentos finales sobre snapshot contractual + caso de salida.
- Mantener el cálculo separado del payroll mensual ordinario.
- Dejar explicación/auditoría clara de inputs, fórmulas y resultado final.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`

Reglas obligatorias:

- No modelar el finiquito como mutación silenciosa de payroll mensual.
- Partir por `resignation` en Chile dependiente; otras causales/regímenes como extensiones.
- Toda fórmula debe ser auditable y explicable.
- El engine debe fallar cerrado si faltan datos críticos del caso o snapshot contractual.
- No calcular desde `contractEndDate` directamente; ese campo puede quedar como evidencia/snapshot contractual, no como source of truth del término.
- No calcular desde `member.active = false` ni desde la acción administrativa `deactivateMember`.
- Requerir `offboarding_case_id`, `effective_date`, `last_working_day`, causal y snapshot contractual antes de calcular.

## Normative Docs

- `.codex/skills/greenhouse-payroll-auditor/SKILL.md`
- `docs/tasks/complete/TASK-076-payroll-chile-liquidacion-parity.md`
- `docs/tasks/complete/TASK-744-payroll-chile-compliance-remediation.md`
- `docs/tasks/to-do/TASK-176-labor-provisions-fully-loaded-cost.md`
- Dirección del Trabajo — feriado proporcional: `https://www.dt.gob.cl/portal/1628/w3-article-60200.html`
- Dirección del Trabajo — plazo para otorgar finiquito: `https://dt.gob.cl/portal/1628/w3-article-60613.html`
- Dirección del Trabajo — ratificación de finiquito: `https://dt.gob.cl/portal/1626/w3-article-117245.html`
- Dirección del Trabajo — cotizaciones previsionales al término: `https://www.dt.gob.cl/portal/1628/w3-article-60573.html`

## Dependencies & Impact

### Depends on

- `TASK-760`
- Runtime payroll Chile existente
- Datos de compensación y antigüedad contractual

### Blocks / Impacts

- Bloquea `TASK-762` como prerequisito de documento real.
- Impacta Payroll, HR, Finance provisioning/read-model y offboarding flows.

### Files owned

- `migrations/<ts>_task-761-final-settlement-engine.sql`
- `src/lib/payroll/final-settlement/**`
- `src/app/api/hr/offboarding/[caseId]/final-settlement/**`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/documentation/hr/finiquitos.md`
- `docs/manual-de-uso/hr/finiquitos.md`

## Current Repo State

### Already exists

- Payroll Chile mensual
- Offboarding architecture
- Legacy notion de “finiquito en curso”
- Provisiones laborales documentadas fuera del cálculo de cierre

### Gap

- No existe runtime específico de finiquito.
- No existe cálculo final separado del payroll mensual.
- No existe aggregate/documento auditable de settlement final.
- No existe todavía source of truth runtime de fecha efectiva de salida; queda bloqueado por `TASK-760`.

## Scope

### Slice 1 — Final settlement aggregate

- Crear schema base para `final_settlements`
- Link obligatorio a `offboarding_case_id`
- Snapshot contractual + inputs legales mínimos
- Persistir snapshots de `effective_date`, `last_working_day`, causal y `contract_end_date_snapshot` para auditoría
- Persistir `settlement_version`, `calculation_status`, `currency`, `gross_total`, `deduction_total`, `net_payable`, `calculated_at`, `calculated_by_user_id`, `approved_at`, `approved_by_user_id`.
- Persistir `source_snapshot_json` con evidencia mínima: `member_id`, `profile_id`, `person_legal_entity_relationship_id`, `compensation_version_id`, `hire_date`, `last_annual_vacation_date` si existe, `effective_date`, `last_working_day`, `contract_type`, `pay_regime`, `payroll_via`, `legal_entity_organization_id`.
- Persistir `breakdown_json` y `explanation_json` versionados; cada línea debe tener `component_code`, `label`, `amount`, `basis`, `formula_ref`, `source_ref` y `taxability`.
- Persistir `readiness_json` con blockers/warnings y evidencia, no solo un boolean.
- Garantizar idempotencia por `offboarding_case_id + settlement_version`; recalcular debe crear nueva versión o superseder explícito, nunca mutar silenciosamente un settlement aprobado.

### Slice 2 — Chile resignation engine

- Resolver V1 de cálculo para renuncia Chile dependiente
- Haberes y descuentos finales soportados en el alcance V1
- Explanation output + breakdown persistido

Componentes V1 mínimos:

- `pending_salary`: días/remuneración pendiente hasta `last_working_day`, si el último periodo mensual no lo cubre.
- `pending_fixed_allowances`: haberes fijos proporcionales aplicables que el contrato y payroll mensual tratan como pagables.
- `proportional_vacation`: feriado legal/proporcional conforme al criterio DT: tiempo desde contratación o última anualidad hasta término de funciones, convertido a días hábiles y luego a días a compensar incluyendo sábados, domingos y festivos cuando corresponda.
- `used_or_advanced_vacation_adjustment`: descuento o ajuste si existe saldo negativo/adelanto documentado y jurídicamente aplicable.
- `other_agreed_deductions`: descuentos finales solo si tienen fuente contractual/autorización y explicación; nunca usar texto libre sin `source_ref`.
- `statutory_deductions`: cotizaciones/impuesto asociados a remuneraciones finales cuando correspondan según el componente. No inventar tratamiento tributario/previsional para componentes ambiguos; marcar `needs_review`.

Componentes explícitamente fuera de V1:

- Indemnización por años de servicio.
- Indemnización sustitutiva de aviso previo.
- Recargos por causales de despido.
- Mutuo acuerdo, necesidades de la empresa, despido disciplinario, término por plazo fijo, muerte del trabajador u otras causales.
- Convenios de pago en cuotas o acuerdos transaccionales no modelados.
- Finiquitos para honorarios, Deel/EOR, contractors internacionales o jurisdicciones no Chile.

### Slice 3 — Validation + readiness

- Validar datos mínimos del caso
- Falla cerrada ante inputs faltantes
- Estados del settlement: draft, calculated, reviewed, approved, issued, cancelled
- Testear explícitamente que `contractEndDate` sin `OffboardingCase` aprobado no habilita cálculo

Readiness mínimo:

- `offboarding_case_approved`: requiere caso aprobado con `effective_date`, `last_working_day`, causal `resignation`, relación legal y snapshot contractual.
- `worker_regime_supported`: requiere Chile dependiente interno; otros regímenes quedan `blocked_unsupported_regime`.
- `compensation_snapshot_resolved`: requiere compensación vigente y versionada para el corte.
- `vacation_balance_resolved`: requiere saldo de feriado/vacaciones auditable o bloqueo `needs_leave_reconciliation`.
- `payroll_period_overlap_checked`: valida si el último periodo mensual ya pagó días/haberes para evitar doble pago.
- `previred_contributions_checked`: requiere evidencia o warning explícito de estado de cotizaciones previsionales para dependientes Chile.
- `tax_and_previsional_treatment_resolved`: cada componente debe declarar si es imponible/tributable/no imponible y su fórmula; ambiguos bloquean aprobación.
- `legal_review_required`: warning/blocker configurable cuando el cálculo incluya ajustes manuales o datos faltantes no críticos.

### Slice 4 — Integration boundaries

- Exponer API bajo `/api/hr/offboarding/[caseId]/final-settlement/**`; no crear rutas paralelas desde payroll period.
- Emitir evento versionado `payroll.final_settlement.calculated|approved|cancelled` solo después de persistir el aggregate.
- Finance puede consumir el settlement como obligación futura, pero esta task no crea payment order ni marca pago como ejecutado.
- `payroll_adjustments` con reason `termination_pending` puede coexistir como mecanismo de periodo mensual, pero no reemplaza el settlement final.
- `final_settlements` debe poder ser leído desde el caso de offboarding y desde documentación de finiquito (`TASK-762`) sin recomputar.

## Out of Scope

- No cubrir todos los países.
- No cubrir desde el día 1 todas las causales de término.
- No emitir aún el documento formal final si depende de `TASK-762`.
- No absorber Onboarding.

## Acceptance Criteria

- [ ] Existe runtime separado de payroll mensual para finiquito/final settlement.
- [ ] Se puede calcular un caso V1 de renuncia Chile dependiente desde un offboarding case.
- [ ] El resultado queda auditable y explicable.
- [ ] No se contamina el motor de payroll mensual con lógica ad hoc de finiquito.
- [ ] El motor falla cerrado si solo existe `contractEndDate`, `member.active = false` o una desactivación administrativa sin caso aprobado.
- [ ] El settlement separa componentes de cálculo y no mezcla feriado proporcional, remuneraciones pendientes, descuentos y neto en un único monto opaco.
- [ ] Honorarios, Deel/EOR, contractor e internacional quedan bloqueados explícitamente como regímenes no soportados por V1.
- [ ] Existe readiness con blockers/warnings y evidencia para offboarding case, compensación, vacaciones, overlap de payroll mensual, cotizaciones y tratamiento tributario/previsional.
- [ ] Recalcular un settlement aprobado no muta el histórico; crea nueva versión o exige flujo de cancelación/reemisión.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm vitest run src/lib/payroll`
- Casos de prueba de settlement final sobre fixtures Chile
- Tests unitarios de régimen: Chile dependiente permitido; honorarios, Deel/EOR, contractor e internacional bloqueados.
- Tests unitarios de readiness: `contractEndDate` solo, `member.active=false` solo y `deactivateMember` solo no habilitan cálculo.
- Tests unitarios de vacaciones: feriado proporcional requiere fecha de contratación o última anualidad + `effective_date`/`last_working_day`.
- Tests unitarios de idempotencia/versionado: settlement aprobado no se sobreescribe en recalculation.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo movido a la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] arquitectura/documentación actualizadas

## Follow-ups

- `TASK-762`
