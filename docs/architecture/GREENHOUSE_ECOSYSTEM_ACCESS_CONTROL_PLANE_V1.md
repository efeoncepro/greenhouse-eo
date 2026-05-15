# Greenhouse Ecosystem Access Control Plane V1

> **Tipo de documento**: Spec de arquitectura canónica (ADR + spec V1)
> **Version**: 1.0
> **Creado**: 2026-05-15 por arch-architect (Greenhouse overlay)
> **Ultima actualizacion**: 2026-05-15
> **Status**: accepted
> **Owner**: Plataforma / Identity & Access
> **Domain boundary**: `platform` + `identity` (cross-ecosistema)
> **Contrato marco**: `GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
> **Docs relacionados**:
> - `GREENHOUSE_IDENTITY_ACCESS_V2.md`
> - `GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
> - `GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`
> - `GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`
> - `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
> - `GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
> - `GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`
> - `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`

---

## 1. Executive summary

Greenhouse posee el **estado deseado** del acceso al ecosistema Efeonce (colaboradores Efeonce y client users hacia Kortex, Verk, sitio público y futuras plataformas). Las plataformas hermanas conservan su **estado aplicado** local: pueden crear, modificar o revocar accesos en su propio runtime, pero deben converger al estado deseado de Greenhouse o reportar drift explícito.

Tres estados ortogonales (`desired` / `observed` / `applied`) + cuatro modos de plataforma (`greenhouse_managed`, `hybrid_approval`, `platform_managed_observed`, `read_only_observed`) + un lifecycle de drift (7 tipos) cierran el contrato sin compartir Cloud SQL, secrets ni runtime entre apps. Cada plataforma elige su modo en el binding; el modo determina qué puede hacer Greenhouse (push grants, sólo aprobar, sólo observar) y qué severity tiene cada tipo de drift.

**4-pillar score**: Safety (defense-in-depth 7 capas, capabilities granulares least-privilege, approval gates para sensitive grants) · Robustness (state machine + CHECK + audit trio, idempotency por `(subject, platform, capability, scope)`, atomic tx PG + outbox v1) · Resilience (reliability signals por failure-mode, dead-letter explícito, snapshot stale detection, audit append-only) · Scalability (writes O(1) per assignment, drift detection O(n) per snapshot run con index coverage, async dispatch fuera del request path).

> **Doctrina central**: Greenhouse owns ecosystem **desired** access state. Sister platforms may own local provisioning mechanics, but must converge to Greenhouse-approved access state or report explicit drift.

---

## 2. Use cases

### 2.1 Asignar a un colaborador interno a Kortex y Verk durante onboarding

Operador HR/Admin asigna desde `/admin/ecosystem-access`: María Pérez (member Efeonce) recibe `kortex.operator_console.access` (scope `internal`) + `verk.workspace.access` (scope `internal`). Greenhouse emite commands de provisioning a Kortex y Verk; ambas plataformas aplican y reportan back. Convergencia en < 5 min.

### 2.2 Dar acceso a un cliente Globe a su workspace en Kortex (CRM intelligence)

Operador Account Manager asigna desde `/admin/ecosystem-access`: Cliente Sky (organization Greenhouse) recibe `kortex.crm_intelligence.read` (scope `client`, scopeId = clientId Sky). El assignment requiere approval (capability marked `requires_approval=true`). Tras segunda firma, command emitido, Kortex aplica.

### 2.3 Kortex crea un usuario localmente para troubleshooting (sin pasar por Greenhouse)

Operador Kortex crea localmente un acceso temporal. En el siguiente snapshot diario, Kortex reporta el usuario nuevo. Greenhouse detecta `unauthorized_local_access` (modo `hybrid_approval`) → drift aparece en queue → operador Greenhouse aprueba retroactivamente (materializa assignment) o rechaza (Greenhouse pide a Kortex que revoque). Loop cerrado.

### 2.4 Off-boarding masivo

Colaborador es marcado inactivo en Greenhouse. Cron rolling revisa assignments activos con `member.active=false` → marca todos `desired_status='revoked'` + emite commands de deprovisioning a cada plataforma con assignment. Drift `pending_deprovisioning` lo confirma hasta que cada plataforma aplique.

### 2.5 Verk en pre-producción

Verk registrado como plataforma en modo `read_only_observed`. Operadores ven plataforma en `/admin/ecosystem-access` pero todos los CTAs de asignación están deshabilitados con tooltip "Verk no acepta provisioning aún". Solo se acepta observed snapshot manual. Cuando Verk pase a `hybrid_approval`, los CTAs se habilitan.

### 2.6 Sitio público con acceso de CMS

Editor de contenido (member Efeonce) recibe `public_website.cms.publish` (scope `internal`). Sitio público en modo `platform_managed_observed` V1: Greenhouse declara el desired state pero no empuja commands (sitio gestiona via su propio admin); drift `pending_provisioning` queda como warning hasta que el sitio reporte applied o se promueva a `greenhouse_managed`.

---

## 3. Model

### 3.1 Personas y subjects

Heredado de `GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`. Toda asignación de acceso ecosistema usa **`identity_profile_id` como raíz humana** y opcionalmente persiste `member_id` y/o `user_id` cuando aplica.

| Subject type | Raíz humana | `member_id` | `user_id` | Caso típico |
|---|---|---|---|---|
| `internal_collaborator` | `identity_profile` | NOT NULL | nullable | Colaborador Efeonce accede a Kortex/Verk |
| `client_user` | `identity_profile` | nullable | NOT NULL | Cliente Globe accede a su workspace en Kortex |
| `service_account` | `null` (no humano) | NULL | NULL | Bot/agent automatizado con su propio token |
| `external_partner` (V2) | `identity_profile` opt-in | NULL | nullable | Freelancer/agencia externa con acceso temporal |

**Regla dura**: nunca crear identidad paralela. Si una persona no tiene `identity_profile`, primero se crea/resuelve via TASK-784 (Person Legal Profile) o TASK-872 (SCIM intake). El assignment se rechaza con error `identity_profile_missing` antes de tocar la DB.

### 3.2 Estados ortogonales (CQRS-lite + reconciliation)

Tres tablas/estados independientes. Cada uno tiene un owner único y un canal de mutación.

| Estado | Owner del write | Source of truth para | Tabla canónica (TASK) |
|---|---|---|---|
| **`desired`** | Greenhouse (operador) | Qué queremos que pase | `ecosystem_access_assignments` (TASK-886) |
| **`observed`** | Sister platform (snapshot inbound) | Qué reporta la plataforma que tiene | `ecosystem_access_observed_rows` (TASK-887) |
| **`applied`** | Sister platform (ack outbound) | Resultado confirmado de un command | `ecosystem_provisioning_command_results` (TASK-888) |

