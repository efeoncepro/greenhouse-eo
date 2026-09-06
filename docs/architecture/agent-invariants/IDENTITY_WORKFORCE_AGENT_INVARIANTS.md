# Invariantes operativos para agentes — Identity/Workforce (TASK-784, 785, 872)

---

## Invariantes operativos para agentes — Identity/Workforce (TASK-784, 785, 872)

> **Relocados de `CLAUDE.md` por TASK-1160 (2026-06-16), verbatim.** Contrato: `GREENHOUSE_IDENTITY_ACCESS_V2.md`, `GREENHOUSE_INTERNAL_IDENTITY_V1.md` + task-specs TASK-784/785/872. Dedup = Slice 4.

### Reingreso, disponibilidad e historia (2026-09-03)

- Un correo/OID nuevo no crea otra persona por sí solo: conserva el principal longitudinal y verifica el vínculo del proveedor sin auto-merge por email.
- Acceso, disponibilidad del member, relación legal, engagement y pago son estados independientes. Recuperar uno no autoriza reabrir los demás.
- La rama PostgreSQL de `updateMember` confirma member, source links canónicos, audit y outbox en una transacción; los mirrors BigQuery son posteriores al commit. No reproducir esa operación mediante un `UPDATE` aislado.
- Un evento `member.updated` no puede reabrir una relación employee terminada ni crear una si existe historia employee/contractor/executive.
- Una salida histórica no debe desactivar un reingreso vigente. La restauración requiere preview, estado esperado, autorización vigente e idempotencia; no reutilizar planes de otra persona ni el SQL retirado.
- Verifica por separado commit, publicación, consumo de proyecciones y datos protegidos. Elegibilidad SSO no demuestra login interactivo.

Contrato: [decisión de recuperación](../GREENHOUSE_WORKFORCE_REENTRY_RECOVERY_DECISION_V1.md) y
[runbook](../../operations/runbooks/workforce-reentry-recovery.md).

### Hiring → Entra workforce provisioning invariants (TASK-1761, ADR Proposed 2026-08-21)

Hasta aceptar `GREENHOUSE_HIRING_ENTRA_WORKFORCE_ACCOUNT_PROVISIONING_DECISION_V1.md`, no ejecutar writes Azure.
Al implementar:

- **NUNCA** usar email personal, UPN, alias o nombre como identity anchor ni criterio de auto-merge. Usar una ancla
  opaca permanente 1:1 con el principal longitudinal; handoff/activation IDs sólo son causation por intento.
- **NUNCA** traducir `Entra accountEnabled=false` a desactivar el principal Greenhouse completo. Candidate,
  preboarding, workforce y Microsoft authentication son lifecycles distintos.
- **NUNCA** tratar `/bulkUpload` `202` como provisioned. Persistir correlation y reconciliar provisioning logs hasta
  terminal; timeout obliga readback antes de retry.
- **NUNCA** agregar al scope SCIM, grupos o licencia antes de confirmar OID y bindearlo bajo CAS/uniqueness al mismo
  `user_id`/`identity_profile_id`/member.
- **NUNCA** habilitar cuenta Microsoft desde selección, handoff o `member.created`. Enablement exige
  `workforce_enabled`, aprobación, capacidad y readback.
- **NUNCA** cerrar sólo el alta. Cancelación pre-start, offboarding y rehire deben disable/revoke/remove access y
  preservar portal/historia; no hard-delete automático.
- **NUNCA** persistir o loggear password, TAP, tokens, certificado, raw bulk payload o provider error.
- **SIEMPRE** probar el roundtrip Entra → SCIM y demostrar cero principal/member/role/evento duplicado.
- **SIEMPRE** usar app/principal dedicado least-privilege y verificar drift de permissions/credentials.

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

---

## Invariantes operativos para agentes — Session access lifecycle + derivación rol→vista (TASK-987/ISSUE-083, TASK-1678/ISSUE-147)

> **Relocados de `CLAUDE.md` por TASK-1160 (2026-06-16), verbatim — cero cambio semántico.** Espejo operativo (NUNCA/SIEMPRE) que un agente carga al tocar este dominio; el contrato técnico vive en su spec. Dedup = TASK-1160 Slice 4.

### Session access derivation must honor role-assignment lifecycle (TASK-987 / ISSUE-083, desde 2026-06-01)

Toda derivación de **acceso de sesión** desde `user_role_assignments` (route_groups, role_codes, y cualquier proyección derivada de roles) **debe** aplicar el **mismo predicado de ciclo de vida**: `ura.active AND (ura.effective_to IS NULL OR ura.effective_to > CURRENT_TIMESTAMP)`. Un rol **revocado/expirado NUNCA confiere acceso** — ni route group, ni vista, ni capability, ni ítem de menú.

**Bug class fuente (over-exposure)**: el view `greenhouse_serving.session_360` agregaba `role_codes` CON el filtro de lifecycle pero `route_groups` SIN él (solo `FILTER (WHERE rg.rg IS NOT NULL)`). Resultado: roles revocados seguían aportando su `roles.route_group_scope`. Una `collaborator` con `efeonce_account` revocado seguía viendo Personas/Comercial; otra collaborator veía Finanzas+HR por 3 roles revocados. 5 usuarios afectados, silencioso por falta de detector. El fallback BQ (`getIdentityAccessRecord`) sí filtraba `ura.active=TRUE AND status='active'` al JOIN — solo el view PG divergía.

**⚠️ Reglas duras**:

- **NUNCA** agregar/derivar un campo de acceso (route_groups, role-derived flags) en un read model o helper sin el predicado de lifecycle idéntico al de `role_codes`. Los dos agregados deben moverse juntos; si uno filtra activo, el otro también.
- **NUNCA** parchear un caso individual de over-exposure ("filtra a Valentina"). El fix es la corrección de la **derivación canónica** + detector de drift; el caso individual es síntoma.
- **NUNCA** restaurar acceso legítimo de un usuario vía hardcode ni dejándolo apoyado en la fuga de un rol revocado. Re-otorgar el **rol ACTIVO canónico** (que carga route_groups + `role_view_assignments` + `role_entitlement_defaults`). Caso fuente: Humberly ("Finance Manager") → re-grant `finance_admin`+`hr_manager` activos, NO hardcode finance/hr.
- **NUNCA** asumir que las superficies de supervisor (Mi equipo/Aprobaciones/Organigrama) dependen de route groups — se gatean por `supervisorAccess` (TASK-727, `canAccessSupervisorPeople = hasDirectReports || hasDelegatedAuthority`), independiente de route groups. El fix de route groups NO las toca.
- **SIEMPRE** que emerja una derivación de acceso desde roles, shippear el **detector de drift** correspondiente. Signal canónico: `identity.session.route_group_drift` (kind=drift, moduleKey=identity, severity=error si >0, steady=0) — cuenta usuarios cuyo `route_groups` ⊋ derivación desde roles activos. Reader: `src/lib/reliability/queries/identity-session-route-group-drift.ts`.
- **SIEMPRE** que cambie el shape de derivación de `session_360`, incluir un DO block de verificación en la migración (aborta si queda fuga) — patrón de la migración `20260601194051024`.

