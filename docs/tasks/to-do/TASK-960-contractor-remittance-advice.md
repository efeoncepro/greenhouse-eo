# TASK-960 — Contractor Remittance Advice (Comprobante de Pago)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr|finance`
- Blocked by: `none`
- Branch: `task/TASK-960-contractor-remittance-advice`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Los contractors (honorarios CL, freelance, independent professional, internacional, provider/EOR) NO reciben recibo de liquidación como los colaboradores dependientes — y no deben, porque su pago no es remuneración laboral. Pero hoy NO existe ningún documento que les confirme **qué se les pagó y con qué desglose**. Esta task crea el **Remittance Advice** (label es-CL **"Comprobante de Pago"**): una **proyección read-only del `ContractorPayable`** (TASK-793), jurisdiction-neutral, descargable desde el Self-Service Hub (TASK-796), que muestra bruto → retención → neto + referencia al documento del propio contractor, reforzando el límite no-laboral en vez de borrarlo.

## Why This Task Exists

El programa de contractors (TASK-790→796) modela el contrato, la evidencia, las work submissions, el payable y el bridge a Finance — pero deja un gap de transparencia hacia el contractor: cuando se le paga, no recibe ningún comprobante de la transacción. El colaborador dependiente tiene su recibo (TASK-758); el contractor no tiene equivalente.

El equivalente **no puede** ser un "recibo de liquidación" ni una "liquidación de honorarios":

- **Riesgo legal de clasificación**: "liquidación"/"recibo de sueldo" son términos del régimen laboral dependiente. Aplicarlos a un contractor refuerza indicios de subordinación/dependencia justo en el documento que queda como evidencia — lo opuesto a lo que cuidan TASK-794 (honorarios) y TASK-795 (`classification_risk`).
- **Riesgo de SSOT fiscal**: el documento tributario del contractor es **suyo** (Boleta de Honorarios Electrónica en CL; invoice en internacional), no nuestro. Nosotros **confirmamos el pago contra ese documento**, no emitimos su comprobante tributario.
- **Riesgo de no-escalabilidad**: nombrarlo "Comprobante de Pago de Honorarios" o anclarlo a SII/Chile no sirve para el contractor de Nicaragua (caso real Melkin), el freelance europeo o el provider US. El concepto debe ser jurisdiction-neutral.

El concepto contablemente correcto y global es un **Remittance Advice** (aviso de remesa / comprobante de pago): el documento que el **pagador entrega al beneficiario** detallando qué pagó, contra qué factura, con qué deducciones. Es estándar de cuentas por pagar en US/UK/EU/LATAM y no tiene connotación laboral.

## Goal

- Que cada `ContractorPayable` pagado tenga un **Comprobante de Pago / Remittance Advice** descargable y visible, derivado del payable (no un nuevo SSOT).
- Que el documento sea **jurisdiction-neutral** en título y estructura: el desglose (retención SII / withholding internacional / 0 si lo maneja el provider) se resuelve por la política de retención y `taxComplianceOwner`, nunca por el nombre.
- Que el documento **refuerce el límite no-laboral** (disclaimer explícito de prestación de servicios) y **referencie el documento tributario del propio contractor** (BHE/invoice).
- Que el contractor lo vea/descargue desde el Self-Service Hub (TASK-796) y Finance/HR desde el workbench admin.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` (spec raíz del programa contractor — V1.1 Delta 2026-05-30)
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` §25 (receipt-presenter pattern TASK-758, a espejar)
- `docs/architecture/GREENHOUSE_LEGAL_SIGNATURES_PLATFORM_V1.md` (helper canónico de firma del representante, si el documento la requiere)

Reglas obligatorias:

