import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import type { VideoEditEngine } from './adapters/video-fal'
import { buildVideoEditInput } from './adapters/video-fal'
import { probeVideo } from './ffmpeg'
import { encodeMaskPng, maskFromRect } from './mask'
import { median, reconcileFrameCount, runVideoInpaint, spreadIndices } from './pipeline-video'
import { shapeAt, validateKeyframes } from './video-mask'

vi.mock('server-only', () => ({}))

describe('piezas puras del pipeline de video', () => {
  it('reconcilia ±1 cuadro y rechaza el resto', () => {
    expect(reconcileFrameCount(48, 48)).toBe('exact')
    expect(reconcileFrameCount(48, 47)).toBe('padded-last')
    expect(reconcileFrameCount(48, 49)).toBe('dropped-last')
    expect(() => reconcileFrameCount(48, 40)).toThrow(/no calza/)
  })

  it('interpola keyframes de rectángulo y se queda quieta fuera del rango', () => {
    const keyframes = validateKeyframes({ keyframes: [{ t: 2, rect: [0.5, 0, 1, 1] }, { t: 0, rect: [0, 0, 0.5, 1] }] })

    expect(shapeAt(keyframes, 1).rect).toEqual([0.25, 0, 0.75, 1])
    expect(shapeAt(keyframes, -1).rect).toEqual([0, 0, 0.5, 1])
    expect(shapeAt(keyframes, 9).rect).toEqual([0.5, 0, 1, 1])
    expect(() => validateKeyframes({ keyframes: [{ t: 0, polygon: [[0, 0], [1, 0], [1, 1]] }, { t: 1, polygon: [[0, 0], [1, 1]] }] })).toThrow(/mismo número/)
  })

  it('median y spreadIndices', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([1, 2, 3, 4])).toBe(2.5)
    expect(spreadIndices(100, 6)).toEqual([0, 20, 40, 59, 79, 99])
    expect(spreadIndices(3, 6)).toEqual([0, 1, 2])
  })

  it('arma el pedido de cada motor', () => {
    expect(buildVideoEditInput('flux3-edit', { prompt: 'p', videoUrl: 'v', durationSeconds: 5 })).toEqual({ prompt: 'p', video_url: 'v' })
    expect(buildVideoEditInput('seedance25-edit', { prompt: 'p', videoUrl: 'v', imageUrl: 'i', durationSeconds: 2 })).toEqual({
      prompt: 'p',
      task: 'editing',
      video_urls: ['v'],
      image_urls: ['i'],
      duration: '4',
      resolution: '720p'
    })
  })
})

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0

// Integración con ffmpeg real (instalado en el equipo del operador y en los runners Ubuntu de GitHub). Si falta, el
// describe queda saltado y lo dice en su nombre: un salto NO es un verde.
describe.skipIf(!hasFfmpeg)(`pipeline de video con ffmpeg real${hasFfmpeg ? '' : ' — SALTADO: ffmpeg no está en el PATH'}`, () => {
  let dir: string
  let video: string
  let mask: string

  const ffmpeg = (args: string[]) => {
    const result = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args])

    if (result.status !== 0) throw new Error(String(result.stderr))
  }

  /** Motor de mentira: aplica un filtro de ffmpeg al video, como si fuera la salida de un proveedor. */
  const fakeEngine = (filter: string, overrides: Partial<VideoEditEngine> = {}): VideoEditEngine => ({
    id: 'fake',
    label: 'fake',
    slug: 'fake/video',
    acceptsReferenceImage: false,
    maxSourceSeconds: 15,
    maxSourceBytes: 50 * 1024 * 1024,
    verifiedAt: '2026-10-02',
    revision: 1,
    estimate: () => ({ usd: 0.01, basis: 'fake' }),
    async run({ video: bytes }) {
      const input = join(dir, `in-${Math.random()}.mp4`)
      const output = join(dir, `out-${Math.random()}.mp4`)

      await writeFile(input, bytes)
      ffmpeg(['-i', input, '-vf', filter, '-an', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', output])

      return { video: await readFile(output), meta: {} }
    },
    ...overrides
  })

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'inpaint-video-'))
    video = join(dir, 'clip.mp4')
    mask = join(dir, 'mask.png')
    ffmpeg(['-f', 'lavfi', '-i', 'testsrc2=size=320x240:rate=24:duration=2', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', video])
    await writeFile(mask, await encodeMaskPng(maskFromRect(320, 240, { x0: 0.1, y0: 0.1, x1: 0.4, y1: 0.5 })))
  })

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('el motor cambia todo el cuadro y la zona protegida queda idéntica en cada cuadro, con audio copiado', async () => {
    // Un recuadro rojo en la zona y un leve cambio global de brillo (deriva chica, como un proveedor real).
    const engine = fakeEngine('eq=brightness=0.02,drawbox=x=40:y=30:w=80:h=80:color=red@1:t=fill')
    const result = await runVideoInpaint({ videoPath: video, mask: { kind: 'static', path: mask, convention: 'white-editable' }, prompt: 'a red box', engine, runRoot: join(dir, 'run'), log: () => undefined })

    expect(result.exitCode).toBe(0)
    expect(result.manifest.verification).toMatchObject({ verdict: 'PASS', protectedMaxDelta: 0, framesChecked: 48 })
    expect(result.manifest.frames?.reconciled).toBe('exact')
    expect(result.manifest.temporal?.editedMeanDelta).toBeGreaterThan(10)

    const probe = await probeVideo(join(result.runDir, 'final.mp4'))

    expect([probe.width, probe.height, probe.hasAudio]).toEqual([320, 240, true])
  }, 120_000)

  it('aborta si el motor movió el encuadre (recomponer daría ghosting)', async () => {
    const engine = fakeEngine('crop=280:210:20:15,scale=320:240')

    await expect(
      runVideoInpaint({ videoPath: video, mask: { kind: 'static', path: mask, convention: 'white-editable' }, prompt: 'x', engine, runRoot: join(dir, 'run-shift'), log: () => undefined })
    ).rejects.toThrow(/movió el encuadre/)
  }, 120_000)

  it('dry-run y caché: no llama al motor en dry-run ni al repetir la misma entrada', async () => {
    const run = vi.fn(fakeEngine('drawbox=x=40:y=30:w=80:h=80:color=blue@1:t=fill').run)
    const engine = fakeEngine('null', { run })
    const options = { videoPath: video, mask: { kind: 'static' as const, path: mask, convention: 'white-editable' as const }, prompt: 'a blue box', engine, runRoot: join(dir, 'run-cache'), log: () => undefined }

    expect((await runVideoInpaint({ ...options, dryRun: true })).manifest.status).toBe('dry-run')
    expect(run).not.toHaveBeenCalled()

    await runVideoInpaint(options)
    const again = await runVideoInpaint(options)

    expect(again.reused).toBe(true)
    expect(run).toHaveBeenCalledTimes(1)
  }, 180_000)

  it('rechaza first-frame con un motor que no recibe imágenes y un video más largo que el tope', async () => {
    const options = { videoPath: video, mask: { kind: 'static' as const, path: mask, convention: 'white-editable' as const }, prompt: 'x', runRoot: join(dir, 'run-x'), log: () => undefined }

    await expect(runVideoInpaint({ ...options, engine: fakeEngine('null'), strategy: 'first-frame' })).rejects.toThrow(/first-frame/)
    await expect(runVideoInpaint({ ...options, engine: fakeEngine('null', { maxSourceSeconds: 1 }) })).rejects.toThrow(/acepta hasta 1 s/)
  })
})
