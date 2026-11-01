import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/** Only these reviewed source assets may be served; no request-selected file reads. */
const SOURCES = [
  'stage-default.webp',
  'announcement-ai-visibility-report.webp',
  'announcement-brand.webp',
  'announcement-engine.webp',
  'announcement-escalar-produccion-creativa.webp',
  'announcement-marketing-de-contenidos.webp'
] as const

export function buildLoginStageAssets(root: string) {
  return Object.fromEntries(SOURCES.map(name => {
    const sourcePath = `public/images/login/${name}`
    const bytes = readFileSync(join(root, sourcePath))

    if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') {
      throw new Error(`Invalid reviewed login WebP: ${name}`)
    }

    return [`/images/login/${name}`, {
      contentType: 'image/webp', base64: bytes.toString('base64'),
      sha256: createHash('sha256').update(bytes).digest('hex'), sourcePath
    }]
  }))
}

export function renderLoginStageAssetsModule(root: string): string {
  return '// GENERATED — scripts/auth-server/generate-login-stage-assets.ts; do not edit.\n' +
    `export const AUTH_LOGIN_STAGE_ASSETS = ${JSON.stringify(buildLoginStageAssets(root), null, 2)} as const\n`
}
