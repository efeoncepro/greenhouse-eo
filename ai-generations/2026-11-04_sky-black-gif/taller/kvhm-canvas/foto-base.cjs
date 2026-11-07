// Kit SKY: en varios SVG (HPH, TikTok, DAT, PMAX) la máscara de la foto (Raster 1) no cubre el borde y deja
// ver 1-4 px del fondo claro como una línea blanca. Se agrega una copia sin máscara de la foto bajo todo el
// arte (justo después de Layer 0): sólo cambian las filas del borde; el interior queda idéntico.
function fotoBase(svg) {
  const m = svg.match(/<image id="Raster_1_Imagen-2"[^>]*\/>/);
  const i = svg.indexOf('<g id="Group">');
  if (!m || i < 0 || svg.includes('id="lf-foto-base"')) return svg;
  let copia = m[0].replace('id="Raster_1_Imagen-2"', 'id="lf-foto-base"');
  // 300x600: la foto sube 2 px; la copia se estira 2 px (0,3 %) para llegar al borde.
  copia = copia.replace('height="600" transform="translate(0 -2)"', 'height="602" preserveAspectRatio="none" transform="translate(0 -2)"');
  return svg.slice(0, i) + copia + svg.slice(i);
}
module.exports = { fotoBase };
