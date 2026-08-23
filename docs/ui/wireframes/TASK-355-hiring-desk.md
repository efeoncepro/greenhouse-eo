# TASK-355 — Hiring Desk Wireframe

## Delta 2026-08-23 — Retorno contextual Application 360 → Pipeline

- `Application 360` es un detalle hijo de `Pipeline`, no una quinta surface hermana. La pestaña persistente `Pipeline` es el único retorno primario: en el detalle muestra flecha, conserva el label visible y su nombre accesible es `Volver al pipeline de {opening}`.
- El destino se deriva de la postulación y nunca del historial ni de una vacante fija: `/agency/hiring/pipeline?openingId={application.openingId}&focusApplication={applicationId}`. El selector del Pipeline sincroniza `openingId` con la URL para que scope, recarga y deep link respondan a la misma fuente.
- Al volver, el tablero muestra la vacante exacta sin restaurar una búsqueda que pueda ocultar postulantes; desplaza y enfoca la tarjeta de origen con un resaltado breve. `aria-current='location'` identifica Pipeline como ubicación padre en Application 360; `page` queda reservado para la ruta exacta.
- Motion: `ViewTransitionLink` + nombre compartido por `applicationId` producen morph tarjeta↔hero durante 400 ms con easing emphasized. Sin soporte hay navegación normal; con `prefers-reduced-motion` el cambio es instantáneo y conserva destino, foco y significado.
- Decisión: `reuse + extend`. Se reutilizan route tab, `ViewTransitionLink`, `DetailHero` y la card existente; no nace botón Volver, sidecar ni primitive paralela.

## Delta 2026-08-16 — Scope de vacante y plano operacional del Pipeline

- El selector de vacante deja de flotar sobre `background.default`: pasa al slot `secondaryActions` del `WorkbenchHeader` compartido, con label visible, valor completo adaptable y metadata de código/área.
- El conteo de postulantes pasa al slot `meta` del mismo header y se actualiza con el scope y la búsqueda activos.
- Búsqueda, ayuda de teclado, estados y Kanban viven dentro de una única superficie operacional blanca; el área de carriles usa una banda tonal interna y scroll horizontal propio.
- Los carriles dejan de competir como cards elevadas: son drop-zones tonales con borde; las tarjetas de candidatos conservan el nivel interactivo principal.
- `Simular fallo de red` no es un control de producto. La inyección de rollback queda disponible sólo mediante el parámetro gobernado del escenario GVC y no aparece en la UI del operador.
- Decisión: `reuse + extend` (`HiringDeskFrame` expone `secondaryActions/meta`; MUI `Select` y `Paper` route-local). No nace una primitive nueva ni cambia el contrato de datos.

## Delta 2026-07-16 — Publication Desk (TASK-1422)

- La Surface 4 (Publication Desk) ganó: (1) **selector de vacante** en el header card (antes la vista fijaba `openings[0]`); (2) CTA **"Redactar con IA"** en el header de la columna pública del diff → drawer propose→confirm del copy público (contratos en `docs/ui/wireframes/TASK-1422-vacancy-ai-draft-drawer.md` + flow + motion). El diff anti-leak y las acciones de publish quedaron intactos.

## Meta

