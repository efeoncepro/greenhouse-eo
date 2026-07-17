# TASK-1413 — Proposal Studio: superficie premium en el portal (lista + versiones + descarga)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1413-proposal-studio-surface.md`
- Flow: `docs/ui/flows/TASK-1413-proposal-studio-surface-flow.md`
- Motion: `none`
- Backend impact: `api`
- Epic: `none`
- Status real: `Implementada — verificación final`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `TASK-1412`
- Branch: `develop` (local-first, autorización del operador — sin branch dedicada)
- Legacy ID: `none`
- GitHub Issue: `none`

## Delta 2026-07-14

- **TASK-1412 COMPLETE** — desbloqueada: reader `/assets/versions` y download por stream ya viven
  (`artifact-versions.ts`; download con audience gate). El attach ahora retorna `version`.

## Summary

El runtime de Proposal Studio (aggregate + render pipeline + versionado/descarga de TASK-1412) no tiene
NINGUNA superficie: hoy «ver dónde está la propuesta» = escribirle a un agente. Esta task construye la
ventana operador — `/admin/commercial/proposals`: tabla operativa de proposals (operator-view) + sidecar
contextual con historial de versiones por tipo de artefacto + descarga gobernada — con UI premium del
sistema (Composition Shell + DataTableShell + ContextualSidecar), viewCode nuevo con seed en el mismo PR
y nav alcanzable.

## Why This Task Exists

Dependencia del chat para localizar artefactos contractuales con deadline (SKY se entregó consultando al
agente dónde estaba el PDF). La verdad ya existe en PG y el asset store; falta la ventana. Full API
Parity exige que la UI sea un consumer más del contrato — que TASK-1412 deja listo.

## Goal

Que el operador entre por el menú (Comercial → Propuestas), vea el estado real de cada proposal, abra su
historial de versiones y descargue cualquier artefacto autorizado en dos clics — con la misma calidad
visual enterprise del resto del admin.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md` + `ui-platform/{PRIMITIVES,PATTERNS,STATE}.md`
  — Composition Shell base, Adaptive Card density auto, ContextualSidecar, DataTableShell.
- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md` — la UI nunca muta el
  aggregate fuera de commands; cero URLs de storage.
