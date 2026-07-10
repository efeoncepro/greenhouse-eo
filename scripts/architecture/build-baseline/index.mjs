#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'

import { buildInventory, gitMetadata, listFiles, sanitize, summarizeSamples } from './core.mjs'

const repoRoot = process.cwd()
const outputRoot = path.resolve(repoRoot, 'artifacts/architecture/build-baseline')
const args = process.argv.slice(2)
const command = args[0] || 'inventory'
const valueAfter = flag => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined)
const runId = valueAfter('--run-id') || new Date().toISOString().replace(/[:.]/g, '-')
const runDir = path.join(outputRoot, runId)
const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'))

const versions = () => ({
  node: process.version,
  pnpm: process.env.npm_config_user_agent?.match(/pnpm\/([^\s]+)/)?.[1] || 'unknown',
  next: packageJson.dependencies.next,
  platform: process.platform,
  arch: process.arch,
  osRelease: os.release(),
  cpuModel: os.cpus()[0]?.model || 'unknown',
  cpuCount: os.cpus().length,
  totalMemoryBytes: os.totalmem()
})

const base = () => ({
  runId,
  startedAt: new Date().toISOString(),
  environment: 'local',
  ...gitMetadata(repoRoot),
  versions: versions()
})

const writeJson = (name, payload) => {
  fs.mkdirSync(runDir, { recursive: true })
  const target = path.join(runDir, name)

  fs.writeFileSync(target, `${JSON.stringify(sanitize(payload), null, 2)}\n`)
  console.log(path.relative(repoRoot, target))
}

