# Greenhouse Client Lifecycle Architecture V1

> **Version:** 1.0
> **Created:** 2026-05-07 por Claude (Opus 4.7)
> **Audience:** Backend engineers, product owners, agentes que implementen onboarding/offboarding/reactivación de clientes, operadores comerciales, finance ops
> **Related:** `GREENHOUSE_360_OBJECT_MODEL_V1.md`, `GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md`, `GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md`, `GREENHOUSE_WORKFORCE_ONBOARDING_ARCHITECTURE_V1.md`, `GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md`, `GREENHOUSE_EVENT_CATALOG_V1.md`, `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`, `GREENHOUSE_AUTH_RESILIENCE_V1.md`
> **Supersedes:** ninguno (spec nuevo)

---

## 0. Status

Contrato arquitectónico nuevo desde 2026-05-07.

Estado actual del repo:

- TASK-535 canonizó la máquina de estados de identidad comercial sobre `greenhouse_core.organizations.lifecycle_stage` y el comando atómico `instantiateClientForParty()`
- TASK-801/802/803 canonizaron las primitivas de engagement: `services.engagement_kind`, `engagement_commercial_terms` time-versioned, `engagement_phases/outcomes/lineage`
- TASK-706/813 canonizaron pipeline inbound HubSpot real-time (companies + p_services)
- TASK-760/761 canonizaron offboarding **de colaboradores** (`work_relationship_offboarding_cases`, `final_settlements`)
- TASK-030 canonizó checklists HRIS para colaboradores
- **No existe** un agregado canónico que orqueste el ciclo de vida del cliente como entidad de primer nivel: hoy las piezas se componen a mano por el operador

Este documento fija la dirección para cerrar ese gap espejando el patrón TASK-760 (battle-tested para colaboradores) al dominio comercial.

---

## 1. Core Thesis

Greenhouse no debe modelar el ciclo de vida del cliente solo como:

- transición de `lifecycle_stage` en `organizations`
- creación lateral de `services` y `engagement_phases`
- side-effects implícitos de webhooks HubSpot

La unidad canónica es un **caso de ciclo de vida del cliente** (`client_lifecycle_case`) con tipo (`onboarding | offboarding | reactivation`), checklist materializado desde template, audit trail append-only, y outbox events versionados que disparan consumers reactivos hacia los demás dominios.

Por lo tanto:

- `organizations.lifecycle_stage` sigue siendo la máquina de estados de identidad comercial — no la reemplazamos
- `services + engagement_phases` siguen siendo las primitivas operativas — el caso las **referencia**, no las duplica
- el caso es el **orquestador**: declara intención, materializa checklist, valida pre-condiciones, gobierna la transición, deja audit trail
- el comando atómico canónico se llama desde el case, no al revés

---

## 2. Problem Statement

Hoy Greenhouse tiene piezas aisladas:

- HubSpot webhook crea/actualiza la company → eventualmente `instantiateClientForParty` materializa el `client_id`
- Sales declara `services` con `engagement_kind` desde HubSpot p_services
- Operador comercial declara `engagement_commercial_terms` y `engagement_phases` a mano
- Finance espera que aparezca `client_profiles` para empezar a emitir invoices
- HR espera que `client_team_assignments` referencie al cliente para attribuir labor cost
- AI Tooling espera que el cliente exista para asignar herramientas

Pero falta el contrato que conecte esas piezas y declare:

- "este cliente está en proceso de **onboarding** desde el día X, target completion día Y, owner: Z"
- "este cliente está en proceso de **offboarding** y NO PUEDE cerrarse hasta que no se concilien estos N items"
- "este cliente fue offboardeado en 2025 y ahora vuelve como **reactivation** — preserve el lineage al case anterior"

Consecuencias del gap actual:

- onboarding incompleto invisible: cliente activado en `lifecycle_stage='active_client'` pero sin team_assignments ni terms ni phases
- offboarding ad-hoc: cliente flippea a `inactive` con invoices abiertas, sin final settlement, sin revoke de accesos, sin archive de Notion
- sin checklist canónico → operador olvida pasos críticos, riesgo financiero y de compliance
- sin audit trail unificado: imposible reconstruir "qué pasó cuando este cliente entró/salió"
- sin reliability signals: casos atascados invisibles para ops

---

## 3. Domain Boundary

| Dominio | Authority | Notes |
|---|---|---|
| Identidad comercial | `greenhouse_core.organizations` (TASK-535) | El caso **referencia** organization_id; nunca paraleliza identidad |
| Cliente financiero | `greenhouse_core.clients` (TASK-535) | El caso lo crea/archiva indirectamente vía `instantiateClientForParty` / `archiveClientForParty` |
| Engagement comercial | `services` + `engagement_*` (TASK-801/802/803) | El caso valida estados pero NO los modifica directamente; emite outbox para que consumers downstream actúen |
| Checklist operativo | `client_lifecycle_checklist_items` (este spec) | Tareas humanas con evidence upload; mirror de TASK-030 |
| Audit / forensic | `client_lifecycle_case_events` (este spec) | Append-only, anti-UPDATE/DELETE triggers |
| Async cascade | `outbox_events` + reactive consumers (TASK-771/773) | Side-effects (revoke access, archive notion, propagate engagement_outcome) |
| Final billing del cliente | **OUT OF SCOPE V1.0**, `client_final_settlement` será V1.1 | V1.0 bloquea cierre con blocker manual hasta confirmación humana |
| Workforce onboarding/offboarding | `work_relationship_*` (TASK-760/761) | Dominio totalmente separado (colaboradores). NO mezclar con client lifecycle |

