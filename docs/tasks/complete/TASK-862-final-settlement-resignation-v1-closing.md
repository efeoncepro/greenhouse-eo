# TASK-862 — Final Settlement V1 Closing: Renuncia Voluntaria Legalmente Ratificable

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Complete — Slices A-F shipped 2026-05-11 directo en develop. Activa en produccion sin flag de gating; revision legal externa por abogado laboralista es recomendada (no bloqueante) per decision del usuario 2026-05-11.`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none` (TASK-784 enriquece pero no bloquea)
- Branch: `develop` (override operativo por instrucción explícita del usuario — no se crea `task/TASK-862-*`)
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Cierra el motor V1 de finiquito por renuncia voluntaria (art. 159 N°2 CT) llevándolo de "pilot funcional" a "documento legalmente ratificable ante ministro de fe". **El state machine, la persistencia, los outbox events y la integración con TASK-784 ya existen** — los gaps reales son: (1) calculator no emite 3 componentes ya declarados en `policies.ts`, (2) PDF no renderiza cláusulas narrativas + Ley 21.389 + reserva de derechos + ministro de fe + huella + logo del empleador, (3) snapshot necesita extender con worker address + maintenance obligation + employer logo asset, (4) HrOffboardingView usa placeholder hardcodeado para `sign-or-ratify` y debe ganar un dialog real, (5) `numberToSpanishWords` helper + copy module `finiquito.ts` no existen. Out of scope: otras causales (V2).

## Why This Task Exists

El módulo `src/lib/payroll/final-settlement/` está mucho más maduro de lo que asumimos — tiene:

- **State machine completo** (calculator: draft/calculated/approved/cancelled; document: rendered/in_review/approved/issued/signed_or_ratified/rejected/voided/superseded/cancelled) con audit events + outbox publishing + snapshot hash anti-tampering.
- **Worker reservation y signature evidence ya son campos first-class** en `final_settlement_documents` (`worker_reservation_of_rights`, `worker_reservation_notes`, `signature_evidence_asset_id`, `signature_evidence_ref`).
- **TASK-784 ya integrado** vía `readFinalSettlementSnapshot` para `collaborator.taxId` con gate `verification_status='verified'` + fallback defensivo.
- **7 readiness checks canónicos** ya implementados en `buildDocumentReadiness` (`settlement_approved`, `settlement_ready`, `legal_entity_source`, `worker_legal_identity_verified`, `employer_legal_identity_present`, `net_payable_non_negative_or_authorized`, `component_policy_evidence_present`).
- **11 outbox events versionados** ya declarados en `EVENT_TYPES`.
- **4 official references DT** ya en el snapshot con `verifiedAt` timestamps.

**Lo que falta** es la última milla legal: el render PDF no expone las cláusulas narrativas obligatorias, el calculator omite 3 componentes que ya tiene en su policy registry, la UI captura `sign-or-ratify` con un placeholder JSON en vez de un dialog real, y faltan 3 dimensiones de datos nuevas (worker address, pensión alimentos, logo empleador).

## Goal

- Calculator emite los 3 componentes declarados-no-emitidos cuando los datos los justifican (`monthly_gratification_due`, `used_or_advanced_vacation_adjustment`, `payroll_overlap_adjustment`); feriado partido en carryover + proporcional.
- PDF render incorpora 7 elementos legales sin romper los landmarks existentes del test: cláusulas narrativas PRIMERO–QUINTO, banner Ley 21.389, worker reservation visible cuando existe, espacio firma ministro de fe, espacio huella, watermark "PROYECTO" pre-ratificación, logo del empleador desde snapshot.
- Snapshot extiende `collaborator` con `addressLine1/city/region`, `documentSnapshot` agrega `maintenanceObligation`, `employer` agrega `logoAssetId`.
- HrOffboardingView gana un dialog real para `sign-or-ratify` que captura ministro de fe (kind/name/RUT/date/notaría), worker reservation toggle + textarea, y opcional signature evidence file upload.
- Carta de renuncia ratificada se exige como pre-req del `calculate` (nuevo readiness check `resignation_letter_uploaded`).
- Microcopy es-CL canonical en nuevo `src/lib/copy/finiquito.ts`.
- Helper `numberToSpanishWords` nuevo + tests.
- Spec canónica `GREENHOUSE_FINAL_SETTLEMENT_V1_SPEC.md` con matriz componente × tratamiento × cláusula × evidencia + flag de producción gated por revisión legal externa.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

Reglas obligatorias:

- V1 sigue siendo `separationType='resignation'` Chile dependent + payroll interno. NO ampliar el enum aquí.
- `payroll_entries` no se mutan para corregir un finiquito.
- Toda línea del breakdown pasa por `withFinalSettlementPolicy(...)` y requiere `sourceRef`.
- Tratamiento tributario: feriado proporcional/pendiente en finiquito es `non_income` / `not_contribution_base` (art. 178 CT).
- `statutory_deductions` sobre delta only (no duplicar AFP/Salud/IUSC ya cobrados en nómina mensual).
- Logo del documento legal es del **empleador** (legal entity). Greenhouse en footer utility branding.
- Ley 21.389 (mod. Ley 14.908) obligatoria para todo finiquito chileno desde 2021.
- Greenhouse genera proyecto/draft. Ratificación legal externa; sistema registra evidencia ex-post.
- Microcopy es-CL tuteo vía `src/lib/copy/finiquito.ts` (nuevo) revisada por `greenhouse-ux-writing`.
- Para cambios en `src/lib/payroll/*` invocar `greenhouse-payroll-auditor` antes de mergear.
- Para cambios UI invocar `greenhouse-ui-review` antes de commit.

## Normative Docs

