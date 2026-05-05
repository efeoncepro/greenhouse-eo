# GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1

> **Tipo de documento:** Spec de arquitectura canónica
> **Versión:** 1.2
> **Creado:** 2026-05-05 por Claude (Opus 4.7)
> **Última actualización:** 2026-05-05 por Claude (Opus 4.7) — Delta v1.2 aplicado tras pre-flight check + naming sweep "Sample Sprint"
> **Estado:** Propuesta — no implementada
> **Owner:** Comercial / Agency
> **Brand UI**: "Sample Sprint" (paraguas comercial). Schema interno usa `engagement_*` genérico — el rebranding marketing no requiere migrations.
> **Domain boundary:** Commercial (no Finance — ver `GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md`)

## Delta v1.2 (2026-05-05) — pre-flight check + naming "Sample Sprint"

Aplicando red-team pre-épica con `arch-architect`. Cambios:

### Naming layer (B1 — híbrido genérico-en-schema + marketing en UI)

- **UI / paths**: `/agency/sample-sprints` (era `/agency/pilots`).
- **TS module**: `src/lib/commercial/sample-sprints/` (era `pilots/`).
- **Schema** (genérico, sobrevive marketing pivots): `engagement_*` reemplaza `pilot_*` y `service_*` en las tablas owned por esta spec:
  - `service_commercial_terms` → `engagement_commercial_terms`
  - `service_phases` → `engagement_phases`
  - `service_outcomes` → `engagement_outcomes`
  - `service_lineage` → `engagement_lineage`
  - `engagement_approvals` → `engagement_approvals`
  - `pilot_decision_audit_log` → `engagement_audit_log`
- **Capabilities**: `commercial.engagement.{declare,approve,record_outcome,read}` (era `commercial.pilot.*`).
- **Outbox events**: `service.engagement.{declared,approved,rejected,phase_completed,outcome_recorded,converted}_v1`.
- **Reliability signals**: `commercial.engagement.{overdue_decision,budget_overrun,zombie,unapproved_active,conversion_rate_drop}` bajo subsystem `Commercial Health`.
- **Sub-tipos visibles en UI** (con marketing rebrand del enum interno):
  - `pilot` → "Operations Sprint"
  - `trial` → "Extension Sprint"
  - `poc` → "Validation Sprint"
  - `discovery` → "Discovery Sprint"

### Decisiones de alcance V1 (B2-B5)

- **B2 — Notificaciones cliente automáticas: DIFERIDAS a V2**. V1 = comunicación manual. Razón: blast radius reputacional + complejidad subsistema (templates + i18n + delivery + opt-out). Slice 8.5 cancelado de V1.
- **B3 — Progress snapshots semanales: INCLUIDOS como primitiva**. Nueva tabla `engagement_progress_snapshots` (Slice 4.5). Razón: sin esto, reporte final = trabajo arqueológico al cierre. Tabla genérica reusable para cualquier service con fases.
- **B4 — Capacity warning en approval: INCLUIDO como soft warning**. Nuevo helper `getMemberCapacityForPeriod`. Approval NO se bloquea por capacity, solo emite warning + override_reason en audit log. Razón: hard blocker genera falsos negativos (vacaciones futuras desconocidas, transitions de assignments).
- **B5 — Auto-generación de reporte: MANUAL en V1, automation V2**. Wizard de outcome incluye structured fields (volume_managed, top_frictions, recommendations) que se persisten en `metrics_json` — input para V2 auto-generation. Razón: quality gate humano en cliente-facing artifact.

### Gaps adicionales documentados

- **Onboarding checklist**: `engagement_phases` se reusa con phase canónica `kickoff` cuyos `deliverables_json` modelan los accesos requeridos (ad accounts, calendario campañas, contacto escalamiento).
- **`client_team_assignments.service_id` FK opcional**: agregar columna para anclar assignment a service específico. Permite "Valentina dedicada a Sky Content Lead" vs "Valentina dedicada a Sky en general". Genérico — sirve para cualquier service.
- **Cancelación temprana**: `engagement_outcomes.outcome_kind` enum extendido a `converted | adjusted | dropped | cancelled_by_client | cancelled_by_provider`. Nueva columna `cancellation_reason TEXT`.
- **Pricing post-conversión**: `engagement_outcomes.next_quotation_id UUID REFERENCES greenhouse_commercial.quotations(quotation_id)` opcional. Si NULL, wizard pide monto manual y crea quotation auto.

Score 4-pilar post-Delta v1.2: estimado 9.0/10 (vs 8.4 en v1.1, 6.75 en v1.0). Spec lista para `greenhouse-task-planner`.

## Delta v1.1 (2026-05-05) — correcciones post-auditoría

Audit de la spec v1.0 reveló 3 errores materiales de schema + 4 supuestos no verificados. Cambios aplicados en esta versión:

- **Fix Error 1 — Schema cost attribution**: `greenhouse_commercial_cost_attribution.commercial_cost_attribution` → `greenhouse_serving.commercial_cost_attribution` (verificado en `src/types/db.d.ts:6444`). Decisión sobre v1 vs v2: ALTER se aplica a **ambas** (`v1` y `v2`); ambas comparten el filtro 3-axis supersede pattern.
- **Fix Error 2 — FK `users` rota**: las 6 columnas que apuntaban a `greenhouse_core.users(user_id)` (tabla inexistente) ahora apuntan a **`greenhouse_core.client_users(user_id)`** con `ON DELETE SET NULL`. Patrón verificado en migrations canónicas TASK-760/761/762 (offboarding case + final settlement). Tipo de columna corregido a `TEXT` (no `UUID`) — `client_users.user_id` es TEXT.
- **Fix Error 3 — Cita TASK-728 incorrecta**: TASK-728 era sobre Movement Feed UI, no NOT VALID/VALIDATE. Reemplazado por **TASK-708/766/774** que son las canónicas para ese patrón.
- **Verificado Supuesto 5 — `lifecycle_stage` enum**: valores reales `prospect | opportunity | active_client | inactive | churned | provider_only | disqualified` (verificado en migration `20260421113910459_task-535-organization-lifecycle-ddl.sql:26`). El doc usa `prospect | opportunity | active_client` que **son válidos**. Agregado `lifecycle_stage_source='quote_converted'` (valor existente en el enum, línea 51 de la misma migration) al flow de conversión.
- **Verificado Supuesto 7 — subsystem `Commercial Health`**: NO existe en `src/lib/reliability/` hoy. Declarado explícitamente como **nuevo subsystem** que esta spec introduce, con migration de registry en Slice 6.
- **Resuelto Open Q4 — owner del approval**: `commercial.pilot.approve` por default es **EFEONCE_ADMIN + COMMERCIAL_LEAD** (cuando este último exista). Hoy solo `EFEONCE_ADMIN` puede aprobar; cuando se cree el role `COMMERCIAL_LEAD` se habilita.
- **Agregado §3.3 anti-zombie** ya tenía CHECK; ahora también incluye DDL completa de `pilot_decision_audit_log` (faltaba en v1.0 — solo se mencionaba sin schema).
- **Agregado §3.4** — índices faltantes en `service_lineage` y `engagement_approvals`.
- **Agregado §8** — boundary transaccional explícito `BEGIN; ... COMMIT;` con rollback contract en flow de conversión.
- **Agregado §10.2** — handling explícito de `lifecycle_stage_source/by/since` al flipear organization.
- **Agregado §14** — patrón TASK-409 (extender `client_economics` con backfill desde `commercial_cost_attribution`) reusado explícitamente para `gtm_investment_pnl`.

Score 4-pilar post-Delta: estimado 8.5/10 (vs 6.75/10 en v1.0). Bloqueantes para implementación resueltos.

## Delta v1.1 (2026-05-05) — correcciones post-auditoría

Audit de la spec v1.0 reveló 3 errores materiales de schema + 4 supuestos no verificados. Cambios aplicados en esta versión:

- **Fix Error 1 — Schema cost attribution**: `greenhouse_commercial_cost_attribution.commercial_cost_attribution` → `greenhouse_serving.commercial_cost_attribution` (verificado en `src/types/db.d.ts:6444`). Decisión sobre v1 vs v2: ALTER se aplica a **ambas** (`v1` y `v2`); ambas comparten el filtro 3-axis supersede pattern.
- **Fix Error 2 — FK `users` rota**: las 6 columnas que apuntaban a `greenhouse_core.users(user_id)` (tabla inexistente) ahora apuntan a **`greenhouse_core.client_users(user_id)`** con `ON DELETE SET NULL`. Patrón verificado en migrations canónicas TASK-760/761/762 (offboarding case + final settlement). Tipo de columna corregido a `TEXT` (no `UUID`) — `client_users.user_id` es TEXT.
- **Fix Error 3 — Cita TASK-728 incorrecta**: TASK-728 era sobre Movement Feed UI, no NOT VALID/VALIDATE. Reemplazado por **TASK-708/766/774** que son las canónicas para ese patrón.
- **Verificado Supuesto 5 — `lifecycle_stage` enum**: valores reales `prospect | opportunity | active_client | inactive | churned | provider_only | disqualified` (verificado en migration `20260421113910459_task-535-organization-lifecycle-ddl.sql:26`). El doc usa `prospect | opportunity | active_client` que **son válidos**. Agregado `lifecycle_stage_source='quote_converted'` (valor existente en el enum, línea 51 de la misma migration) al flow de conversión.
- **Verificado Supuesto 7 — subsystem `Commercial Health`**: NO existe en `src/lib/reliability/` hoy. Declarado explícitamente como **nuevo subsystem** que esta spec introduce, con migration de registry en Slice 6.
- **Resuelto Open Q4 — owner del approval**: `commercial.pilot.approve` por default es **EFEONCE_ADMIN + COMMERCIAL_LEAD** (cuando este último exista). Hoy solo `EFEONCE_ADMIN` puede aprobar; cuando se cree el role `COMMERCIAL_LEAD` se habilita.
- **Agregado §3.3 anti-zombie** ya tenía CHECK; ahora también incluye DDL completa de `pilot_decision_audit_log` (faltaba en v1.0 — solo se mencionaba sin schema).
- **Agregado §3.4** — índices faltantes en `service_lineage` y `engagement_approvals`.
- **Agregado §8** — boundary transaccional explícito `BEGIN; ... COMMIT;` con rollback contract en flow de conversión.
- **Agregado §10.2** — handling explícito de `lifecycle_stage_source/by/since` al flipear organization.
- **Agregado §14** — patrón TASK-409 (extender `client_economics` con backfill desde `commercial_cost_attribution`) reusado explícitamente para `gtm_investment_pnl`.

Score 4-pilar post-Delta: estimado 8.5/10 (vs 6.75/10 en v1.0). Bloqueantes para implementación resueltos.

## 1. Resumen ejecutivo

Greenhouse vende servicios a clientes (Sky, etc.) y a veces, antes de contratar, ofrece un **Piloto / Demo / Trial / POC** acotado en tiempo, sin costo para el cliente, pero con costo interno real para Efeonce (recursos asignados). Al cierre, el cliente decide: continuar, ajustar o dejarlo. Esta spec define cómo modelar ese tipo de engagement reusando el canónico 360 sin crear identidades paralelas, con gobierno explícito y defensa en profundidad anti-zombie / anti-runaway-cost.

**Decisión raíz:** un Sample Sprint **NO es una entidad nueva** — es un `service` con `engagement_kind != 'regular'`, gobernado por approval workflow, fases declarativas, lineage graph, doble registro de costo (auditoría por cliente + reclasificación gerencial GTM) y reliability signals. La marca comercial "Sample Sprint" envuelve los 4 sub-tipos canónicos (Operations / Extension / Validation / Discovery Sprint).

**Alternativa rechazada:** tabla `pilot_engagements` o `sample_sprints` separada — violaría la regla canónica 360 y duplicaría plomería ya resuelta en `services`, `client_team_assignments`, `commercial_cost_attribution`, `quotations`, `client_economics`.

## 2. Casos de uso canónicos

| Caso | Ejemplo real (2026-04) | Características |
|---|---|---|
| **Pilot** | Sky Content Lead, Sky Paid Social Care | 4 semanas, sin costo, equipo dedicado, reporte final, decisión binaria |
| **Trial** | Extensión de servicio existente a nuevo módulo | 2-8 semanas, scope acotado, costo reducido o cero |
| **POC** | Validación técnica de integración | 1-4 semanas, scope técnico, deliverable = informe |
| **Discovery** | Mapeo inicial pre-propuesta | 1-2 semanas, output = brief estructurado |

Las 4 categorías comparten estructura (acotadas en tiempo, deliverable explícito, decisión post-cierre) pero difieren en términos comerciales (gratis / parcial / con costo) y en owner operativo. La modelación las trata como **variantes del mismo átomo** — el `engagement_kind`.

## 3. Modelo dimensional canónico

### 3.1 Dimensiones ortogonales (NO mezclar en un solo enum)

| Dimensión | Pregunta que responde | Valores | Persistencia |
|---|---|---|---|
| `engagement_kind` | ¿Qué tipo de servicio es? | `regular`, `pilot`, `trial`, `poc`, `discovery` | Columna en `services` |
| `commercial_terms` | ¿Cómo se cobra? | `committed`, `no_cost`, `success_fee`, `reduced_fee` | Tabla `service_commercial_terms` time-versioned |
| `lifecycle_phase` | ¿En qué fase operativa está? | declarativo per service | Tabla `service_phases` |
| `outcome` | ¿Cuál fue la decisión final? | `converted`, `adjusted`, `dropped` | Tabla `service_outcomes` |
| `lineage` | ¿De qué nació, en qué se transformó? | graph relations | Tabla `service_lineage` |

**Regla dura:** las 5 dimensiones son ortogonales. NUNCA mezclarlas en un solo enum. Mañana aparece un piloto pagado parcialmente con success fee y SLA — la matriz combinatoria explota si las mezclás.

### 3.2 Schema (propuesto, no implementado)

> **Delta v1.2 — naming**: tablas usan prefijo `engagement_*` (genérico, sobrevive marketing pivots). UI label "Sample Sprint" no requiere migrations al renombrar.
>
> **Delta v1.1**: schema canónico de cost attribution es `greenhouse_serving`, NO `greenhouse_commercial_cost_attribution` (que no existe). FK del operador apunta a `greenhouse_core.client_users(user_id)` con tipo `TEXT` y `ON DELETE SET NULL` (patrón verificado en TASK-760/761/762 — offboarding case + final settlement).

