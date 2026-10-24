# TASK-2043 — Dock inferior de las landings: primitive `efeonce.landing-dock` y migración de las siete landings

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `primitive`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-2043-landing-dock.md`
- Flow: `docs/ui/flows/TASK-2043-landing-dock-flow.md`
- Motion: `docs/ui/motion/TASK-2043-landing-dock-motion.md`
- Backend impact: `integration`
- Epic: `EPIC-055`
- Status real: `En vivo en las siete landings desde 2026-10-23 (Inbound 04:07 UTC … Influencers 04:47 UTC), cada una con snapshot y aprobada en vivo por la sesión de fidelidad. AXIS v0.7.12–v0.7.14 (primitives 0.7.14, contracts 0.7.12, tokens 0.6.9, registry 0.7.5); plugin eo-landing-dock con la copia 0.7.14. gh_landing_dock_clicked en GTM (versión 8) y GA4 desde 2026-10-23, con target_label y target_url. Follow-ups: retiro del código de los docks viejos (no antes del 2026-11-06) y apertura del agendador expuesta por el renderer de CTAs`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `none`
- Branch: `Greenhouse develop para docs; el código vive en axis-design-system (release de paquetes) y en efeonce-public-site-runtime (release acotado por SSH); checkout compartido, sin worktrees`

## Summary

Construye el dock inferior de vidrio que el operador aprobó en el canvas «Mega menú efeoncepro.com» (v80) como **una
sola primitive de AXIS**, `efeonce.landing-dock`, y migra a ella los siete docks que hoy dibuja cada landing por su
cuenta:

- **Primitive:** tokens `axisLandingDock` (las dos recetas de vidrio de la isla del menú), contrato y esquema
  `landing-dock.v1`, render de servidor, CSS aislado y JS sin dependencias, con demo en el Lab.
- **Sitio:** un módulo único en el plugin de landings que pinta el dock desde un documento por página, con el agendador
  nativo (`cta-location="landing_dock"`) y vuelta atrás por página.
- **Migración:** Redes Sociales, Influencers, Inicio, SEO, Inbound, Servicios HubSpot y Performance, una por una,
  retirando el dock viejo en el mismo paso.

## Why This Task Exists

El inventario en vivo (canvas, tablero DockHoy, y medición del 2026-10-23) encontró **siete docks con siete estilos**:
píldoras blancas, cápsulas navy, barras sin fondo; z-index de 20 a 90; reglas de visibilidad distintas (observers,
scroll-driven CSS, scroll en JS, ninguna); sólo dos usan el agendador nativo. Dos viven como HTML crudo dentro de
Elementor. Ninguno comparte vidrio con el menú global que EPIC-055 acaba de poner en todo el sitio.

Ajustarlos uno por uno repite el error que EPIC-055 corrigió con el menú: el diseño diverge con el primer cambio. La
salida aprobada es la misma: el mecanismo en AXIS, el contenido como documento y un adaptador delgado en el sitio.

Va como task propia y no dentro de `TASK-2040`/`TASK-2042`: el dock es cromo de las landings, no del menú, y su
migración toca el código de cada landing (EPIC-047), no el encabezado. Barrido por dominio y superficie del 2026-10-23:
ninguna task posee el dock (TASK-1350, TASK-1862 y TASK-2039 lo mencionan como parte de su landing; TASK-1510 es dueña
del agendador, no del dock).

## Goal

- `efeonce.landing-dock` publicado en AXIS con versión fijada, página en el Lab y la paridad aprobada por la sesión de
  fidelidad a 1440 y 390.
- Las siete landings usan el dock en vivo, con su copy de hoy, sin docks viejos y con el agendador nativo medido como
  `landing_dock`.
- Documentación técnica, funcional y manual actualizadas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md` (se agrega §Dock inferior de las landings)
- `docs/public-site/decisions/PDR-027-navegacion-global-del-sitio-portable.md`
- `docs/public-site/decisions/PDR-024-axis-en-el-sitio-publico-composicion-agentica.md`
- `docs/public-site/decisions/PDR-026-cada-landing-deriva-su-patron-de-diseno.md` (mecanismos, no estéticas)
- `docs/architecture/GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md` (agendador)
- `docs/architecture/agent-invariants/PUBLIC_SITE_KINSTA_ACCESS_AGENT_INVARIANTS.md` (acceso y despliegue)

