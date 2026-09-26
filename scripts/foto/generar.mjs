// pnpm foto:generar <ficha.json> [--quality high] [--out <dir>]
//
// Resuelve la ficha y genera la imagen con LAS REFERENCIAS QUE LA PROPIA FICHA DECLARA. Existe
// porque hasta el 2026-09-20 `foto:prompt` resolvía la lista exacta de referencias —identidad,
// kits, macros del bordado— y NADIE la usaba: el operador de turno las copiaba a mano en `--image`
// de `pnpm ai:image`. Ahí se colaron los dos errores de esa jornada: una prenda generada sin el
// macro de su emblema, y una gorra con la descripción del emblema equivocada.
//
// El tamaño también sale de la tabla de formatos, no de la memoria de quien escribe el comando.
import { spawnSync } from 'node:child_process'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { construirPrompt } from './build-prompt.mjs'

const args = process.argv.slice(2)
const fichaPath = args.find(a => !a.startsWith('--'))

if (!fichaPath) {
  console.error(`
pnpm foto:generar <ficha.json> [--quality high|xhigh|max] [--out <dir>] [--dry]

Genera el plate con las referencias que la ficha declara: identidad con su vista por ángulo, kits de
marca y el MACRO DEL BORDADO de cada prenda con emblema. Nadie copia rutas a mano.

  --out <dir>   destino (por defecto, ./plates junto a la ficha)
  --dry         imprime qué haría y no gasta
`)
  process.exit(1)
}

const ficha = JSON.parse(readFileSync(fichaPath, 'utf8'))
const { prompt, size, imagenes } = construirPrompt(ficha)

const valor = k => {
  const i = args.indexOf(`--${k}`)

  return i >= 0 ? args[i + 1] : null
}

const destino = valor('out') ?? path.join(path.dirname(fichaPath), '..', 'plates')

mkdirSync(destino, { recursive: true })

const salida = path.join(destino, `${ficha.id}.png`)
const promptFile = path.join(destino, `..`, 'prompts', `${ficha.id}.txt`)

mkdirSync(path.dirname(promptFile), { recursive: true })
writeFileSync(promptFile, prompt)

const cli = [
  'ai:image',
  '--prompt-file',
  promptFile,
  ...imagenes.flatMap(i => ['--image', i]),
  '--model',
  'gpt-image-2.5-sunburst',
  '--quality',
  valor('quality') ?? 'high',
  '--size',
  size.replace('1152x1440', '1024x1280').replace('1152x2048', '1024x1792').replace('2048x1152', '1792x1024').replace('1152x1152', '1024x1024'),
  '--out',
  salida
]

console.log(`${ficha.id} · ${size} · ${imagenes.length} referencia(s):`)
for (const i of imagenes) console.log(`   ${i}`)

if (args.includes('--dry')) process.exit(0)

const r = spawnSync('pnpm', ['-s', ...cli], { stdio: 'inherit' })

process.exit(r.status ?? 1)