**Drift** = función `compare(desired, observed)`. NO se persiste como estado primario; se deriva en `ecosystem_access_drift` con TTL hasta resolución (drift cerrado se mueve a tabla histórica append-only).

**`applied` no autoriza por sí mismo**: si la sister platform reporta `applied=true` pero no hay `desired=active`, el drift correspondiente es `unauthorized_local_access` (severity depende del modo). Lo mismo si reporta `applied=true` pero después un snapshot dice `observed=missing` → drift `pending_deprovisioning` (la plataforma perdió consistencia local).

### 3.3 Platform modes (binding-level)

Cada `sister_platform_bindings` row declara un `provisioning_mode`. El modo gobierna qué puede hacer Greenhouse y cómo se interpreta el drift.

| Mode | Greenhouse push commands? | Drift `unauthorized_local_access` severity | Drift `pending_provisioning` severity | UI permite revoke? |
|---|---|---|---|---|
| `greenhouse_managed` | ✓ siempre | error | error >24h | ✓ |
| `hybrid_approval` | ✓ tras approval | warning (requiere decisión humana) | warning >24h | ✓ tras approval |
| `platform_managed_observed` | ✗ | info (informativo) | warning >7d (sólo signal, sin acción auto) | ✗ |
| `read_only_observed` | ✗ | info | info | ✗ (UI hide CTAs) |

**Modo es por binding, NO por plataforma global**: una plataforma puede estar en `greenhouse_managed` para scope `internal` (colaboradores Efeonce) y `hybrid_approval` para scope `client` (clientes Globe). El binding `(platform, scope)` define el modo.

**Default por scope canónico**:

- `internal` → `greenhouse_managed` (operadores Efeonce no deberían crearse fuera del control plane)
- `organization` / `client` → `hybrid_approval` (ventas/Kortex puede onboardear clientes localmente; Greenhouse aprueba)
- `space` → `hybrid_approval` (mismo razonamiento)
- `platform_workspace` / `platform_installation` → `platform_managed_observed` (la plataforma sabe mejor)

Estos defaults son hint editorial; el binding final lo decide el operador.

### 3.4 Schema (high level — DDL detallado en TASKs hijas)

```text
greenhouse_core.ecosystem_platforms          [TASK-885]
  - platform_key             text PK         ('greenhouse' | 'kortex' | 'verk' | 'public_website' | ...)
  - display_name             text
  - status                   text            (draft | active | suspended | deprecated)
  - default_provisioning_mode text           (greenhouse_managed | hybrid_approval | platform_managed_observed | read_only_observed)
  - owner_label              text            (humano que opera)
  - homepage_url             text nullable
  - admin_url                text nullable   (URL para deep link a admin de la plataforma)
  - metadata_json            jsonb
  - lifecycle timestamps     (activated_at, suspended_at, deprecated_at)

greenhouse_core.ecosystem_platform_capabilities [TASK-885]
  - capability_key           text PK         ('kortex.crm_intelligence.read' | ...)
  - platform_key             text FK
  - display_label            text
  - description              text
  - allowed_subject_types    text[]          (internal_collaborator | client_user | service_account | external_partner)
  - allowed_scope_types      text[]          (internal | organization | client | space | platform_workspace | platform_installation)
  - allowed_actions          text[]          ('read' | 'manage' | 'publish' | ...)
  - requires_approval        boolean default false   (sensitive grants → segunda firma)
  - deprecated_at            timestamptz nullable
  - lifecycle timestamps

greenhouse_core.ecosystem_access_assignments [TASK-886]                ← DESIRED STATE
  - assignment_id            uuid PK
  - identity_profile_id      uuid FK
  - subject_type             text            (internal_collaborator | client_user | service_account | external_partner)
  - member_id                uuid FK nullable
  - user_id                  uuid FK nullable
  - platform_key             text FK
  - capability_key           text FK
  - action                   text            (read | manage | ...)
  - scope_type               text
  - scope_id                 text nullable
  - binding_id               uuid FK         (sister_platform_bindings — anchors scope resolution)
  - desired_status           text            (active | suspended | revoked)
  - approval_status          text            (approved | pending_approval | rejected)
  - granted_by_user_id       uuid FK
  - approved_by_user_id      uuid FK nullable
  - reason                   text            (>= 10 chars, auditable)
  - effective_from           timestamptz
  - effective_to             timestamptz nullable
  - metadata_json            jsonb
  - lifecycle timestamps + idempotency_key (SHA256 of subject+platform+capability+scope+action)

  - UNIQUE PARTIAL INDEX active per (identity_profile_id, platform_key, capability_key, action, scope_type, scope_id)
    WHERE desired_status='active' AND approval_status='approved'

greenhouse_core.ecosystem_access_audit_log    [TASK-886]               ← append-only
  - audit_id, assignment_id FK, action, actor_user_id, actor_label, before_json, after_json, reason, recorded_at
  - anti-UPDATE/DELETE triggers

greenhouse_core.ecosystem_access_observed_snapshots [TASK-887]
  - snapshot_id, platform_key, binding_id, consumer_id, started_at, completed_at, status, rows_count, source ('inbound_push' | 'outbound_pull')

greenhouse_core.ecosystem_access_observed_rows [TASK-887]              ← OBSERVED STATE
  - observed_row_id, snapshot_id FK, platform_user_external_id, observed_email, observed_capability_key, observed_action,
    observed_scope_type, observed_scope_external_id, resolved_identity_profile_id nullable, resolution_status

greenhouse_core.ecosystem_access_drift [TASK-887]
  - drift_id, drift_type (7 tipos enumerados §4.4), assignment_id FK nullable, observed_row_id FK nullable,
    platform_key, severity (info | warning | error), status (open | acknowledged | resolved | dismissed),
    detected_at, resolved_at, resolution_action

greenhouse_sync.ecosystem_provisioning_commands [TASK-888]             ← APPLIED STATE
  - command_id, assignment_id FK, command_kind (provision | deprovision | update),
    state (queued | dispatching | dispatched | applied | failed | dead_letter | cancelled),
    idempotency_key, dispatch_attempts, last_dispatched_at, applied_at, failure_reason

greenhouse_sync.ecosystem_provisioning_command_results [TASK-888]
  - result_id, command_id FK, status (applied | failed), platform_user_external_id, applied_capabilities[], applied_at, error_code, error_message
```

### 3.5 Capability surface (Greenhouse-internal entitlements)

Capabilities para gobernar el control plane. Granulares, least-privilege.

