#!/usr/bin/env node
// Sello de la esfera: la campana en La y el golpe grave del sistema, como pista aparte para montar sobre una
// re-grabación. Así el ADN del logo sonoro queda idéntico aunque la banda cambie.
//   node sello.mjs --dur 37 --hit 32.875 [--bell -10] [--impact -12] [--no-impact] --out <file.wav>
import path from 'node:path'
import { createMix, note } from './dsp.mjs'
const a = process.argv.slice(2), o = (n, f) => (a.includes(n) ? a[a.indexOf(n) + 1] : f)
const dur = Number(o('--dur', '37')), T = Number(o('--hit', '32.875'))
const M = createMix({ dur })
if (!a.includes('--no-impact')) M.I.impact(T, Number(o('--impact', '-12')))
M.I.bell(T + 0.004, note('A5'), Number(o('--bell', '-10')))
M.write(path.resolve(o('--out', 'sello.wav')), { wet: 1.2, fadeMs: 300 })
