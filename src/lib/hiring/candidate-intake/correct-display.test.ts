import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const clientQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  withGreenhousePostgresTransaction: (cb: (client: unknown) => unknown) => cb({ query: clientQuery })
}))

import { HiringNotFoundError, HiringValidationError } from '../errors'
import { correctCandidateDisplayName } from './correct-display'

// TASK-1736 Slice 2 — Corrección humana del display: capability-gated en la ruta; el command
// valida, muta y audita (fuente `human`) en una tx. La corrección humana bloquea automatismos
// futuros (el reconcile la detecta en el audit).

const setupDb = ({ currentFullName = 'valentina villa', profileExists = true } = {}) => {
  clientQuery.mockImplementation(async (sql: string) => {
    if (sql.includes('FOR UPDATE')) {
      return { rows: profileExists ? [{ full_name: currentFullName }] : [], rowCount: profileExists ? 1 : 0 }
    }

    return { rows: [], rowCount: 1 }
  })
}

const validInput = {
  identityProfileId: 'prof-1',
  correctedName: 'Valentina Villa',
  reason: 'Corrección solicitada por la candidata',
  actorUserId: 'user-hr-1'
}

describe('correctCandidateDisplayName', () => {
  beforeEach(() => {
    clientQuery.mockReset()
  })

  it('actualiza full_name y escribe el audit fuente human en la MISMA tx', async () => {
    setupDb({})

    const result = await correctCandidateDisplayName(validInput)

    expect(result).toEqual({
      identityProfileId: 'prof-1',
      beforeFullName: 'valentina villa',
      afterFullName: 'Valentina Villa'
    })

    const update = clientQuery.mock.calls.find(([sql]) => String(sql).includes('UPDATE greenhouse_core.identity_profiles'))

    expect(update).toBeDefined()
    // CAS sobre el before-value leído bajo FOR UPDATE.
    expect(String(update?.[0])).toContain('full_name IS NOT DISTINCT FROM $3')
    expect(update?.[1]).toEqual(['prof-1', 'Valentina Villa', 'valentina villa'])

    const audit = clientQuery.mock.calls.find(([sql]) => String(sql).includes('candidate_identity_display_audit'))

    expect(audit).toBeDefined()
    expect(String(audit?.[0])).toContain("'human'")
    expect(String(audit?.[0])).toContain("'applied'")
    expect(audit?.[1]).toEqual([
      'prof-1',
      'valentina villa',
      'Valentina Villa',
      'Corrección solicitada por la candidata',
      'user-hr-1',
      'v1'
    ])
  })

  it('normaliza estructuralmente el valor corregido (controles/whitespace fuera) respetando el casing del operador', async () => {
    setupDb({})

    const result = await correctCandidateDisplayName({
      ...validInput,
      correctedName: '  María​  de los Ángeles '
    })

    expect(result.afterFullName).toBe('María de los Ángeles')
  })

  it('rechaza nombre vacío (o que queda vacío tras remover controles) con code canónico', async () => {
    await expect(correctCandidateDisplayName({ ...validInput, correctedName: ' ​ ' })).rejects.toMatchObject({
      code: 'hiring_display_correction_invalid_name'
    })
    expect(clientQuery).not.toHaveBeenCalled()
  })

  it('rechaza reason corto (<5 chars) — el motivo es parte del contrato de audit', async () => {
    await expect(correctCandidateDisplayName({ ...validInput, reason: 'ok' })).rejects.toBeInstanceOf(HiringValidationError)
    expect(clientQuery).not.toHaveBeenCalled()
  })

  it('rechaza actor ausente — nunca una corrección anónima', async () => {
    await expect(correctCandidateDisplayName({ ...validInput, actorUserId: '' })).rejects.toMatchObject({
      code: 'hiring_invalid_input'
    })
  })

  it('identidad inexistente → HiringNotFoundError', async () => {
    setupDb({ profileExists: false })

    await expect(correctCandidateDisplayName(validInput)).rejects.toBeInstanceOf(HiringNotFoundError)
  })
})
