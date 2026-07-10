// TASK-1364 — Estadística pura del loop de validez (testeable sin DB).

/** Correlación de Pearson. null si n<2 o varianza cero (sin señal, no 0 espurio). */
export const pearson = (xs: number[], ys: number[]): number | null => {
  const n = Math.min(xs.length, ys.length)

  if (n < 2) return null

  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0
  let dx = 0
  let dy = 0

  for (let i = 0; i < n; i += 1) {
    const vx = xs[i] - mx
    const vy = ys[i] - my

    num += vx * vy
    dx += vx * vx
    dy += vy * vy
  }

  if (dx === 0 || dy === 0) return null

  return num / Math.sqrt(dx * dy)
}

export const VALIDITY_VERDICTS = ['insufficient_sample', 'preliminary', 'established'] as const
export type ValidityVerdict = (typeof VALIDITY_VERDICTS)[number]

/** Umbrales resueltos en la task: <10 sin r (correlación espuria prohibida), 10-29 preliminar, ≥30 establecida. */
export const resolveVerdict = (n: number): ValidityVerdict => {
  if (n < 10) return 'insufficient_sample'
  if (n < 30) return 'preliminary'

  return 'established'
}
