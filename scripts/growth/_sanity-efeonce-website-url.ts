/**
 * Pendiente operativo del 2026-08-05: la org canónica de Efeonce (EO-ORG-0007) no tenía
 * `website_url`. El valor lo confirmó el operador: efeoncepro.com.
 *
 * Entra por la puerta canónica `upsertCanonicalOrganization` (SSOT del write de
 * `greenhouse_core.organizations`), NUNCA por UPDATE directo: esa puerta normaliza la URL
 * con `normalizeWebsiteUrl` y deriva `organization_type` en vez de dejar que alguien lo
 * hand-setee inconsistente con el lifecycle.
 *
 * NO usa `overrideIdentity`: en el path por defecto el UPDATE es
 * `COALESCE(NULLIF(website_url, ''), $11)`, o sea sólo escribe si estaba vacío. Si otra
 * sesión ya puso una URL, este script la respeta en vez de pisarla.
 *
 * Uso (proxy en 127.0.0.1:15432):
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-efeonce-website-url.ts
 */
import { config } from 'dotenv'

config({ path: '.env.local' })
process.env.GREENHOUSE_POSTGRES_HOST = '127.0.0.1'
process.env.GREENHOUSE_POSTGRES_PORT = '15432'
process.env.GREENHOUSE_POSTGRES_SSL = 'false'
delete process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME

import { upsertCanonicalOrganization } from '@/lib/account-360/organization-identity'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const PUBLIC_ID = 'EO-ORG-0007'
const WEBSITE_URL = 'efeoncepro.com'

type OrgRow = {
  organization_id: string
  public_id: string | null
  organization_name: string
  organization_type: string | null
  website_url: string | null
  is_operating_entity: boolean | null
}

const readOrg = async () => {
  // runGreenhousePostgresQuery devuelve las filas directo, NO un { rows }.
  const rows = await runGreenhousePostgresQuery<OrgRow>(
    `SELECT organization_id, public_id, organization_name, organization_type,
            website_url, is_operating_entity
     FROM greenhouse_core.organizations
     WHERE public_id = $1`,
    [PUBLIC_ID]
  )

  return rows[0] ?? null
}

const main = async () => {
  const before = await readOrg()

  if (!before) {
    throw new Error(`No existe la org ${PUBLIC_ID} — abortando sin escribir nada.`)
  }

  console.log('ANTES:', {
    organizationId: before.organization_id,
    name: before.organization_name,
    type: before.organization_type,
    websiteUrl: before.website_url,
    isOperatingEntity: before.is_operating_entity
  })

  if (before.website_url && before.website_url.trim() !== '') {
    console.log(`\nYa tiene website_url ("${before.website_url}"). No se escribe nada.`)

    return
  }

  const result = await upsertCanonicalOrganization({
    existingOrganizationId: before.organization_id,
    // Preserva el tipo: deriveOrganizationType lo reusa vía isClient/isSupplierCapable.
    currentType: before.organization_type,
    organizationName: before.organization_name,
    websiteUrl: WEBSITE_URL,
    origin: 'manual'
  })

  const after = await readOrg()

  console.log('\nDESPUÉS:', {
    organizationId: result.organizationId,
    derivedType: result.organizationType,
    websiteUrl: after?.website_url,
    typeEnDb: after?.organization_type
  })

  if (after?.organization_type !== before.organization_type) {
    throw new Error(
      `REGRESIÓN de organization_type: ${before.organization_type} → ${after?.organization_type}`
    )
  }

  console.log('\nOK — website_url poblada y organization_type sin cambios.')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('FALLÓ:', error instanceof Error ? error.message : error)
    process.exit(1)
  })
