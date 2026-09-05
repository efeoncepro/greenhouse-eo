import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const fontRoot = 'src/lib/artifact-composer/brand-packs/axis/fonts'
const licenseRoot = 'scripts/auth-server/font-licenses'
const sha256 = (bytes: string | Buffer): string => createHash('sha256').update(bytes).digest('hex')

/** Build-time only: immutable source bytes, no subsetting, conversion or network. */
export function buildAuthFontAssets(root: string) {
  const definitions = [
    ['Geist-Regular.ttf', 'geist-400.ttf', 'Geist'],
    ['Geist-SemiBold.ttf', 'geist-600.ttf', 'Geist'],
    ['Poppins-Bold.ttf', 'poppins-700.ttf', 'Poppins']
  ] as const

  const fonts = Object.fromEntries(definitions.map(([name, source, family]) => {
    const sourcePath = `${fontRoot}/${source}`
    const bytes = readFileSync(join(root, sourcePath))

    if (bytes.readUInt32BE(0) !== 0x00010000) throw new Error(`Invalid TrueType source: ${sourcePath}`)

    return [`/fonts/${name}`, {
      contentType: 'font/ttf', base64: bytes.toString('base64'), sha256: sha256(bytes), sourcePath,
      licensePath: `/fonts/licenses/${family}-OFL.txt`
    }]
  }))

  const licenses = Object.fromEntries(['Geist', 'Poppins'].map(family => {
    const text = readFileSync(join(root, licenseRoot, `${family}-OFL.txt`), 'utf8')

    if (!text.includes('SIL OPEN FONT LICENSE Version 1.1') || !text.includes(`The ${family} Project Authors`)) {
      throw new Error(`Missing canonical font license: ${family}`)
    }

    return [`/fonts/licenses/${family}-OFL.txt`, {
      contentType: 'text/plain; charset=utf-8', text, sha256: sha256(text),
      sourceUrl: `https://raw.githubusercontent.com/google/fonts/main/ofl/${family.toLowerCase()}/OFL.txt`
    }]
  }))

  return { fonts, licenses }
}

/** Caller writes this deterministic module alongside the generated brand assets. */
export function renderAuthFontAssetsModule(root: string): string {
  const { fonts, licenses } = buildAuthFontAssets(root)

  return '// GENERATED — scripts/auth-server/generate-font-assets.ts; do not edit.\n' +
    '// Unmodified AXIS font bytes; OFL notices must remain available with the assets.\n' +
    `export const AUTH_FONT_ASSETS = ${JSON.stringify(fonts, null, 2)} as const\n\n` +
    `export const AUTH_FONT_LICENSES = ${JSON.stringify(licenses, null, 2)} as const\n`
}
