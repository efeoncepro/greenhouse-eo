#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))

const productionRefs = new Set(['main'])

const rootDocumentationFiles = new Set([
  'AGENTS.md',
  'CLAUDE.md',
  'CONTRIBUTING.md',
  'Handoff.archive.md',
  'Handoff.md',
  'README.md',
  'changelog.md',
  'project_context.md'
])

const deployControlDocs = new Set([
  'docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md',
  'docs/operations/FEATURE_FLAG_STATE_LEDGER.md',
  'docs/operations/PRODUCTION_RELEASE_INCIDENT_PLAYBOOK_V1.md',
  'docs/operations/runbooks/production-release-watchdog.md',
  'docs/operations/runbooks/production-release.md',
  'docs/manual-de-uso/plataforma/release-orchestrator.md',
  'docs/manual-de-uso/plataforma/release-preflight.md',
  'docs/manual-de-uso/plataforma/release-watchdog.md'
])

const normalizePath = path => path.replace(/\\/g, '/').replace(/^\.\//, '')

const isMarkdownPath = path => /\.(md|mdx)$/i.test(path)

export const isDeployControlDocPath = rawPath => {
  const path = normalizePath(rawPath)

  return deployControlDocs.has(path)
}

export const isSafeDocsOnlyPath = rawPath => {
  const path = normalizePath(rawPath)

  if (!path) return true
  if (isDeployControlDocPath(path)) return false
  if (rootDocumentationFiles.has(path)) return true
  if (path.startsWith('docs/')) return true
  if (path.startsWith('.codex/') || path.startsWith('.claude/') || path.startsWith('.agents/')) return true
  if (path.startsWith('.github/') && isMarkdownPath(path)) return true

  return isMarkdownPath(path)
}

export const decideBuildAction = ({ changedFiles, env = process.env }) => {
  const ref = env.VERCEL_GIT_COMMIT_REF || ''
  const vercelEnv = env.VERCEL_ENV || ''
  const targetEnv = env.VERCEL_TARGET_ENV || ''

  if (productionRefs.has(ref) || vercelEnv === 'production' || targetEnv === 'production') {
    return {
      action: 'build',
      reason: 'production deployments stay buildable until the release orchestrator supports skipped Vercel builds',
      deployAffectingFiles: []
    }
  }

  if (!changedFiles.length) {
    return {
      action: 'build',
      reason: 'no changed files were detected',
      deployAffectingFiles: []
    }
  }

  const deployAffectingFiles = changedFiles.map(normalizePath).filter(path => !isSafeDocsOnlyPath(path))

  if (deployAffectingFiles.length > 0) {
    return {
      action: 'build',
      reason: 'deploy-affecting paths changed',
      deployAffectingFiles
    }
  }

  return {
    action: 'skip',
    reason: 'only safe documentation or local agent context paths changed',
    deployAffectingFiles: []
  }
}

const runGit = args =>
  spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })

const hasCommit = sha => {
  if (!sha) return false

  const result = runGit(['cat-file', '-e', `${sha}^{commit}`])

  return result.status === 0
}

const fetchCommit = sha => {
  if (!sha || hasCommit(sha)) return

  runGit(['fetch', '--depth=50', 'origin', sha])
}

const resolveHeadSha = () => {
  const envSha = process.env.VERCEL_GIT_COMMIT_SHA

  if (envSha) return envSha

  const result = runGit(['rev-parse', 'HEAD'])

  if (result.status !== 0) return ''

  return result.stdout.trim()
}

const getChangedFiles = () => {
  const previousSha = process.env.VERCEL_GIT_PREVIOUS_SHA || ''
  const headSha = resolveHeadSha()

  if (!previousSha || !headSha) {
    return {
      ok: false,
      changedFiles: [],
      reason: 'missing VERCEL_GIT_PREVIOUS_SHA or head SHA'
    }
  }

  fetchCommit(previousSha)
  fetchCommit(headSha)

  if (!hasCommit(previousSha) || !hasCommit(headSha)) {
    return {
      ok: false,
      changedFiles: [],
      reason: 'comparison commit was not available in the Vercel shallow clone'
    }
  }

  const result = runGit(['diff', '--name-only', previousSha, headSha, '--'])

  if (result.status !== 0) {
    return {
      ok: false,
      changedFiles: [],
      reason: result.stderr.trim() || 'git diff failed'
    }
  }

  return {
    ok: true,
    changedFiles: result.stdout.split('\n').map(line => line.trim()).filter(Boolean),
    reason: ''
  }
}

const main = () => {
  const diff = getChangedFiles()

  if (!diff.ok) {
    console.log(`[vercel-ignore-build] Continuing build: ${diff.reason}.`)
    process.exit(1)
  }

  const decision = decideBuildAction({ changedFiles: diff.changedFiles })

  console.log(`[vercel-ignore-build] Decision: ${decision.action}. ${decision.reason}.`)
  console.log(`[vercel-ignore-build] Changed files: ${diff.changedFiles.length}.`)

  if (decision.deployAffectingFiles.length > 0) {
    console.log('[vercel-ignore-build] Deploy-affecting files:')
    for (const path of decision.deployAffectingFiles) console.log(`- ${path}`)
  }

  process.exit(decision.action === 'skip' ? 0 : 1)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
