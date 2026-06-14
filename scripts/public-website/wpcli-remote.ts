#!/usr/bin/env tsx
/**
 * Run a local PHP file through remote Kinsta WP-CLI for efeoncepro.com.
 *
 * This avoids fragile inline shell/PHP quoting. The script loads `.env.local`
 * and `.env`, uploads the PHP file to `/tmp`, executes `wp eval-file`, and
 * removes the remote temporary file.
 *
 * Usage:
 *   pnpm public-website:wpcli -- --eval-file ./tmp/read-only.php
 *   pnpm public-website:wpcli -- --eval-file ./tmp/patch.php --wp-user 12
 */

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'

const loadEnvFile = (relativePath: string) => {
  try {
    const contents = readFileSync(resolve(process.cwd(), relativePath), 'utf8')

    for (const rawLine of contents.split('\n')) {
      const line = rawLine.trim()

      if (!line || line.startsWith('#')) continue

      const normalizedLine = line.startsWith('export ') ? line.slice('export '.length).trim() : line
      const eq = normalizedLine.indexOf('=')

      if (eq <= 0) continue

      const key = normalizedLine.slice(0, eq).trim()

      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || process.env[key] !== undefined) continue

      let value = normalizedLine.slice(eq + 1).trim()

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }

      process.env[key] = value
    }

    return true
  } catch {
    return false
  }
}

const loadedEnvFiles = ['.env.local', '.env'].filter(loadEnvFile)

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

Loaded env files: ${loadedEnvFiles.length ? loadedEnvFiles.join(', ') : '(none)'}`)
}

const shellQuote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`

const requireEnv = (name: string) => {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`${name} is required. Configure it in .env.local or the shell.`)
  }

  return value
}

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

  const host = requireEnv('PUBLIC_WEBSITE_KINSTA_SSH_HOST')
  const port = requireEnv('PUBLIC_WEBSITE_KINSTA_SSH_PORT')
  const user = requireEnv('PUBLIC_WEBSITE_KINSTA_SSH_USER')
  const keyPath = requireEnv('PUBLIC_WEBSITE_KINSTA_SSH_KEY_PATH')
  const wordpressPath = requireEnv('PUBLIC_WEBSITE_KINSTA_WORDPRESS_PATH')
  const remoteHash = createHash('sha256').update(evalFilePath).update(String(Date.now())).digest('hex').slice(0, 12)
  const remoteFileName = basename(evalFilePath).replace(/[^A-Za-z0-9_.-]/g, '-')
  const remotePath = `/tmp/greenhouse-wpcli-${remoteHash}-${remoteFileName}`
  const sshTarget = `${user}@${host}`

  const sshBaseArgs = [
    '-i',
    keyPath,
    '-o',
    'BatchMode=yes',
    '-o',
    'IdentitiesOnly=yes',
    '-p',
    port
  ]

  const scpBaseArgs = [
    '-i',
    keyPath,
    '-o',
    'BatchMode=yes',
    '-o',
    'IdentitiesOnly=yes',
    '-P',
    port
  ]

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
