# TASK-2042 — Navegación global: puesta en efeoncepro.com (piloto y sitio completo)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-2042-site-nav-wordpress-host.md`
- Flow: `docs/ui/flows/TASK-2042-site-nav-wordpress-flow.md`
- Motion: `docs/ui/motion/TASK-2040-site-nav-motion.md`
- Backend impact: `integration`
- Epic: `EPIC-055`
- Status real: `Slices 1 y 2 code complete en local (runtime 5ca3637 + 1b26063, AXIS 42b7f5e sin publicar); sin escrituras en producción. Pendiente: publicar AXIS primitives 0.7.2, Slice 3 (agendador), Slice 4 (alta GTM/GA4) y piloto con autorización`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `none`
- Branch: `Greenhouse develop para docs y scripts de Growth; el codigo del sitio vive en efeonce-public-site-runtime con release acotado por SSH; sin worktrees`

## Summary

Monta la navegación global en `efeoncepro.com` sobre el primitive de `TASK-2040` y el documento de `TASK-2041`:

- **Adaptador de encabezado** en `ohio-child` con interruptor `off`/`pilot`/`on`.
- **Inventario y resolución** de las variantes de encabezado de Ohio.
- **Agendador:** superficie de Growth CTA propia del encabezado global y piel compartida del diálogo.
- **Medición:** eventos en GTM y GA4.
- **Despliegue:** piloto en una página y después todo el sitio.
- **Doctrina:** actualiza la de navegación del sitio y la documentación.

Apagar el interruptor devuelve el encabezado de Ohio.

## Why This Task Exists

El menú aprobado sólo existe en el canvas y, después de `TASK-2040` y `TASK-2041`, como paquete y documento. Para que
la gente lo use falta resolver lo que sólo el sitio sabe:

- en qué páginas aplica y con qué estado arranca la cabecera;
- cómo convive con las variantes de encabezado de Ohio y con la barra del admin;
- qué superficie del agendador usa;
- cómo se mide;
- cómo se vuelve atrás.

Además, la doctrina vigente del sitio («no reemplazar el encabezado de Ohio») tiene que quedar reemplazada por PDR-027
de forma explícita, no por omisión.

## Goal

