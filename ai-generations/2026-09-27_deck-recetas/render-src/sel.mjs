// Selección colaborativa y cursores con el contrato canónico de AXIS (efeonce.collaboration-selection) y el
// pintor de Greenhouse (scripts/creative/layout-compiler/axis-advertising.mjs). El objetivo se marca en la
// lámina con [data-sel] y se mide en el DOM ya renderizado; nada se dibuja a mano.
import { resolveCollaborationSelectionIntent } from '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-ui-contracts/dist/index.js'
import { renderCollaborationSelection } from '/Users/jreye/Documents/greenhouse-eo/scripts/creative/layout-compiler/axis-advertising.mjs'

export const paintSelection = async (pg, sel) => {
  const m = await pg.evaluate(kind => {
    const t = document.querySelector('[data-sel]')
    if (!t) return null
    const canvas = { width: 1920, height: 1080 }
    if (kind !== 'text') { const b = t.getBoundingClientRect(); return { bounds: { left: b.left, top: b.top, right: b.right, bottom: b.bottom }, canvas } }
    const r = document.createRange(); r.selectNodeContents(t); const b = r.getBoundingClientRect(); const pad = (b.height / Math.max(1, t.querySelectorAll('br').length + 1)) * 0.16
    return { bounds: { left: b.left, top: b.top + pad, right: b.right, bottom: b.bottom - pad * 0.6 }, canvas }
  }, sel.targetKind)
  if (!m) throw new Error('falta [data-sel]')
  const local = sel.mode === 'cta' || sel.cursor === 'local'
  const cursors = local
    ? [{ id: 'local', kind: 'local', targetId: 't', anchor: sel.anchor ?? 'end-center', action: 'select' }]
    : [{ id: 'collaborator', kind: 'collaborator', targetId: 't', anchor: sel.anchor ?? 'top-end', action: 'select', label: sel.label, participantKind: sel.participantKind ?? 'role' }]
  const manifest = resolveCollaborationSelectionIntent({
    targetId: 't', targetKind: sel.targetKind, variant: sel.variant ?? (sel.mode === 'cta' ? 'open-brackets' : 'eight-handles'),
    padding: sel.padding ?? 'standard', overlay: sel.overlay ?? 'none', cursors
  })
  const painted = renderCollaborationSelection({
    manifest, targetBounds: m.bounds, canvas: m.canvas,
    measureLabel: (label, size) => label.length * size * 0.62,
    presentation: local ? { localCursorScale: sel.scale ?? 1 } : { collaboratorScale: sel.scale ?? 1.25 }
  })
  if (!painted.evidence.withinCanvas) throw new Error('la selección sale del lienzo: ' + JSON.stringify(m.bounds) + ' ' + JSON.stringify(painted.evidence).slice(0, 600))
  await pg.evaluate(({ underlay, overlay }) => {
    const root = document.body.firstElementChild
    const layer = (markup, z) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 1920 1080'); s.setAttribute('width', '1920'); s.setAttribute('height', '1080'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('style', `position:absolute;inset:0;z-index:${z};pointer-events:none`); s.innerHTML = markup; return s }
    if (underlay) root.appendChild(layer(underlay, 2))
    root.appendChild(layer(overlay, 4))
  }, { underlay: painted.underlay ?? '', overlay: painted.overlay })
  return painted.evidence
}
