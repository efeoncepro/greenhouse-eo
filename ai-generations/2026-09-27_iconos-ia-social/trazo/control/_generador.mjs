// Candidatos de Trazo (2026-09-27): ia, composer, buscador, influencer, prensa, social, multimedia, assets,
// staff-hoodie, staff-gorra. Geometría propia en la grilla 24 (sólo M L H V A Z, arcos circulares).
import { writeFileSync, mkdirSync } from 'node:fs'
const OUT = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-27_iconos-ia-social/trazo'
mkdirSync(OUT, { recursive: true })
const f = (n) => +(+n).toFixed(2)
const P = (x, y) => `${f(x)} ${f(y)}`
const G = {}
const add = (key, label, use, mode, rest, response, dot) => { G[key] = { key, label, use, mode, rest, response: mode === 'complete' ? rest : response, dot } }
const circle = (cx, cy, r) => `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0`
const rrect = (x, y, w, h, r) => `M${f(x + r)} ${f(y)}h${f(w - 2 * r)}a${r} ${r} 0 0 1 ${r} ${r}v${f(h - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${r}h${f(-(w - 2 * r))}a${r} ${r} 0 0 1 ${-r} ${-r}v${f(-(h - 2 * r))}a${r} ${r} 0 0 1 ${r} ${-r}z`

// Destello de cuatro puntas: puntas a distancia R, lados cóncavos (arcos de radio rho, centro hacia la esquina).
const sparkle = (cx, cy, R, rho) => {
  const tips = [[cx, cy - R], [cx + R, cy], [cx, cy + R], [cx - R, cy]]
  let d = `M${P(...tips[0])}`
  for (let i = 1; i <= 4; i++) d += `A${f(rho)} ${f(rho)} 0 0 0 ${P(...tips[i % 4])}`
  return d + 'z'
}

// 1 ia: destello grande + uno chico; el chico se vuelve la esfera (replace)
{
  const big = sparkle(10, 14, 8, 9.5)
  add('ia', 'IA', 'Engine · inteligencia artificial, agentes', 'replace',
    [big, sparkle(18.25, 5.75, 3.25, 3.9)], [big], [18.25, 5.75])
}

// 2 composer: campo de prompt con línea de texto, cursor y botón de enviar; la flecha de enviar se vuelve esfera (replace)
{
  const box = rrect(3, 5, 18, 14, 3.5)
  const base = [box, 'M7 10h10', 'M7 14h4']
  add('composer', 'Composer', 'Engine · asistentes de IA, prompts, AEO', 'replace',
    [...base, 'M17 16.25v-3.5', 'M15.5 14.25l1.5 -1.5l1.5 1.5'], base, [17, 14.5])
}

// 3 buscador: barra de búsqueda redondeada con lupa y consulta; el final de la consulta se vuelve esfera (replace)
{
  const bar = 'M8 6h8a6 6 0 0 1 0 12h-8a6 6 0 0 1 0 -12z'
  const lens = circle(7.75, 11.25, 2.5)
  const handle = `M${P(7.75 + 2.5 * Math.SQRT1_2, 11.25 + 2.5 * Math.SQRT1_2)}L${P(10.75, 14.25)}`
  add('buscador', 'Buscador', 'Engine · buscadores, SEO, búsqueda en IA', 'replace',
    [bar, lens, handle, 'M13 12h5'], [bar, lens, handle], [16.75, 12])
}

// 4 influencer: persona con estrella (creador destacado); la estrella se vuelve esfera (replace)
{
  const star = (cx, cy, Ro, Ri) => { let d = ''; for (let i = 0; i < 10; i++) { const r = i % 2 ? Ri : Ro, a = -Math.PI / 2 + (i * Math.PI) / 5; d += `${i ? 'L' : 'M'}${P(cx + r * Math.cos(a), cy + r * Math.sin(a))}` } return d + 'z' }
  const head = circle(9, 8, 3.25), body = 'M3 21v-1a4.5 4.5 0 0 1 4.5 -4.5h3a4.5 4.5 0 0 1 4.5 4.5v1'
  add('influencer', 'Influencer', 'Voice · creadores de contenido, influencers', 'replace',
    [head, body, star(18, 6.25, 4, 1.7)], [head, body], [18, 6.5])
}

// 5 prensa: periódico con hoja trasera; la foto de la noticia se vuelve esfera (replace)
{
  const front = 'M17 18v-12.5a1.5 1.5 0 0 0 -1.5 -1.5h-11a1.5 1.5 0 0 0 -1.5 1.5v13a1.5 1.5 0 0 0 1.5 1.5h14.5'
  const back = 'M17 8h2.5a1.5 1.5 0 0 1 1.5 1.5v8.5a2 2 0 0 1 -4 0'
  const base = [front, back, 'M6 7.5h8', 'M12 11.5h2', 'M12 14.5h2', 'M6 17h8']
  add('prensa', 'Prensa', 'Voice · prensa, medios ganados, PR', 'replace',
    [...base, 'M6 11h3.5v3.5h-3.5z'], base, [7.75, 12.75])
}

