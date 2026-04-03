# CODEX TASK — HRIS Fase 2B: Goals y OKRs

## Delta 2026-04-03 — Metric-linked goals must follow the ICO contract

- Si esta lane usa métricas `ICO` como contexto o ejemplo de goal, debe alinearse a `docs/architecture/Contrato_Metricas_ICO_v1.md`.
- Regla nueva:
  - los ejemplos de objetivos basados en `RpA`, `FTR`, `OTD`, `throughput` o métricas afines no deben leerse como thresholds canónicos de salud si contradicen el contrato actualizado
  - goals estratégicos pueden usar targets propios, pero deben distinguirse de benchmark/trust del engine
  - no auto-derivar goals desde métricas `ICO` inmaduras sin respetar `confidence_level` y `quality_gate_status`

## Delta 2026-04-01 — TASK-026 ya resuelta

- Esta lane ya no depende de una migración futura de contratos: `greenhouse_core.members` expone `contract_type`, `pay_regime`, `payroll_via` y `deel_contract_id` como canon vigente.
- Las reglas de acceso y elegibilidad deben leer esos campos desde `members.*`, no desde `compensation_versions` ni desde `employment_type`.
- `daily_required` sigue siendo el backing field almacenado; si Goals necesita distinguir participación operativa/schedule, debe consumir `daily_required` o el alias de lectura `schedule_required`, pero no proponer una segunda columna.

## Delta 2026-04-01

- `greenhouse_core.departments` ya es runtime operacional Postgres-first por cierre de `TASK-180`.
- Los futuros owners por departamento de esta lane no deben introducir reads o writes contra `greenhouse.departments` en BigQuery.

## Delta 2026-03-27 — Alineación arquitectónica

- **Fuente ICO corregida**: las métricas ICO como contexto operativo (RpA, OTD%, throughput) deben leerse de `greenhouse_serving.ico_member_metrics` (PostgreSQL serving view, materializada por `src/lib/sync/projections/ico-member-metrics.ts`). NO leer de BigQuery `member_performance_snapshots` ni de `notion_ops` directo.
- **Outbox events obligatorios**: registrar en `src/lib/sync/event-catalog.ts`:
  - Aggregate types: `goal`, `goalCycle`
  - Eventos: `hr.goal.created`, `hr.goal.updated`, `hr.goal.progress_recorded`, `hr.goal_cycle.activated`, `hr.goal_cycle.closed`
- **Integration con `person_intelligence`**: cuando se registra progreso de goal (`hr.goal.progress_recorded`), la projection `person_intelligence` debería refrescarse para incluir `goal_completion_pct` en el snapshot unificado. Esto es un follow-up que se wirea una vez que este módulo esté operativo.
- **Complementariedad con ICO**: Goals miden intención estratégica, ICO mide delivery operativo. No se solapan — se complementan. El módulo de evaluaciones (TASK-031) combina ambos.

## Resumen

Implementar el **módulo de objetivos y OKRs** del HRIS en Greenhouse. Permite definir ciclos de objetivos (trimestrales, semestrales, anuales), crear goals que cascadean desde empresa → departamento → individuo, con key results medibles y tracking de progreso.

**El problema hoy:** No hay sistema formal de objetivos. Las metas se discuten verbalmente y no hay seguimiento estructurado. No hay conexión entre lo que una persona se propone lograr (goals) y lo que efectivamente entrega (ICO metrics). Las evaluaciones de desempeño (Fase 3) necesitan goals como input.

**La solución:** Un módulo con dos superficies:
1. **`/my/goals`** — Vista self-service donde el colaborador ve sus objetivos, registra avance en key results, y ve el progreso de los goals de su equipo/departamento
2. **`/hr/goals`** — Vista admin donde HR crea ciclos, configura goals de empresa, y ve seguimiento global

**Los goals son complementarios al ICO Engine, no los reemplazan.** Goals = estratégicos (qué se propone lograr), ICO = operacionales (qué está entregando). La evaluación de desempeño (Fase 3) consume ambos.

---

## Contexto del proyecto

