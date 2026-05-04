# TASK-781 — SCIM Reliability & Governance Control Plane

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
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `identity`
- Blocked by: `none`
- Branch: `task/TASK-781-scim-reliability-governance-control-plane`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir una capa operativa robusta para SCIM/Entra: doctor CLI, reconciliacion Entra ↔ Greenhouse, reliability signals, alertas y una surface admin minima. El objetivo es pasar de "SCIM funciona si lo probamos manualmente" a "SCIM se gobierna, se audita y avisa antes de romper usuarios".

## Why This Task Exists

El incidente del 2026-05-04 mostro que SCIM podia estar parcialmente vivo pero semanticamente fragil: mapping interno con pseudo-client `efeonce-admin`, Entra enviando `externalId <= mailNickname` en vez de `objectId`, usuarios creados con `microsoft_oid` incorrecto y `countEscrowed` dificil de interpretar.

El fix dejo el runtime sano, pero todavia falta una capa persistente de observabilidad, reconciliacion y tooling para que el equipo no dependa de Azure Portal, queries manuales o conocimiento conversacional.

## Goal

- Exponer un diagnostico canónico de SCIM que valide endpoint, bearer, schema Entra, job status, usuarios en scope y datos persistidos.
- Detectar drift entre `Efeonce Group` en Entra y usuarios/grupos SCIM en Greenhouse sin SQL manual.
- Agregar reliability signals y alertas accionables para quarantine, 5xx, `externalId` invalido, drift de OID/email/status y escrows persistentes.
- Crear una surface admin minima para revisar salud, usuarios provisionados, ultimo evento, drift y acciones seguras.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md`
- `docs/architecture/GREENHOUSE_AUTH_RESILIENCE_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/documentation/identity/scim-entra-provisioning.md`
- `docs/manual-de-uso/identity/scim-entra-provisioning.md`

Reglas obligatorias:

- SCIM `externalId` de usuarios debe ser el Microsoft Entra `objectId`; Greenhouse lo persiste como `client_users.microsoft_oid`.
- Tenant interno Efeonce usa `scim_tenant_mappings.client_id=NULL`; no reintroducir pseudo-clientes como `efeonce-admin`.
- SCIM endpoints siguen bearer-token protected y separados de NextAuth.
- Avatar, cargo extendido, telefono, pais, ciudad y manager siguen por Graph profile sync; no forzar esos datos en SCIM si el contrato canonico no lo requiere.
- No resolver escrows editando SQL manualmente; usar Microsoft Graph provisioning APIs y logs.

## Normative Docs

- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
- `docs/tasks/TASK_PROCESS.md`

## Dependencies & Impact

### Depends on

- `src/app/api/scim/v2/Users/route.ts`
- `src/app/api/scim/v2/Users/[id]/route.ts`
- `src/app/api/scim/v2/Groups/route.ts`
- `src/lib/scim/provisioning.ts`
- `src/lib/scim/groups.ts`
- `src/lib/scim/auth.ts`
- `src/lib/entra/graph-client.ts`
- `src/lib/entra/profile-sync.ts`
- `src/lib/reliability/registry.ts`
- `src/lib/reliability/queries/`
- `docs/architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md`

### Blocks / Impacts

- Reduce riesgo operacional de Microsoft SSO y onboarding interno.
- Desbloquea SCIM multi-tenant futuro con mejor observabilidad.
- Impacta Admin Center, Identity reliability y operaciones de usuarios internos.

### Files owned

- `scripts/scim/`
- `src/lib/scim/`
- `src/lib/entra/`
- `src/lib/reliability/queries/`
- `src/app/api/admin/scim-health/`
- `src/app/(dashboard)/admin/scim-health/`
- `src/views/greenhouse/admin/`
- `docs/architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md`
- `docs/documentation/identity/scim-entra-provisioning.md`
- `docs/manual-de-uso/identity/scim-entra-provisioning.md`

## Current Repo State

### Already exists

- SCIM v2 endpoints en `src/app/api/scim/v2/`.
- Provisioning runtime en `src/lib/scim/provisioning.ts`.
- Group runtime en `src/lib/scim/groups.ts`.
- Bearer auth helper en `src/lib/scim/auth.ts`.
- Entra Graph profile sync en `src/lib/entra/`.
- Admin mapping UI/API en `src/app/(dashboard)/admin/scim-tenant-mappings/` y `src/app/api/admin/scim-tenant-mappings/`.
- Arquitectura, documentacion funcional y manual de uso SCIM actualizados post-incidente.
- Production 2026-05-04 validada: 8 usuarios de `Efeonce Group` con `provisionOnDemand` success; grupo con `RedundantExport`; DB con 11/11 usuarios SCIM con `microsoft_oid` UUID.

### Gap

- No existe `pnpm scim:doctor`.
- No existe reconciliacion automatica Entra group ↔ Greenhouse SCIM users/groups.
- No existe reliability signal dedicado a quarantine, escrow persistente, invalid externalId, OID/email drift o scope mismatch.
- No existe Admin Center de salud SCIM.
- No hay snapshot/test automatizado que valide schema Entra esperado (`externalId <= objectId`) contra Microsoft Graph.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — SCIM Doctor CLI

- Crear `pnpm scim:doctor` con salida redacted y exit codes deterministicos.
- Validar endpoint discovery, bearer auth, schema Entra, job status, quarantine, escrows, usuarios del grupo asignado y DB shape.
- No imprimir bearer tokens, client secrets, raw headers ni PII innecesaria.

### Slice 2 — Reconciliation Engine

- Crear reader/engine que compare `Efeonce Group` en Entra contra `greenhouse_core.client_users` y `greenhouse_core.scim_groups`.
- Detectar usuarios en Entra no presentes en Greenhouse, usuarios Greenhouse fuera de scope, `microsoft_oid` drift, email drift, active/status drift y membership drift.
- Persistir resultado o exponerlo por reader reusable sin crear otra fuente de verdad paralela.

### Slice 3 — Reliability Signals & Alerts

- Agregar señales al reliability control plane para:
  - SCIM endpoint 5xx reciente.
  - Entra job quarantine.
  - `countEscrowed > 0` persistente despues de ventana definida.
  - `externalId` invalido recibido.
  - OID/email/status drift.
  - scope count inesperado.
- Definir steady state, severidad y evidencia concreta por señal.

### Slice 4 — Admin Center Surface

- Crear vista admin minima para salud SCIM.
- Mostrar job status, ultima corrida, drift summary, usuarios provisionados, ultimo evento SCIM y acciones seguras.
- Acciones permitidas solo si son seguras y auditables: copiar comando doctor, abrir logs/documentacion, o disparar una verificacion read-only. No permitir mutaciones destructivas.

### Slice 5 — Contract Tests & Documentation

- Tests para `externalId` UUID, PATCH `externalId`, tenant interno `client_id=NULL`, schema checker y reconciliacion.
- Actualizar arquitectura, documentacion funcional, manual de uso, Handoff y changelog.

## Out of Scope

- Reemplazar bearer token SCIM por OAuth client credentials.
- Provisioning SCIM multi-tenant para clientes externos.
- Cambiar Microsoft SSO/NextAuth.
- Cambiar profile sync/avatar Graph salvo que el doctor detecte drift y solo como diagnostico.
- Crear usuarios Entra desde Greenhouse.

## Detailed Spec

### Doctor CLI

El comando debe entregar un resumen tipo:

- `endpoint.discovery`: pass/fail
- `endpoint.users_unauthorized_without_bearer`: pass/fail
- `endpoint.users_authorized_with_bearer`: pass/fail
- `entra.schema.user_externalId_objectId`: pass/fail
- `entra.job.active`: pass/fail
- `entra.job.not_quarantined`: pass/fail
- `entra.group.scope_count`: pass/warn/fail
- `greenhouse.scim_users_oid_uuid`: pass/fail
- `greenhouse.internal_mapping_null_client`: pass/fail
- `drift.summary`: counts

### Admin Surface

Debe vivir bajo Admin Center y respetar access model:

- `routeGroups`: admin/internal segun patron existente.
- `views`: agregar o reutilizar una view admin existente si corresponde.
- `entitlements`: capability fina para lectura SCIM health y eventual accion read-only.
- `startup policy`: sin cambios.

### Security

- Redactar emails en logs si el output puede terminar en Sentry.
- No persistir tokens.
- No agregar raw Graph payloads a logs sin sanitizacion.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `pnpm scim:doctor` existe, corre localmente con CLIs autenticadas y no imprime secretos.
- [ ] El doctor falla si Entra user `externalId` deja de mapear a `objectId`.
- [ ] Existe reconciliacion Entra ↔ Greenhouse con evidencia de usuarios, grupos y drift.
- [ ] Reliability registry expone señales SCIM con steady state y severidad.
- [ ] Admin Center tiene surface minima para revisar salud SCIM sin SQL manual.
- [ ] Tests cubren rechazo de `externalId` no UUID, PATCH `externalId`, tenant interno `client_id=NULL` y reconciliacion base.
- [ ] Docs vivas quedan sincronizadas.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm scim:doctor`
- Verificacion manual en Production/Staging si la UI Admin cambia
- Microsoft Graph read-only validation contra `GH SCIM`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] docs SCIM en arquitectura/documentacion/manual quedaron consistentes con el runtime final

## Follow-ups

- OAuth2 client credentials para SCIM bearer replacement si el volumen o compliance lo exige.
- SCIM multi-tenant externo para clientes.
- Rotacion automatizada del token SCIM con overlap y cutover verificado.

## Delta 2026-05-04

Task creada como follow-up del incidente SCIM/Entra cerrado el 2026-05-04. El runtime base ya quedo corregido y desplegado; esta task agrega control plane, gobernanza y automatizacion preventiva.
