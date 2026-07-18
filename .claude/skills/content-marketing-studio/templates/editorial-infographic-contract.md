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

- arquetipo: `metaphor | network | cycle | path | comparison | layered-model | dataviz`
- por qué este arquetipo representa la relación:
- ruta de lectura:
- detalle que debe sobrevivir al thumbnail:
- arquetipo de las infografías adyacentes (evitar repetición accidental):

## Shell y marca

- título:
- bajada:
- firma:
- sello URL: `src/lib/artifact-composer/catalogs/deck-axis/assets/url-lum.svg`
- fuente/nota:
- skin: `efeonce_core | contextual_platform | client | campaign`
- roles de color:

## Entrega

- source SVG:
- delivery SVG:
- integración: `img | inline-svg | picture | raster`
- canvas: `white-poster | light-dark | transparent`
- viewport: `single-composition | art-directed | crop-safe`
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
- `<title>`/`<desc>` si inline:

## QA

- [ ] auditor SVG sin findings bloqueantes
- [ ] copy dentro de bounding boxes y `viewBox`
- [ ] revisión al 100% del delivery
- [ ] columna desktop real
- [ ] mobile real
- [ ] light/dark según contrato
- [ ] thumbnail/social según contrato
- [ ] contraste y tamaño de texto
- [ ] sello `efeoncepro.com` canónico
- [ ] firma, fuente y límites correctos
- [ ] Media Library readback
- [ ] verificación pública
