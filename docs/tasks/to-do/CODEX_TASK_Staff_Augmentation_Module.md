# CODEX TASK — Staff Augmentation Module: Gestión de Placements y Capa Comercial para Greenhouse

## Resumen

Implementar el módulo de **Staff Augmentation** como sistema de dos capas en Greenhouse: (A) enriquecimiento del modelo de asignaciones existente para distinguir placements de Staff Augmentation de asignaciones internas, y (B) módulo comercial con vista de agencia para gestionar el ciclo de vida completo de cada placement — desde pipeline hasta cierre, con métricas ICO por placement, tracking de contratos Deel, análisis de margen, y experiencia client-facing.

**El problema hoy:** Efeonce vende Staff Augmentation como servicio comercial transversal a todas sus unidades de negocio: Globe coloca Directores de Arte, Copywriters y Motion Designers; Efeonce Digital coloca CRM Specialists, SEO/AEO Analysts y Growth Marketers; Reach coloca Media Buyers y Performance Analysts; Wave coloca Frontend Developers y Tracking Specialists; CRM Solutions coloca HubSpot Consultants y Salesforce Admins. Todos operan integrados al equipo del cliente vía Deel como EOR, con blindaje legal completo y cero riesgo laboral para el cliente. Internamente esto se registra como un `client_team_assignment` normal — una persona asignada a un Space con un FTE. Pero no hay distinción entre un diseñador que trabaja en producción interna de Globe para Sky Airline vs. un diseñador que está colocado *dentro* del equipo de Sky como Staff Augmentation. La diferencia es legal (Deel EOR), comercial (billing rate vs. cost rate, margen), contractual (SLA, fecha de vencimiento, renovación), y operativa (onboarding al stack del cliente, reporting de performance al cliente).

**La solución:** Dos capas complementarias:

1. **Layer B — Assignment Model Enrichment:** Extensión de `client_team_assignments` con `assignment_type` (`internal` | `staff_augmentation`) y tabla satélite `staff_aug_placements` con metadata específica (Deel, rates, SLA, contrato). La ficha de persona en People se enriquece con indicadores visuales de tipo. El drawer de asignación permite crear placements de Staff Aug con campos adicionales.

2. **Layer C — Staff Augmentation Commercial Module:** Vista de agencia en `/internal/staff-augmentation` para operadores y admins. Talent pool activo, pipeline de placements, monitoreo de SLA, análisis de margen, alertas de renovación, y onboarding tracker. Consume data del assignment model enriched, del ICO Engine, del Financial Module, y de HubSpot Services.

**Lo que Staff Augmentation NO es:**

- **No reemplaza el assignment.** El placement ES un assignment con `assignment_type = 'staff_augmentation'`. No duplica la entidad — la enriquece.
- **No es un módulo de reclutamiento.** No gestiona el sourcing ni la selección de talento. Gestiona el placement una vez que la persona está definida.
- **No reemplaza Deel.** Deel sigue siendo el EOR y la fuente de verdad para contratos, pagos al contractor, y compliance. Greenhouse referencia el contrato Deel pero no lo duplica.
- **No tiene payroll propio.** La compensación del talento colocado se gestiona en HR Payroll (si es equipo Efeonce directo) o en Deel (si es contractor). El módulo trackea el billing rate al cliente, no el pago al recurso.

---

## Contexto del proyecto

- **Repo:** `github.com/efeoncepro/greenhouse-eo`
- **Branch de trabajo:** `feature/staff-augmentation`
- **Framework:** Next.js 16.1.1, React 19.2.3, MUI 7.x, TypeScript 5.9.3, Vuexy Admin Template
- **Deploy:** Vercel (Pro)
- **GCP Project:** `efeonce-group`
- **PostgreSQL:** Instance `greenhouse-pg-dev`, database `greenhouse_app`, schema `greenhouse_core`
- **BigQuery:** Datasets `greenhouse` (legacy), `greenhouse_conformed`, `ico_engine`

### Documentos normativos (LEER ANTES DE ESCRIBIR CÓDIGO)

| Documento | Qué aporta |
|-----------|------------|
| `GREENHOUSE_IDENTITY_ACCESS_V2.md` | Modelo de roles, route groups, enforcement. Staff Aug usa route group `internal` |
| `Greenhouse_Account_360_Object_Model_v1.md` | Patrón canónico de objetos. EO-ID convention (`EO-PLC-XXXX` para placements). PostgreSQL patterns |
| `Greenhouse_Services_Architecture_v1.md` | Modelo de servicios. Staff Augmentation como servicio registrado en HubSpot (0-162) |
| `Greenhouse_ICO_Engine_v1.md` | Motor de métricas. Métricas ICO por placement = nueva granularidad |
| `CODEX_TASK_Admin_Team_Module_v2.md` | APIs de assignments existentes. Staff Aug extiende este modelo |
| `CODEX_TASK_People_Unified_View.md` | Ficha de persona. El tab Organizaciones consume el modelo enriched |
| `CODEX_TASK_Financial_Module.md` | Módulo financiero. Staff Aug consume `fin_client_economics` para margen |
| `CODEX_TASK_HR_Payroll_Module_v2.md` | Payroll. Compensación del talento colocado (si es equipo directo) |
| `Greenhouse_Nomenclatura_Portal_v3.md` | Design tokens, colores, tipografía, nomenclatura |
| `AGENTS.md` (en el repo) | Reglas operativas del repo |

---

## Dependencias previas

### DEBE existir

- [ ] Schema `greenhouse_core` creado en PostgreSQL (`greenhouse-pg-dev`)
- [ ] Tabla `greenhouse_core.spaces` existente con `space_id` como tenant boundary
- [ ] Auth con NextAuth.js funcionando con `client_users`, roles, scopes
- [ ] Admin Team Module implementado (tabla `team_members`, `client_team_assignments` en BigQuery o PostgreSQL)
- [ ] People Unified View implementada (ficha de persona con tabs)
- [ ] Identity Access V2 con route group `internal` funcional

### Deseable pero no bloqueante

- [ ] Services Architecture implementada (sin ella, el placement funciona — la conexión a HubSpot Service es P2)
- [ ] Financial Module implementado (sin él, el análisis de margen se hace con data manual)
- [ ] ICO Engine materializado (sin él, las métricas por placement se muestran como empty state)
- [ ] Account 360 Object Model completo (organizations, spaces)

---

## Posición en la jerarquía de objetos

```
Organization (EO-ORG-XXXX)
  └── Space (EO-SPC-XXXX) — tenant operativo
        │
        ├── Services[] (EO-SRV-XXXX) — unidades comerciales
        │     └── Service: "Creative Staff Augmentation" ← NUEVO como servicio en HubSpot
        │
        ├── Campaigns[] (EO-CMP-XXXX) — iniciativas de negocio
        │
        ├── Assignments[] — asignaciones de equipo (existentes)
        │     ├── assignment_type: 'internal' (default, producción Efeonce)
        │     └── assignment_type: 'staff_augmentation' ← NUEVO
        │           └── Placement (EO-PLC-XXXX) — metadata satélite ← NUEVO
        │                 ├── Deel contract reference
        │                 ├── Rate card (cost, billing, margin)
        │                 ├── SLA definition
        │                 ├── Onboarding checklist
        │                 └── Performance snapshots (ICO per placement)
        │
        └── Persons[] — contactos del cliente
```

**Regla canónica:** Un Placement siempre tiene exactamente un Assignment padre. Un Assignment puede tener cero o un Placement hijo (cero si es `internal`, uno si es `staff_augmentation`).

---

## PARTE A: Schema — Layer B (Assignment Model Enrichment)

### A1. Extensión de `client_team_assignments`

Agregar campo `assignment_type` a la tabla existente:

```sql
-- En BigQuery (si assignments siguen en BQ)
ALTER TABLE `efeonce-group.greenhouse.client_team_assignments`
ADD COLUMN IF NOT EXISTS assignment_type STRING DEFAULT 'internal';
-- Valores: 'internal' | 'staff_augmentation'

-- En PostgreSQL (si ya migró a greenhouse_core)
ALTER TABLE greenhouse_core.client_team_assignments
ADD COLUMN IF NOT EXISTS assignment_type VARCHAR(30) NOT NULL DEFAULT 'internal'
CHECK (assignment_type IN ('internal', 'staff_augmentation'));
```

**Impacto:** Retrocompatible. Todos los assignments existentes quedan como `'internal'`. Las queries existentes no se rompen.

### A2. Tabla satélite: `greenhouse_core.staff_aug_placements`