Reglas obligatorias:

- **Una primitive, siete consumidores.** Ningún valor de diseño del dock en el plugin ni en el tema hijo.
- **HTML de servidor primero.** Sin JavaScript, el dock queda visible y cada acción es un enlace.
- **El primitive no abre el agendador**: emite `axis-landing-dock:cta`; el sitio abre su `<greenhouse-cta>`.
- **El copy de cada dock es el de su landing.** Toda etiqueta corta de teléfono es copy y requiere al operador.
- **El dock viejo y el nuevo nunca conviven** en una página; cada landing tiene snapshot y vuelta atrás propia.

## Normative Docs

- Canvas «Mega menú efeoncepro.com», versión 80, fila «Dock inferior de las landings» (DockHoy, DockEscritorio,
  DockTelefono y la nota de reglas): https://claude.ai/artifact/FiyK4Uqrt8vqnSMw6qvgMj
- Aprobación del operador, textual: «Apruebo el dock en vidrio; pásaselo a la sesión del menú para construirlo en AXIS
  y en las landings».
- Skills: `axis-design-system`, `efeonce-graphic-line`, `efeonce-public-site-wordpress`, `greenhouse-growth-ctas`,
  `greenhouse-growth-meetings`.

## Dependencies & Impact

### Depends on

- `TASK-2040` (vidrio de la isla en `axisSiteNav`, carril de pruebas de cromo del sitio en AXIS).
- `TASK-2042` (menú en vivo en todo el sitio; lanzador oculto del agendador y piel del diálogo en `ohio-child`).
- CTA de reunión gobernados ya publicados: `inbound-discovery-meeting`, `hubspot-discovery-meeting`,
  `influencer-discovery-meeting` y `site-nav-discovery-meeting` (scripts en `scripts/growth/publish-*-meeting-cta.ts`).

### Blocks / Impacts

- `TASK-2039` mide la landing de Inbound con `inbound_mobile_dock`: tras la migración el dock mide `landing_dock`
  (recibe Delta).
- Landings futuras de EPIC-047 (TASK-1350, TASK-1862) usan este dock en lugar de inventar uno.

### Files owned

- `docs/tasks/complete/TASK-2043-landing-dock-glass-primitive.md`
- `docs/ui/wireframes/TASK-2043-landing-dock.md`
- `docs/ui/flows/TASK-2043-landing-dock-flow.md`
- `docs/ui/motion/TASK-2043-landing-dock-motion.md`
- En `axis-design-system`: `packages/{tokens,contracts,primitives}/src/landing-dock*`,
  `packages/primitives/fixtures/landing-dock/`, `packages/contracts/scripts/emit-landing-dock-schema.mjs`,
  `apps/lab/src/{components/LandingDockReference.astro,data/landing-dock-demo.ts,scripts/landing-dock-*.ts,pages/demos/landing-dock/,test/e2e/landing-dock.spec.ts}`,
  `docs/quality/landing-dock.md`
- En `efeonce-public-site-runtime`: plugin `wp-content/plugins/eo-landing-dock/` (con su copia fijada de AXIS),
  `manifests/landing-dock/`, `scripts/vendor-axis-landing-dock.mjs`, `tests/eo-landing-dock.test.php`,
  `tests/fixtures/landing-dock/` y `tests/playground/*landing-dock*`.
- En `greenhouse-eo`: `scripts/public-website/landing-dock/`, `scripts/public-website/build-landing-dock-plugin-package.cjs`,
  `scripts/public-website/deploy-landing-dock-plugin-package.php`, `docs/manual-de-uso/public-site/operar-dock-de-landings.md`
  y `docs/documentation/public-site/dock-de-landings.md`.

## Current Repo State

### Already exists

- Diseño aprobado en el canvas v80 y prototipo CSS de la sesión del menú.
- Vidrio de la isla en `axisSiteNav.island` (AXIS) y patrón de lanzador oculto del agendador en
  `ohio-child/inc/site-nav.php` + `assets/js/site-nav-host.js`.
- Primitive `efeonce.landing-dock` construida en local (AXIS `bc263f1`).

