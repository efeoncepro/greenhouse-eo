// Opt-in photographic materialization of the accepted AXIS Efeonce voice.
import { axisAdvertising, efeonceGraphicLine as GL } from '@efeoncepro/axis-tokens'

export { GL }
export const ctaColors = { ...axisAdvertising.color, brandDark: GL.color.dark, brandAccentSoft: GL.color.halo, brandAccentOnDark: GL.color.teal, brandAccentOnLight: GL.color.tealDark }

// La línea de servicio decide el acento de la voz (La órbita, regla 8). Sin `graphicLine` la voz queda en growth,
// el teal de la marca madre: así los planes anteriores componen idénticos.
export const LINEAS = GL.lines.map(l => l.key)

export function graphicLineAccent(line = 'growth', ink) {
  const l = GL.lines.find(x => x.key === line)

  if (!l) throw new Error(`graphicLine: línea desconocida «${line}» (AXIS: ${LINEAS.join(', ')})`)

  return ink === 'dark' ? l.accentOnLight : l.accentOnDark
}

// Lo que el gate exige cuando la pieza declara su línea: la evidencia del QA nombra esa línea y pintó su acento.
export function acentoVozValido(p, g) {
  if (!p?.graphicLine) return true

  return g?.line === p.graphicLine && g?.accent === graphicLineAccent(p.graphicLine, p.ink)
}

export function validateGraphicVoice(p) {
  if (p.graphicLine && !p.graphicVoice) return ['graphicLine: el acento por línea sólo existe con graphicVoice: "efeonce"']
  if (!p.graphicVoice) return []
  const errors = []

  if (p.graphicLine && !LINEAS.includes(p.graphicLine)) errors.push(`graphicLine: línea desconocida «${p.graphicLine}» (AXIS: ${LINEAS.join(', ')})`)

  if (['outline', 'solid'].includes(p.cta?.variant) && !(p.cta.radius > 0)) errors.push('graphicVoice: el CTA de contorno o relleno de Efeonce requiere radio positivo; sus esquinas son redondeadas')
  if (p.align !== 'left') errors.push('graphicVoice: esta materialización requiere align: left')
  if (!p.lead || p.leadFamily === 'bricolage') errors.push('graphicVoice: requiere pregunta Poppins')
  if (!p.dominant || p.dominant.trim().split(/[\s|]+/).length > GL.type.answer.maxWords) errors.push('graphicVoice: respuesta de una a tres palabras')
  if (/[.*\[\]]/.test(p.dominant ?? '')) errors.push('graphicVoice: la esfera cierra la respuesta; no admite punto ni marcado enriquecido')
  if (p.dominantTracking !== undefined && p.dominantTracking !== parseFloat(GL.type.answer.tracking)) errors.push('graphicVoice: tracking de respuesta gobernado por AXIS')
  
return errors
}

export function answerSphere({ lastLine, baseline, size, color }) {
  const diameter = GL.sphere.diameterEm * size
  const gap = (GL.sphere.opticalGapEm[lastLine.text.at(-1)] ?? GL.sphere.defaultGapEm) * size
  const box = { left: lastLine.right + gap, right: lastLine.right + gap + diameter, top: baseline - diameter, bottom: baseline }

  
return { box, svg: `<circle cx="${(box.left + box.right) / 2}" cy="${(box.top + box.bottom) / 2}" r="${diameter / 2}" fill="${color}"/>` }
}

// Ring anatomy from AXIS graphicLine recipes: .42em diameter, .06em stroke, .35em following gap.
export function questionRing({ x, top, size, color, canvasWidth }) {
  const diameter = size * 0.42
  const stroke = Math.max(canvasWidth / 390, size * 0.06)
  const box = { left: x, right: x + diameter + stroke, top, bottom: top + diameter + stroke }

  
return { box, advance: diameter + stroke + size * 0.35, svg: `<circle cx="${(box.left + box.right) / 2}" cy="${(box.top + box.bottom) / 2}" r="${diameter / 2}" fill="none" stroke="${color}" stroke-width="${stroke}"/>` }
}