- `src/lib/payroll/final-settlement/types.ts` — contratos del settlement
- `src/lib/payroll/final-settlement/document-types.ts` — contratos del documento + state machine (`FINAL_SETTLEMENT_DOCUMENT_STATUSES` 10 estados, `documentReadiness`)
- `src/lib/payroll/final-settlement/policies.ts` — 8 componentes con tratamiento canónico
- `src/lib/payroll/final-settlement/calculator.ts` — engine (emite 4 de 8 componentes hoy)
- `src/lib/payroll/final-settlement/calculator.test.ts` — pin de strict equality que rompe al agregar componentes (líneas 217-222)
- `src/lib/payroll/final-settlement/document-pdf.tsx` — render con landmarks ya pineados por tests
- `src/lib/payroll/final-settlement/document-pdf.test.tsx` — 12 landmarks de texto que el PDF debe preservar
- `src/lib/payroll/final-settlement/document-store.ts` — `buildDocumentReadiness` (7 checks), `buildDocumentSnapshot`, `markFinalSettlementDocumentSignedOrRatifiedForCase`
- `src/lib/payroll/final-settlement/store.ts` — calculate/approve/cancel con state machine
- `src/lib/payroll/final-settlement/overlap-ledger.ts` — `readPayrollOverlapLedger` que provee `coveredByMonthlyPayroll` + `coveredAmounts`
- `src/views/greenhouse/hr-core/offboarding/HrOffboardingView.tsx` — UI con placeholder en `sign-or-ratify` (líneas 429-436)
- `src/app/api/hr/offboarding/cases/[caseId]/final-settlement/document/sign-or-ratify/route.ts` — endpoint que ya acepta el shape canónico, sólo el UI no lo está usando
- `src/lib/person-legal-profile/*` — TASK-784 (lectura de RUT verificado del trabajador)
- `src/lib/sync/event-catalog.ts` — `EVENT_TYPES.payrollFinalSettlement*` y `EVENT_TYPES.hrFinalSettlementDocument*` (11 events ya declarados)
- **Mockup canónico vinculante (APROBADO 2026-05-11 por Julio Reyes)**: `docs/mockups/task-862-finiquito-renuncia-v1-legal.html` (v3 grounded en real assets + state machine real + matriz watermark corregida). **Contrato visual cerrado**. Cualquier desviación visual del implementador en Slice D requiere update del mockup + re-aprobación explícita del owner ANTES de mergear. Sin esto, el PR debe ser bloqueado en review.

## Dependencies & Impact

### Depends on

- `src/lib/payroll/final-settlement/*` — engine + store + document-pdf actuales
- `greenhouse_core.organizations` (NOT `legal_entity_organizations` — esa tabla no existe; usar la canónica `organizations`)
- `greenhouse_core.identity_profiles` + `greenhouse_core.members` — para `collaborator` snapshot
- `greenhouse_core.person_addresses` (TASK-784) — para `collaborator.address` (extensión nueva)
- `greenhouse_core.assets` — para `pdf_asset_id`, `signature_evidence_asset_id`, `employer_logo_asset_id` (nuevo)
- `greenhouse_hr.leave_balances` — para `availableDays` + `carriedOverDays` (split feriado)
- `greenhouse_payroll.compensation_versions` — incluye `gratificacionLegalMode` ya
- `greenhouse_payroll.payroll_periods` + `payroll_entries` — para overlap ledger
- `EVENT_TYPES.payrollFinalSettlement*` + `EVENT_TYPES.hrFinalSettlementDocument*` (ya existen)

### Blocks / Impacts

- Habilita producción del módulo offboarding renuncia voluntaria.
- Sienta patrón canónico de "documento legal generado por Greenhouse + ratificación externa registrada" reusable para futuras causales (V2) y otros documentos legales (contratos, anexos, certificados).
- Patrón dual de PDF (`audit_review_pdf` vs `signature_copy_pdf` por audiencia) reusable.

### Files owned

- `src/lib/payroll/final-settlement/calculator.ts` (Slice A)
- `src/lib/payroll/final-settlement/calculator.test.ts` (Slice A — extender + actualizar strict equality)
- `src/lib/payroll/final-settlement/types.ts` (Slice C — extender source snapshot)
- `src/lib/payroll/final-settlement/document-types.ts` (Slice C — extender document snapshot)
- `src/lib/payroll/final-settlement/document-pdf.tsx` (Slice D)
- `src/lib/payroll/final-settlement/document-pdf.test.tsx` (Slice D — extender preservando landmarks)
- `src/lib/payroll/final-settlement/document-store.ts` (Slice C — extender `buildDocumentSnapshot` para nuevos campos + readiness checks)
- `src/lib/payroll/final-settlement/store.ts` (Slice C — extender readiness con `resignation_letter_uploaded`)
- `src/lib/payroll/number-to-spanish-words.ts` (Slice B — nuevo)
- `src/lib/payroll/number-to-spanish-words.test.ts` (Slice B — nuevo)
- `src/lib/copy/finiquito.ts` (Slice B — nuevo módulo de copy)
- `src/views/greenhouse/hr-core/offboarding/HrOffboardingView.tsx` (Slice E — sign-or-ratify dialog real)
- `src/views/greenhouse/hr-core/offboarding/HrOffboardingView.test.tsx` (Slice E — extender)
- `src/app/api/hr/offboarding/cases/[caseId]/resignation-letter/route.ts` (Slice E — nuevo endpoint upload + link)
- `src/app/api/hr/offboarding/cases/[caseId]/maintenance-obligation/route.ts` (Slice C — nuevo endpoint declaración)
- `migrations/<timestamp>_task-862-employer-logo-asset.sql` (Slice C — `ALTER TABLE greenhouse_core.organizations ADD COLUMN logo_asset_id`)
- `tests/e2e/smoke/hr-final-settlement-resignation.spec.ts` (Slice E — E2E)
- `docs/documentation/hr/finiquito-renuncia-voluntaria.md` (Slice F)
- `docs/manual-de-uso/hr/emitir-finiquito-renuncia.md` (Slice F)
- `docs/architecture/GREENHOUSE_FINAL_SETTLEMENT_V1_SPEC.md` (Slice F)

## Current Repo State (verified by audit 2026-05-11)

### Already exists

