import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export const PROJECT_ROOT = resolve(import.meta.dirname, '../..')
export const ENV_LOCAL_PATH = resolve(PROJECT_ROOT, '.env.local')

export function parseEnvFile(content) {
  const vars = {}

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()

    if (!line || line.startsWith('#')) continue

    const eqIdx = line.indexOf('=')

    if (eqIdx <= 0) continue

    const key = line.slice(0, eqIdx).trim()
    let value = line.slice(eqIdx + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    vars[key] = value
  }

  return vars
}

export async function readEnvFile(path = ENV_LOCAL_PATH) {
  try {
    return parseEnvFile(await readFile(path, 'utf-8'))
  } catch {
    return {}
  }
}

export async function loadLocalEnvFiles({ cwd = PROJECT_ROOT, files = ['.env.local', '.env'] } = {}) {
  const loaded = {}

  for (const file of files) {
    const vars = await readEnvFile(resolve(cwd, file))

    for (const [key, value] of Object.entries(vars)) {
      loaded[key] = value

      if (process.env[key] === undefined) {
        process.env[key] = value
      }
    }
  }

  return loaded
}
