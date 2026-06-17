# Invariantes operativos para agentes — Identity/Workforce (TASK-784, 785, 872)

---

## Invariantes operativos para agentes — Identity/Workforce (TASK-784, 785, 872)

> **Relocados de `CLAUDE.md` por TASK-1160 (2026-06-16), verbatim.** Contrato: `GREENHOUSE_IDENTITY_ACCESS_V2.md`, `GREENHOUSE_INTERNAL_IDENTITY_V1.md` + task-specs TASK-784/785/872. Dedup = Slice 4.

### Person Legal Profile invariants (TASK-784, desde 2026-05-05)

Toda surface que muestre o consuma identidad legal de una persona natural (RUT, documento de identidad, direccion legal/residencia) **debe** pasar por el modulo canonico `src/lib/person-legal-profile/`. Reemplaza el patron legacy donde `final_settlement_documents` hardcodea `taxId: null` y BigQuery `member_profiles.identity_document_*` era la unica fuente.

**Frontera canonica**:

- `organizations.tax_id` → identidad tributaria de organizaciones / personas juridicas / clientes / proveedores empresa / facturacion. NO se reemplaza por TASK-784.
- `greenhouse_core.person_identity_documents` → identidad legal de personas naturales. Anclado a `identity_profiles.profile_id`. Soporta CL_RUT + 23 tipos internacionales extensible.
- `greenhouse_core.person_addresses` → direcciones legal/residencia/correspondencia/emergencia.

**Read API canonico**:

- Default reader: `listIdentityDocumentsForProfileMasked(profileId)` / `listAddressesForProfileMasked(profileId)` → masked, NUNCA expone `value_full` ni `presentation_text`.
- Snapshot autorizado para document generators: `readFinalSettlementSnapshot(profileId)` / `readPersonLegalSnapshot({useCase})` → server-only, escribe audit `export_snapshot`, devuelve `valueFull` solo cuando `verification_status='verified'`.
- Reveal con capability + reason + audit: `revealPersonIdentityDocument({reason >= 5, ...})`. Caller DEBE haber validado `person.legal_profile.reveal_sensitive` ANTES; el helper escribe audit + outbox y devuelve `valueFull`.
- Readiness gates: `assessPersonLegalReadiness({profileId, useCase})` → `{ready, blockers[], warnings[]}` para 5 casos: `payroll_chile_dependent`, `final_settlement_chile`, `honorarios_closure`, `document_render_payroll_receipt`, `document_render_onboarding_contract`.

**Encryption strategy** (TASK-697 pattern, NO KMS envelope V1):

- Plaintext at rest en `value_full` con grants estrictos `greenhouse_runtime` (sin DELETE).
- `value_hash` = SHA-256(pepper || normalized) via secret `greenhouse-pii-normalization-pepper` (GCP Secret Manager). Sin pepper, hash de RUT 8-9 digitos es trivialmente reversible.
- `display_mask` precomputado al INSERT/UPDATE (`xx.xxx.NNN-K` para CL_RUT, last-4 generic).
- Sanitizers extendidos en `src/lib/observability/redact.ts` para `[redacted:rut]` + `[redacted:long-id]`.
- AI sanitizer (`sanitizePiiText`) ya cubre CL_RUT.
- Cloud SQL ya cifra at-rest a nivel disco. KMS envelope queda como follow-up si compliance Ley 21.719 lo escala.

**Capabilities granulares (6, least privilege)**:

| Capability | Module | Action | Scope | Allowed source |
|---|---|---|---|---|
| `person.legal_profile.read_masked` | people | read | own/tenant | route_group=my (own) o route_group=hr / EFEONCE_ADMIN (tenant) |
| `person.legal_profile.self_update` | my_workspace | create/update | own | route_group=my |
| `person.legal_profile.hr_update` | hr | create/update | tenant | route_group=hr / EFEONCE_ADMIN |
| `person.legal_profile.verify` | hr | approve | tenant | route_group=hr / EFEONCE_ADMIN |
| `person.legal_profile.reveal_sensitive` | hr | read | tenant | EFEONCE_ADMIN / FINANCE_ADMIN solo |
| `person.legal_profile.export_snapshot` | hr | export | tenant | route_group=hr (server-only para document generators) |

