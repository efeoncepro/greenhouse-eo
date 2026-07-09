# TASK-355 — Hiring Desk Flow Contract

## Meta

- Task: `TASK-355`
- Master flow: `docs/ui/flows/EPIC-011-hiring-ats-UI-FLOW.md` — 355 = **N4 (bandeja/pipeline) · N5 (ficha 360) · N6 (asignar test) · N8 (review scorecard) · N9 (decisión)** + N-publish.
- Wireframe: `docs/ui/wireframes/TASK-355-hiring-desk.md` · Motion: `docs/ui/motion/TASK-355-hiring-desk-motion.md`
- Ruta: `src/app/(dashboard)/agency/hiring/**` (NO `[lang]`); interno (con sesión, route group `internal`); bilingüe.
- Estado: `approved` (UI ready: yes — flujo contrastado con el HTML interactivo aprobado el 2026-07-09)

## Flow Brief

El reclutador opera el pipeline de punta a punta bajo la shell `Hiring Desk`: publica una vacante (Publication) → ve postulantes (Pipeline) → abre la ficha (360) → asigna el test → revisa el scorecard (IA sugiere, él confirma) → decide con reason → alimenta el handoff (356). Es el control room interno; contraparte del funnel público (354).

## Surfaces Involved

| Surface | Ruta | Nodo |
|---|---|---|
| Demand Desk | `/agency/hiring` | N4 |
| Pipeline Board | `/agency/hiring/pipeline` | N4/N6 |
| Application 360 | `/agency/hiring/[applicationId]` | N5/N8/N9 |
| Publication Desk | `/agency/hiring/publication` | N-publish |

## Flow Map

```
Publication Desk ──publish──▶ opening público (revalidatePath careers 354)
        │                                    │
        ▼                                    ▼ (candidato postula por 354/1367)
Demand Desk (N4) ──drilldown──▶ Pipeline Board (N4) ──mover etapa (drag|teclado)──▶ updateHiringApplicationStage
        │                              │  (optimistic + rollback)
        │                              └──click card──▶ Application 360 (N5)
        │                                                    │
        │                        ┌───────────────────────────┼──────────────────────┐
        │                        ▼                           ▼                      ▼
        │                  asignar test (N6)          review scorecard (N8)    decidir (N9)
        │                  → assignCandidateTest       IA sugiere→confirmar     decideHiringApplication
        │                    (1360)                    (1361/1363 embed)        + reason → handoff (356)
        ▼
      KPIs / estado
```

## Interaction Triggers

- **Drilldown Demand→Pipeline/360/Publication** (N4): click en fila.
- **Mover etapa** (N4/N6): drag OR **menú "Mover a etapa" (teclado)** → `updateHiringApplicationStage` optimista (rollback si falla). Anuncia el resultado (`aria-live`).
- **Abrir 360** (N5): click card.
- **Asignar test** (N6): dialog → `assignCandidateTest` (1360); genera el link tokenizado.
- **Revisar scorecard** (N8): tab Assessment; la IA muestra sugerencia → **confirmar/editar** (nunca auto; anti-anclaje independent-before-debrief).
- **Decidir** (N9): form (avanzar/rechazar/hold + destino/fecha/entidad + **reason estructurado obligatorio**) → confirmación → `decideHiringApplication`.
- **Publicar** (N-publish): revisar diff → publish/pause/close (dialog consecuente) → `revalidatePath('/public/careers')`.
- **Revelar PII**: reveal exige motivo → capability + audit.

## State Machine

```
pipeline card: stage (canónicas) — mover: current → target (optimistic) → (confirmed | rolled_back)
application decision: undecided → decided(advance|reject|hold) — ¿re-decidir? supersede append-only (audit)
opening publication: draft → published ⇄ paused → closed (Publication Desk; capability publish)
```

- **Optimistic move:** la card se mueve en la UI al soltar/confirmar; si `updateHiringApplicationStage` falla → rollback visual + toast ("No se pudo mover, se revirtió").
- **decideHiringApplication idempotente** por `application_id` + estado; re-decidir = supersede con audit (nunca borra el historial).
- **scorecard advisory:** el score NUNCA bloquea la decisión; es input.

