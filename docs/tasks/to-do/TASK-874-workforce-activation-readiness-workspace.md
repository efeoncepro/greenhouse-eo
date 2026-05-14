# TASK-874 — Workforce Activation Readiness Resolver + Workspace

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno aprobado por usuario`
- Rank: `TBD`
- Domain: `hr|identity|payroll|finance|ui`
- Blocked by: `TASK-873`
- Branch: `task/TASK-874-workforce-activation-readiness-workspace`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Crear una capa canónica de readiness para habilitar laboralmente a colaboradores con `workforce_intake_status != 'completed'`, y una experiencia operativa de Workforce Activation que permita a HR/Ops resolver los blockers desde un solo workspace. La task no reemplaza People, HR, Payroll, Legal Profile ni Payment Profiles: los orquesta y bloquea la transición final hasta que la ficha esté realmente lista.

## Why This Task Exists

TASK-872 materializó colaboradores internos desde SCIM con `workforce_intake_status='pending_intake'` para evitar que defaults peligrosos (`indefinido/chile/internal`) entraran a payroll sin ficha laboral. TASK-873 cierra el loop UI básico con badge, queue y acción de completar ficha, pero el problema operativo es más profundo: los datos necesarios para habilitar a una persona viven repartidos entre fecha de ingreso, cargo, compensación, relación legal, onboarding checklist, legal profile y payment profile.

Revisión codebase + DB 2026-05-14:

- `greenhouse_core.members` ya tiene `workforce_intake_status`, `hire_date`, `role_title`, `employment_type`, `contract_type`, `pay_regime`, `payroll_via`.
- `greenhouse_payroll.compensation_versions`, `greenhouse_core.person_legal_entity_relationships`, `greenhouse_hr.onboarding_instances`, `greenhouse_finance.beneficiary_payment_profiles` y Person Legal Profile ya existen como fuentes separadas.
- Staging tenía `56 pending_intake`, `10 in_review`, `39 completed`.
- Los `66` no completados tenían `hire_date` faltante, `employment_type` faltante, compensation faltante y payment profile aprobado faltante; `64/66` no tenían relación legal activa ni onboarding checklist activo; `42/66` no tenían cargo real.
- El endpoint `POST /api/admin/workforce/members/[memberId]/complete-intake` hoy es V1.0 minimal: cambia estado + outbox, sin validation pre-flight.

Sin esta task, HR seguirá haciendo click en múltiples superficies para editar ingreso, cargo, salario, documentos y payment profile, y el botón final de completar ficha puede marcar como `completed` un member con blockers reales.

## Goal

- Crear `resolveWorkforceActivationReadiness(memberId)` como primitive canónica read-only para clasificar readiness por carriles: Identity/Access, Work Relationship, Employment, Role Title, Compensation, Legal Profile, Payment Profile y Operational Onboarding.
- Extender el flujo de complete-intake para bloquear `completed` cuando `ready=false`, salvo override explícito, auditado y capability-gated.
- Crear un workspace de activación que convierta la queue de TASK-873 en una experiencia de resolución: filtros por blocker, drawer/detail por persona, next actions y deep links/drawers hacia facetas existentes.
- Agregar señales de confiabilidad para `ready_but_not_completed`, `completed_with_missing_readiness` y/o `activation_blocker_backlog`.
- Documentar el modelo operativo para HR: Workforce Activation orquesta fuentes, no duplica ownership de HR, Payroll, Finance, Legal Profile ni Identity.

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
- `docs/architecture/GREENHOUSE_WORKFORCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_ONBOARDING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `DESIGN.md` si se toca UI visible.

Reglas obligatorias:

- `Workforce Activation` es capa de orquestación/readiness. No se convierte en source of truth de compensación, cargo, perfil legal, payment profiles, onboarding checklist ni identidad.
- La acción final `complete-intake` debe consultar readiness canónico antes de mutar `members.workforce_intake_status='completed'`.
- El override de readiness, si existe, debe requerir capability granular nueva, razón obligatoria, snapshot de blockers y audit/outbox. No usar `roleCodes.includes(...)`.
- La solución debe distinguir ambos planos de acceso:
  - `views` / `authorizedViews` / `view_code` para surfaces visibles.
  - `entitlements` / capabilities para acciones finas como completar, overridear readiness o revelar datos sensibles.
