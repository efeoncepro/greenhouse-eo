#!/usr/bin/env node
/**
 * Ronda 2 de Efeonce ID: «la nave como ID» (operador, 2026-11-01). Exploración, NO canon.
 *
 * La marca de un producto de acceso tiene que ser la que la gente ya reconoce: el ID es Efeonce. No se dibuja un símbolo
 * nuevo; se usan los archivos oficiales de Efeonce (logo e isotipo, cerrados) y se les agrega «ID» en Poppins Bold
 * Italic, que es la que calza con el logotipo: inclinación 10° contra 9° del logo y el mismo grosor de asta relativo
 * (0,24 de la altura de mayúscula contra 0,25 del logotipo, medido sobre la n).
 *
 * Piezas (positive / negative / white):
 *  - id-name-lockup: «efeonce ID» en una línea, como un nombre. Base común; la I y la D miden lo que la f del logo.
 *  - id-symbol-lockup: la nave + «ID», la pieza con golpe (héroe, credencial, botón grande).
 *  - id-stack: la nave sobre «ID», para el ícono de app y avatares.
 *  - id-app-tile / id-app-tile-favicon: la teja oscura con la nave e ID, y sólo la nave para ≤ 32 px.
 *  Una sola esfera por pieza: la de la nave. «ID» no lleva esfera ni órbita (el isotipo ya trae la suya).
 *
 * Uso: node ai-generations/2026-11-01_efeonce-id-logo/build-nave.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import * as fontkit from 'fontkit'
import { efeonceGraphicLine as GL } from '@efeoncepro/axis-tokens'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '../..')
const OUT = path.join(here, 'svg-nave')
const ITALIC = fontkit.openSync(path.join(repo, 'src/assets/fonts/Poppins-BoldItalic.ttf'))
const ASSETS = path.join(repo, 'node_modules/@efeoncepro/axis-brand-assets/assets')

const INK = { positive: GL.color.navy, negative: '#ffffff', white: '#ffffff' }
const f = n => Number(n.toFixed(2))

// ─── Archivos oficiales de Efeonce, con el color en atributos ────────────────────────────────────────────
function efeonce(kind, variant) {
  const raw = fs.readFileSync(path.join(ASSETS, `efeonce-${kind}-${variant === 'positive' ? 'positive' : 'negative'}.svg`), 'utf8')
  const fills = Object.fromEntries([...raw.matchAll(/\.(cls-\d+)\s*\{\s*fill:\s*([^;]+);/g)].map(x => [x[1], x[2].trim()]))
  const body = raw
    .replace(/<\?xml[^>]*>/, '')
    .replace(/<defs>[\s\S]*?<\/defs>/, '')
    .replace(/class="(cls-\d+)"/g, (_, c) => `fill="${variant === 'white' ? '#ffffff' : (fills[c] ?? '#000')}"`)
    .replace(/\s(id|data-name)="[^"]*"/g, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
  const [, , w, h] = raw.match(/viewBox="([^"]+)"/)[1].trim().split(/[\s,]+/).map(Number)

  return { body, w, h }
}

const place = (a, x, y, h) => {
  const w = (a.w * h) / a.h

  return { w, h, markup: `<svg x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" viewBox="0 0 ${a.w} ${a.h}">${a.body}</svg>` }
}

// ─── «ID» en contornos, escalado a una altura de mayúscula dada ──────────────────────────────────────────
const TRACK = 10 // unidades de fuente: la I y la D casi tocándose, como las letras del logotipo
function idWord(cap) {
  const layout = ITALIC.layout('ID')
  const s = cap / ITALIC.capHeight
  let x = 0
  const parts = []
  let minX = Infinity
  let maxX = -Infinity

  layout.glyphs.forEach((g, i) => {
    parts.push(g.path.translate(x, 0).toSVG())
    minX = Math.min(minX, x + g.bbox.minX)
    maxX = Math.max(maxX, x + g.bbox.maxX)
    x += layout.positions[i].xAdvance + TRACK
  })

  return { d: parts.join(' '), s, minX, width: (maxX - minX) * s, cap }
}

// Pone la palabra con su base en baselineY y su borde izquierdo en x (coordenadas de pantalla, y hacia abajo).
const idAt = (word, x, baselineY, ink) =>
  `<path fill="${ink}" transform="translate(${f(x - word.minX * word.s)} ${f(baselineY)}) scale(${f(word.s)} ${f(-word.s)})" d="${word.d}"/>`

const doc = (w, h, inner, label = 'Efeonce ID') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(w)} ${f(h)}" role="img" aria-label="${label}">${inner}</svg>\n`

// ─── id-name-lockup: «efeonce ID» ────────────────────────────────────────────────────────────────────────
// Medidas del logotipo (unidades de su viewBox 837 × 196,68): la f llega a 0, la base de la n está en 156, la altura
// de x mide 107. La I y la D tienen la altura de la f; el espacio entre palabras es un tercio de la altura de x.
const LOGO = { baseline: 156, ascender: 0, xHeight: 107 }

function nameLockup(variant) {
  const H = 60 // alto del logo en el archivo
  const logo = place(efeonce('logo', variant), 0, 0, H)
  const k = H / 196.68
  // A la altura completa de la f, «ID» gritaba sobre el logotipo; al 88 % se lee como parte del mismo nombre.
  const cap = (LOGO.baseline - LOGO.ascender) * k * 0.88
  const word = idWord(cap)
  const x = logo.w + (LOGO.xHeight / 3) * k

  return doc(x + word.width + 2, H, logo.markup + idAt(word, x, LOGO.baseline * k, INK[variant]))
}

// ─── id-symbol-lockup: la nave + «ID» ────────────────────────────────────────────────────────────────────
// La nave mide 727 × 516; su cuerpo (la cápsula con las ventanas) está centrado a ~0,47 del alto. «ID» se centra en el
// cuerpo y mide 0,56 del alto de la nave: pesa como ella sin taparla.
function symbolLockup(variant) {
  const H = 200
  const ship = place(efeonce('isotype', variant), 0, 0, H)
  const cap = H * 0.56
  const word = idWord(cap)
  const gap = H * 0.16
  const baseline = H * 0.47 + cap / 2

  return doc(ship.w + gap + word.width + 2, H, ship.markup + idAt(word, ship.w + gap, baseline, INK[variant]))
}

// ─── id-stack: la nave sobre «ID» ────────────────────────────────────────────────────────────────────────
function stack(variant) {
  const shipH = 200
  const ship = place(efeonce('isotype', variant), 0, 0, shipH)
  const cap = shipH * 0.5
  const word = idWord(cap)
  const gap = shipH * 0.2
  const W = Math.max(ship.w, word.width)
  const shipM = place(efeonce('isotype', variant), (W - ship.w) / 2, 0, shipH)

  return doc(W, shipH + gap + cap, shipM.markup + idAt(word, (W - word.width) / 2, shipH + gap + cap, INK[variant]))
}

// ─── Tejas de app ────────────────────────────────────────────────────────────────────────────────────────
function tile(withWord) {
  const S = 1024
  let inner = `<rect width="${S}" height="${S}" rx="${S * 0.22}" fill="${GL.color.dark}"/>`

  if (withWord) {
    const shipH = S * 0.36
    const shipW = (727.4 * shipH) / 516.12
    const cap = S * 0.2
    const word = idWord(cap)
    const gap = S * 0.07
    const top = (S - (shipH + gap + cap)) / 2

    inner += place(efeonce('isotype', 'negative'), (S - shipW) / 2, top, shipH).markup
    inner += idAt(word, (S - word.width) / 2, top + shipH + gap + cap, '#ffffff')
  } else {
    const shipW = S * 0.74
    const shipH = (516.12 * shipW) / 727.4

    inner += place(efeonce('isotype', 'negative'), (S - shipW) / 2, (S - shipH) / 2, shipH).markup
  }

  return doc(S, S, inner)
}

// ─── Salida ──────────────────────────────────────────────────────────────────────────────────────────────
fs.mkdirSync(OUT, { recursive: true })
const write = (name, content) => fs.writeFileSync(path.join(OUT, name), content)

for (const variant of ['positive', 'negative', 'white']) {
  write(`id-name-lockup-${variant}.svg`, nameLockup(variant))
  write(`id-symbol-lockup-${variant}.svg`, symbolLockup(variant))
  write(`id-stack-${variant}.svg`, stack(variant))
}

write('id-app-tile.svg', tile(true))
write('id-app-tile-favicon.svg', tile(false))

console.log(JSON.stringify({ files: fs.readdirSync(OUT).length }))
