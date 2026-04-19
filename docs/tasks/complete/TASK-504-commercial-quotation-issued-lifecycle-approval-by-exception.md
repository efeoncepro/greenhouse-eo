# TASK-504 — Commercial Quotation Issuance Lifecycle & Approval-by-Exception

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional]`
- Status real: `Implementado`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-504-quotation-issued-lifecycle-approval-by-exception`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Reformula el lifecycle documental de cotizaciones para separar correctamente borrador, aprobacion excepcional, emision oficial y distribucion. La cotizacion debe poder quedar `issued` sin requerir aprobacion cuando cumple politica, y descargar/enviar PDF no debe seguir mutando el mismo estado documental.

## Why This Task Exists

Hoy el runtime mezcla tres conceptos distintos dentro del mismo flujo: estado documental, aprobacion y distribucion. El resultado visible es inconsistente con el modelo comercial real:

- el builder guarda siempre en `draft`
- `POST /api/finance/quotes/[id]/send` hace dos cosas a la vez: pedir aprobacion por excepcion o transicionar a `sent`
- la aprobacion final puede terminar dejando la quote en `sent`, aunque el usuario esperaba una cotizacion emitida y versionada
- el detail view muestra `Borrador` en casos donde la quote ya tiene PDF descargable y version vigente
- enviar por mail, descargar PDF o compartir no deberian redefinir el estado documental principal

Esto genera ambiguedad operativa, cuello de botella innecesario y una semantica fragil para quote-to-cash, document chain y versionado futuro.

## Goal

