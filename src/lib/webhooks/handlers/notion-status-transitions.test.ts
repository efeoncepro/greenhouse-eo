import { createHmac } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { __testing__ } from './notion-status-transitions'
import {
  PRODUCTIVE_TAREAS_DATA_SOURCE_IDS,
  DEMO_TAREAS_DATA_SOURCE_ID
} from '@/lib/notion-metrics/notion-productive-workspaces'

const { extractStatusChangeSignals, normalizeWebhookEvents, validateNotionSignature, extractVerificationToken } =
  __testing__

describe('TASK-912 — notion-status-transitions handler (productivo Efeonce/Sky)', () => {
  describe('extractVerificationToken', () => {
    it('returns el token cuando payload es verification request', () => {
      expect(extractVerificationToken({ verification_token: 'secret_prod123' })).toBe('secret_prod123')
    })

    it('returns null para evento normal / payload no-objeto', () => {
      expect(extractVerificationToken({ events: [] })).toBeNull()
      expect(extractVerificationToken(null)).toBeNull()
      expect(extractVerificationToken('x')).toBeNull()
    })
  })

  describe('validateNotionSignature', () => {
    const SECRET = 'test-prod-secret-canonical-32-bytes'
    const buildSig = (body: string) => `sha256=${createHmac('sha256', SECRET).update(body, 'utf8').digest('hex')}`

    it('returns true para HMAC valid', () => {
      const body = '{"type":"page.properties_updated"}'

      expect(validateNotionSignature(body, buildSig(body), SECRET)).toBe(true)
    })

    it('returns false para signature inválido / empty / secret empty', () => {
      const body = '{}'

      expect(validateNotionSignature(body, 'sha256=deadbeef', SECRET)).toBe(false)
      expect(validateNotionSignature(body, '', SECRET)).toBe(false)
      expect(validateNotionSignature(body, buildSig(body), '')).toBe(false)
    })

    it('rechaza body modificado (tamper detection)', () => {
      const original = '{"id":1}'
      const tampered = '{"id":2}'

      expect(validateNotionSignature(tampered, buildSig(original), SECRET)).toBe(false)
    })

    it('acepta hex raw sin prefix (legacy compat)', () => {
      const body = '{"a":1}'
      const hex = createHmac('sha256', SECRET).update(body, 'utf8').digest('hex')

      expect(validateNotionSignature(body, hex, SECRET)).toBe(true)
    })
  })

  describe('normalizeWebhookEvents (dual envelope)', () => {
    const singleEvent = {
      id: 'evt-1',
      type: 'page.properties_updated',
      entity: { id: 'task-1', type: 'page' },
      data: { updated_properties: ['p1'] }
    }

    it('envuelve un evento single (sin events[])', () => {
      expect(normalizeWebhookEvents(singleEvent)).toHaveLength(1)
    })

    it('usa events[] cuando presente', () => {
      expect(normalizeWebhookEvents({ events: [singleEvent, { ...singleEvent, id: 'evt-2' }] })).toHaveLength(2)
    })

    it('devuelve [] para keepalive / null', () => {
      expect(normalizeWebhookEvents({ foo: 'bar' })).toHaveLength(0)
      expect(normalizeWebhookEvents(null)).toHaveLength(0)
    })
  })

  describe('extractStatusChangeSignals (re-fetch trigger, workspace-agnostic)', () => {
    const baseEvent = {
      id: 'evt-1',
      type: 'page.properties_updated',
      entity: { id: 'task-uuid-1', type: 'page' as const },
      data: {
        updated_properties: ['shortPropId'],
        parent: { id: PRODUCTIVE_TAREAS_DATA_SOURCE_IDS.efeonce, type: 'data_source_id' }
      },
      authors: [{ id: 'real-user-uuid', type: 'person' as const }],
      timestamp: '2026-05-21T10:00:00Z'
    }

    it('emite signal para cambio de propiedad en page (consumer re-fetch resuelve workspace)', () => {
      const result = extractStatusChangeSignals([baseEvent], null)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        taskSourceId: 'task-uuid-1',
        changedPropertyIds: ['shortPropId'],
        parentId: PRODUCTIVE_TAREAS_DATA_SOURCE_IDS.efeonce,
        sourceEventId: 'evt-1',
        occurredAt: '2026-05-21T10:00:00Z'
      })
    })

    it('NO incluye from/to (consumer los resuelve vía re-fetch)', () => {
      const [signal] = extractStatusChangeSignals([baseEvent], null)

      expect(signal).not.toHaveProperty('fromStatus')
      expect(signal).not.toHaveProperty('toStatus')
    })

    it('forward para Sky (consumer es autoritativo)', () => {
      const sky = { ...baseEvent, data: { ...baseEvent.data, parent: { id: PRODUCTIVE_TAREAS_DATA_SOURCE_IDS.sky } } }

      expect(extractStatusChangeSignals([sky], null)).toHaveLength(1)
    })

    it('DROP best-effort si el parent es el data source demo (su propio endpoint)', () => {
      const demo = { ...baseEvent, data: { ...baseEvent.data, parent: { id: DEMO_TAREAS_DATA_SOURCE_ID } } }

      expect(extractStatusChangeSignals([demo], null)).toHaveLength(0)
    })

    it('forward cuando parent es desconocido/ausente (consumer skip vía re-fetch)', () => {
      const unknown = { ...baseEvent, data: { updated_properties: ['p1'] } }

      const result = extractStatusChangeSignals([unknown], null)

      expect(result).toHaveLength(1)
      expect(result[0].parentId).toBeNull()
    })

    it('drop si updated_properties vacío', () => {
      const result = extractStatusChangeSignals([{ ...baseEvent, data: { updated_properties: [] } }], null)

      expect(result).toHaveLength(0)
    })

    it('echo-loop filter: drop si author es integration user', () => {
      const result = extractStatusChangeSignals(
        [{ ...baseEvent, authors: [{ id: 'integration-uuid', type: 'bot' as const }] }],
        'integration-uuid'
      )

      expect(result).toHaveLength(0)
    })

    it('drop si entity type NO es page o id missing', () => {
      expect(
        extractStatusChangeSignals([{ ...baseEvent, entity: { id: 'x', type: 'database' as const } }], null)
      ).toHaveLength(0)
      expect(extractStatusChangeSignals([{ ...baseEvent, entity: { type: 'page' as const } }], null)).toHaveLength(0)
    })

    it('genera sourceEventId fallback cuando event.id missing', () => {
      const result = extractStatusChangeSignals([{ ...baseEvent, id: undefined }], null)

      expect(result[0].sourceEventId).toContain('task-uuid-1')
    })
  })
})