| Capability | Action | Scope | Allowed audience |
|---|---|---|---|
| `ecosystem.access.platform.read` | read | tenant | route_group=admin |
| `ecosystem.access.platform.manage` | manage | all | EFEONCE_ADMIN only |
| `ecosystem.access.capability_catalog.manage` | manage | all | EFEONCE_ADMIN only |
| `ecosystem.access.assignment.read` | read | tenant | route_group=admin / FINANCE_ADMIN / HR |
| `ecosystem.access.assignment.grant` | create | tenant | EFEONCE_ADMIN / DEVOPS_OPERATOR / HR (scoped) |
| `ecosystem.access.assignment.revoke` | delete | tenant | EFEONCE_ADMIN / HR |
| `ecosystem.access.assignment.suspend` | update | tenant | EFEONCE_ADMIN / HR / DEVOPS_OPERATOR |
| `ecosystem.access.assignment.approve` | approve | tenant | EFEONCE_ADMIN only (second-firmer) |
| `ecosystem.access.drift.read` | read | tenant | route_group=admin |
| `ecosystem.access.drift.resolve` | approve | tenant | EFEONCE_ADMIN / DEVOPS_OPERATOR |
| `ecosystem.access.provisioning.dispatch_override` | bypass_preflight | all | EFEONCE_ADMIN only (break-glass) |

Estas capabilities **NO se mezclan** con el catálogo `ecosystem_platform_capabilities` (TASK-885). Una es "qué puede hacer un operador Greenhouse dentro del control plane" (capabilities internas) y la otra es "qué capabilities tiene Kortex/Verk para asignar" (catálogo plataforma).

---

## 4. Lifecycle

### 4.1 Assignment lifecycle (desired_status)

```text
                              ┌──────────────────────┐
                              │  pending_approval    │ ──────► rejected
                              │  (sensitive caps)    │
                              └─────────┬────────────┘
                                        │ approve
                                        ▼
   ┌─────────┐   grant    ┌─────────┐           ┌──────────┐
   │   ―     │ ──────────►│ active  │ ────────►│ suspended │
   └─────────┘            └────┬────┘  suspend │           │
                               │               └─────┬─────┘
                               │ revoke              │ resume
                               │                     │
                               ▼                     ▼
                          ┌─────────┐           ┌─────────┐
                          │ revoked │           │ active  │
                          └─────────┘           └─────────┘
```

- `pending_approval → active`: requires capability `ecosystem.access.assignment.approve` + actor distinto del grantor (segunda firma).
- `pending_approval → rejected`: terminal.
- `active ↔ suspended`: reversible, preserva idempotency key.
- `active → revoked`: terminal. Emite `deprovisioning_requested v1` y espera applied.
- CHECK constraint en DB enforce transition matrix; trigger anti-zombie marca assignments `active` con `effective_to < NOW()` como `suspended` automáticamente.

### 4.2 Provisioning command lifecycle (applied_state)

```text
   queued ──► dispatching ──► dispatched ──► applied
       │           │              │            │
       │           │              ▼            │
       │           │           failed ──────► (retry exp backoff, max 5)
       │           │              │
       │           │              ▼
       │           │          dead_letter
       │           ▼
       └────► cancelled (when assignment revoked before dispatch)
```

Idempotency key: SHA256(`assignment_id` || `command_kind` || `effective_from`). El mismo command se dispatchéa N veces sin doble efecto en la plataforma destino (que también valida por idempotency_key en su receive endpoint).

### 4.3 Drift lifecycle

```text
   detected ──► open ──► acknowledged ──► resolved | dismissed
                  │
                  └──► (auto-resolve si desired/observed convergen en próximo snapshot)
```

Drift es derivado, no autoritativo. La fuente sigue siendo `desired_state` + último `observed_snapshot` aplicable. Tabla `ecosystem_access_drift` actúa como **queue operacional**, no como state-of-truth.

### 4.4 Drift types canónicos (7)

| Drift type | Trigger | Severity por modo (gh-managed / hybrid / platform / read-only) | Acción Greenhouse |
|---|---|---|---|
| `pending_provisioning` | `desired=active` + `observed=missing` + edad > 24h | error / warning / warning / info | Reintentar dispatch; si dead-letter, alerta operador |
| `pending_deprovisioning` | `desired=revoked` + `observed=active` + edad > 24h | error / warning / warning / info | Reintentar deprovisioning command |
| `unauthorized_local_access` | `observed=active` + `desired=null` | error / warning / info / info | UI queue para aprobar retroactivo o pedir revoke |
| `missing_identity_link` | `observed.identity_profile_id=NULL` (resolver fallido) | error / error / error / error | Operador linkea manualmente via Person Identity TASK-784 |
| `scope_mismatch` | `observed.scope_id != desired.scope_id` para mismo subject+capability | error / warning / warning / info | UI propone actualizar desired o pedir migración |
| `capability_mismatch` | Mismo subject, capability distinta a desired | error / warning / warning / info | UI propone actualizar desired o pedir revoke local |
| `platform_apply_failed` | Command en `failed` o `dead_letter` | error / error / error / N/A | Runbook + signal `ecosystem.access.provisioning.dead_letter` |

**No auto-revoke en V1**. Toda resolución pasa por humano. Auto-revoke V2 sólo para modo `greenhouse_managed` con grace period + reliability signal de confirmación.

---

## 5. Governance

### 5.1 Approval workflow

Capabilities marcadas `requires_approval=true` (sensitive) no pueden activarse sin segunda firma:

- `kortex.hubspot_installation.manage` (puede romper integraciones HubSpot)
- `kortex.crm_strategy.run` (ejecuta workflows que mutan CRM)
- `verk.project.manage` (admin de proyectos cliente — V2)
- `public_website.cms.publish` (publica producción)

Assignment nace `approval_status='pending_approval'`; operador con capability `ecosystem.access.assignment.approve` (EFEONCE_ADMIN only, **distinto** del grantor) revisa y aprueba/rechaza. No se aplica al estado activo hasta aprobado. Audit log captura grantor + approver + reason.

### 5.2 Audit log append-only

`ecosystem_access_audit_log` con anti-UPDATE/DELETE triggers (patrón TASK-700/TASK-765). Cada mutación (grant, revoke, suspend, approve, reject, drift_acknowledge, drift_resolve) escribe una row con `before_json` / `after_json`. Retention: indefinida hasta TASK derivada de archivado.

### 5.3 Outbox events versionados v1

Todos los events los publica `publishOutboxEvent` en la misma tx PG que la mutación. Reactive consumers (TASK-888 dispatcher, TASK-887 drift detector, downstream BQ analytics) los drenan async via Cloud Scheduler + ops-worker.

