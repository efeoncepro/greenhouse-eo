import assert from 'node:assert/strict'
import test from 'node:test'

import {
  BUILD_MEMORY_ERRORS,
  LOW_MEMORY_THRESHOLD_BYTES,
  formatBuildMemoryProfile,
  profileOverrideFromArgs,
  resolveBuildMemoryProfile
} from './build-memory-profile.mjs'

test('explicit low profile uses one CPU on a constrained host', () => {
  assert.deepEqual(resolveBuildMemoryProfile({ totalMemoryBytes: 16 * 1024 ** 3, profileOverride: 'low' }), {
    profile: 'low',
    cpus: 1,
    memoryBucket: 'constrained',
    source: 'explicit'
  })
  assert.equal(
    resolveBuildMemoryProfile({ totalMemoryBytes: LOW_MEMORY_THRESHOLD_BYTES, profileOverride: 'low' }).profile,
    'low'
  )
})

test('explicit balanced profile uses two CPUs above the memory bucket threshold', () => {
  assert.deepEqual(resolveBuildMemoryProfile({ totalMemoryBytes: 32 * 1024 ** 3, profileOverride: 'balanced' }), {
    profile: 'balanced',
    cpus: 2,
    memoryBucket: 'roomy',
    source: 'explicit'
  })
})

test('explicit low and balanced overrides win without changing the memory bucket', () => {
  assert.deepEqual(resolveBuildMemoryProfile({ totalMemoryBytes: 64 * 1024 ** 3, profileOverride: 'low' }), {
    profile: 'low',
    cpus: 1,
    memoryBucket: 'roomy',
    source: 'explicit'
  })
  assert.equal(
    resolveBuildMemoryProfile({ totalMemoryBytes: 8 * 1024 ** 3, profileOverride: 'balanced' }).cpus,
    2
  )
})

test('resolver fails closed in CI and Vercel', () => {
  assert.throws(
    () => resolveBuildMemoryProfile({ totalMemoryBytes: 16 * 1024 ** 3, isCi: true }),
    new RegExp(BUILD_MEMORY_ERRORS.forbiddenRuntime)
  )
  assert.throws(
    () => resolveBuildMemoryProfile({ totalMemoryBytes: 16 * 1024 ** 3, isVercel: true }),
    new RegExp(BUILD_MEMORY_ERRORS.forbiddenRuntime)
  )
})

test('resolver rejects invalid profiles and memory values with canonical errors', () => {
  assert.throws(
    () => resolveBuildMemoryProfile({ totalMemoryBytes: 16 * 1024 ** 3, profileOverride: 'turbo' }),
    new RegExp(BUILD_MEMORY_ERRORS.invalidProfile)
  )
  assert.throws(
    () => resolveBuildMemoryProfile({ totalMemoryBytes: 0, profileOverride: 'low' }),
    new RegExp(BUILD_MEMORY_ERRORS.invalidMemory)
  )
  assert.throws(
    () => resolveBuildMemoryProfile({ totalMemoryBytes: 16 * 1024 ** 3 }),
    new RegExp(BUILD_MEMORY_ERRORS.invalidProfile)
  )
})

test('CLI helpers expose bounded output without exact memory or environment values', () => {
  assert.equal(profileOverrideFromArgs(['--profile=low']), 'low')
  assert.equal(profileOverrideFromArgs([]), undefined)
  assert.equal(
    formatBuildMemoryProfile({ profile: 'low', cpus: 1, memoryBucket: 'constrained', source: 'explicit' }),
    '[build:memory-profile] profile=low cpus=1 memory=constrained source=explicit'
  )
})