- **State machine settlement**: `draft → calculated → reviewed → approved → issued → cancelled` (`store.ts:357-687`), audit events en `final_settlement_events`.
- **State machine document**: 10 estados (`document-types.ts:12-25`) con full transitions + snapshot hash verification (`document-store.ts:737-746`).
- **Worker reservation**: campos `worker_reservation_of_rights` (boolean) + `worker_reservation_notes` (text) ya persistidos por `markFinalSettlementDocumentSignedOrRatifiedForCase` (`document-store.ts:1020-1093`).
- **Signature evidence**: `signature_evidence_asset_id` + `signature_evidence_ref` JSON aceptados por endpoint `/sign-or-ratify` (route exists, accepts full shape).
- **TASK-784 integration**: `getCollaboratorSnapshot` (`document-store.ts:137-197`) ya invoca `readFinalSettlementSnapshot` con gate `verification_status='verified'` y fallback defensivo a `taxId=null`.
- **Employer snapshot**: lee de `greenhouse_core.organizations` con fallback a `getOperatingEntityIdentity()` (`document-store.ts:199-244`); resuelve `legalName`, `taxId`, `taxIdType`, `legalAddress`, `country`. Source flag `'settlement_legal_entity' | 'operating_entity_fallback'`.
- **Document readiness 7 checks** (`document-store.ts:246-310`): settlement_approved, settlement_ready, legal_entity_source, worker_legal_identity_verified, employer_legal_identity_present, net_payable_non_negative_or_authorized, component_policy_evidence_present.
- **PDF render** (`document-pdf.tsx`): header con logo Greenhouse + status pill + doc number + hash + generated date, title + net box, partes grid 6 fields, relación y causal grid 6 fields, breakdown table con chips, totals 3-column box, warnings condicional, constancia statement, 2-column signatures, footer.
- **Test landmarks pineados** (`document-pdf.test.tsx:142-174`): "Finiquito de contrato de trabajo", "Listo para firma", "Documento GH-FIN-2026-", "Snapshot fs-v1", "Feriado proporcional", "Relación y causal", "Constancia para firma y ratificación", "Documento confidencial", "Líquido / pago neto", "30-04-2026", "Chile dependiente", "nómina interna".
- **Calculator test pinea 4 componentes** (`calculator.test.ts:217-222`): strict equality `['pending_salary', 'pending_fixed_allowances', 'proportional_vacation', 'statutory_deductions']`.
- **Outbox events ya declarados** (`event-catalog.ts:256-268`): `payrollFinalSettlement{Calculated,Approved,Cancelled}` + `hrFinalSettlementDocument{Rendered,SubmittedForReview,Approved,Issued,Rejected,Voided,Superseded,SignedOrRatified}`.
- **HrOffboardingView UI** (`HrOffboardingView.tsx`): lista casos, fetch settlement + document, acciones para todas las transiciones excepto que `sign-or-ratify` usa placeholder (`HrOffboardingView.tsx:429-436`).
- **`payrollOverlapLedger`** (`overlap-ledger.ts`): primitive que ya provee `coveredByMonthlyPayroll`, `coveredAmounts`, periodId, status, ufValue, taxTableVersion.
- **Brand assets** en `public/branding/`: `logo-full.svg` (Efeonce wordmark), `SVG/isotipo-full-efeonce.svg`, `SVG/isotipo-efeonce-negativo.svg`, `pdf/isotipo-efeonce.png`, + Globe/Reach/Wave brand assets (futuro multi-tenant).

### Gap

- **Calculator no emite 3 componentes ya declarados** (`policies.ts:31,51,81`):
  - `monthly_gratification_due` (policy `cl.final_settlement.monthly_gratification_due.v1`)
  - `used_or_advanced_vacation_adjustment` (policy `cl.final_settlement.used_or_advanced_vacation_adjustment.v1`)
  - `payroll_overlap_adjustment` (policy `cl.final_settlement.payroll_overlap_adjustment.informational.v1`)
- **Feriado mezclado**: `calculator.ts:385-394` produce una sola línea `proportional_vacation` aunque conceptualmente son dos (carryover años anteriores + proporcional año en curso). `lastAnnualVacationDate: null` siempre (`calculator.ts:496`).
- **PDF render sin cláusulas narrativas**: `document-pdf.tsx:566-689` renderiza tablas + chips + statement breve. Falta: PRIMERO–QUINTO narrativas, banner Ley 21.389 obligatorio, worker reservation visible cuando `workerReservationOfRights=true`, columna ministro de fe en signatures, espacio huella, watermark "PROYECTO" cuando `documentStatus != 'signed_or_ratified'`, logo del empleador (hoy hardcoded a `public/branding/logo-full.png`).
- **Snapshot sin worker address**: `getCollaboratorSnapshot` (`document-store.ts:137-197`) NO joinea `person_addresses` (TASK-784). El render no puede mostrar domicilio del trabajador.
- **Snapshot sin maintenance obligation**: el concepto Ley 21.389 no existe en ninguna parte del repo (grep confirma 0 hits).
- **Snapshot sin employer logo**: `greenhouse_core.organizations` no tiene `logo_asset_id` (verificado: 0 hits). Migration nueva necesaria.
- **HrOffboardingView sign-or-ratify es placeholder** (`HrOffboardingView.tsx:429-436`): POST hardcodeado con `signatureEvidenceRef: { source: 'external_process_placeholder' }`. No captura ministro de fe ni worker reservation.
- **Helper `numberToSpanishWords` no existe** (verificado: 0 hits).
- **`src/lib/copy/finiquito.ts` no existe** (verificado: 0 hits). HrOffboardingView usa labels inline. `src/lib/copy/payroll.ts` (25 líneas) y `workforce.ts` (237 líneas) no cubren finiquito.
- **No hay readiness check `resignation_letter_uploaded`**. La carta de renuncia no se gating como pre-req del `calculate`.
- **No hay endpoint para upload de carta de renuncia ni para declarar maintenance obligation**.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice A — Engine completion (calculator emite 9 componentes + split feriado)