**Outbox events versionados v1 (12 nuevos)**:

- `person.identity_document.{declared, updated, verified, rejected, archived, revealed_sensitive}`
- `person.address.{declared, updated, verified, rejected, archived, revealed_sensitive}`

**Reliability signals (4) bajo modulo `identity`**:

- `identity.legal_profile.pending_review_overdue` — drift, warning si > 0
- `identity.legal_profile.payroll_chile_blocking_finiquito` — data_quality, error si > 0
- `identity.legal_profile.reveal_anomaly_rate` — drift, warning/error segun threshold (3 reveals/24h por actor)
- `identity.legal_profile.evidence_orphan` — data_quality, error si > 0

**⚠️ Reglas duras**:

- **NUNCA** leer `value_full` directo en consumers. Use readers canonicos (`*Masked`, `readPersonLegalSnapshot`, `revealPersonIdentityDocument`).
- **NUNCA** loggear `value_full` / `value_normalized` / `street_line_1` / `presentation_text` en errors / Sentry / outbox payloads / AI context. Los `diff_json` describen QUE campos cambiaron, no su valor pleno.
- **NUNCA** llamar `revealPersonIdentityDocument` ni `revealPersonAddress` sin validar capability + reason >= 5 chars en el route handler. El helper enforce internamente, pero defense in depth.
- **NUNCA** persistir `value_full` sin pasar por `normalizeDocument` + `computeValueHash` + `formatDisplayMask`. Los 3 helpers garantizan idempotencia + dedup + masking precomputado.
- **NUNCA** confiar automaticamente datos backfilled (`source='legacy_bigquery_member_profile'`). Quedan en `verification_status='pending_review'` y NO se cuentan como verified hasta que HR los apruebe via `verifyIdentityDocument`.
- **NUNCA** cambiar `organizations.tax_id` para guardar RUT personal. La columna es identidad tributaria de organizaciones / facturacion. Si emerge una persona natural facturable como organizacion, modelar como organizacion separada con `organization_type='natural_person'`.
- **NUNCA** branchear UI por pais hardcodeado. Use copy pais-aware: "RUT" cuando `documentType='CL_RUT'`, "Documento de identidad" como fallback.
- **NUNCA** exponer error.message raw en HTTP responses. Use `redactErrorForResponse(error)` + `captureWithDomain(error, 'identity', { extra })` desde `src/lib/observability/{redact,capture}.ts`.

**Spec canonica**: `docs/tasks/in-progress/TASK-784-person-legal-profile-identity-documents-foundation.md`. Migracion: `migrations/20260505015628132_task-784-person-identity-documents-and-addresses.sql`. Pattern fuente: TASK-697 (`src/lib/finance/beneficiary-payment-profiles/reveal-sensitive.ts`).

### Workforce role title source-of-truth + Entra drift governance (TASK-785, desde 2026-05-05)

`members.role_title` es la **fuente de verdad laboral** del cargo en Greenhouse (contrato, finiquito, payroll, KPIs comerciales). `identity_profiles.job_title` es enriquecimiento operativo (Entra/Graph/SCIM) que sirve como dato bruto pero NUNCA sobreescribe el cargo formal HR.

**Invariantes duras**:

- **NUNCA** modificar `members.role_title` directamente vía SQL o helpers ad-hoc en consumers. Toda mutación pasa por `updateMemberRoleTitle()` (`src/lib/workforce/role-title/store.ts`) — atomic tx con audit + outbox event + resolución de drift pendiente.
- **NUNCA** dejar que el sync Entra sobrescriba `role_title` cuando `role_title_source='hr_manual' AND last_human_update_at IS NOT NULL`. El helper canónico `applyEntraRoleTitle()` (`sync-from-entra.ts`) enforce esta regla y registra drift_proposal cuando los valores divergen.
- **NUNCA** computar fallback de cargo per-context inline en consumers (e.g. `members.role_title || identity_profiles.job_title`). Usar el resolver canónico `resolveRoleTitle({ memberId, context })` con uno de los 6 contextos: `internal_profile`, `client_assignment`, `payroll_document`, `commercial_cost`, `staffing`, `identity_admin`.
- **NUNCA** modificar `member_role_title_audit_log` (append-only enforced por triggers PG `prevent_update_on_audit_log` y `prevent_delete_on_audit_log`). Para correcciones, insertar nueva fila con `action='reverted'`.
- **NUNCA** transicionar drift proposals fuera del state machine `pending → approved | rejected | dismissed`. Toda resolución pasa por `resolveRoleTitleDriftProposal()` (`drift-store.ts`) — atomic tx con audit + outbox event.
- **NUNCA** escribir capability checks de role-title manualmente. Usar `can(tenant, 'workforce.role_title.update', 'update', 'tenant')` o `can(tenant, 'workforce.role_title.review_drift', 'read|approve', 'tenant')`.

**Helpers canónicos** (`src/lib/workforce/role-title/`):

- `updateMemberRoleTitle({ memberId, newRoleTitle, reason, actorUserId, ... })` — single source of truth para HR mutation. Reason >=10 chars obligatorio, audit log + resolución de drift pendiente como rejected en misma tx.
- `applyEntraRoleTitle({ memberId, entraJobTitle, ... })` — sync path Entra→members. Skipea overwrite cuando hay HR override; registra drift proposal cuando diverge. Returns `{ applied, skipped, driftProposed }` non-blocking.
- `resolveRoleTitle({ memberId, context, assignmentId? })` — resolver canónico per-contexto. Devuelve `{ value, source, sourceLabel, hasDriftWithEntra, assignmentOverride? }`.
- `resolveRoleTitleDriftProposal({ proposalId, decision, resolutionNote, actorUserId, ... })` — HR review queue resolver. Decision `accept_entra` aplica valor Entra al member (source='entra', clear last_human_update_at). `keep_hr` mantiene HR override sin cambio. `dismissed` cierra sin cambio.
- `getRoleTitleGovernanceForMember(memberId)` — reader para UI HR. Single query: cargo actual + source + Entra job_title + drift status + pending proposal.

**API canónica**:

- `PATCH /api/admin/team/members/[memberId]/role-title` (capability `workforce.role_title.update:update`, FINANCE_ADMIN/HR/EFEONCE_ADMIN).
- `GET /api/hr/workforce/role-title-drift` (capability `workforce.role_title.review_drift:read`).
- `POST /api/hr/workforce/role-title-drift/[proposalId]/resolve` (capability `workforce.role_title.review_drift:approve`).
- `GET /api/hr/workforce/members/[memberId]/role-title` (capability `workforce.role_title.update | review_drift`).

**Outbox events**: `member.role_title.changed`, `member.role_title.drift_proposed`, `member.role_title.drift_resolved`.

**Reliability signals** (subsystem `Identity & Access`):

- `workforce.role_title.drift_with_entra` (drift, warning) — informativo: miembros con HR != Entra. Steady state variable.
- `workforce.role_title.unresolved_drift_overdue` (drift, error) — drift proposals pendientes >30 días. Steady state = 0.

**Spec canonica**: `docs/tasks/in-progress/TASK-785-workforce-role-title-source-of-truth-governance.md`. Migración: `migrations/20260505123242929_task-785-role-title-governance.sql`. Pattern fuente: `reporting_hierarchy_drift_proposals` (TASK-731).

### SCIM Internal Collaborator Provisioning invariants (TASK-872, desde 2026-05-13)

