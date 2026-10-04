import { createHash } from 'node:crypto'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { checkWebFonts, remoteFontImports } from './web-fonts-gate.mjs'

const roots: string[] = []

const fixture = () => {
  const root = mkdtempSync(join(tmpdir(), 'web-fonts-'))
  const dir = join(root, 'src/assets/fonts/web')

  roots.push(root)
  mkdirSync(dir, { recursive: true })
  const data = Buffer.from('wOF2-fixture')

  writeFileSync(join(dir, 'test.woff2'), data)
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ fonts: [{
    file: 'test.woff2', bytes: data.length, sha256: createHash('sha256').update(data).digest('hex')
  }] }))

  return { root, dir }
}

afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })))

describe('web font build boundary (ISSUE-178)', () => {
  it.each([
    "import { Geist } from 'next/font/google'",
    "export { Poppins } from 'next/font/google'",
    "const font = import('next/font/google')",
    "const font = require('@next/font/google')"
  ])('rejects a remote loader: %s', source => {
    expect(remoteFontImports(source, 'src/fonts.ts')).toHaveLength(1)
  })

  it('allows local loaders, comments and test mocks', () => {
    expect(remoteFontImports("import font from 'next/font/local'\n// next/font/google\nvi.mock('next/font/google', () => ({}))", 'src/fonts.ts')).toEqual([])
  })

  it('checks the actual source tree and detects a newly introduced dependency', () => {
    const { root } = fixture()

    expect(checkWebFonts(root)).toEqual([])
    writeFileSync(join(root, 'src/fonts.ts'), "import { Geist } from 'next/font/google'")
    expect(checkWebFonts(root)).toEqual([expect.stringContaining('src/fonts.ts:1')])
  })

  it('rejects corrupted and missing assets independently of the import guard', () => {
    const { root, dir } = fixture()

    writeFileSync(join(dir, 'test.woff2'), 'wOF2-mutated')
    expect(checkWebFonts(root)).toEqual([expect.stringContaining('differ')])
    rmSync(join(dir, 'test.woff2'))
    expect(checkWebFonts(root)).toEqual([expect.stringContaining('missing')])
  })

  it('verifies the fonts shipped by the real repository', () => {
    expect(checkWebFonts()).toEqual([])
  })
})