**Ownership:** Commercial domain principal; Finance contribuye a la fase de cierre financiero (offboarding); Identity contribuye a revoke de `client_users`.

---

## 4. Decisions (resolved from arch review 2026-05-07)

Las 5 open questions de la propuesta inicial se resuelven con el lens 4-pilar (safety/robustness/resilience/scalability):

| # | Question | Decision V1 | Razón |
|---|---|---|---|
| 1 | Anchor identity | `organization_id` | Es el ID inmutable canónico (TASK-535); cubre prospect onboarding (sin client_id aún) y offboarding post-archive (client_id puede estar superseded). `client_id` queda como snapshot resuelto opcional |
| 2 | HubSpot deal trigger | **Semi-automático**: webhook crea case en `status='draft'`, operador activa | Misclick de sales NO debe disparar side-effects irreversibles. Espeja TASK-784/785 (system proposes, human approves) |
| 3 | Final invoice del cliente | V1.1 (separado), V1.0 bloquea cierre con `pending_invoice_check` manual | Final billing del cliente requiere TASK-722 reconciliation + TASK-703 OTB + TASK-768 economic_category. Heavy. Defer con blocker hard |
| 4 | Reactivation | `case_kind='reactivation'` distinto + `previous_case_id` FK lineage | Preserva forensic trail; checklist diferente (no recrear org, sí re-asignar terms) |
| 5 | Notion workspace archive | Checklist item con `evidence_asset_id` (operator-driven) | Auto-archive Notion es destructivo + API rate-limited. Operator-driven con evidence upload es safer |

---

## 5. Data Model

### 5.1 `greenhouse_core.client_lifecycle_cases`

Entidad de primer nivel. Una fila por caso (puede haber múltiples casos a lo largo del tiempo para la misma organización; UNIQUE partial garantiza solo un caso activo por kind).

```sql
CREATE TABLE greenhouse_core.client_lifecycle_cases (
  case_id              TEXT PRIMARY KEY,                    -- 'clc-{uuid}'
  organization_id      UUID NOT NULL REFERENCES greenhouse_core.organizations(organization_id),
  client_id            TEXT REFERENCES greenhouse_core.clients(client_id),
                                                            -- snapshot resuelto cuando aplica; NULL antes de instantiateClient
  case_kind            TEXT NOT NULL
                       CHECK (case_kind IN ('onboarding','offboarding','reactivation')),
  status               TEXT NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft','in_progress','blocked','completed','cancelled')),

  trigger_source       TEXT NOT NULL
                       CHECK (trigger_source IN ('hubspot_deal','manual','renewal','churn_signal','migration')),
  triggered_by_user_id TEXT REFERENCES greenhouse_core.users(user_id),
  reason               TEXT,                                -- requerido en offboarding (CHECK: length >= 10)
  effective_date       DATE NOT NULL,
  target_completion_date DATE,
  completed_at         TIMESTAMPTZ,
  cancelled_at         TIMESTAMPTZ,
  cancellation_reason  TEXT,

  blocked_reason_codes TEXT[],                              -- catálogo: 'pending_invoice','pending_settlement','open_engagement_phase','pending_team_assignment','pending_evidence', etc.
  previous_case_id     TEXT REFERENCES greenhouse_core.client_lifecycle_cases(case_id),
                                                            -- lineage para reactivation
  metadata_json        JSONB DEFAULT '{}'::jsonb,
                                                            -- HubSpot deal_id si trigger_source='hubspot_deal', etc.

  template_code        TEXT NOT NULL REFERENCES greenhouse_core.client_lifecycle_checklist_templates(template_code),
                                                            -- snapshot del template usado al materializar checklist

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (case_kind != 'offboarding' OR (reason IS NOT NULL AND length(reason) >= 10)),
  CHECK (case_kind != 'reactivation' OR previous_case_id IS NOT NULL),
  CHECK (status NOT IN ('completed','cancelled') OR completed_at IS NOT NULL OR cancelled_at IS NOT NULL),
  CHECK (effective_date <= COALESCE(target_completion_date, effective_date + INTERVAL '365 days'))
);

-- Solo un caso activo por (organization_id, case_kind)
CREATE UNIQUE INDEX client_lifecycle_cases_one_active_per_kind
  ON greenhouse_core.client_lifecycle_cases (organization_id, case_kind)
  WHERE status NOT IN ('completed','cancelled');

-- Hot path indexes
CREATE INDEX client_lifecycle_cases_status_kind ON greenhouse_core.client_lifecycle_cases (status, case_kind) WHERE status NOT IN ('completed','cancelled');
CREATE INDEX client_lifecycle_cases_client_id ON greenhouse_core.client_lifecycle_cases (client_id) WHERE client_id IS NOT NULL;
CREATE INDEX client_lifecycle_cases_organization_id ON greenhouse_core.client_lifecycle_cases (organization_id);
CREATE INDEX client_lifecycle_cases_target_completion ON greenhouse_core.client_lifecycle_cases (target_completion_date) WHERE status NOT IN ('completed','cancelled');
```

### 5.2 `greenhouse_core.client_lifecycle_case_events`

Audit log append-only. Anti-UPDATE/DELETE triggers.

