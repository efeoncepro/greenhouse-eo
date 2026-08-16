import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const withTransactionMock = vi.fn()
const runQueryMock = vi.fn()
const publishOutboxEventMock = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  withGreenhousePostgresTransaction: (...args: unknown[]) => withTransactionMock(...args),
  runGreenhousePostgresQuery: (...args: unknown[]) => runQueryMock(...args)
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => publishOutboxEventMock(...args)
}))

const { recordHiringApplicationNote, listHiringApplicationNotes } = await import('./application-notes')

const noteRow = {
  note_id: 'hnote-1',
  application_id: 'happ-1',
  kind: 'cv_analysis',
  body_md: 'Análisis CV vs assessment.',
  author_user_id: 'user-1',
  source: 'agent',
  context_json: { dossierProposalId: 'hdsp-1' },
  created_at: new Date('2026-08-16T12:00:00Z')
}

describe('recordHiringApplicationNote', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    withTransactionMock.mockImplementation(async (fn: (client: unknown) => Promise<unknown>) => {
      const client = {
        query: vi
          .fn()
          .mockResolvedValueOnce({ rows: [{ application_id: 'happ-1' }] })
          .mockResolvedValueOnce({ rows: [noteRow] })
      }

      return fn(client)
    })
  })

  it('inserta la nota y publica el evento IDs-only en la misma tx', async () => {
    const note = await recordHiringApplicationNote({
      applicationId: 'happ-1',
      kind: 'cv_analysis',
      bodyMd: 'Análisis CV vs assessment.',
      authorUserId: 'user-1',
      source: 'agent',
      contextJson: { dossierProposalId: 'hdsp-1' }
    })

    expect(note.noteId).toBe('hnote-1')
    expect(note.source).toBe('agent')
    expect(publishOutboxEventMock).toHaveBeenCalledTimes(1)

    const [event] = publishOutboxEventMock.mock.calls[0]

    expect(event.eventType).toBe('hiring.application.note_recorded')

    // Payload IDs-only: jamás el cuerpo de la nota (PII de evaluación).
    expect(JSON.stringify(event.payload)).not.toContain('Análisis')
    expect(event.payload).toEqual({
      noteId: 'hnote-1',
      applicationId: 'happ-1',
      kind: 'cv_analysis',
      actorUserId: 'user-1'
    })
  })

  it('rechaza kind inválido, body vacío o body sobre el máximo', async () => {
    await expect(
      recordHiringApplicationNote({
        applicationId: 'happ-1',
        kind: 'otro' as never,
        bodyMd: 'x',
        authorUserId: 'user-1'
      })
    ).rejects.toMatchObject({ code: 'hiring_note_invalid_kind' })

    await expect(
      recordHiringApplicationNote({ applicationId: 'happ-1', kind: 'general', bodyMd: '   ', authorUserId: 'user-1' })
    ).rejects.toMatchObject({ code: 'hiring_note_invalid_body' })

    await expect(
      recordHiringApplicationNote({
        applicationId: 'happ-1',
        kind: 'general',
        bodyMd: 'x'.repeat(8001),
        authorUserId: 'user-1'
      })
    ).rejects.toMatchObject({ code: 'hiring_note_invalid_body' })

    expect(withTransactionMock).not.toHaveBeenCalled()
  })

  it('falla loud si la application no existe', async () => {
    withTransactionMock.mockImplementation(async (fn: (client: unknown) => Promise<unknown>) => {
      const client = { query: vi.fn().mockResolvedValueOnce({ rows: [] }) }

      return fn(client)
    })

    await expect(
      recordHiringApplicationNote({ applicationId: 'happ-x', kind: 'general', bodyMd: 'nota', authorUserId: 'user-1' })
    ).rejects.toMatchObject({ code: 'hiring_application_not_found' })

    expect(publishOutboxEventMock).not.toHaveBeenCalled()
  })
})

describe('listHiringApplicationNotes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('normaliza filas y ordena por el SQL (created_at DESC)', async () => {
    runQueryMock.mockResolvedValueOnce([noteRow])

    const notes = await listHiringApplicationNotes('happ-1')

    expect(notes).toHaveLength(1)
    expect(notes[0].createdAt).toBe('2026-08-16T12:00:00.000Z')
    expect(notes[0].contextJson).toEqual({ dossierProposalId: 'hdsp-1' })
    expect(String(runQueryMock.mock.calls[0][0])).toContain('ORDER BY created_at DESC')
  })
})
