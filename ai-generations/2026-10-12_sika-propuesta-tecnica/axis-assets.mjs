// Recursos de La órbita para la propuesta técnica de Sika (línea Brand), resueltos desde AXIS; nunca dibujados a mano.
// Uso (desde la raíz del repo): node ai-generations/2026-10-12_sika-propuesta-tecnica/axis-assets.mjs > .../axis-assets.json
import { auditIconGroup, deckSlideHtml, resolveIcon } from '@efeoncepro/axis-graphic-line'
const SECTIONS = 4, LINE = 'brand'
const out = { nav: {}, icons: {}, raw: null }
for (let current = 1; current <= SECTIONS; current++) {
  for (const theme of ['dark', 'light']) {
    let html
    try { html = deckSlideHtml('content', { sections: SECTIONS, current, line: LINE, theme, question: 'x', answer: 'x' }) } catch (e) { html = deckSlideHtml('content', { sections: SECTIONS, current, line: LINE, question: 'x', answer: 'x' }) }
    out.nav[`${theme}-${current}`] = html.match(/<g data-axis-element="deck"[\s\S]*?<\/g>/)[0]
  }
}
const GROUPS = {
  metodo: ['objetivo', 'composer', 'multimedia', 'checklist', 'enviar'],
  control: ['contrato', 'republicar', 'seguridad', 'ia', 'assets'],
  insumos: ['presentacion', 'base-de-datos', 'calendario', 'reunion', 'informe'],
  piezas: ['social', 'swipe', 'prensa', 'ubicacion', 'medicion']
}
for (const [group, glyphs] of Object.entries(GROUPS)) {
  const items = glyphs.map(glyph => ({ glyph, line: LINE, surface: 'dark', size: 52 }))
  const audit = auditIconGroup(items, { pieceHasSphere: true })
  if (!audit.ok) throw new Error(`${group}: ${JSON.stringify(audit.issues)}`)
  for (const item of items) out.icons[`${item.glyph}-dark`] = resolveIcon(item).svg
}
process.stdout.write(JSON.stringify(out, null, 2))
