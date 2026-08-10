# TASK-1686 — Navegación del colaborador puro: rail personal preservado y avatar coherente

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-08-10 — revisión post-cierre de TASK-1388: la task SIGUE teniendo cabida, con el gap re-dimensionado

Verificado contra el runtime que TASK-1388 dejó en `develop` (commits `814b8b088`…`7f21e3d14`) + la DB:

- **La exposición REAL del rail es menor que la que describe el "Why #1".** Medido en
  `role_view_assignments`: el rol `collaborator` tiene **27 vistas y CERO `cliente.*`** — con claims
  reales, `canSeeView('cliente.*', true)` filtra TODAS las hojas cliente del rail. El caso "claims
  vacíos hace visibles rutas cliente" existe pero es un borde (sesiones degradadas / personas agente),
  no la experiencia del colaborador real.
- **El gap user-visible que la spec NO menciona: la sección "Mi Cuenta" se pushea INCONDICIONAL** en
  la rama no-interna — para el colaborador real (sin `cliente.*`) sus children quedan vacíos y el rail
  muestra un heading "Mi Cuenta" sin contenido. Evidencia directa a favor del Slice 2.
- **El agujero principal vigente es el avatar, tal como dice el "Why #2", y es SIN gating:** la rama
  no-interna del `UserDropdown` renderiza Proyectos/Ciclos/'Mi Greenhouse' (label de `GH_CLIENT_NAV.settings` → `/settings`)/Novedades **incondicionalmente**
  (sin `canSeeView`), así que el colaborador real los ve aunque no puede abrirlos. TASK-1388 le dejó de
  regalo el header clickeable → Mi Perfil (ya funciona para collaborator), pero los shortcuts cliente
  siguen.
- **El "Why #3" y "#4" siguen exactos:** los tests de identidad de TASK-1388 fijan presencia/superset,
  no la AUSENCIA de rutas cliente para collaborator; y no existe GVC con `agent-collaborator`.
- **El trigger del avatar sigue sin semántica** (Avatar/Badge con onClick, sin role/aria-haspopup):
  TASK-1388 cerró los 4 hallazgos a11y heredados de TASK-1675 pero este no estaba en esa lista. Vigente.
- **Cero conflictos con lo shippeado:** la matriz de audiencias de esta spec coincide con el estado
  real (internal = zonas TASK-1388 sin `/my/*`; client = TASK-1675 byte-equivalente; builder
  `buildMyNavItems` como SSOT ya existe y el avatar interno ya lo consume). Las fronteras declaradas
  con TASK-1685 (policy) y TASK-1389 (budget interno) siguen correctas.

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1686-pure-collaborator-navigation.md`
- Flow: `docs/ui/flows/TASK-1686-pure-collaborator-navigation-flow.md`
- Motion: `docs/ui/motion/TASK-1686-pure-collaborator-navigation-motion.md`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseño y contrato de implementación completos; no iniciada`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Un colaborador puro (routeGroups=['my']) comparte la rama no-interna con el portal cliente. Por eso recibe rutas y copy cliente en rail y avatar aunque su workspace es /my. Esta task separa la proyección visual: rail como índice completo de **Mi Ficha**, avatar como identidad + **Mi Perfil** + salida; cero destinos cliente. No modifica autorización, rutas, datos ni módulos.

## Why This Task Exists

TASK-1388 dejó explícitamente esta audiencia como follow-up. El builder personal está bien, pero la audiencia no:

