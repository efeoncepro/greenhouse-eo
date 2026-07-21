import { mkdir, writeFile, copyFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { build } from 'esbuild'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptsDir, '..')
const channelArg = process.argv.find(argument => argument.startsWith('--channel='))
const channel = channelArg ? channelArg.split('=')[1] : 'preview'

if (!['preview', 'beta', 'stable'].includes(channel)) {
  console.error(`[renderer:meeting:build] canal inválido: ${channel} (usar preview|beta|stable)`)
  process.exit(1)
}

const outDir = resolve(repoRoot, 'public/growth-meetings')
const entry = resolve(repoRoot, 'src/growth-meeting-renderer/index.ts')
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
  banner: { js: `/* Efeonce native meeting scheduler · channel=${channel} · TASK-1510 */` },
})

await copyFile(outFile, resolve(outDir, 'renderer-latest.js'))

const bytes = Object.values(result.metafile.outputs)[0]?.bytes ?? 0

await writeFile(
  resolve(outDir, 'BUILDINFO.json'),
  `${JSON.stringify({ channel, bytes, builtFrom: 'src/growth-meeting-renderer/index.ts', task: 'TASK-1510' }, null, 2)}\n`,
)

console.log(`[renderer:meeting:build] OK → public/growth-meetings/renderer-${channel}.js (${(bytes / 1024).toFixed(1)} KB)`)
