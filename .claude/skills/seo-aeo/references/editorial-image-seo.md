# SEO y accesibilidad para imágenes editoriales y SVG

> **As-of:** 2026-10-24 (imagen social por plataforma agregada).
> **Carga cuando:** un artículo use infografías, diagramas, `<picture>`, SVG directo, featured u Open Graph.

## Decisión rápida

SVG es adecuado para una infografía vectorial de cuerpo cuando es seguro, autónomo, legible y eficiente. Google
Search admite SVG entre los formatos soportados y descubre imágenes desde `src` de `<img>`, incluso cuando el
elemento vive dentro de `<picture>`. No descubre imágenes usadas sólo como CSS background.

La decisión de body no se hereda a featured/OG/Twitter/Discover. Esas superficies usan un raster representativo
probado por compatibilidad de preview.

## Contrato HTML

```html
<picture>
  <source media="(prefers-color-scheme: dark) and (max-width: 860px)" srcset="concept-mobile-dark.svg">
  <source media="(max-width: 860px)" srcset="concept-mobile-light.svg">
  <source media="(prefers-color-scheme: dark)" srcset="concept-desktop-dark.svg">
  <img src="concept-desktop-light.svg" width="1600" height="1080" alt="Descripción breve del argumento visual">
</picture>
```

- Un solo `<img>` posee la semántica accesible y un `src` fallback estable.
- `<source>` hace art direction; no se insertan varios `<img>` ocultos.
- El fallback es representativo y rastreable, no un placeholder.
- Declarar dimensiones/ratio y medir CLS cuando mobile cambia la proporción.
- Confirmar `currentSrc` en cada viewport/tema y que dark coincida con el theme real.

## Semántica y alternativas

- Filename descriptivo, ALT breve y específico, caption y texto cercano ayudan a entender la imagen.
- No rellenar ALT con keywords ni duplicar literalmente el caption.
- Texto convertido a paths dentro de SVG no es contenido HTML indexable. Toda tesis, cifra y límite material
  debe existir también en HTML visible.
- Una infografía compleja requiere ALT corto que identifica propósito + descripción larga equivalente. Puede
  ser contenido estructurado adyacente o un `longDescriptionRef` visible/enlazado.
- `<title>`/`<desc>` ayudan especialmente en inline SVG; no sustituyen `alt` cuando se usa `<img>`.
- Si es decorativa, usar `alt=""`; si es evidencia, caption y provenance son obligatorios.

## Rastreabilidad y delivery

Verificar URL estable y extensión correcta; GET anónimo `200`; `Content-Type: image/svg+xml`; robots; página
canónica y contexto visible; dimensiones; compresión/cache; y ausencia de scripts, eventos, recursos remotos o
fonts no controladas. Un image sitemap es opcional cuando aporta descubrimiento adicional.

Un archivo raw puede recibir enlaces, pero no siempre es la mejor landing. Para link earning o reutilización,
preferir una sección/anchor con descripción, fuente, permisos y canonical sobre el SVG sin contexto.

## Performance y metadata representativa

- Comparar bytes transferidos gzip/Brotli del SVG con raster al ancho real; SVG no necesita `@2x`.
- Outlining puede aumentar raw y aun comprimir bien; optimizar paths sólo con benchmark visual.
- No sacrificar tipo, contraste o estructura por unos pocos KB.
- Mantener raster coherente en `BlogPosting.image`/`ImageObject`, `og:image`, Twitter y featured.
- No duplicar schema manual si Yoast es owner del graph.

## Imagen social (Open Graph) por plataforma

Una sola imagen OG sirve a todas las redes, pero cada una la muestra distinto y casi ninguna publica sus reglas.
Diseñar para la intersección:

| Superficie | Cómo la muestra | Margen | Fuente |
|---|---|---|---|
| LinkedIn, Facebook | tarjeta grande 1,91:1 completa; con imágenes chicas cae a miniatura (cuadrada en Facebook) | el cuadrado central si cae a miniatura | guías de terceros |
| WhatsApp | vista grande, o compacta con miniatura cuadrada central (imágenes chicas, pesadas o poco horizontales) | el cuadrado central | Meta (oficial): < 600 KB, ≥ 300 px de ancho, proporción ≤ 4:1 |
| X | `summary_large_image` 2:1; si falta `twitter:image`, usa `og:image` | ~15 px arriba y abajo (sobre 1200 × 630) | validador de X citado en 2020 |
| iMessage, Slack, Teams, Telegram | casi completa; miniatura al costado con imágenes chicas | el cuadrado central | sin especificación publicada |
| Google y Discover | imagen grande con `max-image-preview:large` y ≥ 1200 px de ancho | — | Google Search Central |

Reglas que valen para todas:

- Raster **JPEG** (los lectores de enlaces no tratan WebP de forma pareja), de **menos de 300 KB**: sale la vista
  grande y queda lejos del límite de WhatsApp.
- Texto y sujeto dentro del **cuadrado central**; nada importante en los bordes de arriba y abajo.
- `og:image:alt` / `twitter:image:alt` describen la imagen y repiten su texto; un alt vacío no se imprime.
- `og:title` puede no ser el título SEO (en Yoast sale del título del post): leer cada etiqueta en vivo.
- Las redes guardan la vista previa en caché: tras cambiar la imagen, refrescar con el depurador de Facebook, el Post
  Inspector de LinkedIn y un chat de prueba en WhatsApp.

**Overlay Efeonce (blog Marketing con Manzanitas, medido en vivo el 2026-10-24):** la portada es un JPEG
2400 × 1260 (lienzo 1200 × 630) que cubre destacada, `og:image`, la tarjeta de X (sin `twitter:image` propio),
`primaryImageOfPage` y la miniatura cuadrada de «Te puede interesar» al pie de cada artículo (339 × 339; 326 × 326
en el teléfono, centrada: el mismo cuadrado x 285–915 que WhatsApp). `og:image:alt` y `twitter:image:alt` salen
del `alt` de la portada desde `efeonce-editorial-blocks` 0.4.6 (en producción desde el
2026-10-24). Medidas, zonas seguras y QA:
`docs/operations/public-site-content-factory/BLOG_ARTICLE_IMAGE_INVENTORY_V1.md`.

## QA post-publicación

1. Verificar HTML live, `img[src]`, ALT/caption/contexto y `currentSrc`.
2. Verificar GET/MIME/cache/encoding del fallback y variantes.
3. Medir `naturalWidth`, overflow, CLS y legibilidad desktop/mobile.
4. Confirmar canonical, robots y sitemap de la página.
5. Separar “rastreable” de “indexado”: Google decide de forma asíncrona.
6. Observar Search Console cuando corresponda; no prometer plazo ni inclusión.
7. Para la tendencia de búsqueda visual, comparar `Web: multimodal` contra
   `Web: text-based` en Search Console con la misma ventana y dimensiones. El
   nuevo filtro cubre ciertos recorridos de búsqueda web iniciados con imagen;
   no indica qué imagen usó el usuario ni garantiza que toda la demanda visual
   esté clasificada ahí. Ver `../modules/07_MEASUREMENT.md`.

## Fuentes primarias

- `https://developers.google.com/search/docs/appearance/google-images`
- `https://developers.google.com/search/docs/crawling-indexing/indexable-file-types`
- `https://developers.google.com/search/blog/2026/09/web-multimodal-in-sc`
- `https://support.google.com/webmasters/answer/16984139`
- `https://www.w3.org/WAI/tutorials/images/complex/`
