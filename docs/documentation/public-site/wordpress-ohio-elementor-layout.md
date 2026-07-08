# Public Site WordPress — Layout Ohio + Elementor

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.0
> **Creado:** 2026-06-14 por Codex
> **Ultima actualizacion:** 2026-07-08 por Codex
> **Dominio:** Public Site
> **Sitio:** `https://efeoncepro.com`
> **Runtime:** WordPress en Kinsta, theme `ohio-child` sobre `ohio`, Elementor / Elementor Pro
> **Manual relacionado:** [Operar layout Ohio + Elementor](../../manual-de-uso/public-site/wordpress-ohio-elementor-layout.md)
> **Inventario relacionado:** [Inventario Ohio + Elementor](./wordpress-ohio-elementor-widget-inventory.md)
> **Arquitectura relacionada:** [Public Website Landing Control Plane](../../architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md)

## Para que sirve

Este documento captura el contrato vigente para diagnosticar y corregir problemas de layout en el sitio publico de Efeonce cuando se combinan:

- WordPress como runtime publico.
- Theme Ohio con header/sidebar fijo.
- Elementor como builder de paginas y secciones full-width.
- Kinsta como hosting/cache.

El objetivo es evitar que Greenhouse o un agente corrija un sintoma visual del Public Site rompiendo el contrato del theme, el sidebar fijo, el hero del home o el footer global.

## Alcance

Aplica al sitio publico `efeoncepro.com` y, en particular, a los incidentes corregidos el 2026-06-14 en `/blog` y `/contacto`.

No define todavia el bridge productivo Greenhouse -> WordPress para landings. Ese contrato vive en EPIC-019 y su arquitectura. Este documento es memoria operacional del runtime WordPress actual.

## Contrato funcional vigente

En paginas con Ohio `with-header-sidebar`, el sitio reserva una franja lateral fija para el menu hamburguesa y el logo vertical. Esa franja no es parte del canvas de Elementor: debe mantenerse como rail blanco, con hamburguesa oscura y logo azul/oscuro cuando el sitio esta en esquema claro.

Las secciones Elementor full-width deben alinearse visualmente con el contenido principal, pre-footer y footer sin dejar lineas residuales entre el rail lateral y el contenido. El fix correcto debe respetar la reserva del sidebar de Ohio en vez de pintar por debajo de el.

El hero del home y sus fondos/motion no son parte de este contrato de `/blog`; cualquier cambio al hero debe tratarse como ajuste separado y validarse visualmente aparte.

## Playbook: variantes de header Ohio

Antes de tocar un header del Public Site, no partir desde el screenshot. Primero
identificar el tipo real que Ohio esta renderizando:

- clases del `body` (`with-header-*`, `with-header-sidebar`,
  `elementor-template-canvas`, `with-spacer`);
- existencia y clase de `#masthead` (`header-3`, `header-sidebar`, etc.);
- metas Ohio de la pagina (`page_header_*`, `page_add_*`,
  `page_breadcrumbs_visibility`);
- primera seccion/contenedor Elementor y sus clases de esquema
  (`clb__dark_section`, `clb__light_section`, `clb__dark_section_fixed`);
- color computado del menu/logo en first paint/no-JS y despues de JS.

### Matriz vigente

| Variante | Cuando aplica | Senales esperadas | No hacer |
| --- | --- | --- | --- |
| `header-3` overlay sobre hero oscuro | Home-like landings cuyo primer viewport es navy/oscuro: Home, `/aeo-2/`, `/desarrollo-sitios-web/`, candidata `/agencia-creativa-v2/`. | `_wp_page_template=default`, Elementor `page_layout=default`, body `with-header-3`, sin `elementor-template-canvas`, `#masthead.header-3` absoluto, primera seccion con `clb__dark_section`, `page_header_logo_style=light_variant`, `page_header_menu_style=inherit`, `page_header_menu_style_settings=custom`, `page_header_menu_text_typo` equivalente a menu claro. | No recolorear `#masthead` por CSS. No publicar header HTML del mockup. No asumir que `light-typo` basta si el first paint sale oscuro. |
| `header-3` sobre hero claro | Landings cuyo primer viewport es claro/blanco y deben mostrar logo azul + nav oscuro, como `/servicios/posicionamiento-seo/`. | `_wp_page_template=default`, body `with-header-3`, `#masthead.header-3` absoluto, `page_header_logo_style=inherit`, `page_header_menu_style=inherit`, `page_header_menu_style_settings=inherit`, sin override `page_header_menu_text_typo`, sin `clb__dark_section` en el hero claro. | No copiar el header oscuro de AEO/desarrollo solo por consistencia visual. No forzar `light_variant`, `light-typo` ni oscurecer el hero para resolver contraste. |
| `with-header-sidebar` | Paginas legacy/editoriales con rail lateral fijo, como `/blog`. | body con `with-header-sidebar` y un estilo `with-header-5/6/7`; `#masthead.header-sidebar`; rail visual independiente del canvas Elementor. | No parchear globalmente `.light-typo`, `#masthead` ni el logo. Si una seccion oscura lava el rail, el fix debe ser page-scoped y respetar que el rail puede seguir sobre fondo claro. |
| Page headline Ohio (`featured`) | Paginas que usan el headline/hero nativo de Ohio, no un hero Elementor puro. Ejemplos historicos: `/agencia-creativa/`, HubSpot services. | `.page-headline`, `page_header_title_background_type=featured`, `_thumbnail_id` con el asset real del fondo. | No buscar el fondo en widgets Elementor. No perder `_thumbnail_id` en `Document::save()`. No confundir OpenGraph/logo inline con background hero. |
| Elementor Canvas / header custom | Solo para casos explicitamente aprobados donde se quiere remover el theme chrome. | body `elementor-template-canvas`; ausencia de `#masthead`/footer Ohio. | No usarlo para landings que deben conservar header/footer Efeonce. Es una fuente comun de franjas blancas, header duplicado y perdida de widgets Ohio. |

