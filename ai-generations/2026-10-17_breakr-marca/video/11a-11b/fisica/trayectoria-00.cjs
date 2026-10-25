// Trayectoria física de la lata en el encuadre del 00 (eje B, cámara detrás de Antonio, 1024x1280).
// La lata sale de la pantalla (oculta tras la tapa) y viaja ALEJÁNDOSE de la cámara hacia el pecho de Paula:
// en el cuadro casi no se desplaza, sube un poco hacia la izquierda y se ACHICA (de ~1,35x a 1x).
// Tras el golpe rebota hacia arriba a su derecha (izquierda del cuadro) hasta la posición del 00.
const sharp = require('sharp')
const q = (a, b, c, t) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c
const pts = []
for (let i = 0; i <= 3; i++) { const t = i / 3; pts.push({ f: 'v', t: 0.15 * t, x: q(690, 570, 455, t), y: q(700, 650, 610, t), s: 180 - 45 * t, a: -55 + 20 * t }) }
for (let i = 1; i <= 3; i++) { const t = i / 3; pts.push({ f: 'r', t: 0.15 + 0.35 * t, x: q(455, 330, 215, t), y: q(610, 380, 375, t), s: 135 + 10 * t, a: -35 - 15 * t }) }
const can = p => `<g transform="translate(${p.x},${p.y}) rotate(${p.a})"><rect x="${-p.s * 0.215}" y="${-p.s / 2}" width="${p.s * 0.43}" height="${p.s}" rx="${p.s * 0.1}" fill="none" stroke="${p.f === 'v' ? '#ff6a00' : '#14b3ad'}" stroke-width="4"/></g>`
const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(0)},${p.y.toFixed(0)}`).join(' ')
const rays = [[-60, -150], [0, -170], [60, -150], [-120, -60], [120, -60], [-150, 10], [150, 10]].map(([dx, dy]) => `<line x1="455" y1="610" x2="${455 + dx}" y2="${610 + dy}" stroke="#7fd7ff" stroke-width="4" marker-end="url(#m)"/>`).join('')
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1280">
<defs><marker id="m" markerWidth="10" markerHeight="10" refX="6" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#7fd7ff"/></marker></defs>
<path d="M700,760 L470,625" stroke="#7fd7ff" stroke-width="10" stroke-opacity=".55" fill="none" marker-end="url(#m)"/>
${rays}
<path d="${path}" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="10 8"/>
${pts.map(can).join('')}
<circle cx="455" cy="610" r="10" fill="#ff3b3b"/>
<rect x="20" y="1090" width="984" height="170" rx="10" fill="rgba(0,0,0,.72)"/>
<text x="40" y="1128" font-family="Helvetica" font-size="23" fill="#ff6a00" font-weight="700">Naranjo: la lata sale sobre la tapa y se ALEJA hacia su pecho (se achica, apenas sube)</text>
<text x="40" y="1168" font-family="Helvetica" font-size="23" fill="#7fd7ff" font-weight="700">Celeste: chorro en la misma línea; al chocar, corona que se abre desde el pecho</text>
<text x="40" y="1208" font-family="Helvetica" font-size="23" fill="#14b3ad" font-weight="700">Teal: rebota hacia arriba a su derecha hasta quedar junto a la cabeza (00)</text>
<text x="40" y="1246" font-family="Helvetica" font-size="23" fill="#fff" font-weight="700">Nada se mueve de lado a lado: todo es profundidad + golpe + rebote</text>
</svg>`
;(async () => { await sharp('../../../planos/final/00-gancho-congelado.png').modulate({ brightness: 0.75 }).composite([{ input: Buffer.from(svg) }]).png().toFile('trayectoria-impacto-00.png') })()
