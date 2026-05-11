# TASK-867 — Offboarding Work Queue Projection + UX Modernization

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `task/TASK-867-offboarding-work-queue-ux`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Modernizar `/hr/offboarding` sin romper los flujos cerrados por TASK-862/TASK-863: crear una proyeccion read-only `OffboardingWorkQueue` que componga caso + ultimo calculo + ultimo documento + prerequisitos + proximo paso, y luego refactorizar la UI para operar como cola de trabajo con jerarquia, progreso, estados y acciones claras.

La task no reemplaza los endpoints de escritura existentes. Los reutiliza y reduce el N+1 actual de la vista, que hoy hace `GET /cases` y luego `GET /final-settlement` + `GET /final-settlement/document` por cada caso.

## Why This Task Exists

TASK-863 cerro el happy path funcional para subir carta de renuncia y declarar pension de alimentos, pero la superficie resultante sigue sintiendose como una tabla/formulario acumulativo:

- el formulario de creacion domina el first fold aunque la tarea recurrente es revisar casos y desbloquear acciones;
- la columna `Finiquito` mezcla estado, monto, prerequisitos, acciones, documento, warnings y PDF;
- la UI deriva workflow en JSX, no desde una proyeccion de dominio testeable;
- la carga de datos hace llamadas por caso para settlement y documento, generando N+1 y peor degradacion a medida que crece la cola;
- la experiencia no comunica bien el proximo paso, los blockers ni el progreso hacia calculo/emision/ratificacion.

La causa raiz no es cosmetica. Falta una proyeccion operacional server-side que convierta el estado canonico en una cola legible y que permita una UI moderna sin heuristicas duplicadas en React.

## Goal