### Gap

- Siete docks propios (inventario en el wireframe): Social `.ghs-sticky`
  (`class-eo-social-landing-base.php`), Influencers `#sticky-cta` (HTML en `_elementor_data` de la página 251627), Inicio
  `[data-sticky-cta]` (`includes/agency/templates/experience.html`), SEO `.mcta` (HTML en Elementor), Inbound `.mbar`
  (`includes/inbound/templates/hero.html`), HubSpot `.mdock` (`includes/hubspot-v2/templates/agenda.html`) y
  Performance `.mbar` (`includes/performance/templates/hero.html`).
- `.gh-medios .mbar` en `medios-landing.css` es CSS huérfano (el compilador quita su marcado).

## Modular Placement Contract

- Topology impact: `ui-package`
- Current home: `axis-design-system/packages/{tokens,contracts,primitives}` (paquetes privados) y el plugin
  `eo-elementor-widgets` del runtime del sitio
- Future candidate home: `ui-package`
- Boundary: contrato `efeonce.landing-dock` + esquema `landing-dock.v1`; consumidores: el módulo del dock del sitio y
  futuras landings de Think
- Server/browser split: render de servidor puro (TS en AXIS, port PHP en el sitio validado contra los casos del
  paquete); el JS del navegador sólo decide visibilidad, tono y la intención del agendador
