# TASK-1173 — UI interna de estado/activación ICO por cliente

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `delivery`
- Blocked by: `none`
- Branch: `task/TASK-1173-ico-client-sync-admin-ui`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Superficie interna que lista el estado ICO de cada cliente (escalera `not_connected → connected_not_enabled → enabled_not_calculating → calculating`) y permite **activar** el sync de un cliente con un click. Es la mitad "por UI" del objetivo Full API Parity de TASK-1171 (el "por API" ya existe). La UI es cliente de los contratos gobernados ya construidos — no reimplementa lógica.

## Why This Task Exists

TASK-1171 dejó la inclusión ICO de clientes 100% data-driven + gobernada por API: `POST /api/delivery/ico/enable-sync` (activar) y `GET /api/delivery/ico/sync-status` (verificar). Hoy un operador (Director de Cuenta / Ops) sólo puede activar/verificar vía API, no desde el portal. Esta task agrega el affordance visual para que el onboarding ICO de un cliente sea una acción de producto con clicks, sin tocar código ni llamar la API a mano.

## Goal

- Pantalla interna que muestra, por cliente, su estado ICO (con la escalera de `getClientIcoSyncStatus`) en lenguaje claro es-CL.
- Botón "Activar ICO" gobernado por la capability `delivery.ico.sync.enable` (oculto/deshabilitado si el usuario no la tiene), que invoca el endpoint existente con confirmación + feedback.
- Cero lógica de negocio nueva en el componente: consume los contratos gobernados de TASK-1171.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/metrics/ICO_DELIVERY_METRICS_AGENT_INVARIANTS.md` (§ ICO Client Inclusion)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md` + `docs/architecture/ui-platform/*`

Reglas obligatorias:

- La UI es cliente de los contratos gobernados (`enableClientIcoSync` / `getClientIcoSyncStatus`); NO reimplementa la lógica ni escribe `sync_enabled` directo.
- Loop GVC obligatorio (desktop + mobile) antes de declarar listo; nunca freehand.
- Toda string visible via `src/lib/copy/*` / nomenclatura canónica; nada de HEX/px/fontSize inline (tokens `theme.*`).
- Ruta `(dashboard)` alcanzable: declarar en `route-reachability-manifest.ts`; si necesita nav/page-guard, viewCode en `VIEW_REGISTRY` + migration seed en el mismo PR (gobernanza TASK-827/982). NUNCA `client_*`.

## Normative Docs

- `docs/manual-de-uso/operations/activar-ico-cliente.md` (el flujo operador que esta UI hace visual)
- `docs/documentation/delivery/inclusion-ico-clientes.md`

## Dependencies & Impact

### Depends on

- TASK-1171 (contratos `delivery.ico.sync.enable` / `delivery.ico.sync.read`, endpoints `POST /api/delivery/ico/enable-sync` y `GET /api/delivery/ico/sync-status`) — ya en `develop`.

### Blocks / Impacts

- Ninguna task bloqueada. Mejora la operabilidad del onboarding ICO.

### Files owned

- `src/app/(dashboard)/...` (nueva ruta page.tsx)
- `src/views/greenhouse/...` (vista)
- `src/lib/navigation/route-reachability-manifest.ts` (entrada)
- `src/lib/copy/*` (copy reusable si aplica)
- `docs/manual-de-uso/operations/activar-ico-cliente.md` (delta UI)

## Current Repo State

### Already exists

- Contratos gobernados (TASK-1171): `enableClientIcoSync`, `getClientIcoSyncStatus`, endpoints + capabilities + grants + outbox + reactive consumer.
- Reliability signal `delivery.ico.client_absent_from_org_rollup`.

### Gap

- No hay superficie visual para ver/activar el estado ICO por cliente; sólo API.
- No hay endpoint de LISTA (status de todos los clientes en una llamada) — decidir en Discovery si se agrega (pequeño, extiende el reader) o si la página itera la lista de clientes existente + status per-cliente.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: interno — EFEONCE_ADMIN / EFEONCE_OPERATIONS / EFEONCE_ACCOUNT (Director de Cuenta).
- Momento del flujo: onboarding/operación de un cliente; verificar por qué un cliente no muestra métricas ICO.
- Resultado perceptible esperado: ver de un vistazo qué clientes calculan ICO y activar los que no, con feedback claro.
- Friccion que debe reducir: hoy hay que llamar la API a mano para activar/verificar.
- No-goals UX: no es un dashboard de métricas ICO (eso ya existe); es operación de activación/estado.