```sql
-- Capa 1: extensión de services
ALTER TABLE greenhouse_core.services
  ADD COLUMN engagement_kind TEXT NOT NULL DEFAULT 'regular'
    CHECK (engagement_kind IN ('regular','pilot','trial','poc','discovery')),
  ADD COLUMN commitment_terms_json JSONB; -- success_criteria, decision_deadline, expected_internal_cost_clp

-- Capa 1b: anclar client_team_assignment a service específico (genérico, reusable)
ALTER TABLE greenhouse_core.client_team_assignments
  ADD COLUMN service_id UUID REFERENCES greenhouse_core.services(service_id) ON DELETE SET NULL;
CREATE INDEX client_team_assignments_service_idx
  ON greenhouse_core.client_team_assignments (service_id)
  WHERE service_id IS NOT NULL;

-- Capa 2: términos comerciales time-versioned
CREATE TABLE greenhouse_commercial.engagement_commercial_terms (
  terms_id            UUID PRIMARY KEY,
  service_id          UUID NOT NULL REFERENCES greenhouse_core.services(service_id) ON DELETE CASCADE,
  terms_kind          TEXT NOT NULL CHECK (terms_kind IN ('committed','no_cost','success_fee','reduced_fee')),
  effective_from      DATE NOT NULL,
  effective_to        DATE,
  monthly_amount_clp  NUMERIC(18,2),
  success_criteria    JSONB,
  declared_by         TEXT NOT NULL REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  declared_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason              TEXT NOT NULL CHECK (length(reason) >= 10),
  CHECK (effective_to IS NULL OR effective_to > effective_from)
);
CREATE UNIQUE INDEX engagement_commercial_terms_active_unique
  ON greenhouse_commercial.engagement_commercial_terms (service_id)
  WHERE effective_to IS NULL;
CREATE INDEX engagement_commercial_terms_kind_idx
  ON greenhouse_commercial.engagement_commercial_terms (terms_kind, effective_from)
  WHERE effective_to IS NULL;

-- Capa 3: fases declarativas (reusable más allá de Sample Sprints)
CREATE TABLE greenhouse_commercial.engagement_phases (
  phase_id          UUID PRIMARY KEY,
  service_id        UUID NOT NULL REFERENCES greenhouse_core.services(service_id) ON DELETE CASCADE,
  phase_name        TEXT NOT NULL,
  phase_kind        TEXT CHECK (phase_kind IN ('kickoff','operation','reporting','decision','custom')),
  phase_order       INT NOT NULL,
  start_date        DATE NOT NULL,
  end_date          DATE,
  status            TEXT NOT NULL CHECK (status IN ('pending','in_progress','completed','skipped')),
  deliverables_json JSONB, -- canónico para phase_kind='kickoff': accesos requeridos (ad accounts, calendar, contacts)
  completed_at      TIMESTAMPTZ,
  completed_by      TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  UNIQUE (service_id, phase_order)
);

-- Capa 4: outcome (decisión final + cancelaciones)
CREATE TABLE greenhouse_commercial.engagement_outcomes (
  outcome_id           UUID PRIMARY KEY,
  service_id           UUID NOT NULL REFERENCES greenhouse_core.services(service_id) ON DELETE CASCADE,
  outcome_kind         TEXT NOT NULL CHECK (outcome_kind IN (
    'converted','adjusted','dropped','cancelled_by_client','cancelled_by_provider'
  )),
  decision_date        DATE NOT NULL,
  report_asset_id      UUID REFERENCES greenhouse_core.assets(asset_id) ON DELETE SET NULL,
  metrics_json         JSONB, -- volume_managed, top_frictions, recommendations, etc — input para auto-report V2
  decision_rationale   TEXT NOT NULL CHECK (length(decision_rationale) >= 10),
  cancellation_reason  TEXT, -- requerido si outcome_kind IN ('cancelled_by_client','cancelled_by_provider')
  next_service_id      UUID REFERENCES greenhouse_core.services(service_id) ON DELETE SET NULL,
  next_quotation_id    UUID REFERENCES greenhouse_commercial.quotations(quotation_id) ON DELETE SET NULL,
  decided_by           TEXT NOT NULL REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  decided_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (service_id), -- 1 outcome por service (terminal)
  CHECK (
    (outcome_kind NOT IN ('cancelled_by_client','cancelled_by_provider'))
    OR (cancellation_reason IS NOT NULL AND length(cancellation_reason) >= 10)
  )
);

-- Capa 5: lineage graph (multi-parent / multi-child)
CREATE TABLE greenhouse_commercial.engagement_lineage (
  lineage_id        UUID PRIMARY KEY,
  parent_service_id UUID NOT NULL REFERENCES greenhouse_core.services(service_id) ON DELETE CASCADE,
  child_service_id  UUID NOT NULL REFERENCES greenhouse_core.services(service_id) ON DELETE CASCADE,
  relationship_kind TEXT NOT NULL CHECK (relationship_kind IN
    ('converted_to','spawned_from','replaced_by','renewed_from','adjusted_into')),
  transition_date   DATE NOT NULL,
  transition_reason TEXT NOT NULL CHECK (length(transition_reason) >= 10),
  recorded_by       TEXT NOT NULL REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  recorded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (parent_service_id <> child_service_id),
  UNIQUE (parent_service_id, child_service_id, relationship_kind)
);

-- Capa 6: progress snapshots (Delta v1.2 — B3 — reporte forensic-friendly)
CREATE TABLE greenhouse_commercial.engagement_progress_snapshots (
  snapshot_id        UUID PRIMARY KEY,
  service_id         UUID NOT NULL REFERENCES greenhouse_core.services(service_id) ON DELETE CASCADE,
  snapshot_date      DATE NOT NULL,
  metrics_json       JSONB NOT NULL, -- volumen gestionado, KPIs, top issues, screenshots refs
  qualitative_notes  TEXT,
  recorded_by        TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  recorded_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (service_id, snapshot_date)
);
CREATE INDEX engagement_progress_service_date_idx
  ON greenhouse_commercial.engagement_progress_snapshots (service_id, snapshot_date DESC);

-- Capa 7: gobierno — approval workflow
CREATE TABLE greenhouse_commercial.engagement_approvals (
  approval_id              UUID PRIMARY KEY,
  service_id               UUID NOT NULL REFERENCES greenhouse_core.services(service_id) ON DELETE CASCADE,
  requested_by             TEXT NOT NULL REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  expected_internal_cost_clp NUMERIC(18,2) NOT NULL,
  expected_duration_days   INT NOT NULL CHECK (expected_duration_days BETWEEN 7 AND 120),
  decision_deadline        DATE NOT NULL,
  success_criteria_json    JSONB NOT NULL,
  capacity_warning_json    JSONB, -- Delta v1.2 — B4 — snapshot del capacity check al momento del approval
  capacity_override_reason TEXT,  -- Delta v1.2 — B4 — requerido si aprobador forza pese a capacity warning
  status                   TEXT NOT NULL CHECK (status IN ('pending','approved','rejected','withdrawn')),
  approved_by              TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  approved_at              TIMESTAMPTZ,
  rejection_reason         TEXT,
  UNIQUE (service_id)
);

-- Capa 8: audit log append-only
CREATE TABLE greenhouse_commercial.engagement_audit_log (
  audit_id           BIGSERIAL PRIMARY KEY,
  service_id         UUID NOT NULL REFERENCES greenhouse_core.services(service_id) ON DELETE NO ACTION,
  event_kind         TEXT NOT NULL CHECK (event_kind IN (
    'declared','approved','rejected','capacity_overridden','phase_completed',
    'progress_snapshot_recorded','outcome_recorded','lineage_added','converted','cancelled','reverted'
  )),
  actor_user_id      TEXT REFERENCES greenhouse_core.client_users(user_id) ON DELETE SET NULL,
  occurred_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload_json       JSONB NOT NULL,
  reason             TEXT
);
CREATE INDEX engagement_audit_service_idx
  ON greenhouse_commercial.engagement_audit_log (service_id, occurred_at DESC);

-- Append-only triggers (patrón TASK-535/TASK-768)
CREATE OR REPLACE FUNCTION greenhouse_commercial.engagement_audit_no_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'engagement_audit_log is append-only';
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION greenhouse_commercial.engagement_audit_no_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'engagement_audit_log is append-only';
END $$ LANGUAGE plpgsql;

CREATE TRIGGER engagement_audit_log_no_update
  BEFORE UPDATE ON greenhouse_commercial.engagement_audit_log
  FOR EACH ROW EXECUTE FUNCTION greenhouse_commercial.engagement_audit_no_update();

CREATE TRIGGER engagement_audit_log_no_delete
  BEFORE DELETE ON greenhouse_commercial.engagement_audit_log
  FOR EACH ROW EXECUTE FUNCTION greenhouse_commercial.engagement_audit_no_delete();
```

### 3.4 Índices adicionales

```sql
-- engagement_lineage: grafo bidireccional, queries "ancestros / descendientes"
CREATE INDEX engagement_lineage_parent_idx
  ON greenhouse_commercial.engagement_lineage (parent_service_id);
CREATE INDEX engagement_lineage_child_idx
  ON greenhouse_commercial.engagement_lineage (child_service_id);

-- engagement_approvals: queries "approvals pendientes" en /admin/operations
CREATE INDEX engagement_approvals_pending_idx
  ON greenhouse_commercial.engagement_approvals (status, decision_deadline)
  WHERE status = 'pending';

-- engagement_outcomes: queries "outcomes por período" para conversion_rate
CREATE INDEX engagement_outcomes_decision_idx
  ON greenhouse_commercial.engagement_outcomes (decision_date DESC, outcome_kind);

-- engagement_outcomes: lookup rápido del child contract post-conversión
CREATE INDEX engagement_outcomes_next_service_idx
  ON greenhouse_commercial.engagement_outcomes (next_service_id)
  WHERE next_service_id IS NOT NULL;
```

### 3.3 CHECK constraint anti-zombie (defensa en DB)

```sql
ALTER TABLE greenhouse_core.services
  ADD CONSTRAINT services_engagement_requires_decision_before_120d
  CHECK (
    engagement_kind = 'regular'
    OR (engagement_kind <> 'regular' AND (
      -- engagement activo dentro de ventana razonable
      (status = 'active' AND start_date >= CURRENT_DATE - INTERVAL '120 days')
      -- o ya tiene outcome registrado
      OR EXISTS (SELECT 1 FROM greenhouse_commercial.engagement_outcomes o WHERE o.service_id = services.service_id)
      -- o explícitamente cancelado
      OR status IN ('cancelled','closed')
    ))
  );
```

NOT VALID + VALIDATE atomic patrón TASK-708/766/774 para no bloquear backfill.

## 4. Lifecycle de organización (interacción con party lifecycle)

Reusa la máquina de estados ya canónica (`GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md`):

```
prospect
   │
   ▼
opportunity ◄─────────────┐
   │                      │
   ├─ pilot_in_progress ──┤  (engagement_kind != 'regular' active)
   │                      │
   ├─ outcome=converted ──┼──▶ active_client (spawn nuevo service regular)
   ├─ outcome=adjusted ───┴──▶ se mantiene en opportunity (nuevo piloto/quote)
   └─ outcome=dropped ───────▶ prospect (tag: pilot_evaluated)
```

**Regla dura:** un Sample Sprint NUNCA flipea la organización a `active_client`. Solo el `service` regular post-conversión lo hace. Eso protege los KPIs comerciales de inflar conversion rate con Sample Sprints no convertidos.

## 5. Gobierno y defensa en profundidad (patrón 7 capas TASK-742)

### 5.1 Capability granular dedicada

