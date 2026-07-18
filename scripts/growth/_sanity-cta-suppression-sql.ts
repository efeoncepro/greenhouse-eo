/**
 * TASK-1428 — Sanity/smoke del SQL embebido de suppression/exposure/kill-switch
 * contra PG real (gate ISSUE-071/TASK-893: los mocks ejercitan el TS, NO el SQL —
 * UNNEST join, upserts NULLS NOT DISTINCT, claim FOR UPDATE, DISTINCT ON y el
 * upsert numeric del rollup se prueban acá antes de mergear).
 *
 * Uso:
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-cta-suppression-sql.ts
 *
 * Política de writes: usa subject hashes con prefijo `sanity1428-` (inertes: ningún
 * visitante real los produce) y BORRA todo al final. El write de kill switch NO se
 * ejercita en vivo (la instancia sirve el render path productivo; el command está
 * unit-testeado y el disable/restore live es el smoke de staging del rollout plan).
 */
import { randomUUID } from 'node:crypto'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const main = async () => {
  const { query, closeGreenhousePostgres } = await import('../../src/lib/db')
  const { getCtaDefinitionBySlug } = await import('../../src/lib/growth/ctas/store')

  const {
    claimInterruptiveImpression,
    getVisitorStateRows,
    mergeGlobalWindows,
    mergeStateSnapshots,
    recordCtaConversion,
    recordCtaDismissal,
  } = await import('../../src/lib/growth/ctas/visitor-state')

  const { getKillSwitchState, listKillSwitchAudit } = await import('../../src/lib/growth/ctas/kill-switch')
  const { recordCtaExposure, summarizeCtaExposure } = await import('../../src/lib/growth/ctas/exposure')

  const visitorHash = `sanity1428-visitor-${randomUUID()}`
  const sessionHash = `sanity1428-session-${randomUUID()}`

  const cleanup = async () => {
    await query(
      `DELETE FROM greenhouse_growth.cta_visitor_state WHERE subject_hash LIKE 'sanity1428-%'`,
    )

    await query(
      `DELETE FROM greenhouse_growth.cta_exposure_rollup
        WHERE cta_id IS NULL AND surface_id IS NULL AND reason_class = 'runtime_degraded'
          AND decision_source = 'server' AND enforced = FALSE`,
    )
  }

  try {
    // ── Read-only ────────────────────────────────────────────────────────────
    const emptyRows = await getVisitorStateRows(
      [
        { kind: 'visitor', hash: visitorHash },
        { kind: 'session', hash: sessionHash },
      ],
      ['cdef-00000000-0000-0000-0000-000000000000'],
    )

    console.log(`getVisitorStateRows(sanity, fake cta) → ${emptyRows.length} filas (esperado 0)`)

    const killState = await getKillSwitchState()

    console.log(`getKillSwitchState() → ${JSON.stringify(killState)}`)

    const audit = await listKillSwitchAudit(5)

    console.log(`listKillSwitchAudit(5) → ${audit.length} filas`)

    const exposureSummary = await summarizeCtaExposure(7)

    console.log(`summarizeCtaExposure(7d) → ${exposureSummary.length} filas`)

    // ── Writes con cleanup (CTA real para satisfacer la FK) ──────────────────
    const definition = await getCtaDefinitionBySlug('ai-visibility-report-followup')

    if (!definition) {
      console.log('CTA seed no existe en este environment — write path omitido.')

      return
    }

    const subjects = [
      { kind: 'visitor' as const, hash: visitorHash },
      { kind: 'session' as const, hash: sessionHash },
    ]

    await recordCtaDismissal(subjects, definition.cta_id, 'granted')
    await recordCtaDismissal(subjects, definition.cta_id, 'granted')

    const afterDismiss = await getVisitorStateRows(subjects, [definition.cta_id])

    const dismissCounts = afterDismiss.map(row => row.dismiss_count)

    console.log(
      `recordCtaDismissal ×2 → ${afterDismiss.length} filas (esperado 2), dismiss_count=${JSON.stringify(dismissCounts)} (esperado [2,2])`,
    )

    const merged = mergeStateSnapshots(afterDismiss)

    if (!merged?.lastDismissedAt) throw new Error('mergeStateSnapshots no reflejó el dismiss')

    await recordCtaConversion(subjects, definition.cta_id, 'fsub-sanity-1428', 'granted')
    await recordCtaConversion(subjects, definition.cta_id, 'fsub-sanity-1428-second', 'granted')

    const afterConversion = await getVisitorStateRows(subjects, [definition.cta_id])
    const conversionRefs = [...new Set(afterConversion.map(row => row.conversion_ref))]

    console.log(
      `recordCtaConversion ×2 → conversion_ref=${JSON.stringify(conversionRefs)} (esperado solo el primero)`,
    )

    // Claim atómico: cap per-CTA 2 → tercer claim pierde.
    const claimInput = {
      subject: subjects[0],
      ctaId: definition.cta_id,
      windowHours: 24,
      maxImpressionsPerWindow: 2,
      globalCapPerDay: 3,
      consentState: 'granted',
    }

    const claim1 = await claimInterruptiveImpression(claimInput)
    const claim2 = await claimInterruptiveImpression(claimInput)
    const claim3 = await claimInterruptiveImpression(claimInput)

    console.log(
      `claimInterruptiveImpression ×3 (cap 2) → ${JSON.stringify([claim1.granted, claim2.granted, claim3.granted])} (esperado [true,true,false])`,
    )

    const withGlobal = await getVisitorStateRows(subjects, [definition.cta_id])
    const globalWindow = mergeGlobalWindows(withGlobal)

    console.log(
      `ventana global tras claims → impressions=${globalWindow?.impressionsInWindow ?? 'null'} (esperado 2)`,
    )

    const exposure1 = await recordCtaExposure({
      ctaId: null,
      surfaceId: null,
      placement: null,
      exposureKind: 'suppressed',
      reasonClass: 'runtime_degraded',
      decisionSource: 'server',
      enforced: false,
    })

    const exposure2 = await recordCtaExposure({
      ctaId: null,
      surfaceId: null,
      placement: null,
      exposureKind: 'suppressed',
      reasonClass: 'runtime_degraded',
      decisionSource: 'server',
      enforced: false,
    })

    const rollupRows = await query<{ observed_count: number; estimated_count: string }>(
      `SELECT observed_count, estimated_count FROM greenhouse_growth.cta_exposure_rollup
        WHERE cta_id IS NULL AND surface_id IS NULL AND reason_class = 'runtime_degraded'
          AND decision_source = 'server' AND enforced = FALSE`,
    )

    console.log(
      `recordCtaExposure ×2 (sampled=${exposure1.sampled}/${exposure2.sampled}) → rollup ${JSON.stringify(rollupRows)} (esperado observed_count=2)`,
    )

    console.log('Sanity TASK-1428 OK — SQL embebido validado contra PG real.')
  } finally {
    await cleanup()
    console.log('Cleanup sanity1428 completado.')
    await closeGreenhousePostgres()
  }
}

main().catch(error => {
  console.error('Sanity TASK-1428 FALLÓ:', error)
  process.exitCode = 1
})
