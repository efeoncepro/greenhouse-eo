# TASK-355 — Hiring Desk Wireframe

## Meta

- Task: `TASK-355`
- Superficie: Hiring Desk interno (`(dashboard)`, con sesión) — shell común + 4 workspaces
- Nodos del master flow: N4 (bandeja) · N5 (ficha 360) · N6 (asignar test) · N8 (review scorecard) · N9 (decisión) — ver `docs/ui/flows/EPIC-011-hiring-ats-UI-FLOW.md`
- UI rigor: `ui-platform`
- Ruta: `src/app/(dashboard)/agency/hiring/**` (NO `[lang]`). Marca: **Greenhouse** (app interna, no Efeonce institucional).
- Locale: bilingüe es-CL + en-US vía `getMicrocopy(locale)` (dictionaries `hiringDesk`).
- Estado: `draft` (UI ready: no — falta loop GVC)
- Skills: `greenhouse-talent-people-operator` · `greenhouse-ux` · `info-architecture` · `state-design` · `forms-ux` · `a11y-architect` · `arch-architect`

## Brief

El "control room" del ATS: un reclutador/hiring manager opera el pipeline de punta a punta bajo una shell común (`CompositionShell`) — publica una vacante, ve postulantes, los mueve por etapas, asigna el test, revisa el scorecard (la IA sugiere, él confirma) y decide con un reason defendible. Es la contraparte interna de la careers pública (354). Fairness: decisión estructurada, contestable, nunca auto-rechazo; PII masked por default.

## Layout Skeleton

### Shell común — `Hiring Desk` (CompositionShell)

```
┌─ Greenhouse (dashboard) ──────────────────────────────────────────┐
│  Hiring Desk    [Demanda] [Pipeline] [Publicación]   (es-CL/en-US) │  tabs hermanas (deep link)
├───────────────────────────────────────────────────────────────────┤
│  <región activa: Demand Desk | Pipeline Board | Publication Desk>  │
│  (Application 360 abre como ruta hija /[applicationId] o sidecar)  │
└───────────────────────────────────────────────────────────────────┘
```

### Surface 1 — Demand Desk (N4) `/agency/hiring`

```
┌───────────────────────────────────────────────────────────────────┐
│  KPIs: [Demandas abiertas] [Openings publicados] [Postulantes] [...]│  MetricSummaryCard
│  [buscar]  [estado ▾] [área ▾] [BU ▾]              [+ Nueva demanda]│  filtros server-side
├───────────────────────────────────────────────────────────────────┤
│  Rol · Área · Seats · Estado · Publicación · Postulantes · [→]     │  tabla (patrón StaffAug)
│  Account Manager · Growth · 1 · abierta · publicado · 12 · [Ver]   │  drilldown → pipeline/360/pub
│  … paginación server-side …                                        │
└───────────────────────────────────────────────────────────────────┘
```

### Surface 2 — Pipeline Board (N4/N6) `/agency/hiring/pipeline`

```
┌───────────────────────────────────────────────────────────────────┐
│  [opening ▾]   Postulantes de: Account Manager        [buscar]     │
├──────────┬──────────┬───────────┬────────────┬──────────┬─────────┤
│ Sourced  │ Screening│ Assessment│ Entrevista │ Decisión │ Cerrado │  columnas = etapas canónicas
│ ┌──────┐ │ ┌──────┐ │  ┌──────┐ │            │          │         │
│ │[card]│ │ │[card]│ │  │[card]│ │            │          │         │  card = HiringApplication
│ │Nombre│ │ │      │ │  │ ⚑test│ │            │          │         │  (Adaptive Card, density=auto)
│ │[⋮ mover]│ │      │ │  └──────┘ │            │          │         │  ⋮ = menú teclado "mover a…"
│ └──────┘ │ └──────┘ │           │            │          │         │
│ (vacía)  │          │           │            │          │ (vacía) │  columna vacía honesta
└──────────┴──────────┴───────────┴────────────┴──────────┴─────────┘
  drag OR menú teclado → updateHiringApplicationStage (optimistic + rollback)
  click card → Application 360
```

### Surface 3 — Application 360 (N5/N8/N9) `/agency/hiring/[applicationId]`

