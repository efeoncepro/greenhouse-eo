# Public Site Demo 35 Blog Magazine Layout Review - 2026-07-09

> **Tipo:** auditoria tecnica y operativa read-only
> **Fecha:** 2026-07-09
> **Sitio:** `https://efeoncepro.com`
> **Objeto revisado:** `Demo 35: Blog Magazine` (`page_id=225984`,
> slug `homedemo35-elementor`)
> **URL:** `https://efeoncepro.com/homedemo35-elementor/`
> **Runtime:** WordPress/Kinsta, theme activo `ohio-child`, parent `ohio`,
> Elementor/Ohio widgets
> **Objetivo:** evaluar el layout elegido como base visual para la pagina
> principal del futuro blog/content hub, entender sus widgets y dejar un mapa
> operativo para cambios posteriores.

## Evidencia Ejecutada

- `pnpm public-website:wpcli -- --eval-file ./tmp/public-site-find-demo25.php --wp-user 12`
  - Confirmo el candidato real como `Demo 35: Blog Magazine`, no `Demo 25`.
- `pnpm public-website:bridge-inspect -- --page-id 225984 --no-catalog`
  - Inspeccion read-only del documento Elementor/bridge.
- `pnpm public-website:wpcli -- --eval-file ./tmp/public-site-inspect-demo35.php --wp-user 12`
  - Arbol Elementor compacto, metas Ohio y settings relevantes.
- `pnpm public-website:wpcli -- --eval-file ./tmp/public-site-demo35-widget-map.php --wp-user 12`
  - Mapa de secciones, rutas, IDs y settings de widgets.
- `pnpm public-website:wpcli -- --eval-file ./tmp/public-site-demo35-content-map.php --wp-user 12`
  - Resolucion de posts/forms referenciados por widgets.
- `node tmp/public-site-demo35-render-summary.mjs`
  - Smoke browser Playwright read-only en desktop `1440x1100` y mobile `390x900`.

No se mutaron paginas, posts, opciones, `_elementor_data`, formularios, cache,
Kinsta ni archivos runtime.

## Resumen Ejecutivo

`Demo 35: Blog Magazine` es una pagina publicada de WordPress construida con
Elementor y widgets Ohio. No es el archivo nativo del blog ni una pagina de
posts asignada por WordPress. Su valor esta en el layout editorial tipo
magazine: hero, rails 75/25, secciones de headlines, banners de categorias,
features full-bleed, bloques de picks y cierre de suscripcion.

El layout es una buena base visual para la home del blog/content hub, pero no
esta listo para usarse como pagina principal sin limpieza. Arrastra contenido,
enlaces y assets demo de Ohio: CTAs externos a `ohio.clbthemes.com`, banners de
categoria con rutas `/demo35/category/...` que dan `404`, botones `See More`
con `href="#"`, widgets de posts vacios por IDs de attachments y un footer/area
de recursos con links de Colabrio/ThemeForest/Figma.

La pagina renderiza sin overflow horizontal en desktop ni mobile. La deuda
principal no es de layout base, sino de wiring editorial: que contenido alimenta
cada `ohio_recent_posts`, a donde navegan los CTAs, que taxonomia usara cada
seccion y como se conectara la suscripcion a HubSpot/Greenhouse.

## Identidad del Documento

| Campo | Valor |
| --- | --- |
| ID | `225984` |
| Titulo | `Demo 35: Blog Magazine` |
| Slug | `homedemo35-elementor` |
| Tipo | `page` |
| Estado | `publish` |
| URL | `https://efeoncepro.com/homedemo35-elementor/` |
| Editor | Elementor builder |
| Template | `default` |
| Elementor template type | `wp-page` |
| Ultima modificacion GMT | `2025-03-07 08:04:40` |

Metas Ohio relevantes:

- `_wp_page_template=default`
- `_elementor_edit_mode=builder`
- `_elementor_template_type=wp-page`
- `page_header_title_visibility=0`
- `page_add_top_padding=0`
- header/menu/logo heredan opciones globales (`inherit`)

