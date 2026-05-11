# TASK-863 — Finiquito Prerequisites UI: Carta Renuncia Uploader + Ley 21.389 Form en HrOffboardingView

## Delta 2026-05-11 V1.5.2 — Lifecycle PDF defense-in-depth (regen canónico en TODAS las transiciones)

**Trigger:** usuario detectó en re-emisión real (Valentina Hoyos settlement v2 d15) que el PDF aprobado seguía mostrando "Borrador HR" + watermark "PROYECTO". Diagnóstico: solo `issued` + `signed_or_ratified` regeneraban el PDF; las 5 transitions restantes (`in_review`, `approved`, `voided`, `rejected`, `superseded`) dejaban el PDF stale vs DB.

**Decisión arquitectónica:** rechazar parche puntual y aplicar solución defense-in-depth de 5 capas siguiendo patterns canónicos del repo (TASK-774 reliability signal + TASK-742 captureWithDomain + TASK-863 V1.1 helper).

**5 capas implementadas:**

1. **Helper canónico extendido:** `regenerateDocumentPdfForStatus` con type union cerrado `DocumentStatusForRegen = 'in_review' | 'approved' | 'issued' | 'signed_or_ratified' | 'voided' | 'rejected' | 'superseded'`. Las 7 transiciones del state machine ahora lo invocan en la misma tx PG que el UPDATE.
2. **Asset metadata canónica:** cada regen persiste `metadata_json.documentStatusAtRender = newStatus` en `greenhouse_core.assets`. Initial draft creation también persiste con `'rendered'`.
3. **Observability:** `captureWithDomain('payroll', err, { tags: { source: 'final_settlement_pdf_regen', stage }, extra })` reemplaza `console.warn` raw.
4. **Reliability signal nuevo:** `payroll.final_settlement_document.pdf_status_drift` ([src/lib/reliability/queries/final-settlement-pdf-status-drift.ts](../../../src/lib/reliability/queries/final-settlement-pdf-status-drift.ts)). Detecta drift entre DB y asset metadata. Kind=drift, warning si count>0, error si drift>24h. Wireup en `getReliabilityOverview.finalSettlementPdfStatusDrift`. Steady=0.
5. **Test anti-regresión:** `document-status-regen-invariant.test.ts` parsea source y enforce que TODA `SET document_status = 'X'` (excepto `rendered`) tiene call matchedo a helper. 9/9 verde. Rompe build si emerge transition nueva sin regen.

**Failure mode canónico (degradación honesta):** si render falla, transition de DB ya commiteó (estado legal source of truth, NO bloquea por render) + Sentry alerta via captureWithDomain + reliability signal detecta drift hasta reissue (path explícito de recovery).

**Hard rules canonizadas:** sección nueva "Final Settlement Document Lifecycle invariants" en CLAUDE.md con matriz canónica watermark/badge per status + 7 reglas duras.

**ADR registrado:** "Finiquito PDF lifecycle invariant: regen canónico en TODAS las transiciones + defense-in-depth" en `DECISIONS_INDEX.md`.

**Tests verde:** 12/12 en `src/lib/payroll/final-settlement` (3 archivos: document-pdf 2, calculator 1, regen-invariant 9). `pnpm tsc --noEmit` clean.

**Aprendizaje meta:** el bug emergió EXACTAMENTE en el paso 4-5 del Real-Artifact Iterative Verification Loop V1 canonizado hoy (operador descargó artefacto real → screenshot al agente → análisis de bug class). Demuestra ROI inmediato de la metodología.

**Recovery histórico:** docs pre-V1.5.2 con `metadata.documentStatusAtRender` NULL aparecen en el signal hasta que operador haga reissue (idempotente, audit trail preserved). NO requiere backfill masivo.

---

## Delta 2026-05-11 V1.1-V1.5.1 — Hardening enterprise post-primer emisión real

Primer emisión real del finiquito (Valentina Hoyos, `EO-OFF-2026-45EC8688`) detectó múltiples hallazgos visuales y legales. 5 rondas iterativas de fixes cerraron 12 hallazgos visuales + 5 bloqueantes legales detectados por comprehensive audit enterprise (3 skills: `greenhouse-payroll-auditor` + UX writing es-CL formal-legal + `modern-ui`). Hotfix V1.5.1 cerró invariante de columnas en Partes comparecientes.