1. Emitir `monthly_gratification_due` cuando `compensation.gratificacionLegalMode === 'anual_proporcional'`. Tope art. 50 CT: `MIN(baseSalary × mesesDevengados × 0.25, 4.75 × IMM / 12 × mesesDevengados)`. Resolver `lastAnnualGratificationPaidAt` desde `greenhouse_payroll` (verificar tabla — agregar query si no existe, fallback a `hireDate`).
2. Emitir `used_or_advanced_vacation_adjustment` cuando `leaveBalance.availableDays < 0` (signo del balance neto). Kind=`deduction`, monto negativo expresado positivo.
3. Emitir `payroll_overlap_adjustment` SIEMPRE como línea informativa (kind=`informational`, amount=0) cuando exista `payrollOverlapLedger`, con evidencia descriptiva del coverage.
4. Resolver `lastAnnualVacationDate` desde `greenhouse_hr.leave_balances.last_annual_leave_taken_at` (verificar columna; agregar query si no existe). Partir `proportional_vacation` en dos líneas:
   - `pending_vacation_carryover` (uso `leaveBalance.carriedOverDays`)
   - `proportional_vacation_current_period` (uso resto)
5. **Actualizar `calculator.test.ts:217-222`** — el strict equality `toEqual([4 components])` debe pasar a `toEqual([7-9 components según escenario])` con casos edge: anual_proporcional con/sin, balance adelantado con/sin, carryover con/sin, overlap con/sin.
6. Agregar tests nuevos para los 3 componentes nuevos + split feriado.

### Slice B — Helpers + microcopy + font registration

1. Crear `src/lib/payroll/number-to-spanish-words.ts` con `formatClpInWords(amount: number): string`. Cubre 0 a 999.999.999.999. Tests: 0, 1, 21, 100, 1000, 1M, 1B, negativo (throw), decimales (truncar).
2. Crear `src/lib/copy/finiquito.ts` con namespace `GH_FINIQUITO`:
   - `resignation.clauses.{primero, segundo, tercero, terceroBis, cuarto, quinto}` parametrizables.
   - `resignation.reserva.{titulo, instrucciones}`.
   - `resignation.ministro.{kindLabel, pending, signedAt}`.
   - `resignation.constancia` (texto preservado del PDF actual).
   - `resignation.maintenanceObligation.{altA, altB, blockerMessage}`.
   - Microcopy es-CL tuteo, revisada por `greenhouse-ux-writing`.
3. **Geist TTFs ya disponibles en el repo** ✅ — `src/assets/fonts/Geist-{Regular,Medium,Bold}.ttf` agregados 2026-05-11 (commit ad-hoc previo a Slice D para destrabar la migración). Source: Google Fonts via gwfh helper (`https://gwfh.mranftl.com/api/fonts/geist?variants=regular,500,700&formats=ttf`). Licencia SIL Open Font 1.1. SHA256 prefixes:
   - `Geist-Regular.ttf`: `4aa4920f459ba24e...` (30,264 bytes)
   - `Geist-Medium.ttf`: `355224d7f374d4ea...` (30,296 bytes)
   - `Geist-Bold.ttf`: `def4840cb3e0b493...` (30,256 bytes)
4. **`register-fonts.ts` ya extendido** ✅ — 3 weights de Geist registradas como `Geist` / `Geist Medium` / `Geist Bold`. Poppins preservada. DM Sans **temporalmente** registrada hasta que TASK-862 Slice D migre el único consumer (`document-pdf.tsx`); cuando se cierre Slice D, remover los 3 `tryRegister('DM Sans*', ...)` + borrar `src/assets/fonts/DMSans-*.ttf` como parte del closing protocol. Validado live 2026-05-11 con smoke render de "AaBbCc" en las 3 weights → PDF de 10.9KB sin fallback a Helvetica.

### Slice C — Snapshot extension + new readiness checks + migration

1. **Migration** (`migrations/<timestamp>_task-862-employer-logo-asset.sql`):
   ```sql
   ALTER TABLE greenhouse_core.organizations
   ADD COLUMN logo_asset_id TEXT NULL
   REFERENCES greenhouse_core.assets(asset_id);
   ```
2. Extender `FinalSettlementDocumentSnapshot` (`document-types.ts`):
   - `collaborator.addressLine1`, `collaborator.city`, `collaborator.region` (lectura de `person_addresses` con fallback `null`).
   - `employer.logoAssetId: string | null` (lectura de `organizations.logo_asset_id`).
   - `maintenanceObligation: { variant: 'not_subject' | 'subject', amount?, beneficiary?, evidenceAssetId?, declaredAt, declaredByUserId } | null` (nuevo top-level field).
   - `resignationLetterAssetId: string | null` (top-level).
   - `ratification: { ministerKind, ministerName, ministerTaxId, notaria?, ratifiedAt } | null` (top-level, poblado al `sign-or-ratify` via parsing del `signatureEvidenceRef` que ya existe).
3. Extender `buildDocumentSnapshot` (`document-store.ts:312-390`) para poblar los nuevos campos.
4. Extender `buildDocumentReadiness` (`document-store.ts:246-310`) con 3 nuevos checks:
   - `resignation_letter_uploaded` (blocker si null)
   - `maintenance_obligation_declared` (blocker si null)
   - `worker_address_resolved` (warning si null)
5. Nuevo endpoint `POST /api/hr/offboarding/cases/[caseId]/resignation-letter` — upload de asset con context `resignation_letter_ratified` y link a `offboarding_cases.resignation_letter_asset_id` (verificar si la columna existe en `offboarding_cases`; agregar si no).
6. Nuevo endpoint `POST /api/hr/offboarding/cases/[caseId]/maintenance-obligation` — declarar Alt A / Alt B con audit (`actorUserId` + `declaredAt`).
7. Estos endpoints NO emiten nuevos outbox events (los datos viajan en el snapshot al próximo `render`/`reissue` que ya emite eventos).

### Slice D — PDF legal rewrite (preservando landmarks de test, paridad 1:1 con mockup aprobado)

**🔒 CONTRATO VISUAL CERRADO**: el mockup [docs/mockups/task-862-finiquito-renuncia-v1-legal.html](../../mockups/task-862-finiquito-renuncia-v1-legal.html) (v3, aprobado 2026-05-11 por Julio Reyes) es la referencia VINCULANTE. El implementador debe:

