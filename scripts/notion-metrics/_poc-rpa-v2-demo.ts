/**
 * PoC RpA V2 — Demo Greenhouse teamspace canonical
 *
 * Status: PoC sandbox — NOT for production. Lives under scripts/ as
 *   reference implementation for future TASK-908 + TASK-901 work.
 *
 * Purpose: validate the canonical RpA V2 design end-to-end using polling
 *   against the Demo teamspace before investing in TASK-908 + TASK-901 full
 *   infrastructure (webhook + outbox + reactive consumer + reliability signals).
 *
 * Canonical rule under test:
 *   "1 corrección = 1 transición `Listo para revisión → Cambios solicitados`"
 *   (ADR GREENHOUSE_TASK_STATUS_LIFECYCLE_V1 + GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1)
 *
 * SDK: @notionhq/client v5.21.0 canonical (notion-platform skill recommended)
 *
 * Usage:
 *   export NOTION_TOKEN_DEMO_POC="ntn_..."
 *   pnpm tsx scripts/notion-metrics/_poc-rpa-v2-demo.ts             # loop forever (30s interval)
 *   pnpm tsx scripts/notion-metrics/_poc-rpa-v2-demo.ts --once      # single poll (debug)
 *   pnpm tsx scripts/notion-metrics/_poc-rpa-v2-demo.ts --reset     # clear snapshots first
 *   pnpm tsx scripts/notion-metrics/_poc-rpa-v2-demo.ts --verbose   # log every fetch
 *
 * Snapshots persist to .poc-snapshots/ (gitignored).
 */

import { mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { Client, APIResponseError, APIErrorCode } from '@notionhq/client'

// ─── Configuration canonical ──────────────────────────────────────────

const DEMO_TASKS_DS = '36339c2f-efe7-81a6-980c-000b0056bba8'
const NOTION_TOKEN = process.env.NOTION_TOKEN_DEMO_POC
const NOTION_VERSION = '2026-03-11' // canonical recommended per notion-platform skill
const POLL_INTERVAL_MS = 30_000
const SNAPSHOT_DIR = '.poc-snapshots'
const SNAPSHOT_FILE = join(SNAPSHOT_DIR, 'demo-tasks-snapshot.json')
const TRANSITIONS_FILE = join(SNAPSHOT_DIR, 'demo-transitions-log.json')

const TARGET_FROM_STATUS = 'Listo para revisión'
const TARGET_TO_STATUS = 'Cambios solicitados'

// ─── Types ────────────────────────────────────────────────────────────

type TaskSnapshot = {
  taskId: string
  taskName: string
  status: string | null
  lastEditedTime: string
  capturedAt: string
}

type Transition = {
  taskId: string
  taskName: string
  fromStatus: string
  toStatus: string
  detectedAt: string
  notionLastEdited: string
  isTargetTransition: boolean
}

type PollState = {
  pollNumber: number
  snapshots: Map<string, TaskSnapshot>
  transitions: Transition[]
}

// ─── CLI flag parsing ─────────────────────────────────────────────────

const args = process.argv.slice(2)
const flagOnce = args.includes('--once')
const flagReset = args.includes('--reset')
const flagVerbose = args.includes('--verbose')

// ─── Pre-flight checks ────────────────────────────────────────────────

if (!NOTION_TOKEN) {
  console.error('❌ Missing env var NOTION_TOKEN_DEMO_POC')
  console.error('   export NOTION_TOKEN_DEMO_POC="ntn_..."')
  process.exit(1)
}

// ─── Notion client (canonical SDK) ────────────────────────────────────

const notion = new Client({
  auth: NOTION_TOKEN,
  notionVersion: NOTION_VERSION
})

// ─── Helper: extract status name from page properties safely ──────────

type NotionPageLike = {
  id: string
  last_edited_time?: string
  properties?: Record<string, unknown>
}

function extractTaskName(page: NotionPageLike): string {
  const titleProp = page.properties?.['Nombre de tarea'] as
    | { title?: Array<{ plain_text?: string }> }
    | undefined

  const arr = titleProp?.title ?? []
  const joined = arr.map(t => t.plain_text ?? '').join('').trim()

  
return joined || '<sin nombre>'
}

function extractStatus(page: NotionPageLike): string | null {
  const estadoProp = page.properties?.Estado as
    | { status?: { name?: string } | null }
    | undefined

  
return estadoProp?.status?.name ?? null
}

// ─── Fetch all tasks via paginated query (SDK with retry built-in v5.10+) ─

async function fetchAllTasksSnapshot(): Promise<Map<string, TaskSnapshot>> {
  const snapshots = new Map<string, TaskSnapshot>()
  let cursor: string | undefined
  let pageCount = 0
  const capturedAt = new Date().toISOString()

  do {
    pageCount++
    if (flagVerbose) console.log(`  → fetching page ${pageCount}${cursor ? ` (cursor: ${cursor.slice(0, 12)}…)` : ''}`)

    try {
      // SDK uses data_sources endpoint canonical (2025-09-03+)
      // Note: SDK types may not be fully updated for data_sources yet — cast as any for now
       
      const client = notion as any

      const response = await client.dataSources.query({
        data_source_id: DEMO_TASKS_DS,
        page_size: 100,
        start_cursor: cursor
      })

      for (const page of response.results as NotionPageLike[]) {
        const status = extractStatus(page)
        const taskName = extractTaskName(page)

        snapshots.set(page.id, {
          taskId: page.id,
          taskName,
          status,
          lastEditedTime: page.last_edited_time ?? capturedAt,
          capturedAt
        })
      }

      cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
    } catch (error) {
      if (error instanceof APIResponseError) {
        if (error.code === APIErrorCode.RateLimited) {
          const jitter = Math.random() * 1000

          console.warn(`⚠️  Rate limited — SDK auto-retry should handle, jitter ${jitter.toFixed(0)}ms`)
          await new Promise(resolve => setTimeout(resolve, 2000 + jitter))
          continue
        }

        console.error(`❌ Notion API error (${error.status} ${error.code}): ${error.message}`)
      }

      throw error
    }
  } while (cursor)

  return snapshots
}

// ─── Snapshot persistence ─────────────────────────────────────────────

async function ensureSnapshotDir(): Promise<void> {
  if (!existsSync(SNAPSHOT_DIR)) {
    await mkdir(SNAPSHOT_DIR, { recursive: true })
  }
}

async function loadPreviousSnapshot(): Promise<Map<string, TaskSnapshot> | null> {
  if (!existsSync(SNAPSHOT_FILE)) return null

  try {
    const raw = await readFile(SNAPSHOT_FILE, 'utf-8')
    const arr: TaskSnapshot[] = JSON.parse(raw)

    
return new Map(arr.map(s => [s.taskId, s]))
  } catch (error) {
    console.warn(`⚠️  Snapshot file corrupt — starting fresh: ${(error as Error).message}`)
    
return null
  }
}

async function saveSnapshot(snapshots: Map<string, TaskSnapshot>): Promise<void> {
  const arr = Array.from(snapshots.values())

  await writeFile(SNAPSHOT_FILE, JSON.stringify(arr, null, 2), 'utf-8')
}

async function loadTransitionsLog(): Promise<Transition[]> {
  if (!existsSync(TRANSITIONS_FILE)) return []

  try {
    return JSON.parse(await readFile(TRANSITIONS_FILE, 'utf-8'))
  } catch {
    return []
  }
}

async function saveTransitionsLog(transitions: Transition[]): Promise<void> {
  await writeFile(TRANSITIONS_FILE, JSON.stringify(transitions, null, 2), 'utf-8')
}

async function resetSnapshots(): Promise<void> {
  if (existsSync(SNAPSHOT_DIR)) {
    await rm(SNAPSHOT_DIR, { recursive: true, force: true })
    console.log('🗑  Cleared .poc-snapshots/')
  }

  await ensureSnapshotDir()
}

// ─── Transition detection (canonical) ─────────────────────────────────

function detectTransitions(
  prev: Map<string, TaskSnapshot>,
  curr: Map<string, TaskSnapshot>
): Transition[] {
  const detected: Transition[] = []
  const detectedAt = new Date().toISOString()

  for (const [taskId, currSnap] of curr) {
    const prevSnap = prev.get(taskId)

    if (!prevSnap) continue // task is new — no transition to record

    if (prevSnap.status !== currSnap.status) {
      const fromStatus = prevSnap.status ?? '<null>'
      const toStatus = currSnap.status ?? '<null>'

      detected.push({
        taskId,
        taskName: currSnap.taskName,
        fromStatus,
        toStatus,
        detectedAt,
        notionLastEdited: currSnap.lastEditedTime,
        isTargetTransition: fromStatus === TARGET_FROM_STATUS && toStatus === TARGET_TO_STATUS
      })
    }
  }

  return detected
}

// ─── RpA counter per task (canonical) ─────────────────────────────────

function computeRpaPerTask(transitions: Transition[]): Map<string, { rpa: number; taskName: string }> {
  const counts = new Map<string, { rpa: number; taskName: string }>()

  for (const t of transitions) {
    if (!t.isTargetTransition) continue
    const existing = counts.get(t.taskId)

    if (existing) {
      existing.rpa++
    } else {
      counts.set(t.taskId, { rpa: 1, taskName: t.taskName })
    }
  }

  
return counts
}

// ─── CLI output ───────────────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('es-CL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function truncateName(name: string, maxLen: number): string {
  return name.length > maxLen ? name.slice(0, maxLen - 1) + '…' : name
}

