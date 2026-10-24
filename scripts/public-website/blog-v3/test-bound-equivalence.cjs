/**
 * TASK-2051 — Fidelity proof at the HTML level: the bound template fed with fixture.json must render the same markup
 * as the deviated canvas with its own literals. Whitespace between tags is normalized (it only differs where the
 * binding added template structure inside flex/grid containers, where it does not render).
 */
const fs = require('node:fs')
const path = require('node:path')

const { renderBoard } = require('./lib/render-node.cjs')

const SRC = path.join(__dirname, 'source')

const fixtures = {
  'Portada-v3': JSON.parse(fs.readFileSync(path.join(SRC, 'fixture.json'), 'utf8')),
  'Movil-v3': JSON.parse(fs.readFileSync(path.join(SRC, 'fixture.mobile.json'), 'utf8')),
}

const norm = s => s.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim()

let failed = 0

for (const board of Object.keys(fixtures)) {
  const ref = norm(renderBoard(path.join(SRC, board + '.reference.dc.html'), {}).html)
  const bound = norm(renderBoard(path.join(SRC, board + '.bound.dc.html'), { data: fixtures[board] }).html)

  if (ref === bound) {
    console.log(`✓ ${board}: bound template = canvas (${ref.length} chars)`)
    continue
  }

  failed++
  let i = 0

  while (i < ref.length && ref[i] === bound[i]) i++
  console.log(`✗ ${board}: first difference at ${i}`)
  console.log('  canvas:', ref.slice(Math.max(0, i - 120), i + 160))
  console.log('  bound :', bound.slice(Math.max(0, i - 120), i + 160))
}

process.exit(failed ? 1 : 0)
