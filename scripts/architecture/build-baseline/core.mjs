import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

export const CANONICAL_ERRORS = new Set([
  'baseline_unavailable',
  'build_failed',
  'billing_unavailable',
  'history_insufficient',
  'graph_incomplete'
])
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.mts']

const IMPORT_PATTERN =
  /(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)|import\(\s*['"]([^'"]+)['"]\s*\)/g

export const percentile = (values, quantile) => {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)

  return sorted[Math.max(0, Math.ceil(quantile * sorted.length) - 1)]
}

export const sanitize = value => {
  if (Array.isArray(value)) return value.map(sanitize)

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !/(token|secret|password|authorization|cookie|email|url)$/i.test(key))
        .map(([key, item]) => [key, sanitize(item)])
    )
  }

  if (typeof value === 'string') {
    if (/^[a-f0-9]{40,64}$/i.test(value)) return value

    return value
      .replace(/(?:https?:\/\/|postgres(?:ql)?:\/\/)[^\s"']+/gi, '[redacted-url]')
      .replace(/[A-Za-z0-9_-]{32,}/g, '[redacted-token]')
  }

  return value
}

export const listFiles = (root, predicate = () => true) => {
  if (!fs.existsSync(root)) return []
  const result = []

  const visit = current => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (['node_modules', '.next', '.next-local', 'artifacts', '.git'].includes(entry.name)) continue
      const absolute = path.join(current, entry.name)

      if (entry.isDirectory()) visit(absolute)
      else if (predicate(absolute)) result.push(absolute)
    }
  }

  visit(root)

  return result
}

const resolveLocalImport = (fromFile, specifier, repoRoot) => {
  let base

  if (specifier.startsWith('@/')) base = path.join(repoRoot, 'src', specifier.slice(2))
  else if (specifier.startsWith('.')) base = path.resolve(path.dirname(fromFile), specifier)
  else return null

  const candidates = [
    base,
    ...SOURCE_EXTENSIONS.map(ext => `${base}${ext}`),
    ...SOURCE_EXTENSIONS.map(ext => path.join(base, `index${ext}`))
  ]

  const resolved = candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile())

  return resolved ? path.relative(repoRoot, resolved).split(path.sep).join('/') : null
}