- No introducir un `WorkRelationshipOnboardingCase` completo dentro de esta task salvo que el plan demuestre que es necesario. V1 debe funcionar sobre tablas existentes y dejar la migración al agregado canónico como follow-up si corresponde.
- No mezclar con TASK-788: promociones, effective-dating de cargo y promoción cargo+compensación siguen siendo owner de TASK-788.
- No mezclar con TASK-790: contractor engagement, cadence, tax owner y classification risk siguen siendo owner de TASK-790. Esta task solo reserva un blocker/slot para contractor readiness cuando aplique.
- No mover `hire_date` a Postgres-first por simetría sin revisar la regla vigente de `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`: el write path operativo de hire date sigue siendo HR profile legacy hasta cutover formal.
- Todo copy visible debe vivir en `src/lib/copy/workforce.ts` o la capa canónica de microcopy aplicable. No hardcodear copy reusable en JSX.
- Resolver causa raíz: no crear otro drawer que repita campos dispersos sin resolver el readiness contract.

### Approved UI Contract — hard rule

El mockup aprobado por usuario el `2026-05-14` es contrato de producto para la implementación UI de esta task. La implementación puede adaptar nombres de componentes, data fetching y rutas finales, pero NO puede cambiar el patrón de experiencia sin aprobación explícita del usuario.

Decisión de navegación aprobada:

- El destino operativo final debe vivir en el menú `Personas y HR`, no como experiencia primaria dentro de `Admin`.
- `Admin` puede conservar surfaces de gobierno, observabilidad, feature flags, entitlements, reliability o auditoría, pero no debe ser el home de trabajo diario para HR/Ops.
- View plane objetivo: crear o migrar a un view code de sección `equipo`, recomendado `equipo.workforce_activation`, visible para HR/Ops según `authorizedViews`.
- Route group objetivo: `hr` o el route group canónico vigente para superficies internas de Personas y HR. No usar `admin` como broad gate principal.
- Ruta final recomendada para implementación: `/hr/workforce/activation` si se mantiene el namespace HR actual, o `/workforce/activation` si el plan formaliza el módulo Workforce standalone. La decisión final se toma en Plan Mode, pero la ruta final NO debe quedar solo bajo `/admin/workforce/activation`.
- Menú recomendado: agregar item bajo `Personas y HR`, preferentemente dentro de un nuevo grupo `Workforce` / `Lifecycle laboral`, junto a futuras surfaces de activation, transitions y offboarding. Si el cambio de menú debe ser mínimo, agregar `Workforce Activation` como item directo bajo `Personas y HR`.

Referencia aprobada:

- Ruta mockup: `src/app/(dashboard)/admin/workforce/activation/mockup/page.tsx`
- View mockup: `src/views/greenhouse/admin/workforce-activation/mockup/WorkforceActivationMockupView.tsx`
- Data mockup: `src/views/greenhouse/admin/workforce-activation/mockup/data.ts`
- Captura desktop aprobada: `.captures/2026-05-14T11-29-27_inline-admin-workforce-activation-mockup/frames/01-snapshot.png`
- Captura mobile de degradación aceptable: `.captures/2026-05-14T11-28-58_inline-admin-workforce-activation-mockup/frames/01-snapshot.png`

Patrón obligatorio:

- La surface ES una consola operativa `queue + inspector`, no un dashboard, landing, wizard-first ni tabla aislada.
- First fold desktop:
  - header compacto con `Workforce Activation`, badges de estado y acciones globales.
  - barra compacta de señales + filtros.
  - layout principal de 2 columnas: cola priorizada amplia + inspector de readiness.
- La cola priorizada es el objeto dominante de trabajo. Debe permitir escanear persona, estado, blocker principal, readiness y edad sin truncamiento incoherente.
- El inspector es el lugar de decisión. Debe mostrar selected member, readiness %, blocker principal, CTA `Completar ficha`, acción secundaria `Ruta de desbloqueo` y lanes críticas.
- El CTA `Completar ficha` vive junto al contexto de readiness del inspector. No duplicar CTAs primarios por fila salvo que se proponga y apruebe una razón de accesibilidad/eficiencia.
- La barra de señales y filtros es secundaria; no puede ocupar más importancia visual que cola + inspector.
- Mobile/tablet deben degradar a lectura vertical. Se aceptan señales compactas y filtros horizontales contenidos, pero no desktop comprimido ni overflow horizontal del layout completo.
- Estados deben combinar texto + color/icono. No transmitir readiness solo por color.
- La UI no debe duplicar formularios de Compensation, Role Title, Legal Profile, Payment Profile u Onboarding. Debe deep-linkear o abrir drawers/facetas canónicas.

