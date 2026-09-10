# TASK-1857 — Creative Hub del portal cliente: materializar `/creative-hub` para Sky

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1857-sky-creative-hub-client-surface.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `EPIC-046`
- Status real: `Diseño 2026-09-10: decisión del operador (Creative Hub es el módulo contratado por Sky) y wireframe v2 de cinco bloques cliente; contrato backend documental tildado; sin JSX, sin GVC, sin rollout`
- Rank: `TBD`
- Domain: `ui|identity|delivery`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El bundle `creative_hub_globe_v1`, asignado a Sky Airlines y declarado como término comercial el 2026-09-10
(TASK-1852), incluye `cliente.creative_hub` → `/creative-hub`, y esa página no existe: las tres usuarias
activas de Sky ven un ítem «Creative Hub» en el menú que devuelve 404 y la señal
`identity.client_portal.assigned_view_without_route` marca 1. El operador resolvió el Slice 1 de TASK-1687
en sentido contrario al que asumía TASK-1685 §D3: Creative Hub ES el producto de Sky, así como SEO es el de
Berel. Esta task construye la página como lectura del cliente en cinco bloques (necesita tu respuesta · en
producción · entregado · cadencia y calidad bidireccional · pedir algo), reutilizando seis cards del módulo `creative-hub`
del registry y excluyendo las de gestión interna (revenue, tiers, aceleradores, RpA), con la puerta cambiada al primitive
de visibilidad del portal cliente. Decisión de contenido del operador 2026-09-10; wireframe v2.

## Why This Task Exists

Un módulo contratado con enlace muerto es la peor versión de la promesa: aparece en el menú y falla al
abrirlo. Retirarlo del bundle (la alternativa de TASK-1687) quitaría al cliente lo que compró. La única
salida coherente con el catálogo, con el término comercial declarado y con la señal de reliability es
materializar la superficie. El módulo ya existe para tenants con líneas legacy en `/capabilities/creative-hub`;
lo que falta es la ruta del `view_registry` y una puerta que no dependa de `businessLines/serviceModules`
legacy, que Sky no tiene.

## Goal

- `/creative-hub` responde 200 para una persona con `cliente.creative_hub` asignado y redirige a
  `/home?denied=creative-hub` para quien no lo tiene; internos entran por bypass D1 sin impersonar.
- La señal `identity.client_portal.assigned_view_without_route` baja a 0 sin tocar el bundle ni el menú.
- Cero implementación paralela de cards: la página consume `getCapabilityModuleData` y renderiza con `ModuleLayout`
  un subconjunto filtrado y retitulado de seis cards (override de título por bloque, sin tocar el registry).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` (§12.1 menú, §12.2 guard) y
  `docs/architecture/agent-invariants/ORG_CLIENT_AGENT_INVARIANTS.md`: la visibilidad `cliente.*` la responde
  el primitive único (`resolve-client-portal-visibility.ts`); los page guards usan `requireViewCodeAccess`.
- `docs/architecture/GREENHOUSE_CLIENT_SERVICE_EXPERIENCE_DECISION_V1.md` (EPIC-046): módulo contratado =
  término comercial + asignación; la UI es consumer.
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`, `UI_FEATURE_AGENT_INVARIANTS.md`,
  `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`, `DESIGN.md`.
- `docs/tasks/complete/TASK-982-navigation-reachability-governance-contract.md` y
  `docs/architecture/agent-invariants/NAVIGATION_SURFACE_ALLOCATION_CONTRACT.md`: el href ya existe en el
  `view_registry`; no se agrega destino nuevo al sidebar.

Reglas: **NUNCA** gatear la página con `hasAuthorizedViewCode`/`cliente.modulos` ni con
`verifyCapabilityModuleAccess` por líneas legacy (Sky devolvería 404 igual); **NUNCA** quitar ni versionar el
bundle de Sky; **NUNCA** filtrar `module_key` técnico al DOM; **NUNCA** importar stores del portal en browser.

## Normative Docs

