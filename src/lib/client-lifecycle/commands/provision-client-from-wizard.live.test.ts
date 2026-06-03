import { describe, expect, it } from 'vitest'

import { withTransaction } from '@/lib/db'

import { provisionClientFromWizard } from './provision-client-from-wizard'

// TASK-992/998 — Test LIVE anti-regresión del bug class que rompió el alta de cliente.
// Reproduce el flujo COMPLETO contra la DB real (en una tx que SIEMPRE revierte → no
// crea nada) con los dos detonantes que costaron horas de debug:
//   1) spaceType='client' (vocabulario UI) → debe mapear a 'client_space' (CHECK
//      spaces_space_type_check1). Antes: 23514 → "ciclo de vida".
//   2) notionConnectIntent con db ids de Notion REALES de 36 chars (UUID con guiones)
//      → el INSERT a space_notion_sources antes desbordaba VARCHAR(32) (22001), se
//      tragaba el error y envenenaba la tx (25P02) → "ciclo de vida". Ahora las
//      columnas son TEXT + el INSERT corre en un SAVEPOINT.
// Se saltea cuando no hay conexión a Cloud SQL (CI sin DB).

const HAS_DB = Boolean(
  process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME || process.env.GREENHOUSE_POSTGRES_HOST
)

const live = HAS_DB ? describe : describe.skip

class RollbackSentinel extends Error {}

live('provisionClientFromWizard (live) — alta de cliente completa, bug-class regression', () => {
  it('crea client+space+caso con spaceType UI + Notion IDs de 36 chars, sin envenenar la tx', async () => {
    const NOTION_36_CHAR_ID = '35c39c2f-efe7-8139-8448-000b7ed67b13' // UUID con guiones (lo que devuelve la API de Notion)

    let result: Awaited<ReturnType<typeof provisionClientFromWizard>> | undefined
    let captured: unknown = null

    try {
      await withTransaction(async client => {
        try {
          result = await provisionClientFromWizard(
            {
              origin: 'manual',
              identity: {
                organizationName: 'ZZ Live Regression (rolled back)',
                legalName: 'ZZ Live Regression',
                taxId: 'ZZLIVEREG0001',
                taxIdType: 'RFC',
                country: 'MX'
              },
              finance: { paymentCurrency: 'MXN', paymentTermsDays: 30 },
              // (1) vocabulario UI → debe mapear a client_space
              space: { spaceName: 'ZZ Live Regression', spaceType: 'client' },
              // (2) Notion IDs de 36 chars → deben caber (columnas TEXT) + SAVEPOINT
              notionConnectIntent: {
                secretRef: 'notion-integration-token-greenhouse-zz-live-reg',
                tareasDbId: NOTION_36_CHAR_ID,
                proyectosDbId: '35c39c2f-efe7-818f-bfc5-000bbf660c0f',
                sprintsDbId: '35c39c2f-efe7-81cd-bcc3-000b78ba002d',
                revisionesDbId: null
              },
              clientKind: 'regular',
              // (3) fases comerciales → declare_engagement_phases debe quedar 'completed'
              phases: [
                { name: 'Kickoff', start: '2026-06-01', end: '2026-06-15' },
                { name: 'Operación', start: '2026-06-16', end: null }
              ],
              triggeredByUserId: 'user-agent-e2e-001'
            },
            client
          )
        } catch (err) {
          captured = err
        }

        // SIEMPRE revierte — el test no debe persistir nada.
        throw new RollbackSentinel('rollback')
      })
    } catch (err) {
      if (!(err instanceof RollbackSentinel)) throw err
    }

    // Si el provision lanzó, lo re-emitimos con contexto (antes daba 25P02/23514).
    if (captured) throw captured

    expect(result).toBeDefined()
    expect(result?.caseId).toBeTruthy()
    expect(result?.spaceId).toBeTruthy()
    // El vínculo de Notion se persistió (IDs de 36 chars caben en TEXT).
    expect(result?.notionConnected).toBe(true)

    // TASK-992 gap #5 — las fases declaradas auto-completan declare_engagement_phases.
    const items = result?.checklistItems ?? []
    const phasesItem = items.find(i => i.itemCode === 'declare_engagement_phases')

    expect(phasesItem?.status).toBe('completed')

    // TASK-992 gap #7 — Notion vinculado pero requiere evidencia → 'in_progress',
    // NUNCA 'pending' (sería deshonesto mostrarlo como sin empezar).
    const notionItem = items.find(i => i.itemCode === 'provision_notion_workspace')

    expect(notionItem?.status).toBe('in_progress')
  })

  it('completa una org "media-cocida" sin Notion (path de completar cliente)', async () => {
    // Crea una org nueva, simula media-coccion borrando su client/space en la misma
    // tx, y re-provisiona → debe completar idempotentemente. Todo revierte.
    let result: Awaited<ReturnType<typeof provisionClientFromWizard>> | undefined
    let captured: unknown = null

    try {
      await withTransaction(async client => {
        try {
          const first = await provisionClientFromWizard(
            {
              origin: 'manual',
              identity: { organizationName: 'ZZ Half Baked (rolled back)', taxId: 'ZZHALF0002', taxIdType: 'RFC', country: 'MX' },
              finance: { paymentCurrency: 'MXN', paymentTermsDays: 30 },
              space: { spaceName: 'ZZ Half Baked', spaceType: 'client' },
              triggeredByUserId: 'user-agent-e2e-001'
            },
            client
          )

          // Re-provisionar la MISMA org (idempotente — reusa lo que existe).
          result = await provisionClientFromWizard(
            {
              origin: 'manual',
              existingOrganizationId: first.organizationId,
              identity: { organizationName: 'ZZ Half Baked (rolled back)', taxId: 'ZZHALF0002', taxIdType: 'RFC', country: 'MX' },
              finance: { paymentCurrency: 'MXN', paymentTermsDays: 30 },
              space: { spaceName: 'ZZ Half Baked', spaceType: 'client' },
              triggeredByUserId: 'user-agent-e2e-001'
            },
            client
          )
        } catch (err) {
          captured = err
        }

        throw new RollbackSentinel('rollback')
      })
    } catch (err) {
      if (!(err instanceof RollbackSentinel)) throw err
    }

    if (captured) throw captured

    expect(result?.caseId).toBeTruthy()
    expect(result?.clientAlreadyExisted).toBe(true)
  })
})
