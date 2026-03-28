# CODEX TASK — HRIS Fase 3: Evaluaciones de Desempeño 360°

## Delta 2026-03-27 — Alineación arquitectónica

- **Fuente ICO corregida**: métricas ICO (RpA, OTD%, FTR%, throughput, cycle time) deben leerse de `greenhouse_serving.ico_member_metrics` (PostgreSQL). NUNCA leer de BigQuery directamente en este módulo. El pipeline BQ→PG ya está manejado por `src/lib/sync/projections/ico-member-metrics.ts`.
- **TASK-029 es hard dependency**: `greenhouse_hr.goals` debe existir para input de goal completion en el summary. Si no existe al momento de generar summary, retornar null para campos de goals (degradación graceful).
- **Outbox events obligatorios**: registrar en `src/lib/sync/event-catalog.ts`:
  - Aggregate types: `evalCycle`, `evalAssignment`
  - Eventos: `hr.eval_cycle.activated`, `hr.eval_cycle.advanced`, `hr.eval_cycle.closed`, `hr.eval_assignment.created`, `hr.eval_assignment.submitted`, `hr.eval_summary.finalized`
- **Integration con `person_intelligence`**: cuando un eval summary se finaliza (`hr.eval_summary.finalized`), la projection `person_intelligence` debe refrescarse para incluir `eval_overall_rating` y `eval_cycle_id` en el snapshot unificado. Esto enriquece People 360 con contexto de evaluación.
- **Notifications**: usar `NotificationService` via outbox events para:
  - Notificar a colaboradores cuando ciclo avanza a `self_eval`
  - Notificar a peer evaluators cuando ciclo avanza a `peer_eval`
  - Notificar a todos cuando resultados disponibles
- **Regla**: `ico-metrics-fetcher.ts` (si se crea) debe leer de `greenhouse_serving.ico_member_metrics`, no de BigQuery.

## Resumen

Implementar el **módulo de evaluaciones de desempeño** del HRIS en Greenhouse. Permite ejecutar ciclos de evaluación 360° donde cada colaborador es evaluado por sí mismo (auto-evaluación), sus pares, su supervisor directo, y opcionalmente sus reportes directos. El resultado combina ratings cualitativos por competencia con métricas cuantitativas del ICO Engine y progreso de goals.

**El problema hoy:** No hay evaluaciones formales de desempeño. El feedback es informal y no queda registrado. No hay forma de cruzar lo que una persona dice que quiere lograr (goals) con lo que efectivamente entrega (ICO metrics) y cómo lo percibe su equipo (feedback cualitativo).

**La solución:** Un módulo con dos superficies:
1. **`/my/evaluation`** — Vista self-service donde el colaborador completa su auto-evaluación, ve evaluaciones de pares asignadas, y consulta su resumen una vez cerrado el ciclo
2. **`/hr/evaluations`** — Vista admin donde HR configura ciclos, catálogo de competencias, asigna evaluadores, calibra resultados y genera resúmenes

**Este módulo consume de dos fuentes:**
- **Goals (Fase 2B):** Goal completion percentage como input cuantitativo estratégico
- **ICO Engine (BigQuery):** `member_performance_snapshots` con RpA, OTD%, throughput como input cuantitativo operacional

---

## Contexto del proyecto

- **Repo:** `github.com/efeoncepro/greenhouse-eo`
- **Branch de trabajo:** `feature/hris-evaluations`
- **Documento rector:** `Greenhouse_HRIS_Architecture_v1.md` §4.5
- **Schema:** `greenhouse_hr`
- **Prerequisitos:** Fase 0.5 (contract types), Fase 2B (Goals — para consumir goal completion)

### Documentos normativos

| Documento | Qué aporta |
|-----------|------------|
| `Greenhouse_HRIS_Architecture_v1.md` | Schema DDL §4.5, elegibilidad §5 |
| `Greenhouse_ICO_Engine_v1.md` | Performance snapshots, metric definitions |
| `CODEX_TASK_HR_Core_Module.md` | `member_performance_snapshots`, performance calculator |
| `Greenhouse_Nomenclatura_Portal_v3.md` | Constantes, colores, semáforos |

