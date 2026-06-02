import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const readSource = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8')

describe('Nexa Insights routes — Server Component safety contract', () => {
  const serverRouteFiles = [
    'src/app/(dashboard)/nexa/insights/loading.tsx',
    'src/app/(dashboard)/nexa/insights/[id]/loading.tsx',
    'src/app/(dashboard)/nexa/insights/[id]/not-found.tsx'
  ]

  it('no pasa funciones sx desde route-level Server Components a MUI Client Components', () => {
    for (const file of serverRouteFiles) {
      const source = readSource(file)

      expect(source, file).not.toMatch(/sx=\{\s*(?:\(?\s*)?theme\s*=>/)
      expect(source, file).not.toMatch(/sx=\{\s*\(\s*theme\s*\)\s*=>/)
    }
  })

  it('no pasa Link como component prop desde route-level Server Components a MUI Client Components', () => {
    for (const file of serverRouteFiles) {
      const source = readSource(file)

      expect(source, file).not.toMatch(/component=\{Link\}/)
    }
  })
})

describe('Nexa Insights microcopy — Spanish locale contract', () => {
  it('mantiene la copy visible en español neutro o tuteo chileno, sin voseo argentino', () => {
    const source = [
      'src/lib/copy/nexa.ts',
      'src/lib/copy/agency.ts',
      'src/lib/copy/pricing.ts'
    ].map(readSource).join('\n')

    expect(source).not.toMatch(/\b(?:Probá|probá|Volvé|volvé|revisá|Revisá|tenés|Tenés|Hablá|hablá|necesitás|Subí|subí|hacé|Hacé)\b/)
  })
})