```sql
CREATE TABLE greenhouse_core.client_lifecycle_case_events (
  event_id          TEXT PRIMARY KEY,                       -- 'clce-{uuid}'
  case_id           TEXT NOT NULL REFERENCES greenhouse_core.client_lifecycle_cases(case_id),
  event_kind        TEXT NOT NULL,
                     -- 'opened','status_changed','blocker_added','blocker_resolved',
                     -- 'item_advanced','item_completed','item_skipped','item_blocked',
                     -- 'evidence_attached','reason_updated','blocker_overridden','closed'
  from_status       TEXT,
  to_status         TEXT,
  payload_json      JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id     TEXT NOT NULL REFERENCES greenhouse_core.users(user_id),
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX client_lifecycle_case_events_case_id ON greenhouse_core.client_lifecycle_case_events (case_id, occurred_at DESC);

-- Anti-UPDATE / Anti-DELETE triggers (mismo patrón TASK-535 organization_lifecycle_history)
CREATE OR REPLACE FUNCTION greenhouse_core.client_lifecycle_case_events_no_update() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'client_lifecycle_case_events is append-only'; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_update_on_case_events BEFORE UPDATE ON greenhouse_core.client_lifecycle_case_events FOR EACH ROW EXECUTE FUNCTION greenhouse_core.client_lifecycle_case_events_no_update();
CREATE TRIGGER prevent_delete_on_case_events BEFORE DELETE ON greenhouse_core.client_lifecycle_case_events FOR EACH ROW EXECUTE FUNCTION greenhouse_core.client_lifecycle_case_events_no_update();
```

### 5.3 `greenhouse_core.client_lifecycle_checklist_templates`

Templates declarativos. Una fila por (template_code, item_code). Los casos snapshot el `template_code` al abrirse.

```sql
CREATE TABLE greenhouse_core.client_lifecycle_checklist_templates (
  template_code     TEXT NOT NULL,                           -- 'standard_onboarding_v1', 'standard_offboarding_v1', 'reactivation_v1'
  case_kind         TEXT NOT NULL CHECK (case_kind IN ('onboarding','offboarding','reactivation')),
  item_code         TEXT NOT NULL,                           -- 'verify_hubspot_company_synced', 'declare_commercial_terms', etc.
  item_label        TEXT NOT NULL,                           -- 'Verificar HubSpot company sincronizada'
  item_description  TEXT,
  required          BOOLEAN NOT NULL DEFAULT TRUE,
  default_order     INTEGER NOT NULL,
  owner_role        TEXT NOT NULL
                     CHECK (owner_role IN ('commercial','finance','operations','hr','identity','it')),
  blocks_completion BOOLEAN NOT NULL DEFAULT TRUE,           -- FALSE = item informativo, no bloquea cierre
  requires_evidence BOOLEAN NOT NULL DEFAULT FALSE,
  effective_from    DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to      DATE,
  metadata_json     JSONB DEFAULT '{}'::jsonb,
  PRIMARY KEY (template_code, item_code)
);

CREATE INDEX client_lifecycle_templates_active ON greenhouse_core.client_lifecycle_checklist_templates (template_code, default_order) WHERE effective_to IS NULL;
```

### 5.4 `greenhouse_core.client_lifecycle_checklist_items`

Materializado al abrir el caso. Snapshot de las filas activas del template al momento de la apertura.

```sql
CREATE TABLE greenhouse_core.client_lifecycle_checklist_items (
  item_id            TEXT PRIMARY KEY,                       -- 'clci-{uuid}'
  case_id            TEXT NOT NULL REFERENCES greenhouse_core.client_lifecycle_cases(case_id) ON DELETE CASCADE,
  template_code      TEXT NOT NULL,
  item_code          TEXT NOT NULL,
  item_label         TEXT NOT NULL,                          -- snapshot del label al momento de materializar
  required           BOOLEAN NOT NULL,
  blocks_completion  BOOLEAN NOT NULL,
  requires_evidence  BOOLEAN NOT NULL,
  owner_role         TEXT NOT NULL,
  display_order      INTEGER NOT NULL,

  status             TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','in_progress','completed','skipped','blocked','not_applicable')),

  evidence_asset_id  TEXT REFERENCES greenhouse_core.assets(asset_id),
                                                             -- TASK-721 canonical uploader
  notes              TEXT,
  completed_at       TIMESTAMPTZ,
  completed_by_user_id TEXT REFERENCES greenhouse_core.users(user_id),
  blocked_reason     TEXT,
  metadata_json      JSONB DEFAULT '{}'::jsonb,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (status NOT IN ('completed','skipped') OR completed_at IS NOT NULL),
  CHECK (status != 'completed' OR (NOT requires_evidence) OR evidence_asset_id IS NOT NULL),
  CHECK (status != 'blocked' OR blocked_reason IS NOT NULL),
  UNIQUE (case_id, item_code)
);

CREATE INDEX client_lifecycle_items_case_id ON greenhouse_core.client_lifecycle_checklist_items (case_id, display_order);
CREATE INDEX client_lifecycle_items_pending ON greenhouse_core.client_lifecycle_checklist_items (case_id) WHERE status NOT IN ('completed','skipped','not_applicable');
```

### 5.5 Seed inicial de templates V1

**`standard_onboarding_v1`** (10 items):

| Order | item_code | label | owner | blocks | evidence |
|---|---|---|---|---|---|
| 1 | `verify_hubspot_company_synced` | Verificar company HubSpot sincronizada en Greenhouse | commercial | yes | no |
| 2 | `confirm_legal_documents` | Confirmar firma de contrato/MSA | commercial | yes | yes |
| 3 | `declare_engagement_kind` | Declarar `engagement_kind` del servicio (regular/pilot/trial/poc/discovery) | commercial | yes | no |
| 4 | `declare_commercial_terms` | Declarar `engagement_commercial_terms` activos | commercial | yes | no |
| 5 | `declare_engagement_phases` | Declarar fases del engagement (kickoff/operation/reporting/decision) | commercial | yes | no |
| 6 | `assign_team_members` | Asignar miembros vía `client_team_assignments` con FTE | operations | yes | no |
| 7 | `provision_notion_workspace` | Provisionar workspace Notion para el cliente | operations | no | yes |
| 8 | `provision_communication_channels` | Configurar Teams channel + email subscriptions | operations | no | no |
| 9 | `provision_client_users_access` | Provisionar acceso al portal cliente (si aplica) | identity | no | no |
| 10 | `confirm_billing_setup` | Confirmar setup de facturación (Nubox + payment terms) | finance | yes | no |