---

## Dependencias

| Dependencia | Estado | Impacto si no está |
|---|---|---|
| Fase 0.5 (contract types) | Prerequisito | Elegibilidad por `contract_type` y tenure |
| Fase 2B (Goals) | Prerequisito | Goal completion se muestra en eval summary |
| `greenhouse_hr` schema | Existe | Tablas van aquí |
| `member_performance_snapshots` (BigQuery) | Existe | ICO metrics para eval summary |
| `greenhouse_core.members` | Existe | `reports_to_member_id` para auto-assign evaluators |
| `greenhouse_core.departments` | Existe | Para filtrar por departamento |

---

## PARTE A: Schema PostgreSQL

Según `Greenhouse_HRIS_Architecture_v1.md` §4.5 — 5 tablas: `eval_competencies`, `eval_cycles`, `eval_assignments`, `eval_responses`, `eval_summaries`. DDL ya definido en el documento de arquitectura. Crear tal cual.

### A1. Seed data — Competencias iniciales

```sql
INSERT INTO greenhouse_hr.eval_competencies (competency_id, competency_name, description, category, applicable_levels, sort_order) VALUES
  -- Technical
  ('craft-quality', 'Calidad del craft', 'Dominio técnico en su área. Atención al detalle. Nivel de acabado de los entregables.', 'technical', '{}', 1),
  ('problem-solving', 'Resolución de problemas', 'Capacidad de diagnosticar problemas, proponer soluciones y ejecutarlas de forma autónoma.', 'technical', '{}', 2),
  ('tools-mastery', 'Dominio de herramientas', 'Uso eficiente de las herramientas del stack (diseño, desarrollo, project management, IA).', 'technical', '{}', 3),

  -- Soft skills
  ('communication', 'Comunicación', 'Claridad al comunicar ideas, contexto y status. Tanto escrita como verbal.', 'soft_skill', '{}', 4),
  ('collaboration', 'Colaboración', 'Capacidad de trabajar en equipo, dar y recibir feedback constructivo, adaptarse a otros estilos.', 'soft_skill', '{}', 5),
  ('ownership', 'Ownership', 'Se hace cargo de sus compromisos. Cumple deadlines. Escala problemas a tiempo.', 'soft_skill', '{}', 6),
  ('adaptability', 'Adaptabilidad', 'Manejo del cambio. Flexibilidad ante prioridades cambiantes o feedback inesperado.', 'soft_skill', '{}', 7),

  -- Leadership (applies to lead+)
  ('team-development', 'Desarrollo de equipo', 'Invierte en el crecimiento de sus reportes. Da feedback regular. Detecta fortalezas y áreas de mejora.', 'leadership', '{lead,manager,director}', 8),
  ('strategic-thinking', 'Pensamiento estratégico', 'Conecta el trabajo diario con objetivos de negocio. Prioriza con criterio.', 'leadership', '{lead,manager,director}', 9),
  ('decision-making', 'Toma de decisiones', 'Decide con información incompleta cuando es necesario. Asume responsabilidad por sus decisiones.', 'leadership', '{lead,manager,director}', 10),

  -- Values
  ('client-centricity', 'Foco en el cliente', 'Entiende las necesidades del cliente. Prioriza la experiencia y el resultado para el cliente.', 'values', '{}', 11),
  ('continuous-improvement', 'Mejora continua', 'Busca activamente mejorar procesos, herramientas y su propio desempeño.', 'values', '{}', 12);
```

---

## PARTE B: Evaluation cycle lifecycle

```
[HR creates cycle] → draft
  → [HR activates] → self_eval
    (Collaborators complete self-evaluations)
  → [Deadline passes / HR advances] → peer_eval
    (Peers and managers complete their evaluations)
  → [Deadline passes / HR advances] → manager_review
    (Managers review all inputs and write summary)
  → [HR advances] → calibration
    (HR reviews all summaries, adjusts if needed)
  → [HR closes] → closed
    (Results visible to collaborators)
```

HR can advance between phases manually. Deadlines are informational, not hard-blocking.

---

## PARTE C: Auto-assignment logic

