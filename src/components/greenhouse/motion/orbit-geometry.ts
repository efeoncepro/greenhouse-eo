/**
 * TASK-1964 — Geometría de la órbita de «La órbita» para superficies de producto (lente del login, OrbitLoader).
 *
 * Todo valor de marca sale de `efeonceGraphicLine` (`@efeoncepro/axis-tokens`); este módulo sólo lo traduce a
 * coordenadas SVG. Convención SVG: ángulos en grados, 0° a las 3 en punto, sentido horario (y hacia abajo), así que
 * 270° son las 12 y el arco de acento «arriba a la izquierda» va de 200° a 250°.
 */
import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'
import { AXIS_GRAPHIC_LINE_POSITION_DEGREES } from '@efeoncepro/axis-ui-contracts'

export const ORBIT_TOKENS = efeonceGraphicLine

/** Barrido del arco de acento de la lente y de la estela del loader (50°). */
export const ORBIT_ARC_SWEEP_DEG = efeonceGraphicLine.lens.anatomy.arcSweepDeg

/**
 * Ángulo final del arco de acento: el arco va centrado en `upper-start` (arriba a la izquierda) y la esfera vive en su
 * punta, igual que el resolver de la lente del contrato `graphic-line-orbit` (200° → 250°).
 */
export const ORBIT_ACCENT_END_DEG = 360 + AXIS_GRAPHIC_LINE_POSITION_DEGREES['upper-start'] + ORBIT_ARC_SWEEP_DEG / 2

/** Escala de la anatomía de la lente: los trazos y la esfera crecen sólo con el ancho (base 794 px). */
export const orbitWidthScale = (widthPx: number) => widthPx / efeonceGraphicLine.orbit.baseWidthPx

type ServiceLineKey = (typeof efeonceGraphicLine.lines)[number]['key']

/**
 * Acento sobre fondo oscuro de la línea de servicio («la línea de servicio decide el acento»). `greenhouse` y cualquier
 * clave desconocida caen en la marca madre (`growth`).
 */
export const lineAccentOnDark = (serviceLine?: string | null) => {
  const lines = efeonceGraphicLine.lines
  const line = lines.find(item => item.key === (serviceLine as ServiceLineKey)) ?? lines.find(item => item.key === 'growth')

  return line?.accentOnDark ?? efeonceGraphicLine.color.teal
}

/** Las 12 en punto en la convención SVG. */
export const ORBIT_TOP_DEG = 270

export const pointOnCircle = (cx: number, cy: number, r: number, deg: number) => {
  const rad = (deg * Math.PI) / 180

  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

/** Path SVG de un arco horario que termina en `endDeg` y barre `sweepDeg`. */
export const arcPath = (cx: number, cy: number, r: number, endDeg: number, sweepDeg: number) => {
  const start = pointOnCircle(cx, cy, r, endDeg - sweepDeg)
  const end = pointOnCircle(cx, cy, r, endDeg)
  const large = sweepDeg > 180 ? 1 : 0

  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
}

/**
 * La esfera que cierra la respuesta (la voz con esfera de «La órbita»): diámetro y aire óptico en em según la última
 * letra, desde `efeonceGraphicLine.sphere`. Mismo cálculo que `answerSphere` de `@efeoncepro/axis-graphic-line`, sin
 * arrastrar ese paquete (pinta SVG e íconos) al bundle del cliente.
 */
export const answerSphere = (text: string) => {
  const { diameterEm, opticalGapEm, defaultGapEm } = efeonceGraphicLine.sphere
  const gaps = opticalGapEm as Record<string, number>

  return { diameterEm, gapEm: gaps[text.trim().slice(-1)] ?? defaultGapEm }
}

/** El anillo pequeño delante de la pregunta (receta `question` de AXIS): tamaño, trazo y aire en em. */
export const QUESTION_RING = { sizeEm: 0.42, strokeEm: 0.06, gapEm: 0.35, baselineEm: 0.08 } as const
