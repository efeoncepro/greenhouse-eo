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

// El descriptor del CTA se ubica bajo la caja del cursor (componer-cta.mjs). Si esta caja deja de venir
// o deja de crecer con la escala, el descriptor vuelve a quedar bajo la flecha sin que nada lo avise.
test('cada cursor declara su caja en el lienzo, con la punta en el hotspot, y crece con la escala', () => {
  const local = result => result.evidence.cursorEvidence.find(cursor => cursor.id === 'local')
  const plain = local(renderCollaborationSelection(base))
  const scaled = local(renderCollaborationSelection({ ...base, presentation: { localCursorScale: 2 } }))

  for (const c of [plain, scaled, partnerEvidence(renderCollaborationSelection(base))]) {
    assert.ok(c.bounds, `${c.id} sin bounds`)
    assert.ok(c.bounds.left <= c.hotspot.x && c.hotspot.x <= c.bounds.right, `${c.id}: hotspot fuera de su caja en X`)
    assert.ok(c.bounds.top <= c.hotspot.y && c.hotspot.y <= c.bounds.bottom, `${c.id}: hotspot fuera de su caja en Y`)
  }

  assert.ok(scaled.bounds.bottom - scaled.bounds.top > (plain.bounds.bottom - plain.bounds.top) * 1.9)
})

test('presentation.frame=false omite el marco y conserva el cursor anclado', () => {
  const manifest = resolveCollaborationSelectionIntent({
    targetId: 'cta', targetKind: 'group', variant: 'open-brackets', padding: 'compact', overlay: 'none',
    cursors: [{ id: 'usuario', kind: 'local', targetId: 'cta', anchor: 'end-center', action: 'select' }]
  })

  const base = { manifest, targetBounds: { left: 100, top: 100, right: 300, bottom: 140 }, canvas: { width: 1080, height: 1350 }, measureLabel: () => 40 }
  const conMarco = renderCollaborationSelection(base)
  const sinMarco = renderCollaborationSelection({ ...base, presentation: { frame: false } })

  assert.match(conMarco.overlay, /<path d="M [^"]+ H [^"]+ V/)
  assert.doesNotMatch(sinMarco.overlay, /<path d="M [^"]+ H [^"]+ V/)
  assert.deepEqual(sinMarco.evidence.cursorEvidence, conMarco.evidence.cursorEvidence)
  assert.deepEqual(sinMarco.bounds, conMarco.bounds)
})