- Crear un contrato read-only `OffboardingWorkQueue` para `/hr/offboarding`.
- Reducir la recomposicion N+1 en cliente para casos + finiquitos + documentos.
- Convertir la tabla actual en una cola operacional con `Estado operativo`, `Proximo paso` y `Accion principal`.
- Mantener intactos los write paths actuales de offboarding, final settlement, documentos, carta de renuncia y pension de alimentos.
- Dejar microcopy, estados, focus/hover/loading/empty/error y accesibilidad alineados con las skills de UI/UX/microinteracciones.

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
- `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINAL_SETTLEMENT_V1_SPEC.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md`
- `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- No cambiar source of truth: `greenhouse_hr.work_relationship_offboarding_cases` sigue siendo caso/lane/prerequisitos; `greenhouse_payroll.final_settlements` sigue siendo calculo; `greenhouse_payroll.final_settlement_documents` sigue siendo documento.
- No crear write paths nuevos para acciones ya existentes. Reutilizar endpoints canonicos actuales.
- La nueva proyeccion debe ser read-only, server-side y testeable.
- Si se formaliza como contrato canonico compartido, agregar decision/delta arquitectonico e indexarlo en `docs/architecture/DECISIONS_INDEX.md`.
- Access model: no agregar view/menu/capability salvo que discovery demuestre gap. El endpoint read-only debe exigir lectura de offboarding + final settlement + final settlement document.
- UI visible debe usar copy canonica en `src/lib/copy/*`; no hardcodear CTAs/estados reutilizables en JSX.
- Toda tabla operacional nueva o refactorizada debe usar `DataTableShell` cuando aplique.
- Cualquier motion/microinteraccion debe respetar reduced-motion y no cargar significado solo en color o hover.

## Normative Docs

- `docs/tasks/complete/TASK-862-final-settlement-resignation-v1-closing.md`
- `docs/tasks/complete/TASK-863-finiquito-prerequisites-ui.md`
- `docs/documentation/hr/finiquitos.md`
- `docs/manual-de-uso/hr/finiquitos.md`
- `DESIGN.md`

## Dependencies & Impact

### Depends on

- TASK-862 complete: endpoints, readiness checks, document lifecycle y finiquito V1.
- TASK-863 complete: upload carta renuncia, declaracion pension alimentos, microcopy y dialogs actuales.
- `src/lib/workforce/offboarding/store.ts`
- `src/lib/workforce/offboarding/types.ts`
- `src/lib/payroll/final-settlement/store.ts`
- `src/lib/payroll/final-settlement/document-store.ts`
- `src/views/greenhouse/hr-core/offboarding/HrOffboardingView.tsx`
- `src/components/greenhouse/data-table/DataTableShell.tsx`
- `src/components/greenhouse/primitives/FieldsProgressChip.tsx`
- `src/components/greenhouse/primitives/OperationalPanel.tsx`
- `src/components/greenhouse/primitives/OperationalSignalList.tsx`
- `src/components/greenhouse/GreenhouseFileUploader.tsx`
- `src/lib/copy/finiquito.ts`

### Blocks / Impacts

- Mejora la operacion recurrente de HR para finiquitos de renuncia voluntaria.
- Reduce riesgo de drift entre backend readiness y UI.
- Prepara la vista para mayor volumen de casos sin multiplicar requests por fila.
- Puede servir como patron para futuras work queues HR si se documenta bien.

### Files owned

- `src/lib/workforce/offboarding/work-queue.ts` (nuevo)
- `src/lib/workforce/offboarding/work-queue.test.ts` (nuevo)
- `src/app/api/hr/offboarding/work-queue/route.ts` (nuevo)
- `src/app/api/hr/offboarding/work-queue/route.test.ts` (nuevo si el repo mantiene pattern de route tests para este dominio)
- `src/views/greenhouse/hr-core/offboarding/HrOffboardingView.tsx`
- `src/views/greenhouse/hr-core/offboarding/HrOffboardingView.test.tsx`
- `src/views/greenhouse/hr-core/offboarding/*` (componentes locales nuevos si se extraen)
- `src/lib/copy/finiquito.ts`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md` o spec canonica equivalente si se agrega delta
- `docs/documentation/hr/finiquitos.md`
- `docs/manual-de-uso/hr/finiquitos.md`
- `changelog.md`
- `Handoff.md`

## Current Repo State

### Already exists

- `GET /api/hr/offboarding/cases` lista casos con `listOffboardingCases()`.
- `OffboardingCase` ya expone `resignationLetterAssetId` y `maintenanceObligationJson`.
- `POST /api/hr/offboarding/cases/[caseId]/resignation-letter` vincula carta de renuncia.
- `POST /api/hr/offboarding/cases/[caseId]/maintenance-obligation` declara Ley 21.389.
- `GET/POST /api/hr/offboarding/cases/[caseId]/final-settlement` lee/calcula settlement.
- `GET/POST /api/hr/offboarding/cases/[caseId]/final-settlement/document` lee/renderiza documento.
- Endpoints de documento existentes cubren submit review, approve, issue, sign-or-ratify, reissue, reject/void.
- `HrOffboardingView` ya implementa dialogs de carta, pension, reissue y sign-or-ratify.
- `GreenhouseFileUploader` es primitive canonica para assets privados draft.
- `FieldsProgressChip`, `DataTableShell`, `OperationalPanel` y `OperationalSignalList` existen como primitives compartidas.

### Gap

- No existe proyeccion server-side `OffboardingWorkQueue`.
- `HrOffboardingView` hace N+1 fetch: cases + latest settlement + latest document por caso.
- La regla de `nextStep` / `primaryAction` vive mezclada en JSX (`settlementActionFor`, `documentActionFor`, prereq gating).
- La vista no presenta una cola de trabajo clara: no hay summary strip, tabs/filtros por atencion, ni progreso accesible por caso.
- La columna `Finiquito` esta sobrecargada y dificil de escanear.

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

### Slice 0 — Architecture decision + work queue contract

- Revisar `DECISIONS_INDEX.md` y decidir si el contrato vive como delta en `GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md` o como doc dedicado.
- Formalizar `OffboardingWorkQueue` como proyeccion read-only, no source of truth.
- Definir types TS para:
  - `OffboardingWorkQueueItem`
  - `OffboardingWorkQueueSummary`
  - `OffboardingPrerequisiteStatus`
  - `OffboardingProgress`
  - `OffboardingNextStep`
  - `OffboardingPrimaryAction`
- Dejar explicito que actions del work queue son descriptors para UI, no autorizacion final ni mutaciones.

### Slice 1 — Backend projection + endpoint read-only

- Crear `src/lib/workforce/offboarding/work-queue.ts`.
- Implementar query unica o small bounded query set que obtenga:
  - caso;
  - nombre del colaborador;
  - ultimo final settlement;
  - ultimo final settlement document;
  - prerequisitos de renuncia;
  - documento historico vs settlement vigente.
- Evitar N+1 desde el cliente.
- Crear `GET /api/hr/offboarding/work-queue`.
- Reutilizar auth existente:
  - `hr.offboarding_case:read`
  - `hr.final_settlement:read`
  - `hr.final_settlement_document:read`
- Respetar `limit`, `status` y filtros existentes que apliquen; no romper `GET /cases`.
- Agregar tests unitarios para mapping de:
  - honorarios / non-payroll;
  - renuncia sin prerequisitos;
  - renuncia lista para calcular;
  - settlement calculado pendiente aprobacion;
  - documento aprobado pendiente emision;
  - documento emitido pendiente ratificacion;
  - documento historico frente a settlement vigente.

### Slice 2 — UI data migration with zero behavior loss

- Cambiar `HrOffboardingView` para consumir `/api/hr/offboarding/work-queue` como fuente principal de la tabla.
- Mantener endpoints de escritura actuales para cada accion.
- Despues de cada mutacion, refrescar work queue.
- Preservar dialogs actuales:
  - carta renuncia;
  - pension alimentos;
  - reissue;
  - sign-or-ratify.
- Mantener compatibilidad con `memberId` search param.
- No eliminar `GET /api/hr/offboarding/cases`; sigue sirviendo otros consumers.

### Slice 3 — Operational UX modernization

- Reestructurar first fold:
  - header claro de pagina;
  - CTA `Nuevo caso` o panel de creacion menos dominante;
  - summary strip con conteos derivados de `OffboardingWorkQueueSummary`.
- Convertir la tabla en work queue:
  - columna `Caso`;
  - columna `Colaborador`;
  - columna `Salida`;
  - columna `Estado operativo`;
  - columna `Proximo paso`;
  - columna `Accion principal`;
  - acciones secundarias agrupadas o desplazadas a drawer/menu cuando no son la decision principal.
- Usar `DataTableShell` para wrapper responsive.
- Usar `FieldsProgressChip` o primitive equivalente para comunicar progreso (`N/M listo`) con aria/live region.
- Para casos sin finiquito laboral, mostrar lane diferenciada y copy honesta en vez de forzarlos en la misma narrativa de finiquito.

### Slice 4 — Microinteractions, states, accessibility, copy

- Invocar antes de implementar UI:
  - `greenhouse-ui-orchestrator`
  - `greenhouse-ux-content-accessibility`
  - `greenhouse-microinteractions-auditor`
  - `ui-product-design-orchestrator`
  - `microinteractions-auditor`
  - `software-architect-2026` para revisar el plan si el contrato de proyeccion cambia durante discovery.
- Agregar estados:
  - loading skeleton para summary + filas;
  - empty state accionable;
  - partial/degraded state si settlement/document summary no carga;
  - error state con recovery.
- Mejorar copy en `GH_FINIQUITO`:
  - `Cola de offboarding`;
  - `Requieren accion`;
  - `Listos para calcular`;
  - `Falta carta`;
  - `Falta declaracion`;
  - `Lista para calcular`;
  - `Registrar ratificacion`.
- Evitar depender de color solamente: estado debe tener texto/icono.
- Agregar focus visible y keyboard path para row actions/drawer/menu.

### Slice 5 — Tests, docs, handoff

- Extender `HrOffboardingView.test.tsx` o suites nuevas para cubrir:
  - fetch del work queue;
  - render de summary;
  - render de acciones principales por estado;
  - gating de calcular por prerequisitos;
  - flujo existente de carta/pension sigue posteando a endpoints TASK-862;
  - empty/loading/error states.
- Actualizar doc funcional y manual de uso HR.
- Actualizar changelog si cambia comportamiento visible.
- Actualizar Handoff al cerrar con validaciones y riesgos.

## Out of Scope

- No cambiar formulas ni componentes legales del finiquito.
- No cambiar el lifecycle legal del PDF ni el helper `regenerateDocumentPdfForStatus`.
- No crear nuevos write endpoints para carta, pension, calculo, documento o transiciones.
- No cambiar capabilities ni views salvo que discovery detecte un gap real.
- No introducir automatic RNDA lookup ni validacion externa de pension de alimentos.
- No hacer backfills ni migraciones de datos salvo que la proyeccion requiera indices read-only y el plan lo justifique.
- No cerrar ni reabrir TASK-862/TASK-863; esta task es V2/follow-up.

## Detailed Spec

### Proposed work queue shape

```ts
export interface OffboardingWorkQueueItem {
  case: OffboardingCase
  collaborator: {
    memberId: string | null
    displayName: string | null
  }
  closureLane: {
    code: 'final_settlement' | 'contractual_close' | 'external_provider' | 'needs_classification'
    label: string
    allowsFinalSettlement: boolean
    helpText: string | null
  }
  latestSettlement: {
    finalSettlementId: string
    calculationStatus: FinalSettlementStatus
    readinessStatus: string
    readinessHasBlockers: boolean
    netPayable: number
    currency: 'CLP'
  } | null
  latestDocument: {
    finalSettlementDocumentId: string
    finalSettlementId: string
    documentStatus: FinalSettlementDocumentStatus
    readinessStatus: string
    pdfAssetId: string | null
    isHistoricalForLatestSettlement: boolean
  } | null
  prerequisites: {
    required: boolean
    resignationLetter: 'not_required' | 'missing' | 'attached'
    maintenanceObligation: 'not_required' | 'missing' | 'not_subject' | 'subject'
    blockingReasons: string[]
  }
  progress: {
    completed: number
    total: number
    label: string
    nextStepHint: string | null
  }
  nextStep: {
    code:
      | 'upload_resignation_letter'
      | 'declare_maintenance'
      | 'calculate'
      | 'approve_calculation'
      | 'render_document'
      | 'submit_document_review'
      | 'approve_document'
      | 'issue_document'
      | 'register_ratification'
      | 'review_payment'
      | 'external_provider_close'
      | 'none'
    label: string
    severity: 'info' | 'warning' | 'error' | 'success' | 'neutral'
  }
  primaryAction: {
    code: string
    label: string
    disabled: boolean
    disabledReason: string | null
  } | null
  secondaryActions: Array<{
    code: string
    label: string
    disabled: boolean
  }>
}
```

### Backend derivation rules

- `closureLane` debe reutilizar o extraer la logica hoy local en `HrOffboardingView`, no duplicarla en dos lugares permanentes.
- `prerequisites.required = true` solo cuando `closureLane.allowsFinalSettlement` y `separationType === 'resignation'`.
- `calculate` queda disabled cuando prerequisitos requeridos no estan completos.
- `document.isHistoricalForLatestSettlement = true` cuando existe documento pero `document.finalSettlementId !== latestSettlement.finalSettlementId`.
- `nextStep` debe elegir una accion dominante, no listar todas las posibilidades.
- Las acciones siguen siendo defense-in-depth: UI descriptor no reemplaza validacion backend.

### UX reference decision

Patron principal: `summary strip + operational work queue + row detail/drawer optional`.

Evitar:

- hero marketing;
- cards grandes por caso;
- meter todas las acciones como botones visibles;
- tabla con una columna monolitica de `Finiquito`;
- tooltips como unica explicacion de blockers.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe helper server-only `OffboardingWorkQueue` con tests de derivacion.
- [ ] Existe endpoint read-only `/api/hr/offboarding/work-queue` con auth/capabilities least-privilege.
- [ ] `HrOffboardingView` deja de hacer N+1 fetch por cada case para settlement/document.
- [ ] La vista mantiene todos los flujos funcionales existentes de TASK-862/TASK-863.
- [ ] La UI presenta summary, proximo paso, progreso y accion primaria de forma escaneable.
- [ ] Los estados loading/empty/partial/error quedan cubiertos.
- [ ] La copy visible reutilizable vive en `src/lib/copy/finiquito.ts` u otra capa canonica aplicable.
- [ ] Tests cubren los estados operativos principales y los endpoints de mutacion existentes siguen siendo llamados correctamente.
- [ ] La decision arquitectonica de la proyeccion queda documentada o explicitamente descartada en el plan con rationale.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm test src/lib/workforce/offboarding src/views/greenhouse/hr-core/offboarding src/lib/copy`
- `pnpm design:lint` si cambia UI visible o DESIGN-adjacent
- Prueba manual local o preview de `/hr/offboarding` con:
  - caso honorarios/non-payroll;
  - caso renuncia sin prerequisitos;
  - caso listo para calcular;
  - caso con settlement aprobado;
  - caso con documento emitido/ratificacion pendiente.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] docs funcionales/manual HR quedaron actualizados
- [ ] cualquier ADR/delta de arquitectura requerido quedo indexado en `docs/architecture/DECISIONS_INDEX.md`

## Follow-ups

- Posible TASK derivada: drawer de detalle de caso si el slice UI decide no incluirlo en V1.
- Posible TASK derivada: reliability signal para work queue projection si aparecen failures runtime persistentes.
- Posible TASK derivada: RNDA automatic lookup para pension de alimentos, fuera de esta V2.

## Delta 2026-05-11

Task creada desde review multi-skill de la vista `/hr/offboarding`: UI product design global, microinteractions global, `greenhouse-ui-orchestrator`, `greenhouse-ux-content-accessibility`, `greenhouse-microinteractions-auditor` y `software-architect-2026`. La conclusion canonica fue que la mejora debe partir por una proyeccion read-only de cola operacional antes de refactor visual.

## Open Questions

- Confirmar durante Discovery si `OffboardingWorkQueue` debe vivir solo en `src/lib/workforce/offboarding/` o si conviene exponer un submodulo `src/lib/workforce/offboarding/work-queue/` con files separados para types/queries/derivation.
- Confirmar si la UI V1 incluye drawer de detalle o si basta con tabla operacional + dialogs existentes.
