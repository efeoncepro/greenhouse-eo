import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import fontAwesomeBrands from '@iconify/json/json/fa6-brands.json' with { type: 'json' }
import sharp from 'sharp'

const OUTPUT_DIRECTORY = path.resolve('public/branding/email/footer')
// Mirrors EMAIL_COLORS.muted. It remains readable over the governed email footer background.
const FOOTER_MUTED_COLOR = '#667085'

const SOCIAL_ICONS = {
  youtube: 'square-youtube',
  instagram: 'square-instagram',
  linkedin: 'linkedin',
  threads: 'square-threads'
}

await mkdir(OUTPUT_DIRECTORY, { recursive: true })

const wordmarkSource = await readFile(path.resolve('public/branding/logo-full.svg'), 'utf8')
const grayWordmark = wordmarkSource.replaceAll('#023c70', FOOTER_MUTED_COLOR)

await sharp(Buffer.from(grayWordmark))
  .resize({ width: 192 })
  .png()
  .toFile(path.join(OUTPUT_DIRECTORY, 'efeonce-wordmark-gray.png'))

for (const [channel, iconName] of Object.entries(SOCIAL_ICONS)) {
  const icon = fontAwesomeBrands.icons[iconName]

  if (!icon) throw new Error(`Missing Font Awesome Brands glyph ${iconName} for ${channel}`)

  const body = icon.body.replaceAll('currentColor', FOOTER_MUTED_COLOR)
  const viewBoxWidth = icon.width ?? fontAwesomeBrands.width ?? 24
  const viewBoxHeight = icon.height ?? fontAwesomeBrands.height ?? 24

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" width="36" height="36">${body}</svg>`

  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(OUTPUT_DIRECTORY, `${channel}.png`))
}

console.log(`Generated email-safe footer assets in ${OUTPUT_DIRECTORY}`)
