# Contrato de infografía editorial

## Identidad

- `conceptId`:
- artículo/pillar:
- placement:
- owner:
- estado: `brief | structure | production | qa | integrated | verified`

## Argumento

- tesis autónoma:
- `explanatoryDelta`:
- relación que debe verse:
- qué no demuestra:
- evidencia/fuente/as-of:

## Composición

- arquetipo: `metaphor | network | cycle | path | comparison | layered-model | dataviz | frontier-landscape | architectural-cutaway | ecosystem-map | evaluation-circuit | two-axis-maturity | inspection-route | authority-chain`
- por qué este arquetipo representa la relación:
- ruta de lectura:
- detalle que debe sobrevivir al thumbnail:
- arquetipo de las infografías adyacentes (evitar repetición accidental):

## Shell y marca

- título:
- bajada:
- firma:
- wordmark light: `public/branding/logo-full.svg`
- wordmark dark: `public/branding/logo-negative.svg`
- sello URL: `src/lib/artifact-composer/catalogs/deck-axis/assets/url-lum.svg`
- fuente/nota:
- footer: `source/as-of left | official wordmark + efeoncepro.com right`
- brand placement: `footer_only | surface_specific`
- skin: `efeonce_core | contextual_platform | contextual_client | campaign_specific`
- roles de color:

## Entrega

- source SVG:
- delivery SVG:
- integración: `img | inline-svg | picture | raster`
- theme: `light_dark | single_theme`
- canvas: `opaque | transparent`
- viewport: `single_composition | art_directed | crop_safe`
- variantes requeridas:
- fallback raster y motivo, si aplica:
- bytes SVG raw/gzip/brotli:
- bytes raster comparativo al ancho real:
- decisión de formato y rationale:

## Accesibilidad

- clasificación: `informative | decorative | evidence`
- ALT:
- caption:
- descripción/source note:
- descripción larga o `longDescriptionRef`:
- `<title>`/`<desc>` si inline:

## SEO y distribución

- filename/URL fallback canónico:
- `<picture>` con único `<img src>`: `yes | no | n/a`
- GET/MIME/crawlability:
- contexto HTML que conserva la tesis:
- featured raster:
- OG/Twitter raster:
- destino social, ratio, safe area y preview:
- estado por canal: `body_ready | featured_ready | og_ready | social_ready | integrated | verified`
- observación de indexación: `not_checked | indexed_observed | not_indexed_observed` (asíncrona; nunca inferirla desde `verified`)

## QA

- [ ] auditor SVG sin findings bloqueantes
- [ ] copy dentro de bounding boxes y `viewBox`
- [ ] revisión al 100% del delivery
- [ ] columna desktop real
- [ ] mobile real
- [ ] light/dark según contrato
- [ ] thumbnail/social según contrato
- [ ] contraste y tamaño de texto
- [ ] tamaño proyectado en CSS px y LayoutShift mobile
- [ ] `currentSrc`/`naturalWidth` correctos en cada combinación viewport × tema
- [ ] ratio reservado estable; sin CLS al seleccionar/cambiar `<source>`
- [ ] sello `efeoncepro.com` canónico
- [ ] wordmark y sello únicamente dentro del footer para body Efeonce
- [ ] ALT breve + descripción larga equivalente cuando la imagen es compleja
- [ ] `<img src>` fallback, filename, GET, MIME y crawlability
- [ ] firma, fuente y límites correctos
- [ ] Media Library readback
- [ ] verificación pública
