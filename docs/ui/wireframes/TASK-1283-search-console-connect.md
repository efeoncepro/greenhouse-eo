# TASK-1283 / Search Console Connection Panel — Wireframe

## Meta

- Status: `draft`
- Owner task: `TASK-1283 — Growth: Search Console Connection UI (Conectar Search Console)`
- Product Design asset: patrón de **panel de conexión de integración** (convención establecida; análogo a conectar Notion/HubSpot per-cliente — `GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`). No requiere exploración de 3 conceptos: es una superficie de integración convencional (estado de conexión + un CTA), no un concepto visual nuevo.
- Intended consumers: operador (account-360 del cliente) + portal cliente (sección Integraciones) — misma primitive renderizada en ambos lanes.
- Copy source: `src/lib/copy/growth.ts` → `GH_SEARCH_CONSOLE` [verificar / extender] + `getMicrocopy()` para CTAs/estados/loading genéricos.
- Primitive decision: **reuse** — card de conexión sobre `CustomCard`/MUI `Card` + `Chip` de estado + `Button`. NO primitive nueva (patrón de integración convencional).
- UI ready target: `no`

## Brief

- Primary user: operador Growth/AM (conecta en nombre del cliente) o el propio cliente (self-service en el portal).
- User moment: quiere que Greenhouse mida la visibilidad de búsqueda real de la marca → necesita autorizar el acceso a la propiedad de Search Console.
- Job to be done: conectar (un click → consentimiento Google → vuelta) la propiedad GSC de la marca, ver el estado de la conexión, y reconectar/desconectar.
- Primary decision signal: el **estado de conexión** (No conectado / Conectado / Acceso revocado) + qué propiedad está conectada.
- Non-goals: mostrar los datos de Search Analytics (eso es una superficie de medición posterior); elegir entre múltiples propiedades en v1 (se conecta la propiedad que el cliente autoriza); URL Inspection.

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Header del panel | Logo Google Search Console (isotipo vía `BrandIsotypes`, NUNCA SVG hand-transcrito) + título + chip de estado | `CardHeader` + `GreenhouseBrandIsotype` + `Chip` | `readSearchConsoleConnection(orgId)` (TASK-1282) |
| 1 | Cuerpo — estado | Descripción contextual según estado (no conectado / conectado / revocado / error) | `CardContent` + `Typography` | connection status |
| 2 | Cuerpo — detalle conectado | Propiedad (`site_url`) + "Última verificación: hace X" + "Conectado por" | `Stack` + `Typography` (tabular-nums para tiempo) | connection metadata |
| 3 | Footer — acciones | CTA primaria (Conectar / Reconectar) o secundaria (Desconectar) según estado + capability | `CardActions` + `Button` | capability `growth.search_console.connect` |
| 4 | Overlay — confirm desconexión | Dialog de confirmación de desconexión | `Dialog` (patrón confirm) | command `disconnect` |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `growth.search_console.connect.panel.title` | 0 | `Google Search Console` | — | Nombre propio, no traducir |
| `growth.search_console.connect.panel.subtitle` | 1 | `Mide la visibilidad de búsqueda de esta marca con datos reales de Google.` | — | Subtítulo institucional |
| `growth.search_console.connect.panel.property_label` | 2 | `Propiedad` | `{siteUrl}` | Label del valor `site_url` |
| `growth.search_console.connect.panel.last_verified` | 2 | `Última verificación: {relativeTime}` | `{relativeTime}` (vía `getMicrocopy().time`) | tabular-nums |
| `growth.search_console.connect.panel.connected_by` | 2 | `Conectado por {name}` | `{name}` | resolver avatar/nombre canónico |
| `growth.search_console.connect.cta.connect` | 3 | `Conectar` | — | CTA primaria (verbo) |
| `growth.search_console.connect.cta.reconnect` | 3 | `Reconectar` | — | CTA primaria estado revocado |
| `growth.search_console.connect.cta.disconnect` | 3 | `Desconectar` | — | CTA secundaria (destructiva suave) |
| `growth.search_console.connect.disconnect.title` | 4 | `¿Desconectar Search Console?` | — | Título = acción como pregunta |
| `growth.search_console.connect.disconnect.body` | 4 | `Dejaremos de medir la visibilidad de búsqueda de esta marca hasta que vuelvas a conectar.` | — | Consecuencia explícita |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | `Conectado` (chip success-ink) | `Propiedad {siteUrl} · Última verificación: hace {X}` | `Desconectar` (secundaria) | Estado default conectado |
| loading | — (skeleton) | skeleton del header + cuerpo (sin texto) | — | `aria-busy`; `getMicrocopy().loading` para SR: "Cargando estado de conexión" |
| empty | `Conecta tu Search Console` | `Conecta la propiedad de Search Console de esta marca para medir su visibilidad de búsqueda con datos reales.` | `Conectar` (primaria) | Zero-state: tono invitación |
| partial | `Conectando con Google…` | `Te llevamos al consentimiento de Google. No cierres esta pestaña.` | — (botón en loading) | Pending mientras el redirect/callback está en vuelo |
| error | `No pudimos completar la conexión` | `Algo salió mal al conectar con Google. Intenta de nuevo.` | `Reintentar` (primaria) | Retriable; nunca muestra el error crudo de Google |
| denied | `Acceso revocado` | `La conexión se revocó en Google. Reconecta para seguir midiendo.` | `Reconectar` (primaria) | status=revoked → degraded honesto, NO 0 |