- El menú nuevo funciona en una página piloto con las mismas garantías que en el Lab y se puede apagar en un paso.
- Tras el go del operador, funciona en todo el sitio: landings, blog, Glitch, 404 y archivos.
- «Agenda tu diagnóstico» abre el agendador nativo desde la cabecera, el mega y el onepage, con medición por punto de
  entrada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md` (§Adaptador WordPress, §Agendador, §Medición,
  §Rollout y rollback)
- `docs/public-site/decisions/PDR-027-navegacion-global-del-sitio-portable.md`
- `docs/public-site/decisions/PDR-024-axis-en-el-sitio-publico-composicion-agentica.md`
- `docs/architecture/GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/PUBLIC_SITE_KINSTA_ACCESS_AGENT_INVARIANTS.md`
- `docs/architecture/public-site/PUBLIC_MISCELLANEOUS_SURFACES_V1.md` (cromo compartido en 404 y archivos)

Reglas obligatorias:

- **Interruptor con respaldo a Ohio.** Documento inválido, interruptor `off` o página fuera del piloto → encabezado de
  Ohio, nunca una cabecera vacía.
- **AXIS con versión fijada** en `ohio-child/assets/vendor/axis/<versión>/`, cargado sólo donde hay menú nuevo; nunca
  `-latest` ni registry.
- **Enlaces en el HTML de servidor;** el JS sólo mejora.
- **La clave del agendador nunca va a documentos, commits ni mensajes.**
- **Despliegue sólo por el release acotado por SSH** con guarda `previousSha256`, respaldo, OPcache y purga de Kinsta.
- **El go a todo el sitio lo da el operador** después de revisar el piloto.

## Normative Docs

- Skill `efeonce-public-site-wordpress`: `native-navigation.md`, `runtime-and-discovery.md`,
  `custom-elementor-widgets.md` (§Deployment Rail), `growth-forms-wordpress.md` y `landing-workflow.md`.
- Skills `greenhouse-growth-ctas` (superficie y publicación de CTA) y `greenhouse-gtm-ga4-operator` (eventos).
- Canvas «Mega menú efeoncepro.com» (versión 67), nota «Agendar desde el menú».

## Dependencies & Impact

### Depends on

- `TASK-2040`: versión publicada del primitive `efeonce.site-nav`.
- `TASK-2041`: plugin con documento publicado, REST y datos dinámicos de Recursos.
- Renderer de Growth CTA (`gh-growth-cta-renderer-latest`, registrado en
  `eo-elementor-widgets/includes/class-eo-widgets-loader.php`) y patrón de publicación
  `scripts/growth/publish-inbound-meeting-cta.ts`.
- Piel del diálogo del agendador en `scripts/public-website/inbound-source/page.css`.

### Blocks / Impacts

- Todas las páginas de `efeoncepro.com` cambian de encabezado al pasar a `on`.
- Landings de EPIC-047: heredan el encabezado nuevo; sus «Estás aquí» dependen de `context.matchers`.
- Doctrina de la skill del sitio: `native-navigation.md` queda reemplazada para el encabezado global.

### Files owned

- `docs/ui/wireframes/TASK-2042-site-nav-wordpress-host.md`
- `docs/ui/flows/TASK-2042-site-nav-wordpress-flow.md`
- En `efeonce-public-site-runtime`: override de encabezado y carga de assets en `wp-content/themes/ohio-child/` [rutas
  exactas en el discovery]; `ohio-child/assets/vendor/axis/<versión>/`
- Script de publicación de la superficie del agendador del encabezado en `scripts/growth/` [nombre en el discovery]
- `.claude/skills/efeonce-public-site-wordpress/references/native-navigation.md` y su espejo en `.codex`
- `docs/documentation/public-site/` y `docs/manual-de-uso/public-site/` (documentación funcional y manual de la
  navegación)

## Current Repo State

### Already exists

- El encabezado de Ohio pinta el término 61 «Menu 1» como `nav#site-navigation ul#menu-primary` y `ul#mobile-menu`;
  `ohio-child` no sobrescribe el encabezado (`parts/elements/` sólo tiene `footer.php` y `page_headline.php`).
- Variantes por página con metas de Ohio y logo fijo con ACF (`ohio-child/inc/acf-logo-settings.php`); documentadas en
  `docs/documentation/public-site/wordpress-ohio-elementor-layout.md`.
- Renderer de Growth CTA cargado en WordPress por widget y CTA de reunión publicado para Inbound
  (`inbound-discovery-meeting`).
- Carril de release del sitio por SSH, con guardas.

### Gap

- ~~No hay adaptador ni interruptor; el punto exacto de enganche del encabezado de Ohio no está confirmado.~~ Cerrado
  2026-10-22: Ohio llama `get_template_part('parts/headers/header', 'style-N')` desde `header.php`; el tema hijo
  sobrescribe `header-style-1..8.php` y el adaptador vive en `ohio-child/inc/site-nav.php` (local, sin desplegar).
- No hay superficie del agendador para todo el sitio; hoy cada CTA está atado a una landing.
- La piel elegante del diálogo está con alcance de una landing.
- No existen en GTM ni GA4 los eventos del menú (`gh_site_nav_opened`, `gh_site_nav_line_viewed`,
  `gh_site_nav_clicked`); el módulo del anfitrión ya los empuja al `dataLayer` en local.
- La doctrina del sitio todavía dice conservar el encabezado de Ohio.

## Modular Placement Contract

- Topology impact: `public`
- Current home: `efeonce-public-site-runtime/wp-content/themes/ohio-child/` (WordPress en Kinsta)
- Future candidate home: `public`
- Boundary: adaptador de encabezado que consume el primitive `efeonce.site-nav` (versión fijada) y el documento del
  plugin «EO Navegación»; superficie de Growth CTA del encabezado global
- Server/browser split: render del menú y datos dinámicos en PHP; en el navegador sólo `site-nav.js` y el renderer de
  Growth CTA; la clave del agendador se resuelve como hoy en los widgets, nunca en el repo