- **Repo:** `github.com/efeoncepro/greenhouse-eo`
- **Branch de trabajo:** `feature/hris-goals`
- **Documento rector:** `Greenhouse_HRIS_Architecture_v1.md` §4.4
- **Schema:** `greenhouse_hr`
- **Prerequisito:** Fase 0.5 (contract types)

### Documentos normativos

| Documento | Qué aporta |
|-----------|------------|
| `Greenhouse_HRIS_Architecture_v1.md` | Schema DDL §4.4, elegibilidad §5, engines §7.2 |
| `Greenhouse_ICO_Engine_v1.md` | ICO metrics — goals son complementarios, no overlapping |
| `GREENHOUSE_IDENTITY_ACCESS_V2.md` | Roles, route groups |
| `Greenhouse_Nomenclatura_Portal_v3.md` | Constantes, colores |

---

## Dependencias

| Dependencia | Estado | Impacto si no está |
|---|---|---|
| Fase 0.5 (contract types) | Cerrada | Ya existe canon en `greenhouse_core.members` para elegibilidad por `contract_type` / `payroll_via` |
| `greenhouse_hr` schema | Existe | Tablas van aquí |
| `greenhouse_core.members` | Existe | FK para owner_member_id |
| `greenhouse_core.departments` | Existe | FK para owner_department_id |
| ICO Engine (`greenhouse_serving.ico_member_metrics`) | Existe | Opcional — goals no consumen ICO directamente, pero la UI puede mostrar métricas ICO como contexto |

---

## PARTE A: Schema PostgreSQL

Según `Greenhouse_HRIS_Architecture_v1.md` §4.4 — 4 tablas: `goal_cycles`, `goals`, `goal_key_results`, `goal_progress`. DDL ya definido en el documento de arquitectura. Crear tal cual.

---

## PARTE B: API Routes

### B1. Cycles

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `GET /api/hr/goals/cycles` | GET | Any authenticated | List cycles (filter by status, year) |
| `POST /api/hr/goals/cycles` | POST | `hr`, `admin` | Create cycle |
| `GET /api/hr/goals/cycles/[cycleId]` | GET | Any authenticated | Cycle detail with stats |
| `PATCH /api/hr/goals/cycles/[cycleId]` | PATCH | `hr`, `admin` | Update cycle (name, dates, status) |
| `POST /api/hr/goals/cycles/[cycleId]/activate` | POST | `hr`, `admin` | Move draft → active |
| `POST /api/hr/goals/cycles/[cycleId]/close` | POST | `hr`, `admin` | Move active → closed |

### B2. Goals

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `GET /api/hr/goals` | GET | Any authenticated | List goals (filter by cycle, owner, status) |
| `POST /api/hr/goals` | POST | `hr`, `admin`, `collaborator` (own) | Create goal |
| `GET /api/hr/goals/[goalId]` | GET | Owner, manager, `hr`, `admin` | Goal detail with KRs and progress |
| `PATCH /api/hr/goals/[goalId]` | PATCH | Owner (if cycle active), `hr`, `admin` | Update goal |
| `DELETE /api/hr/goals/[goalId]` | DELETE | `hr`, `admin` (only if draft cycle) | Remove goal |
| `GET /api/hr/goals/my` | GET | `collaborator` | My goals across active cycles |
| `GET /api/hr/goals/department/[deptId]` | GET | Dept members, `hr`, `admin` | Department goals |
| `GET /api/hr/goals/company` | GET | Any authenticated | Company-level goals |

### B3. Key Results

| Endpoint | Method | Auth |
|---|---|---|
| `POST /api/hr/goals/[goalId]/key-results` | POST | Owner, `hr`, `admin` |
| `PATCH /api/hr/goals/[goalId]/key-results/[krId]` | PATCH | Owner, `hr`, `admin` |
| `DELETE /api/hr/goals/[goalId]/key-results/[krId]` | DELETE | Owner, `hr`, `admin` |

### B4. Progress

| Endpoint | Method | Auth |
|---|---|---|
| `POST /api/hr/goals/[goalId]/progress` | POST | Owner, manager, `hr`, `admin` |
| `GET /api/hr/goals/[goalId]/progress` | GET | Owner, manager, `hr`, `admin` |

