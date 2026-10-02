import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sharp from 'sharp'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { InpaintImageAdapter } from './adapters/types'
import { pickGridSize } from './crop'
import { encodeMaskPng, maskFromRect } from './mask'
import { exitCodeFor, runImageInpaint, type ImageInpaintManifest } from './pipeline-image'
import { loadRgba } from './raw'
import { verifyRecomposition } from './recompose'

vi.mock('server-only', () => ({}))

const W = 640
const H = 480

const noisePng = async (width: number, height: number, seed: number) => {
  const data = Buffer.alloc(width * height * 3)
  let state = seed

  for (let i = 0; i < data.length; i += 1) {
    state = (state * 1103515245 + 12345) % 2147483648
    data[i] = state % 256
  }

  return sharp(data, { raw: { width, height, channels: 3 } }).png().toBuffer()
}

/** Proveedor de mentira que, como GPT Image 2.5 medido, redibuja la imagen ENTERA. */
const fakeAdapter = (overrides: Partial<InpaintImageAdapter> = {}) => {
  const run = vi.fn(async ({ size }: { size: { width: number; height: number } }) => ({
    image: await noisePng(size.width, size.height, 99),
    providerModel: 'fake-1',
    outputUsd: 0.01,
    usage: { output_tokens: 1 },
    meta: {}
  }))

  const adapter: InpaintImageAdapter = {
    id: 'fake',
    provider: 'openai',
    label: 'fake',
    defaultModel: 'fake-1',
    sendsMask: true,
    maskConvention: 'white-editable',
    verifiedAt: '2026-10-02',
    validate: () => undefined,
    pickSize: () => (aspect, area) => pickGridSize(aspect, area, { step: 16, minArea: 65_536, maxArea: 1_048_576, maxEdge: 2048, maxRatio: 3 }),
    estimate: async ({ count }) => ({ usd: 0.01 * count, basis: 'fake' }),
    run,
    ...overrides
  }

  return { adapter, run }
}

let dir: string
let image: string
let mask: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'inpaint-'))
  image = join(dir, 'base.png')
  mask = join(dir, 'mask.png')
  await writeFile(image, await noisePng(W, H, 1))
  await writeFile(mask, await encodeMaskPng(maskFromRect(W, H, { x0: 0.6, y0: 0.6, x1: 0.75, y1: 0.8 })))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

const base = (adapter: InpaintImageAdapter) => ({ imagePath: image, maskPath: mask, prompt: 'a red cup on the table', adapter, runRoot: join(dir, 'pieza'), log: () => undefined })

