import { AUTH_FONT_ASSETS, AUTH_FONT_LICENSES } from './fonts.generated'

/** Exact bundled paths only: serving fonts never reads a user-selected filesystem path. */
const assets = new Map<string, { body: Buffer; contentType: string; sha256: string }>([
  ...Object.entries(AUTH_FONT_ASSETS).map(([path, asset]) => [path, {
    body: Buffer.from(asset.base64, 'base64'), contentType: asset.contentType, sha256: asset.sha256
  }] as const),
  ...Object.entries(AUTH_FONT_LICENSES).map(([path, asset]) => [path, {
    body: Buffer.from(asset.text, 'utf8'), contentType: asset.contentType, sha256: asset.sha256
  }] as const)
])

export const getAuthFontAsset = (path: string) => assets.get(path) ?? null
