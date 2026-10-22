/**
 * Scoped package for the global site navigation adapter in the ohio-child theme (TASK-2042, EPIC-055): only the files
 * the adapter owns, with their SHA and the SHA the live site has (null for a file the site does not have yet), so the
 * deploy refuses on drift. Does not mutate the live site. The rest of the theme never travels in this package.
 * Gates before building, in the runtime repo: `php tests/eo-site-nav-render.test.php` and the Playground comparison.
 *
 *   node scripts/public-website/build-site-nav-theme-package.cjs <exported live baseline dir>
 */
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const cp = require('node:child_process')

const runtime = process.env.PUBLIC_SITE_RUNTIME_ROOT || '/Users/jreye/Documents/efeonce-public-site-runtime'
const theme = path.join(runtime, 'wp-content/themes/ohio-child')
const baseline = process.argv[2]

if (!baseline) throw new Error('Pass exported live code baseline directory.')
const sha = content => crypto.createHash('sha256').update(content).digest('hex')

// Same allowlist as the deploy script: the adapter, its header overrides, its host assets and the pinned AXIS files.
const SCOPE = /^(functions\.php|inc\/site-nav\.php|parts\/headers\/header-style-[1-8]\.php|assets\/css\/site-nav-host\.css|assets\/js\/site-nav-host\.js|assets\/vendor\/axis\/site-nav\/\d+\.\d+\.\d+\/(VERSION\.json|site-nav\.(css|js)|brand\/[a-z0-9-]+\.svg))$/
const version = (fs.readFileSync(path.join(theme, 'inc/site-nav.php'), 'utf8').match(/const EO_SITE_NAV_AXIS = '(\d+\.\d+\.\d+)'/) || [])[1]

if (!version) throw new Error('EO_SITE_NAV_AXIS not found in inc/site-nav.php.')
const tracked = cp.execFileSync('git', ['ls-files', '--', '.'], { cwd: theme, encoding: 'utf8' }).split('\n').filter(Boolean)
const relativeFiles = tracked.filter(f => SCOPE.test(f) && (!f.startsWith('assets/vendor/') || f.startsWith(`assets/vendor/axis/site-nav/${version}/`))).sort()
const dirty = cp.execFileSync('git', ['status', '--porcelain', '--', ...relativeFiles], { cwd: theme, encoding: 'utf8' }).trim()

if (dirty) throw new Error(`Theme files in scope have uncommitted changes; commit them before packaging:\n${dirty}`)
for (const required of ['functions.php', 'inc/site-nav.php', `assets/vendor/axis/site-nav/${version}/VERSION.json`]) {
  if (!relativeFiles.includes(required)) throw new Error(`Missing in package: ${required}`)
}
if (relativeFiles.filter(f => f.startsWith('parts/headers/')).length !== 8) throw new Error('Expected the 8 header-style overrides.')

// The vendored files must match their VERSION.json, which records the published package.
const pinned = JSON.parse(fs.readFileSync(path.join(theme, `assets/vendor/axis/site-nav/${version}/VERSION.json`), 'utf8'))
for (const [rel, digest] of Object.entries(pinned.files)) {
  if (sha(fs.readFileSync(path.join(theme, `assets/vendor/axis/site-nav/${version}`, rel))) !== digest) throw new Error(`Vendored file differs from VERSION.json: ${rel}`)
}

const files = relativeFiles.map(relative => {
  const live = path.join(baseline, 'code/wp-content/themes/ohio-child', relative)

  return { path: relative, sha256: sha(fs.readFileSync(path.join(theme, relative))), previousSha256: fs.existsSync(live) ? sha(fs.readFileSync(live)) : null }
})

const commit = cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: runtime, encoding: 'utf8' }).trim()
const manifest = { contract: 'eo-site-nav-theme-release.v1', createdAt: new Date().toISOString(), runtimeCommit: commit, axis: { primitives: pinned.version, source: pinned.source }, files }
const out = path.resolve('tmp/site-nav-theme-release')

fs.mkdirSync(out, { recursive: true })
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
const zip = path.join(out, 'package.zip')

if (fs.existsSync(zip)) fs.unlinkSync(zip)
cp.execFileSync('zip', ['-q', zip, ...relativeFiles], { cwd: theme })
console.log(JSON.stringify({ runtimeCommit: commit, axis: pinned.version, files: files.length, created: files.filter(f => !f.previousSha256).map(f => f.path), changedExisting: files.filter(f => f.previousSha256 && f.previousSha256 !== f.sha256).map(f => f.path), packageSha256: sha(fs.readFileSync(zip)), manifest: path.join(out, 'manifest.json') }, null, 2))
