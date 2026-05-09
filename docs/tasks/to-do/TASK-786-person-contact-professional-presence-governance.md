# TASK-786 — Person Contact & Professional Presence Governance

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
- Domain: `hr / people / identity`
- Blocked by: `none`
- Branch: `task/TASK-786-person-contact-professional-presence-governance`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Ordenar el perfil profesional y de contacto de personas: links publicos/profesionales, presencia cliente-safe, preferencias de contacto y deep links a Teams/Slack sin mezclar estos datos con identidad legal privada ni cargo laboral. La task debe reutilizar los campos y APIs existentes, y cerrar los gaps de visibilidad, policy y resolucion por contexto.

## Why This Task Exists

Greenhouse ya tiene `headline`, `about_me`, links profesionales (`linkedin_url`, `portfolio_url`, `behance_url`, `github_url`, `dribbble_url`, etc.), contacto basico y IDs de integraciones (`teams_user_id`, `slack_user_id`). Tambien existe `/api/my/professional-links` para self-service parcial y `client-safe-profile` para surfaces cliente-facing.

El gap no es solo agregar campos. Falta una gobernanza clara de que dato es privado, que dato es client-safe, que dato es self-service, que dato viene de integraciones y como se resuelven acciones de colaboracion como "hablar por Teams" sin guardar URLs manuales inseguras.

## Goal

- Formalizar la separacion entre datos legales privados, contacto interno, presencia profesional publica y perfil cliente-safe.
- Reutilizar los links profesionales existentes y completar su contrato de visibilidad/self-service.
- Resolver "Hablar por Teams/Slack" desde IDs de integracion y deep link platform, no desde URLs pegadas por usuarios.
- Definir preferencias de contacto y disponibilidad basica sin convertirlas en datos legales ni payroll.
- Asegurar que People 360, assigned team, staffing, proposals y My Profile consuman un reader/policy consistente.

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
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_ASSIGNED_TEAM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DEEP_LINK_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- No mezclar esta task con TASK-784: RUT, direccion legal y datos sensibles/personales privados quedan en Person Legal Profile.
- No mezclar esta task con TASK-785: cargo laboral, cargo Microsoft y cargo cliente por asignacion tienen su propia gobernanza.
- Links profesionales existentes viven en `greenhouse_core.members`; no crear tabla paralela salvo que Discovery demuestre necesidad real de metadata/visibility por link.
- Los links self-service deben validarse, normalizarse y tratarse como informacion publicable solo segun policy.
- `teams_user_id` y `slack_user_id` son IDs de integracion; los deep links se derivan desde runtime canonico, no se guardan como URLs manuales.
- Un link cliente-facing debe pasar por client-safe policy. No todo lo que el colaborador agrega en My Profile debe mostrarse al cliente.
- Telefono/email/contacto interno puede ser visible por rol/scope, pero no debe exponerse automaticamente en profiles cliente-safe.
- Preferencias de contacto no son autorizacion ni availability contractual.
- Los datos de presencia profesional no deben alimentar payroll, finiquito ni clasificacion legal.
- Access model debe distinguir view visible, self-service update, HR/admin update, client-safe read y contact-action resolve.
- ADR vigente: `Professional Presence is a governed Person 360 facet, not legal identity or role title`, embebido en `GREENHOUSE_PERSON_COMPLETE_360_V1.md` e indexado en `DECISIONS_INDEX.md`. Discovery debe validar que la implementacion no contradiga ese contrato.

## Normative Docs

- `docs/tasks/complete/TASK-784-person-legal-profile-identity-documents-foundation.md`
- `docs/tasks/complete/TASK-785-workforce-role-title-source-of-truth-governance.md`
- `docs/tasks/complete/TASK-611-organization-workspace-facet-projection-entitlements-foundation.md`
- `docs/documentation/plataforma/deep-link-platform.md`
- `docs/manual-de-uso/plataforma/accesos-rapidos.md`

## Dependencies & Impact

### Depends on

- `greenhouse_core.members.headline`
- `greenhouse_core.members.about_me`
- `greenhouse_core.members.linkedin_url`
- `greenhouse_core.members.portfolio_url`
- `greenhouse_core.members.twitter_url`
- `greenhouse_core.members.threads_url`
- `greenhouse_core.members.behance_url`
- `greenhouse_core.members.github_url`
- `greenhouse_core.members.dribbble_url`
- `greenhouse_core.members.phone`
- `greenhouse_core.members.location_city`
- `greenhouse_core.members.location_country`
- `greenhouse_core.members.contact_channel`
- `greenhouse_core.members.contact_handle`
- `greenhouse_core.members.teams_user_id`
- `greenhouse_core.members.slack_user_id`
- `src/app/api/my/professional-links/route.ts`
- `src/app/api/hr/core/members/[memberId]/professional-profile/route.ts`
- `src/lib/team/client-safe-profile.ts`
- `src/lib/person-360/**`
- `src/lib/navigation/deep-links/**`
- `src/views/greenhouse/my/MyProfileView.tsx`

