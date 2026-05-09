# Greenhouse Contractor Engagements + Payables Architecture V1

**Version:** 1.0
**Created:** 2026-05-05
**Status:** Architecture proposal; runtime not implemented yet

## Purpose

Definir la expansion canonica para relaciones contractor/freelance/profesional independiente en Greenhouse, incluyendo contratacion, evidencia de trabajo, invoices/boletas, aprobacion, pagos flexibles y cierre contractual.

Este documento nace del caso Valentina Hoyos:

- relacion dependiente Chile `indefinido` terminada el `2026-04-30`
- finiquito laboral calculado/remediado por el engine de final settlement
- nueva relacion desde `2026-05-04` como contractor/freelance/profesional independiente

La decision central: Greenhouse no debe "reactivar" ni mutar la relacion laboral anterior. Debe cerrar historico y abrir una **nueva relacion juridica/economica** bajo la misma persona canonica.

Usar junto con:

- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ECONOMIC_CATEGORY_DIMENSION_V1.md`

## Market Reference

Greenhouse debe copiar el patron arquitectonico, no el producto:

- Deel Contractors API separa contratos, hiring/invites, payment schedules, amendments, terminations, invoice adjustments, timesheets, tasks, milestones y off-cycle payments. Referencia: `https://developer.deel.com/api/contractors/introduction`.
- Deel comercialmente distingue contratos fixed, PAYG y milestone: fixed genera invoices automaticas segun terminos; PAYG/milestone dependen de submission y approval. Referencia: `https://www.deel.com/solutions/payroll/contractors/`.
- Oyster modela fixed contractors y PAYG contractors con invoices auto-generadas o enviadas por contractor, approval/dispute queue y estados separados de charge/payout. Referencias: `https://docs.oysterhr.com/v0.1/docs/invoicing-at-oyster` y `https://www.oysterhr.com/how-it-works/global-contractors`.
- Remote y Oyster separan invoice de contractor, invoice/charge al cliente y payout al contractor, con tracking de estado. Referencia Remote: `https://remote.com/global-hr/contractor-invoicing-and-payments`.
- Para Chile, SII declara retencion de boletas de honorarios `15.25%` desde `2026-01-01`. Referencia oficial: `https://www.sii.cl/destacados/boletas_honorarios/index.html`.

## Core Thesis

Un contractor no es un `payroll_entry` mensual dependiente ni un `final_settlement`.

La unidad canonica para contractor es:

```text
Person
  -> PersonLegalEntityRelationship(type=contractor|honorarios|service_provider)
    -> ContractorEngagement
      -> WorkSubmission / Invoice
        -> ContractorPayable
          -> Finance Payment Obligation
            -> Finance Payment Order
```

Por lo tanto:

- `Payroll` sigue siendo owner de nomina dependiente y snapshots referenciales de payroll internacional.
- `FinalSettlement` sigue siendo solo cierre laboral dependiente Chile.
- `Finance` sigue siendo owner de obligations, payment orders, expense payments, settlement legs y banco.
- `Contractor Engagements` gobierna contrato, modalidad de pago, evidencia de trabajo e invoice/boleta antes de que Finance pague.
- `Person Legal Entity Relationships` sigue siendo la raiz juridica/economica persona -> entidad legal.

## Non-Negotiable Distinctions

### 1. Misma persona, nueva relacion

Valentina Hoyos conserva el mismo `identity_profile`. La relacion `employee/indefinido` cerrada no se muta a contractor.

El nuevo contrato debe crear o reutilizar una relacion separada:

- V1 runtime TASK-789: `relationship_type='contractor'` y, para honorarios, `metadata_json.relationshipSubtype='honorarios'`
- `effective_from='2026-05-04'`
- `effective_to=NULL` mientras este activa
- `source_of_truth='workforce_relationship_transition' | 'manual_hr' | 'contractor_engagement'`

Regla anti-regresion TASK-789: la apertura de esta relacion no debe actualizar `members.contract_type`, no debe crear `compensation_versions`, no debe crear `payroll_adjustments` y no debe habilitar `final_settlements`. El pago contractor nace en tareas posteriores desde `ContractorEngagement -> WorkSubmission/Invoice -> ContractorPayable -> Finance`.

### 2. Contractor payment no es payroll adjustment

No se deben usar `payroll_adjustments` para pagar semanas, hitos, proyectos o boletas de contractor.

Rationale:

- ajustes viven sobre un `payroll_entry` ya materializado
- contractor payables nacen desde contrato/evidencia/invoice
- mezclar ambos romperia regimen, retencion, audit y Finance

### 3. Contractor cierre no es finiquito

Un contractor/honorarios no habilita:

- `greenhouse_payroll.final_settlements`
- `greenhouse_payroll.final_settlement_documents`
- `Calcular finiquito`
- AFP/salud/AFC/IUSC dependiente