if (command === 'inventory') {
  const inventory = buildInventory(repoRoot)

  writeJson('inventory.json', {
    ...base(),
    status: 'ok',
    confidence: inventory.graph.unresolvedLocalCount ? 'medium' : 'high',
    missingEvidence: [],
    warnings: inventory.graph.unresolvedLocalCount ? ['graph contains unresolved local imports'] : [],
    inventory
  })
} else if (command === 'measure') {
  const cacheState = valueAfter('--cache-state') || 'unknown'
  const shellCommand = valueAfter('--command')

  if (!['clean', 'warm', 'unknown'].includes(cacheState) || !shellCommand) {
    console.error('usage: measure --cache-state clean|warm|unknown --command "..." [--run-id id]')
    process.exit(2)
  }

  fs.mkdirSync(runDir, { recursive: true })
  const tsconfigPath = path.join(repoRoot, 'tsconfig.json')
  const tsconfigBefore = fs.readFileSync(tsconfigPath, 'utf8')
  const stderr = []
  const started = Date.now()

  const child = spawn('/usr/bin/time', ['-l', '/bin/sh', '-lc', shellCommand], {
    cwd: repoRoot,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
    stdio: ['ignore', 'inherit', 'pipe']
  })

  child.stderr.on('data', chunk => {
    process.stderr.write(chunk)
    stderr.push(chunk.toString())
  })
  child.on('close', exitCode => {
    if (fs.readFileSync(tsconfigPath, 'utf8') !== tsconfigBefore) fs.writeFileSync(tsconfigPath, tsconfigBefore)
    const timeOutput = stderr.join('')
    const rssMatch = timeOutput.match(/(\d+)\s+maximum resident set size/i)
    const peakRssBytes = rssMatch ? Number(rssMatch[1]) : null
    const distDirMatch = shellCommand.match(/NEXT_DIST_DIR=([^\s]+)/)
    const distDir = distDirMatch?.[1] || null
    const distFiles = distDir ? listFiles(path.resolve(repoRoot, distDir)) : []
    const inventory = buildInventory(repoRoot)

    writeJson('sample.json', {
      ...base(),
      cacheState,
      durationMs: Date.now() - started,
      peakRssBytes,
      exitCode,
      status: exitCode === 0 ? 'ok' : 'error',
      error: exitCode === 0 ? null : 'build_failed',
      routeCounts: inventory.counts,
      buildOutput: distDir
        ? {
            distDir,
            files: distFiles.length,
            bytes: distFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0),
            traceFiles: distFiles.filter(file => file.endsWith('.nft.json')).length
          }
        : null,
      missingEvidence: [peakRssBytes ? null : 'peak_rss', distDir ? null : 'build_output'].filter(Boolean),
      warnings: [],
      confidence: peakRssBytes && distDir ? 'high' : 'medium'
    })
    process.exitCode = exitCode || 0
  })
} else if (command === 'summarize') {
  const prefix = valueAfter('--prefix')

  const sampleFiles = fs.existsSync(outputRoot)
    ? fs
        .readdirSync(outputRoot)
        .filter(entry => !prefix || entry.startsWith(prefix))
        .map(entry => path.join(outputRoot, entry, 'sample.json'))
        .filter(fs.existsSync)
    : []

  const samples = sampleFiles.map(file => JSON.parse(fs.readFileSync(file, 'utf8')))

  const byCacheState = Object.fromEntries(
    ['clean', 'warm', 'unknown'].map(state => [
      state,
      summarizeSamples(samples.filter(sample => sample.cacheState === state))
    ])
  )

  writeJson('summary.json', {
    ...base(),
    status: samples.length ? 'ok' : 'error',
    error: samples.length ? null : 'baseline_unavailable',
    confidence: samples.length >= 8 ? 'medium' : 'low',
    missingEvidence: samples.length >= 8 ? [] : ['recommended_sample_count'],
    samples: samples.map(({ runId: id, cacheState, durationMs, peakRssBytes, status }) => ({
      runId: id,
      cacheState,
      durationMs,
      peakRssBytes,
      status
    })),
    byCacheState
  })
} else if (command === 'vercel') {
  try {
    const result = spawnSync('vercel', ['list'], { cwd: repoRoot, encoding: 'utf8', maxBuffer: 5 * 1024 * 1024 })

    if (result.status !== 0) throw new Error('vercel list failed')
    const raw = `${result.stdout || ''}\n${result.stderr || ''}`

    const deployments = raw
      .split('\n')
      .map(line => {
        const match = line.match(
          /^\s*(\S+)\s+\S+\/\S+\s+https?:\/\/\S+\s+(.+?)\s+(Production|staging|Preview)\s+(\d+)([ms])\s+\S+\s*$/i
        )

        if (!match) return null
        const durationSeconds = Number(match[4]) * (match[5].toLowerCase() === 'm' ? 60 : 1)

        return {
          age: match[1],
          status: match[2].trim().replace(/^●\s*/, ''),
          environment: match[3].toLowerCase(),
          durationSeconds
        }
      })
      .filter(Boolean)

    writeJson('vercel.json', {
      ...base(),
      environment: 'vercel-read-only',
      status: deployments.length ? 'ok' : 'error',
      error: deployments.length ? null : 'history_insufficient',
      confidence: 'low',
      missingEvidence: ['14_30_day_window', 'cache_state', 'billed_build_minutes'],
      warnings: [
        'Vercel CLI default page only; deployment URLs, usernames and pagination cursor intentionally discarded'
      ],
      deploymentCount: deployments.length,
      deployments,
      durationSeconds: summarizeSamples(
        deployments.map(item => ({
          status: item.status.toLowerCase() === 'ready' ? 'ok' : 'error',
          durationMs: item.durationSeconds * 1000,
          peakRssBytes: null
        }))
      ).durationMs
    })
  } catch {
    writeJson('vercel.json', {
      ...base(),
      environment: 'vercel-read-only',
      status: 'error',
      error: 'billing_unavailable',
      confidence: 'insufficient',
      missingEvidence: ['vercel_deployments', 'billed_build_minutes'],
      warnings: []
    })
    process.exitCode = 1
  }
} else {
  console.error(`unknown command: ${command}`)
  process.exit(2)
}
