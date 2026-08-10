/**
 * TASK-982 — Navigation reachability: declared child routes.
 *
 * A "child route" is a real `(dashboard)` page that is intentionally NOT a
 * top-level item in `VerticalMenu.tsx` because it's reached from a PARENT
 * surface (a header CTA, a row action, an inline link, a wizard step). Declaring
 * it here is what keeps it from being flagged as an ORPHAN by the reachability
 * gate (`scripts/ci/route-reachability-gate.mjs`).
 *
 * The gate parses this file's `route: '...'` literals. **Keep that exact
 * format** (single-quoted string literal after `route:`) so the gate's parser
 * stays simple and dependency-free. This module is also the typed SSOT for any
 * future runtime consumer (e.g. a command palette that surfaces child routes).
 *
 * RULE (CLAUDE.md "Navigation Reachability Governance"): every real
 * `src/app/(dashboard)/**​/page.tsx` route MUST be reachable by ONE of:
 *   (a) a `href` in `VerticalMenu.tsx`, or
 *   (b) a declared child route here (with parent + via), or
 *   (c) a dynamic detail route (contains a `[segment]`, reached by row click), or
 *   (d) a module-composed nav route declared in `MODULE_COMPOSED_NAV_ROUTES`
 *       below — a real menu item whose `href` is composed at runtime from
 *       `module_assignments`, so no literal exists for the gate to find.
 * Mockup routes (`**​/mockup/**`) are excluded.
 */

export type ChildRouteVia =
  | 'header-cta'
  | 'row-action'
  | 'inline-link'
  | 'wizard-step'
  | 'tab'
  | 'redirect-alias' // legacy URL that only redirects to the canonical surface (kept for old bookmarks)
  | 'avatar-dropdown' // TASK-1388 — reached from the global topbar avatar dropdown (UserDropdown), present on every page

export interface ChildRouteDeclaration {
  /** The child route that is intentionally NOT a top-level menu item. */
  route: string
  /** The menu-anchored parent surface it's reached from. */
  parent: string
  /** How the user reaches it from the parent. */
  via: ChildRouteVia
  /** Why it's a sub-action and not its own menu item. */
  reason: string
}

/**
 * TASK-1388 — motivo compartido del rehome de lo personal (sidebar → avatar).
 * Las hojas `/my/*` siguen teniendo `href` literal en la rama no-interna de
 * VerticalMenu (el colaborador puro conserva "Mi Ficha" en su rail), pero la
 * superficie del portal INTERNO es el dropdown del avatar (UserDropdown,
 * builder canónico `buildMyNavItems`, gating idéntico).
 */
const AVATAR_REHOME_REASON =
  'TASK-1388 — hoja personal rehomed: para usuarios internos se alcanza desde el dropdown del avatar (topbar global, presente en toda página); para colaboradores puros sigue en el rail (rama no-interna de VerticalMenu).'

