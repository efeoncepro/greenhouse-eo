/**
 * TASK-1231 — Build del bundle portable Growth Forms renderer.
 *
 * Bundlea `src/growth-forms-renderer/index.ts` (vanilla TS, framework-light) a un
 * artefacto IIFE versionado servido estáticamente por Greenhouse (Arch §19.2):
 *   public/growth-forms/renderer-<channel>.js   (canal por defecto: preview)
 *   public/growth-forms/renderer-latest.js       (alias mutable del último build)
 *
 * Los wrappers de host (WordPress/Astro) pinean la URL del canal. Sin deps externas
 * en el bundle (no React/Lit). Uso: `pnpm renderer:build [--channel=preview|beta|stable]`.
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
  console.error(`[renderer:build] canal inválido: ${channel} (usar preview|beta|stable)`)
  process.exit(1)
}

const outDir = resolve(repoRoot, 'public/growth-forms')
const entry = resolve(repoRoot, 'src/growth-forms-renderer/index.ts')
const outFile = resolve(outDir, `renderer-${channel}.js`)

await mkdir(outDir, { recursive: true })

const result = await build({
  entryPoints: [entry],
  bundle: true,
  format: 'iife',
  // TASK-1253: el renderer importa el validator registry canónico isomórfico
  // (`@/lib/growth/forms/validators/core` → `@/lib/identity-documents`, ambos puros).
  // El guard de pureza (eslint) garantiza que esos módulos no traigan server-only/node.
  alias: { '@': resolve(repoRoot, 'src') },
  target: ['es2021'],
  minify: true,
  sourcemap: false,
  metafile: true,
  legalComments: 'none',
  outfile: outFile,
  banner: { js: `/* Greenhouse Growth Forms renderer · channel=${channel} · TASK-1231 */` },
})

// Alias mutable que apunta al último build (útil para el preview local).
await copyFile(outFile, resolve(outDir, 'renderer-latest.js'))

const bytes = Object.values(result.metafile.outputs)[0]?.bytes ?? 0

await writeFile(
  resolve(outDir, 'BUILDINFO.json'),
  `${JSON.stringify({ channel, bytes, builtFrom: 'src/growth-forms-renderer/index.ts', task: 'TASK-1231' }, null, 2)}\n`,
)

console.log(`[renderer:build] OK → public/growth-forms/renderer-${channel}.js (${(bytes / 1024).toFixed(1)} KB)`)
