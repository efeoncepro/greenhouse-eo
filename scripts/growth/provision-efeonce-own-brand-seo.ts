/**
 * Provisión own-brand de Efeonce (aprobada por el operador, 2026-08-05):
 *   1. Liga los perfiles del grader "Efeonce*" reales (no-smoke, org NULL) a la org
 *      canónica EO-ORG-0007 (Efeonce Group SpA) — cierre parcial del gap §2.A del
 *      programa AEO para la marca propia.
 *   2. Crea el assignment `seo_v1` (tier contracted, nota own_brand) — patrón dogfooding:
 *      Efeonce es su propio cliente y su gasto DataForSEO queda bajo el mismo chokepoint.
 *
 * Idempotente: re-ejecutarlo no duplica nada. Verifica al final con el chokepoint real.
 *
 * Uso (proxy en 127.0.0.1:15432):
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/provision-efeonce-own-brand-seo.ts
 */
import { config } from 'dotenv'

config({ path: '.env.local' })
process.env.GREENHOUSE_POSTGRES_HOST = '127.0.0.1'
process.env.GREENHOUSE_POSTGRES_PORT = '15432'
process.env.GREENHOUSE_POSTGRES_SSL = 'false'
delete process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
process.env.GREENHOUSE_POSTGRES_USER = process.env.GREENHOUSE_POSTGRES_OPS_USER
process.env.GREENHOUSE_POSTGRES_PASSWORD = process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD
process.env.GROWTH_SEO_ENABLED = 'true'

/** Efeonce (EO-ORG-0007) — Efeonce Group SpA, is_operating_entity=true, canónica verificada 2026-08-05. */
const EFEONCE_ORG_ID = 'org-2df565fb-98aa-42f7-b324-ea9a2209017f'

const main = async () => {
  const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')
  const { resolveSeoEntitlement } = await import('@/lib/growth/seo/entitlement')

  // 1. Ligar perfiles grader reales de Efeonce (no-smoke) a la org canónica.
  const bound = await runGreenhousePostgresQuery<{ public_id: string; brand_name: string }>(
    `UPDATE greenhouse_growth.grader_profiles
        SET organization_id = $1
      WHERE brand_name ILIKE '%efeonce%'
        AND brand_name NOT ILIKE '%smok%'
        AND organization_id IS NULL
      RETURNING public_id, brand_name`,
    [EFEONCE_ORG_ID]
  )

  console.log('1. perfiles ligados a EO-ORG-0007:', bound.length ? bound.map(r => r.public_id).join(', ') : '(ya estaban ligados)')

  // 2. Assignment seo_v1 own-brand (idempotente).
  const existing = await runGreenhousePostgresQuery<{ assignment_id: string }>(
    `SELECT assignment_id FROM greenhouse_client_portal.module_assignments
      WHERE organization_id = $1 AND module_key = 'seo_v1'
        AND effective_to IS NULL AND status IN ('active','pilot')`,
    [EFEONCE_ORG_ID]
  )

  if (existing.length) {
    console.log('2. assignment seo_v1 ya existe:', existing[0].assignment_id)
  } else {
    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_client_portal.module_assignments
         (assignment_id, organization_id, module_key, status, source, source_ref_json, effective_from, metadata_json)
       VALUES ('cpma-efeonce-seo-own-brand', $1, 'seo_v1', 'active', 'manual_admin',
               '{"note":"Efeonce own brand (dogfooding) — aprobado por operador 2026-08-05"}'::jsonb,
               CURRENT_DATE, '{"seo_tier":"contracted","note":"own_brand"}'::jsonb)`,
      [EFEONCE_ORG_ID]
    )
    console.log('2. assignment seo_v1 creado: cpma-efeonce-seo-own-brand (contracted, own_brand)')
  }

  // 2b. Target SEO own-brand (config; idempotente por UNIQUE org+dominio+mercado).
  const target = await runGreenhousePostgresQuery<{ seo_target_id: string }>(
    `INSERT INTO greenhouse_growth.seo_targets
       (seo_target_id, organization_id, root_domain, location_code, language_code, market, created_by)
     VALUES ('seot-efeonce-own-brand', $1, 'efeoncepro.com', '2152', 'es', 'CL', 'operador-2026-08-05')
     ON CONFLICT ON CONSTRAINT seo_targets_org_domain_market_unique DO UPDATE SET status = 'active'
     RETURNING seo_target_id`,
    [EFEONCE_ORG_ID]
  )

  console.log('2b. seo_target own-brand:', target[0].seo_target_id, '(efeoncepro.com, CL/es)')

  // 3. Verificación con el chokepoint real.
  const entitlement = await resolveSeoEntitlement(EFEONCE_ORG_ID)

  console.log(
    '3. chokepoint → hasModule:', entitlement.hasModule,
    '| tier:', entitlement.tier,
    '| audits restantes:', entitlement.allowanceRemaining,
    '| budget USD:', entitlement.budgetRemainingUsd,
    '| blockedReason:', entitlement.blockedReason
  )

  const aeo = await runGreenhousePostgresQuery<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM greenhouse_growth.grader_profiles WHERE organization_id = $1`,
    [EFEONCE_ORG_ID]
  )

  console.log('4. perfiles grader ligados a Efeonce:', aeo[0].n, '→ lente AEO', aeo[0].n > 0 ? 'DISPONIBLE' : 'ausente')
  console.log(entitlement.hasModule && entitlement.tier === 'contracted' ? '✓ provisión completa' : '✗ revisar')
  process.exit(entitlement.hasModule ? 0 : 1)
}

void main()
