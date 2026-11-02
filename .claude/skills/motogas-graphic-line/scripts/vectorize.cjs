// Vectoriza una pose 2D del Rey del Gas en capas de color exactas de la marca.
// Uso: NODE_PATH=$PWD/node_modules node vectorize.cjs <entrada.png> <salida-sin-extension> [--fondo r,g,b] [--escala 2] [--extra nombre:r,g,b;…]
// Clasifica cada píxel al color de paleta más cercano (más el fondo, si la entrada no trae alfa),
// traza cada máscara con potrace y apila: silueta negra abajo, rojo, amarillo y blanco encima.
// El negro que queda visible entre colores ES el contorno, así no aparecen costuras.
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const PALETA = {
  negro: [0, 0, 0],
  rojo: [255, 0, 0],
  blanco: [255, 255, 255],
  amarillo: [255, 194, 20]
}

// Colores extra de un personaje que los necesita (el Frío: celeste y azul hielo). --extra nombre:r,g,b;nombre:r,g,b
const iExtra = process.argv.indexOf('--extra')

if (iExtra > 0) {
  for (const par of process.argv[iExtra + 1].split(';')) {
    const [n, rgb] = par.split(':')

    PALETA[n] = rgb.split(',').map(Number)
  }
}

const args = process.argv.slice(2)
const entrada = args[0]
const salida = args[1]
const opt = (k, d) => {
  const i = args.indexOf(k)

  return i >= 0 ? args[i + 1] : d
}
const fondo = opt('--fondo', null)?.split(',').map(Number) ?? null
const escala = Number(opt('--escala', '2'))
const turd = Number(opt('--turd', '40'))

const dist = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2

;(async () => {
  const meta = await sharp(entrada).metadata()
  const W = Math.round(meta.width * escala)
  const H = Math.round(meta.height * escala)
  const { data } = await sharp(entrada).ensureAlpha().resize(W, H, { kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true })

  const clases = Object.entries(PALETA)
  const mascaras = Object.fromEntries(clases.map(([k]) => [k, Buffer.alloc(W * H)]))
  const silueta = Buffer.alloc(W * H)
  const cuenta = Object.fromEntries(clases.map(([k]) => [k, 0]))
  let fuera = 0

  for (let p = 0, i = 0; p < W * H; p++, i += 4) {
    const px = [data[i], data[i + 1], data[i + 2]]

    if (data[i + 3] < 128) continue
    let mejor = null
    let md = Infinity

    for (const [k, c] of clases) {
      const d = dist(px, c)

      if (d < md) { md = d; mejor = k }
    }

    if (fondo && dist(px, fondo) < md) continue
    silueta[p] = 1
    mascaras[mejor][p] = 1
    cuenta[mejor]++
    if (md > 60 ** 2) fuera++
  }

  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'rdg-vec-'))

  const trazar = (buf, nombre) => {
    // PBM P4: 1 = tinta
    const fila = Math.ceil(W / 8)
    const out = Buffer.alloc(fila * H)

    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (buf[y * W + x]) out[y * fila + (x >> 3)] |= 0x80 >> (x & 7)
    const pbm = path.join(tmp, nombre + '.pbm')

    fs.writeFileSync(pbm, Buffer.concat([Buffer.from(`P4\n${W} ${H}\n`), out]))
    const svg = path.join(tmp, nombre + '.svg')

    execFileSync('potrace', [pbm, '-s', '-o', svg, '-t', String(turd), '-a', '1.1', '-O', '0.4'])
    const txt = fs.readFileSync(svg, 'utf8')
    const g = txt.match(/<g transform="([^"]+)"[^>]*>([\s\S]*?)<\/g>/)

    return { transform: g[1], cuerpo: g[2] }
  }

  const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()
  const extras = Object.keys(PALETA).filter((k) => !['negro', 'rojo', 'blanco', 'amarillo'].includes(k))
  const capas = [['silueta', silueta, '#000000'], ['rojo', mascaras.rojo, '#FF0000'], ['amarillo', mascaras.amarillo, '#FFC214'],
    ...extras.map((k) => [k, mascaras[k], hex(PALETA[k])]), ['blanco', mascaras.blanco, '#FFFFFF']]

  // potrace -s escribe width/height en pt; usamos su viewBox de píxeles
  const grupos = capas.map(([n, b, c]) => {
    const { transform, cuerpo } = trazar(b, n)

    return `<g id="${n}" transform="${transform}" fill="${c}" stroke="none">${cuerpo}</g>`
  })

  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">\n${grupos.join('\n')}\n</svg>\n`

  fs.writeFileSync(salida + '.svg', svg)
  await sharp(Buffer.from(svg)).png().toFile(salida + '.png')

  const total = Object.values(cuenta).reduce((a, b) => a + b, 0)
  const reparto = Object.fromEntries(Object.entries(cuenta).map(([k, v]) => [k, +(v / total * 100).toFixed(1)]))

  console.log(JSON.stringify({ entrada, W, H, reparto, fueraDePaleta: +(fuera / total * 100).toFixed(2) }))
  fs.rmSync(tmp, { recursive: true })
})()
