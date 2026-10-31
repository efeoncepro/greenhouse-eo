/**
 * TASK-2055 — Fidelity proof at the HTML level: the bound template fed with each view's fixture (the canvas literals
 * as data) must render the same markup as that view's approved board with the closed list of deviations applied.
 * Whitespace between tags is normalized (it only differs where the binding added template structure).
 */
const fs = require('node:fs')
const path = require('node:path')

const { renderBoard } = require('../blog-v3/lib/render-node.cjs')

const SRC = path.join(__dirname, 'source')
const VIEWS = ['tema', 'etiqueta', 'autor', 'busqueda', 'tema-vacio', 'busqueda-vacia', 'tema-glitch']

const norm = s => s.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim()

let failed = 0

for (const view of VIEWS) {
  const data = JSON.parse(fs.readFileSync(path.join(SRC, `fixture.${view}.json`), 'utf8'))
  const ref = norm(renderBoard(path.join(SRC, `Archivo-${view}.reference.dc.html`), {}).html)
  const bound = norm(renderBoard(path.join(SRC, 'Archivo.bound.dc.html'), { data }).html)

  if (ref === bound) {
    console.log(`✓ ${view}: bound template = canvas (${ref.length} chars)`)
    continue
  }

  failed++
  let i = 0

  while (i < ref.length && i < bound.length && ref[i] === bound[i]) i++
  console.log(`✗ ${view}: first difference at ${i}`)
  console.log('  canvas:', ref.slice(Math.max(0, i - 160), i + 160))
  console.log('  bound :', bound.slice(Math.max(0, i - 160), i + 160))
}

process.exit(failed ? 1 : 0)
