// Vistas puestas que faltaban en los kits del uniforme (2026-10-03): frente de mujer y 45° (hombre y mujer)
// de bomber, softshell, polo navy y hoodie; y la gorra puesta (frente y 45°, hombre y mujer).
// Método canon: EDITAR la vista puesta aprobada del kit (editar conserva), con el macro del bordado como
// segunda imagen. Las entradas 3:4 se padean a 2:3 espejando la franja inferior (editar con otro aspect
// ratio reencuadra), y el prompt declara esa franja como padding.
// Uso: node build-jobs.cjs <ola 1|2>  → imprime una línea por job: src|prompt|out|size|macro
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const R = path.resolve(__dirname, '../..')
const D = __dirname
const ola = Number(process.argv[2] ?? 1)

const MARCA = 'a rocket with three round windows inside an elliptical orbit, with a small sphere on top'

const PRENDAS = {
  bomber: {
    base: 'ai-generations/2026-09-17_chaqueta-efeonce/final/',
    hombre: 'efeonce-chaqueta-bomber-14-puesto-frente-1200x1600-v01-fondo-estudio.png',
    macro: 'efeonce-chaqueta-bomber-11-macro-bordado-1600x1600-v01-fondo-estudio.png',
    nombre: 'the Efeonce navy bomber jacket, worn OPEN over a dark navy polo, ribbed collar, cuffs and hem',
    pliegue: 'the satin-like shell forms soft diagonal creases from the armpits and gathers above the ribbed hem'
  },
  softshell: {
    base: 'ai-generations/2026-09-17_chaqueta-efeonce/final/',
    hombre: 'efeonce-chaqueta-softshell-14-puesto-frente-1200x1600-v01-fondo-estudio.png',
    macro: 'efeonce-chaqueta-softshell-11-macro-bordado-1600x1600-v01-fondo-estudio.png',
    nombre: 'the Efeonce navy softshell jacket, worn with the zip half open over a dark navy layer, high collar',
    pliegue: 'the technical fabric holds its shape and breaks into a few wide soft folds at the elbows and waist'
  },
  polo: {
    base: 'ai-generations/2026-09-17_polo-efeonce/final/',
    hombre: 'efeonce-polo-navy-13-puesto-frente-1200x1600-v01-fondo-estudio.png',
    macro: 'efeonce-polo-navy-10-detalle-bordado-1600x1600-v01-fondo-estudio.png',
    nombre: 'the Efeonce navy piqué polo, short sleeves, two-button placket, tucked out',
    pliegue: 'the piqué knit drapes and shows small natural wrinkles around the chest and at the waist'
  },
  hoodie: {
    base: 'ai-generations/2026-09-17_hoodie-efeonce/final/',
    hombre: 'efeonce-hoodie-15-puesto-frente-1200x1600-v01-fondo-estudio.png',
    macro: 'efeonce-hoodie-09-detalle-pecho-1600x1600-v01-fondo-estudio.png',
    nombre: 'the Efeonce royal-blue hoodie, hood down, kangaroo pocket, drawstrings',
    pliegue: 'the brushed fleece makes soft rounded folds at the elbows, at the pocket and above the ribbed hem'
  }
}

