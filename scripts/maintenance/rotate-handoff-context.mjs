#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const apply = process.argv.includes('--apply')
const maxSessionsArg = process.argv.find(arg => arg.startsWith('--max-sessions='))
const maxSessions = Number(maxSessionsArg?.split('=')[1] ?? 20)
const handoffPath = path.join(root, 'Handoff.md')
const contents = readFileSync(handoffPath, 'utf8')
const matches = [...contents.matchAll(/^## Sesi[oó]n[^\n]*$/gim)]

if (!Number.isInteger(maxSessions) || maxSessions < 1) throw new Error('--max-sessions must be a positive integer')

if (matches.length <= maxSessions) {
  console.log(`Handoff rotation: ${matches.length}/${maxSessions} active sessions; nothing to archive.`)
  process.exit(0)
}

const preamble = contents.slice(0, matches[0].index).trimEnd()

const blocks = matches.map((match, index) => {
  const end = matches[index + 1]?.index ?? contents.length
  const blockContents = contents.slice(match.index, end).trim()
  const date = match[0].match(/(\d{4}-\d{2}-\d{2})/)?.[1] ?? '0000-00-00'

  return { contents: blockContents, date, originalIndex: index }
})

const ranked = [...blocks].sort((left, right) => {
  const byDate = right.date.localeCompare(left.date)

  return byDate || left.originalIndex - right.originalIndex
})

const active = ranked.slice(0, maxSessions)
const archived = ranked.slice(maxSessions)
const byMonth = new Map()

for (const block of archived) {
  const month = block.date.slice(0, 7) === '0000-00' ? 'undated' : block.date.slice(0, 7)
  const values = byMonth.get(month) ?? []

  values.push(block.contents)
  byMonth.set(month, values)
}

console.log(`Handoff rotation: keep ${active.length}; archive ${archived.length}.`)
for (const [month, values] of byMonth) console.log(`- ${month}: ${values.length} session(s)`)

if (!apply) {
  console.log('Dry run only. Re-run with --apply to rotate.')
  process.exit(0)
}

assertHandoffUnchanged()

for (const [month, values] of byMonth) {
  const relative = `docs/operations/agent-context-history/handoff/${month}.md`
  const absolute = path.join(root, relative)

  mkdirSync(path.dirname(absolute), { recursive: true })
  let archive = existsSync(absolute)
    ? readFileSync(absolute, 'utf8').trimEnd()
    : `# Handoff history — ${month}\n\n> Archivo histórico. Buscar por keyword; no cargar completo de arranque.`

  for (const block of values) {
    const hash = createHash('sha256').update(block).digest('hex')
    const marker = `<!-- session-sha256:${hash} -->`

    if (!archive.includes(marker)) archive += `\n\n${marker}\n${block}`
  }

  writeFileSync(absolute, `${archive}\n`)
}

syncArchiveIndex([...byMonth.keys()])

const nextHandoff = `${preamble}\n\n${active.map(block => block.contents).join('\n\n')}\n`
const temporaryHandoffPath = `${handoffPath}.rotate-${process.pid}.tmp`

writeFileSync(temporaryHandoffPath, nextHandoff)

try {
  assertHandoffUnchanged()
  renameSync(temporaryHandoffPath, handoffPath)
} finally {
  if (existsSync(temporaryHandoffPath)) unlinkSync(temporaryHandoffPath)
}

console.log('Rotation applied. Run pnpm docs:context-check:strict.')

function assertHandoffUnchanged() {
  if (readFileSync(handoffPath, 'utf8') !== contents) {
    throw new Error(
      'Handoff.md changed during rotation; no active-session rewrite was applied. Re-run on the new state.'
    )
  }
}

function syncArchiveIndex(months) {
  const archiveIndexPath = path.join(root, 'Handoff.archive.md')

  if (!existsSync(archiveIndexPath)) throw new Error('Missing Handoff.archive.md')

  let index = readFileSync(archiveIndexPath, 'utf8')
  const anchor = 'No volver a pegar historia completa en este índice.'

  if (!index.includes(anchor)) throw new Error('Handoff.archive.md is missing its incremental-history anchor')

  for (const month of months.sort()) {
    const relative = `docs/operations/agent-context-history/handoff/${month}.md`
    const entry = `- [${month}](${relative})`

    if (!index.includes(relative)) index = index.replace(anchor, `${entry}\n\n${anchor}`)
  }

  writeFileSync(archiveIndexPath, index)
}