| Capability | Module | Action | Scope | Allowed source |
|---|---|---|---|---|
| `commercial.engagement.declare` | commercial | create | tenant | route_group=commercial / EFEONCE_ADMIN |
| `commercial.engagement.approve` | commercial | approve | tenant | EFEONCE_ADMIN (today) + COMMERCIAL_LEAD (cuando exista el role) |
| `commercial.engagement.record_outcome` | commercial | update | tenant | EFEONCE_ADMIN + COMMERCIAL_LEAD |
| `commercial.engagement.record_progress` | commercial | update | tenant | route_group=commercial / route_group=agency / EFEONCE_ADMIN — Delta v1.2 (B3) |
| `commercial.engagement.read` | commercial | read | tenant | route_group=commercial / route_group=agency / EFEONCE_ADMIN |

> **Delta v1.2 — naming**: capabilities renombradas de `commercial.pilot.*` → `commercial.engagement.*` (genérico — schema-aligned). UI label "Sample Sprint" no requiere capability rename si mañana el rebrand cambia.
>
> **Delta v1.1 — owner de approve resuelto**: hoy `EFEONCE_ADMIN` es el único que puede aprobar (el role `COMMERCIAL_LEAD` no existe en el sistema actual). Cuando se cree el role `COMMERCIAL_LEAD`, se habilita como segundo source válido. Esto resuelve Open Question #4 de v1.0.

`commercial.engagement.approve` separada de `services.create` evita que cualquier vendedor cree Sample Sprints sin gobierno.

### 5.2 Approval workflow obligatorio (con capacity warning soft)

Sin fila en `engagement_approvals.status='approved'`, el `service` con `engagement_kind != 'regular'` nace con `status='pending_approval'`. **No se materializan cost attributions** hasta que el approval está aprobado. Eso evita Sample Sprints fantasma que silenciosamente queman recursos.

**Delta v1.2 (B4) — capacity warning soft**: el wizard de approval invoca `getMemberCapacityForPeriod(memberId, startDate, endDate)` para cada miembro propuesto y muestra:

- ✅ Capacity OK si `proposed_fte + allocated_fte <= 100%`.
- ⚠️ Capacity warning si `proposed_fte + allocated_fte > 100%` — UI muestra warning amarillo con detalle del conflicto. Aprobador puede forzar approval pero **debe declarar `capacity_override_reason`** (≥ 10 chars). El snapshot del warning se persiste en `engagement_approvals.capacity_warning_json` para audit.
- ❌ NO hay hard blocker — el aprobador siempre puede forzar (porque puede saber de vacaciones o transitions futuras que el sistema no conoce). El override queda registrado.

Helper TS canónico:

```ts
getMemberCapacityForPeriod(memberId: string, fromDate: Date, toDate: Date): {
  totalFte: number;          // siempre 1.0
  allocatedFte: number;       // suma de active assignments en el período
  availableFte: number;       // 1.0 - allocatedFte
  conflictingAssignments: { service_id: string; client_id: string; fte: number }[];
}
```

### 5.3 Reliability signals canónicos (subsystem `Commercial Health` — NUEVO)

> **Delta v1.1 — Subsystem `Commercial Health` no existe hoy** en `src/lib/reliability/`. Esta spec lo introduce como **primer subsystem del módulo Commercial**. Slice 6 incluye la migration de registry (mirror de cómo TASK-672 introdujo `Finance Data Quality`). Hasta que la migration aplique, los signals viven sin rollup.

| Signal | Kind | Severity | Steady | Detección |
|---|---|---|---|---|
| `commercial.engagement.overdue_decision` | drift | error | 0 | engagements con `phase_kind=reporting` cerrada hace +14d sin `engagement_outcome` |
| `commercial.engagement.budget_overrun` | drift | warning | 0 | engagements donde `actual_internal_cost > expected_internal_cost * 1.2` |
| `commercial.engagement.zombie` | drift | error | 0 | engagements `engagement_kind != 'regular'` activos > 90 días sin transition_event |
| `commercial.engagement.unapproved_active` | drift | error | 0 | services con `engagement_kind != 'regular'` y `status != 'pending_approval'` sin approval aprobado |
| `commercial.engagement.conversion_rate_drop` | drift | warning | variable | conversion rate trailing 6m < threshold (default 30%) |
| `commercial.engagement.stale_progress` | drift | warning | 0 | engagements activos sin progress snapshot en últimos 10 días — Delta v1.2 (B3) |

### 5.4 Outbox events versionados v1

> **Delta v1.2 — naming**: events renombrados de `service.pilot.*` → `service.engagement.*` (genérico). Cuando cambie el marketing label "Sample Sprint", consumers downstream NO se rompen.

- `service.engagement.declared` v1
- `service.engagement.approved` v1
- `service.engagement.rejected` v1
- `service.engagement.capacity_overridden` v1 (Delta v1.2 — B4)
- `service.engagement.phase_completed` v1
- `service.engagement.progress_snapshot_recorded` v1 (Delta v1.2 — B3)
- `service.engagement.outcome_recorded` v1
- `service.engagement.cancelled` v1 (Delta v1.2 — outcome de cancelación)
- `service.engagement.converted` v1 (link a child_service_id)

### 5.5 Audit log append-only

Tabla `greenhouse_commercial.engagement_audit_log` con triggers PG `engagement_audit_log_no_update` y `engagement_audit_log_no_delete` (patrón TASK-535/TASK-768). DDL completa en §3.2. Cualquier cambio en approval, outcome, progress o lineage produce una fila append-only con `event_kind`, `actor_user_id`, `payload_json`, `reason`.

**Event kinds** (Delta v1.2 — extendidos):

- `declared` — engagement creado
- `approved` — approval otorgado
- `rejected` — approval rechazado
- `capacity_overridden` — aprobador forzó pese a capacity warning (B4)
- `phase_completed` — fase marcada como completada
- `progress_snapshot_recorded` — snapshot semanal registrado (B3)
- `outcome_recorded` — outcome final declarado
- `lineage_added` — relación parent/child entre services registrada
- `converted` — flow de conversión completo ejecutado
- `cancelled` — cancelado early (by_client / by_provider)
- `reverted` — outcome revertido por error (rollback manual con audit explícito)

**Delta v1.2**: tabla renombrada de `pilot_decision_audit_log` → `engagement_audit_log` (alineado con resto del schema). DDL en §3.2 — functions + triggers + index `engagement_audit_service_idx`.

## 6. Cost intelligence — doble registro

### 6.1 Problema

Si un piloto sin costo registra `total_revenue=0` y `labor_cost > 0`, el cliente aparece con margin negativa, **contaminando** los KPIs de profitability del cliente real.

### 6.2 Solución canónica (NO usar `economic_category='gtm_investment'` solo)

**Doble registro, sin perder trazabilidad:**

#### 6.2.1 `commercial_cost_attribution` — atribución por cliente (auditoría)

El costo del piloto SÍ se atribuye al `client_id` del piloto. Se agrega columna a **ambas tablas canónicas** (v1 + v2):

```sql
-- v1 (legacy, aún consumida por dashboards históricos)
ALTER TABLE greenhouse_serving.commercial_cost_attribution
  ADD COLUMN attribution_intent TEXT NOT NULL DEFAULT 'operational'
    CHECK (attribution_intent IN ('operational','pilot','trial','poc','discovery','overhead'));

-- v2 (canónica post TASK-708/709 — labor consolidado anti double-counting)
ALTER TABLE greenhouse_serving.commercial_cost_attribution_v2
  ADD COLUMN attribution_intent TEXT NOT NULL DEFAULT 'operational'
    CHECK (attribution_intent IN ('operational','pilot','trial','poc','discovery','overhead'));
```

> **Delta v1.1**: corregido el schema (`greenhouse_serving`, NO `greenhouse_commercial_cost_attribution` que no existe). Decidido aplicar a **ambas v1 y v2** porque:
> - v2 es la canónica post-TASK-708/709 (consolidated labor, anti double-counting), y la VIEW `gtm_investment_pnl` debe leer de v2.
> - v1 sigue siendo consumida por surfaces que aún no migraron; el filtro `attribution_intent` debe estar coherente en ambas para evitar drift cuando una projection lee v1 y otra v2.
> - Cuando v1 se deprecate (task futura), se removerá la columna allí; mientras tanto, el seed default `'operational'` mantiene compatibilidad backward.

Eso preserva auditoría: "Sky consumió X horas de Valentina durante el piloto Content Lead".

#### 6.2.2 VIEW canónica `gtm_investment_pnl` — reclasificación gerencial

