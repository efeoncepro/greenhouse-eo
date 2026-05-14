# TASK-877 — Workforce Activation External Identity Reconciliation

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
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr|identity|integrations|ui`
- Blocked by: `none`
- Branch: `task/TASK-877-workforce-identity-reconciliation`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Integrar Workforce Activation con Identity Reconciliation para que los vinculos externos necesarios para habilitar a un colaborador, partiendo por Notion, se resuelvan desde el workspace operativo sin escribir IDs manuales ni duplicar logica de matching. La UI debe mostrar blockers accionables, candidatos con evidencia, aprobacion auditada y recalcule de readiness inmediato.

## Why This Task Exists

TASK-874/TASK-875/TASK-876 dejaron Workforce Activation funcional para readiness, onboarding case y remediacion de datos laborales. El siguiente gap real es que una persona puede quedar laboralmente activa pero incompleta operacionalmente si faltan vinculos de identidad externos que alimentan delivery, tareas, ICO, staffing o superficies Person 360.

El caso observado con Felipe Zurita y Maria Camila Hoyos expone el problema: el colaborador ya existe en Person 360 y puede tener Entra/Azure, compensacion y datos laborales, pero su `notion_user_id` no necesariamente queda vinculado. Resolver esto pegando un UUID en `members.notion_user_id` seria un parche fragil: el source of truth correcto es `greenhouse_core.identity_profile_source_links`, con `members.notion_user_id` y BigQuery como proyecciones de compatibilidad mientras los consumers se migran a Person360/Postgres-first.

## Goal

- Convertir el vinculo Notion faltante o ambiguo en blocker visible y resoluble dentro de Workforce Activation.
- Reusar y endurecer Identity Reconciliation como primitive canonica para descubrir, matchear, aprobar y aplicar vinculos externos.
- Evitar inputs manuales de UUID: la experiencia debe operar con candidatos, evidencia, confianza y busqueda read-only cuando no hay candidato.
- Mantener `identity_profile_source_links` como source of truth y sincronizar proyecciones necesarias (`members.notion_user_id` y BigQuery mirror) de forma idempotente y auditada.
- Documentar policy, permisos, rollback y uso operativo para que la solucion escale a otras fuentes externas ademas de Notion.

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
- `docs/architecture/GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`
- `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_ONBOARDING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NOTION_DELIVERY_SYNC_V1.md`
- `docs/architecture/GREENHOUSE_NOTION_BIGQUERY_ABSORPTION_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `DESIGN.md` si se toca UI visible.

Reglas obligatorias:

- Workforce Activation orquesta y resuelve blockers; no se convierte en source of truth de identidades externas.
- `greenhouse_core.identity_profile_source_links` es el contrato canonico para vinculos externos. `greenhouse_core.members.notion_user_id` es proyeccion operacional y compatibilidad.
- No escribir Notion IDs manualmente desde UI ni scripts ad-hoc. Todo apply debe pasar por una primitive idempotente con audit/outbox.
- Notion requerido debe derivarse de una policy configurable por relacion laboral/contractual, rol, unidad o participacion operacional; no hardcodear Felipe/Maria ni asumir que todo contractor requiere Notion.
- Auto-link solo puede ocurrir con candidato unico, confianza alta y evidencia suficiente. Ambiguedad, homonimos o ausencia de email deben ir a revision humana.
- Mientras `sync-notion-conformed.ts` consuma BigQuery `greenhouse.team_members.notion_user_id`, la aplicacion del link debe mantener mirror BigQuery. La direccion objetivo es Person360/Postgres-first con BigQuery fallback.
- `views` exponen la surface visible de Workforce Activation; `entitlements` gobiernan acciones finas de discovery, approve, reject, reassign y unlink.
- Toda accion de approve/reassign/unlink debe registrar actor, razon, evidencia y before/after redacted.
- Copy visible reutilizable debe vivir en `src/lib/copy/workforce.ts` o `src/lib/copy/identity.ts` si existe/se crea durante la task.

## Normative Docs