- Build impact: exports nuevos en `axis-ui-primitives` (`./landing-dock`, `.css`, `.js`) y en `axis-ui-contracts`
  (esquema); sin dependencias nuevas
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-platform`
- Usuario / rol: visitante de una landing de `efeoncepro.com`, con mouse, teclado, lector o tacto
- Momento del flujo: lectura de la landing, después del hero
- Resultado perceptible esperado: el siguiente paso siempre a mano, sin tapar lo que se lee
- Friccion que debe reducir: siete docks distintos, algunos sobre el hero o el formulario, otros sin agendador
- No-goals UX: cambiar copy, agregar docks a páginas que no los tienen, rediseñar el agendador

### Surface & system decision

- Surface: barra fija inferior de las landings
- Nav placement: `none` — sitio público, fuera del portal Greenhouse
- Composition Shell: `no aplica` — cromo de un sitio público
- Primitive decision: `new` — `efeonce.landing-dock`; reutiliza el vidrio de `efeonce.site-nav`
- Adaptive density / The Seam: `no aplica` — dos anchos (corte en 768 px)
- Floating/Sidecar/Dialog decision: barra flotante fija; el agendador es el diálogo modal del renderer de Growth CTA
- Copy source: `local one-off` — el copy viene del documento de cada landing; el primitive no trae textos
- Access impact: `none`

### State inventory

- Default: oculto sobre el hero
- Loading: el renderer del agendador carga en reposo o al acercarse al botón
- Empty: landing sin documento → sin dock
- Error: documento inválido → sin dock y log; nunca el viejo y el nuevo a la vez
- Degraded / partial: sin JS → visible con enlaces; agendador sin superficie → enlace de respaldo
- Permission denied: no aplica
- Long content: texto en una línea con elipsis; etiquetas cortas en teléfono sólo con aprobación
- Mobile / compact: teléfono hasta 768 px, sin texto, botones repartidos; `presence` por página
- Keyboard / focus: enlaces nativos; oculto fuera del orden de tabulación; foco devuelto tras el agendador
- Reduced motion: aparece sin desplazarse

### Interaction contract

- Primary interaction: agendar desde el botón principal o ir al formulario desde el secundario
- Hover / focus / active: principal se eleva 1 px; secundario aclara su vidrio; halo de foco del menú
- Pending / disabled: no aplica
- Escape / click-away: los del diálogo del agendador
- Focus restore: al botón del dock que abrió el agendador
- Latency feedback: hasta 2,5 s de espera del renderer, después el enlace de respaldo
- Toast / alert behavior: ninguno

### Motion & microinteractions

- Motion primitive: `CSS`; el JS sólo cambia `data-state` y `data-tone`
- Enter / exit: 450 ms `emphasized` / 250 ms `emphasizedAccelerate`, 24 px
- Layout morph: ninguno
- Stagger: ninguno
- Timing / easing token: `axisLandingDock.motion` (de `axisMotion` y del menú)
- Reduced-motion fallback: sólo opacidad
- Non-goal motion: rebotes, pulsos, animaciones en bucle

### Implementation mapping

- Route / surface: Lab `/demos/landing-dock/<variante>/` y `/patterns/efeonce.landing-dock/`; las siete landings
- Primitive / variant / kind: `efeonce.landing-dock`; tonos `dark`/`light`; con o sin línea; con o sin texto;
  `presence` `all`/`desktop`/`phone`
- Component candidates: `landingDockHtml`, `landing-dock.css`, `landing-dock.js`; port PHP en el plugin
- Copy source: documento `landing-dock.v1` de cada landing
- Data reader / command: meta por página leído en el servidor; WP-CLI para escribirlo
- API parity: el documento del dock se escribe por WP-CLI (agentes) y queda en el meta de la página; sin pantalla de
  admin propia en esta task
- Access / capability: WP-CLI y administradores
- States to implement: los del inventario y la tabla de estados del wireframe

### GVC scenario plan

- Scenario file: `apps/lab/src/test/e2e/landing-dock.spec.ts` (AXIS) y un Playwright contra el sitio en vivo por
  landing (nombre en el Slice 4); GVC del portal no aplica al sitio público
- Route: demos del Lab y las siete landings
- Viewports: 1440×900, 1366×768, 769×1024, 768×1024, 390×844 y 360×740
- Quality profile: `premium`
- Required steps: D1 → D2 (claro, navy, foto) → D3 (agendador) → D3' → D4; mega y onepage abiertos; banner de cookies
- Required captures: un frame por paso y viewport
- Required `data-capture` markers: `landing-dock`
- Assertions: un solo dock por página; ningún dock viejo en el DOM; `cta-location="landing_dock"` en la apertura
- Scroll-width checks: `scrollWidth == clientWidth` con el dock visible
- Reduced-motion / focus evidence: `translate` nulo con movimiento reducido; foco devuelto tras el agendador
- Review dossier: capturas y medición de la sesión «Rediseño de Menú»
- Baseline decision / surface ID: baseline nueva, `public-site-landing-dock`

### Design decision log

- Decision: un mecanismo en AXIS consumido por un módulo único del sitio
- Alternatives considered: restilar los siete docks en cada landing; componente del tema hijo; CSS scroll-driven
  (soporte desigual y sin forma de leer el menú o las cookies)
- Why this pattern: el mismo camino aprobado del menú; un cambio de diseño se hace una vez
- Reuse / extend / new primitive: new, reutilizando el vidrio de `efeonce.site-nav`
- Open risks: copy corto en teléfono; landings en HTML de Elementor (SEO, Influencers) sin fuente versionada; banner
  de cookies real por identificar

### Visual verification

- GVC scenario: ver plan de arriba
- Viewports: los del plan
- Required captures: los del plan
- Required `data-capture` markers: `landing-dock`
- Scroll-width check: todos los viewports
- Accessibility/focus checks: axe sin violaciones con el dock visible en oscuro y claro; foco y lector
- Before/after evidence: tablero DockHoy frente a cada landing migrada, mismos anchos
- Known visual debt: ninguna declarada
- Visual scorecard: `docs/ui/reviews/TASK-2043-landing-dock.scorecard.json`
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-lite`
- Impacto principal: `integration`
- Source of truth afectado: documento del dock por página (meta de WordPress) y lanzadores de los CTA de reunión ya
  publicados en Greenhouse Growth
- Consumidores afectados: el módulo del dock y el renderer de Growth CTA
- Runtime target: `production` (WordPress en Kinsta)

### Contract surface

- Contrato existente a respetar: Growth CTA con `open_meeting_scheduler` y `cta-location`
- Contrato nuevo o modificado: esquema `landing-dock.v1`; `cta-location="landing_dock"`; eventos del primitive
  `landing_dock_view`, `landing_dock_click` y `landing_dock_cta`
- Backward compatibility: `compatible` — los CTA de las landings no se republican; cambia sólo el `cta-location` del
  dock (antes `inbound_mobile_dock` y `hubspot_mobile_dock`)
- Full API parity: el documento se escribe por WP-CLI con validación contra el esquema