When a cycle moves to `self_eval` status, auto-create assignments:

```typescript
async function autoCreateAssignments(cycleId: string) {
  const cycle = await getCycle(cycleId)
  const members = await getEligibleMembers(cycle)

  for (const member of members) {
    // 1. Self-evaluation (always)
    await createAssignment(cycleId, member.member_id, member.member_id, 'self')

    // 2. Manager evaluation (if reports_to exists)
    if (member.reports_to_member_id) {
      await createAssignment(cycleId, member.member_id, member.reports_to_member_id, 'manager')
    }

    // 3. Peer evaluations (2-3 peers from same department)
    const peers = await getSuggestedPeers(member, 3)
    for (const peer of peers) {
      await createAssignment(cycleId, member.member_id, peer.member_id, 'peer')
    }

    // 4. Direct report evaluations (if member has reports)
    const reports = await getDirectReports(member.member_id)
    for (const report of reports) {
      await createAssignment(cycleId, member.member_id, report.member_id, 'direct_report')
    }
  }
}
```

HR can manually add/remove assignments after auto-creation.

**Peer suggestion algorithm:** Select members from the same department who have been active for at least 90 days and are not the evaluatee's manager. Randomize and pick top 3. HR can override.

---

## PARTE D: API Routes

### D1. Competencies (config)

| Endpoint | Method | Auth |
|---|---|---|
| `GET /api/hr/evaluations/competencies` | GET | Any authenticated |
| `POST /api/hr/evaluations/competencies` | POST | `hr`, `admin` |
| `PATCH /api/hr/evaluations/competencies/[compId]` | PATCH | `hr`, `admin` |

### D2. Cycles

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `GET /api/hr/evaluations/cycles` | GET | Any authenticated | List cycles |
| `POST /api/hr/evaluations/cycles` | POST | `hr`, `admin` | Create cycle |
| `GET /api/hr/evaluations/cycles/[cycleId]` | GET | Any authenticated | Cycle detail + stats |
| `PATCH /api/hr/evaluations/cycles/[cycleId]` | PATCH | `hr`, `admin` | Update cycle |
| `POST /api/hr/evaluations/cycles/[cycleId]/advance` | POST | `hr`, `admin` | Advance to next phase |
| `POST /api/hr/evaluations/cycles/[cycleId]/close` | POST | `hr`, `admin` | Close cycle |

When advancing to `self_eval`, auto-create assignments (C).

### D3. Assignments

| Endpoint | Method | Auth |
|---|---|---|
| `GET /api/hr/evaluations/cycles/[cycleId]/assignments` | GET | `hr`, `admin` |
| `POST /api/hr/evaluations/cycles/[cycleId]/assignments` | POST | `hr`, `admin` (manual add) |
| `DELETE /api/hr/evaluations/assignments/[assignmentId]` | DELETE | `hr`, `admin` |
| `GET /api/hr/evaluations/my` | GET | `collaborator` | My pending + completed evaluations |

### D4. Responses

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `POST /api/hr/evaluations/assignments/[assignmentId]/responses` | POST | Assigned evaluator | Submit ratings for all competencies |
| `GET /api/hr/evaluations/assignments/[assignmentId]/responses` | GET | Assigned evaluator, `hr`, `admin` | View responses |
| `PATCH /api/hr/evaluations/assignments/[assignmentId]/submit` | PATCH | Assigned evaluator | Mark assignment as submitted |

**Response payload (batch submit):**
```typescript
{
  responses: Array<{
    competency_id: string
    rating: number          // 1-5
    comments?: string
  }>
}
```

### D5. Summaries

| Endpoint | Method | Auth |
|---|---|---|
| `GET /api/hr/evaluations/cycles/[cycleId]/summaries` | GET | `hr`, `admin` |
| `GET /api/hr/evaluations/cycles/[cycleId]/summaries/[memberId]` | GET | Member (if cycle closed), manager, `hr`, `admin` |
| `POST /api/hr/evaluations/cycles/[cycleId]/summaries/[memberId]/generate` | POST | `hr`, `admin` | Auto-generate summary from responses + ICO + goals |
| `PATCH /api/hr/evaluations/cycles/[cycleId]/summaries/[memberId]` | PATCH | `hr`, `admin` | Edit summary (strengths, development areas, notes) |
| `POST /api/hr/evaluations/cycles/[cycleId]/summaries/[memberId]/finalize` | POST | `hr`, `admin` | Lock summary |

