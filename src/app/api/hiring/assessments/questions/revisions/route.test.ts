import { beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ tenant: vi.fn(), can: vi.fn(), revise: vi.fn() }))

vi.mock('@/lib/tenant/authorization', () => ({ requireInternalTenantContext: mocks.tenant }))
vi.mock('@/lib/entitlements/runtime', () => ({ can: mocks.can }))
vi.mock('@/lib/hiring/assessment/question-revisions', () => ({ reviseUnpublishedQuestion: mocks.revise }))
vi.mock('@/lib/hiring', () => ({
  hiringInvalidBodyResponse: () => Response.json({ code: 'invalid' }, { status: 400 }),
  toHiringErrorResponse: () => Response.json({ code: 'error' }, { status: 409 }),
}))

import { POST } from './route'

const body = { sourceQuestionId: 'q-original', expectedSourceDigest: 'a'.repeat(64), question: { prompt: 'Revision' }, reason: 'Operator revision', actorUserId: 'spoofed' }
const request = (input: unknown = body) => new Request('https://greenhouse.test/api/hiring/assessments/questions/revisions', { method: 'POST', body: JSON.stringify(input) })

beforeEach(() => {
  vi.clearAllMocks()
  mocks.tenant.mockResolvedValue({ tenant: { userId: 'real-author' } })
  mocks.can.mockReturnValue(true)
  mocks.revise.mockResolvedValue({ questionId: 'q-revision', status: 'sme_review' })
})

it('denies unauthenticated and unauthorized authors before the writer', async () => {
  mocks.tenant.mockResolvedValueOnce({ tenant: null })
  expect((await POST(request())).status).toBe(401)
  mocks.can.mockReturnValueOnce(false)
  expect((await POST(request())).status).toBe(403)
  expect(mocks.revise).not.toHaveBeenCalled()
})

it('uses the authenticated actor and canonical author capability', async () => {
  expect((await POST(request())).status).toBe(200)
  expect(mocks.can).toHaveBeenCalledWith({ userId: 'real-author' }, 'hiring.assessment.author', 'create', 'tenant')
  expect(mocks.revise).toHaveBeenCalledWith(body, 'real-author')
})

it('rejects malformed bodies without calling the writer', async () => {
  expect((await POST(request(null))).status).toBe(400)
  expect((await POST(request({ ...body, reason: 5 }))).status).toBe(400)
  expect(mocks.revise).not.toHaveBeenCalled()
})