### Data model and invariants

- Entidades/tablas/views afectadas: meta de página `_eo_landing_dock` (plugin `eo-landing-dock`)
- Invariantes que no se pueden romper:
  - un documento inválido nunca se pinta;
  - una página nunca tiene el dock viejo y el nuevo;
  - la clave de una superficie de agendador nunca entra al repositorio.
- Write-target allowlist: sólo las siete páginas del inventario
- Tenant/space boundary: sitio propio de Efeonce
- Idempotency/concurrency: escribir el mismo documento dos veces deja el mismo meta
- Audit/outbox/history: snapshot de cada página antes de su migración (Elementor y meta)

### Migration, backfill and rollout

- Migration posture: `none` en Greenhouse; por página en WordPress
- Default state: módulo desplegado sin documentos (sin efecto visible)
- Backfill plan: no aplica
- Rollback path: por página, borrar el meta y restaurar el snapshot del dock viejo; global, desactivar el módulo
- External coordination: autorización del operador para el release de AXIS, el despliegue del plugin y cada landing

### Security and access

- Auth/access gate: WP-CLI y administradores
- Sensitive data posture: claves de superficie leídas de la configuración existente de cada widget o de la opción del
  menú, nunca versionadas
- Error contract: documento inválido → sin dock y log
- Abuse/rate-limit posture: el del agendador nativo

### Runtime evidence

- Local checks: pruebas PHP del port contra `cases.json`; pruebas del módulo
- DB/runtime checks: `wp post meta get <id> _eo_landing_dock`; HTML servido con un solo dock
- Integration checks: el agendador abre desde el dock con `cta-location="landing_dock"` en cada landing que agenda
- Reliability signals/logs: log de PHP del módulo
- Production verification sequence: ver §Production verification sequence

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects.
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [x] Migration/backfill/rollback posture is explicit and proportional to risk.
- [x] Runtime evidence (HTML servido, agendador, un solo dock) is listed and captured. Evidencia: `pnpm public-website:landing-dock verify|status` y Playwright en vivo por landing (abajo).

## Hybrid Execution Justification

- Why not split: el meta por página y el lanzador del agendador sólo existen para pintar el dock; separarlos dejaría una
  task de datos sin superficie que probar. EPIC-055 pide tasks compactas.
- Primary execution profile: `ui-ux`
- Contract boundary: el primitive no conoce WordPress ni el agendador; el módulo del sitio sólo lee el documento y
  conecta el agendador ya publicado
- Risk controls: módulo inerte sin documentos; migración landing por landing con snapshot y vuelta atrás; autorización
  del operador en cada escritura de producción

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

### Slice 1 — Primitive en AXIS

- Tokens `axisLandingDock`, contrato `efeonce.landing-dock`, esquema `landing-dock.v1` (con `presence` por ancho),
  render de servidor, `landing-dock.css` con peso de id y `landing-dock.js` sin dependencias.
- Demo del Lab con el menú real, página del patrón, casos de referencia para el port PHP y pruebas de navegador en el
  carril de cromo del sitio, incluida la hoja hostil de Ohio.
- Paridad medida y aprobada por la sesión «Rediseño de Menú» a 1440 y 390.

### Slice 2 — Release de AXIS y módulo del sitio

- `pnpm release:packages` con autorización del operador; instalación privada verificada.
- Copia fijada en el plugin con `VERSION.json` y sha256.
- Módulo del dock en `eo-elementor-widgets`: port PHP validado contra `cases.json`, documento por página, marcadores de
  inicio, final y cookies, lanzador `<greenhouse-cta cta-location="landing_dock">` y puente al agendador con la piel del
  sitio.
- Despliegue del plugin sin documentos (sin efecto visible).

### Slice 3 — Migración de las siete landings

Una por una, con snapshot previo, verificación en vivo y vuelta atrás: Inbound, HubSpot, Performance, Inicio, Redes
Sociales, SEO e Influencers. En cada una se retira el dock viejo (plantilla, CSS y JS, o el HTML de Elementor) en el
mismo paso en que se escribe el documento. Se elimina el CSS huérfano de Medios.

### Slice 4 — Verificación y documentación

