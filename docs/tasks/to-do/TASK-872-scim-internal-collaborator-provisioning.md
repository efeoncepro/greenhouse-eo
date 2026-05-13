# TASK-872 — SCIM Internal Collaborator Provisioning

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `identity|hr|ops`
- Blocked by: `none`
- Branch: `task/TASK-872-scim-internal-collaborator-provisioning`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Endurecer el provisioning SCIM interno de Efeonce para que cada alta humana contratada en Microsoft Entra materialice automaticamente en Greenhouse el grafo correcto de colaborador interno: `client_user` como principal de acceso legacy-named, `identity_profile` como Person canonica y `member` como faceta operativa de colaborador, con membership primaria en la operating entity y ficha laboral pendiente de completar.

La task tambien remedia de forma idempotente a Felipe Zurita y Maria Camila Hoyos, creados por SCIM el 2026-05-13 como cuentas internas pero sin aparecer aun como colaboradores (`members`) en Greenhouse.

## Why This Task Exists

El contrato actual de SCIM crea correctamente `greenhouse_core.client_users` internos, asigna rol base y registra audit log. A pesar del nombre historico, `client_users` no representa "personas clientes" en este contexto: es el principal de acceso al portal y puede ser interno (`tenant_type='efeonce_internal'`) o cliente (`tenant_type='client'`). El problema es que el flujo actual puede dejar la identidad humana y la faceta de colaborador separadas o incompletas hasta que corran otros procesos. Eso produce una experiencia rota: una persona contratada existe en Entra y tiene cuenta de acceso, pero no aparece como colaborador en People/HR porque no existe `greenhouse_core.members`.

El usuario confirmo el criterio operativo: cuando se crea una persona en Azure AD/Entra para Efeonce es porque ya es colaborador contratado. Por lo tanto, para el tenant interno Efeonce, SCIM debe preservar la cuenta de acceso y ademas crear/linkear la Person y el colaborador visible, sin activar payroll/capacity como si la ficha laboral estuviera completa.

## Goal

- Definir e implementar una primitive idempotente `provisionInternalCollaboratorFromScim()` para materializar `Access principal + Person + Member` en altas SCIM internas elegibles.
- Crear guardrails de elegibilidad para excluir buzones funcionales, service accounts, bots, invitados externos y cuentas no humanas.
- Dejar al `member` visible como colaborador, pero con payroll/capacity/legal/compensation gated hasta completar ficha laboral.
- Remediar Felipe Zurita y Maria Camila Hoyos usando la misma primitive/backfill, no SQL manual suelto.
- Agregar reliability signals para detectar usuarios SCIM internos sin Person, sin Member o con ficha pendiente vencida.

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
- `docs/architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Para `tenant_type='efeonce_internal'`, un SCIM `CREATE` elegible debe materializar `client_users`, `identity_profiles`, `identity_profile_source_links`, `members`, `person_memberships` y role assignment base de forma idempotente.
- `client_users` sigue siendo principal de acceso legacy-named; no significa "persona cliente" en este flujo, no es la raiz humana y no debe renombrarse ni colapsarse dentro de la task.
- `identity_profiles` sigue siendo la raiz humana; no usar `member_id` como identidad humana global.
- `members` es la faceta operativa de colaborador; crearla no equivale a habilitar payroll/capacity completo.
- Para personas del cliente (`tenant_type='client'`), `client_users` puede existir sin `member`; esa poblacion sigue fuera del alcance de `members` porque no es colaboradora Efeonce.
- Payroll, compensation, Person Legal Profile, payment profile, capacity y assignments deben quedar bloqueados/degraded como "pendiente de ficha" hasta completar datos minimos.
- No crear `members` para cuentas funcionales, service accounts, bots, invitados externos `#EXT#`, shared mailboxes ni grupos.
- SCIM deactivate desactiva acceso y abre/reutiliza revision HR/offboarding; no cierra una relacion laboral automaticamente.
- Todo cambio de contrato compartido debe quedar como delta/ADR en arquitectura SCIM/Identity/HRIS e indexarse si aplica.
- Cualquier backfill debe ser dry-run first, idempotente, auditable, con allowlist explicita para apply controlado.

## Normative Docs