Cuando se registra progress, el `goals.progress_percent` se recalcula automáticamente como promedio ponderado de los key results (si existen KRs) o directamente del progress entry (si no hay KRs).

### B5. Goal cascade logic

Goals pueden tener `parent_goal_id` para crear cascadas:

```
Company goal: "Aumentar retención de clientes al 95%"
  └─ Department goal (Design): "Reducir RpA promedio a <1.5"
       └─ Individual goal (Melkin): "Entregar 100% de piezas con FTR en Q2"
       └─ Individual goal (Andrés): "Reducir cycle time promedio a <48h"
  └─ Department goal (Account): "NPS score ≥ 85 en todos los clientes"
       └─ Individual goal (Valentina): "Implementar check-in mensual con 3 clientes top"
```

El progress del parent goal se puede derivar como promedio de children (opcional, configurable por HR). Si `auto_aggregate = true` en el parent, su `progress_percent` se recalcula cuando un child actualiza.

---

## PARTE C: Vistas UI

### C1. `/my/goals` — Mis objetivos (self-service)

```
┌──────────────────────────────────────────────────────────┐
│  Header: "Mis objetivos — Q2 2026" + selector de ciclo    │
├──────────────────────────────────────────────────────────┤
│  Stats: [3 objetivos] [67% promedio de avance]             │
├──────────────────────────────────────────────────────────┤
│  Card por objetivo:                                        │
│  ┌────────────────────────────────────────────────────┐   │
│  │ Reducir cycle time promedio a <48h    [████░░] 65% │   │
│  │ Estado: En track  ·  3 key results                  │   │
│  │                                                      │   │
│  │ KR1: Cycle time diseño < 36h     [███░░░] 50%       │   │
│  │ KR2: Cycle time contenido < 24h  [█████░] 80%       │   │
│  │ KR3: Zero tasks stuck > 72h      [████░░] 66%       │   │
│  │                                                      │   │
│  │ [Registrar avance]                                   │   │
│  └────────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────┤
│  Objetivos de mi departamento (context):                   │
│  Design → "Reducir RpA promedio a <1.5"      [████░] 72% │
├──────────────────────────────────────────────────────────┤
│  Objetivos de empresa (context):                           │
│  "Aumentar retención de clientes al 95%"     [███░░] 60% │
└──────────────────────────────────────────────────────────┘
```

**"Registrar avance" flow:** Drawer con slider o input numérico por KR + campo de notas. Al guardar: crea `goal_progress` entry, recalcula `goals.progress_percent` y `goal_key_results.current_value`.

### C2. `/hr/goals` — Objetivos (admin)

```
┌──────────────────────────────────────────────────────────┐
│  Header: "Objetivos" + botón "Nuevo ciclo"                 │
├──────────────────────────────────────────────────────────┤
│  Tabs: [Ciclos] [Seguimiento global] [Goals de empresa]    │
└──────────────────────────────────────────────────────────┘
```

**Tab Ciclos:** Lista de cycles con status, fechas, count de goals. Click → detalle con todos los goals del ciclo.

**Tab Seguimiento global:** Tabla con todas las personas, sus goals, y progreso promedio. Filtros por departamento, status, progreso. Heatmap: verde (≥80%), amarillo (50-79%), rojo (<50%).

**Tab Goals de empresa:** Árbol de goals con cascade (company → dept → individual). Drag-and-drop para reasignar. Inline create para agregar goals rápidamente.

### C3. People 360 — Tab "Objetivos"

En `/people/[memberId]`, nuevo tab "Objetivos" que muestra todos los goals de esa persona across cycles, con historial de progreso.

---

## PARTE D: Elegibilidad

| contract_type | Access to goals |
|---|---|
| `indefinido` | Full (create, track, view all) |
| `plazo_fijo` | Full if tenure > 3 months |
| `honorarios` | No access |
| `contractor` | Read-only of department/company goals if tenure > 6 months |
| `eor` | Full |

```typescript
function canAccessGoals(member: Member): { canCreate: boolean; canView: boolean } {
  if (member.contract_type === 'honorarios') return { canCreate: false, canView: false }
  if (member.contract_type === 'contractor') {
    const tenure = daysSince(member.hire_date)
    return { canCreate: false, canView: tenure >= 180 }
  }
  if (member.contract_type === 'plazo_fijo') {
    const tenure = daysSince(member.hire_date)
    return { canCreate: tenure >= 90, canView: true }
  }
  return { canCreate: true, canView: true }
}
```

