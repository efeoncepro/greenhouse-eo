# TASK-1283 — Growth: Search Console Connection UI (Conectar Search Console)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1283-search-console-connect.md`
- Flow: `docs/ui/flows/TASK-1283-search-console-connect-flow.md`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ui`
- Blocked by: `TASK-1282`
- Branch: `task/TASK-1283-growth-search-console-connection-ui`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

UI self-service "Conectar Search Console": un panel de conexión que muestra el estado (No conectado / Conectado / Acceso revocado) y dispara el flujo OAuth de **TASK-1282** (consentimiento Google → callback). Consumer del contrato gobernado de TASK-1282 (cero lógica de negocio en la UI). Habilita que cualquier marca cliente conecte su propiedad GSC desde una pantalla.

## Why This Task Exists

TASK-1282 construye la fundación backend (OAuth multi-tenant + token per-org + reader + capability), pero sin UI el cliente no puede conectarse. Esta task es el **consumer visible** del contrato: la superficie donde el operador o el cliente ven el estado y disparan/desconectan la conexión. Sin ella, la capacidad existe pero nadie la opera por pantalla.

## Goal

- Panel de conexión reusable (operador account-360 + portal cliente) que renderiza el estado de conexión GSC per-org.
- Flujo OAuth disparado desde la UI (Conectar → redirect Google → callback → vuelta con resultado) + Reconectar (revoked) + Desconectar (con confirm).
- Todos los estados de state-design (default/loading/empty/connecting/error/revoked/denied) + a11y + copy es-CL canónico + evidencia GVC desktop+mobile.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `DESIGN.md` + `docs/architecture/ui-platform/` — primitives, tokens, Composition Shell, Adaptive Card.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — la UI es consumer del primitive de TASK-1282, no reimplementa lógica.
- `docs/tasks/to-do/TASK-1282-growth-search-console-multitenant-connection.md` — el contrato backend que esta UI consume.

Reglas obligatorias:

- **Cero lógica de negocio en el componente.** Solo render del estado (reader) + disparo de commands (rutas OAuth/disconnect de TASK-1282).
- **Isotipo de Google vía `BrandIsotypes`** (marca de tercero), NUNCA SVG hand-transcrito (regla de marca de integración).
- **Copy es-CL tokenizado** (`src/lib/copy/*`); cero literals en JSX para CTAs/estados/aria reutilizables.
- **Tokens** `theme.palette.*`/`theme.axis.*` + variantes tipográficas; sin HEX/px/`fontSize` inline.
- **Ruta `(dashboard)` alcanzable** por nav o registrada en `route-reachability-manifest.ts` (TASK-982).

## Normative Docs

- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `src/lib/copy/growth.ts` [verificar / extender — `GH_SEARCH_CONSOLE`]
- `src/components/greenhouse/primitives` — `BrandIsotypes`, card, chip, button [verificar nombres]

## Dependencies & Impact

### Depends on

- `TASK-1282` — reader `getSearchConsoleConnection(orgId)` + commands connect/disconnect + rutas OAuth + capability `growth.search_console.connect`. **Bloqueante duro:** sin el contrato backend esta UI no tiene qué consumir.

### Blocks / Impacts

- Cierra el camino self-service de conexión GSC (EPIC-020 medición + TASK-1260 tracking).

### Files owned

- `src/views/greenhouse/growth/SearchConsoleConnectionPanel.tsx` [nuevo — verificar ubicación: views vs components/integrations]
- ruta/sección "Integraciones" del workspace que monta el panel [verificar ruta canónica]
- `src/lib/copy/growth.ts` [extender — `GH_SEARCH_CONSOLE`]
- `scripts/frontend/scenarios/search-console-connect.scenario.ts` [nuevo — GVC]
- `docs/ui/wireframes/TASK-1283-search-console-connect.md` · `docs/ui/flows/TASK-1283-search-console-connect-flow.md`

## Current Repo State

### Already exists

- (tras TASK-1282) el contrato backend de conexión + capability.
- Primitives de card/chip/button + `BrandIsotypes` + `getMicrocopy()` + GVC.

### Gap

- Cero superficie visible para conectar/ver/desconectar Search Console.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador Growth/AM (account-360) o cliente self-service (portal); gated por capability `growth.search_console.connect`.
- Momento del flujo: quiere medir la visibilidad de búsqueda real de la marca → autorizar el acceso a su Search Console.
- Resultado perceptible esperado: el panel pasa de `No conectado` a `Conectado` mostrando la propiedad + última verificación.
- Friccion que debe reducir: de "agrega manualmente nuestro service account en tu GSC" a "un click + consentimiento Google".
- No-goals UX: mostrar datos de Search Analytics; elegir entre N propiedades (v1); URL Inspection.

### Surface & system decision

- Surface: panel/card en la sección **Integraciones / Fuentes de datos** del workspace de la organización (operador + portal).
- Composition Shell: `aplica` — el panel vive como card dentro del shell de la superficie de Integraciones (no inventar grid ad-hoc).
- Primitive decision: `reuse` — `CustomCard`/`Card` + `Chip` (estado) + `Button` + `Dialog` (confirm) + `GreenhouseBrandIsotype` (Google).
- Adaptive density / The Seam: `aplica` — el card nace `density=auto` (full-width en mobile, en grilla en desktop).
- Floating/Sidecar/Dialog decision: `Dialog` modal para confirmar desconexión (patrón confirm canónico).
- Copy source: `src/lib/copy/growth.ts` (`GH_SEARCH_CONSOLE`) + `getMicrocopy()`.
- Access impact: `entitlements` — capability `growth.search_console.connect` (mostrar acciones); sin ella, read-only.

### State inventory

- Default: `Conectado` — chip + propiedad (`site_url`) + "Última verificación: hace X" + `Desconectar`.
- Loading: skeleton del card (`aria-busy`), SR "Cargando estado de conexión".
- Empty: `No conectado` (zero-state) — icon + título + body + `Conectar`.
- Error: `No pudimos completar la conexión` + `Reintentar` (nunca error crudo de Google).
- Degraded / partial: `Acceso revocado` (status=revoked) + `Reconectar` (honest degradation, NO 0).
- Permission denied: sin capability → panel read-only (estado visible, sin botones).
- Long content: el `site_url` largo trunca con tooltip; sin overflow horizontal.
- Mobile / compact: card full-width apilada (390px sin scroll horizontal).
- Keyboard / focus: foco al panel + `role=status` tras callback; Dialog atrapa foco + Esc cierra + restaura al CTA.
- Reduced motion: transiciones de estado respetan `prefers-reduced-motion`.

### Interaction contract

- Primary interaction: `Conectar`/`Reconectar` → `oauth/start` → redirect Google; `Desconectar` → Dialog → command.
- Hover / focus / active: estados estándar de `Button` (tokens); chip no interactivo.
- Pending / disabled: durante `connecting`, botón en loading + deshabilitado.
- Escape / click-away: Esc/click-away en el Dialog = cancelar (no desconecta).
- Focus restore: al cerrar el Dialog, foco vuelve al CTA `Desconectar`.
- Latency feedback: "Conectando con Google…" mientras el redirect/callback está en vuelo.
- Toast / alert behavior: toast de éxito al desconectar ("Search Console desconectado"); el resultado de conectar se anuncia en el panel vía `role=status`.

### Motion & microinteractions

- Motion primitive: `CSS` (transición de estado simple).
- Enter / exit: fade del cambio de estado del card.
- Layout morph: N/A.
- Stagger: N/A.
- Timing / easing token: tokens de motion canónicos (cortos).
- Reduced-motion fallback: sin transición bajo `prefers-reduced-motion`.
- Non-goal motion: sin animaciones decorativas.

### Implementation mapping

- Route / surface: sección Integraciones del workspace (account-360 + portal) [verificar ruta canónica].
- Primitive / variant / kind: card de conexión + chip `success-ink|neutral|warning` + button + dialog.
- Component candidates: `SearchConsoleConnectionPanel`.
- Copy source: `src/lib/copy/growth.ts` (`GH_SEARCH_CONSOLE`).
- Data reader / command: `getSearchConsoleConnection(orgId)` + connect/disconnect (TASK-1282).
- API parity: consumer del primitive de TASK-1282; Nexa opera la conexión por el mismo contrato.
- Access / capability: `growth.search_console.connect`.
- States to implement: default/loading/empty/connecting/error/revoked/denied/mobile.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/search-console-connect.scenario.ts`.
- Route: Integraciones con estados mock (not-connected/connecting/connected/revoked/error).
- Viewports: desktop (1440) + mobile (390).
- Required steps: render cada estado + abrir Dialog desconexión.
- Required captures: panel por estado + dialog, desktop + 390.
- Required `data-capture` markers: `search-console-connect-panel`.
- Assertions: chip con texto por estado; `scrollWidth==clientWidth` desktop+390; sin overlaps/console errors; Dialog atrapa foco + Esc.
- Scroll-width checks: desktop + 390px.
- Reduced-motion / focus evidence: `role=status` tras callback simulado; foco restaura al cerrar Dialog.

### Design decision log

- Decision: panel de conexión (estado + un CTA) reusando card/chip/button/dialog, mismo componente en operador + portal; flujo OAuth `cross-route` con redirect full-page.
- Alternatives considered: wizard multi-paso (descartado: 1 click + consentimiento); popup OAuth (descartado v1: foco/bloqueo de popups más frágil); primitive nueva (descartado: patrón convencional).
- Why this pattern: espeja el modelo per-cliente canónico (Notion/HubSpot); mínima superficie; redirect full-page = OAuth más robusto/accesible.
- Reuse / extend / new primitive: `reuse`.
- Open risks: ruta canónica de Integraciones `[verificar]`; selección de múltiples propiedades GSC (fuera de v1).

### Visual verification

- GVC scenario: `search-console-connect`.
- Viewports: desktop (1440) + mobile (390).
- Required captures: panel por estado + dialog.
- Required `data-capture` markers: `search-console-connect-panel`.
- Scroll-width check: desktop + 390px.
- Accessibility/focus checks: `role=status` + Dialog focus trap + Esc.
- Before/after evidence: N/A (superficie nueva).
- Known visual debt: ninguna conocida al diseño.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Connection panel + estados + copy

- `SearchConsoleConnectionPanel` con todos los estados (default/loading/empty/connecting/error/revoked/denied/mobile), consumiendo `getSearchConsoleConnection(orgId)`.
- Copy `GH_SEARCH_CONSOLE` en `src/lib/copy/growth.ts`; isotipo Google vía `BrandIsotypes`.
- Montar en la sección Integraciones (ruta alcanzable / manifest).

### Slice 2 — Flujo OAuth (connect/reconnect/disconnect) + GVC

- Disparo de `Conectar`/`Reconectar` → `oauth/start` (redirect) + manejo del retorno del callback (`?connected`/`?error`) con `role=status` + foco.
- `Desconectar` con Dialog confirm + command (optimista + rollback + toast).
- Scenario GVC + capturas desktop+mobile de todos los estados.

## Out of Scope

- El contrato backend OAuth/token/reader (es TASK-1282).
- Superficie de medición que muestra datos de Search Analytics (consumer posterior).
- Selección de múltiples propiedades GSC; URL Inspection.

## Detailed Spec

Ver el wireframe (`docs/ui/wireframes/TASK-1283-search-console-connect.md`) y el flow (`docs/ui/flows/TASK-1283-search-console-connect-flow.md`): layout del panel, copy ledger, state copy, a11y, máquina de estados del flujo OAuth cross-route, routing contract, failure paths y GVC plan.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Requiere TASK-1282 cerrado (contrato backend). Slice 1 (panel + estados) → Slice 2 (flujo OAuth + GVC). El panel se monta detrás del flag `GROWTH_SEARCH_CONSOLE_ENABLED` (heredado de TASK-1282).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Botón muerto sin capability | UI | medium | render read-only sin capability (no botón deshabilitado huérfano) | revisión GVC |
| Error crudo de Google en UI es-CL | UI | medium | mapear a copy es-CL canónico; nunca exponer el error del provider | revisión copy |
| Overflow horizontal del `site_url` largo | UI | low | truncar + tooltip; scrollWidth check 390px | GVC scroll-width |
| Confiar en el query param en vez del reader | UI/data | medium | re-derivar estado del reader siempre; el `?connected` es transitorio | revisión |

### Feature flags / cutover

- Hereda `GROWTH_SEARCH_CONSOLE_ENABLED` (TASK-1282): con OFF el panel no se monta / muestra locked. Sin flag propio nuevo.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | flag OFF / revert PR | <5 min | si |
| Slice 2 | flag OFF / revert PR | <5 min | si |

### Production verification sequence

1. Con TASK-1282 en staging + flag ON: render del panel en los 3 estados reales (not-connected / connected tras OAuth real / revoked tras revocar en Google).
2. GVC desktop+mobile de todos los estados + Dialog; revisar frames (enterprise, sin overflow, chip con texto).
3. Verificar a11y: `role=status` tras callback + Dialog focus trap + Esc.
4. Prod: tras verificación del consent screen de Google (TASK-1282) + flag ON controlado.

### Out-of-band coordination required

- N/A propio (la coordinación Google es de TASK-1282). Requiere TASK-1282 desplegado en staging para la verificación visual real.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Primitive decision documentada (`reuse`: card/chip/button/dialog + `BrandIsotypes`); cero primitive nueva.
- [ ] Copy 100% desde `src/lib/copy/*` (`GH_SEARCH_CONSOLE` + `getMicrocopy()`); cero literals en JSX para CTAs/estados/aria.
- [ ] Todos los estados del state inventory implementados (default/loading/empty/connecting/error/revoked/denied/mobile).
- [ ] Cero lógica de negocio en el componente (solo reader + commands de TASK-1282).
- [ ] Chip de estado con texto + ícono (no color-only); `role=status` tras callback; Dialog focus trap + Esc + restore.
- [ ] `scrollWidth==clientWidth` en desktop y 390px; sin overlaps ni console errors.
- [ ] Evidencia GVC desktop+mobile mirada de todos los estados + Dialog.
- [ ] Ruta de Integraciones alcanzable por nav o en `route-reachability-manifest.ts`.
- [ ] `UI ready` pasa a `yes` solo cuando `pnpm task:lint --task TASK-1283` queda sin findings.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm ui:wireframe-check --task TASK-1283`
- `pnpm ui:flow-check --task TASK-1283`
- `pnpm local:check:ui`
- `pnpm fe:capture search-console-connect --env=staging` (desktop + mobile) + revisión de frames

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1282 contrato, EPIC-020, TASK-1260)
- [ ] wireframe/flow marcados `implemented` al cierre

## Follow-ups

- Superficie de medición que consume los datos de Search Analytics (gráficos/KPIs de búsqueda por cliente).
- Selección de múltiples propiedades GSC si un cliente tiene varias.

## Open Questions

1. ¿Ruta canónica de la sección "Integraciones / Fuentes de datos" en el workspace (operador account-360 y portal cliente)? Resolver en Discovery contra `route-reachability-manifest.ts`. **Resuelto en el Delta 2026-06-28:** el host canónico es el account-360 del cliente (`src/views/greenhouse/agency/clients/**`), donde ya viven `NotionConnectPanel`/`TeamsConnectPanel`.
2. ¿El panel se ofrece primero en el lane operador (account-360) o en el portal cliente, o ambos a la vez? Propuesta: ambos como consumers del mismo componente; priorizar operador si el portal de Integraciones aún no existe. **Resuelto en el Delta 2026-06-28:** v1 = lane operador (account-360); el portal cliente self-service requiere un follow-up de TASK-1282 (route client-portal + grant `client_*` scope `own`) que no existe aún.

## Delta 2026-06-28 — reconciliación contra TASK-1282 (lo realmente shippeado) — Claude

TASK-1282 quedó **code-complete (rollout pendiente)** y commiteado (`b7f05877` + `b3ec781d` en develop). Al revisar esta UI contra el contrato real, emergen ajustes que el implementador DEBE conocer antes de empezar (el wireframe + flow son robustos y siguen vigentes; estos son los puntos de integración finos):

1. **Nombre del reader:** el contrato exporta `getSearchConsoleConnection(orgId)` (no `readSearchConsoleConnection`). Ya corregido en task/wireframe/flow.
2. **Rutas que EXISTEN hoy:** solo `GET /api/admin/growth/search-console/oauth/start` y `GET /api/admin/growth/search-console/oauth/callback` (lane **admin/operador**). **NO existe** un endpoint HTTP de `disconnect` (TASK-1282 shippeó el command `disconnectSearchConsoleProperty` pero sin route). → esta task debe **agregar un route POST de disconnect** que invoque el command (o coordinar un mini-follow-up de TASK-1282). Sumar a Files owned.
3. **El callback devuelve JSON, NO redirige al panel.** El flow asume `oauth/callback` → redirect a Integraciones con `?connected=1`/`?error=`. La implementación real del callback responde `NextResponse.json({ ok, status, siteUrl, organizationId })`. → para que el flujo cross-route funcione, el callback necesita un **modo redirect** (parametrizado por un `return_to` firmado o derivado) — agregarlo como ajuste de TASK-1282 en el Slice 2 de esta task, o un follow-up backend. Mientras no exista, el "retorno al panel con resultado" no es real.
4. **`oauth/start` exige `siteUrl` + `organizationId` upfront.** El start hornea `organizationId` (lane admin = la org del cliente objetivo, NO la del operador) + `siteUrl` en el `state` firmado, y verifica ownership de esa propiedad **post-consent**. → la UI "Conectar" **no puede** disparar `oauth/start` a ciegas: el operador debe **ingresar/elegir la propiedad** (`sc-domain:ejemplo.com` o `https://ejemplo.com/`) antes del redirect. Esto contradice el supuesto "v1 = la propiedad que el cliente autoriza" del wireframe → resolver: agregar un **campo de propiedad** en el zero-state (o un picker post-consent en un follow-up de TASK-1282). El `organizationId` objetivo sale del contexto del account-360 (la org del cliente), NUNCA del browser sin validar.
5. **Lane portal cliente NO está construido.** TASK-1282 grantea `growth.search_console.connect` solo al **set operador** (scope `tenant`) y solo expone rutas bajo `/api/admin/`. Un cliente self-conectándose necesitaría una route client-portal (org de sesión, scope `own`) + grant a `client_*` — ninguno existe. → **v1 de esta task = lane operador (account-360)**; el self-service del portal es un follow-up que primero amplía TASK-1282.
6. **Isotipo Google falta.** `src/components/greenhouse/brand/BrandIsotypes.tsx` tiene `NotionIsotype`/`TeamsIsotype`/`HubSpotIsotype` pero **no Google/Search Console**. → agregar `GoogleSearchConsoleIsotype` (preferir glyph Tabler `tabler-brand-google`; si no existe en el bundle, path simple-icons verificado como HubSpot — NUNCA hand-transcrito). Sumar a Files owned.
7. **Precedente directo a espejar:** `src/views/greenhouse/agency/clients/NotionConnectPanel.tsx` + `TeamsConnectPanel.tsx` son el patrón exacto (estado + CTA + isotipo + dialog). `SearchConsoleConnectionPanel` debe nacer como hermano de esos, montado en el account-360 del cliente.
8. **Flag heredado correcto:** `GROWTH_SEARCH_CONSOLE_ENABLED` (default OFF) gatea el panel — sin flag, no se monta / locked.

**Ajustes a Files owned (sumar):** `src/components/greenhouse/brand/BrandIsotypes.tsx` (Google isotype) + un route `POST /api/admin/growth/search-console/disconnect` + el ajuste del callback a modo redirect (si se hace acá y no como follow-up de TASK-1282). **Sigue bloqueada por TASK-1282** (code-complete pero rollout-pendiente: sin el consent screen de Google verificado + flag ON en staging, la verificación visual real con OAuth en vivo no es posible — usar estados mock para GVC mientras tanto).
