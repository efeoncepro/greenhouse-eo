#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const apply = process.argv.includes('--apply')
const bootstrapChangelog = process.argv.includes('--bootstrap-changelog')
const maxSessions = positiveIntegerArg('--max-sessions=', 20)
const maxChangelogEntries = positiveIntegerArg('--max-changelog-entries=', 60)
const maxChangelogLines = positiveIntegerArg('--max-changelog-lines=', 2_000)

const handoffPlan = planHandoffRotation()
const changelogPlan = planChangelogRotation()

printPlan(handoffPlan)
printPlan(changelogPlan)

if (!handoffPlan.required && !changelogPlan.required && !bootstrapChangelog) {
  console.log('Nothing to rotate.')
  process.exit(0)
}

if (!apply) {
  console.log('Dry run only. Re-run with --apply to rotate.')
  if (bootstrapChangelog) console.log('Bootstrap requested; no snapshot was written in dry-run mode.')
  process.exit(0)
}

if (bootstrapChangelog) createInitialChangelogSnapshot(changelogPlan.originalContents)
if (handoffPlan.required) applyHandoffRotation(handoffPlan)
if (changelogPlan.required) applyChangelogRotation(changelogPlan, { archiveRemovedEntries: !bootstrapChangelog })

console.log('Rotation applied. Run pnpm docs:context-check:strict.')

function positiveIntegerArg(prefix, fallback) {
  const raw = process.argv.find(arg => arg.startsWith(prefix))?.slice(prefix.length)
  const value = Number(raw ?? fallback)

  if (!Number.isInteger(value) || value < 1) throw new Error(`${prefix.slice(0, -1)} must be a positive integer`)

  return value
}

function lineCount(contents) {
  return contents.split(/\r?\n/).length
}

function hash(contents) {
  return createHash('sha256').update(contents).digest('hex')
}

