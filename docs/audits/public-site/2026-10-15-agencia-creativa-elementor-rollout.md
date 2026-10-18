# Agencia Creativa — rollout de módulos Elementor (2026-10-15)

> **Tipo de documento:** Audit / evidencia de rollout
> **Version:** 1.0
> **Creado:** 2026-10-15 por Claude
> **Contrato técnico:** [AGENCIA_CREATIVA_ELEMENTOR_MODULES_V1.md](../../architecture/public-site/AGENCIA_CREATIVA_ELEMENTOR_MODULES_V1.md)

**Publicado y verificado el 2026-10-15.** El cuerpo de `https://efeoncepro.com/agencia-creativa/` (página
`249582`, publicada e indexada) se reemplazó por el diseño de canvas aprobado por el operador, como 15
widgets nativos `greenhouse_creativa_*`, uno por contenedor full-width. Header/footer Ohio sin cambios;
`/agencia-creativa-v2/` (`251279`) sin cambios ni redirección.

## Identidad de la mutación

| Dato | Valor |
| --- | --- |
| Página | `249582` |
| Hash antes | `cdc078d25a3ba71df65e3597ba8354f3aa3b826e061ebdf5dd61e31f90c01c90` |
| Hash después | `3b8e8e03070a5ca22066dd78552ab3af96e64bba631fac463f0f7aca045a56ad` |
| Snapshot de rollback | `_gh_creativa_before_20261015_143257` (elements, settings, metas) |
| Snapshot del intento fallido | `_gh_creativa_before_20261015_142950` |
| Runtime | commit `8ed6626`; loader desplegado vivo **sin commit** (comparte archivo con WIP ajeno) |
| Greenhouse | commit `c7aac361e`; formulario publicado aparte en `fa62b4fdd` |
| Contrato de paquete | `creativa-elementor-release.v1` |
| Carril | `pnpm public-website:ssh-check` → `pnpm public-website:wpcli -- --eval-file … --input-file … --wp-user 12` |

Metas Ohio aplicadas con el mismo contrato que Home/v2 (título y breadcrumbs ocultos, sin wrapper ni top
padding, márgenes full-width `0px`, logo `light_variant`, menú custom con texto `rgba(255,255,255,0.78)`).
Page settings: `hide_title=yes` y `custom_css` desde `page-custom.css`. `_thumbnail_id=249672` restaurado.
Yoast intacto.

## Incidente del primer intento

| Momento | Hecho |
| --- | --- |
| Publicación 1 | El publisher tomó el snapshot `_gh_creativa_before_20261015_142950` y llamó `Document::save` |
| Falla | Fatal `TypeError: array_merge(): Argument #2 must be of type array, string given` en `elementor/includes/managers/controls.php:846`, módulos `portafolio` y `equipo`: un campo media/video de repeater ausente de la fila 1 recibió default string |
| Estado parcial | `Document::save` ya había escrito los page settings (58 claves, incluido el `custom_css` nuevo sobre el layout **viejo**), borrado `_thumbnail_id` y descartado `_elementor_controls_usage`. `_elementor_data` quedó intacto |
| Recuperación (~2 min) | Restaurados page settings, controls usage y thumbnail desde `_gh_creativa_before_20261015_142950`; verificado igual al snapshot; purga |
| Corrección | La clase base fuerza defaults array en media/video; el stub de prueba rechaza defaults no-array en URL/Media (raíz y repeaters); el publisher hace preflight de controles y render de todos los widgets antes de escribir |
| Publicación 2 | Limpia; hash final `3b8e8e03…a56ad` |

Lecciones: `Document::save` escribe settings antes que elements, así que un error de controles deja la
página a medio escribir; el preflight debe ocurrir antes de cualquier escritura; Elementor elimina
`_thumbnail_id` al guardar y hay que restaurarlo.

## Verificación en vivo

- Desktop 1440 y móvil 390: `scrollWidth == clientWidth`.
- Los 15 módulos renderizan con su media.
- Tabs operan con clic y flechas; copias de loop del marquee presentes.
- El formulario `efeonce-creative-diagnostic` renderiza desde el contrato gobernado; CTA `#0375db` tras
  corregir el override de tokens (antes salía teal `#36c8bf`).
- Reduced motion: animaciones `none` y 0 de 15 videos reproduciéndose.
- Exactamente un `h1`.
- Hashes de Home y v2 sin cambios; chrome global sin cambios.
- Local: `php tests/creativa-modules.test.php` (15 módulos, 188 checks de campos editables, repeaters,
  escaping, URL, medidor, embed y fallback del formulario).

