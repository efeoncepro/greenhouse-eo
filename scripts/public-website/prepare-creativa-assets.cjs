/** One-time asset preparation for the Agencia Creativa landing. Converts approved canvas media into plugin assets. */
const fs = require('node:fs')
const path = require('node:path')
const sharp = require('sharp')

const [mapFile, extraFile] = process.argv.slice(2)
if (!mapFile) throw new Error('Pass the blob → local file TSV (and optionally an extras TSV).')
const runtime = process.env.PUBLIC_SITE_RUNTIME_ROOT || '/Users/jreye/Documents/efeonce-public-site-runtime'
const outDir = path.join(runtime, 'wp-content/plugins/eo-elementor-widgets/assets/img/creativa')
const source = fs.readFileSync(path.join(__dirname, 'creativa-source/Main.dc.html'), 'utf8')
const used = new Set([...source.matchAll(/\/_blob\/([0-9a-f]{32})/g)].map(m => m[1]))
const rows = [mapFile, extraFile].filter(Boolean).flatMap(f => fs.readFileSync(f, 'utf8').trim().split('\n').map(l => l.split('\t')))
const map = Object.fromEntries(rows)
const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

fs.mkdirSync(outDir, { recursive: true })
const manifest = {}
;(async () => {
  for (const id of [...used, ...rows.filter(r => !/^[0-9a-f]{32}$/.test(r[0])).map(r => r[0])]) {
    const file = map[id]
    if (!file || !fs.existsSync(file)) throw new Error(`Missing source for ${id}`)
    const ext = path.extname(file).toLowerCase()
    const base = slug(path.basename(path.dirname(file)) + '-' + path.basename(file, ext))
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
  fs.writeFileSync(path.join(__dirname, 'creativa-source/assets.json'), JSON.stringify(manifest, null, 2) + '\n')
  console.log(Object.keys(manifest).length, 'assets')
})()