```sql
CREATE TABLE greenhouse_core.staff_aug_placements (
  -- Identidad canónica
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eo_id VARCHAR(20) UNIQUE NOT NULL,                    -- EO-PLC-XXXX
  
  -- Vínculo al assignment padre
  assignment_id VARCHAR(100) NOT NULL,                   -- FK a client_team_assignments.assignment_id
  
  -- Contexto del placement
  space_id VARCHAR(100) NOT NULL,                        -- FK a spaces (tenant boundary)
  member_id VARCHAR(100) NOT NULL,                       -- FK a team_members
  service_id UUID,                                       -- FK a services (cuando exista Service de Staff Aug)
  
  -- Unidad de negocio que origina el placement
  business_unit VARCHAR(50) NOT NULL,                    -- 'globe' | 'efeonce_digital' | 'reach' | 'wave' | 'crm_solutions'
  -- Globe: creativos (DA, Copywriter, Motion). Efeonce Digital: growth/CRM/SEO. Reach: media/performance.
  -- Wave: dev/tracking. CRM Solutions: HubSpot/Salesforce consultants.
  
  -- Estado del placement
  status VARCHAR(30) NOT NULL DEFAULT 'pipeline',
  -- Valores: 'pipeline' | 'onboarding' | 'active' | 'renewal_pending' | 'renewed' | 'ended'
  
  -- Contrato y compliance
  eor_provider VARCHAR(50) DEFAULT 'deel',               -- 'deel' | 'direct' | 'other'
  deel_contract_id VARCHAR(100),                         -- ID del contrato en Deel (referencia, no sync)
  legal_entity VARCHAR(255),                             -- Entidad legal del contractor
  contractor_country VARCHAR(2),                         -- ISO 3166-1 alpha-2
  contract_type VARCHAR(30) DEFAULT 'contractor',        -- 'contractor' | 'eor_employee'
  
  -- Rate card
  cost_rate_amount DECIMAL(12,2),                        -- Costo para Efeonce (lo que se paga al recurso/Deel)
  cost_rate_currency VARCHAR(3) DEFAULT 'USD',           -- ISO 4217
  billing_rate_amount DECIMAL(12,2),                     -- Lo que se cobra al cliente
  billing_rate_currency VARCHAR(3) DEFAULT 'USD',
  billing_frequency VARCHAR(20) DEFAULT 'monthly',       -- 'monthly' | 'biweekly' | 'hourly'
  margin_percent DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN billing_rate_amount > 0 AND cost_rate_amount IS NOT NULL
      THEN ROUND(((billing_rate_amount - cost_rate_amount) / billing_rate_amount) * 100, 2)
      ELSE NULL
    END
  ) STORED,
  
  -- Temporalidad
  contract_start_date DATE,                              -- Inicio del contrato con el cliente
  contract_end_date DATE,                                -- Fin planificado del contrato
  actual_end_date DATE,                                  -- Fin real (si terminó antes/después)
  renewal_alert_days INTEGER DEFAULT 60,                 -- Días antes del end_date para alertar
  
  -- SLA
  sla_availability_percent DECIMAL(5,2),                 -- ej: 95.00 = 95% disponibilidad
  sla_response_hours INTEGER,                            -- Tiempo máximo de respuesta en horas
  sla_notice_period_days INTEGER DEFAULT 30,             -- Días de aviso para terminación
  
  -- Contexto operativo del placement
  client_reporting_to VARCHAR(255),                      -- Nombre del manager en el equipo del cliente
  client_tools TEXT[],                                   -- Herramientas del cliente (ej: ['Figma', 'Slack', 'Asana'])
  client_communication_channel VARCHAR(100),             -- Canal principal de comunicación con el cliente
  placement_notes TEXT,                                  -- Notas internas sobre el placement
  
  -- Skill profile
  required_skills TEXT[],                                -- Skills requeridos por el cliente
  matched_skills TEXT[],                                 -- Skills del recurso que matchean
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(100),
  
  -- Constraints
  CONSTRAINT valid_dates CHECK (contract_end_date IS NULL OR contract_end_date >= contract_start_date),
  CONSTRAINT valid_rates CHECK (cost_rate_amount IS NULL OR cost_rate_amount >= 0),
  CONSTRAINT valid_billing CHECK (billing_rate_amount IS NULL OR billing_rate_amount >= 0)
);

-- Trigger de updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON greenhouse_core.staff_aug_placements
FOR EACH ROW EXECUTE FUNCTION greenhouse_core.update_updated_at();

-- Secuencia para EO-ID
CREATE SEQUENCE IF NOT EXISTS greenhouse_core.placement_eo_id_seq START 1;

-- Índices
CREATE INDEX idx_placements_assignment ON greenhouse_core.staff_aug_placements(assignment_id);
CREATE INDEX idx_placements_space ON greenhouse_core.staff_aug_placements(space_id);
CREATE INDEX idx_placements_member ON greenhouse_core.staff_aug_placements(member_id);
CREATE INDEX idx_placements_status ON greenhouse_core.staff_aug_placements(status);
CREATE INDEX idx_placements_business_unit ON greenhouse_core.staff_aug_placements(business_unit);
CREATE INDEX idx_placements_contract_end ON greenhouse_core.staff_aug_placements(contract_end_date)
  WHERE status IN ('active', 'renewal_pending');
```

### A3. Tabla: `greenhouse_core.placement_onboarding_checklists`

```sql
CREATE TABLE greenhouse_core.placement_onboarding_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id UUID NOT NULL REFERENCES greenhouse_core.staff_aug_placements(id),
  
  -- Checklist item
  item_key VARCHAR(100) NOT NULL,                        -- ej: 'client_email_access', 'figma_access', 'slack_channel'
  item_label VARCHAR(255) NOT NULL,                      -- Label visible: "Acceso a email corporativo del cliente"
  category VARCHAR(50) NOT NULL DEFAULT 'tools',         -- 'tools' | 'communication' | 'brand' | 'compliance' | 'general'
  
  -- Estado
  status VARCHAR(30) NOT NULL DEFAULT 'pending',         -- 'pending' | 'in_progress' | 'verified' | 'blocked' | 'not_applicable'
  verified_at TIMESTAMPTZ,
  verified_by VARCHAR(100),
  blocker_note TEXT,                                     -- Si está bloqueado, por qué
  
  -- Orden
  sort_order INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(placement_id, item_key)
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON greenhouse_core.placement_onboarding_checklists
FOR EACH ROW EXECUTE FUNCTION greenhouse_core.update_updated_at();
```

**Template de checklist por defecto** (se crea al crear un placement):

| item_key | item_label | category |
|----------|-----------|----------|
| `client_email_access` | Acceso a email corporativo del cliente | tools |
| `client_project_tool` | Acceso a herramienta de gestión del cliente | tools |
| `client_design_tool` | Acceso a herramientas de diseño del cliente | tools |
| `client_storage_access` | Acceso a almacenamiento/drive del cliente | tools |
| `communication_channel` | Canal de comunicación configurado | communication |
| `client_team_intro` | Presentación al equipo del cliente | communication |
| `reporting_cadence` | Cadencia de reporting acordada | communication |
| `brand_guidelines` | Brand guidelines del cliente recibidos | brand |
| `brand_assets` | Assets de marca del cliente disponibles | brand |
| `deel_contract_signed` | Contrato Deel firmado | compliance |
| `nda_signed` | NDA firmado (si aplica) | compliance |
| `ip_assignment` | Acuerdo de propiedad intelectual | compliance |

### A4. Tabla: `greenhouse_core.placement_events`

```sql
CREATE TABLE greenhouse_core.placement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id UUID NOT NULL REFERENCES greenhouse_core.staff_aug_placements(id),
  
  -- Evento
  event_type VARCHAR(50) NOT NULL,
  -- Valores: 'created' | 'status_change' | 'rate_change' | 'extension' | 'sla_update' |
  --          'feedback_received' | 'renewal_initiated' | 'ended' | 'note_added'
  
  -- Detalle
  event_data JSONB DEFAULT '{}',                         -- Datos específicos del evento (ej: {from: 'active', to: 'renewal_pending'})
  description TEXT,                                      -- Descripción legible del evento
  
  -- Autoría
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_placement_events_placement ON greenhouse_core.placement_events(placement_id);
CREATE INDEX idx_placement_events_type ON greenhouse_core.placement_events(event_type);
```

### A5. Satisfaction Surveys — HubSpot Service Hub como fuente de verdad

**Decisión arquitectónica:** Las encuestas de satisfacción (NPS, CSAT) se gestionan en **HubSpot Service Hub Pro**, no en Greenhouse. HubSpot es la fuente de verdad para la creación, envío, y almacenamiento de surveys. Greenhouse consume las respuestas vía API y las contextualiza por placement.