- Playwright en vivo por landing (pasos del plan), revisión de la sesión de fidelidad.
- Arquitectura (§Dock), documentación funcional y manual del sitio; skill del sitio público; cierre de la task.

## Out of Scope

- Agregar dock a páginas que hoy no lo tienen o activar escritorio donde hoy sólo hay teléfono (decisión del operador
  pendiente; el esquema queda listo).
- Cambiar copy, incluidas etiquetas cortas, sin aprobación del operador.
- Pantalla de admin para editar el documento del dock.
- El reproductor flotante de `/landing-loop-marketing/` (no es un dock).
- Republicar los CTA de reunión.

## Detailed Spec

Regiones, medidas, estados, copy por landing y decisiones:

- `docs/ui/wireframes/TASK-2043-landing-dock.md`
- `docs/ui/flows/TASK-2043-landing-dock-flow.md` (nodos D1–D4 del flujo maestro de EPIC-055)
- `docs/ui/motion/TASK-2043-landing-dock-motion.md`
- AXIS `docs/quality/landing-dock.md`

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → paridad aprobada → Slice 2 → Slice 3 (una landing a la vez) → Slice 4.
- Ninguna landing se migra sin el plugin desplegado con la versión fijada de AXIS.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Dock viejo y nuevo a la vez | WordPress | medium | Retiro del viejo en el mismo paso; prueba en vivo «un solo dock» | Dos `aside`/barras fijas en el DOM |
| Estilos de Ohio o de la landing alteran el dock | UI | low | Peso de id + prueba de hoja hostil | Diferencia de medidas frente al Lab |
| El agendador abre con otro dueño o calendario | Growth | low | Social e Inicio usan `discovery` (misma página `efeoncepro/agenda-discovery`); comparado antes de migrar | Reserva en un calendario inesperado |
| Edición de `_elementor_data` rompe SEO o Influencers | WordPress | medium | Snapshot de la página, reemplazo acotado al bloque del dock, verificación en vivo | Diferencias fuera del dock al comparar el HTML servido |
| Pérdida de medición del dock de Inbound/HubSpot | Medición | medium | `landing_dock` documentado; Delta en TASK-2039 | Caída de `greenhouse_cta_*` en esas páginas |
| El banner de cookies real no se detecta | UI | medium | Marcarlo con `data-landing-dock-avoid` o su selector; prueba en vivo | Dock sobre el banner |

### Feature flags / cutover

- Por página: el documento en el meta enciende el dock de esa página; sin documento no hay dock nuevo.
- Global: el módulo puede desactivarse sin tocar las landings.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Versión correctiva del paquete | < 1 h | si |
| Slice 2 | Volver a la versión anterior del plugin (backup del deploy) | < 15 min | si |
| Slice 3 | Por landing: borrar el meta y restaurar el snapshot del dock viejo | < 15 min | si |
| Slice 4 | Sólo documentación | n/a | si |

### Production verification sequence

1. Lab y suite de AXIS verdes; paridad aprobada.
2. Release de AXIS e instalación privada verificada; copia fijada con sha256.
3. Plugin desplegado sin documentos: ninguna landing cambia (HTML servido igual).
4. Por landing: snapshot → documento + retiro del viejo → purga de caché → Playwright en vivo (1440, 768/769, 390) →
   visto bueno de la sesión de fidelidad.

### Out-of-band coordination required

- Autorización del operador para el release de AXIS, el despliegue del plugin y cada escritura en una landing.
- Comprobar sesiones activas en `axis-design-system` y en el runtime del sitio antes de publicar o desplegar.
- Decisiones del operador: escritorio para todas las landings y etiquetas cortas de Influencers.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Tokens `axisLandingDock` reutilizan las dos recetas de la isla de `axisSiteNav` y el CSS del primitive no tiene
  colores, `blur` ni duraciones literales. Evidencia: `tokens/src/landing-dock.test.ts` y la prueba de fuente de
  `primitives/src/landing-dock.test.ts` (AXIS `bc263f1`).
- [x] El esquema `landing-dock.v1` se publica como archivo y rechaza HTML, enlaces no permitidos, más de dos acciones y
  el agendador como secundaria. Evidencia: `contracts/src/landing-dock.test.ts` (5 pruebas).
