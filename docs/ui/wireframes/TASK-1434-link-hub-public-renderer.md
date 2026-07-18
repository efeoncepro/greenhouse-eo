# TASK-1434 — Link Hub Public Renderer Wireframe

## Meta

- Status: `draft`
- Owner task: `TASK-1434 — Link Hub public renderer`
- Product Design asset: `none — wireframe-first`
- Intended consumers: visitantes desde Instagram/TikTok; Efeonce y marcas cliente
- Copy source: published projection `growth.link_hub`; fallback funcional en `src/lib/copy/growth.ts`
- Primitive decision: `new domain component` sobre HTML semántico; no nueva primitive AXIS
- UI ready target: `no`

## Brief

- Primary user: persona que abre el enlace de perfil dentro del navegador in-app de Instagram o TikTok.
- User moment: quiere llegar rápidamente al destino más relevante de la marca.
- Job to be done: reconocer la marca, entender qué puede hacer y abrir un destino con un tap.
- Primary decision signal: CTA destacado y jerarquía/estado honestos de los enlaces.
- Non-goals: navegar Greenhouse, mostrar métricas internas, page builder, feed social clonado o branding obligatorio de Efeonce en páginas cliente.

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Skip link | Saltar a enlaces principales | HTML anchor | renderer |
| 1 | Brand header | Avatar/logo, nombre, descriptor | `LinkHubBrandHeader` | published projection |
| 2 | Featured action | Destino principal vigente | `LinkHubBlock kind='featuredLink'` | published projection |
| 3 | Link stack | Destinos ordenados | `LinkHubBlockList` | published projection |
| 4 | Social/contact | Redes y contacto accesibles | `LinkHubSocialLinks` | published projection |
| 5 | Embedded conversion | Growth Form opcional | renderer existente de Growth Forms | published projection |
| 6 | Footer | Legal/privacidad y firma opcional configurada | semantic footer | published projection |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `growth.linkHub.public.unavailable.title` | error | Este enlace no está disponible | none | fallback reusable |
| `growth.linkHub.public.unavailable.body` | error | Vuelve al perfil de la marca o inténtalo más tarde. | none | sin raw error |
| `growth.linkHub.public.link.opensExternal` | links | Abre un sitio externo | destination label | aria-description, no visible por defecto |
| `growth.linkHub.public.form.heading` | form | definido por la versión publicada | form title | no duplicar copy del form |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | marca publicada | descriptor publicado | enlaces | contenido por marca |
| loading | Cargando | Preparando los enlaces. | none | sólo si streaming/cache miss |
| empty | Próximamente | Esta marca todavía no publicó enlaces. | Volver | no inventar destinos |
| partial | Algunos enlaces no están disponibles | Puedes usar los destinos visibles. | none | bloque inválido se omite con señal |
| error | Este enlace no está disponible | Vuelve al perfil de la marca o inténtalo más tarde. | Reintentar | genérico y seguro |
| denied | n/a | n/a | n/a | superficie pública no expone permission state |

## Accessibility Contract

- Heading order: un H1 con nombre de marca; secciones opcionales H2.
- Chart/table alternatives: n/a.
- Aria labels: cada icon-only social link usa label estable; destinos externos se anuncian sin depender del icono.
- Focus notes: orden DOM coincide con jerarquía; focus ring visible; targets cómodos en mobile; skip link al stack.
- Color-independent state labels: todos los estados incluyen texto/icono, nunca color solo.

## Implementation Mapping

- Route / surface: host `links.efeoncepro.com`, path `/<slug>`; custom host resuelve `/`.
- Primitives: HTML semántico + renderer Growth Forms cuando aplique; no MUI/Vuexy/AXIS en el payload público.
- Variants / kinds: bloques `featuredLink|link|social|contact|meeting|growthForm` tipados por el contrato `growth.link_hub`.
- Component candidates: `src/components/growth/link-hub/public/**` (nuevos, browser-safe).
- Copy source: contenido versionado; fallbacks en `src/lib/copy/growth.ts`.
- Data reader / command: public projection de `TASK-1433`; sin DB/store en browser.
- API parity: renderer consume el mismo projection contract que preview/E2E.
- Access / capability: lectura pública allowlisted; preview usa token/auth separado.
- Runtime consumers: URL Efeonce, custom domains, preview canónico y E2E.
- Print/email/PDF considerations: fuera de V1.
- GVC markers: `link-hub-page`, `link-hub-brand`, `link-hub-featured`, `link-hub-links`, `link-hub-social`, `link-hub-form`, `link-hub-error`.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/link-hub-public.scenario.ts`
- Route: URL pública local/staging con fixture Efeonce publicado.
- Viewports: mobile 390 prioritario + desktop 1440.
- Required steps: load; focus/keyboard; abrir link fixture; render Growth Form fixture; estado error/empty.
- Required captures: ready, long-content, partial, empty/error y form.
- Required `data-capture` markers: los definidos en Implementation Mapping.
- Assertions: H1 único, URLs allowlisted, no login redirect, no raw error, no overflow, no console/page errors.
- Scroll-width checks: `scrollWidth <= clientWidth` en 390 y 1440.
- Accessibility/focus checks: tab order, focus ring, icon labels, 200% zoom.
- Reduced-motion evidence: contenido/feedback permanece completo con reduced motion.

## Design Decision Log

- Decision: single-column mobile-first con bloques tipados; el brand pack cambia identidad visual sin cambiar estructura/a11y.
- Alternatives considered: Composition Shell interno, MUI/Vuexy público, HTML/JS libre por marca.
- Why this pattern: el job es un tap rápido desde in-app browser; menos chrome y dependencias reduce fricción.
- Reuse / extend / new primitive: nuevo componente de dominio, no primitive platform-level; reusa Growth Forms.
- Open risks: safe-area, viewport height y apertura externa varían por navegador in-app; probar con dispositivos reales en `TASK-1438`.
- Follow-up: nuevas families de block requieren task/contract, no JSON arbitrario.

## Acceptance Checklist

- [ ] All visible strings are in the copy ledger.
- [ ] Dynamic values are named and bounded.
- [ ] Partial/degraded states are explicit.
- [ ] No copy implies a guarantee when data is estimated.
- [ ] Charts have table/text alternatives or are n/a.
- [ ] State and aria copy is ready for implementation.
- [ ] Implementation mapping names primitive, copy source, data contract and route/surface.
- [ ] GVC scenario plan is specific enough for `pnpm fe:capture`.
- [ ] Design decision log explains reuse/extend/new before JSX starts.
