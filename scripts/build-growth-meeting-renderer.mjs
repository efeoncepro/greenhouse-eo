import { writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildGrowthMeetingRenderer, MEETING_ICON_NAMES } from './lib/growth-meeting-renderer-build.mjs'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptsDir, '..')
const channelArg = process.argv.find(argument => argument.startsWith('--channel='))
const channel = channelArg ? channelArg.split('=')[1] : 'preview'

if (!['preview', 'beta', 'stable'].includes(channel)) {
  console.error(`[renderer:meeting:build] canal inválido: ${channel} (usar preview|beta|stable)`)
  process.exit(1)
}

const outDir = resolve(repoRoot, 'public/growth-meetings')
const { bytes } = await buildGrowthMeetingRenderer({ repoRoot, channel, outDir, writeLatest: true })

await writeFile(
  resolve(outDir, 'BUILDINFO.json'),
  `${JSON.stringify({ channel, bytes, builtFrom: 'src/growth-meeting-renderer/index.ts', task: 'TASK-1510' }, null, 2)}\n`,
)

console.log(`[renderer:meeting:build] OK → public/growth-meetings/renderer-${channel}.js (${(bytes / 1024).toFixed(1)} KB)`)
console.log(`[renderer:meeting:build] Iconify/Tabler subset → public/growth-meetings/icons.css (${MEETING_ICON_NAMES.length} icons)`)