export const buildInventory = repoRoot => {
  const files = ['src', 'services'].flatMap(root =>
    listFiles(path.join(repoRoot, root), file => SOURCE_EXTENSIONS.includes(path.extname(file)))
  )

  const incoming = new Map()
  const packageFanout = new Map()
  const unresolvedLocal = []
  const browserServerViolations = []
  let edges = 0

  for (const absolute of files) {
    const source = fs.readFileSync(absolute, 'utf8')
    const relative = path.relative(repoRoot, absolute).split(path.sep).join('/')
    const isClient = /^\s*['"]use client['"];?/m.test(source)

    const isServer =
      /(?:from\s+['"]server-only['"]|require\(['"]server-only['"]\)|@\/lib\/(?:db|postgres)|from\s+['"]node:(?:fs|child_process|net|tls)['"])/.test(
        source
      )

    if (isClient && isServer) browserServerViolations.push({ file: relative, kind: 'same-file-client-server-marker' })

    for (const match of source.matchAll(IMPORT_PATTERN)) {
      const specifier = match[1] || match[2] || match[3]
      const resolved = resolveLocalImport(absolute, specifier, repoRoot)

      if (resolved) {
        edges += 1
        incoming.set(resolved, (incoming.get(resolved) || 0) + 1)
      } else if (specifier.startsWith('.') || specifier.startsWith('@/'))
        unresolvedLocal.push({ from: relative, specifier })
      else {
        const packageName = specifier.startsWith('@')
          ? specifier.split('/').slice(0, 2).join('/')
          : specifier.split('/')[0]

        packageFanout.set(packageName, (packageFanout.get(packageName) || 0) + 1)
      }
    }
  }

  const appFiles = listFiles(path.join(repoRoot, 'src/app'), file =>
    /\/(page|route|layout|loading|error)\.(?:tsx?|jsx?)$/.test(file)
  )

  const routeClusters = new Map()

  for (const file of appFiles) {
    const segments = path
      .relative(path.join(repoRoot, 'src/app'), file)
      .split(path.sep)
      .filter(segment => !segment.startsWith('('))

    const cluster = segments[0] === 'api' ? `api/${segments[1] || '_root'}` : segments[0] || '_root'

    routeClusters.set(cluster, (routeClusters.get(cluster) || 0) + 1)
  }

  const changedFiles = execFileSync(
    'git',
    ['log', '--since=30 days ago', '--name-only', '--format=', '--', 'src/app', 'src/lib', 'services', 'scripts'],
    { cwd: repoRoot, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }
  )
    .split('\n')
    .filter(Boolean)

  const changeFrequency = new Map()

  for (const file of changedFiles) {
    const segments = file.split('/')
    const cluster = segments[0] === 'src' ? `${segments[0]}/${segments[1]}/${segments[2] || '_root'}` : segments[0]

    changeFrequency.set(cluster, (changeFrequency.get(cluster) || 0) + 1)
  }

  const sizes = Object.fromEntries(
    ['src', 'docs', 'scripts', 'services', 'full-version', 'public'].map(name => {
      const rootFiles = listFiles(path.join(repoRoot, name))

      return [
        name,
        { files: rootFiles.length, bytes: rootFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0) }
      ]
    })
  )

  return {
    counts: {
      sourceFiles: files.length,
      appEntrypoints: appFiles.length,
      pages: appFiles.filter(file => /\/page\./.test(file)).length,
      routeHandlers: appFiles.filter(file => /\/route\./.test(file)).length
    },
    routeClusters: [...routeClusters.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([cluster, entrypoints]) => ({ cluster, entrypoints })),
    changeFrequency30d: [...changeFrequency.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([cluster, touches]) => ({ cluster, touches })),
    buildInputs: {
      runtime: ['src/**', 'public/**', 'next.config.ts', 'src/proxy.ts'],
      outputTracing: ['docs/epics/**/*.md', 'docs/tasks/**/*.md', 'docs/mini-tasks/**/*.md', 'docs/issues/**/*.md'],
      serviceOnly: ['services/**'],
      localOnly: ['scripts/**', 'full-version/**', 'docs/** except outputTracing allowlist']
    },
    sizes,
    graph: {
      nodes: files.length,
      edges,
      highFanoutFiles: [...incoming.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50)
        .map(([file, fanout]) => ({ file, fanout })),
      highFanoutPackages: [...packageFanout.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50)
        .map(([packageName, fanout]) => ({ packageName, fanout })),
      unresolvedLocal: unresolvedLocal.slice(0, 200),
      unresolvedLocalCount: unresolvedLocal.length,
      browserServerViolations
    }
  }
}

export const gitMetadata = repoRoot => ({
  commitSha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim(),
  dirtyWorktree: Boolean(execFileSync('git', ['status', '--porcelain'], { cwd: repoRoot, encoding: 'utf8' }).trim())
})

export const summarizeSamples = samples => {
  const successful = samples.filter(sample => sample.status === 'ok')
  const durations = successful.map(sample => sample.durationMs)
  const rss = successful.map(sample => sample.peakRssBytes).filter(Number.isFinite)

  return {
    sampleCount: samples.length,
    successfulCount: successful.length,
    durationMs: {
      min: durations.length ? Math.min(...durations) : null,
      p50: percentile(durations, 0.5),
      p95: durations.length >= 5 ? percentile(durations, 0.95) : null,
      max: durations.length ? Math.max(...durations) : null
    },
    peakRssBytes: {
      p50: percentile(rss, 0.5),
      p95: rss.length >= 5 ? percentile(rss, 0.95) : null,
      max: rss.length ? Math.max(...rss) : null
    },
    confidence: successful.length >= 5 ? 'medium' : successful.length >= 3 ? 'low' : 'insufficient'
  }
}