- Task: `TASK-355`
- Superficie: Hiring Desk interno (`(dashboard)`, con sesión) — shell común + 4 workspaces
- Nodos del master flow: N4 (bandeja) · N5 (ficha 360) · N6 (asignar test) · N8 (review scorecard) · N9 (decisión) — ver `docs/ui/flows/EPIC-011-hiring-ats-UI-FLOW.md`
- UI rigor: `ui-platform`
- Ruta: `src/app/(dashboard)/agency/hiring/**` (NO `[lang]`). Marca: **Greenhouse** (app interna, no Efeonce institucional).
- Locale: bilingüe es-CL + en-US vía `getMicrocopy(locale)` (dictionaries `hiringDesk`).
- Estado: `approved` (UI ready: yes — HTML interactivo revisado en Playwright el 2026-07-09; GVC runtime sigue siendo gate de cierre)
- Referencia visual aprobada local: `~/Documents/carreers/Hiring-Desk/Hiring-Desk/Hiring Desk.dc.html` (fuente completa con estados, dialogs, drawer, Kanban y microinteracciones; no reconstruir desde screenshots aisladas)
- **Contrato Claude Design / Greenhouse Chrome:** el HTML aprobado de Claude Design es un prototipo funcional aprobado para el **contenido interno del workspace Hiring Desk**: tabs, tarjetas, Kanban, drawers, dialogs, estados, microinteracciones, densidades y copy visible de la superficie. **NO** autoriza reemplazar el chrome global de Greenhouse: sidebar, topbar, buscador global, navegación vertical, avatar, dock flotante, layout dashboard y wrappers de `(dashboard)` siguen siendo el source of truth del producto.
- Skills: `greenhouse-talent-people-operator` · `greenhouse-ux` · `info-architecture` · `state-design` · `forms-ux` · `a11y-architect` · `arch-architect`

## Brief

El "control room" del ATS: un reclutador/hiring manager opera el pipeline de punta a punta dentro del chrome global de Greenhouse — publica una vacante, ve postulantes, los mueve por etapas, asigna el test, revisa el scorecard (la IA sugiere, él confirma) y decide con un reason defendible. El layout, densidad y microinteracciones **dentro del canvas de Hiring Desk** deben seguir el HTML Claude Design aprobado con máxima fidelidad. Es la contraparte interna de la careers pública (354). Fairness: decisión estructurada, contestable, nunca auto-rechazo; PII masked por default.

## Layout Skeleton

### Shell común — `Hiring Desk` dentro del chrome Greenhouse

