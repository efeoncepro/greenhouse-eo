# WordPress Blog, Content Hub and Search Contract

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.1
> **Creado:** 2026-07-09 por Codex
> **Ultima actualizacion:** 2026-07-09 por Codex
> **Modulo:** Public Site / WordPress / Ohio / Content Hub
> **Runtime vigente:** `efeoncepro.com` en WordPress/Kinsta, tema activo
> `ohio-child`, parent `ohio`
> **Auditoria base:** `docs/audits/public-site/2026-07-09-wordpress-blog-content-hub-search.md`

## Para Que Sirve

Este documento fija como funciona hoy el blog publico de Efeonce en WordPress y
que contratos deben respetarse al refrescar el content hub: entradas, Gutenberg,
categorias, tags, archivos, estilos Ohio, busqueda interna y resultados.

No reemplaza los PDR del sitio publico ni el futuro rail Astro/Think. Es el mapa
operativo del runtime WordPress vivo mientras `efeoncepro.com` siga sirviendo el
blog y las landings desde Kinsta.

## Modelo Vigente

| Capa | Estado actual |
| --- | --- |
| Source editorial | WordPress `post` |
| Editor de posts | Gutenberg/block-first |
| Landings | Elementor/Ohio, separadas de posts |
| Theme render | `ohio-child` + parent `ohio` |
| SEO plugin | Yoast SEO/Premium |
| Search | WordPress search nativa |
| Content Factory | Genera/valida drafts; no publica por defecto |
| Headless/Think | Direccion estrategica, no source of truth del blog WP actual |

Regla principal: posts y landings son carriles separados. Un articulo editorial
se arma en Gutenberg; una landing comercial usa Elementor/Ohio o un widget
custom gobernado.

## URLs y Canonicales

Configuracion actual:

- Home publica es una pagina (`show_on_front=page`).
- No hay pagina de posts asignada (`page_for_posts=0`).
- Permalinks de posts: `/%category%/%postname%/`.
- Archivos de categoria usan base WordPress `/category/<slug>/`.
- Algunos accesos cortos como `/glitch/` responden, pero el canonical observado
  para Glitch apunta a `/category/glitch/`.

Implicacion: la categoria puede formar parte del URL publicado. Antes de
retaxonomizar contenido, decidir si el slug actual se conserva, si se redirige o
si se movemos el articulo a una URL canonica nueva.

## Taxonomia Editorial

WordPress expone estas taxonomias relevantes:

- `category`: jerarquica, aplicada a `post`, visible por REST como `categories`.
- `post_tag`: no jerarquica, aplicada a `post`, visible por REST como `tags`.
- `post_format`: formato del post.
- `ohio_portfolio_category` y `ohio_portfolio_tags`: solo para portfolio Ohio.

Categorias reales que pueden sostener el content hub:

- `glitch`
- `loop-marketing`
- `loop-marketing/aeo`
- `inbound/seo`
- `hubspot`
- `hubspot/crm`
- `social`
- `creative`
- `growth`
- `tendencias`

Deuda a limpiar antes de usar taxonomias como navegacion publica:

- categorias demo o ambiguas: `goal-setting`, `life-lessons`, `podcasts`,
  `food`, `science`, `tech`, `design` cuando no tenga ownership editorial;
- `Uncategorized` como default category;
- tags demo de Ohio: `programming`, `data-science`, `machine-learning`,
  `technology`, `theme`, `wordpress`;
- duplicados/variantes: `AI`/`ai`, `Marketing Digital`/`marketing`,
  `how to`/`how-to`;
- typos: `inboun`, `produc-market-fit`.

Contrato recomendado para el refresh:

- Usar `category` como taxonomia editorial primaria solo si se define una
  jerarquia canonica y slugs estables.
- Usar `post_tag` como faceta secundaria o cluster interno, no como navegacion
  publica hasta limpiar deuda.
- Si se necesita separar serie editorial, tema SEO y formato, evaluar una
  taxonomia custom futura en vez de sobrecargar categorias.