1. **Abrir el mockup en navegador ANTES de empezar Slice D** y leerlo end-to-end (state matrix + Hoja A + Hoja B + 12 callouts).
2. **Renderizar el PDF generado lado-a-lado con el mockup** durante el desarrollo y al final de Slice D.
3. **Cualquier desviación visual** (cambio de tokens, layout, copy, comportamiento de estado) requiere update del mockup + re-aprobación EXPLÍCITA del owner. NO mergear sin esto.
4. **Si el implementador descubre un caso edge no cubierto por el mockup** (ej. monto muy largo que no cabe, breakdown con 12 líneas, estado `superseded`), debe extender el mockup primero y pedir re-aprobación, NO improvisar en el código.

#### Detalle de implementación

1. Reescribir `document-pdf.tsx` manteniendo TODOS los 12 landmarks de `document-pdf.test.tsx:142-174` ("Finiquito de contrato de trabajo", "Listo para firma", "Relación y causal", "Constancia para firma y ratificación", "Documento confidencial", "Líquido / pago neto", "Feriado proporcional", "30-04-2026", "Chile dependiente", "nómina interna", "Documento GH-FIN-2026-", "Snapshot fs-v1").
2. AGREGAR sin remover (paridad con mockup aprobado):
   - **Watermark "PROYECTO" diagonal** SÓLO cuando `documentStatus IN ('rendered', 'in_review', 'approved')`. Color warning tonal (`rgba(247, 144, 9, 0.10)`). **CLEAN cuando `documentStatus IN ('issued', 'signed_or_ratified')`** — el documento que va al notario y la versión post-ratificación NO llevan watermark (principio canónico: watermark es señal INTERNA de HR, NO marca legal; matriz canónica completa documentada en Detailed Spec abajo).
   - **Watermarks especiales para estados terminales adversos**: "RECHAZADO" / "ANULADO" / "REEMPLAZADO" con tonal error/neutral según corresponda (`rejected`/`voided`/`superseded`).
   - Cláusulas narrativas PRIMERO–QUINTO entre la sección "Relación y causal" y la tabla breakdown, leyendo de `GH_FINIQUITO.resignation.clauses.*`.
   - Cláusula CUARTO banner Ley 21.389 (Alt A / Alt B según `maintenanceObligation`).
   - Domicilio del trabajador en la sección Partes (4ª columna).
   - Reserva de derechos block ANTES de signatures:
     - Si `workerReservationOfRights === true`: render `workerReservationNotes` con estilo manuscrito (font Caveat o equivalente).
     - Else: caja vacía con líneas de pauta (espacio para escritura manual).
   - 3ª columna de signatures: ministro de fe (vacío "Pendiente de ratificación" si `ratification === null`; con `ministerName`/`ministerTaxId`/`notaria`/`ratifiedAt` si ratificado).
   - Caja huella **40×40 mm** junto a firma trabajador (NO 56×56 como tenía v1 del mockup).
   - Logo del empleador si `employer.logoAssetId` no nulo (resolver vía `/api/assets/private/<id>` o equivalente; fallback a logo Greenhouse hardcoded si null).
   - Greenhouse al footer: "Documento generado con Greenhouse · greenhouse.efeoncepro.com".
   - Helper `formatClpInWords` en cláusula segunda y en `netHelp` del net-box.
3. Status pill labels (preservar `readinessLabel`):
   - `ready` → "Listo para firma" (test asserta este string)
   - `needs_review` → "Revisión interna requerida"
   - `blocked` → "Bloqueado para firma"
4. Tipografía: **Poppins (display) + Geist (body)** vía `ensurePdfFontsRegistered()`. **Corrige el drift actual de `document-pdf.tsx`** que usa DM Sans en 8 callsites (deprecated per `DESIGN.md` líneas 380+384). Slice B agregó los TTFs de Geist al repo (`src/assets/fonts/Geist-{Regular,Medium,Bold}.ttf`) y los registró; Slice D migra los 8 callsites `fontFamily: 'DM Sans*'` a Geist. NO mantener DM Sans en este PDF.
5. Extender `document-pdf.test.tsx` con tests adicionales (NO modificar las assertions existentes):
   - Render con `documentStatus='in_review'` → watermark "PROYECTO" visible.
   - Render con `documentStatus='issued'` → watermark AUSENTE, pill "Listo para firma" presente.
   - Render con `documentStatus='signed_or_ratified'` + `ratification` poblada → watermark AUSENTE, nombre ministro de fe visible.
   - Render con `documentStatus='rejected'` → watermark "RECHAZADO" visible.
   - Render con `maintenanceObligation` Alt A → texto Ley 21.389 visible.
   - Render con `workerReservationOfRights=true` → notes visibles con estilo manuscrito.

### Slice E — HrOffboardingView sign-or-ratify dialog real

1. Reemplazar el placeholder POST (`HrOffboardingView.tsx:429-436`) por un dialog modal nuevo con campos:
   - `ministerKind` (Select: notario / inspector del trabajo / presidente sindicato / oficial registro civil)
   - `ministerName` (TextField required)
   - `ministerTaxId` (TextField required, validación RUT)
   - `notaria` (TextField opcional)
   - `ratifiedAt` (DatePicker required)
   - `workerReservationOfRights` (Switch)
   - `workerReservationNotes` (TextField multiline, visible si toggle on)
   - `signatureEvidenceAssetId` (file upload opcional, vía endpoint `/api/assets/private`)
2. Al submit, POST `/api/hr/offboarding/cases/[caseId]/final-settlement/document/sign-or-ratify` con el shape canónico que el endpoint YA acepta:
   ```ts
   {
     signatureEvidenceAssetId: assetIdOrNull,
     signatureEvidenceRef: {
       ministerKind, ministerName, ministerTaxId, notaria, ratifiedAt,
       source: 'hr_dashboard'
     },
     workerReservationOfRights: boolean,
     workerReservationNotes: stringOrNull
   }
   ```
3. Después del éxito, refresh `loadData()`.
4. Extender `HrOffboardingView.test.tsx` con test del dialog open + submit + validation.

### Slice F — Docs + spec canónica

