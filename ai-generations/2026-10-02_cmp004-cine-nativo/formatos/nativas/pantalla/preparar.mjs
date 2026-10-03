// Máscara sólo sobre el monitor de S01-11Y (transparente = se edita); la mano, la persona y el resto quedan fuera.
import sharp from 'sharp'
const d = 'ai-generations/2026-10-02_cmp004-cine-nativo/formatos/nativas/pantalla/'
const W = 2048
const zonas = [[190, 960, 255, 860], [445, 960, 70, 145], [445, 1330, 70, 490]] // [x, y, w, h]
const px = Buffer.alloc(W * W * 4)
for (let i = 0; i < W * W; i++) px[i * 4 + 3] = 255
for (const [x, y, w, h] of zonas) for (let r = y; r < y + h; r++) for (let c = x; c < x + w; c++) px[(r * W + c) * 4 + 3] = 0
await sharp(px, { raw: { width: W, height: W, channels: 4 } }).png().toFile(d + 'mascara.png')
const m = await sharp(d + 'mascara.png').extractChannel(3).stats()
console.log('alfa media', m.channels[0].mean.toFixed(1))