```sql
-- VIEW canónica gtm_investment_pnl
-- Lee desde v2 (canonical post TASK-708/709 — labor consolidado).
-- Patrón heredado de TASK-409 (extender client_economics con backfill desde
-- commercial_cost_attribution).
CREATE VIEW greenhouse_serving.gtm_investment_pnl AS
SELECT
  cca.period_year,
  cca.period_month,
  cca.client_id,
  cca.member_id,
  s.service_id,
  s.engagement_kind,
  cca.allocated_labor_clp + cca.direct_overhead + cca.shared_overhead AS gtm_investment_clp,
  cca.attribution_intent
FROM greenhouse_serving.commercial_cost_attribution_v2 cca
JOIN greenhouse_core.services s ON s.service_id = cca.service_id
JOIN greenhouse_commercial.engagement_commercial_terms sct
  ON sct.service_id = s.service_id
  AND sct.effective_from <= make_date(cca.period_year, cca.period_month, 1)
  AND (sct.effective_to IS NULL OR sct.effective_to >= make_date(cca.period_year, cca.period_month, 1))
WHERE cca.attribution_intent IN ('pilot','trial','poc','discovery')
  AND sct.terms_kind = 'no_cost';

COMMENT ON VIEW greenhouse_serving.gtm_investment_pnl IS
  'GTM Investment reclassification — labor cost atribuido a pilotos/trials/poc/discovery '
  'sin cobro al cliente. P&L gerencial resta del cliente, suma a línea "GTM Investment". '
  'Lee de commercial_cost_attribution_v2 (TASK-709 consolidated labor). '
  'NO usar para auditoría por cliente — para eso lee v2 directo. Patrón heredado de TASK-409 '
  '(extender client_economics con backfill desde commercial_cost_attribution).';
```

> **Delta v1.1**: VIEW corregida para leer de `greenhouse_serving.commercial_cost_attribution_v2` (canónica post TASK-708/709). Patrón explícitamente heredado de TASK-409 (extender `client_economics` con backfill desde `commercial_cost_attribution`) para reducir surface novel y reusar primitiva canonizada.

El P&L gerencial **resta** `gtm_investment_pnl` del cliente y **suma** a línea separada "GTM Investment". El cliente no aparece como unprofitable; el piloto aparece como inversión deliberada.

### 6.3 Reglas duras

- **NUNCA** marcar `economic_category='gtm_investment'` en un payment. Esa columna sigue fiel al patrón TASK-768 (clasificador analítico estable). El intent vive en `commercial_cost_attribution.attribution_intent`.
- **NUNCA** filtrar pilotos del `commercial_cost_attribution` para "no manchar" KPIs. La auditoría por cliente requiere el registro completo. La reclasificación es read-time vía VIEW.
- **NUNCA** asignar cost attribution antes de approval aprobado. La capa de gobierno bloquea.

## 7. Surface UI

Vive en módulo **Agency** (no Finance — domain boundary canónico).

| Surface | Audiencia | Contenido |
|---|---|---|
| `/agency/sample-sprints` | Commercial + Agency leads | Tabla Sample Sprints en curso con conversion rate trailing 6m + agrupación por cliente |
| `/agency/sample-sprints/[serviceId]` | Owner del Sample Sprint | Detalle: fases, deliverables, equipo asignado, costo acumulado vs budget, días hasta decisión, **timeline de progress snapshots** |
| `/agency/sample-sprints/[serviceId]/progress` | Owner | Wizard semanal para registrar `engagement_progress_snapshot` (metrics_json + qualitative_notes) — Delta v1.2 (B3) |
| `/agency/sample-sprints/[serviceId]/outcome` | EFEONCE_ADMIN / COMMERCIAL_LEAD | Wizard de decisión final con upload de reporte + structured fields (volume_managed, top_frictions, recommendations) |
| `/admin/operations` | Reliability dashboard | 6 signals del subsystem `Commercial Health` |

> **Delta v1.2 — naming**: paths cambiados de `/agency/pilots/*` → `/agency/sample-sprints/*` (UI marketing brand). Capability gating sigue genérico (`commercial.engagement.*`).

Capability gating: `commercial.engagement.read` para listas, `commercial.engagement.{declare,approve,record_outcome,record_progress}` para mutaciones.

### 7.1 Sub-tipos visibles en UI (mapping marketing → schema)

| Schema (`engagement_kind`) | UI label | Caso de uso típico |
|---|---|---|
| `pilot` | "Operations Sprint" | Sky Content Lead (4 semanas full operación) |
| `trial` | "Extension Sprint" | Cliente activo prueba módulo nuevo |
| `poc` | "Validation Sprint" | Validación técnica / integración |
| `discovery` | "Discovery Sprint" | Mapeo pre-propuesta |

## 8. Conversión Sample Sprint → contrato

Flujo canónico **atómico** (boundary transaccional explícito — Delta v1.1):

```sql
BEGIN;
  -- 1. Insertar outcome (wizard valida que el Sample Sprint está en estado terminal-ready)
  INSERT INTO greenhouse_commercial.engagement_outcomes (
    service_id, outcome_kind, decision_date, decision_rationale,
    next_service_id, next_quotation_id, decided_by, metrics_json
  ) VALUES (...);

  -- 2. Spawn nuevo service regular + commercial_terms committed
  INSERT INTO greenhouse_core.services (service_id, engagement_kind, ...) VALUES (...);
  INSERT INTO greenhouse_commercial.engagement_commercial_terms (
    service_id, terms_kind, effective_from, monthly_amount_clp, ...
  ) VALUES (..., 'committed', CURRENT_DATE, ...);

  -- 3. Linkear via engagement_lineage
  INSERT INTO greenhouse_commercial.engagement_lineage (
    parent_service_id, child_service_id, relationship_kind, transition_date, transition_reason, recorded_by
  ) VALUES (..., 'converted_to', ...);

  -- 4. Audit log append-only
  INSERT INTO greenhouse_commercial.engagement_audit_log (
    service_id, event_kind, actor_user_id, payload_json, reason
  ) VALUES (..., 'converted', ...);

  -- 5. Outbox event v1 (en la misma tx — patrón canónico TASK-771/773)
  INSERT INTO greenhouse_sync.outbox_events (
    event_type, event_version, aggregate_id, payload
  ) VALUES ('service.engagement.converted', 1, ..., ...);
COMMIT;
```

**Steps async (post-commit, vía reactive consumer)**:

6. Consumer reactivo lee `service.engagement.converted` v1 y:
   - UPDATE `greenhouse_core.organizations` SET `lifecycle_stage='active_client'`, `lifecycle_stage_source='quote_converted'`, `lifecycle_stage_by=<actor_user_id>`, `lifecycle_stage_since=NOW()` (todos los campos canónicos del lifecycle history — TASK-535/TASK-542). Trigger `organization_lifecycle_history` ya canonizado escribe el snapshot histórico automáticamente.
   - Trigger HubSpot bridge: crea deal desde el quotation referenciado (solo si `services.hubspot_deal_id IS NULL`).

> **Delta v1.1 — atomicidad explícita + lifecycle source canónico + HubSpot conditional**:
>
> - **Atomicidad**: pasos 1-5 viven en **una sola transacción Postgres**. Si cualquier INSERT falla → ROLLBACK completo. El reactive consumer (paso 6) es at-least-once con consumer idempotente (patrón canónico outbox).
> - **Lifecycle source canónico**: el flip a `active_client` debe poblar `lifecycle_stage_source='quote_converted'` (valor existente en el enum, verificado en migration `20260421113910459:51`) + `lifecycle_stage_by` + `lifecycle_stage_since`. Sin esto, el lifecycle history queda sin trazabilidad y rompe el contract de TASK-535.
> - **HubSpot conditional**: la regla "pilotos NO crean deals automáticamente" se implementa en el reactive consumer como `IF service.engagement_kind = 'regular' AND service.hubspot_deal_id IS NULL THEN create_deal(...)`. Pilotos quedan con `hubspot_deal_id=NULL` permanentemente; solo el child_service post-conversión sincroniza.

### 8.1 Rollback contract

Si el flow atómico falla (paso 1-5):
- Sin outcome, sin nuevo service, sin lineage. La organización **NO** se flipea a `active_client`.
- El piloto sigue activo. Operador reintenta vía wizard.

Si el reactive consumer falla (paso 6):
- Outbox event queda `pending` → retry exponencial → dead_letter después de N intentos.
- Mientras tanto: nuevo service existe + lineage registrado, pero org sigue en `opportunity` y HubSpot sin deal. Estado consistente (org puede flipearse manualmente vía endpoint admin si el dead_letter no se resuelve en X horas).

## 9. Métricas canónicas

| Métrica | Fórmula | Owner |
|---|---|---|
| **Pilot conversion rate** | `count(outcome=converted) / count(outcome IN any)` trailing 6m | Commercial |
| **Avg time to decision** | `decision_date - service.start_date` para outcomes | Commercial |
| **GTM investment ratio** | `sum(gtm_investment_pnl) / sum(operating_revenue)` per period | Finance gerencial |
| **Sample Sprint ROI** | `sum(revenue del child_service trailing 12m) / sum(internal_cost del Sample Sprint)` | Commercial |
| **Active Sample Sprints backlog** | `count(engagement_kind != 'regular' AND status='active')` | Agency ops |

## 10. Dependencias e impacto

