# Greenhouse Final Settlement V1 — Canonical Spec (Renuncia Voluntaria)

> **Tipo:** Spec arquitectonica canonica (TASK-862)
> **Version:** V1.0
> **Fecha:** 2026-05-11
> **Estado:** Activa en produccion. La revision por abogado laboralista chileno es **recomendada** (no bloqueante); el operador HR decide cuando solicitarla. Greenhouse genera el PDF; la validez legal final la da el sello fisico del ministro de fe.
> **Causal soportada:** art. 159 N°2 CT — renuncia voluntaria del trabajador.
> **Out of scope V1:** otras 8 causales (art. 159 N°1/4/5, art. 160, art. 161 incs. 1/2, art. 161 bis, art. 163 bis), honorarios closure, contractors, Deel/EOR, internacional.

## 1. Aplicabilidad

Aplica a casos de offboarding con:

- `separation_type = 'resignation'`
- `contractType IN ('indefinido', 'plazo_fijo')`
- `payRegime = 'chile'`
- `payrollVia = 'internal'`
- `ruleLane = 'internal_payroll'`

Cualquier otra combinacion bloquea el calculo (`worker_regime_supported` readiness check) y queda fuera de scope hasta V2.

## 2. Pre-requisitos operacionales

Antes de poder calcular el finiquito, HR debe completar 3 pre-requisitos persistidos en `greenhouse_hr.work_relationship_offboarding_cases`:

1. **Carta de renuncia ratificada** (`resignation_letter_asset_id` no nulo). Upload via `POST /api/hr/offboarding/cases/[caseId]/resignation-letter` con FK validacion a `greenhouse_core.assets`. Readiness check `resignation_letter_uploaded` (blocker) lo enforce.
2. **Declaracion Ley 21.389 pension de alimentos** (`maintenance_obligation_json` no nulo). Upload via `POST /api/hr/offboarding/cases/[caseId]/maintenance-obligation` con validacion: variant + amount/beneficiary cuando subject. Readiness check `maintenance_obligation_declared` (blocker).
3. **Domicilio del trabajador** (TASK-784 `person_addresses` con `address_type='residence'`). Readiness check `worker_address_resolved` (warning, no blocker — permite emitir con advertencia).

## 3. Componentes del breakdown (9 codigos canonicos)

El calculator emite SOLO los componentes que los datos justifican. Cuando un componente no aplica (e.g. `monthly_gratification_due` cuando `gratificacionLegalMode='ninguna'`), NO se emite.

| Component code | Treatment | Cuando se emite |
|---|---|---|
| `pending_salary` | `remuneration` / `taxable_monthly` / `contribution_base` | Hay dias devengados del mes en curso no cubiertos por nomina mensual |
| `pending_fixed_allowances` | `remuneration` / `taxable_monthly` o `non_income` segun bonus | Haberes fijos proporcionales (colacion + movilizacion + remote allowance + fixed bonus) |
| `monthly_gratification_due` | `remuneration` / `taxable_monthly` / `contribution_base` | `gratificacionLegalMode='anual_proporcional'` con meses devengados > 0; tope art. 50 CT (4,75 × IMM / 12 × mesesDevengados, cap 12) |
| `pending_vacation_carryover` | `legal_indemnity` / `non_income` / `not_contribution_base` | `leaveBalance.carriedOverDays + progressiveExtraDays > 0`; pago proporcional sobre dailyVacationBase |
| `proportional_vacation_current_period` | `legal_indemnity` / `non_income` / `not_contribution_base` | Resto del derecho disponible despues del carryover; regla DT art. 73 (dias corridos compensados) |
| `used_or_advanced_vacation_adjustment` | `authorized_deduction` / `not_applicable` / `not_contribution_base` | `leaveBalance.availableDays < 0` (uso por adelantado); descuento positivo expresado como deduction |
| `statutory_deductions` | `authorized_deduction` / `not_applicable` / `not_applicable` | Pendiente base remuneracional > 0; AFP + Salud + Cesantia + IUSC + APV sobre delta only (no duplica nomina mensual) |
| `authorized_deduction` | `authorized_deduction` / `not_applicable` / `not_contribution_base` | Descuentos manuales explicitos (e.g. prestamos pendientes, anticipos) con `sourceRef` evidence |
| `payroll_overlap_adjustment` | `informational` (kind ortogonal) / `not_applicable` / `not_applicable` | Siempre como linea informational con amount=0 documentando coveredByMonthlyPayroll, periodId, periodStatus |

