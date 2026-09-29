// pnpm pieza:nueva <cliente> <slug> — crea projects/<cliente>/<slug>/ desde la plantilla.
import { cpSync, existsSync } from 'node:fs'
import path from 'node:path'

import { config, fail, ROOT, run, savePieza } from './lib.mjs'

const [cliente, slug] = process.argv.slice(2)
const { clientes } = config()

if (!cliente || !slug) fail('Uso: pnpm pieza:nueva <cliente> <slug>   (ej.: pnpm pieza:nueva berel banner-otono-2027)')
if (!clientes.includes(cliente)) fail(`"${cliente}" no es un cliente del workbench. Clientes: ${clientes.join(', ')}`)
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
  fail('El slug va en kebab-case, sin tildes ni espacios (ej.: banner-otono-2027).')

const dir = path.join(ROOT, 'projects', cliente, slug)

if (existsSync(dir)) fail(`Ya existe projects/${cliente}/${slug}.`)

cpSync(path.join(ROOT, 'projects/_plantilla'), dir, { recursive: true })

const responsable = run('git', ['config', 'user.name']).stdout.trim() || 'por definir'

const pieza = {
  cliente,
  slug,
  titulo: slug.replace(/-/g, ' '),
  formato: 'por definir',
  responsable,
  estado: 'brief',
  aprobacion: { por: null, el: null },
  entrega: { el: null, canal: null },
  entregables: [],
  notas: ''
}

savePieza(path.join(dir, 'pieza.json'), pieza)
console.log(
  `✓ Pieza creada en projects/${cliente}/${slug}/\n  Siguiente: completa brief.md y "formato" en pieza.json. Lee clients/${cliente}/README.md antes de producir.`
)
