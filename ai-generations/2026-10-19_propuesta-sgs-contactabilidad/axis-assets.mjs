// Recursos de La órbita para la propuesta SGS, resueltos desde AXIS (nunca dibujados a mano):
// navegación de capítulo (n de 5) desde deckSlideHtml('content') y los íconos Trazo de la línea revenue-salesforce
// desde resolveIcon, auditados por grupo con auditIconGroup.
// Uso: node ai-generations/2026-10-19_propuesta-sgs-contactabilidad/axis-assets.mjs > ai-generations/2026-10-19_propuesta-sgs-contactabilidad/axis-assets.json
import { auditIconGroup, deckSlideHtml, resolveIcon } from '@efeoncepro/axis-graphic-line'

const SECTIONS = 5
const LINE = 'revenue-salesforce'
const out = { nav: {}, icons: {} }

for (let current = 1; current <= SECTIONS; current++) {
  const html = deckSlideHtml('content', { sections: SECTIONS, current, line: LINE, question: '¿?', answer: 'x' })
  const g = html.match(/<g data-axis-element="deck"[\s\S]*?<\/g>/)[0]
  out.nav[`light-${current}`] = g
  out.nav[`dark-${current}`] = g.replace(/stroke="#023c70" stroke-opacity="0.14"/, 'stroke="#72ded8" stroke-opacity="0.22"')
}

const GROUPS = {
  canales: ['reunion', 'correo', 'llamada', 'social'],
  vistas: ['crm', 'medicion'],
  criterios: ['seguridad', 'talent', 'checklist', 'objetivo', 'reloj'],
  frentes: ['checklist', 'presentacion', 'automatizacion', 'medicion'],
  cambios: ['llamada', 'social', 'contrato', 'reloj'],
  region: ['correo', 'integracion', 'social', 'crm', 'medicion'],
  datos: ['talent', 'calendario', 'social', 'llamada', 'crm', 'seguridad'],
  inversion: ['llamada', 'medicion', 'crm', 'presentacion', 'informe', 'automatizacion'],
  pasos: ['informe', 'checklist', 'presentacion', 'integracion']
}

for (const [group, glyphs] of Object.entries(GROUPS)) {
  for (const surface of ['dark', 'light']) {
    const items = glyphs.map(glyph => ({ glyph, line: LINE, surface, size: 52 }))
    const audit = auditIconGroup(items, { pieceHasSphere: true })
    if (!audit.ok) throw new Error(`${group}/${surface}: ${JSON.stringify(audit.issues)}`)
    for (const item of items) out.icons[`${item.glyph}-${surface}`] = resolveIcon(item).svg
  }
}

process.stdout.write(JSON.stringify(out, null, 2))