- `docs/manual-de-uso/identity/scim-entra-provisioning.md`
- `docs/documentation/identity/scim-entra-provisioning.md`
- `docs/documentation/identity/sistema-identidad-roles-acceso.md`
- `docs/tasks/complete/TASK-141-canonical-person-identity-consumption.md`
- `docs/tasks/complete/TASK-193-person-organization-synergy-activation.md`
- `docs/tasks/complete/TASK-784-person-legal-profile-identity-documents-foundation.md`
- `docs/tasks/complete/TASK-785-workforce-role-title-source-of-truth-governance.md`

## Dependencies & Impact

### Depends on

- `src/app/api/scim/v2/Users/route.ts`
- `src/app/api/scim/v2/Users/[id]/route.ts`
- `src/lib/scim/provisioning.ts`
- `src/lib/scim/auth.ts`
- `src/lib/entra/profile-sync.ts`
- `src/lib/entra/graph-client.ts`
- `src/lib/identity/canonical-person.ts`
- `src/lib/identity/reconciliation/apply-link.ts`
- `src/lib/account-360/organization-identity.ts`
- `src/lib/account-360/operating-entity-membership.ts`
- `src/lib/sync/publish-event.ts`
- `src/lib/sync/event-catalog.ts`
- `src/lib/workforce/offboarding/`
- `src/lib/workforce/role-title/`
- `src/lib/reliability/registry.ts`
- `src/lib/reliability/queries/`
- `greenhouse_core.client_users`
- `greenhouse_core.identity_profiles`
- `greenhouse_core.identity_profile_source_links`
- `greenhouse_core.members`
- `greenhouse_core.person_memberships`
- `greenhouse_core.scim_tenant_mappings`
- `greenhouse_core.scim_sync_log`
- `greenhouse_sync.outbox_events`

### Blocks / Impacts

- Microsoft Entra SCIM provisioning para el Enterprise App `GH SCIM`.
- Admin Center / Users surfaces que muestran cuentas internas.
- People / HR / Person 360 surfaces que dependen de `members`.
- Profile sync Entra/Graph y role-title drift governance.
- Work relationship offboarding cuando SCIM desactiva acceso.
- Reliability Overview para signals de identidad.
- Remediacion operativa de Felipe Zurita y Maria Camila Hoyos.

### Files owned

- `src/lib/scim/provisioning.ts`
- `src/app/api/scim/v2/Users/route.ts`
- `src/app/api/scim/v2/Users/[id]/route.ts`
- `src/lib/scim/formatters.ts`
- `src/types/scim.ts`
- `src/lib/sync/event-catalog.ts`
- `src/lib/reliability/registry.ts`
- `src/lib/reliability/queries/`
- `src/lib/account-360/operating-entity-membership.ts`
- `docs/architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/documentation/identity/scim-entra-provisioning.md`
- `docs/manual-de-uso/identity/scim-entra-provisioning.md`
- `docs/tasks/to-do/TASK-872-scim-internal-collaborator-provisioning.md`

## Current Repo State

### Already exists

- SCIM endpoints reales en `src/app/api/scim/v2/Users/route.ts` y `src/app/api/scim/v2/Users/[id]/route.ts`.
- Provisioning SCIM actual en `src/lib/scim/provisioning.ts` crea `client_users` como principales de acceso, asigna role base y publica eventos `scim.user.*`.
- `greenhouse_core.scim_tenant_mappings` ya modela el tenant interno Efeonce con `client_id=NULL`, `default_role_code='collaborator'`, dominios `efeoncepro.com`, `efeonce.org`, `efeonce.cl` y `auto_provision=true`.
- `greenhouse_core.identity_profiles` y `greenhouse_core.identity_profile_source_links` ya existen como raiz humana + links externos.
- `greenhouse_core.members` ya es la faceta operativa de colaborador para HR, payroll, People, ICO, capacity y costos.
- `greenhouse_core.person_memberships` ya vincula personas con organizaciones; la operating entity Efeonce existe como `organizations.is_operating_entity=TRUE`.
- `src/lib/account-360/operating-entity-membership.ts` y `src/lib/sync/projections/operating-entity-membership.ts` ya contienen patrones para membership primaria de colaboradores internos.
- `src/lib/entra/profile-sync.ts` ya puede crear/linkear `identity_profiles` para usuarios internos existentes, pero corre fuera del `CREATE` SCIM y no crea `members`.
- `TASK-785` ya gobierna `role_title` con source/drift cuando Entra difiere de HR.

### Gap

