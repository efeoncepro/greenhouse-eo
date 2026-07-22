import { createRequire } from 'node:module'
import { mkdir, writeFile, copyFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { build } from 'esbuild'
import { getIcons, getIconsCSS } from '@iconify/utils'

const require = createRequire(import.meta.url)

export const MEETING_ICON_NAMES = [
  'user', 'id', 'mail', 'building-skyscraper', 'clock', 'brand-teams', 'video', 'world',
  'chevron-left', 'chevron-right', 'check', 'calendar-check', 'calendar-off', 'arrow-right',
  'circle-check', 'shield-check', 'calendar-cog', 'alert-circle', 'loader-2',
]

export const buildGrowthMeetingRenderer = async ({ repoRoot, channel, outDir, writeLatest = false }) => {
  if (!['preview', 'beta', 'stable'].includes(channel)) throw new Error(`canal inválido: ${channel}`)

  await mkdir(outDir, { recursive: true })
  const tabler = require('@iconify/json/json/tabler.json')
  const icons = getIcons(tabler, MEETING_ICON_NAMES)

  if (!icons) throw new Error('no se pudo resolver el subset Iconify/Tabler')

  const iconCss = getIconsCSS(icons, MEETING_ICON_NAMES, { iconSelector: '.tabler-{name}' })
  const outFile = resolve(outDir, `renderer-${channel}.js`)

  await writeFile(resolve(outDir, 'icons.css'), iconCss, 'utf8')

  const result = await build({
    entryPoints: [resolve(repoRoot, 'src/growth-meeting-renderer/index.ts')],
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

  if (writeLatest) await copyFile(outFile, resolve(outDir, 'renderer-latest.js'))

  return { outFile, bytes: Object.values(result.metafile.outputs)[0]?.bytes ?? 0, iconCss }
}