```
┌───────────────────────────────────────────────────────────────────┐
│  ← Volver   {Candidato}  · {Rol}  · etapa: Assessment  [Decidir ▾] │  detail shell (patrón Placement)
│  [Overview] [Assessment] [Documentos] [Decisión] [Actividad]       │  tabs
├───────────────────────────────────────────────────────────────────┤
│  OVERVIEW: perfil (masked), fuente=public_careers, links portafolio│
│  ─────────────────────────────────────────────────────────────────│
│  ASSESSMENT (embed 1363): scorecard por competencia (advisory)     │
│   · SEO 88 · Copywriting 80 · Liderazgo [pendiente corrección]     │
│   · Respuesta abierta → [IA sugiere 72 · confirmar / editar]       │  IA propone → humano confirma
│  ─────────────────────────────────────────────────────────────────│
│  DOCUMENTOS (embed 1362): CV [masked ·(revelar)] · identidad [•••] │  reveal = capability+reason+audit
│  ─────────────────────────────────────────────────────────────────│
│  DECISIÓN: [avanzar / rechazar / hold]  + destino · fecha · entidad│  form (forms-ux) + reason
│   Motivo (estructurado, obligatorio): [_______________]  [Confirmar]│  defendible/contestable
└───────────────────────────────────────────────────────────────────┘
```

### Surface 4 — Publication Desk (N-publish) `/agency/hiring/publication`

```
┌───────────────────────────────────────────────────────────────────┐
│  Openings · estado de publicación                                  │
│  Account Manager · borrador  → [Revisar y publicar]                │
├───────────────────────────────────────────────────────────────────┤
│  DIFF interno ↔ público (buildPublicOpeningPayload):               │
│   público mostrará: título, resumen, requisitos…  (allowlist)      │  anti-leak
│   NO se publica: notas internas, budget, riesgo…                   │
│   [Publicar]  [Pausar]  [Cerrar]   (dialog de confirmación)        │  capability publish
└───────────────────────────────────────────────────────────────────┘
   publish/unpublish → revalidatePath('/public/careers') (refresca careers 354)
```

## Copy Ledger (bilingüe — dictionaries `src/lib/copy/dictionaries/{es-CL,en-US}/hiringDesk.ts`)

| id | es-CL | Dónde |
|---|---|---|
| `hiringDesk.nav.demand` | Demanda | Shell |
| `hiringDesk.nav.pipeline` | Pipeline | Shell |
| `hiringDesk.nav.publication` | Publicación | Shell |
| `hiringDesk.demand.newCta` | Nueva demanda | Demand |
| `hiringDesk.pipeline.moveTo` | Mover a etapa | Kanban (teclado) |
| `hiringDesk.a360.tab.assessment` | Evaluación | 360 |
| `hiringDesk.a360.ai_suggested` | Sugerencia IA — confirma o edita | 360 |
| `hiringDesk.a360.reveal` | Revelar (requiere motivo) | 360 docs |
| `hiringDesk.decision.reason` | Motivo de la decisión | Decisión |
| `hiringDesk.decision.confirm` | Confirmar decisión | Decisión |
| `hiringDesk.pub.publish` | Publicar vacante | Publication |
| `hiringDesk.pub.diff_note` | Esto es lo que verá el público | Publication |

## State Copy (12-state por surface — clave)

| Surface | Estados |
|---|---|
| Demand Desk | loading (skeletons) · loaded · empty (sin demandas) · empty-filtered · error |
| Pipeline Board | loading · columnas · **columna vacía** ("Sin postulantes en esta etapa") · **drag-active** · **optimistic-moving** · **rollback** ("No se pudo mover, se revirtió") · error |
| Application 360 | por tab: loading · loaded · **degradado honesto** (facet que falla, no `catch(()=>[])`); assessment: pending-human-rating · AI-suggested · scored; docs: masked · revealed |
| Publication Desk | diff · sin-cambios · publish-confirm · error |

## Accessibility Contract (WCAG 2.2 AA)