- **NUNCA** llamar al documento "liquidación", "recibo de liquidación" ni "recibo de sueldo". Canónico técnico: `Remittance Advice`. Label es-CL: **"Comprobante de Pago"** (microcopy via `src/lib/copy/*`, TASK-265 — invocar UX writing es-CL).
- **NUNCA** anclar el título/estructura a una jurisdicción o régimen (`honorarios`, `SII`, `Chile`). El título es único global; solo el **desglose** varía.
- **NUNCA** crear un SSOT nuevo. El documento es una **proyección read-only** del `ContractorPayable` (TASK-793, SSOT del monto/retención/neto). Cero recálculo de montos en el presenter — lee `grossAmount`/`withholdingAmount`/`netPayable`/`currency`/`paymentCurrency`/`fxPolicyCode` del payable.
- **NUNCA** tratar el documento como comprobante tributario del contractor. Es confirmación de pago del pagador; referencia el BHE/invoice del contractor (`contractorInvoiceId`, TASK-791) pero no lo reemplaza.
- **NUNCA** mostrar el documento al contractor sin re-validar acceso self (own) server-side (patrón `/api/my/*` member-scoped, TASK-796). Finance-only fields (provider fees/márgenes) NUNCA visibles al contractor.
- **NUNCA** invocar `Sentry.captureException` directo — usar `captureWithDomain(err, 'finance', ...)`.
- Invocar la skill `greenhouse-finance-accounting-operator` (régimen de retención + naming contable) y `greenhouse-ux-writing` (copy es-CL + disclaimer no-laboral) antes de implementar. El cálculo ya está cubierto por TASK-793/794 — esta task NO recalcula.

## Normative Docs

- `docs/tasks/complete/TASK-758-receipt-render-4-regimes.md` (pattern del presenter + PDF a espejar)
- `docs/tasks/complete/TASK-793-contractor-payables-finance-obligations-bridge.md` (SSOT del payable + campos)
- `docs/tasks/complete/TASK-794-chile-honorarios-compliance-sii-retention.md` (retención honorarios CL)
- `docs/tasks/complete/TASK-795-international-contractor-provider-boundary-fx-policy.md` (FX + boundary internacional)
- `docs/tasks/complete/TASK-796-contractor-self-service-hub.md` (hub donde se surfacea)

## Dependencies & Impact

### Depends on

- `ContractorPayable` (SSOT) — `src/lib/contractor-engagements/payables/types.ts` (`grossAmount`, `withholdingAmount`, `netPayable`, `currency`, `paymentCurrency`, `fxPolicyCode`, `contractorInvoiceId`) + `store.ts` (columnas `gross_amount`, `withholding_amount`, `net_payable`, `currency`, `payment_currency`, `fx_policy_code`, `contractor_invoice_id`).
- Contractor invoice assets (BHE/invoice del contractor) — `src/lib/contractor-engagements/invoice-assets.ts` (TASK-791).
- Self-Service Hub projection — `src/lib/contractor-engagements/self-service-projection.ts` + `self-service-scenario.ts` + `projection-types.ts` (TASK-796).
- Receipt presenter pattern — `src/lib/payroll/receipt-presenter.ts` + `src/lib/payroll/generate-payroll-pdf.tsx` (TASK-758, a espejar NO a reusar — encuadre legal opuesto).

### Blocks / Impacts

- Habilita el follow-up `Withholding Certificate` (es-CL "Certificado de Retención"; instancia CL = Certificado N°21 SII, anual/agregado) — documento legalmente requerido distinto al per-pago.
- Toca la UI del Self-Service Hub (TASK-796) — coordinar para no romper su projection.

### Files owned

- `src/lib/contractor-engagements/remittance/remittance-presenter.ts` (nuevo, pure)
- `src/lib/contractor-engagements/remittance/remittance-presenter.test.ts` (nuevo)
- `src/lib/contractor-engagements/remittance/generate-contractor-remittance-pdf.tsx` (nuevo)
- `src/lib/contractor-engagements/remittance/types.ts` (nuevo — `RemittanceAdvicePresentation`)
- `src/app/api/my/contractor/remittance/[payableId]/route.ts` (nuevo — download self, member-scoped)
- `src/app/api/hr/contractors/remittance/[payableId]/route.ts` (nuevo — download admin/finance)
- `src/views/greenhouse/contractors/ContractorSelfServiceView.tsx` (extender — CTA descarga)
- `src/lib/copy/*` (label "Comprobante de Pago" + disclaimer no-laboral)
- docs (spec Delta + doc funcional + manual)

## Current Repo State

### Already exists