## Inventario Elementor

El bridge reporto:

| Tipo | Conteo |
| --- | ---: |
| Nodos totales | 113 |
| Containers | 55 |
| Widgets | 58 |
| Legacy sections | 0 |

Widgets por tipo:

| Widget | Conteo | Rol |
| --- | ---: | --- |
| `ohio_recent_posts` | 15 | Cards/listas editoriales por post IDs o fallback query |
| `ohio_heading` | 14 | Titulos de seccion y feature headings |
| `divider` | 10 | Separadores editoriales bajo headings |
| `ohio_button` | 8 | CTAs internos/externos |
| `ohio_banner` | 4 | Tiles visuales de categorias |
| `text-editor` | 4 | Bajadas/descripcion |
| `ohio_badge` | 2 | Etiquetas de features |
| `ohio_contact_form` | 1 | Suscripcion |

No hay bloques Gutenberg productivos: el contenido de `post_content` aparece
como `core/freeform` porque Elementor gobierna el documento.

## Arquitectura de Layout

### Seccion 0 - Hero editorial

Path raiz `0`, container `f4e20e4`, layout row.

- `0.0.0` `ohio_heading#f10dd3b`: H1 `Stories, inspiration, and advice.`
  con subtitulo `Catch up on trending topics`.
- `0.0.1` `text-editor#04f7e84`: bajada editorial.
- `0.0.2` `ohio_button#a4bf131`: `Explore Articles`, link
  `#top_headlines`.
- `0.1.0` `ohio_recent_posts#abd5d75`: hero post destacado,
  `blog_grid_2`, `card_effect=scale`, clase `_double_post`, post fijo
  `226618`.

Comportamiento observado:

- El H1 es unico y correcto a nivel semantico.
- El CTA `Explore Articles` apunta a `#top_headlines`; el anchor existe.
- El post destacado es contenido demo publicado y debe reemplazarse por un
  articulo/feature real del hub.

### Seccion 1 - Top Headlines + rail derecho

Path raiz `1`, container `6c7ed5e`, layout row `75/25`.

Columna principal `1.0`:

- Heading `Top Headlines`.
- Boton `See More` con `href="#"` y `target="_blank"`.
- `ohio_recent_posts#1757589`: `blog_grid_2`, metro, 3 posts por fila,
  posts fijos `224093`, `226368`, `226369`.
- `ohio_recent_posts#e711472`: metro, 3 posts por fila, posts fijos `17954`,
  `224084`, `224094`.

Rail `1.1`:

- Heading `Promo`.
- `ohio_recent_posts#6890894`, `#ae9c70c`, `#c9979a1`: cards verticales
  de 1 post cada una.

Comportamiento observado:

- Desktop mantiene un magazine grid estable.
- Mobile apila el rail despues del bloque principal.
- Los `See More` son visuales pero no funcionales.

### Seccion 2 - Feature full-bleed NASA

Path raiz `2`, container `b800f9b`, `content_width=full`,
background image:

```text
https://colabrio.ams3.cdn.digitaloceanspaces.com/ohio-stage-demo-25/mcdj4rJg-oh__demo35__02.webp
```

Widgets:

- Heading `Featured`.
- Badge `Science`.
- Heading `Beyond Earth: NASA's Vision for Human Exploration.`
- Text editor.
- `Read More` link externo:
  `https://ohio.clbthemes.com/demo35/beyond-earth-nasas-vision-for-human-exploration/`

Comportamiento observado:

- Buen patron de feature editorial full-bleed.
- El CTA sale del sitio y debe reemplazarse por post/feature propio.

### Seccion 3 - Popular Categories + In Brief + Staff Picks

Path raiz `3`, container `51f2ec7`.

`Popular Categories`:

- `ohio_banner#6d2ded3`: `Tech`, link `/demo35/category/tech/`.
- `ohio_banner#01608b5`: `Podcasts`, link `/demo35/category/podcasts/`.
- `ohio_banner#7a644d0`: `Social`, link `/demo35/category/social/`.
- `ohio_banner#871ea73`: `Careers`, link `/demo35/category/careers/`.

