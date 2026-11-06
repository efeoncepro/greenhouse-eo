#!/usr/bin/env node
/**
 * Ronda 3 de Efeonce ID: «la huella» (operador, 2026-11-01). Exploración, NO canon.
 *
 * Parte de la ruta A (la órbita vive en la D). El operador vio que el «ID» en conjunto se lee como un dedo: la panza de
 * la D con la esfera es la yema. Se lleva a identidad sin dibujar un dedo: dentro de la panza (una órbita vacía, donde
 * la línea sí permite órbitas interiores) van surcos concéntricos, como una huella. La esfera sigue a la 1:30 sobre la
 * órbita exterior: es el punto de contacto. Ninguna esfera en un cruce; los surcos son concéntricos y no se cruzan.
 *
 * Variantes:
 *  - v1 «surcos»: tres medias órbitas concéntricas cerradas contra el asta.
 *  - v2 «huella»: los mismos surcos con cortes, como las terminaciones de una huella real.
 *  - v3 «dos surcos»: exterior + un surco, más aire.
 *  - small: para ≤ 32 px, exterior + un surco grueso.
 *
 * Uso: node ai-generations/2026-11-01_efeonce-id-logo/build-huella.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import * as fontkit from 'fontkit'
import { efeonceGraphicLine as GL } from '@efeoncepro/axis-tokens'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '../..')
const OUT = path.join(here, 'svg-huella')
const BOLD = fontkit.openSync(path.join(repo, 'src/assets/fonts/Poppins-Bold.ttf'))
const TRACKING = -18

const growth = GL.lines.find(l => l.key === 'growth')
const VARIANTS = {
  positive: { ink: GL.color.navy, accent: growth.accentOnLight },
  negative: { ink: '#ffffff', accent: growth.accentOnDark },
  white: { ink: '#ffffff', accent: '#ffffff' }
}

const f = n => Number(n.toFixed(2))
const D2R = Math.PI / 180
const at = (c, rho, t) => ({ x: c.x + rho * Math.sin(t), y: c.y + rho * Math.cos(t) })
const pt = p => `${f(p.x)} ${f(p.y)}`

function shortArc(C, R, P, Q) {
  const cross = (P.x - C.x) * (Q.y - C.y) - (P.y - C.y) * (Q.x - C.x)

  return `A${f(R)} ${f(R)} 0 0 ${cross > 0 ? 1 : 0} ${pt(Q)}`
}

// Arco sobre el círculo (c, rho) de t1 a t2, partido en tramos de ≤ 90° para que cada uno sea corto.
function arcAlong(c, rho, t1, t2) {
  const n = Math.max(1, Math.ceil(Math.abs(t2 - t1) / (Math.PI / 2)))
  let s = ''

  for (let i = 1; i <= n; i++) {
    const a = at(c, rho, t1 + ((t2 - t1) * (i - 1)) / n)
    const b = at(c, rho, t1 + ((t2 - t1) * i) / n)

    s += shortArc(c, rho, a, b)
  }

  return s
}

const I = BOLD.layout('I').glyphs[0]
const CAP = I.bbox.maxY
const STEM = I.bbox.maxX - I.bbox.minX

/**
 * Una media órbita (de 12 a 6 por la derecha) de radio medio rMid, con huecos. Cada hueco es
 *  { kind: 'sphere', S, k, dS } — el corte concéntrico a la esfera (terminaciones cóncavas), o
 *  { kind: 'break', from, to } — un corte recto, en grados desde las 12.
 * Los extremos en 0° y 180° entran en el asta.
 */
