# Footer global del sitio público V1

Estado: **En producción en todo `efeoncepro.com` desde el 2026-10-31** (footer V3, cinco columnas). Verificado en vivo
ese día en Contacto, Home, blog y Agenda a 1440, 900 y 375 px: sin desborde horizontal y con el renderer de Growth Forms
cargado una sola vez por página. Pendientes en [§Pendientes](#pendientes).

Dueño: Sitio público / WordPress (Ohio + `ohio-child`), con valores de AXIS.

Diseño aprobado: canvas de Contacto, página «Footer», tablero «Footer propuesto · cinco columnas»
([claude.ai/artifact/JKJAj4cQWd8CkcYprNcWYj](https://claude.ai/artifact/JKJAj4cQWd8CkcYprNcWYj)). El operador eligió
primero cuatro columnas y luego cambió a cinco («con 5 columnas se veía bien»).

Historia: V2 del 2026-10-14 ([auditoría](../../audits/public-site/2026-10-14-footer-composition-v2.md),
[paquete](../../../scripts/public-website/footer-refinement-v2/README.md)) → V3 del 2026-10-31
([paquete](../../../scripts/public-website/footer-refinement-v3/README.md)).

Documentación funcional: [Footer global del sitio](../../documentation/public-site/footer-global-del-sitio.md) ·
Operación: [Operar el footer global](../../manual-de-uso/public-site/operar-footer-global.md).

## Capas y propiedad

| Capa | Dueño | Qué decide |
| --- | --- | --- |
| Estructura (`#colophon`, cuatro sidebars, barra legal) | Tema Ohio | Las cuatro columnas de widgets de WordPress y la fila del copyright. No se edita. |
| Contenido de cada columna | Widgets de bloque (`widget_block`) | Texto, enlaces y marcado de cada bloque. |
| **Cromo del footer** (fondo, grilla, tipografía, colores, hovers, partners) | **Adaptador en `block-34`** | Todo lo visual. Es el único dueño: ninguna otra pieza debe estilar el footer. |
| Formulario de Glitch | `block-46` + renderer de Growth Forms | Host: variables de la píldora y carga diferida del renderer. Dentro de `<greenhouse-form>` manda el renderer. |
| Barra legal (enlaces y botón de cookies) | Plugin `eo-measurement-consent` (`efeonce-cookie-preferences-mount`) + opción ACF del copyright | El plugin inyecta los enlaces; el adaptador sólo los espacia y les da hover. |
| Regla heredada en conflicto | `ohio-child/assets/css/global-fixes.css` | Fija fondo y color de enlaces fuera de Home con `!important` (ver [§Conflicto heredado](#conflicto-heredado-global-fixescss)). Sin carril de despliegue gobernado. |

El adaptador acota cada selector con el prefijo `#colophon:has([data-eo-footer-partners="v2"])`. El prefijo sube la
especificidad lo suficiente para ganarle a Ohio sin `!important`, y hace que las reglas no apliquen si el marcador
desaparece. El JavaScript del adaptador no usa `:has()` en `querySelector`: busca el marcador y sube con
`closest('#colophon')` (compatibilidad con el monitor de calidad, 2026-10-18).

## Mapa de bloques y sidebars

| Sidebar | Widgets (en orden) | Contenido |
| --- | --- | --- |
| `ohio-sidebar-footer-1` | `ohio_widget_logo-1`, `block-17`, `ohio_widget_socialbar_subscribe-3` | Logo · cobertura con cinco banderas · redes |
| `ohio-sidebar-footer-2` | `block-45` | Explora |
| `ohio-sidebar-footer-3` | `block-46` | Glitch (píldora de Growth Forms) |
| `ohio-sidebar-footer-4` | `block-47`, `block-31`, `block-34` | Contacto · Trabaja con nosotros · adaptador (CSS/JS) + partners |
| `wp_inactive_widgets` | incluye `ohio_widget_subscribe-2` | El widget antiguo de suscripción (CF7 242255), retirado |

El contenedor de la columna 4 usa `display:contents`, así que `block-47`, `block-31` y `block-34` se ubican uno por uno
en la grilla compartida con reglas explícitas de `grid-column`/`grid-row`. La columna de Glitch se ubica como
`.widgets>.widgets-column:nth-child(3)`.

### Contenido por bloque

- **`block-17` (Marca):** «Trabajamos con organizaciones en Latinoamérica y Estados Unidos.» y cinco banderas circulares
  de 22 px (Chile, Colombia, México, Perú, Estados Unidos), superpuestas 6 px, con un anillo `#000f1f`. Se sirven desde
  `wp-content/plugins/eo-elementor-widgets/assets/img/contact/flags/` (las mismas de Contacto). El grupo es un
  `role="img"` con el nombre de los cinco países. Hasta el 2026-10-31 este bloque tenía la dirección.
- **`block-45` (Explora):** navegación del footer: Servicios (`/#servicios`), Cómo trabajamos (`/#metodo`), Casos de éxito (`/portafolio/`) y Blog (`/blog/`).
- **`block-47` (Contacto, nuevo):** «Casa matriz» Dr. Manuel Barros Borgoño 71, of. 1105, Providencia, Santiago de Chile;
  `hola@efeoncepro.com` (`mailto:`); `600 914 0660` «Solo desde Chile» (`tel:6009140660`) y `+1 (239) 235-2073`
  «Estados Unidos» (`tel:+12392352073`). Trae su propio `<style>` con la tipografía del canvas (ver
  [§Tipografía de Contacto](#tipografía-de-contacto)).
- **`block-46` (Glitch):** título = logo negativo oficial de Glitch (AXIS), servido desde
  `ohio-child/assets/vendor/axis/site-nav/0.7.13/brand/glitch-logo-negative.svg`; bajada «El newsletter semanal de IA,
  marketing y negocios, en tu correo.»; formulario `efeonce-blog-subscription` (ver [§Glitch](#glitch)).
- **`block-31` (Trabaja con nosotros):** píldora de contorno «Ver vacantes» con esfera papel y flecha ↗, a
  `https://greenhouse.efeoncepro.com/public/careers` en pestaña nueva, con texto oculto «(se abre en una pestaña
  nueva)» para lectores de pantalla.
- **`block-34` (adaptador + partners):** todo el CSS del cromo, el JavaScript de arranque (marcador
  `data-eo-footer-partners="v2"`, «Volver arriba», ocultar el `.elements-bar` mientras el footer está a la vista) y la
  fila de nueve logos de partners.
- **Copyright:** opción ACF `options_global_footer_copyright_left` = «© [ohio_current_year] Efeonce Group SpA. Todos
  los derechos reservados.»

## Grilla por ancho

| Ancho | Distribución |
| --- | --- |
| > 1100 px | Cinco columnas: Marca · Explora · Contacto · Glitch · Trabaja con nosotros. `grid-template-columns: minmax(0,1fr) minmax(0,.52fr) minmax(0,.92fr) minmax(0,1.16fr) minmax(0,.8fr)`, gap 32. A 1440 px: 250 · 130 · 230 · 290 · ~200. Partners en la fila de abajo. |
| ≤ 1100 px (tablet) | Dos columnas: fila 1 Marca \| Explora · fila 2 Contacto \| Glitch · fila 3 Empleo · fila 4 partners. |
| ≤ 600 px (teléfono) | Fila 1 Marca \| Explora · fila 2 Contacto (ancho completo, los dos teléfonos en dos columnas) · fila 3 Glitch · fila 4 Empleo · fila 5 partners. |

En todos los anchos el contenido de cada columna empieza a la misma altura bajo su título (el título de Glitch es una
imagen de 20 px dentro de una caja de 22 px con 20 px de margen, 16 px en teléfono).

## Tokens y colores

| Uso | Valor |
| --- | --- |
| Fondo | `#000f1f` (azul noche de AXIS, la parada profunda de sus degradados) con `!important` |
| Línea superior y separadores | `#1d3a57` (`--eo-ft-line`) |
| Papel | `#f7f8f6` (`--eo-ft-paper`) |
| Texto secundario | `--eo-ft-text` (papel atenuado) |
| Acento / hover | turquesa `#36c8bf` (`--eo-ft-accent`, el mismo de la píldora de Glitch) |
| Tinta sobre papel | `--eo-ft-ink` |

El fondo reemplazó al carbón `#161519` de Ohio, que chocaba con las bandas azules con que cierran Contacto y Agenda.
`#000f1f` se lee casi negro al lado de esas bandas; en el canvas parece más azul sólo porque la interfaz del canvas
alrededor es gris oscuro. Es el mismo hex (medido en vivo: `rgb(0,15,31)`). Se ofreció aclararlo a `#001a33` y el
operador mantuvo el valor del canvas.

### Hovers (todas las páginas)

Marcados en `block-34` con `/* Footer v3 link colours (canvas). */`:

- Explora, enlaces de Contacto y «Volver arriba» → turquesa al pasar el cursor.
- Íconos sociales: papel en reposo y en hover.
- «Ver vacantes», enlaces de Contacto y la etiqueta «Casa matriz»: papel.
- Enlaces legales: turquesa sin subrayado.
- Transición de color 200 ms `cubic-bezier(0.4,0,0.2,1)`; la flecha de «Ver vacantes» se mueve 1 px y respeta
  `prefers-reduced-motion`.

Llevan `!important` por el conflicto heredado. Antes sólo funcionaban en Home.

### Tipografía de Contacto

Valores del canvas, declarados en `block-47`: etiqueta y correo a interlineado 1,4 (el normal de Poppins), dirección a
1,6, 12 px bajo el correo, teléfonos a 13 px con su leyenda de 11 px 1 px debajo. Sin esto la columna heredaba el
interlineado 1,75 del `p` del adaptador y el `li` de 14,8 px (interlineado 1,6) de Ohio.

### Partners

Nueve logos monocromos con altura según su peso visual (`--eo-logo-h`): HubSpot 25, Salesforce 30, Adobe 22,
Microsoft 22, AWS 29, Google Cloud 19, Claude 22, OpenAI 24, BytePlus 20 (px). En teléfono, ×0,88. Escritorio:
`display:flex; justify-content:space-between` (mismo espacio entre logos). Tablet: grilla de 5 columnas centradas.
Teléfono: grilla de 3.

### Barra legal

«Privacidad y cookies» y «Preferencias de cookies» separados por 28 px (24 en teléfono), sin « | ». El plugin de
consentimiento agrega un nodo de texto ` | ` entre ellos; el adaptador pone `font-size:0` en el contenedor
`.site-footer-copyright .holder>.-right[data-efeonce-cookie-links]`, restaura 11 px (10 en teléfono) en cada enlace y
da `margin-left` al botón. Un primer intento con `inline-flex` duplicaba el espacio (el nodo de texto se volvía un ítem
flex anónimo) y se descartó.

## Glitch

- Formulario canónico `efeonce-blog-subscription`, clave `6bc62588-a4a0-4214-9501-13b0c2948c81`, superficie
  `fhsf-efeonce-blog-subscription`: el mismo del blog. El script exige que las opciones `eo_blog_glitch_form_key` y
  `eo_blog_glitch_form_surface` sigan apuntando ahí antes de escribir.
- Vestido sólo con variables del renderer (nada dentro de `<greenhouse-form>`): papel `#f7f8f6` con texto navy
  `#001a33`, turquesa `#36c8bf` en hover y foco, 46 px de alto (botón interno 36), borde del campo abierto papel al 22 %.
  El verde de Glitch no se usa en el footer: el operador lo rechazó por chocar con el sitio.
- Texto de ejemplo «Tu correo» desde la versión `fver-d0ecefaa-9bf5-429a-8eb3-2abd3826b67e` (publicada el 2026-10-31 con
  `scripts/growth/revise-glitch-pill-placeholder.ts`). «Tu correo electrónico» se cortaba en la columna de 290 px. El
  cambio aplica también al blog.
- Declara `inline-initial-state="open"` (renderer 1.4.0). En producción corre un renderer anterior que ignora el
  atributo y muestra el botón; el formulario se verá abierto cuando salga el próximo release de Greenhouse, sin tocar
  WordPress.
- El footer no tiene handle de WordPress: el bloque carga `renderer-latest.js` cuando el footer está a 800 px de la
  pantalla (`IntersectionObserver`), y sólo si la página no lo cargó ya (Contacto y el blog lo traen). Mientras tanto se
  ve el enlace de respaldo «Suscríbete a Glitch» a `/blog/`.
- Reemplazó al CF7 **242255** (Mailchimp desconectado). CF7 242255 no se tocó; `ohio_widget_subscribe-2` quedó en
  widgets inactivos.

Detalle del host de Growth Forms: [`growth-forms-wordpress.md`](../../../.claude/skills/efeonce-public-site-wordpress/references/growth-forms-wordpress.md)
§Second host.

## Conflicto heredado: `global-fixes.css`

`ohio-child/assets/css/global-fixes.css` contiene, fuera de Home:

- `body:not(.home):not(.front-page) .site-footer { background-color: #161519 !important }`;
- todos los enlaces y párrafos del footer en `rgba(255,255,255,.75) !important`.

Ese archivo no tiene carril de despliegue gobernado. Por eso el adaptador repite con `!important` el fondo, los colores
de enlaces y los hovers. Es un parche consciente, no el estado final.

Arreglo limpio (pendiente): borrar esas reglas de `global-fixes.css` cuando el archivo tenga carril, y después quitar
los `!important` del adaptador.

## Escritura: scripts y guardas

Todo cambio es un script WP-CLI con guardas, corrido con:

```bash
pnpm public-website:ssh-check
pnpm public-website:wpcli -- --eval-file <script> --wp-user 12
```

Patrón común: guarda (hash exacto del bloque o coincidencia exacta del texto, una sola coincidencia por reemplazo) →
respaldo en una opción no autoload `_gh_footer_*_before_<fecha>` → escritura → relectura → verificación de que la Home
(`_elementor_data` de la portada) no cambió → `wp cache flush` + purga de Kinsta. Si una guarda no calza, no escribe.

| Script | Qué hace | ¿Se puede volver a correr? |
| --- | --- | --- |
| `footer-refinement-v3/apply.php` | Fondo, línea, partners por peso, píldora «Ver vacantes» (`block-34`, `block-31`) | No: falla por la guarda de hash (ya aplicado) |
| `footer-newsletter-growth-form.php` | Escribe o refresca `block-46` (Glitch) | Sí: refresca el bloque con respaldo nuevo |
| `footer-refinement-v3/cinco-columnas.php` | Cinco columnas, `block-17` con banderas, `block-47` nuevo, copyright | No: falla por hash y porque `block-47` ya existe |
| `footer-refinement-v3/legal-links.php` | Espaciado y hover de la barra legal | Sí: reemplaza sus pasadas anteriores; si ya está igual, termina en «Already applied» |
| `footer-refinement-v3/link-colors.php` | Bloque marcado de colores y hovers | Sí: reemplaza su bloque marcado; si no cambió, termina en «Already applied» |
| `footer-refinement-v3/contact-type.php` | Tipografía de Contacto en `block-47` | No: sus textos de origen ya no existen |
| `fix-footer-headquarters-address.php` | Dirección de casa matriz en el antiguo `block-17` | No (superado por `cinco-columnas.php`) |
| `fix-legacy-headquarters-address-copies.php` | Retira «Las Bellotas 199» de opción ACF, WooCommerce, `block-15` inactivo, `/agendar/`, su borrador y Landing Loop Marketing | No |
| `fix-agendar-phone.php` | `/agendar/` y su borrador: teléfono a `+56 9 3732 3064`, se conserva el horario | No |

Orden de aplicación del 2026-10-31: `apply.php` → `footer-newsletter-growth-form.php` → `cinco-columnas.php`, y
después los ajustes finos (`legal-links.php`, `link-colors.php`, `contact-type.php`).

## Respaldos y reversión

Respaldos del 2026-10-31 (opciones no autoload):

| Opción | Antes de |
| --- | --- |
| `_gh_footer_address_before_20261031_121306` | Dirección de casa matriz en el footer |
| `_gh_legacy_address_before_20261031_124200` | Copias heredadas de «Las Bellotas» |
| `_gh_agendar_phone_before_20261031_124828` | Teléfono de `/agendar/` |
| `_gh_footer_newsletter_before_20261031_125344`, `…_125729`, `…_131918`, `…_140533` | Glitch: cambio, espaciado, estilo, V3 |
| `_gh_footer_v3_before_20261031_140528` | `apply.php` |
| `_gh_footer_v3_cinco_before_20261031_140842` | `cinco-columnas.php` (incluye el copyright anterior) |
| `_gh_footer_v3_legal_before_20261031_142344`, `…_142453`, `…_143806` | Barra legal (tres pasadas) |
| `_gh_footer_v3_links_before_20261031_144021`, `…_144317` | `link-colors.php` (primera pasada y ajuste de íconos sociales) |
| `_gh_footer_v3_contact_type_before_20261031_144219` | `contact-type.php` |

Respaldos de la V2: `eo_footer_refinement_20261014_v2` y `eo_footer_compat_20261018`.

Para revertir: restaurar `widget_block`, `sidebars_widgets` y, si corresponde, `options_global_footer_copyright_left`
desde el respaldo más antiguo que cubra lo que se quiere deshacer; los respaldos de `legal-links`, `link-colors` y
`contact-type` sólo guardan el contenido del bloque que tocaron (`block34` o `block47`). Después, `wp cache flush` y
purga de Kinsta, y verificar en vivo. Revertir con un script con guardas, nunca a mano en wp-admin.

## Verificación

Después de cada escritura, en Contacto, Home, blog y Agenda a 1440, 900 y 375 px:

- sin desborde horizontal;
- el renderer de Growth Forms cargado una sola vez;
- fondo `rgb(0,15,31)` también fuera de Home;
- hovers de Explora, Contacto y legales en turquesa fuera de Home;
- banderas, nueve logos y la barra legal sin « | ».

## Pendientes

1. **`global-fixes.css`:** borrar las reglas del footer en el tema cuando tenga carril de despliegue y quitar los
   `!important` del adaptador.
2. **Separador de la barra legal:** dejar de agregar « | » en `eo-measurement-consent`; entonces sobra el
   `font-size:0` del adaptador.
3. **Glitch abierto:** depende del release de Greenhouse a producción con el renderer 1.4.0.
4. **Versión de AXIS del menú:** si el tema cambia la carpeta `site-nav/0.7.13`, actualizar la URL del logo de Glitch
   en `footer-newsletter-growth-form.php` y volver a correrlo.
5. **Número antiguo:** sigue sólo en una cuenta de un plugin de WhatsApp inactivo.

Fuera de alcance: la dirección de WooCommerce se actualizó por consistencia, pero el sitio no es un ecommerce.
