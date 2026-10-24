# Estilos editoriales del blog (bloques nativos de Gutenberg)

> **Tipo de documento:** Contrato de diseño y uso
> **Versión:** 1.0
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

**Diseño.**

- Tinta del tema (`#111013`), acento azure de Efeonce (`#0375db`) y un panel claro (`#f3f6fa`).
- En modo oscuro de Ohio (`body.dark-scheme`): blanco, azure claro (`#6cb4ff`) y un panel translúcido.
- El Destacado abre con una línea que termina en la esfera de la órbita, va en DM Sans 600 de 24 a 34 px con ancho de
  34 caracteres, y lleva la fuente opcional en mayúsculas chicas.
- Los números de Pasos van en DM Sans con cifras tabulares.

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

**Sin resolver:** los enlaces normales del blog siguen en navy sobre fondo oscuro. Es un problema del tema en todo el
blog, no de estos posts, y queda para decisión del operador.

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
- Color de los enlaces normales del blog en modo oscuro: decisión del operador.