**Justificación:**
- Efeonce ya tiene Service Hub Pro con NPS, CSAT y CES habilitados
- HubSpot ofrece shareable links, templates, follow-up workflows automáticos, y dashboards nativos de NPS
- Las respuestas quedan vinculadas al Contact en HubSpot (el contacto del cliente), enriqueciendo su perfil CRM
- Evita duplicar infraestructura de surveys — Greenhouse consume, no recrea

**Flujo:**

```
1. Greenhouse genera la intención de survey
   └── Operador hace click en "Enviar survey" desde el tab Satisfaction del placement
   └── O scheduled job detecta que es fin de mes para un placement activo

2. Greenhouse crea el survey en HubSpot via Surveys API (beta)
   └── POST /surveys/v3/surveys → crea NPS o CSAT survey
   └── Survey name: "Staff Aug NPS — {member_name} — {space_name} — {period}"
   └── Retorna shareableLink

3. Greenhouse envía el shareable link al contacto del cliente
   └── Via Transactional Email (Resend) o via HubSpot email workflow
   └── Destinatario: el contact asociado al Space (client_reporting_to o contacto principal)

4. El cliente responde en HubSpot
   └── La respuesta se almacena como feedback_submission en HubSpot CRM
   └── HubSpot registra: hs_value (score), hs_content (texto), hs_sentiment, hs_contact_id

5. Greenhouse sincroniza la respuesta
   └── Pipeline hubspot-bigquery sincroniza feedback_submissions a BigQuery
   └── O Greenhouse lee directamente via Feedback Submissions API (GET /crm/v3/objects/feedback_submissions)
```

**Tabla local: `greenhouse_core.placement_survey_refs`**

No almacena las respuestas — almacena la referencia al survey de HubSpot y la metadata del contexto de placement.

```sql
CREATE TABLE greenhouse_core.placement_survey_refs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id UUID NOT NULL REFERENCES greenhouse_core.staff_aug_placements(id),
  
  -- Referencia a HubSpot
  hubspot_survey_id VARCHAR(50),                         -- ID del survey en HubSpot
  hubspot_survey_type VARCHAR(20) NOT NULL,              -- 'NPS' | 'CSAT' | 'CES' | 'CUSTOM'
  hubspot_shareable_link VARCHAR(500),                   -- Link generado por Surveys API
  hubspot_feedback_submission_id VARCHAR(50),             -- ID de la respuesta (cuando existe)
  
  -- Contexto del survey
  period VARCHAR(20) NOT NULL,                           -- ej: '2026-03'
  sent_to_email VARCHAR(255),                            -- Email del destinatario
  sent_to_name VARCHAR(255),                             -- Nombre del destinatario
  
  -- Estado
  status VARCHAR(30) NOT NULL DEFAULT 'created',         -- 'created' | 'sent' | 'responded' | 'expired'
  
  -- Datos de la respuesta (cacheados desde HubSpot para lectura rápida)
  response_score INTEGER,                                -- hs_value: 0-10 para NPS, 0-2 para CSAT
  response_sentiment VARCHAR(20),                        -- hs_sentiment: 'Promoter' | 'Passive' | 'Detractor'
  response_content TEXT,                                 -- hs_content: texto del feedback
  responded_at TIMESTAMPTZ,                              -- Timestamp de respuesta
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(100),
  
  UNIQUE(placement_id, period, hubspot_survey_type)
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON greenhouse_core.placement_survey_refs
FOR EACH ROW EXECUTE FUNCTION greenhouse_core.update_updated_at();

CREATE INDEX idx_survey_refs_placement ON greenhouse_core.placement_survey_refs(placement_id);
CREATE INDEX idx_survey_refs_status ON greenhouse_core.placement_survey_refs(status);
```

**Sync de respuestas:** Un job periódico (o trigger al abrir el tab Satisfaction) consulta HubSpot Feedback Submissions API para surveys con `status = 'sent'`, verifica si hay respuesta, y actualiza `response_score`, `response_sentiment`, `response_content`, `responded_at`, y `status = 'responded'`.

**Properties de HubSpot relevantes para el GET:**

| Property | Uso |
|----------|-----|
| `hs_value` | Score numérico (0-10 NPS, 0-2 CSAT) |
| `hs_content` | Texto de feedback del contacto |
| `hs_sentiment` | Clasificación automática: Promoter / Passive / Detractor |
| `hs_survey_name` | Nombre del survey (para match con placement) |
| `hs_survey_type` | NPS / CSAT / CES / CUSTOM |
| `hs_contact_id` | Contact de HubSpot que respondió |
| `hs_submission_timestamp` | Cuándo respondió |

**Ventaja de esta arquitectura:**
- Los datos de NPS/CSAT viven en HubSpot, consultables desde reportes CRM nativos, workflows, y Kortex
- Greenhouse muestra la data contextualizada por placement (trend de NPS de este recurso en este cliente)
- Si el contacto del cliente ya tiene historial de NPS en HubSpot (de otros servicios), se puede comparar el NPS de Staff Aug vs. On-Going
- Los workflows de HubSpot pueden disparar acciones automáticas (ej: si NPS ≤ 6, crear ticket de alerta)
```

### A6. Servicio en HubSpot — `staff_augmentation`

Staff Augmentation es un servicio **transversal** a todas las unidades de negocio de Efeonce. No es exclusivo de Globe. Cada unidad puede colocar talento bajo este modelo.

Agregar al catálogo de HubSpot Products / Services:

| Property | Value |
|----------|-------|
| `name` | Staff Augmentation |
| `ef_service_code` | `staff_augmentation` |
| `ef_capability_family` | Transversal (no atado a una sola línea de servicio) |
| `ef_unit` | Todas: Globe, Efeonce Digital, Reach, Wave, CRM Solutions |
| `pipeline_stage` | Mismo pipeline de Services: `onboarding → active → renewal_pending → renewed → closed` |

**Perfiles típicos por unidad:**

| Unidad | Perfiles de Staff Aug |
|--------|----------------------|
| Globe | Director de Arte, Copywriter, Motion Designer, Diseñador Gráfico, Productor Audiovisual |
| Efeonce Digital | CRM Specialist, SEO/AEO Analyst, Growth Marketer, Social Media Strategist, Content Strategist |
| Reach | Media Buyer, Performance Analyst, Programmatic Specialist, PR Specialist |
| Wave | Frontend Developer, Tracking Specialist, Web Performance Engineer, Data Analyst |
| CRM Solutions | HubSpot Consultant, Salesforce Admin, Marketing Automation Specialist |

**Regla:** La `business_unit` del placement determina qué unidad de Efeonce "vende" el recurso. Esto permite analytics de revenue de Staff Aug por unidad, que alimenta tanto el dashboard interno como los reportes financieros por BU.

**En el Capability Registry** (TypeScript), agregar como servicio transversal:

```typescript
// En capability-registry.ts — servicio transversal, no atado a linea_de_servicio
// Se activa para cualquier cliente que tenga un Service con ef_service_code = 'staff_augmentation'
{
  id: 'staff-augmentation',
  label: 'Tu equipo extendido',
  icon: 'IconUsersGroup',
  route: '/equipo-extendido',
  requiredServices: ['staff_augmentation'],
  priority: 50,
  cards: [
    { id: 'team-dossier', title: 'Tu equipo', type: 'table', size: 'full' },
    { id: 'performance-kpis', title: 'Performance', type: 'kpi-row', size: 'full' },
    { id: 'compliance-info', title: 'Información de compliance', type: 'info', size: 'half' },
  ]
}
```

---

## PARTE B: API Routes

Todas las routes de gestión interna viven bajo `/api/internal/staff-augmentation/`. Routes client-facing bajo `/api/capabilities/staff-augmentation/`.

### B1. `GET /api/internal/staff-augmentation/placements`

Lista de placements con métricas agregadas.

**Accesible por:** `efeonce_account`, `efeonce_operations`, `efeonce_admin`

**Query params:** `?status=active`, `?space_id=xxx`, `?member_id=xxx`, `?business_unit=globe`, `?expiring_within_days=60`

**Response shape:**

```typescript
interface PlacementListItem {
  placementId: string             // UUID
  eoId: string                    // EO-PLC-XXXX
  assignmentId: string
  // Persona
  memberId: string
  memberName: string
  memberRole: string
  memberCountry: string | null
  memberAvatarUrl: string | null
  roleCategory: string
  // Cliente
  spaceId: string
  spaceName: string
  organizationName: string
  // Unidad de negocio
  businessUnit: string            // Qué unidad de Efeonce origina este placement
  // Status
  status: PlacementStatus
  // Rate card
  costRateAmount: number | null
  billingRateAmount: number | null
  billingRateCurrency: string
  marginPercent: number | null
  // Temporalidad
  contractStartDate: string | null
  contractEndDate: string | null
  daysUntilExpiry: number | null   // Calculado server-side
  // EOR
  eorProvider: string
  contractorCountry: string | null
  // Onboarding
  onboardingProgress: number       // 0-100, calculado desde checklist
  // ICO (si disponible)
  icoMetrics: {
    rpaAvg: number | null
    otdPercent: number | null
    ftrPercent: number | null
  } | null
  // Satisfaction
  latestNps: number | null
  latestCsat: number | null
}
```

### B2. `GET /api/internal/staff-augmentation/placements/[placementId]`

Detalle completo del placement.

**Response shape:**

```typescript
interface PlacementDetail {
  placement: StaffAugPlacement      // Todos los campos de la tabla
  assignment: TeamAssignment        // El assignment padre
  member: TeamMember                // La persona colocada
  space: { spaceId: string; spaceName: string; organizationName: string }
  onboardingChecklist: OnboardingChecklistItem[]
  events: PlacementEvent[]          // Últimos 50 eventos
  surveyRefs: PlacementSurveyRef[]  // Surveys de HubSpot con respuestas cacheadas
  icoMetrics: {                     // Métricas ICO del miembro filtradas al Space del placement
    current: { rpaAvg: number | null; otdPercent: number | null; ftrPercent: number | null; cycleTime: number | null; tasksCompleted: number }
    trend: { month: string; rpaAvg: number | null; otdPercent: number | null }[]  // Últimos 6 meses
  } | null
  financials: {                     // Calculados
    monthlyRevenue: number | null   // billingRateAmount (si monthly)
    monthlyCost: number | null      // costRateAmount
    monthlyMargin: number | null
    lifetimeRevenue: number | null  // billingRate × meses activos
  } | null
}
```

### B3. `POST /api/internal/staff-augmentation/placements`

Crear un nuevo placement.

**Request body:**

```typescript
interface CreatePlacementInput {
  // Assignment (se crea automáticamente)
  memberId: string
  spaceId: string
  businessUnit: string              // 'globe' | 'efeonce_digital' | 'reach' | 'wave' | 'crm_solutions'
  fteAllocation: number             // 0.1-2.0
  hoursPerMonth?: number            // Default: FTE × 160
  roleTitleOverride?: string
  