SCIM POST `/api/scim/v2/Users` con `tenant_type='efeonce_internal'` Y eligibility verdict `eligible=true` invoca primitive atomic `provisionInternalCollaboratorFromScim` que materializa `client_user + identity_profile + identity_profile_source_links × 2 + member + person_membership` + role assignment + 3 outbox events en una sola tx PG.

**Helpers canónicos**:

- `evaluateInternalCollaboratorEligibility(input)` en `src/lib/scim/eligibility.ts` — función pura 4-layer policy (L1 hard reject `#EXT#`/domain, L2 funcional regex, L3 name shape, L4 admin allowlist/blocklist override). Discriminated union return `EligibilityVerdict`.
- `provisionInternalCollaboratorFromScim(input)` en `src/lib/scim/provisioning-internal-collaborator.ts` — primitive atomic. Idempotency gate first-step + cascade D-2 (4 niveles: profile_id → azure_oid → email legacy → INSERT new) + drift detection 3 kinds + outbox consolidado `scim.internal_collaborator.provisioned v1`.
- `createScimEligibilityOverride / supersedeScimEligibilityOverride / listActiveOverridesForTenantMapping` en `src/lib/scim/eligibility-overrides-store.ts` — CRUD canónica con audit append-only via PG trigger.

**Feature flags (default false en producción — zero behavioral change post-merge)**:

| Flag | Default | Efecto cuando true |
| --- | --- | --- |
| `SCIM_INTERNAL_COLLABORATOR_PRIMITIVE_ENABLED` | `false` | SCIM CREATE internal eligible invoca primitive; ineligibles van a legacy `createUser` |
| `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED` | `false` | Payroll reader `pgGetApplicableCompensationVersionsForPeriod` filtra `m.workforce_intake_status = 'completed'` |
| `SCIM_ELIGIBILITY_FUNCTIONAL_PATTERNS_ENABLED` | `false` (V1.0) | Reservado V1.1 — control de L2 regex |

**6 reliability signals canónicos (subsystem Identity & Access)**:

- `identity.scim.users_without_identity_profile` (data_quality, error >0, steady=0)
- `identity.scim.users_without_member` (drift, error >0, steady=0 post-backfill)
- `identity.scim.ineligible_accounts_in_scope` (drift, warning 1-5 / error >5, steady<5)
- `identity.scim.member_identity_drift` (data_quality, error >0, steady=0)
- `workforce.scim_members_pending_profile_completion` (drift, warning >7d / error >30d, steady=0)
- `identity.scim.allowlist_blocklist_conflict` (data_quality, error >0, steady=0)

**⚠️ Reglas duras**:

- **NUNCA** ejecutar los 6 writes del primitive fuera de `withTransaction`. Si se necesita refactor de un helper downstream, agregar `client?: PoolClient` opcional (dual-mode pattern TASK-765/TASK-872). Helpers refactored: `syncOperatingEntityMembershipForMember`, `createMembership`, `deactivateMembership`.
- **NUNCA** decidir merge automático en drift D-2. Throw `MemberIdentityDriftError` con `kind` discriminator (`profile_oid_mismatch | oid_profile_mismatch | email_profile_mismatch`) + signal alerta + humano resuelve via runbook escenario 3.
- **NUNCA** poblar `members` SCIM-provisioned sin `workforce_intake_status='pending_intake'` + `azure_oid` poblado. Backfill bypasa con default `'completed'` SOLO para legacy members existentes pre-TASK-872.
- **NUNCA** incluir members con `workforce_intake_status != 'completed'` en una corrida payroll cuando `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED=true`. Gate canonical en `pgGetApplicableCompensationVersionsForPeriod` (postgres-store.ts) — único punto de verdad.
- **NUNCA** insertar `scim_sync_log` dentro del primitive. Logging vive en endpoint handler (post-call). Permite logging de fallos cuando primitive throws.
- **NUNCA** emitir outbox event fuera de la tx del primitive. `publishOutboxEvent(event, client?)` acepta client opcional desde TASK-771 — pass through dentro del withTransaction.
- **NUNCA** DELETE physical sobre `scim_eligibility_overrides`. Solo supersede via `effective_to` + audit row append-only en `scim_eligibility_override_changes` (trigger PG enforce).
- **NUNCA** invocar `Sentry.captureException` directo en code path SCIM. Usar `captureWithDomain(err, 'identity', { tags: { source: 'scim_provisioning', stage: '...' } })`.
- **NUNCA** flippear `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED=true` en producción sin: (1) verify 7 legacy members all `'completed'`; (2) HR signoff workflow complete_intake; (3) smoke staging con member pending_intake synthetic + corrida payroll mock excluye correctamente.
- **NUNCA** marcar Felipe Zurita / Maria Camila Hoyos backfill como complete sin: (1) flag SCIM enabled staging + smoke `provisionOnDemand` test user verde; (2) comunicación humana a Felipe/Maria sobre badge "Ficha pendiente"; (3) operador humano ejecuta apply con allowlist explícita; (4) signals post-apply en steady state esperado.
- **SIEMPRE** que primitive devuelva `idempotent: true`, NO emitir outbox events (re-emit duplicates downstream).
- **SIEMPRE** que un consumer nuevo emerja que enumere members para payroll/capacity/compensation/assignments, agregar el mismo gate `workforce_intake_status = 'completed'` detrás del flag canónico (defense in depth).
- **SIEMPRE** que cascade outcome sea `reactivated_via_oid_reuse`, signal `identity.scim.member_reactivated_via_oid_reuse` (info-only V1.0) alerta a operador para audit del caso raro.

**Outbox event consolidado canonical `scim.internal_collaborator.provisioned v1`** (aggregateType='client_user'): payload incluye `userId, scimId, identityProfileId, memberId, azureOid, microsoftTenantId, primaryEmail, displayName, roleCode, workforceIntakeStatus, eligibilityVerdict, cascadeOutcome, operatingEntityMembershipAction, provisionedAt`. Single source of truth audit forensic para "qué pasó cuando entró este colaborador".

**Capabilities granulares canónicas (4 nuevas)**:

- `scim.eligibility_override.create` (organization, create, tenant) — EFEONCE_ADMIN <!-- spec original menciona DEVOPS_OPERATOR — colapsado a EFEONCE_ADMIN solo por TASK-935 (rol DEVOPS_OPERATOR no existe en ROLE_CODES) -->
- `scim.eligibility_override.delete` (organization, delete, tenant) — EFEONCE_ADMIN only
- `scim.backfill.execute` (organization, execute, all) — EFEONCE_ADMIN only
- `workforce.member.complete_intake` (workforce, update, tenant) — FINANCE_ADMIN + EFEONCE_ADMIN

**Spec canónica**: `docs/tasks/in-progress/TASK-872-scim-internal-collaborator-provisioning.md`. Runbook: `docs/operations/runbooks/scim-internal-collaborator-recovery.md`. Migrations: `migrations/20260513234436189_task-872-scim-eligibility-overrides.sql` + `migrations/20260514000116899_task-872-members-workforce-intake-status.sql` + `migrations/20260514000207733_task-872-capabilities-registry-seed.sql`.

---

## Invariantes operativos para agentes — Identity Bridge Cutover Protocol (TASK-877)

> **Relocados de `CLAUDE.md` por TASK-1160 (2026-06-16), verbatim — cero cambio semántico.** Espejo operativo (NUNCA/SIEMPRE) que un agente carga al tocar este dominio; el contrato técnico vive en su spec. Dedup = TASK-1160 Slice 4.

### Identity Bridge Cutover Protocol (TASK-877 follow-up, desde 2026-05-16)

Cuando se migra un bridge identity / lookup table de una store legacy (BQ direct, manual, `members.<columna>`) a una nueva store canónica (PG `identity_profile_source_links`, source_links, etc.), la PR que hace el cutover **debe** incluir 3 invariantes atómicos en el mismo PR. Sin esto, la cutover degrada silenciosamente y el bug class se manifiesta días después en consumers downstream (ICO, payroll, capacity, cost attribution).

