# Greenhouse Final Settlement V1 — Canonical Spec (Renuncia Voluntaria)

> **Tipo:** Spec arquitectonica canonica (TASK-862 + TASK-863 V1.1-V1.5)
> **Version:** V1.5
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
- Ley 14.908 mod. Ley 21.389/2021 (pension de alimentos — declaracion obligatoria en finiquito). Texto operativo: **art. 13 de la Ley 14.908** (obligacion del empleador en finiquito).
- DL 3.500 art. 19 (cotizaciones previsionales).

## Delta 2026-05-11 V1.1 — Auto-regeneracion canonica al transicionar

**Decisión**: el PDF persistido como asset privado se regenera AUTOMATICAMENTE cuando el documento transita a `issued` o `signed_or_ratified`. Helper privado `regenerateDocumentPdfForStatus` en `src/lib/payroll/final-settlement/document-store.ts` reemplaza el `pdf_asset_id` del MISMO documento (sin bump versión, sin alterar state machine, sin reissue).

**Por qué**: antes el PDF se renderizaba UNA SOLA VEZ en `documentStatus='rendered'` con watermark "PROYECTO". Cuando el operador transitaba a `issued` y descargaba el PDF para llevar al notario, salía con watermark — incorrecto per la matriz canónica (issued → CLEAN). "Reemitir" crea v+1 y obliga a recorrer el flow completo de nuevo. UX rota.

**Matriz canónica de watermark**:

| documentStatus | Watermark | Severity |
|---|---|---|
| `rendered` | "PROYECTO" | warning |
| `in_review` | "PROYECTO" | warning |
| `approved` | "PROYECTO" | warning |
| `issued` | **CLEAN** | — |
| `signed_or_ratified` | **CLEAN** | — |
| `blocked` | "BLOQUEADO" | error |
| `rejected` | "RECHAZADO" | error |
| `voided` | "ANULADO" | error |
| `superseded` | "REEMPLAZADO" | neutral |

`renderFinalSettlementDocumentPdf(snapshot, options?: { documentStatus?: string | null })` acepta documentStatus explícito. Backward-compat: callsites sin documentStatus caen al patrón inferido por `ratification + readiness`.

**Idempotente**: si el render falla, la transición ya commiteo (UPDATE document_status). El operador puede usar Reemitir para recovery. El asset PDF viejo NO se borra; `pdf_asset_id` apunta al nuevo asset (audit trail completo).

## Delta 2026-05-11 V1.4 — Helper canonico Legal Signatures

**Decisión**: las firmas digitalizadas del representante legal del empleador viven como recurso canónico reutilizable en `@/lib/legal-signatures` (NO ad-hoc por flow).

**Spec dedicada**: [GREENHOUSE_LEGAL_SIGNATURES_PLATFORM_V1.md](GREENHOUSE_LEGAL_SIGNATURES_PLATFORM_V1.md).

**Snapshot extension**: `snapshot.employer.legalRepresentativeSignaturePath` (string | null). Cargado en `getEmployerSnapshot` via `buildSignatureFilenameForTaxId(taxId)` canonical. Render del PDF resuelve con `resolveLegalRepresentativeSignaturePath()`.

**Forward-compat V2**: migrar storage a asset privado canónico (`greenhouse_core.assets` retention class `legal_signature` + FK en `organizations.legal_representative_signature_asset_id`). Misma signature pública del helper.

## Delta 2026-05-11 V1.5 — 5 bloqueantes legales cerrados

Comprehensive audit por skills `greenhouse-payroll-auditor` + UX writing es-CL formal-legal + modern-ui detectó 5 bloqueantes pre-emision real. V1.5 los cierra:

### B-1 Cláusula PRIMERO separa hitos legales distintos

Antes: "carta de renuncia ratificada con fecha {X}" mezclaba fecha de suscripción (firma trabajador) con fecha de ratificación notarial art. 177 CT. **Vicio legalmente defendible** en demanda.

Ahora: `FiniquitoClauseParams` expone 2 campos separados:

- `resignationNoticeSignedAt`: fecha de suscripción del trabajador (DD-MM-YYYY, obligatorio).
- `resignationNoticeRatifiedAt`: fecha de ratificación notarial (DD-MM-YYYY, null hasta ratificación).

Copy state-conditional:

