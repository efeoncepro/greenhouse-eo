/**
 * Habilitación SEO/AEO de Sky Airlines para el servicio «Blog SEO/AEO» (licitación Wherex adjudicada el
 * 2026-09-23; deal HubSpot 62535094842; SERVICE HubSpot 591725750952 → `SVC-HS-591725750952`).
 *
 * Autorización del operador (2026-09-24): «Te autorizo para que avances end-to-end». Cada paso usa el
 * primitive canónico de su dominio — nunca SQL suelto sobre servicios, términos o assignments — y es
 * idempotente: re-ejecutar no duplica términos, assignments ni operaciones.
 *
 *   1. Términos del servicio (`declareCommercialTerms`): kind committed, CLP 3.000.000/mes,
 *      `bundledModules=[seo_v2, ai_visibility_v1]`. Se omite si el término vigente ya bundlea ambos.
 *   2. Preview de habilitación (`previewServiceEnablement`): inventario, cambios, blockers, fingerprint.
 *   3. Apply (`applyServiceEnablement`) con clave de idempotencia fija: crea `seo_v2` y conserva
 *      `ai_visibility_v1` (ya contracted por `scripts/growth/provision-sky-blog-seo.ts`). Requiere
 *      `CLIENT_SERVICE_ENABLEMENT_WRITES_ENABLED=true` (ON en producción desde 2026-09-10; acá se fija
 *      en el proceso porque el primitive lo lee del env).
 *   4. Tier SEO: el apply no pasa metadata, así que el assignment nuevo nace sin `seo_tier`; se fija
 *      `contracted` con el UPDATE canónico del manual `asignar-modulo-seo-organizacion.md`.
 *   5. Verificación con los chokepoints reales de SEO y AEO.
 *
 * Actor: `user-agent-e2e-001` (persona superadmin provisionada por migración, precedente TASK-1679 y
 * términos de TASK-1852 «por instrucción del operador»). La autoridad humana es la autorización
 * explícita del operador registrada en TASK-1852 (Delta 2026-09-24); el recibo la etiqueta con el
 * default del primitive (`app_session`) porque no hubo bearer delegado.
 *
 * Usage:
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/client-portal/enable-sky-blog-seo-aeo.ts [--apply]
 *
 * Sin `--apply`: lee el servicio, el término vigente y el preview; no escribe.
 */

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')
process.env.GROWTH_SEO_ENABLED ??= 'true'

import { query } from '@/lib/db'

const ORGANIZATION_ID = 'org-b9977f96-f7ef-4afb-bb26-7355d78c981f'
const SERVICE_ID = 'SVC-HS-591725750952'
const MODULE_KEYS = ['seo_v2', 'ai_visibility_v1'] as const
const PERSON_IDS = ['user-hubspot-contact-139243510680', 'user-hubspot-contact-157404441684', 'user-hubspot-contact-157404441685']
const ACTOR_USER_ID = 'user-agent-e2e-001'
const IDEMPOTENCY_KEY = 'task1852-sky-blog-apply-1'

const TERMS_REASON =
  'Licitación Blog SEO/AEO (Wherex) adjudicada el 2026-09-23 — deal HubSpot 62535094842: CLP 3.000.000 netos/mes + IVA × 24 meses ' +
  '(TCV 72M), capacidad gobernada 45–50 contenidos/mes + newsletter; inicio del servicio 2026-11-01, transición en octubre (kickoff ' +
  '2026-09-28). Término vigente desde hoy para habilitar SEO/AEO durante la transición; facturación desde 2026-11-01. Marketing de ' +
  'contenidos sin módulo de portal en el catálogo. Servicio distinto de la Agencia Creativa (SVC-HS-551519372424). Autorización ' +
  'end-to-end del operador 2026-09-24.'

const APPLY = process.argv.includes('--apply')

