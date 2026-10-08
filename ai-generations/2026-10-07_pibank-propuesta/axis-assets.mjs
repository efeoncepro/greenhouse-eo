// Recursos de La órbita para la propuesta técnica de Pibank, resueltos desde AXIS (nunca dibujados a mano):
// - navegación del deck (progreso n de N) desde deckSlideHtml('content'), en papel y en oscuro;
// - la medida (aporte sobre la meta) desde measureSvg;
// - los íconos Trazo de la línea Engine desde resolveIcon, auditados con auditIconGroup.
// Uso: node ai-generations/2026-10-07_pibank-propuesta/axis-assets.mjs > ai-generations/2026-10-07_pibank-propuesta/axis-assets.json
import { auditIconGroup, deckSlideHtml, measureSvg, resolveIcon } from '@efeoncepro/axis-graphic-line'

const SECTIONS = 5
const LINE = 'engine'
const out = { nav: {}, icons: {}, measure: null }

for (let current = 1; current <= SECTIONS; current++) {
  const html = deckSlideHtml('content', { sections: SECTIONS, current, line: LINE, question: '¿?', answer: 'x' })
  const g = html.match(/<g data-axis-element="deck"[\s\S]*?<\/g>/)[0]

  out.nav[`light-${current}`] = g
  // En oscuro el anillo toma la tinta de anillo del contrato (la misma que pinta measureSvg sobre oscuro).
  out.nav[`dark-${current}`] = g.replace(/stroke="#023c70" stroke-opacity="0.14"/, 'stroke="#72ded8" stroke-opacity="0.22"')
}

// Aporte: hasta 195 cuentas con fondos de 15.200 (techo de la sensibilidad, captura madura 10 %).
const m = measureSvg({
  width: 1920,
  height: 1080,
  value: 195 / 15200,
  source: 'Sensibilidad Efeonce sobre 19 familias investigadas, captura madura 10 %',
  circle: { cx: 1310, cy: 380, r: 230 },
  line: LINE,
  surface: 'dark'
})

out.measure = { svg: m.svg, trajectory: m.trajectory, source: m.source }

const GROUPS = {
  seo: ['buscador', 'codigo', 'integracion', 'reloj', 'base-de-datos', 'checklist'],
  arranque: ['calendario', 'medicion', 'web', 'contrato', 'objetivo'],
  comunidad: ['correo', 'prensa'],
  recorrido: ['buscador', 'web', 'contrato', 'swipe', 'finanzas'],
  demanda: ['objetivo', 'contenido', 'finanzas', 'web'],
  frentes: ['buscador', 'contenido', 'medicion', 'ia', 'prensa'],
  palancas: ['buscador', 'contrato', 'finanzas', 'revenue']
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
