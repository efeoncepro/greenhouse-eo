/**
 * Build the browser renderer of the blog chart block (`efeoncepro/chart`) into the efeonce-editorial-blocks plugin.
 *
 * The public-site runtime deploys raw files with no build step, so the bundles are built here and written into the
 * plugin's `src/chart/` with a provenance header (source sha and digest):
 * - `view.js`: the loader the page loads up front (< 1 KB, block.json viewScript);
 * - `engine.js`: the chart engine (ECharts), downloaded by the loader only when a chart nears the viewport.
 * Default output: the sibling checkout `../efeonce-public-site-runtime`; override with `--out-dir <dir>`.
 *
 *   pnpm renderer:editorial-chart:build [--out-dir <dir>]
 */

import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { build } from 'esbuild'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outArg = process.argv.indexOf('--out-dir')

const outDir =
  outArg > -1
    ? resolve(process.argv[outArg + 1])
    : resolve(repoRoot, '../efeonce-public-site-runtime/wp-content/plugins/efeonce-editorial-blocks/src/chart')

let sourceSha = 'local'

try {
  sourceSha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repoRoot }).toString().trim()
} catch {
  // keep 'local'
}

const bundle = async (entry, file, role, define = {}) => {
  const result = await build({
    entryPoints: [resolve(repoRoot, 'src/editorial-chart-renderer', entry)],
    bundle: true,
    format: 'iife',
    target: ['es2020'],
    minify: true,
    sourcemap: false,
    legalComments: 'none',
    write: false,
    define
  })

  const body = result.outputFiles[0].contents
  const digest = createHash('sha256').update(body).digest('hex').slice(0, 16)
  const banner = `/* Efeonce blog chart ${role} (efeoncepro/chart) · built in greenhouse-eo src/editorial-chart-renderer · source ${sourceSha} · sha256 ${digest} · do not edit by hand */\n`
  const out = Buffer.concat([Buffer.from(banner), Buffer.from(body)])

  await writeFile(resolve(outDir, file), out)
  console.log(`${file}: ${(out.length / 1024).toFixed(1)} KB (sha256 ${digest})`)

  return digest
}

// Engine first: the loader embeds its digest as the cache-busting version of engine.js.
const engineDigest = await bundle('index.ts', 'engine.js', 'engine')

await bundle('loader.ts', 'view.js', 'loader', { __ENGINE_VERSION__: JSON.stringify(engineDigest) })
console.log(`→ ${outDir}`)
