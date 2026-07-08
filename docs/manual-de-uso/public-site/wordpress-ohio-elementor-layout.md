# Operar Layout Ohio + Elementor en el Public Site

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-06-14 por Codex
> **Ultima actualizacion:** 2026-07-08 por Codex
> **Modulo:** Public Site
> **Sitio:** `https://efeoncepro.com`
> **Pagina de referencia:** `/blog` (`page_id=18456`)
> **Documentacion relacionada:** [Public Site WordPress — Layout Ohio + Elementor](../../documentation/public-site/wordpress-ohio-elementor-layout.md)

## Para que sirve

Este runbook explica como diagnosticar, corregir y revertir problemas de contenedor/ancho en el sitio publico Efeonce cuando Ohio y Elementor dejan lineas laterales, desfases o regresiones en el sidebar fijo.

## Antes de empezar

Necesitas acceso SSH al sitio Kinsta y WP-CLI. El patron validado localmente es:

```bash
gtimeout 30s ssh -i /Users/jreye/.ssh/greenhouse_efeonce_kinsta_ed25519 \
  -o BatchMode=yes \
  -o IdentitiesOnly=yes \
  -o StrictHostKeyChecking=accept-new \
  -o ConnectTimeout=10 \
  -p 64805 efeoncegroup@161.153.204.166 \
  'cd /www/efeoncegroup_752/public && wp --info'
```

No pegues ni imprimas secretos en logs. La Application Password de WordPress debe vivir en Secret Manager o en el mecanismo seguro definido por Greenhouse; no debe quedar en comandos ni documentacion.

## Guardrail antes de guardar documentos Elementor

Si vas a usar `Document::save()` sobre una pagina Ohio publicada, no asumas que el cambio queda limitado al widget o seccion tocada. Primero protege las metas externas a Elementor.

Checklist obligatorio para paginas con headline Ohio:

```bash
wp post meta get <PAGE_ID> _thumbnail_id
wp post meta get <PAGE_ID> page_header_title_background_type
```

Si `page_header_title_background_type=featured`, el hero depende de `_thumbnail_id`. Despues del `Document::save()`, repite la lectura. Si `_thumbnail_id` cambio o quedo vacio sin que eso fuera parte del cambio, restaura la imagen destacada inmediatamente:

```bash
wp post meta update <PAGE_ID> _thumbnail_id <ATTACHMENT_ID>
# o desde PHP/WP-CLI:
set_post_thumbnail(<PAGE_ID>, <ATTACHMENT_ID>)
```

Luego verifica en navegador:

```js
getComputedStyle(document.querySelector('.page-headline .bg-image')).backgroundImage
window.elementorFrontendConfig?.post?.featuredImage
```

Caso fuente: en `/agencia-creativa/` (`page_id=249582`), la imagen destacada estaba activa antes del cambio del widget `greenhouse_comparison_table`, pero un guardado Elementor dejo `_thumbnail_id` vacio. El valor correcto restaurado fue `attachment_id=249672` (`EO_Landing-GiroAgencia.webp`). El asset de OpenGraph `249740` era parecido, pero incorrecto para el hero porque trae logo/texto integrado.

## Escoger la variante de header Ohio

Antes de cambiar colores del header, identifica que variante aplica. No lo
resuelvas con CSS global sobre `#masthead`.

| Caso | Usar | Metas/clases clave |
| --- | --- | --- |
| Hero oscuro/navy en primer viewport | `header-3` overlay oscuro | body `with-header-3`, `#masthead.header-3`, primera seccion `clb__dark_section`, `page_header_logo_style=light_variant`, `page_header_menu_style=inherit`, `page_header_menu_style_settings=custom`, `page_header_menu_text_typo={"color":"rgba(255,255,255,0.75)"}` como string JSON. |
| Hero claro/blanco en primer viewport | `header-3` claro/inherit | body `with-header-3`, `page_header_logo_style=inherit`, `page_header_menu_style=inherit`, `page_header_menu_style_settings=inherit`, sin `page_header_menu_text_typo` y sin `clb__dark_section`. |
| Rail lateral fijo | `with-header-sidebar` | body `with-header-sidebar`, `#masthead.header-sidebar`; fixes solo page-scoped si `.light-typo` lava el rail. |
| Hero/headline nativo de Ohio | Page headline `featured` | `.page-headline`, `page_header_title_background_type=featured`, `_thumbnail_id` protegido. |

