import { describe, expect, it } from 'vitest'

import { findFalCapability } from '@/lib/ai/fal-capabilities'
import {
  assertMaxInputImages,
  assertSeedAllowed,
  assertSplitThreshold,
  assertTrainingFrames,
  detectMediaFormat,
  parseLoraFlag,
  reconcileOutputExtension,
  resolveImageOutputFormat
} from '@/lib/ai/fal-input-rules'

const cap = (id: string) => findFalCapability(id)!
const bytes = (...values: number[]) => new Uint8Array(values)
const ascii = (value: string) => [...value].map(char => char.charCodeAt(0))

describe('reglas de entrada del CLI fal', () => {
  it('detecta el formato real por los bytes', () => {
    expect(detectMediaFormat(bytes(0x89, ...ascii('PNG'), 0x0d, 0x0a, 0x1a, 0x0a))).toBe('png')
    expect(detectMediaFormat(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('jpeg')
    expect(detectMediaFormat(bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP')))).toBe('webp')
    expect(detectMediaFormat(bytes(0, 0, 0, 0x18, ...ascii('ftypisom')))).toBe('mp4')
    expect(detectMediaFormat(bytes(1, 2, 3))).toBeNull()
  })

  // Caso fuente: Seedream Pro entrega JPEG por defecto y `--out x.png` lo guardaba con extensión .png.
  it('corrige la extensión cuando el archivo real no coincide', () => {
    expect(reconcileOutputExtension('out/kv.png', 'jpeg')).toBe('out/kv.jpg')
    expect(reconcileOutputExtension('out/kv.jpeg', 'jpeg')).toBe('out/kv.jpeg')
    expect(reconcileOutputExtension('out/kv.png', 'png')).toBe('out/kv.png')
    expect(reconcileOutputExtension('out/kv.png', null)).toBe('out/kv.png')
  })

  it('deriva output_format de la extensión de --out en Seedream Pro', () => {
    expect(resolveImageOutputFormat({ capability: cap('seedream5-pro'), outPath: 'kv.png' })).toBe('png')
    expect(resolveImageOutputFormat({ capability: cap('seedream5-pro'), outPath: 'kv.jpg' })).toBe('jpeg')
    expect(resolveImageOutputFormat({ capability: cap('seedream5-pro'), format: 'png' })).toBe('png')
    expect(() => resolveImageOutputFormat({ capability: cap('seedream5-pro'), outPath: 'kv.webp' })).toThrow('.png o .jpg')
  })

  it('rechaza --format en Seedream Lite, que no expone output_format', () => {
    expect(() => resolveImageOutputFormat({ capability: cap('seedream5-lite'), format: 'jpeg' })).toThrow('no acepta --format')
    expect(resolveImageOutputFormat({ capability: cap('seedream5-lite'), outPath: 'a.png' })).toBeUndefined()
  })

  it('sólo acepta --seed donde el endpoint lo declara', () => {
    expect(() => assertSeedAllowed(cap('wan3-t2v'), '7')).not.toThrow()
    expect(() => assertSeedAllowed(cap('seedance25-r2v'), '7')).not.toThrow()
    expect(() => assertSeedAllowed(cap('seedream5-pro'), '7')).toThrow('no declara seed')
    expect(() => assertSeedAllowed(cap('seedance20-t2v'), '7')).toThrow('no declara seed')
    expect(() => assertSeedAllowed(cap('flux3-t2v'), undefined)).not.toThrow()
  })

  it('limita --image al tope real de Seedream edit', () => {
    expect(() => assertMaxInputImages(cap('seedream5-pro-edit'), 10)).not.toThrow()
    expect(() => assertMaxInputImages(cap('seedream5-lite-edit'), 11)).toThrow('máximo 10')
    expect(() => assertMaxInputImages(cap('wan3-r2v'), 50)).not.toThrow()
  })

  it('parsea --lora con escala y weight_name', () => {
    expect(parseLoraFlag('user/repo@0.8#weights.safetensors', 0, 4)).toEqual({
      path: 'user/repo',
      scale: 0.8,
      weight_name: 'weights.safetensors'
    })
    expect(parseLoraFlag('https://x.test/l.safetensors', 0, 4)).toEqual({ path: 'https://x.test/l.safetensors' })
    expect(() => parseLoraFlag('user/repo@9', 0, 4)).toThrow('escala')
    expect(() => parseLoraFlag('user/repo#', 0, 4)).toThrow('weight_name')
  })

  it('valida la regla de cuadros y el umbral de división del entrenador H3', () => {
    const training = cap('h3-train-t2v').training!

    for (const frames of [22, 39, 56, 73, 90, 107, 124]) expect(assertTrainingFrames(training, frames)).toBe(frames)
    expect(() => assertTrainingFrames(training, 72)).toThrow('% 17 == 5')
    expect(() => assertTrainingFrames(training, 141)).toThrow()
    expect(assertSplitThreshold(training, '30')).toBe(30)
    expect(() => assertSplitThreshold(training, 90)).toThrow('entre 1 y 60')
  })
})