## Límites

- **Envío real pendiente:** ningún envío humano desde navegador todavía (Turnstile bloquea la
  automatización). No se afirma `form_destination_attempt=succeeded` ni se cambió la fila del TRACKING-PLAN.
- **Fidelidad del formulario frente al canvas** (verificado en código y en vivo): una columna, selects en
  «¿Qué te frena hoy?» y «¿Cuándo quieres partir?», sin iconos, checkbox de consentimiento del renderer y
  URL de privacidad cruda. La mayor parte es **configuración**: la versión publicada usa `select` y no
  declara iconos, aunque el renderer soporta `type: 'radio'` como tarjetas (`ghf-choice-group--cards`) y
  `presentation.icon`; las dos columnas se activan con `@container (min-width: 520px)` y el formulario
  midió 516 px dentro de la tarjeta host de 588 px (36 px de padding); la URL cruda es copy del formulario.
  Brechas reales del renderer: look exacto de chip/pill, checkbox estilo AXIS `axis-choice` y listbox custom
  más allá de `country_select`. Remediación (versión nueva con radio + iconos conservando los valores de
  opción, más ajuste de la tarjeta host) **no ejecutada**.
  *Corrección 2026-10-15:* el renderer de producción sólo dibujaba `radio` como tarjetas con `hubspot_pillar`
  (con `diagnostic_premium` salía una caja vacía). Los íconos de etiqueta salían como texto en WordPress y la URL
  cruda la pintaba el renderer. Arreglado en Greenhouse `ab622e958`, pendiente de release; ver los deltas finales.
- **Contenido sin validar por el operador:** cifra Sky 94 % (el caso publicado dice 88 %; la nota al pie
  cita «caso publicado de Sky Airline, métricas de entrega de 12 meses»); permisos de uso de trabajo de
  Sky, Berel, GORE, Bresler, Eusari, Marca Chile y Pabellón y de la imagen/videos del avión Sky; claims
  «nada más que firmar», «aunque no trabajemos juntos» y «Sin compromiso».
- **Yoast:** título «Agencia Creativa en LATAM» y descripción con «más de 120 marcas» sin actualizar.
- **Editor:** no se probó editar, guardar y recargar desde la interfaz Elementor.
- **Versionado:** el loader vivo no está en el commit runtime; reconstruir desde git no reproduce el vivo.
- Los tar de `/tmp` del deploy son temporales.

## Delta — SEO y datos estructurados (2026-10-15)

- **Yoast (dueño de WebPage/WebSite/Organization/BreadcrumbList):** title «Agencia creativa que escala tu equipo de marketing | Efeonce», metadescripción y OG/Twitter nuevos (antes: «Agencia Creativa en LATAM», «más de 120 marcas» y una descripción de Twitter de pauta pagada, de otra página). Script `scripts/public-website/configure-creativa-seo.php` (guard de valores previos, snapshot `_gh_creativa_seo_before_20261015_162951`, readback, indexable, purge). `og:image`/`twitter:image`: imagen nueva 1200×630 (adjunto `251964`, `efeonce-agencia-creativa-og.png`), compuesta desde `scripts/public-website/creativa-source/og/og.html` con la foto del hero y el logo oficial y asignada con `set-creativa-og-image.php` (snapshot `_gh_creativa_og_before_20261015_163501`); `_thumbnail_id` 249672 intacto.
- **JSON-LD de página** (lo emite el módulo `preguntas`, declarado en su schema `structuredData`): `Service` `#service` (provider y mainEntityOfPage por `@id` hacia las entidades de Yoast; nombre, tipo, descripción, audiencia y países editables en «Datos y conexión») + `FAQPage` `#faq` generado en el render desde las mismas filas visibles (12/12 verificadas). `JSON_HEX_TAG` evita cortar el `<script>`. Ningún otro módulo emite schema; no hay Organization, rating, oferta ni VideoObject propios.
- **On-page:** la etiqueta decorativa del cursor («Karo · dirección de arte») salió del texto del H1 (vive en `data-label` + `::after`, editable); H1 servido: «¿Mi equipo da para más? Mucho más». La foto del hero (LCP) carga con `fetchpriority="high"` y `loading="eager"`.
- **Ojo al recompilar:** cambiar la estructura del canvas renumera los campos (`fNNN_*`). Hoy los widgets usan los valores por defecto; si alguien edita contenido en Elementor y luego se recompila con cambios estructurales, esas ediciones quedan huérfanas.
- **Fuera de alcance, con evidencia:** `og:locale=es_ES` y el nombre de WebSite «Efeonce - Agencia de Inbound & Loop Marketing» son globales de Yoast; la v2 (`/agencia-creativa-v2/`, indexada) compite por la misma intención con el title «Agencia creativa para equipos de marketing» y su Service apunta a `#webpage`, que no existe en el grafo de Yoast. Los países de `areaServed` salen de la imagen de clientes y conviene confirmarlos. Sin Rich Results Test ni GSC todavía.

