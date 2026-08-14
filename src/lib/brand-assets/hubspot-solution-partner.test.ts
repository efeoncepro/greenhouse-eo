import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  HUBSPOT_SOLUTION_PARTNER_BADGES,
  HUBSPOT_SOLUTION_PARTNER_BADGE_VARIANTS,
  getHubSpotSolutionPartnerBadge
} from './hubspot-solution-partner'

const repoRoot = resolve(process.cwd())

describe('HubSpot Solutions Partner badge primitive', () => {
  it.each(HUBSPOT_SOLUTION_PARTNER_BADGE_VARIANTS)('keeps the %s SVG available and intact', variant => {
    const src = getHubSpotSolutionPartnerBadge(variant).src
    const absolutePath = resolve(repoRoot, 'public', src.replace(/^\//, ''))
    const svg = readFileSync(absolutePath, 'utf8')

    expect(existsSync(absolutePath)).toBe(true)
    expect(svg).toContain('viewBox="0 0 431.07 428.92"')
    expect(svg).toContain('id="Layer_2"')
    expect(svg).toContain('#ff4800')
  })

  it('exposes normalized public paths for all three variants', () => {
    expect(Object.keys(HUBSPOT_SOLUTION_PARTNER_BADGES)).toEqual(['dark', 'light', 'orange'])
    expect(HUBSPOT_SOLUTION_PARTNER_BADGES.orange.src).toBe(
      '/branding/partners/hubspot/solution-partner/badge-orange-spp-hubspot.svg'
    )
  })
})
