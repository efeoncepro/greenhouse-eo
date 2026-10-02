// Gate piezas: cada pieza de projects/ tiene un pieza.json coherente con su carpeta y su estado.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { readJson, report, ROOT } from './lib.mjs'

export const ESTADOS = ['brief', 'en-produccion', 'en-revision', 'aprobada', 'entregada', 'descartada']
const FECHA = /^\d{4}-\d{2}-\d{2}$/
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function validarPieza(pieza, { cliente, slug, clientes, workBucket }) {
  const p = []

  const req = (campo, ok = v => typeof v === 'string' && v.trim().length > 0) => {
    if (!ok(pieza[campo])) p.push(`falta o es inválido "${campo}"`)
  }

  if (!clientes.includes(cliente))
    p.push(`la carpeta cliente "${cliente}" no es un cliente del workbench (${clientes.join(', ')})`)
  if (!SLUG.test(slug)) p.push(`el slug "${slug}" debe ser kebab-case sin tildes`)
  if (pieza.cliente !== cliente) p.push(`"cliente" dice ${pieza.cliente} y la carpeta es ${cliente}`)
  if (pieza.slug !== slug) p.push(`"slug" dice ${pieza.slug} y la carpeta es ${slug}`)

  req('titulo')
  req('formato')
  req('responsable')
  req('estado', v => ESTADOS.includes(v))

  if (!Array.isArray(pieza.entregables)) p.push('"entregables" debe ser una lista (puede estar vacía)')

  for (const [i, e] of (pieza.entregables ?? []).entries()) {
    const prefix = `gs://${workBucket}/${cliente}/${slug}/`

    if (typeof e.ruta !== 'string' || !e.ruta.startsWith(prefix))
      p.push(`entregable ${i}: la ruta debe empezar con ${prefix}`)
    if (!/^[0-9a-f]{64}$/.test(e.sha256 ?? '')) p.push(`entregable ${i}: falta sha256 (usa pnpm pieza:subir)`)
  }

  if (['aprobada', 'entregada'].includes(pieza.estado)) {
    if (!pieza.aprobacion?.por) p.push(`estado ${pieza.estado} exige "aprobacion.por"`)
    if (!FECHA.test(pieza.aprobacion?.el ?? '')) p.push(`estado ${pieza.estado} exige "aprobacion.el" (AAAA-MM-DD)`)
    if (!(pieza.entregables ?? []).length) p.push(`estado ${pieza.estado} exige al menos un entregable subido`)
    if (pieza.aprobacion?.por && pieza.aprobacion.por === pieza.responsable)
      p.push('quien aprueba no puede ser quien produjo')
  }

  if (pieza.estado === 'entregada' && !FECHA.test(pieza.entrega?.el ?? ''))
    p.push('estado entregada exige "entrega.el" (AAAA-MM-DD)')

  return p
}

export function piezas() {
  const { clientes, workBucket } = readJson('workbench.config.json')
  const dir = path.join(ROOT, 'projects')
  const problems = []

  if (!existsSync(dir)) return report('piezas', [])

  for (const cliente of readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('_'))
    .map(d => d.name)) {
    for (const slug of readdirSync(path.join(dir, cliente), { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)) {
      const file = path.join(dir, cliente, slug, 'pieza.json')
      const rel = `projects/${cliente}/${slug}`

      if (!existsSync(file)) {
        problems.push(`${rel}: falta pieza.json (crea la pieza con pnpm pieza:nueva)`)
        continue
      }

      let pieza

      try {
        pieza = JSON.parse(readFileSync(file, 'utf8'))
      } catch (e) {
        problems.push(`${rel}/pieza.json: JSON inválido (${e.message})`)
        continue
      }

      for (const msg of validarPieza(pieza, { cliente, slug, clientes, workBucket })) problems.push(`${rel}: ${msg}`)
    }
  }

  return report('piezas', problems)
}