Su cierre vive como `contractor_engagement_termination` o `contractor_closure`, con evidencia contractual/proveedor.

### 4. Riesgo de clasificacion laboral es first-class

Si un contractor tiene senales de subordinacion/dependencia, Greenhouse no debe resolverlo con calculo automatico.

Senales de riesgo:

- horario fijo impuesto
- jefatura directa y control disciplinario
- exclusividad o dependencia economica material
- continuidad identica a la relacion laboral anterior
- uso de cargo interno indistinguible de empleado
- pagos recurrentes sin entregables/invoice/evidencia

Salida canonica: `classification_risk_status='legal_review_required'` y bloqueo de aprobacion/pago segun politica.

## Canonical Objects

### ContractorEngagement

Agregado que representa el contrato operativo de prestacion de servicios.

Tabla propuesta:

- `greenhouse_hr.contractor_engagements`

Campos minimos:

| Campo | Semantica |
| --- | --- |
| `contractor_engagement_id` | PK estable |
| `public_id` | ID humano |
| `profile_id` | persona canonica |
| `member_id` | faceta operativa si participa en delivery/capacity |
| `person_legal_entity_relationship_id` | relacion juridica/economica activa |
| `legal_entity_organization_id` | pagador/contratante legal |
| `country_code` | pais fiscal/operativo declarado |
| `tax_residency_country_code` | pais de residencia fiscal declarada, puede diferir del pais operativo |
| `relationship_subtype` | `honorarios_cl`, `freelance`, `independent_professional`, `international_contractor`, `provider_platform` |
| `payroll_via` | `internal`, `deel`, `remote`, `oyster`, `manual_provider`, `direct_international`, futuro |
| `currency` | moneda contractual |
| `payment_currency` | moneda en que se pagara si difiere de la contractual |
| `fx_policy_code` | regla de FX: fecha de tasa, quien absorbe spread y moneda de obligacion |
| `provider_contract_id` | contrato externo si Deel/Remote/Oyster u otro provider es source |
| `provider_worker_id` | worker/person id externo si aplica |
| `payment_model` | ver catalogo abajo |
| `rate_type` | `fixed`, `hourly`, `daily`, `milestone`, `project`, `retainer` |
| `rate_amount` | monto base |
| `payment_cadence` | `weekly`, `biweekly`, `semi_monthly`, `monthly`, `milestone`, `on_invoice`, `off_cycle` |
| `requires_invoice` | invoice/boleta obligatoria antes de payable |
| `requires_work_approval` | evidencia aprobada antes de payable |
| `tax_compliance_owner` | `greenhouse_policy`, `provider_owned`, `manual_review_required`, `country_engine_owned` |
| `tax_withholding_policy_code` | ej. `cl_honorarios_2026_15_25` |
| `classification_risk_status` | `clear`, `needs_review`, `legal_review_required`, `blocked` |
| `status` | `draft`, `pending_review`, `active`, `paused`, `ending`, `ended`, `cancelled` |
| `start_date` | inicio contractual |
| `end_date` | termino planificado si aplica |
| `metadata_json` | evidencia externa, Deel contract id, terms, scope |

### ContractorWorkSubmission

Agregado de evidencia de trabajo.

Tabla propuesta:

- `greenhouse_hr.contractor_work_submissions`

Tipos:

- `timesheet`
- `milestone`
- `deliverable`
- `project_fee`
- `expense`
- `off_cycle_adjustment`

Estados:

- `draft`
- `submitted`
- `approved`
- `disputed`
- `rejected`
- `cancelled`

Reglas:

- No genera pago por si solo.
- Debe ser aprobado por owner operacional antes de crear payable si `requires_work_approval=true`.
- Debe preservar evidence refs: proyecto, sprint, asset, documento, aprobador, fecha.

### ContractorInvoice

Agregado de invoice/boleta.

Tabla propuesta:

- `greenhouse_hr.contractor_invoices`

Tipos:

- `contractor_submitted`
- `system_generated_fixed`
- `system_generated_milestone`
- `provider_imported`

Estados:

- `draft`
- `submitted`
- `approved`
- `disputed`
- `rejected`
- `scheduled`
- `paid`
- `cancelled`

Campos criticos:

- `invoice_number`
- `invoice_date`
- `service_period_start`
- `service_period_end`
- `gross_amount`
- `tax_withholding_amount`
- `net_amount`
- `currency`
- `document_asset_id`
- `external_provider_invoice_id`
- `external_provider_payout_id`
- `sii_folio` para Chile si aplica
- `retention_rate_snapshot`

### Contractor Invoice Upload / Asset Contract

Decision canonica: las invoices/boletas que emiten contractors en sus paises se suben por el uploader compartido de Greenhouse, no por un bucket nuevo ni por URLs libres.