## Accessibility Contract

- Heading order: `h2`/`h3` "Google Search Console" dentro del card; el chip de estado NO es heading.
- Chart/table alternatives: N/A (sin charts).
- Aria labels: el chip de estado expone texto ("Conectado"/"No conectado"/"Acceso revocado"), nunca color-only (WCAG 1.4.1); CTA con `aria-label` desde `getMicrocopy().aria` cuando el texto visible no baste.
- Focus notes: tras volver del callback de Google, foco al panel + anuncio del resultado vía `role="status"` (`aria-live="polite"`) — "Search Console conectado" / "No se pudo conectar". El Dialog de desconexión: foco inicial al botón "Cancelar", Esc cierra, foco restaura al CTA "Desconectar".
- Color-independent state labels: chip siempre con texto + ícono (no solo verde/rojo).

## Implementation Mapping

- Route / surface: tab/sección **Integraciones / Fuentes de datos** del workspace de la organización (account-360 operador + portal cliente) [verificar ruta canónica — alcanzable por nav o en `route-reachability-manifest.ts`].
- Primitives: `CustomCard`/`Card`, `Chip`, `Button`, `Dialog`, `GreenhouseBrandIsotype` (isotipo Google vía `BrandIsotypes`).
- Variants / kinds: card de conexión (estado), chip `success-ink|neutral|warning` por estado.
- Component candidates: `SearchConsoleConnectionPanel` [nuevo, en `src/views/greenhouse/growth/**` o `src/components/greenhouse/integrations/**` — verificar].
- Copy source: `src/lib/copy/growth.ts` (`GH_SEARCH_CONSOLE`) + `getMicrocopy()`.
- Data reader / command: reader `readSearchConsoleConnection(orgId)` (estado) + commands `connect`/`disconnect` vía rutas OAuth de **TASK-1282** (`oauth/start` + `oauth/callback`).
- API parity: la UI es consumer del primitive de TASK-1282; cero lógica de negocio en el componente (solo render del estado + disparo del command).
- Access / capability: `growth.search_console.connect` (mostrar acciones); sin capability → estado read-only (sin botones).
- Runtime consumers: este panel + Nexa (puede reportar/operar la conexión por el mismo contrato).
- Print/email/PDF considerations: N/A.
- GVC markers: `data-capture="search-console-connect-panel"` en el card.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/search-console-connect.scenario.ts` [nuevo].
- Route: la ruta de Integraciones del workspace (con estados mockeados: not-connected / connected / revoked).
- Viewports: desktop (1440) + mobile (390).
- Required steps: render not-connected → render connected (mock) → render revoked (mock) → abrir Dialog de desconexión.
- Required captures: panel en cada estado (not-connected, connected, revoked) + dialog desconexión, desktop + 390.
- Required `data-capture` markers: `search-console-connect-panel`.
- Assertions: chip con texto visible por estado; `scrollWidth==clientWidth` en desktop y 390; sin overlaps; sin console errors.
- Scroll-width checks: desktop + 390px.
- Accessibility/focus checks: foco al panel + `role=status` tras callback simulado; Dialog atrapa foco + Esc cierra.
- Reduced-motion evidence: sin motion no trivial; cualquier transición de estado respeta `prefers-reduced-motion`.

## Design Decision Log

- Decision: panel de conexión de integración (estado + un CTA) reusando primitives de card, renderizado en operador + portal por el mismo componente.
- Alternatives considered: (a) wizard multi-paso — descartado (la conexión es 1 click + consentimiento Google, no amerita wizard); (b) primitive nueva — descartado (es patrón de integración convencional, reusar card + chip + button).
- Why this pattern: espeja el modelo per-cliente ya canónico (Notion/HubSpot); el estado de conexión es la única decisión de la superficie; mínima superficie, máxima claridad.
- Reuse / extend / new primitive: **reuse** (sin primitive nueva).
- Open risks: el redirect a Google (full-redirect vs popup) afecta el manejo de foco/retorno — se resuelve en el Flow contract; la ruta canónica de "Integraciones" está `[verificar]`.
- Follow-up: superficie de medición que muestra los datos de Search Analytics (consumer posterior, no esta task).

## Acceptance Checklist

- [ ] All visible strings are in the copy ledger.
- [ ] Dynamic values are named and bounded.
- [ ] Partial/degraded states are explicit.
- [ ] No copy implies a guarantee when data is estimated.
- [ ] Charts have table/text alternatives.
- [ ] State and aria copy is ready for implementation.
- [ ] Implementation mapping names primitive, copy source, data contract and route/surface.
- [ ] GVC scenario plan is specific enough for `pnpm fe:capture` or a new scenario file.
- [ ] Design decision log explains reuse/extend/new before JSX starts.