1. `docs/documentation/hr/finiquito-renuncia-voluntaria.md` — explicación funcional es-CL.
2. `docs/manual-de-uso/hr/emitir-finiquito-renuncia.md` — paso a paso operador HR (subir carta → declarar pensión alimentos → calcular → revisar → emitir PDF → enviar a notario → registrar ratificación → archivar).
3. `docs/architecture/GREENHOUSE_FINAL_SETTLEMENT_V1_SPEC.md` — spec canónica con:
   - Matriz componente × tratamiento tributario × tratamiento previsional × evidencia × fuente legal (las 4 official references DT ya en el snapshot).
   - Texto canónico de las 5 cláusulas narrativas.
   - Flujo de ratificación.
   - Matriz `documentStatus × ratification → watermark/pill`.
   - Out-of-scope explícito (otras causales).
   - `legalReviewStatus: 'pending' | 'reviewed_with_observations' | 'approved'`.

### Slice G — Revisión legal externa (gate de producción)

1. Coordinar revisión por abogado laboralista chileno (out of repo).
2. Capturar feedback como Delta en `GREENHOUSE_FINAL_SETTLEMENT_V1_SPEC.md`.
3. Flag `final_settlement_resignation_production_enabled` (vía `home_rollout_flags` o equivalente) default `FALSE`. Hasta `legalReviewStatus='approved'`, sólo staging + cuentas Efeonce internas.

## Out of Scope

- Cualquier causal distinta de art. 159 N°2.
- Componentes de indemnización (notice substitute, IAS, AFC offset, recargo art. 168). Eso es V2 (TASK derivada).
- Honorarios closure / contractors / Deel / EOR.
- Consulta automática RNDA (pensión alimentos). V1 acepta declaración humana con evidencia opcional.
- Integración con AFC para certificado seguro de cesantía.
- Tracking de pago efectivo post-issue (vive en Finance reconciliation).
- Tracking de cotizaciones final mes pagadas (vive en Previred compliance exports, TASK-812/856).
- Notarizado digital / firma electrónica avanzada.
- PDF/UA tagged accessibility (follow-up V1.1).

## Detailed Spec

### Componentes faltantes — fórmulas

**`monthly_gratification_due`** (`cl.final_settlement.monthly_gratification_due.v1`):

```ts
if (compensation.gratificacionLegalMode === 'anual_proporcional') {
  const mesesDevengados = monthsBetween(
    lastAnnualGratificationPaidAt ?? hireDate,
    lastWorkingDay
  )
  const basePeriodo = compensation.baseSalary * mesesDevengados * 0.25
  const ingresoMinimoMensual = await getHistoricalEconomicIndicatorForPeriod({
    indicatorCode: 'IMM',
    periodDate: lastWorkingDay
  })
  const tope = (4.75 * ingresoMinimoMensual.value / 12) * mesesDevengados
  amount = roundCurrency(Math.min(basePeriodo, tope))
} else {
  // mensual_25pct o ninguna → ya pagada o no aplica
  amount = 0  // no se emite línea
}
```

Tratamiento: `taxable_monthly`, `contribution_base`. Suma a base de `statutory_deductions` delta-only.

**`used_or_advanced_vacation_adjustment`** (`cl.final_settlement.used_or_advanced_vacation_adjustment.v1`):

```ts
const balanceNeto = leaveBalance.allowanceDays
  + leaveBalance.carriedOverDays
  + leaveBalance.progressiveExtraDays
  + leaveBalance.adjustmentDays
  - leaveBalance.usedDays
  - leaveBalance.reservedDays

if (balanceNeto < 0) {
  const diasAdelantados = Math.abs(balanceNeto)
  amount = roundCurrency(diasAdelantados * dailyVacationBase)  // kind='deduction'
} else {
  amount = 0  // no se emite
}
```

Tratamiento: `authorized_deduction`.

**`payroll_overlap_adjustment`** (`cl.final_settlement.payroll_overlap_adjustment.informational.v1`):

SIEMPRE informativo, amount=0:
- Si `coveredByMonthlyPayroll=true`: "Remuneración del período ya cubierta por nómina mensual {periodId}"
- Si `coveredByMonthlyPayroll=false`: "Nómina mensual {periodId} aún no cubre el período"

Tratamiento: `informational`, `not_applicable`.

### Split feriado

Línea `proportional_vacation` se reemplaza por dos:

- `pending_vacation_carryover`: `leaveBalance.carriedOverDays + progressiveExtraDays` × `dailyVacationBase` (días corridos vía DT art. 73).
- `proportional_vacation_current_period`: resto de `availableDays` × `dailyVacationBase`.

Ambas con policy code distinto pero mismo tratamiento `non_income` / `not_contribution_base`. PDF label distingue ("Feriado pendiente — años anteriores" / "Feriado proporcional — año en curso") manteniendo el sustring "Feriado proporcional" para preservar el test landmark.

### Cláusulas narrativas (texto canónico en `src/lib/copy/finiquito.ts`)

Ver mockup canónico `docs/mockups/task-862-finiquito-renuncia-v1-legal.html` para el texto vinculante. Highlights:

- PRIMERO: cita expresa art. 159 N°2 CT + fecha carta renuncia + art. 177 CT.
- SEGUNDO: declaración de pago + modalidad + monto en pesos + monto en letras.
- TERCERO: finiquito amplio total y definitivo + declaración Ley Bustos (cotizaciones al día, art. 162 inc. 5 CT + art. 19 DL 3.500).
- CUARTO: pensión alimentos (Alt A / Alt B según declaración) con cita Ley 14.908 mod. Ley 21.389/2021.
- QUINTO: prefacio de tabla detalle (la tabla se mantiene como hoy).

### Matriz documentStatus → watermark (corregida)

**Principio canónico**: el watermark "PROYECTO" es una **señal interna de Greenhouse**, NO una marca legal. Sirve para que durante la revisión interna de HR nadie confunda un draft con un documento final. Desde el momento en que el PDF se entrega al trabajador para llevar al notario (`issued`), el documento debe ser CLEAN — la práctica chilena estándar (caso BICE confirmado) es que finiquitos reales no llevan watermark; el sello físico del notario + firmas + huella son los que dan validez legal.

