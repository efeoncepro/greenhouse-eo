// Pruebas de `pnpm foto:isotipo --acabado` (regla del operador 2026-09-28: «si compones el isotipo, el modelo lo
// TERMINA»). `pnpm ai:image` está simulado: el «modelo» falso aclara TODO el recorte y le suma un gradiente de luz,
// que es lo que hace el real (medido en MC1h: −16 de desplazamiento). Así se prueba lo que importa: que ese
// aclarado no salga de la silueta (sin halo), que la marca sí reciba la luz y que la procedencia quede escrita.
import { EventEmitter } from 'node:events'
import type * as ChildProcess from 'node:child_process'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import sharp from 'sharp'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { componerIsotipo, contarCambios, IsotipoError, MODELO_ACABADO, parseArgs, ZONA_MARCA_PX } from './isotipo.mjs'

vi.mock('node:child_process', async importOriginal => ({
  ...(await importOriginal<typeof ChildProcess>()),
  spawn: vi.fn()
}))

const spawnSimulado = vi.mocked(spawn)

const W = 800
const H = 600

type Respuesta = { codigo?: number; stdout?: string; escribir?: boolean }

const valor = (args: readonly string[], nombre: string): string => args[args.indexOf(nombre) + 1]

/**
 * El «modelo»: +40 en todo el recorte, un gradiente vertical de 0 a 30 y un grano en damero de 8 px de la placa
 * (0 o 12). El aclarado parejo lo cancela la corrección de color; el grano no, así que delata cualquier píxel
 * donde se mezcló la edición y no correspondía.
 */
const modeloFalso = async (recorte: string, salida: string): Promise<void> => {
  const { data, info } = await sharp(recorte).removeAlpha().raw().toBuffer({ resolveWithObject: true })

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 3
      const grano = (Math.floor(x / 16) + Math.floor(y / 16)) % 2 ? 12 : 0
      const luz = 40 + Math.round((y / info.height) * 30) + grano

      for (let k = 0; k < 3; k++) data[i + k] = Math.min(255, data[i + k] + luz)
    }
  }

  await sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toFile(salida)
}

const OK = '  $ costo estimado ≈ USD 0.053 (1 × 1756 tokens de salida × USD 30/1M; la entrada suma aparte)\n' +
  `  ✓ 812KB · ${MODELO_ACABADO} · 1024x1024 · high\n    usage: in 1400 (img 1100 · txt 300) · out 1756 · total 3156\ndone\n`

/** Hijo falso de `spawn`: hace el trabajo del modelo (si corresponde), emite la salida y cierra. */
const responder = ({ codigo = 0, stdout = OK, escribir = true }: Respuesta = {}) => {
  spawnSimulado.mockImplementation(((_cmd: string, args: readonly string[]) => {
    const hijo = Object.assign(new EventEmitter(), { stdout: new EventEmitter(), stderr: new EventEmitter() })

    setImmediate(async () => {
      if (escribir) await modeloFalso(valor(args, '--image'), valor(args, '--out'))
      hijo.stdout.emit('data', Buffer.from(stdout))
      hijo.emit('close', codigo)
    })

    return hijo
  }) as unknown as typeof spawn)
}

/** Placa clara con un gradiente horizontal (una pechera iluminada de lado), sin emblema. */
const placaClara = async (dir: string): Promise<string> => {
  const data = Buffer.alloc(W * H * 3)

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = 150 + Math.round((x / W) * 30)

      data.fill(v, (y * W + x) * 3, (y * W + x) * 3 + 3)
    }
  }

  const file = path.join(dir, 'plate.png')

  await sharp(data, { raw: { width: W, height: H, channels: 3 } }).png().toFile(file)

  return file
}

