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
  --size WxH    resolución del plate (misma proporción que el formato), p. ej. 2048x2048 para un 1:1 con caras chicas
  --dry         imprime qué haría y no gasta
`)
  process.exit(1)
}

const ficha = JSON.parse(readFileSync(fichaPath, 'utf8'))
const { prompt, size, imagenes, avisoCaso } = construirPrompt(ficha)

// Ficha cine recién creada con `foto:cine:nueva`: no se gasta mientras la escena siga siendo la de la receta.
if (ficha.registro === 'cine' && /^REESCRIBIR\b/.test(ficha.escena ?? '')) {
  console.error(`  ✗ ${ficha.id ?? 'ficha'}: la escena todavía es la de la receta (empieza con «REESCRIBIR»). Escríbela y completa ${(ficha.__completar ?? []).join(', ') || 'los campos cine'} antes de generar.`)
  process.exit(1)
}

// Excepción declarada de caso de cliente: se anuncia antes de gastar.
if (avisoCaso) console.error(`  ⚠ ${ficha.id ?? 'ficha'}: ${avisoCaso}`)

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
  // `--size ANCHOxALTO` pide el plate a otra resolución con la MISMA proporción del formato (2026-10-02): una cara chica en
  // el cuadro necesita píxeles, no un encuadre más cerrado (CMP-004: el estrabismo de los 1:1 venía de caras de ~60 px).
  valor('size') ?? size.replace('1152x1440', '1024x1280').replace('1152x2048', '1024x1792').replace('2048x1152', '1792x1024').replace('1152x1152', '1024x1024'),
  '--out',
  salida
]

if (valor('size')) {
  const [w, h] = valor('size').split('x').map(Number)
  const [fw, fh] = size.split('x').map(Number)

  if (!w || !h || Math.abs(w / h - fw / fh) > 0.012) {
    console.error(`  ✗ --size ${valor('size')} no tiene la proporción del formato ${ficha.formato} (${size}).`)
    process.exit(1)
  }
}

console.log(`${ficha.id} · ${valor('size') ?? size} · ${imagenes.length} referencia(s):`)
for (const i of imagenes) console.log(`   ${i}`)

if (args.includes('--dry')) process.exit(0)

const r = spawnSync('pnpm', ['-s', ...cli], { stdio: 'inherit' })

process.exit(r.status ?? 1)