## Render Ohio

Ohio es dueño del render de archivos, busqueda y single posts:

| Superficie | Template |
| --- | --- |
| Categorias/tags/archivos | parent `ohio/index.php` |
| Resultados de busqueda | parent `ohio/search.php` |
| Single post | parent `ohio/single.php` |
| Cards | parent `ohio/parts/blog_grid/layout_type*.php` |
| Single layouts | parent `ohio/parts/blog/layout_type*.php` |
| Headline visual | child `ohio-child/parts/elements/page_headline.php` |
| Footer | child `ohio-child/parts/elements/footer.php` |

Opciones efectivas observadas:

- Card layout `blog_grid_1`.
- Grid `3-2-1`.
- Masonry on.
- Cards boxed/equal height on.
- Sidebar blog izquierdo on.
- Fecha, categoria, excerpt, read more, reading time y autor visibles.
- Single post layout `type_1`.
- Related posts on, 2 posts.
- Search global fijo en desktop; mobile search header off.

Las cards se alimentan de `OhioObjectParser::parse_to_post_object()` y renderizan
imagen destacada, titulo, preview/excerpt, fecha, reading time, categorias y
CTA `Read More`.

## Requisitos de Calidad Para Posts

Antes de publicar o refrescar un post que formara parte del content hub:

- Debe ser Gutenberg/block-first.
- El titulo WordPress es el H1; `post_content` no debe incluir H1.
- Posts largos deben incluir `yoast-seo/table-of-contents` poblado con anchors.
- Headings H2/H3 deben estar anclados con `id="h-{slug}"`.
- Debe tener categoria canonica revisada.
- Debe tener excerpt o preview curado.
- Debe tener Yoast title/metadesc, salvo decision editorial explicita.
- Debe tener imagen destacada o una decision de fallback visual.
- Debe evitar `core/freeform` nuevo; si aparece, tratarlo como deuda legacy.
- Para Glitch, usar `efeoncepro/glitch-drop` cuando corresponda a POV editorial.

## Busqueda Actual

La busqueda viva usa WordPress search:

- Campos: `post_title`, `post_excerpt`, `post_content`.
- Matching: SQL `LIKE`.
- Orden: match en titulo primero, luego fecha descendente.
- URLs: `/?s=query` y `/search/query/`.
- Robots: Yoast sirve search results como `noindex, follow`.

Por defecto, search incluye tipos publicos como:

- `post`
- `page`
- `attachment`
- `e-landing-page`
- `e-floating-buttons`
- `ohio_portfolio`

Esto hace que una busqueda editorial mezcle posts con landings, paginas de
servicio, adjuntos y portfolio. Para el refresh del content hub, la busqueda del
hub debe ser distinta de la busqueda global del sitio:

- Content hub search: restringida a `post` y taxonomias editoriales.
- Global site search: puede mezclar paginas comerciales si el objetivo es
  navegacion general.

Mantener `noindex, follow` en resultados de busqueda salvo PDR/SEO task que
demuestre lo contrario.

## Sidebar y Navegacion Editorial

El sidebar actual `ohio-sidebar-blog` tiene:

- banner demo Ohio externo;
- `Staff Picks` con latest posts;
- `Recent Comments`;
- tag cloud;
- search block con boton `Search`.

No es apto como experiencia final del content hub. Opciones recomendadas:

- Reemplazar por navegacion editorial curada: series, clusters, posts destacados
  y CTA a newsletter/grader.
- O desactivar sidebar en el hub y usar una pagina/hub full-width con filtros
  propios.
- No dejar tag cloud publico hasta limpiar tags.

## Layout Candidato: Demo 35 Blog Magazine

El operador eligio `Demo 35: Blog Magazine` (`page_id=225984`,
`/homedemo35-elementor/`) como referencia visual para la futura pagina principal
del blog/content hub. La auditoria dedicada vive en
`docs/audits/public-site/2026-07-09-demo35-blog-magazine-layout-review.md`.

