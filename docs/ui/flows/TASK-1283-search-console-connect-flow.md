# TASK-1283 — Search Console Connection Flow Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1283 — Growth: Search Console Connection UI (Conectar Search Console)`
- Related wireframe: [docs/ui/wireframes/TASK-1283-search-console-connect.md](../wireframes/TASK-1283-search-console-connect.md)
- Intended route / surface: sección **Integraciones / Fuentes de datos** del workspace de la organización (operador account-360 + portal cliente) [verificar ruta]
- Flow type: `cross-route` (panel → consentimiento Google externo → callback → vuelta al panel)
- Primary primitives: `SearchConsoleConnectionPanel`, `Dialog` (confirm desconexión), `Button`, `Chip`
- Copy source: `src/lib/copy/growth.ts` (`GH_SEARCH_CONSOLE`) + `getMicrocopy()`

## Flow Brief

- Primary user: operador Growth/AM o cliente self-service.
- Entry moment: el usuario abre Integraciones y ve el panel de Search Console "No conectado".
- Successful outcome: la propiedad GSC de la marca queda `Conectado` (status active), visible con su `site_url` + última verificación.
- Primary decision/action: dar consentimiento en Google para que Greenhouse lea su Search Console.
- Non-goals: ver datos de Search Analytics; elegir entre N propiedades (v1 = la que el cliente autoriza); URL Inspection.

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
|---|---|---|---|---|
| Base page (Integraciones) | Entry y contexto; muestra el panel + estado | Card en grilla de integraciones | Card full-width apilada | `SearchConsoleConnectionPanel` |
| Consentimiento Google (externo) | Autorización OAuth del dueño de la propiedad | Redirect full-page a `accounts.google.com` | Igual (redirect) | superficie de Google (no Greenhouse) |
| Callback de retorno | Procesa `code`+`state`, persiste, vuelve al panel | Redirect de vuelta a Integraciones con resultado | Igual | route `oauth/callback` (TASK-1282) → redirect |
| Dialog desconexión | Confirmar desconexión | `Dialog` modal centrado | `Dialog` full-width inferior | `Dialog` (patrón confirm) |

## Flow Map

1. Entry: usuario en Integraciones ve el panel `No conectado` (zero-state) con CTA `Conectar`.
2. Primary action: click `Conectar` → GET `oauth/start` (capability-gated) → la app responde la consent URL de Google (con `state` firmado bound a la org) → **redirect full-page** a Google.
3. Transition: el dueño de la propiedad consiente en Google (scope `webmasters.readonly`).
4. User decision: aprueba (o cancela) en Google.
5. Completion: Google redirige a `oauth/callback` con `code`+`state` → la app valida `state`, intercambia tokens, persiste, y **redirige de vuelta** a Integraciones con un parámetro de resultado (`?connected=1` / `?error=...`). El panel muestra `Conectado` + anuncio `role=status`.
6. Recovery / exit: si el callback falla (state inválido, denegado en Google, error de red) → vuelve al panel en estado `error` con `Reintentar`; el usuario puede reintentar sin perder contexto.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
| Click `Conectar` | CTA primaria (zero-state) | `connecting` → redirect Google | Enter/Espacio en el botón | gated por capability + flag |
| Retorno del callback OK | redirect `oauth/callback` | `connected` (panel) | — | foco al panel + `role=status` |
| Retorno del callback con error | redirect `oauth/callback` | `error` (panel) | — | mensaje es-CL, sin error crudo |
| Click `Reconectar` | CTA primaria (revoked) | `connecting` → redirect Google | Enter/Espacio | mismo path que Conectar |
| Click `Desconectar` | CTA secundaria (connected) | abre `Dialog` confirm | Enter/Espacio | foco inicial a "Cancelar" |
| Confirmar desconexión | botón primario del Dialog | `disconnecting` → `not-connected` | Enter | command `disconnect` (optimista + rollback) |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| closed | (N/A: panel siempre presente) | — | — | — |
| opening | resolviendo estado de conexión | montar panel | reader resuelve | skeleton + `aria-busy` |
| open | `not-connected` (zero-state) | reader → sin conexión activa | click Conectar | icon + título + body + CTA `Conectar` |
| loading | `connecting` (redirect/callback en vuelo) | click Conectar/Reconectar | retorno callback | botón en loading; "Conectando con Google…" |
| error | conexión falló (state inválido/denegado/red) | callback error | click Reintentar | título + body es-CL + `Reintentar`; nunca error crudo |
| dirty | (N/A: sin formulario editable) | — | — | — |
| complete | `connected` (status active) o `revoked` (degraded) | callback OK / reader status | desconectar / revoke externo | chip con texto + propiedad + última verificación |

## Routing Contract

- Route changes: `path` (redirect externo a Google) + `query` (resultado en el retorno: `?connected=1` / `?error=<code>`).
- Canonical URL: la ruta de Integraciones del workspace; el `?connected`/`?error` es transitorio (se limpia tras leerse).
- Deep-link behavior: la ruta de Integraciones es deep-linkable; `oauth/start`/`oauth/callback` NO son navegables directo por el usuario (gated; el callback exige `state` válido).
- Back button behavior: tras conectar, Back vuelve a Integraciones (estado conectado), no re-dispara OAuth.
- Reload behavior: recargar Integraciones re-resuelve el estado desde el reader (fuente de verdad), no desde el query param.
- Shareability: la ruta de Integraciones se comparte; el resultado transitorio no.

