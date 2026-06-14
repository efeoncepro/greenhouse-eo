#!/usr/bin/env tsx
/**
 * TASK-1122 — Compare live Kinsta export against the governed runtime repo.
 *
 * This is a non-mutating drift helper. Run `public-website:export-live-code`
 * first to refresh the live manifest, then run this command.
 *
 * Usage:
 *   pnpm public-website:diff-runtime
 *   pnpm public-website:diff-runtime -- --write
 */

import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { join, relative, resolve } from 'node:path'

type CliOptions = {
  liveManifest: string | null
  repoRoot: string
  write: boolean
  help: boolean
}

type ManifestFile = {
  path: string
  bytes: number
  sha256: string
}

type LiveManifest = {
  generatedAt: string
  files: ManifestFile[]
}

type DriftStatus = 'in_sync' | 'drifted' | 'repo_missing' | 'repo_extra' | 'ignored_live'

type DriftRow = {
  path: string
  status: DriftStatus
  liveSha256?: string
  repoSha256?: string
  liveBytes?: number
  repoBytes?: number
  reason?: string
}

const DEFAULT_REPO_ROOT = '/Users/jreye/Documents/efeonce-public-site-runtime'
const BASELINES_ROOT = 'tmp/public-site-code-baselines'
const REPORTS_ROOT = 'docs/operations/public-site-drift'