**`standard_offboarding_v1`** (10 items):

| Order | item_code | label | owner | blocks | evidence |
|---|---|---|---|---|---|
| 1 | `confirm_offboarding_reason` | Documentar razón de offboarding (churn/converted/contract_end) | commercial | yes | no |
| 2 | `close_engagement_phases` | Cerrar todas las `engagement_phases` activas con `engagement_outcomes` | commercial | yes | no |
| 3 | `end_date_commercial_terms` | Setear `effective_to` en `engagement_commercial_terms` activos | commercial | yes | no |
| 4 | `end_date_team_assignments` | Setear `end_date` en `client_team_assignments` activos | operations | yes | no |
| 5 | `verify_no_pending_invoices` | Confirmar que NO hay invoices abiertas con saldo pendiente | finance | yes | yes |
| 6 | `verify_no_pending_payment_orders` | Confirmar que NO hay payment_orders en estados no terminales | finance | yes | no |
| 7 | `archive_notion_workspace` | Exportar + archivar workspace Notion del cliente | operations | no | yes |
| 8 | `revoke_client_users_access` | Revocar acceso de `client_users` al portal | identity | yes | no |
| 9 | `final_period_report` | Generar reporte final del período (KPIs últimos 90 días) | operations | no | yes |
| 10 | `confirm_archive_evidence` | Confirmar archivado de toda la evidencia y documentos | operations | yes | yes |

**`reactivation_v1`** (5 items):

| Order | item_code | label | owner | blocks | evidence |
|---|---|---|---|---|---|
| 1 | `verify_previous_case_resolved` | Verificar que el caso anterior está resuelto | commercial | yes | no |
| 2 | `reinstate_commercial_terms` | Crear nuevos `engagement_commercial_terms` activos | commercial | yes | no |
| 3 | `reinstate_team_assignments` | Reinstalar `client_team_assignments` con FTE | operations | yes | no |
| 4 | `reinstate_client_users_access` | Reinstalar acceso al portal cliente | identity | no | no |
| 5 | `confirm_billing_resumed` | Confirmar reanudación de facturación | finance | yes | no |

---

## 6. State Machines

### 6.1 Case status

```text
                    ┌──────────┐
                    │  draft   │ ── cancelled (descarte temprano)
                    └────┬─────┘
                         │ activate
                         ▼
                    ┌─────────────┐
        ┌────────── │ in_progress │ ──────────┐
        │           └─────────────┘           │
        │ blocker added            blocker resolved + all required completed
        ▼                                     ▼
   ┌─────────┐                          ┌───────────┐
   │ blocked │ ── blocker resolved ──→  │ completed │
   └─────────┘                          └───────────┘
        │                                     ▲
        └─── force-close (override) ──────────┘
        │
        └─── cancelled (with reason >= 20 chars)

cancelled is reachable from {draft, in_progress, blocked} but never from completed
completed is terminal
```

CHECK constraints + DB triggers enforce: no transición a `completed` con required items pendientes; no transición a `completed` con `blocked_reason_codes` no vacío salvo override capability.

### 6.2 Checklist item status

```text
pending → in_progress → completed
        ↘             ↘ skipped (only if required=false OR override capability)
          blocked → in_progress (resuelto)
        ↘
          not_applicable (terminal, requires reason)
```

### 6.3 Allowed transitions matrix (case)

| From → To | draft | in_progress | blocked | completed | cancelled |
|---|---|---|---|---|---|
| **draft** | — | ✅ activate | ❌ | ❌ | ✅ cancel-early |
| **in_progress** | ❌ | — | ✅ blocker added | ✅ all required done | ✅ cancel (reason ≥ 20) |
| **blocked** | ❌ | ✅ blocker resolved | — | ⚠️ override only | ✅ cancel (reason ≥ 20) |
| **completed** | ❌ | ❌ | ❌ | — | ❌ (terminal) |
| **cancelled** | ❌ | ❌ | ❌ | ❌ | — (terminal) |

Trigger PG `client_lifecycle_case_transitions_check` valida la matriz.

---

## 7. Canonical Commands

Todos viven en `src/lib/client-lifecycle/commands/`. Todos atomic + idempotent + outbox v1.

### 7.1 `provisionClientLifecycle`

```ts
async function provisionClientLifecycle(input: {
  organizationId: string
  caseKind: 'onboarding' | 'reactivation'
  triggerSource: 'hubspot_deal' | 'manual' | 'renewal' | 'migration'
  triggeredByUserId: string
  reason?: string
  effectiveDate: string  // ISO date
  targetCompletionDate?: string
  templateCode?: string  // default by case_kind
  previousCaseId?: string  // required for reactivation
  hubspotDealId?: string  // when trigger_source='hubspot_deal'
}, client?: Kysely | Transaction): Promise<{
  caseId: string
  status: 'draft' | 'in_progress'
  checklistItems: Array<{itemId, itemCode, status, displayOrder}>
  blockers: string[]
}>
```

Comportamiento:
1. Validar capability `client.lifecycle.case.open`
2. Validar idempotency: si existe caso activo del mismo kind, devolver el existente (no crear duplicado)
3. Validar pre-condiciones (organization existe, previous_case resuelto si reactivation)
4. INSERT case con status='draft' (auto-trigger HubSpot) o 'in_progress' (manual)
5. Materializar checklist desde `template_code` activo (snapshot label, required, etc.)
6. INSERT case_event `opened` + outbox `client.lifecycle.case.opened` v1
7. Toda en una transacción