**Open question (gobernanza, no resuelta en TASK-987)**: el mapa TS `ROLE_ROUTE_GROUPS` (`src/lib/tenant/role-route-mapping.ts`) y el DB `greenhouse_core.roles.route_group_scope` difieren en `people` para `efeonce_operations`/`hr_payroll`. El runtime usa el DB (via el view); el TS es fallback. Reconciliar los VALORES del mapping es decisión de gobernanza del operador — NO cambiar unilateralmente.

**Spec canónica**: `docs/tasks/complete/TASK-987-session-route-groups-lifecycle-fix.md` + `docs/issues/resolved/ISSUE-083-session-route-groups-leak-from-revoked-roles.md`. Migración: `migrations/20260601194051024_task-987-session-route-groups-lifecycle-fix.sql`.

> **Ojo con el alcance del predicado (medido 2026-08-09, TASK-1678):** esto aplica a
> `user_role_assignments`. **`greenhouse_core.role_view_assignments` NO tiene columnas de vigencia** —
> 7 columnas, ninguna `active` ni `effective_to`, verificado contra `information_schema`. El predicado
> de lifecycle **no se extrapola** ahí: `ISSUE-147` lo dio por hecho y su defecto #2 partía de una
> premisa falsa. La vigencia de ese carril vive en otro lado (el merge del registry, abajo).

### Derivación de `authorizedViews` — el carril `client` falla hacia cerrado (TASK-1678 / ISSUE-147, desde 2026-08-09)

`resolveAuthorizedViewsForUser` (`src/lib/admin/view-access-store.ts`) tiene **dos defaults**, y la
diferencia es de modelo de negocio: en las superficies internas el acceso lo define la pertenencia
organizacional (sin ese default habría que seedear cientos de filas); en el portal cliente lo define un
contrato comercial, y el gate es el módulo contratado. Los cuatro puntos de abajo se cerraron **juntos**
porque cada uno por separado anulaba a los otros.

- **NUNCA** otorgar por pertenencia al routeGroup cuando `view.routeGroup === CLIENT_ROUTE_GROUP`
  (constante en `src/lib/tenant/role-route-mapping.ts`). Sin fila explícita en `role_view_assignments`,
  una vista `cliente.*` **no se otorga**.
- **NUNCA** degradar el camino `SCHEMA_NOT_READY` entregando el registry completo. Un tenant `client`
  recibe **lista vacía**; un tenant interno conserva su baseline, y esa asimetría es deliberada.
- **NUNCA** dejar que `hasAuthorizedViewCode` / `hasAnyAuthorizedViewCode`
  (`src/lib/tenant/authorization.ts`) otorguen con claim vacío en una sesión cliente. El helper
  `resolveEmptyClaimFallback` discrimina por `tenant.tenantType === 'client'`, **no** por el prefijo del
  viewCode. Ese fallback existía para "todavía no sé, usa el default del caller", pero los layouts
  cliente pasan `routeGroups.includes('client')` —`true` para todo cliente—: **sin cerrarlo, degradar
  hacia cerrado ABRÍA todo**. Es el amplificador que volvía inútil el resto del fix.
- **NUNCA** reponer una vista cliente desde el TS en el merge del registry. `getPersistedViewRegistry`
  filtra `active = TRUE`, así que una vista desactivada en DB caía en "falta" y `toRegistryRows` la
  resucitaba desde `VIEW_REGISTRY`. Desde TASK-1678 el merge **excluye** `routeGroup === 'client'`: ahí
  está la vigencia real de este carril. Para lo interno el merge se conserva (hace visible una vista
  nueva antes de que corra su seed).
- **NUNCA** tomar un `granted=FALSE` de rol como garantía de que nadie con ese rol ve la vista. La
  derivación es una **unión** sobre `roleCodes` (`roleCodes.some(...)`): con dos roles, uno que otorga
  gana. Se decidió mantenerlo así —invertir el operador sólo en esta capa haría que **ganar un rol quite
  acceso**, y rompería la composabilidad de razonar sobre un rol en aislamiento— y el modelo es aditivo
  de punta a punta (`deriveRouteGroupsFromRoles` también une).
- **SIEMPRE** que necesites "esta persona no debe ver esto", usar `greenhouse_core.user_view_overrides`
  con `override_type='revoke'` (per-usuario, con `reason`, con `expires_at`, aplicado al final de la
  derivación). Ese es el carril de veto; el denial de rol no lo es.
- **NUNCA** loggear una degradación de este path con `console.warn`. Va por
  `captureWithDomain(err, 'identity', …)` — en `src/lib/tenant/access.ts` el `catch` silencioso era lo
  que mantenía el bug class invisible.
- **SIEMPRE** acompañar un viewCode `cliente.*` nuevo con su seed en `role_view_assignments` **en el
  mismo PR**. En este carril la telemetría `role_view_fallback_used` **no avisa** (sólo emite cuando el
  fallback otorga): el síntoma es una vista muerta. El detector es la señal
  `identity.view_access.client_role_without_grants` (kind `data_quality`, `moduleKey='identity'`, steady
  0, `>0 → error`; reader `src/lib/reliability/queries/client-role-without-view-grants.ts`), que cuenta
  roles `client_*` sin ninguna vista otorgada. Los roles cliente salen de `greenhouse_core.roles` por
  `tenant_type='client'`, **no** de una lista literal ni de `route_group_scope` (un admin interno puede
  legítimamente incluir `client` en su scope).