Los cuatro banners usan background images externos de
`ohio-stage-demo-25`, `block_type_layout=inner`, `equal_height=yes`,
`card_effect=scale`, overlay oscuro y `show_button=yes`.

`In Brief`:

- Layout `75/25`.
- `ohio_recent_posts#bec16ae`, `#b238727`, `#cb38ece` en columna principal.
- `ohio_recent_posts#e9ec236` en rail derecho.

`Staff Picks`:

- `ohio_recent_posts#39ce29e` como bloque grande.
- `ohio_recent_posts#3bd665e` como lista/caja con `blog_grid_6`,
  `use_boxed_layout=yes`, `show_short_description=yes`.

Comportamiento observado:

- Las rutas `/demo35/category/...` no existen en `efeoncepro.com`; ejemplo
  verificado: `/demo35/category/tech/` devuelve `404`.
- La ruta real de categoria seria `/category/<slug>/`, siempre que la
  taxonomia exista y sea editorialmente valida.
- Hay widgets vacios por IDs no post:
  - `bec16ae` referencia attachment `226408`.
  - `cb38ece` referencia attachment `226411`.
  - `39ce29e` referencia attachment `226414`.
  - otros attachments similares aparecen como deuda demo.

### Seccion 4 - Feature full-bleed Goal Setting

Path raiz `4`, container `59f0fbb`, `content_width=full`,
background image:

```text
https://colabrio.ams3.cdn.digitaloceanspaces.com/ohio-stage-demo-25/oh__demo35__29.webp
```

Widgets:

- Heading `Featured`.
- Badge `Goal Setting`.
- Heading `5 Weird Habits that Make You Irresistibly More Magnetic.`
- Text editor.
- `Read More` link externo:
  `https://ohio.clbthemes.com/demo35/5-weird-habits-that-make-you-irresistibly-more-magnetic/`

Comportamiento observado:

- Misma estructura reutilizable de feature.
- Deuda: copy y link son demo, categoria no pertenece a la taxonomia Efeonce
  actual.

### Seccion 5 - Don't Miss It + rail promo

Path raiz `5`, layout row `75/25`.

Columna principal:

- Heading `Don't Miss It`.
- `See More` con `href="#"`.
- `ohio_recent_posts#0e874e4`: `blog_grid_2`, metro, 3 posts,
  posts fijos `224092`, `224095`, `226433`.

Rail:

- Heading `Promo`.
- `ohio_recent_posts#0042dab`: aparece con un post real reciente de Glitch
  (`Platform Properties para Search Console...`) porque no tiene `posts`
  fijos en los settings inspeccionados y cae a query/fallback.
- `ohio_recent_posts#d5477e5`: referencia attachment `226411` y queda vacio
  o casi vacio.

Comportamiento observado:

- Este bloque demuestra que algunos widgets sin posts fijos pueden tomar
  contenido real reciente, pero no conviene depender de fallback implicito.
- El rail mezcla contenido real con deuda demo; debe normalizarse.

### Seccion 6 - Suscripcion

Path raiz `6`, container `449646c`, `content_width=full`,
`background_color=#D4CBA8`, clase `clb__dark_mode_light`.

Widgets:

- `ohio_heading#16f078d`: `Subscribe to add some style to your inbox.`
- `text-editor#81e40ed`.
- `ohio_contact_form#7740c26`: setting Elementor `form=5`.

Render real:

- El bloque visible renderiza Contact Form 7 `Subscribe Form 1` (`wpcf7`
  ID `242255`), no un formulario productivo Greenhouse.
- Campos:
  - email obligatorio `your-email`, placeholder `Email`;
  - submit `Subscribirme`;
  - checkbox obligatorio `checkbox-101[]` con consentimiento en espanol;
  - honeypot Akismet/CF7.
- `hbcf7_enable=no`; el mapeo HubSpot esta desactivado.
- Mensajes CF7 siguen en ingles (`Thank you for your message...`, etc.).

Implicacion:

- Para content hub productivo, este bloque debe conectarse a Growth Forms,
  HubSpot o un contrato gobernado de newsletter/Glitch, no quedar como CF7
  demo aislado.

## Contenido Referenciado

Los widgets `ohio_recent_posts` usan en su mayoria IDs fijos. Posts reales/demo
referenciados:

| ID | Tipo | Estado | Titulo | Observacion |
| ---: | --- | --- | --- | --- |
| `226618` | `post` | publish | `Street Style and Soulmates: Living Your Best Life.` | Demo |
| `224093` | `post` | publish | `Beyond the Edge: Driving the Future.` | Demo |
| `226368` | `post` | publish | `How a Vision Board Could Completely Changed My Life.` | Demo |
| `226369` | `post` | publish | `Al Fresco Bliss: the Perfect Indoor-Outdoor Flow.` | Demo |
| `17954` | `post` | publish | `Creativo Jovenes: a Lead Designer's UI/UX Core Checklist.` | Legacy/demo-like |
| `224084` | `post` | publish | `Salad Perfection: Burrata with a Balsamic Drizzle.` | Demo |
| `224094` | `post` | publish | `Rock & Roll Inspired: the Architecture of MoPOP.` | Demo |
| `224095` | `post` | publish | `Sleek and Ready for Adventures: Modern EV Design.` | Demo |
| `224092` | `post` | publish | `Work-Life Balance: Remote Meetings from the Couch.` | Demo |
| `224083` | `post` | publish | `Savoring the Moment: the Spirit of Stillness.` | Demo |
| `226408` | `attachment` | inherit | `Brand=Google, Color Scheme=Dark` | No renderiza como post |
| `226411` | `attachment` | inherit | `Brand=Intel, Color Scheme=Light` | No renderiza como post |
| `226414` | `attachment` | inherit | `Brand=Lyft, Color Scheme=Dark` | No renderiza como post |
| `226446` | `attachment` | inherit | `Brand=Lyft, Color Scheme=Dark` | No renderiza como post |
| `226433` | `attachment` | inherit | `Brand=Tinder, Color Scheme=Light` | No renderiza como post |

Conclusion: para convertir esta pagina en blog principal, cada instancia de
`ohio_recent_posts` debe decidir explicitamente si es:

- curadoria manual por IDs fijos;
- query dinamica por categoria/serie;
- bloque de feature controlado por un custom widget/bridge;
- o bloque eliminado.

## Render y Comportamiento Observado

Playwright desktop `1440x1100`:

- HTTP `200`.
- `scrollWidth=1440`, `clientWidth=1440`; sin overflow horizontal.
- `scrollHeight=6737`.
- 15 widgets `ohio_recent_posts`; 11 visibles, 4 vacios.
- H1 unico: `Stories, inspiration, and advice.`
- H2 visibles: `Top Headlines`, `Promo`, `Featured`, `Popular Categories`,
  `In Brief`, `Staff Picks`, `Don't Miss It`, `Subscribe...`, mas headings
  demo.

Playwright mobile `390x900`:

- HTTP `200`.
- `scrollWidth=390`, `clientWidth=390`; sin overflow horizontal.
- `scrollHeight=13297`.
- El layout apila correctamente, pero se vuelve muy largo.
- Los mismos 4 widgets de posts quedan vacios o casi vacios.

Warnings:

- Solo se observo warning de WebGL/OpenGL por `ReadPixels`; no se observo
  error funcional de pagina.

## Navegacion y Enlaces

| Elemento | Estado | Accion requerida antes de usar como hub |
| --- | --- | --- |
| `Explore Articles` | Correcto, link a `#top_headlines` | Mantener o renombrar/canonizar anchor |
| `See More` | `href="#"`, `target="_blank"` | Reemplazar por categorias/series/hub search reales |
| `Read More` features | Link externo `ohio.clbthemes.com` | Reemplazar por posts propios |
| Banners categorias | `/demo35/category/...` -> 404 | Reemplazar por `/category/...` o rutas hub canonicas |
| Post cards | Links internos a posts/categorias actuales | Reemplazar demo posts/categorias |
| Search overlay global | Form WP nativo, fuera de viewport en captura | Mantener separado de search editorial del hub |
| Recursos/footer demo | Links Colabrio/Ticksy/ThemeForest/Figma | Limpiar en trabajo separado de footer/demo debt |

