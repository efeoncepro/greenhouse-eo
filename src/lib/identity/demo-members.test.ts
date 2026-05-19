import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  runGreenhousePostgresQuery: vi.fn()
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: mocks.runGreenhousePostgresQuery
}))

import {
  countDemoMembers,
  isDemoMember,
  listDemoMembers,
  registerDemoMember
} from './demo-members'

beforeEach(() => {
  mocks.runGreenhousePostgresQuery.mockReset()
})

describe('TASK-910 Slice 1 — demo-members canonical helpers', () => {
  describe('isDemoMember predicate', () => {
    it('returns true cuando isDemo === true (canonical demo member)', () => {
      expect(isDemoMember({ isDemo: true })).toBe(true)
    })

    it('returns false cuando isDemo === false (real member)', () => {
      expect(isDemoMember({ isDemo: false })).toBe(false)
    })

    it('returns false cuando isDemo es null (legacy member sin column populated)', () => {
      expect(isDemoMember({ isDemo: null })).toBe(false)
    })

    it('returns false cuando isDemo undefined (defensive default)', () => {
      expect(isDemoMember({})).toBe(false)
    })

    it('returns false cuando member es null (defensive — bonus calc safe)', () => {
      expect(isDemoMember(null)).toBe(false)
    })

    it('returns false cuando member es undefined (defensive — bonus calc safe)', () => {
      expect(isDemoMember(undefined)).toBe(false)
    })

    it('returns false cuando isDemo es truthy pero NO strictly true (anti-cohersion)', () => {
      // Strict check === true es load-bearing para defense in depth canonical.
      // El bonus helper Slice 5 NUNCA debe procesar demo member, pero
      // tampoco debe procesar como demo un member con isDemo='true' (string) o 1.
      expect(isDemoMember({ isDemo: 'true' as unknown as boolean })).toBe(false)
      expect(isDemoMember({ isDemo: 1 as unknown as boolean })).toBe(false)
    })
  })

  describe('registerDemoMember canonical', () => {
    it('rechaza email fuera del domain canonical @demo.greenhouse.efeonce.org', async () => {
      await expect(
        registerDemoMember({
          displayName: 'Demo Juan',
          syntheticEmail: 'juan@efeoncepro.com'
        })
      ).rejects.toThrow(/canonical demo domain/i)

      expect(mocks.runGreenhousePostgresQuery).not.toHaveBeenCalled()
    })

    it('rechaza email con domain incorrecto similar (anti-confusion)', async () => {
      await expect(
        registerDemoMember({
          displayName: 'Demo Fake',
          syntheticEmail: 'fake@demo.greenhouse.com'
        })
      ).rejects.toThrow(/canonical demo domain/i)
    })

    it('INSERT new cuando primary_email no existe — retorna row con isDemo=true', async () => {
      // 1st call: SELECT existing → empty
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([])
      // 2nd call: INSERT new → returning
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([
        {
          member_id: 'uuid-demo-juan',
          display_name: 'Demo Juan',
          primary_email: 'demo-juan@demo.greenhouse.efeonce.org',
          notion_user_id: 'notion-user-1',
          is_demo: true,
          active: true,
          status: 'active'
        }
      ])

      const result = await registerDemoMember({
        displayName: 'Demo Juan',
        syntheticEmail: 'demo-juan@demo.greenhouse.efeonce.org',
        syntheticNotionUserId: 'notion-user-1',
        roleTitle: 'Creative Producer'
      })

      expect(result.memberId).toBe('uuid-demo-juan')
      expect(result.isDemo).toBe(true)
      expect(result.primaryEmail).toBe('demo-juan@demo.greenhouse.efeonce.org')
      expect(result.notionUserId).toBe('notion-user-1')

      // Verify SELECT then INSERT (2 queries)
      expect(mocks.runGreenhousePostgresQuery).toHaveBeenCalledTimes(2)
      expect(mocks.runGreenhousePostgresQuery.mock.calls[1][0]).toContain('INSERT INTO greenhouse_core.members')
    })

    it('UPDATE existing cuando primary_email ya existe (idempotent re-run)', async () => {
      // 1st call: SELECT existing → found row con is_demo=TRUE
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([
        { member_id: 'existing-uuid', is_demo: true }
      ])
      // 2nd call: UPDATE → returning
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([
        {
          member_id: 'existing-uuid',
          display_name: 'Demo Juan Updated',
          primary_email: 'demo-juan@demo.greenhouse.efeonce.org',
          notion_user_id: 'notion-user-1-new',
          is_demo: true,
          active: true,
          status: 'active'
        }
      ])

      const result = await registerDemoMember({
        displayName: 'Demo Juan Updated',
        syntheticEmail: 'demo-juan@demo.greenhouse.efeonce.org',
        syntheticNotionUserId: 'notion-user-1-new'
      })

      expect(result.memberId).toBe('existing-uuid') // preserved
      expect(result.displayName).toBe('Demo Juan Updated')
      expect(mocks.runGreenhousePostgresQuery.mock.calls[1][0]).toContain('UPDATE greenhouse_core.members')
    })

    it('rechaza convertir real member (is_demo=FALSE) a demo (anti-corruption)', async () => {
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([
        { member_id: 'real-member-uuid', is_demo: false }
      ])

      await expect(
        registerDemoMember({
          displayName: 'Hijack',
          syntheticEmail: 'demo-x@demo.greenhouse.efeonce.org'
        })
      ).rejects.toThrow(/Refuse to convert real member to demo/i)
    })

    it('throws invariant violation si INSERT returned row tiene is_demo=FALSE (migration revertida)', async () => {
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([])
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([
        {
          member_id: 'uuid-x',
          display_name: 'X',
          primary_email: 'demo-x@demo.greenhouse.efeonce.org',
          notion_user_id: null,
          is_demo: false, // ← invariant violation
          active: true,
          status: 'active'
        }
      ])

      await expect(
        registerDemoMember({
          displayName: 'X',
          syntheticEmail: 'demo-x@demo.greenhouse.efeonce.org'
        })
      ).rejects.toThrow(/Invariant violation.*is_demo=FALSE/i)
    })

    it('normaliza email a lowercase + trim', async () => {
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([])
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([
        {
          member_id: 'uuid',
          display_name: 'X',
          primary_email: 'demo-x@demo.greenhouse.efeonce.org',
          notion_user_id: null,
          is_demo: true,
          active: true,
          status: 'active'
        }
      ])

      await registerDemoMember({
        displayName: 'X',
        syntheticEmail: '  DEMO-X@demo.greenhouse.efeonce.org  '
      })

      // SELECT call params[0] should be normalized email
      const selectCallParams = mocks.runGreenhousePostgresQuery.mock.calls[0][1] as unknown[]

      expect(selectCallParams[0]).toBe('demo-x@demo.greenhouse.efeonce.org')
    })
  })

  describe('listDemoMembers + countDemoMembers', () => {
    it('listDemoMembers retorna solo members con isDemo=true', async () => {
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([
        {
          member_id: 'm1',
          display_name: 'Demo Juan',
          primary_email: 'demo-juan@demo.greenhouse.efeonce.org',
          notion_user_id: null,
          is_demo: true,
          active: true,
          status: 'active'
        },
        {
          member_id: 'm2',
          display_name: 'Demo Maria',
          primary_email: 'demo-maria@demo.greenhouse.efeonce.org',
          notion_user_id: null,
          is_demo: true,
          active: true,
          status: 'active'
        }
      ])

      const result = await listDemoMembers()

      expect(result).toHaveLength(2)
      expect(result.every(m => m.isDemo === true)).toBe(true)

      const callArgs = mocks.runGreenhousePostgresQuery.mock.calls[0]
      const sql = callArgs[0] as string

      expect(sql).toContain('is_demo = TRUE')
    })

    it('countDemoMembers retorna integer parseado del COUNT(*)', async () => {
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([{ count: '5' }])

      const result = await countDemoMembers()

      expect(result).toBe(5)
    })

    it('countDemoMembers retorna 0 si no hay rows (defensive)', async () => {
      mocks.runGreenhousePostgresQuery.mockResolvedValueOnce([])

      const result = await countDemoMembers()

      expect(result).toBe(0)
    })
  })
})
