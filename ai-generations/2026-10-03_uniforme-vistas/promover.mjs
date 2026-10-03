// Promueve las vistas puestas aprobadas de esta corrida a los kits del uniforme: copia a `final/` con la convención de
// nombres del kit, el prompt a `brief/`, agrega las vistas al manifiesto (con `cuando_usarla`) e imprime el
// `usoPorVista` para el catálogo de `scripts/foto/build-prompt.mjs`. El número de cada vista lo fija su POSICIÓN en
// CLAVES (no el orden de llegada), así una vista que falte no corre la numeración de las demás.
// Uso: node promover.mjs [--aplicar] [--solo clave,clave]
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const D = path.dirname(new URL(import.meta.url).pathname)
const R = path.resolve(D, '../..')
const aplicar = process.argv.includes('--aplicar')
const solo = process.argv.includes('--solo') ? process.argv[process.argv.indexOf('--solo') + 1].split(',') : null

const CLAVES = ['frente-mujer', '45-izq', '45-der', '70-izq', '70-der', '45-izq-mujer', '45-der-mujer', '70-izq-mujer', '70-der-mujer',
  'frente-mano', 'frente-mano-mujer', 'frente-brazos', 'frente-brazos-mujer', 'frente-objeto', 'frente-objeto-mujer', 'frente-cruza', 'frente-cruza-mujer',
  'frente-bajo', 'frente-bajo-mujer',
  'espalda-45-izq', 'espalda-45-der', 'espalda-70-izq', 'espalda-70-der', 'espalda-bajo',
  'espalda-45-izq-mujer', 'espalda-45-der-mujer', 'espalda-70-izq-mujer', 'espalda-70-der-mujer', 'espalda-bajo-mujer']
const CLAVES_GORRA = ['frente', 'frente-mujer', '45-izq', '45-der', '70-izq', '70-der', '45-izq-mujer', '45-der-mujer', '70-izq-mujer', '70-der-mujer']

const KITS = {
  bomber: { dir: '2026-09-17_chaqueta-efeonce', prefijo: 'efeonce-chaqueta-bomber', desde: 18, manifiesto: 'efeonce-chaqueta-manifiesto.json', tam: '1024x1536', claves: CLAVES },
  softshell: { dir: '2026-09-17_chaqueta-efeonce', prefijo: 'efeonce-chaqueta-softshell', desde: 18, manifiesto: 'efeonce-chaqueta-manifiesto.json', tam: '1024x1536', claves: CLAVES },
  polo: { dir: '2026-09-17_polo-efeonce', prefijo: 'efeonce-polo-navy', desde: 17, manifiesto: 'efeonce-polo-manifiesto.json', tam: '1024x1536', claves: CLAVES },
  hoodie: { dir: '2026-09-17_hoodie-efeonce', prefijo: 'efeonce-hoodie', desde: 23, manifiesto: 'efeonce-hoodie-manifiesto.json', tam: '1024x1536', claves: CLAVES },
  gorra: { dir: '2026-09-17_gorra-efeonce', prefijo: 'efeonce-gorra-v2', desde: 10, manifiesto: 'efeonce-gorra-manifiesto.json', tam: '1024x1024', claves: CLAVES_GORRA }
}