describe('pnpm ai:inpaint image — pipeline', () => {
  it('dry-run: escribe máscara, recorte y manifiesto sin llamar al proveedor', async () => {
    const { adapter, run } = fakeAdapter()
    const result = await runImageInpaint({ ...base(adapter), dryRun: true })

    expect(run).not.toHaveBeenCalled()
    expect(result.manifest.status).toBe('dry-run')
    expect(result.manifest.crop.mode).toBe('crop')
    await expect(readFile(join(result.runDir, 'mask-preview.png'))).resolves.toBeInstanceOf(Buffer)
    await expect(readFile(join(result.runDir, 'provider-input.png'))).resolves.toBeInstanceOf(Buffer)
  })

  it('aunque el proveedor redibuje todo, el archivo final deja la zona protegida idéntica', async () => {
    const { adapter, run } = fakeAdapter()
    const result = await runImageInpaint({ ...base(adapter), count: 2 })

    expect(run).toHaveBeenCalledTimes(2)
    expect(result.exitCode).toBe(0)
    expect(result.manifest.candidates.map(c => c.verdict)).toEqual(['PASS', 'PASS'])
    expect(result.manifest.candidates[0].modelDriftInProtected.maxDelta).toBeGreaterThan(0)

    const original = await loadRgba(image)
    const written = await loadRgba(join(result.runDir, 'candidate-1.png'))
    const reread = verifyRecomposition(original, written, maskFromRect(W, H, { x0: 0.6, y0: 0.6, x1: 0.75, y1: 0.8 }))

    expect(reread.protected.maxDelta).toBe(0)
    expect(reread.editable.meanDelta).toBeGreaterThan(0)
    await expect(readFile(join(result.runDir, 'contact-sheet.png'))).resolves.toBeInstanceOf(Buffer)
  })

  it('la misma entrada no vuelve a pagar; --force sí', async () => {
    const { adapter, run } = fakeAdapter()

    await runImageInpaint(base(adapter))
    const second = await runImageInpaint(base(adapter))

    expect(second.reused).toBe(true)
    expect(run).toHaveBeenCalledTimes(1)

    await runImageInpaint({ ...base(adapter), force: true })
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('un prompt distinto es otra corrida', async () => {
    const { adapter, run } = fakeAdapter()

    const a = await runImageInpaint(base(adapter))
    const b = await runImageInpaint({ ...base(adapter), prompt: 'a blue cup' })

    expect(a.runDir).not.toBe(b.runDir)
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('sobre el tope de costo no llama al proveedor sin --yes', async () => {
    const { adapter, run } = fakeAdapter({ estimate: async () => ({ usd: 5, basis: 'caro' }) })

    await expect(runImageInpaint({ ...base(adapter), maxUsd: 1 })).rejects.toThrow(/supera el tope/)
    expect(run).not.toHaveBeenCalled()

    await runImageInpaint({ ...base(adapter), maxUsd: 1, yes: true })
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('la guarda de marca detiene antes de gastar salvo --allow-brand', async () => {
    const { adapter, run } = fakeAdapter()

    await expect(runImageInpaint({ ...base(adapter), prompt: 'put the Efeonce logo on the mug' })).rejects.toThrow(/allow-brand/)
    expect(run).not.toHaveBeenCalled()
  })

  it('rechaza una máscara de otro tamaño y una 100 % editable', async () => {
    const { adapter } = fakeAdapter()

    await writeFile(mask, await encodeMaskPng(maskFromRect(100, 100, { x0: 0, y0: 0, x1: 0.5, y1: 0.5 })))
    await expect(runImageInpaint(base(adapter))).rejects.toThrow(/deben medir lo mismo/)

    await writeFile(mask, await encodeMaskPng(maskFromRect(W, H, { x0: 0, y0: 0, x1: 1, y1: 1 })))
    await expect(runImageInpaint(base(adapter))).rejects.toThrow(/100 %/)
  })

  it('un fallo del proveedor deja el manifiesto en failed con el error', async () => {
    const { adapter } = fakeAdapter({ run: async () => { throw new Error('proveedor caído') } })

    await expect(runImageInpaint(base(adapter))).rejects.toThrow('proveedor caído')
  })

  it('código de salida: 0 todo PASS, 2 si alguno FAIL, 1 si la corrida falló', () => {
    const candidate = { verdict: 'PASS' } as ImageInpaintManifest['candidates'][number]

    expect(exitCodeFor({ status: 'completed', candidates: [candidate] })).toBe(0)
    expect(exitCodeFor({ status: 'completed', candidates: [candidate, { ...candidate, verdict: 'FAIL' }] })).toBe(2)
    expect(exitCodeFor({ status: 'failed', candidates: [] })).toBe(1)
  })

  it('el manifiesto no guarda secretos ni el contenido de la imagen', async () => {
    const { adapter } = fakeAdapter()
    const result = await runImageInpaint(base(adapter))
    const text = await readFile(join(result.runDir, 'manifest.json'), 'utf8')

    expect(text).not.toMatch(/sk-|Bearer|api[_-]?key|base64/i)
    expect(JSON.parse(text)).toMatchObject({ kind: 'ai-inpaint-image', status: 'completed', adapter: { id: 'fake' } })
  })
})
