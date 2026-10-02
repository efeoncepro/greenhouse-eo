// Regresión del compilador de fichas: congela la salida de `construirPrompt` para TODAS las fichas en disco y
// compara contra una foto anterior. Existe para que un cambio pensado para un registro (p. ej. el cine) no
// altere en silencio el prompt de los demás: documental, puesta en escena, registro C.
//
//   node scripts/foto/regresion-prompt.mjs --foto <out.json>            # congela el estado actual
//   node scripts/foto/regresion-prompt.mjs --comparar <foto.json>       # compara; sale 1 si cambia una ficha NO cine
//
// Las fichas viven fuera de git (ai-generations/), así que la foto se guarda donde la pidas: en el scratchpad de la
// sesión antes de tocar `build-prompt.mjs`, y se compara después. Una ficha que antes fallaba y sigue fallando
// con el mismo mensaje cuenta como igual.
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { construirPrompt } from './build-prompt.mjs'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const base = path.join(raiz, 'ai-generations')

const fichasEnDisco = () => {
  const out = []

  if (!existsSync(base)) return out

  for (const corrida of readdirSync(base)) {
    const dir = path.join(base, corrida, 'fichas')

    if (!existsSync(dir)) continue

    for (const f of readdirSync(dir)) {
      if (f.endsWith('.json')) out.push(path.join(dir, f))
    }
  }

  return out.sort()
}

const huella = ficha => {
  try {
    const r = construirPrompt(ficha)

    return {
      ok: true,
      sha: createHash('sha256').update(JSON.stringify({ p: r.prompt, s: r.size, i: r.imagenes })).digest('hex')
    }
  } catch (e) {
    return { ok: false, error: String(e?.message ?? e).split('\n')[0] }
  }
}

export const tomarFoto = () => {
  const foto = {}

  for (const archivo of fichasEnDisco()) {
    let crudo

    try {
      crudo = JSON.parse(readFileSync(archivo, 'utf8'))
    } catch {
      continue
    }

    const fichas = Array.isArray(crudo) ? crudo : [crudo]

    fichas.forEach((ficha, i) => {
      if (!ficha || typeof ficha !== 'object') return
      const clave = `${path.relative(raiz, archivo)}#${i}`

      foto[clave] = { cine: ficha.registro === 'cine', ...huella(ficha) }
    })
  }

  return foto
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const args = process.argv.slice(2)
  const iFoto = args.indexOf('--foto')
  const iComp = args.indexOf('--comparar')

  if (iFoto >= 0) {
    const out = args[iFoto + 1]
    const foto = tomarFoto()

    writeFileSync(out, JSON.stringify(foto, null, 1))
    console.log(`${Object.keys(foto).length} fichas congeladas → ${out}`)
    process.exit(0)
  }

  if (iComp >= 0) {
    const antes = JSON.parse(readFileSync(args[iComp + 1], 'utf8'))
    const ahora = tomarFoto()
    const rotas = []
    const cine = []

    for (const [clave, a] of Object.entries(antes)) {
      const b = ahora[clave]

      if (!b) continue
      const igual = a.ok === b.ok && (a.ok ? a.sha === b.sha : a.error === b.error)

      if (igual) continue
      ;(a.cine || b.cine ? cine : rotas).push({ clave, antes: a, ahora: b })
    }

    for (const r of cine) console.log(`  · cine cambió: ${r.clave}${r.ahora.ok ? '' : ` → ERROR ${r.ahora.error}`}`)

    for (const r of rotas) {
      console.error(
        `  ✗ NO cine cambió: ${r.clave}\n      antes: ${r.antes.ok ? r.antes.sha.slice(0, 12) : `ERROR ${r.antes.error}`}\n      ahora: ${r.ahora.ok ? r.ahora.sha.slice(0, 12) : `ERROR ${r.ahora.error}`}`
      )
    }

    console.log(`\n${Object.keys(antes).length} fichas · ${cine.length} cine cambiadas · ${rotas.length} NO cine cambiadas`)
    process.exit(rotas.length ? 1 : 0)
  }

  console.error('Uso: node scripts/foto/regresion-prompt.mjs --foto <out.json> | --comparar <foto.json>')
  process.exit(2)
}
