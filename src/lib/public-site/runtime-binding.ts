import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

export type PublicSiteRepositoryBindingV1 = {
  contractVersion: 'public-site-repository-binding.v1'
  createdAt: string
  site: {
    url: string
    runtime: 'wordpress'
    hosting: 'kinsta'
    wordpressPath: string
  }
  repository: {
    provider: 'github'
    owner: string
    name: string
    url: string
    visibility: 'private' | 'public'
    defaultBranch: string
    baselineSha: string
    baselineTag: string
  }
  governedPaths: string[]
  initialBaseline: {
    sourceExport: string
    repoManifest: string
    liveFilesObserved: number
    baselineFilesTracked: number
    excludedLiveFiles: string[]
  }
  excludedByPolicy: string[]
  pending: string[]
}

export type PublicSiteRuntimeDriftStatus =
  | 'in_sync'
  | 'drifted'
  | 'repo_missing'
  | 'repo_extra'
  | 'ignored_live'

export type PublicSiteRuntimeDriftRow = {
  path: string
  status: PublicSiteRuntimeDriftStatus
  liveSha256?: string
  repoSha256?: string
  liveBytes?: number
  repoBytes?: number
  reason?: string
}

export type PublicSiteRuntimeDriftReportV1 = {
  contractVersion: 'public-site-runtime-drift-report.v1'
  generatedAt: string
  liveManifestPath: string
  liveGeneratedAt: string
  repoRoot: string
  counts: Record<PublicSiteRuntimeDriftStatus, number>
  rows: PublicSiteRuntimeDriftRow[]
}

export type PublicSiteCodeManifestFile = {
  path: string
  bytes: number
  sha256: string
}

export type PublicSiteLiveCodeManifest = {
  generatedAt: string
  files: PublicSiteCodeManifestFile[]
}

export const DEFAULT_PUBLIC_SITE_RUNTIME_REPO_ROOT =
  '/Users/jreye/Documents/efeonce-public-site-runtime'

export const PUBLIC_SITE_BINDING_PATH =
  'docs/operations/public-site-runtime-repository-binding-20260614.json'

const PUBLIC_SITE_DRIFT_REPORTS_ROOT = 'docs/operations/public-site-drift'
const PUBLIC_SITE_BASELINES_ROOT = 'tmp/public-site-code-baselines'

export const readPublicSiteRuntimeBinding = (options: { workspaceRoot?: string } = {}) => {
  const workspaceRoot = resolve(options.workspaceRoot ?? process.cwd())
  const bindingPath = join(workspaceRoot, PUBLIC_SITE_BINDING_PATH)

  if (!existsSync(bindingPath)) {
    throw new Error(`Public Site repository binding not found: ${bindingPath}`)
  }

  const binding = JSON.parse(readFileSync(bindingPath, 'utf8')) as PublicSiteRepositoryBindingV1

  if (binding.contractVersion !== 'public-site-repository-binding.v1') {
    throw new Error(`Unsupported Public Site binding contract: ${binding.contractVersion}`)
  }

  return {
    binding,
    bindingPath
  }
}

export const findLatestPublicSiteDriftReport = (options: { workspaceRoot?: string } = {}) => {
  const workspaceRoot = resolve(options.workspaceRoot ?? process.cwd())
  const reportsRoot = join(workspaceRoot, PUBLIC_SITE_DRIFT_REPORTS_ROOT)

  if (!existsSync(reportsRoot)) {
    return null
  }

  return (
    readdirSync(reportsRoot, { withFileTypes: true })
      .filter(entry => entry.isFile() && entry.name.startsWith('drift-') && entry.name.endsWith('.json'))
      .map(entry => join(reportsRoot, entry.name))
      .map(path => ({ path, mtimeMs: statSync(path).mtimeMs }))
      .sort((a, b) => b.mtimeMs - a.mtimeMs)[0]?.path ?? null
  )
}

export const readLatestPublicSiteDriftReport = (options: { workspaceRoot?: string } = {}) => {
  const reportPath = findLatestPublicSiteDriftReport(options)

  if (!reportPath) {
    return null
  }

  const report = JSON.parse(readFileSync(reportPath, 'utf8')) as PublicSiteRuntimeDriftReportV1

  if (report.contractVersion !== 'public-site-runtime-drift-report.v1') {
    throw new Error(`Unsupported Public Site drift report contract: ${report.contractVersion}`)
  }

  return {
    report,
    reportPath
  }
}

export const findLatestPublicSiteLiveManifest = (options: { workspaceRoot?: string } = {}) => {
  const workspaceRoot = resolve(options.workspaceRoot ?? process.cwd())
  const baselinesRoot = join(workspaceRoot, PUBLIC_SITE_BASELINES_ROOT)

  if (!existsSync(baselinesRoot)) {
    return null
  }

  return (
    readdirSync(baselinesRoot, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => join(baselinesRoot, entry.name, 'manifest.json'))
      .filter(existsSync)
      .map(path => ({ path, mtimeMs: statSync(path).mtimeMs }))
      .sort((a, b) => b.mtimeMs - a.mtimeMs)[0]?.path ?? null
  )
}

export const readPublicSiteLiveManifest = (manifestPath: string) => {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as PublicSiteLiveCodeManifest

  if (!Array.isArray(manifest.files)) {
    throw new Error(`Invalid Public Site live manifest: ${manifestPath}`)
  }

  return manifest
}

export const hashPublicSiteFile = (path: string) => {
  const contents = readFileSync(path)

  return {
    bytes: contents.byteLength,
    sha256: createHash('sha256').update(contents).digest('hex')
  }
}

export const listPublicSiteRepoFiles = (
  repoRoot: string,
  options: { governedPaths?: string[]; current?: string } = {}
): PublicSiteCodeManifestFile[] => {
  const root = resolve(repoRoot)
  const current = resolve(options.current ?? root)

  if (!existsSync(root)) {
    throw new Error(`Runtime repo root not found: ${root}`)
  }

  const governedPaths = options.governedPaths?.map(path => path.replace(/\\/g, '/')) ?? []
  const files: PublicSiteCodeManifestFile[] = []

  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const absolutePath = join(current, entry.name)
    const normalizedRelative = relative(root, absolutePath).replace(/\\/g, '/')

    if (normalizedRelative === '.git' || normalizedRelative.startsWith('.git/')) continue

    if (entry.isDirectory()) {
      files.push(...listPublicSiteRepoFiles(root, { governedPaths, current: absolutePath }))
      continue
    }

    if (!entry.isFile()) continue
    if (governedPaths.length > 0 && !governedPaths.some(path => normalizedRelative.startsWith(`${path}/`))) continue

    const hash = hashPublicSiteFile(absolutePath)

    files.push({
      path: normalizedRelative,
      bytes: hash.bytes,
      sha256: hash.sha256
    })
  }

  return files.sort((a, b) => a.path.localeCompare(b.path))
}
