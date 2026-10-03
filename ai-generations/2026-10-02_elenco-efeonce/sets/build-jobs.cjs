// Genera los prompts y la lista de trabajos del set de ángulos del elenco ficticio (2026-10-02).
// Cada vista sale por EDICIÓN desde la foto elegida por el operador (editar conserva, generar reconstruye).
const fs = require('fs')
const path = require('path')

const D = path.resolve(__dirname, '..')

const SRC = {
  hum: 'hum/hum-b.png',
  karo: 'ronda-2/karo-a.png',
  sophia: 'sophia/sophia-b-castano.png',
  isabella: 'ronda-2/isabella-d.png',
  antonio: 'ronda-2/antonio-d.png'
}

const KEEP =
  'Casting reference photograph of the SAME person shown in the input image. Keep the identity EXACTLY: face shape, bone structure, eyes, eyebrows, nose, mouth, ears, skin tone, marks, hair colour, hair texture, hair length and hairstyle, glasses and earrings if present, facial hair if present, and the same apparent age. Do not beautify, slim, age or retouch. '

const LOOK =
  ' Plain dark navy crew-neck t-shirt with no logo. Large soft key light at 45 degrees with gentle fill, clean commercial studio, plain mid-grey seamless backdrop. Healthy real skin with fine natural pores, real hair with individual strands, real sensor grain, true-to-life colour. Relaxed neutral expression with a slight closed-mouth smile. Hands out of frame. No text, no logos.'

const TRES_CUARTOS = '(three-quarter view: the far ear is hidden and the bridge of the nose crosses the far cheek), eyes looking toward the camera. 85mm lens.'
const PERFIL = 'so only one eye and one ear are visible and the outline of the nose is drawn against the grey background. 85mm lens.'

// El nombre de la vista dice hacia dónde GIRA la persona, no qué lado se ve (convención del canon).
const V = {
  frente: ['New photograph: head and shoulders, square to the camera, looking straight into the lens. 85mm lens.', '1024x1024'],
  '45-izq': [`New photograph: head and shoulders, turned about 45 degrees toward the person's OWN LEFT ${TRES_CUARTOS}`, '1024x1024'],
  '45-der': [`New photograph: head and shoulders, turned about 45 degrees toward the person's OWN RIGHT ${TRES_CUARTOS}`, '1024x1024'],
  'perfil-izq': [`New photograph: head and shoulders in strict PROFILE, turned 90 degrees toward the person's OWN LEFT, ${PERFIL}`, '1024x1024'],
  'perfil-der': [`New photograph: head and shoulders in strict PROFILE, turned 90 degrees toward the person's OWN RIGHT, ${PERFIL}`, '1024x1024'],
  cuerpo: [
    'New photograph: FULL-LENGTH, standing naturally, facing the camera, from head to feet with a little space above and below, dark straight-leg jeans and plain white sneakers. CORRECT ADULT PROPORTIONS (critical): standing height about 7.5 head-heights; the head is about 13% of the full height, never a big head on a small body and never a tiny head; shoulders a little more than twice the head width; fingertips at mid-thigh. 85mm lens from about 7 metres, camera at waist height, no perspective distortion.',
    '1024x1536'
  ]
}

const jobs = []

for (const [k, src] of Object.entries(SRC)) {
  fs.mkdirSync(path.join(D, 'sets', k), { recursive: true })

  for (const [v, [p, size]] of Object.entries(V)) {
    const pf = path.join(D, 'sets', k, `${v}.txt`)

    fs.writeFileSync(pf, KEEP + p + LOOK)
    jobs.push([path.join(D, src), pf, path.join(D, 'sets', k, `${k}-${v}.png`), size].join('|'))
  }
}

fs.writeFileSync(path.join(D, 'sets', 'jobs.txt'), jobs.join('\n') + '\n')
console.log(jobs.length)