### Surface & system decision

- Surface: ruta interna nueva (p.ej. `/admin/ico-sync` o sección en operations) — decidir en Discovery.
- Composition Shell: `aplica` — usar el shell canónico, no inventar grid ad-hoc.
- Primitive decision: `reuse` — `DataTableShell` (tabla con estados por fila) + `StatusChip`/badge para la escalera; botón canónico para la acción.
- Adaptive density / The Seam: `aplica` — la tabla nace adaptable a su ancho.
- Floating/Sidecar/Dialog decision: confirmación de "Activar ICO" via dialog/confirm canónico (acción gobernada → confirmar intención).
- Copy source: `src/lib/copy/*` (estados/CTAs reusables) + nomenclatura canónica.
- Access impact: `entitlements` (acción gated por `delivery.ico.sync.enable`) + posible `views` si la ruta necesita nav/page-guard.

### State inventory

- Default: lista de clientes con su estado ICO + acción.
- Loading: skeleton de tabla.
- Empty: sin clientes / sin resultados (copy es-CL).
- Error: fallo al leer estado (banner es-CL accionable).
- Degraded / partial: `calculating=null` (BQ no determinable) → estado "no se pudo verificar".
- Permission denied: usuario sin `delivery.ico.sync.enable` → ve estado pero sin botón activar (read gated por `delivery.ico.sync.read`).
- Long content: muchos clientes → tabla densa/paginada.
- Mobile / compact: tabla colapsa a cards.
- Keyboard / focus: navegación + acción accesibles por teclado; focus restore tras el dialog.
- Reduced motion: sin animación esencial.

### Interaction contract

- Primary interaction: click "Activar ICO" → confirm → POST enable-sync → feedback (éxito/idempotente/error canónico es-CL).
- Hover / focus / active: estados canónicos del botón/fila.
- Pending / disabled: botón en pending durante el POST; deshabilitado si ya `calculating` o sin capability.
- Escape / click-away: cierra el dialog sin activar.
- Focus restore: al cerrar el dialog, foco vuelve al botón origen.
- Latency feedback: spinner en el botón + toast al completar.
- Toast / alert behavior: éxito → toast; error → banner con el mensaje canónico (`ico_sync_source_not_connected` → "conectá Notion primero", no botón reintentar).

### Motion & microinteractions

- Motion primitive: `Motion` / CSS mínima.
- Enter / exit: entrada estándar de la tabla; dialog con la transición canónica.
- Layout morph: n/a.
- Stagger: opcional en filas.
- Timing / easing token: tokens de motion canónicos.
- Reduced-motion fallback: respetar `prefers-reduced-motion`.
- Non-goal motion: nada cinemático.

### Visual verification

- GVC scenario: nuevo scenario `ico-client-sync` bajo `scripts/frontend/scenarios/`.
- Viewports: desktop + mobile 390px.
- Required captures: default, con un cliente `connected_not_enabled` (acción visible), post-activación (estado/feedback).
- Required `data-capture` markers: `data-capture="ico-sync-table"`, `data-capture="ico-sync-row"`.
- Scroll-width check: sin scroll horizontal de página en desktop ni 390px.
- Accessibility/focus checks: tabla + acción + dialog operables por teclado.
- Before/after evidence: n/a (superficie nueva).
- Known visual debt: ninguna declarada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Lectura del estado por cliente

- Resolver la lista de clientes + su estado ICO (decidir en Discovery: endpoint de lista nuevo vs iterar `getClientIcoSyncStatus` per-cliente desde el server component).
- Vista server-component que arma el VM (estado por cliente, capability flags) y pasa props al cliente.

### Slice 2 — Tabla + acción gobernada

