# TASK-355 — Hiring Desk Internal Workspaces & Publication Governance

## Delta 2026-07-08 (revisión 3-lentes: arquitectura + product-design + talent)

Migrada a formato nuevo + gaps cerrados (arch-architect + overlay §17, greenhouse-ux/state-design/forms-ux/a11y-architect, greenhouse-talent-people-operator):

- **Routing (corregido):** `[lang]` NO existe en `(dashboard)` (el i18n es cookie/header vía next-intl, no por URL). → **`src/app/(dashboard)/agency/hiring/**`** (sin `[lang]`). El desk es **bilingüe (es-CL + en-US)** vía `getLocale()` + `getMicrocopy(locale)` — no "copy en español" solamente.
- **Composition Shell obligatorio:** la shell del Hiring Desk usa el primitive `CompositionShell` (`src/components/greenhouse/primitives/composition-shell/`), NO un shell hand-rolled (CLAUDE.md: Composition Shell = base por defecto). Cards = `density=auto` + rich-ready (Adaptive Card / The Seam).
- **Kanban canónico:** reusar `RoadmapBoard` + `GreenhouseDragList` del repo, NO copiar el demo de Vuexy full-version. ⚠️ **`GreenhouseDragList` NO tiene soporte de teclado** → el board necesita una **alternativa por teclado** para mover cards entre etapas (WCAG 2.5.7 no drag-only) + **optimistic move con rollback** (state-design).
- **decide endpoint = write path gobernado:** `decideHiringApplication` (nuevo; `updateHiringApplicationStage` ya existe en 353) con **state-machine** (¿re-decidir? supersede append-only) + idempotencia + audit/outbox + `canonicalErrorResponse` + **reason estructurado** (defendible/contestable, AI-Act: un candidato puede ser informado, un reclutador puede override la sugerencia IA).
- **Application 360 = hub:** embebe el scorecard por competencia (TASK-1360, advisory, nunca auto-rechaza) + la cola de corrección de respuestas abiertas con la sugerencia IA→confirmar (TASK-1361/1363) + docs del candidato (TASK-1362, masked/reveal + capability + reason + audit). Respeta el anti-anclaje (independent-before-debrief).
- **Master flow:** esta task = nodos **N4 (bandeja), N5 (ficha 360), N6 (asignar test), N8 (review scorecard), N9 (decisión)** del `docs/ui/flows/EPIC-011-hiring-ats-UI-FLOW.md`.
- **Scalability:** Demand Desk table + Pipeline Board con paginación/filtro server-side; el kanban NO carga todas las applications unbounded.

## Delta 2026-07-08

- **El Application 360 ahora hospeda el Assessment.** El motor de assessment por competencias (TASK-1360) + su superficie de review (TASK-1363) se **embeben en el Application 360** de esta task: el **scorecard por competencia** (advisory, nunca auto-rechaza) + la **cola de corrección de respuestas abiertas** aparecen como un tab/bloque del 360. La "evaluations" genérica del Slice 2 se concreta en eso. `Out of Scope` "IA evaluativa" se refina: la IA existe (TASK-1361) pero **propone, un humano confirma** — 355 muestra la sugerencia + botón confirmar, no la construye. Dependencia bidireccional real con TASK-1363.
- **Documentos del candidato:** el 360 muestra CV/portafolio/identidad vía el **resolver de TASK-1362** (assets privados + `person_identity_documents` masked/reveal), no lógica propia. La identidad es masked por default; revelar exige capability `person.legal_profile.reveal_sensitive` + razón + audit.
- **Endpoint de decisión (`hiring.application.decide`):** lo construye esta task (la capability ya está seedeada/grantada por 353) — setea `decision` + snapshot de handoff en `hiring_application` (los campos existen). Alimenta a TASK-356 (handoff).

## Delta 2026-07-07

