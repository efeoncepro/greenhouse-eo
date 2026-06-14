# Public Site WordPress — Inventario Ohio + Elementor

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.0
> **Creado:** 2026-06-14 por Codex
> **Ultima actualizacion:** 2026-06-14 por Codex
> **Dominio:** Public Site
> **Sitio:** `https://efeoncepro.com`
> **Runtime observado:** WordPress `7.0`, Kinsta, theme `ohio-child` `1.0.0` sobre Ohio `3.7.0`, Elementor `4.1.3`, Elementor Pro `4.1.1`, Ohio Extra `3.7.0`
> **Manual relacionado:** [Playbook de landings Ohio + Elementor](../../manual-de-uso/public-site/wordpress-ohio-elementor-landing-playbook.md)
> **Layout relacionado:** [Layout Ohio + Elementor](./wordpress-ohio-elementor-layout.md)
> **Extensiones relacionadas:** [Custom Elementor Widgets y React](./wordpress-custom-widgets-react-strategy.md)
> **Arquitectura relacionada:** [Public Website Landing Control Plane](../../architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md)

## Para que sirve

Este documento deja un inventario operativo del stack visual disponible en `efeoncepro.com` para que Greenhouse y los agentes puedan crear, mantener o corregir landings usando las capacidades reales de Ohio + Elementor, sin depender de CSS hardcodeado ni de selectores del frontend.

La fuente primaria fue el runtime instalado en Kinsta, no la documentacion comercial del theme. El sitio usa una mezcla de:

- Theme Ohio parent para wrappers, gutters, headers, sidebar, breadcrumbs, page headline, footer y dynamic CSS.
- Theme `ohio-child` para overrides controlados, footer custom y guardrails.
- Plugin `ohio-extra` para widgets Elementor Ohio.
- Elementor/Elementor Pro para el arbol editable (`_elementor_data`) y templates.
- HubSpot, Contact Form 7, Essential Addons y otros plugins para formularios, meetings, accordions y embeds.

## Evidencia de discovery

Discovery read-only ejecutada el 2026-06-14:

```bash
pnpm public-website:wpcli -- --eval-file <read-only inventory php> --wp-user 12
```

Artifact local no versionado:

```text
.captures/public-site-ohio-inventory-20260614/inventory.json
.captures/public-site-ohio-inventory-20260614/ohio-widget-controls.ndjson
.captures/public-site-ohio-inventory-20260614/design-foundations.json
.captures/public-site-ohio-inventory-20260614/css-signals.json
.captures/public-site-ohio-inventory-20260614/computed-design-samples.json
.captures/public-site-ohio-inventory-20260614/button-hover-samples.json
.captures/public-site-ohio-inventory-20260614/widget-design-control-summary.json
```

Resumen observado:

| Area | Resultado |
| --- | ---: |
| Elementor widgets registrados | 253 |
| Widgets Ohio registrados | 37 |
| Documentos Elementor con data | 246 |
| Templates en `elementor_library` | 67 |
| Widget mas usado | `spacer` (1868 usos) |
| Widget Ohio mas usado | `ohio_heading` (874 usos) |

## Fundaciones visuales: color, tipografia y motion

Este discovery no debe leerse solo como inventario de ancho/layout. Para operar landings sin hardcodear, Greenhouse necesita entender las capas visuales que compiten entre si: Elementor Kit, Ohio global options, metas de pagina, settings de cada widget, CSS generado por Elementor y overrides del child theme.

### Orden de precedencia observado

En una ruta publicada, el estilo efectivo suele resolverse en este orden:

1. CSS/inline settings generados por Elementor para el widget o seccion.
2. Settings del documento Elementor (`_elementor_page_settings`) y CSS `post-<id>.css`.
3. Metas Ohio por pagina (`page_*`, header, footer, breadcrumbs, wrapper, background, padding).
4. Ohio global options y dynamic CSS (`--clb-*`).
5. Elementor active kit (`elementor_active_kit=7`), que existe pero no gobierna todo.
6. Child theme `ohio-child`, idealmente solo para guardrails o overrides page-scoped.

Regla operativa: antes de tocar CSS, identificar en que capa vive el estilo. Si existe control Ohio/Elementor equivalente, usarlo. Si el CSS es inevitable, scopearlo por `body.page-id-*` o clase semantica `gh-*` y documentar rollback.

### Colores globales vs aplicacion real

| Capa | Valor observado | Como se aplica |
| --- | --- | --- |
| Ohio brand global | `options_global_page_brand_color=#023c70` | Alimenta `--clb-color-primary`; es el azul de marca que predomina en runtime. |
| Ohio links | `page_links_color=#022a4e`, `page_links_hover_color=#024c8f` | Alimenta links y hover cuando el widget no lo overridea. |
| Ohio footer | `page_footer_background_color=#161519` | Fondo canonico del footer interno. |
| Elementor Kit activo | `post-7.css` conserva defaults `#6EC1E4`, `#61CE70`, Roboto | No debe tratarse como fuente confiable de marca sin validar computed CSS. |
| Elementor Kit meta historico | Aparecen variantes con `#024C8F`, `#0375DB`, `#263448`, DM Sans | El meta del kit esta sucio/nested; usar solo como pista, no como contrato. |
| Widget/page generated CSS | Ej. HubSpot page contiene `#FF6D0D` en EAEL accordion y colores por widget | Gana sobre globals; revisar `post-<id>.css` y settings antes de cambiar. |
| Child theme | `global-fixes.css` usa `#161519`, rgba blancos, page-scoped fixes | Usar solo para correcciones transversales justificadas o bugs sin control nativo. |

Computed CSS en navegador confirma que las rutas clave comparten `--clb-color-primary=#023c70`, `--clb-color-link-hover=#024c8f`, `--clb-grid-gutter=1rem`, `--clb-container-width=86vw` y `--clb-container-side-gutter=1rem`. Esto explica por que un gradiente o hover fuera de esa familia se siente como regresion de marca.

### Tipografia global vs aplicacion real