> **Delta TASK-1685 (2026-08-10) — alcance de este carril para vistas `cliente.*`:** la visibilidad y
> el acceso de una vista `cliente.*` los responde el **primitive único del portal cliente**
> (`src/lib/client-portal/visibility/`): módulos contratados de la organización + revocaciones
> per-persona (`user_view_overrides` `revoke`, ahora enforceadas también en la puerta). El carril
> rol→vista de esta sección **no gobierna vistas `cliente.*`** — sembrar `granted=TRUE` para una vista
> cliente nueva NO la hace alcanzable; el carril es declararla en el módulo que la vende. El SIEMPRE de
> arriba ("acompañar un viewCode `cliente.*` nuevo con su seed") queda **superseded** para visibilidad:
> las filas de rol de vistas cliente son inertes (append-only, no se borran). Todo lo demás de esta
> sección sigue vigente para el portal **interno**, y el fail-closed de TASK-1678 sigue siendo la
> defensa del claim en sesión cliente. Canon: `ORG_CLIENT_AGENT_INVARIANTS.md` → §`Un solo primitive de
> visibilidad del portal cliente`; señal `identity.client_portal.menu_gate_divergence` (steady 0).

**Spec canónica**: `GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` §8.2 → `Delta TASK-1678`.
Issue: `ISSUE-147`. El guard de página que corre **después** de este carril (llave por organización,
vistas base, `redirect()` fuera del `try`) vive en `ORG_CLIENT_AGENT_INVARIANTS.md` → §`Page guards del
portal cliente`. Los 5 archivos de este carril quedaron declarados en `filesOwned` del módulo `identity`
del `RELIABILITY_REGISTRY` — antes no tenían owner pese a ser el gate de acceso de toda sesión.

---

## Invariantes operativos para agentes — Auth resilience (TASK-742)

### Auth resilience invariants (TASK-742)

7 capas defensivas que protegen el flujo de autenticación. Cualquier cambio que toque NextAuth, secrets de auth, o el flujo de sign-in debe respetar estos invariantes — son los que evitan que una rotación mal hecha o un cambio en Azure App registration vuelva a romper login silenciosamente como en el incidente 2026-04-30.

**⚠️ Reglas duras**:

- **NUNCA** cambiar `signInAudience` de la Azure AD App Registration a `AzureADMyOrg` (single-tenant). Greenhouse es multi-tenant por arquitectura — clientes Globe (Sky, etc.) entran desde sus propios tenants Azure. El valor canónico es **`AzureADMultipleOrgs`** (work/school accounts de cualquier tenant; rechaza personal Microsoft Accounts). El callback `signIn` en `auth.ts` rechaza tenants no provisionados via lookup en `client_users` por `microsoft_oid`/`microsoft_email`/alias — la autorización fina vive en Greenhouse, no en Azure. El 2026-04-30 alguien flipeó esto a `AzureADMyOrg` y rompió SSO para todos los users. `pnpm auth:audit-azure-app` detecta drift en segundos.
- **NUNCA** remover redirect URIs registradas en la Azure App. Las canónicas son `https://greenhouse.efeoncepro.com/api/auth/callback/azure-ad` (production) y `https://dev-greenhouse.efeoncepro.com/api/auth/callback/azure-ad` (staging). El auditor las verifica como dura.
- **NO** llamar `Sentry.captureException(err)` en code paths de auth. Usar siempre `captureWithDomain(err, 'identity', { extra: { provider, stage } })` desde `src/lib/observability/capture.ts`. El subsystem `Identity` rolls up por `domain=identity`.
- **NO** publicar secretos críticos sin pasar por `validateSecretFormat` (`src/lib/secrets/format-validators.ts`). Si agregas un secret crítico nuevo, agrega su rule al catálogo `FORMAT_RULES`. `resolveSecret` rechaza payloads que no pasan validation.
- **NO** rotar un secret en producción manualmente. Usar `pnpm secrets:rotate <gcp-secret-id> --validate-as <ENV_NAME> --vercel-redeploy <project> --health-url <url>`. El playbook hace verify-before-cutover y revert automático si health falla.
- **NUNCA** mutar el JWT/signIn callbacks de NextAuth sin envolverlos en try/catch + `recordAuthAttempt(...)`. NextAuth swallow-ea errores → opaque `?error=Callback`. El wrapping garantiza que la próxima falla emita stage + reason_code estable a `greenhouse_serving.auth_attempts` y a Sentry.
- **NUNCA** computar SSO health en el cliente. La UI de Login lee `/api/auth/health` (contract `auth-readiness.v1`) y oculta/deshabilita botones degradados. Single source of truth.
- **NUNCA** persistir el raw token de un magic-link. Solo `bcrypt(token)` con cost 10. TTL=15min, single-use enforced en consume time. Usar `src/lib/auth/magic-link.ts` — no inventar tokens nuevos.
- **NUNCA** crear un `client_users` row con `auth_mode='both'` sin `password_hash`, ni `auth_mode='microsoft_sso'` sin `microsoft_oid`. La CHECK constraint `client_users_auth_mode_invariant` lo bloquea. Si necesitas estado transicional, usar `auth_mode='sso_pending'` (sin password ni SSO link, ready para link en próximo signIn).
- **NO** depender de `process.env.NEXTAUTH_SECRET` plano en producción si existe `NEXTAUTH_SECRET_SECRET_REF`. El resolver prefiere Secret Manager. Tener ambos crea drift.

**Helpers canónicos**:

- `validateSecretFormat(envName, value)` — Capa 1
- `getCurrentAuthReadiness()` desde `src/lib/auth-secrets.ts` — Capa 2
- `recordAuthAttempt({ provider, stage, outcome, reasonCode, ... })` desde `src/lib/auth/attempt-tracker.ts` — Capa 3
- `requestMagicLink({ email, ip })` / `consumeMagicLink({ tokenId, rawToken, ip })` — Capa 5
- `pnpm secrets:audit` / `pnpm secrets:rotate` — Capa 7

**Observability surfaces**:

- `/api/auth/health` — public read-only readiness
- `greenhouse_serving.auth_attempts` — append-only ledger (90-day retention)
- `greenhouse_sync.smoke_lane_runs` con `lane_key='identity.auth.providers'` — synthetic monitor cada 5min via Cloud Scheduler
- Sentry `domain=identity` — todos los errors de auth

**Spec completa**: `docs/tasks/complete/TASK-742-auth-resilience-7-layers.md`.