- **Desbloqueada:** `TASK-353` (foundation) completa. Readers/commands + 8 capabilities + API `/api/hiring/**` ya existen (consumí esos, no lógica paralela).
- **Views: te toca a vos.** TASK-353 NO seedeó los viewCodes del desk (`agency.hiring`, `agency.hiring.demand`, `agency.hiring.pipeline`, `agency.hiring.publication`, `agency.hiring.application_detail`) a propósito — seedear un viewCode sin ruta alcanzable viola la governance de reachability + dispara `role_view_fallback`. Vos creás las rutas reales `(dashboard)` **y** el seed `VIEW_REGISTRY` TS + migración `view_registry`/`role_view_assignments` en el mismo PR (patrón TASK-827), + `route-reachability-manifest` (TASK-982).
- El kanban mueve `HiringApplication` (unidad del pipeline) vía `updateHiringApplicationStage`. Publication Desk usa `buildPublicOpeningPayload` para el diff interno↔público.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-355-hiring-desk.md`
- Flow: `docs/ui/flows/TASK-355-hiring-desk-flow.md`
- Motion: `docs/ui/motion/TASK-355-hiring-desk-motion.md`
- Backend impact: `migration`
- Epic: `EPIC-011`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency`
- Blocked by: `TASK-353`
- Branch: `task/TASK-355-hiring-desk-internal-workspaces-publication-governance`
- Legacy ID: `follow-on de GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1`
- GitHub Issue: `none`

## Summary

Los workspaces internos de `Hiring / ATS` bajo una shell común (`CompositionShell`): **Demand Desk** (demandas/openings), **Pipeline Board** (kanban de `HiringApplication`), **Application 360** (ficha del candidato con assessment + docs + decisión embebidos) y **Publication Desk** (gobernanza de qué se publica). Cliente de los readers/commands de TASK-353; construye el endpoint de decisión y seedea los viewCodes del módulo.

## Why This Task Exists

TASK-353 dejó foundation + API + capabilities y TASK-354/1367 la puerta pública, pero **no existe ninguna surface interna** donde un reclutador opere el dominio: publicar una vacante, ver postulantes, moverlos por el pipeline, asignar el test, revisar el scorecard y decidir. Sin 355 el ATS no es operable por un humano interno. Es el "control room" del programa (contraparte de la careers pública 354).

## Goal

- Materializar los 4 workspaces internos bajo una shell común con rutas hermanas + deep links.
- Reutilizar los patrones canónicos (`CompositionShell`, `RoadmapBoard`/`GreenhouseDragList`, `StaffAugmentationListView`/`PlacementDetailView`) — no copiar demos.
- Construir el endpoint de decisión gobernado + seedear los viewCodes (reachability + entitlements en el mismo PR).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/ui/flows/EPIC-011-hiring-ats-UI-FLOW.md` (master flow — 355 = N4/N5/N6/N8/N9)
- `docs/ui/wireframes/TASK-355-hiring-desk.md` + `docs/ui/flows/TASK-355-hiring-desk-flow.md` + `docs/ui/motion/TASK-355-hiring-desk-motion.md` (contrato de diseño)
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` + `GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` (views vs capabilities; view registry governance TASK-827)
- `docs/architecture/ui-platform/` (Composition Shell, Adaptive Card / The Seam, PRIMITIVES, PATTERNS)
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `src/lib/navigation/route-reachability-manifest.ts` (TASK-982)

Reglas obligatorias:

- **Ruta `src/app/(dashboard)/agency/hiring/**`** (NUNCA `[lang]`). Shell común vía `CompositionShell`; rutas hermanas Demand/Pipeline/Publication + `[applicationId]` con deep links.
- **Bilingüe** (es-CL + en-US) vía `getLocale()` + `getMicrocopy(locale)`; copy en dictionaries por-locale `src/lib/copy/dictionaries/{es-CL,en-US}/hiringDesk.ts` (namespace nuevo).
- El kanban mueve `HiringApplication` vía `updateHiringApplicationStage` (353); **alternativa por teclado** obligatoria + optimistic move con rollback.
- **viewCode ⇒ migration seed en el MISMO PR** (`VIEW_REGISTRY` TS + `view_registry`/`role_view_assignments` + `route-reachability-manifest`); NUNCA seedear un viewCode sin ruta alcanzable.
- El decide es un **write gobernado** (`decideHiringApplication`): capability `hiring.application.decide` (ya grantada) + idempotencia + audit/outbox + `canonicalErrorResponse` es-CL + reason estructurado. Consumido por UI + Nexa (Full API Parity).
- **Defense-in-depth PII:** identidad/CV masked por default; revelar = capability `person.legal_profile.reveal_sensitive` + reason + audit (resolver de 1362). El desk no muestra PII a lectura agregada sin capability.
- **Publication Desk** controla la proyección pública derivada (`buildPublicOpeningPayload`), no lógica paralela al opening; muestra el diff interno↔público antes de publicar.
- Readers del 360 anti silent-catch (UI_FEATURE invariants): un facet que falla degrada honesto, no `.catch(()=>[])`.