- `docs/tasks/to-do/TASK-1687-creative-hub-view-code-without-route.md` (Delta 2026-09-10: decisión y traspaso).
- `docs/tasks/in-progress/TASK-1852-berel-sky-service-access-and-channel-enablement.md` y
  `docs/operations/client-service-enablement/berel-sky.v1.json` (Sky: `creative_hub_globe_v1`, tres personas).
- `src/lib/reliability/queries/client-portal-assigned-view-without-route.ts` (la señal que debe bajar a 0).
- `docs/tasks/complete/TASK-827-*.md` §Follow-ups (`capability-modules-resolver-migration`): el carril legacy
  de `/capabilities/[moduleId]` NO se migra aquí.
- Skills al implementar: `greenhouse-ai-design-studio` (orquestador), `greenhouse-ux`, `state-design`,
  `greenhouse-ux-writing`; al cerrar, `greenhouse-qa-release-auditor` y `greenhouse-documentation-governor`.

## Dependencies & Impact

### Depends on

- `greenhouse_core.view_registry` fila `cliente.creative_hub` (route `/creative-hub`, seed TASK-827) y el
  assignment vigente de `creative_hub_globe_v1` a Sky (`greenhouse_client_portal.module_assignments`).
- `CAPABILITY_REGISTRY['creative-hub']`, `getCapabilityModuleData`, `getCreativeHubQuery`
  (`src/lib/capability-queries/creative-hub.ts`) y sus fuentes `notion_ops.tareas/proyectos` + ICO.

### Blocks / Impacts

- TASK-1687 (cierre: señal en 0 cuando esta página exista; su migración de supersede no se escribe).
- TASK-1852 (readiness `authenticated_route` de Sky: la certificación de rutas de Sky exige esta página).
- Menú cliente de Sky: el ítem existente pasa de 404 a 200; ningún otro cliente cambia.

### Files owned

- `src/app/(dashboard)/creative-hub/page.tsx`, `loading.tsx`, `error.tsx` (nuevos).
- `src/views/greenhouse/client-portal/CreativeHubClientView.tsx` (vista consumer nueva) [propuesta].
- `docs/ui/visual-directions/TASK-1857-sky-creative-hub-client-surface.md` (dirección visual + component mapping).
- `src/lib/capabilities/get-capability-module-data.ts` sólo si hace falta un resolver por viewCode →
  módulo del registry sin líneas legacy (extensión, no reescritura).
- `scripts/frontend/scenarios/task1857-creative-hub.scenario.ts` (nuevo).
- `docs/ui/wireframes/TASK-1857-sky-creative-hub-client-surface.md`, `docs/ui/reviews/TASK-1857-*.md` (a producir).

## Current Repo State

### Already exists

- `src/views/greenhouse/GreenhouseCapabilityModule.tsx` (hero + `ModuleLayout`), `src/components/capabilities/`.
- `src/config/capability-registry.ts` (`creative-hub`, theme `creative`, 4 secciones de cards, fuentes declaradas).
- `src/lib/capabilities/get-capability-module-data.ts` con `allowRegistryFallback` y `getCreativeHubQuery`.
- `src/lib/client-portal/guards/require-view-code-access.ts`; patrón de page en `src/app/(dashboard)/equipo/page.tsx`.
- Copy: `GH_CLIENT_PORTAL_COMPOSITION.modulePublicLabels['creative-hub']` y estados denied/degraded/error
  (`src/lib/copy/client-portal.ts`); descriptor de nav `cliente.creative_hub` (`menu-builder.ts`).
- `src/app/(dashboard)/capabilities/[moduleId]/` (carril legacy gateado por `cliente.modulos` + líneas legacy).

### Gap

- No hay `page.tsx` bajo `src/app/(dashboard)/creative-hub/`.
- `getCapabilityModuleData` resuelve por `businessLines/serviceModules`; para Sky devuelve `null` salvo
  `allowRegistryFallback: true` [verificar en Discovery que el fallback conserva `hero`/cards completos].