## Delta 2026-10-15 — Separación de intenciones con la v2

- Semrush CL (2026-10-15): «agencia creativa» 140/mes (KD 44); «creatividad a escala» y «contenido a escala» sin volumen; «producción creativa» 20; «producción audiovisual» 320 (KD 28, sin landing propia: oportunidad).
- **/agencia-creativa/** conserva «agencia creativa» (capacidad que se suma al equipo). **/agencia-creativa-v2/** pasa a «producción creativa a escala»: Yoast title «Producción creativa a escala para tu equipo | Efeonce», metadesc/OG/Twitter nuevos, focus «producción creativa», OG nueva (adjunto `251965`, fuente `creativa-source/og/og-v2.html`, BRÍO en cuatro formatos); script `configure-creative-v2-seo.php`, snapshot `_gh_creative_v2_seo_before_20261015_164113`.
- Widget v2 (`class-eo-creative-landing-module-widget.php`, desplegado con `build-creative-v2-widget-package.cjs` + `deploy-creative-v2-widget.php`, backup `/tmp/eo-creative-v2-widget-before-20261015-163953.tar`): H1 «Creatividad a escala que puedes ver operar.», fila índice «Producción creativa a escala», Service «Producción creativa a escala» con `mainEntityOfPage` al `@id` real de Yoast (antes `#webpage`, inexistente), y enlace desde su FAQ hacia /agencia-creativa/.
- Enlace recíproco: el módulo `formatos` de /agencia-creativa/ suma «Mira cómo producimos a escala →» hacia la v2 (fuente `Main.dc.html` recompilada).
- Verificado en HTML público: títulos distintos, OG nuevas servidas, grafos sin referencias colgando en ambas, enlaces cruzados, scrollWidth = viewport a 1440 y 390.

## Delta 2026-10-15 — /agencia-creativa-v2/ reconstruida con el mismo sistema de módulos

- **Qué cambió:** la v2 (página `251279`) dejó el widget `greenhouse_creative_landing_module` y ahora son 11 widgets
  `creativaModule.v1`, compilados desde el canvas aprobado «Creatividad a escala» (`creativa-source/Escala.dc.html`):
  `escala-hero`, `escala-problema`, `escala-motor`, `escala-cadena`, `escala-metricas`, `escala-logros`, `escala-studio`,
  `escala-campana`, `diagnostico` y `cierre` (compartidos con /agencia-creativa/) y `escala-faq`.
- **Mensaje:** cómo se escala la producción (un sistema, no más gente), qué se mide (FTR, RpA, OTD, CT, TTM), cómo se mide
  (registro de cada pieza en Creative Studio) y el resultado: menos tiempo de producción, Time-to-Market más corto, la marca
  intacta, con IA. Se conservan las animaciones del hero (lienzo) y del motor «Cómo trabajamos contigo»; el spot de
  producción con IA es un loop recortado (sin el contador ficticio ni la tarjeta Globe) y el video anterior se mantiene.
- **Código:** el compilador arma ambas landings (`LANDINGS`); las claves de módulo admiten guion y el widget se registra
  como `greenhouse_creativa_escala_*`; el CSS de la v2 es el subconjunto del canvas tras el marcador `/* ---- v2`, añadido al
  CSS generado. El allowlist del deploy acepta schemas con guion.
- **Publicación:** `publish-creative-v2-page.php` + custom CSS `creativa-source/page-custom-v2.css`. Snapshot
  `_gh_creative_v2_before_20261015_182612`; hash previo `84804acc…`, nuevo `83124650…`; thumbnail `249740` restaurado
  (Elementor lo borra al guardar); Home y 249582 sin cambios; chrome global sin cambios. Paquete de plugin con backup
  `/tmp/eo-creativa-widgets-before-20261015-182327.tar` en Kinsta.
- **Verificado en vivo (1440 y 390):** 200, 11 widgets en orden, 0 tokens `%%…%%` sin resolver, `scrollWidth = clientWidth`,
  un `h1`, los dos videos reproduciéndose, logo de Sky, formulario montado, JSON-LD Service «Producción creativa a escala» +
  FAQPage 6/6, sin errores de consola.
- **Trampa de QA:** Elementor «lazy load background images» aplica `background-image:none !important` a todo contenedor
  sin `e-lazyloaded`. Una captura fullPage rápida muestra el muro de logros sin velo y las pantallas de Creative Studio
  vacías; con scroll real hasta cada sección el velo y las imágenes cargan. Verificar así antes de reportar un fallo.
- **Rollback:** restaurar el snapshot con `Document::save` (elementos + settings + metas) y purgar. El widget legacy sigue
  registrado.
- **Pendiente:** el cargador `class-eo-widgets-loader.php` está desplegado con las 24 clases, pero no está commiteado en el
  repo runtime porque el archivo contiene WIP de otras sesiones; quien commitee ese archivo debe conservar la entrada creativa.

## Delta 2026-10-15 — Diagnóstico: formulario en dos columnas y estilos del formulario en dos pasos

Aplica al módulo compartido `diagnostico`, así que cubre `/agencia-creativa/` (`249582`) y `/agencia-creativa-v2/`
(`251279`). Ambos cambios son CSS de host (`creativa-source/host.css`, compilado a
`eo-elementor-widgets/assets/css/creativa-landing.css`); no se tocó el documento Elementor ni la versión del formulario.

**1. Formulario en dos columnas (en vivo).**

- **Problema:** la tarjeta dejaba el `<greenhouse-form>` en 516 px, bajo el umbral de 520 px del contenedor del
  renderer; los 8 campos quedaban apilados (1.668 px de alto) junto a una columna izquierda vacía de ~1.400 px.
- **Arreglo:** desde 1200 px la sección es una grilla `.82fr / 1.18fr` con la columna del plan `position: sticky;
  top: 120px`; bajo 1200 px ambas columnas se apilan y el formulario usa todo el ancho.
- **Resultado medido:** formulario a 622 px, dos columnas, 1.182 px de alto; sección de 2.190 a 1.704 px.
- **Verificación:** en vivo en las dos páginas a 1440, 1100 y 390, `scrollWidth = clientWidth` (sin scroll horizontal).
- **Evidencia:** Greenhouse `c7da93cce`; runtime `d960ab6`; backup del plugin
  `/tmp/eo-creativa-widgets-before-20261015-192918.tar` (Kinsta, temporal).

**2. Estilos del diseño en dos pasos (en vivo, compatibles hacia adelante).**

- **Diseño:** canvas «Formulario.dc.html» aprobado por el operador (artifact de diseño de la landing). Paso 1 «Tu
  operación» con opciones visibles; paso 2 «Tus datos» con íconos; acción naranja a todo el ancho; legal en una línea.
- **Qué ya rige con la versión actual del formulario:** acción naranja a todo el ancho mediante tokens
  (`--ghf-accent:#ff6500` sobre `.ghf-actions`, sin `!important`) y bloque legal reordenado (checkbox, aviso, enlace
  de privacidad).
- **Qué se activa solo al publicar la versión con `radio`:** tarjetas de opción (la seleccionada en navy), píldoras
  para `[data-ghf-field-key="marketingTeamSize"]` y `[data-ghf-field-key="startTimeline"]`, y resumen de intake oculto.
- **Verificación:** en vivo en las dos páginas.
- **Evidencia:** Greenhouse `1f3a16858`; runtime `f850dbe`; backup del plugin
  `/tmp/eo-creativa-widgets-before-20261015-221410.tar` (Kinsta, temporal).

**3. Publicación de la versión en dos pasos: pendiente.**

- **Bloqueo:** antes del arreglo del renderer de Greenhouse `ab622e958`, un `radio` fuera del estilo `hubspot_pillar`
  se dibujaba como una caja de texto vacía. Ese commit también cambia el enlace de privacidad por un texto legible
  (hoy se sigue viendo la URL completa) y pasa los íconos de etiqueta a SVG. Llega con la próxima publicación de
  Greenhouse a producción.
- **Activación:** `npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/activate-creative-diagnostic-two-step.ts`
  (dry-run) y luego `--apply`. Clona la versión publicada `fver-79bbb3b4…` y se niega a publicar si el renderer de
  producción no trae `ab622e958`.
- **Después de publicar:** revincular la política de medición publicitaria a la versión nueva con
  `pnpm --silent growth:measurement` y verificar en vivo las dos landings.
- **Dirección:** el renderer de Growth Forms pasa a AXIS y se publica por el carril de entrega de EPIC-035
  ([TASK-2038](../../tasks/to-do/TASK-2038-growth-forms-renderer-on-axis.md)).
