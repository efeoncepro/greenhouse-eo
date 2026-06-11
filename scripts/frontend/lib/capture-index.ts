/**
 * Índice navegable de .captures/ — la capa de taxonomía trazable de GVC.
 *
 * NO reestructura el directorio (eso rompería diff/review/baselines/scenarios).
 * Es una DERIVACIÓN regenerable del estado real de .captures/ + audit.jsonl,
 * por lo que nunca puede "driftear" destructivamente: borrar el índice y
 * regenerarlo reconstruye la verdad.
 *
 * Cinco dimensiones ortogonales (no colapsadas en un enum):
 *   - surface     → scenario (agrupación primaria)
 *   - work-item   → tag opcional `--task` (TASK-###/ISSUE-###/label) desde audit
 *   - lifecycle   → derivado: evidencia (newest del scenario) vs iteración
 *   - actividad   → derivado: activo si la corrida más nueva del scenario < ACTIVE_WINDOW
 *   - time        → mtime / timestamp
 *
 * Escribe dos artefactos en la raíz de .captures/:
 *   - index.json  → para agentes (consumo programático)
 *   - INDEX.md    → para el operador (navegación humana)
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import type { AuditEntry } from './audit'
import { CONCEPTS_DIRNAME, RESERVED_TOP_LEVEL_DIRS, scenarioFromDirName } from './capture-paths'

const IMAGE_EXT = /\.(png|webp|jpe?g|svg)$/i

export const ACTIVE_WINDOW_MS = 2 * 60 * 60 * 1000 // 2h → "iterando ahora"

interface IndexRun {
  dir: string
  mtimeMs: number
  env: string | null
  actor: string | null
  exitCode: number | null
  task: string | null
  route: string | null
}

interface IndexScenario {
  scenario: string
  route: string | null
  task: string | null
  runCount: number
  active: boolean
  evidence: IndexRun
  runs: IndexRun[]
}

/** Un loop de conceptos generados por IA (`.captures/concepts/<loop>/`). */
interface ConceptLoop {
  loop: string
  imageCount: number
  latestMtimeMs: number
  active: boolean
  task: string | null
  model: string | null
}

export interface CaptureIndex {
  generatedAt: string
  capturesDir: string
  activeWindowHours: number
  totalScenarios: number
  totalRuns: number
  activeScenarios: number
  scenarios: IndexScenario[]
  concepts: ConceptLoop[]
}

const dirBasename = (auditOutputDir: string): string => {
  // audit guarda `<repo>/.captures/<dirname>` (a veces con sufijo de variante).
  const parts = auditOutputDir.split('/.captures/')

  return parts.length === 2 ? parts[1].split('/')[0] : auditOutputDir
}

/** Última entrada de audit por basename de dir (la más reciente gana). */
const buildAuditMap = (capturesDir: string): Map<string, AuditEntry> => {
  const map = new Map<string, AuditEntry>()
  const auditPath = resolve(capturesDir, 'audit.jsonl')

  if (!existsSync(auditPath)) return map

  for (const line of readFileSync(auditPath, 'utf8').split('\n')) {
    if (!line.trim()) continue

    try {
      const entry = JSON.parse(line) as AuditEntry

      if (entry.outputDir) map.set(dirBasename(entry.outputDir), entry)
    } catch {
      // línea corrupta — best-effort, se ignora.
    }
  }

  return map
}

/**
 * Cuenta imágenes + mtime más reciente de un dir de conceptos (1 nivel).
 * Lee `manifest.json` si existe para enriquecer task/model.
 */
const summarizeConceptLoop = (loop: string, dir: string, now: number): ConceptLoop | null => {
  let imageCount = 0
  let latestMtimeMs = 0
  let task: string | null = null
  let model: string | null = null

  try {
    for (const file of readdirSync(dir, { withFileTypes: true })) {
      if (file.isFile() && IMAGE_EXT.test(file.name)) {
        imageCount += 1

        try {
          latestMtimeMs = Math.max(latestMtimeMs, statSync(resolve(dir, file.name)).mtimeMs)
        } catch {
          // ignore
        }
      }
    }

    const manifestPath = resolve(dir, 'manifest.json')

    if (existsSync(manifestPath)) {
      const m = JSON.parse(readFileSync(manifestPath, 'utf8')) as { task?: string; model?: string }

      task = m.task ?? null
      model = m.model ?? null
    }
  } catch {
    return null
  }

  if (imageCount === 0) return null

  return { loop, imageCount, latestMtimeMs, active: now - latestMtimeMs < ACTIVE_WINDOW_MS, task, model }
}