| documentStatus | Watermark | Audiencia | Justificación |
|---|---|---|---|
| `rendered` | "PROYECTO" warning tonal | Sólo HR interno | Draft recién generado, antes de revisión |
| `in_review` | "PROYECTO" warning tonal | Sólo HR interno | En revisión, no se entrega |
| `approved` | "PROYECTO" warning tonal | Sólo HR interno | HR aprobó pero todavía no se imprime para el trabajador |
| **`issued`** | **(sin watermark — CLEAN)** | Trabajador + notario | Es el documento que se imprime para llevar al notario; debe ser legible y limpio |
| `signed_or_ratified` | (sin watermark) | Sistema de registro post-ratificación | PDF regenerado con datos de ministro de fe embebidos + reserva de derechos del trabajador si aplica |
| `rejected` | "RECHAZADO" error tonal | Auditoría / archivo | Estado terminal adverso — watermark previene uso accidental |
| `voided` | "ANULADO" error tonal | Auditoría / archivo | Estado terminal adverso |
| `superseded` | "REEMPLAZADO" neutral tonal | Auditoría / archivo | Versión histórica reemplazada por nueva versión |

**Status pill** (preservado del current PDF, no cambia): refleja `documentReadiness.status` (`ready` → "Listo para firma" / `needs_review` → "Revisión interna requerida" / `blocked` → "Bloqueado para firma"). Es ortogonal al watermark — habla de "se puede emitir?" no de "dónde está en el lifecycle?". El lifecycle se comunica vía watermark (estados internos) y vía datos visibles (ministro de fe poblado o no).

