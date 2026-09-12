import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

/**
 * RESEARCH-011 (2026-09-11) — El `rank` de Backlinks llega en 0–1000, no en 0–100.
 *
 * `rank_scale` default es `one_thousand`. Un consumer que asuma 0–100 —porque así se ven DR/DA
 * en las suites del mercado— produce un número ~10× fuera de escala que **no lanza ningún error**
 * y rinde rankings de autoridad plausibles pero incorrectos. Es la clase de bug que sólo aparece
 * cuando alguien compara contra otra herramienta, meses después.
 *
 * El guard no persigue al que consume `rank`: persigue al que lo PIDE. Pedir `one_hundred`
 * siempre es gratis y elimina la clase entera — el dato llega en la escala correcta y nadie
 * puede malinterpretarlo después. Así el módulo que hoy no lee `rank` tampoco le deja la trampa
 * armada al consumer de mañana (era exactamente el estado de `prospect/` antes de esta revisión).
 *
 * 🔴 Guarda TEXTUAL: afirma que el parámetro se DECLARA, no que el proveedor lo respete. El
 * verificador real es la respuesta del proveedor — si un `rank` viniera >100 con `one_hundred`
 * pedido, manda la respuesta y este test es el que está mintiendo. Contraste medido en
 * `.claude/skills/dataforseo-operator/references/03-backlinks.md` §7 gotchas 9 y 13.
 */

/** Endpoints de la familia `backlinks` cuya respuesta incluye algún campo `*rank*`. */
const RANK_CAPABLE_ENDPOINTS = [
  'summary/live',
  'backlinks/live',
  'referring_domains/live',
  'anchors/live',
  'competitors/live',
  'domain_intersection/live',
  'page_intersection/live',
  'bulk_ranks/live',
  'bulk_pages_summary/live',
  'domain_pages_summary/live'
]

/**
 * Módulos (directorios) que declaran alguno de esos endpoints. Se mide por directorio y no por
 * archivo porque el repo separa el CONTRATO (`contracts.ts`, donde vive la constante del
 * endpoint) de la LLAMADA (`collect.ts`, donde se arma el payload): exigirlo por archivo daría
 * un rojo falso en el contrato y un verde falso en la llamada.
 */
const modulesDeclaringRankCapableEndpoints = (): string[] => {
  const output = execSync(`git grep -l "/v3/backlinks/" -- 'src/**/*.ts' 'services/**/*.ts' || true`, {
    encoding: 'utf8'
  })

  const files = output
    .split('\n')
    .filter(Boolean)
    .filter(file => !file.includes('__tests__'))
    // El registry de familias declara el PREFIJO de la familia, no un endpoint concreto.
    .filter(file => !file.endsWith('dataforseo-families.ts'))
    .filter(file => {
      const source = readFileSync(file, 'utf8')

      return RANK_CAPABLE_ENDPOINTS.some(endpoint => source.includes(`/v3/backlinks/${endpoint}`))
    })

  return [...new Set(files.map(file => file.split('/').slice(0, -1).join('/')))]
}

describe('DataForSEO backlinks — rank_scale declarado', () => {
  it('todo módulo que llama un endpoint backlinks con rank pide escala 0-100 explícita', () => {
    const offenders = modulesDeclaringRankCapableEndpoints().filter(dir => {
      const grep = execSync(`git grep -l "rank_scale" -- '${dir}/*.ts' || true`, { encoding: 'utf8' })

      return grep.trim().length === 0
    })

    expect(offenders, `Módulos que piden \`rank\` en escala 0–1000 sin declararlo: ${offenders.join(', ')}`).toEqual(
      []
    )
  })

  it('el guard mide algo: hay al menos un módulo bajo vigilancia', () => {
    expect(modulesDeclaringRankCapableEndpoints().length).toBeGreaterThan(0)
  })
})
