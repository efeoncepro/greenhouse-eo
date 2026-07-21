#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import YAML from 'yaml'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

export const WORKER_BUILD_UNITS = [
  {
    name: 'ops-worker',
    dockerfile: 'services/ops-worker/Dockerfile',
    workflow: '.github/workflows/ops-worker-deploy.yml'
  },
  {
    name: 'commercial-cost-worker',
    dockerfile: 'services/commercial-cost-worker/Dockerfile',
    workflow: '.github/workflows/commercial-cost-worker-deploy.yml'
  },
  {
    name: 'ico-batch-worker',
    dockerfile: 'services/ico-batch/Dockerfile',
    workflow: '.github/workflows/ico-batch-deploy.yml'
  },
  {
    name: 'artifact-worker',
    dockerfile: 'services/artifact-worker/Dockerfile',
    workflow: '.github/workflows/artifact-worker-deploy.yml'
  }
]

const REQUIRED_BUILD_TRIGGER_PATHS = ['package.json', 'pnpm-lock.yaml', '.dockerignore', '.gcloudignore', 'vendor/**']

const readText = (root, path) => readFileSync(resolve(root, path), 'utf8')

export const parsePnpmVersion = packageManager => {
  const match = /^pnpm@(\d+\.\d+\.\d+)$/.exec(packageManager ?? '')

  if (!match)
    throw new Error(`packageManager debe fijar una versión exacta de pnpm; recibido: ${packageManager ?? 'missing'}`)

  return match[1]
}

export const collectLocalFileDependencies = pkg => {
  const sections = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']
  const localDependencies = []

  for (const section of sections) {
    for (const [name, specifier] of Object.entries(pkg[section] ?? {})) {
      if (typeof specifier === 'string' && specifier.startsWith('file:')) {
        localDependencies.push({ name, section, specifier, path: specifier.slice('file:'.length) })
      }
    }
  }

  return localDependencies
}

export const splitDockerStages = dockerfile =>
  dockerfile.split(/(?=^FROM\s+)/gim).filter(stage => /^FROM\s+/im.test(stage))

export const validateDockerfile = ({ source, pnpmVersion, localDependencies }) => {
  const errors = []
  const stages = splitDockerStages(source)
  const localDependencyRoots = [...new Set(localDependencies.map(item => item.path.split('/')[0]).filter(Boolean))]

  for (const [index, stage] of stages.entries()) {
    const installsDependencies = /RUN\s+pnpm\s+install\b/i.test(stage)

    if (!installsDependencies) continue

    const versionMatches = [...stage.matchAll(/^ARG\s+PNPM_VERSION=([^\s]+)$/gim)].map(match => match[1])

    if (!versionMatches.includes(pnpmVersion)) {
      errors.push(`stage ${index + 1}: PNPM_VERSION debe espejar packageManager (${pnpmVersion})`)
    }

    for (const root of localDependencyRoots) {
      const copyPattern = new RegExp(
        `^COPY\\s+${root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\/\\s+\\.\\/${root}\\/$`,
        'im'
      )

      const installOffset = stage.search(/RUN\s+pnpm\s+install\b/i)
      const copyMatch = copyPattern.exec(stage)

      if (!copyMatch || copyMatch.index > installOffset) {
        errors.push(`stage ${index + 1}: COPY ${root}/ ./${root}/ debe ocurrir antes de pnpm install`)
      }
    }
  }

  if (!stages.some(stage => /RUN\s+pnpm\s+install\b/i.test(stage))) {
    errors.push('no se encontró ninguna etapa con pnpm install')
  }

  return errors
}

const isGitTracked = (root, path) => {
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', '--', path], { cwd: root, stdio: 'ignore' })

    return true
  } catch {
    return false
  }
}

const validateLocalDependency = ({ root, dependency, lockfile }) => {
  const errors = []
  const absolutePath = resolve(root, dependency.path)

  if (!existsSync(absolutePath)) {
    return [`${dependency.name}: no existe ${dependency.path}`]
  }

  if (!isGitTracked(root, dependency.path)) {
    errors.push(`${dependency.name}: ${dependency.path} no está versionado en Git`)
  }

  const lockEntry = Object.entries(lockfile.packages ?? {}).find(([key]) =>
    key.includes(`@file:${dependency.path}`)
  )?.[1]

  const integrity = lockEntry?.resolution?.integrity

  if (!integrity) {
    errors.push(`${dependency.name}: pnpm-lock.yaml no contiene integrity para ${dependency.path}`)
  } else {
    const actualIntegrity = `sha512-${createHash('sha512').update(readFileSync(absolutePath)).digest('base64')}`

    if (actualIntegrity !== integrity) {
      errors.push(`${dependency.name}: checksum SHA-512 no coincide con pnpm-lock.yaml`)
    }
  }

  return errors
}

const workflowSteps = workflow => Object.values(workflow.jobs ?? {}).flatMap(job => job?.steps ?? [])

