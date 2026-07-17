# TASK-1413 — Proposal Studio: superficie de propuestas + versiones + descarga

> **Tipo:** Wireframe contract (ui-standard)
> **Ruta:** `/admin/commercial/proposals` (route group `internal`, guard por viewCode)
> **Dirección de Product Design:** no existe asset Figma dedicado; la dirección aprobada es el
> sistema vigente del portal — **Composition Shell + Adaptive Cards + ContextualSidecar + DataTableShell**
> (docs/architecture/ui-platform/PRIMITIVES.md, PATTERNS.md). Referencias durables del estilo objetivo:
> `/admin/commercial/product-catalog` (tabla operativa) y el patrón sidecar de account-360.
> Enterprise-moderno 2026, verificado en loop GVC — nunca freehand.

## 1. Experience brief

El operador comercial necesita, sin escribirle a un agente: ver **qué proposals existen y en qué estado
están**, abrir una y ver **el historial de versiones por tipo de artefacto** (deck, oferta técnica,
económica…), y **descargar** la versión que necesita (o la vigente). La emoción objetivo: «esto es un
sistema serio de licitaciones, no una carpeta». Datos 100% reales del aggregate (TASK-1392) vía readers
de TASK-1412; cero mocks.

## 2. Composición (Composition Shell)

Layout `list + contextual sidecar` (AdaptiveSidecarLayout). NUNCA grid ad-hoc.

```
┌─ PageHeader ────────────────────────────────────────────────────────────────┐
│ H4 «Propuestas» · subtítulo copy GH_PROPOSALS.header_subtitle               │
│ [chip contador por estado: intake/producing/…]            [refresh IconBtn] │
├─ Región A · tabla (DataTableShell) ─────────────┬─ Región B · sidecar ──────┤
│ cols: Propuesta (title+cliente stacked) ·       │ ContextualSidecar         │
│ Origen (chip origin) · Estado (chip state con   │ (se abre al click de fila)│
│ tono semántico) · Deadline (GreenhouseDate      │ ver §4                    │
│ relative + tono por urgencia) · Artefactos      │                           │
│ (count client_facing) · Actualizada (relative)  │                           │
│ row click → abre sidecar (no navega)            │                           │
└─────────────────────────────────────────────────┴───────────────────────────┘
```

- Densidad: cards/tabla `density=auto` (Adaptive Card / The Seam). Sin scroll horizontal de página.
- Tabla ≤ 6 columnas → MUI table con wrapper canónico está permitido, pero **se usa DataTableShell**
  igualmente por consistencia operativa del dominio admin.

## 3. Estado por estado (state-design, 12 canónicos aplicables)

| Estado | Tratamiento |
|---|---|
| loading | skeleton de 6 filas dimensionado al layout final (no spinner de página) |
| empty | icono Solar `document` + título GH_PROPOSALS.empty_title + cuerpo empty_body + **sin CTA de crear** (el intake nace por API/agente; se explica en el body) |
| error | `canonicalErrorResponse` → mensaje es-CL + botón Reintentar sólo si `actionable=true` |
| degraded | si el reader de versiones falla pero la lista no: sidecar muestra bloque «Historial no disponible» con causa breve — NUNCA $0/vacío fingido |
| partial | proposals sin artefactos: celda Artefactos muestra `—` con tooltip copy |
| loaded | tabla + contadores |

## 4. Sidecar de detalle (Región B)

```
┌ ContextualSidecar ──────────────────────────────┐
│ title (H5) · chip estado · cliente · origen     │
│ deadline + confianza (assumption si aplica)     │
│ ── Artefactos por tipo (Accordion por kind) ──  │
│ ▸ Deck (kind=deck) · vN vigente                 │
│   ┌ fila versión ────────────────────────────┐  │
│   │ v3 · final · 12.5 MB · 2026-07-14 21:10  │  │
│   │ por «Julio» · [chip audience]            │  │
│   │ [Descargar ⭳]  ← ÚNICA acción            │  │
│   └──────────────────────────────────────────┘  │
│   v2 · v1 colapsadas (history, mismo shape)     │
│ ▸ Oferta técnica · ▸ Económica · ▸ …            │
│ nota fija: los `internal` se listan con chip    │
│ ámbar «interno» y SIN botón para roles no       │
│ autorizados (audience gate del backend manda)   │
│ ── Historial de estado (timeline compacta) ──   │
│ transitions (from→to · actor · reason · fecha)  │
└─────────────────────────────────────────────────┘
```

- Descargar = anchor a `GET /api/commercial/proposals/[id]/assets/[proposalAssetId]/download`
  (302 firmado, TASK-1412). Sin fetch+blob: descarga nativa del browser.