| Capa | Valor observado | Implicacion |
| --- | --- | --- |
| Ohio body | `options_global_page_text_typo` usa `Inter`, regular/600/700, spacing `-0.01em` | Parrafos, labels y UI base heredan Inter. |
| Ohio headings | `options_global_page_headings_typo` usa `DM Sans`, weight 700 en opciones; computed runtime suele resolver 600 | Titulos y botones Ohio usan DM Sans. |
| Elementor Kit CSS | `post-7.css` muestra Roboto / Roboto Slab defaults | Drift: no usar el kit CSS como verdad tipografica. |
| Frontend computed | `body=Inter`, `h1/h2=DM Sans`, botones Ohio=`DM Sans 600` | Esta es la verdad visual efectiva para QA. |
| Footer computed | Inter sobre fondo `#161519` | Los fixes de footer deben preservar contraste y no alterar rail/sidebar. |

Muestras computadas 1440px:

| Ruta | H1 | Body/parrafo | Boton |
| --- | --- | --- | --- |
| Home | DM Sans 60.48px/600, blanco | Inter 14.1px en claim secundario | `Descubre como`: DM Sans 15.58px/600, verde luz controlado |
| HubSpot services | DM Sans 64px/600, blanco | Inter 16.4px | CTA azul/negro segun variante Ohio |
| Blog | DM Sans 68.8px/600 | Inter 18.04px en hero | CTA `button -primary`, azul `#023c70` |
| Contacto | DM Sans 64px/600 | Inter 16.4px | CTA azul `#023c70` |

Regla operativa: no introducir otra familia sin una decision de marca. Si una seccion se ve "rara", revisar si usa widgets core de Elementor con Roboto/default kit o si el widget Ohio hereda DM Sans/Inter correctamente.

### Botones y estados hover

Los botones Ohio no son uniformes: pueden ser `button -primary`, `button -secondary`, `button -small`, o widget `ohio_button` con controles de color/hover.

| Ejemplo | Estado base | Hover observado | Lectura de diseno |
| --- | --- | --- | --- |
| Home `Descubre como` | Verde `rgb(156,238,106)`, texto verde oscuro, radius 12px, sombra suave | Verde mas luminoso, sombra mas presente, translateY(-1px), 0.18s | Microinteraccion correcta: aporta luz sin cambiar de marca. |
| Home `Ver Proyectos` | Blanco translucid, texto oscuro | Gris semitransparente + texto blanco | Correcto sobre fondos oscuros; no aplicar sobre fondo claro sin revisar contraste. |
| HubSpot services CTA | Fondo oscuro/azul, texto blanco | Azul marca `#023c70` | Coherente con Ohio global. |
| Blog/contacto CTA primario | Azul `#023c70`, texto blanco | Permanece azul | Neutro; puede requerir hover mas perceptible, pero sin saltar a azul electrico. |

Controles nativos relevantes en `ohio_button`: `title_color`, `button_color`, `border_color`, `title_hover_color`, `button_hover_color`, `border_hover_color`, `border_radius`, `button_size`, `drop_shadow`, `drop_shadow_intensity`, `use_icon`, `icon_position`. Esto debe ser el primer lugar para arreglar hover/active antes de CSS.

### Microinteracciones y motion disponibles

Ohio trae motion nativo, pero no todos los controles tienen un contrato claro de accesibilidad/reduced-motion. Usarlos con criterio.

| Tipo | Widgets / controles | Uso recomendado |
| --- | --- | --- |
| Hover de cards | `tilt_effect`, `drop_shadow`, `drop_shadow_intensity`, `card_effect` en `ohio_service_table`, `ohio_banner`, `ohio_gallery`, `ohio_recent_posts`, `ohio_recent_projects`, team/pricing | Activar solo si mejora affordance. Evitar tilt fuerte en enterprise B2B. |
| Heading highlight | `ohio_heading.highlighted_animation`, `highlighter_height`, `highlighter_color` | Buen recurso para enfasis puntual; no usar como decoracion repetitiva. |
| Carousels/sliders | `autoplay`, `autoplay_time`, `stop_on_hover`, `loop`, `drag_scroll`, `mousewheel_scroll`, nav/pagination | Requiere QA mobile/performance; evitar autoplay agresivo. |
| Portfolio/blog grids | `animation_type`, `animation_effect`, `pagination`, `filter_*`, `lightbox`, `fullscreen_mode` | Util para casos/proyectos; revisar CPT y filtros antes de usar. |
| Video | `autoplay_option`, `muted_option`, `controls_option`, hover de boton/icono | Autoplay solo muted y con razon clara. |
| Dynamic text | `type_speed`, `loop` | Usar con moderacion; puede cansar en landings enterprise. |
| Marquee | `speed`, `direction`, `slow_on_scroll` | No usado actualmente; requiere smoke antes de incorporar. |

Ausencia relevante: en el discovery de widgets Ohio no se encontro un guardrail consistente de `prefers-reduced-motion`. Para motion "aurora" o fondos vivos, preferir CSS/JS controlado por Greenhouse/child con media query reduced-motion y validacion visual; no improvisar animaciones pesadas dentro de un widget sin fallback.

### Matriz de controles de diseno por widget Ohio

Resumen generado desde `ohio-widget-controls.ndjson`:

| Widget | Usos | Color | Tipografia/layout visual | Motion/hover |
| --- | ---: | ---: | ---: | ---: |
| `ohio_heading` | 874 | 6 | 2 | 1 |
| `ohio_service_table` | 370 | 16 | 2 | 4 |
| `ohio_icon_box` | 247 | 6 | 3 | 0 |
| `ohio_button` | 221 | 9 | 4 | 5 |
| `ohio_counter` | 174 | 10 | 3 | 0 |
| `ohio_badge` | 161 | 7 | 1 | 0 |
| `ohio_recent_posts` | 75 | 13 | 3 | 13 |
| `ohio_recent_projects` | 72 | 16 | 5 | 24 |
| `ohio_carousel` | 54 | 4 | 4 | 12 |
| `ohio_banner` | 52 | 11 | 2 | 5 |
| `ohio_video` | 51 | 8 | 2 | 8 |
| `ohio_accordion` | 36 | 10 | 0 | 0 |
| `ohio_dynamic_text` | 35 | 2 | 1 | 2 |
| `ohio_social_networks` | 32 | 10 | 2 | 4 |
| `ohio_gallery` | 15 | 12 | 5 | 11 |

