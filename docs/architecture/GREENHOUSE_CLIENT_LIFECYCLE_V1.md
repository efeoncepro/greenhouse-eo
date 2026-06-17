# Greenhouse Client Lifecycle Architecture V1

> **Version:** 1.0
> **Created:** 2026-05-07 por Claude (Opus 4.7)
> **Audience:** Backend engineers, product owners, agentes que implementen onboarding/offboarding/reactivación de clientes, operadores comerciales, finance ops
> **Related:** `GREENHOUSE_360_OBJECT_MODEL_V1.md`, `GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md`, `GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md`, `GREENHOUSE_WORKFORCE_ONBOARDING_ARCHITECTURE_V1.md`, `GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md`, `GREENHOUSE_EVENT_CATALOG_V1.md`, `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`, `GREENHOUSE_AUTH_RESILIENCE_V1.md`
> **Supersedes:** ninguno (spec nuevo)

---

## 0. Status

Contrato arquitectónico nuevo desde 2026-05-07. **Implementada (onboarding) por TASK-992 — 2026-06-03**: el aggregate `client_lifecycle_case`, los comandos canónicos (`provisionClientLifecycle`, `advanceLifecycleChecklistItem`, `resolveLifecycleCase`, `addLifecycleBlocker`/`resolveLifecycleBlocker`), la API §9, las capabilities §8 (colapsadas a ROLE_CODES reales — anti-rol-fantasma TASK-935), los 8 eventos v1 §10 y 5 de los 6 reliability signals §13 están live en `develop` detrás del flag `CLIENT_LIFECYCLE_ONBOARDING_ENABLED`. Alcance V1.0: `caseKind='onboarding'` (+ scaffolding `reactivation`); `offboarding` y el `offboarding_blocked_overdue` signal quedan diferidos a una task derivada. El wizard (puerta única) + el timeline Account 360 + la redefinición del drawer Finanzas son Slices 2-3 de TASK-992. Ajustes vs el contrato DDL: `organization_id` es TEXT (no UUID); el user FK es `greenhouse_core.client_users(user_id)` (no existe `greenhouse_core.users`); `template_code` es columna snapshot (no FK, porque templates usa PK compuesta).

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

## Delta 2026-06-04 — TASK-1009: ítem bloqueante `verify_notion_flowing` + preflight de flujo

Se agregó al checklist `standard_onboarding_v1` un 11º ítem **`verify_notion_flowing`** (required, `blocks_completion=TRUE`, `owner_role='operations'`, `requires_evidence=FALSE`) vía migración aditiva `20260604224502258` (`ON CONFLICT DO NOTHING` + guard anti-marker). Garantiza que ningún onboarding se complete hasta que las tareas del cliente **fluyan de verdad al portal** (no solo "Notion configurado").