### D6. Summary generation logic

When HR triggers "generate" for a member:

1. **Collect all submitted responses** for this evaluatee in this cycle
2. **Calculate per-competency averages** by eval_type:
   - `self_rating` = average of self-eval ratings
   - `peer_rating` = average of peer ratings
   - `manager_rating` = manager rating (single)
   - `overall_rating` = weighted average: manager 40%, peers 30%, self 20%, direct_reports 10%
3. **Fetch ICO metrics** from `member_performance_snapshots` for the cycle period:
   - `ico_rpa_avg` = average RpA over the cycle months
   - `ico_otd_percent` = average OTD% over the cycle months
4. **Fetch goal completion** from `greenhouse_hr.goals` for the active cycle:
   - Average `progress_percent` across all individual goals
5. **Create `eval_summaries` record** with all calculated fields

---

## PARTE E: Vistas UI

### E1. `/my/evaluation` — Mi evaluación (self-service)

**State 1: Cycle in `self_eval` phase — I need to complete my self-evaluation**
```
┌──────────────────────────────────────────────────────────┐
│  Header: "Evaluación S1 2026"                              │
│  Status: Auto-evaluación abierta · Fecha límite: 15 abril │
├──────────────────────────────────────────────────────────┤
│  Tu auto-evaluación:                                       │
│                                                            │
│  Calidad del craft          [1] [2] [3] [④] [5]          │
│  Comentario: [________________________]                    │
│                                                            │
│  Resolución de problemas    [1] [2] [3] [4] [⑤]          │
│  Comentario: [________________________]                    │
│  ... (all applicable competencies)                         │
│                                                            │
│  [Guardar borrador]  [Enviar auto-evaluación]              │
└──────────────────────────────────────────────────────────┘
```

**State 2: Cycle in `peer_eval` — I need to evaluate my peers**
```
┌──────────────────────────────────────────────────────────┐
│  Evaluaciones pendientes (3):                              │
│                                                            │
│  [Melkin Hernandez — Peer]          Pendiente              │
│  [Andrés Carlosama — Peer]          Pendiente              │
│  [Valentina Hoyos — Direct report]  ✓ Enviada              │
└──────────────────────────────────────────────────────────┘
```

Click en un nombre → formulario de rating por competencia (misma UI que auto-eval pero para la otra persona).

**State 3: Cycle `closed` — I can see my results**
```
┌──────────────────────────────────────────────────────────┐
│  Resultados — S1 2026                                      │
├──────────────────────────────────────────────────────────┤
│  Rating general: 4.2 / 5.0                                 │
│  [Auto: 4.0] [Pares: 4.1] [Manager: 4.5]                 │
├──────────────────────────────────────────────────────────┤
│  Métricas ICO del período:                                 │
│  RpA: 1.8 (🟡)  ·  OTD: 91% (🟢)  ·  Throughput: 23/mes │
├──────────────────────────────────────────────────────────┤
│  Objetivos completados: 72% promedio                       │
├──────────────────────────────────────────────────────────┤
│  Por competencia:                                          │
│  | Competencia | Auto | Pares | Manager | Total |          │
│  | Craft       | 4    | 4.2   | 4.5     | 4.3   |         │
│  | Comunicación| 3    | 3.8   | 4.0     | 3.7   |         │
│  ...                                                       │
├──────────────────────────────────────────────────────────┤
│  Fortalezas: [texto escrito por HR]                        │
│  Áreas de desarrollo: [texto escrito por HR]               │
└──────────────────────────────────────────────────────────┘
```

**Los ratings individuales de pares son anónimos.** El colaborador solo ve el promedio de pares, nunca quién dio qué rating. El rating del manager sí se identifica.

### E2. `/hr/evaluations` — Admin evaluaciones

