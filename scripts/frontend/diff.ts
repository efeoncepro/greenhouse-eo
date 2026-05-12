#!/usr/bin/env tsx
/**
 * Structural diff entre 2 capture runs.
 *
 * Compara manifest.json + tamaños de frames + tamaño del .webm entre 2
 * directorios de captura. Emite un reporte HTML side-by-side que el
 * humano puede abrir en browser para diff visual frame-por-frame.
 *
 * NO usa pixelmatch / pngjs / sharp — zero new deps, diff a nivel de
 * metadata + binary size. Para perceptual diff píxel-perfecto (V1.2),
 * agregar pixelmatch como dep opt-in.
 *
 * Usage:
 *   pnpm fe:capture:diff <prev-dir> <curr-dir>
 *
 * Output:
 *   <curr-dir>/diff-vs-<prev-name>.html   - side-by-side report
 *   stdout:                                - summary table
 */

import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, join, relative, resolve } from 'node:path'
import { parseArgs } from 'node:util'

interface FrameMeta {
  index: number
  label: string
  path: string
  tMs: number
}

interface ManifestLike {
  schemaVersion: number
  scenarioName: string
  route: string
  durationMs: number
  frames: FrameMeta[]
  outputs: { recordingWebm: string | null }
}

const readManifest = (dir: string): ManifestLike => {
  const path = join(dir, 'manifest.json')

  if (!existsSync(path)) {
    throw new Error(`manifest.json no encontrado en ${dir}`)
  }

  return JSON.parse(readFileSync(path, 'utf8')) as ManifestLike
}

const fileSizeBytes = (path: string): number => {
  try {
    return statSync(path).size
  } catch {
    return 0
  }
}

const formatKb = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`

const formatDelta = (a: number, b: number): string => {
  if (a === 0 && b === 0) return '—'

  const pct = ((b - a) / Math.max(a, 1)) * 100
  const sign = pct >= 0 ? '+' : ''

  return `${sign}${pct.toFixed(1)}%`
}

interface FrameDiff {
  label: string
  prevPath: string | null
  currPath: string | null
  prevBytes: number
  currBytes: number
  status: 'same' | 'changed' | 'added' | 'removed'
}

const computeFrameDiffs = (prev: ManifestLike, curr: ManifestLike, prevDir: string, currDir: string): FrameDiff[] => {
  const prevByLabel = new Map(prev.frames.map(f => [f.label, f]))
  const currByLabel = new Map(curr.frames.map(f => [f.label, f]))
  const allLabels = new Set([...prevByLabel.keys(), ...currByLabel.keys()])

  return Array.from(allLabels).map(label => {
    const p = prevByLabel.get(label)
    const c = currByLabel.get(label)
    const prevBytes = p ? fileSizeBytes(join(prevDir, p.path)) : 0
    const currBytes = c ? fileSizeBytes(join(currDir, c.path)) : 0

    let status: FrameDiff['status'] = 'same'

    if (!p) status = 'added'
    else if (!c) status = 'removed'
    else if (Math.abs(prevBytes - currBytes) > prevBytes * 0.01) status = 'changed'

    return {
      label,
      prevPath: p?.path ?? null,
      currPath: c?.path ?? null,
      prevBytes,
      currBytes,
      status
    }
  })
}

const buildHtmlReport = (prev: ManifestLike, curr: ManifestLike, diffs: FrameDiff[], prevDir: string, currDir: string): string => {
  const rows = diffs
    .map(d => {
      const badge = d.status === 'same' ? '🟢' : d.status === 'changed' ? '🟡' : d.status === 'added' ? '🔵' : '⚪'

      const prevImg = d.prevPath
        ? `<img src="${relative(currDir, join(prevDir, d.prevPath))}" alt="prev ${d.label}" loading="lazy" />`
        : '<div class="missing">—</div>'

      const currImg = d.currPath
        ? `<img src="${d.currPath}" alt="curr ${d.label}" loading="lazy" />`
        : '<div class="missing">—</div>'

      return `
        <tr>
          <td>${badge} <code>${d.label}</code> <small>${d.status}</small></td>
          <td>${prevImg}<br><small>${formatKb(d.prevBytes)}</small></td>
          <td>${currImg}<br><small>${formatKb(d.currBytes)} (${formatDelta(d.prevBytes, d.currBytes)})</small></td>
        </tr>`
    })
    .join('\n')

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Capture diff · ${prev.scenarioName} vs ${curr.scenarioName}</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; padding: 24px; background: #f5f5f9; color: #1a1a1a; }
    h1 { font-size: 1.25rem; margin: 0 0 8px; }
    .meta { font-size: 0.8125rem; color: #666; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.08); border-radius: 8px; overflow: hidden; }
    th, td { padding: 12px; vertical-align: top; border-bottom: 1px solid #eee; text-align: left; font-size: 0.875rem; }
    th { background: #fafafa; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; color: #555; }
    img { max-width: 100%; max-height: 320px; border-radius: 4px; border: 1px solid #ddd; }
    code { background: #f0f0f5; padding: 2px 6px; border-radius: 3px; font-size: 0.8125rem; }
    small { color: #666; }
    .missing { padding: 60px 0; text-align: center; color: #999; font-size: 1.5rem; }
    .legend { margin-top: 16px; font-size: 0.75rem; color: #666; }
  </style>
</head>
<body>
  <h1>Capture diff · ${curr.scenarioName}</h1>
  <div class="meta">
    <strong>previo:</strong> ${basename(prevDir)} (${prev.durationMs}ms, ${prev.frames.length} frames)<br>
    <strong>actual:</strong> ${basename(currDir)} (${curr.durationMs}ms, ${curr.frames.length} frames)<br>
    <strong>route:</strong> <code>${curr.route}</code> · <strong>scenario:</strong> <code>${curr.scenarioName}</code>
  </div>
  <table>
    <thead>
      <tr><th>Frame label</th><th>Anterior</th><th>Actual</th></tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>
  <div class="legend">
    🟢 same · 🟡 changed (>1% size delta) · 🔵 added · ⚪ removed
  </div>
</body>
</html>
`
}

