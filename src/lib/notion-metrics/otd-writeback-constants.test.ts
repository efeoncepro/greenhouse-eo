import { describe, it, expect } from 'vitest'

import {
  NOTION_PROPERTY_OTD_BUCKET,
  OTD_BUCKET_SELECT_NAME,
  OTD_BUCKET_SELECT_OPTIONS
} from './otd-writeback-constants'

describe('otd-writeback-constants (TASK-927)', () => {
  it('escribe a la propiedad read-only [GH] OTD', () => {
    expect(NOTION_PROPERTY_OTD_BUCKET).toBe('[GH] OTD')
  })

  it('los labels replican verbatim el legacy Indicador de Performance (comparación lado-a-lado)', () => {
    expect(OTD_BUCKET_SELECT_NAME).toEqual({
      on_time: '🟢 On-Time',
      late_drop: '🟡 Late Drop',
      overdue: '🔴 Overdue',
      carry_over: '🔵 Carry-Over',
      not_applicable: '—'
    })
  })

  it('cubre los 5 buckets canónicos (exhaustivo) sin opciones duplicadas', () => {
    expect(Object.keys(OTD_BUCKET_SELECT_NAME)).toHaveLength(5)
    expect(new Set(OTD_BUCKET_SELECT_OPTIONS).size).toBe(5)
  })
})
