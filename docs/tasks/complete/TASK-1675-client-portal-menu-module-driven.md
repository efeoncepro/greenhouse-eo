# TASK-1675 — El menú del portal cliente compone los módulos contratados

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
- Wireframe: `docs/ui/wireframes/TASK-1675-client-portal-menu-module-driven.md`
- Flow: `docs/ui/flows/TASK-1675-client-portal-menu-module-driven-flow.md`
- Motion: `none`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `client-portal-vertical-menu-resolver-migration`
- GitHub Issue: `none`

## Summary

El menú del portal cliente no puede mostrar un módulo contratado. Es una lista **hardcodeada** de 7
ítems filtrada por `canSeeView('cliente.*')`, y esa resolución sale de `role_view_assignments` —
**nunca** de `module_assignments`. Resultado: Grupo Berel tiene SEO contratado, la pantalla funciona y
muestra sus datos reales, y **no hay forma de llegar salvo escribiendo la URL**. Esta task cablea el
resolver per-org que ya existe completo (`composeNavItemsFromModules` + `resolveClientPortalModulesForOrganization`)
resolviéndolo server-side en el layout y pasándolo por props, con **merge aditivo** sobre la lista base.

## Why This Task Exists

No es un gap de SEO: es el agujero estructural del portal cliente. **Cualquier** módulo per-org que se
contrate hoy es invisible en la navegación, y la única salida es hardcodear otro ítem — que es
exactamente lo que la spec prohíbe.

Tres hechos que lo fijan:

1. **La spec ya declara el camino y nadie lo cableó.** `GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §12.1:
   *"`ClientPortalNavigation` component lee resolver y compone menú con view_codes activos. **NUNCA
   hardcodea menu items per business_line**"*. La capa existe, está testeada y tiene **cero
   consumidores en runtime**: su única referencia real es el mockup `/mockup/cliente-portal-legacy`.
2. **La deuda estaba nombrada pero sin ID.** `client-portal-vertical-menu-resolver-migration` aparece
   en la spec, en `docs/tasks/README.md`, en `eslint.config.mjs` y en el comentario canónico de
   `VerticalMenu.tsx:724-744` — pero nunca tuvo archivo ni fila en el registry. Lleva meses sin
   tomarse **porque no tenía ID**; registrarla es parte del arreglo.
3. **TASK-1388 la declara suya como follow-up.** Esa task reestructura el nav interno y dice explícito
   *"Solo portal interno (cliente = follow-up)"*. Esta es ese follow-up.

El disparador concreto fue TASK-1310: se verificó con sesión real de Grupo Berel que el gate per-org
pasa y la superficie renderiza con datos medidos, pero el ítem no existe en ningún menú. Evidencia:
`.captures/2026-08-08T19-30-53_inline-growth-seo`.

## Goal

- El menú del portal cliente compone ítems desde `module_assignments`, per-organización.
- Grupo Berel ve **un** ítem `SEO`; una organización sin el módulo **no lo ve**.
- Nadie pierde menú: colaboradores internos y clientes sin assignments conservan exactamente el de hoy.
- La deuda `client-portal-vertical-menu-resolver-migration` queda cerrada con ID y evidencia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` (§12.1 menú dinámico + hard rules `:796-808`)
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` (§Invariantes — entitlements governance)
- `docs/architecture/agent-invariants/ORG_CLIENT_AGENT_INVARIANTS.md`
- `docs/architecture/ui-platform/README.md`

Reglas obligatorias:

- **NUNCA** hardcodear un ítem de menú per business_line / per módulo (§12.1). El ítem se compone del resolver.
- **NUNCA** branchear UI client-side por `tenant_type`, `business_line` o `tenant_capabilities` directo (`:796`).
- **NUNCA** borrar filas de `role_view_assignments` (append-only). Esta task **no las toca**.
- **NUNCA** habilitar/mutar un `module_assignment` fuera de los commands canónicos de `src/lib/client-portal/commands/`. Esta task es **read-only** sobre ese carril.
- **NUNCA** importar `server-only` (`module-resolver`, `menu-builder`, `ClientPortalNavigation`) desde `VerticalMenu` ni desde ningún client component: rompe el build. Del lado cliente sólo `menu-builder-shape` (tipos + `groupNavItems`).
- **SIEMPRE** merge **aditivo** sobre la lista base. Reemplazarla deja sin menú a colaboradores y a clientes sin assignments.
- **SIEMPRE** fail-open: si el resolver falla → `[]` → el menú queda igual que hoy. Nunca menú vacío.

## Normative Docs

- `docs/tasks/complete/TASK-827-client-portal-composition-layer-ui.md` (§116, §435 declaran la prop `clientNavItems`)
- `docs/tasks/to-do/TASK-1388-vertical-menu-restructure.md` (nav interno; declara cliente como follow-up)
- `docs/issues/resolved/ISSUE-143-seo-module-cutover-expand-contract-collapsed.md` (ventana de cutover abierta)

## Dependencies & Impact

### Depends on

- `src/lib/client-portal/readers/native/module-resolver.ts` — `resolveClientPortalModulesForOrganization` (cache TTL 60 s)
- `src/lib/client-portal/composition/menu-builder.ts` — `composeNavItemsFromModules` (server-only)
- `src/lib/client-portal/composition/menu-builder-shape.ts` — tipos client-safe
- `greenhouse_client_portal.module_assignments` + `modules` (poblados por los commands canónicos)

### Blocks / Impacts

- `TASK-1310` — su criterio de alcanzabilidad por nav cliente depende de esta task.
- `TASK-1388` — toca el mismo archivo (`VerticalMenu.tsx`). Coordinar: 1388 reestructura el bloque interno; ésta añade la composición del bloque cliente. **Quien tome la segunda rebasa sobre la primera.**
- `TASK-1674` (reservada) — la 4.ª sección del portal cliente SEO hereda este cableado.
- Cualquier módulo per-org futuro: deja de necesitar cambio de código para ser visible.

### Files owned

- `src/app/(dashboard)/layout.tsx`
- `src/components/layout/vertical/Navigation.tsx`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/lib/client-portal/composition/menu-builder.ts` (descriptor: marcar rutas hijas)
- `src/lib/navigation/route-reachability-manifest.ts`
- `docs/ui/wireframes/TASK-1675-*.md`, `docs/ui/flows/TASK-1675-*-flow.md`