function halfRing(c, rMid, stroke, gaps, lead = 0) {
  const ro = rMid + stroke / 2
  const ri = rMid - stroke / 2
  // lead = tramo recto entre el asta y el arco (la D clásica: asta, recta y curva).
  const overlap = 14 + lead
  // Cada hueco, resuelto por borde: el ángulo donde empieza y termina en el radio rho.
  const resolved = gaps
    .map(g => {
      // Corte de huella: remates redondos (radio = medio trazo). El hueco [from, to] es el aire visible entre las puntas,
      // así que el arco termina medio trazo antes y el remate llega justo al borde del hueco.
      if (g.kind === 'break') {
        const pad = stroke / 2 / rMid

        return { start: () => g.from * D2R - pad, end: () => g.to * D2R + pad, cap: { round: true } }
      }
      const a = Math.atan2(g.S.x - c.x, g.S.y - c.y)
      const half = rho => {
        const v = (rho * rho + g.dS * g.dS - g.k * g.k) / (2 * rho * g.dS)

        return v >= 1 ? null : Math.acos(Math.max(-1, v))
      }

      if (half(ro) === null && half(ri) === null) return null
      // Si el corte toca sólo un borde, se trata como si tocara ambos con el ángulo del que sí toca.
      const h = rho => half(rho) ?? half(rho === ro ? ri : ro)

      return { start: rho => a - h(rho), end: rho => a + h(rho), cap: { C: g.S, R: g.k } }
    })
    .filter(Boolean)
    .sort((p, q) => p.start(rMid) - q.start(rMid))

  const segs = []
  let from = { o: 0, i: 0, kind: 'stem' }

  for (const g of resolved) {
    segs.push({ from, to: { o: g.start(ro), i: g.start(ri), cap: g.cap } })
    from = { o: g.end(ro), i: g.end(ri), cap: g.cap }
  }

  segs.push({ from, to: { o: Math.PI, i: Math.PI, kind: 'stem' } })

  return segs
    .filter(s => s.to.o - s.from.o > 0.02)
    .map(({ from: a, to: b }) => {
      const oA = at(c, ro, a.o)
      const oB = at(c, ro, b.o)
      const iA = at(c, ri, a.i)
      const iB = at(c, ri, b.i)
      let d = ''

      if (a.kind === 'stem') d += `M${f(oA.x - overlap)} ${f(oA.y)}L${pt(oA)}`
      else d += `M${pt(oA)}`
      d += arcAlong(c, ro, a.o, b.o)
      const h = stroke / 2
      // Remate redondo en el ángulo t: media circunferencia alrededor de la línea media, abombada hacia dir (+1 adelante).
      const roundCap = (t, P, Q, dir) => {
        const mid = at(c, rMid, t)
        const F = { x: mid.x + dir * h * Math.cos(t), y: mid.y - dir * h * Math.sin(t) }

        return shortArc(mid, h, P, F) + shortArc(mid, h, F, Q)
      }

      if (b.kind === 'stem') d += `L${f(oB.x - overlap)} ${f(oB.y)}L${f(iB.x - overlap)} ${f(iB.y)}L${pt(iB)}`
      else if (b.cap?.round) d += roundCap(b.o, oB, iB, 1)
      else d += shortArc(b.cap.C, b.cap.R, oB, iB)
      d += arcAlong(c, ri, b.i, a.i)
      if (a.kind === 'stem') d += `L${f(iA.x - overlap)} ${f(iA.y)}Z`
      else if (a.cap?.round) d += roundCap(a.o, iA, oA, -1) + 'Z'
      else d += shortArc(a.cap.C, a.cap.R, iA, oA) + 'Z'

      return d
    })
    .join('')
}

/**
 * «ID» con surcos. o = { stroke, sphereR, knock, ridges: [{ pitch, breaks }] } — cada surco está pitch unidades más
 * adentro que el anterior (de línea media a línea media) y puede llevar cortes rectos.
 */
function idMark(o) {
  const layout = BOLD.layout('ID')
  const iPath = I.path.toSVG()
  const dGlyph = layout.glyphs[1]
  const x0 = layout.positions[0].xAdvance + TRACKING
  const stemL = x0 + dGlyph.bbox.minX
  const stemR = stemL + STEM
  const stem = `M${f(stemL)} 0H${f(stemR)}V${f(CAP)}H${f(stemL)}Z`
  const lead = o.straight ?? 0
  const c = { x: stemR + lead, y: CAP / 2 }
  const rOuter = CAP / 2 - o.stroke / 2
  const S = at(c, rOuter, 45 * D2R)
  const sphereGap = { kind: 'sphere', S, k: o.sphereR + o.knock, dS: rOuter }
  let rings = halfRing(c, rOuter, o.stroke, [sphereGap], lead)
  let r = rOuter

  for (const ridge of o.ridges) {
    r -= ridge.pitch
    const stroke = ridge.stroke ?? o.stroke
    const gaps = [sphereGap, ...(ridge.breaks ?? []).map(([from, to]) => ({ kind: 'break', from, to }))]

    rings += halfRing(c, r, stroke, gaps, lead)
  }

  return { ink: `${iPath} ${stem}`, rings, S, sphereR: o.sphereR, knock: o.knock, c, rOuter, stemR, left: I.bbox.minX, right: c.x + CAP / 2, top: CAP }
}

const inner = (m, ink, accent) =>
  `<path fill="${ink}" d="${m.ink}"/><path fill="${ink}" d="${m.rings}"/><circle fill="${accent}" cx="${f(m.S.x)}" cy="${f(m.S.y)}" r="${m.sphereR}"/>`

const doc = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(w)} ${f(h)}" role="img" aria-label="Efeonce ID">${body}</svg>\n`

const logoSvg = (m, v) => doc(m.right - m.left, m.top, `<g transform="translate(${f(-m.left)} ${f(m.top)}) scale(1 -1)">${inner(m, v.ink, v.accent)}</g>`)

