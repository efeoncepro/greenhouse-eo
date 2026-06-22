import { afterEach, describe, it, expect, vi } from 'vitest'

import {
  NOTION_PROPERTY_OTD_BUCKET,
  OTD_BUCKET_SELECT_NAME,
  OTD_BUCKET_SELECT_OPTIONS,
  isOtdWritebackEnabled
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

describe('isOtdWritebackEnabled (TASK-927, default OFF)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('default OFF (sin flags) → false', () => {
    vi.stubEnv('NOTION_OTD_WRITEBACK_ENABLED', '')
    vi.stubEnv('NOTION_OTD_WRITEBACK_ENABLED_EFEONCE', '')
    expect(isOtdWritebackEnabled('efeonce')).toBe(false)
    expect(isOtdWritebackEnabled()).toBe(false)
  })

  it('global ON → true', () => {
    vi.stubEnv('NOTION_OTD_WRITEBACK_ENABLED', 'true')
    expect(isOtdWritebackEnabled('sky')).toBe(true)
  })

  it('override per-cliente gana sobre el global (apagar un solo cliente)', () => {
    vi.stubEnv('NOTION_OTD_WRITEBACK_ENABLED', 'true')
    vi.stubEnv('NOTION_OTD_WRITEBACK_ENABLED_SKY', 'false')
    expect(isOtdWritebackEnabled('sky')).toBe(false) // sky apagado
    expect(isOtdWritebackEnabled('efeonce')).toBe(true) // efeonce hereda global
  })

  it('override per-cliente puede prender un solo cliente con global OFF', () => {
    vi.stubEnv('NOTION_OTD_WRITEBACK_ENABLED', '')
    vi.stubEnv('NOTION_OTD_WRITEBACK_ENABLED_EFEONCE', 'true')
    expect(isOtdWritebackEnabled('efeonce')).toBe(true)
    expect(isOtdWritebackEnabled('sky')).toBe(false)
  })
})
