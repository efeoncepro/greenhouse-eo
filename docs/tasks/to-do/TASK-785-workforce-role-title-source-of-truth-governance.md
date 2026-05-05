# TASK-785 — Workforce Role Title Source of Truth + Assignment Override Governance

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
- Epic: `EPIC-010`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `task/TASK-785-workforce-role-title-source-of-truth-governance`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Formalizar donde vive el "cargo" en Greenhouse y evitar que Entra/Graph, HR, People 360, asignaciones a cliente, costos comerciales y documentos usen campos con significados mezclados. La solucion debe separar cargo corporativo/laboral, enriquecimiento de identidad y cargo visible por asignacion a cliente.

## Why This Task Exists

Hoy existen tres capas reales en runtime: `identity_profiles.job_title` se sincroniza desde Entra/Graph como enriquecimiento de identidad; `members.role_title` representa el cargo operativo HR del colaborador; `client_team_assignments.role_title_override` permite mostrar un cargo distinto cuando la persona esta asignada a un cliente. Sin gobernanza, el sync de Entra puede pisar cambios hechos por HR y los consumidores pueden usar el cargo equivocado para payroll, costo, pricing, staffing o surfaces cliente-facing.

La raiz no es agregar otro textbox. Greenhouse necesita un contrato de source of truth, precedence, historial efectivo y resolvers canonicos para responder: cargo oficial en Efeonce, cargo mostrado al cliente, cargo para costo/pricing y cargo importado desde Microsoft.

## Goal

