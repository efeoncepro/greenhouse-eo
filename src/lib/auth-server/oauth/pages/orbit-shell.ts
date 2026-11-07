/**
 * Shell de las pantallas de Efeonce ID con la órbita (operador, 2026-11-02). Estilos en
 * `scripts/auth-server/orbit-shell-styles.ts`; geometría en `./orbit-geometry`.
 *
 * El panel hace UNO de los dos trabajos canónicos de la órbita (skill `efeonce-graphic-line`, lección 2026-11-02):
 * - `icon`: rodea un ícono de área del catálogo AXIS, en reposo, con anillo, acento y la esfera en la punta;
 * - `word`: la «órbita en reposo» aprobada en Rooms — anillo desnudo y la palabra, cuya esfera es la de la pantalla.
 * Nunca mide, nunca repite la esfera, nunca lleva un logo adentro y no se anima en bucle.
 *
 * Todo con atributos SVG y clases: la CSP del emisor no admite `style=`.
 */
import { AUTH_ORBIT_COPY, type OrbitHeading } from '@/lib/copy/auth-server-orbit'

import {
  ORBIT_ARC_FROM,
  ORBIT_ARC_STROKE,
  ORBIT_ARC_TO,
  ORBIT_HALO_RADIUS,
  ORBIT_HALO_STOPS,
  ORBIT_PANEL_RADIUS,
  ORBIT_RING_OPACITY,
  ORBIT_RING_STROKE,
  ORBIT_SPHERE_RADIUS
} from './orbit-geometry'
import { EFEONCE_ID_LOCKUP_NEGATIVE_SVG, EFEONCE_ID_LOCKUP_POSITIVE_SVG, ORBIT_ICONS, type OrbitGlyph } from './orbit-assets.generated'

export type OrbitPanel = { kind: 'icon'; glyph: OrbitGlyph } | { kind: 'word'; lines: readonly string[] }

const esc = (value: string): string =>
  value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char)

const TEAL = '#36c8bf'
const HALO = '#72ded8'

const orbitSvg = (withAccent: boolean): string => {
  const r = ORBIT_PANEL_RADIUS
  const h = ORBIT_HALO_RADIUS
  const stops = ORBIT_HALO_STOPS.map(stop => `<stop offset="${stop.offset}" stop-color="${HALO}" stop-opacity="${stop.opacity}"/>`).join('')

  const accent = withAccent
    ? `<path class="os-orbit-arc" d="M ${ORBIT_ARC_FROM.x} ${ORBIT_ARC_FROM.y} A ${r} ${r} 0 0 1 ${ORBIT_ARC_TO.x} ${ORBIT_ARC_TO.y}" fill="none" stroke="${TEAL}" stroke-width="${ORBIT_ARC_STROKE}" stroke-linecap="round"/><circle class="os-orbit-sphere" cx="${ORBIT_ARC_TO.x}" cy="${ORBIT_ARC_TO.y}" r="${ORBIT_SPHERE_RADIUS}" fill="${TEAL}"/>`
    : ''

  return `<svg class="os-orbit" width="${h * 2}" height="${h * 2}" viewBox="${-h} ${-h} ${h * 2} ${h * 2}" aria-hidden="true" focusable="false"><defs><radialGradient id="os-halo" cx="0" cy="0" r="${h}" gradientUnits="userSpaceOnUse">${stops}</radialGradient></defs><circle class="os-orbit-halo" r="${h}" fill="url(#os-halo)"/><circle class="os-orbit-ring" r="${r}" fill="none" stroke="${HALO}" stroke-opacity="${ORBIT_RING_OPACITY}" stroke-width="${ORBIT_RING_STROKE}"/>${accent}</svg>`
}

export const renderOrbitPanel = (panel: OrbitPanel): string => {
  if (panel.kind === 'icon') {
    return `<aside class="os-panel" aria-hidden="true" data-capture="id-orbit"><div class="os-panel-stage">${orbitSvg(true)}<div class="os-orbit-content">${ORBIT_ICONS[panel.glyph]}</div></div></aside>`
  }

  const longest = Math.max(...panel.lines.map(line => line.length))

  const words = panel.lines
    .map((line, index) => (index === panel.lines.length - 1 ? `${esc(line)}<span class="os-word-sphere"></span>` : esc(line)))
    .join('<br>')

  return `<aside class="os-panel" aria-hidden="true" data-capture="id-orbit"><div class="os-panel-stage">${orbitSvg(false)}<div class="os-orbit-content"><p class="os-word"${longest > 5 ? ' data-size="md"' : ''}>${words}</p></div></div></aside>`
}

/**
 * Titular de la pantalla. El punto final es un elemento propio: con el panel (escritorio) se pinta como punto
 * tipeado, porque la esfera ya es la de la órbita; sin panel (móvil) se pinta como la esfera, en el acento oscuro.
 */
export const orbitHeading = (heading: OrbitHeading): string =>
  `<h1 id="page-title" class="os-title" tabindex="-1"><span class="os-lead">${esc(heading.lead)}</span> ${esc(heading.key)}<span class="os-period" aria-hidden="true"></span></h1>`

export const orbitBrand = (): string =>
  `<header class="os-brand" role="img" aria-label="${esc(AUTH_ORBIT_COPY.brand)}"><span class="os-lockup-positive">${EFEONCE_ID_LOCKUP_POSITIVE_SVG}</span><span class="os-lockup-negative">${EFEONCE_ID_LOCKUP_NEGATIVE_SVG}</span></header>`

export const orbitFootnote = (text: string): string => `<p class="os-footnote">${esc(text)}</p>`

export const orbitHint = (text: string): string => `<p class="os-hint">${esc(text)}</p>`

export const orbitLink = (href: string, label: string, attributes = ''): string =>
  `<a class="os-link" href="${esc(href)}"${attributes}>${esc(label)}</a>`