- **Composer canónico** (NO duplica validación): `getNotionOnboardingReadiness(spaceId)` en `src/lib/integrations/notion-onboarding-preflight.ts` compone helpers existentes (`getNotionRawFreshnessGate` #3/#5, `space_notion_sources.last_synced_at` de TASK-1007 #9, `resolveSecretByRef` #1) + agrega los eslabones que ninguno cubría: **Estado mapeable a vocabulario V1** (#6, `normalizeTaskStatus` sobre los estados distintos del space en `notion_ops.tareas`), **tareas en `greenhouse_delivery.tasks`** (#8) y verificación de **client_id** (#4, ya garantizado por TASK-1004). Evaluador puro `evaluateNotionOnboardingReadiness` + degradación honesta + `readyToOnboard` conservador.
- **Auto-complete gated**: `POST /api/admin/clients/lifecycle/cases/[caseId]/notion-preflight` (capability reusada `client.lifecycle.case.advance`) corre el preflight server-side y avanza el ítem **solo si `readyToOnboard`** — el operador no puede marcarlo verde estando rojo. El space se resuelve del caso server-side (anti-tamper). Casos previos a la migración (sin el ítem) no se ven afectados.
- **CLI** read-only `pnpm notion:onboarding-preflight <spaceId> [--json]`. **Signal** `integrations.notion.onboarding_incomplete` (kind `data_quality`, moduleKey `integrations.notion`, warning si >0, steady 0) — COUNT PG O(1) de onboardings abiertos con el ítem pendiente >7d; NO corre el preflight pesado por caso.
- **Hard rule**: NUNCA agregar aliases de status/título por cliente para "pasar" el check L1 — el fix es alinear el template L1 en Notion (consistente con "Canonical task status vocabulary V1"). Verificado live: Berel 9/9 verde.

Spec: `docs/tasks/complete/TASK-1009-notion-onboarding-flow-preflight.md`.
- `GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` — máquina de estados de identidad TASK-535
- `GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md` — engagement primitives TASK-801/802/803
- `GREENHOUSE_WORKFORCE_ONBOARDING_ARCHITECTURE_V1.md` — patrón espejo TASK-760 (workforce side)
- `GREENHOUSE_AUTH_RESILIENCE_V1.md` — TASK-742 7-layer template
- `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — registry de signals y subsystem rollup
- `GREENHOUSE_EVENT_CATALOG_V1.md` — outbox events catalog (este spec agrega 8 nuevos v1)
- `CLAUDE.md` — convenciones operativas (capability platform, outbox patterns, redaction, captureWithDomain)

---

## Invariantes operativos para agentes — Client lifecycle/onboarding (TASK-991…1017)

> **Relocados de `CLAUDE.md` por TASK-1160 (2026-06-16), verbatim — cero cambio semántico.** Espejo operativo (NUNCA/SIEMPRE) que un agente carga al tocar este dominio; el contrato técnico vive en su spec. Dedup = TASK-1160 Slice 4.

### Canonical Organization Write SSOT invariants (TASK-991, desde 2026-06-02)

TODA derivación de `organization_type` pasa por `deriveOrganizationType` (`src/lib/account-360/organization-type.ts`, SSOT) y TODA escritura de la fila `greenhouse_core.organizations` que toque `organization_type`/`lifecycle_stage` reconcilia ambos. Cierra el bug class fuente (Grupo Berel): las puertas se repartían las columnas de `organizations` sin SSOT — la puerta HubSpot (`createPartyFromHubSpotCompany`) escribía `lifecycle_stage`+`hubspot_company_id` pero NUNCA `organization_type`/`tax_id`/`country`/`legal_name`, dejando `active_client` con `organization_type='other'` (invisible en Finanzas) + `country='CL'` ciego (Berel es MX) + `public_id` NULL.

- `organization_type` y `lifecycle_stage` son ortogonales pero deben reconciliarse: `active_client ⇒ client/both`, `provider_only ⇒ supplier`, dual ⇒ `both`, prospect/opportunity ⇒ `other`. `deriveOrganizationType({lifecycleStage, hasClientRole, hasSupplierRole, currentType})` es la ÚNICA fuente (reemplaza `promoteToClientCapableType` inline). NUNCA degrada un rol ya adquirido. NO incluye `efeonce_internal` (la operating entity usa el flag `is_operating_entity`, no `organization_type`).
- **Los TRES writers de `organization_type`** lo derivan: (1) `upsertCanonicalOrganization` (`organization-identity.ts`, writer canónico de las puertas finance/supplier — siempre deriva, no gated), (2) `createPartyFromHubSpotCompany` (puerta HubSpot INSERT — gated), (3) `promoteParty` (`commands/promote-party.ts`, reconcilia el type en el MISMO UPDATE al promover a active_client/provider_only — gated). `promoteParty` es el ÚNICO writer de `lifecycle_stage` (sweeps/overrides funnelean por él).
- `deriveOrganizationType` NO es columna GENERATED (necesita inputs de rol que no viven solo en el lifecycle). Es columna gobernada por los writers + 4 signals (drift) + un CHECK DB `organizations_type_lifecycle_consistent` **diferido a post-release** (ver abajo). Defense-in-depth en producción inmediata: writers (app, default ON) + signals; el CHECK es la capa DB que se agrega cuando el código nuevo está en TODOS los runtimes.
- `upsertCanonicalOrganization` llena `public_id` + `origin` en cada INSERT. Modo `overrideIdentity` (remediación dirigida, ej. country CL→MX) sobreescribe identidad provista; default COALESCE preserva (no-regresión).
- `country`/`tax_id` se derivan del origin, NUNCA default ciego. La puerta HubSpot propaga `crm.companies.country_code` (NULL honesto si falta), no el default de columna `'CL'`. `tax_id` queda operator-supplied (HubSpot no trae RFC confiable).
- 4 reliability signals (subsystem `Commercial Health`, steady=0): `commercial.organization.type_lifecycle_drift` (error>0), `commercial.organization.incomplete_identity` (warning, acotado a client-grade — NO a prospects), `commercial.client.active_without_profile`, `commercial.client.active_without_space`.
- **Kill-switch `CLIENT_BIRTH_CANONICAL_WRITE_ENABLED` (default ON)**: gatea el comportamiento corrector de la puerta HubSpot (INSERT) + `promoteParty` (UPDATE). Default ON = la escritura correcta es el comportamiento por defecto en TODOS los runtimes sin setear env por runtime (evita el drift dual-env, que es la clase de bug que esta task combate). Solo `=false` lo apaga (emergencia). El helper finance/supplier NO está gated (siempre canónico).
- **CHECK `organizations_type_lifecycle_consistent` — DIFERIDO a post-release (hazard de deploy-ordering)**: `active_client ⇒ organization_type IN (client,both)`. NO está aplicado en la DB (el Cloud SQL `greenhouse-pg-dev` es compartido por TODOS los runtimes; aplicarlo mientras producción corre el código viejo —que aún escribe `active_client+other`— rompería el HubSpot sync de prod con un CHECK violation). Sin el CHECK, los writes legacy del código viejo siguen permitidos → la ventana de deploy es segura (código nuevo escribe canónico, código viejo escribe legacy-pero-permitido; el signal `type_lifecycle_drift` lo cubre). Se aplica como **paso manual post-develop→main** (cuando el código nuevo esté en prod), como su propia migración `pnpm migrate:create`. SQL canónico: `ALTER TABLE greenhouse_core.organizations ADD CONSTRAINT organizations_type_lifecycle_consistent CHECK (lifecycle_stage IS DISTINCT FROM 'active_client' OR COALESCE(organization_type,'other') IN ('client','both')) NOT VALID;` luego `VALIDATE CONSTRAINT` (idempotente, guarded). Owner del DROP/ADD = `greenhouse_ops`.
- Remediación de orgs a medias: SIEMPRE vía `scripts/commercial/remediate-half-baked-orgs.ts` (dry-run/apply/allowlist/actor/reason/expected-count abort), que pasa por `upsertCanonicalOrganization`. NUNCA SQL directo.

**⚠️ Reglas duras**:

- **NUNCA** escribir `greenhouse_core.organizations` (account-360 doors) fuera de `upsertCanonicalOrganization`. Toda puerta es caller.
- **NUNCA** hand-setear `organization_type` inconsistente con el lifecycle. Usar `deriveOrganizationType`. Cualquier writer nuevo de `lifecycle_stage='active_client'` DEBE setear el type en el mismo statement (sino, cuando el CHECK post-release esté activo, lo rechaza).
- **NUNCA** dejar `lifecycle_stage='active_client'` con `organization_type='other'`. Los writers lo reconcilian; el signal lo detecta; el CHECK (DB, post-release) lo bloquea.
- **NUNCA** default ciego `'CL'` en escrituras de sync. Derivar del origin; NULL explícito si falta.
- **NUNCA** aplicar el CHECK `organizations_type_lifecycle_consistent` contra el Cloud SQL compartido mientras producción corra el código viejo (pre develop→main). Es el hazard de deploy-ordering que rompería el HubSpot sync de prod. Aplicarlo SOLO post-release, cuando el código nuevo esté en todos los runtimes. Una vez activo el CHECK: **NUNCA** apagar el kill-switch (`=false`) sin dropear primero el CHECK (la puerta legacy volvería a producir `active_client+other` → rechazo).
- **SIEMPRE** que emerja una puerta nueva de nacimiento de org, hacerla caller del helper SSOT + setear `origin`.

**Spec canónica**: `docs/tasks/in-progress/TASK-991-canonical-client-birth-lifecycle.md` + audit `docs/audits/client-lifecycle/CLIENT_BIRTH_FRAGMENTATION_AUDIT_2026-06-02.md`. Migración aplicada: `20260602144943699` (origin, additivo seguro). CHECK `organizations_type_lifecycle_consistent` = paso manual post-release (no migración auto-aplicable, por el deploy-ordering). Orquestador lifecycle + wizard = TASK-992.

### Client Lifecycle Orchestrator invariants (TASK-992, onboarding V1.0 desde 2026-06-03)

`greenhouse_core.client_lifecycle_cases` es el agregado canónico del ciclo de vida del cliente (`onboarding | offboarding | reactivation`) — espejo comercial de TASK-760 (offboarding de colaboradores). V1.0 implementa SOLO `onboarding` (+ scaffolding `reactivation`); `offboarding` queda diferido. Vive detrás del flag `CLIENT_LIFECYCLE_ONBOARDING_ENABLED` (default OFF — el código está live en `develop`, las tablas vacías no se consumen). Implementa `GREENHOUSE_CLIENT_LIFECYCLE_V1` §5-§13 verbatim. Módulo: `src/lib/client-lifecycle/` (barrel pure: `types.ts` + `state-machine.ts`; `store.ts` + `commands/**` + `api-helpers.ts` son server-only, importados directo — patrón TASK-822).

**4 tablas** (`greenhouse_core`): `client_lifecycle_cases` (aggregate + state machine), `client_lifecycle_case_events` (append-only, anti-UPDATE/DELETE triggers), `client_lifecycle_checklist_templates` (declarativo, versionado, append-only), `client_lifecycle_checklist_items` (snapshot materializado al abrir). Migración `20260603004341038`. Seed `standard_onboarding_v1` (10 items §5.5 verbatim). Defensa-en-profundidad DB: CHECK status/kind enums + UNIQUE partial (un caso activo por `(organization_id, case_kind)`) + trigger `client_lifecycle_case_transition_check` (matriz §6.3 + gate "no completar con required+blocking pendientes salvo override vía `SET LOCAL app.client_lifecycle_blocker_override='true'`").

**5 comandos canónicos** (`commands/**`, atómicos + idempotentes + outbox v1, dual-mode `client?: PoolClient`): `provisionClientLifecycle` (idempotente por `(org, kind)`), `advanceLifecycleChecklistItem`, `resolveLifecycleCase`, `addLifecycleBlocker`/`resolveLifecycleBlocker`. Cada mutación appendea `client_lifecycle_case_events` + emite el evento `client.lifecycle.*` v1 **dentro de la misma tx**. El cascade del `.completed` (onboarding) invoca `instantiateClientForParty` si no existe (swallow `OrganizationAlreadyHasClientError`).

**⚠️ Reglas duras**:

- **NUNCA** escribir `greenhouse_core.organizations` desde el lifecycle. El org row es exclusivo de `upsertCanonicalOrganization` (TASK-991), invocado por el wizard composer (Slice 2) ANTES de `provisionClientLifecycle(organizationId)`. El lifecycle recibe un `organizationId` ya existente.
- **NUNCA** invocar `instantiateClientForParty` ni `archiveClientForParty` directo desde UI/route — siempre como cascade del case completion (o desde el wizard composer en su propia tx).
- **NUNCA** UPDATE/DELETE sobre `client_lifecycle_case_events` (triggers append-only). Para correcciones, INSERT nueva fila.
- **NUNCA** transicionar el case fuera de la matriz §6.3. La transición se valida en TS (`assertCaseTransition`) Y en el trigger DB (defensa-en-profundidad). `completed`/`cancelled` son terminales.
- **NUNCA** completar un caso con ítems required+blocking pendientes sin pasar por `overrideBlockers` (capability `client.lifecycle.case.override_blocker`, EFEONCE_ADMIN only, `overrideReason >= 20`). El trigger DB lo bloquea salvo el session var de override.
- **NUNCA** materializar checklist sin `template_code` activo. El comando lee `readActiveTemplateItems`; el signal `client.lifecycle.case_without_template` detecta drift. `template_code` es columna snapshot (no FK — templates usa PK compuesta).
- **NUNCA** modificar un template existente; crear versión nueva (`standard_onboarding_v2`) + deprecar la vieja vía `effective_to`. Los casos snapshot el template al abrirse.
- **NUNCA** loggear `reason`/`cancellation_reason`/`override_reason` raw — usar `redactSensitive` / `captureWithDomain(err, 'commercial', { tags: { source: 'client_lifecycle' } })`. NUNCA `Sentry.captureException` directo.
- **NUNCA** error API crudo: las rutas usan `authorizeLifecycle(capability)` + `mapLifecycleError` (es-CL, `redactErrorForResponse` en el path 502).
- **NUNCA** seedear una capability `client.lifecycle.case.*` sin grant en `runtime.ts` mismo PR. Grants colapsados a ROLE_CODES reales (anti-rol-fantasma TASK-935): open/resolve → EFEONCE_ADMIN + FINANCE_ADMIN; advance/read → route_groups `commercial`/`finance` + admins; override_blocker → EFEONCE_ADMIN only. La spec V1 §8 menciona `commercial_admin`/`operations` que NO existen.
- **SIEMPRE** que un comando nuevo mute el case, emitir el evento `client.lifecycle.*` v1 + appendear el case_event en la misma tx. 5 reliability signals (subsystem Commercial Health, steady=0; override anomaly steady<3/30d): `onboarding_stalled`, `checklist_orphan_items`, `cascade_dead_letter`, `case_without_template`, `blocker_override_anomaly_rate`.

**Capabilities**: `client.lifecycle.case.{open,advance,resolve,override_blocker,read}` (módulo `commercial`). API §9: `GET/POST /api/admin/clients/[organizationId]/lifecycle[/onboarding]`, `PATCH /api/admin/clients/lifecycle/cases/[caseId]/items/[itemCode]`, `POST .../resolve`, `GET .../cases`, `GET .../health`. Eventos: 8 `client.lifecycle.*` v1 (EVENT_CATALOG Delta 2026-06-03).

**Slice 2 (puerta única / wizard) — desde 2026-06-03**: el composer canónico `provisionClientFromWizard` (`src/lib/client-lifecycle/commands/provision-client-from-wizard.ts`) es la ÚNICA puerta de alta de cliente: en UNA tx atómica hace `upsertCanonicalOrganization` (SSOT TASK-991, identidad + client role) → `instantiateClientForParty` (Cliente + `client_profiles` con moneda de facturación, **incl. MXN**) → `promoteParty('active_client')` (**único writer canónico de `lifecycle_stage` + history**; su instantiate interno es no-op porque el cliente ya existe → preserva el perfil MXN) → `provisionClientLifecycle` (abre el caso). Endpoint: `POST /api/admin/clients/lifecycle/provision`. La moneda se valida contra `CURRENCY_DOMAIN_SUPPORT.finance_core ∪ {UF,UTM}` (derivada del registry, NO hardcode); `billingDefaults.paymentCurrency` widened a `CLP|USD|MXN|UF|UTM`. Pickers + gate "ya existe" buscan el backbone canónico vía `GET /api/admin/clients/lifecycle/org-search`. UI runtime: `/agency/clients/new` (`ClientOnboardingView`, gated por flag `CLIENT_LIFECYCLE_ONBOARDING_ENABLED` + capability `client.lifecycle.case.open`), **cableada 1:1 del mockup APROBADO por copy-and-patch** (mismo JSX → paridad visual estructural; solo cambian data + commit).

**⚠️ Reglas duras Slice 2**:
- **NUNCA** parir un cliente fuera de `provisionClientFromWizard` (o del cascade de `resolveLifecycleCase`). El wizard es la puerta única; el drawer de Finanzas se redefine a "completar facet" (Slice 2c, pendiente), NO pare.
- **NUNCA** escribir `lifecycle_stage` desde el composer salvo vía `promoteParty` (history + reconcile type). `upsertCanonicalOrganization` NO recibe `lifecycleStage` en este path.
- **NUNCA** instanciar el cliente DESPUÉS de `promoteParty` (su instantiate usaría CLP default). Orden canónico: upsert → instantiate(moneda) → promote.
- **NUNCA** hardcodear la moneda de facturación; validar contra el registry. `client_profiles.payment_currency` no tiene CHECK en PG (MXN ya aceptado).
- **NUNCA** modificar/borrar los `*/mockup/*` ni implementar el runtime dentro de `/mockup/`. El runtime vive en `src/views/greenhouse/agency/clients/*` (fuera de `/mockup/`) e **iguala visualmente** el mockup. Cualquier estado/visual NUEVO (loading/degraded de pickers, código del SuccessScreen, entrada de nav) pasa por el loop product-design (`state-design`/`modern-ui`/`greenhouse-ux`) + GVC `fe:capture:diff` ANTES de pintarse — NO freehand.
- **SIEMPRE** verificar paridad con `pnpm fe:capture:diff <mockup-capture> <runtime-capture>` antes de cerrar Slice 2.

**Pendiente Slice 2c + 3**: redefinir `CreateClientDrawer` → "completar facet financiero"; triggers HubSpot deal/adopt → onboarding case `draft`; timeline lifecycle en Account 360 (TASK-611). Ítems para el loop GVC: estados loading/degraded de pickers (`state-design`), código legible del caso en SuccessScreen (`public_id` en `client_lifecycle_cases`?), entrada de nav discoverable (exponer flag al menú client).

**Spec canónica**: `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md` + `docs/tasks/in-progress/TASK-992-client-lifecycle-orchestrator-single-front-door.md`. Patrón fuente: TASK-760 (offboarding de colaboradores). Migración: `20260603004341038`.

### Client Portal User Invitation SSOT (TASK-1001, desde 2026-06-03)

Toda creación de un usuario de portal cliente (`client_users` + `user_role_assignments` + email de invitación) pasa por el **helper canónico SSOT** `inviteClientPortalUser` (`src/lib/client-onboarding/invite-client-portal-user.ts`). Extraído de `/api/admin/invite` (que ahora lo consume con `onExisting:'error'`, preservando el 409). El onboarding lo consume con `onExisting:'ensure'` (idempotente: usuario existente → asegura rol additive, no duplica fila, no re-emaila). La invitación de personas del portal en el alta vive en el **ítem de checklist canónico existente `provision_client_users_access`** (NO se crea ítem paralelo) del timeline de onboarding (TASK-992), vía el `PortalUsersPanel` que siembra candidatos desde HubSpot (`listClientPortalPersonCandidates`) y sugiere rol por cargo (`suggestClientPortalRole`).

**⚠️ Reglas duras**:

- **NUNCA** crear `client_users` ni `user_role_assignments` por SQL inline para portal users. Pasar por `inviteClientPortalUser` (single source of truth, tx atómica, emite `role.assigned` v1 in-tx para los roles recién asignados).
- **NUNCA** asignar a un portal user un rol fuera de los 3 client_* (`client_executive`/`client_manager`/`client_specialist`). El helper valida `isRoleCode`; el endpoint valida `isClientPortalRole`. NUNCA un rol interno (collaborator/efeonce_*).
- **NUNCA** usar `updateUserRoles` para invitar (reemplaza el set completo → destructivo). La asignación es additive (`ON CONFLICT DO NOTHING` + RETURNING para detectar el alta real).
- **NUNCA** invitar en el wizard de nacimiento. Vive en el checklist de provisioning (separación de concerns — mismo principio Notion/Teams TASK-998).
- **NUNCA** gatear la invitación solo con `client.lifecycle.case.advance`. Capability dedicada **`client.lifecycle.portal_user.invite`** (least-privilege: invitar otorga ACCESO, distinto de avanzar bookkeeping). Listar candidatos usa `client.lifecycle.case.read`. Grant en `runtime.ts` al tier advance (commercial/finance route_group + admins) — `capability-grant-coverage.test.ts` lo enforce.
- **NUNCA** resolver el `client_id` del body en el endpoint de invite. Se resuelve server-side desde la org (`resolveAccountScope`, anti-tamper). Sin Cliente → degrada honesto `client_not_ready`.
- **SIEMPRE** sembrar candidatos desde los contactos HubSpot ya capturados; el operador confirma/ajusta rol. Idempotente (dedup por email).

**Spec canónica**: `docs/tasks/in-progress/TASK-1001-client-portal-people-provisioning-onboarding.md`. Helpers: `inviteClientPortalUser`, `suggestClientPortalRole`, `listClientPortalPersonCandidates` (`src/lib/client-onboarding/`). Sin migración (capability mirror de la familia TASK-992 catalog+runtime), sin reliability signal nuevo (ítem `required=FALSE`), sin evento nuevo (reuso `role.assigned`).

### Notion onboarding preflight — "configurado ≠ fluyendo" (TASK-1009, desde 2026-06-04)

La verificación de que un cliente nuevo **fluye de verdad al portal** (raw → client_id → readiness → template L1 → conformed → PG) pasa por el composer canónico `getNotionOnboardingReadiness(spaceId)` ([src/lib/integrations/notion-onboarding-preflight.ts](src/lib/integrations/notion-onboarding-preflight.ts)). Es **reuse-first**: compone los helpers de readiness/freshness que ya existen (`getNotionRawFreshnessGate`, `space_notion_sources.last_synced_at` de TASK-1007, `resolveSecretByRef`) y solo agrega los eslabones que ninguno cubría (#6 Estado mapeable a V1, #8 tareas en `greenhouse_delivery.tasks`, #4 client_id como verificación de TASK-1004). El evaluador puro `evaluateNotionOnboardingReadiness` es la SSOT de `readyToOnboard`. El gate es el ítem **bloqueante** `verify_notion_flowing` de `standard_onboarding_v1`.

**⚠️ Reglas duras**:

- **NUNCA** duplicar la validación de onboarding que el wizard/checklist ya hacen (estructura via `resolveClientCompleteness`, token+DBs via `notion/validate`). El preflight SOLO cubre el tramo "fluyendo" — si necesitás un check nuevo, agregalo como eslabón del composer, no como validador paralelo.
- **NUNCA** agregar aliases de status/título por cliente para "pasar" el check L1 (#6). El fix es alinear el template L1 del cliente en Notion (consistente con "Canonical task status vocabulary V1"). El check usa `normalizeTaskStatus` sobre los estados distintos del space — un alias custom enmascara el drift.
- **NUNCA** marcar `verify_notion_flowing` verde estando rojo. La auto-completación vive SOLO en `POST .../cases/[caseId]/notion-preflight` (reusa capability `client.lifecycle.case.advance`), que corre el preflight server-side y avanza el ítem **solo si `readyToOnboard`**. El space se resuelve del caso server-side (anti-tamper).
- **NUNCA** correr el preflight pesado (9 checks, BQ) por caso dentro del reliability dashboard. El signal `integrations.notion.onboarding_incomplete` es un COUNT PG O(1) sobre casos abiertos con el ítem pendiente >7d; el preflight pesado es on-demand (CLI/endpoint).
- **NUNCA** colapsar advisory y crítico: token (#1) y freshness (#9) son advisory (no bloquean `readyToOnboard` — el raw landing ya prueba el token); el resto es crítico. Un crítico en `degraded` (fuente caída) ⇒ NO listo (conservador).
- **SIEMPRE** que un eslabón nuevo del pipeline emerja (otra capa, otra tabla), agregalo como check del composer + su rama en el evaluador puro + test, no inline en consumers.

**Spec canónica**: `docs/tasks/complete/TASK-1009-notion-onboarding-flow-preflight.md` + Delta en `GREENHOUSE_CLIENT_LIFECYCLE_V1.md`. Migración aditiva `20260604224502258`. CLI `pnpm notion:onboarding-preflight <spaceId> [--json]`. Verificado live: Berel 9/9 verde.

### Onboarding checklist evidence layer — el estado se deriva de evidencia real, no se marca a ciegas (TASK-1017, desde 2026-06-05)

El estado de un ítem **auto-derivable** del checklist `standard_onboarding_v1` se deriva del estado REAL del runtime, no se marca a ciegas. La capa vive en `src/lib/client-lifecycle/evidence/` y extiende el patrón thin + reuse-first de TASK-1009 (`verify_notion_flowing`) a los 6 ítems auto-derivables: `verify_hubspot_company_synced`, `assign_team_members`, `provision_notion_workspace`, `provision_communication_channels`, `provision_client_users_access`, `confirm_billing_setup`. Cada resolver **reusa** el reader/tabla canónica existente (HubSpot `getClientLifecycleStage`, Notion `getNotionOnboardingReadiness`, equipo/Teams/portal/facturación por su tabla) y clasifica en **`detected | pending | unverifiable`** vía un clasificador **puro** (testeable) + gatherer IO `settle`-wrapped. El composer `resolveOnboardingEvidence(caseId)` resuelve el scope (org→client→space) **una vez** y corre los 6 en paralelo. El endpoint `POST .../cases/[caseId]/verify-evidence` (auth `client.lifecycle.case.advance`) expone la evidencia y, detrás de flag, auto-completa. Cero migración / capability / outbox / tabla.

**⚠️ Reglas duras**:

- **NUNCA** clasificar evidencia como `pending` cuando la fuente falló. Error de IO → `unverifiable` (degradación honesta; la fuente está caída, ≠ "todavía no está hecho"). El gatherer va envuelto en `settle`; el clasificador es puro y nunca lanza.
- **NUNCA** componer la evidencia de los ítems en el read del timeline/inbox (hot path de listas). Es **on-demand** (botón "Verificar evidencia" → un endpoint batched por caso). Componerla en el read = N+1 sobre BigQuery (el preflight Notion solo hace ~6 queries BQ). Mirror exacto de TASK-1009.
- **NUNCA** auto-completar un ítem sin pasar por `canAutoCompleteFromEvidence` (decisión pura SSOT): cierra SOLO si evidencia `detected` + `requires_evidence=false` + estado `pending`/`in_progress`. **Anti-fake-green** (jamás con `pending`/`unverifiable`); **respeta el override manual** (jamás sobre `completed`/`skipped`/`not_applicable`/`blocked`).
- **NUNCA** auto-completar un ítem `requires_evidence=true` (p.ej. `provision_notion_workspace`): la evidencia del sistema NO reemplaza el asset humano requerido → muestra la evidencia pero queda manual.
- **NUNCA** auto-derivar los ítems **declarativos** (`confirm_legal_documents`, `declare_engagement_kind`, `declare_commercial_terms`, `declare_engagement_phases`): no tienen fuente automática, siguen manuales, sin evidencia inventada. `isAutoDerivableItem` es la lista cerrada canónica.
- **NUNCA** activar el flag `ONBOARDING_ITEM_EVIDENCE_AUTOCOMPLETE_ENABLED=true` sin validar la evidencia contra la realidad en ≥1 caso real por resolver (production verification sequence). La exposición read va sin flag; el auto-complete (mutación) es lo gated.
- **NUNCA** crear un sync nuevo para un ítem auto-derivable: se **componen** los readers/tablas canónicas existentes. Si emerge un ítem nuevo, agregar su resolver al registry reusando su reader canónico.
- **SIEMPRE** que emerja un ítem auto-derivable nuevo, agregar (a) su `item_code` a `AUTO_DERIVABLE_ITEM_CODES`, (b) su resolver (clasificador puro + gatherer settle), (c) tests del clasificador, y (d) la rama PG-queryable al signal `client.lifecycle.evidence_detected_not_marked` si su evidencia vive en PG.

**Spec canónica**: `docs/tasks/complete/TASK-1017-onboarding-checklist-item-evidence-auto-verification.md`. Helpers: `resolveOnboardingEvidence`, `canAutoCompleteFromEvidence`, `isAutoDerivableItem` (`src/lib/client-lifecycle/evidence/`). Signal: `client.lifecycle.evidence_detected_not_marked` (commercial, drift, PG-only, steady=0). Patrón fuente: TASK-1009 (composer thin + evaluador puro + degradación honesta + auto-complete solo-si-verde).