## 4. Snapshot extension (TASK-862 v2)

`FinalSettlementDocumentSnapshot` v2 agrega 4 dimensiones opcionales sobre v1:

```ts
interface FinalSettlementDocumentSnapshot {
  // v1 fields preservados
  collaborator: {
    // ...existing fields...
    addressLine1?: string | null      // TASK-862 — TASK-784 person_addresses
    city?: string | null
    region?: string | null
    addressPresentation?: string | null
  }
  employer: {
    // ...existing fields...
    logoAssetId?: string | null       // TASK-862 — greenhouse_core.organizations.logo_asset_id
  }
  maintenanceObligation?: FinalSettlementMaintenanceObligation | null
  resignationLetterAssetId?: string | null
  ratification?: FinalSettlementRatification | null
}

interface FinalSettlementMaintenanceObligation {
  variant: 'not_subject' | 'subject'
  amount?: number          // subject only
  beneficiary?: string     // subject only
  evidenceAssetId?: string // optional
  declaredAt: string
  declaredByUserId: string
}

interface FinalSettlementRatification {
  ministerKind: 'notary' | 'labor_inspector' | 'union_president' | 'civil_registry'
  ministerName: string
  ministerTaxId: string
  notaria: string | null
  ratifiedAt: string
}
```

Snapshots pre-2026-05-11 (`documentTemplateVersion='2026-05-04.v1'`) lecturas backwards-compat: PDF renderer trata todos los campos nuevos como opcionales con fallback null.

## 5. Matriz `documentStatus → watermark`

| documentStatus | Watermark | Audiencia |
|---|---|---|
| `rendered`, `in_review`, `approved` | "PROYECTO" warning tonal (`rgba(247,144,9,0.10)`) | Solo HR interno |
| `issued` | **CLEAN** (sin watermark) | PDF que el trabajador imprime y lleva al notario |
| `signed_or_ratified` | CLEAN + datos ministro de fe embebidos | Sistema de registro post-ratificacion |
| `rejected`, `voided` | "RECHAZADO"/"ANULADO" error tonal | Auditoria / archivo |
| `superseded` | "REEMPLAZADO" neutral tonal | Auditoria / archivo |

**Principio canonico**: el watermark es senal interna de Greenhouse, NO marca legal. La practica chilena estandar (caso BICE 2026-05-08) no lleva watermark; el sello del notario + firmas + huella son los que dan validez legal.

## 6. Clausulas narrativas del PDF (texto canonico en `src/lib/copy/finiquito.ts`)

5 clausulas obligatorias parametrizables via `GH_FINIQUITO.resignation.clauses`:

- **PRIMERO**: declaracion de servicios + cita expresa **art. 159 N°2 CT** + referencia a carta de renuncia ratificada + art. 177 CT.
- **SEGUNDO**: declaracion de pago + modalidad (transferencia bancaria default) + monto en CLP + monto en letras (via `formatClpInWords` Slice B helper).
- **TERCERO**: finiquito amplio total y definitivo + renuncia a acciones + **declaracion Ley Bustos** (art. 162 inc. 5 CT + art. 19 DL 3.500).
- **CUARTO**: Ley 21.389 pension de alimentos (Alt A no afecto / Alt B afecto con monto + beneficiario + audit).
- **QUINTO**: prefacio al detalle de pago (la tabla detallada del breakdown).

## 7. Status pill semantics (preserved per readinessLabel)

| readinessStatus | Pill label | Color |
|---|---|---|
| `ready` | "Listo para firma" | success |
| `needs_review` | "Revisión interna requerida" | warning |
| `blocked` | "Bloqueado para firma" | error |