- Pre-ratificación → "suscrita por el(la) trabajador(a) con fecha {signedAt}, **cuya ratificación ante ministro de fe se efectuará** conforme al artículo 177 del Código del Trabajo."
- Post-ratificación → "suscrita por el(la) trabajador(a) con fecha {signedAt}, **ratificada ante ministro de fe el {ratifiedAt}** conforme al artículo 177 del Código del Trabajo."

### B-2 Cláusula SEGUNDO verbo performativo state-conditional

Antes: "declara recibir en este acto, a su entera satisfacción..." aunque el documento estuviera en `rendered`/`in_review`/`approved`/`issued` (no ratificado). El verbo performativo presume acto consumado → **vicio de consentimiento** defendible.

Ahora: `FiniquitoClauseSegundoParams` expone `isRatified: boolean`. Render condicional:

- Pre-ratificación → "declara que **recibirá**, al momento de la ratificación ante ministro de fe, a su entera satisfacción..." (futuro condicional).
- Post-ratificación → "declara **haber recibido** en este acto, a su entera satisfacción..." (perfecto consumado).

### B-3 Cláusula CUARTO cita artículo operativo Ley 14.908

Antes: "Ley N° 14.908, modificada por la Ley N° 21.389 de 2021" citaba solo la modificatoria sin el artículo operativo → jurídicamente débil.

Ahora: "**artículo 13 de la Ley N° 14.908 sobre Abandono de Familia y Pago de Pensiones Alimenticias**, en su texto modificado por la Ley N° 21.389 de 2021."

### B-4 Simetría visual 3 columnas firma enterprise

Antes: empleador (firma renderizada cruzando línea) + trabajador/ministro (líneas vacías más abajo) producía asimetría visual que rompía formalismo legal.

Ahora: `signatureColumn` con `paddingTop: 36` reserva ESPACIO SIMÉTRICO arriba de la línea en las 3 columnas. `signatureImageEmployer` absoluta en `top: 0` ancla al espacio reservado. **Líneas de las 3 columnas caen al MISMO Y absoluto** → balance enterprise. Trabajador y ministro tienen el espacio en blanco esperando firma física presencial en notaría.

### B-5 Title legal DOMINA visualmente vs KPI monto

Antes: title "Finiquito de contrato de trabajo" 18pt vs KPI $121.963 16pt (ratio 1.125x, marketing pattern). El KPI competía con el acto jurídico.

Ahora: title 20pt Poppins Bold + KPI 14pt Poppins SemiBold (ratio 1.43x). Notarios/abogados leen primero el ACTO, después el monto — patrón legal canónico (cf. Stripe Invoice template / Banco Chile finiquitos).

### Audit trace

Comprehensive audit enterprise ejecutado live 2026-05-11:

- `greenhouse-payroll-auditor`: verdict `pass_with_warnings` sobre cálculo de Valentina Hoyos ($121.963 = feriado proporcional 6.78 días corridos × $17.988,6 base diaria). Componentes correctos para renuncia voluntaria.
- UX writing es-CL formal-legal: 3 bloqueantes legales detectados (B-1, B-2, B-3) + 5 importantes + 3 polish.
- modern-ui + DESIGN.md: 2 bloqueantes visuales (B-4, B-5) + 8 importantes + 5 polish.

Restantes 12 importantes + 6 polish quedan como follow-up V1.6 no bloqueante.

### Verificación V1.5 end-to-end

PDF V1.5 emitido en staging (Valentina Hoyos, settlement v2 d12, asset `asset-ecf491dc-...`). Verificado via `pdftotext` + crop visual:

- ✅ PRIMERO copy state-conditional (issued: "cuya ratificación... se efectuará"; ratified: "ratificada... el {ratifiedAt}").
- ✅ SEGUNDO verbo state-conditional (issued: "declara que recibirá"; ratified: "declara haber recibido").
- ✅ CUARTO cita art. 13 Ley 14.908.
- ✅ Las 3 líneas de firma alineadas al mismo Y absoluto.
- ✅ Title 20pt domina; KPI 14pt sutil.

## Delta 2026-05-11 V1.5.2 — Lifecycle PDF defense-in-depth (regen canónico en TODAS las transiciones)

**Trigger**: bug detectado por usuario en re-emisión real (Valentina Hoyos, settlement v2 d15) — operador aprobó el documento pero al descargar el asset persistido seguía mostrando "Borrador HR" + watermark "PROYECTO". Root cause: `regenerateDocumentPdfForStatus` solo se invocaba en transitions `issued` y `signed_or_ratified`; las 5 restantes (`in_review`, `approved`, `voided`, `rejected`, `superseded`) dejaban el PDF stale respecto al estado actual de DB.

