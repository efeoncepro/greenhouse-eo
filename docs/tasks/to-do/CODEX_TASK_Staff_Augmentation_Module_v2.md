# CODEX TASK -- Staff Augmentation Module v2: Placements como extension canonica de Assignments

## Estado

Baseline canonica de implementacion al 2026-03-19.

Esta version conserva la intencion funcional de `CODEX_TASK_Staff_Augmentation_Module.md`, pero reescribe su base tecnica para alinearla con la arquitectura viva del proyecto:
- `PostgreSQL` como write path principal
- `client_team_assignments` como ancla operacional del placement
- `TEXT` como convencion de PK/FK en el core
- `space_id` como boundary principal
- `ICO Engine` consumido como capa semantica reusable, no como calculo especial ad hoc

## Resumen

Implementar `Staff Augmentation` como una extension comercial y operativa del modelo de assignments existente.

La decision v2 es:
- el placement no reemplaza al assignment
- el placement no crea una identidad paralela de persona, servicio o cliente
- el placement vive como satelite de un `client_team_assignment`
- el modulo comercial interno se monta sobre ese backbone

El objetivo de negocio se mantiene:
- distinguir placements de staff aug de asignaciones internas normales
- capturar metadata contractual, comercial y operativa
- habilitar lectura y gestion interna de pipeline, renovaciones, onboarding y margen
- preparar una futura experiencia client-facing y una futura lectura ICO por placement

## Decision de arquitectura

### Principios

- `client_team_assignments` sigue siendo el anchor operacional del roster
- `staff_aug_placements` es una extension transaccional del assignment
- `PostgreSQL` es fuente de verdad para placements, checklist, eventos y referencias externas
- `BigQuery` queda para analitica derivada y compatibilidad temporal
- `Deel` sigue siendo fuente de verdad contractual/EOR
- `Payroll` y `Finance` siguen siendo dueños de su verdad transaccional

### Regla canonica

Un placement siempre pertenece a exactamente un assignment.

Un assignment:
- puede no tener placement
- puede tener un solo placement activo o historico

Esto preserva la regla del 360 object model:
- no inventar una identidad paralela para algo que ya tiene anchor
- extender el objeto o la transaccion existente con tablas satelite

## Lo que Staff Augmentation es y no es

`Staff Augmentation` si es:
- un tipo de assignment
- una capa comercial y contractual sobre una asignacion existente
- una superficie interna de operacion para placements
- una futura capacidad client-facing derivada de servicios activos

`Staff Augmentation` no es:
- un modulo de reclutamiento
- un reemplazo de Deel
- un reemplazo de Payroll
- una nueva identidad canonica de persona
- una nueva identidad canonica de servicio

## Scope MVP

Incluye:
- `assignment_type = 'staff_augmentation'`
- tabla `greenhouse_core.staff_aug_placements`
- onboarding checklist y event log en PostgreSQL
- CRUD interno basico
- dashboard interno y detalle de placement
- enrichment de People / assignments

No incluye:
- integracion bidireccional con API de Deel
- sync formal de surveys con HubSpot
- financial closeout profundo
- alertas productizadas multicanal
- atribucion ICO full por placement
- capa client-facing completa

## Posicion en el grafo

```text
Organization
  -> Space
     -> Assignment
        -> StaffAugPlacement
```

Relaciones derivadas:
- `Placement -> Member` via assignment
- `Placement -> Service` opcional / derivada
- `Placement -> Finance` via referencias o joins posteriores
- `Placement -> ICO` via bridge de assignment + member + space, no via formula nueva

## Modelo de datos recomendado

### A1. Enriquecimiento de assignments

Agregar a `greenhouse_core.client_team_assignments`:

```sql
ALTER TABLE greenhouse_core.client_team_assignments
ADD COLUMN IF NOT EXISTS assignment_type TEXT NOT NULL DEFAULT 'internal'
CHECK (assignment_type IN ('internal', 'staff_augmentation'));
```

Reglas:
- todos los assignments actuales siguen como `internal`
- la mutacion a `staff_augmentation` debe ocurrir de forma explicita

### A2. Tabla `greenhouse_core.staff_aug_placements`

```sql
CREATE TABLE greenhouse_core.staff_aug_placements (
  placement_id TEXT PRIMARY KEY,
  eo_id TEXT NOT NULL UNIQUE,

  assignment_id TEXT NOT NULL
    REFERENCES greenhouse_core.client_team_assignments(assignment_id),

  space_id TEXT NOT NULL
    REFERENCES greenhouse_core.spaces(space_id),

  member_id TEXT NOT NULL,
  service_id TEXT,

  business_unit TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pipeline',

  eor_provider TEXT NOT NULL DEFAULT 'deel',
  external_contract_ref TEXT,
  legal_entity TEXT,
  contractor_country TEXT,
  contract_type TEXT NOT NULL DEFAULT 'contractor',

  cost_rate_amount NUMERIC(12,2),
  cost_rate_currency TEXT NOT NULL DEFAULT 'USD',
  billing_rate_amount NUMERIC(12,2),
  billing_rate_currency TEXT NOT NULL DEFAULT 'USD',
  billing_frequency TEXT NOT NULL DEFAULT 'monthly',

  contract_start_date DATE,
  contract_end_date DATE,
  actual_end_date DATE,
  renewal_alert_days INTEGER NOT NULL DEFAULT 60,

  sla_availability_percent NUMERIC(5,2),
  sla_response_hours INTEGER,
  sla_notice_period_days INTEGER NOT NULL DEFAULT 30,

  client_reporting_to TEXT,
  client_tools TEXT[] NOT NULL DEFAULT '{}',
  client_communication_channel TEXT,
  placement_notes TEXT,
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  matched_skills TEXT[] NOT NULL DEFAULT '{}',

  created_by_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_staff_aug_status CHECK (
    status IN ('pipeline', 'onboarding', 'active', 'renewal_pending', 'renewed', 'ended')
  ),
  CONSTRAINT valid_bu CHECK (
    business_unit IN ('globe', 'efeonce_digital', 'reach', 'wave', 'crm_solutions')
  ),
  CONSTRAINT valid_contract_dates CHECK (
    contract_end_date IS NULL OR contract_start_date IS NULL OR contract_end_date >= contract_start_date
  )
);

CREATE INDEX idx_staff_aug_placements_assignment_id
  ON greenhouse_core.staff_aug_placements(assignment_id);

CREATE INDEX idx_staff_aug_placements_space_id
  ON greenhouse_core.staff_aug_placements(space_id);

CREATE INDEX idx_staff_aug_placements_member_id
  ON greenhouse_core.staff_aug_placements(member_id);

CREATE INDEX idx_staff_aug_placements_status
  ON greenhouse_core.staff_aug_placements(status);
```