  // Placement metadata
  eorProvider?: string              // Default: 'deel'
  deelContractId?: string
  legalEntity?: string
  contractorCountry?: string
  contractType?: string             // Default: 'contractor'
  
  // Rate card
  costRateAmount?: number
  costRateCurrency?: string         // Default: 'USD'
  billingRateAmount?: number
  billingRateCurrency?: string
  billingFrequency?: string         // Default: 'monthly'
  
  // Temporalidad
  contractStartDate?: string        // ISO date
  contractEndDate?: string
  renewalAlertDays?: number         // Default: 60
  
  // SLA
  slaAvailabilityPercent?: number
  slaResponseHours?: number
  slaNoticePeriodDays?: number
  
  // Contexto
  clientReportingTo?: string
  clientTools?: string[]
  clientCommunicationChannel?: string
  placementNotes?: string
  requiredSkills?: string[]
  matchedSkills?: string[]
}
```

**Lógica:**
1. Crear `client_team_assignment` con `assignment_type = 'staff_augmentation'`
2. Generar `EO-PLC-XXXX` vía secuencia
3. INSERT en `staff_aug_placements` con FK al assignment
4. Crear onboarding checklist desde template por defecto
5. Crear evento `created` en `placement_events`
6. Retornar placement completo

### B4. `PATCH /api/internal/staff-augmentation/placements/[placementId]`

Actualizar placement. Solo campos enviados.

**Campos editables:** todos los de `CreatePlacementInput` excepto `memberId` y `spaceId` (inmutables post-creación). Más: `status`.

**Lógica especial para cambios de status:**
- Si `status` cambia → crear evento `status_change` con `{from, to}`
- Si `status` → `'renewal_pending'` → crear evento `renewal_initiated`
- Si `status` → `'ended'` → setear `actual_end_date = CURRENT_DATE` si no está seteada, cerrar assignment (`active = FALSE`)
- Si cambian `costRateAmount` o `billingRateAmount` → crear evento `rate_change` con `{field, from, to}`

### B5. `POST /api/internal/staff-augmentation/placements/[placementId]/extend`

Extender contrato.

**Request body:**

```typescript
interface ExtendPlacementInput {
  newEndDate: string                 // ISO date
  newBillingRateAmount?: number      // Opcional: ajuste de rate en la extensión
  newCostRateAmount?: number
  extensionNotes?: string
}
```

**Lógica:**
1. Actualizar `contract_end_date` al nuevo valor
2. Si hay cambio de rates, actualizar también
3. Si status era `renewal_pending`, cambiar a `active`
4. Crear evento `extension` con detalles

### B6. Onboarding checklist APIs

- `GET /api/internal/staff-augmentation/placements/[placementId]/onboarding` — Lista de items con estado
- `PATCH /api/internal/staff-augmentation/placements/[placementId]/onboarding/[itemId]` — Actualizar estado de un item
- `POST /api/internal/staff-augmentation/placements/[placementId]/onboarding` — Agregar item custom al checklist

### B7. Satisfaction survey APIs (HubSpot-integrated)

- `GET /api/internal/staff-augmentation/placements/[placementId]/surveys` — Lista de survey refs del placement con respuestas cacheadas
- `POST /api/internal/staff-augmentation/placements/[placementId]/surveys` — Crear survey en HubSpot via Surveys API, almacenar ref local, retornar shareable link
- `POST /api/internal/staff-augmentation/placements/[placementId]/surveys/sync` — Consultar HubSpot Feedback Submissions API para actualizar respuestas pendientes

### B8. Dashboard aggregation API

`GET /api/internal/staff-augmentation/dashboard`

**Response:**

```typescript
interface StaffAugDashboard {
  stats: {
    activePlacements: number
    totalBillingMrr: number            // Suma de billing_rate_amount de placements activos
    totalCostMrr: number
    averageMarginPercent: number
    placementsExpiringIn30Days: number
    placementsExpiringIn60Days: number
    averageOnboardingProgress: number   // De placements en status 'onboarding'
    averageNps: number | null
  }
  bySpace: {
    spaceId: string
    spaceName: string
    activePlacements: number
    totalBillingMrr: number
  }[]
  byBusinessUnit: {
    businessUnit: string
    activePlacements: number
    totalBillingMrr: number
    averageMarginPercent: number
  }[]
  byStatus: Record<PlacementStatus, number>
  renewalPipeline: PlacementListItem[] // Placements con status 'renewal_pending' o expiring_within_days <= 90
}
```

### B9. Client-facing API (P3)

`GET /api/capabilities/staff-augmentation/team`

**Accesible por:** `client_executive`, `client_manager` (scoped al Space del cliente)

**Response:** Versión filtrada del team dossier — solo datos que el cliente debe ver. Sin rates de costo, sin margen, sin notas internas.

```typescript
interface ClientStaffAugTeam {
  placements: {
    memberName: string
    roleTitle: string
    country: string | null
    startDate: string | null
    fteAllocation: number
    status: 'active' | 'ending'       // Simplificado para el cliente
    // Compliance transparency
    eorProvider: string
    legalEntity: string | null
    // ICO metrics (si disponible)
    icoMetrics: {
      rpaAvg: number | null
      otdPercent: number | null
    } | null
  }[]
}
```

---

## PARTE C: Tipos TypeScript

```typescript
// src/types/staff-augmentation.ts

export type PlacementStatus = 'pipeline' | 'onboarding' | 'active' | 'renewal_pending' | 'renewed' | 'ended'

export type BusinessUnit = 'globe' | 'efeonce_digital' | 'reach' | 'wave' | 'crm_solutions'

export type EorProvider = 'deel' | 'direct' | 'other'

export type ContractType = 'contractor' | 'eor_employee'

export type BillingFrequency = 'monthly' | 'biweekly' | 'hourly'

export type OnboardingItemStatus = 'pending' | 'in_progress' | 'verified' | 'blocked' | 'not_applicable'

export type OnboardingCategory = 'tools' | 'communication' | 'brand' | 'compliance' | 'general'

export type PlacementEventType =
  | 'created'
  | 'status_change'
  | 'rate_change'
  | 'extension'
  | 'sla_update'
  | 'feedback_received'
  | 'renewal_initiated'
  | 'ended'
  | 'note_added'

