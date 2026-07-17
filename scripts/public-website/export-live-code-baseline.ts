#!/usr/bin/env tsx
/**
 * TASK-1122 — Export a read-only baseline of governed public-site WordPress code.
 *
 * The script downloads only runtime code that Greenhouse should eventually
 * govern through GitOps. It does not mutate Kinsta or WordPress.
 *
 * Usage:
 *   pnpm public-website:export-live-code
 *   pnpm public-website:export-live-code -- --output tmp/public-site-code-baselines/manual
 */

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

import { loadPublicWebsiteEnvFiles } from './local-env'

type CliOptions = {
  output: string
  help: boolean
}

type Target = {
  label: string
  remotePath: string
  required: boolean
  kind?: 'directory' | 'file'
}

type ManifestFile = {
  path: string
  bytes: number
  sha256: string
}

const TARGETS: Target[] = [
  {
    label: 'ohio-child theme',
    remotePath: 'wp-content/themes/ohio-child',
    required: true
  },
  {
    label: 'EO headless content plugin',
    remotePath: 'wp-content/plugins/eo-headless-content',
    required: false
  },
  {
    label: 'EO vibe coding API plugin',
    remotePath: 'wp-content/plugins/eo-vibe-coding-api',
    required: false
  },
  {
    label: 'Greenhouse WP bridge plugin',
    remotePath: 'wp-content/plugins/greenhouse-wp-bridge',
    required: false
  },
  {
    label: 'EO Elementor widgets plugin',
    remotePath: 'wp-content/plugins/eo-elementor-widgets',
    required: false
  },
  {
    label: 'EO Ohio Elementor widgets plugin',
    remotePath: 'wp-content/plugins/eo-ohio-elementor-widgets',
    required: false
  },
  {
    label: 'EO Ohio Gutenberg blocks plugin',
    remotePath: 'wp-content/plugins/eo-ohio-gutenberg-blocks',
    required: false
  },
  {
    label: 'Ohio HubSpot form styler plugin',
    remotePath: 'wp-content/plugins/ohio-hubspot-form-styler',
    required: false
  },
  {
    label: 'Efeonce admin memory guard mu-plugin',
    remotePath: 'wp-content/mu-plugins/efeonce-admin-memory-guard.php',
    required: false,
    kind: 'file'
  }
]

const EXCLUDE_PATTERNS = [
  '.git/',
  '.DS_Store',
  'node_modules/',
  'vendor/',
  '*.log',
  '*.bak',
  '*.bak-*',
  '*~'
]

const loadedEnvFiles = loadPublicWebsiteEnvFiles()

const parseArgs = (argv: string[]): CliOptions => {
  const normalizedArgv = argv[0] === '--' ? argv.slice(1) : argv
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

  const options: CliOptions = {
    output: `tmp/public-site-code-baselines/${timestamp}`,
    help: false
  }

  for (let i = 0; i < normalizedArgv.length; i += 1) {
    const arg = normalizedArgv[i]

    if (arg === '--help' || arg === '-h') {
      options.help = true
      continue
    }

    if (arg === '--output') {
      options.output = normalizedArgv[i + 1] ?? options.output
      i += 1
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return options
}

const printHelp = () => {
  console.log(`Usage:
  pnpm public-website:export-live-code
  pnpm public-website:export-live-code -- --output tmp/public-site-code-baselines/manual

Required env:
  PUBLIC_WEBSITE_KINSTA_SSH_HOST
  PUBLIC_WEBSITE_KINSTA_SSH_PORT
  PUBLIC_WEBSITE_KINSTA_SSH_USER
  PUBLIC_WEBSITE_KINSTA_SSH_KEY_PATH
  PUBLIC_WEBSITE_KINSTA_WORDPRESS_PATH

Loaded env files: ${loadedEnvFiles.length ? loadedEnvFiles.join(', ') : '(none)'}`)
}

const requireEnv = (name: string) => {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`${name} is required. Configure it in .env.local or the shell.`)
  }

  return value
}