// 6 social: globo con corazón; la esfera es la notificación en la esquina (replace: la esquina se abre)
{
  const closed = 'M17 5H6A3 3 0 0 0 3 8V13.5A3 3 0 0 0 6 16.5H7.5V20L11.5 16.5H17A3 3 0 0 0 20 13.5V8A3 3 0 0 0 17 5z'
  const open = 'M20 8V13.5A3 3 0 0 1 17 16.5H11.5L7.5 20V16.5H6A3 3 0 0 1 3 13.5V8A3 3 0 0 1 6 5H17'
  // corazón: dos lóbulos (r=2.1) y rectas tangentes a la punta
  const cx = 11.5, cy = 9.6, lr = 2.1, dx = 1.95, tipY = 14.4
  const tan = (sx) => { // punto de tangencia desde la punta al lóbulo externo
    const Cx = cx + sx * dx, Cy = cy, Bx = cx, By = tipY
    const vx = Cx - Bx, vy = Cy - By, Ld = Math.hypot(vx, vy), a = Math.asin(lr / Ld), base = Math.atan2(vy, vx)
    const ang = base + sx * a, tl = Math.sqrt(Ld * Ld - lr * lr)
    return [Bx + tl * Math.cos(ang), By + tl * Math.sin(ang)]
  }
  const tL = tan(-1), tR = tan(1), notchY = cy - Math.sqrt(lr * lr - dx * dx)
  const heart = `M${P(cx, tipY)}L${P(...tL)}A${lr} ${lr} 0 1 1 ${P(cx, notchY)}A${lr} ${lr} 0 1 1 ${P(...tR)}z`
  add('social', 'Social', 'Voice · redes sociales, comunidad', 'replace', [closed, heart], [open, heart], [20.25, 4.75])
}

// 7 multimedia: foto con un botón de play superpuesto; el sol de la foto se vuelve esfera (replace)
{
  const frame = 'M11.5 17h-6a2.5 2.5 0 0 1 -2.5 -2.5v-8a2.5 2.5 0 0 1 2.5 -2.5h9a2.5 2.5 0 0 1 2.5 2.5v4'
  const mountain = 'M3 13.5l3.75 -3.75l4.25 4.25'
  const play = circle(17, 17, 4.5)
  const tri = 'M15.75 15v4l3.25 -2z'
  const base = [frame, mountain, play, tri]
  add('multimedia', 'Multimedia', 'Brand · medios mixtos, foto y video', 'replace', [...base, circle(12.75, 8, 1)], base, [12.75, 8])
}

// 8 assets: biblioteca, tarjetas apiladas; la esfera aparece en la tarjeta del frente (complete)
{
  add('assets', 'Assets', 'Brand · biblioteca de assets, archivos creativos', 'complete',
    [rrect(3, 9, 18, 12, 2.5), 'M5.5 6h13', 'M8 3h8'], null, [12, 15])
}

// 9 staff-hoodie: hoodie con capucha y cordones; la esfera va donde iría la marca, en el pecho (complete)
{
  const body = 'M9 5l-4.5 2l-2 11.5l2.75 .75l1.25 -6.25v8.5h11v-8.5l1.25 6.25l2.75 -.75l-2 -11.5l-4.5 -2'
  const hood = 'M9 5a3 3 0 0 1 6 0l-3 3.5z'
  add('staff-hoodie', 'Staff (hoodie)', 'Área · staff augmentation, equipo en terreno', 'complete',
    [body, hood, 'M10.75 9v2.75', 'M13.25 9v2.75'], null, [12, 15.25])
}

// 10 staff-gorra: gorra de lado; la esfera va en el panel frontal, donde iría la marca (complete)
{
  const crown = 'M2 17A9 9 0 0 1 11 8A7 7 0 0 1 18 15z'
  const bill = 'M18 15L21 16.5A1.25 1.25 0 0 1 20.45 18.85L13.5 17.6'
  add('staff-gorra', 'Staff (gorra)', 'Área · staff augmentation, equipo en terreno', 'complete',
    [crown, bill, 'M11 6.5h.01', 'M11 8A11 11 0 0 0 7.5 16.75'], null, [12.5, 12])
}

for (const g of Object.values(G)) writeFileSync(`${OUT}/${g.key}.json`, JSON.stringify(g, null, 2) + '\n')
console.log(Object.keys(G).join(' '))
