// Pinta la selección colaborativa canónica (efeonce.collaboration-selection, mismo adaptador que el compositor) sobre
// las láminas a mano: mide en el DOM renderizado el elemento marcado con data-gl-sel y reemplaza <!--GL-SELECTION-->
// por la pintura de AXIS. Nunca coordenadas decorativas: la caja sale de los límites reales del objetivo.
// Uso (desde la raíz del repo): node ai-generations/2026-10-07_pibank-propuesta/paint-selection.mjs <carpeta project>
import fs from 'node:fs'
import path from 'node:path'

import { resolveCollaborationSelectionIntent } from '@efeoncepro/axis-ui-contracts'
import { chromium } from 'playwright'

import { renderCollaborationSelection } from '../../src/lib/creative/axis-advertising.mjs'

const dir = process.argv[2]
const MARK = '<!--GL-SELECTION-->'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })

for (const file of fs.readdirSync(dir).filter(f => /^Tec-\d\d\.dc\.html$/.test(f)).sort()) {
  const full = path.join(dir, file)
  const html = fs.readFileSync(full, 'utf8')

  if (!html.includes(MARK)) continue
  await page.setContent(html.replace('<script src="./support.js"></script>', ''), { waitUntil: 'networkidle' })

  const target = await page.evaluate(() => {
    const el = document.querySelector('[data-gl-sel]')
    const root = document.querySelector('x-dc > div')
    const b = el.getBoundingClientRect()
    const r = root.getBoundingClientRect()

    return {
      bounds: { left: b.left - r.left, top: b.top - r.top, right: b.right - r.left, bottom: b.bottom - r.top },
      label: el.dataset.glSel,
      anchor: el.dataset.glAnchor || 'bottom-end',
      kind: el.dataset.glKind || 'object'
    }
  })

  const manifest = resolveCollaborationSelectionIntent({
    targetId: 'answer',
    targetKind: target.kind,
    variant: 'eight-handles',
    padding: 'standard',
    overlay: 'none',
    cursors: [{ id: 'collaborator', kind: 'collaborator', targetId: 'answer', anchor: target.anchor, action: 'select', label: target.label, participantKind: 'role' }]
  })

  const painted = renderCollaborationSelection({
    manifest,
    targetBounds: target.bounds,
    canvas: { width: 1920, height: 1080 },
    measureLabel: (label, size) => label.length * size * 0.62,
    presentation: { collaboratorScale: 1, participantColors: {} }
  })

  if (!painted.evidence.withinCanvas) throw new Error(`${file}: la selección queda fuera del lienzo ${JSON.stringify(target)} ${JSON.stringify(painted.evidence)}`)
  const svg = `<svg viewBox="0 0 1920 1080" width="1920" height="1080" style="position: absolute; left: 0; top: 0; pointer-events: none" aria-hidden="true">${painted.underlay}${painted.overlay}</svg>`

  fs.writeFileSync(full, html.replace(MARK, svg))
  process.stdout.write(`${file}: selección «${target.label}» ${JSON.stringify(target.bounds)}\n`)
}

await browser.close()
