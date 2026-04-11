import fs from 'node:fs/promises'
import path from 'node:path'

const latestBuildFile = path.resolve(process.cwd(), '.next-build-dir')
const latestBuildMetaFile = path.resolve(process.cwd(), '.next-build-meta.json')
const isolatedBuildRoot = path.resolve(process.cwd(), '.next-local')

const SHARED_DIST_DIR = '.next'
const ISOLATED_BUILD_RETENTION = 5

const normalizeBoolean = value => ['1', 'true', 'yes', 'on'].includes((value || '').trim().toLowerCase())

const pathExists = async target => {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

export const shouldUseIsolatedNextDist = () => {
  const forceShared = normalizeBoolean(process.env.GREENHOUSE_FORCE_SHARED_NEXT_DIST)
  const forceIsolated = normalizeBoolean(process.env.GREENHOUSE_FORCE_ISOLATED_NEXT_DIST)
  const isVercel = normalizeBoolean(process.env.VERCEL)
  const isCi = normalizeBoolean(process.env.CI)

  if (forceShared) {
    return false
  }

  if (forceIsolated) {
    return true
  }

  return !isVercel && !isCi
}

const buildIsolatedBuildId = () => {
  const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14)

  return `build-${timestamp}-${process.pid}`
}

export const getNextBuildTarget = () => {
  if (!shouldUseIsolatedNextDist()) {
    return {
      distDir: SHARED_DIST_DIR,
      buildId: 'shared-next'
    }
  }

  const buildId = buildIsolatedBuildId()

  return {
    distDir: path.posix.join('.next-local', buildId),
    buildId
  }
}

export const writeLatestBuildPointer = async ({ distDir, buildId }) => {
  await fs.mkdir(path.dirname(latestBuildFile), { recursive: true })
  await fs.writeFile(latestBuildFile, `${distDir}\n`, 'utf8')

  await fs.writeFile(
    latestBuildMetaFile,
    JSON.stringify(
      {
        distDir,
        buildId,
        mode: shouldUseIsolatedNextDist() ? 'isolated' : 'shared',
        createdAt: new Date().toISOString(),
        pid: process.pid,
        platform: process.platform,
        rollback:
          'Temporal rollback: GREENHOUSE_FORCE_SHARED_NEXT_DIST=true pnpm build. Hard rollback: revert scripts/next-dist-dir.mjs, scripts/run-next-build.mjs y scripts/run-next-start.mjs.'
      },
      null,
      2
    ),
    'utf8'
  )
}

const findMostRecentIsolatedBuild = async () => {
  if (!(await pathExists(isolatedBuildRoot))) {
    return null
  }

  const entries = await fs.readdir(isolatedBuildRoot, { withFileTypes: true })

  const candidates = entries
    .filter(entry => entry.isDirectory() && entry.name.startsWith('build-'))
    .sort((left, right) => right.name.localeCompare(left.name))

  return candidates[0] ? path.posix.join('.next-local', candidates[0].name) : null
}

export const resolveLatestStartDistDir = async () => {
  if (process.env.NEXT_DIST_DIR?.trim()) {
    return process.env.NEXT_DIST_DIR.trim()
  }

  if (!shouldUseIsolatedNextDist()) {
    return SHARED_DIST_DIR
  }

  try {
    const candidate = (await fs.readFile(latestBuildFile, 'utf8')).trim()

    if (candidate && (await pathExists(path.resolve(process.cwd(), candidate)))) {
      return candidate
    }
  } catch {
    // fall through to directory scan
  }

  return (await findMostRecentIsolatedBuild()) || SHARED_DIST_DIR
}

export const pruneOldIsolatedBuilds = async (retainCount = ISOLATED_BUILD_RETENTION) => {
  if (!shouldUseIsolatedNextDist() || !(await pathExists(isolatedBuildRoot))) {
    return
  }

  const entries = await fs.readdir(isolatedBuildRoot, { withFileTypes: true })

  const candidates = entries
    .filter(entry => entry.isDirectory() && entry.name.startsWith('build-'))
    .sort((left, right) => right.name.localeCompare(left.name))

  const staleEntries = candidates.slice(Math.max(0, retainCount))

  await Promise.all(
    staleEntries.map(entry =>
      fs.rm(path.join(isolatedBuildRoot, entry.name), {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 250
      })
    )
  )
}
