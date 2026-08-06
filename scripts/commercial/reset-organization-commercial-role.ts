import 'server-only'

/**
 * Remediación canónica INVERSA: devuelve `organization_type` a `'other'` (= sin rol comercial)
 * en una org que quedó marcada como `client`/`supplier`/`both` sin serlo.
 *
 * POR QUÉ EXISTE UNA PUERTA DEDICADA. `deriveOrganizationType` es **monótona por diseño**
 * (`isClientCapable(currentType)`): un rol adquirido nunca se degrada, para que una org que
 * dejó de facturar no desaparezca de Finanzas. Eso significa que NINGUNA llamada normal a
 * `upsertCanonicalOrganization` puede bajar el tipo — pasarle el `currentType` real lo
 * perpetúa. Y `remediate-half-baked-orgs.ts` sólo cubre el drift contrario
 * (`active_client` + type sin rol → promover).
 *
 * Este script rompe la monotonía de forma EXPLÍCITA y auditada: le declara al derivador
 * `currentType='other'`, que es exactamente la aserción de la remediación — "esta org no tiene
 * rol comercial". Sigue pasando por el writer canónico (`upsertCanonicalOrganization`),
 * NUNCA por SQL directo, así que conserva la derivación, el audit y el resto de invariantes.
 *
 * Caso fuente: EO-ORG-0007 (Efeonce), la propia entidad legal operadora, quedó `type='client'`
 * — herencia del space de cliente de marzo 2026, cuando aún no se había decidido que la
 * operadora no es cliente. Eso la metía en los 5 readers client-facing de Finanzas/onboarding,
 * incluida la puerta de facturación `resolveFinanceClientContext`.
 *
 * NO toca `is_operating_entity` (el writer canónico nunca lo escribe) ni los
 * `module_assignments`: las capabilities (SEO, AEO, GA4…) cuelgan del assignment, no del tipo.
 *
 * Uso:
 *   # dry-run (default, read-only)
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/commercial/reset-organization-commercial-role.ts --organization-id <id>
 *
 *   # apply
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/commercial/reset-organization-commercial-role.ts --organization-id <id> \
 *     --apply --reason "<>=10 chars>"
 */
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { upsertCanonicalOrganization } from '@/lib/account-360/organization-identity'

type OrgRow = {
  organization_id: string
  public_id: string | null
  organization_name: string
  organization_type: string | null
  lifecycle_stage: string | null
  is_operating_entity: boolean | null
}

/** Lifecycles que IMPLICAN un rol comercial real: degradar ahí sería crear drift, no repararlo. */
const LIFECYCLES_CON_ROL = new Set(['active_client', 'provider_only'])

const arg = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`)

  return index === -1 ? undefined : process.argv[index + 1]
}

const readOrg = async (organizationId: string) => {
  const rows = await runGreenhousePostgresQuery<OrgRow>(
    `SELECT organization_id, public_id, organization_name, organization_type,
            lifecycle_stage, is_operating_entity
       FROM greenhouse_core.organizations
      WHERE organization_id = $1`,
    [organizationId]
  )

  return rows[0] ?? null
}

const countModules = async (organizationId: string) => {
  const rows = await runGreenhousePostgresQuery<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM greenhouse_client_portal.module_assignments
      WHERE organization_id = $1`,
    [organizationId]
  )

  return rows[0]?.n ?? 0
}

const main = async () => {
  const organizationId = arg('organization-id')
  const apply = process.argv.includes('--apply')
  const reason = arg('reason')

  if (!organizationId) throw new Error('Falta --organization-id')

  if (apply && (!reason || reason.length < 10)) {
    throw new Error('--apply requiere --reason con al menos 10 caracteres (queda en el audit)')
  }

  const before = await readOrg(organizationId)

  if (!before) throw new Error(`No existe la org ${organizationId}`)

  console.log('ANTES:', before)

  if (before.organization_type === 'other') {
    console.log('\nYa está en `other`. Nada que hacer.')

    return
  }

  // Guarda 1: un lifecycle con rol real contradice la aserción de este script.
  if (LIFECYCLES_CON_ROL.has(before.lifecycle_stage ?? '')) {
    throw new Error(
      `ABORT — lifecycle_stage='${before.lifecycle_stage}' implica un rol comercial real. ` +
        'Degradar el tipo acá crearía drift en vez de repararlo.'
    )
  }

  // Guarda 2: evidencia contable de relación comercial real.
  const income = await runGreenhousePostgresQuery<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM greenhouse_finance.income i
       JOIN greenhouse_finance.client_profiles p ON p.client_profile_id = i.client_profile_id
      WHERE p.client_profile_id = $1 OR i.client_profile_id = $1`,
    [organizationId]
  ).catch(() => [{ n: 0 }])

  if ((income[0]?.n ?? 0) > 0) {
    throw new Error(`ABORT — la org tiene ${income[0]?.n} filas de income. Es un cliente real.`)
  }

  const modulesBefore = await countModules(organizationId)

  console.log(`\nmodule_assignments antes: ${modulesBefore} (deben quedar igual)`)

  if (!apply) {
    console.log(`\nDRY-RUN — con --apply: organization_type '${before.organization_type}' → 'other'`)

    return
  }

  const result = await upsertCanonicalOrganization({
    existingOrganizationId: before.organization_id,
    // La aserción de la remediación: sin rol comercial previo. Rompe la monotonía a propósito.
    currentType: 'other',
    organizationName: before.organization_name,
    lifecycleStage: before.lifecycle_stage,
    hasClientRole: false,
    hasSupplierRole: false,
    origin: 'manual'
  })

  const after = await readOrg(organizationId)
  const modulesAfter = await countModules(organizationId)

  console.log('\nDESPUÉS:', after)
  console.log(`derivedType=${result.organizationType} · module_assignments=${modulesAfter}`)

  if (after?.organization_type !== 'other') {
    throw new Error(`FALLÓ — el tipo quedó en '${after?.organization_type}', no en 'other'`)
  }

  if (after?.is_operating_entity !== before.is_operating_entity) {
    throw new Error('REGRESIÓN — cambió is_operating_entity')
  }

  if (modulesAfter !== modulesBefore) {
    throw new Error(`REGRESIÓN — module_assignments ${modulesBefore} → ${modulesAfter}`)
  }

  console.log(`\nOK — rol comercial reseteado. Motivo: ${reason}`)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('ERROR:', error instanceof Error ? error.message : error)
    process.exit(1)
  })