Contrato funcional:

- Es una pagina Elementor/Ohio publicada, no el archivo nativo de entradas ni
  una `page_for_posts`.
- Su estructura es buena como layout magazine: hero editorial, bloque `Top
  Headlines`, rails `75/25`, banners de categorias, features full-bleed,
  `Staff Picks`/`Don't Miss It` y cierre de suscripcion.
- El arbol observado tiene 113 nodos: 55 containers, 58 widgets y 15
  instancias de `ohio_recent_posts`.
- Los `ohio_recent_posts` estan mayoritariamente curados por IDs fijos. Antes de
  usarlo como hub, cada widget debe decidir explicitamente si sera curado manual,
  query dinamica por categoria/serie o bloque eliminado.
- La pagina renderizo sin overflow horizontal en desktop `1440` ni mobile
  `390`, pero mobile supera 13k px de scroll y debe priorizar secciones.

Deudas que impiden usarla como hub final sin trabajo:

- posts demo Ohio/ThemeForest como contenido principal;
- algunos widgets de posts referencian attachments y quedan vacios;
- CTAs `See More` usan `href="#"` y `target="_blank"`;
- features `Read More` enlazan a `ohio.clbthemes.com`;
- banners de categorias apuntan a `/demo35/category/...`, rutas que dan `404`;
- el bloque de suscripcion renderiza Contact Form 7 `Subscribe Form 1`
  (`wpcf7` ID `242255`), con HubSpot mapping desactivado y mensajes en ingles.

Regla para el refresh: usar `Demo 35` como referencia de layout, no como
contenido final. Si se adopta, hacerlo sobre copia/draft gobernada, reemplazar
IDs demo/attachments, corregir enlaces, conectar suscripcion a un contrato
medible y validar desktop/mobile con `scrollWidth == clientWidth`.

## Relacion Con Think

Segun `docs/public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md`,
Think es el hub de contenido/demand gen y el blog forma parte de esa superficie,
aunque hoy el runtime este dividido entre WP y Astro.

Regla: cada pieza tiene una sola URL canonica. Si una pieza migra a Think/Astro,
WordPress debe redirigir o quedar como backend/source no indexable para esa pieza,
no duplicar contenido indexado.

## Flujo Seguro de Refresh

1. Ejecutar discovery read-only:
   `pnpm public-website:discover -- --authenticated --wpcli --write`.
2. Inspeccionar el post:
   `pnpm public-website:content-factory:inspect-post-deep -- --post-id <id> --write`.
3. Revisar categoria, tags, URL actual, Yoast, featured image, excerpt y block
   outline.
4. Generar refresh/patch plan local.
5. Si se requiere WordPress write, crear draft/private clone o post `private`
   gobernado. No mutar published source directo.
6. Revisar en WP Admin y publicar manualmente si aplica.
7. Verificar archivo/categoria/search si la taxonomia cambio.

## Riesgos Principales

- Cambiar categoria cambia URL por estructura permalink.
- Tags demo contaminan related posts y tag cloud.
- Search actual devuelve paginas comerciales y portfolios, no solo contenido.
- Sidebar actual expone material demo y copy mixto.
- Posts demo siguen publicados y pueden aparecer en busqueda/archivos.
- `eo-vibe-coding-api` tiene scaffold de `blog-hub`, pero no es hub final.

## Documentacion Relacionada

- `docs/audits/public-site/2026-07-09-wordpress-blog-content-hub-search.md`
- `docs/audits/public-site/2026-07-09-demo35-blog-magazine-layout-review.md`
- `docs/documentation/public-site/gutenberg-post-authoring-recipes.md`
- `docs/documentation/public-site/public-site-content-factory-end-to-end.md`
- `docs/documentation/public-site/glitch-drop-gutenberg-block.md`
- `docs/manual-de-uso/public-site/operar-wordpress-blog-content-hub-search.md`
- `docs/public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md`
