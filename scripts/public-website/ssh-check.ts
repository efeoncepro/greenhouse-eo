#!/usr/bin/env tsx
/**
 * Verify the independent Kinsta SSH + WP-CLI access lane without mutating WordPress.
 */

import { execFileSync } from 'node:child_process'

import { buildKinstaSshArgs, formatKinstaSshReadinessError, inspectKinstaSshReadiness } from './kinsta-ssh-config'
import { loadPublicWebsiteEnvFiles } from './local-env'

const loadedEnvFiles = loadPublicWebsiteEnvFiles()

const shellQuote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`

const printHelp = () => {
  console.log(`Usage:
  pnpm public-website:ssh-check

This command is read-only. It verifies the Kinsta SSH key, connects in batch mode,
and reads the WordPress home URL through WP-CLI.

Configuration precedence:
  .env.public-website.local  (stable local operations profile)
  .env.local                 (may be replaced by Vercel CLI)
  .env

The Kinsta API token is not required for SSH or WP-CLI.`)
}

const main = () => {
  const argv = process.argv.slice(2).filter(arg => arg !== '--')

  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp()

    return
  }

  if (argv.length) throw new Error(`Unknown argument: ${argv[0]}`)

  const readiness = inspectKinstaSshReadiness()

  if (!readiness.ready || !readiness.config) {
    throw new Error(formatKinstaSshReadinessError(readiness))
  }

  const { config } = readiness
  const sshTarget = `${config.user}@${config.host}`

  const remoteCommand = [
    `cd ${shellQuote(config.wordpressPath)}`,
    'wp --skip-plugins --skip-themes option get home'
  ].join(' && ')

  const home = execFileSync('ssh', [...buildKinstaSshArgs(config), sshTarget, remoteCommand], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30_000
  }).trim()

  const expectedHome = (process.env.PUBLIC_WEBSITE_WORDPRESS_BASE_URL?.trim() || 'https://efeoncepro.com').replace(
    /\/+$/,
    ''
  )

  if (home.replace(/\/+$/, '') !== expectedHome) {
    throw new Error(`SSH reached an unexpected WordPress site: expected ${expectedHome}, received ${home || '(empty)'}`)
  }

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        lane: 'kinsta_ssh_wpcli',
        configured: true,
        verified: true,
        home,
        loadedEnvFiles,
        kinstaApiTokenRequired: false
      },
      null,
      2
    )
  )
}

try {
  main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)

  console.error(`public-website:ssh-check failed: ${message}`)
  process.exit(1)
}