| Event | Aggregate | Trigger |
|---|---|---|
| `ecosystem.access.assignment.granted v1` | `ecosystem_access_assignment` | Nuevo assignment activo o approved |
| `ecosystem.access.assignment.revoked v1` | `ecosystem_access_assignment` | Assignment a revoked |
| `ecosystem.access.assignment.suspended v1` | `ecosystem_access_assignment` | Assignment a suspended |
| `ecosystem.access.assignment.resumed v1` | `ecosystem_access_assignment` | suspended → active |
| `ecosystem.access.assignment.approved v1` | `ecosystem_access_assignment` | pending_approval → active |
| `ecosystem.access.assignment.rejected v1` | `ecosystem_access_assignment` | pending_approval → rejected |
| `ecosystem.access.provisioning_requested v1` | `ecosystem_provisioning_command` | Command queued |
| `ecosystem.access.deprovisioning_requested v1` | `ecosystem_provisioning_command` | Deprovision command queued |
| `ecosystem.access.provisioning_applied v1` | `ecosystem_provisioning_command` | Platform reportó applied |
| `ecosystem.access.provisioning_failed v1` | `ecosystem_provisioning_command` | Failed (no dead-letter aún) |
| `ecosystem.access.provisioning_dead_lettered v1` | `ecosystem_provisioning_command` | Max retries exceeded |
| `ecosystem.access.observed_snapshot_recorded v1` | `ecosystem_access_observed_snapshot` | Nuevo snapshot ingerido |
| `ecosystem.access.drift_detected v1` | `ecosystem_access_drift` | Drift creado |
| `ecosystem.access.drift_resolved v1` | `ecosystem_access_drift` | Drift cerrado |

Eventos consumibles por sister platforms via webhook outbound (TASK-888 dispatcher).

### 5.4 Reliability signals canónicos

Subsystem rollup: `Ecosystem Access`. Todos steady=0.

| Signal | Kind | Severity | Trigger |
|---|---|---|---|
| `ecosystem.access.pending_provisioning` | drift | warning >24h, error >72h | Assignments desired=active sin observed |
| `ecosystem.access.pending_deprovisioning` | drift | warning >24h, error >72h | Assignments desired=revoked con observed=active |
| `ecosystem.access.unauthorized_local_access` | drift | warning (depende modo) | Observed sin desired |
| `ecosystem.access.identity_unresolved` | data_quality | error >0 | Observed rows con `resolved_identity_profile_id=NULL` |
| `ecosystem.access.snapshot_stale` | lag | warning >48h, error >7d | Sister platform activa sin snapshot reciente |
| `ecosystem.access.provisioning_apply_lag` | lag | warning >1h, error >4h | Commands `queued`/`dispatching` |
| `ecosystem.access.provisioning_dead_letter` | dead_letter | error >0 | Commands en `dead_letter` |
| `ecosystem.access.capability_deprecated_assignments` | data_quality | warning >0 | Assignments activos con capability `deprecated_at NOT NULL` |
| `ecosystem.access.approval_overdue` | drift | warning >7d, error >30d | `pending_approval` no resueltos |

### 5.5 Defense in depth (7 capas, patrón TASK-742)

| Capa | Mecanismo |
|---|---|
| 1. DB constraint | CHECK `desired_status IN (...)`, FK to platforms+capabilities+identity_profile+binding, UNIQUE PARTIAL INDEX active |
| 2. Application guard | `grantEcosystemPlatformAccess()` valida modo, capability not deprecated, scope matches binding, subject_type matches capability.allowed_subject_types |
| 3. UI affordance | Drawer disabled CTAs cuando platform mode no permite acción; tooltip explica |
| 4. Reliability signal | 9 signals enumerados §5.4 |
| 5. Audit log | Append-only con triggers anti-UPDATE/DELETE |
| 6. Approval workflow | `requires_approval=true` capabilities exigen segunda firma EFEONCE_ADMIN distinto del grantor |
| 7. Outbox event versioned v1 | 14 events §5.3 |

---

## 6. Cost / observability

### 6.1 Cost model

- **Writes** (assignment grant/revoke): 1 INSERT + 1 audit INSERT + 1 outbox INSERT = 3 rows por mutación. Volumen esperado: ~10-100/día durante onboarding agresivo, <10/día steady state. Cost despreciable.
- **Snapshots** (TASK-887 ingestion): 1 snapshot row + N observed_rows por plataforma. Kortex ~50 users, Verk pre-prod ~10 users. Diarios. ~70 rows/día/plataforma.
- **Drift detection**: SQL JOIN desired ⋈ observed por (subject, platform, capability, scope). Index coverage critical. Job corre 1x/15 min vía ops-worker. O(n) en assignments activos + observed rows.
- **Dispatch**: cron Cloud Scheduler `ops-ecosystem-provisioning-dispatch` cada 2 min. Drena commands queued con backoff exponencial. ~1 outbound HTTP per command.

### 6.2 Hosting decisions

Mirror TASK-775 (Vercel cron classification):

- **Dispatcher** (queued → dispatching → external POST): `async_critical` → **Cloud Scheduler + ops-worker**.
- **Drift detector** (compare desired/observed, persist drift): `async_critical` → **Cloud Scheduler + ops-worker** cada 15 min.
- **Reliability signal readers**: lazy, llamados por `/admin/operations` → no cron.
- **Snapshot ingestion endpoint** (inbound desde sister platform): Vercel route (request path).
- **Provisioning result endpoint** (inbound ack): Vercel route (request path).

### 6.3 Sentry domain

Nuevo domain `ecosystem` agregado al `CaptureDomain` union de `captureWithDomain`. Subsystem rollup canónico `Ecosystem Access` consume el tag.

---

## 7. Surface (UI / API)

### 7.1 UI canónica (TASK-889)

Ruta: `/admin/ecosystem-access` (route_group `admin`, view code `administracion.ecosystem_access`, capability `ecosystem.access.governance.read`).

Layout:

