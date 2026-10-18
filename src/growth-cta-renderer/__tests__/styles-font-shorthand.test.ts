import { describe, expect, it } from 'vitest'

import { RENDERER_CSS } from '../styles'

/*
 * `inherit` is a CSS-wide keyword: valid as the whole value (`font: inherit`) but NOT as one component of the
 * `font` shorthand. `font: 650 .84rem/1 inherit` is dropped entirely by the browser and the host theme styles the
 * text instead. Source case (2026-10-16): the meeting dialog title took the host h2 size and the close button
 * wrapped in three lines on a 390 px phone.
 *
 * This guard only names the regression. The real verifier is the browser: open the scheduler on a WordPress host
 * at 390 px and read the computed font of `.ghc-meeting-close` (it must not fall back to the UA default) and its
 * height (one line). jsdom does not drop invalid shorthands, so a unit test cannot observe the defect itself.
 */
describe('renderer CSS font declarations', () => {
  it('never mixes inherit into the font shorthand', () => {
    const declarations = [...RENDERER_CSS.matchAll(/(?:^|[\s;{])font\s*:\s*([^;}]*)/g)].map(match => match[1].trim())
    const invalid = declarations.filter(value => /\binherit\b/.test(value) && value !== 'inherit')

    expect(invalid).toEqual([])
  })
})