### Trampa de serializacion del menu claro

En `header-3` sobre hero oscuro, el menu debe salir claro desde el primer
paint, antes de que Ohio JS agregue clases dinamicas como `light-typo`.
El estado final blanco no es suficiente.

El caso confirmado el 2026-07-07 en `/agencia-creativa-v2/`: la pagina tenia
`clb__dark_section`, `light_variant` y terminaba con menu blanco despues de JS,
pero el first paint/no-JS mostraba letras oscuras. La causa era
`page_header_menu_text_typo` guardado como array PHP. Al normalizarlo al mismo
formato first-paint seguro de AEO:

```text
page_header_menu_text_typo={"color":"rgba(255,255,255,0.75)"}
```

como string JSON, Ohio volvio a emitir el color claro inicial. Backup:
`_gh_backup_before_task1350_header_typo_meta_20260707T091025Z`.
Evidencia:
`.captures/task1350-header-first-paint-2026-07-07T09-11-03-691Z/`.

Regla: para una landing nueva con hero oscuro, copiar el contrato de AEO o de
`/agencia-creativa-v2/` ya verificado, no una mezcla de metas. Si
`get_post_meta()` devuelve un array por unserialize, no asumir que esta bien:
probar first paint/no-JS y revisar el CSS inicial emitido por Ohio.

### Checklist operativo antes de "arreglar" un header

1. Confirmar si el contenido necesita header oscuro o claro segun el fondo del
   primer viewport.
2. Verificar que la pagina no este en `elementor_canvas` si debe conservar el
   chrome Efeonce.
3. Comparar metas Ohio contra una pagina referencia del mismo tipo.
4. Confirmar que la primera seccion tiene la clase de esquema correcta.
5. Medir menu/logo en no-JS o bloqueando JS, y de nuevo despues de JS.
6. Ajustar separacion del hero con padding page/widget-scoped; no mover el
   masthead global.
7. Documentar backup, cache purge y captura desktop/mobile.

## Contrato: menu principal WordPress/Ohio

El sitio publico usa menu clasico de WordPress, no `wp_navigation` de block
theme. El theme activo `ohio-child` registra la ubicacion `primary`; en la
inspeccion del 2026-07-07 esa ubicacion apunta al termino `nav_menu` `61`
(`Menu 1`, slug `menu-1`, `count=23` tras agregar Redes Sociales). Ohio lo renderiza dos veces desde la
misma fuente: desktop en `nav#site-navigation ul#menu-primary` y mobile en
`ul#mobile-menu`.

En WordPress, una URL de menu no vive en el template del header. El modelo
clasico es:

- el menu es un termino de taxonomia `nav_menu`;
- cada item es un post `post_type=nav_menu_item`;
- la pertenencia item-menu es una relacion con el termino `nav_menu`;
- `post_title` es el label visible, `menu_order` define orden y
  `post_excerpt` guarda el title attribute;
- `_menu_item_menu_item_parent` define jerarquia;
- `_menu_item_type`, `_menu_item_object`, `_menu_item_object_id` definen si el
  item apunta a una pagina/post u objeto WordPress;
- `_menu_item_url` solo gobierna links custom (`_menu_item_type=custom`,
  `_menu_item_object=custom`). En items de pagina, la URL sale del permalink
  del objeto y `_menu_item_url` normalmente queda vacio.

Items confirmados como secciones custom de primer/segundo nivel:

| Label | Item ID | Parent | Tipo | URL |
| --- | ---: | ---: | --- | --- |
| Soluciones | `242525` | `0` | custom | `#` |
| Estrategia & Posicionamiento | `244255` | `242525` | custom | `#` |
| Experiencia Personalizada | `248605` | `242525` | custom | `#` |
| Crecimiento Multicanal | `248606` | `242525` | custom | `#` |
| Servicios Destacados | `248629` | `242525` | custom | `#` |
| Redes Sociales | `251311` | `248629` | post_type/page `251300` | `/servicios/redes-sociales/` |
| Recursos | `242524` | `0` | custom | `#` |

Ejemplo confirmado de item de pagina: `AEO (AI Engine Optimization)` es el
item `250691`, tipo `post_type`, objeto `page`, `object_id=250265`, parent
`248629`; su URL publica `/aeo-2/` la resuelve WordPress desde el permalink.

Regla operativa: no agregar ni editar menu por SQL ni editando HTML del
masthead. Para futuras mutaciones, primero snapshot del menu (`wp_get_nav_menus`,
`get_nav_menu_locations`, `wp_get_nav_menu_items(61)` y metas de cada item),
luego mutacion con API core (`wp_update_nav_menu_item`) o WP-CLI oficial, purge
Kinsta y verificacion desktop + mobile.

Aprendizaje de la escritura real de Redes Sociales: si el destino es una pagina
WordPress, el item correcto es `post_type/page` con `object_id` de la pagina,
no un link `custom` con la URL copiada a mano. Asi el menu sigue el permalink
si la ruta cambia. Antes de escribir hay que revisar duplicados por label,
permalink/URL, `object_id` y parent. En este repo, el camino confiable es
`pnpm public-website:wpcli -- --eval-file ...`; no asumir que subcomandos
crudos de WP-CLI pasan por el wrapper. Despues de `wp_update_nav_menu_item()`,
no llamar `clean_nav_menu_cache()`; purgar con Kinsta/cache flush y validar el
DOM en `#menu-primary` y `#mobile-menu`.

