/**
 * Normalización de los SVG de marca que viajan embebidos en las páginas del emisor.
 *
 * Los SVG institucionales de Illustrator traen su color dentro de un `<defs><style>.cls-1{fill:…}`.
 * Eso rompe de dos maneras en este runtime, y las dos en silencio:
 *
 * 1. La CSP del emisor es `style-src` por HASH. Ese `<style>` interno es un elemento de estilo más:
 *    si su hash no está en la lista, el navegador lo bloquea y las figuras quedan SIN color — se
 *    pintan de negro, que es el default de `fill`. Sobre el panel azul se ve como una mancha.
 * 2. Compensarlo desde la hoja del emisor con `svg path { fill: … }` deja fuera cualquier figura que
 *    no sea `<path>`: el logotipo tiene un `<circle>` (el planeta de la «o»), y ese fue justamente el
 *    que quedó negro.
 *
 * La normalización elimina la causa en vez de parchar el síntoma: se quita el `<style>` interno y
 * cada figura pasa a `fill="currentColor"`, así el color lo decide el contenedor con una sola
 * propiedad heredable (`color`) y el modo oscuro es un cambio de token, no otra regla.
 */

/** Error de forma del SSOT: preferimos fallar la generación antes que emitir una marca sin color. */
export class BrandSvgShapeError extends Error {}

const STYLE_RULE = /\.(cls-\d+)\s*\{\s*fill:\s*([^;}]+)\s*;?\s*\}/gu

export const sanitizeBrandSvg = (raw: string): string => {
  const withoutXmlDeclaration = raw.replace(/^<\?xml[^>]*>\s*/u, '').trim()
  const defs = withoutXmlDeclaration.match(/<defs>[\s\S]*?<\/defs>/u)

  if (defs) {
    const classes = [...defs[0].matchAll(STYLE_RULE)].map(match => match[1])

    // Un SSOT con dos colores necesita una decisión de diseño, no una heurística silenciosa.
    if (classes.length !== 1) {
      throw new BrandSvgShapeError(
        `El SVG de marca declara ${classes.length} reglas de color; este normalizador sólo admite una.`
      )
    }
  }

  return withoutXmlDeclaration
    .replace(/<defs>[\s\S]*?<\/defs>/u, '')
    .replace(/\sclass="cls-\d+"/gu, ' fill="currentColor"')
    .replace(/\s(?:id|data-name)="[^"]*"/gu, '')
    .replace(/>\s+</gu, '><')
    .trim()
}