const GIRO = {
  frente: 'standing straight and facing the camera squarely',
  '45-der': 'with the torso turned 45 degrees so its FRONT faces the RIGHT edge of the image: the wearer\'s right shoulder comes nearer the camera and the left shoulder recedes, so the mark on the wearer\'s left chest sits on the FAR side of the chest, seen foreshortened along the curve of the chest but still entirely visible',
  '45-izq': 'with the torso turned 45 degrees so its FRONT faces the LEFT edge of the image: the wearer\'s left shoulder comes nearer the camera, so the mark on the wearer\'s left chest sits on the NEAR side of the chest, seen almost frontally',
  // Giro profundo [operador, 2026-10-03]: «cuando el giro es más profundo también se pierden los detalles del logo».
  '70-der': 'with the torso turned DEEPLY, about 70 degrees, almost in profile, so its FRONT faces the RIGHT edge of the image: the right shoulder and right sleeve are nearest the camera and the left side of the chest wraps away; the mark on the wearer\'s left chest is on the far curve of the chest, strongly foreshortened into a narrow sliver that follows the curvature of the fabric — still the same mark, compressed by perspective, never redrawn wider',
  '70-izq': 'with the torso turned DEEPLY, about 70 degrees, almost in profile, so its FRONT faces the LEFT edge of the image: the left shoulder and left sleeve are nearest the camera and the mark on the wearer\'s left chest faces the camera at a steep angle, compressed horizontally by perspective along the curve of the chest — the same mark, foreshortened, never redrawn frontal'
}

const CUERPO = {
  hombre: 'an adult MAN of medium athletic build',
  mujer: 'a slim adult WOMAN with a natural female torso — narrower shoulders, defined waist and the bust shaping the fabric — wearing the women\'s cut of the same garment'
}

const promptPrenda = (p, cuerpo, giro, padeado) =>
  `Image 1 is a studio product photograph of ${p.nombre}, already worn, cropped just below the chin. Image 2 is the macro of the embroidered mark that is ALREADY on that garment. ` +
  `Produce the same studio product photograph with the SAME garment worn by ${CUERPO[cuerpo]}, ${GIRO[giro]}. ` +
  'Same crop: just below the chin at the top (no face, no mouth), mid-thigh at the bottom; arms hanging relaxed at the sides, never in front of the chest. ' +
  `Keep the garment identical to image 1: colour, cut, collar, closures, cuffs, hem and fabric. The mark is ${MARCA}, embroidered in white satin-stitch with visible stitch direction, slightly raised — never flat ink; it keeps the exact shape and proportions of image 2, the same position on the wearer's left chest and the same size relative to the chest panel (no wider than a third of it). ` +
  (giro === 'frente' ? '' : 'The mark is NOT rotated in the plane of the fabric: the long axis of its orbit stays exactly HORIZONTAL, parallel to the hem, exactly as in image 2; the turn of the body only makes it NARROWER horizontally (foreshortening) — never tilted, never spun, never leaning toward the turn. ') +
  `The fabric behaves like the real material on this body: ${p.pliegue}; folds may pass near the mark and bend it gently with the fabric, but never hide or cut it. ` +
  'Plain light grey seamless studio background and the same soft, even studio light as image 1. Dark trousers. No text, no other logos, no jewellery.' +
  (padeado ? ' The bottom strip of image 1 below the hem line is mirrored padding added to change the aspect ratio: ignore it.' : '')

const TAPA = {
  mano: 'the wearer\'s own RIGHT hand rests flat on their LEFT chest, relaxed, so the fingers cover roughly the LEFT HALF of the mark (the half nearer the centre of the body); the right half of the mark stays visible',
  brazos: 'the arms are CROSSED over the chest, the upper forearm resting just under the mark so it covers the LOWER THIRD of the mark; the upper two thirds stay visible',
  // Medido 2026-10-03: pedido «que tape la mitad de abajo», el modelo bajó la tablet hasta dejar la marca entera (esquiva
  // la oclusión). Se fija la ALTURA del borde contra la marca misma.
  objeto: 'both hands hold a closed matte-black tablet upright against the chest, raised HIGH so that its top edge lies exactly at the HEIGHT OF THE MIDDLE OF THE MARK (the three round windows of the rocket are hidden behind the tablet); only the upper half of the mark — the top of the orbit and the small sphere — shows above the tablet edge',
  // Un antebrazo que pasa POR DELANTE de la marca: el caso de la mano con taza, teléfono o gesto.
  // Medido 2026-10-03: en 3 de 8 la taza subió hasta el hombro y la marca quedó entera debajo (esquiva). Se ancla la
  // MANO a la marca: los nudillos van delante de ella.
  cruza: 'the wearer\'s RIGHT hand holds a plain white coffee cup in front of their LEFT chest, the hand resting at the height of the mark so the KNUCKLES AND FINGERS ARE DIRECTLY IN FRONT OF the mark and hide its right half; the forearm crosses the chest diagonally below; the left half of the mark (part of the orbit and the small sphere) stays visible beside the hand'
}

