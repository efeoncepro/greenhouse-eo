import { createHmac } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { __testing__ } from './notion-tasks-demo'

const { extractDemoTransitions, validateNotionSignature, extractVerificationToken, STATUS_PROPERTY_NAMES } = __testing__

describe('Notion webhook verification handshake (live fix 2026-05-20)', () => {
  describe('extractVerificationToken', () => {
    it('returns el token cuando payload es verification request', () => {
      expect(extractVerificationToken({ verification_token: 'secret_abc123' })).toBe('secret_abc123')
    })

    it('returns null cuando NO hay verification_token (evento normal)', () => {
      expect(extractVerificationToken({ events: [{ id: 'x', entity: { type: 'page' } }] })).toBeNull()
    })

    it('returns null para token vacío o no-string', () => {
      expect(extractVerificationToken({ verification_token: '' })).toBeNull()
      expect(extractVerificationToken({ verification_token: 123 })).toBeNull()
      expect(extractVerificationToken({ verification_token: null })).toBeNull()
    })

    it('returns null para payload null/undefined/no-objeto', () => {
      expect(extractVerificationToken(null)).toBeNull()
      expect(extractVerificationToken(undefined)).toBeNull()
      expect(extractVerificationToken('string')).toBeNull()
    })
  })
})

describe('TASK-910 Slice 2 — notion-tasks-demo handler canonical', () => {
  describe('validateNotionSignature', () => {
    const SECRET = 'test-demo-secret-canonical-32-bytes'

    const buildSig = (body: string) =>
      `sha256=${createHmac('sha256', SECRET).update(body, 'utf8').digest('hex')}`

    it('returns true para HMAC valid', () => {
      const body = '{"events":[]}'

      expect(validateNotionSignature(body, buildSig(body), SECRET)).toBe(true)
    })

    it('returns false para signature inválido', () => {
      const body = '{"events":[]}'

      expect(validateNotionSignature(body, 'sha256=deadbeef', SECRET)).toBe(false)
    })

    it('returns false para signature empty', () => {
      expect(validateNotionSignature('body', '', SECRET)).toBe(false)
    })

    it('returns false para secret empty (defensive)', () => {
      const body = '{}'

      expect(validateNotionSignature(body, buildSig(body), '')).toBe(false)
    })

    it('acepta signature con prefix sha256= explicito', () => {
      const body = '{"a":1}'
      const validSig = buildSig(body)

      expect(validSig).toMatch(/^sha256=/)
      expect(validateNotionSignature(body, validSig, SECRET)).toBe(true)
    })

    it('acepta hex raw sin prefix sha256= (legacy compat)', () => {
      const body = '{"a":1}'
      const hex = createHmac('sha256', SECRET).update(body, 'utf8').digest('hex')

      expect(validateNotionSignature(body, hex, SECRET)).toBe(true)
    })

    it('rechaza signature con length distinta (anti timing oracle)', () => {
      const body = 'x'

      // Trim válido hex a length distinto
      expect(validateNotionSignature(body, 'sha256=abc', SECRET)).toBe(false)
    })

    it('rechaza body modificado (tamper detection)', () => {
      const original = '{"events":[{"id":1}]}'
      const tampered = '{"events":[{"id":2}]}'
      const sig = buildSig(original)

      expect(validateNotionSignature(tampered, sig, SECRET)).toBe(false)
    })
  })

  describe('extractDemoTransitions canonical', () => {
    const baseEvent = {
      id: 'evt-1',
      entity: { id: 'task-uuid-1', type: 'page' as const },
      data: {
        updated_properties: ['Estado'],
        previous: { status: { name: 'En curso' } },
        current: { status: { name: 'Listo para revisión' } }
      },
      authors: [{ id: 'real-user-uuid', type: 'person' as const }],
      timestamp: '2026-05-19T10:00:00Z'
    }

    it('extrae transition canonical happy path', () => {
      const result = extractDemoTransitions([baseEvent], null)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        taskSourceId: 'task-uuid-1',
        fromStatus: 'En curso',
        toStatus: 'Listo para revisión',
        transitionedAt: '2026-05-19T10:00:00Z',
        transitionedBy: 'real-user-uuid',
        sourceEventId: 'evt-1'
      })
    })

    it('echo-loop filter: drop si event author es integration user', () => {
      const result = extractDemoTransitions(
        [{ ...baseEvent, authors: [{ id: 'integration-uuid', type: 'bot' as const }] }],
        'integration-uuid'
      )

      expect(result).toHaveLength(0)
    })

    it('echo-loop NO filtra si integrationUserId es null (no configured)', () => {
      const result = extractDemoTransitions([baseEvent], null)

      expect(result).toHaveLength(1)
    })

    it('property allowlist: drop si updated_properties NO incluye Estado/Estado 1', () => {
      const result = extractDemoTransitions(
        [{ ...baseEvent, data: { ...baseEvent.data, updated_properties: ['Otro campo'] } }],
        null
      )

      expect(result).toHaveLength(0)
    })

    it('property allowlist acepta `Estado 1` legacy Sky', () => {
      expect(STATUS_PROPERTY_NAMES.has('Estado 1')).toBe(true)
    })

    it('drop si entity type NO es page', () => {
      const result = extractDemoTransitions(
        [{ ...baseEvent, entity: { id: 'x', type: 'database' as const } }],
        null
      )

      expect(result).toHaveLength(0)
    })

    it('drop si entity id missing', () => {
      const result = extractDemoTransitions(
        [{ ...baseEvent, entity: { type: 'page' as const } }],
        null
      )

      expect(result).toHaveLength(0)
    })

    it('drop si previous status missing', () => {
      const result = extractDemoTransitions(
        [{ ...baseEvent, data: { ...baseEvent.data, previous: { status: { name: undefined } } } }],
        null
      )

      expect(result).toHaveLength(0)
    })

    it('drop si current status missing', () => {
      const result = extractDemoTransitions(
        [{ ...baseEvent, data: { ...baseEvent.data, current: { status: { name: undefined } } } }],
        null
      )

      expect(result).toHaveLength(0)
    })

    it('drop si status unknown (no canonical V1 + no legacy alias)', () => {
      const result = extractDemoTransitions(
        [
          {
            ...baseEvent,
            data: {
              ...baseEvent.data,
              previous: { status: { name: 'StatusInventado' } },
              current: { status: { name: 'En curso' } }
            }
          }
        ],
        null
      )

      expect(result).toHaveLength(0)
    })

    it('drop si fromStatus === toStatus (no real transition)', () => {
      const result = extractDemoTransitions(
        [
          {
            ...baseEvent,
            data: {
              ...baseEvent.data,
              previous: { status: { name: 'En curso' } },
              current: { status: { name: 'En curso' } }
            }
          }
        ],
        null
      )

      expect(result).toHaveLength(0)
    })

    it('normaliza legacy Sky `En feedback` a canonical `Cambios solicitados`', () => {
      const result = extractDemoTransitions(
        [
          {
            ...baseEvent,
            data: {
              ...baseEvent.data,
              previous: { status: { name: 'Listo para revisión' } },
              current: { status: { name: 'En feedback' } }
            }
          }
        ],
        null
      )

      expect(result).toHaveLength(1)
      expect(result[0].toStatus).toBe('Cambios solicitados')
    })

    it('correction event canonical (Listo para revisión → Cambios solicitados) extracted correctly', () => {
      const result = extractDemoTransitions(
        [
          {
            ...baseEvent,
            data: {
              ...baseEvent.data,
              previous: { status: { name: 'Listo para revisión' } },
              current: { status: { name: 'Cambios solicitados' } }
            }
          }
        ],
        null
      )

      expect(result).toHaveLength(1)
      expect(result[0].fromStatus).toBe('Listo para revisión')
      expect(result[0].toStatus).toBe('Cambios solicitados')
    })

    it('extrae multiple transitions en mismo payload', () => {
      const event2 = {
        ...baseEvent,
        id: 'evt-2',
        entity: { id: 'task-uuid-2', type: 'page' as const }
      }

      const result = extractDemoTransitions([baseEvent, event2], null)

      expect(result).toHaveLength(2)
      expect(result.map(r => r.taskSourceId)).toEqual(['task-uuid-1', 'task-uuid-2'])
    })

    it('genera sourceEventId fallback cuando event.id missing', () => {
      const result = extractDemoTransitions(
        [{ ...baseEvent, id: undefined }],
        null
      )

      expect(result).toHaveLength(1)
      expect(result[0].sourceEventId).toContain('task-uuid-1')
    })
  })
})
