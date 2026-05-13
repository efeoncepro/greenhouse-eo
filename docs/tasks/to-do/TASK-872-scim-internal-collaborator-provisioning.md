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
- Effort: `Alto` (post arch-architect review 2026-05-13 — confirma Alto; +1 slice de migration `workforce_intake_status` antes de wire SCIM)
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseño con review arch-architect aplicado (2026-05-13). Discovery requerido para validar D-1/D-2/D-3 con stakeholders HR + ops antes de empezar Slice 1.`
- Rank: `TBD`
- Domain: `identity|hr|ops`
- Blocked by: `none` (técnicamente, pero Discovery de las 3 decisiones canonizables es precondición operativa)
- Branch: `task/TASK-872-scim-internal-collaborator-provisioning`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Delta 2026-05-13 — arch-architect review + decisiones canonizadas

Review arquitectónica completa (skill `arch-architect`, 4-pillar contract aplicada). 3 decisiones canonizables resueltas con recomendación + 8 gaps técnicos detectados + 1 trampa latente identificada. Se reflejan abajo en Scope/Detailed Spec/Acceptance Criteria/Open Questions.

### D-1 — Estado de "ficha laboral pendiente" → **nueva columna `members.workforce_intake_status`**

Defaults peligrosos vigentes: `members.contract_type NOT NULL DEFAULT 'indefinido'` + `members.pay_regime NOT NULL DEFAULT 'chile'` (migration `20260402001100000_hris-contract-types.sql`). Sin estado explícito de "ficha pendiente", la primera persona contratada via SCIM tras esta task entra a la próxima corrida de payroll como colaborador chileno indefinido sin contract_terms ni base salary configurados → payment orders defectuosos → bloqueo de cierre mensual.

**Decisión**: agregar columna nueva canónica:

```sql
ALTER TABLE greenhouse_core.members
  ADD COLUMN workforce_intake_status TEXT NOT NULL DEFAULT 'completed'
  CHECK (workforce_intake_status IN ('pending_intake','in_review','completed'));
```

- Default `'completed'` para legacy members (backward compat — todos los existentes siguen elegibles para payroll/staffing).
- SCIM-provisioned members nacen con `'pending_intake'` (la primitive lo setea explícito).
- Payroll/capacity/compensation readers DEBEN filtrar `WHERE workforce_intake_status = 'completed'` antes de incluir un member en operaciones operativas.
- Reliability signal `workforce.scim_members_pending_profile_completion` cuenta `WHERE workforce_intake_status = 'pending_intake' AND created_at < now() - INTERVAL '7 days'`.

Patrón canónico ya aplicado en el repo: `services.hubspot_sync_status` (TASK-813) — estado explícito enumerado en lugar de derivado de presencia/ausencia de columnas.

### D-2 — Resolución determinística de `member_id` → **cascade lookup, NUNCA derivar de email**

**Decisión**: cascade canónica del más fuerte al más débil:

1. `members WHERE identity_profile_id = $1` (más fuerte — identidad humana ya resuelta) → reusar
2. `members WHERE azure_oid = $1` (Entra OID es estable, sobrevive cambios de email) → reusar + UPDATE para linkear `identity_profile_id` si faltaba
3. `members WHERE lower(primary_email) = lower($1) AND azure_oid IS NULL` (member legacy pre-SCIM) → reusar + UPDATE para poblar `azure_oid` + `identity_profile_id`
4. None → INSERT member nuevo con `member_id = randomUUID()` opaque

Reglas duras:

- NUNCA derivar `member_id` del email normalizado o del Entra OID. `member_id` es opaque UUID. Esto evita que cambio de email rompa FKs downstream (`person_memberships`, `client_team_assignments`, `member_role_title_audit_log`, etc.).
- Si cascade 1-3 matchea pero `identity_profile_id` actual difiere del esperado → throw + reliability signal `identity.scim.member_identity_drift` (kind=`data_quality`, severity=`error`, steady=0). Detecta bug class "Felipe ya existía con email viejo y otro identity_profile creado por reconciliation".
- Re-hire con Entra OID nuevo → crea member nuevo (es un nuevo period laboral). Re-hire con OID reusado (caso raro) → reactivar member legacy (`active=TRUE`, `workforce_intake_status='pending_intake'` para forzar refresh).

### D-3 — Eligibility policy → **defense-in-depth 4 capas + admin allowlist/blocklist**

Hoy `auto_provision=true` materializa CUALQUIER alta Entra del dominio. El grupo `Efeonce Group` puede incluir buzones, service accounts, bots, guests `#EXT#`.

**Decisión**: policy versionada como función pura en `src/lib/scim/eligibility.ts` con 4 layers:

| Layer | Test | Acción si falla |
|---|---|---|
| L1 — hard reject | UPN contiene `#EXT#`, o domain ∉ `allowed_email_domains` | NO crear `client_user` ni `member`; signal `ineligible_accounts_in_scope` cuenta `external_guest` |
| L2 — funcional / system | Email local-part matches `^(noreply|no-reply|support|info|marketing|admin|hr|finance|root|postmaster|webmaster|abuse|security|scim-sync|service-.*|bot-.*)@` (regex configurable) | Crear `client_user` SÍ (puede necesitar acceso programático), NO crear `member`; signal cuenta `functional_account_excluded` |
| L3 — name shape | `displayName` o `(givenName, familyName)` insuficiente (solo "Support", o falta apellido) | Crear `client_user` SÍ, NO `member`; signal cuenta `name_shape_insufficient` |
| L4 — admin override | Match en `scim_eligibility_overrides.allow[]` (force-create) o `.deny[]` (force-skip) — tabla separada audit-relevant con actor + reason | Bypass L1-L3 con audit trail |

Shape de la función:

```ts
type EligibilityVerdict =
  | { eligible: true; reason: 'human_collaborator' | 'admin_allowlist' }
  | { eligible: false; reason: 'external_guest' | 'functional_account' | 'name_shape_insufficient' | 'admin_blocklist'; severity: 'reject' | 'client_user_only' }
```

### Trampa latente identificada (precondición arquitectónica)

Si Slice 2 se implementa sin D-1 aplicado (columna `workforce_intake_status` + gate en payroll engine reader), **Felipe Zurita entra a la siguiente corrida payroll como `'indefinido'/'chile'` con $0 base salary**. Esto NO es bug de implementación — es bug de diseño que la task original no advertía. Slice 1.5 (migration) y Slice 4 (gate explícito en payroll reader) son load-bearing.

### Gaps técnicos resueltos (G-1..G-8)

- **G-1** atomicity: los 6 writes de la primitive deben envolver `withTransaction`. Refactor de `syncOperatingEntityMembershipForMember` para aceptar `client?` opcional (patrón TASK-765).
- **G-2** race con cron `entra-profile-sync`: OK — el cron usa `WHERE identity_profile_id IS NULL` filter idempotent. La primitive debe usar mismo `source_object_id` pattern.
- **G-3** poblar `members.azure_oid`: siempre, en INSERT y UPDATE backfill. Sin esto D-2 cascade #2 falla.
- **G-4** reconciliation drift en backfill: Slice 5 ampliado de "backfill" a "backfill + reconciliation"; tests para drift D-2 throw.
- **G-5** gate explícito en payroll reader: `getPayrollEligibleMembersForPeriod` (o equivalente canónico) filtra `workforce_intake_status = 'completed'`. Test anti-regresión obligatorio.
- **G-6** re-hire/reactivation: V1.0 con cascade D-2 + reactivation flag para OID reuse case (raro pero posible).
- **G-7** outbox event consolidado: nuevo `scim.internal_collaborator.provisioned v1` con payload `{userId, identityProfileId, memberId, azureOid, primaryEmail, displayName, roleCode, workforceIntakeStatus, eligibilityVerdict}` además de los granulares existentes.
- **G-8** cross-tenant test obligatorio: SCIM CREATE con `clientId != null` NO crea member, NO cuenta en signal `users_without_member`.

