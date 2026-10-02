// `foto:cine:nueva` y su índice de recetas. La ficha nueva hereda la estructura aprobada y nunca se puede gastar con
// la escena de la receta (la guarda vive en `foto:generar`); el índice apunta a fichas que existen en el repo.
import { existsSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import recetas from './cine-recetas.json'
import { CAMPOS_CINE, nuevaFichaDesde } from './cine-nueva.mjs'

const raiz = path.resolve(__dirname, '../..')

describe('foto:cine:nueva', () => {
  const receta = recetas.recetas.find(r => r.id === 'NX7d')!
  const original = { id: 'NX7d', formato: '16:9', registro: 'cine', escena: 'SCENE: …', objetos: ['traje-bionico-nexa'], piloto: 'x.png' }

  it('copia la estructura, declara cine y marca la escena para reescribir', () => {
    const ficha = nuevaFichaDesde(receta, original, 'NX9')

    expect(ficha).toMatchObject({ id: 'NX9', registro: 'cine', desde: 'NX7d', formato: '16:9', alcance: 'nexa', objetos: ['traje-bionico-nexa'] })
    expect(ficha.escena.startsWith('REESCRIBIR')).toBe(true)
    expect(ficha.piloto).toBeUndefined()
    expect(ficha.__completar).toEqual(['llave', 'primerPlano', 'fondo', 'fenomeno'])
  })

  it('conserva los campos cine que la receta ya trae', () => {
    const ficha = nuevaFichaDesde(receta, { ...original, llave: { fuente: 'a core of light' } }, 'NX9')

    expect(ficha.llave).toEqual({ fuente: 'a core of light' })
    expect(ficha.__completar).not.toContain('llave')
    expect(CAMPOS_CINE).toContain('fenomeno')
  })

  it('cada receta del índice tiene id único, alcance válido y una ficha versionada', async () => {
    const { ALCANCES_CINE } = await import('./build-prompt.mjs')
    const ids = recetas.recetas.map(r => r.id)

    expect(new Set(ids).size).toBe(ids.length)

    for (const r of recetas.recetas) {
      expect(ALCANCES_CINE).toContain(r.alcance)
      expect(r.ficha.startsWith('ai-generations/')).toBe(true)
      // Las fichas viven en git aunque los plates puedan estar archivados (`pnpm ai-gen:pull`).
      expect(existsSync(path.join(raiz, r.ficha)), r.ficha).toBe(true)
    }
  })
})

describe('foto:cine:nueva con otro formato', () => {
  it('cambiar el formato descarta las reservas de la receta y pide reescribirlas', () => {
    const receta = recetas.recetas.find(r => r.id === 'NX7d')!
    const original = { id: 'NX7d', formato: '16:9', escena: 'SCENE: …', reservas: { texto: { muro: 'x' } } }
    const ficha = nuevaFichaDesde(receta, original, 'AG2', { formato: '9:16', alcance: 'social-nexa' })

    expect(ficha).toMatchObject({ formato: '9:16', alcance: 'social-nexa' })
    expect(ficha.reservas).toBeUndefined()
    expect(ficha.__completar).toContain('reservas')
  })
})
