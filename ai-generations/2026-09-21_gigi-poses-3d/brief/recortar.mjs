import sharp from 'sharp'
const F='ai-generations/2026-09-21_gigi-poses-3d/fuente', R='ai-generations/2026-09-21_gigi-poses-3d/ref'
const crops=[
 [`${F}/hoja-modelo-raw.png`,`${R}/gigi-arco-sonrisa.png`,{left:1160,top:30,width:540,height:590}],
 [`${F}/hoja-modelo-raw.png`,`${R}/gigi-audifonos.png`,{left:640,top:130,width:540,height:470}],
 [`${F}/hoja-modelo-raw.png`,`${R}/gigi-sparkle.png`,{left:460,top:1530,width:450,height:470}],
 [`${F}/hoja-modelo-raw.png`,`${R}/gigi-gota-punta.png`,{left:460,top:610,width:450,height:460}],
]
for (const [i,o,c] of crops) await sharp(i).extract(c).png().toFile(o)
// hero de la campaña: la gota con la punta enroscada
await sharp(`${F}/frames/gasta-name_gigi-5.png`).extract({left:20,top:390,width:770,height:530}).resize(900).png().toFile(`${R}/gigi-hero-campana.png`)
await sharp(`${F}/frames/gasta-gemini_morph-3.png`).extract({left:190,top:230,width:630,height:570}).png().toFile(`${R}/gigi-cara-puntos.png`)
await sharp(`${F}/hoja-modelo-raw.png`).resize(1100).png().toFile(`${R}/gigi-hoja-modelo.png`)
console.log('ok')