### Signal renaming

Signal `users_without_person` → **`users_without_identity_profile`** (consistencia léxica con nomenclatura canónica del repo). Mismo para todos los signals: kind + steady + severity declarados en Slice 6 ampliado.

---

## Summary

Endurecer el provisioning SCIM interno de Efeonce para que cada alta humana contratada en Microsoft Entra materialice automaticamente en Greenhouse el grafo correcto de colaborador interno: `client_user` como principal de acceso legacy-named, `identity_profile` como Person canonica y `member` como faceta operativa de colaborador, con membership primaria en la operating entity y ficha laboral pendiente de completar.

La task tambien remedia de forma idempotente a Felipe Zurita y Maria Camila Hoyos, creados por SCIM el 2026-05-13 como cuentas internas pero sin aparecer aun como colaboradores (`members`) en Greenhouse.

## Why This Task Exists

El contrato actual de SCIM crea correctamente `greenhouse_core.client_users` internos, asigna rol base y registra audit log. A pesar del nombre historico, `client_users` no representa "personas clientes" en este contexto: es el principal de acceso al portal y puede ser interno (`tenant_type='efeonce_internal'`) o cliente (`tenant_type='client'`). El problema es que el flujo actual puede dejar la identidad humana y la faceta de colaborador separadas o incompletas hasta que corran otros procesos. Eso produce una experiencia rota: una persona contratada existe en Entra y tiene cuenta de acceso, pero no aparece como colaborador en People/HR porque no existe `greenhouse_core.members`.

El usuario confirmo el criterio operativo: cuando se crea una persona en Azure AD/Entra para Efeonce es porque ya es colaborador contratado. Por lo tanto, para el tenant interno Efeonce, SCIM debe preservar la cuenta de acceso y ademas crear/linkear la Person y el colaborador visible, sin activar payroll/capacity como si la ficha laboral estuviera completa.

## Goal

- Definir e implementar una primitive idempotente `provisionInternalCollaboratorFromScim()` para materializar `Access principal + Person + Member` en altas SCIM internas elegibles, con los 6 writes (`identity_profiles`, `identity_profile_source_links` × 2, `client_users`, `user_role_assignments`, `members`, `person_memberships`) atómicos en una sola tx PG (`withTransaction`).
- **Introducir columna canónica `members.workforce_intake_status` (D-1)** con default `'completed'` (backward compat) + SCIM provisiona con `'pending_intake'`. Es el gate explícito que payroll/capacity/compensation readers consultan.
- Crear policy de elegibilidad **4-layer** (`src/lib/scim/eligibility.ts`) como función pura: hard reject `#EXT#`/domain, funcional accounts regex, name shape, admin allowlist/blocklist override (D-3).
- Resolución determinística de `member_id` via **cascade lookup canónico** (`identity_profile_id` → `azure_oid` → email normalizado + drift detection), nunca derivado de email (D-2).
- Dejar al `member` visible como colaborador, pero con payroll/capacity/legal/compensation **gated explícitamente** por `workforce_intake_status` hasta completar ficha laboral.
- Remediar Felipe Zurita y Maria Camila Hoyos usando la misma primitive/backfill, no SQL manual suelto. Backfill amplía a "reconciliation" para detectar drift D-2.
- Agregar 5+ reliability signals canónicos (renombrados a `users_without_identity_profile` por consistencia léxica) + signal nuevo `member_identity_drift` para D-2 drift.
- Emitir outbox event consolidado `scim.internal_collaborator.provisioned v1` además de los granulares (audit forensic).

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

- Para `tenant_type='efeonce_internal'` Y eligibility L4-aware verdict `eligible=true`, un SCIM `CREATE` debe materializar `client_users`, `identity_profiles`, `identity_profile_source_links` × 2 (`azure_ad/user` + `greenhouse_auth/client_user`), `members` (con `workforce_intake_status='pending_intake'` + `azure_oid` poblado), `person_memberships` primaria contra operating entity Efeonce, y role assignment base. **Los 6 writes + outbox publish viven dentro de una sola tx PG canónica via `withTransaction`** (G-1).
- `client_users` sigue siendo principal de acceso legacy-named; no significa "persona cliente" en este flujo, no es la raiz humana y no debe renombrarse ni colapsarse dentro de la task.
- `identity_profiles` sigue siendo la raiz humana; no usar `member_id` como identidad humana global.
- `members` es la faceta operativa de colaborador; crearla no equivale a habilitar payroll/capacity completo. **`workforce_intake_status='pending_intake'` es el gate explícito** consumido por payroll/compensation/capacity readers (D-1).
- Para personas del cliente (`tenant_type='client'`), `client_users` puede existir sin `member`; esa poblacion sigue fuera del alcance de `members` porque no es colaboradora Efeonce. Test cross-tenant obligatorio (G-8): SCIM CREATE con `clientId != null` NO crea member, NO cuenta en signal `users_without_member`.
- Payroll engine reader (`getPayrollEligibleMembersForPeriod` o equivalente canónico) DEBE filtrar `WHERE workforce_intake_status = 'completed'` antes de incluir un member en la corrida (G-5). Sin este gate explícito, los defaults `pay_regime='chile' + contract_type='indefinido'` insertan al SCIM-provisioned member en la próxima corrida con $0 base.
- Capacity, compensation, Person Legal Profile readiness, payment profile, client assignments siguen el mismo gate explícito `workforce_intake_status = 'completed'`.
- Resolución de `member_id` SIEMPRE via cascade canónico (D-2): `identity_profile_id` → `azure_oid` → `lower(email)` AND `azure_oid IS NULL`. NUNCA derivar `member_id` de email/OID — opaque UUID + lookup. Drift entre cascade matches → throw + signal `identity.scim.member_identity_drift`.
- `members.azure_oid` SIEMPRE poblado en SCIM provisioning + backfill (G-3). Sin esto cascade D-2 #2 falla en re-hire/email-change.
- No crear `members` para cuentas L1/L2/L3-rejected por policy de elegibilidad. Admin allowlist L4 puede override con audit + reason persistido.
- SCIM deactivate desactiva acceso y abre/reutiliza revision HR/offboarding; no cierra una relacion laboral automaticamente.
- Todo cambio de contrato compartido debe quedar como delta/ADR en arquitectura SCIM/Identity/HRIS e indexarse si aplica.
- Cualquier backfill debe ser dry-run first, idempotente, auditable, con allowlist explicita para apply controlado, **+ drift detection D-2 step antes de aplicar** (G-4).

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