function printPollSummary(state: PollState, newTransitions: Transition[]): void {
  const now = new Date().toISOString()

  console.log('')
  console.log(`[${formatTimestamp(now)}] Poll #${state.pollNumber} — fetched ${state.snapshots.size} tasks, +${newTransitions.length} transitions detected`)

  if (newTransitions.length > 0) {
    console.log('')
    console.log('📋 Transitions detectadas este poll:')

    for (const t of newTransitions) {
      const marker = t.isTargetTransition ? '✅ TARGET' : '         '
      const name = truncateName(t.taskName, 45)

      console.log(`  ${marker} "${name}"`)
      console.log(`             ${t.fromStatus} → ${t.toStatus}`)
    }
  }

  const rpaCounts = computeRpaPerTask(state.transitions)
  const totalTarget = state.transitions.filter(t => t.isTargetTransition).length

  if (rpaCounts.size > 0) {
    console.log('')
    console.log('📊 RpA per task (todas las tasks con RpA > 0):')
    console.log('  RpA  Task')
    console.log('  ─────────────────────────────────────────────────────────────')
    const sorted = Array.from(rpaCounts.entries()).sort((a, b) => b[1].rpa - a[1].rpa)

    for (const [, { rpa, taskName }] of sorted) {
      const name = truncateName(taskName, 55)

      console.log(`  ${String(rpa).padStart(3)}  ${name}`)
    }
  }

  console.log('')
  console.log('📈 Totales acumulados desde inicio del PoC:')
  console.log(`  Tasks tracked:              ${state.snapshots.size}`)
  console.log(`  Tasks con RpA > 0:          ${rpaCounts.size}`)
  console.log(`  Total target transitions:   ${totalTarget}`)
  console.log(`  Total transitions any kind: ${state.transitions.length}`)
  console.log('─'.repeat(80))
}

// ─── Single poll execution ────────────────────────────────────────────

async function executePoll(state: PollState): Promise<void> {
  state.pollNumber++
  const prevSnapshot = new Map(state.snapshots)

  try {
    const currSnapshot = await fetchAllTasksSnapshot()
    const newTransitions = detectTransitions(prevSnapshot, currSnapshot)

    if (newTransitions.length > 0) {
      state.transitions.push(...newTransitions)
      await saveTransitionsLog(state.transitions)
    }

    state.snapshots = currSnapshot
    await saveSnapshot(currSnapshot)

    printPollSummary(state, newTransitions)
  } catch (error) {
    console.error(`❌ Poll #${state.pollNumber} failed:`, (error as Error).message)
  }
}

// ─── Main entry point ─────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('═'.repeat(80))
  console.log('PoC RpA V2 — Demo Greenhouse')
  console.log('═'.repeat(80))
  console.log(`Data source: ${DEMO_TASKS_DS}`)
  console.log(`Notion API version: ${NOTION_VERSION} (SDK @notionhq/client v5.21.0)`)
  console.log(`Poll interval: ${POLL_INTERVAL_MS / 1000}s`)
  console.log(`Snapshot dir: ${SNAPSHOT_DIR}/`)
  console.log(`Target transition canonical: "${TARGET_FROM_STATUS}" → "${TARGET_TO_STATUS}"`)
  console.log(`Flags: once=${flagOnce}, reset=${flagReset}, verbose=${flagVerbose}`)
  console.log('═'.repeat(80))

  if (flagReset) {
    await resetSnapshots()
  } else {
    await ensureSnapshotDir()
  }

  const state: PollState = {
    pollNumber: 0,
    snapshots: (await loadPreviousSnapshot()) ?? new Map(),
    transitions: await loadTransitionsLog()
  }

  if (state.snapshots.size > 0) {
    console.log(`📂 Loaded previous snapshot: ${state.snapshots.size} tasks, ${state.transitions.length} transitions`)
  } else {
    console.log('📂 No previous snapshot — bootstrapping fresh (first poll = baseline, no transitions detected)')
  }

  // First poll
  await executePoll(state)

  if (flagOnce) {
    console.log('')
    console.log('--once flag set, exiting after single poll.')
    
return
  }

  // Loop forever (Ctrl+C to stop)
  console.log('')
  console.log(`🔄 Entering polling loop (every ${POLL_INTERVAL_MS / 1000}s — Ctrl+C to stop)`)
  console.log('')

  process.on('SIGINT', () => {
    console.log('')
    console.log('🛑 SIGINT received — exiting gracefully')
    process.exit(0)
  })

  while (true) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
    await executePoll(state)
  }
}

main().catch(error => {
  console.error('💥 Fatal error:', error)
  process.exit(1)
})
