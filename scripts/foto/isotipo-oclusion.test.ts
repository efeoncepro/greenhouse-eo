// Pruebas de la oclusión y los pliegues de `pnpm foto:isotipo` (2026-10-03). Caso fuente: EC2, la mano de Karo
// sobre el pecho — la limpieza pintaba la mano de tela y el isotipo quedaba encima de los dedos. Plates sintéticos:
// tela navy, un emblema falso blanco y, encima, una «mano» de piel o una «manga» del mismo navy.
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { clasificarZona, componerIsotipo } from './isotipo.mjs'

const W = 600
const H = 400
const NAVY = { r: 12, g: 30, b: 70 }
const PIEL = '#c8946e'

const svg = (cuerpo: string) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${cuerpo}</svg>`)
const FALSO = '<ellipse cx="300" cy="200" rx="46" ry="26" fill="none" stroke="#f2f2f2" stroke-width="6"/>'

const plate = async (dir: string, cuerpo: string, nombre = 'plate.png') => {
  const file = path.join(dir, nombre)

  await sharp({ create: { width: W, height: H, channels: 3, background: NAVY } }).composite([{ input: svg(cuerpo), left: 0, top: 0 }]).png().toFile(file)

  return file
}

const leer = async (file: string) => sharp(file).raw().toBuffer({ resolveWithObject: true })

type Procedencia = { oclusion: { pixelesEnCaja: number; pixelesDeMarcaTapados: number; mascara?: string }; pliegues: { intensidad: number; relieve: number } | null }
const proc = (r: { procedencia: object }) => r.procedencia as Procedencia

const px = (img: { data: Buffer; info: { width: number; channels: number } }, x: number, y: number) => {
  const i = (y * img.info.width + x) * img.info.channels

  return [img.data[i], img.data[i + 1], img.data[i + 2]]
}

describe('foto:isotipo · oclusión', () => {
  it('clasifica tela, marca inventada y piel: la piel es oclusor, no se limpia', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'isotipo-ocl-'))
    const file = await plate(dir, `${FALSO}<rect x="300" y="150" width="60" height="120" fill="${PIEL}"/>`)
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const box = { left: 240, top: 160, width: 120, height: 80 }
    const { clase } = clasificarZona(data, { W, H, ch: info.channels, box, umbral: 38 })
    const en = (x: number, y: number) => clase[(y - box.top) * box.width + (x - box.left)]

    expect(en(250, 170)).toBe(0) // tela
    expect(en(254, 200)).toBe(1) // trazo del emblema falso (izquierda, fuera de la mano)
    expect(en(330, 200)).toBe(2) // la mano
  })

  it('la mano queda intacta y DELANTE del isotipo oficial; la marca falsa visible se limpia', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'isotipo-ocl-'))
    const file = await plate(dir, `${FALSO}<rect x="300" y="150" width="60" height="120" fill="${PIEL}"/>`)
    const r = await componerIsotipo({ plate: file, centro: [0.5, 0.5], ancho: 0.15, limpiar: true })
    const antes = await leer(file)
    const despues = await leer(r.out)

    // Cada píxel de la mano, igual que antes (ni limpiado ni tapado por la marca).
    for (let y = 152; y < 268; y += 4) for (let x = 302; x < 358; x += 4) expect(px(despues, x, y)).toEqual(px(antes, x, y))

    expect(proc(r).oclusion.pixelesEnCaja).toBeGreaterThan(0)
    expect(proc(r).oclusion.pixelesDeMarcaTapados).toBeGreaterThan(0)
    // El trazo izquierdo del falso (fuera del isotipo oficial) quedó tela.
    expect(px(despues, 254, 200)[0]).toBeLessThan(60)
  })

  it('una manga del MISMO color sólo se respeta con --oclusion (máscara canónica de ai:mask)', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'isotipo-ocl-'))
    const file = await plate(dir, '<rect x="300" y="100" width="70" height="220" fill="rgb(14,32,74)"/>')
    const mascara = path.join(dir, 'manga.png')

    await sharp({ create: { width: W, height: H, channels: 3, background: '#000' } })
      .composite([{ input: svg('<rect x="300" y="100" width="70" height="220" fill="#fff"/>'), left: 0, top: 0 }])
      .png()
      .toFile(mascara)

    const sin = await componerIsotipo({ plate: file, centro: [0.5, 0.5], ancho: 0.15, out: path.join(dir, 'sin.png') })
    const con = await componerIsotipo({ plate: file, centro: [0.5, 0.5], ancho: 0.15, oclusion: mascara, out: path.join(dir, 'con.png') })
    const antes = await leer(file)
    const conImg = await leer(con.out)
    const sinImg = await leer(sin.out)
    let difSin = 0

    for (let y = 170; y < 230; y += 2) {
      for (let x = 302; x < 340; x += 2) {
        expect(px(conImg, x, y)).toEqual(px(antes, x, y))
        if (px(sinImg, x, y).join() !== px(antes, x, y).join()) difSin++
      }
    }

    expect(difSin).toBeGreaterThan(0) // sin máscara, la marca pasaba por encima de la manga
    expect(proc(con).oclusion.mascara).toBe('manga.png')
  })
})

describe('foto:isotipo · pliegues', () => {
  it('la sombra de un pliegue oscurece la marca que cruza; con --pliegues 0 queda plana', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'isotipo-pl-'))
    // Una banda vertical de sombra del mismo matiz navy cruza el centro del pecho.
    const file = await plate(dir, '<defs><linearGradient id="g"><stop offset="0" stop-color="rgb(12,30,70)"/><stop offset="0.5" stop-color="rgb(5,13,30)"/><stop offset="1" stop-color="rgb(12,30,70)"/></linearGradient></defs><rect x="285" y="0" width="60" height="400" fill="url(#g)"/>')
    const conPliegue = await componerIsotipo({ plate: file, centro: [0.5, 0.5], ancho: 0.2, out: path.join(dir, 'p1.png') })
    const plano = await componerIsotipo({ plate: file, centro: [0.5, 0.5], ancho: 0.2, pliegues: 0, out: path.join(dir, 'p0.png') })
    const a = await leer(conPliegue.out)
    const b = await leer(plano.out)

    const lum = (img: Awaited<ReturnType<typeof leer>>, x0: number, x1: number) => {
      let s = 0
      let n = 0

      for (let y = 180; y < 220; y++) for (let x = x0; x < x1; x++) { const [r, g, bb] = px(img, x, y);

 if (r > 120) { s += r + g + bb; n++ } }

      return n ? s / n : 0
    }

    // En la sombra (centro) la marca con pliegues es más oscura que la plana; fuera de la sombra, casi igual.
    expect(lum(a, 305, 325)).toBeLessThan(lum(b, 305, 325) - 40)
    expect(Math.abs(lum(a, 250, 270) - lum(b, 250, 270))).toBeLessThan(40)
    expect(proc(conPliegue).pliegues).toEqual({ intensidad: 1, relieve: 1 })
    expect(proc(plano).pliegues).toBeNull()
  })

  it('valida --pliegues y --relieve', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'isotipo-pl-'))
    const file = await plate(dir, '')

    await expect(componerIsotipo({ plate: file, centro: [0.5, 0.5], ancho: 0.2, pliegues: 2 })).rejects.toThrow(/--pliegues/)
    await expect(componerIsotipo({ plate: file, centro: [0.5, 0.5], ancho: 0.2, relieve: 3 })).rejects.toThrow(/--relieve/)
  })
})