- Separar estado documental vs aprobacion vs distribucion en el dominio de quotations
- Formalizar `issued` como estado oficial de una version emitida
- Mantener la aprobacion como control por excepcion, no como gate universal
- Hacer que la UI exprese acciones claras: guardar borrador, emitir, crear nueva version, descargar, enviar
- Preservar compatibilidad razonable con quote-to-cash, PDF y audit trail existentes

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`

Reglas obligatorias:

- la aprobacion de cotizaciones es **por excepcion**; no todas las quotes deben pasar por approval
- `issued` representa una version documental oficial; distribuirla por email/PDF/share es otro plano
- una version `issued` no debe volver a editarse in-place; cambios materiales deben crear nueva version
- las lecturas y mutaciones deben seguir siendo tenant-safe por `organization_id` o `space_id` segun el anchor canonico resuelto
- no romper el contrato organization-first de `TASK-486`

## Normative Docs

- `docs/documentation/finance/cotizador.md`
- `docs/documentation/finance/cotizaciones-gobernanza.md`
- `docs/documentation/finance/cotizaciones-multi-source.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-345-quotation-canonical-schema-finance-compatibility-bridge.md`
- `docs/tasks/complete/TASK-348-quotation-governance-runtime-approvals-versions-templates.md`
- `docs/tasks/complete/TASK-349-quotation-workspace-ui-pdf-delivery.md`
- `docs/tasks/complete/TASK-455-quote-sales-context-snapshot.md`
- `docs/tasks/complete/TASK-486-commercial-quotation-canonical-anchor.md`

### Blocks / Impacts

- `docs/tasks/to-do/TASK-497-quote-builder-autosave-react-hook-form.md`
- `docs/tasks/to-do/TASK-495-commercial-legal-document-chain-convergence.md`
- `src/app/api/finance/quotes/[id]/send/route.ts`
- `src/app/api/finance/quotes/[id]/approve/route.ts`
- `src/app/api/finance/quotes/[id]/pdf/route.ts`
- `src/lib/finance/quote-to-cash/materialize-invoice-from-quotation.ts`
- `src/lib/commercial/contract-lifecycle.ts`

### Files owned

- `src/app/api/finance/quotes/[id]/send/route.ts`
- `src/app/api/finance/quotes/[id]/approve/route.ts`
- `src/app/api/finance/quotes/[id]/pdf/route.ts`
- `src/app/api/finance/quotes/[id]/route.ts`
- `src/app/api/finance/quotes/[id]/versions/route.ts`
- `src/lib/finance/quotation-canonical-store.ts`
- `src/lib/commercial/governance/approval-steps-store.ts`
- `src/lib/commercial/quotation-events.ts`
- `src/lib/commercial/contract-lifecycle.ts`
- `src/lib/finance/contracts.ts`
- `src/lib/finance/quote-to-cash/materialize-invoice-from-quotation.ts`
- `src/views/greenhouse/finance/QuoteDetailView.tsx`
- `src/views/greenhouse/finance/QuotesListView.tsx`
- `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/documentation/finance/cotizador.md`
- `docs/documentation/finance/cotizaciones-gobernanza.md`

## Current Repo State

### Already exists

- `greenhouse_commercial.quotations` y `greenhouse_commercial.quotation_versions` ya materializan la quote canonica y su version actual via `src/lib/finance/quotation-canonical-store.ts`
- el approval runtime ya existe en `src/lib/commercial/governance/approval-steps-store.ts` y expone `/api/finance/quotes/[id]/approve`
- el flujo `send` hoy evalua margin/discount health y:
  - si requiere aprobacion -> crea approval steps y deja la quote en `pending_approval`
  - si no requiere aprobacion -> transiciona a `sent`
- el detail y la lista aun leen labels/document state sobre statuses legacy (`draft`, `pending_approval`, `approved`, `sent`, `converted`, etc.)
- el PDF ya existe como capability en `/api/finance/quotes/[id]/pdf`
- quote-to-cash aun acepta quotes `approved` o `sent` en `src/lib/finance/quote-to-cash/materialize-invoice-from-quotation.ts`

### Gap

- `sent` mezcla emision oficial y distribucion al cliente
- `approved` hoy funciona mas como estado intermedio tecnico que como estado comercial entendible
- la UI no expresa con claridad la diferencia entre guardar borrador, emitir una version y enviar/distribuir
- una quote puede verse como `Borrador` aunque para el usuario ya sea una cotizacion formal con PDF/version
- el approval flow esta acoplado al boton/route `send`, lo que fuerza una semantica incorrecta para casos sin aprobacion

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Canonical lifecycle model

- definir el set canonico de document states para quotation version, con backward-compat plan desde los estados legacy
- separar formalmente:
  - estado documental
  - aprobacion
  - distribucion / delivery events
- introducir el comando canonico de negocio `issue` o equivalente, desacoplado de `send`
- decidir y documentar el contrato de compatibilidad para statuses legacy consumidos por quote-to-cash y readers existentes

### Slice 2 — Backend commands and transitions

- implementar el flujo `draft -> issued` cuando la quote no requiere aprobacion
- implementar el flujo `draft -> approval_pending -> issued` cuando la quote si requiere aprobacion
- hacer que la aprobacion final emita la version oficial en vez de dejarla en un estado ambiguo heredado de `send`
- mantener `send/email/share/download` como acciones de distribucion, no como transiciones del estado documental principal
- endurecer audit log y `quotation-events` para distinguir `issue_requested`, `issued`, `approval_requested`, `approval_decided`, `pdf_generated`, `delivery_sent`

### Slice 3 — Versioning and immutability

- garantizar que una version `issued` quede congelada como documento oficial
- definir y materializar el flujo para crear nueva version editable cuando se necesite cambiar una quote emitida
- ajustar readers de versiones, detail y canonical store para reflejar correctamente la version emitida actual vs nuevas drafts

### Slice 4 — UI and UX cutover

- Quote Builder:
  - exponer CTA clara de `Guardar borrador`
  - exponer CTA clara de `Emitir cotizacion`
- Quote Detail:
  - reemplazar la semantica actual de `Enviar` cuando en realidad corresponde a emitir
  - mostrar estado correcto (`Borrador`, `En aprobacion`, `Emitida`, `Expirada`, etc.)
  - mantener PDF / email / share como acciones posteriores sobre una quote emitida
- ajustar lista de cotizaciones, chips, tabs y mensajes para el nuevo contrato

### Slice 5 — Downstream and documentation convergence

- adaptar quote-to-cash, contract lifecycle y cualquier consumer que hoy depende de `sent`/`approved`
- actualizar arquitectura y documentacion funcional del cotizador/gobernanza
- dejar hooks o eventos correctos para converger despues con document vault y firma (`TASK-489` a `TASK-495`) sin reabrir la semantica de quotations

## Out of Scope

- implementar firma electronica o document vault shared dentro de esta task
- rehacer de cero el renderer PDF o el document manager transversal
- multi-user collaborative editing o merge de drafts concurrentes
- rediseño visual amplio del builder fuera de los CTAs, labels y estados requeridos por el lifecycle

## Detailed Spec

### 1. Modelo objetivo

La version de cotizacion debe dejar de colapsar todo en un solo `status`. El contrato objetivo separa:

- **document state**: `draft`, `approval_pending`, `approval_rejected`, `issued`, `superseded`, `expired`, `cancelled`
- **delivery events**: `pdf_downloaded`, `email_sent`, `link_shared`, `viewed`
- **business outcome**: `accepted`, `declined`, `converted` (si aplica como lane separada o derivada)

No es obligatorio materializar las tres dimensiones completas en un solo corte, pero la implementacion de este task debe mover el runtime en esa direccion y dejar de usar `sent` como alias ambiguo de emision+envio.

### 2. Reglas canonicas

- `draft` = documento editable, no oficial
- `issued` = documento oficial, versionado, PDF oficial, listo para descargar/enviar/compartir
- aprobacion solo aplica si la politica lo exige
- si una quote no requiere aprobacion, **emitirla** la lleva directo a `issued`
- si una quote requiere aprobacion, **emitirla** la lleva a `approval_pending`
- al aprobar todos los pasos pendientes, la quote debe terminar `issued`
- enviar por email o descargar PDF no debe degradar ni redefinir el document state
- editar una quote `issued` no debe reabrir esa misma version; debe crear una version nueva editable

### 3. Compatibilidad minima

La task debe resolver explicitamente como conviviran:

- estados legacy persistidos en `greenhouse_commercial.quotations.status`
- readers actuales en `QuoteDetailView`, `QuotesListView` y `quotation-canonical-store`
- consumers de quote-to-cash que hoy permiten `approved` o `sent`
- approvals y audit trails ya existentes en `greenhouse_commercial.approval_steps` / `quotation_audit_log`

La compatibilidad puede implementarse via:

- migracion de estados
- mapping bridge de lectura
- o contract shim temporal documentado

pero no debe quedar como patch implícito escondido en la UI.

### 4. Rutas y contratos esperados

El agente que implemente debe evaluar si conviene:

- mantener `/send` solo como delivery/distribution
- introducir `/issue`
- o renombrar internamente el comando y dejar `/send` como compat layer temporal

La decision debe preservar:

- API tenant-safe
- claridad semantica
- bajo riesgo para consumers existentes
- auditabilidad del lifecycle

### 5. Access model

No se espera un cambio de `routeGroups`, `views` ni `entitlements` broad. El impacto vive en surfaces ya existentes de Finance:

- `/finance/quotes`
- `/finance/quotes/new`
- `/finance/quotes/[id]`
- `/finance/quotes/[id]/edit`

Si la implementacion agrega nuevas acciones visibles, deben respetar el mismo access model V2 ya vigente para Finance.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] una quote que no requiere aprobacion puede pasar de `draft` a `issued` sin quedar en `pending_approval` ni depender de email/send
- [ ] una quote que si requiere aprobacion pasa a `approval_pending` y, tras la aprobacion final, queda `issued`
- [ ] descargar PDF, enviar email o compartir link ya no mutan el estado documental principal de la quote emitida
- [ ] la UI de builder/detail/lista refleja el nuevo contrato con labels y CTAs coherentes
- [ ] quote-to-cash y readers downstream dejan de depender de una semantica ambigua de `sent`
- [ ] arquitectura y documentacion funcional del modulo quedan actualizadas

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `pnpm test`
- `pnpm build`
- validacion manual en staging:
  - crear quote sin excepcion de approval -> emitir -> verificar `issued`
  - crear quote con excepcion -> solicitar emision -> verificar `approval_pending` -> aprobar -> verificar `issued`
  - descargar PDF / enviar / compartir -> verificar que el estado siga siendo `issued`
  - editar quote emitida -> verificar que el flujo cree nueva version editable o el mecanismo canonico definido

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md` y `docs/documentation/finance/cotizador.md` quedaron alineados con el lifecycle final implementado

## Follow-ups

- converger el PDF oficial emitido con document registry / document vault de `EPIC-001`
- revisar si `business outcome` (`accepted`, `declined`, `converted`) debe vivir en lane separada o dentro del mismo aggregate con otro campo
- evaluar si el comando legacy `/send` puede deprecarse formalmente tras una ventana de compatibilidad

## Open Questions

- si la materializacion final usa un solo campo `status` con mapping canónico o si conviene separar ya en este corte `document_state` vs `delivery_state`
- si `approval_rejected` debe ser estado persistido explicito o si basta con `draft` + audit trail despues del rechazo
