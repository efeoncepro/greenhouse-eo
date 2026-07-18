/**
 * TASK-1340 — Build del bundle portable Growth CTA renderer.
 *
 * Bundlea `src/growth-cta-renderer/index.ts` (vanilla TS, framework-light) a un
 * artefacto IIFE versionado servido estáticamente por Greenhouse (espejo del
 * forms-renderer, TASK-1231):
 *   public/growth-cta/renderer-<channel>.js   (canal por defecto: preview)
 *   public/growth-cta/renderer-latest.js      (alias mutable del último build)
 *
 * Los wrappers de host (WordPress/Astro/Think) pinean la URL del canal. Sin deps
 * externas en el bundle. Uso: `pnpm renderer:cta:build [--channel=preview|beta|stable]`.
 */
import { mkdir, writeFile, copyFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { build } from 'esbuild'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')

const channelArg = process.argv.find(a => a.startsWith('--channel='))
const channel = channelArg ? channelArg.split('=')[1] : 'preview'

if (!['preview', 'beta', 'stable'].includes(channel)) {
  console.error(`[renderer:cta:build] canal inválido: ${channel} (usar preview|beta|stable)`)
  process.exit(1)
}

const outDir = resolve(repoRoot, 'public/growth-cta')
const entry = resolve(repoRoot, 'src/growth-cta-renderer/index.ts')
const outFile = resolve(outDir, `renderer-${channel}.js`)

await mkdir(outDir, { recursive: true })

const result = await build({
  entryPoints: [entry],
  bundle: true,
  format: 'iife',
  target: ['es2021'],
  minify: true,
  sourcemap: false,
  metafile: true,
  legalComments: 'none',
  outfile: outFile,
  banner: { js: `/* Greenhouse Growth CTA renderer · channel=${channel} · TASK-1340 */` },
})

// Alias mutable que apunta al último build (útil para el preview local).
await copyFile(outFile, resolve(outDir, 'renderer-latest.js'))

const bytes = Object.values(result.metafile.outputs)[0]?.bytes ?? 0

await writeFile(
  resolve(outDir, 'BUILDINFO.json'),
  `${JSON.stringify({ channel, bytes, builtFrom: 'src/growth-cta-renderer/index.ts', task: 'TASK-1340' }, null, 2)}\n`,
)

console.log(`[renderer:cta:build] OK → public/growth-cta/renderer-${channel}.js (${(bytes / 1024).toFixed(1)} KB)`)