- `ContractorPayable` con el desglose completo (`grossAmount`/`withholdingAmount`/`netPayable`/`currency`/`paymentCurrency`/`fxPolicyCode`) + estado `paid` (TASK-793 state machine).
- Política de retención resuelta por régimen (`taxComplianceOwner` + `taxWithholdingRateSnapshot`, TASK-790/794) + boundary internacional (TASK-795).
- Referencia al documento del contractor (`contractorInvoiceId` → invoice asset, TASK-791).
- Self-Service Hub runtime (`ContractorSelfServiceView`, projection canónica TASK-796).
- Pattern de presenter + PDF (`receipt-presenter.ts` + `generate-payroll-pdf.tsx`, TASK-758) + legal signatures helper (TASK-863).

### Gap

- No existe presenter ni PDF ni surface para un comprobante de pago del contractor. El contractor no recibe confirmación del pago.
- No existe el `Withholding Certificate` anual (follow-up).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Remittance presenter (pure, SSOT-derived)

- `RemittanceAdvicePresentation` type + `buildRemittanceAdvice(payable, opts)` pure function que mapea un `ContractorPayable` → struct declarativo: header (título neutro + N° comprobante), partes (pagador Efeonce / beneficiario contractor), **referencia al documento del contractor** (BHE/invoice), **breakdown rows** (bruto → retención [label resuelto por régimen: "Retención SII" / "Withholding" / omitida si provider] → neto), moneda + FX si `paymentCurrency != currency`, medio/referencia de pago, **disclaimer no-laboral**.
- Cero recálculo: lee los montos del payable verbatim. Si falta un campo, degrada honesto (no inventa FX ni montos).
- Tests: los 4+ casos del programa (honorarios CL con retención, internacional con withholding, internacional con withholding=0 provider-owned, cross-currency con FX).

### Slice 2 — PDF generator

- `generate-contractor-remittance-pdf.tsx` (`@react-pdf/renderer`) consumiendo el presenter. Espeja la estructura visual de TASK-758 pero con **encuadre legal opuesto** (sin "líquido a pagar" laboral; con disclaimer de servicios). Firma/logo Efeonce via legal-signatures helper si aplica (representante, NO firma del contractor).
- `RECEIPT`-style template version constant para regen idempotente.
- Tests + mockup vinculante (`docs/mockups/`) aprobado antes de mergear (Semantic Column Invariants + verificación visual con caso real, patrón TASK-863).

### Slice 3 — Surface en Self-Service Hub + download endpoints

- Endpoint `GET /api/my/contractor/remittance/[payableId]` (capability self own, payableId resuelto contra el engagement del subject — anti-IDOR) → PDF.
- Endpoint `GET /api/hr/contractors/remittance/[payableId]` (HR/Finance) → PDF.
- `ContractorSelfServiceView`: CTA "Descargar Comprobante de Pago" por payable `paid` + detalle visible del breakdown. Projection (TASK-796) expone disponibilidad del comprobante por payable pagado.

## Out of Scope

- El documento tributario del contractor (BHE/invoice) — es suyo, ya modelado como invoice asset (TASK-791).
- El **Withholding Certificate anual** (es-CL "Certificado de Retención" / Certificado N°21 CL) — follow-up, documento agregado/anual legalmente requerido, distinto al per-pago.
- Cualquier cambio al cálculo de monto/retención/neto (TASK-793/794/795 son el SSOT — esta task solo presenta).
- Comprobantes para colaboradores dependientes (ya cubierto por TASK-758).
- Motor de withholding internacional (TASK-905) — el comprobante muestra lo que el payable ya resolvió.

## Detailed Spec

**Naming canónico**: técnico/modelo = `Remittance Advice` (`ContractorRemittanceAdvice` / `remittance/`). Label visible es-CL = **"Comprobante de Pago"**. Prohibido: "liquidación", "recibo", "honorarios" en el título, "SII"/"Chile" en el título.

**Generalización (un documento, N jurisdicciones)** — solo varía el breakdown:

| Tipo contractor | Fila de retención |
|---|---|
| Honorarios CL | "Retención SII" (15.25% 2026, del `taxWithholdingRateSnapshot`) |
| Internacional (Deel/remote) | "Withholding" del país, o **omitida** si `taxComplianceOwner` provider/country-owned |
| Freelance / independent professional | "Withholding" aplicable o omitida |
| Provider / platform / EOR | sin fila de retención nuestra (la maneja el provider); muestra monto → neto |