## Current Repo State

### Already exists

- Resolver per-org con cache e invalidación post-command: `module-resolver.ts:87,142,198`
- Composer puro con 13 tests: `menu-builder.ts:133` + `menu-builder.test.ts`
- Split client-safe ya diseñado para este caso: `menu-builder-shape.ts:8-19`
- Server component listo: `ClientPortalNavigation.tsx:52` (cero importadores)
- Endpoint: `src/app/api/client-portal/modules/route.ts:43` (cero consumidores)
- Descriptores SEO ya sembrados en el builder muerto: `menu-builder.ts:66-67`
- Único punto server con sesión sobre el menú: `src/app/(dashboard)/layout.tsx:40-42`

### Gap

- `VerticalMenu` recibe una sola prop (`scrollMenu`); todo su input sale del JWT, que **no** trae módulos.
- La rama cliente (`VerticalMenu.tsx:746`) es en realidad la rama **no-interno**: colaboradores puros caen ahí.
- El composer mapea **ambos** viewCodes SEO a ítems (`:66-67`); falta noción de ruta hija.
- El manifest declara `/growth/seo` con `parent:'/home', via:'inline-link'` — **ese enlace no existe**.
- Cero tests de `VerticalMenu`; cero test end-to-end "org con módulo → ítem visible / sin módulo → ausente".

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/app/(dashboard)/layout.tsx` + `src/components/layout/vertical/**` (Next.js portal, runtime Vercel)
- Future candidate home: `remain-shared`
- Boundary: consume el contrato `client-portal` sólo por sus primitives públicos (`resolveClientPortalModulesForOrganization`, `composeNavItemsFromModules`, tipos de `menu-builder-shape`). El layout **no** consulta `module_assignments` directo ni reimplementa el composer.
- Server/browser split: la resolución (PG + `server-only`) ocurre en el layout server; al cliente sólo viaja una lista de `ClientNavItem` como JSON plano. Es la frontera que hoy impide el cableado directo desde `VerticalMenu`.
- Build impact: `none` — sin dependencias nuevas; el layout ya es `force-dynamic` y ya hace I/O server-side.
- Extraction blocker: `routing` — el ensamblado depende del layout de Next.js del portal; no es extraíble sin llevarse el árbol de rutas.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: usuario de un cliente con módulo contratado (hoy Grupo Berel, roles `client_*`).
- Momento del flujo: entra a su portal y busca la superficie que su empresa contrató.
- Resultado perceptible esperado: el ítem del módulo aparece en su menú lateral, junto a los de siempre.
- Friccion que debe reducir: hoy la superficie es inalcanzable sin conocer la URL — el cliente no sabe que existe.
- No-goals UX: no rediseñar el chrome del menú (eso es TASK-1388); no cambiar rutas, copy institucional ni gating.

### Surface & system decision

- Surface: menú lateral del portal (`VerticalNav` Vuexy), bloque no-interno.
- Composition Shell: `no aplica` — es chrome de layout, no una superficie de contenido.
- Primitive decision: `reuse` — `composeNavItemsFromModules` + tipos de `menu-builder-shape`; el render sigue siendo el `Menu`/`MenuItem` Vuexy existente.
- Adaptive density / The Seam: `no aplica`.
- Floating/Sidecar/Dialog decision: n/a.
- Copy source: el label sale del `VIEW_REGISTRY` (`view-access-catalog.ts`), no de literales nuevos.
- Access impact: `views` — cambia qué se **muestra**; el gate real de acceso sigue server-side per-org en cada page.

### State inventory

- Default: lista base + ítems de módulos contratados, ordenados por grupo/tier.
- Loading: **no existe por construcción** — los ítems llegan en el mismo payload RSC que el shell (ésa es la razón de elegir props sobre fetch).
- Empty: organización sin módulos → menú idéntico al de hoy (la lista base). Sin "no tienes módulos".
- Error: resolver falla → `[]` → menú de hoy. Degradación honesta, nunca menú vacío.
- Degraded / partial: un viewCode no registrado se descarta en el composer (filtro defensivo ya existente).
- Permission denied: n/a en el menú; el gate vive en la page.
- Long content: si un cliente acumulara muchos módulos, aplican el scroll del `VerticalNav` y el agrupado por tier.
- Mobile / compact: hereda el comportamiento del `VerticalNav` (colapsado/hover); sin tratamiento propio.
- Keyboard / focus: hereda el del `Menu` Vuexy; el ítem nuevo es un `MenuItem` más.
- Reduced motion: sin motion propio.

### Interaction contract

- Primary interaction: click/Enter en el ítem → navega a la ruta del módulo.
- Hover / focus / active: los del `MenuItem` Vuexy; el active state lo resuelve el mismo motor que el resto (no un segundo resolver).
- Pending / disabled: n/a.
- Escape / click-away: n/a.
- Focus restore: n/a.
- Latency feedback: n/a — sin carga diferida.
- Toast / alert behavior: n/a.

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: n/a — el ítem existe desde el primer render.
- Layout morph / Stagger / Timing: n/a.
- Reduced-motion fallback: n/a.
- Non-goal motion: **no** animar la aparición del ítem; el sidebar es chrome persistente y cualquier movimiento ahí se lee como defecto.

### Implementation mapping

- Route / surface: `src/app/(dashboard)/layout.tsx` → `Navigation.tsx` → `VerticalMenu.tsx` (bloque no-interno).
- Primitive / variant / kind: `reuse` — composer existente + `MenuItem` Vuexy.
- Component candidates: `VerticalMenu` (merge), `Navigation` (passthrough).
- Copy source: `VIEW_REGISTRY`.
- Data reader / command: `resolveClientPortalModulesForOrganization` (read-only). **Ningún command de escritura.**
- API parity: el contrato programático equivalente ya existe (`/api/client-portal/modules`); esta task lo deja como segundo consumer del mismo primitive, no crea uno nuevo.
- Access / capability: sin capability nueva. Visibilidad derivada del `module_assignment` per-org.
- States to implement: default, empty (= lista base), error (= lista base).

### GVC scenario plan

- Scenario files: `client-portal-menu-with-module.scenario.ts` · `client-portal-menu-without-module.scenario.ts` · `client-portal-menu-mobile-drawer.scenario.ts`
- Route: `/home`
- Viewports: desktop 1440 + mobile 390
- Quality profile: `premium`
- Required steps: cargar con persona **con** módulo; cargar con persona **sin** módulo.
- Required captures: `menu-with-module`, `menu-without-module`
- Required `data-capture` markers: el contenedor del nav lateral.
- Assertions: el ítem del módulo presente en la primera y **ausente** en la segunda; la lista base intacta en ambas; `noLoginRedirect`; sin `console.error`.
- Scroll-width checks: `scrollWidth == clientWidth` en ambos viewports.
- Reduced-motion / focus evidence: foco visible al tabular al ítem nuevo.
- Review dossier: `docs/ui/reviews/TASK-1675-client-portal-menu-module-driven.review.md` (escrito a mano: `pnpm fe:capture:review` corre contra **staging** por default y produce 0 frames)
- Baseline decision / surface ID: uno por escenario — el diff es la defensa contra regresiones del chrome.
- `requiresStorageState`: declarar la persona cliente (contrato de TASK-1310; sin él la captura corre con otra identidad y produce evidencia engañosa).

### Design decision log

- Decision: resolver server-side en `layout.tsx` y pasar `clientNavItems` por props, con merge aditivo.
- Alternatives considered: **(a)** fetch desde el client component — descartada: garantiza flash/CLS en chrome persistente, no puede leer kill switches server-only y exigiría reimplementar el composer client-safe. **(b)** montar `ClientPortalNavigation` como slot — descartada: trae su propio chrome (MUI `List`, section headers, badge, active state propio), dejando dos sistemas de navegación y dos landmarks `<nav>` dentro del `VerticalNav`. **(c)** claim en el JWT — descartada: staleness ≥5 min y crea un tercer carril de verdad para un dato per-org que ya tiene reader con cache.
- Why this pattern: es literalmente lo que TASK-827 dejó declarado (`:116`, `:435`), no cruza la frontera server/client, y deja el menú y el gate de la page consumiendo el **mismo** `module_assignments`.
- Reuse / extend / new primitive: `reuse` puro + una extensión mínima del descriptor (noción de ruta hija).
- Open risks: coordinación con TASK-1388 sobre el mismo archivo; y que un módulo futuro declare viewCodes cuyo descriptor no exista (mitigado: el composer ya filtra defensivamente).

### Visual verification

- GVC scenarios: los tres de arriba
- Viewports: 1440 + 390
- Required captures: `menu-with-module`, `menu-without-module`
- Required `data-capture` markers: nav lateral
- Scroll-width check: sí
- Accessibility/focus checks: foco visible + orden de tabulación
- Before/after evidence: antes `.captures/2026-08-08T19-30-53_inline-growth-seo` (menú sin SEO con Berel)
- Known visual debt: el chrome del menú sigue siendo el legacy; su reequilibrio es TASK-1388.
- Visual scorecard: `docs/ui/reviews/TASK-1675-client-portal-menu-module-driven.scorecard.json`
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Ruta hija en el descriptor

- Extender `VIEW_CODE_NAV_DESCRIPTOR` con la noción de **ruta hija** (no produce ítem de menú propio).
- Marcar `cliente.growth_seo_report` como hija de `cliente.growth_seo_dashboard`.
- Test: un módulo con ambos viewCodes produce **un** ítem, no dos.

### Slice 2 — Resolver server-side + props

- `layout.tsx`: resolver **sólo** si `tenantType === 'client' && organizationId`; `try/catch → []`.
- `Navigation.tsx`: passthrough de `clientNavItems`.
- `VerticalMenu.tsx`: merge **aditivo** por `route` en el bloque no-interno (nunca reemplazo).

### Slice 3 — Red de seguridad

- Test de composición con fixture SEO real (los dos viewCodes de `seo_v2`).
- Test de merge aditivo: con `clientNavItems = []` el menú es **byte-idéntico** al de hoy.
- Test de fail-open: resolver que lanza → menú de hoy.
- Smoke de descubribilidad con la persona cliente (patrón `my-payment-profile-discoverability.spec.ts`).

### Slice 4 — Manifest y cierre documental

- Corregir `route-reachability-manifest.ts`: `/growth/seo` pasa de `via:'inline-link'` (enlace inexistente) a ítem de nav.
- Actualizar §12.1 de `GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` con el estado real y retirar la deuda sin ID.
- GVC + scorecard.

## Out of Scope

- Rediseñar el chrome o la estructura del menú (TASK-1388).
- Migrar `capabilityModules` (`businessLines`/`serviceModules`) al resolver — deuda hermana, task aparte.
- Montar `ClientPortalNavigation` como componente de render.
- Tocar `role_view_assignments`, `authorizedViews` o el fallback heurístico.
- Cambiar el gate de acceso de ninguna page: esto es **sólo visibilidad**.
- Cerrar el contract del cutover `seo_v1 → seo_v2` (ISSUE-143, dueño TASK-1310).

## Detailed Spec

**Contrato de la prop.** `clientNavItems?: readonly ClientNavItem[]`, tipo importado desde
`menu-builder-shape` (client-safe). JSON plano y serializable; sin funciones ni `Date`.

**Guard en el layout — no negociable.** Sin él, cada carga dura de un usuario interno pega a PG por un
dato que no va a usar:

```ts
let clientNavItems: readonly ClientNavItem[] = []

if (session.user.tenantType === 'client' && session.user.organizationId) {
  try {
    const modules = await resolveClientPortalModulesForOrganization(session.user.organizationId)
    clientNavItems = composeNavItemsFromModules(modules)
  } catch (error) {
    captureWithDomain(error, 'client_portal', { surface: 'vertical-menu' })
    clientNavItems = []   // fail-open: el menú queda como hoy
  }
}
```

**Merge aditivo.** Se agregan sólo los ítems cuya `route` no esté ya en la lista base, para que un
módulo que duplique una ruta existente no produzca dos entradas.

**Por qué el `try/catch` es load-bearing:** sin él, un fallo del resolver tumba `layout.tsx`, que es la
raíz de **todo** el dashboard — internos incluidos. Es la diferencia entre "un cliente no ve un ítem" y
"nadie entra al portal".

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (descriptor) **antes** de Slice 2: sin la noción de ruta hija, el primer render con Berel muestra SEO duplicado.
- Slice 2 → Slice 3. Slice 4 al final (el manifest describe el estado ya construido).
- 🔴 **El rollout a producción espera la promoción a `main`.** Mientras el catálogo TS viva sólo en `develop`, `syncViewRegistryCatalog` apaga esos viewCodes desde cualquier runtime con código viejo (ENTITLEMENTS §:721-733). Construir en `develop` es seguro; **declarar el rollout cerrado antes de promover, no**.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Reemplazar la lista base deja sin menú a colaboradores puros (caen en la rama no-interno) | Portal completo | Media | Merge aditivo + test de identidad con `clientNavItems=[]` | Smoke de descubribilidad rojo |
| Fallo del resolver tumba el layout raíz | Todo el dashboard | Baja | `try/catch → []` obligatorio + `captureWithDomain` | `client-portal-resolver-failure-rate` |
| Query a PG en cada carga de usuario interno | PG / latencia | Media | Guard `tenantType==='client' && organizationId` + cache 60 s del resolver | Pooling/latencia de PG |
| SEO duplicado en el menú de Berel | UX cliente | Alta sin Slice 1 | Slice 1 primero + su test | GVC `menu-with-module` |
| Módulo visible en producción antes de promover el catálogo TS | Governance de vistas | Media | Rollout gated por promoción a `main` | Filas `active=false`, `updated_by='system'` |
| Conflicto con TASK-1388 sobre `VerticalMenu.tsx` | Merge | Media | Declarado en Blocks/Impacts; quien tome la segunda rebasa | Conflicto de git |

### Feature flags / cutover

Sin flag propio. La visibilidad ya está gobernada por el `module_assignment` per-org, que es un
interruptor real y auditado por organización: quitar el assignment retira el ítem. Agregar un flag
binario encima sería un segundo interruptor para lo mismo.

### Rollback plan per slice

| Slice | Rollback | Tiempo | ¿Reversible? |
|---|---|---|---|
| 1 | Revert del descriptor | <5 min | Sí |
| 2 | Revert de los 3 archivos → menú de hoy | <5 min | Sí |
| 3 | Revert de tests | <5 min | Sí |
| 4 | Revert del manifest | <5 min | Sí |

### Production verification sequence

1. Promover `develop → main` (release control plane) y desplegar.
2. Sesión de cliente real de Grupo Berel: el ítem `SEO` aparece y navega.
3. Sesión de cliente **sin** el módulo: el ítem **no** aparece y su menú está intacto.
4. Sesión de colaborador interno puro: menú intacto.
5. Confirmar que no hay filas `view_registry.active = false, updated_by='system'` para los viewCodes SEO.

### Out-of-band coordination required

- Ninguna: no toca Azure, GCP, Vercel env ni Cloud Run.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] El menú del portal cliente compone ítems desde `module_assignments`; ningún ítem de módulo queda hardcodeado (§12.1).
- [x] Grupo Berel ve **un** ítem `SEO` que navega a `/growth/seo`; el informe **no** es ítem propio.
- [x] Una organización cliente sin el módulo **no** ve el ítem, y su menú es idéntico al de hoy.
- [x] Un colaborador interno puro conserva su menú completo (test de identidad con `clientNavItems=[]`).
- [x] El resolver se invoca **sólo** con `tenantType==='client' && organizationId`; un fallo degrada a `[]` y nunca tumba el layout.
- [x] Ningún client component importa `server-only`; del lado cliente sólo viajan tipos de `menu-builder-shape` y JSON plano.
- [x] La task **no** escribe `role_view_assignments` ni `module_assignments`.
- [x] `route-reachability-manifest.ts` describe el camino real de `/growth/seo` (ítem de nav, no un `inline-link` inexistente).
- [x] GVC desktop+mobile con las dos personas (con y sin módulo), `scrollWidth==clientWidth`, sin `console.error`.
- [x] `UI ready` pasa a `yes` sólo cuando `pnpm task:lint --task TASK-1675` queda sin findings.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/client-portal`
- `pnpm route-reachability-gate`
- `pnpm fe:capture client-portal-menu-{with-module,without-module,mobile-drawer} --env=local`
- `pnpm ui:quality --task TASK-1675`
- `pnpm task:lint --task TASK-1675`

## Closing Protocol

- [x] `Lifecycle` sincronizado con el estado real
- [x] el archivo vive en la carpeta correcta
- [x] `docs/tasks/README.md` sincronizado
- [x] `Handoff.md` actualizado
- [x] `changelog.md` actualizado
- [x] chequeo de impacto cruzado (TASK-1310, TASK-1388, TASK-1674)
- [x] §12.1 de `GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` refleja el estado real y la deuda sin ID queda retirada
- [ ] el rollout a producción sólo se declara cerrado **después** de promover a `main`

## Follow-ups

- `capability-modules-resolver-migration` — migrar el bloque `capabilityModules` (`businessLines`/`serviceModules`) al mismo resolver. Deuda hermana, aún sin ID.
- `client-portal-legacy-branching-sweep` — retirar el marker `// client-portal-allowed:` y promover a `error` el lint `no-untokenized-business-line-branching` (hoy en `warn`, así que el branching legacy pasa sin avisar).
- Reforzar `route-reachability-gate` para que verifique que el enlace declarado **existe**, no sólo que la ruta esté declarada.
- Tooling menor: la regla `modular-placement-contract` de `task:lint` marca como placeholder cualquier texto con corchetes, así que un tipo TS de array (`Foo` seguido de corchetes) da falso positivo. Detectado al crear esta task.

## Open Questions

1. ¿El ítem de módulo va en la sección primaria junto a los de siempre, o bajo una sección "Módulos" propia? Propuesta: **primaria**, porque para el cliente un módulo contratado no es una categoría aparte — es parte de su operación. El composer ya soporta ambos vía `group`.
2. ¿Quién rebasa si TASK-1388 entra primero? Propuesta: quien tome la segunda, con el smoke de descubribilidad como red.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 5 — DELTA DE EJECUCIÓN (2026-08-09)
     ═══════════════════════════════════════════════════════════ -->

## Delta de ejecución 2026-08-09

### Lo que la ejecución cambió respecto de la spec

**1. El merge cubre los tres grupos del composer, no sólo el primario.** La spec y el wireframe
describen "un ítem SEO en la lista primaria". Implementarlo literal habría descartado en silencio
cualquier módulo cuyo viewCode caiga en `capabilities` o `account` — el mismo agujero que esta task
cierra, sólo que más difícil de ver. La captura lo confirmó de inmediato: **el menú de Berel muestra
DOS ítems compuestos**, `SEO` (primary) y `AEO` (capabilities, bajo `MÓDULOS`). `AEO` apareció solo,
sin una línea de código dedicada. Con un merge sólo-primary no estaría.

**2. `/growth/seo` salió de `DECLARED_CHILD_ROUTES` en vez de cambiar su `via`.** La spec pedía pasar de
`via:'inline-link'` a "ítem de nav", pero `ChildRouteVia` no tiene ese valor y la ruta dejó de ser una
ruta hija: ahora ES un ítem de menú, sólo que compuesto en runtime y por lo tanto sin `href` literal
que el gate pueda ver. Se creó `MODULE_COMPOSED_NAV_ROUTES` en el mismo manifest, que es una categoría
honesta en vez de inventarle un padre y un `via` inexistentes. `/growth/seo/report` se queda como child
route `header-cta`, que sí es cierto.

**3. Tres escenarios GVC en vez de uno.** Dos restricciones medidas del harness, no preferencia:
`requiresStorageState` se resuelve **antes** de crear el `BrowserContext`, así que una corrida tiene
una sola identidad y dos personas son dos archivos; y a 390px el sidebar es un drawer **cerrado**
(`left: -260`), así que verificar el ítem exige un paso de apertura, y los `steps` son compartidos
entre variantes. `client-portal-menu-mobile-drawer` es el que lo abre.

### Hallazgos de accesibilidad del chrome (preexistentes, con dueño)

Los cuatro son del `VerticalNav`, afectan al portal entero —interno incluido— y ninguno lo introduce
esta task. Están **registrados en los manifests de las capturas**; lo que se relajó, con el motivo
escrito inline en cada escenario, es su capacidad de bloquear una task cuyo contrato prohíbe tocar el
chrome:

1. Ningún ítem del menú muestra anillo de foco al tabular; el estado enfocado se comunica sólo con un
   cambio de fondo tenue. **El escenario negativo es el control**: su probe parte de `/campanas`, un
   ítem base de siempre, y produce el mismo hallazgo.
2. A 390px el `ScrollWrapper` del menú es un `div` con `overflow-y-auto` sin `role`, label ni
   `tabIndex`: un usuario de teclado no puede alcanzar la región scrollable.
3. El toggle del drawer es un `<i class="tabler-menu-2">` sin role de botón ni nombre accesible.
4. El panel del drawer abierto desborda 8px a la izquierda.

Dueño declarado inline en los escenarios: `client-portal-menu-focus-ring`. Al cerrarse, los flags
vuelven a `true` y se recaptura.

### Defecto visual atribuible a esta task

Los ítems de módulo **no tienen subtítulo** y los base sí, así que sus filas miden una línea contra dos
o tres. Es consecuencia declarada del Copy Ledger (el label sale del `VIEW_REGISTRY`, y su único texto
disponible es `description`, prosa de governance que como subtítulo sería peor que la ausencia).
Cerrarlo pide un campo de nav propio en el registry, con migración: fuera de alcance. Anotado en
`proportions` y `rhythm` del scorecard con su `nextAction`.

### Gates ejecutados

| Gate | Resultado |
|---|---|
| `pnpm local:check` | verde |
| `pnpm test` (suite completa) | 10395 passed · 0 failed · 138 skipped |
| `pnpm build` (producción) | verde — **es el gate que prueba la frontera `server-only`**: si `VerticalMenu` (cliente) arrastrara el composer, Turbopack rompía |
| `pnpm route-reachability-gate` | 232 rutas, 0 huérfanas |
| `pnpm design-contract:lint --task TASK-1675` | PASS |
| `pnpm ui:code-lint --changed` | PASS |
| `pnpm ui:visual-gate --task TASK-1675` | PASS |
| `pnpm ui:quality --task TASK-1675` | PASS — promedio 4.86, piso 4 |
| `pnpm task:lint --task TASK-1675` | errors=0, warnings=0 |

### Estado de rollout

`code complete`. El rollout a producción sigue gated por la promoción `develop → main`, tal como
declara §Rollout Plan: mientras el catálogo TS viva sólo en `develop`, `syncViewRegistryCatalog` apaga
esos viewCodes desde cualquier runtime con código viejo. La verificación productiva (sesión real de
Berel, sesión de cliente sin el módulo, sesión de colaborador interno) se ejecuta **después** de
promover.

### Notas de herramienta para quien venga después

- **`pnpm fe:capture:review` corre contra `staging` por default** y produce 0 frames incluso con
  `--env=local`. Además su `ensureStorageStateFresh` **pisa el storageState de la persona declarada**
  con el del agente interno, lo que hace fallar la assertion del ítem con un diagnóstico engañoso (el
  menú del interno no tiene ítems de cliente). Si eso pasa: regenerar la persona y usar
  `pnpm fe:capture` directo.
- Promover baselines de un escenario multi-variante exige promover **cada subdirectorio de variante por
  separado**; el directorio raíz no tiene frames.
