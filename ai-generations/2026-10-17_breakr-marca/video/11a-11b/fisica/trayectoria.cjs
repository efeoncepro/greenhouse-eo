// Trayectoria de la lata dibujada en el espacio de la imagen del plano 11a (1024x1280).
// Escala tomada del propio plano: la cabeza de Paula (~23 cm) mide ~200 px a ~2,3 m → f ≈ 2000 px. Con eso la tapa
// (~21 cm, ~250 px) queda a ~1,7 m del lente y Paula a ~0,6 m de la tapa. La lata real (15,7 cm) debe medir ~180 px
// al salir de la pantalla y ~135 px en el pecho de Paula. En el plano aprobado mide ~300 px: ~1,7 veces de más.
const sharp = require('sharp')
const q = (a, b, c, t) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c
const vuelo = [], rebote = []
// Vuelo: sale sobre el borde de la tapa (lado de Paula) y entra al pecho, con un arco leve hacia arriba.
for (let i = 0; i <= 4; i++) { const t = i / 4; vuelo.push({ t: 0.2 * t, x: q(585, 500, 405, t), y: q(745, 610, 548, t), s: 180 - 45 * t, a: -10 + 90 * t }) }
// Rebote: sube hacia su derecha (izquierda del cuadro) junto a la cabeza y cae acostada en la mesa.
for (let i = 1; i <= 4; i++) { const t = i / 4; rebote.push({ t: 0.2 + 0.55 * t, x: q(405, 250, 175, t), y: q(548, 170, 700, t), s: 135 + 15 * t, a: 80 + 120 * t }) }
const all = [...vuelo, ...rebote]
const KEY=new Set(['0.00','0.20','0.48','0.75']);
const can = (p, col) => `<g transform="translate(${p.x},${p.y}) rotate(${p.a})"><rect x="${-p.s * 0.215}" y="${-p.s / 2}" width="${p.s * 0.43}" height="${p.s}" rx="${p.s * 0.1}" fill="none" stroke="${col}" stroke-width="4"/></g>
  ${KEY.has(p.t.toFixed(2))?`<text x="${p.x + p.s * 0.3 + 6}" y="${p.y + 8}" font-family="Helvetica" font-size="24" font-weight="700" fill="#fff" stroke="#000" stroke-width="5" paint-order="stroke">${p.t.toFixed(2)} s</text>`:''}`
const path = all.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(0)},${p.y.toFixed(0)}`).join(' ')
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1280">
  <defs><marker id="m" markerWidth="10" markerHeight="10" refX="6" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#7fd7ff"/></marker></defs>
  <path d="${path}" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="10 8"/>
  <path d="M560,800 Q480,750 380,690" stroke="#7fd7ff" stroke-width="6" fill="none" marker-end="url(#m)"/>
  <path d="M600,795 Q520,690 420,590" stroke="#7fd7ff" stroke-width="6" fill="none" marker-end="url(#m)"/>
  <path d="M640,800 Q600,760 520,700" stroke="#7fd7ff" stroke-width="6" fill="none" marker-end="url(#m)"/>
  ${vuelo.map(p => can(p, '#ff6a00')).join('\n')}
  ${rebote.map(p => can(p, '#14b3ad')).join('\n')}
  <rect x="20" y="1100" width="984" height="160" rx="10" fill="rgba(0,0,0,.7)"/>
  <text x="40" y="1140" font-family="Helvetica" font-size="24" fill="#ff6a00" font-weight="700">Naranjo: vuelo pantalla → pecho, ~0,2 s (5 cuadros), girando sobre sí misma</text>
  <text x="40" y="1180" font-family="Helvetica" font-size="24" fill="#14b3ad" font-weight="700">Teal: rebote junto a la cabeza y caída a la mesa, acostada (~0,75 s)</text>
  <text x="40" y="1220" font-family="Helvetica" font-size="24" fill="#7fd7ff" font-weight="700">Celeste: el agua sale de la pantalla en abanico HACIA Paula y la alcanza</text>
</svg>`
;(async () => { await sharp('../../../planos/final/11a-ola-llega.png').composite([{ input: Buffer.from(svg) }]).png().toFile('trayectoria-lata-11a.png') })()