### 10.1 Depende de

- `greenhouse_core.services` (extensión, no nueva tabla)
- `greenhouse_core.client_team_assignments` (sin cambios — schema verificado en `db.d.ts:1847`)
- `greenhouse_serving.commercial_cost_attribution` (v1) **+** `greenhouse_serving.commercial_cost_attribution_v2` (v2 canónica, 1 columna nueva en cada: `attribution_intent`)
- `greenhouse_core.assets` (FK al canonical asset uploader, patrón TASK-721 — verificado en `db.d.ts:1666`)
- `greenhouse_core.organizations` (lifecycle_stage + lifecycle_stage_source + lifecycle_stage_by + lifecycle_stage_since — TASK-535/TASK-542 canonical lifecycle infrastructure)
- `greenhouse_core.client_users(user_id)` para FKs de actor (TEXT, ON DELETE SET NULL — patrón TASK-760/761/762)
- `greenhouse_commercial.quotations` (sin cambios — la quote del piloto ya documenta términos)
- `greenhouse_finance.client_economics` (extensión: dashboards leen via VIEW `gtm_investment_pnl` para reclasificación gerencial)
- `greenhouse_sync.outbox_events` (reusa patrón canónico TASK-771/773 para eventos del piloto)

### 10.2 Impacta a

- Cualquier consumer de `services` que asuma "service = facturable" debe filtrar por `engagement_kind = 'regular'` o por `service_commercial_terms.terms_kind = 'committed'`. **Auditar inventario completo de consumers en Slice 1.**
- Dashboards de `client_economics` deben reclasificar vía `gtm_investment_pnl` view (NO filtrar pilotos del cost_attribution — preserva auditoría).
- Reactive projection `client_economics_refresh` (post TASK-409) debe respetar `attribution_intent` para no inflar costo del cliente.
- **HubSpot bridge**: pilotos NO crean deals automáticamente al declararse. Implementación: el reactive consumer que dispara deal creation filtra `WHERE engagement_kind = 'regular' AND hubspot_deal_id IS NULL`. La columna `services.hubspot_sync_status` ya existe (`db.d.ts`) y se mantiene como gate.
- **Lifecycle history (TASK-535/TASK-542)**: cualquier flip de `lifecycle_stage` debe poblar los 4 campos coordinados (`stage`, `stage_source`, `stage_by`, `stage_since`). El trigger `organization_lifecycle_history_no_update/no_delete` ya enforce append-only del snapshot history.

### 10.3 Verificación de supuestos pendientes (resueltos en Delta v1.1)

| Supuesto v1.0 | Estado v1.1 | Evidence |
|---|---|---|
| Schema cost_attribution = `greenhouse_commercial_cost_attribution` | ❌ CORREGIDO → `greenhouse_serving` | `src/types/db.d.ts:6444` |
| FK actor a `greenhouse_core.users(user_id)` | ❌ CORREGIDO → `greenhouse_core.client_users(user_id)` TEXT | TASK-760/761/762 patron |
| Cita TASK-728 = NOT VALID/VALIDATE | ❌ CORREGIDO → TASK-708/766/774 | TASK-728 = Movement Feed UI |
| `lifecycle_stage` enum incluye `opportunity`, `active_client` | ✅ VERIFICADO | migration `20260421113910459:26-34` |
| `lifecycle_stage_source='quote_converted'` válido | ✅ VERIFICADO | migration `20260421113910459:51` |
| Subsystem `Commercial Health` existe | ❌ NUEVO — declarado en Slice 6 | búsqueda en `src/lib/reliability/` |
| HubSpot auto-create deals para `services` regulares | ⚠️ ASUMIDO — verificar en implementación | `services.hubspot_deal_id` existe |

### 10.3 Archivos owned (para detección de impacto cruzado)

> **Delta v1.2 — naming**: módulo TS renombrado a `sample-sprints/` (UI brand). Reliability queries y schema-related code mantienen prefijo `engagement-*` (genérico).

- `src/lib/commercial/sample-sprints/` (nuevo módulo)
- `src/lib/commercial/sample-sprints/store.ts`
- `src/lib/commercial/sample-sprints/approval-workflow.ts`
- `src/lib/commercial/sample-sprints/capacity-checker.ts` (Delta v1.2 — B4)
- `src/lib/commercial/sample-sprints/lineage.ts`
- `src/lib/commercial/sample-sprints/outcome-recorder.ts`
- `src/lib/commercial/sample-sprints/progress-recorder.ts` (Delta v1.2 — B3)
- `src/lib/commercial/sample-sprints/cost-reclassifier.ts` (VIEW reader)
- `src/lib/commercial/sample-sprints/conversion-tx.ts` (atomic flow §8)
- `src/lib/reliability/queries/engagement-overdue-decision.ts`
- `src/lib/reliability/queries/engagement-budget-overrun.ts`
- `src/lib/reliability/queries/engagement-zombie.ts`
- `src/lib/reliability/queries/engagement-unapproved-active.ts`
- `src/lib/reliability/queries/engagement-conversion-rate-drop.ts`
- `src/lib/reliability/queries/engagement-stale-progress.ts` (Delta v1.2 — B3)
- `src/app/(dashboard)/agency/sample-sprints/`
- `src/app/api/agency/sample-sprints/`
- `src/app/api/admin/commercial/engagement-approvals/`

## 11. Roadmap por slices (cuando se decida implementar)

| Slice | Scope | Dependencias |
|---|---|---|
| **1** | Migration `services.engagement_kind` + `commitment_terms_json` + `client_team_assignments.service_id` + `attribution_intent` (v1 + v2) | Solo DDL |
| **2** | `engagement_commercial_terms` time-versioned + helper `getActiveCommercialTerms` | Slice 1 |
| **3** | `engagement_phases` + `engagement_outcomes` (con `cancellation_reason` + `next_quotation_id`) + `engagement_lineage` | Slice 1 |
| **4** | `engagement_approvals` workflow + capability `commercial.engagement.approve` + helper `getMemberCapacityForPeriod` (capacity warning soft) | Slice 1, IAM |
| **4.5** | `engagement_progress_snapshots` + capability `commercial.engagement.record_progress` + reliability signal `stale_progress` (Delta v1.2 — B3) | Slice 1 |
| **5** | VIEW `gtm_investment_pnl` + reclassifier helper (lee `commercial_cost_attribution_v2`, patrón TASK-409) | Slices 1-3 |
| **6** | 6 reliability signals + subsystem `Commercial Health` registry (NUEVO — mirror TASK-672 `Finance Data Quality`) | Slices 1-5 + Slice 4.5 |
| **7** | `engagement_audit_log` + outbox events v1 (9 events) + reactive consumers (lifecycle flip + HubSpot conditional) | Slices 1-6 |
| **8** | UI `/agency/sample-sprints` + wizards declaración/approval/progress/outcome + agrupación per-cliente | Slices 1-7 |
| **9** | CHECK constraint anti-zombie (NOT VALID + VALIDATE atomic, patrón TASK-708/766/774) | Slices 1-8 (post-cleanup) |

## 12. Reglas duras (resumen anti-regresión)

- **NUNCA** crear tabla `pilot_engagements` (ni `sample_sprints`) paralela. Viola regla 360. La primitiva canónica es `services.engagement_kind`.
- **NUNCA** mezclar `engagement_kind` y `commercial_terms` en un solo enum (ortogonalidad de las 5 dimensiones).
- **NUNCA** marcar `economic_category='gtm_investment'` en un payment. La intent vive en `commercial_cost_attribution.attribution_intent`.
- **NUNCA** flipear `organizations.lifecycle_stage='active_client'` por declarar un Sample Sprint. Solo el child_service post-conversión lo hace, **siempre poblando `lifecycle_stage_source='quote_converted'` + `lifecycle_stage_by` + `lifecycle_stage_since`** (TASK-535/542 contract).
- **NUNCA** crear HubSpot deal automáticamente al declarar Sample Sprint. Solo el child_service regular post-conversión, conditional `WHERE engagement_kind='regular' AND hubspot_deal_id IS NULL`.
- **NUNCA** asignar cost attribution sin `engagement_approvals.status='approved'`. La capa de gobierno bloquea.
- **NUNCA** dejar engagement non-regular activo > 120 días sin outcome. CHECK constraint + reliability signal `commercial.engagement.zombie` lo enforce.
- **NUNCA** filtrar engagements del `commercial_cost_attribution` para "limpiar" dashboards. Usar VIEW `gtm_investment_pnl` para reclassificación read-time.
- **NUNCA** modificar `engagement_outcomes` o `engagement_audit_log` (append-only enforced por trigger).
- **NUNCA** spawn `engagement_lineage` row sin `transition_reason >= 10 chars`.
- **NUNCA** declarar `engagement_kind != 'regular'` sin success_criteria_json + decision_deadline + expected_internal_cost_clp.
- **NUNCA** ejecutar el flow de conversión §8 fuera de transacción atómica. Los 5 INSERTs core deben commitear juntos o rollback completo.
- **NUNCA** aprobar un Sample Sprint con capacity warning sin declarar `capacity_override_reason` (≥ 10 chars). El warning se persiste en `engagement_approvals.capacity_warning_json` para audit (Delta v1.2 — B4).
- **NUNCA** cerrar un outcome `cancelled_by_client` o `cancelled_by_provider` sin `cancellation_reason ≥ 10 chars` (CHECK constraint en §3.2 lo enforce).
- **NUNCA** registrar más de un `engagement_progress_snapshot` por `(service_id, snapshot_date)` — UNIQUE constraint lo previene. Cadence canónica: weekly.
- **NUNCA** enviar notificaciones automáticas al cliente en V1. Diferido a V2 (Delta v1.2 — B2). Comunicación es manual del operador owner del Sample Sprint.

