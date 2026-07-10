import { execFile } from 'node:child_process'

const PHASE_MARKERS = [
  ['Creating an optimized production build', 'compile'],
  ['Compiling', 'compile'],
  ['Compiled successfully', 'typecheck'],
  ['Running TypeScript', 'typecheck'],
  ['Checking validity of types', 'typecheck'],
  ['Collecting page data', 'collect-page-data'],
  ['Generating static pages', 'static-generation'],
  ['Finalizing page optimization', 'tracing'],
  ['Collecting build traces', 'tracing']
]

export const classifyProcess = command => {
  const normalized = command.toLowerCase()

  if (/next-(?:server|build-worker)|jest-worker|worker_threads/.test(normalized)) return 'worker'
  if (/(?:^|\s|\/)next(?:\s|$)/.test(normalized)) return 'next'
  if (/typescript|tsc(?:\s|$)/.test(normalized)) return 'typescript'
  if (/(?:^|\s|\/)(?:z?sh|bash|dash)(?:\s|$)/.test(normalized)) return 'shell'
  if (/(?:^|\s|\/)node(?:\s|$)/.test(normalized)) return 'node'

  return 'other'
}

export const parsePsOutput = output =>
  output
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const match = line.match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/)

      if (!match) return null

      return {
        pid: Number(match[1]),
        ppid: Number(match[2]),
        rssBytes: Number(match[3]) * 1024,
        processClass: classifyProcess(match[4])
      }
    })
    .filter(Boolean)

export const descendantsOf = (processes, rootPid) => {
  const descendants = new Set([rootPid])
  let changed = true

  while (changed) {
    changed = false

    for (const process of processes) {
      if (!descendants.has(process.pid) && descendants.has(process.ppid)) {
        descendants.add(process.pid)
        changed = true
      }
    }
  }

  return processes.filter(process => descendants.has(process.pid))
}

export const aggregateSnapshot = ({ processes, rootPid, phase, atMs }) => {
  const tree = descendantsOf(processes, rootPid)
  const byClass = {}

  for (const process of tree) byClass[process.processClass] = (byClass[process.processClass] || 0) + process.rssBytes

  return {
    atMs,
    phase,
    rootRssBytes: tree.find(process => process.pid === rootPid)?.rssBytes ?? null,
    treeRssBytes: tree.reduce((sum, process) => sum + process.rssBytes, 0),
    processCount: tree.length,
    byClass
  }
}

export const phaseFromOutput = (text, currentPhase = 'prebuild') => {
  let phase = currentPhase

  for (const [marker, candidate] of PHASE_MARKERS) if (text.includes(marker)) phase = candidate

  return phase
}

export const summarizeProfile = snapshots => {
  if (!snapshots.length)
    return {
      sampleCount: 0,
      peakTreeRssBytes: null,
      peakRootRssBytes: null,
      peakProcessCount: null,
      phasePeaks: {},
      processClassPeaks: {},
      confidence: 'insufficient'
    }

  const phasePeaks = {}
  const processClassPeaks = {}

  for (const snapshot of snapshots) {
    phasePeaks[snapshot.phase] = Math.max(phasePeaks[snapshot.phase] || 0, snapshot.treeRssBytes)

    for (const [processClass, rssBytes] of Object.entries(snapshot.byClass))
      processClassPeaks[processClass] = Math.max(processClassPeaks[processClass] || 0, rssBytes)
  }

  return {
    sampleCount: snapshots.length,
    peakTreeRssBytes: Math.max(...snapshots.map(snapshot => snapshot.treeRssBytes)),
    peakRootRssBytes: Math.max(...snapshots.map(snapshot => snapshot.rootRssBytes || 0)),
    peakProcessCount: Math.max(...snapshots.map(snapshot => snapshot.processCount)),
    phasePeaks,
    processClassPeaks,
    confidence: snapshots.length >= 20 ? 'high' : snapshots.length >= 5 ? 'medium' : 'low'
  }
}

const readProcesses = () =>
  new Promise((resolve, reject) => {
    execFile('ps', ['-axo', 'pid=,ppid=,rss=,command='], { maxBuffer: 10 * 1024 * 1024 }, (error, stdout) => {
      if (error) reject(error)
      else resolve(parsePsOutput(stdout))
    })
  })

export const createProcessProfiler = ({ rootPid, intervalMs = 500, now = () => Date.now() }) => {
  const startedAt = now()
  const snapshots = []
  let phase = 'prebuild'
  let timer = null
  let pending = Promise.resolve()
  let stopped = false

  const sample = () => {
    if (stopped) return

    pending = pending
      .then(readProcesses)
      .then(processes => {
        const snapshot = aggregateSnapshot({ processes, rootPid, phase, atMs: now() - startedAt })

        if (snapshot.processCount) snapshots.push(snapshot)
      })
      .catch(() => undefined)
  }

  return {
    start() {
      sample()
      timer = setInterval(sample, intervalMs)
      timer.unref?.()
    },
    observeOutput(text) {
      phase = phaseFromOutput(text, phase)
    },
    async stop() {
      stopped = true
      if (timer) clearInterval(timer)
      await pending

      return { intervalMs, timeline: snapshots, summary: summarizeProfile(snapshots) }
    }
  }
}