### Blocks / Impacts

- Impacta My Profile y self-service de presencia profesional.
- Impacta People 360 y perfil profesional HR.
- Impacta assigned team / client-safe talent profiles.
- Impacta staffing/talent discovery.
- Impacta futuras propuestas/quotes que muestren perfiles de equipo.
- Impacta acciones de colaboracion como abrir chat Teams/Slack desde Greenhouse.

### Files owned

- `src/app/api/my/professional-links/route.ts`
- `src/app/api/hr/core/members/[memberId]/professional-profile/route.ts`
- `src/lib/team/client-safe-profile.ts`
- `src/lib/person-360/**`
- `src/lib/navigation/deep-links/**`
- `src/views/greenhouse/my/**`
- `src/views/greenhouse/people/**`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
- `docs/architecture/GREENHOUSE_DEEP_LINK_PLATFORM_V1.md`
- `docs/documentation/hr/`
- `docs/manual-de-uso/hr/`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- `Greenhouse_HRIS_Architecture_v1.md` declara links profesionales en `greenhouse_core.members` y self-service via `/api/my/profile`/rutas relacionadas.
- `/api/my/professional-links` permite GET/PATCH de links, headline, about_me y contacto basico.
- `/api/hr/core/members/[memberId]/professional-profile` lee headline, about_me, links, phone, ubicacion, skills, tools, certifications y languages.
- `src/lib/team/client-safe-profile.ts` ya construye perfil cliente-safe con links profesionales reducidos.
- `members` incluye `teams_user_id` y `slack_user_id` para identidad de integraciones.
- `GREENHOUSE_DEEP_LINK_PLATFORM_V1.md` y `src/lib/navigation/deep-links/**` ya tienen foundation para resolver links semanticos con audience/access.

### Gap

- No hay policy central de visibilidad por link/campo (`self`, `hr`, `internal`, `client_safe`, `public_share`).
- `/api/my/professional-links` valida URL generica, pero no normaliza por provider ni evita dominios incorrectos por tipo.
- No hay resolver canonico de presencia profesional por contexto.
- No hay accion canonica "hablar por Teams/Slack" sobre persona.
- No hay claridad de si telefono/contacto se muestra a cliente o solo interno.
- No hay preferencias de contacto gobernadas.
- No hay completeness/readiness de perfil profesional/presencia que distinga faltante util de dato sensible.
- No hay docs/manual claros para colaborador y HR sobre que datos completar y donde se ven.

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

### Slice 1 — Presence contract and visibility policy

- Definir contrato canonico para `ProfessionalPresence`, `ContactPreference`, `ClientSafePresence` y `CollaborationAction`.
- Clasificar campos en:
  - legal/private: fuera de scope, TASK-784
  - internal contact
  - professional public/self-service
  - client-safe
  - integration-derived collaboration
- Crear helper/policy para resolver si un campo es visible por contexto.
- La policy debe vivir como primitive compartida, por ejemplo `src/lib/person-presence/visibility-policy.ts`, y ser consumida por APIs, Person 360, client-safe profile y deep links. No crear checks de visibilidad inline en React.

### Slice 2 — Link normalization and validation

- Reutilizar campos existentes en `members`.
- Endurecer validacion por provider:
  - LinkedIn debe ser URL LinkedIn valida.
  - Behance debe ser URL Behance valida.
  - GitHub debe ser URL GitHub valida.
  - Dribbble debe ser URL Dribbble valida.
  - Portfolio/website permite dominio propio.
- Normalizar trailing slash/whitespace y bloquear esquemas no seguros.
- Mantener compatibilidad con valores existentes y reportar warnings si hay legacy invalid.

### Slice 3 — Self-service and HR surfaces

- Ajustar `/my/profile` o tabs existentes para que colaborador entienda que datos son profesionales/client-safe.
- Permitir self-service de links profesionales, headline/about y preferencias de contacto.
- En HR/People profile, mostrar vista consolidada con origen/self-service y visibilidad.
- No incluir RUT/direccion legal ni cargo laboral en esta UI salvo links cruzados a TASK-784/TASK-785 surfaces.
- Mostrar origen/visibilidad de cada campo cuando ayude a evitar confusion, pero sin convertir la UI en editor de permisos. La autorizacion sigue viviendo en entitlements/capabilities.

### Slice 4 — Collaboration deep links

