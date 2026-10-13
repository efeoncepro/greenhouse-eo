/**
 * Declara qué países incluye el contrato AEO de una organización (`aeo_markets_included`).
 *
 * Por qué existe: la arquitectura multi-mercado (TASK-1863) exige que un mercado secundario esté
 * declarado en el assignment `contracted` para poder medirse, pero no había NINGÚN camino
 * gobernado para declararlo. Sky quedó con 6 mercados secundarios con cadencia recurrente
 * prendida y cero declarados: el regrade falló el 100% de las corridas, todos los días, del
 * 2026-10-03 al 2026-10-12 (`aeo_market_not_included`).
 *
 * Qué hace: llama al command gobernado `assignAeoTier` con `marketsIncluded` — el mismo
 * primitive de la route `/api/admin/growth/ai-visibility/assign-tier`. El command supersede el
 * assignment vigente (expira + habilita uno nuevo, con audit y outbox) y conserva el resto de su
 * metadata. Es idempotente: repetirlo con los mismos países no escribe nada.
 *
 * ⚠️ Declarar un mercado es un COMPROMISO DE GASTO: cada mercado con cadencia recurrente prendida
 * pasa a comprar una medición `full` por ciclo. El script imprime cuáles quedan habilitados.
 *
 * Usage:
 *   pnpm growth:aeo-contracted-markets --org <organization_id> --markets AR,BR,CL \
 *     --actor <user_id> --reason "<motivo, 10+ caracteres>" [--apply]
 *
 * Sin `--apply` es dry-run: reporta el estado actual y lo que haría, sin escribir.
 * Corre el ÁRBOL LOCAL contra la única base (staging y producción la comparten): declararlo en
 * la evidencia cuando el código del command aún no esté desplegado.
 */

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

import { query } from '@/lib/db'

const arg = (name: string): string | null => {
  const index = process.argv.indexOf(`--${name}`)

  return index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')
    ? process.argv[index + 1]
    : null
}

const APPLY = process.argv.includes('--apply')
const organizationId = arg('org')
const actor = arg('actor')
const reason = arg('reason')

const markets = (arg('markets') ?? '')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean)

const readState = async (orgId: string) => {
  const assignment = await query<{ assignment_id: string; status: string; metadata_json: Record<string, unknown> | null }>(
    `SELECT assignment_id, status, metadata_json
       FROM greenhouse_client_portal.module_assignments
      WHERE organization_id = $1 AND module_key = 'ai_visibility_v1' AND effective_to IS NULL
      ORDER BY created_at DESC LIMIT 1`,
    [orgId]
  )

  const profileMarkets = await query<{
    market_code: string
    is_primary: boolean
    status: string
    recurring_regrade_enabled: boolean
    cadence: string | null
  }>(
    `SELECT m.market_code, m.is_primary, m.status, m.recurring_regrade_enabled,
            m.recurring_regrade_cadence AS cadence
       FROM greenhouse_growth.grader_profile_markets m
       JOIN greenhouse_growth.grader_profiles p ON p.profile_id = m.profile_id
      WHERE p.organization_id = $1 AND p.status = 'active'
      ORDER BY m.is_primary DESC, m.market_code`,
    [orgId]
  )

  return { assignment: assignment[0] ?? null, profileMarkets }
}

const main = async () => {
  if (!organizationId || !actor || !reason || markets.length === 0) {
    console.error(
      'Faltan argumentos. Uso: --org <organization_id> --markets AR,BR --actor <user_id> --reason "<motivo>" [--apply]'
    )
    process.exit(1)
  }

  const org = await query<{ organization_name: string }>(
    `SELECT organization_name FROM greenhouse_core.organizations WHERE organization_id = $1`,
    [organizationId]
  )

  if (!org[0]) {
    console.error(`No existe la organización ${organizationId}.`)
    process.exit(1)
  }

  const before = await readState(organizationId)
  const declaredBefore = before.assignment?.metadata_json?.aeo_markets_included

  console.log(`Organización: ${org[0].organization_name} (${organizationId})`)
  console.log(
    `Assignment AEO vigente: ${before.assignment ? `${before.assignment.assignment_id} [${before.assignment.status}, tier=${String(before.assignment.metadata_json?.aeo_tier ?? 'sin tier')}]` : '(ninguno)'}`
  )
  console.log(`Mercados declarados ANTES: ${Array.isArray(declaredBefore) ? JSON.stringify(declaredBefore) : '(nunca declarados)'}`)
  console.log(`Mercados a declarar: ${JSON.stringify(markets)}`)
  console.log('\nMercados configurados en el perfil:')

  for (const market of before.profileMarkets) {
    const requested = markets.some(code => code.toUpperCase() === market.market_code)

    console.log(
      `  ${market.market_code}${market.is_primary ? ' (principal)' : ''} — ${market.status}, ` +
        `cadencia ${market.recurring_regrade_enabled ? `ON (${market.cadence})` : 'OFF'}` +
        `${market.is_primary || requested ? '' : '  ← NO queda cubierto por esta declaración'}`
    )
  }

  if (before.assignment?.metadata_json?.aeo_tier !== 'contracted') {
    console.error('\nEl assignment vigente no es `contracted`: los mercados extra sólo aplican a ese tier. No se escribe nada.')
    process.exit(1)
  }

  if (!APPLY) {
    console.log('\nDRY-RUN — sin `--apply` no se escribe nada. Vuelve a correr con --apply para aplicar.')
    process.exit(0)
  }

  const { assignAeoTier } = await import('@/lib/growth/ai-visibility/assign-tier')

  const result = await assignAeoTier({
    organizationId,
    tier: 'contracted',
    reason,
    requestedBy: actor,
    marketsIncluded: markets
  })

  console.log(
    `\nAplicado: assignment ${result.assignmentId} status=${result.status} idempotent=${result.idempotent}` +
      `${result.supersededAssignmentId ? ` (supersede ${result.supersededAssignmentId})` : ''}`
  )

  // Readback contra la base, no contra el retorno del command.
  const after = await readState(organizationId)

  console.log(
    `Readback: ${after.assignment?.assignment_id} → aeo_markets_included=${JSON.stringify(after.assignment?.metadata_json?.aeo_markets_included ?? null)}`
  )

  const { resolveAeoEntitlement } = await import('@/lib/growth/ai-visibility/entitlement')
  const entitlement = await resolveAeoEntitlement(organizationId)

  console.log(
    `Chokepoint: tier=${entitlement.tier} marketsIncluded=${JSON.stringify(entitlement.marketsIncluded)} ` +
      `allowanceRemaining=${entitlement.allowanceRemaining}`
  )
  process.exit(0)
}

main().catch(error => {
  console.error('Falló:', error instanceof Error ? error.message : error)
  process.exit(1)
})