Runtime existente a reutilizar:

- UI: `src/components/greenhouse/GreenhouseFileUploader.tsx`
- API: `POST /api/assets/private`
- Registry/audit: `greenhouse_core.assets` y `greenhouse_core.asset_access_log`
- Bytes: bucket privado GCS resuelto por `GREENHOUSE_PRIVATE_ASSETS_BUCKET` o `greenhouse-private-assets-{env}`
- Storage helper: `src/lib/storage/greenhouse-assets.ts`

Reglas:

- Nunca guardar `gs://`, signed URLs o links externos como contrato primario de invoice.
- `contractor_invoices.document_asset_id` apunta al asset canonico adjunto.
- Soportes adicionales viven en una tabla hija propuesta `greenhouse_hr.contractor_invoice_assets`.
- Reemplazar una invoice adjunta crea nuevo asset/version y evento; no se sobreescribe el documento historico.
- Dedup por `content_hash` evita duplicar el mismo archivo en pending uploads.
- Todo download pasa por `/api/assets/private/[assetId]` con auth, access policy y audit trail.

Contextos nuevos propuestos para extender `GreenhouseAssetContext` y los maps de `greenhouse-assets.ts`:

- `contractor_invoice_draft`
- `contractor_invoice`
- `contractor_work_evidence_draft`
- `contractor_work_evidence`
- `provider_invoice_draft`
- `provider_invoice`
- `provider_payout_statement`

Retention classes propuestas:

- `contractor_invoice` para boletas/invoices emitidas por personas naturales o contractors directos.
- `contractor_work_evidence` para timesheets, milestone evidence y entregables que soportan approval.
- `provider_supporting_doc` para statements de Deel/Remote/Oyster, charge invoices, payout reports y provider fees.

Tabla hija propuesta:

- `greenhouse_hr.contractor_invoice_assets`

Campos minimos:

- `invoice_asset_id`
- `contractor_invoice_id`
- `asset_id`
- `asset_role`: `invoice_pdf`, `tax_xml`, `tax_certificate`, `work_evidence`, `provider_statement`, `payout_receipt`, `fx_receipt`, `other_supporting_doc`
- `artifact_kind`: `human_readable`, `tax_structured`, `provider_report`, `payment_proof`, `evidence`
- `source`: `contractor_upload`, `hr_upload_on_behalf`, `finance_upload_on_behalf`, `provider_import`, `system_generated`
- `country_code`
- `uploaded_by_user_id`
- `created_at`

Upload surfaces:

- Contractor/self-service: el contractor con faceta `member` sube su propia boleta/invoice y evidencia del trabajo.
- HR: sube on behalf cuando el contractor no tiene acceso al portal o cuando hay regularizacion documental.
- Finance: sube soporte de pago, FX receipt o provider charge/payout statement.
- Provider import: integra documentos de Deel/Remote/Oyster como assets privados o como refs externas cuando el proveedor no entrega archivo.

Access policy:

- Contractor: puede subir y descargar sus propias invoices/evidencias si `owner_member_id` coincide con su member facet.
- HR: puede leer/revisar invoices, work evidence y classification evidence del engagement.
- Finance: puede leer invoices aprobadas, provider statements, payout receipts y FX evidence para obligacion/pago.
- EFEONCE_ADMIN: acceso administrativo auditado.
- Provider statements no se exponen al contractor por defecto si contienen fees, margins, otros trabajadores o informacion comercial del proveedor.

Entitlements propuestos:

- `hr.contractor_invoice.upload_on_behalf`
- `hr.contractor_invoice.review`
- `hr.contractor_work_evidence.review`
- `finance.contractor_invoice.read`
- `finance.contractor_payment_evidence.manage`
- `my.contractor_invoice.upload`

MIME policy V1:

- Siempre aceptar `application/pdf`, `image/jpeg`, `image/png`, `image/webp`.
- Para paises donde la factura electronica oficial es XML/JSON, aceptar `application/xml`, `text/xml` o `application/json` solo en contextos `contractor_invoice_draft`/`contractor_invoice` con `asset_role='tax_xml'` y validation especifica por pais.
- No aceptar ZIP ni ejecutables para invoice V1 salvo task explicita con antivirus/inspection y retention policy separada.

Readiness:

- `ready_for_finance` exige invoice principal adjunta cuando `requires_invoice=true`.
- Si el pais exige artefacto tributario estructurado, falta de `tax_xml` bloquea readiness solo cuando exista policy pais que lo declare obligatorio.
- Invoice con archivo externo no importado queda en `manual_review_required`, no en ready.
- El payable conserva `contractor_invoice_id` y Finance conserva `source_aggregate_type='contractor_payable'` para trazabilidad end-to-end.

### ContractorPayable