- `src/lib/scim/provisioning.ts` (refactor para usar primitive)
- `src/lib/scim/provisioning-internal-collaborator.ts` (NUEVO — primitive atomic Slice 2)
- `src/lib/scim/eligibility.ts` (NUEVO — policy 4-layer pura Slice 1)
- `src/lib/scim/backfill-internal-collaborators.ts` (NUEVO — Slice 5)
- `scripts/scim/backfill-internal-collaborators.ts` (NUEVO — CLI wrapper Slice 5)
- `src/app/api/scim/v2/Users/route.ts` (refactor Slice 3)
- `src/app/api/scim/v2/Users/[id]/route.ts` (refactor Slice 3)
- `src/lib/scim/formatters.ts`
- `src/types/scim.ts`
- `src/lib/sync/event-catalog.ts` (declarar `scim.internal_collaborator.provisioned v1`)
- `src/lib/reliability/registry.ts`
- `src/lib/reliability/queries/scim-users-without-identity-profile.ts` (NUEVO)
- `src/lib/reliability/queries/scim-users-without-member.ts` (NUEVO)
- `src/lib/reliability/queries/scim-ineligible-accounts-in-scope.ts` (NUEVO)
- `src/lib/reliability/queries/workforce-scim-members-pending-profile-completion.ts` (NUEVO)
- `src/lib/reliability/queries/scim-member-identity-drift.ts` (NUEVO)
- `src/lib/account-360/operating-entity-membership.ts` (refactor para aceptar `client?: Kysely | Transaction` opcional)
- `src/lib/payroll/<reader-canónico>` (gate G-5 `workforce_intake_status='completed'`)
- `migrations/<timestamp>_task-872-members-workforce-intake-status.sql` (NUEVO Slice 1.5)
- `migrations/<timestamp>_task-872-scim-eligibility-overrides.sql` (NUEVO Slice 1)
- `docs/architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md` (Delta TASK-872 V1)
- `docs/architecture/GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md` (Delta diferenciación)
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md` (Delta `workforce_intake_status` semantics)
- `docs/architecture/DECISIONS_INDEX.md` (ADR D-1/D-2/D-3)
- `docs/operations/runbooks/scim-internal-collaborator-recovery.md` (NUEVO Slice 7)
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

### Slice 1 — ADR + Eligibility Contract 4-layer (D-3)

- Documentar la decisión canónica: SCIM interno Efeonce materializa `Access principal + Person + Member` atómicamente; payroll/capacity gated explícitamente por `workforce_intake_status` hasta completar ficha.
- Dejar explícita la nomenclatura: `client_users` es nombre histórico de cuenta/principal de acceso, no una clasificación de "personas cliente"; `tenant_type` y la existencia de `member` separan interno/cliente/colaborador.
- Implementar `evaluateInternalCollaboratorEligibility()` en `src/lib/scim/eligibility.ts` como **función pura testable** con shape:

  ```ts
  type EligibilityVerdict =
    | { eligible: true; reason: 'human_collaborator' | 'admin_allowlist' }
    | { eligible: false
        reason: 'external_guest' | 'functional_account' | 'name_shape_insufficient' | 'admin_blocklist'
        severity: 'reject' | 'client_user_only' }

  evaluateInternalCollaboratorEligibility(input: {
    upn: string                          // userPrincipalName Entra
    email: string
    externalId: string                   // Entra objectId
    displayName: string | null
    givenName: string | null
    familyName: string | null
    allowedDomains: string[]             // from scim_tenant_mappings
    overrides: { allow: string[]; deny: string[] }  // from scim_eligibility_overrides
    functionalAccountPatterns: RegExp[]  // policy versionada
  }): EligibilityVerdict
  ```

- 4 layers canónicos (en orden de evaluación):
  - **L1 hard reject**: `#EXT#` en UPN, o domain ∉ `allowedDomains` → reject (no `client_user` ni `member`)
  - **L2 funcional/system**: email local-part match regex `^(noreply|no-reply|support|info|marketing|admin|hr|finance|root|postmaster|webmaster|abuse|security|scim-sync|service-.*|bot-.*)@` → `client_user_only`
  - **L3 name shape**: missing apellido o displayName insuficiente → `client_user_only`
  - **L4 admin override**: match en `scim_eligibility_overrides.allow[]` (force-eligible) o `.deny[]` (force-skip) — overrides L1-L3 con audit trail
- Tabla nueva `greenhouse_core.scim_eligibility_overrides` para overrides L4 (audit-relevant, no JSONB inline):

  ```sql
  CREATE TABLE greenhouse_core.scim_eligibility_overrides (
    override_id TEXT PRIMARY KEY,
    scim_tenant_mapping_id TEXT NOT NULL REFERENCES greenhouse_core.scim_tenant_mappings(scim_tenant_mapping_id),
    kind TEXT NOT NULL CHECK (kind IN ('allow', 'deny')),
    match_type TEXT NOT NULL CHECK (match_type IN ('email', 'azure_oid', 'upn')),
    match_value TEXT NOT NULL,
    reason TEXT NOT NULL CHECK (length(reason) >= 20),
    actor_user_id TEXT NOT NULL REFERENCES greenhouse_core.client_users(user_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NULL,
    UNIQUE (scim_tenant_mapping_id, kind, match_type, match_value)
  );
  ```

- Registrar la decisión: delta en `GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md` (sección "TASK-872 V1 contract") + entry en `DECISIONS_INDEX.md`.
- Tests obligatorios: cada layer (L1/L2/L3/L4) con 2 casos hit + miss, plus combinatoria (L2 hit + L4 allow override; L1 hit + L4 deny override).

### Slice 1.5 — Migration `workforce_intake_status` (D-1, load-bearing)

**Por qué este Slice**: precondición arquitectónica antes de Slice 2. Sin la columna, Slice 2 no tiene gate explícito y la primera persona contratada via SCIM entra a payroll con defaults peligrosos.

- Migration nueva `migrations/<timestamp>_task-872-members-workforce-intake-status.sql`:

  ```sql
  -- Up
  ALTER TABLE greenhouse_core.members
    ADD COLUMN workforce_intake_status TEXT NOT NULL DEFAULT 'completed'
    CHECK (workforce_intake_status IN ('pending_intake', 'in_review', 'completed'));

  COMMENT ON COLUMN greenhouse_core.members.workforce_intake_status IS
    'TASK-872 — gate explícito de ficha laboral. Default completed para legacy. SCIM-provisioned nacen pending_intake. Payroll/capacity/compensation readers filtran = completed.';

  CREATE INDEX members_workforce_intake_status_idx
    ON greenhouse_core.members (workforce_intake_status)
    WHERE workforce_intake_status != 'completed';

  -- Anti pre-up-marker check
  DO $$
  DECLARE col_exists boolean;
  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='greenhouse_core' AND table_name='members'
        AND column_name='workforce_intake_status'
    ) INTO col_exists;
    IF NOT col_exists THEN
      RAISE EXCEPTION 'TASK-872 anti pre-up-marker: workforce_intake_status NOT created';
    END IF;
  END $$;

  -- Down
  ALTER TABLE greenhouse_core.members DROP COLUMN IF EXISTS workforce_intake_status;
  ```

- Regenerar tipos Kysely (`pnpm db:generate-types`).
- Verificación post-migrate: query `SELECT workforce_intake_status, count(*) FROM greenhouse_core.members GROUP BY 1` debe devolver `completed: N` (todos legacy con default).

### Slice 2 — Primitive `provisionInternalCollaboratorFromScim` (atomic + cascade D-2)