Interpretacion: los widgets mas usados ya tienen suficientes controles nativos para resolver color, hover, fondo, bordes y motion sin hardcodear. El bridge Greenhouse debe exponer un subset seguro de esos settings, no solo `content_width`.

## Como funciona Ohio en este sitio

Ohio no es solo un theme visual. En `efeoncepro.com`, Ohio decide parte importante del layout antes de que Elementor renderice widgets.

## Clases, selectores y variables Ohio observadas

Este no pretende ser un dump exhaustivo de todo el CSS del theme Ohio. Es el mapa operativo de clases/selectores que los agentes deben conocer antes de diagnosticar o parchear una landing. La regla sigue siendo: **usar clases/selectores para inspeccionar y validar; no convertirlos en contrato de negocio ni parchear globalmente salvo que sea un guardrail documentado**.

### Body classes y estado de pagina

Ohio/WordPress agregan clases al `body` que cambian layout, header, sidebar y modo visual.

| Clase / patron | Donde aparece | Significado operativo |
| --- | --- | --- |
| `home`, `front-page`, `page-id-2791` | Home | Permite scopear excepciones del home sin tocar landings internas. |
| `page-id-18456` | `/blog` | Scope seguro para fixes especificos del blog. |
| `page-id-20729` | `/contacto` | Scope seguro para fixes especificos de contacto. |
| `page-id-244079` | `/servicios-contratar-hubspot/` | Scope seguro para la landing HubSpot services. |
| `wp-theme-ohio`, `wp-child-theme-ohio-child` | Todas | Confirma parent/child theme en runtime. |
| `ohio-theme-1.0.0` | Todas | Clase generada por theme; no usar como version real del parent. |
| `with-header-1` ... `with-header-8` | Segun `page_header_menu_style` | Define layout de header Ohio. |
| `with-header-sidebar` | Blog/header styles `5/6/7` | Activa rail lateral fijo con hamburger/logo vertical. |
| `with-boxed-container` | Paginas con boxed wrapper | Cambia calculo de contenedor y side spacer. |
| `with-fixed-search` | Si search fijo esta activo | Afecta overlay/search global. |
| `dark-scheme` | Modo dark activo | No forzar colores de rail/header sin considerar este estado. |
| `light-typo` | Ohio dynamic typography sobre secciones oscuras | Puede lavar hamburger/logo si se parchea mal. Fue parte de la regresion del blog. |
| `with-spacer` | Header/sidebar/layout Ohio | Indica reservas/espaciadores del theme alrededor del canvas. |

### Wrappers y canvas

| Selector | Rol | Riesgo |
| --- | --- | --- |
| `#content.site-content` | Contenedor principal WordPress/Ohio | No pintarlo globalmente para esconder discontinuidades; revisar breadcrumbs/offset primero. |
| `#content > .page-container` | Wrapper de contenido Ohio | Su posicion depende de `page_add_wrapper`, `page_add_top_padding` y template. |
| `.page-container` | Contenedor base Ohio | Recibe `--clb-container-width` y offsets. |
| `.page-container.-full-w` | Full-width wrapper | Recibe `--clb-container-side-gutter`; clave en el incidente de `/blog`. |
| `.page-container.top-offset` | Offset superior automatico | Puede crear banda no-Elementor sobre contenido. |
| `.page-container.bottom-offset` | Offset inferior automatico | Fue parte de la discontinuidad en `/contacto`. |
| `.elementor-section` | Section legacy Elementor | Puede tener background full-width y `.elementor-container` interno. |
| `.elementor-container` | Contenedor interno legacy | Es el nodo que se corrige con `layout=boxed` + `content_width`. |
| `.e-con`, `.e-con-inner` | Containers modernos Elementor | No asumir que una pagina legacy los usa. |
| `.elementor-element-<id>` | Clase generada por Elementor | Util para diagnostico; no es semantic anchor durable para Greenhouse. |
| `.elementor-widget-container` | Wrapper de widget | No parchear globalmente; preferir settings del widget. |

### Header, sidebar, breadcrumbs y footer

| Selector | Rol | Uso seguro |
| --- | --- | --- |
| `#masthead` | Header Ohio | No parchear globalmente. Solo page-scoped si se conoce el estado visual. |
| `#masthead.header-sidebar` | Rail/header lateral Ohio | En `/blog`, debe seguir claro aunque cruce secciones oscuras. |
| `.header`, `.header-wrap` | Header horizontal Ohio | Recibe variables de ancho/gutter y background. |
| `.header:not(.header-sidebar) .header-wrap:not(.page-container)` | Header full-width horizontal | Dynamic CSS de Ohio lo usa para side gaps. |
| `.header-wrap.page-container:not(.-full-w)` | Header boxed | Recibe `--clb-container-width`. |
| `.hamburger`, `.hamburger-holder`, `.menu-trigger` | Hamburguesa/menu | Nombres pueden variar por markup; inspeccionar antes de patch. |
| `.branding`, `.logo`, `.site-branding` | Logo/header branding | No asumir un solo selector; Ohio cambia segun header style. |
| `.breadcrumb-holder` | Breadcrumbs Ohio | Si genera una banda visual, apagar con meta `page_breadcrumbs_visibility=0` antes de CSS. |
| `.page-headline` | Hero/page title de Ohio | Puede incluir overlay/background antes del contenido Elementor. Si usa `page_header_title_background_type=featured`, el fondo viene de `_thumbnail_id`, no de widgets Elementor. |
| `.page-headline .bg-image` | Background real del headline Ohio | Inspeccionar `background-image`, `background-size` y status HTTP en navegador. No confundir logos inline de widgets con el hero. |
| `.page-headline:before` | Overlay/fondo generado por dynamic CSS | No confundir con background de Elementor. |
| `.site-footer` | Footer Ohio/child | Fondo interno canonico `#161519`. |
| `.site-footer .page-container` | Contenedor footer | Recibe width/gutters de Ohio footer settings. |
| `.site-footer .page-container.-full-w` | Footer full-width | Recibe `page_footer_full_width_margins_size`. |
| `.site-footer .widget-title` | Titulos footer | Typography/color puede venir de Ohio global footer options. |
| `.site-footer-copyright` | Copyright/footer legal | No mezclar con eslogan/marca. |