function isotypeSvg(m, v) {
  const w = m.right - m.left
  const side = Math.max(w, m.top) + STEM
  return doc(side, side, `<g transform="translate(${f((side - w) / 2 - m.left)} ${f((side + m.top) / 2)}) scale(1 -1)">${inner(m, v.ink, v.accent)}</g>`)
}

function tileSvg(m) {
  const S = 1024
  const w = m.right - m.left
  const s = (S * 0.6) / Math.max(w, m.top)

  return doc(S, S, `<rect width="${S}" height="${S}" rx="${S * 0.22}" fill="${GL.color.dark}"/><g transform="translate(${f((S - w * s) / 2 - m.left * s)} ${f((S + m.top * s) / 2)}) scale(${s.toFixed(6)} ${(-s).toFixed(6)})">${inner(m, '#ffffff', growth.accentOnDark)}</g>`)
}

// ─── Variantes ───────────────────────────────────────────────────────────────────────────────────────────
const BASE = { stroke: 64, sphereR: 88, knock: 22 }
const SETS = {
  v1: { ...BASE, ridges: [{ pitch: 120 }, { pitch: 120 }] },
  v2: { ...BASE, ridges: [{ pitch: 120, breaks: [[104, 122]] }, { pitch: 120, breaks: [[146, 168]] }] },
  v3: { ...BASE, ridges: [{ pitch: 150 }] },
  // Ronda de refinamiento: un solo remate por marca.
  r1: { ...BASE, ridges: [{ pitch: 120, breaks: [[108, 128]] }, { pitch: 120 }] },
  r2: { ...BASE, ridges: [{ pitch: 120 }, { pitch: 120, breaks: [[120, 150]] }] },
  r3: { ...BASE, ridges: [{ pitch: 150, breaks: [[112, 132]] }] },
  r4: { ...BASE, ridges: [{ pitch: 132, breaks: [[100, 120]] }, { pitch: 132 }] },
  // Trazo fino (operador: la huella pesaba): los surcos van a menos de la mitad del anillo, como el anillo fino de la línea.
  f1: { ...BASE, ridges: [{ pitch: 92, stroke: 24, breaks: [[108, 126]] }, { pitch: 92, stroke: 24 }] },
  f2: { ...BASE, ridges: [{ pitch: 104, stroke: 24 }] },
  f3: { ...BASE, ridges: [{ pitch: 92, stroke: 24 }, { pitch: 92, stroke: 24 }, { pitch: 92, stroke: 24 }] },
  a0: { ...BASE, ridges: [] },
  // Pulido de la inicial: tramo recto antes del arco (straight) y peso del anillo (stroke).
  p60: { ...BASE, straight: 60, ridges: [] },
  p110: { ...BASE, straight: 110, ridges: [] },
  w80: { ...BASE, stroke: 80, ridges: [] },
  p60w80: { ...BASE, stroke: 80, straight: 60, ridges: [] },
  p110w80: { ...BASE, stroke: 80, straight: 110, ridges: [] },
  p80w96: { ...BASE, stroke: 96, straight: 80, ridges: [] },
  // La elegida (operador, 2026-11-01): tramo recto 110, anillo 64. Y su versión para ≤ 32 px.
  p110s: { stroke: 110, sphereR: 104, knock: 30, straight: 110, ridges: [] },
  // ≤ 32 px: un surco grueso con su remate, para que la huella no se pierda.
  small: { stroke: 104, sphereR: 104, knock: 30, ridges: [{ pitch: 190, stroke: 104, breaks: [[118, 150]] }] }
}

// ─── Lockup de familia: Efeonce | ID (ID en el gris de la familia, sólo la esfera en el acento) ────────────
const EFEONCE_ASSETS = path.join(repo, 'node_modules/@efeoncepro/axis-brand-assets/assets')
const LOCKUP_TONE = {
  positive: { endorsed: GL.slogan.leadColor.onLight, accent: growth.accentOnLight, rule: [GL.color.navy, 0.25] },
  negative: { endorsed: GL.urlBubble.bakedOnDark, accent: growth.accentOnDark, rule: ['#cfe4fa', 0.3] },
  white: { endorsed: '#ffffff', accent: '#ffffff', rule: ['#ffffff', 0.5] }
}