- **V1.1 auto-regen PDF al transicionar:** helper privado `regenerateDocumentPdfForStatus` reemplaza `pdf_asset_id` del MISMO documento (sin bump versión, sin reissue) cuando transita a `issued` o `signed_or_ratified`. Matriz canónica de watermark per `documentStatus` (rendered/in_review/approved → PROYECTO, issued/signed_or_ratified → CLEAN, blocked/rejected/voided → tonal error, superseded → REEMPLAZADO).
- **V1.2-V1.3 polish visual:** Geist + Poppins con ligadura "fi" funcional, footer en banda única, jerarquía title 20pt > KPI 14pt (ratio 1.43x), cláusula CUARTO `wrap={false}` no se parte entre páginas, signature slot 3 columnas con paddingTop simétrico, user-id technical removido del texto legal.
- **V1.4 Legal Signatures Platform canónica:** nueva spec `GREENHOUSE_LEGAL_SIGNATURES_PLATFORM_V1.md`. Helper `src/lib/legal-signatures/` con path-safe protection. Filename canónico `{taxId_normalizado}.png` en `src/assets/signatures/`. Reusable por cualquier flow legal futuro (contratos, addenda, cartas formales, certificados). Firma Julio Reyes embedded como `77357182-1.png` (Efeonce SpA).
- **V1.5 cierre de 5 bloqueantes legales/UI:**
  - **B-1:** Cláusula PRIMERO separa `resignationNoticeSignedAt` (firma trabajador) de `resignationNoticeRatifiedAt` (ratificación notarial art. 177 CT). Mezclarlas era vicio defendible en demanda chilena.
  - **B-2:** Cláusula SEGUNDO con verbo performativo `isRatified`-conditional. Pre-ratificación: "declara que recibirá, al momento de la ratificación...". Post-ratificación: "declara haber recibido en este acto...". Evita vicio de consentimiento en documentos draft.
  - **B-3:** Cláusula CUARTO cita artículo operativo Ley 14.908: "art. 13 de la Ley N° 14.908 sobre Abandono de Familia y Pago de Pensiones Alimenticias, en su texto modificado por la Ley N° 21.389 de 2021". Antes solo citaba la modificatoria → jurídicamente débil.
  - **B-4:** Simetría visual de 3 columnas firma (`paddingTop: 36` en `signatureColumn` reserva espacio simétrico; las 3 líneas caen al mismo Y absoluto).
  - **B-5:** Title legal 20pt Poppins Bold domina KPI 14pt Poppins SemiBold (ratio 1.43x). Notarios/abogados leen primero el ACTO, después el monto.
- **V1.5.1 hotfix invariante de columnas Partes:** bug detectado por usuario en PDF real emitido — el recuadro "Cargo" del trabajador aparecía en col 1 (empleador) porque `partyGrid` es 2-cols con flexWrap y workerJobTitle quedaba como 7º cell → caída natural a col 1. Fix: insertar `<View style={styles.field} />` (spacer vacío) como 7º cell, empujando workerJobTitle a col 2 (trabajador). **Invariante canonizada:** todos los datos del trabajador (legalName, taxId, address, jobTitle) viven en col 2; todos los del empleador en col 1. Cuando una dimensión existe solo para una parte, spacer vacío preserva simetría.
- **3 ADRs nuevos** en `docs/architecture/DECISIONS_INDEX.md`.
- **Docs canonizadas:** spec V1 Legal Signatures Platform (118 líneas), spec finiquito +105 líneas con Delta V1.1 + V1.5, doc funcional v1.2→v1.3, manual de uso v1.2→v1.3 con sección nueva "Cómo subir firma del representante legal", CLAUDE.md +80 líneas con invariantes Legal Signatures Platform + Finiquito V1.5.
- **Tests:** 11/11 legal-signatures verde, 2/2 document-pdf verde.
- **Verdict:** documento V1.5.1 listo para uso productivo con clientes reales. Recomendación pre-uso recurrente: 1 sesión con abogado laboralista chileno (~1h) para validar las 3 interpretaciones legales (B-1/B-2/B-3) — citas exactas + verbos performativos + separación de hitos.
- **Aprendizaje canonizado para futuros docs legales:** loop iterativo post-emisión real reveló 5 rondas de fixes que un audit pre-emisión no había detectado. Pattern: emitir 1 caso real → comprehensive audit 3-skills → cerrar bloqueantes → canonizar.

---

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Medio`
- Effort: `Bajo` (~1-2 h)
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none` (TASK-862 cerrada — endpoints + readiness checks ya viven)
- Branch: `task/TASK-863-finiquito-prerequisites-ui` (o `develop` directo segun instruccion operativa)
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

