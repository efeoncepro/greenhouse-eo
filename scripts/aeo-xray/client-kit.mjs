#!/usr/bin/env node
/** Local authoring only. AXIS owns validation; Greenhouse owns real editions/access. */
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { resolveAeoXrayIntent } from '../../src/lib/axis/aeo-xray/aeo-xray.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const [command, ...args] = process.argv.slice(2)

const help = `X-Ray client kit (local, no publication)
  node scripts/aeo-xray/client-kit.mjs init --client "Cliente" --out /ruta/caso [--locale es-CL]
  node scripts/aeo-xray/client-kit.mjs validate --dir /ruta/caso
  node scripts/aeo-xray/client-kit.mjs build --dir /ruta/caso [--draft]
Edit intent.json; assets.json maps logical IDs to files relative to assets/.
build rejects unfinished content; --draft is for local structural previews only.`

async function run() {
  if (!command || command === '--help') { console.log(help); 

return }

  const allowed = command === 'init' ? ['--client', '--out', '--locale'] : ['--dir', '--draft']

  if (!['init', 'validate', 'build'].includes(command)) throw new Error('Unknown command; use --help')
  const options = {}

  for (let i = 0; i < args.length; i++) {
    const key = args[i]

    if (!allowed.includes(key) || key in options) throw new Error('Unknown or repeated option')

    if (key === '--draft') options[key] = true
    else {
      const value = args[++i]

      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${key}`)
      options[key] = value
    }
  }

  if (command === 'init') {
    const client = options['--client']?.trim()

    if (!client || !options['--out']) throw new Error('init requires --client and --out')
    const locale = options['--locale'] || 'es-CL'

    if (!/^[a-z]{2}-[A-Z]{2}$/.test(locale)) throw new Error('Use a locale such as es-CL')
    const dir = resolve(options['--out'])
    const template = JSON.parse(await readFile(resolve(root, 'docs/think/templates/aeo-xray-client.intent.json'), 'utf8'))
    const values = { '{{CLIENT}}': client, '{{LOCALE}}': locale, '{{DATE}}': new Date().toISOString().slice(0, 10) }

    const fill = value => typeof value === 'string'
      ? Object.entries(values).reduce((s, [key, replacement]) => s.replaceAll(key, replacement), value)
      : Array.isArray(value) ? value.map(fill)
      : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fill(v)])) : value

    const intent = fill(template)
    const result = resolveAeoXrayIntent(intent)

    if (result.status !== 'resolved') throw new Error(`Invalid starter: ${JSON.stringify(result.issues)}`)
    await mkdir(dirname(dir), { recursive: true })
    await mkdir(dir, { mode: 0o700 }) // refuse an existing case, never overwrite it
    await mkdir(resolve(dir, 'assets'), { mode: 0o700 })
    await writeFile(resolve(dir, 'intent.json'), JSON.stringify(intent, null, 2) + '\n', { mode: 0o600 })
    await writeFile(resolve(dir, 'assets.json'), '{}\n', { mode: 0o600 })
    await writeFile(resolve(dir, 'BRIEF.md'), `# ${client} — X-Ray\n\nEstado: borrador, sin investigación ni aprobación visual.\n\n- Sitio y país/idioma: ${locale}\n- Producto/servicio real y fuente oficial:\n- Audiencia y decisión que debe tomar:\n- Objetivo de negocio:\n- Ángulo editorial elegido con el operador:\n- Referencia visual aprobada (captura + URL):\n- Tokens de marca y fuentes tipográficas licenciadas:\n- Fuentes, fecha, mercado/dispositivo y expediente de investigación:\n- Fotografía: origen, derechos, ALT, encuadre desktop/móvil:\n- Claims sensibles y condiciones a verificar:\n- Revisión visual y responsable:\n- Estado del enlace real/release: pendiente\n\nEl starter conserva los cuatro pasos. Completar PENDIENTE, reemplazar example.com y cargar medios propios. No copiar datos de otro cliente. Manual: ${resolve(root, 'docs/think/aeo-xray-nuevo-cliente.md')}\n`, { mode: 0o600 })
    console.log(`Created draft: ${dir}\nNext: complete BRIEF.md and intent.json; build --draft for local preview.`)
    
return
  }

  if (!options['--dir']) throw new Error('Missing --dir')
  const dir = resolve(options['--dir'])
  const input = JSON.parse(await readFile(resolve(dir, 'intent.json'), 'utf8'))
  const model = resolveAeoXrayIntent(input)

  if (model.status !== 'resolved') {
    console.error(JSON.stringify(model.issues, null, 2)); process.exitCode = 1; 

return
  }

  const pending = []

  const inspect = (v, path = 'intent') => {
    if (typeof v === 'string' && /PENDIENTE|\{\{[^}]+\}\}|https:\/\/example\.com(?:\/|$)/i.test(v)) pending.push(path)
    else if (v && typeof v === 'object') for (const [k, child] of Object.entries(v)) inspect(child, `${path}.${k}`)
  }

  inspect(input)
  if (!input.sources.length) pending.push('sources: no research sources')

  for (const artifact of input.artifacts) {
    if (!artifact.experience) pending.push(`${artifact.id}: full experience missing`)
    if (!artifact.blocks.some(b => b.kind === 'image')) pending.push(`${artifact.id}: banner missing`)
  }

  console.log(`AXIS: valid; artifacts: ${input.artifacts.length}; unfinished fields: ${pending.length}`)
  if (pending.length) console.log(pending.join('\n'))

  if (command === 'validate') { if (pending.length) process.exitCode = 2; 

return }

  if (pending.length && !options['--draft']) throw new Error('Unfinished content: no manifest written. Use --draft only for local preview.')
  const target = resolve(dir, 'manifest.json')
  const temp = resolve(dir, `.manifest-${process.pid}.tmp`)

  await writeFile(temp, JSON.stringify(model, null, 2) + '\n', { mode: 0o600, flag: 'wx' })
  await rename(temp, target)
  console.log(`${options['--draft'] ? 'DRAFT' : 'COMPOSED'} local manifest written. This does not issue an edition or approve content/assets.`)
}

run().catch(error => { console.error(error.code === 'EEXIST' ? 'Destination exists; choose a new directory.' : error.message); process.exitCode = 1 })