## Normative Docs

- `docs/tasks/to-do/TASK-1363-assessment-taking-review-surface.md` (dependencia bidireccional — el review se embebe en el 360)
- `docs/tasks/to-do/TASK-1362-candidate-document-capture.md` (resolver de docs)
- `docs/tasks/to-do/TASK-356-hiring-handoff-reactive-signals-downstream-bridges.md` (consume la decisión)
- `project_context.md`, `Handoff.md`, `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-353` (readers/commands `src/lib/hiring/**`, `updateHiringApplicationStage`, `buildPublicOpeningPayload`, 8 capabilities, campos de decisión/handoff en `hiring_application`)
- `CompositionShell` + `RoadmapBoard`/`GreenhouseDragList` (primitives) `[verificar keyboard support de DragList — hoy falta]`
- `StaffAugmentationListView.tsx` / `PlacementDetailView.tsx` / `PeopleList.tsx` / `PersonView.tsx` (patrones de list + detail shell)
- Entitlements + view registry governance (TASK-827) + route reachability (TASK-982)
- Product-design skills (info-architecture lead + state-design + forms-ux + a11y-architect + greenhouse-ux-writing + modern-ui + dataviz-design)

### Blocks / Impacts

- Operación diaria del dominio `Hiring / ATS`; consume la assessment surface (1363) + doc resolver (1362); alimenta el handoff (356).

### Files owned

- `src/app/(dashboard)/agency/hiring/**` (rutas internas — NUNCA `[lang]`)
- `src/views/greenhouse/agency/hiring/**`
- `src/components/greenhouse/hiring/**`
- `src/lib/copy/dictionaries/{es-CL,en-US}/hiringDesk.ts` (copy bilingüe)
- `src/lib/hiring/decide.ts` (`decideHiringApplication` command) + `src/app/api/hiring/applications/[id]/decide/route.ts`
- `src/config/entitlements-catalog.ts` / `VIEW_REGISTRY` TS + `migrations/<ts>_task-355-hiring-desk-viewcodes-seed.sql` (view_registry + role_view_assignments)
- `src/lib/navigation/route-reachability-manifest.ts` (declarar las rutas)
- (consume, NO owns) readers/commands de 353; el embed de 1363/1362

## Current Repo State

### Already exists

- Foundation 353: readers/commands + `updateHiringApplicationStage` (store.ts:1122) + campos de decisión/handoff en `hiring_application`.
- Primitives: `CompositionShell`, `RoadmapBoard`, `GreenhouseDragList` (⚠️ sin teclado), Adaptive Card / The Seam.
- Patrones de desk: `StaffAugmentationListView` + `PlacementDetailView` (list + detail shell), `PeopleList`/`PersonView`.
- View registry governance (TASK-827) + route reachability (TASK-982).

### Gap

- No existe ninguna surface interna de Hiring (Demand/Pipeline/360/Publication).
- No existe `decideHiringApplication` ni su endpoint.
- No están seedeados los viewCodes `agency.hiring.*` ni sus rutas.
- `GreenhouseDragList` no tiene alternativa por teclado.

## UI/UX Contract

### Experience brief

- **Rigor:** `ui-platform` (shell + kanban + 360 con embeds + publication desk; reusa/extiende primitives). GVC + docs UI platform + lab donde aplique.
- Un reclutador/hiring manager opera el pipeline de punta a punta: publica una vacante, ve postulantes, los mueve por etapas, asigna el test, revisa el scorecard (IA sugiere → él confirma) y decide con un reason defendible. Bilingüe (es-CL + en-US). Fairness: decisión estructurada, contestable, nunca auto-rechazo.

### Surface & system decision

