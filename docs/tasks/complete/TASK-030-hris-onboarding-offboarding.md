# CODEX TASK — HRIS Fase 1B: Onboarding y Offboarding Checklists

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Completada 2026-05-04`
- Rank: `legacy`
- Domain: `hr`
- Blocked by: `none`
- Branch: `develop` (excepcion explicita solicitada por usuario)
- Legacy ID: `CODEX_TASK_HRIS_Onboarding_Offboarding`

## Delta 2026-04-01 — TASK-026 ya resuelta

- `greenhouse_core.members` ya publica `contract_type`, `pay_regime`, `payroll_via` y `deel_contract_id` como canon de contratación.
- Esta lane debe usar esos campos para elegir templates y no inferir onboarding desde `employment_type` ni desde snapshots de compensación.
- Lectura operativa sugerida:
  - `contract_type` decide la plantilla base (`laboral`, `honorarios`, `contractor`, `eor`)
  - `payroll_via` distingue carriles internos vs. Deel para pasos administrativos y de payroll
  - `deel_contract_id` puede usarse como evidencia de linkage externo cuando aplique
  - `daily_required` sigue siendo el backing field si una checklist futura necesita distinguir participación de schedule; `schedule_required` es alias de lectura, no columna nueva

## Delta 2026-03-27 — Alineación arquitectónica

- **Trigger de auto-creación**: NO hookear directamente en el PATCH endpoint de members. Usar el sistema de outbox events + reactive projections:
  - Crear nueva projection `onboardingAutoCreation` en `src/lib/sync/projections/`
  - Trigger events: `member.created`, `member.updated`, `member.deactivated` (ya existen en event catalog)
  - La projection detecta cambios de status en el payload → crea instancia de onboarding/offboarding idempotentemente
  - Registrar en `src/lib/sync/projections/index.ts`
- **Outbox events propios**: registrar en `src/lib/sync/event-catalog.ts`:
  - Aggregate type: `onboardingInstance`
  - Eventos: `hr.onboarding.instance_created`, `hr.onboarding.item_completed`, `hr.onboarding.instance_completed`, `hr.offboarding.instance_created`, `hr.offboarding.instance_completed`
- **Notificaciones IN SCOPE** (no out-of-scope como decía la task original): `NotificationService` (`src/lib/notifications/notification-service.ts`) ya existe y soporta canal email via Resend. Usar para:
  - Welcome notification al crear onboarding instance
  - Reminder a responsables de items pendientes
  - Notice de offboarding a partes relevantes
- **Email via Resend**: welcome email al nuevo colaborador cuando se crea instancia de onboarding. El patrón de email transaccional ya está operativo (`src/lib/resend.ts`).

## Resumen

Implementar el **módulo de onboarding y offboarding** del HRIS en Greenhouse. Permite a HR configurar plantillas de checklist (qué pasos ejecutar cuando alguien entra o sale), y ejecutar instancias asignadas a cada colaborador con tracking de progreso por responsable.

**El problema hoy:** El proceso de incorporación de un nuevo colaborador es informal — no hay un checklist estandarizado de qué hacer (crear cuentas, asignar licencias, configurar accesos, entregar equipos). Cuando alguien sale, no hay checklist de offboarding (revocar accesos, recuperar equipos, transferir proyectos). SCIM maneja el provisioning de identidad, pero el proceso operacional no está trackeado.

**La solución:** Un módulo con dos superficies:
1. **`/my/onboarding`** — Vista self-service donde el colaborador nuevo ve su checklist personal y marca items como completados (los que le corresponden)
2. **`/hr/onboarding`** — Vista admin donde HR configura plantillas, ve instancias activas, y trackea progreso

**Trigger automático:** Cuando `members.status` cambia a `active` (ingreso), se crea automáticamente una instancia de onboarding si existe una plantilla que aplique al `contract_type` del colaborador. Para offboarding, se crea cuando el status cambia a `inactive` o `terminated`.

---

## Contexto del proyecto

- **Repo:** `github.com/efeoncepro/greenhouse-eo`
- **Branch de trabajo:** `feature/hris-onboarding`
- **Documento rector:** `Greenhouse_HRIS_Architecture_v1.md` §4.2
- **Schema:** `greenhouse_hr`
- **Prerequisito:** `CODEX_TASK_HRIS_Contract_Type_Consolidation.md` (Fase 0.5)

### Documentos normativos

| Documento | Qué aporta |
|-----------|------------|
| `Greenhouse_HRIS_Architecture_v1.md` | Schema DDL §4.2, elegibilidad §5 |
| `GREENHOUSE_IDENTITY_ACCESS_V2.md` | Roles, route groups |
| `CODEX_TASK_SCIM_User_Provisioning.md` | SCIM flow, trigger de provisioning |
| `CODEX_TASK_HR_Core_Module.md` | `members` table, status lifecycle |
| `Greenhouse_Nomenclatura_Portal_v3.md` | Constantes, colores |

---

## Dependencias

| Dependencia | Estado | Impacto si no está |
|---|---|---|
| Fase 0.5 (contract types) | Cerrada | `applicable_contract_types` ya puede resolverse sobre el canon de `greenhouse_core.members` |
| `greenhouse_hr` schema | Existe | Tablas van aquí |
| `greenhouse_core.members.status` | Existe | Trigger de auto-creación depende de cambios de status |
| SCIM provisioning | Especificado | El trigger de auto-creación puede engancharse al mismo flujo |

---

## PARTE A: Schema PostgreSQL

Según `Greenhouse_HRIS_Architecture_v1.md` §4.2 — 4 tablas: `onboarding_templates`, `onboarding_template_items`, `onboarding_instances`, `onboarding_instance_items`. DDL ya definido en el documento de arquitectura. Crear tal cual.

---

## PARTE B: API Routes

### B1. Templates CRUD

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/hr/onboarding/templates` | GET | `hr`, `admin` | List templates (filter by type, active) |
| `/api/hr/onboarding/templates` | POST | `hr`, `admin` | Create template with items |
| `/api/hr/onboarding/templates/[templateId]` | GET | `hr`, `admin` | Template detail with items |
| `/api/hr/onboarding/templates/[templateId]` | PATCH | `hr`, `admin` | Update template metadata |
| `/api/hr/onboarding/templates/[templateId]/items` | POST | `hr`, `admin` | Add item to template |
| `/api/hr/onboarding/templates/[templateId]/items/[itemId]` | PATCH | `hr`, `admin` | Update item |
| `/api/hr/onboarding/templates/[templateId]/items/[itemId]` | DELETE | `hr`, `admin` | Remove item |
| `/api/hr/onboarding/templates/[templateId]/items/reorder` | POST | `hr`, `admin` | Reorder items |

