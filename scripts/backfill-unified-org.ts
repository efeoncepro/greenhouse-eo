/**
 * Unified Organization Model — Backfill Script
 *
 * Idempotent. Safe to run multiple times.
 *
 * Steps:
 *   2a. Classify existing orgs as 'client' (those with active spaces)
 *   2b. Backfill income.organization_id via spaces bridge
 *   2c. Link suppliers to existing orgs by tax_id match
 *   2d. Create new orgs for suppliers without a match
 *   2e. Mark orgs that are both client AND supplier as 'both'
 *   2f. Report results
 *
 * Usage:
 *   npx tsx scripts/backfill-unified-org.ts
 */
import { randomUUID } from 'node:crypto'
import { runGreenhousePostgresQuery } from '../src/lib/postgres/client'

// Inline id-generation functions to avoid server-only import chain
const generateOrganizationId = () => `org-${randomUUID()}`

const nextPublicId = async (prefix: string): Promise<string> => {
  const seqMap: Record<string, string> = {
    'EO-ORG': 'greenhouse_core.seq_organization_public_id'
  }
  const seqName = seqMap[prefix]
  if (!seqName) throw new Error(`Unknown prefix: ${prefix}`)
  const rows = await runGreenhousePostgresQuery<{ nextval: string }>(
    `SELECT nextval('${seqName}')::text`
  )
  return `${prefix}-${String(rows[0].nextval).padStart(4, '0')}`
}

type SupplierRow = {
  supplier_id: string
  legal_name: string
  trade_name: string | null
  tax_id: string
  tax_id_type: string | null
  country_code: string
}

