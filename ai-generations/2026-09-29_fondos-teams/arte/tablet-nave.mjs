// Pantalla de la tableta de diseño en «Hecho a mano»: la nave 3D oficial de Efeonce (render blanco del kit) en una vista
// de app de modelado 3D. Es el «(casi)»: la pieza de plastilina tiene su versión digital. Referencia exacta para la edición.
// node tablet-nave.mjs → tablet-nave.png
import { createRequire } from 'node:module'

const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const sharp = require('sharp')
const R = '/Users/jreye/Documents/greenhouse-eo/'
const DIR = new URL('./', import.meta.url).pathname
const W = 1200
const H = 800

const nave = await sharp(R + 'ai-generations/2026-09-17_efeonce-ship-3d/final/efeonce-nave-3d-blanco-02-tres-cuartos-izquierda-1x1-1600x1600-v01-transparente.png').resize(560, 560).png().toBuffer()
const rejilla = Array.from({ length: 14 }, (_, i) => `<line x1="${120 + i * 70}" y1="560" x2="${-200 + i * 130}" y2="800" stroke="#3a4250" stroke-width="1"/>`).join('') +
  Array.from({ length: 5 }, (_, i) => `<line x1="0" y1="${560 + i * i * 12 + i * 20}" x2="${W}" y2="${560 + i * i * 12 + i * 20}" stroke="#3a4250" stroke-width="1"/>`).join('')
const ui = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs><radialGradient id="g" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#3b4350"/><stop offset="1" stop-color="#1c2129"/></radialGradient>
  <radialGradient id="s" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>${rejilla}
  <ellipse cx="610" cy="590" rx="250" ry="40" fill="url(#s)"/>
  <rect width="${W}" height="44" fill="#14181e"/>${[0, 1, 2, 3, 4].map(i => `<rect x="${20 + i * 34}" y="14" width="22" height="16" rx="3" fill="#2d3440"/>`).join('')}
  <rect y="44" width="64" height="${H - 44}" fill="#171b22"/>${[0, 1, 2, 3, 4, 5, 6].map(i => `<rect x="18" y="${70 + i * 56}" width="28" height="28" rx="6" fill="${i === 2 ? '#0375db' : '#2d3440'}"/>`).join('')}
  <rect x="${W - 210}" y="44" width="210" height="${H - 44}" fill="#171b22"/>${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${W - 190}" y="${74 + i * 44}" width="${120 + (i % 3) * 20}" height="10" rx="5" fill="#2d3440"/>`).join('')}
</svg>`)
await sharp(ui).composite([{ input: nave, left: 330, top: 110 }]).png().toFile(DIR + 'tablet-nave.png')
console.log('ok')