**Bug class más amplio** que el síntoma puntual: source-of-truth divergence entre `final_settlement_documents.document_status` (DB) y el render baked-in del asset (`metadata_json.documentStatusAtRender`). Sin invariante explícito, cualquier transición nueva agregada al state machine sin recordar llamar al helper reintroduce el bug.

**Solución defense-in-depth (5 capas)**:

1. **Helper canónico extendido** — `regenerateDocumentPdfForStatus` ahora acepta el set canónico cerrado `'in_review' | 'approved' | 'issued' | 'signed_or_ratified' | 'voided' | 'rejected' | 'superseded'`. Las 7 transiciones del state machine ahora lo invocan dentro de la misma tx PG que el UPDATE.
2. **Asset metadata canónica** — cada regen persiste `metadata_json.documentStatusAtRender = newStatus` en `greenhouse_core.assets`. Initial draft creation también persiste con `'rendered'`.
3. **Observability vía `captureWithDomain('payroll', ...)`** — reemplaza `console.warn` raw del path de regen failure. Tags `source: 'final_settlement_pdf_regen'` + `stage: newStatus` para Sentry rollup canónico bajo subsystem `Payroll`.
4. **Reliability signal nuevo** — `payroll.final_settlement_document.pdf_status_drift` ([src/lib/reliability/queries/final-settlement-pdf-status-drift.ts](../../../src/lib/reliability/queries/final-settlement-pdf-status-drift.ts)) detecta `document_status != asset.metadata_json->>'documentStatusAtRender'`. Kind `drift`, severity warning si count>0, error si drift>24h. Wire-up en `getReliabilityOverview` source `finalSettlementPdfStatusDrift`. Steady=0.
5. **Test anti-regresión** — `document-status-regen-invariant.test.ts` parsea el source y verifica que TODA `SET document_status = 'X'` (excepto `rendered`) tiene un call matchedo a `regenerateDocumentPdfForStatus(client, ..., 'X', ...)`. 9 tests verde. Rompe build si un agente futuro agrega transition sin regen.

**Failure mode canónico (degradación honesta)**:

Si el render del PDF falla (e.g. RAM exhausted, fuente externa caída, snapshot corrupto), la transition de estado en DB **ya commiteó** — el estado legal es source of truth y NO se bloquea por un fallo de render. El error se reporta a Sentry via `captureWithDomain` con tags suficientes para diagnóstico. El reliability signal alertará drift hasta que el operador haga reissue (path explícito de recovery) o un reactive consumer regenere async (futuro V1.5.3 si emerge necesidad).

**Hard rules canonizadas** en [CLAUDE.md](../../../CLAUDE.md#final-settlement-document-lifecycle-invariants-task-863-v152):

- NUNCA UPDATE document_status sin call al helper en la misma tx.
- NUNCA Sentry.captureException directo en regen path (usar captureWithDomain).
- NUNCA persistir PDF sin metadata.documentStatusAtRender.
- NUNCA bloquear transition si render falla.
- NUNCA agregar transition nueva al state machine sin extender (a) type union, (b) helper call, (c) matriz watermark/badge, (d) test anti-regresión.
- NUNCA modificar la key `documentStatusAtRender` sin actualizar paralelamente reader del signal + test.
- SIEMPRE preservar `pdf_asset_id` previo cuando regen retorna null (pattern `regenerated ? {...document, pdfAssetId, contentHash} : document`).

**Verificación V1.5.2 end-to-end**:

- ✅ 12 tests verde en `src/lib/payroll/final-settlement` (incluye 9 nuevos del invariante).
- ✅ `pnpm tsc --noEmit` clean.
- ✅ Helper canónico invocado en las 7 transiciones del state machine (verified via grep + test anti-regresión).
- ✅ Reliability signal wirea bajo `getReliabilityOverview.finalSettlementPdfStatusDrift`.
- ✅ Operador re-aprueba el doc → próximo download muestra badge "Aprobado · pendiente de emisión" (no más "Borrador HR").

**Recovery path para drift histórico**: documentos pre-V1.5.2 con `metadata.documentStatusAtRender` NULL aparecen en el reliability signal hasta que el operador haga reissue. NO se requiere backfill masivo — el reissue manual es suficiente y preserva audit trail.
