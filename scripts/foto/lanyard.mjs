// pnpm foto:lanyard --nombre "<Nombre>" --cargo "<Cargo>" --foto <retrato.png> [--out <dir>] [--generar]
//
// Arma el lanyard Efeonce PIEZA POR PIEZA de forma determinística y, con --generar, le pide al modelo
// únicamente el acabado material.
//
// Existe porque el modelo TERGIVERSA el logotipo. Medido el 2026-09-21 en cuatro pasadas sobre la misma
// pieza: describírselo en palabras dio un borrón con forma de flecha; pasarle el arte plano lo dejó
// ilegible; y aun con la foto del producto delante la nave salía distinta cada vez. La salida no es
// pedírselo mejor: es NO pedírselo. Acá las tres piezas con marca —tela serigrafiada, yoyo y carnet—
// salen de los artes oficiales, y al modelo sólo se le encarga tejido, relieve, plástico, metal,
// acrílico y sombras.
//
// Caso fuente y método: ai-generations/2026-09-21_lanyard-deterministico/LEEME.md
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'

import sharp from 'sharp'

const KIT = 'ai-generations/2026-09-17_lanyard-efeonce'
const args = process.argv.slice(2)

const valor = k => {
  const i = args.indexOf(`--${k}`)

  return i >= 0 ? args[i + 1] : null
}

const NOMBRE = valor('nombre')
const CARGO = valor('cargo')
const FOTO = valor('foto')
const CARNET_YA = valor('carnet')
const OUT = valor('out') ?? `ai-generations/${new Date().toISOString().slice(0, 10)}_lanyard`
const GENERAR = args.includes('--generar')

if (!CARNET_YA && (!NOMBRE || !CARGO || !FOTO)) {
  console.error(`
pnpm foto:lanyard --nombre "<Nombre>" --cargo "<Cargo>" --foto <retrato.png> [--out <dir>] [--generar]
pnpm foto:lanyard --carnet <arte-carnet.png> [--out <dir>] [--generar]

  --foto      retrato de la persona. Si es de CUERPO ENTERO, recórtale cabeza y hombros primero:
              pasado directo, la cara queda diminuta dentro del círculo del carnet (medido con Nexa).
  --carnet    un arte de carnet ya compuesto, si ya existe (KIT/ref/arte-carnet-*.png)
  --generar   además del armado, pide el acabado al modelo (cuesta ~USD 0,05)

El resultado es la referencia que se le pasa al modelo para poner el lanyard EN UNA ESCENA.
El arte plano del kit NO sirve para eso: sirve para producir las vistas del kit.
`)
  process.exit(1)
}

mkdirSync(OUT, { recursive: true })

const corre = (script, argv) => {
  const r = spawnSync('node', [path.join(KIT, script), ...argv], { stdio: 'inherit' })

  if (r.status !== 0) throw new Error(`${script} falló`)
}

// ── 1. El carnet: determinístico, nunca generado.
let carnet = CARNET_YA

if (!carnet) {
  const { width, height } = await sharp(FOTO).metadata()

  if (height / width > 1.5) {
    console.error(
      `  ⚠ el retrato es ${width}×${height} (muy vertical): parece de cuerpo entero. La cara va a quedar ` +
        'pequeña dentro del círculo. Recorta cabeza y hombros antes y vuelve a pasarlo.'
    )
  }

  const retrato = path.join(OUT, 'retrato.png')

  corre('retrato-carnet.mjs', [FOTO, retrato, '0.06'])
  carnet = path.join(OUT, 'arte-carnet.png')
  corre('arte-carnet.mjs', [retrato, NOMBRE, CARGO, carnet])
}

// ── 2. El armado plano.
const plano = path.join(OUT, 'lanyard-armado-plano.png')

await (await import(path.resolve('scripts/foto/lanyard-armar.mjs'))).armar(carnet, plano)

console.log(`\n  ✓ armado determinístico → ${plano}`)

// ── 3. El acabado. El prompt es parte del contrato: repite tres veces que las marcas NO se tocan,
// porque es lo único que el modelo tiende a rehacer.
export const PROMPT_ACABADO =
  'This is a flat, vector-built assembly of a real lanyard. Turn it into a REAL PRODUCT PHOTOGRAPH of ' +
  'that same lanyard, changing NOTHING about the artwork itself. Every mark printed on it — the wordmark, ' +
  'the rocket, the slogan, the badge — is finished, official artwork: keep every letter, every shape, every ' +
  'proportion, every position and every colour EXACTLY as they are, and keep every part at EXACTLY the size ' +
  'it has here. Do not redraw, re-letter, restyle, resize or move a single mark or part. You are only adding ' +
  'MATERIAL and LIGHT: the flat navy band becomes 20mm woven polyester webbing with visible weave texture, ' +
  'slightly frayed cut ends and soft natural folds; the printed marks become screen-printed ink sitting ON ' +
  'the weave, matte, very slightly raised, breaking minutely at the fibre edges and deforming with the folds ' +
  'instead of floating flat; the black slider becomes moulded matte plastic; the reel becomes a glossy navy ' +
  'plastic housing with its face under a clear domed resin lens with a subtle curved highlight; the clip ' +
  'becomes brushed nickel metal with real reflections; the badge holder becomes a rigid clear acrylic frame ' +
  'with edge highlights and its card visible through it. Add soft contact shadows on a plain seamless light ' +
  'warm-grey studio background, shot on a 100mm lens at f/8 with a large soft key from the upper left. ' +
  'Photographic realism: no CGI sheen, no perfect symmetry, no plastic smoothness. No text overlay, no ' +
  'watermark, no extra objects.'

const terminado = path.join(OUT, 'lanyard-terminado.png')

if (!GENERAR) {
  console.log('\n  Para el acabado (no se hizo: falta --generar):\n')
  console.log(
    `  pnpm ai:image --model gpt-image-2.5-sunburst --quality high --size 1024x1536 \\\n` +
      `    --image ${plano} --out ${terminado} --prompt "<PROMPT_ACABADO de scripts/foto/lanyard.mjs>"`
  )
  process.exit(0)
}

const r = spawnSync(
  'pnpm',
  ['ai:image', '--model', 'gpt-image-2.5-sunburst', '--quality', 'high', '--size', '1024x1536',
   '--image', plano, '--out', terminado, '--prompt', PROMPT_ACABADO],
  { stdio: 'inherit' }
)

if (r.status !== 0) process.exit(r.status ?? 1)

console.log(`\n  ✓ ${terminado}`)
console.log('  MÍRALO al 100%: el logotipo debe decir «efeonce» con la nave en la «o». Si no, NO lo uses.')
console.log(`  Si queda bien, súbelo al kit (${KIT}/final/) con su transparente y decláralo en el manifiesto.`)

if (!existsSync(terminado)) process.exit(1)
