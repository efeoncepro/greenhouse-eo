import { describe, expect, it } from 'vitest'

import {
  ALLOWED_TRANSITIONS,
  getAllowedNextStages,
  isTerminalStage,
  isTransitionAllowed,
  parseLifecycleStage
} from '../lifecycle-state-machine'
import type { LifecycleStage } from '../types'

describe('lifecycle-state-machine', () => {
  describe('isTransitionAllowed', () => {
    it('allows all transitions from NULL (bootstrap)', () => {
      for (const stage of Object.keys(ALLOWED_TRANSITIONS) as LifecycleStage[]) {
        expect(isTransitionAllowed(null, stage)).toBe(true)
      }
    })

    it('rejects self transitions', () => {
      expect(isTransitionAllowed('prospect', 'prospect')).toBe(false)
      expect(isTransitionAllowed('active_client', 'active_client')).toBe(false)
    })

    it('allows spec-approved forward promotions', () => {
      expect(isTransitionAllowed('prospect', 'opportunity')).toBe(true)
      expect(isTransitionAllowed('prospect', 'active_client')).toBe(true)
      expect(isTransitionAllowed('opportunity', 'active_client')).toBe(true)
      expect(isTransitionAllowed('active_client', 'inactive')).toBe(true)
      expect(isTransitionAllowed('active_client', 'churned')).toBe(true)
      expect(isTransitionAllowed('inactive', 'active_client')).toBe(true)
    })

    it('allows spec-approved demotions', () => {
      expect(isTransitionAllowed('opportunity', 'prospect')).toBe(true)
      expect(isTransitionAllowed('prospect', 'disqualified')).toBe(true)
      expect(isTransitionAllowed('opportunity', 'disqualified')).toBe(true)
      expect(isTransitionAllowed('active_client', 'provider_only')).toBe(true)
    })

    it('rejects illegal transitions', () => {
      expect(isTransitionAllowed('provider_only', 'prospect')).toBe(false)
      expect(isTransitionAllowed('provider_only', 'opportunity')).toBe(false)
      expect(isTransitionAllowed('prospect', 'inactive')).toBe(false)
      expect(isTransitionAllowed('prospect', 'churned')).toBe(false)
      expect(isTransitionAllowed('inactive', 'disqualified')).toBe(false)
      expect(isTransitionAllowed('opportunity', 'inactive')).toBe(false)
    })

    it('permits operator_override paths (churned/disqualified recover)', () => {
      expect(isTransitionAllowed('churned', 'active_client')).toBe(true)
      expect(isTransitionAllowed('disqualified', 'prospect')).toBe(true)
    })
  })

  describe('isTerminalStage', () => {
    it('treats provider_only as terminal', () => {
      expect(isTerminalStage('provider_only')).toBe(true)
    })

    it('does not treat active funnel stages as terminal', () => {
      expect(isTerminalStage('prospect')).toBe(false)
      expect(isTerminalStage('opportunity')).toBe(false)
      expect(isTerminalStage('active_client')).toBe(false)
      expect(isTerminalStage('inactive')).toBe(false)
    })
  })

  describe('getAllowedNextStages', () => {
    it('returns the full set of stages for NULL input', () => {
      const stages = getAllowedNextStages(null)

      expect(stages).toContain('prospect')
      expect(stages).toContain('active_client')
      expect(stages).toContain('provider_only')
    })

    it('returns an empty list for terminal provider_only', () => {
      expect(getAllowedNextStages('provider_only')).toEqual([])
    })
  })

  describe('parseLifecycleStage', () => {
    it('returns null for unknown input', () => {
      expect(parseLifecycleStage('pending')).toBeNull()
      expect(parseLifecycleStage('')).toBeNull()
      expect(parseLifecycleStage(null)).toBeNull()
      expect(parseLifecycleStage(undefined)).toBeNull()
    })

    it('returns the stage for known inputs', () => {
      expect(parseLifecycleStage('prospect')).toBe('prospect')
      expect(parseLifecycleStage('active_client')).toBe('active_client')
    })
  })
})
