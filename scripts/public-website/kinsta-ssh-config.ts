import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { isAbsolute, resolve } from 'node:path'

export const KINSTA_SSH_ENV_NAMES = [
  'PUBLIC_WEBSITE_KINSTA_SSH_HOST',
  'PUBLIC_WEBSITE_KINSTA_SSH_PORT',
  'PUBLIC_WEBSITE_KINSTA_SSH_USER',
  'PUBLIC_WEBSITE_KINSTA_SSH_KEY_PATH',
  'PUBLIC_WEBSITE_KINSTA_WORDPRESS_PATH'
] as const

export type KinstaSshConfig = {
  host: string
  port: string
  user: string
  keyPath: string
  wordpressPath: string
}

export type KinstaSshReadiness = {
  config: KinstaSshConfig | null
  missing: string[]
  invalid: string[]
  keyExists: boolean
  ready: boolean
}

const expandLocalPath = (value: string) => {
  if (value === '~') return homedir()
  if (value.startsWith('~/')) return resolve(homedir(), value.slice(2))

  return isAbsolute(value) ? value : resolve(process.cwd(), value)
}

export const inspectKinstaSshReadiness = (): KinstaSshReadiness => {
  const values = Object.fromEntries(
    KINSTA_SSH_ENV_NAMES.map(name => [name, process.env[name]?.trim() || null])
  ) as Record<(typeof KINSTA_SSH_ENV_NAMES)[number], string | null>

  const missing = KINSTA_SSH_ENV_NAMES.filter(name => !values[name])
  const invalid: string[] = []

  if (values.PUBLIC_WEBSITE_KINSTA_SSH_PORT) {
    const port = Number(values.PUBLIC_WEBSITE_KINSTA_SSH_PORT)

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      invalid.push('PUBLIC_WEBSITE_KINSTA_SSH_PORT must be an integer between 1 and 65535')
    }
  }

  if (values.PUBLIC_WEBSITE_KINSTA_WORDPRESS_PATH && !values.PUBLIC_WEBSITE_KINSTA_WORDPRESS_PATH.startsWith('/')) {
    invalid.push('PUBLIC_WEBSITE_KINSTA_WORDPRESS_PATH must be absolute')
  }

  if (missing.length || invalid.length) {
    return {
      config: null,
      missing,
      invalid,
      keyExists: false,
      ready: false
    }
  }

  const config: KinstaSshConfig = {
    host: values.PUBLIC_WEBSITE_KINSTA_SSH_HOST!,
    port: values.PUBLIC_WEBSITE_KINSTA_SSH_PORT!,
    user: values.PUBLIC_WEBSITE_KINSTA_SSH_USER!,
    keyPath: expandLocalPath(values.PUBLIC_WEBSITE_KINSTA_SSH_KEY_PATH!),
    wordpressPath: values.PUBLIC_WEBSITE_KINSTA_WORDPRESS_PATH!
  }

  const keyExists = existsSync(config.keyPath)

  return {
    config,
    missing,
    invalid,
    keyExists,
    ready: keyExists
  }
}

export const formatKinstaSshReadinessError = (readiness: KinstaSshReadiness) => {
  const findings = [
    ...readiness.missing.map(name => `missing ${name}`),
    ...readiness.invalid,
    ...(readiness.config && !readiness.keyExists ? ['configured SSH key file does not exist'] : [])
  ]

  return [
    `Kinsta SSH/WP-CLI is not ready: ${findings.join('; ') || 'unknown configuration error'}.`,
    'Configure the local-only .env.public-website.local file; do not rely on .env.local because Vercel CLI can replace it.',
    'A missing Kinsta API token does not mean SSH is unavailable.'
  ].join(' ')
}

export const buildKinstaSshArgs = (config: KinstaSshConfig) => [
  '-i',
  config.keyPath,
  '-o',
  'BatchMode=yes',
  '-o',
  'IdentitiesOnly=yes',
  '-o',
  'StrictHostKeyChecking=accept-new',
  '-o',
  'ConnectTimeout=10',
  '-p',
  config.port
]

export const buildKinstaScpArgs = (config: KinstaSshConfig) => [
  '-i',
  config.keyPath,
  '-o',
  'BatchMode=yes',
  '-o',
  'IdentitiesOnly=yes',
  '-o',
  'StrictHostKeyChecking=accept-new',
  '-P',
  config.port
]
