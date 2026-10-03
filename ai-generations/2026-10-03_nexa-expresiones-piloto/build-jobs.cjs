// Piloto (2026-10-03): expresiones de Nexa casi de frente que se vean REALES. El primer intento (de frente estricto +
// marcadores musculares) fue rechazado: «se ven muy IA, rasgos muy ficticios». Diagnóstico: cabeza inmóvil y simétrica
// con una expresión intensa encima (se lee actuada) y marcadores que el modelo exagera. Dos métodos:
//   A · momento real: ancla frontal + la CAUSA de la expresión, la cabeza hace su movimiento natural, intensidad real.
//   B · reorientar la aprobada: la expresión original (real) + el ancla frontal sólo como referencia del ángulo.
const fs = require('fs')
const path = require('path')
const R = path.resolve(__dirname, '../..')
const D = __dirname
const ANCLA = path.join(R, 'ai-generations/_identidad-nexa/1-anclas/nexa-ancla-1-rostro-frontal.png')
// Ancla corregida a la proporción del canon (2026-10-03): la frontal aprobada mide largo/ancho 0,85, contra 0,81–0,83 del
// ancla de cuerpo y las portadas aprobadas; estirada en horizontal ×1,037 queda en 0,83. Sólo `--v2`.
const V2 = process.argv.includes('--v2')
const ANCLA_A = V2 ? path.join(D, 'ancla-1-v2-proporcion.png') : ANCLA
const GEOMETRIA = 'Her face is a SOFT OVAL, a little wider than it is long from the eyes down: the width across the cheekbones is about 1.2 times the distance from the eyes to the chin — never a narrow, elongated or slimmed face, never a sharpened jaw.'
const EXPR = k => path.join(R, `ai-generations/_identidad-nexa/5-expresiones/nexa-expr-${k}.png`)
const PIEL = 'Real photographic skin: texture only from irregular pores and fine facial hair (vellus) catching the light, healthy luminous even tone, no redness, no blotches, no under-eye shadows; lips with real texture, never gloss; brows with individual hairs, never a painted block; real hair with individual strands and a few flyaways. Natural, slightly asymmetric human face — never a perfectly symmetric, sculpted or doll-like face; the eye make-up stays as subtle as in image 1.'

const CAUSA = {
  '01-carcajada': 'someone just off-camera said something genuinely funny and she bursts into a real, unguarded laugh: the laugh moves her whole head a little back and to one side, her eyes crinkle, her shoulders lift — a candid moment, not a pose',
  '04-esceptica': 'she has just heard a claim she does not quite believe: a small, restrained sceptical look — the lips pressed and pulled very slightly to one side, a barely raised brow, the head tilted a few degrees — understated, the way a real person reacts in a meeting',
  '08-conviccion': 'she is making the key point of her argument and means it: a calm, steady, direct look into the lens, mouth closed and relaxed with no smile, the chin level — quiet confidence, not intensity',
  // Las nueve restantes (2026-10-03, A2 aprobado por el operador: «lo veo bien, la verdad»).
  '02-risa-elegante': 'a colleague just shared good news and she laughs softly: a light, warm laugh with the lips parted showing the upper teeth, relaxed eyes — easy and genuine, not a big laugh',
  '03-sorprendida': 'she has just seen an unexpectedly good result on a screen beside the camera: a genuine, pleasant surprise — brows lifted, eyes a little wider, lips parted — caught in the moment',
  '05-pensativa': 'she is weighing a decision: her eyes drift slightly up and to one side, lips closed and relaxed, a quiet moment of thinking',
  '06-neutra-reposo': 'she is listening calmly between two sentences: her face at rest, mouth closed with no smile, a relaxed, direct look',
  '07-preocupada': 'she has just read a worrying number: concern shows in a slight crease between the brows and lightly pressed lips — controlled and real, never dramatic',
  '09-escucha-empatica': 'someone is telling her about a problem and she listens with care: attentive, kind eyes, the mouth soft with no smile, a slight nod',
  '10-curiosa': 'something intriguing has just caught her attention: alert eyes, the head tilted a few degrees, the faintest lift at one corner of the mouth',
  '11-complicidad': 'she shares an inside joke with someone just off-camera: a knowing closed-lip smile, a little more on one side',
  '12-mirada-lateral': 'something to one side, off-camera, catches her eye: her face stays toward the camera while only her eyes glance to the side, lips neutral'
}

const jobs = []
for (const [k, causa] of Object.entries(CAUSA)) {
  const pa = path.join(D, 'prompts', `${V2 ? 'A2' : 'A'}-${k}.txt`)
  fs.writeFileSync(pa,
    'Image 1 is Nexa, a real woman, photographed facing the camera. Keep her identity exactly: her features, proportions, skin, hair, ' +
    `grey t-shirt, the soft window light with fill, the background and the framing. Capture a real moment: ${causa}. Her face stays ` +
    'turned roughly toward the camera (within about 15 degrees), both eyes visible; the head is free to make the small natural movement ' +
    `that comes with the expression. Natural, everyday intensity — never theatrical, never exaggerated. ${PIEL} No text.`)
  if (V2) fs.writeFileSync(pa, fs.readFileSync(pa, 'utf8').replace('Natural, everyday intensity', `${GEOMETRIA} Natural, everyday intensity`))
  jobs.push([ANCLA_A, pa, path.join(D, 'out', `${V2 ? 'A2' : 'A'}-${k}.png`), '2048x2560', ANCLA_A].join('|'))
  const pb = path.join(D, 'prompts', `B-${k}.txt`)
  fs.writeFileSync(pb,
    'Image 1 is a real photograph of Nexa with a facial expression, her head turned to one side. Image 2 is the same woman facing the ' +
    'camera: it is ONLY the reference for the head angle. Produce image 1 again with her head turned toward the camera like image 2 ' +
    '(within about 10 degrees of frontal, both eyes visible), keeping EVERYTHING else from image 1: the exact same expression with the ' +
    `same intensity, her features, skin, hair, t-shirt, light and background. ${PIEL} No text.`)
  jobs.push([EXPR(k), pb, path.join(D, 'out', `B-${k}.png`), '2048x2560', ANCLA].join('|'))
}
console.log(jobs.join('\n'))
