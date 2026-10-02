// Pruebas de `pnpm foto:isotipo` (TASK-1920). Plate sintético: tela navy con un emblema FALSO blanco más
// grande que el oficial. Tras componer: donde el falso sobresalía queda tela, en el centro está el isotipo
// oficial, y la procedencia apunta al SVG del paquete de marca con su huella.
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { componerIsotipo, isotipoOficial, IsotipoError, parseArgs } from './isotipo.mjs'

const W = 600
const H = 400
const NAVY = { r: 12, g: 30, b: 70 }

const plateConEmblemaFalso = async (dir: string): Promise<string> => {
  const falso = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><ellipse cx="300" cy="200" rx="46" ry="26" fill="none" stroke="#f2f2f2" stroke-width="6"/><circle cx="300" cy="200" r="8" fill="#f2f2f2"/></svg>`
  )

  const file = path.join(dir, 'plate.png')

  await sharp({ create: { width: W, height: H, channels: 3, background: NAVY } })
    .composite([{ input: falso, left: 0, top: 0 }])
    .png()
    .toFile(file)

  return file
}

const pixel = async (file: string, x: number, y: number): Promise<number[]> => {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true })
  const i = (y * info.width + x) * info.channels

  return [data[i], data[i + 1], data[i + 2]]
}

const cercaDe = (rgb: number[], ref: { r: number; g: number; b: number }, tol = 18): boolean => Math.abs(rgb[0] - ref.r) < tol && Math.abs(rgb[1] - ref.g) < tol && Math.abs(rgb[2] - ref.b) < tol

describe('foto:isotipo', () => {
  it('limpia el emblema inventado y compone el oficial con su procedencia', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'isotipo-'))
    const plate = await plateConEmblemaFalso(dir)

    const { out, procedencia } = (await componerIsotipo({ plate, centro: [0.5, 0.5], ancho: 0.1 })) as {
      out: string
      procedencia: { sha256: string; archivo: string }
    }

    // El borde izquierdo del óvalo falso (x=254) cae fuera del isotipo oficial de 60 px: vuelve a ser tela.
    expect(cercaDe(await pixel(out, 254, 200), NAVY)).toBe(true)

    // En la zona del emblema hay tinta clara: el isotipo oficial está compuesto.
    const { data, info } = await sharp(out)
      .extract({ left: 270, top: 180, width: 60, height: 42 })
      .raw()
      .toBuffer({ resolveWithObject: true })

    let claros = 0

    for (let i = 0; i < data.length; i += info.channels) if (data[i] > 150 && data[i + 1] > 150 && data[i + 2] > 150) claros++
    expect(claros).toBeGreaterThan(80)

    const oficial = await isotipoOficial('oscura')

    expect(procedencia.sha256).toBe(oficial.sha256)
    expect(procedencia.archivo).toBe('assets/efeonce-isotype-negative.svg')
    expect(JSON.parse(readFileSync(out.replace(/\.png$/, '.json'), 'utf8')).sha256).toBe(oficial.sha256)
  })

  it('en prenda clara usa el isotipo positivo', async () => {
    const oficial = await isotipoOficial('clara')

    expect(oficial.variante).toBe('efeonce-isotype-positive')
  })

  it('con --marca logotipo usa el logo completo y su proporción sale del viewBox', async () => {
    const oficial = await isotipoOficial('clara', 'logotipo')

    expect(oficial.variante).toBe('efeonce-logo-positive')
    expect(oficial.vbW / oficial.vbH).toBeCloseTo(837.07 / 196.68, 2)
    expect((await isotipoOficial('oscura')).vbW).toBeCloseTo(727.4, 1)
  })

  it('--marca sólo admite isotipo o logotipo, y --tecnica exige --acabado', () => {
    expect(() => parseArgs(['p.png', '--centro', '0.5,0.5', '--ancho', '0.1', '--marca', 'wordmark'])).toThrow(IsotipoError)
    expect(() => parseArgs(['p.png', '--centro', '0.5,0.5', '--ancho', '0.1', '--tecnica', 'screen-printed'])).toThrow(/--acabado/)
  })

  it('un plate inexistente falla con el error del comando, no con una traza de sharp', async () => {
    await expect(componerIsotipo({ plate: '/no/existe.png', centro: [0.5, 0.5], ancho: 0.1 })).rejects.toThrow(IsotipoError)
  })

  it('valida los argumentos antes de tocar la imagen', () => {
    expect(() => parseArgs([])).toThrow(IsotipoError)
    expect(() => parseArgs(['p.png', '--centro', '1.2,0.5', '--ancho', '0.1'])).toThrow(/centro/)
    expect(() => parseArgs(['p.png', '--centro', '0.5,0.5', '--ancho', '0.7'])).toThrow(/ancho/)
    expect(() => parseArgs(['p.png', '--centro', '0.5,0.5', '--ancho', '0.1', '--prenda', 'gris'])).toThrow(/prenda/)
    expect(parseArgs(['p.png', '--centro', '0.5,0.4', '--ancho', '0.1', '--sin-limpiar'])).toMatchObject({
      plate: 'p.png',
      centro: [0.5, 0.4],
      limpiar: false,
      out: 'p-isotipo.png'
    })
  })
})
