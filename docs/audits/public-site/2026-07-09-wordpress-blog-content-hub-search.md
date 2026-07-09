# Public Site WordPress Blog, Taxonomy and Search Audit - 2026-07-09

> **Tipo:** auditoria tecnica y operativa read-only
> **Fecha:** 2026-07-09
> **Sitio:** `https://efeoncepro.com`
> **Runtime:** WordPress/Kinsta, active theme `ohio-child`, parent `ohio` 3.7.0
> **Objetivo:** entender como el sitio publico maneja blog, entradas, taxonomias,
> categorias, estilos Ohio, paginas/archivos y busqueda antes del refresh del
> content hub.

## Evidencia Ejecutada

- `pnpm public-website:discover -- --authenticated --wpcli --write`
  - Reporte: `docs/operations/discovery-public-website-wordpress-20260709.md`
- `pnpm public-website:content-factory:inspect -- --write`
  - Mapa: `docs/operations/public-site-content-factory-catalogs/content-intelligence-map-2026-07-09T13-17-44-170Z.json`
- WP-CLI read-only via wrapper:
  - `tmp/public-site-blog-search-audit.php`
  - `tmp/public-site-ohio-template-snippets.php`
  - `tmp/public-site-ohio-blog-options.php`
  - `tmp/public-site-blog-sidebar-widgets.php`
- HTTP smoke read-only:
  - `https://efeoncepro.com/glitch/`
  - `https://efeoncepro.com/?s=hubspot`
  - `https://efeoncepro.com/search/hubspot/`

No se mutaron posts, paginas, opciones, cache, tema, plugins ni Kinsta.

## Resumen Ejecutivo

El blog actual vive en WordPress nativo como `post` + Gutenberg. No existe una
pagina de entradas asignada en `Settings > Reading` (`page_for_posts=0`), asi que
el sitio no tiene un hub blog canónico tipo `/blog/` controlado por WordPress.
Las superficies de lectura visibles son archivos de categoria/tag, entradas
individuales y resultados de busqueda.

Los permalinks de entradas usan `/%category%/%postname%/`. Esto vuelve a la
categoria parte del URL canónico de cada post. En un refresh del content hub,
cambiar categoria principal o jerarquia puede cambiar URLs, canonicales e
internal links. Cualquier retaxonomizacion debe planificar redirects o congelar
slugs canonicos antes de publicar.

Ohio renderiza categorias/archivos con `index.php`, busqueda con `search.php` y
singles con `single.php`. El child theme solo sobreescribe headline/footer y
CSS global de soporte, no el loop de blog. Las cards, paginacion, sidebar,
related posts y search page vienen del parent Ohio y de opciones ACF `global_*`.

La busqueda activa es WordPress search nativa. Busca por `post_title`,
`post_excerpt` y `post_content`, y por defecto incluye `post`, `page`,
`attachment`, `e-landing-page`, `e-floating-buttons` y `ohio_portfolio`. Los
resultados mezclan articulos, landings, paginas draft-like publicadas y portfolio.
Yoast marca la search page como `noindex, follow`, lo correcto para evitar
indexar combinaciones infinitas, pero no resuelve la calidad UX del motor.

## Inventario de Contenido

Conteos observados por WP-CLI:

| Tipo | Conteo |
| --- | ---: |
| Posts publicados | 54 |
| Posts draft | 5 |
| Posts privados | 2 |
| Posts trash | 2 |
| Paginas publicadas | 47 |

Posts recientes reales:

| Post | Categoria | Observacion |
| --- | --- | --- |
| `251314` Platform Properties para Search Console | `glitch` | Gutenberg, TOC Yoast, imagen destacada, Yoast title/metadesc |
| `251068` GLITCH #14 | `glitch` | Usa `efeoncepro/glitch-drop` |
| `250390` Glitch #13 | `glitch` | Usa `efeoncepro/glitch-drop`; sin Yoast title custom |
| `249764` Creative supply chain | `creative` | Sin imagen destacada |
| `249768` Surround Discovery | `loop-marketing/aeo` + `inbound/seo` | Multiples categorias afectan URL/canonical |
| `249056` Express en Loop Marketing | `loop-marketing` | Post largo, TOC Yoast |

Tambien siguen publicados posts demo heredados de Ohio/ThemeForest, por ejemplo:

- `5 Weird Habits that Make You Irresistibly More Magnetic.`
- `Street Style and Soulmates: Living Your Best Life.`
- `How a Vision Board Could Completely Changed My Life.`

