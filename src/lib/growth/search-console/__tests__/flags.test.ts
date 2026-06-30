import { describe, expect, it } from 'vitest'

import { GROWTH_SEARCH_CONSOLE_FLAG, isSearchConsoleEnabled } from '../flags'

const env = (value?: string): NodeJS.ProcessEnv =>
  (value === undefined ? {} : { [GROWTH_SEARCH_CONSOLE_FLAG]: value }) as NodeJS.ProcessEnv

describe('isSearchConsoleEnabled', () => {
  it('default OFF cuando el flag no está seteado', () => {
    expect(isSearchConsoleEnabled(env())).toBe(false)
  })

  it('ON sólo con el valor exacto "true" (case/space-insensitive)', () => {
    expect(isSearchConsoleEnabled(env('true'))).toBe(true)
    expect(isSearchConsoleEnabled(env('  TRUE  '))).toBe(true)
  })

  it('OFF para cualquier otro valor', () => {
    expect(isSearchConsoleEnabled(env('1'))).toBe(false)
    expect(isSearchConsoleEnabled(env('yes'))).toBe(false)
    expect(isSearchConsoleEnabled(env('false'))).toBe(false)
  })
})