const promptTapa = (p, cuerpo, tapa, padeado) =>
  `Image 1 is a studio product photograph of ${p.nombre}, already worn, cropped just below the chin. Image 2 is the macro of the embroidered mark that is ALREADY on that garment. ` +
  `Produce the same studio photograph, same framing and same garment on ${CUERPO[cuerpo]} standing straight and facing the camera, but now ${TAPA[tapa]}. ` +
  'CRITICAL — this is an OCCLUSION, not a redesign: the mark keeps EXACTLY the size, position, shape and white satin-stitch embroidery it has in image 1; whatever is in front simply HIDES the covered part. Do NOT shrink, move, shift, re-centre or redraw the mark to make it fit beside the hand, arm or object, and never draw the hidden part on top of them. ' +
  `The fabric creases naturally where it is pressed: ${p.pliegue}. ` +
  'Same crop: just below the chin at the top (no face, no mouth), mid-thigh at the bottom. Plain light grey seamless studio background and the same soft, even studio light as image 1. Dark trousers. No text, no other logos, no jewellery, no watch.' +
  (padeado ? ' The bottom strip of image 1 below the hem line is mirrored padding added to change the aspect ratio: ignore it.' : '')

// ── Espalda [operador, 2026-10-03]: «en la parte de atrás está el logo completo, así que si se está de espalda hay que
// considerar que el logo se vea bien en esos ángulos: desde abajo, de los lados». El giro de espalda se nombra igual
// que el de frente: hacia qué borde del CUADRO apunta la nariz de la persona (aquí, de espaldas a cámara).
const ESPALDA = {
  softshell: { hombre: 'efeonce-chaqueta-softshell-15-puesto-espalda-1200x1600-v01-fondo-estudio.png', mujer: 'efeonce-chaqueta-softshell-17-puesto-espalda-mujer-1024x1536-v01-fondo-estudio.png', bordado: 'efeonce-chaqueta-softshell-02-espalda-1024x1024-v02-fondo-estudio.png' },
  bomber: { hombre: 'efeonce-chaqueta-bomber-16-puesto-espalda-1024x1536-v01-fondo-estudio.png', mujer: 'efeonce-chaqueta-bomber-15-puesto-espalda-mujer-1024x1536-v01-fondo-estudio.png' },
  polo: { hombre: 'efeonce-polo-navy-14-puesto-espalda-1024x1536-v02-fondo-estudio.png', mujer: 'efeonce-polo-navy-16-puesto-espalda-mujer-1024x1536-v02-fondo-estudio.png' },
  hoodie: { hombre: 'efeonce-hoodie-16-puesto-espalda-1200x1600-v01-fondo-estudio.png', mujer: 'efeonce-hoodie-22-puesto-espalda-mujer-1024x1536-v01-fondo-estudio.png' }
}

const GIRO_ESPALDA = {
  'espalda-45-izq': 'seen from BEHIND at three-quarters: the person turns so their face points toward the LEFT edge of the image while the camera still sees mostly their back; the back mark is foreshortened across the turning back',
  'espalda-45-der': 'seen from BEHIND at three-quarters: the person turns so their face points toward the RIGHT edge of the image while the camera still sees mostly their back; the back mark is foreshortened across the turning back',
  'espalda-70-izq': 'seen from BEHIND in a DEEP turn, almost in profile: the face points toward the LEFT edge of the image; the back mark wraps around the curve of the back — the letters nearest the camera read clearly, the far ones compress around the curve',
  'espalda-70-der': 'seen from BEHIND in a DEEP turn, almost in profile: the face points toward the RIGHT edge of the image; the back mark wraps around the curve of the back — the letters nearest the camera read clearly, the far ones compress around the curve',
  'espalda-bajo': 'standing straight with the back to the camera, shot from a LOW camera near hip height looking UP at the back: the back mark is seen from below in true perspective, its lines converging slightly upward'
}