```text
┌─────────────────────────────────────────────────────────────────┐
│ Header: Ecosistema Efeonce                              [Asignar]│
│ Summary strip: 4 plataformas · 23 assignments · 2 drift · 0 dead│
├─────────────────────────────────────────────────────────────────┤
│ Tabs: Plataformas │ Asignaciones │ Drift │ Auditoría             │
├─────────────────────────────────────────────────────────────────┤
│ Plataformas:                                                    │
│  • Kortex       active     hybrid_approval      [Configurar]    │
│  • Verk         active     read_only_observed   [Configurar]    │
│  • Sitio web    active     platform_managed     [Configurar]    │
│                                                                  │
│ Asignaciones (drilldown):                                       │
│  Colaborador     Plataforma   Capability    Scope    Estado     │
│  María P.        Kortex       crm_int.read  Sky      Activo ✓   │
│  Juan G.         Verk         workspace     Internal Pendiente  │
│                                                                  │
│ Drift queue:                                                    │
│  ⚠ Kortex: 1 acceso local sin aprobar  → [Aprobar] [Rechazar]   │
│  ⚠ Verk:  2 assignments pendientes >48h → [Reintentar dispatch] │
└─────────────────────────────────────────────────────────────────┘
```

Acciones disponibles según platform mode (UI hide/disable + tooltip):

| Acción | gh-managed | hybrid | platform-managed | read-only |
|---|---|---|---|---|
| Asignar | ✓ | ✓ (queue approval si sensitive) | ✓ (sólo desired, no push) | ✗ disabled |
| Revocar | ✓ | ✓ tras approval | ✗ disabled | ✗ disabled |
| Suspender | ✓ | ✓ | ✓ (sólo desired) | ✗ disabled |
| Aprobar acceso local | N/A | ✓ | N/A | N/A |
| Forzar reconciliación | ✓ EFEONCE_ADMIN | ✓ EFEONCE_ADMIN | ✗ | ✗ |

### 7.2 APIs

**Admin lane** (operadores Greenhouse, route_group=admin):

- `GET /api/admin/ecosystem/platforms` — lista plataformas + capability catalog
- `POST /api/admin/ecosystem/platforms/[platformKey]/configure` — cambiar modo/status
- `GET /api/admin/ecosystem/access/assignments?subject=&platform=&status=` — listar
- `POST /api/admin/ecosystem/access/assignments` — grant (idempotente por idempotency_key)
- `PATCH /api/admin/ecosystem/access/assignments/[id]` — suspend/resume/revoke
- `POST /api/admin/ecosystem/access/assignments/[id]/approve` — segunda firma
- `GET /api/admin/ecosystem/access/drift?status=open&platform=` — drift queue
- `POST /api/admin/ecosystem/access/drift/[id]/resolve` — close drift

**Ecosystem lane** (sister platforms, sister_platform_consumers auth via `runSisterPlatformWriteRoute()`):

- `GET /api/platform/ecosystem/access/platforms` — read-only registry (redacted)
- `POST /api/platform/ecosystem/access/observed-state` — sister platform reporta snapshot (TASK-887)
- `POST /api/platform/ecosystem/access/provisioning-results` — sister platform reporta applied/failed (TASK-888)
- `GET /api/platform/ecosystem/access/commands/pending` — sister platform polls pending commands (alternative a webhook outbound; ambos soportados)

Auth: bearer token per binding + binding-aware scope filter (no cross-tenant leak).

---

## 8. Conversion / interactions con sistemas adyacentes

### 8.1 Person Identity (TASK-784, TASK-872)

Toda creación de assignment exige `identity_profile_id` válido. Si SCIM intake (TASK-872) genera un member nuevo, un cron derivado puede materializar assignments default para plataformas en `greenhouse_managed` con scope `internal` (e.g. todo colaborador interno tiene `verk.workspace.access` automático). Ese cron NO es parte de V1; lo cubre TASK-889 Slice 6 o una task derivada.

### 8.2 Sister platform bindings (TASK-375/376)

`ecosystem_access_assignments.binding_id` es FK a `sister_platform_bindings`. El binding determina el modo (§3.3), el scope canónico Greenhouse y el scope externo de la plataforma. Sin binding activo, no se pueden crear assignments — error `binding_required_for_scope`.

### 8.3 Capabilities registry (TASK-611, TASK-839)

`ecosystem_platform_capabilities` es **un registry separado** del `capabilities_registry` interno de Greenhouse. NO se mezclan, NO comparten tabla. Razón: orthogonality — capabilities internas autorizan operadores Greenhouse, capabilities ecosistema definen el catálogo de cada sister platform.

Lint rule canónica (TASK-885 implementation): bloquea agregar entries con prefix de plataforma (`kortex.*`, `verk.*`) al `ENTITLEMENT_CAPABILITY_CATALOG` interno.

### 8.4 Webhooks (TASK-WEBHOOKS-V1)

Outbox events `ecosystem.access.provisioning_requested v1` se entregan a sister platforms via el dispatcher canónico (`/api/cron/webhook-dispatch` o equivalente ops-worker). Las plataformas se suscriben con `webhook_subscriptions` filtrado por `platform_key`. Retries y dead-letter heredan el modelo del marco webhooks.

### 8.5 API Platform Health (TASK-672)

`/api/platform/ecosystem/health` extiende su payload con un campo `accessControlPlane` que reporta: cantidad de assignments activos por plataforma, drift abierto, último snapshot, último dispatch successful. Es read-only y útil para que un agente Kortex pregunte "¿el control plane está sano?" antes de empujar un cambio.

### 8.6 Reliability Control Plane

9 signals nuevos bajo subsystem `Ecosystem Access`. Aparecen en `/admin/operations` con rollup unificado.

---

## 9. Metrics

| KPI | Meta steady state |
|---|---|
| Tiempo median grant → applied (modo `greenhouse_managed`) | < 5 min |
| Drift abierto > 7 días | = 0 |
| Snapshots stale > 48h | = 0 |
| Dead-letter commands | = 0 |
| Identity unresolved en observed | = 0 |
| Pending approval overdue | = 0 |
| Sensitive grants sin approval auditable | = 0 |

---

## 10. Dependencies & impact

### 10.1 Depends on

- `greenhouse_core.sister_platform_bindings` (TASK-375)
- `greenhouse_core.sister_platform_consumers` (TASK-376)
- `greenhouse_core.identity_profiles` + `identity_profile_source_links` (TASK-784, TASK-877)
- `greenhouse_core.capabilities_registry` (interno — patrón TASK-611/839)
- `greenhouse_sync.outbox_events` + dispatcher (TASK-773)
- API Platform ecosystem lane (TASK-672)
- Webhooks infrastructure (`GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`)
- ops-worker + Cloud Scheduler (TASK-775)

### 10.2 Impacts

- **TASK-885 a TASK-889** (downstream implementation).
- Kortex Integration Architecture V1 (anexo): debe incorporar binding mode + capability catalog Kortex.
- Sister Platforms Integration Contract V1: incorpora referencia a este control plane como cláusula 9.5 (acción boundary write con governance).
- Verk anexo futuro: nace con este modelo desde V1.
- Sitio público anexo futuro: idem.
- Admin Center UI: nueva ruta `/admin/ecosystem-access`.
- Reliability dashboard `/admin/operations`: nuevo subsystem `Ecosystem Access`.