> **Reubicado desde `CLAUDE.md` el 2026-07-14 (TASK-1160).** El router estaba a 14 tokens del techo de 35k y no aceptaba ninguna incorporación nueva; este bloque es un invariante de DOMINIO (identity/auth), así que su casa es este companion — no el router, que lo cargaba en cada turno y en cada subagente. Contrato completo: `docs/tasks/complete/TASK-742-auth-resilience-7-layers.md`.

---

## External identity binding (TASK-1631)

> Dominio `src/lib/identity/external-access/**` + schema `greenhouse_core.external_*` (EPIC-044 U04, aplicado
> 2026-09-04). Contrato vigente: `EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md`
> §`Slice 1 binding foundation — applied`; eventos en `GREENHOUSE_EVENT_CATALOG_V1.md` §Identity; señales en
> `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` (delta 2026-09-04).

Es el grafo que decide si una persona autenticada por un IdP externo (o por el emisor propio de Efeonce) puede
operar en nombre de una organización cliente de Account 360 y con qué capabilities. Lo consumen el gateway MCP
(`TASK-1831`) y el auth-server (`TASK-1830`); la UI de administración es una task aparte. Todo lo que sigue
protege tres cosas: que una persona resuelva a UN solo perfil, que la autoridad revocada muera de verdad, y que
ningún secreto ni PII de terceros salga del dominio.

**⚠️ Reglas duras**:

- **NUNCA** escribir `external_identity_environments`, `external_organization_bindings`,
  `external_capability_grants`, `external_member_invitations` ni los `identity_profile_source_links` con
  `source_system LIKE 'external_idp:%'` fuera de los commands canónicos de
  `src/lib/identity/external-access/commands.ts` y sus primitives transaccionales
  `authority-transactions.ts`. Los wrappers de `identity/internal-access/commands.ts` componen ese mismo
  núcleo dentro de SU transacción, con política interna explícita; no constituyen un segundo writer.
  Cada mutación compartida = estado + `external_identity_audit_log` + outbox + versión cuando cambia
  autoridad. El audit interno de enrollment es complementario, nunca sustituto. Contrato TASK-1836:
  `EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md` §Delta de integridad y población.
- **Población persistida e inmutable:** external conserva cliente activo + invitación `linked`; internal
  exige organización propia activa como entidad operativa + enrollment y workforce elegibles. No inferir
  población del issuer/email ni crear invitaciones ficticias. Recuperación/revocación externa no desactiva
  source links internos. La reconciliación es actual, idempotente, con actor/razón y referencia a evidencia
  original; nunca inventa timestamps históricos. Detector `identity.external_binding.unaudited_write`
  steady 0 sobre bindings/grants vigentes con pareja audit/outbox canónica correlacionada.
  `mixed_population` detecta relaciones estructurales incompatibles en todo lifecycle; `internal_population`
  deniega el carril externo sin contaminar unbound. Predicados y precedencia en el ADR interno.
- **NUNCA** resolver la persona por `client_id`/`azp` ni por email en el gateway o en el resolver: la llave
  durable es `(environment_id, subject)` vía el source link activo. `clientId` sólo se registra en el
  resolution log. El email únicamente participa al ACEPTAR una invitación (match exacto y único en
  `identity_profiles.canonical_email`; 0 ⇒ persona nueva `external_contact`; >1 ⇒ `identity_collision`, nunca
  auto-merge).
- **NUNCA** llavear nada por el issuer crudo (`issuer_url`): los links y bindings apuntan al `environment_id`, y
  la rotación de issuer es un UPDATE auditado de la fila del environment (evento `previousIssuerUrl`). Tampoco
  cambiar `issuer_class` de un environment existente (el command responde `conflict`): un environment
  `internal` no se vuelve `external` ni al revés; se crea otro.
- **SIEMPRE** hacer bump de `grants_version` cuando cambia la autoridad efectiva de un binding — grant nuevo,
  revocación de grant, de miembro o de binding. Los commands ya lo hacen; si nace un command nuevo que toque
  grants o membresías, hereda la regla. El gateway compara `grantsVersion` por IGUALDAD contra el claim `gv`
  del token: un cambio sin bump es autoridad vieja que sigue despachando hasta que el token expire. Revocar una
  invitación abierta (`scope='invitation'`) es lo único que NO bumpea, porque todavía no era autoridad.
- **NUNCA** borrar ni actualizar filas de `external_identity_audit_log` ni de
  `external_access_resolution_log` (append-only; los triggers bloquean UPDATE/DELETE en el audit). El
  resolution log guarda SÓLO denegaciones con `subject_hash`; no se poda todavía y no se le agrega `bound`
  aunque el CHECK lo admita (convertirlo en log de aciertos lo hace crecer con cada dispatch).
- **SIEMPRE** correr `pnpm identity:external-access:smoke` (read-only: readers + 4 señales) tras tocar SQL,
  readers, resolver o migraciones del dominio, y `-- --apply` (fixture `ZZZ Q2C Smoke Fixture` + environment
  `smoke-task-1631`) cuando el cambio toca commands o constraints. Los mocks de Vitest ejercitan el TS, no el
  SQL: la migración 1 pasó todos los tests y el CHECK bidireccional sólo lo atrapó el smoke `--apply`. Efecto
  colateral esperado de un apply: `identity.external_binding.unbound_dispatch_attempt` en `warning` 24 h.
- **NUNCA** exponer `token_hash`, el token de invitación, el `subject` ni el email de un tercero en respuestas
  de API, payloads de outbox, evidencia de señales, Sentry ni logs. El token se devuelve UNA vez desde
  `issueExternalInvitation` y no vuelve a existir en claro; el detalle del binding (`GET .../bindings/[id]`)
  lista invitaciones sin `token_hash`; el reader ecosystem responde IDs + `grants[]`, nunca el subject.
- **SIEMPRE** una capability dedicada por command (`identity.external_environment.manage`,
  `identity.external_binding.read` / `.bind`, `identity.external_grant.issue`,
  `identity.external_invitation.issue`, `identity.external_access.revoke`; módulo `organization`, scope
  `tenant`, grant hoy sólo a `efeonce_admin`). **NUNCA** reutilizar una capability existente para gatear un
  command nuevo del dominio ni branchear `roleCodes.includes(...)`: la granularidad es la traza de quién pudo
  dar acceso externo a quién.