export interface StaffAugPlacement {
  id: string
  eoId: string
  assignmentId: string
  spaceId: string
  memberId: string
  serviceId: string | null
  businessUnit: BusinessUnit
  status: PlacementStatus
  eorProvider: EorProvider
  deelContractId: string | null
  legalEntity: string | null
  contractorCountry: string | null
  contractType: ContractType
  costRateAmount: number | null
  costRateCurrency: string
  billingRateAmount: number | null
  billingRateCurrency: string
  billingFrequency: BillingFrequency
  marginPercent: number | null
  contractStartDate: string | null
  contractEndDate: string | null
  actualEndDate: string | null
  renewalAlertDays: number
  slaAvailabilityPercent: number | null
  slaResponseHours: number | null
  slaNoticePeriodDays: number
  clientReportingTo: string | null
  clientTools: string[]
  clientCommunicationChannel: string | null
  placementNotes: string | null
  requiredSkills: string[]
  matchedSkills: string[]
  createdAt: string
  updatedAt: string
  createdBy: string | null
}

export interface OnboardingChecklistItem {
  id: string
  placementId: string
  itemKey: string
  itemLabel: string
  category: OnboardingCategory
  status: OnboardingItemStatus
  verifiedAt: string | null
  verifiedBy: string | null
  blockerNote: string | null
  sortOrder: number
}

export interface PlacementEvent {
  id: string
  placementId: string
  eventType: PlacementEventType
  eventData: Record<string, unknown>
  description: string | null
  createdBy: string | null
  createdAt: string
}

export interface PlacementSurveyRef {
  id: string
  placementId: string
  hubspotSurveyId: string | null
  hubspotSurveyType: 'NPS' | 'CSAT' | 'CES' | 'CUSTOM'
  hubspotShareableLink: string | null
  hubspotFeedbackSubmissionId: string | null
  period: string
  sentToEmail: string | null
  sentToName: string | null
  status: 'created' | 'sent' | 'responded' | 'expired'
  responseScore: number | null
  responseSentiment: 'Promoter' | 'Passive' | 'Detractor' | null
  responseContent: string | null
  respondedAt: string | null
  createdAt: string
  createdBy: string | null
}

// Re-export del assignment type extendido
export interface StaffAugAssignment {
  assignmentType: 'staff_augmentation'
  placement: StaffAugPlacement
}
```

---

## PARTE D: Vistas UI

### D1. `/internal/staff-augmentation` — Dashboard principal

**Route group:** `internal`
**Acceso:** `efeonce_account`, `efeonce_operations`, `efeonce_admin`

**Layout:**

```
┌──────────────────────────────────────────────────────────────────┐
│  Staff Augmentation                                              │
│  Gestión de talento colocado en clientes                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Activos  │ │ MRR      │ │ Margen   │ │ Por      │           │
│  │   12     │ │ $8,100   │ │  34.2%   │ │ renovar  │           │
│  │ placements│ │ billing  │ │ promedio │ │   3      │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Tabs: [Todos] [Activos] [Onboarding] [Por renovar] [Ended] ││
│  │                                                             ││
│  │ ┌──────┬────────┬──────────┬──────┬────────┬──────┬──────┐ ││
│  │ │ ID   │Persona │ Cliente  │ FTE  │ Rate   │Margen│Status│ ││
│  │ ├──────┼────────┼──────────┼──────┼────────┼──────┼──────┤ ││
│  │ │PLC-01│A.Carlo.│Sky Airli.│ 1.0  │$675/mo │ 32%  │Active│ ││
│  │ │PLC-02│M.Herna.│BancoXYZ │ 0.5  │$450/mo │ 38%  │Active│ ││
│  │ │PLC-03│J.Perez │MarcaCorp│ 1.0  │$800/mo │ 41%  │Onbrd.│ ││
│  │ └──────┴────────┴──────────┴──────┴────────┴──────┴──────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌──────────────────────────┐ ┌────────────────────────────────┐│
│  │ Renewal pipeline         │ │ Revenue por unidad de negocio  ││
│  │ (placements por vencer)  │ │ (stacked bar chart)            ││
│  │ ┌────────┬──────┬──────┐ │ │                                ││
│  │ │ Nombre │ Días │ Rate │ │ │  [chart]                       ││
│  │ │A.Carlo.│  23  │ $675 │ │ │                                ││
│  │ │M.Herna.│  45  │ $450 │ │ │                                ││
│  │ └────────┴──────┴──────┘ │ │                                ││
│  └──────────────────────────┘ └────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

**Stats row (4 cards):**

| Card | Dato | Fuente |
|------|------|--------|
| Placements activos | Count where status = 'active' | `staff_aug_placements` |
| MRR de billing | Sum de `billing_rate_amount` de activos (monthly) | `staff_aug_placements` |
| Margen promedio | Avg de `margin_percent` de activos | `staff_aug_placements` |
| Por renovar (90d) | Count donde `contract_end_date` está dentro de 90 días | `staff_aug_placements` |

**Tabla de placements:**

| Columna | Dato | Formato |
|---------|------|---------|
| EO-ID | `eo_id` | Badge monospace, link a detalle |
| Persona | Avatar + nombre + cargo | Avatar coloreado por `roleCategory` |
| Unidad | `business_unit` | Badge con color de línea de servicio (`GH_COLORS.service`) |
| Cliente | Space name + org badge | Link a Space |
| FTE | `fte_allocation` | Número |
| Rate | `billing_rate_amount` / frequency | Formateado con moneda |
| Margen | `margin_percent` | Badge con semáforo (≥35% verde, 20-34% amarillo, <20% rojo) |
| Status | `status` | Badge con color |
| Expira | `contract_end_date` o "—" | Con countdown badge si ≤90 días |
| Onboarding | Progress bar | Solo si status = 'onboarding' |

**Filtros:** Status (multi-select), Unidad de negocio (multi-select), Space, Role Category, Búsqueda por nombre.

**CTA:** Botón "+" → Abre `CreatePlacementDrawer`.

### D2. `/internal/staff-augmentation/[placementId]` — Detalle del placement

**Layout de 2 columnas** (patrón user/view de Vuexy):

**Left sidebar (profile card):**

```
┌──────────────────────────────┐
│       [Avatar grande]         │
│    Andrés Carlosama           │
│    Senior Visual Designer     │
│    [Design badge] 🇨🇴 Pasto   │
│                               │
│  ── Placement ──              │
│  EO-PLC-0001                  │
│  Sky Airline → [badge Activo] │
│  FTE: 1.0 | 160 hrs/mes      │
│  Desde: 2026-03-13            │
│  Hasta: 2026-09-13 (178 días) │
│                               │
│  ── Rate card ──              │
│  Costo:   $675.00 USD/mes     │
│  Billing: $1,000.00 USD/mes   │
│  Margen:  32.5%               │
│                               │
│  ── Compliance ──             │
│  EOR: Deel                    │
│  País: Colombia               │
│  Tipo: Contractor             │
│  Contrato: DEEL-xxxxx         │
│                               │
│  [Editar placement]           │
│  [Extender contrato]          │
│  [Terminar placement]         │
└──────────────────────────────┘
```

**Right tabs:**

| Tab | Contenido | Rol |
|-----|-----------|-----|
| Onboarding | Checklist con progress bar, items por categoría, acciones de verificación | admin, operator |
| Performance | KPIs ICO (RpA, OTD%, FTR%, Cycle Time) + trend chart 6 meses + distribución por proyecto | admin, operator |
| Timeline | Event log del placement (status changes, rate changes, extensions, feedback, notes). Formato vertical con iconos por tipo | admin, operator |
| Financials | Revenue acumulado, costo acumulado, margen mensual (line chart), comparación rate vs peers | admin |
| Satisfaction | NPS/CSAT trend (data de HubSpot), historial de surveys enviados, estado de respuestas, CTA "Enviar NPS survey" que crea survey en HubSpot y genera shareable link | admin, operator |
| Skills | Skills requeridos vs. matcheados, gap analysis visual | admin, operator |

### D3. `CreatePlacementDrawer.tsx`

**Drawer lateral 520px.** Se abre desde el dashboard de Staff Aug o desde la ficha de persona (tab Organizaciones, cuando el tipo es Staff Aug).

**Secciones del drawer:**

1. **Persona y cliente**
   - Persona (Autocomplete sobre `team_members` activos)
   - Space/Cliente (Autocomplete sobre Spaces activos)
   - Unidad de negocio (Select: Globe, Efeonce Digital, Reach, Wave, CRM Solutions — determina qué BU origina el placement. Badge con color de `GH_COLORS.service`)
   - FTE (Slider 0.1–2.0 + TextField sincronizado)
   - Horas/mes (auto-calculado, editable)
   - Override de cargo

