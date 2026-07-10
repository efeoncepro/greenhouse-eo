import assert from 'node:assert/strict'
import test from 'node:test'

import {
  aggregateSnapshot,
  classifyProcess,
  descendantsOf,
  parsePsOutput,
  phaseFromOutput,
  summarizeProfile
} from './process-profiler.mjs'

test('ps parser classifies processes without retaining command arguments', () => {
  const processes = parsePsOutput(`
    100 1 1024 /usr/bin/time -l /bin/sh -lc secret=value
    101 100 2048 node node_modules/next/dist/bin/next build
    102 101 4096 next-build-worker --token never-store-this
  `)

  assert.deepEqual(processes, [
    { pid: 100, ppid: 1, rssBytes: 1048576, processClass: 'shell' },
    { pid: 101, ppid: 100, rssBytes: 2097152, processClass: 'next' },
    { pid: 102, ppid: 101, rssBytes: 4194304, processClass: 'worker' }
  ])
  assert.equal(JSON.stringify(processes).includes('never-store-this'), false)
})

test('process classification is bounded to an allowlist', () => {
  assert.equal(classifyProcess('/bin/zsh -lc pnpm build'), 'shell')
  assert.equal(classifyProcess('/opt/node/bin/node foo.js'), 'node')
  assert.equal(classifyProcess('next build'), 'next')
  assert.equal(classifyProcess('tsc --noEmit'), 'typescript')
  assert.equal(classifyProcess('unknown-provider --secret x'), 'other')
})

test('descendant tree and simultaneous RSS aggregation do not include siblings', () => {
  const processes = [
    { pid: 10, ppid: 1, rssBytes: 100, processClass: 'shell' },
    { pid: 11, ppid: 10, rssBytes: 200, processClass: 'node' },
    { pid: 12, ppid: 11, rssBytes: 300, processClass: 'worker' },
    { pid: 99, ppid: 1, rssBytes: 900, processClass: 'other' }
  ]

  assert.deepEqual(descendantsOf(processes, 10).map(item => item.pid), [10, 11, 12])
  assert.deepEqual(aggregateSnapshot({ processes, rootPid: 10, phase: 'compile', atMs: 500 }), {
    atMs: 500,
    phase: 'compile',
    rootRssBytes: 100,
    treeRssBytes: 600,
    processCount: 3,
    byClass: { shell: 100, node: 200, worker: 300 }
  })
})

test('phase attribution advances on supported Next build markers and preserves unknown evidence', () => {
  assert.equal(phaseFromOutput('Creating an optimized production build', 'prebuild'), 'compile')
  assert.equal(phaseFromOutput('Running TypeScript', 'compile'), 'typecheck')
  assert.equal(phaseFromOutput('Collecting page data', 'typecheck'), 'collect-page-data')
  assert.equal(phaseFromOutput('unrecognized output', 'unknown'), 'unknown')
})

test('profile summary reports phase and process-class peaks', () => {
  const summary = summarizeProfile([
    { phase: 'compile', treeRssBytes: 600, rootRssBytes: 100, processCount: 3, byClass: { node: 200, worker: 300 } },
    { phase: 'compile', treeRssBytes: 800, rootRssBytes: 120, processCount: 4, byClass: { node: 250, worker: 450 } },
    { phase: 'tracing', treeRssBytes: 500, rootRssBytes: 90, processCount: 2, byClass: { node: 400 } }
  ])

  assert.equal(summary.peakTreeRssBytes, 800)
  assert.equal(summary.phasePeaks.compile, 800)
  assert.equal(summary.processClassPeaks.worker, 450)
  assert.equal(summary.peakProcessCount, 4)
  assert.equal(summary.confidence, 'low')
})
