import { createHash } from 'node:crypto'

import { EFEONCE_ISOTIPO_SVG } from './efeonce-isotipo.generated'
import { AUTH_FONT_ASSETS, AUTH_FONT_LICENSES } from './fonts.generated'

/**
 * Favicon del emisor: el isotipo institucional, pintado con el azul de acento en vez del navy de
 * marca. La pestaña es lo único que no puede adaptarse al esquema del navegador —un SVG de favicon
 * no hereda `color`—, y el navy sobre una barra oscura desaparece; el acento se lee en las dos.
 */
const FAVICON_SVG = EFEONCE_ISOTIPO_SVG.replace(/currentColor/gu, '#0375db')

/** Exact bundled paths only: serving fonts never reads a user-selected filesystem path. */
const assets = new Map<string, { body: Buffer; contentType: string; sha256: string }>([
  ...Object.entries(AUTH_FONT_ASSETS).map(([path, asset]) => [path, {
    body: Buffer.from(asset.base64, 'base64'), contentType: asset.contentType, sha256: asset.sha256
  }] as const),
  ...Object.entries(AUTH_FONT_LICENSES).map(([path, asset]) => [path, {
    body: Buffer.from(asset.text, 'utf8'), contentType: asset.contentType, sha256: asset.sha256
  }] as const),
  [
    '/favicon.svg',
    {
      body: Buffer.from(FAVICON_SVG, 'utf8'),
      contentType: 'image/svg+xml',
      sha256: createHash('sha256').update(FAVICON_SVG).digest('hex')
    }
  ] as const
])

export const getAuthFontAsset = (path: string) => assets.get(path) ?? null