- `DataTableShell` con fila por cliente: nombre, estado (chip de la escalera), última sync, tareas/OTD del mes.
- Botón "Activar ICO" gated por `delivery.ico.sync.enable` → confirm dialog → `POST /api/delivery/ico/enable-sync` → feedback canónico.
- Estados loading/empty/error/degraded/permission/mobile.

### Slice 3 — Alcanzabilidad + GVC + docs

- Ruta alcanzable (`route-reachability-manifest` + viewCode/seed si aplica).
- Scenario GVC + capturas desktop+mobile miradas hasta enterprise.
- Delta en `docs/manual-de-uso/operations/activar-ico-cliente.md` (cómo hacerlo desde la UI).

## Out of Scope

- Métricas ICO detalladas / dashboards (ya existen).
- Conectar Notion del cliente (eso es el wizard de onboarding; esta UI sólo activa lo ya conectado).
- Desactivar sync (no hay command de disable en TASK-1171; sería follow-up).
- Cualquier cambio en los contratos backend de TASK-1171.

## Detailed Spec

La UI consume exclusivamente los contratos de TASK-1171. El estado se renderiza desde el outcome de `getClientIcoSyncStatus` (campos `stage`, `connected`, `enabled`, `calculating`, `lastSyncedAt`, `currentTotalTasks`, `currentOtdPct`). La acción invoca `POST /api/delivery/ico/enable-sync` con `{ clientId, reason }` y mapea la respuesta (`alreadyEnabled`, errores canónicos `ico_sync_client_not_found`/`ico_sync_source_not_connected`/`forbidden`) a feedback es-CL. La capability `delivery.ico.sync.read` gobierna ver la pantalla; `delivery.ico.sync.enable` gobierna el botón.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (lectura) → Slice 2 (tabla+acción) → Slice 3 (alcanzabilidad+GVC+docs). El GVC cierra al final.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Acción de activación expuesta sin capability | UI | low | Botón gated por `can('delivery.ico.sync.enable')` server-side + el command re-checkea (defensa en profundidad) | n/a (el command rechaza) |
| Activar un cliente equivocado | delivery | low | Confirm dialog con nombre del cliente + idempotencia del command | `delivery.ico.client_absent_from_org_rollup` |
| Ruta no alcanzable / viewCode sin seed | UI | medium | `route-reachability-gate` + seed en el mismo PR | gate CI |

### Feature flags / cutover

- Sin flag — UI aditiva, gated por capability. Cutover inmediato. Revert: revert PR.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR | <5 min | si |
| Slice 2 | revert PR | <5 min | si |
| Slice 3 | revert PR | <5 min | si |

### Production verification sequence

1. `pnpm dev` local + agent auth → render de la pantalla + estados.
2. GVC desktop + mobile mirado (enterprise) antes de pedir push.
3. Post-deploy staging: render + activar un cliente de prueba que esté `connected_not_enabled` (si existe) o verificar idempotencia sobre uno ya activo.

### Out-of-band coordination required

- N/A — repo-only change (consume contratos existentes).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La pantalla lista el estado ICO por cliente con la escalera correcta en copy es-CL.
- [ ] El botón "Activar ICO" sólo aparece/está habilitado con `delivery.ico.sync.enable` y dispara el endpoint gobernado con confirm + feedback canónico.
- [ ] Estados loading/empty/error/degraded/permission/mobile cubiertos.
- [ ] La UI no contiene lógica de negocio (solo consume los contratos de TASK-1171).
- [ ] Ruta alcanzable (manifest + viewCode/seed si aplica); sin scroll horizontal desktop ni 390px.
- [ ] GVC desktop + mobile capturado y mirado.

## Verification

- `pnpm local:check:ui`
- `pnpm test`
- `pnpm fe:capture ico-client-sync --env=staging` (desktop + mobile)
- Validación manual con agent auth (persona con/sin la capability).

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado
- [ ] evidencia GVC desktop+mobile adjunta/mirada

## Follow-ups

- Endpoint de lista (`GET /api/delivery/ico/sync-status` sin clientId → todos) si la iteración per-cliente no escala.
- Command de "desactivar ICO" (disable) gobernado, si emerge la necesidad.
- Exponer estas acciones como tools de Nexa (TASK-1172 / API Platform).