const main = async () => {
  console.log('═══ Unified Organization Model — Backfill ═══\n')

  // ── 2a. Classify existing orgs as 'client' ─────────────────────────

  console.log('2a. Classifying existing organizations as client...')

  const clientResult = await runGreenhousePostgresQuery<{ count: string }>(`
    WITH updated AS (
      UPDATE greenhouse_core.organizations o
      SET organization_type = 'client', updated_at = NOW()
      WHERE (organization_type = 'other' OR organization_type IS NULL)
        AND EXISTS (
          SELECT 1 FROM greenhouse_core.spaces s
          WHERE s.organization_id = o.organization_id
            AND s.client_id IS NOT NULL AND s.active = TRUE
        )
      RETURNING 1
    )
    SELECT COUNT(*)::text AS count FROM updated
  `)

  console.log(`   ✅ ${clientResult[0]?.count ?? 0} organizations classified as 'client'\n`)

  // ── 2b. Backfill income.organization_id via spaces ────────────────

  console.log('2b. Backfilling income.organization_id via spaces bridge...')

  const incomeResult = await runGreenhousePostgresQuery<{ count: string }>(`
    WITH updated AS (
      UPDATE greenhouse_finance.income i
      SET organization_id = s.organization_id, updated_at = NOW()
      FROM greenhouse_core.spaces s
      WHERE i.client_id = s.client_id
        AND s.organization_id IS NOT NULL AND s.active = TRUE
        AND i.organization_id IS NULL
      RETURNING 1
    )
    SELECT COUNT(*)::text AS count FROM updated
  `)

  console.log(`   ✅ ${incomeResult[0]?.count ?? 0} incomes linked to organizations\n`)

  // ── 2c. Link suppliers to existing orgs by tax_id ─────────────────

  console.log('2c. Linking suppliers to existing organizations by tax_id...')

  const supplierLinkResult = await runGreenhousePostgresQuery<{ count: string }>(`
    WITH updated AS (
      UPDATE greenhouse_finance.suppliers sup
      SET organization_id = o.organization_id, updated_at = NOW()
      FROM greenhouse_core.organizations o
      WHERE sup.tax_id = o.tax_id
        AND sup.tax_id IS NOT NULL AND o.tax_id IS NOT NULL
        AND sup.organization_id IS NULL
      RETURNING 1
    )
    SELECT COUNT(*)::text AS count FROM updated
  `)

  console.log(`   ✅ ${supplierLinkResult[0]?.count ?? 0} suppliers linked to existing organizations\n`)

  // ── 2d. Create organizations for unlinked suppliers ───────────────

  console.log('2d. Creating organizations for suppliers without org match...')

  const unlinkedSuppliers = await runGreenhousePostgresQuery<SupplierRow>(`
    SELECT supplier_id, legal_name, trade_name, tax_id, tax_id_type, country_code
    FROM greenhouse_finance.suppliers
    WHERE tax_id IS NOT NULL AND tax_id <> ''
      AND organization_id IS NULL
    ORDER BY legal_name
  `)

  let suppliersCreated = 0

  for (const sup of unlinkedSuppliers) {
    const organizationId = generateOrganizationId()
    const publicId = await nextPublicId('EO-ORG')

    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_core.organizations (
        organization_id, public_id, organization_name, legal_name,
        tax_id, tax_id_type, country, organization_type,
        status, active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'supplier', 'active', TRUE, NOW(), NOW())`,
      [
        organizationId,
        publicId,
        sup.trade_name || sup.legal_name,
        sup.legal_name,
        sup.tax_id,
        sup.tax_id_type || null,
        sup.country_code || 'CL'
      ]
    )

    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_finance.suppliers SET organization_id = $1, updated_at = NOW()
       WHERE supplier_id = $2`,
      [organizationId, sup.supplier_id]
    )

    console.log(`   [${sup.supplier_id}] → ${organizationId} (${sup.tax_id}, ${sup.legal_name})`)
    suppliersCreated++
  }

  console.log(`   ✅ ${suppliersCreated} new organizations created for suppliers\n`)

  // ── 2e. Mark orgs that are client AND supplier as 'both' ──────────

  console.log('2e. Marking organizations that are both client and supplier...')

  const bothResult = await runGreenhousePostgresQuery<{ count: string }>(`
    WITH updated AS (
      UPDATE greenhouse_core.organizations o
      SET organization_type = 'both', updated_at = NOW()
      WHERE o.organization_type IN ('client', 'supplier')
        AND EXISTS (
          SELECT 1 FROM greenhouse_core.spaces s
          WHERE s.organization_id = o.organization_id
            AND s.client_id IS NOT NULL AND s.active = TRUE
        )
        AND EXISTS (
          SELECT 1 FROM greenhouse_finance.suppliers sup
          WHERE sup.organization_id = o.organization_id AND sup.is_active = TRUE
        )
      RETURNING 1
    )
    SELECT COUNT(*)::text AS count FROM updated
  `)

  console.log(`   ✅ ${bothResult[0]?.count ?? 0} organizations marked as 'both'\n`)

  // ── 2f. Report ────────────────────────────────────────────────────

  console.log('═══ Results ═══\n')

  const typeCounts = await runGreenhousePostgresQuery<{ organization_type: string; count: string }>(`
    SELECT COALESCE(organization_type, 'null') AS organization_type, COUNT(*)::text AS count
    FROM greenhouse_core.organizations
    GROUP BY 1 ORDER BY 1
  `)

  console.log('Organization types:')

  for (const row of typeCounts) {
    console.log(`   ${row.organization_type}: ${row.count}`)
  }

  const incomeCounts = await runGreenhousePostgresQuery<{ total: string; con_org: string }>(`
    SELECT COUNT(*)::text AS total, COUNT(organization_id)::text AS con_org
    FROM greenhouse_finance.income
  `)

  console.log(`\nIncomes: ${incomeCounts[0]?.con_org ?? 0} / ${incomeCounts[0]?.total ?? 0} with organization_id`)

  const supplierCounts = await runGreenhousePostgresQuery<{ total: string; con_org: string }>(`
    SELECT COUNT(*)::text AS total, COUNT(organization_id)::text AS con_org
    FROM greenhouse_finance.suppliers
  `)

  console.log(`Suppliers: ${supplierCounts[0]?.con_org ?? 0} / ${supplierCounts[0]?.total ?? 0} with organization_id`)

  console.log('\n═══ Done ═══')
  process.exit(0)
}

main().catch(err => {
  console.error('Backfill failed:', err)
  process.exit(1)
})
