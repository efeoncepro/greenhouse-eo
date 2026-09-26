import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
const boxes = JSON.parse(process.argv[3])
const { data, info } = await sharp(process.argv[2]).greyscale().raw().toBuffer({ resolveWithObject: true })
const W = info.width, H = info.height, L = (x, y) => data[y * W + x]
for (const [name, [x0, y0, x1, y1]] of Object.entries(boxes)) {
  const g = []
  for (let y = Math.round(y0 * H) + 1; y < Math.round(y1 * H) - 1; y++)
    for (let x = Math.round(x0 * W) + 1; x < Math.round(x1 * W) - 1; x++) {
      const gx = -L(x-1,y-1)-2*L(x-1,y)-L(x-1,y+1)+L(x+1,y-1)+2*L(x+1,y)+L(x+1,y+1)
      const gy = -L(x-1,y-1)-2*L(x,y-1)-L(x+1,y-1)+L(x-1,y+1)+2*L(x,y+1)+L(x+1,y+1)
      g.push(Math.hypot(gx, gy))
    }
  g.sort((a, b) => a - b)
  let lum = 0, n = 0; for (let y = Math.round(y0*H); y < Math.round(y1*H); y++) for (let x = Math.round(x0*W); x < Math.round(x1*W); x++) { lum += L(x,y); n++ }
  console.log(name.padEnd(8), 'max', Math.round(g.at(-1)).toString().padStart(4), ' p99', Math.round(g[Math.floor(g.length*.99)]).toString().padStart(4), ' lum media', Math.round(lum/n))
}