```
┌─ Chrome global Greenhouse existente (NO tocar/reemplazar) ───────────────┐
│  Sidebar + topbar + búsqueda global + avatar + dock siguen siendo runtime │
├──────────────────────────────────────────────────────────────────────────┤
│  Canvas interno Hiring Desk — aquí sí manda el HTML Claude Design aprobado│
│  Hiring Desk    [Demanda] [Pipeline] [Publicación]                       │
│  <región activa: Demand Desk | Pipeline Board | Publication Desk | 360>   │
└──────────────────────────────────────────────────────────────────────────┘
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
│ Hiring Desk                                      Vacante [opening ▾]│
│ 30 postulantes                                                    │
│ Demanda · Pipeline · Publicación · Banco de talento               │
└───────────────────────────────────────────────────────────────────┘
┌──────────────────────── Plano operacional ─────────────────────────┐
│ [buscar postulante…]                         [ayuda de teclado]     │
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
| `hiringDesk.nav.pipeline` | Pipeline | Shell; en Application 360 actúa como ubicación padre |
| `hiringDesk.common.returnToOpeningPipeline` | Volver al pipeline de {opening} | Nombre accesible del retorno contextual |
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
| Chrome global | Layout existente de `(dashboard)` / Vuexy-Greenhouse | — | **No reemplazar** por el chrome del HTML. El prototipo Claude Design no gobierna sidebar/topbar globales. |
| Canvas Hiring | `HiringDeskFrame` + views de Hiring | — | Aquí se implementa la fidelidad al HTML aprobado: densidad, tabs, cards, Kanban, drawers, dialogs y microinteracciones. |
| Demand Desk | tabla (patrón `StaffAugmentationListView`) + `MetricSummaryCard` KPIs | readers openings/demands (353, server-side paginado) | drilldown |
| Pipeline Board | Kanban route-local fiel al HTML: lanes 264px + cards `HiringApplication` + drag/drop nativo + menú teclado | `updateHiringApplicationStage` (353) | Se evita wrapper DnD que inserta indicadores visuales ajenos al HTML; drag es aditivo. La card separa superficie visual draggable, botón principal de apertura y `IconButton` de menú para evitar nested interactive. |
| Application 360 | detail shell (patrón `PlacementDetailView`) + tabs | readers 360 + embed 1363/1362 + `decideHiringApplication` | anti silent-catch |
| Decisión form | `react-hook-form` + confirmación | `decideHiringApplication` (nuevo) | reason estructurado |
| Publication Desk | diff view + acciones | `buildPublicOpeningPayload` + `publishOpening`/`unpublishOpening` | `revalidatePath('/public/careers')` |

Copy `getMicrocopy(locale).hiringDesk`; tokens AXIS; charts (KPIs) ECharts→Apex.

## GVC Scenario Plan

- `hiring-demand-desk` (loaded/empty/filtered/error).
- `hiring-pipeline-board` (columnas + columna vacía + **drag** + **teclado move** + optimistic/rollback).
- `hiring-tabs-transition` (Demand → Pipeline → Publication con tablist real y panel transition).
- `hiring-application-360` (tabs + assessment embed [pending/AI-suggested/scored] + docs [masked/reveal] + decisión form).
- `hiring-publication-desk` (diff + publish-confirm).
- Checks: `scrollWidth==clientWidth` (1440 + 390), consola limpia, reduced-motion, **a11y kanban por teclado (axe)**, foco correcto. Datos reales vía 353/1367.
- Evidencia local final 2026-07-10: `task355-hiring-pipeline-board` PASS en `.captures/2026-07-10T08-19-55_task355-hiring-pipeline-board` (mobile-first + desktop; card hover/focus/reduced-motion; rollback) y `task355-hiring-tabs-transition` PASS en `.captures/2026-07-10T08-16-47_task355-hiring-tabs-transition`.
- Evidencia posterior por feedback visual 2026-07-10: `task355-hiring-pipeline-board` PASS en `.captures/2026-07-10T09-05-35_task355-hiring-pipeline-board` (toolbar alineado, search derecho, placeholder fiel, lanes/cards con mayor profundidad) y `task355-hiring-tabs-transition` PASS en `.captures/2026-07-10T09-07-55_task355-hiring-tabs-transition` (Demand → Pipeline → Publicación con navegación robusta y panel transition).
- Evidencia posterior Demanda 2026-07-10: `task355-hiring-demand-desk` PASS desktop/mobile en `.captures/2026-07-10T09-35-01_task355-hiring-demand-desk` (KPIs con profundidad, toolbar izquierda/derecha alineado, tabla enterprise, responsive sin overflow de página).
- Evidencia de recomposición Pipeline 2026-08-16: `task355-hiring-pipeline-board` PASS desktop/390 px en `.captures/2026-08-16T22-13-39_task355-hiring-pipeline-board` (scope de vacante contenido, toolbar y Kanban en un plano operacional, labels completos, teclado, rollback, reduced-motion y axe sin findings).
- Evidencia de retorno contextual 2026-08-23: `task355-hiring-application-360` PASS desktop/390 px en `.captures/2026-08-23T20-28-03_task355-hiring-application-360` (12 frames + video; destino de vacante exacto, foco en tarjeta, pestaña activa visible, cero errores de consola/página/hidratación/red). Los warnings de contraste pertenecen a contenido preexistente de Application 360 y no al control de retorno.
- Auditoría de fidelidad canvas-only 2026-07-10: `.captures/task355-hiring-reference-canvas-2026-07-10T08-18-26-140Z/index.html` compara el `main` del HTML aprobado contra runtime Demand/Pipeline/Publication, excluyendo el chrome global Greenhouse por contrato.

## Design Decision Log

- **Contrato de fidelidad correcto:** Claude Design/HTML aprobado gobierna el interior de Hiring Desk; Greenhouse gobierna el chrome global. No tocar `src/app/(dashboard)/layout.tsx`, menús globales, topbar, dock, avatar ni navegación para perseguir fidelidad visual del prototipo.
- **Composition Shell base** (CLAUDE.md); cards Adaptive (density=auto).
- **Kanban canónico route-local para Hiring**: se prioriza fidelidad al HTML aprobado sobre wrappers genéricos cuando estos agregan artefactos visuales; drag/drop nativo + menú teclado obligatorio (a11y), NO demo full-version.
- **Pipeline sparse real-data polish:** el HTML demo tiene muchas postulaciones; runtime real puede tener 1. En baja densidad no se inventan cards demo: se compactan drop-zones, se usa motion de entrada de lanes/cards, se conservan lanes de 264px y el scroll queda interno al board con affordance de borde, nunca como scroll de página.
- **Demand enterprise polish:** la vista Demanda debe evitar el plano "tabla + filtros" cuando hay pocos datos reales. Los KPIs llevan acento/gradiente/glow sutil, el toolbar se agrupa izquierda/derecha como superficie premium, los filtros usan labels compactos/responsive y la tabla traduce estados raw a labels canónicos visibles (`Abierta`, `Publicada`) sin inventar métricas ni alterar el reader.
- **Scope + toolbar Pipeline:** selector/count viven en `WorkbenchHeader.secondaryActions/meta`; búsqueda y ayuda pertenecen al plano operacional del Kanban. No permitir truncamiento del valor activo a 390 px. El fallo de red es harness GVC, no toggle visible. Placeholder específico: `Buscar postulante…`.
- **Transición tabs:** las tabs son navegación real (`href`) para no perder robustez; el panel aplica entrada `ghHiringPanel` y `viewTransitionName='hiring-desk-panel'`, con reduced-motion sin animación.
- **360 = hub** que embebe assessment (1363) + docs (1362) + decisión; IA propone→humano confirma; anti-anclaje.
- **360 vuelve por Pipeline, no por un CTA paralelo:** el route tab persistente resuelve el padre con `openingId`, `focusApplication` reencuentra la tarjeta y el morph compartido preserva continuidad espacial con reduced-motion equivalente.
- **Decisión estructurada/contestable** (reason obligatorio) — fairness/AI-Act; scorecard advisory, nunca gate.
- **Publication diff** anti-leak; publish refresca la careers (`revalidatePath`).
- **Bilingüe** es-CL + en-US; **marca Greenhouse** (app interna, no Efeonce).
- **PII masked/reveal** con capability+reason+audit.

## Acceptance Checklist

- [ ] Chrome global Greenhouse intacto + rutas `(dashboard)/agency/hiring/**` (NO `[lang]`) + deep links; bilingüe.
- [ ] Demand (tabla server-side) · Pipeline (kanban route-local fiel al HTML, card=`HiringApplication`, `updateHiringApplicationStage`) · 360 (tabs + assessment 1363 + docs 1362 + decisión) · Publication (diff + publish).
- [ ] Kanban con **alternativa por teclado** + optimistic+rollback; a11y axe verde.
- [ ] `decideHiringApplication`: humano decide, reason estructurado, idempotencia + audit; scorecard advisory.
- [ ] viewCodes `gestion.hiring*` con ruta alcanzable (reachability) mismo PR; `role_view_fallback=0`.
- [ ] PII masked/reveal (capability+reason+audit); Publication solo allowlist; publish → `revalidatePath`.
- [ ] Readers del 360 anti silent-catch (degradación honesta).
- [x] GVC desktop+mobile mirado; `scrollWidth==clientWidth`; consola limpia en canvas TASK-355. Evidencia local vigente: `.captures/2026-07-10T09-35-01_task355-hiring-demand-desk` + `.captures/2026-07-10T09-05-35_task355-hiring-pipeline-board` + `.captures/2026-07-10T09-07-55_task355-hiring-tabs-transition`; warnings axe restantes pertenecen al chrome global preexistente, no al card nesting corregido.
- [ ] `UI ready: yes` solo con lo anterior + `pnpm task:lint --task TASK-355` sin findings.