**Disclaimer canónico** (validar copy con UX writing + finance/legal): "Pago por prestación de servicios profesionales. No constituye remuneración ni vínculo de subordinación o dependencia."

**Cuándo se genera/disponibiliza**: cuando el payable alcanza `paid` (confirmación real de pago). Forward-compat: preview en estados previos marcado "borrador/no pagado" si emerge necesidad (no V1).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (presenter pure) → Slice 2 (PDF, consume presenter) → Slice 3 (endpoints + UI, consumen PDF). Orden estricto: el PDF no existe sin presenter; la UI no descarga sin endpoint.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Documento implica vínculo laboral (naming/copy) | legal/classification | medium | naming canónico + disclaimer + review finance/legal con caso real | revisión humana (no signal) |
| Recálculo divergente de montos vs payable | finance | low | presenter lee payable verbatim, cero cálculo; test de paridad presenter↔payable | drift visible en QA |
| IDOR (contractor ve comprobante ajeno) | identity | medium | payableId resuelto server-side contra engagement del subject; Finance-only fields filtrados | logs 403 / acceso |
| Comprobante para payable no pagado | finance | low | gate por estado `paid`; preview marcado fuera de V1 | QA |

### Feature flags / cutover

- Sin flag — additive, read-only, gated por capability + estado del payable. Cutover inmediato. Revert: revert PR.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (módulo nuevo aislado) | <5 min | sí |
| Slice 2 | revert PR | <5 min | sí |
| Slice 3 | revert PR (endpoints + CTA nuevos) | <5 min | sí |

### Production verification sequence

1. Generar comprobante en staging para un payable `paid` real de cada tipo (honorarios CL + internacional) → verificar breakdown correcto contra el payable.
2. Verificación visual con caso real (Playwright + agent auth contractor) + 3-skill audit (finance + UX writing + visual) sobre el PDF emitido — patrón TASK-863.
3. Verificar anti-IDOR: contractor A no puede descargar comprobante de contractor B.
4. Repetir en producción.

### Out-of-band coordination required

- Review del disclaimer no-laboral + naming con finance/legal antes de emitir el primero a un contractor real (es-CL formal-legal).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `buildRemittanceAdvice(payable)` pure que deriva la presentación del `ContractorPayable` sin recalcular montos.
- [ ] El título del documento es único y jurisdiction-neutral ("Comprobante de Pago"); solo el breakdown varía por régimen.
- [ ] El documento muestra bruto → retención (resuelta por régimen) → neto + moneda + FX si cross-currency + referencia al BHE/invoice del contractor.
- [ ] El documento incluye el disclaimer no-laboral y NO usa "liquidación"/"recibo"/"honorarios"/"SII" en el título.
- [ ] El contractor descarga su comprobante desde el Self-Service Hub; no puede acceder al de otro (anti-IDOR).
- [ ] Finance/HR descargan desde el workbench admin.
- [ ] El comprobante solo está disponible para payables en estado `paid`.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `pnpm vitest run src/lib/contractor-engagements`
- `pnpm vitest run src/lib/payroll` (gate no-regresión del dominio payroll/contractor — patrón EPIC-013)
- Verificación visual con caso real (Playwright + agent auth) + 3-skill audit sobre el PDF emitido.

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomar, `complete` al cerrar)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-796 hub, TASK-797 closure)
- [ ] mockup vinculante creado/aprobado en `docs/mockups/` antes de mergear el PDF
- [ ] doc funcional + manual de uso del comprobante actualizados

## Follow-ups

- **Withholding Certificate** (es-CL "Certificado de Retención"; instancia CL = Certificado N°21 SII): documento anual/agregado de sumas pagadas + retenidas por año, legalmente requerido en CL para que el contractor presente su F22. Jurisdiction-neutral en nombre, contenido resuelto por jurisdicción. Task derivada propia.
- Preview del comprobante en estados previos a `paid` (marcado "no pagado") si emerge necesidad operativa.

## Open Questions

- ¿El comprobante lleva firma del representante legal de Efeonce (legal-signatures helper TASK-863) o basta logo + datos del pagador? (resolver con finance/legal — un remittance advice típicamente NO requiere firma, pero puede ser deseable para formalidad).
- ¿Numeración del comprobante (`N° comprobante`) es secuencial propia o deriva del `payableId`? (decisión de diseño en Plan Mode).