const main = async () => {
  const service = await query<{ name: string; status: string; active: boolean; hubspot_sync_status: string | null; organization_id: string }>(
    `SELECT name, status, active, hubspot_sync_status, organization_id FROM greenhouse_core.services WHERE service_id = $1`,
    [SERVICE_ID]
  )

  if (!service[0]) throw new Error(`${SERVICE_ID} no existe en greenhouse_core.services: sincronizar primero desde HubSpot`)
  if (service[0].organization_id !== ORGANIZATION_ID) throw new Error(`${SERVICE_ID} pertenece a ${service[0].organization_id}, no a Sky`)
  console.log(`Servicio: ${service[0].name} (${SERVICE_ID}) status=${service[0].status} active=${service[0].active} sync=${service[0].hubspot_sync_status}`)

  const { getActiveCommercialTerms, declareCommercialTerms } = await import('@/lib/commercial/sample-sprints/commercial-terms')
  const terms = await getActiveCommercialTerms(SERVICE_ID)
  const termsOk = terms !== null && MODULE_KEYS.every(key => terms.bundledModules.includes(key))

  console.log(`Término vigente: ${terms ? `${terms.termsId} kind=${terms.termsKind} bundled=[${terms.bundledModules.join(', ')}]` : '(ninguno)'} → ${termsOk ? 'OK' : 'declarar'}`)

  if (!termsOk) {
    if (!APPLY) console.log('  DRY-RUN: declararía términos committed, CLP 3.000.000/mes, bundled [seo_v2, ai_visibility_v1]')
    else {
      const declared = await declareCommercialTerms({
        serviceId: SERVICE_ID, kind: 'committed', effectiveFrom: new Date().toISOString().slice(0, 10), monthlyAmountClp: 3_000_000,
        successCriteria: null, bundledModules: [...MODULE_KEYS], reason: TERMS_REASON, declaredBy: ACTOR_USER_ID
      })

      console.log(`  1. términos declarados: ${declared.termsId}`)
    }
  }

  const { previewServiceEnablement } = await import('@/lib/client-portal/enablement/reader')
  const request = { organizationId: ORGANIZATION_ID, targets: MODULE_KEYS.map(moduleKey => ({ serviceId: SERVICE_ID, moduleKey })), personIds: PERSON_IDS }
  const preview = await previewServiceEnablement(request)

  console.log(`\n2. preview canApply=${preview.canApply} fingerprint=${preview.fingerprint}`)
  for (const change of preview.changes) console.log(`   change ${change.action} ${change.moduleKey} (terms ${change.termsId}, assignment ${change.assignmentId ?? '-'})`)
  for (const blocker of preview.blockers) console.log(`   BLOCKER ${blocker.code} ${blocker.subject} (${blocker.owner})`)
  for (const item of preview.readiness) console.log(`   readiness ${item.code} ${item.subject}`)
  for (const person of preview.people) console.log(`   person ${person.id}: +${person.views.filter(v => !v.before && v.after).map(v => v.viewCode).join(',') || '-'}`)

  if (!APPLY) {
    console.log('\nDRY-RUN — sin `--apply` no se escribe nada.')
    process.exit(0)
  }

  if (!preview.canApply) throw new Error('Preview con blockers: no se aplica')

  // Re-ejecución: si todo es `preserve`, no hay alta que aplicar. Reusar la clave con otro fingerprint
  // daría 409 idempotency_conflict por contrato (mismo command key, payload distinto).
  const applied = preview.changes.some(change => change.action === 'enable')
    ? await (async () => {
        process.env.CLIENT_SERVICE_ENABLEMENT_WRITES_ENABLED = 'true'
        const { applyServiceEnablement } = await import('@/lib/client-portal/enablement/commands')

        return applyServiceEnablement({ proposal: request, fingerprint: preview.fingerprint, idempotencyKey: IDEMPOTENCY_KEY }, ACTOR_USER_ID)
      })()
    : null

  if (applied) console.log(`\n3. apply operación=${applied.data.operationId} replayed=${applied.replayed} actor=${applied.data.actorUserId} created=[${applied.data.created.map(c => `${c.moduleKey}:${c.assignmentId}`).join(', ')}] preserved=[${applied.data.preserved.join(', ')}]`)
  else console.log('\n3. apply omitido: todos los cambios son preserve (ya aplicado; operación previa en el recibo de la task)')


  const seo = await query<{ assignment_id: string; metadata_json: Record<string, unknown> | null }>(
    `SELECT assignment_id, metadata_json FROM greenhouse_client_portal.module_assignments
      WHERE organization_id = $1 AND module_key = 'seo_v2' AND effective_to IS NULL AND status IN ('active','pilot') ORDER BY created_at DESC LIMIT 1`,
    [ORGANIZATION_ID]
  )

  if (!seo[0]) throw new Error('seo_v2 sigue ausente tras el apply')

  if (seo[0].metadata_json?.seo_tier === 'contracted') console.log(`4. seo_v2 ${seo[0].assignment_id} ya declara seo_tier=contracted`)
  else {
    await query(
      `UPDATE greenhouse_client_portal.module_assignments
          SET metadata_json = COALESCE(metadata_json, '{}'::jsonb) || '{"seo_tier":"contracted"}'::jsonb
        WHERE assignment_id = $1 AND effective_to IS NULL`,
      [seo[0].assignment_id]
    )
    console.log(`4. seo_v2 ${seo[0].assignment_id}: seo_tier → contracted`)
  }

  const { resolveSeoEntitlement } = await import('@/lib/growth/seo/entitlement')
  const { resolveAeoEntitlement } = await import('@/lib/growth/ai-visibility/entitlement')
  const [seoEnt, aeoEnt] = await Promise.all([resolveSeoEntitlement(ORGANIZATION_ID), resolveAeoEntitlement(ORGANIZATION_ID)])

  console.log(`\n5. SEO chokepoint → hasModule=${seoEnt.hasModule} tier=${seoEnt.tier} audits=${seoEnt.allowanceRemaining}/${seoEnt.allowanceCap} budgetUsd=${seoEnt.budgetRemainingUsd}/${seoEnt.budgetCapUsd} blocked=${seoEnt.blockedReason}`)
  console.log(`   AEO chokepoint → hasModule=${aeoEnt.hasModule} tier=${aeoEnt.tier} runs=${aeoEnt.allowanceRemaining}/${aeoEnt.allowanceCap} blocked=${aeoEnt.blockedReason}`)
  console.log(seoEnt.hasModule && seoEnt.tier === 'contracted' && aeoEnt.hasModule && aeoEnt.tier === 'contracted' ? '✓ Sky: SEO + AEO contracted' : '✗ revisar')
  process.exit(0)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
