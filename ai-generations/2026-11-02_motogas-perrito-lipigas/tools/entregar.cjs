// Arma la entrega: fondo de estudio (con placa) y transparente (recorte limpio) por pose, más hojas de contacto.
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')
const R = process.argv[2]
const POSES = [['00', 'base'], ['01', 'ladeado'], ['02', 'apuntando'], ['03', 'trotando'], ['04', 'echado'], ['05', 'celular'], ['06', 'megafono'], ['07', 'celebrando'], ['08', 'mirando-arriba']]
const E = path.join(R, 'entrega')
fs.mkdirSync(E, { recursive: true })
;(async () => {
  const tr = []
  for (const [n, p] of POSES) {
    const base = `perrito-${n}-${p}-v01`
    const nombre = `motogas-perrito-lipigas-${n}-${p}-1x1-1600x1600-v01`
    fs.copyFileSync(path.join(R, 'placa', base + '-placa.png'), path.join(E, nombre + '-fondo-estudio.png'))
    fs.copyFileSync(path.join(R, 'recorte', base + '-transparente-limpio.png'), path.join(E, nombre + '-transparente.png'))
    tr.push(path.join(E, nombre + '-transparente.png'))
  }
  const C = 560
  for (const [bg, nombre] of [['#FFFFFF', 'hoja-sobre-blanco'], ['#FFD400', 'hoja-sobre-amarillo'], ['#002989', 'hoja-sobre-navy']]) {
    const comp = []
    for (let i = 0; i < tr.length; i++) comp.push({ input: await sharp(tr[i]).resize(C).png().toBuffer(), left: (i % 5) * C, top: Math.floor(i / 5) * C })
    await sharp({ create: { width: 5 * C, height: 2 * C, channels: 3, background: bg } }).composite(comp).png().toFile(path.join(E, nombre + '.png'))
  }
  console.log(fs.readdirSync(E).length, 'archivos')
})()