- SCIM interno no garantiza `identity_profile_id` en el mismo flujo de alta.
- SCIM interno no crea `members`; por eso una persona contratada puede no aparecer como colaborador en Greenhouse.
- El nombre `client_users` induce a error operativo: no debe interpretarse como "persona cliente" cuando `tenant_type='efeonce_internal'`; el criterio correcto para aparecer como colaborador es tener faceta `member`.
- No existe policy versionada de elegibilidad para distinguir humano contratado vs buzones funcionales/service accounts dentro del scope SCIM.
- No existe estado/gate explicito para `member` creado por SCIM con ficha laboral pendiente.
- No existe backfill idempotente que convierta usuarios SCIM internos elegibles sin `member` en colaboradores visibles.
- Reliability no alerta si un `CREATE 201` de SCIM queda sin Person o sin Member.
- Incidente observado el 2026-05-13:
  - Felipe Zurita (`fzurita@efeoncepro.com`, OID `ec1b7fd0-87c9-43cd-a46f-1e8c37297258`) fue creado por SCIM como `client_user` a las `2026-05-13T15:24:14Z`.
  - Maria Camila Hoyos (`mchoyos@efeoncepro.com`, OID `96bf99f6-f940-4946-ac6b-1231985da8e0`) fue creada por SCIM como `client_user` a las `2026-05-13T15:42:52Z`.
  - Ambos quedaron con `identity_profile` linkeado mediante remediacion manual asistida, pero siguen sin `members` y por eso no aparecen como colaboradores.

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

### Slice 1 — ADR + Eligibility Contract

- Documentar la decision: SCIM interno Efeonce materializa `Access principal + Person + Member`; payroll/capacity quedan gated hasta completar ficha.
- Dejar explicita la nomenclatura: `client_users` es nombre historico de cuenta/principal de acceso, no una clasificacion de "personas cliente"; `tenant_type` y la existencia de `member` separan interno/cliente/colaborador.
- Definir `isEligibleInternalCollaboratorFromScim()` como policy versionada:
  - dominios permitidos desde `scim_tenant_mappings.allowed_email_domains`
  - `tenant_type='efeonce_internal'`
  - `externalId` UUID Entra valido
  - correo/UPN no `#EXT#`
  - exclusiones configurables para buzones funcionales, service accounts, bots y aliases no humanos
  - nombre humano suficiente (`displayName` o `givenName` + `familyName`)
- Registrar donde vive la decision: delta en `GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md` y, si Discovery lo exige, ADR dedicado + entry en `DECISIONS_INDEX.md`.

### Slice 2 — Primitive `provisionInternalCollaboratorFromScim`

- Crear una primitive server-only idempotente para el flujo interno elegible.
- La primitive debe crear/linkear en una unidad logica:
  - `greenhouse_core.identity_profiles`
  - `greenhouse_core.identity_profile_source_links` para `azure_ad`/`user` y `greenhouse_auth`/`client_user`
  - `greenhouse_core.client_users`
  - `greenhouse_core.user_role_assignments`
  - `greenhouse_core.members`
  - `greenhouse_core.person_memberships` primaria contra la operating entity Efeonce
- La primitive debe tratar `client_users` como cuenta de acceso y `members` como el criterio operativo para "aparece como colaborador".
- Resolver `member_id` de forma deterministica y estable, sin duplicar si el member ya existe por email, `identity_profile_id`, `azure_oid` o `client_users.member_id`.
- Setear `role_title` desde Entra/SCIM cuando exista y marcar source compatible con TASK-785.
- Setear metadata/estado que indique `profile_completion_required` o equivalente vigente tras Discovery; si no existe columna adecuada, proponer migration additive y segura.
- Publicar outbox/audit events v1 con payload redacted y stable.

### Slice 3 — Wire SCIM Create/Patch

- Reemplazar el path interno elegible de `createUser()` por la primitive compartida.
- Mantener comportamiento actual para tenants externos y personas cliente: pueden crear/actualizar `client_users` sin crear `members`.
- En `PATCH`, reusar la primitive/update path para cambios de `active`, email, displayName y `externalId`.
- Garantizar idempotencia ante reintentos de Entra:
  - duplicate `CREATE`
  - `PATCH` antes/despues de profile sync
  - usuario existente por email
  - identity profile existente
  - member existente
- Mantener `greenhouse_core.scim_sync_log` con response statuses y errores accionables.

