# EPIC-013 — Contractor Engagements + Global Payables Program

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `unassigned`
- Branch: `epic/EPIC-013-contractor-engagements-global-payables-program`
- GitHub Issue: `optional`

## Summary

Programa cross-domain para convertir relaciones contractor/freelance/profesional independiente en una capacidad canonica de Greenhouse: relacion juridica separada, engagement operativo, invoices/boletas, evidencia, aprobacion, payables, bridge a Finance, pagos internacionales/provider-owned y cierre contractual.

El caso motivador es Valentina Hoyos: termina relacion dependiente Chile el `2026-04-30` y podria iniciar una nueva relacion contractor desde `2026-05-04` sin reactivar ni mutar la relacion laboral anterior.

## Why This Epic Exists

Greenhouse ya tiene foundation para personas, identidad legal, offboarding/finiquito, payment profiles, payment obligations y payment orders. Pero contractor/honorarios aun esta repartido entre Payroll legacy, criterio manual y referencias internacionales tipo Deel/EOR.

La brecha real es que un contractor no cabe correctamente en:

1. `payroll_entries` dependientes mensuales
2. `final_settlements` laborales Chile
3. expenses genericos sin fuente laboral/contractual
4. payment orders sin readiness de invoice/evidencia/tax owner

Este epic crea una linea canonica sin romper Payroll ni Finance: `ContractorEngagement -> WorkSubmission/Invoice -> ContractorPayable -> Finance Payment Obligation -> Payment Order`.

## Outcome

- Una misma persona puede cerrar una relacion laboral y abrir una relacion contractor con historial separado.
- Contractors directos, honorarios Chile, provider contractors y EOR quedan clasificados antes de calcular o pagar.
- Invoices/boletas se suben como assets privados gobernados, no como URLs libres.
- Work submissions, approvals, disputes y payables tienen lifecycle auditable.
- Finance consume payables listos y sigue siendo owner de obligaciones, ordenes de pago, banco y conciliacion.
- Chile honorarios queda modelado con retencion SII versionada y fuera de deducciones dependientes.
- International/provider flows declaran tax owner, FX policy, provider refs y manual review cuando no hay motor pais.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ECONOMIC_CATEGORY_DIMENSION_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

## Child Tasks

- `TASK-789` — Workforce Relationship Transition: Employee to Contractor.
- `TASK-790` — Contractor Engagements Runtime + Classification Risk.
- `TASK-791` — Contractor Invoice Assets + Greenhouse Uploader Contexts.
- `TASK-792` — Contractor Work Submissions + Approval/Dispute Flow.
- `TASK-793` — Contractor Payables to Finance Payment Obligations Bridge.
- `TASK-794` — Chile Honorarios Compliance + SII Retention.
- `TASK-795` — International Contractor + Provider Boundary + FX Policy.
- `TASK-796` — Contractor Self-Service Hub.
- `TASK-797` — Contractor Closure + Transition Controls.
- `TASK-798` — Contractor Reliability + Ops Control Plane.

## Existing Related Work

- `TASK-749` — Beneficiary Payment Profiles + Routing Policies V1.
- `TASK-750` — Payment Orders, Batches, Payment Calendar + Maker-Checker Runtime V1.
- `TASK-752` — Payment Profiles V2 Foundation.
- `TASK-753` — Payment Profiles Self-Service, registered in `docs/tasks/TASK_ID_REGISTRY.md`; file must be recovered or recreated before `TASK-796` implementation.
- `TASK-760` to `TASK-763` — Workforce offboarding and finiquito foundation.
- `TASK-783` — Payroll final settlement hardening.
- `TASK-784` — Person Legal Profile + Identity Documents Foundation.
- `TASK-787` — Person Country Reconciliation.
- `TASK-788` — Workforce Role Title Effective-Dating + Promotions.
- `TASK-721` — Finance evidence canonical uploader.

## Exit Criteria

- [ ] Contractor relationships are separate from employee relationships and preserve historical truth.
- [ ] Contractor engagements support fixed, PAYG, milestone, weekly/on-invoice and provider-owned lanes.
- [ ] Contractor invoices and evidence use the private asset registry and uploader contract.
- [ ] Contractor payables generate Finance obligations idempotently and never mutate bank directly.
- [ ] Chile honorarios uses versioned SII retention and never applies dependent payroll deductions.
- [ ] International/provider flows declare tax owner, FX policy and provider refs before payment readiness.
- [ ] Contractor self-service can submit invoices/evidence and track payment state.
- [ ] Contractor closure does not trigger finiquito and checks open invoices, access, documents and provider termination refs.
- [ ] Reliability signals expose missing tax owner, FX blockers, duplicate payables, unapproved invoices and provider reconciliation lag.

## Non-goals

- No replace Deel, Remote, Oyster or EOR providers as legal/compliance systems.
- No build a global tax engine for every country in V1.
- No use `payroll_adjustments` for contractor weekly/project/milestone payments.
- No turn contractor closure into Chile final settlement.
- No bypass Finance Payment Obligations or Payment Orders.
- No introduce a parallel bucket, uploader or storage helper.

## Delta 2026-05-05

- Epic created from the approved contractor/payables architecture and Valentina transition scenario.
