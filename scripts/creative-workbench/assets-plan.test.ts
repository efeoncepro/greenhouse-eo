import { describe, expect, it } from 'vitest'

import { planPublicacion, prefijosDeLock } from './assets-plan.mjs'

const SPARK = 'node_modules/@efeoncepro/axis-brand-assets/assets/sparks/spark-01-frente.png'
const KIT = 'ai-generations/2026-10-01_traje-bionico-nexa/final/efeonce-traje-bionico-nexa-01-frente-1600x1600-v01-transparente.png'

describe('creative:assets:publish — prefijos del canon', () => {
  it('cubre todos los prefijos que declara el lock, también los de un paquete npm', () => {
    expect(prefijosDeLock([KIT, SPARK, 'ai-generations/otra/x.png'])).toEqual(['ai-generations', 'node_modules'])
  })

  it('rechaza rutas absolutas o con «..»', () => {
    expect(() => prefijosDeLock(['/etc/passwd'])).toThrow(/inválida/)
    expect(() => prefijosDeLock(['ai-generations/../secreto.png'])).toThrow(/inválida/)
  })
})

describe('creative:assets:publish — plan', () => {
  const declared: Array<[string, { sha256: string }]> = [
    [KIT, { sha256: 'a' }],
    [SPARK, { sha256: 'b' }],
    ['ai-generations/faltante/x.png', { sha256: 'c' }]
  ]

  it('un Spark ya publicado con su huella cuenta al día (caso fuente 2026-10-02: 182 «a subir» eternos)', () => {
    const remoteHash = new Map([
      [KIT, 'a'],
      [SPARK, 'b']
    ])

    const plan = planPublicacion({ declared, remoteHash, existe: r => r !== 'ai-generations/faltante/x.png' })

    expect(plan.alDia).toBe(2)
    expect(plan.aSubir).toEqual([])
    expect(plan.faltanLocal).toEqual(['ai-generations/faltante/x.png'])
  })

  it('una huella distinta en el canon se vuelve a subir', () => {
    const plan = planPublicacion({ declared: [[SPARK, { sha256: 'b' }]], remoteHash: new Map([[SPARK, 'vieja']]), existe: () => true })

    expect(plan.aSubir).toEqual([{ ruta: SPARK, sha256: 'b' }])
  })
})
