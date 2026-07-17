import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const PUBLIC_WEBSITE_ENV_FILES = ['.env.public-website.local', '.env.local', '.env'] as const

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

      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }

      process.env[key] = value
    }

    return true
  } catch {
    return false
  }
}

export const loadPublicWebsiteEnvFiles = () => PUBLIC_WEBSITE_ENV_FILES.filter(loadEnvFile)