/** Escanea `.captures/concepts/`: subdirs = loops; imágenes sueltas = loop "(sin agrupar)". */
const scanConcepts = (capturesDir: string, now: number): ConceptLoop[] => {
  const root = resolve(capturesDir, CONCEPTS_DIRNAME)

  if (!existsSync(root)) return []

  const loops: ConceptLoop[] = []
  let looseImages = 0
  let looseLatest = 0

  try {
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const summary = summarizeConceptLoop(entry.name, resolve(root, entry.name), now)

        if (summary) loops.push(summary)
      } else if (entry.isFile() && IMAGE_EXT.test(entry.name)) {
        looseImages += 1

        try {
          looseLatest = Math.max(looseLatest, statSync(resolve(root, entry.name)).mtimeMs)
        } catch {
          // ignore
        }
      }
    }
  } catch {
    return loops
  }

  if (looseImages > 0) {
    loops.push({
      loop: '(sin agrupar)',
      imageCount: looseImages,
      latestMtimeMs: looseLatest,
      active: now - looseLatest < ACTIVE_WINDOW_MS,
      task: null,
      model: null
    })
  }

  return loops.sort((a, b) => b.latestMtimeMs - a.latestMtimeMs)
}

export const buildCaptureIndexModel = (capturesDir: string, now = Date.now()): CaptureIndex => {
  const auditMap = buildAuditMap(capturesDir)
  const byScenario = new Map<string, IndexRun[]>()

  const entries = existsSync(capturesDir)
    ? readdirSync(capturesDir, { withFileTypes: true }).filter(
        e => e.isDirectory() && !RESERVED_TOP_LEVEL_DIRS.has(e.name)
      )
    : []

  for (const entry of entries) {
    const path = resolve(capturesDir, entry.name)
    let mtimeMs = 0

    try {
      mtimeMs = statSync(path).mtimeMs
    } catch {
      continue
    }

    const audit = auditMap.get(entry.name)
    const scenario = audit?.scenarioName ?? scenarioFromDirName(entry.name)

    const run: IndexRun = {
      dir: entry.name,
      mtimeMs,
      env: audit?.env ?? null,
      actor: audit?.actor ?? null,
      exitCode: audit?.exitCode ?? null,
      task: audit?.task ?? null,
      route: audit?.route ?? null
    }

    const bucket = byScenario.get(scenario)

    if (bucket) bucket.push(run)
    else byScenario.set(scenario, [run])
  }

  const scenarios: IndexScenario[] = [...byScenario.entries()]
    .map(([scenario, runs]) => {
      runs.sort((a, b) => b.mtimeMs - a.mtimeMs)
      const evidence = runs[0]
      const active = now - evidence.mtimeMs < ACTIVE_WINDOW_MS

      return {
        scenario,
        route: runs.find(r => r.route)?.route ?? null,
        task: runs.find(r => r.task)?.task ?? null,
        runCount: runs.length,
        active,
        evidence,
        runs
      }
    })
    .sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1 // activos primero

      return b.evidence.mtimeMs - a.evidence.mtimeMs
    })

  return {
    generatedAt: new Date(now).toISOString(),
    capturesDir,
    activeWindowHours: ACTIVE_WINDOW_MS / (60 * 60 * 1000),
    totalScenarios: scenarios.length,
    totalRuns: scenarios.reduce((acc, s) => acc + s.runCount, 0),
    activeScenarios: scenarios.filter(s => s.active).length,
    scenarios,
    concepts: scanConcepts(capturesDir, now)
  }
}

