# Public Site WordPress — Layout Ohio + Elementor

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.0
> **Creado:** 2026-06-14 por Codex
> **Ultima actualizacion:** 2026-06-14 por Codex
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