- Build impact: assets de AXIS vendorizados en el tema; sin build nuevo en WordPress
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: visitante de `efeoncepro.com`
- Momento del flujo: cualquier página del sitio
- Resultado perceptible esperado: la navegación del canvas, igual en todas las páginas, con el agendador a un clic
- Friccion que debe reducir: encabezado de Ohio sin estructura de líneas ni recursos; agendar obliga a ir a otra página
- No-goals UX: rediseñar el pie, cambiar el contenido de las páginas

### Surface & system decision

- Surface: encabezado global de `efeoncepro.com`
- Nav placement: `none` — sitio público, fuera del portal Greenhouse
- Composition Shell: `no aplica` — tema de WordPress
- Primitive decision: `reuse` — `efeonce.site-nav` de AXIS (`TASK-2040`); la piel del diálogo del agendador se
  `extend` como primitive compartida del sitio
- Adaptive density / The Seam: `no aplica`
- Floating/Sidecar/Dialog decision: paneles y onepage del primitive; diálogo del agendador de Growth CTA
- Copy source: `local one-off` — el contenido viene del documento; los textos de sistema, del primitive
- Access impact: `none`

### State inventory

- Default: estado inicial por tipo de página (`top` sobre hero oscuro, `fixed` en páginas claras)
- Loading: datos dinámicos de Recursos con caché corta; fotos al abrir
- Empty: formato de Recursos sin notas → destacado fijo
- Error: documento inválido → Ohio + log
- Degraded / partial: sin JS → enlaces; agendador sin superficie → `/agenda/`
- Permission denied: no aplica
- Long content: según el primitive
- Mobile / compact: hamburguesa bajo 1.181 px; agendador al pie del onepage en teléfono
- Keyboard / focus: según el flujo maestro; foco devuelto tras el agendador
- Reduced motion: según el contrato de motion de `TASK-2040`

### Interaction contract

- Primary interaction: abrir paneles, elegir destino y agendar
- Hover / focus / active: según el primitive
- Pending / disabled: no aplica
- Escape / click-away: según el primitive; cierra el panel antes de abrir el agendador
- Focus restore: al lanzador del punto de entrada tras cerrar el agendador
- Latency feedback: cruce de fotos con espera de carga
- Toast / alert behavior: ninguno

### Motion & microinteractions

- Motion primitive: `CSS` del primitive, sin motion propio del host
- Enter / exit: heredados del contrato de motion de `TASK-2040`
- Layout morph: ninguno propio
- Stagger: heredado
- Timing / easing token: `axisMotion`
- Reduced-motion fallback: heredado
- Non-goal motion: animaciones propias del tema sobre el menú

### Implementation mapping

- Route / surface: todas las páginas de `efeoncepro.com` según el interruptor
- Primitive / variant / kind: `efeonce.site-nav` con estado inicial por tipo de página
- Component candidates: override de encabezado en `ohio-child`, carga de assets, montaje de `<greenhouse-cta>`
- Copy source: documento `site-nav.v1`
- Data reader / command: lectura del documento publicado del plugin y de los datos dinámicos (servidor)
- API parity: la edición del menú vive en `TASK-2041`; esta task sólo consume
- Access / capability: opción `eo_site_nav_enabled` editable por administradores y por WP-CLI
- States to implement: los del inventario y del wireframe del host

### GVC scenario plan

- Scenario file: Playwright contra el sitio en vivo con la página piloto (nombre en el discovery); GVC del portal no
  aplica al sitio público
- Route: página piloto; en `on`, Home, una landing con «Estás aquí», un post, Glitch y 404
- Viewports: 1440×900, 1366×768, 1180×820, 834×1112 y 390×844
- Quality profile: `premium`
- Required steps: N1 → N8 del flujo maestro; agendar desde la cabecera y desde el onepage; interruptor `off` y `on`
- Required captures: un frame por paso y viewport
- Required `data-capture` markers: los del primitive (`site-nav-header`, `site-nav-mega`, `site-nav-dropdown`,
  `site-nav-onepage`)
- Assertions: enlaces en el HTML de servidor (`curl` sin JS); un panel a la vez; foco devuelto tras el agendador; con
  `off` vuelve Ohio
- Scroll-width checks: `scrollWidth == clientWidth` en todos los viewports
- Reduced-motion / focus evidence: misma secuencia con movimiento reducido
- Review dossier: adjunto a la task
- Baseline decision / surface ID: baseline nueva, `public-site-global-nav`

