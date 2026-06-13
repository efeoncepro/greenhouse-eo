import { createRequire } from 'node:module'
import type * as NodeChildProcessModule from 'node:child_process'
import type { ChildProcess as NodeChildProcess } from 'node:child_process'

const require = createRequire(import.meta.url)

const DEFAULT_SENTRY_SOURCEMAP_UPLOAD_TIMEOUT_MS = 60_000
const MIN_SENTRY_SOURCEMAP_UPLOAD_TIMEOUT_MS = 5_000
const MAX_SENTRY_SOURCEMAP_UPLOAD_TIMEOUT_MS = 240_000
const SENTRY_CLI_PROCESS_PATTERN = /(?:^|[/\\])sentry-cli(?:\.exe)?$/i

type ChildProcessModule = typeof NodeChildProcessModule

export type SentrySourcemapUploadTimeoutResult =
  | { status: 'completed' }
  | { status: 'degraded'; reason: string; timedOut: boolean }

export type SentrySourcemapUploadTimeoutOptions = {
  timeoutMs?: number
  logger?: Pick<Console, 'warn'>
}

export function resolveSentrySourcemapUploadTimeoutMs(
  rawValue = process.env.SENTRY_SOURCEMAP_UPLOAD_TIMEOUT_MS
): number {
  const normalizedValue = rawValue?.trim()

  if (!normalizedValue) {
    return DEFAULT_SENTRY_SOURCEMAP_UPLOAD_TIMEOUT_MS
  }

  const parsed = Number(normalizedValue)

  if (!Number.isFinite(parsed)) {
    return DEFAULT_SENTRY_SOURCEMAP_UPLOAD_TIMEOUT_MS
  }

  return Math.min(
    Math.max(Math.trunc(parsed), MIN_SENTRY_SOURCEMAP_UPLOAD_TIMEOUT_MS),
    MAX_SENTRY_SOURCEMAP_UPLOAD_TIMEOUT_MS
  )
}

export async function runSentrySourcemapUploadWithTimeout(
  runUpload: () => Promise<unknown> | unknown,
  options: SentrySourcemapUploadTimeoutOptions = {}
): Promise<SentrySourcemapUploadTimeoutResult> {
  const timeoutMs = options.timeoutMs ?? resolveSentrySourcemapUploadTimeoutMs()
  const logger = options.logger ?? console
  const childProcess = require('node:child_process') as ChildProcessModule
  const originalSpawn = childProcess.spawn
  const originalExecFile = childProcess.execFile
  const trackedChildren = new Set<NodeChildProcess>()
  let timedOut = false

  const killTrackedChildren = () => {
    for (const child of trackedChildren) {
      if (!child.killed) {
        child.kill('SIGTERM')
      }
    }
  }

  const trackChild = (child: NodeChildProcess, command: unknown) => {
    if (typeof command !== 'string' || !SENTRY_CLI_PROCESS_PATTERN.test(command)) {
      return child
    }

    trackedChildren.add(child)

    const cleanup = () => {
      trackedChildren.delete(child)
    }

    child.once('exit', cleanup)
    child.once('error', cleanup)

    return child
  }

  const patchedSpawn = function patchedSpawn(
    this: unknown,
    command: string,
    args?: readonly string[],
    options?: Parameters<ChildProcessModule['spawn']>[2]
  ) {
    const child = Reflect.apply(
      originalSpawn,
      this,
      options === undefined ? [command, args ?? []] : [command, args ?? [], options]
    ) as NodeChildProcess

    return trackChild(child, command)
  } as ChildProcessModule['spawn']

  const patchedExecFile = function patchedExecFile(this: unknown, ...args: unknown[]) {
    const command = args[0]

    if (typeof command === 'string' && SENTRY_CLI_PROCESS_PATTERN.test(command)) {
      const callbackIndex = args.findIndex(arg => typeof arg === 'function')
      const optionIndex = callbackIndex === -1 ? 2 : callbackIndex - 1
      const maybeOptions = args[optionIndex]

      if (maybeOptions && typeof maybeOptions === 'object' && !Array.isArray(maybeOptions)) {
        args[optionIndex] = {
          ...maybeOptions,
          killSignal: 'SIGTERM',
          timeout: timeoutMs
        }
      } else if (callbackIndex === -1) {
        args.push({ killSignal: 'SIGTERM', timeout: timeoutMs })
      } else {
        args.splice(callbackIndex, 0, { killSignal: 'SIGTERM', timeout: timeoutMs })
      }
    }

    return originalExecFile.apply(this, args as Parameters<ChildProcessModule['execFile']>)
  } as ChildProcessModule['execFile']

  childProcess.spawn = patchedSpawn
  childProcess.execFile = patchedExecFile

  let timeout: NodeJS.Timeout | undefined

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        timedOut = true
        killTrackedChildren()
        reject(new Error(`Sentry source-map upload exceeded ${timeoutMs}ms`))
      }, timeoutMs)

      timeout.unref?.()
    })

    await Promise.race([Promise.resolve().then(runUpload), timeoutPromise])

    return { status: 'completed' }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)

    logger.warn(`[sentry-build] Source-map upload degraded: ${reason}. Continuing deployment.`)

    return { status: 'degraded', reason, timedOut }
  } finally {
    if (timeout) {
      clearTimeout(timeout)
    }

    if (timedOut) {
      killTrackedChildren()
    }

    childProcess.spawn = originalSpawn
    childProcess.execFile = originalExecFile
  }
}