- Definir y aplicar el source of truth de cada tipo de cargo.
- Evitar overwrites silenciosos de `members.role_title` por Entra/Graph cuando HR es owner operativo.
- Mantener `identity_profiles.job_title` como enriquecimiento Microsoft/identidad, no como autoridad laboral absoluta.
- Mantener `client_team_assignments.role_title_override` como cargo por asignacion cliente, con vigencia y sin contaminar el cargo base.
- Agregar historial/audit de cambios de cargo cuando el runtime actual no sea suficiente.
- Crear resolvers canonicos para consumers: People 360, Payroll/finiquito, Staffing, Client Team, Commercial cost/pricing y documentos.

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
- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
- `docs/architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- SCIM sigue siendo lifecycle/account provisioning. No convertir SCIM en source of truth de cargo laboral.
- Entra/Graph puede alimentar `identity_profiles.job_title` y proponer drift, pero no debe sobrescribir silenciosamente una decision HR manual sobre el cargo operativo.
- `members.role_title` representa el cargo operativo/laboral interno del colaborador dentro de Greenhouse/Efeonce.
- `members.org_role_id`, `profession_id`, `seniority_level` y `role_category` deben preferirse cuando exista catalogo/estructura; `role_title` queda como label humano o fallback.
- `client_team_assignments.role_title_override` representa el cargo/titulo visible para una asignacion cliente especifica. No debe cambiar el cargo base de la persona.
- Los cambios de cargo deben ser efectivos por fecha cuando afecten payroll, costos, staffing, documentos o historia laboral.
- Payroll/finiquito debe snapshotear el cargo correcto al momento del documento; no leer live si el documento ya fue emitido.
- Commercial cost/pricing no debe inferir costo desde texto libre si existe role/seniority/catalogo; texto libre puede ser presentacional.
- Si Entra y Greenhouse difieren, el sistema debe mostrar drift/review y source, no resolver con ultimo writer gana.
- Access model debe separar quien puede ver cargo, cambiar cargo base, cambiar override cliente y aprobar drift.

## Normative Docs

- `docs/documentation/identity/scim-entra-provisioning.md`
- `docs/manual-de-uso/identity/scim-entra-provisioning.md`
- `docs/tasks/to-do/TASK-781-scim-reliability-governance-control-plane.md`
- `docs/tasks/to-do/TASK-611-organization-workspace-facet-projection-entitlements-foundation.md`
- `docs/tasks/to-do/TASK-784-person-legal-profile-identity-documents-foundation.md`
- `.codex/skills/greenhouse-task-planner/SKILL.md`

## Dependencies & Impact

### Depends on

- `greenhouse_core.identity_profiles.job_title`
- `greenhouse_core.members.role_title`
- `greenhouse_core.members.org_role_id`
- `greenhouse_core.members.profession_id`
- `greenhouse_core.members.seniority_level`
- `greenhouse_core.members.role_category`
- `greenhouse_core.client_team_assignments.role_title_override`
- `src/lib/entra/profile-sync.ts`
- `src/lib/person-360/**`
- `src/lib/people/get-person-detail.ts`
- `src/lib/team-admin/mutate-team.ts`
- `src/lib/agency/team-capacity-store.ts`
- `src/lib/commercial-cost-basis/people-role-cost-basis.ts`
- `src/lib/payroll/final-settlement/document-store.ts`

### Blocks / Impacts

- Reduce drift operativo de cargos importados desde Microsoft.
- Impacta People 360 y People detail.
- Impacta Staffing/Capacity y client team assignments.
- Impacta documentos payroll/finiquito que muestran cargo del trabajador.
- Impacta Commercial cost/pricing cuando se resuelve rol/seniority para costos.
- Complementa TASK-784 porque datos legales y cargo/documento aparecen juntos en documentos formales, pero no son el mismo contrato.

### Files owned

- `src/lib/entra/profile-sync.ts`
- `src/lib/workforce/**` o helper canonico nuevo si Discovery confirma que no existe lugar mejor
- `src/lib/person-360/**`
- `src/lib/people/**`
- `src/lib/team-admin/**`
- `src/lib/agency/**`
- `src/lib/commercial-cost-basis/**`
- `src/lib/payroll/final-settlement/**`
- `src/views/greenhouse/people/**`
- `docs/architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/documentation/hr/`
- `docs/manual-de-uso/hr/`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- `docs/architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md` declara que SCIM maneja lifecycle basico y que Entra Profile Sync trae `jobTitle`, `country`, `city`, `phone`, `displayName`.
- `src/lib/entra/profile-sync.ts` actualiza `identity_profiles.job_title` desde `entra.jobTitle`.
- `src/lib/entra/profile-sync.ts` tambien actualiza `members.role_title` desde `entra.jobTitle`, lo que puede pisar cambios operativos HR.
- `greenhouse_core.members` ya contiene `role_title`, `role_category`, `org_role_id`, `profession_id` y `seniority_level`.
- `greenhouse_core.client_team_assignments` ya contiene `role_title_override`.
- Person 360 y People detail ya leen role/title/seniority y assignments.
- Commercial cost basis ya distingue fuentes como `assignment_role_title_override` y `member_role_title`.
- Final settlement document store lee `COALESCE(ip.job_title, pm.role_label)` para el cargo del snapshot.

### Gap

- No hay contrato explicito de precedence entre Entra/Graph y HR para `members.role_title`.
- No hay drift review para job title equivalente al modelo de reporting hierarchy.
- No hay historial efectivo de cambios de cargo si un cambio afecta documentos, payroll, costos o staffing historico.
- No hay resolver unico de "cargo para contexto X"; cada consumer decide con su propio fallback.
- El cargo de cliente puede confundirse con cargo base si la UI/copy no lo separa.
- No esta claro si HR cambia cargo desde Greenhouse, desde Entra, o desde ambos con gobierno.
- No hay acceptance contract para documentos: cargo del trabajador debe snapshotearse desde cargo laboral efectivo, no desde identidad Microsoft si HR lo overrideo.

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

### Slice 1 — Role title contract and resolver

- Crear contrato canonico de tipos/fuentes para cargos:
  - `identity_job_title`
  - `workforce_role_title`
  - `catalog_role`
  - `assignment_role_title_override`
  - `document_snapshot_role_title`
- Crear helper/resolver reusable para obtener cargo segun contexto: `internal_profile`, `client_assignment`, `payroll_document`, `commercial_cost`, `staffing`, `identity_admin`.
- Documentar precedence y fallback por contexto.

### Slice 2 — Entra/Graph sync governance

- Cambiar el sync para que Entra/Graph actualice `identity_profiles.job_title` como enriquecimiento.
- Evitar que Entra/Graph pise `members.role_title` cuando existe source HR/manual/canonico.
- Crear drift detection para diferencias entre `identity_profiles.job_title` y `members.role_title`.
- Exponer drift como `needs_review`, reliability signal o cola admin/HR segun primitive existente.

### Slice 3 — Effective history and audit

- Evaluar si basta audit existente o si se requiere tabla `member_role_history`/equivalente.
- Si se requiere, crear historial con `member_id`, `from_role`, `to_role`, `effective_from`, `effective_until`, `source`, `reason`, `actor`, timestamps.
- Asegurar que cambios de cargo relevantes para documentos y costos se puedan reconstruir historicamente.

### Slice 4 — HR/People UI and mutation flow

- Extender People/HR profile o surface existente para cambiar cargo base con razon, fecha efectiva y source.
- Mostrar claramente:
  - cargo interno Efeonce
  - cargo de identidad Microsoft
  - cargos por asignacion cliente
  - drift pendiente si aplica
- No permitir que un override de cliente cambie el cargo base.
- Definir capabilities para `workforce.role_title.update`, `workforce.role_title.review_drift` o nombres alineados al runtime.

### Slice 5 — Assignment override governance

- Mantener `client_team_assignments.role_title_override` como source de cargo cliente-facing por asignacion.
- Agregar/ajustar UI/copy para que el usuario entienda que es "cargo frente al cliente" o "titulo en esta asignacion".
- Asegurar vigencia por `start_date/end_date` y fallback al cargo base si no hay override.
- Evitar que staffing/capacity confunda override presentacional con seniority/costo si existe catalogo.

### Slice 6 — Consumers cutover

- Migrar People 360, People detail, Capacity/Staffing, Commercial cost basis y final settlement document store al resolver canonico cuando aplique.
- Para documentos payroll/finiquito, snapshotear cargo laboral efectivo al momento del documento.
- Para commercial/pricing, usar role/seniority/catalogo para costo y texto solo como label.

### Slice 7 — Docs and observability

- Actualizar arquitectura SCIM/Entra y 360 Object Model con el nuevo contrato.
- Actualizar documentacion funcional/manual HR si hay UI de cambio de cargo.
- Agregar reliability/data-quality signal de drift de cargos sin payload sensible.
- Documentar decisiones en Handoff/changelog.

## Out of Scope

- No redisenar todo SCIM ni Entra provisioning.
- No mover roles de autorizacion, route groups ni permisos a partir del cargo textual.
- No usar cargo para decidir payroll legal, contrato o regimen.
- No reemplazar `client_team_assignments`; solo gobernar su override de cargo.
- No rehacer el catalogo comercial de roles/precios salvo wiring al resolver.
- No mezclar esta task con TASK-784 de documentos legales/personales.

## Detailed Spec

### Canonical meanings

- `identity_profiles.job_title`: enriquecimiento de identidad proveniente de Entra/Graph o CRM; util para Admin/identity context y comparacion de drift.
- `members.role_title`: cargo operativo/laboral interno de la persona en Greenhouse/Efeonce.
- `members.org_role_id/profession_id/seniority_level`: estructura canónica preferida para catálogos, staffing y costos cuando este disponible.
- `client_team_assignments.role_title_override`: titulo visible para una asignacion cliente especifica.
- Snapshot documental: copia inmutable del cargo resuelto al momento de emitir documento.

### Access model decision

- `routeGroups`: usar `hr` / `people` existentes.
- `views`: People/HR profile existente; no crear surface nueva salvo que Discovery demuestre que hace falta.
- `entitlements`: separar update de cargo base, update de override cliente y review de drift.
- `startup policy`: sin cambios.

### What else to consider

- Cambios de cargo pueden afectar bandas salariales, seniority, costo interno, rate cards y staffing, pero no deben recalcular payroll historico automaticamente.
- Si cambia solo el titulo visible, no necesariamente cambia sueldo, seniority ni costo.
- Si cambia seniority/catalogo, puede requerir nueva compensation version o pricing/cost basis efectivo por fecha.
- Cliente puede pedir un titulo comercial distinto al cargo real; eso es assignment override, no cambio laboral.
- En documentos legales, usar cargo laboral efectivo, no titulo comercial del cliente.
- En propuestas/quotes/client-safe profiles, usar cargo assignment/client-safe si existe.
- En Entra, `jobTitle` puede estar desactualizado; debe proponer drift, no ganar siempre.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe contrato documentado de significado y precedence para `identity_profiles.job_title`, `members.role_title`, catalog role/seniority y `client_team_assignments.role_title_override`.
- [ ] Entra/Graph no sobrescribe silenciosamente `members.role_title` cuando HR/Greenhouse es owner del cargo operativo.
- [ ] Existe drift/review o reliability signal para diferencias entre cargo Microsoft y cargo Greenhouse.
- [ ] Existe resolver canonico para cargo por contexto y al menos People 360/documentos/costos usan el resolver donde aplica.
- [ ] HR puede cambiar cargo base con razon y fecha efectiva si la task implementa UI de mutacion.
- [ ] Cargo cliente-facing se gestiona como override de asignacion y no cambia el cargo base.
- [ ] Finiquito/documentos snapshottean cargo laboral efectivo, no cargo live ni cargo de cliente.
- [ ] Docs explican donde cambiar cargo Efeonce y donde cambiar cargo frente al cliente.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Tests focales de resolver y Entra drift/sync
- Tests focales de People/Person 360/document snapshot si se migran consumers
- Validacion manual o preview de People/HR profile y assignment UI si hay cambios visibles

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] arquitectura SCIM/Entra y 360 quedaron sincronizadas si cambio el contrato

## Follow-ups

- Integrar cambios de seniority/catalogo con compensation versioning si se define que un cambio de cargo implica cambio salarial.
- Extender quote/pricing UI para mostrar cuando se usa assignment override vs role catalog.

## Open Questions

- Ninguna bloqueante al crear la task. Discovery debe decidir si el historial efectivo requiere tabla nueva o si el audit log existente alcanza.