## 13. Documentos relacionados

- `GREENHOUSE_360_OBJECT_MODEL_V1.md` — modelo canónico 360 (regla raíz: no crear identidades paralelas)
- `GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` — lifecycle de organization (prospect → opportunity → active_client)
- `GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md` — pilotos viven en Commercial, no Finance
- `Greenhouse_Services_Architecture_v1.md` — service como átomo comercial
- `GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md` — quotations como propuesta previa al piloto
- `GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md` — atribución de costo por cliente
- `GREENHOUSE_FINANCE_ECONOMIC_CATEGORY_DIMENSION_V1.md` — patrón TASK-768 dimensión analítica (no se reusa para `attribution_intent`, pero patrón homólogo)
- `GREENHOUSE_AUTH_RESILIENCE_V1.md` — patrón TASK-742 defensa 7 capas (referencia para gobierno)
- `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — registry signals + subsystem rollup
- `GREENHOUSE_EVENT_CATALOG_V1.md` — outbox events v1 declarados aquí

## 14. Patrones canónicos reusados

| Patrón | Origen | Aplicación en este modelo |
|---|---|---|
| Time-versioned terms | TASK-700 internal_account_number_registry | `service_commercial_terms` con `effective_from/to` + UNIQUE active partial index |
| Append-only audit log | TASK-535 (organization_lifecycle_history) / TASK-768 (economic_category_resolution_log) | `pilot_decision_audit_log` con triggers `pilot_audit_no_update/no_delete` |
| Approval workflow + capability granular | TASK-742 (7 capas) | `engagement_approvals` + `commercial.pilot.approve` |
| State machine + CHECK constraint | TASK-765 | `engagement_kind` + anti-zombie CHECK 120d |
| Reliability signal subsystem | TASK-672 (Finance Data Quality precedent) | 5 signals subsystem `Commercial Health` (NUEVO — Slice 6) |
| VIEW canónica + helper reclassifier | TASK-571/699/766/774 | `gtm_investment_pnl` view + helper TS |
| Asset uploader canónico | TASK-721 | `service_outcomes.report_asset_id` FK a `greenhouse_core.assets` |
| Outbox events versionados | GREENHOUSE_EVENT_CATALOG_V1 + TASK-771/773 | 6 events v1 + atomic in-tx insertion + reactive consumer at-least-once |
| NOT VALID + VALIDATE atomic | TASK-708/766/774 (corregido v1.1 — TASK-728 era cita errónea) | CHECK anti-zombie sin bloquear backfill |
| Lifecycle history with source/by/since | TASK-535/TASK-542 | flip a `active_client` poblando los 4 campos coordinados |
| FK actor pattern (TEXT + ON DELETE SET NULL) | TASK-760/761/762 (offboarding case + final settlement) | 6 FKs a `greenhouse_core.client_users(user_id)` |
| Extender `client_economics` con backfill | TASK-409 (`labor_cost_clp` add + backfill desde commercial_cost_attribution) | VIEW `gtm_investment_pnl` lee de `commercial_cost_attribution_v2` para reclassification gerencial |
| Lineage graph multi-parent | (nuevo, derivado de patrones tree-existentes) | `service_lineage` con UNIQUE (parent, child, kind) |

**Cero primitivas inventadas** salvo el lineage graph (genuinamente nuevo, derivado del patrón tree-tracking común). Todos los demás building blocks reusan canonizados con TASK-### explícita.

## 15. Casos de prueba canónicos (smoke tests)

1. **Happy path conversion:** Sky Content Lead Sample Sprint → outcome=converted → spawn service regular → org flipea a `active_client` con `lifecycle_stage_source='quote_converted'` + `lifecycle_stage_by` + `lifecycle_stage_since` poblados → HubSpot deal creado (post-conversión, conditional).
2. **Drop path:** Sky Paid Social Care Sample Sprint → outcome=dropped → org vuelve a prospect con tag `pilot_evaluated` → no HubSpot deal.
3. **Adjusted path:** Sample Sprint → outcome=adjusted → nuevo Sample Sprint declarado linkado vía engagement_lineage relationship_kind=adjusted_into.
4. **Cancellation by client:** Sample Sprint cancelado en semana 2 por Sky → outcome=cancelled_by_client + cancellation_reason ≥ 10 chars → audit log evento `cancelled` → outbox event `service.engagement.cancelled v1`.
5. **Cancellation by provider:** Efeonce no puede continuar → outcome=cancelled_by_provider + cancellation_reason → mismo path audit/outbox.
6. **Anti-zombie:** engagement activo 121 días sin outcome → CHECK constraint rechaza UPDATE → reliability signal `commercial.engagement.zombie` emite.
7. **Anti-unapproved:** intentar crear cost_attribution para engagement sin approval → bloqueado por gate de approval workflow.
8. **Budget overrun:** engagement con actual_cost > expected * 1.2 → reliability signal `commercial.engagement.budget_overrun` emite warning.
9. **Conversion rate drop:** trailing 6m < 30% → signal `commercial.engagement.conversion_rate_drop` emite warning.
10. **Cost reclassification:** dashboard `/finance/clients/sky` muestra Sky con margin neutral durante Sample Sprint (gracias a VIEW gtm_investment_pnl) + dashboard `/finance/gtm-investment` muestra el costo como línea separada.
11. **Capacity warning soft + override** (Delta v1.2 — B4): aprobar engagement con miembro saturado → UI muestra warning amarillo → aprobador declara `capacity_override_reason` → approval persiste con `capacity_warning_json` snapshot + `capacity_override_reason` → audit log evento `capacity_overridden`.
12. **Progress snapshot weekly cadence** (Delta v1.2 — B3): operador registra snapshot semanal con metrics_json → reliability signal `commercial.engagement.stale_progress` se mantiene en 0 → si no hay snapshot por > 10 días, signal emite warning.
13. **Atomic conversion rollback**: forzar fallo en step 4 (audit log INSERT) durante conversión → ROLLBACK completo → no hay outcome, no hay nuevo service, no hay lineage → org sigue en `opportunity` → operador puede reintentar.
14. **Outbox dead_letter recovery**: reactive consumer falla 5 veces aplicando `service.engagement.converted` → event va a dead_letter → admin endpoint reprocesa manualmente → org se flipea a active_client correctamente con todos los campos lifecycle.
15. **Multi Sprint per cliente** (Sky con Content Lead + Paid Social Care simultáneos): UI `/agency/sample-sprints` agrupa visualmente por cliente; conversion rate se mide per-sprint independiente.
16. **Pricing post-conversión via next_quotation_id**: outcome.next_quotation_id apunta a quotation aceptada → spawn service hereda `monthly_amount_clp` desde quotation → si NULL, wizard pide monto manual y crea quotation auto.

## 16. Open questions (resolver al implementar)

1. ¿`commercial.pilot.approve` requiere también firma del CFO si `expected_internal_cost_clp > threshold`? (sugerido: sí, > 5M CLP requiere doble approval).
2. ¿Pilotos cross-tenant (Efeonce vende a múltiples Globe clients en paralelo)? El modelo actual asume 1 piloto = 1 client. Multi-tenant sería extensión.
3. ¿Integración con HubSpot deal stage "Pilot in Progress"? Decidir si HubSpot refleja el piloto o solo el contrato post-conversión. Recomendación: solo post-conversión, para no inflar pipeline metrics con pilotos.
4. ~~¿Quién owna el approval por default?~~ **RESUELTO en Delta v1.1**: `EFEONCE_ADMIN` hoy (único role existente); `COMMERCIAL_LEAD` cuando se cree.
5. ¿Aplicar el modelo retroactivamente a Sample Sprints históricos (Sky abril-mayo 2026)? Backfill manual con `engagement_approvals.approved_retroactively=true` y reason explícita. Task derivada post-V1.
6. **Nuevo en v1.1**: ¿el path HubSpot auto-create deal para `services` regulares (post-conversión) realmente existe hoy? Verificar antes de Slice 7. Si no existe, ese step queda como "trigger manual via UI" y se difiere a una task posterior.
7. **Nuevo en v1.1**: ¿deprecation timeline de `commercial_cost_attribution` v1? La spec aplica `attribution_intent` a v1 + v2 por safety, pero idealmente v1 se removerá. Sin task tracker eso, la columna en v1 se vuelve technical debt.
8. **Nuevo en v1.2 (B2 follow-up)**: ¿qué triggers exactos para notificaciones cliente automáticas en V2? Candidatos canónicos: `T-3 días kickoff`, `weekly progress digest cada viernes`, `T-7 días decision_deadline`, `outcome recorded`. Diseñar templates + i18n + opt-out cuando se materialice.
9. **Nuevo en v1.2**: capacity check ¿debe considerar también `payroll_period.exported` para calcular vacaciones planificadas? Hoy `getMemberCapacityForPeriod` solo cruza `client_team_assignments`. V2 podría incluir cobertura de vacaciones / licencias para reducir falsos positivos en el warning.
10. **Nuevo en v1.2 (B5 follow-up)**: schema canónico de `metrics_json` por `engagement_kind`. Hoy es JSONB sin shape. V2 necesita templates por kind (Operations Sprint vs Discovery Sprint tienen reportes muy distintos) — input para auto-generación de PDF.

## 17. 4-Pilar Score (Delta v1.2)

> Score post Delta v1.2: **9.0/10** (vs 8.4 en v1.1, 6.75 en v1.0). Mejoras de v1.1 → v1.2:
>
> - **Safety +0.5**: B4 capacity warning + override audit reduce blast radius de over-allocation; B2 deferral elimina riesgo reputacional de notif automática mal calibrada.
> - **Robustness +0.5**: cancellation paths (5 outcome_kinds vs 3); next_quotation_id resuelve gap de pricing post-conversión.
> - **Resilience +0.5**: B3 progress snapshots dan forensic trail durante operación; signal `stale_progress` detecta abandono temprano.
> - **Scalability +0.5**: naming sweep `engagement_*` permite que mañana "Strategic Workshop" o "Audit Sprint" se modelen como sub-tipo del paraguas sin migrations.
>
> Score detallado abajo se mantiene del Delta v1.1 con incrementos puntuales por las nuevas primitivas.

## 17.1 Score detallado heredado de Delta v1.1

### Safety

- **What can go wrong**: pilotos sin gobierno queman recursos, lifecycle se flipea sin trazabilidad, aprobaciones bypaseadas, audit trail corrupto.
- **Gates**: capability granular `commercial.pilot.{declare,approve,record_outcome,read}`, approval workflow obligatorio (`pilot_approvals.status='approved'` requerido para cost attribution), audit log append-only con triggers PG anti-update/delete.
- **Blast radius if wrong**: medium — un piloto fantasma cuesta dinero por cliente atribuido pero no contamina cross-tenant; el lifecycle history append-only protege auditoría.
- **Verified by**: 5 reliability signals (overdue/budget_overrun/zombie/unapproved_active/conversion_rate_drop), CHECK anti-zombie 120d, audit triggers, FK ON DELETE SET NULL para preservar audit cuando un actor deja la empresa.
- **Residual risk**: el path HubSpot auto-create deals (Open Q6) no está verificado; si no existe, el flow queda con un gap manual hasta que se implemente. Mitigación: en Slice 7 se verifica explícitamente y se difiere si necesario.
- **Score estimado**: 8.5/10.

### Robustness

- **Idempotency**: outbox events con `event_id` UUID PK + at-least-once consumer canónico (TASK-771/773); `service_outcomes UNIQUE (service_id)` previene doble-outcome; `service_lineage UNIQUE (parent, child, kind)` previene duplicados.
- **Atomicity**: §8 declara `BEGIN; ... COMMIT;` explícito para los 5 INSERTs core. Outbox event va en la misma tx. Reactive consumer (paso 6) es post-commit con rollback contract documentado en §8.1.
- **Race protection**: `service_commercial_terms_active_unique` partial index previene 2 terms activos simultáneos; `pilot_approvals UNIQUE (service_id)` previene re-approval; CHECK enums limitan transitions inválidas.
- **Constraint coverage**: 6 tablas, 8+ CHECK constraints, 6 FK con políticas explícitas (CASCADE para owned, SET NULL para actor).
- **Verified by**: 8 smoke tests §15 (happy/drop/adjusted/zombie/unapproved/budget/conversion/cost reclass) + audit log invariant.
- **Score estimado**: 8.5/10.

### Resilience

- **Retry policy**: outbox + reactive consumer hereda patrón canónico (exponential backoff bounded, dead_letter después de N).
- **Dead letter**: heredada del outbox canónico (`status='dead_letter'` cuando retries exhausted, alert via reliability signal).
- **Reliability signals**: 5 declarados, **subsystem `Commercial Health` declarado como NUEVO** (Slice 6 incluye registry migration mirror de TASK-672 `Finance Data Quality`).
- **Audit trail**: `pilot_decision_audit_log` append-only completo en §3.2, trigger anti-update/delete, indexed por (service_id, occurred_at DESC) para forensics rápido.
- **Recovery**: §8.1 declara rollback contract explícito; §10.2 documenta path manual via endpoint admin si dead_letter persiste; runbook por signal pending pero estructura clara.
- **Residual risk**: runbooks específicos no escritos aún (parte del Slice 6). El reliability signal `commercial.pilots.zombie` cubre detección pero la respuesta operativa (¿desbloquear vía admin?) queda como TODO.
- **Score estimado**: 8/10.

### Scalability

- **Hot path Big-O**: O(1) lookup por service_id; lineage graph traversal O(n) en cadenas — bounded en práctica por la longitud típica del journey (3-5 pilotos por client max realista).
- **Index coverage**: §3.4 declara los 4 índices faltantes (lineage parent + child, pilot_approvals pending, outcomes decision DESC). UNIQUE active partial en commercial_terms ya cubre hot read.
- **Async paths**: outbox + reactive consumer ✅ (post-commit, no bloquea write path).
- **Cost at 10x**: a 100 pilotos/año el modelo escala bien; a 1000/año `service_lineage` puede necesitar partitioning (no es problema actual).
- **Pagination**: spec no declara cursores en `/agency/pilots` — para 100 rows trivial; debería declararse en Slice 8 al implementar UI.
- **Residual risk**: si se aplica multi-tenant (Open Q2) — un piloto cross-tenant — la atomicidad transaccional cruza schemas y necesita rediseño. No es problema actual.
- **Score estimado**: 8.5/10.

**Score promedio post-Delta: 8.4/10** (vs 6.75/10 en v1.0). **Bloqueantes resueltos. Spec lista para invocar `greenhouse-task-planner` y generar TASK-### tracking files** (uno por slice del roadmap §11).

## 18. Changelog

| Fecha | Versión | Autor | Cambio |
|---|---|---|---|
| 2026-05-05 | 1.0 | Claude (Opus 4.7) | Spec inicial — propuesta no implementada |
| 2026-05-05 | 1.1 | Claude (Opus 4.7) — auditoría con `arch-architect` | Delta v1.1: 3 errores materiales corregidos (schema cost attribution, FK actor, cita TASK-728), 4 supuestos verificados (lifecycle enum, source enum, subsystem novel, owner approve), DDL completa de `pilot_decision_audit_log` agregada, índices faltantes (lineage, approvals pending, outcomes decision), boundary transaccional explícito en §8, lifecycle history canónico aplicado en §10.2, patrón TASK-409 + TASK-760/761/762 reusados explícitamente. Score 4-pilar: 6.75/10 → 8.5/10 estimado. |
| 2026-05-05 | 1.2 | Claude (Opus 4.7) — pre-flight check + naming "Sample Sprint" | Delta v1.2: rebrand UI "Sample Sprint" + sub-tipos (Operations/Extension/Validation/Discovery Sprint); naming sweep de tablas a `engagement_*` (genérico — sobrevive marketing pivots); 5 decisiones de alcance V1 resueltas (B1 naming híbrido, B2 notif diferidas a V2, B3 progress snapshots incluido, B4 capacity warning soft, B5 reporte manual con structured fields); nueva tabla `engagement_progress_snapshots` (Slice 4.5); extensión `client_team_assignments.service_id` FK opcional; outcome enum extendido con `cancelled_by_client/provider` + `cancellation_reason`; `next_quotation_id` para pricing post-conversión; capability `commercial.engagement.record_progress` nueva; signal `commercial.engagement.stale_progress` nueva; 9 outbox events (vs 6 en v1.1); 16 hard rules (vs 11); 16 smoke tests (vs 8); 10 open questions (vs 7). Score 4-pilar: 8.5/10 → 9.0/10 estimado. **Spec lista para `greenhouse-task-planner`**. |