- [x] El render produce todas las acciones como enlaces sin JavaScript y los casos de referencia para el port PHP.
  Evidencia: `fixtures/landing-dock/cases.json` y la prueba «without JavaScript the dock stays visible».
- [x] En el Lab: barra 63 con borde, botones de 45, centrado a 20 px en escritorio; a 12 px y botones iguales en
  teléfono; oculto sobre el hero, cerca del final, con el menú abierto y con el banner de cookies; tono sobre claro,
  navy y foto; hoja hostil sin efecto; axe limpio. Evidencia: `landing-dock.spec.ts`, 25 pruebas verdes con site-nav.
- [x] La sesión «Rediseño de Menú» aprobó la paridad del Lab a 1440 y 390 (2026-10-23, tras tres correcciones: Influencers con un botón en teléfono, tono sobre gradientes y presencia de hoy).
- [x] AXIS publicado con versión nueva e instalación privada verificada. Evidencia: v0.7.12 (contracts 0.7.12, tokens 0.6.9, registry 0.7.5, primitives 0.7.12), v0.7.13 y v0.7.14 en GitHub Packages; paquetes bajados con `npm pack` y vendorizados con sha256 en `VERSION.json`. `v0.7.11` se detuvo antes de publicar (prueba de exports del carril de agentes).
- [x] El plugin pinta el dock desde el documento de cada página con el port PHP validado contra `cases.json`. Evidencia:
  `tests/eo-landing-dock.test.php` (10 casos byte a byte, esquema, config y retiro del dock viejo sobre el marcado real
  de las siete landings) y Playground: con el meta, dock nuevo y sin `nav.mbar`; sin el meta, vuelve el viejo.
- [x] Las siete landings usan el dock en vivo, con su copy de hoy y sin dock viejo en el DOM. Evidencia: `status` = 7 `on`; `verify` por landing = 1 dock, 0 viejos.
- [x] En las landings que agendan, el dock abre el agendador nativo con `cta-location="landing_dock"`. Evidencia: Playwright en vivo abrió el diálogo en Inbound, HubSpot, Redes Sociales e Influencers; Inicio sirve el lanzador `landing_dock`.
- [x] Paridad en vivo aprobada por la sesión de fidelidad en las siete landings (una por una, 2026-10-23).
- [x] Arquitectura, documentación funcional, manual y skill del sitio actualizados (§Dock inferior de las landings,
  `dock-de-landings.md` 1.1, `operar-dock-de-landings.md` 1.1, referencia de la skill espejada, `PRIMITIVES.md`).
- [x] `UI ready` se mantuvo en `no` hasta completar mapping, plan de captura y decision log; si pasó a `yes`,
  `pnpm task:lint --task TASK-2043` quedó sin hallazgos.

## Cierre (2026-10-23)

### Las siete landings en vivo

| Landing | Página | Presencia | Acciones (principal · secundaria) | Agendador | Parada | Dock viejo retirado |
|---|---|---|---|---|---|---|
| Redes Sociales | 251300 | escritorio | «Reunión» · «Auditoría» → `#auditoria` (texto «¿Listo para crecer en social?») | menú (`site-nav-discovery-meeting`) | — | `div#ghrs-sticky` |
| Influencers | 251627 | ambos (teléfono: sólo la principal) | «Agenda una reunión» · «Cuéntanos tu campaña» → `#conversion` (antetítulo «Siguiente paso») | propio (`influencer-discovery-meeting`) | `#conversion` | `div#sticky-cta` |
| Inicio | 251731 | teléfono | «Agenda una reunión» (sin línea) | menú (`site-nav-discovery-meeting`) | — | `div[data-sticky-cta]` |
| SEO | 251078 | teléfono | «Diagnostica tu visibilidad» → `#grader` | — | `#grader` | `div.mcta` |
| Inbound | 242601 | teléfono | «Agenda una reunión» · «Diagnóstico» → `#diagnostico` | propio (`inbound-discovery-meeting`) | — | `nav.mbar` |
| Servicios HubSpot | 244079 | teléfono | «Agendar reunión» · «Ir al formulario» → `#agenda-form` | propio (`hubspot-discovery-meeting`) | — | `nav.mdock` |
| Performance | 251997 | teléfono | «Agenda un diagnóstico» → `#diagnostico` | — | `#diagnostico` | `nav.mbar` |

