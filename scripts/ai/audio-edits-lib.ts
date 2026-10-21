/**
 * Análisis de cortes en música: dónde se puede cortar sin que se oiga.
 *
 * Regla de oficio: una música sólo se corta JUSTO ANTES DE UN ATAQUE (el golpe del tiempo siguiente), en la entrada y en
 * la salida. Así el ataque tapa la unión. Cortar en medio de una nota sostenida deja colas, restos o truncamientos que
 * se oyen como «mal cortado» aunque el nivel y el tempo calcen (caso fuente: pieza ChatGPT Ads, 2026-10-21).
 *
 * Funciones puras sobre PCM mono Float32 (el CLI `scripts/ai/audio-edits.ts` lee los archivos y renderiza).
 */

export type Pcm = { samples: Float32Array; sampleRate: number }

export type EditSegment = {
  /** Segundo de la fuente donde empieza el tramo. */
  in: number
  /** Segundo de la fuente donde termina el tramo (o el final del archivo). */
  out: number
  /** Segundo de la salida donde se coloca el tramo. */
  at: number
}

export type CutFinding = {
  kind: 'entrada' | 'salida' | 'union'
  segment: number
  time: number
  ok: boolean
  detail: string
}

const EPS = 1e-12
const toDb = (power: number) => 10 * Math.log10(power + EPS)

/** Potencia media (no dB) de un tramo [t0, t1) en segundos. */
export const meanPower = (pcm: Pcm, t0: number, t1: number): number => {
  const a = Math.max(0, Math.floor(t0 * pcm.sampleRate))
  const b = Math.min(pcm.samples.length, Math.floor(t1 * pcm.sampleRate))

  if (b <= a) return 0
  let sum = 0

  for (let i = a; i < b; i++) sum += pcm.samples[i] * pcm.samples[i]
  
return sum / (b - a)
}

export const rmsDb = (pcm: Pcm, t0: number, t1: number): number => toDb(meanPower(pcm, t0, t1))

/**
 * Ataques: subidas bruscas de la energía de la derivada (pondera agudos: platillos, púas, golpes de caja), en cuadros de
 * 5 ms. Un ataque es un máximo local que sube al menos `riseDb` sobre el mínimo de los 40 ms anteriores.
 */
export const detectAttacks = (pcm: Pcm, riseDb = 6): number[] => {
  const hop = Math.round(pcm.sampleRate * 0.005)
  const frames: number[] = []

  for (let start = hop; start + hop <= pcm.samples.length; start += hop) {
    let sum = 0

    for (let i = start; i < start + hop; i++) {
      const d = pcm.samples[i] - pcm.samples[i - 1]

      sum += d * d
    }

    frames.push(toDb(sum / hop))
  }

  const attacks: number[] = []
  const look = 8 // 40 ms

  for (let i = look; i < frames.length - 1; i++) {
    let floor = Infinity

    for (let j = i - look; j < i; j++) floor = Math.min(floor, frames[j])
    const isPeak = frames[i] >= frames[i - 1] && frames[i] >= frames[i + 1]

    if (isPeak && frames[i] - floor >= riseDb) {
      const t = (i + 1) * 0.005

      if (!attacks.length || t - attacks[attacks.length - 1] > 0.05) attacks.push(t)
    }
  }

  
return attacks
}

/** El punto de corte para un ataque: el instante de menor energía (ventanas de 2 ms) en los 30 ms previos al ataque. */
export const cutPointBefore = (pcm: Pcm, attack: number): number => {
  let best = attack - 0.004
  let bestPower = Infinity

  for (let t = attack - 0.03; t <= attack - 0.004; t += 0.001) {
    const p = meanPower(pcm, t, t + 0.002)

    if (p < bestPower) {
      bestPower = p
      best = t
    }
  }

  
return best
}

const nearestAttack = (attacks: number[], t: number) =>
  attacks.reduce((best, a) => (Math.abs(a - t) < Math.abs(best - t) ? a : best), attacks[0] ?? Number.NaN)

/** Ajusta cada entrada y cada salida (salvo inicio y final del archivo) al punto de corte del ataque más cercano. */
export const snapPlan = (pcm: Pcm, segments: EditSegment[], attacks: number[], maxShift = 0.12): EditSegment[] => {
  const duration = pcm.samples.length / pcm.sampleRate

  
return segments.map(segment => {
    const snap = (t: number) => {
      if (t <= 0.001 || t >= duration - 0.001) return t
      const a = nearestAttack(attacks, t)

      
return Number.isFinite(a) && Math.abs(a - t) <= maxShift ? cutPointBefore(pcm, a) : t
    }

    const inT = snap(segment.in)

    
return { in: inT, out: snap(segment.out), at: segment.at + (inT - segment.in) }
  })
}