Estos posts arrastran categorias/tags demo (`goal-setting`, `life-lessons`,
`podcasts`, `data-science`, `machine-learning`, `programming`, `technology`) y
contaminan archivos, tag cloud, busqueda interna y senales editoriales.

## Taxonomias y Categorias

Taxonomias publicas registradas:

| Taxonomia | Objeto | Jerarquica | REST |
| --- | --- | --- | --- |
| `category` | `post` | si | `categories` |
| `post_tag` | `post` | no | `tags` |
| `post_format` | `post` | no | no |
| `ohio_portfolio_category` | `ohio_portfolio` | no | no |
| `ohio_portfolio_tags` | `ohio_portfolio` | no | no |

Categorias con contenido:

| Categoria | Slug | Count | Parent | URL |
| --- | --- | ---: | --- | --- |
| HubSpot | `hubspot` | 10 | root | `/category/hubspot/` |
| Inbound | `inbound` | 10 | root | `/category/inbound/` |
| Design | `design` | 6 | root | `/category/design/` |
| Glitch | `glitch` | 5 | root | `/category/glitch/` |
| Loop Marketing | `loop-marketing` | 5 | root | `/category/loop-marketing/` |
| Social | `social` | 5 | root | `/category/social/` |
| Marketing Digital | `marketing-digital` | 4 | root | `/category/marketing-digital/` |
| AEO | `aeo` | 3 | `loop-marketing` | `/category/loop-marketing/aeo/` |
| SEO | `seo` | 2 | `inbound` | `/category/inbound/seo/` |
| CRM | `crm` | 2 | `hubspot` | `/category/hubspot/crm/` |

Categorias vacias o deuda visible:

- `Uncategorized` existe como default category, count `0`.
- `Humanidad aumentada` existe bajo `loop-marketing`, count `0`.
- Categorias demo como `Food`, `Science`, `Goal Setting`, `Life Lessons`,
  `Podcasts`, `Design`, `Tech` siguen publicadas o visibles por archivos.

Tags principales:

- `Blog` count 20.
- `Programming`, `Data Science`, `Machine Learning`, `Technology` count 17 cada
  uno, todos claramente demo/deuda.
- Duplicados o variantes: `AI`/`ai`, `Marketing Digital`/`marketing`,
  `how to`/`how-to`, `diseño web`/`diseno-web`.
- Typos: `inboun`, `produc-market-fit`.

Conclusion: las categorias pueden convertirse en la taxonomia editorial primaria
del content hub, pero hoy mezclan lineas reales con residuos demo. Los tags no
estan listos para actuar como navegacion publica; antes hay que deduplicar,
normalizar idioma, retirar tags demo y decidir si se usan como facetas internas,
clusters SEO o solo soporte editorial.

## Permalinks, Archivos y Canonicales

Configuracion observada:

- `show_on_front=page`
- Home page: post/page `2791`, slug `home-2`, URL `/`
- `page_for_posts=0`
- `permalink_structure=/%category%/%postname%/`
- `posts_per_page=10`
- Ohio global blog posts per page: `16`

El smoke HTTP de `https://efeoncepro.com/glitch/` devuelve 200 y canonicaliza a
`https://efeoncepro.com/category/glitch/`. Esto sugiere una regla/redirect o
canonicalizacion que permite usar `/glitch/` como acceso corto, pero la URL
canonical real sigue siendo el archivo de categoria WordPress.

Yoast indexa archivos de categoria: `/glitch/` reporto `index, follow` y
canonical `/category/glitch/`.

Implicacion para refresh:

- Definir una URL canónica del hub editorial antes de mover contenido.
- Si el destino futuro es Think/Astro, mantener una sola URL canónica por pieza.
- Si se mantiene WP, decidir si se crea una pagina `/blog/` o `/think/` con
  query/editorial navigation propia, en vez de depender solo de archivos de
  categoria.
- No cambiar categorias principales de posts publicados sin mapa de redirects.

## Estilos y Render de Ohio

### Opciones efectivas de blog

| Opcion Ohio | Valor observado |
| --- | --- |
| Layout item | `blog_grid_1` |
| Columns | `3-2-1` |
| Image size | `medium_large` |
| Hover | `none` |
| Tilt effect | on |
| Masonry | on |
| Equal height | on |
| Boxed card style | on |
| Author visible | on |
| Category visible | on |
| Excerpt visible | on |
| Read more visible | on |
| Reading time visible | on |
| Date visible | on |
| Pagination | standard, default, left |
| Single post layout | `type_1` |
| Related posts | on, amount `2` |
| Author widget | on |
| Previous/next | on |
| Comments | on |
| Search header | fixed desktop, mobile off |
| Sidebar | left, `ohio-sidebar-blog` |

