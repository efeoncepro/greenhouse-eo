# TASK-863 — Finiquito Prerequisites UI: Carta Renuncia Uploader + Ley 21.389 Form en HrOffboardingView

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
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