### B2. Instances

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/hr/onboarding/instances` | GET | `hr`, `admin` | List all instances (filter by status, type, member) |
| `/api/hr/onboarding/instances` | POST | `hr`, `admin` | Manually create instance for a member |
| `/api/hr/onboarding/instances/[instanceId]` | GET | `hr`, `admin`, `collaborator` (own) | Instance detail with items |
| `/api/hr/onboarding/instances/[instanceId]/items/[itemId]` | PATCH | `hr`, `admin`, assigned person | Update item status |
| `/api/hr/onboarding/instances/[instanceId]/cancel` | POST | `hr`, `admin` | Cancel instance |
| `/api/hr/onboarding/my` | GET | `collaborator` | My active onboarding/offboarding instance |

### B3. Auto-creation trigger

**No es un API endpoint — es server-side logic.**

Cuando `PATCH /api/hr/members/[memberId]` (o `PATCH /api/admin/team/[memberId]`) cambia `status`:
1. If new status = `active` AND old status ≠ `active`:
   - Find onboarding template where `template_type = 'onboarding'` AND (`applicable_contract_types` is empty OR contains `member.contract_type`) AND `active = TRUE`
   - Create instance with items, calculate `due_date` per item based on `hire_date + due_days_offset`
2. If new status = `inactive` OR `terminated`:
   - Find offboarding template similarly
   - Create instance with items, calculate `due_date` based on today + offset

---

## PARTE C: Seed Data — Default Templates

### C1. Onboarding template (equipo completo)

```
Template: "Onboarding — Equipo Efeonce"
Type: onboarding
Applicable: [indefinido, plazo_fijo, eor]