Agregado de obligacion economica aprobada, previo a Finance.

Tabla propuesta:

- `greenhouse_hr.contractor_payables`

Estados:

- `pending_readiness`
- `ready_for_finance`
- `obligation_created`
- `payment_order_created`
- `paid`
- `cancelled`
- `blocked`

Campos:

- `contractor_engagement_id`
- `invoice_id`
- `work_submission_id`
- `gross_amount`
- `withholding_amount`
- `net_payable`
- `currency`
- `due_date`
- `payment_profile_id`
- `tax_compliance_owner`
- `fx_policy_code`
- `finance_obligation_id`
- `payment_order_id`
- `readiness_json`
- `source_snapshot_json`

## Payment Models

### fixed_recurring

Monto fijo por cadencia.

Ejemplos:

- retainer semanal
- retainer mensual
- bolsa fija de servicios

Regla:

- puede auto-generar invoice/payable, pero debe pasar readiness y dispute window.

### weekly_timesheet

Pago semanal por horas/dias aprobados.

Regla:

- requiere `ContractorWorkSubmission(type='timesheet')`
- calcula `gross = approved_units * rate`
- genera invoice/payable solo con aprobacion operacional

### milestone

Pago contra entregable/hito.

Regla:

- requiere milestone definido en engagement o scope
- solo se paga cuando el hito pasa a `approved`

### project_fee

Monto cerrado por proyecto.

Regla:

- puede dividirse en installments/milestones
- no requiere timesheet si el contrato define entregables

### payg_invoice

El contractor emite invoice/boleta por trabajo prestado.

Regla:

- Greenhouse no inventa monto
- valida invoice, retencion y evidencia antes de payable

### off_cycle

Pago excepcional.

Ejemplos:

- ajuste
- reimbursement
- bono pactado
- correccion de invoice disputada

Regla:

- requiere reason, approval y evidencia estructurada

## Chile Honorarios Policy

Para `relationship_subtype='honorarios_cl'`:

- No aplicar AFP, Fonasa/Isapre, AFC, SIS, mutual ni IUSC dependiente.
- Aplicar retencion SII de boletas de honorarios segun fecha de emision.
- Para 2026, tasa canonica actual: `15.25%`.
- La retencion debe versionarse en `tax_withholding_policy_code` + snapshot de tasa.
- Boleta/invoice es evidencia de pago; si el pago se hace antes de la boleta, el flujo debe explicitar excepcion y deuda documental.
- Readiness debe consumir `person-legal-profile` con use case `honorarios_closure` o equivalente: RUT/documento verificado como blocker; direccion puede ser warning o blocker segun politica tributaria/documental.

Formula V1:

```text
gross_amount = monto bruto boleta/invoice o monto contractual aprobado
withholding_amount = round(gross_amount * retention_rate)
net_payable = gross_amount - withholding_amount
```

Si el contractor emite boleta con retencion asumida por el pagador, `net_payable` debe cuadrar contra el documento. Si no cuadra, readiness bloquea.

## Provider / Deel Boundary

Para `payroll_via in ('deel', 'remote', 'oyster', 'manual_provider')`:

- Greenhouse puede almacenar engagement, work submissions y snapshots operativos.
- El proveedor puede ser source of truth de invoice, payout, compliance local y contrato legal.
- Greenhouse no calcula impuestos locales extranjeros salvo engine especifico futuro.
- Finance debe clasificar economicamente como `labor_cost_external` o categoria equivalente, no como supplier overhead generico.
- Si el proveedor agrega charge + payout, Greenhouse debe distinguir:
  - factura/cargo proveedor a Efeonce
  - payout al contractor
  - fees/plataforma/FX

## International Contractor Policy

`contractor` no significa automaticamente `honorarios_cl`.

Greenhouse trabaja internacionalmente, por lo que la clasificacion debe resolver primero:

1. pais operacional del servicio (`country_code`)
2. residencia fiscal declarada (`tax_residency_country_code`)
3. entidad legal contratante (`legal_entity_organization_id`)
4. canal de payroll/pago (`payroll_via`)
5. moneda contractual y moneda de pago (`currency`, `payment_currency`)
6. owner del contrato/compliance (`greenhouse`, `provider`, `legal_review`)

### Decision matrix

| Escenario | relationship_subtype | payroll_via | Tax owner | Payment owner | Regla |
| --- | --- | --- | --- | --- | --- |
| Contractor residente fiscal Chile con boleta | `honorarios_cl` | `internal` | Greenhouse/SII policy | Finance via payment order | Retencion SII versionada; no payroll dependiente |
| Contractor internacional pagado por Deel | `international_contractor` | `deel` | Deel/provider | Provider payout + Finance provider charge | Greenhouse registra snapshot, costos, fees y reconciliacion |
| Contractor internacional pagado directo | `international_contractor` | `direct_international` | Legal/tax review o policy pais futuro | Finance payment order/FX route | Invoice requerida; no impuestos locales automaticos sin engine |
| EOR | `provider_platform` | `deel`/`remote`/`oyster` | Provider como legal employer | Provider charge | No contractor directo; costo laboral externo |
| Proveedor empresa/factura comercial | fuera de contractor engagement | Finance AP | Finance/tax AP | Finance AP | No crear member/contractor si es vendor comercial |