### Design decision log

- Decision: adaptador con interruptor y respaldo a Ohio
- Alternatives considered: reemplazo directo en todo el sitio (sin piloto ni vuelta atrás); mega menú nativo de Ohio
  (no soporta el diseño)
- Why this pattern: se mide en una página real y se apaga en un paso
- Reuse / extend / new primitive: reuse del primitive; extend de la piel del agendador a primitive compartida del sitio
- Open risks: punto de enganche de Ohio por confirmar; variantes por página no inventariadas; Core Web Vitals

### Visual verification

- GVC scenario: ver plan de arriba
- Viewports: los del plan
- Required captures: los del plan
- Required `data-capture` markers: los del plan
- Scroll-width check: todos los viewports
- Accessibility/focus checks: teclado, foco devuelto tras el agendador, contraste sobre los heros reales
- Before/after evidence: encabezado de Ohio frente al nuevo, mismas páginas y viewports
- Known visual debt: ninguna declarada
- Visual scorecard: `docs/ui/reviews/TASK-2042-site-nav-wordpress-host.scorecard.json`
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: superficie de Growth CTA del encabezado global (definición de CTA y `meeting_surface_binding`
  en Greenhouse) y configuración de GTM y GA4
- Consumidores afectados: el adaptador del encabezado y el renderer de Growth CTA en el navegador
- Runtime target: `production` (Greenhouse Growth, WordPress, GTM y GA4)

### Contract surface

- Contrato existente a respetar: Growth CTA con la acción `open_meeting_scheduler` y `cta-location`; arquitectura del
  agendador (`GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md`)
- Contrato nuevo o modificado: CTA y superficie del encabezado global, publicados con un script en el patrón de
  `scripts/growth/publish-inbound-meeting-cta.ts`; eventos `gh_site_nav_opened`, `gh_site_nav_line_viewed` y
  `gh_site_nav_clicked` (desde `site_nav_open`, `site_nav_line_view` y `site_nav_click` del primitive)
- Backward compatibility: `compatible` (los CTA de las landings no cambian)
- Full API parity: la superficie se publica por el script gobernado de Growth, no a mano

### Data model and invariants

- Entidades/tablas/views afectadas: definiciones de CTA y superficies de Growth en Greenhouse [verificar tablas en el
  discovery con la skill `greenhouse-growth-ctas`]
- Invariantes que no se pueden romper:
  - la allowlist de origen de la superficie cubre todas las páginas donde aparece el menú;
  - la clave de la superficie nunca sale de su almacenamiento seguro;
  - los eventos no llevan PII.
- Write-target allowlist: `N/A` — se usa el script gobernado de publicación de Growth, que ya conoce sus destinos
- Tenant/space boundary: superficie de Efeonce (sitio propio), sin datos de clientes
- Idempotency/concurrency: republicar el CTA rota la clave; se publica una vez y se registra dónde vive la clave
- Audit/outbox/history: publicación registrada por el propio script de Growth

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: interruptor en `off` tras el despliegue; `pilot` para la página elegida; `on` sólo con go del operador
- Backfill plan: no aplica
- Rollback path: interruptor a `off` + purga de Kinsta; el CTA de la superficie queda sin uso
- External coordination: go del operador para `pilot` y `on`; publicación de los eventos en GTM con la skill de medición

### Security and access

- Auth/access gate: opción del interruptor sólo para administradores y WP-CLI; superficie del agendador con allowlist
  de origen
- Sensitive data posture: la clave del agendador es secreta; sin PII en eventos
- Error contract: ante fallas, respaldo silencioso a Ohio o al enlace `/agenda/`, con registro en logs
- Abuse/rate-limit posture: el que ya aplica el agendador nativo

### Runtime evidence

- Local checks: pruebas del adaptador (respaldo a Ohio, estado inicial por tipo de página, contexto)
- DB/runtime checks: `wp option get eo_site_nav_enabled`; HTML servido con y sin el menú según el interruptor
- Integration checks: el agendador abre desde los tres puntos de entrada; eventos en `dataLayer` y en GA4 DebugView
- Reliability signals/logs: log de PHP del adaptador
- Production verification sequence: ver §Production verification sequence

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime evidence (HTML servido, agendador, eventos) is listed and captured.

