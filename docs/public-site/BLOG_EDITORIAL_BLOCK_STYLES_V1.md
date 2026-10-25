# Estilos editoriales del blog (bloques nativos de Gutenberg)

> **Tipo de documento:** Contrato de diseño y uso
> **Versión:** 1.8
> **Creado:** 2026-10-24 por Claude, a partir de la revisión del operador sobre los posts de inbound, paid media y topic clusters
> **Código:** plugin `efeonce-editorial-blocks`, carpeta `includes/editorial/` (repo `efeonce-public-site-runtime`). Estilos desde 0.4.0 (`f9b0d4d`); diseño vigente 0.4.2 (`710f0d1`); línea por post 0.4.3 (`cab3864`). Las versiones 0.4.4 a 0.5.9 no cambian estos estilos; **0.6.0** (`cd1fe57`, 2026-10-25) suma la Tabla Efeonce, el Destacado v2 y el bloque de código; **0.8.0** (runtime `61251d1`, en producción desde el 2026-10-25) rehace el Destacado y suma Destacado claro, Cita y Cita clara
> **Documentación funcional:** [recetas de autoría Gutenberg](../documentation/public-site/gutenberg-post-authoring-recipes.md) · **Manual:** [operar la Content Factory](../manual-de-uso/public-site/operar-public-site-content-factory.md#estilos-editoriales-y-preguntas-frecuentes) · [usar Destacados y Citas](../manual-de-uso/public-site/usar-destacados-y-citas.md)
> **Estado:** en producción desde el 2026-10-24 (§En producción)
> **Relacionado:** [preguntas frecuentes](BLOG_FAQ_BLOCK_ANALYSIS_V1.md) · `docs/documentation/public-site/gutenberg-post-authoring-recipes.md`

## Por qué existe

El operador revisó los tres posts refrescados el 2026-10-24 y los encontró sin estilo y sin aprovechar Gutenberg.
Ese día se midieron cuatro problemas:

- Ohio casi no le da estilo a los bloques nativos: el pullquote sale entre dos líneas negras gruesas, con texto chico y
  una barra gris encima; la lista es una lista.
- Los posts eran casi sólo párrafos.
- Las imágenes quedaban alineadas a la izquierda.
- Al pasar el mouse sobre una mención, el texto desaparecía.

La guía de recetas ya pedía bloques de enriquecimiento, pero Ohio no les daba ningún diseño.

## Estilos (registrados como estilos de bloque; sin bloques nuevos ni JavaScript)

| Estilo | Bloque | Clase | Uso | Content Factory |
|---|---|---|---|---|
| Destacado Efeonce / Destacado claro | `core/pullquote` | `is-style-efeonce-destacado` (navy) · `is-style-efeonce-destacado-claro` (papel) | La tesis en la que se apoya una sección. Una o dos por post, nunca seguidas, y sin repetir la oración que tiene al lado (se saca del párrafo). Sin comillas: anillo al inicio, esfera en vez del punto final, el remate en `strong` | `{ "kind": "pullquote", "text", "tone"?: "light" }` |
| Cita Efeonce / Cita clara | `core/pullquote` | `is-style-efeonce-cita` (navy) · `is-style-efeonce-cita-clara` (papel) | Una cita real, de alguien con nombre: comillas en su columna y autoría bajo una línea fina | `{ "kind": "pullquote", "variant": "cita", "text", "cite", "tone"? }` (`cite` obligatorio) |
| Pasos | `core/list` ordenada | `is-style-efeonce-pasos` | Las secciones «paso a paso»: número grande (28 px, 24 px en el celular) en el acento de la línea, sin disco; líneas entre pasos y el arranque en negrita | `{ "kind": "list", "ordered": true, "style": "steps" }` |
| Recuadro | `core/list` | `is-style-efeonce-recuadro` | Un conjunto corto que conviene ver de una vez: errores frecuentes, «tres cosas», las invitaciones del cierre (Glitch → herramienta, orden de PDR-020) y el mapa de un cluster | `{ "kind": "list", "style": "box" }` |
| Tabla Efeonce (0.6.0) | `core/table` | `is-style-efeonce-tabla` | Comparaciones y plantillas. La primera columna nombra lo que compara cada fila y los encabezados van cortos, porque en el teléfono son la etiqueta de cada dato | `{ "kind": "table", "style": "efeonce" }` |
| Imagen centrada | `core/image` | `aligncenter` (alineación de core) | Diagramas e ilustraciones más angostos que la columna | `{ "kind": "image", "align": "center" }` |

**Diseño** (desde 0.4.2, revisado con la skill `efeonce-graphic-line` el 2026-10-24).

- **Colores sólo de `efeonceGraphicLine`:**
  - navy `#023c70` para el texto sobre papel y blanco sobre oscuro;
  - papel `#f7f8f6` para el Recuadro, y el oscuro de Efeonce `#001a33` en modo oscuro;
  - el acento de la línea del tema del post.
- **La línea del tema** la publica el plugin en cada post como `--eo-line-on-light` / `--eo-line-on-dark`. Usa la misma
  regla y el mismo mapa que la portada (`EO_Home_Readers::topic_of` sobre `EO_CM_Util::TOPICS`), así que el artículo y
  su tarjeta llevan el mismo color. Es la regla de Marketing con Manzanitas: el acento es el de la línea del tema. Sin
  post (editor u otras páginas), el respaldo es Engine `#0375db`.
- **El acento sólo va en gráfico (≥ 3:1) o en texto de 24 px o más.** Por eso:
  - la pregunta de la FAQ queda en navy (blanco en oscuro), y el acento va en el anillo y la ×;
  - el número de Pasos va a 28 px (24 px en el celular) en el acento, sin disco de fondo.
- **Sin esferas de adorno.**
  - *Reemplazado por 0.8.0 (§0.8.0): el Destacado ya no lleva comillas ni DM Sans, y en oscuro queda en `#001a33`.*
    El Destacado (v2, 0.6.0) era un panel oscuro que corta la página clara: fondo `#001a33` (navy `#023c70` con el tema
    en oscuro), radio de 24 px, un halo suave del acento en la esquina superior y comillas vectoriales de 52 px en el
    acento sobre oscuro. Son puntuación, no una esfera. El texto va en blanco, DM Sans 600 de 26 a 40 px (24 px en el
    celular), con un ancho de 26 caracteres, balanceado, y la fuente opcional en mayúsculas chicas. Reemplazó a la
    barra de 48 × 3 px de 0.4.2, que el operador encontró muy simple (2026-10-25).
  - La viñeta del Recuadro es un guion corto en tinta.
  - El anillo de la FAQ nunca se rellena.
  - La esfera significa «lo decidido»: va una por pieza y nunca como viñeta.
- **La tipografía sigue la del artículo de Ohio** (DM Sans e Inter). Pasar a Bricolage y Poppins queda para cuando se
  migre la plantilla completa del artículo (decisión del operador, 2026-10-24). Excepción desde 0.8.0: el Destacado y
  la Cita van en Bricolage.

**Tabla Efeonce** (0.6.0, 2026-10-25). El operador pidió tablas que no se pegaran al borde derecho en el celular y con
más presencia:

- Panel papel `#f7f8f6` (oscuro `#001a33` con el tema en oscuro), borde fino, radio de 20 px y margen interior de 28 px
  (20 px en el celular): ninguna celda toca el borde de la columna.
- Encabezado en DM Sans 700 de 16 px en navy, con una regla de 2 px en el acento de la línea debajo. Es el único acento,
  y es un gráfico. Reemplaza la barra negra de Ohio.
- Sin rayas: filetes de 1 px entre filas, 16 px de aire, la primera columna en 600 y cifras en `tabular-nums`.
- **Bajo 600 px cada fila es una tarjeta.** La primera celda es el título (DM Sans 700, 18 px) y cada celda siguiente
  muestra arriba el nombre de su columna en mayúsculas chicas. El nombre lo copia el plugin del encabezado a
  `data-label` al renderizar (`EO_Editorial_Styles::label_table_cells`, filtro `render_block_core/table`), así que el
  contenido guardado no cambia. Una tabla sin encabezado o con otro estilo sale intacta.
- La leyenda va dentro del panel, en 13 px, separada por un filete.

## Growth CTA (bloque `efeoncepro/growth-cta`, 0.7.0)

**Qué es.** Un bloque dinámico que **ubica** un CTA gobernado de Greenhouse dentro de un artículo. El texto, la acción,
las versiones, el freno de emergencia y la medición viven en el motor Growth CTA (`src/lib/growth/ctas/`); el artículo
sólo guarda el slug, la ubicación de medición y, opcional, la frase del titular que va en negrita. Content Factory lo
emite con `{ "kind": "growthCta", "cta": "blog-aeo-assessment", "emphasis": "¿aparece tu marca?" }`.

**Cómo llega al navegador.** `render.php` imprime `<greenhouse-cta>` con la superficie del blog que guarda la opción
`eo_growth_cta_blog` (superficie, llave, slugs permitidos y superficie del formulario). Sin superficie válida, o con un
slug que la superficie no permite, no imprime nada; el renderer también se oculta si el motor no devuelve el CTA. El
renderer es el mismo archivo que cargan el menú y las landings (`renderer-latest.js`), así que no se carga dos veces.

**Diseño: receta AXIS «De marca»** (aprobada el 2026-10-05; piel del host en `src/growth-cta/style.css`):

- panel navy `#001a33` (navy `#023c70` con el tema en oscuro), radio de 24 px y un halo del acento de la línea del post;
- etiqueta en Poppins 500 en mayúsculas con un **anillo** de contorno en el acento;
- titular en Bricolage Grotesque 400 de 30 a 46 px, con **una** frase en 700 y la **esfera** del acento al final
  (es la única esfera de la pieza);
- texto en Poppins 16 px; a la derecha, separado por un filete, el botón teal `#36c8bf` con flecha y la nota corta;
- en el celular todo va en una columna y el botón ocupa el ancho;
- el formulario se abre **dentro** de la tarjeta, sobre una hoja blanca, y la etiqueta, el titular y el texto quedan
  arriba. `Escape` lo colapsa sin registrar rechazo (regla del motor).

**Logo del producto y tono (0.7.1, 2026-10-25).**

- `mark: "aeo-assessment"` muestra el lockup oficial «Efeonce | AEO Assessment» (copia byte de
  `@efeoncepro/axis-brand-assets` 0.4.25, negativo en la tarjeta oscura y positivo en la clara) **en lugar** de la
  etiqueta y su anillo, como pide La órbita: el lockup reemplaza la etiqueta, nunca se suma. La O del lockup ya lleva la
  esfera, así que el titular deja la suya: una esfera por pieza. Lista cerrada en `EO_Growth_Cta::MARKS`.
- `tone: "light"` es la versión clara: papel `#f7f8f6`, tinta navy, el acento de la línea sobre papel, halo más suave y
  el mismo botón teal. Sigue clara aunque la página esté en modo oscuro. El formulario abierto va en una hoja blanca
  con borde fino.

La negrita del titular la aplica `host.js` sólo si la frase aparece exacta y una vez (misma regla que
`content.headlineEmphasis` de AXIS); si no calza, el titular queda en 400 y nada se rompe.

**Primer CTA:** `blog-aeo-assessment` («Efeonce AEO Assessment»): botón «Hacer mi assessment» → formulario
`efeonce-aeo-diagnostic`, el de `/aeo-2/`, que corre el AI Visibility Grader, envía el informe por correo y crea el
contacto en HubSpot. Las corridas públicas del Grader usan ChatGPT, Gemini, Perplexity y Google; por eso el texto los
nombra. Medición: fila `blog-aeo-assessment` del plan de medición.

**En producción (0.7.0, 2026-10-25 13:40 UTC).** Desplegado por `blog-home deploy content-model --apply` (sólo los
archivos del bloque, el main y el readme); opción `eo_growth_cta_blog` guardada con `set-blog-growth-cta.php`. Probado en
vivo en la página de prueba `/greenhouse-cta-prueba/` (no indexada; snapshot `_gh_gcta_test_20261025_134046`; bloques
retirados el 2026-10-25, ya en vivo en `/aeo/seo-y-aeo/`) a 1440 y
390 px: tarjeta navy con Bricolage y la frase en 700, formulario real abierto dentro de la tarjeta, medición
`greenhouse_cta_viewed` → `clicked` → `form_opened` y `gh_form_viewed`, sin errores ni scroll horizontal. 0.7.1 (13:55 UTC) suma el
logo y el tono claro; las dos versiones se verificaron en vivo en la misma página a 1440 y 390 px. Falta un envío real
del formulario (sólo lo puede hacer una persona, por Turnstile).

**Reglas:** un Growth CTA por artículo, después de la respuesta principal y antes de las preguntas frecuentes o del
cierre. Nunca se escribe texto, enlaces ni formularios dentro del bloque. Re-correr el publicador rota la llave:
repetir `set-blog-growth-cta.php` en la misma sesión.

## Ajustes de Ohio (`ohio-host.css`, sólo en el sitio)

Sólo neutralizan o completan lo que el tema le hace al marcado nativo:

1. **Mención.** El subrayado de Ohio al pasar el mouse (`.links-underline a:not(.button):not(.tag):not(.-undash):hover`,
   especificidad 0,5,1) le ganaba a la regla de AXIS (0,3,1) y tapaba la píldora con un degradado navy del alto
   completo. La copia de AXIS no se toca: el ajuste sólo apaga el efecto de Ohio.
2. **Imágenes centradas.** WordPress centra `figure.aligncenter` sólo en temas de bloques; en Ohio la imagen quedaba a
   la izquierda.
3. **Mención en modo oscuro.** El contenido declara `data-surface="light"`. Con el tema en oscuro, la tinta y el fondo
   toman los valores de superficie oscura mediante las variables del contrato. El color de la línea no cambia.
4. **Tabla rayada en modo oscuro.** Core pinta las filas impares `#f0f0f0` y Ohio pone el texto en blanco, así que no
   se leía. Las rayas pasan a una franja translúcida.

5. **Enlaces del artículo en modo oscuro** (0.4.1). Las opciones del tema fijan `--clb-color-link` en navy `#022a4e`
   sobre el propio enlace (`.page-content a:not(.-unlink):not(.tag)`, 0,3,1) y no tienen valor para oscuro, así que
   quedaban a 1,3:1. Desde 0.4.2, dentro del cuerpo del artículo y en oscuro, los enlaces van en **blanco y
   subrayados**: el acento no va en texto de menos de 24 px, así que el enlace se marca con el subrayado y no con el
   color. En 0.4.1 eran azure claro `#6cb4ff`. El modo claro, las menciones y los botones no cambian.

6. **Código del cuerpo del artículo** (0.6.0). Ohio pintaba el `pre` y el `code` con el mismo gris al 8 % y un borde
   gris: una caja gris dentro de otra. Ahora es un panel oscuro (`#001a33`, navy con el tema en oscuro), texto claro en
   monoespaciada de 14 px (13 px en el celular), radio de 16 px y las líneas como se escribieron, con scroll horizontal
   dentro del panel en el celular. Aplica a todo `pre.wp-block-code` dentro de `.entry-content`.

## Reglas para quien escribe

- No publicar posts hechos sólo de párrafos y listas: cada post lleva al menos un Destacado, y Pasos cuando hay un
  paso a paso.
- Un Destacado no repite el párrafo de al lado: la oración sale del párrafo y queda sólo en el Destacado.
- Un Recuadro tiene entre 2 y 6 ítems cortos; una lista larga de definiciones queda como lista normal.
- Las tablas nuevas van con la Tabla Efeonce. Encabezados cortos: en el celular son la etiqueta de cada dato.
- Las imágenes cuadradas o diagramas angostos van con `align: "center"`.
- Las menciones siguen siendo para servicios y productos de Efeonce. En el blog se usan pocas y en el cierre; el resto
  van como enlaces normales.

## En producción (2026-10-24)

**Plugin.** Se desplegó coordinado con la sesión de la portada del blog, que no tenía nada en vuelo. Se usó
`pnpm public-website:blog-home deploy content-model`, con baseline fresco, dry run y luego `--apply`.

- El paquete llevó sólo `includes/editorial/*` nuevos, más el main y el readme.
- El flag de la portada se apagó y volvió a 1 en el mismo paso; queda registrado en el ledger
  `scripts/public-website/blog-home/ledger/2026-10.jsonl`.
- Los hashes en vivo son idénticos al commit y los cuatro estilos de bloque quedaron registrados.

**Posts.** Se reemplazó sólo `post_content` desde el render de cada spec, con
`scripts/public-website/blog-post-content-republish.php`:

- primero dry run, después apply con guarda de `post_modified_gmt` y sha256;
- el FAQ del plugin quedó idéntico antes y después;
- título, slug, fecha, autor, excerpt, términos y metas no cambiaron.

| Post | Destacados | Pasos | Recuadros | Imágenes centradas | Snapshot de rollback |
|---|---|---|---|---|---|
| 244765 inbound | 2 | 1 | 2 | 2 | `_gh_post_republish_244765_20261024_154722` |
| 245605 paid media | 2 | 1 | 2 | 1 | `_gh_post_republish_245605_20261024_154723` |
| 245154 topic clusters | 2 | 1 | 2 | 0 (sin imagen todavía) | `_gh_post_republish_245154_20261024_154724` |

**QA en vivo.** Los tres responden 200, sin errores de PHP ni de JS, sin scroll horizontal a 1280 ni a 390, y en claro
y oscuro:

- un solo `FAQPage` con sus 5 preguntas;
- el Destacado sin las líneas negras de Ohio, en 33 px en escritorio y 24 px en el celular;
- los números de Pasos y el panel del Recuadro presentes, también en oscuro;
- las imágenes con el mismo margen a ambos lados;
- la mención sin el degradado de Ohio al pasar el mouse.

`pnpm public-website:blog-home verify --browser` quedó verde en los ocho anchos. El primer intento falló por un
timeout de red y el segundo pasó.

**Nota de render.** WordPress sirve la imagen centrada como `div.wp-block-image > figure.aligncenter` (formato de tema
clásico), y core ya centra esa forma. La regla de `ohio-host.css` cubre la forma guardada (`figure.wp-block-image.aligncenter`).

**Pendiente:**

- Diagrama nuevo para topic clusters: el anterior mostraba «efeonce.cl».

**0.4.1 (2026-10-24, 16:04 UTC).** El operador lo aprobó viendo la vista previa. Se coordinó con las sesiones de la
portada y de correos y eventos, que no tenían nada en vuelo, y se desplegó por el mismo carril. El paquete cambió sólo
el main, el readme y `ohio-host.css`. Los hashes en vivo son iguales al commit `a7503e9`, el flag volvió a 1 y el CSS
se sirve como `?ver=0.4.1`.

QA en vivo: en modo oscuro todos los enlaces normales del cuerpo pasan a `#6cb4ff` en los cuatro posts revisados,
incluido uno no refrescado («Qué es Loop Marketing»). El modo claro sigue en `#022a4e`, las menciones quedan en blanco,
no hay errores ni scroll horizontal, y `blog-home verify --browser` pasó con 14 de 14.

**0.4.2 (2026-10-24, revisión con La órbita).** El operador pidió revisar los estilos con `efeonce-graphic-line` y
aprobó los ajustes 1 a 6 viendo la vista previa:

1. Recuadro sin esferas como viñeta.
2. Destacado sin la línea con esfera.
3. El acento fuera del texto chico.
4. Colores de los tokens.
5. El color del tema del post.
6. El anillo de la FAQ sin relleno.

Se coordinó con las sesiones de la portada y de correos y eventos, y se desplegó por `blog-home deploy content-model`.
Los hashes en vivo son iguales al commit `710f0d1`, el flag volvió a 1 y el CSS se sirve como `?ver=0.4.2`.

QA en vivo (claro y oscuro):

- Los tres posts refrescados publican la línea Growth (`#0e8c82` / `#36c8bf`), un post de AEO publica Engine y uno de
  HubSpot publica Revenue HubSpot.
- La pregunta va en navy o blanco, y el anillo en el acento, sin relleno.
- El número de Pasos va a 28 px en el acento, la barra del Destacado en el acento y la viñeta es un guion de 12 px.
- Los enlaces en oscuro van en blanco subrayado.
- Sin errores ni scroll horizontal.

`blog-home verify --browser` pasó 7 de 8 anchos dos veces. El de 1920 falló las dos veces al abrir la página, con
`ERR_CONNECTION_TIMED_OUT`, y verificado aparte con el mismo criterio pasa: una H1, el tablero de escritorio visible y
sin scroll.

**0.4.3 (2026-10-24): línea por tema decidida y línea por post.**

El operador decidió la línea de cada tema; el mapa `EO_CM_Util::TOPICS` usa sólo colores de línea del token:

| Tema | Línea |
|---|---|
| AEO, SEO, IA | Engine |
| HubSpot, Inbound | Revenue HubSpot (el menú del sitio pone Inbound en Revenue) |
| Diseño, Diseño Web, Redes Sociales | Brand; sobre papel `#bb1954`, porque `#ff6500` daba 2,95:1 |
| Loop, Growth, Marketing Digital, Novedades | Growth |

Una entrada cuya categoría no dice su línea (paid media es Voice y vive en Marketing Digital) lleva el meta
`_eo_line`. Se escribe sólo con `pnpm public-website:blog-home line <post> <línea|off>`, que muestra el plan, guarda
`before` como rollback, deja registro en el ledger y purga. **Nunca** se cambia la categoría principal: es parte de la
URL.

Hay un solo resolvedor para el artículo y su tarjeta, `EO_CM_Util::line_of`:

- el adapter de la portada lee el meta en `gather()` y lo aplica con `palette_for()`, que es pura;
- se agregó `update_meta_cache` para que el meta de todos los posts salga en una sola consulta.

Paridad PHP = navegador: 27/27. Se coordinó con las sesiones de la portada, de archivos y de correos y eventos.

**QA en vivo:**

- Artículos: paid media en Voice `#f83902`, topic clusters en Engine `#0375db`, inbound en Revenue HubSpot `#8e1b82`.
- Tarjetas: hoy esos posts no están en el slider ni en el rail. Con `gather()` real y la línea simulada en un post
  del rail, `map()` devuelve Voice sólo en la simulación.
- Nombre del tema seleccionado en la banda `#001a33`: 28 px en escritorio y 24 px en tableta, es decir, texto grande.
  Todos los acentos pasan 3:1 (el más bajo, Engine, 3,82:1). En el móvil va en navy sobre blanco.

**0.6.0 (2026-10-25, 12:11 UTC): Tabla Efeonce, Destacado v2 y código.** El operador aprobó la maqueta sobre el ICP y el
RUT reales y pidió desplegar. Se coordinó con las sesiones de la portada, de correos y eventos, del archivo, del plugin de
autor y de Analytics, que no tenían nada en vuelo, y se desplegó por `blog-home deploy content-model --apply`.

- El dry run contra la línea base viva cambió sólo el main, el readme y `includes/editorial/{class-eo-editorial-styles.php,
  editorial.css, ohio-host.css}`. El flag volvió a 1 y el CSS se sirve como `?ver=0.6.0`.
- Antes del despliegue, el filtro de etiquetas corrió en solo lectura dentro del WordPress real sobre las tres tablas
  del ICP y del RUT: puso las etiquetas esperadas y no cambió nada más. `tests/eo-editorial-styles.test.php` lo cubre
  con `WP_CORE_DIR` (32 checks).
- Posts: ICP (249108) y RUT (246024) pasaron sus tablas de `stripes` a `efeonce` con `blog-post-content-republish.php`.
  Sólo cambió la clase de las tablas y el FAQ quedó idéntico. Snapshots `_gh_post_republish_249108_20261025_121213` y
  `_gh_post_republish_246024_20261025_121213`.

QA en vivo, a 1440 y 390 px, en claro y oscuro: ICP, RUT, inbound, paid media, topic clusters, el tutorial de GA4 (el
otro post con código) y `/author/jreysgo/`.

- Todos responden 200, sin scroll horizontal y sin errores propios. En topic clusters hay un 404 de una miniatura
  `2026/02/Portada-Blog_AEO-500x500.webp` de un post relacionado, anterior a este cambio.
- El Destacado sale en `#001a33` y en `#023c70` en oscuro; la tabla, con 28 px de margen (20 px en el celular) y 48
  etiquetas en el ICP y 9 en el RUT; el código, en el panel oscuro.
- FAQ, Pasos y Recuadro siguen presentes en inbound; cada post refrescado tiene una sola `og:image:alt` y una sola
  `twitter:image:alt`; la cabecera del autor no cambió.
- `blog-home verify --browser` pasó los 8 anchos y 0 violaciones de accesibilidad.

**Rollback:** restaurar el `.tar` que imprimió el deploy (0.5.9) y, si hace falta, el contenido de los dos posts desde
sus snapshots. Las 13 tablas viejas del blog siguen en `stripes`; pasarlas es una decisión de contenido post por post.

## 0.8.0: Destacado y Cita (2026-10-25, aprobado por el operador; en producción)

**Por qué.** El operador: «no me gusta tanto… lo siento mal distribuido y como que le falta algo». El Destacado v2 usaba
comillas sin decir quién hablaba (la forma prometía una cita y el contenido era una tesis), dejaba la mitad derecha
vacía (26 caracteres por línea), ponía el halo en la esquina vacía y escribía todo en DM Sans 600, sin nada de La órbita.

**Qué cambia** (maqueta sobre el artículo real, aprobada; `includes/editorial/editorial.css`):

| Estilo | Para qué | Cómo se ve |
|---|---|---|
| Destacado Efeonce (`efeonce-destacado`) | La tesis de una sección | Panel navy con el halo de la línea desde la esquina superior (el degradado de siempre). Sin comillas. Anillo al inicio, esfera en el acento en lugar del punto final. Bricolage: 400 abre, `strong` (700) remata; sin `strong`, toda la frase en 700. Hasta 36 caracteres por línea |
| Destacado corto (automático, `is-eo-corta`) | Una tesis de hasta 80 caracteres | Lo agrega el render (`EO_Editorial_Styles::pullquote_classes`): la letra sube a 56 px |
| Destacado claro (`efeonce-destacado-claro`) | La misma tesis, más liviana en la página | Papel `#f7f8f6`, tinta navy, borde fino y halo suave del acento |
| Cita Efeonce y Cita clara (`efeonce-cita`, `-cita-clara`) | Una cita real con autoría | Comillas en su columna, Bricolage 400, autoría en `cite` bajo una línea fina (negrita para el nombre, enlace a la fuente). Content Factory exige `cite` |

**Reglas del render.** El filtro de `core/pullquote` sólo actúa sobre los dos Destacados: quita el punto final del
último párrafo (la esfera lo reemplaza); si la frase termina en «?», «!», «…» u otra puntuación, no hay esfera
(`is-eo-sin-esfera`). La Cita no se toca. Una esfera por pieza.

**Modo oscuro (opción A, elegida por el operador el 2026-10-25: «va más con la línea gráfica de Efeonce»).** El panel
navy queda en `#001a33` con borde fino, sin aclarar a `#023c70`: el acento de Engine `#0375db` da 3,82:1 sobre
`#001a33` y 2,43:1 sobre `#023c70`. La opción B (navy medio con anillo y esfera en blanco) fue descartada. Las
versiones claras pasan a `#023c70` con el anillo y la esfera en blanco y el halo del acento.

**Degradado.** Una primera versión movió el halo y lo debilitó; el operador lo rechazó («se ve horrible así», plano).
Todos los paneles conservan el halo amplio desde la esquina superior (120 % × 140 %, 22 % del acento; 14 % en papel).

**Posts publicados.** 12 Destacados en 7 posts (244765, 245154, 245605, 246024, 248463, 249108, 252108). Antes del
despliegue no tenían `strong`; ese mismo día se les marcó el remate (§En producción 0.8.0).

**Content Factory** (greenhouse-eo `d3316c718`). La spec es
`{ kind: 'pullquote', text, cite?, variant?: 'destacado' | 'cita', tone?: 'dark' | 'light' }`, con `text` y `cite` como
rich text: el remate va en un segmento `{ "text": "…", "strong": true }`. `variant: 'cita'` sin `cite` falla con
`content_factory_article_pullquote_cita_requires_cite`. Cómo elegir y escribir cada uno: el
[manual de Destacados y Citas](../manual-de-uso/public-site/usar-destacados-y-citas.md).

### En producción 0.8.0 (2026-10-25)

- **Plugin.** Runtime `efeonce-public-site-runtime` `61251d1`, desplegado con
  `pnpm public-website:blog-home deploy content-model --apply`.
- **Caché.** El despliegue del plugin **no** purga la caché de página de Kinsta: los posts siguieron con el HTML viejo
  hasta correr `kinsta cache purge --all` por WP-CLI. Después de cada despliegue de estilos, purgar y recién entonces
  hacer QA.
- **Posts.** Los 12 Destacados de los 7 posts quedaron con su remate en `strong`, con
  `scripts/public-website/blog-post-content-republish.php` (FAQ idéntico, snapshots
  `_gh_post_republish_<id>_20261025_16345x`). Las specs del repo (ICP, inbound, paid media, RUT, SEO y AEO, topic
  clusters) quedaron iguales a lo publicado.
- **Rollback:** restaurar el `.tar` que imprimió el deploy (la versión anterior), purgar la caché y, si hace falta,
  el contenido de cada post desde su snapshot.

## Gráfico Efeonce (bloque `efeoncepro/chart`, prototipo del 2026-10-25, NO desplegado)

Bloque dinámico para gráficos «fluidos» en los artículos: líneas (cambio en el tiempo) o barras (comparar o rankear).
Probado de punta a punta sólo en un WordPress local (Playground, WordPress 7.1): página publicada en escritorio y
390 px, editor de Gutenberg con vista previa en vivo, guardado sin «bloque inválido». **No está en producción**; el
despliegue necesita la aprobación del operador.

- **Quién dibuja.** El editor del bloque es React (Gutenberg). El visitante **no** carga React: el gráfico lo pinta
  ECharts (SVG, sólo líneas y barras), compilado en greenhouse-eo (`src/editorial-chart-renderer/`,
  `pnpm renderer:editorial-chart:build`) y escrito en el plugin como `src/chart/view.js` (cargador, 1 KB) y
  `engine.js` (~180 KB gzip). El cargador baja el motor sólo cuando un gráfico está a 300 px de la pantalla; la
  URL del motor lleva su huella (`engine.js?v=<sha>`), así que una versión nueva no depende de purgar caché.
- **Los datos están en el HTML.** `render.php` imprime título, bajada, una tabla con todas las cifras (en
  «Ver los datos») y la fuente; el gráfico se pinta encima con el mismo JSON. Google y los motores de respuesta
  leen las cifras sin ejecutar JavaScript. Sin JavaScript se oculta el área del gráfico y queda la tabla.
- **Contrato.** Atributo `chart`: `{ kind: 'line'|'bar', categories, series: [{ name, values }], emphasis?,
  highlight?, format?: 'number'|'percent'|'compact', unit? }`; hasta 4 series y 36 categorías. Se valida en
  el navegador (`contract.ts`) y en el servidor (`EO_Chart::validate`): un gráfico inválido no se publica y
  quien edita ve el código de error. En el editor los datos se pegan desde una planilla (tabulaciones o punto y coma
  aceptan la coma decimal: `5.120,5`).
- **La órbita.** El acento de la línea del artículo marca sólo lo que importa (la serie destacada, la barra
  destacada); el resto es contexto gris azulado (validado con el verificador de paletas: separación ΔE ≥ 14). En
  líneas, el punto destacado es la esfera, la única de la pieza. Panel papel con el halo del Destacado claro;
  tono navy `#001a33` y modo oscuro con el mismo panel. Se anima una vez al entrar en pantalla; con «reducir
  movimiento» se pinta quieto.
- **Lecciones de la prueba.** (1) La vista previa de Gutenberg por GET convierte cada número en texto: el editor usa
  POST y el servidor acepta números escritos como texto. (2) El editor inyecta el script en su iframe antes de que
  exista `<body>`; el motor vive en la ventana del editor y vigila el iframe. (3) En un panel de navegador oculto no
  corre `IntersectionObserver` ni `requestAnimationFrame`: verificar con Playwright sin interfaz, no con el panel.
- **Pendiente para producción:** aprobación visual del operador, versión del plugin, tipo `chart` en la Content
  Factory, despliegue y purga de caché de Kinsta.