const shellQuote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`

const listFiles = (root: string, current = root): ManifestFile[] => {
  const entries = readdirSync(current, { withFileTypes: true })
  const files: ManifestFile[] = []

  for (const entry of entries) {
    const absolutePath = join(current, entry.name)

    if (entry.isDirectory()) {
      files.push(...listFiles(root, absolutePath))
      continue
    }

    if (!entry.isFile()) continue

    const contents = readFileSync(absolutePath)
    const stats = statSync(absolutePath)

    files.push({
      path: relative(root, absolutePath),
      bytes: stats.size,
      sha256: createHash('sha256').update(contents).digest('hex')
    })
  }

  return files.sort((a, b) => a.path.localeCompare(b.path))
}

const main = () => {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printHelp()

    return
  }

  const host = requireEnv('PUBLIC_WEBSITE_KINSTA_SSH_HOST')
  const port = requireEnv('PUBLIC_WEBSITE_KINSTA_SSH_PORT')
  const user = requireEnv('PUBLIC_WEBSITE_KINSTA_SSH_USER')
  const keyPath = requireEnv('PUBLIC_WEBSITE_KINSTA_SSH_KEY_PATH')
  const wordpressPath = requireEnv('PUBLIC_WEBSITE_KINSTA_WORDPRESS_PATH')
  const sshTarget = `${user}@${host}`
  const outputRoot = resolve(process.cwd(), options.output)
  const codeRoot = join(outputRoot, 'code')

  mkdirSync(codeRoot, { recursive: true })

  const sshArgs = [
    '-i',
    keyPath,
    '-o',
    'BatchMode=yes',
    '-o',
    'IdentitiesOnly=yes',
    '-p',
    port
  ]

  const rsyncShell = [
    'ssh',
    '-i',
    shellQuote(keyPath),
    '-o',
    'BatchMode=yes',
    '-o',
    'IdentitiesOnly=yes',
    '-p',
    shellQuote(port)
  ].join(' ')

  const foundTargets: Target[] = []
  const missingTargets: Target[] = []

  for (const target of TARGETS) {
    const targetKind = target.kind ?? 'directory'
    const testOperator = targetKind === 'file' ? '-f' : '-d'
    const testCommand = `test ${testOperator} ${shellQuote(join(wordpressPath, target.remotePath))}`

    try {
      execFileSync('ssh', [...sshArgs, sshTarget, testCommand], { stdio: 'ignore' })
      foundTargets.push(target)
    } catch {
      missingTargets.push(target)

      if (target.required) {
        throw new Error(`Required ${targetKind} target is missing on Kinsta: ${target.remotePath}`)
      }
    }
  }

  for (const target of foundTargets) {
    const targetKind = target.kind ?? 'directory'
    const localTarget = join(codeRoot, target.remotePath)

    mkdirSync(dirname(localTarget), { recursive: true })

    const remoteSource =
      targetKind === 'file'
        ? `${sshTarget}:${join(wordpressPath, target.remotePath)}`
        : `${sshTarget}:${join(wordpressPath, target.remotePath)}/`

    const localDestination = targetKind === 'file' ? localTarget : `${localTarget}/`

    const rsyncArgs = [
      '-az',
      ...(targetKind === 'directory' ? ['--delete'] : []),
      ...EXCLUDE_PATTERNS.flatMap(pattern => ['--exclude', pattern]),
      '-e',
      rsyncShell,
      remoteSource,
      localDestination
    ]

    execFileSync('rsync', rsyncArgs, { stdio: 'inherit' })
  }

  const files = existsSync(codeRoot) ? listFiles(codeRoot) : []

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: {
      site: 'https://efeoncepro.com',
      wordpressPath,
      host,
      user
    },
    outputRoot,
    targets: {
      found: foundTargets.map(target => ({
        label: target.label,
        remotePath: target.remotePath,
        kind: target.kind ?? 'directory'
      })),
      missing: missingTargets.map(target => ({
        label: target.label,
        remotePath: target.remotePath,
        kind: target.kind ?? 'directory'
      }))
    },
    excludes: EXCLUDE_PATTERNS,
    files
  }

  writeFileSync(join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)

  console.log(`Exported ${files.length} files to ${outputRoot}`)
  console.log(`Manifest: ${join(outputRoot, 'manifest.json')}`)
}

try {
  main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)

  console.error(`public-website:export-live-code failed: ${message}`)
  process.exit(1)
}
