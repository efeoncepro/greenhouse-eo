import { describe, expect, it } from 'vitest'

import { classifyKmsVersionState } from './key-rotation-kms'

describe('KMS version state adapter', () => {
  it('accepts generated numeric protobuf states and their string equivalents', () => {
    expect(classifyKmsVersionState(1)).toBe('ENABLED')
    expect(classifyKmsVersionState('ENABLED')).toBe('ENABLED')
    expect(classifyKmsVersionState(5)).toBe('PENDING')
    expect(classifyKmsVersionState(6)).toBe('PENDING')
    expect(classifyKmsVersionState(2)).toBe('DISABLED')
    expect(classifyKmsVersionState(3)).toBe('OTHER')
  })
})