- **Membership = invitación `linked` bajo un binding `active`.** No existe otra tabla de membresía externa ni
  se escribe `person_memberships`; quien necesite "los miembros externos de la org" lee las invitaciones
  `linked` (reader canónico), no inventa una proyección. Una persona re-invitada supersede su membership
  anterior (`superseded_by_reinvitation`); nunca hay dos `linked` activas para la misma (binding, persona).
- **Grants per-persona = `profile_id` en `external_capability_grants`.** `NULL` = todos los miembros
  ligados del binding; set = sólo esa persona (exige que ya esté `linked`). **NUNCA** crear una tabla o columna
  paralela para "grants por usuario": la dimensión ya existe y el resolver la une (binding-wide ∪ per-persona).
- **NUNCA** bindear una organización que no sea cliente `active_client` (`organization_type ∈ client|both`,
  `active`, `status='active'`): el command responde `organization_not_eligible` y el reader de elegibilidad
  la lista con `eligible=false` para que el operador vea por qué. No relajar el predicado para "probar":
  usar el fixture del smoke.
- **NUNCA** dar por muerta una sesión externa sólo porque el binding se revocó: la revocación de miembro o
  binding desactiva el source link únicamente si la persona no conserva otra membership activa en el mismo
  environment; el auth-server (`TASK-1830`) lee ese link. Verificar con `resolveExternalAccess` que el outcome
  sea `revoked`, no asumirlo.
- **NUNCA** agregar un `*_ENABLED` en Greenhouse para este dominio sin pasar por el ledger: hoy no hay flag
  propio a propósito — los commands los gatea la capability admin, el reader ecosystem sólo responde a bindings
  `internal` (404 anti-oráculo para el resto) y el uso externo lo gatea `OAUTH_EXTERNAL_ISSUER_ENABLED` del
  gateway (`TASK-1831`).

**Helpers canónicos**: `resolveExternalAccess({ environmentId, subject, clientId? })`
(`resolve-external-access.ts`) · readers en `store.ts` · `ExternalAccessError` + códigos en `errors.ts` (mapean a
`external_access_*` en `canonical-error-response.ts`) · adapter Next en `http.ts` (el único archivo `server-only`
del dominio; el resto lo bundlea `services/auth-server`).

**Observability**: 4 señales `identity.external_binding.*` (`unbound_dispatch_attempt`,
`revoked_still_dispatching`, `subject_collision`, `orphan_grant`) en
`src/lib/reliability/queries/external-identity-binding-signals.ts`, steady 0 · Sentry `domain=identity`
(`captureWithDomain('identity')`) · `external_identity_audit_log` (qué se hizo) + `external_access_resolution_log`
(qué se negó).

## Auth server propio (TASK-1828 / TASK-1829)

> Dominio `services/auth-server/**` + `src/lib/auth-server/{keys,oauth}/**` + schema `greenhouse_auth` (EPIC-044,
> ejecutado 2026-09-04). Contratos: `EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md` (§Decision + §Delta
> 2026-09-04) y, para la superficie OAuth, `EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md` (TASK-1829); runbook
> `docs/operations/runbooks/auth-server.md`; señales en `src/lib/reliability/queries/auth-server-signals.ts`.

Es el emisor de tokens de Efeonce en `https://auth.efeonce.org`: Cloud Run `auth-server` (`us-east4`, un solo
servicio para staging y production; **en producción desde 2026-09-04** por el release `9100bbd2765d`, revisión
`auth-server-00005-pk8`), segundo host del front door del gateway MCP, firma ES256 con la llave
`auth-server-es256` en Cloud KMS HSM y publica el JWKS. Expone `/healthz`, `/readyz` y `/.well-known/jwks.json`
(TASK-1828; `AUTH_SERVER_JWKS_URL` ya declarada en Vercel Production y staging) y, detrás de
`AUTH_SERVER_OAUTH_ENABLED` (default `false`; `TASK-1829` code complete, rollout pendiente: el runtime en producción
sirve la superficie OAuth como 404; environment del emisor `efeonce-auth` registrado en `draft`), la superficie OAuth: metadata RFC 8414/OIDC, CIMD primario + DCR compat, PKCE S256,
access JWT ES256 de 15 min con claim `gv`, refresh rotativo, revocación, introspección y consentimiento persistido.
Personas (`TASK-1830`) y gateway multi-issuer (`TASK-1831`) llegan después. El login del portal no cambia.

**⚠️ Reglas duras**:

- **NUNCA** exportar, copiar ni cachear la llave privada: vive en Cloud KMS con protección HSM y no existe
  fuera del hardware. El servicio sólo llama `asymmetricSign` sobre un digest; `signing_keys.public_jwk` guarda
  la pública sin `d`. Un "backup" de la privada, un secreto en Secret Manager o una llave local "para tests"
  cambian la clase de seguridad del emisor, no su grado.
- **NUNCA** almacenar contraseñas ni construir un password store en este servicio: la autenticación de personas
  será passkeys, magic link y TOTP (`TASK-1830`).
- **NUNCA** firmar un token con una llave que no esté en estado `active` en `greenhouse_auth.signing_keys`:
  `signWithActiveKey` es el único camino de firma; una `retiring` sólo verifica, una `retired` no hace nada.
- **NUNCA** dejar más de una llave `active`: el índice parcial único lo impide en PG y `registerSigningKeyVersion`
  (advisory lock) mueve la anterior a `retiring` en la misma transacción. Si el índice estorba, el bug está en el
  flujo, no en el índice.
- **SIEMPRE** publicar en el JWKS las llaves `active` **y** `retiring` (solapamiento mínimo 1 h, ≥ 4× el TTL
  del token) para que un token firmado justo antes de rotar siga verificando; `retireSigningKey` rechaza el
  retiro anticipado y `--force` sólo en incidente, auditado en `signing_key_events`.
- **NUNCA** compartir `NEXTAUTH_SECRET`, cookies ni sesión del portal con el auth-server, ni aceptar en él una
  cookie de Greenhouse: cookie propia `__Host-`, session store propio, secretos propios, audiencia propia.
- **SIEMPRE** declarar las env vars del servicio en `services/auth-server/deploy.sh` (SoT; `--set-env-vars` es
  destructivo). **NUNCA** `gcloud run services update --update-env-vars` a mano: el próximo deploy lo borra en
  silencio. `AUTH_SERVER_ENABLED` vive en `FEATURE_FLAG_STATE_LEDGER.md`.