- Crear primitive server-only idempotente en `src/lib/scim/provisioning-internal-collaborator.ts`.
- **Atomicidad obligatoria (G-1)**: toda la primitive vive dentro de `db.transaction().execute(async tx => { ... })`. Los helpers reusados (`syncOperatingEntityMembershipForMember`) refactorizados para aceptar `client?: Kysely | Transaction` opcional (patrón TASK-765 `recordExpensePayment`).
- Steps secuenciales dentro de la tx:
  1. Lookup/upsert `identity_profiles` (re-leer canonical_email match)
  2. Upsert `identity_profile_source_links` para `azure_ad / user / externalId`
  3. Upsert `identity_profile_source_links` para `greenhouse_auth / client_user / userId`
  4. Insert `client_users` con `identity_profile_id` poblado desde step 1
  5. Insert `user_role_assignments` con `default_role_code` del tenant mapping
  6. **Cascade lookup D-2 de member_id** (4 niveles):
     - `members WHERE identity_profile_id = $profileId` → hit: reuse + UPDATE para poblar `azure_oid` si falta
     - `members WHERE azure_oid = $externalId` → hit: reuse + UPDATE para linkear `identity_profile_id` si falta
     - `members WHERE lower(primary_email) = lower($email) AND azure_oid IS NULL` → hit: reuse + UPDATE para poblar `azure_oid` + `identity_profile_id`
     - None → INSERT new member con `member_id = randomUUID()`, `display_name`, `identity_profile_id`, `azure_oid`, `primary_email`, `role_title`, `role_title_source='entra'`, `active=TRUE`, `assignable=TRUE`, **`workforce_intake_status='pending_intake'`**
     - **Drift case**: si cascade #2 o #3 matchea pero `members.identity_profile_id` actual difiere del step 1 → throw `MemberIdentityDriftError` + emit signal data — no auto-merge, humano resuelve.
  7. UPDATE `client_users.member_id` = resultado del step 6.
  8. Invocar `syncOperatingEntityMembershipForMember(memberId, { client: tx })` para `person_memberships` primaria contra operating entity Efeonce.
  9. Publish outbox events dentro de la tx (canonical via `publishOutboxEvent` que escribe a `outbox_events` table):
     - `scim.user.created` (granular existente)
     - `member.created` o `MEMBER_CREATED` (verificar event_catalog; si no existe, declarar v1)
     - `scim.internal_collaborator.provisioned v1` (consolidado nuevo — payload `{userId, identityProfileId, memberId, azureOid, primaryEmail, displayName, roleCode, workforceIntakeStatus, eligibilityVerdict}`)
  10. Log `scim_sync_log` con `response_status=201` + `request_summary` redactado.
- **Idempotencia ante retries**: si todos los lookups pre-INSERT matchean entidades existentes consistentes, primitive devuelve `{idempotent: true, ...ids}` sin escribir + sin emitir outbox duplicados. Outbox event_id derivado de `(scim_id, action)` para dedupe downstream.
- `role_title` desde `entra.jobTitle` cuando exista, source `'entra'` per TASK-785 governance (skipea overwrite si HR override activa).
- Test integration obligatorio: primitive llamada 2 veces consecutivas → estado final idéntico, 0 audit rows duplicados, 0 outbox events duplicados.

### Slice 3 — Wire SCIM Create/Patch (refactor endpoint)

- En `POST /api/scim/v2/Users`:
  1. Resolver tenant mapping (igual que hoy).
  2. Evaluar `evaluateInternalCollaboratorEligibility()` (Slice 1).
  3. Branch:
     - `eligible=true AND tenant_type='efeonce_internal'` → invocar primitive Slice 2.
     - `eligible=false, severity='client_user_only'` → invocar `createUser()` legacy (solo `client_user`) + log `scim_sync_log.error_message='functional_account_excluded'` + signal `ineligible_accounts_in_scope` cuenta.
     - `eligible=false, severity='reject'` → 400 + log + signal cuenta.
     - `tenant_type='client'` (cliente externo) → invocar `createUser()` legacy (path hoy). **NO** evalúa eligibility internal collaborator. Test cross-tenant obligatorio (G-8).
- En `PATCH /api/scim/v2/Users/[id]`: reusar primitive Slice 2 para change de `active`/`email`/`displayName`/`externalId`. PATCH preserva `workforce_intake_status` existente (no force-reset a `pending_intake` en PATCH).
- Mantener `scim_sync_log` con statuses + error messages redactados.

### Slice 4 — Workforce Intake State + Payroll/Capacity Gates (G-5)

- **Asegurar que payroll engine reader filtra explícitamente** `workforce_intake_status = 'completed'`:
  - Identificar el reader canónico (e.g. `getPayrollEligibleMembersForPeriod` en `src/lib/payroll/`). Si emerge ambigüedad sobre cuál es el reader canónico, abrir Discovery con HR/Finance antes de codear.
  - Agregar gate explícito en el SQL WHERE.
  - Test anti-regresión obligatorio: SCIM crea Felipe → next `getPayrollEligibleMembersForPeriod(currentPeriod)` NO incluye a Felipe.
- Mismo gate para: `capacity` (`talent-discovery` ya filtra `assignable=TRUE`; agregar también `workforce_intake_status = 'completed'`), `compensation`, `client_team_assignments` (no permitir assignment con `workforce_intake_status != 'completed'`).
- **Person Legal Profile readiness** (TASK-784): ya degrada honesto si no hay legal_profile data — no necesita gate adicional, pero sumar al diagnóstico operativo.
- **People/HR display**: members con `workforce_intake_status='pending_intake'` SE MUESTRAN en People/HR con badge "Ficha pendiente" (chip warning + tooltip). NO se ocultan via `active=FALSE`.
- Admin signal: agregar microcopy es-CL canónico en `src/lib/copy/<workforce-domain>.ts` para badge "Ficha pendiente · Completar datos laborales" + tooltip "Colaborador creado por Entra. Payroll/Capacity bloqueados hasta completar contrato y compensación."

### Slice 5 — Backfill + Reconciliation Controlled Apply (G-4)

- Crear `src/lib/scim/backfill-internal-collaborators.ts` (server-only, idempotent, dry-run default).
- Dry-run report shape:

  ```ts
  type BackfillPlan = {
    eligible: Array<{ userId, email, externalId, missing: ('identity_profile'|'member'|'person_membership')[] }>
    ineligible: Array<{ userId, email, verdict: EligibilityVerdict }>
    drift: Array<{ userId, email, kind: 'member_identity_drift' | 'member_azure_oid_drift' | 'duplicate_member', detail: string }>
    summary: { totalScanned: number, eligibleCount: number, ineligibleCount: number, driftCount: number }
  }
  ```

- **Drift detection D-2 step** (G-4) ANTES del apply: para cada usuario, ejecutar cascade D-2 lookup y verificar que matches sean consistentes (member existe → `identity_profile_id` matchea `client_user.identity_profile_id`). Si drift → reportar en `plan.drift[]` y NO incluir en apply hasta que humano resuelva.
- Apply controlado:
  - `--apply` flag obligatorio (default dry-run).
  - `--allowlist <emails-or-oids>` obligatorio en apply (no permitir apply masivo accidental).
  - Por cada usuario en allowlist + plan.eligible: invocar primitive Slice 2 con `{actor: process.env.GREENHOUSE_BACKFILL_ACTOR_USER_ID || 'scim-backfill'}` (idealmente operador humano via env).
  - Skipea usuarios en plan.drift (escalation humano).
  - NO hace `DELETE`. Append-only audit en `scim_sync_log` con `operation='BACKFILL'`.
- Aplicación canónica para Felipe Zurita + Maria Camila Hoyos:
  - `pnpm tsx scripts/scim/backfill-internal-collaborators.ts --apply --allowlist fzurita@efeoncepro.com,mchoyos@efeoncepro.com`
  - Post-apply verify: `client_users.member_id IS NOT NULL`, `members.identity_profile_id = client_users.identity_profile_id`, `members.azure_oid = client_users.microsoft_oid`, `members.workforce_intake_status = 'pending_intake'`, `person_memberships(team_member)` primaria con operating entity Efeonce, role `collaborator` activo, payroll/capacity gated.

