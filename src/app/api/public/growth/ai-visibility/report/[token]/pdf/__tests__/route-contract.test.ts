import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SAMPLE_PUBLIC_REPORT } from '@/components/growth/ai-visibility/report-artifact/fixtures'

const guard = { allowed: true }

const attachment = {
  filename: 'informe-visibilidad-ia-globe.pdf',
  content: Buffer.from('%PDF-1.7 fake portable report'),
  contentType: 'application/pdf' as const,
  sizeLabel: '~1 KB',
  byteLength: Buffer.byteLength('%PDF-1.7 fake portable report'),
}

const snapshotState = {
  value: {
    reportId: 'grpt-1',
    runId: 'run-1',
    reportToken: 'grt-deadbeef',
    asOf: '2026-05-20T12:00:00.000Z',
    expiresAt: null as string | null,
    publicReport: SAMPLE_PUBLIC_REPORT,
    brandName: 'Globe',
  } as unknown | null,
}

vi.mock('@/lib/growth/ai-visibility/public-delivery/read-guard', () => ({
  checkPublicReadAllowed: async () => guard.allowed,
}))

vi.mock('@/lib/growth/ai-visibility/report/snapshot', () => ({
  readPublicGraderReport: async () => snapshotState.value,
}))

vi.mock('@/lib/growth/ai-visibility/public-delivery/email/build-report-attachment', () => ({
  buildAiVisibilityReportAttachment: vi.fn(async () => attachment),
}))

const callGet = async (token = 'grt-deadbeef') => {
  const { GET } = await import('../route')
  const request = new Request(`http://localhost/api/public/growth/ai-visibility/report/${token}/pdf`)

  return GET(request, { params: Promise.resolve({ token }) })
}

beforeEach(() => {
  guard.allowed = true
  snapshotState.value = {
    reportId: 'grpt-1',
    runId: 'run-1',
    reportToken: 'grt-deadbeef',
    asOf: '2026-05-20T12:00:00.000Z',
    expiresAt: null,
    publicReport: SAMPLE_PUBLIC_REPORT,
    brandName: 'Globe',
  }
})

describe('GET /report/[token]/pdf — descarga portable pública', () => {
  it('sirve el PDF como attachment desde el snapshot público', async () => {
    const res = await callGet()

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/pdf')
    expect(res.headers.get('content-disposition')).toBe('attachment; filename="informe-visibilidad-ia-globe.pdf"')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')

    const text = Buffer.from(await res.arrayBuffer()).toString('latin1')

    expect(text.startsWith('%PDF-')).toBe(true)
  })

  it('rate-limit → 429 sin generar attachment', async () => {
    guard.allowed = false
    const res = await callGet()

    expect(res.status).toBe(429)
    expect(res.headers.get('content-type')).toContain('application/json')
  })

  it('token inexistente/expirado → 404 indistinto', async () => {
    snapshotState.value = null
    const res = await callGet('grt-missing')

    expect(res.status).toBe(404)
  })
})