## Focus & Accessibility

- Initial focus: al volver del callback, foco al panel + `role="status"` (`aria-live="polite"`) anuncia "Search Console conectado" / "No se pudo conectar".
- Escape behavior: en el Dialog de desconexión, Esc cancela.
- Click-away behavior: click-away en el Dialog = cancelar (no desconecta).
- Focus restore: al cerrar el Dialog, foco vuelve al CTA que lo abrió (`Desconectar`).
- Modal vs non-modal semantics: el Dialog de desconexión es modal (`role=dialog` + focus trap); el panel es no-modal.
- Screen reader announcement: resultado de la conexión vía `role=status`; el chip de estado expone texto, no solo color.
- Keyboard traversal: Tab recorre CTA → (Dialog) Cancelar → Desconectar; Enter/Espacio activan.
- Reduced motion: transiciones de estado del panel respetan `prefers-reduced-motion`.

## Data & Command Boundaries

- Readers: `getSearchConsoleConnection(orgId)` (estado/metadata de la conexión) — TASK-1282.
- Commands: `connectSearchConsoleProperty` (vía `oauth/start`+`oauth/callback`) / `disconnectSearchConsoleProperty` — TASK-1282. Cero lógica de negocio en la UI.
- API routes: `GET oauth/start`, `GET oauth/callback`, `POST disconnect` (TASK-1282) [verificar paths finales].
- Optimistic updates: `disconnect` puede ser optimista (panel pasa a `not-connected` de inmediato) con rollback + toast si falla; `connect` NO es optimista (depende del consentimiento externo de Google).
- Cache / invalidation: tras connect/disconnect, invalidar el estado del reader.
- Audit / signals: connect/disconnect quedan en el log append-only de TASK-1282; signal `growth.search_console.token_unhealthy` alimenta el estado `revoked`.
- Tenant / access boundary: `orgId` server-side; capability `growth.search_console.connect`; un usuario sin capability ve el panel read-only (sin botones).

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
|---|---|---|---|
| denied (sin capability) | panel read-only (estado visible, sin botones) | pedir acceso al admin | nunca botón muerto |
| not found / empty | zero-state `No conectado` + `Conectar` | conectar | estado normal inicial |
| partial / degraded (revoked) | estado `Acceso revocado` + `Reconectar` | reconectar | honest degradation, NO 0 |
| stale data | "Última verificación: hace X" + re-verifica en background | refrescar | stale-while-revalidate |
| timeout / API error | estado `error` + `Reintentar`; mensaje es-CL | reintentar | nunca error crudo de Google |
| dirty exit | (N/A: sin formulario) | — | — |

## GVC Scenario Plan

- Scenario: panel de conexión en sus estados + dialog desconexión (estados mockeados; el redirect externo a Google no se captura).
- Scenario file: `scripts/frontend/scenarios/search-console-connect.scenario.ts` [nuevo].
- Route: ruta de Integraciones con estados mock (not-connected / connecting / connected / revoked / error).
- Viewports: desktop (1440) + mobile (390).
- Required steps: render not-connected → connecting → connected → revoked → error → abrir Dialog desconexión.
- Required captures: panel por estado + dialog, desktop + 390.
- Required `data-capture` markers: `search-console-connect-panel`.
- Assertions: chip con texto por estado; `scrollWidth==clientWidth` desktop+390; sin overlaps; sin console errors; Dialog atrapa foco + Esc cierra.
- Scroll-width checks: desktop + 390px.
- Accessibility/focus checks: `role=status` tras callback simulado; foco restaura al cerrar Dialog.
- Reduced-motion evidence: transiciones respetan `prefers-reduced-motion`.

## Design Decision Log

- Decision: flujo `cross-route` con redirect full-page al consentimiento de Google (no popup), retorno por `oauth/callback` que redirige al panel con resultado, estado siempre re-derivado del reader.
- Alternatives considered: (a) popup OAuth — descartado para v1 (manejo de foco/bloqueo de popups más frágil; el redirect full-page es más robusto y accesible); (b) wizard — descartado (1 click + consentimiento).
- Why this pattern: el redirect full-page es el patrón OAuth más robusto/accesible; re-derivar del reader evita confiar en el query param (fuente de verdad = backend de TASK-1282).
- Reuse / extend / new primitive: reuse (card + Dialog confirm + chip).
- Open risks: ruta canónica de Integraciones `[verificar]`; si en el futuro se necesita elegir entre múltiples propiedades GSC, el flujo gana un paso de selección (fuera de v1).
- Follow-up: superficie de medición que consume los datos de Search Analytics.

## Acceptance Checklist

- [ ] The owning task declares this file in `Flow`.
- [ ] Every surface has desktop and compact behavior.
- [ ] Opening, closing, escape and focus restore are specified.
- [ ] Route/deep-link/back-button behavior is explicit.
- [ ] Data readers/commands are named and UI-only business logic is avoided.
- [ ] Failure paths are user-safe and do not expose internals.
- [ ] GVC sequence captures prove the flow, not only static screens.
- [ ] Design decision log explains why the flow uses these surfaces/routes.