- Versión vigente destacada (borde/elevación token); nunca badge inventado tipo «LATEST» en inglés.

## 5. Interaction contract

- Fila ⇄ sidecar: selección única, `aria-expanded` en fila, foco al sidecar al abrir, `Esc` cierra.
- Ordenamiento por Actualizada (default desc) y Deadline. Filtro por estado (chips toggle).
- Sin edición: superficie **read + download**. Toda mutación queda para consumers existentes (API).

## 6. Motion

Trivial (apertura estándar del sidecar según primitive; sin motion custom) → `Motion: none`.

## 7. Copy (es-CL, tokenizado — NUEVO namespace)

`src/lib/copy/commercial-proposals.ts` → `GH_PROPOSALS`: `header_title`, `header_subtitle`,
`empty_title`, `empty_body`, `col_*` (6), `state_*` (labels de los 12 estados de la matriz),
`origin_*` (3), `download_cta`, `version_current`, `audience_internal`, `history_title`,
`versions_unavailable`, `deadline_assumed_tooltip`. Estados/loading/aria genéricos desde
`src/lib/copy` shared. NUNCA literal en JSX.

## 8. Data / commands (Full API Parity — todo existe o llega por TASK-1412)

- Lista: `GET /api/commercial/proposals/operator-view` (read model existente `operator-view.ts`).
- Versiones: reader de TASK-1412 (`withVersions` o `/versions`).
- Descarga: endpoint de TASK-1412. La UI NO conoce gs:// ni asset store.
- Guard de página: viewCode nuevo `administracion.commercial_proposals` `[verificar naming exacto
  contra VIEW_REGISTRY]` + entitlement `proposal_studio_v1` ya activo para Efeonce.

## 9. Accesibilidad

Tabla con `caption` visually-hidden; chips de estado con texto (no sólo color); botón descarga con
aria-label «Descargar {kind} versión {n}»; contraste AA sobre tokens del theme; foco visible.

## Implementation Mapping

| Región del wireframe | Implementación real |
|---|---|
| Page guard (doble puerta) | `src/app/(dashboard)/admin/commercial/proposals/page.tsx` — viewCode `administracion.commercial_proposals` + `can(commercial.proposal.read)`; org derivada de `listProposalStudioOrgs()` |
| Región A · tabla | `ProposalStudioView.tsx` — `DataTableShell` (identifier `proposal-studio`) + chips de filtro por estado + skeletons/empty/error |
| Región B · sidecar | `AdaptiveSidecarLayout` (`kind='inspector'`, `preferredMode='temporary'`, 480/420–560) + `ContextualSidecar`; Accordion por kind con filas de versión |
| Descarga | anchor nativo → `GET /api/commercial/proposals/[proposalId]/assets/[proposalAssetId]/download` (TASK-1412) |
| Copy | `src/lib/copy/commercial-proposals.ts` (`GH_PROPOSALS`) + `getMicrocopy()` shared |
| Fechas | `formatDate` de `@/lib/format` (wrapper `formatDeadline`) |
| Nav | `GH_INTERNAL_NAV.adminCommercialProposals` + `VerticalMenu` (canSeeView) + `route-reachability-manifest` |

Delta vs. wireframe original: la columna «Actualizada» se plegó (5 columnas finales — Propuesta ·
Origen · Estado · Deadline · Artefactos) y el subtítulo con id `prop-…` se eliminó (decisión #3 del
Design Decision Log del flow). La timeline de transiciones quedó como parte del follow-up de ruta
detalle (el reader operator-view no expone transitions hoy).

## GVC Scenario Plan

Scenario `proposal-studio` (desktop 1440) + `proposal-studio-mobile` (390), committeados en
`scripts/frontend/scenarios/`: lista cargada → click primera fila → wait `.MuiAccordion-root`
(contenido real, no skeleton) → sidecar con historial ≥2 versiones. Deep-link verificado con
`pnpm fe:capture --route="/admin/commercial/proposals?proposal=<id>"`.
**Ejecutado 2026-07-15** contra dev local con data real (SKY, deck v1–v3): 3 fixes salieron del loop
mirado (sidecar `temporary`, `includeClosed=true`, metadata en 2 líneas) — detalle en el Design
Decision Log del flow.

## Design Decision Log

- Sidecar (no ruta detalle): el trabajo es comparativo-rápido (elegir versión y bajarla); una ruta
  `[proposalId]` queda como follow-up si el detalle crece (evidencia/quote/render jobs).
- Sin acción de crear/editar: el loop de escritura es propose→confirm→execute vía API/agentes; esta
  superficie es la ventana de VERDAD + descarga.
- DataTableShell + Composition Shell + ContextualSidecar: primitives canónicas, cero nacimiento nuevo.
