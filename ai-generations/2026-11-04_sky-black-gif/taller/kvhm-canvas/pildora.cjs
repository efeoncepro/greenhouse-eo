// Píldora rosada de origen con avión, adaptativa (Daniela, Teams 2026-11-06 17:57, regla transversal para todo «badge
// con avión», sea origen u otra frase): el avión no se mueve, el texto arranca tras el avión con el aire de la plantilla
// y la píldora crece (o se achica) hacia la derecha hasta 35 px después de la última letra.
// La misma regla está en rutas-foco.cjs (sesión de rutas foco); éste es el módulo para variantes.cjs y rutas.cjs.
// Uso: await page.evaluate(PILDORA, { txt: 'DESDE LIMA' })   (txt null: deja el texto y sólo ajusta la píldora)
// El SVG debe estar cargado a 1080×1350 (px de pantalla = px del KV).
const PILDORA = ({ txt, aire = 35 }) => {
  const R = (e) => e.getBoundingClientRect();
  const pills = [...document.querySelectorAll('path')].filter((e) => /^#f8dcf[cd]$/i.test(e.getAttribute('fill') || ''));
  const el = [...document.querySelectorAll('text')].find((e) => {
    if (!/^(DESDE|FROM|DE) /.test(e.textContent.replace(/\s+/g, ' ').trim())) return false;
    const t = R(e), cx = t.left + t.width / 2, cy = t.top + t.height / 2;
    return pills.some((p) => { const b = R(p); return cx > b.left && cx < b.right && cy > b.top && cy < b.bottom; });
  });
  if (!el) return 'píldora: sin texto';
  const t0 = R(el), cy0 = t0.top + t0.height / 2;
  const pill = pills.find((p) => { const b = R(p); return t0.left > b.left && t0.left < b.right && cy0 > b.top && cy0 < b.bottom; });
  const pb = R(pill);
  // Avión: todo lo dibujado dentro de la píldora a la izquierda del texto (en el kit son varias formas).
  const avion = [...document.querySelectorAll('path, rect, circle, polygon, image')].filter((e) => e !== pill && !el.contains(e)).map(R)
    .filter((b) => b.width > 0 && b.left >= pb.left - 1 && b.right <= t0.left + 1 && b.top >= pb.top - 1 && b.bottom <= pb.bottom + 1 && b.width < pb.width / 2);
  if (!avion.length) return 'píldora: sin avión';
  const avDer = Math.max(...avion.map((b) => b.right)), hueco = t0.left - avDer; // aire avión–texto de la plantilla
  if (txt) {
    const ts = el.querySelectorAll('tspan');
    if (ts.length) { ts[0].textContent = txt; for (let i = 1; i < ts.length; i++) ts[i].remove(); } else el.textContent = txt;
  }
  // El texto vuelve a arrancar donde arrancaba (tras el avión con el mismo aire).
  const dx = avDer + hueco - R(el).left, m = (el.getAttribute('transform') || '').match(/translate\(([\d.-]+)[ ,]+([\d.-]+)\)/);
  if (m) el.setAttribute('transform', `translate(${(+m[1] + dx).toFixed(2)} ${m[2]})`);
  else el.setAttribute('x', ((+el.getAttribute('x') || 0) + dx).toFixed(2));
  // La píldora puede estar dentro de un grupo trasladado: el trazado se escribe en coordenadas locales.
  const bb = pill.getBBox(), offX = pb.left - bb.x, der = R(el).right - offX + aire, L = bb.x, r = bb.height / 2, y = bb.y;
  pill.setAttribute('d', `M${L.toFixed(2)},${(y + r).toFixed(2)}c0-${(r * 0.5522).toFixed(2)},${(r * 0.4478).toFixed(2)}-${r},${r}-${r}h${(der - L - 2 * r).toFixed(2)}c${(r * 0.5522).toFixed(2)},0,${r},${(r * 0.4478).toFixed(2)},${r},${r}h0c0,${(r * 0.5522).toFixed(2)}-${(r * 0.4478).toFixed(2)},${r}-${r},${r}H${(L + r).toFixed(2)}c-${(r * 0.5522).toFixed(2)},0-${r}-${(r * 0.4478).toFixed(2)}-${r}-${r}h0Z`);
  return `píldora → ${el.textContent.replace(/\s+/g, ' ').trim()} (${Math.round(der - L)} px, ${aire} px tras la última letra)`;
};
module.exports = { PILDORA };
