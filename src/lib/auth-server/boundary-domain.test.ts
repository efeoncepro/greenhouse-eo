import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Write-target allowlist del dominio `auth-server` (TASK-1828 llaves, TASK-1829 OAuth, TASK-1830
 * sesiones/credenciales). El emisor NUNCA escribe fuera de `greenhouse_auth`: la identidad de la
 * persona se resuelve por `(environment, subject)` a través de `src/lib/identity/external-access`
 * (lectura), y la ÚNICA escritura en `greenhouse_core` —ligar la persona— se delega al command
 * `acceptExternalInvitation` de TASK-1631, que la ejecuta en su propia transacción con audit y
 * outbox. Por eso este guard escanea SQL literal dentro de `src/lib/auth-server/**`: un `INSERT`
 * propio sobre `greenhouse_core` acá sería exactamente la violación que busca.
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
  'greenhouse_auth.oauth_audit_events',

  // TASK-1830 — autenticación de personas. `person_auth_attempts` es el ledger de intentos del
  // EMISOR: `greenhouse_serving.auth_attempts` (TASK-742) es del portal y no admite este runtime
  // sin romperlo (CHECK cerrados de NextAuth, FK a `client_users`, GRANT sólo a `greenhouse_runtime`).
  'greenhouse_auth.sessions',
  'greenhouse_auth.magic_link_tokens',
  'greenhouse_auth.auth_rate_limits',
  'greenhouse_auth.person_auth_attempts',

  // TASK-1830 Slice 2 — passkeys. `passkey_credentials` guarda SÓLO material público (COSE);
  // `passkey_challenges` existe porque el reto de autenticación ocurre ANTES de que haya sesión.
  'greenhouse_auth.passkey_credentials',
  'greenhouse_auth.passkey_challenges',

  // TASK-1830 Slice 3 — TOTP. El secreto vive cifrado por KMS con AAD `<environment>|<subject>`;
  // los códigos de respaldo, sólo su sha256 (nacen de 128 bits, no necesitan KDF lento).
  'greenhouse_auth.totp_enrollments',
  'greenhouse_auth.totp_backup_codes',

  // TASK-1836 — encrypted OIDC transactions, corporate provenance and revocable delegated contexts.
  // SQL and atomic consumption are verified by internal/persistence.live.test.ts, beyond this textual boundary guard.
  'greenhouse_auth.internal_login_transactions',
  'greenhouse_auth.corporate_session_evidence',
  'greenhouse_auth.authorization_contexts'
])

describe('auth-server domain-wide write boundary (TASK-1829/1830)', () => {
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
