import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'
const W = 2560, H = 1440, S = 780
const order = [['daniela', 560], ['andres', 920], ['valentina', 1640], ['melkin', 2000], ['humberly', 1280]]
const layers = []
for (const [n, cx] of order) {
  const cut = await sharp(`equipo/${n}-cut.png`).resize(S, S).png().toBuffer()
  const alpha = await sharp(cut).extractChannel('alpha').toBuffer()
  // thin backlight rim: alpha dilated a few px minus the subject, very soft, cool
  const dil = await sharp(alpha).blur(5).linear(1.6, 0).toBuffer()
  const rimA = await sharp(dil).composite([{ input: await sharp(alpha).toBuffer(), blend: 'dest-out', raw: undefined }]).toBuffer().catch(() => dil)
  const rimMask = await sharp(dil).linear(0.42, 0).toBuffer()
  const rim = await sharp({ create: { width: S, height: S, channels: 3, background: '#8fb8ff' } }).joinChannel(rimMask).png().toBuffer()
  // cool grade: slightly darker, blue-shifted shadows, keep identity (no geometry change)
  const rgb = await sharp(cut).removeAlpha().recomb([[0.93, 0.02, 0.02], [0.02, 0.94, 0.03], [0.03, 0.05, 1.0]]).modulate({ brightness: 0.9 }).toBuffer()
  const graded = await sharp(rgb).joinChannel(alpha).png().toBuffer()
  const left = Math.round(cx - S / 2), top = H - S + 10
  layers.push({ input: rim, left, top: top - 3 }, { input: graded, left, top })
}
await sharp('plates/EQ1-siluetas-fondo.png').composite(layers).png().toFile('equipo/EQ1-equipo-compuesto.png')
console.log('ok')