- **Kanban NO drag-only** (2.5.7): cada card tiene menú "Mover a etapa" operable por teclado; foco + `aria` correctos; el drag es aditivo. Optimistic move anuncia el resultado (`aria-live`).
- Tabs (360) = APG tabs pattern; detail shell con foco al `<h1>` al abrir.
- Decisión + reveal + publish = confirmaciones accesibles (`role=alertdialog`/dialog, foco atrapado, Esc cierra).
- Reveal de PII: el estado masked/revealed se anuncia; el motivo es requerido.
- Reflow 320/200%; target ≥24px; `prefers-reduced-motion` (drag/optimistic sin motion cuando reduce).

## Implementation Mapping

| Región | Componente (primitive → Vuexy `Custom*` → MUI) | Reader/Command | Notas |
|---|---|---|---|
| Shell | `CompositionShell` (regiones + nav hermana) | — | NO shell hand-rolled |
| Demand Desk | tabla (patrón `StaffAugmentationListView`) + `MetricSummaryCard` KPIs | readers openings/demands (353, server-side paginado) | drilldown |
| Pipeline Board | `RoadmapBoard` + `GreenhouseDragList` (+ teclado) | `updateHiringApplicationStage` (353) | Adaptive Card; optimistic+rollback |
| Application 360 | detail shell (patrón `PlacementDetailView`) + tabs | readers 360 + embed 1363/1362 + `decideHiringApplication` | anti silent-catch |
| Decisión form | `react-hook-form` + confirmación | `decideHiringApplication` (nuevo) | reason estructurado |
| Publication Desk | diff view + acciones | `buildPublicOpeningPayload` + `publishOpening`/`unpublishOpening` | `revalidatePath('/public/careers')` |

Copy `getMicrocopy(locale).hiringDesk`; tokens AXIS; charts (KPIs) ECharts→Apex.

## GVC Scenario Plan

- `hiring-demand-desk` (loaded/empty/filtered/error).
- `hiring-pipeline-board` (columnas + columna vacía + **drag** + **teclado move** + optimistic/rollback).
- `hiring-application-360` (tabs + assessment embed [pending/AI-suggested/scored] + docs [masked/reveal] + decisión form).
- `hiring-publication-desk` (diff + publish-confirm).
- Checks: `scrollWidth==clientWidth` (1440 + 390), consola limpia, reduced-motion, **a11y kanban por teclado (axe)**, foco correcto. Datos reales vía 353/1367.

## Design Decision Log

- **Composition Shell base** (CLAUDE.md); cards Adaptive (density=auto).
- **Kanban canónico** (`RoadmapBoard`/`GreenhouseDragList`) + teclado obligatorio (a11y), NO demo full-version.
- **360 = hub** que embebe assessment (1363) + docs (1362) + decisión; IA propone→humano confirma; anti-anclaje.
- **Decisión estructurada/contestable** (reason obligatorio) — fairness/AI-Act; scorecard advisory, nunca gate.
- **Publication diff** anti-leak; publish refresca la careers (`revalidatePath`).
- **Bilingüe** es-CL + en-US; **marca Greenhouse** (app interna, no Efeonce).
- **PII masked/reveal** con capability+reason+audit.

## Acceptance Checklist

- [ ] Shell `CompositionShell` + rutas `(dashboard)/agency/hiring/**` (NO `[lang]`) + deep links; bilingüe.
- [ ] Demand (tabla server-side) · Pipeline (kanban `RoadmapBoard`, card=`HiringApplication`, `updateHiringApplicationStage`) · 360 (tabs + assessment 1363 + docs 1362 + decisión) · Publication (diff + publish).
- [ ] Kanban con **alternativa por teclado** + optimistic+rollback; a11y axe verde.
- [ ] `decideHiringApplication`: humano decide, reason estructurado, idempotencia + audit; scorecard advisory.
- [ ] viewCodes `agency.hiring.*` con ruta alcanzable (reachability) mismo PR; `role_view_fallback=0`.
- [ ] PII masked/reveal (capability+reason+audit); Publication solo allowlist; publish → `revalidatePath`.
- [ ] Readers del 360 anti silent-catch (degradación honesta).
- [ ] GVC desktop+mobile mirado; `scrollWidth==clientWidth`; consola limpia.
- [ ] `UI ready: yes` solo con lo anterior + `pnpm task:lint --task TASK-355` sin findings.
