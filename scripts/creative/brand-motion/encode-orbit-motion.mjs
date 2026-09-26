#!/usr/bin/env node
// Efeonce «La órbita» — codifica los entregables desde los cuadros de `render-orbit-motion.mjs`.
//
//   node scripts/creative/brand-motion/encode-orbit-motion.mjs --frames <dir> --sound <dir> --out <dir> [--only reveal_16x9_dark,...]
//
// Por variante (<anim>_<formato>_<esquema>):
//   con fondo   · MP4 H.264 60 fps y 30 fps con sonido (yuv420p) · GIF (sólo 16:9 y 1:1, 960 px)
//   transparente· ProRes 4444 .mov (principal de diseño) · WebM VP9 · HEVC .mov (Safari/Keynote) · PNG por capas
//   extras      · último cuadro PNG (con fondo y transparente)
// El alfa es directo (no premultiplicado), sRGB. El halo va también como capa aparte en PNG.
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import sharp from 'sharp'

const args = process.argv.slice(2)
const opt = (n, f) => (args.includes(n) ? args[args.indexOf(n) + 1] : f)
const framesRoot = path.resolve(opt('--frames', 'frames'))
const soundRoot = path.resolve(opt('--sound', 'sound'))
const outRoot = path.resolve(opt('--out', 'deliverables'))
const only = opt('--only', null)?.split(',')
const FPS = 60
const DUR = { reveal: 3.6, open: 2.4, sting: 1.6 }
const ff = a => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...a], { stdio: 'inherit' })

const variants = readdirSync(framesRoot).filter(d => /^(reveal|open|sting)_/.test(d) && (!only || only.includes(d)))

for (const v of variants) {
  const [anim, format, scheme] = v.split('_')
  const src = path.join(framesRoot, v)
  const base = `efeonce-orbita-${({ reveal: 'reveal', open: 'apertura', sting: 'sting' })[anim]}_${format}_${scheme === 'dark' ? 'navy' : 'claro'}`
  const out = path.join(outRoot, ({ reveal: 'reveal', open: 'apertura', sting: 'sting' })[anim], format, scheme === 'dark' ? 'navy' : 'claro')
  const alphaTag = scheme === 'dark' ? 'alpha-para-fondo-oscuro' : 'alpha-para-fondo-claro'

  mkdirSync(out, { recursive: true })

  // Capa transparente combinada (halo + principal), cuadro a cuadro.
  const alphaDir = path.join(src, 'alpha')

  if (!existsSync(alphaDir) || readdirSync(alphaDir).length !== readdirSync(path.join(src, 'main')).length) {
    mkdirSync(alphaDir, { recursive: true })

    for (const f of readdirSync(path.join(src, 'main')).sort()) {
      const { width, height } = await sharp(path.join(src, 'main', f)).metadata()

      await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite([{ input: path.join(src, 'halo', f) }, { input: path.join(src, 'main', f) }])
        .png()
        .toFile(path.join(alphaDir, f))
    }
  }

  const wav = path.join(soundRoot, `${anim}.wav`)
  const audio = ['-i', wav, '-map', '0:v', '-map', '1:a', '-af', `atrim=0:${DUR[anim]},afade=t=out:st=${DUR[anim] - 0.45}:d=0.45`, '-c:a', 'aac', '-b:a', '256k', '-shortest']
  const seq = dir => ['-framerate', String(FPS), '-i', path.join(dir, '%04d.png')]

  // Con fondo: MP4 60 y 30 fps con sonido.
  ff([...seq(path.join(src, 'bg')), ...audio, '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', path.join(out, `${base}_60fps.mp4`)])
  ff([...seq(path.join(src, 'bg')), ...audio, '-vf', 'fps=30', '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', path.join(out, `${base}_30fps.mp4`)])

  // Transparente: ProRes 4444 (con alfa), WebM VP9 con alfa y HEVC con alfa.
  ff([...seq(alphaDir), '-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', '-alpha_bits', '16', '-vendor', 'apl0', path.join(out, `${base.replace(/_(navy|claro)$/, '')}_${alphaTag}_prores4444.mov`)])
  ff([...seq(alphaDir), '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '18', '-row-mt', '1', '-auto-alt-ref', '0', path.join(out, `${base.replace(/_(navy|claro)$/, '')}_${alphaTag}.webm`)])
  ff([...seq(alphaDir), '-c:v', 'hevc_videotoolbox', '-alpha_quality', '0.9', '-q:v', '70', '-tag:v', 'hvc1', '-pix_fmt', 'bgra', path.join(out, `${base.replace(/_(navy|claro)$/, '')}_${alphaTag}_hevc.mov`)])

  // GIF (sólo formatos anchos o cuadrados, 960 px, 30 fps; el GIF no tiene alfa real).
  if (format === '16x9' || format === '1x1') {
    ff([...seq(path.join(src, 'bg')), '-vf', 'fps=30,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=full[p];[b][p]paletteuse=dither=sierra2_4a', path.join(out, `${base}_960.gif`)])
  }

  // PNG por capas (principal, halo, combinada) y último cuadro.
  const layers = path.join(out, 'png-por-capas')

  for (const l of ['main', 'halo', 'alpha']) cpSync(path.join(src, l), path.join(layers, { main: 'principal', halo: 'halo', alpha: 'combinada' }[l]), { recursive: true })
  const last = readdirSync(path.join(src, 'bg')).sort().at(-1)

  cpSync(path.join(src, 'bg', last), path.join(out, `${base}_cuadro-final.png`))
  cpSync(path.join(alphaDir, last), path.join(out, `${base.replace(/_(navy|claro)$/, '')}_${alphaTag}_cuadro-final.png`))
  writeFileSync(path.join(out, 'LEEME.txt'), `${base}\n60 fps · ${DUR[anim]} s · sRGB · alfa directo (no premultiplicado).\nCapas en png-por-capas/: principal (sin halo), halo, combinada.\n`)
  console.log(`${v} → ${out}`)
}