/**
 * Revisa un plan contra la fuente:
 * - ENTRADA (in > 0): tiene que haber un ataque en los 30 ms siguientes y tiene que subir ≥ 3 dB sobre lo que suena justo
 *   antes; así el golpe tapa la cola que arrastra el tramo. Sin ataque, el tramo arranca a media nota.
 * - SALIDA (out < final): tiene que haber un ataque en los 30 ms siguientes (se corta justo antes del próximo golpe, no en
 *   medio de una nota) o el sonido tiene que estar ya apagado (< −45 dB).
 */
export const checkPlan = (pcm: Pcm, segments: EditSegment[], attacks: number[]): CutFinding[] => {
  const duration = pcm.samples.length / pcm.sampleRate
  const findings: CutFinding[] = []
  const attackWithin = (t: number, window: number) => attacks.find(a => a >= t - 0.002 && a <= t + window)

  segments.forEach((segment, index) => {
    if (segment.in > 0.001) {
      const attack = attackWithin(segment.in, 0.03)
      const before = rmsDb(pcm, segment.in - 0.08, segment.in - 0.003)
      const hit = attack ? rmsDb(pcm, attack, attack + 0.03) : rmsDb(pcm, segment.in, segment.in + 0.03)
      const ok = Boolean(attack) && hit - before >= 3

      findings.push({
        kind: 'entrada',
        segment: index,
        time: segment.in,
        ok,
        detail: attack
          ? `ataque a +${Math.round((attack - segment.in) * 1000)} ms; energía previa ${(before - hit).toFixed(1)} dB respecto del ataque${ok ? '' : ' (ataque débil: no tapa la cola que arrastra; necesita ≤ −3 dB)'}`
          : 'no cae justo antes de un ataque: entra en medio de un sonido'
      })
    }

    if (segment.out < duration - 0.001) {
      const attack = attackWithin(segment.out, 0.03)
      const tail = rmsDb(pcm, segment.out - 0.05, segment.out)
      const ok = Boolean(attack) || tail < -45

      findings.push({
        kind: 'salida',
        segment: index,
        time: segment.out,
        ok,
        detail: attack
          ? `corta ${Math.round((attack - segment.out) * 1000)} ms antes de un ataque`
          : `corta en medio de un sonido (${tail.toFixed(1)} dB sin ataque siguiente): se oye truncado`
      })
    }
  })
  
return findings
}

/**
 * Revisa la mezcla en cada unión: un clic es un salto de muestra muy por encima del vecindario (percentil 99,9 de
 * ±150 ms), y un escalón es un cambio de nivel > 10 dB entre los 20 ms previos y los siguientes sin ataque en la unión.
 */
export const checkJoins = (mix: Pcm, joins: number[], mixAttacks: number[]): CutFinding[] =>
  joins.map((t, index) => {
    const sr = mix.sampleRate
    const at = Math.floor(t * sr)
    const jump = (i: number) => Math.abs(mix.samples[i] - mix.samples[i - 1])
    const neighborhood: number[] = []

    for (let i = Math.max(1, at - Math.floor(0.15 * sr)); i < Math.min(mix.samples.length, at + Math.floor(0.15 * sr)); i++) {
      if (Math.abs(i - at) > Math.floor(0.004 * sr)) neighborhood.push(jump(i))
    }

    neighborhood.sort((a, b) => a - b)
    const p999 = neighborhood[Math.floor(neighborhood.length * 0.999)] ?? 0
    let maxJump = 0

    for (let i = Math.max(1, at - Math.floor(0.004 * sr)); i < Math.min(mix.samples.length, at + Math.floor(0.004 * sr)); i++) maxJump = Math.max(maxJump, jump(i))
    const click = maxJump > p999 * 1.6 && maxJump > 0.02
    // Ventanas de 60 ms a cada lado: un silencio de montaje aplicado por cuadros de audio no cae exacto en la unión.
    const before = rmsDb(mix, t - 0.06, t)
    const after = rmsDb(mix, t, t + 0.06)
    const step = after - before
    const hasAttack = mixAttacks.some(a => Math.abs(a - t) <= 0.03)
    // Un escalón con ataque es un golpe; uno sin ataque, un corte. Un borde de silencio digital en una cama musical es
    // siempre un corte audible (el stop-time que vuelve a media nota): el ataque que «detecta» es la propia reanudación.
    const silenceEdge = Math.min(before, after) < -50 && Math.max(before, after) > -35
    const stepBad = silenceEdge || (Math.abs(step) > 10 && !hasAttack)

    
return {
      kind: 'union' as const,
      segment: index,
      time: t,
      ok: !click && !stepBad,
      detail: `${click ? 'CLIC (salto de muestra fuera de rango)' : 'sin clic'} · escalón ${step.toFixed(1)} dB${silenceEdge ? ' contra silencio digital (corte audible)' : stepBad ? ' sin ataque que lo tape' : ''}`
    }
  })
