import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { findViolations, rangesFromPrePushInput } from './large-blob-gate.mjs'

describe('findViolations', () => {
  it('blocks blobs over the size limit', () => {
    const out = findViolations([{ path: 'docs/big.pdf', size: 60e6 }], 50e6)

    assert.equal(out.length, 1)
    assert.match(out[0].reasons[0], /60\.0 MB/)
  })

  it('blocks ai-generations media outside the versioning policy, whatever its size', () => {
    assert.equal(findViolations([{ path: 'ai-generations/run/audio/premix.wav', size: 10 }], 50e6).length, 1)
    assert.equal(findViolations([{ path: 'ai-generations/run/v15/picture-lossless.MKV', size: 10 }], 50e6).length, 1)
  })

  it('lets manifests, prompts and code through', () => {
    const blobs = [
      { path: 'ai-generations/run/artifacts.remote.json', size: 4000 },
      { path: 'ai-generations/run/prompts/a.txt', size: 900 },
      { path: 'src/lib/x.ts', size: 12000 },
      { path: 'docs/deliverable.pdf', size: 6e6 }
    ]

    assert.deepEqual(findViolations(blobs, 50e6), [])
  })
})

describe('rangesFromPrePushInput', () => {
  it('builds remote..local ranges and ignores deletions', () => {
    const input = [
      'refs/heads/develop aaa111 refs/heads/develop bbb222',
      'refs/heads/gone 0000000000000000000000000000000000000000 refs/heads/gone ccc333'
    ].join('\n')

    assert.deepEqual(rangesFromPrePushInput(input), [['bbb222..aaa111']])
  })

  it('checks a new branch against every remote ref', () => {
    const input = 'refs/heads/new ddd444 refs/heads/new 0000000000000000000000000000000000000000'

    assert.deepEqual(rangesFromPrePushInput(input), [['ddd444', '--not', '--remotes']])
  })
})