### Widgets Ohio y clases frontend

| Selector / patron | Widget / origen | Nota |
| --- | --- | --- |
| `.ohio-widget` | Widgets Ohio Extra | Clase comun de widgets Ohio; no basta para identificar tipo. |
| `.ohio-widget.button` | `ohio_button` | Base para botones Ohio. |
| `.button`, `.button.-primary`, `.button.-secondary`, `.button.-small`, `.button.-default` | Botones Ohio/theme | Los estados hover pueden venir de widget settings o global `--clb-color-button*`. |
| `.heading`, `.clb-heading`, `.ohio-heading-sc` | `ohio_heading` / heading Ohio | Usar para inspeccion de typography; los settings viven en Elementor. |
| `.blog-item` | `ohio_recent_posts` / blog cards | Dynamic CSS apunta a `.blog-item .button.-text`. |
| `.project[class*="-layout"]` | `ohio_recent_projects` / portfolio cards | Dynamic CSS apunta a project cards y botones. |
| `.portfolio-filter`, `.pagination` | Projects/posts filters y paginacion | Colores/hover suelen tener controles del widget. |
| `.accordion`, `.accordion-item`, `.eael-adv-accordion` | Ohio/EAEL accordions | Distinguir Ohio vs Essential Addons antes de patch. |
| `.wp-block-cover`, `#block-34` | Footer badge/widget block | Se usa en child CSS para badge HubSpot; evitar repetir IDs si se reestructura footer. |

### Variables CSS Ohio mas relevantes

| Variable | Fuente | Uso |
| --- | --- | --- |
| `--clb-color-primary` | `page_brand_color` | Azul marca efectivo, observado `#023c70`. |
| `--clb-color-link` | `page_links_color` | Link base. |
| `--clb-color-link-hover` | `page_links_hover_color` | Hover link, observado `#024c8f`. |
| `--clb-color-button` | `page_buttons_color` / fallback Ohio | Fondo de botones theme cuando no hay override local. |
| `--clb-color-button-hover` | `page_buttons_hover_color` / fallback Ohio | Hover de botones theme. |
| `--clb-color-fill` | `page_backgrounds_color` | Fondos/fills globales del theme. |
| `--clb-color-border` | `page_borders_color` | Bordes globales. |
| `--clb-color-overlay` | `page_overlay_color` | Overlays de theme. |
| `--clb-border-radius` | `page_container_corners` | Radio global de contenedores. |
| `--clb-grid-border-radius` | `page_grid_corners` | Radio de grids/cards. |
| `--clb-grid-gutter` | `page_grid_gutter` | Gutter base; observado `1rem`. |
| `--clb-container-width` | wrapper/header/footer width settings | Ancho maximo efectivo; observado `86vw`. |
| `--clb-container-side-gutter` | full-width margins settings | Margen lateral full-width; observado `1rem`. |
| `--clb-container-side-spacer` | boxed wrapper settings | Espacio lateral boxed. |
| `--clb-text-font-family` | `page_text_typo` | Body, observado `Inter`. |
| `--clb-title-font-family` | `page_headings_typo` | Headings, observado `DM Sans`. |
| `--clb-text-font-size` | typography dynamic CSS | Body size, observado `1.025rem`. |
| `--clb-title-font-weight` | typography dynamic CSS | Peso de titulos; computed suele resolver 600. |
| `--clb-header-height-*` | header dynamic CSS | Reservas por layout de header. |
| `--clb-footer-border-radius` | footer corners | Footer radius si se configura. |

### Selectores que NO deben ser contrato primario

| Selector | Por que evitarlo como contrato |
| --- | --- |
| `.elementor-element-<id>` | Es generado por Elementor y cambia si se duplica/importa. Usarlo solo como pista visual. |
| Paths del arbol (`0.1.2`) | Cambian al reordenar elementos. |
| `.page-id-*` | Sirve para scope de fix page-specific, no para declarar ownership de modulo. |
| `#block-*` | IDs de bloques/footer pueden cambiar si se reordena el widget area. |
| `.light-typo` | Es estado dinamico de Ohio; parchearlo globalmente rompe header/sidebar. |
| `#masthead`, `.site-footer`, `.page-headline` globales | Demasiado amplios; antes de tocarlos verificar page meta y visual state. |

Contrato recomendado para Greenhouse-owned modules: agregar clases semanticas en Elementor (`gh-owned`, `gh-section-*`, `gh-widget-*`, `gh-slot-*`) y usar esas clases como anchors de automatizacion. Los selectores Ohio/Elementor se usan para inspeccion, medicion y compatibilidad con el theme.

### Wrappers y gutters

Ohio genera CSS dinamico desde `wp-content/themes/ohio/inc/dynamic_css/parts/page.php`.

Controles relevantes:

| Meta/setting Ohio | Efecto operativo |
| --- | --- |
| `page_add_wrapper` | Decide si la pagina usa wrapper normal o `.page-container.-full-w`. |
| `page_content_wrapper_width` | Alimenta `--clb-container-width` cuando hay wrapper. |
| `page_full_width_margins_size` | Alimenta `--clb-container-side-gutter` para full-width. Fue la causa del desfase de `/blog`. |
| `page_add_top_padding` | Activa `top-offset`/`bottom-offset` en `page.php` y `page_for-builder.php`. Fue la causa de parte de la discontinuidad en `/contacto`. |
| `page_top_padding_spacing` / `page_bottom_padding_spacing` | Padding dinamico de `.page-container.top-offset` y `.page-container.bottom-offset`. |
| `page_use_boxed_wrapper` / `page_boxed_wrapper_margins_size` | Activa clase `with-boxed-container` y `--clb-container-side-spacer`. |
| `page_background_color` / `page_background_type` | Pinta `.site-content` y `.page-headline:before`. |
| `page_header_title_background_type=featured` + `_thumbnail_id` | Background de `.page-headline .bg-image` | En `page_id=244079`, el asset correcto del hero HubSpot services es attachment `248703` (`EO_Hubspot_Hiro2-2.webp`, `2001x801`). El attachment `243106` es solo un logo inline (`221x65`). |