### Template ownership

| Surface | Template owner |
| --- | --- |
| Category/tag/date/home archive | Parent Ohio `index.php` |
| Search results | Parent Ohio `search.php` |
| Single post | Parent Ohio `single.php` |
| Cards | Parent Ohio `parts/blog_grid/layout_type1..7.php` |
| Single layouts | Parent Ohio `parts/blog/layout_type1.php`, `layout_type2.php` |
| Headline | Child override `ohio-child/parts/elements/page_headline.php` |
| Footer | Child override `ohio-child/parts/elements/footer.php` |
| Support CSS | Child `assets/css/global-fixes.css`, `growth-forms-host.css`, home CSS |

### How Ohio renders archive cards

`index.php` and `search.php` parse each result with
`OhioObjectParser::parse_to_post_object()` and push data through
`OhioHelper::set_storage_item_data()`. The selected `blog_grid_*` layout renders:

- featured image/video/audio/gallery if present;
- date and reading estimate;
- title and excerpt/preview;
- category tags linking to `get_category_link()`;
- `Read More`;
- author overlay if enabled;
- masonry/grid wrappers and optional AOS animation.

This means article card quality depends heavily on:

- featured image presence;
- excerpt/preview quality;
- clean category selection;
- title length;
- Ohio options, not Content Factory alone.

### Single post

`single.php` delegates to `parts/blog/layout_type1.php` or `layout_type2.php`.
After content, Ohio renders:

- author widget;
- previous/next post nav;
- related posts;
- comments if enabled.

Related posts use both `tag__in` and `category__in` from the current post. Dirty
tags therefore pollute related posts, not only archives.

## Sidebar Actual

`ohio-sidebar-blog` is active and appears on archives/search/singles because
global sidebar position is left.

Widgets actuales:

| Widget | Contenido |
| --- | --- |
| `block-35` | Promo banner externo a `clbthemes.com/wordpress-customization/` con imagen demo Ohio |
| `block-36` | `Staff Picks` con `wp:latest-posts` |
| `block-37` | `Recent Comments` |
| `block-38` | `Recommended Topics` con tag cloud |
| `block-39` | `wp:search` con boton `Search` |

Riesgo: este sidebar todavia comunica Ohio/demo y mezcla ingles/espanol. Para un
refresh serio del content hub, el sidebar debe redisenarse o desactivarse hasta
tener un sistema editorial real: navegacion de clusters, newsletter Glitch,
CTA al grader, posts destacados curados y busqueda con copy Efeonce.

## Busqueda

### Formas de acceso

- Header global: icon button `search-global fixed`, `aria-label="Search"`.
- Popup de busqueda: `parts/elements/search_form.php`, usa `get_search_form()`
  cuando `page_header_search_type=simple`.
- Sidebar: bloque Gutenberg `wp:search`, label screen-reader `Buscar`, boton
  visible `Search`.
- URLs soportadas:
  - `/?s=hubspot`
  - `/search/hubspot/`

### Query real

La busqueda nativa consulta `post_title`, `post_excerpt` y `post_content` con
`LIKE`. Ordena primero por title match, luego por `post_date DESC`.

Tipos incluidos por defecto:

- `post`
- `page`
- `attachment`
- `e-landing-page`
- `e-floating-buttons`
- `ohio_portfolio`

Ejemplos observados:

| Query | Found | Hallazgo |
| --- | ---: | --- |
| `hubspot` | 48 | Mezcla posts, paginas y landings. Incluye `Empodera tu crecimiento... (Borrador)` y pagina de Redes Sociales. |
| `ia` | 111 | Mezcla paginas de servicio, posts y `ohio_portfolio`. |
| `marketing` posts-only | 32 | Si se restringe a `post`, la calidad mejora para exploracion editorial. |

### Render de resultados

`search.php` renderiza:

- headline `Results for: <span>{query}</span>` desde child `page_headline.php`;
- breadcrumbs;
- sidebar izquierdo;
- `archive-holder search-page ohio-masonry`;
- portfolio results con layout de portfolio si `post_type=ohio_portfolio`;
- todo lo demas con cards `blog_grid_*`.

Yoast devuelve `noindex, follow` en search results. Esto protege indexacion, pero
la UX sigue siendo demasiado amplia para un content hub.