### 7.2 `deprovisionClientLifecycle`

```ts
async function deprovisionClientLifecycle(input: {
  organizationId: string
  triggerSource: 'manual' | 'churn_signal' | 'hubspot_deal'
  triggeredByUserId: string
  reason: string  // length >= 10 enforced at DB
  effectiveDate: string
  targetCompletionDate?: string
  templateCode?: string  // default 'standard_offboarding_v1'
}): Promise<{
  caseId: string
  blockers: string[]  // pre-flight check: open invoices, open phases, etc.
  checklistItems: Array<...>
}>
```

Comportamiento:
1. Validar capability `client.lifecycle.case.open`
2. Pre-flight: detectar blockers reales (consultar invoices abiertas vía VIEW canónica TASK-722, phases sin outcome, payment_orders no-terminales) y poblar `blocked_reason_codes`
3. INSERT case con status='in_progress' o 'blocked' según pre-flight
4. Materializar checklist
5. Outbox event `client.lifecycle.offboarding.opened` v1

### 7.3 `advanceLifecycleChecklistItem`

```ts
async function advanceLifecycleChecklistItem(input: {
  caseId: string
  itemCode: string
  newStatus: 'in_progress' | 'completed' | 'skipped' | 'blocked' | 'not_applicable'
  evidenceAssetId?: string
  notes?: string
  blockedReason?: string
  actorUserId: string
}): Promise<{ itemId, status, caseStatus }>
```

Comportamiento:
1. Validar capability — granular por owner_role del item (commercial, finance, operations, etc.)
2. Validar transición de status del item legal
3. Validar `evidence_asset_id` presente si `requires_evidence=TRUE` y new_status='completed'
4. UPDATE item en transacción + INSERT case_event + outbox `client.lifecycle.item.advanced` v1
5. Auto-resolver blocker del case si todos los required están done

### 7.4 `resolveLifecycleCase`

```ts
async function resolveLifecycleCase(input: {
  caseId: string
  resolution: 'completed' | 'cancelled'
  resolutionReason?: string  // required for cancelled, length >= 20
  overrideBlockers?: boolean  // requires capability `client.lifecycle.case.override_blocker`
  overrideReason?: string     // required if overrideBlockers=true, length >= 20
  actorUserId: string
}): Promise<{ caseId, finalStatus, sideEffectsTriggered: string[] }>
```

Comportamiento:
1. Validar capability `client.lifecycle.case.resolve`
2. Si resolution='completed': enforce all required items done OR overrideBlockers=true
3. Si overrideBlockers=true: enforce capability `client.lifecycle.case.override_blocker` + reason
4. UPDATE case → completed/cancelled + INSERT case_event
5. Outbox events versionados v1:
   - `client.lifecycle.case.completed` (kind=onboarding) → cascade: `instantiateClientForParty` si no existe
   - `client.lifecycle.case.completed` (kind=offboarding) → cascade: `archiveClientForParty`, revoke client_users, propagate engagement_outcomes
   - `client.lifecycle.case.completed` (kind=reactivation) → cascade: re-activate client + reinstate

### 7.5 `addLifecycleBlocker` / `resolveLifecycleBlocker`

Helpers para gestión manual de blockers (operador identifica un issue, el sistema persiste y notifica).

---

## 8. Capabilities

Granulares, mirror del patrón TASK-742:

| Capability | Module | Action | Scope | Allowed |
|---|---|---|---|---|
| `client.lifecycle.case.open` | commercial | create | tenant | commercial_admin, finance_admin, EFEONCE_ADMIN |
| `client.lifecycle.case.advance` | commercial | update | tenant | commercial, finance, operations (filtered by item.owner_role) |
| `client.lifecycle.case.resolve` | commercial | approve | tenant | commercial_admin, finance_admin, EFEONCE_ADMIN |
| `client.lifecycle.case.override_blocker` | commercial | override | tenant | EFEONCE_ADMIN solamente |
| `client.lifecycle.case.read` | commercial | read | tenant | commercial, finance, operations, hr (read-only) |
| `client.lifecycle.template.manage` | platform | manage | global | EFEONCE_ADMIN solamente |

---

## 9. API Surface

```
GET    /api/admin/clients/[organizationId]/lifecycle
       → returns active case + history + checklist items

POST   /api/admin/clients/[organizationId]/lifecycle/onboarding
POST   /api/admin/clients/[organizationId]/lifecycle/offboarding
POST   /api/admin/clients/[organizationId]/lifecycle/reactivation
       → opens case, returns caseId + initial checklist + blockers

PATCH  /api/admin/clients/lifecycle/cases/[caseId]/items/[itemCode]
       → advance checklist item

POST   /api/admin/clients/lifecycle/cases/[caseId]/resolve
       → resolve case (completed/cancelled), with optional override

GET    /api/admin/clients/lifecycle/cases
       → paginated list with filters (status, case_kind, owner, overdue)

GET    /api/admin/clients/lifecycle/templates
POST   /api/admin/clients/lifecycle/templates
PUT    /api/admin/clients/lifecycle/templates/[templateCode]
       → template management (EFEONCE_ADMIN only)

GET    /api/admin/clients/lifecycle/health
       → contract platform-health.v1 extension: open cases, overdue, blocked
```

Auth: todos pasan por `requireServerSession` + capability check granular. Errors via `redactErrorForResponse` + `captureWithDomain(err, 'commercial', { tags: { source: 'client_lifecycle' } })`.