const IGNORED_LIVE_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /(^|\/)wp-content\/uploads\//, reason: 'WordPress uploads are runtime content.' },
  { pattern: /(^|\/)wp-content\/cache\//, reason: 'WordPress cache is generated runtime content.' },
  { pattern: /(^|\/)node_modules\//, reason: 'Dependencies are not canonical runtime code.' },
  { pattern: /(^|\/)vendor\//, reason: 'Vendor folders are not part of the governed baseline.' },
  { pattern: /\.bak($|-)/i, reason: 'Emergency backup artifact.' },
  { pattern: /backup/i, reason: 'Session/live backup artifact.' },
  { pattern: /\.env($|\.)/i, reason: 'Environment/secrets file.' }
]

const parseArgs = (argv: string[]): CliOptions => {
  const normalizedArgv = argv[0] === '--' ? argv.slice(1) : argv

  const options: CliOptions = {
    liveManifest: null,
    repoRoot: DEFAULT_REPO_ROOT,
    write: false,
    help: false
  }

  for (let i = 0; i < normalizedArgv.length; i += 1) {
    const arg = normalizedArgv[i]

    if (arg === '--help' || arg === '-h') {
      options.help = true
      continue
    }

    if (arg === '--live-manifest') {
      options.liveManifest = normalizedArgv[i + 1] ?? null
      i += 1
      continue
    }

    if (arg === '--repo-root') {
      options.repoRoot = normalizedArgv[i + 1] ?? options.repoRoot
      i += 1
      continue
    }

    if (arg === '--write') {
      options.write = true
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return options
}

const printHelp = () => {
  console.log(`Usage:
  pnpm public-website:diff-runtime
  pnpm public-website:diff-runtime -- --write
  pnpm public-website:diff-runtime -- --live-manifest tmp/public-site-code-baselines/<timestamp>/manifest.json
  pnpm public-website:diff-runtime -- --repo-root /Users/jreye/Documents/efeonce-public-site-runtime`)
}

const findLatestLiveManifest = () => {
  const root = resolve(process.cwd(), BASELINES_ROOT)

  if (!existsSync(root)) {
    throw new Error(`No live baseline exports found at ${root}. Run pnpm public-website:export-live-code first.`)
  }

  const candidates = readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => join(root, entry.name, 'manifest.json'))
    .filter(existsSync)
    .map(path => ({ path, mtimeMs: statSync(path).mtimeMs }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs)

  const latest = candidates[0]?.path

  if (!latest) {
    throw new Error(`No manifest.json files found under ${root}. Run pnpm public-website:export-live-code first.`)
  }

  return latest
}

const hashFile = (path: string) => {
  const contents = readFileSync(path)

  return {
    bytes: contents.byteLength,
    sha256: createHash('sha256').update(contents).digest('hex')
  }
}

const listRepoFiles = (repoRoot: string, current = repoRoot): ManifestFile[] => {
  const entries = readdirSync(current, { withFileTypes: true })
  const files: ManifestFile[] = []

  for (const entry of entries) {
    const absolutePath = join(current, entry.name)
    const normalizedRelative = relative(repoRoot, absolutePath)

    if (normalizedRelative.startsWith('.git/')) continue

    if (entry.isDirectory()) {
      files.push(...listRepoFiles(repoRoot, absolutePath))
      continue
    }

    if (!entry.isFile()) continue

    const hash = hashFile(absolutePath)

    files.push({
      path: normalizedRelative,
      bytes: hash.bytes,
      sha256: hash.sha256
    })
  }

  return files.sort((a, b) => a.path.localeCompare(b.path))
}

const ignoreReason = (path: string) => {
  return IGNORED_LIVE_PATTERNS.find(entry => entry.pattern.test(path))?.reason ?? null
}

const main = () => {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printHelp()
    
return
  }

  const liveManifestPath = resolve(process.cwd(), options.liveManifest ?? findLatestLiveManifest())
  const repoRoot = resolve(options.repoRoot)

  if (!existsSync(liveManifestPath)) {
    throw new Error(`Live manifest not found: ${liveManifestPath}`)
  }

  if (!existsSync(repoRoot)) {
    throw new Error(`Runtime repo root not found: ${repoRoot}`)
  }

  const liveManifest = JSON.parse(readFileSync(liveManifestPath, 'utf8')) as LiveManifest
  const liveFiles = liveManifest.files
  const repoFiles = listRepoFiles(repoRoot).filter(file => file.path.startsWith('wp-content/'))
  const repoByPath = new Map(repoFiles.map(file => [file.path, file]))
  const liveByPath = new Map(liveFiles.map(file => [file.path, file]))
  const rows: DriftRow[] = []

  for (const liveFile of liveFiles) {
    const ignoredReason = ignoreReason(liveFile.path)

    if (ignoredReason) {
      rows.push({
        path: liveFile.path,
        status: 'ignored_live',
        liveSha256: liveFile.sha256,
        liveBytes: liveFile.bytes,
        reason: ignoredReason
      })
      continue
    }

    const repoFile = repoByPath.get(liveFile.path)

    if (!repoFile) {
      rows.push({
        path: liveFile.path,
        status: 'repo_missing',
        liveSha256: liveFile.sha256,
        liveBytes: liveFile.bytes
      })
      continue
    }

    if (repoFile.sha256 !== liveFile.sha256) {
      rows.push({
        path: liveFile.path,
        status: 'drifted',
        liveSha256: liveFile.sha256,
        repoSha256: repoFile.sha256,
        liveBytes: liveFile.bytes,
        repoBytes: repoFile.bytes
      })
      continue
    }

    rows.push({
      path: liveFile.path,
      status: 'in_sync',
      liveSha256: liveFile.sha256,
      repoSha256: repoFile.sha256,
      liveBytes: liveFile.bytes,
      repoBytes: repoFile.bytes
    })
  }

  for (const repoFile of repoFiles) {
    if (liveByPath.has(repoFile.path)) continue

    rows.push({
      path: repoFile.path,
      status: 'repo_extra',
      repoSha256: repoFile.sha256,
      repoBytes: repoFile.bytes
    })
  }

  rows.sort((a, b) => {
    if (a.status !== b.status) return a.status.localeCompare(b.status)

    return a.path.localeCompare(b.path)
  })

  const counts = rows.reduce<Record<DriftStatus, number>>(
    (acc, row) => {
      acc[row.status] += 1

      return acc
    },
    {
      drifted: 0,
      ignored_live: 0,
      in_sync: 0,
      repo_extra: 0,
      repo_missing: 0
    }
  )

  const report = {
    contractVersion: 'public-site-runtime-drift-report.v1',
    generatedAt: new Date().toISOString(),
    liveManifestPath,
    liveGeneratedAt: liveManifest.generatedAt,
    repoRoot,
    counts,
    rows
  }

  if (options.write) {
    const reportsRoot = resolve(process.cwd(), REPORTS_ROOT)
    const filename = `drift-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    const outputPath = join(reportsRoot, filename)

    mkdirSync(reportsRoot, { recursive: true })
    writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`)
    console.log(`Wrote drift report: ${outputPath}`)
  }

  console.log(JSON.stringify({ counts, liveManifestPath, repoRoot }, null, 2))

  if (counts.drifted > 0 || counts.repo_missing > 0) {
    process.exitCode = 2
  }
}

try {
  main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)

  console.error(`public-website:diff-runtime failed: ${message}`)
  process.exit(1)
}