/** Tela navy con un emblema FALSO blanco más grande que el oficial (el caso que exige limpiar). */
const placaConEmblemaFalso = async (dir: string): Promise<string> => {
  const falso = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><ellipse cx="400" cy="300" rx="48" ry="30" fill="none" stroke="#f2f2f2" stroke-width="6"/></svg>`
  )

  const file = path.join(dir, 'plate.png')

  await sharp({ create: { width: W, height: H, channels: 3, background: { r: 12, g: 30, b: 70 } } })
    .composite([{ input: falso, left: 0, top: 0 }])
    .png()
    .toFile(file)

  return file
}

const leer = async (file: string) => {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true })

  return { data, width: info.width, height: info.height, channels: info.channels }
}

const pixel = (img: Awaited<ReturnType<typeof leer>>, x: number, y: number): number[] =>
  Array.from(img.data.subarray((y * img.width + x) * img.channels, (y * img.width + x) * img.channels + 3))

const nuevoDir = () => mkdtempSync(path.join(tmpdir(), 'isotipo-acabado-'))

beforeEach(() => {
  spawnSimulado.mockReset()
})

describe('foto:isotipo --acabado', () => {
  it('termina la marca sólo sobre su silueta: 0 px fuera, luz nueva dentro y procedencia completa', async () => {
    responder()
    const plate = await placaClara(nuevoDir())
    const superficie = 'a white armored chest plate of a futuristic suit'

    const r = (await componerIsotipo({ plate, centro: [0.5, 0.5], ancho: 0.08, prenda: 'clara', limpiar: false, acabado: true, superficie })) as {
      out: string
      acabado: { out: string; comparar: string; verificacion: { cambiadosFueraDeLaMarca: number; cambiadosEnLaMarca: number } }
    }

    // El llamado a ai:image: el modelo, la calidad y el tamaño del método probado; el recorte como imagen.
    expect(spawnSimulado).toHaveBeenCalledTimes(1)
    const [cmd, args] = spawnSimulado.mock.calls[0] as unknown as [string, string[]]

    expect(cmd).toBe('pnpm')
    expect(args.slice(0, 2)).toEqual(['-s', 'ai:image'])
    expect(valor(args, '--model')).toBe('gpt-image-2.5-sunburst')
    expect(valor(args, '--quality')).toBe('high')
    expect(valor(args, '--size')).toBe('1024x1024')
    expect(valor(args, '--image')).toBe(plate.replace(/\.png$/, '-isotipo-acabado-recorte.png'))
    expect(valor(args, '--prompt')).toContain(superficie)
    expect(valor(args, '--prompt')).toContain('small navy Efeonce mark')

    // Archivos: acabado, recorte ampliado a 1024, edición y hoja al 300 %.
    const base = plate.replace(/\.png$/, '-isotipo-acabado')

    expect(r.acabado.out).toBe(`${base}.png`)
    for (const f of [`${base}.png`, `${base}-recorte.png`, `${base}-edicion.png`, `${base}-comparar.png`]) expect(existsSync(f)).toBe(true)
    expect(await sharp(`${base}-recorte.png`).metadata()).toMatchObject({ width: 1024, height: 1024 })

    const hoja = await sharp(`${base}-comparar.png`).metadata()
    const s = Math.round(64 * 3.2)

    expect(hoja).toMatchObject({ width: s * 3 * 2 + 10, height: s * 3 })

    // Sin halo: el modelo aclaró +40…+70 TODO el recorte, y fuera de la marca no cambió ni un píxel.
    const compuesto = await leer(r.out)
    const acabado = await leer(r.acabado.out)

    expect(r.acabado.verificacion.cambiadosFueraDeLaMarca).toBe(0)
    expect(pixel(acabado, 400, 250)).toEqual(pixel(compuesto, 400, 250)) // 50 px sobre el centro, dentro del recorte
    expect(pixel(acabado, 350, 300)).toEqual(pixel(compuesto, 350, 300)) // a la izquierda de la marca

    // La marca sí recibió la luz del modelo, pero sin el aclarado global: el desplazamiento de la media lo quitó.
    expect(r.acabado.verificacion.cambiadosEnLaMarca).toBeGreaterThan(0)
    let suma = 0
    let n = 0

    for (let y = 290; y < 310; y++) {
      for (let x = 385; x < 415; x++) {
        const a = pixel(acabado, x, y)
        const c = pixel(compuesto, x, y)

        if (a.some((v, k) => v !== c[k])) {
          suma += a[2] - c[2]
          n++
        }
      }
    }

    expect(n).toBeGreaterThan(0)
    expect(Math.abs(suma / n)).toBeLessThan(15) // sin corregir serían +40 o más

    // Procedencia en el .json que foto:isotipo ya produce.
    const json = JSON.parse(readFileSync(r.out.replace(/\.png$/, '.json'), 'utf8'))

    expect(json.schema).toBe('efeonce.foto.isotipo.v1')
    expect(json.acabado).toMatchObject({
      veredicto: 'aprobado',
      salida: path.basename(`${base}.png`),
      superficie,
      modelo: { solicitado: MODELO_ACABADO, devuelto: MODELO_ACABADO, calidad: 'high', tamano: '1024x1024', costoEstimadoUsd: 0.053 },
      verificacion: { zonaMarcaPx: ZONA_MARCA_PX, cambiadosFueraDeLaMarca: 0 }
    })
    expect(json.acabado.promptSha256).toBe(createHash('sha256').update(json.acabado.prompt).digest('hex'))
    expect(json.acabado.sha256).toBe(createHash('sha256').update(readFileSync(`${base}.png`)).digest('hex'))
    expect(json.acabado.edicion.sha256).toBe(createHash('sha256').update(readFileSync(`${base}-edicion.png`)).digest('hex'))
  })

  it('con la limpieza encendida, la zona limpiada no recibe el acabado: la silueta sale de la placa limpia', async () => {
    responder()
    const plate = await placaConEmblemaFalso(nuevoDir())

    const r = (await componerIsotipo({ plate, centro: [0.5, 0.5], ancho: 0.08, prenda: 'oscura', acabado: true })) as {
      out: string
      acabado: { out: string; verificacion: { cambiadosFueraDeLaMarca: number } }
    }

    const original = await leer(plate)
    const compuesto = await leer(r.out)
    const acabado = await leer(r.acabado.out)

    // x=352 era trazo del emblema falso (dentro de la caja de limpieza, fuera del oficial): la limpieza lo volvió
    // tela y el acabado no lo tocó. Con la silueta medida contra el original, ahí caería la luz del modelo.
    expect(pixel(original, 352, 300)[0]).toBeGreaterThan(150)
    expect(pixel(compuesto, 352, 300)[0]).toBeLessThan(60)
    expect(pixel(acabado, 352, 300)).toEqual(pixel(compuesto, 352, 300))
    expect(r.acabado.verificacion.cambiadosFueraDeLaMarca).toBe(0)
  })

  it('falla si cambia un píxel fuera de la marca, y deja el acabado como .rechazado.png', async () => {
    responder()
    const plate = await placaClara(nuevoDir())

    // Con una zona de 1 px, el borde suave del alfa (≈ 3 px más allá de la silueta dilatada) cae «fuera».
    await expect(
      componerIsotipo({ plate, centro: [0.5, 0.5], ancho: 0.08, prenda: 'clara', limpiar: false, acabado: true, zonaMarcaPx: 1 })
    ).rejects.toThrow(/fuera de la marca/)

    const base = plate.replace(/\.png$/, '-isotipo-acabado')

    expect(existsSync(`${base}.png`)).toBe(false)
    expect(existsSync(`${base}.rechazado.png`)).toBe(true)

    const json = JSON.parse(readFileSync(plate.replace(/\.png$/, '-isotipo.json'), 'utf8'))

    expect(json.acabado.veredicto).toBe('rechazado')
    expect(json.acabado.verificacion.cambiadosFueraDeLaMarca).toBeGreaterThan(0)
  })

  it('ai:image sale con 0 pero imprime FAILED y no escribe: no hay acabado', async () => {
    responder({ escribir: false, stdout: '  ✗ ./x.png FAILED: 400 Invalid image\ndone\n' })
    const plate = await placaClara(nuevoDir())

    await expect(componerIsotipo({ plate, centro: [0.5, 0.5], ancho: 0.08, prenda: 'clara', acabado: true })).rejects.toThrow(/no devolvió la edición.*Invalid image/)

    expect(existsSync(plate.replace(/\.png$/, '-isotipo.png'))).toBe(true) // el compuesto sí queda
    expect(existsSync(plate.replace(/\.png$/, '-isotipo-acabado.png'))).toBe(false)
  })

  it('ai:image sale con código distinto de 0: falla sin acabado', async () => {
    responder({ codigo: 1, escribir: false, stdout: 'FATAL: OpenAI image generation is not configured.\n' })
    const plate = await placaClara(nuevoDir())

    await expect(componerIsotipo({ plate, centro: [0.5, 0.5], ancho: 0.08, prenda: 'clara', acabado: true })).rejects.toThrow(/código 1/)
  })

  it('no gasta si la marca no cabe en el recorte', async () => {
    responder()
    const plate = await placaClara(nuevoDir())

    await expect(componerIsotipo({ plate, centro: [0.5, 0.5], ancho: 0.3, prenda: 'clara', acabado: true, lado: 256 })).rejects.toThrow(/sube --lado/)
    expect(spawnSimulado).not.toHaveBeenCalled()
  })

  it('sin --acabado no llama al modelo', async () => {
    responder()
    const plate = await placaClara(nuevoDir())
    const r = (await componerIsotipo({ plate, centro: [0.5, 0.5], ancho: 0.08, prenda: 'clara' })) as { acabado?: unknown }

    expect(r.acabado).toBeUndefined()
    expect(spawnSimulado).not.toHaveBeenCalled()
  })

  it('lee --acabado, --superficie y --lado, y conserva --sin-limpiar', () => {
    expect(parseArgs(['--acabado', 'p.png', '--centro', '0.5,0.4', '--ancho', '0.1', '--sin-limpiar', '--superficie', 'a white chest plate', '--lado', '768'])).toMatchObject({
      plate: 'p.png',
      acabado: true,
      limpiar: false,
      superficie: 'a white chest plate',
      lado: 768,
      out: 'p-isotipo.png'
    })
    expect(parseArgs(['p.png', '--centro', '0.5,0.4', '--ancho', '0.1'])).toMatchObject({ acabado: false, superficie: null, lado: 512 })
    expect(() => parseArgs(['p.png', '--centro', '0.5,0.4', '--ancho', '0.1', '--superficie', 'a plate'])).toThrow(/sólo aplican con --acabado/)
    expect(() => parseArgs(['p.png', '--centro', '0.5,0.4', '--ancho', '0.1', '--acabado', '--lado', '64'])).toThrow(/--lado/)
    expect(() => parseArgs(['p.png', '--centro', '0.5,0.4', '--ancho', '0.1', '--out', 'p-isotipo'])).not.toThrow() // --out se valida al componer
  })

  it('--out sin .png se rechaza antes de escribir (el .json pisaba la imagen)', async () => {
    const plate = await placaClara(nuevoDir())

    await expect(componerIsotipo({ plate, centro: [0.5, 0.5], ancho: 0.08, out: plate.replace(/\.png$/, '-x') })).rejects.toThrow(IsotipoError)
  })

  it('contarCambios separa lo cambiado dentro y fuera de la zona de la marca', () => {
    const img = (fill: number) => ({ data: Buffer.alloc(10 * 10 * 4, fill), width: 10, height: 10, channels: 4 })
    const antes = img(100)
    const despues = img(100)
    const zona = new Uint8Array(4 * 4)

    zona[5] = 1 // (1,1) de la caja → (3,3) de la imagen
    despues.data[(3 * 10 + 3) * 4] = 101
    despues.data[(9 * 10 + 9) * 4 + 3] = 0 // un alfa fuera de la caja también cuenta

    expect(contarCambios({ antes, despues, zona, caja: { left: 2, top: 2, lado: 4 } })).toEqual({ fuera: 1, dentro: 1 })
    expect(() => contarCambios({ antes, despues: { ...despues, width: 5 }, zona, caja: { left: 2, top: 2, lado: 4 } })).toThrow(IsotipoError)
  })
})
