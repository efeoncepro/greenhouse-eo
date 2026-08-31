/** Reproducible scoped build. Does not publish or touch unrelated live files. */
const fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto'),
  cp = require('node:child_process')

const runtime = process.env.PUBLIC_SITE_RUNTIME_ROOT || '/Users/jreye/Documents/efeonce-public-site-runtime'
const plugin = path.join(runtime, 'wp-content/plugins/eo-elementor-widgets')
const baseline = process.argv[2]

if (!baseline) throw Error('Pass exported live code baseline directory.')
const sha = s => crypto.createHash('sha256').update(s).digest('hex')

const walk = p =>
  fs
    .readdirSync(p, { withFileTypes: true })
    .flatMap(x => (x.isDirectory() ? walk(path.join(p, x.name)) : [path.join(p, x.name)]))

async function main() {
  await require('esbuild').build({
    entryPoints: ['src/growth-forms-renderer/index.ts'],
    bundle: true,
    format: 'iife',
    alias: { '@': path.resolve('src') },
    target: ['es2021'],
    minify: true,
    sourcemap: false,
    legalComments: 'none',
    outfile: path.join(plugin, 'assets/js/content-marketing-forms.js'),
    banner: { js: '/* Greenhouse Growth Forms · pinned content_marketing · canonical source, 2026-08-31 */' }
  })

  const files = [
    ...walk(path.join(plugin, 'includes/content-marketing')),
    ...walk(path.join(plugin, 'assets/img/content-marketing')),
    ...[
      'includes/widgets/class-eo-content-marketing-base.php',
      'includes/widgets/class-eo-content-marketing-widgets.php',
      'includes/class-eo-widgets-loader.php',
      'assets/css/content-marketing.css',
      'assets/css/content-marketing-host.css',
      'assets/js/content-marketing.js',
      'assets/js/content-marketing-forms.js'
    ].map(p => path.join(plugin, p))
  ]

  const manifest = {
    contract: 'content-marketing-elementor-release.v1',
    sourceSha256: JSON.parse(
      fs.readFileSync(path.join(plugin, 'includes/content-marketing/source-manifest.json'), 'utf8')
    ).sha256,
    rendererSourceHashes: Object.fromEntries(
      walk('src/growth-forms-renderer')
        .filter(p => !p.includes('__tests__'))
        .map(p => [p, sha(fs.readFileSync(p))])
    ),
    files: files.map(f => {
      const rel = path.relative(plugin, f),
        old = path.join(baseline, 'code/wp-content/plugins/eo-elementor-widgets', rel)

      
return {
        path: rel,
        sha256: sha(fs.readFileSync(f)),
        previousSha256: fs.existsSync(old) ? sha(fs.readFileSync(old)) : null
      }
    })
  }

  fs.mkdirSync('tmp/content-marketing-release', { recursive: true })
  fs.writeFileSync('tmp/content-marketing-release/manifest.json', JSON.stringify(manifest, null, 2) + '\n')
  const zip = path.resolve('tmp/content-marketing-release/package.zip')

  if (fs.existsSync(zip)) fs.unlinkSync(zip)
  cp.execFileSync('zip', ['-q', zip, ...manifest.files.map(x => x.path)], { cwd: plugin })
  console.log(JSON.stringify({ files: files.length, packageSha256: sha(fs.readFileSync(zip)) }))
}

main().catch(e => {
  console.error(e)
  process.exitCode = 1
})
