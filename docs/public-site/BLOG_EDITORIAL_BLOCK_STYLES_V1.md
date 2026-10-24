# Estilos editoriales del blog (bloques nativos de Gutenberg)

> **Tipo de documento:** Contrato de diseño y uso
> **Versión:** 1.0
> **Creado:** 2026-10-24 por Claude, a partir de la revisión del operador sobre los posts de inbound, paid media y topic clusters
> **Código:** plugin `efeonce-editorial-blocks` 0.4.0, carpeta `includes/editorial/` (repo `efeonce-public-site-runtime`)
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