Para el caso oscuro, valida first paint/no-JS. Si el menu carga oscuro y luego
se pone blanco, la variante/meta no esta bien aunque el estado final parezca
correcto. Incidente fuente: `/agencia-creativa-v2/` tenia
`page_header_menu_text_typo` como array PHP; se corrigio guardandolo como string
JSON exacto y se verifico en
`.captures/task1350-header-first-paint-2026-07-07T09-11-03-691Z/`.

Comando de inspeccion recomendado:

```bash
pnpm public-website:wpcli -- --eval-file ./tmp/<inspect-header>.php --wp-user 12
```

El inspector debe listar: `_wp_page_template`, `page_header_logo_style`,
`page_header_menu_style`, `page_header_menu_style_settings`,
`page_header_menu_text_typo`, `page_header_title_visibility`,
`page_breadcrumbs_visibility`, `page_add_wrapper`, `page_add_top_padding`,
`page_full_width_margins_size`, clases del `body`, clase de `#masthead` y
clases del primer contenedor Elementor.

## Diagnostico rapido

1. Verifica que la pagina afectada use Ohio con sidebar:

```bash
wp post list --post_type=page --name=blog --fields=ID,post_title,post_name,post_status
wp post meta get 18456 page_full_width_margins_size
```

2. Inspecciona el gutter efectivo del theme en navegador:

```js
getComputedStyle(document.documentElement).getPropertyValue('--clb-grid-gutter')
```

3. Si el residuo lateral equivale a la diferencia entre `page_full_width_margins_size` y `--clb-grid-gutter`, corrige el meta de pagina en vez de mover footer/sidebar global.

## Pattern: sticky editorial lane

Para landings con una columna editorial corta que debe acompanar una columna
larga (formulario, pasos o cards), usar primero el patron nativo de Ohio:
`-sticky-block`.

Contrato operativo:

- aplicar `-sticky-block` a la lane/columna completa, no a un inner pequeno;
- dar a la lane altura de viewport y centrar el contenido interno;
- mantener ancestros `overflow:visible`;
- hacer la lane estatica en mobile;
- verificar que acompana el scroll medio y se suelta al llegar al final del
  shell/form.

El sticky de este patron no es Elementor Pro Sticky ni `motion_fx`. Es
`position:sticky` servido por Ohio. Si no funciona, revisar primero si algun
ancestro creo un scroll container accidental (`overflow-y:auto|scroll`,
`overflow:hidden`, `transform` o `contain`). Caso fuente: en la landing SEO
`/servicios/posicionamiento-seo/`, `<main class="gh-seo-landing site-content">`
heredaba `overflow-y:auto` y rompia el sticky; el fix fue remover
`site-content` del wrapper de la landing y dejar una guarda page-scoped de
`overflow:visible`.

