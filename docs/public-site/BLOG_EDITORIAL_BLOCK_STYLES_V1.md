# Estilos editoriales del blog (bloques nativos de Gutenberg)

> **Tipo de documento:** Contrato de diseño y uso
> **Versión:** 1.2
> **Creado:** 2026-10-24 por Claude, a partir de la revisión del operador sobre los posts de inbound, paid media y topic clusters
> **Código:** plugin `efeonce-editorial-blocks` 0.4.0, carpeta `includes/editorial/` (repo `efeonce-public-site-runtime`, commit `f9b0d4d`)
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
| Destacado Efeonce | `core/pullquote` | `is-style-efeonce-destacado` | La frase en la que se apoya una sección. Una o dos por post, nunca seguidas, y sin repetir la oración que tiene al lado (se saca del párrafo) | `{ "kind": "pullquote", "text", "cite"? }` (siempre con el estilo) |
| Pasos | `core/list` ordenada | `is-style-efeonce-pasos` | Las secciones «paso a paso»: número en círculo, líneas entre pasos, el arranque en negrita | `{ "kind": "list", "ordered": true, "style": "steps" }` |
| Recuadro | `core/list` | `is-style-efeonce-recuadro` | Un conjunto corto que conviene ver de una vez: errores frecuentes, «tres cosas», las invitaciones del cierre (Glitch → herramienta, orden de PDR-020) y el mapa de un cluster | `{ "kind": "list", "style": "box" }` |
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
  - El Destacado abre con una barra de 48 × 3 px en el acento, sin esfera. Va en DM Sans 600 de 24 a 34 px, con un
    ancho de 34 caracteres y la fuente opcional en mayúsculas chicas.
  - La viñeta del Recuadro es un guion corto en tinta.
  - El anillo de la FAQ nunca se rellena.
  - La esfera significa «lo decidido»: va una por pieza y nunca como viñeta.
- **La tipografía sigue la del artículo de Ohio** (DM Sans e Inter). Pasar a Bricolage y Poppins queda para cuando se
  migre la plantilla completa del artículo (decisión del operador, 2026-10-24).

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

## Reglas para quien escribe

- No publicar posts hechos sólo de párrafos y listas: cada post lleva al menos un Destacado, y Pasos cuando hay un
  paso a paso.
- Un Destacado no repite el párrafo de al lado: la oración sale del párrafo y queda sólo en el Destacado.
- Un Recuadro tiene entre 2 y 6 ítems cortos; una lista larga de definiciones queda como lista normal.
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

**Pendiente (decisión del operador):** en el mapa de la portada, la línea de Inbound, Marketing Digital, SEO, IA y
Novedades es provisional. Hoy los tres posts refrescados salen en Growth.
