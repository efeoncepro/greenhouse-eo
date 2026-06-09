import { afterEach, describe, expect, it, vi } from 'vitest'

import { WorkforceContractingValidationError } from '../types'

import { resolveContractingWorkerSigner } from './signer-resolver'

const rows = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => rows(...args)
}))

afterEach(() => {
  rows.mockReset()
})

describe('resolveContractingWorkerSigner', () => {
  it('resolves the worker signer (worker role, orderGroup 1)', async () => {
    rows.mockResolvedValue([{ full_name: 'Valentina Hoyos', canonical_email: 'valentina@efeonce.org' }])

    const signer = await resolveContractingWorkerSigner('idp-1')

    expect(signer).toEqual({
      name: 'Valentina Hoyos',
      email: 'valentina@efeonce.org',
      role: 'worker',
      orderGroup: 1
    })
  })

  it('fails closed when the profile is missing (404)', async () => {
    rows.mockResolvedValue([])

    await expect(resolveContractingWorkerSigner('idp-x')).rejects.toMatchObject({
      code: 'worker_profile_not_found',
      statusCode: 404
    })
  })

  it('fails closed when the worker has no email (422)', async () => {
    rows.mockResolvedValue([{ full_name: 'Sin Correo', canonical_email: null }])

    await expect(resolveContractingWorkerSigner('idp-2')).rejects.toBeInstanceOf(WorkforceContractingValidationError)
    await expect(resolveContractingWorkerSigner('idp-2')).rejects.toMatchObject({
      code: 'worker_email_missing',
      statusCode: 422
    })
  })

  it('fails closed when the worker has no name (422)', async () => {
    rows.mockResolvedValue([{ full_name: '  ', canonical_email: 'a@b.com' }])

    await expect(resolveContractingWorkerSigner('idp-3')).rejects.toMatchObject({
      code: 'worker_name_missing',
      statusCode: 422
    })
  })
})
