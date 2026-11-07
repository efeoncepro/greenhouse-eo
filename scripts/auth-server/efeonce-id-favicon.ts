/**
 * Favicon de Efeonce Auth: la marca de Efeonce ID (operador, 2026-11-01; ADR
 * docs/architecture/brand/EFEONCE_ID_MARK_DECISION_V1.md). Es la teja aprobada en el canvas de la marca: el oscuro de
 * Efeonce con el isotipo chico en negativo (monograma blanco, esfera Growth), que se lee igual sobre una pestaña clara y
 * sobre una oscura. Un SVG de favicon no hereda el esquema del navegador; la teja resuelve los dos sin `<style>`.
 *
 * Fuente: el archivo oficial `efeonce-id-isotype-small-negative` (anillo y aire más gruesos, hecho para 32 px o menos),
 * nunca redibujado. El isotipo ocupa el 71,3 % del lado: el monograma queda al 60 %, como en la teja aprobada.
 */
import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'

export const EFEONCE_ID_FAVICON_SOURCE = 'public/branding/SVG/efeonce-id-isotype-small-negative.svg'

const SIDE = 64
const RADIUS = 14 // 22 % del lado, el radio de la teja aprobada
const ISOTYPE_SHARE = 0.713

export function buildEfeonceIdFavicon(isotypeSvg: string): string {
  const viewBox = isotypeSvg.match(/viewBox="([^"]+)"/)?.[1]

  if (!viewBox) throw new Error(`${EFEONCE_ID_FAVICON_SOURCE}: sin viewBox`)
  if (/<style\b|class=/u.test(isotypeSvg)) throw new Error(`${EFEONCE_ID_FAVICON_SOURCE}: los colores deben ser atributos`)

  const body = isotypeSvg
    .replace(/^<\?xml[^>]*>\s*/u, '')
    .replace(/^[\s\S]*?<svg[^>]*>/u, '')
    .replace(/<\/svg>\s*$/u, '')
    .trim()

  const size = Number((SIDE * ISOTYPE_SHARE).toFixed(2))
  const offset = Number(((SIDE - size) / 2).toFixed(2))

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIDE} ${SIDE}">` +
    `<rect width="${SIDE}" height="${SIDE}" rx="${RADIUS}" fill="${efeonceGraphicLine.color.dark}"/>` +
    `<svg x="${offset}" y="${offset}" width="${size}" height="${size}" viewBox="${viewBox}">${body}</svg>` +
    `</svg>`
  )
}