TASK-862 cerro V1 del finiquito de renuncia voluntaria con 2 endpoints nuevos
(`POST /api/hr/offboarding/cases/[caseId]/resignation-letter` + `/maintenance-obligation`)
y 3 readiness checks (`resignation_letter_uploaded`, `maintenance_obligation_declared`,
`worker_address_resolved`). Hoy esos endpoints **no tienen UI dedicada** en
`HrOffboardingView.tsx` — el operador HR debe llamarlos via consola del navegador o
script auxiliar. Esta task agrega un Card "Prerequisitos del finiquito" en la fila
expandida del caso para que el flujo sea click-and-go: subir carta de renuncia + declarar
pension de alimentos sin tocar codigo.

## Why This Task Exists

Durante el primer caso real post-cierre (Valentina Hoyos 2026-05-11) emergio que los
2 pre-requisitos canonicos del finiquito V1 viven solo como HTTP endpoints sin
disparadores en la UI. El flujo operativo termina siendo:

1. Operador HR abre `/hr/offboarding`.
2. Encuentra el caso, intenta "Calcular finiquito".
3. Greenhouse responde 409 readiness blocked (carta renuncia + pension alimentos faltantes).
4. Operador tiene que abrir DevTools y POSTear manualmente.

Eso rompe el contrato "UI runtime cubre los happy paths del modulo" y agrega friccion
operacional. La fix correcta es exponer ambos pre-requisitos como acciones visibles
en la fila del caso (o un drawer dedicado) con upload + form + indicador "Listo para
calcular" cuando ambos esten satisfechos.

## Goal

- Operador HR puede subir la carta de renuncia ratificada del trabajador sin tocar consola.
- Operador HR puede declarar pension de alimentos (Alt A no afecto / Alt B afecto con
  amount + beneficiary + evidence opcional) desde un form en la UI.
- Estado visible de cada pre-requisito (`Sin subir` / `Subida` / `Pendiente declarar` / `Declarada`)
  en la fila del caso.
- Boton "Calcular finiquito" queda **disabled** con tooltip explicativo si algun
  pre-requisito esta pendiente (defense in depth — el backend ya bloquea con readiness).
