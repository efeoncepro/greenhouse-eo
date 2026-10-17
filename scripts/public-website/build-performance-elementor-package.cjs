/** Reproducible scoped Performance Marketing widget package. Does not mutate the live site. */
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const cp = require('node:child_process')

const runtime = process.env.PUBLIC_SITE_RUNTIME_ROOT || '/Users/jreye/Documents/efeonce-public-site-runtime'
const plugin = path.join(runtime, 'wp-content/plugins/eo-elementor-widgets')
const baseline = process.argv[2]

if (!baseline) throw new Error('Pass exported live code baseline directory.')
const sha = content => crypto.createHash('sha256').update(content).digest('hex')
const list = dir => fs.readdirSync(path.join(plugin, dir)).sort().map(f => dir + '/' + f)
const usedAssets = JSON.parse(fs.readFileSync(path.join(__dirname, 'performance-source/used-assets.json'), 'utf8'))

const relativeFiles = [
  'includes/class-eo-widgets-loader.php',
  'includes/widgets/class-eo-performance-landing-base.php',
  'includes/widgets/class-eo-performance-landing-widgets.php',
  'includes/performance/seo.php',
  ...list('includes/performance/schemas'),
  ...list('includes/performance/templates'),
  'assets/css/performance-landing.css',
  'assets/js/performance-landing.js',
  ...usedAssets.map(name => 'assets/img/performance/' + name),
]

const files = relativeFiles.map(relative => {
  const local = path.join(plugin, relative)
  const live = path.join(baseline, 'code/wp-content/plugins/eo-elementor-widgets', relative)

  if (!fs.existsSync(local)) throw new Error(`Missing package file: ${relative}`)

  return { path: relative, sha256: sha(fs.readFileSync(local)), previousSha256: fs.existsSync(live) ? sha(fs.readFileSync(live)) : null }
})

const manifest = { contract: 'performance-elementor-release.v1', createdAt: new Date().toISOString(), files }
const out = path.resolve('tmp/performance-elementor-release')

fs.mkdirSync(out, { recursive: true })
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
const zip = path.join(out, 'package.zip')

if (fs.existsSync(zip)) fs.unlinkSync(zip)
cp.execFileSync('zip', ['-q', zip, ...relativeFiles], { cwd: plugin })
console.log(JSON.stringify({ files: files.length, changedExisting: files.filter(f => f.previousSha256 && f.previousSha256 !== f.sha256).map(f => f.path), packageSha256: sha(fs.readFileSync(zip)), manifest: path.join(out, 'manifest.json') }, null, 2))