function efeonceLogo(variant) {
  const raw = fs.readFileSync(path.join(EFEONCE_ASSETS, `efeonce-logo-${variant === 'positive' ? 'positive' : 'negative'}.svg`), 'utf8')
  const fills = Object.fromEntries([...raw.matchAll(/\.(cls-\d+)\s*\{\s*fill:\s*([^;]+);/g)].map(x => [x[1], x[2].trim()]))
  const body = raw
    .replace(/<\?xml[^>]*>/, '')
    .replace(/<defs>[\s\S]*?<\/defs>/, '')
    .replace(/class="(cls-\d+)"/g, (_, cl) => `fill="${variant === 'white' ? '#ffffff' : (fills[cl] ?? '#000')}"`)
    .replace(/\s(id|data-name)="[^"]*"/g, '')
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')

  return { body, w: 837.07, h: 196.68 }
}

function lockupSvg(m, variant) {
  const t = LOCKUP_TONE[variant]
  const L = { efeonceH: 30, gap: 20, ruleH: 26 }
  const markH = m.top * (21 / 719)
  const markW = ((m.right - m.left) * markH) / m.top
  const H = Math.max(L.efeonceH, markH)
  const e = efeonceLogo(variant)
  const ew = (e.w * L.efeonceH) / e.h
  const rx = ew + L.gap
  const mx = rx + 1 + L.gap
  const s = markH / m.top

  return doc(mx + markW, H,
    `<svg x="0" y="${f((H - L.efeonceH) / 2)}" width="${f(ew)}" height="${L.efeonceH}" viewBox="0 0 ${e.w} ${e.h}">${e.body}</svg>` +
    `<rect x="${f(rx)}" y="${f((H - L.ruleH) / 2)}" width="1" height="${L.ruleH}" fill="${t.rule[0]}" fill-opacity="${t.rule[1]}"/>` +
    `<g transform="translate(${f(mx - m.left * s)} ${f((H - markH) / 2 + markH)}) scale(${s.toFixed(6)} ${(-s).toFixed(6)})">${inner(m, t.endorsed, t.accent)}</g>`)
}

fs.mkdirSync(OUT, { recursive: true })
for (const old of fs.readdirSync(OUT)) fs.unlinkSync(path.join(OUT, old))
const write = (name, content) => fs.writeFileSync(path.join(OUT, name), content)

for (const [key, set] of Object.entries(SETS)) {
  const m = idMark(set)

  for (const [variant, v] of Object.entries(VARIANTS)) {
    write(`huella-${key}-logo-${variant}.svg`, logoSvg(m, v))
    write(`huella-${key}-isotype-${variant}.svg`, isotypeSvg(m, v))
    write(`huella-${key}-lockup-${variant}.svg`, lockupSvg(m, variant))
  }

  write(`huella-${key}-app-tile.svg`, tileSvg(m))
}

// ─── Construcción de la elegida ─────────────────────────────────────────────────────────────────────────
function constructionSvg(m) {
  const pad = 260
  const w = m.right - m.left + pad * 2
  const h = m.top + pad * 2
  const g = '#36c8bf'
  const ln = (x1, y1, x2, y2, dash = '') => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${g}" stroke-width="3" ${dash ? `stroke-dasharray="${dash}"` : ''} vector-effect="non-scaling-stroke"/>`
  const ray = at(m.c, m.rOuter + 170, 45 * D2R)
  const guides =
    ln(m.left - 200, CAP, m.right + 200, CAP, '6 8') +
    ln(m.left - 200, 0, m.right + 200, 0, '6 8') +
    ln(m.stemR, -120, m.stemR, CAP + 120, '6 8') +
    ln(m.c.x, -120, m.c.x, CAP + 120, '6 8') +
    ln(m.stemR, -70, m.c.x, -70) + ln(m.stemR, -90, m.stemR, -50) + ln(m.c.x, -90, m.c.x, -50) +
    ln(m.c.x, m.c.y, ray.x, ray.y) +
    `<circle cx="${f(m.c.x)}" cy="${f(m.c.y)}" r="${f(m.rOuter)}" fill="none" stroke="${g}" stroke-width="3" stroke-dasharray="14 12" vector-effect="non-scaling-stroke"/>` +
    `<circle cx="${f(m.S.x)}" cy="${f(m.S.y)}" r="${m.sphereR + m.knock}" fill="none" stroke="${g}" stroke-width="3" vector-effect="non-scaling-stroke"/>` +
    `<circle cx="${f(m.c.x)}" cy="${f(m.c.y)}" r="9" fill="${g}"/>`

  return doc(w, h, `<rect width="${f(w)}" height="${f(h)}" fill="${GL.color.dark}"/><g transform="translate(${f(pad - m.left)} ${f(pad + m.top)}) scale(1 -1)">${inner(m, '#ffffff', growth.accentOnDark)}<g opacity="0.85">${guides}</g></g>`)
}

write('huella-p110-construction.svg', constructionSvg(idMark(SETS.p110)))

console.log(JSON.stringify({ files: fs.readdirSync(OUT).length }))