### International direct contractor

Para `payroll_via='direct_international'`:

- Greenhouse gestiona engagement, invoice, evidence, payment profile, FX y approval.
- Greenhouse no calcula impuestos locales del pais del contractor salvo que exista `tax_withholding_policy_code` jurisdiccional aprobado.
- Default V1: `tax_withholding_policy_code='manual_review_required'` o `none_by_default_providerless` segun decision legal documentada.
- El payable debe incluir:
  - `country_code`
  - `tax_residency_country_code`
  - `currency`
  - `payment_currency`
  - `fx_policy_code`
  - invoice/document evidence
  - payment route readiness

### International provider contractor

Para `payroll_via in ('deel','remote','oyster')`:

- Provider puede ser owner de contrato, tax/compliance local, invoice y payout.
- Greenhouse no debe duplicar calculo de payout legal. Debe registrar:
  - `provider_contract_id`
  - `provider_worker_id`
  - `external_provider_invoice_id`
  - `external_provider_payout_id`
  - charge amount
  - payout amount cuando el provider lo exponga
  - provider fee
  - FX fee/spread
  - status de invoice/charge/payout
- Finance debe clasificar economicamente:
  - payout/costo labor externo como `labor_cost_external` o lane provider payroll equivalente
  - fee de plataforma como fee/proveedor de servicio, no como remuneracion
  - FX fee como costo financiero/FX segun politica Finance

### FX policy

No convertir moneda silenciosamente.

Todo contractor payable internacional debe declarar:

- moneda contractual (`currency`)
- moneda de pago (`payment_currency`)
- fecha de tasa (`fx_rate_date_policy`: `invoice_date`, `approval_date`, `payment_date`, `provider_reported`)
- fuente de tasa (`fx_rate_source`: `greenhouse_fx`, `provider`, `bank`, `manual`)
- quien absorbe spread/comision (`fx_spread_owner`: `company`, `contractor`, `provider`, `shared`)

Si no existe tasa o ruta FX confiable, readiness bloquea `ready_for_finance`.

### Country-specific engines

V1 no implementa calculos tributarios/previsionales fuera de Chile honorarios.

Regla:

- si no existe engine por pais, usar `manual_review_required`
- el sistema puede pagar invoice aprobada, pero debe dejar evidencia de que tax/compliance no fue calculado por Greenhouse
- agregar un pais nuevo requiere task especifica de compliance, no un if inline

### Classification risk international

El riesgo de reclasificacion tambien aplica internacionalmente.

Senales adicionales:

- contractor trabaja full-time con estructura de empleado
- se le asigna manager, horario y herramientas internas como dependiente
- pagos fijos sin invoice/evidencia durante periodos largos
- cambio inmediato de empleado a contractor sin cambio real de scope
- contrato via provider no coincide con realidad operacional

Salida:

- `classification_risk_status='needs_review'` al detectar senales
- `legal_review_required` si el riesgo es material
- bloqueo de auto-approval de payables hasta resolucion

## Valentina Hoyos Scenario

Estado esperado:

```text
identity_profile: Valentina Hoyos

relationship A:
  type: employee
  contract_type: indefinido
  pay_regime: chile
  payroll_via: internal
  effective_to: 2026-04-30
  offboarding_case: executed
  final_settlement: approved/remediated

relationship B:
  type: contractor / honorarios
  relationship_subtype: honorarios_cl or international_contractor
  effective_from: 2026-05-04
  status: active or pending_review
  contractor_engagement: required
  payment_model: selected by business
```

Recommended setup for Valentina V1:

- Si Valentina reside/tributa en Chile y emite boleta: `relationship_subtype='honorarios_cl'`, `payroll_via='internal'`, retencion SII `15.25%` para 2026.
- Si Valentina reside/tributa fuera de Chile y se paga por Deel/Remote/Oyster: `relationship_subtype='international_contractor'`, `payroll_via='deel'|'remote'|'oyster'`; provider owner de contrato/payout/compliance, Greenhouse owner de snapshot/reconciliacion/costo.
- Si Valentina reside/tributa fuera de Chile y se paga directo: `relationship_subtype='international_contractor'`, `payroll_via='direct_international'`, invoice requerida, `tax_withholding_policy_code='manual_review_required'` hasta que exista policy pais.
- `payment_model='weekly_timesheet'` si se paga por dedicacion semanal aprobada.
- `payment_model='milestone'` si el trabajo nuevo es por entregables cerrados.
- `classification_risk_status='needs_review'` al crearlo, por continuidad inmediata despues de relacion indefinida.
- Si mantiene horario, jefe, subordinacion o tareas indistinguibles de empleado: `legal_review_required`.
- No crear finiquito nuevo para esta relacion. Su cierre futuro sera `contractor_closure`.

