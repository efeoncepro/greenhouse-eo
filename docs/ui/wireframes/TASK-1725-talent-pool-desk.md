# TASK-1725 — Talent Pool Desk Wireframe

## Meta

- Product Design asset: `docs/ui/visual-directions/TASK-1725-talent-pool-desk.md`
- Visual direction mode: `repo-native-benchmark`
- UI rigor: `ui-standard`
- Route: `/agency/hiring/talent-pool`; internal Greenhouse, sibling of Hiring workspaces.
- Primitive decision: reuse `SurfaceRecipe listDetail`, `WorkbenchHeader`, operational list/table and AdaptiveSidecar.

## Desktop Target — 1440×1000

```text
┌─ WorkbenchHeader ─────────────────────────────────────────────────────────────┐
│ Hiring › Banco de talento        Actualizado {asOf}       [Acción contextual] │
│ Talento evaluable y reutilizable; evidencia y permisos visibles              │
├─ Search/filters ──────────────────────────────────────────────────────────────┤
│ [Buscar] [capacidad] [seniority] [país] [idioma] [disponibilidad] [estado]    │
├─ Results plane ──────────────────────────────────────┬─ AdaptiveSidecar ──────┤
│ Persona · roles · evidencia · disponibilidad ·       │ Perfil / cobertura     │
│ contacto permitido · freshness                       │ Por qué aparece         │
│ ---------------------------------------------------  │ Evidence timeline       │
│ {row selected}                                       │ Applications refs       │
│ …cursor…                                             │ [Abrir 360] [Proponer]  │
└──────────────────────────────────────────────────────┴────────────────────────┘
```

The table is the dominant paper; filters/header do not float on the grey canvas. Sidecar never exposes raw contact,
CV, notes or answer keys. Invitation remains a proposal until accessible confirmation returns a receipt.

## Mobile Target — 390×844

The header keeps title/freshness; filters move to a disclosure with active-filter count. Results become compact rows
with name, role evidence, availability and action state. Opening a person replaces the list with full-width detail;
Back restores filters/cursor/focus. No two-column squeeze or horizontal table scroll.

## Action Hierarchy

1. Search/filter the pool and inspect why a person appears.
2. Open an exact Application 360 or TASK-1718 review packet context.
3. Propose invitation to an opening; confirm only after server shows purpose, duplicates and allowed action.
4. Manage consent/availability only through the separate capability/surface, never inline as a shortcut.

## Visual Fidelity Mapping

- Header uses `SurfaceRecipe` header region with `WorkbenchHeader kind='workbench'`.
- Inventory uses the existing operational table/list density; partial data is labelled, never empty zeros.
- Detail uses `AdaptiveSidecar` desktop and route/full-width transformation on 390px.
- Evidence uses timeline/list and semantic chips; no new charts, score gauges or profile-card gallery.
- Dialog/feedback follows the motion contract and MUI/AXIS tokens.

## Copy Ledger

| id | visible copy | purpose |
|---|---|---|
| `hiringTalentPool.title` | Banco de talento | surface title |
| `hiringTalentPool.search` | Buscar por experiencia o capacidad | structured discovery entry |
| `hiringTalentPool.why` | Por qué aparece | evidence reasons |
| `hiringTalentPool.coverage.partial` | Evidencia parcial | honest coverage |
| `hiringTalentPool.action.invite` | Proponer invitación | governed write starts as proposal |
| `hiringTalentPool.action.reconsent` | Requiere autorización para contactar | contactability boundary |
| `hiringTalentPool.action.withdrawn` | Perfil retirado | no action state |

## State Copy

| state | visible copy | recovery / behavior |
|---|---|---|
| ready | `{n} perfiles encontrados` | inspect a result or refine filters |
| loading | `Buscando talento…` | keep filters/header stable; skeleton rows |
| empty | `No encontramos perfiles con estos filtros` | clear individual/all filters; no sourcing claim |
| partial | `Algunas evidencias están incompletas o desactualizadas` | show coverage/freshness and open source refs |
| error | `No pudimos consultar el banco de talento` | retry without losing filters |
| denied | `No tienes acceso al banco de talento` | no results/count/existence leak; contact administrator |

## Accessibility Contract

- Semantic table/list with sortable headers only where implemented; selected row and sidecar relationship announced.
- Search has label; filter disclosure exposes active count; chips are text, not color-only.
- Sidecar focus moves to heading, Escape/Back closes and restores the selected row; mobile back restores list state.
- Invite dialog describes opening/purpose/consequence, traps/restores focus and never confirms on click-away.
- 200% zoom, 390px transformation, reduced motion and `scrollWidth <= clientWidth` meet WCAG 2.2 AA.

## Implementation Mapping

| Region | Primitive/component candidate | Contract |
|---|---|---|
| Header | `SurfaceRecipe listDetail` + `WorkbenchHeader` | `searchTalentPool` metadata/asOf |
| Filters | existing search/filter controls + GreenhouseDisclosureTrigger | allowlisted filters/cursor |
| Results | operational table/list pattern | search DTO; no direct store/query |
| Detail | `AdaptiveSidecar` / mobile full-width detail | `getTalentPoolProfile` |
| Evidence | timeline/list + GreenhouseChip | source refs, coverage, freshness, reasons |
| Invitation | GreenhouseButton + accessible Dialog | TASK-1723 propose/confirm invite + receipt |
| Copy | `src/lib/copy/dictionaries/{es-CL,en-US}/hiringTalentPool.ts` | reusable bilingual copy |

## GVC Scenario Plan

- Scenario file: `scripts/frontend-capture/scenarios/hiring-talent-pool-desk.*`.
- Quality profile: `premium`.
- Route: `/agency/hiring/talent-pool`; authorized People fixture and denied user fixture.
- Viewports: 1440×1000 and 390×844.
- Captures: ready/search, filtered empty, partial/stale, detail, invite proposal, conflict, denied and mobile detail/back.
- Markers: `talent-pool-header|filters|results|profile|evidence|invite-dialog`.
- Assertions: no PII/raw CV, reasons/freshness present, focus restore, query persistence, axe/console clean and
  `scrollWidth <= clientWidth`.
- Review dossier: `docs/ui/reviews/TASK-1725-talent-pool-desk/`.
- Baseline decision: create `hiring-talent-pool-desk` after first-fold/dossier Apto; no replacement of Hiring Desk baseline.

## Design Decision Log

- Selected evidence workbench; rejected card gallery and Kanban because they bias/scatter comparison or duplicate pipeline.
- Reuse list-detail recipe, operational list and sidecar; no new primitive.
- Invitation is proposal/confirm; consent management remains separate.
- Open risk: sparse evidence must remain useful without presenting `unknown` as poor fit.