- `GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — viewCode nuevo ⇒ **migración seed en el
  MISMO PR** (governance TASK-827); routeGroup `internal`, NUNCA roles `client_*`.
- TASK-982 — ruta nueva `(dashboard)` alcanzable por nav + `route-reachability-manifest.ts`.

## Normative Docs

- `docs/tasks/TASK_UI_UX_ADDENDUM.md` (ui-standard) · `DESIGN.md` · wireframe/flow de esta task.

## Dependencies & Impact

- **Depende de:** TASK-1412 (reader de versiones + endpoint de descarga). Entitlement
  `proposal_studio_v1` activo para Efeonce (TASK-1392).
- **Impacta a:** TASK-1399 (Nexa) — misma verdad, otro consumer; futura ruta detalle si crece.
### Files owned

- `src/app/(dashboard)/admin/commercial/proposals/page.tsx` (nueva),
  `src/views/greenhouse/commercial/proposals/**` (nueva), `src/lib/copy/commercial-proposals.ts`
  (nueva), fila en `route-reachability-manifest.ts`, entrada nav en `greenhouse-nomenclature.ts`
  (`GH_INTERNAL_NAV`), migración seed del viewCode, scenario GVC `scripts/frontend/scenarios/proposal-studio.*`.

## Current Repo State

**Ya existe:** operator-view read model + ruta API; primitives (DataTableShell, ContextualSidecar,
AdaptiveSidecarLayout, Composition Shell); admin/commercial/* como hogar del submenú; personas agent
para E2E. **Gap:** todo lo visible; viewCode; nav; copy del dominio; scenario GVC.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/app/(dashboard)/admin/commercial/proposals` + `src/views/greenhouse/commercial/proposals` (página + view dentro del monolito, extraction-ready por módulo).
- Future candidate home: `portal`
- Boundary: la view consume SOLO readers/endpoints canónicos; cero SQL/SDK en la superficie.
- Server/browser split: page server (guard + fetch inicial) + view client; descarga = anchor nativo.
- Build impact: ninguno.
- Extraction blocker: ninguno nuevo.

## UI/UX Contract

- **Experience brief / surface / estados / interacción / copy / a11y / GVC:** contrato completo y
  vinculante en el wireframe `docs/ui/wireframes/TASK-1413-proposal-studio-surface.md` (§1-§11) y el
  flow `docs/ui/flows/TASK-1413-proposal-studio-surface-flow.md`. Resumen duro:
- Rigor: `ui-standard`. Primitive decision: Composition Shell + DataTableShell + ContextualSidecar —
  cero primitives nuevas.
- State inventory: loading skeleton dimensionado · empty sin CTA de creación · error canónico
  actionable-aware · degraded por bloque (versiones) · partial (sin artefactos) · loaded.
- Interaction: fila⇄sidecar selección única, Esc/foco, deep-link `?proposal=`, orden y filtros por
  estado; superficie read+download, CERO mutación.
- Motion: trivial del primitive → sin contrato motion.
- Copy: `GH_PROPOSALS` nuevo en `src/lib/copy/commercial-proposals.ts`, es-CL, validado con
  `greenhouse-ux-writing`; nada literal en JSX.
- Visual verification: GVC desktop+mobile por scenario `proposal-studio`, loop hasta enterprise.

### Implementation mapping

El mapping completo región→componente/archivo vive en el wireframe (`## Implementation Mapping`).
Resumen: page server con doble puerta (`page.tsx`) · tabla `DataTableShell` + filtros
(`ProposalStudioView.tsx`) · sidecar `AdaptiveSidecarLayout` (`inspector`/`temporary`, 480/420–560) +
`ContextualSidecar` · descarga por anchor al endpoint TASK-1412 · copy `GH_PROPOSALS` · fechas
`formatDate` canónico · nav `GH_INTERNAL_NAV.adminCommercialProposals` + reachability manifest.

### GVC scenario plan

Scenarios committeados `proposal-studio` (1440) + `proposal-studio-mobile` (390) en
`scripts/frontend/scenarios/` — wait de contenido real (`.MuiAccordion-root`), marks lista+sidecar;
deep-link por capture one-off `--route=…?proposal=<id>`. Ejecutados 2026-07-15 con data real (SKY);
frames mirados en loop (3 fixes). Detalle en el wireframe (`## GVC Scenario Plan`).

### Design decision log

Las decisiones vinculantes viven en el wireframe (`## Design Decision Log`) y el flow (tabla de 6
decisiones del loop GVC 2026-07-15). Las 4 que nacieron del loop mirado: sidecar
`preferredMode='temporary'` (el inline desbordaba a 390px) · `includeClosed=true` literal (el handler
parsea `==='true'`) · sin UUID `prop-…` en la celda de título · metadata de versión en 2 líneas.
Ver también `## Design decision log + evidencia GVC (2026-07-15)` al final de esta task.

## Hybrid Execution Justification

- **Why not split:** el trabajo backend restante es mínimo y NO reutilizable fuera de esta superficie
  (guard de página + migración seed append-only del viewCode, patrón TASK-827; toda la fundación
  reutilizable ya vive en TASK-1412). Partirlo crearía una task de una migración de 20 líneas.
- **Primary execution profile:** `ui-ux`.
- **Contract boundary:** la view consume SOLO contratos de TASK-1412 + operator-view existente; el
  único write nuevo es la seed governance (append-only, sin runtime).
- **Risk controls:** seed con patrón canónico verificado (TASK-827/873); orden de slices fija el
  governance primero; rollback = revert PR (seed inofensiva si queda).

## Backend/Data Contract

### Backend/data brief

Impacto `api` acotado: guard de página + (si Plan Mode lo decide) subruta `/versions`. Sin schema, sin
migración de datos — la seed del viewCode es governance, no modelo. Rigor: `backend-lite`.

### Contract surface

Consume: `GET /api/commercial/proposals/operator-view` · reader/descarga de TASK-1412. Nuevo: sólo la
migración seed `role_view_assignments` del viewCode (roles internos operativos; NUNCA `client_*`).

### Data model and invariants

Sin cambios de modelo. Invariante de superficie: ninguna respuesta renderizada contiene `gs://`.

### Migration, backfill and rollout

Seed append-only del viewCode (patrón TASK-827/873); rollback = no-op (view sin asignar no rompe).

### Security and access

viewCode `administracion.commercial_proposals` `[verificar naming contra VIEW_REGISTRY]` + redirect
defensivo `tenantType==='client'` + el backend re-valida capability/audience en cada descarga
(defensa doble; la UI oculta lo no autorizado pero no es el gate).

### Runtime evidence

GVC frames + curls de la matriz de acceso (member OK / client 403) + navegación real por menú.

### Acceptance criteria additions

Integradas abajo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (la llena el agente que toma la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

- **Slice 1 — Governance de acceso:** viewCode + migración seed (mismo PR) + `route-reachability-manifest`
  + entrada nav `GH_INTERNAL_NAV` (Comercial → Propuestas) `[verificar submenú comercial existente en
  el menú interno; si no existe grupo, colgarla del grupo Admin/Comercial vigente]`.
- **Slice 2 — Copy:** `commercial-proposals.ts` con el inventario del wireframe §7, validado ux-writing.
- **Slice 3 — Página + tabla:** page server con guard + `ProposalStudioView` (DataTableShell, estados
  completos, filtros por estado, orden).
- **Slice 4 — Sidecar de versiones:** ContextualSidecar con Accordion por kind, historial (reader
  TASK-1412), timeline de transitions, descarga por anchor; degradación por bloque; deep-link.
- **Slice 5 — GVC + pulido enterprise:** scenario nuevo, capturas desktop+mobile, loop de ajuste; alta
  en `DesignSystemCatalogView` NO aplica (no es surface del design system) — sí registrar el scenario.

## Out of Scope

Creación/edición/gates de proposals desde UI · portal cliente · Nexa tools · ruta detalle
`[proposalId]` (follow-up si el detalle crece) · notificaciones.

## Detailed Spec

El wireframe y el flow SON la spec visual/interacción (vinculantes). Decisiones fijas: sidecar en vez de
ruta detalle; descarga nativa por 302 (sin blob); superficie read-only; datos siempre reales.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

1 → 2 → 3 → 4 → 5. El guard/nav primero: una ruta inalcanzable o sin seed rompe gates mecánicos
(route-reachability, TASK-827) antes de cualquier pixel.

### Risk matrix

| Riesgo | Sistema | Prob | Mitigación | Señal |
|---|---|---|---|---|
| viewCode sin seed en el PR | governance | Baja | Patrón TASK-827; checklist de cierre | telemetría `role_view_fallback_used` |
| Ruta inalcanzable | nav | Baja | Slice 1 + `pnpm route-reachability-gate` | gate CI |
| Fuga de asset interno en UI | UI | Baja | Reader marca audience; botón oculto + backend re-valida | test 403 |
| Sidebar/tabla con scroll horizontal página | UI | Media | Contención de scroll del patrón + GVC mobile | frame GVC |

### Feature flags / cutover

Sin flag: la view nace gateada por viewCode+entitlement (sólo Efeonce la tiene activa).

### Rollback plan per slice

| Slice | Rollback | Tiempo | ¿Reversible? |
|---|---|---|---|
| 1 | seed es append-only inofensiva; revert del resto del PR | min | Sí |
| 2-5 | revert PR + redeploy | min | Sí |

### Production verification sequence

Staging: navegar por menú con persona superadmin → lista real → sidecar → descargar PDF de SKY; persona
client → 403/redirect. GVC frames archivados en la task.

### Out-of-band coordination required

Ninguna.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] La ruta es alcanzable por menú (grupo Comercial/Admin) y `pnpm route-reachability-gate` verde
      (219 rutas / 0 orphans, Slice 1).
- [x] viewCode nuevo con migración seed en el MISMO PR (`20260715044518702`, aplicada a dev); persona
      client NUNCA la ve — verificado 2026-07-15: página 307→`/401`, operator-view 403, download 403.
- [x] Primitive decision cumplida: DataTableShell + AdaptiveSidecarLayout (`kind='inspector'`,
      `preferredMode='temporary'`) + ContextualSidecar; cero primitives nuevas; cero HEX/fontSize inline.
- [x] Copy 100% desde `GH_PROPOSALS`/shared; `greenhouse/no-untokenized-copy` sin findings nuevos
      (lint total del view = 0).
- [x] Estados cubiertos: loading (skeletons, frame 05:12), loaded (frames 05:20/05:23), empty/error/
      degraded implementados con copy dedicado (empty visible solo sin data; error/degraded por rama).
- [x] Descarga: GET del v3 interno con superadmin → 200 `application/pdf` 5,5 MB (SKY-BENCH-25.pdf);
      con persona client → 403. El botón sale del reader (audience) y el backend re-valida.
- [x] Deep-link `?proposal=` implementado (estado inicial desde URL; id inválido = sidecar sin match,
      lista intacta).
- [x] GVC desktop (1440) + mobile (390) del scenario `proposal-studio(-mobile)` en loop con frames
      MIRADOS — 3 fixes salieron del loop (sidecar temporary, includeClosed, metadata 2 líneas); tabla
      contenida sin scroll horizontal de página en 390px.
- [x] `UI ready: yes` con `pnpm task:lint --task TASK-1413` en `template=1 errors=0 warnings=0`.

## Verification

`pnpm local:check:ui` + `pnpm ui:wireframe-check/ui:flow-check/ui:readiness-check --task TASK-1413` +
GVC scenario + navegación real con personas agent (superadmin y client).

## Closing Protocol

Estándar (lifecycle/README/registry/impacto cruzado) + `pnpm docs:closure-check` + manual de uso corto
en `docs/manual-de-uso/` (cómo descargar una propuesta) + doc funcional delta en
`docs/documentation/comercial/`.

## Follow-ups

- Ruta detalle `[proposalId]` (evidencia, requirements, render jobs en vivo) si el sidecar queda corto.
- Nexa: linkear la superficie desde `proposal_status` cuando el flag flip (TASK-1399).

## Open Questions

- Naming exacto del viewCode contra el catálogo VIEW_REGISTRY vigente (Slice 1 lo resuelve).
  → **Resuelta 2026-07-15:** `administracion.commercial_proposals` (section `administracion`, patrón
  del catálogo existente), seed a `efeonce_admin` + `efeonce_account` (los 2 roles con
  `commercial.proposal.read` en `runtime.ts`), NUNCA `client_*`.

## Design decision log + evidencia GVC (2026-07-15)

**Decisiones del loop visual (frames mirados, desktop 1440 + mobile 390):**

1. **Sidecar `preferredMode='temporary'` + `kind='inspector'` (480/420–560):** el default inline
   desbordaba el viewport móvil (contenido cortado al borde derecho a 390px). Temporary = Drawer
   full-width en xs y overlay con scrim en desktop — espejo del consumer productivo `AdminReviewView`.
2. **`includeClosed=true` (no `=1`):** el route handler parsea `=== 'true'`; con `1` los estados
   cerrados quedaban fuera en silencio mientras el chip decía «Todos los estados». Verificado además
   que el probe `declined` ausente era de OTRA org (tenant isolation correcto, no bug).
3. **Sin UUID crudo en la tabla:** `prop-…` como subtítulo de fila era ruido de máquina en una
   superficie premium; el id vive en el deep-link, no en el ojo del operador.
4. **Metadata de versión en 2 líneas:** filename (truncate + title) y `tamaño · fecha` en caption —
   la línea única truncaba la fecha.

**Evidencia:**

- GVC desktop: `.captures/2026-07-15T05-24-04_proposal-studio/` (lista + sidecar con v3/v2/v1,
  chips Vigente/Interno, Descargar).
- GVC mobile: `.captures/2026-07-15T05-23-13_proposal-studio-mobile/` (drawer full-width, tabla
  contenida — scroll interno del shell, body sin overflow).
- Matriz de acceso (2026-07-15, dev local): client → página 307→`/401` · operator-view 403 ·
  download interno 403; superadmin → download 200 `application/pdf` 5.561.203 bytes.
- Gates: `task:lint template=1 errors=0 warnings=0` · `ui:wireframe-check`/`ui:flow-check`/
  `ui:readiness-check` OK · lint del view 0 · `pnpm test` full suite verde · `pnpm build` prod OK.
