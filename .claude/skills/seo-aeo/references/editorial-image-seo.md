# SEO y accesibilidad para imágenes editoriales y SVG

> **As-of:** 2026-07-18.
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

## QA post-publicación

1. Verificar HTML live, `img[src]`, ALT/caption/contexto y `currentSrc`.
2. Verificar GET/MIME/cache/encoding del fallback y variantes.
3. Medir `naturalWidth`, overflow, CLS y legibilidad desktop/mobile.
4. Confirmar canonical, robots y sitemap de la página.
5. Separar “rastreable” de “indexado”: Google decide de forma asíncrona.
6. Observar Search Console cuando corresponda; no prometer plazo ni inclusión.

## Fuentes primarias

- `https://developers.google.com/search/docs/appearance/google-images`
- `https://developers.google.com/search/docs/crawling-indexing/indexable-file-types`
- `https://www.w3.org/WAI/tutorials/images/complex/`