## Plugins Relevantes

| Plugin | Estado | Rol |
| --- | --- | --- |
| Yoast SEO + Premium | active | Titles/metadesc, TOC block, robots/canonical |
| Elementor/Elementor Pro | active | Landings y widgets, no posts editoriales principales |
| `efeonce-editorial-blocks` | active | Bloque `efeoncepro/glitch-drop` para POV editorial de Glitch |
| `greenhouse-wp-bridge` | active | Inspeccion read-only/draft foundation |
| `eo-vibe-coding-api` | active | Builder/control plane para landings; tiene scaffold `blog-hub` pero no hub productivo |
| `eo-headless-content` | inactive | CPT `landing` y futuro headless, no operando el blog live |
| Google Site Kit | active | Medicion Google |
| Jetpack | active | Comentarios/forms/auxiliares; no es motor editorial principal |

`eo-vibe-coding-api` reconoce `blog-hub-ohio-efeonce-v1` y un preset
`blog-hub-magazine`, pero el comentario del runtime dice que es scaffold y debe
reemplazarse con recent-posts/editorial navigation widgets en un pase posterior.
No debe tratarse como content hub listo.

## Lectura SEO/AEO Para Content Hub

El estado actual es suficiente para publicar articulos gobernados, pero no para
un content hub robusto:

- El contenido real nuevo ya usa Gutenberg y puede recibir TOC Yoast, headings
  anclados y el bloque `glitch-drop`.
- La taxonomia publica no distingue claramente entre serie editorial, cluster
  SEO, capability comercial, formato y demo content.
- Los archivos indexables de categoria estan disponibles, pero sin descripciones
  editoriales ni arquitectura de pilares/clusters.
- La busqueda interna existe, pero no esta curada para content discovery:
  mezcla paginas comerciales y portfolios con posts.
- El sidebar y tag cloud amplifican deuda demo.

## Recomendaciones Priorizadas

1. **Definir la taxonomia editorial canonica antes de mover contenido.** Separar
   `series`/secciones editoriales (`Glitch`, `Marketing con Manzanitas`), clusters
   SEO (`AEO`, `SEO`, `HubSpot/CRM`, `Social`, `Creative`, `Growth`) y tags
   secundarios. WordPress no trae una taxonomia custom para esto hoy; si se usa
   solo `category`, documentar jerarquia y congelar slugs.
2. **Crear o decidir el hub canónico.** Si sigue en WP, crear una pagina/hub
   controlado (`/blog/`, `/think/` o equivalente) con navegacion editorial y
   query curada. Si se mueve a Think/Astro, mantener canonicales limpios y usar
   WP como source/editorial backend hasta cutover.
3. **Limpiar demo content antes de indexar mas archivos.** Retirar o noindexar
   posts/categorias/tags demo; vaciar sidebar demo; corregir labels mixtos.
4. **Restringir busqueda del content hub a `post` y taxonomias editoriales.**
   Mantener busqueda global del sitio si se quiere, pero el hub necesita una
   busqueda editorial que no mezcle landings, portfolios ni attachments.
5. **Fortalecer cards y singles.** Exigir imagen destacada o fallback visual,
   excerpt curado, primary category, Yoast title/metadesc y TOC poblado para
   posts largos.
6. **Medir como adquisicion top-of-funnel.** Conectar busquedas internas, clicks
   a tags/categorias, CTA a newsletter/grader y lectura de posts con GA4/GTM y
   HubSpot/Greenhouse cuando se ejecute el refresh.

## No Hacer

- No cambiar categorias principales de posts publicados sin mapa de URL y
  redirects.
- No tratar tags actuales como navegacion publica sin limpieza.
- No asumir que `/glitch/` es el canonical solo porque responde 200; el canonical
  observado apunta a `/category/glitch/`.
- No usar `eo-vibe-coding-api` `blog-hub` scaffold como producto final.
- No limpiar sidebar/demo posts durante una publicacion puntual de articulo; es
  un trabajo de content hub.
- No indexar busqueda interna; Yoast `noindex, follow` debe mantenerse salvo una
  decision SEO explicita.

## Follow-ups Sugeridos

- Crear un PDR o TASK para la taxonomia editorial del content hub.
- Crear un TASK para limpiar demo posts/categorias/tags/sidebar.
- Crear un TASK para buscador editorial curado (`post` only + categorias/series).
- Crear un TASK para hub WP o cutover Think/Astro, segun decision de runtime.
