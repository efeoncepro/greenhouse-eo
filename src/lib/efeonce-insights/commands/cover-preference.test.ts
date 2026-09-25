import { beforeEach, describe, expect, it, vi } from 'vitest'

import { resolveInsightCover } from '../contracts/cover'
import { hashCanonical } from '../request-hash'
import { validateInsightRequest } from './validate-request'

/**
 * TASK-1888 Slice 5 — portada por organización y por encargo: la regla de resolución, la invariancia del hash sin
 * `coverTheme`, y el command (capability, idempotencia, outbox con el valor anterior, errores canónicos).
 */

vi.mock('server-only', () => ({}))

const infra = vi.hoisted(() => ({
  withTx: vi.fn(async (fn: (client: unknown) => Promise<unknown>) => fn({ query: vi.fn() })),
  publish: vi.fn(async () => 'outbox-1'),
  access: vi.fn(),
  getRow: vi.fn(),
  upsert: vi.fn(),
  logos: vi.fn()
}))

vi.mock('@/lib/postgres/client', () => ({ withGreenhousePostgresTransaction: infra.withTx, runGreenhousePostgresQuery: vi.fn() }))
vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: infra.publish }))
vi.mock('../authz', () => ({ assertInsightsAccess: infra.access }))
vi.mock('../stores/cover-preference-store', () => ({ getInsightCoverPreferenceRow: infra.getRow, upsertInsightCoverPreference: infra.upsert }))
vi.mock('@/lib/account-360/organization-logo-variants-reader', () => ({ readOrganizationLogoVariants: infra.logos }))

const NOW = new Date('2026-09-25T12:00:00.000Z')

const baseRequest = {
  modules: ['ico'],
  outputs: ['report_pdf'],
  audience: 'internal',
  period: { start: '2026-08-01', endExclusive: '2026-09-01', timeZone: 'America/Santiago' },
  comparison: { kind: 'previous_period' }
}

const validate = (raw: Record<string, unknown>) => validateInsightRequest(raw, { organizationId: 'org-a', allowedAudiences: ['client', 'internal'], now: NOW }).request

describe('TASK-1888 — resolución de portada', () => {
  const logos = { logoAssetId: 'asset-default', logoOnDarkAssetId: 'asset-dark' }

  it('auto = navy sólo con logo apto para fondo oscuro; sin él, blanca', () => {
    expect(resolveInsightCover({ organization: 'auto', logos })).toEqual({ theme: 'dark', source: 'auto', logoAssetId: 'asset-dark', logoVariant: 'on_dark' })
    expect(resolveInsightCover({ organization: 'auto', logos: { logoAssetId: 'asset-default', logoOnDarkAssetId: null } })).toEqual({ theme: 'light', source: 'auto', logoAssetId: 'asset-default', logoVariant: 'default' })
    expect(resolveInsightCover({ organization: 'auto', logos: null })).toEqual({ theme: 'light', source: 'auto', logoAssetId: null, logoVariant: null })
  })

  it('el encargo manda sobre la organización, y la organización sobre auto', () => {
    expect(resolveInsightCover({ requested: 'light', organization: 'dark', logos })).toMatchObject({ theme: 'light', source: 'request' })
    expect(resolveInsightCover({ requested: 'auto', organization: 'light', logos })).toMatchObject({ theme: 'light', source: 'organization' })
    expect(resolveInsightCover({ requested: null, organization: 'dark', logos })).toMatchObject({ theme: 'dark', source: 'organization' })
  })

  it('una portada navy forzada sin logo oscuro va SIN logo: nunca el logo por defecto sobre navy', () => {
    expect(resolveInsightCover({ requested: 'dark', organization: 'auto', logos: { logoAssetId: 'asset-default', logoOnDarkAssetId: null } })).toEqual({ theme: 'dark', source: 'request', logoAssetId: null, logoVariant: null })
  })
})

describe('TASK-1888 — coverTheme en el encargo', () => {
  it('un encargo sin coverTheme conserva EXACTAMENTE el request (y su hash) de antes de TASK-1888', () => {
    const request = validate(baseRequest)
    const hashed = { ...request }

    delete hashed.idempotencyKey

    expect(request.brand).toEqual({ efeoncePackVersion: 'axis-current', clientBrandRef: null })
    expect(Object.keys(request.brand)).toEqual(['efeoncePackVersion', 'clientBrandRef'])
    // Hash calculado con el validador de 05fd559c0 (previo a TASK-1888) sobre el mismo payload: si cambia, las keys existentes entran en conflicto.
    expect(hashCanonical(hashed)).toBe('c0191c14ed457043e5250fd80dfa6f8666ad948043400d515e857e16d5b8eaf6')
  })

  it('coverTheme válido entra al encargo (y cambia el hash); inválido es error de entrada', () => {
    const withCover = validate({ ...baseRequest, brand: { coverTheme: 'dark' } })

    expect(withCover.brand.coverTheme).toBe('dark')
    expect(hashCanonical(withCover)).not.toBe(hashCanonical(validate(baseRequest)))
    expect(() => validate({ ...baseRequest, brand: { coverTheme: 'navy' } })).toThrow(/brand.coverTheme/)
  })
})

