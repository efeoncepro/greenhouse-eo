import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveCollaborationSelectionIntent } from '@efeoncepro/axis-ui-contracts'

import { renderCollaborationSelection } from './axis-advertising.mjs'

const manifest = resolveCollaborationSelectionIntent({
  targetId: 'headline',
  targetKind: 'text',
  variant: 'eight-handles',
  cursors: [
    { id: 'partner', kind: 'collaborator', targetId: 'headline', anchor: 'top-end', action: 'select', label: 'Claude', participantKind: 'role' },
    { id: 'local', kind: 'local', targetId: 'headline', anchor: 'bottom-start', action: 'select' }
  ]
})

const base = { manifest, targetBounds: { left: 300, top: 300, right: 780, bottom: 420 }, canvas: { width: 1080, height: 1350 }, measureLabel: (label, size) => label.length * size * 0.6 }
const partnerEvidence = result => result.evidence.cursorEvidence.find(cursor => cursor.id === 'partner')

test('presentation vacío reproduce el contrato por defecto', () => {
  assert.deepEqual(renderCollaborationSelection({ ...base, presentation: {} }), renderCollaborationSelection(base))
  assert.match(renderCollaborationSelection(base).overlay, /fill="#5d50ff"/)
})

test('collaboratorScale agranda etiqueta y cursor sin mover el anclaje semántico', () => {
  const plain = renderCollaborationSelection(base)
  const scaled = renderCollaborationSelection({ ...base, presentation: { collaboratorScale: 2 } })
  const a = partnerEvidence(plain)
  const b = partnerEvidence(scaled)

  assert.deepEqual(a.hotspot, b.hotspot)
  assert.ok(b.labelBounds.right - b.labelBounds.left > (a.labelBounds.right - a.labelBounds.left) * 1.9)
  assert.equal(scaled.evidence.withinCanvas, true)
})

test('participantColors aplica el color del participante con tinta que alcanza 4,5:1', () => {
  const result = renderCollaborationSelection({ ...base, presentation: { participantColors: { partner: '#d77757' } } })

  assert.match(result.overlay, /fill="#d77757"/)
  assert.match(result.overlay, /fill="#00284d" font-family/)
})

test('participantColors rechaza colores inválidos o sin contraste suficiente', () => {
  assert.throws(() => renderCollaborationSelection({ ...base, presentation: { participantColors: { partner: 'orange' } } }), /#rrggbb/)
  assert.throws(() => renderCollaborationSelection({ ...base, presentation: { participantColors: { partner: '#8a8a8a' } } }), /4\.5:1/)
})