const promptEspalda = (p, k, cuerpo, giro, padeado, conBordado) =>
  `Image 1 is a studio product photograph of ${p.nombre}, worn and seen from behind. ` +
  (conBordado ? 'Image 2 is the same garment seen flat from behind: it shows the back mark as EMBROIDERY, which is the correct technique. ' : 'Image 2 is the macro of the embroidered chest mark of the same garment: it shows the embroidery technique and the rocket-in-orbit symbol. ') +
  `Produce the same studio photograph with the SAME garment worn by ${CUERPO[cuerpo]}, ${GIRO_ESPALDA[giro]}. ` +
  'The back of the head may show; no face. ' +
  'The back mark is the full Efeonce wordmark — the letters e-f-e-o-n-c-e where the o is a rocket with three round windows inside an elliptical orbit with a small sphere on top — with the line "Empower your Growth" centred under it, exactly as in image 1: same letters, same spelling, same size and position across the shoulder blades. ' +
  `It is embroidered in white satin-stitch with visible stitch direction, slightly raised — never flat print. The turn and the camera only change its PERSPECTIVE: never re-letter it, never redraw it flat, never move it, never shrink it, never rotate it in the plane of the fabric. ` +
  `The fabric behaves like the real material: ${p.pliegue}; folds may bend the letters gently but never break the word. ` +
  'Plain light grey seamless studio background and soft, even studio light as in image 1. Dark trousers. No other text or logos.' +
  (padeado ? ' The bottom strip of image 1 below the hem line is mirrored padding added to change the aspect ratio: ignore it.' : '')

const GORRA = {
  base: 'ai-generations/2026-09-17_gorra-efeonce/',
  hombre: 'out/prueba-julio.png',
  mujer: 'out/prueba-nexa.png',
  macro: 'final/efeonce-gorra-v2-04-macro-bordado-1600x1600-v01-fondo-estudio.png',
  // La prueba en persona sale royal en la edición: la vista navy del producto fija el color (medido 2026-10-03).
  navy: 'final/efeonce-gorra-v2-navy-logotipo-1600x1600-v01-fondo-estudio.png'
}

const promptGorra = (cuerpo, giro) =>
  'Image 1 shows the Efeonce cap worn on a person, with the white "efeonce" wordmark embroidered on the front panels. Image 2 is the macro of that embroidery. Image 3 is the product photo of the cap and fixes its COLOUR: a very dark NAVY, almost black-blue — never royal blue, cobalt or bright blue, even if image 1 looks lighter. ' +
  `Produce a studio product photograph of the SAME cap worn by ${cuerpo === 'mujer' ? 'an adult WOMAN with long dark hair tucked behind the ears and gathered at the nape' : 'an adult MAN with short dark hair'}, ` +
  (giro === 'frente'
    ? 'head facing the camera squarely. '
    : giro.startsWith('70')
      ? `head turned DEEPLY, about 70 degrees, almost in profile, so the face points toward the ${giro.endsWith('der') ? 'RIGHT' : 'LEFT'} edge of the image: the wordmark wraps around the curved front panels and is strongly foreshortened — the letters nearest the camera read, the far ones compress around the curve; same letters, never redrawn flat. `
      : `head turned 45 degrees so the face points toward the ${giro === '45-der' ? 'RIGHT' : 'LEFT'} edge of the image, the wordmark following the curve of the front panels. `) +
  'TIGHT CROP: from just above the crown of the cap down to just below the eyebrows — the eyes, nose and mouth are OUT of frame, only forehead, temples, ears and hair show. ' +
  'Normal adult size with a snug, low-profile fit: the band rests just above the eyebrows, the side panels hug the temples with no gap, the crown is about a third of the head height, the brim is short and curved, as wide as the forehead — never oversized, never a long flat brim. ' +
  'Keep the cap identical to image 3 in colour (very dark navy) and to image 1 in shape: six panels, covered button, eyelets, and the wordmark exactly as in image 2 — same letters e-f-e-o-n-c-e, same white satin-stitch embroidery, same size across the front panels; the crown fabric makes a soft natural dent and the wordmark bends with it but is never cut. ' +
  'Plain light grey seamless studio background, soft even studio light. No text other than the wordmark, no other logos.'