## Lifecycle

### Engagement lifecycle

```text
draft
  -> pending_review
  -> active
  -> paused
  -> ending
  -> ended
  -> cancelled
```

Hard gates:

- `active` exige relacion persona-entidad activa.
- `active` exige payment profile approved o waiver temporal.
- `active` exige classification risk no bloqueante.
- `active` exige tax policy si `country_code='CL'`.

### Invoice/payable lifecycle

```text
work submitted / invoice submitted
  -> operational approval
  -> tax/payment readiness
  -> contractor_payable.ready_for_finance
  -> finance.payment_obligation.generated
  -> finance.payment_order.approved/submitted/paid
```

Finance sigue cerrando el pago. HR/Contractor domain no toca banco directamente.

## Resolved Architecture Decisions

Estas decisiones cierran las preguntas pendientes antes de crear epic/tasks. Si una implementacion futura contradice este bloque, debe actualizar esta arquitectura antes de escribir runtime.

### Physical ownership

`ContractorEngagement`, `ContractorWorkSubmission`, `ContractorInvoice` y `ContractorPayable` viven conceptualmente en Workforce/HR, no en Payroll.

Decision V1:

- schema fisico preferido: `greenhouse_hr`
- modulo TS preferido: `src/lib/workforce/contractors/**` o `src/lib/hr-core/contractors/**` segun patron vigente al implementar
- Payroll puede exponer compatibility readers para honorarios legacy, pero no debe ser owner del aggregate contractor
- Finance consume solo `contractor_payable.ready_for_finance`

Rationale:

- contractor payment nace desde contrato/evidencia/invoice, no desde una nomina mensual
- evita contaminar `payroll_entries` con pagos por proyecto, milestone o provider payout
- mantiene Finance como owner de banco y payment orders

### Member facet creation

`contractor_engagements` no crea `member` automaticamente.

Decision V1:

- crear/reutilizar `member_id` solo si el contractor participa en delivery, capacity, org chart operativo, People 360 interno o evaluaciones/collaboration surfaces
- no crear `member` para vendor-like contractors que solo emiten invoice comercial
- cuando no hay `member_id`, el engagement sigue anclado en `profile_id` + `person_legal_entity_relationship_id`

Rationale:

- `member` es faceta operativa, no prueba legal de contrato
- evita inflar roster/capacity/payroll con proveedores que no son colaboradores operativos
- preserva Person 360 como raiz humana cuando si hay continuidad de colaboracion

### Approval model

No hay auto-approval de contractor payables en V1.

Decision V1:

- toda invoice/work submission que genera payable requiere aprobacion explicita
- fixed recurring puede auto-generar draft invoice/payable, pero no pasar a `ready_for_finance` sin approval
- cualquier waiver debe tener reason, actor, expiration y audit trail

Rationale:

- los riesgos principales son clasificacion laboral, evidencia insuficiente, FX y duplicidad de invoice
- auto-approval puede venir en V2 solo si reliability signals, dispute windows y policy maturity estan probados

### VAT / IVA and commercial vendors

Contractor Payables no reemplaza Finance AP.

Decision V1:

- boleta honorarios Chile y contractor invoices personales viven en Contractor Engagements
- facturas comerciales de empresas/proveedores viven en Finance AP
- VAT/IVA de proveedores no-honorarios queda fuera de Contractor Payables V1
- si una empresa proveedora presta servicios, no crear `member` ni `contractor_engagement` salvo que haya una persona natural operativa que Greenhouse deba modelar

Rationale:

- mezcla de AP proveedor con contractor personal rompe economic category, VAT/SII y workforce roster
- Finance ya tiene ledger, expenses y payment orders para proveedores comerciales

### Tax/compliance owner

Cada engagement debe declarar `tax_compliance_owner`.

Valores canonicos:

- `greenhouse_policy`: Greenhouse tiene policy aprobada para calcular retencion/tratamiento, por ejemplo `honorarios_cl`
- `provider_owned`: Deel/Remote/Oyster u otro provider es owner de compliance/payout local
- `manual_review_required`: no existe engine/policy; legal/finance debe revisar antes de aprobar payables
- `country_engine_owned`: futuro, cuando exista engine por pais especifico

Default V1:

- `honorarios_cl` -> `greenhouse_policy`
- `payroll_via in ('deel','remote','oyster')` -> `provider_owned`
- `direct_international` -> `manual_review_required`