- Re-upload + re-declaracion son idempotentes (cuando el operador necesita corregir).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINAL_SETTLEMENT_V1_SPEC.md` — pre-requisitos canonicos V1
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — primitives Vuexy + GreenhouseFileUploader

Reglas obligatorias:

- **NO** crear endpoints nuevos. Los 2 endpoints ya viven (Slice C de TASK-862); esta task
  es 100% UI.
- **NO** inventar microcopy nuevo si ya vive en `GH_FINIQUITO.resignation.operatorBanners`
  o `getMicrocopy()`. Extender `GH_FINIQUITO` si emerge necesidad de copy nuevo.
- Usar `<GreenhouseFileUploader>` (primitive canonico TASK-721) con
  `contextType='resignation_letter_ratified'` o nuevo context dedicado si emerge gap.
- Tuteo es-CL (HR dashboard convention) en labels operativos. Las clausulas legales
  siguen siendo formal (esto NO cambia).
- Para cualquier toque a `HrOffboardingView.tsx` invocar `greenhouse-dev` + `greenhouse-ux`
  + `greenhouse-microinteractions-auditor` antes de implementar.
- Microcopy nueva via `greenhouse-ux-writing` skill antes de mergear.

## Normative Docs

- `src/views/greenhouse/hr-core/offboarding/HrOffboardingView.tsx` — view actual con
  dialog `sign-or-ratify` ya implementado (Slice E TASK-862) como referencia de pattern.
- `src/app/api/hr/offboarding/cases/[caseId]/resignation-letter/route.ts` — endpoint
  `{ assetId }` body.
- `src/app/api/hr/offboarding/cases/[caseId]/maintenance-obligation/route.ts` — endpoint
  `{ variant, amount?, beneficiary?, evidenceAssetId? }` body.
- `src/lib/storage/greenhouse-assets.ts` — `storeSystemGeneratedPrivateAsset` para subir
  carta como private asset.
- `src/components/greenhouse/uploaders/GreenhouseFileUploader.tsx` (TASK-721) si existe;
  sino el patron de upload privado.
- `src/lib/copy/finiquito.ts` — `GH_FINIQUITO.resignation.operatorBanners` ya tiene
  copy es-CL tuteo para mensajes ("Sube la carta de renuncia ratificada..." etc.).

## Dependencies & Impact

### Depends on

- TASK-862 cerrada (los 2 endpoints + readiness checks + snapshot extension viven).
- TASK-721 (asset uploader canonico) si emerge.

### Blocks / Impacts

- Desbloquea el flujo real-world de finiquitos sin friccion (Valentina Hoyos + cualquier
  renuncia subsecuente).
- Habilita medicion de tiempo-to-finiquito real desde la UI.

### Files owned

- `src/views/greenhouse/hr-core/offboarding/HrOffboardingView.tsx`
- `src/views/greenhouse/hr-core/offboarding/HrOffboardingView.test.tsx` (extender)
- `src/lib/copy/finiquito.ts` (extender `operatorBanners` si emerge necesidad)
- (eventual) `src/views/greenhouse/hr-core/offboarding/FinalSettlementPrerequisitesCard.tsx` (subcomponente)

## Current Repo State

### Already exists

- 2 endpoints HTTP (`/resignation-letter` + `/maintenance-obligation`) — TASK-862 Slice C.
- 3 readiness checks en `buildDocumentReadiness` — TASK-862 Slice C.
- Schema columns en `work_relationship_offboarding_cases` (`resignation_letter_asset_id`,
  `maintenance_obligation_json`) — migration `20260511170036789`.
- Helper TS `linkResignationLetterAsset` + `declareMaintenanceObligation` en
  `src/lib/workforce/offboarding/store.ts` con audit events.
- HrOffboardingView con dialog `sign-or-ratify` (Slice E) como pattern de referencia.
- Microcopy `GH_FINIQUITO.resignation.operatorBanners.{resignationLetterMissing,maintenanceObligationMissing,workerAddressMissing}`.

### Gap

- Sin UI para upload de carta de renuncia (operador necesita consola).
- Sin UI para declarar pension alimentos (operador necesita consola).
- HrOffboardingView no muestra estado de pre-requisitos por caso en la tabla.
- Boton "Calcular finiquito" no esta gated por pre-requisitos en el cliente (solo backend
  rechaza con 409 readiness).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice A — Estado visible de pre-requisitos en la fila del caso

1. Extender el reader del case en HrOffboardingView para incluir `resignationLetterAssetId`
   y `maintenanceObligationJson` (ya estan en `OffboardingCase` type via TASK-862 Slice C).
2. Agregar 2 chips/pills en la fila del caso de finiquito:
   - "Carta renuncia": `success` (subida) / `error` (faltante)
   - "Pension alimentos": `success` (declarada Alt A / Alt B) / `error` (faltante)
3. Boton "Calcular finiquito" gana `disabled` cuando alguno falta + Tooltip explicativo.

### Slice B — Dialog "Subir carta de renuncia"

1. Boton "Subir carta de renuncia" en la fila del caso (visible cuando assetId es null).
2. Dialog modal con:
   - GreenhouseFileUploader (o input file fallback) aceptando PDF (max 10 MB).
   - Helper text: "PDF de la carta de renuncia ratificada del trabajador. Si ya esta
     escaneada con firma del trabajador, mejor."
   - Si el uploader canonico no existe en el repo, usar `<input type='file' accept='application/pdf'>`
     + POST a `/api/assets/private` con context `resignation_letter_ratified` (verificar
     que el context exista en el catalog de assets; agregar si no).
3. Al subir, link al case via `POST /api/hr/offboarding/cases/[caseId]/resignation-letter`
   con `{ assetId: <returned> }`.
4. Refresh case data + cerrar dialog.

### Slice C — Dialog "Declarar pension de alimentos (Ley 21.389)"

1. Boton "Declarar pension alimentos" en la fila del caso (visible cuando
   `maintenanceObligationJson` es null) o "Ver/editar declaracion" cuando ya existe.
2. Dialog modal con:
   - RadioGroup: Alt A "No afecto a retencion" / Alt B "Si afecto a retencion".
   - Si Alt B: TextField `amount` (CLP, type=number, required, min 1) + TextField
     `beneficiary` (required) + GreenhouseFileUploader opcional para `evidenceAssetId`
     (certificado RNDA u otro respaldo).
3. Al confirmar, POST `/api/hr/offboarding/cases/[caseId]/maintenance-obligation` con
   shape canonico.
4. Refresh case data + cerrar dialog.

### Slice D — Tests anti-regresion

1. Extender `HrOffboardingView.test.tsx`:
   - Render con `resignationLetterAssetId=null` → chip rojo + boton subir visible + boton
     calcular disabled.
   - Render con `resignationLetterAssetId='asset-X'` → chip verde + sin boton subir.
   - Render con `maintenanceObligationJson=null` → chip rojo + boton declarar visible.
   - Render con `maintenanceObligationJson={variant:'not_subject',...}` → chip verde
     "No afecto".
   - Submit del dialog "Subir carta" → fetch a `/resignation-letter` con assetId correcto.
   - Submit del dialog "Declarar pension" Alt B → validation client (amount > 0,
     beneficiary required) + fetch a `/maintenance-obligation`.

### Slice E — Docs

1. Actualizar `docs/manual-de-uso/hr/finiquitos.md` con el nuevo flow (sin DevTools).
2. Actualizar `docs/documentation/hr/finiquitos.md` con Delta indicando que los 2
   pre-requisitos viven en UI.

## Out of Scope

- NO cambiar endpoints backend (ya canonizados Slice C TASK-862).
- NO cambiar el dialog sign-or-ratify (Slice E TASK-862, ya canonizado).
- NO consultar RNDA automatico (V1 acepta declaracion humana; consulta automatica
  es follow-up V1.1 distinto).
- NO emitir outbox events nuevos (los endpoints ya escriben audit events en
  `work_relationship_offboarding_case_events`).

## Detailed Spec

### Shape de los chips de estado

```tsx
const resignationLetterChip = item.resignationLetterAssetId
  ? <CustomChip label='Carta subida' color='success' size='small' />
  : <CustomChip label='Carta faltante' color='error' size='small' />

