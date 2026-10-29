# Public Site — Producto (efeoncepro.com + think.efeoncepro.com)

> **Naming AEO vigente (2026-09-29):** **Efeonce AEO** es la capacidad de entrada; **Efeonce AEO Assessment** nombra el diagnóstico público y **Efeonce AI Visibility Report** su salida. `AI Visibility Grader`/`Brand Visibility` siguen siendo aliases técnicos e históricos y `/brand-visibility` conserva su ruta hasta un cambio de runtime independiente. [ADR](../architecture/EFEONCE_AEO_BRAND_NAMING_DECISION_V1.md).

> **Qué es esto.** El hogar-producto del sitio público de Efeonce: dónde viven
> las **decisiones de producto/posicionamiento** y el **roadmap de ejecución**
> del sitio público como superficie comercial. Es el índice descubrible por
> agentes: si conversamos sobre landings, posicionamiento GTM del sitio, orden
> de ejecución o qué se decidió y por qué, **se empieza por acá**.
>
> Sello: creado 2026-07-05. Idioma es-CL neutro (tuteo, sin voseo).

## Para qué sirve (y para qué NO)

Este espacio captura el **plano de producto** del sitio público: qué landings/
superficies existen o vienen, cómo se posicionan entre sí, en qué orden se
ejecutan y por qué. Es la capa narrativa que ata los EPICs, los ADR de
arquitectura y las skills en una sola historia de producto.