- 1 shell `Hiring Desk` (`CompositionShell`) con regiones + 4 surfaces hermanas: **Demand Desk** (tabla), **Pipeline Board** (kanban), **Application 360** (detail shell con tabs), **Publication Desk** (diff+acciones). Primitive lookup: Greenhouse primitive → Vuexy `Custom*` → MUI. Cards `density=auto` (Adaptive Card).
- Kanban = `RoadmapBoard`/`GreenhouseDragList` extendido con teclado. 360 = patrón `PlacementDetailView` (sidebar + tabs) adaptado.

### State inventory

12-state matrix por surface. Clave: Demand/Pipeline (loading/loaded/empty/empty-filtered/error/degradado); kanban (columna vacía, drag-active, optimistic-moving, rollback-on-fail); 360 (tabs con loading/empty/degradado honesto por facet; assessment: pending-human-rating / AI-suggested→confirm / scored; docs: masked / revealed); Publication (diff / sin-cambios / publish-confirm). Detalle en el wireframe.

### Interaction contract

- Demand Desk: tabla filtrable server-side + drilldown. Pipeline: drag OR teclado para mover etapa (optimistic + rollback). 360: tabs (Overview/Assessment/Documentos/Decisión/Actividad); asignar test (dialog); confirmar sugerencia IA (botón, nunca auto). Publication: revisar diff → publish/pause/close (dialog de confirmación consecuente). Decisión: form (destino/fecha/entidad/reason estructurado) + confirmación. Detalle en el flow.

### Motion & microinteractions

- Kanban drag + optimistic move/rollback + tab transitions → motion no-trivial → doc de motion dedicado (`docs/ui/motion/TASK-355-hiring-desk-motion.md`). Todo `prefers-reduced-motion`-aware; el drag tiene equivalente sin motion (teclado).

### Implementation mapping

Ver wireframe §Implementation Mapping: shell=`CompositionShell`; Demand=tabla (patrón StaffAug) + readers de openings/demands; Pipeline=`RoadmapBoard`+`GreenhouseDragList`+`updateHiringApplicationStage`; 360=detail shell + embeds 1363/1362 + `decideHiringApplication`; Publication=`buildPublicOpeningPayload` diff + `publishOpening`/`unpublishOpening`. Copy `getMicrocopy(locale).hiringDesk`. Tokens AXIS.

### GVC scenario plan

- `hiring-demand-desk`, `hiring-pipeline-board` (incl. drag + teclado + optimistic/rollback + columna vacía), `hiring-application-360` (tabs + assessment embed + docs masked/reveal + decisión), `hiring-publication-desk` (diff + publish). GVC desktop 1440 + mobile 390; `scrollWidth==clientWidth`; consola limpia; a11y (kanban teclado). Datos reales sembrados vía 353/1367.

### Design decision log

- Composition Shell base; kanban canónico con teclado; 360 hub con embeds; decisión estructurada/contestable; publication diff; bilingüe. Detalle en wireframe + flow.

### Visual verification

