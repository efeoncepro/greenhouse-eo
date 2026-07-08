#!/usr/bin/env node

import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, 'motion-v2')
const runtimeDir = '/Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets/assets/video/social/wall/v2'

mkdirSync(outDir, { recursive: true })
mkdirSync(runtimeDir, { recursive: true })

const slots = [
  {
    source: 'muro-a1-reel-cover.png',
    stem: 'muro-a1-reel-cover-motion',
    xAmp: 22,
    yAmp: 16,
    phaseX: 0.4,
    phaseY: 0.2,
    sat: 1.08,
    contrast: 1.045,
    brightness: -0.008,
    sweepSpeed: 180,
    sweepWidth: 36,
    sweepAlpha: 0.035,
  },
  {
    source: 'muro-a4-creator-collaboration.png',
    stem: 'muro-a4-creator-collaboration-motion',
    xAmp: 14,
    yAmp: 18,
    phaseX: 1.2,
    phaseY: 0.6,
    sat: 1.06,
    contrast: 1.035,
    brightness: -0.006,
    sweepSpeed: 142,
    sweepWidth: 30,
    sweepAlpha: 0.028,
  },
  {
    source: 'muro-b2-story-frame.png',
    stem: 'muro-b2-story-frame-motion',
    xAmp: 10,
    yAmp: 26,
    phaseX: 0.1,
    phaseY: 1.4,
    sat: 1.07,
    contrast: 1.04,
    brightness: -0.004,
    sweepSpeed: 160,
    sweepWidth: 34,
    sweepAlpha: 0.032,
  },
  {
    source: 'muro-b3-trend-reel-cover.png',
    stem: 'muro-b3-trend-reel-cover-motion',
    xAmp: 24,
    yAmp: 12,
    phaseX: 2.0,
    phaseY: 0.9,
    sat: 1.1,
    contrast: 1.05,
    brightness: -0.008,
    sweepSpeed: 205,
    sweepWidth: 42,
    sweepAlpha: 0.036,
  },
  {
    source: 'muro-c1-ugc-clip-still.png',
    stem: 'muro-c1-ugc-clip-motion',
    xAmp: 16,
    yAmp: 20,
    phaseX: 2.4,
    phaseY: 1.1,
    sat: 1.055,
    contrast: 1.035,
    brightness: -0.005,
    sweepSpeed: 132,
    sweepWidth: 28,
    sweepAlpha: 0.026,
  },
  {
    source: 'muro-c4-reel-finale-cover.png',
    stem: 'muro-c4-reel-finale-cover-motion',
    xAmp: 20,
    yAmp: 15,
    phaseX: 0.8,
    phaseY: 2.1,
    sat: 1.09,
    contrast: 1.05,
    brightness: -0.009,
    sweepSpeed: 188,
    sweepWidth: 40,
    sweepAlpha: 0.035,
  },
]

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function filter(slot) {
  const period = 77

  
return [
    `[0:v]scale=720:-1`,
    `zoompan=z='1.045+0.025*sin(2*PI*on/${period})':x='iw/2-(iw/zoom/2)+${slot.xAmp}*sin(2*PI*on/${period}+${slot.phaseX})':y='ih/2-(ih/zoom/2)+${slot.yAmp}*cos(2*PI*on/${period}+${slot.phaseY})':d=1:s=432x648:fps=24`,
    `drawbox=x='-90+mod(t*${slot.sweepSpeed},522)':y=0:w=${slot.sweepWidth}:h=ih:color=white@${slot.sweepAlpha}:t=fill`,
    `eq=saturation=${slot.sat}:contrast=${slot.contrast}:brightness=${slot.brightness}`,
    'unsharp=3:3:0.28',
    'format=yuv420p[v]',
  ].join(',')
}

for (const slot of slots) {
  const source = join(here, slot.source)
  const webm = join(outDir, `${slot.stem}.webm`)
  const mp4 = join(outDir, `${slot.stem}.mp4`)

  const args = [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-loop',
    '1',
    '-framerate',
    '24',
    '-t',
    '3.2',
    '-i',
    source,
    '-filter_complex',
    filter(slot),
    '-map',
    '[v]',
    '-an',
  ]

  run('ffmpeg', [
    ...args,
    '-c:v',
    'libvpx-vp9',
    '-b:v',
    '0',
    '-crf',
    '35',
    '-row-mt',
    '1',
    webm,
  ])

  run('ffmpeg', [
    ...args,
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '27',
    '-movflags',
    '+faststart',
    '-pix_fmt',
    'yuv420p',
    mp4,
  ])

  copyFileSync(webm, join(runtimeDir, `${slot.stem}.webm`))
  copyFileSync(mp4, join(runtimeDir, `${slot.stem}.mp4`))
  console.log(`rendered ${slot.stem}`)
}