Items:
 1. [HR, day 0] Crear perfil en Greenhouse
 2. [HR, day 0] Firmar contrato de trabajo
 3. [HR, day 0] Registrar datos bancarios y previsión
 4. [IT, day 0] Crear cuenta Microsoft 365 (Entra ID)
 5. [IT, day 0] Asignar licencias de herramientas (Figma, etc.)
 6. [IT, day 1] Configurar acceso a Notion workspace
 7. [supervisor, day 1] Reunión de bienvenida y contexto
 8. [supervisor, day 1] Asignar a Space(s) y proyectos iniciales
 9. [collaborator, day 3] Completar perfil profesional (skills, herramientas, IA)
10. [collaborator, day 3] Subir documentos de identidad
11. [HR, day 5] Verificar documentos subidos
12. [supervisor, day 15] Check-in de primera quincena
13. [HR, day 30] Evaluación de período de prueba (30 días)
```

### C2. Onboarding template (contractor)

```
Template: "Onboarding — Contractor"
Type: onboarding
Applicable: [honorarios, contractor]

Items:
 1. [HR, day 0] Registrar en Greenhouse
 2. [HR, day 0] Firmar contrato/NDA
 3. [IT, day 0] Crear accesos necesarios
 4. [supervisor, day 0] Briefing de proyecto y alcance
 5. [collaborator, day 1] Completar perfil profesional
 6. [supervisor, day 7] Check-in primera semana
```

### C3. Offboarding template

```
Template: "Offboarding — Estándar"
Type: offboarding
Applicable: [] (all types)

Items:
 1. [supervisor, day 0] Notificar al equipo
 2. [supervisor, day 0] Plan de transferencia de proyectos
 3. [IT, day 0] Revocar acceso a Notion
 4. [IT, day 0] Revocar licencias de herramientas
 5. [IT, day 1] Desactivar cuenta Microsoft 365
 6. [HR, day 1] Generar documentos de término
 7. [HR, day 3] Calcular finiquito / liquidación
 8. [collaborator, day 3] Entregar equipos y accesos pendientes
 9. [HR, day 5] Desactivar perfil en Greenhouse