- **SIEMPRE** que se toque IAM del deployer: `github-actions-deployer@` necesita `roles/iam.serviceAccountUser`
  sobre `auth-server@` **y** `roles/cloudkms.viewer` sobre la llave — sin el viewer, el preflight de `deploy.sh`
  (`gcloud kms keys describe`) falla con «KMS key not found» aunque la llave exista (run `33870746218`,
  2026-09-04). El SA de runtime conserva sólo `cloudkms.signerVerifier` sobre la llave + `cloudsql.client`; no
  puede crear ni destruir versiones.
- **NUNCA** editar `managed.domains` del certificado del gateway (`mcp.efeonce.org`) para agregar
  `auth.efeonce.org`: re-provisiona el certificado del gateway y lo deja caído. Es un **segundo** certificado
  managed (`efeonce-auth-server-cert`) en el mismo proxy HTTPS; el host se prende/apaga con `enable_auth_host` en
  `efeonce-mcp/infra/terraform`. Cualquier `destroy`/`replace` sobre recursos `gateway` en el plan = abortar.
- **NUNCA** relajar el allowlist de `Host` (`AUTH_SERVER_ALLOWED_HOSTS`): el servicio responde 421 a cualquier
  host que no sea `auth.efeonce.org`; la URL `.run.app` no es una puerta alternativa.
- **NUNCA** cerrar una regresión del JWKS "porque los tests pasan": la verificación válida es un token firmado
  por el HSM verificado con `jose` `createRemoteJWKSet` contra `https://auth.efeonce.org/.well-known/jwks.json`
  y `pnpm auth-server:rotate-key --status` mostrando los mismos `kid` que publica el endpoint.

**⚠️ Reglas duras OAuth (TASK-1829; detalle en `EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md` §10)**:

- **NUNCA** publicar un `issuer` distinto del origen del well-known ni espejar un issuer ajeno.
- **NUNCA** aceptar `code_challenge_method` distinto de `S256`; no existe camino para `plain`.
- **NUNCA** redirigir con un `client_id` o `redirect_uri` no validados (antes de cualquier redirect); `localhost`
  por nombre sólo como alias de loopback de clientes **públicos** (puerto libre, path exacto), nunca para
  hospedados/confidenciales (HTTPS exacto); nunca wildcards.
- **NUNCA** emitir un access token sin fila `active` en `client_consents` para **cada** scope ni sin membership
  `bound` en `external_organization_bindings` (`gv = max(grantsVersion)` re-resuelto en cada emisión; sin `bound`
  ⇒ `access_denied`, fail-closed); un scope de escritura exige además `authLevel = step_up`.
- **NUNCA** consumir un code ni rotar un refresh fuera del `SELECT … FOR UPDATE` del store
  (`src/lib/auth-server/oauth/store/**`): code de un solo uso, refresh rotado en cada uso; el reuso revoca la
  familia completa (`grant_id`) y emite señal. **NUNCA** `DELETE`/`UPDATE` manual sobre codes, tokens o consents:
  `revokeClientConsent` / `revoke` son el único camino.
- **NUNCA** persistir ni loggear tokens, codes, `code_verifier`, secrets, IP, UA o `sub` en claro (sólo hashes);
  `oauth_audit_events` es append-only (trigger) y el rate limit cuenta sobre ella, sin tabla extra.
- **NUNCA** resolver un cliente CIMD sin el guard anti-SSRF (DNS resuelto, rangos privados rechazados, sin
  redirects, 3 s, 64 KB) ni cachear un documento más de 24 h.
- **NUNCA** registrar un cliente confidencial fuera de `registerConfidentialClient` (consumers: `POST
  /api/admin/auth-server/oauth-clients` con `identity.auth_client.register` y `pnpm auth-server:register-client`);
  DCR sólo registra públicos.
- **NUNCA** hacer que el gateway dependa de `/oauth/introspect` para autorizar: JWT + JWKS + recheck de `gv`.
- **NUNCA** prender `AUTH_SERVER_OAUTH_ENABLED` sin la fila `active` del emisor en
  `greenhouse_core.external_identity_environments` (`efeonce-auth`, `https://auth.efeonce.org`, `external`) ni sin
  validar la metadata; **NUNCA** emitir un code para una persona que este emisor no autenticó (hasta TASK-1830
  `authorize` responde `login_required`).
- **Environment del emisor — sólo por command.** La fila `efeonce-auth` **ya existe en `draft`** (registrada el
  2026-09-04 por `pnpm auth-server:register-issuer-environment`, que llama al command canónico de TASK-1631
  `upsertExternalIdentityEnvironment`: tx + audit + outbox). **NUNCA** crearla, editarla ni activarla con SQL;
  **NUNCA** cambiar `issuerClass` después de creada (es inmutable: el issuer es `https://auth.efeonce.org` exacto);
  se pasa a `active` con `--status active` en el mismo momento en que se prende el flag OAuth en staging. Mientras
  esté en `draft`, el resolver responde `environment_inactive` (verificado en producción por el lane ecosystem
  `GET /api/platform/ecosystem/identity/binding?environment=efeonce-auth&subject=…` → 200 `environment_inactive`):
  es fail-closed por diseño, no un bug.
- **SIEMPRE** que se agregue un scope al gateway, agregarlo a `scopes.ts` (test de paridad con
  `efeonce-mcp/src/config.ts`) y a la copia es-CL de `src/lib/copy/auth-server.ts`. **NUNCA** editar
  `pages/efeonce-isotipo.generated.ts` a mano (`pnpm auth-server:brand-assets:generate`).

**Helpers canónicos**: `src/lib/auth-server/keys/index.ts` (`signWithActiveKey`, `registerSigningKeyVersion`,
`retireSigningKey`, adapter KMS) · `src/lib/auth-server/oauth/**` (`registerConfidentialClient`,
`grantClientConsent`, `revokeClientConsent`, store atómico, `cimd.ts`, `scopes.ts`) · CLIs
`pnpm auth-server:rotate-key`, `pnpm auth-server:register-client`, `pnpm auth-server:oauth-store:smoke`,
`pnpm auth-server:register-issuer-environment` (todos con `.env.local` + proxy PG) y
`pnpm auth-server:brand-assets:generate` · señales `auth.issuer.jwks_unreachable` (`runtime`; reader en Vercel,
`AUTH_SERVER_JWKS_URL` presente en Production y staging desde 2026-09-04), `auth.signing_keys.lifecycle` (`data_quality`) y
`auth.oauth.{code_reuse_detected,refresh_reuse_detected,cimd_rejected}` (`incident`, 24 h, steady 0) · Sentry
`captureWithDomain('identity')` con tag `component=auth-server` (`check=kms` reemplaza al contador
`auth.kms.sign_failures`).