- `docs/tasks/complete/TASK-874-workforce-activation-readiness-workspace.md`
- `docs/tasks/complete/TASK-875-work-relationship-onboarding-case-foundation.md`
- `docs/tasks/complete/TASK-876-workforce-activation-remediation-flow.md`
- `docs/documentation/hr/workforce-activation-readiness.md`
- `docs/manual-de-uso/hr/habilitar-colaborador-workforce.md`
- `docs/documentation/identity/sistema-identidad-roles-acceso.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `src/lib/workforce/activation/readiness.ts`
- `src/lib/workforce/activation/types.ts`
- `src/views/greenhouse/admin/workforce-activation/WorkforceActivationView.tsx`
- `src/app/(dashboard)/hr/workforce/activation/page.tsx`
- `src/app/api/hr/workforce/activation/route.ts`
- `src/lib/identity/reconciliation/reconciliation-service.ts`
- `src/lib/identity/reconciliation/discovery-notion.ts`
- `src/lib/identity/reconciliation/matching-engine.ts`
- `src/lib/identity/reconciliation/apply-link.ts`
- `src/app/api/admin/identity/reconciliation/route.ts`
- `src/app/api/admin/identity/reconciliation/[proposalId]/resolve/route.ts`
- `src/app/api/cron/identity-reconcile/route.ts`
- `src/lib/sync/sync-notion-conformed.ts`
- `greenhouse_core.identity_profile_source_links`
- `greenhouse_core.members.notion_user_id`
- BigQuery `greenhouse.team_members.notion_user_id` mirror

### Blocks / Impacts

- Mejora Workforce Activation como punto unico de habilitacion operacional.
- Reduce drift Person360/Notion en delivery, ICO, staffing y tareas.
- Impacta surfaces de identity reconciliation admin, reliability y Notion conformed sync.
- Puede desbloquear follow-ups para otros source systems (`hubspot_crm`, `azure_ad`, Slack/Teams futuro) usando el mismo patron.

### Files owned

- `src/lib/workforce/activation/*`
- `src/lib/workforce/intake-queue/*`
- `src/views/greenhouse/admin/workforce-activation/*`
- `src/app/api/hr/workforce/*`
- `src/app/api/admin/workforce/*`
- `src/lib/identity/reconciliation/*`
- `src/app/api/admin/identity/reconciliation/*`
- `src/app/api/cron/identity-reconcile/route.ts`
- `src/lib/sync/sync-notion-conformed.ts`
- `src/lib/copy/workforce.ts`
- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`
- `migrations/*task-877*`
- `docs/documentation/identity/*`
- `docs/documentation/hr/*`
- `docs/manual-de-uso/hr/*`

## Current Repo State

### Already exists

- Workforce Activation ya tiene workspace HR, readiness resolver, guard final, remediation drawer y manual de uso.
- Identity Reconciliation ya descubre usuarios Notion desde BigQuery raw/conformed, calcula candidatos y puede aplicar links.
- `applyIdentityLink()` ya actualiza BigQuery `greenhouse.team_members`, BigQuery `identity_profile_source_links`, Postgres `identity_profile_source_links` y `members.<source_column>`.
- `SourceSystem` ya incluye `notion`, `hubspot_crm` y `azure_ad`.
- `identity_profile_source_links` ya modela `source_system`, `source_object_type`, `source_object_id`, `source_user_id`, `source_email`, `source_display_name`, `is_primary`, `is_login_identity` y `active`.

### Gap

- Workforce Activation no modela `Notion link faltante/ambiguo` como lane/blocker accionable.
- El operador no puede resolver candidatos Notion desde Workforce Activation; debe salir a superficies admin o pedir intervencion tecnica.
- El discovery Notion depende principalmente de usuarios detectados en tareas/asignaciones; colaboradores sin tareas pueden no aparecer.
- El endpoint de `reassign` debe validar/resolver `candidateProfileId` desde `candidateMemberId` antes de aplicar el link para no dejar un source link incompleto.
- `sync-notion-conformed.ts` todavia consume mapping desde BigQuery como fuente primaria; debe migrar a Postgres/Person360-first con BigQuery fallback.
- No hay signals especificos para backlog de vinculos externos requeridos por Workforce Activation.

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

### Slice 1 — External identity policy and readiness lane

- Definir policy canonica para decidir cuando `notion` es requerido en Workforce Activation.
- Extender readiness/types para lane `external_identity` o `operational_integrations` sin romper lanes existentes.
- Agregar blocker codes para `notion_link_missing`, `notion_link_ambiguous`, `notion_link_conflict` y `notion_discovery_unavailable`.
- Actualizar queue/readiness response para exponer blocker externo con severity, owner, action y next step.

### Slice 2 — Identity reconciliation hardening for workforce

- Agregar primitive person/member-scoped para ejecutar reconciliation Notion en dry-run sobre un colaborador especifico.
- Endurecer `approve/reassign` para resolver `candidateProfileId` canonico desde `candidateMemberId` y validar conflictos antes de aplicar.
- Agregar fallback de discovery read-only para usuarios Notion no detectados por tareas, usando el cliente/connector canonico disponible y verificando contrato en Discovery.
- Asegurar idempotencia: no duplicar links, no reasignar Notion ID ya activo en otra persona sin flujo explicito de conflict resolution.

### Slice 3 — APIs, access and audit

- Crear/ajustar endpoints HR/admin para iniciar discovery, listar candidatos, aprobar, rechazar, reasignar y refrescar readiness desde Workforce Activation.
- Registrar capabilities granulares, por ejemplo `workforce.member.external_identity.resolve` y `identity.reconciliation.approve`, o reutilizar las existentes si Discovery confirma que ya cubren el caso.
- Asociar capabilities a `equipo.workforce_activation` y roles HR/EFEONCE_ADMIN segun least privilege.
- Emitir outbox/audit para `identity.profile.linked`, `identity.profile.link_rejected`, `identity.profile.link_conflict` o eventos equivalentes existentes.

### Slice 4 — Workforce Activation UX

- Agregar lane visual de integraciones operativas en inspector y drawer de resolucion.
- Crear accion `Resolver vinculo Notion` que muestre candidatos con confianza, evidencia, fuente y estado.
- Soportar estados: sin candidatos, candidato unico fuerte, multiples candidatos, candidato ya vinculado, Notion no disponible, permisos insuficientes, exito parcial y sync pendiente.
- Prohibir UI de ingreso manual de UUID salvo una herramienta admin separada, auditada y fuera del flujo HR normal si el plan demuestra que es indispensable.
- Actualizar copy canonico y verificar con screenshots desktop/mobile usando `pnpm fe:capture`.

### Slice 5 — Postgres-first mapping and reliability

- Cambiar consumers necesarios para leer mapping Notion desde Postgres/Person360 primero, BigQuery fallback mientras dure la compatibilidad.
- Agregar reliability signals para backlog de identities externas requeridas, matches ambiguos, conflictos de source link y drift Postgres vs BigQuery mirror.
- Asegurar que el cron `identity-reconcile` o el sync Notion dispare reconciliation/refresh de manera idempotente.

### Slice 6 — Documentation and rollout

- Actualizar manual de Workforce Activation con pasos para resolver Notion link.
- Actualizar documentacion funcional de identidad/reconciliation.
- Actualizar changelog, Handoff y docs/tasks/README al cerrar.
- Documentar limites: la task no completa automaticamente casos reales ni corrige datos fuente en Notion.

## Out of Scope

- No completar ni mutar manualmente a Felipe Zurita, Maria Camila Hoyos ni ningun colaborador real como parte de tests automatizados.
- No reemplazar Notion como source operativo ni redisenar el pipeline Notion completo.
- No eliminar BigQuery mirror hasta que todos los consumers verificados sean Postgres/Person360-first.
- No crear un workflow engine generico para todas las integraciones externas.
- No resolver TASK-788, TASK-790 ni cambios de compensacion/pago fuera de los blockers que ya maneja Workforce Activation.
- No cambiar la sincronizacion de fotos/avatar Entra; esa funcionalidad debe permanecer intacta.

## Detailed Spec

### Contract

El contrato recomendado para cada external identity blocker:

```ts
type WorkforceExternalIdentityBlocker = {
  sourceSystem: 'notion' | 'hubspot_crm' | 'azure_ad'
  required: boolean
  status: 'linked' | 'missing' | 'ambiguous' | 'conflict' | 'unavailable'
  sourceObjectType: string
  sourceObjectId?: string
  candidateCount?: number
  topCandidateConfidence?: number
  evidence?: Array<{
    kind: 'email_exact' | 'name_exact' | 'name_fuzzy' | 'task_assignee' | 'cross_link' | 'manual_review'
    value: string
    weight?: number
  }>
  nextAction: 'none' | 'run_discovery' | 'review_candidates' | 'resolve_conflict' | 'retry_later'
}
```

El agente implementador puede ajustar nombres/tipos despues de Discovery, pero debe preservar estas propiedades funcionales.

### UX decision

Workforce Activation debe mantener el patron aprobado `queue + inspector`. La resolucion Notion vive en el inspector/drawer del colaborador seleccionado, no como dashboard admin separado.

Flujo esperado:

1. Operador selecciona una persona bloqueada.
2. Inspector muestra `Integraciones operativas` con `Notion` en estado bloqueado/ambiguo.
3. Operador pulsa `Resolver vinculo Notion`.
4. Drawer ejecuta o consume dry-run y muestra candidatos.
5. Operador aprueba/rechaza/reasigna con razon cuando aplique.
6. Backend aplica link con audit/outbox y recalcula readiness.
7. Queue e inspector se refrescan sin reload completo.

### Access Model

- `routeGroups`: surface primaria permanece en `hr` via `/hr/workforce/activation`.
- `views`: `equipo.workforce_activation` sigue siendo la surface visible principal.
- `entitlements`: acciones finas para discovery/review/approve/reassign/unlink deben vivir como capabilities; no usar solo view access.
- `startup policy`: sin cambios esperados.

### Data Model

No crear tabla nueva si `greenhouse_core.identity_profile_source_links` y `greenhouse_sync.identity_reconciliation_proposals` cubren el caso. Si Discovery demuestra que falta persistir evidencia durable por candidato, crear migracion minima y append-only antes de UI.

### BigQuery compatibility

Mientras `sync-notion-conformed.ts` o delivery conformed usen `greenhouse.team_members.notion_user_id`, `applyIdentityLink()` debe seguir actualizando BigQuery. El target de la task es reducir el read dependency a Postgres-first, no cortar compatibilidad de golpe.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 policy/readiness -> Slice 2 reconciliation hardening -> Slice 3 API/access -> Slice 4 UI -> Slice 5 reliability/Postgres-first -> Slice 6 docs/closing.
- La UI no puede exponer approve/reassign antes de que Slice 2 y Slice 3 tengan conflict checks, audit y permissions.
- Postgres-first reads no pueden shippear antes de verificar que BigQuery mirror sigue siendo actualizado para legacy consumers.
- Auto-link, si se implementa, debe permanecer deshabilitado o dry-run hasta que los signals de ambiguity/conflict esten operativos.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Vincular Notion ID a persona equivocada | identity / HR / delivery | Medium | Auto-link solo con candidato unico + confianza alta; review humana con evidencia; conflict check por source_object_id activo | `identity.reconciliation.ambiguous_match`, `identity.source_link.conflict` |
| Romper sync Notion por mover reads a Postgres-first | Notion / delivery / BigQuery | Medium | BigQuery fallback; mirror write se mantiene; staging smoke de delivery con miembros vinculados | `notion.identity_mapping_drift`, errores `sync-notion-conformed` |
| Duplicar ownership entre Workforce Activation e Identity Admin | UI / identity | Medium | Workforce solo orquesta member-scoped; Identity Admin conserva governance global | Eventos audit sin `workforceActivationContext` o acciones fuera de view |
| Exponer datos o acciones a roles no autorizados | access / privacy | Medium | View + capability; approve/reassign separado de read; tests de 403 | 403/401 spikes o audit actor no autorizado |
| Notion API/connector no disponible | integrations | Medium | Discovery degraded; no bloquear con error opaco; retry y fallback a data ya sincronizada | `notion.discovery.unavailable` |
| Drift Postgres vs BigQuery mirror | data / delivery | Medium | dual write existente en `applyIdentityLink`; detector de drift; reconciliation repair idempotente | `identity.notion_mapping_mirror_drift` |
| UX vuelve a pedir UUID manual | UX / operations | Low | Regla dura en task + tests/screenshot review; input UUID fuera del flujo normal | Review UI falla / copy no canonico |

### Feature flags / cutover

- Introducir flag si Discovery confirma que auto-link queda dentro del scope, por ejemplo `WORKFORCE_EXTERNAL_IDENTITY_AUTOLINK_ENABLED=false` por defecto.
- La UI de review puede shippear sin flag si esta capability-gated y no auto-aplica sin confirmacion humana.
- Postgres-first read debe tener fallback interno; no requiere flag si tests cubren fallback y staging smoke pasa.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir extension de readiness/blocker codes; complete-intake vuelve a readiness anterior | <15 min | Si |
| Slice 2 | Deshabilitar member-scoped reconciliation y volver a admin reconciliation existente; source links ya aplicados quedan auditados | <20 min | Parcial |
| Slice 3 | Revertir endpoints/capabilities o retirar grants; UI queda sin accion | <20 min | Si |
| Slice 4 | Revertir drawer/CTA; blockers siguen visibles o vuelven a deep link admin | <15 min | Si |
| Slice 5 | Revertir Postgres-first read a BigQuery primary; conservar drift signal si es aditivo | <30 min | Si |
| Slice 6 | Revertir docs/changelog si se revierte codigo | <10 min | Si |

### Production verification sequence

1. Ejecutar unit tests de identity reconciliation y workforce readiness.
2. Ejecutar `pnpm pg:doctor`.
3. En staging, correr reconciliation dry-run para miembros allowlisted y verificar candidatos sin aplicar cambios.
4. Aprobar un caso fixture o synthetic, no Felipe/Maria, y verificar `identity_profile_source_links`, `members.notion_user_id`, BigQuery mirror y outbox.
5. Verificar `/hr/workforce/activation` con `pnpm fe:capture` en desktop/mobile.
6. Verificar que delivery/Notion conformed no pierde mapping despues del cambio Postgres-first.
7. Monitorear signals de conflict/drift/unavailable durante 24h antes de habilitar auto-link si queda incluido.

### Out-of-band coordination required

- Verificar disponibilidad del conector/API Notion para listar/buscar usuarios workspace en modo read-only antes de implementar fallback de discovery.
- Coordinar con operadores HR que `Resolver vinculo Notion` no corrige datos fuente en Notion; solo vincula identidad externa a Person 360.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Workforce Activation muestra Notion como blocker requerido solo cuando la policy lo exige.
- [ ] La resolucion Notion desde Workforce Activation usa candidatos/evidencia y no permite pegar UUID manualmente en el flujo HR normal.
- [ ] Approve/reassign valida conflictos, resuelve `candidateProfileId`, aplica `identity_profile_source_links`, proyecta `members.notion_user_id` y mantiene BigQuery mirror.
- [ ] La UI cubre candidatos fuertes, multiples candidatos, sin candidatos, conflicto, Notion unavailable y permisos insuficientes.
- [ ] `sync-notion-conformed.ts` o el consumer equivalente lee mapping Postgres/Person360-first con BigQuery fallback verificado.
- [ ] Se agregan signals para backlog, ambiguity/conflict y drift Postgres/BigQuery.
- [ ] Tests cubren readiness, reconciliation apply/reassign, endpoint access y UI critical states.
- [ ] Manual y documentacion funcional quedan actualizados.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm pg:doctor`
- `pnpm fe:capture --route=/hr/workforce/activation --env=staging --hold=3000`
- Dry-run de identity reconciliation Notion contra staging.
- Smoke de apply sobre fixture/synthetic allowlisted, no sobre Felipe/Maria ni casos reales sin autorizacion.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] se verifico que la sync de avatar Entra/Person360 sigue intacta y no fue tocada por esta task
- [ ] se documento cualquier decision de ADR si la task cambia el contrato source-of-truth de identidades externas

## Follow-ups

- Extender el mismo patron a Slack/Teams si se convierten en fuentes externas requeridas para activacion.
- Migrar consumidores legacy restantes desde BigQuery identity mapping a Person360/Postgres-first cuando el mirror deje de ser necesario.

## Open Questions

- Definir en Discovery la policy exacta de obligatoriedad Notion por tipo de colaborador/relacion/rol.
- Confirmar si existe conector/API Notion con permisos read-only suficientes para listar usuarios que aun no aparecen como assignees en tareas.
- Definir si auto-link entra en V1 bajo flag default-off o si V1 queda solo manual review con evidencia.
