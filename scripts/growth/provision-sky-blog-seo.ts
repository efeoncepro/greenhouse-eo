/**
 * Provisión SEO/AEO de Sky Airlines para el servicio «Blog SEO/AEO» (licitación Wherex adjudicada
 * el 2026-09-23; deal HubSpot 62535094842; inicio 2026-11-01; transición en octubre).
 *
 * Instrucción del operador (2026-09-24): «nos ganamos la licitación del blog de SKY, debemos
 * asignarle en Greenhouse el módulo de SEO y el de AEO».
 *
 * Qué hace (idempotente, re-ejecutable sin duplicar filas):
 *   1. AEO: sube el tier de `ai_visibility_v1` de `trial` a `contracted` con el command gobernado
 *      `assignAeoTier` (supersede + audit + outbox; el mismo primitive que la route
 *      `/api/admin/growth/ai-visibility/assign-tier`, el cockpit y Nexa). Sky ya tenía el módulo
 *      en trial desde 2026-06-29 (cpma-44c05156…); el perfil del grader EO-GAVP-0015 ya está ligado.
 *   2. SEO target: `skyairline.com` (CL / es / location 2152) en `greenhouse_growth.seo_targets`.
 *      Sin target no hay qué medir; es inerte hasta que exista el assignment `seo_v2`.
 *   3. SEO tier: si ya existe el assignment `seo_v2` (lo crea el apply gobernado de habilitación,
 *      `applyServiceEnablement`, que NO pasa metadata) y no declara `seo_tier`, lo fija en
 *      `contracted` con el UPDATE canónico del manual `asignar-modulo-seo-organizacion.md`.
 *      Si aún no existe, lo reporta: el assignment nace por el preview/apply con el término del
 *      servicio del blog (`bundled_modules=[seo_v2, ai_visibility_v1]`), nunca por INSERT acá.
 *   4. Verifica con los chokepoints reales (`resolveSeoEntitlement`, `resolveAeoEntitlement`).
 *
 * Usage:
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/provision-sky-blog-seo.ts [--apply]
 *
 * Sin `--apply` es dry-run: reporta el estado actual y lo que haría, sin escribir.
 */

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')
process.env.GROWTH_SEO_ENABLED ??= 'true'

import { query } from '@/lib/db'

/** Sky Airlines — organización canónica verificada 2026-09-24 (misma de TASK-1852). */
const ORGANIZATION_ID = 'org-b9977f96-f7ef-4afb-bb26-7355d78c981f'
const SEO_TARGET_ID = 'seot-sky-blog-cl'
const ROOT_DOMAIN = 'skyairline.com'
/** DataForSEO location_code Chile (mismo que Efeonce own-brand y Berel fase 0). */
const LOCATION_CODE = '2152'
const LANGUAGE_CODE = 'es'
const MARKET = 'CL'

/** Persona superadmin provisionada por migración; queda en audit/outbox como actor (precedente TASK-1679). */
const APPROVED_BY_USER_ID = 'user-agent-e2e-001'

const REASON =
  'Sky Airlines adjudicó a Efeonce el servicio Blog SEO/AEO (Wherex) el 2026-09-23 — deal HubSpot 62535094842, ' +
  'CLP 3.000.000 netos/mes × 24 meses, inicio 2026-11-01, transición en octubre. Instrucción del operador 2026-09-24: ' +
  'asignar los módulos SEO y AEO a Sky en Greenhouse.'

const APPLY = process.argv.includes('--apply')

interface AssignmentRow extends Record<string, unknown> {
  assignment_id: string
  module_key: string
  status: string
  metadata_json: Record<string, unknown> | null
}

const readOpenAssignments = () =>
  query<AssignmentRow>(
    `SELECT assignment_id, module_key, status, metadata_json
       FROM greenhouse_client_portal.module_assignments
      WHERE organization_id = $1 AND effective_to IS NULL AND status IN ('active', 'pilot')
      ORDER BY module_key`,
    [ORGANIZATION_ID]
  )