function planHandoffRotation() {
  const filePath = path.join(root, 'Handoff.md')
  const originalContents = readFileSync(filePath, 'utf8')
  const matches = [...originalContents.matchAll(/^## Sesi[oó]n[^\n]*$/gim)]

  if (matches.length <= maxSessions) {
    return {
      kind: 'Handoff',
      required: false,
      summary: `${matches.length}/${maxSessions} active sessions; nothing to archive.`
    }
  }

  const preamble = originalContents.slice(0, matches[0].index).trimEnd()

  const blocks = matches.map((match, index) => {
    const end = matches[index + 1]?.index ?? originalContents.length
    const contents = originalContents.slice(match.index, end).trim()
    const date = match[0].match(/(\d{4}-\d{2}-\d{2})/)?.[1] ?? '0000-00-00'

    return { contents, date, originalIndex: index }
  })

  const ranked = [...blocks].sort((left, right) => {
    const byDate = right.date.localeCompare(left.date)

    return byDate || left.originalIndex - right.originalIndex
  })

  const active = ranked.slice(0, maxSessions)
  const archived = ranked.slice(maxSessions)

  return {
    kind: 'Handoff',
    required: true,
    summary: `keep ${active.length}; archive ${archived.length}.`,
    filePath,
    originalContents,
    preamble,
    active,
    archived
  }
}

function planChangelogRotation() {
  const filePath = path.join(root, 'changelog.md')
  const originalContents = readFileSync(filePath, 'utf8')
  const matches = [...originalContents.matchAll(/^## (\d{4}-\d{2}-\d{2}) — [^\n]+$/gm)]

  if (matches.length === 0) {
    throw new Error('changelog.md has no canonical "## YYYY-MM-DD — title" entries')
  }

  const currentPreamble = originalContents.slice(0, matches[0].index).trimEnd()

  const blocks = matches.map((match, index) => {
    const end = matches[index + 1]?.index ?? originalContents.length

    return {
      contents: originalContents.slice(match.index, end).trim(),
      date: match[1],
      originalIndex: index
    }
  })

  const ranked = [...blocks].sort((left, right) => {
    const byDate = right.date.localeCompare(left.date)

    return byDate || left.originalIndex - right.originalIndex
  })

  const active = []
  const archived = []
  const preamble = bootstrapChangelog ? canonicalChangelogPreamble() : currentPreamble

  for (const block of ranked) {
    const candidate = `${preamble}\n\n${[...active, block].map(value => value.contents).join('\n\n')}\n`
    const fitsEntryBudget = active.length < maxChangelogEntries
    const fitsLineBudget = lineCount(candidate) <= maxChangelogLines

    if (fitsEntryBudget && (fitsLineBudget || active.length === 0)) active.push(block)
    else archived.push(block)
  }

  const required =
    bootstrapChangelog ||
    archived.length > 0 ||
    lineCount(originalContents) > maxChangelogLines ||
    matches.length > maxChangelogEntries

  return {
    kind: 'Changelog',
    required,
    summary: required
      ? `keep ${active.length}; remove ${archived.length} from the active window${bootstrapChangelog ? ' after immutable snapshot' : ' and archive them'}.`
      : `${matches.length}/${maxChangelogEntries} entries and ${lineCount(originalContents)}/${maxChangelogLines} lines; nothing to archive.`,
    filePath,
    originalContents,
    preamble,
    active,
    archived
  }
}

function printPlan(plan) {
  console.log(`${plan.kind} rotation: ${plan.summary}`)

  if (!plan.required || !plan.archived?.length) return

  const counts = new Map()

  for (const block of plan.archived) {
    const month = block.date.slice(0, 7) === '0000-00' ? 'undated' : block.date.slice(0, 7)

    counts.set(month, (counts.get(month) ?? 0) + 1)
  }

  for (const [month, count] of counts) console.log(`- ${month}: ${count} item(s)`)
}

function applyHandoffRotation(plan) {
  assertUnchanged(plan.filePath, plan.originalContents, 'Handoff.md')
  const byMonth = new Map()

  for (const block of plan.archived) {
    const month = block.date.slice(0, 7) === '0000-00' ? 'undated' : block.date.slice(0, 7)
    const values = byMonth.get(month) ?? []

    values.push(block.contents)
    byMonth.set(month, values)
  }

  for (const [month, values] of byMonth) {
    const relative = `docs/operations/agent-context-history/handoff/${month}.md`
    const absolute = path.join(root, relative)

    mkdirSync(path.dirname(absolute), { recursive: true })
    let archive = existsSync(absolute)
      ? readFileSync(absolute, 'utf8').trimEnd()
      : `# Handoff history — ${month}\n\n> Archivo histórico. Buscar por keyword; no cargar completo de arranque.`

    for (const block of values) {
      const marker = `<!-- session-sha256:${hash(block)} -->`

      if (!archive.includes(marker)) archive += `\n\n${marker}\n${block}`
    }

    atomicWrite(absolute, `${archive}\n`)
  }

  syncHandoffArchiveIndex([...byMonth.keys()])
  const nextContents = `${plan.preamble}\n\n${plan.active.map(block => block.contents).join('\n\n')}\n`

  assertUnchanged(plan.filePath, plan.originalContents, 'Handoff.md')
  atomicWrite(plan.filePath, nextContents)
}

function applyChangelogRotation(plan, { archiveRemovedEntries }) {
  assertUnchanged(plan.filePath, plan.originalContents, 'changelog.md')

  if (archiveRemovedEntries) {
    const byMonth = new Map()

    for (const block of plan.archived) {
      const month = block.date.slice(0, 7)
      const values = byMonth.get(month) ?? []

      values.push(block.contents)
      byMonth.set(month, values)
    }

    for (const [month, values] of byMonth) writeChangelogShard(month, values)
    syncChangelogIndex([...byMonth.keys()])
  }

  const nextContents = `${plan.preamble}\n\n${plan.active.map(block => block.contents).join('\n\n')}\n`

  assertUnchanged(plan.filePath, plan.originalContents, 'changelog.md')
  atomicWrite(plan.filePath, nextContents)
}

function createInitialChangelogSnapshot(contents) {
  const snapshotRelative = 'docs/changelog/internal/legacy/changelog.pre-window.md'
  const manifestRelative = 'docs/changelog/internal/legacy/manifest.json'
  const snapshotPath = path.join(root, snapshotRelative)
  const manifestPath = path.join(root, manifestRelative)
  const indexPath = path.join(root, 'docs/changelog/internal/README.md')

  if (existsSync(snapshotPath) || existsSync(manifestPath)) {
    if (!existsSync(snapshotPath) || !existsSync(manifestPath)) {
      throw new Error('Incomplete changelog bootstrap: snapshot and manifest must either both exist or both be absent')
    }

    const snapshot = readFileSync(snapshotPath, 'utf8')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    const entry = manifest.files?.[0]

    if (
      !entry ||
      entry.sha256 !== hash(snapshot) ||
      entry.lines !== lineCount(snapshot) ||
      entry.chars !== snapshot.length
    ) {
      throw new Error('Existing changelog bootstrap snapshot does not match its manifest')
    }

    if (snapshot !== contents) {
      throw new Error('Bootstrap already exists for a different changelog state; run normal rotation instead')
    }

    return
  }

  mkdirSync(path.dirname(snapshotPath), { recursive: true })
  atomicWrite(snapshotPath, contents)

  const manifest = {
    schemaVersion: 'greenhouse-internal-changelog-snapshot.v1',
    createdAt: new Date().toISOString(),
    source: 'changelog.md before bounded-window migration',
    files: [
      {
        source: 'changelog.md',
        snapshot: snapshotRelative,
        sha256: hash(contents),
        lines: lineCount(contents),
        chars: contents.length
      }
    ]
  }

  atomicWrite(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

  if (!existsSync(indexPath)) {
    mkdirSync(path.dirname(indexPath), { recursive: true })
    atomicWrite(
      indexPath,
      `# Historial interno de changelog\n\n` +
        `> Memoria histórica de cambios internos. Buscar por keyword y contrastar contra task, issue, ADR, commit y runtime; no cargar completa al inicio.\n\n` +
        `## Primer corte inmutable\n\n` +
        `- [Snapshot previo a la ventana activa](legacy/changelog.pre-window.md)\n` +
        `- [Manifest SHA-256](legacy/manifest.json)\n\n` +
        `## Shards mensuales incrementales\n\n` +
        `No volver a pegar historia completa en este índice.\n`
    )
  }
}

function writeChangelogShard(month, newBlocks) {
  const relative = `docs/changelog/internal/${month}.md`
  const absolute = path.join(root, relative)
  const existing = existsSync(absolute) ? readFileSync(absolute, 'utf8') : ''
  const existingBlocks = parseIntegrityBlocks(existing, /<!-- changelog-entry-sha256:([a-f0-9]{64}) -->/g)
  const byHash = new Map(existingBlocks.map(block => [hash(block), block]))

  for (const block of newBlocks) byHash.set(hash(block), block)

  const ordered = [...byHash.values()].sort((left, right) => {
    const leftDate = left.match(/^## (\d{4}-\d{2}-\d{2})/)?.[1] ?? '0000-00-00'
    const rightDate = right.match(/^## (\d{4}-\d{2}-\d{2})/)?.[1] ?? '0000-00-00'

    return rightDate.localeCompare(leftDate) || left.localeCompare(right)
  })

  let contents = `# Changelog interno — ${month}\n\n> Archivo histórico. Buscar por keyword; validar vigencia contra fuentes canónicas y runtime.`

  for (const block of ordered) contents += `\n\n<!-- changelog-entry-sha256:${hash(block)} -->\n\n${block}`

  mkdirSync(path.dirname(absolute), { recursive: true })
  atomicWrite(absolute, `${contents}\n`)
}

function parseIntegrityBlocks(contents, markerPattern) {
  const markers = [...contents.matchAll(markerPattern)]

  return markers.map((marker, index) => {
    const start = (marker.index ?? 0) + marker[0].length
    const end = markers[index + 1]?.index ?? contents.length

    return contents.slice(start, end).trim()
  })
}

function syncHandoffArchiveIndex(months) {
  const indexPath = path.join(root, 'Handoff.archive.md')

  if (!existsSync(indexPath)) throw new Error('Missing Handoff.archive.md')

  let index = readFileSync(indexPath, 'utf8')
  const anchor = 'No volver a pegar historia completa en este índice.'

  if (!index.includes(anchor)) throw new Error('Handoff.archive.md is missing its incremental-history anchor')

  for (const month of months.sort()) {
    const relative = `docs/operations/agent-context-history/handoff/${month}.md`
    const entry = `- [${month}](${relative})`

    if (!index.includes(relative)) index = index.replace(anchor, `${entry}\n\n${anchor}`)
  }

  atomicWrite(indexPath, index)
}

function syncChangelogIndex(months) {
  const indexPath = path.join(root, 'docs/changelog/internal/README.md')

  if (!existsSync(indexPath)) throw new Error('Missing docs/changelog/internal/README.md')

  let index = readFileSync(indexPath, 'utf8')
  const anchor = 'No volver a pegar historia completa en este índice.'

  if (!index.includes(anchor)) throw new Error('Internal changelog index is missing its shard anchor')

  for (const month of months.sort()) {
    const relative = `docs/changelog/internal/${month}.md`
    const entry = `- [${month}](${month}.md)`

    if (!index.includes(relative) && !index.includes(`](${month}.md)`)) {
      index = index.replace(anchor, `${entry}\n\n${anchor}`)
    }
  }

  atomicWrite(indexPath, index)
}

function canonicalChangelogPreamble() {
  return `# changelog.md

> Ventana reciente de cambios internos reales. El historial completo y verificable se consulta en
> [docs/changelog/internal/README.md](docs/changelog/internal/README.md). No cargar snapshots completos al
> inicio ni usar una entrada histórica como contrato vigente sin contrastarla.
>
> Techo operativo: 60 entradas, 2.000 líneas y ~60.000 tokens. Rotación:
> \`pnpm docs:context-rotate --apply\`.`
}

function assertUnchanged(filePath, expected, label) {
  if (readFileSync(filePath, 'utf8') !== expected) {
    throw new Error(`${label} changed during rotation; no active-window rewrite was applied. Re-run on the new state.`)
  }
}

function atomicWrite(filePath, contents) {
  const temporaryPath = `${filePath}.rotate-${process.pid}.tmp`

  writeFileSync(temporaryPath, contents)

  try {
    renameSync(temporaryPath, filePath)
  } finally {
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath)
  }
}
