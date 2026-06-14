# Public Site WordPress — Layout Ohio + Elementor

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.0
> **Creado:** 2026-06-14 por Codex
> **Ultima actualizacion:** 2026-06-14 por Codex
> **Dominio:** Public Site
> **Sitio:** `https://efeoncepro.com`
> **Runtime:** WordPress en Kinsta, theme `ohio-child` sobre `ohio`, Elementor / Elementor Pro
> **Manual relacionado:** [Operar layout Ohio + Elementor](../../manual-de-uso/public-site/wordpress-ohio-elementor-layout.md)
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