Regla operativa: si una seccion se ve desplazada o con una franja lateral, revisar primero metas Ohio + controles Elementor nativos. CSS es el ultimo recurso, page-scoped y con rollback.

### Header, sidebar y body classes

Ohio agrega clases en `wp-content/themes/ohio/inc/wp_overrides.php`.

| Setting | Clase / efecto |
| --- | --- |
| `page_header_menu_style=style1..style8` | Agrega `with-header-1` ... `with-header-8`. |
| `style5`, `style6`, `style7` | Agregan `with-header-sidebar`. |
| `page_use_boxed_wrapper=true` | Agrega `with-boxed-container`. |
| `page_header_search_position=fixed` | Agrega `with-fixed-search`. |
| Color mode / dynamic typography | Puede activar `.light-typo` sobre headers. Esto puede afectar hamburger/logo si se parchea globalmente. |

Regla operativa: nunca corregir un problema de una landing tocando globalmente `#masthead`, `.header-dynamic-typo`, `.light-typo`, footer o hero. En `/blog`, el fix aceptable fue page-scoped porque el rail de Ohio seguia siendo blanco aunque Ohio aplicaba tipografia clara.

### Breadcrumbs y page headline

`page.php` renderiza:

1. `parts/elements/page_headline`
2. `parts/elements/breadcrumbs`
3. `.page-container`

Por eso una discontinuidad visual entre hero y contenido puede venir de Ohio, no de Elementor. En `/contacto`, el fix correcto fue `page_breadcrumbs_visibility=0` y `page_add_top_padding=0`.

### Plantilla builder

`page_templates/page_for-builder.php` tambien usa `page_add_wrapper` y `page_add_top_padding`, pero no renderiza breadcrumbs. Cuando una landing use este template, el debug debe revisar ambos planos: template WordPress + arbol Elementor.

## Plugins visuales y de landing activos

| Plugin | Version | Estado | Uso operativo |
| --- | --- | --- | --- |
| Elementor | 4.1.3 | activo | Builder principal, containers/sections/widgets, CSS externo. |
| Elementor Pro | 4.1.1 | activo | Widgets Pro, loops, slides, templates. |
| Ohio Extra | 3.7.0 | activo | 37 widgets Ohio para Elementor + shortcodes legacy. |
| Ohio Portfolio | 1.1.3 | activo | CPT/proyectos usados por `ohio_recent_projects`. |
| Ohio Importer | 1.3.3 | activo | Import demos/templates; no usar como runtime bridge. |
| HubSpot All-In-One Marketing | 11.3.45 | activo | Widget `hubspot-form`, forms/popups/chat. |
| HubSpot Content embed | 1.3.7 | activo | Embeds HubSpot. |
| Contact Form 7 | 6.1.6 | activo | Formulario consumido por `ohio_contact_form`. |
| WPOP Contact Form 7 to Hubspot | 1.0.9 | activo | Integracion CF7 -> HubSpot. |
| Essential Addons for Elementor | 6.6.7 | activo | Widgets `eael-*`; hoy se observa `eael-adv-accordion` y `eael-sticky-video`. |
| Essential Addons Pro | 6.0.0 | inactivo | No asumir disponibilidad productiva. |
| Essential Blocks | 6.2.0 | activo | Bloques Gutenberg; no es el carril principal de estas landings. |
| Slider Revolution | 6.7.41 | activo | Sliders legacy; inventariar antes de tocar. |
| UiChemy | 4.10.0 | inactivo | Figma converter; no asumir para runtime. |
| WooCommerce | 10.8.1 | inactivo | Widgets Ohio Woo existen, pero no hay ecommerce activo. |

## Inventario completo de widgets Ohio

Los widgets Ohio viven en:

```text
wp-content/plugins/ohio-extra/elementor/widgets/<widget>/<widget>-widget.php
```

La tabla muestra uso real agregado en documentos Elementor y controles estructurales principales. Los controles de color/border/shadow existen, pero aqui se priorizan los que sirven para construir o modificar landings sin hardcodear.

