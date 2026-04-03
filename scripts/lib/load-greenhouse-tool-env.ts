import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

type PostgresProfile = 'runtime' | 'migrator' | 'admin' | 'ops'

const DEFAULT_ENV_FILES = [
  '.env.local',
  '.env.production.local',
  '.env.development.local'
] as const

const stripWrappingQuotes = (value: string) => {
  const trimmed = value.trim()
  const hasDoubleQuotes = trimmed.startsWith('"') && trimmed.endsWith('"')
  const hasSingleQuotes = trimmed.startsWith("'") && trimmed.endsWith("'")

  return hasDoubleQuotes || hasSingleQuotes ? trimmed.slice(1, -1) : trimmed
}

const parseEnvFile = (content: string) => {
  const entries: Record<string, string> = {}

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (!line || line.startsWith('#')) {
      continue
    }

    const equalsIndex = line.indexOf('=')

    if (equalsIndex <= 0) {
      continue
    }

    const key = line.slice(0, equalsIndex).trim()
    const value = stripWrappingQuotes(line.slice(equalsIndex + 1))

    if (key) {
      entries[key] = value
    }
  }

  return entries
}

export const loadGreenhouseToolEnv = (envFiles = DEFAULT_ENV_FILES) => {
  for (const envFile of envFiles) {
    const resolvedPath = path.resolve(process.cwd(), envFile)

    if (!existsSync(resolvedPath)) {
      continue
    }

    const entries = parseEnvFile(readFileSync(resolvedPath, 'utf8'))

    for (const [key, value] of Object.entries(entries)) {
      if (process.env[key] === undefined) {
        process.env[key] = value
      }
    }
  }
}

const assignOrDeleteEnv = (key: string, value: string | undefined) => {
  if (value === undefined || value.trim() === '') {
    delete process.env[key]

    return
  }

  process.env[key] = value
}

const PROFILE_KEY_MAP: Record<PostgresProfile, { user: string; password: string; passwordSecretRef: string }> = {
  runtime: {
    user: 'GREENHOUSE_POSTGRES_USER',
    password: 'GREENHOUSE_POSTGRES_PASSWORD',
    passwordSecretRef: 'GREENHOUSE_POSTGRES_PASSWORD_SECRET_REF'
  },
  migrator: {
    user: 'GREENHOUSE_POSTGRES_MIGRATOR_USER',
    password: 'GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD',
    passwordSecretRef: 'GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD_SECRET_REF'
  },
  admin: {
    user: 'GREENHOUSE_POSTGRES_ADMIN_USER',
    password: 'GREENHOUSE_POSTGRES_ADMIN_PASSWORD',
    passwordSecretRef: 'GREENHOUSE_POSTGRES_ADMIN_PASSWORD_SECRET_REF'
  },
  ops: {
    user: 'GREENHOUSE_POSTGRES_OPS_USER',
    password: 'GREENHOUSE_POSTGRES_OPS_PASSWORD',
    passwordSecretRef: 'GREENHOUSE_POSTGRES_OPS_PASSWORD_SECRET_REF'
  }
}

export const getPostgresProfileMissingConfig = (profile: PostgresProfile) => {
  const keyMap = PROFILE_KEY_MAP[profile]
  const missing: string[] = []

  if (!process.env.GREENHOUSE_POSTGRES_DATABASE?.trim()) {
    missing.push('GREENHOUSE_POSTGRES_DATABASE')
  }

  if (
    !process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME?.trim() &&
    !process.env.GREENHOUSE_POSTGRES_HOST?.trim()
  ) {
    missing.push('GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME or GREENHOUSE_POSTGRES_HOST')
  }

  if (!process.env[keyMap.user]?.trim()) {
    missing.push(keyMap.user)
  }

  if (!process.env[keyMap.password] && !process.env[keyMap.passwordSecretRef]?.trim()) {
    missing.push(`${keyMap.password} or ${keyMap.passwordSecretRef}`)
  }

  return missing
}

export const applyGreenhousePostgresProfile = (profile: PostgresProfile) => {
  const keyMap = PROFILE_KEY_MAP[profile]
  const missing = getPostgresProfileMissingConfig(profile)

  if (missing.length > 0) {
    throw new Error(`Greenhouse Postgres profile "${profile}" is not configured. Missing: ${missing.join(', ')}`)
  }

  assignOrDeleteEnv('GREENHOUSE_POSTGRES_USER', process.env[keyMap.user])
  assignOrDeleteEnv('GREENHOUSE_POSTGRES_PASSWORD', process.env[keyMap.password])
  assignOrDeleteEnv('GREENHOUSE_POSTGRES_PASSWORD_SECRET_REF', process.env[keyMap.passwordSecretRef])

  return {
    profile,
    user: process.env.GREENHOUSE_POSTGRES_USER || '',
    database: process.env.GREENHOUSE_POSTGRES_DATABASE || '',
    instanceConnectionName: process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME || '',
    host: process.env.GREENHOUSE_POSTGRES_HOST || null
  }
}

export type { PostgresProfile }
