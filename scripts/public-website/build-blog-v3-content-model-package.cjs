/**
 * Scoped package of the efeonce-editorial-blocks plugin with the blog home content model (TASK-2050, PDR-029): every
 * file of the plugin as committed in the runtime, with its SHA and the SHA the live site has (null for a file the site
 * does not have yet), so the deploy refuses on drift. Does not mutate the live site.
 *
 * Gates before building, in the runtime repo: `php tests/eo-content-model.test.php` and the Playground check
 * (`tests/playground/run-eo-content-model.sh` + `node tests/playground/eo-content-model.e2e.mjs`).
 *
 *   pnpm public-website:export-live-code            (fresh baseline of the live code)
 *   node scripts/public-website/build-blog-v3-content-model-package.cjs <exported live baseline dir>
 */
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const cp = require('node:child_process')

const runtime = process.env.PUBLIC_SITE_RUNTIME_ROOT || '/Users/jreye/Documents/efeonce-public-site-runtime'
const plugin = path.join(runtime, 'wp-content/plugins/efeonce-editorial-blocks')
const baseline = process.argv[2]

if (!baseline) throw new Error('Pass exported live code baseline directory.')
const livePlugin = path.join(baseline, 'code/wp-content/plugins/efeonce-editorial-blocks')

if (!fs.existsSync(path.join(livePlugin, 'efeonce-editorial-blocks.php'))) {
  throw new Error(`The baseline has no efeonce-editorial-blocks (looked in ${livePlugin}). Export the live code first.`)
}

const sha = content => crypto.createHash('sha256').update(content).digest('hex')

// The package is exactly what the plugin directory holds in git: no stray local files reach production.
const relativeFiles = cp.execFileSync('git', ['ls-files', '--', '.'], { cwd: plugin, encoding: 'utf8' }).split('\n').filter(Boolean).sort()
const dirty = cp.execFileSync('git', ['status', '--porcelain', '--', '.'], { cwd: plugin, encoding: 'utf8' }).trim()

if (dirty) throw new Error(`Plugin has uncommitted changes; commit them before packaging:\n${dirty}`)

for (const required of ['efeonce-editorial-blocks.php', 'includes/content-model/bootstrap.php']) {
  if (!relativeFiles.includes(required)) throw new Error(`Missing ${required}.`)
}

const files = relativeFiles.map(relative => {
  const live = path.join(livePlugin, relative)

  return { path: relative, sha256: sha(fs.readFileSync(path.join(plugin, relative))), previousSha256: fs.existsSync(live) ? sha(fs.readFileSync(live)) : null }
})

// Live files the package does not carry would stay behind silently: list them so the operator decides.
const liveOnly = []

const walk = dir => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)

    if (entry.isDirectory()) walk(full)
    else {
      const rel = path.relative(livePlugin, full)

      if (!relativeFiles.includes(rel)) liveOnly.push(rel)
    }
  }
}

walk(livePlugin)

const commit = cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: runtime, encoding: 'utf8' }).trim()
const manifest = { contract: 'eo-blog-v3-content-model-release.v1', createdAt: new Date().toISOString(), runtimeCommit: commit, files }
const out = path.resolve('tmp/blog-v3-content-model-release')

fs.mkdirSync(out, { recursive: true })
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
const zip = path.join(out, 'package.zip')

if (fs.existsSync(zip)) fs.unlinkSync(zip)
cp.execFileSync('zip', ['-q', zip, ...relativeFiles], { cwd: plugin })
console.log(JSON.stringify({
  runtimeCommit: commit,
  files: files.length,
  created: files.filter(f => !f.previousSha256).map(f => f.path),
  changedExisting: files.filter(f => f.previousSha256 && f.previousSha256 !== f.sha256).map(f => f.path),
  liveOnly,
  packageSha256: sha(fs.readFileSync(zip)),
  manifest: path.join(out, 'manifest.json')
}, null, 2))