const main = async () => {
  const orgRows = await query<{ organization_name: string }>(
    `SELECT organization_name FROM greenhouse_core.organizations WHERE organization_id = $1`,
    [ORGANIZATION_ID]
  )

  if (orgRows.length === 0) throw new Error(`Organización ${ORGANIZATION_ID} no existe`)

  const before = await readOpenAssignments()
  const aeoBefore = before.find(row => row.module_key === 'ai_visibility_v1')
  const seoBefore = before.find(row => row.module_key === 'seo_v2')

  const targetBefore = await query<{ seo_target_id: string; status: string }>(
    `SELECT seo_target_id, status FROM greenhouse_growth.seo_targets WHERE organization_id = $1 AND root_domain = $2 AND market = $3`,
    [ORGANIZATION_ID, ROOT_DOMAIN, MARKET]
  )

  console.log(`Organización: ${orgRows[0].organization_name} (${ORGANIZATION_ID})`)
  console.log(`Módulos vigentes ANTES: ${before.map(r => `${r.module_key}[${r.status}${r.metadata_json?.aeo_tier ? ` aeo_tier=${String(r.metadata_json.aeo_tier)}` : ''}${r.metadata_json?.seo_tier ? ` seo_tier=${String(r.metadata_json.seo_tier)}` : ''}]`).join(', ') || '(ninguno)'}`)
  console.log(`Target SEO ${ROOT_DOMAIN}/${MARKET} ANTES: ${targetBefore[0] ? `${targetBefore[0].seo_target_id}[${targetBefore[0].status}]` : '(ninguno)'}\n`)

  console.log('Plan:')
  console.log(`  1. AEO tier → contracted ${aeoBefore ? `(hoy ${String(aeoBefore.metadata_json?.aeo_tier ?? 'sin tier')}, ${aeoBefore.assignment_id})` : '(hoy sin módulo AEO)'}`)
  console.log(`  2. seo_target ${SEO_TARGET_ID} = ${ROOT_DOMAIN} ${MARKET}/${LANGUAGE_CODE} (${targetBefore[0] ? 'ya existe → asegurar active' : 'crear'})`)
  console.log(`  3. seo_v2 tier → contracted ${seoBefore ? `(assignment ${seoBefore.assignment_id}, hoy ${String(seoBefore.metadata_json?.seo_tier ?? 'sin tier')})` : '(assignment seo_v2 AUSENTE: lo crea el apply gobernado de habilitación; acá no se inserta)'}`)

  if (!APPLY) {
    console.log('\nDRY-RUN — sin `--apply` no se escribe nada. Vuelve a correr con --apply para aplicar.')
    process.exit(0)
  }

  // 1. AEO tier contracted — command gobernado (supersede + audit + outbox), idempotente.
  const { assignAeoTier } = await import('@/lib/growth/ai-visibility/assign-tier')
  const aeo = await assignAeoTier({ organizationId: ORGANIZATION_ID, tier: 'contracted', reason: REASON, requestedBy: APPROVED_BY_USER_ID })

  console.log(`\n1. AEO: assignment ${aeo.assignmentId} status=${aeo.status} tier=${aeo.tier} idempotent=${aeo.idempotent}${aeo.supersededAssignmentId ? ` (supersede ${aeo.supersededAssignmentId})` : ''}; perfil grader ${aeo.profile?.publicId ?? aeo.profile?.profileId ?? '(sin cambio)'}`)

  // 2. SEO target — idempotente por UNIQUE (org, dominio, mercado).
  const target = await query<{ seo_target_id: string }>(
    `INSERT INTO greenhouse_growth.seo_targets
       (seo_target_id, organization_id, root_domain, location_code, language_code, market, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT ON CONSTRAINT seo_targets_org_domain_market_unique DO UPDATE SET status = 'active', updated_at = NOW()
     RETURNING seo_target_id`,
    [SEO_TARGET_ID, ORGANIZATION_ID, ROOT_DOMAIN, LOCATION_CODE, LANGUAGE_CODE, MARKET, 'operador-2026-09-24']
  )

  console.log(`2. seo_target: ${target[0].seo_target_id} (${ROOT_DOMAIN}, ${MARKET}/${LANGUAGE_CODE}) active`)

  // 3. SEO tier — sólo si el assignment ya nació por el apply gobernado.
  const seoNow = (await readOpenAssignments()).find(row => row.module_key === 'seo_v2')

  if (!seoNow) {
    console.log('3. seo_v2: assignment AUSENTE → pendiente del preview/apply de habilitación con el término del servicio del blog. No se inserta acá.')
  } else if (seoNow.metadata_json?.seo_tier === 'contracted') {
    console.log(`3. seo_v2: ${seoNow.assignment_id} ya declara seo_tier=contracted`)
  } else {
    await query(
      `UPDATE greenhouse_client_portal.module_assignments
          SET metadata_json = COALESCE(metadata_json, '{}'::jsonb) || '{"seo_tier":"contracted"}'::jsonb
        WHERE assignment_id = $1 AND effective_to IS NULL`,
      [seoNow.assignment_id]
    )
    console.log(`3. seo_v2: ${seoNow.assignment_id} seo_tier ${String(seoNow.metadata_json?.seo_tier ?? 'sin tier')} → contracted`)
  }

  // 4. Verificación con los chokepoints reales.
  const { resolveSeoEntitlement } = await import('@/lib/growth/seo/entitlement')
  const { resolveAeoEntitlement } = await import('@/lib/growth/ai-visibility/entitlement')
  const [seo, aeoEnt] = await Promise.all([resolveSeoEntitlement(ORGANIZATION_ID), resolveAeoEntitlement(ORGANIZATION_ID)])

  console.log(`\n4. SEO chokepoint → hasModule=${seo.hasModule} tier=${seo.tier} audits=${seo.allowanceRemaining}/${seo.allowanceCap} budgetUsd=${seo.budgetRemainingUsd}/${seo.budgetCapUsd} blocked=${seo.blockedReason}`)
  console.log(`   AEO chokepoint → hasModule=${aeoEnt.hasModule} tier=${aeoEnt.tier} runs=${aeoEnt.allowanceRemaining}/${aeoEnt.allowanceCap} blocked=${aeoEnt.blockedReason}`)

  const after = await readOpenAssignments()

  console.log(`Módulos vigentes DESPUÉS: ${after.map(r => `${r.module_key}[${r.status}${r.metadata_json?.aeo_tier ? ` aeo_tier=${String(r.metadata_json.aeo_tier)}` : ''}${r.metadata_json?.seo_tier ? ` seo_tier=${String(r.metadata_json.seo_tier)}` : ''}]`).join(', ')}`)
  console.log(aeoEnt.hasModule && aeoEnt.tier === 'contracted' ? (seo.hasModule && seo.tier === 'contracted' ? '✓ provisión completa (SEO + AEO contracted)' : '◐ AEO listo; SEO pendiente del apply gobernado de habilitación') : '✗ revisar AEO')
  process.exit(0)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