const cuerpo = c => (c.endsWith('-mujer') ? 'cuerpo femenino' : 'cuerpo masculino')
const GIRO = {
  frente: 'de frente',
  '45-izq': 'girada 45° con el frente hacia el borde IZQUIERDO del cuadro (la marca del lado cercano)',
  '45-der': 'girada 45° con el frente hacia el borde DERECHO del cuadro (la marca en el lado lejano, escorzada)',
  '70-izq': 'en giro profundo (~70°) con el frente hacia la IZQUIERDA (la marca de cara a cámara, comprimida)',
  '70-der': 'en giro profundo (~70°) con el frente hacia la DERECHA (la marca en la curva lejana, muy escorzada)',
  'frente-bajo': 'de frente con cámara baja mirando hacia arriba (la marca en perspectiva desde abajo)',
  'espalda-45-izq': 'de espaldas a tres cuartos, la nariz hacia el borde IZQUIERDO del cuadro (el logotipo trasero escorzado)',
  'espalda-45-der': 'de espaldas a tres cuartos, la nariz hacia el borde DERECHO del cuadro (el logotipo trasero escorzado)',
  'espalda-70-izq': 'de espaldas en giro profundo, la nariz hacia la IZQUIERDA (el logotipo se curva con la espalda)',
  'espalda-70-der': 'de espaldas en giro profundo, la nariz hacia la DERECHA (el logotipo se curva con la espalda)',
  'espalda-bajo': 'de espaldas con cámara baja mirando hacia arriba (el logotipo trasero en perspectiva desde abajo)'
}
const TAPA = {
  mano: 'la mano del portador sobre el pecho tapa la mitad de la marca; el resto se ve a su tamaño real',
  brazos: 'brazos cruzados; el antebrazo queda bajo la marca, que se ve entera',
  objeto: 'una tablet sostenida contra el pecho tapa la mitad inferior de la marca',
  cruza: 'un antebrazo con una taza pasa por delante de la marca y tapa su parte inferior izquierda'
}

const describir = (k, c) => {
  const base = c.replace(/-mujer$/, '')
  const [, tapa] = base.match(/^frente-(mano|brazos|objeto|cruza)$/) ?? []
  const que = k === 'gorra' ? 'La gorra navy con el logotipo bordado, puesta' : 'Puesta, sin rostro'
  if (tapa) return { descripcion: `${que}, ${cuerpo(c)}, de frente: ${TAPA[tapa]}.`, cuando_usarla: `Asset de USO cuando la escena tapa el pecho (${tapa}). Lo pide \`tapa: "${tapa}"\` o lo infiere foto:prompt desde la escena.` }
  return { descripcion: `${que}, ${cuerpo(c)}, ${GIRO[base]}.`, cuando_usarla: `Asset de USO con una persona ${c.endsWith('-mujer') ? 'mujer' : 'hombre'} ${GIRO[base]}. Lo elige foto:prompt por la silueta y la vista de quien la viste.` }
}

const uso = {}
for (const [k, kit] of Object.entries(KITS)) {
  const manPath = path.join(R, 'ai-generations', kit.dir, 'final', kit.manifiesto)
  const man = JSON.parse(readFileSync(manPath, 'utf8'))
  man.vistas = man.vistas ?? []
  uso[k] = {}
  kit.claves.forEach((c, i) => {
    if (solo && !solo.includes(c)) return
    const src = path.join(D, 'out', `${k}-${c}.png`)
    if (!existsSync(src)) return
    const n = String(kit.desde + i).padStart(2, '0')
    const nombre = `${kit.prefijo}-${n}-puesto-${c}-${kit.tam}-v01-fondo-estudio.png`
    const id = `${kit.prefijo.replace(/^efeonce-(chaqueta-)?/, '')}-${n}-puesto-${c}`
    uso[k][c] = nombre
    if (!aplicar) return
    copyFileSync(src, path.join(R, 'ai-generations', kit.dir, 'final', nombre))
    const prompt = path.join(D, 'prompts', `${k}-${c}.txt`)
    const brief = `brief/${id}.prompt.txt`
    if (existsSync(prompt)) copyFileSync(prompt, path.join(R, 'ai-generations', kit.dir, brief))
    man.vistas = man.vistas.filter(v => v.id !== id)
    man.vistas.push({ id, ...describir(k, c), archivo_fondo: `final/${nombre}`, resolucion: kit.tam, brief, corrida: 'ai-generations/2026-10-03_uniforme-vistas/' })
  })
  if (aplicar) {
    man.delta_2026_10_03 = 'Vistas puestas por silueta, giro (45° y 70°) y oclusión (mano, brazos, objeto, antebrazo), editadas desde la vista puesta de frente aprobada con el macro del bordado. foto:prompt las elige solo (`elegirPuesta`) e imprime las alternativas. Corrida: ai-generations/2026-10-03_uniforme-vistas/LEEME.md.'
    writeFileSync(manPath, JSON.stringify(man, null, 1) + '\n')
  }
}
console.log(JSON.stringify(uso, null, 2))