Referencia larga: [Patron reutilizable: sticky editorial lane](../../documentation/public-site/wordpress-ohio-elementor-layout.md#patron-reutilizable-sticky-editorial-lane).

## Producir assets AI para placeholders de landing

Usa este flujo cuando el operador pida poblar un placeholder visual de una
landing publica, por ejemplo `Reel`, `Historia`, `Carrusel`, `Post`, `UGC` o un
hero. No publiques assets sueltos sin mapearlos al contrato del widget.

1. Identifica el contrato del placeholder:
   - URL y `postId`;
   - widget/slot;
   - `data-image-slot`, `data-media-kind` o selector estable;
   - altura/crop real en desktop y mobile;
   - si el contenedor ya tiene motion.

2. Decide imagen vs video:
   - si el bloque ya se mueve o muestra muchos slots simultaneos, preferir WebP
     premium como cover/frame;
   - si el asset es foco hero, generar video con WebM/MP4/poster y verificar
     autoplay/muted/loop/playsInline;
   - no usar multiples videos simultaneos como default por peso y decodificacion.

3. Produce fuentes en `ai-generations/` con README y batch prompts:

```bash
gtimeout 1200s pnpm ai:image \
  --batch ai-generations/<run>/portrait-batch.json \
  --out-dir ai-generations/<run> \
  --size 1024x1536 \
  --quality high \
  --model gpt-image-2 \
  --timeout 420000
```

4. Revisa como sistema, no pieza aislada:
   - contact sheet;
   - ausencia de logos/textos falsos;
   - coherencia de campana;
   - legibilidad bajo pills/overlays;
   - crops en mobile.

5. Convierte a WebP con `cwebp`:

```bash
cwebp -quiet -q 82 -m 6 -resize 800 0 source.png -o output.webp
```

No asumir que `ffmpeg` local trae `libwebp`; en la sesion de Redes Sociales
2026-07-08 no lo traia. `sips` tampoco escribio WebP.

6. Integra en el runtime:
   - preferir un registry en PHP/JS por slot con fallback;
   - mantener labels, pills, `aria-label` y estructura original;
   - agregar `object-fit/object-position` por slot;
   - agregar reduced-motion si hay hover zoom/parallax.

7. Deploy scoped:
   - backup remoto antes de subir;
   - subir solo widget/CSS/assets necesarios;
   - correr `php -l` remoto si hay PHP;
   - reset OPcache/cache y purge Kinsta.

8. Verifica:
   - Playwright desktop `1440` y mobile `390`;
   - `scrollWidth == clientWidth`;
   - assets directos `200 image/webp`;
   - conteo de assets esperado en DOM;
   - si la captura larga mobile muestra blanks pero los assets reportan
     `complete=true`, hacer probe slot-by-slot con scroll/decode antes de
     diagnosticar falso fallo.

Caso fuente completo:
`docs/operations/public-site-social-wall-media-production-20260708.md`.

## Agregar una URL al menu principal

No agregar items al menu mientras solo se esta haciendo discovery. Cuando el
operador pida explicitamente agregar una URL, el camino seguro es:

1. Identificar el menu vivo y su ubicacion:

```bash
pnpm public-website:wpcli -- --eval-file ./tmp/<inspect-menu>.php --wp-user 12
```

El inspector debe leer `get_registered_nav_menus()`,
`get_nav_menu_locations()`, `wp_get_nav_menu_object(61)` y
`wp_get_nav_menu_items(61)`. Estado observado el 2026-07-08: location
`primary` -> menu term `61` (`Menu 1`), render desktop `#menu-primary` y
mobile `#mobile-menu`. Despues del update de Visibilidad/Produccion Creativa,
el menu tiene `count=25`: `Visibilidad` es el item `248628`, `Posicionamiento SEO`
es `251312`, `AEO` es `250691`, `Produccion Creativa` es `251313`,
`Diseno & Desarrollo Web` apunta al page `250816`, y `Redes Sociales` sigue en
`Servicios Destacados` (`248629`) como item `251311`.

2. Hacer snapshot de rollback antes de escribir. Guardar por lo menos:
   `term_id`, `name`, `slug`, location, todos los items con `ID`, `title`,
   `menu_order`, `menu_item_parent`, `type`, `object`, `object_id`, `url`,
   `target`, `classes`, `xfn`.

3. Para un link custom, usar API core desde WP-CLI wrapper, no SQL:

```php
$parent_item_id = 248629; // Servicios Destacados; elegir desde el snapshot.

wp_update_nav_menu_item(61, 0, [
    'menu-item-title' => 'Texto del menu',
    'menu-item-url' => 'https://efeoncepro.com/ruta/',
    'menu-item-type' => 'custom',
    'menu-item-status' => 'publish',
    'menu-item-parent-id' => $parent_item_id,
]);
```

El equivalente WP-CLI oficial, si se usa de forma directa en el servidor, es:

```bash
PARENT_ITEM_ID=248629
wp menu item add-custom 61 "Texto del menu" "https://efeoncepro.com/ruta/" --parent-id="$PARENT_ITEM_ID"
```

Para enlazar una pagina WordPress existente, preferir un item `post_type` con
`object=page` y `object_id=<PAGE_ID>` para que la URL siga el permalink del
objeto; no duplicar una URL manual si el destino es una pagina del sitio.
Antes de insertar, comparar contra los items existentes por texto normalizado,
URL/permalink, `object_id` y parent para evitar duplicados dentro del dropdown.
En el wrapper de este repo, usar scripts `--eval-file`; no asumir que comandos
WP-CLI crudos como `wp option get` o `wp post get` pasan intactos por
`pnpm public-website:wpcli`.

Ejemplo para pagina WordPress:

```php
$page_id = 251300;
$parent_item_id = 248629; // Servicios Destacados; elegir desde el snapshot.

wp_update_nav_menu_item(61, 0, [
    'menu-item-title' => 'Redes Sociales',
    'menu-item-type' => 'post_type',
    'menu-item-object' => 'page',
    'menu-item-object-id' => $page_id,
    'menu-item-status' => 'publish',
    'menu-item-parent-id' => $parent_item_id,
]);
```

4. Purgar y verificar:

```bash
wp kinsta cache purge --all
```

No llamar `clean_nav_menu_cache()` desde scripts `--eval-file`; no es una
funcion publica segura en este runtime. `wp_update_nav_menu_item()` hace la
invalidacion core y el cierre operativo es purge de Kinsta/cache flush +
verificacion visual/DOM.

En navegador, revisar desktop y mobile:

```js
[...document.querySelectorAll('#menu-primary a')].map(a => [a.textContent.trim(), a.href])
[...document.querySelectorAll('#mobile-menu a')].map(a => [a.textContent.trim(), a.href])
```

5. Revisar que el nuevo item no rompa dropdowns, overflow, jerarquia visual ni
tracking del header. Si el item entra bajo `Soluciones`, usar el parent
confirmado `242525`; si entra bajo `Servicios Destacados`, usar `248629`; si
entra bajo otra seccion, descubrir el parent en el snapshot antes de escribir.

Ruta manual equivalente: `wp-admin/nav-menus.php` -> seleccionar `Menu 1`
asignado a `Primary` -> `Custom Links` -> URL + texto -> ubicar jerarquia ->
guardar. Para agentes, usar este camino solo como referencia del modelo; el
camino gobernado es WP-CLI/API con snapshot y verificacion.

## Fix aplicado el 2026-06-14

### `/blog`

Para `/blog`, el gutter efectivo era `16px` y el meta estaba en `20px`. Se corrigio asi:

```bash
wp post meta update 18456 page_full_width_margins_size 16px
wp cache flush
```

Luego se agrego un override page-scoped en:

```text
wp-content/themes/ohio-child/assets/css/global-fixes.css
```

El override protege el sidebar fijo cuando Ohio agrega `.light-typo` sobre secciones oscuras:

```css
body.page-id-18456.with-header-sidebar:not(.dark-scheme) #masthead.header-sidebar .header-dynamic-typo.light-typo .hamburger,
body.page-id-18456.with-header-sidebar:not(.dark-scheme) #masthead.header-sidebar .header-dynamic-typo.light-typo .hamburger-outer,
body.page-id-18456.with-header-sidebar:not(.dark-scheme) #masthead.header-sidebar .header-dynamic-typo.light-typo .branding,
body.page-id-18456.with-header-sidebar:not(.dark-scheme) #masthead.header-sidebar .header-dynamic-typo.light-typo .icon-button:not(.-overlay-button):not(.-small) {
  color: #161519 !important;
}

body.page-id-18456.with-header-sidebar:not(.dark-scheme) #masthead.header-sidebar .hamburger.icon-button {
  background-color: rgba(136, 135, 137, 0.08) !important;
  color: #161519 !important;
}

body.page-id-18456.with-header-sidebar:not(.dark-scheme) #masthead.header-sidebar .header-dynamic-typo.light-typo .branding:not(.text-logo) .logo {
  opacity: 1 !important;
}

body.page-id-18456.with-header-sidebar:not(.dark-scheme) #masthead.header-sidebar .header-dynamic-typo.light-typo .branding:not(.text-logo) .logo-dynamic .light,
body.page-id-18456.with-header-sidebar:not(.dark-scheme) #masthead.header-sidebar .header-dynamic-typo.light-typo .branding:not(.text-logo) .logo-dynamic .dark {
  opacity: 0 !important;
}
```

### `/contacto`

Para `/contacto`, la discontinuidad venia de dos piezas del theme fuera de Elementor: breadcrumbs y `bottom-offset`. La correccion final fue apagar esos dos comportamientos solo para esa pagina:

```bash
wp post meta update 20729 page_breadcrumbs_visibility 0
wp post meta update 20729 page_add_top_padding 0
wp cache flush
```

Backup previo:

```text
wp-content/themes/ohio-child/assets/css/contacto-page-meta-backup-202606140-bg-continuity.json
```

## Verificacion esperada

En `/blog`:

- El pre-footer y footer deben empezar alineados con el canvas principal, sin linea residual entre sidebar y contenido.
- El menu hamburguesa debe verse como en la parte superior de la pagina: icono oscuro sobre circulo claro.
- El logo vertical de Efeonce debe mantenerse azul/oscuro sobre el rail blanco.
- Al llegar al pre-footer/footer oscuro, el sidebar no debe cambiar a blanco ni perder contraste.

Cuando uses navegador automatizado, valida tambien el caso forzando `.light-typo`:

```js
document
  .querySelector('#masthead.header-sidebar .header-dynamic-typo')
  ?.classList.add('light-typo')
```

Valores esperados:

- hamburger `color`: `rgb(22, 21, 25)`;
- hamburger `background-color`: `rgba(136, 135, 137, 0.08)`;
- logo base `opacity`: `1`;
- logo dinamico `.light` / `.dark` `opacity`: `0`.

En `/contacto`:

- no debe existir `breadcrumb-holder` ni `.breadcrumb`;
- no debe existir `.page-container.bottom-offset`;
- la seccion Elementor debe empezar justo despues del hero;
- el footer debe empezar justo despues de la seccion Elementor, sin franja blanca intermedia;
- hero y footer no deben cambiar su propio estilo.

## Rollback

Para volver el meta de `/blog` al valor anterior:

```bash
wp post meta update 18456 page_full_width_margins_size 20px
wp cache flush
```

Para revertir el CSS al backup previo:

```bash
cp wp-content/themes/ohio-child/assets/css/global-fixes.css.bak-20260614020413-before-blog-sidebar-header-fix \
  wp-content/themes/ohio-child/assets/css/global-fixes.css
wp cache flush
```

Para revertir `/contacto` a los valores previos:

```bash
wp post meta update 20729 page_breadcrumbs_visibility inherit
wp post meta update 20729 page_add_top_padding inherit
wp cache flush
```

Backups disponibles en el runtime:

```text
wp-content/themes/ohio-child/assets/css/blog-page-meta-backup-20260614015717.txt
wp-content/themes/ohio-child/assets/css/global-fixes.css.bak-20260614020413-before-blog-sidebar-header-fix
wp-content/themes/ohio-child/assets/css/contacto-page-meta-backup-202606140-bg-continuity.json
```

## Que no hacer

- No cambiar `#masthead` globalmente para resolver una pagina.
- No tocar el theme parent `ohio`.
- No corregir una linea lateral agregando fondos absolutos que cubran el rail.
- No mezclar fixes del home/hero con fixes del blog.
- No hacer publish/draft/deploy de landings desde Greenhouse hasta que EPIC-019 tenga flujo formal de preview, audit, cache y rollback.
- No introducir una SPA React dentro de WordPress como solucion rapida para landings; si hace falta React en WordPress, usar Gutenberg/admin tooling o Interactivity API con bloques/templates gobernados.
- No asumir compatibilidad React 19 hasta probar el plugin/theme activo en staging: WordPress revirtio temporalmente ese upgrade en Gutenberg 23.3.2.

## Problemas comunes

Si la linea lateral vuelve a aparecer, compara primero el meta `page_full_width_margins_size` con `--clb-grid-gutter`.

Si el logo o hamburguesa cambian de color solo sobre secciones oscuras, revisa si Ohio agrego `.light-typo` y confirma que el override page-scoped siga cargando despues del CSS del theme.

Si el cambio no se ve, limpia cache con WP-CLI y Kinsta segun corresponda; no repitas el mismo cambio con selectores mas globales.

Si `/contacto` vuelve a mostrar una franja entre hero y contenido, revisa primero `page_breadcrumbs_visibility`. Si vuelve a aparecer un espacio antes del footer, revisa `page_add_top_padding`.

## Aprendizaje de la sesion 2026-06-14

No basta con igualar colores si el corte visual nace de una estructura del theme. En `/contacto`, el primer intento fue poner `#content.site-content` con el mismo gris de la seccion Elementor; el navegador confirmaba el color, pero la pagina seguia viendose cortada porque Ohio todavia renderizaba `breadcrumb-holder` y `bottom-offset`.

Secuencia correcta para futuros casos:

1. Identifica si la franja viene de Elementor o de Ohio con `elementFromPoint`, bounding boxes y metas WP.
2. Si la franja es un nodo/offset del theme, cambia primero el meta/setting de Ohio.
3. Si la franja es solo color/background de una seccion ya correcta, entonces usa CSS page-scoped.
4. Verifica con captura visual real, no solo con `getComputedStyle`.
5. Si el usuario dice "se ve igual", trata eso como evidencia primaria y revisa el enfoque, no aumentes especificidad CSS a ciegas.