### 10.3 Files owned

- `docs/architecture/GREENHOUSE_ECOSYSTEM_ACCESS_CONTROL_PLANE_V1.md` (este doc)
- `docs/architecture/DECISIONS_INDEX.md` (entry nuevo)
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md` (delta §9.5)
- `docs/architecture/GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md` (delta capability catalog Kortex)

---

## 11. Roadmap by slices

| Slice / Task | Scope | Output | Bloqueado por |
|---|---|---|---|
| **TASK-885** | Platform registry + capability catalog | Tablas `ecosystem_platforms` + `ecosystem_platform_capabilities`, seeds Kortex/Verk/sitio público, helpers + read APIs admin/ecosystem | TASK-884 (esta spec) |
| **TASK-886** | Desired access assignments foundation | Tabla `ecosystem_access_assignments` + audit log + outbox events v1, command helpers `grant/revoke/suspend/approve`, admin API | TASK-885 |
| **TASK-887** | Observed access + drift reconciliation | Tablas `observed_snapshots` + `observed_rows` + `drift`, ingestion API, identity resolver, drift engine, reliability signals | TASK-886 |
| **TASK-888** | Provisioning commands + webhooks | Tablas `provisioning_commands` + `command_results`, dispatcher cron, result API, retry + dead-letter, 2 reliability signals (apply_lag, dead_letter) | TASK-887 |
| **TASK-889** | Admin Center + Kortex/Verk pilot | UI `/admin/ecosystem-access`, drift queue, Kortex sandbox pilot, Verk readiness | TASK-888 |

**Slice ordering hard rule**: cada task espera la anterior. Cutover safe gracias a `provisioning_dispatch_enabled` flag por plataforma (TASK-888) — todas las plataformas arrancan `false` y se habilitan caso por caso.

### 11.1 Roadmap V1.1 (post-pilot)

- Auto-revoke en modo `greenhouse_managed` con grace period + signal de confirmación.
- Bulk assignment via CSV import.
- Material default assignments per role (e.g. todo `efeonce_admin` recibe `kortex.operator_console.access` automático).
- External partner subject type completo.
- Conversion drift `unauthorized_local_access` → assignment retroactivo con un click.

### 11.2 V2 / open

- Multi-tenant Greenhouse (si emergiera) afectaría scope global de assignments. Cubrir cuando emerja.
- SCIM-style standard endpoint para que plataformas más maduras (no Kortex/Verk de Efeonce) puedan conectarse sin custom adapter.

---

## 12. Hard rules (anti-regression)

### NEVER

- **NUNCA** persistir un assignment sin `identity_profile_id` non-null para `internal_collaborator` / `client_user` / `external_partner`. Si no existe, primero crear/resolver el `identity_profile` via TASK-784/TASK-872.
- **NUNCA** mezclar `ecosystem_platform_capabilities` con `capabilities_registry` interno. Son registries ortogonales con owners semánticos distintos.
- **NUNCA** asignar capabilities con prefix de plataforma (`kortex.*`, `verk.*`) al `ENTITLEMENT_CAPABILITY_CATALOG` interno de Greenhouse.
- **NUNCA** llamar APIs de Kortex/Verk inline desde un route handler Vercel. Toda mutación cross-platform pasa por outbox + dispatcher en ops-worker (patrón TASK-771).
- **NUNCA** revocar automáticamente un acceso (V1). Drift se mueve a queue; humano decide.
- **NUNCA** crear assignment con `requires_approval=true` capability y aplicarlo activo sin segunda firma. La segunda firma debe venir de actor distinto al grantor.
- **NUNCA** confiar el reporte `applied=true` de una sister platform sin reconcile contra el próximo `observed_snapshot`. Snapshot stale es signal de plataforma muda y debe quedar pintado en `/admin/operations`.
- **NUNCA** matchear observed users por nombre comercial, email visible o slug. Resolver pasa por `identity_profile_source_links` + platform external IDs. Si no resuelve, `missing_identity_link` drift y operador encadena manualmente.
- **NUNCA** asumir que un assignment desired=active equivale a permiso real en la plataforma. Hasta que `applied=true` + observed lo confirma, el assignment está pendiente.
- **NUNCA** modificar la matriz de drift_type severity por platform mode inline en un consumer. Toda lectura pasa por el helper canónico `resolveDriftSeverity(driftType, platformMode)`.
- **NUNCA** crear ruta `/admin/ecosystem-access/*` sin gate por capability `ecosystem.access.governance.read`.
- **NUNCA** invocar `Sentry.captureException` directo. Usar `captureWithDomain(err, 'ecosystem', { extra })`.
- **NUNCA** modificar `ecosystem_access_audit_log` post-INSERT. Append-only enforce por trigger. Para correcciones, insertar nueva row con `metadata_json.correction_of=<previous_id>`.
- **NUNCA** transicionar `desired_status` fuera del matrix canónico (§4.1). CHECK constraint DB lo bloquea.

### ALWAYS

- **SIEMPRE** persistir mutaciones en tx PG atómica + outbox event v1 en la misma tx.
- **SIEMPRE** validar `subject_type ∈ capability.allowed_subject_types` y `scope_type ∈ capability.allowed_scope_types` antes de tocar DB.
- **SIEMPRE** registrar `reason >= 10 chars` en grant/revoke/suspend.
- **SIEMPRE** que emerja una sister platform nueva (Studio?, Pricing?, etc.), aplicar este contrato desde día 1: registry entry + capabilities seed + binding + modo declarado.
- **SIEMPRE** documentar el modo en el binding y emitir warning si una plataforma activa lleva > 30 días en `read_only_observed` sin progreso a `hybrid_approval` o `greenhouse_managed`.
- **SIEMPRE** que un consumer ecosystem (read API o webhook) emita un error, redact via `redactErrorForResponse`.
- **SIEMPRE** que se incremente `dispatch_attempts` de un command, registrar la causa en `last_error` (canonicalized via `redactErrorForResponse`).
- **SIEMPRE** que se cierre una task downstream (885-889), correr `pnpm test && pnpm build` antes de mergear (regla canónica del repo).

---

## 13. Related documents

- `GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md` — contrato marco peer-system; esta spec extiende §9 (action boundary write) con governance formal.
- `GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md` — runtime binding contract (heredado).
- `GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md` — anexo Kortex; incorporará capability catalog Kortex tras TASK-885.
- `GREENHOUSE_IDENTITY_ACCESS_V2.md` — auth model interno (no se modifica).
- `GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md` — subject hierarchy (heredado).
- `GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — entitlements internos (no se mezcla).
- `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` — ecosystem lane + Platform Health V1.
- `GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` — outbound webhook delivery.
- `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — registry de signals.
- `GREENHOUSE_EVENT_CATALOG_V1.md` — incorporará los 14 events nuevos.

---

## 14. Patterns reused

| Pattern | Source task | Cómo se usa aquí |
|---|---|---|
| State machine + CHECK + audit trio | TASK-700, TASK-765 | Assignment lifecycle (§4.1) + provisioning command lifecycle (§4.2) |
| Outbox + reactive consumer | TASK-773, TASK-771 | 14 events v1 + ops-worker dispatcher (§5.3, §6.2) |
| Defense in depth 7-layer | TASK-742 | §5.5 (DB constraint + app guard + UI + signal + audit + approval + outbox) |
| Canonical helper + signal + lint | TASK-571, TASK-721, TASK-766 | `resolveDriftSeverity` + `grantEcosystemPlatformAccess` + lint rule anti capability namespace leak |
| Append-only audit log con triggers | TASK-700 | `ecosystem_access_audit_log` |
| Async-critical cron en Cloud Scheduler | TASK-775 | Dispatcher + drift detector |
| Capability granular least-privilege | TASK-839 | 11 capabilities §3.5 |
| Reliability signal por failure-mode | TASK-742, TASK-848 | 9 signals §5.4 (no signal coarse genérico) |
| Identity resolution Postgres-first | TASK-877 | Observed row resolver consulta `identity_profile_source_links` antes de email fallback |
| Atomic primitive con `client?: PoolClient` | TASK-765, TASK-872 | Command helpers aceptan client opcional para tx compartida |
| Versioned contract `*.v1` | Múltiples | Outbox events versionados; consumers downstream estables |
| Subsystem rollup en Reliability | TASK-742, TASK-848 | `Ecosystem Access` subsystem |
| `captureWithDomain` + domain tag | TASK-844 | Nuevo domain `ecosystem` |
| Idempotency key por shape natural | TASK-872 | SHA256(subject+platform+capability+scope+action) |

---

## 15. Smoke tests (canonical)

Los siguientes casos deben pasar end-to-end al cierre de TASK-889:

1. **Grant happy path** (`greenhouse_managed`): operador asigna `verk.workspace.access` a María (member) scope `internal` → command queued → dispatched → applied → next observed snapshot confirma → drift queue clean.
2. **Sensitive grant approval** (`hybrid_approval`): operador asigna `kortex.hubspot_installation.manage` a Juan → assignment `pending_approval` → EFEONCE_ADMIN aprueba (actor distinto) → command emitido.
3. **Unauthorized local access** (`hybrid_approval`): Kortex crea local sin asignación → snapshot ingerido → drift `unauthorized_local_access` warning → operador aprueba → assignment retroactivo creado + drift cerrado.
4. **Off-boarding**: member.active=false → cron rolling crea revoke commands para todos sus assignments activos → todos confirmados.
5. **Apply failed → dead-letter**: Kortex retorna 5xx persistente → 5 retries → dead-letter → signal `provisioning_dead_letter > 0` → alerta operador.
6. **Identity unresolved**: snapshot incluye un email que no resuelve a identity_profile → drift `missing_identity_link` → operador linkea via Person Identity → siguiente snapshot resuelve clean.
7. **Read-only mode**: Verk en `read_only_observed` → UI CTAs disabled → POST a `/api/admin/ecosystem/access/assignments` con platform=verk retorna 403 con error `platform_mode_disallows_grants`.
8. **Idempotency**: misma grant request enviada 2 veces → 1 assignment creado, 1 audit row, 1 outbox event. Segunda llamada retorna 200 con `already_active=true`.
9. **Scope mismatch**: assignment scope_type=`client` con scope_id que no resuelve a binding activo → 400 `binding_required_for_scope`.
10. **Capability deprecated**: assignment activo + capability se deprecata → signal `capability_deprecated_assignments > 0` → operador migra o revoca.

---

## 16. Open questions (deliberadamente no decididos en V1)

1. **External partner subject type**: el modelo lo declara pero V1 no implementa flujo de identidad para partners externos. Postergado a V1.1 una vez que TASK-784 cubra el caso.
2. **Auto-revoke**: V1 sólo crea drift; humano decide. Auto-revoke en modo `greenhouse_managed` con grace period queda para V1.1 tras 30 días de steady-state observado.
3. **SCIM-compatible outbound**: hoy cada sister platform implementa receive endpoint custom. Estandarizar a SCIM 2.0 outbound queda V2 cuando emerja una plataforma third-party no-Efeonce.
4. **Materialización de assignments default por role**: ¿todo `efeonce_admin` debería tener `kortex.operator_console.access` automático sin assignment manual? Defaults declarativos por role queda V1.1.
5. **Cross-platform delegation**: ¿puede Kortex emitir comandos hacia Verk a través de Greenhouse? V1 lo prohíbe (cada plataforma habla sólo con Greenhouse). Cross-platform queda V2 si emerge caso.
6. **Bulk operations**: CSV import / bulk revoke / bulk approve. UX existe en mockups pero V1 expone API singular. Bulk wraps lo cubre TASK derivada de V1.1.
7. **Service account lifecycle**: ¿quién rota credentials de service_account subjects? V1 documenta la posibilidad pero no implementa rotación.
8. **Retention de drift histórico**: hoy `ecosystem_access_drift` es queue + histórico mezclado. Si el volumen crece, split a queue + archive con time-partition queda V1.1.
9. **Reliability signal severity tuning**: thresholds (>24h warning, >72h error) son hint editorial. Tunar tras 30 días de steady-state observado.

---

## 17. 4-Pillar Score

### Safety

- **What can go wrong**: operador mal intencionado o con error humano asigna acceso sensible a Kortex (HubSpot manage) y compromete CRM de cliente Globe; sister platform reporta `applied=true` falsamente; cross-tenant leak (operador asigna scope `client` Sky a un usuario que es de cliente Cencosud).
- **Gates**:
  - 11 capabilities granulares least-privilege; sensitive grants exigen segunda firma EFEONCE_ADMIN distinto del grantor.
  - Binding-aware scope validation (FK + helper enforce que el scope existe en `sister_platform_bindings` activo).
  - Subject type matching enforce (`internal_collaborator` no puede recibir capability marcada solo `client_user`).
  - Capability deprecated bloquea grants nuevos (FK check + reliability signal).
  - Reveal-sensitive equivalente: assignments con capabilities sensitive auditados en log apart con razón obligatoria.
- **Blast radius if wrong**:
  - Worst case (operador asigna `kortex.hubspot_installation.manage` sin approval): aprobación de segunda firma es required en DB CHECK → no llega a `desired=active`.
  - Cross-tenant: scope FK a binding garantiza que sólo se asigna a tenants donde Greenhouse ya tiene binding activo. No hay fuga.
  - Plataforma maliciosa reportando applied falso: drift se descubre en siguiente snapshot (max 24h) + signal alerta.
- **Verified by**:
  - 10 smoke tests (§15) + unit tests por helper.
  - Reliability signals 9 enumerados §5.4.
  - Audit log append-only.
  - Lint rule anti capability namespace leak (`kortex.*` no puede entrar a `ENTITLEMENT_CAPABILITY_CATALOG` interno).
- **Residual risk**:
  1. Sister platform comprometida puede reportar observed/applied falso por un ciclo de snapshot (≤ 24h). Mitigación V1.1: cross-check con admin API pull cada N horas.
  2. EFEONCE_ADMIN compromised es game over. Mitigación: dos EFEONCE_ADMIN como required para segunda firma + rotación de credenciales.
  3. Identity profile linking incorrecto (resolver matchea email a la persona equivocada). Mitigación: signal `identity_unresolved` + ratificación humana en V1; verify-before-link en V1.1.

### Robustness

- **Idempotency**: assignment key SHA256(`identity_profile_id`+`platform_key`+`capability_key`+`action`+`scope_type`+`scope_id`) UNIQUE PARTIAL INDEX active. Mismo grant request N veces → 1 row activa. Command idempotency key SHA256(`assignment_id`+`command_kind`+`effective_from`) — sister platform recibe idempotency_key y dedupe local.
- **Atomicity**: grant/revoke = 1 tx PG con (a) INSERT/UPDATE assignment, (b) INSERT audit_log, (c) INSERT outbox_event, (d) INSERT provisioning_command (si modo lo requiere). Rollback completo si cualquier step falla.
- **Race protection**: UNIQUE PARTIAL INDEX active para assignments. Provisioning commands `SELECT FOR UPDATE SKIP LOCKED` en dispatcher (patrón outbox publisher TASK-773). State machine CHECK constraint enforce transitions.
- **Constraint coverage**:
  - FK assignment → identity_profile + platform + capability + binding.
  - CHECK `desired_status IN ('active', 'suspended', 'revoked')`.
  - CHECK `approval_status IN ('approved', 'pending_approval', 'rejected')`.
  - CHECK `subject_type IN ('internal_collaborator', 'client_user', 'service_account', 'external_partner')`.
  - CHECK `scope_type IN (...)`.
  - Trigger anti-zombie: assignments `active` con `effective_to < NOW()` → `suspended` automático.
  - Trigger append-only en audit_log (anti-UPDATE/DELETE).
- **Verified by**:
  - Tests anti-regresión de idempotency (mismo input 2x = 1 row).
  - Tests anti-regresión de race (2 grants concurrentes con misma key → 1 wins, otro retorna `already_active`).
  - Tests de state machine: transition matrix completo + invalid transition rejected.
  - Live parity test TS↔SQL para enum de `desired_status` y `drift_type`.

### Resilience

- **Retry policy**: provisioning_command retry exponencial 5 intentos: 0 / +1m / +5m / +15m / +60m. Después → `dead_letter`. Mismo patrón outbox publisher TASK-773.
- **Dead letter**: `state='dead_letter'` + signal `ecosystem.access.provisioning_dead_letter` alerta. Recovery via admin endpoint que reenqueua con `dispatch_attempts=0` (capability EFEONCE_ADMIN only).
- **Reliability signals**: 9 signals §5.4. Cada failure mode tiene su signal — NO un signal coarse `ecosystem_access.health` que oculte detalle.
- **Audit trail**: `ecosystem_access_audit_log` append-only + outbox events v1 + reliability signals. Reconstrucción forensic completa: quién, cuándo, por qué, qué cambió.
- **Recovery procedure**:
  - Runbook canónico: `docs/operations/runbooks/ecosystem-access-recovery.md` (a crear en TASK-887 / TASK-888).
  - Idempotent re-run scripts: `pnpm tsx scripts/ecosystem-access/reconcile-platform.ts --platform=kortex` corre un drift refresh + re-enqueue de commands stuck.
  - Snapshot stale recovery: trigger manual `POST /api/admin/ecosystem/access/snapshots/[platformKey]/trigger` (capability EFEONCE_ADMIN).

### Scalability

- **Hot path Big-O**:
  - Grant: O(1) (INSERT con FK lookups indexados).
  - Revoke: O(1) (UPDATE por PK).
  - List assignments for user: O(log n) (index on `(identity_profile_id, desired_status)`).
  - Drift detection: O(n + m) donde n=assignments activos, m=observed_rows last snapshot. Con index coverage en `(platform_key, identity_profile_id, capability_key, scope_id)`, drift detection es bounded.
- **Index coverage**:
  - `assignments(identity_profile_id, desired_status)` — list por persona.
  - `assignments(platform_key, desired_status, effective_from DESC)` — drift detector left side.
  - `observed_rows(snapshot_id, resolved_identity_profile_id, observed_capability_key)` — drift detector right side.
  - `provisioning_commands(state, dispatch_attempts, last_dispatched_at)` — dispatcher SELECT FOR UPDATE SKIP LOCKED.
  - `drift(status, severity, platform_key)` — admin queue.
- **Async paths**:
  - Dispatcher cron 2 min (Cloud Scheduler + ops-worker).
  - Drift detector cron 15 min (Cloud Scheduler + ops-worker).
  - Observed snapshot ingestion: inbound webhook con write inline a `observed_rows`, drift detection async.
  - Approval workflow: no requiere async (validación inline).
- **Cost at 10x**:
  - Assignments 10x = 1000 activos. INSERT/UPDATE bounded. List queries cubren index → log(N).
  - Snapshots 10x = 700 observed_rows/día. Drift detection O(n+m) sigue bounded.
  - Sister platforms 10x = 40 plataformas. Cada una con dispatcher + snapshot independiente. Linear growth aceptable.
- **Pagination**: cursor-based keyset on `(started_at DESC, assignment_id)` para listados admin. Drift queue: cursor on `(detected_at DESC, drift_id)`. No OFFSET.

---

## 18. Changelog

| Date | Version | Author | Change |
|---|---|---|---|
| 2026-05-15 | 1.0 | arch-architect | Initial spec V1 |