## Hybrid Execution Justification

- Why not split: la superficie del agendador y los eventos sólo tienen sentido montados en el encabezado; separarlos
  dejaría una task de configuración sin superficie que probar, y el operador pidió tasks compactas (EPIC-055).
- Primary execution profile: `ui-ux`
- Contract boundary: la superficie de Growth se publica con su script gobernado y la medición con la skill de GTM; el
  adaptador sólo consume ambos
- Risk controls: interruptor con respaldo a Ohio; piloto antes de todo el sitio; la superficie se publica una sola vez y
  la clave no se versiona

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

### Slice 1 — Inventario y enganche

> Avance 2026-10-22: hecho. Enganche en `parts/headers/header-style-N.php` (Ohio 3.7.0, sin plantillas de cabecera de
> Elementor Pro). Variantes vivas: global `style3`; por página `style1` ×7, `style4`, `style3` y `style6` (sólo
> `/blog/` #18456, excluida mientras `TASK-1802` la rediseña). Estado inicial: con el espaciador de Ohio
> (`page_header_add_cap`) → `fixed`/claro; sin él → `top`, oscuro salvo seis páginas de hero claro (251078, 242261,
> 223787, 223841, 21460, 19820). El logo fijo de ACF no aplica: el menú usa los logos de AXIS.

- Confirmar el punto de enganche del encabezado de Ohio y cómo apagarlo por página.
- Inventario de variantes de encabezado (metas de Ohio, logo fijo de ACF, plantillas especiales: blog, Glitch, 404 y
  archivos), mapeadas a un estado del primitive o a una excepción documentada.

### Slice 2 — Adaptador con interruptor

> Avance 2026-10-22: code complete en local. Port PHP del render idéntico byte a byte a AXIS (12 casos,
> `tests/eo-site-nav-render.test.php`); adaptador con interruptor, respaldo a Ohio ante plugin ausente, documento
> ausente o inválido y error de render (registrado en el log); assets fijados en
> `ohio-child/assets/vendor/axis/site-nav/0.7.2/` con `VERSION.json` (sha256) por `scripts/vendor-axis-site-nav.mjs`;
> fuentes del menú cargadas por el adaptador; barra del admin con `--axis-site-nav-offset`. El piloto en Playground
> encontró estilos de Ohio dentro del menú y se corrigieron en AXIS (aislación, isla de 63 px, offset): primitives
> 0.7.2 local, con prueba de anfitrión hostil; la comparación de estilos calculados Lab vs WordPress da cero
> diferencias en escritorio (reposo, panel abierto, hover) y en el onepage de 390 px. Antes de desplegar: publicar
> AXIS 0.7.2 y volver a copiar desde el paquete publicado.

- Override del encabezado en `ohio-child`:
  - opciones `eo_site_nav_enabled` (`off`/`pilot`/`on`) y `eo_site_nav_pilot_pages`;
  - lectura del documento publicado;
  - estado inicial por tipo de página y contexto «Estás aquí»;
  - datos dinámicos de Recursos;
  - respaldo a Ohio.
- Assets de AXIS con versión fijada en `ohio-child/assets/vendor/axis/<versión>/`, cargados sólo con el menú nuevo.
- Convivencia con la barra del admin.

### Slice 3 — Agendador

- Superficie y CTA del encabezado global publicados con el script gobernado de Growth, con allowlist de origen para
  todo el sitio.
- `<greenhouse-cta>` en los tres puntos de entrada con `cta-location` `menu_header`, `menu_mega` y `menu_onepage`.
- La piel elegante del diálogo pasa de la landing de Inbound a una primitive compartida del sitio.

### Slice 4 — Medición

- Eventos `gh_site_nav_opened`, `gh_site_nav_line_viewed` y `gh_site_nav_clicked` al `dataLayer` (desde
  `site_nav_open`, `site_nav_line_view` y `site_nav_click` del primitive), con alta en GTM y GA4 por la skill de
  medición, sin PII. `site_nav_cta` no se empuja: el clic ya viaja en `gh_site_nav_clicked` con `target_type: cta` y el
  agendador emite `greenhouse_cta_*`.
- Avance 2026-10-22: el empuje al `dataLayer` está hecho en local (`ohio-child/assets/js/site-nav-host.js`); falta el
  alta en GTM y GA4, que se publica con confirmación humana.

### Slice 5 — Piloto

- Release acotado por SSH con el interruptor en `off`; luego `pilot` en la página elegida con el operador.
- Captura y revisión en los viewports del plan.
- Prueba de vuelta a `off` y regreso a `pilot`.
- Core Web Vitals frente a la medición previa.

### Slice 6 — Todo el sitio y documentación

- Con el go del operador, `on`.
- Captura de Home, una landing con «Estás aquí», un post, Glitch y 404.
- Actualización de la doctrina: `native-navigation.md` y `runtime-and-discovery.md` de la skill del sitio, en `.claude`
  y `.codex`.
- Documentación funcional y manual de la navegación en `docs/documentation/public-site/` y
  `docs/manual-de-uso/public-site/`.

## Out of Scope

- Construir el primitive o cambiar su comportamiento: `TASK-2040`.
- Editar el documento del menú, el admin y las fotos: `TASK-2041`.
- Pie de página y búsqueda del sitio.
- Adaptador de Think (follow-up de EPIC-055).

## Detailed Spec

Montaje, estados del host, agendador y medición: `docs/ui/wireframes/TASK-2042-site-nav-wordpress-host.md`,
`docs/ui/flows/TASK-2042-site-nav-wordpress-flow.md` y
`docs/architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md`. No se duplica aquí.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5 → Slice 6.
- Slice 5 (piloto) no empieza sin `TASK-2040` publicada y `TASK-2041` con documento publicado.
- Slice 6 (`on`) requiere el go explícito del operador después de revisar el piloto.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Página sin navegación por error del adaptador | Sitio público | low | Respaldo a Ohio ante cualquier error; piloto primero | Log de PHP del adaptador; HTML sin `nav` |
| Variante de Ohio rota (hero, logo, transparencia) | Sitio público | medium | Inventario del Slice 1 y captura de cada tipo de página antes de `on` | Diferencias en las capturas antes y después |
| Regresión de Core Web Vitals | Sitio público | medium | Assets sólo donde hay menú; fotos al abrir; JS diferido | CWV del piloto frente a la medición previa |
| Agendador que no abre o pierde el foco | Growth / sitio | low | Cerrar el panel antes de abrir; lanzador montado; respaldo a `/agenda/` | Prueba de los tres puntos de entrada |
| Caché sirve el encabezado anterior | Sitio público | medium | Purga de Kinsta tras cada cambio de interruptor | HTML servido distinto del esperado |
| Clave del agendador expuesta | Growth | low | Resolución como hoy en los widgets; nunca en el repo ni en mensajes | Revisión del diff antes de cada commit |

### Feature flags / cutover

- Opción `eo_site_nav_enabled` (`off` por defecto tras el despliegue).
  - `pilot`: limita a `eo_site_nav_pilot_pages`.
  - `on`: aplica a todo el sitio.
  - Vuelta atrás: `wp option update eo_site_nav_enabled off` + purga de Kinsta.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Sin cambios en vivo | inmediato | si |
| Slice 2 | Interruptor en `off`; si hace falta, release anterior del tema con el respaldo del deploy | < 15 min | si |
| Slice 3 | El CTA del encabezado queda sin uso; las landings no cambian | < 15 min | si |
| Slice 4 | Pausar las etiquetas en GTM | < 15 min | si |
| Slice 5 | Interruptor en `off` | < 5 min | si |
| Slice 6 | Interruptor en `off` + purga | < 5 min | si |

### Production verification sequence

1. `pnpm public-website:ssh-check`; export del código vivo; paquete con guarda `previousSha256`.
2. Deploy con el interruptor en `off`; verificar que el sitio sigue idéntico.
3. `pilot` en la página elegida; capturas en los viewports del plan; agendador desde los tres puntos; eventos en
   DebugView; `curl` sin JS con los enlaces.
4. Probar `off` y volver a `pilot`.
5. Revisión del operador y go.
6. `on`; capturas de los tipos de página; CWV; monitoreo de logs una semana.

### Out-of-band coordination required

- Operador: elegir la página piloto y dar el go a `on`.
- Growth: publicar la superficie del encabezado global (la clave queda en su almacenamiento seguro).
- GTM y GA4: alta de los eventos con la skill de medición.
- Kinsta: purga tras cada cambio de interruptor.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La evidencia visual de cierre se captura sin el aviso de depuración del Lab ni otros superpuestos: en 1280×720 tapaba «Ver todas las soluciones» y no dejaba ver su subrayado (pedido de la sesión del menú, contralora de fidelidad, 2026-10-22).

- [x] Con `eo_site_nav_enabled=off` el sitio sirve el encabezado de Ohio sin assets de AXIS. Evidencia (Playground local con Ohio 3.7.0 real, el plugin `eo-site-nav` y `ohio-child`, 2026-10-22): sin
  `data-axis-site-nav` ni `site-nav.css`, con `#site-navigation` de Ohio. Falta repetirlo en producción en el Slice 5.
- [x] Con `pilot`, sólo las páginas de la lista muestran el menú nuevo. Evidencia (Playground local con Ohio 3.7.0 real, el plugin `eo-site-nav` y `ohio-child`, 2026-10-22): la página de la lista
  pinta el menú y la otra conserva Ohio.
- [ ] Con `on`, todo el sitio muestra el menú nuevo, y volver a `off` restaura Ohio (verificado al menos una vez en
  producción).
- [x] Un documento inválido o ausente deja el encabezado de Ohio y registra el error. Evidencia (Playground local con Ohio 3.7.0 real, el plugin `eo-site-nav` y `ohio-child`, 2026-10-22): documento
  guardado con `javascript:` saltándose el servicio de guardado → Ohio y `[eo-site-nav] render failed, keeping Ohio:
  INVALID_FORMAT /header/cta/fallbackHref`; plugin sin cargar → Ohio y su línea de log.
- [ ] Cada variante de encabezado de Ohio quedó mapeada a un estado del primitive o documentada como excepción. Sin
  tildar: el mapeo está en el código (Slice 1), pero Glitch, 404 y archivos caen en la regla del espaciador sin captura
  todavía; se verifican en el piloto.
- [x] Los enlaces del menú están en el HTML de servidor (`curl` sin JS). Evidencia (Playground local con Ohio 3.7.0 real, el plugin `eo-site-nav` y `ohio-child`, 2026-10-22): 104 enlaces dentro de la
  cabecera servida por `curl`.
- [ ] «Agenda tu diagnóstico» abre el agendador desde la cabecera, el mega y el onepage, cierra el panel antes y
  devuelve el foco al cerrar.
- [ ] Los eventos del menú (`gh_site_nav_*`) llegan a GA4 sin PII. Sin tildar: falta el alta en GTM y GA4.
- [ ] Sin scroll horizontal en los viewports del plan y Core Web Vitals sin regresión frente a la medición previa.
- [ ] Se capturó y se miró la evidencia desktop y 390 px del piloto y de los tipos de página, y el scorecard cumple el
  umbral.
- [ ] La doctrina de la skill del sitio, la documentación funcional y el manual reflejan el nuevo modelo.
- [ ] `UI ready` se mantuvo en `no` hasta completar el inventario, el mapping, el plan de captura y el decision log.

## Verification

- Pruebas del adaptador en el repo del runtime.
- Secuencia de §Production verification sequence con evidencia (HTML servido, capturas, DebugView y CWV).
- `pnpm task:lint --task TASK-2042` en `greenhouse-eo`.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [x] PDR-027 pasa a `Accepted` con alcance y piloto decididos (operador, 2026-10-18)
- [ ] EPIC-055 actualizada; si las tres tasks cerraron, la épica pasa a `complete`

## Follow-ups

- Adaptador de Think (EPIC-055).
- Lo que surja dentro de la frontera de la puesta en el sitio entra como slice o criterio de esta task (regla de
  EPIC-055).

## Open Questions

- Página piloto (la elige el operador en el Slice 5).
- Si la superficie del agendador del encabezado reutiliza el CTA `inbound-discovery-meeting` o publica uno propio; la
  arquitectura recomienda uno propio para medir por separado.