1. VerticalMenu agrega /my y Mi Ficha para my, pero también ejecuta clientPrimaryItems, Módulos y Mi Cuenta. Con authorizedViews vacío, canSeeView(..., true) hace visibles rutas cliente.
2. UserDropdown calcula myNavItems y profileHref, pero su rama no-interna pinta shortcuts de cliente.
3. Los tests sólo prueban que TASK-1675 no elimine /my/*; no fijan la ausencia de rutas cliente.
4. No hay GVC de agent-collaborator@greenhouse.efeonce.org, cuya sesión real es collaborator / my / /my.

Ocultar menú no cambia guards. Un deep-link cliente interno puede seguir pasando un bypass existente; eso es policy de TASK-1685 y queda fuera.

## Goal

- Rail collaborator puro: /my + Mi Ficha construida por buildMyNavItems + recursos plataforma concedidos; nunca cliente.
- Avatar collaborator puro: identidad, CTA visible/accesible Mi Perfil y salida; no shortcut cliente ni espejo de 13 hojas.
- Cliente, interno e híbrido conservan exactamente la conducta vigente; no cambia URL, viewCode, grant, claim, guard o módulo.
- Tests de identidad y GVC premium collaborator verifican desktop, 390 px, cmdk y a11y.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`.
- `docs/architecture/GREENHOUSE_SIDEBAR_ARCHITECTURE_V1.md` (histórica; runtime/TASK-1388 prevalecen).
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`.
- `docs/architecture/ui-platform/README.md`.
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`.
- `docs/tasks/complete/TASK-1388-vertical-menu-restructure.md`.
- `docs/tasks/complete/TASK-1675-client-portal-menu-module-driven.md`.
- `docs/tasks/to-do/TASK-1685-client-portal-single-visibility-primitive.md`.

Reglas obligatorias:

- **NUNCA** tocar routeGroups, authorizedViews, roles, viewCodes, assignments, modules, resolvers, page guards ni fallback de autorización.
- **NUNCA** mover /my/* al avatar ni mapear allí buildMyNavItems completo: rail es el índice de trabajo.
- **NUNCA** cambiar merge cliente aditivo de TASK-1675; separar audiencia antes de crear colección cliente.
- **NUNCA** mantener Avatar/badge clickeables sin semántica: trigger debe tener nombre, teclado, aria-haspopup, aria-expanded y aria-controls.
- **SIEMPRE** preservar gates contractor/documento y demostrar que deep-link policy no cambió.
- Si aparece cambio de authorization, **detener** y derivar a TASK-1685/ADR.

## Normative Docs

- `docs/tasks/TASK_TEMPLATE.md` — estructura y Zonas canónicas.
- `docs/tasks/TASK_UI_UX_ADDENDUM.md` — contrato `ui-standard` y evidencia GVC.
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md` — placement metadata; no autoriza extracción.
- `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md` — escenarios, capturas y dossier GVC.

## Dependencies & Impact

### Depends on

- `src/components/layout/vertical/VerticalMenu.tsx`.
- `src/components/layout/shared/UserDropdown.tsx`.
- `src/lib/navigation/my-nav-items.ts` — SSOT de hojas/gates personales.
- `src/config/greenhouse-nomenclature.ts` y `src/config/greenhouse-navigation-copy.ts`.
- `src/lib/navigation/route-reachability-manifest.ts`.
- `src/app/(dashboard)/layout.tsx` — clientNavItems server-side.

### Blocks / Impacts

- Cierra follow-up collaborator de TASK-1388; no reabre su rail interno.
- Conserva menú/módulos cliente TASK-1675.
- TASK-1685 toca VerticalMenu pero no bloquea: si cambia policy, rebasa sobre su primitive y separa scope.
- TASK-116/TASK-1389 son internos, no dueños de collaborator.

### Files owned

- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/components/layout/vertical/VerticalMenu.test.tsx`
- `src/components/layout/shared/UserDropdown.tsx`
- `src/components/layout/shared/UserDropdown.test.tsx` (nuevo)
- `src/config/greenhouse-nomenclature.ts` + `src/config/greenhouse-navigation-copy.ts` (tokenizar los section labels literales 'Mi Ficha'/'Mi Cuenta'/'Módulos' que el Slice 2 toca; espejo en-US obligatorio)
- `src/lib/navigation/route-reachability-manifest.ts` (sólo si su razón deja de describir runtime)
- `scripts/frontend/scenarios/task-1686-pure-collaborator-navigation.scenario.ts` (nuevo)
- `scripts/frontend/scenarios/task-1686-pure-collaborator-mobile-drawer.scenario.ts` (nuevo)
- `docs/ui/{visual-directions,wireframes,flows,reviews}/TASK-1686-pure-collaborator-navigation*`
- `scripts/frontend/baselines/task-1686-pure-collaborator-navigation/`

## Current Repo State

### Already exists

- buildMyNavItems modela las 13 hojas personales, MY_NAV_HOME y gates dinámicos.
- /my conserva guards server-side mi_ficha.* + routeGroups.includes('my').
- Avatar ya recibe avatarUrl de servidor y resuelve profileHref.
- GlobalCommandPalette ya filtra route groups + authorized views.
- TASK-1388 cerró ring rail, scroll mobile, toggle y overflow drawer.

### Gap

- La rama no-interna mezcla collaborator/client, incluido claim vacío.
- Avatar calcula datos personales pero renderiza salida cliente.
- Trigger avatar no es control semántico completo.
- No existe test UserDropdown, GVC, baseline ni scorecard collaborator.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: shell portal en VerticalMenu.tsx y UserDropdown.tsx.
- Future candidate home: `portal`
- Boundary: sesión serializada + buildMyNavItems; consumers rail/avatar.
- Server/browser split: Client Components leen sesión/avatarUrl ya resuelto; sin DB, secrets, SDK ni fetch nuevo.
- Build impact: `none`
- Extraction blocker: renderer Vuexy/session shape compartidos; no package nuevo.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: collaborator puro (routeGroups=['my']); agent-collaborator@greenhouse.efeonce.org.
- Momento del flujo: llega a /my, encuentra trabajo; abre avatar para perfil o salir.
- Resultado perceptible esperado: rail = mi trabajo; avatar = mi identidad; cero lenguaje/acciones cliente.
- Fricción que debe reducir: destinos ajenos, duplicación y trigger inaccesible.
- No-goals UX: MyDashboardView, chrome Vuexy, portal cliente, rail interno, Command Palette y taxonomía Mi Ficha.

### Surface & system decision

- Surface: rail desktop, drawer 390 px y UserDropdown collaborator.
- Composition Shell: `no aplica` — navegación persistente.
- Primitive decision: `reuse` — Vuexy GenerateVerticalMenu, MUI control, MenuList/Popper, builder y nomenclatura; sin primitive nueva.
- Adaptive density / The Seam: `no aplica`.
- Floating/Sidecar/Dialog decision: Popper/drawer existentes; trigger avatar semántico.
- Copy source: GH_MY_NAV mediante getGreenhouseNavigationCopy.
- Access impact: `none` — proyección; guards siguen frontera.

### State inventory

- Default: rail /my + Mi Ficha; avatar identidad + Mi Perfil + salir.
- Loading: fallback avatar existente; no fetch.
- Empty: /my permanece; nunca se llena con cliente.
- Error: N/A; shell conserva sesión actual.
- Degraded / partial: flags contractor/documento y vistas filtran sólo sus hojas.
- Permission denied: hoja/CTA se omite; nunca href roto.
- Long content: rail scrollable; avatar compacto.
- Mobile / compact: drawer equivalente; Popper contenido 390 px.
- Keyboard / focus: trigger semántico, Enter/Espacio, foco, Escape/click-away y restore.
- Reduced motion: estado final de Fade/drawer equivalente.

### Interaction contract

- Primary interaction: rail para trabajo; avatar para perfil/salida.
- Hover / focus / active: estilos canónicos MUI/Vuexy y foco visible.
- Pending / disabled: no command; CTA se omite sin href.
- Escape / click-away: cierra Popper sin navegación.
- Focus restore: vuelve al trigger.
- Latency feedback: N/A.
- Toast / alert behavior: N/A; signOut existente.

### Motion & microinteractions

- Motion primitive: `none` — Fade/drawer existentes no cambian.
- Enter / exit: Popper actual.
- Layout morph: `none`.
- Stagger: `none`.
- Timing / easing token: N/A.
- Reduced-motion fallback: GVC verifica equivalencia final.
- Non-goal motion: drawer, acordeón, CmdK y rutas.

### Implementation mapping

- Route / surface: /my y /my/* existentes; sin URL nueva.
- Primitive / variant / kind: predicado isPureCollaborator; trigger y MenuItem MUI.
- Component candidates: VerticalMenu, UserDropdown, tests; builder sólo si evita metadata duplicada.
- Copy source: GH_MY_NAV.dashboard/profile; cero literal nuevo.
- Data reader / command: ninguno.
- API parity: N/A.
- Access / capability: builder/page guards sin cambio.
- States to implement: collaborator normal/partial/no profile; client/internal/hybrid/my+client controls.

### GVC scenario plan

- Scenario file: los dos escenarios TASK-1686 declarados arriba.
- Route: /my con AGENT_AUTH_EMAIL=agent-collaborator@greenhouse.efeonce.org y storage state específico; nunca superadmin.
- Viewports: 1440×900 e iPhone 13/390 px.
- Quality profile: `premium`.
- Required steps: rail; avatar/perfil y ausencia cliente; Escape/click-away/foco; drawer; CmdK busca my/excluye cliente.
- Required captures: rail desktop, avatar, focus trigger/rail, cmdk, drawer y avatar mobile.
- Required data-capture markers: portal-vertical-nav, avatar-trigger, avatar-dropdown, cmdk-open; sólo nuevo marker semántico.
- Assertions: no login/error boundary/console/page/hydration/4xx/5xx; ausencia cliente; no overflow.
- Scroll-width checks: documento, drawer y Popper: scrollWidth === clientWidth.
- Reduced-motion / focus evidence: reducedMotionCheck, ring, trigger y restore.
- Review dossier: pnpm fe:capture:review <capture-dir>.
- Baseline decision / surface ID: task-1686-pure-collaborator-navigation tras Apto.

### Design decision log

- Decision: rail = índice trabajo; avatar = identidad + perfil + salida.
- Alternatives considered: herencia cliente; espejo de 13 hojas; mover Mi Ficha avatar.
- Why this pattern: elimina información falsa sin duplicar ni vaciar trabajo.
- Reuse / extend / new primitive: reuse; bifurcación audiencia + a11y trigger.
- Open risks: deep-link cliente queda TASK-1685.

### Visual verification

- GVC scenario: collaborator real + control unitario client/internal/hybrid.
- Viewports: 1440×900 y 390 px.
- Required captures: rail, avatar, cmdk, drawer, focus.
- Required data-capture markers: existentes + sólo semántico necesario.
- Scroll-width check: cero documento/drawer/Popper overflow.
- Accessibility/focus checks: axe, name/expanded/controls, teclado, Escape, click-away, reduced motion.
- Before/after evidence: baseline collaborator; no superadmin.
- Known visual debt: @menu no expone aria-expanded submenús; fuera scope.
- Visual scorecard: `docs/ui/reviews/TASK-1686-pure-collaborator-navigation.scorecard.json`.
- Quality threshold: `average >= 4.5; floor >= 4; hierarchy/surface economy/visual impact/fidelity/template resistance >= 4.5`.

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

### Slice 1 — Contrato negativo de audiencia

- Fijar tests collaborator puro, client, internal, hybrid y my+client: hrefs/secciones rail y avatar.
- Probar ausencia collaborator de proyectos, sprints, equipo, reviews, analytics, campañas, updates, notifications, settings, Módulos, Mi Cuenta y módulo inyectado.
- Probar builder dinámico y page guards sin cambio.

### Slice 2 — Rail personal aislado

- Predicado explícito: isMyUser && !isInternalPortalUser && !routeGroups.includes('client'); my+client conserva su salida VIGENTE byte-a-byte (rail cliente + bloques `isMyUser` actuales) — el predicado sólo decide si se aplica la proyección collaborator-pura, nunca recorta a un híbrido (resolución del conflicto matriz↔Goal, auditoría 2026-08-10).
- Collaborator: home + Mi Ficha builder + recursos plataforma; no colecciones cliente.
- Client: branch actual base/account/módulos TASK-1675 byte-equivalente.
- Eliminar copy personal literal residual y reusar nomenclatura.

### Slice 3 — Avatar semántico y coherente

- Rama collaborator antes client: identidad, Mi Perfil si profileHref, salida; no shortcut cliente ni espejo Mi Ficha.
- Trigger avatar/badge semántico: nombre, aria-haspopup, aria-expanded, aria-controls, Enter/Espacio y restore foco.
- Mantener avatarUrl, iniciales, signOut, Popper/ClickAway y tokens.

### Slice 4 — Reachability y evidencia

- Tocar manifest sólo si su razón deja de describir runtime; no paths/parents.
- Crear escenarios premium collaborator, revisar/promover baseline y scorecard.
- Ejecutar gates UI/QA/documentales.

## Out of Scope

- Rutas, redirects, registry/codes, roles, grants, assignments, guards, fallback o deep-link policy.
- Portal cliente/footer/clientNavItems, menú interno, CmdK architecture, MyDashboardView y primitives/shell.
- Mover/duplicar Mi Ficha, API/DB/flags/telemetría o contratos identidad.
- Authorization: detener y escalar TASK-1685/ADR.

## Detailed Spec

### Matriz de salida obligatoria

| Audiencia | Rail | Avatar | Invariantes |
| --- | --- | --- | --- |
| collaborator puro | /my + builder + recursos plataforma | identidad + Mi Perfil + salir | cero cliente; no duplicar Mi Ficha |
| client | base/módulos/Mi Cuenta actual | actual | TASK-1675 equivalente |
| internal | zonas TASK-1388 | bloque personal actual | sin /my/* rail interno |
| hybrid my+internal | internal | internal | grupo operativo prevalece |
| my+client | client VIGENTE (incluye los bloques `isMyUser` actuales: home `/my` + sección Mi Ficha) | client VIGENTE (header clickeable si `profileHref`) | no APLICAR la proyección collaborator-pura; conservar byte-a-byte la salida actual |

### Invariantes de regresión

1. Bifurcación no entra a page guard/autorización.
2. buildMyNavItems mantiene claim vacío/parcial y flags dinámicos.
3. clientNavItems sigue server-side client; collaborator no lo consume.
4. Marker/copy no contienen PII ni dependen de nombre.
5. Sin profileHref: identidad + salida, sin CTA rota.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4.
- No baseline antes de control client/internal/hybrid.
- Si aparece guard, parar y abrir TASK-1685/ADR.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| Branch amplio rompe client | UI | media | predicado nominal + tests | control client falla |
| Claim vacío filtra mal | UI/identity | media | caso explícito + builder | href inesperado |
| Avatar inaccesible | a11y | media | trigger semántico + GVC | axe/focus probe |
| Cambio accidental acceso | identity | baja | diff permitido + no-change test | guard/registry modificado |
| Drawer/Popper overflow | UI | media | GVC layout 390 | finding layout |

### Feature flags / cutover

Sin flag: ajuste local reversible, sin persistencia ni contrato runtime nuevo. Rollback: revert focal + redeploy.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
| --- | --- | --- | --- |
| 1 | revert tests/docs si baseline errónea | <5 min | sí |
| 2 | revert VerticalMenu focal | <5 min + redeploy | sí |
| 3 | revert UserDropdown focal | <5 min + redeploy | sí |
| 4 | revert scenarios/baseline/scorecard con código | <5 min | sí |

### Production verification sequence

1. Local: tests focales y reachability.
2. Staging collaborator: /my, rail/avatar/cmdk/drawer; ausencia cliente + a11y.
3. Staging client/internal: smoke control sin regresión.
4. Capturas/review/baseline; detener ante findings.
5. Tras release autorizado, repetir tres identidades; no afirmar producción sin evidencia runtime.

### Out-of-band coordination required

N/A — repo-only. Si collaborator no autentica, bloquear evidencia y usar Agent Auth sin exponer secretos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] UI profile/flow, wireframe, flow y UI ready yes pasan pnpm task:lint --task TASK-1686.
- [ ] Rail collaborator = /my + builder + recursos plataforma permitidos; cero rutas/secciones/módulos/copys cliente incluso claim vacío.
- [ ] Avatar collaborator = identidad + CTA visible/gateada Mi Perfil + salida; cero shortcut cliente/espejo 13 hojas.
- [ ] Trigger avatar es semántico, nombrado y teclado-accesible; expone relación/estado menú y restore foco.
- [ ] Gates personales no cambian; client/internal/hybrid/my+client preservan salida.
- [ ] Ningún guard, registry, assignment ni ruta cambia; test prueba deep-link policy inalterada.
- [ ] Tests focales cubren positivos/negativos cinco audiencias.
- [ ] Reachability pasa; manifest sólo cambia si describe superficie real.
- [ ] GVC collaborator premium verifica rail/avatar/cmdk/drawer, axe/runtime/layout/focus/reduced motion/scroll-width.
- [ ] Baseline, dossier y scorecard pasan umbral; no BLOCK enterprise.

## Verification

- pnpm vitest run src/components/layout/vertical/VerticalMenu.test.tsx src/components/layout/shared/UserDropdown.test.tsx
- pnpm route-reachability-gate
- pnpm local:check:ui
- AGENT_AUTH_EMAIL=agent-collaborator@greenhouse.efeonce.org pnpm fe:capture task-1686-pure-collaborator-navigation --env=staging
- AGENT_AUTH_EMAIL=agent-collaborator@greenhouse.efeonce.org pnpm fe:capture task-1686-pure-collaborator-mobile-drawer --env=staging
- pnpm ui:wireframe-check --task TASK-1686
- pnpm ui:flow-check --task TASK-1686
- pnpm ui:quality --task TASK-1686
- pnpm task:lint --task TASK-1686
- pnpm qa:gates --changed

## Closing Protocol

- [ ] Lifecycle/carpeta, registry y README reflejan cierre.
- [ ] Handoff/changelog registran evidencia/material change real.
- [ ] Revisar impacto TASK-1388, TASK-1675, TASK-1685 y TASK-116.
- [ ] pnpm docs:closure-check y, último gate documental, pnpm docs:context-check:strict pasan.

## Follow-ups

- TASK-1685 conserva toda decisión authorization cliente.
- Si evidencia pide más acciones avatar, crear task separada; no duplicar Mi Ficha por defecto.