```
┌──────────────────────────────────────────────────────────┐
│  Header: "Evaluaciones de desempeño"                       │
├──────────────────────────────────────────────────────────┤
│  Tabs: [Ciclos] [Competencias] [Resultados]                │
└──────────────────────────────────────────────────────────┘
```

**Tab Ciclos:** Lista de cycles con status, completion rate (% de assignments submitted), botones de advance/close. Detail view muestra all assignments con status.

**Tab Competencias:** Catálogo editable de competencias. CRUD con categoría, applicable levels, descripción.

**Tab Resultados:** Solo para ciclos cerrados. Tabla de summaries con: persona, overall rating, self vs peer vs manager breakdown, ICO metrics, goal completion. Exportable a XLSX. Click → detail de una persona con todo el desglose.

### E3. People 360 — Tab "Evaluaciones"

En `/people/[memberId]`, nuevo tab "Evaluaciones" que muestra historial de evaluaciones across cycles. Cada cycle muestra el summary card con rating, ICO metrics, y fortalezas/áreas.

---

## PARTE F: Elegibilidad

| contract_type | Participates in evaluations |
|---|---|
| `indefinido` | Full (evaluatee + evaluator) |
| `plazo_fijo` | If tenure > 6 months |
| `honorarios` | No |
| `contractor` | If tenure > 6 months (evaluatee only, not evaluator) |
| `eor` | Full |

The `min_tenure_days` field on `eval_cycles` controls the minimum. Default: 180 days. HR can override per cycle.

---

## PARTE G: Rating scale

| Rating | Label | Description |
|---|---|---|
| 1 | Necesita mejora significativa | Consistentemente por debajo de expectativas |
| 2 | En desarrollo | Parcialmente cumple expectativas, con gaps claros |
| 3 | Cumple expectativas | Desempeño sólido y consistente en el rol |
| 4 | Supera expectativas | Entrega por encima de lo esperado regularmente |
| 5 | Excepcional | Referente en su área, impacto visible en el equipo |

Agregar a `GH_LABELS` como `eval_rating_1` through `eval_rating_5`.

---

## PARTE H: File structure

```
src/
├── app/
│   └── [lang]/
│       └── (dashboard)/
│           ├── my/
│           │   └── evaluation/
│           │       └── page.tsx
│           └── hr/
│               └── evaluations/
│                   ├── page.tsx
│                   ├── cycles/
│                   │   └── [cycleId]/
│                   │       └── page.tsx
│                   ├── competencies/
│                   │   └── page.tsx
│                   └── results/
│                       └── [cycleId]/
│                           └── page.tsx
├── app/
│   └── api/
│       └── hr/
│           └── evaluations/
│               ├── competencies/
│               │   ├── route.ts
│               │   └── [compId]/
│               │       └── route.ts
│               ├── cycles/
│               │   ├── route.ts
│               │   └── [cycleId]/
│               │       ├── route.ts
│               │       ├── advance/
│               │       │   └── route.ts
│               │       ├── close/
│               │       │   └── route.ts
│               │       ├── assignments/
│               │       │   └── route.ts
│               │       └── summaries/
│               │           ├── route.ts
│               │           └── [memberId]/
│               │               ├── route.ts
│               │               ├── generate/
│               │               │   └── route.ts
│               │               └── finalize/
│               │                   └── route.ts
│               ├── assignments/
│               │   └── [assignmentId]/
│               │       ├── route.ts
│               │       ├── responses/
│               │       │   └── route.ts
│               │       └── submit/
│               │           └── route.ts
│               └── my/
│                   └── route.ts
├── views/
│   └── greenhouse/
│       └── hr-evaluations/
│           ├── MyEvaluationView.tsx
│           ├── EvalSelfForm.tsx
│           ├── EvalPeerForm.tsx
│           ├── EvalResultsView.tsx
│           ├── EvalCompetencyRating.tsx         # Rating widget (1-5 stars/buttons)
│           ├── EvalCycleList.tsx
│           ├── EvalCycleDetail.tsx
│           ├── EvalAssignmentMatrix.tsx
│           ├── EvalCompetencyConfig.tsx
│           ├── EvalSummaryCard.tsx
│           ├── EvalSummaryEditor.tsx             # HR edits strengths/areas
│           ├── EvalResultsTable.tsx
│           └── PersonEvaluationsTab.tsx
├── lib/
│   └── hr-evaluations/
│       ├── queries.ts
│       ├── auto-assign.ts                       # Auto-assignment logic
│       ├── peer-suggestions.ts                  # Peer selection algorithm
│       ├── summary-generator.ts                 # Aggregate responses + ICO + goals
│       ├── ico-metrics-fetcher.ts               # Read from BigQuery member_performance_snapshots
│       ├── goal-completion-fetcher.ts            # Read from greenhouse_hr.goals
│       └── eligibility.ts
└── types/
    └── hr-evaluations.ts
```