Reglas duras de rechazo:

- Rechazar cualquier implementación que vuelva al patrón de cuatro KPI cards grandes encima de una tabla.
- Rechazar cualquier implementación donde la tabla/cola quede cortada por el inspector en desktop.
- Rechazar cualquier implementación con tres columnas permanentes `rail + queue + inspector` en el shell actual, salvo evidencia Playwright de que no genera clipping en `1440x900`.
- Rechazar cualquier implementación que presente `Completar ficha` como acción habilitada si `readiness.ready=false`.
- Rechazar cualquier implementación que deje `Workforce Activation` solo accesible desde Admin como ruta/menú primario.
- Rechazar hardcode de copy reusable en JSX; usar `src/lib/copy/workforce.ts` o microcopy canónico.
- Rechazar scroll horizontal de página completa en mobile. Solo se permite scroll horizontal contenido dentro de filtros/chips.
- Rechazar una UI que se vea como dashboard genérico de métricas en vez de workspace operativo de resolución.

Checklist obligatorio antes de PR:

- Invocar skills `product-design-architect-2026`, `greenhouse-product-ui-architect` y `visual-regression-product-critic`.
- Ejecutar loop Playwright/Chromium con usuario agente dedicado usando `pnpm fe:capture` sobre la ruta implementada.
- Adjuntar o citar capturas desktop `1440x900` y mobile/tablet en el handoff/PR.
- Comparar explícitamente contra la captura desktop aprobada y declarar cualquier diferencia intencional.
- `pnpm design:lint` debe quedar en `0 errors / 0 warnings`.

## Normative Docs

