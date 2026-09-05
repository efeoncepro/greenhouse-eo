/** Operator reconciliation; dry-run unless --apply. No identity creation, grants, or historical event replay. */
import { parseArgs } from 'node:util'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

/**
 * Error de INVOCACIÓN, distinto de un fallo de ejecución.
 *
 * La distinción es deliberada: el `catch` de abajo redacta cualquier fallo real porque este script
 * toca identidad y su detalle puede arrastrar sujetos, bindings o razones a los logs. Pero una
 * llamada mal escrita no tiene nada sensible que filtrar y sí necesita decir qué falta: si se redacta
 * igual que lo demás, el operador se queda sin forma de corregirla.
 */
class UsageError extends Error {}

const USAGE = `Uso: pnpm tsx scripts/identity/reconcile-internal-authority.ts \\
  --binding-id <xob-...> --actor-id <user-...> --reason "<motivo, mínimo 10 caracteres>" [--apply]

  --binding-id  binding de organización a reconciliar (obligatorio)
  --actor-id    operador que responde por la acción; debe ser interno y tener la capability (obligatorio)
  --reason      queda en la evidencia de auditoría (obligatorio)
  --apply       ejecuta; sin este flag corre en dry-run y no escribe nada`

async function main() {
  const args = process.argv.slice(2)

  if (args[0] === '--') args.shift()

  const { values } = parseArgs({
    args,
    options: {
      'binding-id': { type: 'string' },
      'actor-id': { type: 'string' },
      reason: { type: 'string' },
      apply: { type: 'boolean', default: false }
    },
    strict: true
  })

  const bindingId = values['binding-id'],
    actorId = values['actor-id'],
    reason = values.reason

  const missing = [
    bindingId ? null : '--binding-id',
    actorId ? null : '--actor-id',
    reason ? null : '--reason'
  ].filter((flag): flag is string => flag !== null)

  // La condición repite los tres valores para que TypeScript los estreche después del guard.
  if (missing.length || !bindingId || !actorId || !reason) throw new UsageError(`Faltan parámetros obligatorios: ${missing.join(', ')}.\n\n${USAGE}`)
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('ops')
  const { getTenantAccessRecordFromPostgresByUserId } = await import('../../src/lib/tenant/access')
  const { can } = await import('../../src/lib/entitlements/runtime')
  const { reconcileInternalAuthority } = await import('../../src/lib/identity/internal-access/reconcile')

  const result = await reconcileInternalAuthority(
    { bindingId, actorId, reason, dryRun: !values.apply },
    {
      authorize: async (id, capability) => {
        if (id !== actorId) return false
        const actor = await getTenantAccessRecordFromPostgresByUserId(id)

        return Boolean(
          actor &&
            actor.active &&
            actor.status === 'active' &&
            actor.tenantType === 'efeonce_internal' &&
            can({ ...actor, memberId: actor.memberId ?? undefined }, capability, 'execute', 'tenant')
        )
      }
    }
  )

  console.log(JSON.stringify({ mode: values.apply ? 'apply' : 'dry-run', ...result }))
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    // La invocación se explica entera; el fallo de ejecución sigue redactado (puede llevar identidad).
    if (error instanceof UsageError) {
      console.error(error.message)
      process.exit(2)
    }

    console.error('Internal authority reconciliation failed; details suppressed.')
    process.exit(1)
  })