| Widget | Titulo | Usos | Controles principales |
| --- | --- | ---: | --- |
| `ohio_heading` | Heading | 874 | `module_type_layout`, `title`, `heading_tag`, `add_highlighted`, `title_before`, `title_highlighted`, `title_after`, `highlighted_animation`, `highlighter_height`, `subtitle_type_layout` |
| `ohio_service_table` | Service Table | 370 | `table_align`, `headline`, `subtitle`, `description`, `tilt_effect`, `icon_layout`, `icon_type`, `icon_icon`, `icon_image`, `icon_html` |
| `ohio_icon_box` | Icon Box | 247 | `icon_box_layout`, `icon_box_full_layout`, `icon_box_alignment`, `title`, `heading_tag`, `description`, `icon_layout`, `icon_type`, `icon_icon`, `icon_image` |
| `ohio_button` | Button | 221 | `block_type_layout`, `button_position`, `title`, `link`, `button_size`, `inline_button`, `full_width`, `use_icon`, `icon_position`, `icon_type` |
| `ohio_counter` | Counter | 174 | `block_type_layout`, `counter_position`, `count_number`, `count_text_before`, `count_text_after`, `title`, `description`, `plus_symbol`, `icon_layout`, `icon_position` |
| `ohio_clients_logo` | Clients Logo | 163 | `block_alignment`, `clients_logo_image`, `clients_logo_image_inverse`, `clients_logo_width`, `clients_logo_height`, `description`, `use_link`, `link` |
| `ohio_badge` | Badge | 161 | `layout`, `alignment`, `title`, `text_before`, `use_link`, `link` |
| `ohio_testimonial` | Testimonial | 106 | `block_layout`, `block_alignment`, `author_photo`, `avatar_size`, `title`, `testimonial_text`, `author_name`, `author_position`, `author_inline_layout` |
| `ohio_recent_posts` | Blog Posts | 75 | `block_type_layout`, `posts`, `post_category`, `orderby`, `order`, `blog_images_size`, `card_effect`, `tilt_effect`, `use_metro_style`, `use_boxed_layout` |
| `ohio_recent_projects` | Portfolio Projects | 72 | `card_layout`, `projects`, `portfolio_category`, `orderby`, `order`, `portfolio_images_size`, `card_boxed_layout`, `card_reversed_layout`, `use_metro_style`, `tilt_effect` |
| `ohio_carousel` | Carousel | 54 | `tabs`, `preloader`, `offset_items`, `offset_size`, `gap_items`, `gap_size`, `autoheight`, `autoplay`, `autoplay_time`, `loop` |
| `ohio_banner` | Banner | 52 | `block_type_layout`, `block_type_full_align`, `background_image`, `title`, `heading_tag`, `subtitle`, `description`, `equal_height`, `tilt_effect`, `card_effect` |
| `ohio_video` | Video | 51 | `module_layout`, `button_layout`, `block_alignment`, `preview_image`, `title`, `button_size`, `use_call_to_action`, `tilt_effect`, `video_type`, `link` |
| `ohio_accordion` | Accordion | 36 | `block_layout`, `tabs`, `is_active`, `list_title`, `list_content_type`, `list_content_editor`, `list_content_template`, `use_icon`, `icon_icon`, `custom_class` |
| `ohio_dynamic_text` | Dynamic Text | 35 | `text_alignment`, `before_text`, `dynamic_text`, `after_text`, `type_speed`, `loop`, `list_text` |
| `ohio_social_networks` | Social Networks | 32 | `block_layout`, `block_alignment`, `icons_size`, `socials_type`, `facebook_share`, `twitter_share`, `linkedin_share`, `pinterest_share`, `social_networks`, `default_colors` |
| `ohio_team_member` | Team Member | 31 | `block_layout`, `alignment`, `team_member_image`, `member_name`, `member_position`, `member_description`, `equal_height`, `tilt_effect`, `card_effect`, `use_link` |
| `ohio_progress_bar` | Linear Progress | 26 | `block_type_layout`, `label`, `progress_value`, `show_percents_tooltip`, `thickness` |
| `ohio_team_members` | Team Members Group | 21 | `members`, `list_link`, `list_network`, `team_member_image`, `member_name`, `member_position`, `member_description`, social network fields |
| `ohio_message` | Message | 19 | `message_type`, `message_position`, `text`, `size`, `wrap_text`, `full_width`, `without_close_button`, `use_icon`, `icon_type`, `icon_icon` |
| `ohio_woo_categories` | Woo Categories | 16 | `category_layout`, `alignment`, `woo_categories`, `subtitle_position`, `equal_height`, `tilt_effect`, `card_effect`, `layout_columns`, `use_link`, `button_title` |
| `ohio_gallery` | Gallery | 15 | `gallery_layout`, `alignment`, `images`, `preview_title`, `metro_style`, `tilt_effect`, `card_effect`, `masonry_grid`, `masonry_grid_alignment`, `gap_size` |
| `ohio_circle_progress_bar` | Circular Progress | 14 | `block_type_layout`, `alignment`, `label`, `progress_value`, `thickness`, `use_icon`, `icon_type`, `icon_icon`, `icon_image`, `icon_html` |
| `ohio_tabs` | Tabs | 14 | `tabs_layout`, `tabs_direction`, `block_alignment`, `tabs`, `list_title`, `list_subtitle`, `list_content_type`, `list_content_editor`, `list_content_template`, `use_icon` |
| `ohio_contact_form` | Contact Form 7 | 13 | `important_note`, `block_type_layout`, `form_position`, `fields_offset`, `form` |
| `ohio_compare` | Compare | 12 | `first_image`, `second_image`, `orientation`, `use_label`, `before_label`, `after_label`, `divider_position` |
| `ohio_pricing_list` | Pricing List | 12 | `name`, `ingredients`, `regular_price`, `sale_price`, `mark`, `mark_background` |
| `ohio_pricing_table` | Pricing Table | 11 | `table_align`, `headline`, `subtitle`, `description`, `price`, `old_price`, `caption`, `currency`, `boxed_layout`, `tilt_effect` |
| `ohio_process` | Process | 9 | `alignment`, `number`, `headline`, `description` |
| `ohio_countdown` | Countdown | 8 | `block_layout`, `countdown_alignment`, `countdown_date`, `use_divider` |
| `ohio_google_maps` | Google Maps | 5 | `block_type_layout`, `coordinates`, `map_height`, `map_zoom`, `zoom_enabled`, `street_view_enabled`, `map_type_enabled`, `fullscreen_enabled`, `custom_marker_image` |
| `ohio_call_to_action` | Call To Action | 3 | `title`, `heading_tag`, `subtitle`, `subtitle_type_layout`, `button_title`, `button_link`, `icon_position`, `icon_type`, `icon_image`, `icon_icon` |
| `ohio_accordion_horizontal` | Horizontal Accordion | 2 | `tabs`, `list_content_type`, `list_content_editor`, `list_content_template`, `custom_class` |
| `ohio_instagram` | Instagram Feed | 2 | `important_note`, `feed_id`, `remove_gap` |
| `ohio_vertical_slider` | Vertical Slider | 1 | `tabs`, `loop`, `autoplay`, `autoplay_time`, `drag_scroll`, `mousewheel_scroll`, `fullscreen`, `scroll_direction`, `pagination_show`, `pagination_type` |
| `ohio_marquee` | Marquee | 0 | `content_type`, `images`, `marquee_text`, `direction`, `speed`, `slow_on_scroll`, `gap_right`, `height` |
| `ohio_simple_products` | Products | 0 | `columns`, `products`, `order_by`, `order` |

## Widgets no-Ohio usados

