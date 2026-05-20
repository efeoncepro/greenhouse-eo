import 'server-only'

import { listDemoMembers, registerDemoMember } from '@/lib/identity/demo-members'

/**
 * TASK-910 Slice 1 — Setup canonical de 5 demo members sintéticos para el
 * teamspace `Demo Greenhouse` Notion.
 *
 * **Idempotente**: re-correr el script con los mismos emails actualiza (NO
 * crea duplicates) — UPSERT canonical en `registerDemoMember`.
 *
 * **Usage**:
 *
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/notion-metrics/setup-demo-members.ts
 *
 *   # Optional: pasa --dry-run para listar lo que va a insertar sin tocar PG
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/notion-metrics/setup-demo-members.ts --dry-run
 *
 * **Members canonical V1** (5 perfiles representativos pattern Efeonce):
 *
 *   demo-juan    — Creative Producer
 *   demo-maria   — Content Lead
 *   demo-pedro   — Senior Designer
 *   demo-ana     — Designer
 *   demo-carlos  — Junior Designer
 *
 * Emails sintéticos del domain controlado `@demo.greenhouse.efeonce.org`
 * (canonical anti-confusion contra emails reales).
 *
 * **Defense in depth**: estos members tienen `is_demo=TRUE` y bonus calc
 * NUNCA los procesa (filter en fetchKpisForPeriod + pre-check en bonus
 * helpers Slice 5).
 *
 * Notion User IDs quedan NULL inicialmente. Cuando operador-side cree los
 * Notion People sintéticos en el workspace demo, re-correr el script con
 * los IDs reales (futuro V1.1 — out of scope V1 actual).
 */

interface DemoMemberSeed {
  displayName: string
  emailLocal: string
  roleTitle: string
}

const DEMO_MEMBERS_SEED: readonly DemoMemberSeed[] = [
  { displayName: 'Demo Juan',    emailLocal: 'demo-juan',    roleTitle: 'Creative Producer' },
  { displayName: 'Demo Maria',   emailLocal: 'demo-maria',   roleTitle: 'Content Lead' },
  { displayName: 'Demo Pedro',   emailLocal: 'demo-pedro',   roleTitle: 'Senior Designer' },
  { displayName: 'Demo Ana',     emailLocal: 'demo-ana',     roleTitle: 'Designer' },
  { displayName: 'Demo Carlos',  emailLocal: 'demo-carlos',  roleTitle: 'Junior Designer' }
]

const DEMO_EMAIL_DOMAIN = '@demo.greenhouse.efeonce.org'

const main = async (): Promise<void> => {
  const dryRun = process.argv.includes('--dry-run')

  console.log('=== TASK-910 Slice 1 — Demo Members Setup ===')
  console.log(`Mode: ${dryRun ? 'DRY-RUN (no PG mutation)' : 'APPLY'}`)
  console.log()

  if (dryRun) {
    console.log('Members canonical que se insertarían:')
    DEMO_MEMBERS_SEED.forEach(seed => {
      console.log(`  ${seed.displayName.padEnd(20)} ${seed.emailLocal}${DEMO_EMAIL_DOMAIN.padEnd(35)} ${seed.roleTitle}`)
    })
    
return
  }

  console.log('Existing demo members (pre-setup):')
  const existingBefore = await listDemoMembers()

  if (existingBefore.length === 0) {
    console.log('  (none)')
  } else {
    existingBefore.forEach(m => console.log(`  ${m.memberId} | ${m.displayName} | ${m.primaryEmail}`))
  }

  console.log()

  console.log('Registering canonical demo members (UPSERT)...')
  const results = []

  for (const seed of DEMO_MEMBERS_SEED) {
    const result = await registerDemoMember({
      displayName: seed.displayName,
      syntheticEmail: `${seed.emailLocal}${DEMO_EMAIL_DOMAIN}`,
      roleTitle: seed.roleTitle
    })

    console.log(`  ✓ ${result.displayName.padEnd(20)} ${result.memberId} | ${result.primaryEmail}`)
    results.push(result)
  }

  console.log()
  console.log('Final demo members count:')
  const after = await listDemoMembers()

  console.log(`  ${after.length} members con is_demo=TRUE`)

  console.log()
  console.log('✓ TASK-910 Slice 1 setup COMPLETE.')
}

main().catch(err => {
  console.error('FAIL:', err instanceof Error ? err.message : err)
  process.exit(1)
})