### Slice 4 — Workforce Gates + Admin/People Semantics

- Asegurar que `member` creado por SCIM aparece como colaborador en People/HR, pero con ficha pendiente.
- Bloquear o degradar honestamente consumers sensibles hasta completar ficha:
  - payroll
  - compensation
  - Person Legal Profile readiness
  - payment profile
  - capacity/staffing
  - client assignments
- Si falta una columna/tabla de intake laboral, crear la minima additive necesaria o abrir follow-up explicito; no usar campos semanticos incorrectos para esconder el estado.
- Agregar copy/admin signal minimo para que HR/Admin entienda "Colaborador creado por Entra; ficha laboral pendiente".

### Slice 5 — Backfill + Remediation Controlled Apply

- Crear un backfill/reconciler idempotente con dry-run obligatorio.
- Detectar:
  - SCIM internal users activos sin `identity_profile_id`
  - SCIM internal users elegibles con Person pero sin `member`
  - SCIM internal users ineligible dentro del scope
- Apply controlado para Felipe Zurita y Maria Camila Hoyos:
  - usar allowlist por email/OID
  - crear `members`
  - linkear `client_users.member_id`
  - crear/reactivar `person_memberships(team_member)` con operating entity Efeonce
  - dejar ficha laboral pendiente
  - no activar payroll/capacity completo
- El backfill debe registrar summary auditable y no hacer `DELETE`.

### Slice 6 — Reliability Signals + Tests

- Agregar reliability signals:
  - `identity.scim.users_without_person`
  - `identity.scim.users_without_member`
  - `identity.scim.ineligible_accounts_in_scope`
  - `workforce.scim_members_pending_profile_completion`
  - `identity.entra.graph_profile_sync_auth_health` o integrar con signal existente si Discovery confirma equivalencia.
- Agregar tests unitarios para elegibilidad, primitive idempotente, create/patch y backfill dry-run/apply.
- Agregar smoke/manual validation con Entra `provisionOnDemand` para un usuario controlado o fixture seguro.

### Slice 7 — Docs + Manuales + Close

- Actualizar arquitectura, documentacion funcional y manual SCIM.
- Documentar diferencia entre `client_users` (principal de acceso), `identity_profiles` (Person) y `members` (colaborador operativo).
- Documentar runbook de remediacion y troubleshooting.
- Sincronizar `docs/tasks/README.md`, `Handoff.md`, `changelog.md` si cambia comportamiento real.

## Out of Scope

- Renombrar `client_users`.
- Redisenar todo HR onboarding.
- Crear compensation, payroll entries, payment profiles, legal profile verificado o capacity assignments automaticamente.
- Cerrar contratos laborales por SCIM deactivate sin workflow HR/offboarding.
- Reemplazar el profile sync Graph ni el webhook Entra completo; solo endurecer su interaccion con SCIM y agregar health signal.
- Cambiar la configuracion del Enterprise App `GH SCIM` salvo que Discovery pruebe drift operacional.

## Detailed Spec

### Target Runtime Contract

Para `scim-tm-efeonce` y usuarios elegibles:

```text
SCIM CREATE User
  -> validate bearer
  -> validate externalId is Entra objectId UUID
  -> resolve tenant mapping
  -> evaluate internal collaborator eligibility
  -> provisionInternalCollaboratorFromScim()
       -> upsert/link identity_profile
       -> upsert source links
       -> upsert client_user
       -> upsert role assignment
       -> upsert member
       -> upsert operating entity membership
       -> publish outbox events
       -> log scim_sync_log
  -> return SCIM User response
```

Para usuarios no elegibles:

- Si son cuentas funcionales esperadas, no crear `member`; crear o no crear `client_user` segun policy final aprobada en Discovery.
- Registrar `scim_sync_log.error_message`/request summary suficiente para operar sin exponer secretos.
- Reliability debe contar estos casos como `ineligible_accounts_in_scope` para que Admin corrija scope Entra si corresponde.

### Initial Member State

La task debe preservar esta semantica:

- El colaborador existe y aparece en People/HR.
- La ficha laboral queda marcada como incompleta.
- Cualquier consumer que requiere payroll/capacity/legal/payment readiness debe bloquear o degradar con razon clara.
- Si el schema actual no tiene campo adecuado, agregar un estado additive minimo y documentarlo. No usar `active=false` para esconder al colaborador si la persona ya esta contratada.

