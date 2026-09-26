// Texto que viaja dentro de un SVG y vuelve a ser texto para dibujarlo con la fuente real.
//
// El renderer AXIS escapa las etiquetas de cursor como XML (`<` → `&lt;`), y el compositor las convierte en trazos
// con fontkit. Antes sólo se deshacía `&amp;`: una etiqueta «IA <3» salía dibujada como «IA &lt;3» (auditoría
// adversarial 2026-09-23, hallazgo 4). Se decodifican las cinco entidades de XML y las numéricas, con `&amp;` AL
// FINAL para no decodificar dos veces (`&amp;lt;` es el texto literal «&lt;»).
const NOMBRADAS = { lt: '<', gt: '>', quot: '"', apos: "'" }

// Un código fuera de Unicode no revienta con un RangeError sin nombre (auditoría de arquitectura, hallazgo 4): sale como
// U+FFFD, y la validación del plan lo rechaza nombrando pieza y campo antes de componer.
const desdeCodigo = cp => (Number.isFinite(cp) && cp <= 0x10ffff && !(cp >= 0xd800 && cp <= 0xdfff) ? String.fromCodePoint(cp) : '\ufffd')

export const desescaparXml = t =>
  String(t)
    .replace(/&(lt|gt|quot|apos);/g, (_, e) => NOMBRADAS[e])
    .replace(/&#(\d+);/g, (_, n) => desdeCodigo(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => desdeCodigo(parseInt(n, 16)))
    .replaceAll('&amp;', '&')