---

## 10. Outbox Events (versionados v1)

Mirror del catálogo `GREENHOUSE_EVENT_CATALOG_V1.md`. Todos contract v1.

| Event | Cuándo | Payload | Consumers |
|---|---|---|---|
| `client.lifecycle.case.opened` | provisionClientLifecycle / deprovisionClientLifecycle | `{caseId, organizationId, caseKind, triggerSource, effectiveDate, templateCode}` | UI notification, BQ projection |
| `client.lifecycle.case.activated` | draft → in_progress | `{caseId, activatedBy}` | reactive consumers, dashboards |
| `client.lifecycle.item.advanced` | advanceLifecycleChecklistItem | `{caseId, itemCode, fromStatus, toStatus, evidenceAssetId?}` | UI notifications, BQ projection |
| `client.lifecycle.blocker.added` | manual / auto-detected | `{caseId, reasonCode, detectedBy}` | reliability signal, alerts |
| `client.lifecycle.blocker.resolved` | manual | `{caseId, reasonCode, resolvedBy}` | reliability signal |
| `client.lifecycle.case.completed` | resolveLifecycleCase (success) | `{caseId, caseKind, completedItems, sideEffectsRequired}` | **cascade** consumers (instantiateClient, archiveClient, revokeAccess) |
| `client.lifecycle.case.cancelled` | resolveLifecycleCase (cancel) | `{caseId, reason}` | UI, BQ projection |
| `client.lifecycle.blocker.overridden` | force-close | `{caseId, blockerReasonCodes, overrideReason, overriddenBy}` | reliability signal, audit alert |

Cada event documentado en `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` Delta sección "TASK Client Lifecycle V1.0".

---

## 11. HubSpot Integration

### 11.1 Trigger semi-automático (decision #2)

Cuando llega webhook HubSpot deal stage `closedwon`:

1. Webhook handler en `src/lib/webhooks/handlers/hubspot-deals.ts` (nuevo) procesa event
2. Lookup del client/organization vía `hubspot_company_id`
3. Si NO existe caso activo de onboarding → `provisionClientLifecycle({caseKind: 'onboarding', triggerSource: 'hubspot_deal', status='draft'})`
4. Genera notificación al equipo comercial: "HubSpot deal cerrado, hay onboarding en draft pendiente de activación"
5. Operador entra a `/admin/clients/[orgId]/lifecycle`, revisa, activa (transición draft → in_progress)

### 11.2 Trigger semi-automático para offboarding

Cuando llega webhook HubSpot deal stage `closedlost` o property change `lifecyclestage=churned`:

1. Webhook handler propone `deprovisionClientLifecycle({status='draft', triggerSource='churn_signal'})`
2. Pre-flight detecta blockers
3. Operador revisa + activa

### 11.3 Bidireccional (V1.1+)

V1.0 NO escribe de vuelta a HubSpot. V1.1 puede emitir property updates (`greenhouse_lifecycle_case_status`) para visibilidad sales-side.

---

## 12. UI Surfaces

### 12.1 `/admin/clients/[orgId]/lifecycle` — drawer

Vista principal del caso activo. Compone:
- Header: case_kind, status, effective_date, target_completion_date, owner, days_open
- Banner si `status='blocked'`: lista de `blocked_reason_codes` con CTAs
- Checklist: items agrupados por `owner_role`, status visible (pending/in_progress/blocked/completed), evidence upload inline
- Timeline lateral: `client_lifecycle_case_events` últimos 20
- Botones: "Activar" (draft → in_progress), "Resolver caso" (con confirmación + override flag), "Cancelar caso"

### 12.2 `/admin/clients/lifecycle` — listing global

Tabla con filtros: status, case_kind, owner_role, overdue (target_completion_date < today). Cursor-based pagination.

### 12.3 Banner en `/admin/clients/[orgId]` (página principal del cliente)

Si hay caso activo, mostrar banner: "Onboarding en progreso desde X (60% completado, 3 items pendientes)" + CTA "Ver progreso".

### 12.4 Dashboard tile en `/admin/operations`

KPI tiles:
- Onboardings en progreso
- Onboardings overdue
- Offboardings blocked
- Offboardings completados últimos 30d

Mockup primero antes de implementar (TASK greenhouse-mockup-builder).

---

## 13. Reliability Signals

Subsystem rollup: `Commercial Health` (extender el subsystem existente).

| Signal | Kind | Severity | Steady | Detecta |
|---|---|---|---|---|
| `client.lifecycle.onboarding_stalled` | drift | warning | 0 | onboarding cases en `in_progress` > 14 días sin avance de items |
| `client.lifecycle.offboarding_blocked_overdue` | drift | error | 0 | offboarding cases en `blocked` > 30 días |
| `client.lifecycle.checklist_orphan_items` | data_quality | error | 0 | items con `template_code` o `item_code` no presentes en `client_lifecycle_checklist_templates` activos |
| `client.lifecycle.cascade_dead_letter` | dead_letter | error | 0 | outbox events de cascade en `dead_letter` |
| `client.lifecycle.blocker_override_anomaly_rate` | drift | warning | <3/30d | tasa de overrides > umbral en últimos 30 días (posible misuse del override) |
| `client.lifecycle.case_without_template` | data_quality | error | 0 | casos con `template_code` no presente en templates registrados |

Readers en `src/lib/reliability/queries/client-lifecycle-*.ts`. Wire-up en `getReliabilityOverview`.

---

## 14. Defense in Depth (7 layers — TASK-742 template)

