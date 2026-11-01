import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const sendEmail = vi.fn(async () => ({ status: 'sent', deliveryId: 'del-1' }))

vi.mock('@/lib/email/delivery', () => ({ sendEmail }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))
vi.mock('../flags', () => ({ isEventEmailsEnabled: () => true }))

const submission = { submission_id: 'fsub-1', status: 'accepted', form_id: 'fdef-1', form_version_id: 'fver-1', normalized_fields_json: { email: 'a@b.cl', registration_status: 'confirmed', event_key: 'webinar-x' } }

vi.mock('../store', async () => {
  const actual = await vi.importActual<{ ACCEPTED_SUBMISSION_STATUSES: readonly string[] }>('../store')

  return {
    ACCEPTED_SUBMISSION_STATUSES: actual.ACCEPTED_SUBMISSION_STATUSES,
    getSubmissionById: vi.fn(async () => submission),
    getFormDefinitionById: vi.fn(async () => ({ form_id: 'fdef-1', slug: 'webinar-x', form_kind: 'event_registration' })),
    getFormVersionById: vi.fn(async () => ({
      ui_policy_json: {
        eventRegistration: {
          event: { title: 'Webinar', startUtc: '2026-11-12T13:00:00Z', timezone: 'America/Santiago', durationMin: 45, modality: 'online', pageUrl: 'https://efeoncepro.com/eventos/webinar-x/' },
          joinUrl: 'https://zoom.us/j/1'
        }
      }
    })),
    listDueEventReminderSubmissionIds: vi.fn(async () => [])
  }
})

vi.mock('@/lib/db', () => ({ query: vi.fn() }))
vi.mock('@/lib/postgres/client', () => ({ runGreenhousePostgresQuery: vi.fn() }))

const { sendEventRegistrationEmail } = await import('../event-emails')

describe('correo de reserva según el estado de la submission', () => {
  beforeEach(() => sendEmail.mockClear())

  // Caso real 2026-10-24: el dispatcher entregó a HubSpot (status `delivered`) antes de que corriera el consumer y el
  // correo se saltó con «no aceptada». El criterio canónico es ACCEPTED_SUBMISSION_STATUSES del store.
  it.each(['accepted', 'delivered', 'destination_failed', 'retrying'])('envía la confirmación con status %s', async status => {
    submission.status = status
    const result = await sendEventRegistrationEmail('fsub-1')

    expect(result).toContain('confirmed sent')
    expect(sendEmail).toHaveBeenCalledTimes(1)
  })

  it.each(['received', 'validated', 'rejected'])('no envía con status %s', async status => {
    submission.status = status
    const result = await sendEventRegistrationEmail('fsub-1')

    expect(result).toContain('no-op')
    expect(sendEmail).not.toHaveBeenCalled()
  })
})
