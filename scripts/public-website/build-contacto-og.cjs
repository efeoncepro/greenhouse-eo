/** Build the deterministic Contacto Open Graph image from approved brand assets. */
const fs = require('node:fs')
const path = require('node:path')

const sharp = require('sharp')

const runtime = process.env.PUBLIC_SITE_RUNTIME_ROOT || '/Users/jreye/Documents/efeonce-public-site-runtime'
const hero = path.join(runtime, 'wp-content/plugins/eo-elementor-widgets/assets/img/contact/contacto-nexa-hero.png')
const logo = path.resolve('public/branding/logo-full.svg')
const output = path.join(runtime, 'wp-content/plugins/eo-elementor-widgets/assets/img/contact/contacto-og-1200x630.png')

const escapeXml = value => value.replace(/[<>&'\"]/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char])

async function main() {
  const approvedLogo = fs.readFileSync(logo, 'utf8').replace(/#023c70/gi, '#ffffff')
  const logoBuffer = await sharp(Buffer.from(approvedLogo)).resize({ width: 230 }).png().toBuffer()

  const overlay = Buffer.from(`
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shade" x1="0" x2="1">
          <stop offset="0" stop-color="#00192d" stop-opacity="0.98"/>
          <stop offset="0.44" stop-color="#00192d" stop-opacity="0.83"/>
          <stop offset="0.72" stop-color="#00192d" stop-opacity="0.18"/>
          <stop offset="1" stop-color="#00192d" stop-opacity="0.04"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#shade)"/>
      <text x="72" y="285" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="66" font-weight="700" letter-spacing="-2">${escapeXml('Conversemos.')}</text>
      <text x="72" y="346" fill="#ffffff" opacity="0.92" font-family="Arial, Helvetica, sans-serif" font-size="30">${escapeXml('Tu mensaje, con el equipo adecuado.')}</text>
      <rect x="72" y="391" width="92" height="5" rx="2.5" fill="#caff4a"/>
    </svg>
  `)

  await sharp(hero)
    .resize(1200, 630, { fit: 'cover', position: 'centre' })
    .composite([
      { input: overlay, left: 0, top: 0 },
      { input: logoBuffer, left: 72, top: 62 },
    ])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(output)

  const metadata = await sharp(output).metadata()

  console.log(JSON.stringify({ output, width: metadata.width, height: metadata.height, bytes: fs.statSync(output).size }, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
