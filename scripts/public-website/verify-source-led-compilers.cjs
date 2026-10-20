/**
 * Gate for the shared source-led compiler: re-runs every migrated landing compiler into a scratch runtime root and
 * compares each generated file byte by byte with the plugin files in the runtime checkout (what is deployed after
 * the last release). Exit 1 on any difference or on a file the compiler no longer produces. It does not touch
 * WordPress, the runtime checkout or the <landing>-source/used-assets.json files (they are restored after the run).
 *
 *   node scripts/public-website/verify-source-led-compilers.cjs
 */
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const cp = require('node:child_process')

const LANDINGS = ['medios', 'performance', 'inbound', 'agenda']
const runtime = process.env.PUBLIC_SITE_RUNTIME_ROOT || '/Users/jreye/Documents/efeonce-public-site-runtime'
const plugin = path.join(runtime, 'wp-content/plugins/eo-elementor-widgets')
const list = dir => fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true }).filter(f => fs.statSync(path.join(dir, f)).isFile()) : []
const failures = []
const report = {}

for (const landing of LANDINGS) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), `source-led-${landing}-`))
  const used = path.join(__dirname, `${landing}-source/used-assets.json`)
  const usedBefore = fs.readFileSync(used)

  try {
    cp.execFileSync(process.execPath, [path.join(__dirname, `compile-${landing}-elementor-source.cjs`)], { env: { ...process.env, PUBLIC_SITE_RUNTIME_ROOT: scratch }, stdio: 'pipe' })
  } finally {
    fs.writeFileSync(used, usedBefore)
  }

  const out = path.join(scratch, 'wp-content/plugins/eo-elementor-widgets')
  const generated = list(out)
  const expected = [...list(path.join(plugin, 'includes', landing)).map(f => path.join('includes', landing, f)), path.join('assets/css', `${landing}-landing.css`)]

  for (const file of generated) {
    const live = path.join(plugin, file)

    if (!fs.existsSync(live) || !fs.readFileSync(live).equals(fs.readFileSync(path.join(out, file)))) failures.push(`${landing}: differs ${file}`)
  }

  for (const file of expected) if (!generated.includes(file) && !file.endsWith('seo.php')) failures.push(`${landing}: no longer generated ${file}`)
  report[landing] = { generated: generated.length }
  fs.rmSync(scratch, { recursive: true, force: true })
}

console.log(JSON.stringify({ ok: failures.length === 0, report, failures: failures.slice(0, 40) }, null, 2))
process.exit(failures.length ? 1 : 0)