const maintenanceObligationChip = item.maintenanceObligationJson
  ? item.maintenanceObligationJson.variant === 'not_subject'
    ? <CustomChip label='Pension: No afecto' color='success' size='small' />
    : <CustomChip label={`Pension: Afecto $${item.maintenanceObligationJson.amount}`} color='warning' size='small' />
  : <CustomChip label='Pension pendiente' color='error' size='small' />
```

### Disabled state del boton calcular

```tsx
const prerequisitesReady =
  Boolean(item.resignationLetterAssetId) &&
  Boolean(item.maintenanceObligationJson)

<Tooltip title={prerequisitesReady ? '' : 'Sube la carta de renuncia y declara la pension de alimentos antes de calcular.'}>
  <span>
    <Button disabled={!prerequisitesReady} onClick={...}>Calcular finiquito</Button>
  </span>
</Tooltip>
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Cada caso de offboarding con `separation_type='resignation'` muestra 2 chips de estado de pre-requisitos en su fila de la tabla.
- [ ] Boton "Subir carta de renuncia" abre dialog modal con uploader + POST a endpoint canonico Slice C TASK-862.
- [ ] Boton "Declarar pension alimentos" abre dialog modal con form Alt A/B + POST a endpoint canonico Slice C TASK-862.
- [ ] Boton "Calcular finiquito" queda disabled (+ Tooltip explicativo) cuando algun pre-requisito esta pendiente.
- [ ] Re-upload del PDF y re-declaracion de la obligacion son idempotentes (endpoints ya lo soportan).
- [ ] Tests HrOffboardingView extendidos cubren los 6 escenarios listados en Slice D.
- [ ] docs/manual-de-uso/hr/finiquitos.md actualizado con flow operativo sin DevTools.
- [ ] docs/documentation/hr/finiquitos.md Delta indicando UI completa.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm test src/views/greenhouse/hr-core/offboarding`
- `pnpm build`
- Manual: abrir `/hr/offboarding` en preview, ejercer el flow end-to-end con un caso de prueba.

## Closing Protocol

- [ ] `Lifecycle: complete` + mover a `complete/`
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` con entry visible
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` cerrado
- [ ] Verificacion E2E manual del flow en staging o local

## Follow-ups

- **V1.1 RNDA integration** — consulta automatica del Registro Nacional de Deudores
  Alimentos para auto-poblar `maintenanceObligation` cuando el trabajador tiene RUT
  registrado.
- **V1.1 Reserva de derechos manuscrita renderizada** — workerReservationNotes leido
  desde document-level y embebido en el PDF post-ratificacion con tipografia
  manuscrita (requiere Geist-Italic.ttf o Caveat.ttf registrado).

## Open Questions

- ¿Existe `<GreenhouseFileUploader>` canonico hoy en el repo (TASK-721), o hay que armar
  uno minimalista? Verificar antes de Slice B.
- ¿El context `resignation_letter_ratified` existe en el catalog de assets, o hay que
  agregarlo en `src/lib/storage/greenhouse-assets.ts`?
