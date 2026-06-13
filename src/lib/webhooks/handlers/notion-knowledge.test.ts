import { createHmac } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { __testing__ } from './notion-knowledge'

const { extractKnowledgePageSignals, normalizeWebhookEvents, validateNotionSignature, extractVerificationToken } =
  __testing__

describe('TASK-1094 — notion-knowledge webhook handler', () => {
  describe('extractVerificationToken', () => {
    it('returns el token cuando es verification request', () => {
      expect(extractVerificationToken({ verification_token: 'secret_know123' })).toBe('secret_know123')
    })

    it('returns null para evento normal / payload no-objeto', () => {
      expect(extractVerificationToken({ events: [] })).toBeNull()
      expect(extractVerificationToken(null)).toBeNull()
    })
  })

  describe('validateNotionSignature', () => {
    const SECRET = 'test-knowledge-secret-canonical-32b'
    const sig = (body: string) => `sha256=${createHmac('sha256', SECRET).update(body, 'utf8').digest('hex')}`

    it('returns true para HMAC válido', () => {
      const body = '{"type":"page.content_updated"}'

      expect(validateNotionSignature(body, sig(body), SECRET)).toBe(true)
    })

    it('returns false para firma inválida / vacía / secret vacío', () => {
      const body = '{"type":"page.content_updated"}'

      expect(validateNotionSignature(body, 'sha256=deadbeef', SECRET)).toBe(false)
      expect(validateNotionSignature(body, '', SECRET)).toBe(false)
      expect(validateNotionSignature(body, sig(body), '')).toBe(false)
    })

    it('rechaza body modificado (tamper)', () => {
      const body = '{"type":"page.content_updated","pageId":"a"}'
      const tampered = '{"type":"page.content_updated","pageId":"b"}'

      expect(validateNotionSignature(tampered, sig(body), SECRET)).toBe(false)
    })
  })

  describe('normalizeWebhookEvents', () => {
    it('envuelve un evento single', () => {
      const ev = { type: 'page.created', entity: { id: 'p1', type: 'page' } }

      expect(normalizeWebhookEvents(ev)).toHaveLength(1)
    })

    it('usa events[] cuando presente', () => {
      expect(normalizeWebhookEvents({ events: [{ type: 'page.deleted' }, { type: 'page.created' }] })).toHaveLength(2)
    })

    it('devuelve [] para keepalive / null', () => {
      expect(normalizeWebhookEvents(null)).toEqual([])
      expect(normalizeWebhookEvents({})).toEqual([])
    })
  })

  describe('extractKnowledgePageSignals', () => {
    it('emite signal para una página editada (no deletion)', () => {
      const signals = extractKnowledgePageSignals(
        [{ id: 'ev1', type: 'page.content_updated', entity: { id: 'page-1', type: 'page' }, timestamp: 't1' }],
        null
      )

      expect(signals).toHaveLength(1)
      expect(signals[0].pageId).toBe('page-1')
      expect(signals[0].notionEventType).toBe('page.content_updated')
      expect(signals[0].isDeletion).toBe(false)
    })

    it('marca isDeletion para page.deleted', () => {
      const signals = extractKnowledgePageSignals(
        [{ id: 'ev2', type: 'page.deleted', entity: { id: 'page-2', type: 'page' } }],
        null
      )

      expect(signals[0].isDeletion).toBe(true)
    })

    it('ignora eventos que no son de página (entity.type !== page)', () => {
      const signals = extractKnowledgePageSignals(
        [{ id: 'ev3', type: 'data_source.content_updated', entity: { id: 'ds-1', type: 'data_source' } }],
        null
      )

      expect(signals).toHaveLength(0)
    })

    it('echo-loop: dropea writebacks de nuestra integración', () => {
      const signals = extractKnowledgePageSignals(
        [{ id: 'ev4', type: 'page.content_updated', entity: { id: 'page-4', type: 'page' }, authors: [{ id: 'int-bot' }] }],
        'int-bot'
      )

      expect(signals).toHaveLength(0)
    })

    it('NO deriva contenido del payload (solo page id + tipo + flag) — el consumer re-fetchea', () => {
      const signals = extractKnowledgePageSignals(
        [{ id: 'ev5', type: 'page.properties_updated', entity: { id: 'page-5', type: 'page' }, data: { parent: { id: 'ds-9' } } }],
        null
      )

      expect(Object.keys(signals[0]).sort()).toEqual(
        ['isDeletion', 'notionEventType', 'occurredAt', 'pageId', 'parentId', 'sourceEventId'].sort()
      )
      expect(signals[0].parentId).toBe('ds-9')
    })
  })
})