### Slice 6 — Reliability Signals + Tests anti-regresión

5 reliability signals canónicos nuevos (subsystem `Identity & Access`):

- `identity.scim.users_without_identity_profile` (data_quality, error si >0 después de 1h, steady=0) — renamed de `users_without_person` por consistencia léxica.
- `identity.scim.users_without_member` (drift, error si >0 después de 1h, steady=0) — excluye L2/L3 ineligible. WHERE `tenant_type='efeonce_internal' AND member_id IS NULL AND scim_id IS NOT NULL AND eligibilityVerdict.eligible = true`.
- `identity.scim.ineligible_accounts_in_scope` (drift, warning si >5, steady<5) — cuenta `scim_sync_log` con `error_message LIKE 'functional_account_excluded%' OR 'name_shape_insufficient%'` últimos 7 días.
- `workforce.scim_members_pending_profile_completion` (drift, warning >7d, error >30d, steady=0 después de operación normal) — query `WHERE workforce_intake_status='pending_intake' AND created_at < now() - INTERVAL '7 days'`.
- `identity.scim.member_identity_drift` (data_quality, error si >0, steady=0) — D-2 cascade drift detected by primitive throw.
- `identity.scim.member_reactivated_via_oid_reuse` (drift, info-only, no steady) — G-6 case raro: Entra OID reusado tras offboarding previo.

Tests obligatorios:

- Unit tests `evaluateInternalCollaboratorEligibility` (4 layers × hit/miss + combinatoria L4 override).
- Unit tests primitive idempotent (re-call 2x → estado idéntico).
- Unit tests cascade D-2 (4 niveles + drift throw).
- Integration test atomicity (G-1): mock step 6 throw → assert tx rollback completo, 0 rows en `client_users`/`members`/`person_memberships`.
- Integration test cross-tenant (G-8): SCIM CREATE con `clientId != null` → solo `client_user`, 0 members nuevos.
- Integration test payroll gate (G-5): primitive crea Felipe → `getPayrollEligibleMembersForPeriod(...)` NO lo incluye.
- Backfill dry-run + apply Felipe/Maria Camila + smoke staging con Entra `provisionOnDemand`.

### Slice 7 — Docs + Manuales + Close

- Actualizar `docs/architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md` con Delta TASK-872 (espejo del Delta en este task).
- Actualizar `docs/architecture/Greenhouse_HRIS_Architecture_v1.md` con sección `workforce_intake_status` semantics.
- Actualizar `docs/architecture/GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md` con la diferenciación `client_users` (access principal) vs `identity_profiles` (Person) vs `members` (operativo).
- Actualizar `docs/architecture/DECISIONS_INDEX.md` con ADR D-1/D-2/D-3 + workforce_intake_status + eligibility policy 4-layer.
- Crear `docs/operations/runbooks/scim-internal-collaborator-recovery.md` con escenarios: dry-run backfill, drift resolution, Entra restart resetScope, allowlist override.
- Actualizar `docs/documentation/identity/scim-entra-provisioning.md` + `docs/manual-de-uso/identity/scim-entra-provisioning.md` con contrato nuevo + runbook.
- Sincronizar `docs/tasks/README.md`, `Handoff.md`, `changelog.md`.

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

### Initial Member State (canonizado D-1)

Member SCIM-provisioned nace con shape canónico:

```text
active                     = TRUE       (visible en People/HR)
assignable                 = TRUE       (NO blocked aquí — el gate es workforce_intake_status)
workforce_intake_status    = 'pending_intake'   ← gate explícito
identity_profile_id        = (linked, never null)
azure_oid                  = $externalId  (siempre poblado)
primary_email              = $email (lowercase)
display_name               = $displayName  o  $givenName + ' ' + $familyName
role_title                 = $entra.jobTitle (si existe) — source 'entra' per TASK-785
role_title_source          = 'entra'
contract_type              = default 'indefinido' (legacy default — bloqueado por workforce_intake_status)
pay_regime                 = default 'chile'      (legacy default — bloqueado por workforce_intake_status)
```

Consumers que respetan el gate (filtran `workforce_intake_status = 'completed'`):

- payroll engine (`getPayrollEligibleMembersForPeriod` o equivalente canónico)
- capacity engine (`talent-discovery`, ya filtra `assignable=TRUE`; agregar también el gate)
- compensation engine
- client_team_assignments writer (no permitir assignment con `pending_intake`)

Member transita `pending_intake → in_review → completed` cuando HR completa la ficha (workflow Workforce Intake — Follow-up V1.1 UI dedicada). El paso a `completed` lo dispara la UI/admin endpoint canónico **NO** SCIM update.

### Cascade lookup de `member_id` (canonizado D-2)

```ts
// Inside withTransaction(async tx => { ... })
const existingByProfile = await tx
  .selectFrom('greenhouse_core.members')
  .selectAll()
  .where('identity_profile_id', '=', profileId)
  .executeTakeFirst()

if (existingByProfile) {
  // CASCADE #1 hit — reuse, UPDATE azure_oid if missing
  return reuseMember(existingByProfile, { populateAzureOid: true })
}

const existingByOid = await tx
  .selectFrom('greenhouse_core.members')
  .selectAll()
  .where('azure_oid', '=', externalId)
  .executeTakeFirst()

if (existingByOid) {
  if (existingByOid.identity_profile_id && existingByOid.identity_profile_id !== profileId) {
    throw new MemberIdentityDriftError({
      memberId: existingByOid.member_id,
      currentProfileId: existingByOid.identity_profile_id,
      expectedProfileId: profileId
    })
  }
  // CASCADE #2 hit — reuse, UPDATE identity_profile_id if missing
  return reuseMember(existingByOid, { populateIdentityProfileId: profileId })
}

const existingByEmail = await tx
  .selectFrom('greenhouse_core.members')
  .selectAll()
  .where(sql`lower(primary_email)`, '=', email.toLowerCase())
  .where('azure_oid', 'is', null)
  .executeTakeFirst()

if (existingByEmail) {
  if (existingByEmail.identity_profile_id && existingByEmail.identity_profile_id !== profileId) {
    throw new MemberIdentityDriftError({ ... })
  }
  // CASCADE #3 hit — reuse legacy pre-SCIM member
  return reuseMember(existingByEmail, { populateAzureOid: true, populateIdentityProfileId: profileId })
}

// CASCADE #4 — INSERT new member with opaque UUID
return insertMember({ memberId: randomUUID(), profileId, externalId, email, ... })
```

`MemberIdentityDriftError` throw → tx rollback → endpoint devuelve 500 + emit signal `identity.scim.member_identity_drift` + log `scim_sync_log.error_message='member_identity_drift'` con detail. Humano resuelve antes de retry.

### Consolidated outbox event (G-7)

Además de los granulares (`scim.user.created`, `member.created`, `membership.created`), emitir un evento consolidado para audit forensic:

```jsonc
// scim.internal_collaborator.provisioned v1
{
  "eventType": "scim.internal_collaborator.provisioned",
  "version": 1,
  "aggregateType": "scim_internal_collaborator_provisioning",
  "aggregateId": "<userId>",  // greenhouse_core.client_users.user_id
  "payload": {
    "userId": "<client_user.user_id>",
    "scimId": "<client_user.scim_id>",
    "identityProfileId": "<identity_profiles.profile_id>",
    "memberId": "<members.member_id>",
    "azureOid": "<entra externalId>",
    "primaryEmail": "<email lowercased>",
    "displayName": "<display name>",
    "roleCode": "collaborator",
    "workforceIntakeStatus": "pending_intake",
    "eligibilityVerdict": {
      "eligible": true,
      "reason": "human_collaborator"
    },
    "cascadeOutcome": "created_new" | "reused_by_profile_id" | "reused_by_azure_oid" | "reused_by_email_legacy",
    "operatingEntityMembershipAction": "created" | "reactivated" | "updated" | "noop"
  }
}
```

Registrar en `GREENHOUSE_EVENT_CATALOG_V1.md` Delta TASK-872.

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

## Rollout Plan & Risk Matrix

Esta task toca **3 sistemas críticos de producción** (SCIM provisioning, payroll engine, identity reconciliation). El rollout debe respetar invariants estrictos. Sin disciplina de ordering + flag + verification, alta probabilidad de incidente operativo (members entrando a payroll con $0 base, SCIM degradado a 500 en Entra, etc.).

### Slice ordering hard rule

El orden NO es opcional — un agente que ejecute slices fuera de este orden viola el contract:

```text
Slice 1   (eligibility policy + scim_eligibility_overrides migration)
   ↓
Slice 1.5 (members.workforce_intake_status migration)   ← PRECONDICIÓN HARD
   ↓
Slice 4   (payroll engine reader gate explícito)         ← MUST SHIP BEFORE Slice 5
   ↓
Slice 2   (primitive provisionInternalCollaboratorFromScim)
   ↓
Slice 3   (wire SCIM CREATE/PATCH endpoints, con flag default false)
   ↓                                                      ↘
Slice 6   (reliability signals readers)                    Slice 5 (backfill + apply Felipe/Maria)
                                                          ↑
                                                          ONLY after Slice 4 verified in staging
```

**Por qué este orden**:

- Slice 1.5 (migration) DEBE preceder a Slice 4 — Slice 4 lee la columna que Slice 1.5 crea.
- Slice 4 (payroll gate) DEBE preceder a Slice 5 (apply) — sin gate, Felipe entra a payroll con defaults peligrosos.
- Slice 2 (primitive) consume helpers refactored — debe correr DESPUÉS de Slice 1.5 (necesita columna) y Slice 1 (necesita eligibility function).
- Slice 3 wraps Slice 2 detrás de flag `SCIM_INTERNAL_COLLABORATOR_PRIMITIVE_ENABLED=false` por default. Sin esto, el merge a producción cambia el comportamiento de SCIM sin oportunidad de revert rápido.

**Test enforcement**: agregar `task-872-slice-order-invariant.test.ts` que parsea el commit log del branch y verifica que los commits respetan ordering. Bloquea merge si fuera de orden.

### Risk matrix

| # | Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|---|
| R1 | Primitive throws mid-tx → 500 a Entra → `countEscrowed` | SCIM provisioning | medium (primer rollout) | Feature flag `SCIM_INTERNAL_COLLABORATOR_PRIMITIVE_ENABLED=false` default + smoke staging exhaustivo via `provisionOnDemand` antes de flippear prod | Entra Provisioning logs (Azure portal) muestran `countEscrowed > 0` post-deploy. Signal `identity.scim.users_without_member` cuenta. |
| R2 | Member SCIM-provisioned entra a payroll con $0 base | payroll engine | **HIGH** si Slice 5 corre antes que Slice 4 | Slice ordering hard rule (Slice 4 → Slice 5) + test enforcement + smoke staging payroll engine ANTES del apply prod | Test anti-regresión `getPayrollEligibleMembersForPeriod` excluye `pending_intake`. Signal `workforce.scim_members_pending_profile_completion` alerta si lleva >7d sin completar. |
| R3 | SSO break por bug en columna nueva | NextAuth Azure AD provider | low | Migration es additive con DEFAULT; auth callback NO lee `workforce_intake_status`. Verificación staging post-migration: smoke login con Felipe (ya tiene client_user). | Sentry domain=identity emite si signIn callback throws. Signal `identity.scim.users_without_identity_profile` baseline. |
| R4 | Cascade D-2 drift detecta member legacy malformado → primitive throw constante | identity reconciliation | medium (datos legacy desconocidos hasta backfill dry-run) | Dry-run backfill antes de apply reporta `plan.drift[]` ANTES de production; humano resuelve drift via admin endpoint dedicado | Signal `identity.scim.member_identity_drift` cuenta >0 inmediato. |
| R5 | Backfill apply con allowlist mal especificada materializa N members incorrectos | identity / HR | low (allowlist explícito hard) | `--apply` flag obligatorio + `--allowlist <emails>` obligatorio + dry-run muestra plan ANTES; NO permite apply masivo | Audit `scim_sync_log.operation='BACKFILL'` lista todos los emails afectados; humano review antes/después. |
| R6 | Migration `workforce_intake_status` rompe consumers downstream que asumen schema viejo | TS compile / Kysely types | low (additive only) | `pnpm db:generate-types` + `pnpm tsc --noEmit` post-migration; CI gate detecta any breakage | tsc errors en CI. |
| R7 | Outbox event consolidado `scim.internal_collaborator.provisioned v1` colisiona con consumer existente | outbox / reactive projections | low (event nuevo) | Verificar grep `rg "scim.internal_collaborator"` retorna 0 matches pre-merge; declarar en EVENT_CATALOG ANTES de emit | Signal `sync.outbox.unpublished_lag` baseline. |
| R8 | Cross-tenant leak — Sky user crea member en operating entity Efeonce | identity / cross-tenant | low (test obligatorio G-8) | Test anti-regresión `tenant_type='client' → 0 members nuevos` verde antes de merge | Signal `users_without_member` filtra por `tenant_type='efeonce_internal'` — un Sky leak no contaría ahí, pero `person_memberships` con `organization_id=Efeonce` para profile_id de Sky lo detectaría. |
| R9 | Admin allowlist L4 mal configurada permite member para spam account | identity / scope abuse | very low (requires admin action + reason ≥20 chars) | Tabla `scim_eligibility_overrides` con audit trail (actor_user_id + reason); endpoint admin requiere capability dedicada | Signal nuevo `identity.scim.allowlist_override_rate` (drift, warning si >5 overrides/mes). |

### Feature flags / cutover

3 flags durante el rollout:

| Flag | Tipo | Default prod | Propósito | Revert |
|---|---|---|---|---|
| `SCIM_INTERNAL_COLLABORATOR_PRIMITIVE_ENABLED` | env var Vercel | `false` | Controla si SCIM CREATE invoca primitive nueva. `false` → comportamiento legacy. | Env var a `false` + redeploy Vercel. Tiempo <5 min. |
| `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED` | env var Vercel | `false` | Controla si payroll reader filtra `workforce_intake_status='completed'`. `false` → comportamiento legacy (incluye todos `active=TRUE`). Solo flippear a `true` DESPUÉS de verificar que no hay members en `pending_intake` en producción. | Env var a `false` + redeploy. |
| `SCIM_ELIGIBILITY_FUNCTIONAL_PATTERNS_ENABLED` | env var Vercel | `false` (V1.0), `true` (V1.1) | Controla si L2 regex de funcional accounts está activa. `false` → solo L1+L3+L4 enforce. Permite rollout gradual: primero solo hard rejects, luego patrones funcionales. | Env var a `false` + redeploy. |