**Bug class canónico (2026-05-16)**: TASK-877 cambió `loadNotionMemberMapPostgresFirst` para preferir PG sobre BQ. La condición `if (map.size > 0) return PG; else BQ fallback` aceptó un mapa parcial (2 entries de SCIM) como "PG está activa", silenciando BQ fallback que tenía 6 entries correctas. Resultado: cobertura del bridge cayó de 95%+ → 3.7% durante 2 días. Materializer ICO wipeaba metrics_by_member cada noche y reinsertaba vacío → bonificaciones OTD/RpA proyectadas colapsaron a $0 para todos los colaboradores.

**Invariantes obligatorios al hacer cutover**:

1. **Migration de backfill atómico en el MISMO PR**: una migration que copia los datos canónicos de la store legacy a la store nueva. Idempotente (UPDATE conditional sobre prev value), con anti pre-up-marker DO block que verifique post-INSERT count == expected. Pattern fuente: `migrations/20260516234743277_backfill-notion-bridge-greenhouse-staff.sql`.

2. **Reliability signal canónico de coverage drift**: detector que mide cobertura del bridge en tiempo real. Steady = baseline esperado (puede ser 60% si hay externos legítimos, o 100% si solo internal). Severity: ok / warning (caída significativa) / error (regresión sistémica). Pattern fuente: `src/lib/reliability/queries/identity-notion-bridge-coverage.ts`.

3. **NUNCA gate `if (result.size > 0) return primary`**: el contador "primary tiene algo" NO es válido para decidir "primary está completa". Patrones canónicos para resolver multi-source:
   - **Always UNION** ambas fuentes + dedup + log diff (más resiliente, más cost). Recomendado por default.
   - **Parity check**: shadow-read secondary en paralelo + assert `|primary - secondary| < tolerance` antes de aceptar primary.
   - **Coverage threshold**: `if (primary.size >= expected_minimum)` donde `expected_minimum` viene de un cálculo upstream (e.g. COUNT(*) en `members` activos).

**⚠️ Reglas duras**:

- **NUNCA** mergear cutover de un bridge identity (Notion↔member, HubSpot owner↔member, Azure OID↔member, similares) sin migration de backfill atómico en el mismo PR.
- **NUNCA** decidir "store A está activa" basándose en `if (result.size > 0)` cuando la respuesta correcta es "A está completa". Una store puede retornar 2 entries de 10 esperadas y eso NO es completa.
- **NUNCA** introducir un nuevo bridge resolver canónico sin reliability signal de coverage drift en el mismo PR.
- **NUNCA** sobrescribir bulk `members.notion_user_id` (o equivalentes) desde un script sin transacción atómica + verificación pre-state (UPDATE conditional sobre valor previo conocido).
- **NUNCA** asumir que un cutover funcionó porque "el resolver retorna algo". Verificar coverage % concreto en producción dentro de las primeras 24h post-merge.
- **SIEMPRE** que un bug afecte UNIFORMEMENTE a todos los entities downstream, sospechar primero del bridge / resolver / config compartida ANTES que del calculator per-entity. El bug del 2026-05-16 ocupó 4 horas de diagnóstico que hubieran sido 30 min si se hubiera empezado por el bridge.

**Spec canónica**: `src/lib/identity/reconciliation/notion-member-map.ts` (resolver canónico, post-TASK-877). Signal canónico: `identity.notion_bridge.coverage_drift` en `src/lib/reliability/queries/identity-notion-bridge-coverage.ts`. Migration fuente: `migrations/20260516234743277_backfill-notion-bridge-greenhouse-staff.sql`. Patrones fuente: TASK-742 (defense-in-depth 7-layer), TASK-720 (`instrumentCategoriesWithoutKpiRule` detector), TASK-571/766/774 (VIEW canónica + helper + signal).