| Widget | Usos | Origen | Uso recomendado |
| --- | ---: | --- | --- |
| `spacer` | 1868 | Elementor | Alto riesgo de layout fragil. Reducir en nuevas landings y preferir padding/gap nativo de section/container. |
| `text-editor` | 587 | Elementor | Copy largo, parrafos, disclaimers. |
| `image` | 474 | Elementor | Assets, logos, mockups, thumbnails. |
| `heading` | 144 | Elementor | Plantillas importadas no-Ohio, especialmente Loop Marketing. |
| `divider` | 100 | Elementor | Separadores. Preferir controles nativos cuando sea estructural. |
| `hubspot-form` | 24 | HubSpot | Formularios CRM. Requiere contrato de attribution/UTM. |
| `eael-adv-accordion` | 18 | Essential Addons | Accordions avanzados. No usar como primera opcion si `ohio_accordion` basta. |
| `button` | 15 | Elementor | Botones en plantillas no-Ohio. Preferir `ohio_button` para consistencia actual. |
| `icon-box` | 12 | Elementor | Plantillas importadas. Preferir `ohio_icon_box` si el bloque pertenece a Ohio. |
| `hubspot-meeting` | 2 | HubSpot | Scheduling. Requiere mapping a HubSpot y fallback UX. |
| `slides` | 2 | Elementor Pro | Hero/sliders. Validar performance antes de usar. |
| `html` | 2 | Elementor | Riesgo alto. Usar solo con ownership claro y review. |
| `eael-sticky-video` | 1 | Essential Addons | Caso puntual. |
| `lottie` | 1 | Elementor Pro | Motion liviano; validar reduced motion y peso. |

## Templates y fuentes reutilizables

El sitio tiene 67 elementos en `elementor_library`. Estos son los mas relevantes para landings:

| ID | Estado | Slug | Titulo | Tipo |
| ---: | --- | --- | --- | --- |
| 249072 | publish | `loop-marketing-2` | Loop Marketing | page |
| 249025 | publish | `loop-marketing` | Loop Marketing | page |
| 4539 | publish | `main` | MAIN | page |
| 245749 | publish | `bloque-webinar` | bloque-webinar | container |
| 245745 | publish | `bloque-banner` | bloque-banner | container |
| 4495 | publish | `landing-2024` | Landing 2024 | page |
| 2895 | publish | `landing_new` | landing_new | page |
| 245517 | publish | `showcase` | showcase | section |
| 243729 | publish | `inbound-landing1` | inbound-landing1 | page |
| 19915 / 19916 | publish | `section-cta*` | SECTION CTA | section |
| 19914 | publish | `section-parallax` | SECTION PARALLAX | section |
| 216298 | publish | `inner-contact-v6` | Inner: Contact V6 | section |
| varios | publish | `inner-testimonial-*` | Inner: Testimonial | section/page |
| varios | publish | `inner-carousel-*` | Inner: Carousel | section |
| varios | publish | `inner-horizontal-accordion-*` | Inner: Horizontal Accordion | section |
| varios | publish | `inner-vertical-slide-*` | Inner: Vertical Slide | section |

Advertencias:

- Hay multiples `Default Kit` duplicados. No usarlos como source of truth sin identificar el active kit (`elementor_active_kit=7` observado).
- Hay plantillas antiguas y duplicadas. Antes de clonar una landing, identificar si el source esta publicado, borrador o duplicado.
- Las plantillas de Loop Marketing usan mas widgets core de Elementor (`heading`, `image`, `button`) que widgets Ohio.

## Paginas actuales que sirven como patrones

| Page ID | Estado | Slug | Titulo | Tamano data | Widgets principales |
| ---: | --- | --- | --- | ---: | --- |
| 2791 | publish | `home-2` | Home 2 | 416 KB | `image`, `ohio_heading`, `ohio_service_table`, `ohio_icon_box`, `text-editor` |
| 244079 | publish | `servicios-contratar-hubspot` | Empodera tu crecimiento con HubSpot + Efeonce | 134 KB | `spacer`, `ohio_heading`, `ohio_icon_box`, `ohio_service_table`, `text-editor` |
| 18456 | publish | `blog` | Blog | 109 KB aprox. | `ohio_heading`, `ohio_button`, `ohio_badge`, `ohio_recent_posts`, `lottie`, `ohio_contact_form` |
| 20729 | publish | `contacto` | Contacto | 9 KB aprox. | `ohio_heading`, `hubspot-form`, `ohio_contact_form` |
| 242601 | publish | `agencia-inbound-marketing` | Inbound Marketing | 111 KB | `spacer`, `ohio_heading`, `ohio_service_table`, `text-editor`, `image` |
| 242862 | publish | `servicio-gestion-campanas-publicitarias` | Gestion de Campanas Publicitarias | 141 KB | `spacer`, `ohio_heading`, `ohio_icon_box`, `text-editor`, `ohio_service_table` |
| 247526 | publish | `agencia-diseno-estrategico` | Soluciones de Diseno para Marketing | 131 KB | `spacer`, `ohio_heading`, `ohio_service_table`, `text-editor`, `image` |
| 248003 | publish | `partnership` | Landing Aliados | 152 KB | `spacer`, `ohio_heading`, `text-editor`, `ohio_icon_box`, `ohio_service_table` |
| 249770 | publish | `about-us-efeonce` | About us (Boceto) | 303 KB | `ohio_heading`, `ohio_badge`, `text-editor`, `spacer`, `ohio_icon_box` |

## Modulos disponibles por tipo de landing

