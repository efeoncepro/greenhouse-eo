// Trabajos de la pasada de realismo v3 (receta de Nexa, ai-generations/_identidad-nexa/LEEME.md) sobre el elenco.
// Paso 1: acabado v3 por EDICIÓN sobre la foto elegida y los seis ángulos (mismo tamaño que la fuente: no reencuadra).
// Paso 2: ancla de manos por personaje.
const fs = require('fs')
const path = require('path')

const E = path.resolve(__dirname, '..')
const D = __dirname

const ELEGIDA = {
  hum: ['hum/hum-b.png', '1024x1536'],
  karo: ['ronda-2/karo-a.png', '1024x1280'],
  sophia: ['sophia/sophia-b-castano.png', '1024x1280'],
  isabella: ['ronda-2/isabella-d.png', '1024x1280'],
  antonio: ['ronda-2/antonio-d.png', '1024x1280']
}

const VISTAS = {
  frente: ['frente', '1024x1024'],
  '45-izq': ['45-izq', '1024x1024'],
  '45-der': ['45-der-v2', '1024x1024'],
  'perfil-izq': ['perfil-izq', '1024x1024'],
  'perfil-der': ['perfil-der', '1024x1024'],
  cuerpo: ['cuerpo', '1024x1536']
}

const ACABADO = path.join(D, 'acabado-v3-elenco.txt')
const MANOS = path.join(D, 'manos.txt')
const jobs = []
const add = (src, prompt, out, size) => {
  if (!fs.existsSync(out)) jobs.push([src, prompt, out, size].join('|'))
}

for (const [k, [src, size]] of Object.entries(ELEGIDA)) {
  fs.mkdirSync(path.join(D, k), { recursive: true })
  add(path.join(E, src), ACABADO, path.join(D, k, `${k}-elegida-v3.png`), size)

  for (const [v, [file, vsize]] of Object.entries(VISTAS)) {
    add(path.join(E, 'sets', k, `${k}-${file}.png`), ACABADO, path.join(D, k, `${k}-${v}-v3.png`), vsize)
  }

  add(path.join(E, src), MANOS, path.join(D, k, `${k}-manos-v3.png`), '1024x1024')
}

fs.writeFileSync(path.join(D, 'jobs.txt'), jobs.join('\n') + '\n')
console.log(jobs.length)
