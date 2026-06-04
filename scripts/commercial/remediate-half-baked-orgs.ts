import 'server-only'

/**
 * TASK-991 Slice 3 — Remediación canónica de organizations a medio cocinar.
 *
 * Repara el drift `organization_type` inconsistente con `lifecycle_stage`
 * (active_client + type NOT IN client/both) — la clase de bug que dejó a Grupo
 * Berel invisible en Finanzas. Pasa SIEMPRE por el writer canónico
 * `upsertCanonicalOrganization` (NUNCA SQL directo). Idempotente, allowlist-first,
 * dry-run por default, aborta si el mutation count real difiere del esperado.
 *
 * Uso:
 *   # dry-run de TODAS las orgs drift (read-only, default):
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/commercial/remediate-half-baked-orgs.ts
 *
 *   # apply de una org específica con corrección de identidad (Berel MX/RFC):
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/commercial/remediate-half-baked-orgs.ts \
 *     --apply --actor <user-id> --reason "TASK-991 remediación Berel" \
 *     --allowlist-organization-id org-32333527-02a8-487b-819e-6f76a761777d \
 *     --set-country MX --set-tax-id PBE970101718 --set-tax-id-type RFC \
 *     --set-legal-name "PINTURAS BEREL SA DE CV"
 *
 * Flags:
 *   --apply                          ejecuta (default: dry-run)
 *   --allowlist-organization-id <id> limita a estas orgs (repetible). En dry-run sin
 *                                    allowlist lista TODAS las candidatas.
 *   --actor <user-id>                requerido en --apply
 *   --reason "<>=10 chars>"          requerido en --apply
 *   --max-rows <n>                   tope de seguridad (default 50)
 *   --set-country / --set-tax-id / --set-tax-id-type / --set-legal-name <v>
 *                                    corrección de identidad (requiere exactamente 1 allowlist org)
 */
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { upsertCanonicalOrganization } from '@/lib/account-360/organization-identity'
import { deriveOrganizationType } from '@/lib/account-360/organization-type'

type Candidate = {
  organization_id: string
  organization_name: string | null
  organization_type: string | null
  lifecycle_stage: string | null
  country: string | null
  tax_id: string | null
  legal_name: string | null
  hubspot_company_id: string | null
}

const arg = (name: string): string | undefined => {
  const idx = process.argv.indexOf(name)

  return idx >= 0 ? process.argv[idx + 1] : undefined
}

const argAll = (name: string): string[] => {
  const out: string[] = []

  process.argv.forEach((a, i) => {
    if (a === name && process.argv[i + 1]) out.push(process.argv[i + 1])
  })

  return out
}

const main = async () => {
  const apply = process.argv.includes('--apply')
  const allowlist = argAll('--allowlist-organization-id')
  const actor = arg('--actor')
  const reason = arg('--reason')
  const maxRows = Number(arg('--max-rows') ?? '50')

  const setCountry = arg('--set-country')
  const setTaxId = arg('--set-tax-id')
  const setTaxIdType = arg('--set-tax-id-type')
  const setLegalName = arg('--set-legal-name')
  const hasIdentityOverride = Boolean(setCountry || setTaxId || setTaxIdType || setLegalName)

  if (apply) {
    if (!actor || !reason || reason.trim().length < 10) {
      console.error('FAIL: --apply requiere --actor <id> y --reason "<>=10 chars>".')
      process.exit(1)
    }
  }

  if (hasIdentityOverride && allowlist.length !== 1) {
    console.error('FAIL: las flags --set-* (corrección de identidad) requieren exactamente 1 --allowlist-organization-id.')
    process.exit(1)
  }

  // Candidatas: drift de tipo (active_client + type NOT IN client/both).
  const params: unknown[] = []
  let where = `lifecycle_stage = 'active_client' AND COALESCE(organization_type,'other') NOT IN ('client','both')`

  if (allowlist.length > 0) {
    params.push(allowlist)
    where += ` AND organization_id = ANY($1::text[])`
  }

  const candidates = await runGreenhousePostgresQuery<Candidate>(
    `SELECT organization_id, organization_name, organization_type, lifecycle_stage,
            country, tax_id, legal_name, hubspot_company_id
       FROM greenhouse_core.organizations
      WHERE ${where}
      ORDER BY updated_at DESC
      LIMIT ${maxRows}`,
    params
  )

  console.log(`\n=== TASK-991 remediación — modo ${apply ? 'APPLY' : 'DRY-RUN'} ===`)
  console.log(`candidatas: ${candidates.length}${allowlist.length ? ` (allowlist ${allowlist.length})` : ' (todas)'}`)

  if (candidates.length === 0) {
    console.log('Nada que remediar. Steady state.')
    process.exit(0)
  }

  // Preview before/after.
  const planned = candidates.map(c => {
    const targetType = deriveOrganizationType({
      lifecycleStage: c.lifecycle_stage,
      hasClientRole: c.lifecycle_stage === 'active_client',
      currentType: c.organization_type
    })

    return {
      organization_id: c.organization_id,
      organization_name: c.organization_name,
      before: {
        organization_type: c.organization_type,
        country: c.country,
        tax_id: c.tax_id,
        legal_name: c.legal_name
      },
      after: {
        organization_type: targetType,
        country: hasIdentityOverride && setCountry ? setCountry : c.country,
        tax_id: hasIdentityOverride && setTaxId ? setTaxId : c.tax_id,
        legal_name: hasIdentityOverride && setLegalName ? setLegalName : c.legal_name
      }
    }
  })

  console.log(JSON.stringify(planned, null, 2))
  const expected = planned.length

  console.log(`mutation count esperado: ${expected}`)

  if (!apply) {
    console.log('\nDRY-RUN. Re-corre con --apply --actor <id> --reason "<...>" para ejecutar.')
    process.exit(0)
  }

  console.log(`\nAPPLY por actor=${actor} reason="${reason}"`)

  let mutated = 0

  for (const c of candidates) {
    await upsertCanonicalOrganization({
      existingOrganizationId: c.organization_id,
      currentType: c.organization_type,
      organizationName: c.organization_name ?? '',
      legalName: hasIdentityOverride ? setLegalName ?? null : null,
      taxId: hasIdentityOverride ? setTaxId ?? null : null,
      taxIdType: hasIdentityOverride ? setTaxIdType ?? null : null,
      country: hasIdentityOverride ? setCountry ?? null : null,
      lifecycleStage: c.lifecycle_stage,
      hasClientRole: c.lifecycle_stage === 'active_client',
      overrideIdentity: hasIdentityOverride
    })

    mutated += 1
  }

  if (mutated !== expected) {
    console.error(`ABORT: mutation count real (${mutated}) != esperado (${expected}).`)
    process.exit(1)
  }

  console.log(`✓ remediadas ${mutated} organizations.`)
  process.exit(0)
}

main().catch(err => {
  console.error('FAIL:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
