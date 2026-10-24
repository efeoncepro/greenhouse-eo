/**
 * `pnpm ai:audio-edits` — corta música sólo donde no se oye y lo demuestra.
 *
 *   ataques  --source pista.wav [--from 9 --to 11]          lista los ataques (dónde se puede cortar)
 *   revisar  --source pista.wav --plan plan.json [--ajustar plan-ajustado.json] [--render salida.wav]
 *   uniones  --mix mezcla.wav --at 3.995,9.995              busca clics y escalones en una mezcla ya hecha
 *   envolvente --source pista.wav [--from --to --step 0.05] nivel por ventana, para ver colas y acordes
 *
 * El plan es `{ "segments": [{ "in": s, "out": s, "at": s }, …] }` en segundos (fuente → salida). Un silencio de montaje
 * (stop-time) también es un corte: se declara como dos tramos. `--ajustar` lleva cada entrada y salida al punto de corte
 * del ataque más cercano (±120 ms); `--render` arma la edición con fundidos de 5 ms y revisa sus uniones. Sale con 1 si
 * algún corte falla. Regla y caso fuente: `scripts/ai/audio-edits-lib.ts`.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

import { checkJoins, checkPlan, detectAttacks, rmsDb, snapPlan, type CutFinding, type EditSegment, type Pcm } from './audio-edits-lib'

const SR = 48000

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`)

  
return i > 0 ? process.argv[i + 1] : undefined
}

const decode = (file: string): Pcm => {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 })

  
return { samples: new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4), sampleRate: SR }
}

const print = (findings: CutFinding[]) => {
  for (const f of findings) {
    console.log(`${f.ok ? '✓' : '✗'} ${f.kind.padEnd(7)} tramo ${f.segment + 1} @ ${f.time.toFixed(3)} s — ${f.detail}`)
  }

  
return findings.every(f => f.ok)
}

const render = (source: string, segments: EditSegment[], out: string) => {
  const fade = 0.005

  const parts = segments.map((s, i) => {
    const len = s.out - s.in
    const delay = Math.round(s.at * 1000)

    
return `[0:a]aresample=${SR},aformat=channel_layouts=stereo,atrim=${s.in.toFixed(4)}:${s.out.toFixed(4)},asetpts=PTS-STARTPTS,afade=t=in:d=${fade},afade=t=out:st=${(len - fade).toFixed(4)}:d=${fade},adelay=${delay}|${delay}[s${i}]`
  })

  const graph = `${parts.join(';')};${segments.map((_, i) => `[s${i}]`).join('')}amix=inputs=${segments.length}:normalize=0:duration=longest[o]`

  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', source, '-filter_complex', graph, '-map', '[o]', '-ar', String(SR), out])
}

const main = () => {
  const mode = process.argv[2]

  if (mode === 'ataques') {
    const pcm = decode(arg('source') ?? '')
    const from = Number(arg('from') ?? 0)
    const to = Number(arg('to') ?? Infinity)

    console.log(detectAttacks(pcm).filter(a => a >= from && a <= to).map(a => a.toFixed(3)).join('\n'))
    
return
  }

  if (mode === 'envolvente') {
    const pcm = decode(arg('source') ?? '')
    const step = Number(arg('step') ?? 0.05)
    const to = Math.min(Number(arg('to') ?? Infinity), pcm.samples.length / SR)

    for (let t = Number(arg('from') ?? 0); t < to; t += step) {
      const db = rmsDb(pcm, t, t + step)

      console.log(`${t.toFixed(2).padStart(6)}  ${db.toFixed(1).padStart(6)} dB  ${'#'.repeat(Math.max(0, Math.round((db + 60) / 1.5)))}`)
    }

    
return
  }

  if (mode === 'revisar') {
    const source = arg('source') ?? ''
    const pcm = decode(source)
    const attacks = detectAttacks(pcm)
    let segments: EditSegment[] = JSON.parse(readFileSync(arg('plan') ?? '', 'utf8')).segments
    const snapOut = arg('ajustar')

    if (snapOut) {
      segments = snapPlan(pcm, segments, attacks)
      writeFileSync(snapOut, `${JSON.stringify({ source, segments }, null, 2)}\n`)
      console.log(`plan ajustado → ${snapOut}`)
    }

    let ok = print(checkPlan(pcm, segments, attacks))
    const out = arg('render')

    if (out) {
      render(source, segments, out)
      const mix = decode(out)
      const joins = segments.filter(s => s.in > 0.001).map(s => s.at)

      console.log(`edición → ${out}`)
      ok = print(checkJoins(mix, joins, detectAttacks(mix))) && ok
    }

    process.exitCode = ok ? 0 : 1
    
return
  }

  if (mode === 'uniones') {
    const mix = decode(arg('mix') ?? '')
    const joins = (arg('at') ?? '').split(',').map(Number).filter(Number.isFinite)

    process.exitCode = print(checkJoins(mix, joins, detectAttacks(mix))) ? 0 : 1
    
return
  }

  console.error('uso: pnpm ai:audio-edits ataques|revisar|uniones … (ver cabecera de scripts/ai/audio-edits.ts)')
  process.exitCode = 2
}

main()