2. **Contrato y compliance** (sección colapsable, abierta por defecto)
   - EOR Provider (Select: Deel, Directo, Otro)
   - Deel Contract ID (TextField, opcional)
   - País del contractor (Select con países principales: CO, VE, MX, PE, CL, AR)
   - Tipo de contrato (Select: Contractor, EOR Employee)
   - Entidad legal (TextField)
   - Fecha inicio (DatePicker, default hoy)
   - Fecha fin (DatePicker, requerido)
   - Días de alerta de renovación (TextField numérico, default 60)

3. **Rate card** (sección colapsable)
   - Costo al recurso (TextField numérico + moneda)
   - Billing al cliente (TextField numérico + moneda)
   - Frecuencia (Select: Mensual, Quincenal, Por hora)
   - Margen calculado (read-only, se actualiza en tiempo real)

4. **SLA** (sección colapsable, cerrada por defecto)
   - Disponibilidad % (TextField numérico)
   - Tiempo de respuesta (TextField numérico, horas)
   - Período de aviso para terminación (TextField numérico, días)

5. **Contexto operativo** (sección colapsable, cerrada por defecto)
   - Reporta a (TextField — nombre del manager del cliente)
   - Herramientas del cliente (Chip input)
   - Canal de comunicación (Select: Slack, Teams, Email, Otro)
   - Skills requeridos (Chip input)
   - Notas (TextField multiline)

**Footer:** Botón "Crear placement" → `POST /api/internal/staff-augmentation/placements`

**Tras éxito:** Cerrar drawer, navegar a `/internal/staff-augmentation/[placementId]`.

### D4. Enriquecimiento del tab Organizaciones en People

En la ficha de persona (People Unified View), el tab "Organizaciones" se enriquece:

- Cada fila de assignment muestra un badge de tipo: `Internal` (gris) o `Staff Aug` (teal)
- Los assignments de tipo Staff Aug muestran además: EOR provider, país, billing rate, estado del placement, progress de onboarding
- El ghost slot "Vincular a organización" se duplica en dos opciones:
  - "Asignar internamente" → `AssignmentDrawer` existente
  - "Crear placement de Staff Aug" → `CreatePlacementDrawer`
- Click en un assignment de tipo Staff Aug navega a `/internal/staff-augmentation/[placementId]`

---

## PARTE E: Sidebar y navegación

### Sección Agencia (sidebar)

Agregar bajo la sección existente "Agencia" (visible para operator + admin):

```
AGENCIA
├ Pulse Global
├ Spaces
├ Capacidad
└ Staff Augmentation    ← NUEVO
    Talento colocado en clientes
```

**Ruta:** `/internal/staff-augmentation`
**Icono:** `IconUsersGroup` (Tabler Icons)
**Subtítulo sidebar:** "Talento colocado en clientes"

### Client-facing sidebar (P3)

Si el cliente tiene el servicio `staff_augmentation` activo, aparece en su sección de Capabilities:

```
SERVICIOS
├ Creative Hub
├ Tu equipo extendido   ← NUEVO (P3, capabilities-driven)
└ ...
```

---

## PARTE F: Integración con Financial Module & Financial Intelligence Layer

Staff Augmentation es un revenue stream con estructura financiera propia: ingreso recurrente (billing rate × FTE), costo directo (cost rate al recurso/Deel), y margen calculable por placement, por cliente, por unidad de negocio, y por período. La integración con el módulo financiero no es cosmética — es el puente que conecta el placement operativo con el P&L de Efeonce.

### F1. Staff Aug como income_type en `fin_income`

El Financial Intelligence Layer ya define `'staff_augmentation'` como `income_type` válido en `fin_income`. Cada factura de Staff Aug se registra en `fin_income` con:

```
income_type = 'staff_augmentation'
service_line = placement.business_unit         -- 'globe', 'efeonce_digital', 'reach', etc.
client_profile_id = hubspot_company_id del Space
description = "Staff Aug — {member_name} — {role_title} — {period}"
```

**Regla:** Un placement activo con `billing_frequency = 'monthly'` genera una factura mensual. El registro en `fin_income` lo hace el equipo de finanzas (no es automático en MVP). Pero el módulo de Staff Aug provee un **CTA "Generar factura"** en el tab Financials del placement que pre-llena el drawer de nuevo ingreso del Financial Module con todos los datos del placement.

### F2. Costo del placement en `fin_expenses`

El costo del recurso colocado (lo que Efeonce paga a Deel o al contractor) se registra como egreso:

```
expense_type = 'supplier'                      -- Deel es un proveedor
supplier_id = 'deel-inc' (o el proveedor EOR)
cost_category = 'direct_labor'                 -- Es costo directo de servicio
service_line = placement.business_unit
allocated_to_client = hubspot_company_id del Space
description = "Staff Aug cost — {member_name} — {period}"
```

**Regla:** `cost_category = 'direct_labor'` es lo que permite que el P&L view (`v_monthly_pnl`) clasifique correctamente el costo del placement como COGS, no como overhead.

### F3. Cost allocation automática via `fin_cost_allocations`

Cuando un placement está activo, el sistema puede generar automáticamente (o sugerir) un registro de cost allocation:

```
source_type = 'team_member'
source_id = member_id del recurso colocado
target_type = 'client'
target_id = hubspot_company_id del Space
allocation_percent = 1.0                       -- 100% del costo de este recurso va al cliente
period = '2026-03'
is_recurring = TRUE
```

Si el recurso tiene FTE fraccionado (ej: 0.5 FTE en Staff Aug + 0.5 FTE en producción interna), el allocation refleja esa proporción. Esto alimenta directamente la vista de **margen por cliente** en el Financial Intelligence Layer.

### F4. Alimentación de `fin_client_economics`

El snapshot mensual de `fin_client_economics` se enriquece con data de Staff Aug:

| Campo | Fuente Staff Aug |
|-------|-----------------|
| `revenue_clp` | Suma de `fin_income` donde `income_type = 'staff_augmentation'` para el cliente en el período |
| `direct_cost_clp` | Suma de `fin_expenses` con `allocated_to_client` = este cliente + `cost_category = 'direct_labor'` |
| `gross_margin_clp` | Revenue - direct cost |
| `service_lines_active` | Incluye la `business_unit` del placement como línea activa |

**Efecto en analytics:** El CFO puede ver en `/finance/clients/[id]` cuánto revenue genera un cliente por Staff Aug vs. On-Going vs. On-Demand, y cuál es el margen real de cada modalidad.

### F5. Vista `v_revenue_by_service_line` — Desglose de Staff Aug

La view existente `v_revenue_by_service_line` ya agrupa por `service_line`. Como cada factura de Staff Aug lleva la `business_unit` del placement en el campo `service_line`, el revenue de Staff Aug se desglosa automáticamente por unidad.

**Ejemplo de output:**

```
period: '2026-03'
service_line: 'globe'
income_type: 'staff_augmentation'
revenue_clp: 850,000    -- 1 DA colocado en Sky Airline
---
period: '2026-03'
service_line: 'efeonce_digital'
income_type: 'staff_augmentation'
revenue_clp: 1,200,000  -- 2 CRM specialists colocados
```

Esto permite al dashboard financiero mostrar: "del revenue total de Globe en marzo, X% vino de On-Going, Y% de On-Demand, y Z% de Staff Augmentation."

### F6. Staff Aug en el P&L

En la vista `v_monthly_pnl`, el revenue de Staff Aug aparece dentro de `service_revenue_clp` (ya que no es partnership). El costo aparece dentro de `direct_labor_clp` (por el `cost_category`). El gross margin del P&L refleja automáticamente el margen de Staff Aug.

**Para desglose fino:** Crear una view adicional o extender la existente con:

```sql
-- View complementaria: P&L de Staff Augmentation aislado
CREATE OR REPLACE VIEW `efeonce-group.greenhouse.v_staff_aug_pnl` AS
SELECT
  FORMAT_DATE('%Y-%m', i.invoice_date) AS period,
  i.service_line AS business_unit,
  SUM(i.total_amount_clp) AS revenue_clp,
  SUM(e.total_amount_clp) AS cost_clp,
  SUM(i.total_amount_clp) - SUM(e.total_amount_clp) AS margin_clp,
  SAFE_DIVIDE(
    SUM(i.total_amount_clp) - SUM(e.total_amount_clp),
    SUM(i.total_amount_clp)
  ) AS margin_percent,
  COUNT(DISTINCT p.id) AS active_placements
FROM `efeonce-group.greenhouse.fin_income` i
LEFT JOIN `efeonce-group.greenhouse_core.staff_aug_placements` p
  ON i.service_line = p.business_unit
  AND p.status = 'active'
LEFT JOIN `efeonce-group.greenhouse.fin_expenses` e
  ON e.allocated_to_client = i.client_profile_id
  AND e.cost_category = 'direct_labor'
  AND FORMAT_DATE('%Y-%m', e.payment_date) = FORMAT_DATE('%Y-%m', i.invoice_date)
WHERE i.income_type = 'staff_augmentation'
GROUP BY 1, 2
ORDER BY 1 DESC, 2;
```