## Patron: assets AI para placeholders de landing

Cuando un widget publico trae placeholders visuales de formato social, video,
carrusel, post, UGC o hero, no se debe rellenar el hueco con una imagen
generica ni interpretar literalmente que todo placeholder `Reel` necesita un
archivo de video. La decision debe partir de la funcion del bloque:

- si el contenedor ya aporta motion, como el muro `Muestra de trabajo` de
  Redes Sociales con `data-muro-col`, una familia de WebP premium puede dar mas
  calidad percibida con menos peso que multiples videos simultaneos;
- si el placeholder es el foco del primer viewport o una pieza hero, un video
  o micro-loop puede justificarse, pero debe tener WebM/MP4/poster, fallback y
  verificacion de autoplay/reduced-motion;
- si el bloque simula trabajo de portafolio, usar casos ficticios o aprobados;
  no quemar logos, claims, textos legibles ni marcas de clientes sin derechos
  confirmados.

El flujo validado en `/servicios/redes-sociales/` el 2026-07-08 fue:

1. Mapear cada slot por `data-image-slot` y proposito de formato.
2. Definir una direccion visual compartida para que el bloque se lea como una
   campana, no como una galeria.
3. Generar fuentes con `pnpm ai:image` / `gpt-image-2` en `ai-generations/`.
4. Revisar las piezas como sistema con contact sheet antes de publicar.
5. Convertir con `cwebp`; en este entorno no asumir `ffmpeg -c:v libwebp` ni
   `sips -s format webp`.
6. Publicar assets bajo el plugin runtime y mapearlos desde el widget con un
   registro por slot y fallback, no solo con fondos CSS invisibles.
7. Verificar desktop/mobile, assets directos `200`, `scrollWidth==clientWidth`
   y paint real de lazy-load slot por slot cuando la captura larga sea ambigua.

Nota operativa completa:
`docs/operations/public-site-social-wall-media-production-20260708.md`.

## Incidente 2026-06-14: `/blog`

### Sintomas

- En `https://efeoncepro.com/blog`, las secciones que debian ocupar el ancho completo del canvas aparecian con una linea/desfase lateral.
- El problema se notaba mas en el pre-footer y footer.
- Durante intentos previos de correccion, el sidebar fijo del theme empeoro cerca de secciones oscuras: el menu hamburguesa se lavaba y el logo cambiaba tratamiento, aunque el rail seguia siendo blanco.

### Causa raiz

La pagina `/blog` usa Ohio + Elementor con estas condiciones:

- `body` incluye `with-header-6 with-header-sidebar with-spacer`.
- Ohio reserva el sidebar con `--clb-header-height-6`.
- La pagina WordPress tiene el meta `page_full_width_margins_size`.
- Elementor compensa su root con margen negativo basado en el gutter del theme.

En el incidente, `page_full_width_margins_size` estaba en `20px` mientras el gutter efectivo de Ohio era `16px` (`--clb-grid-gutter: 1rem`). Elementor aplicaba `margin-left: -16px`, por lo que quedaban `4px` residuales visibles.

El segundo problema venia de la tipografia dinamica de Ohio: cuando el header/sidebar se superpone con secciones oscuras, Ohio agrega `.light-typo` dentro de `.header-dynamic-typo`. En el caso de `/blog`, eso no debe forzar el estado claro del logo/hamburguesa porque el sidebar visual permanece sobre un rail blanco.

## Cambio aplicado

### Alineacion full-width

Se ajusto el meta de la pagina `/blog`:

```bash
wp post meta update 18456 page_full_width_margins_size 16px
wp cache flush
```

Con esto el margen full-width de Ohio queda alineado al gutter real de Elementor/Ohio y desaparece el residuo lateral de `4px`.

### Sidebar fijo en secciones oscuras

Se agrego una correccion page-scoped en:

```text
wp-content/themes/ohio-child/assets/css/global-fixes.css
```

La regla solo apunta a:

```css
body.page-id-18456.with-header-sidebar:not(.dark-scheme) #masthead.header-sidebar ...
```

Su objetivo es neutralizar `.light-typo` para los elementos del sidebar de `/blog`, preservando:

- menu hamburguesa oscuro;
- fondo circular tenue del boton;
- logo base visible;
- variantes dinamicas light/dark ocultas en ese contexto.

## Evidencia de verificacion

Despues del ajuste de ancho, en viewport desktop amplio, los elementos principales quedaron alineados:

- `.elementor-18456`
- seccion gris de posts
- pre-footer
- `.site-footer`

Despues del ajuste del sidebar, incluso forzando `.light-typo` en runtime:

- hamburger color: `rgb(22, 21, 25)`;
- hamburger background: `rgba(136, 135, 137, 0.08)`;
- logo base opacity: `1`;
- logos dinamicos `.light` / `.dark`: `0`.

## Backups de rollback

Antes de los cambios se dejaron respaldos en el WordPress runtime:

```text
wp-content/themes/ohio-child/assets/css/blog-page-meta-backup-20260614015717.txt
wp-content/themes/ohio-child/assets/css/global-fixes.css.bak-20260614020413-before-blog-sidebar-header-fix
```

## Que no hacer

- No corregir el desfase pintando un fondo global por debajo del sidebar.
- No cambiar el layout del footer global para compensar un meta de pagina.
- No aplicar reglas globales sobre `#masthead`, `.header-dynamic-typo` o `.light-typo` sin page scope.
- No tocar el hero del home como parte de un fix de `/blog`.
- No editar archivos del theme parent `ohio`; los ajustes deben ir en `ohio-child` o en settings/meta versionables/respaldables.
- No publicar cambios de landings desde Greenhouse hasta que EPIC-019 tenga bridge, audit, staging/preview y rollback formal.

