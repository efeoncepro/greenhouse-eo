#!/usr/bin/env tsx
/**
 * Run a local PHP file through remote Kinsta WP-CLI for efeoncepro.com.
 *
 * This avoids fragile inline shell/PHP quoting. The script loads the stable
 * public-site local env profile before Vercel-managed env files, uploads the PHP
 * file to `/tmp`, executes `wp eval-file`, and removes the remote temporary file.
 *
 * Usage:
 *   pnpm public-website:wpcli -- --eval-file ./tmp/read-only.php
 *   pnpm public-website:wpcli -- --eval-file ./tmp/patch.php --wp-user 12
 */

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { basename, resolve } from 'node:path'

import {
  buildKinstaScpArgs,
  buildKinstaSshArgs,
  formatKinstaSshReadinessError,
  inspectKinstaSshReadiness
} from './kinsta-ssh-config'
import { loadPublicWebsiteEnvFiles } from './local-env'

const loadedEnvFiles = loadPublicWebsiteEnvFiles()

type CliOptions = {
  evalFile: string | null
  wpUser: string
  keepRemoteFile: boolean
  help: boolean
}

const parseArgs = (argv: string[]): CliOptions => {
  const normalizedArgv = argv[0] === '--' ? argv.slice(1) : argv

  const options: CliOptions = {
    evalFile: null,
    wpUser: process.env.PUBLIC_WEBSITE_WORDPRESS_WPCLI_USER?.trim() || '12',
    keepRemoteFile: false,
    help: false
  }

  for (let i = 0; i < normalizedArgv.length; i += 1) {
    const arg = normalizedArgv[i]

    if (arg === '--help' || arg === '-h') {
      options.help = true
      continue
    }

    if (arg === '--eval-file') {
      options.evalFile = normalizedArgv[i + 1] ?? null
      i += 1
      continue
    }

    if (arg === '--wp-user') {
      options.wpUser = normalizedArgv[i + 1] ?? options.wpUser
      i += 1
      continue
    }

    if (arg === '--keep-remote-file') {
      options.keepRemoteFile = true
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return options
}

const printHelp = () => {
  console.log(`Usage:
  pnpm public-website:wpcli -- --eval-file ./tmp/read-only.php
  pnpm public-website:wpcli -- --eval-file ./tmp/patch.php --wp-user 12

Required env:
  PUBLIC_WEBSITE_KINSTA_SSH_HOST
  PUBLIC_WEBSITE_KINSTA_SSH_PORT
  PUBLIC_WEBSITE_KINSTA_SSH_USER
  PUBLIC_WEBSITE_KINSTA_SSH_KEY_PATH
  PUBLIC_WEBSITE_KINSTA_WORDPRESS_PATH

Loaded env files: ${loadedEnvFiles.length ? loadedEnvFiles.join(', ') : '(none)'}

Run pnpm public-website:ssh-check before remote operations.`)
}

const shellQuote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`

const main = () => {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printHelp()

    return
  }

  if (!options.evalFile) {
    throw new Error('--eval-file is required')
  }

  const evalFilePath = resolve(process.cwd(), options.evalFile)

  if (!existsSync(evalFilePath)) {
    throw new Error(`Eval file does not exist: ${evalFilePath}`)
  }

  const readiness = inspectKinstaSshReadiness()

  if (!readiness.ready || !readiness.config) {
    throw new Error(formatKinstaSshReadinessError(readiness))
  }

  const { host, user, wordpressPath } = readiness.config
  const remoteHash = createHash('sha256').update(evalFilePath).update(String(Date.now())).digest('hex').slice(0, 12)
  const remoteFileName = basename(evalFilePath).replace(/[^A-Za-z0-9_.-]/g, '-')
  const remotePath = `/tmp/greenhouse-wpcli-${remoteHash}-${remoteFileName}`
  const sshTarget = `${user}@${host}`

  const sshBaseArgs = buildKinstaSshArgs(readiness.config)
  const scpBaseArgs = buildKinstaScpArgs(readiness.config)

  execFileSync('scp', [...scpBaseArgs, evalFilePath, `${sshTarget}:${remotePath}`], { stdio: 'inherit' })

  const wpCommand = [
    `cd ${shellQuote(wordpressPath)}`,
    `wp --user=${shellQuote(options.wpUser)} eval-file ${shellQuote(remotePath)}`
  ].join(' && ')

  const cleanupCommand = options.keepRemoteFile ? '' : `; rm -f ${shellQuote(remotePath)}`

  try {
    execFileSync('ssh', [...sshBaseArgs, sshTarget, `${wpCommand}${cleanupCommand}`], { stdio: 'inherit' })
  } catch (error) {
    if (!options.keepRemoteFile) {
      try {
        execFileSync('ssh', [...sshBaseArgs, sshTarget, `rm -f ${shellQuote(remotePath)}`], { stdio: 'ignore' })
      } catch {
        // Best-effort cleanup only.
      }
    }

    throw error
  }
}

try {
  main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)

  console.error(`public-website:wpcli failed: ${message}`)
  process.exit(1)
}