### F7. Tab Financials del placement — Data sources

El tab "Financials" en el detalle del placement (`/internal/staff-augmentation/[placementId]`) no calcula inline. Consume:

| Sección del tab | Source |
|-----------------|--------|
| Revenue acumulado | `fin_income` WHERE `income_type = 'staff_augmentation'` AND matchea al cliente+período del placement |
| Costo acumulado | `fin_expenses` WHERE `allocated_to_client` = space.hubspot_company_id AND `cost_category = 'direct_labor'` |
| Margen mensual (line chart) | Derivado de revenue - costo por mes, últimos 12 meses |
| Margen vs. target | `placement.margin_percent` (calculado en PostgreSQL) vs. threshold configurable (default 30%) |
| LTV del placement | `billing_rate_amount` × meses activos — calculado server-side |
| Revenue forecast | `billing_rate_amount` × meses restantes hasta `contract_end_date` |

**Si el Financial Module no existe:** El tab muestra solo los datos calculables desde la tabla `staff_aug_placements` (rate card, margen, forecast basado en rates). El revenue y costo reales aparecen como empty state con mensaje: "Conecta el módulo financiero para ver revenue y costos reales."

### F8. Bidirectional references

| Desde Staff Aug → Finance | Desde Finance → Staff Aug |
|---------------------------|---------------------------|
| CTA "Generar factura" pre-llena drawer de `fin_income` | En `/finance/clients/[id]`, sección "Staff Augmentation" muestra placements activos con rates |
| `placement_id` como `reference_id` en `fin_income` | En `/finance/dashboard/by-service-line`, Staff Aug revenue es desglosable |
| `member_id` alimenta `fin_cost_allocations` | P&L view incluye Staff Aug como COGS (direct_labor) |
| Renewal alerts visibles en pipeline comercial | `fin_client_economics` refleja Staff Aug en cross-sell metrics |

---

## PARTE G: Estructura de archivos

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── internal/
│   │       └── staff-augmentation/
│   │           ├── layout.tsx                              # Guard: requireRouteGroup('internal')
│   │           ├── page.tsx                                # D1: Dashboard
│   │           └── [placementId]/
│   │               └── page.tsx                            # D2: Detalle
│   └── api/
│       └── internal/
│           └── staff-augmentation/
│               ├── placements/
│               │   ├── route.ts                            # GET lista, POST crear
│               │   └── [placementId]/
│               │       ├── route.ts                        # GET detalle, PATCH update
│               │       ├── extend/route.ts                 # POST extender
│               │       ├── onboarding/
│               │       │   ├── route.ts                    # GET checklist, POST add item
│               │       │   └── [itemId]/route.ts           # PATCH update item
│               │       └── surveys/
│               │           └── route.ts                    # GET surveys, POST add survey
│               └── dashboard/
│                   └── route.ts                            # GET dashboard aggregation
├── views/
│   └── greenhouse/
│       └── staff-augmentation/
│           ├── StaffAugDashboard.tsx                       # Composición dashboard
│           ├── StaffAugStats.tsx                           # Stats row (4 cards)
│           ├── StaffAugTable.tsx                           # Tabla de placements
│           ├── StaffAugRenewalPipeline.tsx                 # Mini tabla de renewals
│           ├── StaffAugRevenueChart.tsx                    # Chart revenue por cliente
│           ├── PlacementView.tsx                           # Composición detalle
│           ├── PlacementLeftSidebar.tsx                    # Profile card
│           ├── PlacementRightTabs.tsx                      # Tabs container
│           ├── tabs/
│           │   ├── OnboardingTab.tsx                       # Checklist
│           │   ├── PerformanceTab.tsx                      # ICO metrics
│           │   ├── TimelineTab.tsx                         # Event log
│           │   ├── FinancialsTab.tsx                       # Revenue/margin
│           │   ├── SatisfactionTab.tsx                     # NPS/CSAT
│           │   └── SkillsTab.tsx                           # Skill matching
│           ├── drawers/
│           │   ├── CreatePlacementDrawer.tsx               # Crear placement
│           │   ├── EditPlacementDrawer.tsx                 # Editar placement
│           │   └── ExtendPlacementDrawer.tsx               # Extender contrato
│           └── cards/
│               ├── PlacementStatusBadge.tsx                # Badge de status
│               ├── MarginBadge.tsx                         # Badge de margen con semáforo
│               ├── ExpiryCountdown.tsx                     # Countdown de expiración
│               └── OnboardingProgress.tsx                  # Progress bar de onboarding
├── types/
│   └── staff-augmentation.ts                              # Tipos (Parte C)
└── lib/
    └── staff-augmentation/
        ├── queries.ts                                     # BigQuery / PostgreSQL queries
        ├── mutations.ts                                   # INSERT/UPDATE helpers
        ├── onboarding-template.ts                         # Template de checklist por defecto
        └── placement-metrics.ts                           # Cálculos de dashboard