## Relacion con Greenhouse

Greenhouse puede operar este runtime por SSH/WP-CLI para discovery y fixes controlados, pero WordPress sigue siendo el runtime publico. Las futuras capacidades de landing pages desde Greenhouse deben respetar este contrato:

- Greenhouse gobierna manifests, aprobaciones, versiones y despliegues.
- WordPress renderiza/publica.
- Kinsta opera cache/hosting/backups.
- HubSpot conserva atribucion CRM y formularios cuando aplique.

Hasta que el bridge exista, cualquier fix en WordPress debe documentar comando, backup, rollback y verificacion visual.

## Guardrail: `Document::save()` y metas Ohio fuera de Elementor

`Document::save()` es el camino correcto para mutar el arbol Elementor porque ejecuta hooks, permisos, cache y regeneracion de CSS. Pero no debe tratarse como una operacion aislada al widget: en paginas Ohio publicadas, el render visible tambien depende de post meta y page meta fuera de `_elementor_data`.

Riesgo confirmado: en paginas cuyo headline usa:

```text
page_header_title_background_type=featured
```

el hero depende de `_thumbnail_id` / `get_the_post_thumbnail_url()`. Si un guardado Elementor deja `_thumbnail_id` vacio o no lo preserva, Ohio sigue intentando pintar el background desde la imagen destacada, pero el asset desaparece del headline.

Antes de cualquier `Document::save()` sobre una pagina Ohio publicada:

1. Leer y guardar `_thumbnail_id`, `get_the_post_thumbnail_url()`, `page_header_title_background_type` y metas `page_header_title_background_*`.
2. Guardar `_elementor_data`, `_elementor_page_settings` y metas Ohio relevantes en el backup de rollback.
3. Aplicar el cambio con `Document::save()`.
4. Leer de nuevo `_thumbnail_id` y `page_header_title_background_type`.
5. Si `_thumbnail_id` cambio o quedo vacio sin ser parte explicita del cambio, restaurarlo inmediatamente con `set_post_thumbnail()`.
6. Verificar visualmente `.page-headline .bg-image` y que `elementorFrontendConfig.post.featuredImage` no sea `false`.

Incidente fuente (2026-06-23): en `page_id=249582` (`/agencia-creativa/`), un cambio de configuracion del widget `greenhouse_comparison_table` via `Document::save()` dejo la imagen destacada vacia. Ohio seguia en `page_header_title_background_type=featured`, por lo que el hero quedo blanco. El asset correcto del hero era `attachment_id=249672` (`EO_Landing-GiroAgencia.webp`); el OpenGraph `attachment_id=249740` (`EO_Opengraph_AgenciaCreativa.webp`) era parecido, pero contenia logo/texto quemado y no era el background correcto.

## Incidente 2026-06-14: hero HubSpot services

### Sintomas

En `https://efeoncepro.com/servicios-contratar-hubspot/`, el page headline de Ohio quedo visualmente blanco/sin hero. El texto del H1 seguia presente, pero el fondo no mostraba la imagen esperada.

### Causa raiz operativa

La pagina `page_id=244079` usa el headline nativo de Ohio con:

```text
page_header_title_background_type=featured
```

Por lo tanto, la imagen visible del hero depende de `_thumbnail_id` / `get_the_post_thumbnail_url()`, no de los widgets Elementor dentro de `_elementor_data`.

Durante la correccion se cometio un falso positivo: el attachment `243106` (`Hubspot-headline-1.webp`) coincidia por nombre, pero era un logo inline de `221x65` usado dentro del modulo Elementor de partner proof, no un background hero. Al setearlo como featured image, la request respondia `200`, pero visualmente seguia pareciendo que la imagen no cargaba.

El asset correcto para el headline era:

```text
attachment_id=248703
url=https://efeoncepro.com/wp-content/uploads/2025/10/EO_Hubspot_Hiro2-2.webp
dimensiones=2001x801
```

### Diagnostico correcto

Antes de tocar un hero/page headline de Ohio:

1. Inspeccionar `.page-headline .bg-image` en navegador y registrar `background-image`, `background-size`, `background-position` y status HTTP del asset.
2. Leer `_thumbnail_id`, `get_the_post_thumbnail_url()`, `page_header_title_background_type` y metas `page_header_title_background_*` por WP-CLI.
3. Validar dimensiones del attachment; un logo pequeno puede responder `200` pero no ser el hero esperado.
4. Comparar con referencias Elementor solo como contexto: imagenes inline dentro de widgets no prueban el background del headline.

### Cambio aplicado

Se restauro el headline con controles nativos WordPress/Ohio:

```text
set_post_thumbnail(244079, 248703)
page_header_title_background_type=featured
page_header_title_background_size=cover
page_header_title_background_position=center
page_header_title_background_repeat=no_repeat
```

Backup runtime:

```text
wp-content/uploads/greenhouse-backups/page-244079-hero-real-image-before-20260614111638.json
```

Verificacion:

```text
.captures/public-site-hubspot-hero-incident-20260614/after-real-hero-image.png
.captures/public-site-hubspot-hero-incident-20260614/after-real-hero-image-2048.png
```

### Leccion para backups

Los backups de cambios Elementor que solo capturan `_elementor_data`, `_elementor_page_settings` y `ohio_meta` no bastan para rollback de page headline. Para cualquier pagina Ohio con headline `featured`, el backup debe incluir tambien:

- `_thumbnail_id`
- `get_the_post_thumbnail_url()`
- metas `page_header_title_background_*`
- dimensiones y URL del attachment objetivo

