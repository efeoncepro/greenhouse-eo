import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

import {
  collectLocalFileDependencies,
  parsePnpmVersion,
  validateDockerfile,
  validateWorkflowToolchain,
  validateWorkerWorkflowPaths
} from '../worker-build-contract-gate.mjs'

test('collectLocalFileDependencies descubre file: en cualquier sección', () => {
  assert.deepEqual(
    collectLocalFileDependencies({
      dependencies: { '@scope/a': 'file:vendor/a.tgz', public: '1.0.0' },
      devDependencies: { '@scope/b': 'file:vendor/b.tgz' }
    }),
    [
      { name: '@scope/a', section: 'dependencies', specifier: 'file:vendor/a.tgz', path: 'vendor/a.tgz' },
      { name: '@scope/b', section: 'devDependencies', specifier: 'file:vendor/b.tgz', path: 'vendor/b.tgz' }
    ]
  )
})

test('parsePnpmVersion exige un pin exacto', () => {
  assert.equal(parsePnpmVersion('pnpm@10.32.1'), '10.32.1')
  assert.throws(() => parsePnpmVersion('pnpm@10'), /versión exacta/)
})

test('validateDockerfile bloquea install antes del input local', () => {
  const findings = validateDockerfile({
    source: `FROM node:22\nARG PNPM_VERSION=10.32.1\nRUN pnpm install --frozen-lockfile\nCOPY vendor/ ./vendor/`,
    pnpmVersion: '10.32.1',
    localDependencies: [{ path: 'vendor/package.tgz' }]
  })

  assert.match(findings.join('\n'), /debe ocurrir antes/)
})

test('validateDockerfile acepta cada etapa determinística', () => {
  const findings = validateDockerfile({
    source: `FROM node:22 AS builder\nARG PNPM_VERSION=10.32.1\nCOPY vendor/ ./vendor/\nRUN pnpm install\nFROM node:22\nARG PNPM_VERSION=10.32.1\nCOPY vendor/ ./vendor/\nRUN pnpm install --prod`,
    pnpmVersion: '10.32.1',
    localDependencies: [{ path: 'vendor/package.tgz' }]
  })

  assert.deepEqual(findings, [])
})

test('validateDockerfile acepta pnpm install con secreto BuildKit', () => {
  const findings = validateDockerfile({
    source: `# syntax=docker/dockerfile:1.7
FROM node:22 AS builder
ARG PNPM_VERSION=10.32.1
COPY vendor/ ./vendor/
RUN --mount=type=secret,id=axis_npmrc,target=/root/.npmrc,required=true \\
  pnpm install --frozen-lockfile
FROM node:22
ARG PNPM_VERSION=10.32.1
COPY vendor/ ./vendor/
RUN --mount=type=secret,id=axis_npmrc,target=/root/.npmrc,required=true pnpm install --prod`,
    pnpmVersion: '10.32.1',
    localDependencies: [{ path: 'vendor/package.tgz' }],
    requiresPrivatePackageAuth: true
  })

  assert.deepEqual(findings, [])
})

test('validateDockerfile bloquea private package install sin secreto BuildKit', () => {
  const findings = validateDockerfile({
    source: `FROM node:22
ARG PNPM_VERSION=10.32.1
COPY vendor/ ./vendor/
RUN pnpm install --frozen-lockfile`,
    pnpmVersion: '10.32.1',
    localDependencies: [{ path: 'vendor/package.tgz' }],
    requiresPrivatePackageAuth: true
  })

  assert.match(findings.join('\n'), /debe montar el secreto BuildKit axis_npmrc/)
})

test('deploy scripts preservan el escape de Cloud Build para el token AXIS', () => {
  const deployScripts = [
    'services/ops-worker/deploy.sh',
    'services/commercial-cost-worker/deploy.sh',
    'services/ico-batch/deploy.sh',
    'services/artifact-worker/deploy.sh'
  ]

  for (const scriptPath of deployScripts) {
    const source = readFileSync(resolve(process.cwd(), scriptPath), 'utf8')

    assert.ok(
      source.includes('\\$\\${AXIS_PACKAGES_READ_TOKEN}'),
      `${scriptPath} debe emitir $${'{'}AXIS_PACKAGES_READ_TOKEN} al config de Cloud Build`
    )
    assert.ok(
      !source.includes('_authToken=$${AXIS_PACKAGES_READ_TOKEN}'),
      `${scriptPath} no debe expandir $$ como PID del shell que genera el config`
    )
  }
})

test('los contextos de build excluyen el npmrc efímero', () => {
  for (const ignorePath of ['.dockerignore', '.gcloudignore']) {
    const rules = readFileSync(resolve(process.cwd(), ignorePath), 'utf8')
      .split('\n')
      .map(line => line.trim())

    assert.ok(rules.includes('.npmrc'), `${ignorePath} debe excluir .npmrc`)
  }
})

test('workflow toolchain hereda packageManager y bloquea versiones duplicadas', () => {
  const valid = { jobs: { test: { steps: [{ uses: 'pnpm/action-setup@v6' }] } } }
  const invalid = { jobs: { test: { steps: [{ uses: 'pnpm/action-setup@v4', with: { version: '10.9.0' } }] } } }

  assert.deepEqual(validateWorkflowToolchain({ path: 'valid.yml', workflow: valid, pnpmVersion: '10.32.1' }), [])
  assert.equal(validateWorkflowToolchain({ path: 'invalid.yml', workflow: invalid, pnpmVersion: '10.32.1' }).length, 2)
})

test('worker workflow exige todos los inputs compartidos', () => {
  const workflow = { on: { push: { paths: ['package.json'] } } }
  const findings = validateWorkerWorkflowPaths({ path: 'worker.yml', workflow })

  assert.match(findings.join('\n'), /pnpm-lock\.yaml/)
  assert.match(findings.join('\n'), /vendor\/\*\*/)
})
