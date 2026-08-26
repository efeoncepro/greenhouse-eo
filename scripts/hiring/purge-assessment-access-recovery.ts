/**
 * TASK-1746 follow-up — purga gobernada de la auditoría de recuperación de acceso.
 *
 * Cada vez que un operador rota el acceso a una prueba queda un rastro de auditoría. Ese rastro vence a los
 * 12 meses, y si el candidato RETIRA SU CONSENTIMIENTO debe borrarse antes. La función que lo hace existe
 * desde la migración de TASK-1746 con toda su defensa adentro; lo que nunca existió fue quien la llamara,
 * así que el derecho no tenía vía de ejercicio. Este CLI es esa vía.
 *
 * Flujo obligatorio (el mismo de `hiring:data:purge-synthetic` y `hiring:candidates:remediate-display`):
 *
 *   # 1. Plan READ-ONLY: qué se purgaría y por qué
 *   pnpm hiring:assessment:purge-access-recovery
 *
 *   # 2. Emitir allowlist para poda HUMANA (archivo local, gitignoreado, contiene ids)
 *   pnpm hiring:assessment:purge-access-recovery --emit-allowlist ./task-1746.access-recovery-purge-allowlist.json
 *
 *   # 3. Aplicar SÓLO lo que quedó en la allowlist, con actor identificable
 *   pnpm hiring:assessment:purge-access-recovery --apply \
 *     --allowlist ./task-1746.access-recovery-purge-allowlist.json \
 *     --actor user-efeonce-admin-julio-reyes
 *
 * 🔴 Sin `--allowlist` no se purga NADA. La ausencia de entradas significa "ninguna", nunca "todas".
 * 🔴 El borrado es irreversible: la auditoría que queda registra el id de postulación HASHEADO, no el id.
 */

import { readFileSync, writeFileSync } from 'node:fs'

import {
  ACCESS_RECOVERY_PURGE_ALLOWLIST_SUFFIX,
  ACCESS_RECOVERY_PURGE_REASONS,
  applyAccessRecoveryPurge,
  planAccessRecoveryPurge,
  type AccessRecoveryPurgeReason,
} from '@/lib/hiring/assessment/access-recovery-retention'
import { closeGreenhousePostgres } from '@/lib/postgres/client'

const argValue = (flag: string): string | null => {
  const i = process.argv.indexOf(flag)

  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : null
}

const hasFlag = (flag: string): boolean => process.argv.includes(flag)

const readAllowlist = (path: string): { applicationId: string; reason: AccessRecoveryPurgeReason }[] => {
  if (!path.endsWith(ACCESS_RECOVERY_PURGE_ALLOWLIST_SUFFIX)) {
    throw new Error(`El archivo de allowlist debe terminar en \`${ACCESS_RECOVERY_PURGE_ALLOWLIST_SUFFIX}\` (gitignoreado).`)
  }

  const parsed = JSON.parse(readFileSync(path, 'utf8')) as unknown

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('La allowlist está vacía. Sin entradas no se purga nada — eso es el contrato, no un error.')
  }

  return parsed.map((raw, index) => {
    const entry = raw as { applicationId?: unknown; reason?: unknown }
    const applicationId = typeof entry.applicationId === 'string' ? entry.applicationId.trim() : ''
    const reason = entry.reason as AccessRecoveryPurgeReason

    if (!applicationId) throw new Error(`Entrada ${index} sin \`applicationId\`.`)

    if (!ACCESS_RECOVERY_PURGE_REASONS.includes(reason)) {
      throw new Error(`Entrada ${index}: \`reason\` debe ser uno de ${ACCESS_RECOVERY_PURGE_REASONS.join(' | ')}.`)
    }

    return { applicationId, reason }
  })
}

const main = async () => {
  try {
    const plan = await planAccessRecoveryPurge()
    const all = [...plan.consentWithdrawn, ...plan.retentionExpired]

    console.log('\n[access-recovery-purge] PLAN (read-only)\n')
    console.log(`  consentimiento retirado : ${plan.consentWithdrawn.length} postulación(es)`)
    console.log(`  retención vencida       : ${plan.retentionExpired.length} postulación(es)`)

    for (const c of all) {
      console.log(`   - ${c.applicationId}  ${c.reason}  filas=${c.recoveryRowCount}  vence=${c.retentionExpiresAt ?? 'n/a'}`)
    }

    const emitPath = argValue('--emit-allowlist')

    if (emitPath) {
      if (!emitPath.endsWith(ACCESS_RECOVERY_PURGE_ALLOWLIST_SUFFIX)) {
        throw new Error(`El archivo debe terminar en \`${ACCESS_RECOVERY_PURGE_ALLOWLIST_SUFFIX}\` (gitignoreado).`)
      }

      writeFileSync(emitPath, `${JSON.stringify(all.map(c => ({ applicationId: c.applicationId, reason: c.reason })), null, 2)}\n`)
      console.log(`\n[access-recovery-purge] allowlist emitida en ${emitPath}`)
      console.log('  Revísala LÍNEA POR LÍNEA y borra lo que no corresponda antes de aplicar.\n')

      return
    }

    if (!hasFlag('--apply')) {
      console.log('\n[access-recovery-purge] dry-run. Para aplicar: --emit-allowlist, podar a mano, y después --apply --allowlist <archivo> --actor <user-id>\n')

      return
    }

    const allowlistPath = argValue('--allowlist')
    const actor = argValue('--actor')

    if (!allowlistPath) throw new Error('`--apply` exige `--allowlist <archivo>`. Sin allowlist no se purga nada.')
    if (!actor) throw new Error('`--apply` exige `--actor <user-id>`: el borrado se audita con un humano detrás.')

    const allowlist = readAllowlist(allowlistPath)
    const results = await applyAccessRecoveryPurge(allowlist, actor)
    const purged = results.reduce((sum, r) => sum + r.purgedRows, 0)
    const failed = results.filter(r => r.error)

    console.log(`\n[access-recovery-purge] APLICADO — ${purged} fila(s) purgada(s) en ${results.length} postulación(es)\n`)

    for (const r of results) {
      console.log(`   ${r.error ? '✗' : '✓'} ${r.applicationId}  ${r.reason}  filas=${r.purgedRows}${r.error ? `  → ${r.error}` : ''}`)
    }

    if (failed.length > 0) {
      console.log(`\n  ${failed.length} rechazada(s) por la función, que revalida en su propia transacción. No es un fallo del CLI: es la defensa haciendo su trabajo.\n`)
    }
  } finally {
    await closeGreenhousePostgres()
  }
}

void main()