## Incidente 2026-06-14: headline responsive HubSpot services

### Sintomas

En `https://efeoncepro.com/servicios-contratar-hubspot/`, el H1 del headline Ohio era demasiado largo para convivir con el asset visual del hero. En desktop/laptop invadia visualmente la zona de imagen; en mobile el texto se perdia por longitud y por el recorte del background.

### Causa raiz

Este hero no es un widget Elementor. Es el template de headline de Ohio:

```text
wp-content/themes/ohio/parts/elements/page_headline.php
```

Ohio usa `get_the_title()` como H1 visual y no trae un control nativo para definir un titulo editorial de display distinto del titulo WordPress. Cambiar el `post_title` resuelve el layout, pero altera la intencion editorial, breadcrumbs y contratos SEO/contenido. Cambiar solo Elementor no afecta este H1.

### Cambio aplicado

La correccion se hizo en el child theme, no en el parent:

```text
wp-content/themes/ohio-child/parts/elements/page_headline.php
wp-content/themes/ohio-child/assets/css/global-fixes.css
```

El override del template agrega el meta opcional:

```text
gh_page_headline_display_title
```

Ese meta solo afecta el H1 visual del page headline y permite saltos editoriales de linea, preservando:

- `post_title`;
- slug;
- breadcrumbs;
- SEO/canonical metadata;
- estructura Elementor.

Para `page_id=244079`, el valor vigente es:

```html
Empodera tu crecimiento<br>con HubSpot <span class="gh-mobile-break"><br></span>+ Efeonce
```

La clase `gh-mobile-break` se oculta en desktop y se muestra en mobile para dividir la linea final sin cambiar el copy.

El CTA del headline tambien queda scoped en `ohio-child/assets/css/global-fixes.css` para evitar el hover azul de Ohio que se perdia contra el hero:

- reposo: `var(--clb-color-button)`, texto `var(--clb-color-white)`;
- hover/focus: inversion neutral `var(--clb-color-white)` + `var(--clb-color-black)`, shadow leve;
- active: blanco suavemente mezclado con `var(--clb-color-primary)`.

Este estado es especifico del headline de `page_id=244079`; no debe convertirse en regla global de `.button` sin auditar el resto del sitio.

### Regla de capas aprendida

El borde moderno redondeado en mobile pertenece a la superficie blanca de contenido (`#content > .page-container`) que se monta sobre el hero, no al background del headline.

No aplicar `border-radius` al `.page-headline` ni a `.page-headline .bg-image` para "hacer continuidad": eso mueve el radio a la capa equivocada y hace que el background parezca una tarjeta. La solucion correcta es:

- headline/background recto;
- overlay de legibilidad recto;
- superficie blanca superpuesta con `border-radius: 16px 16px 0 0`;
- regla scoped a `body.page-id-244079` en `ohio-child`.

### Backups de rollback

Backups live relevantes:

```text
wp-content/uploads/greenhouse-backups/ohio-child-page-headline-before-display-title-repair-20260614115009.php
wp-content/uploads/greenhouse-backups/ohio-child-page-headline-before-display-title-br-repair-20260614115211.php
wp-content/uploads/greenhouse-backups/ohio-child-global-fixes-before-hubspot-headline-mobile-20260614115646.css
wp-content/uploads/greenhouse-backups/ohio-child-global-fixes-before-hubspot-mobile-radius-mask-20260614120504.css
wp-content/uploads/greenhouse-backups/ohio-child-global-fixes-before-hubspot-mobile-white-surface-radius-20260614121020.css
```

Verificacion visual:

```text
.captures/public-site-hubspot-hero-design-pass-20260614/child-theme-css-final/
.captures/public-site-hubspot-hero-design-pass-20260614/mobile-white-surface-radius/
```

### Que no hacer

- No editar `wp-content/themes/ohio/parts/elements/page_headline.php`; cualquier update de Ohio lo pisa.
- No resolver longitud del H1 cambiando el `post_title` si el problema es solo visual.
- No confundir el headline Ohio con widgets `ohio_heading` de Elementor.
- No mover el `border-radius` mobile desde la superficie blanca hacia el background del hero.
- No introducir CSS global para page headline; el scope debe ser `body.page-id-244079` o una clase semantica controlada.

## React, Gutenberg e Interactivity API

WordPress si puede trabajar con React, pero para `efeoncepro.com` la regla vigente es usarlo dentro del modelo WordPress, no como reemplazo del sitio publico.

Fuentes oficiales revisadas el 2026-06-14:

- `https://developer.wordpress.org/news/2026/06/whats-new-for-developers-june-2026/`
- `https://make.wordpress.org/core/2026/06/05/react-19-upgrade-temporarily-reverted-in-gutenberg/`
- `https://developer.wordpress.org/block-editor/reference-guides/interactivity-api/`

Lectura operacional:

- React es natural en Gutenberg, bloques, paneles admin/editor del bridge y tooling WordPress basado en `@wordpress/*`.
- Para frontend publico, la via preferida es server-rendered blocks/templates + WordPress Interactivity API para interacciones acotadas.
- React 19 no debe asumirse estable en el stack activo: Gutenberg 23.3.2 revirtio temporalmente el upgrade a React 19 por incompatibilidades con plugins construidos contra React 18.
- Greenhouse sigue siendo el control plane de manifests, aprobaciones, versiones, publish, drift y audit; WordPress React no se convierte en source of truth de landing operations.
- No se debe usar esta capacidad como excusa para reescribir `efeoncepro.com` como SPA ni para inyectar bundles React arbitrarios en paginas Ohio/Elementor existentes.

## Incidente 2026-06-14: `/contacto`

### Sintomas