export const DECLARED_CHILD_ROUTES: readonly ChildRouteDeclaration[] = [
  {
    // TASK-1307 — pantalla ancla del módulo SEO. Las 4 rutas de "Search Visibility"
    // comparten el viewCode `administracion.growth_seo` y UN solo ítem de menú
    // (`/admin/growth/seo`); las hermanas son child routes navegadas desde su conmutador
    // de tabs. Sumarla al menú duplicaría la sección para el mismo permiso.
    route: '/admin/growth/seo/performance',
    parent: '/admin/growth/seo',
    via: 'tab',
    reason:
      'Tab "Rendimiento" de Search Visibility (TASK-1307, EPIC-022): child del viewCode compartido administracion.growth_seo, alcanzable desde el conmutador de tabs del cockpit SEO. No siembra viewCode ni ítem de nav propios.'
  },
  {
    route: '/admin/growth/seo/keywords',
    parent: '/admin/growth/seo',
    via: 'tab',
    reason:
      'Tab "Keywords" de Search Visibility (TASK-1308, EPIC-022): child del mismo viewCode administracion.growth_seo, alcanzable desde el conmutador de tabs del cockpit SEO. No siembra viewCode ni ítem de nav propios.'
  },
  {
    route: '/admin/growth/seo/audit',
    parent: '/admin/growth/seo',
    via: 'tab',
    reason:
      'Tab "Auditoría" de Search Visibility (TASK-1309, EPIC-022): child del mismo viewCode administracion.growth_seo, alcanzable desde el conmutador de tabs del cockpit SEO. El drill del grupo de issues vive en la MISMA ruta vía ?issueGroup=, así que no suma una ruta hija propia. No siembra viewCode ni ítem de nav propios.'
  },
  {
    route: '/agency/hiring/pipeline',
    parent: '/agency/hiring',
    via: 'tab',
    reason:
      'Pipeline de Hiring Desk (TASK-355), alcanzable desde la navegación local persistente del workspace.'
  },
  {
    route: '/agency/hiring/publication',
    parent: '/agency/hiring',
    via: 'tab',
    reason:
      'Gobierno de publicación de Hiring Desk (TASK-355), alcanzable desde la navegación local persistente del workspace.'
  },
  {
    route: '/hr/contractors/new',
    parent: '/hr/contractors',
    via: 'header-cta',
    reason:
      'Onboarding wizard (TASK-976) — reached via the "Nuevo contractor" primary CTA in the contractors workbench header (TASK-982 Slice 1). Create-action, not a standalone nav item.'
  },
  {
    // TASK-992 Slice 2b / TASK-1013 — single front door wizard to onboard a client.
    // Gated by CLIENT_LIFECYCLE_ONBOARDING_ENABLED (OFF by default → route 404s).
    // The discoverable entry is the onboarding cockpit (/agency/clients/onboarding,
    // the flag-gated "Alta de cliente" nav item); the wizard is reached from the
    // cockpit's primary "Nuevo cliente" CTA. Create-action, not a standalone menu item.
    route: '/agency/clients/new',
    parent: '/agency/clients/onboarding',
    via: 'header-cta',
    reason:
      'Client onboarding wizard (TASK-992 Slice 2b) — single canonical front door, flag-gated (CLIENT_LIFECYCLE_ONBOARDING_ENABLED). Reached from the onboarding cockpit (TASK-1013) via its primary "Nuevo cliente" CTA.'
  },
  {
    // TASK-983 triage: legacy redirect-only page → /agency?tab=capacidad.
    route: '/agency/capacity',
    parent: '/agency',
    via: 'redirect-alias',
    reason:
      'Legacy URL kept for old bookmarks; the page only `redirect("/agency?tab=capacidad")`. Canonical surface is the Agency capacity tab.'
  },
  {
    // TASK-983 triage: legacy redirect-only page → /admin (LEGACY_INTERNAL_DASHBOARD_PATH).
    route: '/internal/dashboard',
    parent: '/admin',
    via: 'redirect-alias',
    reason:
      'Legacy LEGACY_INTERNAL_DASHBOARD_PATH (resolve-portal-home-path); the page only `redirect("/admin")`. Canonical surface is the Admin Center.'
  },
  {
    route: '/admin/operations',
    parent: '/admin/ops-health',
    via: 'redirect-alias',
    reason:
      'Legacy reliability URL kept for older links, docs and bookmarks; the page only `redirect("/admin/ops-health")`. Canonical incident-facing surface is Ops Health.'
  },
  {
    // TASK-983 triage: quote share dashboard — genuine sub-surface of the quotes flow.
    route: '/finance/quotes/share-dashboard',
    parent: '/finance/quotes',
    via: 'inline-link',
    reason:
      'Dashboard de cotizaciones compartidas (TASK-631) — sub-surface del flujo de quotes, alcanzable desde la cola de cotizaciones.'
  },
  {
    // TASK-983 triage: create sub-action. FOLLOW-UP: wire a "Nuevo sample sprint" CTA in
    // SampleSprintsWorkspace (mirror contractor onboarding). Reachable by direct URL meanwhile.
    route: '/agency/sample-sprints/new',
    parent: '/agency/sample-sprints',
    via: 'header-cta',
    reason:
      'Create sample sprint — sub-acción del workspace de Sample Sprints. CTA en el header pendiente (TASK-983 follow-up); alcanzable por URL directa mientras tanto.'
  },
  {
    // TASK-983 triage: alive finance ops surface (TASK-708) without a menu item.
    // FOLLOW-UP: add a proper Finanzas menu item + viewCode (needs migration, TASK-827).
    route: '/finance/external-signals',
    parent: '/finance',
    via: 'inline-link',
    reason:
      'External cash signals ops (TASK-708). Item de menú Finanzas + viewCode pendiente (requiere migración, TASK-983 follow-up); alcanzable por URL directa mientras tanto.'
  },
  {
    // TASK-983 triage: personal notification settings without a link.
    // FOLLOW-UP: add a link in UserDropdown / settings. Reachable by direct URL meanwhile.
    route: '/notifications/preferences',
    parent: '/home',
    via: 'inline-link',
    reason:
      'Preferencias personales de notificaciones. Link en UserDropdown pendiente (TASK-983 follow-up); alcanzable por URL directa mientras tanto.'
  },
  {
    // TASK-1400 post-push CI triage: employee self-service onboarding surface exists
    // behind `my.onboarding`, but is not a top-level My menu item yet.
    route: '/my/onboarding',
    parent: '/my',
    via: 'inline-link',
    reason:
      'Mi Onboarding — self-service checklist for the authenticated member, gated by viewCode `mi_ficha.onboarding`. Kept as a child route of Mi Greenhouse until TASK-1388 rebalances personal navigation.'
  },
  {
    route: '/design-system/colors',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Color AXIS Lab — child surface del Design System para ramps, opacidades, contraste y neutrales; alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/design-system/axis-adapters',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'AXIS adapters Lab (TASK-1591) — fixture opt-in de consumidores Greenhouse/MUI para contratos, tokens y registry AXIS; alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/design-system/disclosure',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Disclosure Lab (TASK-1072) — child surface del Design System para GreenhouseDisclosureTrigger (+ rotatorio) y GreenhouseAnchoredDisclosure; alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/design-system/nexa-insights',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Nexa Insights Lab (TASK-1075 follow-up) — child surface del Design System para el patron compuesto NexaInsightsBlock (disclosure morph, rotating headline + thinking beat, segmented control, insight rows); alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/design-system/nexa-chat',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Nexa Chat Pattern (TASK-1078) — child surface del Design System para el patron compuesto de la superficie conversacional de Nexa (header de presencia, rail glass, cuerpo de conversacion, empty hero, composer con NexaGlowBorder); alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/design-system/composition-shell',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Composition Shell Lab (TASK-1114) — child surface del Design System para el substrato de coreografia de layout (regiones singleton + composiciones nombradas + morph View Transitions + reflow); alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/design-system/surface-recipes',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Surface Recipes Lab (TASK-1453) — workbench, analytics/report y settings/flow completos sobre Composition Shell + primitives compuestas; alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/design-system/card-density',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Adaptive Card density Lab (TASK-1115) — child surface del Design System para el contrato de densidad de cards (full/condensed/peek por container query); capacidad hermana del Composition Shell; alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/design-system/growth-forms-renderer',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Growth Forms portable renderer preview (TASK-1231) — child surface del Design System que monta el mismo core Web Component que WordPress/Astro renderizan en produccion, desde fixtures del render_contract; alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/design-system/native-meeting-scheduler',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Native Meeting Scheduler preview (TASK-1510) — galeria interna del mismo renderer portable que usaran WordPress/Astro, con fixtures deterministas de confirmacion y recovery; alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/design-system/handoff',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Design Handoff Registry (TASK-1120) — child surface del Design System para gobernar handoff Figma producto -> DEV sin mezclar nodos de producto en el master AXIS; alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/design-system/loaders',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Loading Lab (TASK-1037) — child surface del Design System, alcanzable desde la referencia interna de tokens AXIS sin mezclar loaders en la pagina canonica de color.'
  },
  {
    route: '/design-system/microinteractions',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Microinteractions Lab — child surface del Design System para primitives de feedback de comandos async, alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/design-system/typography',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Referencia canonica de tipografia (TASK-1044) — child surface del Design System, alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/design-system/chips',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Chips Lab — child surface del Design System para la primitive GreenhouseChip, alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/design-system/gamification',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Gamification Lab — child surface del Design System para GreenhouseLeaderboardPodium, ranking top 3 y avatars reales de equipo antes de cablearlo a datos productivos.'
  },
  {
    route: '/design-system/buttons',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Buttons Lab — child surface del Design System para la primitive GreenhouseButton basada en AXIS Figma, alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/design-system/breadcrumbs',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Breadcrumbs Lab — child surface del Design System para la primitive GreenhouseBreadcrumbs basada en AXIS Figma, alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/design-system/roadmap-timeline',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Roadmap Timeline Lab — child surface del Design System para la primitive GreenhouseRoadmapTimeline (roadmaps, release plans y horizontes de producto), alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/design-system/charts',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Charts Lab — child surface del Design System para primitives de visualizacion de datos, alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/design-system/nexa-brand',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Nexa Brand Mark Lab — child surface del Design System para la primitive GreenhouseNexaBrandMark y sus kinds de marca, alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/design-system/brand-logos',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Brand Logo Variations Lab — child surface del Design System para la primitive GreenhouseBrandLogoMark y sus kinds portados desde AXIS Figma, alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/design-system/efeonce-brand',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Efeonce Orbital Signature Lab — child surface del Design System para iterar motion del wordmark institucional de Efeonce sin tocar el asset principal, alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/design-system/talent-profile',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Talent Profile Lab — child surface del Design System para dossier/verificacion de talento, alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/design-system/utilities',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Utilities Lab — child surface del Design System para primitives utilitarias como Activity Timeline, alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/design-system/floating-surfaces',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Floating Surfaces Lab (TASK-1033) — child surface del Design System para la primitive GreenhouseFloatingSurface y sus 6 variants, alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/design-system/motion',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Motion Lab (TASK-1045) — child surface del Design System para la primitiva de motion sobre GSAP (<Motion> + useGreenhouseGSAP) y sus 4 variants, alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/design-system/elevation',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Elevation & Shadows Lab (TASK-1049) — child surface del Design System para los roles semánticos de elevación (theme.greenhouseElevation), alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/design-system/gradients',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Gradient Background Lab — child surface del Design System para la primitive GreenhouseGradientBackground y sus presets tokenizados, alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/design-system/border-beam',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Border Beam Lab — child surface del Design System para la primitive GreenhouseBorderBeam y sus variants/kinds de motion perimetral, alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/design-system/nexa-provenance',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Nexa Provenance Trace Lab (TASK-1103) — child surface del Design System para la primitive NexaProvenanceTrace (grounding canonico de Nexa: variants inline/expandable/panel + kinds knowledgeGrounded/signalPromoted/computed), alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/design-system/nexa-response-toolbar',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Nexa Response Toolbar Lab (TASK-1104) — child surface del Design System para la primitive NexaResponseToolbar (chrome de confianza canonico de una respuesta de Nexa: variants embedded/floating/docked + kinds responseSettle/chatMessage/surfaceBar), alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/design-system/nexa-streaming-text',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Nexa Streaming Text Lab (TASK-1105) — child surface del Design System para la primitive NexaStreamingText (revelado progresivo canonico de la respuesta de Nexa: modes value/stream + caret tokenizado + never-hidden/reduced-motion), alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/design-system/nexa-moment-composition',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Nexa Moment Composition Lab (TASK-1102 GAP A) — child surface del Design System para la primitive NexaMomentComposition (composicion in-place de Nexa Answers con un host: variants leadOverlay/anchoredAside/inlineExpand + morph View Transitions + anclaje cita->host + next-step gobernado + puente a la lente), alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/design-system/nexa-answers-experience',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Nexa Answers Experience (TASK-1110 Slice B) — child surface del Design System que agrega el flujo conversacional completo de Nexa Answers: la respuesta lidera y SE ARMA (chart draw + numero que cuenta), portabilidad cross-dominio (finance/insight) y la composicion in-place con host (NexaMomentComposition, GAP A: morph dormant<->composed + fuentes ancladas + next-step gobernado + puente). Promovida desde el mockup /knowledge/mockup/nexa-answers; alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/design-system/geometry',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Geometry Lab (TASK-1050) — child surface del Design System para spacing/radius AXIS y la extension Greenhouse xxl/display, alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/design-system/team-avatar-group',
    parent: '/design-system',
    via: 'inline-link',
    reason:
      'Team Avatar Group Lab (TASK-1248) — child surface del Design System para la primitive TeamAvatarGroup (kinds members + brands/isotipos), alcanzable desde el catalogo canonico /design-system.'
  },
  {
    route: '/aeo',
    parent: '/home',
    via: 'inline-link',
    reason:
      'AI Visibility client report (TASK-1248) — surface client-scoped (routeGroup client, viewCode cliente.ai_visibility_report). Deep-link primero (OQ resuelta): se alcanza desde Account 360 / el handoff del Report Packet Delivery (TASK-1250), no como item de nav principal hasta que exista el monitor recurrente. Gateada server-side por client tenant + capability growth.ai_visibility.report.read_client.'
  },
  {
    route: '/growth/seo/report',
    parent: '/growth/seo',
    via: 'header-cta',
    reason:
      'SEO report artifact (TASK-1310) — child del dashboard, alcanzable mediante "Ver informe"; no duplica el ítem de navegación y requiere growth.seo.report.read_client.'
  },

  // ── TASK-1388 — rehome de lo personal: sidebar → dropdown del avatar ──
  //
  // Para el portal interno, las hojas `/my/*` ya NO son ítems del rail: viven
  // en el dropdown del avatar (UserDropdown, builder canónico
  // `buildMyNavItems`). Siguen teniendo `href` literal en la rama no-interna
  // de VerticalMenu (el colaborador puro conserva su sección "Mi Ficha"), así
  // que el gate no las marcaría huérfanas — estas declaraciones documentan la
  // superficie interna vigente, que es el contrato que el gate protege.
  { route: '/my/assignments', parent: '/home', via: 'avatar-dropdown', reason: AVATAR_REHOME_REASON },
  { route: '/my/performance', parent: '/home', via: 'avatar-dropdown', reason: AVATAR_REHOME_REASON },
  { route: '/my/delivery', parent: '/home', via: 'avatar-dropdown', reason: AVATAR_REHOME_REASON },
  { route: '/my/profile', parent: '/home', via: 'avatar-dropdown', reason: AVATAR_REHOME_REASON },
  { route: '/my/payroll', parent: '/home', via: 'avatar-dropdown', reason: AVATAR_REHOME_REASON },
  { route: '/my/contractor', parent: '/home', via: 'avatar-dropdown', reason: AVATAR_REHOME_REASON },
  { route: '/my/offers', parent: '/home', via: 'avatar-dropdown', reason: AVATAR_REHOME_REASON },
  { route: '/my/contracts', parent: '/home', via: 'avatar-dropdown', reason: AVATAR_REHOME_REASON },
  { route: '/my/payment-profile', parent: '/home', via: 'avatar-dropdown', reason: AVATAR_REHOME_REASON },
  { route: '/my/leave', parent: '/home', via: 'avatar-dropdown', reason: AVATAR_REHOME_REASON },
  { route: '/my/goals', parent: '/home', via: 'avatar-dropdown', reason: AVATAR_REHOME_REASON },
  { route: '/my/evaluations', parent: '/home', via: 'avatar-dropdown', reason: AVATAR_REHOME_REASON },
  { route: '/my/organization', parent: '/home', via: 'avatar-dropdown', reason: AVATAR_REHOME_REASON }
]