### KPI and bonus treatment

Los bonos variables no se infieren ni se omiten por ser contractor.

Decision V1:

- si el engagement incluye bono OTD/RPA/ICO, el payable debe consumir snapshot ICO o bloquear readiness
- si el provider paga el bono, Greenhouse igual debe registrar source snapshot y reconciliation evidence
- si el contrato no incluye bonos, el engagement debe declararlo explicitamente

Rationale:

- la skill Payroll marca KPI como invariante tambien para international workers
- evita pagos fuera de Greenhouse que luego dejan P&L y People 360 inconsistentes

### Payment profile and sensitive data

Todo payable debe resolver ruta de pago antes de Finance.

Decision V1:

- `payment_profile_id` aprobado es blocker para `ready_for_finance`, salvo waiver temporal con expiration
- datos bancarios sensibles siguen usando reveal/audit/capability existentes de Finance
- provider payout rails no reemplazan payment profile interno: se guardan como provider refs y se reconcilian contra provider invoice/payout

### Duplicate and idempotency policy

El sistema debe bloquear pago duplicado por invoice/submission.

Decision V1:

- uniqueness logica por `(contractor_engagement_id, invoice_id)` cuando hay invoice
- uniqueness logica por `(contractor_engagement_id, work_submission_id, payable_kind)` cuando no hay invoice aun
- bridge a Finance debe ser idempotente por `contractor_payable_id`
- payment order line debe conservar `source_aggregate_type='contractor_payable'` y `source_aggregate_id`

### Closure policy

Contractor closure es un aggregate/flow propio, no offboarding laboral dependiente.

Decision V1:

- cierre contractor verifica invoices pendientes, work submissions abiertas, provider termination refs, access handoff y activos/documentos
- no crea `final_settlement`
- no usa causal DT ni documento de finiquito laboral
- si hay disputa o risk `legal_review_required`, no permite cierre automatico

### Scope boundaries

Fuera de V1:

- motor tributario global por pais
- crypto/stablecoins
- auto-approval recurrente
- VAT/IVA de facturas comerciales
- benefits internacionales provider-owned
- reemplazar Deel/Remote/Oyster como sistema legal/compliance
- reemplazar Payment Orders de Finance

## Integration Map

### Person / Identity

Consumes:

- `identity_profiles`
- `person_identity_documents`
- `person_addresses`
- `person_legal_entity_relationships`

Rules:

- persona sigue siendo una
- cada relacion tiene lifecycle propio
- access principal puede existir aunque no haya relacion laboral dependiente

### Workforce Offboarding

Consumes/extends:

- `work_relationship_offboarding_cases`

Rules:

- `relationship_transition` puede cerrar employee y abrir contractor
- contractor closure no dispara final settlement laboral
- identity offboarding sigue separado

### Payroll

Consumes:

- contractor classification for exclusion/readiness

Rules:

- payroll mensual dependiente excluye relacion employee cerrada
- contractor payables no entran como `payroll_entries`
- honorarios payroll legacy debe converger hacia Contractor Payables si el pago nace por invoice/boleta flexible

### Finance

Consumes:

- `contractor_payable.ready_for_finance`

Produces/owns:

- `payment_obligations`
- `payment_orders`
- `expense_payments`
- `settlement_legs`
- bank impact

Rules:

- contractor payable aprobado genera obligation, no payment directo
- economic category debe ser `labor_cost_external` o `payroll`/`provider_payroll` segun source
- payment profile resolver sigue siendo canonicamente reutilizable

### Delivery / Projects

Consumes/provides:

- evidence refs for milestones, timesheets, deliverables, project scopes

Rules:

- approval del trabajo debe poder venir de owner operacional
- payable no debe depender solo de texto libre

## Events

Eventos canonicos V1:

- `workforce.contractor_engagement.created.v1`
- `workforce.contractor_engagement.activated.v1`
- `workforce.contractor_engagement.paused.v1`
- `workforce.contractor_engagement.ended.v1`
- `workforce.contractor_work_submission.submitted.v1`
- `workforce.contractor_work_submission.approved.v1`
- `workforce.contractor_invoice.submitted.v1`
- `workforce.contractor_invoice.approved.v1`
- `workforce.contractor_payable.ready_for_finance.v1`
- `workforce.contractor_payable.cancelled.v1`
- `workforce.contractor_classification_risk.flagged.v1`

Finance bridge event:

- input: `workforce.contractor_payable.ready_for_finance.v1`
- output: `finance.payment_obligation.generated.v1`

## Access Model

No reutilizar permisos de finiquito para contractor payables.

Decision V1:

- `routeGroups`: `hr`, `finance`
- `views`:
  - `equipo.contractors` o tab dentro de `equipo.offboarding`/People 360 en V1
  - `finance.payment-obligations` y `finance.payment-orders` existentes
