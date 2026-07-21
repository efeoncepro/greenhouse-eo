# TASK-1435 — Link Hub Greenhouse Cockpit Wireframe

## Meta

- Status: `draft`
- Owner task: `TASK-1435 — Link Hub Greenhouse cockpit`
- Product Design asset: `none — wireframe-first`
- Intended consumers: Growth/Social operators; later authorized client users
- Copy source: `src/lib/copy/growth.ts` + `src/config/greenhouse-nomenclature.ts`
- Primitive decision: `reuse` Composition Shell, DataTableShell, OperationalPanel, Adaptive Sidecar and GreenhouseBreadcrumbs
- UI ready target: `no`

## Brief

- Primary user: operador Efeonce que administra la bio de Efeonce o una marca cliente.
- User moment: crear/editar, comprobar preview, publicar, conectar dominio o revisar resultados.
- Job to be done: operar el ciclo completo sin entrar a DB, Vercel, GA4 o HubSpot como paneles primarios.
- Primary decision signal: estado de publicación y salud de dominio, con preview de la versión exacta.
- Non-goals: WYSIWYG libre, editar HTML/CSS, publicar posts sociales o mezclar marcas.

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| lead | Header | breadcrumb, marca, URL, estado | GreenhouseBreadcrumbs + page header | `readLinkHubPage` |
| primary | Pages queue | listar marcas/páginas y health | DataTableShell | `listLinkHubPages` |
| primary | Editor | secciones Contenido/Diseño/Dominio/Analytics/Historial | OperationalPanel + form wrappers | readers/commands TASK-1433/1436/1437 |
| aside | Live preview | render canónico de draft/published | ContextualSidecar `preview` | preview projection |
| dock | Publish bar | cambios, validation, publish/rollback | governed action bar | publish/rollback commands |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `growth.linkHub.nav.label` | nav | Link Hubs | none | nomenclatura producto |
| `growth.linkHub.list.title` | list | Link Hubs | none | reusable |
| `growth.linkHub.publish.action` | dock | Publicar cambios | version | confirm gobernado |
| `growth.linkHub.rollback.action` | history | Restaurar esta versión | version | no “deshacer” ambiguo |
| `growth.linkHub.domain.pending` | domain | Esperando configuración DNS | host | estado honesto |
| `growth.linkHub.preview.label` | aside | Vista previa | none | no implica publicado |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | Link Hub publicado | La URL sirve la versión vigente. | Editar | status real |
| loading | Cargando Link Hub | Recuperando contenido y estado. | none | skeleton |
| empty | Crea tu primer Link Hub | Reúne los destinos de tu perfil social en una página propia. | Crear Link Hub | Efeonce first |
| partial | Hay elementos por revisar | Puedes editar; publicar queda bloqueado hasta resolverlos. | Revisar hallazgos | fail closed |
| error | No pudimos cargar el Link Hub | Reintenta sin perder tus cambios. | Reintentar | no raw error |
| denied | No tienes acceso a esta marca | Solicita acceso al responsable de la cuenta. | Volver | tenant-safe |

## Accessibility Contract

- Heading order: H1 página; H2 sección activa y preview.
- Chart/table alternatives: analytics dispone tabla/texto alternativo.
- Aria labels: reorder anuncia posición; preview tiene nombre; publish status usa live region.
- Focus notes: navegación a editor enfoca H1; sidecar preview no roba foco; confirm devuelve foco al botón origen.
- Color-independent state labels: status siempre texto + icono.

## Implementation Mapping

- Route / surface: `/growth/link-hubs` y `/growth/link-hubs/[pageId]`.
- Primitives: `CompositionShell composition='leadPlusContext' fluidity='rich'`, `DataTableShell`, `OperationalPanel`, `ContextualSidecar variant='evidence' kind='preview'`, `GreenhouseBreadcrumbs`.
- Variants / kinds: queue + workbench; no primitive nueva.
- Component candidates: `src/views/growth/link-hubs/**`; thin route adapters bajo `src/app/**/growth/link-hubs/**`.
- Copy source: `src/lib/copy/growth.ts`; nav/product label en nomenclature.
- Data reader / command: TASK-1433/1436/1437 canonical readers/commands.
- API parity: Product API sobre el mismo primitive; Nexa/MCP path declarado por TASK-1433.
- Access / capability: granular `growth.link_hub.*`, tenant/brand-scoped.
- Runtime consumers: operator portal y futuro cliente autorizado.
- Print/email/PDF considerations: n/a.
- GVC markers: `link-hub-list`, `link-hub-editor`, `link-hub-preview`, `link-hub-publish-bar`, `link-hub-domain`, `link-hub-analytics`, `link-hub-history`.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/link-hub-cockpit.scenario.ts`
- Route: `/growth/link-hubs` y detalle fixture.
- Viewports: 1440 y 390.
- Required steps: list -> detail -> edit/reorder -> preview -> publish confirm -> domain -> analytics -> rollback preview.
- Required captures: empty, editor/preview, validation blocked, publish success, domain pending/active, analytics partial.
- Required `data-capture` markers: los definidos en Implementation Mapping.
- Assertions: no auth leak, dirty-state recovery, command errors sanitized, same preview contract, no overflow.
- Scroll-width checks: `scrollWidth <= clientWidth` desktop y mobile 390.
- Accessibility/focus checks: keyboard reorder alternative, focus restore, live status, sidecar/drawer semantics.
- Reduced-motion evidence: Composition Shell y reorder conservan estado sin motion.

## Design Decision Log

- Decision: queue + workbench con preview persistente; lifecycle y health dominan sobre personalización visual.
- Alternatives considered: wizard lineal único, modal editor, dashboard de cards, page builder.
- Why this pattern: operadores cambian repetidamente contenido y necesitan comparar draft vs publicado sin perder contexto.
- Reuse / extend / new primitive: reuse de primitives Greenhouse; componentes son de dominio.
- Open risks: drag-and-drop no puede ser único método de reorder; custom domain puede requerir polling/status refresh.
- Follow-up: self-service cliente reutiliza esta surface con capabilities, no otra UI.

## Acceptance Checklist

- [ ] All visible strings are in the copy ledger.
- [ ] Dynamic values are named and bounded.
- [ ] Partial/degraded states are explicit.
- [ ] No copy implies a guarantee when data is estimated.
- [ ] Charts have table/text alternatives.
- [ ] State and aria copy is ready for implementation.
- [ ] Implementation mapping names primitive, copy source, data contract and route/surface.
- [ ] GVC scenario plan is specific enough for `pnpm fe:capture`.
- [ ] Design decision log explains reuse/extend/new before JSX starts.