const prep = async (src) => {
  const meta = await sharp(src).metadata()
  if (Math.abs(meta.width / meta.height - 2 / 3) < 0.01) return { file: src, padeado: false }
  const target = Math.round(meta.width * 1.5)
  const extra = target - meta.height
  const out = path.join(D, 'entrada', path.basename(src).replace('.png', '-2x3.png'))
  if (!fs.existsSync(out)) {
    const franja = await sharp(src).extract({ left: 0, top: meta.height - extra, width: meta.width, height: extra }).flip().toBuffer()
    await sharp(src).extend({ bottom: extra, background: '#808080' }).composite([{ input: franja, left: 0, top: meta.height }]).png().toFile(out)
  }
  return { file: out, padeado: true }
}

;(async () => {
  const jobs = []
  for (const [k, p] of Object.entries(PRENDAS)) {
    const macro = path.join(R, p.base, p.macro)
    const hombre = await prep(path.join(R, p.base, p.hombre))
    const mujerFrente = path.join(D, 'out', `${k}-frente-mujer.png`)
    const de = n => ({ file: path.join(D, 'out', `${k}-${n}.png`), padeado: false })
    const lista = ola === 1
      ? [['hombre', '45-der', hombre], ['hombre', '45-izq', hombre], ['mujer', 'frente', hombre]]
      : ola === 2
        ? [['mujer', '45-der', { file: mujerFrente, padeado: false }], ['mujer', '45-izq', { file: mujerFrente, padeado: false }]]
        // Ola 3: el giro profundo se edita desde el 45° del mismo lado (editar conserva; el salto es menor).
        : ola === 3
          ? [['hombre', '70-der', de('45-der')], ['hombre', '70-izq', de('45-izq')], ['mujer', '70-der', de('45-der-mujer')], ['mujer', '70-izq', de('45-izq-mujer')]]
          // Ola 4: las vistas con la marca ROTADA (rotacion-marca.mjs) se rehacen desde el FRENTE, que tiene la marca
          // horizontal; partir del 45° rotado arrastraba la rotación.
          : ola === 4
            ? ['45-der', '70-izq', '70-der'].flatMap(g => [['hombre', g, hombre], ['mujer', g, { file: mujerFrente, padeado: false }]])
            : []
    for (const [cuerpo, giro, src] of lista) {
      const id = `${k}-${giro}${cuerpo === 'mujer' ? '-mujer' : ''}`
      const pf = path.join(D, 'prompts', `${id}.txt`)
      fs.writeFileSync(pf, promptPrenda(p, cuerpo, giro, src.padeado))
      jobs.push([src.file, pf, path.join(D, 'out', `${id}.png`), '1024x1536', macro].join('|'))
    }
  }
  if (ola === 7) {
    for (const [k, p] of Object.entries(PRENDAS)) {
      const e = ESPALDA[k]
      const ref2 = e.bordado ? path.join(R, p.base, e.bordado) : path.join(R, p.base, p.macro)
      for (const cuerpo of ['hombre', 'mujer']) {
        const src = await prep(path.join(R, p.base, e[cuerpo]))
        for (const giro of Object.keys(GIRO_ESPALDA)) {
          const id = `${k}-${giro}${cuerpo === 'mujer' ? '-mujer' : ''}`
          const pf = path.join(D, 'prompts', `${id}.txt`)
          fs.writeFileSync(pf, promptEspalda(p, k, cuerpo, giro, src.padeado, Boolean(e.bordado)))
          jobs.push([src.file, pf, path.join(D, 'out', `${id}.png`), '1024x1536', ref2].join('|'))
        }
      }
      // Frente con cámara baja (el ángulo de las pruebas de uniforme del elenco).
      const macro = path.join(R, p.base, p.macro)
      for (const [cuerpo, src] of [['hombre', await prep(path.join(R, p.base, p.hombre))], ['mujer', { file: path.join(D, 'out', `${k}-frente-mujer.png`), padeado: false }]]) {
        const id = `${k}-frente-bajo${cuerpo === 'mujer' ? '-mujer' : ''}`
        const pf = path.join(D, 'prompts', `${id}.txt`)
        fs.writeFileSync(pf, promptPrenda(p, cuerpo, 'frente', src.padeado).replace('standing straight and facing the camera squarely', 'standing straight and facing the camera, shot from a LOW camera near hip height looking UP at the chest, so the chest mark is seen from below in true perspective — the same mark, never redrawn flat, never rotated in the plane'))
        jobs.push([src.file, pf, path.join(D, 'out', `${id}.png`), '1024x1536', macro].join('|'))
      }
    }
    console.log(jobs.join('\n'))
    return
  }
  if (ola === 5) {
    // Oclusión [operador, 2026-10-03]: «hay que dar la vista en la ropa que permita esos casos, que son los que más
    // ocurren» — la marca a su tamaño real, con sólo la parte que la mano, el brazo o el objeto no tapan.
    for (const [k, p] of Object.entries(PRENDAS)) {
      const macro = path.join(R, p.base, p.macro)
      const hombre = await prep(path.join(R, p.base, p.hombre))
      const mujer = { file: path.join(D, 'out', `${k}-frente-mujer.png`), padeado: false }
      for (const [cuerpo, src] of [['hombre', hombre], ['mujer', mujer]]) {
        for (const tapa of (process.argv[3] ? process.argv[3].split(',') : Object.keys(TAPA))) {
          const id = `${k}-frente-${tapa}${cuerpo === 'mujer' ? '-mujer' : ''}`
          const pf = path.join(D, 'prompts', `${id}.txt`)
          fs.writeFileSync(pf, promptTapa(p, cuerpo, tapa, src.padeado))
          jobs.push([src.file, pf, path.join(D, 'out', `${id}.png`), '1024x1536', macro].join('|'))
        }
      }
    }
    console.log(jobs.join('\n'))
    return
  }
  const lista = ola === 1 ? [['hombre', 'frente'], ['mujer', 'frente']]
    : ola === 2 ? [['hombre', '45-der'], ['hombre', '45-izq'], ['mujer', '45-der'], ['mujer', '45-izq']]
      : [['hombre', '70-der'], ['hombre', '70-izq'], ['mujer', '70-der'], ['mujer', '70-izq']]
  for (const [cuerpo, giro] of lista) {
    const id = `gorra-${giro}${cuerpo === 'mujer' ? '-mujer' : ''}`
    const pf = path.join(D, 'prompts', `${id}.txt`)
    fs.writeFileSync(pf, promptGorra(cuerpo, giro))
    const suf = cuerpo === 'mujer' ? '-mujer' : ''
    const src = ola === 1 ? path.join(R, GORRA.base, GORRA[cuerpo])
      : ola === 2 ? path.join(D, 'out', `gorra-frente${suf}.png`)
        : path.join(D, 'out', `gorra-45-${giro.endsWith('der') ? 'der' : 'izq'}${suf}.png`)
    jobs.push([src, pf, path.join(D, 'out', `${id}.png`), '1024x1024', path.join(R, GORRA.base, GORRA.macro), path.join(R, GORRA.base, GORRA.navy)].join('|'))
  }
  console.log(jobs.join('\n'))
})()