**Cutover sequence canónico**:

1. Merge code a `develop` con todos los flags en `false`.
2. Deploy a staging. Flippear flags en orden: `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED=true` primero (gate explícito), después `SCIM_INTERNAL_COLLABORATOR_PRIMITIVE_ENABLED=true`, último `SCIM_ELIGIBILITY_FUNCTIONAL_PATTERNS_ENABLED=true`.
3. Smoke staging exhaustivo entre cada flip.
4. Merge `develop` → `main` con flags en `false`.
5. Deploy a prod. Flips en mismo orden que staging, con 24h cooldown entre flag flips para observar signals.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? | Notas |
|---|---|---|---|---|
| Slice 1 (eligibility + overrides table) | Revert PR + drop tabla `scim_eligibility_overrides` via migration down | <30 min | sí | Tabla nueva sin consumers downstream pre-Slice 3. |
| Slice 1.5 (migration `workforce_intake_status`) | Migration down `ALTER TABLE members DROP COLUMN workforce_intake_status` + `pnpm db:generate-types` + redeploy | <1 hora | sí, parcial | Si Slice 4 ya hizo deploy con gate, debe revertir primero Slice 4. |
| Slice 2 (primitive) | Revert PR (primitive no se invoca si Slice 3 no la wireó) | <30 min | sí | Primitive aislada hasta que Slice 3 la conecte. |
| Slice 3 (wire SCIM) | Env var `SCIM_INTERNAL_COLLABORATOR_PRIMITIVE_ENABLED=false` + redeploy. Comportamiento legacy `createUser()` restaurado instant. | <5 min | sí | Path canónico de revert — siempre disponible mientras flag exista. |
| Slice 4 (payroll gate) | Env var `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED=false` + redeploy | <5 min | sí | Sin riesgo de pérdida de datos. |
| Slice 5 (backfill apply Felipe/Maria) | NO rollback automático. Cada apply es append-only. Si emerge bug post-apply, admin endpoint para `UPDATE members SET active=FALSE WHERE member_id IN (...)` + audit row. NUNCA `DELETE FROM members` (FK cascade + audit trail loss). | <2 horas (manual) | parcial | Append-only by design. Decisión humana. |
| Slice 6 (signals) | Revert PR. Signals desaparecen del dashboard, no impacto operativo. | <30 min | sí | Aditivo puro. |
| Slice 7 (docs + runbook) | N/A — doc-only. | N/A | N/A | |

### Production verification sequence

Orden canónico de staging → prod. **Stop & escalate** si cualquier verify falla.

**Staging**:

1. `pnpm migrate:up` → verify `\d greenhouse_core.members` muestra columna `workforce_intake_status` + columna `scim_eligibility_overrides` table existe.
2. `pnpm db:generate-types` + `pnpm tsc --noEmit` verde.
3. `pnpm test src/lib/scim` + `pnpm test src/lib/payroll` verdes (incluye tests anti-regresión G-1..G-8).
4. Deploy staging con TODOS los flags en `false`. Verify SCIM existente: `provisionOnDemand` test user → 201 + comportamiento legacy (`client_user` solo).
5. Flag `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED=true` en staging. Verify payroll engine reader filtra correctamente con member de prueba `pending_intake`.
6. Flag `SCIM_INTERNAL_COLLABORATOR_PRIMITIVE_ENABLED=true` en staging. `provisionOnDemand` test user humano → verify primitive ejecuta + 6 writes + outbox event + member visible en People/HR con badge "Ficha pendiente".
7. `provisionOnDemand` test funcional account `marketing@efeoncepro.com` → verify L2 reject (no member creado, client_user sí, signal `ineligible_accounts_in_scope` cuenta).
8. Backfill dry-run staging para Felipe/Maria Camila → verify plan esperado (eligible: 2, drift: 0).
9. Backfill apply staging allowlist Felipe + Maria → verify post-apply queries verdes.
10. Smoke payroll engine: corrida simulada del próximo período → verify Felipe + Maria NO incluidos.

**Producción** (24h post-staging verde):

11. Coordinar con HR/Finance: comunicar cutover window (1-2 hrs) + sign-off para flippear flags.
12. Repetir steps 1-3 en prod.
13. Deploy prod con flags `false`.
14. Cooldown 24h observando signals (no debe haber regresión en SCIM).
15. Flip `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED=true` en prod. Cooldown 24h.
16. Flip `SCIM_INTERNAL_COLLABORATOR_PRIMITIVE_ENABLED=true` en prod. Cooldown 24h.
17. Backfill dry-run prod → verify plan esperado.
18. Backfill apply prod allowlist Felipe + Maria (humano operador ejecuta, no agente).
19. Verify Felipe + Maria aparecen en People/HR con badge "Ficha pendiente"; verify NO incluidos en próxima corrida payroll (manualmente revisado).
20. Monitor signals durante 7d post-prod. Si cualquier signal >0 con persistencia → escalation.

### Out-of-band coordination required

Sistemas externos / humanos que requieren coordinación antes del rollout:

- **HR/Finance signoff**: D-1 (workforce_intake_status semantics) impacta el flujo operativo de cómo HR completa fichas laborales. Acuerdo explícito requerido sobre quién opera "transición pending_intake → completed" + qué validation aplica (compensation, contract_terms, person_legal_profile).
- **Azure AD / Entra**: ninguna modificación al Enterprise App "GH SCIM" requerida en V1.0. Si Discovery determina que el scope Entra "Efeonce Group" incluye cuentas funcionales no deseadas, coordinar con IT para reducir scope ANTES del rollout (preferible) o usar L2 regex (fallback).
- **Felipe Zurita + Maria Camila Hoyos**: comunicación humana antes del backfill apply: "Vas a empezar a aparecer en People/HR como colaborador con badge 'Ficha pendiente'. Coordinar con HR para completar tus datos laborales." Ambas personas existen como humanos reales; no es solo un test fixture.
- **Operador HR (CPA/contador)**: review del impact en payroll engine con CPA ANTES de Slice 4 deploy. Confirmar que `WHERE workforce_intake_status='completed'` filter no rompe la corrida actual (debe ser no-op para los 24+ members legacy con default `'completed'`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

### Pre-requisitos (coordinación Discovery)

- [ ] D-1/D-2/D-3 validados con stakeholders HR + ops + (idealmente) un CPA/contador (D-1 impact payroll). Decisiones documentadas en spec + Handoff.

### Implementación

- [ ] **Slice 1**: `evaluateInternalCollaboratorEligibility` función pura testeable, 4 layers L1-L4 con tabla `scim_eligibility_overrides` para L4. Tests cubren cada layer hit/miss + combinatoria L4 override.
- [ ] **Slice 1.5**: migration `members.workforce_intake_status` aplicada en staging + tipos Kysely regenerados + bloque DO anti pre-up-marker verde. Verificación: `SELECT workforce_intake_status, count(*) FROM greenhouse_core.members GROUP BY 1` devuelve `completed: N` (todos legacy con default `'completed'`).
- [ ] **Slice 2**: primitive `provisionInternalCollaboratorFromScim` envuelta en `withTransaction`; 6 writes atomic; cascade D-2 con 4 niveles + drift throw; outbox events 3 emitidos (granular x2 + consolidado v1); idempotent re-call 2x sin duplicados.
- [ ] **Slice 3**: SCIM POST/PATCH endpoints refactored. `eligible=true AND tenant_type='efeonce_internal'` → primitive. `eligible=false severity='client_user_only'` → legacy createUser. `tenant_type='client'` → legacy createUser (test cross-tenant verde).
- [ ] **Slice 4**: payroll engine reader filtra `workforce_intake_status = 'completed'` explícito (test anti-regresión: Felipe NO entra a corrida payroll). Capacity/compensation/assignments mismo gate. Badge "Ficha pendiente" en People/HR con microcopy es-CL.
- [ ] **Slice 5**: backfill dry-run produce `BackfillPlan` shape canónico; apply controlado Felipe + Maria Camila con allowlist; post-apply verify queries verdes; drift detection step ejecutado ANTES del apply.
- [ ] **Slice 6**: 5 reliability signals canónicos (`users_without_identity_profile`, `users_without_member`, `ineligible_accounts_in_scope`, `workforce.scim_members_pending_profile_completion`, `member_identity_drift`) + tests unit + integration.

### Anti-regresión obligatorios

- [ ] **Cross-tenant isolation (G-8)**: SCIM CREATE con `clientId != null` crea `client_user` pero `members count antes==después` para tenant interno. Test verde.
- [ ] **Payroll exclusion (G-5)**: SCIM provisiona Felipe → siguiente corrida `getPayrollEligibleMembersForPeriod(currentPeriod)` NO incluye a Felipe. Test verde.
- [ ] **Atomicity (G-1)**: mock step 6 throw dentro de primitive → assert tx rollback completo, 0 rows en `client_users`/`members`/`person_memberships`. Test verde.
- [ ] **Cascade drift D-2**: member existe con `azure_oid=X, identity_profile_id=A`; primitive llamada con `externalId=X, profileId=B` → throw `MemberIdentityDriftError`, signal `member_identity_drift` cuenta=1, tx rollback. Test verde.
- [ ] **Admin allowlist L4 override**: usuario L2-rejected (`marketing@efeoncepro.com`) con allowlist L4 hit → primitive ejecuta + member creado + audit row con `eligibilityVerdict.reason='admin_allowlist'`. Test verde.

### Idempotencia

- [ ] La primitive es idempotente ante retries de Entra y backfill repetido (re-call 2x → estado idéntico, 0 duplicados, 0 outbox dupes).
- [ ] Cuentas funcionales (L2), service accounts, bots e invitados externos (L1) no crean `members` y quedan reportados como `ineligible_accounts_in_scope`.
- [ ] SCIM deactivate mantiene desactivacion de acceso y abre/reutiliza revision HR/offboarding sin cerrar relacion laboral automaticamente (comportamiento existente preservado).

### Outcome operativo

- [ ] Felipe Zurita y Maria Camila Hoyos aparecen como colaboradores (`members`) en Greenhouse, con `workforce_intake_status='pending_intake'`, badge "Ficha pendiente" visible, NO incluidos en próxima corrida payroll.
- [ ] Reliability dashboard muestra los 5 signals con steady-state esperado post-apply.
- [ ] Docs/manuales explican que `client_users` es principal de acceso legacy-named, `identity_profiles` es Person y `members` es colaborador operativo gated por `workforce_intake_status`.
- [ ] Runbook `scim-internal-collaborator-recovery.md` creado con escenarios canónicos.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm build` (Turbopack production — defense in depth contra `server-only` transitivo en primitive)
- `pnpm migrate:up` aplicado en staging (Slice 1.5 + Slice 1 migrations).
- Tests unitarios `src/lib/scim/eligibility.ts`, `src/lib/scim/provisioning-internal-collaborator.ts`, primitive idempotent + cascade D-2 + atomicity G-1.
- Tests unitarios reliability signals (5 nuevos) + tests live contra PG staging.
- Tests anti-regresión: cross-tenant isolation, payroll exclusion, atomicity rollback, cascade drift throw, admin allowlist override.
- Dry-run backfill para Felipe/Maria Camila retorna plan esperado sin duplicados, sin drift detectado, `summary.eligibleCount=2`.
- Apply backfill allowlist para Felipe/Maria Camila y query post-apply confirma:
  - `client_users.member_id IS NOT NULL`
  - `members.identity_profile_id = client_users.identity_profile_id`
  - `members.azure_oid = client_users.microsoft_oid`
  - `members.workforce_intake_status = 'pending_intake'`
  - `person_memberships(team_member)` primaria con operating entity Efeonce
  - role `collaborator` sigue activo
  - payroll/capacity readiness queda pendiente/degraded por gate explícito (G-5)
  - outbox event `scim.internal_collaborator.provisioned v1` emitido con payload canónico
- Azure CLI / Microsoft Graph `provisionOnDemand` contra usuario de prueba o validación controlada documentada.
- Manual visual/admin: confirmar que Felipe + María Camila aparecen como colaboradores en People/HR con badge "Ficha pendiente"; admin panel para completar ficha funcional.

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

### Resueltas en review arch-architect 2026-05-13

- ✅ **Ficha laboral pendiente (D-1)**: nueva columna `members.workforce_intake_status TEXT NOT NULL DEFAULT 'completed' CHECK IN ('pending_intake','in_review','completed')`. Default `'completed'` para legacy backward compat; SCIM-provisioned nacen `'pending_intake'`. Es el gate explícito consumido por payroll/capacity/compensation readers.
- ✅ **`member_id` determinístico (D-2)**: cascade lookup canónico `identity_profile_id` → `azure_oid` → `lower(email) AND azure_oid IS NULL` → INSERT new con `randomUUID()` opaque. NUNCA derivar `member_id` del email/OID (preserva FKs downstream ante cambio de email).
- ✅ **Cuentas funcionales en scope (D-3)**: policy 4-layer (L1 hard reject `#EXT#`/domain, L2 funcional regex `client_user_only`, L3 name shape insuficiente `client_user_only`, L4 admin allowlist/blocklist override). Cuentas funcionales crean `client_user` (pueden necesitar acceso programático) pero NO `member`. Tabla `scim_eligibility_overrides` separada para audit-relevant L4 overrides con actor + reason.

### Abiertas (Discovery / V1.1)

- **Reader payroll canónico exacto**: el spec asume `getPayrollEligibleMembersForPeriod` o equivalente; Discovery debe identificar el reader real en `src/lib/payroll/` antes de Slice 4. Si emerge ambigüedad, escalar a HR/Finance.
- **Transición `pending_intake → completed`**: ¿UI dedicada Workforce Intake o admin endpoint manual V1.0? Recomendación V1.0: admin endpoint `POST /api/admin/workforce/members/[memberId]/complete-intake` con capability dedicada + validation (verifica compensation_packages + contract_terms + person_legal_profile readiness antes de aprobar). V1.1 ships UI dedicada.
- **`members` legacy con drift pre-SCIM**: ¿qué hacer si el backfill detecta member legacy con `email match + identity_profile_id mismatch`? Recomendación: report en `plan.drift[]`, NO incluir en apply, humano resuelve via admin endpoint para reasignar o crear nuevo (cada caso es one-off).
- **Re-hire OID reuse (G-6)**: Entra raramente reusa OIDs tras delete (caso reset+restore). Si emerge en producción → signal `member_reactivated_via_oid_reuse` alerta + recuperación manual.
- **Eligibility patterns L2 configurables runtime**: ¿hardcode en `eligibility.ts` o persistido en `scim_tenant_mappings.functional_account_patterns TEXT[]`? V1.0 recomendación: hardcoded + override admin via L4 allowlist; V1.1 si emerge necesidad de policies per-tenant.