- `pnpm fe:capture` en loop hasta enterprise; `pnpm ui:wireframe-check/flow-check/motion-check --task TASK-355`; 2 gates Figma si toca token/primitive; lab interno + `DesignSystemCatalogView` si nace una primitive.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard` (decide = write que afecta decisión de contratación + view registry governance)
- Impacto principal: `migration` (view_registry seed) + `api` (decide endpoint)
- Source of truth: `hiring_application` (decisión + handoff snapshot; campos existen) + `greenhouse_core.view_registry`/`role_view_assignments`
- Consumidores: UI desk, Nexa (parity), TASK-356 (handoff consume la decisión)
- Runtime target: local → staging → production

### Contract surface

- Existente: readers/commands 353, `updateHiringApplicationStage`, `buildPublicOpeningPayload`, publish/unpublish, capabilities
- Nuevo: `decideHiringApplication(input)` + `POST /api/hiring/applications/[id]/decide`; viewCodes `agency.hiring.*`
- Backward compat: `additive` (endpoint nuevo + seed; sin romper 353)
- Full API parity: la decisión es un command gobernado (UI + Nexa lo operan igual, propose→confirm para Nexa)

### Data model and invariants

- `hiring_application.decision`/`decision_at`/`decision_by`/`selected_destination`/`tentative_start_date`/`expected_legal_entity`/`expected_context`/`prerequisites_snapshot_json` (existen). Reason estructurado: `[verificar]` si hay columna o se usa `explainability_json`/nueva columna additive.
- Invariantes: decisión NUNCA auto (siempre humano); state-machine de decisión (¿re-decidir? supersede/append audit); el scorecard es advisory, no gate; PII masked/reveal con capability+reason+audit.
- Idempotency/concurrency: decide idempotente por `application_id` + estado; audit/outbox en la misma tx.
- Audit/outbox: evento `hiring.application.decided` `[verificar en EVENT_CATALOG]`.

### Migration, backfill and rollout

- Additive: view_registry seed (mismo PR que el TS) + posible columna de reason. Default: viewCodes sembrados solo a roles internos reales (NUNCA `client_*`). Backfill: none. Rollback: reverse migration + revert PR; viewCodes → `role_view_fallback` si se quita. External: none.

### Security and access

- Capabilities: `hiring.demand.read/write`, `hiring.opening.read/write/publish`, `hiring.application.read/write/decide` (todas de 353, grantadas). viewCodes gateados por routeGroup `internal` + roles internos. PII: masked/reveal + audit.
- Error contract: `canonicalErrorResponse` es-CL + `captureWithDomain('hiring')`.

### Runtime evidence

- Live: sembrar demand→opening→publish→application (353/1367) → operar el desk end-to-end; decide → verificar `hiring_application.decision` + audit/outbox; viewCodes → `role_view_fallback=0`.

### Acceptance criteria additions

- [ ] Source of truth + contract surface (decide command/endpoint + viewCodes) + consumers nombrados.
- [ ] Invariantes (decisión humana/estructurada, scorecard advisory, PII masked/reveal, view seed mismo PR) con test.
- [ ] Migration additive + rollback; viewCodes con ruta alcanzable (reachability gate verde).

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica en `src/lib/hiring/**` (decide command + readers), no en la UI.
- [ ] `decideHiringApplication` = command gobernado (idempotencia + audit/outbox + errores canónicos + reason).
- [ ] Capabilities de 353 reusadas; viewCodes seedeados + coverage/reachability mismo PR.
- [ ] Camino programático: `/api/hiring/**`; Nexa opera el decide vía propose→confirm por construcción.
- [ ] Un command, muchos consumers (UI + Nexa) sin lógica duplicada.

## Hybrid Execution Justification

Esta task es `ui-ux` con `Backend impact: migration` (híbrida) — deliberado, no un split faltante.

- **Why not split:** el backend de esta task es (a) el **seed de `view_registry`/`role_view_assignments`** de los viewCodes `agency.hiring.*` y (b) el command `decideHiringApplication` + endpoint. El (a) es **irreduciblemente route-coupled**: la gobernanza TASK-827/982 exige que un viewCode se seedee **en el mismo PR que su ruta alcanzable** (seedear un viewCode sin ruta dispara `role_view_fallback` + viola reachability). No se puede mover a una task backend-data separada sin romper esa regla. El (b) es un command **pequeño y additive** sobre campos que YA existen en `hiring_application` (decisión/handoff snapshot de 353) — sin schema riesgoso; su único consumer real es el Application 360 de esta misma task.
- **Primary execution profile:** `ui-ux` (4 surfaces + shell). El backend es el mínimo acoplado (view seed + un command).
- **Contract boundary:** la lógica del decide vive en `src/lib/hiring/decide.ts` (command gobernado, no en la UI); la UI es cliente. El view seed vive en su migración + `VIEW_REGISTRY` TS. Reusa readers/commands de 353; no duplica foundation.
- **Risk controls:** decide capability-gated + idempotente + audit/outbox + reverse migration; view seed reversible (reverse migration → `role_view_fallback`); ambos additive. La migración es solo seed (no DDL destructivo).
- **Internal slice order (explícito):** Slice 1 seedea los viewCodes **con** la shell+ruta (mismo commit); Slice 3 construye el decide command **con** el Application 360 que lo consume. El backend nunca se mergea sin su surface consumidora.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Shell + Demand Desk (N4 parcial) + view registry

- Shell `Hiring Desk` (`CompositionShell`) con navegación a Demand/Pipeline/Publication + `[applicationId]`.
- Demand Desk: tabla filtrable server-side de demandas/openings + KPIs + drilldown. Patrón `StaffAugmentationListView`.
- Seed viewCodes `agency.hiring.*` (TS + migration `view_registry`/`role_view_assignments`) + `route-reachability-manifest` — mismo PR.
- Capabilities `hiring.demand.read/write`, `hiring.opening.read/write`. Copy `getMicrocopy(locale).hiringDesk`.

### Slice 2 — Pipeline Board (N4/N6)

- Kanban de `HiringApplication` (`RoadmapBoard`/`GreenhouseDragList` extendido) con columnas = etapas canónicas; mover etapa vía `updateHiringApplicationStage`.
- **Alternativa por teclado** (menú "mover a etapa" por card) + **optimistic move con rollback** (state-design). Paginación/límite server-side. Columna vacía honesta.

### Slice 3 — Application 360 (N5/N8) + decide command (N9)

- Detail shell (patrón `PlacementDetailView`) con tabs Overview / **Assessment** (embed 1363: scorecard + cola de corrección + sugerencia IA→confirmar) / **Documentos** (embed 1362, masked/reveal) / **Decisión** / Actividad.
- `decideHiringApplication` command + `POST /api/hiring/applications/[id]/decide` (capability decide + idempotencia + audit/outbox + reason estructurado + state-machine). Form de decisión (destino/fecha/entidad/reason) con confirmación.
- Readers del 360 anti silent-catch (degradación honesta por facet).

### Slice 4 — Publication Desk (N-publish)

- Surface de gobernanza: revisar qué openings se publican; **diff interno↔público** (`buildPublicOpeningPayload`); acciones publish/pause/close (dialog de confirmación consecuente + capability `hiring.opening.publish`).
- Al publicar/despublicar, disparar `revalidatePath('/public/careers')` (coordina con la careers 354 — el read público cacheado se refresca on-demand).

### Slice 5 — GVC + a11y + docs

- GVC de las 4 surfaces desktop+mobile; a11y del kanban (teclado) verificada; `scrollWidth==clientWidth`. Registrar patrones nuevos en `ui-platform/PATTERNS.md` + `DesignSystemCatalogView` si nace primitive.

## Out of Scope

- Careers pública (TASK-354) + apply intake (TASK-1367).
- Construcción del motor de assessment (1360) / su UI de rendición (1363) / doc capture (1362) — 355 los **embebe/consume**, no los construye.
- Handoff downstream + activación HRIS (TASK-356/770).
- Búsqueda global de talento (Talent Pool) — follow-up.
- Scoring automático / IA que decide — prohibido (IA propone, humano confirma).

## Detailed Spec

Implementar DESDE el wireframe + flow + master flow. Reusar primitives canónicos (Composition Shell, RoadmapBoard/GreenhouseDragList, detail shell de StaffAug/People), NUNCA copiar demos de full-version ni usar semantics `task`/`deal`. El decide es el único write nuevo (gobernado). Los viewCodes se seedean con ruta alcanzable en el mismo PR. Copy bilingüe vía dictionaries.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (shell+demand+viewcodes) → 2 (pipeline) → 3 (360+decide) → 4 (publication) → 5 (GVC/a11y). El viewCode seed va con la ruta en el MISMO commit (reachability). El decide (Slice 3) es el write nuevo.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| viewCode seedeado sin ruta alcanzable | governance | medium | seed + ruta + reachability mismo PR (TASK-827/982) | `role_view_fallback_used` |
| Kanban drag-only (a11y) | a11y | high | alternativa por teclado + axe; optimistic con rollback | axe/GVC teclado |
| `[lang]` en ruta interna | architecture | low | `src/app/(dashboard)/agency/hiring/**`; overlay §17 | — |
| PII expuesta a lectura agregada | privacy | medium | masked/reveal + capability + audit (1362); no PII sin capability | revisión + audit reveal |
| Decisión no defendible (sin reason) | fairness/legal | medium | reason estructurado obligatorio + advisory scorecard + humano decide | decisiones sin reason |
| Pipeline carga todo unbounded | scalability | medium | paginación/límite server-side | latencia/carga con muchos applicants |
| Publicación filtra datos sensibles | privacy | medium | diff interno↔público + allowlist; confirmación | diff review |

### Feature flags / cutover

- Sin flag propio; additive (rutas + endpoint + seed). Los viewCodes se sembran solo a roles internos. Revert por PR + reverse migration.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR + reverse migration (viewCodes) | <15 min | si |
| Slice 2-5 | revert PR (rutas/vistas/endpoint additive) | <15 min | si |

### Production verification sequence

1. Deploy staging + sembrar demand→opening→publish→application (353/1367).
2. Operar el desk end-to-end: Demand → Pipeline (drag + teclado) → 360 (assessment + docs + decide) → Publication (diff + publish).
3. Verificar: `hiring_application.decision` + audit/outbox; `role_view_fallback=0`; a11y kanban teclado; `revalidatePath` refresca la careers.
4. Repetir en prod vía release pipeline.

### Out-of-band coordination required

- Coordinar con TASK-1363 (embed del review) + TASK-1362 (doc resolver) — dependencia bidireccional; y con TASK-354 (revalidatePath on-publish).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Shell `Hiring Desk` vía `CompositionShell` con rutas hermanas `(dashboard)/agency/hiring/**` (NUNCA `[lang]`) + deep links; bilingüe (es-CL + en-US) vía `getMicrocopy(locale)`.
- [ ] Demand Desk (tabla server-side), Pipeline Board (kanban `RoadmapBoard`, cada card = `HiringApplication`, mueve etapa vía `updateHiringApplicationStage`), Application 360 (tabs con assessment 1363 + docs 1362 + decisión), Publication Desk (diff + publish) — conectados al runtime real.
- [ ] **Kanban con alternativa por teclado** (mover etapa sin drag) + optimistic move con rollback.
- [ ] `decideHiringApplication` + endpoint: humano decide (nunca auto), **reason estructurado**, idempotencia + audit/outbox + error canónico es-CL; scorecard advisory (no gate).
- [ ] viewCodes `agency.hiring.*` seedeados con ruta alcanzable en el MISMO PR (reachability gate + `role_view_fallback=0`).
- [ ] PII masked/reveal (capability + reason + audit); Publication Desk solo payload allowlist + confirmación; publish dispara `revalidatePath` de la careers.
- [ ] Readers del 360 anti silent-catch (degradación honesta por facet).
- [ ] GVC desktop+mobile mirado; `scrollWidth==clientWidth`; a11y kanban (teclado) OK; consola limpia.
- [ ] `UI ready: yes` solo con lo anterior + `pnpm task:lint --task TASK-355` sin findings.

## Verification

- `pnpm ui:wireframe-check --task TASK-355` + `pnpm ui:flow-check --task TASK-355` + `pnpm ui:motion-check --task TASK-355`
- `pnpm local:check:ui` + `pnpm fe:capture` (GVC desktop+mobile, frames mirados)
- `pnpm test` + `pnpm build` + `pnpm typecheck` + `pnpm pg:doctor`
- Live: operar el desk end-to-end contra staging (decide + reachability + revalidate)
- `pnpm task:lint --task TASK-355`

## Closing Protocol

- [ ] `Lifecycle` sincronizado + carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` (qué patterns/primitives se adoptaron/descartaron)
- [ ] `## Delta` en el master flow si cambia un nodo/regla
- [ ] `EVENT_CATALOG` delta si se agrega `hiring.application.decided`
- [ ] arch delta + view registry governance; doc funcional + manual del desk
- [ ] `ui-platform/PATTERNS.md` + `DesignSystemCatalogView` si nace primitive

## Follow-ups

- Talent Pool como surface separada (búsqueda global de talento).
- hiring-aware summaries dentro de `People`/`Agency`.
- Soporte de teclado nativo en `GreenhouseDragList` (si se generaliza el kanban).

## Resolved Open Questions

- V1 usa una shell común `Hiring Desk` (`CompositionShell`) con rutas hermanas/deep links. Preserva navegación compartida, URLs compartibles y crecimiento futuro.
- `Talent Pool` fuera de V1 (el board/360 muestran applications existentes, no búsqueda global).

## Open Questions

- ¿El reason estructurado de la decisión es columna additive nueva o `explainability_json`? Resolver en Discovery contra el schema real (`[verificar]`).
- ¿`hiring.application.decided` ya está en `EVENT_CATALOG` o se agrega? Verificar.
- ¿`GreenhouseDragList` recibe soporte de teclado acá (scoped) o se generaliza el primitive? Preferir scoped V1 + follow-up de generalización.
