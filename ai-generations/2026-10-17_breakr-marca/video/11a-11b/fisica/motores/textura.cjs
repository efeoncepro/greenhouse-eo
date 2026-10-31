// Mide la "textura" del agua por cuadro: energía de alta frecuencia (varianza del laplaciano) en la zona del torso
// y la cabeza de Paula, normalizada a 512 px de ancho. Gotas de vidrio nítidas = valor alto; agua con estelas = bajo.
const sharp = require('sharp'), { execSync } = require('child_process'), fs = require('fs')
const lap = async (buf) => {
  const { data, info } = await sharp(buf).greyscale().resize(512).extract({ left: 96, top: 120, width: 320, height: 300 })
    .convolve({ width: 3, height: 3, kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0], offset: 128 }).raw().toBuffer({ resolveWithObject: true })
  let s = 0, s2 = 0; for (const v of data) { s += v; s2 += v * v } const n = data.length; return (s2 / n - (s / n) ** 2).toFixed(0)
}
;(async () => {
  for (const clip of process.argv.slice(2)) {
    const d = parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 ${clip}`).toString())
    const out = []
    for (let t = 0; t < d - 0.05; t += 0.25) {
      const buf = execSync(`ffmpeg -v error -ss ${t.toFixed(2)} -i ${clip} -frames:v 1 -f image2pipe -vcodec png -`, { maxBuffer: 1 << 26 })
      out.push(await lap(buf))
    }
    console.log(clip.padEnd(26), out.join(' '))
  }
})()