- En `https://efeoncepro.com/contacto`, el fondo se cortaba entre hero, breadcrumbs, contenido y footer.
- El corte se leia como una banda de breadcrumbs entre hero y contenido, mas un espacio automatico antes del footer.

### Causa raiz

La pagina `/contacto` usa el template default de Ohio (`with-header-3`), no el header/sidebar de `/blog`.

Elementor pinta la seccion principal con un gris suave (`rgba(150, 144, 162, 0.06)`), pero Ohio renderizaba fuera de esa seccion:

- `breadcrumb-holder`, heredado de la opcion global de breadcrumbs;
- `page-container bottom-offset`, creado por la opcion global `page_add_top_padding`.

Por eso no era un problema del formulario HubSpot ni del hero. Era una interrupcion del theme entre la seccion hero y la seccion Elementor.

### Cambio aplicado

Se resolvio desde los metas de Ohio para la pagina, no con CSS global:

```bash
wp post meta update 20729 page_breadcrumbs_visibility 0
wp post meta update 20729 page_add_top_padding 0
wp cache flush
```

El efecto esperado es:

- no se renderiza `breadcrumb-holder`;
- no existe `.page-container.bottom-offset`;
- la seccion Elementor empieza justo donde termina el hero;
- el footer comienza justo donde termina la seccion Elementor.

### Backups de rollback

Antes del cambio se guardo:

```text
wp-content/themes/ohio-child/assets/css/contacto-page-meta-backup-202606140-bg-continuity.json
```

Tambien existe un backup previo del CSS de la sesion:

```text
wp-content/themes/ohio-child/assets/css/global-fixes.css.bak-202606140-contacto-bg-continuity
```

### Verificacion

Despues del fix:

- `hasBreadcrumb=false`;
- `#content > .page-container` comienza en `top=500`, donde termina `.page-headline`;
- `.elementor-section-stretched.elementor-section-full_width` comienza en `top=500`;
- `.site-footer` comienza justo al terminar la seccion Elementor;
- no existe `.page-container.bottom-offset`.

### Aprendizaje operativo

El primer intento de correccion fue igualar el fondo de `#content.site-content` con el gris de Elementor. Aunque el CSS cargaba y los valores computados coincidian, visualmente el problema seguia: la pagina aun conservaba la banda de breadcrumbs y el offset automatico del theme.

La regla aprendida para Ohio + Elementor es:

- si la discontinuidad proviene de una pieza estructural de Ohio (`breadcrumb-holder`, `top-offset`, `bottom-offset`), corregir primero el setting/meta de Ohio que la genera;
- usar CSS page-scoped solo cuando el contenedor correcto ya existe y el problema es de presentacion, no de estructura;
- no declarar resuelto un problema visual solo porque los valores computados cambiaron: debe validarse con captura visual y compararse contra el sintoma reportado por el operador;
- si un fix no cambia la percepcion del problema, revertir o reemplazar el enfoque antes de acumular selectores mas fuertes.

## Modulo sticky-scroll "Como trabajamos" (Agencia Creativa, page_id 249582)

### Como se comporta

La seccion `7489ca6` de `/agencia-creativa/` es un row full-bleed dividido en dos columnas:

- **Izquierda `49d5a98` (63%)** — scrollea: ilustracion + titulo "Cada ciclo mejora el siguiente" + los 7 pasos del proceso (widgets `ohio_service_table`) + dos cards de intro.
- **Derecha `97e545e` (37%)** — se queda fija: bloque "CÓMO TRABAJAMOS / La diferencia no es…".

El "se queda fija" NO es el efecto Sticky de Elementor Pro: es `position: sticky; top:0` aplicado por la clase `-sticky-block` (regla servida por el `style.css` del theme Ohio) sobre `d0ef9a7` (bloque derecho) y `e6facfa` (ilustracion izquierda). Los pasos y las cards no son sticky, por eso recorren mientras la derecha permanece anclada.

### Por que se veia "pegada a los bordes" (gotcha home vs pagina boxeada)

El modulo usa las clases `lp-container-offset-left` / `lp-container-offset-right` para insetarse del borde. Pero su padding solo existe en reglas de `Landing Custom CSS.css` **scopeadas a `body.home, body.front-page`**. En el Home el `.page-container` es full-bleed (`--container-max-width: 100%`), asi que el offset calcula 0 y el contenido al borde se ve bien. Reusado en `agencia-creativa` (`body.page-id-249582`, `.page-container` boxeado a `min(1344px, 86vw)`, inset ~192px @1728), esas reglas no aplican y `--container-max-width` queda indefinida, por lo que el modulo se escapa full-bleed (contenido en x≈20) mientras el resto de la pagina respeta el container. No es un bug de ancho de columna: es un desfase de scope de selector.

### Como se corrige

Levantar el contenido del modulo del borde con un gutter simetrico restringido via CSS page-scoped en `global-fixes.css` (scopeado a `body.page-id-249582`, desktop), preservando el fondo rosado full-bleed. No editar las reglas de offset scopeadas a home.

Valor aplicado (2026-06-23):

```css
@media (min-width: 1025px) {
  body.page-id-249582 .elementor-element.elementor-element-7489ca6 {
    padding-left: clamp(24px, 3vw, 56px);
    padding-right: clamp(24px, 3vw, 56px);
  }
}
```

≈52px @1728. Backport en runtime repo `efeoncepro/efeonce-public-site-runtime` (`main`, commit `010a2e5`).

Iteracion / aprendizaje: el primer intento alineo el modulo al `.page-container` completo (`calc((100vw - min(1344px, 86vw)) / 2)` ≈192px @1728, gateado a >=1200px para matchear el breakpoint donde Ohio boxea el container). El operador lo rechazo por "demasiado margen". Leccion: para un modulo full-bleed que se ve "pegado", preferir un gutter modesto que lo despegue del borde antes que boxearlo por completo al container del sitio; el full-bleed editorial es intencional y solo necesita respiro, no boxeo.