Todas sirven AXIS primitives 0.7.14 desde el plugin `eo-landing-dock`; el agendador del dock mide
`cta-location="landing_dock"`. Vuelta atrás por página: `pnpm public-website:landing-dock off <landing> --confirm`
(borra el meta `_eo_landing_dock`, purga y verifica que el dock viejo volvió); el snapshot previo de cada página está en
`greenhouse-eo/tmp/landing-dock/snapshots/`. Global: desactivar el plugin.

### Cómo se llegó

- **Releases de AXIS:** `v0.7.11` no publicó (la prueba de exports declarados del carril de agentes no conocía
  `landing-dock`; la CI del dock corría sólo el carril site-nav, ahora arrastra el de agentes). `v0.7.12` publicó el
  dock. `v0.7.13` corrigió el tono con el agendador abierto (diálogo modal en shadow root) y llevó la guarda equivalente
  de la isla del menú. `v0.7.14` agregó el marcador de parada pedido por fidelidad para SEO.
- **Hallazgos en vivo corregidos:** tono sobre gradientes/velos/cromo fijo de Ohio (SEO), tono tras el agendador
  (Inbound/HubSpot), botones repartidos por etiqueta en teléfono, banner de cookies por superposición y la copia de
  AXIS del plugin fuera de git (excepción en `.gitignore`); la línea base en vivo ahora incluye el plugin.
- **Orden de encendido:** Inbound, HubSpot, Performance, Inicio, Redes Sociales, SEO e Influencers; snapshots en
  `greenhouse-eo/tmp/landing-dock/snapshots/`.

## Verification

- AXIS: `pnpm test`, `pnpm typecheck`, `pnpm design:check` y
  `npx playwright test -c apps/lab/playwright.site-nav.config.ts`.
- Sitio: pruebas PHP del port y del módulo; Playwright en vivo por landing.
- `pnpm task:lint --task TASK-2043` en `greenhouse-eo`.

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [x] EPIC-055 actualizada con el estado de esta task y la versión publicada del paquete
- [x] `docs/architecture/public-site/PRIMITIVES.md` registra `efeonce.landing-dock` con su versión

## Follow-ups

- Dock en escritorio para las landings que hoy sólo lo tienen en teléfono, si el operador lo decide (cambio de
  `presence` por documento, sin código).
- Admin del documento del dock, si aparece necesidad de edición por personas.
- Retirar del código de cada landing su dock antiguo (plantillas, CSS y JS inertes), **no antes del 2026-11-06** (dos
  semanas de observación); hasta entonces el plugin lo quita del HTML y lo devuelve con `off`, que es el rollback.
- Puente del agendador: `site-nav-host.js` y `landing-dock-host.js` adoptan el diálogo del renderer de CTAs mirando el
  DOM (piel del sitio, foco de vuelta). El arreglo de fondo es que el renderer (`src/growth-cta-renderer/`) exponga una
  apertura con piel y foco de retorno; entonces ambos hosts dejan su copia. Tarea propia, no un módulo compartido más.
- ~~Alta de `gh_landing_dock_clicked` en GTM y GA4~~ — hecho 2026-10-23: el evento suma `target_label` y `target_url`
  (runtime `3801bc4`, plugin desplegado), GTM versión 8 (`scripts/gtm/build-landing-dock-events-workspace.ts`) y cuatro
  dimensiones de evento en GA4. Hit `/g/collect` con los cuatro parámetros verificado en vivo.

## Open Questions

- ¿Todas las landings con dock en escritorio y teléfono? Consultado al operador por la sesión de fidelidad
  (2026-10-23); mientras tanto se conserva la presencia de hoy.
- ¿Etiquetas cortas de teléfono para Influencers («Reunión» / «Tu campaña»)? Consultado al operador; no se aplican hasta
  su respuesta.
- ~~¿Qué banner de cookies usa el sitio?~~ Resuelto 2026-10-23: el de HubSpot (`#hs-eu-cookie-confirmation`, con la
  piel de `eo-measurement-consent`). El dock se aparta sólo si se superpone con su lugar (en escritorio la tarjeta va
  abajo a la derecha y no lo tapa).
