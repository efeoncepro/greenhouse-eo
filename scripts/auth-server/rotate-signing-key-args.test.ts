import { describe, expect, it } from 'vitest'

import { parseRotationArgs } from './rotate-signing-key-args'

describe('rotation operator arguments', () => {
  it('preserves each explicit action and the default create action', () => {
    expect(parseRotationArgs([])).toEqual({ kind: 'create' })
    expect(parseRotationArgs(['--status'])).toEqual({ kind: 'status' })
    expect(parseRotationArgs(['--register', 'projects/p/cryptoKeyVersions/3', '--no-activate']))
      .toEqual({ kind: 'register', versionName: 'projects/p/cryptoKeyVersions/3', activate: false })
    expect(parseRotationArgs(['--retire', 'kid-1', '--force']))
      .toEqual({ kind: 'retire', kid: 'kid-1', force: true })
  })

  it.each([
    ['--register'],
    ['--retire'],
    ['--register', '--no-activate'],
    ['--retire', '--force'],
    ['--status', '--register', 'version'],
    ['--register', 'version', '--retire', 'kid'],
    ['--retire', 'kid', '--no-activate'],
    ['--status', '--force'],
    ['--force'],
    ['--register', 'version', '--register', 'other'],
    ['--no-activate', '--no-activate'],
    ['--no-activate'],
    ['--unknown'],
    ['version']
  ])('rejects malformed arguments before a create path: %j', (...args) => {
    expect(() => parseRotationArgs(args)).toThrow('Invalid rotation arguments')
  })
})