- Agregar resolver/action para `person_chat_teams` y, si aplica, `person_chat_slack` sobre `teams_user_id` / `slack_user_id`.
- Integrar con `src/lib/navigation/deep-links/**` en vez de construir URLs inline.
- Degradar seguro si falta ID, usuario no tiene permiso, integracion no esta conectada o audience no soporta link nativo.
- No permitir URLs manuales de Teams/Slack ingresadas por usuario.

### Slice 5 — Client-safe profile convergence

- Ajustar `src/lib/team/client-safe-profile.ts` para consumir policy/resolver y no exponer campos fuera de client-safe.
- Definir que links profesionales son elegibles para cliente por defecto y cuales requieren opt-in/verification si aplica.
- Alinear assigned team/talent discovery/proposals con el mismo resolver.
- Mantener `phone`, `contact_channel` y `contact_handle` como internal-only por defecto. Cualquier exposicion client-safe requiere opt-in/policy explicita, no inferencia por rol o assignment.

### Slice 6 — Observability, completeness and docs

- Crear signal o reader de completeness profesional sin payload sensible.
- Documentar manual de uso para colaboradores: que completar, como se ve, que no poner.
- Documentar manual/funcional HR: como revisar presencia profesional, como usar "hablar por Teams", que es client-safe.
- Actualizar arquitectura HRIS/Person 360/Deep Links si cambia el contrato.

## Out of Scope

- No agregar RUT, direccion legal, fecha nacimiento ni datos legales; viven en TASK-784.
- No resolver cargo laboral ni cargo cliente; viven en TASK-785.
- No crear sistema de disponibilidad/calendario completo.
- No implementar chat interno propio.
- No enviar mensajes Teams/Slack desde esta task; solo resolver accion/link para abrir conversacion cuando la integracion lo permita.
- No hacer client-facing public directory sin task separada de privacidad y aprobacion.

## Detailed Spec

### Recommended field posture

- `headline`, `about_me`, professional links: self-service + HR readable + client-safe segun policy.
- `phone`, `contact_channel`, `contact_handle`: internal by default; client-safe solo con opt-in/policy.
- `teams_user_id`, `slack_user_id`: integration-derived; not user-editable as URL.
- Portfolio/website: `portfolio_url` remains the canonical field unless Discovery proves a separate `website_url` for people is needed.

### Access model decision

- `routeGroups`: reuse `my`, `hr`/`people`.
- `views`: existing My Profile and People/HR profile; no new route expected.
- `entitlements`: separate `person.presence.read_client_safe`, `person.presence.read_internal`, `person.presence.self_update`, `person.presence.hr_update`, `person.presence.resolve_contact_action` or runtime-aligned equivalents.
- `startup policy`: no changes.
- ADR: la task materializa una faceta de presencia profesional dentro de Person 360. Si Discovery demuestra que conviene otro namespace, debe actualizar primero el ADR y `DECISIONS_INDEX.md`.

### What else to consider

- Links profesionales pueden revelar informacion externa; client-safe display needs opt-in/policy.
- GitHub/Behance/Dribbble may be useful for talent discovery but not for payroll/legal documents.
- Teams/Slack direct links should respect access and environment; if unsupported, show fallback contact method.
- Phone may be personal or corporate; label/source matters before exposing outside HR.
- External profiles can become stale; completeness should not imply verification.
- The collaborator should understand which links are visible to HR only, internal team, or clients.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe contrato/policy de visibilidad para presencia profesional y contacto.
- [ ] `/api/my/professional-links` o su reemplazo valida/normaliza links por provider sin romper valores legacy razonables.
- [ ] My Profile permite self-service claro de links profesionales y preferencias de contacto.
- [ ] People/HR profile muestra presencia profesional con visibilidad/origen.
- [ ] Teams/Slack se resuelven desde IDs de integracion mediante deep link/action resolver, no desde URLs manuales.
- [ ] Client-safe profile consume policy y no expone telefono/contacto privado por accidente.
- [ ] Docs/manual explican que datos ve HR, que datos pueden ver clientes y que datos son privados.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Tests focales de URL validation/normalization
- Tests focales de visibility policy/client-safe profile
- Tests focales de deep link resolver para Teams/Slack si se implementa
- Validacion manual o preview de `/my/profile` y People/HR profile si hay UI visible

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] docs de arquitectura/funcionales/manual quedaron sincronizados si cambio el contrato

## Follow-ups

- Public talent profile/share page si se decide exponer perfiles fuera del portal.
- Verificacion externa de portfolios/certificaciones si se requiere client-facing trust score.
- Calendar/book-me links con disponibilidad real si se implementa agenda integrada.

## Open Questions

- Ninguna bloqueante al crear la task. Discovery debe decidir si `contact_channel/contact_handle` actuales bastan para preferencias de contacto o si se requiere tabla versionable por canal.