```

---

## Orden de ejecución

### Phase 0 (P0) — Schema + CRUD básico

1. Crear tabla `staff_aug_placements` en PostgreSQL
2. Crear tabla `placement_onboarding_checklists`
3. Crear tabla `placement_events`
4. Crear tabla `placement_satisfaction_surveys`
5. Agregar `assignment_type` a `client_team_assignments`
6. Crear secuencia `placement_eo_id_seq`
7. Implementar tipos TypeScript (`src/types/staff-augmentation.ts`)
8. Implementar `POST /api/internal/staff-augmentation/placements` (B3)
9. Implementar `GET /api/internal/staff-augmentation/placements` (B1)
10. Implementar `GET /api/internal/staff-augmentation/placements/[placementId]` (B2)
11. Implementar `PATCH /api/internal/staff-augmentation/placements/[placementId]` (B4)
12. Implementar `POST .../extend` (B5)
13. Implementar onboarding APIs (B6)

### Phase 1 (P1) — Dashboard + vistas operativas

14. Implementar `GET /api/internal/staff-augmentation/dashboard` (B8)
15. Crear `StaffAugDashboard.tsx` con stats row
16. Crear `StaffAugTable.tsx` con filtros y tabs por status
17. Crear `CreatePlacementDrawer.tsx` (D3)
18. Crear `PlacementView.tsx` con left sidebar (D2)
19. Crear `OnboardingTab.tsx`
20. Crear `PerformanceTab.tsx` (consume ICO Engine)
21. Crear `TimelineTab.tsx`
22. Agregar "Staff Augmentation" al sidebar bajo Agencia
23. Implementar survey APIs con HubSpot Surveys API integration (B7)
24. Crear `SatisfactionTab.tsx` (consume HubSpot feedback_submissions via survey refs)

### Phase 2 (P2) — Capa financiera + integraciones

25. Crear `FinancialsTab.tsx` (consume Financial Module — Parte F)
26. Implementar CTA "Generar factura" que pre-llena drawer de `fin_income` (F1)
27. Crear view `v_staff_aug_pnl` en BigQuery (F6)
28. Implementar cost allocation automática para placements activos (F3)
29. Crear `StaffAugRenewalPipeline.tsx`
30. Crear `StaffAugRevenueChart.tsx` (desglose por `business_unit`)
31. Crear `SkillsTab.tsx`
32. Crear `EditPlacementDrawer.tsx` y `ExtendPlacementDrawer.tsx`
33. Enriquecer tab Organizaciones en People (D4)
34. Agregar servicio `staff_augmentation` a HubSpot + Capability Registry
35. Agregar sección "Staff Augmentation" en `/finance/clients/[id]` con placements activos y rates (F8)
36. Scheduled query en BigQuery: alerta de renewals (placements que vencen en ≤ `renewal_alert_days`)

### Phase 3 (P3) — Client-facing experience

33. Implementar `GET /api/capabilities/staff-augmentation/team` (B9)
34. Crear módulo de Capability "Tu equipo extendido" con cards
35. Crear vista de team dossier (client-facing)
36. Crear vista de compliance transparency
37. Exponer métricas ICO por placement al cliente (filtrado, sin data interna)

---

## Criterios de aceptación

### Schema

- [ ] Tabla `staff_aug_placements` existe con todos los campos especificados
- [ ] Tabla `placement_onboarding_checklists` existe con template insertable
- [ ] Tabla `placement_events` existe y registra todos los eventos de lifecycle
- [ ] Tabla `placement_satisfaction_surveys` existe
- [ ] Campo `assignment_type` existe en `client_team_assignments` con default `'internal'`
- [ ] `margin_percent` se calcula automáticamente como columna generada
- [ ] Secuencia `placement_eo_id_seq` genera EO-PLC-XXXX correctamente
- [ ] Trigger `update_updated_at` funciona en todas las tablas nuevas

### APIs

- [ ] `POST placements` crea assignment + placement + checklist + evento en una transacción
- [ ] `GET placements` retorna lista con métricas agregadas, filtrable por status/space/member
- [ ] `GET placements/[id]` retorna detalle completo con assignment, member, onboarding, events, ICO
- [ ] `PATCH placements/[id]` registra eventos en `placement_events` para cambios de status y rates
- [ ] `POST extend` actualiza fechas y registra evento de extensión
- [ ] Onboarding APIs permiten CRUD completo del checklist
- [ ] Dashboard API retorna stats, breakdown por space, pipeline de renewals
- [ ] Client-facing API filtra data sensible (rates, margen, notas internas)
- [ ] Todas las routes validan route group `internal` o roles específicos

### Dashboard (P1)

- [ ] Stats row con 4 cards funcionales (activos, MRR, margen, por renovar)
- [ ] Tabla filtrable con badge de status, countdown de expiración, progress de onboarding
- [ ] Tabs por status funcionan como filtros rápidos
- [ ] Click en fila navega a detalle
- [ ] Botón "+" abre `CreatePlacementDrawer`
- [ ] Renewal pipeline muestra placements ordenados por días restantes
- [ ] Revenue chart muestra breakdown por cliente

### Detalle del placement (P1)

- [ ] Left sidebar muestra perfil, rate card, compliance, CTAs
- [ ] Tab Onboarding muestra checklist por categoría con progress bar
- [ ] Tab Performance muestra métricas ICO con trend (o empty state si no hay match)
- [ ] Tab Timeline muestra event log cronológico inverso
- [ ] Tab Financials muestra revenue/costo/margen con chart (P2)
- [ ] Tab Satisfaction muestra NPS/CSAT con trend (P1)
- [ ] Tab Skills muestra matcheo visual (P2)

### Integración con People (P2)

- [ ] Tab Organizaciones muestra badge de tipo (Internal / Staff Aug) por assignment
- [ ] Assignments de Staff Aug muestran metadata adicional inline
- [ ] Ghost slot ofrece dos opciones: asignar internamente vs. crear placement
- [ ] Click en assignment Staff Aug navega a detalle del placement

### Client-facing (P3)

- [ ] Módulo "Tu equipo extendido" aparece si el cliente tiene servicio `staff_augmentation`
- [ ] Team dossier muestra personas colocadas con rol, país, FTE
- [ ] Métricas ICO visibles para el cliente (sin data interna)
- [ ] Compliance transparency visible (EOR, entidad legal, país)

### Integración financiera (P2)

- [ ] CTA "Generar factura" en tab Financials pre-llena drawer de `fin_income` con datos del placement
- [ ] Income registrado con `income_type = 'staff_augmentation'` y `service_line = business_unit`
- [ ] Cost del placement registrable como egreso con `cost_category = 'direct_labor'` y `allocated_to_client`
- [ ] Tab Financials del placement muestra revenue acumulado, costo, margen mensual (o empty state si Financial Module no existe)
- [ ] Revenue de Staff Aug aparece desglosado por `business_unit` en `v_revenue_by_service_line`
- [ ] View `v_staff_aug_pnl` creada y funcional en BigQuery
- [ ] `fin_client_economics` refleja revenue y costos de Staff Aug en sus snapshots mensuales

### UI y diseño

- [ ] Patrones Vuexy respetados (user/list para dashboard, user/view para detalle)
- [ ] Poppins solo para títulos y stat numbers, DM Sans para todo lo demás
- [ ] Colores de `GH_COLORS` — cero hex hardcodeados
- [ ] Badges de status usan colores semánticos: pipeline (gris), onboarding (info/azul), active (success/verde), renewal_pending (warning/naranja), ended (neutro)
- [ ] Badge de margen usa semáforo: ≥35% Neon Lime, 20-34% Sunset Orange, <20% Crimson Magenta
- [ ] Responsive en 1440px, 1024px, 768px
- [ ] Skeleton loaders en cada sección

### Seguridad

- [ ] Routes internas validan route group `internal`
- [ ] Routes client-facing filtran por `space_id` del JWT — un cliente NO puede ver placements de otro Space
- [ ] Data de rates, margen, y notas internas NUNCA se expone en APIs client-facing
- [ ] Mutations registran en `placement_events` como audit trail

---

## Lo que NO incluye esta tarea

- **Integración directa con API de Deel** — El `deel_contract_id` es referencia manual. La integración bidireccional con la API de Deel (crear contrato, sincronizar pagos, leer status) es tarea separada futura
- **Pipeline de reclutamiento** — Sourcing, screening, entrevistas. Este módulo empieza cuando la persona ya está definida
- **Notificaciones automáticas** — Emails de alerta de renovación, notificaciones de onboarding incompleto. Tarea separada que consume los datos de este módulo
- **Time tracking real** — La actividad operativa usa métricas ICO como proxy. Time tracking granular es tarea futura
- **Facturación automática** — El módulo calcula MRR y margen pero no genera facturas. La facturación es proceso manual en el Financial Module
- **Multi-currency conversion** — Si cost es en CLP y billing en USD, el margen se calcula en la moneda del billing. Conversión automática es extensión futura
- **Scheduled jobs de alertas** — Los scheduled queries de BigQuery para alertas de renovación se definen aquí pero su implementación como notificaciones (email, Teams) es tarea separada

---

## Notas para el agente

- **Lee `AGENTS.md` del repo antes de empezar.** Las reglas de branching, commits, y PRs aplican.
- **Este módulo tiene dos capas. No mezcles.** Layer B es data model + enrichment de People. Layer C es el módulo comercial. Puedes implementar B primero y C después.
- **El placement NO es un objeto raíz.** Siempre es hijo de un assignment. No crees rutas ni APIs que traten al placement como independiente del assignment.
- **Reutiliza componentes existentes.** Los drawers, la tabla filtrable, los stat cards, los badges — todo tiene precedentes en Admin Team Module y People. No reinventes.
- **ICO metrics son read-only.** El módulo de Staff Aug CONSUME métricas del ICO Engine. No calcula inline. Si no hay métricas, muestra empty state.
- **Los tipos viven en `src/types/staff-augmentation.ts`.** No crear subarchivos.
- **PostgreSQL es la fuente de verdad para placements.** BigQuery es OLAP para analytics y dashboards. El CRUD va contra PostgreSQL.
- **El `assignment_type` va en la tabla existente.** No crear tabla nueva para tipos de assignment. Es una columna más.
- **El margen es columna generada.** No lo calcules en el frontend ni en la API. PostgreSQL lo computa automáticamente.
- **Los colores de status usan `GH_COLORS.semantic`.** No inventes nuevos colores. Pipeline = neutro (textSecondary), onboarding = info, active = success, renewal_pending = warning, ended = neutro con opacity.
- **Los badges de `business_unit` usan `GH_COLORS.service`.** Globe = Crimson Magenta, Efeonce Digital = Deep Azure, Reach = Sunset Orange, Wave = Core Blue, CRM Solutions = Orchid Purple. El mapeo ya existe en el Nomenclatura v3 — reutilízalo.
- **`business_unit` es campo requerido al crear un placement.** Determina desde qué unidad se origina el talento. No se infiere del `roleCategory` del miembro — un diseñador puede ser colocado por Globe o por Efeonce Digital dependiendo del contexto comercial.
- **NPS/CSAT vive en HubSpot, no en Greenhouse.** La tabla `placement_survey_refs` es una referencia, no una fuente de verdad. Las respuestas se cachean localmente para lectura rápida, pero la fuente canónica es HubSpot `feedback_submissions`. Usa la Surveys API (beta) para crear surveys y la Feedback Submissions API para leer respuestas. Scopes requeridos: `feedback_submissions.read`, `surveys.read`, `surveys.write`.
- **El shareable link de HubSpot es el mecanismo de envío.** No construyas un sistema de envío de emails para surveys — genera el link via HubSpot API y envíalo via Resend (transactional email existente) o inclúyelo en un workflow de HubSpot.

---

*Efeonce Greenhouse™ · Efeonce Group · Marzo 2026*

*CODEX TASK — Staff Augmentation Module v1.0 — Documento de implementación.*
