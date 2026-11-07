/**
 * Assets del panel con la órbita de Efeonce ID (operador, 2026-11-02).
 *
 * - Lockups «Efeonce | ID» y el isotipo de Rooms: copias EXACTAS de `@efeoncepro/axis-brand-assets` 0.4.32
 *   (`public/branding/SVG/`, mismo criterio que el favicon). Greenhouse fija 0.4.25, que todavía no los trae;
 *   al subir el pin, estos archivos deben seguir siendo idénticos al paquete.
 * - Íconos de área: SIEMPRE del catálogo AXIS con `resolveIcon` (voz Trazo, en reposo: dentro de una órbita el
 *   ícono nunca responde, la esfera la pone la órbita). Nunca se dibujan a mano.
 *
 * Sin `<style>` ni `class`: la CSP del emisor bloquea estilos sin hash y los colores tienen que ser atributos.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { resolveIcon } from '@efeoncepro/axis-graphic-line/icons'

export const ORBIT_ASSET_SOURCES = {
  lockupPositive: 'public/branding/SVG/efeonce-id-lockup-positive.svg',
  lockupNegative: 'public/branding/SVG/efeonce-id-lockup-negative.svg',
  roomsIsotype: 'public/branding/SVG/rooms-isotype-positive.svg'
} as const

/** Glifos del catálogo que usan las pantallas. Agregar uno exige que exista en `ICON_CATALOG`. */
export const ORBIT_ICON_GLYPHS = ['seguridad', 'correo', 'integracion', 'reloj'] as const

const readSvg = (root: string, relativePath: string): string => {
  const svg = readFileSync(join(root, relativePath), 'utf8').replace(/^<\?xml[^>]*>\s*/u, '').trim()

  if (/<style\b|\sclass=/u.test(svg)) throw new Error(`${relativePath}: trae <style> o class; la CSP lo bloquearía`)

  return svg
}

export function renderOrbitAssetsModule(root: string): string {
  const lockupPositive = readSvg(root, ORBIT_ASSET_SOURCES.lockupPositive)
  const lockupNegative = readSvg(root, ORBIT_ASSET_SOURCES.lockupNegative)
  const roomsIsotype = readSvg(root, ORBIT_ASSET_SOURCES.roomsIsotype)

  const icons = Object.fromEntries(
    ORBIT_ICON_GLYPHS.map(glyph => {
      const icon = resolveIcon({ glyph, state: 'rest', size: 104, line: 'growth', surface: 'dark' })

      if (icon.warnings.length) throw new Error(`resolveIcon(${glyph}): ${icon.warnings.join(', ')}`)

      return [glyph, icon.svg]
    })
  )

  return `// GENERATED FILE — no editar a mano. Fuentes: ${Object.values(ORBIT_ASSET_SOURCES).join(', ')}
// y el catálogo de íconos de @efeoncepro/axis-graphic-line (resolveIcon).
// Regenerar: pnpm auth-server:brand-assets:generate

/** Lockup «Efeonce | ID» sobre papel. */
export const EFEONCE_ID_LOCKUP_POSITIVE_SVG = ${JSON.stringify(lockupPositive)}

/** Lockup «Efeonce | ID» sobre oscuro (modo oscuro del navegador). */
export const EFEONCE_ID_LOCKUP_NEGATIVE_SVG = ${JSON.stringify(lockupNegative)}

/** Isotipo de Efeonce Rooms: marca de su cliente first-party en la ficha de la aplicación. */
export const ROOMS_ISOTYPE_POSITIVE_SVG = ${JSON.stringify(roomsIsotype)}

/** Íconos de área del catálogo AXIS, en reposo y en blanco sobre el panel oscuro. */
export const ORBIT_ICONS = ${JSON.stringify(icons, null, 2)} as const

export type OrbitGlyph = keyof typeof ORBIT_ICONS
`
}