Notas:
- usar `TEXT`, no `UUID`, para alinear con el backbone vivo
- `service_id` es opcional en MVP
- el margen puede exponerse como campo derivado en query/view, no necesariamente como columna generada inicial

### A3. Tabla `greenhouse_core.staff_aug_onboarding_items`

```sql
CREATE TABLE greenhouse_core.staff_aug_onboarding_items (
  onboarding_item_id TEXT PRIMARY KEY,
  placement_id TEXT NOT NULL
    REFERENCES greenhouse_core.staff_aug_placements(placement_id),

  item_key TEXT NOT NULL,
  item_label TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'pending',
  sort_order INTEGER NOT NULL DEFAULT 0,
  blocker_note TEXT,
  verified_at TIMESTAMPTZ,
  verified_by_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (placement_id, item_key)
);
```

### A4. Tabla `greenhouse_core.staff_aug_events`

```sql
CREATE TABLE greenhouse_core.staff_aug_events (
  staff_aug_event_id TEXT PRIMARY KEY,
  placement_id TEXT NOT NULL
    REFERENCES greenhouse_core.staff_aug_placements(placement_id),

  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  created_by_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Relacion con Services

`Staff Augmentation` debe poder convivir con `Services`, pero el placement no debe depender de que Services ya este completamente cerrado.

Regla MVP:
- el placement funciona sin `service_id`
- si existe un `Service` activo de `staff_augmentation`, el placement puede enlazarse
- el modulo comercial puede usar ese link para enrichment posterior

No hacer del `service_id` un bloqueo de creacion del placement.

## Relacion con Finance

La task original acierta en que el placement tiene economics propios.

Pero en MVP:
- guardar `cost_rate_amount` y `billing_rate_amount` en PostgreSQL
- derivar `margin` en lectura
- dejar revenue recognition, P&L consolidado y reconciliacion profunda para fase posterior

No intentar convertir el modulo en subledger financiero desde el dia 1.

## Relacion con ICO Engine

Este es el punto mas sensible de la v2.

La task original acierta al querer metricas por placement, pero la implementacion no debe asumir que `placement` ya es una dimension nativa equivalente a `space`, `project` o `member`.

### Regla MVP

En MVP, el modulo puede mostrar:
- metricas del `member`
- filtradas al `space` del placement
- explicitas como proxy operacional del placement

No etiquetar eso como atribucion perfecta por placement si:
- el member tiene mas de un assignment activo
- el member mezcla trabajo interno y staff aug
- no existe bridge temporal inequívoco entre tareas y assignment

### Fase posterior

Solo cuando exista un bridge claro `task -> assignment/placement` o una regla temporal confiable, `placement` podra entrar como dimension formal del `ICO Engine`.

Hasta entonces:
- `ICO by placement` se trata como proxy o enrichment
- no como dimension canonica cerrada del engine

## API surface MVP

Internas:
- `GET /api/internal/staff-augmentation/placements`
- `POST /api/internal/staff-augmentation/placements`
- `GET /api/internal/staff-augmentation/placements/[placementId]`
- `PATCH /api/internal/staff-augmentation/placements/[placementId]`
- `GET /api/internal/staff-augmentation/dashboard`
- `GET /api/internal/staff-augmentation/placements/[placementId]/onboarding`
- `PATCH /api/internal/staff-augmentation/placements/[placementId]/onboarding/[itemId]`

Reglas:
- acceso por route group `internal`
- filtrado estricto por `space_id` cuando aplique
- no usar `middleware.ts` como boundary de auth

## UI MVP

Interno:
- `/internal/staff-augmentation`
- `/internal/staff-augmentation/[placementId]`

People:
- enrichment del tab de organizaciones / assignments
- badges o labels de `assignment_type`

Client-facing:
- dejar para fase posterior, idealmente atado a capability/service real

## Fases recomendadas

### Fase 1

- `assignment_type`
- `staff_aug_placements`
- onboarding
- events
- CRUD interno basico
- People enrichment

### Fase 2

- dashboard interno
- filtros por BU, status, expiracion
- economics derivados basicos
- link opcional a `service_id`

### Fase 3

- financial overlays
- renewals and alerts
- client-facing surface minima

### Fase 4

- surveys HubSpot
- integrations con Deel
- `ICO by placement` formal solo si el bridge de atribucion ya existe

## Regla operativa final

Esta `v2` mantiene la tesis correcta del brief original:
- Staff Augmentation si merece un modulo propio
- pero debe construirse como extension canonica de assignments, no como identidad paralela

Ante conflicto, prevalecen:
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/tasks/in-progress/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/tasks/to-do/Greenhouse_Services_Architecture_v1.md`