- `docs/tasks/in-progress/TASK-873-workforce-intake-ui.md` o `docs/tasks/to-do/TASK-873-workforce-intake-ui.md` según lifecycle real al tomar esta task.
- `docs/tasks/complete/TASK-872-scim-internal-collaborator-provisioning.md`
- `docs/tasks/to-do/TASK-788-workforce-role-title-effective-dating-promotion-flow.md`
- `docs/tasks/to-do/TASK-790-contractor-engagements-runtime-classification-risk.md`
- `docs/operations/runbooks/scim-internal-collaborator-recovery.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-873` para queue UI base, badge y entrypoints de Workforce Intake.
- `src/app/api/admin/workforce/members/[memberId]/complete-intake/route.ts`
- `greenhouse_core.members.workforce_intake_status`
- `greenhouse_core.members.hire_date`
- `greenhouse_core.members.role_title`
- `greenhouse_core.members.employment_type`
- `greenhouse_core.members.contract_type`
- `greenhouse_core.members.pay_regime`
- `greenhouse_core.members.payroll_via`
- `greenhouse_core.person_legal_entity_relationships`
- `greenhouse_payroll.compensation_versions`
- `greenhouse_hr.onboarding_instances`
- `greenhouse_hr.onboarding_instance_items`
- `greenhouse_finance.beneficiary_payment_profiles`
- `src/lib/person-legal-profile/readiness.ts`
- `src/lib/finance/beneficiary-payment-profiles/resolve-self-service-context.ts`
- `src/lib/hr-onboarding/store.ts`
- `src/lib/workforce/role-title/*`
- `src/lib/payroll/postgres-store.ts`
- `src/lib/reliability/queries/scim-workforce-signals.ts`
- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`
- `src/lib/admin/view-access-catalog.ts`
- `src/lib/admin/entitlement-view-map.ts`

### Blocks / Impacts

- Bloquea flip operacional seguro de `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED=true` en producción si hay backlog de intake pendiente.
- Impacta People/HR detail, Workforce Intake queue, Admin Operations reliability dashboard y manuales HR.
- Reduce riesgo de payroll/capacity/payment con collaborators creados por SCIM pero no laboralmente habilitados.
- Deja preparado el camino hacia `WorkRelationshipOnboardingCase` sin requerir migración de caso completo en esta task.

### Files owned

- `src/lib/workforce/activation/readiness.ts` (nuevo)
- `src/lib/workforce/activation/readiness.test.ts` (nuevo)
- `src/lib/workforce/activation/types.ts` (nuevo)
- `src/app/api/admin/workforce/members/[memberId]/activation-readiness/route.ts` (nuevo)
- `src/app/api/admin/workforce/members/[memberId]/complete-intake/route.ts` (modificar)
- `src/app/api/admin/workforce/intake-queue/route.ts` (modificar si existe tras TASK-873)
- `src/views/greenhouse/admin/workforce-intake-queue/IntakeQueueView.tsx` (modificar si existe tras TASK-873)
- `src/views/greenhouse/admin/workforce-intake-queue/CompleteIntakeDrawer.tsx` (modificar si existe tras TASK-873)
- `src/views/greenhouse/admin/workforce-intake-queue/ActivationReadinessPanel.tsx` (nuevo)
- `src/lib/copy/workforce.ts` (modificar)
- `src/config/entitlements-catalog.ts` (modificar si se agrega override capability)
- `src/lib/entitlements/runtime.ts` (modificar si se agrega override capability)
- `src/lib/admin/view-access-catalog.ts` (modificar si se crea view code nuevo)
- `src/lib/admin/entitlement-view-map.ts` (modificar si se crea view code nuevo)
- `src/components/layout/vertical/VerticalMenu.tsx` (modificar para exponer entrypoint bajo `Personas y HR`)
- `src/lib/reliability/queries/workforce-activation-readiness.ts` (nuevo)
- `src/lib/reliability/get-reliability-overview.ts` (modificar)
- `docs/documentation/hr/workforce-activation-readiness.md` (nuevo)
- `docs/manual-de-uso/hr/habilitar-colaborador-workforce.md` (nuevo)
- `docs/architecture/GREENHOUSE_WORKFORCE_ONBOARDING_ARCHITECTURE_V1.md` (delta si el readiness resolver formaliza una decisión nueva)
- `docs/architecture/DECISIONS_INDEX.md` (delta ADR si cambia contrato compartido)

## Current Repo State

### Already exists

- TASK-872 creó `members.workforce_intake_status` y el endpoint `complete-intake`.
- TASK-873 define queue/UI base para mostrar pending intake y ejecutar complete-intake desde UI.
- `GREENHOUSE_WORKFORCE_ARCHITECTURE_V1.md` declara tres capas: profile, orchestration y workspace.
- `GREENHOUSE_WORKFORCE_ONBOARDING_ARCHITECTURE_V1.md` declara el objetivo canónico `WorkRelationshipOnboardingCase`, pero el agregado aún no existe en DB.
- `greenhouse_hr.onboarding_*` ya modela checklists operativos.
- `greenhouse_hr.work_relationship_offboarding_cases` ya existe para salida, lo que confirma que onboarding laboral todavía está menos formalizado que offboarding.
- Person Legal Profile tiene readiness gates reutilizables.
- Payment profiles existen en `greenhouse_finance.beneficiary_payment_profiles`.
- Role title governance existe en `src/lib/workforce/role-title/*`.
- Compensation versions existen en `greenhouse_payroll.compensation_versions`.

### Gap

- No existe `src/lib/workforce/activation/readiness.ts`.
- No existe un endpoint canónico de activation readiness por member.
- `complete-intake` no bloquea por blockers reales.
- La queue de TASK-873 no clasifica blockers por carril ni prioriza por next action.
- No existe snapshot auditado de readiness al completar intake.
- No hay reliability signals para detectar `completed` con ficha incompleta o `ready` sin completar.
- No hay manual HR que explique la diferencia entre provisioning SCIM, ficha pendiente, readiness y activación final.

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

### Slice 1 — Readiness model + pure resolver

- Crear `src/lib/workforce/activation/types.ts` con tipos:
  - `WorkforceActivationLane = 'identity_access' | 'work_relationship' | 'employment' | 'role_title' | 'compensation' | 'legal_profile' | 'payment_profile' | 'operational_onboarding' | 'contractor_engagement'`
  - `WorkforceActivationStatus = 'pending_intake' | 'in_review' | 'blocked' | 'ready_to_complete' | 'completed'`
  - `WorkforceActivationBlocker`
  - `WorkforceActivationWarning`
  - `WorkforceActivationNextAction`
  - `WorkforceActivationReadiness`
- Crear `resolveWorkforceActivationReadiness({ memberId, asOf? })`.
- Leer fuentes existentes con queries read-only:
  - `greenhouse_core.members`
  - `greenhouse_core.client_users` / `identity_profiles` cuando aplique identity/access
  - `greenhouse_core.person_legal_entity_relationships`
  - `greenhouse_payroll.compensation_versions`
  - `greenhouse_hr.onboarding_instances`
  - `greenhouse_finance.beneficiary_payment_profiles`
  - Person Legal Profile readiness helpers cuando aplique por lane.
- Definir blockers mínimos V1:
  - `member_missing`
  - `identity_profile_missing`
  - `hire_date_missing`
  - `employment_type_missing`
  - `role_title_missing`
  - `compensation_missing`
  - `active_legal_relationship_missing`
  - `onboarding_checklist_missing`
  - `payment_profile_missing_or_unapproved`
  - `legal_profile_blocking_for_chile_payroll`
  - `contractor_engagement_missing` solo como placeholder cuando `contract_type IN ('honorarios','contractor','eor')`.
- Definir warnings mínimos V1:
  - `legacy_hire_date_bigquery_only`
  - `role_title_drift_pending`
  - `onboarding_checklist_incomplete`
  - `payment_profile_pending_approval`
- Tests unitarios con mocks cubren: ready, blocked por cada lane, completed con missing readiness, contractor placeholder, degraded source error.

### Slice 2 — API + complete-intake guard

- Crear `GET /api/admin/workforce/members/[memberId]/activation-readiness`.
- Reutilizar capability `workforce.member.complete_intake` para lectura operativa V1, o agregar capability granular `workforce.member.activation_readiness.read` si el plan de acceso lo justifica.
- Modificar `POST /api/admin/workforce/members/[memberId]/complete-intake`:
  - antes de mutar, llama `resolveWorkforceActivationReadiness`.
  - si `ready=false`, responde `409` con blockers redacted y `code='activation_readiness_blocked'`.
  - permitir override solo si se agrega capability granular `workforce.member.activation_readiness.override` y body `{ overrideReason }` con largo mínimo.
  - publicar outbox payload extendido con `readinessSnapshot` o `readinessSnapshotHash` + `blockerCodes`.
- Mantener idempotencia para `completed`.
- Tests de route cubren happy path, blocked, override autorizado, override denegado, idempotente.

### Slice 3 — Queue enrichment + Activation Readiness Panel

- Extender la queue de TASK-873 para incluir summary de readiness por member:
  - `readinessStatus`
  - `blockerCount`
  - `topBlockerLane`
  - `nextActionLabel`
  - `ageDays`
- Crear `ActivationReadinessPanel` reutilizable para drawer/detail:
  - lista de carriles con estado `ready | blocked | warning | not_applicable`.
  - blockers accionables.
  - deep links o callbacks hacia facetas existentes: HR profile, role title, compensation, legal profile, payment profile, onboarding checklist.
  - no duplicar formularios complejos si ya existe drawer/route canónica.
- Implementar la UI usando el `Approved UI Contract — hard rule` de esta task:
  - barra compacta de señales + filtros.
  - cola priorizada amplia.
  - inspector lateral de readiness.
  - no KPI dashboard dominante.
  - no CTA primario duplicado por fila.
  - no tres columnas permanentes que compriman la cola.
- Agregar filtros en queue:
  - todos
  - ready to complete
  - missing compensation
  - missing hire date
  - missing legal relationship
  - missing payment profile
  - missing onboarding checklist
  - contractor lane
- Copy canónico en `src/lib/copy/workforce.ts`.
- Tests de componentes cubren estados blocked/ready/degraded.

### Slice 4 — Reliability signals + Admin Operations integration

- Crear signals:
  - `workforce.activation.ready_but_not_completed` — members con readiness ready pero status no completed.
  - `workforce.activation.completed_with_missing_readiness` — members completed que hoy fallarían readiness mínimo.
  - `workforce.activation.blocker_backlog` — backlog por blocker/lane para visibilidad operacional.
- Wire en `getReliabilityOverview()` bajo subsystem `Workforce` o el módulo existente más cercano si aún no existe subsystem.
- Agregar evidence con conteos por blocker lane, sin PII.
- Tests de signal cubren ok/warning/error/degraded.

### Slice 5 — Documentation + operating manual

- Crear `docs/documentation/hr/workforce-activation-readiness.md` explicando:
  - diferencia entre SCIM provisioning, People member, workforce intake y activation readiness.
  - ownership por dominio.
  - blockers y qué sistema los resuelve.
  - relación con TASK-788 y TASK-790.
- Crear `docs/manual-de-uso/hr/habilitar-colaborador-workforce.md` para HR/Ops:
  - cómo entrar a la queue.
  - cómo leer blockers.
  - cómo resolver fecha de ingreso, cargo, compensación, legal profile, payment profile y checklist.
  - cuándo usar override y cuándo no.
- Actualizar arquitectura/ADR si el plan decide formalizar `WorkforceActivationReadiness` como contrato canónico previo a `WorkRelationshipOnboardingCase`.
- Actualizar `changelog.md` si el comportamiento visible cambia para operadores.

## Out of Scope

- Implementar `WorkRelationshipOnboardingCase` completo y sus tablas. Esta task puede dejar ADR/follow-up, pero no debe colapsar toda la arquitectura de onboarding.
- Resolver TASK-788: effective-dating de cargo, promociones programadas y promoción cargo+compensación atómica.
- Resolver TASK-790: contractor engagement, payment cadence, tax owner y classification risk completo.
- Crear formularios duplicados para compensation, role title, legal profile o payment profile si ya existen drawers/rutas canónicas.
- Cambiar el source of truth de `hire_date` a Postgres-first antes del cutover formal de HR profile.
- Crear payroll entries o payment orders.
- Automatizar aprobación legal/contractual por país.

## Detailed Spec

### Readiness shape

```ts
export interface WorkforceActivationReadiness {
  memberId: string
  identityProfileId: string | null
  status: 'pending_intake' | 'in_review' | 'blocked' | 'ready_to_complete' | 'completed'
  ready: boolean
  asOf: string
  lanes: Array<{
    lane: WorkforceActivationLane
    status: 'ready' | 'blocked' | 'warning' | 'not_applicable' | 'degraded'
    label: string
    source: string
    blockers: WorkforceActivationBlocker[]
    warnings: WorkforceActivationWarning[]
    nextActions: WorkforceActivationNextAction[]
  }>
  blockers: WorkforceActivationBlocker[]
  warnings: WorkforceActivationWarning[]
  nextActions: WorkforceActivationNextAction[]
  summary: {
    blockerCount: number
    warningCount: number
    topBlockerLane: WorkforceActivationLane | null
    canComplete: boolean
    requiresOverride: boolean
  }
}
```

### Complete-intake state transition

```ts
const readiness = await resolveWorkforceActivationReadiness({ memberId })

if (!readiness.ready && !overrideAllowed) {
  return NextResponse.json(
    {
      error: 'Workforce activation readiness is blocked.',
      code: 'activation_readiness_blocked',
      blockers: readiness.blockers.map(({ code, lane, severity }) => ({ code, lane, severity }))
    },
    { status: 409 }
  )
}
```

### Access model target

- View plane:
  - TASK-873 creó un entrypoint/admin skeleton bajo `/admin/workforce/activation`; tratarlo como transitional/admin skeleton, no como home final.
  - Crear o migrar a view code `equipo.workforce_activation` salvo que Plan Mode justifique otro nombre canónico.
  - Exponer el entrypoint final en `Personas y HR` desde `src/components/layout/vertical/VerticalMenu.tsx`.
  - Si se conserva `/admin/workforce/activation`, debe ser alias, redirect, admin governance shell o compatibilidad temporal; no el menú primario.
- Entitlement plane:
  - Existing: `workforce.member.complete_intake`.
  - Optional new:
    - `workforce.member.activation_readiness.read`
    - `workforce.member.activation_readiness.override`
- Startup policy: no change expected.
- Route groups: no broad role-only gate.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (readiness resolver) MUST ship before Slice 2 (complete-intake guard).
- Slice 2 MUST ship before Slice 3 exposes “Completar” as readiness-aware UI; otherwise UI may show actions that backend still permits/denies inconsistently.
- Slice 3 depends on TASK-873 artifacts. If TASK-873 shape differs, adapt by adding a thin adapter instead of rewriting the queue.
- Slice 4 can start after Slice 1 because signals are read-only, but must use the same resolver contract as Slice 2.
- Slice 5 closes only after Slice 1-4 settle final terminology.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| `complete-intake` empieza a bloquear operadores por readiness demasiado estricta | HR / Workforce / UI | medium | Staging validation con Felipe/María + sample de pending intake; blockers V1 mínimos y override capability auditada | `workforce.activation.blocker_backlog`, route 409 logs |
| False positive `completed_with_missing_readiness` por legacy members completados antes de TASK-872 | Workforce / Reliability | high | Signal clasifica legacy separately o warning inicial; no muta datos automáticamente | `workforce.activation.completed_with_missing_readiness` |
| Resolver consulta muchas fuentes y degrada latencia de queue | Postgres / UI | medium | Batch reader para queue; per-member full resolver solo en drawer/detail; evitar N+1 | Vercel function duration, Sentry performance, logs |
| Se duplica ownership de compensation/role/legal/payment dentro de Workforce | Architecture / HR / Payroll / Finance | medium | Readiness solo lee y deep-linkea; mutations siguen en primitives existentes | Review de files touched; ADR check |
| Override permite completar ficha incompleta sin control | Payroll / Compliance | low | Capability granular + reason obligatorio + readiness snapshot + outbox/audit | outbox `workforce.member.intake_completed` payload override |
| TASK-788 o TASK-790 cambia contratos después de esta task | Workforce / HR | medium | Definir lanes extensibles y placeholders; no acoplar a tablas futuras no existentes | Follow-up tasks / failing tests when contracts land |
| Data sensible de legal/payment profile se filtra en queue | Privacy / Legal Profile / Finance | low | Mostrar solo blocker codes y masked summaries; sensitive reveal sigue en capabilities existentes | Sentry/log review; no PII evidence in signals |
| Cambio de `hire_date` contradice carril legacy BigQuery | HR Core / Payroll | medium | No cambiar write path; solo leer estado actual y documentar drift/cutover pendiente | `legacy_hire_date_bigquery_only` warning |

### Feature flags / cutover

- Sin flag para Slice 1: resolver read-only additive.
- Slice 2 debe evaluar si introduce env var temporal `WORKFORCE_ACTIVATION_READINESS_GUARD_ENABLED`.
  - Recomendado default `true` en staging, `false` en producción durante primer deploy si hay riesgo operacional.
  - Flip a `true` en producción después de verificar signals y queue durante 24h.
  - Revert: env var a `false` + redeploy.
- Override capability debe estar off para roles no admin por default. No usar override como camino normal.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert del PR/commit de resolver; no muta datos | <30 min | sí |
| Slice 2 | Desactivar `WORKFORCE_ACTIVATION_READINESS_GUARD_ENABLED=false` si existe; si no, revert del commit que modifica route `complete-intake` | <5 min con flag / <30 min con revert | sí |
| Slice 3 | Revert UI queue/panel; backend guard puede quedar activo | <30 min | sí |
| Slice 4 | Revert wire-up de signals o marcar signal degraded/disabled si se implementa registry toggle | <30 min | sí |
| Slice 5 | Revert docs/manuales o publicar delta correctivo | <15 min | sí |

### Production verification sequence

1. `pnpm pg:doctor` para confirmar acceso DB sano.
2. Ejecutar tests unitarios del resolver con fixtures de pending/ready/completed.
3. Staging: llamar readiness endpoint para Felipe y María; esperado `ready=false` con blockers de hire date, role title/si aplica, compensation y payment profile.
4. Staging: intentar `complete-intake` sin resolver blockers; esperado `409 activation_readiness_blocked`.
5. Staging: verificar queue TASK-873 enriquecida muestra blocker lanes y no expone PII.
6. Staging: resolver manualmente un fixture controlado o crear fixture test con datos mínimos; esperado `ready_to_complete`.
7. Staging: completar fixture ready; esperado outbox event con snapshot/hash y status `completed`.
8. Staging: revisar `/admin/operations` signals nuevos.
9. Producción: deploy con guard flag según decisión del plan.
10. Producción: monitorear signals 24h antes de flippear guard si se desplegó apagado.

### Out-of-band coordination required

- HR/Ops debe acordar qué blockers V1 son obligatorios para marcar `completed`.
- Payroll/Finance debe confirmar si payment profile aprobado bloquea todos los lanes o solo lanes con pago interno.
- Si se habilita override en producción, comunicar quién puede usarlo y bajo qué razón.
- No requiere cambios en Azure/Entra para V1.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `resolveWorkforceActivationReadiness()` existe, está testeado y clasifica readiness por lanes con blockers/warnings/nextActions.
- [ ] `GET /api/admin/workforce/members/[memberId]/activation-readiness` devuelve shape canónico y respeta capabilities.
- [ ] `complete-intake` bloquea miembros no ready con `409 activation_readiness_blocked`, preserva idempotencia para completed y soporta override auditado solo si capability granular existe.
- [ ] Queue/workspace muestra readiness por persona, filtros por blocker y panel accionable sin duplicar ownership de facetas existentes.
- [ ] La UI implementada cumple el `Approved UI Contract — hard rule` y no se desvía del mockup aprobado sin aprobación explícita del usuario.
- [ ] `Workforce Activation` queda expuesto en el menú `Personas y HR` con view code de sección `equipo` o justificación explícita aprobada en Plan Mode.
- [ ] La ruta `/admin/workforce/activation` no queda como único entrypoint operativo; si existe, está documentada como alias/transitional/admin surface.
- [ ] Capturas Playwright/Chromium desktop y mobile/tablet se adjuntan/citan y no muestran clipping, solapamiento ni scroll horizontal de página completa.
- [ ] Signals de Workforce Activation están visibles en reliability overview con evidence sin PII.
- [ ] Docs funcionales y manual HR explican el flujo operativo y los límites de ownership.
- [ ] TASK-788 y TASK-790 quedan referenciadas como límites explícitos, no reimplementadas.
- [ ] No se cambia el write path de `hire_date` sin ADR/cutover formal.

## Verification

- `pnpm pg:doctor`
- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm vitest run src/lib/workforce/activation/readiness.test.ts`
- Tests route enfocados para `activation-readiness` y `complete-intake`
- Verificación manual staging con al menos un member `pending_intake`, un `in_review`, un `ready_to_complete` fixture y un `completed` legacy.
- `pnpm fe:capture --route=/admin/workforce/intake-queue --env=staging --hold=3000` si TASK-873 ya expone la ruta.
- `pnpm fe:capture --route=<ruta-final-workforce-activation> --env=staging --hold=3000`
- `pnpm fe:capture --route=<ruta-final-workforce-activation> --env=staging --device='iPhone 14' --hold=3000`
- Revisión visual obligatoria contra `.captures/2026-05-14T11-29-27_inline-admin-workforce-activation-mockup/frames/01-snapshot.png`.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `docs/documentation/hr/workforce-activation-readiness.md` y `docs/manual-de-uso/hr/habilitar-colaborador-workforce.md` quedaron actualizados
- [ ] Si se agregó capability/view code, la migración y parity TS/DB quedaron verdes
- [ ] Se documentó si `WorkRelationshipOnboardingCase` queda como follow-up o si la task creó un ADR intermedio

## Follow-ups

- `WorkRelationshipOnboardingCase` runtime foundation si el resolver demuestra que el agregado ya es necesario.
- Integración con TASK-788 para cargo inicial efectivo/versionado cuando esa task cierre.
- Integración con TASK-790 para contractor engagement readiness y classification risk.
- Bulk actions V2 para resolver blockers en lote una vez estabilizada la queue.

## Open Questions

- ¿Payment profile aprobado debe bloquear todos los colaboradores o solo lanes pagados por Greenhouse (`payroll_via='internal'`)?
- ¿El override de readiness debe existir en V1 o esperar a que HR/Payroll valide los blockers mínimos?
- ¿El view code debe vivir bajo `admin.*`, `equipo.*` o un futuro route group `workforce`?