Ortogonal al watermark. Test landmark `document-pdf.test.tsx:144` asserta el string "Listo para firma" — preservar.

## 8. Outbox events (sin events nuevos en V1)

Los 11 events ya declarados en `EVENT_TYPES` (TASK-862 Slice C aclara: no agrega events nuevos):

- `payrollFinalSettlement{Calculated, Approved, Cancelled}`
- `hrFinalSettlementDocument{Rendered, SubmittedForReview, Approved, Issued, Rejected, Voided, Superseded, SignedOrRatified}`

`SignedOrRatified` publica `workerReservationOfRights` flag en payload; suficiente para downstream consumers ver si el trabajador consigno reserva.

## 9. Tests anti-regresion

12 test landmarks de `document-pdf.test.tsx` preservados + 6 nuevas assertions Slice D:

- 'ARTÍCULO 159 N°2 DEL CÓDIGO DEL TRABAJO'
- 'amplio, total y definitivo finiquito'
- 'artículo 162 inciso 5°' (Ley Bustos)
- 'Ministro de fe'
- 'Pendiente de ratificación'
- 'Documento generado con Greenhouse'

`calculator.test.ts` strict equality actualizada para 5 componentes default + tests nuevos para escenarios edge (anual_proporcional, carryover>0, usedAdvancedDays>0, overlap covered).

## 10. Activacion en produccion

V1 esta activa en produccion sin flag de gating. El operador HR puede usar el modulo
directamente desde `/hr/offboarding` para cualquier caso de renuncia voluntaria Chile
dependiente con payroll interno.

**Revision legal externa**: recomendada pero no bloqueante. Si emergen observaciones
de un abogado laboralista chileno durante uso real, se incorporan como Delta en este
spec + commits subsiguientes. No existe un toggle binario "habilitar/deshabilitar";
el operador es responsable de validar cada finiquito antes de presentarlo al ministro
de fe.

**Practica recomendada**: ejecutar el smoke E2E (carta renuncia → caso aprobado →
calculo → readiness ready → issue → ratify dialog → signed_or_ratified) sobre un caso
de prueba interno Efeonce antes del primer caso real con cliente Globe.

## 11. Out of scope (followups)

- **TASK V2** — otras 8 causales del CT + componentes indemnizacion (notice substitute, IAS, AFC offset, recargo art. 168).
- **RNDA integration** — consulta automatica Registro Nacional Deudores Alimentos (V1 acepta declaracion humana).
- **Firma electronica avanzada** — V1 solo ratificacion presencial registrada ex-post.
- **PDF/UA tagged accessibility** — follow-up V1.1.
- **`final_settlement_documents.worker_reservation_notes` rendered en PDF post-ratificacion** — V1 el texto solo se persiste; render del texto manuscrito embebido es V1.1.
- **`employer.logoAssetId` binary lookup** — V1 mantiene fallback hardcoded a logo Greenhouse; binary resolver via Vercel function es V1.1.
- **Honorarios closure** — engine separado (cierre de prestacion de servicios; no es finiquito formalmente).

## 12. Referencias normativas

- Codigo del Trabajo de Chile: art. 159 N°2 (renuncia), art. 162 inc. 5 (Ley Bustos), art. 177 (ratificacion), art. 178 (tratamiento ingreso no renta), art. 50 (gratificacion legal), art. 73 (feriado proporcional).
- DT (Direccion del Trabajo): `https://dt.gob.cl/portal/1628/w3-article-60200.html`, `https://www.dt.gob.cl/portal/1626/w3-article-117245.html`, `https://www.dt.gob.cl/portal/1628/w3-article-60573.html`, `https://www.dt.gob.cl/portal/1628/w3-article-60613.html`.
- SII: `https://www.sii.cl/preguntas_frecuentes/declaracion_renta/001_140_5683.htm` (ingresos no renta por vacaciones indemnizadas).
- Ley 14.908 mod. Ley 21.389/2021 (pension de alimentos — declaracion obligatoria en finiquito).
- DL 3.500 art. 19 (cotizaciones previsionales).
