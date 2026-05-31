# TASK-960 — Contractor Remittance Advice (Comprobante de Pago)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
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

Los contractors (honorarios CL, freelance, independent professional, internacional, provider/EOR) NO reciben recibo de liquidación como los colaboradores dependientes — y no deben, porque su pago no es remuneración laboral. Pero hoy NO existe ningún documento que les confirme **qué se les pagó y con qué desglose**. Esta task crea el **Remittance Advice** (label es-CL **"Comprobante de Pago"**): una **proyección read-only del `ContractorPayable`** (TASK-793), jurisdiction-neutral, que muestra **emisor (Operating Entity: datos legales + logo) → bruto → retención → neto + referencia al documento del propio contractor**, reforzando el límite no-laboral en vez de borrarlo.

**Tanto el contractor (Self-Service Hub) como el admin/Finance (Admin Workbench)** deben poder **verlo in-app** (visor) **y descargarlo en PDF** — ambas superficies, ambas acciones. Arquitectura: presenter struct único → visor MUI in-app + react-pdf descargable (patrón TASK-758, cero drift de contenido entre vista y PDF).

> **Alineación EPIC-017 (2026-05-31):** esta task se mantiene separada del hub People/Person 360. Remittance Advice es documento de contractor payable/finance/self-service, no source of truth workforce ni payroll. Person 360 Workforce (`TASK-961`) podrá linkear comprobantes pagados en el futuro, pero no debe generar ni recalcular este documento.

## Why This Task Exists

El programa de contractors (TASK-790→796) modela el contrato, la evidencia, las work submissions, el payable y el bridge a Finance — pero deja un gap de transparencia hacia el contractor: cuando se le paga, no recibe ningún comprobante de la transacción. El colaborador dependiente tiene su recibo (TASK-758); el contractor no tiene equivalente.

El equivalente **no puede** ser un "recibo de liquidación" ni una "liquidación de honorarios":

- **Riesgo legal de clasificación**: "liquidación"/"recibo de sueldo" son términos del régimen laboral dependiente. Aplicarlos a un contractor refuerza indicios de subordinación/dependencia justo en el documento que queda como evidencia — lo opuesto a lo que cuidan TASK-794 (honorarios) y TASK-795 (`classification_risk`).
- **Riesgo de SSOT fiscal**: el documento tributario del contractor es **suyo** (Boleta de Honorarios Electrónica en CL; invoice en internacional), no nuestro. Nosotros **confirmamos el pago contra ese documento**, no emitimos su comprobante tributario.
- **Riesgo de no-escalabilidad**: nombrarlo "Comprobante de Pago de Honorarios" o anclarlo a SII/Chile no sirve para el contractor de Nicaragua (caso real Melkin), el freelance europeo o el provider US. El concepto debe ser jurisdiction-neutral.

El concepto contablemente correcto y global es un **Remittance Advice** (aviso de remesa / comprobante de pago): el documento que el **pagador entrega al beneficiario** detallando qué pagó, contra qué factura, con qué deducciones. Es estándar de cuentas por pagar en US/UK/EU/LATAM y no tiene connotación laboral.

## Goal

