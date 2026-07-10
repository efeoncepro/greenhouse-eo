#!/usr/bin/env node
import os from 'node:os'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const LOW_MEMORY_THRESHOLD_BYTES = 20 * 1024 ** 3
export const BUILD_MEMORY_ERRORS = {
  forbiddenRuntime: 'local_build_profile_forbidden',
  invalidMemory: 'local_build_memory_invalid',
  invalidProfile: 'local_build_profile_invalid'
}

const enabled = value => ['1', 'true', 'yes', 'on'].includes((value || '').trim().toLowerCase())

export const resolveBuildMemoryProfile = ({
  totalMemoryBytes,
  profileOverride,
  isCi = false,
  isVercel = false
}) => {
  if (isCi || isVercel) throw new Error(BUILD_MEMORY_ERRORS.forbiddenRuntime)
  if (!Number.isFinite(totalMemoryBytes) || totalMemoryBytes <= 0)
    throw new Error(BUILD_MEMORY_ERRORS.invalidMemory)

  const override = profileOverride?.trim().toLowerCase()

  if (!override || !['low', 'balanced'].includes(override))
    throw new Error(BUILD_MEMORY_ERRORS.invalidProfile)

  const memoryBucket = totalMemoryBytes <= LOW_MEMORY_THRESHOLD_BYTES ? 'constrained' : 'roomy'

  return {
    profile: override,
    cpus: override === 'low' ? 1 : 2,
    memoryBucket,
    source: 'explicit'
  }
}

export const formatBuildMemoryProfile = resolution =>
  `[build:memory-profile] profile=${resolution.profile} cpus=${resolution.cpus} memory=${resolution.memoryBucket} source=${resolution.source}`

export const profileOverrideFromArgs = args => {
  const argument = args.find(item => item.startsWith('--profile='))

  return argument ? argument.slice('--profile='.length) : undefined
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]

if (isMain) {
  try {
    const resolution = resolveBuildMemoryProfile({
      totalMemoryBytes: os.totalmem(),
      profileOverride: profileOverrideFromArgs(process.argv.slice(2)),
      isCi: enabled(process.env.CI),
      isVercel: enabled(process.env.VERCEL)
    })

    console.log(formatBuildMemoryProfile(resolution))

    const child = spawn(process.execPath, ['scripts/run-next-build.mjs'], {
      cwd: process.cwd(),
      env: { ...process.env, NEXT_BUILD_CPUS: String(resolution.cpus) },
      stdio: 'inherit'
    })

    child.on('error', () => {
      console.error('local_build_spawn_failed')
      process.exitCode = 1
    })
    child.on('close', code => {
      process.exitCode = code ?? 1
    })
  } catch (error) {
    console.error(error instanceof Error ? error.message : BUILD_MEMORY_ERRORS.invalidProfile)
    process.exitCode = 2
  }
}