export const DECLARED_CHILD_ROUTE_PATHS: readonly string[] = DECLARED_CHILD_ROUTES.map(d => d.route)

/**
 * TASK-1675 — rutas que SÍ son ítems de menú, pero cuyo `href` no existe como
 * literal en el código.
 *
 * Son las superficies de un módulo per-organización: el ítem se compone en
 * runtime desde `module_assignments` y su ruta sale del `routePath` del
 * `VIEW_REGISTRY`, así que el gate —que busca literales de navegación— no puede
 * verlas por más que estén perfectamente alcanzables.
 *
 * No son rutas hijas y por eso no viven en `DECLARED_CHILD_ROUTES`: declararlas
 * ahí obligaría a inventarles un padre y un `via` que no existen. Es exactamente
 * lo que pasaba con `/growth/seo`, que declaraba `parent: '/home', via:
 * 'inline-link'` para un enlace que nunca existió; el gate lo aceptaba porque
 * verifica que la ruta esté *declarada*, no que el enlace declarado *exista*.
 *
 * El gate cuenta estas entradas porque parsea los literales `route: '...'` de
 * este archivo completo.
 */
export interface ModuleComposedNavRoute {
  /** Ruta cuyo ítem de menú se compone en runtime. */
  route: string

  /** ViewCode del `VIEW_REGISTRY` que aporta label y `routePath`. */
  viewCode: string

  /** `module_key` del módulo que declara el viewCode. */
  moduleKey: string

  /** Por qué el ítem no puede existir como literal. */
  reason: string
}

export const MODULE_COMPOSED_NAV_ROUTES: readonly ModuleComposedNavRoute[] = [
  {
    route: '/growth/seo',
    viewCode: 'cliente.growth_seo_dashboard',
    moduleKey: 'seo_v2',
    reason:
      'Dashboard SEO del portal cliente (TASK-1310). El ítem lo compone `composeNavItemsFromModules` desde los `module_assignments` de la organización y lo mergea `VerticalMenu` (TASK-1675): sólo lo ve quien tiene el módulo contratado, así que no puede existir un `href` literal en el menú. El acceso lo gatea la page server-side contra el mismo `module_assignments`.'
  }
]

export const MODULE_COMPOSED_NAV_ROUTE_PATHS: readonly string[] = MODULE_COMPOSED_NAV_ROUTES.map(m => m.route)
