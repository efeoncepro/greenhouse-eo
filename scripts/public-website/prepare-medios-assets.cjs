/** Asset preparation for the Agencia de Medios landing. Converts the approved canvas media into plugin assets. */
const fs = require('node:fs')
const path = require('node:path')
const sharp = require('sharp')

const repo = path.resolve(__dirname, '../..')
const runtime = process.env.PUBLIC_SITE_RUNTIME_ROOT || '/Users/jreye/Documents/efeonce-public-site-runtime'
const outDir = path.join(runtime, 'wp-content/plugins/eo-elementor-widgets/assets/img/medios')
const source = fs.readFileSync(path.join(__dirname, 'medios-source/Main.dc.html'), 'utf8')
const used = new Set([...source.matchAll(/\/_blob\/([0-9a-f]{32})/g)].map(m => m[1]))
const map = Object.fromEntries(fs.readFileSync(path.join(__dirname, 'medios-source/blob-map.tsv'), 'utf8').trim().split('\n').map(l => l.split('\t')))
const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

fs.mkdirSync(outDir, { recursive: true })
const manifest = {}
const names = new Set()
;(async () => {
  for (const id of [...used].sort()) {
    const file = map[id] && path.resolve(repo, map[id])
    if (!file || !fs.existsSync(file)) throw new Error(`Missing source for ${id}`)
    const ext = path.extname(file).toLowerCase()
    let base = slug(path.basename(file, ext))
    if (names.has(base)) base = slug(path.basename(path.dirname(file)) + '-' + base)
    names.add(base)
    let name
    if (ext === '.mp4' || ext === '.svg') {
      name = base + ext
      fs.copyFileSync(file, path.join(outDir, name))
    } else {
      name = base + '.webp'
      await sharp(file).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(outDir, name))
    }
    manifest[id] = name
  }
  fs.writeFileSync(path.join(__dirname, 'medios-source/assets.json'), JSON.stringify(manifest, null, 2) + '\n')
  console.log(Object.keys(manifest).length, 'assets')
})()
