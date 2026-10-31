/** Reproducible scoped Contacto widget package. Does not mutate the live page. */
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const cp = require('node:child_process')

const runtime = process.env.PUBLIC_SITE_RUNTIME_ROOT || '/Users/jreye/Documents/efeonce-public-site-runtime'
const plugin = path.join(runtime, 'wp-content/plugins/eo-elementor-widgets')
const baseline = process.argv[2]

if (!baseline) throw new Error('Pass exported live code baseline directory.')
const sha = content => crypto.createHash('sha256').update(content).digest('hex')

const relativeFiles = [
  'includes/class-eo-widgets-loader.php',
  'includes/contact/seo.php',
  'includes/widgets/class-eo-contact-landing-widgets.php',
  'assets/css/contact-landing.css',
  'assets/js/contact-landing.js',
  'assets/img/contact/contacto-nexa-hero.png',
  'assets/img/contact/contacto-careers-cap.png',
  'assets/img/contact/contacto-og-1200x630.png',
  'assets/audio/nexa-contacto.mp3',
  // Contacto v2 (2026-10-31): hero cine de Nexa, avatar, banderas, WhatsApp e insignias de partner.
  'assets/img/contact/contacto-nexa-hero-v2.jpg',
  'assets/img/contact/contacto-nexa-hero-v2-mobile.jpg',
  'assets/img/contact/contacto-nexa-avatar.jpg',
  'assets/img/contact/whatsapp.svg',
  'assets/img/contact/flags/cl.svg',
  'assets/img/contact/flags/us.svg',
  'assets/img/contact/flags/co.svg',
  'assets/img/contact/flags/mx.svg',
  'assets/img/contact/flags/pe.svg',
  'assets/img/contact/partners/hubspot-solutions-partner-gold-light.svg',
  'assets/img/contact/partners/salesforce-partner-badge-horizontal.svg',
]

const files = relativeFiles.map(relative => {
  const local = path.join(plugin, relative)
  const live = path.join(baseline, 'code/wp-content/plugins/eo-elementor-widgets', relative)

  if (!fs.existsSync(local)) throw new Error(`Missing package file: ${relative}`)
  
return {
    path: relative,
    sha256: sha(fs.readFileSync(local)),
    previousSha256: fs.existsSync(live) ? sha(fs.readFileSync(live)) : null,
  }
})

const manifest = { contract: 'contacto-elementor-release.v1', createdAt: new Date().toISOString(), files }
const out = path.resolve('tmp/contacto-elementor-release')

fs.mkdirSync(out, { recursive: true })
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
const zip = path.join(out, 'package.zip')

if (fs.existsSync(zip)) fs.unlinkSync(zip)
cp.execFileSync('zip', ['-q', zip, ...relativeFiles], { cwd: plugin })
console.log(JSON.stringify({ files: files.length, packageSha256: sha(fs.readFileSync(zip)), manifest: path.join(out, 'manifest.json') }, null, 2))
