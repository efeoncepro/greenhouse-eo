import { describe, expect, it } from 'vitest'

import { findFalCapability } from '@/lib/ai/fal-capabilities'
import { DEFAULT_FAL_COST_CONFIRM_USD, estimateFalCost, falImageArea, resolveFalCostCap } from '@/lib/ai/fal-pricing'

const cap = (id: string) => {
  const capability = findFalCapability(id)

  if (!capability) throw new Error(`capacidad ${id} no existe`)

  return capability
}

describe('estimación de costo fal', () => {
  // Validado contra gasto real 2026-09-16: 3 corridas fast 4 s 480p costaron USD 1,37 (≈ 0,46 cada una).
  it('Seedance: tokens = área × segundos × 24 / 1024 × precio por 1.000', () => {
    const estimate = estimateFalCost({
      capability: cap('seedance20-fast-t2v'),
      input: { duration: '4', resolution: '480p' },
      apiPrice: { unitPrice: 0.0112, unit: '1000 tokens' }
    })

    expect(estimate.confidence).toBe('formula')
    expect(estimate.usd).toBeCloseTo(0.45, 2)
  })

  it('Seedance con duración auto usa el máximo del contrato como cota superior', () => {
    const estimate = estimateFalCost({
      capability: cap('seedance25-t2v'),
      input: { duration: 'auto', resolution: '480p' },
      apiPrice: { unitPrice: 0.0214, unit: '1000 tokens' }
    })

    expect(estimate.confidence).toBe('cota')
    expect(estimate.basis).toContain('30 s')
  })

  it('Seedance sin precio de la API no inventa una cifra', () => {
    expect(estimateFalCost({ capability: cap('seedance20-t2v'), input: { duration: '5' } }).usd).toBeNull()
  })

  // La API devuelve el escalón más bajo; el publicado por resolución prevalece.
  it('Wan 3.0 cobra por escalón de resolución publicado', () => {
    expect(estimateFalCost({ capability: cap('wan3-t2v'), input: { duration: 5, resolution: '1080p' } }).usd).toBe(1)
    expect(estimateFalCost({ capability: cap('wan3-t2v'), input: { duration: 2, resolution: '480p' } }).usd).toBe(0.1)
    expect(estimateFalCost({ capability: cap('wan3prime-t2v'), input: { duration: 5, resolution: '1080p' } }).usd).toBe(1.4)
  })

  it('Wan 3.0 con duración auto (null) estima la cota de 30 s', () => {
    const estimate = estimateFalCost({ capability: cap('wan3-t2v'), input: { duration: null, resolution: '480p' } })

    expect(estimate).toMatchObject({ usd: 1.5, confidence: 'cota' })
  })

  it('H3 base sin resolución estima con su default caro (2K)', () => {
    expect(estimateFalCost({ capability: cap('h3-t2v'), input: {} }).usd).toBe(0.65)
  })

  it('usa el precio de la API cuando no hay escalón publicado', () => {
    const estimate = estimateFalCost({
      capability: cap('h3max-camera'),
      input: { duration: 5 },
      apiPrice: { unitPrice: 0.025, unit: 'seconds' }
    })

    expect(estimate).toMatchObject({ usd: 0.125, confidence: 'api' })
  })

  it('Flux 3 extend cobra los segundos nuevos al precio publicado', () => {
    expect(estimateFalCost({ capability: cap('flux3-extend'), input: { duration: 5, resolution: '720p' } }).usd).toBe(2.05)
    expect(estimateFalCost({ capability: cap('flux3-extend'), input: { duration: 2, resolution: '1080p' } }).usd).toBe(1.06)
  })

  it('Flux 3 edit usa la duración medida del video de origen', () => {
    expect(estimateFalCost({ capability: cap('flux3-edit'), input: {}, sourceSeconds: 5 }).usd).toBe(0.15)
    expect(estimateFalCost({ capability: cap('flux3-edit'), input: {} }).usd).toBeNull()
  })

  it('Seedream Pro cobra por área y por referencia adicional', () => {
    expect(estimateFalCost({ capability: cap('seedream5-pro'), input: { image_size: 'auto_1K' } }).usd).toBe(0.0675)
    expect(estimateFalCost({ capability: cap('seedream5-pro'), input: { image_size: { width: 2048, height: 2048 } } }).usd).toBe(0.135)

    const edit = estimateFalCost({
      capability: cap('seedream5-pro-edit'),
      input: { image_size: 'auto_1K', image_urls: ['a', 'b', 'c'] }
    })

    expect(edit.usd).toBe(0.0765)
  })

  it('Layerize no inventa el número de capas', () => {
    const estimate = estimateFalCost({ capability: cap('seedream5-pro-layerize'), input: { image_size: 'auto_2K' } })

    expect(estimate.usd).toBeNull()
    expect(estimate.basis).toContain('por capa')
  })

  it('entrenadores H3 cobran como mínimo 100 steps', () => {
    const estimate = estimateFalCost({
      capability: cap('h3-train-t2v'),
      input: { number_of_steps: 10 },
      apiPrice: { unitPrice: 0.005, unit: 'steps' }
    })

    expect(estimate.usd).toBe(0.5)
  })

  it('calcula el área de image_size', () => {
    expect(falImageArea('auto_2K')).toBe(2048 * 2048)
    expect(falImageArea({ width: 1536, height: 1024 })).toBe(1536 * 1024)
    expect(falImageArea('landscape_16_9')).toBeNull()
  })

  it('resuelve el tope de confirmación desde flag, env o default', () => {
    expect(resolveFalCostCap(undefined, {})).toBe(DEFAULT_FAL_COST_CONFIRM_USD)
    expect(resolveFalCostCap(undefined, { FAL_COST_CONFIRM_USD: '2.5' })).toBe(2.5)
    expect(resolveFalCostCap('0.3', { FAL_COST_CONFIRM_USD: '2.5' })).toBe(0.3)
    expect(() => resolveFalCostCap('abc', {})).toThrow()
  })
})
