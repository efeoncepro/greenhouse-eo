import { describe, it, expect } from 'vitest'

import {
  formatAddressPresentationMask,
  formatAddressPresentationText,
  formatDisplayMask,
  maskClRut,
  maskGenericDocument
} from './mask'

describe('TASK-784 mask CL_RUT', () => {
  it('aplica xx.xxx.NNN-K para formato standard', () => {
    expect(maskClRut('12.345.678-K')).toBe('xx.xxx.678-K')
    expect(maskClRut('8.765.432-1')).toBe('xx.xxx.432-1')
  })

  it('uppercase del DV k → K en mascara', () => {
    expect(maskClRut('12.345.678-k')).toBe('xx.xxx.678-K')
  })

  it('cae a generic mask cuando no matchea CL_RUT format', () => {
    expect(maskClRut('XYZ123')).toBe('**Z123'.replace('Z123', 'Z123'))
  })
})

describe('TASK-784 mask generic document', () => {
  it('expone solo ultimos 4 chars', () => {
    expect(maskGenericDocument('ABC123456789')).toBe('********6789')
    expect(maskGenericDocument('1234')).toBe('****')
    expect(maskGenericDocument('12')).toBe('**')
  })
})

describe('TASK-784 dispatcher formatDisplayMask', () => {
  it('CL_RUT → masker chileno', () => {
    expect(formatDisplayMask('CL_RUT', '12.345.678-K')).toBe('xx.xxx.678-K')
  })

  it('US_SSN → masker generico', () => {
    expect(formatDisplayMask('US_SSN', '123456789')).toBe('*****6789')
  })
})

describe('TASK-784 address masking', () => {
  it('presentation_mask NUNCA incluye street_line_1', () => {
    const parts = {
      streetLine1: 'Av. Apoquindo 1234',
      streetLine2: 'Depto 501',
      city: 'Las Condes',
      region: 'Region Metropolitana',
      postalCode: '7550000',
      countryCode: 'CL'
    }

    const mask = formatAddressPresentationMask(parts)

    expect(mask).not.toContain('Apoquindo')
    expect(mask).not.toContain('1234')
    expect(mask).not.toContain('Depto 501')
    expect(mask).toContain('Las Condes')
    expect(mask).toContain('Region Metropolitana')
    expect(mask).toContain('CL')
  })

  it('presentation_text contiene todos los componentes', () => {
    const parts = {
      streetLine1: 'Av. Apoquindo 1234',
      streetLine2: 'Depto 501',
      city: 'Las Condes',
      region: 'Region Metropolitana',
      postalCode: '7550000',
      countryCode: 'cl'
    }

    const text = formatAddressPresentationText(parts)

    expect(text).toContain('Apoquindo 1234')
    expect(text).toContain('Depto 501')
    expect(text).toContain('Las Condes')
    expect(text).toContain('Region Metropolitana')
    expect(text).toContain('7550000')
    expect(text).toContain('CL')
  })
})