export const validateWorkflowToolchain = ({ path, workflow, pnpmVersion }) => {
  const errors = []

  for (const step of workflowSteps(workflow)) {
    if (typeof step?.uses !== 'string' || !step.uses.startsWith('pnpm/action-setup@')) continue

    if (step.uses !== 'pnpm/action-setup@v6') {
      errors.push(`${path}: debe usar pnpm/action-setup@v6`)
    }

    if (step.with?.version !== undefined) {
      errors.push(`${path}: no debe duplicar pnpm ${pnpmVersion}; heredar packageManager`)
    }
  }

  return errors
}

const validateAgentContextToolchain = ({ workflow, pnpmVersion }) => {
  const errors = []
  const steps = workflowSteps(workflow)
  const checkout = steps.find(step => String(step?.uses ?? '').startsWith('actions/checkout@'))
  const setupPnpm = steps.find(step => String(step?.uses ?? '').startsWith('pnpm/action-setup@'))
  const setupNode = steps.find(step => String(step?.uses ?? '').startsWith('actions/setup-node@'))

  if (checkout?.uses !== 'actions/checkout@v5') errors.push('agent-context-governance: checkout debe usar v5')
  if (setupPnpm?.uses !== 'pnpm/action-setup@v6') errors.push('agent-context-governance: pnpm setup debe usar v6')
  if (setupPnpm?.with?.version !== undefined) errors.push(`agent-context-governance: pnpm debe heredar ${pnpmVersion}`)
  if (setupNode?.uses !== 'actions/setup-node@v5') errors.push('agent-context-governance: setup-node debe usar v5')
  if (String(setupNode?.with?.['node-version']) !== '24') errors.push('agent-context-governance: Node debe ser 24')

  return errors
}

export const validateWorkerWorkflowPaths = ({ path, workflow }) => {
  const paths = workflow?.on?.push?.paths ?? []

  if (!Array.isArray(paths)) return [`${path}: on.push.paths debe ser una lista explícita`]

  return REQUIRED_BUILD_TRIGGER_PATHS.filter(requiredPath => !paths.includes(requiredPath)).map(
    requiredPath => `${path}: falta trigger ${requiredPath}`
  )
}

const validateIgnoreContract = ({ root, path }) => {
  const source = readText(root, path)

  return source.includes('!vendor/efeonce-globe/**')
    ? []
    : [`${path}: debe incluir explícitamente !vendor/efeonce-globe/**`]
}

export const runWorkerBuildContractGate = (root = repoRoot) => {
  const errors = []
  const pkg = JSON.parse(readText(root, 'package.json'))
  const lockfile = YAML.parse(readText(root, 'pnpm-lock.yaml'))
  const pnpmVersion = parsePnpmVersion(pkg.packageManager)
  const localDependencies = collectLocalFileDependencies(pkg)

  if (localDependencies.length === 0) {
    console.log('• No hay dependencias file: locales; se mantienen los demás contratos de build.')
  }

  for (const dependency of localDependencies) {
    errors.push(...validateLocalDependency({ root, dependency, lockfile }))
  }

  for (const unit of WORKER_BUILD_UNITS) {
    errors.push(
      ...validateDockerfile({
        source: readText(root, unit.dockerfile),
        pnpmVersion,
        localDependencies
      }).map(error => `${unit.dockerfile}: ${error}`)
    )

    const workflow = YAML.parse(readText(root, unit.workflow))

    errors.push(...validateWorkerWorkflowPaths({ path: unit.workflow, workflow }))
  }

  for (const path of ['.dockerignore', '.gcloudignore']) {
    errors.push(...validateIgnoreContract({ root, path }))
  }

  const workflowPaths = execFileSync('git', ['ls-files', '.github/workflows/*.yml', '.github/workflows/*.yaml'], {
    cwd: root,
    encoding: 'utf8'
  })
    .trim()
    .split('\n')
    .filter(Boolean)

  for (const path of workflowPaths) {
    errors.push(
      ...validateWorkflowToolchain({
        path,
        workflow: YAML.parse(readText(root, path)),
        pnpmVersion
      })
    )
  }

  errors.push(
    ...validateAgentContextToolchain({
      workflow: YAML.parse(readText(root, '.github/workflows/agent-context-governance.yml')),
      pnpmVersion
    })
  )

  if (errors.length > 0) {
    console.error(`\nFALLÓ worker-build-contract (${errors.length} findings):`)

    for (const error of errors) console.error(`  - ${error}`)

    return 1
  }

  console.log(`✓ pnpm ${pnpmVersion}: packageManager es el SoT de GitHub Actions`)
  console.log(
    `✓ ${localDependencies.length} dependencia(s) file: existen, están versionadas y coinciden con el lockfile`
  )
  console.log(`✓ ${WORKER_BUILD_UNITS.length} build units copian todos los inputs locales antes de instalar`)
  console.log('✓ Docker/Cloud Build contexts y triggers incluyen los inputs compartidos')

  return 0
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) process.exit(runWorkerBuildContractGate())