- Que cada `ContractorPayable` pagado tenga un **Comprobante de Pago / Remittance Advice** con **numeración correlativa propia `EO-RA-NNNNNN`** (gapless, persistida, allocada atómicamente), derivado del payable (no un nuevo SSOT de montos).
- Que el documento lleve los **datos del emisor (Operating Entity: razón social, RUT/tax id, domicilio, logo)** resueltos desde `legal_entity_organization_id` (NUNCA hardcodeado "Efeonce/Chile" — multi-entidad forward-compat).
- Que el documento sea **jurisdiction-neutral** en título y estructura: el desglose (retención SII / withholding internacional / 0 si lo maneja el provider) se resuelve por la política de retención y `taxComplianceOwner`, nunca por el nombre.
- Que el documento **refuerce el límite no-laboral** (disclaimer explícito de prestación de servicios) y **referencie el documento tributario del propio contractor** (BHE/invoice).
- Que **tanto el contractor (Self-Service Hub, TASK-796) como el admin/Finance (Admin Workbench)** puedan **verlo in-app (visor MUI) Y descargarlo en PDF** — ambas superficies, ambas acciones.
- Que el documento sea **bilingüe (es-CL + en-US)** vía el i18n canónico de Greenhouse: el idioma se resuelve del **locale del contractor** (espejo de `src/lib/email/locale-resolver.ts` — el documento sigue al destinatario, no al viewer), con toggle es/en para el admin in-app. Montos/fechas/moneda formateados por locale (`src/lib/format/locale-context.ts`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` (spec raíz del programa contractor — V1.1 Delta 2026-05-30)
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` §25 (receipt-presenter pattern TASK-758, a espejar)
- `docs/architecture/GREENHOUSE_LEGAL_SIGNATURES_PLATFORM_V1.md` (helper canónico de firma del representante, si el documento la requiere)
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md` (solo como contexto de People hub/payment rail lineage; no convierte esta task en EPIC-017)

Reglas obligatorias:

- **NUNCA** llamar al documento "liquidación", "recibo de liquidación" ni "recibo de sueldo". Canónico técnico: `Remittance Advice`. Label es-CL: **"Comprobante de Pago"** (microcopy via `src/lib/copy/*`, TASK-265 — invocar UX writing es-CL).
- **NUNCA** anclar el título/estructura a una jurisdicción o régimen (`honorarios`, `SII`, `Chile`). El título es único global; solo el **desglose** varía.
- **NUNCA** crear un SSOT nuevo. El documento es una **proyección read-only** del `ContractorPayable` (TASK-793, SSOT del monto/retención/neto). Cero recálculo de montos en el presenter — lee `grossAmount`/`withholdingAmount`/`netPayable`/`currency`/`paymentCurrency`/`fxPolicyCode` del payable.
- **NUNCA** tratar el documento como comprobante tributario del contractor. Es confirmación de pago del pagador; referencia el BHE/invoice del contractor (`contractorInvoiceId`, TASK-791) pero no lo reemplaza.
- **NUNCA** mostrar el documento al contractor sin re-validar acceso self (own) server-side (patrón `/api/my/*` member-scoped, TASK-796). Finance-only fields (provider fees/márgenes) NUNCA visibles al contractor.
- **NUNCA** hardcodear los datos del emisor ("Efeonce", RUT, domicilio, logo). El emisor es la **Operating Entity** del payable, resuelta desde `contractor_engagements.legal_entity_organization_id` → `greenhouse_core.organizations` (`is_operating_entity=TRUE`) (TASK-795 D-795-5). Hoy es Efeonce Group SpA; el roadmap multi-entidad hereda gratis.
- **NUNCA** rendear el documento dos veces desde dos fuentes distintas. El visor MUI in-app y el PDF react-pdf consumen el **mismo `RemittanceAdvicePresentation` struct** → cero drift de contenido (patrón TASK-758). El visor in-app es MUI (responsive/accesible); el PDF es el artefacto descargable/imprimible.
- **NUNCA** convertir Person 360 en emisor/generador del Remittance Advice. Person 360 puede mostrar/linkear evidencia de payment rail; el documento vive en contractor/finance/self-service.
- **NUNCA** recomputar ni reasignar la numeración `EO-RA-NNNNNN`. Es correlativa **gapless** (un hueco = documento anulado = red flag de auditoría), allocada **atómicamente** y **persistida** una sola vez (la misma payable muestra siempre el mismo número). Disciplina de allocación: espejo de TASK-700 (`account_number_registry`, advisory lock), con formato `EO-` (convención correlativa Greenhouse, igual que Nexa `EO-AIS-*`).
- **NUNCA** invocar `Sentry.captureException` directo — usar `captureWithDomain(err, 'finance', ...)`.
- Invocar la skill `greenhouse-finance-accounting-operator` (régimen de retención + naming contable) y `greenhouse-ux-writing` (copy es-CL + disclaimer no-laboral) antes de implementar. El cálculo ya está cubierto por TASK-793/794 — esta task NO recalcula.

**⚠️ Reglas duras — MOCKUP APROBADO (cablear, NO rehacer)** (operador aprobó 2026-05-31):

- **NUNCA** rediseñar el visor ni el documento desde cero. El mockup en `src/views/greenhouse/contractors/mockup/` (`RemittanceAdviceViewer.tsx` + `RemittanceAdviceMockupView.tsx` + `remittance-data.ts`) está **aprobado y es vinculante**. La implementación **promueve y cablea** ese mockup a datos reales, NO lo reconstruye. Verificado via GVC (scenario `remittance-advice`, 5 frames, ambos locales) + auditoría modern-ui.
- **NUNCA** cambiar la dirección visual aprobada: **un solo acento** (verde `#2E7D32` en el neto pagado), título del documento **neutro** (`text.primary`, NO primary morado), chip de régimen **neutro** (`secondary`), disclaimer en **caja neutra** (`divider` + bg sutil, NO warning ámbar), logo Efeonce azul como única presencia de marca. Colapsar a un acento es la decisión de diseño aprobada — no reintroducir colores compitiendo.
- **SIEMPRE** promover el componente del mockup a su lugar canónico preservando el render: `RemittanceAdviceViewer.tsx` (mockup) → `src/components/greenhouse/contractors/RemittanceAdviceViewer.tsx` (compartido), consumiendo el struct canónico. El JSX/estructura/tokens NO cambian; solo cambia la fuente del struct (mock → presenter real).
- **SIEMPRE** convertir `buildRemittancePresentation(regime, locale)` (mock) en el presenter canónico `buildRemittanceAdvice(payable, issuer, locale)` (`src/lib/contractor-engagements/remittance/`) que produce el **mismo shape** `RemittancePresentation`. El shape del struct del mockup ES el contrato; el presenter real lo llena desde el `ContractorPayable` + Operating Entity + locale resuelto.
- **SIEMPRE** el react-pdf (`generate-contractor-remittance-pdf.tsx`) **reproduce la dirección visual del visor aprobado** (mismo struct, mismo layout, misma paleta de un acento). Visor MUI y PDF son dos renderers del mismo struct — NO dos diseños.
- **SIEMPRE** mover el copy es-CL/en-US inline del mock (`remittance-data.ts` COPY) a `src/lib/copy/dictionaries/{es-CL,en-US}/` (namespace nuevo) — el contenido de los strings está aprobado; solo cambia dónde viven. El locale lo resuelve `src/lib/email/locale-resolver.ts` pattern (locale del contractor).
- **SIEMPRE** integrar el visor en las superficies REALES (`ContractorSelfServiceView` + `ContractorAdminWorkbenchView`) replicando la integración mostrada en el mockup (sección "Comprobantes de pago" + tabla "Comprobantes emitidos" con CTAs Ver / Descargar PDF por payable `paid`).

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
- Self-Service Hub projection + views — `src/lib/contractor-engagements/self-service-projection.ts` + `self-service-scenario.ts` + `projection-types.ts` + `src/views/greenhouse/contractors/ContractorSelfServiceView.tsx` + `ContractorAdminWorkbenchView.tsx` (TASK-796).
- Receipt presenter pattern (presenter struct → MUI visor + react-pdf) — `src/lib/payroll/receipt-presenter.ts` + `src/lib/payroll/generate-payroll-pdf.tsx` (TASK-758, a espejar NO a reusar — encuadre legal opuesto).
- **Emisor (Operating Entity)** — `contractor_engagements.legal_entity_organization_id` (TASK-795) → `greenhouse_core.organizations` (`is_operating_entity=TRUE`: razón social, tax_id, domicilio). Logo: brand asset Efeonce (verificar fuente del que usan recibos TASK-758 / emails) — forward-compat logo per-Operating-Entity como asset.
- **Numbering allocator** — patrón de allocación atómica persistida de TASK-700 (`src/lib/finance/internal-account-number/` + `account_number_registry`), reusado con formato `EO-RA-NNNNNN` (gapless correlativo).

### Blocks / Impacts

- Habilita el follow-up `Withholding Certificate` (es-CL "Certificado de Retención"; instancia CL = Certificado N°21 SII, anual/agregado) — documento legalmente requerido distinto al per-pago.
- Toca la UI del Self-Service Hub (TASK-796) — coordinar para no romper su projection.

### Files owned

- `src/lib/contractor-engagements/remittance/remittance-presenter.ts` (nuevo, pure)
- `src/lib/contractor-engagements/remittance/remittance-presenter.test.ts` (nuevo)
- `src/lib/contractor-engagements/remittance/generate-contractor-remittance-pdf.tsx` (nuevo — react-pdf)
- `src/lib/contractor-engagements/remittance/types.ts` (nuevo — `RemittanceAdvicePresentation`)
- `src/lib/contractor-engagements/remittance/remittance-number-allocator.ts` (nuevo — `EO-RA-NNNNNN` atómico/gapless) + test
- `migrations/<ts>_task-960-remittance-advice-number.sql` (nuevo — columna/registry de numeración + persistencia del número por payable)
- `src/components/greenhouse/contractors/RemittanceAdviceViewer.tsx` (nuevo — visor MUI desde el struct, reusado por ambas superficies)
- `src/app/api/my/contractor/remittance/[payableId]/route.ts` (nuevo — view inline + download self, member-scoped)
- `src/app/api/hr/contractors/remittance/[payableId]/route.ts` (nuevo — view inline + download admin/finance)
- `src/views/greenhouse/contractors/ContractorSelfServiceView.tsx` (extender — visor + CTA descarga)
- `src/views/greenhouse/contractors/ContractorAdminWorkbenchView.tsx` (extender — visor + CTA descarga)
- `src/lib/copy/*` (label "Comprobante de Pago" + disclaimer no-laboral)
- docs (spec Delta + doc funcional + manual)

## Current Repo State

### Already exists

- `ContractorPayable` con el desglose completo (`grossAmount`/`withholdingAmount`/`netPayable`/`currency`/`paymentCurrency`/`fxPolicyCode`) + estado `paid` (TASK-793 state machine).
- Política de retención resuelta por régimen (`taxComplianceOwner` + `taxWithholdingRateSnapshot`, TASK-790/794) + boundary internacional (TASK-795).
- Referencia al documento del contractor (`contractorInvoiceId` → invoice asset, TASK-791).
- Self-Service Hub runtime (`ContractorSelfServiceView`, projection canónica TASK-796).
- Pattern de presenter + PDF (`receipt-presenter.ts` + `generate-payroll-pdf.tsx`, TASK-758) + legal signatures helper (TASK-863).
- **Mockup APROBADO (vinculante, 2026-05-31)** — el diseño visual ya está resuelto y aprobado por el operador. La implementación lo cablea, NO lo rehace:
  - `src/views/greenhouse/contractors/mockup/RemittanceAdviceViewer.tsx` — visor MUI (la dirección visual vinculante).
  - `src/views/greenhouse/contractors/mockup/RemittanceAdviceMockupView.tsx` — showcase con toggles locale/régimen + integración en ambas superficies.
  - `src/views/greenhouse/contractors/mockup/remittance-data.ts` — `RemittancePresentation` type + `buildRemittancePresentation(regime, locale)` mock (el shape ES el contrato).
  - `src/app/(dashboard)/my/contractor/remittance/mockup/page.tsx` — ruta del mockup.
  - `scripts/frontend/scenarios/remittance-advice.scenario.ts` — scenario GVC de regresión visual (ambos locales fullpage + variantes de régimen).

### Gap

- No existe presenter ni PDF ni surface para un comprobante de pago del contractor. El contractor no recibe confirmación del pago.
- No existe el `Withholding Certificate` anual (follow-up).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Numbering allocator (`EO-RA-NNNNNN`)

- `allocateRemittanceAdviceNumber(...)` atómico (advisory lock), **gapless correlativo**, persistido (columna en `contractor_payables` o registry dedicado) — el número se asigna **una sola vez** al emitir el comprobante de un payable `paid` y queda estable. Migración para la persistencia. Espeja la disciplina de TASK-700 con formato `EO-`.
- Tests: secuencialidad, idempotencia (re-emitir el mismo payable no re-asigna), formato `EO-RA-NNNNNN`.

### Slice 2 — Remittance presenter (pure, SSOT-derived)

- `RemittanceAdvicePresentation` type + `buildRemittanceAdvice(payable, issuer, opts)` pure function que mapea un `ContractorPayable` → struct declarativo: header (título neutro + **N° `EO-RA-NNNNNN`** + fecha de pago), **emisor (Operating Entity: razón social, tax id, domicilio, logo)**, beneficiario (contractor), **referencia al documento del contractor** (BHE/invoice), **breakdown rows** (bruto → retención [label resuelto por régimen: "Retención SII" / "Withholding" / omitida si provider] → neto), moneda + FX si `paymentCurrency != currency`, medio/referencia de pago, **disclaimer no-laboral**.
- Cero recálculo: lee los montos del payable verbatim. Issuer resuelto desde `legal_entity_organization_id` (no hardcode). Si falta un campo, degrada honesto (no inventa FX ni montos).
- Tests: los 4+ casos del programa (honorarios CL con retención, internacional con withholding, internacional con withholding=0 provider-owned, cross-currency con FX) + issuer resuelto correctamente.

### Slice 3 — PDF generator (react-pdf)

- `generate-contractor-remittance-pdf.tsx` (`@react-pdf/renderer`) consumiendo el presenter. **Logo + datos legales del emisor** en el header. Espeja la estructura visual de TASK-758 pero con **encuadre legal opuesto** (sin "líquido a pagar" laboral; con disclaimer de servicios). Firma del representante via legal-signatures helper (TASK-863) **solo si se decide** (ver Open Questions) — NUNCA firma del contractor.
- Template version constant para regen idempotente.
- Tests + mockup vinculante (`docs/mockups/`) aprobado antes de mergear (Semantic Column Invariants + verificación visual con caso real, patrón TASK-863).

### Slice 4 — Visor in-app + endpoints + ambas superficies

- `RemittanceAdviceViewer.tsx`: visor **MUI** que renderea el `RemittanceAdvicePresentation` struct in-app (responsive, accesible) — reusado por ambas superficies. Cero drift vs PDF (mismo struct).
- Endpoint `GET /api/my/contractor/remittance/[payableId]` (capability self own, payableId resuelto contra el engagement del subject — anti-IDOR): sirve el struct para el visor + el PDF (`?download` attachment / inline para "Ver PDF").
- Endpoint `GET /api/hr/contractors/remittance/[payableId]` (HR/Finance): idem.
- `ContractorSelfServiceView` **y** `ContractorAdminWorkbenchView`: por payable `paid`, visor MUI embebido + CTA "Descargar PDF" (+ opcional "Ver PDF"). Projection (TASK-796) expone disponibilidad + N° del comprobante por payable pagado.

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

**Emisor (Operating Entity)** — bloque de identidad del pagador en el header: razón social + tax id + domicilio resueltos desde `contractor_engagements.legal_entity_organization_id` → `greenhouse_core.organizations` (`is_operating_entity=TRUE`), + **logo** (brand asset). NUNCA hardcodeado. Hoy: Efeonce Group SpA (RUT 77.357.182-1). Multi-entidad: el comprobante de un contractor contratado por otra Operating Entity lleva los datos de ESA entidad, sin cambio de código.

**Numeración** — `EO-RA-NNNNNN`: prefijo `EO-` (convención correlativa Greenhouse, igual que Nexa `EO-AIS-*`), segmento de tipo `RA` (Remittance Advice), secuencia correlativa **gapless** zero-padded. Allocada **atómicamente** (advisory lock, espejo TASK-700) y **persistida una sola vez** al emitir el comprobante del payable `paid` → estable, idempotente, auditable. Un hueco en la serie = comprobante anulado = red flag (principio de audit-trail: numeración secuencial sin gaps).

**Arquitectura ver + descargar (cero drift)**: el `RemittanceAdvicePresentation` struct (presenter) es la única fuente de la presentación. Lo consumen DOS renderers — `RemittanceAdviceViewer` (MUI, visor in-app responsive/accesible) y `generate-contractor-remittance-pdf` (react-pdf, descargable/imprimible). El contenido (emisor, montos, retención, disclaimer, N°) no puede diverger entre vista y PDF porque ambos leen el mismo struct (patrón TASK-758). El visor MUI es la vista primaria in-app; el endpoint sirve además el PDF inline (`?inline`) para un "Ver PDF" fiel y `?download` (attachment) para descarga.

**Cuándo se genera/disponibiliza**: cuando el payable alcanza `paid` (confirmación real de pago). El número `EO-RA` se asigna en ese momento. Forward-compat: preview en estados previos marcado "borrador/no pagado" SIN número correlativo (no V1).

**Mapping mockup aprobado → implementación (cablear, NO rehacer)**:

| Mockup aprobado (existe) | Implementación canónica (cablear) | Qué cambia |
|---|---|---|
| `remittance-data.ts` → `RemittancePresentation` type | `src/lib/contractor-engagements/remittance/types.ts` | Mover el type tal cual (el shape ES el contrato). |
| `remittance-data.ts` → `buildRemittancePresentation(regime, locale)` mock | `src/lib/contractor-engagements/remittance/remittance-presenter.ts` → `buildRemittanceAdvice(payable, issuer, locale)` | Mismo shape de salida; la fuente pasa de mock a `ContractorPayable` + Operating Entity + locale resuelto. Cero recálculo de montos. |
| `remittance-data.ts` → `COPY` (es-CL/en-US inline) | `src/lib/copy/dictionaries/{es-CL,en-US}/` (namespace nuevo) | Strings aprobados; solo cambia dónde viven. |
| `mockup/RemittanceAdviceViewer.tsx` | `src/components/greenhouse/contractors/RemittanceAdviceViewer.tsx` | Promover sin tocar JSX/tokens; consume el struct canónico. |
| `mockup/RemittanceAdviceMockupView.tsx` (showcase) | integración en `ContractorSelfServiceView` + `ContractorAdminWorkbenchView` reales | El showcase NO se promueve; se replica la integración (sección "Comprobantes" + tabla) en las vistas reales. |
| (no existe en mock) | `generate-contractor-remittance-pdf.tsx` (react-pdf) | NUEVO, pero **reproduce** el visor aprobado desde el mismo struct (no es un diseño nuevo). |
| `scenarios/remittance-advice.scenario.ts` | reusar tal cual como regresión visual post-implementación | Apuntar a las superficies reales cuando dejen de ser mock. |

El agente que implemente: parte del mockup aprobado, NO de cero. La verificación visual final (real-artifact loop TASK-863) compara el PDF + visor reales contra el mockup aprobado (debe ser idéntico en dirección visual).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (numbering allocator) → Slice 2 (presenter pure, consume número + issuer) → Slice 3 (PDF, consume presenter) → Slice 4 (visor MUI + endpoints + ambas superficies, consumen presenter + PDF). Orden estricto: el presenter necesita el número y el issuer; el PDF y el visor no existen sin presenter; la UI no sirve sin endpoint. El visor MUI y el PDF DEBEN consumir el mismo struct del presenter (cero drift).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Documento implica vínculo laboral (naming/copy) | legal/classification | medium | naming canónico + disclaimer + review finance/legal con caso real | revisión humana (no signal) |
| Recálculo divergente de montos vs payable | finance | low | presenter lee payable verbatim, cero cálculo; test de paridad presenter↔payable | drift visible en QA |
| Drift contenido visor MUI ↔ PDF | finance/UI | low | ambos consumen el mismo struct del presenter (no dos fuentes); test que compara campos del struct | QA |
| Issuer hardcodeado (rompe multi-entidad) | finance/identity | medium | resolver desde `legal_entity_organization_id`; test con engagement de otra Operating Entity | QA / review |
| Hueco o duplicado en serie `EO-RA` | finance/audit | low | allocator atómico (advisory lock) + persistencia única + test de secuencialidad/idempotencia | gap en la serie (auditoría) |
| IDOR (contractor ve comprobante ajeno) | identity | medium | payableId resuelto server-side contra engagement del subject; Finance-only fields filtrados | logs 403 / acceso |
| Comprobante para payable no pagado | finance | low | gate por estado `paid`; preview marcado fuera de V1 | QA |

### Feature flags / cutover

- Sin flag — additive, read-only, gated por capability + estado del payable. Cutover inmediato. Revert: revert PR.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 (allocator + migración) | migración aditiva (columna/registry nuevo, sin backfill destructivo) → `migrate:down` + revert PR | <10 min | sí |
| Slice 2 (presenter) | revert PR (módulo nuevo aislado) | <5 min | sí |
| Slice 3 (PDF) | revert PR | <5 min | sí |
| Slice 4 (visor + endpoints + UI) | revert PR (endpoints + visor + CTA nuevos) | <5 min | sí |

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

- [ ] Existe `buildRemittanceAdvice(payable, issuer)` pure que deriva la presentación del `ContractorPayable` sin recalcular montos.
- [ ] El título del documento es único y jurisdiction-neutral ("Comprobante de Pago"); solo el breakdown varía por régimen.
- [ ] El documento muestra **emisor (Operating Entity: razón social, tax id, domicilio, logo)** resuelto desde `legal_entity_organization_id` (NO hardcodeado) → bruto → retención (resuelta por régimen) → neto + moneda + FX si cross-currency + referencia al BHE/invoice del contractor.
- [ ] El documento lleva número correlativo **`EO-RA-NNNNNN`** gapless, persistido y estable (re-emitir el mismo payable muestra el mismo número).
- [ ] El documento incluye el disclaimer no-laboral y NO usa "liquidación"/"recibo"/"honorarios"/"SII" en el título.
- [ ] **Tanto el contractor (Self-Service Hub) como el admin/Finance (Admin Workbench)** pueden **ver el comprobante in-app (visor MUI)** Y **descargarlo en PDF**; el contenido del visor y del PDF es idéntico (mismo struct).
- [ ] El contractor no puede acceder al comprobante de otro (anti-IDOR); Finance-only fields no visibles al contractor.
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

- ¿El comprobante lleva firma del representante legal de la Operating Entity (legal-signatures helper TASK-863) o basta logo + datos del emisor? (resolver con finance/legal — un remittance advice típicamente NO requiere firma, pero puede ser deseable para formalidad).
- **RESUELTO (operador 2026-05-31)**: numeración **correlativa propia `EO-RA-NNNNNN`** (no deriva del `payableId`), siguiendo la convención `EO-` de Greenhouse. Gapless, persistida, atómica.
- ¿La serie `EO-RA` es global única o por Operating Entity? (V1 global; evaluar serie per-entidad si una jurisdicción lo exige para el documento — decisión de diseño en Plan Mode, el allocator debe nacer preparado para scope per-issuer).

## Delta 2026-05-31

Refinamiento de scope post-creación (operador):

- **Ver + descargar, ambas superficies**: el contractor (Self-Service Hub) y el admin/Finance (Admin Workbench) deben poder **ver el comprobante in-app** (visor MUI `RemittanceAdviceViewer` desde el struct) **y descargarlo en PDF** (react-pdf). Decisión de arquitectura: presenter struct único → visor MUI + react-pdf, cero drift (patrón TASK-758).
- **Identidad del emisor**: el documento lleva razón social + tax id + domicilio + **logo** de la Operating Entity, resueltos desde `legal_entity_organization_id` (NUNCA hardcodeado — multi-entidad forward-compat).
- **Numeración correlativa propia `EO-RA-NNNNNN`** (gapless, atómica, persistida) — convención `EO-` de Greenhouse. Nueva Slice 1 (allocator).
- Scope pasó de 3 a 4 slices: (1) allocator → (2) presenter → (3) PDF → (4) visor + endpoints + ambas superficies.
- **Bilingüe (es-CL + en-US)** vía i18n canónico; el documento sigue el locale del contractor (pattern `email/locale-resolver`).
- **Mockups plasmados y APROBADOS por el operador (2026-05-31)**: ruta TSX real `src/views/greenhouse/contractors/mockup/` + scenario GVC `remittance-advice`. Verificados via GVC local (5 frames, ambos locales + 4 regímenes) + loop de auditoría modern-ui (paleta colapsada a un solo acento: título neutro, chip neutro, disclaimer neutro, verde del neto único acento → documento legal sobrio). **La implementación cablea estos mockups, NO los rehace** — ver mapping en Detailed Spec + reglas duras "MOCKUP APROBADO" en Architecture Alignment.