const main = (): void => {
  const { positionals } = parseArgs({ args: process.argv.slice(2), allowPositionals: true, options: {} })

  if (positionals.length !== 2) {
    console.error('Usage: pnpm fe:capture:diff <prev-dir> <curr-dir>')
    process.exit(1)
  }

  const prevDir = resolve(positionals[0])
  const currDir = resolve(positionals[1])

  const prev = readManifest(prevDir)
  const curr = readManifest(currDir)

  if (prev.scenarioName !== curr.scenarioName) {
    console.error(`⚠️  Scenario name no coincide: "${prev.scenarioName}" vs "${curr.scenarioName}"`)
  }

  const diffs = computeFrameDiffs(prev, curr, prevDir, currDir)

  // Stdout summary
  console.log('')
  console.log(`Capture diff · ${curr.scenarioName}`)
  console.log(`  previo: ${basename(prevDir)}`)
  console.log(`  actual: ${basename(currDir)}`)
  console.log('')

  for (const d of diffs) {
    const badge = d.status === 'same' ? '🟢' : d.status === 'changed' ? '🟡' : d.status === 'added' ? '🔵' : '⚪'

    console.log(`  ${badge} ${d.label.padEnd(36)} ${formatKb(d.prevBytes).padStart(12)} → ${formatKb(d.currBytes).padStart(12)}  ${formatDelta(d.prevBytes, d.currBytes)}`)
  }

  // Webm comparison
  const prevWebm = prev.outputs.recordingWebm ? fileSizeBytes(join(prevDir, prev.outputs.recordingWebm)) : 0
  const currWebm = curr.outputs.recordingWebm ? fileSizeBytes(join(currDir, curr.outputs.recordingWebm)) : 0

  console.log('')
  console.log(`  recording.webm           ${formatKb(prevWebm).padStart(12)} → ${formatKb(currWebm).padStart(12)}  ${formatDelta(prevWebm, currWebm)}`)
  console.log(`  duration                 ${`${prev.durationMs}ms`.padStart(12)} → ${`${curr.durationMs}ms`.padStart(12)}  ${formatDelta(prev.durationMs, curr.durationMs)}`)

  // HTML report
  const html = buildHtmlReport(prev, curr, diffs, prevDir, currDir)
  const reportPath = join(currDir, `diff-vs-${basename(prevDir)}.html`)

  writeFileSync(reportPath, html, 'utf8')

  console.log('')
  console.log(`📄 HTML report: ${reportPath}`)
  console.log(`   open ${reportPath}`)
}

main()