**Implementación Slice D**: el render debe leer `snapshot.finalSettlement.documentStatus` (o equivalente) y aplicar la matriz arriba. NO atar el watermark a `readiness.status`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Calculator emite los 3 componentes declarados-no-calculados cuando los datos lo justifican; tests cubren cada caso edge.
- [ ] Feriado se reporta en dos líneas; suma matemáticamente idéntica al V1 cuando los datos lo permiten.
- [ ] Helper `numberToSpanishWords` cubre 0 a 999.999.999.999 con tests; integrado en cláusula segunda y net-box.
- [ ] `src/lib/copy/finiquito.ts` existe con namespace `GH_FINIQUITO.resignation.*`.
- [ ] PDF `document-pdf.tsx` preserva los 12 landmarks del test existente Y agrega: cláusulas PRIMERO–QUINTO, Ley 21.389, worker reservation visible, ministro de fe column, huella box, watermark "PROYECTO", logo del empleador desde snapshot.
- [ ] Snapshot extiende `collaborator.address*`, `employer.logoAssetId`, `maintenanceObligation`, `resignationLetterAssetId`, `ratification`.
- [ ] Migration agrega `greenhouse_core.organizations.logo_asset_id` con FK a `assets`.
- [ ] 3 readiness checks nuevos en `buildDocumentReadiness`: `resignation_letter_uploaded`, `maintenance_obligation_declared`, `worker_address_resolved`.
- [ ] Endpoints `POST /api/hr/offboarding/cases/[id]/resignation-letter` y `/maintenance-obligation` con audit + capability gates.
- [ ] HrOffboardingView reemplaza placeholder `sign-or-ratify` por dialog real captura ministro de fe + worker reservation + signature evidence file.
- [ ] Tests E2E smoke: render con readiness=blocked (sin carta), render con ready (carta + maintenance), issue, ratify con dialog, post-ratification render sin watermark.
- [ ] Spec canónica `GREENHOUSE_FINAL_SETTLEMENT_V1_SPEC.md` existe + enlazada en `DECISIONS_INDEX.md` + `legalReviewStatus` declarado.
- [ ] Doc funcional + manual de uso existen.
- [ ] Flag `final_settlement_resignation_production_enabled` default `FALSE` hasta `legalReviewStatus=approved`.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm vitest run src/lib/payroll/final-settlement`
- `pnpm vitest run src/lib/payroll/number-to-spanish-words`
- `pnpm vitest run src/lib/copy/finiquito`
- `pnpm test src/views/greenhouse/hr-core/offboarding`
- `pnpm test src/app/api/hr/offboarding`
- `pnpm build`
- `pnpm exec playwright test tests/e2e/smoke/hr-final-settlement-resignation.spec.ts --project=chromium`
- Render manual del PDF en los 5 estados canónicos del mockup aprobado (`in_review`, `approved`, `issued`, `signed_or_ratified`, `rejected`) y comparación visual **lado-a-lado contra el mockup** ([docs/mockups/task-862-finiquito-renuncia-v1-legal.html](../../mockups/task-862-finiquito-renuncia-v1-legal.html)). Cualquier discrepancia se documenta y resuelve actualizando el mockup (con re-aprobación del owner) o ajustando el render — NO se mergea con drift visual.

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` → `complete`)
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado sobre TASK V2 derivada y TASK-784
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` registra cierre
- [ ] `DECISIONS_INDEX.md` enlaza spec canónica
- [ ] CLAUDE.md sección "Payroll — Final settlement V1 invariants" actualizada con hard rules + matriz de estados watermark
- [ ] Flag `final_settlement_resignation_production_enabled` documentado
- [ ] Spec marcado `legalReviewStatus: approved` antes de flippear flag a TRUE en producción
- [ ] **PDF render comparado lado-a-lado contra el mockup aprobado** en los 5 estados canónicos (`in_review`, `approved`, `issued`, `signed_or_ratified`, `rejected`); diffs visuales documentados con screenshot adjunto al PR; sin discrepancias no resueltas
- [ ] Si el implementador necesitó actualizar el mockup durante Slice D, **re-aprobación explícita del owner** registrada en el PR antes del merge

## Follow-ups

- **TASK V2** — Final Settlement V2: dismissal causales (art. 159 N°1/4/5, art. 160, art. 161 incs. 1/2, art. 161 bis, art. 163 bis) + componentes indemnización (notice substitute, IAS, AFC offset, recargo art. 168).
- **TASK honorarios closure** — cierre de prestación de servicios (engine separado).
- **TASK RNDA integration** — consulta automática Registro Nacional Deudores Alimentos.
- **TASK AFC certificate** — generar certificado saldo CIC trabajador.
- **TASK digital signature** — firma electrónica avanzada.
- **TASK finance reconciliation hook** — wire `hr.final_settlement_document.signed_or_ratified` outbox event a `account_balances` para tracking pago efectivo.
- **TASK PDF/UA accessibility** — tagged PDF para lectores de pantalla.
- **~~TASK typography consolidation~~** — ya NO es follow-up; Slice B + Slice D de TASK-862 cierran el drift DM Sans → Geist en `document-pdf.tsx` y dejan los TTFs de Geist disponibles para que otros PDFs (e.g. `generate-payroll-pdf.tsx` que hoy usa Helvetica built-in) migren posteriormente sin trabajo adicional de assets.

## Open Questions

- ¿Revisión legal externa (Slice G) requiere abogado laboralista chileno específico ya identificado, o se contrata ad-hoc?
- ¿`greenhouse_core.organizations.logo_asset_id` debe permitir variantes (positive/negative/isotipo) o basta una sola? Decisión recomendada: una sola en V1, multi-variante en V2 con FK a un set de assets.

## Delta 2026-05-11 — Mockup v3 aprobado · contrato visual cerrado

**Aprobador**: Julio Reyes
**Mockup**: [docs/mockups/task-862-finiquito-renuncia-v1-legal.html](../../mockups/task-862-finiquito-renuncia-v1-legal.html)
**SHA256 prefix** (al momento de aprobación + post-fix typography 2026-05-11): `bc0f1fb268f398f4...`
**Tipografía pinada**: **Poppins (display) + Geist (body)** — canon `DESIGN.md` líneas 380+384. DM Sans está **deprecated** y NO se permite reintroducir. Slice B agrega los TTFs de Geist al repo + register-fonts; Slice D migra los 8 callsites de `document-pdf.tsx` que hoy violan el contrato.
**Logo pinado**: Efeonce wordmark canónico desde `public/branding/logo-full.svg` (embedded inline en el mockup); en producción se resolverá desde `greenhouse_core.organizations.logo_asset_id`.

### Decisiones canónicas frozen por la aprobación

1. **Watermark scope** (corregido vs. v1/v2 del mockup): watermark "PROYECTO" aparece **SÓLO** en `documentStatus IN ('rendered', 'in_review', 'approved')` — estados internos de HR. **Desde `issued` en adelante el PDF es CLEAN** (sin watermark) porque ese es el documento que el trabajador imprime y lleva al notario; el sello físico + firmas + huella le dan validez legal. Práctica chilena estándar confirmada contra caso real BICE.
2. **Watermarks especiales** para estados terminales adversos: "RECHAZADO" (rejected, error tonal), "ANULADO" (voided, error tonal), "REEMPLAZADO" (superseded, neutral tonal). Guardrail anti-uso accidental.
3. **Status pill** (preservado de `document-pdf.tsx` actual): refleja `documentReadiness.status` (`ready` / `needs_review` / `blocked`). Es ortogonal al watermark — habla de "se puede emitir?", no de "dónde está en el lifecycle?". El lifecycle se comunica vía watermark (estados internos) y vía datos visibles (ministro de fe poblado o no).
4. **State machine en mockup**: 5 estados canónicos en la state-matrix strip por `documentStatus` (`in_review`, `approved`, `issued`, `signed_or_ratified`, `rejected/voided`), 2 hojas completas (Hoja A = `issued` CLEAN, Hoja B = `signed_or_ratified` CLEAN con ministro de fe + reserva de derechos manuscrita visible).
5. **Huella**: caja 40×40 mm (no 56×56 como v1 del mockup).
6. **Greenhouse**: logo y URL al footer ("Documento generado con Greenhouse · greenhouse.efeoncepro.com") como utility branding. El logo del empleador en header.
7. **Cláusulas narrativas PRIMERO–QUINTO + Ley 21.389 banner + reserva de derechos block + ministro de fe column**: textos canónicos en `src/lib/copy/finiquito.ts` (Slice B).
8. **Test landmarks preservados** del `document-pdf.test.tsx` actual: 12 strings explícitamente listados en Slice D punto 1.

### Anti-drift contract

- Cualquier desviación visual entre el PDF generado por `document-pdf.tsx` (Slice D) y el mockup aprobado requiere update del mockup + re-aprobación explícita del owner. El Closing Protocol incluye un item dedicado a esto.
- Si el implementador descubre un caso edge no cubierto por el mockup (ej. monto muy largo que rompe el net-box, breakdown con 12+ líneas, estado terminal `superseded`, idioma alternativo), debe extender el mockup primero y pedir re-aprobación. NO improvisar en el código.
- El PR de Slice D **debe incluir screenshots** del PDF generado en los 5 estados canónicos lado-a-lado con el mockup correspondiente. Sin esto, reviewer bloquea el merge.
- ¿La Ley Bustos requiere también certificado de cotizaciones al día adjunto, o basta la declaración en cláusula tercera? Verificar con abogado durante Slice G.
- ¿`offboarding_cases.resignation_letter_asset_id` ya existe en la tabla? Si no, decidir si agregarla en migration TASK-862 o en task separada.


## Delta 2026-05-11 — Gate removido por decision del usuario

Decision operacional del usuario post-cierre: el flag `final_settlement_resignation_production_enabled` y el gate `legalReviewStatus: pending → approved` **NO se aplican como bloqueo**. V1 queda activa en produccion para uso real:

- No existe toggle de feature flag asociado en `home_rollout_flags` u otra tabla; las referencias en este spec eran aspiracionales doc-only.
- La revision por abogado laboralista chileno queda como **practica recomendada (no bloqueante)**. Si emergen observaciones legales durante uso real, se incorporan como Delta en `GREENHOUSE_FINAL_SETTLEMENT_V1_SPEC.md` + commits subsiguientes.
- El operador HR es responsable de validar cada finiquito antes de presentarlo al ministro de fe; Greenhouse genera el PDF, el sello fisico del notario le da validez legal.

Cualquier item de Closing Protocol o Open Question que referencie el flag o `legalReviewStatus` queda **resuelto como N/A**.

Follow-up canonico: **TASK-863** abre el wiring UI para los 2 pre-requisitos (subir carta renuncia + declarar pension alimentos) que hoy viven solo como endpoints sin botones dedicados en HrOffboardingView.