## Autenticación de personas externas del emisor (TASK-1830)

**Contexto.** `auth.efeonce.org` autentica personas EXTERNAS sin contraseñas: passkeys (método
primario), magic link por Resend (alternativa), TOTP (step-up para escritura) y recuperación por
re-invitación auditada. Vive en `src/lib/auth-server/persons/**`, detrás de
`AUTH_SERVER_PERSON_AUTH_ENABLED` (default `false` ⇒ toda la superficie responde **404**, no 403:
un 403 confirma que la ruta existe). Ocho tablas en `greenhouse_auth`: `sessions`,
`magic_link_tokens`, `auth_rate_limits`, `person_auth_attempts`, `passkey_credentials`,
`passkey_challenges`, `totp_enrollments`, `totp_backup_codes`. Gate contra PG real:
`pnpm auth-server:person-auth:smoke`.

**No hay password store y no debe haberlo.** La clase de ataque más frecuente contra un servicio de
auth público —credential stuffing, phishing de contraseña, reset abusable— desaparece por diseño.
Un flujo de recuperación self-service reintroduce exactamente esa puerta.

### Reglas duras

1. **NUNCA** escribir fuera de `greenhouse_auth` desde `src/lib/auth-server/**`. La única escritura
   legítima en `greenhouse_core` —ligar la persona— se delega al command `acceptExternalInvitation`
   de `TASK-1631`, que la ejecuta en su propia transacción con audit y outbox. El guard
   `src/lib/auth-server/boundary-domain.test.ts` escanea el SQL literal del dominio.
2. **NUNCA** mandar los intentos de persona a `greenhouse_serving.auth_attempts` (ledger TASK-742).
   Ese ledger es del PORTAL y no admite este runtime sin romperlo: `provider` y `stage` tienen CHECK
   cerrados de NextAuth (sin passkey ni TOTP), `user_id_resolved` pertenece al espacio de
   `client_users` y su GRANT de INSERT es sólo para `greenhouse_runtime`, mientras el emisor conecta
   como `greenhouse_app`. El ledger del emisor es `greenhouse_auth.person_auth_attempts`,
   append-only por trigger, con `subject_hash` indexado (el de `oauth_audit_events` no lo está, así
   que un bloqueo progresivo por sujeto allí sería un scan).
3. **NUNCA** hashear un bearer del emisor con bcrypt. Todos —magic link, códigos de respaldo— usan
   `sha256Hex` + `safeEquals`, igual que codes/refresh/access. Sobre 256 bits de entropía un KDF
   lento no agrega resistencia y sí agrega 300-800 ms de CPU de un solo hilo en un endpoint NO
   autenticado: es un amplificador de DoS en la puerta de entrada. El shim de `bcryptjs` del
   Dockerfile del auth-server **se queda**. Corolario: un código de respaldo se hace LARGO
   (~127 bits) para no necesitar KDF, no corto y luego protegido con uno.
4. **NUNCA** guardar el secreto TOTP sin cifrar. Es la única excepción al punto anterior porque es
   simétrico: el servidor debe poder leerlo. Va cifrado con la llave KMS **simétrica**
   `auth-server-totp-envelope` (HSM, `ENCRYPT_DECRYPT`, rotación 90 d) y AAD
   `<environment>|<subject>` — un ciphertext movido a la fila de otra persona NO descifra.
   `auth-server-es256` es EC de firma y **no puede cifrar**; nunca intentes usarla para esto.
5. **NUNCA** derivar `amr` de lo que declare el cliente. `uv` sale del flag REAL de la aserción
   WebAuthn y `totp` de una verificación real. `authLevel = 'step_up'` exige factor fuerte **y**
   reciente (< 10 min): en el lane ecosystem el actor es la máquina, así que este es el único gate
   de toda la cadena que depende de QUIÉN es la persona. No existe «recordar este dispositivo».
6. **NUNCA** dejar que la respuesta de pedir un magic link distinga si el correo existe: mismo
   cuerpo, mismo código, mismos encabezados **y mismo tiempo** (hay un piso de latencia deliberado,
   y el despacho del correo no se espera). El cuerpo idéntico sin el piso no cierra nada: el camino
   "existe" hace INSERT y despacha correo.
7. **NUNCA** consumir un magic link por GET. Los escáneres de correo abren los enlaces y quemarían
   el acceso antes de que la persona llegue: el GET pinta una página intermedia y el consumo es POST
   con verificación de `rowCount === 1` dentro de transacción.
8. **NUNCA** pedir `allowCredentials` con el correo antes de autenticar por passkey: sería el
   oráculo de existencia que la regla 6 evita. Se usan credenciales descubribles.
9. **NUNCA** verificar una aserción WebAuthn pasándole a la librería el contador almacenado.
   `verifyAuthenticationResponse` LANZA cuando el contador retrocede, y entonces la regresión llega
   como un "no verificó" cualquiera: la credencial clonada se queda VIVA y la señal no se dispara.
   Se le pasa `counter: 0` (omite sólo ese chequeo) y la política del contador se aplica sobre datos
   YA verificados — revocar antes de verificar la firma sería un botón de denegación de servicio
   para quien conozca un `credential_id`. Un contador que se queda en 0 **no** es regresión.
10. **NUNCA** construir self-service de reset. Recuperar es re-invitar
    (`issueExternalInvitation` con `reissue`); al aceptar, `acceptExternalInvitation` desactiva los
    subjects anteriores del mismo perfil y environment —su `deactivateOrphanSourceLinks` NO cubre
    esto, porque su condición es por perfil y tras una re-invitación siempre queda una membership
    linked— y el emisor revoca sesión, passkeys y TOTP de esos subjects. Las dos mitades juntas:
    sin la primera el passkey viejo abre sesión nueva; sin la segunda la sesión viva sobrevive
    hasta su próximo request.