### Regla aprendida

- Antes de tocar un modulo "que se queda fijo", verificar si el sticky es `position:sticky` por clase custom (`-sticky-block`) y no el efecto de Elementor Pro; no hay keys `sticky`/`motion_fx` en `_elementor_data`.
- Cuando un modulo se "pega a los bordes" solo en una pagina, sospechar de clases cuyo CSS esta scopeado a `body.home`/`body.front-page` reusadas en una pagina boxeada, antes de cambiar anchos de Elementor.

## Patron reutilizable: sticky editorial lane

Este patron aplica cuando una landing tiene una columna editorial corta que debe acompanar una columna larga de contenido, cards, formulario o pasos. Ejemplos ya verificados:

- Home: modulos sticky-scroll con `.-sticky-block`.
- `/agencia-creativa/`: "Como trabajamos".
- `/about-us-efeonce/`: Loop Marketing / Ecosistema tecnologico.
- `/servicios/posicionamiento-seo/`: columna izquierda del Growth Form SEO (`#grader`).

### Regla base de Ohio

Ohio ya trae la mecanica desktop:

```css
@media screen and (min-width: 769px) {
  .-sticky-block,
  .-sticky-block > .vc_column-inner > .wpb_wrapper {
    z-index: 2;
    top: 0;
    position: sticky !important;
  }
}
```

Usar esa clase cuando se quiera reproducir el patron visual del Home. No usar `motion_fx`/Sticky de Elementor Pro para este caso salvo que el modulo ya dependa explicitamente de ese sistema.

### Geometria correcta

El sticky debe aplicarse a la **lane/columna completa**, no a un inner pequeno. La lane debe tener altura de viewport y el contenido interno se centra dentro de esa lane:

```css
.landing .sticky-lane.-sticky-block {
  align-self: start;
  display: flex;
  height: calc(100dvh - var(--wp-admin--admin-bar--height, 0px));
  min-height: 680px;
  position: sticky !important;
  top: var(--wp-admin--admin-bar--height, 0px);
  z-index: 2;
}

.landing .sticky-lane-inner {
  align-self: center;
  width: 100%;
}

@media (max-width: 900px) {
  .landing .sticky-lane.-sticky-block {
    display: block !important;
    height: auto !important;
    min-height: 0 !important;
    position: relative !important;
    top: auto !important;
  }
}
```

El sticky debe "acompanar" mientras la columna larga scrollea y soltarse al llegar al final del shell/form. Si el bloque sticky mide mas que el viewport o se estira hasta la altura completa del formulario, no se vera fijo.

### Ancestros y overflow

`position: sticky` falla o se comporta como normal si un ancestro crea un scroll container accidental. Antes de declarar que "sticky no funciona", medir la cadena de padres con Playwright:

- `overflow-x/overflow-y`;
- `transform`;
- `contain`;
- altura de la lane sticky vs viewport;
- top/bottom del shell y de la columna larga.

En la landing SEO, el bug venia de un `<main class="gh-seo-landing site-content">`: la clase `site-content` heredaba `overflow-x:hidden; overflow-y:auto`, convirtiendose en scroll container y neutralizando el sticky. El fix correcto fue quitar esa clase del wrapper de la landing y neutralizar overflow solo en los wrappers de la pagina:

```css
body.page-id-251078 .elementor.elementor-251078,
body.page-id-251078 .elementor-element-seo1343,
.gh-seo-landing {
  overflow: visible !important;
}
```

Hacer esto siempre page-scoped. No tocar globalmente `body`, `.site-content`, `.page-container`, header, footer ni widgets Ohio.

### Gutters off-Home

`lp-container-offset-left/right` no es parte del contrato sticky: es una ayuda de offset del Home y sus reglas viven scopeadas a `body.home`/`body.front-page`. Si se reutiliza el patron en una pagina interior, agregar gutter page-scoped moderado al modulo, no cambiar las reglas del Home ni alinear todo al `.page-container` si el bloque debe conservar lectura full-bleed.

### Gate de verificacion

Para desktop:

- clase `-sticky-block` presente;
- computed `position=sticky`;
- ancestros relevantes `overflow=visible/visible`;
- durante scroll medio, la lane conserva `top≈0`;
- al final, la lane se suelta y su `bottom` no sobrepasa el `shellBottom`/`formBottom`;
- `scrollWidth == clientWidth`;
- widgets Ohio siguen visibles.

Para mobile `390px`:

- lane vuelve a flujo normal (`position:relative|static`);
- no tapa campos, CTAs ni consentimiento;
- `scrollWidth == clientWidth`.

## Hero About us (page_id 249770)

La pagina `/about-us-efeonce/` usa un hero Elementor/Ohio full-bleed con fondo
azul y proof de marcas. El copy vigente se ajusto en vivo el 2026-07-03 para
que el primer fold presente a Efeonce como agencia-sistema, no como una landing
generica de marketing.

Selectores/widgets relevantes:

- root de hero: `6e46dcc`;
- video widget: `e18428a`;
- eyebrow: `6a1acc3`;
- H1: `3ab9072`;
- subhead: `70afd83`;
- CTA de agenda retirado: `a452380`;
- proof strip vigente: `abproof`, con marquee `abplogo` y meta pill `abpmeta`;
- counters previos: `831f50d`; primer counter `10e73af` (reemplazados el
  2026-07-03).

Copy vigente:

```text
AGENCIA DE CRECIMIENTO INTEGRADA

El crecimiento real
no se compra por partes.
Se orquesta.

Creatividad, medios, CRM, data y tecnología trabajando como un solo sistema.
Menos proveedores sueltos. Más visibilidad, continuidad y aprendizaje acumulado.

Ver cómo operamos
+90
Chile · Colombia · México · Perú
```

Las mutaciones se hicieron por `Document::save()`. Rollback snapshots:
`_gh_backup_before_about_hero_copy_20260703T042409Z` y
`_gh_backup_before_about_hero_remove_agenda_cta_20260703T052019Z`. Proteger
`_thumbnail_id=249769`, `page_header_title_background_type=featured` y
`page_header_title_background_image=""` en cambios futuros.

El bloque de prueba del hero reutiliza la estructura del componente AEO
`greenhouse_logo_marquee` + `BrandProofAvatarGroup`, pero no su tratamiento visual
literal: AEO vive sobre fondo claro y About sobre hero azul oscuro. Por eso About
agrega una variante page-scoped en
`ohio-child/assets/css/global-fixes.css` para `body.page-id-249770
.elementor-element.elementor-element-abproof`: logos en modo claro/ice, pill
frosted con mayor contraste, respiracion inferior antes del corte a la seccion
blanca y compaccion mobile para no quedar bajo el widget Ohio fijo. Rollback de
la mutacion Elementor:
`_gh_backup_before_about_hero_proof_strip_20260703T043325Z`; backups remotos CSS:
`global-fixes-before-about-hero-proof-strip-20260703T043541Z.css` y
`global-fixes-before-about-hero-proof-dark-20260703T043711Z.css`; backup del
ajuste de respiracion inferior:
`global-fixes-before-about-hero-proof-bottom-space-20260703T044125Z.css`.
El ajuste final que retiro el CTA de agenda y reabrio el video en mobile quedo
en el hash CSS `20e60f44ecda9d2806465f9cb5977370a8b2ae8c96d6a747d9045363576bab3a`
con backup remoto
`global-fixes-before-about-hero-remove-agenda-20260703T052056Z.css`.

## Modulo Loop Marketing "Como trabajamos" (About us, page_id 249770)

La pagina `/about-us-efeonce/` reutiliza el patron visual del Home para la seccion
Loop Marketing (`59385ab`) con clases `lp-container-offset-left` /
`lp-container-offset-right`. Igual que en Agencia Creativa, esas reglas base
viven en `Landing Custom CSS.css` scopeadas a `body.home` / `body.front-page`,
por lo que no aplican en esta pagina.

Sintoma observado (2026-07-03):

- el bloque izquierdo empezaba en `x~=20` en desktop ancho;
- la columna visual derecha llegaba mas alla del viewport y podia crear overflow
  horizontal de pagina;
- el root `59385ab` conservaba fondo full-bleed, que si es intencional.

Correccion versionada en runtime:

```css
@media (min-width: 1025px) {
  body.page-id-249770 .elementor-element.elementor-element-59385ab {
    padding-left: clamp(60px, 4.5vw, 80px);
    padding-right: clamp(24px, 3vw, 56px);
    overflow-x: clip;
  }
}
```

La regla mantiene el fondo full-bleed, agrega un gutter editorial izquierdo
un poco mayor para que el switcher fijo Dark/Light no tape el headline, conserva
un gutter derecho mas moderado y contiene el overflow del grafico dentro del
modulo. No alinear al `.page-container` completo salvo nueva decision del
operador.

## Modulo "Ecosistema tecnologico" (About us, page_id 249770)

La misma landing `/about-us-efeonce/` tiene otra composicion full-bleed donde el
contenido izquierdo puede quedar bajo el switcher fijo Dark/Light y el buscador
Ohio. En este caso no se debe mover todo el root porque el texto sticky derecho
ya esta correctamente alineado.

Selectores relevantes:

- root de seccion: `af43bed`;
- carril izquierdo de tool-cards: `eb5c55f`;
- columna derecha: `88b901c`;
- bloque sticky derecho: `d93f52c`;
- card afectada de referencia: `9696990` (`HubSpot`).

Correccion versionada en runtime:

```css
@media (min-width: 1025px) {
  body.page-id-249770 .elementor-element.elementor-element-af43bed .elementor-element.elementor-element-eb5c55f {
    padding-left: clamp(60px, 4.5vw, 80px);
    box-sizing: border-box;
  }
}
```

La regla aplica el gutter solo al carril izquierdo, mantiene intacta la columna
sticky derecha y no hereda el ajuste en mobile.

## Franja de logos de clientes (Agencia Creativa, page_id 249582)

La franja "Marcas que confían en Globe" usa cuatro widgets Ohio `ohio_clients_logo` dentro del grid Elementor `a43cacf`. Elementor puede generar reglas por widget con `width` y `height` fijos (`post-249582.css`), y eso deforma logos cuando el asset trae una proporcion/canvas distinto al valor elegido en el editor.

Regla aplicada (2026-06-23): no mutar la data Elementor para este caso. Corregir la proporcion en `global-fixes.css`, page-scoped al grid de logos, dejando que la imagen conserve su ratio natural:

```css
body.page-id-249582 .elementor-element.elementor-element-a43cacf .ohio-widget.logo img {
  width: auto !important;
  height: auto !important;
  max-width: min(100%, 170px);
  max-height: 54px;
  object-fit: contain !important;
}
```

Verificacion requerida: medir con navegador real que `renderedWidth / renderedHeight` coincida con `naturalWidth / naturalHeight` para cada logo, y revisar una captura de la seccion. Fix live backport en runtime repo `efeoncepro/efeonce-public-site-runtime` commit `56ae819`.