---

## PARTE I: Orden de ejecución

### Fase 1: Infraestructura
1. Crear 5 tablas PostgreSQL
2. Insertar seed competencies
3. Crear TypeScript types

### Fase 2: APIs — Competencies + Cycles
4-8. Competencies CRUD, Cycles CRUD + advance/close

### Fase 3: Auto-assignment
9. Implement auto-assign logic (triggered on cycle advance to `self_eval`)
10. Peer suggestion algorithm

### Fase 4: APIs — Assignments + Responses
11-14. Assignments CRUD, responses batch submit, submit finalization

### Fase 5: APIs — Summaries
15-18. Summary generation (aggregate + ICO + goals), edit, finalize

### Fase 6: UI — Self-service
19-21. Self-eval form, peer eval form, results view

### Fase 7: UI — Admin
22-26. Cycle management, assignment matrix, competency config, results table, summary editor

### Fase 8: Integration
27. People 360 tab "Evaluaciones"
28. Rating labels en `GH_LABELS`

---

## Criterios de aceptación

- [ ] 5 tablas creadas, seed competencies insertadas
- [ ] Cycle lifecycle: draft → self_eval → peer_eval → manager_review → calibration → closed
- [ ] Auto-assignment creates self + manager + peers + direct_reports
- [ ] Rating widget funciona (1-5 por competencia con comentarios)
- [ ] Summary generation agrega responses + ICO metrics + goal completion
- [ ] Peer ratings son anónimos para el evaluatee (solo promedio visible)
- [ ] Manager rating es identificable
- [ ] ICO metrics (`rpa_avg`, `otd_percent`) se leen de BigQuery `member_performance_snapshots`
- [ ] Goal completion se lee de `greenhouse_hr.goals`
- [ ] Elegibilidad por `contract_type` y `min_tenure_days` funciona
- [ ] Results exportable a XLSX
- [ ] People 360 tab "Evaluaciones" muestra historial

## Lo que NO incluye

- AI-generated summary text (futuro — Intelligence Layer could draft based on ratings + ICO + goals)
- Calibration workflow entre managers (MVP: HR does calibration manually)
- 9-box grid / talent matrix
- Compensation-linked evaluation outcomes (evaluations inform decisions, don't auto-trigger raises)
- Evaluation templates diferentes por departamento (same competencies, configurable per cycle via `competency_ids`)

## Notas para el agente

- **Anonymity is non-negotiable.** Peer ratings are NEVER exposed individually. Only averages. Manager ratings are identified. Self-ratings are obviously identified.
- **ICO metrics are read from BigQuery, not PostgreSQL.** Use `member_performance_snapshots` via the existing BigQuery client. The months covered by the cycle define the query range.
- **Goal completion comes from PostgreSQL** (`greenhouse_hr.goals` where `cycle_id` matches the goal cycle that overlaps with the eval cycle period). If no goals exist, that field is null in the summary.
- **The rating scale (1-5) is fixed.** Don't make it configurable in MVP. The labels are in `GH_LABELS`.
- **Weights for overall_rating:** Manager 40%, Peers 30%, Self 20%, Direct Reports 10%. If a category has no submissions (e.g., no direct reports), redistribute proportionally.
- **Branch naming:** `feature/hris-evaluations`.

---

*Efeonce Greenhouse™ · Efeonce Group · Marzo 2026*
