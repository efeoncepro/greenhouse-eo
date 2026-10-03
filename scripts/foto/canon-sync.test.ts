// Pruebas de `canon-sync`: la referencia sellada que falta o está vieja se baja del canon verificando su sha256, y la
// copia local distinta se aparta en vez de pisarse. `gcloud` simulado: copia desde una carpeta que hace de bucket.
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { _reiniciar, asegurarReferencia } from './canon-sync.mjs'

const RAIZ = path.resolve(__dirname, '..', '..')
const REL = `ai-generations/_prueba-canon-sync-${process.pid}`
const DIR = path.join(RAIZ, REL)
const BUCKET = path.join(DIR, '_bucket')
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex')
const APROBADA = Buffer.from('version aprobada')
const ruta = `${REL}/ref.png`

const gcloudFalso = (args: string[]) => {
  const origen = path.join(BUCKET, args[2].replace(/^gs:\/\/[^/]+\//, ''))

  if (!existsSync(origen)) return { status: 1, stderr: 'No URLs matched' }
  copyFileSync(origen, args[3])

  return { status: 0, stderr: '' }
}

beforeEach(() => {
  rmSync(DIR, { recursive: true, force: true })
  mkdirSync(path.join(BUCKET, REL), { recursive: true })
  writeFileSync(path.join(BUCKET, ruta), APROBADA)
  _reiniciar({ activoInicial: true, lockFijo: { [ruta]: { sha256: sha(APROBADA) } }, bucketFijo: 'efeonce-creative-canon' })
})

afterAll(() => rmSync(DIR, { recursive: true, force: true }))

describe('foto · referencias desde el canon', () => {
  it('baja la que falta y verifica su sha256', () => {
    expect(asegurarReferencia(ruta, { gcloud: gcloudFalso })).toBe(true)
    expect(readFileSync(path.join(RAIZ, ruta))).toEqual(APROBADA)
  })

  it('reemplaza una copia vieja por la aprobada y la vieja queda aparte', () => {
    writeFileSync(path.join(RAIZ, ruta), 'version vieja')
    expect(asegurarReferencia(ruta, { gcloud: gcloudFalso })).toBe(true)
    expect(readFileSync(path.join(RAIZ, ruta))).toEqual(APROBADA)
    expect(readdirSync(DIR).some(f => /^ref\.local-[0-9a-f]{8}\.png$/.test(f))).toBe(true)
  })

  it('no toca una copia que ya es la aprobada', () => {
    writeFileSync(path.join(RAIZ, ruta), APROBADA)
    expect(asegurarReferencia(ruta, { gcloud: () => { throw new Error('no debía bajar') } })).toBe(true)
  })

  it('si lo bajado no calza con el lock, no lo deja en su lugar', () => {
    writeFileSync(path.join(BUCKET, ruta), 'otra cosa')
    expect(asegurarReferencia(ruta, { gcloud: gcloudFalso })).toBe(false)
    expect(existsSync(path.join(RAIZ, ruta))).toBe(false)
  })

  it('apagado (pruebas, FOTO_SIN_CANON) sólo mira el disco', () => {
    _reiniciar({ activoInicial: false })
    expect(asegurarReferencia(ruta, { gcloud: gcloudFalso })).toBe(false)
  })
})
