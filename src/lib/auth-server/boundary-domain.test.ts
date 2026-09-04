import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Write-target allowlist del dominio `auth-server` (TASK-1828 llaves, TASK-1829 OAuth; TASK-1830 agrega
 * sesiones/credenciales). El emisor NUNCA escribe fuera de `greenhouse_auth`: la identidad de la persona
 * se resuelve por `(environment, subject)` a través de `src/lib/identity/external-access` (lectura).
 */

const ROOT = join(process.cwd(), 'src/lib/auth-server')

const collectSourceFiles = (dir: string): string[] => {
  const out: string[] = []

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)

    if (statSync(full).isDirectory()) {
      out.push(...collectSourceFiles(full))
    } else if (full.endsWith('.ts') && !full.endsWith('.test.ts')) {
      out.push(full)
    }
  }

  return out
}

const ALLOWED_WRITE_TARGETS = new Set([
  // TASK-1828 — registry de llaves de firma (la privada vive en KMS).
  'greenhouse_auth.signing_keys',
  'greenhouse_auth.signing_key_events',

  // TASK-1829 — superficie OAuth del emisor.
  'greenhouse_auth.oauth_clients',
  'greenhouse_auth.cimd_cache',
  'greenhouse_auth.authorization_codes',
  'greenhouse_auth.refresh_tokens',
  'greenhouse_auth.access_tokens',
  'greenhouse_auth.client_consents',
  'greenhouse_auth.oauth_audit_events'
])

describe('auth-server domain-wide write boundary (TASK-1829)', () => {
  const files = collectSourceFiles(ROOT)

  it('recorre un set no trivial de archivos del dominio', () => {
    expect(files.length).toBeGreaterThan(6)
  })

  it.each(files.map(f => [f.replace(process.cwd() + '/', '')] as const))(
    '%s solo escribe en tablas de greenhouse_auth del allowlist',
    relativePath => {
      const source = readFileSync(join(process.cwd(), relativePath), 'utf8')

      for (const match of source.matchAll(/(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+([a-z_]+\.[a-z_]+)/gi)) {
        expect(
          ALLOWED_WRITE_TARGETS.has(match[1]),
          `${relativePath} escribe en "${match[1]}" — fuera del allowlist del dominio auth-server`
        ).toBe(true)
      }
    }
  )

  it('ninguna tabla del allowlist vive fuera de greenhouse_auth', () => {
    for (const table of ALLOWED_WRITE_TARGETS) {
      expect(table.startsWith('greenhouse_auth.')).toBe(true)
    }
  })
})