---

## PARTE E: File structure

```
src/
├── app/
│   └── [lang]/
│       └── (dashboard)/
│           ├── my/
│           │   └── goals/
│           │       └── page.tsx
│           └── hr/
│               └── goals/
│                   ├── page.tsx
│                   ├── cycles/
│                   │   └── page.tsx
│                   └── tracking/
│                       └── page.tsx
├── app/
│   └── api/
│       └── hr/
│           └── goals/
│               ├── route.ts                     # GET (list), POST (create)
│               ├── my/
│               │   └── route.ts
│               ├── company/
│               │   └── route.ts
│               ├── department/
│               │   └── [deptId]/
│               │       └── route.ts
│               ├── cycles/
│               │   ├── route.ts
│               │   └── [cycleId]/
│               │       ├── route.ts
│               │       ├── activate/
│               │       │   └── route.ts
│               │       └── close/
│               │           └── route.ts
│               └── [goalId]/
│                   ├── route.ts
│                   ├── key-results/
│                   │   ├── route.ts
│                   │   └── [krId]/
│                   │       └── route.ts
│                   └── progress/
│                       └── route.ts
├── views/
│   └── greenhouse/
│       └── hr-goals/
│           ├── MyGoalsView.tsx
│           ├── GoalCard.tsx
│           ├── GoalProgressDrawer.tsx
│           ├── KeyResultRow.tsx
│           ├── GoalsCycleList.tsx
│           ├── GoalsTrackingView.tsx
│           ├── CompanyGoalsTree.tsx
│           └── PersonGoalsTab.tsx
├── lib/
│   └── hr-goals/
│       ├── queries.ts
│       ├── progress-calculator.ts
│       ├── cascade-aggregation.ts
│       └── eligibility.ts
└── types/
    └── hr-goals.ts
```

---

## PARTE F: Orden de ejecución

### Fase 1: Infraestructura
1. Crear 4 tablas PostgreSQL
2. Crear TypeScript types

### Fase 2: APIs — Cycles
3-6. Cycles CRUD + activate/close

### Fase 3: APIs — Goals + KRs
7-12. Goals CRUD, KR CRUD, my/department/company endpoints

### Fase 4: APIs — Progress
13-14. Progress recording + auto-recalculation

### Fase 5: UI
15-18. Self-service view, admin views, People 360 tab

---

## Criterios de aceptación

- [ ] 4 tablas creadas en `greenhouse_hr`
- [ ] Cycles CRUD con lifecycle: draft → active → review → closed
- [ ] Goals cascade: company → department → individual
- [ ] Key results con target_value y current_value trackeable
- [ ] Progress recording recalcula `goals.progress_percent` automáticamente
- [ ] Self-service view muestra mis goals + context de departamento y empresa
- [ ] Admin tracking view muestra heatmap de progreso por persona
- [ ] Elegibilidad por `contract_type` funciona correctamente
- [ ] People 360 tab "Objetivos" muestra goals across cycles

## Lo que NO incluye

- Auto-derivación de goals desde ICO metrics
- Integración con Notion tasks para tracking automático
- Gamification o badges por completar goals
- Peer visibility (ver goals de otros colaboradores del mismo nivel) — solo departamento y empresa
- Weighting de key results (todos pesan igual en MVP)

## Notas para el agente

- **Goals y ICO son complementarios.** No intentes conectar goals a `notion_ops.tareas`. Los goals son declaraciones estratégicas; el ICO mide output operacional. La evaluación de desempeño (Fase 3) es donde convergen.
- **`progress_percent` se recalcula server-side.** Si hay KRs: promedio de `(current_value / target_value × 100)` across KRs. Si no hay KRs: último `goal_progress.progress_percent`.
- **Cascade aggregation es optional.** Solo se activa si HR configura el parent goal con auto-aggregate. Default: manual.
- **Branch naming:** `feature/hris-goals`.

---

*Efeonce Greenhouse™ · Efeonce Group · Marzo 2026*
