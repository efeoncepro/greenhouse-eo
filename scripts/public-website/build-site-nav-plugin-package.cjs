/**
 * Scoped package for the eo-site-nav plugin (TASK-2041, EPIC-055): every file of the plugin, with its SHA and the SHA
 * the live site has (null for a file the site does not have yet), so the deploy refuses on drift. Does not mutate the
 * live site. Gates before building: `php tests/eo-site-nav-validator.test.php` and `tests/playground/run-eo-site-nav.sh`
 * in the runtime repo.
 *
 *   node scripts/public-website/build-site-nav-plugin-package.cjs <exported live baseline dir>
 */
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const cp = require('node:child_process')

const runtime = process.env.PUBLIC_SITE_RUNTIME_ROOT || '/Users/jreye/Documents/efeonce-public-site-runtime'
const plugin = path.join(runtime, 'wp-content/plugins/eo-site-nav')
const baseline = process.argv[2]

if (!baseline) throw new Error('Pass exported live code baseline directory.')
const sha = content => crypto.createHash('sha256').update(content).digest('hex')

// The package is exactly what the plugin directory holds in git: no stray local files reach production.
const relativeFiles = cp.execFileSync('git', ['ls-files', '--', '.'], { cwd: plugin, encoding: 'utf8' }).split('\n').filter(Boolean).sort()
const dirty = cp.execFileSync('git', ['status', '--porcelain', '--', '.'], { cwd: plugin, encoding: 'utf8' }).trim()

if (dirty) throw new Error(`Plugin has uncommitted changes; commit them before packaging:\n${dirty}`)
if (!relativeFiles.includes('eo-site-nav.php')) throw new Error('Plugin main file missing.')

const files = relativeFiles.map(relative => {
  const live = path.join(baseline, 'code/wp-content/plugins/eo-site-nav', relative)

  return { path: relative, sha256: sha(fs.readFileSync(path.join(plugin, relative))), previousSha256: fs.existsSync(live) ? sha(fs.readFileSync(live)) : null }
})

const commit = cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: runtime, encoding: 'utf8' }).trim()
const manifest = { contract: 'eo-site-nav-release.v1', createdAt: new Date().toISOString(), runtimeCommit: commit, files }
const out = path.resolve('tmp/site-nav-plugin-release')

fs.mkdirSync(out, { recursive: true })
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
const zip = path.join(out, 'package.zip')

if (fs.existsSync(zip)) fs.unlinkSync(zip)
cp.execFileSync('zip', ['-q', zip, ...relativeFiles], { cwd: plugin })
console.log(JSON.stringify({ runtimeCommit: commit, files: files.length, created: files.filter(f => !f.previousSha256).map(f => f.path), changedExisting: files.filter(f => f.previousSha256 && f.previousSha256 !== f.sha256).map(f => f.path), packageSha256: sha(fs.readFileSync(zip)), manifest: path.join(out, 'manifest.json') }, null, 2))