| Layer | Mechanism |
|---|---|
| 1. DB constraints | CHECK status enum, CHECK case_kind enum, CHECK reason length, UNIQUE partial active per kind, FK integrity |
| 2. Application guard | Capability checks server-side, validators en commands, transition matrix enforced |
| 3. UI affordance | Botones desactivados según estado, tooltip explica blocker, evidence upload obligatorio para items con `requires_evidence` |
| 4. Reliability signals | 6 signals listed §13, alerts a operador |
| 5. Audit log | `client_lifecycle_case_events` append-only con anti-UPDATE/DELETE triggers |
| 6. Approval workflow | `override_blocker` capability restringida a EFEONCE_ADMIN + reason ≥ 20 chars |
| 7. Outbox events v1 | Async cascade con dead_letter; consumers reactivos idempotentes |

---

## 15. 4-Pillar Score

### Safety
- **Qué puede salir mal**: cerrar offboarding con invoices abiertas → cliente "fantasma" en P&L; auto-trigger por misclick HubSpot dispara side-effects irreversibles; override de blocker abusado
- **Gates**: capability granular (3 niveles, override solo EFEONCE_ADMIN); CHECK DB para required items + blockers; UI desactivada; semi-automatic trigger (operator-in-the-loop)
- **Blast radius si falla**: un cliente. No cross-tenant.
- **Verificado por**: tests de transición ilegal, capability scoping, anomaly rate signal sobre overrides
- **Riesgo residual**: override existe para casos legítimos (pago offline confirmado fuera del sistema). Mitigado con audit + reason ≥ 20 + anomaly signal + restricción a EFEONCE_ADMIN

### Robustness
- **Idempotencia**: UNIQUE partial `(organization_id, case_kind) WHERE status NOT IN (completed, cancelled)` previene casos duplicados; commands re-llaman seguros
- **Atomicidad**: case + checklist + event + outbox en una sola transacción (Kysely `withTransaction`)
- **Race protection**: SELECT FOR UPDATE sobre case_id en transiciones; UNIQUE partial garantiza un activo por kind
- **Constraint coverage**: 6 CHECK constraints + 4 FK + UNIQUE partial + 2 anti-UPDATE/DELETE triggers
- **Verificado por**: tests de doble-apertura concurrente, tests de transición a completed con items pendientes (debe fallar), tests de override sin capability (debe fallar)

### Resilience
- **Retry policy**: cascade events vía outbox + reactive consumer con backoff exponencial (TASK-771/773)
- **Dead letter**: outbox `status='dead_letter'` + reliability signal `client.lifecycle.cascade_dead_letter`
- **Reliability signal**: 6 signals listed §13
- **Audit trail**: `client_lifecycle_case_events` append-only inmutable
- **Recovery**: script `pnpm tsx scripts/client-lifecycle/replay-case-events.ts <caseId>` idempotente; outbox replay vía endpoint admin

### Scalability
- **Hot path Big-O**: O(log n) por PK + composite indexes
- **Cardinalidad**: ~50-200 cases/año actualmente; 10-15 items/case → ~3K rows/año máximo. Trivial.
- **Async paths**: cascade a engagement_outcomes, archive client, revoke access — todo via outbox
- **Cost a 10x**: lineal trivial; partitioning no necesario en V1
- **Pagination**: cursor-based en listing global; queries hot path indexed

---

## 16. Hard Rules (anti-regression)

- **NUNCA** transicionar `clients.status='active'` a `inactive` sin un `client_lifecycle_case` resuelto. CHECK constraint en `clients` + trigger.
- **NUNCA** cerrar offboarding con `blocked_reason_codes` no vacíos sin pasar por `override_blocker` capability.
- **NUNCA** crear un segundo case activo del mismo kind para la misma organization. UNIQUE partial.
- **NUNCA** UPDATE/DELETE sobre `client_lifecycle_case_events`. Triggers append-only enforced en DB.
- **NUNCA** materializar checklist sin `template_code`. CHECK + FK enforce.
- **NUNCA** loggear `reason`, `cancellation_reason`, `override_reason` raw — pasar por `redactSensitive`. Pueden contener PII.
- **NUNCA** auto-trigger HubSpot deal → activar caso. Solo crear en `status='draft'` para revisión humana.
- **NUNCA** modificar template existente; crear nueva versión (`standard_onboarding_v2`) y deprecar la vieja vía `effective_to`.
- **NUNCA** `Sentry.captureException` directo en code paths de lifecycle. Usar `captureWithDomain(err, 'commercial', ...)`.
- **NUNCA** invocar `instantiateClientForParty` o `archiveClientForParty` directo desde UI; siempre como cascade del case completion.
- **SIEMPRE** declarar templates como append-only (versionados) — los casos snapshot el `template_code` al abrirse para preservar integridad histórica.
- **SIEMPRE** emit outbox event v1 en cada transición; consumers reactivos hacen el resto async.
- **SIEMPRE** validar `evidence_asset_id` server-side cuando `requires_evidence=TRUE`. UI no es la fuente de verdad.
- **SIEMPRE** scoping de capability per `owner_role` del item al avanzar checklist (commercial no puede avanzar items de finance, etc.).

---

## 17. Dependencies & Impact

### Depende de
- `greenhouse_core.organizations` + `clients` (TASK-535) ✅ existe
- `services` + `engagement_phases/outcomes` (TASK-801/803) ✅ existe
- `assets` + `<GreenhouseFileUploader>` (TASK-721) ✅ existe — para evidence
- `outbox_events` + ops-worker reactive consumer (TASK-771/773) ✅ existe
- Capability platform (TASK-403) ✅ existe
- `redactErrorForResponse` + `captureWithDomain` (TASK-742 helpers) ✅ existe