### Required Remediation Subjects

Aplicar al menos en staging/runtime verificado:

| Persona | Email | Entra OID | Estado actual |
| --- | --- | --- | --- |
| Felipe Zurita | `fzurita@efeoncepro.com` | `ec1b7fd0-87c9-43cd-a46f-1e8c37297258` | `client_user` + `identity_profile`, sin `member` |
| Maria Camila Hoyos | `mchoyos@efeoncepro.com` | `96bf99f6-f940-4946-ac6b-1231985da8e0` | `client_user` + `identity_profile`, sin `member` |

### Access Model

La task toca varios planos:

- `views` / `authorizedViews`: no se espera agregar vistas nuevas por defecto, pero la visibilidad People/HR debe seguir el modelo actual.
- `entitlements`: no se esperan capabilities nuevas salvo que se agregue una UI/admin action para backfill o review.
- `routeGroups`: no cambiar.
- `startup policy`: no cambiar.
- Roles: mantener `default_role_code='collaborator'` desde `scim_tenant_mappings` para usuarios internos.

Si Discovery propone una UI de intake nueva, debe declarar explicitamente views/capabilities antes de implementarla.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un SCIM `CREATE` interno Efeonce elegible crea o linkea `client_user`, `identity_profile`, `identity_profile_source_links`, `member`, `person_membership` primaria Efeonce y role assignment base sin duplicados.
- [ ] Felipe Zurita y Maria Camila Hoyos aparecen como colaboradores (`members`) en Greenhouse, con ficha laboral pendiente y sin payroll/capacity completo activado.
- [ ] La primitive es idempotente ante retries de Entra y backfill repetido.
- [ ] Cuentas funcionales, service accounts, bots e invitados externos no crean `members` y quedan reportados como ineligible/scope drift.
- [ ] SCIM deactivate mantiene desactivacion de acceso y abre/reutiliza revision HR/offboarding sin cerrar relacion laboral automaticamente.
- [ ] Reliability muestra signals para usuarios SCIM sin Person, sin Member, ineligible in scope y ficha pendiente vencida.
- [ ] Docs/manuales explican que `client_users` es principal de acceso legacy-named, `identity_profiles` es Person y `members` es colaborador operativo.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Tests unitarios de `src/lib/scim/provisioning.ts` y primitive nueva.
- Tests unitarios/live de reliability signals nuevos.
- Dry-run backfill para Felipe/Maria Camila retorna plan esperado sin duplicados.
- Apply backfill allowlist para Felipe/Maria Camila y query post-apply confirma:
  - `client_users.member_id IS NOT NULL`
  - `members.identity_profile_id = client_users.identity_profile_id`
  - `person_memberships` primaria con operating entity Efeonce
  - role `collaborator` sigue activo
  - payroll/capacity readiness queda pendiente/degraded
- Azure CLI / Microsoft Graph `provisionOnDemand` contra usuario de prueba o validacion controlada documentada.
- Manual visual/admin: confirmar que ambos aparecen como colaboradores en la surface acordada.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `docs/architecture/DECISIONS_INDEX.md` quedo actualizado si se creo o modifico ADR/delta arquitectonico
- [ ] `docs/manual-de-uso/identity/scim-entra-provisioning.md` quedo actualizado con el nuevo contrato y runbook
- [ ] se documento cualquier campo/schema nuevo que gatea payroll/capacity/profile completion

## Follow-ups

- UI dedicada de Workforce Intake si Slice 4 determina que la cola actual de HR/Admin no es suficiente para operar fichas pendientes.
- Policy por grupo Entra si el scope `Efeonce Group` empieza a incluir personas internas no contratadas o cuentas no humanas frecuentes.
- Revisión de secretos Graph/Entra si `identity.entra.graph_profile_sync_auth_health` confirma `invalid_client` en runtime real, no solo local.

## Open Questions

- Confirmar durante Discovery el campo/schema canonico vigente para representar "ficha laboral pendiente" sin abusar de `members.active` ni habilitar payroll/capacity.
- Confirmar si el `member_id` deterministico debe derivar de email normalizado, Entra OID o profile id, considerando recontratacion y cambios de correo.
- Confirmar si cuentas funcionales en scope deben crear solo `client_users` internos o deben rechazarse/escrowarse para corregir scope en Entra.