| Necesidad | Widgets / settings preferidos | Notas |
| --- | --- | --- |
| Hero institucional | Elementor `container` o legacy `section`, `ohio_heading`, `ohio_button`, `image`/background, `ohio_video` | Usar controles de background/overlay y metas Ohio de page headline segun template. No tocar hero global. |
| CTA principal | `ohio_button`, `ohio_call_to_action`, `ohio_banner` | Corregir estados hover desde widget settings si existe; CSS solo page-scoped. |
| Beneficios/cards | `ohio_service_table`, `ohio_icon_box`, `ohio_counter` | Son los bloques mas maduros del sitio. Usar `layout=boxed` + `content_width` para respirar. |
| Prueba social | `ohio_clients_logo`, `ohio_testimonial`, `ohio_recent_projects`, `ohio_counter` | Para portfolios, preferir `ohio_recent_projects` por CPT Ohio Portfolio. |
| Pricing/paquetes | `ohio_pricing_table`, `ohio_pricing_list` | Poco usados. Requieren QA antes de landing comercial nueva. |
| FAQs | `ohio_accordion`, `ohio_tabs`; `eael-adv-accordion` solo si el caso exige features extra | Evitar mezclar EAEL y Ohio sin razon. |
| Formularios | `hubspot-form` para CRM; `ohio_contact_form`/CF7 si hay legado | Greenhouse bridge debe conocer form IDs, portal HubSpot, UTM y ownership. |
| Meetings | `hubspot-meeting` | Usar para agenda directa; validar fallback si HubSpot falla. |
| Blog/recursos | `ohio_recent_posts` | Controlar categoria, orden, descripcion, reading time y paginacion. |
| Portfolio/casos | `ohio_recent_projects` | Controlar categoria, layout, filter, pagination, lightbox/video. |
| Motion puntual | `ohio_dynamic_text`, `ohio_carousel`, `ohio_marquee`, `lottie` | Validar performance, reduced motion y mobile. `ohio_marquee` no esta usado actualmente. |
| Mapas/contacto | `ohio_google_maps`, `hubspot-form`, `ohio_contact_form` | Google Maps depende de configuracion/API; no asumir. |

## Gaps para futuras landings Greenhouse-owned

1. **No hay catalogo canonico de plantillas Greenhouse-owned.** Existen templates y duplicados, pero falta registry con owner, estado, uso recomendado y dependencia de plugins.
2. **Exceso de `spacer`.** El sitio depende mucho de spacer widgets. Greenhouse debe preferir padding/gap nativo en `container`/`section`.
3. **Mezcla legacy + modern containers.** El bridge debe soportar `container`, `section`, `column` y `widget`; no asumir Elementor moderno.
4. **Faltan anchors semanticos en la mayoria de landings.** El modulo HubSpot partner proof ya tiene clases `gh-*`; hay que extender ese patron a landings owned.
5. **No hay schema de patch por widget.** Debe existir un catalogo machine-readable de widgets permitidos, controles admitidos y validadores por tipo.
6. **No hay contrato de HubSpot attribution.** Forms/meetings deben mapear portal, form ID, meeting URL, UTMs, campaña, source y lifecycle event.
7. **No hay QA visual repetible del Public Site.** Necesitamos smoke Playwright/GVC-equivalente para rutas publicas y screenshots antes/despues.
8. **Kinsta API token pendiente.** Sin token no hay cache clear/backups automatizados desde Greenhouse.
9. **Usuario tecnico demasiado amplio.** `Greenhouse INTEGRATION` sigue como `administrator`; reducir privilegios antes de writes productivos.
10. **Elementor library tiene duplicados.** Limpiar o al menos marcar templates canonicas antes de que agentes clonen fuentes equivocadas.
11. **Widgets poco usados requieren prueba.** `ohio_marquee`, `ohio_vertical_slider`, `ohio_instagram`, `ohio_simple_products`, pricing y Woo no deben usarse en nuevas landings sin smoke previo.
12. **UiChemy esta inactivo.** No prometer Figma -> Elementor automatico basado en ese plugin sin activacion/discovery.
13. **Faltan widgets Greenhouse-owned.** Cuando Ohio/Elementor no cubran un patron reusable con controles seguros, el camino recomendado es crear widgets custom en plugin propio versionado en el repo runtime, no tocar Ohio parent ni acumular CSS page-scoped. Estrategia: [Custom Elementor Widgets y React](./wordpress-custom-widgets-react-strategy.md).

## Contrato recomendado para el bridge

El bridge Greenhouse -> WordPress debe operar sobre capacidades, no sobre CSS suelto:

1. `inspect-elementor-document`: devuelve arbol resumido, widgets, templates, metas Ohio, hashes y warnings.
2. `inspect-ohio-widget-catalog`: devuelve widgets Ohio permitidos, controles y defaults conocidos.
3. `validate-elementor-patch`: valida operaciones contra `element.id`, `elType`, `widgetType`, fingerprint y controles permitidos.
4. `duplicate-elementor-document`: crea draft/private antes de modificar publicados.
5. `patch-elementor-document`: solo draft/private Greenhouse-owned en V1, guardando con `Document::save()`.
6. `inspect-template-library`: expone templates candidatas con owner/estado.
7. `render-preview-and-smoke`: renderiza preview, mide layout y captura evidencia visual.

No publicar, borrar, limpiar cache Kinsta ni tocar paginas publicadas desde el bridge hasta que existan audit log, rollback y cache control.

## Extension strategy: widgets custom y React

Ohio Extra cubre muchos patrones visuales, pero no todos los contratos operativos que Greenhouse necesita. Si un modulo sera reusable, requiere props/analytics/HubSpot/manifest versionado, o se vuelve fragil como combinacion de widgets sueltos, usar un **widget custom de Elementor en plugin propio** dentro de `efeoncepro/efeonce-public-site-runtime`.

No copiar internals privados de Ohio Extra ni editar el parent theme. El widget debe extender `\Elementor\Widget_Base`, registrarse en categoria `Greenhouse`, renderizar en PHP, encolar assets solo cuando se usa, exponer controles nativos de Elementor y emitir anchors `gh-*`.

React queda reservado para carriles WordPress-native: admin/editor con `@wordpress/element`, bloques Gutenberg y frontend acotado con Interactivity API. No usar React como parche para layout Ohio/Elementor ni como SPA publica sin ADR.

## Reglas anti-regresion

- Preferir controles nativos: `layout=boxed`, `content_width`, padding, gap, background, page meta Ohio.
- No escribir `_elementor_data` crudo como camino normal; usar `Document::save()`.
- No usar `path` del arbol como identificador durable; usar `element.id` + `elType` + `widgetType` + fingerprint.
- No usar settings `eael_*` como senales de negocio; Essential Addons inyecta muchos controles globales.
- No tocar theme parent `ohio`; los cambios persistentes van en `ohio-child` o en metas/settings respaldadas.
- No mezclar fixes de home hero, footer, sidebar y landing si el incidente es de una seccion.
- No declarar resuelto un problema visual sin captura o medicion comparando contra el sintoma reportado.
