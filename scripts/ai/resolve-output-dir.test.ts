import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { resolveOutputDir } from './resolve-output-dir'

const base = { defaultDir: '/repo/public/images/generated', resolvePath: (p: string) => resolve('/work', p) }

describe('resolveOutputDir', () => {
  it('en --batch usa --out como directorio en vez de ignorarlo', () => {
    expect(resolveOutputDir({ ...base, batch: true, out: 'ejemplos' })).toBe('/work/ejemplos')
  })

  it('en --batch rechaza --out con extensión de imagen', () => {
    expect(() => resolveOutputDir({ ...base, batch: true, out: 'kv.png' })).toThrow(/debe ser un directorio/)
  })

  it('en --batch rechaza --out y --out-dir distintos', () => {
    expect(() => resolveOutputDir({ ...base, batch: true, out: 'a', outDir: 'b' })).toThrow(/distintos/)
  })

  it('en --batch acepta --out y --out-dir iguales', () => {
    expect(resolveOutputDir({ ...base, batch: true, out: 'a', outDir: './a' })).toBe('/work/a')
  })

  it('en --batch rechaza --out junto a --concept', () => {
    expect(() => resolveOutputDir({ ...base, batch: true, out: 'a', conceptDir: '/c/loop' })).toThrow(/--concept/)
  })

  it('sin --out conserva la precedencia concept > out-dir > default', () => {
    expect(resolveOutputDir({ ...base, batch: true, conceptDir: '/c/loop', outDir: 'x' })).toBe('/c/loop')
    expect(resolveOutputDir({ ...base, batch: true, outDir: 'x' })).toBe('/work/x')
    expect(resolveOutputDir({ ...base, batch: true })).toBe('/repo/public/images/generated')
  })

  it('fuera de --batch, --out es un archivo y no cambia el directorio', () => {
    expect(resolveOutputDir({ ...base, batch: false, out: 'kv.png' })).toBe('/repo/public/images/generated')
  })
})