### Impacta a (lecturas / cascade)
- `engagement_outcomes` — al cerrar offboarding, emite outcome `cancelled_by_client` o `cancelled_by_provider` per item resolution
- `client_users` — al cerrar offboarding, revoke access vía outbox consumer
- `commercial_cost_attribution_v2` — TASK-806 derivation usa `attribution_intent`; offboarding affecta el período de atribución
- `clients.status` — transición a `inactive` solo via case completion
- `organizations.lifecycle_stage` — transición a `inactive`/`churned` solo via case completion (gate adicional sobre TASK-535)

### Out of scope V1.0 (explícito)
- **Final invoice del cliente** (V1.1 → `client_final_settlement` table)
- **Bidireccional HubSpot** (escribir property `greenhouse_lifecycle_case_status` a HubSpot deal)
- **Automation Notion archive** (V1.0 es operator-driven con evidence upload)
- **Multi-space onboarding granularity** (V1.0 asume 1 case = 1 organization; multi-space queda para V2)
- **Automation Teams provisioning** (V1.0 es operator-driven)
- **Onboarding/offboarding de proveedores** (este spec es solo cliente; proveedor lifecycle queda para spec separado)
- **Auto-recovery del case si webhook HubSpot llega después** (V1.0 manual reconciliation)

---

## 18. Roadmap by Slices

| Slice | Alcance | Estimación |
|---|---|---|
| **V1.0 Slice 1 — DDL + state machine** | 3 tablas + triggers + 3 templates seed (10+10+5 items) | 1 migration + types regen |
| **V1.0 Slice 2 — Comandos canónicos** | `provisionClientLifecycle` + `deprovisionClientLifecycle` + `advanceLifecycleChecklistItem` + `resolveLifecycleCase` + 8 outbox events v1 | tests concurrencia + idempotencia + override |
| **V1.0 Slice 3 — API + capabilities** | 6 endpoints + 6 capabilities + redaction + audit | tests permission por owner_role |
| **V1.0 Slice 4 — UI drawer + listing** | drawer `/admin/clients/[id]/lifecycle` + listing `/admin/clients/lifecycle` + banner | mockup builder primero |
| **V1.0 Slice 5 — Reliability + cascade consumers** | 6 reliability signals + reactive consumers (cascade engagement_outcomes, revoke client_users, archive client) | dead_letter signal |
| **V1.0 Slice 6 — HubSpot trigger semi-automático** | webhook handler para deal stage changes + draft case creation + notificación | feature flag para staged rollout |
| **V1.1 Slice 7 — Final billing closure** | `client_final_settlement` table + flow integrado al checklist offboarding | depende de finance ops alignment |
| **V1.1 Slice 8 — Bidireccional HubSpot** | property updates desde Greenhouse a HubSpot deal | requires API write scope |
| **V1.2 Slice 9 — Multi-space onboarding** | un case puede cubrir múltiples spaces del mismo cliente | requires V2 review |

---

## 19. Open Questions (post-V1.0, requieren input de stakeholders)

1. **Final billing del cliente (V1.1)**: ¿se modela como `client_final_settlement` mirror exacto de `final_settlements` workforce, o como entidad más liviana que solo registra confirmación + link a invoice IDs en `greenhouse_finance.income`?
2. **Onboarding overdue threshold**: 14 días default — ¿sirve para Globe clients (proceso largo) y Efeonce internal (proceso corto)? Configurable por tenant?
3. **Reactivation lineage**: si un cliente fue offboardeado en 2024 y reactivado en 2026 con un nuevo HubSpot company (no el original), ¿el `previous_case_id` apunta al case viejo o queda NULL? Recomienda decisión data-driven cuando llegue el primer caso real.
4. **Notion automation V1.1**: ¿la automation de archive Notion vale el esfuerzo dado el volumen bajo (~10 churns/año)? Reevaluar al cierre de V1.0.
5. **Provider lifecycle**: spec separado o extender este con `case_role IN ('client','provider')`? Recomendación inicial: spec separado para no inflar este.

---

## 20. Glossary

| Término | Definición |
|---|---|
| **Case** | Instancia única de un proceso de lifecycle (onboarding/offboarding/reactivation) anclada a una organization |
| **Checklist item** | Tarea humana materializada desde template, con owner_role, status, evidence opcional |
| **Template** | Definición declarativa append-only de los items que componen un kind de caso. Versionada via `effective_from/to` |
| **Blocker** | Razón formal por la cual un caso no puede progresar. Catalogado en `blocked_reason_codes`. Ej: `pending_invoice` |
| **Override** | Acción excepcional de cerrar un caso con blockers pendientes, restringida a EFEONCE_ADMIN + reason ≥ 20 chars |
| **Cascade** | Efectos downstream del case completion, propagados via outbox events a consumers reactivos |
| **Reactivation lineage** | Cadena `case → previous_case_id → previous_case_id` que preserva forensic trail de reapertura del cliente |

---

## 21. References

- `GREENHOUSE_360_OBJECT_MODEL_V1.md` — canonical 360 anchor (organizations, clients)
- `GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` — máquina de estados de identidad TASK-535
- `GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md` — engagement primitives TASK-801/802/803
- `GREENHOUSE_WORKFORCE_ONBOARDING_ARCHITECTURE_V1.md` — patrón espejo TASK-760 (workforce side)
- `GREENHOUSE_AUTH_RESILIENCE_V1.md` — TASK-742 7-layer template
- `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — registry de signals y subsystem rollup
- `GREENHOUSE_EVENT_CATALOG_V1.md` — outbox events catalog (este spec agrega 8 nuevos v1)
- `CLAUDE.md` — convenciones operativas (capability platform, outbox patterns, redaction, captureWithDomain)