11. **SIEMPRE** ligar la sesión a un source link ACTIVO resuelto en la MISMA consulta
    (`getSessionWithLink`): resolverlos por separado abre una ventana donde la sesión sobrevive a la
    revocación. Cuando el link murió, la sesión se revoca en el request que lo detecta, no se
    responde 401 y se deja viva. Señal `auth.person.session_without_link`, steady 0.
12. **SIEMPRE** que se agregue una tabla al dominio, declararla en el allowlist de
    `boundary-domain.test.ts` en el mismo PR, y ejercitar su SQL en el smoke: los tests con mocks
    ejercitan el TS, nunca el SQL (CHECK, `ON CONFLICT`, triggers, `BYTEA`, `BIGINT`).
13. **NUNCA** dar por montado un secreto en un runtime nuevo porque se declaró su `*_SECRET_REF`.
    Declarar la referencia —y hasta conceder el binding IAM con `ensure_secret_accessor_binding`— sólo
    autoriza a leer algo que nadie está leyendo. Si el consumidor resuelve el secreto de forma
    **SÍNCRONA**, hay que **MONTARLO** con `--update-secrets`. Caso fuente (commit `38fbfaeeb`,
    2026-09-05): `services/auth-server/deploy.sh` declaraba `RESEND_API_KEY_SECRET_REF` como env var y
    concedía el binding, pero nunca montaba `RESEND_API_KEY`; el correo del magic link moría en
    producción con `RESEND_API_KEY is not configured` y la fila de
    `greenhouse_notifications.email_deliveries` quedaba en `status=failed`. La razón exacta: `sendEmail`
    (`src/lib/email/delivery.ts:898`) usa el cliente **síncrono** `getResendClient()`, que lee una
    resolución CACHEADA que sólo puebla el resolvedor **asíncrono** `getResendClientAsync`, y en el
    auth-server nadie precalienta el async. El `ops-worker` funciona porque SÍ lo monta
    (`services/ops-worker/deploy.sh:1004`). Al portar a un runtime nuevo cualquier capacidad compartida
    (correo, storage, providers), **SIEMPRE** verificar cómo RESUELVE el secreto el consumidor, no cómo
    lo declara el deploy.
14. **SIEMPRE** verificar por FUERA el efecto de una superficie cuya respuesta es deliberadamente
    indistinguible. `POST /auth/magic-link/request` responde 202 idéntico exista o no el correo (regla
    6): por diseño renunció a reportar su propio resultado, así que un correo muerto **no lo reporta
    nadie** — la persona lee «te enviamos un enlace» y el acceso queda muerto en silencio. Es la misma
    clase que `GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED`, donde la success card prometía un correo que el
    flag apagado nunca despachaba. La evidencia es el efecto real —la fila de `email_deliveries` en
    `sent`—, **NUNCA** el 202.
15. **NUNCA** declarar activada la superficie de personas con un canary compuesto sólo de casos
    negativos y anónimos. Metadata, 401s y códigos inválidos no tocan el carril autenticado: la
    activación de 2026-09-05 pasó **9/9 canaries públicos con el correo del magic link roto**. El gate
    real es `pnpm auth-server:person-auth:canary`, que exige una persona y ejercita el contrato HTTP
    contra el host DESPLEGADO — distinto de `pnpm auth-server:person-auth:smoke`, que ejercita el SQL
    contra PG real; los dos hacen falta y ninguno sustituye al otro. **`exit 2` = INCOMPLETO**: un
    canary con pasos omitidos no es verde, es una medición que no se hizo.
16. **NUNCA** dar por probado un detector que sólo se vio en `ok`. Verlo apagado no distingue «no hay
    nada que detectar» de «no detecta». Por eso el canary revoca el source link A PROPÓSITO y comprueba
    que `auth.person.session_without_link` pasa de `ok` a `error` (y que la sesión se revoca en el
    request que lo detecta, regla 11): un detector está probado cuando se lo ve **ENCENDERSE**.
17. **Hueco conocido, NO resuelto:** `POST /auth/passkeys/authenticate/start` es anónimo y sin límite de
    tasa, y cada llamada inserta una fila en `greenhouse_auth.passkey_challenges` sin recolección. Es
    crecimiento no acotado disparable por un tercero anónimo. El GC (`pnpm auth:gc`) se está
    construyendo aparte; hasta que exista y quede agendado, **NUNCA** registrar este endpoint como
    cubierto por el anti-abuso de `auth_rate_limits`.

## Sesión corporativa y autoridad nativa (TASK-1836 / TASK-1831)

Canon: [autoridad interna](../EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md) y
[contrato OAuth](../EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md).

- OIDC corporativo, sesión Efeonce ID y autorización MCP son fronteras distintas. Tenant + OID firmados
  resuelven enrollment; no auto-merge por email, invitación externa ficticia ni cookie Greenhouse compartida.
- `SubjectSessionPort.resolve` conserva procedencia. Población/binding/contexto verificables gobiernan
  consentimiento y token; `authorizationContextId` fija el contexto y `gv` su versión, nunca un máximo
  entre organizaciones. Un reader externo no sirve de fallback para un binding interno.
- Refresh conserva identidad, contexto y `auth_time`; claims upstream de MFA no acreditan step-up local.
  No imponer `auth_time <= iat` ni relajar `exp`: el callback valida frescura firmada frente a presente y
  transacción, además de issuer/audiencia/firma/nonce/PKCE y consumo único.
- El reader interno consulta autoridad y ledger por `jti` firmado antes de dispatch; revocar familia/token
  no debe permitir uso hasta expiración ni revocar otra familia por compartir contexto. No caché positiva
  de permisos en esta cohorte. JWKS y permisos tienen cachés/contratos diferentes.
- `/login` directo y OAuth con retorno requieren pruebas distintas. Sólo retorno ausente selecciona el
  landing fijo `/auth/session`; validar al inicio y callback, sin inventar contexto o token MCP. HTML/JSON
  de sesión comparten resolver y revocación. Conservar botón/primitives existentes.
- Publicar UI, activar flags, completar SSO y emitir/usar/revocar un token son evidencias distintas. Leer
  runtime y medir deny con token vigente; preservar expiración/cohorte original al restaurar un canary.
  Runbook: [rollout interno](../../operations/EFEONCE_INTERNAL_AUTH_ROLLOUT_RUNBOOK_V1.md).