## Routing Contract

- `src/app/(dashboard)/agency/hiring/**` (NUNCA `[lang]`). Shell `CompositionShell`; rutas hermanas Demand/Pipeline/Publication + `[applicationId]`.
- **viewCodes `agency.hiring.*` seedeados con ruta alcanzable en el MISMO PR** (`VIEW_REGISTRY` + migration + `route-reachability-manifest`, TASK-827/982); NUNCA un viewCode sin ruta (dispara `role_view_fallback`).
- Deep links estables (compartibles); el 360 abre como ruta hija (o sidecar sobre el pipeline).
- Bilingüe es-CL + en-US vía `getLocale()` + `getMicrocopy(locale)`; sin segmento de URL de locale.

## Focus & Accessibility

- **Kanban NO drag-only** (2.5.7): menú "Mover a etapa" por teclado en cada card; foco visible; resultado anunciado (`aria-live`).
- Tabs (360) = APG tabs; foco al `<h1>` al abrir la ficha.
- Decisión/reveal/publish = dialog accesible (foco atrapado, Esc, foco de retorno).
- Reflow 320/200%; `prefers-reduced-motion` (drag/optimistic degradan a cambio inmediato).

## Data & Command Boundaries

| Acción | Contrato | Owner |
|---|---|---|
| Listar demandas/openings/applications | readers 353 (server-side paginado) | TASK-353 |
| Mover etapa | `updateHiringApplicationStage` | TASK-353 |
| Asignar test | `assignCandidateTest` | TASK-1360 |
| Scorecard + confirmar sugerencia IA | embed 1363 + `confirmAiProposal` (1361) | 1360/1361/1363 |
| Docs candidato (masked/reveal) | resolver 1362 | TASK-1362 |
| Decidir | `decideHiringApplication` (nuevo) + `POST /api/hiring/applications/[id]/decide` | **TASK-355** |
| Publicar/despublicar | `publishOpening`/`unpublishOpening` + `buildPublicOpeningPayload` (diff) | TASK-353 |

- La UI consume commands/readers gobernados; el decide es el único write nuevo (idempotencia + audit + reason). Nexa opera el decide por construcción (propose→confirm).

## Failure Paths

| Falla | Qué ve el reclutador | Mitigación |
|---|---|---|
| Mover etapa falla | rollback visual + toast | optimistic con rollback |
| Facet del 360 falla (PG blip) | ese bloque degradado honesto ("no disponible") | anti silent-catch (no `catch(()=>[])`) |
| Decidir sin reason | validación inline (reason obligatorio) | forms-ux |
| Reveal sin capability | affordance oculto/deshabilitado + motivo | capability+audit |
| Publicar con datos sensibles | el diff muestra solo allowlist; confirmación | anti-leak |

## GVC Scenario Plan

- `hiring-demand-desk` · `hiring-pipeline-board` (drag + teclado + optimistic/rollback + columna vacía) · `hiring-application-360` (tabs + assessment embed + docs masked/reveal + decisión) · `hiring-publication-desk` (diff + publish).
- Checks: `scrollWidth==clientWidth` (1440 + 390), consola limpia, reduced-motion, **a11y kanban teclado (axe)**, foco correcto. Datos reales vía 353/1367.

## Design Decision Log

- Composition Shell base; kanban canónico + teclado; 360 hub con embeds; decisión estructurada/contestable; publication diff + revalidate careers; bilingüe; PII masked/reveal.

## Acceptance Checklist

- [ ] N4/N5/N6/N8/N9 + N-publish implementados con sus estados.
- [ ] Kanban mueve `HiringApplication` (`updateHiringApplicationStage`) con drag + teclado + optimistic/rollback.
- [ ] Decidir vía `decideHiringApplication` (humano, reason, idempotencia, audit); scorecard advisory.
- [ ] viewCodes con ruta alcanzable mismo PR (`role_view_fallback=0`).
- [ ] Publish → `revalidatePath('/public/careers')`; diff anti-leak; PII masked/reveal.
- [ ] a11y (kanban teclado, tabs, dialogs) + GVC desktop+mobile.
- [ ] `## Delta` en el master flow si cambia un nodo/regla.