const fmtAgo = (mtimeMs: number, now: number): string => {
  const mins = Math.round((now - mtimeMs) / 60000)

  if (mins < 1) return 'recién'
  if (mins < 60) return `hace ${mins}m`
  if (mins < 60 * 24) return `hace ${Math.round(mins / 60)}h`

  return `hace ${Math.round(mins / (60 * 24))}d`
}

const renderMarkdown = (model: CaptureIndex, now: number): string => {
  const lines: string[] = []

  lines.push('# GVC — Índice de capturas')
  lines.push('')
  lines.push(
    `> Generado ${model.generatedAt} · ${model.totalScenarios} superficies · ${model.totalRuns} corridas · ${model.activeScenarios} iterando ahora (<${model.activeWindowHours}h)`
  )
  lines.push('>')
  lines.push('> Regenerable con `pnpm fe:capture:index`. Es una vista derivada — no editar a mano.')
  lines.push('')

  const active = model.scenarios.filter(s => s.active)

  if (active.length > 0) {
    lines.push('## 🔴 Iterando ahora')
    lines.push('')
    lines.push('| Superficie | Corridas | Evidencia (dir más reciente) | Última | Work-item |')
    lines.push('|---|---|---|---|---|')

    for (const s of active) {
      lines.push(
        `| \`${s.scenario}\` | ${s.runCount} | \`.captures/${s.evidence.dir}\` | ${fmtAgo(s.evidence.mtimeMs, now)} | ${s.task ?? '—'} |`
      )
    }

    lines.push('')
  }

  const byTask = new Map<string, IndexScenario[]>()

  for (const s of model.scenarios) {
    if (!s.task) continue

    const bucket = byTask.get(s.task)

    if (bucket) bucket.push(s)
    else byTask.set(s.task, [s])
  }

  if (byTask.size > 0) {
    lines.push('## 🧭 Por work-item')
    lines.push('')

    for (const [task, scenarios] of [...byTask.entries()].sort()) {
      lines.push(`**${task}** — ${scenarios.map(s => `\`${s.scenario}\``).join(', ')}`)
      lines.push('')
    }
  }

  if (model.concepts.length > 0) {
    const totalImgs = model.concepts.reduce((acc, c) => acc + c.imageCount, 0)

    lines.push(`## 🎨 Conceptos IA (${totalImgs} imágenes · ${model.concepts.length} loops)`)
    lines.push('')
    lines.push('| Loop | Imágenes | Última | Work-item | Modelo |')
    lines.push('|---|---|---|---|---|')

    for (const c of model.concepts) {
      const flag = c.active ? '🔴 ' : ''

      lines.push(
        `| ${flag}\`${CONCEPTS_DIRNAME}/${c.loop}\` | ${c.imageCount} | ${fmtAgo(c.latestMtimeMs, now)} | ${c.task ?? '—'} | ${c.model ?? '—'} |`
      )
    }

    lines.push('')
  }

  lines.push('## 📂 Todas las superficies')
  lines.push('')
  lines.push('| Superficie | Ruta | Corridas | Evidencia (dir) | Última | env | Work-item |')
  lines.push('|---|---|---|---|---|---|---|')

  for (const s of model.scenarios) {
    const flag = s.active ? '🔴 ' : ''

    lines.push(
      `| ${flag}\`${s.scenario}\` | ${s.route ?? '—'} | ${s.runCount} | \`${s.evidence.dir}\` | ${fmtAgo(s.evidence.mtimeMs, now)} | ${s.evidence.env ?? '—'} | ${s.task ?? '—'} |`
    )
  }

  lines.push('')

  return lines.join('\n')
}

/**
 * Construye y persiste index.json + INDEX.md. Best-effort: nunca lanza.
 * Devuelve el modelo (o null si falló) para que el caller lo use si quiere.
 */
export const writeCaptureIndex = (capturesDir: string, now = Date.now()): CaptureIndex | null => {
  try {
    if (!existsSync(capturesDir)) return null

    const model = buildCaptureIndexModel(capturesDir, now)

    writeFileSync(resolve(capturesDir, 'index.json'), JSON.stringify(model, null, 2) + '\n', 'utf8')
    writeFileSync(resolve(capturesDir, 'INDEX.md'), renderMarkdown(model, now), 'utf8')

    return model
  } catch {
    return null
  }
}
