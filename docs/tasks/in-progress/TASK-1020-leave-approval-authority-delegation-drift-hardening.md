# TASK-1020 - Leave Approval Authority Delegation Drift Hardening

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr|identity|access|reliability|ops|ui`
- Blocked by: `none`
- Branch: `task/TASK-1020-leave-approval-authority-delegation-drift`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Corregir de raiz el drift de autoridad de aprobacion de permisos donde una responsabilidad operacional generica `approval_delegate` hizo que Valentina Hoyos apareciera como aprobadora efectiva de solicitudes de Andres Carlosama y Melkin Hernandez, aunque la supervisora formal es Daniela Ferreira. La solucion debe endurecer el contrato de autorizacion de permisos, remediar datos vivos con comando auditado, prevenir recurrencia con tests y senales, y dejar claro si futuras delegaciones por dominio son o no una capacidad soportada.

## Why This Task Exists

El incidente observado el 2026-06-05 no es un problema de UX ni de un boton faltante: es un drift de autorizacion. Daniela no ve la opcion para aprobar el permiso de Andres porque el snapshot de aprobacion de la solicitud congelo a Valentina como `effective_approver_member_id` mediante una delegacion generica activa de Daniela a Valentina.

Evidencia runtime verificada en Cloud SQL durante discovery read-only:

- `greenhouse_core.reporting_lines` indica que `andres-carlosama`, `melkin-hernandez` y `valentina-hoyos` reportan formalmente a `daniela-ferreira`.
- `greenhouse_core.operational_responsibilities` tiene activa la responsabilidad `resp-2de74ab9-7e3c-4a7c-b9b3-7984c2567f58`, `responsibility_type='approval_delegate'`, `scope_type='member'`, `scope_id='daniela-ferreira'`, `member_id='valentina-hoyos'`, `active=true`, `effective_from='2026-04-10'`.
- La misma fecha existen responsabilidades previas ya inactivas que delegaron el mismo scope a `andres-carlosama` y luego a `melkin-hernandez`, lo que sugiere drift operacional/test o configuracion accidental, no una politica HR validada.
- La solicitud `greenhouse_hr.leave_requests.leave_request_id='leave-14abe9e8-df63-40a8-853a-e83aa92cfaea'` pertenece a `andres-carlosama`, esta en `pending_supervisor`, y tiene `supervisor_member_id='daniela-ferreira'`.
- Su `greenhouse_hr.workflow_approval_snapshots` tiene `stage_code='supervisor_review'`, `authority_source='delegation'`, `formal_approver_member_id='daniela-ferreira'`, `effective_approver_member_id='valentina-hoyos'`, `delegate_responsibility_id='resp-2de74ab9-7e3c-4a7c-b9b3-7984c2567f58'`.
- `src/lib/hr-core/leave-review-policy.ts` solo permite aprobar a HR/admin broad o al `effectiveApproverMemberId` del snapshot; por eso Daniela queda bloqueada y Valentina obtiene autoridad que no deberia tener.

La causa raiz es que el contrato `approval_delegate` es demasiado amplio para permisos. Hoy transfiere autoridad de aprobacion de `leave.supervisor_review` sin estar scopeado por dominio/workflow, sin elegibilidad especifica, sin actor/reason auditable en el payload/evento suficiente, y sin senal que detecte snapshots delegados invalidos.

- Para permisos (`leave.supervisor_review`), la aprobacion por supervisor debe resolver a la supervisora formal vigente desde `greenhouse_core.reporting_lines`, salvo override HR/admin explicito o futura delegacion de permisos domain-scoped que tenga contrato, elegibilidad, auditoria y UI aprobadas.
- Corregir la CLASE de bug, no solo el caso de permisos: el `approval_delegate` generico hoy se consume por TRES workflows que usan `resolutionStrategy: 'effective_supervisor'` en `src/lib/approval-authority/config.ts` (`leave`, `expense_report`, `performance_evaluation`) via el mismo `getEffectiveSupervisor`. El fix debe ser un contrato per-stage (no un caso especial de leave) que decida explicitamente cada workflow.
- Cerrar el SEGUNDO consumidor del delegate generico: `src/lib/reporting-hierarchy/access.ts` (`listDelegatedSupervisorIds` -> `getSupervisorScopeForTenant`) hoy le da a la delegada (Valentina) `hasDelegatedAuthority=true`, `canAccessSupervisorLeave=true` y visibilidad del subarbol completo del supervisor. Arreglar solo la autoridad sin decidir la visibilidad deja exposicion indebida (mismo principio que TASK-987/ISSUE-083: autoridad invalida no confiere acceso, ni superficie ni scope).
- Remediar el dato vivo que da autoridad a Valentina sobre permisos de Andres/Melkin/Daniela mediante un comando auditado, idempotente y verificable, no con SQL manual opaco.
- Reparar snapshots pendientes ya congelados con una autoridad efectiva invalida, incluyendo `leave-14abe9e8-df63-40a8-853a-e83aa92cfaea`, preservando audit trail de antes/despues, recomputando con el resolver canonico post-fix (SSOT) y nunca reimplementando la logica de autoridad en el comando.
- Endurecer el resolver, policy, store y tests para que un `approval_delegate` generico no vuelva a transferir autoridad de permisos accidentalmente.
- Agregar observabilidad para detectar cualquier snapshot de permiso delegado que viole la politica canonica.
- Si se toca UX visible, hacerlo con skills de product design y loop GVC obligatorio; no cerrar UI sin captura mirada y evidencia en `.captures/`.

## Goal

- Definir y aplicar una politica per-stage que impida que `approval_delegate` generico transfiera autoridad de aprobacion de permisos accidentalmente.
- Remediar responsabilidades/snapshots vivos con comandos auditados, idempotentes y verificables, preservando trazabilidad de antes/despues.
- Endurecer resolver, access scope, tests y observabilidad para prevenir recurrencia en `leave`, `expense_report` y `performance_evaluation`.
- Mantener UX y copy honestos si se toca UI visible, con estados de autoridad claros y verificacion GVC.

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
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`

Reglas obligatorias:

- No resolver el incidente dando permisos broad de HR a Daniela ni quitando/poniendo `route_groups` a mano. Daniela debe poder aprobar porque es supervisora formal de Andres y Melkin, no porque se le otorgo acceso global.
- No permitir que Valentina apruebe permisos de Andres o Melkin si no es la supervisora formal ni tiene un contrato de delegacion de permisos domain-scoped explicitamente soportado.
- Separar los dos planos de acceso: `views`/`authorizedViews` gobiernan superficies visibles; `entitlements`/capabilities y policies server-side gobiernan autoridad fina. La visibilidad del menu no puede ser el unico control.
- La UI debe consumir primitives server-side. Cualquier recovery o aprobacion debe tener contrato programatico equivalente; no crear un boton que ejecute logica propia o SQL ad hoc.
- Toda mutacion de responsabilidades, snapshots o solicitudes debe ser idempotente, tenant-safe, auditable y con errores sanitizados.
- Si esta task cambia el contrato arquitectonico de delegaciones o autoridad de aprobacion, registrar delta arquitectonico o ADR segun `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md` antes de cerrar.
- No borrar filas historicas de `greenhouse_core.operational_responsibilities`; revocar con lifecycle/audit.
- No hacer raw SQL de remediacion en production como camino final. SQL read-only se permite para diagnostico y verificacion.
- El fix debe vivir en la capa de configuracion per-stage (`ApprovalStageDefinition`), no como un `if (workflow === 'leave')` hardcodeado en el resolver. Patron canonico: flag declarativo por stage (ej. `honorGenericApprovalDelegate: false` default) que el resolver consume. Esto fuerza una decision explicita por cada stage `effective_supervisor` y evita drift inverso cuando se agregue un workflow nuevo.
- Defense-in-depth: la autoridad de aprobacion (resolver -> snapshot -> policy) y el scope de supervisor/visibilidad (`access.ts`) son DOS planos. Ambos consumen hoy el mismo `approval_delegate` generico. La task debe decidir explicitamente cada plano; no asumir que arreglar uno arregla el otro.
- Alinear con la regla de lifecycle de acceso (TASK-987 / ISSUE-083): una autoridad/delegacion invalida o revocada NO debe conferir ni aprobacion, ni vista, ni scope, ni item de menu. El fix de autoridad y el de visibilidad se mueven juntos para el caso invalido.
- El recovery command es consumidor del resolver canonico, no una segunda implementacion de la politica. Recomputar snapshots SIEMPRE via el resolver post-fix para que runtime y remediacion no puedan divergir.

## Normative Docs

- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/operations/CODEX_EXECUTION_PROMPT_V1.md`
- `docs/tasks/TASK_PROCESS.md`
- `DESIGN.md`
- `docs/architecture/GREENHOUSE_UI_DELIVERY_LOOP_V1.md`
- `docs/manual-de-uso/plataforma/captura-visual-playwright.md`

## Dependencies & Impact

### Depends on

- `greenhouse_core.reporting_lines`
- `greenhouse_core.operational_responsibilities`
- `greenhouse_hr.leave_requests`
- `greenhouse_hr.workflow_approval_snapshots`
- `greenhouse_sync.outbox_events`
- `src/lib/reporting-hierarchy/readers.ts`
- `src/lib/reporting-hierarchy/access.ts`
- `src/lib/reporting-hierarchy/admin.ts`
- `src/lib/operational-responsibility/store.ts`
- `src/lib/approval-authority/config.ts`
- `src/lib/approval-authority/resolver.ts`
- `src/lib/approval-authority/store.ts`
- `src/lib/hr-core/postgres-leave-store.ts`
- `src/lib/hr-core/leave-review-policy.ts`
- `src/app/api/hr/core/hierarchy/delegations/route.ts`
- `src/components/layout/vertical/VerticalMenu.tsx`

### Blocks / Impacts

- Permisos de ausencia para cualquier member cuyo supervisor tenga un `approval_delegate` generico activo.
- Supervisor workspace y entrypoint `/hr/approvals`.
- HR/admin override semantics.
- Futuro modelo de delegaciones por dominio si se decide soportarlo.
- Reliability/ops de HR approval snapshots.
- Cualquier UI que muestre "puedes aprobar" o "pendiente de aprobacion" para permisos.

### Files owned

- `src/lib/approval-authority/config.ts`
- `src/lib/approval-authority/resolver.ts`
- `src/lib/approval-authority/store.ts`
- `src/lib/hr-core/leave-review-policy.ts`
- `src/lib/hr-core/postgres-leave-store.ts`
- `src/lib/reporting-hierarchy/readers.ts`
- `src/lib/reporting-hierarchy/access.ts`
- `src/lib/reporting-hierarchy/admin.ts`
- `src/lib/operational-responsibility/store.ts`
- `src/app/api/hr/core/hierarchy/delegations/route.ts`
- `src/app/api/hr/core/leave-requests/**`
- `src/lib/reliability/**`
- `scripts/**`
- `docs/architecture/**`
- `docs/manual-de-uso/**`
- `docs/documentation/**`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- `src/lib/reporting-hierarchy/readers.ts` expone `getEffectiveSupervisor(memberId)` y actualmente aplica delegacion `approval_delegate` activa desde `greenhouse_core.operational_responsibilities`.
- `src/lib/reporting-hierarchy/access.ts` calcula supervisor scope con lineas formales y responsabilidades `approval_delegate`.
- `src/lib/approval-authority/resolver.ts` resuelve `formalApprover` y `effectiveApprover` para cada stage, incluyendo `authority_source='delegation'` cuando `getEffectiveSupervisor` devuelve un supervisor efectivo distinto del formal.
- `src/lib/hr-core/postgres-leave-store.ts` crea snapshots de aprobacion para permisos al crear la solicitud.
- `src/lib/hr-core/leave-review-policy.ts` autoriza acciones de supervisor comparando `actor.memberId` contra `approvalSnapshot.effectiveApproverMemberId`, con fallback a `supervisorMemberId`.
- `src/lib/reporting-hierarchy/admin.ts` y `src/app/api/hr/core/hierarchy/delegations/route.ts` permiten asignar/revocar delegaciones operacionales.
- `src/lib/operational-responsibility/store.ts` publica eventos `responsibility.assigned` y `responsibility.revoked`, pero el payload actual no captura suficiente actor/reason/source para explicar el drift.
- `src/components/layout/vertical/VerticalMenu.tsx` muestra secciones de supervisor desde `session.user.supervisorAccess`; Daniela no necesita broad HR si su scope de supervisora esta correcto.

### Gap

- No existe contrato domain-scoped para diferenciar una delegacion operacional generica de una delegacion valida para aprobar permisos.
- `getEffectiveSupervisor` (`readers.ts`) aplica `approval_delegate` de forma transversal sin parametro de politica (solo acepta `opts.effectiveAt`), y el approval resolver lo consume para los TRES stages `effective_supervisor` (`leave`, `expense_report`, `performance_evaluation`) — el drift no es exclusivo de permisos.
- `src/lib/reporting-hierarchy/access.ts` (`listDelegatedSupervisorIds` + `getSupervisorScopeForTenant`) es un SEGUNDO consumidor independiente del mismo `approval_delegate` generico: confiere `hasDelegatedAuthority`, `canAccessSupervisorPeople/Leave` y `visibleMemberIds` del subarbol del supervisor. Ningun cambio en el resolver lo toca; requiere decision propia.
- `ApprovalStageDefinition` (`config.ts`) no tiene un campo de politica de delegacion; hoy `resolutionStrategy: 'effective_supervisor'` honra el delegate generico de forma implicita para todos los stages que la usan.
- No hay check de elegibilidad/politica que impida que un peer o reporte directo quede como aprobador de permisos de otras personas sin aprobacion HR explicita.
- No hay comando auditado para reparar snapshots pendientes cuyo effective approver ya no corresponde a la politica.
- No hay senal steady=0 que detecte `workflow_approval_snapshots` de permisos con `authority_source='delegation'` cuando la politica activa no permite delegacion generica.
- No hay evidencia suficiente en eventos/payloads para reconstruir quien asigno la delegacion activa `resp-2de74ab9-7e3c-4a7c-b9b3-7984c2567f58` ni por que.
- La UX actual puede llevar a diagnosticar el problema como "falta un boton", cuando el problema real es autoridad efectiva incorrecta.

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

### Slice 1 - Decision contract and architecture delta

#### Decisiones V1 canonicas (resueltas con skills arch-architect + product design, 2026-06-07)

Las cuatro convergen en un solo movimiento canonico: **el `approval_delegate` generico, en V1, NO confiere ni autoridad ni scope para las superficies de aprobacion**; la cobertura real (autoridad y/o visibilidad) renace como contrato domain-scoped explicito en un ADR follow-up. El caso vivo se cierra revocando globalmente.

- **D1 — Delegacion de permisos: bloqueada en V1.** `leave.supervisor_review` NO honra el `approval_delegate` generico como fuente de autoridad efectiva. La delegacion real de aprobacion de permisos (ej. cobertura por vacaciones) es un contrato SEPARADO domain-scoped (workflow/stage/scope + expiracion + actor/reason + elegibilidad + audit + UI honesta + signal), follow-up con ADR propio. Interin: override HR/admin existente. Rationale: aprobar un permiso es acto sensible (saldos/payroll/registro laboral); la primitiva generica no tiene expiry/actor/reason/elegibilidad. Pilar Safety+Robustness.
- **D2 — Clase, no instancia: los tres stages `effective_supervisor` con `honorGenericApprovalDelegate=false`** (`leave`, `expense_report`, `performance_evaluation`). Ninguno tiene contrato domain-scoped; aprobar reembolsos = autoridad financiera y aprobar evaluaciones = autoridad HR, ambas al menos tan sensibles como un permiso. Leave-only seria parchar el sintoma (viola Solution Quality Contract). **Gate de seguridad:** el flip de expense/perf se condiciona a que la senal parametrizada (Slice 5) muestre 0 snapshots delegados activos legitimos en esos workflows; si aparece alguno, investigar caso por caso antes del flip. Pilar Robustness+Scalability.
- **D3 — Scope/visibilidad: NO half-decouple en V1.** El delegate generico deja de conferir autoridad Y scope para las superficies endurecidas (`access.ts` `getSupervisorScopeForTenant` no cuenta `approval_delegate` generico hacia `canAccessSupervisorLeave`/`visibleMemberIds` de la superficie de aprobacion). Conferir visibilidad-sin-autoridad sobre un artefacto no validado sigue siendo over-exposure (principio TASK-987/ISSUE-083: el predicado de validez se mueve junto para TODO lo derivado) y produce el estado deshonesto que la task evita (ver pila read-only no accionable = ruido + privacidad). Daniela conserva su workspace por `hasDirectReports`, no por delegacion → no se rompe nada. El desacople deliberado "ver pero no aprobar" (coverage viewer con copy claro) se difiere al mismo contrato domain-scoped de D1, opt-in por dimension (`confersApprovalAuthority` / `confersVisibilityScope`). Pilar Safety + UX honesta.
- **D4 — Caso vivo `resp-2de74ab9-...`: revocar globalmente** (lifecycle/audit append-only, nunca DELETE), no neutralizar solo-permisos. Sin actor/reason, reasignada multiples veces sobre el mismo scope = drift, no politica. Neutralizar solo leave la dejaria confiriendo expense/perf + visibilidad del equipo de Daniela sin base validada (misma clase de over-exposure). Revocar globalmente resuelve D3 para el caso vivo automaticamente (Valentina pierde autoridad y scope). **Confirmado por el operador (CEO) el 2026-06-07** — no requiere signoff adicional de HR/Finance.

#### Tareas de Slice 1

- Confirmar y documentar la politica canonica V1: `leave.supervisor_review` NO honra `greenhouse_core.operational_responsibilities.responsibility_type='approval_delegate'` generico como fuente de autoridad efectiva.
- Aplicar D2: setear `honorGenericApprovalDelegate: false` en los tres stages `effective_supervisor` (`leave`, `expense_report`, `performance_evaluation`), respetando el gate de la senal para el flip de expense/perf.
- Aplicar D3: documentar y aplicar que el `approval_delegate` generico no confiere supervisor workspace scope (`getSupervisorScopeForTenant`) para las superficies endurecidas; el desacople "ver sin aprobar" se difiere al contrato domain-scoped (D1 follow-up).
- Documentar el follow-up de D1: la capacidad futura "delegar aprobacion de permisos" queda FUERA de V1; cuando HR confirme la necesidad, nace como contrato domain-scoped (ej. `responsibility_type='leave_approval_delegate'` o metadata con workflow/stage/scope, eligibility, actor, reason y expiracion obligatoria) en ADR propio.
- Actualizar la arquitectura relevante o crear ADR/delta indexado en `docs/architecture/DECISIONS_INDEX.md` si el contrato cambia source of truth, auth semantics o eventos.
- Declarar la frontera entre:
  - supervisor formal: deriva de `greenhouse_core.reporting_lines`;
  - supervisor workspace scope: puede incluir reportes/delegaciones para visibilidad operacional;
  - authority to approve leave: deriva de policy server-side y no de visibilidad UI;
  - HR/admin override: capability/role broad explicito.
- Incluir el caso real Daniela/Valentina/Andres/Melkin como regression scenario en la decision, sin convertir IDs vivos en hardcodes de runtime.

### Slice 2 - Resolver and policy hardening

- Introducir un campo de politica per-stage en `ApprovalStageDefinition` (`src/lib/approval-authority/config.ts`), por ejemplo `honorGenericApprovalDelegate?: boolean` con default tratado como `false`. El resolver lo consume y lo pasa a `getEffectiveSupervisor`. Esto reemplaza el honrado implicito de hoy y fuerza decision explicita por stage. El resultado esperado para `workflow='leave'` y `stage='supervisor_review'` es:
  - `formalApproverMemberId = current reporting_lines supervisor`;
  - `effectiveApproverMemberId = formalApproverMemberId`;
  - `authoritySource = 'reporting_hierarchy'` (o `'formal_supervisor'` si se canoniza un nuevo valor; NO `'delegation'`);
  - ninguna responsabilidad generica `approval_delegate` puede cambiar ese effective approver.
- Extender `getEffectiveSupervisor(memberId, opts)` con una opcion explicita `delegationPolicy: 'ignore' | 'generic'` (additivo a `opts.effectiveAt`). El resolver pasa `'ignore'` cuando el stage tiene `honorGenericApprovalDelegate=false`. NO hacer un cambio global ciego dentro de `getEffectiveSupervisor` que afecte a todos los callers sin que cada uno declare su politica.
- Aplicar la decision de Slice 1 a los tres stages `effective_supervisor` (`leave`, `expense_report`, `performance_evaluation`) seteando el flag explicito en cada uno. Default `false` salvo decision documentada distinta.
- Endurecer `src/lib/hr-core/leave-review-policy.ts` para que la comparacion de actor autorizado dependa del snapshot ya normalizado y no reintroduzca fallback inseguro hacia delegaciones genericas. Revisar el fallback `getEffectiveLeaveApproverMemberId` (`?? request.supervisorMemberId`) para confirmar que sigue siendo seguro una vez el snapshot ya no congela delegados invalidos.
- Decidir y aplicar el plano de visibilidad (`access.ts` `listDelegatedSupervisorIds` / `getSupervisorScopeForTenant`) segun Slice 1: si el delegate generico deja de conferir scope, ajustar el reader; si se conserva como cobertura operacional, documentar la separacion. En cualquier caso, una delegacion invalida (la del caso vivo) no debe seguir confiriendo scope tras el recovery.
- Revisar `src/lib/reporting-hierarchy/access.ts` y `VerticalMenu.tsx` para asegurar que Daniela conserva entrada a su workspace de supervisora (por `hasDirectReports`) sin otorgar acceso de aprobacion ni visibilidad indebida a Valentina.
- Garantizar que HR/admin broad sigue funcionando solo por capability/role autorizado, no por responsabilidades operacionales.

### Slice 3 - Audited recovery command for live drift

- Crear un comando/primitive server-side idempotente para recuperar autoridad de permisos. Nombre sugerido:
  - `src/lib/hr-core/leave-approval-authority-recovery.ts`
  - CLI sugerido: `pnpm hr:leave-approval-authority:recover --dry-run --supervisor-member-id daniela-ferreira`
- El comando debe soportar:
  - `--dry-run` default;
  - `--apply` explicito;
  - filtros por `supervisorMemberId`, `delegateResponsibilityId`, `leaveRequestId`;
  - allowlist obligatoria para production apply cuando se muta state vivo;
  - resumen before/after;
  - salida machine-readable para CI/ops si ya existe patron local.
- El comando debe hacer, en una transaccion:
  - identificar responsabilidades `approval_delegate` activas que no son validas para permisos bajo la nueva politica;
  - revocar la responsabilidad invalida via primitive existente o nueva primitive auditada, nunca borrarla;
  - recomputar snapshots solo para solicitudes de permisos en estados pendientes de supervisor;
  - recomputar SIEMPRE invocando el resolver canonico post-fix (`resolveApprovalAuthorityForStage`), nunca reimplementando la logica de autoridad dentro del comando (SSOT: runtime y recovery no pueden divergir);
  - cambiar `effective_approver_member_id` de delegado invalido a supervisor formal vigente;
  - preservar `formal_approver_member_id`;
  - registrar before/after y razon de remediacion;
  - publicar evento/outbox de recovery, por ejemplo `hr.leave_approval_authority.recovered.v1`;
  - ser no-op si se ejecuta dos veces.
- El comando NO debe aprobar, rechazar ni cambiar el estado de la solicitud. Solo corrige autoridad/snapshot.
- Para el caso vivo, el dry-run debe detectar al menos:
  - `delegateResponsibilityId='resp-2de74ab9-7e3c-4a7c-b9b3-7984c2567f58'`;
  - `leaveRequestId='leave-14abe9e8-df63-40a8-853a-e83aa92cfaea'`;
  - before effective approver `valentina-hoyos`;
  - after effective approver `daniela-ferreira`.

### Slice 4 - Responsibility assignment guardrails

- Endurecer la ruta/API `src/app/api/hr/core/hierarchy/delegations/route.ts` y los comandos en `src/lib/reporting-hierarchy/admin.ts` para que una delegacion generica no pueda presentarse como "delegar aprobaciones de permisos".
- Agregar validacion de elegibilidad y metadata minima si se mantiene la capacidad de crear `approval_delegate` generico para otros usos operacionales:
  - actor autenticado y capability requerida;
  - reason obligatorio para assign/revoke;
  - effectiveTo recomendado u obligatorio segun politica;
  - source context/audit metadata en evento;
  - bloqueo si el caller intenta usarla para `leave.supervisor_review`.
- Si el schema actual no tiene columnas suficientes para actor/reason/source, elegir una de estas opciones y documentarla:
  - usar audit/outbox append-only con payload completo;
  - agregar migration aditiva con columnas `assigned_by_user_id`, `assignment_reason`, `source_metadata`;
  - diferir schema si existe un audit log canonico ya reutilizable.
- Agregar tests para prevenir que la ruta pueda crear una delegacion que transfiera autoridad de permisos sin contrato domain-scoped.

### Slice 5 - Reliability signals and ops visibility

- Agregar senal steady=0 para snapshots de permisos con delegacion invalida, nombre sugerido:
  - `hr.leave.invalid_delegated_approval_snapshots`
- La senal debe contar como warning/error cualquier `greenhouse_hr.workflow_approval_snapshots` de `leave.supervisor_review` donde:
  - `authority_source='delegation'`; o
  - `effective_approver_member_id != formal_approver_member_id`
  - salvo que exista una politica domain-scoped aceptada que permita esa divergencia.
- Cubrir tambien los otros stages `effective_supervisor` cuya decision de Slice 1 sea `honorGenericApprovalDelegate=false` (`expense_report.supervisor_review`, `performance_evaluation.supervisor_review`). Preferir una sola senal parametrizada por workflow/stage (lee la politica per-stage de `config.ts`) antes que tres senales paralelas; el conteo divergente solo es violacion si el stage no honra delegate generico. Si se decide acotar a leave en V1, declararlo explicito y dejar follow-up para las otras.
- Agregar senal complementaria si corresponde:
  - `hr.leave.approval_delegate_without_domain_policy`
  - detecta responsabilidades `approval_delegate` activas cuyo scope podria impactar permisos, aunque los snapshots ya esten sanos.
- Agregar runbook minimo en docs o en el propio signal metadata con:
  - query de diagnostico read-only;
  - comando dry-run;
  - comando apply con allowlist;
  - verificacion post-apply;
  - owner/escalation.

### Slice 6 - Tests and regression coverage

- Tests unitarios del resolver:
  - reporte formal sin delegacion: effective=formal;
  - reporte formal con `approval_delegate` generico activo: para `leave.supervisor_review`, effective=formal y `authoritySource != 'delegation'`;
  - mismo escenario para `expense_report.supervisor_review` y `performance_evaluation.supervisor_review` segun la decision de Slice 1 (con default `honorGenericApprovalDelegate=false`, effective=formal en los tres);
  - si la decision conserva delegacion generica para algun stage (`honorGenericApprovalDelegate=true`), un test pin-ea explicitamente ese comportamiento legacy;
  - `getEffectiveSupervisor(memberId, { delegationPolicy: 'generic' })` sigue devolviendo el delegado (no romper el contrato del reader para callers que lo pidan explicito);
  - ausencia de supervisor formal falla con error/estado honesto existente.
- Tests de `leave-review-policy`:
  - Daniela puede aprobar solicitud de Andres cuando snapshot effective=formal;
  - Valentina no puede aprobar solicitud de Andres solo por existir delegacion generica;
  - HR/admin broad autorizado conserva override;
  - collaborator sin relacion no puede aprobar.
- Tests del recovery command:
  - dry-run no muta;
  - apply actualiza snapshots pendientes y revoca delegacion invalida;
  - apply es idempotente;
  - solicitudes aprobadas/rechazadas/canceladas no cambian;
  - no cruza tenant/space/persona fuera del filtro.
- Tests de reliability:
  - signal cuenta snapshot invalido;
  - signal queda steady=0 despues de recovery fixture.

### Slice 7 - UX truthfulness only if touched

- Si la solucion toca UI visible, antes de escribir JSX nuevo invocar las skills de product design que apliquen y documentar el criterio (usar los nombres reales del repo):
  - `greenhouse-ux` (layout + seleccion de componente Vuexy/MUI + tokens) y `greenhouse-product-ui-architect`;
  - `state-design` — es el nucleo de este slice: el problema no es "falta un boton" sino comunicar honestamente el ESTADO de autoridad (readonly/locked/empty con causa), distinguiendo "pendiente de otra persona" de "no tienes autoridad" sin estado ambiguo;
  - `greenhouse-ux-writing` para microcopy es-CL (tuteo) accionable;
  - `modern-ui` para jerarquia/tipografia/spacing si se ajusta layout;
  - `greenhouse-microinteractions-auditor` si se agregan estados o feedback.
- Aplicar el patron canonico de estados (state-design): la pantalla NUNCA debe colapsar a un vacio/disabled ambiguo. Estados honestos esperados:
  - actor es el aprobador efectivo -> accion habilitada;
  - actor ve la solicitud pero el aprobador es otro -> readonly + "Pendiente de Daniela Ferreira" (no boton muerto);
  - actor sin autoridad y sin relacion -> no se muestra como accionable (server-side deny, sin oraculo de existencia);
  - delegacion invalida detectada -> mensaje accionable "Solicita a HR revisar la linea de reporte o la politica de aprobacion".
- Si se toca UI, extraer copy reutilizable a `src/lib/copy/` o nomenclatura canonica segun AGENTS (validado con `greenhouse-ux-writing`).
- Verificar con GVC en loop:
  - captura antes/despues si existe baseline;
  - `pnpm fe:capture --route=/hr/approvals --env=staging`;
  - frame PNG revisado manualmente;
  - re-captura despues de ajustes hasta nivel enterprise.
- No cerrar el slice UI sin artefactos `.captures/<ISO>_<scenario>/` o explicacion exacta del bloqueo.

### Slice 8 - Runtime remediation and closure

- Ejecutar recovery en staging/preview primero, con `--dry-run` y `--apply` allowlisted.
- Verificar contra datos reales que:
  - la responsabilidad `resp-2de74ab9-7e3c-4a7c-b9b3-7984c2567f58` queda revocada o marcada fuera de autoridad de permisos;
  - `leave-14abe9e8-df63-40a8-853a-e83aa92cfaea` queda con effective approver `daniela-ferreira`;
  - Daniela puede aprobar/rechazar desde su scope de supervisora;
  - Valentina no puede aprobar la solicitud ni verla como accionable por autoridad efectiva;
  - senales quedan steady=0.
- Repetir en production solo despues de deploy del codigo que previene recurrencia.
- Actualizar `Handoff.md`, `changelog.md`, arquitectura/docs funcionales/manuales si hubo cambio visible u operativo.
- Ejecutar `greenhouse-documentation-governor` y `pnpm docs:closure-check` al cerrar.

## Out of Scope

- Aprobar o rechazar manualmente la solicitud de Andres como parte de esta task.
- Otorgar a Daniela rol broad de HR/admin como workaround.
- Permitir que Valentina apruebe permisos de Andres o Melkin por excepcion manual.
- Redisenar todo el modulo de permisos o el HR approval workbench fuera del minimo necesario para truthfulness.
- Construir una plataforma completa de delegaciones por dominio si la decision V1 es bloquear delegacion de permisos; eso debe ser follow-up separado con ADR propio.
- Cambiar la jerarquia formal de reporting_lines salvo que discovery demuestre que la linea formal esta incorrecta. La evidencia actual indica que Daniela ya es la supervisora formal.
- Borrar filas historicas de responsabilidades o snapshots.
- Hacer remediacion productiva con SQL manual no auditado.
- Cambiar `views`, `route_groups` o grants de `session_360` como sustituto del fix de autoridad.

## Detailed Spec

### Policy V1 propuesta

La politica vive per-stage en `ApprovalStageDefinition`, no como un caso especial de leave. Campo nuevo (default `false`):

```ts
interface ApprovalStageDefinition {
  // ...campos actuales
  resolutionStrategy: 'effective_supervisor' | 'role_fallback'
  honorGenericApprovalDelegate?: boolean // default tratado como false
}
```

Aplicado a los stages `effective_supervisor` (decision Slice 1; default recomendado `false` en los tres):

```ts
leave.supervisor_review:                 { honorGenericApprovalDelegate: false }
expense_report.supervisor_review:        { honorGenericApprovalDelegate: false }
performance_evaluation.supervisor_review:{ honorGenericApprovalDelegate: false }
```

Invariante en el resolver (generico, no hardcodeado a leave):

```ts
const honorDelegate = stage.honorGenericApprovalDelegate === true
const effectiveSupervisor = await getEffectiveSupervisor(subjectMemberId, {
  delegationPolicy: honorDelegate ? 'generic' : 'ignore'
})
// con delegationPolicy='ignore', effectiveApproverMemberId === formalApproverMemberId
// y authoritySource !== 'delegation'
```

Un `approval_delegate` generico puede seguir existiendo para otras responsabilidades operacionales si un doc vigente lo justifica, pero no puede cambiar autoridad de permisos. Si el producto necesita delegaciones de permisos mas adelante, deben nacer con un contrato separado:

- domain/workflow/stage explicitos;
- expiracion;
- actor y reason obligatorios;
- elegibilidad;
- audit/outbox;
- UI honesta;
- tests;
- reliability signal.

### Recovery data contract

El recovery debe producir un plan con esta forma conceptual:

```ts
type LeaveApprovalAuthorityRecoveryPlan = {
  generatedAt: string
  dryRun: boolean
  supervisorMemberId?: string
  delegateResponsibilityId?: string
  leaveRequestId?: string
  invalidResponsibilities: Array<{
    responsibilityId: string
    supervisorMemberId: string
    delegateMemberId: string
    reason: 'generic_delegate_not_valid_for_leave'
    action: 'revoke' | 'ignore_already_inactive'
  }>
  snapshotRepairs: Array<{
    leaveRequestId: string
    stageCode: 'supervisor_review'
    before: {
      authoritySource: string
      formalApproverMemberId: string
      effectiveApproverMemberId: string
      delegateResponsibilityId?: string
    }
    after: {
      authoritySource: 'formal_supervisor'
      formalApproverMemberId: string
      effectiveApproverMemberId: string
      delegateResponsibilityId: null
    }
  }>
}
```

Apply invariants:

- transactional;
- idempotent;
- only `pending_supervisor` or equivalent pending review states;
- no terminal leave request changes;
- no approval/rejection side effects;
- audit event per repaired request or batch event with per-row detail;
- sanitized logs;
- failure leaves data unchanged.

### Required live remediation target

La task debe incluir explicitamente este caso como smoke data, sin hardcodearlo en runtime:

- Supervisor formal: `daniela-ferreira`
- Solicitud actual: `leave-14abe9e8-df63-40a8-853a-e83aa92cfaea`
- Delegacion invalida: `resp-2de74ab9-7e3c-4a7c-b9b3-7984c2567f58`
- Effective approver incorrecto: `valentina-hoyos`
- Effective approver esperado: `daniela-ferreira`

### Security and authorization requirements

- Recovery apply debe requerir actor operador con capability administrativa HR/identity adecuada.
- API route nueva, si existe, debe ser server-only/admin-only y no expuesta como boton remoto generico.
- No filtrar solicitudes de permisos a usuarios no autorizados en errores, logs o payloads.
- No confiar en `session.user.supervisorAccess` client-side para aprobar. La decision final vive server-side.
- No relajar Row Level Security o filtros tenant-safe si aplican.

### Full API parity

La remediacion y el cambio de autoridad deben existir como primitive/command reutilizable. Si se agrega UI, esa UI debe llamar la primitive; no debe implementar la correccion en el componente. Como minimo:

- reader para diagnostico de snapshots invalidos;
- command dry-run/apply;
- event/audit output;
- tests.

### Architecture 4-Pillar Assessment

| Pilar | Como lo cubre esta task |
|---|---|
| Safety | Autoridad de aprobacion deja de derivar de una responsabilidad operacional generica; queda gateada por reporting_lines + override por capability HR/admin. El recovery apply requiere actor con capability administrativa + allowlist en production. Se cierra el segundo plano (visibilidad) para que una delegacion invalida no exponga el equipo del supervisor. Server-side deny; no se confia en `session.user.supervisorAccess` client-side. |
| Robustness | Fix en capa de config per-stage (declarativo) evita drift inverso al agregar workflows. Recovery transaccional, idempotente, solo sobre estados pendientes, no toca terminales. Recompute via resolver canonico (SSOT) evita divergencia runtime/recovery. Falla del apply deja datos sin cambiar. |
| Resilience | Senal steady=0 (`hr.leave.invalid_delegated_approval_snapshots`, parametrizada por stage) detecta recurrencia. Flag break-glass server-side opcional con owner + fecha de retiro. Runbook con dry-run/apply/verify. Rollback per-slice declarado. |
| Scalability | El contrato per-stage escala a cualquier workflow nuevo `effective_supervisor` sin codigo nuevo (solo declara su flag). La senal parametrizada cubre N workflows con una sola query. El recovery filtra por supervisor/responsibility/leaveRequest, no full-table. |

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (decision/architecture) MUST happen before Slice 2 (resolver/policy).
- Slice 2 (code prevents recurrence) MUST ship before Slice 8 production apply.
- Slice 3 (recovery command) MUST be verified in dry-run before any apply.
- Slice 5 (signals) SHOULD ship before production apply or in the same deployment, so post-apply steady=0 is observable.
- Slice 7 (UX) is optional and must not block backend safety unless the shipped UI would otherwise remain misleading.
- Production data apply is forbidden until tests pass and staging dry-run/apply match expected output.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Bloquear una delegacion legitima que otro workflow si usa | identity/hr | medium | Scopear cambio por workflow/stage; tests para workflows no afectados; architecture decision explicita | regression tests + logs de resolver |
| Mantener autoridad invalida en snapshots ya congelados | hr/data | high | Recovery command idempotente y signal steady=0 | `hr.leave.invalid_delegated_approval_snapshots` |
| Corregir snapshots terminales y alterar historial | hr/data | medium | Filtrar solo estados pendientes; tests terminal-state no-op | recovery dry-run diff + audit event |
| Otorgar acceso broad a Daniela como workaround | identity/access | medium | Prohibido en task; acceptance criteria exige no cambiar broad grants | `identity.session.route_group_drift` y review de grants |
| Dejar a Valentina con boton accionable por cache/session | ui/access | medium | Server-side deny; verificar UI despues de refresh; no confiar en client | API 403 sanitized + GVC si UI |
| Recovery sin actor/reason suficiente | ops/audit | medium | Command requiere actor/reason; outbox/audit payload before/after | event payload audit review |
| Introducir UX confusa que oculte causa raiz | ui | medium | Product design skills + GVC loop si UI touched | GVC dossier + review manual |
| Aplicar remediacion antes del deploy preventivo | ops | medium | Ordering hard rule; release checklist | deployment checklist + Handoff |

### Feature flags / cutover

- Preferir fix deterministico sin flag para `leave.supervisor_review` si la arquitectura confirma que la delegacion generica nunca debio aplicar a permisos.
- Si se necesita rollback rapido por compatibilidad, introducir flag server-side temporal:
  - `LEAVE_APPROVAL_GENERIC_DELEGATE_ENABLED=false` default.
  - `false`: permisos ignoran `approval_delegate` generico.
  - `true`: restaura comportamiento legacy solo como break-glass.
  - El flag debe tener owner, fecha de retiro y signal que alerte si se activa.
- Recovery command siempre es cutover manual con `--dry-run` default y `--apply` explicitamente allowlisted.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert doc/ADR si la decision no se acepta antes de implementar | <10 min | si |
| Slice 2 | Revert PR o activar break-glass flag temporal si existe | <10 min + redeploy | si |
| Slice 3 | Command dry-run no requiere rollback; si apply falla, transaccion debe abortar | inmediato | si |
| Slice 4 | Revert guardrails o ajustar validation si bloquea caso legitimo no previsto | <30 min + redeploy | si |
| Slice 5 | Revert signal o ajustar query threshold; no muta data | <15 min | si |
| Slice 6 | Tests no impactan runtime; revert test si fixture estaba mal | <10 min | si |
| Slice 7 | Revert UI slice; backend policy sigue protegiendo | <30 min + redeploy | si |
| Slice 8 | No revertir a autoridad invalida. Si recovery aplico algo incorrecto, ejecutar recovery inverso solo con ADR/incident approval y audit trail | variable | parcial |

### Production verification sequence

1. `pnpm pg:doctor` y diagnostico read-only de staging/preview.
2. Ejecutar tests focales del resolver/policy/recovery/signal.
3. Deploy a staging/preview con policy nueva.
4. Ejecutar `pnpm hr:leave-approval-authority:recover --dry-run --supervisor-member-id daniela-ferreira` o comando equivalente.
5. Revisar que dry-run detecte exactamente la responsabilidad y solicitudes esperadas; stop si aparecen casos no entendidos.
6. Ejecutar apply en staging/preview con allowlist.
7. Verificar SQL read-only: snapshot efectivo = Daniela, Valentina no queda como approver efectivo, signal steady=0.
8. Si UI touched, correr GVC en staging y revisar frame PNG.
9. Deploy production.
10. Ejecutar production dry-run.
11. Ejecutar production apply con allowlist si el dry-run coincide con staging y con esta task.
12. Verificar production read-only:
    - `leave-14abe9e8-df63-40a8-853a-e83aa92cfaea` effective approver = `daniela-ferreira`;
    - `resp-2de74ab9-7e3c-4a7c-b9b3-7984c2567f58` no confiere autoridad de permisos;
    - `hr.leave.invalid_delegated_approval_snapshots` steady=0.
13. Smoke con agent auth si existe persona agente adecuada: Daniela ve accion; Valentina no ve accion. Si no existe persona agente, documentar bloqueo y validar server-side.
14. Monitor signals durante 7 dias.

### Out-of-band coordination required

- El operador (CEO) ya confirmo las decisiones D1-D4 el 2026-06-07; el revoke global y los flips estan aprobados. No se requiere coordinacion adicional con HR/Finance antes del apply.
- No requiere Azure/GCP secret/HubSpot/Teams cambios externos salvo deploy/runtime normal.
- Si hay comunicacion a Daniela/Valentina, debe decir que se corrigio autoridad de aprobacion de permisos; no pedir que Valentina apruebe como workaround.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La arquitectura o ADR declara explicitamente que `approval_delegate` generico no confiere autoridad para `leave.supervisor_review`.
- [ ] El fix vive como flag per-stage (`honorGenericApprovalDelegate`, default `false`) en `ApprovalStageDefinition`, no como `if (workflow === 'leave')` hardcodeado en el resolver.
- [ ] Los tres stages `effective_supervisor` (`leave`, `expense_report`, `performance_evaluation`) tienen decision explicita aplicada (default `false`), o la excepcion legacy queda documentada con su razon.
- [ ] El plano de visibilidad (`access.ts` / `getSupervisorScopeForTenant`) tiene decision aplicada: la delegacion invalida del caso no confiere scope tras el recovery, y la regla general queda documentada.
- [ ] El recovery recomputa snapshots invocando el resolver canonico post-fix, sin reimplementar la logica de autoridad (SSOT verificado en test).
- [ ] El resolver de approval authority para permisos devuelve `effectiveApproverMemberId='daniela-ferreira'` para solicitudes de Andres/Melkin cuando Daniela es la supervisora formal, aunque exista un `approval_delegate` generico.
- [ ] `src/lib/hr-core/leave-review-policy.ts` niega aprobacion a Valentina para solicitudes de Andres/Melkin si solo cuenta con delegacion generica.
- [ ] Daniela puede aprobar/rechazar permisos de sus reportes directos desde server-side policy sin otorgarle HR/admin broad.
- [ ] Garantia end-to-end verificada (positivo + negativo): sobre `leave-14abe9e8-df63-40a8-853a-e83aa92cfaea` (o fixture equivalente), tras el recovery la accion `approve` de Daniela transiciona la solicitud (200/exito), y ANTES del recovery la misma accion devuelve 403. Cubre los tres tramos: lista (`listLeaveRequestsFromPostgres`), detalle (`getLeaveRequestByIdFromPostgres`) y write gate (`canPerformLeaveReviewAction`). Nota: la reachability (lista/detalle) ya funciona porque Daniela es `supervisor_member_id` de la solicitud; el unico tramo que el recovery desbloquea es el write gate via `effective_approver_member_id`.
- [ ] La responsabilidad `resp-2de74ab9-7e3c-4a7c-b9b3-7984c2567f58` queda revocada o neutralizada para permisos mediante comando auditado, no SQL manual.
- [ ] La solicitud `leave-14abe9e8-df63-40a8-853a-e83aa92cfaea` queda con `effective_approver_member_id='daniela-ferreira'` mientras siga pendiente de supervisor.
- [ ] El recovery command tiene dry-run, apply allowlisted, audit/outbox y es idempotente.
- [ ] La senal `hr.leave.invalid_delegated_approval_snapshots` o equivalente existe y queda steady=0 despues de recovery.
- [ ] Tests cubren el caso Daniela/Valentina/Andres como fixture conceptual sin hardcodear IDs vivos en runtime.
- [ ] No se agregan `route_groups`, `views` o grants broad como workaround.
- [ ] Si se toca UI, se ejecutan skills de product design aplicables y GVC en loop con artefacto revisado.
- [ ] `Handoff.md`, `changelog.md` y docs/arquitectura/manuales relevantes quedan sincronizados.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm vitest run src/lib/approval-authority src/lib/hr-core src/lib/reporting-hierarchy`
- `pnpm pg:doctor`
- `pnpm hr:leave-approval-authority:recover --dry-run --supervisor-member-id daniela-ferreira`
- `pnpm hr:leave-approval-authority:recover --apply --supervisor-member-id daniela-ferreira --delegate-responsibility-id resp-2de74ab9-7e3c-4a7c-b9b3-7984c2567f58 --leave-request-id leave-14abe9e8-df63-40a8-853a-e83aa92cfaea` o comando equivalente aprobado
- SQL read-only post-apply para confirmar `workflow_approval_snapshots.effective_approver_member_id='daniela-ferreira'`
- Reliability signal steady=0
- `pnpm route-reachability-gate --strict` si se agrega o modifica ruta UI
- `pnpm fe:capture --route=/hr/approvals --env=staging` si se toca UI visible
- `pnpm docs:closure-check`

## Closing Protocol

Cerrar una task es obligatorio y forma parte de Definition of Done. Si la implementacion termino pero estos items no se ejecutaron, la task sigue abierta.

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `docs/architecture/DECISIONS_INDEX.md` o la arquitectura especializada quedaron actualizadas si el contrato de delegacion cambio
- [ ] `greenhouse-documentation-governor` fue invocado antes del cierre
- [ ] `pnpm docs:closure-check` fue ejecutado y sus hallazgos resueltos o documentados
- [ ] Si hubo recovery en production, el Handoff contiene fecha/hora, comando, actor, resultado, signal y proximos pasos
- [ ] Si hubo UI, el Handoff enlaza el directorio GVC revisado

## Follow-ups

- Crear una task separada para una plataforma de delegaciones de aprobacion por dominio si HR necesita delegar permisos formalmente. Esa task debe incluir contrato domain-scoped, expiracion, reason, eligibility, UI, audit y reliability.
- Evaluar si `greenhouse_core.operational_responsibilities` necesita columnas canonicas de actor/reason/source metadata, o si el audit/outbox actual basta.
- Evaluar dashboard admin de responsabilidades operacionales con historial y signal de drift si aparecen mas casos de delegaciones accidentales.

## Open Questions

Las decisiones de diseno (D1-D4) quedaron resueltas en Slice 1 con skills arch-architect + product design, y **confirmadas por el operador (CEO) el 2026-06-07**. No hay signoffs de HR/Finance pendientes — el operador es la autoridad de aprobacion para esta task. No quedan preguntas abiertas de arquitectura ni de gobernanza. Se conservan solo como notas de ejecucion (no bloqueantes):

- **[Confirmado — D4]** Revoke global de `resp-2de74ab9-7e3c-4a7c-b9b3-7984c2567f58` aprobado por el operador. No se preserva el artefacto generico; si emergiera una cobertura legitima futura, se re-otorga via el contrato correcto (D1 follow-up).
- **[Confirmado — D2]** Flip de `expense_report` y `performance_evaluation` a `honorGenericApprovalDelegate=false` aprobado. La senal parametrizada (Slice 5) se sigue revisando antes del flip como **chequeo de datos de ingenieria** (no como signoff): si surge un snapshot delegado activo inesperado, registrarlo en el Handoff e investigar antes de flipear; no es un bloqueo de gobernanza.
- **[Confirmado — D1/D3]** No hay necesidad actual de delegar aprobacion de permisos ni "cobertura viewer"; queda FUERA de V1. Si el operador la solicita a futuro, nace como contrato domain-scoped (autoridad y visibilidad opt-in por dimension, con expiry/actor/reason/elegibilidad) en ADR propio. El override HR/admin cubre cualquier interin.