```

---

## PARTE D: Vistas UI

### D1. `/my/onboarding` — Mi onboarding (self-service)

```
┌──────────────────────────────────────────────────────────┐
│  Header: "Tu onboarding en Efeonce" + progress bar        │
│  [████████████░░░░░░░░] 8 de 13 completados (62%)        │
├──────────────────────────────────────────────────────────┤
│  Mis tareas pendientes (las que me toca a mí):            │
│  ☐ Completar perfil profesional          Vence: 25 mar   │
│  ☐ Subir documentos de identidad         Vence: 25 mar   │
├──────────────────────────────────────────────────────────┤
│  Estado general del onboarding:                            │
│  ✓ Crear perfil en Greenhouse           HR · 20 mar       │
│  ✓ Firmar contrato de trabajo           HR · 20 mar       │
│  ✓ Crear cuenta Microsoft 365           IT · 20 mar       │
│  ◷ Asignar a proyectos iniciales        Supervisor · pend│
│  ☐ Check-in primera quincena            Supervisor · 5 abr│
└──────────────────────────────────────────────────────────┘
```

**El colaborador solo puede marcar como completados los items donde `assigned_role = 'collaborator'`.** Los demás son read-only con estado visible.

### D2. `/hr/onboarding` — Admin onboarding

```
┌──────────────────────────────────────────────────────────┐
│  Header: "Onboarding & Offboarding"                       │
├──────────────────────────────────────────────────────────┤
│  Stats: [3 activos] [2 completados este mes] [1 vencido]  │
├──────────────────────────────────────────────────────────┤
│  Tabs: [Instancias activas] [Plantillas] [Historial]      │
└──────────────────────────────────────────────────────────┘
```

**Tab Instancias activas:** Tabla con: Colaborador, Tipo (onboarding/offboarding), Progreso (barra), Items vencidos (badge rojo), Fecha inicio. Click → detail con checklist completa editable.

**Tab Plantillas:** Lista de templates con botón "Nueva plantilla". Cada template es editable: drag-and-drop para reordenar items, inline edit para título/descripción, selector de `assigned_role` y `due_days_offset`.

### D3. People 360 — Card de onboarding

En el tab "Actividad" de `/people/[memberId]`, si el member tiene una instancia activa de onboarding/offboarding, mostrar una card con: tipo, progreso, items pendientes, link a la instancia completa.

---

## PARTE E: File structure

```
src/
├── app/
│   └── [lang]/
│       └── (dashboard)/
│           ├── my/
│           │   └── onboarding/
│           │       └── page.tsx
│           └── hr/
│               └── onboarding/
│                   ├── page.tsx
│                   ├── templates/
│                   │   └── page.tsx
│                   └── instances/
│                       └── [instanceId]/
│                           └── page.tsx
├── app/
│   └── api/
│       └── hr/
│           └── onboarding/
│               ├── templates/
│               │   ├── route.ts
│               │   └── [templateId]/
│               │       ├── route.ts
│               │       └── items/
│               │           ├── route.ts
│               │           ├── [itemId]/
│               │           │   └── route.ts
│               │           └── reorder/
│               │               └── route.ts
│               ├── instances/
│               │   ├── route.ts
│               │   └── [instanceId]/
│               │       ├── route.ts
│               │       ├── items/
│               │       │   └── [itemId]/
│               │       │       └── route.ts
│               │       └── cancel/
│               │           └── route.ts
│               └── my/
│                   └── route.ts
├── views/
│   └── greenhouse/
│       └── hr-onboarding/
│           ├── MyOnboardingView.tsx
│           ├── OnboardingDashboardView.tsx
│           ├── OnboardingInstanceDetail.tsx
│           ├── OnboardingTemplateList.tsx
│           ├── OnboardingTemplateEditor.tsx
│           ├── OnboardingItemRow.tsx
│           ├── OnboardingProgressBar.tsx
│           └── PersonOnboardingCard.tsx
├── lib/
│   └── hr-onboarding/
│       ├── templates.ts
│       ├── instances.ts
│       ├── auto-create.ts              # Trigger logic for status changes
│       └── seed-templates.ts           # Seed data script
└── types/
    └── hr-onboarding.ts
```

---

## PARTE F: Orden de ejecución

### Fase 1: Infraestructura
1. Crear 4 tablas PostgreSQL (A)
2. Crear TypeScript types
3. Insertar seed templates (C1, C2, C3)

### Fase 2: APIs — Templates
4-8. CRUD de templates e items (B1)

### Fase 3: APIs — Instances
9-14. CRUD de instances + my endpoint (B2)

### Fase 4: Auto-creation trigger
15. Implementar lógica en `auto-create.ts` (B3)
16. Enganchar trigger en el endpoint de update de member status

### Fase 5: UI
17-19. Self-service view, admin views, People 360 card

---

## Criterios de aceptación

- [ ] 4 tablas creadas en `greenhouse_hr`
- [ ] Seed templates insertados (onboarding equipo, onboarding contractor, offboarding)
- [ ] Templates CRUD funciona con drag-and-drop reorder de items
- [ ] Auto-creación de instancia al cambiar `members.status` a `active`
- [ ] Auto-creación de offboarding al cambiar status a `inactive`/`terminated`
- [ ] Collaborator solo puede marcar sus propios items como completados
- [ ] Progress bar calcula correctamente `completed / total`
- [ ] Items vencidos muestran badge rojo
- [ ] Instancia se marca como `completed` automáticamente cuando todos los items required están done

## Lo que NO incluye

- Notificaciones automáticas a responsables (futuro — Notification System)
- Integración con SCIM auto-trigger (documentado pero no implementado en este task)
- Workflow de aprobación para onboarding items (son checklists, no approvals)

## Notas para el agente

- **`due_days_offset` se calcula desde `hire_date` (onboarding) o `today` (offboarding).** No hardcodear fechas.
- **El auto-trigger debe ser idempotente.** Si ya existe una instancia activa para ese member y tipo, no crear otra.
- **Branch naming:** `feature/hris-onboarding`.

---

*Efeonce Greenhouse™ · Efeonce Group · Marzo 2026*