| Sí vive acá | NO vive acá → va a |
| --- | --- |
| Decisiones de producto/posicionamiento/GTM del sitio (PDR) | Decisiones de **arquitectura** (contratos técnicos) → `architecture/DECISIONS_INDEX.md` (ADR) |
| Roadmap/secuencia de ejecución del sitio (now/next/later) | Programas de trabajo ejecutables → `docs/epics/` (EPIC-###) |
| El "por qué" comercial de cada superficie | Unidades ejecutables → `docs/tasks/` (TASK-###) |
| Mapa de landings y su relación entre sí | Operación real del sitio (WP/Kinsta/Astro/deploy) → skill `efeonce-public-site-wordpress` |

**Regla de no-duplicación:** cuando un PDR obliga arquitectura, **cita** el ADR
de `DECISIONS_INDEX.md`; no copia su contenido. Cuando un PDR se baja a trabajo,
**cita** el EPIC/TASK; no lo reemplaza.

## Índice

- **[Google Cloud — anuncio publicado](../audits/public-site/2026-10-25-google-cloud-partner-private-post.md)** — entrada `252108`, imágenes sin texto, autor Julio, metadatos y sitemap verificados; QA público a 1440/390 y veinte controles en verde. Hero reservado, sin activación en el banner.

- **[Footer completo: Explora, newsletter, empleo y partners](../audits/public-site/2026-10-14-footer-composition-v2.md)** — cuatro columnas, nueve partners de las firmas en gris, QA responsive, accesibilidad y rollback.

- **Reproductor AXIS — adapter preparado, sin activación:** bloque `eo-axis-video` en
  `efeonce-public-site-runtime/wp-content/plugins/eo-axis-video/`. La prueba del snapshot del artículo
  `251941` no modificó el artículo público. [Estado y límites](../operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md#reproductor-publicado--estado-verificado-2026-10-07)
  y [manual de integración](../manual-de-uso/creative/descubrir-y-componer-con-axis.md#integrar-el-reproductor-publicado).

- **[Contacto — brief aprobado y datos institucionales](CONTACT_PAGE_REBUILD_BRIEF_V1.md)** — reconstrucción
  con motivos condicionales, reuniones, dirección y teléfonos verificados en las contraportadas; Estados Unidos
  incluido como mercado operativo. `TASK-1801` cerrada el 2026-09-15 por aprobación explícita de la landing pública;
  el hardening operativo de routing/destinos y booking no se declara resuelto por ese cierre.
  - [Contrato técnico](../architecture/public-site/CONTACTO_LANDING_RUNTIME_V1.md) ·
    [documentación funcional](../documentation/public-site/contacto.md) ·
    [manual de operación](../manual-de-uso/public-site/contacto.md)

- **[Content Marketing vigente — Elementor](../architecture/public-site/CONTENT_MARKETING_ELEMENTOR_MODULES_V1.md)** —
  página `242603`, `/servicio-marketing-de-contenidos/`, trece módulos del diseño aprobado y captura
  Growth Forms. [Funcionamiento](../documentation/public-site/content-marketing.md),
  [edición y verificación](../manual-de-uso/public-site/content-marketing.md) y
  [evidencia del corte de publicación](../audits/public-site/2026-08-31-content-marketing-publication.md).

- **[Agencia Creativa vigente — Elementor](../architecture/public-site/AGENCIA_CREATIVA_ELEMENTOR_MODULES_V1.md)** —
  página `249582` en `/agencia-creativa/`, quince widgets compilados desde el canvas aprobado y el diagnóstico
  creativo de Growth Forms; publicada el 2026-10-15. [Funcionamiento](../documentation/public-site/agencia-creativa.md),
  [operación](../manual-de-uso/public-site/operar-agencia-creativa.md) y [evidencia del rollout](../audits/public-site/2026-10-15-agencia-creativa-elementor-rollout.md).
  Contenido de clientes, cifra Sky, Yoast y primer envío real siguen pendientes. Al 2026-10-22 también responde
  `/agencia-creativa-v2/` (candidata del 2026-07-07): decidir cuál queda es pendiente del [roadmap](PRODUCT_ROADMAP.md).

- **[Agencia de Medios vigente — Elementor](decisions/PDR-025-landing-agencia-de-medios-posicionamiento.md)** —
  página `251981` en `/servicios/agencia-de-medios/`, dieciséis widgets compilados desde el canvas aprobado y el
  diagnóstico de medios de Growth Forms; publicada e indexable el 2026-10-16, en el menú bajo Soluciones →
  Crecimiento Multicanal. [SEO/AEO aplicado](AGENCIA_DE_MEDIOS_LANDING_SEO_AEO_BRIEF_V1.md); operación en la skill
  `efeonce-public-site-wordpress` (`references/landings/agencia-de-medios.md`). Primer envío real, suscripción de
  novedades, Rich Results y Search Console siguen pendientes.

- **[Performance Marketing vigente — Elementor](decisions/PDR-022-landing-performance-marketing-posicionamiento.md)** —
  página `251997` en `/servicios/performance-marketing/`, hija de `/servicios/`; diez widgets nativos
  `greenhouse_performance_*` compilados desde el canvas aprobado y el formulario propio `efeonce-performance-diagnostic`
  (destino HubSpot directo «Lead Gen - Performance Marketing»). Publicada e indexable el 2026-10-17; la legacy
  `/servicio-gestion-campanas-publicitarias/` quedó `private` con 301 a la nueva y el ítem «Performance Marketing &
  Paid Ads» del menú apunta a la página nueva. [SEO/AEO aplicado](PERFORMANCE_LANDING_SEO_AEO_BRIEF_V1.md); ejecución en
  `TASK-1865` (in-progress); operación en la skill `efeonce-public-site-wordpress`
  (`references/landings/performance-marketing.md`). Primer envío real, GA4 `generate_lead`, Rich Results y Search
  Console siguen pendientes.

- **[Inbound Marketing vigente — Elementor](../documentation/public-site/inbound-marketing.md)** — página `242601` en
  `/agencia-inbound-marketing/`, cuerpo reemplazado en el mismo lugar el 2026-10-18 (URL, padre e ítem de menú `243616`
  sin cambios); once widgets nativos `greenhouse_inbound_*` compilados desde el canvas aprobado «La órbita» sobre el
  núcleo común, el formulario propio `efeonce-inbound-diagnostic` (destino HubSpot directo «Lead Gen - Inbound
  Marketing») y el CTA de reunión `inbound-discovery-meeting` en tres placements (hero, cierre y barra móvil). Publicada
  e indexable. Su diseño es de esta landing, no una plantilla ([PDR-026](decisions/PDR-026-cada-landing-deriva-su-patron-de-diseno.md)).
  [Funcionamiento](../documentation/public-site/inbound-marketing.md), [operación](../manual-de-uso/public-site/operar-inbound-marketing.md)
  y skill `efeonce-public-site-wordpress` (`references/landings/inbound-marketing.md`). Primer envío real, GA4
  `generate_lead`, primera reserva, Rich Results y prueba de edición en Elementor siguen pendientes.

- **[Agenda vigente — Elementor](../documentation/public-site/agenda.md)** — página `251583` en `/agenda/`, cuerpo
  reemplazado en el mismo lugar el 2026-10-20 con «La órbita» (canvas «Landing Agendar — Efeonce»): cuatro widgets
  `greenhouse_agenda_*` compilados sobre el núcleo común y el agendador nativo real del piloto `TASK-1510` en un widget
  HTML propio, sin cambios de comportamiento. Indexable desde el 2026-10-20 y fuera de los menús por decisión del
  operador; el botón «Agenda tu diagnóstico» del menú global abre el agendador nativo y usa `/agenda/` como respaldo. [Funcionamiento](../documentation/public-site/agenda.md),
  [operación](../manual-de-uso/public-site/operar-agenda.md) y skill `efeonce-public-site-wordpress`
  (`references/landings/agenda.md`). Sin reserva controlada (decisión del operador); composición AXIS del agendador
  pendiente (`TASK-2007`).

- **[Navegación global vigente — menú de todo el sitio](../architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md)** —
  menú AXIS `efeonce.site-nav` en todas las páginas de `efeoncepro.com` desde el 2026-10-23 00:09 UTC, sin piloto
  (`/blog/` se sumó el 2026-10-24 con el corte de su portada). El contenido vive en un solo documento del plugin «EO Navegación» (revisión
  4) y se edita con `pnpm public-website:site-nav`; «Agenda tu diagnóstico» abre el agendador nativo desde la
  cabecera, el mega y el onepage. Vuelta atrás: interruptor `eo_site_nav_enabled` a `off`.
  [Funcionamiento](../documentation/public-site/navegacion-global-del-sitio.md),
  [operación](../manual-de-uso/public-site/operar-navegacion-global.md) y
  [PDR-027](decisions/PDR-027-navegacion-global-del-sitio-portable.md); ejecución en `EPIC-055`. El dock inferior de las
  siete landings es aparte: [funcionamiento](../documentation/public-site/dock-de-landings.md) y
  [operación](../manual-de-uso/public-site/operar-dock-de-landings.md). El menú y el dock se miden en GTM (versión
  10) y GA4 desde el 2026-10-23; faltan Core Web Vitals y probar la vuelta a `off` en producción.

- **[Portada del blog vigente — `/blog/`](../architecture/public-site/BLOG_HOME_RUNTIME_V1.md)** — página `18456`
  en la portada v3 desde el 2026-10-24 08:13 UTC: plugin `eo-blog-home` (canvas aprobado como plantilla, tres tableros)
  con el modelo de contenido de [PDR-029](decisions/PDR-029-modelo-de-contenido-portada-blog.md), menú canónico del
  sitio, foto del autor y suscripción real a Glitch (Growth Form `efeonce-blog-subscription`, `inline_pill`). Se opera
  con `pnpm public-website:blog-home`. Rollback: snapshot `_gh_blog_home_v3_before_20261024_081327`. Pendientes: un
  envío real de suscripción confirmado en HubSpot, visto bueno de la píldora del pie, primer evento real y medir la
  purga en Kinsta. [Funcionamiento](../documentation/public-site/portada-del-blog.md),
  [operación por CLI](../manual-de-uso/public-site/operar-portada-blog-por-cli.md) y
  [contenido](../manual-de-uso/public-site/operar-contenido-portada-blog.md); ejecución `TASK-2050`/`TASK-2051`.

- **[HubSpot vigente — Elementor](../architecture/public-site/HUBSPOT_ELEMENTOR_MODULES_V1.md)** — página
  `244079` en `/servicios-contratar-hubspot/`, once widgets nativos y Growth Forms. Diseño aprobado con
  identidad visual y copy revisado en siete módulos; [última evidencia pública del 2026-08-31](../audits/public-site/2026-08-31-hubspot-industry-method-copy.md).
  La migración pillar/cluster de PDR-013 no se ejecutó como parte de esta publicación.
- **[Home vigente — Elementor](../architecture/public-site/AGENCY_ELEMENTOR_MODULES_V1.md)** — portada
  `251731`, promovida desde Claude Design; contrato técnico de módulos, edición y evidencia. La antigua
  Home `2791` es respaldo noindex. [Cierre editorial y QA residual](../audits/public-site/2026-08-31-home-editorial-closure.md):
  ocho revisiones aplicadas; no equivale a aprobación global de claims ni cierre del editor.
- **[Indexabilidad del menú — 2026-08-31](../audits/public-site/2026-08-31-menu-indexability.md)** — 18 páginas verificadas; Redes Sociales habilitada tras autorización expresa, sin cambios de contenido o menú.
- **[Páginas misceláneas — arquitectura propuesta](../architecture/public-site/PUBLIC_MISCELLANEOUS_SURFACES_V1.md)** —
  404, búsqueda/no-results y archivos siguen bajo Ohio padre; se propone un sistema child-theme-first con
  recovery compartido y políticas HTTP/SEO por query type. [Discovery live](../audits/public-site/2026-08-31-wordpress-miscellaneous-surfaces-discovery.md),
  [funcionamiento](../documentation/public-site/public-miscellaneous-surfaces.md) y
  [manual](../manual-de-uso/public-site/operar-paginas-miscelaneas.md). No implementado ni publicado.
- **[PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md)** — roadmap del sitio público
  (now / next / later) con enlaces a los EPICs y PDRs que lo sostienen.
- **[decisions/](decisions/)** — Product Decision Records (PDR). Log de
  decisiones de producto/posicionamiento, más blando que un ADR.
  - [PDR-001 — Landing SEO complementaria al AEO](decisions/PDR-001-seo-landing-complementaria-al-aeo.md)
  - [PDR-002 — Arquitectura de información de la sección de visibilidad](decisions/PDR-002-arquitectura-informacion-seccion-visibilidad.md)
  - [PDR-003 — Layering del ecosistema digital Efeonce](decisions/PDR-003-layering-ecosistema-digital-efeonce.md)
  - [PDR-004 — Posicionamiento de la landing "Agencia Creativa"](decisions/PDR-004-landing-agencia-creativa-posicionamiento.md)
  - [PDR-005 — Posicionamiento de la landing "Redes Sociales"](decisions/PDR-005-landing-redes-sociales-posicionamiento.md)
  - [PDR-006 — Posicionamiento de la landing "HubSpot" (Agentic Customer Platform + partnership)](decisions/PDR-006-landing-hubspot-agentic-platform-posicionamiento.md)
  - [PDR-007 — Posicionamiento del "HubSpot Portal Grader" (lead magnet + gancho a la venta)](decisions/PDR-007-hubspot-portal-grader-lead-magnet.md)
  - [PDR-008 — Posicionamiento de la landing "Agencia" (`/agencia`)](decisions/PDR-008-landing-agencia-marketing-digital-posicionamiento.md)
  - [PDR-009 — Booking nativo con HubSpot Scheduler API](decisions/PDR-009-hubspot-scheduler-native-booking.md)
  - [PDR-010 — La Home es el pitch; `/agencia` se pliega](decisions/PDR-010-home-es-el-pitch-agencia-se-pliega.md)
  - [PDR-011 — About Us como identidad Golden Circle](decisions/PDR-011-about-us-identidad-golden-circle.md)
  - [PDR-012 — Jerarquía de posicionamiento global](decisions/PDR-012-growth-operating-system-global-positioning.md)
- [PDR-013](decisions/PDR-013-hub-hubspot-pillar-cluster-arquitectura.md) — **El Hub de HubSpot: pillar + cluster.** Migración a `/servicios/hubspot/*` con 301 (la URL actual tiene **0 rankings y 0 backlinks**, medido). `/precios/` es la única con demanda SEO real (~1.500/mes, 30× todos los Hubs juntos); `/agentes/` es la más diferenciada (caso ANAM + Agent CLI). 🔴 Los clusters se miden por **citación en LLM y uso en el canal**, NO por tráfico orgánico. Deroga el "sin 301" de PDR-006.
- [PDR-014 — Creative Workflows como territorio editorial: Pillar + satélites](decisions/PDR-014-creative-workflows-territorio-editorial-pillar-cluster.md)
- [PDR-015 — AEO como categoría editorial raíz](decisions/PDR-015-aeo-categoria-editorial-raiz.md)
- [PDR-016 — Landing de influencer marketing, creators y UGC](decisions/PDR-016-landing-influencer-marketing-creators-ugc-posicionamiento.md)
- [PDR-017 — Content Engineering como territorio editorial y doctrina de experiencia](decisions/PDR-017-content-engineering-territorio-editorial.md)
- [PDR-018 — Pillar + Cluster Experience federada: arquitectura editorial, social search, conversión y runtime](decisions/PDR-018-pillar-experience-arquitectura-editorial-y-runtime.md)
- [PDR-019 — Taxonomía editorial canónica del blog WordPress](decisions/PDR-019-taxonomia-editorial-canonica-blog-wordpress.md)
- [PDR-020 — Canales propios de Efeonce: un motor editorial, cinco roles de canal](decisions/PDR-020-canales-propios-sistema-editorial.md) — **revisión 2.0 (2026-10-22):** tres familias (marca agencia: Instagram y Threads · conexión B2B: LinkedIn · Marketing con Manzanitas: blog, newsletter de LinkedIn y YouTube); Glitch es el único correo; sólo LinkedIn lleva directo a la landing. Estrategia hermana: [Love Brand & Community Strategy](../strategy/EFEONCE_LOVE_BRAND_AND_COMMUNITY_STRATEGY_V1.md); brechas de landing en el [roadmap](PRODUCT_ROADMAP.md).
- [PDR-021 — Landing Trade Marketing & BTL](decisions/PDR-021-landing-trade-marketing-btl-posicionamiento.md) — posición en el medio entre plataformas que detectan y agencias que ejecutan; término cabeza `trade marketing`, no el modificador `agencia de`. Brief: [Channel & Commerce Landing SEO/AEO Brief V1](CHANNEL_COMMERCE_LANDING_SEO_AEO_BRIEF_V1.md). Ejecución: `TASK-1860`.
- [PDR-022 — Landing Performance Marketing](decisions/PDR-022-landing-performance-marketing-posicionamiento.md) — spoke de demand capture en `/servicios/performance-marketing/` (página `251997`, **publicada e indexable el 2026-10-17**) que retiró con 301 la legacy `/servicio-gestion-campanas-publicitarias/` (ahora `private`); convive con PDR-025 sin compartir términos de cabecera. Brief: [Performance Landing SEO/AEO Brief V1](PERFORMANCE_LANDING_SEO_AEO_BRIEF_V1.md). Ejecución: `TASK-1865`.
- [PDR-023 — Landing ASO](decisions/PDR-023-landing-aso-posicionamiento.md) — tercera superficie del grupo `Visibilidad` junto a SEO y AEO; página de expansión y citabilidad en español, no de captura (`aso` es ambiguo y `app store optimization` casi no se busca en español); publicación por fases atada a la extensión Search & App Visibility. Brief: [ASO Landing SEO/AEO Brief V1](ASO_LANDING_SEO_AEO_BRIEF_V1.md). Ejecución: `TASK-1862`.
- [PDR-024 — AXIS en el sitio público: composición agéntica](decisions/PDR-024-axis-en-el-sitio-publico-composicion-agentica.md) — el sitio consume AXIS como versión fija incluida en `eo-elementor-widgets` y encolada sólo donde se usa (los packages son privados: nada de registry ni `-latest`); los agentes componen intents validados y el SVG se sirve en el HTML del servidor; AXIS es capa gráfica y de valores, nunca de texto ni de layout. Brecha previa: `tokens.css` no emite rampas, superficies ni tipografía. Ejecución: task por crear.
- [PDR-025 — Landing Agencia de Medios](decisions/PDR-025-landing-agencia-de-medios-posicionamiento.md) — «agencia de medios» como categoría y frase clave, separada de Performance (sin dominios comunes en el top 10 chileno; «performance marketing» fuera de title, H1 y slug); slug `/servicios/agencia-de-medios/`; claims permitidos y prohibidos (tecnología ≠ alianza, sin promesa de rebates, sin caso Sky). Publicada el 2026-10-16. Brief: [Agencia de Medios Landing SEO/AEO Brief V1](AGENCIA_DE_MEDIOS_LANDING_SEO_AEO_BRIEF_V1.md).
- [PDR-026 — Cada landing deriva su patrón de diseño de su necesidad](decisions/PDR-026-cada-landing-deriva-su-patron-de-diseno.md) — doctrina aceptada el 2026-10-18 con Inbound Marketing como caso fuente: ninguna landing es plantilla ni «el estilo» del sitio; lo reutilizable son mecanismos (núcleo del compilador y sus guardas, carril de paquete/deploy/publicación/rollback, lanzador de reunión de la base común, `EfeonceMention` —de AXIS `efeonce.mention` desde el 2026-10-18—, Growth Forms y Growth CTA), que cada landing viste con su propio diseño.
- [PDR-027 — Navegación global del sitio, portable entre sitios](decisions/PDR-027-navegacion-global-del-sitio-portable.md) — **Accepted** el 2026-10-18: la navegación aprobada en canvas (cápsula de vidrio con mega menús, onepage, cabecera fija y agendador) se construye como mecanismo de AXIS (`efeonce.site-nav`), con el contenido en un solo documento del plugin «EO Navegación» (admin y `wp eo-nav` para agentes) y fotos en el bucket público de AXIS; cada sitio la monta con un adaptador delgado. El operador decidió reemplazar el encabezado de Ohio en todo el sitio; el 2026-10-23 lo encendió directo, sin el piloto de una página, y está en producción desde las 00:09 UTC (`/blog/` se sumó el 2026-10-24 con el corte de su portada). Queda abierta la copia pública en el bucket. Arquitectura: [Navegación global del sitio público V1](../architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md). Ejecución: `EPIC-055` (`TASK-2040`…`TASK-2043`).
- [PDR-028 — Portafolio de proyectos («EO Portfolio»)](decisions/PDR-028-portafolio-de-proyectos-eo-portfolio.md) — **Accepted** el 2026-10-23: `/portafolio/` deja el tipo de contenido de Ohio por un portafolio propio donde cada proyecto cuenta para quién se hizo, qué resolvía, cómo se hizo y qué pasó, con sus piezas en su formato real, imagen o video. Patrón de PDR-027 (documento validado por proyecto con tres puertas: admin, `wp eo-portfolio` y JSON público), compuerta de aprobación del cliente y fuente obligatoria por cifra; el blog sigue siendo canónico para el caso largo. Incidente asociado: [ISSUE-183](../issues/resolved/ISSUE-183-portfolio-ohio-demo-entries-indexed.md) (44 demos de Ohio indexados). Ejecución: `EPIC-056` (`TASK-2046`…`TASK-2049`).
- [PDR-029 — Modelo de contenido de la portada del blog](decisions/PDR-029-modelo-de-contenido-portada-blog.md) — **Accepted** el 2026-10-24 por el operador: la portada v3 se alimenta de un modelo propio en `efeonce-editorial-blocks` — taxonomía «Formato» (`eo_format`, 7 formatos, uno por entrada, distinto de la categoría), fijación con vencimiento y título del slider, tipo «Evento» (`eo_event`, `/eventos/<slug>/`, `.ics`, `Event`/`VideoObject` por Yoast, «próximo» hasta inicio + duración, sin enlace privado), registro de recursos no público con frescura de 180 días, readers con REST de sólo lectura (`/wp-json/eo/v1/home/*`) y purgas de `/blog/` con ventana de 60 s. Slider en el orden de PDR-020: fijadas → Glitch → herramienta → diagnóstico. Todo detrás de `eo_content_model_enabled`. **En producción desde el 2026-10-24** (flag en 1, `/blog/` cortado a la portada v3). Ejecución: `TASK-2050` (la consume `TASK-2051`). Runtime: [Portada del blog — runtime V1](../architecture/public-site/BLOG_HOME_RUNTIME_V1.md). Manuales: [contenido](../manual-de-uso/public-site/operar-contenido-portada-blog.md) y [CLI](../manual-de-uso/public-site/operar-portada-blog-por-cli.md).
- **[Content Engineering Pillar Brief V1](CONTENT_ENGINEERING_PILLAR_BRIEF_V1.md)** — foundation brief de la futura masterpiece: tesis, audiencia, arco, primitives de comprensión/decisión, SEO/AEO, medición, distribución y gates de publicación.
- **[Creative Workflows Pillar + Cluster Brief V1](CREATIVE_WORKFLOWS_PILLAR_CLUSTER_BRIEF_V1.md)** — brief maestro de audiencia, tesis, arquitectura editorial, prioridades, enlaces, medición y atomización.
- **[Taste Profile y las 4 Rs de Loop — brief de artículo futuro V1](LOOP_TASTE_PROFILE_4RS_ARTICLE_BRIEF_V1.md)** — semilla aprobada por Julio (2026-10-26): explicación base, conexión con voz, contenido y AEO, y lo que falta validar antes de escribir (demanda, grabación de UNBOUND y libro).
- **[Web agéntica Pillar + Cluster Brief V1](WEB_AGENTICA_PILLAR_CLUSTER_BRIEF_V1.md)** — contrato editorial de la pillar que soporta `/desarrollo-sitios-web/`: definición citable, recorrido, cluster, enlaces, visuales, medición y gate de publicación.
- **[Web agéntica Pillar Gutenberg Spec V5](WEB_AGENTICA_PILLAR_GUTENBERG_SPEC_V5.json)** — source editorial del post público `249387`: siete infografías art-directed como `<picture>`, supuestos WebMCP/Chrome y mercado revalidados, evals por capas, madurez, readiness y cadena de autoridad. Publicado y verificado en vivo el 2026-07-18.
- **[Web agéntica — sistema visual editorial](WEB_AGENTICA_EDITORIAL_VISUAL_SYSTEM_V1.md)** / **[manifest de assets](WEB_AGENTICA_VISUAL_ASSET_MANIFEST_V1.json)** — contrato light/dark y desktop/móvil sin canvas decorativo, media WordPress, hashes, pruebas contextuales y gate automático de contención de texto.
- **[Creative Workflows Knowledge-to-Product Ladder V1](CREATIVE_WORKFLOWS_KNOWLEDGE_TO_PRODUCT_LADDER_V1.md)** — progresión gobernada Pillar→satélites→ebook/workbook→tool diagnóstica→Creative Studio, con jobs, evidencia, gates y fronteras de producto.
- **[Creative Workflows Pillar Research Dossier V1](CREATIVE_WORKFLOWS_PILLAR_RESEARCH_DOSSIER_V1.md)** — lectura SERP sin volúmenes inventados, claim ledger científico, evidencia de mercado y límites de publicación.
- **[Creative Workflows Pillar Gutenberg Spec V1](CREATIVE_WORKFLOWS_PILLAR_GUTENBERG_SPEC_V1.json)** — primera versión completa de la Pillar, estructurada para Content Factory. Originó el post `251363` como borrador privado; su [inspección profunda](../operations/public-site-content-factory/post-deep-inspection-251363-2026-07-15T05-25-14+00-00.json) conserva la evidencia de ese corte histórico. La versión pública vigente es V6.
- **[Creative Workflows Pillar Gutenberg Spec V6](CREATIVE_WORKFLOWS_PILLAR_GUTENBERG_SPEC_V6.json)** — corte live vigente desde 2026-07-16: convierte la FAQ de cuatro `H3 + párrafo` en una primitive semántica `kind: "faq"` que renderiza cuatro disclosures nativos `core/details` bajo el H2 `Preguntas frecuentes` y un `FAQPage` JSON-LD sincronizado. QA anónimo desktop/mobile PASS; `FAQPage=1`, `Question=4`.
- **[Creative Workflows FAQ Disclosure + Schema Decision V1](CREATIVE_WORKFLOWS_FAQ_DISCLOSURE_DECISION_V1.md)** — diagnóstico runtime WordPress/Ohio/Gutenberg: existen `core/details`, `core/accordion`, Essential Blocks accordion y Yoast FAQ; la decisión segura para este caso es `kind: "faq"` en Content Factory, que reutiliza `core/details`, evita custom JS y genera schema desde la misma fuente.
- **[Creative Workflows Pillar Gutenberg Spec V5](CREATIVE_WORKFLOWS_PILLAR_GUTENBERG_SPEC_V5.json)** — corte live anterior: 114 bloques gobernados, cinco imágenes, seis captions, dos diagramas ampliables y un `core/table`; QA anónimo desktop/mobile sin overflow.
- **[Creative Workflows Pillar Visual Enrichment V5](CREATIVE_WORKFLOWS_PILLAR_VISUAL_ENRICHMENT_V5.md)** — diagnóstico de distribución, corrección V3 de diagramas, tabla nativa, media IDs, snapshots/hashes, normalización emoji, cache purge y QA final.
- **[Creative Workflows Pillar Gutenberg Spec V4](CREATIVE_WORKFLOWS_PILLAR_GUTENBERG_SPEC_V4.json)** — versión editorial publicada en `https://efeoncepro.com/creative/creative-workflows/`: 111 bloques, fuentes primarias inline, caso SKY medido, límites metodológicos, transparencia de uso de IA, tres imágenes de cuerpo y metadata Yoast. Está `index, follow`.
- **[Creative Workflows Pillar Gutenberg Spec V3](CREATIVE_WORKFLOWS_PILLAR_GUTENBERG_SPEC_V3.json)** — versión autoral/visual anterior, conservada como evidencia de iteración.
- **[Creative Workflows Pillar Editorial Audit V2](CREATIVE_WORKFLOWS_PILLAR_EDITORIAL_AUDIT_V2.md)** — evaluación detallada de hook, voz, argumento, evidencia, ritmo, CTA y límites antes de publicación.
- **[Creative Workflows Pillar Visual System V1](CREATIVE_WORKFLOWS_PILLAR_VISUAL_SYSTEM_V1.md)** / **[Visual Audit V1](CREATIVE_WORKFLOWS_PILLAR_VISUAL_AUDIT_V1.md)** — concepto `La señal seleccionada`, cuatro assets GPT Image 2 y dos diagramas deterministas V3; body `251366–251368`, `251393`/`251392`, featured/OG `251370` y render live desktop/mobile verificado.
- **[Creative Workflows Pillar WordPress + SEO Audit V3](CREATIVE_WORKFLOWS_PILLAR_WORDPRESS_SEO_AUDIT_V3.md)** — snapshot/rollback, write V3, extracto, meta title separado del H1, meta description, categoría, featured, Open Graph, schema y readback anónimo/autenticado.
- **[Creative Workflows Pillar E-E-A-T Audit V4](CREATIVE_WORKFLOWS_PILLAR_EEAT_AUDIT_V4.md)** — evidencia de mercado/ciencia/caso SKY, Who/How/Why, disclosure de IA, entidad de autor corregida, publicación y readback live.
- **[Creative Workflows Agentic End-to-End Retrospective V1](CREATIVE_WORKFLOWS_AGENTIC_END_TO_END_RETROSPECTIVE_V1.md)** — cronología V1→V5, decisiones, incidentes, matriz humano/agente/sistema, artefactos, métricas finales, residuos y Definition of Done del primer blogpost operado integralmente por un agente.
- **[Runbook agentic de blogposts end to end](../operations/public-site-content-factory/AGENTIC_BLOGPOST_END_TO_END_RUNBOOK_V1.md)** — canon reusable surgido de este primer ciclo completo: research, coautoría, voz, Gutenberg, visuales, media, SEO/E-E-A-T, autorización, publicación con rollback y QA live. Los archivos Creative Workflows son el caso de referencia; el runbook es el proceso.

## Contexto canónico (fuentes que este espacio NO reimplementa)

- **Arquitectura del sitio público** (ADR vigentes): estrategia Astro runtime,
  render headless del report, módulo SEO Search Visibility 360, forms/CTA
  engines → [`architecture/DECISIONS_INDEX.md`](../architecture/DECISIONS_INDEX.md).
- **Programas de trabajo:** EPIC-019 (public website landing control plane),
  EPIC-020 (public AI visibility lead magnet), EPIC-022 (growth SEO Search
  Visibility 360), EPIC-023 (growth CTA/popup CRO) → [`docs/epics/`](../epics/).
- **Operación real del sitio:** skill `efeonce-public-site-wordpress`
  (WP/Kinsta/Astro, WP-CLI/REST, Content Factory, Growth Forms, deploy).
- **Posicionamiento comercial:** skill `commercial-expert` (overlay Greenhouse) +
  Business Context Pack `docs/context/`.
- **SEO/AEO:** skill `seo-aeo` (+ framework propietario "5 niveles" y overlay
  Efeonce) — la doctrina de posicionamiento en búsqueda + IA.
- **Content hub/blog WordPress:** contrato operativo vigente en
  [`docs/documentation/public-site/wordpress-blog-content-hub-search.md`](../documentation/public-site/wordpress-blog-content-hub-search.md)
  y auditoria base
  [`docs/audits/public-site/2026-07-09-wordpress-blog-content-hub-search.md`](../audits/public-site/2026-07-09-wordpress-blog-content-hub-search.md).
  La taxonomía canónica y la copia de trabajo `251875` de `Demo 35: Blog
  Magazine` están documentadas en
  [`docs/audits/public-site/2026-08-31-blog-taxonomy-demo35-work-copy.md`](../audits/public-site/2026-08-31-blog-taxonomy-demo35-work-copy.md);
  la fuente `225984` permanece protegida. `/blog/` ya no sale de Demo 35: desde el 2026-10-24 es la portada v3
  ([funcionamiento](../documentation/public-site/portada-del-blog.md),
  [runtime](../architecture/public-site/BLOG_HOME_RUNTIME_V1.md)).
- **Grader / dominio growth:** `architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`.

## Convención de PDR

- ID estable `PDR-###`, kebab-case en el nombre de archivo.
- Estado: `Proposed` · `Accepted` · `Superseded` · `Deprecated`.
- Cada PDR declara: contexto, decisión, alternativas descartadas (una línea c/u),
  consecuencias, enlaces a ADR/EPIC/TASK, y reglas duras si aplica.
- Al aceptar/cambiar un PDR, actualizar el índice de arriba y, si toca el orden
  de ejecución, `PRODUCT_ROADMAP.md`.


## Consentimiento y matching compartidos

[Contrato HubSpot/host](../reference/measurement-gtm-ga4/09-hubspot-consent.md) y
[runtime implementado](../reference/measurement-gtm-ga4/10-growth-lead-matching-runtime.md)
son el canon de banner automático, preferencias inline, PageView consentido y contexto portable.
Host distribuye el bridge común y embebe Forms/Meetings; no replica lógica de matching ni secretos.
Matching released no autoautoriza un formulario/host nuevo; conserva el scope publicado.
La [policy administrable](../architecture/GREENHOUSE_GROWTH_MEASUREMENT_POLICY_DECISION_V1.md)
está publicada: configura fuente/versión/surface/origen y campos por API/panel/CLI. Alta
compatible sin redeploy/GTM; nuevos hosts/contratos requieren revisión gobernada.
[Manual para agentes](../manual-de-uso/growth/configurar-medicion-conversiones.md). No activar
tracking en rutas privadas/tokenizadas ni copiar la configuración server-only al host.