describe('TASK-1888 — setInsightCoverPreference / getInsightCoverPreference', () => {
  const scope = { subject: { userId: 'u-1', tenantType: 'efeonce_internal' } as never, actorOrganizationId: null, organizationId: 'org-a' }
  const grant = { actor: { kind: 'member', userId: 'u-1', memberId: 'm-1' }, organizationId: 'org-a', allowedAudiences: ['client', 'internal'], isInternal: true }

  beforeEach(() => {
    vi.clearAllMocks()
    infra.access.mockResolvedValue(grant)
  })

  it('sin fila se lee auto (isDefault) con la capability de lectura del reporte', async () => {
    infra.getRow.mockResolvedValue(null)
    const { getInsightCoverPreference } = await import('./cover-preference')

    expect(await getInsightCoverPreference(scope)).toEqual({ organizationId: 'org-a', coverTheme: 'auto', isDefault: true, updatedAt: null, updatedByActorKind: null })
    expect(infra.access).toHaveBeenCalledWith(expect.objectContaining({ need: 'cover_preference_read' }))
  })

  it('un cambio real escribe y publica el evento con el valor anterior, en la misma transacción', async () => {
    infra.getRow.mockResolvedValue(null)
    infra.upsert.mockResolvedValue({ organizationId: 'org-a', coverTheme: 'dark', updatedByActorKind: 'member', updatedByUserId: 'u-1', updatedAt: '2026-09-25T12:00:00.000Z' })
    const { setInsightCoverPreference } = await import('./cover-preference')

    const result = await setInsightCoverPreference({ ...scope, coverTheme: 'dark' })

    expect(result).toMatchObject({ changed: true, preference: { coverTheme: 'dark', isDefault: false } })
    expect(infra.access).toHaveBeenCalledWith(expect.objectContaining({ need: 'cover_preference_manage', organizationId: 'org-a' }))
    expect(infra.getRow).toHaveBeenCalledWith(expect.anything(), 'org-a', { forUpdate: true })
    expect(infra.publish).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'insights.cover_preference.updated', aggregateId: 'org-a', payload: { version: 1, organizationId: 'org-a', coverTheme: 'dark', previousCoverTheme: 'auto', actorKind: 'member' } }),
      expect.anything()
    )
  })

  it('el mismo valor no escribe ni publica (idempotente); auto sobre una org sin fila tampoco', async () => {
    const { setInsightCoverPreference } = await import('./cover-preference')

    infra.getRow.mockResolvedValue({ organizationId: 'org-a', coverTheme: 'light', updatedByActorKind: 'member', updatedByUserId: 'u-1', updatedAt: 'x' })
    expect(await setInsightCoverPreference({ ...scope, coverTheme: 'light' })).toMatchObject({ changed: false })

    infra.getRow.mockResolvedValue(null)
    expect(await setInsightCoverPreference({ ...scope, coverTheme: 'auto' })).toMatchObject({ changed: false, preference: { isDefault: true } })

    expect(infra.upsert).not.toHaveBeenCalled()
    expect(infra.publish).not.toHaveBeenCalled()
  })

  it('un valor fuera del enum es error de entrada canónico, antes de tocar autoridad o base', async () => {
    const { setInsightCoverPreference } = await import('./cover-preference')

    await expect(setInsightCoverPreference({ ...scope, coverTheme: 'navy' })).rejects.toMatchObject({ code: 'invalid_request', statusCode: 400 })
    expect(infra.access).not.toHaveBeenCalled()
  })

  it('la portada de una edición se resuelve con la preferencia y las variantes del logo de account-360', async () => {
    infra.getRow.mockResolvedValue(null)
    infra.logos.mockResolvedValue({ logoAssetId: 'asset-default', logoOnDarkAssetId: 'asset-dark' })
    const { resolveInsightCoverForEdition } = await import('./cover-preference')

    expect(await resolveInsightCoverForEdition({ organizationId: 'org-a' })).toEqual({ theme: 'dark', source: 'auto', logoAssetId: 'asset-dark', logoVariant: 'on_dark' })
    expect(await resolveInsightCoverForEdition({ organizationId: 'org-a', requested: 'light' })).toEqual({ theme: 'light', source: 'request', logoAssetId: 'asset-default', logoVariant: 'default' })
  })
})
