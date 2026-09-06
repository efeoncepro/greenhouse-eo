import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * TASK-1837 follow-up — Write-target allowlist del dominio `external-access`.
 *
 * El módulo es el ÚNICO writer del grafo de identidad externa (TASK-1631) y de las columnas de
 * entrega de la invitación (TASK-1837). Este guard escanea el SQL literal de `src/lib/identity/
 * external-access/**` y falla si aparece un `INSERT`/`UPDATE`/`DELETE` sobre una tabla fuera del
 * allowlist — o si alguien mete acá una escritura ajena (p. ej. `email_deliveries`, que es de
 * `sendEmail`). Es textual: el SQL real se ejercita en `pnpm identity:external-access:smoke -- --apply`.
 */

const ROOT = join(process.cwd(), 'src/lib/identity/external-access')

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
  // TASK-1631 — grafo provider-neutral.
  'greenhouse_core.external_identity_environments',
  'greenhouse_core.external_organization_bindings',
  'greenhouse_core.external_capability_grants',
  'greenhouse_core.external_member_invitations',
  'greenhouse_core.external_identity_audit_log',
  'greenhouse_core.external_access_resolution_log',
  // TASK-1832 — única excepción: el dominio crea y elimina SU fixture organizacional dedicado.
  'greenhouse_core.external_canary_registrations',
  'greenhouse_core.organizations',
  // Aceptar liga la persona: perfil nuevo `external_contact` + source link `external_idp:<env>`.
  'greenhouse_core.identity_profiles',
  'greenhouse_core.identity_profile_source_links'
])

const NEVER_WRITE_HERE = [
  // El correo lo escribe `sendEmail`; el consumer del rebote entra por `recordExternalInvitationDeliveryOutcome`.
  'greenhouse_notifications.email_deliveries',
  // El outbox se publica vía `publishOutboxEvent`, nunca con INSERT propio.
  'greenhouse_sync.outbox_events'
]

describe('external-access domain-wide write boundary (TASK-1631/1837)', () => {
  const files = collectSourceFiles(ROOT)

  it('recorre un set no trivial de archivos del dominio', () => {
    expect(files.length).toBeGreaterThan(6)
  })

  it.each(files.map(f => [f.replace(process.cwd() + '/', '')] as const))(
    '%s solo escribe en tablas del allowlist del dominio',
    relativePath => {
      const source = readFileSync(join(process.cwd(), relativePath), 'utf8')

      for (const match of source.matchAll(/(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+([a-z_]+\.[a-z_]+)/gi)) {
        expect(
          ALLOWED_WRITE_TARGETS.has(match[1]),
          `${relativePath} escribe en "${match[1]}" — fuera del allowlist del dominio external-access`
        ).toBe(true)
      }
    }
  )

  it('ninguna tabla del allowlist vive fuera de greenhouse_core y las prohibidas no están', () => {
    for (const table of ALLOWED_WRITE_TARGETS) {
      expect(table.startsWith('greenhouse_core.')).toBe(true)
      expect(NEVER_WRITE_HERE).not.toContain(table)
    }
  })
})
