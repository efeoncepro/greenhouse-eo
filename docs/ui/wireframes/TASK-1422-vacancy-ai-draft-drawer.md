# TASK-1422 / Publication Desk — Redacción del aviso con IA (drawer propose→confirm)

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1422 — Vacancy AI draft UI (propose→confirm del copy público en el Publication Desk)`
- Product Design asset: extensión del canvas Hiring Desk aprobado (TASK-355, HTML Claude Design `~/Documents/carreers/Hiring-Desk/Hiring-Desk/Hiring Desk.dc.html`); el drawer replica el patrón del drawer "Nueva demanda" (DemandDeskView) y el lenguaje IA del Alert `tabler-sparkles` de la review 1363. No hay asset Figma nuevo: la dirección aprobada es "misma familia visual del desk".
- Intended consumers: reclutador / hiring manager interno (tier operador hiring) en `/agency/hiring/publication`.
- Copy source: `src/lib/copy/dictionaries/{es-CL,en-US}/hiringDesk.ts` → namespace `publication.vacancyAi.*` (nuevo) + reuso de `common.*`.
- Primitive decision: **reuse** — MUI `Drawer` con keyframe `ghHiringDrawer` (patrón canónico del desk), `GreenhouseButton`/`GreenhouseChip`, `CustomTextField`/`CustomAutocomplete`, `Alert`+`tabler-sparkles` (precedente 1363), `Skeleton` MUI para proposing. CERO primitives nuevas.
- UI ready target: `yes`

## Brief

- Primary user: reclutador/hiring manager con `hiring.opening.ai_assist` (propose) y `hiring.opening.write` (confirm).
- User moment: tiene un opening en borrador cuyo copy público está vacío (o pobre) y el publish está bloqueado por el gate 422; hoy tendría que redactar título/resumen/descripción/requisitos desde cero y no existe NINGÚN formulario de copy público en el desk.
- Job to be done: obtener un borrador completo del aviso alineado con lo que el assessment evalúa, revisarlo/editarlo como humano responsable y aplicarlo al opening — dejando la vacante lista para el publish (que sigue siendo otra acción).
- Primary decision signal: el diff público del Publication Desk pasa de "No informado" a copy real tras el confirm; el botón "Publicar vacante" se habilita (hoy está `disabled` sin `publicTitle`).
- Non-goals: publicar (acción existente aparte); editar la verdad interna; generar traducción en-US del aviso; operar desde Nexa (parity ya existe, consumer conversacional es follow-up).

## Layout Skeleton

### Superficie base — Publication Desk (extensión, no rediseño)

```
┌ HiringDeskFrame (tabs Demanda·Pipeline·Publicación) ──────────────────────┐
│ ┌ Header card del opening ────────────────────────────────────────────┐   │
│ │ [icono] Título · publicId · área · región   [chip estado]           │   │
│ │ {selector de vacante ▾  ← NUEVO si openings.length > 1}              │   │
│ └──────────────────────────────────────────────────────────────────────┘   │
│ [Alert allowlist: "Diff interno ↔ público"]                                │
│ ┌ Se publicará (público) ─────────┐ ┌ No se publica (interno) ────────┐    │
│ │ Título · Resumen · Resp. · Req. │ │ candados internos               │    │
│ │ {vacío ⇒ "No informado"}        │ │                                 │    │
│ │ [✨ Redactar con IA]  ← NUEVO    │ │                                 │    │
│ └─────────────────────────────────┘ └─────────────────────────────────┘    │
│                     [Pausar] [Publicar vacante] …acciones existentes…      │
└────────────────────────────────────────────────────────────────────────────┘
```

- El CTA nuevo vive en el header de la **columna pública** del diff (es su dueño semántico: redacta lo que esa columna muestra). Cuando existe un borrador pendiente en el ledger, el MISMO botón cambia a "Revisar borrador pendiente" con chip contador.
- Selector de vacante: `CustomAutocomplete` compacto en el header card (label `publication.vacancyAi.openingSelector`), solo si hay >1 opening en el snapshot. Corrige el gap actual (la vista fija `openings[0]`).

### Drawer — "Borrador del aviso con IA" (right anchor, 480px desktop / fullWidth mobile)

```
┌ Drawer ───────────────────────────────────────────────┐
│ ✨ Borrador del aviso con IA               [X cerrar] │  ← título (h5) + subtítulo
│ "La IA solo ve datos seguros: rol, skills y            │
│  competencias. Nunca presupuesto ni notas internas."   │  ← caption confianza (allowlist)
├────────────────────────────────────────────────────────┤
│ PASO generate (idle):                                  │
│   [Plantilla de assessment (opcional) ▾]               │  CustomAutocomplete
│   caption: "Alinea el aviso con lo que el proceso      │
│             realmente evalúa."                         │
│   [✨ Generar borrador]  (primaryAction)               │
├────────────────────────────────────────────────────────┤
│ PASO proposing:                                        │
│   [LinearProgress indeterminate]                       │
│   "Redactando el aviso… esto toma unos segundos."      │  role="status" aria-live
│   [Skeleton title][Skeleton x3 párrafos]               │  shape = formulario final
│   [Seguir en segundo plano] (cierra; el borrador queda │
│    pendiente de revisión)                              │
├────────────────────────────────────────────────────────┤
│ PASO review (form editable, prefilled):                │
│   [Alert info ✨: "Borrador generado por IA            │
│    (claude-sonnet-5) · revísalo antes de aplicar.      │
│    {note de la IA si viene}"]                          │
│   Título del cargo*        [CustomTextField]           │
│   Resumen*                 [CustomTextField x3 rows]   │
│   Descripción*             [CustomTextField x8 rows]   │
│   Requisitos               [CustomTextField x5 rows]   │
│   Deseables                [CustomTextField x3 rows]   │
│   Área                     [CustomTextField]           │
│   Seniority                [CustomTextField]           │
│   Skills (tags)            [CustomAutocomplete multiple │
│                             freeSolo + CustomChip]     │
│   Notas del proceso        [CustomTextField x2 rows]   │
│   caption anti-sesgo: "Revisa que el aviso no tenga    │
│    señales de género/edad ni requisitos no laborales." │
│   [Descartar borrador]           [Aplicar al aviso]    │
├────────────────────────────────────────────────────────┤
│ error (dentro del paso que falló):                     │
│   [Alert warning/error + acción de recuperación]       │
└────────────────────────────────────────────────────────┘
```

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Header card | identidad del opening + selector de vacante (nuevo) | Paper existente + `CustomAutocomplete` | `initialSnapshot.openings` |
| 1 | Columna pública del diff | CTA "Redactar con IA" / "Revisar borrador pendiente" | `GreenhouseButton kind='secondaryAction'` + ícono `tabler-sparkles` | flag+capabilities via props del page + pending proposal server-fetch |
| 2 | Drawer / paso generate | template picker opcional + generar | `CustomAutocomplete` + `GreenhouseButton` | `GET /api/hiring/assessments/templates` (lazy) |
| 3 | Drawer / paso proposing | progreso honesto del LLM | `LinearProgress` + `Skeleton` (shape del form) | `POST /api/hiring/openings/[id]/ai/propose-public-copy` |
| 4 | Drawer / paso review | form editable con el borrador | `CustomTextField`/`CustomAutocomplete`+`CustomChip`; Alert `tabler-sparkles` | `proposal.proposed` (`OpeningPublicCopyProposal`) |
| 5 | Drawer / footer review | descartar / aplicar | `Button outlined` + `GreenhouseButton kind='primaryAction'` | `POST /api/hiring/assessments/ai/proposals/[id]/confirm` |
| 6 | Base tras confirm | diff refrescado + toast | `Snackbar` existente | `GET /api/hiring/openings/[id]` refetch |

## Copy Ledger (`hiringDesk.publication.vacancyAi.*`, bilingüe es-CL + en-US)

| Copy id | Region | Text es-CL | Dynamic values | Notes |
|---|---|---|---|---|
| `publication.vacancyAi.cta` | 1 | Redactar con IA | — | ícono `tabler-sparkles`; NUNCA marca Nexa (es AI de dominio, no conversacional) |
| `publication.vacancyAi.ctaPending` | 1 | Revisar borrador pendiente | — | cuando hay proposal `proposed` en el ledger |
| `publication.vacancyAi.ctaDisabledTooltip` | 1 | La redacción con IA está desactivada en este ambiente. | — | flag OFF (locked state honesto) |
| `publication.vacancyAi.drawerTitle` | 2 | Borrador del aviso con IA | — | h5 del drawer |
| `publication.vacancyAi.drawerSubtitle` | 2 | La IA solo ve datos seguros: rol, skills y competencias. Nunca presupuesto ni notas internas. | — | promesa allowlist (confianza) |
| `publication.vacancyAi.templateLabel` | 2 | Plantilla de assessment (opcional) | — | |
| `publication.vacancyAi.templateHint` | 2 | Alinea el aviso con lo que el proceso realmente evalúa. | — | |
| `publication.vacancyAi.templatePlaceholder` | 2 | Sin plantilla | — | |
| `publication.vacancyAi.generate` | 2 | Generar borrador | — | CTA primaria del paso generate |
| `publication.vacancyAi.proposing` | 3 | Redactando el aviso… esto toma unos segundos. | — | `role="status"` |
| `publication.vacancyAi.background` | 3 | Seguir en segundo plano | — | cierra drawer; borrador quedará pendiente |
| `publication.vacancyAi.backgroundHint` | 3 | El borrador seguirá generándose y quedará pendiente de revisión. | — | |
| `publication.vacancyAi.reviewBanner` | 4 | Borrador generado por IA ({model}) · revísalo antes de aplicar. | `model` | Alert info `tabler-sparkles` (espejo 1363) |
| `publication.vacancyAi.fieldTitle` | 4 | Título del cargo | — | requerido |
| `publication.vacancyAi.fieldSummary` | 4 | Resumen | — | requerido |
| `publication.vacancyAi.fieldDescription` | 4 | Descripción y responsabilidades | — | requerido |
| `publication.vacancyAi.fieldRequirements` | 4 | Requisitos | — | |
| `publication.vacancyAi.fieldNiceToHave` | 4 | Deseables | — | |
| `publication.vacancyAi.fieldArea` | 4 | Área | — | |
| `publication.vacancyAi.fieldSeniority` | 4 | Seniority | — | |
| `publication.vacancyAi.fieldSkillTags` | 4 | Skills (tags) | — | freeSolo multiple |
| `publication.vacancyAi.fieldProcessNotes` | 4 | Notas del proceso | — | |
| `publication.vacancyAi.biasReminder` | 4 | Revisa que el aviso no tenga señales de género o edad ni requisitos que no sean del trabajo. | — | caption bajo el form |
| `publication.vacancyAi.apply` | 5 | Aplicar al aviso | — | confirm humano (write) |
| `publication.vacancyAi.discard` | 5 | Descartar borrador | — | abre confirmación de reject |
| `publication.vacancyAi.discardTitle` | 5 | ¿Descartar este borrador? | — | dialog |
| `publication.vacancyAi.discardBody` | 5 | El borrador se marcará como rechazado. Podrás generar otro cuando quieras. | — | |
| `publication.vacancyAi.applied` | 6 | Aviso actualizado con el borrador confirmado. | — | toast |
| `publication.vacancyAi.discarded` | 6 | Borrador descartado. | — | toast |
| `publication.vacancyAi.requiredHint` | 4 | Completa título, resumen y descripción para aplicar. | — | validación inline |
| `publication.vacancyAi.degraded` | 3/4 | No pudimos generar el borrador. Puedes reintentar o escribir el aviso manualmente. | — | provider not_configured/provider_error/schema_invalid |
| `publication.vacancyAi.retry` | 3/4 | Reintentar | — | |
| `publication.vacancyAi.openingSelector` | 0 | Vacante | — | label del selector nuevo |

(en-US mirror con las mismas keys; tono equivalente.)

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready (CTA visible) | Redactar con IA | — | abre drawer | flag ON + `hiring.opening.ai_assist` |
| locked (flag OFF) | Redactar con IA (disabled) | tooltip `ctaDisabledTooltip` | — | capability sí, flag no; si NO hay capability, el CTA no se renderiza |
| pending-proposal | Revisar borrador pendiente | — | abre drawer directo en review | dedupe del ledger; server-fetch al cargar la page |
| generate (drawer idle) | drawerTitle + drawerSubtitle | template picker | Generar borrador | |
| proposing | — | `proposing` | Seguir en segundo plano | `role='status'` + skeleton shape-of-form; el request sigue server-side |
| review | reviewBanner ({model}) | form prefilled editable | Aplicar al aviso / Descartar borrador | los 3 campos requeridos validan onBlur |
| confirming | — | spinner en botón (patrón desk) | — | drawer no cierra; Esc bloqueado |
| applied | — | toast `applied` | — | drawer cierra, diff refrescado, foco vuelve al CTA |
| discarded | — | toast `discarded` | — | CTA vuelve a "Redactar con IA" |
| degraded (provider) | — | `degraded` (Alert warning) | Reintentar / cerrar | honesto: la redacción manual sigue (no existe aún form manual — se comunica sin prometer) |
| error (confirm/API) | — | mensaje es-CL del contrato canónico (HiringClientError) | Reintentar; el form CONSERVA lo editado | forms-ux: nunca limpiar |
| denied (409 flag) | — | mensaje del backend `vacancy_ai_disabled` | cerrar | defensa si el flag se apagó tras cargar la page |

## Accessibility Contract

- Heading order: page h1 (frame) → drawer `h5` (`drawerTitle`) via `aria-labelledby`.
- Drawer: MUI `Drawer` modal (focus trap por defecto), `Esc` cierra en generate/review (NO en confirming), click-away cierra con la misma regla; foco inicial en el primer control del paso; al cerrar, foco restaurado al CTA que lo abrió.
- Progreso: contenedor `role="status" aria-live="polite"` anuncia `proposing`; al llegar el borrador anuncia `reviewBanner`.
- Form: labels visibles arriba (`CustomTextField`), requeridos marcados (`*` minoritario), errores inline `aria-invalid` + `aria-describedby` + `role="alert"`.
- Toast + Alert: los existentes del desk; el resultado del confirm también se anuncia (Snackbar es aria-live por defecto).
- CTA disabled (locked): el tooltip es accesible (`aria-describedby` vía Tooltip en un wrapper `span`).
- Color-independiente: estados con ícono + texto (sparkles + label), nunca solo color.
- Targets ≥24px; `scrollWidth==clientWidth` en 1440 y 390 (drawer fullWidth mobile).

## Implementation Mapping

- Route / surface: `/agency/hiring/publication` (page existente `src/app/(dashboard)/agency/hiring/publication/page.tsx`) + `PublicationDeskView`.
- Primitives: `GreenhouseButton` (kinds existentes), `GreenhouseChip`, MUI `Drawer`+`Dialog`+`Snackbar`+`Alert`+`Skeleton`+`LinearProgress`, `CustomTextField`, `CustomAutocomplete`, `CustomChip`.
- Variants / kinds: `GreenhouseButton kind='secondaryAction'` (CTA en el diff) / `kind='primaryAction'` (Generar/Aplicar); sin kinds nuevos.
- Component candidates: nuevo client component `VacancyAiDraftDrawer` en `src/views/greenhouse/hiring/` (route-local, no primitive del registry — one-off del desk, igual tokenizado).
- Copy source: `getMicrocopy(locale).hiringDesk.publication.vacancyAi` (dictionaries es-CL + en-US + type `HiringDeskCopy`).
- Data reader / command: page server → `isHiringVacancyAiEnabled()` + `can(tenant,'hiring.opening.ai_assist','execute','tenant')` + `can(tenant,'hiring.opening.write','update','tenant')` + `listAiProposals({kind:'opening_public_copy',status:'proposed'})` (pendings por targetRef). Cliente → `hiringRequest` a `POST /api/hiring/openings/[id]/ai/propose-public-copy`, `POST /api/hiring/assessments/ai/proposals/[id]/confirm` (`publicCopyOverride`), `GET /api/hiring/openings/[id]` (refetch), `GET /api/hiring/assessments/templates` (picker).
- API parity: NINGÚN endpoint nuevo — la UI es cliente delgado del contrato de TASK-1385 (Full API Parity ya satisfecha).
- Access / capability: viewCode `gestion.hiring_publication` (existente); CTA gated por capability en server props; el backend re-enforza (403/409).
- Runtime consumers: reclutador interno; Nexa opera el mismo contrato por parity (sin UI Nexa acá).
- Print/email/PDF considerations: n/a.
- GVC markers: `data-capture='hiring-vacancy-ai-cta'` (columna pública), `data-capture='hiring-vacancy-ai-drawer'` (drawer), reuso de `hiring-publication-diff`.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/task1422-vacancy-ai-draft.yaml` (nuevo).
- Route: `/agency/hiring/publication` (env local con `HIRING_VACANCY_AI_ENABLED=true` y una proposal `proposed` sembrada para el paso review determinista — sin llamar al LLM en captura).
- Viewports: desktop 1440×900 + mobile 390×844.
- Required steps: capturar base con CTA → click CTA → drawer review (proposal sembrada) → editar un campo → abrir dialog de descartar → cerrar → captura mobile del drawer.
- Required captures: `base-diff-with-cta`, `drawer-review`, `drawer-discard-dialog`, `mobile-drawer`.
- Required `data-capture` markers: `hiring-vacancy-ai-cta`, `hiring-vacancy-ai-drawer`, `hiring-publication-diff`.
- Assertions: CTA visible con flag ON; drawer abre con form prefilled; sin console errors; `scrollWidth==clientWidth` en ambos viewports.
- Scroll-width checks: página base y drawer abierto (desktop + 390px).
- Accessibility/focus checks: foco entra al drawer al abrir; Esc cierra; foco restaurado al CTA (frames del ciclo).
- Reduced-motion evidence: captura con `prefers-reduced-motion: reduce` (drawer sin animación — guard existente del frame).

## Design Decision Log

- Decision: drawer lateral route-local en el Publication Desk (no página nueva, no modal, no rediseño del diff).
- Alternatives considered: (a) editar inline la columna pública del diff — descartado: mezcla lectura de gobernanza con edición y rompe la claridad del diff anti-leak; (b) página dedicada `/publication/[id]/draft` — descartado: sobre-navegación para una tarea de 1 minuto, y el desk ya usa drawers para creación (Nueva demanda); (c) modal — descartado: el form es largo (9 campos), drawer escrolleable es el patrón del desk.
- Why this pattern: espejo exacto del drawer "Nueva demanda" (mismo anchor, mismas keyframes `ghHiringDrawer`, mismo dialog de descarte) + lenguaje IA ya canonizado en 1363 (Alert `tabler-sparkles` "la IA sugiere, tú confirmas"). Cero vocabulario visual nuevo que aprender.
- Reuse / extend / new primitive: **reuse total**; `VacancyAiDraftDrawer` es composición route-local (no entra al registry de primitives; no es reutilizable fuera del desk).
- NO-Nexa: esta IA es de dominio hiring (frontera 1361) — sin `GreenhouseNexaBrandMark` ni navy; sparkles neutral como 1363.
- Open risks: latencia del propose (10–30 s) — mitigada con progreso honesto + "Seguir en segundo plano" (el ledger persiste y el CTA pendiente lo recupera); flag OFF tras cargar la page — el 409 del backend se muestra honesto en el drawer.
- Follow-up: edición manual del copy público sin IA (form directo al PATCH) — fuera de alcance; Nexa actionKey (follow-up 1385).

## Acceptance Checklist

- [x] All visible strings are in the copy ledger.
- [x] Dynamic values are named and bounded (`model`).
- [x] Partial/degraded states are explicit (provider degrade + flag OFF + pending).
- [x] No copy implies a guarantee when data is estimated (borrador SIEMPRE se llama borrador).
- [x] Charts have table/text alternatives (n/a — sin charts).
- [x] State and aria copy is ready for implementation.
- [x] Implementation mapping names primitive, copy source, data contract and route/surface.
- [x] GVC scenario plan is specific enough for `pnpm fe:capture` or a new scenario file.
- [x] Design decision log explains reuse/extend/new before JSX starts.
