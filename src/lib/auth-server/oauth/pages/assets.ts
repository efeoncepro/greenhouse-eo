import { createHash } from 'node:crypto'

import { EFEONCE_ID_FAVICON_SVG } from './efeonce-isotipo.generated'
import { AUTH_FONT_ASSETS, AUTH_FONT_LICENSES } from './fonts.generated'
import { AUTH_LOGIN_STAGE_ASSETS } from './login-stage.generated'

/**
 * Favicon del emisor: la marca de Efeonce ID (operador, 2026-11-01). Es la teja oscura con el isotipo
 * chico en negativo, que se lee igual sobre una pestaña clara y sobre una oscura: un SVG de favicon no
 * hereda el esquema del navegador. Se genera con `pnpm auth-server:brand-assets:generate`.
 */
const FAVICON_SVG = EFEONCE_ID_FAVICON_SVG

/** Exact bundled paths only: serving fonts never reads a user-selected filesystem path. */
const assets = new Map<string, { body: Buffer; contentType: string; sha256: string }>([
  ...Object.entries({ ...AUTH_FONT_ASSETS, ...AUTH_LOGIN_STAGE_ASSETS }).map(([path, asset]) => [path, {
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