- `entitlements`:
  - `hr.contractor_engagement.read`
  - `hr.contractor_engagement.manage`
  - `hr.contractor_invoice.upload_on_behalf`
  - `hr.contractor_work_submission.review`
  - `hr.contractor_invoice.review`
  - `hr.contractor_payable.approve`
  - `hr.contractor_classification.review`
  - `finance.contractor_invoice.read`
  - `finance.contractor_payment_evidence.manage`
  - `my.contractor_invoice.upload`
  - `finance.payment_orders.*` existente para pago
- `startup policy`: sin cambio por defecto; solo afecta entrypoints visibles si una task futura crea view nueva.

## Reliability Signals

Signals propuestos:

- `hr.contractor_engagement.classification_risk_open`
  - severity: warning/error segun edad y monto pendiente
  - steady state: 0 bloqueantes
- `hr.contractor_payables.ready_without_payment_profile`
  - severity: error
  - steady state: 0
- `hr.contractor_invoices.unapproved_past_due`
  - severity: warning
  - steady state: configurable
- `hr.contractor_payables.finance_bridge_lag`
  - severity: error si payable ready no genera obligation en ventana SLA
- `finance.provider_payroll.unclassified_expenses`
  - severity: warning/error
  - steady state: 0 post reconciliation
- `hr.contractor_payables.missing_tax_owner`
  - severity: error
  - steady state: 0
- `hr.contractor_payables.fx_readiness_blocked`
  - severity: warning/error segun due date
  - steady state: 0 vencidos
- `hr.contractor_payables.duplicate_candidate`
  - severity: error
  - steady state: 0
- `hr.contractor_bonus.missing_ico_snapshot`
  - severity: error cuando el engagement declara bono OTD/RPA/ICO
  - steady state: 0

## Data Quality / Readiness

Engagement readiness:

- person legal identity verified
- active person-legal-entity relationship
- country and tax policy present
- tax/compliance owner explicit
- payment profile approved or waiver present
- classification risk reviewed
- contract terms/scope present
- KPI/bonus policy explicit: none, fixed, or ICO-backed
- member facet decision explicit: required, not_required, or pending

Payable readiness:

- approved invoice or approved work submission
- invoice asset attached when `requires_invoice=true`
- country-required structured tax artifact attached when a country policy declares it mandatory
- gross/net/retention reconcile
- currency explicit
- FX policy and rate source explicit when `currency != payment_currency`
- due date present
- no duplicate payable for same invoice/submission
- payment route resolvable
- tax/compliance owner resolved
- provider charge/payout/fee split present when provider-owned
- ICO snapshot present when bonus is configured
- finance bridge not already consumed

## Migration Strategy

No migrar todo payroll/honorarios de una vez.

Fase 0 — Architecture and tasks:

- este documento
- task specs para runtime slices

Fase 1 — Relationship transition:

- cerrar employee
- abrir contractor relationship
- surface People 360 muestra historial y relacion activa

Fase 2 — Contractor engagements:

- CRUD engagement
- payment model
- classification risk

Fase 3 — Invoices/work submissions:

- timesheet/milestone/PAYG submissions
- approvals/disputes

Fase 4 — Payables -> Finance:

- generate payment obligation
- reuse payment profiles/payment orders
- no direct bank mutation

Fase 5 — Chile honorarios:

- retention policy versioning
- boleta evidence
- SII/F29 evidence hooks

Fase 6 — Provider imports:

- Deel/Remote/Oyster imports
- reconcile charge/payout/fees

## Implementation Scopes

No asignar IDs aqui a mano si el registro ya avanzo. Al crear la epic/tasks, usar el siguiente ID disponible en `docs/tasks/TASK_ID_REGISTRY.md`.

Suggested task set:

- Workforce Relationship Transition Foundation
- Contractor Engagements + Payment Models
- Contractor Work Submissions + Invoices
- Contractor Invoice Assets + Uploader Contexts
- Contractor Payables to Finance Payment Orders Bridge
- Chile Honorarios Compliance + Readiness Layer
- International Contractor / Provider Boundary + FX Policy
- Classification Risk + Legal Review Control Plane
- Provider Contractor Imports (Deel/Remote/Oyster)

## Closed Questions

Todas las preguntas originalmente abiertas quedan resueltas en `Resolved Architecture Decisions`:

- Chile honorarios y contractor source aggregates viven bajo Workforce/HR; Payroll queda consumidor/compatibility reader.
- `member_id` no se crea automaticamente; solo cuando existe participacion operacional.
- weekly/fixed payables no tienen auto-approval en V1.
- VAT/IVA y facturas comerciales quedan en Finance AP, fuera de Contractor Payables V1.