- Sin escenario GVC ni dossier de revisión; sin evidencia de datos reales de Sky en `notion_ops`.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/app/(dashboard)/creative-hub/` + `src/views/greenhouse/` (consumer) sobre `src/lib/capabilities/**`.
- Future candidate home: `portal`
- Boundary: página = adapter Next.js del reader `getCapabilityModuleData`; la puerta es el primitive de
  visibilidad del portal cliente; ninguna regla de negocio en el componente.
- Server/browser split: page/loading/error server-only; `GreenhouseCapabilityModule` recibe DTO tipado.
- Build impact: `none` (sin dependencias nuevas; ruta adicional en el bundle del portal).
- Extraction blocker: sesión/autorización compartida y `capability-queries` acoplado a BigQuery/ICO.

## Hybrid Execution Justification

- Why not split: el único trabajo backend es dejar que un reader existente se resuelva por viewCode asignado
  en vez de por líneas legacy (una rama en `getCapabilityModuleData` o su llamada con `allowRegistryFallback`);
  sin migración, sin schema, sin command. Partirlo crearía una task de una línea bloqueando a la UI.
- Primary execution profile: `ui-ux`.
- Contract boundary: `requireViewCodeAccess('cliente.creative_hub')` decide acceso; `getCapabilityModuleData`
  decide datos; la página no mezcla ambos ni añade lógica.
- Risk controls: el reader no cambia para `/capabilities/[moduleId]` (misma firma, fallback opt-in); test
  focal del resolver + GVC negativo (persona sin módulo) antes de merge.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-lite`
- Impacto principal: `reader`
- Source of truth afectado: `getCapabilityModuleData` (lectura; `notion_ops`/ICO no cambian)
- Consumidores afectados: página `/creative-hub` (nueva) y `/capabilities/[moduleId]` (sin cambio de comportamiento)
- Runtime target: `local` + `staging` + `production` (Vercel)

### Contract surface

- Contrato existente a respetar: `CapabilityModuleData` (`src/types/capabilities.ts`), `CapabilityQueryBuilder`.
- Contrato nuevo o modificado: ninguno público; opción de resolución por viewCode asignado (fallback al registry) en el reader.
- Backward compatibility: `compatible`
- Full API parity: superficie de lectura ya expuesta por `/api/capabilities/**` [verificar]; la UI consume el reader server-side, sin endpoint ad hoc.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna escrita; lectura de `view_registry`, `module_assignments`, `notion_ops.*`, ICO.
- Invariantes que no se pueden romper:
  - la visibilidad `cliente.*` la decide el primitive único; el reader nunca autoriza.
  - un `null` de ICO/CVR produce sección parcial, nunca ceros sustitutos.
- Write-target allowlist: `N/A` (sin writes).
- Tenant/space boundary: `organizationId` resuelto server-side desde la sesión (`resolveClientPortalOrganizationId`); `clientId/projectIds` del tenant context.
- Idempotency/concurrency: lectura pura.
- Audit/outbox/history: ninguno; la señal `identity.client_portal.assigned_view_without_route` es la evidencia.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `enabled with rationale` — la página sólo es alcanzable para quien ya tiene el módulo asignado; no hay flag porque no hay write ni cohorte nueva.
- Backfill plan: `N/A`
- Rollback path: `revert PR` (vuelve el 404; la señal vuelve a 1).
- External coordination: ninguna; sin env vars, sin redeploy de workers.

### Security and access

- Auth/access gate: `requireServerSession` + `requireViewCodeAccess('cliente.creative_hub')` (views); bypass interno D1.
- Sensitive data posture: datos operativos del cliente ya expuestos por el módulo; sin PII nueva.
- Error contract: `error.tsx` con copy canónico; `captureWithDomain` en el reader; sin errores crudos.
- Abuse/rate-limit posture: `none with rationale` — lectura autenticada de una sola organización.

### Runtime evidence

- Local checks: test focal del resolver (persona sin líneas legacy + módulo asignado → data); `pnpm local:check:ui`.
- DB/runtime checks: readback de `module_assignments` de Sky (read-only) y de la señal antes/después.
- Integration checks: GVC en staging con persona técnica con el módulo asignado; negativo `denied`.
- Reliability signals/logs: `identity.client_portal.assigned_view_without_route` 1 → 0.
- Production verification sequence: ver Rollout Plan.

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects (Backend/Data Contract, 2026-09-10).
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit (lectura pura; guard por primitive).
- [x] Toda tabla nueva queda declarada en el allowlist de destinos de escritura del dominio — `N/A`, sin tablas nuevas.
- [x] Migration/backfill/rollback posture is explicit and proportional to risk (`none` / revert PR).
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## UI/UX Contract

### Paquete de diseño — 2026-09-10

- Dirección: [alternativas, tesis y component mapping por bloque](../../ui/visual-directions/TASK-1857-sky-creative-hub-client-surface.md) (C «hoja de trabajo creativa» seleccionada; A módulo interno y B tablero de pipeline descartadas).
- [Wireframe v2](../../ui/wireframes/TASK-1857-sky-creative-hub-client-surface.md): cinco bloques, desktop/390, copy ledger es-CL, estados, accesibilidad, mapping y plan GVC.
- Flow y motion: `none` (lectura sin sidecar/modal/transiciones; motion sólo el de las primitives).
- Los contratos son diseño, no runtime: el DTO de revisión (rondas, comentarios abiertos) debe verificarse contra el snapshot real de Sky en Discovery. `UI ready: no` hasta primer fold, GVC premium y scorecard.

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: persona cliente de Sky con `cliente.creative_hub` asignado; interno en modo soporte.
- Momento del flujo: menú Módulos → Creative Hub (o deep link) → lectura del estado creativo del período.
- Resultado perceptible esperado: la página abre con el nombre de la cuenta, un resumen y las secciones del módulo; lo que está en revisión o trabado se ve en el primer fold o a un scroll.
- Friccion que debe reducir: enlace muerto (404) y desconfianza en el menú.
- No-goals UX: editor/visor de assets, briefs/solicitudes, selector de período nuevo, rediseño de las cards.

### Surface & system decision

- Surface: `/creative-hub` (href del `view_registry`), página hoja del portal cliente.
- Nav placement: `none` — el ítem ya existe en el sidebar dinámico cliente (`VIEW_CODE_NAV_DESCRIPTOR['cliente.creative_hub']`, grupo Módulos); no se agrega destino.
- Composition Shell: `aplica` — `SurfaceRecipe kind='analyticsReport' plane='none'` con `WorkbenchHeader kind='report'` en `header`; B1–B5 como `OperationalSection` abiertas/banda en `regions.primary` (D57-01).
- Primitive decision: `reuse` — surface system + `OperationalSignalList`, `SignalStrip integrated`, `MetricSummaryCard`, `GreenhouseActivityTimeline`, `CapabilityCard type='pipeline'`; builders de datos del módulo sin cambios; sin primitive nueva (tabla en la dirección visual).
- Adaptive density / The Seam: `aplica` — `density='auto'` en `OperationalSection`, `SignalStrip`, `MetricSummaryCard`; la señal principal de cada bloque sobrevive `condensed/peek`.
- Floating/Sidecar/Dialog decision: ninguno.
- Copy source: `src/lib/copy/client-portal.ts` + títulos del `capability-registry.ts` (deuda es-CL declarada en el wireframe).
- Access impact: `views` (`cliente.creative_hub`); sin entitlements ni routeGroups nuevos.

### State inventory

- Default: hero + secciones con datos del corte vigente y fuente/corte visibles.
- Loading: `loading.tsx` con estructura estable (hero + 3 cards), `aria-label` canónico.
- Empty: «Sin actividad creativa en este período» cuando la fuente existe y el snapshot está vacío; distinto de «sin fuente».
- Error: `error.tsx` con `error.fallbackTitle/Body/Cta`; sin detalle técnico.
- Degraded / partial: secciones ICO/CVR ausentes se ocultan con nota; nunca ceros.
- Permission denied: redirect `/home?denied=creative-hub` → `<ModuleNotAssignedEmpty>` con `modulePublicLabels['creative-hub']`.
- Long content: listas largas hacen wrap; charts con scroll interno propio.
- Mobile / compact: una columna, `size` → `full`, enlaces ≥44px.
- Keyboard / focus: foco al `h1`; orden DOM = visual; enlaces de proyecto con nombre completo.
- Reduced motion: sin animación de entrada; ningún significado depende de movimiento.

### Interaction contract

- Primary interaction: abrir un proyecto en foco (enlace).
- Hover / focus / active: affordances del enlace MUI + foco visible del theme.
- Pending / disabled: sin botones; el pending es la carga de la ruta.
- Escape / click-away: no aplica (sin overlays).
- Focus restore: navegación estándar del shell.
- Latency feedback: skeleton server-side; sin optimistic UI.
- Toast / alert behavior: banner `degraded` persistente cuando aplique; sin toasts.

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: contenido legible de inmediato.
- Layout morph: ninguno.
- Stagger: ninguno.
- Timing / easing token: no aplica.
- Reduced-motion fallback: idéntico al default.
- Non-goal motion: counters, confetti, scroll-jacking.

### Implementation mapping

- Route / surface: `src/app/(dashboard)/creative-hub/page.tsx` (+ `loading.tsx`, `error.tsx`), `dynamic = 'force-dynamic'`.
- Primitive / variant / kind: `SurfaceRecipe analyticsReport plane='none'`; `WorkbenchHeader report`; `OperationalSection open|band|quiet`; `OperationalSignalList`; `SignalStrip integrated`; `MetricSummaryCard density='auto'`; `GreenhouseActivityTimeline`; `CapabilityCard type='pipeline'` (mapping por bloque en la dirección visual).
- Component candidates: vista nueva `src/views/greenhouse/client-portal/CreativeHubClientView.tsx` [propuesta] sobre `src/components/greenhouse/primitives/surface-system/*` y `src/components/capabilities/CapabilityCard.tsx`.
- Copy source: `src/lib/copy/client-portal.ts`, `src/config/capability-registry.ts`.
- Data reader / command: `getCapabilityModuleData({ moduleId: 'creative-hub', tenant, allowRegistryFallback: true })` tras el guard.
- API parity: lectura; sin command. Camino programático existente `/api/capabilities/**` [verificar].
- Access / capability: `requireViewCodeAccess('cliente.creative_hub')`.
- States to implement: todos los del inventario.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/task1857-creative-hub.scenario.ts` (propuesto).
- Route: `/creative-hub`.
- Viewports: 1440×900 y 390×844.
- Quality profile: `premium`.
- Required steps: login persona técnica con el módulo asignado (staging) → menú → página → scroll por secciones → persona sin módulo → denied.
- Required captures: first fold, review pipeline, supply chain, denied, 390px.
- Required `data-capture` markers: `creative-hub-hero`, `creative-hub-delivery`, `creative-hub-review`, `creative-hub-supply-chain`.
- Assertions: 200/redirect exactos; `h1` con nombre de cuenta; sin `module_key` en DOM; sin ítems de menú muertos.
- Scroll-width checks: `scrollWidth === clientWidth` en ambos viewports.
- Reduced-motion / focus evidence: captura con preferencia reducida; foco visible en enlaces.
- Review dossier: `docs/ui/reviews/TASK-1857-sky-creative-hub-client-surface.md` (a producir con captura).
- Baseline decision / surface ID: baseline de `/capabilities/creative-hub` (tenant legacy) como referencia; candidate `/creative-hub`.

### Design decision log

- Decision (v2 2026-09-10): materializar la ruta como lectura del cliente en cinco bloques con seis cards reutilizadas y retituladas; excluir las cards de gestión interna; puerta por módulo asignado.
- Alternatives considered: supersede del bundle (descartada por el operador); rewrite a `/capabilities/creative-hub` (404 igual por líneas legacy); cards nuevas (duplicación).
- Why this pattern: menor blast radius, una sola implementación, cierra la señal sin tocar catálogo.
- Reuse / extend / new primitive: reuse (surface system + primitives listadas); extend sólo con evidencia GVC; sin primitive nueva.
- Open risks: datos vacíos para Sky; títulos legacy en inglés; hero sin momento dominante en 390px.

### Visual verification

- GVC scenario: el escenario focal, obligatorio antes de cierre.
- Viewports: desktop y 390px.
- Required captures: las de arriba, más before/after de la señal.
- Required `data-capture` markers: los cuatro declarados.
- Scroll-width check: `scrollWidth === clientWidth`.
- Accessibility/focus checks: encabezados, alternativas textuales de charts, foco visible, reduced motion.
- Before/after evidence: 404 actual vs 200; señal 1 → 0.
- Known visual debt: títulos de cards en inglés; módulo fuera del Composition Shell.
- Visual scorecard: `docs/ui/reviews/TASK-1857-sky-creative-hub-client-surface.scorecard.json`
- Quality threshold: average >= 4.5; floor >= 4; hierarchy/surface economy/visual impact/fidelity/template resistance >= 4.5 (estándar premium vigente).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Resolver por módulo asignado (reader)

- Verificar que `getCapabilityModuleData({ moduleId: 'creative-hub', tenant, allowRegistryFallback: true })`
  devuelve hero + cards completos para un tenant sin líneas legacy; si el fallback pierde contenido, extender
  el reader con resolución por viewCode asignado sin cambiar la firma. Test focal.

### Slice 2 — Página `/creative-hub`

- `page.tsx` con el patrón de `/equipo`: sesión, `requireViewCodeAccess('cliente.creative_hub')`, tenant, reader y
  render de `CreativeHubClientView` (nueva vista consumer) con `SurfaceRecipe analyticsReport plane='none'`,
  `WorkbenchHeader report` y los cinco bloques según el component mapping de la dirección visual; títulos y vacíos desde
  `src/lib/copy/client-portal.ts`. `loading.tsx` y `error.tsx` con copy canónico. Marcadores `data-capture`.
- `pnpm route-reachability-gate` y `pnpm nav:budget` verdes (href ya declarado en el `view_registry`).

### Slice 3 — Evidencia y cierre

- Escenario GVC, capturas desktop/390, dossier y scorecard premium; negativo `denied`.
- Readback de la señal en staging y producción tras el release (1 → 0). Deltas en TASK-1687 y TASK-1852.

## Out of Scope

- Migrar el carril legacy `/capabilities/[moduleId]` al primitive de visibilidad (follow-up de TASK-827).
- Retitular las cards del registry a es-CL (sweep compartido, follow-up).
- Cambios al bundle `creative_hub_globe_v1`, al menú, a términos comerciales o a Notifications.
- Apply de habilitación, invitaciones o mensajes a Sky (TASK-1852, sesión humana).

## Detailed Spec

Contrato de diseño normativo en el wireframe enlazado. La página es un adapter: guard → tenant → reader →
vista. Cualquier lógica de acceso, período o filtrado vive en `src/lib/**`. Si Discovery encuentra que los
datos de Sky no llegan por `notion_ops`, la página debe mostrar el estado `empty` honesto y la task lo
registra como hallazgo, no lo disimula.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 → Slice 2 → Slice 3. No se abre la ruta sin el negativo `denied` probado.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El fallback al registry devuelve un módulo sin datos (hero vacío) | capabilities reader | media | Test focal con tenant sin líneas legacy; estado `empty` explícito | GVC first fold; captura vacía |
| La puerta deja pasar a quien no tiene el módulo | identity/portal | baja | `requireViewCodeAccess` (primitive único); GVC negativo | `client-portal-visibility-baseline.ts` |
| Regresión en `/capabilities/[moduleId]` | portal legacy | baja | Firma del reader intacta; fallback opt-in | smoke de esa ruta con tenant legacy |
| Datos de Sky vacíos en producción | datos | media | Estado `empty` honesto; hallazgo documentado | readback tras release |

### Feature flags / cutover

Sin flag: la alcanzabilidad la gobierna el módulo asignado. No se declara `*_ENABLED` nuevo.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revert del cambio del reader | <5 min | sí |
| 2 | revert PR (vuelve el 404; señal vuelve a 1) | <5 min | sí |
| 3 | nada que revertir (evidencia) | — | sí |

### Production verification sequence

1. Staging: `/creative-hub` 200 con persona técnica con módulo; `denied` sin módulo; `/capabilities/creative-hub` intacto.
2. Release por el control plane (`greenhouse-production-release`).
3. Producción: la misma persona técnica → 200; señal `identity.client_portal.assigned_view_without_route` = 0.
4. Certificación de ruta de Sky en TASK-1852 (`authenticated_route`) con su sesión real, cuando el operador la autorice.

### Out-of-band coordination required

Ninguna credencial ni env var. La certificación con usuarias reales de Sky la autoriza el operador (TASK-1852).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `/creative-hub` responde 200 con hero + secciones para una persona con `cliente.creative_hub` asignado y sin líneas legacy.
- [ ] Persona sin el módulo → redirect exacto `/home?denied=creative-hub` con `<ModuleNotAssignedEmpty>` «Creative Hub».
- [ ] Interno entra por bypass D1 sin impersonar; ninguna sesión `authMode=agent` obtiene privilegios extra.
- [ ] `/capabilities/[moduleId]` conserva su comportamiento (smoke con tenant legacy).
- [ ] Estados loading/empty/partial/error/denied implementados con copy canónico; sin `module_key` técnico en el DOM.
- [ ] Charts con alternativa textual; `scrollWidth === clientWidth` en 1440 y 390.
- [ ] GVC premium desktop/390 con los cuatro `data-capture`; dossier y scorecard con promedio ≥ 4.5 y piso 4.
- [ ] `route-reachability-gate`, `nav:budget`, `design-contract:lint`, `ui:code-lint`, `ui:visual-gate`, `ui:quality` verdes.
- [ ] Señal `identity.client_portal.assigned_view_without_route` = 0 en producción tras el release.
- [ ] UI ready permanece `no` hasta mapping, first fold, GVC y decision log sellados; `pnpm task:lint --task TASK-1857` sin findings al pasarlo a `yes`.

## Verification

- `pnpm task:lint --task TASK-1857` (template=1, errors=0, warnings=0) al registrar.
- Implementación: `pnpm local:check:ui`, test focal del reader, `pnpm fe:capture task1857-creative-hub --env=staging`, `pnpm qa:gates --changed`.
- Runtime: readback read-only de `module_assignments` de Sky y de la señal antes/después; nunca fixtures con datos de cliente.
- `pnpm docs:closure-check`; después de toda edición `pnpm docs:context-check:strict`.

## Closing Protocol

- [ ] Status real, Lifecycle y carpeta reflejan evidencia; sin release se conserva abierta.
- [ ] Criterios tildados con evidencia concreta (capturas, señal, gates).
- [ ] Deltas en TASK-1687 (cierre) y TASK-1852 (readiness de ruta de Sky); README/registry al día.
- [ ] Docs funcional/manual del portal cliente: Creative Hub como módulo con ruta; Handoff/changelog.

## Follow-ups

- Sweep es-CL de títulos del `capability-registry.ts` (afecta `/capabilities/*`).
- `capability-modules-resolver-migration` (TASK-827 §Follow-ups): migrar el carril legacy al primitive.

## Open Questions

- ¿Los datos creativos de Sky llegan por `notion_ops` o por Globe? Discovery lo verifica; si no llegan, la
  página abre en `empty` honesto y se decide con el operador la fuente (fuera de esta task).