## Riesgos Para Adoptarlo Como Blog Principal

1. **No es una pagina de posts nativa.** Es una landing Elementor publicada; si
   se usa como home del blog, hay que decidir URL canonica y ownership entre
   WP archive, pagina Elementor y futuro Think/Astro.
2. **Curadoria por IDs fijos.** La pagina no se actualizara de forma editorial
   salvo que los widgets se configuren a queries o se mantengan manualmente.
3. **Contenido demo indexable.** Posts demo y categorias demo contaminan el
   layout, archivos, related posts y busqueda.
4. **Links rotos o externos.** Banners `/demo35/category/...` dan 404 y features
   sacan al usuario al demo de Ohio.
5. **Widgets vacios.** IDs de attachments producen cards de altura cero.
6. **Suscripcion no gobernada.** CF7 `Subscribe Form 1` no esta conectado a
   HubSpot/Greenhouse y tiene mensajes en ingles.
7. **Footer/recursos demo.** El render arrastra links de soporte/demo que no
   pertenecen al sitio final.
8. **Mobile largo.** No hay overflow, pero la composicion completa supera 13k px
   de scroll; conviene priorizar y/o condensar secciones para mobile.

## Recomendaciones Para El Refresh

1. Usar `Demo 35` como referencia de layout, no como contenido final.
2. Crear una copia/draft gobernada antes de mutar el documento publicado
   `225984`.
3. Definir la taxonomia editorial y el mapa de secciones antes de reemplazar
   posts:
   - hero feature;
   - top headlines;
   - series/categorias;
   - in brief;
   - staff picks;
   - don't miss;
   - newsletter/Glitch.
4. Reemplazar todos los IDs demo/attachments en `ohio_recent_posts`.
5. Decidir widget por widget si sera curado o dinamico; documentar el criterio.
6. Cambiar `See More` por rutas reales: categoria, serie, `/blog/`, `/think/`,
   search editorial o landing de newsletter.
7. Reemplazar banners `/demo35/category/...` por categorias canonicas o por
   pages/hub sections.
8. Reemplazar los CTAs `Read More` externos por posts Efeonce.
9. Sustituir el bloque CF7 por Growth Forms/HubSpot/Greenhouse newsletter si
   se espera captura medible.
10. Validar desktop/mobile con Playwright o GVC:
    - status 200;
    - `scrollWidth == clientWidth`;
    - widgets visibles;
    - enlaces internos sin 404;
    - consola limpia;
    - search/suscripcion segun contrato.

## No Hacer

- No convertir `Demo 35` en hub final cambiando solo copy del hero.
- No dejar `href="#"` ni `target="_blank"` en botones `See More`.
- No mantener rutas `/demo35/category/...`.
- No enlazar a `ohio.clbthemes.com` desde features finales.
- No usar attachments como `posts` de `ohio_recent_posts`.
- No cambiar categorias de posts publicados sin mapa de permalink/canonical.
- No asumir que el fallback dinamico de `ohio_recent_posts` es suficiente para
  curadoria editorial.
- No publicar la suscripcion CF7 como newsletter final sin revisar HubSpot,
  consentimiento, mensajes, idioma y medicion.

## Relacion Con La Auditoria General Del Blog

Esta auditoria complementa
`docs/audits/public-site/2026-07-09-wordpress-blog-content-hub-search.md`.
La auditoria general describe el blog WordPress nativo, taxonomias, search,
sidebar y render Ohio. Esta auditoria describe una pagina Elementor/Ohio
especifica que el operador eligio como base visual para la pagina principal del
blog.

La decision de producto sigue pendiente: usar esta pagina como hub WP, migrar el
hub a Think/Astro o mantenerla como layout intermedio. En todos los casos, una
pieza editorial debe tener una sola URL canonica.
